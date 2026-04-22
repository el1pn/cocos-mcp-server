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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2VkaXRvci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFFekIsTUFBYSxXQUFXO0lBQ3BCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUNQLG1EQUFtRDtvQkFDbkQsd0RBQXdEO29CQUN4RCxrRUFBa0U7b0JBQ2xFLHFGQUFxRjtnQkFDekYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDOzRCQUM3RCxXQUFXLEVBQUUsOEJBQThCO3lCQUM5Qzt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJFQUEyRTt5QkFDM0Y7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtRUFBbUU7eUJBQ25GO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsT0FBTzs0QkFDYixXQUFXLEVBQUUsK0NBQStDOzRCQUM1RCxLQUFLLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsVUFBVSxFQUFFO29DQUNSLElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQzt3Q0FDckMsV0FBVyxFQUFFLFdBQVc7cUNBQzNCO29DQUNELE1BQU0sRUFBRTt3Q0FDSixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUs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RCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0NBQ0o7QUF4UEQsa0NBd1BDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgY2xhc3MgRWRpdG9yVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdlZGl0b3JfYWN0aW9ucycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdQZXJmb3JtIGVkaXRvci1sZXZlbCBhY3Rpb25zLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdleGVjdXRlX21lbnUgKHRyaWdnZXIgYW4gZWRpdG9yIG1lbnUgYWN0aW9uIGJ5IHBhdGgpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2FwcGx5X3RleHRfZWRpdHMgKGFwcGx5IGluc2VydC9kZWxldGUvcmVwbGFjZSBlZGl0cyB0byBhIGZpbGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2ZpbmRfcmVmZXJlbmNlcyAoZmluZCBhbGwgcmVmZXJlbmNlcyB0byBhIG5vZGUgb3IgYXNzZXQgVVVJRCBpbiB0aGUgY3VycmVudCBzY2VuZSkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydleGVjdXRlX21lbnUnLCAnYXBwbHlfdGV4dF9lZGl0cycsICdmaW5kX3JlZmVyZW5jZXMnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBlZGl0b3IgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVudVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Z1bGwgbWVudSBwYXRoIGZvciBleGVjdXRlX21lbnUgKGUuZy4gXCJQcm9qZWN0L0J1aWxkXCIsIFwiRmlsZS9TYXZlIFNjZW5lXCIpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWxlIHBhdGggZm9yIGFwcGx5X3RleHRfZWRpdHMgKGRiOi8vYXNzZXRzLy4uLiBvciBhYnNvbHV0ZSBwYXRoKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBlZGl0IG9wZXJhdGlvbnMgZm9yIGFwcGx5X3RleHRfZWRpdHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydpbnNlcnQnLCAnZGVsZXRlJywgJ3JlcGxhY2UnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0VkaXQgdHlwZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoYXJhY3RlciBvZmZzZXQgZm9yIGluc2VydCwgb3Igc3RhcnQgb2Zmc2V0IGZvciBkZWxldGUvcmVwbGFjZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW5ndGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBjaGFyYWN0ZXJzIHRvIGRlbGV0ZS9yZXBsYWNlIChyZXF1aXJlZCBmb3IgZGVsZXRlL3JlcGxhY2UpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RleHQgdG8gaW5zZXJ0IG9yIHJlcGxhY2VtZW50IHRleHQgKHJlcXVpcmVkIGZvciBpbnNlcnQvcmVwbGFjZSknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3R5cGUnLCAnb2Zmc2V0J11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVVVJRCBvZiB0aGUgbm9kZSBvciBhc3NldCBmb3IgZmluZF9yZWZlcmVuY2VzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdleGVjdXRlX21lbnUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVNZW51SXRlbShhcmdzLm1lbnVQYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ2FwcGx5X3RleHRfZWRpdHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFwcGx5VGV4dEVkaXRzKGFyZ3MuZmlsZVBhdGgsIGFyZ3MuZWRpdHMpO1xuICAgICAgICAgICAgY2FzZSAnZmluZF9yZWZlcmVuY2VzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5maW5kUmVmZXJlbmNlcyhhcmdzLnRhcmdldFV1aWQpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNZW51SXRlbShtZW51UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFtZW51UGF0aCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbWVudVBhdGggaXMgcmVxdWlyZWQgZm9yIGV4ZWN1dGVfbWVudScgfTtcblxuICAgICAgICAvLyBNYXAgY29tbW9uIG1lbnUgcGF0aHMgdG8gdGhlaXIgYWN0dWFsIEVkaXRvci5NZXNzYWdlIGVxdWl2YWxlbnRzIGluIDMuOC54XG4gICAgICAgIGNvbnN0IG1lbnVBY3Rpb25NYXA6IFJlY29yZDxzdHJpbmcsICgpID0+IFByb21pc2U8YW55Pj4gPSB7XG4gICAgICAgICAgICAnRmlsZS9TYXZlIFNjZW5lJzogKCkgPT4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2F2ZS1zY2VuZScpLFxuICAgICAgICAgICAgJ0ZpbGUvQnVpbGQnOiAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdidWlsZGVyJywgJ29wZW4nLCAnZGVmYXVsdCcpLFxuICAgICAgICAgICAgJ1Byb2plY3QvQnVpbGQnOiAoKSA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdidWlsZGVyJywgJ29wZW4nLCAnZGVmYXVsdCcpLFxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRQYXRoID0gbWVudVBhdGgudHJpbSgpO1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBtZW51QWN0aW9uTWFwW25vcm1hbGl6ZWRQYXRoXTtcblxuICAgICAgICBpZiAoYWN0aW9uKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IGFjdGlvbigpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBNZW51IGFjdGlvbiBleGVjdXRlZDogJHttZW51UGF0aH1gIH07XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBleGVjdXRlIG1lbnUgYWN0aW9uOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiB0cnkgc2VuZGluZyBhcyBhIGdlbmVyaWMgZWRpdG9yIG1lc3NhZ2VcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2VkaXRvcicsICdleGVjdXRlLW1lbnUnLCBub3JtYWxpemVkUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTWVudSBpdGVtIGV4ZWN1dGVkOiAke21lbnVQYXRofWAgfTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgTWVudSBwYXRoIFwiJHttZW51UGF0aH1cIiBpcyBub3Qgc3VwcG9ydGVkLiBVc2Uga25vd24gcGF0aHMgbGlrZSBcIkZpbGUvU2F2ZSBTY2VuZVwiIG9yIFwiUHJvamVjdC9CdWlsZFwiLCBvciB1c2Ugc3BlY2lmaWMgTUNQIHRvb2xzIGluc3RlYWQuYFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlUZXh0RWRpdHMoXG4gICAgICAgIGZpbGVQYXRoOiBzdHJpbmcsXG4gICAgICAgIGVkaXRzOiBBcnJheTx7IHR5cGU6IHN0cmluZzsgb2Zmc2V0OiBudW1iZXI7IGxlbmd0aD86IG51bWJlcjsgdGV4dD86IHN0cmluZyB9PlxuICAgICk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghZmlsZVBhdGggfHwgIWVkaXRzKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdmaWxlUGF0aCBhbmQgZWRpdHMgYXJlIHJlcXVpcmVkIGZvciBhcHBseV90ZXh0X2VkaXRzJyB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBSZXNvbHZlIGRiOi8vIHBhdGggdG8gZmlsZXN5c3RlbSBwYXRoXG4gICAgICAgICAgICBsZXQgZnNQYXRoID0gZmlsZVBhdGg7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGguc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc29sdmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvdWxkIG5vdCByZXNvbHZlIHBhdGg6ICR7ZmlsZVBhdGh9YCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmc1BhdGggPSByZXNvbHZlZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZzUGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGaWxlIG5vdCBmb3VuZDogJHtmc1BhdGh9YCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XG5cbiAgICAgICAgICAgIC8vIFNvcnQgZWRpdHMgYnkgb2Zmc2V0IGRlc2NlbmRpbmcgdG8gcHJlc2VydmUgcG9zaXRpb25zXG4gICAgICAgICAgICBjb25zdCBzb3J0ZWQgPSBbLi4uZWRpdHNdLnNvcnQoKGEsIGIpID0+IGIub2Zmc2V0IC0gYS5vZmZzZXQpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVkaXQgb2Ygc29ydGVkKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChlZGl0LnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5zZXJ0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZGl0LnRleHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2luc2VydCBlZGl0IHJlcXVpcmVzIFwidGV4dFwiIGZpZWxkJyB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQuc2xpY2UoMCwgZWRpdC5vZmZzZXQpICsgZWRpdC50ZXh0ICsgY29udGVudC5zbGljZShlZGl0Lm9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZGl0Lmxlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnZGVsZXRlIGVkaXQgcmVxdWlyZXMgXCJsZW5ndGhcIiBmaWVsZCcgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBjb250ZW50LnNsaWNlKDAsIGVkaXQub2Zmc2V0KSArIGNvbnRlbnQuc2xpY2UoZWRpdC5vZmZzZXQgKyBlZGl0Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWRpdC5sZW5ndGggPT09IHVuZGVmaW5lZCB8fCBlZGl0LnRleHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3JlcGxhY2UgZWRpdCByZXF1aXJlcyBcImxlbmd0aFwiIGFuZCBcInRleHRcIiBmaWVsZHMnIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5zbGljZSgwLCBlZGl0Lm9mZnNldCkgKyBlZGl0LnRleHQgKyBjb250ZW50LnNsaWNlKGVkaXQub2Zmc2V0ICsgZWRpdC5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGVkaXQgdHlwZTogJHtlZGl0LnR5cGV9YCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmc1BhdGgsIGNvbnRlbnQsICd1dGY4Jyk7XG5cbiAgICAgICAgICAgIC8vIFJlZnJlc2ggYXNzZXQgaWYgaXQncyBhIGRiOi8vIHBhdGhcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aC5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmVzdCBlZmZvcnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXBwbGllZCAke2VkaXRzLmxlbmd0aH0gZWRpdHMgdG8gJHtmaWxlUGF0aH1gLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgZWRpdHNBcHBsaWVkOiBlZGl0cy5sZW5ndGgsIGZpbGVTaXplOiBjb250ZW50Lmxlbmd0aCB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kUmVmZXJlbmNlcyh0YXJnZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIXRhcmdldFV1aWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3RhcmdldFV1aWQgaXMgcmVxdWlyZWQgZm9yIGZpbmRfcmVmZXJlbmNlcycgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKCF0cmVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgbG9hZGVkJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZWZlcmVuY2VzOiBBcnJheTx7XG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHN0cmluZztcbiAgICAgICAgICAgICAgICBub2RlTmFtZTogc3RyaW5nO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZztcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogc3RyaW5nO1xuICAgICAgICAgICAgfT4gPSBbXTtcblxuICAgICAgICAgICAgY29uc3Qgd2Fsa05vZGUgPSBhc3luYyAobm9kZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBub2RlLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXApKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfXycpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb250YWluc1V1aWQodmFsdWUsIHRhcmdldFV1aWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IGtleVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHdhbGtOb2RlKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGF3YWl0IHdhbGtOb2RlKHRyZWUpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyB0YXJnZXRVdWlkLCByZWZlcmVuY2VzLCB0b3RhbFJlZmVyZW5jZXM6IHJlZmVyZW5jZXMubGVuZ3RoIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7cmVmZXJlbmNlcy5sZW5ndGh9IHJlZmVyZW5jZXMgdG8gJHt0YXJnZXRVdWlkfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbnRhaW5zVXVpZCh2YWx1ZTogYW55LCB0YXJnZXRVdWlkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCF2YWx1ZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykgcmV0dXJuIHZhbHVlID09PSB0YXJnZXRVdWlkO1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnV1aWQgPT09IHRhcmdldFV1aWQpIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgaWYgKHZhbHVlLl9fdXVpZF9fID09PSB0YXJnZXRVdWlkKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZS5zb21lKGl0ZW0gPT4gdGhpcy5jb250YWluc1V1aWQoaXRlbSwgdGFyZ2V0VXVpZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG4iXX0=