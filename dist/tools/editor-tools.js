"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditorTools = void 0;
const fs = __importStar(require("fs"));
class EditorTools {
    getTools() {
        return [
            {
                name: 'editor_actions',
                description: 'Perform editor-level actions. Available actions: ' +
                    'execute_menu (trigger an editor menu action by path), ' +
                    'apply_text_edits (apply insert/delete/replace edits to a file), ' +
                    'find_references (find all references to a node or asset UUID in the current scene).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['execute_menu', 'apply_text_edits', 'find_references'],
                            description: 'The editor action to perform'
                        },
                        menuPath: {
                            type: 'string',
                            description: 'Full menu path for execute_menu (e.g. "Project/Build", "File/Save Scene")'
                        },
                        filePath: {
                            type: 'string',
                            description: 'File path for apply_text_edits (db://assets/... or absolute path)'
                        },
                        edits: {
                            type: 'array',
                            description: 'Array of edit operations for apply_text_edits',
                            items: {
                                type: 'object',
                                properties: {
                                    type: {
                                        type: 'string',
                                        enum: ['insert', 'delete', 'replace'],
                                        description: 'Edit type'
                                    },
                                    offset: {
                                        type: 'number',
                                        description: 'Character offset for insert, or start offset for delete/replace'
                                    },
                                    length: {
                                        type: 'number',
                                        description: 'Number of characters to delete/replace (required for delete/replace)'
                                    },
                                    text: {
                                        type: 'string',
                                        description: 'Text to insert or replacement text (required for insert/replace)'
                                    }
                                },
                                required: ['type', 'offset']
                            }
                        },
                        targetUuid: {
                            type: 'string',
                            description: 'UUID of the node or asset for find_references'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(_toolName, args) {
        switch (args.action) {
            case 'execute_menu':
                return await this.executeMenuItem(args.menuPath);
            case 'apply_text_edits':
                return await this.applyTextEdits(args.filePath, args.edits);
            case 'find_references':
                return await this.findReferences(args.targetUuid);
            default:
                return { success: false, error: `Unknown action: ${args.action}` };
        }
    }
    async executeMenuItem(menuPath) {
        if (!menuPath)
            return { success: false, error: 'menuPath is required for execute_menu' };
        // Map common menu paths to their actual Editor.Message equivalents in 3.8.x
        const menuActionMap = {
            'File/Save Scene': () => Editor.Message.request('scene', 'save-scene'),
            'File/Build': () => Editor.Message.request('builder', 'open'),
            'Project/Build': () => Editor.Message.request('builder', 'open'),
        };
        const normalizedPath = menuPath.trim();
        const action = menuActionMap[normalizedPath];
        if (action) {
            try {
                await action();
                return { success: true, message: `Menu action executed: ${menuPath}` };
            }
            catch (err) {
                return { success: false, error: `Failed to execute menu action: ${err.message}` };
            }
        }
        // Fallback: try sending as a generic editor message
        try {
            await Editor.Message.request('editor', 'execute-menu', normalizedPath);
            return { success: true, message: `Menu item executed: ${menuPath}` };
        }
        catch (_a) {
            return {
                success: false,
                error: `Menu path "${menuPath}" is not supported. Use known paths like "File/Save Scene" or "Project/Build", or use specific MCP tools instead.`
            };
        }
    }
    async applyTextEdits(filePath, edits) {
        if (!filePath || !edits)
            return { success: false, error: 'filePath and edits are required for apply_text_edits' };
        try {
            // Resolve db:// path to filesystem path
            let fsPath = filePath;
            if (filePath.startsWith('db://')) {
                const resolved = await Editor.Message.request('asset-db', 'query-path', filePath);
                if (!resolved) {
                    return { success: false, error: `Could not resolve path: ${filePath}` };
                }
                fsPath = resolved;
            }
            if (!fs.existsSync(fsPath)) {
                return { success: false, error: `File not found: ${fsPath}` };
            }
            let content = fs.readFileSync(fsPath, 'utf8');
            // Sort edits by offset descending to preserve positions
            const sorted = [...edits].sort((a, b) => b.offset - a.offset);
            for (const edit of sorted) {
                switch (edit.type) {
                    case 'insert':
                        if (edit.text === undefined) {
                            return { success: false, error: 'insert edit requires "text" field' };
                        }
                        content = content.slice(0, edit.offset) + edit.text + content.slice(edit.offset);
                        break;
                    case 'delete':
                        if (edit.length === undefined) {
                            return { success: false, error: 'delete edit requires "length" field' };
                        }
                        content = content.slice(0, edit.offset) + content.slice(edit.offset + edit.length);
                        break;
                    case 'replace':
                        if (edit.length === undefined || edit.text === undefined) {
                            return { success: false, error: 'replace edit requires "length" and "text" fields' };
                        }
                        content = content.slice(0, edit.offset) + edit.text + content.slice(edit.offset + edit.length);
                        break;
                    default:
                        return { success: false, error: `Unknown edit type: ${edit.type}` };
                }
            }
            fs.writeFileSync(fsPath, content, 'utf8');
            // Refresh asset if it's a db:// path
            if (filePath.startsWith('db://')) {
                try {
                    await Editor.Message.request('asset-db', 'refresh-asset', filePath);
                }
                catch (_a) {
                    // Best effort
                }
            }
            return {
                success: true,
                message: `Applied ${edits.length} edits to ${filePath}`,
                data: { editsApplied: edits.length, fileSize: content.length }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async findReferences(targetUuid) {
        if (!targetUuid)
            return { success: false, error: 'targetUuid is required for find_references' };
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene loaded' };
            }
            const references = [];
            const walkNode = async (node) => {
                if (node.__comps__) {
                    for (const comp of node.__comps__) {
                        const compType = comp.__type__ || 'Unknown';
                        for (const [key, value] of Object.entries(comp)) {
                            if (key.startsWith('__'))
                                continue;
                            if (this.containsUuid(value, targetUuid)) {
                                references.push({
                                    nodeUuid: node.uuid,
                                    nodeName: node.name,
                                    componentType: compType,
                                    property: key
                                });
                            }
                        }
                    }
                }
                if (node.children) {
                    for (const child of node.children) {
                        await walkNode(child);
                    }
                }
            };
            await walkNode(tree);
            return {
                success: true,
                data: { targetUuid, references, totalReferences: references.length },
                message: `Found ${references.length} references to ${targetUuid}`
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    containsUuid(value, targetUuid) {
        if (!value)
            return false;
        if (typeof value === 'string')
            return value === targetUuid;
        if (typeof value === 'object') {
            if (value.uuid === targetUuid)
                return true;
            if (value.__uuid__ === targetUuid)
                return true;
            if (Array.isArray(value)) {
                return value.some(item => this.containsUuid(item, targetUuid));
            }
        }
        return false;
    }
}
exports.EditorTools = EditorTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2VkaXRvci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFFekIsTUFBYSxXQUFXO0lBQ3BCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUNQLG1EQUFtRDtvQkFDbkQsd0RBQXdEO29CQUN4RCxrRUFBa0U7b0JBQ2xFLHFGQUFxRjtnQkFDekYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDOzRCQUM3RCxXQUFXLEVBQUUsOEJBQThCO3lCQUM5Qzt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJFQUEyRTt5QkFDM0Y7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtRUFBbUU7eUJBQ25GO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsT0FBTzs0QkFDYixXQUFXLEVBQUUsK0NBQStDOzRCQUM1RCxLQUFLLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsVUFBVSxFQUFFO29DQUNSLElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQzt3Q0FDckMsV0FBVyxFQUFFLFdBQVc7cUNBQzNCO29DQUNELE1BQU0sRUFBRTt3Q0FDSixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUs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akIsQ0FBQztDQUNKO0FBeFBELGtDQXdQQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEVkaXRvclRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdlZGl0b3JfYWN0aW9ucycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAnUGVyZm9ybSBlZGl0b3ItbGV2ZWwgYWN0aW9ucy4gQXZhaWxhYmxlIGFjdGlvbnM6ICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdleGVjdXRlX21lbnUgKHRyaWdnZXIgYW4gZWRpdG9yIG1lbnUgYWN0aW9uIGJ5IHBhdGgpLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAnYXBwbHlfdGV4dF9lZGl0cyAoYXBwbHkgaW5zZXJ0L2RlbGV0ZS9yZXBsYWNlIGVkaXRzIHRvIGEgZmlsZSksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdmaW5kX3JlZmVyZW5jZXMgKGZpbmQgYWxsIHJlZmVyZW5jZXMgdG8gYSBub2RlIG9yIGFzc2V0IFVVSUQgaW4gdGhlIGN1cnJlbnQgc2NlbmUpLicsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZXhlY3V0ZV9tZW51JywgJ2FwcGx5X3RleHRfZWRpdHMnLCAnZmluZF9yZWZlcmVuY2VzJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlZGl0b3IgYWN0aW9uIHRvIHBlcmZvcm0nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lbnVQYXRoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRnVsbCBtZW51IHBhdGggZm9yIGV4ZWN1dGVfbWVudSAoZS5nLiBcIlByb2plY3QvQnVpbGRcIiwgXCJGaWxlL1NhdmUgU2NlbmVcIiknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsZSBwYXRoIGZvciBhcHBseV90ZXh0X2VkaXRzIChkYjovL2Fzc2V0cy8uLi4gb3IgYWJzb2x1dGUgcGF0aCknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBlZGl0IG9wZXJhdGlvbnMgZm9yIGFwcGx5X3RleHRfZWRpdHMnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydpbnNlcnQnLCAnZGVsZXRlJywgJ3JlcGxhY2UnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRWRpdCB0eXBlJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGFyYWN0ZXIgb2Zmc2V0IGZvciBpbnNlcnQsIG9yIHN0YXJ0IG9mZnNldCBmb3IgZGVsZXRlL3JlcGxhY2UnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBjaGFyYWN0ZXJzIHRvIGRlbGV0ZS9yZXBsYWNlIChyZXF1aXJlZCBmb3IgZGVsZXRlL3JlcGxhY2UpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGV4dCB0byBpbnNlcnQgb3IgcmVwbGFjZW1lbnQgdGV4dCAocmVxdWlyZWQgZm9yIGluc2VydC9yZXBsYWNlKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndHlwZScsICdvZmZzZXQnXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRVdWlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVVVJRCBvZiB0aGUgbm9kZSBvciBhc3NldCBmb3IgZmluZF9yZWZlcmVuY2VzJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSAnZXhlY3V0ZV9tZW51JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVNZW51SXRlbShhcmdzLm1lbnVQYXRoKTtcclxuICAgICAgICAgICAgY2FzZSAnYXBwbHlfdGV4dF9lZGl0cyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5hcHBseVRleHRFZGl0cyhhcmdzLmZpbGVQYXRoLCBhcmdzLmVkaXRzKTtcclxuICAgICAgICAgICAgY2FzZSAnZmluZF9yZWZlcmVuY2VzJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmZpbmRSZWZlcmVuY2VzKGFyZ3MudGFyZ2V0VXVpZCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1lbnVJdGVtKG1lbnVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghbWVudVBhdGgpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ21lbnVQYXRoIGlzIHJlcXVpcmVkIGZvciBleGVjdXRlX21lbnUnIH07XHJcblxyXG4gICAgICAgIC8vIE1hcCBjb21tb24gbWVudSBwYXRocyB0byB0aGVpciBhY3R1YWwgRWRpdG9yLk1lc3NhZ2UgZXF1aXZhbGVudHMgaW4gMy44LnhcclxuICAgICAgICBjb25zdCBtZW51QWN0aW9uTWFwOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPGFueT4+ID0ge1xyXG4gICAgICAgICAgICAnRmlsZS9TYXZlIFNjZW5lJzogKCkgPT4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2F2ZS1zY2VuZScpLFxyXG4gICAgICAgICAgICAnRmlsZS9CdWlsZCc6ICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicpLFxyXG4gICAgICAgICAgICAnUHJvamVjdC9CdWlsZCc6ICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicpLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gbWVudVBhdGgudHJpbSgpO1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG1lbnVBY3Rpb25NYXBbbm9ybWFsaXplZFBhdGhdO1xyXG5cclxuICAgICAgICBpZiAoYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBhY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBNZW51IGFjdGlvbiBleGVjdXRlZDogJHttZW51UGF0aH1gIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gZXhlY3V0ZSBtZW51IGFjdGlvbjogJHtlcnIubWVzc2FnZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEZhbGxiYWNrOiB0cnkgc2VuZGluZyBhcyBhIGdlbmVyaWMgZWRpdG9yIG1lc3NhZ2VcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdlZGl0b3InLCAnZXhlY3V0ZS1tZW51Jywgbm9ybWFsaXplZFBhdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTWVudSBpdGVtIGV4ZWN1dGVkOiAke21lbnVQYXRofWAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBNZW51IHBhdGggXCIke21lbnVQYXRofVwiIGlzIG5vdCBzdXBwb3J0ZWQuIFVzZSBrbm93biBwYXRocyBsaWtlIFwiRmlsZS9TYXZlIFNjZW5lXCIgb3IgXCJQcm9qZWN0L0J1aWxkXCIsIG9yIHVzZSBzcGVjaWZpYyBNQ1AgdG9vbHMgaW5zdGVhZC5gXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlUZXh0RWRpdHMoXHJcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZyxcclxuICAgICAgICBlZGl0czogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IG9mZnNldDogbnVtYmVyOyBsZW5ndGg/OiBudW1iZXI7IHRleHQ/OiBzdHJpbmcgfT5cclxuICAgICk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKCFmaWxlUGF0aCB8fCAhZWRpdHMpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2ZpbGVQYXRoIGFuZCBlZGl0cyBhcmUgcmVxdWlyZWQgZm9yIGFwcGx5X3RleHRfZWRpdHMnIH07XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFJlc29sdmUgZGI6Ly8gcGF0aCB0byBmaWxlc3lzdGVtIHBhdGhcclxuICAgICAgICAgICAgbGV0IGZzUGF0aCA9IGZpbGVQYXRoO1xyXG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvdWxkIG5vdCByZXNvbHZlIHBhdGg6ICR7ZmlsZVBhdGh9YCB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZnNQYXRoID0gcmVzb2x2ZWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmc1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGaWxlIG5vdCBmb3VuZDogJHtmc1BhdGh9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XHJcblxyXG4gICAgICAgICAgICAvLyBTb3J0IGVkaXRzIGJ5IG9mZnNldCBkZXNjZW5kaW5nIHRvIHByZXNlcnZlIHBvc2l0aW9uc1xyXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWQgPSBbLi4uZWRpdHNdLnNvcnQoKGEsIGIpID0+IGIub2Zmc2V0IC0gYS5vZmZzZXQpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBlZGl0IG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChlZGl0LnR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnNlcnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdC50ZXh0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2luc2VydCBlZGl0IHJlcXVpcmVzIFwidGV4dFwiIGZpZWxkJyB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnNsaWNlKDAsIGVkaXQub2Zmc2V0KSArIGVkaXQudGV4dCArIGNvbnRlbnQuc2xpY2UoZWRpdC5vZmZzZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZWxldGUnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdC5sZW5ndGggPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnZGVsZXRlIGVkaXQgcmVxdWlyZXMgXCJsZW5ndGhcIiBmaWVsZCcgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5zbGljZSgwLCBlZGl0Lm9mZnNldCkgKyBjb250ZW50LnNsaWNlKGVkaXQub2Zmc2V0ICsgZWRpdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVkaXQubGVuZ3RoID09PSB1bmRlZmluZWQgfHwgZWRpdC50ZXh0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3JlcGxhY2UgZWRpdCByZXF1aXJlcyBcImxlbmd0aFwiIGFuZCBcInRleHRcIiBmaWVsZHMnIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQuc2xpY2UoMCwgZWRpdC5vZmZzZXQpICsgZWRpdC50ZXh0ICsgY29udGVudC5zbGljZShlZGl0Lm9mZnNldCArIGVkaXQubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBlZGl0IHR5cGU6ICR7ZWRpdC50eXBlfWAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmc1BhdGgsIGNvbnRlbnQsICd1dGY4Jyk7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWZyZXNoIGFzc2V0IGlmIGl0J3MgYSBkYjovLyBwYXRoXHJcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aC5zdGFydHNXaXRoKCdkYjovLycpKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlZnJlc2gtYXNzZXQnLCBmaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBCZXN0IGVmZm9ydFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBcHBsaWVkICR7ZWRpdHMubGVuZ3RofSBlZGl0cyB0byAke2ZpbGVQYXRofWAsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGVkaXRzQXBwbGllZDogZWRpdHMubGVuZ3RoLCBmaWxlU2l6ZTogY29udGVudC5sZW5ndGggfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kUmVmZXJlbmNlcyh0YXJnZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghdGFyZ2V0VXVpZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndGFyZ2V0VXVpZCBpcyByZXF1aXJlZCBmb3IgZmluZF9yZWZlcmVuY2VzJyB9O1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgIGlmICghdHJlZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgbG9hZGVkJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZWZlcmVuY2VzOiBBcnJheTx7XHJcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgbm9kZU5hbWU6IHN0cmluZztcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZztcclxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiBzdHJpbmc7XHJcbiAgICAgICAgICAgIH0+ID0gW107XHJcblxyXG4gICAgICAgICAgICBjb25zdCB3YWxrTm9kZSA9IGFzeW5jIChub2RlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBub2RlLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAuX190eXBlX18gfHwgJ1Vua25vd24nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb21wKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfXycpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5zVXVpZCh2YWx1ZSwgdGFyZ2V0VXVpZCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IGtleVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHdhbGtOb2RlKGNoaWxkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBhd2FpdCB3YWxrTm9kZSh0cmVlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB0YXJnZXRVdWlkLCByZWZlcmVuY2VzLCB0b3RhbFJlZmVyZW5jZXM6IHJlZmVyZW5jZXMubGVuZ3RoIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtyZWZlcmVuY2VzLmxlbmd0aH0gcmVmZXJlbmNlcyB0byAke3RhcmdldFV1aWR9YFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb250YWluc1V1aWQodmFsdWU6IGFueSwgdGFyZ2V0VXVpZDogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSByZXR1cm4gdmFsdWUgPT09IHRhcmdldFV1aWQ7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgaWYgKHZhbHVlLnV1aWQgPT09IHRhcmdldFV1aWQpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUuX191dWlkX18gPT09IHRhcmdldFV1aWQpIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zb21lKGl0ZW0gPT4gdGhpcy5jb250YWluc1V1aWQoaXRlbSwgdGFyZ2V0VXVpZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG4iXX0=