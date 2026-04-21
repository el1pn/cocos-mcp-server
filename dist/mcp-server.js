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
const uuid_1 = require("uuid");
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
        this.sessionStreams = new Map();
        this.legacySseStreams = new Map();
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
        const streamId = (0, uuid_1.v4)();
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
                res.end(JSON.stringify({ error: `Missing required header: ${MCPServer.SESSION_HEADER}` }));
            }
            return null;
        }
        const session = this.clients.get(sessionId);
        if (!session) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Session not found: ${sessionId}` }));
            return null;
        }
        return session;
    }
    handleSSEConnection(req, res) {
        const clientId = (0, uuid_1.v4)();
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
            res.end(JSON.stringify({ error: `SSE session not found: ${sessionId}` }));
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                    if (existingSessionId) {
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
                    const sessionId = (0, uuid_1.v4)();
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
                const session = this.validateSessionHeader(req, res, true);
                if (!session)
                    return;
                if (!session.initialized) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_g = message === null || message === void 0 ? void 0 : message.id) !== null && _g !== void 0 ? _g : null,
                        error: {
                            code: -32600,
                            message: `Session is not initialized: ${session.id}`
                        }
                    }));
                    return;
                }
                const protocolVersion = this.negotiateProtocolVersion(undefined, headerProtocolVersion || session.protocolVersion);
                if (!protocolVersion) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: (_h = message === null || message === void 0 ? void 0 : message.id) !== null && _h !== void 0 ? _h : null,
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
                        id: (_j = message === null || message === void 0 ? void 0 : message.id) !== null && _j !== void 0 ? _j : null,
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
                const isQueueFull = ((_k = response.error) === null || _k === void 0 ? void 0 : _k.code) === -32029;
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
                        protocolVersion: (context === null || context === void 0 ? void 0 : context.protocolVersion) || MCPServer.DEFAULT_PROTOCOL_VERSION,
                        capabilities: {
                            tools: {},
                            resources: {}
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.0.0'
                        },
                        instructions: 'You are connected to a running Cocos Creator editor via MCP. ' +
                            'Always inspect the current scene/prefab structure before making modifications, and query real-time editor data instead of guessing. ' +
                            'Always use MCP/editor APIs for scene, node, component, prefab, asset, project, and editor operations. ' +
                            'Do not directly edit serialized Cocos files (.scene, .prefab, .meta, and related data files). ' +
                            'The only files allowed for direct text editing are TypeScript/JavaScript source files (.ts, .js). ' +
                            'All tools use an "action" parameter to specify operations. ' +
                            'After creating or restructuring UI nodes, apply responsive defaults (anchors, widget constraints, and layout), and prefer ui_apply_responsive_defaults immediately for consistency. ' +
                            'Prefer reusable prefab edits at the prefab asset source level; use scene-local overrides only when necessary. ' +
                            'For any composite UI (popups, dialogs, panels, list items, cards, HUD widgets, etc.), do NOT assemble the tree from scratch via chained node_lifecycle.create calls. First locate an existing prefab template in this project (prefab_query.get_list, or asset_query.find_by_name with assetType="prefab"), then use prefab_lifecycle.instantiate and override properties via set_component_property. Build-from-scratch is only acceptable for trivial wrappers (≤3 children, no layout components). If no template fits, ask the user which existing prefab to base it on. ' +
                            'Keep node names semantic, short, and consistent with component roles. ' +
                            'When hierarchy or node names change, verify and update script references and lookup paths. ' +
                            'Validate node/component/asset references after edits to ensure there are no missing links. ' +
                            'Save and reload touched scene/prefab files before finishing to confirm serialization stability. ' +
                            'Report performed changes clearly, including affected nodes, components, constraints, and presets. ' +
                            'If requirements are ambiguous, ask for clarification instead of guessing layout behavior. ' +
                            'MCP Resources available: cocos://hierarchy (scene tree), cocos://selection (current selection), cocos://logs/latest (server logs). ' +
                            'Use batch_execute to run multiple operations in one call for efficiency. ' +
                            'Key tools: scene_management (action: get_current/get_list/open/save/create/close/get_hierarchy), ' +
                            'node_query (action: get_info/find_by_pattern/find_by_name/get_all/detect_type), ' +
                            'node_lifecycle (action: create/delete/duplicate/move), ' +
                            'node_transform (action: set_transform/set_property), ' +
                            'component_manage (action: add/remove/attach_script), ' +
                            'component_query (action: get_all/get_info/get_available), ' +
                            'set_component_property (modify component properties), ' +
                            'ui_apply_responsive_defaults (apply responsive widget/layout/anchor presets), ' +
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
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            logger_1.logger.info('HTTP server stopped');
        }
        for (const [_sessionId, streams] of this.sessionStreams.entries()) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                }
                catch (_a) {
                    // no-op
                }
            }
        }
        for (const [_id, stream] of this.legacySseStreams.entries()) {
            try {
                stream.end();
            }
            catch (_b) {
                // no-op
            }
        }
        this.sessionStreams.clear();
        this.legacySseStreams.clear();
        this.clients.clear();
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
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFDM0IsK0JBQW9DO0FBRXBDLHFDQUFrQztBQUNsQyxxREFBaUQ7QUFDakQsbURBQStDO0FBQy9DLDZEQUF5RDtBQUN6RCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUFpRDtBQUNqRCxpRUFBNkQ7QUFDN0QsdURBQW1EO0FBQ25ELDZEQUF5RDtBQUN6RCx1RUFBa0U7QUFDbEUsK0RBQTBEO0FBQzFELHlFQUFvRTtBQUNwRSx1RUFBa0U7QUFDbEUsK0RBQTJEO0FBQzNELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQsdURBQW1EO0FBQ25ELDZEQUF5RDtBQUN6RCwyREFBdUQ7QUFFdkQsTUFBYSxTQUFTO0lBa0NsQixZQUFZLFFBQTJCO1FBZC9CLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLFlBQU8sR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM1QyxtQkFBYyxHQUFrRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLHFCQUFnQixHQUFxQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQy9ELFVBQUssR0FBd0IsRUFBRSxDQUFDO1FBQ2hDLGNBQVMsR0FBcUIsRUFBRSxDQUFDO1FBQ2pDLGtCQUFhLEdBQTZDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDcEUsY0FBUyxHQUlaLEVBQUUsQ0FBQztRQUNBLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBR3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLENBQUM7WUFDRCxlQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1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LEFBQXpCLENBQTBCO0FBQ3pDLHFDQUEyQixHQUFHLElBQUksR0FBRyxDQUFDO0lBQzFELFNBQVMsQ0FBQyx1QkFBdUI7SUFDakMsU0FBUyxDQUFDLHdCQUF3QjtJQUNsQyxTQUFTLENBQUMsdUJBQXVCO0lBQ2pDLFNBQVMsQ0FBQyx1QkFBdUI7Q0FDcEMsQ0FBQyxBQUxpRCxDQUtoRDtBQXFYcUIsa0NBQXdCLEdBQUcscUJBQXFCLEFBQXhCLENBQXlCO0FBdTVCN0UscURBQXFEO0FBQ3JELDhDQUE4QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MsIFNlcnZlclN0YXR1cywgTUNQQ2xpZW50LCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi90b29scy9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi90b29scy9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBQcm9qZWN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3Byb2plY3QtdG9vbHMnO1xuaW1wb3J0IHsgRGVidWdUb29scyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xuaW1wb3J0IHsgU2VydmVyVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlcnZlci10b29scyc7XG5pbXBvcnQgeyBCcm9hZGNhc3RUb29scyB9IGZyb20gJy4vdG9vbHMvYnJvYWRjYXN0LXRvb2xzJztcbmltcG9ydCB7IFNjZW5lQWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVWaWV3VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXZpZXctdG9vbHMnO1xuaW1wb3J0IHsgUmVmZXJlbmNlSW1hZ2VUb29scyB9IGZyb20gJy4vdG9vbHMvcmVmZXJlbmNlLWltYWdlLXRvb2xzJztcbmltcG9ydCB7IEFzc2V0QWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgVmFsaWRhdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy92YWxpZGF0aW9uLXRvb2xzJztcbmltcG9ydCB7IEJhdGNoVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2JhdGNoLXRvb2xzJztcbmltcG9ydCB7IFNlYXJjaFRvb2xzIH0gZnJvbSAnLi90b29scy9zZWFyY2gtdG9vbHMnO1xuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XG5pbXBvcnQgeyBBbmltYXRpb25Ub29scyB9IGZyb20gJy4vdG9vbHMvYW5pbWF0aW9uLXRvb2xzJztcbmltcG9ydCB7IE1hdGVyaWFsVG9vbHMgfSBmcm9tICcuL3Rvb2xzL21hdGVyaWFsLXRvb2xzJztcblxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1JFUVVFU1RfQk9EWV9CWVRFUyA9IDUgKiAxMDI0ICogMTAyNDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfVE9PTF9RVUVVRV9MRU5HVEggPSAxMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyA9IDYwXzAwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ09OQ1VSUkVOVF9UT09MUyA9IDU7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1BPUlRfUkVUUklFUyA9IDEwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IExBVEVTVF9QUk9UT0NPTF9WRVJTSU9OID0gJzIwMjUtMTEtMjUnO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTA2LTE4JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBMRUdBQ1lfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTAzLTI2JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBPTERFU1RfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTRVNTSU9OX0hFQURFUiA9ICdNY3AtU2Vzc2lvbi1JZCc7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPVE9DT0xfSEVBREVSID0gJ01DUC1Qcm90b2NvbC1WZXJzaW9uJztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMgPSBuZXcgU2V0KFtcbiAgICAgICAgTUNQU2VydmVyLkxBVEVTVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuTEVHQUNZX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgIE1DUFNlcnZlci5PTERFU1RfUFJPVE9DT0xfVkVSU0lPTlxuICAgIF0pO1xuXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY2xpZW50czogTWFwPHN0cmluZywgTUNQQ2xpZW50PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHNlc3Npb25TdHJlYW1zOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBsZWdhY3lTc2VTdHJlYW1zOiBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIHRvb2xFeGVjdXRvcnM6IE1hcDxzdHJpbmcsIChhcmdzOiBhbnkpID0+IFByb21pc2U8YW55Pj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSB0b29sUXVldWU6IEFycmF5PHtcbiAgICAgICAgcnVuOiAoKSA9PiBQcm9taXNlPGFueT47XG4gICAgICAgIHJlc29sdmU6ICh2YWx1ZTogYW55KSA9PiB2b2lkO1xuICAgICAgICByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgfT4gPSBbXTtcbiAgICBwcml2YXRlIGFjdGl2ZVRvb2xDb3VudCA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29scygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZVRvb2xzKCk6IHZvaWQge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyB0b29scy4uLicpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZSA9IG5ldyBTY2VuZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLm5vZGUgPSBuZXcgTm9kZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmYWIgPSBuZXcgUHJlZmFiVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJvamVjdCA9IG5ldyBQcm9qZWN0VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZGVidWcgPSBuZXcgRGVidWdUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmZXJlbmNlcyA9IG5ldyBQcmVmZXJlbmNlc1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNlcnZlciA9IG5ldyBTZXJ2ZXJUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5icm9hZGNhc3QgPSBuZXcgQnJvYWRjYXN0VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmVBZHZhbmNlZCA9IG5ldyBTY2VuZUFkdmFuY2VkVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmVWaWV3ID0gbmV3IFNjZW5lVmlld1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnJlZmVyZW5jZUltYWdlID0gbmV3IFJlZmVyZW5jZUltYWdlVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYXNzZXRBZHZhbmNlZCA9IG5ldyBBc3NldEFkdmFuY2VkVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMudmFsaWRhdGlvbiA9IG5ldyBWYWxpZGF0aW9uVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYmF0Y2ggPSBuZXcgQmF0Y2hUb29scyh0aGlzLmV4ZWN1dGVUb29sQ2FsbC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2VhcmNoID0gbmV3IFNlYXJjaFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmVkaXRvciA9IG5ldyBFZGl0b3JUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMubWF0ZXJpYWwgPSBuZXcgTWF0ZXJpYWxUb29scygpO1xuICAgICAgICAgICAgbG9nZ2VyLnN1Y2Nlc3MoJ1Rvb2xzIGluaXRpYWxpemVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBpbml0aWFsaXppbmcgdG9vbHM6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ1NlcnZlciBpcyBhbHJlYWR5IHJ1bm5pbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwb3J0ID0gdGhpcy5zZXR0aW5ncy5wb3J0O1xuICAgICAgICBsZXQgbGFzdEVycm9yOiBhbnk7XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ZW1wdCA9IDA7IGF0dGVtcHQgPCBNQ1BTZXJ2ZXIuTUFYX1BPUlRfUkVUUklFUzsgYXR0ZW1wdCsrKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudHJ5TGlzdGVuKHBvcnQpO1xuICAgICAgICAgICAgICAgIGlmIChwb3J0ICE9PSB0aGlzLnNldHRpbmdzLnBvcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYE9yaWdpbmFsIHBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IHdhcyBpbiB1c2UsIGJvdW5kIHRvICR7cG9ydH0gaW5zdGVhZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLnNldHRpbmdzLnBvcnQgPSBwb3J0O1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKCdNQ1AgU2VydmVyIGlzIHJlYWR5IGZvciBjb25uZWN0aW9ucycpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgbGFzdEVycm9yID0gZXJyO1xuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBQb3J0ICR7cG9ydH0gaW4gdXNlLCB0cnlpbmcgJHtwb3J0ICsgMX0uLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgcG9ydCsrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjogJHtsYXN0RXJyb3J9YCk7XG4gICAgICAgIHRocm93IGxhc3RFcnJvcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIHRyeUxpc3Rlbihwb3J0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuaGFuZGxlSHR0cFJlcXVlc3QuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQsICcxMjcuMC4wLjEnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gc2VydmVyO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKGBIVFRQIHNlcnZlciBzdGFydGVkIG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBIZWFsdGggY2hlY2s6IGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9oZWFsdGhgKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgTUNQIGVuZHBvaW50OiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0vbWNwYCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgc2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXR1cFRvb2xzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnRvb2xzTGlzdCA9IFtdO1xuICAgICAgICB0aGlzLnRvb2xFeGVjdXRvcnMuY2xlYXIoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IFtfY2F0ZWdvcnksIHRvb2xTZXRdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XG4gICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHNMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdG9vbC5pbnB1dFNjaGVtYVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbEV4ZWN1dG9ycy5zZXQodG9vbC5uYW1lLCAoYXJnczogYW55KSA9PiB0b29sU2V0LmV4ZWN1dGUodG9vbC5uYW1lLCBhcmdzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuaW5mbyhgU2V0dXAgdG9vbHM6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSB0b29scyBhdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sRXhlY3V0b3JzLmdldCh0b29sTmFtZSk7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IHRyeSB0byBmaW5kIHRoZSB0b29sIGluIGFueSBleGVjdXRvclxuICAgICAgICBmb3IgKGNvbnN0IFtfY2F0ZWdvcnksIHRvb2xTZXRdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XG4gICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgIGlmICh0b29scy5zb21lKCh0OiBhbnkpID0+IHQubmFtZSA9PT0gdG9vbE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRvb2xTZXQuZXhlY3V0ZSh0b29sTmFtZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRvb2wgJHt0b29sTmFtZX0gbm90IGZvdW5kYCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldENsaWVudHMoKTogTUNQQ2xpZW50W10ge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNsaWVudHMudmFsdWVzKCkpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0QXZhaWxhYmxlVG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U2V0dGluZ3MoKTogTUNQU2VydmVyU2V0dGluZ3Mge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0TG9nZ2VyKCkge1xuICAgICAgICByZXR1cm4gbG9nZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXEudXJsIHx8ICcnLCB0cnVlKTtcbiAgICAgICAgY29uc3QgcGF0aG5hbWUgPSBwYXJzZWRVcmwucGF0aG5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgQ09SUyBoZWFkZXJzXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBERUxFVEUsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsIGBDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sICR7TUNQU2VydmVyLlBST1RPQ09MX0hFQURFUn0sICR7TUNQU2VydmVyLlNFU1NJT05fSEVBREVSfWApO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlUmVxdWVzdE9yaWdpbihyZXEsIHJlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwYXRobmFtZSA9PT0gJy9tY3AnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVNQ1BUcmFuc3BvcnRSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvc3NlJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU1NFQ29ubmVjdGlvbihyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL21lc3NhZ2VzJyAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNTRU1lc3NhZ2VSZXF1ZXN0KHJlcSwgcmVzLCBwYXJzZWRVcmwucXVlcnkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9oZWFsdGgnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5sZW5ndGggfSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZT8uc3RhcnRzV2l0aCgnL2FwaS8nKSAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNpbXBsZUFQSVJlcXVlc3QocmVxLCByZXMsIHBhdGhuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvYXBpL3Rvb2xzJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgdG9vbHM6IHRoaXMuZ2V0U2ltcGxpZmllZFRvb2xzTGlzdCgpIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBIVFRQIHJlcXVlc3QgZXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVSZXF1ZXN0T3JpZ2luKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBvcmlnaW4gPSB0aGlzLmdldEhlYWRlcihyZXEsICdvcmlnaW4nKTtcbiAgICAgICAgaWYgKCFvcmlnaW4gfHwgb3JpZ2luID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYWxsb3dlZE9yaWdpbnM/LmluY2x1ZGVzKCcqJykgfHwgdGhpcy5zZXR0aW5ncy5hbGxvd2VkT3JpZ2lucz8uaW5jbHVkZXMob3JpZ2luKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTChvcmlnaW4pO1xuICAgICAgICAgICAgaWYgKHBhcnNlZC5ob3N0bmFtZSA9PT0gJzEyNy4wLjAuMScgfHwgcGFyc2VkLmhvc3RuYW1lID09PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDMpO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGBPcmlnaW4gbm90IGFsbG93ZWQ6ICR7b3JpZ2lufWAgfSkpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRIZWFkZXIocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgaGVhZGVyTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZXEuaGVhZGVyc1toZWFkZXJOYW1lLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiB2YWx1ZVswXTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdEhlYWRlcjogc3RyaW5nLCByZXF1aXJlZFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWFjY2VwdEhlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBhY2NlcHRIZWFkZXIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWQuaW5jbHVkZXMoJyovKicpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMocmVxdWlyZWRUeXBlLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVNQ1BQb3N0SGVhZGVycyhyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYWNjZXB0ID0gdGhpcy5nZXRIZWFkZXIocmVxLCAnYWNjZXB0JykgfHwgJyc7XG4gICAgICAgIGlmICghdGhpcy5hY2NlcHRzQ29udGVudFR5cGUoYWNjZXB0LCAnYXBwbGljYXRpb24vanNvbicpIHx8ICF0aGlzLmFjY2VwdHNDb250ZW50VHlwZShhY2NlcHQsICd0ZXh0L2V2ZW50LXN0cmVhbScpKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNik7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQT1NUIC9tY3AgcmVxdWlyZXMgQWNjZXB0IGhlYWRlciBjb250YWluaW5nIGJvdGggYXBwbGljYXRpb24vanNvbiBhbmQgdGV4dC9ldmVudC1zdHJlYW0nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSAodGhpcy5nZXRIZWFkZXIocmVxLCAnY29udGVudC10eXBlJykgfHwgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmICghY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTUpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUE9TVCAvbWNwIHJlcXVpcmVzIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY1JlcXVlc3RNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISFtZXNzYWdlICYmIHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbWVzc2FnZS5tZXRob2QgPT09ICdzdHJpbmcnO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNKc29uUnBjTm90aWZpY2F0aW9uKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKSAmJiAobWVzc2FnZS5pZCA9PT0gdW5kZWZpbmVkIHx8IG1lc3NhZ2UuaWQgPT09IG51bGwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNKc29uUnBjUmVzcG9uc2VNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgdHlwZW9mIG1lc3NhZ2UgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5tZXRob2QgPT09ICdzdHJpbmcnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChtZXNzYWdlLmlkID09PSB1bmRlZmluZWQgfHwgbWVzc2FnZS5pZCA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1lc3NhZ2UsICdyZXN1bHQnKSB8fCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNQ1BUcmFuc3BvcnRSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU1DUFJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1DUFN0cmVhbVJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1DUERlbGV0ZVNlc3Npb24ocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzLnNldEhlYWRlcignQWxsb3cnLCAnR0VULCBQT1NULCBERUxFVEUsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDUpO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZU1DUFN0cmVhbVJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLnZhbGlkYXRlU2Vzc2lvbkhlYWRlcihyZXEsIHJlcywgdHJ1ZSk7XG4gICAgICAgIGlmICghc2Vzc2lvbikgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGFjY2VwdCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2FjY2VwdCcpIHx8ICcnO1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdCwgJ3RleHQvZXZlbnQtc3RyZWFtJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA2KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0dFVCAvbWNwIHJlcXVpcmVzIEFjY2VwdDogdGV4dC9ldmVudC1zdHJlYW0nIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNlc3Npb24uaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFNlc3Npb24gaXMgbm90IGluaXRpYWxpemVkOiAke3Nlc3Npb24uaWR9YCB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHVwU1NFSGVhZGVycyhyZXMpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIsIHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04pO1xuICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbi5pZCk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcblxuICAgICAgICBjb25zdCBzdHJlYW1JZCA9IHV1aWR2NCgpO1xuICAgICAgICBjb25zdCBzZXNzaW9uU3RyZWFtU2V0ID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCkgfHwgbmV3IE1hcDxzdHJpbmcsIGh0dHAuU2VydmVyUmVzcG9uc2U+KCk7XG4gICAgICAgIHNlc3Npb25TdHJlYW1TZXQuc2V0KHN0cmVhbUlkLCByZXMpO1xuICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLnNldChzZXNzaW9uLmlkLCBzZXNzaW9uU3RyZWFtU2V0KTtcblxuICAgICAgICBzZXNzaW9uLmxhc3RBY3Rpdml0eSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbi5pZCwgc2Vzc2lvbik7XG4gICAgICAgIHJlcy53cml0ZSgnOiBjb25uZWN0ZWRcXG5cXG4nKTtcblxuICAgICAgICByZXEub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3RyZWFtcyA9IHRoaXMuc2Vzc2lvblN0cmVhbXMuZ2V0KHNlc3Npb24uaWQpO1xuICAgICAgICAgICAgaWYgKCFzdHJlYW1zKSByZXR1cm47XG4gICAgICAgICAgICBzdHJlYW1zLmRlbGV0ZShzdHJlYW1JZCk7XG4gICAgICAgICAgICBpZiAoc3RyZWFtcy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RyZWFtcy5kZWxldGUoc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgaGFuZGxlTUNQRGVsZXRlU2Vzc2lvbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHRoaXMudmFsaWRhdGVTZXNzaW9uSGVhZGVyKHJlcSwgcmVzLCB0cnVlKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uKSByZXR1cm47XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtcyA9IHRoaXMuc2Vzc2lvblN0cmVhbXMuZ2V0KHNlc3Npb24uaWQpO1xuICAgICAgICBpZiAoc3RyZWFtcykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbX3N0cmVhbUlkLCBzdHJlYW1dIG9mIHN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBuby1vcFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2Vzc2lvblN0cmVhbXMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jbGllbnRzLmRlbGV0ZShzZXNzaW9uLmlkKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDQpO1xuICAgICAgICByZXMuZW5kKCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXR1cFNTRUhlYWRlcnMocmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L2V2ZW50LXN0cmVhbScpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgJ25vLWNhY2hlJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0Nvbm5lY3Rpb24nLCAna2VlcC1hbGl2ZScpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdYLUFjY2VsLUJ1ZmZlcmluZycsICdubycpO1xuICAgIH1cblxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFBST1RPQ09MX1ZFUlNJT05fUEFUVEVSTiA9IC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLztcblxuICAgIHByaXZhdGUgbmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKG1lc3NhZ2VQcm90b2NvbDogYW55LCBoZWFkZXJQcm90b2NvbD86IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCByZXF1ZXN0ZWQgPSB0eXBlb2YgbWVzc2FnZVByb3RvY29sID09PSAnc3RyaW5nJ1xuICAgICAgICAgICAgPyBtZXNzYWdlUHJvdG9jb2xcbiAgICAgICAgICAgIDogKGhlYWRlclByb3RvY29sIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04pO1xuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3RlZCAhPT0gJ3N0cmluZycgfHwgIU1DUFNlcnZlci5QUk9UT0NPTF9WRVJTSU9OX1BBVFRFUk4udGVzdChyZXF1ZXN0ZWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIU1DUFNlcnZlci5TVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMuaGFzKHJlcXVlc3RlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXF1ZXN0ZWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlLCByZXF1aXJlZDogYm9vbGVhbik6IE1DUENsaWVudCB8IG51bGwge1xuICAgICAgICBjb25zdCBzZXNzaW9uSWQgPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUik7XG4gICAgICAgIGlmICghc2Vzc2lvbklkKSB7XG4gICAgICAgICAgICBpZiAocmVxdWlyZWQpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBgTWlzc2luZyByZXF1aXJlZCBoZWFkZXI6ICR7TUNQU2VydmVyLlNFU1NJT05fSEVBREVSfWAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy5jbGllbnRzLmdldChzZXNzaW9uSWQpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFNlc3Npb24gbm90IGZvdW5kOiAke3Nlc3Npb25JZH1gIH0pKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNlc3Npb247XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVTU0VDb25uZWN0aW9uKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBjbGllbnRJZCA9IHV1aWR2NCgpO1xuICAgICAgICB0aGlzLnNldHVwU1NFSGVhZGVycyhyZXMpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG5cbiAgICAgICAgY29uc3QgY2xpZW50OiBNQ1BDbGllbnQgPSB7XG4gICAgICAgICAgICBpZDogY2xpZW50SWQsXG4gICAgICAgICAgICBsYXN0QWN0aXZpdHk6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB1c2VyQWdlbnQ6IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J11cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5jbGllbnRzLnNldChjbGllbnRJZCwgY2xpZW50KTtcbiAgICAgICAgdGhpcy5sZWdhY3lTc2VTdHJlYW1zLnNldChjbGllbnRJZCwgcmVzKTtcblxuICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChyZXMsICdlbmRwb2ludCcsIGAvbWVzc2FnZXM/c2Vzc2lvbklkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNsaWVudElkKX1gKTtcbiAgICAgICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuICAgICAgICBsb2dnZXIuaW5mbyhgU1NFIGNsaWVudCBjb25uZWN0ZWQ6ICR7Y2xpZW50SWR9YCk7XG5cbiAgICAgICAgcmVxLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5kZWxldGUoY2xpZW50SWQpO1xuICAgICAgICAgICAgdGhpcy5jbGllbnRzLmRlbGV0ZShjbGllbnRJZCk7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgU1NFIGNsaWVudCBkaXNjb25uZWN0ZWQ6ICR7Y2xpZW50SWR9YCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU1NFTWVzc2FnZVJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlLCBxdWVyeTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHJhd1Nlc3Npb25JZCA9IHF1ZXJ5Py5zZXNzaW9uSWQ7XG4gICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IEFycmF5LmlzQXJyYXkocmF3U2Vzc2lvbklkKSA/IHJhd1Nlc3Npb25JZFswXSA6IHJhd1Nlc3Npb25JZDtcbiAgICAgICAgaWYgKCFzZXNzaW9uSWQgfHwgdHlwZW9mIHNlc3Npb25JZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcXVlcnkgcGFyYW1ldGVyOiBzZXNzaW9uSWQnIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IHRoaXMubGVnYWN5U3NlU3RyZWFtcy5nZXQoc2Vzc2lvbklkKTtcbiAgICAgICAgaWYgKCFzdHJlYW0pIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFNTRSBzZXNzaW9uIG5vdCBmb3VuZDogJHtzZXNzaW9uSWR9YCB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYm9keTogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IHRoaXMucmVhZFJlcXVlc3RCb2R5KHJlcSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICBjb25zdCBib2R5RXJyb3JSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycj8ubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KGJvZHlFcnJvclJlc3BvbnNlKSk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IGFueTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVHJ5Rml4SnNvbihib2R5KSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEpTT04gcGFyc2luZyBmYWlsZWQ6ICR7cGFyc2VFcnJvci5tZXNzYWdlfS4gT3JpZ2luYWwgYm9keTogJHtib2R5LnN1YnN0cmluZygwLCA1MDApfS4uLmApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBmaXhlZEJvZHkgPSB0aGlzLmZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY2xpZW50ID0gdGhpcy5jbGllbnRzLmdldChzZXNzaW9uSWQpO1xuICAgICAgICAgICAgaWYgKGNsaWVudCkge1xuICAgICAgICAgICAgICAgIGNsaWVudC5sYXN0QWN0aXZpdHkgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCBjbGllbnQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBpc1JlcXVlc3QgPSB0aGlzLmlzSnNvblJwY1JlcXVlc3RNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgY29uc3QgaXNOb3RpZmljYXRpb24gPSB0aGlzLmlzSnNvblJwY05vdGlmaWNhdGlvbihtZXNzYWdlKTtcbiAgICAgICAgICAgIGNvbnN0IGlzSW5pdGlhbGl6ZSA9IGlzUmVxdWVzdCAmJiBtZXNzYWdlLm1ldGhvZCA9PT0gJ2luaXRpYWxpemUnO1xuICAgICAgICAgICAgaWYgKGlzSW5pdGlhbGl6ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3RvY29sVmVyc2lvbiA9IHRoaXMubmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKG1lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1bnN1cHBvcnRlZFJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCBwcm90b2NvbCB2ZXJzaW9uOiAke21lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHVuc3VwcG9ydGVkUmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlLCB7IHByb3RvY29sVmVyc2lvbiB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbml0Q2xpZW50ID0gdGhpcy5jbGllbnRzLmdldChzZXNzaW9uSWQpO1xuICAgICAgICAgICAgICAgIGlmIChpbml0Q2xpZW50ICYmICFyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICBpbml0Q2xpZW50LnByb3RvY29sVmVyc2lvbiA9IHByb3RvY29sVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgaW5pdENsaWVudC5pbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCBpbml0Q2xpZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChpc05vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5tY3AoYFJlY2VpdmVkIFNTRSBub3RpZmljYXRpb246ICR7bWVzc2FnZS5tZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG5cbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBoYW5kbGluZyBTU0UgcmVxdWVzdDogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlRXJyb3JSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI3MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQYXJzZSBlcnJvcjogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHBhcnNlRXJyb3JSZXNwb25zZSkpO1xuXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHNlbmRTU0VFdmVudChyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICByZXMud3JpdGUoYGV2ZW50OiAke2V2ZW50fVxcbmApO1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YS5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZShgZGF0YTogJHtsaW5lfVxcbmApO1xuICAgICAgICB9XG4gICAgICAgIHJlcy53cml0ZSgnXFxuJyk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlTUNQUG9zdEhlYWRlcnMocmVxLCByZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoZWFkZXJQcm90b2NvbFZlcnNpb24gPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIpO1xuICAgICAgICBpZiAoaGVhZGVyUHJvdG9jb2xWZXJzaW9uICYmICFNQ1BTZXJ2ZXIuU1VQUE9SVEVEX1BST1RPQ09MX1ZFUlNJT05TLmhhcyhoZWFkZXJQcm90b2NvbFZlcnNpb24pKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9OiAke2hlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGJvZHk6IHN0cmluZztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJvZHkgPSBhd2FpdCB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTMpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAwLCBtZXNzYWdlOiBlcnI/Lm1lc3NhZ2UgfHwgJ1JlcXVlc3QgYm9keSB0b28gbGFyZ2UnIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgLy8gRW5oYW5jZWQgSlNPTiBwYXJzaW5nIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IGFueTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9LiBPcmlnaW5hbCBib2R5OiAke2JvZHkuc3Vic3RyaW5nKDAsIDUwMCl9Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IGNvbW1vbiBKU09OIGlzc3Vlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXhlZEJvZHkgPSB0aGlzLmZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeGVkQm9keSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaXNSZXF1ZXN0ID0gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc05vdGlmaWNhdGlvbiA9IHRoaXMuaXNKc29uUnBjTm90aWZpY2F0aW9uKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUmVzcG9uc2UgPSB0aGlzLmlzSnNvblJwY1Jlc3BvbnNlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzUmVxdWVzdCAmJiAhaXNSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIEpTT04tUlBDIG1lc3NhZ2UnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGlzSW5pdGlhbGl6ZSA9IGlzUmVxdWVzdCAmJiBtZXNzYWdlLm1ldGhvZCA9PT0gJ2luaXRpYWxpemUnO1xuICAgICAgICAgICAgICAgIGlmIChpc0luaXRpYWxpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdTZXNzaW9uSWQgPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1Nlc3Npb25JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHtNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVJ9IG11c3Qgbm90IGJlIHNldCBvbiBpbml0aWFsaXplYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSW5pdGlhbGl6ZSBtdXN0IGJlIHNlbnQgYXMgYSBKU09OLVJQQyByZXF1ZXN0IHdpdGggYSBub24tbnVsbCBpZCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm90b2NvbFZlcnNpb24gPSB0aGlzLm5lZ290aWF0ZVByb3RvY29sVmVyc2lvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUHJvdG9jb2xWZXJzaW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCBwcm90b2NvbCB2ZXJzaW9uOiAke21lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uIHx8IGhlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbklkID0gdXVpZHY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHsgcHJvdG9jb2xWZXJzaW9uIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1F1ZXVlRnVsbCA9IHJlc3BvbnNlLmVycm9yPy5jb2RlID09PSAtMzIwMjk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0QWN0aXZpdHk6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlckFnZW50OiByZXEuaGVhZGVyc1sndXNlci1hZ2VudCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoTUNQU2VydmVyLlBST1RPQ09MX0hFQURFUiwgcHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignUmV0cnktQWZ0ZXInLCAnNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MjkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLnZhbGlkYXRlU2Vzc2lvbkhlYWRlcihyZXEsIHJlcywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFzZXNzaW9uKSByZXR1cm47XG4gICAgICAgICAgICAgICAgaWYgKCFzZXNzaW9uLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNlc3Npb24gaXMgbm90IGluaXRpYWxpemVkOiAke3Nlc3Npb24uaWR9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcm90b2NvbFZlcnNpb24gPSB0aGlzLm5lZ290aWF0ZVByb3RvY29sVmVyc2lvbihcbiAgICAgICAgICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJQcm90b2NvbFZlcnNpb24gfHwgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb25cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmICghcHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFVuc3VwcG9ydGVkIHByb3RvY29sIHZlcnNpb246ICR7aGVhZGVyUHJvdG9jb2xWZXJzaW9ufWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGhlYWRlclByb3RvY29sVmVyc2lvbiAmJiBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiAmJiBoZWFkZXJQcm90b2NvbFZlcnNpb24gIT09IHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYCR7TUNQU2VydmVyLlBST1RPQ09MX0hFQURFUn0gZG9lcyBub3QgbWF0Y2ggaW5pdGlhbGl6ZWQgc2Vzc2lvbiB2ZXJzaW9uYFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzZXNzaW9uLmxhc3RBY3Rpdml0eSA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFzZXNzaW9uLnByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiA9IHByb3RvY29sVmVyc2lvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uLmlkLCBzZXNzaW9uKTtcblxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoTUNQU2VydmVyLlNFU1NJT05fSEVBREVSLCBzZXNzaW9uLmlkKTtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIsIHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uIHx8IHByb3RvY29sVmVyc2lvbik7XG5cbiAgICAgICAgICAgICAgICAvLyBNQ1Agbm90aWZpY2F0aW9ucy9yZXNwb25zZXMgbXVzdCByZXR1cm4gMjAyIEFjY2VwdGVkIHdoZW4gYWNjZXB0ZWQuXG4gICAgICAgICAgICAgICAgaWYgKGlzUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLm1jcCgnUmVjZWl2ZWQgY2xpZW50IEpTT04tUlBDIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpc05vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIubWNwKGBSZWNlaXZlZCBub3RpZmljYXRpb246ICR7bWVzc2FnZS5tZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSwgeyBwcm90b2NvbFZlcnNpb246IHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uIHx8IHByb3RvY29sVmVyc2lvbiB9KTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1F1ZXVlRnVsbCA9IHJlc3BvbnNlLmVycm9yPy5jb2RlID09PSAtMzIwMjk7XG4gICAgICAgICAgICAgICAgaWYgKGlzUXVldWVGdWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MjkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIE1DUCByZXF1ZXN0OiAke2Vycm9yfWApO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUGFyc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNZXNzYWdlKG1lc3NhZ2U6IGFueSwgY29udGV4dD86IHsgcHJvdG9jb2xWZXJzaW9uPzogc3RyaW5nIH0pOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IHJlc3VsdDogYW55O1xuXG4gICAgICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHRvb2xzOiB0aGlzLmdldEF2YWlsYWJsZVRvb2xzKCkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBuYW1lLCBhcmd1bWVudHM6IGFyZ3MgfSA9IHBhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbFJlc3VsdCA9IGF3YWl0IHRoaXMuZW5xdWV1ZVRvb2xFeGVjdXRpb24obmFtZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh0b29sUmVzdWx0KSB9XSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSAncmVzb3VyY2VzL2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IHJlc291cmNlczogdGhpcy5nZXRSZXNvdXJjZXNMaXN0KCkgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAncmVzb3VyY2VzL3JlYWQnOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVyaSA9IHBhcmFtcz8udXJpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXVyaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogdXJpJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gYXdhaXQgdGhpcy5oYW5kbGVSZWFkUmVzb3VyY2UodXJpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBNQ1AgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2xWZXJzaW9uOiBjb250ZXh0Py5wcm90b2NvbFZlcnNpb24gfHwgTUNQU2VydmVyLkRFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVySW5mbzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnWW91IGFyZSBjb25uZWN0ZWQgdG8gYSBydW5uaW5nIENvY29zIENyZWF0b3IgZWRpdG9yIHZpYSBNQ1AuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdBbHdheXMgaW5zcGVjdCB0aGUgY3VycmVudCBzY2VuZS9wcmVmYWIgc3RydWN0dXJlIGJlZm9yZSBtYWtpbmcgbW9kaWZpY2F0aW9ucywgYW5kIHF1ZXJ5IHJlYWwtdGltZSBlZGl0b3IgZGF0YSBpbnN0ZWFkIG9mIGd1ZXNzaW5nLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWx3YXlzIHVzZSBNQ1AvZWRpdG9yIEFQSXMgZm9yIHNjZW5lLCBub2RlLCBjb21wb25lbnQsIHByZWZhYiwgYXNzZXQsIHByb2plY3QsIGFuZCBlZGl0b3Igb3BlcmF0aW9ucy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0RvIG5vdCBkaXJlY3RseSBlZGl0IHNlcmlhbGl6ZWQgQ29jb3MgZmlsZXMgKC5zY2VuZSwgLnByZWZhYiwgLm1ldGEsIGFuZCByZWxhdGVkIGRhdGEgZmlsZXMpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIG9ubHkgZmlsZXMgYWxsb3dlZCBmb3IgZGlyZWN0IHRleHQgZWRpdGluZyBhcmUgVHlwZVNjcmlwdC9KYXZhU2NyaXB0IHNvdXJjZSBmaWxlcyAoLnRzLCAuanMpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWxsIHRvb2xzIHVzZSBhbiBcImFjdGlvblwiIHBhcmFtZXRlciB0byBzcGVjaWZ5IG9wZXJhdGlvbnMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdBZnRlciBjcmVhdGluZyBvciByZXN0cnVjdHVyaW5nIFVJIG5vZGVzLCBhcHBseSByZXNwb25zaXZlIGRlZmF1bHRzIChhbmNob3JzLCB3aWRnZXQgY29uc3RyYWludHMsIGFuZCBsYXlvdXQpLCBhbmQgcHJlZmVyIHVpX2FwcGx5X3Jlc3BvbnNpdmVfZGVmYXVsdHMgaW1tZWRpYXRlbHkgZm9yIGNvbnNpc3RlbmN5LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUHJlZmVyIHJldXNhYmxlIHByZWZhYiBlZGl0cyBhdCB0aGUgcHJlZmFiIGFzc2V0IHNvdXJjZSBsZXZlbDsgdXNlIHNjZW5lLWxvY2FsIG92ZXJyaWRlcyBvbmx5IHdoZW4gbmVjZXNzYXJ5LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRm9yIGFueSBjb21wb3NpdGUgVUkgKHBvcHVwcywgZGlhbG9ncywgcGFuZWxzLCBsaXN0IGl0ZW1zLCBjYXJkcywgSFVEIHdpZGdldHMsIGV0Yy4pLCBkbyBOT1QgYXNzZW1ibGUgdGhlIHRyZWUgZnJvbSBzY3JhdGNoIHZpYSBjaGFpbmVkIG5vZGVfbGlmZWN5Y2xlLmNyZWF0ZSBjYWxscy4gRmlyc3QgbG9jYXRlIGFuIGV4aXN0aW5nIHByZWZhYiB0ZW1wbGF0ZSBpbiB0aGlzIHByb2plY3QgKHByZWZhYl9xdWVyeS5nZXRfbGlzdCwgb3IgYXNzZXRfcXVlcnkuZmluZF9ieV9uYW1lIHdpdGggYXNzZXRUeXBlPVwicHJlZmFiXCIpLCB0aGVuIHVzZSBwcmVmYWJfbGlmZWN5Y2xlLmluc3RhbnRpYXRlIGFuZCBvdmVycmlkZSBwcm9wZXJ0aWVzIHZpYSBzZXRfY29tcG9uZW50X3Byb3BlcnR5LiBCdWlsZC1mcm9tLXNjcmF0Y2ggaXMgb25seSBhY2NlcHRhYmxlIGZvciB0cml2aWFsIHdyYXBwZXJzICjiiaQzIGNoaWxkcmVuLCBubyBsYXlvdXQgY29tcG9uZW50cykuIElmIG5vIHRlbXBsYXRlIGZpdHMsIGFzayB0aGUgdXNlciB3aGljaCBleGlzdGluZyBwcmVmYWIgdG8gYmFzZSBpdCBvbi4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0tlZXAgbm9kZSBuYW1lcyBzZW1hbnRpYywgc2hvcnQsIGFuZCBjb25zaXN0ZW50IHdpdGggY29tcG9uZW50IHJvbGVzLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnV2hlbiBoaWVyYXJjaHkgb3Igbm9kZSBuYW1lcyBjaGFuZ2UsIHZlcmlmeSBhbmQgdXBkYXRlIHNjcmlwdCByZWZlcmVuY2VzIGFuZCBsb29rdXAgcGF0aHMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdWYWxpZGF0ZSBub2RlL2NvbXBvbmVudC9hc3NldCByZWZlcmVuY2VzIGFmdGVyIGVkaXRzIHRvIGVuc3VyZSB0aGVyZSBhcmUgbm8gbWlzc2luZyBsaW5rcy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NhdmUgYW5kIHJlbG9hZCB0b3VjaGVkIHNjZW5lL3ByZWZhYiBmaWxlcyBiZWZvcmUgZmluaXNoaW5nIHRvIGNvbmZpcm0gc2VyaWFsaXphdGlvbiBzdGFiaWxpdHkuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSZXBvcnQgcGVyZm9ybWVkIGNoYW5nZXMgY2xlYXJseSwgaW5jbHVkaW5nIGFmZmVjdGVkIG5vZGVzLCBjb21wb25lbnRzLCBjb25zdHJhaW50cywgYW5kIHByZXNldHMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdJZiByZXF1aXJlbWVudHMgYXJlIGFtYmlndW91cywgYXNrIGZvciBjbGFyaWZpY2F0aW9uIGluc3RlYWQgb2YgZ3Vlc3NpbmcgbGF5b3V0IGJlaGF2aW9yLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTUNQIFJlc291cmNlcyBhdmFpbGFibGU6IGNvY29zOi8vaGllcmFyY2h5IChzY2VuZSB0cmVlKSwgY29jb3M6Ly9zZWxlY3Rpb24gKGN1cnJlbnQgc2VsZWN0aW9uKSwgY29jb3M6Ly9sb2dzL2xhdGVzdCAoc2VydmVyIGxvZ3MpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGJhdGNoX2V4ZWN1dGUgdG8gcnVuIG11bHRpcGxlIG9wZXJhdGlvbnMgaW4gb25lIGNhbGwgZm9yIGVmZmljaWVuY3kuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdLZXkgdG9vbHM6IHNjZW5lX21hbmFnZW1lbnQgKGFjdGlvbjogZ2V0X2N1cnJlbnQvZ2V0X2xpc3Qvb3Blbi9zYXZlL2NyZWF0ZS9jbG9zZS9nZXRfaGllcmFyY2h5KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZmluZF9ieV9wYXR0ZXJuL2ZpbmRfYnlfbmFtZS9nZXRfYWxsL2RldGVjdF90eXBlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfbGlmZWN5Y2xlIChhY3Rpb246IGNyZWF0ZS9kZWxldGUvZHVwbGljYXRlL21vdmUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZV90cmFuc2Zvcm0gKGFjdGlvbjogc2V0X3RyYW5zZm9ybS9zZXRfcHJvcGVydHkpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X21hbmFnZSAoYWN0aW9uOiBhZGQvcmVtb3ZlL2F0dGFjaF9zY3JpcHQpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X3F1ZXJ5IChhY3Rpb246IGdldF9hbGwvZ2V0X2luZm8vZ2V0X2F2YWlsYWJsZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXRfY29tcG9uZW50X3Byb3BlcnR5IChtb2RpZnkgY29tcG9uZW50IHByb3BlcnRpZXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cyAoYXBwbHkgcmVzcG9uc2l2ZSB3aWRnZXQvbGF5b3V0L2FuY2hvciBwcmVzZXRzKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ByZWZhYl9saWZlY3ljbGUgKGFjdGlvbjogY3JlYXRlL2luc3RhbnRpYXRlL3VwZGF0ZS9kdXBsaWNhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmFiX3F1ZXJ5IChhY3Rpb246IGdldF9saXN0L2xvYWQvZ2V0X2luZm8vdmFsaWRhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXNzZXRfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZ2V0X2Fzc2V0cy9maW5kX2J5X25hbWUvZ2V0X2RldGFpbHMvcXVlcnlfcGF0aC9xdWVyeV91dWlkL3F1ZXJ5X3VybCksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldF9jcnVkIChhY3Rpb246IGNyZWF0ZS9jb3B5L21vdmUvZGVsZXRlL3NhdmUvcmVpbXBvcnQvaW1wb3J0L3JlZnJlc2gpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJvamVjdF9idWlsZCAoYWN0aW9uOiBydW4vYnVpbGQvZ2V0X2J1aWxkX3NldHRpbmdzL29wZW5fYnVpbGRfcGFuZWwvY2hlY2tfYnVpbGRlcl9zdGF0dXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGVidWdfY29uc29sZSAoYWN0aW9uOiBnZXRfbG9ncy9jbGVhci9leGVjdXRlX3NjcmlwdCksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdiYXRjaF9leGVjdXRlIChydW4gbXVsdGlwbGUgb3BlcmF0aW9ucyBzZXF1ZW50aWFsbHkgaW4gb25lIGNhbGwpLidcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIG1ldGhvZDogJHttZXRob2R9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgcmVzdWx0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IGVycm9yLm1lc3NhZ2UgPT09ICdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcicgPyAtMzIwMjkgOiAtMzI2MDMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gLS0tIE1DUCBSZXNvdXJjZXMgLS0tXG5cbiAgICBwcml2YXRlIGdldFJlc291cmNlc0xpc3QoKTogYW55W10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vaGllcmFyY2h5JyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnU2NlbmUgSGllcmFyY2h5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0N1cnJlbnQgc2NlbmUgbm9kZSB0cmVlIHN0cnVjdHVyZSAocmVhZC1vbmx5IHNuYXBzaG90KScsXG4gICAgICAgICAgICAgICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmk6ICdjb2NvczovL3NlbGVjdGlvbicsXG4gICAgICAgICAgICAgICAgbmFtZTogJ0N1cnJlbnQgU2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0N1cnJlbnRseSBzZWxlY3RlZCBub2Rlcy9hc3NldHMgaW4gdGhlIGVkaXRvcicsXG4gICAgICAgICAgICAgICAgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB1cmk6ICdjb2NvczovL2xvZ3MvbGF0ZXN0JyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnU2VydmVyIExvZ3MnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVjZW50IE1DUCBzZXJ2ZXIgbG9nIGVudHJpZXMnLFxuICAgICAgICAgICAgICAgIG1pbWVUeXBlOiAndGV4dC9wbGFpbidcbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVJlYWRSZXNvdXJjZSh1cmk6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGxldCBwYXJzZWRVcmk6IFVSTDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBhcnNlZFVyaSA9IG5ldyBVUkwodXJpKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcmVzb3VyY2UgVVJJOiAke3VyaX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwYXJzZWRVcmkucHJvdG9jb2wgIT09ICdjb2NvczonKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByb3RvY29sOiAke3BhcnNlZFVyaS5wcm90b2NvbH0uIEV4cGVjdGVkIFwiY29jb3M6XCJgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc291cmNlUGF0aCA9IHBhcnNlZFVyaS5ob3N0bmFtZSArIHBhcnNlZFVyaS5wYXRobmFtZTtcblxuICAgICAgICBzd2l0Y2ggKHJlc291cmNlUGF0aCkge1xuICAgICAgICAgICAgY2FzZSAnaGllcmFyY2h5Jzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgICAgICBpZiAoIXRyZWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IFt7IHVyaSwgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJywgdGV4dDogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vIHNjZW5lIGxvYWRlZCcgfSkgfV0gfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gdGhpcy5idWlsZFJlc291cmNlSGllcmFyY2h5KHRyZWUsIDAsIDEwLCA1MCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IFt7IHVyaSwgbWltZVR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJywgdGV4dDogSlNPTi5zdHJpbmdpZnkoaGllcmFyY2h5LCBudWxsLCAyKSB9XSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnc2VsZWN0aW9uJzoge1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvci5TZWxlY3Rpb24gaXMgYSBzeW5jaHJvbm91cyBBUEkgaW4gQ29jb3MgQ3JlYXRvciAzLjgueFxuICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkTm9kZXMgPSBFZGl0b3IuU2VsZWN0aW9uLmdldFNlbGVjdGVkKCdub2RlJykgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRBc3NldHMgPSBFZGl0b3IuU2VsZWN0aW9uLmdldFNlbGVjdGVkKCdhc3NldCcpIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzOiBzZWxlY3RlZE5vZGVzLFxuICAgICAgICAgICAgICAgICAgICBhc3NldHM6IHNlbGVjdGVkQXNzZXRzXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSB9XSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnbG9ncy9sYXRlc3QnOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbG9nQ29udGVudCA9IGxvZ2dlci5nZXRMb2dDb250ZW50KDIwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgY29udGVudHM6IFt7IHVyaSwgbWltZVR5cGU6ICd0ZXh0L3BsYWluJywgdGV4dDogbG9nQ29udGVudCB8fCAnKG5vIGxvZ3MgeWV0KScgfV0gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHJlc291cmNlOiAke3VyaX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRSZXNvdXJjZUhpZXJhcmNoeShub2RlOiBhbnksIGRlcHRoOiBudW1iZXIsIG1heERlcHRoOiBudW1iZXIsIG1heENoaWxkcmVuOiBudW1iZXIpOiBhbnkge1xuICAgICAgICBjb25zdCBpbmZvOiBhbnkgPSB7XG4gICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICB0eXBlOiBub2RlLnR5cGUsXG4gICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGRlcHRoID49IG1heERlcHRoKSB7XG4gICAgICAgICAgICBjb25zdCBjaGlsZENvdW50ID0gbm9kZS5jaGlsZHJlbiA/IG5vZGUuY2hpbGRyZW4ubGVuZ3RoIDogMDtcbiAgICAgICAgICAgIGlmIChjaGlsZENvdW50ID4gMCkge1xuICAgICAgICAgICAgICAgIGluZm8uY2hpbGRyZW4gPSBgWyR7Y2hpbGRDb3VudH0gY2hpbGRyZW4sIGRlcHRoIGxpbWl0IHJlYWNoZWRdYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsID0gbm9kZS5jaGlsZHJlbi5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBzbGljZSA9IG5vZGUuY2hpbGRyZW4uc2xpY2UoMCwgbWF4Q2hpbGRyZW4pO1xuICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IHNsaWNlLm1hcCgoYzogYW55KSA9PiB0aGlzLmJ1aWxkUmVzb3VyY2VIaWVyYXJjaHkoYywgZGVwdGggKyAxLCBtYXhEZXB0aCwgbWF4Q2hpbGRyZW4pKTtcbiAgICAgICAgICAgIGlmICh0b3RhbCA+IG1heENoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jaGlsZHJlblRydW5jYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgaW5mby50b3RhbENoaWxkcmVuID0gdG90YWw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXBhaXIgY29tbW9uIEpTT041LWlzaCBtaXN0YWtlcyB0aGF0IExMTSBjbGllbnRzIHNvbWV0aW1lcyBlbWl0LlxuICAgICAqXG4gICAgICogVGhpcyB3YWxrcyB0aGUgaW5wdXQgY2hhcmFjdGVyIGJ5IGNoYXJhY3RlciBzbyB3ZSBvbmx5IHRvdWNoIHRva2Vuc1xuICAgICAqIHdoZXJlIHRoZSBmaXggaXMgdW5hbWJpZ3VvdXNseSBjb3JyZWN0LiBUaGUgcHJldmlvdXMgcmVnZXgtYmFzZWRcbiAgICAgKiB2ZXJzaW9uIGNvcnJ1cHRlZCB2YWxpZCBpbnB1dCAoZS5nLiBpdCB3b3VsZCByZXBsYWNlIHNpbmdsZSBxdW90ZXNcbiAgICAgKiBpbnNpZGUgc3RyaW5nIGxpdGVyYWxzIGFuZCBkb3VibGUtZXNjYXBlIGJhY2tzbGFzaGVzKS5cbiAgICAgKlxuICAgICAqIFJlcGFpcnMgYXBwbGllZDpcbiAgICAgKiAgLSBUcmFpbGluZyBjb21tYXMgYmVmb3JlIGB9YCBvciBgXWBcbiAgICAgKiAgLSBMaXRlcmFsIG5ld2xpbmUgLyBDUiAvIHRhYiBpbnNpZGUgc3RyaW5nIGxpdGVyYWxzIOKGkiBgXFxuYC9gXFxyYC9gXFx0YFxuICAgICAqICAtIEpTLXN0eWxlIHNpbmdsZS1xdW90ZWQgc3RyaW5ncyDihpIgZG91YmxlLXF1b3RlZCBzdHJpbmdzXG4gICAgICpcbiAgICAgKiBBbnl0aGluZyBlbHNlICh1bmJhbGFuY2VkIHF1b3RlcywgdW5lc2NhcGVkIGJhY2tzbGFzaGVzLCBjb21tZW50cylcbiAgICAgKiBpcyBsZWZ0IGFsb25lIHNvIHRoZSBjYWxsZXIncyBKU09OLnBhcnNlIGVycm9yIHN1cmZhY2VzIGhvbmVzdGx5LlxuICAgICAqL1xuICAgIHByaXZhdGUgZml4Q29tbW9uSnNvbklzc3Vlcyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBvdXQ6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgY29uc3QgbGVuID0ganNvblN0ci5sZW5ndGg7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IGNoID0ganNvblN0cltpXTtcblxuICAgICAgICAgICAgaWYgKGNoID09PSAnXCInIHx8IGNoID09PSBcIidcIikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHF1b3RlID0gY2g7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2goJ1wiJyk7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpIDwgbGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBqc29uU3RyW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSArIDEgPCBsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChjLCBqc29uU3RyW2kgKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChjKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gcXVvdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKCdcIicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXG4nKSB7IG91dC5wdXNoKCdcXFxcbicpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxyJykgeyBvdXQucHVzaCgnXFxcXHInKTsgaSsrOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcdCcpIHsgb3V0LnB1c2goJ1xcXFx0Jyk7IGkrKzsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHF1b3RlID09PSBcIidcIiAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCgnXFxcXFwiJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChjKTtcbiAgICAgICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGNoID09PSAnLCcpIHtcbiAgICAgICAgICAgICAgICBsZXQgaiA9IGkgKyAxO1xuICAgICAgICAgICAgICAgIHdoaWxlIChqIDwgbGVuICYmIC9cXHMvLnRlc3QoanNvblN0cltqXSkpIGorKztcbiAgICAgICAgICAgICAgICBpZiAoaiA8IGxlbiAmJiAoanNvblN0cltqXSA9PT0gJ30nIHx8IGpzb25TdHJbal0gPT09ICddJykpIHtcbiAgICAgICAgICAgICAgICAgICAgaSA9IGo7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3V0LnB1c2goY2gpO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0hUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgW19zZXNzaW9uSWQsIHN0cmVhbXNdIG9mIHRoaXMuc2Vzc2lvblN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtfc3RyZWFtSWQsIHN0cmVhbV0gb2Ygc3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vLW9wXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbX2lkLCBzdHJlYW1dIG9mIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm8tb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNsaWVudHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiAhIXRoaXMuaHR0cFNlcnZlcixcbiAgICAgICAgICAgIHBvcnQ6IHRoaXMuc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIGNsaWVudHM6IHRoaXMuY2xpZW50cy5zaXplXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgYm9keTogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IHRoaXMucmVhZFJlcXVlc3RCb2R5KHJlcSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQxMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyPy5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJyxcbiAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdG9vbCBuYW1lIGZyb20gcGF0aCBsaWtlIC9hcGkvdG9vbC9ub2RlX2xpZmVjeWNsZSBvciBsZWdhY3kgL2FwaS9ub2RlL2xpZmVjeWNsZVxuICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aG5hbWUuc3BsaXQoJy8nKS5maWx0ZXIocCA9PiBwKTtcbiAgICAgICAgICAgIGlmIChwYXRoUGFydHMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIEFQSSBwYXRoLiBVc2UgL2FwaS90b29sL3t0b29sX25hbWV9JyB9KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdXBwb3J0IGJvdGggL2FwaS90b29sL3tuYW1lfSBhbmQgbGVnYWN5IC9hcGkve2NhdGVnb3J5fS97bmFtZX1cbiAgICAgICAgICAgIGxldCBmdWxsVG9vbE5hbWU6IHN0cmluZztcbiAgICAgICAgICAgIGlmIChwYXRoUGFydHNbMV0gPT09ICd0b29sJykge1xuICAgICAgICAgICAgICAgIGZ1bGxUb29sTmFtZSA9IHBhdGhQYXJ0c1syXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnVsbFRvb2xOYW1lID0gYCR7cGF0aFBhcnRzWzFdfV8ke3BhdGhQYXJ0c1syXX1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgcGFyYW1zO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xuICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKGZ1bGxUb29sTmFtZSwgcGFyYW1zKTtcblxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0b29sOiBmdWxsVG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgU2ltcGxlIEFQSSBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIGNvbnN0IGlzUXVldWVGdWxsID0gZXJyb3IubWVzc2FnZSA9PT0gJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJztcbiAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoaXNRdWV1ZUZ1bGwgPyA0MjkgOiA1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZFJlcXVlc3RCb2R5KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHRvdGFsID0gMDtcblxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSBjaHVuay5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gTUNQU2VydmVyLk1BWF9SRVFVRVNUX0JPRFlfQllURVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUmVxdWVzdCBib2R5IGV4Y2VlZHMgJHtNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFU30gYnl0ZXNgKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3VsZFRyeUZpeEpzb24oYm9keTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghYm9keSB8fCBib2R5Lmxlbmd0aCA+IDI1NiAqIDEwMjQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9keS5pbmNsdWRlcygnXFwnJykgfHwgYm9keS5pbmNsdWRlcygnLH0nKSB8fCBib2R5LmluY2x1ZGVzKCcsXScpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcbicpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcdCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZW5xdWV1ZVRvb2xFeGVjdXRpb24odG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgaWYgKHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+PSBNQ1BTZXJ2ZXIuTUFYX1RPT0xfUVVFVUVfTEVOR1RIKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy50b29sUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgICAgcnVuOiAoKSA9PiB0aGlzLmV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZSwgYXJncyksXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk6IHZvaWQge1xuICAgICAgICB3aGlsZSAodGhpcy5hY3RpdmVUb29sQ291bnQgPCBNQ1BTZXJ2ZXIuTUFYX0NPTkNVUlJFTlRfVE9PTFMgJiYgdGhpcy50b29sUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHRoaXMudG9vbFF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAoIXRhc2spIGJyZWFrO1xuXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudCsrO1xuXG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRvb2wgZXhlY3V0aW9uIHRpbWVvdXQgKCR7TUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVN9bXMpYCkpLCBNQ1BTZXJ2ZXIuVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUHJvbWlzZS5yYWNlKFt0YXNrLnJ1bigpLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gdGFzay5yZXNvbHZlKHJlc3VsdCkpXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHRhc2sucmVqZWN0KGVycikpXG4gICAgICAgICAgICAgICAgLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNpbXBsaWZpZWRUb29sc0xpc3QoKTogYW55W10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubWFwKHRvb2wgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXRlZ29yeSBmcm9tIHRvb2wgbmFtZSAoZmlyc3Qgc2VnbWVudCBiZWZvcmUgXylcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbC5uYW1lLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgYXBpUGF0aDogYC9hcGkvdG9vbC8ke3Rvb2wubmFtZX1gLFxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2wubmFtZSwgdG9vbC5pbnB1dFNjaGVtYSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVDdXJsRXhhbXBsZShjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBzY2hlbWE6IGFueSk6IHN0cmluZyB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHNhbXBsZSBwYXJhbWV0ZXJzIGJhc2VkIG9uIHNjaGVtYVxuICAgICAgICBjb25zdCBzYW1wbGVQYXJhbXMgPSB0aGlzLmdlbmVyYXRlU2FtcGxlUGFyYW1zKHNjaGVtYSk7XG4gICAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShzYW1wbGVQYXJhbXMsIG51bGwsIDIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBjdXJsIC1YIFBPU1QgaHR0cDovLzEyNy4wLjAuMTo4NTg1L2FwaS8ke2NhdGVnb3J5fS8ke3Rvb2xOYW1lfSBcXFxcXG4gIC1IIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIgXFxcXFxuICAtZCAnJHtqc29uU3RyaW5nfSdgO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hOiBhbnkpOiBhbnkge1xuICAgICAgICBpZiAoIXNjaGVtYSB8fCAhc2NoZW1hLnByb3BlcnRpZXMpIHJldHVybiB7fTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbXBsZTogYW55ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcF0gb2YgT2JqZWN0LmVudHJpZXMoc2NoZW1hLnByb3BlcnRpZXMgYXMgYW55KSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcFNjaGVtYSA9IHByb3AgYXMgYW55O1xuICAgICAgICAgICAgc3dpdGNoIChwcm9wU2NoZW1hLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCAnZXhhbXBsZV9zdHJpbmcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCA0MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9ICdleGFtcGxlX3ZhbHVlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2FtcGxlO1xuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gSFRUUCB0cmFuc3BvcnQgZG9lc24ndCBuZWVkIHBlcnNpc3RlbnQgY29ubmVjdGlvbnNcbi8vIE1DUCBvdmVyIEhUVFAgdXNlcyByZXF1ZXN0LXJlc3BvbnNlIHBhdHRlcm5cbiJdfQ==