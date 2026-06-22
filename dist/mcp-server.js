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
const scene_advanced_tools_1 = require("./tools/scene-advanced-tools");
const asset_advanced_tools_1 = require("./tools/asset-advanced-tools");
const batch_tools_1 = require("./tools/batch-tools");
const editor_tools_1 = require("./tools/editor-tools");
const material_tools_1 = require("./tools/material-tools");
const ui_builder_tools_1 = require("./tools/ui-builder-tools");
const scene_capture_tools_1 = require("./tools/scene-capture-tools");
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
        this.serverInstanceId = crypto.randomUUID();
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
        const streamId = crypto.randomUUID();
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
        const clientId = crypto.randomUUID();
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
                    const sessionId = crypto.randomUUID();
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
                            version: '1.0.0',
                            instanceId: this.serverInstanceId
                        },
                        instructions: 'You are connected to a running Cocos Creator editor via MCP. ' +
                            'Always inspect the current scene/prefab structure before making modifications, and query real-time editor data instead of guessing. ' +
                            'Always use MCP/editor APIs for scene, node, component, prefab, asset, project, and editor operations. ' +
                            'Do not directly edit serialized Cocos files (.scene, .prefab, .meta, and related data files) for structural changes (adding/removing nodes or components, modifying __id__/UUID/array references); always use MCP/editor APIs for these. ' +
                            'Exception: bulk find-replace of a single identifier value (e.g., renaming a __type__ CID or an enum string) is allowed via direct text edit when no MCP tool covers it, provided no JSON structure is changed and the working tree is committed beforehand. ' +
                            'TypeScript/JavaScript source files (.ts, .js) can always be edited directly. ' +
                            'All tools use an "action" parameter to specify operations. ' +
                            'After creating or restructuring UI nodes, apply responsive defaults (anchors, widget constraints, and layout), and prefer ui_apply_responsive_defaults immediately for consistency. ' +
                            'Prefer reusable prefab edits at the prefab asset source level; use scene-local overrides only when necessary. ' +
                            'For any composite UI (popups, dialogs, panels, list items, cards, HUD widgets, etc.), do NOT assemble the tree from scratch via chained node_lifecycle.create calls. First locate an existing prefab template in this project (prefab_query.get_list, or asset_query.find_by_name with assetType="prefab"), then use prefab_lifecycle.instantiate and override properties via set_component_property. Build-from-scratch is only acceptable for trivial wrappers (≤3 children, no layout components). If no template fits, use ui_build_from_spec with a declarative UISpec — sketch the spec plus an ASCII tree preview, get user confirmation, then call the tool once; do not chain node_lifecycle/component_manage/set_component_property for new composite UI. ' +
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
                            'project_build (action: get_build_settings/open_build_panel/check_builder_status), ' +
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
        var _a, _b;
        for (const [_sessionId, streams] of this.sessionStreams.entries()) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                }
                catch (_c) {
                    // no-op
                }
            }
        }
        for (const [_id, stream] of this.legacySseStreams.entries()) {
            try {
                stream.end();
            }
            catch (_d) {
                // no-op
            }
        }
        this.sessionStreams.clear();
        this.legacySseStreams.clear();
        this.clients.clear();
        if (this.httpServer) {
            try {
                (_b = (_a = this.httpServer).closeAllConnections) === null || _b === void 0 ? void 0 : _b.call(_a);
            }
            catch (_e) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFFM0IscUNBQWtDO0FBQ2xDLHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHVEQUFtRDtBQUNuRCx5REFBcUQ7QUFDckQscURBQWlEO0FBQ2pELGlFQUE2RDtBQUM3RCx1REFBbUQ7QUFDbkQsdUVBQWtFO0FBQ2xFLHVFQUFrRTtBQUNsRSxxREFBaUQ7QUFDakQsdURBQW1EO0FBQ25ELDJEQUF1RDtBQUN2RCwrREFBMEQ7QUFDMUQscUVBQWdFO0FBRWhFLE1BQWEsU0FBUztJQW1DbEIsWUFBWSxRQUEyQjtRQWYvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUN0QyxZQUFPLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUMsbUJBQWMsR0FBa0QsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMxRSxxQkFBZ0IsR0FBcUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUMvRCxVQUFLLEdBQXdCLEVBQUUsQ0FBQztRQUNoQyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxrQkFBYSxHQUE2QyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXBFLGNBQVMsR0FJWixFQUFFLENBQUM7UUFDQSxvQkFBZSxHQUFHLENBQUMsQ0FBQztRQUd4QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRU8sZUFBZTtRQUNuQixJQUFJLENBQUM7WUFDRCxlQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7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QUFxRDtBQUNyRCw4Q0FBOEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXJTZXR0aW5ncywgU2VydmVyU3RhdHVzLCBNQ1BDbGllbnQsIFRvb2xEZWZpbml0aW9uIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5pbXBvcnQgeyBTY2VuZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS10b29scyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XG5pbXBvcnQgeyBEZWJ1Z1Rvb2xzIH0gZnJvbSAnLi90b29scy9kZWJ1Zy10b29scyc7XG5pbXBvcnQgeyBQcmVmZXJlbmNlc1Rvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmZXJlbmNlcy10b29scyc7XG5pbXBvcnQgeyBTZXJ2ZXJUb29scyB9IGZyb20gJy4vdG9vbHMvc2VydmVyLXRvb2xzJztcbmltcG9ydCB7IFNjZW5lQWR2YW5jZWRUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMnO1xuaW1wb3J0IHsgQXNzZXRBZHZhbmNlZFRvb2xzIH0gZnJvbSAnLi90b29scy9hc3NldC1hZHZhbmNlZC10b29scyc7XG5pbXBvcnQgeyBCYXRjaFRvb2xzIH0gZnJvbSAnLi90b29scy9iYXRjaC10b29scyc7XG5pbXBvcnQgeyBFZGl0b3JUb29scyB9IGZyb20gJy4vdG9vbHMvZWRpdG9yLXRvb2xzJztcbmltcG9ydCB7IE1hdGVyaWFsVG9vbHMgfSBmcm9tICcuL3Rvb2xzL21hdGVyaWFsLXRvb2xzJztcbmltcG9ydCB7IFVJQnVpbGRlclRvb2xzIH0gZnJvbSAnLi90b29scy91aS1idWlsZGVyLXRvb2xzJztcbmltcG9ydCB7IFNjZW5lQ2FwdHVyZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS1jYXB0dXJlLXRvb2xzJztcblxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1JFUVVFU1RfQk9EWV9CWVRFUyA9IDUgKiAxMDI0ICogMTAyNDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfVE9PTF9RVUVVRV9MRU5HVEggPSAxMDA7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyA9IDYwXzAwMDtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfQ09OQ1VSUkVOVF9UT09MUyA9IDU7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgTUFYX1BPUlRfUkVUUklFUyA9IDEwO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IExBVEVTVF9QUk9UT0NPTF9WRVJTSU9OID0gJzIwMjUtMTEtMjUnO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IERFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTA2LTE4JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBMRUdBQ1lfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI1LTAzLTI2JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBPTERFU1RfUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTRVNTSU9OX0hFQURFUiA9ICdNY3AtU2Vzc2lvbi1JZCc7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPVE9DT0xfSEVBREVSID0gJ01DUC1Qcm90b2NvbC1WZXJzaW9uJztcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBTVVBQT1JURURfUFJPVE9DT0xfVkVSU0lPTlMgPSBuZXcgU2V0KFtcbiAgICAgICAgTUNQU2VydmVyLkxBVEVTVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuREVGQVVMVF9QUk9UT0NPTF9WRVJTSU9OLFxuICAgICAgICBNQ1BTZXJ2ZXIuTEVHQUNZX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgIE1DUFNlcnZlci5PTERFU1RfUFJPVE9DT0xfVkVSU0lPTlxuICAgIF0pO1xuXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xuICAgIHByaXZhdGUgY2xpZW50czogTWFwPHN0cmluZywgTUNQQ2xpZW50PiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHNlc3Npb25TdHJlYW1zOiBNYXA8c3RyaW5nLCBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBsZWdhY3lTc2VTdHJlYW1zOiBNYXA8c3RyaW5nLCBodHRwLlNlcnZlclJlc3BvbnNlPiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcbiAgICBwcml2YXRlIHRvb2xFeGVjdXRvcnM6IE1hcDxzdHJpbmcsIChhcmdzOiBhbnkpID0+IFByb21pc2U8YW55Pj4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBzZXJ2ZXJJbnN0YW5jZUlkOiBzdHJpbmc7XG4gICAgcHJpdmF0ZSB0b29sUXVldWU6IEFycmF5PHtcbiAgICAgICAgcnVuOiAoKSA9PiBQcm9taXNlPGFueT47XG4gICAgICAgIHJlc29sdmU6ICh2YWx1ZTogYW55KSA9PiB2b2lkO1xuICAgICAgICByZWplY3Q6IChyZWFzb24/OiBhbnkpID0+IHZvaWQ7XG4gICAgfT4gPSBbXTtcbiAgICBwcml2YXRlIGFjdGl2ZVRvb2xDb3VudCA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLnNlcnZlckluc3RhbmNlSWQgPSBjcnlwdG8ucmFuZG9tVVVJRCgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29scygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZVRvb2xzKCk6IHZvaWQge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0luaXRpYWxpemluZyB0b29scy4uLicpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZSA9IG5ldyBTY2VuZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLm5vZGUgPSBuZXcgTm9kZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmYWIgPSBuZXcgUHJlZmFiVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJvamVjdCA9IG5ldyBQcm9qZWN0VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZGVidWcgPSBuZXcgRGVidWdUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmZXJlbmNlcyA9IG5ldyBQcmVmZXJlbmNlc1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNlcnZlciA9IG5ldyBTZXJ2ZXJUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZUFkdmFuY2VkID0gbmV3IFNjZW5lQWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5hc3NldEFkdmFuY2VkID0gbmV3IEFzc2V0QWR2YW5jZWRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5iYXRjaCA9IG5ldyBCYXRjaFRvb2xzKHRoaXMuZXhlY3V0ZVRvb2xDYWxsLmJpbmQodGhpcykpO1xuICAgICAgICAgICAgdGhpcy50b29scy5lZGl0b3IgPSBuZXcgRWRpdG9yVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMubWF0ZXJpYWwgPSBuZXcgTWF0ZXJpYWxUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy51aUJ1aWxkZXIgPSBuZXcgVUlCdWlsZGVyVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmVDYXB0dXJlID0gbmV3IFNjZW5lQ2FwdHVyZVRvb2xzKCk7XG4gICAgICAgICAgICBsb2dnZXIuc3VjY2VzcygnVG9vbHMgaW5pdGlhbGl6ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYEVycm9yIGluaXRpYWxpemluZyB0b29sczogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGFzeW5jIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbygnU2VydmVyIGlzIGFscmVhZHkgcnVubmluZycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBvcnQgPSB0aGlzLnNldHRpbmdzLnBvcnQ7XG4gICAgICAgIGxldCBsYXN0RXJyb3I6IGFueTtcblxuICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgYXR0ZW1wdCA8IE1DUFNlcnZlci5NQVhfUE9SVF9SRVRSSUVTOyBhdHRlbXB0KyspIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy50cnlMaXN0ZW4ocG9ydCk7XG4gICAgICAgICAgICAgICAgaWYgKHBvcnQgIT09IHRoaXMuc2V0dGluZ3MucG9ydCkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgT3JpZ2luYWwgcG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gd2FzIGluIHVzZSwgYm91bmQgdG8gJHtwb3J0fSBpbnN0ZWFkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MucG9ydCA9IHBvcnQ7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLnN1Y2Nlc3MoJ01DUCBTZXJ2ZXIgaXMgcmVhZHkgZm9yIGNvbm5lY3Rpb25zJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBsYXN0RXJyb3IgPSBlcnI7XG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmV0cnlEZWxheSA9IE1hdGgubWluKDUwMCAqIChhdHRlbXB0ICsgMSksIDIwMDApO1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgUG9ydCAke3BvcnR9IGluIHVzZSwgdHJ5aW5nICR7cG9ydCArIDF9IGluICR7cmV0cnlEZWxheX1tcyAoYXR0ZW1wdCAke2F0dGVtcHQgKyAxfS8ke01DUFNlcnZlci5NQVhfUE9SVF9SRVRSSUVTfSkuLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHJldHJ5RGVsYXkpKTtcbiAgICAgICAgICAgICAgICAgICAgcG9ydCsrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjogJHtsYXN0RXJyb3J9YCk7XG4gICAgICAgIHRocm93IGxhc3RFcnJvcjtcbiAgICB9XG5cbiAgICBwcml2YXRlIHRyeUxpc3Rlbihwb3J0OiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuaGFuZGxlSHR0cFJlcXVlc3QuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICBzZXJ2ZXIubGlzdGVuKHBvcnQsICcxMjcuMC4wLjEnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gc2VydmVyO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKGBIVFRQIHNlcnZlciBzdGFydGVkIG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBIZWFsdGggY2hlY2s6IGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9oZWFsdGhgKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgTUNQIGVuZHBvaW50OiBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0vbWNwYCk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgc2VydmVyLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZXR1cFRvb2xzKCk6IHZvaWQge1xuICAgICAgICB0aGlzLnRvb2xzTGlzdCA9IFtdO1xuICAgICAgICB0aGlzLnRvb2xFeGVjdXRvcnMuY2xlYXIoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IFtfY2F0ZWdvcnksIHRvb2xTZXRdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XG4gICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbHNMaXN0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdG9vbC5pbnB1dFNjaGVtYVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMudG9vbEV4ZWN1dG9ycy5zZXQodG9vbC5uYW1lLCAoYXJnczogYW55KSA9PiB0b29sU2V0LmV4ZWN1dGUodG9vbC5uYW1lLCBhcmdzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuaW5mbyhgU2V0dXAgdG9vbHM6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSB0b29scyBhdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sRXhlY3V0b3JzLmdldCh0b29sTmFtZSk7XG4gICAgICAgIGlmIChleGVjdXRvcikge1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGV4ZWN1dG9yKGFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IHRyeSB0byBmaW5kIHRoZSB0b29sIGluIGFueSBleGVjdXRvclxuICAgICAgICBmb3IgKGNvbnN0IFtfY2F0ZWdvcnksIHRvb2xTZXRdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XG4gICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgIGlmICh0b29scy5zb21lKCh0OiBhbnkpID0+IHQubmFtZSA9PT0gdG9vbE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRvb2xTZXQuZXhlY3V0ZSh0b29sTmFtZSwgYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRvb2wgJHt0b29sTmFtZX0gbm90IGZvdW5kYCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldENsaWVudHMoKTogTUNQQ2xpZW50W10ge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNsaWVudHMudmFsdWVzKCkpO1xuICAgIH1cbiAgICBwdWJsaWMgZ2V0QXZhaWxhYmxlVG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U2V0dGluZ3MoKTogTUNQU2VydmVyU2V0dGluZ3Mge1xuICAgICAgICByZXR1cm4gdGhpcy5zZXR0aW5ncztcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0TG9nZ2VyKCkge1xuICAgICAgICByZXR1cm4gbG9nZ2VyO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXEudXJsIHx8ICcnLCB0cnVlKTtcbiAgICAgICAgY29uc3QgcGF0aG5hbWUgPSBwYXJzZWRVcmwucGF0aG5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgQ09SUyBoZWFkZXJzXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBERUxFVEUsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsIGBDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24sICR7TUNQU2VydmVyLlBST1RPQ09MX0hFQURFUn0sICR7TUNQU2VydmVyLlNFU1NJT05fSEVBREVSfWApO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlUmVxdWVzdE9yaWdpbihyZXEsIHJlcykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChwYXRobmFtZSA9PT0gJy9tY3AnKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVNQ1BUcmFuc3BvcnRSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvc3NlJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU1NFQ29ubmVjdGlvbihyZXEsIHJlcyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL21lc3NhZ2VzJyAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNTRU1lc3NhZ2VSZXF1ZXN0KHJlcSwgcmVzLCBwYXJzZWRVcmwucXVlcnkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9oZWFsdGgnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdGF0dXM6ICdvaycsIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5sZW5ndGggfSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZT8uc3RhcnRzV2l0aCgnL2FwaS8nKSAmJiByZXEubWV0aG9kID09PSAnUE9TVCcpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZVNpbXBsZUFQSVJlcXVlc3QocmVxLCByZXMsIHBhdGhuYW1lKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGF0aG5hbWUgPT09ICcvYXBpL3Rvb2xzJyAmJiByZXEubWV0aG9kID09PSAnR0VUJykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgdG9vbHM6IHRoaXMuZ2V0U2ltcGxpZmllZFRvb2xzTGlzdCgpIH0pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBIVFRQIHJlcXVlc3QgZXJyb3I6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDUwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVSZXF1ZXN0T3JpZ2luKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBvcmlnaW4gPSB0aGlzLmdldEhlYWRlcihyZXEsICdvcmlnaW4nKTtcbiAgICAgICAgaWYgKCFvcmlnaW4gfHwgb3JpZ2luID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuYWxsb3dlZE9yaWdpbnM/LmluY2x1ZGVzKCcqJykgfHwgdGhpcy5zZXR0aW5ncy5hbGxvd2VkT3JpZ2lucz8uaW5jbHVkZXMob3JpZ2luKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gbmV3IFVSTChvcmlnaW4pO1xuICAgICAgICAgICAgaWYgKHBhcnNlZC5ob3N0bmFtZSA9PT0gJzEyNy4wLjAuMScgfHwgcGFyc2VkLmhvc3RuYW1lID09PSAnbG9jYWxob3N0Jykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIGZhbGwgdGhyb3VnaFxuICAgICAgICB9XG5cbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDMpO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IGBPcmlnaW4gbm90IGFsbG93ZWQ6ICR7b3JpZ2lufWAgfSkpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRIZWFkZXIocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgaGVhZGVyTmFtZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSByZXEuaGVhZGVyc1toZWFkZXJOYW1lLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHJldHVybiB2YWx1ZVswXTtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdEhlYWRlcjogc3RyaW5nLCByZXF1aXJlZFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIWFjY2VwdEhlYWRlcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBhY2NlcHRIZWFkZXIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZWQuaW5jbHVkZXMoJyovKicpIHx8IG5vcm1hbGl6ZWQuaW5jbHVkZXMocmVxdWlyZWRUeXBlLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVNQ1BQb3N0SGVhZGVycyhyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgYWNjZXB0ID0gdGhpcy5nZXRIZWFkZXIocmVxLCAnYWNjZXB0JykgfHwgJyc7XG4gICAgICAgIGlmICghdGhpcy5hY2NlcHRzQ29udGVudFR5cGUoYWNjZXB0LCAnYXBwbGljYXRpb24vanNvbicpIHx8ICF0aGlzLmFjY2VwdHNDb250ZW50VHlwZShhY2NlcHQsICd0ZXh0L2V2ZW50LXN0cmVhbScpKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNik7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDAsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQT1NUIC9tY3AgcmVxdWlyZXMgQWNjZXB0IGhlYWRlciBjb250YWluaW5nIGJvdGggYXBwbGljYXRpb24vanNvbiBhbmQgdGV4dC9ldmVudC1zdHJlYW0nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudFR5cGUgPSAodGhpcy5nZXRIZWFkZXIocmVxLCAnY29udGVudC10eXBlJykgfHwgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmICghY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MTUpO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUE9TVCAvbWNwIHJlcXVpcmVzIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzSnNvblJwY1JlcXVlc3RNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISFtZXNzYWdlICYmIHR5cGVvZiBtZXNzYWdlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbWVzc2FnZS5tZXRob2QgPT09ICdzdHJpbmcnO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNKc29uUnBjTm90aWZpY2F0aW9uKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKSAmJiAobWVzc2FnZS5pZCA9PT0gdW5kZWZpbmVkIHx8IG1lc3NhZ2UuaWQgPT09IG51bGwpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNKc29uUnBjUmVzcG9uc2VNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICBpZiAoIW1lc3NhZ2UgfHwgdHlwZW9mIG1lc3NhZ2UgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5tZXRob2QgPT09ICdzdHJpbmcnKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChtZXNzYWdlLmlkID09PSB1bmRlZmluZWQgfHwgbWVzc2FnZS5pZCA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG1lc3NhZ2UsICdyZXN1bHQnKSB8fCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNQ1BUcmFuc3BvcnRSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmhhbmRsZU1DUFJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1DUFN0cmVhbVJlcXVlc3QocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1DUERlbGV0ZVNlc3Npb24ocmVxLCByZXMpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzLnNldEhlYWRlcignQWxsb3cnLCAnR0VULCBQT1NULCBERUxFVEUsIE9QVElPTlMnKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCg0MDUpO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZU1DUFN0cmVhbVJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLnZhbGlkYXRlU2Vzc2lvbkhlYWRlcihyZXEsIHJlcywgdHJ1ZSk7XG4gICAgICAgIGlmICghc2Vzc2lvbikgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0IGFjY2VwdCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgJ2FjY2VwdCcpIHx8ICcnO1xuICAgICAgICBpZiAoIXRoaXMuYWNjZXB0c0NvbnRlbnRUeXBlKGFjY2VwdCwgJ3RleHQvZXZlbnQtc3RyZWFtJykpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA2KTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0dFVCAvbWNwIHJlcXVpcmVzIEFjY2VwdDogdGV4dC9ldmVudC1zdHJlYW0nIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXNlc3Npb24uaW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogYFNlc3Npb24gaXMgbm90IGluaXRpYWxpemVkOiAke3Nlc3Npb24uaWR9YCB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHVwU1NFSGVhZGVycyhyZXMpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5QUk9UT0NPTF9IRUFERVIsIHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04pO1xuICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbi5pZCk7XG4gICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcblxuICAgICAgICBjb25zdCBzdHJlYW1JZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgICAgIGNvbnN0IHNlc3Npb25TdHJlYW1TZXQgPSB0aGlzLnNlc3Npb25TdHJlYW1zLmdldChzZXNzaW9uLmlkKSB8fCBuZXcgTWFwPHN0cmluZywgaHR0cC5TZXJ2ZXJSZXNwb25zZT4oKTtcbiAgICAgICAgc2Vzc2lvblN0cmVhbVNldC5zZXQoc3RyZWFtSWQsIHJlcyk7XG4gICAgICAgIHRoaXMuc2Vzc2lvblN0cmVhbXMuc2V0KHNlc3Npb24uaWQsIHNlc3Npb25TdHJlYW1TZXQpO1xuXG4gICAgICAgIHNlc3Npb24ubGFzdEFjdGl2aXR5ID0gbmV3IERhdGUoKTtcbiAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uLmlkLCBzZXNzaW9uKTtcbiAgICAgICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuXG4gICAgICAgIHJlcS5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzdHJlYW1zID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICBpZiAoIXN0cmVhbXMpIHJldHVybjtcbiAgICAgICAgICAgIHN0cmVhbXMuZGVsZXRlKHN0cmVhbUlkKTtcbiAgICAgICAgICAgIGlmIChzdHJlYW1zLnNpemUgPT09IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNlc3Npb25TdHJlYW1zLmRlbGV0ZShzZXNzaW9uLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1BEZWxldGVTZXNzaW9uKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIHRydWUpO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHJldHVybjtcblxuICAgICAgICBjb25zdCBzdHJlYW1zID0gdGhpcy5zZXNzaW9uU3RyZWFtcy5nZXQoc2Vzc2lvbi5pZCk7XG4gICAgICAgIGlmIChzdHJlYW1zKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtfc3RyZWFtSWQsIHN0cmVhbV0gb2Ygc3RyZWFtcy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW0uZW5kKCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIC8vIG5vLW9wXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zZXNzaW9uU3RyZWFtcy5kZWxldGUoc2Vzc2lvbi5pZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNsaWVudHMuZGVsZXRlKHNlc3Npb24uaWQpO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwNCk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwU1NFSGVhZGVycyhyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvZXZlbnQtc3RyZWFtJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tY2FjaGUnKTtcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29ubmVjdGlvbicsICdrZWVwLWFsaXZlJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ1gtQWNjZWwtQnVmZmVyaW5nJywgJ25vJyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgUFJPVE9DT0xfVkVSU0lPTl9QQVRURVJOID0gL15cXGR7NH0tXFxkezJ9LVxcZHsyfSQvO1xuXG4gICAgcHJpdmF0ZSBuZWdvdGlhdGVQcm90b2NvbFZlcnNpb24obWVzc2FnZVByb3RvY29sOiBhbnksIGhlYWRlclByb3RvY29sPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RlZCA9IHR5cGVvZiBtZXNzYWdlUHJvdG9jb2wgPT09ICdzdHJpbmcnXG4gICAgICAgICAgICA/IG1lc3NhZ2VQcm90b2NvbFxuICAgICAgICAgICAgOiAoaGVhZGVyUHJvdG9jb2wgfHwgTUNQU2VydmVyLkRFRkFVTFRfUFJPVE9DT0xfVkVSU0lPTik7XG4gICAgICAgIGlmICh0eXBlb2YgcmVxdWVzdGVkICE9PSAnc3RyaW5nJyB8fCAhTUNQU2VydmVyLlBST1RPQ09MX1ZFUlNJT05fUEFUVEVSTi50ZXN0KHJlcXVlc3RlZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGlmICghTUNQU2VydmVyLlNVUFBPUlRFRF9QUk9UT0NPTF9WRVJTSU9OUy5oYXMocmVxdWVzdGVkKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcXVlc3RlZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIHZhbGlkYXRlU2Vzc2lvbkhlYWRlcihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHJlcXVpcmVkOiBib29sZWFuKTogTUNQQ2xpZW50IHwgbnVsbCB7XG4gICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IHRoaXMuZ2V0SGVhZGVyKHJlcSwgTUNQU2VydmVyLlNFU1NJT05fSEVBREVSKTtcbiAgICAgICAgaWYgKCFzZXNzaW9uSWQpIHtcbiAgICAgICAgICAgIGlmIChyZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMCwgbWVzc2FnZTogYE1pc3NpbmcgcmVxdWlyZWQgaGVhZGVyOiAke01DUFNlcnZlci5TRVNTSU9OX0hFQURFUn1gIH1cbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLmNsaWVudHMuZ2V0KHNlc3Npb25JZCk7XG4gICAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICAgICAgaWYgKHJlcXVpcmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzIwMDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2Vzc2lvbiBub3QgZm91bmQ6ICR7c2Vzc2lvbklkfS4gVGhlIHNlcnZlciBtYXkgaGF2ZSByZXN0YXJ0ZWQg4oCUIHBsZWFzZSByZS1pbml0aWFsaXplLmAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IHNlc3Npb25JZCwgc2VydmVyUmVzdGFydGVkOiB0cnVlLCBzZXJ2ZXJJbnN0YW5jZUlkOiB0aGlzLnNlcnZlckluc3RhbmNlSWQgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gc2Vzc2lvbjtcbiAgICB9XG5cbiAgICBwcml2YXRlIGhhbmRsZVNTRUNvbm5lY3Rpb24ocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNsaWVudElkID0gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgICAgdGhpcy5zZXR1cFNTRUhlYWRlcnMocmVzKTtcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuXG4gICAgICAgIGNvbnN0IGNsaWVudDogTUNQQ2xpZW50ID0ge1xuICAgICAgICAgICAgaWQ6IGNsaWVudElkLFxuICAgICAgICAgICAgbGFzdEFjdGl2aXR5OiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgdXNlckFnZW50OiByZXEuaGVhZGVyc1sndXNlci1hZ2VudCddXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY2xpZW50cy5zZXQoY2xpZW50SWQsIGNsaWVudCk7XG4gICAgICAgIHRoaXMubGVnYWN5U3NlU3RyZWFtcy5zZXQoY2xpZW50SWQsIHJlcyk7XG5cbiAgICAgICAgdGhpcy5zZW5kU1NFRXZlbnQocmVzLCAnZW5kcG9pbnQnLCBgL21lc3NhZ2VzP3Nlc3Npb25JZD0ke2VuY29kZVVSSUNvbXBvbmVudChjbGllbnRJZCl9YCk7XG4gICAgICAgIHJlcy53cml0ZSgnOiBjb25uZWN0ZWRcXG5cXG4nKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFNTRSBjbGllbnQgY29ubmVjdGVkOiAke2NsaWVudElkfWApO1xuXG4gICAgICAgIHJlcS5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmxlZ2FjeVNzZVN0cmVhbXMuZGVsZXRlKGNsaWVudElkKTtcbiAgICAgICAgICAgIHRoaXMuY2xpZW50cy5kZWxldGUoY2xpZW50SWQpO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFNTRSBjbGllbnQgZGlzY29ubmVjdGVkOiAke2NsaWVudElkfWApO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVNTRU1lc3NhZ2VSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcXVlcnk6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByYXdTZXNzaW9uSWQgPSBxdWVyeT8uc2Vzc2lvbklkO1xuICAgICAgICBjb25zdCBzZXNzaW9uSWQgPSBBcnJheS5pc0FycmF5KHJhd1Nlc3Npb25JZCkgPyByYXdTZXNzaW9uSWRbMF0gOiByYXdTZXNzaW9uSWQ7XG4gICAgICAgIGlmICghc2Vzc2lvbklkIHx8IHR5cGVvZiBzZXNzaW9uSWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHF1ZXJ5IHBhcmFtZXRlcjogc2Vzc2lvbklkJyB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzdHJlYW0gPSB0aGlzLmxlZ2FjeVNzZVN0cmVhbXMuZ2V0KHNlc3Npb25JZCk7XG4gICAgICAgIGlmICghc3RyZWFtKSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzIwMDEsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTU0Ugc2Vzc2lvbiBub3QgZm91bmQ6ICR7c2Vzc2lvbklkfS4gVGhlIHNlcnZlciBtYXkgaGF2ZSByZXN0YXJ0ZWQg4oCUIHBsZWFzZSByZS1pbml0aWFsaXplLmAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgc2Vzc2lvbklkLCBzZXJ2ZXJSZXN0YXJ0ZWQ6IHRydWUsIHNlcnZlckluc3RhbmNlSWQ6IHRoaXMuc2VydmVySW5zdGFuY2VJZCB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGJvZHk6IHN0cmluZztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGJvZHkgPSBhd2FpdCB0aGlzLnJlYWRSZXF1ZXN0Qm9keShyZXEpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgY29uc3QgYm9keUVycm9yUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnI/Lm1lc3NhZ2UgfHwgJ1JlcXVlc3QgYm9keSB0b28gbGFyZ2UnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHN0cmVhbSwgJ21lc3NhZ2UnLCBKU09OLnN0cmluZ2lmeShib2R5RXJyb3JSZXNwb25zZSkpO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBhbnk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBKU09OIHBhcnNpbmcgZmFpbGVkOiAke3BhcnNlRXJyb3IubWVzc2FnZX0uIE9yaWdpbmFsIGJvZHk6ICR7Ym9keS5zdWJzdHJpbmcoMCwgNTAwKX0uLi5gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeGVkQm9keSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IHRoaXMuY2xpZW50cy5nZXQoc2Vzc2lvbklkKTtcbiAgICAgICAgICAgIGlmIChjbGllbnQpIHtcbiAgICAgICAgICAgICAgICBjbGllbnQubGFzdEFjdGl2aXR5ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHNlc3Npb25JZCwgY2xpZW50KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaXNSZXF1ZXN0ID0gdGhpcy5pc0pzb25ScGNSZXF1ZXN0TWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIGNvbnN0IGlzTm90aWZpY2F0aW9uID0gdGhpcy5pc0pzb25ScGNOb3RpZmljYXRpb24obWVzc2FnZSk7XG4gICAgICAgICAgICBjb25zdCBpc0luaXRpYWxpemUgPSBpc1JlcXVlc3QgJiYgbWVzc2FnZS5tZXRob2QgPT09ICdpbml0aWFsaXplJztcbiAgICAgICAgICAgIGlmIChpc0luaXRpYWxpemUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm90b2NvbFZlcnNpb24gPSB0aGlzLm5lZ290aWF0ZVByb3RvY29sVmVyc2lvbihtZXNzYWdlPy5wYXJhbXM/LnByb3RvY29sVmVyc2lvbik7XG4gICAgICAgICAgICAgICAgaWYgKCFwcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdW5zdXBwb3J0ZWRSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVW5zdXBwb3J0ZWQgcHJvdG9jb2wgdmVyc2lvbjogJHttZXNzYWdlPy5wYXJhbXM/LnByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHN0cmVhbSwgJ21lc3NhZ2UnLCBKU09OLnN0cmluZ2lmeSh1bnN1cHBvcnRlZFJlc3BvbnNlKSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSwgeyBwcm90b2NvbFZlcnNpb24gfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5pdENsaWVudCA9IHRoaXMuY2xpZW50cy5nZXQoc2Vzc2lvbklkKTtcbiAgICAgICAgICAgICAgICBpZiAoaW5pdENsaWVudCAmJiAhcmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5pdENsaWVudC5wcm90b2NvbFZlcnNpb24gPSBwcm90b2NvbFZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgIGluaXRDbGllbnQuaW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHNlc3Npb25JZCwgaW5pdENsaWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHN0cmVhbSwgJ21lc3NhZ2UnLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoaXNOb3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIubWNwKGBSZWNlaXZlZCBTU0Ugbm90aWZpY2F0aW9uOiAke21lc3NhZ2UubWV0aG9kfWApO1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHN0cmVhbSwgJ21lc3NhZ2UnLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRXJyb3IgaGFuZGxpbmcgU1NFIHJlcXVlc3Q6ICR7ZXJyb3J9YCk7XG4gICAgICAgICAgICBjb25zdCBwYXJzZUVycm9yUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUGFyc2UgZXJyb3I6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuc2VuZFNTRUV2ZW50KHN0cmVhbSwgJ21lc3NhZ2UnLCBKU09OLnN0cmluZ2lmeShwYXJzZUVycm9yUmVzcG9uc2UpKTtcblxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDIpO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZW5kU1NFRXZlbnQocmVzOiBodHRwLlNlcnZlclJlc3BvbnNlLCBldmVudDogc3RyaW5nLCBkYXRhOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgcmVzLndyaXRlKGBldmVudDogJHtldmVudH1cXG5gKTtcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGEuc3BsaXQoJ1xcbicpKSB7XG4gICAgICAgICAgICByZXMud3JpdGUoYGRhdGE6ICR7bGluZX1cXG5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXMud3JpdGUoJ1xcbicpO1xuICAgIH1cbiAgICBcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1DUFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghdGhpcy52YWxpZGF0ZU1DUFBvc3RIZWFkZXJzKHJlcSwgcmVzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGVhZGVyUHJvdG9jb2xWZXJzaW9uID0gdGhpcy5nZXRIZWFkZXIocmVxLCBNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSKTtcbiAgICAgICAgaWYgKGhlYWRlclByb3RvY29sVmVyc2lvbiAmJiAhTUNQU2VydmVyLlNVUFBPUlRFRF9QUk9UT0NPTF9WRVJTSU9OUy5oYXMoaGVhZGVyUHJvdG9jb2xWZXJzaW9uKSkge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVW5zdXBwb3J0ZWQgJHtNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSfTogJHtoZWFkZXJQcm90b2NvbFZlcnNpb259YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBib2R5OiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBib2R5ID0gYXdhaXQgdGhpcy5yZWFkUmVxdWVzdEJvZHkocmVxKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDEzKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMCwgbWVzc2FnZTogZXJyPy5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJyB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIC8vIEVuaGFuY2VkIEpTT04gcGFyc2luZyB3aXRoIGJldHRlciBlcnJvciBoYW5kbGluZ1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlOiBhbnk7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zaG91bGRUcnlGaXhKc29uKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEpTT04gcGFyc2luZyBmYWlsZWQ6ICR7cGFyc2VFcnJvci5tZXNzYWdlfS4gT3JpZ2luYWwgYm9keTogJHtib2R5LnN1YnN0cmluZygwLCA1MDApfS4uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpeCBjb21tb24gSlNPTiBpc3N1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhlZEJvZHkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGlzUmVxdWVzdCA9IHRoaXMuaXNKc29uUnBjUmVxdWVzdE1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNOb3RpZmljYXRpb24gPSB0aGlzLmlzSnNvblJwY05vdGlmaWNhdGlvbihtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1Jlc3BvbnNlID0gdGhpcy5pc0pzb25ScGNSZXNwb25zZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc1JlcXVlc3QgJiYgIWlzUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCBKU09OLVJQQyBtZXNzYWdlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpc0luaXRpYWxpemUgPSBpc1JlcXVlc3QgJiYgbWVzc2FnZS5tZXRob2QgPT09ICdpbml0aWFsaXplJztcbiAgICAgICAgICAgICAgICBpZiAoaXNJbml0aWFsaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nU2Vzc2lvbklkID0gdGhpcy5nZXRIZWFkZXIocmVxLCBNQ1BTZXJ2ZXIuU0VTU0lPTl9IRUFERVIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdTZXNzaW9uSWQgJiYgdGhpcy5jbGllbnRzLmhhcyhleGlzdGluZ1Nlc3Npb25JZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtZXNzYWdlPy5pZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYCR7TUNQU2VydmVyLlNFU1NJT05fSEVBREVSfSBtdXN0IG5vdCBiZSBzZXQgb24gaW5pdGlhbGl6ZWBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNOb3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjYwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0luaXRpYWxpemUgbXVzdCBiZSBzZW50IGFzIGEgSlNPTi1SUEMgcmVxdWVzdCB3aXRoIGEgbm9uLW51bGwgaWQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvdG9jb2xWZXJzaW9uID0gdGhpcy5uZWdvdGlhdGVQcm90b2NvbFZlcnNpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlPy5wYXJhbXM/LnByb3RvY29sVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlclByb3RvY29sVmVyc2lvblxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVW5zdXBwb3J0ZWQgcHJvdG9jb2wgdmVyc2lvbjogJHttZXNzYWdlPy5wYXJhbXM/LnByb3RvY29sVmVyc2lvbiB8fCBoZWFkZXJQcm90b2NvbFZlcnNpb259YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IGNyeXB0by5yYW5kb21VVUlEKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHsgcHJvdG9jb2xWZXJzaW9uIH0pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1F1ZXVlRnVsbCA9IHJlc3BvbnNlLmVycm9yPy5jb2RlID09PSAtMzIwMjk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbklkLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHNlc3Npb25JZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYXN0QWN0aXZpdHk6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlckFnZW50OiByZXEuaGVhZGVyc1sndXNlci1hZ2VudCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsaXplZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbklkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoTUNQU2VydmVyLlBST1RPQ09MX0hFQURFUiwgcHJvdG9jb2xWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignUmV0cnktQWZ0ZXInLCAnNScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MjkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxldCBzZXNzaW9uID0gdGhpcy52YWxpZGF0ZVNlc3Npb25IZWFkZXIocmVxLCByZXMsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhbGVTZXNzaW9uSWQgPSB0aGlzLmdldEhlYWRlcihyZXEsIE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGFsZVNlc3Npb25JZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1yZWNvdmVyOiBjcmVhdGUgYSBuZXcgc2Vzc2lvbiBmb3Igc3RhbGUvdW5rbm93biBzZXNzaW9uIElEc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc28gdGhlIGNsaWVudCBkb2Vzbid0IG5lZWQgdG8gbWFudWFsbHkgcmUtaW5pdGlhbGl6ZSBhZnRlciBzZXJ2ZXIgcmVzdGFydC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByb3RvY29sIHZlcnNpb24gd2lsbCBiZSBuZWdvdGlhdGVkIGZyb20gdGhlIHJlcXVlc3QgaGVhZGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogc3RhbGVTZXNzaW9uSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdEFjdGl2aXR5OiBuZXcgRGF0ZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJBZ2VudDogcmVxLmhlYWRlcnNbJ3VzZXItYWdlbnQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246IHVuZGVmaW5lZCBhcyBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbGl6ZWQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWVudHMuc2V0KHN0YWxlU2Vzc2lvbklkLCBzZXNzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBBdXRvLXJlY292ZXJlZCBzdGFsZSBzZXNzaW9uOiAke3N0YWxlU2Vzc2lvbklkfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG1lc3NhZ2U/LmlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAwLCBtZXNzYWdlOiBgTWlzc2luZyByZXF1aXJlZCBoZWFkZXI6ICR7TUNQU2VydmVyLlNFU1NJT05fSEVBREVSfWAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbi5pbml0aWFsaXplZCkge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTZXNzaW9uIGlzIG5vdCBpbml0aWFsaXplZDogJHtzZXNzaW9uLmlkfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvdG9jb2xWZXJzaW9uID0gdGhpcy5uZWdvdGlhdGVQcm90b2NvbFZlcnNpb24oXG4gICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyUHJvdG9jb2xWZXJzaW9uIHx8IHNlc3Npb24ucHJvdG9jb2xWZXJzaW9uXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jbGllbnRzLmRlbGV0ZShzZXNzaW9uLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBVbnN1cHBvcnRlZCBwcm90b2NvbCB2ZXJzaW9uOiAke2hlYWRlclByb3RvY29sVmVyc2lvbn1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChoZWFkZXJQcm90b2NvbFZlcnNpb24gJiYgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gJiYgaGVhZGVyUHJvdG9jb2xWZXJzaW9uICE9PSBzZXNzaW9uLnByb3RvY29sVmVyc2lvbikge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWVzc2FnZT8uaWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke01DUFNlcnZlci5QUk9UT0NPTF9IRUFERVJ9IGRvZXMgbm90IG1hdGNoIGluaXRpYWxpemVkIHNlc3Npb24gdmVyc2lvbmBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc2Vzc2lvbi5sYXN0QWN0aXZpdHkgPSBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5wcm90b2NvbFZlcnNpb24gPSBwcm90b2NvbFZlcnNpb247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50cy5zZXQoc2Vzc2lvbi5pZCwgc2Vzc2lvbik7XG5cbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKE1DUFNlcnZlci5TRVNTSU9OX0hFQURFUiwgc2Vzc2lvbi5pZCk7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihNQ1BTZXJ2ZXIuUFJPVE9DT0xfSEVBREVSLCBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBwcm90b2NvbFZlcnNpb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gTUNQIG5vdGlmaWNhdGlvbnMvcmVzcG9uc2VzIG11c3QgcmV0dXJuIDIwMiBBY2NlcHRlZCB3aGVuIGFjY2VwdGVkLlxuICAgICAgICAgICAgICAgIGlmIChpc1Jlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5tY3AoJ1JlY2VpdmVkIGNsaWVudCBKU09OLVJQQyByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNOb3RpZmljYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLm1jcChgUmVjZWl2ZWQgbm90aWZpY2F0aW9uOiAke21lc3NhZ2UubWV0aG9kfWApO1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMik7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UsIHsgcHJvdG9jb2xWZXJzaW9uOiBzZXNzaW9uLnByb3RvY29sVmVyc2lvbiB8fCBwcm90b2NvbFZlcnNpb24gfSk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNRdWV1ZUZ1bGwgPSByZXNwb25zZS5lcnJvcj8uY29kZSA9PT0gLTMyMDI5O1xuICAgICAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdSZXRyeS1BZnRlcicsICc1Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDI5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBFcnJvciBoYW5kbGluZyBNQ1AgcmVxdWVzdDogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvZGU6IC0zMjcwMCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnksIGNvbnRleHQ/OiB7IHByb3RvY29sVmVyc2lvbj86IHN0cmluZyB9KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgeyBpZCwgbWV0aG9kLCBwYXJhbXMgfSA9IG1lc3NhZ2U7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ6IGFueTtcblxuICAgICAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd0b29scy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyB0b29sczogdGhpcy5nZXRBdmFpbGFibGVUb29scygpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2NhbGwnOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgbmFtZSwgYXJndW1lbnRzOiBhcmdzIH0gPSBwYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xSZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKG5hbWUsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7IGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkodG9vbFJlc3VsdCkgfV0gfTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyByZXNvdXJjZXM6IHRoaXMuZ2V0UmVzb3VyY2VzTGlzdCgpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc291cmNlcy9yZWFkJzoge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmkgPSBwYXJhbXM/LnVyaTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF1cmkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IHVyaScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IGF3YWl0IHRoaXMuaGFuZGxlUmVhZFJlc291cmNlKHVyaSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gTUNQIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogY29udGV4dD8ucHJvdG9jb2xWZXJzaW9uIHx8IE1DUFNlcnZlci5ERUZBVUxUX1BST1RPQ09MX1ZFUlNJT04sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sczoge30sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUlkOiB0aGlzLnNlcnZlckluc3RhbmNlSWRcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbnM6ICdZb3UgYXJlIGNvbm5lY3RlZCB0byBhIHJ1bm5pbmcgQ29jb3MgQ3JlYXRvciBlZGl0b3IgdmlhIE1DUC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0Fsd2F5cyBpbnNwZWN0IHRoZSBjdXJyZW50IHNjZW5lL3ByZWZhYiBzdHJ1Y3R1cmUgYmVmb3JlIG1ha2luZyBtb2RpZmljYXRpb25zLCBhbmQgcXVlcnkgcmVhbC10aW1lIGVkaXRvciBkYXRhIGluc3RlYWQgb2YgZ3Vlc3NpbmcuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdBbHdheXMgdXNlIE1DUC9lZGl0b3IgQVBJcyBmb3Igc2NlbmUsIG5vZGUsIGNvbXBvbmVudCwgcHJlZmFiLCBhc3NldCwgcHJvamVjdCwgYW5kIGVkaXRvciBvcGVyYXRpb25zLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRG8gbm90IGRpcmVjdGx5IGVkaXQgc2VyaWFsaXplZCBDb2NvcyBmaWxlcyAoLnNjZW5lLCAucHJlZmFiLCAubWV0YSwgYW5kIHJlbGF0ZWQgZGF0YSBmaWxlcykgZm9yIHN0cnVjdHVyYWwgY2hhbmdlcyAoYWRkaW5nL3JlbW92aW5nIG5vZGVzIG9yIGNvbXBvbmVudHMsIG1vZGlmeWluZyBfX2lkX18vVVVJRC9hcnJheSByZWZlcmVuY2VzKTsgYWx3YXlzIHVzZSBNQ1AvZWRpdG9yIEFQSXMgZm9yIHRoZXNlLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnRXhjZXB0aW9uOiBidWxrIGZpbmQtcmVwbGFjZSBvZiBhIHNpbmdsZSBpZGVudGlmaWVyIHZhbHVlIChlLmcuLCByZW5hbWluZyBhIF9fdHlwZV9fIENJRCBvciBhbiBlbnVtIHN0cmluZykgaXMgYWxsb3dlZCB2aWEgZGlyZWN0IHRleHQgZWRpdCB3aGVuIG5vIE1DUCB0b29sIGNvdmVycyBpdCwgcHJvdmlkZWQgbm8gSlNPTiBzdHJ1Y3R1cmUgaXMgY2hhbmdlZCBhbmQgdGhlIHdvcmtpbmcgdHJlZSBpcyBjb21taXR0ZWQgYmVmb3JlaGFuZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1R5cGVTY3JpcHQvSmF2YVNjcmlwdCBzb3VyY2UgZmlsZXMgKC50cywgLmpzKSBjYW4gYWx3YXlzIGJlIGVkaXRlZCBkaXJlY3RseS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0FsbCB0b29scyB1c2UgYW4gXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc3BlY2lmeSBvcGVyYXRpb25zLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQWZ0ZXIgY3JlYXRpbmcgb3IgcmVzdHJ1Y3R1cmluZyBVSSBub2RlcywgYXBwbHkgcmVzcG9uc2l2ZSBkZWZhdWx0cyAoYW5jaG9ycywgd2lkZ2V0IGNvbnN0cmFpbnRzLCBhbmQgbGF5b3V0KSwgYW5kIHByZWZlciB1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzIGltbWVkaWF0ZWx5IGZvciBjb25zaXN0ZW5jeS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1ByZWZlciByZXVzYWJsZSBwcmVmYWIgZWRpdHMgYXQgdGhlIHByZWZhYiBhc3NldCBzb3VyY2UgbGV2ZWw7IHVzZSBzY2VuZS1sb2NhbCBvdmVycmlkZXMgb25seSB3aGVuIG5lY2Vzc2FyeS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0ZvciBhbnkgY29tcG9zaXRlIFVJIChwb3B1cHMsIGRpYWxvZ3MsIHBhbmVscywgbGlzdCBpdGVtcywgY2FyZHMsIEhVRCB3aWRnZXRzLCBldGMuKSwgZG8gTk9UIGFzc2VtYmxlIHRoZSB0cmVlIGZyb20gc2NyYXRjaCB2aWEgY2hhaW5lZCBub2RlX2xpZmVjeWNsZS5jcmVhdGUgY2FsbHMuIEZpcnN0IGxvY2F0ZSBhbiBleGlzdGluZyBwcmVmYWIgdGVtcGxhdGUgaW4gdGhpcyBwcm9qZWN0IChwcmVmYWJfcXVlcnkuZ2V0X2xpc3QsIG9yIGFzc2V0X3F1ZXJ5LmZpbmRfYnlfbmFtZSB3aXRoIGFzc2V0VHlwZT1cInByZWZhYlwiKSwgdGhlbiB1c2UgcHJlZmFiX2xpZmVjeWNsZS5pbnN0YW50aWF0ZSBhbmQgb3ZlcnJpZGUgcHJvcGVydGllcyB2aWEgc2V0X2NvbXBvbmVudF9wcm9wZXJ0eS4gQnVpbGQtZnJvbS1zY3JhdGNoIGlzIG9ubHkgYWNjZXB0YWJsZSBmb3IgdHJpdmlhbCB3cmFwcGVycyAo4omkMyBjaGlsZHJlbiwgbm8gbGF5b3V0IGNvbXBvbmVudHMpLiBJZiBubyB0ZW1wbGF0ZSBmaXRzLCB1c2UgdWlfYnVpbGRfZnJvbV9zcGVjIHdpdGggYSBkZWNsYXJhdGl2ZSBVSVNwZWMg4oCUIHNrZXRjaCB0aGUgc3BlYyBwbHVzIGFuIEFTQ0lJIHRyZWUgcHJldmlldywgZ2V0IHVzZXIgY29uZmlybWF0aW9uLCB0aGVuIGNhbGwgdGhlIHRvb2wgb25jZTsgZG8gbm90IGNoYWluIG5vZGVfbGlmZWN5Y2xlL2NvbXBvbmVudF9tYW5hZ2Uvc2V0X2NvbXBvbmVudF9wcm9wZXJ0eSBmb3IgbmV3IGNvbXBvc2l0ZSBVSS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0tlZXAgbm9kZSBuYW1lcyBzZW1hbnRpYywgc2hvcnQsIGFuZCBjb25zaXN0ZW50IHdpdGggY29tcG9uZW50IHJvbGVzLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnV2hlbiBoaWVyYXJjaHkgb3Igbm9kZSBuYW1lcyBjaGFuZ2UsIHZlcmlmeSBhbmQgdXBkYXRlIHNjcmlwdCByZWZlcmVuY2VzIGFuZCBsb29rdXAgcGF0aHMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdWYWxpZGF0ZSBub2RlL2NvbXBvbmVudC9hc3NldCByZWZlcmVuY2VzIGFmdGVyIGVkaXRzIHRvIGVuc3VyZSB0aGVyZSBhcmUgbm8gbWlzc2luZyBsaW5rcy4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1NhdmUgYW5kIHJlbG9hZCB0b3VjaGVkIHNjZW5lL3ByZWZhYiBmaWxlcyBiZWZvcmUgZmluaXNoaW5nIHRvIGNvbmZpcm0gc2VyaWFsaXphdGlvbiBzdGFiaWxpdHkuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdSZXBvcnQgcGVyZm9ybWVkIGNoYW5nZXMgY2xlYXJseSwgaW5jbHVkaW5nIGFmZmVjdGVkIG5vZGVzLCBjb21wb25lbnRzLCBjb25zdHJhaW50cywgYW5kIHByZXNldHMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdJZiByZXF1aXJlbWVudHMgYXJlIGFtYmlndW91cywgYXNrIGZvciBjbGFyaWZpY2F0aW9uIGluc3RlYWQgb2YgZ3Vlc3NpbmcgbGF5b3V0IGJlaGF2aW9yLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnTUNQIFJlc291cmNlcyBhdmFpbGFibGU6IGNvY29zOi8vaGllcmFyY2h5IChzY2VuZSB0cmVlKSwgY29jb3M6Ly9zZWxlY3Rpb24gKGN1cnJlbnQgc2VsZWN0aW9uKSwgY29jb3M6Ly9sb2dzL2xhdGVzdCAoc2VydmVyIGxvZ3MpLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVXNlIGJhdGNoX2V4ZWN1dGUgdG8gcnVuIG11bHRpcGxlIG9wZXJhdGlvbnMgaW4gb25lIGNhbGwgZm9yIGVmZmljaWVuY3kuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdLZXkgdG9vbHM6IHNjZW5lX21hbmFnZW1lbnQgKGFjdGlvbjogZ2V0X2N1cnJlbnQvZ2V0X2xpc3Qvb3Blbi9zYXZlL2NyZWF0ZS9jbG9zZS9nZXRfaGllcmFyY2h5KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZmluZF9ieV9wYXR0ZXJuL2ZpbmRfYnlfbmFtZS9nZXRfYWxsL2RldGVjdF90eXBlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGVfbGlmZWN5Y2xlIChhY3Rpb246IGNyZWF0ZS9kZWxldGUvZHVwbGljYXRlL21vdmUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZV90cmFuc2Zvcm0gKGFjdGlvbjogc2V0X3RyYW5zZm9ybS9zZXRfcHJvcGVydHkpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X21hbmFnZSAoYWN0aW9uOiBhZGQvcmVtb3ZlL2F0dGFjaF9zY3JpcHQpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50X3F1ZXJ5IChhY3Rpb246IGdldF9hbGwvZ2V0X2luZm8vZ2V0X2F2YWlsYWJsZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzZXRfY29tcG9uZW50X3Byb3BlcnR5IChtb2RpZnkgY29tcG9uZW50IHByb3BlcnRpZXMpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cyAoYXBwbHkgcmVzcG9uc2l2ZSB3aWRnZXQvbGF5b3V0L2FuY2hvciBwcmVzZXRzKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ByZWZhYl9saWZlY3ljbGUgKGFjdGlvbjogY3JlYXRlL2luc3RhbnRpYXRlL3VwZGF0ZS9kdXBsaWNhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmFiX3F1ZXJ5IChhY3Rpb246IGdldF9saXN0L2xvYWQvZ2V0X2luZm8vdmFsaWRhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXNzZXRfcXVlcnkgKGFjdGlvbjogZ2V0X2luZm8vZ2V0X2Fzc2V0cy9maW5kX2J5X25hbWUvZ2V0X2RldGFpbHMvcXVlcnlfcGF0aC9xdWVyeV91dWlkL3F1ZXJ5X3VybCksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldF9jcnVkIChhY3Rpb246IGNyZWF0ZS9jb3B5L21vdmUvZGVsZXRlL3NhdmUvcmVpbXBvcnQvaW1wb3J0L3JlZnJlc2gpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJvamVjdF9idWlsZCAoYWN0aW9uOiBnZXRfYnVpbGRfc2V0dGluZ3Mvb3Blbl9idWlsZF9wYW5lbC9jaGVja19idWlsZGVyX3N0YXR1cyksICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdkZWJ1Z19jb25zb2xlIChhY3Rpb246IGdldF9sb2dzL2NsZWFyL2V4ZWN1dGVfc2NyaXB0KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2JhdGNoX2V4ZWN1dGUgKHJ1biBtdWx0aXBsZSBvcGVyYXRpb25zIHNlcXVlbnRpYWxseSBpbiBvbmUgY2FsbCkuJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICByZXN1bHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgY29kZTogZXJyb3IubWVzc2FnZSA9PT0gJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyA/IC0zMjAyOSA6IC0zMjYwMyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gTUNQIFJlc291cmNlcyAtLS1cblxuICAgIHByaXZhdGUgZ2V0UmVzb3VyY2VzTGlzdCgpOiBhbnlbXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdXJpOiAnY29jb3M6Ly9oaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTY2VuZSBIaWVyYXJjaHknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudCBzY2VuZSBub2RlIHRyZWUgc3RydWN0dXJlIChyZWFkLW9ubHkgc25hcHNob3QpJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vc2VsZWN0aW9uJyxcbiAgICAgICAgICAgICAgICBuYW1lOiAnQ3VycmVudCBTZWxlY3Rpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3VycmVudGx5IHNlbGVjdGVkIG5vZGVzL2Fzc2V0cyBpbiB0aGUgZWRpdG9yJyxcbiAgICAgICAgICAgICAgICBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHVyaTogJ2NvY29zOi8vbG9ncy9sYXRlc3QnLFxuICAgICAgICAgICAgICAgIG5hbWU6ICdTZXJ2ZXIgTG9ncycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWNlbnQgTUNQIHNlcnZlciBsb2cgZW50cmllcycsXG4gICAgICAgICAgICAgICAgbWltZVR5cGU6ICd0ZXh0L3BsYWluJ1xuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUmVhZFJlc291cmNlKHVyaTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgbGV0IHBhcnNlZFVyaTogVVJMO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcGFyc2VkVXJpID0gbmV3IFVSTCh1cmkpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZXNvdXJjZSBVUkk6ICR7dXJpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHBhcnNlZFVyaS5wcm90b2NvbCAhPT0gJ2NvY29zOicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvdG9jb2w6ICR7cGFyc2VkVXJpLnByb3RvY29sfS4gRXhwZWN0ZWQgXCJjb2NvczpcImApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzb3VyY2VQYXRoID0gcGFyc2VkVXJpLmhvc3RuYW1lICsgcGFyc2VkVXJpLnBhdGhuYW1lO1xuXG4gICAgICAgIHN3aXRjaCAocmVzb3VyY2VQYXRoKSB7XG4gICAgICAgICAgICBjYXNlICdoaWVyYXJjaHknOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgICAgIGlmICghdHJlZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm8gc2NlbmUgbG9hZGVkJyB9KSB9XSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSB0aGlzLmJ1aWxkUmVzb3VyY2VIaWVyYXJjaHkodHJlZSwgMCwgMTAsIDUwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShoaWVyYXJjaHksIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdzZWxlY3Rpb24nOiB7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yLlNlbGVjdGlvbiBpcyBhIHN5bmNocm9ub3VzIEFQSSBpbiBDb2NvcyBDcmVhdG9yIDMuOC54XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWROb2RlcyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ25vZGUnKSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZEFzc2V0cyA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoJ2Fzc2V0JykgfHwgW107XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXM6IHNlbGVjdGVkTm9kZXMsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0czogc2VsZWN0ZWRBc3NldHNcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGNvbnRlbnRzOiBbeyB1cmksIG1pbWVUeXBlOiAnYXBwbGljYXRpb24vanNvbicsIHRleHQ6IEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpIH1dIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdsb2dzL2xhdGVzdCc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dDb250ZW50ID0gbG9nZ2VyLmdldExvZ0NvbnRlbnQoMjAwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBjb250ZW50czogW3sgdXJpLCBtaW1lVHlwZTogJ3RleHQvcGxhaW4nLCB0ZXh0OiBsb2dDb250ZW50IHx8ICcobm8gbG9ncyB5ZXQpJyB9XSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcmVzb3VyY2U6ICR7dXJpfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBidWlsZFJlc291cmNlSGllcmFyY2h5KG5vZGU6IGFueSwgZGVwdGg6IG51bWJlciwgbWF4RGVwdGg6IG51bWJlciwgbWF4Q2hpbGRyZW46IG51bWJlcik6IGFueSB7XG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuID8gbm9kZS5jaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICAgICAgaWYgKGNoaWxkQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IGBbJHtjaGlsZENvdW50fSBjaGlsZHJlbiwgZGVwdGggbGltaXQgcmVhY2hlZF1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgY29uc3QgdG90YWwgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHNsaWNlID0gbm9kZS5jaGlsZHJlbi5zbGljZSgwLCBtYXhDaGlsZHJlbik7XG4gICAgICAgICAgICBpbmZvLmNoaWxkcmVuID0gc2xpY2UubWFwKChjOiBhbnkpID0+IHRoaXMuYnVpbGRSZXNvdXJjZUhpZXJhcmNoeShjLCBkZXB0aCArIDEsIG1heERlcHRoLCBtYXhDaGlsZHJlbikpO1xuICAgICAgICAgICAgaWYgKHRvdGFsID4gbWF4Q2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBpbmZvLmNoaWxkcmVuVHJ1bmNhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpbmZvLnRvdGFsQ2hpbGRyZW4gPSB0b3RhbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBpbmZvO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlcGFpciBjb21tb24gSlNPTjUtaXNoIG1pc3Rha2VzIHRoYXQgTExNIGNsaWVudHMgc29tZXRpbWVzIGVtaXQuXG4gICAgICpcbiAgICAgKiBUaGlzIHdhbGtzIHRoZSBpbnB1dCBjaGFyYWN0ZXIgYnkgY2hhcmFjdGVyIHNvIHdlIG9ubHkgdG91Y2ggdG9rZW5zXG4gICAgICogd2hlcmUgdGhlIGZpeCBpcyB1bmFtYmlndW91c2x5IGNvcnJlY3QuIFRoZSBwcmV2aW91cyByZWdleC1iYXNlZFxuICAgICAqIHZlcnNpb24gY29ycnVwdGVkIHZhbGlkIGlucHV0IChlLmcuIGl0IHdvdWxkIHJlcGxhY2Ugc2luZ2xlIHF1b3Rlc1xuICAgICAqIGluc2lkZSBzdHJpbmcgbGl0ZXJhbHMgYW5kIGRvdWJsZS1lc2NhcGUgYmFja3NsYXNoZXMpLlxuICAgICAqXG4gICAgICogUmVwYWlycyBhcHBsaWVkOlxuICAgICAqICAtIFRyYWlsaW5nIGNvbW1hcyBiZWZvcmUgYH1gIG9yIGBdYFxuICAgICAqICAtIExpdGVyYWwgbmV3bGluZSAvIENSIC8gdGFiIGluc2lkZSBzdHJpbmcgbGl0ZXJhbHMg4oaSIGBcXG5gL2BcXHJgL2BcXHRgXG4gICAgICogIC0gSlMtc3R5bGUgc2luZ2xlLXF1b3RlZCBzdHJpbmdzIOKGkiBkb3VibGUtcXVvdGVkIHN0cmluZ3NcbiAgICAgKlxuICAgICAqIEFueXRoaW5nIGVsc2UgKHVuYmFsYW5jZWQgcXVvdGVzLCB1bmVzY2FwZWQgYmFja3NsYXNoZXMsIGNvbW1lbnRzKVxuICAgICAqIGlzIGxlZnQgYWxvbmUgc28gdGhlIGNhbGxlcidzIEpTT04ucGFyc2UgZXJyb3Igc3VyZmFjZXMgaG9uZXN0bHkuXG4gICAgICovXG4gICAgcHJpdmF0ZSBmaXhDb21tb25Kc29uSXNzdWVzKGpzb25TdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IG91dDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IGkgPSAwO1xuICAgICAgICBjb25zdCBsZW4gPSBqc29uU3RyLmxlbmd0aDtcblxuICAgICAgICB3aGlsZSAoaSA8IGxlbikge1xuICAgICAgICAgICAgY29uc3QgY2ggPSBqc29uU3RyW2ldO1xuXG4gICAgICAgICAgICBpZiAoY2ggPT09ICdcIicgfHwgY2ggPT09IFwiJ1wiKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcXVvdGUgPSBjaDtcbiAgICAgICAgICAgICAgICBvdXQucHVzaCgnXCInKTtcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgPCBsZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYyA9IGpzb25TdHJbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFxcXCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpICsgMSA8IGxlbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKGMsIGpzb25TdHJbaSArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKGMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSBxdW90ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goJ1wiJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYyA9PT0gJ1xcbicpIHsgb3V0LnB1c2goJ1xcXFxuJyk7IGkrKzsgY29udGludWU7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGMgPT09ICdcXHInKSB7IG91dC5wdXNoKCdcXFxccicpOyBpKys7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjID09PSAnXFx0JykgeyBvdXQucHVzaCgnXFxcXHQnKTsgaSsrOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAocXVvdGUgPT09IFwiJ1wiICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKCdcXFxcXCInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKGMpO1xuICAgICAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY2ggPT09ICcsJykge1xuICAgICAgICAgICAgICAgIGxldCBqID0gaSArIDE7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGogPCBsZW4gJiYgL1xccy8udGVzdChqc29uU3RyW2pdKSkgaisrO1xuICAgICAgICAgICAgICAgIGlmIChqIDwgbGVuICYmIChqc29uU3RyW2pdID09PSAnfScgfHwganNvblN0cltqXSA9PT0gJ10nKSkge1xuICAgICAgICAgICAgICAgICAgICBpID0gajtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBvdXQucHVzaChjaCk7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzdG9wKCk6IHZvaWQge1xuICAgICAgICBmb3IgKGNvbnN0IFtfc2Vzc2lvbklkLCBzdHJlYW1zXSBvZiB0aGlzLnNlc3Npb25TdHJlYW1zLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBbX3N0cmVhbUlkLCBzdHJlYW1dIG9mIHN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmVuZCgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBuby1vcFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgW19pZCwgc3RyZWFtXSBvZiB0aGlzLmxlZ2FjeVNzZVN0cmVhbXMuZW50cmllcygpKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHN0cmVhbS5lbmQoKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIG5vLW9wXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zZXNzaW9uU3RyZWFtcy5jbGVhcigpO1xuICAgICAgICB0aGlzLmxlZ2FjeVNzZVN0cmVhbXMuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5jbGllbnRzLmNsZWFyKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAodGhpcy5odHRwU2VydmVyIGFzIGFueSkuY2xvc2VBbGxDb25uZWN0aW9ucz8uKCk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBjbG9zZUFsbENvbm5lY3Rpb25zIG1heSBub3QgYmUgYXZhaWxhYmxlIGluIG9sZGVyIE5vZGUgdmVyc2lvbnNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdIVFRQIHNlcnZlciBzdG9wcGVkJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiAhIXRoaXMuaHR0cFNlcnZlcixcbiAgICAgICAgICAgIHBvcnQ6IHRoaXMuc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIGNsaWVudHM6IHRoaXMuY2xpZW50cy5zaXplXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTaW1wbGVBUElSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSwgcGF0aG5hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBsZXQgYm9keTogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYm9keSA9IGF3YWl0IHRoaXMucmVhZFJlcXVlc3RCb2R5KHJlcSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQxMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyPy5tZXNzYWdlIHx8ICdSZXF1ZXN0IGJvZHkgdG9vIGxhcmdlJyxcbiAgICAgICAgICAgICAgICB0b29sOiBwYXRobmFtZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgdG9vbCBuYW1lIGZyb20gcGF0aCBsaWtlIC9hcGkvdG9vbC9ub2RlX2xpZmVjeWNsZSBvciBsZWdhY3kgL2FwaS9ub2RlL2xpZmVjeWNsZVxuICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gcGF0aG5hbWUuc3BsaXQoJy8nKS5maWx0ZXIocCA9PiBwKTtcbiAgICAgICAgICAgIGlmIChwYXRoUGFydHMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwKTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIEFQSSBwYXRoLiBVc2UgL2FwaS90b29sL3t0b29sX25hbWV9JyB9KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdXBwb3J0IGJvdGggL2FwaS90b29sL3tuYW1lfSBhbmQgbGVnYWN5IC9hcGkve2NhdGVnb3J5fS97bmFtZX1cbiAgICAgICAgICAgIGxldCBmdWxsVG9vbE5hbWU6IHN0cmluZztcbiAgICAgICAgICAgIGlmIChwYXRoUGFydHNbMV0gPT09ICd0b29sJykge1xuICAgICAgICAgICAgICAgIGZ1bGxUb29sTmFtZSA9IHBhdGhQYXJ0c1syXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZnVsbFRvb2xOYW1lID0gYCR7cGF0aFBhcnRzWzFdfV8ke3BhdGhQYXJ0c1syXX1gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgcGFyYW1zO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBib2R5ID8gSlNPTi5wYXJzZShib2R5KSA6IHt9O1xuICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3VsZFRyeUZpeEpzb24oYm9keSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZml4ZWRCb2R5ID0gdGhpcy5maXhDb21tb25Kc29uSXNzdWVzKGJvZHkpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoZml4ZWRCb2R5KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWNlaXZlZEJvZHk6IGJvZHkuc3Vic3RyaW5nKDAsIDIwMClcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmVucXVldWVUb29sRXhlY3V0aW9uKGZ1bGxUb29sTmFtZSwgcGFyYW1zKTtcblxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0b29sOiBmdWxsVG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgU2ltcGxlIEFQSSBlcnJvcjogJHtlcnJvcn1gKTtcbiAgICAgICAgICAgIGNvbnN0IGlzUXVldWVGdWxsID0gZXJyb3IubWVzc2FnZSA9PT0gJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJztcbiAgICAgICAgICAgIGlmIChpc1F1ZXVlRnVsbCkge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ1JldHJ5LUFmdGVyJywgJzUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoaXNRdWV1ZUZ1bGwgPyA0MjkgOiA1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgdG9vbDogcGF0aG5hbWVcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVhZFJlcXVlc3RCb2R5KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHRvdGFsID0gMDtcblxuICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSBjaHVuay5sZW5ndGg7XG4gICAgICAgICAgICAgICAgaWYgKHRvdGFsID4gTUNQU2VydmVyLk1BWF9SRVFVRVNUX0JPRFlfQllURVMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUmVxdWVzdCBib2R5IGV4Y2VlZHMgJHtNQ1BTZXJ2ZXIuTUFYX1JFUVVFU1RfQk9EWV9CWVRFU30gYnl0ZXNgKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCd1dGY4JykpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlcS5vbignZXJyb3InLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNob3VsZFRyeUZpeEpzb24oYm9keTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghYm9keSB8fCBib2R5Lmxlbmd0aCA+IDI1NiAqIDEwMjQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9keS5pbmNsdWRlcygnXFwnJykgfHwgYm9keS5pbmNsdWRlcygnLH0nKSB8fCBib2R5LmluY2x1ZGVzKCcsXScpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcbicpIHx8IGJvZHkuaW5jbHVkZXMoJ1xcdCcpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZW5xdWV1ZVRvb2xFeGVjdXRpb24odG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgaWYgKHRoaXMudG9vbFF1ZXVlLmxlbmd0aCA+PSBNQ1BTZXJ2ZXIuTUFYX1RPT0xfUVVFVUVfTEVOR1RIKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rvb2wgcXVldWUgaXMgZnVsbCwgcGxlYXNlIHJldHJ5IGxhdGVyJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgdGhpcy50b29sUXVldWUucHVzaCh7XG4gICAgICAgICAgICAgICAgcnVuOiAoKSA9PiB0aGlzLmV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZSwgYXJncyksXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICByZWplY3RcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5wcm9jZXNzTmV4dFRvb2xRdWV1ZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk6IHZvaWQge1xuICAgICAgICB3aGlsZSAodGhpcy5hY3RpdmVUb29sQ291bnQgPCBNQ1BTZXJ2ZXIuTUFYX0NPTkNVUlJFTlRfVE9PTFMgJiYgdGhpcy50b29sUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGFzayA9IHRoaXMudG9vbFF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICBpZiAoIXRhc2spIGJyZWFrO1xuXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudCsrO1xuXG4gICAgICAgICAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYFRvb2wgZXhlY3V0aW9uIHRpbWVvdXQgKCR7TUNQU2VydmVyLlRPT0xfRVhFQ1VUSU9OX1RJTUVPVVRfTVN9bXMpYCkpLCBNQ1BTZXJ2ZXIuVE9PTF9FWEVDVVRJT05fVElNRU9VVF9NUyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUHJvbWlzZS5yYWNlKFt0YXNrLnJ1bigpLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAgICAgICAgICAgLnRoZW4oKHJlc3VsdCkgPT4gdGFzay5yZXNvbHZlKHJlc3VsdCkpXG4gICAgICAgICAgICAgICAgLmNhdGNoKChlcnIpID0+IHRhc2sucmVqZWN0KGVycikpXG4gICAgICAgICAgICAgICAgLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVRvb2xDb3VudC0tO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3NOZXh0VG9vbFF1ZXVlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNpbXBsaWZpZWRUb29sc0xpc3QoKTogYW55W10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubWFwKHRvb2wgPT4ge1xuICAgICAgICAgICAgLy8gRXh0cmFjdCBjYXRlZ29yeSBmcm9tIHRvb2wgbmFtZSAoZmlyc3Qgc2VnbWVudCBiZWZvcmUgXylcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbC5uYW1lLnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhcnRzWzBdO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgYXBpUGF0aDogYC9hcGkvdG9vbC8ke3Rvb2wubmFtZX1gLFxuICAgICAgICAgICAgICAgIGN1cmxFeGFtcGxlOiB0aGlzLmdlbmVyYXRlQ3VybEV4YW1wbGUoY2F0ZWdvcnksIHRvb2wubmFtZSwgdG9vbC5pbnB1dFNjaGVtYSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVDdXJsRXhhbXBsZShjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBzY2hlbWE6IGFueSk6IHN0cmluZyB7XG4gICAgICAgIC8vIEdlbmVyYXRlIHNhbXBsZSBwYXJhbWV0ZXJzIGJhc2VkIG9uIHNjaGVtYVxuICAgICAgICBjb25zdCBzYW1wbGVQYXJhbXMgPSB0aGlzLmdlbmVyYXRlU2FtcGxlUGFyYW1zKHNjaGVtYSk7XG4gICAgICAgIGNvbnN0IGpzb25TdHJpbmcgPSBKU09OLnN0cmluZ2lmeShzYW1wbGVQYXJhbXMsIG51bGwsIDIpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGBjdXJsIC1YIFBPU1QgaHR0cDovLzEyNy4wLjAuMTo4NTg1L2FwaS8ke2NhdGVnb3J5fS8ke3Rvb2xOYW1lfSBcXFxcXG4gIC1IIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIgXFxcXFxuICAtZCAnJHtqc29uU3RyaW5nfSdgO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2VuZXJhdGVTYW1wbGVQYXJhbXMoc2NoZW1hOiBhbnkpOiBhbnkge1xuICAgICAgICBpZiAoIXNjaGVtYSB8fCAhc2NoZW1hLnByb3BlcnRpZXMpIHJldHVybiB7fTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbXBsZTogYW55ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcF0gb2YgT2JqZWN0LmVudHJpZXMoc2NoZW1hLnByb3BlcnRpZXMgYXMgYW55KSkge1xuICAgICAgICAgICAgY29uc3QgcHJvcFNjaGVtYSA9IHByb3AgYXMgYW55O1xuICAgICAgICAgICAgc3dpdGNoIChwcm9wU2NoZW1hLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCAnZXhhbXBsZV9zdHJpbmcnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IHByb3BTY2hlbWEuZGVmYXVsdCB8fCA0MjtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6XG4gICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcFNjaGVtYS5kZWZhdWx0IHx8IHsgeDogMCwgeTogMCwgejogMCB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9ICdleGFtcGxlX3ZhbHVlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2FtcGxlO1xuICAgIH1cblxuICAgIHB1YmxpYyB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3AoKTtcbiAgICAgICAgICAgIHRoaXMuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gSFRUUCB0cmFuc3BvcnQgZG9lc24ndCBuZWVkIHBlcnNpc3RlbnQgY29ubmVjdGlvbnNcbi8vIE1DUCBvdmVyIEhUVFAgdXNlcyByZXF1ZXN0LXJlc3BvbnNlIHBhdHRlcm5cbiJdfQ==