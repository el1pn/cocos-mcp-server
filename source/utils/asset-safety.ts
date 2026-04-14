import { logger } from '../logger';

export interface SafeCreateResult {
    success: boolean;
    uuid?: string;
    url?: string;
    message?: string;
    error?: string;
}

const ASSET_URL_PREFIX = 'db://';
const ASSETS_ROOT = 'db://assets';
const INTERNAL_ROOT = 'db://internal';
const VALID_URL_PATTERN = /^db:\/\/[A-Za-z0-9_\-./@ ]+$/;

/**
 * Validate an asset URL. Rejects path traversal, empty segments, absolute
 * filesystem paths, and anything outside the supported db:// roots.
 *
 * Throws on invalid input so callers can fail fast inside try/catch blocks.
 */
export function validateAssetUrl(url: unknown, opts?: { allowInternal?: boolean }): string {
    if (typeof url !== 'string') {
        throw new Error('Asset URL must be a string');
    }
    const trimmed = url.trim();
    if (!trimmed) {
        throw new Error('Asset URL is empty');
    }
    if (!trimmed.startsWith(ASSET_URL_PREFIX)) {
        throw new Error(`Asset URL must start with "${ASSET_URL_PREFIX}" — got "${trimmed}"`);
    }
    if (!VALID_URL_PATTERN.test(trimmed)) {
        throw new Error(`Asset URL contains invalid characters: "${trimmed}"`);
    }
    const allowInternal = opts?.allowInternal ?? false;
    const inAssets = trimmed === ASSETS_ROOT || trimmed.startsWith(`${ASSETS_ROOT}/`);
    const inInternal = allowInternal && (trimmed === INTERNAL_ROOT || trimmed.startsWith(`${INTERNAL_ROOT}/`));
    if (!inAssets && !inInternal) {
        throw new Error(`Asset URL must be under ${ASSETS_ROOT}${allowInternal ? ` or ${INTERNAL_ROOT}` : ''}: "${trimmed}"`);
    }
    const body = trimmed.slice(ASSET_URL_PREFIX.length);
    const segments = body.split('/');
    for (const seg of segments) {
        if (seg === '' || seg === '.' || seg === '..') {
            throw new Error(`Asset URL has invalid segment "${seg}": "${trimmed}"`);
        }
    }
    return trimmed;
}

/**
 * Like validateAssetUrl, but returns undefined instead of throwing.
 */
export function tryValidateAssetUrl(url: unknown, opts?: { allowInternal?: boolean }): string | undefined {
    try {
        return validateAssetUrl(url, opts);
    } catch {
        return undefined;
    }
}

/**
 * Atomic asset creation pipeline for Cocos Creator 3.8+.
 *
 * Steps:
 * 1. Ensure parent directory chain exists
 * 2. Create asset via asset-db (handles watcher internally in 3.8+)
 * 3. Optionally modify meta after creation
 * 4. Refresh asset to sync editor state
 */
export class AssetSafety {
    /**
     * Safely create an asset, ensuring parent directories exist first.
     */
    static async safeCreateAsset(
        assetUrl: string,
        content: string | Buffer | null,
        options?: { overwrite?: boolean; metaModifier?: (meta: any) => any }
    ): Promise<SafeCreateResult> {
        const overwrite = options?.overwrite ?? false;

        let validatedUrl: string;
        try {
            validatedUrl = validateAssetUrl(assetUrl);
        } catch (err: any) {
            return { success: false, error: err.message };
        }
        assetUrl = validatedUrl;

        try {
            // Step 1: Ensure parent directory chain
            await AssetSafety.ensureParentDirs(assetUrl);

            // Step 2: Create the asset
            const createOptions = { overwrite, rename: !overwrite };
            const contentStr = content instanceof Buffer ? content.toString('utf8') : content;

            logger.info(`Creating asset: ${assetUrl} (overwrite=${overwrite})`);

            const result = await Editor.Message.request(
                'asset-db', 'create-asset', assetUrl, contentStr, createOptions
            );

            if (!result || !result.uuid) {
                return {
                    success: false,
                    error: `Asset creation returned no UUID for ${assetUrl}`
                };
            }

            // Step 3: Optionally modify meta
            if (options?.metaModifier) {
                try {
                    const metaStr = await Editor.Message.request('asset-db', 'query-asset-meta', result.uuid);
                    if (metaStr) {
                        const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
                        const modifiedMeta = options.metaModifier(meta);
                        await Editor.Message.request(
                            'asset-db', 'save-asset-meta', result.uuid, JSON.stringify(modifiedMeta, null, 2)
                        );
                        logger.info(`Meta modified for ${assetUrl}`);
                    }
                } catch (metaErr: any) {
                    logger.warn(`Meta modification failed for ${assetUrl}: ${metaErr.message}`);
                    // Non-fatal — asset was still created
                }
            }

            // Step 4: Refresh to sync editor
            try {
                await Editor.Message.request('asset-db', 'refresh-asset', assetUrl);
            } catch {
                // Best effort refresh
            }

            logger.success(`Asset created: ${assetUrl} (uuid: ${result.uuid})`);

            return {
                success: true,
                uuid: result.uuid,
                url: result.url || assetUrl,
                message: content === null ? 'Folder created successfully' : 'Asset created successfully'
            };
        } catch (err: any) {
            logger.error(`Failed to create asset ${assetUrl}: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Ensure all parent directories in the asset URL chain exist.
     * e.g., for "db://assets/sprites/ui/icon.png", ensures
     * "db://assets/sprites/" and "db://assets/sprites/ui/" exist.
     */
    static async ensureParentDirs(assetUrl: string): Promise<void> {
        // Only operate inside db://assets — guarantees split below is safe
        if (!assetUrl.startsWith(`${ASSETS_ROOT}/`)) return;

        const parts = assetUrl.slice(ASSETS_ROOT.length + 1).split('/');
        parts.pop(); // Remove filename
        if (parts.length === 0) return;

        let currentPath = ASSETS_ROOT;
        for (const part of parts) {
            currentPath += `/${part}`;
            const key = currentPath;
            // Coalesce concurrent creates of the same directory so two callers
            // racing on the same parent don't both try to create it.
            const inflight = AssetSafety.inflightDirCreates.get(key);
            if (inflight) {
                await inflight;
                continue;
            }
            const promise = AssetSafety.ensureSingleDir(currentPath);
            AssetSafety.inflightDirCreates.set(key, promise);
            try {
                await promise;
            } finally {
                AssetSafety.inflightDirCreates.delete(key);
            }
        }
    }

    private static inflightDirCreates = new Map<string, Promise<void>>();

    private static async ensureSingleDir(dirUrl: string): Promise<void> {
        try {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', dirUrl);
            if (info) return;
        } catch {
            // Not present — fall through to create
        }
        try {
            await Editor.Message.request('asset-db', 'create-asset', dirUrl + '/', null);
            logger.info(`Created parent directory: ${dirUrl}`);
        } catch (err: any) {
            // Might already exist after our check (concurrent external create)
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', dirUrl);
                if (info) return;
            } catch {
                // genuinely failed
            }
            throw new Error(`Failed to create parent directory ${dirUrl}: ${err.message}`);
        }
    }

    /**
     * Safely overwrite an existing asset's content.
     */
    static async safeSaveAsset(assetUrl: string, content: string): Promise<SafeCreateResult> {
        let validatedUrl: string;
        try {
            validatedUrl = validateAssetUrl(assetUrl);
        } catch (err: any) {
            return { success: false, error: err.message };
        }
        assetUrl = validatedUrl;
        try {
            await Editor.Message.request('asset-db', 'save-asset', assetUrl, content);
            try {
                await Editor.Message.request('asset-db', 'refresh-asset', assetUrl);
            } catch {
                // Best effort
            }
            return { success: true, url: assetUrl, message: 'Asset saved successfully' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
