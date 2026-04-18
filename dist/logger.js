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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL2xvZ2dlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBVTdCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQztBQUM3QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDMUIsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU07QUFFbEQsTUFBYSxNQUFNO0lBQW5CO1FBQ1ksV0FBTSxHQUFlLEVBQUUsQ0FBQztRQUN4QixnQkFBVyxHQUFrQixJQUFJLENBQUM7SUFxRzlDLENBQUM7SUFuR0c7O09BRUc7SUFDSCxXQUFXLENBQUMsV0FBbUI7UUFDM0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM5QixFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFELE9BQU8sQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksQ0FBQyxPQUFlLElBQVUsSUFBSSxDQUFDLEdBQUcs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Q0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILFVBQVUsQ0FBQyxRQUFnQixHQUFHLEVBQUUsS0FBZ0I7UUFDNUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDbEYsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxDQUFDLFFBQWdCLEdBQUcsRUFBRSxLQUFnQjtRQUMvQyxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQzthQUMvQixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7YUFDL0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUs7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0o7QUF2R0Qsd0JBdUdDO0FBRUQsNkJBQTZCO0FBQ2hCLFFBQUEsTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG5leHBvcnQgdHlwZSBMb2dMZXZlbCA9ICdpbmZvJyB8ICdzdWNjZXNzJyB8ICd3YXJuJyB8ICdlcnJvcicgfCAnbWNwJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9nRW50cnkge1xyXG4gICAgdGltZTogc3RyaW5nO1xyXG4gICAgbGV2ZWw6IExvZ0xldmVsO1xyXG4gICAgY29udGVudDogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCBNQVhfQlVGRkVSX1NJWkUgPSAyMDAwO1xyXG5jb25zdCBUUklNX1RPX1NJWkUgPSAxNTAwO1xyXG5jb25zdCBNQVhfTE9HX0ZJTEVfQllURVMgPSAyICogMTAyNCAqIDEwMjQ7IC8vIDJNQlxyXG5cclxuZXhwb3J0IGNsYXNzIExvZ2dlciB7XHJcbiAgICBwcml2YXRlIGJ1ZmZlcjogTG9nRW50cnlbXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBsb2dGaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBJbml0aWFsaXplIGRpc2sgbG9nZ2luZy4gQ2FsbCBhZnRlciBFZGl0b3IuUHJvamVjdC5wYXRoIGlzIGF2YWlsYWJsZS5cclxuICAgICAqL1xyXG4gICAgaW5pdERpc2tMb2cocHJvamVjdFBhdGg6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzRGlyID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnc2V0dGluZ3MnKTtcclxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2V0dGluZ3NEaXIpKSB7XHJcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhzZXR0aW5nc0RpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMubG9nRmlsZVBhdGggPSBwYXRoLmpvaW4oc2V0dGluZ3NEaXIsICdtY3Atc2VydmVyLmxvZycpO1xyXG4gICAgfVxyXG5cclxuICAgIGluZm8oY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCdpbmZvJywgY29udGVudCk7IH1cclxuICAgIHN1Y2Nlc3MoY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCdzdWNjZXNzJywgY29udGVudCk7IH1cclxuICAgIHdhcm4oY29udGVudDogc3RyaW5nKTogdm9pZCB7IHRoaXMubG9nKCd3YXJuJywgY29udGVudCk7IH1cclxuICAgIGVycm9yKGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQgeyB0aGlzLmxvZygnZXJyb3InLCBjb250ZW50KTsgfVxyXG4gICAgbWNwKGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQgeyB0aGlzLmxvZygnbWNwJywgY29udGVudCk7IH1cclxuXHJcbiAgICBwcml2YXRlIGxvZyhsZXZlbDogTG9nTGV2ZWwsIGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGVudHJ5OiBMb2dFbnRyeSA9IHtcclxuICAgICAgICAgICAgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICBsZXZlbCxcclxuICAgICAgICAgICAgY29udGVudFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIENpcmN1bGFyIGJ1ZmZlclxyXG4gICAgICAgIHRoaXMuYnVmZmVyLnB1c2goZW50cnkpO1xyXG4gICAgICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPiBNQVhfQlVGRkVSX1NJWkUpIHtcclxuICAgICAgICAgICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlci5zbGljZSgtVFJJTV9UT19TSVpFKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEVkaXRvciBjb25zb2xlIOKAlCBvbmx5IHdhcm4vZXJyb3IgdG8gYXZvaWQgc3BhbVxyXG4gICAgICAgIGNvbnN0IHRhZyA9IGBbTUNQU2VydmVyXWA7XHJcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xyXG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGAke3RhZ30gJHtjb250ZW50fWApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3dhcm4nOlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGAke3RhZ30gJHtjb250ZW50fWApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgJHt0YWd9IFske2xldmVsfV0gJHtjb250ZW50fWApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBQYW5lbCBicm9hZGNhc3QgKGJlc3QtZWZmb3J0LCBpZ25vcmUgaWYgRWRpdG9yIG5vdCByZWFkeSlcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5icm9hZGNhc3QoJ2NvY29zLW1jcC1zZXJ2ZXI6b24tbG9nJywgZW50cnkpO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBQYW5lbCBtYXkgbm90IGJlIG9wZW5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIERpc2sgcGVyc2lzdGVuY2VcclxuICAgICAgICB0aGlzLndyaXRlVG9EaXNrKGVudHJ5KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHdyaXRlVG9EaXNrKGVudHJ5OiBMb2dFbnRyeSk6IHZvaWQge1xyXG4gICAgICAgIGlmICghdGhpcy5sb2dGaWxlUGF0aCkgcmV0dXJuO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFJvdGF0ZSBpZiBmaWxlIGV4Y2VlZHMgbWF4IHNpemVcclxuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGhpcy5sb2dGaWxlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyh0aGlzLmxvZ0ZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmIChzdGF0LnNpemUgPiBNQVhfTE9HX0ZJTEVfQllURVMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3RhdGVkUGF0aCA9IHRoaXMubG9nRmlsZVBhdGggKyAnLjEnO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHJvdGF0ZWRQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKHJvdGF0ZWRQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZnMucmVuYW1lU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCByb3RhdGVkUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbGluZSA9IGBbJHtlbnRyeS50aW1lfV0gWyR7ZW50cnkubGV2ZWwudG9VcHBlckNhc2UoKX1dICR7ZW50cnkuY29udGVudH1cXG5gO1xyXG4gICAgICAgICAgICBmcy5hcHBlbmRGaWxlU3luYyh0aGlzLmxvZ0ZpbGVQYXRoLCBsaW5lKTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRGlzayBsb2dnaW5nIGlzIGJlc3QtZWZmb3J0XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHJlY2VudCBsb2cgZW50cmllcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBsZXZlbC5cclxuICAgICAqL1xyXG4gICAgZ2V0RW50cmllcyhsaW1pdDogbnVtYmVyID0gMTAwLCBsZXZlbD86IExvZ0xldmVsKTogTG9nRW50cnlbXSB7XHJcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSBsZXZlbCA/IHRoaXMuYnVmZmVyLmZpbHRlcihlID0+IGUubGV2ZWwgPT09IGxldmVsKSA6IHRoaXMuYnVmZmVyO1xyXG4gICAgICAgIHJldHVybiBmaWx0ZXJlZC5zbGljZSgtbGltaXQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogR2V0IGxvZ3MgYXMgZm9ybWF0dGVkIHRleHQgKGZvciBNQ1AgcmVzb3VyY2VzKS5cclxuICAgICAqL1xyXG4gICAgZ2V0TG9nQ29udGVudChsaW1pdDogbnVtYmVyID0gMjAwLCBsZXZlbD86IExvZ0xldmVsKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5nZXRFbnRyaWVzKGxpbWl0LCBsZXZlbClcclxuICAgICAgICAgICAgLm1hcChlID0+IGBbJHtlLnRpbWV9XSBbJHtlLmxldmVsLnRvVXBwZXJDYXNlKCl9XSAke2UuY29udGVudH1gKVxyXG4gICAgICAgICAgICAuam9pbignXFxuJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhciB0aGUgaW4tbWVtb3J5IGJ1ZmZlci5cclxuICAgICAqL1xyXG4gICAgY2xlYXIoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5idWZmZXIgPSBbXTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFNoYXJlZCBsb2dnZXIgaW5zdGFuY2UgKi9cclxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcclxuIl19