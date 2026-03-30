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
exports.MCPServer = void 0;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const logger_1 = require("./logger");
const scene_tools_1 = require("./tools/scene-tools");
const node_tools_1 = require("./tools/node-tools");
const component_tools_1 = require("./tools/component-tools");
const prefab_tools_1 = require("./tools/prefab-tools");
const project_tools_1 = require("./tools/project-tools");
const debug_tools_1 = require("./tools/debug-tools");
const preferences_tools_1 = require("./tools/preferences-tools");
const server_tools_1 = require("./tools/server-tools");
const broadcast_tools_1 = require("./tools/broadcast-tools");
const scene_advanced_tools_1 = require("./tools/scene-advanced-tools");
const scene_view_tools_1 = require("./tools/scene-view-tools");
const reference_image_tools_1 = require("./tools/reference-image-tools");
const asset_advanced_tools_1 = require("./tools/asset-advanced-tools");
const validation_tools_1 = require("./tools/validation-tools");
const batch_tools_1 = require("./tools/batch-tools");
const search_tools_1 = require("./tools/search-tools");
const editor_tools_1 = require("./tools/editor-tools");
const animation_tools_1 = require("./tools/animation-tools");
const material_tools_1 = require("./tools/material-tools");
class MCPServer {
    constructor(settings) {
        this.httpServer = null;
        this.clients = new Map();
        this.tools = {};
        this.toolsList = [];
        this.toolExecutors = new Map();
        this.toolQueue = [];
        this.activeToolCount = 0;
        this.settings = settings;
        this.initializeTools();
    }
    initializeTools() {
        try {
            logger_1.logger.info('Initializing tools...');
            this.tools.scene = new scene_tools_1.SceneTools();
            this.tools.node = new node_tools_1.NodeTools();
            this.tools.component = new component_tools_1.ComponentTools();
            this.tools.prefab = new prefab_tools_1.PrefabTools();
            this.tools.project = new project_tools_1.ProjectTools();
            this.tools.debug = new debug_tools_1.DebugTools();
            this.tools.preferences = new preferences_tools_1.PreferencesTools();
            this.tools.server = new server_tools_1.ServerTools();
            this.tools.broadcast = new broadcast_tools_1.BroadcastTools();
            this.tools.sceneAdvanced = new scene_advanced_tools_1.SceneAdvancedTools();
            this.tools.sceneView = new scene_view_tools_1.SceneViewTools();
            this.tools.referenceImage = new reference_image_tools_1.ReferenceImageTools();
            this.tools.assetAdvanced = new asset_advanced_tools_1.AssetAdvancedTools();
            this.tools.validation = new validation_tools_1.ValidationTools();
            this.tools.batch = new batch_tools_1.BatchTools(this.executeToolCall.bind(this));
            this.tools.search = new search_tools_1.SearchTools();
            this.tools.editor = new editor_tools_1.EditorTools();
            this.tools.animation = new animation_tools_1.AnimationTools();
            this.tools.material = new material_tools_1.MaterialTools();
            logger_1.logger.success('Tools initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error initializing tools: ${error}`);
            throw error;
        }
    }
    async start() {
        if (this.httpServer) {
            logger_1.logger.info('Server is already running');
            return;
        }
        let port = this.settings.port;
        let lastError;
        for (let attempt = 0; attempt < MCPServer.MAX_PORT_RETRIES; attempt++) {
            try {
                await this.tryListen(port);
                if (port !== this.settings.port) {
                    logger_1.logger.warn(`Original port ${this.settings.port} was in use, bound to ${port} instead`);
                }
                this.settings.port = port;
                this.setupTools();
                logger_1.logger.success('MCP Server is ready for connections');
                return;
            }
            catch (err) {
                lastError = err;
                if (err.code === 'EADDRINUSE') {
                    logger_1.logger.warn(`Port ${port} in use, trying ${port + 1}...`);
                    port++;
                }
                else {
                    break;
                }
            }
        }
        logger_1.logger.error(`Failed to start server: ${lastError}`);
        throw lastError;
    }
    tryListen(port) {
        return new Promise((resolve, reject) => {
            const server = http.createServer(this.handleHttpRequest.bind(this));
            server.listen(port, '127.0.0.1', () => {
                this.httpServer = server;
                logger_1.logger.success(`HTTP server started on http://127.0.0.1:${port}`);
                logger_1.logger.info(`Health check: http://127.0.0.1:${port}/health`);
                logger_1.logger.info(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
                resolve();
            });
            server.on('error', (err) => {
                server.close();
                reject(err);
            });
        });
    }
    setupTools() {
        this.toolsList = [];
        this.toolExecutors.clear();
        for (const [_category, toolSet] of Object.entries(this.tools)) {
            const tools = toolSet.getTools();
            for (const tool of tools) {
                this.toolsList.push({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema
                });
                this.toolExecutors.set(tool.name, (args) => toolSet.execute(tool.name, args));
            }
        }
        logger_1.logger.info(`Setup tools: ${this.toolsList.length} tools available`);
    }
    async executeToolCall(toolName, args) {
        const normalizedArgs = this.normalizeToolArguments(args);
        const executor = this.toolExecutors.get(toolName);
        if (executor) {
            return await executor(normalizedArgs);
        }
        // Fallback: try to find the tool in any executor
        for (const [_category, toolSet] of Object.entries(this.tools)) {
            const tools = toolSet.getTools();
            if (tools.some((t) => t.name === toolName)) {
                return await toolSet.execute(toolName, normalizedArgs);
            }
        }
        throw new Error(`Tool ${toolName} not found`);
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getAvailableTools() {
        return this.toolsList;
    }
    getSettings() {
        return this.settings;
    }
    getLogger() {
        return logger_1.logger;
    }
    async handleHttpRequest(req, res) {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        try {
            if (pathname === '/mcp' && req.method === 'POST') {
                await this.handleMCPRequest(req, res);
            }
            else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            }
            else if ((pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/api/')) && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            }
            else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            }
            else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        }
        catch (error) {
            logger_1.logger.error(`HTTP request error: ${error}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async handleMCPRequest(req, res) {
        this.readRequestBody(req)
            .then(async (body) => {
            var _a;
            try {
                // Enhanced JSON parsing with better error handling
                let message;
                try {
                    message = JSON.parse(body);
                }
                catch (parseError) {
                    if (!this.shouldTryFixJson(body)) {
                        throw new Error(`JSON parsing failed: ${parseError.message}. Original body: ${body.substring(0, 500)}...`);
                    }
                    // Try to fix common JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    message = JSON.parse(fixedBody);
                }
                // MCP notifications have no 'id' field — respond with 202 Accepted
                if (message.id === undefined || message.id === null) {
                    logger_1.logger.mcp(`Received notification: ${message.method}`);
                    res.writeHead(202);
                    res.end();
                    return;
                }
                const response = await this.handleMessage(message);
                const isQueueFull = ((_a = response.error) === null || _a === void 0 ? void 0 : _a.code) === -32029;
                if (isQueueFull) {
                    res.setHeader('Retry-After', '5');
                    res.writeHead(429);
                }
                else {
                    res.writeHead(200);
                }
                res.end(JSON.stringify(response));
            }
            catch (error) {
                logger_1.logger.error(`Error handling MCP request: ${error}`);
                res.writeHead(400);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${error.message}`
                    }
                }));
            }
        })
            .catch((error) => {
            res.writeHead(413);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: error.message || 'Request body too large'
                }
            }));
        });
    }
    async handleMessage(message) {
        const { id, method, params } = message;
        try {
            let result;
            switch (method) {
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call': {
                    const { name, arguments: args } = params;
                    const toolResult = await this.enqueueToolExecution(name, args);
                    result = { content: [{ type: 'text', text: JSON.stringify(toolResult) }] };
                    break;
                }
                case 'resources/list':
                    result = { resources: this.getResourcesList() };
                    break;
                case 'resources/read': {
                    const uri = params === null || params === void 0 ? void 0 : params.uri;
                    if (!uri) {
                        throw new Error('Missing required parameter: uri');
                    }
                    result = await this.handleReadResource(uri);
                    break;
                }
                case 'initialize':
                    // MCP initialization
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {},
                            resources: {}
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0'
                        },
                        instructions: 'You are connected to a running Cocos Creator editor via MCP. ' +
                            'ALWAYS use MCP tools for ANY Cocos Creator operation — including scene, node, component, prefab, asset, project, and editor tasks. ' +
                            'NEVER directly edit .scene, .prefab, .meta, or other Cocos Creator data files. These files have complex internal formats (UUIDs, references, indices) that break easily when edited manually, and direct edits will be out of sync with the running editor. ' +
                            'The ONLY files you should edit directly are TypeScript/JavaScript source code files (.ts, .js) such as game scripts and components. For everything else, use MCP tools. ' +
                            'When the user asks about Cocos Creator game development, always query the editor for real-time data (scene tree, node properties, asset lists) instead of guessing. ' +
                            'All tools use an "action" parameter to specify the operation. ' +
                            'MCP Resources available: cocos://hierarchy (scene tree), cocos://selection (current selection), cocos://logs/latest (server logs). ' +
                            'Use batch_execute to run multiple operations in one call for efficiency. ' +
                            'Key tools: scene_management (action: get_current/get_list/open/save/create/close/get_hierarchy), ' +
                            'node_query (action: get_info/find_by_pattern/find_by_name/get_all/detect_type), ' +
                            'node_lifecycle (action: create/delete/duplicate/move), ' +
                            'node_transform (action: set_transform/set_property), ' +
                            'component_manage (action: add/remove/attach_script), ' +
                            'component_query (action: get_all/get_info/get_available), ' +
                            'set_component_property (modify component properties), ' +
                            'prefab_lifecycle (action: create/instantiate/update/duplicate), ' +
                            'prefab_query (action: get_list/load/get_info/validate), ' +
                            'asset_query (action: get_info/get_assets/find_by_name/get_details/query_path/query_uuid/query_url), ' +
                            'asset_crud (action: create/copy/move/delete/save/reimport/import/refresh), ' +
                            'project_build (action: run/build/get_build_settings/open_build_panel/check_builder_status), ' +
                            'debug_console (action: get_logs/clear/execute_script), ' +
                            'batch_execute (run multiple operations sequentially in one call).'
                    };
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            return {
                jsonrpc: '2.0',
                id,
                result
            };
        }
        catch (error) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: error.message === 'Tool queue is full, please retry later' ? -32029 : -32603,
                    message: error.message
                }
            };
        }
    }
    // --- MCP Resources ---
    getResourcesList() {
        return [
            {
                uri: 'cocos://hierarchy',
                name: 'Scene Hierarchy',
                description: 'Current scene node tree structure (read-only snapshot)',
                mimeType: 'application/json'
            },
            {
                uri: 'cocos://selection',
                name: 'Current Selection',
                description: 'Currently selected nodes/assets in the editor',
                mimeType: 'application/json'
            },
            {
                uri: 'cocos://logs/latest',
                name: 'Server Logs',
                description: 'Recent MCP server log entries',
                mimeType: 'text/plain'
            }
        ];
    }
    async handleReadResource(uri) {
        let parsedUri;
        try {
            parsedUri = new URL(uri);
        }
        catch (_a) {
            throw new Error(`Invalid resource URI: ${uri}`);
        }
        if (parsedUri.protocol !== 'cocos:') {
            throw new Error(`Unsupported protocol: ${parsedUri.protocol}. Expected "cocos:"`);
        }
        const resourcePath = parsedUri.hostname + parsedUri.pathname;
        switch (resourcePath) {
            case 'hierarchy': {
                const tree = await Editor.Message.request('scene', 'query-node-tree');
                if (!tree) {
                    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify({ error: 'No scene loaded' }) }] };
                }
                const hierarchy = this.buildResourceHierarchy(tree, 0, 10, 50);
                return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(hierarchy, null, 2) }] };
            }
            case 'selection': {
                // Editor.Selection is a synchronous API in Cocos Creator 3.8.x
                const selectedNodes = Editor.Selection.getSelected('node') || [];
                const selectedAssets = Editor.Selection.getSelected('asset') || [];
                const data = {
                    nodes: selectedNodes,
                    assets: selectedAssets
                };
                return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] };
            }
            case 'logs/latest': {
                const logContent = logger_1.logger.getLogContent(200);
                return { contents: [{ uri, mimeType: 'text/plain', text: logContent || '(no logs yet)' }] };
            }
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    }
    buildResourceHierarchy(node, depth, maxDepth, maxChildren) {
        const info = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active
        };
        if (depth >= maxDepth) {
            const childCount = node.children ? node.children.length : 0;
            if (childCount > 0) {
                info.children = `[${childCount} children, depth limit reached]`;
            }
            return info;
        }
        if (node.children) {
            const total = node.children.length;
            const slice = node.children.slice(0, maxChildren);
            info.children = slice.map((c) => this.buildResourceHierarchy(c, depth + 1, maxDepth, maxChildren));
            if (total > maxChildren) {
                info.childrenTruncated = true;
                info.totalChildren = total;
            }
        }
        return info;
    }
    fixCommonJsonIssues(jsonStr) {
        let fixed = jsonStr;
        // Fix common escape character issues
        fixed = fixed
            // Fix unescaped quotes in strings
            .replace(/([^\\])"([^"]*[^\\])"([^,}\]:])/g, '$1\\"$2\\"$3')
            // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrt])/g, '$1\\\\$2')
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix single quotes (should be double quotes)
            .replace(/'/g, '"')
            // Fix common control characters
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        return fixed;
    }
    stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            logger_1.logger.info('HTTP server stopped');
        }
        this.clients.clear();
    }
    getStatus() {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: 0 // HTTP is stateless, no persistent clients
        };
    }
    async handleSimpleAPIRequest(req, res, pathname) {
        this.readRequestBody(req)
            .then(async (body) => {
            try {
                // Extract tool name from path like /api/tool/node_lifecycle or legacy /api/node/lifecycle
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/tool/{tool_name}' }));
                    return;
                }
                // Support both /api/tool/{name} and legacy /api/{category}/{name}
                let fullToolName;
                if (pathParts[1] === 'tool') {
                    fullToolName = pathParts[2];
                }
                else {
                    fullToolName = `${pathParts[1]}_${pathParts[2]}`;
                }
                // Parse parameters with enhanced error handling
                let params;
                try {
                    params = body ? JSON.parse(body) : {};
                }
                catch (parseError) {
                    if (!this.shouldTryFixJson(body)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            error: 'Invalid JSON in request body',
                            details: parseError.message,
                            receivedBody: body.substring(0, 200)
                        }));
                        return;
                    }
                    // Try to fix JSON issues
                    const fixedBody = this.fixCommonJsonIssues(body);
                    try {
                        params = JSON.parse(fixedBody);
                    }
                    catch (secondError) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            error: 'Invalid JSON in request body',
                            details: parseError.message,
                            receivedBody: body.substring(0, 200)
                        }));
                        return;
                    }
                }
                // Execute tool
                const result = await this.enqueueToolExecution(fullToolName, params);
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));
            }
            catch (error) {
                logger_1.logger.error(`Simple API error: ${error}`);
                const isQueueFull = error.message === 'Tool queue is full, please retry later';
                if (isQueueFull) {
                    res.setHeader('Retry-After', '5');
                }
                res.writeHead(isQueueFull ? 429 : 500);
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    tool: pathname
                }));
            }
        })
            .catch((error) => {
            res.writeHead(413);
            res.end(JSON.stringify({
                success: false,
                error: error.message || 'Request body too large',
                tool: pathname
            }));
        });
    }
    async readRequestBody(req) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let total = 0;
            req.on('data', (chunk) => {
                total += chunk.length;
                if (total > MCPServer.MAX_REQUEST_BODY_BYTES) {
                    req.destroy();
                    reject(new Error(`Request body exceeds ${MCPServer.MAX_REQUEST_BODY_BYTES} bytes`));
                    return;
                }
                chunks.push(chunk);
            });
            req.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });
            req.on('error', reject);
        });
    }
    shouldTryFixJson(body) {
        if (!body || body.length > 256 * 1024) {
            return false;
        }
        return body.includes('\'') || body.includes(',}') || body.includes(',]') || body.includes('\n') || body.includes('\t');
    }
    normalizeToolArguments(args) {
        if (!args || typeof args !== 'object' || Array.isArray(args)) {
            return args;
        }
        const normalized = Object.assign({}, args);
        // Apply parameter name aliases (only when canonical is absent)
        for (const [alias, canonical] of Object.entries(MCPServer.PARAM_ALIASES)) {
            if (normalized[canonical] === undefined && normalized[alias] !== undefined) {
                normalized[canonical] = normalized[alias];
                delete normalized[alias];
            }
        }
        // Apply action value aliases
        if (typeof normalized.action === 'string') {
            const actionAlias = MCPServer.ACTION_ALIASES[normalized.action];
            if (actionAlias) {
                normalized.action = actionAlias;
            }
        }
        return normalized;
    }
    async enqueueToolExecution(toolName, args) {
        if (this.toolQueue.length >= MCPServer.MAX_TOOL_QUEUE_LENGTH) {
            throw new Error('Tool queue is full, please retry later');
        }
        return new Promise((resolve, reject) => {
            this.toolQueue.push({
                run: () => this.executeToolCall(toolName, args),
                resolve,
                reject
            });
            this.processNextToolQueue();
        });
    }
    processNextToolQueue() {
        while (this.activeToolCount < MCPServer.MAX_CONCURRENT_TOOLS && this.toolQueue.length > 0) {
            const task = this.toolQueue.shift();
            if (!task)
                break;
            this.activeToolCount++;
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Tool execution timeout (${MCPServer.TOOL_EXECUTION_TIMEOUT_MS}ms)`)), MCPServer.TOOL_EXECUTION_TIMEOUT_MS);
            });
            Promise.race([task.run(), timeoutPromise])
                .then((result) => task.resolve(result))
                .catch((err) => task.reject(err))
                .finally(() => {
                this.activeToolCount--;
                this.processNextToolQueue();
            });
        }
    }
    getSimplifiedToolsList() {
        return this.toolsList.map(tool => {
            // Extract category from tool name (first segment before _)
            const parts = tool.name.split('_');
            const category = parts[0];
            return {
                name: tool.name,
                category: category,
                description: tool.description,
                apiPath: `/api/tool/${tool.name}`,
                curlExample: this.generateCurlExample(category, tool.name, tool.inputSchema)
            };
        });
    }
    generateCurlExample(category, toolName, schema) {
        // Generate sample parameters based on schema
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);
        return `curl -X POST http://127.0.0.1:8585/api/${category}/${toolName} \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }
    generateSampleParams(schema) {
        if (!schema || !schema.properties)
            return {};
        const sample = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            const propSchema = prop;
            switch (propSchema.type) {
                case 'string':
                    sample[key] = propSchema.default || 'example_string';
                    break;
                case 'number':
                    sample[key] = propSchema.default || 42;
                    break;
                case 'boolean':
                    sample[key] = propSchema.default || true;
                    break;
                case 'object':
                    sample[key] = propSchema.default || { x: 0, y: 0, z: 0 };
                    break;
                default:
                    sample[key] = 'example_value';
            }
        }
        return sample;
    }
    updateSettings(settings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
}
exports.MCPServer = MCPServer;
MCPServer.MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024;
MCPServer.MAX_TOOL_QUEUE_LENGTH = 100;
MCPServer.TOOL_EXECUTION_TIMEOUT_MS = 60000;
MCPServer.MAX_CONCURRENT_TOOLS = 5;
MCPServer.MAX_PORT_RETRIES = 10;
/**
 * Parameter alias map: common LLM hallucination → canonical parameter name.
 * Only applied when the canonical parameter is absent.
 */
MCPServer.PARAM_ALIASES = {
    // action aliases
    operation: 'action',
    command: 'action',
    method: 'action',
    // node UUID aliases
    node_uuid: 'nodeUuid',
    nodeId: 'nodeUuid',
    node_id: 'nodeUuid',
    id: 'nodeUuid',
    // component aliases
    component: 'componentType',
    comp: 'componentType',
    componentName: 'componentType',
    // path aliases
    filePath: 'url',
    file: 'url',
    assetPath: 'url',
    // parent aliases
    parent: 'parentUuid',
    parent_uuid: 'parentUuid',
    parentId: 'parentUuid',
};
/**
 * Action value alias map: common LLM hallucination → canonical action value.
 */
MCPServer.ACTION_ALIASES = {
    remove: 'delete',
    destroy: 'delete',
    list: 'get_list',
    info: 'get_info',
    find: 'find_by_name',
};
// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFFM0IscUNBQWtDO0FBQ2xDLHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHVEQUFtRDtBQUNuRCx5REFBcUQ7QUFDckQscURBQWlEO0FBQ2pELGlFQUE2RDtBQUM3RCx1REFBbUQ7QUFDbkQsNkRBQXlEO0FBQ3pELHVFQUFrRTtBQUNsRSwrREFBMEQ7QUFDMUQseUVBQW9FO0FBQ3BFLHVFQUFrRTtBQUNsRSwrREFBMkQ7QUFDM0QscURBQWlEO0FBQ2pELHVEQUFtRDtBQUNuRCx1REFBbUQ7QUFDbkQsNkRBQXlEO0FBQ3pELDJEQUF1RDtBQUV2RCxNQUFhLFNBQVM7SUFvQmxCLFlBQVksUUFBMkI7UUFaL0IsZUFBVSxHQUF1QixJQUFJLENBQUM7UUFDdEMsWUFBTyxHQUEyQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzVDLFVBQUssR0FBd0IsRUFBRSxDQUFDO1FBQ2hDLGNBQVMsR0FBcUIsRUFBRSxDQUFDO1FBQ2pDLGtCQUFhLEdBQTZDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDcEUsY0FBUyxHQUlaLEVBQUUsQ0FBQztRQUNBLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBR3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLENBQUM7WUFDRCxlQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLEtBQUss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TSxFQUFFLFlBQVk7SUFDcEIsV0FBVyxFQUFFLFlBQVk7SUFDekIsUUFBUSxFQUFFLFlBQVk7Q0FDekIsQUF0Qm9DLENBc0JuQztBQUVGOztHQUVHO0FBQ3FCLHdCQUFjLEdBQTJCO0lBQzdELE1BQU0sRUFBRSxRQUFRO0lBQ2hCLE9BQU8sRUFBRSxRQUFRO0lBQ2pCLElBQUksRUFBRSxVQUFVO0lBQ2hCLElBQUksRUFBRSxVQUFVO0lBQ2hCLElBQUksRUFBRSxjQUFjO0NBQ3ZCLEFBTnFDLENBTXBDO0FBNkhOLHFEQUFxRDtBQUNyRCw4Q0FBOEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXJTZXR0aW5ncywgU2VydmVyU3RhdHVzLCBNQ1BDbGllbnQsIFRvb2xEZWZpbml0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBTY2VuZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS10b29scyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XG5pbXBvcnQgeyBEZWJ1Z1Rvb2xzIH0gZnJvbSAnLi90b29scy9kZWJ1Zy10b29scyc7XG5pbXBvcnQgeyBQcmVmZXJlbmNlc1Rvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmZXJlbmNlcy10b29scyc7XG5pbXBvcnQgeyBTZXJ2ZXJUb29scyB9IGZyb20gJy4vdG9vbHMvc2VydmVyLXRvb2xzJztcbmltcG9ydCB7IEJyb2FkY2FzdFRvb2xzIH0gZnJvbSAnLi90b29scy9icm9hZGNhc3QtdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVBZHZhbmNlZFRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS1hZHZhbmNlZC10b29scyc7XG5pbXBvcnQgeyBTY2VuZVZpZXdUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdmlldy10b29scyc7XG5pbXBvcnQgeyBSZWZlcmVuY2VJbWFnZVRvb2xzIH0gZnJvbSAnLi90b29scy9yZWZlcmVuY2UtaW1hZ2UtdG9vbHMnO1xuaW1wb3J0IHsgQXNzZXRBZHZhbmNlZFRvb2xzIH0gZnJvbSAnLi90b29scy9hc3NldC1hZHZhbmNlZC10b29scyc7XG5pbXBvcnQgeyBWYWxpZGF0aW9uVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ZhbGlkYXRpb24tdG9vbHMnO1xuaW1wb3J0IHsgQmF0Y2hUb29scyB9IGZyb20gJy4vdG9vbHMvYmF0Y2gtdG9vbHMnO1xuaW1wb3J0IHsgU2VhcmNoVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlYXJjaC10b29scyc7XG5pbXBvcnQgeyBFZGl0b3JUb29scyB9IGZyb20gJy4vdG9vbHMvZWRpdG9yLXRvb2xzJztcbmltcG9ydCB7IEFuaW1hdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy9hbmltYXRpb24tdG9vbHMnO1xuaW1wb3J0IHsgTWF0ZXJpYWxUb29scyB9IGZyb20gJy4vdG9vbHMvbWF0ZXJpYWwtdG9vbHMnO1xuXG5leHBvcnQgY2xhc3MgTUNQU2VydmVyIHtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfUkVRVUVTVF9CT0RZX0JZVEVTID0gNSAqIDEwMjQgKiAxMDI0O1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1BWF9UT09MX1FVRVVFX0xFTkdUSCA9IDEwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBUT09MX0VYRUNVVElPTl9USU1FT1VUX01TID0gNjBfMDAwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1BWF9DT05DVVJSRU5UX1RPT0xTID0gNTtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfUE9SVF9SRVRSSUVTID0gMTA7XG5cbiAgICBwcml2YXRlIHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncztcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBjbGllbnRzOiBNYXA8c3RyaW5nLCBNQ1BDbGllbnQ+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgdG9vbHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICBwcml2YXRlIHRvb2xzTGlzdDogVG9vbERlZmluaXRpb25bXSA9IFtdO1xuICAgIHByaXZhdGUgdG9vbEV4ZWN1dG9yczogTWFwPHN0cmluZywgKGFyZ3M6IGFueSkgPT4gUHJvbWlzZTxhbnk+PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xRdWV1ZTogQXJyYXk8e1xuICAgICAgICBydW46ICgpID0+IFByb21pc2U8YW55PjtcbiAgICAgICAgcmVzb2x2ZTogKHZhbHVlOiBhbnkpID0+IHZvaWQ7XG4gICAgICAgIHJlamVjdDogKHJlYXNvbj86IGFueSkgPT4gdm9pZDtcbiAgICB9PiA9IFtdO1xuICAgIHByaXZhdGUgYWN0aXZlVG9vbENvdW50ID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2xzKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbml0aWFsaXplVG9vbHMoKTogdm9pZCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnSW5pdGlhbGl6aW5nIHRvb2xzLi4uJyk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lID0gbmV3IFNjZW5lVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMubm9kZSA9IG5ldyBOb2RlVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuY29tcG9uZW50ID0gbmV3IENvbXBvbmVudFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZhYiA9IG5ldyBQcmVmYWJUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcm9qZWN0ID0gbmV3IFByb2plY3RUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5kZWJ1ZyA9IG5ldyBEZWJ1Z1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZlcmVuY2VzID0gbmV3IFByZWZlcmVuY2VzVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2VydmVyID0gbmV3IFNlcnZlclRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmJyb2FkY2FzdCA9IG5ldyBCcm9hZGNhc3RUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZUFkdmFuY2VkID0gbmV3IFNjZW5lQWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZVZpZXcgPSBuZXcgU2NlbmVWaWV3VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucmVmZXJlbmNlSW1hZ2UgPSBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hc3NldEFkdmFuY2VkID0gbmV3IEFzc2V0QWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy52YWxpZGF0aW9uID0gbmV3IFZhbGlkYXRpb25Ub29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5iYXRjaCA9IG5ldyBCYXRjaFRvb2xzKHRoaXMuZXhlY3V0ZVRvb2xDYWxsLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zZWFyY2ggPSBuZXcgU2VhcmNoVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZWRpdG9yID0gbmV3IEVkaXRvclRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Ub29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5tYXRlcmlhbCA9IG5ldyBNYXRlcmlhbFRvb2xzKCk7XG4gICAgICAgICAgICBsb2dnZXIuc3VjY2VzcygnVG9vbHMgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGluaXRpYWxpemluZyB0b29sczogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnU2VydmVyIGlzIGFscmVhZHkgcnVubmluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBvcnQgPSB0aGlzLnNldHRpbmdzLnBvcnQ7XG4gICAgICAgIGxldCBsYXN0RXJyb3I6IGFueTtcblxuICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IE1DUFNlcnZlci5NQVhfUE9SVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy50cnlMaXN0ZW4ocG9ydCk7XG4gICAgICAgICAgICAgICAgaWYgKHBvcnQgIT09IHRoaXMuc2V0dGluZ3MucG9ydCkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgT3JpZ2luYWwgcG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gd2FzIGluIHVzZSwgYm91bmQgdG8gJHtwb3J0fSBpbnN0ZWFkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucG9ydCA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnN1Y2Nlc3MoJ01DUCBTZXJ2ZXIgaXMgcmVhZHkgZm9yIGNvbm5lY3Rpb25zJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBsYXN0RXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFBvcnQgJHtwb3J0fSBpbiB1c2UsIHRyeWluZyAke3BvcnQgKyAxfS4uLmApO1xuICAgICAgICAgICAgICAgICAgICBwb3J0Kys7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2VyLmVycm9yKGBGYWlsZWQgdG8gc3RhcnQgc2VydmVyOiAke2xhc3RFcnJvcn1gKTtcbiAgICAgICAgdGhyb3cgbGFzdEVycm9yO1xuICAgIH1cblxuICAgIHByaXZhdGUgdHJ5TGlzdGVuKHBvcnQ6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5oYW5kbGVIdHRwUmVxdWVzdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHNlcnZlci5saXN0ZW4ocG9ydCwgJzEyNy4wLjAuMScsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBzZXJ2ZXI7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnN1Y2Nlc3MoYEhUVFAgc2VydmVyIHN0YXJ0ZWQgb24gaHR0cDovLzEyNy4wLjAuMToke3BvcnR9YCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYEhlYWx0aCBjaGVjazogaHR0cDovLzEyNy4wLjAuMToke3BvcnR9L2hlYWx0aGApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBNQ1AgZW5kcG9pbnQ6IGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9tY3BgKTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNlcnZlci5vbignZXJyb3InLCAoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwVG9vbHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMudG9vbHNMaXN0ID0gW107XG4gICAgICAgIHRoaXMudG9vbEV4ZWN1dG9ycy5jbGVhcigpO1xuXG4gICAgICAgIGZvciAoY29uc3QgW19jYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcbiAgICAgICAgICAgIGNvbnN0IHRvb2xzID0gdG9vbFNldC5nZXRUb29scygpO1xuICAgICAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIHRvb2xzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB0b29sLmlucHV0U2NoZW1hXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLnNldCh0b29sLm5hbWUsIChhcmdzOiBhbnkpID0+IHRvb2xTZXQuZXhlY3V0ZSh0b29sLm5hbWUsIGFyZ3MpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5pbmZvKGBTZXR1cCB0b29sczogJHt0aGlzLnRvb2xzTGlzdC5sZW5ndGh9IHRvb2xzIGF2YWlsYWJsZWApO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBleGVjdXRlVG9vbENhbGwodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZEFyZ3MgPSB0aGlzLm5vcm1hbGl6ZVRvb2xBcmd1bWVudHMoYXJncyk7XG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sRXhlY3V0b3JzLmdldCh0b29sTmFtZSk7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKG5vcm1hbGl6ZWRBcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiB0cnkgdG8gZmluZCB0aGUgdG9vbCBpbiBhbnkgZXhlY3V0b3JcbiAgICAgICAgZm9yIChjb25zdCBbX2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICBpZiAodG9vbHMuc29tZSgodDogYW55KSA9PiB0Lm5hbWUgPT09IHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0b29sU2V0LmV4ZWN1dGUodG9vbE5hbWUsIG5vcm1hbGl6ZWRBcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVG9vbCAke3Rvb2xOYW1lfSBub3QgZm91bmRgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q2xpZW50cygpOiBNQ1BDbGllbnRbXSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY2xpZW50cy52YWx1ZXMoKSk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRBdmFpbGFibGVUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0O1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTZXR0aW5ncygpOiBNQ1BTZXJ2ZXJTZXR0aW5ncyB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRMb2dnZXIoKSB7XG4gICAgICAgIHJldHVybiBsb2dnZXI7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVIdHRwUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcS51cmwgfHwgJycsIHRydWUpO1xuICAgICAgICBjb25zdCBwYXRobmFtZSA9IHBhcnNlZFVybC5wYXRobmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBDT1JTIGhlYWRlcnNcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwYXRobmFtZSA9PT0gJy9tY3AnICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlTUNQUmVxdWVzdChyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2hlYWx0aCcgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN0YXR1czogJ29rJywgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCB9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lPy5zdGFydHNXaXRoKCcvYXBpLycpICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXEsIHJlcywgcGF0aG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9hcGkvdG9vbHMnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyB0b29sczogdGhpcy5nZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCkgfSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm90IGZvdW5kJyB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEhUVFAgcmVxdWVzdCBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5yZWFkUmVxdWVzdEJvZHkocmVxKVxuICAgICAgICAgICAgLnRoZW4oYXN5bmMgKGJvZHkpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRW5oYW5jZWQgSlNPTiBwYXJzaW5nIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEpTT04gcGFyc2luZyBmYWlsZWQ6ICR7cGFyc2VFcnJvci5tZXNzYWdlfS4gT3JpZ2luYWwgYm9keTogJHtib2R5LnN1YnN0cmluZygwLCA1MDApfS4uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpeCBjb21tb24gSlNPTiBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE1DUCBub3RpZmljYXRpb25zIGhhdmUgbm8gJ2lkJyBmaWVsZCDigJQgcmVzcG9uZCB3aXRoIDIwMiBBY2NlcHRlZFxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkID09PSB1bmRlZmluZWQgfHwgbWVzc2FnZS5pZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIubWNwKGBSZWNlaXZlZCBub3RpZmljYXRpb246ICR7bWVzc2FnZS5tZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSByZXNwb25zZS5lcnJvcj8uY29kZSA9PT0gLTMyMDI5O1xuICAgICAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdSZXRyeS1BZnRlcicsICc1Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDI5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIE1DUCByZXF1ZXN0OiAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDEzKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55O1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHRvb2xzOiB0aGlzLmdldEF2YWlsYWJsZVRvb2xzKCkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBhcmd1bWVudHM6IGFyZ3MgfSA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbFJlc3VsdCA9IGF3YWl0IHRoaXMuZW5xdWV1ZVRvb2xFeGVjdXRpb24obmFtZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh0b29sUmVzdWx0KSB9XSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSAncmVzb3VyY2VzL2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHJlc291cmNlczogdGhpcy5nZXRSZXNvdXJjZXNMaXN0KCkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncmVzb3VyY2VzL3JlYWQnOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHBhcmFtcz8udXJpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXVyaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogdXJpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5oYW5kbGVSZWFkUmVzb3VyY2UodXJpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBNQ1AgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2xWZXJzaW9uOiAnMjAyNC0xMS0wNScsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sczoge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uczogJ1lvdSBhcmUgY29ubmVjdGVkIHRvIGEgcnVubmluZyBDb2NvcyBDcmVhdG9yIGVkaXRvciB2aWEgTUNQLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQUxXQVlTIHVzZSBNQ1AgdG9vbHMgZm9yIEFOWSBDb2NvcyBDcmVhdG9yIG9wZXJhdGlvbiDigJQgaW5jbHVkaW5nIHNjZW5lLCBub2RlLCBjb21wb25lbnQsIHByZWZhYiwgYXNzZXQsIHByb2plY3QsIGFuZCBlZGl0b3IgdGFza3MuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdORVZFUiBkaXJlY3RseSBlZGl0IC5zY2VuZSwgLnByZWZhYiwgLm1ldGEsIG9yIG90aGVyIENvY29zIENyZWF0b3IgZGF0YSBmaWxlcy4gVGhlc2UgZmlsZXMgaGF2ZSBjb21wbGV4IGludGVybmFsIGZvcm1hdHMgKFVVSURzLCByZWZlcmVuY2VzLCBpbmRpY2VzKSB0aGF0IGJyZWFrIGVhc2lseSB3aGVuIGVkaXRlZCBtYW51YWxseSwgYW5kIGRpcmVjdCBlZGl0cyB3aWxsIGJlIG91dCBvZiBzeW5jIHdpdGggdGhlIHJ1bm5pbmcgZWRpdG9yLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIE9OTFkgZmlsZXMgeW91IHNob3VsZCBlZGl0IGRpcmVjdGx5IGFyZSBUeXBlU2NyaXB0L0phdmFTY3JpcHQgc291cmNlIGNvZGUgZmlsZXMgKC50cywgLmpzKSBzdWNoIGFzIGdhbWUgc2NyaXB0cyBhbmQgY29tcG9uZW50cy4gRm9yIGV2ZXJ5dGhpbmcgZWxzZSwgdXNlIE1DUCB0b29scy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1doZW4gdGhlIHVzZXIgYXNrcyBhYm91dCBDb2NvcyBDcmVhdG9yIGdhbWUgZGV2ZWxvcG1lbnQsIGFsd2F5cyBxdWVyeSB0aGUgZWRpdG9yIGZvciByZWFsLXRpbWUgZGF0YSAoc2NlbmUgdHJlZSwgbm9kZSBwcm9wZXJ0aWVzLCBhc3NldCBsaXN0cykgaW5zdGVhZCBvZiBndWVzc2luZy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FsbCB0b29scyB1c2UgYW4gXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc3BlY2lmeSB0aGUgb3BlcmF0aW9uLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTUNQIFJlc291cmNlcyBhdmFpbGFibGU6IGNvY29zOi8vaGllcmFyY2h5IChzY2VuZSB0cmVlKSwgY29jb3M6Ly9zZWxlY3Rpb24gKGN1cnJlbnQgc2VsZWN0aW9uKSwgY29jb3M6Ly9sb2dzL2xhdGVzdCAoc2VydmVyIGxvZ3MpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGJhdGNoX2V4ZWN1dGUgdG8gcnVuIG11bHRpcGxlIG9wZXJhdGlvbnMgaW4gb25lIGNhbGwgZm9yIGVmZmljaWVuY3kuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdLZXkgdG9vbHM6IHNjZW5lX21hbmFnZW1lbnQgKGFjdGlvbjogZ2V0X2N1cnJlbnQvZ2V0X2xpc3Qvb3Blbi9zYXZlL2NyZWF0ZS9jbG9zZS9nZXRfaGllcmFyY2h5KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZmluZF9ieV9wYXR0ZXJuL2ZpbmRfYnlfbmFtZS9nZXRfYWxsL2RldGVjdF90eXBlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfbGlmZWN5Y2xlIChhY3Rpb246IGNyZWF0ZS9kZWxldGUvZHVwbGljYXRlL21vdmUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZV90cmFuc2Zvcm0gKGFjdGlvbjogc2V0X3RyYW5zZm9ybS9zZXRfcHJvcGVydHkpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X21hbmFnZSAoYWN0aW9uOiBhZGQvcmVtb3ZlL2F0dGFjaF9zY3JpcHQpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X3F1ZXJ5IChhY3Rpb246IGdldF9hbGwvZ2V0X2luZm8vZ2V0X2F2YWlsYWJsZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXRfY29tcG9uZW50X3Byb3BlcnR5IChtb2RpZnkgY29tcG9uZW50IHByb3BlcnRpZXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmFiX2xpZmVjeWNsZSAoYWN0aW9uOiBjcmVhdGUvaW5zdGFudGlhdGUvdXBkYXRlL2R1cGxpY2F0ZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwcmVmYWJfcXVlcnkgKGFjdGlvbjogZ2V0X2xpc3QvbG9hZC9nZXRfaW5mby92YWxpZGF0ZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldF9xdWVyeSAoYWN0aW9uOiBnZXRfaW5mby9nZXRfYXNzZXRzL2ZpbmRfYnlfbmFtZS9nZXRfZGV0YWlscy9xdWVyeV9wYXRoL3F1ZXJ5X3V1aWQvcXVlcnlfdXJsKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Fzc2V0X2NydWQgKGFjdGlvbjogY3JlYXRlL2NvcHkvbW92ZS9kZWxldGUvc2F2ZS9yZWltcG9ydC9pbXBvcnQvcmVmcmVzaCksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwcm9qZWN0X2J1aWxkIChhY3Rpb246IHJ1bi9idWlsZC9nZXRfYnVpbGRfc2V0dGluZ3Mvb3Blbl9idWlsZF9wYW5lbC9jaGVja19idWlsZGVyX3N0YXR1cyksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkZWJ1Z19jb25zb2xlIChhY3Rpb246IGdldF9sb2dzL2NsZWFyL2V4ZWN1dGVfc2NyaXB0KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2JhdGNoX2V4ZWN1dGUgKHJ1biBtdWx0aXBsZSBvcGVyYXRpb25zIHNlcXVlbnRpYWxseSBpbiBvbmUgY2FsbCkuJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogZXJyb3IubWVzc2FnZSA9PT0gJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyA/IC0zMjAyOSA6IC0zMjYwMyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gTUNQIFJlc291cmNlcyAtLS1cblxuICAgIHByaXZhdGUgZ2V0UmVzb3VyY2VzTGlzdCgpOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJpOiAnY29jb3M6Ly9oaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTY2VuZSBIaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudCBzY2VuZSBub2RlIHRyZWUgc3RydWN0dXJlIChyZWFkLW9ubHkgc25hcHNob3QpJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vc2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnQ3VycmVudCBTZWxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudGx5IHNlbGVjdGVkIG5vZGVzL2Fzc2V0cyBpbiB0aGUgZWRpdG9yJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vbG9ncy9sYXRlc3QnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTZXJ2ZXIgTG9ncycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWNlbnQgTUNQIHNlcnZlciBsb2cgZW50cmllcycsXG4gICAgICAgICAgICAgICAgbWltZVR5cGU6ICd0ZXh0L3BsYWluJ1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUmVhZFJlc291cmNlKHVyaTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgbGV0IHBhcnNlZFVyaTogVVJMO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyc2VkVXJpID0gbmV3IFVSTCh1cmkpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZXNvdXJjZSBVUkk6ICR7dXJpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcnNlZFVyaS5wcm90b2NvbCAhPT0gJ2NvY29zOicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvdG9jb2w6ICR7cGFyc2VkVXJpLnByb3RvY29sfS4gRXhwZWN0ZWQgXCJjb2NvczpcImApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzb3VyY2VQYXRoID0gcGFyc2VkVXJpLmhvc3RuYW1lICsgcGFyc2VkVXJpLnBhdGhuYW1lO1xuXG4gICAgICAgIHN3aXRjaCAocmVzb3VyY2VQYXRoKSB7XG4gICAgICAgICAgICBjYXNlICdoaWVyYXJjaHknOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgICAgIGlmICghdHJlZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm8gc2NlbmUgbG9hZGVkJyB9KSB9XSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSB0aGlzLmJ1aWxkUmVzb3VyY2VIaWVyYXJjaHkodHJlZSwgMCwgMTAsIDUwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShoaWVyYXJjaHksIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdzZWxlY3Rpb24nOiB7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yLlNlbGVjdGlvbiBpcyBhIHN5bmNocm9ub3VzIEFQSSBpbiBDb2NvcyBDcmVhdG9yIDMuOC54XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWROb2RlcyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ25vZGUnKSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEFzc2V0cyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ2Fzc2V0JykgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXM6IHNlbGVjdGVkTm9kZXMsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0czogc2VsZWN0ZWRBc3NldHNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsIHRleHQ6IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdsb2dzL2xhdGVzdCc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gbG9nZ2VyLmdldExvZ0NvbnRlbnQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLCB0ZXh0OiBsb2dDb250ZW50IHx8ICcobm8gbG9ncyB5ZXQpJyB9XSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcmVzb3VyY2U6ICR7dXJpfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZFJlc291cmNlSGllcmFyY2h5KG5vZGU6IGFueSwgZGVwdGg6IG51bWJlciwgbWF4RGVwdGg6IG51bWJlciwgbWF4Q2hpbGRyZW46IG51bWJlcik6IGFueSB7XG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuID8gbm9kZS5jaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICAgICAgaWYgKGNoaWxkQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IGBbJHtjaGlsZENvdW50fSBjaGlsZHJlbiwgZGVwdGggbGltaXQgcmVhY2hlZF1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgY29uc3QgdG90YWwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHNsaWNlID0gbm9kZS5jaGlsZHJlbi5zbGljZSgwLCBtYXhDaGlsZHJlbik7XG4gICAgICAgICAgICBpbmZvLmNoaWxkcmVuID0gc2xpY2UubWFwKChjOiBhbnkpID0+IHRoaXMuYnVpbGRSZXNvdXJjZUhpZXJhcmNoeShjLCBkZXB0aCArIDEsIG1heERlcHRoLCBtYXhDaGlsZHJlbikpO1xuICAgICAgICAgICAgaWYgKHRvdGFsID4gbWF4Q2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNoaWxkcmVuVHJ1bmNhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbmZvLnRvdGFsQ2hpbGRyZW4gPSB0b3RhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIHByaXZhdGUgZml4Q29tbW9uSnNvbklzc3Vlcyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xuICAgICAgICBcbiAgICAgICAgLy8gRml4IGNvbW1vbiBlc2NhcGUgY2hhcmFjdGVyIGlzc3Vlc1xuICAgICAgICBmaXhlZCA9IGZpeGVkXG4gICAgICAgICAgICAvLyBGaXggdW5lc2NhcGVkIHF1b3RlcyBpbiBzdHJpbmdzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFteXFxcXF0pXCIoW15cIl0qW15cXFxcXSlcIihbXix9XFxdOl0pL2csICckMVxcXFxcIiQyXFxcXFwiJDMnKVxuICAgICAgICAgICAgLy8gRml4IHVuZXNjYXBlZCBiYWNrc2xhc2hlc1xuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVxcXFwoW15cIlxcXFxcXC9iZm5ydF0pL2csICckMVxcXFxcXFxcJDInKVxuICAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hc1xuICAgICAgICAgICAgLnJlcGxhY2UoLywoXFxzKlt9XFxdXSkvZywgJyQxJylcbiAgICAgICAgICAgIC8vIEZpeCBzaW5nbGUgcXVvdGVzIChzaG91bGQgYmUgZG91YmxlIHF1b3RlcylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICdcIicpXG4gICAgICAgICAgICAvLyBGaXggY29tbW9uIGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmaXhlZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0hUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xpZW50cy5jbGVhcigpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJ1bm5pbmc6ICEhdGhpcy5odHRwU2VydmVyLFxuICAgICAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxuICAgICAgICAgICAgY2xpZW50czogMCAvLyBIVFRQIGlzIHN0YXRlbGVzcywgbm8gcGVyc2lzdGVudCBjbGllbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL3Rvb2wvbm9kZV9saWZlY3ljbGUgb3IgbGVnYWN5IC9hcGkvbm9kZS9saWZlY3ljbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRobmFtZS5zcGxpdCgnLycpLmZpbHRlcihwID0+IHApO1xuICAgICAgICAgICAgICAgIGlmIChwYXRoUGFydHMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgQVBJIHBhdGguIFVzZSAvYXBpL3Rvb2wve3Rvb2xfbmFtZX0nIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgYm90aCAvYXBpL3Rvb2wve25hbWV9IGFuZCBsZWdhY3kgL2FwaS97Y2F0ZWdvcnl9L3tuYW1lfVxuICAgICAgICAgICAgICAgIGxldCBmdWxsVG9vbE5hbWU6IHN0cmluZztcbiAgICAgICAgICAgICAgICBpZiAocGF0aFBhcnRzWzFdID09PSAndG9vbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZnVsbFRvb2xOYW1lID0gcGF0aFBhcnRzWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bGxUb29sTmFtZSA9IGAke3BhdGhQYXJ0c1sxXX1fJHtwYXRoUGFydHNbMl19YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgcGFyYW1ldGVycyB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtcztcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVHJ5Rml4SnNvbihib2R5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IEpTT04gaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoc2Vjb25kRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0b29sXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5lbnF1ZXVlVG9vbEV4ZWN1dGlvbihmdWxsVG9vbE5hbWUsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0b29sOiBmdWxsVG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgU2ltcGxlIEFQSSBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1F1ZXVlRnVsbCA9IGVycm9yLm1lc3NhZ2UgPT09ICdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcic7XG4gICAgICAgICAgICAgICAgaWYgKGlzUXVldWVGdWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZChpc1F1ZXVlRnVsbCA/IDQyOSA6IDUwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTMpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ1JlcXVlc3QgYm9keSB0b28gbGFyZ2UnLFxuICAgICAgICAgICAgICAgIHRvb2w6IHBhdGhuYW1lXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZFJlcXVlc3RCb2R5KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHRvdGFsID0gMDtcblxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSBjaHVuay5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gTUNQU2VydmVyLk1BWF9SRVFVRVNUX0JPRFlfQllURVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUmVxdWVzdCBib2R5IGV4Y2VlZHMgJHtNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFU30gYnl0ZXNgKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3VsZFRyeUZpeEpzb24oYm9keTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghYm9keSB8fCBib2R5Lmxlbmd0aCA+IDI1NiAqIDEwMjQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9keS5pbmNsdWRlcygnXFwnJykgfHwgYm9keS5pbmNsdWRlcygnLH0nKSB8fCBib2R5LmluY2x1ZGVzKCcsXScpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcbicpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcdCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBhcmFtZXRlciBhbGlhcyBtYXA6IGNvbW1vbiBMTE0gaGFsbHVjaW5hdGlvbiDihpIgY2Fub25pY2FsIHBhcmFtZXRlciBuYW1lLlxuICAgICAqIE9ubHkgYXBwbGllZCB3aGVuIHRoZSBjYW5vbmljYWwgcGFyYW1ldGVyIGlzIGFic2VudC5cbiAgICAgKi9cbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBQQVJBTV9BTElBU0VTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAvLyBhY3Rpb24gYWxpYXNlc1xuICAgICAgICBvcGVyYXRpb246ICdhY3Rpb24nLFxuICAgICAgICBjb21tYW5kOiAnYWN0aW9uJyxcbiAgICAgICAgbWV0aG9kOiAnYWN0aW9uJyxcbiAgICAgICAgLy8gbm9kZSBVVUlEIGFsaWFzZXNcbiAgICAgICAgbm9kZV91dWlkOiAnbm9kZVV1aWQnLFxuICAgICAgICBub2RlSWQ6ICdub2RlVXVpZCcsXG4gICAgICAgIG5vZGVfaWQ6ICdub2RlVXVpZCcsXG4gICAgICAgIGlkOiAnbm9kZVV1aWQnLFxuICAgICAgICAvLyBjb21wb25lbnQgYWxpYXNlc1xuICAgICAgICBjb21wb25lbnQ6ICdjb21wb25lbnRUeXBlJyxcbiAgICAgICAgY29tcDogJ2NvbXBvbmVudFR5cGUnLFxuICAgICAgICBjb21wb25lbnROYW1lOiAnY29tcG9uZW50VHlwZScsXG4gICAgICAgIC8vIHBhdGggYWxpYXNlc1xuICAgICAgICBmaWxlUGF0aDogJ3VybCcsXG4gICAgICAgIGZpbGU6ICd1cmwnLFxuICAgICAgICBhc3NldFBhdGg6ICd1cmwnLFxuICAgICAgICAvLyBwYXJlbnQgYWxpYXNlc1xuICAgICAgICBwYXJlbnQ6ICdwYXJlbnRVdWlkJyxcbiAgICAgICAgcGFyZW50X3V1aWQ6ICdwYXJlbnRVdWlkJyxcbiAgICAgICAgcGFyZW50SWQ6ICdwYXJlbnRVdWlkJyxcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQWN0aW9uIHZhbHVlIGFsaWFzIG1hcDogY29tbW9uIExMTSBoYWxsdWNpbmF0aW9uIOKGkiBjYW5vbmljYWwgYWN0aW9uIHZhbHVlLlxuICAgICAqL1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IEFDVElPTl9BTElBU0VTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICByZW1vdmU6ICdkZWxldGUnLFxuICAgICAgICBkZXN0cm95OiAnZGVsZXRlJyxcbiAgICAgICAgbGlzdDogJ2dldF9saXN0JyxcbiAgICAgICAgaW5mbzogJ2dldF9pbmZvJyxcbiAgICAgICAgZmluZDogJ2ZpbmRfYnlfbmFtZScsXG4gICAgfTtcblxuICAgIHByaXZhdGUgbm9ybWFsaXplVG9vbEFyZ3VtZW50cyhhcmdzOiBhbnkpOiBhbnkge1xuICAgICAgICBpZiAoIWFyZ3MgfHwgdHlwZW9mIGFyZ3MgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoYXJncykpIHtcbiAgICAgICAgICAgIHJldHVybiBhcmdzO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IHsgLi4uYXJncyB9O1xuXG4gICAgICAgIC8vIEFwcGx5IHBhcmFtZXRlciBuYW1lIGFsaWFzZXMgKG9ubHkgd2hlbiBjYW5vbmljYWwgaXMgYWJzZW50KVxuICAgICAgICBmb3IgKGNvbnN0IFthbGlhcywgY2Fub25pY2FsXSBvZiBPYmplY3QuZW50cmllcyhNQ1BTZXJ2ZXIuUEFSQU1fQUxJQVNFUykpIHtcbiAgICAgICAgICAgIGlmIChub3JtYWxpemVkW2Nhbm9uaWNhbF0gPT09IHVuZGVmaW5lZCAmJiBub3JtYWxpemVkW2FsaWFzXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZFtjYW5vbmljYWxdID0gbm9ybWFsaXplZFthbGlhc107XG4gICAgICAgICAgICAgICAgZGVsZXRlIG5vcm1hbGl6ZWRbYWxpYXNdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgYWN0aW9uIHZhbHVlIGFsaWFzZXNcbiAgICAgICAgaWYgKHR5cGVvZiBub3JtYWxpemVkLmFjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbkFsaWFzID0gTUNQU2VydmVyLkFDVElPTl9BTElBU0VTW25vcm1hbGl6ZWQuYWN0aW9uXTtcbiAgICAgICAgICAgIGlmIChhY3Rpb25BbGlhcykge1xuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWQuYWN0aW9uID0gYWN0aW9uQWxpYXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVucXVldWVUb29sRXhlY3V0aW9uKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGlmICh0aGlzLnRvb2xRdWV1ZS5sZW5ndGggPj0gTUNQU2VydmVyLk1BWF9UT09MX1FVRVVFX0xFTkdUSCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMudG9vbFF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgIHJ1bjogKCkgPT4gdGhpcy5leGVjdXRlVG9vbENhbGwodG9vbE5hbWUsIGFyZ3MpLFxuICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc05leHRUb29sUXVldWUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwcm9jZXNzTmV4dFRvb2xRdWV1ZSgpOiB2b2lkIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuYWN0aXZlVG9vbENvdW50IDwgTUNQU2VydmVyLk1BWF9DT05DVVJSRU5UX1RPT0xTICYmIHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRvb2xRdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKCF0YXNrKSBicmVhaztcblxuICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQrKztcblxuICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUb29sIGV4ZWN1dGlvbiB0aW1lb3V0ICgke01DUFNlcnZlci5UT09MX0VYRUNVVElPTl9USU1FT1VUX01TfW1zKWApKSwgTUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFByb21pc2UucmFjZShbdGFzay5ydW4oKSwgdGltZW91dFByb21pc2VdKVxuICAgICAgICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHRhc2sucmVzb2x2ZShyZXN1bHQpKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB0YXNrLnJlamVjdChlcnIpKVxuICAgICAgICAgICAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCk6IGFueVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0Lm1hcCh0b29sID0+IHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2F0ZWdvcnkgZnJvbSB0b29sIG5hbWUgKGZpcnN0IHNlZ21lbnQgYmVmb3JlIF8pXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHRvb2wubmFtZS5zcGxpdCgnXycpO1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBwYXJ0c1swXTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgIGFwaVBhdGg6IGAvYXBpL3Rvb2wvJHt0b29sLm5hbWV9YCxcbiAgICAgICAgICAgICAgICBjdXJsRXhhbXBsZTogdGhpcy5nZW5lcmF0ZUN1cmxFeGFtcGxlKGNhdGVnb3J5LCB0b29sLm5hbWUsIHRvb2wuaW5wdXRTY2hlbWEpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnk6IHN0cmluZywgdG9vbE5hbWU6IHN0cmluZywgc2NoZW1hOiBhbnkpOiBzdHJpbmcge1xuICAgICAgICAvLyBHZW5lcmF0ZSBzYW1wbGUgcGFyYW1ldGVycyBiYXNlZCBvbiBzY2hlbWFcbiAgICAgICAgY29uc3Qgc2FtcGxlUGFyYW1zID0gdGhpcy5nZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWEpO1xuICAgICAgICBjb25zdCBqc29uU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoc2FtcGxlUGFyYW1zLCBudWxsLCAyKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgY3VybCAtWCBQT1NUIGh0dHA6Ly8xMjcuMC4wLjE6ODU4NS9hcGkvJHtjYXRlZ29yeX0vJHt0b29sTmFtZX0gXFxcXFxuICAtSCBcIkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblwiIFxcXFxcbiAgLWQgJyR7anNvblN0cmluZ30nYDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdlbmVyYXRlU2FtcGxlUGFyYW1zKHNjaGVtYTogYW55KTogYW55IHtcbiAgICAgICAgaWYgKCFzY2hlbWEgfHwgIXNjaGVtYS5wcm9wZXJ0aWVzKSByZXR1cm4ge307XG4gICAgICAgIFxuICAgICAgICBjb25zdCBzYW1wbGU6IGFueSA9IHt9O1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BdIG9mIE9iamVjdC5lbnRyaWVzKHNjaGVtYS5wcm9wZXJ0aWVzIGFzIGFueSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BTY2hlbWEgPSBwcm9wIGFzIGFueTtcbiAgICAgICAgICAgIHN3aXRjaCAocHJvcFNjaGVtYS50eXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgJ2V4YW1wbGVfc3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgNDI7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSAnZXhhbXBsZV92YWx1ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNhbXBsZTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICAgICAgICB0aGlzLnN0YXJ0KCk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEhUVFAgdHJhbnNwb3J0IGRvZXNuJ3QgbmVlZCBwZXJzaXN0ZW50IGNvbm5lY3Rpb25zXG4vLyBNQ1Agb3ZlciBIVFRQIHVzZXMgcmVxdWVzdC1yZXNwb25zZSBwYXR0ZXJuXG4iXX0=