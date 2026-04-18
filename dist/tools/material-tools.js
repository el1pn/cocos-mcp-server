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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0ZXJpYWwtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvbWF0ZXJpYWwtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0Esd0RBQW9EO0FBRXBELE1BQWEsYUFBYTtJQUN0QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVcsRUFDUCx5RUFBeUU7b0JBQ3pFLHFEQUFxRDtvQkFDckQsb0RBQW9EO29CQUNwRCxnREFBZ0Q7b0JBQ2hELDBDQUEwQztvQkFDMUMsZ0RBQWdEO29CQUNoRCxzQ0FBc0M7b0JBQ3RDLGlGQUFpRjtnQkFDckYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFO2dDQUNGLGlCQUFpQixFQUFFLGVBQWU7Z0NBQ2xDLFVBQVU7Z0NBQ1YsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCO2dDQUMxRCxxQkFBcUI7NkJBQ3hCOzRCQUNELFdBQVcsRUFBRSwrQ0FBK0M7eUJBQy9EO3dCQUNELEdBQUcsRUFBRTs0QkFDRCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsZ0lBQWdJO3lCQUNoSjt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1FQUFtRTt5QkFDbkY7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwrREFBK0Q7NEJBQzVFLE9BQU8sRUFBRSxrQkFBa0I7eUJBQzlCO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0RBQXNEO3lCQUN0RTt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FB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LEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2dCQUNaLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtnQkFDWixHQUFHLEVBQUUsQ0FBQyxDQUFDLEdBQUc7Z0JBQ1YsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJO2FBQ2YsQ0FBQyxDQUFDLENBQUM7WUFFSixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1FBQ3JFLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQWhRRCxzQ0FnUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCB7IEFzc2V0U2FmZXR5IH0gZnJvbSAnLi4vdXRpbHMvYXNzZXQtc2FmZXR5JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNYXRlcmlhbFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdtYXRlcmlhbF9tYW5hZ2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgJ01hbmFnZSBtYXRlcmlhbCwgdGV4dHVyZSwgYW5kIHNoYWRlci9lZmZlY3QgYXNzZXRzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2NyZWF0ZV9tYXRlcmlhbCAoY3JlYXRlIGEgbmV3IC5tdGwgbWF0ZXJpYWwgZmlsZSksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdjcmVhdGVfc2hhZGVyIChjcmVhdGUgYSBuZXcgLmVmZmVjdCBzaGFkZXIgZmlsZSksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbyAoZ2V0IGFzc2V0IGRldGFpbHMgYnkgVVVJRCBvciBwYXRoKSwgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dldF9tYXRlcmlhbF9saXN0IChsaXN0IGFsbCBtYXRlcmlhbHMpLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAnZ2V0X3RleHR1cmVfbGlzdCAobGlzdCB0ZXh0dXJlcyBpbiBhIGZvbGRlciksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdnZXRfc2hhZGVyX2xpc3QgKGxpc3QgYWxsIGVmZmVjdHMpLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAndXBkYXRlX3RleHR1cmVfbWV0YSAobW9kaWZ5IHRleHR1cmUgaW1wb3J0IHNldHRpbmdzIGxpa2UgZmlsdGVyTW9kZSwgd3JhcE1vZGUpLicsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY3JlYXRlX21hdGVyaWFsJywgJ2NyZWF0ZV9zaGFkZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdnZXRfaW5mbycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2dldF9tYXRlcmlhbF9saXN0JywgJ2dldF90ZXh0dXJlX2xpc3QnLCAnZ2V0X3NoYWRlcl9saXN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAndXBkYXRlX3RleHR1cmVfbWV0YSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBtYXRlcmlhbC90ZXh0dXJlL3NoYWRlciBhY3Rpb24gdG8gcGVyZm9ybSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIChlLmcuIGRiOi8vYXNzZXRzL21hdGVyaWFscy9teS1tYXQubXRsKS4gUmVxdWlyZWQgZm9yIGNyZWF0ZV9tYXRlcmlhbCwgY3JlYXRlX3NoYWRlciwgZ2V0X2luZm8sIHVwZGF0ZV90ZXh0dXJlX21ldGEuJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCAoYWx0ZXJuYXRpdmUgdG8gdXJsIGZvciBnZXRfaW5mbywgdXBkYXRlX3RleHR1cmVfbWV0YSknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVmZmVjdE5hbWU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFZmZlY3QgbmFtZSBmb3IgY3JlYXRlX21hdGVyaWFsIChkZWZhdWx0OiBcImJ1aWx0aW4tc3RhbmRhcmRcIiknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2J1aWx0aW4tc3RhbmRhcmQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTaGFkZXIgZGVmaW5lcyBmb3IgY3JlYXRlX21hdGVyaWFsIChrZXktdmFsdWUgcGFpcnMpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2hhZGVyIHNvdXJjZSBjb2RlIGZvciBjcmVhdGVfc2hhZGVyIGFjdGlvbidcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9sZGVyIHRvIGxpc3QgdGV4dHVyZXMgZnJvbSAoZm9yIGdldF90ZXh0dXJlX2xpc3QsIGRlZmF1bHQ6IGRiOi8vYXNzZXRzKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFDaGFuZ2VzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0YSBwcm9wZXJ0eSBjaGFuZ2VzIGZvciB1cGRhdGVfdGV4dHVyZV9tZXRhIChlLmcuIHsgXCJmaWx0ZXJNb2RlXCI6IFwiYmlsaW5lYXJcIiB9KSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZShfdG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIC8vIE1hdGVyaWFsXHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZV9tYXRlcmlhbCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVNYXRlcmlhbChhcmdzLnVybCwgYXJncy5lZmZlY3ROYW1lIHx8ICdidWlsdGluLXN0YW5kYXJkJywgYXJncy5kZWZpbmVzKTtcclxuICAgICAgICAgICAgLy8gU2hhZGVyXHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZV9zaGFkZXInOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlU2hhZGVyKGFyZ3MudXJsLCBhcmdzLmNvbnRlbnQpO1xyXG4gICAgICAgICAgICAvLyBJbmZvIChhbnkgYXNzZXQgdHlwZSlcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXRJbmZvKGFyZ3MudXJsIHx8IGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIC8vIExpc3RzXHJcbiAgICAgICAgICAgIGNhc2UgJ2dldF9tYXRlcmlhbF9saXN0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyoubXRsJyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dldF90ZXh0dXJlX2xpc3QnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdEFzc2V0c0J5UGF0dGVybignKiovKi57cG5nLGpwZyxqcGVnLHdlYnAsYm1wfScsIGFyZ3MuZm9sZGVyKTtcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X3NoYWRlcl9saXN0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RBc3NldHNCeVBhdHRlcm4oJyoqLyouZWZmZWN0Jyk7XHJcbiAgICAgICAgICAgIC8vIFRleHR1cmUgbWV0YVxyXG4gICAgICAgICAgICBjYXNlICd1cGRhdGVfdGV4dHVyZV9tZXRhJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnVwZGF0ZVRleHR1cmVNZXRhKGFyZ3MudXJsIHx8IGFyZ3MudXVpZCwgYXJncy5tZXRhQ2hhbmdlcyk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLSBNYXRlcmlhbCAtLS1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU1hdGVyaWFsKHVybDogc3RyaW5nLCBlZmZlY3ROYW1lOiBzdHJpbmcsIGRlZmluZXM/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBpZiAoIXVybCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsIGlzIHJlcXVpcmVkIGZvciBjcmVhdGVfbWF0ZXJpYWwnIH07XHJcblxyXG4gICAgICAgIGNvbnN0IG1hdGVyaWFsSnNvbiA9IHtcclxuICAgICAgICAgICAgX190eXBlX186ICdjYy5NYXRlcmlhbCcsXHJcbiAgICAgICAgICAgIF9uYW1lOiAnJyxcclxuICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICBfbmF0aXZlOiAnJyxcclxuICAgICAgICAgICAgX2VmZmVjdEFzc2V0OiB7XHJcbiAgICAgICAgICAgICAgICBfX3V1aWRfXzogZWZmZWN0TmFtZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBfdGVjaElkeDogMCxcclxuICAgICAgICAgICAgX2RlZmluZXM6IGRlZmluZXMgPyBbZGVmaW5lc10gOiBbe31dLFxyXG4gICAgICAgICAgICBfc3RhdGVzOiBbe31dLFxyXG4gICAgICAgICAgICBfcHJvcHM6IFt7fV1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBjb25zdCBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoW21hdGVyaWFsSnNvbl0sIG51bGwsIDIpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEFzc2V0U2FmZXR5LnNhZmVDcmVhdGVBc3NldCh1cmwuZW5kc1dpdGgoJy5tdGwnKSA/IHVybCA6IHVybCArICcubXRsJywgY29udGVudCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc3VsdC5zdWNjZXNzLFxyXG4gICAgICAgICAgICBkYXRhOiByZXN1bHQuc3VjY2VzcyA/IHsgdXVpZDogcmVzdWx0LnV1aWQsIHVybDogcmVzdWx0LnVybCB9IDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0gU2hhZGVyIC0tLVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlU2hhZGVyKHVybDogc3RyaW5nLCBjb250ZW50Pzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBpZiAoIXVybCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsIGlzIHJlcXVpcmVkIGZvciBjcmVhdGVfc2hhZGVyJyB9O1xyXG5cclxuICAgICAgICBjb25zdCBzaGFkZXJDb250ZW50ID0gY29udGVudCB8fCB0aGlzLmdldERlZmF1bHRFZmZlY3RUZW1wbGF0ZSgpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEFzc2V0U2FmZXR5LnNhZmVDcmVhdGVBc3NldCh1cmwuZW5kc1dpdGgoJy5lZmZlY3QnKSA/IHVybCA6IHVybCArICcuZWZmZWN0Jywgc2hhZGVyQ29udGVudCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc3VsdC5zdWNjZXNzLFxyXG4gICAgICAgICAgICBkYXRhOiByZXN1bHQuc3VjY2VzcyA/IHsgdXVpZDogcmVzdWx0LnV1aWQsIHVybDogcmVzdWx0LnVybCB9IDogdW5kZWZpbmVkLFxyXG4gICAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldERlZmF1bHRFZmZlY3RUZW1wbGF0ZSgpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBgQ0NFZmZlY3QgJXtcclxuICB0ZWNobmlxdWVzOlxyXG4gIC0gbmFtZTogb3BhcXVlXHJcbiAgICBwYXNzZXM6XHJcbiAgICAtIHZlcnQ6IHZzOnZlcnRcclxuICAgICAgZnJhZzogZnM6ZnJhZ1xyXG4gICAgICBwcm9wZXJ0aWVzOlxyXG4gICAgICAgIG1haW5Db2xvcjogeyB2YWx1ZTogWzEsIDEsIDEsIDFdLCBlZGl0b3I6IHsgdHlwZTogY29sb3IgfSB9XHJcbn0lXHJcblxyXG5DQ1Byb2dyYW0gdnMgJXtcclxuICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcbiAgI2luY2x1ZGUgPGNjLWdsb2JhbD5cclxuICAjaW5jbHVkZSA8Y2MtbG9jYWw+XHJcblxyXG4gIGluIHZlYzMgYV9wb3NpdGlvbjtcclxuICBpbiB2ZWMyIGFfdGV4Q29vcmQ7XHJcbiAgb3V0IHZlYzIgdl91djtcclxuXHJcbiAgdmVjNCB2ZXJ0ICgpIHtcclxuICAgIHZlYzQgcG9zID0gY2NfbWF0Vmlld1Byb2ogKiBjY19tYXRXb3JsZCAqIHZlYzQoYV9wb3NpdGlvbiwgMS4wKTtcclxuICAgIHZfdXYgPSBhX3RleENvb3JkO1xyXG4gICAgcmV0dXJuIHBvcztcclxuICB9XHJcbn0lXHJcblxyXG5DQ1Byb2dyYW0gZnMgJXtcclxuICBwcmVjaXNpb24gaGlnaHAgZmxvYXQ7XHJcblxyXG4gIGluIHZlYzIgdl91djtcclxuICB1bmlmb3JtIENvbnN0YW50IHtcclxuICAgIHZlYzQgbWFpbkNvbG9yO1xyXG4gIH07XHJcblxyXG4gIHZlYzQgZnJhZyAoKSB7XHJcbiAgICByZXR1cm4gbWFpbkNvbG9yO1xyXG4gIH1cclxufSVgO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLSBUZXh0dXJlIG1ldGEgLS0tXHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVUZXh0dXJlTWV0YShpZGVudGlmaWVyOiBzdHJpbmcsIGNoYW5nZXM6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghaWRlbnRpZmllciB8fCAhY2hhbmdlcykge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd1cmwvdXVpZCBhbmQgbWV0YUNoYW5nZXMgYXJlIHJlcXVpcmVkJyB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IHV1aWQ6IHN0cmluZyA9IGlkZW50aWZpZXI7XHJcbiAgICAgICAgICAgIGlmIChpZGVudGlmaWVyLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIGlkZW50aWZpZXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke2lkZW50aWZpZXJ9YCB9O1xyXG4gICAgICAgICAgICAgICAgdXVpZCA9IHJlc29sdmVkIGFzIHN0cmluZztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgbWV0YVN0ciA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCB1dWlkKTtcclxuICAgICAgICAgICAgaWYgKCFtZXRhU3RyKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdDb3VsZCBub3QgcmVhZCBhc3NldCBtZXRhJyB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHR5cGVvZiBtZXRhU3RyID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UobWV0YVN0cikgOiBtZXRhU3RyO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY2hhbmdlcykpIHtcclxuICAgICAgICAgICAgICAgIG1ldGFba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCB1dWlkLCBKU09OLnN0cmluZ2lmeShtZXRhLCBudWxsLCAyKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBUZXh0dXJlIG1ldGEgdXBkYXRlZCBmb3IgJHtpZGVudGlmaWVyfWAsIGRhdGE6IHsgY2hhbmdlZEtleXM6IE9iamVjdC5rZXlzKGNoYW5nZXMpIH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLSBTaGFyZWQgaGVscGVycyAtLS1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0SW5mbyhpZGVudGlmaWVyOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghaWRlbnRpZmllcikgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXJsIG9yIHV1aWQgaXMgcmVxdWlyZWQnIH07XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGxldCB1dWlkOiBzdHJpbmcgPSBpZGVudGlmaWVyO1xyXG4gICAgICAgICAgICBpZiAoaWRlbnRpZmllci5zdGFydHNXaXRoKCdkYjovLycpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBpZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzb2x2ZWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHtpZGVudGlmaWVyfWAgfTtcclxuICAgICAgICAgICAgICAgIHV1aWQgPSByZXNvbHZlZCBhcyBzdHJpbmc7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gaW5mbyBmb3IgYXNzZXQ6ICR7aWRlbnRpZmllcn1gIH07XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHVybDogaW5mby51cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydGVyOiBpbmZvLmltcG9ydGVyXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBc3NldHNCeVBhdHRlcm4ocGF0dGVybjogc3RyaW5nLCBmb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHF1ZXJ5UGF0dGVybiA9IGZvbGRlclxyXG4gICAgICAgICAgICAgICAgPyBgJHtmb2xkZXJ9LyR7cGF0dGVybn1gLnJlcGxhY2UoL1xcLysvZywgJy8nKVxyXG4gICAgICAgICAgICAgICAgOiBgZGI6Ly9hc3NldHMvJHtwYXR0ZXJufWA7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBxdWVyeVBhdHRlcm4gfSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IChyZXN1bHRzIHx8IFtdKS5tYXAoKGE6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IGEudXVpZCxcclxuICAgICAgICAgICAgICAgIG5hbWU6IGEubmFtZSxcclxuICAgICAgICAgICAgICAgIHVybDogYS51cmwsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBhLnR5cGVcclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBhc3NldHMsIHRvdGFsOiBhc3NldHMubGVuZ3RoIH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==