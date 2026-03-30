import { logger } from '../logger';

export interface SafeCreateResult {
    success: boolean;
    uuid?: string;
    url?: string;
    message?: string;
    error?: string;
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
        // Split path: db://assets/a/b/c.ext → ["db://assets", "a", "b"]
        const parts = assetUrl.replace('db://assets/', '').split('/');
        parts.pop(); // Remove filename

        if (parts.length === 0) return;

        let currentPath = 'db://assets';
        for (const part of parts) {
            currentPath += `/${part}`;
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', currentPath);
                if (info) continue; // Directory exists
            } catch {
                // Doesn't exist, need to create
            }

            try {
                await Editor.Message.request('asset-db', 'create-asset', currentPath + '/', null);
                logger.info(`Created parent directory: ${currentPath}`);
            } catch (err: any) {
                // Might already exist due to race condition — check again
                try {
                    const info = await Editor.Message.request('asset-db', 'query-asset-info', currentPath);
                    if (info) continue;
                } catch {
                    // Genuinely failed
                }
                throw new Error(`Failed to create parent directory ${currentPath}: ${err.message}`);
            }
        }
    }

    /**
     * Safely overwrite an existing asset's content.
     */
    static async safeSaveAsset(assetUrl: string, content: string): Promise<SafeCreateResult> {
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
