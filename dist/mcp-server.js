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
const crypto_1 = require("crypto");
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
        const streamId = (0, crypto_1.randomUUID)();
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
        const clientId = (0, crypto_1.randomUUID)();
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
        this.readRequestBody(req)
            .then(async (body) => {
            var _a, _b, _c;
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
                    const client = this.clients.get(sessionId);
                    if (client && !response.error) {
                        client.protocolVersion = protocolVersion;
                        client.initialized = true;
                        this.clients.set(sessionId, client);
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
        })
            .catch((error) => {
            const bodyErrorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: error.message || 'Request body too large'
                }
            };
            this.sendSSEEvent(stream, 'message', JSON.stringify(bodyErrorResponse));
            res.writeHead(202);
            res.end();
        });
    }
    sendSSEEvent(res, event, data) {
        res.write(`event: ${event}\n`);
        for (const line of data.split('\n')) {
            res.write(`data: ${line}\n`);
        }
        res.write('\n');
    }
    async handleMCPRequest(req, res) {
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
        this.readRequestBody(req)
            .then(async (body) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                    const sessionId = (0, crypto_1.randomUUID)();
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
MCPServer.LATEST_PROTOCOL_VERSION = '2025-06-18';
MCPServer.DEFAULT_PROTOCOL_VERSION = '2025-03-26';
MCPServer.LEGACY_PROTOCOL_VERSION = '2024-11-05';
MCPServer.SESSION_HEADER = 'Mcp-Session-Id';
MCPServer.PROTOCOL_HEADER = 'MCP-Protocol-Version';
MCPServer.SUPPORTED_PROTOCOL_VERSIONS = new Set([
    MCPServer.LATEST_PROTOCOL_VERSION,
    MCPServer.DEFAULT_PROTOCOL_VERSION,
    MCPServer.LEGACY_PROTOCOL_VERSION
]);
// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFDM0IsbUNBQW9DO0FBRXBDLHFDQUFrQztBQUNsQyxxREFBaUQ7QUFDakQsbURBQStDO0FBQy9DLDZEQUF5RDtBQUN6RCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUFpRDtBQUNqRCxpRUFBNkQ7QUFDN0QsdURBQW1EO0FBQ25ELDZEQUF5RDtBQUN6RCx1RUFBa0U7QUFDbEUsK0RBQTBEO0FBQzFELHlFQUFvRTtBQUNwRSx1RUFBa0U7QUFDbEUsK0RBQTJEO0FBQzNELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQsdURBQW1EO0FBQ25ELDZEQUF5RDtBQUN6RCwyREFBdUQ7QUFFdkQsTUFBYSxTQUFTO0lBZ0NsQixZQUFZLFFBQTJCO1FBZC9CLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLFlBQU8sR0FBMkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUM1QyxtQkFBYyxHQUFrRCxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzFFLHFCQUFnQixHQUFxQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQy9ELFVBQUssR0FBd0IsRUFBRSxDQUFDO1FBQ2hDLGNBQVMsR0FBcUIsRUFBRSxDQUFDO1FBQ2pDLGtCQUFhLEdBQTZDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDcEUsY0FBUyxHQUlaLEVBQUUsQ0FBQztRQUNBLG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBR3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLENBQUM7WUFDRCxlQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1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RyxzQkFBc0IsQUFBekIsQ0FBMEI7QUFDekMscUNBQTJCLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDMUQsU0FBUyxDQUFDLHVCQUF1QjtJQUNqQyxTQUFTLENBQUMsd0JBQXdCO0lBQ2xDLFNBQVMsQ0FBQyx1QkFBdUI7Q0FDcEMsQ0FBQyxBQUppRCxDQUloRDtBQXVzQ1AscURBQXFEO0FBQ3JELDhDQUE4QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCB7IHJhbmRvbVVVSUQgfSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MsIFNlcnZlclN0YXR1cywgTUNQQ2xpZW50LCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi90b29scy9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi90b29scy9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBQcm9qZWN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3Byb2plY3QtdG9vbHMnO1xuaW1wb3J0IHsgRGVidWdUb29scyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xuaW1wb3J0IHsgU2VydmVyVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlcnZlci10b29scyc7XG5pbXBvcnQgeyBCcm9hZGNhc3RUb29scyB9IGZyb20gJy4vdG9vbHMvYnJvYWRjYXN0LXRvb2xzJztcbmltcG9ydCB7IFNjZW5lQWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVWaWV3VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXZpZXctdG9vbHMnO1xuaW1wb3J0IHsgUmVmZXJlbmNlSW1hZ2VUb29scyB9IGZyb20gJy4vdG9vbHMvcmVmZXJlbmNlLWltYWdlLXRvb2xzJztcbmltcG9ydCB7IEFzc2V0QWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgVmFsaWRhdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy92YWxpZGF0aW9uLXRvb2xzJztcbmltcG9ydCB7IEJhdGNoVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2JhdGNoLXRvb2xzJztcbmltcG9ydCB7IFNlYXJjaFRvb2xzIH0gZnJvbSAnLi90b29scy9zZWFyY2gtdG9vbHMnO1xuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XG5pbXBvcnQgeyBBbmltYXRpb25Ub29scyB9IGZyb20gJy4vdG9vbHMvYW5pbWF0aW9uLXRvb2xzJztcbmltcG9ydCB7IE1hdGVyaWFsVG9vbHMgfSBmcm9tICcuL3Rvb2xzL21hdGVyaWFsLXRvb2xzJztcblxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1JFUVVFU1RfQk9EWV9CWVRFUyA9IDUgKiAxMDI0ICogMTAyNDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfVE9PTF9RVUVVRV9MRU5HVEggPSAxMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyA9IDYwXzAwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ09OQ1VSUkVOVF9UT09MUyA9IDU7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1BPUlRfUkVUUklFUyA9IDEwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IExBVEVTVF9QUk9UT0NPTF9WRVJTSU9OID0gJzIwMjUtMDYtMTgnO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTAzLTI2JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBMRUdBQ1lfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTRVNTSU9OX0hFQURFUiA9ICdNY3AtU2Vzc2lvbi1JZCc7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPVE9DT0xfSEVBREVSID0gJ01DUC1Qcm90b2NvbC1WZXJzaW9uJztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMgPSBuZXcgU2V0KFtcbiAgICAgICAgTUNQU2VydmVyLkxBVEVTVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuTEVHQUNZX1BST1RPQ09MX1ZFUlNJT05cbiAgICBdKTtcblxuICAgIHByaXZhdGUgc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzO1xuICAgIHByaXZhdGUgaHR0cFNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGNsaWVudHM6IE1hcDxzdHJpbmcsIE1DUENsaWVudD4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBzZXNzaW9uU3RyZWFtczogTWFwPHN0cmluZywgTWFwPHN0cmluZywgaHR0cC5TZXJ2ZXJSZXNwb25zZT4+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgbGVnYWN5U3NlU3RyZWFtczogTWFwPHN0cmluZywgaHR0cC5TZXJ2ZXJSZXNwb25zZT4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSB0b29sczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIHByaXZhdGUgdG9vbHNMaXN0OiBUb29sRGVmaW5pdGlvbltdID0gW107XG4gICAgcHJpdmF0ZSB0b29sRXhlY3V0b3JzOiBNYXA8c3RyaW5nLCAoYXJnczogYW55KSA9PiBQcm9taXNlPGFueT4+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgdG9vbFF1ZXVlOiBBcnJheTx7XG4gICAgICAgIHJ1bjogKCkgPT4gUHJvbWlzZTxhbnk+O1xuICAgICAgICByZXNvbHZlOiAodmFsdWU6IGFueSkgPT4gdm9pZDtcbiAgICAgICAgcmVqZWN0OiAocmVhc29uPzogYW55KSA9PiB2b2lkO1xuICAgIH0+ID0gW107XG4gICAgcHJpdmF0ZSBhY3RpdmVUb29sQ291bnQgPSAwO1xuXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVG9vbHMoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluaXRpYWxpemVUb29scygpOiB2b2lkIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdJbml0aWFsaXppbmcgdG9vbHMuLi4nKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmUgPSBuZXcgU2NlbmVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5ub2RlID0gbmV3IE5vZGVUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5jb21wb25lbnQgPSBuZXcgQ29tcG9uZW50VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmFiID0gbmV3IFByZWZhYlRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnByb2plY3QgPSBuZXcgUHJvamVjdFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmRlYnVnID0gbmV3IERlYnVnVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJlZmVyZW5jZXMgPSBuZXcgUHJlZmVyZW5jZXNUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zZXJ2ZXIgPSBuZXcgU2VydmVyVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYnJvYWRjYXN0ID0gbmV3IEJyb2FkY2FzdFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lQWR2YW5jZWQgPSBuZXcgU2NlbmVBZHZhbmNlZFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNjZW5lVmlldyA9IG5ldyBTY2VuZVZpZXdUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5yZWZlcmVuY2VJbWFnZSA9IG5ldyBSZWZlcmVuY2VJbWFnZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmFzc2V0QWR2YW5jZWQgPSBuZXcgQXNzZXRBZHZhbmNlZFRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnZhbGlkYXRpb24gPSBuZXcgVmFsaWRhdGlvblRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmJhdGNoID0gbmV3IEJhdGNoVG9vbHModGhpcy5leGVjdXRlVG9vbENhbGwuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNlYXJjaCA9IG5ldyBTZWFyY2hUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5lZGl0b3IgPSBuZXcgRWRpdG9yVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvblRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLm1hdGVyaWFsID0gbmV3IE1hdGVyaWFsVG9vbHMoKTtcbiAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKCdUb29scyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaW5pdGlhbGl6aW5nIHRvb2xzOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdTZXJ2ZXIgaXMgYWxyZWFkeSBydW5uaW5nJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcG9ydCA9IHRoaXMuc2V0dGluZ3MucG9ydDtcbiAgICAgICAgbGV0IGxhc3RFcnJvcjogYW55O1xuXG4gICAgICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDwgTUNQU2VydmVyLk1BWF9QT1JUX1JFVFJJRVM7IGF0dGVtcHQrKykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnRyeUxpc3Rlbihwb3J0KTtcbiAgICAgICAgICAgICAgICBpZiAocG9ydCAhPT0gdGhpcy5zZXR0aW5ncy5wb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBPcmlnaW5hbCBwb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSB3YXMgaW4gdXNlLCBib3VuZCB0byAke3BvcnR9IGluc3RlYWRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR0aW5ncy5wb3J0ID0gcG9ydDtcbiAgICAgICAgICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuc3VjY2VzcygnTUNQIFNlcnZlciBpcyByZWFkeSBmb3IgY29ubmVjdGlvbnMnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIGxhc3RFcnJvciA9IGVycjtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgUG9ydCAke3BvcnR9IGluIHVzZSwgdHJ5aW5nICR7cG9ydCArIDF9Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuZXJyb3IoYEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6ICR7bGFzdEVycm9yfWApO1xuICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB0cnlMaXN0ZW4ocG9ydDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IHNlcnZlcjtcbiAgICAgICAgICAgICAgICBsb2dnZXIuc3VjY2VzcyhgSFRUUCBzZXJ2ZXIgc3RhcnRlZCBvbiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgSGVhbHRoIGNoZWNrOiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0vaGVhbHRoYCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYE1DUCBlbmRwb2ludDogaHR0cDovLzEyNy4wLjAuMToke3BvcnR9L21jcGApO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc2VydmVyLm9uKCdlcnJvcicsIChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHNlcnZlci5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBUb29scygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcbiAgICAgICAgdGhpcy50b29sRXhlY3V0b3JzLmNsZWFyKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBbX2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRvb2xFeGVjdXRvcnMuc2V0KHRvb2wubmFtZSwgKGFyZ3M6IGFueSkgPT4gdG9vbFNldC5leGVjdXRlKHRvb2wubmFtZSwgYXJncykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbG9nZ2VyLmluZm8oYFNldHVwIHRvb2xzOiAke3RoaXMudG9vbHNMaXN0Lmxlbmd0aH0gdG9vbHMgYXZhaWxhYmxlYCk7XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIGV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCBleGVjdXRvciA9IHRoaXMudG9vbEV4ZWN1dG9ycy5nZXQodG9vbE5hbWUpO1xuICAgICAgICBpZiAoZXhlY3V0b3IpIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBleGVjdXRvcihhcmdzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiB0cnkgdG8gZmluZCB0aGUgdG9vbCBpbiBhbnkgZXhlY3V0b3JcbiAgICAgICAgZm9yIChjb25zdCBbX2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICBpZiAodG9vbHMuc29tZSgodDogYW55KSA9PiB0Lm5hbWUgPT09IHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0b29sU2V0LmV4ZWN1dGUodG9vbE5hbWUsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb29sICR7dG9vbE5hbWV9IG5vdCBmb3VuZGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDbGllbnRzKCk6IE1DUENsaWVudFtdIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jbGllbnRzLnZhbHVlcygpKTtcbiAgICB9XG4gICAgcHVibGljIGdldEF2YWlsYWJsZVRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3Q7XG4gICAgfVxuXG4gICAgcHVibGljIGdldFNldHRpbmdzKCk6IE1DUFNlcnZlclNldHRpbmdzIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3M7XG4gICAgfVxuXG4gICAgcHVibGljIGdldExvZ2dlcigpIHtcbiAgICAgICAgcmV0dXJuIGxvZ2dlcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwYXJzZWRVcmwgPSB1cmwucGFyc2UocmVxLnVybCB8fCAnJywgdHJ1ZSk7XG4gICAgICAgIGNvbnN0IHBhdGhuYW1lID0gcGFyc2VkVXJsLnBhdGhuYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IENPUlMgaGVhZGVyc1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgREVMRVRFLCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCBgQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9LCAke01DUFNlcnZlci5TRVNTSU9OX0hFQURFUn1gKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy52YWxpZGF0ZVJlcXVlc3RPcmlnaW4ocmVxLCByZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAocGF0aG5hbWUgPT09ICcvbWNwJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlTUNQVHJhbnNwb3J0UmVxdWVzdChyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL3NzZScgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNTRUNvbm5lY3Rpb24ocmVxLCByZXMpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9tZXNzYWdlcycgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTU0VNZXNzYWdlUmVxdWVzdChyZXEsIHJlcywgcGFyc2VkVXJsLnF1ZXJ5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvaGVhbHRoJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3RhdHVzOiAnb2snLCB0b29sczogdGhpcy50b29sc0xpc3QubGVuZ3RoIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWU/LnN0YXJ0c1dpdGgoJy9hcGkvJykgJiYgcmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcSwgcmVzLCBwYXRobmFtZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2FwaS90b29scycgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHRvb2xzOiB0aGlzLmdldFNpbXBsaWZpZWRUb29sc0xpc3QoKSB9KSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdOb3QgZm91bmQnIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgSFRUUCByZXF1ZXN0IGVycm9yOiAke2Vycm9yfWApO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlUmVxdWVzdE9yaWdpbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3Qgb3JpZ2luID0gdGhpcy5nZXRIZWFkZXIocmVxLCAnb3JpZ2luJyk7XG4gICAgICAgIGlmICghb3JpZ2luIHx8IG9yaWdpbiA9PT0gJ251bGwnKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmFsbG93ZWRPcmlnaW5zPy5pbmNsdWRlcygnKicpIHx8IHRoaXMuc2V0dGluZ3MuYWxsb3dlZE9yaWdpbnM/LmluY2x1ZGVzKG9yaWdpbikpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwob3JpZ2luKTtcbiAgICAgICAgICAgIGlmIChwYXJzZWQuaG9zdG5hbWUgPT09ICcxMjcuMC4wLjEnIHx8IHBhcnNlZC5ob3N0bmFtZSA9PT0gJ2xvY2FsaG9zdCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBmYWxsIHRocm91Z2hcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDAzKTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBgT3JpZ2luIG5vdCBhbGxvd2VkOiAke29yaWdpbn1gIH0pKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0SGVhZGVyKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIGhlYWRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gcmVxLmhlYWRlcnNbaGVhZGVyTmFtZS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSByZXR1cm4gdmFsdWVbMF07XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFjY2VwdHNDb250ZW50VHlwZShhY2NlcHRIZWFkZXI6IHN0cmluZywgcmVxdWlyZWRUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFhY2NlcHRIZWFkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBub3JtYWxpemVkID0gYWNjZXB0SGVhZGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVkLmluY2x1ZGVzKCcqLyonKSB8fCBub3JtYWxpemVkLmluY2x1ZGVzKHJlcXVpcmVkVHlwZS50b0xvd2VyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlTUNQUG9zdEhlYWRlcnMocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGFjY2VwdCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2FjY2VwdCcpIHx8ICcnO1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdCwgJ2FwcGxpY2F0aW9uL2pzb24nKSB8fCAhdGhpcy5hY2NlcHRzQ29udGVudFR5cGUoYWNjZXB0LCAndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDYpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUE9TVCAvbWNwIHJlcXVpcmVzIEFjY2VwdCBoZWFkZXIgY29udGFpbmluZyBib3RoIGFwcGxpY2F0aW9uL2pzb24gYW5kIHRleHQvZXZlbnQtc3RyZWFtJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gKHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2NvbnRlbnQtdHlwZScpIHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoIWNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDE1KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1BPU1QgL21jcCByZXF1aXJlcyBDb250ZW50LVR5cGU6IGFwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEhbWVzc2FnZSAmJiB0eXBlb2YgbWVzc2FnZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1lc3NhZ2UubWV0aG9kID09PSAnc3RyaW5nJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY05vdGlmaWNhdGlvbihtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNKc29uUnBjUmVxdWVzdE1lc3NhZ2UobWVzc2FnZSkgJiYgKG1lc3NhZ2UuaWQgPT09IHVuZGVmaW5lZCB8fCBtZXNzYWdlLmlkID09PSBudWxsKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY1Jlc3BvbnNlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCFtZXNzYWdlIHx8IHR5cGVvZiBtZXNzYWdlICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UubWV0aG9kID09PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAobWVzc2FnZS5pZCA9PT0gdW5kZWZpbmVkIHx8IG1lc3NhZ2UuaWQgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtZXNzYWdlLCAncmVzdWx0JykgfHwgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1lc3NhZ2UsICdlcnJvcicpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQVHJhbnNwb3J0UmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVNQ1BSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1BTdHJlYW1SZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnREVMRVRFJykge1xuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1BEZWxldGVTZXNzaW9uKHJlcSwgcmVzKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FsbG93JywgJ0dFVCwgUE9TVCwgREVMRVRFLCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoNDA1KTtcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWV0aG9kIG5vdCBhbGxvd2VkJyB9KSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1BTdHJlYW1SZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIHRydWUpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zdCBhY2NlcHQgPSB0aGlzLmdldEhlYWRlcihyZXEsICdhY2NlcHQnKSB8fCAnJztcbiAgICAgICAgaWYgKCF0aGlzLmFjY2VwdHNDb250ZW50VHlwZShhY2NlcHQsICd0ZXh0L2V2ZW50LXN0cmVhbScpKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNik7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdHRVQgL21jcCByZXF1aXJlcyBBY2NlcHQ6IHRleHQvZXZlbnQtc3RyZWFtJyB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzZXNzaW9uLmluaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGBTZXNzaW9uIGlzIG5vdCBpbml0aWFsaXplZDogJHtzZXNzaW9uLmlkfWAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR1cFNTRUhlYWRlcnMocmVzKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSLCBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIsIHNlc3Npb24uaWQpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtSWQgPSByYW5kb21VVUlEKCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25TdHJlYW1TZXQgPSB0aGlzLnNlc3Npb25TdHJlYW1zLmdldChzZXNzaW9uLmlkKSB8fCBuZXcgTWFwPHN0cmluZywgaHR0cC5TZXJ2ZXJSZXNwb25zZT4oKTtcbiAgICAgICAgc2Vzc2lvblN0cmVhbVNldC5zZXQoc3RyZWFtSWQsIHJlcyk7XG4gICAgICAgIHRoaXMuc2Vzc2lvblN0cmVhbXMuc2V0KHNlc3Npb24uaWQsIHNlc3Npb25TdHJlYW1TZXQpO1xuXG4gICAgICAgIHNlc3Npb24ubGFzdEFjdGl2aXR5ID0gbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uLmlkLCBzZXNzaW9uKTtcbiAgICAgICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuXG4gICAgICAgIHJlcS5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdHJlYW1zID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbXMpIHJldHVybjtcbiAgICAgICAgICAgIHN0cmVhbXMuZGVsZXRlKHN0cmVhbUlkKTtcbiAgICAgICAgICAgIGlmIChzdHJlYW1zLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLmRlbGV0ZShzZXNzaW9uLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1BEZWxldGVTZXNzaW9uKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIHRydWUpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zdCBzdHJlYW1zID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCk7XG4gICAgICAgIGlmIChzdHJlYW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtfc3RyZWFtSWQsIHN0cmVhbV0gb2Ygc3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vLW9wXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RyZWFtcy5kZWxldGUoc2Vzc2lvbi5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsaWVudHMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwU1NFSGVhZGVycyhyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvZXZlbnQtc3RyZWFtJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tY2FjaGUnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29ubmVjdGlvbicsICdrZWVwLWFsaXZlJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ1gtQWNjZWwtQnVmZmVyaW5nJywgJ25vJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBuZWdvdGlhdGVQcm90b2NvbFZlcnNpb24obWVzc2FnZVByb3RvY29sOiBhbnksIGhlYWRlclByb3RvY29sPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RlZCA9IHR5cGVvZiBtZXNzYWdlUHJvdG9jb2wgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IG1lc3NhZ2VQcm90b2NvbFxuICAgICAgICAgICAgOiAoaGVhZGVyUHJvdG9jb2wgfHwgTUNQU2VydmVyLkRFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTik7XG4gICAgICAgIGlmICghTUNQU2VydmVyLlNVUFBPUlRFRF9QUk9UT0NPTF9WRVJTSU9OUy5oYXMocmVxdWVzdGVkKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcXVlc3RlZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlU2Vzc2lvbkhlYWRlcihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHJlcXVpcmVkOiBib29sZWFuKTogTUNQQ2xpZW50IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgTUNQU2VydmVyLlNFU1NJT05fSEVBREVSKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uSWQpIHtcbiAgICAgICAgICAgIGlmIChyZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGBNaXNzaW5nIHJlcXVpcmVkIGhlYWRlcjogJHtNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVJ9YCB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLmNsaWVudHMuZ2V0KHNlc3Npb25JZCk7XG4gICAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBgU2Vzc2lvbiBub3QgZm91bmQ6ICR7c2Vzc2lvbklkfWAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVNTRUNvbm5lY3Rpb24ocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNsaWVudElkID0gcmFuZG9tVVVJRCgpO1xuICAgICAgICB0aGlzLnNldHVwU1NFSGVhZGVycyhyZXMpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG5cbiAgICAgICAgY29uc3QgY2xpZW50OiBNQ1BDbGllbnQgPSB7XG4gICAgICAgICAgICBpZDogY2xpZW50SWQsXG4gICAgICAgICAgICBsYXN0QWN0aXZpdHk6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB1c2VyQWdlbnQ6IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J11cbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5jbGllbnRzLnNldChjbGllbnRJZCwgY2xpZW50KTtcbiAgICAgICAgdGhpcy5sZWdhY3lTc2VTdHJlYW1zLnNldChjbGllbnRJZCwgcmVzKTtcblxuICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChyZXMsICdlbmRwb2ludCcsIGAvbWVzc2FnZXM/c2Vzc2lvbklkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGNsaWVudElkKX1gKTtcbiAgICAgICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuICAgICAgICBsb2dnZXIuaW5mbyhgU1NFIGNsaWVudCBjb25uZWN0ZWQ6ICR7Y2xpZW50SWR9YCk7XG5cbiAgICAgICAgcmVxLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5kZWxldGUoY2xpZW50SWQpO1xuICAgICAgICAgICAgdGhpcy5jbGllbnRzLmRlbGV0ZShjbGllbnRJZCk7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgU1NFIGNsaWVudCBkaXNjb25uZWN0ZWQ6ICR7Y2xpZW50SWR9YCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU1NFTWVzc2FnZVJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlLCBxdWVyeTogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHJhd1Nlc3Npb25JZCA9IHF1ZXJ5Py5zZXNzaW9uSWQ7XG4gICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IEFycmF5LmlzQXJyYXkocmF3U2Vzc2lvbklkKSA/IHJhd1Nlc3Npb25JZFswXSA6IHJhd1Nlc3Npb25JZDtcbiAgICAgICAgaWYgKCFzZXNzaW9uSWQgfHwgdHlwZW9mIHNlc3Npb25JZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcXVlcnkgcGFyYW1ldGVyOiBzZXNzaW9uSWQnIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IHRoaXMubGVnYWN5U3NlU3RyZWFtcy5nZXQoc2Vzc2lvbklkKTtcbiAgICAgICAgaWYgKCFzdHJlYW0pIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFNTRSBzZXNzaW9uIG5vdCBmb3VuZDogJHtzZXNzaW9uSWR9YCB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlOiBhbnk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVHJ5Rml4SnNvbihib2R5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9LiBPcmlnaW5hbCBib2R5OiAke2JvZHkuc3Vic3RyaW5nKDAsIDUwMCl9Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXhlZEJvZHkgPSB0aGlzLmZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpZW50ID0gdGhpcy5jbGllbnRzLmdldChzZXNzaW9uSWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQubGFzdEFjdGl2aXR5ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCBjbGllbnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNSZXF1ZXN0ID0gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNOb3RpZmljYXRpb24gPSB0aGlzLmlzSnNvblJwY05vdGlmaWNhdGlvbihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNJbml0aWFsaXplID0gaXNSZXF1ZXN0ICYmIG1lc3NhZ2UubWV0aG9kID09PSAnaW5pdGlhbGl6ZSc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0luaXRpYWxpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3RvY29sVmVyc2lvbiA9IHRoaXMubmVnb3RpYXRlUHJvdG9jb2xWZXJzaW9uKG1lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5zdXBwb3J0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFVuc3VwcG9ydGVkIHByb3RvY29sIHZlcnNpb246ICR7bWVzc2FnZT8ucGFyYW1zPy5wcm90b2NvbFZlcnNpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkodW5zdXBwb3J0ZWRSZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlLCB7IHByb3RvY29sVmVyc2lvbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuY2xpZW50cy5nZXQoc2Vzc2lvbklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQgJiYgIXJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50LnByb3RvY29sVmVyc2lvbiA9IHByb3RvY29sVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCBjbGllbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5tY3AoYFJlY2VpdmVkIFNTRSBub3RpZmljYXRpb246ICR7bWVzc2FnZS5tZXRob2R9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQoc3RyZWFtLCAnbWVzc2FnZScsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIFNTRSByZXF1ZXN0OiAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZUVycm9yUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI3MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkocGFyc2VFcnJvclJlc3BvbnNlKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvZHlFcnJvclJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmRTU0VFdmVudChzdHJlYW0sICdtZXNzYWdlJywgSlNPTi5zdHJpbmdpZnkoYm9keUVycm9yUmVzcG9uc2UpKTtcblxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNlbmRTU0VFdmVudChyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIGV2ZW50OiBzdHJpbmcsIGRhdGE6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICByZXMud3JpdGUoYGV2ZW50OiAke2V2ZW50fVxcbmApO1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YS5zcGxpdCgnXFxuJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZShgZGF0YTogJHtsaW5lfVxcbmApO1xuICAgICAgICB9XG4gICAgICAgIHJlcy53cml0ZSgnXFxuJyk7XG4gICAgfVxuICAgIFxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTUNQUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlTUNQUG9zdEhlYWRlcnMocmVxLCByZXMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoZWFkZXJQcm90b2NvbFZlcnNpb24gPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIpO1xuICAgICAgICBpZiAoaGVhZGVyUHJvdG9jb2xWZXJzaW9uICYmICFNQ1BTZXJ2ZXIuU1VQUE9SVEVEX1BST1RPQ09MX1ZFUlNJT05TLmhhcyhoZWFkZXJQcm90b2NvbFZlcnNpb24pKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9OiAke2hlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZWFkUmVxdWVzdEJvZHkocmVxKVxuICAgICAgICAgICAgLnRoZW4oYXN5bmMgKGJvZHkpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRW5oYW5jZWQgSlNPTiBwYXJzaW5nIHdpdGggYmV0dGVyIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IGFueTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9LiBPcmlnaW5hbCBib2R5OiAke2JvZHkuc3Vic3RyaW5nKDAsIDUwMCl9Li4uYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IGNvbW1vbiBKU09OIGlzc3Vlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaXhlZEJvZHkgPSB0aGlzLmZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSk7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeGVkQm9keSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaXNSZXF1ZXN0ID0gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc05vdGlmaWNhdGlvbiA9IHRoaXMuaXNKc29uUnBjTm90aWZpY2F0aW9uKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUmVzcG9uc2UgPSB0aGlzLmlzSnNvblJwY1Jlc3BvbnNlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzUmVxdWVzdCAmJiAhaXNSZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIEpTT04tUlBDIG1lc3NhZ2UnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGlzSW5pdGlhbGl6ZSA9IGlzUmVxdWVzdCAmJiBtZXNzYWdlLm1ldGhvZCA9PT0gJ2luaXRpYWxpemUnO1xuICAgICAgICAgICAgICAgIGlmIChpc0luaXRpYWxpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdTZXNzaW9uSWQgPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1Nlc3Npb25JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHtNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVJ9IG11c3Qgbm90IGJlIHNldCBvbiBpbml0aWFsaXplYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc05vdGlmaWNhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSW5pdGlhbGl6ZSBtdXN0IGJlIHNlbnQgYXMgYSBKU09OLVJQQyByZXF1ZXN0IHdpdGggYSBub24tbnVsbCBpZCdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm90b2NvbFZlcnNpb24gPSB0aGlzLm5lZ290aWF0ZVByb3RvY29sVmVyc2lvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyUHJvdG9jb2xWZXJzaW9uXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJvdG9jb2xWZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCBwcm90b2NvbCB2ZXJzaW9uOiAke21lc3NhZ2U/LnBhcmFtcz8ucHJvdG9jb2xWZXJzaW9uIHx8IGhlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbklkID0gcmFuZG9tVVVJRCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlLCB7IHByb3RvY29sVmVyc2lvbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSByZXNwb25zZS5lcnJvcj8uY29kZSA9PT0gLTMyMDI5O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHNlc3Npb25JZCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBzZXNzaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdEFjdGl2aXR5OiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJBZ2VudDogcmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIsIHNlc3Npb25JZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIsIHByb3RvY29sVmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNRdWV1ZUZ1bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDI5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIHRydWUpO1xuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbikgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbi5pbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTZXNzaW9uIGlzIG5vdCBpbml0aWFsaXplZDogJHtzZXNzaW9uLmlkfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdG9jb2xWZXJzaW9uID0gdGhpcy5uZWdvdGlhdGVQcm90b2NvbFZlcnNpb24oXG4gICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyUHJvdG9jb2xWZXJzaW9uIHx8IHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCBwcm90b2NvbCB2ZXJzaW9uOiAke2hlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChoZWFkZXJQcm90b2NvbFZlcnNpb24gJiYgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gJiYgaGVhZGVyUHJvdG9jb2xWZXJzaW9uICE9PSBzZXNzaW9uLnByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9IGRvZXMgbm90IG1hdGNoIGluaXRpYWxpemVkIHNlc3Npb24gdmVyc2lvbmBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5sYXN0QWN0aXZpdHkgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gPSBwcm90b2NvbFZlcnNpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbi5pZCwgc2Vzc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSLCBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBwcm90b2NvbFZlcnNpb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gTUNQIG5vdGlmaWNhdGlvbnMvcmVzcG9uc2VzIG11c3QgcmV0dXJuIDIwMiBBY2NlcHRlZCB3aGVuIGFjY2VwdGVkLlxuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5tY3AoJ1JlY2VpdmVkIGNsaWVudCBKU09OLVJQQyByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNOb3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLm1jcChgUmVjZWl2ZWQgbm90aWZpY2F0aW9uOiAke21lc3NhZ2UubWV0aG9kfWApO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHsgcHJvdG9jb2xWZXJzaW9uOiBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBwcm90b2NvbFZlcnNpb24gfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSByZXNwb25zZS5lcnJvcj8uY29kZSA9PT0gLTMyMDI5O1xuICAgICAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdSZXRyeS1BZnRlcicsICc1Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDI5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGhhbmRsaW5nIE1DUCByZXF1ZXN0OiAke2Vycm9yfWApO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goKGVycm9yOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDEzKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnUmVxdWVzdCBib2R5IHRvbyBsYXJnZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnksIGNvbnRleHQ/OiB7IHByb3RvY29sVmVyc2lvbj86IHN0cmluZyB9KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgeyBpZCwgbWV0aG9kLCBwYXJhbXMgfSA9IG1lc3NhZ2U7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ6IGFueTtcblxuICAgICAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd0b29scy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyB0b29sczogdGhpcy5nZXRBdmFpbGFibGVUb29scygpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2NhbGwnOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgbmFtZSwgYXJndW1lbnRzOiBhcmdzIH0gPSBwYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xSZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKG5hbWUsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkodG9vbFJlc3VsdCkgfV0gfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyByZXNvdXJjZXM6IHRoaXMuZ2V0UmVzb3VyY2VzTGlzdCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9yZWFkJzoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSBwYXJhbXM/LnVyaTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1cmkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IHVyaScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuaGFuZGxlUmVhZFJlc291cmNlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gTUNQIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogY29udGV4dD8ucHJvdG9jb2xWZXJzaW9uIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sczoge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uczogJ1lvdSBhcmUgY29ubmVjdGVkIHRvIGEgcnVubmluZyBDb2NvcyBDcmVhdG9yIGVkaXRvciB2aWEgTUNQLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQUxXQVlTIHVzZSBNQ1AgdG9vbHMgZm9yIEFOWSBDb2NvcyBDcmVhdG9yIG9wZXJhdGlvbiDigJQgaW5jbHVkaW5nIHNjZW5lLCBub2RlLCBjb21wb25lbnQsIHByZWZhYiwgYXNzZXQsIHByb2plY3QsIGFuZCBlZGl0b3IgdGFza3MuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdORVZFUiBkaXJlY3RseSBlZGl0IC5zY2VuZSwgLnByZWZhYiwgLm1ldGEsIG9yIG90aGVyIENvY29zIENyZWF0b3IgZGF0YSBmaWxlcy4gVGhlc2UgZmlsZXMgaGF2ZSBjb21wbGV4IGludGVybmFsIGZvcm1hdHMgKFVVSURzLCByZWZlcmVuY2VzLCBpbmRpY2VzKSB0aGF0IGJyZWFrIGVhc2lseSB3aGVuIGVkaXRlZCBtYW51YWxseSwgYW5kIGRpcmVjdCBlZGl0cyB3aWxsIGJlIG91dCBvZiBzeW5jIHdpdGggdGhlIHJ1bm5pbmcgZWRpdG9yLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVGhlIE9OTFkgZmlsZXMgeW91IHNob3VsZCBlZGl0IGRpcmVjdGx5IGFyZSBUeXBlU2NyaXB0L0phdmFTY3JpcHQgc291cmNlIGNvZGUgZmlsZXMgKC50cywgLmpzKSBzdWNoIGFzIGdhbWUgc2NyaXB0cyBhbmQgY29tcG9uZW50cy4gRm9yIGV2ZXJ5dGhpbmcgZWxzZSwgdXNlIE1DUCB0b29scy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1doZW4gdGhlIHVzZXIgYXNrcyBhYm91dCBDb2NvcyBDcmVhdG9yIGdhbWUgZGV2ZWxvcG1lbnQsIGFsd2F5cyBxdWVyeSB0aGUgZWRpdG9yIGZvciByZWFsLXRpbWUgZGF0YSAoc2NlbmUgdHJlZSwgbm9kZSBwcm9wZXJ0aWVzLCBhc3NldCBsaXN0cykgaW5zdGVhZCBvZiBndWVzc2luZy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FsbCB0b29scyB1c2UgYW4gXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc3BlY2lmeSB0aGUgb3BlcmF0aW9uLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTUNQIFJlc291cmNlcyBhdmFpbGFibGU6IGNvY29zOi8vaGllcmFyY2h5IChzY2VuZSB0cmVlKSwgY29jb3M6Ly9zZWxlY3Rpb24gKGN1cnJlbnQgc2VsZWN0aW9uKSwgY29jb3M6Ly9sb2dzL2xhdGVzdCAoc2VydmVyIGxvZ3MpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGJhdGNoX2V4ZWN1dGUgdG8gcnVuIG11bHRpcGxlIG9wZXJhdGlvbnMgaW4gb25lIGNhbGwgZm9yIGVmZmljaWVuY3kuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdLZXkgdG9vbHM6IHNjZW5lX21hbmFnZW1lbnQgKGFjdGlvbjogZ2V0X2N1cnJlbnQvZ2V0X2xpc3Qvb3Blbi9zYXZlL2NyZWF0ZS9jbG9zZS9nZXRfaGllcmFyY2h5KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZmluZF9ieV9wYXR0ZXJuL2ZpbmRfYnlfbmFtZS9nZXRfYWxsL2RldGVjdF90eXBlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfbGlmZWN5Y2xlIChhY3Rpb246IGNyZWF0ZS9kZWxldGUvZHVwbGljYXRlL21vdmUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZV90cmFuc2Zvcm0gKGFjdGlvbjogc2V0X3RyYW5zZm9ybS9zZXRfcHJvcGVydHkpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X21hbmFnZSAoYWN0aW9uOiBhZGQvcmVtb3ZlL2F0dGFjaF9zY3JpcHQpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X3F1ZXJ5IChhY3Rpb246IGdldF9hbGwvZ2V0X2luZm8vZ2V0X2F2YWlsYWJsZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXRfY29tcG9uZW50X3Byb3BlcnR5IChtb2RpZnkgY29tcG9uZW50IHByb3BlcnRpZXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmFiX2xpZmVjeWNsZSAoYWN0aW9uOiBjcmVhdGUvaW5zdGFudGlhdGUvdXBkYXRlL2R1cGxpY2F0ZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwcmVmYWJfcXVlcnkgKGFjdGlvbjogZ2V0X2xpc3QvbG9hZC9nZXRfaW5mby92YWxpZGF0ZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldF9xdWVyeSAoYWN0aW9uOiBnZXRfaW5mby9nZXRfYXNzZXRzL2ZpbmRfYnlfbmFtZS9nZXRfZGV0YWlscy9xdWVyeV9wYXRoL3F1ZXJ5X3V1aWQvcXVlcnlfdXJsKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Fzc2V0X2NydWQgKGFjdGlvbjogY3JlYXRlL2NvcHkvbW92ZS9kZWxldGUvc2F2ZS9yZWltcG9ydC9pbXBvcnQvcmVmcmVzaCksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdwcm9qZWN0X2J1aWxkIChhY3Rpb246IHJ1bi9idWlsZC9nZXRfYnVpbGRfc2V0dGluZ3Mvb3Blbl9idWlsZF9wYW5lbC9jaGVja19idWlsZGVyX3N0YXR1cyksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkZWJ1Z19jb25zb2xlIChhY3Rpb246IGdldF9sb2dzL2NsZWFyL2V4ZWN1dGVfc2NyaXB0KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2JhdGNoX2V4ZWN1dGUgKHJ1biBtdWx0aXBsZSBvcGVyYXRpb25zIHNlcXVlbnRpYWxseSBpbiBvbmUgY2FsbCkuJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogZXJyb3IubWVzc2FnZSA9PT0gJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyA/IC0zMjAyOSA6IC0zMjYwMyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gTUNQIFJlc291cmNlcyAtLS1cblxuICAgIHByaXZhdGUgZ2V0UmVzb3VyY2VzTGlzdCgpOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJpOiAnY29jb3M6Ly9oaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTY2VuZSBIaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudCBzY2VuZSBub2RlIHRyZWUgc3RydWN0dXJlIChyZWFkLW9ubHkgc25hcHNob3QpJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vc2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnQ3VycmVudCBTZWxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudGx5IHNlbGVjdGVkIG5vZGVzL2Fzc2V0cyBpbiB0aGUgZWRpdG9yJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vbG9ncy9sYXRlc3QnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTZXJ2ZXIgTG9ncycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWNlbnQgTUNQIHNlcnZlciBsb2cgZW50cmllcycsXG4gICAgICAgICAgICAgICAgbWltZVR5cGU6ICd0ZXh0L3BsYWluJ1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUmVhZFJlc291cmNlKHVyaTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgbGV0IHBhcnNlZFVyaTogVVJMO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyc2VkVXJpID0gbmV3IFVSTCh1cmkpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZXNvdXJjZSBVUkk6ICR7dXJpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcnNlZFVyaS5wcm90b2NvbCAhPT0gJ2NvY29zOicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvdG9jb2w6ICR7cGFyc2VkVXJpLnByb3RvY29sfS4gRXhwZWN0ZWQgXCJjb2NvczpcImApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzb3VyY2VQYXRoID0gcGFyc2VkVXJpLmhvc3RuYW1lICsgcGFyc2VkVXJpLnBhdGhuYW1lO1xuXG4gICAgICAgIHN3aXRjaCAocmVzb3VyY2VQYXRoKSB7XG4gICAgICAgICAgICBjYXNlICdoaWVyYXJjaHknOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgICAgIGlmICghdHJlZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm8gc2NlbmUgbG9hZGVkJyB9KSB9XSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSB0aGlzLmJ1aWxkUmVzb3VyY2VIaWVyYXJjaHkodHJlZSwgMCwgMTAsIDUwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShoaWVyYXJjaHksIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdzZWxlY3Rpb24nOiB7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yLlNlbGVjdGlvbiBpcyBhIHN5bmNocm9ub3VzIEFQSSBpbiBDb2NvcyBDcmVhdG9yIDMuOC54XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWROb2RlcyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ25vZGUnKSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEFzc2V0cyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ2Fzc2V0JykgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXM6IHNlbGVjdGVkTm9kZXMsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0czogc2VsZWN0ZWRBc3NldHNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsIHRleHQ6IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdsb2dzL2xhdGVzdCc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gbG9nZ2VyLmdldExvZ0NvbnRlbnQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLCB0ZXh0OiBsb2dDb250ZW50IHx8ICcobm8gbG9ncyB5ZXQpJyB9XSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcmVzb3VyY2U6ICR7dXJpfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZFJlc291cmNlSGllcmFyY2h5KG5vZGU6IGFueSwgZGVwdGg6IG51bWJlciwgbWF4RGVwdGg6IG51bWJlciwgbWF4Q2hpbGRyZW46IG51bWJlcik6IGFueSB7XG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuID8gbm9kZS5jaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICAgICAgaWYgKGNoaWxkQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IGBbJHtjaGlsZENvdW50fSBjaGlsZHJlbiwgZGVwdGggbGltaXQgcmVhY2hlZF1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgY29uc3QgdG90YWwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHNsaWNlID0gbm9kZS5jaGlsZHJlbi5zbGljZSgwLCBtYXhDaGlsZHJlbik7XG4gICAgICAgICAgICBpbmZvLmNoaWxkcmVuID0gc2xpY2UubWFwKChjOiBhbnkpID0+IHRoaXMuYnVpbGRSZXNvdXJjZUhpZXJhcmNoeShjLCBkZXB0aCArIDEsIG1heERlcHRoLCBtYXhDaGlsZHJlbikpO1xuICAgICAgICAgICAgaWYgKHRvdGFsID4gbWF4Q2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNoaWxkcmVuVHJ1bmNhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbmZvLnRvdGFsQ2hpbGRyZW4gPSB0b3RhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIHByaXZhdGUgZml4Q29tbW9uSnNvbklzc3Vlcyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xuICAgICAgICBcbiAgICAgICAgLy8gRml4IGNvbW1vbiBlc2NhcGUgY2hhcmFjdGVyIGlzc3Vlc1xuICAgICAgICBmaXhlZCA9IGZpeGVkXG4gICAgICAgICAgICAvLyBGaXggdW5lc2NhcGVkIHF1b3RlcyBpbiBzdHJpbmdzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFteXFxcXF0pXCIoW15cIl0qW15cXFxcXSlcIihbXix9XFxdOl0pL2csICckMVxcXFxcIiQyXFxcXFwiJDMnKVxuICAgICAgICAgICAgLy8gRml4IHVuZXNjYXBlZCBiYWNrc2xhc2hlc1xuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVxcXFwoW15cIlxcXFxcXC9iZm5ydF0pL2csICckMVxcXFxcXFxcJDInKVxuICAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hc1xuICAgICAgICAgICAgLnJlcGxhY2UoLywoXFxzKlt9XFxdXSkvZywgJyQxJylcbiAgICAgICAgICAgIC8vIEZpeCBzaW5nbGUgcXVvdGVzIChzaG91bGQgYmUgZG91YmxlIHF1b3RlcylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICdcIicpXG4gICAgICAgICAgICAvLyBGaXggY29tbW9uIGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBmaXhlZDtcbiAgICB9XG5cbiAgICBwdWJsaWMgc3RvcCgpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0hUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgW19zZXNzaW9uSWQsIHN0cmVhbXNdIG9mIHRoaXMuc2Vzc2lvblN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtfc3RyZWFtSWQsIHN0cmVhbV0gb2Ygc3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vLW9wXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBbX2lkLCBzdHJlYW1dIG9mIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gbm8tb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLmNsZWFyKCk7XG4gICAgICAgIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmNsaWVudHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiAhIXRoaXMuaHR0cFNlcnZlcixcbiAgICAgICAgICAgIHBvcnQ6IHRoaXMuc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIGNsaWVudHM6IHRoaXMuY2xpZW50cy5zaXplXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpXG4gICAgICAgICAgICAudGhlbihhc3luYyAoYm9keSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHRvb2wgbmFtZSBmcm9tIHBhdGggbGlrZSAvYXBpL3Rvb2wvbm9kZV9saWZlY3ljbGUgb3IgbGVnYWN5IC9hcGkvbm9kZS9saWZlY3ljbGVcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRobmFtZS5zcGxpdCgnLycpLmZpbHRlcihwID0+IHApO1xuICAgICAgICAgICAgICAgIGlmIChwYXRoUGFydHMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgQVBJIHBhdGguIFVzZSAvYXBpL3Rvb2wve3Rvb2xfbmFtZX0nIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgYm90aCAvYXBpL3Rvb2wve25hbWV9IGFuZCBsZWdhY3kgL2FwaS97Y2F0ZWdvcnl9L3tuYW1lfVxuICAgICAgICAgICAgICAgIGxldCBmdWxsVG9vbE5hbWU6IHN0cmluZztcbiAgICAgICAgICAgICAgICBpZiAocGF0aFBhcnRzWzFdID09PSAndG9vbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZnVsbFRvb2xOYW1lID0gcGF0aFBhcnRzWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bGxUb29sTmFtZSA9IGAke3BhdGhQYXJ0c1sxXX1fJHtwYXRoUGFydHNbMl19YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUGFyc2UgcGFyYW1ldGVycyB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXG4gICAgICAgICAgICAgICAgbGV0IHBhcmFtcztcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBwYXJhbXMgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvdWxkVHJ5Rml4SnNvbihib2R5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IEpTT04gaXNzdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkQm9keSA9IHRoaXMuZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoc2Vjb25kRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjZWl2ZWRCb2R5OiBib2R5LnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRXhlY3V0ZSB0b29sXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5lbnF1ZXVlVG9vbEV4ZWN1dGlvbihmdWxsVG9vbE5hbWUsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0b29sOiBmdWxsVG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgU2ltcGxlIEFQSSBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1F1ZXVlRnVsbCA9IGVycm9yLm1lc3NhZ2UgPT09ICdUb29sIHF1ZXVlIGlzIGZ1bGwsIHBsZWFzZSByZXRyeSBsYXRlcic7XG4gICAgICAgICAgICAgICAgaWYgKGlzUXVldWVGdWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZChpc1F1ZXVlRnVsbCA/IDQyOSA6IDUwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4ge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTMpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgJ1JlcXVlc3QgYm9keSB0b28gbGFyZ2UnLFxuICAgICAgICAgICAgICAgIHRvb2w6IHBhdGhuYW1lXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZFJlcXVlc3RCb2R5KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHRvdGFsID0gMDtcblxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSBjaHVuay5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gTUNQU2VydmVyLk1BWF9SRVFVRVNUX0JPRFlfQllURVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUmVxdWVzdCBib2R5IGV4Y2VlZHMgJHtNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFU30gYnl0ZXNgKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3VsZFRyeUZpeEpzb24oYm9keTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghYm9keSB8fCBib2R5Lmxlbmd0aCA+IDI1NiAqIDEwMjQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9keS5pbmNsdWRlcygnXFwnJykgfHwgYm9keS5pbmNsdWRlcygnLH0nKSB8fCBib2R5LmluY2x1ZGVzKCcsXScpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcbicpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcdCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZW5xdWV1ZVRvb2xFeGVjdXRpb24odG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgaWYgKHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+PSBNQ1BTZXJ2ZXIuTUFYX1RPT0xfUVVFVUVfTEVOR1RIKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy50b29sUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgICAgcnVuOiAoKSA9PiB0aGlzLmV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZSwgYXJncyksXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk6IHZvaWQge1xuICAgICAgICB3aGlsZSAodGhpcy5hY3RpdmVUb29sQ291bnQgPCBNQ1BTZXJ2ZXIuTUFYX0NPTkNVUlJFTlRfVE9PTFMgJiYgdGhpcy50b29sUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHRoaXMudG9vbFF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAoIXRhc2spIGJyZWFrO1xuXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudCsrO1xuXG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRvb2wgZXhlY3V0aW9uIHRpbWVvdXQgKCR7TUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVN9bXMpYCkpLCBNQ1BTZXJ2ZXIuVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUHJvbWlzZS5yYWNlKFt0YXNrLnJ1bigpLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gdGFzay5yZXNvbHZlKHJlc3VsdCkpXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHRhc2sucmVqZWN0KGVycikpXG4gICAgICAgICAgICAgICAgLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNpbXBsaWZpZWRUb29sc0xpc3QoKTogYW55W10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubWFwKHRvb2wgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXRlZ29yeSBmcm9tIHRvb2wgbmFtZSAoZmlyc3Qgc2VnbWVudCBiZWZvcmUgXylcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbC5uYW1lLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgYXBpUGF0aDogYC9hcGkvdG9vbC8ke3Rvb2wubmFtZX1gLFxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2wubmFtZSwgdG9vbC5pbnB1dFNjaGVtYSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVDdXJsRXhhbXBsZShjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBzY2hlbWE6IGFueSk6IHN0cmluZyB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHNhbXBsZSBwYXJhbWV0ZXJzIGJhc2VkIG9uIHNjaGVtYVxuICAgICAgICBjb25zdCBzYW1wbGVQYXJhbXMgPSB0aGlzLmdlbmVyYXRlU2FtcGxlUGFyYW1zKHNjaGVtYSk7XG4gICAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShzYW1wbGVQYXJhbXMsIG51bGwsIDIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBjdXJsIC1YIFBPU1QgaHR0cDovLzEyNy4wLjAuMTo4NTg1L2FwaS8ke2NhdGVnb3J5fS8ke3Rvb2xOYW1lfSBcXFxcXG4gIC1IIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIgXFxcXFxuICAtZCAnJHtqc29uU3RyaW5nfSdgO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hOiBhbnkpOiBhbnkge1xuICAgICAgICBpZiAoIXNjaGVtYSB8fCAhc2NoZW1hLnByb3BlcnRpZXMpIHJldHVybiB7fTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbXBsZTogYW55ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcF0gb2YgT2JqZWN0LmVudHJpZXMoc2NoZW1hLnByb3BlcnRpZXMgYXMgYW55KSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcFNjaGVtYSA9IHByb3AgYXMgYW55O1xuICAgICAgICAgICAgc3dpdGNoIChwcm9wU2NoZW1hLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCAnZXhhbXBsZV9zdHJpbmcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCA0MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9ICdleGFtcGxlX3ZhbHVlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2FtcGxlO1xuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gSFRUUCB0cmFuc3BvcnQgZG9lc24ndCBuZWVkIHBlcnNpc3RlbnQgY29ubmVjdGlvbnNcbi8vIE1DUCBvdmVyIEhUVFAgdXNlcyByZXF1ZXN0LXJlc3BvbnNlIHBhdHRlcm5cbiJdfQ==