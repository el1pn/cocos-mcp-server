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
        const settingsDir = path.join(projectPath, 'settings');
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        this.logFilePath = path.join(settingsDir, 'mcp-server.log');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBVTdCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQztBQUM3QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDMUIsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU07QUFFbEQsTUFBYSxNQUFNO0lBQW5CO1FBQ1ksV0FBTSxHQUFlLEVBQUUsQ0FBQztRQUN4QixnQkFBVyxHQUFrQixJQUFJLENBQUM7SUFxRzlDLENBQUM7SUFuR0c7O09BRUc7SUFDSCxXQUFXLENBQUMsV0FBbUI7UUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM5QixFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELE9BQU8sQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcs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Q0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUFnQixHQUFHLEVBQUUsS0FBZ0I7UUFDNUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDbEYsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxDQUFDLFFBQWdCLEdBQUcsRUFBRSxLQUFnQjtRQUMvQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQzthQUMvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUs7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUF2R0Qsd0JBdUdDO0FBRUQsNkJBQTZCO0FBQ2hCLFFBQUEsTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdpbmZvJyB8ICdzdWNjZXNzJyB8ICd3YXJuJyB8ICdlcnJvcicgfCAnbWNwJztcblxuZXhwb3J0IGludGVyZmFjZSBMb2dFbnRyeSB7XG4gICAgdGltZTogc3RyaW5nO1xuICAgIGxldmVsOiBMb2dMZXZlbDtcbiAgICBjb250ZW50OiBzdHJpbmc7XG59XG5cbmNvbnN0IE1BWF9CVUZGRVJfU0laRSA9IDIwMDA7XG5jb25zdCBUUklNX1RPX1NJWkUgPSAxNTAwO1xuY29uc3QgTUFYX0xPR19GSUxFX0JZVEVTID0gMiAqIDEwMjQgKiAxMDI0OyAvLyAyTUJcblxuZXhwb3J0IGNsYXNzIExvZ2dlciB7XG4gICAgcHJpdmF0ZSBidWZmZXI6IExvZ0VudHJ5W10gPSBbXTtcbiAgICBwcml2YXRlIGxvZ0ZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGlzayBsb2dnaW5nLiBDYWxsIGFmdGVyIEVkaXRvci5Qcm9qZWN0LnBhdGggaXMgYXZhaWxhYmxlLlxuICAgICAqL1xuICAgIGluaXREaXNrTG9nKHByb2plY3RQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3NEaXIgPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsICdzZXR0aW5ncycpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2V0dGluZ3NEaXIpKSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoc2V0dGluZ3NEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBwYXRoLmpvaW4oc2V0dGluZ3NEaXIsICdtY3Atc2VydmVyLmxvZycpO1xuICAgIH1cblxuICAgIGluZm8oY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCdpbmZvJywgY29udGVudCk7IH1cbiAgICBzdWNjZXNzKGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQgeyB0aGlzLmxvZygnc3VjY2VzcycsIGNvbnRlbnQpOyB9XG4gICAgd2Fybihjb250ZW50OiBzdHJpbmcpOiB2b2lkIHsgdGhpcy5sb2coJ3dhcm4nLCBjb250ZW50KTsgfVxuICAgIGVycm9yKGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQgeyB0aGlzLmxvZygnZXJyb3InLCBjb250ZW50KTsgfVxuICAgIG1jcChjb250ZW50OiBzdHJpbmcpOiB2b2lkIHsgdGhpcy5sb2coJ21jcCcsIGNvbnRlbnQpOyB9XG5cbiAgICBwcml2YXRlIGxvZyhsZXZlbDogTG9nTGV2ZWwsIGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBlbnRyeTogTG9nRW50cnkgPSB7XG4gICAgICAgICAgICB0aW1lOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgIGNvbnRlbnRcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDaXJjdWxhciBidWZmZXJcbiAgICAgICAgdGhpcy5idWZmZXIucHVzaChlbnRyeSk7XG4gICAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPiBNQVhfQlVGRkVSX1NJWkUpIHtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIuc2xpY2UoLVRSSU1fVE9fU0laRSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFZGl0b3IgY29uc29sZSDigJQgb25seSB3YXJuL2Vycm9yIHRvIGF2b2lkIHNwYW1cbiAgICAgICAgY29uc3QgdGFnID0gYFtNQ1BTZXJ2ZXJdYDtcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYCR7dGFnfSAke2NvbnRlbnR9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXJuJzpcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oYCR7dGFnfSAke2NvbnRlbnR9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke3RhZ30gWyR7bGV2ZWx9XSAke2NvbnRlbnR9YCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQYW5lbCBicm9hZGNhc3QgKGJlc3QtZWZmb3J0LCBpZ25vcmUgaWYgRWRpdG9yIG5vdCByZWFkeSlcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLmJyb2FkY2FzdCgnY29jb3MtbWNwLXNlcnZlcjpvbi1sb2cnLCBlbnRyeSk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gUGFuZWwgbWF5IG5vdCBiZSBvcGVuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBEaXNrIHBlcnNpc3RlbmNlXG4gICAgICAgIHRoaXMud3JpdGVUb0Rpc2soZW50cnkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgd3JpdGVUb0Rpc2soZW50cnk6IExvZ0VudHJ5KTogdm9pZCB7XG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gUm90YXRlIGlmIGZpbGUgZXhjZWVkcyBtYXggc2l6ZVxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGhpcy5sb2dGaWxlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmModGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXQuc2l6ZSA+IE1BWF9MT0dfRklMRV9CWVRFUykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3RhdGVkUGF0aCA9IHRoaXMubG9nRmlsZVBhdGggKyAnLjEnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhyb3RhdGVkUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmMocm90YXRlZFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZzLnJlbmFtZVN5bmModGhpcy5sb2dGaWxlUGF0aCwgcm90YXRlZFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgWyR7ZW50cnkudGltZX1dIFske2VudHJ5LmxldmVsLnRvVXBwZXJDYXNlKCl9XSAke2VudHJ5LmNvbnRlbnR9XFxuYDtcbiAgICAgICAgICAgIGZzLmFwcGVuZEZpbGVTeW5jKHRoaXMubG9nRmlsZVBhdGgsIGxpbmUpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIERpc2sgbG9nZ2luZyBpcyBiZXN0LWVmZm9ydFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY2VudCBsb2cgZW50cmllcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBsZXZlbC5cbiAgICAgKi9cbiAgICBnZXRFbnRyaWVzKGxpbWl0OiBudW1iZXIgPSAxMDAsIGxldmVsPzogTG9nTGV2ZWwpOiBMb2dFbnRyeVtdIHtcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSBsZXZlbCA/IHRoaXMuYnVmZmVyLmZpbHRlcihlID0+IGUubGV2ZWwgPT09IGxldmVsKSA6IHRoaXMuYnVmZmVyO1xuICAgICAgICByZXR1cm4gZmlsdGVyZWQuc2xpY2UoLWxpbWl0KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgbG9ncyBhcyBmb3JtYXR0ZWQgdGV4dCAoZm9yIE1DUCByZXNvdXJjZXMpLlxuICAgICAqL1xuICAgIGdldExvZ0NvbnRlbnQobGltaXQ6IG51bWJlciA9IDIwMCwgbGV2ZWw/OiBMb2dMZXZlbCk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldEVudHJpZXMobGltaXQsIGxldmVsKVxuICAgICAgICAgICAgLm1hcChlID0+IGBbJHtlLnRpbWV9XSBbJHtlLmxldmVsLnRvVXBwZXJDYXNlKCl9XSAke2UuY29udGVudH1gKVxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENsZWFyIHRoZSBpbi1tZW1vcnkgYnVmZmVyLlxuICAgICAqL1xuICAgIGNsZWFyKCk6IHZvaWQge1xuICAgICAgICB0aGlzLmJ1ZmZlciA9IFtdO1xuICAgIH1cbn1cblxuLyoqIFNoYXJlZCBsb2dnZXIgaW5zdGFuY2UgKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iXX0=