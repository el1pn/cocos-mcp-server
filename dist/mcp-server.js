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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const crypto_1 = require("crypto");
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const logger_1 = require("./logger");
const mcp_clients_1 = require("./mcp-clients");
const scene_tools_1 = require("./tools/scene-tools");
const node_tools_1 = require("./tools/node-tools");
const component_tools_1 = require("./tools/component-tools");
const prefab_tools_1 = require("./tools/prefab-tools");
const project_tools_1 = require("./tools/project-tools");
const debug_tools_1 = require("./tools/debug-tools");
const preferences_tools_1 = require("./tools/preferences-tools");
const server_tools_1 = require("./tools/server-tools");
const scene_advanced_tools_1 = require("./tools/scene-advanced-tools");
const asset_advanced_tools_1 = require("./tools/asset-advanced-tools");
const batch_tools_1 = require("./tools/batch-tools");
const editor_tools_1 = require("./tools/editor-tools");
const material_tools_1 = require("./tools/material-tools");
const ui_builder_tools_1 = require("./tools/ui-builder-tools");
const scene_capture_tools_1 = require("./tools/scene-capture-tools");
const knowledge_tools_1 = require("./tools/knowledge-tools");
const reference_image_tools_1 = require("./tools/reference-image-tools");
const scene_view_tools_1 = require("./tools/scene-view-tools");
const animation_tools_1 = require("./tools/animation-tools");
const search_tools_1 = require("./tools/search-tools");
const validation_tools_1 = require("./tools/validation-tools");
class MCPServer {
    static createUuid() {
        const bytes = (0, crypto_1.randomBytes)(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    constructor(settings) {
        this.httpServer = null;
        this.clients = new Map();
        this.sessionStreams = new Map();
        this.legacySseStreams = new Map();
        this.tools = {};
        this.toolsList = [];
        this.toolExecutors = new Map();
        this.mcpClientRegisterRetry = null;
        this.toolQueue = [];
        this.activeToolCount = 0;
        this.settings = settings;
        this.serverInstanceId = MCPServer.createUuid();
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
            this.tools.sceneAdvanced = new scene_advanced_tools_1.SceneAdvancedTools();
            this.tools.assetAdvanced = new asset_advanced_tools_1.AssetAdvancedTools();
            this.tools.batch = new batch_tools_1.BatchTools(this.executeToolCall.bind(this));
            this.tools.editor = new editor_tools_1.EditorTools();
            this.tools.material = new material_tools_1.MaterialTools();
            this.tools.uiBuilder = new ui_builder_tools_1.UIBuilderTools();
            this.tools.sceneCapture = new scene_capture_tools_1.SceneCaptureTools();
            this.tools.knowledge = new knowledge_tools_1.KnowledgeTools();
            this.tools.referenceImage = new reference_image_tools_1.ReferenceImageTools();
            this.tools.sceneView = new scene_view_tools_1.SceneViewTools();
            this.tools.animation = new animation_tools_1.AnimationTools();
            this.tools.search = new search_tools_1.SearchTools();
            this.tools.validation = new validation_tools_1.ValidationTools();
            logger_1.logger.success('Tools initialized successfully');
        }
        catch (error) {
            logger_1.logger.error(`Error initializing tools: ${error}`);
            throw error;
        }
    }
    async start() {
        var _a;
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
                (_a = this.mcpClientRegisterRetry) === null || _a === void 0 ? void 0 : _a.cancel();
                this.mcpClientRegisterRetry = (0, mcp_clients_1.registerAllMcpClients)(Editor.Project.path, port);
                this.setupTools();
                logger_1.logger.success('MCP Server is ready for connections');
                return;
            }
            catch (err) {
                lastError = err;
                if (err.code === 'EADDRINUSE') {
                    const retryDelay = Math.min(500 * (attempt + 1), 2000);
                    logger_1.logger.warn(`Port ${port} in use, trying ${port + 1} in ${retryDelay}ms (attempt ${attempt + 1}/${MCPServer.MAX_PORT_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
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
        const executor = this.toolExecutors.get(toolName);
        if (executor) {
            return await executor(args);
        }
        // Fallback: try to find the tool in any executor
        for (const [_category, toolSet] of Object.entries(this.tools)) {
            const tools = toolSet.getTools();
            if (tools.some((t) => t.name === toolName)) {
                return await toolSet.execute(toolName, args);
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
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', `Content-Type, Authorization, ${MCPServer.PROTOCOL_HEADER}, ${MCPServer.SESSION_HEADER}`);
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        if (!this.validateRequestOrigin(req, res)) {
            return;
        }
        try {
            if (pathname === '/mcp') {
                await this.handleMCPTransportRequest(req, res);
            }
            else if (pathname === '/sse' && req.method === 'GET') {
                this.handleSSEConnection(req, res);
            }
            else if (pathname === '/messages' && req.method === 'POST') {
                await this.handleSSEMessageRequest(req, res, parsedUrl.query);
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
    validateRequestOrigin(req, res) {
        var _a, _b;
        const origin = this.getHeader(req, 'origin');
        if (!origin || origin === 'null') {
            return true;
        }
        if (((_a = this.settings.allowedOrigins) === null || _a === void 0 ? void 0 : _a.includes('*')) || ((_b = this.settings.allowedOrigins) === null || _b === void 0 ? void 0 : _b.includes(origin))) {
            return true;
        }
        try {
            const parsed = new URL(origin);
            if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
                return true;
            }
        }
        catch (_c) {
            // fall through
        }
        res.writeHead(403);
        res.end(JSON.stringify({ error: `Origin not allowed: ${origin}` }));
        return false;
    }
    getHeader(req, headerName) {
        const value = req.headers[headerName.toLowerCase()];
        if (Array.isArray(value))
            return value[0];
        return value;
    }
    acceptsContentType(acceptHeader, requiredType) {
        if (!acceptHeader) {
            return false;
        }
        const normalized = acceptHeader.toLowerCase();
        return normalized.includes('*/*') || normalized.includes(requiredType.toLowerCase());
    }
    validateMCPPostHeaders(req, res) {
        const accept = this.getHeader(req, 'accept') || '';
        if (!this.acceptsContentType(accept, 'application/json') || !this.acceptsContentType(accept, 'text/event-stream')) {
            res.writeHead(406);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: 'POST /mcp requires Accept header containing both application/json and text/event-stream'
                }
            }));
            return false;
        }
        const contentType = (this.getHeader(req, 'content-type') || '').toLowerCase();
        if (!contentType.includes('application/json')) {
            res.writeHead(415);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: 'POST /mcp requires Content-Type: application/json'
                }
            }));
            return false;
        }
        return true;
    }
    isJsonRpcRequestMessage(message) {
        return !!message && typeof message === 'object' && typeof message.method === 'string';
    }
    isJsonRpcNotification(message) {
        return this.isJsonRpcRequestMessage(message) && (message.id === undefined || message.id === null);
    }
    isJsonRpcResponseMessage(message) {
        if (!message || typeof message !== 'object')
            return false;
        if (typeof message.method === 'string')
            return false;
        if (message.id === undefined || message.id === null)
            return false;
        return Object.prototype.hasOwnProperty.call(message, 'result') || Object.prototype.hasOwnProperty.call(message, 'error');
    }
    async handleMCPTransportRequest(req, res) {
        if (req.method === 'POST') {
            await this.handleMCPRequest(req, res);
            return;
        }
        if (req.method === 'GET') {
            this.handleMCPStreamRequest(req, res);
            return;
        }
        if (req.method === 'DELETE') {
            this.handleMCPDeleteSession(req, res);
            return;
        }
        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
    handleMCPStreamRequest(req, res) {
        const session = this.validateSessionHeader(req, res, true);
        if (!session)
            return;
        const accept = this.getHeader(req, 'accept') || '';
        if (!this.acceptsContentType(accept, 'text/event-stream')) {
            res.writeHead(406);
            res.end(JSON.stringify({ error: 'GET /mcp requires Accept: text/event-stream' }));
            return;
        }
        if (!session.initialized) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: `Session is not initialized: ${session.id}` }));
            return;
        }
        this.setupSSEHeaders(res);
        res.setHeader(MCPServer.PROTOCOL_HEADER, session.protocolVersion || MCPServer.DEFAULT_PROTOCOL_VERSION);
        res.setHeader(MCPServer.SESSION_HEADER, session.id);
        res.writeHead(200);
        const streamId = MCPServer.createUuid();
        const sessionStreamSet = this.sessionStreams.get(session.id) || new Map();
        sessionStreamSet.set(streamId, res);
        this.sessionStreams.set(session.id, sessionStreamSet);
        session.lastActivity = new Date();
        this.clients.set(session.id, session);
        res.write(': connected\n\n');
        req.on('close', () => {
            const streams = this.sessionStreams.get(session.id);
            if (!streams)
                return;
            streams.delete(streamId);
            if (streams.size === 0) {
                this.sessionStreams.delete(session.id);
            }
        });
    }
    handleMCPDeleteSession(req, res) {
        const session = this.validateSessionHeader(req, res, true);
        if (!session)
            return;
        const streams = this.sessionStreams.get(session.id);
        if (streams) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                }
                catch (_a) {
                    // no-op
                }
            }
            this.sessionStreams.delete(session.id);
        }
        this.clients.delete(session.id);
        res.writeHead(204);
        res.end();
    }
    setupSSEHeaders(res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
    }
    negotiateProtocolVersion(messageProtocol, headerProtocol) {
        const requested = typeof messageProtocol === 'string'
            ? messageProtocol
            : (headerProtocol || MCPServer.DEFAULT_PROTOCOL_VERSION);
        if (typeof requested !== 'string' || !MCPServer.PROTOCOL_VERSION_PATTERN.test(requested)) {
            return null;
        }
        if (!MCPServer.SUPPORTED_PROTOCOL_VERSIONS.has(requested)) {
            return null;
        }
        return requested;
    }
    validateSessionHeader(req, res, required) {
        const sessionId = this.getHeader(req, MCPServer.SESSION_HEADER);
        if (!sessionId) {
            if (required) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: { code: -32600, message: `Missing required header: ${MCPServer.SESSION_HEADER}` }
                }));
            }
            return null;
        }
        const session = this.clients.get(sessionId);
        if (!session) {
            if (required) {
                res.writeHead(404);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32001,
                        message: `Session not found: ${sessionId}. The server may have restarted — please re-initialize.`,
                        data: { sessionId, serverRestarted: true, serverInstanceId: this.serverInstanceId }
                    }
                }));
            }
            return null;
        }
        return session;
    }
    handleSSEConnection(req, res) {
        const clientId = MCPServer.createUuid();
        this.setupSSEHeaders(res);
        res.writeHead(200);
        const client = {
            id: clientId,
            lastActivity: new Date(),
            userAgent: req.headers['user-agent']
        };
        this.clients.set(clientId, client);
        this.legacySseStreams.set(clientId, res);
        this.sendSSEEvent(res, 'endpoint', `/messages?sessionId=${encodeURIComponent(clientId)}`);
        res.write(': connected\n\n');
        logger_1.logger.info(`SSE client connected: ${clientId}`);
        req.on('close', () => {
            this.legacySseStreams.delete(clientId);
            this.clients.delete(clientId);
            logger_1.logger.info(`SSE client disconnected: ${clientId}`);
        });
    }
    async handleSSEMessageRequest(req, res, query) {
        var _a, _b, _c;
        const rawSessionId = query === null || query === void 0 ? void 0 : query.sessionId;
        const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
        if (!sessionId || typeof sessionId !== 'string') {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing required query parameter: sessionId' }));
            return;
        }
        const stream = this.legacySseStreams.get(sessionId);
        if (!stream) {
            res.writeHead(404);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32001,
                    message: `SSE session not found: ${sessionId}. The server may have restarted — please re-initialize.`,
                    data: { sessionId, serverRestarted: true, serverInstanceId: this.serverInstanceId }
                }
            }));
            return;
        }
        let body;
        try {
            body = await this.readRequestBody(req);
        }
        catch (err) {
            const bodyErrorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: (err === null || err === void 0 ? void 0 : err.message) || 'Request body too large'
                }
            };
            this.sendSSEEvent(stream, 'message', JSON.stringify(bodyErrorResponse));
            res.writeHead(202);
            res.end();
            return;
        }
        try {
            let message;
            try {
                message = JSON.parse(body);
            }
            catch (parseError) {
                if (!this.shouldTryFixJson(body)) {
                    throw new Error(`JSON parsing failed: ${parseError.message}. Original body: ${body.substring(0, 500)}...`);
                }
                const fixedBody = this.fixCommonJsonIssues(body);
                message = JSON.parse(fixedBody);
            }
            const client = this.clients.get(sessionId);
            if (client) {
                client.lastActivity = new Date();
                this.clients.set(sessionId, client);
            }
            const isRequest = this.isJsonRpcRequestMessage(message);
            const isNotification = this.isJsonRpcNotification(message);
            const isInitialize = isRequest && message.method === 'initialize';
            if (isInitialize) {
                const protocolVersion = this.negotiateProtocolVersion((_a = message === null || message === void 0 ? void 0 : message.params) === null || _a === void 0 ? void 0 : _a.protocolVersion);
                if (!protocolVersion) {
                    const unsupportedResponse = {
                        jsonrpc: '2.0',
                        id: (_b = message === null || message === void 0 ? void 0 : message.id) !== null && _b !== void 0 ? _b : null,
                        error: {
                            code: -32600,
                            message: `Unsupported protocol version: ${(_c = message === null || message === void 0 ? void 0 : message.params) === null || _c === void 0 ? void 0 : _c.protocolVersion}`
                        }
                    };
                    this.sendSSEEvent(stream, 'message', JSON.stringify(unsupportedResponse));
                    res.writeHead(202);
                    res.end();
                    return;
                }
                const response = await this.handleMessage(message, { protocolVersion });
                const initClient = this.clients.get(sessionId);
                if (initClient && !response.error) {
                    initClient.protocolVersion = protocolVersion;
                    initClient.initialized = true;
                    this.clients.set(sessionId, initClient);
                }
                this.sendSSEEvent(stream, 'message', JSON.stringify(response));
                res.writeHead(202);
                res.end();
                return;
            }
            if (isNotification) {
                logger_1.logger.mcp(`Received SSE notification: ${message.method}`);
                res.writeHead(202);
                res.end();
                return;
            }
            const response = await this.handleMessage(message);
            this.sendSSEEvent(stream, 'message', JSON.stringify(response));
            res.writeHead(202);
            res.end();
        }
        catch (error) {
            logger_1.logger.error(`Error handling SSE request: ${error}`);
            const parseErrorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32700,
                    message: `Parse error: ${error.message}`
                }
            };
            this.sendSSEEvent(stream, 'message', JSON.stringify(parseErrorResponse));
            res.writeHead(202);
            res.end();
        }
    }
    sendSSEEvent(res, event, data) {
        res.write(`event: ${event}\n`);
        for (const line of data.split('\n')) {
            res.write(`data: ${line}\n`);
        }
        res.write('\n');
    }
    async handleMCPRequest(req, res) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        if (!this.validateMCPPostHeaders(req, res)) {
            return;
        }
        const headerProtocolVersion = this.getHeader(req, MCPServer.PROTOCOL_HEADER);
        if (headerProtocolVersion && !MCPServer.SUPPORTED_PROTOCOL_VERSIONS.has(headerProtocolVersion)) {
            res.writeHead(400);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: `Unsupported ${MCPServer.PROTOCOL_HEADER}: ${headerProtocolVersion}`
                }
            }));
            return;
        }
        let body;
        try {
            body = await this.readRequestBody(req);
        }
        catch (err) {
            res.writeHead(413);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32600, message: (err === null || err === void 0 ? void 0 : err.message) || 'Request body too large' }
            }));
            return;
        }
        try {
            {
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
                const isRequest = this.isJsonRpcRequestMessage(message);
                const isNotification = this.isJsonRpcNotification(message);
                const isResponse = this.isJsonRpcResponseMessage(message);
                if (!isRequest && !isResponse) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_a = message === null || message === void 0 ? void 0 : message.id) !== null && _a !== void 0 ? _a : null,
                        error: {
                            code: -32600,
                            message: 'Invalid JSON-RPC message'
                        }
                    }));
                    return;
                }
                const isInitialize = isRequest && message.method === 'initialize';
                if (isInitialize) {
                    const existingSessionId = this.getHeader(req, MCPServer.SESSION_HEADER);
                    if (existingSessionId && this.clients.has(existingSessionId)) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: (_b = message === null || message === void 0 ? void 0 : message.id) !== null && _b !== void 0 ? _b : null,
                            error: {
                                code: -32600,
                                message: `${MCPServer.SESSION_HEADER} must not be set on initialize`
                            }
                        }));
                        return;
                    }
                    if (isNotification) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: null,
                            error: {
                                code: -32600,
                                message: 'Initialize must be sent as a JSON-RPC request with a non-null id'
                            }
                        }));
                        return;
                    }
                    const protocolVersion = this.negotiateProtocolVersion((_c = message === null || message === void 0 ? void 0 : message.params) === null || _c === void 0 ? void 0 : _c.protocolVersion, headerProtocolVersion);
                    if (!protocolVersion) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: (_d = message === null || message === void 0 ? void 0 : message.id) !== null && _d !== void 0 ? _d : null,
                            error: {
                                code: -32600,
                                message: `Unsupported protocol version: ${((_e = message === null || message === void 0 ? void 0 : message.params) === null || _e === void 0 ? void 0 : _e.protocolVersion) || headerProtocolVersion}`
                            }
                        }));
                        return;
                    }
                    const sessionId = MCPServer.createUuid();
                    const response = await this.handleMessage(message, { protocolVersion });
                    const isQueueFull = ((_f = response.error) === null || _f === void 0 ? void 0 : _f.code) === -32029;
                    if (!response.error) {
                        this.clients.set(sessionId, {
                            id: sessionId,
                            lastActivity: new Date(),
                            userAgent: req.headers['user-agent'],
                            protocolVersion,
                            initialized: true
                        });
                        res.setHeader(MCPServer.SESSION_HEADER, sessionId);
                        res.setHeader(MCPServer.PROTOCOL_HEADER, protocolVersion);
                    }
                    if (isQueueFull) {
                        res.setHeader('Retry-After', '5');
                        res.writeHead(429);
                    }
                    else {
                        res.writeHead(200);
                    }
                    res.end(JSON.stringify(response));
                    return;
                }
                let session = this.validateSessionHeader(req, res, false);
                if (!session) {
                    const staleSessionId = this.getHeader(req, MCPServer.SESSION_HEADER);
                    if (staleSessionId) {
                        // Auto-recover: create a new session for stale/unknown session IDs
                        // so the client doesn't need to manually re-initialize after server restart.
                        // Protocol version will be negotiated from the request header.
                        session = {
                            id: staleSessionId,
                            lastActivity: new Date(),
                            userAgent: req.headers['user-agent'],
                            protocolVersion: undefined,
                            initialized: true
                        };
                        this.clients.set(staleSessionId, session);
                        logger_1.logger.info(`Auto-recovered stale session: ${staleSessionId}`);
                    }
                    else {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: (_g = message === null || message === void 0 ? void 0 : message.id) !== null && _g !== void 0 ? _g : null,
                            error: { code: -32600, message: `Missing required header: ${MCPServer.SESSION_HEADER}` }
                        }));
                        return;
                    }
                }
                if (!session.initialized) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_h = message === null || message === void 0 ? void 0 : message.id) !== null && _h !== void 0 ? _h : null,
                        error: {
                            code: -32600,
                            message: `Session is not initialized: ${session.id}`
                        }
                    }));
                    return;
                }
                const protocolVersion = this.negotiateProtocolVersion(undefined, headerProtocolVersion || session.protocolVersion);
                if (!protocolVersion) {
                    if (session.protocolVersion === undefined) {
                        this.clients.delete(session.id);
                    }
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_j = message === null || message === void 0 ? void 0 : message.id) !== null && _j !== void 0 ? _j : null,
                        error: {
                            code: -32600,
                            message: `Unsupported protocol version: ${headerProtocolVersion}`
                        }
                    }));
                    return;
                }
                if (headerProtocolVersion && session.protocolVersion && headerProtocolVersion !== session.protocolVersion) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_k = message === null || message === void 0 ? void 0 : message.id) !== null && _k !== void 0 ? _k : null,
                        error: {
                            code: -32600,
                            message: `${MCPServer.PROTOCOL_HEADER} does not match initialized session version`
                        }
                    }));
                    return;
                }
                session.lastActivity = new Date();
                if (!session.protocolVersion) {
                    session.protocolVersion = protocolVersion;
                }
                this.clients.set(session.id, session);
                res.setHeader(MCPServer.SESSION_HEADER, session.id);
                res.setHeader(MCPServer.PROTOCOL_HEADER, session.protocolVersion || protocolVersion);
                // MCP notifications/responses must return 202 Accepted when accepted.
                if (isResponse) {
                    logger_1.logger.mcp('Received client JSON-RPC response');
                    res.writeHead(202);
                    res.end();
                    return;
                }
                if (isNotification) {
                    logger_1.logger.mcp(`Received notification: ${message.method}`);
                    res.writeHead(202);
                    res.end();
                    return;
                }
                const response = await this.handleMessage(message, { protocolVersion: session.protocolVersion || protocolVersion });
                const isQueueFull = ((_l = response.error) === null || _l === void 0 ? void 0 : _l.code) === -32029;
                if (isQueueFull) {
                    res.setHeader('Retry-After', '5');
                    res.writeHead(429);
                }
                else {
                    res.writeHead(200);
                }
                res.end(JSON.stringify(response));
            }
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
    }
    async handleMessage(message, context) {
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
                    const _a = toolResult || {}, { imageContent } = _a, toolResultText = __rest(_a, ["imageContent"]);
                    const content = [{ type: 'text', text: JSON.stringify(toolResultText) }];
                    if (Array.isArray(imageContent)) {
                        for (const img of imageContent) {
                            content.push({ type: 'image', data: img.base64, mimeType: img.mimeType });
                        }
                    }
                    // structuredContent (MCP spec rev 2025-06-18): same payload as a validated object,
                    // for clients that skip parsing the text block and read structuredContent instead.
                    // isError (MCP spec): tool-level failures are reported in the result with isError:true,
                    // NOT as a JSON-RPC error, so the client/model can see and react to the failure.
                    result = { content, structuredContent: toolResultText, isError: (toolResultText === null || toolResultText === void 0 ? void 0 : toolResultText.success) === false };
                    break;
                }
                case 'ping':
                    // MCP spec: ping request must return an empty result.
                    result = {};
                    break;
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
                        protocolVersion: (context === null || context === void 0 ? void 0 : context.protocolVersion) || MCPServer.DEFAULT_PROTOCOL_VERSION,
                        capabilities: {
                            // listChanged/subscribe declared false: the tool set is static and
                            // resource subscriptions are not implemented, so no notifications are sent.
                            tools: { listChanged: false },
                            resources: { subscribe: false, listChanged: false }
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0',
                            instanceId: this.serverInstanceId
                        },
                        instructions: 'Connected to a running Cocos Creator editor via MCP. ' +
                            'Inspect current scene/prefab via MCP before modifying; query real-time editor data, never guess. ' +
                            'Use MCP/editor APIs (not direct file edits) for scene/node/component/prefab/asset/project/editor operations, especially structural changes (adding/removing nodes or components, __id__/UUID/array refs) to .scene/.prefab/.meta. ' +
                            'Exception: bulk find-replace of a single identifier (e.g. __type__ CID, enum string) via direct text edit is OK when no tool covers it, no JSON structure changes, and tree is committed first. ' +
                            '.ts/.js source is always directly editable. Most tools take an "action" param — see each tool schema for its actions. ' +
                            'After creating/restructuring UI nodes, apply ui_apply_responsive_defaults. Prefer reusable prefab edits at the source asset over scene-local overrides. ' +
                            'For composite UI (popups, panels, list items, HUD, etc.): do not hand-assemble via chained node_lifecycle.create. First check for an existing prefab template (prefab_query.get_list / asset_query.find_by_name type=prefab) and prefab_lifecycle.instantiate + set_component_property. ' +
                            'Trivial wrappers (≤3 children, no layout) may be built from scratch. Otherwise use ui_build_from_spec: sketch the UISpec + ASCII tree, confirm with user, then one call. ' +
                            'Keep node names semantic/short, matching their component role. On hierarchy/name changes, update script references and lookup paths. Validate refs after edits — no missing links. ' +
                            'Save/reload touched scene/prefab before finishing. Report changes made (nodes, components, constraints, presets). Ask before guessing ambiguous layout requirements. ' +
                            'Resources: cocos://hierarchy, cocos://selection, cocos://logs/latest. Use batch_execute to run multiple operations in one call.'
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
    /**
     * Repair common JSON5-ish mistakes that LLM clients sometimes emit.
     *
     * This walks the input character by character so we only touch tokens
     * where the fix is unambiguously correct. The previous regex-based
     * version corrupted valid input (e.g. it would replace single quotes
     * inside string literals and double-escape backslashes).
     *
     * Repairs applied:
     *  - Trailing commas before `}` or `]`
     *  - Literal newline / CR / tab inside string literals → `\n`/`\r`/`\t`
     *  - JS-style single-quoted strings → double-quoted strings
     *
     * Anything else (unbalanced quotes, unescaped backslashes, comments)
     * is left alone so the caller's JSON.parse error surfaces honestly.
     */
    fixCommonJsonIssues(jsonStr) {
        const out = [];
        let i = 0;
        const len = jsonStr.length;
        while (i < len) {
            const ch = jsonStr[i];
            if (ch === '"' || ch === "'") {
                const quote = ch;
                out.push('"');
                i++;
                while (i < len) {
                    const c = jsonStr[i];
                    if (c === '\\') {
                        if (i + 1 < len) {
                            out.push(c, jsonStr[i + 1]);
                            i += 2;
                        }
                        else {
                            out.push(c);
                            i++;
                        }
                        continue;
                    }
                    if (c === quote) {
                        out.push('"');
                        i++;
                        break;
                    }
                    if (c === '\n') {
                        out.push('\\n');
                        i++;
                        continue;
                    }
                    if (c === '\r') {
                        out.push('\\r');
                        i++;
                        continue;
                    }
                    if (c === '\t') {
                        out.push('\\t');
                        i++;
                        continue;
                    }
                    if (quote === "'" && c === '"') {
                        out.push('\\"');
                        i++;
                        continue;
                    }
                    out.push(c);
                    i++;
                }
                continue;
            }
            if (ch === ',') {
                let j = i + 1;
                while (j < len && /\s/.test(jsonStr[j]))
                    j++;
                if (j < len && (jsonStr[j] === '}' || jsonStr[j] === ']')) {
                    i = j;
                    continue;
                }
            }
            out.push(ch);
            i++;
        }
        return out.join('');
    }
    stop() {
        var _a, _b, _c;
        (_a = this.mcpClientRegisterRetry) === null || _a === void 0 ? void 0 : _a.cancel();
        this.mcpClientRegisterRetry = null;
        for (const [_sessionId, streams] of this.sessionStreams.entries()) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                }
                catch (_d) {
                    // no-op
                }
            }
        }
        for (const [_id, stream] of this.legacySseStreams.entries()) {
            try {
                stream.end();
            }
            catch (_e) {
                // no-op
            }
        }
        this.sessionStreams.clear();
        this.legacySseStreams.clear();
        this.clients.clear();
        if (this.httpServer) {
            try {
                (_c = (_b = this.httpServer).closeAllConnections) === null || _c === void 0 ? void 0 : _c.call(_b);
            }
            catch (_f) {
                // closeAllConnections may not be available in older Node versions
            }
            this.httpServer.close();
            this.httpServer = null;
            logger_1.logger.info('HTTP server stopped');
        }
    }
    getStatus() {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: this.clients.size
        };
    }
    async handleSimpleAPIRequest(req, res, pathname) {
        let body;
        try {
            body = await this.readRequestBody(req);
        }
        catch (err) {
            res.writeHead(413);
            res.end(JSON.stringify({
                success: false,
                error: (err === null || err === void 0 ? void 0 : err.message) || 'Request body too large',
                tool: pathname
            }));
            return;
        }
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
                const fixedBody = this.fixCommonJsonIssues(body);
                try {
                    params = JSON.parse(fixedBody);
                }
                catch (_a) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        error: 'Invalid JSON in request body',
                        details: parseError.message,
                        receivedBody: body.substring(0, 200)
                    }));
                    return;
                }
            }
            const result = await this.enqueueToolExecution(fullToolName, params);
            // Tool executors return a ToolResponse with its own `success` field — surface
            // that at the top level too, otherwise callers who only check the outer
            // `success` (HTTP request succeeded) miss that the tool itself failed.
            const toolSucceeded = result && typeof result === 'object' && 'success' in result ? result.success : true;
            res.writeHead(200);
            res.end(JSON.stringify({
                success: toolSucceeded,
                tool: fullToolName,
                result
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
MCPServer.LATEST_PROTOCOL_VERSION = '2025-11-25';
MCPServer.DEFAULT_PROTOCOL_VERSION = '2025-06-18';
MCPServer.LEGACY_PROTOCOL_VERSION = '2025-03-26';
MCPServer.OLDEST_PROTOCOL_VERSION = '2024-11-05';
MCPServer.SESSION_HEADER = 'Mcp-Session-Id';
MCPServer.PROTOCOL_HEADER = 'MCP-Protocol-Version';
MCPServer.SUPPORTED_PROTOCOL_VERSIONS = new Set([
    MCPServer.LATEST_PROTOCOL_VERSION,
    MCPServer.DEFAULT_PROTOCOL_VERSION,
    MCPServer.LEGACY_PROTOCOL_VERSION,
    MCPServer.OLDEST_PROTOCOL_VERSION
]);
MCPServer.PROTOCOL_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXFDO0FBQ3JDLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFFM0IscUNBQWtDO0FBQ2xDLCtDQUFtRTtBQUNuRSxxREFBaUQ7QUFDakQsbURBQStDO0FBQy9DLDZEQUF5RDtBQUN6RCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUFpRDtBQUNqRCxpRUFBNkQ7QUFDN0QsdURBQW1EO0FBQ25ELHVFQUFrRTtBQUNsRSx1RUFBa0U7QUFDbEUscURBQWlEO0FBQ2pELHVEQUFtRDtBQUNuRCwyREFBdUQ7QUFDdkQsK0RBQTBEO0FBQzFELHFFQUFnRTtBQUNoRSw2REFBeUQ7QUFDekQseUVBQW9FO0FBQ3BFLCtEQUEwRDtBQUMxRCw2REFBeUQ7QUFDekQsdURBQW1EO0FBQ25ELCtEQUEyRDtBQUUzRCxNQUFhLFNBQVM7SUFvQ1YsTUFBTSxDQUFDLFVBQVU7UUFDckIsTUFBTSxLQUFLLEdBQUcsSUFBQSxvQkFBVyxFQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDcEMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNwQyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMs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bnQiOlsiaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MsIFNlcnZlclN0YXR1cywgTUNQQ2xpZW50LCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgcmVnaXN0ZXJBbGxNY3BDbGllbnRzLCBSZXRyeUhhbmRsZSB9IGZyb20gJy4vbWNwLWNsaWVudHMnO1xuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi90b29scy9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi90b29scy9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBQcm9qZWN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3Byb2plY3QtdG9vbHMnO1xuaW1wb3J0IHsgRGVidWdUb29scyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xuaW1wb3J0IHsgU2VydmVyVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlcnZlci10b29scyc7XG5pbXBvcnQgeyBTY2VuZUFkdmFuY2VkVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLWFkdmFuY2VkLXRvb2xzJztcbmltcG9ydCB7IEFzc2V0QWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgQmF0Y2hUb29scyB9IGZyb20gJy4vdG9vbHMvYmF0Y2gtdG9vbHMnO1xuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XG5pbXBvcnQgeyBNYXRlcmlhbFRvb2xzIH0gZnJvbSAnLi90b29scy9tYXRlcmlhbC10b29scyc7XG5pbXBvcnQgeyBVSUJ1aWxkZXJUb29scyB9IGZyb20gJy4vdG9vbHMvdWktYnVpbGRlci10b29scyc7XG5pbXBvcnQgeyBTY2VuZUNhcHR1cmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtY2FwdHVyZS10b29scyc7XG5pbXBvcnQgeyBLbm93bGVkZ2VUb29scyB9IGZyb20gJy4vdG9vbHMva25vd2xlZGdlLXRvb2xzJztcbmltcG9ydCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scyc7XG5pbXBvcnQgeyBTY2VuZVZpZXdUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdmlldy10b29scyc7XG5pbXBvcnQgeyBBbmltYXRpb25Ub29scyB9IGZyb20gJy4vdG9vbHMvYW5pbWF0aW9uLXRvb2xzJztcbmltcG9ydCB7IFNlYXJjaFRvb2xzIH0gZnJvbSAnLi90b29scy9zZWFyY2gtdG9vbHMnO1xuaW1wb3J0IHsgVmFsaWRhdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy92YWxpZGF0aW9uLXRvb2xzJztcblxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1JFUVVFU1RfQk9EWV9CWVRFUyA9IDUgKiAxMDI0ICogMTAyNDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfVE9PTF9RVUVVRV9MRU5HVEggPSAxMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyA9IDYwXzAwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ09OQ1VSUkVOVF9UT09MUyA9IDU7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1BPUlRfUkVUUklFUyA9IDEwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IExBVEVTVF9QUk9UT0NPTF9WRVJTSU9OID0gJzIwMjUtMTEtMjUnO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTA2LTE4JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBMRUdBQ1lfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTAzLTI2JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBPTERFU1RfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTRVNTSU9OX0hFQURFUiA9ICdNY3AtU2Vzc2lvbi1JZCc7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPVE9DT0xfSEVBREVSID0gJ01DUC1Qcm90b2NvbC1WZXJzaW9uJztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMgPSBuZXcgU2V0KFtcbiAgICAgICAgTUNQU2VydmVyLkxBVEVTVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuTEVHQUNZX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgIE1DUFNlcnZlci5PTERFU1RfUFJPVE9DT0xfVkVSU0lPTlxuICAgIF0pO1xuXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY2xpZW50czogTWFwPHN0cmluZywgTUNQQ2xpZW50PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHNlc3Npb25TdHJlYW1zOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBsZWdhY3lTc2VTdHJlYW1zOiBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIHRvb2xFeGVjdXRvcnM6IE1hcDxzdHJpbmcsIChhcmdzOiBhbnkpID0+IFByb21pc2U8YW55Pj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBzZXJ2ZXJJbnN0YW5jZUlkOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBtY3BDbGllbnRSZWdpc3RlclJldHJ5OiBSZXRyeUhhbmRsZSB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgdG9vbFF1ZXVlOiBBcnJheTx7XG4gICAgICAgIHJ1bjogKCkgPT4gUHJvbWlzZTxhbnk+O1xuICAgICAgICByZXNvbHZlOiAodmFsdWU6IGFueSkgPT4gdm9pZDtcbiAgICAgICAgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xuICAgIH0+ID0gW107XG4gICAgcHJpdmF0ZSBhY3RpdmVUb29sQ291bnQgPSAwO1xuXG4gICAgcHJpdmF0ZSBzdGF0aWMgY3JlYXRlVXVpZCgpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBieXRlcyA9IHJhbmRvbUJ5dGVzKDE2KTtcbiAgICAgICAgYnl0ZXNbNl0gPSAoYnl0ZXNbNl0gJiAweDBmKSB8IDB4NDA7XG4gICAgICAgIGJ5dGVzWzhdID0gKGJ5dGVzWzhdICYgMHgzZikgfCAweDgwO1xuICAgICAgICBjb25zdCBoZXggPSBieXRlcy50b1N0cmluZygnaGV4Jyk7XG4gICAgICAgIHJldHVybiBgJHtoZXguc2xpY2UoMCwgOCl9LSR7aGV4LnNsaWNlKDgsIDEyKX0tJHtoZXguc2xpY2UoMTIsIDE2KX0tJHtoZXguc2xpY2UoMTYsIDIwKX0tJHtoZXguc2xpY2UoMjApfWA7XG4gICAgfVxuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5zZXJ2ZXJJbnN0YW5jZUlkID0gTUNQU2VydmVyLmNyZWF0ZVV1aWQoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHMoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluaXRpYWxpemVUb29scygpOiB2b2lkIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgdG9vbHMuLi4nKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmUgPSBuZXcgU2NlbmVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5ub2RlID0gbmV3IE5vZGVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5jb21wb25lbnQgPSBuZXcgQ29tcG9uZW50VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmFiID0gbmV3IFByZWZhYlRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByb2plY3QgPSBuZXcgUHJvamVjdFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmRlYnVnID0gbmV3IERlYnVnVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmVyZW5jZXMgPSBuZXcgUHJlZmVyZW5jZXNUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zZXJ2ZXIgPSBuZXcgU2VydmVyVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmVBZHZhbmNlZCA9IG5ldyBTY2VuZUFkdmFuY2VkVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYXNzZXRBZHZhbmNlZCA9IG5ldyBBc3NldEFkdmFuY2VkVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYmF0Y2ggPSBuZXcgQmF0Y2hUb29scyh0aGlzLmV4ZWN1dGVUb29sQ2FsbC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZWRpdG9yID0gbmV3IEVkaXRvclRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLm1hdGVyaWFsID0gbmV3IE1hdGVyaWFsVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMudWlCdWlsZGVyID0gbmV3IFVJQnVpbGRlclRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lQ2FwdHVyZSA9IG5ldyBTY2VuZUNhcHR1cmVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5rbm93bGVkZ2UgPSBuZXcgS25vd2xlZGdlVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucmVmZXJlbmNlSW1hZ2UgPSBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZVZpZXcgPSBuZXcgU2NlbmVWaWV3VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvblRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNlYXJjaCA9IG5ldyBTZWFyY2hUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy52YWxpZGF0aW9uID0gbmV3IFZhbGlkYXRpb25Ub29scygpO1xuICAgICAgICAgICAgbG9nZ2VyLnN1Y2Nlc3MoJ1Rvb2xzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBpbml0aWFsaXppbmcgdG9vbHM6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1NlcnZlciBpcyBhbHJlYWR5IHJ1bm5pbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwb3J0ID0gdGhpcy5zZXR0aW5ncy5wb3J0O1xuICAgICAgICBsZXQgbGFzdEVycm9yOiBhbnk7XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBNQ1BTZXJ2ZXIuTUFYX1BPUlRfUkVUUklFUzsgYXR0ZW1wdCsrKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudHJ5TGlzdGVuKHBvcnQpO1xuICAgICAgICAgICAgICAgIGlmIChwb3J0ICE9PSB0aGlzLnNldHRpbmdzLnBvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYE9yaWdpbmFsIHBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IHdhcyBpbiB1c2UsIGJvdW5kIHRvICR7cG9ydH0gaW5zdGVhZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnBvcnQgPSBwb3J0O1xuICAgICAgICAgICAgICAgIHRoaXMubWNwQ2xpZW50UmVnaXN0ZXJSZXRyeT8uY2FuY2VsKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tY3BDbGllbnRSZWdpc3RlclJldHJ5ID0gcmVnaXN0ZXJBbGxNY3BDbGllbnRzKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHBvcnQpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKCdNQ1AgU2VydmVyIGlzIHJlYWR5IGZvciBjb25uZWN0aW9ucycpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgbGFzdEVycm9yID0gZXJyO1xuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJldHJ5RGVsYXkgPSBNYXRoLm1pbig1MDAgKiAoYXR0ZW1wdCArIDEpLCAyMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFBvcnQgJHtwb3J0fSBpbiB1c2UsIHRyeWluZyAke3BvcnQgKyAxfSBpbiAke3JldHJ5RGVsYXl9bXMgKGF0dGVtcHQgJHthdHRlbXB0ICsgMX0vJHtNQ1BTZXJ2ZXIuTUFYX1BPUlRfUkVUUklFU30pLi4uYCk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCByZXRyeURlbGF5KSk7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6ICR7bGFzdEVycm9yfWApO1xuICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB0cnlMaXN0ZW4ocG9ydDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IHNlcnZlcjtcbiAgICAgICAgICAgICAgICBsb2dnZXIuc3VjY2VzcyhgSFRUUCBzZXJ2ZXIgc3RhcnRlZCBvbiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgSGVhbHRoIGNoZWNrOiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0vaGVhbHRoYCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYE1DUCBlbmRwb2ludDogaHR0cDovLzEyNy4wLjAuMToke3BvcnR9L21jcGApO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHNlcnZlci5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBUb29scygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcbiAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLmNsZWFyKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBbX2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2xFeGVjdXRvcnMuc2V0KHRvb2wubmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2VyLmluZm8oYFNldHVwIHRvb2xzOiAke3RoaXMudG9vbHNMaXN0Lmxlbmd0aH0gdG9vbHMgYXZhaWxhYmxlYCk7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCBleGVjdXRvciA9IHRoaXMudG9vbEV4ZWN1dG9ycy5nZXQodG9vbE5hbWUpO1xuICAgICAgICBpZiAoZXhlY3V0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcihhcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiB0cnkgdG8gZmluZCB0aGUgdG9vbCBpbiBhbnkgZXhlY3V0b3JcbiAgICAgICAgZm9yIChjb25zdCBbX2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICBpZiAodG9vbHMuc29tZSgodDogYW55KSA9PiB0Lm5hbWUgPT09IHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0b29sU2V0LmV4ZWN1dGUodG9vbE5hbWUsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb29sICR7dG9vbE5hbWV9IG5vdCBmb3VuZGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDbGllbnRzKCk6IE1DUENsaWVudFtdIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jbGllbnRzLnZhbHVlcygpKTtcbiAgICB9XG4gICAgcHVibGljIGdldEF2YWlsYWJsZVRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3Q7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNldHRpbmdzKCk6IE1DUFNlcnZlclNldHRpbmdzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ2dlcigpIHtcbiAgICAgICAgcmV0dXJuIGxvZ2dlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwYXJzZWRVcmwgPSB1cmwucGFyc2UocmVxLnVybCB8fCAnJywgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHBhdGhuYW1lID0gcGFyc2VkVXJsLnBhdGhuYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IENPUlMgaGVhZGVyc1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgREVMRVRFLCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCBgQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9LCAke01DUFNlcnZlci5TRVNTSU9OX0hFQURFUn1gKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy52YWxpZGF0ZVJlcXVlc3RPcmlnaW4ocmVxLCByZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAocGF0aG5hbWUgPT09ICcvbWNwJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlTUNQVHJhbnNwb3J0UmVxdWVzdChyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL3NzZScgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNTRUNvbm5lY3Rpb24ocmVxLCByZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9tZXNzYWdlcycgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTU0VNZXNzYWdlUmVxdWVzdChyZXEsIHJlcywgcGFyc2VkVXJsLnF1ZXJ5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvaGVhbHRoJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3RhdHVzOiAnb2snLCB0b29sczogdGhpcy50b29sc0xpc3QubGVuZ3RoIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWU/LnN0YXJ0c1dpdGgoJy9hcGkvJykgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcSwgcmVzLCBwYXRobmFtZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2FwaS90b29scycgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHRvb2xzOiB0aGlzLmdldFNpbXBsaWZpZWRUb29sc0xpc3QoKSB9KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdOb3QgZm91bmQnIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgSFRUUCByZXF1ZXN0IGVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlUmVxdWVzdE9yaWdpbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luID0gdGhpcy5nZXRIZWFkZXIocmVxLCAnb3JpZ2luJyk7XG4gICAgICAgIGlmICghb3JpZ2luIHx8IG9yaWdpbiA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmFsbG93ZWRPcmlnaW5zPy5pbmNsdWRlcygnKicpIHx8IHRoaXMuc2V0dGluZ3MuYWxsb3dlZE9yaWdpbnM/LmluY2x1ZGVzKG9yaWdpbikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwob3JpZ2luKTtcbiAgICAgICAgICAgIGlmIChwYXJzZWQuaG9zdG5hbWUgPT09ICcxMjcuMC4wLjEnIHx8IHBhcnNlZC5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDAzKTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBgT3JpZ2luIG5vdCBhbGxvd2VkOiAke29yaWdpbn1gIH0pKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0SGVhZGVyKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIGhlYWRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcmVxLmhlYWRlcnNbaGVhZGVyTmFtZS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gdmFsdWVbMF07XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFjY2VwdHNDb250ZW50VHlwZShhY2NlcHRIZWFkZXI6IHN0cmluZywgcmVxdWlyZWRUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFhY2NlcHRIZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBub3JtYWxpemVkID0gYWNjZXB0SGVhZGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkLmluY2x1ZGVzKCcqLyonKSB8fCBub3JtYWxpemVkLmluY2x1ZGVzKHJlcXVpcmVkVHlwZS50b0xvd2VyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlTUNQUG9zdEhlYWRlcnMocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjY2VwdCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2FjY2VwdCcpIHx8ICcnO1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdCwgJ2FwcGxpY2F0aW9uL2pzb24nKSB8fCAhdGhpcy5hY2NlcHRzQ29udGVudFR5cGUoYWNjZXB0LCAndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDYpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUE9TVCAvbWNwIHJlcXVpcmVzIEFjY2VwdCBoZWFkZXIgY29udGFpbmluZyBib3RoIGFwcGxpY2F0aW9uL2pzb24gYW5kIHRleHQvZXZlbnQtc3RyZWFtJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gKHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2NvbnRlbnQtdHlwZScpIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoIWNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDE1KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1BPU1QgL21jcCByZXF1aXJlcyBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhbWVzc2FnZSAmJiB0eXBlb2YgbWVzc2FnZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1lc3NhZ2UubWV0aG9kID09PSAnc3RyaW5nJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY05vdGlmaWNhdGlvbihtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNKc29uUnBjUmVxdWVzdE1lc3NhZ2UobWVzc2FnZSkgJiYgKG1lc3NhZ2UuaWQgPT09IHVuZGVmaW5lZCB8fCBtZXNzYWdlLmlkID09PSBudWxsKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY1Jlc3BvbnNlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UubWV0aG9kID09PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAobWVzc2FnZS5pZCA9PT0gdW5kZWZpbmVkIHx8IG1lc3NhZ2UuaWQgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZXNzYWdlLCAncmVzdWx0JykgfHwgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1lc3NhZ2UsICdlcnJvcicpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQVHJhbnNwb3J0UmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVNQ1BSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1BTdHJlYW1SZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnREVMRVRFJykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1BEZWxldGVTZXNzaW9uKHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FsbG93JywgJ0dFVCwgUE9TVCwgREVMRVRFLCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDA1KTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJyB9KSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1BTdHJlYW1SZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIHRydWUpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zdCBhY2NlcHQgPSB0aGlzLmdldEhlYWRlcihyZXEsICdhY2NlcHQnKSB8fCAnJztcbiAgICAgICAgaWYgKCF0aGlzLmFjY2VwdHNDb250ZW50VHlwZShhY2NlcHQsICd0ZXh0L2V2ZW50LXN0cmVhbScpKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNik7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdHRVQgL21jcCByZXF1aXJlcyBBY2NlcHQ6IHRleHQvZXZlbnQtc3RyZWFtJyB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZXNzaW9uLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGBTZXNzaW9uIGlzIG5vdCBpbml0aWFsaXplZDogJHtzZXNzaW9uLmlkfWAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR1cFNTRUhlYWRlcnMocmVzKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSLCBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIsIHNlc3Npb24uaWQpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtSWQgPSBNQ1BTZXJ2ZXIuY3JlYXRlVXVpZCgpO1xuICAgICAgICBjb25zdCBzZXNzaW9uU3RyZWFtU2V0ID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCkgfHwgbmV3IE1hcDxzdHJpbmcsIGh0dHAuU2VydmVyUmVzcG9uc2U+KCk7XG4gICAgICAgIHNlc3Npb25TdHJlYW1TZXQuc2V0KHN0cmVhbUlkLCByZXMpO1xuICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLnNldChzZXNzaW9uLmlkLCBzZXNzaW9uU3RyZWFtU2V0KTtcblxuICAgICAgICBzZXNzaW9uLmxhc3RBY3Rpdml0eSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbi5pZCwgc2Vzc2lvbik7XG4gICAgICAgIHJlcy53cml0ZSgnOiBjb25uZWN0ZWRcXG5cXG4nKTtcblxuICAgICAgICByZXEub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RyZWFtcyA9IHRoaXMuc2Vzc2lvblN0cmVhbXMuZ2V0KHNlc3Npb24uaWQpO1xuICAgICAgICAgICAgaWYgKCFzdHJlYW1zKSByZXR1cm47XG4gICAgICAgICAgICBzdHJlYW1zLmRlbGV0ZShzdHJlYW1JZCk7XG4gICAgICAgICAgICBpZiAoc3RyZWFtcy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RyZWFtcy5kZWxldGUoc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlTUNQRGVsZXRlU2Vzc2lvbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHRoaXMudmFsaWRhdGVTZXNzaW9uSGVhZGVyKHJlcSwgcmVzLCB0cnVlKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uKSByZXR1cm47XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtcyA9IHRoaXMuc2Vzc2lvblN0cmVhbXMuZ2V0KHNlc3Npb24uaWQpO1xuICAgICAgICBpZiAoc3RyZWFtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbX3N0cmVhbUlkLCBzdHJlYW1dIG9mIHN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBuby1vcFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvblN0cmVhbXMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGllbnRzLmRlbGV0ZShzZXNzaW9uLmlkKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDQpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXR1cFNTRUhlYWRlcnMocmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L2V2ZW50LXN0cmVhbScpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgJ25vLWNhY2hlJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0Nvbm5lY3Rpb24nLCAna2VlcC1hbGl2ZScpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdYLUFjY2VsLUJ1ZmZlcmluZycsICdubycpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFBST1RPQ09MX1ZFUlNJT05fUEFUVEVSTiA9IC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLztcblxuICAgIHByaXZhdGUgbmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKG1lc3NhZ2VQcm90b2NvbDogYW55LCBoZWFkZXJQcm90b2NvbD86IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCByZXF1ZXN0ZWQgPSB0eXBlb2YgbWVzc2FnZVByb3RvY29sID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBtZXNzYWdlUHJvdG9jb2xcbiAgICAgICAgICAgIDogKGhlYWRlclByb3RvY29sIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04pO1xuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3RlZCAhPT0gJ3N0cmluZycgfHwgIU1DUFNlcnZlci5QUk9UT0NPTF9WRVJTSU9OX1BBVFRFUk4udGVzdChyZXF1ZXN0ZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIU1DUFNlcnZlci5TVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMuaGFzKHJlcXVlc3RlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXF1ZXN0ZWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlLCByZXF1aXJlZDogYm9vbGVhbik6IE1DUENsaWVudCB8IG51bGwge1xuICAgICAgICBjb25zdCBzZXNzaW9uSWQgPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUik7XG4gICAgICAgIGlmICghc2Vzc2lvbklkKSB7XG4gICAgICAgICAgICBpZiAocmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDAsIG1lc3NhZ2U6IGBNaXNzaW5nIHJlcXVpcmVkIGhlYWRlcjogJHtNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVJ9YCB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy5jbGllbnRzLmdldChzZXNzaW9uSWQpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICAgIGlmIChyZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyMDAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNlc3Npb24gbm90IGZvdW5kOiAke3Nlc3Npb25JZH0uIFRoZSBzZXJ2ZXIgbWF5IGhhdmUgcmVzdGFydGVkIOKAlCBwbGVhc2UgcmUtaW5pdGlhbGl6ZS5gLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBzZXNzaW9uSWQsIHNlcnZlclJlc3RhcnRlZDogdHJ1ZSwgc2VydmVySW5zdGFuY2VJZDogdGhpcy5zZXJ2ZXJJbnN0YW5jZUlkIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlc3Npb247XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVTU0VDb25uZWN0aW9uKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBjbGllbnRJZCA9IE1DUFNlcnZlci5jcmVhdGVVdWlkKCk7XG4gICAgICAgIHRoaXMuc2V0dXBTU0VIZWFkZXJzKHJlcyk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcblxuICAgICAgICBjb25zdCBjbGllbnQ6IE1DUENsaWVudCA9IHtcbiAgICAgICAgICAgIGlkOiBjbGllbnRJZCxcbiAgICAgICAgICAgIGxhc3RBY3Rpdml0eTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgIHVzZXJBZ2VudDogcmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmNsaWVudHMuc2V0KGNsaWVudElkLCBjbGllbnQpO1xuICAgICAgICB0aGlzLmxlZ2FjeVNzZVN0cmVhbXMuc2V0KGNsaWVudElkLCByZXMpO1xuXG4gICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHJlcywgJ2VuZHBvaW50JywgYC9tZXNzYWdlcz9zZXNzaW9uSWQ9JHtlbmNvZGVVUklDb21wb25lbnQoY2xpZW50SWQpfWApO1xuICAgICAgICByZXMud3JpdGUoJzogY29ubmVjdGVkXFxuXFxuJyk7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBTU0UgY2xpZW50IGNvbm5lY3RlZDogJHtjbGllbnRJZH1gKTtcblxuICAgICAgICByZXEub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5sZWdhY3lTc2VTdHJlYW1zLmRlbGV0ZShjbGllbnRJZCk7XG4gICAgICAgICAgICB0aGlzLmNsaWVudHMuZGVsZXRlKGNsaWVudElkKTtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBTU0UgY2xpZW50IGRpc2Nvbm5lY3RlZDogJHtjbGllbnRJZH1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTU0VNZXNzYWdlUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHF1ZXJ5OiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcmF3U2Vzc2lvbklkID0gcXVlcnk/LnNlc3Npb25JZDtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbklkID0gQXJyYXkuaXNBcnJheShyYXdTZXNzaW9uSWQpID8gcmF3U2Vzc2lvbklkWzBdIDogcmF3U2Vzc2lvbklkO1xuICAgICAgICBpZiAoIXNlc3Npb25JZCB8fCB0eXBlb2Ygc2Vzc2lvbklkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBxdWVyeSBwYXJhbWV0ZXI6IHNlc3Npb25JZCcgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gdGhpcy5sZWdhY3lTc2VTdHJlYW1zLmdldChzZXNzaW9uSWQpO1xuICAgICAgICBpZiAoIXN0cmVhbSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyMDAxLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU1NFIHNlc3Npb24gbm90IGZvdW5kOiAke3Nlc3Npb25JZH0uIFRoZSBzZXJ2ZXIgbWF5IGhhdmUgcmVzdGFydGVkIOKAlCBwbGVhc2UgcmUtaW5pdGlhbGl6ZS5gLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IHNlc3Npb25JZCwgc2VydmVyUmVzdGFydGVkOiB0cnVlLCBzZXJ2ZXJJbnN0YW5jZUlkOiB0aGlzLnNlcnZlckluc3RhbmNlSWQgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBib2R5OiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgdGhpcy5yZWFkUmVxdWVzdEJvZHkocmVxKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnN0IGJvZHlFcnJvclJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyPy5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkoYm9keUVycm9yUmVzcG9uc2UpKTtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgbWVzc2FnZTogYW55O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9LiBPcmlnaW5hbCBib2R5OiAke2JvZHkuc3Vic3RyaW5nKDAsIDUwMCl9Li4uYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjbGllbnQgPSB0aGlzLmNsaWVudHMuZ2V0KHNlc3Npb25JZCk7XG4gICAgICAgICAgICBpZiAoY2xpZW50KSB7XG4gICAgICAgICAgICAgICAgY2xpZW50Lmxhc3RBY3Rpdml0eSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uSWQsIGNsaWVudCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGlzUmVxdWVzdCA9IHRoaXMuaXNKc29uUnBjUmVxdWVzdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICBjb25zdCBpc05vdGlmaWNhdGlvbiA9IHRoaXMuaXNKc29uUnBjTm90aWZpY2F0aW9uKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY29uc3QgaXNJbml0aWFsaXplID0gaXNSZXF1ZXN0ICYmIG1lc3NhZ2UubWV0aG9kID09PSAnaW5pdGlhbGl6ZSc7XG4gICAgICAgICAgICBpZiAoaXNJbml0aWFsaXplKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdG9jb2xWZXJzaW9uID0gdGhpcy5uZWdvdGlhdGVQcm90b2NvbFZlcnNpb24obWVzc2FnZT8ucGFyYW1zPy5wcm90b2NvbFZlcnNpb24pO1xuICAgICAgICAgICAgICAgIGlmICghcHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVuc3VwcG9ydGVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFVuc3VwcG9ydGVkIHByb3RvY29sIHZlcnNpb246ICR7bWVzc2FnZT8ucGFyYW1zPy5wcm90b2NvbFZlcnNpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkodW5zdXBwb3J0ZWRSZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHsgcHJvdG9jb2xWZXJzaW9uIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGluaXRDbGllbnQgPSB0aGlzLmNsaWVudHMuZ2V0KHNlc3Npb25JZCk7XG4gICAgICAgICAgICAgICAgaWYgKGluaXRDbGllbnQgJiYgIXJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGluaXRDbGllbnQucHJvdG9jb2xWZXJzaW9uID0gcHJvdG9jb2xWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICBpbml0Q2xpZW50LmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uSWQsIGluaXRDbGllbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGlzTm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLm1jcChgUmVjZWl2ZWQgU1NFIG5vdGlmaWNhdGlvbjogJHttZXNzYWdlLm1ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcblxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIFNTRSByZXF1ZXN0OiAke2Vycm9yfWApO1xuICAgICAgICAgICAgY29uc3QgcGFyc2VFcnJvclJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjcwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkocGFyc2VFcnJvclJlc3BvbnNlKSk7XG5cbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2VuZFNTRUV2ZW50KHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgZXZlbnQ6IHN0cmluZywgZGF0YTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIHJlcy53cml0ZShgZXZlbnQ6ICR7ZXZlbnR9XFxuYCk7XG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBkYXRhLnNwbGl0KCdcXG4nKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlKGBkYXRhOiAke2xpbmV9XFxuYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmVzLndyaXRlKCdcXG4nKTtcbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNQ1BSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVNQ1BQb3N0SGVhZGVycyhyZXEsIHJlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhlYWRlclByb3RvY29sVmVyc2lvbiA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgTUNQU2VydmVyLlBST1RPQ09MX0hFQURFUik7XG4gICAgICAgIGlmIChoZWFkZXJQcm90b2NvbFZlcnNpb24gJiYgIU1DUFNlcnZlci5TVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMuaGFzKGhlYWRlclByb3RvY29sVmVyc2lvbikpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFVuc3VwcG9ydGVkICR7TUNQU2VydmVyLlBST1RPQ09MX0hFQURFUn06ICR7aGVhZGVyUHJvdG9jb2xWZXJzaW9ufWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYm9keTogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IHRoaXMucmVhZFJlcXVlc3RCb2R5KHJlcSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQxMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDAsIG1lc3NhZ2U6IGVycj8ubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZScgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAvLyBFbmhhbmNlZCBKU09OIHBhcnNpbmcgd2l0aCBiZXR0ZXIgZXJyb3IgaGFuZGxpbmdcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTogYW55O1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVHJ5Rml4SnNvbihib2R5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBKU09OIHBhcnNpbmcgZmFpbGVkOiAke3BhcnNlRXJyb3IubWVzc2FnZX0uIE9yaWdpbmFsIGJvZHk6ICR7Ym9keS5zdWJzdHJpbmcoMCwgNTAwKX0uLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSB0byBmaXggY29tbW9uIEpTT04gaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpc1JlcXVlc3QgPSB0aGlzLmlzSnNvblJwY1JlcXVlc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTm90aWZpY2F0aW9uID0gdGhpcy5pc0pzb25ScGNOb3RpZmljYXRpb24obWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNSZXNwb25zZSA9IHRoaXMuaXNKc29uUnBjUmVzcG9uc2VNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGlmICghaXNSZXF1ZXN0ICYmICFpc1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0ludmFsaWQgSlNPTi1SUEMgbWVzc2FnZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaXNJbml0aWFsaXplID0gaXNSZXF1ZXN0ICYmIG1lc3NhZ2UubWV0aG9kID09PSAnaW5pdGlhbGl6ZSc7XG4gICAgICAgICAgICAgICAgaWYgKGlzSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1Nlc3Npb25JZCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgTUNQU2VydmVyLlNFU1NJT05fSEVBREVSKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nU2Vzc2lvbklkICYmIHRoaXMuY2xpZW50cy5oYXMoZXhpc3RpbmdTZXNzaW9uSWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke01DUFNlcnZlci5TRVNTSU9OX0hFQURFUn0gbXVzdCBub3QgYmUgc2V0IG9uIGluaXRpYWxpemVgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzTm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdJbml0aWFsaXplIG11c3QgYmUgc2VudCBhcyBhIEpTT04tUlBDIHJlcXVlc3Qgd2l0aCBhIG5vbi1udWxsIGlkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3RvY29sVmVyc2lvbiA9IHRoaXMubmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZT8ucGFyYW1zPy5wcm90b2NvbFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJQcm90b2NvbFZlcnNpb25cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFVuc3VwcG9ydGVkIHByb3RvY29sIHZlcnNpb246ICR7bWVzc2FnZT8ucGFyYW1zPy5wcm90b2NvbFZlcnNpb24gfHwgaGVhZGVyUHJvdG9jb2xWZXJzaW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uSWQgPSBNQ1BTZXJ2ZXIuY3JlYXRlVXVpZCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlLCB7IHByb3RvY29sVmVyc2lvbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSByZXNwb25zZS5lcnJvcj8uY29kZSA9PT0gLTMyMDI5O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHNlc3Npb25JZCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZXNzaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdEFjdGl2aXR5OiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJBZ2VudDogcmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIsIHNlc3Npb25JZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIsIHByb3RvY29sVmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNRdWV1ZUZ1bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDI5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsZXQgc2Vzc2lvbiA9IHRoaXMudmFsaWRhdGVTZXNzaW9uSGVhZGVyKHJlcSwgcmVzLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFzZXNzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YWxlU2Vzc2lvbklkID0gdGhpcy5nZXRIZWFkZXIocmVxLCBNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhbGVTZXNzaW9uSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVjb3ZlcjogY3JlYXRlIGEgbmV3IHNlc3Npb24gZm9yIHN0YWxlL3Vua25vd24gc2Vzc2lvbiBJRHNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvIHRoZSBjbGllbnQgZG9lc24ndCBuZWVkIHRvIG1hbnVhbGx5IHJlLWluaXRpYWxpemUgYWZ0ZXIgc2VydmVyIHJlc3RhcnQuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcm90b2NvbCB2ZXJzaW9uIHdpbGwgYmUgbmVnb3RpYXRlZCBmcm9tIHRoZSByZXF1ZXN0IGhlYWRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHN0YWxlU2Vzc2lvbklkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RBY3Rpdml0eTogbmV3IERhdGUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VyQWdlbnQ6IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2xWZXJzaW9uOiB1bmRlZmluZWQgYXMgYW55LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemVkOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGllbnRzLnNldChzdGFsZVNlc3Npb25JZCwgc2Vzc2lvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgQXV0by1yZWNvdmVyZWQgc3RhbGUgc2Vzc2lvbjogJHtzdGFsZVNlc3Npb25JZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMCwgbWVzc2FnZTogYE1pc3NpbmcgcmVxdWlyZWQgaGVhZGVyOiAke01DUFNlcnZlci5TRVNTSU9OX0hFQURFUn1gIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXNlc3Npb24uaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2Vzc2lvbiBpcyBub3QgaW5pdGlhbGl6ZWQ6ICR7c2Vzc2lvbi5pZH1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHByb3RvY29sVmVyc2lvbiA9IHRoaXMubmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKFxuICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlclByb3RvY29sVmVyc2lvbiB8fCBzZXNzaW9uLnByb3RvY29sVmVyc2lvblxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5kZWxldGUoc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVW5zdXBwb3J0ZWQgcHJvdG9jb2wgdmVyc2lvbjogJHtoZWFkZXJQcm90b2NvbFZlcnNpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoaGVhZGVyUHJvdG9jb2xWZXJzaW9uICYmIHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uICYmIGhlYWRlclByb3RvY29sVmVyc2lvbiAhPT0gc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHtNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSfSBkb2VzIG5vdCBtYXRjaCBpbml0aWFsaXplZCBzZXNzaW9uIHZlcnNpb25gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNlc3Npb24ubGFzdEFjdGl2aXR5ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlc3Npb24ucHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uID0gcHJvdG9jb2xWZXJzaW9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHNlc3Npb24uaWQsIHNlc3Npb24pO1xuXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIsIHNlc3Npb24uaWQpO1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoTUNQU2VydmVyLlBST1RPQ09MX0hFQURFUiwgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gfHwgcHJvdG9jb2xWZXJzaW9uKTtcblxuICAgICAgICAgICAgICAgIC8vIE1DUCBub3RpZmljYXRpb25zL3Jlc3BvbnNlcyBtdXN0IHJldHVybiAyMDIgQWNjZXB0ZWQgd2hlbiBhY2NlcHRlZC5cbiAgICAgICAgICAgICAgICBpZiAoaXNSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIubWNwKCdSZWNlaXZlZCBjbGllbnQgSlNPTi1SUEMgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGlzTm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5tY3AoYFJlY2VpdmVkIG5vdGlmaWNhdGlvbjogJHttZXNzYWdlLm1ldGhvZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlLCB7IHByb3RvY29sVmVyc2lvbjogc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gfHwgcHJvdG9jb2xWZXJzaW9uIH0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUXVldWVGdWxsID0gcmVzcG9uc2UuZXJyb3I/LmNvZGUgPT09IC0zMjAyOTtcbiAgICAgICAgICAgICAgICBpZiAoaXNRdWV1ZUZ1bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignUmV0cnktQWZ0ZXInLCAnNScpO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQyOSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaGFuZGxpbmcgTUNQIHJlcXVlc3Q6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI3MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQYXJzZSBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogYW55LCBjb250ZXh0PzogeyBwcm90b2NvbFZlcnNpb24/OiBzdHJpbmcgfSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IHsgaWQsIG1ldGhvZCwgcGFyYW1zIH0gPSBtZXNzYWdlO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgcmVzdWx0OiBhbnk7XG5cbiAgICAgICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvbGlzdCc6XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgdG9vbHM6IHRoaXMuZ2V0QXZhaWxhYmxlVG9vbHMoKSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICd0b29scy9jYWxsJzoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG5hbWUsIGFyZ3VtZW50czogYXJncyB9ID0gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sUmVzdWx0ID0gYXdhaXQgdGhpcy5lbnF1ZXVlVG9vbEV4ZWN1dGlvbihuYW1lLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBpbWFnZUNvbnRlbnQsIC4uLnRvb2xSZXN1bHRUZXh0IH0gPSB0b29sUmVzdWx0IHx8IHt9O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50OiBhbnlbXSA9IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkodG9vbFJlc3VsdFRleHQpIH1dO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpbWFnZUNvbnRlbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGltZyBvZiBpbWFnZUNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50LnB1c2goeyB0eXBlOiAnaW1hZ2UnLCBkYXRhOiBpbWcuYmFzZTY0LCBtaW1lVHlwZTogaW1nLm1pbWVUeXBlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIHN0cnVjdHVyZWRDb250ZW50IChNQ1Agc3BlYyByZXYgMjAyNS0wNi0xOCk6IHNhbWUgcGF5bG9hZCBhcyBhIHZhbGlkYXRlZCBvYmplY3QsXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvciBjbGllbnRzIHRoYXQgc2tpcCBwYXJzaW5nIHRoZSB0ZXh0IGJsb2NrIGFuZCByZWFkIHN0cnVjdHVyZWRDb250ZW50IGluc3RlYWQuXG4gICAgICAgICAgICAgICAgICAgIC8vIGlzRXJyb3IgKE1DUCBzcGVjKTogdG9vbC1sZXZlbCBmYWlsdXJlcyBhcmUgcmVwb3J0ZWQgaW4gdGhlIHJlc3VsdCB3aXRoIGlzRXJyb3I6dHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgLy8gTk9UIGFzIGEgSlNPTi1SUEMgZXJyb3IsIHNvIHRoZSBjbGllbnQvbW9kZWwgY2FuIHNlZSBhbmQgcmVhY3QgdG8gdGhlIGZhaWx1cmUuXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgY29udGVudCwgc3RydWN0dXJlZENvbnRlbnQ6IHRvb2xSZXN1bHRUZXh0LCBpc0Vycm9yOiB0b29sUmVzdWx0VGV4dD8uc3VjY2VzcyA9PT0gZmFsc2UgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgJ3BpbmcnOlxuICAgICAgICAgICAgICAgICAgICAvLyBNQ1Agc3BlYzogcGluZyByZXF1ZXN0IG11c3QgcmV0dXJuIGFuIGVtcHR5IHJlc3VsdC5cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyByZXNvdXJjZXM6IHRoaXMuZ2V0UmVzb3VyY2VzTGlzdCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9yZWFkJzoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSBwYXJhbXM/LnVyaTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1cmkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IHVyaScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuaGFuZGxlUmVhZFJlc291cmNlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gTUNQIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogY29udGV4dD8ucHJvdG9jb2xWZXJzaW9uIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsaXN0Q2hhbmdlZC9zdWJzY3JpYmUgZGVjbGFyZWQgZmFsc2U6IHRoZSB0b29sIHNldCBpcyBzdGF0aWMgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVzb3VyY2Ugc3Vic2NyaXB0aW9ucyBhcmUgbm90IGltcGxlbWVudGVkLCBzbyBubyBub3RpZmljYXRpb25zIGFyZSBzZW50LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB7IGxpc3RDaGFuZ2VkOiBmYWxzZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc291cmNlczogeyBzdWJzY3JpYmU6IGZhbHNlLCBsaXN0Q2hhbmdlZDogZmFsc2UgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUlkOiB0aGlzLnNlcnZlckluc3RhbmNlSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdDb25uZWN0ZWQgdG8gYSBydW5uaW5nIENvY29zIENyZWF0b3IgZWRpdG9yIHZpYSBNQ1AuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdJbnNwZWN0IGN1cnJlbnQgc2NlbmUvcHJlZmFiIHZpYSBNQ1AgYmVmb3JlIG1vZGlmeWluZzsgcXVlcnkgcmVhbC10aW1lIGVkaXRvciBkYXRhLCBuZXZlciBndWVzcy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VzZSBNQ1AvZWRpdG9yIEFQSXMgKG5vdCBkaXJlY3QgZmlsZSBlZGl0cykgZm9yIHNjZW5lL25vZGUvY29tcG9uZW50L3ByZWZhYi9hc3NldC9wcm9qZWN0L2VkaXRvciBvcGVyYXRpb25zLCBlc3BlY2lhbGx5IHN0cnVjdHVyYWwgY2hhbmdlcyAoYWRkaW5nL3JlbW92aW5nIG5vZGVzIG9yIGNvbXBvbmVudHMsIF9faWRfXy9VVUlEL2FycmF5IHJlZnMpIHRvIC5zY2VuZS8ucHJlZmFiLy5tZXRhLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRXhjZXB0aW9uOiBidWxrIGZpbmQtcmVwbGFjZSBvZiBhIHNpbmdsZSBpZGVudGlmaWVyIChlLmcuIF9fdHlwZV9fIENJRCwgZW51bSBzdHJpbmcpIHZpYSBkaXJlY3QgdGV4dCBlZGl0IGlzIE9LIHdoZW4gbm8gdG9vbCBjb3ZlcnMgaXQsIG5vIEpTT04gc3RydWN0dXJlIGNoYW5nZXMsIGFuZCB0cmVlIGlzIGNvbW1pdHRlZCBmaXJzdC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJy50cy8uanMgc291cmNlIGlzIGFsd2F5cyBkaXJlY3RseSBlZGl0YWJsZS4gTW9zdCB0b29scyB0YWtlIGFuIFwiYWN0aW9uXCIgcGFyYW0g4oCUIHNlZSBlYWNoIHRvb2wgc2NoZW1hIGZvciBpdHMgYWN0aW9ucy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FmdGVyIGNyZWF0aW5nL3Jlc3RydWN0dXJpbmcgVUkgbm9kZXMsIGFwcGx5IHVpX2FwcGx5X3Jlc3BvbnNpdmVfZGVmYXVsdHMuIFByZWZlciByZXVzYWJsZSBwcmVmYWIgZWRpdHMgYXQgdGhlIHNvdXJjZSBhc3NldCBvdmVyIHNjZW5lLWxvY2FsIG92ZXJyaWRlcy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZvciBjb21wb3NpdGUgVUkgKHBvcHVwcywgcGFuZWxzLCBsaXN0IGl0ZW1zLCBIVUQsIGV0Yy4pOiBkbyBub3QgaGFuZC1hc3NlbWJsZSB2aWEgY2hhaW5lZCBub2RlX2xpZmVjeWNsZS5jcmVhdGUuIEZpcnN0IGNoZWNrIGZvciBhbiBleGlzdGluZyBwcmVmYWIgdGVtcGxhdGUgKHByZWZhYl9xdWVyeS5nZXRfbGlzdCAvIGFzc2V0X3F1ZXJ5LmZpbmRfYnlfbmFtZSB0eXBlPXByZWZhYikgYW5kIHByZWZhYl9saWZlY3ljbGUuaW5zdGFudGlhdGUgKyBzZXRfY29tcG9uZW50X3Byb3BlcnR5LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVHJpdmlhbCB3cmFwcGVycyAo4omkMyBjaGlsZHJlbiwgbm8gbGF5b3V0KSBtYXkgYmUgYnVpbHQgZnJvbSBzY3JhdGNoLiBPdGhlcndpc2UgdXNlIHVpX2J1aWxkX2Zyb21fc3BlYzogc2tldGNoIHRoZSBVSVNwZWMgKyBBU0NJSSB0cmVlLCBjb25maXJtIHdpdGggdXNlciwgdGhlbiBvbmUgY2FsbC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0tlZXAgbm9kZSBuYW1lcyBzZW1hbnRpYy9zaG9ydCwgbWF0Y2hpbmcgdGhlaXIgY29tcG9uZW50IHJvbGUuIE9uIGhpZXJhcmNoeS9uYW1lIGNoYW5nZXMsIHVwZGF0ZSBzY3JpcHQgcmVmZXJlbmNlcyBhbmQgbG9va3VwIHBhdGhzLiBWYWxpZGF0ZSByZWZzIGFmdGVyIGVkaXRzIOKAlCBubyBtaXNzaW5nIGxpbmtzLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU2F2ZS9yZWxvYWQgdG91Y2hlZCBzY2VuZS9wcmVmYWIgYmVmb3JlIGZpbmlzaGluZy4gUmVwb3J0IGNoYW5nZXMgbWFkZSAobm9kZXMsIGNvbXBvbmVudHMsIGNvbnN0cmFpbnRzLCBwcmVzZXRzKS4gQXNrIGJlZm9yZSBndWVzc2luZyBhbWJpZ3VvdXMgbGF5b3V0IHJlcXVpcmVtZW50cy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1Jlc291cmNlczogY29jb3M6Ly9oaWVyYXJjaHksIGNvY29zOi8vc2VsZWN0aW9uLCBjb2NvczovL2xvZ3MvbGF0ZXN0LiBVc2UgYmF0Y2hfZXhlY3V0ZSB0byBydW4gbXVsdGlwbGUgb3BlcmF0aW9ucyBpbiBvbmUgY2FsbC4nXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIHJlc3VsdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInID8gLTMyMDI5IDogLTMyNjAzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC0tLSBNQ1AgUmVzb3VyY2VzIC0tLVxuXG4gICAgcHJpdmF0ZSBnZXRSZXNvdXJjZXNMaXN0KCk6IGFueVtdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmk6ICdjb2NvczovL2hpZXJhcmNoeScsXG4gICAgICAgICAgICAgICAgbmFtZTogJ1NjZW5lIEhpZXJhcmNoeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXJyZW50IHNjZW5lIG5vZGUgdHJlZSBzdHJ1Y3R1cmUgKHJlYWQtb25seSBzbmFwc2hvdCknLFxuICAgICAgICAgICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJpOiAnY29jb3M6Ly9zZWxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdDdXJyZW50IFNlbGVjdGlvbicsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDdXJyZW50bHkgc2VsZWN0ZWQgbm9kZXMvYXNzZXRzIGluIHRoZSBlZGl0b3InLFxuICAgICAgICAgICAgICAgIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJpOiAnY29jb3M6Ly9sb2dzL2xhdGVzdCcsXG4gICAgICAgICAgICAgICAgbmFtZTogJ1NlcnZlciBMb2dzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlY2VudCBNQ1Agc2VydmVyIGxvZyBlbnRyaWVzJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ3RleHQvcGxhaW4nXG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVSZWFkUmVzb3VyY2UodXJpOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBsZXQgcGFyc2VkVXJpOiBVUkw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwYXJzZWRVcmkgPSBuZXcgVVJMKHVyaSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHJlc291cmNlIFVSSTogJHt1cml9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocGFyc2VkVXJpLnByb3RvY29sICE9PSAnY29jb3M6Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBwcm90b2NvbDogJHtwYXJzZWRVcmkucHJvdG9jb2x9LiBFeHBlY3RlZCBcImNvY29zOlwiYCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXNvdXJjZVBhdGggPSBwYXJzZWRVcmkuaG9zdG5hbWUgKyBwYXJzZWRVcmkucGF0aG5hbWU7XG5cbiAgICAgICAgc3dpdGNoIChyZXNvdXJjZVBhdGgpIHtcbiAgICAgICAgICAgIGNhc2UgJ2hpZXJhcmNoeSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdObyBzY2VuZSBsb2FkZWQnIH0pIH1dIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHRoaXMuYnVpbGRSZXNvdXJjZUhpZXJhcmNoeSh0cmVlLCAwLCAxMCwgNTApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsIHRleHQ6IEpTT04uc3RyaW5naWZ5KGhpZXJhcmNoeSwgbnVsbCwgMikgfV0gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdGlvbic6IHtcbiAgICAgICAgICAgICAgICAvLyBFZGl0b3IuU2VsZWN0aW9uIGlzIGEgc3luY2hyb25vdXMgQVBJIGluIENvY29zIENyZWF0b3IgMy44LnhcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZE5vZGVzID0gRWRpdG9yLlNlbGVjdGlvbi5nZXRTZWxlY3RlZCgnbm9kZScpIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkQXNzZXRzID0gRWRpdG9yLlNlbGVjdGlvbi5nZXRTZWxlY3RlZCgnYXNzZXQnKSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0ge1xuICAgICAgICAgICAgICAgICAgICBub2Rlczogc2VsZWN0ZWROb2RlcyxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRzOiBzZWxlY3RlZEFzc2V0c1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IFt7IHVyaSwgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJywgdGV4dDogSlNPTi5zdHJpbmdpZnkoZGF0YSwgbnVsbCwgMikgfV0gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2xvZ3MvbGF0ZXN0Jzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ0NvbnRlbnQgPSBsb2dnZXIuZ2V0TG9nQ29udGVudCgyMDApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAndGV4dC9wbGFpbicsIHRleHQ6IGxvZ0NvbnRlbnQgfHwgJyhubyBsb2dzIHlldCknIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biByZXNvdXJjZTogJHt1cml9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGJ1aWxkUmVzb3VyY2VIaWVyYXJjaHkobm9kZTogYW55LCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyLCBtYXhDaGlsZHJlbjogbnVtYmVyKTogYW55IHtcbiAgICAgICAgY29uc3QgaW5mbzogYW55ID0ge1xuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgdHlwZTogbm9kZS50eXBlLFxuICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChkZXB0aCA+PSBtYXhEZXB0aCkge1xuICAgICAgICAgICAgY29uc3QgY2hpbGRDb3VudCA9IG5vZGUuY2hpbGRyZW4gPyBub2RlLmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gICAgICAgICAgICBpZiAoY2hpbGRDb3VudCA+IDApIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNoaWxkcmVuID0gYFske2NoaWxkQ291bnR9IGNoaWxkcmVuLCBkZXB0aCBsaW1pdCByZWFjaGVkXWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaW5mbztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBjb25zdCB0b3RhbCA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3Qgc2xpY2UgPSBub2RlLmNoaWxkcmVuLnNsaWNlKDAsIG1heENoaWxkcmVuKTtcbiAgICAgICAgICAgIGluZm8uY2hpbGRyZW4gPSBzbGljZS5tYXAoKGM6IGFueSkgPT4gdGhpcy5idWlsZFJlc291cmNlSGllcmFyY2h5KGMsIGRlcHRoICsgMSwgbWF4RGVwdGgsIG1heENoaWxkcmVuKSk7XG4gICAgICAgICAgICBpZiAodG90YWwgPiBtYXhDaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGluZm8uY2hpbGRyZW5UcnVuY2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGluZm8udG90YWxDaGlsZHJlbiA9IHRvdGFsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVwYWlyIGNvbW1vbiBKU09ONS1pc2ggbWlzdGFrZXMgdGhhdCBMTE0gY2xpZW50cyBzb21ldGltZXMgZW1pdC5cbiAgICAgKlxuICAgICAqIFRoaXMgd2Fsa3MgdGhlIGlucHV0IGNoYXJhY3RlciBieSBjaGFyYWN0ZXIgc28gd2Ugb25seSB0b3VjaCB0b2tlbnNcbiAgICAgKiB3aGVyZSB0aGUgZml4IGlzIHVuYW1iaWd1b3VzbHkgY29ycmVjdC4gVGhlIHByZXZpb3VzIHJlZ2V4LWJhc2VkXG4gICAgICogdmVyc2lvbiBjb3JydXB0ZWQgdmFsaWQgaW5wdXQgKGUuZy4gaXQgd291bGQgcmVwbGFjZSBzaW5nbGUgcXVvdGVzXG4gICAgICogaW5zaWRlIHN0cmluZyBsaXRlcmFscyBhbmQgZG91YmxlLWVzY2FwZSBiYWNrc2xhc2hlcykuXG4gICAgICpcbiAgICAgKiBSZXBhaXJzIGFwcGxpZWQ6XG4gICAgICogIC0gVHJhaWxpbmcgY29tbWFzIGJlZm9yZSBgfWAgb3IgYF1gXG4gICAgICogIC0gTGl0ZXJhbCBuZXdsaW5lIC8gQ1IgLyB0YWIgaW5zaWRlIHN0cmluZyBsaXRlcmFscyDihpIgYFxcbmAvYFxccmAvYFxcdGBcbiAgICAgKiAgLSBKUy1zdHlsZSBzaW5nbGUtcXVvdGVkIHN0cmluZ3Mg4oaSIGRvdWJsZS1xdW90ZWQgc3RyaW5nc1xuICAgICAqXG4gICAgICogQW55dGhpbmcgZWxzZSAodW5iYWxhbmNlZCBxdW90ZXMsIHVuZXNjYXBlZCBiYWNrc2xhc2hlcywgY29tbWVudHMpXG4gICAgICogaXMgbGVmdCBhbG9uZSBzbyB0aGUgY2FsbGVyJ3MgSlNPTi5wYXJzZSBlcnJvciBzdXJmYWNlcyBob25lc3RseS5cbiAgICAgKi9cbiAgICBwcml2YXRlIGZpeENvbW1vbkpzb25Jc3N1ZXMoanNvblN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3Qgb3V0OiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgaSA9IDA7XG4gICAgICAgIGNvbnN0IGxlbiA9IGpzb25TdHIubGVuZ3RoO1xuXG4gICAgICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgICAgICBjb25zdCBjaCA9IGpzb25TdHJbaV07XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gJ1wiJyB8fCBjaCA9PT0gXCInXCIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBxdW90ZSA9IGNoO1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKCdcIicpO1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0ganNvblN0cltpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgKyAxIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goYywganNvblN0cltpICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCgnXCInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxuJykgeyBvdXQucHVzaCgnXFxcXG4nKTsgaSsrOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xccicpIHsgb3V0LnB1c2goJ1xcXFxyJyk7IGkrKzsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXHQnKSB7IG91dC5wdXNoKCdcXFxcdCcpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChxdW90ZSA9PT0gXCInXCIgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goJ1xcXFxcIicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goYyk7XG4gICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChjaCA9PT0gJywnKSB7XG4gICAgICAgICAgICAgICAgbGV0IGogPSBpICsgMTtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaiA8IGxlbiAmJiAvXFxzLy50ZXN0KGpzb25TdHJbal0pKSBqKys7XG4gICAgICAgICAgICAgICAgaWYgKGogPCBsZW4gJiYgKGpzb25TdHJbal0gPT09ICd9JyB8fCBqc29uU3RyW2pdID09PSAnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIGkgPSBqO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG91dC5wdXNoKGNoKTtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0b3AoKTogdm9pZCB7XG4gICAgICAgIHRoaXMubWNwQ2xpZW50UmVnaXN0ZXJSZXRyeT8uY2FuY2VsKCk7XG4gICAgICAgIHRoaXMubWNwQ2xpZW50UmVnaXN0ZXJSZXRyeSA9IG51bGw7XG5cbiAgICAgICAgZm9yIChjb25zdCBbX3Nlc3Npb25JZCwgc3RyZWFtc10gb2YgdGhpcy5zZXNzaW9uU3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW19zdHJlYW1JZCwgc3RyZWFtXSBvZiBzdHJlYW1zLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gbm8tb3BcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IFtfaWQsIHN0cmVhbV0gb2YgdGhpcy5sZWdhY3lTc2VTdHJlYW1zLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBuby1vcFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuc2Vzc2lvblN0cmVhbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5sZWdhY3lTc2VTdHJlYW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMuY2xpZW50cy5jbGVhcigpO1xuXG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgKHRoaXMuaHR0cFNlcnZlciBhcyBhbnkpLmNsb3NlQWxsQ29ubmVjdGlvbnM/LigpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gY2xvc2VBbGxDb25uZWN0aW9ucyBtYXkgbm90IGJlIGF2YWlsYWJsZSBpbiBvbGRlciBOb2RlIHZlcnNpb25zXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnSFRUUCBzZXJ2ZXIgc3RvcHBlZCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldFN0YXR1cygpOiBTZXJ2ZXJTdGF0dXMge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcnVubmluZzogISF0aGlzLmh0dHBTZXJ2ZXIsXG4gICAgICAgICAgICBwb3J0OiB0aGlzLnNldHRpbmdzLnBvcnQsXG4gICAgICAgICAgICBjbGllbnRzOiB0aGlzLmNsaWVudHMuc2l6ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHBhdGhuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbGV0IGJvZHk6IHN0cmluZztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJvZHkgPSBhd2FpdCB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTMpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZScsXG4gICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL3Rvb2wvbm9kZV9saWZlY3ljbGUgb3IgbGVnYWN5IC9hcGkvbm9kZS9saWZlY3ljbGVcbiAgICAgICAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IHBhdGhuYW1lLnNwbGl0KCcvJykuZmlsdGVyKHAgPT4gcCk7XG4gICAgICAgICAgICBpZiAocGF0aFBhcnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCBBUEkgcGF0aC4gVXNlIC9hcGkvdG9vbC97dG9vbF9uYW1lfScgfSkpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3VwcG9ydCBib3RoIC9hcGkvdG9vbC97bmFtZX0gYW5kIGxlZ2FjeSAvYXBpL3tjYXRlZ29yeX0ve25hbWV9XG4gICAgICAgICAgICBsZXQgZnVsbFRvb2xOYW1lOiBzdHJpbmc7XG4gICAgICAgICAgICBpZiAocGF0aFBhcnRzWzFdID09PSAndG9vbCcpIHtcbiAgICAgICAgICAgICAgICBmdWxsVG9vbE5hbWUgPSBwYXRoUGFydHNbMl07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZ1bGxUb29sTmFtZSA9IGAke3BhdGhQYXJ0c1sxXX1fJHtwYXRoUGFydHNbMl19YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHBhcmFtcztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczogcGFyc2VFcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBKU09OLnBhcnNlKGZpeGVkQm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgSlNPTiBpbiByZXF1ZXN0IGJvZHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczogcGFyc2VFcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5lbnF1ZXVlVG9vbEV4ZWN1dGlvbihmdWxsVG9vbE5hbWUsIHBhcmFtcyk7XG4gICAgICAgICAgICAvLyBUb29sIGV4ZWN1dG9ycyByZXR1cm4gYSBUb29sUmVzcG9uc2Ugd2l0aCBpdHMgb3duIGBzdWNjZXNzYCBmaWVsZCDigJQgc3VyZmFjZVxuICAgICAgICAgICAgLy8gdGhhdCBhdCB0aGUgdG9wIGxldmVsIHRvbywgb3RoZXJ3aXNlIGNhbGxlcnMgd2hvIG9ubHkgY2hlY2sgdGhlIG91dGVyXG4gICAgICAgICAgICAvLyBgc3VjY2Vzc2AgKEhUVFAgcmVxdWVzdCBzdWNjZWVkZWQpIG1pc3MgdGhhdCB0aGUgdG9vbCBpdHNlbGYgZmFpbGVkLlxuICAgICAgICAgICAgY29uc3QgdG9vbFN1Y2NlZWRlZCA9IHJlc3VsdCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0JyAmJiAnc3VjY2VzcycgaW4gcmVzdWx0ID8gcmVzdWx0LnN1Y2Nlc3MgOiB0cnVlO1xuXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0b29sU3VjY2VlZGVkLFxuICAgICAgICAgICAgICAgIHRvb2w6IGZ1bGxUb29sTmFtZSxcbiAgICAgICAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBTaW1wbGUgQVBJIGVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSBlcnJvci5tZXNzYWdlID09PSAnVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInO1xuICAgICAgICAgICAgaWYgKGlzUXVldWVGdWxsKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignUmV0cnktQWZ0ZXInLCAnNScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZChpc1F1ZXVlRnVsbCA/IDQyOSA6IDUwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWFkUmVxdWVzdEJvZHkocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XG4gICAgICAgICAgICBsZXQgdG90YWwgPSAwO1xuXG4gICAgICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgICAgICAgIHRvdGFsICs9IGNodW5rLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAodG90YWwgPiBNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFUykge1xuICAgICAgICAgICAgICAgICAgICByZXEuZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBSZXF1ZXN0IGJvZHkgZXhjZWVkcyAke01DUFNlcnZlci5NQVhfUkVRVUVTVF9CT0RZX0JZVEVTfSBieXRlc2ApKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjaHVua3MucHVzaChjaHVuayk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoJ3V0ZjgnKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVxLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2hvdWxkVHJ5Rml4SnNvbihib2R5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFib2R5IHx8IGJvZHkubGVuZ3RoID4gMjU2ICogMTAyNCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBib2R5LmluY2x1ZGVzKCdcXCcnKSB8fCBib2R5LmluY2x1ZGVzKCcsfScpIHx8IGJvZHkuaW5jbHVkZXMoJyxdJykgfHwgYm9keS5pbmNsdWRlcygnXFxuJykgfHwgYm9keS5pbmNsdWRlcygnXFx0Jyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnF1ZXVlVG9vbEV4ZWN1dGlvbih0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBpZiAodGhpcy50b29sUXVldWUubGVuZ3RoID49IE1DUFNlcnZlci5NQVhfVE9PTF9RVUVVRV9MRU5HVEgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVG9vbCBxdWV1ZSBpcyBmdWxsLCBwbGVhc2UgcmV0cnkgbGF0ZXInKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRvb2xRdWV1ZS5wdXNoKHtcbiAgICAgICAgICAgICAgICBydW46ICgpID0+IHRoaXMuZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lLCBhcmdzKSxcbiAgICAgICAgICAgICAgICByZXNvbHZlLFxuICAgICAgICAgICAgICAgIHJlamVjdFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLnByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgcHJvY2Vzc05leHRUb29sUXVldWUoKTogdm9pZCB7XG4gICAgICAgIHdoaWxlICh0aGlzLmFjdGl2ZVRvb2xDb3VudCA8IE1DUFNlcnZlci5NQVhfQ09OQ1VSUkVOVF9UT09MUyAmJiB0aGlzLnRvb2xRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0YXNrID0gdGhpcy50b29sUXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgIGlmICghdGFzaykgYnJlYWs7XG5cbiAgICAgICAgICAgIHRoaXMuYWN0aXZlVG9vbENvdW50Kys7XG5cbiAgICAgICAgICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihgVG9vbCBleGVjdXRpb24gdGltZW91dCAoJHtNQ1BTZXJ2ZXIuVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NU31tcylgKSksIE1DUFNlcnZlci5UT09MX0VYRUNVVElPTl9USU1FT1VUX01TKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBQcm9taXNlLnJhY2UoW3Rhc2sucnVuKCksIHRpbWVvdXRQcm9taXNlXSlcbiAgICAgICAgICAgICAgICAudGhlbigocmVzdWx0KSA9PiB0YXNrLnJlc29sdmUocmVzdWx0KSlcbiAgICAgICAgICAgICAgICAuY2F0Y2goKGVycikgPT4gdGFzay5yZWplY3QoZXJyKSlcbiAgICAgICAgICAgICAgICAuZmluYWxseSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZlVG9vbENvdW50LS07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzc05leHRUb29sUXVldWUoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0U2ltcGxpZmllZFRvb2xzTGlzdCgpOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdC5tYXAodG9vbCA9PiB7XG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNhdGVnb3J5IGZyb20gdG9vbCBuYW1lIChmaXJzdCBzZWdtZW50IGJlZm9yZSBfKVxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB0b29sLm5hbWUuc3BsaXQoJ18nKTtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gcGFydHNbMF07XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjYXRlZ29yeSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICBhcGlQYXRoOiBgL2FwaS90b29sLyR7dG9vbC5uYW1lfWAsXG4gICAgICAgICAgICAgICAgY3VybEV4YW1wbGU6IHRoaXMuZ2VuZXJhdGVDdXJsRXhhbXBsZShjYXRlZ29yeSwgdG9vbC5uYW1lLCB0b29sLmlucHV0U2NoZW1hKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUN1cmxFeGFtcGxlKGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xOYW1lOiBzdHJpbmcsIHNjaGVtYTogYW55KTogc3RyaW5nIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgc2FtcGxlIHBhcmFtZXRlcnMgYmFzZWQgb24gc2NoZW1hXG4gICAgICAgIGNvbnN0IHNhbXBsZVBhcmFtcyA9IHRoaXMuZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hKTtcbiAgICAgICAgY29uc3QganNvblN0cmluZyA9IEpTT04uc3RyaW5naWZ5KHNhbXBsZVBhcmFtcywgbnVsbCwgMik7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYGN1cmwgLVggUE9TVCBodHRwOi8vMTI3LjAuMC4xOjg1ODUvYXBpLyR7Y2F0ZWdvcnl9LyR7dG9vbE5hbWV9IFxcXFxcbiAgLUggXCJDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb25cIiBcXFxcXG4gIC1kICcke2pzb25TdHJpbmd9J2A7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZVNhbXBsZVBhcmFtcyhzY2hlbWE6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICghc2NoZW1hIHx8ICFzY2hlbWEucHJvcGVydGllcykgcmV0dXJuIHt9O1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FtcGxlOiBhbnkgPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wXSBvZiBPYmplY3QuZW50cmllcyhzY2hlbWEucHJvcGVydGllcyBhcyBhbnkpKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wU2NoZW1hID0gcHJvcCBhcyBhbnk7XG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BTY2hlbWEudHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8ICdleGFtcGxlX3N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IDQyO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSBwcm9wU2NoZW1hLmRlZmF1bHQgfHwgeyB4OiAwLCB5OiAwLCB6OiAwIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gJ2V4YW1wbGVfdmFsdWUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzYW1wbGU7XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBIVFRQIHRyYW5zcG9ydCBkb2Vzbid0IG5lZWQgcGVyc2lzdGVudCBjb25uZWN0aW9uc1xuLy8gTUNQIG92ZXIgSFRUUCB1c2VzIHJlcXVlc3QtcmVzcG9uc2UgcGF0dGVyblxuIl19