"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialTools = void 0;
const editor_request_1 = require("../utils/editor-request");
class MaterialTools {
    getTools() {
        return [
            {
                name: 'material_manage',
                description: 'Inspect material, texture, and shader/effect assets. Available actions: ' +
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
    async execute(_toolName, args) {
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
    async updateTextureMeta(identifier, changes) {
        if (!identifier || !changes) {
            return { success: false, error: 'url/uuid and metaChanges are required' };
        }
        return (0, editor_request_1.toolCall)(async () => {
            let uuid = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', identifier);
                if (!resolved)
                    throw new Error(`Asset not found: ${identifier}`);
                uuid = resolved;
            }
            const metaStr = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-meta', uuid);
            if (!metaStr)
                throw new Error('Could not read asset meta');
            const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
            for (const [key, value] of Object.entries(changes)) {
                meta[key] = value;
            }
            await (0, editor_request_1.editorRequest)('asset-db', 'save-asset-meta', uuid, JSON.stringify(meta, null, 2));
        }, () => ({ message: `Texture meta updated for ${identifier}`, data: { changedKeys: Object.keys(changes) } }));
    }
    // --- Shared helpers ---
    async getAssetInfo(identifier) {
        if (!identifier)
            return { success: false, error: 'url or uuid is required' };
        return (0, editor_request_1.toolCall)(async () => {
            let uuid = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', identifier);
                if (!resolved)
                    throw new Error(`Asset not found: ${identifier}`);
                uuid = resolved;
            }
            const info = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', uuid);
            if (!info)
                throw new Error(`No info for asset: ${identifier}`);
            return info;
        }, (info) => ({
            data: {
                uuid: info.uuid,
                name: info.name,
                url: info.url,
                type: info.type,
                importer: info.importer
            }
        }));
    }
    async listAssetsByPattern(pattern, folder) {
        const queryPattern = folder
            ? `${folder}/${pattern}`.replace(/\/+/g, '/')
            : `db://assets/${pattern}`;
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-assets', { pattern: queryPattern }), (results) => {
            const assets = (results || []).map((a) => ({
                uuid: a.uuid,
                name: a.name,
                url: a.url,
                type: a.type
            }));
            return { data: { assets, total: assets.length } };
        });
    }
}
exports.MaterialTools = MaterialTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvbWF0ZXJpYWwtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBRWxFLE1BQWEsYUFBYTtJQUN0QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVcsRUFDUCwwRUFBMEU7b0JBQzFFLGdEQUFnRDtvQkFDaEQsMENBQTBDO29CQUMxQyxnREFBZ0Q7b0JBQ2hELHNDQUFzQztvQkFDdEMsaUZBQWlGO2dCQUNyRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUU7Z0NBQ0YsVUFBVTtnQ0FDVixtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUI7Z0NBQzFELHFCQUFxQjs2QkFDeEI7NEJBQ0QsV0FBVyxFQUFFLCtDQUErQzt5QkFDL0Q7d0JBQ0QsR0FBRyxFQUFFOzRCQUNELElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnR0FBZ0c7eUJBQ2hIO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUVBQW1FO3lCQUNuRjt3QkFDRCxNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJFQUEyRTs0QkFDeEYsT0FBTyxFQUFFLGFBQWE7eUJBQ3pCO3dCQUNELFdBQVcsRUFBRTs0QkFDVCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUZBQW1GO3lCQUNuRztxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIs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QUFDLE9BQWUsRUFBRSxNQUFlO1FBQzlELE1BQU0sWUFBWSxHQUFHLE1BQU07WUFDdkIsQ0FBQyxDQUFDLEdBQUcsTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDO1lBQzdDLENBQUMsQ0FBQyxlQUFlLE9BQU8sRUFBRSxDQUFDO1FBRS9CLE9BQU8sSUFBQSx5QkFBUSxFQUNYLEdBQUcsRUFBRSxDQUFDLElBQUEsOEJBQWEsRUFBUSxVQUFVLEVBQUUsY0FBYyxFQUFFLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQ2pGLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDUixNQUFNLE1BQU0sR0FBRyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7Z0JBQ1osR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHO2dCQUNWLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTthQUNmLENBQUMsQ0FBQyxDQUFDO1lBQ0osT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDdEQsQ0FBQyxDQUNKLENBQUM7SUFDTixDQUFDO0NBQ0o7QUFuSkQsc0NBbUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5cbmV4cG9ydCBjbGFzcyBNYXRlcmlhbFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbWF0ZXJpYWxfbWFuYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0luc3BlY3QgbWF0ZXJpYWwsIHRleHR1cmUsIGFuZCBzaGFkZXIvZWZmZWN0IGFzc2V0cy4gQXZhaWxhYmxlIGFjdGlvbnM6ICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X2luZm8gKGdldCBhc3NldCBkZXRhaWxzIGJ5IFVVSUQgb3IgcGF0aCksICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X21hdGVyaWFsX2xpc3QgKGxpc3QgYWxsIG1hdGVyaWFscyksICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X3RleHR1cmVfbGlzdCAobGlzdCB0ZXh0dXJlcyBpbiBhIGZvbGRlciksICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X3NoYWRlcl9saXN0IChsaXN0IGFsbCBlZmZlY3RzKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICd1cGRhdGVfdGV4dHVyZV9tZXRhIChtb2RpZnkgdGV4dHVyZSBpbXBvcnQgc2V0dGluZ3MgbGlrZSBmaWx0ZXJNb2RlLCB3cmFwTW9kZSkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZ2V0X2luZm8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZ2V0X21hdGVyaWFsX2xpc3QnLCAnZ2V0X3RleHR1cmVfbGlzdCcsICdnZXRfc2hhZGVyX2xpc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndXBkYXRlX3RleHR1cmVfbWV0YSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIG1hdGVyaWFsL3RleHR1cmUvc2hhZGVyIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIChlLmcuIGRiOi8vYXNzZXRzL21hdGVyaWFscy9teS1tYXQubXRsKS4gUmVxdWlyZWQgZm9yIGdldF9pbmZvLCB1cGRhdGVfdGV4dHVyZV9tZXRhLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIChhbHRlcm5hdGl2ZSB0byB1cmwgZm9yIGdldF9pbmZvLCB1cGRhdGVfdGV4dHVyZV9tZXRhKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvbGRlciB0byBsaXN0IHRleHR1cmVzIGZyb20gKGZvciBnZXRfdGV4dHVyZV9saXN0LCBkZWZhdWx0OiBkYjovL2Fzc2V0cyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRhQ2hhbmdlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0YSBwcm9wZXJ0eSBjaGFuZ2VzIGZvciB1cGRhdGVfdGV4dHVyZV9tZXRhIChlLmcuIHsgXCJmaWx0ZXJNb2RlXCI6IFwiYmlsaW5lYXJcIiB9KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZShfdG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgLy8gSW5mbyAoYW55IGFzc2V0IHR5cGUpXG4gICAgICAgICAgICBjYXNlICdnZXRfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXRJbmZvKGFyZ3MudXJsIHx8IGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAvLyBMaXN0c1xuICAgICAgICAgICAgY2FzZSAnZ2V0X21hdGVyaWFsX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyoubXRsJyk7XG4gICAgICAgICAgICBjYXNlICdnZXRfdGV4dHVyZV9saXN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5saXN0QXNzZXRzQnlQYXR0ZXJuKCcqKi8qLntwbmcsanBnLGpwZWcsd2VicCxibXB9JywgYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X3NoYWRlcl9saXN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5saXN0QXNzZXRzQnlQYXR0ZXJuKCcqKi8qLmVmZmVjdCcpO1xuICAgICAgICAgICAgLy8gVGV4dHVyZSBtZXRhXG4gICAgICAgICAgICBjYXNlICd1cGRhdGVfdGV4dHVyZV9tZXRhJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy51cGRhdGVUZXh0dXJlTWV0YShhcmdzLnVybCB8fCBhcmdzLnV1aWQsIGFyZ3MubWV0YUNoYW5nZXMpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gVGV4dHVyZSBtZXRhIC0tLVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVUZXh0dXJlTWV0YShpZGVudGlmaWVyOiBzdHJpbmcsIGNoYW5nZXM6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIWlkZW50aWZpZXIgfHwgIWNoYW5nZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3VybC91dWlkIGFuZCBtZXRhQ2hhbmdlcyBhcmUgcmVxdWlyZWQnIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHV1aWQ6IHN0cmluZyA9IGlkZW50aWZpZXI7XG4gICAgICAgICAgICAgICAgaWYgKGlkZW50aWZpZXIuc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBpZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZCkgdGhyb3cgbmV3IEVycm9yKGBBc3NldCBub3QgZm91bmQ6ICR7aWRlbnRpZmllcn1gKTtcbiAgICAgICAgICAgICAgICAgICAgdXVpZCA9IHJlc29sdmVkIGFzIHN0cmluZztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtZXRhU3RyID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtbWV0YScsIHV1aWQpO1xuICAgICAgICAgICAgICAgIGlmICghbWV0YVN0cikgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgcmVhZCBhc3NldCBtZXRhJyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gdHlwZW9mIG1ldGFTdHIgPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShtZXRhU3RyKSA6IG1ldGFTdHI7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjaGFuZ2VzKSkge1xuICAgICAgICAgICAgICAgICAgICBtZXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCB1dWlkLCBKU09OLnN0cmluZ2lmeShtZXRhLCBudWxsLCAyKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogYFRleHR1cmUgbWV0YSB1cGRhdGVkIGZvciAke2lkZW50aWZpZXJ9YCwgZGF0YTogeyBjaGFuZ2VkS2V5czogT2JqZWN0LmtleXMoY2hhbmdlcykgfSB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIC0tLSBTaGFyZWQgaGVscGVycyAtLS1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXRJbmZvKGlkZW50aWZpZXI6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghaWRlbnRpZmllcikgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsIG9yIHV1aWQgaXMgcmVxdWlyZWQnIH07XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCB1dWlkOiBzdHJpbmcgPSBpZGVudGlmaWVyO1xuICAgICAgICAgICAgICAgIGlmIChpZGVudGlmaWVyLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgaWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzb2x2ZWQpIHRocm93IG5ldyBFcnJvcihgQXNzZXQgbm90IGZvdW5kOiAke2lkZW50aWZpZXJ9YCk7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQgPSByZXNvbHZlZCBhcyBzdHJpbmc7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpO1xuICAgICAgICAgICAgICAgIGlmICghaW5mbykgdGhyb3cgbmV3IEVycm9yKGBObyBpbmZvIGZvciBhc3NldDogJHtpZGVudGlmaWVyfWApO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChpbmZvOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGluZm8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBpbmZvLnVybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlLFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlcjogaW5mby5pbXBvcnRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0QXNzZXRzQnlQYXR0ZXJuKHBhdHRlcm46IHN0cmluZywgZm9sZGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgcXVlcnlQYXR0ZXJuID0gZm9sZGVyXG4gICAgICAgICAgICA/IGAke2ZvbGRlcn0vJHtwYXR0ZXJufWAucmVwbGFjZSgvXFwvKy9nLCAnLycpXG4gICAgICAgICAgICA6IGBkYjovL2Fzc2V0cy8ke3BhdHRlcm59YDtcblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueVtdPignYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBxdWVyeVBhdHRlcm4gfSksXG4gICAgICAgICAgICAocmVzdWx0cykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IChyZXN1bHRzIHx8IFtdKS5tYXAoKGE6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogYS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHVybDogYS51cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGEudHlwZVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkYXRhOiB7IGFzc2V0cywgdG90YWw6IGFzc2V0cy5sZW5ndGggfSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cbn1cbiJdfQ==