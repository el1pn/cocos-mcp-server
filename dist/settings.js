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
exports.DEFAULT_SETTINGS = void 0;
exports.getMcpServerDataDir = getMcpServerDataDir;
exports.readSettings = readSettings;
exports.saveSettings = saveSettings;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DEFAULT_SETTINGS = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10
};
exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
/** Machine-local data; Cocos project templates typically gitignore `local/`. */
function getMcpServerDataDir(projectPath) {
    return path.join(projectPath, 'local', 'cocos-mcp-server');
}
function getLegacySettingsPath(projectPath) {
    return path.join(projectPath, 'settings', 'mcp-server.json');
}
function getSettingsPath() {
    return path.join(getMcpServerDataDir(Editor.Project.path), 'mcp-server.json');
}
function ensureDataDir() {
    const dir = getMcpServerDataDir(Editor.Project.path);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
/** One-time copy from old `settings/mcp-server.json` (often tracked by git). */
function migrateLegacySettingsIfNeeded() {
    const projectPath = Editor.Project.path;
    const nextPath = path.join(getMcpServerDataDir(projectPath), 'mcp-server.json');
    if (fs.existsSync(nextPath)) {
        return;
    }
    const legacyPath = getLegacySettingsPath(projectPath);
    if (!fs.existsSync(legacyPath)) {
        return;
    }
    try {
        ensureDataDir();
        fs.copyFileSync(legacyPath, nextPath);
        fs.unlinkSync(legacyPath);
    }
    catch (e) {
        console.error('Failed to migrate legacy MCP settings:', e);
    }
}
function readSettings() {
    try {
        migrateLegacySettingsIfNeeded();
        ensureDataDir();
        const settingsFile = getSettingsPath();
        if (fs.existsSync(settingsFile)) {
            const content = fs.readFileSync(settingsFile, 'utf8');
            return Object.assign(Object.assign({}, DEFAULT_SETTINGS), JSON.parse(content));
        }
    }
    catch (e) {
        console.error('Failed to read settings:', e);
    }
    return DEFAULT_SETTINGS;
}
function saveSettings(settings) {
    try {
        ensureDataDir();
        const settingsFile = getSettingsPath();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    }
    catch (e) {
        console.error('Failed to save settings:', e);
        throw e;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2V0dGluZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBYUEsa0RBRUM7QUFxQ0Qsb0NBYUM7QUFFRCxvQ0FTQztBQTVFRCx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRzdCLE1BQU0sZ0JBQWdCLEdBQXNCO0lBQ3hDLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxFQUFFLEtBQUs7SUFDaEIsY0FBYyxFQUFFLEtBQUs7SUFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQ3JCLGNBQWMsRUFBRSxFQUFFO0NBQ3JCLENBQUM7QUFvRU8sNENBQWdCO0FBbEV6QixnRkFBZ0Y7QUFDaEYsU0FBZ0IsbUJBQW1CLENBQUMsV0FBbUI7SUFDbkQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUMvRCxDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxXQUFtQjtJQUM5QyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pFLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFDcEIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUNsRixDQUFDO0FBRUQsU0FBUyxhQUFhO0lBQ2xCLE1BQU0sR0FBRyxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDckQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUN0QixFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLENBQUM7QUFDTCxDQUFDO0FBRUQsZ0ZBQWdGO0FBQ2hGLFNBQVMsNkJBQTZCO0lBQ2xDLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0lBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNoRixJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUMxQixPQUFPO0lBQ1gsQ0FBQztJQUNELE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDN0IsT0FBTztJQUNYLENBQUM7SUFDRCxJQUFJLENBQUM7UUFDRCxhQUFhLEVBQUUsQ0FBQztRQUNoQixFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUN0QyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQWdCLFlBQVk7SUFDeEIsSUFBSSxDQUFDO1FBQ0QsNkJBQTZCLEVBQUUsQ0FBQztRQUNoQyxhQUFhLEVBQUUsQ0FBQztRQUNoQixNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUN2QyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztZQUM5QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN0RCx1Q0FBWSxnQkFBZ0IsR0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFHO1FBQzNELENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUNELE9BQU8sZ0JBQWdCLENBQUM7QUFDNUIsQ0FBQztBQUVELFNBQWdCLFlBQVksQ0FBQyxRQUEyQjtJQUNwRCxJQUFJLENBQUM7UUFDRCxhQUFhLEVBQUUsQ0FBQztRQUNoQixNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQztRQUN2QyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxDQUFDLENBQUM7SUFDWixDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXJTZXR0aW5ncyB9IGZyb20gJy4vdHlwZXMnO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBNQ1BTZXJ2ZXJTZXR0aW5ncyA9IHtcbiAgICBwb3J0OiAzMDAwLFxuICAgIGF1dG9TdGFydDogZmFsc2UsXG4gICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxuICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICBtYXhDb25uZWN0aW9uczogMTBcbn07XG5cbi8qKiBNYWNoaW5lLWxvY2FsIGRhdGE7IENvY29zIHByb2plY3QgdGVtcGxhdGVzIHR5cGljYWxseSBnaXRpZ25vcmUgYGxvY2FsL2AuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWNwU2VydmVyRGF0YURpcihwcm9qZWN0UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnbG9jYWwnLCAnY29jb3MtbWNwLXNlcnZlcicpO1xufVxuXG5mdW5jdGlvbiBnZXRMZWdhY3lTZXR0aW5nc1BhdGgocHJvamVjdFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ3NldHRpbmdzJywgJ21jcC1zZXJ2ZXIuanNvbicpO1xufVxuXG5mdW5jdGlvbiBnZXRTZXR0aW5nc1BhdGgoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5qb2luKGdldE1jcFNlcnZlckRhdGFEaXIoRWRpdG9yLlByb2plY3QucGF0aCksICdtY3Atc2VydmVyLmpzb24nKTtcbn1cblxuZnVuY3Rpb24gZW5zdXJlRGF0YURpcigpOiB2b2lkIHtcbiAgICBjb25zdCBkaXIgPSBnZXRNY3BTZXJ2ZXJEYXRhRGlyKEVkaXRvci5Qcm9qZWN0LnBhdGgpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIGZzLm1rZGlyU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIH1cbn1cblxuLyoqIE9uZS10aW1lIGNvcHkgZnJvbSBvbGQgYHNldHRpbmdzL21jcC1zZXJ2ZXIuanNvbmAgKG9mdGVuIHRyYWNrZWQgYnkgZ2l0KS4gKi9cbmZ1bmN0aW9uIG1pZ3JhdGVMZWdhY3lTZXR0aW5nc0lmTmVlZGVkKCk6IHZvaWQge1xuICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3QucGF0aDtcbiAgICBjb25zdCBuZXh0UGF0aCA9IHBhdGguam9pbihnZXRNY3BTZXJ2ZXJEYXRhRGlyKHByb2plY3RQYXRoKSwgJ21jcC1zZXJ2ZXIuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKG5leHRQYXRoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxlZ2FjeVBhdGggPSBnZXRMZWdhY3lTZXR0aW5nc1BhdGgocHJvamVjdFBhdGgpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhsZWdhY3lQYXRoKSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGVuc3VyZURhdGFEaXIoKTtcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKGxlZ2FjeVBhdGgsIG5leHRQYXRoKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsZWdhY3lQYXRoKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBtaWdyYXRlIGxlZ2FjeSBNQ1Agc2V0dGluZ3M6JywgZSk7XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFNldHRpbmdzKCk6IE1DUFNlcnZlclNldHRpbmdzIHtcbiAgICB0cnkge1xuICAgICAgICBtaWdyYXRlTGVnYWN5U2V0dGluZ3NJZk5lZWRlZCgpO1xuICAgICAgICBlbnN1cmVEYXRhRGlyKCk7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzRmlsZSA9IGdldFNldHRpbmdzUGF0aCgpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhzZXR0aW5nc0ZpbGUpKSB7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHNldHRpbmdzRmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIHJldHVybiB7IC4uLkRFRkFVTFRfU0VUVElOR1MsIC4uLkpTT04ucGFyc2UoY29udGVudCkgfTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgc2V0dGluZ3M6JywgZSk7XG4gICAgfVxuICAgIHJldHVybiBERUZBVUxUX1NFVFRJTkdTO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncyk6IHZvaWQge1xuICAgIHRyeSB7XG4gICAgICAgIGVuc3VyZURhdGFEaXIoKTtcbiAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gZ2V0U2V0dGluZ3NQYXRoKCk7XG4gICAgICAgIGZzLndyaXRlRmlsZVN5bmMoc2V0dGluZ3NGaWxlLCBKU09OLnN0cmluZ2lmeShzZXR0aW5ncywgbnVsbCwgMikpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHNhdmUgc2V0dGluZ3M6JywgZSk7XG4gICAgICAgIHRocm93IGU7XG4gICAgfVxufVxuXG5leHBvcnQgeyBERUZBVUxUX1NFVFRJTkdTIH07XG4iXX0=