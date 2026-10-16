import { ToolDefinition, ToolResponse, ToolExecutor, ValidationResult, ValidationIssue } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { editorRequest, toolCall } from '../utils/editor-request';
import { resolveNodeRefFields } from '../utils/node-resolver';

// Editor.Logger (main process) records console output from every editor process,
// i.e. exactly what the Console panel shows.
function editorLogs(): any[] {
    return (Editor as any).Logger?.query?.() ?? [];
}

function slimLog(entry: any) {
    return {
        type: entry.type,
        message: entry.message,
        time: entry.time,
        ...(entry.type === 'error' && entry.stack ? { stack: entry.stack } : {})
    };
}

export class DebugTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'debug_console',
                description: 'Editor Console panel. Actions: get_logs, clear, execute_script (run JS; returns its result and the console output it produced).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_logs', 'clear', 'execute_script']
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of recent logs to retrieve (get_logs)',
                            default: 100
                        },
                        filter: {
                            type: 'string',
                            description: 'Filter logs by type (get_logs)',
                            enum: ['all', 'log', 'warn', 'error', 'info'],
                            default: 'all'
                        },
                        contains: {
                            type: 'string',
                            description: 'Only logs whose message contains this text (get_logs)'
                        },
                        since: {
                            type: 'number',
                            description: 'Cursor from a previous get_logs nextCursor; return only newer logs (get_logs)'
                        },
                        script: {
                            type: 'string',
                            description: 'JavaScript async function body; use return for a result (execute_script)'
                        },
                        context: {
                            type: 'string',
                            description: 'scene: renderer, `cc` in scope. editor: main process, `Editor`/`require` in scope (execute_script)',
                            enum: ['scene', 'editor'],
                            default: 'scene'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'debug_inspect',
                annotations: { readOnlyHint: true },
                description: 'Inspect/validate scene. Actions: get_node_tree, get_performance_stats, validate_scene, get_editor_info, probe_cce_api.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_node_tree', 'get_performance_stats', 'validate_scene', 'get_editor_info', 'probe_cce_api']
                        },
                        rootUuid: {
                            type: 'string',
                            description: 'Root node UUID (action: get_node_tree, optional, uses scene root if not provided)'
                        },
                        namespace: {
                            type: 'string',
                            description: 'Internal cce.<namespace> engine manager to list methods for, e.g. "Prefab", "Node", "Scene" (probe_cce_api, optional, default "Prefab")'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID to inspect for a live PrefabInfo link (probe_cce_api, optional)'
                        },
                        maxDepth: {
                            type: 'number',
                            description: 'Maximum tree depth (get_node_tree)',
                            default: 10
                        },
                        checkMissingAssets: {
                            type: 'boolean',
                            description: 'Check for missing asset references (validate_scene)',
                            default: true
                        },
                        checkMissingScripts: {
                            type: 'boolean',
                            description: 'Check for components whose script failed to load (surfaces as cc.MissingScript) (validate_scene)',
                            default: true
                        },
                        checkPerformance: {
                            type: 'boolean',
                            description: 'Check for performance issues (validate_scene)',
                            default: true
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'debug_logs',
                annotations: { readOnlyHint: true },
                description: 'Manage project log files (temp/logs/project.log). Actions: get_project_logs, get_log_file_info, search_logs.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_project_logs', 'get_log_file_info', 'search_logs']
                        },
                        lines: {
                            type: 'number',
                            description: 'Number of lines to read from the end of the log file (get_project_logs)',
                            default: 100,
                            minimum: 1,
                            maximum: 10000
                        },
                        filterKeyword: {
                            type: 'string',
                            description: 'Filter logs containing specific keyword (get_project_logs)'
                        },
                        logLevel: {
                            type: 'string',
                            description: 'Filter by log level (get_project_logs)',
                            enum: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'ALL'],
                            default: 'ALL'
                        },
                        pattern: {
                            type: 'string',
                            description: 'Search pattern, supports regex (search_logs)'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of matching results (search_logs)',
                            default: 20,
                            minimum: 1,
                            maximum: 100
                        },
                        contextLines: {
                            type: 'number',
                            description: 'Number of context lines to show around each match (search_logs)',
                            default: 2,
                            minimum: 0,
                            maximum: 10
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        // Both are scene-node references, so accept a path or a name too.
        const unresolved = await resolveNodeRefFields(args, ['nodeUuid', 'rootUuid']);
        if (unresolved) { return unresolved; }

        switch (toolName) {
            case 'debug_console': {
                const action = args.action;
                switch (action) {
                    case 'get_logs':
                        return this.getConsoleLogs(args.limit, args.filter, args.contains, args.since);
                    case 'clear':
                        return await this.clearConsole();
                    case 'execute_script':
                        return await this.executeScript(args.script, args.context);
                    default:
                        return { success: false, error: `Unknown action '${action}'. Valid actions: get_logs, clear, execute_script` };
                }
            }
            case 'debug_inspect':
                switch (args.action) {
                    case 'get_node_tree':
                        return await this.getNodeTree(args.rootUuid, args.maxDepth);
                    case 'get_performance_stats':
                        return await this.getPerformanceStats();
                    case 'validate_scene':
                        return await this.validateScene(args);
                    case 'get_editor_info':
                        return await this.getEditorInfo();
                    case 'probe_cce_api':
                        return await this.probeCceApi(args.namespace, args.nodeUuid);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            case 'debug_logs':
                switch (args.action) {
                    case 'get_project_logs':
                        return await this.getProjectLogs(args.lines, args.filterKeyword, args.logLevel);
                    case 'get_log_file_info':
                        return await this.getLogFileInfo();
                    case 'search_logs':
                        return await this.searchProjectLogs(args.pattern, args.maxResults, args.contextLines);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private getConsoleLogs(limit: number = 100, filter: string = 'all', contains?: string, since?: number): ToolResponse {
        const all = editorLogs();
        // The cursor is an index into the editor's log array; a clear shrinks it, so restart from 0.
        const start = typeof since === 'number' && since >= 0 && since <= all.length ? since : 0;
        let logs = all.slice(start);
        if (filter !== 'all') {
            logs = logs.filter(log => log.type === filter);
        }
        if (contains) {
            logs = logs.filter(log => String(log.message).includes(contains));
        }
        const recentLogs = logs.slice(-limit);

        return {
            success: true,
            data: {
                total: logs.length,
                returned: recentLogs.length,
                nextCursor: all.length,
                logs: recentLogs.map(slimLog)
            }
        };
    }

    private async clearConsole(): Promise<ToolResponse> {
        try {
            // Logger.clear also empties the Console panel.
            (Editor as any).Logger.clear();
            return { success: true, message: 'Console cleared successfully' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async executeScript(script: string, context: string = 'scene'): Promise<ToolResponse> {
        if (!script) {
            return { success: false, error: 'script is required' };
        }
        if (context !== 'scene' && context !== 'editor') {
            return { success: false, error: `Unknown context '${context}'. Valid contexts: scene, editor` };
        }
        const before = editorLogs().length;
        // Logs from the scene process reach Editor.Logger over IPC, slightly after the call returns.
        const consoleOutput = async () => {
            if (context === 'scene') { await new Promise(r => setTimeout(r, 50)); }
            return editorLogs().slice(before).slice(-50).map(slimLog);
        };

        if (context === 'editor') {
            try {
                const AsyncFunction = Object.getPrototypeOf(async function () { /* noop */ }).constructor;
                const result = await new AsyncFunction('Editor', 'require', script)(Editor, require);
                let safe = result;
                try { JSON.stringify(result); } catch { safe = String(result); }
                return { success: true, data: { result: safe, console: await consoleOutput() } };
            } catch (err: any) {
                return { success: false, error: err?.message || String(err), data: { console: await consoleOutput() } };
            }
        }

        // Runs in this extension's own scene script — the built-in `console` scene
        // script it used to target does not exist in 3.8.x.
        const response = await toolCall(
            () => editorRequest<any>('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'evalScript',
                args: [script]
            }),
            (result) => (result?.success
                ? { data: { result: result.data?.result } }
                : { success: false, error: result?.error || 'Script execution failed' })
        );
        return { ...response, data: { ...response.data, console: await consoleOutput() } };
    }

    private async probeCceApi(namespace?: string, nodeUuid?: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'probeCceApi',
                args: [namespace, nodeUuid]
            }),
            (result: any) => ({
                data: result?.data ?? result,
                message: 'cce API probe complete'
            })
        );
    }

    private async getNodeTree(rootUuid?: string, maxDepth: number = 10): Promise<ToolResponse> {
        const buildTree = async (nodeUuid: string, depth: number = 0): Promise<any> => {
            if (depth >= maxDepth) {
                return { truncated: true };
            }

            try {
                const nodeData = await editorRequest<any>('scene', 'query-node', nodeUuid);

                const tree = {
                    uuid: nodeData.uuid,
                    name: nodeData.name,
                    active: nodeData.active,
                    components: (nodeData as any).components ? (nodeData as any).components.map((c: any) => c.__type__) : [],
                    childCount: nodeData.children ? nodeData.children.length : 0,
                    children: [] as any[]
                };

                if (nodeData.children && nodeData.children.length > 0) {
                    for (const childId of nodeData.children) {
                        const childTree = await buildTree(childId, depth + 1);
                        tree.children.push(childTree);
                    }
                }

                return tree;
            } catch (err: any) {
                return { error: err.message };
            }
        };

        if (rootUuid) {
            const tree = await buildTree(rootUuid);
            return { success: true, data: tree };
        }

        try {
            const hierarchy: any = await editorRequest('scene', 'query-node-tree');
            const roots = Array.isArray(hierarchy) ? hierarchy : (hierarchy?.children || []);
            const trees = [];
            for (const rootNode of roots) {
                const tree = await buildTree(rootNode.uuid);
                trees.push(tree);
            }
            return { success: true, data: trees };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getPerformanceStats(): Promise<ToolResponse> {
        // Cocos 3.8.x does not expose a scene performance query in the editor.
        // Return a stub so the tool does not throw "Message does not exist".
        return {
            success: true,
            data: {
                message: 'Performance stats not available in editor (no public API in Cocos 3.8.x)'
            }
        };
    }

    private async validateScene(options: any): Promise<ToolResponse> {
        const issues: ValidationIssue[] = [];

        try {
            // Check for missing assets
            if (options.checkMissingAssets) {
                const missing: any = await editorRequest('scene', 'query-nodes-miss-assets');
                const missingList = Array.isArray(missing) ? missing : (missing?.missing || []);
                if (missingList.length) {
                    issues.push({
                        type: 'error',
                        category: 'assets',
                        message: `Found ${missingList.length} missing asset references`,
                        details: missingList
                    });
                }
            }

            // Check for performance issues
            if (options.checkPerformance) {
                const hierarchy: any = await editorRequest('scene', 'query-node-tree');
                const roots = Array.isArray(hierarchy) ? hierarchy : (hierarchy?.children || []);
                const nodeCount = this.countNodes(roots);

                if (nodeCount > 1000) {
                    issues.push({
                        type: 'warning',
                        category: 'performance',
                        message: `High node count: ${nodeCount} nodes (recommended < 1000)`,
                        suggestion: 'Consider using object pooling or scene optimization'
                    });
                }
            }

            // Check for components whose script failed to load (renamed/deleted/compile error).
            // The engine swaps such a component's runtime class to cc.MissingScript (cid 'cc.MissingScript').
            if (options.checkMissingScripts) {
                const missingScripts = await this.findMissingScriptComponents();
                if (missingScripts.length) {
                    issues.push({
                        type: 'error',
                        category: 'scripts',
                        message: `Found ${missingScripts.length} component(s) with missing script`,
                        details: missingScripts,
                        suggestion: 'The original script asset was deleted, renamed, or failed to compile. Re-add the script or remove the component.'
                    });
                }
            }

            const result: ValidationResult = {
                valid: issues.length === 0,
                issueCount: issues.length,
                issues: issues
            };

            return { success: true, data: result };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private countNodes(nodes: any[]): number {
        let count = nodes.length;
        for (const node of nodes) {
            if (node.children) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }

    private async findMissingScriptComponents(): Promise<Array<{ nodeUuid: string; nodeName: string; componentIndex: number }>> {
        const nodeTree = await editorRequest('scene', 'query-node-tree');
        if (!nodeTree) return [];

        const nodeUuids: string[] = [];
        const queue: any[] = [nodeTree];
        while (queue.length > 0) {
            const node = queue.shift();
            if (node?.uuid) nodeUuids.push(node.uuid);
            if (node?.children) queue.push(...node.children);
        }

        const results: Array<{ nodeUuid: string; nodeName: string; componentIndex: number }> = [];
        const BATCH = 10;
        for (let i = 0; i < nodeUuids.length; i += BATCH) {
            const batch = nodeUuids.slice(i, i + BATCH);
            const nodeDatas = await Promise.all(
                batch.map(uuid => editorRequest('scene', 'query-node', uuid).catch(() => null))
            );
            for (let j = 0; j < nodeDatas.length; j++) {
                const nodeData = nodeDatas[j] as any;
                if (!nodeData?.__comps__) continue;
                const nodeUuid = batch[j];
                const nodeName = nodeData.name?.value ?? nodeData.name ?? nodeUuid;
                nodeData.__comps__.forEach((comp: any, index: number) => {
                    const compType = comp?.__type__ || comp?.cid || comp?.type;
                    if (compType === 'cc.MissingScript') {
                        results.push({ nodeUuid, nodeName: String(nodeName), componentIndex: index });
                    }
                });
            }
        }

        return results;
    }

    private async getEditorInfo(): Promise<ToolResponse> {
        const info = {
            editor: {
                // `Editor.versions` does not exist; the version lives on Editor.App.
                version: (Editor as any).App?.version || 'Unknown',
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version
            },
            project: {
                name: Editor.Project.name,
                path: Editor.Project.path,
                uuid: Editor.Project.uuid
            },
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };

        return { success: true, data: info };
    }

    private async getProjectLogs(lines: number = 100, filterKeyword?: string, logLevel: string = 'ALL'): Promise<ToolResponse> {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);

            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }

            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }

            // Read the file content
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim() !== '');

            // Get the last N lines
            const recentLines = logLines.slice(-lines);

            // Apply filters
            let filteredLines = recentLines;

            // Filter by log level if not 'ALL'. Editor lines read "<date> <time> - <level>: ...";
            // match that marker only, so a level word inside a message body doesn't count.
            if (logLevel !== 'ALL') {
                const marker = ` - ${logLevel.toLowerCase()}:`;
                filteredLines = filteredLines.filter(line => line.includes(marker));
            }

            // Filter by keyword if provided
            if (filterKeyword) {
                filteredLines = filteredLines.filter(line =>
                    line.toLowerCase().includes(filterKeyword.toLowerCase())
                );
            }

            return {
                success: true,
                data: {
                    totalLines: logLines.length,
                    requestedLines: lines,
                    filteredLines: filteredLines.length,
                    logLevel: logLevel,
                    filterKeyword: filterKeyword || null,
                    logs: filteredLines,
                    logFilePath: logFilePath
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to read project logs: ${error.message}`
            };
        }
    }

    private async getLogFileInfo(): Promise<ToolResponse> {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);

            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }

            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }

            const stats = fs.statSync(logFilePath);
            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const lineCount = logContent.split('\n').filter(line => line.trim() !== '').length;

            return {
                success: true,
                data: {
                    filePath: logFilePath,
                    fileSize: stats.size,
                    fileSizeFormatted: this.formatFileSize(stats.size),
                    lastModified: stats.mtime.toISOString(),
                    lineCount: lineCount,
                    created: stats.birthtime.toISOString(),
                    accessible: fs.constants.R_OK
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to get log file info: ${error.message}`
            };
        }
    }

    private async searchProjectLogs(pattern: string, maxResults: number = 20, contextLines: number = 2): Promise<ToolResponse> {
        try {
            // Try multiple possible project paths
            let logFilePath = '';
            const possiblePaths = [
                Editor.Project ? Editor.Project.path : null,
                '/Users/lizhiyong/NewProject_3',
                process.cwd(),
            ].filter(p => p !== null);

            for (const basePath of possiblePaths) {
                const testPath = path.join(basePath, 'temp/logs/project.log');
                if (fs.existsSync(testPath)) {
                    logFilePath = testPath;
                    break;
                }
            }

            if (!logFilePath) {
                return {
                    success: false,
                    error: `Project log file not found. Tried paths: ${possiblePaths.map(p => path.join(p, 'temp/logs/project.log')).join(', ')}`
                };
            }

            const logContent = fs.readFileSync(logFilePath, 'utf8');
            const logLines = logContent.split('\n');

            // Create regex pattern (support both string and regex patterns)
            // No 'g' flag: test() is per line, so no lastIndex to manage.
            let regex: RegExp;
            try {
                regex = new RegExp(pattern, 'i');
            } catch (e: any) {
                return { success: false, error: `Invalid regex pattern: ${e.message}. Matching is already case-insensitive; inline flags like (?i) are not supported.` };
            }

            const matches: any[] = [];
            let resultCount = 0;

            for (let i = 0; i < logLines.length && resultCount < maxResults; i++) {
                const line = logLines[i];
                if (regex.test(line)) {
                    // Get context lines
                    const contextStart = Math.max(0, i - contextLines);
                    const contextEnd = Math.min(logLines.length - 1, i + contextLines);

                    const contextLinesArray = [];
                    for (let j = contextStart; j <= contextEnd; j++) {
                        contextLinesArray.push({
                            lineNumber: j + 1,
                            content: logLines[j],
                            isMatch: j === i
                        });
                    }

                    matches.push({
                        lineNumber: i + 1,
                        matchedLine: line,
                        context: contextLinesArray
                    });

                    resultCount++;
                }
            }

            return {
                success: true,
                data: {
                    pattern: pattern,
                    totalMatches: matches.length,
                    maxResults: maxResults,
                    contextLines: contextLines,
                    logFilePath: logFilePath,
                    matches: matches
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to search project logs: ${error.message}`
            };
        }
    }

    private formatFileSize(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}
