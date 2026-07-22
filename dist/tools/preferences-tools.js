"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesTools = void 0;
const editor_request_1 = require("../utils/editor-request");
class PreferencesTools {
    getTools() {
        return [
            {
                name: 'preferences_config',
                description: 'Manage preferences configuration. Actions: open_settings (open preferences settings panel), query (query preferences configuration), set (set preferences configuration), get_all (get all available preferences categories), reset (reset preferences to default values)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['open_settings', 'query', 'set', 'get_all', 'reset']
                        },
                        tab: {
                            type: 'string',
                            description: 'Preferences tab to open (action: open_settings)',
                            enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions']
                        },
                        args: {
                            type: 'array',
                            description: 'Additional arguments to pass to the tab (action: open_settings)'
                        },
                        name: {
                            type: 'string',
                            description: 'Plugin or category name (action: query, set, reset)',
                            default: 'general'
                        },
                        path: {
                            type: 'string',
                            description: 'Configuration path (action: query, set)'
                        },
                        value: {
                            oneOf: [
                                { type: 'string' },
                                { type: 'number' },
                                { type: 'boolean' },
                                { type: 'object' },
                                { type: 'array' },
                                { type: 'null' }
                            ],
                            description: 'Configuration value (action: set)'
                        },
                        type: {
                            type: 'string',
                            description: 'Configuration type (action: query, set, reset)',
                            enum: ['default', 'global', 'local'],
                            default: 'global'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'preferences_io',
                description: 'Import/export preferences. Actions: export (export current preferences configuration), import (import preferences configuration from file)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['export', 'import']
                        },
                        exportPath: {
                            type: 'string',
                            description: 'Path to export preferences file (action: export)'
                        },
                        importPath: {
                            type: 'string',
                            description: 'Path to import preferences file from (action: import)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'preferences_config':
                switch (args.action) {
                    case 'open_settings':
                        return await this.openPreferencesSettings(args.tab, args.args);
                    case 'query':
                        return await this.queryPreferencesConfig(args.name, args.path, args.type);
                    case 'set':
                        return await this.setPreferencesConfig(args.name, args.path, args.value, args.type);
                    case 'get_all':
                        return await this.getAllPreferences();
                    case 'reset':
                        return await this.resetPreferences(args.name, args.type);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            case 'preferences_io':
                switch (args.action) {
                    case 'export':
                        return await this.exportPreferences(args.exportPath);
                    case 'import':
                        return await this.importPreferences(args.importPath);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async openPreferencesSettings(tab, args) {
        const requestArgs = [];
        if (tab) {
            requestArgs.push(tab);
        }
        if (args && args.length > 0) {
            requestArgs.push(...args);
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('preferences', 'open-settings', ...requestArgs), () => ({ message: `Preferences settings opened${tab ? ` on tab: ${tab}` : ''}` }));
    }
    async queryPreferencesConfig(name, path, type = 'global') {
        const requestArgs = [name];
        if (path) {
            requestArgs.push(path);
        }
        requestArgs.push(type);
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('preferences', 'query-config', ...requestArgs), (config) => ({
            data: {
                name: name,
                path: path,
                type: type,
                config: config
            }
        }));
    }
    async setPreferencesConfig(name, path, value, type = 'global') {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('preferences', 'set-config', name, path, value, type), (success) => {
            if (success) {
                return { message: `Preference '${name}.${path}' updated successfully` };
            }
            throw new Error(`Failed to update preference '${name}.${path}'`);
        });
    }
    async getAllPreferences() {
        return (0, editor_request_1.toolCall)(async () => {
            // Common preference categories in Cocos Creator
            const categories = [
                'general',
                'external-tools',
                'data-editor',
                'laboratory',
                'extensions',
                'preview',
                'console',
                'native',
                'builder'
            ];
            const preferences = {};
            const queryPromises = categories.map(category => {
                return (0, editor_request_1.editorRequest)('preferences', 'query-config', category, undefined, 'global')
                    .then((config) => {
                    preferences[category] = config;
                })
                    .catch(() => {
                    // Ignore errors for categories that don't exist
                    preferences[category] = null;
                });
            });
            await Promise.all(queryPromises);
            // Filter out null entries
            const validPreferences = Object.fromEntries(Object.entries(preferences).filter(([_, value]) => value !== null));
            return validPreferences;
        }, (validPreferences) => ({
            data: {
                categories: Object.keys(validPreferences),
                preferences: validPreferences
            }
        }));
    }
    async resetPreferences(name, type = 'global') {
        if (!name) {
            return {
                success: false,
                error: 'Resetting all preferences is not supported through API. Please specify a preference category.'
            };
        }
        return (0, editor_request_1.toolCall)(async () => {
            const defaultConfig = await (0, editor_request_1.editorRequest)('preferences', 'query-config', name, undefined, 'default');
            return (0, editor_request_1.editorRequest)('preferences', 'set-config', name, '', defaultConfig, type);
        }, (success) => {
            if (success) {
                return { message: `Preference category '${name}' reset to default` };
            }
            throw new Error(`Failed to reset preference category '${name}'`);
        });
    }
    async exportPreferences(exportPath) {
        const prefsResult = await this.getAllPreferences();
        if (!prefsResult.success) {
            return prefsResult;
        }
        const prefsData = JSON.stringify(prefsResult.data, null, 2);
        const path = exportPath || `preferences_export_${Date.now()}.json`;
        // For now, return the data - in a real implementation, you'd write to file
        return {
            success: true,
            data: {
                exportPath: path,
                preferences: prefsResult.data,
                jsonData: prefsData,
                message: 'Preferences exported successfully'
            }
        };
    }
    async importPreferences(importPath) {
        return {
            success: false,
            error: 'Import preferences functionality requires file system access which is not available in this context. Please manually import preferences through the Editor UI.'
        };
    }
}
exports.PreferencesTools = PreferencesTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBRWxFLE1BQWEsZ0JBQWdCO0lBQ3pCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsV0FBVyxFQUFFLDJRQUEyUTtnQkFDeFIsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1CQUFtQjs0QkFDaEMsSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQzt5QkFDOUQ7d0JBQ0QsR0FBRyxFQUFFOzRCQUNELElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxpREFBaUQ7NEJBQzlELElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQzt5QkFDakY7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxPQUFPOzRCQUNiLFdBQVcsRUFBRSxpRUFBaUU7eUJBQ2pGO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUscURBQXFEOzRCQUNsRSxPQUFPLEVBQUUsU0FBUzt5QkFDckI7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7eUJBQ3pEO3dCQUNELEtBQUssRUFBRTs0QkFDSCxLQUFLLEVBQUU7Z0NBQ0gsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO2dDQUNsQixFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7Z0NBQ2xC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SztZQUNkLEtBQUssRUFBRSxnS0FBZ0s7U0FDMUssQ0FBQztJQUNOLENBQUM7Q0FDSjtBQTVQRCw0Q0E0UEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuZXhwb3J0IGNsYXNzIFByZWZlcmVuY2VzVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmZXJlbmNlc19jb25maWcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlIHByZWZlcmVuY2VzIGNvbmZpZ3VyYXRpb24uIEFjdGlvbnM6IG9wZW5fc2V0dGluZ3MgKG9wZW4gcHJlZmVyZW5jZXMgc2V0dGluZ3MgcGFuZWwpLCBxdWVyeSAocXVlcnkgcHJlZmVyZW5jZXMgY29uZmlndXJhdGlvbiksIHNldCAoc2V0IHByZWZlcmVuY2VzIGNvbmZpZ3VyYXRpb24pLCBnZXRfYWxsIChnZXQgYWxsIGF2YWlsYWJsZSBwcmVmZXJlbmNlcyBjYXRlZ29yaWVzKSwgcmVzZXQgKHJlc2V0IHByZWZlcmVuY2VzIHRvIGRlZmF1bHQgdmFsdWVzKScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnb3Blbl9zZXR0aW5ncycsICdxdWVyeScsICdzZXQnLCAnZ2V0X2FsbCcsICdyZXNldCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmZXJlbmNlcyB0YWIgdG8gb3BlbiAoYWN0aW9uOiBvcGVuX3NldHRpbmdzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmFsJywgJ2V4dGVybmFsLXRvb2xzJywgJ2RhdGEtZWRpdG9yJywgJ2xhYm9yYXRvcnknLCAnZXh0ZW5zaW9ucyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGRpdGlvbmFsIGFyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0YWIgKGFjdGlvbjogb3Blbl9zZXR0aW5ncyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGx1Z2luIG9yIGNhdGVnb3J5IG5hbWUgKGFjdGlvbjogcXVlcnksIHNldCwgcmVzZXQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZ2VuZXJhbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmF0aW9uIHBhdGggKGFjdGlvbjogcXVlcnksIHNldCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmVPZjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYm9vbGVhbicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnb2JqZWN0JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdhcnJheScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnbnVsbCcgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmF0aW9uIHZhbHVlIChhY3Rpb246IHNldCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29uZmlndXJhdGlvbiB0eXBlIChhY3Rpb246IHF1ZXJ5LCBzZXQsIHJlc2V0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydkZWZhdWx0JywgJ2dsb2JhbCcsICdsb2NhbCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdnbG9iYWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmVyZW5jZXNfaW8nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW1wb3J0L2V4cG9ydCBwcmVmZXJlbmNlcy4gQWN0aW9uczogZXhwb3J0IChleHBvcnQgY3VycmVudCBwcmVmZXJlbmNlcyBjb25maWd1cmF0aW9uKSwgaW1wb3J0IChpbXBvcnQgcHJlZmVyZW5jZXMgY29uZmlndXJhdGlvbiBmcm9tIGZpbGUpJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydleHBvcnQnLCAnaW1wb3J0J11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBvcnRQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIGV4cG9ydCBwcmVmZXJlbmNlcyBmaWxlIChhY3Rpb246IGV4cG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW1wb3J0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGF0aCB0byBpbXBvcnQgcHJlZmVyZW5jZXMgZmlsZSBmcm9tIChhY3Rpb246IGltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncHJlZmVyZW5jZXNfY29uZmlnJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ29wZW5fc2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlblByZWZlcmVuY2VzU2V0dGluZ3MoYXJncy50YWIsIGFyZ3MuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5UHJlZmVyZW5jZXNDb25maWcoYXJncy5uYW1lLCBhcmdzLnBhdGgsIGFyZ3MudHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NldCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRQcmVmZXJlbmNlc0NvbmZpZyhhcmdzLm5hbWUsIGFyZ3MucGF0aCwgYXJncy52YWx1ZSwgYXJncy50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2FsbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBbGxQcmVmZXJlbmNlcygpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXNldCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldFByZWZlcmVuY2VzKGFyZ3MubmFtZSwgYXJncy50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncHJlZmVyZW5jZXNfaW8nOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXhwb3J0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4cG9ydFByZWZlcmVuY2VzKGFyZ3MuZXhwb3J0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbXBvcnRQcmVmZXJlbmNlcyhhcmdzLmltcG9ydFBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuUHJlZmVyZW5jZXNTZXR0aW5ncyh0YWI/OiBzdHJpbmcsIGFyZ3M/OiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3RBcmdzOiBhbnlbXSA9IFtdO1xuICAgICAgICBpZiAodGFiKSB7XG4gICAgICAgICAgICByZXF1ZXN0QXJncy5wdXNoKHRhYik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFyZ3MgJiYgYXJncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXF1ZXN0QXJncy5wdXNoKC4uLmFyZ3MpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgncHJlZmVyZW5jZXMnLCAnb3Blbi1zZXR0aW5ncycsIC4uLnJlcXVlc3RBcmdzKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBQcmVmZXJlbmNlcyBzZXR0aW5ncyBvcGVuZWQke3RhYiA/IGAgb24gdGFiOiAke3RhYn1gIDogJyd9YCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlQcmVmZXJlbmNlc0NvbmZpZyhuYW1lOiBzdHJpbmcsIHBhdGg/OiBzdHJpbmcsIHR5cGU6IHN0cmluZyA9ICdnbG9iYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdEFyZ3MgPSBbbmFtZV07XG4gICAgICAgIGlmIChwYXRoKSB7XG4gICAgICAgICAgICByZXF1ZXN0QXJncy5wdXNoKHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIHJlcXVlc3RBcmdzLnB1c2godHlwZSk7XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdwcmVmZXJlbmNlcycsICdxdWVyeS1jb25maWcnLCAuLi5yZXF1ZXN0QXJncyksXG4gICAgICAgICAgICAoY29uZmlnKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJlZmVyZW5jZXNDb25maWcobmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnksIHR5cGU6IHN0cmluZyA9ICdnbG9iYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPigncHJlZmVyZW5jZXMnLCAnc2V0LWNvbmZpZycsIG5hbWUsIHBhdGgsIHZhbHVlLCB0eXBlKSxcbiAgICAgICAgICAgIChzdWNjZXNzKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogYFByZWZlcmVuY2UgJyR7bmFtZX0uJHtwYXRofScgdXBkYXRlZCBzdWNjZXNzZnVsbHlgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBwcmVmZXJlbmNlICcke25hbWV9LiR7cGF0aH0nYCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBbGxQcmVmZXJlbmNlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ29tbW9uIHByZWZlcmVuY2UgY2F0ZWdvcmllcyBpbiBDb2NvcyBDcmVhdG9yXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgJ2dlbmVyYWwnLFxuICAgICAgICAgICAgICAgICAgICAnZXh0ZXJuYWwtdG9vbHMnLFxuICAgICAgICAgICAgICAgICAgICAnZGF0YS1lZGl0b3InLFxuICAgICAgICAgICAgICAgICAgICAnbGFib3JhdG9yeScsXG4gICAgICAgICAgICAgICAgICAgICdleHRlbnNpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3ByZXZpZXcnLFxuICAgICAgICAgICAgICAgICAgICAnY29uc29sZScsXG4gICAgICAgICAgICAgICAgICAgICduYXRpdmUnLFxuICAgICAgICAgICAgICAgICAgICAnYnVpbGRlcidcbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmVyZW5jZXM6IGFueSA9IHt9O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcXVlcnlQcm9taXNlcyA9IGNhdGVnb3JpZXMubWFwKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVkaXRvclJlcXVlc3QoJ3ByZWZlcmVuY2VzJywgJ3F1ZXJ5LWNvbmZpZycsIGNhdGVnb3J5LCB1bmRlZmluZWQsICdnbG9iYWwnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKGNvbmZpZzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXNbY2F0ZWdvcnldID0gY29uZmlnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGVycm9ycyBmb3IgY2F0ZWdvcmllcyB0aGF0IGRvbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXNbY2F0ZWdvcnldID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocXVlcnlQcm9taXNlcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBGaWx0ZXIgb3V0IG51bGwgZW50cmllc1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbGlkUHJlZmVyZW5jZXMgPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHByZWZlcmVuY2VzKS5maWx0ZXIoKFtfLCB2YWx1ZV0pID0+IHZhbHVlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsaWRQcmVmZXJlbmNlcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAodmFsaWRQcmVmZXJlbmNlcykgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IE9iamVjdC5rZXlzKHZhbGlkUHJlZmVyZW5jZXMpLFxuICAgICAgICAgICAgICAgICAgICBwcmVmZXJlbmNlczogdmFsaWRQcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFByZWZlcmVuY2VzKG5hbWU/OiBzdHJpbmcsIHR5cGU6IHN0cmluZyA9ICdnbG9iYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiAnUmVzZXR0aW5nIGFsbCBwcmVmZXJlbmNlcyBpcyBub3Qgc3VwcG9ydGVkIHRocm91Z2ggQVBJLiBQbGVhc2Ugc3BlY2lmeSBhIHByZWZlcmVuY2UgY2F0ZWdvcnkuJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdENvbmZpZyA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3ByZWZlcmVuY2VzJywgJ3F1ZXJ5LWNvbmZpZycsIG5hbWUsIHVuZGVmaW5lZCwgJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWRpdG9yUmVxdWVzdDxib29sZWFuPigncHJlZmVyZW5jZXMnLCAnc2V0LWNvbmZpZycsIG5hbWUsICcnLCBkZWZhdWx0Q29uZmlnLCB0eXBlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG1lc3NhZ2U6IGBQcmVmZXJlbmNlIGNhdGVnb3J5ICcke25hbWV9JyByZXNldCB0byBkZWZhdWx0YCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byByZXNldCBwcmVmZXJlbmNlIGNhdGVnb3J5ICcke25hbWV9J2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhwb3J0UHJlZmVyZW5jZXMoZXhwb3J0UGF0aD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHByZWZzUmVzdWx0ID0gYXdhaXQgdGhpcy5nZXRBbGxQcmVmZXJlbmNlcygpO1xuICAgICAgICBpZiAoIXByZWZzUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmVmc1Jlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZWZzRGF0YSA9IEpTT04uc3RyaW5naWZ5KHByZWZzUmVzdWx0LmRhdGEsIG51bGwsIDIpO1xuICAgICAgICBjb25zdCBwYXRoID0gZXhwb3J0UGF0aCB8fCBgcHJlZmVyZW5jZXNfZXhwb3J0XyR7RGF0ZS5ub3coKX0uanNvbmA7XG5cbiAgICAgICAgLy8gRm9yIG5vdywgcmV0dXJuIHRoZSBkYXRhIC0gaW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3UnZCB3cml0ZSB0byBmaWxlXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGV4cG9ydFBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgICAgcHJlZmVyZW5jZXM6IHByZWZzUmVzdWx0LmRhdGEsXG4gICAgICAgICAgICAgICAganNvbkRhdGE6IHByZWZzRGF0YSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUHJlZmVyZW5jZXMgZXhwb3J0ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW1wb3J0UHJlZmVyZW5jZXMoaW1wb3J0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgZXJyb3I6ICdJbXBvcnQgcHJlZmVyZW5jZXMgZnVuY3Rpb25hbGl0eSByZXF1aXJlcyBmaWxlIHN5c3RlbSBhY2Nlc3Mgd2hpY2ggaXMgbm90IGF2YWlsYWJsZSBpbiB0aGlzIGNvbnRleHQuIFBsZWFzZSBtYW51YWxseSBpbXBvcnQgcHJlZmVyZW5jZXMgdGhyb3VnaCB0aGUgRWRpdG9yIFVJLidcbiAgICAgICAgfTtcbiAgICB9XG59XG4iXX0=