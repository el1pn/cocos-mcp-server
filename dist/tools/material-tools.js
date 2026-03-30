"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialTools = void 0;
const asset_safety_1 = require("../utils/asset-safety");
class MaterialTools {
    getTools() {
        return [
            {
                name: 'material_manage',
                description: 'Manage material, texture, and shader/effect assets. Available actions: ' +
                    'create_material (create a new .mtl material file), ' +
                    'create_shader (create a new .effect shader file), ' +
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
                                'create_material', 'create_shader',
                                'get_info',
                                'get_material_list', 'get_texture_list', 'get_shader_list',
                                'update_texture_meta'
                            ],
                            description: 'The material/texture/shader action to perform'
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (e.g. db://assets/materials/my-mat.mtl). Required for create_material, create_shader, get_info, update_texture_meta.'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Asset UUID (alternative to url for get_info, update_texture_meta)'
                        },
                        effectName: {
                            type: 'string',
                            description: 'Effect name for create_material (default: "builtin-standard")',
                            default: 'builtin-standard'
                        },
                        defines: {
                            type: 'object',
                            description: 'Shader defines for create_material (key-value pairs)'
                        },
                        content: {
                            type: 'string',
                            description: 'Shader source code for create_shader action'
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
            // Material
            case 'create_material':
                return await this.createMaterial(args.url, args.effectName || 'builtin-standard', args.defines);
            // Shader
            case 'create_shader':
                return await this.createShader(args.url, args.content);
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
    // --- Material ---
    async createMaterial(url, effectName, defines) {
        if (!url)
            return { success: false, error: 'url is required for create_material' };
        const materialJson = {
            __type__: 'cc.Material',
            _name: '',
            _objFlags: 0,
            _native: '',
            _effectAsset: {
                __uuid__: effectName
            },
            _techIdx: 0,
            _defines: defines ? [defines] : [{}],
            _states: [{}],
            _props: [{}]
        };
        const content = JSON.stringify([materialJson], null, 2);
        const result = await asset_safety_1.AssetSafety.safeCreateAsset(url.endsWith('.mtl') ? url : url + '.mtl', content);
        return {
            success: result.success,
            data: result.success ? { uuid: result.uuid, url: result.url } : undefined,
            error: result.error
        };
    }
    // --- Shader ---
    async createShader(url, content) {
        if (!url)
            return { success: false, error: 'url is required for create_shader' };
        const shaderContent = content || this.getDefaultEffectTemplate();
        const result = await asset_safety_1.AssetSafety.safeCreateAsset(url.endsWith('.effect') ? url : url + '.effect', shaderContent);
        return {
            success: result.success,
            data: result.success ? { uuid: result.uuid, url: result.url } : undefined,
            error: result.error
        };
    }
    getDefaultEffectTemplate() {
        return `CCEffect %{
  techniques:
  - name: opaque
    passes:
    - vert: vs:vert
      frag: fs:frag
      properties:
        mainColor: { value: [1, 1, 1, 1], editor: { type: color } }
}%

CCProgram vs %{
  precision highp float;
  #include <cc-global>
  #include <cc-local>

  in vec3 a_position;
  in vec2 a_texCoord;
  out vec2 v_uv;

  vec4 vert () {
    vec4 pos = cc_matViewProj * cc_matWorld * vec4(a_position, 1.0);
    v_uv = a_texCoord;
    return pos;
  }
}%

CCProgram fs %{
  precision highp float;

  in vec2 v_uv;
  uniform Constant {
    vec4 mainColor;
  };

  vec4 frag () {
    return mainColor;
  }
}%`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvbWF0ZXJpYWwtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esd0RBQW9EO0FBRXBELE1BQWEsYUFBYTtJQUN0QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVcsRUFDUCx5RUFBeUU7b0JBQ3pFLHFEQUFxRDtvQkFDckQsb0RBQW9EO29CQUNwRCxnREFBZ0Q7b0JBQ2hELDBDQUEwQztvQkFDMUMsZ0RBQWdEO29CQUNoRCxzQ0FBc0M7b0JBQ3RDLGlGQUFpRjtnQkFDckYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFO2dDQUNGLGlCQUFpQixFQUFFLGVBQWU7Z0NBQ2xDLFVBQVU7Z0NBQ1YsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCO2dDQUMxRCxxQkFBcUI7NkJBQ3hCOzRCQUNELFdBQVcsRUFBRSwrQ0FBK0M7eUJBQy9EO3dCQUNELEdBQUcsRUFBRTs0QkFDRCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsZ0lBQWdJO3lCQUNoSjt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1FQUFtRTt5QkFDbkY7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwrREFBK0Q7NEJBQzVFLE9BQU8sRUFBRSxrQkFBa0I7eUJBQzlCO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0RBQXNEO3lCQUN0RTt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FB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LEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUc7Z0JBQ1YsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2FBQ2YsQ0FBQyxDQUFDLENBQUM7WUFFSixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ3JFLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQWhRRCxzQ0FnUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBBc3NldFNhZmV0eSB9IGZyb20gJy4uL3V0aWxzL2Fzc2V0LXNhZmV0eSc7XG5cbmV4cG9ydCBjbGFzcyBNYXRlcmlhbFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbWF0ZXJpYWxfbWFuYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ01hbmFnZSBtYXRlcmlhbCwgdGV4dHVyZSwgYW5kIHNoYWRlci9lZmZlY3QgYXNzZXRzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdjcmVhdGVfbWF0ZXJpYWwgKGNyZWF0ZSBhIG5ldyAubXRsIG1hdGVyaWFsIGZpbGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2NyZWF0ZV9zaGFkZXIgKGNyZWF0ZSBhIG5ldyAuZWZmZWN0IHNoYWRlciBmaWxlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbyAoZ2V0IGFzc2V0IGRldGFpbHMgYnkgVVVJRCBvciBwYXRoKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfbWF0ZXJpYWxfbGlzdCAobGlzdCBhbGwgbWF0ZXJpYWxzKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfdGV4dHVyZV9saXN0IChsaXN0IHRleHR1cmVzIGluIGEgZm9sZGVyKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfc2hhZGVyX2xpc3QgKGxpc3QgYWxsIGVmZmVjdHMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3VwZGF0ZV90ZXh0dXJlX21ldGEgKG1vZGlmeSB0ZXh0dXJlIGltcG9ydCBzZXR0aW5ncyBsaWtlIGZpbHRlck1vZGUsIHdyYXBNb2RlKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjcmVhdGVfbWF0ZXJpYWwnLCAnY3JlYXRlX3NoYWRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnZXRfbWF0ZXJpYWxfbGlzdCcsICdnZXRfdGV4dHVyZV9saXN0JywgJ2dldF9zaGFkZXJfbGlzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICd1cGRhdGVfdGV4dHVyZV9tZXRhJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgbWF0ZXJpYWwvdGV4dHVyZS9zaGFkZXIgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgKGUuZy4gZGI6Ly9hc3NldHMvbWF0ZXJpYWxzL215LW1hdC5tdGwpLiBSZXF1aXJlZCBmb3IgY3JlYXRlX21hdGVyaWFsLCBjcmVhdGVfc2hhZGVyLCBnZXRfaW5mbywgdXBkYXRlX3RleHR1cmVfbWV0YS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCAoYWx0ZXJuYXRpdmUgdG8gdXJsIGZvciBnZXRfaW5mbywgdXBkYXRlX3RleHR1cmVfbWV0YSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0TmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRWZmZWN0IG5hbWUgZm9yIGNyZWF0ZV9tYXRlcmlhbCAoZGVmYXVsdDogXCJidWlsdGluLXN0YW5kYXJkXCIpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYnVpbHRpbi1zdGFuZGFyZCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbmVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTaGFkZXIgZGVmaW5lcyBmb3IgY3JlYXRlX21hdGVyaWFsIChrZXktdmFsdWUgcGFpcnMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NoYWRlciBzb3VyY2UgY29kZSBmb3IgY3JlYXRlX3NoYWRlciBhY3Rpb24nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGb2xkZXIgdG8gbGlzdCB0ZXh0dXJlcyBmcm9tIChmb3IgZ2V0X3RleHR1cmVfbGlzdCwgZGVmYXVsdDogZGI6Ly9hc3NldHMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0YUNoYW5nZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01ldGEgcHJvcGVydHkgY2hhbmdlcyBmb3IgdXBkYXRlX3RleHR1cmVfbWV0YSAoZS5nLiB7IFwiZmlsdGVyTW9kZVwiOiBcImJpbGluZWFyXCIgfSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIC8vIE1hdGVyaWFsXG4gICAgICAgICAgICBjYXNlICdjcmVhdGVfbWF0ZXJpYWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZU1hdGVyaWFsKGFyZ3MudXJsLCBhcmdzLmVmZmVjdE5hbWUgfHwgJ2J1aWx0aW4tc3RhbmRhcmQnLCBhcmdzLmRlZmluZXMpO1xuICAgICAgICAgICAgLy8gU2hhZGVyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGVfc2hhZGVyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVTaGFkZXIoYXJncy51cmwsIGFyZ3MuY29udGVudCk7XG4gICAgICAgICAgICAvLyBJbmZvIChhbnkgYXNzZXQgdHlwZSlcbiAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8oYXJncy51cmwgfHwgYXJncy51dWlkKTtcbiAgICAgICAgICAgIC8vIExpc3RzXG4gICAgICAgICAgICBjYXNlICdnZXRfbWF0ZXJpYWxfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdEFzc2V0c0J5UGF0dGVybignKiovKi5tdGwnKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF90ZXh0dXJlX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyoue3BuZyxqcGcsanBlZyx3ZWJwLGJtcH0nLCBhcmdzLmZvbGRlcik7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2hhZGVyX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyouZWZmZWN0Jyk7XG4gICAgICAgICAgICAvLyBUZXh0dXJlIG1ldGFcbiAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZV90ZXh0dXJlX21ldGEnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnVwZGF0ZVRleHR1cmVNZXRhKGFyZ3MudXJsIHx8IGFyZ3MudXVpZCwgYXJncy5tZXRhQ2hhbmdlcyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC0tLSBNYXRlcmlhbCAtLS1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlTWF0ZXJpYWwodXJsOiBzdHJpbmcsIGVmZmVjdE5hbWU6IHN0cmluZywgZGVmaW5lcz86IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIXVybCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsIGlzIHJlcXVpcmVkIGZvciBjcmVhdGVfbWF0ZXJpYWwnIH07XG5cbiAgICAgICAgY29uc3QgbWF0ZXJpYWxKc29uID0ge1xuICAgICAgICAgICAgX190eXBlX186ICdjYy5NYXRlcmlhbCcsXG4gICAgICAgICAgICBfbmFtZTogJycsXG4gICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXG4gICAgICAgICAgICBfbmF0aXZlOiAnJyxcbiAgICAgICAgICAgIF9lZmZlY3RBc3NldDoge1xuICAgICAgICAgICAgICAgIF9fdXVpZF9fOiBlZmZlY3ROYW1lXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX3RlY2hJZHg6IDAsXG4gICAgICAgICAgICBfZGVmaW5lczogZGVmaW5lcyA/IFtkZWZpbmVzXSA6IFt7fV0sXG4gICAgICAgICAgICBfc3RhdGVzOiBbe31dLFxuICAgICAgICAgICAgX3Byb3BzOiBbe31dXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IEpTT04uc3RyaW5naWZ5KFttYXRlcmlhbEpzb25dLCBudWxsLCAyKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXNzZXRTYWZldHkuc2FmZUNyZWF0ZUFzc2V0KHVybC5lbmRzV2l0aCgnLm10bCcpID8gdXJsIDogdXJsICsgJy5tdGwnLCBjb250ZW50KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogcmVzdWx0LnN1Y2Nlc3MsXG4gICAgICAgICAgICBkYXRhOiByZXN1bHQuc3VjY2VzcyA/IHsgdXVpZDogcmVzdWx0LnV1aWQsIHVybDogcmVzdWx0LnVybCB9IDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5lcnJvclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIC0tLSBTaGFkZXIgLS0tXG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVNoYWRlcih1cmw6IHN0cmluZywgY29udGVudD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghdXJsKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd1cmwgaXMgcmVxdWlyZWQgZm9yIGNyZWF0ZV9zaGFkZXInIH07XG5cbiAgICAgICAgY29uc3Qgc2hhZGVyQ29udGVudCA9IGNvbnRlbnQgfHwgdGhpcy5nZXREZWZhdWx0RWZmZWN0VGVtcGxhdGUoKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXNzZXRTYWZldHkuc2FmZUNyZWF0ZUFzc2V0KHVybC5lbmRzV2l0aCgnLmVmZmVjdCcpID8gdXJsIDogdXJsICsgJy5lZmZlY3QnLCBzaGFkZXJDb250ZW50KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogcmVzdWx0LnN1Y2Nlc3MsXG4gICAgICAgICAgICBkYXRhOiByZXN1bHQuc3VjY2VzcyA/IHsgdXVpZDogcmVzdWx0LnV1aWQsIHVybDogcmVzdWx0LnVybCB9IDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5lcnJvclxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RGVmYXVsdEVmZmVjdFRlbXBsYXRlKCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBgQ0NFZmZlY3QgJXtcbiAgdGVjaG5pcXVlczpcbiAgLSBuYW1lOiBvcGFxdWVcbiAgICBwYXNzZXM6XG4gICAgLSB2ZXJ0OiB2czp2ZXJ0XG4gICAgICBmcmFnOiBmczpmcmFnXG4gICAgICBwcm9wZXJ0aWVzOlxuICAgICAgICBtYWluQ29sb3I6IHsgdmFsdWU6IFsxLCAxLCAxLCAxXSwgZWRpdG9yOiB7IHR5cGU6IGNvbG9yIH0gfVxufSVcblxuQ0NQcm9ncmFtIHZzICV7XG4gIHByZWNpc2lvbiBoaWdocCBmbG9hdDtcbiAgI2luY2x1ZGUgPGNjLWdsb2JhbD5cbiAgI2luY2x1ZGUgPGNjLWxvY2FsPlxuXG4gIGluIHZlYzMgYV9wb3NpdGlvbjtcbiAgaW4gdmVjMiBhX3RleENvb3JkO1xuICBvdXQgdmVjMiB2X3V2O1xuXG4gIHZlYzQgdmVydCAoKSB7XG4gICAgdmVjNCBwb3MgPSBjY19tYXRWaWV3UHJvaiAqIGNjX21hdFdvcmxkICogdmVjNChhX3Bvc2l0aW9uLCAxLjApO1xuICAgIHZfdXYgPSBhX3RleENvb3JkO1xuICAgIHJldHVybiBwb3M7XG4gIH1cbn0lXG5cbkNDUHJvZ3JhbSBmcyAle1xuICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7XG5cbiAgaW4gdmVjMiB2X3V2O1xuICB1bmlmb3JtIENvbnN0YW50IHtcbiAgICB2ZWM0IG1haW5Db2xvcjtcbiAgfTtcblxuICB2ZWM0IGZyYWcgKCkge1xuICAgIHJldHVybiBtYWluQ29sb3I7XG4gIH1cbn0lYDtcbiAgICB9XG5cbiAgICAvLyAtLS0gVGV4dHVyZSBtZXRhIC0tLVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVUZXh0dXJlTWV0YShpZGVudGlmaWVyOiBzdHJpbmcsIGNoYW5nZXM6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIWlkZW50aWZpZXIgfHwgIWNoYW5nZXMpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3VybC91dWlkIGFuZCBtZXRhQ2hhbmdlcyBhcmUgcmVxdWlyZWQnIH07XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHV1aWQ6IHN0cmluZyA9IGlkZW50aWZpZXI7XG4gICAgICAgICAgICBpZiAoaWRlbnRpZmllci5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgaWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke2lkZW50aWZpZXJ9YCB9O1xuICAgICAgICAgICAgICAgIHV1aWQgPSByZXNvbHZlZCBhcyBzdHJpbmc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG1ldGFTdHIgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgdXVpZCk7XG4gICAgICAgICAgICBpZiAoIW1ldGFTdHIpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0NvdWxkIG5vdCByZWFkIGFzc2V0IG1ldGEnIH07XG5cbiAgICAgICAgICAgIGNvbnN0IG1ldGEgPSB0eXBlb2YgbWV0YVN0ciA9PT0gJ3N0cmluZycgPyBKU09OLnBhcnNlKG1ldGFTdHIpIDogbWV0YVN0cjtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY2hhbmdlcykpIHtcbiAgICAgICAgICAgICAgICBtZXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldC1tZXRhJywgdXVpZCwgSlNPTi5zdHJpbmdpZnkobWV0YSwgbnVsbCwgMikpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFRleHR1cmUgbWV0YSB1cGRhdGVkIGZvciAke2lkZW50aWZpZXJ9YCwgZGF0YTogeyBjaGFuZ2VkS2V5czogT2JqZWN0LmtleXMoY2hhbmdlcykgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gLS0tIFNoYXJlZCBoZWxwZXJzIC0tLVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBc3NldEluZm8oaWRlbnRpZmllcjogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFpZGVudGlmaWVyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd1cmwgb3IgdXVpZCBpcyByZXF1aXJlZCcgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHV1aWQ6IHN0cmluZyA9IGlkZW50aWZpZXI7XG4gICAgICAgICAgICBpZiAoaWRlbnRpZmllci5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgaWRlbnRpZmllcik7XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke2lkZW50aWZpZXJ9YCB9O1xuICAgICAgICAgICAgICAgIHV1aWQgPSByZXNvbHZlZCBhcyBzdHJpbmc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCk7XG4gICAgICAgICAgICBpZiAoIWluZm8pIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vIGluZm8gZm9yIGFzc2V0OiAke2lkZW50aWZpZXJ9YCB9O1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGluZm8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBpbmZvLnVybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlLFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlcjogaW5mby5pbXBvcnRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBc3NldHNCeVBhdHRlcm4ocGF0dGVybjogc3RyaW5nLCBmb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcXVlcnlQYXR0ZXJuID0gZm9sZGVyXG4gICAgICAgICAgICAgICAgPyBgJHtmb2xkZXJ9LyR7cGF0dGVybn1gLnJlcGxhY2UoL1xcLysvZywgJy8nKVxuICAgICAgICAgICAgICAgIDogYGRiOi8vYXNzZXRzLyR7cGF0dGVybn1gO1xuXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBxdWVyeVBhdHRlcm4gfSk7XG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSAocmVzdWx0cyB8fCBbXSkubWFwKChhOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgdXVpZDogYS51dWlkLFxuICAgICAgICAgICAgICAgIG5hbWU6IGEubmFtZSxcbiAgICAgICAgICAgICAgICB1cmw6IGEudXJsLFxuICAgICAgICAgICAgICAgIHR5cGU6IGEudHlwZVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGFzc2V0cywgdG90YWw6IGFzc2V0cy5sZW5ndGggfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19