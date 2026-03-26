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
class MCPServer {
    constructor(settings) {
        this.httpServer = null;
        this.clients = new Map();
        this.tools = {};
        this.toolsList = [];
        this.enabledTools = []; // 存储启用的工具列表
        this.toolExecutors = new Map();
        this.toolQueue = [];
        this.activeToolCount = 0;
        this.settings = settings;
        this.initializeTools();
    }
    initializeTools() {
        try {
            console.log('[MCPServer] Initializing tools...');
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
            console.log('[MCPServer] Tools initialized successfully');
        }
        catch (error) {
            console.error('[MCPServer] Error initializing tools:', error);
            throw error;
        }
    }
    async start() {
        if (this.httpServer) {
            console.log('[MCPServer] Server is already running');
            return;
        }
        try {
            console.log(`[MCPServer] Starting HTTP server on port ${this.settings.port}...`);
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] ✅ HTTP server started successfully on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] Health check: http://127.0.0.1:${this.settings.port}/health`);
                    console.log(`[MCPServer] MCP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    resolve();
                });
                this.httpServer.on('error', (err) => {
                    console.error('[MCPServer] ❌ Failed to start server:', err);
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use. Please change the port in settings.`);
                    }
                    reject(err);
                });
            });
            this.setupTools();
            console.log('[MCPServer] 🚀 MCP Server is ready for connections');
        }
        catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }
    setupTools() {
        this.toolsList = [];
        this.toolExecutors.clear();
        // 如果没有启用工具配置，返回所有工具
        if (!this.enabledTools || this.enabledTools.length === 0) {
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    this.toolsList.push({
                        name: toolName,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                    this.toolExecutors.set(toolName, (args) => toolSet.execute(tool.name, args));
                }
            }
        }
        else {
            // 根据启用的工具配置过滤
            const enabledToolNames = new Set(this.enabledTools.map(tool => `${tool.category}_${tool.name}`));
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    if (enabledToolNames.has(toolName)) {
                        this.toolsList.push({
                            name: toolName,
                            description: tool.description,
                            inputSchema: tool.inputSchema
                        });
                        this.toolExecutors.set(toolName, (args) => toolSet.execute(tool.name, args));
                    }
                }
            }
        }
        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} tools available`);
    }
    getFilteredTools(enabledTools) {
        if (!enabledTools || enabledTools.length === 0) {
            return this.toolsList; // 如果没有过滤配置，返回所有工具
        }
        const enabledToolNames = new Set(enabledTools.map(tool => `${tool.category}_${tool.name}`));
        return this.toolsList.filter(tool => enabledToolNames.has(tool.name));
    }
    async executeToolCall(toolName, args) {
        const normalizedArgs = this.normalizeToolArguments(args);
        const executor = this.toolExecutors.get(toolName);
        if (executor) {
            return await executor(normalizedArgs);
        }
        const parts = toolName.split('_');
        const category = parts[0];
        const toolMethodName = parts.slice(1).join('_');
        if (this.tools[category]) {
            return await this.tools[category].execute(toolMethodName, normalizedArgs);
        }
        throw new Error(`Tool ${toolName} not found`);
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getAvailableTools() {
        return this.toolsList;
    }
    updateEnabledTools(enabledTools) {
        console.log(`[MCPServer] Updating enabled tools: ${enabledTools.length} tools`);
        this.enabledTools = enabledTools;
        this.setupTools(); // 重新设置工具列表
    }
    getSettings() {
        return this.settings;
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
            console.error('HTTP request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async handleMCPRequest(req, res) {
        this.readRequestBody(req)
            .then(async (body) => {
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
                    console.log(`[MCPServer] Received notification: ${message.method}`);
                    res.writeHead(202);
                    res.end();
                    return;
                }
                const response = await this.handleMessage(message);
                res.writeHead(200);
                res.end(JSON.stringify(response));
            }
            catch (error) {
                console.error('Error handling MCP request:', error);
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
                case 'initialize':
                    // MCP initialization
                    result = {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0'
                        }
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
            console.log('[MCPServer] HTTP server stopped');
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
                // Extract tool name from path like /api/node/set_position
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                    return;
                }
                const category = pathParts[1];
                const toolName = pathParts[2];
                const fullToolName = `${category}_${toolName}`;
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
                console.error('Simple API error:', error);
                res.writeHead(error.message === 'Tool queue is full, please retry later' ? 429 : 500);
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
        if (args.action === undefined && typeof args.operation === 'string') {
            return Object.assign(Object.assign({}, args), { action: args.operation });
        }
        return args;
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
            const parts = tool.name.split('_');
            const category = parts[0];
            const toolName = parts.slice(1).join('_');
            return {
                name: tool.name,
                category: category,
                toolName: toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`,
                curlExample: this.generateCurlExample(category, toolName, tool.inputSchema)
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
// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFFM0IscURBQWlEO0FBQ2pELG1EQUErQztBQUMvQyw2REFBeUQ7QUFDekQsdURBQW1EO0FBQ25ELHlEQUFxRDtBQUNyRCxxREFBaUQ7QUFDakQsaUVBQTZEO0FBQzdELHVEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQsdUVBQWtFO0FBQ2xFLCtEQUEwRDtBQUMxRCx5RUFBb0U7QUFDcEUsdUVBQWtFO0FBQ2xFLCtEQUEyRDtBQUUzRCxNQUFhLFNBQVM7SUFvQmxCLFlBQVksUUFBMkI7UUFiL0IsZUFBVSxHQUF1QixJQUFJLENBQUM7UUFDdEMsWUFBTyxHQUEyQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzVDLFVBQUssR0FBd0IsRUFBRSxDQUFDO1FBQ2hDLGNBQVMsR0FBcUIsRUFBRSxDQUFDO1FBQ2pDLGlCQUFZLEdBQVUsRUFBRSxDQUFDLENBQUMsWUFBWTtRQUN0QyxrQkFBYSxHQUE2QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BFLGNBQVMsR0FJWixFQUFFLENBQUM7UUFDQSxvQkFBZSxHQUFHLENBQUMsQ0FBQztRQUd4QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVPLGVBQWU7UUFDbkIsSUFBSSxDQUFDO1lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksc0JBQVMsRUFBRSxDQUFDO1lBQ2xD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QUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDakIsQ0FBQztJQUNMLENBQUM7O0FBbmpCTCw4QkFvakJDO0FBbmpCMkIsZ0NBQXNCLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLEFBQWxCLENBQW1CO0FBQ3pDLCtCQUFxQixHQUFHLEdBQUcsQUFBTixDQUFPO0FBQzVCLG1DQUF5QixHQUFHLEtBQU0sQUFBVCxDQUFVO0FBQ25DLDhCQUFvQixHQUFHLENBQUMsQUFBSixDQUFLO0FBa2pCckQscURBQXFEO0FBQ3JELDhDQUE4QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzLCBTZXJ2ZXJTdGF0dXMsIE1DUENsaWVudCwgVG9vbERlZmluaXRpb24gfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNjZW5lVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXRvb2xzJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vdG9vbHMvbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgUHJvamVjdFRvb2xzIH0gZnJvbSAnLi90b29scy9wcm9qZWN0LXRvb2xzJztcbmltcG9ydCB7IERlYnVnVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2RlYnVnLXRvb2xzJztcbmltcG9ydCB7IFByZWZlcmVuY2VzVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZlcmVuY2VzLXRvb2xzJztcbmltcG9ydCB7IFNlcnZlclRvb2xzIH0gZnJvbSAnLi90b29scy9zZXJ2ZXItdG9vbHMnO1xuaW1wb3J0IHsgQnJvYWRjYXN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Jyb2FkY2FzdC10b29scyc7XG5pbXBvcnQgeyBTY2VuZUFkdmFuY2VkVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLWFkdmFuY2VkLXRvb2xzJztcbmltcG9ydCB7IFNjZW5lVmlld1Rvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS12aWV3LXRvb2xzJztcbmltcG9ydCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scyc7XG5pbXBvcnQgeyBBc3NldEFkdmFuY2VkVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Fzc2V0LWFkdmFuY2VkLXRvb2xzJztcbmltcG9ydCB7IFZhbGlkYXRpb25Ub29scyB9IGZyb20gJy4vdG9vbHMvdmFsaWRhdGlvbi10b29scyc7XG5cbmV4cG9ydCBjbGFzcyBNQ1BTZXJ2ZXIge1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1BWF9SRVFVRVNUX0JPRFlfQllURVMgPSA1ICogMTAyNCAqIDEwMjQ7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1RPT0xfUVVFVUVfTEVOR1RIID0gMTAwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVMgPSA2MF8wMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX0NPTkNVUlJFTlRfVE9PTFMgPSA1O1xuXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY2xpZW50czogTWFwPHN0cmluZywgTUNQQ2xpZW50PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIGVuYWJsZWRUb29sczogYW55W10gPSBbXTsgLy8g5a2Y5YKo5ZCv55So55qE5bel5YW35YiX6KGoXG4gICAgcHJpdmF0ZSB0b29sRXhlY3V0b3JzOiBNYXA8c3RyaW5nLCAoYXJnczogYW55KSA9PiBQcm9taXNlPGFueT4+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgdG9vbFF1ZXVlOiBBcnJheTx7XG4gICAgICAgIHJ1bjogKCkgPT4gUHJvbWlzZTxhbnk+O1xuICAgICAgICByZXNvbHZlOiAodmFsdWU6IGFueSkgPT4gdm9pZDtcbiAgICAgICAgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xuICAgIH0+ID0gW107XG4gICAgcHJpdmF0ZSBhY3RpdmVUb29sQ291bnQgPSAwO1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHMoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluaXRpYWxpemVUb29scygpOiB2b2lkIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBJbml0aWFsaXppbmcgdG9vbHMuLi4nKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmUgPSBuZXcgU2NlbmVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5ub2RlID0gbmV3IE5vZGVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5jb21wb25lbnQgPSBuZXcgQ29tcG9uZW50VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmFiID0gbmV3IFByZWZhYlRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByb2plY3QgPSBuZXcgUHJvamVjdFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmRlYnVnID0gbmV3IERlYnVnVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmVyZW5jZXMgPSBuZXcgUHJlZmVyZW5jZXNUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zZXJ2ZXIgPSBuZXcgU2VydmVyVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYnJvYWRjYXN0ID0gbmV3IEJyb2FkY2FzdFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lQWR2YW5jZWQgPSBuZXcgU2NlbmVBZHZhbmNlZFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lVmlldyA9IG5ldyBTY2VuZVZpZXdUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5yZWZlcmVuY2VJbWFnZSA9IG5ldyBSZWZlcmVuY2VJbWFnZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmFzc2V0QWR2YW5jZWQgPSBuZXcgQXNzZXRBZHZhbmNlZFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnZhbGlkYXRpb24gPSBuZXcgVmFsaWRhdGlvblRvb2xzKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0gVG9vbHMgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSBFcnJvciBpbml0aWFsaXppbmcgdG9vbHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBTZXJ2ZXIgaXMgYWxyZWFkeSBydW5uaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIFN0YXJ0aW5nIEhUVFAgc2VydmVyIG9uIHBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9Li4uYCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xuXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyIS5saXN0ZW4odGhpcy5zZXR0aW5ncy5wb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0g4pyFIEhUVFAgc2VydmVyIHN0YXJ0ZWQgc3VjY2Vzc2Z1bGx5IG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBIZWFsdGggY2hlY2s6IGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L2hlYWx0aGApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gTUNQIGVuZHBvaW50OiBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5zZXR0aW5ncy5wb3J0fS9tY3BgKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciEub24oJ2Vycm9yJywgKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1BTZXJ2ZXJdIOKdjCBGYWlsZWQgdG8gc3RhcnQgc2VydmVyOicsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTUNQU2VydmVyXSBQb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSBpcyBhbHJlYWR5IGluIHVzZS4gUGxlYXNlIGNoYW5nZSB0aGUgcG9ydCBpbiBzZXR0aW5ncy5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSDwn5qAIE1DUCBTZXJ2ZXIgaXMgcmVhZHkgZm9yIGNvbm5lY3Rpb25zJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSDinYwgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBUb29scygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcbiAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLmNsZWFyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyDlpoLmnpzmsqHmnInlkK/nlKjlt6XlhbfphY3nva7vvIzov5Tlm57miYDmnInlt6XlhbdcbiAgICAgICAgaWYgKCF0aGlzLmVuYWJsZWRUb29scyB8fCB0aGlzLmVuYWJsZWRUb29scy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xzID0gdG9vbFNldC5nZXRUb29scygpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2xOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdG9vbC5pbnB1dFNjaGVtYVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLnNldCh0b29sTmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIOagueaNruWQr+eUqOeahOW3peWFt+mFjee9rui/h+a7pFxuICAgICAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xOYW1lcyA9IG5ldyBTZXQodGhpcy5lbmFibGVkVG9vbHMubWFwKHRvb2wgPT4gYCR7dG9vbC5jYXRlZ29yeX1fJHt0b29sLm5hbWV9YCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZWRUb29sTmFtZXMuaGFzKHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLnNldCh0b29sTmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gU2V0dXAgdG9vbHM6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSB0b29scyBhdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0RmlsdGVyZWRUb29scyhlbmFibGVkVG9vbHM6IGFueVtdKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIGlmICghZW5hYmxlZFRvb2xzIHx8IGVuYWJsZWRUb29scy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDsgLy8g5aaC5p6c5rKh5pyJ6L+H5ruk6YWN572u77yM6L+U5Zue5omA5pyJ5bel5YW3XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbE5hbWVzID0gbmV3IFNldChlbmFibGVkVG9vbHMubWFwKHRvb2wgPT4gYCR7dG9vbC5jYXRlZ29yeX1fJHt0b29sLm5hbWV9YCkpO1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QuZmlsdGVyKHRvb2wgPT4gZW5hYmxlZFRvb2xOYW1lcy5oYXModG9vbC5uYW1lKSk7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkQXJncyA9IHRoaXMubm9ybWFsaXplVG9vbEFyZ3VtZW50cyhhcmdzKTtcbiAgICAgICAgY29uc3QgZXhlY3V0b3IgPSB0aGlzLnRvb2xFeGVjdXRvcnMuZ2V0KHRvb2xOYW1lKTtcbiAgICAgICAgaWYgKGV4ZWN1dG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gYXdhaXQgZXhlY3V0b3Iobm9ybWFsaXplZEFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFydHMgPSB0b29sTmFtZS5zcGxpdCgnXycpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuICAgICAgICBjb25zdCB0b29sTWV0aG9kTmFtZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJ18nKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLnRvb2xzW2NhdGVnb3J5XSkge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudG9vbHNbY2F0ZWdvcnldLmV4ZWN1dGUodG9vbE1ldGhvZE5hbWUsIG5vcm1hbGl6ZWRBcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb29sICR7dG9vbE5hbWV9IG5vdCBmb3VuZGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDbGllbnRzKCk6IE1DUENsaWVudFtdIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jbGllbnRzLnZhbHVlcygpKTtcbiAgICB9XG4gICAgcHVibGljIGdldEF2YWlsYWJsZVRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3Q7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHM6IGFueVtdKTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBVcGRhdGluZyBlbmFibGVkIHRvb2xzOiAke2VuYWJsZWRUb29scy5sZW5ndGh9IHRvb2xzYCk7XG4gICAgICAgIHRoaXMuZW5hYmxlZFRvb2xzID0gZW5hYmxlZFRvb2xzO1xuICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTsgLy8g6YeN5paw6K6+572u5bel5YW35YiX6KGoXG4gICAgfVxuXG4gICAgcHVibGljIGdldFNldHRpbmdzKCk6IE1DUFNlcnZlclNldHRpbmdzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVIdHRwUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcGFyc2VkVXJsID0gdXJsLnBhcnNlKHJlcS51cmwgfHwgJycsIHRydWUpO1xuICAgICAgICBjb25zdCBwYXRobmFtZSA9IHBhcnNlZFVybC5wYXRobmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBDT1JTIGhlYWRlcnNcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwYXRobmFtZSA9PT0gJy9tY3AnICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlTUNQUmVxdWVzdChyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2hlYWx0aCcgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN0YXR1czogJ29rJywgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCB9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lPy5zdGFydHNXaXRoKCcvYXBpLycpICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXEsIHJlcywgcGF0aG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9hcGkvdG9vbHMnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyB0b29sczogdGhpcy5nZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCkgfSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm90IGZvdW5kJyB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIVFRQIHJlcXVlc3QgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNQ1BSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBFbmhhbmNlZCBKU09OIHBhcnNpbmcgd2l0aCBiZXR0ZXIgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9LiBPcmlnaW5hbCBib2R5OiAke2JvZHkuc3Vic3RyaW5nKDAsIDUwMCl9Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IGNvbW1vbiBKU09OIGlzc3Vlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXhlZEJvZHkgPSB0aGlzLmZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeGVkQm9keSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTUNQIG5vdGlmaWNhdGlvbnMgaGF2ZSBubyAnaWQnIGZpZWxkIOKAlCByZXNwb25kIHdpdGggMjAyIEFjY2VwdGVkXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgPT09IHVuZGVmaW5lZCB8fCBtZXNzYWdlLmlkID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBSZWNlaXZlZCBub3RpZmljYXRpb246ICR7bWVzc2FnZS5tZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBNQ1AgcmVxdWVzdDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI3MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUGFyc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTMpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IHsgaWQsIG1ldGhvZCwgcGFyYW1zIH0gPSBtZXNzYWdlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBhbnk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvbGlzdCc6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgdG9vbHM6IHRoaXMuZ2V0QXZhaWxhYmxlVG9vbHMoKSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0b29scy9jYWxsJzoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG5hbWUsIGFyZ3VtZW50czogYXJncyB9ID0gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sUmVzdWx0ID0gYXdhaXQgdGhpcy5lbnF1ZXVlVG9vbEV4ZWN1dGlvbihuYW1lLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHRvb2xSZXN1bHQpIH1dIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gTUNQIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogJzIwMjQtMTEtMDUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwYWJpbGl0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHM6IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVySW5mbzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIHJlc3VsdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInID8gLTMyMDI5IDogLTMyNjAzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZml4Q29tbW9uSnNvbklzc3Vlcyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xuICAgICAgICBcbiAgICAgICAgLy8gRml4IGNvbW1vbiBlc2NhcGUgY2hhcmFjdGVyIGlzc3Vlc1xuICAgICAgICBmaXhlZCA9IGZpeGVkXG4gICAgICAgICAgICAvLyBGaXggdW5lc2NhcGVkIHF1b3RlcyBpbiBzdHJpbmdzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFteXFxcXF0pXCIoW15cIl0qW15cXFxcXSlcIihbXix9XFxdOl0pL2csICckMVxcXFxcIiQyXFxcXFwiJDMnKVxuICAgICAgICAgICAgLy8gRml4IHVuZXNjYXBlZCBiYWNrc2xhc2hlc1xuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVxcXFwoW15cIlxcXFxcXC9iZm5ydF0pL2csICckMVxcXFxcXFxcJDInKVxuICAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hc1xuICAgICAgICAgICAgLnJlcGxhY2UoLywoXFxzKlt9XFxdXSkvZywgJyQxJylcbiAgICAgICAgICAgIC8vIEZpeCBzaW5nbGUgcXVvdGVzIChzaG91bGQgYmUgZG91YmxlIHF1b3RlcylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICdcIicpXG4gICAgICAgICAgICAvLyBGaXggY29tbW9uIGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmaXhlZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEhUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xpZW50cy5jbGVhcigpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJ1bm5pbmc6ICEhdGhpcy5odHRwU2VydmVyLFxuICAgICAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxuICAgICAgICAgICAgY2xpZW50czogMCAvLyBIVFRQIGlzIHN0YXRlbGVzcywgbm8gcGVyc2lzdGVudCBjbGllbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL25vZGUvc2V0X3Bvc2l0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aG5hbWUuc3BsaXQoJy8nKS5maWx0ZXIocCA9PiBwKTtcbiAgICAgICAgICAgICAgICBpZiAocGF0aFBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIEFQSSBwYXRoLiBVc2UgL2FwaS97Y2F0ZWdvcnl9L3t0b29sX25hbWV9JyB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBwYXRoUGFydHNbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXRoUGFydHNbMl07XG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFRvb2xOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbE5hbWV9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBwYXJhbWV0ZXJzIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1zO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGJvZHkgPyBKU09OLnBhcnNlKGJvZHkpIDoge307XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHM6IHBhcnNlRXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBmaXggSlNPTiBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChzZWNvbmRFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHM6IHBhcnNlRXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRvb2xcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKGZ1bGxUb29sTmFtZSwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHRvb2w6IGZ1bGxUb29sTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2ltcGxlIEFQSSBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZChlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInID8gNDI5IDogNTAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQxMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZScsXG4gICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkUmVxdWVzdEJvZHkocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG4gICAgICAgICAgICBsZXQgdG90YWwgPSAwO1xuXG4gICAgICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHRvdGFsICs9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodG90YWwgPiBNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFUykge1xuICAgICAgICAgICAgICAgICAgICByZXEuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBSZXF1ZXN0IGJvZHkgZXhjZWVkcyAke01DUFNlcnZlci5NQVhfUkVRVUVTVF9CT0RZX0JZVEVTfSBieXRlc2ApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2hvdWxkVHJ5Rml4SnNvbihib2R5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFib2R5IHx8IGJvZHkubGVuZ3RoID4gMjU2ICogMTAyNCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBib2R5LmluY2x1ZGVzKCdcXCcnKSB8fCBib2R5LmluY2x1ZGVzKCcsfScpIHx8IGJvZHkuaW5jbHVkZXMoJyxdJykgfHwgYm9keS5pbmNsdWRlcygnXFxuJykgfHwgYm9keS5pbmNsdWRlcygnXFx0Jyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVUb29sQXJndW1lbnRzKGFyZ3M6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICghYXJncyB8fCB0eXBlb2YgYXJncyAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShhcmdzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXJncy5hY3Rpb24gPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYXJncy5vcGVyYXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4geyAuLi5hcmdzLCBhY3Rpb246IGFyZ3Mub3BlcmF0aW9uIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJncztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVucXVldWVUb29sRXhlY3V0aW9uKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGlmICh0aGlzLnRvb2xRdWV1ZS5sZW5ndGggPj0gTUNQU2VydmVyLk1BWF9UT09MX1FVRVVFX0xFTkdUSCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMudG9vbFF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgIHJ1bjogKCkgPT4gdGhpcy5leGVjdXRlVG9vbENhbGwodG9vbE5hbWUsIGFyZ3MpLFxuICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc05leHRUb29sUXVldWUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwcm9jZXNzTmV4dFRvb2xRdWV1ZSgpOiB2b2lkIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuYWN0aXZlVG9vbENvdW50IDwgTUNQU2VydmVyLk1BWF9DT05DVVJSRU5UX1RPT0xTICYmIHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRvb2xRdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKCF0YXNrKSBicmVhaztcblxuICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQrKztcblxuICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUb29sIGV4ZWN1dGlvbiB0aW1lb3V0ICgke01DUFNlcnZlci5UT09MX0VYRUNVVElPTl9USU1FT1VUX01TfW1zKWApKSwgTUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFByb21pc2UucmFjZShbdGFzay5ydW4oKSwgdGltZW91dFByb21pc2VdKVxuICAgICAgICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHRhc2sucmVzb2x2ZShyZXN1bHQpKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB0YXNrLnJlamVjdChlcnIpKVxuICAgICAgICAgICAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCk6IGFueVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0Lm1hcCh0b29sID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbC5uYW1lLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCdfJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICB0b29sTmFtZTogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgYXBpUGF0aDogYC9hcGkvJHtjYXRlZ29yeX0vJHt0b29sTmFtZX1gLFxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2xOYW1lLCB0b29sLmlucHV0U2NoZW1hKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUN1cmxFeGFtcGxlKGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xOYW1lOiBzdHJpbmcsIHNjaGVtYTogYW55KTogc3RyaW5nIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgc2FtcGxlIHBhcmFtZXRlcnMgYmFzZWQgb24gc2NoZW1hXG4gICAgICAgIGNvbnN0IHNhbXBsZVBhcmFtcyA9IHRoaXMuZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hKTtcbiAgICAgICAgY29uc3QganNvblN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZVBhcmFtcywgbnVsbCwgMik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYGN1cmwgLVggUE9TVCBodHRwOi8vMTI3LjAuMC4xOjg1ODUvYXBpLyR7Y2F0ZWdvcnl9LyR7dG9vbE5hbWV9IFxcXFxcbiAgLUggXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIiBcXFxcXG4gIC1kICcke2pzb25TdHJpbmd9J2A7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWE6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICghc2NoZW1hIHx8ICFzY2hlbWEucHJvcGVydGllcykgcmV0dXJuIHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FtcGxlOiBhbnkgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wXSBvZiBPYmplY3QuZW50cmllcyhzY2hlbWEucHJvcGVydGllcyBhcyBhbnkpKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wU2NoZW1hID0gcHJvcCBhcyBhbnk7XG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BTY2hlbWEudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8ICdleGFtcGxlX3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IDQyO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gJ2V4YW1wbGVfdmFsdWUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzYW1wbGU7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBIVFRQIHRyYW5zcG9ydCBkb2Vzbid0IG5lZWQgcGVyc2lzdGVudCBjb25uZWN0aW9uc1xuLy8gTUNQIG92ZXIgSFRUUCB1c2VzIHJlcXVlc3QtcmVzcG9uc2UgcGF0dGVyblxuIl19