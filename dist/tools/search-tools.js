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
exports.SearchTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SearchTools {
    getTools() {
        return [
            {
                name: 'search_project',
                description: 'Search files in the Cocos Creator project. Available actions: ' +
                    'content (search file contents by text or regex), ' +
                    'file_name (find files by name pattern), ' +
                    'dir_name (find directories by name pattern).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['content', 'file_name', 'dir_name'],
                            description: 'Search mode'
                        },
                        query: {
                            type: 'string',
                            description: 'Search query (text or regex pattern)'
                        },
                        path: {
                            type: 'string',
                            description: 'Directory path to search in (default: db://assets)',
                            default: 'db://assets'
                        },
                        useRegex: {
                            type: 'boolean',
                            description: 'Treat query as regex (default: false)',
                            default: false
                        },
                        extensions: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include (e.g. [".ts", ".js"]). Default: common code/data extensions.'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum results to return (default: 50)',
                            default: 50
                        }
                    },
                    required: ['action', 'query']
                }
            }
        ];
    }
    async execute(_toolName, args) {
        switch (args.action) {
            case 'content':
                return await this.searchContent(args);
            case 'file_name':
                return await this.searchFileName(args);
            case 'dir_name':
                return await this.searchDirName(args);
            default:
                return { success: false, error: `Unknown action: ${args.action}` };
        }
    }
    getProjectPath() {
        return Editor.Project.path;
    }
    resolveSearchPath(dbPath) {
        const projectPath = this.getProjectPath();
        if (!dbPath || dbPath === 'db://assets') {
            return path.join(projectPath, 'assets');
        }
        return path.join(projectPath, dbPath.replace('db://', ''));
    }
    getDefaultExtensions() {
        return ['.ts', '.js', '.json', '.scene', '.prefab', '.anim', '.effect', '.mtl'];
    }
    async searchContent(args) {
        const searchPath = this.resolveSearchPath(args.path);
        const extensions = args.extensions || this.getDefaultExtensions();
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;
        let regex;
        try {
            regex = useRegex ? new RegExp(args.query, 'gi') : new RegExp(this.escapeRegex(args.query), 'gi');
        }
        catch (e) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }
        const results = [];
        const walk = (dir) => {
            if (results.length >= maxResults)
                return;
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults)
                    break;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules')
                        continue;
                    walk(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!extensions.includes(ext))
                        continue;
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const lines = content.split('\n');
                        for (let i = 0; i < lines.length; i++) {
                            if (results.length >= maxResults)
                                break;
                            if (regex.test(lines[i])) {
                                regex.lastIndex = 0;
                                results.push({
                                    file: fullPath.replace(this.getProjectPath() + '/', 'db://'),
                                    line: i + 1,
                                    content: lines[i].trim().substring(0, 200)
                                });
                            }
                        }
                    }
                    catch (_a) {
                        // Skip binary or unreadable files
                    }
                }
            }
        };
        walk(searchPath);
        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }
    async searchFileName(args) {
        const searchPath = this.resolveSearchPath(args.path);
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;
        let regex;
        try {
            regex = useRegex ? new RegExp(args.query, 'i') : new RegExp(this.escapeRegex(args.query), 'i');
        }
        catch (e) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }
        const results = [];
        const walk = (dir) => {
            if (results.length >= maxResults)
                return;
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults)
                    break;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') || entry.name === 'node_modules')
                        continue;
                    walk(fullPath);
                }
                else if (entry.isFile() && regex.test(entry.name)) {
                    results.push(fullPath.replace(this.getProjectPath() + '/', 'db://'));
                }
            }
        };
        walk(searchPath);
        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }
    async searchDirName(args) {
        const searchPath = this.resolveSearchPath(args.path);
        const maxResults = Math.min(args.maxResults || 50, 200);
        const useRegex = args.useRegex || false;
        let regex;
        try {
            regex = useRegex ? new RegExp(args.query, 'i') : new RegExp(this.escapeRegex(args.query), 'i');
        }
        catch (e) {
            return { success: false, error: `Invalid regex: ${e.message}` };
        }
        const results = [];
        const walk = (dir) => {
            if (results.length >= maxResults)
                return;
            if (!fs.existsSync(dir))
                return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (results.length >= maxResults)
                    break;
                if (!entry.isDirectory())
                    continue;
                if (entry.name.startsWith('.') || entry.name === 'node_modules')
                    continue;
                const fullPath = path.join(dir, entry.name);
                if (regex.test(entry.name)) {
                    results.push(fullPath.replace(this.getProjectPath() + '/', 'db://'));
                }
                walk(fullPath);
            }
        };
        walk(searchPath);
        return {
            success: true,
            data: { results, totalMatches: results.length, truncated: results.length >= maxResults }
        };
    }
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
exports.SearchTools = SearchTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlYXJjaC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQWEsV0FBVztJQUNwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFDUCxnRUFBZ0U7b0JBQ2hFLG1EQUFtRDtvQkFDbkQsMENBQTBDO29CQUMxQyw4Q0FBOEM7Z0JBQ2xELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDOzRCQUMxQyxXQUFXLEVBQUUsYUFBYTt5QkFDN0I7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzQ0FBc0M7eUJBQ3REO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0RBQW9EOzRCQUNqRSxPQUFPLEVBQUUsYUFBYTt5QkFDekI7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSx1Q0FBdUM7NEJBQ3BELE9BQU8sRUFBRSxLQUFLO3lCQUNqQjt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDekIsV0FBVyxFQUFFLHlGQUF5Rjt5QkFDekc7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FB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RWpCLE9BQU87WUFDSCxPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBSSxVQUFVLEVBQUU7U0FDM0YsQ0FBQztJQUNOLENBQUM7SUFFTyxXQUFXLENBQUMsR0FBVztRQUMzQixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNKO0FBN05ELGtDQTZOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlYXJjaFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZWFyY2hfcHJvamVjdCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAnU2VhcmNoIGZpbGVzIGluIHRoZSBDb2NvcyBDcmVhdG9yIHByb2plY3QuIEF2YWlsYWJsZSBhY3Rpb25zOiAnICtcclxuICAgICAgICAgICAgICAgICAgICAnY29udGVudCAoc2VhcmNoIGZpbGUgY29udGVudHMgYnkgdGV4dCBvciByZWdleCksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdmaWxlX25hbWUgKGZpbmQgZmlsZXMgYnkgbmFtZSBwYXR0ZXJuKSwgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2Rpcl9uYW1lIChmaW5kIGRpcmVjdG9yaWVzIGJ5IG5hbWUgcGF0dGVybikuJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydjb250ZW50JywgJ2ZpbGVfbmFtZScsICdkaXJfbmFtZSddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZWFyY2ggbW9kZSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVlcnk6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZWFyY2ggcXVlcnkgKHRleHQgb3IgcmVnZXggcGF0dGVybiknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEaXJlY3RvcnkgcGF0aCB0byBzZWFyY2ggaW4gKGRlZmF1bHQ6IGRiOi8vYXNzZXRzKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZVJlZ2V4OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RyZWF0IHF1ZXJ5IGFzIHJlZ2V4IChkZWZhdWx0OiBmYWxzZSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgZXh0ZW5zaW9ucyB0byBpbmNsdWRlIChlLmcuIFtcIi50c1wiLCBcIi5qc1wiXSkuIERlZmF1bHQ6IGNvbW1vbiBjb2RlL2RhdGEgZXh0ZW5zaW9ucy4nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXhpbXVtIHJlc3VsdHMgdG8gcmV0dXJuIChkZWZhdWx0OiA1MCknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJywgJ3F1ZXJ5J11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZShfdG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvbnRlbnQnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2VhcmNoQ29udGVudChhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnZmlsZV9uYW1lJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaEZpbGVOYW1lKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdkaXJfbmFtZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZWFyY2hEaXJOYW1lKGFyZ3MpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFByb2plY3RQYXRoKCk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSByZXNvbHZlU2VhcmNoUGF0aChkYlBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gdGhpcy5nZXRQcm9qZWN0UGF0aCgpO1xyXG4gICAgICAgIGlmICghZGJQYXRoIHx8IGRiUGF0aCA9PT0gJ2RiOi8vYXNzZXRzJykge1xyXG4gICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIGRiUGF0aC5yZXBsYWNlKCdkYjovLycsICcnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXREZWZhdWx0RXh0ZW5zaW9ucygpOiBzdHJpbmdbXSB7XHJcbiAgICAgICAgcmV0dXJuIFsnLnRzJywgJy5qcycsICcuanNvbicsICcuc2NlbmUnLCAnLnByZWZhYicsICcuYW5pbScsICcuZWZmZWN0JywgJy5tdGwnXTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaENvbnRlbnQoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCBzZWFyY2hQYXRoID0gdGhpcy5yZXNvbHZlU2VhcmNoUGF0aChhcmdzLnBhdGgpO1xyXG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbnMgPSBhcmdzLmV4dGVuc2lvbnMgfHwgdGhpcy5nZXREZWZhdWx0RXh0ZW5zaW9ucygpO1xyXG4gICAgICAgIGNvbnN0IG1heFJlc3VsdHMgPSBNYXRoLm1pbihhcmdzLm1heFJlc3VsdHMgfHwgNTAsIDIwMCk7XHJcbiAgICAgICAgY29uc3QgdXNlUmVnZXggPSBhcmdzLnVzZVJlZ2V4IHx8IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZWdleCA9IHVzZVJlZ2V4ID8gbmV3IFJlZ0V4cChhcmdzLnF1ZXJ5LCAnZ2knKSA6IG5ldyBSZWdFeHAodGhpcy5lc2NhcGVSZWdleChhcmdzLnF1ZXJ5KSwgJ2dpJyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgcmVnZXg6ICR7ZS5tZXNzYWdlfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PHsgZmlsZTogc3RyaW5nOyBsaW5lOiBudW1iZXI7IGNvbnRlbnQ6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuICAgICAgICBjb25zdCB3YWxrID0gKGRpcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBlbnRyeS5uYW1lKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSB8fCBlbnRyeS5uYW1lID09PSAnbm9kZV9tb2R1bGVzJykgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgd2FsayhmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGVudHJ5Lm5hbWUpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHRlbnNpb25zLmluY2x1ZGVzKGV4dCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCAndXRmOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cykgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVnZXgudGVzdChsaW5lc1tpXSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWdleC5sYXN0SW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZTogaSArIDEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGxpbmVzW2ldLnRyaW0oKS5zdWJzdHJpbmcoMCwgMjAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgYmluYXJ5IG9yIHVucmVhZGFibGUgZmlsZXNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3YWxrKHNlYXJjaFBhdGgpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiB7IHJlc3VsdHMsIHRvdGFsTWF0Y2hlczogcmVzdWx0cy5sZW5ndGgsIHRydW5jYXRlZDogcmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cyB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaEZpbGVOYW1lKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3Qgc2VhcmNoUGF0aCA9IHRoaXMucmVzb2x2ZVNlYXJjaFBhdGgoYXJncy5wYXRoKTtcclxuICAgICAgICBjb25zdCBtYXhSZXN1bHRzID0gTWF0aC5taW4oYXJncy5tYXhSZXN1bHRzIHx8IDUwLCAyMDApO1xyXG4gICAgICAgIGNvbnN0IHVzZVJlZ2V4ID0gYXJncy51c2VSZWdleCB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IHJlZ2V4OiBSZWdFeHA7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmVnZXggPSB1c2VSZWdleCA/IG5ldyBSZWdFeHAoYXJncy5xdWVyeSwgJ2knKSA6IG5ldyBSZWdFeHAodGhpcy5lc2NhcGVSZWdleChhcmdzLnF1ZXJ5KSwgJ2knKTtcclxuICAgICAgICB9IGNhdGNoIChlOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCByZWdleDogJHtlLm1lc3NhZ2V9YCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3Qgd2FsayA9IChkaXI6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cykgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzKSBicmVhaztcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHdhbGsoZnVsbFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiByZWdleC50ZXN0KGVudHJ5Lm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICB3YWxrKHNlYXJjaFBhdGgpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICBkYXRhOiB7IHJlc3VsdHMsIHRvdGFsTWF0Y2hlczogcmVzdWx0cy5sZW5ndGgsIHRydW5jYXRlZDogcmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cyB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaERpck5hbWUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCBzZWFyY2hQYXRoID0gdGhpcy5yZXNvbHZlU2VhcmNoUGF0aChhcmdzLnBhdGgpO1xyXG4gICAgICAgIGNvbnN0IG1heFJlc3VsdHMgPSBNYXRoLm1pbihhcmdzLm1heFJlc3VsdHMgfHwgNTAsIDIwMCk7XHJcbiAgICAgICAgY29uc3QgdXNlUmVnZXggPSBhcmdzLnVzZVJlZ2V4IHx8IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICByZWdleCA9IHVzZVJlZ2V4ID8gbmV3IFJlZ0V4cChhcmdzLnF1ZXJ5LCAnaScpIDogbmV3IFJlZ0V4cCh0aGlzLmVzY2FwZVJlZ2V4KGFyZ3MucXVlcnkpLCAnaScpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIHJlZ2V4OiAke2UubWVzc2FnZX1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZXN1bHRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBjb25zdCB3YWxrID0gKGRpcjogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzKSByZXR1cm47XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFlbnRyeS5pc0RpcmVjdG9yeSgpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSB8fCBlbnRyeS5uYW1lID09PSAnbm9kZV9tb2R1bGVzJykgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBlbnRyeS5uYW1lKTtcclxuICAgICAgICAgICAgICAgIGlmIChyZWdleC50ZXN0KGVudHJ5Lm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3YWxrKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHdhbGsoc2VhcmNoUGF0aCk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIGRhdGE6IHsgcmVzdWx0cywgdG90YWxNYXRjaGVzOiByZXN1bHRzLmxlbmd0aCwgdHJ1bmNhdGVkOiByZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZXNjYXBlUmVnZXgoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKTtcclxuICAgIH1cclxufVxyXG4iXX0=