"use strict";
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
const http = __importStar(require("http"));
const COCOS_PORT = parseInt(process.env.MCP_PORT || process.argv[2] || '3000', 10);
function debugLog(msg) {
    process.stderr.write(`[mcp-proxy] ${msg}\n`);
}
function sendResponse(obj) {
    process.stdout.write(JSON.stringify(obj) + '\n');
}
function sendError(id, code, message) {
    sendResponse({ jsonrpc: '2.0', id, error: { code, message } });
}
/**
 * Forward a JSON-RPC message to the Cocos Creator HTTP server at /mcp
 */
function forwardToCocos(message) {
    var _a;
    const id = (_a = message.id) !== null && _a !== void 0 ? _a : null;
    const postData = JSON.stringify(message);
    const req = http.request({
        hostname: '127.0.0.1',
        port: COCOS_PORT,
        path: '/mcp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
        },
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
            // Notifications (no id) receive 202 — no response needed on stdout
            if (id === null || id === undefined)
                return;
            try {
                const response = JSON.parse(data);
                sendResponse(response);
            }
            catch (_a) {
                debugLog(`Invalid JSON from server: ${data.substring(0, 200)}`);
                sendError(id, -32603, 'Invalid response from Cocos Creator');
            }
        });
    });
    req.on('error', (err) => {
        debugLog(`Cocos Creator offline: ${err.message}`);
        if (id !== null && id !== undefined) {
            sendError(id, -32000, `Cocos Creator is not running or MCP server is not started (port ${COCOS_PORT})`);
        }
    });
    req.write(postData);
    req.end();
}
// --- Stdin line-buffered reader ---
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        try {
            const message = JSON.parse(trimmed);
            forwardToCocos(message);
        }
        catch (_a) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXByb3h5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL21jcC1wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkNBQTZCO0FBRTdCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVuRixTQUFTLFFBQVEsQ0FBQyxHQUFXO0lBQ3pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsR0FBVztJQUM3QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxFQUEwQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3hFLFlBQVksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxjQUFjLENBQUMsT0FBWTs7SUFDaEMsTUFBTSxFQUFFLEdBQUcsTUFBQSxPQUFPLENBQUMsRUFBRSxtQ0FBSSxJQUFJLENBQUM7SUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUNwQjtRQUNJLFFBQVEsRUFBRSxXQUFXO1FB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QUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU3QyxRQUFRLENBQUMsaURBQWlELFVBQVUsTUFBTSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1DUCBTdGRpby10by1IVFRQIFByb3h5IGZvciBDb2NvcyBNQ1AgU2VydmVyXG4gKlxuICogQnJpZGdlcyBNQ1AgY2xpZW50cyB0aGF0IHVzZSBzdGRpbyB0cmFuc3BvcnQgKENsYXVkZSBEZXNrdG9wLCBDdXJzb3IsIGV0Yy4pXG4gKiB0byB0aGUgSFRUUCBzZXJ2ZXIgcnVubmluZyBpbnNpZGUgQ29jb3MgQ3JlYXRvci5cbiAqXG4gKiBVc2FnZTpcbiAqICAgbm9kZSBkaXN0L21jcC1wcm94eS5qcyBbcG9ydF1cbiAqICAgTUNQX1BPUlQ9MzAwMCBub2RlIGRpc3QvbWNwLXByb3h5LmpzXG4gKlxuICogQ2xhdWRlIERlc2t0b3AgY29uZmlnIGV4YW1wbGUgKENvY29zIENyZWF0b3IgMy54KTpcbiAqICAge1xuICogICAgIFwibWNwU2VydmVyc1wiOiB7XG4gKiAgICAgICBcImNvY29zLWNyZWF0b3ItM3hcIjoge1xuICogICAgICAgICBcImNvbW1hbmRcIjogXCJub2RlXCIsXG4gKiAgICAgICAgIFwiYXJnc1wiOiBbXCIvcGF0aC90by9jb2Nvcy1tY3Atc2VydmVyL2Rpc3QvbWNwLXByb3h5LmpzXCIsIFwiMzAwMFwiXVxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgfVxuICovXG5cbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5cbmNvbnN0IENPQ09TX1BPUlQgPSBwYXJzZUludChwcm9jZXNzLmVudi5NQ1BfUE9SVCB8fCBwcm9jZXNzLmFyZ3ZbMl0gfHwgJzMwMDAnLCAxMCk7XG5cbmZ1bmN0aW9uIGRlYnVnTG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYFttY3AtcHJveHldICR7bXNnfVxcbmApO1xufVxuXG5mdW5jdGlvbiBzZW5kUmVzcG9uc2Uob2JqOiBvYmplY3QpOiB2b2lkIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShvYmopICsgJ1xcbicpO1xufVxuXG5mdW5jdGlvbiBzZW5kRXJyb3IoaWQ6IHN0cmluZyB8IG51bWJlciB8IG51bGwsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgc2VuZFJlc3BvbnNlKHsganNvbnJwYzogJzIuMCcsIGlkLCBlcnJvcjogeyBjb2RlLCBtZXNzYWdlIH0gfSk7XG59XG5cbi8qKlxuICogRm9yd2FyZCBhIEpTT04tUlBDIG1lc3NhZ2UgdG8gdGhlIENvY29zIENyZWF0b3IgSFRUUCBzZXJ2ZXIgYXQgL21jcFxuICovXG5mdW5jdGlvbiBmb3J3YXJkVG9Db2NvcyhtZXNzYWdlOiBhbnkpOiB2b2lkIHtcbiAgICBjb25zdCBpZCA9IG1lc3NhZ2UuaWQgPz8gbnVsbDtcbiAgICBjb25zdCBwb3N0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpO1xuXG4gICAgY29uc3QgcmVxID0gaHR0cC5yZXF1ZXN0KFxuICAgICAgICB7XG4gICAgICAgICAgICBob3N0bmFtZTogJzEyNy4wLjAuMScsXG4gICAgICAgICAgICBwb3J0OiBDT0NPU19QT1JULFxuICAgICAgICAgICAgcGF0aDogJy9tY3AnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAgICAgICAnQ29udGVudC1MZW5ndGgnOiBCdWZmZXIuYnl0ZUxlbmd0aChwb3N0RGF0YSksXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAocmVzKSA9PiB7XG4gICAgICAgICAgICBsZXQgZGF0YSA9ICcnO1xuICAgICAgICAgICAgcmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiAoZGF0YSArPSBjaHVuaykpO1xuICAgICAgICAgICAgcmVzLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTm90aWZpY2F0aW9ucyAobm8gaWQpIHJlY2VpdmUgMjAyIOKAlCBubyByZXNwb25zZSBuZWVkZWQgb24gc3Rkb3V0XG4gICAgICAgICAgICAgICAgaWYgKGlkID09PSBudWxsIHx8IGlkID09PSB1bmRlZmluZWQpIHJldHVybjtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgZGVidWdMb2coYEludmFsaWQgSlNPTiBmcm9tIHNlcnZlcjogJHtkYXRhLnN1YnN0cmluZygwLCAyMDApfWApO1xuICAgICAgICAgICAgICAgICAgICBzZW5kRXJyb3IoaWQsIC0zMjYwMywgJ0ludmFsaWQgcmVzcG9uc2UgZnJvbSBDb2NvcyBDcmVhdG9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgKTtcblxuICAgIHJlcS5vbignZXJyb3InLCAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICBkZWJ1Z0xvZyhgQ29jb3MgQ3JlYXRvciBvZmZsaW5lOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICBpZiAoaWQgIT09IG51bGwgJiYgaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2VuZEVycm9yKFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIC0zMjAwMCxcbiAgICAgICAgICAgICAgICBgQ29jb3MgQ3JlYXRvciBpcyBub3QgcnVubmluZyBvciBNQ1Agc2VydmVyIGlzIG5vdCBzdGFydGVkIChwb3J0ICR7Q09DT1NfUE9SVH0pYCxcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJlcS53cml0ZShwb3N0RGF0YSk7XG4gICAgcmVxLmVuZCgpO1xufVxuXG4vLyAtLS0gU3RkaW4gbGluZS1idWZmZXJlZCByZWFkZXIgLS0tXG5cbmxldCBidWZmZXIgPSAnJztcblxucHJvY2Vzcy5zdGRpbi5zZXRFbmNvZGluZygndXRmOCcpO1xucHJvY2Vzcy5zdGRpbi5vbignZGF0YScsIChjaHVuazogc3RyaW5nKSA9PiB7XG4gICAgYnVmZmVyICs9IGNodW5rO1xuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKTtcbiAgICBidWZmZXIgPSBsaW5lcy5wb3AoKSB8fCAnJztcblxuICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XG4gICAgICAgIGlmICghdHJpbW1lZCkgY29udGludWU7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5wYXJzZSh0cmltbWVkKTtcbiAgICAgICAgICAgIGZvcndhcmRUb0NvY29zKG1lc3NhZ2UpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBub24tSlNPTiBpbnB1dFxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnByb2Nlc3Muc3RkaW4ub24oJ2VuZCcsICgpID0+IHtcbiAgICBkZWJ1Z0xvZygnc3RkaW4gY2xvc2VkLCBzaHV0dGluZyBkb3duJyk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xufSk7XG5cbnByb2Nlc3Mub24oJ1NJR0lOVCcsICgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XG5wcm9jZXNzLm9uKCdTSUdURVJNJywgKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcblxuZGVidWdMb2coYFByb3h5IHN0YXJ0ZWQsIGZvcndhcmRpbmcgdG8gaHR0cDovLzEyNy4wLjAuMToke0NPQ09TX1BPUlR9L21jcGApO1xuIl19