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
                    'execute_menu (trigger an editor menu action by path — WARNING: can fire destructive/irreversible commands such as File/Save Scene, Project/Build, scene reload, asset reimport. Confirm with the user before invoking any menu that mutates project state, opens dialogs, or saves files), ' +
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
                            description: 'Full menu path for execute_menu (e.g. "Project/Build", "File/Save Scene"). WARNING: many menu items mutate project state (saves, builds, reimports). Get explicit user approval before invoking destructive paths.'
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
            'File/Build': () => Editor.Message.request('builder', 'open', 'default'),
            'Project/Build': () => Editor.Message.request('builder', 'open', 'default'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2VkaXRvci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFFekIsTUFBYSxXQUFXO0lBQ3BCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUNQLG1EQUFtRDtvQkFDbkQsNlJBQTZSO29CQUM3UixrRUFBa0U7b0JBQ2xFLHFGQUFxRjtnQkFDekYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDOzRCQUM3RCxXQUFXLEVBQUUsOEJBQThCO3lCQUM5Qzt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG9OQUFvTjt5QkFDcE87d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtRUFBbUU7eUJBQ25GO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsT0FBTzs0QkFDYixXQUFXLEVBQUUsK0NBQStDOzRCQUM1RCxLQUFLLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsVUFBVSxFQUFFO29DQUNSLElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQzt3Q0FDckMsV0FBVyxFQUFFLFdBQVc7cUNBQzNCO29DQUNELE1BQU0sRUFBRTt3Q0FDSixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUs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RCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0NBQ0o7QUF4UEQsa0NBd1BDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgY2xhc3MgRWRpdG9yVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdlZGl0b3JfYWN0aW9ucycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdQZXJmb3JtIGVkaXRvci1sZXZlbCBhY3Rpb25zLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdleGVjdXRlX21lbnUgKHRyaWdnZXIgYW4gZWRpdG9yIG1lbnUgYWN0aW9uIGJ5IHBhdGgg4oCUIFdBUk5JTkc6IGNhbiBmaXJlIGRlc3RydWN0aXZlL2lycmV2ZXJzaWJsZSBjb21tYW5kcyBzdWNoIGFzIEZpbGUvU2F2ZSBTY2VuZSwgUHJvamVjdC9CdWlsZCwgc2NlbmUgcmVsb2FkLCBhc3NldCByZWltcG9ydC4gQ29uZmlybSB3aXRoIHRoZSB1c2VyIGJlZm9yZSBpbnZva2luZyBhbnkgbWVudSB0aGF0IG11dGF0ZXMgcHJvamVjdCBzdGF0ZSwgb3BlbnMgZGlhbG9ncywgb3Igc2F2ZXMgZmlsZXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2FwcGx5X3RleHRfZWRpdHMgKGFwcGx5IGluc2VydC9kZWxldGUvcmVwbGFjZSBlZGl0cyB0byBhIGZpbGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbmRfcmVmZXJlbmNlcyAoZmluZCBhbGwgcmVmZXJlbmNlcyB0byBhIG5vZGUgb3IgYXNzZXQgVVVJRCBpbiB0aGUgY3VycmVudCBzY2VuZSkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydleGVjdXRlX21lbnUnLCAnYXBwbHlfdGV4dF9lZGl0cycsICdmaW5kX3JlZmVyZW5jZXMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlZGl0b3IgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVudVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Z1bGwgbWVudSBwYXRoIGZvciBleGVjdXRlX21lbnUgKGUuZy4gXCJQcm9qZWN0L0J1aWxkXCIsIFwiRmlsZS9TYXZlIFNjZW5lXCIpLiBXQVJOSU5HOiBtYW55IG1lbnUgaXRlbXMgbXV0YXRlIHByb2plY3Qgc3RhdGUgKHNhdmVzLCBidWlsZHMsIHJlaW1wb3J0cykuIEdldCBleHBsaWNpdCB1c2VyIGFwcHJvdmFsIGJlZm9yZSBpbnZva2luZyBkZXN0cnVjdGl2ZSBwYXRocy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgcGF0aCBmb3IgYXBwbHlfdGV4dF9lZGl0cyAoZGI6Ly9hc3NldHMvLi4uIG9yIGFic29sdXRlIHBhdGgpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVkaXRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIGVkaXQgb3BlcmF0aW9ucyBmb3IgYXBwbHlfdGV4dF9lZGl0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2luc2VydCcsICdkZWxldGUnLCAncmVwbGFjZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRWRpdCB0eXBlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hhcmFjdGVyIG9mZnNldCBmb3IgaW5zZXJ0LCBvciBzdGFydCBvZmZzZXQgZm9yIGRlbGV0ZS9yZXBsYWNlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbmd0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGNoYXJhY3RlcnMgdG8gZGVsZXRlL3JlcGxhY2UgKHJlcXVpcmVkIGZvciBkZWxldGUvcmVwbGFjZSknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGV4dCB0byBpbnNlcnQgb3IgcmVwbGFjZW1lbnQgdGV4dCAocmVxdWlyZWQgZm9yIGluc2VydC9yZXBsYWNlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndHlwZScsICdvZmZzZXQnXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVVUlEIG9mIHRoZSBub2RlIG9yIGFzc2V0IGZvciBmaW5kX3JlZmVyZW5jZXMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfbWVudSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZU1lbnVJdGVtKGFyZ3MubWVudVBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnYXBwbHlfdGV4dF9lZGl0cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXBwbHlUZXh0RWRpdHMoYXJncy5maWxlUGF0aCwgYXJncy5lZGl0cyk7XG4gICAgICAgICAgICBjYXNlICdmaW5kX3JlZmVyZW5jZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmZpbmRSZWZlcmVuY2VzKGFyZ3MudGFyZ2V0VXVpZCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1lbnVJdGVtKG1lbnVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIW1lbnVQYXRoKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdtZW51UGF0aCBpcyByZXF1aXJlZCBmb3IgZXhlY3V0ZV9tZW51JyB9O1xuXG4gICAgICAgIC8vIE1hcCBjb21tb24gbWVudSBwYXRocyB0byB0aGVpciBhY3R1YWwgRWRpdG9yLk1lc3NhZ2UgZXF1aXZhbGVudHMgaW4gMy44LnhcbiAgICAgICAgY29uc3QgbWVudUFjdGlvbk1hcDogUmVjb3JkPHN0cmluZywgKCkgPT4gUHJvbWlzZTxhbnk+PiA9IHtcbiAgICAgICAgICAgICdGaWxlL1NhdmUgU2NlbmUnOiAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzYXZlLXNjZW5lJyksXG4gICAgICAgICAgICAnRmlsZS9CdWlsZCc6ICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicsICdkZWZhdWx0JyksXG4gICAgICAgICAgICAnUHJvamVjdC9CdWlsZCc6ICgpID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicsICdkZWZhdWx0JyksXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBhdGggPSBtZW51UGF0aC50cmltKCk7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG1lbnVBY3Rpb25NYXBbbm9ybWFsaXplZFBhdGhdO1xuXG4gICAgICAgIGlmIChhY3Rpb24pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgYWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE1lbnUgYWN0aW9uIGV4ZWN1dGVkOiAke21lbnVQYXRofWAgfTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGV4ZWN1dGUgbWVudSBhY3Rpb246ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IHRyeSBzZW5kaW5nIGFzIGEgZ2VuZXJpYyBlZGl0b3IgbWVzc2FnZVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnZWRpdG9yJywgJ2V4ZWN1dGUtbWVudScsIG5vcm1hbGl6ZWRQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBNZW51IGl0ZW0gZXhlY3V0ZWQ6ICR7bWVudVBhdGh9YCB9O1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBNZW51IHBhdGggXCIke21lbnVQYXRofVwiIGlzIG5vdCBzdXBwb3J0ZWQuIFVzZSBrbm93biBwYXRocyBsaWtlIFwiRmlsZS9TYXZlIFNjZW5lXCIgb3IgXCJQcm9qZWN0L0J1aWxkXCIsIG9yIHVzZSBzcGVjaWZpYyBNQ1AgdG9vbHMgaW5zdGVhZC5gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVRleHRFZGl0cyhcbiAgICAgICAgZmlsZVBhdGg6IHN0cmluZyxcbiAgICAgICAgZWRpdHM6IEFycmF5PHsgdHlwZTogc3RyaW5nOyBvZmZzZXQ6IG51bWJlcjsgbGVuZ3RoPzogbnVtYmVyOyB0ZXh0Pzogc3RyaW5nIH0+XG4gICAgKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFmaWxlUGF0aCB8fCAhZWRpdHMpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2ZpbGVQYXRoIGFuZCBlZGl0cyBhcmUgcmVxdWlyZWQgZm9yIGFwcGx5X3RleHRfZWRpdHMnIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgZGI6Ly8gcGF0aCB0byBmaWxlc3lzdGVtIHBhdGhcbiAgICAgICAgICAgIGxldCBmc1BhdGggPSBmaWxlUGF0aDtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aC5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghcmVzb2x2ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ291bGQgbm90IHJlc29sdmUgcGF0aDogJHtmaWxlUGF0aH1gIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZzUGF0aCA9IHJlc29sdmVkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZnNQYXRoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZpbGUgbm90IGZvdW5kOiAke2ZzUGF0aH1gIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZzUGF0aCwgJ3V0ZjgnKTtcblxuICAgICAgICAgICAgLy8gU29ydCBlZGl0cyBieSBvZmZzZXQgZGVzY2VuZGluZyB0byBwcmVzZXJ2ZSBwb3NpdGlvbnNcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5lZGl0c10uc29ydCgoYSwgYikgPT4gYi5vZmZzZXQgLSBhLm9mZnNldCk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgZWRpdCBvZiBzb3J0ZWQpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGVkaXQudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnNlcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVkaXQudGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnaW5zZXJ0IGVkaXQgcmVxdWlyZXMgXCJ0ZXh0XCIgZmllbGQnIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5zbGljZSgwLCBlZGl0Lm9mZnNldCkgKyBlZGl0LnRleHQgKyBjb250ZW50LnNsaWNlKGVkaXQub2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVkaXQubGVuZ3RoID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdkZWxldGUgZWRpdCByZXF1aXJlcyBcImxlbmd0aFwiIGZpZWxkJyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQuc2xpY2UoMCwgZWRpdC5vZmZzZXQpICsgY29udGVudC5zbGljZShlZGl0Lm9mZnNldCArIGVkaXQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZGl0Lmxlbmd0aCA9PT0gdW5kZWZpbmVkIHx8IGVkaXQudGV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAncmVwbGFjZSBlZGl0IHJlcXVpcmVzIFwibGVuZ3RoXCIgYW5kIFwidGV4dFwiIGZpZWxkcycgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnNsaWNlKDAsIGVkaXQub2Zmc2V0KSArIGVkaXQudGV4dCArIGNvbnRlbnQuc2xpY2UoZWRpdC5vZmZzZXQgKyBlZGl0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gZWRpdCB0eXBlOiAke2VkaXQudHlwZX1gIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGZzUGF0aCwgY29udGVudCwgJ3V0ZjgnKTtcblxuICAgICAgICAgICAgLy8gUmVmcmVzaCBhc3NldCBpZiBpdCdzIGEgZGI6Ly8gcGF0aFxuICAgICAgICAgICAgaWYgKGZpbGVQYXRoLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdyZWZyZXNoLWFzc2V0JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBCZXN0IGVmZm9ydFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBcHBsaWVkICR7ZWRpdHMubGVuZ3RofSBlZGl0cyB0byAke2ZpbGVQYXRofWAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBlZGl0c0FwcGxpZWQ6IGVkaXRzLmxlbmd0aCwgZmlsZVNpemU6IGNvbnRlbnQubGVuZ3RoIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZpbmRSZWZlcmVuY2VzKHRhcmdldFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghdGFyZ2V0VXVpZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndGFyZ2V0VXVpZCBpcyByZXF1aXJlZCBmb3IgZmluZF9yZWZlcmVuY2VzJyB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAoIXRyZWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSBsb2FkZWQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlZmVyZW5jZXM6IEFycmF5PHtcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogc3RyaW5nO1xuICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBzdHJpbmc7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogc3RyaW5nO1xuICAgICAgICAgICAgICAgIHByb3BlcnR5OiBzdHJpbmc7XG4gICAgICAgICAgICB9PiA9IFtdO1xuXG4gICAgICAgICAgICBjb25zdCB3YWxrTm9kZSA9IGFzeW5jIChub2RlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGUuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAuX190eXBlX18gfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoY29tcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ19fJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5zVXVpZCh2YWx1ZSwgdGFyZ2V0VXVpZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVmZXJlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToga2V5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgd2Fsa05vZGUoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYXdhaXQgd2Fsa05vZGUodHJlZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHRhcmdldFV1aWQsIHJlZmVyZW5jZXMsIHRvdGFsUmVmZXJlbmNlczogcmVmZXJlbmNlcy5sZW5ndGggfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtyZWZlcmVuY2VzLmxlbmd0aH0gcmVmZXJlbmNlcyB0byAke3RhcmdldFV1aWR9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY29udGFpbnNVdWlkKHZhbHVlOiBhbnksIHRhcmdldFV1aWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSByZXR1cm4gdmFsdWUgPT09IHRhcmdldFV1aWQ7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBpZiAodmFsdWUudXVpZCA9PT0gdGFyZ2V0VXVpZCkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBpZiAodmFsdWUuX191dWlkX18gPT09IHRhcmdldFV1aWQpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlLnNvbWUoaXRlbSA9PiB0aGlzLmNvbnRhaW5zVXVpZChpdGVtLCB0YXJnZXRVdWlkKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cbiJdfQ==