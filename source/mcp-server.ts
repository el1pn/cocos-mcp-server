import * as http from 'http';
import * as url from 'url';
import { randomUUID } from 'crypto';
import { MCPServerSettings, ServerStatus, MCPClient, ToolDefinition } from './types';
import { logger } from './logger';
import { SceneTools } from './tools/scene-tools';
import { NodeTools } from './tools/node-tools';
import { ComponentTools } from './tools/component-tools';
import { PrefabTools } from './tools/prefab-tools';
import { ProjectTools } from './tools/project-tools';
import { DebugTools } from './tools/debug-tools';
import { PreferencesTools } from './tools/preferences-tools';
import { ServerTools } from './tools/server-tools';
import { BroadcastTools } from './tools/broadcast-tools';
import { SceneAdvancedTools } from './tools/scene-advanced-tools';
import { SceneViewTools } from './tools/scene-view-tools';
import { ReferenceImageTools } from './tools/reference-image-tools';
import { AssetAdvancedTools } from './tools/asset-advanced-tools';
import { ValidationTools } from './tools/validation-tools';
import { BatchTools } from './tools/batch-tools';
import { SearchTools } from './tools/search-tools';
import { EditorTools } from './tools/editor-tools';
import { AnimationTools } from './tools/animation-tools';
import { MaterialTools } from './tools/material-tools';

export class MCPServer {
    private static readonly MAX_REQUEST_BODY_BYTES = 5 * 1024 * 1024;
    private static readonly MAX_TOOL_QUEUE_LENGTH = 100;
    private static readonly TOOL_EXECUTION_TIMEOUT_MS = 60_000;
    private static readonly MAX_CONCURRENT_TOOLS = 5;
    private static readonly MAX_PORT_RETRIES = 10;
    private static readonly LATEST_PROTOCOL_VERSION = '2025-11-25';
    private static readonly DEFAULT_PROTOCOL_VERSION = '2025-06-18';
    private static readonly LEGACY_PROTOCOL_VERSION = '2025-03-26';
    private static readonly OLDEST_PROTOCOL_VERSION = '2024-11-05';
    private static readonly SESSION_HEADER = 'Mcp-Session-Id';
    private static readonly PROTOCOL_HEADER = 'MCP-Protocol-Version';
    private static readonly SUPPORTED_PROTOCOL_VERSIONS = new Set([
        MCPServer.LATEST_PROTOCOL_VERSION,
        MCPServer.DEFAULT_PROTOCOL_VERSION,
        MCPServer.LEGACY_PROTOCOL_VERSION,
        MCPServer.OLDEST_PROTOCOL_VERSION
    ]);

    private settings: MCPServerSettings;
    private httpServer: http.Server | null = null;
    private clients: Map<string, MCPClient> = new Map();
    private sessionStreams: Map<string, Map<string, http.ServerResponse>> = new Map();
    private legacySseStreams: Map<string, http.ServerResponse> = new Map();
    private tools: Record<string, any> = {};
    private toolsList: ToolDefinition[] = [];
    private toolExecutors: Map<string, (args: any) => Promise<any>> = new Map();
    private toolQueue: Array<{
        run: () => Promise<any>;
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    }> = [];
    private activeToolCount = 0;

    constructor(settings: MCPServerSettings) {
        this.settings = settings;
        this.initializeTools();
    }

    private initializeTools(): void {
        try {
            logger.info('Initializing tools...');
            this.tools.scene = new SceneTools();
            this.tools.node = new NodeTools();
            this.tools.component = new ComponentTools();
            this.tools.prefab = new PrefabTools();
            this.tools.project = new ProjectTools();
            this.tools.debug = new DebugTools();
            this.tools.preferences = new PreferencesTools();
            this.tools.server = new ServerTools();
            this.tools.broadcast = new BroadcastTools();
            this.tools.sceneAdvanced = new SceneAdvancedTools();
            this.tools.sceneView = new SceneViewTools();
            this.tools.referenceImage = new ReferenceImageTools();
            this.tools.assetAdvanced = new AssetAdvancedTools();
            this.tools.validation = new ValidationTools();
            this.tools.batch = new BatchTools(this.executeToolCall.bind(this));
            this.tools.search = new SearchTools();
            this.tools.editor = new EditorTools();
            this.tools.animation = new AnimationTools();
            this.tools.material = new MaterialTools();
            logger.success('Tools initialized successfully');
        } catch (error) {
            logger.error(`Error initializing tools: ${error}`);
            throw error;
        }
    }

    public async start(): Promise<void> {
        if (this.httpServer) {
            logger.info('Server is already running');
            return;
        }

        let port = this.settings.port;
        let lastError: any;

        for (let attempt = 0; attempt < MCPServer.MAX_PORT_RETRIES; attempt++) {
            try {
                await this.tryListen(port);
                if (port !== this.settings.port) {
                    logger.warn(`Original port ${this.settings.port} was in use, bound to ${port} instead`);
                }
                this.settings.port = port;
                this.setupTools();
                logger.success('MCP Server is ready for connections');
                return;
            } catch (err: any) {
                lastError = err;
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`Port ${port} in use, trying ${port + 1}...`);
                    port++;
                } else {
                    break;
                }
            }
        }

        logger.error(`Failed to start server: ${lastError}`);
        throw lastError;
    }

    private tryListen(port: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const server = http.createServer(this.handleHttpRequest.bind(this));
            server.listen(port, '127.0.0.1', () => {
                this.httpServer = server;
                logger.success(`HTTP server started on http://127.0.0.1:${port}`);
                logger.info(`Health check: http://127.0.0.1:${port}/health`);
                logger.info(`MCP endpoint: http://127.0.0.1:${port}/mcp`);
                resolve();
            });
            server.on('error', (err: any) => {
                server.close();
                reject(err);
            });
        });
    }

    private setupTools(): void {
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
                this.toolExecutors.set(tool.name, (args: any) => toolSet.execute(tool.name, args));
            }
        }

        logger.info(`Setup tools: ${this.toolsList.length} tools available`);
    }

    public async executeToolCall(toolName: string, args: any): Promise<any> {
        const executor = this.toolExecutors.get(toolName);
        if (executor) {
            return await executor(args);
        }

        // Fallback: try to find the tool in any executor
        for (const [_category, toolSet] of Object.entries(this.tools)) {
            const tools = toolSet.getTools();
            if (tools.some((t: any) => t.name === toolName)) {
                return await toolSet.execute(toolName, args);
            }
        }

        throw new Error(`Tool ${toolName} not found`);
    }

    public getClients(): MCPClient[] {
        return Array.from(this.clients.values());
    }
    public getAvailableTools(): ToolDefinition[] {
        return this.toolsList;
    }

    public getSettings(): MCPServerSettings {
        return this.settings;
    }

    public getLogger() {
        return logger;
    }

    private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
            } else if (pathname === '/sse' && req.method === 'GET') {
                this.handleSSEConnection(req, res);
            } else if (pathname === '/messages' && req.method === 'POST') {
                await this.handleSSEMessageRequest(req, res, parsedUrl.query);
            } else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'ok', tools: this.toolsList.length }));
            } else if (pathname?.startsWith('/api/') && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            } else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        } catch (error) {
            logger.error(`HTTP request error: ${error}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }

    private validateRequestOrigin(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        const origin = this.getHeader(req, 'origin');
        if (!origin || origin === 'null') {
            return true;
        }

        if (this.settings.allowedOrigins?.includes('*') || this.settings.allowedOrigins?.includes(origin)) {
            return true;
        }

        try {
            const parsed = new URL(origin);
            if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
                return true;
            }
        } catch {
            // fall through
        }

        res.writeHead(403);
        res.end(JSON.stringify({ error: `Origin not allowed: ${origin}` }));
        return false;
    }

    private getHeader(req: http.IncomingMessage, headerName: string): string | undefined {
        const value = req.headers[headerName.toLowerCase()];
        if (Array.isArray(value)) return value[0];
        return value;
    }

    private acceptsContentType(acceptHeader: string, requiredType: string): boolean {
        if (!acceptHeader) {
            return false;
        }
        const normalized = acceptHeader.toLowerCase();
        return normalized.includes('*/*') || normalized.includes(requiredType.toLowerCase());
    }

    private validateMCPPostHeaders(req: http.IncomingMessage, res: http.ServerResponse): boolean {
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

    private isJsonRpcRequestMessage(message: any): boolean {
        return !!message && typeof message === 'object' && typeof message.method === 'string';
    }

    private isJsonRpcNotification(message: any): boolean {
        return this.isJsonRpcRequestMessage(message) && (message.id === undefined || message.id === null);
    }

    private isJsonRpcResponseMessage(message: any): boolean {
        if (!message || typeof message !== 'object') return false;
        if (typeof message.method === 'string') return false;
        if (message.id === undefined || message.id === null) return false;
        return Object.prototype.hasOwnProperty.call(message, 'result') || Object.prototype.hasOwnProperty.call(message, 'error');
    }

    private async handleMCPTransportRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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

    private handleMCPStreamRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const session = this.validateSessionHeader(req, res, true);
        if (!session) return;

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

        const streamId = randomUUID();
        const sessionStreamSet = this.sessionStreams.get(session.id) || new Map<string, http.ServerResponse>();
        sessionStreamSet.set(streamId, res);
        this.sessionStreams.set(session.id, sessionStreamSet);

        session.lastActivity = new Date();
        this.clients.set(session.id, session);
        res.write(': connected\n\n');

        req.on('close', () => {
            const streams = this.sessionStreams.get(session.id);
            if (!streams) return;
            streams.delete(streamId);
            if (streams.size === 0) {
                this.sessionStreams.delete(session.id);
            }
        });
    }

    private handleMCPDeleteSession(req: http.IncomingMessage, res: http.ServerResponse): void {
        const session = this.validateSessionHeader(req, res, true);
        if (!session) return;

        const streams = this.sessionStreams.get(session.id);
        if (streams) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                } catch {
                    // no-op
                }
            }
            this.sessionStreams.delete(session.id);
        }

        this.clients.delete(session.id);
        res.writeHead(204);
        res.end();
    }

    private setupSSEHeaders(res: http.ServerResponse): void {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
    }

    private static readonly PROTOCOL_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    private negotiateProtocolVersion(messageProtocol: any, headerProtocol?: string): string | null {
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

    private validateSessionHeader(req: http.IncomingMessage, res: http.ServerResponse, required: boolean): MCPClient | null {
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

    private handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse): void {
        const clientId = randomUUID();
        this.setupSSEHeaders(res);
        res.writeHead(200);

        const client: MCPClient = {
            id: clientId,
            lastActivity: new Date(),
            userAgent: req.headers['user-agent']
        };
        this.clients.set(clientId, client);
        this.legacySseStreams.set(clientId, res);

        this.sendSSEEvent(res, 'endpoint', `/messages?sessionId=${encodeURIComponent(clientId)}`);
        res.write(': connected\n\n');
        logger.info(`SSE client connected: ${clientId}`);

        req.on('close', () => {
            this.legacySseStreams.delete(clientId);
            this.clients.delete(clientId);
            logger.info(`SSE client disconnected: ${clientId}`);
        });
    }

    private async handleSSEMessageRequest(req: http.IncomingMessage, res: http.ServerResponse, query: any): Promise<void> {
        const rawSessionId = query?.sessionId;
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

        let body: string;
        try {
            body = await this.readRequestBody(req);
        } catch (err: any) {
            const bodyErrorResponse = {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: -32600,
                    message: err?.message || 'Request body too large'
                }
            };
            this.sendSSEEvent(stream, 'message', JSON.stringify(bodyErrorResponse));
            res.writeHead(202);
            res.end();
            return;
        }

        try {
            let message: any;
            try {
                message = JSON.parse(body);
            } catch (parseError: any) {
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
                const protocolVersion = this.negotiateProtocolVersion(message?.params?.protocolVersion);
                if (!protocolVersion) {
                    const unsupportedResponse = {
                        jsonrpc: '2.0',
                        id: message?.id ?? null,
                        error: {
                            code: -32600,
                            message: `Unsupported protocol version: ${message?.params?.protocolVersion}`
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
                logger.mcp(`Received SSE notification: ${message.method}`);
                res.writeHead(202);
                res.end();
                return;
            }

            const response = await this.handleMessage(message);
            this.sendSSEEvent(stream, 'message', JSON.stringify(response));

            res.writeHead(202);
            res.end();
        } catch (error: any) {
            logger.error(`Error handling SSE request: ${error}`);
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

    private sendSSEEvent(res: http.ServerResponse, event: string, data: string): void {
        res.write(`event: ${event}\n`);
        for (const line of data.split('\n')) {
            res.write(`data: ${line}\n`);
        }
        res.write('\n');
    }
    
    private async handleMCPRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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

        let body: string;
        try {
            body = await this.readRequestBody(req);
        } catch (err: any) {
            res.writeHead(413);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32600, message: err?.message || 'Request body too large' }
            }));
            return;
        }

        try {
            {
                // Enhanced JSON parsing with better error handling
                let message: any;
                try {
                    message = JSON.parse(body);
                } catch (parseError: any) {
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
                        id: message?.id ?? null,
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
                            id: message?.id ?? null,
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

                    const protocolVersion = this.negotiateProtocolVersion(
                        message?.params?.protocolVersion,
                        headerProtocolVersion
                    );
                    if (!protocolVersion) {
                        res.writeHead(400);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: message?.id ?? null,
                            error: {
                                code: -32600,
                                message: `Unsupported protocol version: ${message?.params?.protocolVersion || headerProtocolVersion}`
                            }
                        }));
                        return;
                    }

                    const sessionId = randomUUID();
                    const response = await this.handleMessage(message, { protocolVersion });
                    const isQueueFull = response.error?.code === -32029;
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
                    } else {
                        res.writeHead(200);
                    }
                    res.end(JSON.stringify(response));
                    return;
                }

                const session = this.validateSessionHeader(req, res, true);
                if (!session) return;
                if (!session.initialized) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: message?.id ?? null,
                        error: {
                            code: -32600,
                            message: `Session is not initialized: ${session.id}`
                        }
                    }));
                    return;
                }

                const protocolVersion = this.negotiateProtocolVersion(
                    undefined,
                    headerProtocolVersion || session.protocolVersion
                );
                if (!protocolVersion) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        jsonrpc: '2.0',
                        id: message?.id ?? null,
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
                        id: message?.id ?? null,
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
                    logger.mcp('Received client JSON-RPC response');
                    res.writeHead(202);
                    res.end();
                    return;
                }
                if (isNotification) {
                    logger.mcp(`Received notification: ${message.method}`);
                    res.writeHead(202);
                    res.end();
                    return;
                }

                const response = await this.handleMessage(message, { protocolVersion: session.protocolVersion || protocolVersion });
                const isQueueFull = response.error?.code === -32029;
                if (isQueueFull) {
                    res.setHeader('Retry-After', '5');
                    res.writeHead(429);
                } else {
                    res.writeHead(200);
                }
                res.end(JSON.stringify(response));
            }
        } catch (error: any) {
            logger.error(`Error handling MCP request: ${error}`);
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

    private async handleMessage(message: any, context?: { protocolVersion?: string }): Promise<any> {
        const { id, method, params } = message;

        try {
            let result: any;

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
                    const uri = params?.uri;
                    if (!uri) {
                        throw new Error('Missing required parameter: uri');
                    }
                    result = await this.handleReadResource(uri);
                    break;
                }
                case 'initialize':
                    // MCP initialization
                    result = {
                        protocolVersion: context?.protocolVersion || MCPServer.DEFAULT_PROTOCOL_VERSION,
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
        } catch (error: any) {
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

    private getResourcesList(): any[] {
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

    private async handleReadResource(uri: string): Promise<any> {
        let parsedUri: URL;
        try {
            parsedUri = new URL(uri);
        } catch {
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
                const logContent = logger.getLogContent(200);
                return { contents: [{ uri, mimeType: 'text/plain', text: logContent || '(no logs yet)' }] };
            }
            default:
                throw new Error(`Unknown resource: ${uri}`);
        }
    }

    private buildResourceHierarchy(node: any, depth: number, maxDepth: number, maxChildren: number): any {
        const info: any = {
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
            info.children = slice.map((c: any) => this.buildResourceHierarchy(c, depth + 1, maxDepth, maxChildren));
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
    private fixCommonJsonIssues(jsonStr: string): string {
        const out: string[] = [];
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
                        } else {
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
                    if (c === '\n') { out.push('\\n'); i++; continue; }
                    if (c === '\r') { out.push('\\r'); i++; continue; }
                    if (c === '\t') { out.push('\\t'); i++; continue; }
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
                while (j < len && /\s/.test(jsonStr[j])) j++;
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

    public stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            logger.info('HTTP server stopped');
        }

        for (const [_sessionId, streams] of this.sessionStreams.entries()) {
            for (const [_streamId, stream] of streams.entries()) {
                try {
                    stream.end();
                } catch {
                    // no-op
                }
            }
        }

        for (const [_id, stream] of this.legacySseStreams.entries()) {
            try {
                stream.end();
            } catch {
                // no-op
            }
        }
        this.sessionStreams.clear();
        this.legacySseStreams.clear();
        this.clients.clear();
    }

    public getStatus(): ServerStatus {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: this.clients.size
        };
    }

    private async handleSimpleAPIRequest(req: http.IncomingMessage, res: http.ServerResponse, pathname: string): Promise<void> {
        let body: string;
        try {
            body = await this.readRequestBody(req);
        } catch (err: any) {
            res.writeHead(413);
            res.end(JSON.stringify({
                success: false,
                error: err?.message || 'Request body too large',
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
            let fullToolName: string;
            if (pathParts[1] === 'tool') {
                fullToolName = pathParts[2];
            } else {
                fullToolName = `${pathParts[1]}_${pathParts[2]}`;
            }

            let params;
            try {
                params = body ? JSON.parse(body) : {};
            } catch (parseError: any) {
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
                } catch {
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
        } catch (error: any) {
            logger.error(`Simple API error: ${error}`);
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

    private async readRequestBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let total = 0;

            req.on('data', (chunk: Buffer) => {
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

    private shouldTryFixJson(body: string): boolean {
        if (!body || body.length > 256 * 1024) {
            return false;
        }
        return body.includes('\'') || body.includes(',}') || body.includes(',]') || body.includes('\n') || body.includes('\t');
    }

    private async enqueueToolExecution(toolName: string, args: any): Promise<any> {
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

    private processNextToolQueue(): void {
        while (this.activeToolCount < MCPServer.MAX_CONCURRENT_TOOLS && this.toolQueue.length > 0) {
            const task = this.toolQueue.shift();
            if (!task) break;

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

    private getSimplifiedToolsList(): any[] {
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

    private generateCurlExample(category: string, toolName: string, schema: any): string {
        // Generate sample parameters based on schema
        const sampleParams = this.generateSampleParams(schema);
        const jsonString = JSON.stringify(sampleParams, null, 2);
        
        return `curl -X POST http://127.0.0.1:8585/api/${category}/${toolName} \\
  -H "Content-Type: application/json" \\
  -d '${jsonString}'`;
    }

    private generateSampleParams(schema: any): any {
        if (!schema || !schema.properties) return {};
        
        const sample: any = {};
        for (const [key, prop] of Object.entries(schema.properties as any)) {
            const propSchema = prop as any;
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

    public updateSettings(settings: MCPServerSettings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
}

// HTTP transport doesn't need persistent connections
// MCP over HTTP uses request-response pattern
