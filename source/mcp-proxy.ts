/**
 * MCP Stdio-to-HTTP Proxy for Cocos MCP Server
 *
 * Bridges MCP clients that use stdio transport (Claude Desktop, Cursor, etc.)
 * to the HTTP server running inside Cocos Creator.
 *
 * Usage:
 *   node dist/mcp-proxy.js [port]
 *   MCP_PORT=3000 node dist/mcp-proxy.js
 *
 * Claude Desktop config example (Cocos Creator 3.x):
 *   {
 *     "mcpServers": {
 *       "cocos-creator-3x": {
 *         "command": "node",
 *         "args": ["/path/to/cocos-mcp-server/dist/mcp-proxy.js", "3000"]
 *       }
 *     }
 *   }
 */

import * as http from 'http';

const COCOS_PORT = parseInt(process.env.MCP_PORT || process.argv[2] || '3000', 10);

function debugLog(msg: string): void {
    process.stderr.write(`[mcp-proxy] ${msg}\n`);
}

function sendResponse(obj: object): void {
    process.stdout.write(JSON.stringify(obj) + '\n');
}

function sendError(id: string | number | null, code: number, message: string): void {
    sendResponse({ jsonrpc: '2.0', id, error: { code, message } });
}

/**
 * Forward a JSON-RPC message to the Cocos Creator HTTP server at /mcp
 */
function forwardToCocos(message: any): void {
    const id = message.id ?? null;
    const postData = JSON.stringify(message);

    const req = http.request(
        {
            hostname: '127.0.0.1',
            port: COCOS_PORT,
            path: '/mcp',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        },
        (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                // Notifications (no id) receive 202 — no response needed on stdout
                if (id === null || id === undefined) return;

                try {
                    const response = JSON.parse(data);
                    sendResponse(response);
                } catch {
                    debugLog(`Invalid JSON from server: ${data.substring(0, 200)}`);
                    sendError(id, -32603, 'Invalid response from Cocos Creator');
                }
            });
        },
    );

    req.on('error', (err: Error) => {
        debugLog(`Cocos Creator offline: ${err.message}`);
        if (id !== null && id !== undefined) {
            sendError(
                id,
                -32000,
                `Cocos Creator is not running or MCP server is not started (port ${COCOS_PORT})`,
            );
        }
    });

    req.write(postData);
    req.end();
}

// --- Stdin line-buffered reader ---

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const message = JSON.parse(trimmed);
            forwardToCocos(message);
        } catch {
            // Ignore non-JSON input
        }
    }
});

process.stdin.on('end', () => {
    debugLog('stdin closed, shutting down');
    process.exit(0);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

debugLog(`Proxy started, forwarding to http://127.0.0.1:${COCOS_PORT}/mcp`);
