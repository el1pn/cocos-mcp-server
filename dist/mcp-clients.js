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
        fs.renameSync(tmpPath, target.configPath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLWNsaWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvbWNwLWNsaWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0NBLDRDQW1DQztBQWNELHNEQStCQztBQXBIRCx1Q0FBeUI7QUFDekIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixxQ0FBa0M7QUFZckIsUUFBQSxrQkFBa0IsR0FBb0I7SUFDL0MsSUFBSSxFQUFFLGFBQWE7SUFDbkIsVUFBVSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxFQUFFLGNBQWMsQ0FBQztJQUNuRCxRQUFRLEVBQUUsa0JBQWtCO0lBQzVCLGlCQUFpQixDQUFDLElBQUksRUFBRSxXQUFXOztRQUMvQixNQUFNLE9BQU8sR0FBRyxNQUFBLElBQUksQ0FBQyxRQUFRLDBDQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDMUIsTUFBQSxPQUFPLENBQUMsVUFBVSxvQ0FBbEIsT0FBTyxDQUFDLFVBQVUsR0FBSyxFQUFFLEVBQUM7UUFDMUIsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQzlCLENBQUM7SUFDRCxVQUFVLENBQUMsSUFBSTtRQUNYLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0NBQ0osQ0FBQztBQUVGLCtFQUErRTtBQUNsRSxRQUFBLGtCQUFrQixHQUFzQixDQUFDLDBCQUFrQixDQUFDLENBQUM7QUFJMUUsd0dBQXdHO0FBQ3hHLFNBQWdCLGdCQUFnQixDQUM1QixNQUF1QixFQUN2QixXQUFtQixFQUNuQixJQUFZLEVBQ1osT0FBOEIsRUFBRTs7SUFFaEMsTUFBTSxPQUFPLEdBQUcsTUFBQSxJQUFJLENBQUMs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TyxDQUFDLE1BQU0sQ0FDcEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxLQUFLLGlCQUFpQixDQUNsRyxDQUFDO1FBQ0YsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixDQUFDO2FBQU0sSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3JCLGVBQU0sQ0FBQyxJQUFJLENBQ1AsNENBQTRDLFNBQVMsR0FBRyxJQUFJLFVBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDOUcsQ0FBQztRQUNOLENBQUM7SUFDTCxDQUFDLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFbkIsT0FBTyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUNsRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcblxuZXhwb3J0IGludGVyZmFjZSBNY3BDbGllbnRUYXJnZXQge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBjb25maWdQYXRoOiBzdHJpbmc7XG4gICAgZW50cnlLZXk6IHN0cmluZztcbiAgICAvKiogUmV0dXJucyB0aGUgbWNwU2VydmVycyBvYmplY3QgdG8gbXV0YXRlLCBvciBudWxsIGlmIHRoaXMgY2xpZW50IGhhc24ndFxuICAgICAqICBzZWVuIHRoaXMgcHJvamVjdCB5ZXQg4oCUIHNpZ25hbHMgXCJza2lwLCBkb24ndCBjcmVhdGUgYW55dGhpbmcgbmV3XCIuICovXG4gICAgcmVzb2x2ZU1jcFNlcnZlcnMoZGF0YTogYW55LCBwcm9qZWN0UGF0aDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgYW55PiB8IG51bGw7XG4gICAgYnVpbGRFbnRyeShwb3J0OiBudW1iZXIpOiB1bmtub3duO1xufVxuXG5leHBvcnQgY29uc3QgQ0xBVURFX0NPREVfVEFSR0VUOiBNY3BDbGllbnRUYXJnZXQgPSB7XG4gICAgbmFtZTogJ2NsYXVkZS1jb2RlJyxcbiAgICBjb25maWdQYXRoOiBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCAnLmNsYXVkZS5qc29uJyksXG4gICAgZW50cnlLZXk6ICdjb2Nvcy1jcmVhdG9yLTN4JyxcbiAgICByZXNvbHZlTWNwU2VydmVycyhkYXRhLCBwcm9qZWN0UGF0aCkge1xuICAgICAgICBjb25zdCBwcm9qZWN0ID0gZGF0YS5wcm9qZWN0cz8uW3Byb2plY3RQYXRoXTtcbiAgICAgICAgaWYgKCFwcm9qZWN0KSByZXR1cm4gbnVsbDtcbiAgICAgICAgcHJvamVjdC5tY3BTZXJ2ZXJzID8/PSB7fTtcbiAgICAgICAgcmV0dXJuIHByb2plY3QubWNwU2VydmVycztcbiAgICB9LFxuICAgIGJ1aWxkRW50cnkocG9ydCkge1xuICAgICAgICByZXR1cm4geyB0eXBlOiAnaHR0cCcsIHVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9tY3BgIH07XG4gICAgfSxcbn07XG5cbi8qKiBBbGwgY2xpZW50cyB0byBzZWxmLXJlZ2lzdGVyIHdpdGguIEFkZCBhIGNsaWVudCBieSBhZGRpbmcgYW4gZW50cnkgaGVyZS4gKi9cbmV4cG9ydCBjb25zdCBNQ1BfQ0xJRU5UX1RBUkdFVFM6IE1jcENsaWVudFRhcmdldFtdID0gW0NMQVVERV9DT0RFX1RBUkdFVF07XG5cbmV4cG9ydCB0eXBlIFJlZ2lzdGVyU3RhdHVzID0gJ3JlZ2lzdGVyZWQnIHwgJ2NvbmZpZy1taXNzaW5nJyB8ICdwcm9qZWN0LXVua25vd24nIHwgJ2Vycm9yJztcblxuLyoqIEJlc3QtZWZmb3J0OiBuZXZlciB0aHJvd3MsIG9ubHkgbG9ncy4gVGhpcyBpcyBhIGNvbnZlbmllbmNlIHNpZGUtZWZmZWN0LCBub3QgdGhlIHNvdXJjZSBvZiB0cnV0aC4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1jcEVudHJ5KFxuICAgIHRhcmdldDogTWNwQ2xpZW50VGFyZ2V0LFxuICAgIHByb2plY3RQYXRoOiBzdHJpbmcsXG4gICAgcG9ydDogbnVtYmVyLFxuICAgIG9wdHM6IHsgdmVyYm9zZT86IGJvb2xlYW4gfSA9IHt9XG4pOiBSZWdpc3RlclN0YXR1cyB7XG4gICAgY29uc3QgdmVyYm9zZSA9IG9wdHMudmVyYm9zZSA/PyB0cnVlO1xuICAgIHRyeSB7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQuY29uZmlnUGF0aCkpIHtcbiAgICAgICAgICAgIGlmICh2ZXJib3NlKSBsb2dnZXIuaW5mbyhgWyR7dGFyZ2V0Lm5hbWV9XSBjb25maWcgbm90IGZvdW5kIGF0ICR7dGFyZ2V0LmNvbmZpZ1BhdGh9LCBza2lwcGluZyBNQ1AgYXV0by1yZWdpc3RlcmApO1xuICAgICAgICAgICAgcmV0dXJuICdjb25maWctbWlzc2luZyc7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByYXcgPSBmcy5yZWFkRmlsZVN5bmModGFyZ2V0LmNvbmZpZ1BhdGgsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKHJhdyk7XG5cbiAgICAgICAgY29uc3Qgc2VydmVycyA9IHRhcmdldC5yZXNvbHZlTWNwU2VydmVycyhkYXRhLCBwcm9qZWN0UGF0aCk7XG4gICAgICAgIGlmICghc2VydmVycykge1xuICAgICAgICAgICAgaWYgKHZlcmJvc2UpIGxvZ2dlci5pbmZvKGBbJHt0YXJnZXQubmFtZX1dIHByb2plY3Qgbm90IGtub3duIHRvIHRoaXMgY2xpZW50IHlldCwgc2tpcHBpbmcgTUNQIGF1dG8tcmVnaXN0ZXJgKTtcbiAgICAgICAgICAgIHJldHVybiAncHJvamVjdC11bmtub3duJztcbiAgICAgICAgfVxuXG4gICAgICAgIHNlcnZlcnNbdGFyZ2V0LmVudHJ5S2V5XSA9IHRhcmdldC5idWlsZEVudHJ5KHBvcnQpO1xuXG4gICAgICAgIGNvbnN0IG1vZGUgPSBmcy5zdGF0U3luYyh0YXJnZXQuY29uZmlnUGF0aCkubW9kZTtcbiAgICAgICAgY29uc3QgdG1wUGF0aCA9IGAke3RhcmdldC5jb25maWdQYXRofS50bXAtJHtwcm9jZXNzLnBpZH1gO1xuICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHRtcFBhdGgsIEpTT04uc3RyaW5naWZ5KGRhdGEsIG51bGwsIDIpLCB7IG1vZGUgfSk7XG4gICAgICAgIGZzLnJlbmFtZVN5bmModG1wUGF0aCwgdGFyZ2V0LmNvbmZpZ1BhdGgpO1xuXG4gICAgICAgIGxvZ2dlci5pbmZvKGBbJHt0YXJnZXQubmFtZX1dIHJlZ2lzdGVyZWQgTUNQIGVudHJ5ICcke3RhcmdldC5lbnRyeUtleX0nIC0+IHBvcnQgJHtwb3J0fWApO1xuICAgICAgICByZXR1cm4gJ3JlZ2lzdGVyZWQnO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKHZlcmJvc2UpIGxvZ2dlci53YXJuKGBbJHt0YXJnZXQubmFtZX1dIGZhaWxlZCB0byBhdXRvLXJlZ2lzdGVyIE1DUCBlbnRyeTogJHtlfWApO1xuICAgICAgICByZXR1cm4gJ2Vycm9yJztcbiAgICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlIYW5kbGUge1xuICAgIGNhbmNlbCgpOiB2b2lkO1xufVxuXG5jb25zdCBSRVRSWV9QT0xMX0lOVEVSVkFMX01TID0gNV8wMDA7XG5jb25zdCBSRVRSWV9USU1FT1VUX01TID0gMiAqIDYwICogMTAwMDtcblxuLyoqXG4gKiBSZWdpc3RlcnMgd2l0aCBldmVyeSBjbGllbnQgaW1tZWRpYXRlbHksIHRoZW4ga2VlcHMgcG9sbGluZyBpbiB0aGUgYmFja2dyb3VuZCBmb3IgYW55XG4gKiB0YXJnZXQgd2hvc2UgcHJvamVjdCB3YXNuJ3Qga25vd24geWV0IChlLmcuIGVkaXRvciBzdGFydGVkIGJlZm9yZSB0aGUgZmlyc3QgYGNsYXVkZWBcbiAqIHNlc3Npb24gaW4gdGhpcyBwcm9qZWN0KSB1bnRpbCBpdCBhcHBlYXJzIGluIHRoZSBjbGllbnQncyBjb25maWcgb3IgdGhlIHRpbWVvdXQgZWxhcHNlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQWxsTWNwQ2xpZW50cyhcbiAgICBwcm9qZWN0UGF0aDogc3RyaW5nLFxuICAgIHBvcnQ6IG51bWJlcixcbiAgICB0YXJnZXRzOiBNY3BDbGllbnRUYXJnZXRbXSA9IE1DUF9DTElFTlRfVEFSR0VUUyxcbiAgICBwb2xsSW50ZXJ2YWxNcyA9IFJFVFJZX1BPTExfSU5URVJWQUxfTVMsXG4gICAgdGltZW91dE1zID0gUkVUUllfVElNRU9VVF9NU1xuKTogUmV0cnlIYW5kbGUge1xuICAgIGxldCBwZW5kaW5nID0gdGFyZ2V0cy5maWx0ZXIoXG4gICAgICAgIHRhcmdldCA9PiByZWdpc3Rlck1jcEVudHJ5KHRhcmdldCwgcHJvamVjdFBhdGgsIHBvcnQpID09PSAncHJvamVjdC11bmtub3duJ1xuICAgICk7XG5cbiAgICBpZiAocGVuZGluZy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHsgY2FuY2VsKCkge30gfTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWFkbGluZSA9IERhdGUubm93KCkgKyB0aW1lb3V0TXM7XG4gICAgY29uc3QgdGltZXIgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICAgIHBlbmRpbmcgPSBwZW5kaW5nLmZpbHRlcihcbiAgICAgICAgICAgIHRhcmdldCA9PiByZWdpc3Rlck1jcEVudHJ5KHRhcmdldCwgcHJvamVjdFBhdGgsIHBvcnQsIHsgdmVyYm9zZTogZmFsc2UgfSkgPT09ICdwcm9qZWN0LXVua25vd24nXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwZW5kaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgIH0gZWxzZSBpZiAoRGF0ZS5ub3coKSA+PSBkZWFkbGluZSkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbCh0aW1lcik7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhcbiAgICAgICAgICAgICAgICBgR2F2ZSB1cCBhdXRvLXJlZ2lzdGVyaW5nIE1DUCBlbnRyeSBhZnRlciAke3RpbWVvdXRNcyAvIDEwMDB9cyBmb3I6ICR7cGVuZGluZy5tYXAodCA9PiB0Lm5hbWUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgIH0sIHBvbGxJbnRlcnZhbE1zKTtcblxuICAgIHJldHVybiB7IGNhbmNlbDogKCkgPT4gY2xlYXJJbnRlcnZhbCh0aW1lcikgfTtcbn1cbiJdfQ==