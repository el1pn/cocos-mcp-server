import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class SearchTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'search_project',
                description:
                    'Search files in the Cocos Creator project. Available actions: ' +
                    'content (search file contents by text or regex), ' +
                    'file_name (find files by name pattern), ' +
                    'dir_name (find directories by name pattern).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['content', 'file_name', 'dir_name'],
                            description: 'Search mode'
                        },
                        query: {
                            type: 'string',
                            description: 'Search query (text or regex pattern)'
                        },
                        path: {
                            type: 'string',
                            description: 'Directory path to search in (default: db://assets)',
                            default: 'db://assets'
                        },
                        useRegex: {
                            type: 'boolean',
                            description: 'Treat query as regex (default: false)',
                            default: false
                        },
                        extensions: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include (e.g. [".ts", ".js"]). Default: common code/data extensions.'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum results to return (default: 50)',
                            default: 50
                        }
                    },
                    required: ['action', 'query']
                }
            }
        ];
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        switch (args.action) {
            case 'content':
                return await this.searchContent(args);
            case 'file_name':
                return await this.searchFileName(args);
            case 'dir_name':
                return await this.searchDirName(args);
            default:
                return { success: false, error: `Unknown action: ${args.action}` };
        }
    }

    private getProjectPath(): string {
        return Editor.Project.path;
    }

    private resolveSearchPath(dbPath?: string): string {
        const projectPath = this.getProjectPath();
        if (!dbPath || dbPath === 'db://assets') {
            return path.join(projectPath, 'assets');
        }
        return path.join(projectPath, dbPath.replace('db://', ''));
    }

    private getDefaultExtensions(): string[] {
        return ['.ts', '.js', '.json', '.scene', '.prefab', '.anim', '.effect', '.mtl'];
    }

    private async searchContent(args: any): Promise<ToolResponse> {
        const searchPath = this.resolveSearchPath(args.path);
        const extensions = args.extensions || this.getDefaultExtensions();
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;

        let regex: RegExp;
        try {
            regex = useRegex ? new RegExp(args.query, 'gi') : new RegExp(this.escapeRegex(args.query), 'gi');
        } catch (e: any) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }

        const results: Array<{ file: string; line: number; content: string }> = [];

        const walk = (dir: string) => {
            if (results.length >= maxResults) return;
            if (!fs.existsSync(dir)) return;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults) break;
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                    walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!extensions.includes(ext)) continue;

                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (results.length >= maxResults) break;
                            if (regex.test(lines[i])) {
                                regex.lastIndex = 0;
                                results.push({
                                    file: fullPath.replace(this.getProjectPath() + '/', 'db://'),
                                    line: i + 1,
                                    content: lines[i].trim().substring(0, 200)
                                });
                            }
                        }
                    } catch {
                        // Skip binary or unreadable files
                    }
                }
            }
        };

        walk(searchPath);

        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }

    private async searchFileName(args: any): Promise<ToolResponse> {
        const searchPath = this.resolveSearchPath(args.path);
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;

        let regex: RegExp;
        try {
            regex = useRegex ? new RegExp(args.query, 'i') : new RegExp(this.escapeRegex(args.query), 'i');
        } catch (e: any) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }

        const results: string[] = [];

        const walk = (dir: string) => {
            if (results.length >= maxResults) return;
            if (!fs.existsSync(dir)) return;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults) break;
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                    walk(fullPath);
                } else if (entry.isFile() && regex.test(entry.name)) {
                    results.push(fullPath.replace(this.getProjectPath() + '/', 'db://'));
                }
            }
        };

        walk(searchPath);

        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }

    private async searchDirName(args: any): Promise<ToolResponse> {
        const searchPath = this.resolveSearchPath(args.path);
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;

        let regex: RegExp;
        try {
            regex = useRegex ? new RegExp(args.query, 'i') : new RegExp(this.escapeRegex(args.query), 'i');
        } catch (e: any) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }

        const results: string[] = [];

        const walk = (dir: string) => {
            if (results.length >= maxResults) return;
            if (!fs.existsSync(dir)) return;

            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults) break;
                if (!entry.isDirectory()) continue;
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

                const fullPath = path.join(dir, entry.name);
                if (regex.test(entry.name)) {
                    results.push(fullPath.replace(this.getProjectPath() + '/', 'db://'));
                }
                walk(fullPath);
            }
        };

        walk(searchPath);

        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
