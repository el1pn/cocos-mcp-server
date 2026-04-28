import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class MaterialTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'material_manage',
                description:
                    'Inspect material, texture, and shader/effect assets. Available actions: ' +
                    'get_info (get asset details by UUID or path), ' +
                    'get_material_list (list all materials), ' +
                    'get_texture_list (list textures in a folder), ' +
                    'get_shader_list (list all effects), ' +
                    'update_texture_meta (modify texture import settings like filterMode, wrapMode).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: [
                                'get_info',
                                'get_material_list', 'get_texture_list', 'get_shader_list',
                                'update_texture_meta'
                            ],
                            description: 'The material/texture/shader action to perform'
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (e.g. db://assets/materials/my-mat.mtl). Required for get_info, update_texture_meta.'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Asset UUID (alternative to url for get_info, update_texture_meta)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder to list textures from (for get_texture_list, default: db://assets)',
                            default: 'db://assets'
                        },
                        metaChanges: {
                            type: 'object',
                            description: 'Meta property changes for update_texture_meta (e.g. { "filterMode": "bilinear" })'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        switch (args.action) {
            // Info (any asset type)
            case 'get_info':
                return await this.getAssetInfo(args.url || args.uuid);
            // Lists
            case 'get_material_list':
                return await this.listAssetsByPattern('**/*.mtl');
            case 'get_texture_list':
                return await this.listAssetsByPattern('**/*.{png,jpg,jpeg,webp,bmp}', args.folder);
            case 'get_shader_list':
                return await this.listAssetsByPattern('**/*.effect');
            // Texture meta
            case 'update_texture_meta':
                return await this.updateTextureMeta(args.url || args.uuid, args.metaChanges);
            default:
                return { success: false, error: `Unknown action: ${args.action}` };
        }
    }

    // --- Texture meta ---

    private async updateTextureMeta(identifier: string, changes: Record<string, any>): Promise<ToolResponse> {
        if (!identifier || !changes) {
            return { success: false, error: 'url/uuid and metaChanges are required' };
        }

        try {
            let uuid: string = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await Editor.Message.request('asset-db', 'query-uuid', identifier);
                if (!resolved) return { success: false, error: `Asset not found: ${identifier}` };
                uuid = resolved as string;
            }

            const metaStr = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
            if (!metaStr) return { success: false, error: 'Could not read asset meta' };

            const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;

            for (const [key, value] of Object.entries(changes)) {
                meta[key] = value;
            }

            await Editor.Message.request('asset-db', 'save-asset-meta', uuid, JSON.stringify(meta, null, 2));
            return { success: true, message: `Texture meta updated for ${identifier}`, data: { changedKeys: Object.keys(changes) } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // --- Shared helpers ---

    private async getAssetInfo(identifier: string): Promise<ToolResponse> {
        if (!identifier) return { success: false, error: 'url or uuid is required' };

        try {
            let uuid: string = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await Editor.Message.request('asset-db', 'query-uuid', identifier);
                if (!resolved) return { success: false, error: `Asset not found: ${identifier}` };
                uuid = resolved as string;
            }

            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            if (!info) return { success: false, error: `No info for asset: ${identifier}` };

            return {
                success: true,
                data: {
                    uuid: info.uuid,
                    name: info.name,
                    url: info.url,
                    type: info.type,
                    importer: info.importer
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async listAssetsByPattern(pattern: string, folder?: string): Promise<ToolResponse> {
        try {
            const queryPattern = folder
                ? `${folder}/${pattern}`.replace(/\/+/g, '/')
                : `db://assets/${pattern}`;

            const results = await Editor.Message.request('asset-db', 'query-assets', { pattern: queryPattern });
            const assets = (results || []).map((a: any) => ({
                uuid: a.uuid,
                name: a.name,
                url: a.url,
                type: a.type
            }));

            return { success: true, data: { assets, total: assets.length } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
