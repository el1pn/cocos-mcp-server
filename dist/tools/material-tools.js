"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialTools = void 0;
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
        try {
            let uuid = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await Editor.Message.request('asset-db', 'query-uuid', identifier);
                if (!resolved)
                    return { success: false, error: `Asset not found: ${identifier}` };
                uuid = resolved;
            }
            const metaStr = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
            if (!metaStr)
                return { success: false, error: 'Could not read asset meta' };
            const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
            for (const [key, value] of Object.entries(changes)) {
                meta[key] = value;
            }
            await Editor.Message.request('asset-db', 'save-asset-meta', uuid, JSON.stringify(meta, null, 2));
            return { success: true, message: `Texture meta updated for ${identifier}`, data: { changedKeys: Object.keys(changes) } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // --- Shared helpers ---
    async getAssetInfo(identifier) {
        if (!identifier)
            return { success: false, error: 'url or uuid is required' };
        try {
            let uuid = identifier;
            if (identifier.startsWith('db://')) {
                const resolved = await Editor.Message.request('asset-db', 'query-uuid', identifier);
                if (!resolved)
                    return { success: false, error: `Asset not found: ${identifier}` };
                uuid = resolved;
            }
            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            if (!info)
                return { success: false, error: `No info for asset: ${identifier}` };
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async listAssetsByPattern(pattern, folder) {
        try {
            const queryPattern = folder
                ? `${folder}/${pattern}`.replace(/\/+/g, '/')
                : `db://assets/${pattern}`;
            const results = await Editor.Message.request('asset-db', 'query-assets', { pattern: queryPattern });
            const assets = (results || []).map((a) => ({
                uuid: a.uuid,
                name: a.name,
                url: a.url,
                type: a.type
            }));
            return { success: true, data: { assets, total: assets.length } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.MaterialTools = MaterialTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvbWF0ZXJpYWwtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxhQUFhO0lBQ3RCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsV0FBVyxFQUNQLDBFQUEwRTtvQkFDMUUsZ0RBQWdEO29CQUNoRCwwQ0FBMEM7b0JBQzFDLGdEQUFnRDtvQkFDaEQsc0NBQXNDO29CQUN0QyxpRkFBaUY7Z0JBQ3JGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRTtnQ0FDRixVQUFVO2dDQUNWLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLGlCQUFpQjtnQ0FDMUQscUJBQXFCOzZCQUN4Qjs0QkFDRCxXQUFXLEVBQUUsK0NBQStDO3lCQUMvRDt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGdHQUFnRzt5QkFDaEg7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtRUFBbUU7eUJBQ25GO3dCQUNELE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkVBQTJFOzRCQUN4RixPQUFPLEVBQUUsYUFBYTt5QkFDekI7d0JBQ0QsV0FBVyxFQUFFOzRCQUNULElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtRkFBbUY7eUJBQ25HO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLElBQVM7UUFD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QU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBckpELHNDQXFKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIE1hdGVyaWFsVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdtYXRlcmlhbF9tYW5hZ2UnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnSW5zcGVjdCBtYXRlcmlhbCwgdGV4dHVyZSwgYW5kIHNoYWRlci9lZmZlY3QgYXNzZXRzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbyAoZ2V0IGFzc2V0IGRldGFpbHMgYnkgVVVJRCBvciBwYXRoKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfbWF0ZXJpYWxfbGlzdCAobGlzdCBhbGwgbWF0ZXJpYWxzKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfdGV4dHVyZV9saXN0IChsaXN0IHRleHR1cmVzIGluIGEgZm9sZGVyKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfc2hhZGVyX2xpc3QgKGxpc3QgYWxsIGVmZmVjdHMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3VwZGF0ZV90ZXh0dXJlX21ldGEgKG1vZGlmeSB0ZXh0dXJlIGltcG9ydCBzZXR0aW5ncyBsaWtlIGZpbHRlck1vZGUsIHdyYXBNb2RlKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnZXRfbWF0ZXJpYWxfbGlzdCcsICdnZXRfdGV4dHVyZV9saXN0JywgJ2dldF9zaGFkZXJfbGlzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1cGRhdGVfdGV4dHVyZV9tZXRhJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbWF0ZXJpYWwvdGV4dHVyZS9zaGFkZXIgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgKGUuZy4gZGI6Ly9hc3NldHMvbWF0ZXJpYWxzL215LW1hdC5tdGwpLiBSZXF1aXJlZCBmb3IgZ2V0X2luZm8sIHVwZGF0ZV90ZXh0dXJlX21ldGEuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgKGFsdGVybmF0aXZlIHRvIHVybCBmb3IgZ2V0X2luZm8sIHVwZGF0ZV90ZXh0dXJlX21ldGEpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9sZGVyIHRvIGxpc3QgdGV4dHVyZXMgZnJvbSAoZm9yIGdldF90ZXh0dXJlX2xpc3QsIGRlZmF1bHQ6IGRiOi8vYXNzZXRzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFDaGFuZ2VzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXRhIHByb3BlcnR5IGNoYW5nZXMgZm9yIHVwZGF0ZV90ZXh0dXJlX21ldGEgKGUuZy4geyBcImZpbHRlck1vZGVcIjogXCJiaWxpbmVhclwiIH0pJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAvLyBJbmZvIChhbnkgYXNzZXQgdHlwZSlcbiAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8oYXJncy51cmwgfHwgYXJncy51dWlkKTtcbiAgICAgICAgICAgIC8vIExpc3RzXG4gICAgICAgICAgICBjYXNlICdnZXRfbWF0ZXJpYWxfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdEFzc2V0c0J5UGF0dGVybignKiovKi5tdGwnKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF90ZXh0dXJlX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyoue3BuZyxqcGcsanBlZyx3ZWJwLGJtcH0nLCBhcmdzLmZvbGRlcik7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2hhZGVyX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyouZWZmZWN0Jyk7XG4gICAgICAgICAgICAvLyBUZXh0dXJlIG1ldGFcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZV90ZXh0dXJlX21ldGEnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnVwZGF0ZVRleHR1cmVNZXRhKGFyZ3MudXJsIHx8IGFyZ3MudXVpZCwgYXJncy5tZXRhQ2hhbmdlcyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC0tLSBUZXh0dXJlIG1ldGEgLS0tXG5cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVRleHR1cmVNZXRhKGlkZW50aWZpZXI6IHN0cmluZywgY2hhbmdlczogUmVjb3JkPHN0cmluZywgYW55Pik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghaWRlbnRpZmllciB8fCAhY2hhbmdlcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsL3V1aWQgYW5kIG1ldGFDaGFuZ2VzIGFyZSByZXF1aXJlZCcgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgdXVpZDogc3RyaW5nID0gaWRlbnRpZmllcjtcbiAgICAgICAgICAgIGlmIChpZGVudGlmaWVyLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBpZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc29sdmVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7aWRlbnRpZmllcn1gIH07XG4gICAgICAgICAgICAgICAgdXVpZCA9IHJlc29sdmVkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWV0YVN0ciA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCB1dWlkKTtcbiAgICAgICAgICAgIGlmICghbWV0YVN0cikgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQ291bGQgbm90IHJlYWQgYXNzZXQgbWV0YScgfTtcblxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHR5cGVvZiBtZXRhU3RyID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UobWV0YVN0cikgOiBtZXRhU3RyO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjaGFuZ2VzKSkge1xuICAgICAgICAgICAgICAgIG1ldGFba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCB1dWlkLCBKU09OLnN0cmluZ2lmeShtZXRhLCBudWxsLCAyKSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgVGV4dHVyZSBtZXRhIHVwZGF0ZWQgZm9yICR7aWRlbnRpZmllcn1gLCBkYXRhOiB7IGNoYW5nZWRLZXlzOiBPYmplY3Qua2V5cyhjaGFuZ2VzKSB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gU2hhcmVkIGhlbHBlcnMgLS0tXG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0SW5mbyhpZGVudGlmaWVyOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIWlkZW50aWZpZXIpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3VybCBvciB1dWlkIGlzIHJlcXVpcmVkJyB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgdXVpZDogc3RyaW5nID0gaWRlbnRpZmllcjtcbiAgICAgICAgICAgIGlmIChpZGVudGlmaWVyLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBpZGVudGlmaWVyKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc29sdmVkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7aWRlbnRpZmllcn1gIH07XG4gICAgICAgICAgICAgICAgdXVpZCA9IHJlc29sdmVkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCB1dWlkKTtcbiAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gaW5mbyBmb3IgYXNzZXQ6ICR7aWRlbnRpZmllcn1gIH07XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGluZm8udXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IGluZm8udXJsLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbmZvLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydGVyOiBpbmZvLmltcG9ydGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbGlzdEFzc2V0c0J5UGF0dGVybihwYXR0ZXJuOiBzdHJpbmcsIGZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBxdWVyeVBhdHRlcm4gPSBmb2xkZXJcbiAgICAgICAgICAgICAgICA/IGAke2ZvbGRlcn0vJHtwYXR0ZXJufWAucmVwbGFjZSgvXFwvKy9nLCAnLycpXG4gICAgICAgICAgICAgICAgOiBgZGI6Ly9hc3NldHMvJHtwYXR0ZXJufWA7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IHF1ZXJ5UGF0dGVybiB9KTtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IChyZXN1bHRzIHx8IFtdKS5tYXAoKGE6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICB1dWlkOiBhLnV1aWQsXG4gICAgICAgICAgICAgICAgbmFtZTogYS5uYW1lLFxuICAgICAgICAgICAgICAgIHVybDogYS51cmwsXG4gICAgICAgICAgICAgICAgdHlwZTogYS50eXBlXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgYXNzZXRzLCB0b3RhbDogYXNzZXRzLmxlbmd0aCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=