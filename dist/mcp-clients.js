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
exports.MCP_CLIENT_TARGETS = exports.CLAUDE_CODE_TARGET = void 0;
exports.registerMcpEntry = registerMcpEntry;
exports.registerAllMcpClients = registerAllMcpClients;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
exports.CLAUDE_CODE_TARGET = {
    name: 'claude-code',
    configPath: path.join(os.homedir(), '.claude.json'),
    entryKey: 'cocos-creator-3x',
    resolveMcpServers(data, projectPath) {
        var _a, _b;
        const project = (_a = data.projects) === null || _a === void 0 ? void 0 : _a[projectPath];
        if (!project)
            return null;
        (_b = project.mcpServers) !== null && _b !== void 0 ? _b : (project.mcpServers = {});
        return project.mcpServers;
    },
    buildEntry(port) {
        return { type: 'http', url: `http://127.0.0.1:${port}/mcp` };
    },
};
/** All clients to self-register with. Add a client by adding an entry here. */
exports.MCP_CLIENT_TARGETS = [exports.CLAUDE_CODE_TARGET];
const RENAME_RETRY_DELAYS_MS = [25, 50, 100, 200, 400];
const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const renameRetrySignal = new Int32Array(new SharedArrayBuffer(4));
function renameWithRetry(source, destination) {
    for (let attempt = 0;; attempt++) {
        try {
            fs.renameSync(source, destination);
            return;
        }
        catch (error) {
            const code = error.code;
            const delay = RENAME_RETRY_DELAYS_MS[attempt];
            if (!delay || !code || !RENAME_RETRY_CODES.has(code)) {
                throw error;
            }
            Atomics.wait(renameRetrySignal, 0, 0, delay);
        }
    }
}
/** Best-effort: never throws, only logs. This is a convenience side-effect, not the source of truth. */
function registerMcpEntry(target, projectPath, port, opts = {}) {
    var _a;
    const verbose = (_a = opts.verbose) !== null && _a !== void 0 ? _a : true;
    try {
        if (!fs.existsSync(target.configPath)) {
            if (verbose)
                logger_1.logger.info(`[${target.name}] config not found at ${target.configPath}, skipping MCP auto-register`);
            return 'config-missing';
        }
        const raw = fs.readFileSync(target.configPath, 'utf8');
        const data = JSON.parse(raw);
        const servers = target.resolveMcpServers(data, projectPath);
        if (!servers) {
            if (verbose)
                logger_1.logger.info(`[${target.name}] project not known to this client yet, skipping MCP auto-register`);
            return 'project-unknown';
        }
        servers[target.entryKey] = target.buildEntry(port);
        const mode = fs.statSync(target.configPath).mode;
        const tmpPath = `${target.configPath}.tmp-${process.pid}`;
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { mode });
        renameWithRetry(tmpPath, target.configPath);
        logger_1.logger.info(`[${target.name}] registered MCP entry '${target.entryKey}' -> port ${port}`);
        return 'registered';
    }
    catch (e) {
        if (verbose)
            logger_1.logger.warn(`[${target.name}] failed to auto-register MCP entry: ${e}`);
        return 'error';
    }
}
const RETRY_POLL_INTERVAL_MS = 5000;
const RETRY_TIMEOUT_MS = 2 * 60 * 1000;
/**
 * Registers with every client immediately, then keeps polling in the background for any
 * target whose project wasn't known yet (e.g. editor started before the first `claude`
 * session in this project) until it appears in the client's config or the timeout elapses.
 */
function registerAllMcpClients(projectPath, port, targets = exports.MCP_CLIENT_TARGETS, pollIntervalMs = RETRY_POLL_INTERVAL_MS, timeoutMs = RETRY_TIMEOUT_MS) {
    let pending = targets.filter(target => registerMcpEntry(target, projectPath, port) === 'project-unknown');
    if (pending.length === 0) {
        return { cancel() { } };
    }
    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
        pending = pending.filter(target => registerMcpEntry(target, projectPath, port, { verbose: false }) === 'project-unknown');
        if (pending.length === 0) {
            clearInterval(timer);
        }
        else if (Date.now() >= deadline) {
            clearInterval(timer);
            logger_1.logger.info(`Gave up auto-registering MCP entry after ${timeoutMs / 1000}s for: ${pending.map(t => t.name).join(', ')}`);
        }
    }, pollIntervalMs);
    return { cancel: () => clearInterval(timer) };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLWNsaWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvbWNwLWNsaWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBd0RBLDRDQW1DQztBQWNELHNEQStCQztBQXhJRCx1Q0FBeUI7QUFDekIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixxQ0FBa0M7QUFZckIsUUFBQSxrQkFBa0IsR0FBb0I7SUFDL0MsSUFBSSxFQUFFLGFBQWE7SUFDbkIsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLGNBQWMsQ0FBQztJQUNuRCxRQUFRLEVBQUUsa0JBQWtCO0lBQzVCLGlCQUFpQixDQUFDLElBQUksRUFBRSxXQUFXOztRQUMvQixNQUFNLE9BQU8sR0FBRyxNQUFBLElBQUksQ0FBQyxRQUFRLDBDQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDMUIsTUFBQSxPQUFPLENBQUMsVUFBVSxvQ0FBbEIsT0FBTyxDQUFDLFVBQVUsR0FBSyxFQUFFLEVBQUM7UUFDMUIsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFDRCxVQUFVLENBQUMsSUFBSTtRQUNYLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0NBQ0osQ0FBQztBQUVGLCtFQUErRTtBQUNsRSxRQUFBLGtCQUFrQixHQUFzQixDQUFDLDBCQUFrQixDQUFDLENBQUM7QUFJMUUsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2RCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFD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LE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNyQixlQUFNLENBQUMsSUFBSSxDQUNQLDRDQUE0QyxTQUFTLEdBQUcsSUFBSSxVQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQzlHLENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBRW5CLE9BQU8sRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDbEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWNwQ2xpZW50VGFyZ2V0IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgY29uZmlnUGF0aDogc3RyaW5nO1xuICAgIGVudHJ5S2V5OiBzdHJpbmc7XG4gICAgLyoqIFJldHVybnMgdGhlIG1jcFNlcnZlcnMgb2JqZWN0IHRvIG11dGF0ZSwgb3IgbnVsbCBpZiB0aGlzIGNsaWVudCBoYXNuJ3RcbiAgICAgKiAgc2VlbiB0aGlzIHByb2plY3QgeWV0IOKAlCBzaWduYWxzIFwic2tpcCwgZG9uJ3QgY3JlYXRlIGFueXRoaW5nIG5ld1wiLiAqL1xuICAgIHJlc29sdmVNY3BTZXJ2ZXJzKGRhdGE6IGFueSwgcHJvamVjdFBhdGg6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4gfCBudWxsO1xuICAgIGJ1aWxkRW50cnkocG9ydDogbnVtYmVyKTogdW5rbm93bjtcbn1cblxuZXhwb3J0IGNvbnN0IENMQVVERV9DT0RFX1RBUkdFVDogTWNwQ2xpZW50VGFyZ2V0ID0ge1xuICAgIG5hbWU6ICdjbGF1ZGUtY29kZScsXG4gICAgY29uZmlnUGF0aDogcGF0aC5qb2luKG9zLmhvbWVkaXIoKSwgJy5jbGF1ZGUuanNvbicpLFxuICAgIGVudHJ5S2V5OiAnY29jb3MtY3JlYXRvci0zeCcsXG4gICAgcmVzb2x2ZU1jcFNlcnZlcnMoZGF0YSwgcHJvamVjdFBhdGgpIHtcbiAgICAgICAgY29uc3QgcHJvamVjdCA9IGRhdGEucHJvamVjdHM/Lltwcm9qZWN0UGF0aF07XG4gICAgICAgIGlmICghcHJvamVjdCkgcmV0dXJuIG51bGw7XG4gICAgICAgIHByb2plY3QubWNwU2VydmVycyA/Pz0ge307XG4gICAgICAgIHJldHVybiBwcm9qZWN0Lm1jcFNlcnZlcnM7XG4gICAgfSxcbiAgICBidWlsZEVudHJ5KHBvcnQpIHtcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2h0dHAnLCB1cmw6IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH0vbWNwYCB9O1xuICAgIH0sXG59O1xuXG4vKiogQWxsIGNsaWVudHMgdG8gc2VsZi1yZWdpc3RlciB3aXRoLiBBZGQgYSBjbGllbnQgYnkgYWRkaW5nIGFuIGVudHJ5IGhlcmUuICovXG5leHBvcnQgY29uc3QgTUNQX0NMSUVOVF9UQVJHRVRTOiBNY3BDbGllbnRUYXJnZXRbXSA9IFtDTEFVREVfQ09ERV9UQVJHRVRdO1xuXG5leHBvcnQgdHlwZSBSZWdpc3RlclN0YXR1cyA9ICdyZWdpc3RlcmVkJyB8ICdjb25maWctbWlzc2luZycgfCAncHJvamVjdC11bmtub3duJyB8ICdlcnJvcic7XG5cbmNvbnN0IFJFTkFNRV9SRVRSWV9ERUxBWVNfTVMgPSBbMjUsIDUwLCAxMDAsIDIwMCwgNDAwXTtcbmNvbnN0IFJFTkFNRV9SRVRSWV9DT0RFUyA9IG5ldyBTZXQoWydFUEVSTScsICdFQUNDRVMnLCAnRUJVU1knXSk7XG5jb25zdCByZW5hbWVSZXRyeVNpZ25hbCA9IG5ldyBJbnQzMkFycmF5KG5ldyBTaGFyZWRBcnJheUJ1ZmZlcig0KSk7XG5cbmZ1bmN0aW9uIHJlbmFtZVdpdGhSZXRyeShzb3VyY2U6IHN0cmluZywgZGVzdGluYXRpb246IHN0cmluZyk6IHZvaWQge1xuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyA7IGF0dGVtcHQrKykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgZnMucmVuYW1lU3luYyhzb3VyY2UsIGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSAoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlO1xuICAgICAgICAgICAgY29uc3QgZGVsYXkgPSBSRU5BTUVfUkVUUllfREVMQVlTX01TW2F0dGVtcHRdO1xuICAgICAgICAgICAgaWYgKCFkZWxheSB8fCAhY29kZSB8fCAhUkVOQU1FX1JFVFJZX0NPREVTLmhhcyhjb2RlKSkge1xuICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgQXRvbWljcy53YWl0KHJlbmFtZVJldHJ5U2lnbmFsLCAwLCAwLCBkZWxheSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8qKiBCZXN0LWVmZm9ydDogbmV2ZXIgdGhyb3dzLCBvbmx5IGxvZ3MuIFRoaXMgaXMgYSBjb252ZW5pZW5jZSBzaWRlLWVmZmVjdCwgbm90IHRoZSBzb3VyY2Ugb2YgdHJ1dGguICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNY3BFbnRyeShcbiAgICB0YXJnZXQ6IE1jcENsaWVudFRhcmdldCxcbiAgICBwcm9qZWN0UGF0aDogc3RyaW5nLFxuICAgIHBvcnQ6IG51bWJlcixcbiAgICBvcHRzOiB7IHZlcmJvc2U/OiBib29sZWFuIH0gPSB7fVxuKTogUmVnaXN0ZXJTdGF0dXMge1xuICAgIGNvbnN0IHZlcmJvc2UgPSBvcHRzLnZlcmJvc2UgPz8gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0LmNvbmZpZ1BhdGgpKSB7XG4gICAgICAgICAgICBpZiAodmVyYm9zZSkgbG9nZ2VyLmluZm8oYFske3RhcmdldC5uYW1lfV0gY29uZmlnIG5vdCBmb3VuZCBhdCAke3RhcmdldC5jb25maWdQYXRofSwgc2tpcHBpbmcgTUNQIGF1dG8tcmVnaXN0ZXJgKTtcbiAgICAgICAgICAgIHJldHVybiAnY29uZmlnLW1pc3NpbmcnO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmF3ID0gZnMucmVhZEZpbGVTeW5jKHRhcmdldC5jb25maWdQYXRoLCAndXRmOCcpO1xuICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyYXcpO1xuXG4gICAgICAgIGNvbnN0IHNlcnZlcnMgPSB0YXJnZXQucmVzb2x2ZU1jcFNlcnZlcnMoZGF0YSwgcHJvamVjdFBhdGgpO1xuICAgICAgICBpZiAoIXNlcnZlcnMpIHtcbiAgICAgICAgICAgIGlmICh2ZXJib3NlKSBsb2dnZXIuaW5mbyhgWyR7dGFyZ2V0Lm5hbWV9XSBwcm9qZWN0IG5vdCBrbm93biB0byB0aGlzIGNsaWVudCB5ZXQsIHNraXBwaW5nIE1DUCBhdXRvLXJlZ2lzdGVyYCk7XG4gICAgICAgICAgICByZXR1cm4gJ3Byb2plY3QtdW5rbm93bic7XG4gICAgICAgIH1cblxuICAgICAgICBzZXJ2ZXJzW3RhcmdldC5lbnRyeUtleV0gPSB0YXJnZXQuYnVpbGRFbnRyeShwb3J0KTtcblxuICAgICAgICBjb25zdCBtb2RlID0gZnMuc3RhdFN5bmModGFyZ2V0LmNvbmZpZ1BhdGgpLm1vZGU7XG4gICAgICAgIGNvbnN0IHRtcFBhdGggPSBgJHt0YXJnZXQuY29uZmlnUGF0aH0udG1wLSR7cHJvY2Vzcy5waWR9YDtcbiAgICAgICAgZnMud3JpdGVGaWxlU3luYyh0bXBQYXRoLCBKU09OLnN0cmluZ2lmeShkYXRhLCBudWxsLCAyKSwgeyBtb2RlIH0pO1xuICAgICAgICByZW5hbWVXaXRoUmV0cnkodG1wUGF0aCwgdGFyZ2V0LmNvbmZpZ1BhdGgpO1xuXG4gICAgICAgIGxvZ2dlci5pbmZvKGBbJHt0YXJnZXQubmFtZX1dIHJlZ2lzdGVyZWQgTUNQIGVudHJ5ICcke3RhcmdldC5lbnRyeUtleX0nIC0+IHBvcnQgJHtwb3J0fWApO1xuICAgICAgICByZXR1cm4gJ3JlZ2lzdGVyZWQnO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKHZlcmJvc2UpIGxvZ2dlci53YXJuKGBbJHt0YXJnZXQubmFtZX1dIGZhaWxlZCB0byBhdXRvLXJlZ2lzdGVyIE1DUCBlbnRyeTogJHtlfWApO1xuICAgICAgICByZXR1cm4gJ2Vycm9yJztcbiAgICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlIYW5kbGUge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xufVxuXG5jb25zdCBSRVRSWV9QT0xMX0lOVEVSVkFMX01TID0gNV8wMDA7XG5jb25zdCBSRVRSWV9USU1FT1VUX01TID0gMiAqIDYwICogMTAwMDtcblxuLyoqXG4gKiBSZWdpc3RlcnMgd2l0aCBldmVyeSBjbGllbnQgaW1tZWRpYXRlbHksIHRoZW4ga2VlcHMgcG9sbGluZyBpbiB0aGUgYmFja2dyb3VuZCBmb3IgYW55XG4gKiB0YXJnZXQgd2hvc2UgcHJvamVjdCB3YXNuJ3Qga25vd24geWV0IChlLmcuIGVkaXRvciBzdGFydGVkIGJlZm9yZSB0aGUgZmlyc3QgYGNsYXVkZWBcbiAqIHNlc3Npb24gaW4gdGhpcyBwcm9qZWN0KSB1bnRpbCBpdCBhcHBlYXJzIGluIHRoZSBjbGllbnQncyBjb25maWcgb3IgdGhlIHRpbWVvdXQgZWxhcHNlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQWxsTWNwQ2xpZW50cyhcbiAgICBwcm9qZWN0UGF0aDogc3RyaW5nLFxuICAgIHBvcnQ6IG51bWJlcixcbiAgICB0YXJnZXRzOiBNY3BDbGllbnRUYXJnZXRbXSA9IE1DUF9DTElFTlRfVEFSR0VUUyxcbiAgICBwb2xsSW50ZXJ2YWxNcyA9IFJFVFJZX1BPTExfSU5URVJWQUxfTVMsXG4gICAgdGltZW91dE1zID0gUkVUUllfVElNRU9VVF9NU1xuKTogUmV0cnlIYW5kbGUge1xuICAgIGxldCBwZW5kaW5nID0gdGFyZ2V0cy5maWx0ZXIoXG4gICAgICAgIHRhcmdldCA9PiByZWdpc3Rlck1jcEVudHJ5KHRhcmdldCwgcHJvamVjdFBhdGgsIHBvcnQpID09PSAncHJvamVjdC11bmtub3duJ1xuICAgICk7XG5cbiAgICBpZiAocGVuZGluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHsgY2FuY2VsKCkge30gfTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXM7XG4gICAgY29uc3QgdGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIHBlbmRpbmcgPSBwZW5kaW5nLmZpbHRlcihcbiAgICAgICAgICAgIHRhcmdldCA9PiByZWdpc3Rlck1jcEVudHJ5KHRhcmdldCwgcHJvamVjdFBhdGgsIHBvcnQsIHsgdmVyYm9zZTogZmFsc2UgfSkgPT09ICdwcm9qZWN0LXVua25vd24nXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwZW5kaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgIH0gZWxzZSBpZiAoRGF0ZS5ub3coKSA+PSBkZWFkbGluZSkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgR2F2ZSB1cCBhdXRvLXJlZ2lzdGVyaW5nIE1DUCBlbnRyeSBhZnRlciAke3RpbWVvdXRNcyAvIDEwMDB9cyBmb3I6ICR7cGVuZGluZy5tYXAodCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sIHBvbGxJbnRlcnZhbE1zKTtcblxuICAgIHJldHVybiB7IGNhbmNlbDogKCkgPT4gY2xlYXJJbnRlcnZhbCh0aW1lcikgfTtcbn1cbiJdfQ==