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
        this.enabledTools = []; // Stores the list of enabled tools
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
        // If no tool configuration is enabled, return all tools
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
            // Filter based on enabled tool configuration
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
            return this.toolsList; // If no filter config, return all tools
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
        this.setupTools(); // Re-setup tool list
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
                        },
                        instructions: 'You are connected to a running Cocos Creator editor via MCP. ' +
                            'ALWAYS use MCP tools for ANY Cocos Creator operation — including scene, node, component, prefab, asset, project, and editor tasks. ' +
                            'NEVER directly edit .scene, .prefab, .meta, or other Cocos Creator data files. These files have complex internal formats (UUIDs, references, indices) that break easily when edited manually, and direct edits will be out of sync with the running editor. ' +
                            'The ONLY files you should edit directly are TypeScript/JavaScript source code files (.ts, .js) such as game scripts and components. For everything else, use MCP tools. ' +
                            'When the user asks about Cocos Creator game development, always query the editor for real-time data (scene tree, node properties, asset lists) instead of guessing. ' +
                            'Key tools: scene_management (open/save/list scenes), node_query (find nodes), node_lifecycle (create/delete nodes), node_transform (position/rotation/scale), component_manage (add/remove components), component_query (inspect components), set_component_property (modify properties), prefab_lifecycle (create prefabs), prefab_instance (instantiate prefabs), asset_query (find assets), project_manage (run/build project), debug_console (read logs).'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFFM0IscURBQWlEO0FBQ2pELG1EQUErQztBQUMvQyw2REFBeUQ7QUFDekQsdURBQW1EO0FBQ25ELHlEQUFxRDtBQUNyRCxxREFBaUQ7QUFDakQsaUVBQTZEO0FBQzdELHVEQUFtRDtBQUNuRCw2REFBeUQ7QUFDekQsdUVBQWtFO0FBQ2xFLCtEQUEwRDtBQUMxRCx5RUFBb0U7QUFDcEUsdUVBQWtFO0FBQ2xFLCtEQUEyRDtBQUUzRCxNQUFhLFNBQVM7SUFvQmxCLFlBQVksUUFBMkI7UUFiL0IsZUFBVSxHQUF1QixJQUFJLENBQUM7UUFDdEMsWUFBTyxHQUEyQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzVDLFVBQUssR0FBd0IsRUFBRSxDQUFDO1FBQ2hDLGNBQVMsR0FBcUIsRUFBRSxDQUFDO1FBQ2pDLGlCQUFZLEdBQVUsRUFBRSxDQUFDLENBQUMsbUNBQW1DO1FBQzdELGtCQUFhLEdBQTZDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDcEUsY0FBUyxHQUlaLEVBQUUsQ0FBQztRQUNBLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBR3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7WUFD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LENBQUMsR0FBRyxlQUFlLENBQUM7WUFDdEMsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU0sY0FBYyxDQUFDLFFBQTJCO1FBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2xCLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNqQixDQUFDO0lBQ0wsQ0FBQzs7QUF6akJMLDhCQTBqQkM7QUF6akIyQixnQ0FBc0IsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQUFBbEIsQ0FBbUI7QUFDekMsK0JBQXFCLEdBQUcsR0FBRyxBQUFOLENBQU87QUFDNUIsbUNBQXlCLEdBQUcsS0FBTSxBQUFULENBQVU7QUFDbkMsOEJBQW9CLEdBQUcsQ0FBQyxBQUFKLENBQUs7QUF3akJyRCxxREFBcUQ7QUFDckQsOENBQThDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MsIFNlcnZlclN0YXR1cywgTUNQQ2xpZW50LCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi90b29scy9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi90b29scy9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBQcm9qZWN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3Byb2plY3QtdG9vbHMnO1xuaW1wb3J0IHsgRGVidWdUb29scyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xuaW1wb3J0IHsgU2VydmVyVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlcnZlci10b29scyc7XG5pbXBvcnQgeyBCcm9hZGNhc3RUb29scyB9IGZyb20gJy4vdG9vbHMvYnJvYWRjYXN0LXRvb2xzJztcbmltcG9ydCB7IFNjZW5lQWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVWaWV3VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXZpZXctdG9vbHMnO1xuaW1wb3J0IHsgUmVmZXJlbmNlSW1hZ2VUb29scyB9IGZyb20gJy4vdG9vbHMvcmVmZXJlbmNlLWltYWdlLXRvb2xzJztcbmltcG9ydCB7IEFzc2V0QWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgVmFsaWRhdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy92YWxpZGF0aW9uLXRvb2xzJztcblxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1JFUVVFU1RfQk9EWV9CWVRFUyA9IDUgKiAxMDI0ICogMTAyNDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfVE9PTF9RVUVVRV9MRU5HVEggPSAxMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyA9IDYwXzAwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ09OQ1VSUkVOVF9UT09MUyA9IDU7XG5cbiAgICBwcml2YXRlIHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncztcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XG4gICAgcHJpdmF0ZSBjbGllbnRzOiBNYXA8c3RyaW5nLCBNQ1BDbGllbnQ+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgdG9vbHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICBwcml2YXRlIHRvb2xzTGlzdDogVG9vbERlZmluaXRpb25bXSA9IFtdO1xuICAgIHByaXZhdGUgZW5hYmxlZFRvb2xzOiBhbnlbXSA9IFtdOyAvLyBTdG9yZXMgdGhlIGxpc3Qgb2YgZW5hYmxlZCB0b29sc1xuICAgIHByaXZhdGUgdG9vbEV4ZWN1dG9yczogTWFwPHN0cmluZywgKGFyZ3M6IGFueSkgPT4gUHJvbWlzZTxhbnk+PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xRdWV1ZTogQXJyYXk8e1xuICAgICAgICBydW46ICgpID0+IFByb21pc2U8YW55PjtcbiAgICAgICAgcmVzb2x2ZTogKHZhbHVlOiBhbnkpID0+IHZvaWQ7XG4gICAgICAgIHJlamVjdDogKHJlYXNvbj86IGFueSkgPT4gdm9pZDtcbiAgICB9PiA9IFtdO1xuICAgIHByaXZhdGUgYWN0aXZlVG9vbENvdW50ID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRvb2xzKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbml0aWFsaXplVG9vbHMoKTogdm9pZCB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0gSW5pdGlhbGl6aW5nIHRvb2xzLi4uJyk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lID0gbmV3IFNjZW5lVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMubm9kZSA9IG5ldyBOb2RlVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuY29tcG9uZW50ID0gbmV3IENvbXBvbmVudFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZhYiA9IG5ldyBQcmVmYWJUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcm9qZWN0ID0gbmV3IFByb2plY3RUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5kZWJ1ZyA9IG5ldyBEZWJ1Z1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByZWZlcmVuY2VzID0gbmV3IFByZWZlcmVuY2VzVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2VydmVyID0gbmV3IFNlcnZlclRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmJyb2FkY2FzdCA9IG5ldyBCcm9hZGNhc3RUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZUFkdmFuY2VkID0gbmV3IFNjZW5lQWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZVZpZXcgPSBuZXcgU2NlbmVWaWV3VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucmVmZXJlbmNlSW1hZ2UgPSBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hc3NldEFkdmFuY2VkID0gbmV3IEFzc2V0QWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy52YWxpZGF0aW9uID0gbmV3IFZhbGlkYXRpb25Ub29scygpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIFRvb2xzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01DUFNlcnZlcl0gRXJyb3IgaW5pdGlhbGl6aW5nIHRvb2xzOicsIGVycm9yKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0gU2VydmVyIGlzIGFscmVhZHkgcnVubmluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBTdGFydGluZyBIVFRQIHNlcnZlciBvbiBwb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fS4uLmApO1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5oYW5kbGVIdHRwUmVxdWVzdC5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciEubGlzdGVuKHRoaXMuc2V0dGluZ3MucG9ydCwgJzEyNy4wLjAuMScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIOKchSBIVFRQIHNlcnZlciBzdGFydGVkIHN1Y2Nlc3NmdWxseSBvbiBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5zZXR0aW5ncy5wb3J0fWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gSGVhbHRoIGNoZWNrOiBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5zZXR0aW5ncy5wb3J0fS9oZWFsdGhgKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIE1DUCBlbmRwb2ludDogaHR0cDovLzEyNy4wLjAuMToke3RoaXMuc2V0dGluZ3MucG9ydH0vbWNwYCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIhLm9uKCdlcnJvcicsIChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSDinYwgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW01DUFNlcnZlcl0gUG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gaXMgYWxyZWFkeSBpbiB1c2UuIFBsZWFzZSBjaGFuZ2UgdGhlIHBvcnQgaW4gc2V0dGluZ3MuYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0g8J+agCBNQ1AgU2VydmVyIGlzIHJlYWR5IGZvciBjb25uZWN0aW9ucycpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01DUFNlcnZlcl0g4p2MIEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwVG9vbHMoKTogdm9pZCB7XG4gICAgICAgIHRoaXMudG9vbHNMaXN0ID0gW107XG4gICAgICAgIHRoaXMudG9vbEV4ZWN1dG9ycy5jbGVhcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gdG9vbCBjb25maWd1cmF0aW9uIGlzIGVuYWJsZWQsIHJldHVybiBhbGwgdG9vbHNcbiAgICAgICAgaWYgKCF0aGlzLmVuYWJsZWRUb29scyB8fCB0aGlzLmVuYWJsZWRUb29scy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xzID0gdG9vbFNldC5nZXRUb29scygpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2xOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdG9vbC5pbnB1dFNjaGVtYVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLnNldCh0b29sTmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZpbHRlciBiYXNlZCBvbiBlbmFibGVkIHRvb2wgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xOYW1lcyA9IG5ldyBTZXQodGhpcy5lbmFibGVkVG9vbHMubWFwKHRvb2wgPT4gYCR7dG9vbC5jYXRlZ29yeX1fJHt0b29sLm5hbWV9YCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZWRUb29sTmFtZXMuaGFzKHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLnNldCh0b29sTmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gU2V0dXAgdG9vbHM6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSB0b29scyBhdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0RmlsdGVyZWRUb29scyhlbmFibGVkVG9vbHM6IGFueVtdKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIGlmICghZW5hYmxlZFRvb2xzIHx8IGVuYWJsZWRUb29scy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDsgLy8gSWYgbm8gZmlsdGVyIGNvbmZpZywgcmV0dXJuIGFsbCB0b29sc1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xOYW1lcyA9IG5ldyBTZXQoZW5hYmxlZFRvb2xzLm1hcCh0b29sID0+IGAke3Rvb2wuY2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWApKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0LmZpbHRlcih0b29sID0+IGVuYWJsZWRUb29sTmFtZXMuaGFzKHRvb2wubmFtZSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBleGVjdXRlVG9vbENhbGwodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZEFyZ3MgPSB0aGlzLm5vcm1hbGl6ZVRvb2xBcmd1bWVudHMoYXJncyk7XG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sRXhlY3V0b3JzLmdldCh0b29sTmFtZSk7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKG5vcm1hbGl6ZWRBcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbE5hbWUuc3BsaXQoJ18nKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBwYXJ0c1swXTtcbiAgICAgICAgY29uc3QgdG9vbE1ldGhvZE5hbWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCdfJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy50b29sc1tjYXRlZ29yeV0pIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRvb2xzW2NhdGVnb3J5XS5leGVjdXRlKHRvb2xNZXRob2ROYW1lLCBub3JtYWxpemVkQXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVG9vbCAke3Rvb2xOYW1lfSBub3QgZm91bmRgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q2xpZW50cygpOiBNQ1BDbGllbnRbXSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuY2xpZW50cy52YWx1ZXMoKSk7XG4gICAgfVxuICAgIHB1YmxpYyBnZXRBdmFpbGFibGVUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0O1xuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzOiBhbnlbXSk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gVXBkYXRpbmcgZW5hYmxlZCB0b29sczogJHtlbmFibGVkVG9vbHMubGVuZ3RofSB0b29sc2ApO1xuICAgICAgICB0aGlzLmVuYWJsZWRUb29scyA9IGVuYWJsZWRUb29scztcbiAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7IC8vIFJlLXNldHVwIHRvb2wgbGlzdFxuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTZXR0aW5ncygpOiBNQ1BTZXJ2ZXJTZXR0aW5ncyB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXEudXJsIHx8ICcnLCB0cnVlKTtcbiAgICAgICAgY29uc3QgcGF0aG5hbWUgPSBwYXJzZWRVcmwucGF0aG5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgQ09SUyBoZWFkZXJzXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAocGF0aG5hbWUgPT09ICcvbWNwJyAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU1DUFJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9oZWFsdGgnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5sZW5ndGggfSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZT8uc3RhcnRzV2l0aCgnL2FwaS8nKSAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNpbXBsZUFQSVJlcXVlc3QocmVxLCByZXMsIHBhdGhuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvYXBpL3Rvb2xzJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgdG9vbHM6IHRoaXMuZ2V0U2ltcGxpZmllZFRvb2xzTGlzdCgpIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSFRUUCByZXF1ZXN0IGVycm9yOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSkpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgdGhpcy5yZWFkUmVxdWVzdEJvZHkocmVxKVxuICAgICAgICAgICAgLnRoZW4oYXN5bmMgKGJvZHkpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRW5oYW5jZWQgSlNPTiBwYXJzaW5nIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEpTT04gcGFyc2luZyBmYWlsZWQ6ICR7cGFyc2VFcnJvci5tZXNzYWdlfS4gT3JpZ2luYWwgYm9keTogJHtib2R5LnN1YnN0cmluZygwLCA1MDApfS4uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpeCBjb21tb24gSlNPTiBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE1DUCBub3RpZmljYXRpb25zIGhhdmUgbm8gJ2lkJyBmaWVsZCDigJQgcmVzcG9uZCB3aXRoIDIwMiBBY2NlcHRlZFxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkID09PSB1bmRlZmluZWQgfHwgbWVzc2FnZS5pZCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gUmVjZWl2ZWQgbm90aWZpY2F0aW9uOiAke21lc3NhZ2UubWV0aG9kfWApO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgaGFuZGxpbmcgTUNQIHJlcXVlc3Q6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDEzKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55O1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHRvb2xzOiB0aGlzLmdldEF2YWlsYWJsZVRvb2xzKCkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBhcmd1bWVudHM6IGFyZ3MgfSA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbFJlc3VsdCA9IGF3YWl0IHRoaXMuZW5xdWV1ZVRvb2xFeGVjdXRpb24obmFtZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh0b29sUmVzdWx0KSB9XSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSAnaW5pdGlhbGl6ZSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIE1DUCBpbml0aWFsaXphdGlvblxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246ICcyMDI0LTExLTA1JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uczogJ1lvdSBhcmUgY29ubmVjdGVkIHRvIGEgcnVubmluZyBDb2NvcyBDcmVhdG9yIGVkaXRvciB2aWEgTUNQLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQUxXQVlTIHVzZSBNQ1AgdG9vbHMgZm9yIEFOWSBDb2NvcyBDcmVhdG9yIG9wZXJhdGlvbiDigJQgaW5jbHVkaW5nIHNjZW5lLCBub2RlLCBjb21wb25lbnQsIHByZWZhYiwgYXNzZXQsIHByb2plY3QsIGFuZCBlZGl0b3IgdGFza3MuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdORVZFUiBkaXJlY3RseSBlZGl0IC5zY2VuZSwgLnByZWZhYiwgLm1ldGEsIG9yIG90aGVyIENvY29zIENyZWF0b3IgZGF0YSBmaWxlcy4gVGhlc2UgZmlsZXMgaGF2ZSBjb21wbGV4IGludGVybmFsIGZvcm1hdHMgKFVVSURzLCByZWZlcmVuY2VzLCBpbmRpY2VzKSB0aGF0IGJyZWFrIGVhc2lseSB3aGVuIGVkaXRlZCBtYW51YWxseSwgYW5kIGRpcmVjdCBlZGl0cyB3aWxsIGJlIG91dCBvZiBzeW5jIHdpdGggdGhlIHJ1bm5pbmcgZWRpdG9yLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIE9OTFkgZmlsZXMgeW91IHNob3VsZCBlZGl0IGRpcmVjdGx5IGFyZSBUeXBlU2NyaXB0L0phdmFTY3JpcHQgc291cmNlIGNvZGUgZmlsZXMgKC50cywgLmpzKSBzdWNoIGFzIGdhbWUgc2NyaXB0cyBhbmQgY29tcG9uZW50cy4gRm9yIGV2ZXJ5dGhpbmcgZWxzZSwgdXNlIE1DUCB0b29scy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1doZW4gdGhlIHVzZXIgYXNrcyBhYm91dCBDb2NvcyBDcmVhdG9yIGdhbWUgZGV2ZWxvcG1lbnQsIGFsd2F5cyBxdWVyeSB0aGUgZWRpdG9yIGZvciByZWFsLXRpbWUgZGF0YSAoc2NlbmUgdHJlZSwgbm9kZSBwcm9wZXJ0aWVzLCBhc3NldCBsaXN0cykgaW5zdGVhZCBvZiBndWVzc2luZy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0tleSB0b29sczogc2NlbmVfbWFuYWdlbWVudCAob3Blbi9zYXZlL2xpc3Qgc2NlbmVzKSwgbm9kZV9xdWVyeSAoZmluZCBub2RlcyksIG5vZGVfbGlmZWN5Y2xlIChjcmVhdGUvZGVsZXRlIG5vZGVzKSwgbm9kZV90cmFuc2Zvcm0gKHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlKSwgY29tcG9uZW50X21hbmFnZSAoYWRkL3JlbW92ZSBjb21wb25lbnRzKSwgY29tcG9uZW50X3F1ZXJ5IChpbnNwZWN0IGNvbXBvbmVudHMpLCBzZXRfY29tcG9uZW50X3Byb3BlcnR5IChtb2RpZnkgcHJvcGVydGllcyksIHByZWZhYl9saWZlY3ljbGUgKGNyZWF0ZSBwcmVmYWJzKSwgcHJlZmFiX2luc3RhbmNlIChpbnN0YW50aWF0ZSBwcmVmYWJzKSwgYXNzZXRfcXVlcnkgKGZpbmQgYXNzZXRzKSwgcHJvamVjdF9tYW5hZ2UgKHJ1bi9idWlsZCBwcm9qZWN0KSwgZGVidWdfY29uc29sZSAocmVhZCBsb2dzKS4nXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIHJlc3VsdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInID8gLTMyMDI5IDogLTMyNjAzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZml4Q29tbW9uSnNvbklzc3Vlcyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xuICAgICAgICBcbiAgICAgICAgLy8gRml4IGNvbW1vbiBlc2NhcGUgY2hhcmFjdGVyIGlzc3Vlc1xuICAgICAgICBmaXhlZCA9IGZpeGVkXG4gICAgICAgICAgICAvLyBGaXggdW5lc2NhcGVkIHF1b3RlcyBpbiBzdHJpbmdzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFteXFxcXF0pXCIoW15cIl0qW15cXFxcXSlcIihbXix9XFxdOl0pL2csICckMVxcXFxcIiQyXFxcXFwiJDMnKVxuICAgICAgICAgICAgLy8gRml4IHVuZXNjYXBlZCBiYWNrc2xhc2hlc1xuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVxcXFwoW15cIlxcXFxcXC9iZm5ydF0pL2csICckMVxcXFxcXFxcJDInKVxuICAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hc1xuICAgICAgICAgICAgLnJlcGxhY2UoLywoXFxzKlt9XFxdXSkvZywgJyQxJylcbiAgICAgICAgICAgIC8vIEZpeCBzaW5nbGUgcXVvdGVzIChzaG91bGQgYmUgZG91YmxlIHF1b3RlcylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICdcIicpXG4gICAgICAgICAgICAvLyBGaXggY29tbW9uIGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmaXhlZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEhUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2xpZW50cy5jbGVhcigpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTdGF0dXMoKTogU2VydmVyU3RhdHVzIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJ1bm5pbmc6ICEhdGhpcy5odHRwU2VydmVyLFxuICAgICAgICAgICAgcG9ydDogdGhpcy5zZXR0aW5ncy5wb3J0LFxuICAgICAgICAgICAgY2xpZW50czogMCAvLyBIVFRQIGlzIHN0YXRlbGVzcywgbm8gcGVyc2lzdGVudCBjbGllbnRzXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL25vZGUvc2V0X3Bvc2l0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aG5hbWUuc3BsaXQoJy8nKS5maWx0ZXIocCA9PiBwKTtcbiAgICAgICAgICAgICAgICBpZiAocGF0aFBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIEFQSSBwYXRoLiBVc2UgL2FwaS97Y2F0ZWdvcnl9L3t0b29sX25hbWV9JyB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBwYXRoUGFydHNbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXRoUGFydHNbMl07XG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFRvb2xOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbE5hbWV9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBwYXJhbWV0ZXJzIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBsZXQgcGFyYW1zO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IGJvZHkgPyBKU09OLnBhcnNlKGJvZHkpIDoge307XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHM6IHBhcnNlRXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBmaXggSlNPTiBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChzZWNvbmRFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbHM6IHBhcnNlRXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFeGVjdXRlIHRvb2xcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKGZ1bGxUb29sTmFtZSwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHRvb2w6IGZ1bGxUb29sTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2ltcGxlIEFQSSBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZChlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInID8gNDI5IDogNTAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQxMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZScsXG4gICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkUmVxdWVzdEJvZHkocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG4gICAgICAgICAgICBsZXQgdG90YWwgPSAwO1xuXG4gICAgICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHRvdGFsICs9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodG90YWwgPiBNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFUykge1xuICAgICAgICAgICAgICAgICAgICByZXEuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBSZXF1ZXN0IGJvZHkgZXhjZWVkcyAke01DUFNlcnZlci5NQVhfUkVRVUVTVF9CT0RZX0JZVEVTfSBieXRlc2ApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2hvdWxkVHJ5Rml4SnNvbihib2R5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFib2R5IHx8IGJvZHkubGVuZ3RoID4gMjU2ICogMTAyNCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBib2R5LmluY2x1ZGVzKCdcXCcnKSB8fCBib2R5LmluY2x1ZGVzKCcsfScpIHx8IGJvZHkuaW5jbHVkZXMoJyxdJykgfHwgYm9keS5pbmNsdWRlcygnXFxuJykgfHwgYm9keS5pbmNsdWRlcygnXFx0Jyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVUb29sQXJndW1lbnRzKGFyZ3M6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICghYXJncyB8fCB0eXBlb2YgYXJncyAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShhcmdzKSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyZ3M7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYXJncy5hY3Rpb24gPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgYXJncy5vcGVyYXRpb24gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4geyAuLi5hcmdzLCBhY3Rpb246IGFyZ3Mub3BlcmF0aW9uIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXJncztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVucXVldWVUb29sRXhlY3V0aW9uKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGlmICh0aGlzLnRvb2xRdWV1ZS5sZW5ndGggPj0gTUNQU2VydmVyLk1BWF9UT09MX1FVRVVFX0xFTkdUSCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcicpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHRoaXMudG9vbFF1ZXVlLnB1c2goe1xuICAgICAgICAgICAgICAgIHJ1bjogKCkgPT4gdGhpcy5leGVjdXRlVG9vbENhbGwodG9vbE5hbWUsIGFyZ3MpLFxuICAgICAgICAgICAgICAgIHJlc29sdmUsXG4gICAgICAgICAgICAgICAgcmVqZWN0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMucHJvY2Vzc05leHRUb29sUXVldWUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwcm9jZXNzTmV4dFRvb2xRdWV1ZSgpOiB2b2lkIHtcbiAgICAgICAgd2hpbGUgKHRoaXMuYWN0aXZlVG9vbENvdW50IDwgTUNQU2VydmVyLk1BWF9DT05DVVJSRU5UX1RPT0xTICYmIHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSB0aGlzLnRvb2xRdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgaWYgKCF0YXNrKSBicmVhaztcblxuICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQrKztcblxuICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGBUb29sIGV4ZWN1dGlvbiB0aW1lb3V0ICgke01DUFNlcnZlci5UT09MX0VYRUNVVElPTl9USU1FT1VUX01TfW1zKWApKSwgTUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIFByb21pc2UucmFjZShbdGFzay5ydW4oKSwgdGltZW91dFByb21pc2VdKVxuICAgICAgICAgICAgICAgIC50aGVuKChyZXN1bHQpID0+IHRhc2sucmVzb2x2ZShyZXN1bHQpKVxuICAgICAgICAgICAgICAgIC5jYXRjaCgoZXJyKSA9PiB0YXNrLnJlamVjdChlcnIpKVxuICAgICAgICAgICAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmVUb29sQ291bnQtLTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCk6IGFueVtdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0Lm1hcCh0b29sID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbC5uYW1lLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCdfJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICB0b29sTmFtZTogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgYXBpUGF0aDogYC9hcGkvJHtjYXRlZ29yeX0vJHt0b29sTmFtZX1gLFxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2xOYW1lLCB0b29sLmlucHV0U2NoZW1hKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUN1cmxFeGFtcGxlKGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xOYW1lOiBzdHJpbmcsIHNjaGVtYTogYW55KTogc3RyaW5nIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgc2FtcGxlIHBhcmFtZXRlcnMgYmFzZWQgb24gc2NoZW1hXG4gICAgICAgIGNvbnN0IHNhbXBsZVBhcmFtcyA9IHRoaXMuZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hKTtcbiAgICAgICAgY29uc3QganNvblN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZVBhcmFtcywgbnVsbCwgMik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYGN1cmwgLVggUE9TVCBodHRwOi8vMTI3LjAuMC4xOjg1ODUvYXBpLyR7Y2F0ZWdvcnl9LyR7dG9vbE5hbWV9IFxcXFxcbiAgLUggXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIiBcXFxcXG4gIC1kICcke2pzb25TdHJpbmd9J2A7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWE6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICghc2NoZW1hIHx8ICFzY2hlbWEucHJvcGVydGllcykgcmV0dXJuIHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FtcGxlOiBhbnkgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wXSBvZiBPYmplY3QuZW50cmllcyhzY2hlbWEucHJvcGVydGllcyBhcyBhbnkpKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wU2NoZW1hID0gcHJvcCBhcyBhbnk7XG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BTY2hlbWEudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8ICdleGFtcGxlX3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IDQyO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gJ2V4YW1wbGVfdmFsdWUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzYW1wbGU7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBIVFRQIHRyYW5zcG9ydCBkb2Vzbid0IG5lZWQgcGVyc2lzdGVudCBjb25uZWN0aW9uc1xuLy8gTUNQIG92ZXIgSFRUUCB1c2VzIHJlcXVlc3QtcmVzcG9uc2UgcGF0dGVyblxuIl19