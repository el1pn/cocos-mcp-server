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
exports.logger = exports.Logger = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const settings_1 = require("./settings");
const MAX_BUFFER_SIZE = 2000;
const TRIM_TO_SIZE = 1500;
const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024; // 2MB
class Logger {
    constructor() {
        this.buffer = [];
        this.logFilePath = null;
    }
    /**
     * Initialize disk logging. Call after Editor.Project.path is available.
     */
    initDiskLog(projectPath) {
        const dir = (0, settings_1.getMcpServerDataDir)(projectPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const nextLog = path.join(dir, 'mcp-server.log');
        const legacyLog = path.join(projectPath, 'settings', 'mcp-server.log');
        try {
            if (!fs.existsSync(nextLog) && fs.existsSync(legacyLog)) {
                fs.renameSync(legacyLog, nextLog);
                const legacyRotated = legacyLog + '.1';
                const nextRotated = nextLog + '.1';
                if (fs.existsSync(legacyRotated) && !fs.existsSync(nextRotated)) {
                    fs.renameSync(legacyRotated, nextRotated);
                }
            }
        }
        catch (_a) {
            // best-effort migration
        }
        this.logFilePath = nextLog;
    }
    info(content) { this.log('info', content); }
    success(content) { this.log('success', content); }
    warn(content) { this.log('warn', content); }
    error(content) { this.log('error', content); }
    mcp(content) { this.log('mcp', content); }
    log(level, content) {
        const entry = {
            time: new Date().toISOString(),
            level,
            content
        };
        // Circular buffer
        this.buffer.push(entry);
        if (this.buffer.length > MAX_BUFFER_SIZE) {
            this.buffer = this.buffer.slice(-TRIM_TO_SIZE);
        }
        // Editor console — only warn/error to avoid spam
        const tag = `[MCPServer]`;
        switch (level) {
            case 'error':
                console.error(`${tag} ${content}`);
                break;
            case 'warn':
                console.warn(`${tag} ${content}`);
                break;
            default:
                console.log(`${tag} [${level}] ${content}`);
                break;
        }
        // Panel broadcast (best-effort, ignore if Editor not ready)
        try {
            Editor.Message.broadcast('cocos-mcp-server:on-log', entry);
        }
        catch (_a) {
            // Panel may not be open
        }
        // Disk persistence
        this.writeToDisk(entry);
    }
    writeToDisk(entry) {
        if (!this.logFilePath)
            return;
        try {
            // Rotate if file exceeds max size
            if (fs.existsSync(this.logFilePath)) {
                const stat = fs.statSync(this.logFilePath);
                if (stat.size > MAX_LOG_FILE_BYTES) {
                    const rotatedPath = this.logFilePath + '.1';
                    if (fs.existsSync(rotatedPath)) {
                        fs.unlinkSync(rotatedPath);
                    }
                    fs.renameSync(this.logFilePath, rotatedPath);
                }
            }
            const line = `[${entry.time}] [${entry.level.toUpperCase()}] ${entry.content}\n`;
            fs.appendFileSync(this.logFilePath, line);
        }
        catch (_a) {
            // Disk logging is best-effort
        }
    }
    /**
     * Get recent log entries, optionally filtered by level.
     */
    getEntries(limit = 100, level) {
        const filtered = level ? this.buffer.filter(e => e.level === level) : this.buffer;
        return filtered.slice(-limit);
    }
    /**
     * Get logs as formatted text (for MCP resources).
     */
    getLogContent(limit = 200, level) {
        return this.getEntries(limit, level)
            .map(e => `[${e.time}] [${e.level.toUpperCase()}] ${e.content}`)
            .join('\n');
    }
    /**
     * Clear the in-memory buffer.
     */
    clear() {
        this.buffer = [];
    }
}
exports.Logger = Logger;
/** Shared logger instance */
exports.logger = new Logger();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLHlDQUFpRDtBQVVqRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUM7QUFDN0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDO0FBQzFCLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxNQUFNO0FBRWxELE1BQWEsTUFBTTtJQUFuQjtRQUNZLFdBQU0sR0FBZSxFQUFFLENBQUM7UUFDeEIsZ0JBQVcsR0FBa0IsSUFBSSxDQUFDO0lBbUg5QyxDQUFDO0lBakhHOztPQUVHO0lBQ0gsV0FBVyxDQUFDLFdBQW1CO1FBQzNCLE1BQU0sR0FBRyxHQUFHLElBQUEsOEJBQW1CLEVBQUMsV0FBVyxDQUFDLENBQUM7UUFDN0MsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVB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QUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQzthQUMvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUs7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUFySEQsd0JBcUhDO0FBRUQsNkJBQTZCO0FBQ2hCLFFBQUEsTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZ2V0TWNwU2VydmVyRGF0YURpciB9IGZyb20gJy4vc2V0dGluZ3MnO1xuXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdpbmZvJyB8ICdzdWNjZXNzJyB8ICd3YXJuJyB8ICdlcnJvcicgfCAnbWNwJztcblxuZXhwb3J0IGludGVyZmFjZSBMb2dFbnRyeSB7XG4gICAgdGltZTogc3RyaW5nO1xuICAgIGxldmVsOiBMb2dMZXZlbDtcbiAgICBjb250ZW50OiBzdHJpbmc7XG59XG5cbmNvbnN0IE1BWF9CVUZGRVJfU0laRSA9IDIwMDA7XG5jb25zdCBUUklNX1RPX1NJWkUgPSAxNTAwO1xuY29uc3QgTUFYX0xPR19GSUxFX0JZVEVTID0gMiAqIDEwMjQgKiAxMDI0OyAvLyAyTUJcblxuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgcHJpdmF0ZSBidWZmZXI6IExvZ0VudHJ5W10gPSBbXTtcbiAgICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGlzayBsb2dnaW5nLiBDYWxsIGFmdGVyIEVkaXRvci5Qcm9qZWN0LnBhdGggaXMgYXZhaWxhYmxlLlxuICAgICAqL1xuICAgIGluaXREaXNrTG9nKHByb2plY3RQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGlyID0gZ2V0TWNwU2VydmVyRGF0YURpcihwcm9qZWN0UGF0aCk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXh0TG9nID0gcGF0aC5qb2luKGRpciwgJ21jcC1zZXJ2ZXIubG9nJyk7XG4gICAgICAgIGNvbnN0IGxlZ2FjeUxvZyA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ3NldHRpbmdzJywgJ21jcC1zZXJ2ZXIubG9nJyk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobmV4dExvZykgJiYgZnMuZXhpc3RzU3luYyhsZWdhY3lMb2cpKSB7XG4gICAgICAgICAgICAgICAgZnMucmVuYW1lU3luYyhsZWdhY3lMb2csIG5leHRMb2cpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlZ2FjeVJvdGF0ZWQgPSBsZWdhY3lMb2cgKyAnLjEnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5leHRSb3RhdGVkID0gbmV4dExvZyArICcuMSc7XG4gICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobGVnYWN5Um90YXRlZCkgJiYgIWZzLmV4aXN0c1N5bmMobmV4dFJvdGF0ZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZzLnJlbmFtZVN5bmMobGVnYWN5Um90YXRlZCwgbmV4dFJvdGF0ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBiZXN0LWVmZm9ydCBtaWdyYXRpb25cbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gbmV4dExvZztcbiAgICB9XG5cbiAgICBpbmZvKGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQgeyB0aGlzLmxvZygnaW5mbycsIGNvbnRlbnQpOyB9XG4gICAgc3VjY2Vzcyhjb250ZW50OiBzdHJpbmcpOiB2b2lkIHsgdGhpcy5sb2coJ3N1Y2Nlc3MnLCBjb250ZW50KTsgfVxuICAgIHdhcm4oY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCd3YXJuJywgY29udGVudCk7IH1cbiAgICBlcnJvcihjb250ZW50OiBzdHJpbmcpOiB2b2lkIHsgdGhpcy5sb2coJ2Vycm9yJywgY29udGVudCk7IH1cbiAgICBtY3AoY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCdtY3AnLCBjb250ZW50KTsgfVxuXG4gICAgcHJpdmF0ZSBsb2cobGV2ZWw6IExvZ0xldmVsLCBjb250ZW50OiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZW50cnk6IExvZ0VudHJ5ID0ge1xuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgbGV2ZWwsXG4gICAgICAgICAgICBjb250ZW50XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ2lyY3VsYXIgYnVmZmVyXG4gICAgICAgIHRoaXMuYnVmZmVyLnB1c2goZW50cnkpO1xuICAgICAgICBpZiAodGhpcy5idWZmZXIubGVuZ3RoID4gTUFYX0JVRkZFUl9TSVpFKSB7XG4gICAgICAgICAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyLnNsaWNlKC1UUklNX1RPX1NJWkUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRWRpdG9yIGNvbnNvbGUg4oCUIG9ubHkgd2Fybi9lcnJvciB0byBhdm9pZCBzcGFtXG4gICAgICAgIGNvbnN0IHRhZyA9IGBbTUNQU2VydmVyXWA7XG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGAke3RhZ30gJHtjb250ZW50fWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnd2Fybic6XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAke3RhZ30gJHtjb250ZW50fWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHt0YWd9IFske2xldmVsfV0gJHtjb250ZW50fWApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGFuZWwgYnJvYWRjYXN0IChiZXN0LWVmZm9ydCwgaWdub3JlIGlmIEVkaXRvciBub3QgcmVhZHkpXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoJ2NvY29zLW1jcC1zZXJ2ZXI6b24tbG9nJywgZW50cnkpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFBhbmVsIG1heSBub3QgYmUgb3BlblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGlzayBwZXJzaXN0ZW5jZVxuICAgICAgICB0aGlzLndyaXRlVG9EaXNrKGVudHJ5KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHdyaXRlVG9EaXNrKGVudHJ5OiBMb2dFbnRyeSk6IHZvaWQge1xuICAgICAgICBpZiAoIXRoaXMubG9nRmlsZVBhdGgpIHJldHVybjtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFJvdGF0ZSBpZiBmaWxlIGV4Y2VlZHMgbWF4IHNpemVcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRoaXMubG9nRmlsZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKHRoaXMubG9nRmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0LnNpemUgPiBNQVhfTE9HX0ZJTEVfQllURVMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm90YXRlZFBhdGggPSB0aGlzLmxvZ0ZpbGVQYXRoICsgJy4xJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocm90YXRlZFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKHJvdGF0ZWRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmcy5yZW5hbWVTeW5jKHRoaXMubG9nRmlsZVBhdGgsIHJvdGF0ZWRQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsaW5lID0gYFske2VudHJ5LnRpbWV9XSBbJHtlbnRyeS5sZXZlbC50b1VwcGVyQ2FzZSgpfV0gJHtlbnRyeS5jb250ZW50fVxcbmA7XG4gICAgICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBsaW5lKTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBEaXNrIGxvZ2dpbmcgaXMgYmVzdC1lZmZvcnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCByZWNlbnQgbG9nIGVudHJpZXMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgbGV2ZWwuXG4gICAgICovXG4gICAgZ2V0RW50cmllcyhsaW1pdDogbnVtYmVyID0gMTAwLCBsZXZlbD86IExvZ0xldmVsKTogTG9nRW50cnlbXSB7XG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gbGV2ZWwgPyB0aGlzLmJ1ZmZlci5maWx0ZXIoZSA9PiBlLmxldmVsID09PSBsZXZlbCkgOiB0aGlzLmJ1ZmZlcjtcbiAgICAgICAgcmV0dXJuIGZpbHRlcmVkLnNsaWNlKC1saW1pdCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IGxvZ3MgYXMgZm9ybWF0dGVkIHRleHQgKGZvciBNQ1AgcmVzb3VyY2VzKS5cbiAgICAgKi9cbiAgICBnZXRMb2dDb250ZW50KGxpbWl0OiBudW1iZXIgPSAyMDAsIGxldmVsPzogTG9nTGV2ZWwpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRFbnRyaWVzKGxpbWl0LCBsZXZlbClcbiAgICAgICAgICAgIC5tYXAoZSA9PiBgWyR7ZS50aW1lfV0gWyR7ZS5sZXZlbC50b1VwcGVyQ2FzZSgpfV0gJHtlLmNvbnRlbnR9YClcbiAgICAgICAgICAgIC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDbGVhciB0aGUgaW4tbWVtb3J5IGJ1ZmZlci5cbiAgICAgKi9cbiAgICBjbGVhcigpOiB2b2lkIHtcbiAgICAgICAgdGhpcy5idWZmZXIgPSBbXTtcbiAgICB9XG59XG5cbi8qKiBTaGFyZWQgbG9nZ2VyIGluc3RhbmNlICovXG5leHBvcnQgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuIl19