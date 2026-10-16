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
exports.DebugTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
// Editor.Logger (main process) records console output from every editor process,
// i.e. exactly what the Console panel shows.
function editorLogs() {
    var _a, _b, _c;
    return (_c = (_b = (_a = Editor.Logger) === null || _a === void 0 ? void 0 : _a.query) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
}
function slimLog(entry) {
    return Object.assign({ type: entry.type, message: entry.message, time: entry.time }, (entry.type === 'error' && entry.stack ? { stack: entry.stack } : {}));
}
class DebugTools {
    getTools() {
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
                description: 'Inspect/validate scene. Actions: get_node_tree, get_performance_stats, validate_scene, get_editor_info, probe_cce_api, check_scripts (tsc type errors in project scripts).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_node_tree', 'get_performance_stats', 'validate_scene', 'get_editor_info', 'probe_cce_api', 'check_scripts']
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Max diagnostics to return (check_scripts)',
                            default: 50
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
    async execute(toolName, args) {
        // Both are scene-node references, so accept a path or a name too.
        const unresolved = await (0, node_resolver_1.resolveNodeRefFields)(args, ['nodeUuid', 'rootUuid']);
        if (unresolved) {
            return unresolved;
        }
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
                    case 'check_scripts':
                        return await this.checkScripts(args.maxResults);
                    default:
                        return { success: false, error: `Unknown action '${args.action}'. Valid actions: get_node_tree, get_performance_stats, validate_scene, get_editor_info, probe_cce_api, check_scripts` };
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
    getConsoleLogs(limit = 100, filter = 'all', contains, since) {
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
    async clearConsole() {
        try {
            // Logger.clear also empties the Console panel.
            Editor.Logger.clear();
            return { success: true, message: 'Console cleared successfully' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeScript(script, context = 'scene') {
        if (!script) {
            return { success: false, error: 'script is required' };
        }
        if (context !== 'scene' && context !== 'editor') {
            return { success: false, error: `Unknown context '${context}'. Valid contexts: scene, editor` };
        }
        const before = editorLogs().length;
        // Logs from the scene process reach Editor.Logger over IPC, slightly after the call returns.
        const consoleOutput = async () => {
            if (context === 'scene') {
                await new Promise(r => setTimeout(r, 50));
            }
            return editorLogs().slice(before).slice(-50).map(slimLog);
        };
        if (context === 'editor') {
            try {
                const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                const result = await new AsyncFunction('Editor', 'require', script)(Editor, require);
                let safe = result;
                try {
                    JSON.stringify(result);
                }
                catch (_a) {
                    safe = String(result);
                }
                return { success: true, data: { result: safe, console: await consoleOutput() } };
            }
            catch (err) {
                return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err), data: { console: await consoleOutput() } };
            }
        }
        // Runs in this extension's own scene script — the built-in `console` scene
        // script it used to target does not exist in 3.8.x.
        const response = await (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'evalScript',
            args: [script]
        }), (result) => {
            var _a;
            return ((result === null || result === void 0 ? void 0 : result.success)
                ? { data: { result: (_a = result.data) === null || _a === void 0 ? void 0 : _a.result } }
                : { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Script execution failed' });
        });
        return Object.assign(Object.assign({}, response), { data: Object.assign(Object.assign({}, response.data), { console: await consoleOutput() }) });
    }
    async probeCceApi(namespace, nodeUuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'probeCceApi',
            args: [namespace, nodeUuid]
        }), (result) => {
            var _a;
            return ({
                data: (_a = result === null || result === void 0 ? void 0 : result.data) !== null && _a !== void 0 ? _a : result,
                message: 'cce API probe complete'
            });
        });
    }
    async getNodeTree(rootUuid, maxDepth = 10) {
        const buildTree = async (nodeUuid, depth = 0) => {
            if (depth >= maxDepth) {
                return { truncated: true };
            }
            try {
                const nodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', nodeUuid);
                const tree = {
                    uuid: nodeData.uuid,
                    name: nodeData.name,
                    active: nodeData.active,
                    components: nodeData.components ? nodeData.components.map((c) => c.__type__) : [],
                    childCount: nodeData.children ? nodeData.children.length : 0,
                    children: []
                };
                if (nodeData.children && nodeData.children.length > 0) {
                    for (const childId of nodeData.children) {
                        const childTree = await buildTree(childId, depth + 1);
                        tree.children.push(childTree);
                    }
                }
                return tree;
            }
            catch (err) {
                return { error: err.message };
            }
        };
        if (rootUuid) {
            const tree = await buildTree(rootUuid);
            return { success: true, data: tree };
        }
        try {
            const hierarchy = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
            const roots = Array.isArray(hierarchy) ? hierarchy : ((hierarchy === null || hierarchy === void 0 ? void 0 : hierarchy.children) || []);
            const trees = [];
            for (const rootNode of roots) {
                const tree = await buildTree(rootNode.uuid);
                trees.push(tree);
            }
            return { success: true, data: trees };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getPerformanceStats() {
        // Cocos 3.8.x does not expose a scene performance query in the editor.
        // Return a stub so the tool does not throw "Message does not exist".
        return {
            success: true,
            data: {
                message: 'Performance stats not available in editor (no public API in Cocos 3.8.x)'
            }
        };
    }
    async validateScene(options) {
        const issues = [];
        try {
            // Check for missing assets
            if (options.checkMissingAssets) {
                const missing = await (0, editor_request_1.editorRequest)('scene', 'query-nodes-miss-assets');
                const missingList = Array.isArray(missing) ? missing : ((missing === null || missing === void 0 ? void 0 : missing.missing) || []);
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
                const hierarchy = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
                const roots = Array.isArray(hierarchy) ? hierarchy : ((hierarchy === null || hierarchy === void 0 ? void 0 : hierarchy.children) || []);
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
            const result = {
                valid: issues.length === 0,
                issueCount: issues.length,
                issues: issues
            };
            return { success: true, data: result };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    countNodes(nodes) {
        let count = nodes.length;
        for (const node of nodes) {
            if (node.children) {
                count += this.countNodes(node.children);
            }
        }
        return count;
    }
    async findMissingScriptComponents() {
        var _a, _b, _c;
        const nodeTree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
        if (!nodeTree)
            return [];
        const nodeUuids = [];
        const queue = [nodeTree];
        while (queue.length > 0) {
            const node = queue.shift();
            if (node === null || node === void 0 ? void 0 : node.uuid)
                nodeUuids.push(node.uuid);
            if (node === null || node === void 0 ? void 0 : node.children)
                queue.push(...node.children);
        }
        const results = [];
        const BATCH = 10;
        for (let i = 0; i < nodeUuids.length; i += BATCH) {
            const batch = nodeUuids.slice(i, i + BATCH);
            const nodeDatas = await Promise.all(batch.map(uuid => (0, editor_request_1.editorRequest)('scene', 'query-node', uuid).catch(() => null)));
            for (let j = 0; j < nodeDatas.length; j++) {
                const nodeData = nodeDatas[j];
                if (!(nodeData === null || nodeData === void 0 ? void 0 : nodeData.__comps__))
                    continue;
                const nodeUuid = batch[j];
                const nodeName = (_c = (_b = (_a = nodeData.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : nodeData.name) !== null && _c !== void 0 ? _c : nodeUuid;
                nodeData.__comps__.forEach((comp, index) => {
                    const compType = (comp === null || comp === void 0 ? void 0 : comp.__type__) || (comp === null || comp === void 0 ? void 0 : comp.cid) || (comp === null || comp === void 0 ? void 0 : comp.type);
                    if (compType === 'cc.MissingScript') {
                        results.push({ nodeUuid, nodeName: String(nodeName), componentIndex: index });
                    }
                });
            }
        }
        return results;
    }
    // Type errors the editor's own compile (which strips types) never reports.
    async checkScripts(maxResults = 50) {
        const projectPath = Editor.Project.path;
        const tsconfig = path.join(projectPath, 'tsconfig.json');
        if (!fs.existsSync(tsconfig)) {
            return { success: false, error: `No tsconfig.json in ${projectPath}` };
        }
        // Prefer the project's own TypeScript, else the copy bundled with the editor.
        const tsc = [
            path.join(projectPath, 'node_modules', 'typescript', 'bin', 'tsc'),
            path.join(`${Editor.App.path}.unpacked`, 'node_modules', 'typescript', 'bin', 'tsc')
        ].find(p => fs.existsSync(p));
        if (!tsc) {
            return { success: false, error: 'TypeScript compiler not found in the project or the editor' };
        }
        const run = (extra) => new Promise(resolve => {
            // ELECTRON_RUN_AS_NODE makes the editor binary behave as plain Node.
            (0, child_process_1.execFile)(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '-p', tsconfig, ...extra], {
                cwd: projectPath,
                env: Object.assign(Object.assign({}, process.env), { ELECTRON_RUN_AS_NODE: '1' }),
                maxBuffer: 32 * 1024 * 1024,
                timeout: 180000
            }, (err, stdout, stderr) => resolve({ code: err ? (typeof err.code === 'number' ? err.code : -1) : 0, out: `${stdout}${stderr}` }));
        });
        let { code, out } = await run([]);
        // A tsconfig written for a newer TypeScript (e.g. ignoreDeprecations "6.0") fails before checking anything.
        if (/error TS5103:.*ignoreDeprecations/.test(out)) {
            ({ code, out } = await run(['--ignoreDeprecations', '5.0']));
        }
        const re = /^(.+?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.*)$/;
        const diagnostics = out.split('\n').map(l => re.exec(l.trim())).filter(Boolean)
            .map(m => ({ file: m[1], line: Number(m[2]), column: Number(m[3]), severity: m[4], code: m[5], message: m[6] }));
        if (code !== 0 && diagnostics.length === 0) {
            return { success: false, error: `tsc exited ${code}: ${out.slice(0, 2000)}` };
        }
        return {
            success: true,
            data: {
                compiler: tsc,
                errorCount: diagnostics.length,
                returned: Math.min(diagnostics.length, maxResults),
                diagnostics: diagnostics.slice(0, maxResults)
            }
        };
    }
    async getEditorInfo() {
        var _a;
        const info = {
            editor: {
                // `Editor.versions` does not exist; the version lives on Editor.App.
                version: ((_a = Editor.App) === null || _a === void 0 ? void 0 : _a.version) || 'Unknown',
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
    async getProjectLogs(lines = 100, filterKeyword, logLevel = 'ALL') {
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
                filteredLines = filteredLines.filter(line => line.toLowerCase().includes(filterKeyword.toLowerCase()));
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to read project logs: ${error.message}`
            };
        }
    }
    async getLogFileInfo() {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get log file info: ${error.message}`
            };
        }
    }
    async searchProjectLogs(pattern, maxResults = 20, contextLines = 2) {
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
            let regex;
            try {
                regex = new RegExp(pattern, 'i');
            }
            catch (e) {
                return { success: false, error: `Invalid regex pattern: ${e.message}. Matching is already case-insensitive; inline flags like (?i) are not supported.` };
            }
            const matches = [];
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search project logs: ${error.message}`
            };
        }
    }
    formatFileSize(bytes) {
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
exports.DebugTools = DebugTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixpREFBeUM7QUFDekMsNERBQWtFO0FBQ2xFLDBEQUE4RDtBQUU5RCxpRkFBaUY7QUFDakYsNkNBQTZDO0FBQzdDLFNBQVMsVUFBVTs7SUFDZixPQUFPLE1BQUEsTUFBQSxNQUFDLE1BQWMsQ0FBQyxNQUFNLDBDQUFFLEtBQUssa0RBQUksbUNBQUksRUFBRSxDQUFDO0FBQ25ELENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFVO0lBQ3ZCLHVCQUNJLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUNoQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFDdEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQ2IsQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUMxRTtBQUNOLENBQUM7QUFFRCxNQUFhLFVBQVU7SUFDbkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUFFLGlJQUFpSTtnQkFDOUksV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1CQUFtQjs0QkFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQzt5QkFDaEQ7d0JBQ0QsS0FBSyxFQUFFOzRC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QU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLGtDQUFrQyxLQUFLLENBQUMsT0FBTyxFQUFFO2FBQzNELENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVPLGNBQWMsQ0FBQyxLQUFhO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdEMsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDO1FBQ2pCLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztRQUVsQixPQUFPLElBQUksSUFBSSxJQUFJLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEQsSUFBSSxJQUFJLElBQUksQ0FBQztZQUNiLFNBQVMsRUFBRSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztJQUNwRCxDQUFDO0NBQ0o7QUF6dUJELGdDQXl1QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFZhbGlkYXRpb25SZXN1bHQsIFZhbGlkYXRpb25Jc3N1ZSB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleGVjRmlsZSB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyByZXNvbHZlTm9kZVJlZkZpZWxkcyB9IGZyb20gJy4uL3V0aWxzL25vZGUtcmVzb2x2ZXInO1xuXG4vLyBFZGl0b3IuTG9nZ2VyIChtYWluIHByb2Nlc3MpIHJlY29yZHMgY29uc29sZSBvdXRwdXQgZnJvbSBldmVyeSBlZGl0b3IgcHJvY2Vzcyxcbi8vIGkuZS4gZXhhY3RseSB3aGF0IHRoZSBDb25zb2xlIHBhbmVsIHNob3dzLlxuZnVuY3Rpb24gZWRpdG9yTG9ncygpOiBhbnlbXSB7XG4gICAgcmV0dXJuIChFZGl0b3IgYXMgYW55KS5Mb2dnZXI/LnF1ZXJ5Py4oKSA/PyBbXTtcbn1cblxuZnVuY3Rpb24gc2xpbUxvZyhlbnRyeTogYW55KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgbWVzc2FnZTogZW50cnkubWVzc2FnZSxcbiAgICAgICAgdGltZTogZW50cnkudGltZSxcbiAgICAgICAgLi4uKGVudHJ5LnR5cGUgPT09ICdlcnJvcicgJiYgZW50cnkuc3RhY2sgPyB7IHN0YWNrOiBlbnRyeS5zdGFjayB9IDoge30pXG4gICAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIERlYnVnVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdkZWJ1Z19jb25zb2xlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0VkaXRvciBDb25zb2xlIHBhbmVsLiBBY3Rpb25zOiBnZXRfbG9ncywgY2xlYXIsIGV4ZWN1dGVfc2NyaXB0IChydW4gSlM7IHJldHVybnMgaXRzIHJlc3VsdCBhbmQgdGhlIGNvbnNvbGUgb3V0cHV0IGl0IHByb2R1Y2VkKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9sb2dzJywgJ2NsZWFyJywgJ2V4ZWN1dGVfc2NyaXB0J11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIHJlY2VudCBsb2dzIHRvIHJldHJpZXZlIChnZXRfbG9ncyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGxvZ3MgYnkgdHlwZSAoZ2V0X2xvZ3MpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FsbCcsICdsb2cnLCAnd2FybicsICdlcnJvcicsICdpbmZvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250YWluczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT25seSBsb2dzIHdob3NlIG1lc3NhZ2UgY29udGFpbnMgdGhpcyB0ZXh0IChnZXRfbG9ncyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2luY2U6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0N1cnNvciBmcm9tIGEgcHJldmlvdXMgZ2V0X2xvZ3MgbmV4dEN1cnNvcjsgcmV0dXJuIG9ubHkgbmV3ZXIgbG9ncyAoZ2V0X2xvZ3MpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSmF2YVNjcmlwdCBhc3luYyBmdW5jdGlvbiBib2R5OyB1c2UgcmV0dXJuIGZvciBhIHJlc3VsdCAoZXhlY3V0ZV9zY3JpcHQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ3NjZW5lOiByZW5kZXJlciwgYGNjYCBpbiBzY29wZS4gZWRpdG9yOiBtYWluIHByb2Nlc3MsIGBFZGl0b3JgL2ByZXF1aXJlYCBpbiBzY29wZSAoZXhlY3V0ZV9zY3JpcHQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3NjZW5lJywgJ2VkaXRvciddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdzY2VuZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdkZWJ1Z19pbnNwZWN0JyxcbiAgICAgICAgICAgICAgICBhbm5vdGF0aW9uczogeyByZWFkT25seUhpbnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luc3BlY3QvdmFsaWRhdGUgc2NlbmUuIEFjdGlvbnM6IGdldF9ub2RlX3RyZWUsIGdldF9wZXJmb3JtYW5jZV9zdGF0cywgdmFsaWRhdGVfc2NlbmUsIGdldF9lZGl0b3JfaW5mbywgcHJvYmVfY2NlX2FwaSwgY2hlY2tfc2NyaXB0cyAodHNjIHR5cGUgZXJyb3JzIGluIHByb2plY3Qgc2NyaXB0cykuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfbm9kZV90cmVlJywgJ2dldF9wZXJmb3JtYW5jZV9zdGF0cycsICd2YWxpZGF0ZV9zY2VuZScsICdnZXRfZWRpdG9yX2luZm8nLCAncHJvYmVfY2NlX2FwaScsICdjaGVja19zY3JpcHRzJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXggZGlhZ25vc3RpY3MgdG8gcmV0dXJuIChjaGVja19zY3JpcHRzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByb290VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUm9vdCBub2RlIFVVSUQgKGFjdGlvbjogZ2V0X25vZGVfdHJlZSwgb3B0aW9uYWwsIHVzZXMgc2NlbmUgcm9vdCBpZiBub3QgcHJvdmlkZWQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW50ZXJuYWwgY2NlLjxuYW1lc3BhY2U+IGVuZ2luZSBtYW5hZ2VyIHRvIGxpc3QgbWV0aG9kcyBmb3IsIGUuZy4gXCJQcmVmYWJcIiwgXCJOb2RlXCIsIFwiU2NlbmVcIiAocHJvYmVfY2NlX2FwaSwgb3B0aW9uYWwsIGRlZmF1bHQgXCJQcmVmYWJcIiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCB0byBpbnNwZWN0IGZvciBhIGxpdmUgUHJlZmFiSW5mbyBsaW5rIChwcm9iZV9jY2VfYXBpLCBvcHRpb25hbCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4RGVwdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gdHJlZSBkZXB0aCAoZ2V0X25vZGVfdHJlZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tNaXNzaW5nQXNzZXRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgZm9yIG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlcyAodmFsaWRhdGVfc2NlbmUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tNaXNzaW5nU2NyaXB0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGZvciBjb21wb25lbnRzIHdob3NlIHNjcmlwdCBmYWlsZWQgdG8gbG9hZCAoc3VyZmFjZXMgYXMgY2MuTWlzc2luZ1NjcmlwdCkgKHZhbGlkYXRlX3NjZW5lKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrUGVyZm9ybWFuY2U6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBmb3IgcGVyZm9ybWFuY2UgaXNzdWVzICh2YWxpZGF0ZV9zY2VuZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdkZWJ1Z19sb2dzJyxcbiAgICAgICAgICAgICAgICBhbm5vdGF0aW9uczogeyByZWFkT25seUhpbnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSBwcm9qZWN0IGxvZyBmaWxlcyAodGVtcC9sb2dzL3Byb2plY3QubG9nKS4gQWN0aW9uczogZ2V0X3Byb2plY3RfbG9ncywgZ2V0X2xvZ19maWxlX2luZm8sIHNlYXJjaF9sb2dzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X3Byb2plY3RfbG9ncycsICdnZXRfbG9nX2ZpbGVfaW5mbycsICdzZWFyY2hfbG9ncyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbGluZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBsaW5lcyB0byByZWFkIGZyb20gdGhlIGVuZCBvZiB0aGUgbG9nIGZpbGUgKGdldF9wcm9qZWN0X2xvZ3MpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAxMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAxMDAwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcktleXdvcmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBsb2dzIGNvbnRhaW5pbmcgc3BlY2lmaWMga2V5d29yZCAoZ2V0X3Byb2plY3RfbG9ncyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nTGV2ZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBsb2cgbGV2ZWwgKGdldF9wcm9qZWN0X2xvZ3MpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ0VSUk9SJywgJ1dBUk4nLCAnSU5GTycsICdERUJVRycsICdUUkFDRScsICdBTEwnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnQUxMJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlYXJjaCBwYXR0ZXJuLCBzdXBwb3J0cyByZWdleCAoc2VhcmNoX2xvZ3MpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gbnVtYmVyIG9mIG1hdGNoaW5nIHJlc3VsdHMgKHNlYXJjaF9sb2dzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0TGluZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ051bWJlciBvZiBjb250ZXh0IGxpbmVzIHRvIHNob3cgYXJvdW5kIGVhY2ggbWF0Y2ggKHNlYXJjaF9sb2dzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gQm90aCBhcmUgc2NlbmUtbm9kZSByZWZlcmVuY2VzLCBzbyBhY2NlcHQgYSBwYXRoIG9yIGEgbmFtZSB0b28uXG4gICAgICAgIGNvbnN0IHVucmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlTm9kZVJlZkZpZWxkcyhhcmdzLCBbJ25vZGVVdWlkJywgJ3Jvb3RVdWlkJ10pO1xuICAgICAgICBpZiAodW5yZXNvbHZlZCkgeyByZXR1cm4gdW5yZXNvbHZlZDsgfVxuXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnX2NvbnNvbGUnOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2xvZ3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Q29uc29sZUxvZ3MoYXJncy5saW1pdCwgYXJncy5maWx0ZXIsIGFyZ3MuY29udGFpbnMsIGFyZ3Muc2luY2UpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjbGVhcic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbGVhckNvbnNvbGUoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXhlY3V0ZV9zY3JpcHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVNjcmlwdChhcmdzLnNjcmlwdCwgYXJncy5jb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uICcke2FjdGlvbn0nLiBWYWxpZCBhY3Rpb25zOiBnZXRfbG9ncywgY2xlYXIsIGV4ZWN1dGVfc2NyaXB0YCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnX2luc3BlY3QnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X25vZGVfdHJlZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXROb2RlVHJlZShhcmdzLnJvb3RVdWlkLCBhcmdzLm1heERlcHRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X3BlcmZvcm1hbmNlX3N0YXRzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFBlcmZvcm1hbmNlU3RhdHMoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfc2NlbmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVTY2VuZShhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2VkaXRvcl9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEVkaXRvckluZm8oKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncHJvYmVfY2NlX2FwaSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5wcm9iZUNjZUFwaShhcmdzLm5hbWVzcGFjZSwgYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NoZWNrX3NjcmlwdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2hlY2tTY3JpcHRzKGFyZ3MubWF4UmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbiAnJHthcmdzLmFjdGlvbn0nLiBWYWxpZCBhY3Rpb25zOiBnZXRfbm9kZV90cmVlLCBnZXRfcGVyZm9ybWFuY2Vfc3RhdHMsIHZhbGlkYXRlX3NjZW5lLCBnZXRfZWRpdG9yX2luZm8sIHByb2JlX2NjZV9hcGksIGNoZWNrX3NjcmlwdHNgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVidWdfbG9ncyc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfcHJvamVjdF9sb2dzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RMb2dzKGFyZ3MubGluZXMsIGFyZ3MuZmlsdGVyS2V5d29yZCwgYXJncy5sb2dMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9sb2dfZmlsZV9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldExvZ0ZpbGVJbmZvKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlYXJjaF9sb2dzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaFByb2plY3RMb2dzKGFyZ3MucGF0dGVybiwgYXJncy5tYXhSZXN1bHRzLCBhcmdzLmNvbnRleHRMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbnNvbGVMb2dzKGxpbWl0OiBudW1iZXIgPSAxMDAsIGZpbHRlcjogc3RyaW5nID0gJ2FsbCcsIGNvbnRhaW5zPzogc3RyaW5nLCBzaW5jZT86IG51bWJlcik6IFRvb2xSZXNwb25zZSB7XG4gICAgICAgIGNvbnN0IGFsbCA9IGVkaXRvckxvZ3MoKTtcbiAgICAgICAgLy8gVGhlIGN1cnNvciBpcyBhbiBpbmRleCBpbnRvIHRoZSBlZGl0b3IncyBsb2cgYXJyYXk7IGEgY2xlYXIgc2hyaW5rcyBpdCwgc28gcmVzdGFydCBmcm9tIDAuXG4gICAgICAgIGNvbnN0IHN0YXJ0ID0gdHlwZW9mIHNpbmNlID09PSAnbnVtYmVyJyAmJiBzaW5jZSA+PSAwICYmIHNpbmNlIDw9IGFsbC5sZW5ndGggPyBzaW5jZSA6IDA7XG4gICAgICAgIGxldCBsb2dzID0gYWxsLnNsaWNlKHN0YXJ0KTtcbiAgICAgICAgaWYgKGZpbHRlciAhPT0gJ2FsbCcpIHtcbiAgICAgICAgICAgIGxvZ3MgPSBsb2dzLmZpbHRlcihsb2cgPT4gbG9nLnR5cGUgPT09IGZpbHRlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRhaW5zKSB7XG4gICAgICAgICAgICBsb2dzID0gbG9ncy5maWx0ZXIobG9nID0+IFN0cmluZyhsb2cubWVzc2FnZSkuaW5jbHVkZXMoY29udGFpbnMpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZWNlbnRMb2dzID0gbG9ncy5zbGljZSgtbGltaXQpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHRvdGFsOiBsb2dzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICByZXR1cm5lZDogcmVjZW50TG9ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgbmV4dEN1cnNvcjogYWxsLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBsb2dzOiByZWNlbnRMb2dzLm1hcChzbGltTG9nKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJDb25zb2xlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBMb2dnZXIuY2xlYXIgYWxzbyBlbXB0aWVzIHRoZSBDb25zb2xlIHBhbmVsLlxuICAgICAgICAgICAgKEVkaXRvciBhcyBhbnkpLkxvZ2dlci5jbGVhcigpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0NvbnNvbGUgY2xlYXJlZCBzdWNjZXNzZnVsbHknIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY3JpcHQoc2NyaXB0OiBzdHJpbmcsIGNvbnRleHQ6IHN0cmluZyA9ICdzY2VuZScpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIXNjcmlwdCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc2NyaXB0IGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250ZXh0ICE9PSAnc2NlbmUnICYmIGNvbnRleHQgIT09ICdlZGl0b3InKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGNvbnRleHQgJyR7Y29udGV4dH0nLiBWYWxpZCBjb250ZXh0czogc2NlbmUsIGVkaXRvcmAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiZWZvcmUgPSBlZGl0b3JMb2dzKCkubGVuZ3RoO1xuICAgICAgICAvLyBMb2dzIGZyb20gdGhlIHNjZW5lIHByb2Nlc3MgcmVhY2ggRWRpdG9yLkxvZ2dlciBvdmVyIElQQywgc2xpZ2h0bHkgYWZ0ZXIgdGhlIGNhbGwgcmV0dXJucy5cbiAgICAgICAgY29uc3QgY29uc29sZU91dHB1dCA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ID09PSAnc2NlbmUnKSB7IGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCA1MCkpOyB9XG4gICAgICAgICAgICByZXR1cm4gZWRpdG9yTG9ncygpLnNsaWNlKGJlZm9yZSkuc2xpY2UoLTUwKS5tYXAoc2xpbUxvZyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGNvbnRleHQgPT09ICdlZGl0b3InKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IEFzeW5jRnVuY3Rpb24gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXN5bmMgZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH0pLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5ldyBBc3luY0Z1bmN0aW9uKCdFZGl0b3InLCAncmVxdWlyZScsIHNjcmlwdCkoRWRpdG9yLCByZXF1aXJlKTtcbiAgICAgICAgICAgICAgICBsZXQgc2FmZSA9IHJlc3VsdDtcbiAgICAgICAgICAgICAgICB0cnkgeyBKU09OLnN0cmluZ2lmeShyZXN1bHQpOyB9IGNhdGNoIHsgc2FmZSA9IFN0cmluZyhyZXN1bHQpOyB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZXN1bHQ6IHNhZmUsIGNvbnNvbGU6IGF3YWl0IGNvbnNvbGVPdXRwdXQoKSB9IH07XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpLCBkYXRhOiB7IGNvbnNvbGU6IGF3YWl0IGNvbnNvbGVPdXRwdXQoKSB9IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSdW5zIGluIHRoaXMgZXh0ZW5zaW9uJ3Mgb3duIHNjZW5lIHNjcmlwdCDigJQgdGhlIGJ1aWx0LWluIGBjb25zb2xlYCBzY2VuZVxuICAgICAgICAvLyBzY3JpcHQgaXQgdXNlZCB0byB0YXJnZXQgZG9lcyBub3QgZXhpc3QgaW4gMy44LnguXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdldmFsU2NyaXB0JyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbc2NyaXB0XVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiAocmVzdWx0Py5zdWNjZXNzXG4gICAgICAgICAgICAgICAgPyB7IGRhdGE6IHsgcmVzdWx0OiByZXN1bHQuZGF0YT8ucmVzdWx0IH0gfVxuICAgICAgICAgICAgICAgIDogeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdD8uZXJyb3IgfHwgJ1NjcmlwdCBleGVjdXRpb24gZmFpbGVkJyB9KVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4geyAuLi5yZXNwb25zZSwgZGF0YTogeyAuLi5yZXNwb25zZS5kYXRhLCBjb25zb2xlOiBhd2FpdCBjb25zb2xlT3V0cHV0KCkgfSB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcHJvYmVDY2VBcGkobmFtZXNwYWNlPzogc3RyaW5nLCBub2RlVXVpZD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwcm9iZUNjZUFwaScsXG4gICAgICAgICAgICAgICAgYXJnczogW25hbWVzcGFjZSwgbm9kZVV1aWRdXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIChyZXN1bHQ6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQ/LmRhdGEgPz8gcmVzdWx0LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdjY2UgQVBJIHByb2JlIGNvbXBsZXRlJ1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldE5vZGVUcmVlKHJvb3RVdWlkPzogc3RyaW5nLCBtYXhEZXB0aDogbnVtYmVyID0gMTApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBidWlsZFRyZWUgPSBhc3luYyAobm9kZVV1aWQ6IHN0cmluZywgZGVwdGg6IG51bWJlciA9IDApOiBQcm9taXNlPGFueT4gPT4ge1xuICAgICAgICAgICAgaWYgKGRlcHRoID49IG1heERlcHRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdHJ1bmNhdGVkOiB0cnVlIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCB0cmVlID0ge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlRGF0YS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlRGF0YS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGVEYXRhLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogKG5vZGVEYXRhIGFzIGFueSkuY29tcG9uZW50cyA/IChub2RlRGF0YSBhcyBhbnkpLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+IGMuX190eXBlX18pIDogW10sXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkQ291bnQ6IG5vZGVEYXRhLmNoaWxkcmVuID8gbm9kZURhdGEuY2hpbGRyZW4ubGVuZ3RoIDogMCxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdIGFzIGFueVtdXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChub2RlRGF0YS5jaGlsZHJlbiAmJiBub2RlRGF0YS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGRJZCBvZiBub2RlRGF0YS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hpbGRUcmVlID0gYXdhaXQgYnVpbGRUcmVlKGNoaWxkSWQsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmVlLmNoaWxkcmVuLnB1c2goY2hpbGRUcmVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0cmVlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICBpZiAocm9vdFV1aWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBidWlsZFRyZWUocm9vdFV1aWQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdHJlZSB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBjb25zdCByb290cyA9IEFycmF5LmlzQXJyYXkoaGllcmFyY2h5KSA/IGhpZXJhcmNoeSA6IChoaWVyYXJjaHk/LmNoaWxkcmVuIHx8IFtdKTtcbiAgICAgICAgICAgIGNvbnN0IHRyZWVzID0gW107XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHJvb3ROb2RlIG9mIHJvb3RzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IGJ1aWxkVHJlZShyb290Tm9kZS51dWlkKTtcbiAgICAgICAgICAgICAgICB0cmVlcy5wdXNoKHRyZWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdHJlZXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UGVyZm9ybWFuY2VTdGF0cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBDb2NvcyAzLjgueCBkb2VzIG5vdCBleHBvc2UgYSBzY2VuZSBwZXJmb3JtYW5jZSBxdWVyeSBpbiB0aGUgZWRpdG9yLlxuICAgICAgICAvLyBSZXR1cm4gYSBzdHViIHNvIHRoZSB0b29sIGRvZXMgbm90IHRocm93IFwiTWVzc2FnZSBkb2VzIG5vdCBleGlzdFwiLlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUGVyZm9ybWFuY2Ugc3RhdHMgbm90IGF2YWlsYWJsZSBpbiBlZGl0b3IgKG5vIHB1YmxpYyBBUEkgaW4gQ29jb3MgMy44LngpJ1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVTY2VuZShvcHRpb25zOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IFZhbGlkYXRpb25Jc3N1ZVtdID0gW107XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBtaXNzaW5nIGFzc2V0c1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2tNaXNzaW5nQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWlzc2luZzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZXMtbWlzcy1hc3NldHMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBtaXNzaW5nTGlzdCA9IEFycmF5LmlzQXJyYXkobWlzc2luZykgPyBtaXNzaW5nIDogKG1pc3Npbmc/Lm1pc3NpbmcgfHwgW10pO1xuICAgICAgICAgICAgICAgIGlmIChtaXNzaW5nTGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAnYXNzZXRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke21pc3NpbmdMaXN0Lmxlbmd0aH0gbWlzc2luZyBhc3NldCByZWZlcmVuY2VzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHM6IG1pc3NpbmdMaXN0XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHBlcmZvcm1hbmNlIGlzc3Vlc1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2tQZXJmb3JtYW5jZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgcm9vdHMgPSBBcnJheS5pc0FycmF5KGhpZXJhcmNoeSkgPyBoaWVyYXJjaHkgOiAoaGllcmFyY2h5Py5jaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUNvdW50ID0gdGhpcy5jb3VudE5vZGVzKHJvb3RzKTtcblxuICAgICAgICAgICAgICAgIGlmIChub2RlQ291bnQgPiAxMDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd3YXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiAncGVyZm9ybWFuY2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEhpZ2ggbm9kZSBjb3VudDogJHtub2RlQ291bnR9IG5vZGVzIChyZWNvbW1lbmRlZCA8IDEwMDApYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdDb25zaWRlciB1c2luZyBvYmplY3QgcG9vbGluZyBvciBzY2VuZSBvcHRpbWl6YXRpb24nXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbXBvbmVudHMgd2hvc2Ugc2NyaXB0IGZhaWxlZCB0byBsb2FkIChyZW5hbWVkL2RlbGV0ZWQvY29tcGlsZSBlcnJvcikuXG4gICAgICAgICAgICAvLyBUaGUgZW5naW5lIHN3YXBzIHN1Y2ggYSBjb21wb25lbnQncyBydW50aW1lIGNsYXNzIHRvIGNjLk1pc3NpbmdTY3JpcHQgKGNpZCAnY2MuTWlzc2luZ1NjcmlwdCcpLlxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuY2hlY2tNaXNzaW5nU2NyaXB0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdTY3JpcHRzID0gYXdhaXQgdGhpcy5maW5kTWlzc2luZ1NjcmlwdENvbXBvbmVudHMoKTtcbiAgICAgICAgICAgICAgICBpZiAobWlzc2luZ1NjcmlwdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ3NjcmlwdHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7bWlzc2luZ1NjcmlwdHMubGVuZ3RofSBjb21wb25lbnQocykgd2l0aCBtaXNzaW5nIHNjcmlwdGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBtaXNzaW5nU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdUaGUgb3JpZ2luYWwgc2NyaXB0IGFzc2V0IHdhcyBkZWxldGVkLCByZW5hbWVkLCBvciBmYWlsZWQgdG8gY29tcGlsZS4gUmUtYWRkIHRoZSBzY3JpcHQgb3IgcmVtb3ZlIHRoZSBjb21wb25lbnQuJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogVmFsaWRhdGlvblJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICB2YWxpZDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgICAgICBpc3N1ZUNvdW50OiBpc3N1ZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGlzc3VlczogaXNzdWVzXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY291bnROb2Rlcyhub2RlczogYW55W10pOiBudW1iZXIge1xuICAgICAgICBsZXQgY291bnQgPSBub2Rlcy5sZW5ndGg7XG4gICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xuICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBjb3VudCArPSB0aGlzLmNvdW50Tm9kZXMobm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmluZE1pc3NpbmdTY3JpcHRDb21wb25lbnRzKCk6IFByb21pc2U8QXJyYXk8eyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRJbmRleDogbnVtYmVyIH0+PiB7XG4gICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgIGlmICghbm9kZVRyZWUpIHJldHVybiBbXTtcblxuICAgICAgICBjb25zdCBub2RlVXVpZHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGNvbnN0IHF1ZXVlOiBhbnlbXSA9IFtub2RlVHJlZV07XG4gICAgICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmIChub2RlPy51dWlkKSBub2RlVXVpZHMucHVzaChub2RlLnV1aWQpO1xuICAgICAgICAgICAgaWYgKG5vZGU/LmNoaWxkcmVuKSBxdWV1ZS5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0czogQXJyYXk8eyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRJbmRleDogbnVtYmVyIH0+ID0gW107XG4gICAgICAgIGNvbnN0IEJBVENIID0gMTA7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZVV1aWRzLmxlbmd0aDsgaSArPSBCQVRDSCkge1xuICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBub2RlVXVpZHMuc2xpY2UoaSwgaSArIEJBVENIKTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgICAgICAgIGJhdGNoLm1hcCh1dWlkID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKS5jYXRjaCgoKSA9PiBudWxsKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5vZGVEYXRhcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gbm9kZURhdGFzW2pdIGFzIGFueTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGVEYXRhPy5fX2NvbXBzX18pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkID0gYmF0Y2hbal07XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZU5hbWUgPSBub2RlRGF0YS5uYW1lPy52YWx1ZSA/PyBub2RlRGF0YS5uYW1lID8/IG5vZGVVdWlkO1xuICAgICAgICAgICAgICAgIG5vZGVEYXRhLl9fY29tcHNfXy5mb3JFYWNoKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wPy5fX3R5cGVfXyB8fCBjb21wPy5jaWQgfHwgY29tcD8udHlwZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBUeXBlID09PSAnY2MuTWlzc2luZ1NjcmlwdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IG5vZGVVdWlkLCBub2RlTmFtZTogU3RyaW5nKG5vZGVOYW1lKSwgY29tcG9uZW50SW5kZXg6IGluZGV4IH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICB9XG5cbiAgICAvLyBUeXBlIGVycm9ycyB0aGUgZWRpdG9yJ3Mgb3duIGNvbXBpbGUgKHdoaWNoIHN0cmlwcyB0eXBlcykgbmV2ZXIgcmVwb3J0cy5cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrU2NyaXB0cyhtYXhSZXN1bHRzOiBudW1iZXIgPSA1MCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHByb2plY3RQYXRoOiBzdHJpbmcgPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICBjb25zdCB0c2NvbmZpZyA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ3RzY29uZmlnLmpzb24nKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRzY29uZmlnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gdHNjb25maWcuanNvbiBpbiAke3Byb2plY3RQYXRofWAgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyBQcmVmZXIgdGhlIHByb2plY3QncyBvd24gVHlwZVNjcmlwdCwgZWxzZSB0aGUgY29weSBidW5kbGVkIHdpdGggdGhlIGVkaXRvci5cbiAgICAgICAgY29uc3QgdHNjID0gW1xuICAgICAgICAgICAgcGF0aC5qb2luKHByb2plY3RQYXRoLCAnbm9kZV9tb2R1bGVzJywgJ3R5cGVzY3JpcHQnLCAnYmluJywgJ3RzYycpLFxuICAgICAgICAgICAgcGF0aC5qb2luKGAke0VkaXRvci5BcHAucGF0aH0udW5wYWNrZWRgLCAnbm9kZV9tb2R1bGVzJywgJ3R5cGVzY3JpcHQnLCAnYmluJywgJ3RzYycpXG4gICAgICAgIF0uZmluZChwID0+IGZzLmV4aXN0c1N5bmMocCkpO1xuICAgICAgICBpZiAoIXRzYykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnVHlwZVNjcmlwdCBjb21waWxlciBub3QgZm91bmQgaW4gdGhlIHByb2plY3Qgb3IgdGhlIGVkaXRvcicgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBydW4gPSAoZXh0cmE6IHN0cmluZ1tdKSA9PiBuZXcgUHJvbWlzZTx7IGNvZGU6IG51bWJlcjsgb3V0OiBzdHJpbmcgfT4ocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICAvLyBFTEVDVFJPTl9SVU5fQVNfTk9ERSBtYWtlcyB0aGUgZWRpdG9yIGJpbmFyeSBiZWhhdmUgYXMgcGxhaW4gTm9kZS5cbiAgICAgICAgICAgIGV4ZWNGaWxlKHByb2Nlc3MuZXhlY1BhdGgsIFt0c2MsICctLW5vRW1pdCcsICctLXByZXR0eScsICdmYWxzZScsICctcCcsIHRzY29uZmlnLCAuLi5leHRyYV0sIHtcbiAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoLFxuICAgICAgICAgICAgICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgRUxFQ1RST05fUlVOX0FTX05PREU6ICcxJyB9LFxuICAgICAgICAgICAgICAgIG1heEJ1ZmZlcjogMzIgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgICAgICB0aW1lb3V0OiAxODBfMDAwXG4gICAgICAgICAgICB9LCAoZXJyOiBhbnksIHN0ZG91dCwgc3RkZXJyKSA9PiByZXNvbHZlKHsgY29kZTogZXJyID8gKHR5cGVvZiBlcnIuY29kZSA9PT0gJ251bWJlcicgPyBlcnIuY29kZSA6IC0xKSA6IDAsIG91dDogYCR7c3Rkb3V0fSR7c3RkZXJyfWAgfSkpO1xuICAgICAgICB9KTtcbiAgICAgICAgbGV0IHsgY29kZSwgb3V0IH0gPSBhd2FpdCBydW4oW10pO1xuICAgICAgICAvLyBBIHRzY29uZmlnIHdyaXR0ZW4gZm9yIGEgbmV3ZXIgVHlwZVNjcmlwdCAoZS5nLiBpZ25vcmVEZXByZWNhdGlvbnMgXCI2LjBcIikgZmFpbHMgYmVmb3JlIGNoZWNraW5nIGFueXRoaW5nLlxuICAgICAgICBpZiAoL2Vycm9yIFRTNTEwMzouKmlnbm9yZURlcHJlY2F0aW9ucy8udGVzdChvdXQpKSB7XG4gICAgICAgICAgICAoeyBjb2RlLCBvdXQgfSA9IGF3YWl0IHJ1bihbJy0taWdub3JlRGVwcmVjYXRpb25zJywgJzUuMCddKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmUgPSAvXiguKz8pXFwoKFxcZCspLChcXGQrKVxcKTogKGVycm9yfHdhcm5pbmcpIChUU1xcZCspOiAoLiopJC87XG4gICAgICAgIGNvbnN0IGRpYWdub3N0aWNzID0gb3V0LnNwbGl0KCdcXG4nKS5tYXAobCA9PiByZS5leGVjKGwudHJpbSgpKSkuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAubWFwKG0gPT4gKHsgZmlsZTogbSFbMV0sIGxpbmU6IE51bWJlcihtIVsyXSksIGNvbHVtbjogTnVtYmVyKG0hWzNdKSwgc2V2ZXJpdHk6IG0hWzRdLCBjb2RlOiBtIVs1XSwgbWVzc2FnZTogbSFbNl0gfSkpO1xuICAgICAgICBpZiAoY29kZSAhPT0gMCAmJiBkaWFnbm9zdGljcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYHRzYyBleGl0ZWQgJHtjb2RlfTogJHtvdXQuc2xpY2UoMCwgMjAwMCl9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGNvbXBpbGVyOiB0c2MsXG4gICAgICAgICAgICAgICAgZXJyb3JDb3VudDogZGlhZ25vc3RpY3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHJldHVybmVkOiBNYXRoLm1pbihkaWFnbm9zdGljcy5sZW5ndGgsIG1heFJlc3VsdHMpLFxuICAgICAgICAgICAgICAgIGRpYWdub3N0aWNzOiBkaWFnbm9zdGljcy5zbGljZSgwLCBtYXhSZXN1bHRzKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0RWRpdG9ySW5mbygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBpbmZvID0ge1xuICAgICAgICAgICAgZWRpdG9yOiB7XG4gICAgICAgICAgICAgICAgLy8gYEVkaXRvci52ZXJzaW9uc2AgZG9lcyBub3QgZXhpc3Q7IHRoZSB2ZXJzaW9uIGxpdmVzIG9uIEVkaXRvci5BcHAuXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogKEVkaXRvciBhcyBhbnkpLkFwcD8udmVyc2lvbiB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXG4gICAgICAgICAgICAgICAgYXJjaDogcHJvY2Vzcy5hcmNoLFxuICAgICAgICAgICAgICAgIG5vZGVWZXJzaW9uOiBwcm9jZXNzLnZlcnNpb25cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcm9qZWN0OiB7XG4gICAgICAgICAgICAgICAgbmFtZTogRWRpdG9yLlByb2plY3QubmFtZSxcbiAgICAgICAgICAgICAgICBwYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxuICAgICAgICAgICAgICAgIHV1aWQ6IEVkaXRvci5Qcm9qZWN0LnV1aWRcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZW1vcnk6IHByb2Nlc3MubWVtb3J5VXNhZ2UoKSxcbiAgICAgICAgICAgIHVwdGltZTogcHJvY2Vzcy51cHRpbWUoKVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGluZm8gfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RMb2dzKGxpbmVzOiBudW1iZXIgPSAxMDAsIGZpbHRlcktleXdvcmQ/OiBzdHJpbmcsIGxvZ0xldmVsOiBzdHJpbmcgPSAnQUxMJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcHJvamVjdCBwYXRoc1xuICAgICAgICAgICAgbGV0IGxvZ0ZpbGVQYXRoID0gJyc7XG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xuICAgICAgICAgICAgICAgIEVkaXRvci5Qcm9qZWN0ID8gRWRpdG9yLlByb2plY3QucGF0aCA6IG51bGwsXG4gICAgICAgICAgICAgICAgJy9Vc2Vycy9saXpoaXlvbmcvTmV3UHJvamVjdF8zJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgXS5maWx0ZXIocCA9PiBwICE9PSBudWxsKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBiYXNlUGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0UGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nRmlsZVBhdGggPSB0ZXN0UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWxvZ0ZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvamVjdCBsb2cgZmlsZSBub3QgZm91bmQuIFRyaWVkIHBhdGhzOiAke3Bvc3NpYmxlUGF0aHMubWFwKHAgPT4gcGF0aC5qb2luKHAsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVhZCB0aGUgZmlsZSBjb250ZW50XG4gICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGxvZ0ZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgbG9nTGluZXMgPSBsb2dDb250ZW50LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGxhc3QgTiBsaW5lc1xuICAgICAgICAgICAgY29uc3QgcmVjZW50TGluZXMgPSBsb2dMaW5lcy5zbGljZSgtbGluZXMpO1xuXG4gICAgICAgICAgICAvLyBBcHBseSBmaWx0ZXJzXG4gICAgICAgICAgICBsZXQgZmlsdGVyZWRMaW5lcyA9IHJlY2VudExpbmVzO1xuXG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkgbG9nIGxldmVsIGlmIG5vdCAnQUxMJy4gRWRpdG9yIGxpbmVzIHJlYWQgXCI8ZGF0ZT4gPHRpbWU+IC0gPGxldmVsPjogLi4uXCI7XG4gICAgICAgICAgICAvLyBtYXRjaCB0aGF0IG1hcmtlciBvbmx5LCBzbyBhIGxldmVsIHdvcmQgaW5zaWRlIGEgbWVzc2FnZSBib2R5IGRvZXNuJ3QgY291bnQuXG4gICAgICAgICAgICBpZiAobG9nTGV2ZWwgIT09ICdBTEwnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWFya2VyID0gYCAtICR7bG9nTGV2ZWwudG9Mb3dlckNhc2UoKX06YDtcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZExpbmVzID0gZmlsdGVyZWRMaW5lcy5maWx0ZXIobGluZSA9PiBsaW5lLmluY2x1ZGVzKG1hcmtlcikpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkga2V5d29yZCBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGZpbHRlcktleXdvcmQpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZExpbmVzID0gZmlsdGVyZWRMaW5lcy5maWx0ZXIobGluZSA9PlxuICAgICAgICAgICAgICAgICAgICBsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyS2V5d29yZC50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTGluZXM6IGxvZ0xpbmVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdGVkTGluZXM6IGxpbmVzLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZExpbmVzOiBmaWx0ZXJlZExpbmVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbG9nTGV2ZWw6IGxvZ0xldmVsLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJLZXl3b3JkOiBmaWx0ZXJLZXl3b3JkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGxvZ3M6IGZpbHRlcmVkTGluZXMsXG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoOiBsb2dGaWxlUGF0aFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVhZCBwcm9qZWN0IGxvZ3M6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dGaWxlSW5mbygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHByb2plY3QgcGF0aHNcbiAgICAgICAgICAgIGxldCBsb2dGaWxlUGF0aCA9ICcnO1xuICAgICAgICAgICAgY29uc3QgcG9zc2libGVQYXRocyA9IFtcbiAgICAgICAgICAgICAgICBFZGl0b3IuUHJvamVjdCA/IEVkaXRvci5Qcm9qZWN0LnBhdGggOiBudWxsLFxuICAgICAgICAgICAgICAgICcvVXNlcnMvbGl6aGl5b25nL05ld1Byb2plY3RfMycsXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICAgIF0uZmlsdGVyKHAgPT4gcCAhPT0gbnVsbCk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgcG9zc2libGVQYXRocykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCAndGVtcC9sb2dzL3Byb2plY3QubG9nJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoID0gdGVzdFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsb2dGaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb2plY3QgbG9nIGZpbGUgbm90IGZvdW5kLiBUcmllZCBwYXRoczogJHtwb3NzaWJsZVBhdGhzLm1hcChwID0+IHBhdGguam9pbihwLCAndGVtcC9sb2dzL3Byb2plY3QubG9nJykpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMobG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgbG9nQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dGaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVDb3VudCA9IGxvZ0NvbnRlbnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJykubGVuZ3RoO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogbG9nRmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBzdGF0cy5zaXplLFxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZUZvcm1hdHRlZDogdGhpcy5mb3JtYXRGaWxlU2l6ZShzdGF0cy5zaXplKSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdE1vZGlmaWVkOiBzdGF0cy5tdGltZS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZDogc3RhdHMuYmlydGh0aW1lLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc2libGU6IGZzLmNvbnN0YW50cy5SX09LXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgbG9nIGZpbGUgaW5mbzogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaFByb2plY3RMb2dzKHBhdHRlcm46IHN0cmluZywgbWF4UmVzdWx0czogbnVtYmVyID0gMjAsIGNvbnRleHRMaW5lczogbnVtYmVyID0gMik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcHJvamVjdCBwYXRoc1xuICAgICAgICAgICAgbGV0IGxvZ0ZpbGVQYXRoID0gJyc7XG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xuICAgICAgICAgICAgICAgIEVkaXRvci5Qcm9qZWN0ID8gRWRpdG9yLlByb2plY3QucGF0aCA6IG51bGwsXG4gICAgICAgICAgICAgICAgJy9Vc2Vycy9saXpoaXlvbmcvTmV3UHJvamVjdF8zJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgXS5maWx0ZXIocCA9PiBwICE9PSBudWxsKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBiYXNlUGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0UGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nRmlsZVBhdGggPSB0ZXN0UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWxvZ0ZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvamVjdCBsb2cgZmlsZSBub3QgZm91bmQuIFRyaWVkIHBhdGhzOiAke3Bvc3NpYmxlUGF0aHMubWFwKHAgPT4gcGF0aC5qb2luKHAsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbG9nQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dGaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxvZ0xpbmVzID0gbG9nQ29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZWdleCBwYXR0ZXJuIChzdXBwb3J0IGJvdGggc3RyaW5nIGFuZCByZWdleCBwYXR0ZXJucylcbiAgICAgICAgICAgIC8vIE5vICdnJyBmbGFnOiB0ZXN0KCkgaXMgcGVyIGxpbmUsIHNvIG5vIGxhc3RJbmRleCB0byBtYW5hZ2UuXG4gICAgICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmVnZXggPSBuZXcgUmVnRXhwKHBhdHRlcm4sICdpJyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIHJlZ2V4IHBhdHRlcm46ICR7ZS5tZXNzYWdlfS4gTWF0Y2hpbmcgaXMgYWxyZWFkeSBjYXNlLWluc2Vuc2l0aXZlOyBpbmxpbmUgZmxhZ3MgbGlrZSAoP2kpIGFyZSBub3Qgc3VwcG9ydGVkLmAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCByZXN1bHRDb3VudCA9IDA7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9nTGluZXMubGVuZ3RoICYmIHJlc3VsdENvdW50IDwgbWF4UmVzdWx0czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGxvZ0xpbmVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChyZWdleC50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBjb250ZXh0IGxpbmVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRTdGFydCA9IE1hdGgubWF4KDAsIGkgLSBjb250ZXh0TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0RW5kID0gTWF0aC5taW4obG9nTGluZXMubGVuZ3RoIC0gMSwgaSArIGNvbnRleHRMaW5lcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGV4dExpbmVzQXJyYXkgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IGNvbnRleHRTdGFydDsgaiA8PSBjb250ZXh0RW5kOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRMaW5lc0FycmF5LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGogKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGxvZ0xpbmVzW2pdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTWF0Y2g6IGogPT09IGlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZExpbmU6IGxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0TGluZXNBcnJheVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXN1bHRDb3VudCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogcGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNYXRjaGVzOiBtYXRjaGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWF4UmVzdWx0czogbWF4UmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dExpbmVzOiBjb250ZXh0TGluZXMsXG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoOiBsb2dGaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlczogbWF0Y2hlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gc2VhcmNoIHByb2plY3QgbG9nczogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGZvcm1hdEZpbGVTaXplKGJ5dGVzOiBudW1iZXIpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB1bml0cyA9IFsnQicsICdLQicsICdNQicsICdHQiddO1xuICAgICAgICBsZXQgc2l6ZSA9IGJ5dGVzO1xuICAgICAgICBsZXQgdW5pdEluZGV4ID0gMDtcblxuICAgICAgICB3aGlsZSAoc2l6ZSA+PSAxMDI0ICYmIHVuaXRJbmRleCA8IHVuaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHNpemUgLz0gMTAyNDtcbiAgICAgICAgICAgIHVuaXRJbmRleCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGAke3NpemUudG9GaXhlZCgyKX0gJHt1bml0c1t1bml0SW5kZXhdfWA7XG4gICAgfVxufVxuIl19