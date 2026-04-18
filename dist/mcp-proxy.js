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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXByb3h5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL21jcC1wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkNBQTZCO0FBRTdCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVuRixTQUFTLFFBQVEsQ0FBQyxHQUFXO0lBQ3pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsR0FBVztJQUM3QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxFQUEwQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3hFLFlBQVksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxjQUFjLENBQUMsT0FBWTs7SUFDaEMsTUFBTSxFQUFFLEdBQUcsTUFBQSxPQUFPLENBQUMsRUFBRSxtQ0FBSSxJQUFJLENBQUM7SUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUNwQjtRQUNJLFFBQVEsRUFBRSxXQUFXO1FB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QUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU3QyxRQUFRLENBQUMsaURBQWlELFVBQVUsTUFBTSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogTUNQIFN0ZGlvLXRvLUhUVFAgUHJveHkgZm9yIENvY29zIE1DUCBTZXJ2ZXJcclxuICpcclxuICogQnJpZGdlcyBNQ1AgY2xpZW50cyB0aGF0IHVzZSBzdGRpbyB0cmFuc3BvcnQgKENsYXVkZSBEZXNrdG9wLCBDdXJzb3IsIGV0Yy4pXHJcbiAqIHRvIHRoZSBIVFRQIHNlcnZlciBydW5uaW5nIGluc2lkZSBDb2NvcyBDcmVhdG9yLlxyXG4gKlxyXG4gKiBVc2FnZTpcclxuICogICBub2RlIGRpc3QvbWNwLXByb3h5LmpzIFtwb3J0XVxyXG4gKiAgIE1DUF9QT1JUPTMwMDAgbm9kZSBkaXN0L21jcC1wcm94eS5qc1xyXG4gKlxyXG4gKiBDbGF1ZGUgRGVza3RvcCBjb25maWcgZXhhbXBsZSAoQ29jb3MgQ3JlYXRvciAzLngpOlxyXG4gKiAgIHtcclxuICogICAgIFwibWNwU2VydmVyc1wiOiB7XHJcbiAqICAgICAgIFwiY29jb3MtY3JlYXRvci0zeFwiOiB7XHJcbiAqICAgICAgICAgXCJjb21tYW5kXCI6IFwibm9kZVwiLFxyXG4gKiAgICAgICAgIFwiYXJnc1wiOiBbXCIvcGF0aC90by9jb2Nvcy1tY3Atc2VydmVyL2Rpc3QvbWNwLXByb3h5LmpzXCIsIFwiMzAwMFwiXVxyXG4gKiAgICAgICB9XHJcbiAqICAgICB9XHJcbiAqICAgfVxyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XHJcblxyXG5jb25zdCBDT0NPU19QT1JUID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuTUNQX1BPUlQgfHwgcHJvY2Vzcy5hcmd2WzJdIHx8ICczMDAwJywgMTApO1xyXG5cclxuZnVuY3Rpb24gZGVidWdMb2cobXNnOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbbWNwLXByb3h5XSAke21zZ31cXG5gKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2VuZFJlc3BvbnNlKG9iajogb2JqZWN0KTogdm9pZCB7XHJcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeShvYmopICsgJ1xcbicpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZW5kRXJyb3IoaWQ6IHN0cmluZyB8IG51bWJlciB8IG51bGwsIGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBzZW5kUmVzcG9uc2UoeyBqc29ucnBjOiAnMi4wJywgaWQsIGVycm9yOiB7IGNvZGUsIG1lc3NhZ2UgfSB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvcndhcmQgYSBKU09OLVJQQyBtZXNzYWdlIHRvIHRoZSBDb2NvcyBDcmVhdG9yIEhUVFAgc2VydmVyIGF0IC9tY3BcclxuICovXHJcbmZ1bmN0aW9uIGZvcndhcmRUb0NvY29zKG1lc3NhZ2U6IGFueSk6IHZvaWQge1xyXG4gICAgY29uc3QgaWQgPSBtZXNzYWdlLmlkID8/IG51bGw7XHJcbiAgICBjb25zdCBwb3N0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2UpO1xyXG5cclxuICAgIGNvbnN0IHJlcSA9IGh0dHAucmVxdWVzdChcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGhvc3RuYW1lOiAnMTI3LjAuMC4xJyxcclxuICAgICAgICAgICAgcG9ydDogQ09DT1NfUE9SVCxcclxuICAgICAgICAgICAgcGF0aDogJy9tY3AnLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgICAgICdDb250ZW50LUxlbmd0aCc6IEJ1ZmZlci5ieXRlTGVuZ3RoKHBvc3REYXRhKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIChyZXMpID0+IHtcclxuICAgICAgICAgICAgbGV0IGRhdGEgPSAnJztcclxuICAgICAgICAgICAgcmVzLm9uKCdkYXRhJywgKGNodW5rKSA9PiAoZGF0YSArPSBjaHVuaykpO1xyXG4gICAgICAgICAgICByZXMub24oJ2VuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMgKG5vIGlkKSByZWNlaXZlIDIwMiDigJQgbm8gcmVzcG9uc2UgbmVlZGVkIG9uIHN0ZG91dFxyXG4gICAgICAgICAgICAgICAgaWYgKGlkID09PSBudWxsIHx8IGlkID09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UocmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdMb2coYEludmFsaWQgSlNPTiBmcm9tIHNlcnZlcjogJHtkYXRhLnN1YnN0cmluZygwLCAyMDApfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbmRFcnJvcihpZCwgLTMyNjAzLCAnSW52YWxpZCByZXNwb25zZSBmcm9tIENvY29zIENyZWF0b3InKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICk7XHJcblxyXG4gICAgcmVxLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgZGVidWdMb2coYENvY29zIENyZWF0b3Igb2ZmbGluZTogJHtlcnIubWVzc2FnZX1gKTtcclxuICAgICAgICBpZiAoaWQgIT09IG51bGwgJiYgaWQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBzZW5kRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgIC0zMjAwMCxcclxuICAgICAgICAgICAgICAgIGBDb2NvcyBDcmVhdG9yIGlzIG5vdCBydW5uaW5nIG9yIE1DUCBzZXJ2ZXIgaXMgbm90IHN0YXJ0ZWQgKHBvcnQgJHtDT0NPU19QT1JUfSlgLFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIHJlcS53cml0ZShwb3N0RGF0YSk7XHJcbiAgICByZXEuZW5kKCk7XHJcbn1cclxuXHJcbi8vIC0tLSBTdGRpbiBsaW5lLWJ1ZmZlcmVkIHJlYWRlciAtLS1cclxuXHJcbmxldCBidWZmZXIgPSAnJztcclxuXHJcbnByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcclxucHJvY2Vzcy5zdGRpbi5vbignZGF0YScsIChjaHVuazogc3RyaW5nKSA9PiB7XHJcbiAgICBidWZmZXIgKz0gY2h1bms7XHJcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgnXFxuJyk7XHJcbiAgICBidWZmZXIgPSBsaW5lcy5wb3AoKSB8fCAnJztcclxuXHJcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICBjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcbiAgICAgICAgaWYgKCF0cmltbWVkKSBjb250aW51ZTtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5wYXJzZSh0cmltbWVkKTtcclxuICAgICAgICAgICAgZm9yd2FyZFRvQ29jb3MobWVzc2FnZSk7XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIElnbm9yZSBub24tSlNPTiBpbnB1dFxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7XHJcblxyXG5wcm9jZXNzLnN0ZGluLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICBkZWJ1Z0xvZygnc3RkaW4gY2xvc2VkLCBzaHV0dGluZyBkb3duJyk7XHJcbiAgICBwcm9jZXNzLmV4aXQoMCk7XHJcbn0pO1xyXG5cclxucHJvY2Vzcy5vbignU0lHSU5UJywgKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcclxucHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XHJcblxyXG5kZWJ1Z0xvZyhgUHJveHkgc3RhcnRlZCwgZm9yd2FyZGluZyB0byBodHRwOi8vMTI3LjAuMC4xOiR7Q09DT1NfUE9SVH0vbWNwYCk7XHJcbiJdfQ==