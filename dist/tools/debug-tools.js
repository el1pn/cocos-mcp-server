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
const logger_1 = require("../logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
class DebugTools {
    constructor() {
        this.consoleMessages = [];
        this.maxMessages = 1000;
        this.setupConsoleCapture();
    }
    setupConsoleCapture() {
        // Intercept Editor console messages
        // Note: Editor.Message.addBroadcastListener may not be available in all versions
        // This is a placeholder for console capture implementation
        logger_1.logger.info('Console capture setup - implementation depends on Editor API availability');
    }
    addConsoleMessage(message) {
        this.consoleMessages.push(Object.assign({ timestamp: new Date().toISOString() }, message));
        // Keep only latest messages
        if (this.consoleMessages.length > this.maxMessages) {
            this.consoleMessages.shift();
        }
    }
    getTools() {
        return [
            {
                name: 'debug_console',
                description: 'Manage editor console. Actions: get_logs, clear, execute_script (run JS in scene context).',
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
                        script: {
                            type: 'string',
                            description: 'JavaScript code to execute (execute_script)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'debug_inspect',
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
                        return await this.getConsoleLogs(args.limit, args.filter);
                    case 'clear':
                        return await this.clearConsole();
                    case 'execute_script':
                        return await this.executeScript(args.script);
                    default:
                        throw new Error(`Unknown action: ${action}`);
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
    async getConsoleLogs(limit = 100, filter = 'all') {
        let logs = this.consoleMessages;
        if (filter !== 'all') {
            logs = logs.filter(log => log.type === filter);
        }
        const recentLogs = logs.slice(-limit);
        return {
            success: true,
            data: {
                total: logs.length,
                returned: recentLogs.length,
                logs: recentLogs
            }
        };
    }
    async clearConsole() {
        this.consoleMessages = [];
        try {
            // Note: Editor.Message.send may not return a promise in all versions
            Editor.Message.send('console', 'clear');
            return {
                success: true,
                message: 'Console cleared successfully'
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeScript(script) {
        // Runs in this extension's own scene script — the built-in `console` scene
        // script it used to target does not exist in 3.8.x.
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
            name: 'cocos-mcp-server',
            method: 'evalScript',
            args: [script]
        }), (result) => {
            var _a;
            return ((result === null || result === void 0 ? void 0 : result.success)
                ? { data: { result: (_a = result.data) === null || _a === void 0 ? void 0 : _a.result, message: 'Script executed successfully' } }
                : { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Script execution failed' });
        });
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
            // Filter by log level if not 'ALL'
            if (logLevel !== 'ALL') {
                filteredLines = filteredLines.filter(line => line.includes(`[${logLevel}]`) || line.includes(logLevel.toLowerCase()));
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
            let regex;
            try {
                regex = new RegExp(pattern, 'gi');
            }
            catch (_a) {
                // If pattern is not valid regex, treat as literal string
                regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
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
                    // Reset regex lastIndex for global search
                    regex.lastIndex = 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWctdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZGVidWctdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esc0NBQW1DO0FBQ25DLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0IsNERBQWtFO0FBQ2xFLDBEQUE4RDtBQUU5RCxNQUFhLFVBQVU7SUFJbkI7UUFIUSxvQkFBZSxHQUFxQixFQUFFLENBQUM7UUFDOUIsZ0JBQVcsR0FBRyxJQUFJLENBQUM7UUFHaEMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7SUFDL0IsQ0FBQztJQUVPLG1CQUFtQjtRQUN2QixvQ0FBb0M7UUFDcEMsaUZBQWlGO1FBQ2pGLDJEQUEyRDtRQUMzRCxlQUFNLENBQUMsSUFBSSxDQUFDLDJFQUEyRSxDQUFDLENBQUM7SUFDN0YsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQVk7UUFDbEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLGlCQUNyQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsSUFDaEMsT0FBTyxFQUNaLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQyxDQUFDO0lBQ0wsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFBRSw0RkFBNEY7Z0JBQ3pHLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtQkFBbUI7NEJBQ2hD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LENBQUM7WUFDYixTQUFTLEVBQUUsQ0FBQztRQUNoQixDQUFDO1FBRUQsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7SUFDcEQsQ0FBQztDQUNKO0FBdnFCRCxnQ0F1cUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBDb25zb2xlTWVzc2FnZSwgVmFsaWRhdGlvblJlc3VsdCwgVmFsaWRhdGlvbklzc3VlIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcbmltcG9ydCB7IHJlc29sdmVOb2RlUmVmRmllbGRzIH0gZnJvbSAnLi4vdXRpbHMvbm9kZS1yZXNvbHZlcic7XG5cbmV4cG9ydCBjbGFzcyBEZWJ1Z1Rvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIGNvbnNvbGVNZXNzYWdlczogQ29uc29sZU1lc3NhZ2VbXSA9IFtdO1xuICAgIHByaXZhdGUgcmVhZG9ubHkgbWF4TWVzc2FnZXMgPSAxMDAwO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc2V0dXBDb25zb2xlQ2FwdHVyZSgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBDb25zb2xlQ2FwdHVyZSgpOiB2b2lkIHtcbiAgICAgICAgLy8gSW50ZXJjZXB0IEVkaXRvciBjb25zb2xlIG1lc3NhZ2VzXG4gICAgICAgIC8vIE5vdGU6IEVkaXRvci5NZXNzYWdlLmFkZEJyb2FkY2FzdExpc3RlbmVyIG1heSBub3QgYmUgYXZhaWxhYmxlIGluIGFsbCB2ZXJzaW9uc1xuICAgICAgICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgZm9yIGNvbnNvbGUgY2FwdHVyZSBpbXBsZW1lbnRhdGlvblxuICAgICAgICBsb2dnZXIuaW5mbygnQ29uc29sZSBjYXB0dXJlIHNldHVwIC0gaW1wbGVtZW50YXRpb24gZGVwZW5kcyBvbiBFZGl0b3IgQVBJIGF2YWlsYWJpbGl0eScpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYWRkQ29uc29sZU1lc3NhZ2UobWVzc2FnZTogYW55KTogdm9pZCB7XG4gICAgICAgIHRoaXMuY29uc29sZU1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAuLi5tZXNzYWdlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEtlZXAgb25seSBsYXRlc3QgbWVzc2FnZXNcbiAgICAgICAgaWYgKHRoaXMuY29uc29sZU1lc3NhZ2VzLmxlbmd0aCA+IHRoaXMubWF4TWVzc2FnZXMpIHtcbiAgICAgICAgICAgIHRoaXMuY29uc29sZU1lc3NhZ2VzLnNoaWZ0KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGVidWdfY29uc29sZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgZWRpdG9yIGNvbnNvbGUuIEFjdGlvbnM6IGdldF9sb2dzLCBjbGVhciwgZXhlY3V0ZV9zY3JpcHQgKHJ1biBKUyBpbiBzY2VuZSBjb250ZXh0KS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9sb2dzJywgJ2NsZWFyJywgJ2V4ZWN1dGVfc2NyaXB0J11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIHJlY2VudCBsb2dzIHRvIHJldHJpZXZlIChnZXRfbG9ncyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGxvZ3MgYnkgdHlwZSAoZ2V0X2xvZ3MpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FsbCcsICdsb2cnLCAnd2FybicsICdlcnJvcicsICdpbmZvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0phdmFTY3JpcHQgY29kZSB0byBleGVjdXRlIChleGVjdXRlX3NjcmlwdCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGVidWdfaW5zcGVjdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbnNwZWN0L3ZhbGlkYXRlIHNjZW5lLiBBY3Rpb25zOiBnZXRfbm9kZV90cmVlLCBnZXRfcGVyZm9ybWFuY2Vfc3RhdHMsIHZhbGlkYXRlX3NjZW5lLCBnZXRfZWRpdG9yX2luZm8sIHByb2JlX2NjZV9hcGkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfbm9kZV90cmVlJywgJ2dldF9wZXJmb3JtYW5jZV9zdGF0cycsICd2YWxpZGF0ZV9zY2VuZScsICdnZXRfZWRpdG9yX2luZm8nLCAncHJvYmVfY2NlX2FwaSddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcm9vdFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jvb3Qgbm9kZSBVVUlEIChhY3Rpb246IGdldF9ub2RlX3RyZWUsIG9wdGlvbmFsLCB1c2VzIHNjZW5lIHJvb3QgaWYgbm90IHByb3ZpZGVkKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2U6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ludGVybmFsIGNjZS48bmFtZXNwYWNlPiBlbmdpbmUgbWFuYWdlciB0byBsaXN0IG1ldGhvZHMgZm9yLCBlLmcuIFwiUHJlZmFiXCIsIFwiTm9kZVwiLCBcIlNjZW5lXCIgKHByb2JlX2NjZV9hcGksIG9wdGlvbmFsLCBkZWZhdWx0IFwiUHJlZmFiXCIpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgdG8gaW5zcGVjdCBmb3IgYSBsaXZlIFByZWZhYkluZm8gbGluayAocHJvYmVfY2NlX2FwaSwgb3B0aW9uYWwpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heERlcHRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXhpbXVtIHRyZWUgZGVwdGggKGdldF9ub2RlX3RyZWUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrTWlzc2luZ0Fzc2V0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGZvciBtaXNzaW5nIGFzc2V0IHJlZmVyZW5jZXMgKHZhbGlkYXRlX3NjZW5lKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrTWlzc2luZ1NjcmlwdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBmb3IgY29tcG9uZW50cyB3aG9zZSBzY3JpcHQgZmFpbGVkIHRvIGxvYWQgKHN1cmZhY2VzIGFzIGNjLk1pc3NpbmdTY3JpcHQpICh2YWxpZGF0ZV9zY2VuZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja1BlcmZvcm1hbmNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgZm9yIHBlcmZvcm1hbmNlIGlzc3VlcyAodmFsaWRhdGVfc2NlbmUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGVidWdfbG9ncycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgcHJvamVjdCBsb2cgZmlsZXMgKHRlbXAvbG9ncy9wcm9qZWN0LmxvZykuIEFjdGlvbnM6IGdldF9wcm9qZWN0X2xvZ3MsIGdldF9sb2dfZmlsZV9pbmZvLCBzZWFyY2hfbG9ncy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9wcm9qZWN0X2xvZ3MnLCAnZ2V0X2xvZ19maWxlX2luZm8nLCAnc2VhcmNoX2xvZ3MnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgbGluZXMgdG8gcmVhZCBmcm9tIHRoZSBlbmQgb2YgdGhlIGxvZyBmaWxlIChnZXRfcHJvamVjdF9sb2dzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMTAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwMDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJLZXl3b3JkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgbG9ncyBjb250YWluaW5nIHNwZWNpZmljIGtleXdvcmQgKGdldF9wcm9qZWN0X2xvZ3MpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ0xldmVsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgYnkgbG9nIGxldmVsIChnZXRfcHJvamVjdF9sb2dzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydFUlJPUicsICdXQVJOJywgJ0lORk8nLCAnREVCVUcnLCAnVFJBQ0UnLCAnQUxMJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ0FMTCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZWFyY2ggcGF0dGVybiwgc3VwcG9ydHMgcmVnZXggKHNlYXJjaF9sb2dzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXhpbXVtIG51bWJlciBvZiBtYXRjaGluZyByZXN1bHRzIChzZWFyY2hfbG9ncyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGV4dExpbmVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgY29udGV4dCBsaW5lcyB0byBzaG93IGFyb3VuZCBlYWNoIG1hdGNoIChzZWFyY2hfbG9ncyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIEJvdGggYXJlIHNjZW5lLW5vZGUgcmVmZXJlbmNlcywgc28gYWNjZXB0IGEgcGF0aCBvciBhIG5hbWUgdG9vLlxuICAgICAgICBjb25zdCB1bnJlc29sdmVkID0gYXdhaXQgcmVzb2x2ZU5vZGVSZWZGaWVsZHMoYXJncywgWydub2RlVXVpZCcsICdyb290VXVpZCddKTtcbiAgICAgICAgaWYgKHVucmVzb2x2ZWQpIHsgcmV0dXJuIHVucmVzb2x2ZWQ7IH1cblxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Z19jb25zb2xlJzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9sb2dzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbnNvbGVMb2dzKGFyZ3MubGltaXQsIGFyZ3MuZmlsdGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2xlYXInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2xlYXJDb25zb2xlKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVTY3JpcHQoYXJncy5zY3JpcHQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbjogJHthY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVidWdfaW5zcGVjdCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfbm9kZV90cmVlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldE5vZGVUcmVlKGFyZ3Mucm9vdFV1aWQsIGFyZ3MubWF4RGVwdGgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfcGVyZm9ybWFuY2Vfc3RhdHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UGVyZm9ybWFuY2VTdGF0cygpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9zY2VuZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZVNjZW5lKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfZWRpdG9yX2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0RWRpdG9ySW5mbygpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdwcm9iZV9jY2VfYXBpJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnByb2JlQ2NlQXBpKGFyZ3MubmFtZXNwYWNlLCBhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnZGVidWdfbG9ncyc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfcHJvamVjdF9sb2dzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RMb2dzKGFyZ3MubGluZXMsIGFyZ3MuZmlsdGVyS2V5d29yZCwgYXJncy5sb2dMZXZlbCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9sb2dfZmlsZV9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldExvZ0ZpbGVJbmZvKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NlYXJjaF9sb2dzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaFByb2plY3RMb2dzKGFyZ3MucGF0dGVybiwgYXJncy5tYXhSZXN1bHRzLCBhcmdzLmNvbnRleHRMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldENvbnNvbGVMb2dzKGxpbWl0OiBudW1iZXIgPSAxMDAsIGZpbHRlcjogc3RyaW5nID0gJ2FsbCcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBsZXQgbG9ncyA9IHRoaXMuY29uc29sZU1lc3NhZ2VzO1xuXG4gICAgICAgIGlmIChmaWx0ZXIgIT09ICdhbGwnKSB7XG4gICAgICAgICAgICBsb2dzID0gbG9ncy5maWx0ZXIobG9nID0+IGxvZy50eXBlID09PSBmaWx0ZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVjZW50TG9ncyA9IGxvZ3Muc2xpY2UoLWxpbWl0KTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICB0b3RhbDogbG9ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgcmV0dXJuZWQ6IHJlY2VudExvZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGxvZ3M6IHJlY2VudExvZ3NcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNsZWFyQ29uc29sZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0aGlzLmNvbnNvbGVNZXNzYWdlcyA9IFtdO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBOb3RlOiBFZGl0b3IuTWVzc2FnZS5zZW5kIG1heSBub3QgcmV0dXJuIGEgcHJvbWlzZSBpbiBhbGwgdmVyc2lvbnNcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnNlbmQoJ2NvbnNvbGUnLCAnY2xlYXInKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQ29uc29sZSBjbGVhcmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY3JpcHQoc2NyaXB0OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBSdW5zIGluIHRoaXMgZXh0ZW5zaW9uJ3Mgb3duIHNjZW5lIHNjcmlwdCDigJQgdGhlIGJ1aWx0LWluIGBjb25zb2xlYCBzY2VuZVxuICAgICAgICAvLyBzY3JpcHQgaXQgdXNlZCB0byB0YXJnZXQgZG9lcyBub3QgZXhpc3QgaW4gMy44LnguXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55Pignc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2V2YWxTY3JpcHQnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtzY3JpcHRdXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIChyZXN1bHQpID0+IChyZXN1bHQ/LnN1Y2Nlc3NcbiAgICAgICAgICAgICAgICA/IHsgZGF0YTogeyByZXN1bHQ6IHJlc3VsdC5kYXRhPy5yZXN1bHQsIG1lc3NhZ2U6ICdTY3JpcHQgZXhlY3V0ZWQgc3VjY2Vzc2Z1bGx5JyB9IH1cbiAgICAgICAgICAgICAgICA6IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdTY3JpcHQgZXhlY3V0aW9uIGZhaWxlZCcgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHByb2JlQ2NlQXBpKG5hbWVzcGFjZT86IHN0cmluZywgbm9kZVV1aWQ/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAncHJvYmVDY2VBcGknLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtuYW1lc3BhY2UsIG5vZGVVdWlkXVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAocmVzdWx0OiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0Py5kYXRhID8/IHJlc3VsdCxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnY2NlIEFQSSBwcm9iZSBjb21wbGV0ZSdcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXROb2RlVHJlZShyb290VXVpZD86IHN0cmluZywgbWF4RGVwdGg6IG51bWJlciA9IDEwKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgYnVpbGRUcmVlID0gYXN5bmMgKG5vZGVVdWlkOiBzdHJpbmcsIGRlcHRoOiBudW1iZXIgPSAwKTogUHJvbWlzZTxhbnk+ID0+IHtcbiAgICAgICAgICAgIGlmIChkZXB0aCA+PSBtYXhEZXB0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHRydW5jYXRlZDogdHJ1ZSB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZURhdGEudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZURhdGEubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlRGF0YS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IChub2RlRGF0YSBhcyBhbnkpLmNvbXBvbmVudHMgPyAobm9kZURhdGEgYXMgYW55KS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLl9fdHlwZV9fKSA6IFtdLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZENvdW50OiBub2RlRGF0YS5jaGlsZHJlbiA/IG5vZGVEYXRhLmNoaWxkcmVuLmxlbmd0aCA6IDAsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXSBhcyBhbnlbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZURhdGEuY2hpbGRyZW4gJiYgbm9kZURhdGEuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkSWQgb2Ygbm9kZURhdGEuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkVHJlZSA9IGF3YWl0IGJ1aWxkVHJlZShjaGlsZElkLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJlZS5jaGlsZHJlbi5wdXNoKGNoaWxkVHJlZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJlZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHJvb3RVdWlkKSB7XG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgYnVpbGRUcmVlKHJvb3RVdWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRyZWUgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBoaWVyYXJjaHk6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgY29uc3Qgcm9vdHMgPSBBcnJheS5pc0FycmF5KGhpZXJhcmNoeSkgPyBoaWVyYXJjaHkgOiAoaGllcmFyY2h5Py5jaGlsZHJlbiB8fCBbXSk7XG4gICAgICAgICAgICBjb25zdCB0cmVlcyA9IFtdO1xuICAgICAgICAgICAgZm9yIChjb25zdCByb290Tm9kZSBvZiByb290cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBidWlsZFRyZWUocm9vdE5vZGUudXVpZCk7XG4gICAgICAgICAgICAgICAgdHJlZXMucHVzaCh0cmVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRyZWVzIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFBlcmZvcm1hbmNlU3RhdHMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gQ29jb3MgMy44LnggZG9lcyBub3QgZXhwb3NlIGEgc2NlbmUgcGVyZm9ybWFuY2UgcXVlcnkgaW4gdGhlIGVkaXRvci5cbiAgICAgICAgLy8gUmV0dXJuIGEgc3R1YiBzbyB0aGUgdG9vbCBkb2VzIG5vdCB0aHJvdyBcIk1lc3NhZ2UgZG9lcyBub3QgZXhpc3RcIi5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1BlcmZvcm1hbmNlIHN0YXRzIG5vdCBhdmFpbGFibGUgaW4gZWRpdG9yIChubyBwdWJsaWMgQVBJIGluIENvY29zIDMuOC54KSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlU2NlbmUob3B0aW9uczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgaXNzdWVzOiBWYWxpZGF0aW9uSXNzdWVbXSA9IFtdO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgbWlzc2luZyBhc3NldHNcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNoZWNrTWlzc2luZ0Fzc2V0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1pc3Npbmc6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGVzLW1pc3MtYXNzZXRzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbWlzc2luZ0xpc3QgPSBBcnJheS5pc0FycmF5KG1pc3NpbmcpID8gbWlzc2luZyA6IChtaXNzaW5nPy5taXNzaW5nIHx8IFtdKTtcbiAgICAgICAgICAgICAgICBpZiAobWlzc2luZ0xpc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ2Fzc2V0cycsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHttaXNzaW5nTGlzdC5sZW5ndGh9IG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBtaXNzaW5nTGlzdFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBwZXJmb3JtYW5jZSBpc3N1ZXNcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNoZWNrUGVyZm9ybWFuY2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHk6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJvb3RzID0gQXJyYXkuaXNBcnJheShoaWVyYXJjaHkpID8gaGllcmFyY2h5IDogKGhpZXJhcmNoeT8uY2hpbGRyZW4gfHwgW10pO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVDb3VudCA9IHRoaXMuY291bnROb2Rlcyhyb290cyk7XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZUNvdW50ID4gMTAwMCkge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnd2FybmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogJ3BlcmZvcm1hbmNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBIaWdoIG5vZGUgY291bnQ6ICR7bm9kZUNvdW50fSBub2RlcyAocmVjb21tZW5kZWQgPCAxMDAwKWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiAnQ29uc2lkZXIgdXNpbmcgb2JqZWN0IHBvb2xpbmcgb3Igc2NlbmUgb3B0aW1pemF0aW9uJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciBjb21wb25lbnRzIHdob3NlIHNjcmlwdCBmYWlsZWQgdG8gbG9hZCAocmVuYW1lZC9kZWxldGVkL2NvbXBpbGUgZXJyb3IpLlxuICAgICAgICAgICAgLy8gVGhlIGVuZ2luZSBzd2FwcyBzdWNoIGEgY29tcG9uZW50J3MgcnVudGltZSBjbGFzcyB0byBjYy5NaXNzaW5nU2NyaXB0IChjaWQgJ2NjLk1pc3NpbmdTY3JpcHQnKS5cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmNoZWNrTWlzc2luZ1NjcmlwdHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtaXNzaW5nU2NyaXB0cyA9IGF3YWl0IHRoaXMuZmluZE1pc3NpbmdTY3JpcHRDb21wb25lbnRzKCk7XG4gICAgICAgICAgICAgICAgaWYgKG1pc3NpbmdTY3JpcHRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6ICdzY3JpcHRzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke21pc3NpbmdTY3JpcHRzLmxlbmd0aH0gY29tcG9uZW50KHMpIHdpdGggbWlzc2luZyBzY3JpcHRgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczogbWlzc2luZ1NjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiAnVGhlIG9yaWdpbmFsIHNjcmlwdCBhc3NldCB3YXMgZGVsZXRlZCwgcmVuYW1lZCwgb3IgZmFpbGVkIHRvIGNvbXBpbGUuIFJlLWFkZCB0aGUgc2NyaXB0IG9yIHJlbW92ZSB0aGUgY29tcG9uZW50LidcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IFZhbGlkYXRpb25SZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgdmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICAgICAgaXNzdWVDb3VudDogaXNzdWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBpc3N1ZXM6IGlzc3Vlc1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNvdW50Tm9kZXMobm9kZXM6IGFueVtdKTogbnVtYmVyIHtcbiAgICAgICAgbGV0IGNvdW50ID0gbm9kZXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY291bnQgKz0gdGhpcy5jb3VudE5vZGVzKG5vZGUuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZpbmRNaXNzaW5nU2NyaXB0Q29tcG9uZW50cygpOiBQcm9taXNlPEFycmF5PHsgbm9kZVV1aWQ6IHN0cmluZzsgbm9kZU5hbWU6IHN0cmluZzsgY29tcG9uZW50SW5kZXg6IG51bWJlciB9Pj4ge1xuICAgICAgICBjb25zdCBub2RlVHJlZSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICBpZiAoIW5vZGVUcmVlKSByZXR1cm4gW107XG5cbiAgICAgICAgY29uc3Qgbm9kZVV1aWRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBxdWV1ZTogYW55W10gPSBbbm9kZVRyZWVdO1xuICAgICAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAobm9kZT8udXVpZCkgbm9kZVV1aWRzLnB1c2gobm9kZS51dWlkKTtcbiAgICAgICAgICAgIGlmIChub2RlPy5jaGlsZHJlbikgcXVldWUucHVzaCguLi5ub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PHsgbm9kZVV1aWQ6IHN0cmluZzsgbm9kZU5hbWU6IHN0cmluZzsgY29tcG9uZW50SW5kZXg6IG51bWJlciB9PiA9IFtdO1xuICAgICAgICBjb25zdCBCQVRDSCA9IDEwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVVdWlkcy5sZW5ndGg7IGkgKz0gQkFUQ0gpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gbm9kZVV1aWRzLnNsaWNlKGksIGkgKyBCQVRDSCk7XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YXMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgdXVpZCkuY2F0Y2goKCkgPT4gbnVsbCkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBub2RlRGF0YXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IG5vZGVEYXRhc1tqXSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlRGF0YT8uX19jb21wc19fKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlVXVpZCA9IGJhdGNoW2pdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVOYW1lID0gbm9kZURhdGEubmFtZT8udmFsdWUgPz8gbm9kZURhdGEubmFtZSA/PyBub2RlVXVpZDtcbiAgICAgICAgICAgICAgICBub2RlRGF0YS5fX2NvbXBzX18uZm9yRWFjaCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gY29tcD8uX190eXBlX18gfHwgY29tcD8uY2lkIHx8IGNvbXA/LnR5cGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wVHlwZSA9PT0gJ2NjLk1pc3NpbmdTY3JpcHQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyBub2RlVXVpZCwgbm9kZU5hbWU6IFN0cmluZyhub2RlTmFtZSksIGNvbXBvbmVudEluZGV4OiBpbmRleCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRFZGl0b3JJbmZvKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGluZm8gPSB7XG4gICAgICAgICAgICBlZGl0b3I6IHtcbiAgICAgICAgICAgICAgICAvLyBgRWRpdG9yLnZlcnNpb25zYCBkb2VzIG5vdCBleGlzdDsgdGhlIHZlcnNpb24gbGl2ZXMgb24gRWRpdG9yLkFwcC5cbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiAoRWRpdG9yIGFzIGFueSkuQXBwPy52ZXJzaW9uIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybTogcHJvY2Vzcy5wbGF0Zm9ybSxcbiAgICAgICAgICAgICAgICBhcmNoOiBwcm9jZXNzLmFyY2gsXG4gICAgICAgICAgICAgICAgbm9kZVZlcnNpb246IHByb2Nlc3MudmVyc2lvblxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByb2plY3Q6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBFZGl0b3IuUHJvamVjdC5uYW1lLFxuICAgICAgICAgICAgICAgIHBhdGg6IEVkaXRvci5Qcm9qZWN0LnBhdGgsXG4gICAgICAgICAgICAgICAgdXVpZDogRWRpdG9yLlByb2plY3QudXVpZFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1lbW9yeTogcHJvY2Vzcy5tZW1vcnlVc2FnZSgpLFxuICAgICAgICAgICAgdXB0aW1lOiBwcm9jZXNzLnVwdGltZSgpXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaW5mbyB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJvamVjdExvZ3MobGluZXM6IG51bWJlciA9IDEwMCwgZmlsdGVyS2V5d29yZD86IHN0cmluZywgbG9nTGV2ZWw6IHN0cmluZyA9ICdBTEwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwb3NzaWJsZSBwcm9qZWN0IHBhdGhzXG4gICAgICAgICAgICBsZXQgbG9nRmlsZVBhdGggPSAnJztcbiAgICAgICAgICAgIGNvbnN0IHBvc3NpYmxlUGF0aHMgPSBbXG4gICAgICAgICAgICAgICAgRWRpdG9yLlByb2plY3QgPyBFZGl0b3IuUHJvamVjdC5wYXRoIDogbnVsbCxcbiAgICAgICAgICAgICAgICAnL1VzZXJzL2xpemhpeW9uZy9OZXdQcm9qZWN0XzMnLFxuICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBdLmZpbHRlcihwID0+IHAgIT09IG51bGwpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGJhc2VQYXRoIG9mIHBvc3NpYmxlUGF0aHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXN0UGF0aCA9IHBhdGguam9pbihiYXNlUGF0aCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpO1xuICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3RQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dGaWxlUGF0aCA9IHRlc3RQYXRoO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbG9nRmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9qZWN0IGxvZyBmaWxlIG5vdCBmb3VuZC4gVHJpZWQgcGF0aHM6ICR7cG9zc2libGVQYXRocy5tYXAocCA9PiBwYXRoLmpvaW4ocCwgJ3RlbXAvbG9ncy9wcm9qZWN0LmxvZycpKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZWFkIHRoZSBmaWxlIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IGxvZ0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMobG9nRmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCBsb2dMaW5lcyA9IGxvZ0NvbnRlbnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG5cbiAgICAgICAgICAgIC8vIEdldCB0aGUgbGFzdCBOIGxpbmVzXG4gICAgICAgICAgICBjb25zdCByZWNlbnRMaW5lcyA9IGxvZ0xpbmVzLnNsaWNlKC1saW5lcyk7XG5cbiAgICAgICAgICAgIC8vIEFwcGx5IGZpbHRlcnNcbiAgICAgICAgICAgIGxldCBmaWx0ZXJlZExpbmVzID0gcmVjZW50TGluZXM7XG5cbiAgICAgICAgICAgIC8vIEZpbHRlciBieSBsb2cgbGV2ZWwgaWYgbm90ICdBTEwnXG4gICAgICAgICAgICBpZiAobG9nTGV2ZWwgIT09ICdBTEwnKSB7XG4gICAgICAgICAgICAgICAgZmlsdGVyZWRMaW5lcyA9IGZpbHRlcmVkTGluZXMuZmlsdGVyKGxpbmUgPT5cbiAgICAgICAgICAgICAgICAgICAgbGluZS5pbmNsdWRlcyhgWyR7bG9nTGV2ZWx9XWApIHx8IGxpbmUuaW5jbHVkZXMobG9nTGV2ZWwudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkga2V5d29yZCBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGZpbHRlcktleXdvcmQpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZExpbmVzID0gZmlsdGVyZWRMaW5lcy5maWx0ZXIobGluZSA9PlxuICAgICAgICAgICAgICAgICAgICBsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoZmlsdGVyS2V5d29yZC50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTGluZXM6IGxvZ0xpbmVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdGVkTGluZXM6IGxpbmVzLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZExpbmVzOiBmaWx0ZXJlZExpbmVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbG9nTGV2ZWw6IGxvZ0xldmVsLFxuICAgICAgICAgICAgICAgICAgICBmaWx0ZXJLZXl3b3JkOiBmaWx0ZXJLZXl3b3JkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGxvZ3M6IGZpbHRlcmVkTGluZXMsXG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoOiBsb2dGaWxlUGF0aFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVhZCBwcm9qZWN0IGxvZ3M6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRMb2dGaWxlSW5mbygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHByb2plY3QgcGF0aHNcbiAgICAgICAgICAgIGxldCBsb2dGaWxlUGF0aCA9ICcnO1xuICAgICAgICAgICAgY29uc3QgcG9zc2libGVQYXRocyA9IFtcbiAgICAgICAgICAgICAgICBFZGl0b3IuUHJvamVjdCA/IEVkaXRvci5Qcm9qZWN0LnBhdGggOiBudWxsLFxuICAgICAgICAgICAgICAgICcvVXNlcnMvbGl6aGl5b25nL05ld1Byb2plY3RfMycsXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcbiAgICAgICAgICAgIF0uZmlsdGVyKHAgPT4gcCAhPT0gbnVsbCk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYmFzZVBhdGggb2YgcG9zc2libGVQYXRocykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCAndGVtcC9sb2dzL3Byb2plY3QubG9nJyk7XG4gICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoID0gdGVzdFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFsb2dGaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb2plY3QgbG9nIGZpbGUgbm90IGZvdW5kLiBUcmllZCBwYXRoczogJHtwb3NzaWJsZVBhdGhzLm1hcChwID0+IHBhdGguam9pbihwLCAndGVtcC9sb2dzL3Byb2plY3QubG9nJykpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMobG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgbG9nQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dGaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVDb3VudCA9IGxvZ0NvbnRlbnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJykubGVuZ3RoO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogbG9nRmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBzdGF0cy5zaXplLFxuICAgICAgICAgICAgICAgICAgICBmaWxlU2l6ZUZvcm1hdHRlZDogdGhpcy5mb3JtYXRGaWxlU2l6ZShzdGF0cy5zaXplKSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdE1vZGlmaWVkOiBzdGF0cy5tdGltZS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBsaW5lQ291bnQ6IGxpbmVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZDogc3RhdHMuYmlydGh0aW1lLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgIGFjY2Vzc2libGU6IGZzLmNvbnN0YW50cy5SX09LXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgbG9nIGZpbGUgaW5mbzogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaFByb2plY3RMb2dzKHBhdHRlcm46IHN0cmluZywgbWF4UmVzdWx0czogbnVtYmVyID0gMjAsIGNvbnRleHRMaW5lczogbnVtYmVyID0gMik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcHJvamVjdCBwYXRoc1xuICAgICAgICAgICAgbGV0IGxvZ0ZpbGVQYXRoID0gJyc7XG4gICAgICAgICAgICBjb25zdCBwb3NzaWJsZVBhdGhzID0gW1xuICAgICAgICAgICAgICAgIEVkaXRvci5Qcm9qZWN0ID8gRWRpdG9yLlByb2plY3QucGF0aCA6IG51bGwsXG4gICAgICAgICAgICAgICAgJy9Vc2Vycy9saXpoaXlvbmcvTmV3UHJvamVjdF8zJyxcbiAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgXS5maWx0ZXIocCA9PiBwICE9PSBudWxsKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBiYXNlUGF0aCBvZiBwb3NzaWJsZVBhdGhzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVzdFBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKTtcbiAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0UGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nRmlsZVBhdGggPSB0ZXN0UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWxvZ0ZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvamVjdCBsb2cgZmlsZSBub3QgZm91bmQuIFRyaWVkIHBhdGhzOiAke3Bvc3NpYmxlUGF0aHMubWFwKHAgPT4gcGF0aC5qb2luKHAsICd0ZW1wL2xvZ3MvcHJvamVjdC5sb2cnKSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbG9nQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhsb2dGaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxvZ0xpbmVzID0gbG9nQ29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSByZWdleCBwYXR0ZXJuIChzdXBwb3J0IGJvdGggc3RyaW5nIGFuZCByZWdleCBwYXR0ZXJucylcbiAgICAgICAgICAgIGxldCByZWdleDogUmVnRXhwO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybiwgJ2dpJyk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBwYXR0ZXJuIGlzIG5vdCB2YWxpZCByZWdleCwgdHJlYXQgYXMgbGl0ZXJhbCBzdHJpbmdcbiAgICAgICAgICAgICAgICByZWdleCA9IG5ldyBSZWdFeHAocGF0dGVybi5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgJ1xcXFwkJicpLCAnZ2knKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgbWF0Y2hlczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCByZXN1bHRDb3VudCA9IDA7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9nTGluZXMubGVuZ3RoICYmIHJlc3VsdENvdW50IDwgbWF4UmVzdWx0czsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGxvZ0xpbmVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChyZWdleC50ZXN0KGxpbmUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBjb250ZXh0IGxpbmVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHRTdGFydCA9IE1hdGgubWF4KDAsIGkgLSBjb250ZXh0TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0RW5kID0gTWF0aC5taW4obG9nTGluZXMubGVuZ3RoIC0gMSwgaSArIGNvbnRleHRMaW5lcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGV4dExpbmVzQXJyYXkgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IGNvbnRleHRTdGFydDsgaiA8PSBjb250ZXh0RW5kOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRleHRMaW5lc0FycmF5LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGogKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGxvZ0xpbmVzW2pdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTWF0Y2g6IGogPT09IGlcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZExpbmU6IGxpbmUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiBjb250ZXh0TGluZXNBcnJheVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXN1bHRDb3VudCsrO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlc2V0IHJlZ2V4IGxhc3RJbmRleCBmb3IgZ2xvYmFsIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICByZWdleC5sYXN0SW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogcGF0dGVybixcbiAgICAgICAgICAgICAgICAgICAgdG90YWxNYXRjaGVzOiBtYXRjaGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWF4UmVzdWx0czogbWF4UmVzdWx0cyxcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dExpbmVzOiBjb250ZXh0TGluZXMsXG4gICAgICAgICAgICAgICAgICAgIGxvZ0ZpbGVQYXRoOiBsb2dGaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlczogbWF0Y2hlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gc2VhcmNoIHByb2plY3QgbG9nczogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGZvcm1hdEZpbGVTaXplKGJ5dGVzOiBudW1iZXIpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCB1bml0cyA9IFsnQicsICdLQicsICdNQicsICdHQiddO1xuICAgICAgICBsZXQgc2l6ZSA9IGJ5dGVzO1xuICAgICAgICBsZXQgdW5pdEluZGV4ID0gMDtcblxuICAgICAgICB3aGlsZSAoc2l6ZSA+PSAxMDI0ICYmIHVuaXRJbmRleCA8IHVuaXRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHNpemUgLz0gMTAyNDtcbiAgICAgICAgICAgIHVuaXRJbmRleCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGAke3NpemUudG9GaXhlZCgyKX0gJHt1bml0c1t1bml0SW5kZXhdfWA7XG4gICAgfVxufVxuIl19