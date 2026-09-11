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
        // Every action needs a query; without this check a missing one surfaces as
        // "Invalid regex: Cannot read properties of undefined", which says nothing
        // about the actual mistake.
        if (typeof (args === null || args === void 0 ? void 0 : args.query) !== 'string' || args.query === '') {
            return { success: false, error: `query is required for '${args === null || args === void 0 ? void 0 : args.action}' and must be a non-empty string` };
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlYXJjaC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQWEsV0FBVztJQUNwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFDUCxnRUFBZ0U7b0JBQ2hFLG1EQUFtRDtvQkFDbkQsMENBQTBDO29CQUMxQyw4Q0FBOEM7Z0JBQ2xELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDOzRCQUMxQyxXQUFXLEVBQUUsYUFBYTt5QkFDN0I7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzQ0FBc0M7eUJBQ3REO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0RBQW9EOzRCQUNqRSxPQUFPLEVBQUUsYUFBYTt5QkFDekI7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSx1Q0FBdUM7NEJBQ3BELE9BQU8sRUFBRSxLQUFLO3lCQUNqQjt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDekIsV0FBVyxFQUFFLHlGQUF5Rjt5QkFDekc7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FB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QztnQkFDNUMsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUN6RSxDQUFDO2dCQUNELElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNuQixDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWpCLE9BQU87WUFDSCxPQUFPLEVBQUUsSUFBSTtZQUNiLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBSSxVQUFVLEVBQUU7U0FDM0YsQ0FBQztJQUNOLENBQUM7SUFFTyxXQUFXLENBQUMsR0FBVztRQUMzQixPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsQ0FBQztDQUNKO0FBcE9ELGtDQW9PQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBjbGFzcyBTZWFyY2hUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NlYXJjaF9wcm9qZWN0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ1NlYXJjaCBmaWxlcyBpbiB0aGUgQ29jb3MgQ3JlYXRvciBwcm9qZWN0LiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdjb250ZW50IChzZWFyY2ggZmlsZSBjb250ZW50cyBieSB0ZXh0IG9yIHJlZ2V4KSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdmaWxlX25hbWUgKGZpbmQgZmlsZXMgYnkgbmFtZSBwYXR0ZXJuKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdkaXJfbmFtZSAoZmluZCBkaXJlY3RvcmllcyBieSBuYW1lIHBhdHRlcm4pLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY29udGVudCcsICdmaWxlX25hbWUnLCAnZGlyX25hbWUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlYXJjaCBtb2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZWFyY2ggcXVlcnkgKHRleHQgb3IgcmVnZXggcGF0dGVybiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHBhdGggdG8gc2VhcmNoIGluIChkZWZhdWx0OiBkYjovL2Fzc2V0cyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VSZWdleDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RyZWF0IHF1ZXJ5IGFzIHJlZ2V4IChkZWZhdWx0OiBmYWxzZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgZXh0ZW5zaW9ucyB0byBpbmNsdWRlIChlLmcuIFtcIi50c1wiLCBcIi5qc1wiXSkuIERlZmF1bHQ6IGNvbW1vbiBjb2RlL2RhdGEgZXh0ZW5zaW9ucy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4UmVzdWx0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSByZXN1bHRzIHRvIHJldHVybiAoZGVmYXVsdDogNTApJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nLCAncXVlcnknXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBFdmVyeSBhY3Rpb24gbmVlZHMgYSBxdWVyeTsgd2l0aG91dCB0aGlzIGNoZWNrIGEgbWlzc2luZyBvbmUgc3VyZmFjZXMgYXNcbiAgICAgICAgLy8gXCJJbnZhbGlkIHJlZ2V4OiBDYW5ub3QgcmVhZCBwcm9wZXJ0aWVzIG9mIHVuZGVmaW5lZFwiLCB3aGljaCBzYXlzIG5vdGhpbmdcbiAgICAgICAgLy8gYWJvdXQgdGhlIGFjdHVhbCBtaXN0YWtlLlxuICAgICAgICBpZiAodHlwZW9mIGFyZ3M/LnF1ZXJ5ICE9PSAnc3RyaW5nJyB8fCBhcmdzLnF1ZXJ5ID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgcXVlcnkgaXMgcmVxdWlyZWQgZm9yICcke2FyZ3M/LmFjdGlvbn0nIGFuZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZ2AgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbnRlbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaENvbnRlbnQoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdmaWxlX25hbWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaEZpbGVOYW1lKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnZGlyX25hbWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNlYXJjaERpck5hbWUoYXJncyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0UHJvamVjdFBhdGgoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZXNvbHZlU2VhcmNoUGF0aChkYlBhdGg/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IHRoaXMuZ2V0UHJvamVjdFBhdGgoKTtcbiAgICAgICAgaWYgKCFkYlBhdGggfHwgZGJQYXRoID09PSAnZGI6Ly9hc3NldHMnKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihwcm9qZWN0UGF0aCwgZGJQYXRoLnJlcGxhY2UoJ2RiOi8vJywgJycpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldERlZmF1bHRFeHRlbnNpb25zKCk6IHN0cmluZ1tdIHtcbiAgICAgICAgcmV0dXJuIFsnLnRzJywgJy5qcycsICcuanNvbicsICcuc2NlbmUnLCAnLnByZWZhYicsICcuYW5pbScsICcuZWZmZWN0JywgJy5tdGwnXTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaENvbnRlbnQoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3Qgc2VhcmNoUGF0aCA9IHRoaXMucmVzb2x2ZVNlYXJjaFBhdGgoYXJncy5wYXRoKTtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9ucyA9IGFyZ3MuZXh0ZW5zaW9ucyB8fCB0aGlzLmdldERlZmF1bHRFeHRlbnNpb25zKCk7XG4gICAgICAgIGNvbnN0IG1heFJlc3VsdHMgPSBNYXRoLm1pbihhcmdzLm1heFJlc3VsdHMgfHwgNTAsIDIwMCk7XG4gICAgICAgIGNvbnN0IHVzZVJlZ2V4ID0gYXJncy51c2VSZWdleCB8fCBmYWxzZTtcblxuICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlZ2V4ID0gdXNlUmVnZXggPyBuZXcgUmVnRXhwKGFyZ3MucXVlcnksICdnaScpIDogbmV3IFJlZ0V4cCh0aGlzLmVzY2FwZVJlZ2V4KGFyZ3MucXVlcnkpLCAnZ2knKTtcbiAgICAgICAgfSBjYXRjaCAoZTogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIHJlZ2V4OiAke2UubWVzc2FnZX1gIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHRzOiBBcnJheTx7IGZpbGU6IHN0cmluZzsgbGluZTogbnVtYmVyOyBjb250ZW50OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICBjb25zdCB3YWxrID0gKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cykgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB3YWxrKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShlbnRyeS5uYW1lKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0KSkgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzKSBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVnZXgudGVzdChsaW5lc1tpXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnZXgubGFzdEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IGkgKyAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogbGluZXNbaV0udHJpbSgpLnN1YnN0cmluZygwLCAyMDApXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGJpbmFyeSBvciB1bnJlYWRhYmxlIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgd2FsayhzZWFyY2hQYXRoKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHsgcmVzdWx0cywgdG90YWxNYXRjaGVzOiByZXN1bHRzLmxlbmd0aCwgdHJ1bmNhdGVkOiByZXN1bHRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNlYXJjaEZpbGVOYW1lKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHNlYXJjaFBhdGggPSB0aGlzLnJlc29sdmVTZWFyY2hQYXRoKGFyZ3MucGF0aCk7XG4gICAgICAgIGNvbnN0IG1heFJlc3VsdHMgPSBNYXRoLm1pbihhcmdzLm1heFJlc3VsdHMgfHwgNTAsIDIwMCk7XG4gICAgICAgIGNvbnN0IHVzZVJlZ2V4ID0gYXJncy51c2VSZWdleCB8fCBmYWxzZTtcblxuICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlZ2V4ID0gdXNlUmVnZXggPyBuZXcgUmVnRXhwKGFyZ3MucXVlcnksICdpJykgOiBuZXcgUmVnRXhwKHRoaXMuZXNjYXBlUmVnZXgoYXJncy5xdWVyeSksICdpJyk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCByZWdleDogJHtlLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBjb25zdCB3YWxrID0gKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cykgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB3YWxrKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSgpICYmIHJlZ2V4LnRlc3QoZW50cnkubmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHdhbGsoc2VhcmNoUGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7IHJlc3VsdHMsIHRvdGFsTWF0Y2hlczogcmVzdWx0cy5sZW5ndGgsIHRydW5jYXRlZDogcmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cyB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZWFyY2hEaXJOYW1lKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHNlYXJjaFBhdGggPSB0aGlzLnJlc29sdmVTZWFyY2hQYXRoKGFyZ3MucGF0aCk7XG4gICAgICAgIGNvbnN0IG1heFJlc3VsdHMgPSBNYXRoLm1pbihhcmdzLm1heFJlc3VsdHMgfHwgNTAsIDIwMCk7XG4gICAgICAgIGNvbnN0IHVzZVJlZ2V4ID0gYXJncy51c2VSZWdleCB8fCBmYWxzZTtcblxuICAgICAgICBsZXQgcmVnZXg6IFJlZ0V4cDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlZ2V4ID0gdXNlUmVnZXggPyBuZXcgUmVnRXhwKGFyZ3MucXVlcnksICdpJykgOiBuZXcgUmVnRXhwKHRoaXMuZXNjYXBlUmVnZXgoYXJncy5xdWVyeSksICdpJyk7XG4gICAgICAgIH0gY2F0Y2ggKGU6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCByZWdleDogJHtlLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBjb25zdCB3YWxrID0gKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cykgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHJldHVybjtcblxuICAgICAgICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xuICAgICAgICAgICAgICAgIGlmICghZW50cnkuaXNEaXJlY3RvcnkoKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnLicpIHx8IGVudHJ5Lm5hbWUgPT09ICdub2RlX21vZHVsZXMnKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlZ2V4LnRlc3QoZW50cnkubmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGZ1bGxQYXRoLnJlcGxhY2UodGhpcy5nZXRQcm9qZWN0UGF0aCgpICsgJy8nLCAnZGI6Ly8nKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdhbGsoZnVsbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIHdhbGsoc2VhcmNoUGF0aCk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBkYXRhOiB7IHJlc3VsdHMsIHRvdGFsTWF0Y2hlczogcmVzdWx0cy5sZW5ndGgsIHRydW5jYXRlZDogcmVzdWx0cy5sZW5ndGggPj0gbWF4UmVzdWx0cyB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBlc2NhcGVSZWdleChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiBzdHIucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKTtcbiAgICB9XG59XG4iXX0=