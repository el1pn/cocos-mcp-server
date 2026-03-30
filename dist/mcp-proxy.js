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
 * Claude Desktop config example:
 *   {
 *     "mcpServers": {
 *       "cocos-creator": {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXByb3h5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL21jcC1wcm94eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsMkNBQTZCO0FBRTdCLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztBQUVuRixTQUFTLFFBQVEsQ0FBQyxHQUFXO0lBQ3pCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUNqRCxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsR0FBVztJQUM3QixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxFQUEwQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3hFLFlBQVksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDbkUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxjQUFjLENBQUMsT0FBWTs7SUFDaEMsTUFBTSxFQUFFLEdBQUcsTUFBQSxPQUFPLENBQUMsRUFBRSxtQ0FBSSxJQUFJLENBQUM7SUFDOUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUV6QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUNwQjtRQUNJLFFBQVEsRUFBRSxXQUFXO1FB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QUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUU3QyxRQUFRLENBQUMsaURBQWlELFVBQVUsTUFBTSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1DUCBTdGRpby10by1IVFRQIFByb3h5IGZvciBDb2NvcyBNQ1AgU2VydmVyXG4gKlxuICogQnJpZGdlcyBNQ1AgY2xpZW50cyB0aGF0IHVzZSBzdGRpbyB0cmFuc3BvcnQgKENsYXVkZSBEZXNrdG9wLCBDdXJzb3IsIGV0Yy4pXG4gKiB0byB0aGUgSFRUUCBzZXJ2ZXIgcnVubmluZyBpbnNpZGUgQ29jb3MgQ3JlYXRvci5cbiAqXG4gKiBVc2FnZTpcbiAqICAgbm9kZSBkaXN0L21jcC1wcm94eS5qcyBbcG9ydF1cbiAqICAgTUNQX1BPUlQ9MzAwMCBub2RlIGRpc3QvbWNwLXByb3h5LmpzXG4gKlxuICogQ2xhdWRlIERlc2t0b3AgY29uZmlnIGV4YW1wbGU6XG4gKiAgIHtcbiAqICAgICBcIm1jcFNlcnZlcnNcIjoge1xuICogICAgICAgXCJjb2Nvcy1jcmVhdG9yXCI6IHtcbiAqICAgICAgICAgXCJjb21tYW5kXCI6IFwibm9kZVwiLFxuICogICAgICAgICBcImFyZ3NcIjogW1wiL3BhdGgvdG8vY29jb3MtbWNwLXNlcnZlci9kaXN0L21jcC1wcm94eS5qc1wiLCBcIjMwMDBcIl1cbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIH1cbiAqL1xuXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xuXG5jb25zdCBDT0NPU19QT1JUID0gcGFyc2VJbnQocHJvY2Vzcy5lbnYuTUNQX1BPUlQgfHwgcHJvY2Vzcy5hcmd2WzJdIHx8ICczMDAwJywgMTApO1xuXG5mdW5jdGlvbiBkZWJ1Z0xvZyhtc2c6IHN0cmluZyk6IHZvaWQge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBbbWNwLXByb3h5XSAke21zZ31cXG5gKTtcbn1cblxuZnVuY3Rpb24gc2VuZFJlc3BvbnNlKG9iajogb2JqZWN0KTogdm9pZCB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoSlNPTi5zdHJpbmdpZnkob2JqKSArICdcXG4nKTtcbn1cblxuZnVuY3Rpb24gc2VuZEVycm9yKGlkOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsLCBjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIHNlbmRSZXNwb25zZSh7IGpzb25ycGM6ICcyLjAnLCBpZCwgZXJyb3I6IHsgY29kZSwgbWVzc2FnZSB9IH0pO1xufVxuXG4vKipcbiAqIEZvcndhcmQgYSBKU09OLVJQQyBtZXNzYWdlIHRvIHRoZSBDb2NvcyBDcmVhdG9yIEhUVFAgc2VydmVyIGF0IC9tY3BcbiAqL1xuZnVuY3Rpb24gZm9yd2FyZFRvQ29jb3MobWVzc2FnZTogYW55KTogdm9pZCB7XG4gICAgY29uc3QgaWQgPSBtZXNzYWdlLmlkID8/IG51bGw7XG4gICAgY29uc3QgcG9zdERhdGEgPSBKU09OLnN0cmluZ2lmeShtZXNzYWdlKTtcblxuICAgIGNvbnN0IHJlcSA9IGh0dHAucmVxdWVzdChcbiAgICAgICAge1xuICAgICAgICAgICAgaG9zdG5hbWU6ICcxMjcuMC4wLjEnLFxuICAgICAgICAgICAgcG9ydDogQ09DT1NfUE9SVCxcbiAgICAgICAgICAgIHBhdGg6ICcvbWNwJyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJzogQnVmZmVyLmJ5dGVMZW5ndGgocG9zdERhdGEpLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgKHJlcykgPT4ge1xuICAgICAgICAgICAgbGV0IGRhdGEgPSAnJztcbiAgICAgICAgICAgIHJlcy5vbignZGF0YScsIChjaHVuaykgPT4gKGRhdGEgKz0gY2h1bmspKTtcbiAgICAgICAgICAgIHJlcy5vbignZW5kJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMgKG5vIGlkKSByZWNlaXZlIDIwMiDigJQgbm8gcmVzcG9uc2UgbmVlZGVkIG9uIHN0ZG91dFxuICAgICAgICAgICAgICAgIGlmIChpZCA9PT0gbnVsbCB8fCBpZCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbmRSZXNwb25zZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIGRlYnVnTG9nKGBJbnZhbGlkIEpTT04gZnJvbSBzZXJ2ZXI6ICR7ZGF0YS5zdWJzdHJpbmcoMCwgMjAwKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgc2VuZEVycm9yKGlkLCAtMzI2MDMsICdJbnZhbGlkIHJlc3BvbnNlIGZyb20gQ29jb3MgQ3JlYXRvcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICk7XG5cbiAgICByZXEub24oJ2Vycm9yJywgKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgZGVidWdMb2coYENvY29zIENyZWF0b3Igb2ZmbGluZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgaWYgKGlkICE9PSBudWxsICYmIGlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNlbmRFcnJvcihcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICAtMzIwMDAsXG4gICAgICAgICAgICAgICAgYENvY29zIENyZWF0b3IgaXMgbm90IHJ1bm5pbmcgb3IgTUNQIHNlcnZlciBpcyBub3Qgc3RhcnRlZCAocG9ydCAke0NPQ09TX1BPUlR9KWAsXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXEud3JpdGUocG9zdERhdGEpO1xuICAgIHJlcS5lbmQoKTtcbn1cblxuLy8gLS0tIFN0ZGluIGxpbmUtYnVmZmVyZWQgcmVhZGVyIC0tLVxuXG5sZXQgYnVmZmVyID0gJyc7XG5cbnByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcoJ3V0ZjgnKTtcbnByb2Nlc3Muc3RkaW4ub24oJ2RhdGEnLCAoY2h1bms6IHN0cmluZykgPT4ge1xuICAgIGJ1ZmZlciArPSBjaHVuaztcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgnXFxuJyk7XG4gICAgYnVmZmVyID0gbGluZXMucG9wKCkgfHwgJyc7XG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGxpbmUudHJpbSgpO1xuICAgICAgICBpZiAoIXRyaW1tZWQpIGNvbnRpbnVlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IEpTT04ucGFyc2UodHJpbW1lZCk7XG4gICAgICAgICAgICBmb3J3YXJkVG9Db2NvcyhtZXNzYWdlKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgbm9uLUpTT04gaW5wdXRcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5wcm9jZXNzLnN0ZGluLm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgZGVidWdMb2coJ3N0ZGluIGNsb3NlZCwgc2h1dHRpbmcgZG93bicpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbn0pO1xuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiBwcm9jZXNzLmV4aXQoMCkpO1xucHJvY2Vzcy5vbignU0lHVEVSTScsICgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XG5cbmRlYnVnTG9nKGBQcm94eSBzdGFydGVkLCBmb3J3YXJkaW5nIHRvIGh0dHA6Ly8xMjcuMC4wLjE6JHtDT0NPU19QT1JUfS9tY3BgKTtcbiJdfQ==