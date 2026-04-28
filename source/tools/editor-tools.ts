import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';

export class EditorTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'editor_actions',
                description:
                    'Perform editor-level actions. Available actions: ' +
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

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
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

    private async executeMenuItem(menuPath: string): Promise<ToolResponse> {
        if (!menuPath) return { success: false, error: 'menuPath is required for execute_menu' };

        // Map common menu paths to their actual Editor.Message equivalents in 3.8.x
        const menuActionMap: Record<string, () => Promise<any>> = {
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
            } catch (err: any) {
                return { success: false, error: `Failed to execute menu action: ${err.message}` };
            }
        }

        // Fallback: try sending as a generic editor message
        try {
            await Editor.Message.request('editor', 'execute-menu', normalizedPath);
            return { success: true, message: `Menu item executed: ${menuPath}` };
        } catch {
            return {
                success: false,
                error: `Menu path "${menuPath}" is not supported. Use known paths like "File/Save Scene" or "Project/Build", or use specific MCP tools instead.`
            };
        }
    }

    private async applyTextEdits(
        filePath: string,
        edits: Array<{ type: string; offset: number; length?: number; text?: string }>
    ): Promise<ToolResponse> {
        if (!filePath || !edits) return { success: false, error: 'filePath and edits are required for apply_text_edits' };

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
                } catch {
                    // Best effort
                }
            }

            return {
                success: true,
                message: `Applied ${edits.length} edits to ${filePath}`,
                data: { editsApplied: edits.length, fileSize: content.length }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async findReferences(targetUuid: string): Promise<ToolResponse> {
        if (!targetUuid) return { success: false, error: 'targetUuid is required for find_references' };

        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene loaded' };
            }

            const references: Array<{
                nodeUuid: string;
                nodeName: string;
                componentType: string;
                property: string;
            }> = [];

            const walkNode = async (node: any) => {
                if (node.__comps__) {
                    for (const comp of node.__comps__) {
                        const compType = comp.__type__ || 'Unknown';
                        for (const [key, value] of Object.entries(comp)) {
                            if (key.startsWith('__')) continue;
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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private containsUuid(value: any, targetUuid: string): boolean {
        if (!value) return false;
        if (typeof value === 'string') return value === targetUuid;
        if (typeof value === 'object') {
            if (value.uuid === targetUuid) return true;
            if (value.__uuid__ === targetUuid) return true;
            if (Array.isArray(value)) {
                return value.some(item => this.containsUuid(item, targetUuid));
            }
        }
        return false;
    }
}
