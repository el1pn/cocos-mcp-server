import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest, toolCall } from '../utils/editor-request';

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

        return toolCall(
            async () => {
                let uuid: string = identifier;
                if (identifier.startsWith('db://')) {
                    const resolved = await editorRequest('asset-db', 'query-uuid', identifier);
                    if (!resolved) throw new Error(`Asset not found: ${identifier}`);
                    uuid = resolved as string;
                }

                const metaStr = await editorRequest('asset-db', 'query-asset-meta', uuid);
                if (!metaStr) throw new Error('Could not read asset meta');

                const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;

                for (const [key, value] of Object.entries(changes)) {
                    meta[key] = value;
                }

                await editorRequest('asset-db', 'save-asset-meta', uuid, JSON.stringify(meta, null, 2));
            },
            () => ({ message: `Texture meta updated for ${identifier}`, data: { changedKeys: Object.keys(changes) } })
        );
    }

    // --- Shared helpers ---

    private async getAssetInfo(identifier: string): Promise<ToolResponse> {
        if (!identifier) return { success: false, error: 'url or uuid is required' };

        return toolCall(
            async () => {
                let uuid: string = identifier;
                if (identifier.startsWith('db://')) {
                    const resolved = await editorRequest('asset-db', 'query-uuid', identifier);
                    if (!resolved) throw new Error(`Asset not found: ${identifier}`);
                    uuid = resolved as string;
                }

                const info: any = await editorRequest('asset-db', 'query-asset-info', uuid);
                if (!info) throw new Error(`No info for asset: ${identifier}`);
                return info;
            },
            (info: any) => ({
                data: {
                    uuid: info.uuid,
                    name: info.name,
                    url: info.url,
                    type: info.type,
                    importer: info.importer
                }
            })
        );
    }

    private async listAssetsByPattern(pattern: string, folder?: string): Promise<ToolResponse> {
        const queryPattern = folder
            ? `${folder}/${pattern}`.replace(/\/+/g, '/')
            : `db://assets/${pattern}`;

        return toolCall(
            () => editorRequest<any[]>('asset-db', 'query-assets', { pattern: queryPattern }),
            (results) => {
                const assets = (results || []).map((a: any) => ({
                    uuid: a.uuid,
                    name: a.name,
                    url: a.url,
                    type: a.type
                }));
                return { data: { assets, total: assets.length } };
            }
        );
    }
}
