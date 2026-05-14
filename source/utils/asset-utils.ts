import * as fs from 'fs';

/**
 * Resolve a UUID that might be a Texture2D to its SpriteFrame sub-asset UUID.
 * If the UUID is already a SpriteFrame or resolution fails, returns the original UUID.
 */
export async function resolveSpriteFrameUuid(uuid: string): Promise<{ uuid: string; converted: boolean }> {
    try {
        // Query asset info to check type
        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
        if (!assetInfo) {
            return { uuid, converted: false };
        }

        // If it's already a SpriteFrame or not a texture, return as-is
        const importer = assetInfo.importer || '';
        if (importer !== 'image' && importer !== 'texture') {
            return { uuid, converted: false };
        }

        // Get filesystem path to read .meta file
        const assetUrl = await Editor.Message.request('asset-db', 'query-url', uuid);
        if (!assetUrl) {
            return { uuid, converted: false };
        }

        const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
        if (!fsPath) {
            return { uuid, converted: false };
        }

        const metaPath = fsPath + '.meta';
        if (!fs.existsSync(metaPath)) {
            return { uuid, converted: false };
        }

        const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const subMetas = metaContent.subMetas;
        if (!subMetas || typeof subMetas !== 'object') {
            return { uuid, converted: false };
        }

        // Find the SpriteFrame sub-asset (not the base Texture2D sub-asset)
        for (const key of Object.keys(subMetas)) {
            const sub = subMetas[key];
            if (sub && sub.uuid && sub.importer === 'sprite-frame') {
                return { uuid: sub.uuid, converted: true };
            }
        }

        return { uuid, converted: false };
    } catch {
        return { uuid, converted: false };
    }
}
