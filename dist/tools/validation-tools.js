"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationTools = void 0;
class ValidationTools {
    getTools() {
        return [
            {
                name: 'validation',
                description: 'Validate and format JSON/MCP data. Actions: validate_json (validate and fix JSON parameters), safe_string (create a safe string value for JSON), format_request (format a complete MCP request with proper JSON escaping)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['validate_json', 'safe_string', 'format_request']
                        },
                        jsonString: {
                            type: 'string',
                            description: 'JSON string to validate and fix (action: validate_json)'
                        },
                        expectedSchema: {
                            type: 'object',
                            description: 'Expected parameter schema (action: validate_json, optional)'
                        },
                        value: {
                            type: 'string',
                            description: 'String value to make safe (action: safe_string)'
                        },
                        toolName: {
                            type: 'string',
                            description: 'Tool name to call (action: format_request)'
                        },
                        arguments: {
                            type: 'object',
                            description: 'Tool arguments (action: format_request)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'validation':
                switch (args.action) {
                    case 'validate_json':
                        return await this.validateJsonParams(args.jsonString, args.expectedSchema);
                    case 'safe_string':
                        return await this.createSafeStringValue(args.value);
                    case 'format_request':
                        return await this.formatMcpRequest(args.toolName, args.arguments);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async validateJsonParams(jsonString, expectedSchema) {
        if (!jsonString) {
            return { success: false, error: 'Missing required parameter: jsonString' };
        }
        try {
            // First try to parse as-is
            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            }
            catch (error) {
                // Try to fix common issues
                const fixed = this.fixJsonString(jsonString);
                try {
                    parsed = JSON.parse(fixed);
                }
                catch (secondError) {
                    return {
                        success: false,
                        error: `Cannot fix JSON: ${error.message}`,
                        data: {
                            originalJson: jsonString,
                            fixedAttempt: fixed,
                            suggestions: this.getJsonFixSuggestions(jsonString)
                        }
                    };
                }
            }
            // Validate against schema if provided
            if (expectedSchema) {
                const validation = this.validateAgainstSchema(parsed, expectedSchema);
                if (!validation.valid) {
                    return {
                        success: false,
                        error: 'Schema validation failed',
                        data: {
                            parsedJson: parsed,
                            validationErrors: validation.errors,
                            suggestions: validation.suggestions
                        }
                    };
                }
            }
            return {
                success: true,
                data: {
                    parsedJson: parsed,
                    fixedJson: JSON.stringify(parsed, null, 2),
                    isValid: true
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createSafeStringValue(value) {
        if (!value && value !== '') {
            return { success: false, error: 'Missing required parameter: value' };
        }
        const safeValue = this.escapJsonString(value);
        return {
            success: true,
            data: {
                originalValue: value,
                safeValue: safeValue,
                jsonReady: JSON.stringify(safeValue),
                usage: `Use "${safeValue}" in your JSON parameters`
            }
        };
    }
    async formatMcpRequest(toolName, toolArgs) {
        if (!toolName) {
            return { success: false, error: 'Missing required parameter: toolName' };
        }
        try {
            const mcpRequest = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: toolArgs
                }
            };
            const formattedJson = JSON.stringify(mcpRequest, null, 2);
            const compactJson = JSON.stringify(mcpRequest);
            return {
                success: true,
                data: {
                    request: mcpRequest,
                    formattedJson: formattedJson,
                    compactJson: compactJson,
                    curlCommand: this.generateCurlCommand(compactJson)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to format MCP request: ${error.message}`
            };
        }
    }
    fixJsonString(jsonStr) {
        let fixed = jsonStr;
        // Fix common escape character issues
        fixed = fixed
            // Fix unescaped quotes in string values
            .replace(/(\{[^}]*"[^"]*":\s*")([^"]*")([^"]*")([^}]*\})/g, (match, prefix, content, suffix, end) => {
            const escapedContent = content.replace(/"/g, '\\"');
            return prefix + escapedContent + suffix + end;
        })
            // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2')
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix control characters
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            // Fix single quotes to double quotes
            .replace(/'/g, '"');
        return fixed;
    }
    escapJsonString(str) {
        return str
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/"/g, '\\"') // Escape quotes
            .replace(/\n/g, '\\n') // Escape newlines
            .replace(/\r/g, '\\r') // Escape carriage returns
            .replace(/\t/g, '\\t') // Escape tabs
            .replace(/\f/g, '\\f') // Escape form feeds
            .replace(/\b/g, '\\b'); // Escape backspaces
    }
    validateAgainstSchema(data, schema) {
        const errors = [];
        const suggestions = [];
        // Basic type checking
        if (schema.type) {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== schema.type) {
                errors.push(`Expected type ${schema.type}, got ${actualType}`);
                suggestions.push(`Convert value to ${schema.type}`);
            }
        }
        // Required fields checking
        if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
                if (!Object.prototype.hasOwnProperty.call(data, field)) {
                    errors.push(`Missing required field: ${field}`);
                    suggestions.push(`Add required field "${field}"`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            suggestions
        };
    }
    getJsonFixSuggestions(jsonStr) {
        const suggestions = [];
        if (jsonStr.includes('\\"')) {
            suggestions.push('Check for improperly escaped quotes');
        }
        if (jsonStr.includes("'")) {
            suggestions.push('Replace single quotes with double quotes');
        }
        if (jsonStr.includes('\n') || jsonStr.includes('\t')) {
            suggestions.push('Escape newlines and tabs properly');
        }
        if (jsonStr.match(/,\s*[}\]]/)) {
            suggestions.push('Remove trailing commas');
        }
        return suggestions;
    }
    generateCurlCommand(jsonStr) {
        const escapedJson = jsonStr.replace(/'/g, "'\"'\"'");
        return `curl -X POST http://127.0.0.1:8585/mcp \\
  -H "Content-Type: application/json" \\
  -d '${escapedJson}'`;
    }
}
exports.ValidationTools = ValidationTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy92YWxpZGF0aW9uLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsZUFBZTtJQUN4QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxZQUFZO2dCQUNsQixXQUFXLEVBQUUsMk5BQTJOO2dCQUN4TyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUJBQW1COzRCQUNoQyxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLGdCQUFnQixDQUFDO3lCQUMzRDt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHlEQUF5RDt5QkFDekU7d0JBQ0QsY0FBYyxFQUFFOzRCQUNaLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw2REFBNkQ7eUJBQzdFO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsaURBQWlEO3lCQUNqRTt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDRDQUE0Qzt5QkFDNUQ7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7eUJBQ3pEO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQVM7UUFDckMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNmLEtBQUssWUFBWTtnQkFDYixRQUFRLElBQUks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LENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDdkIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE9BQWU7UUFDdkMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckQsT0FBTzs7UUFFUCxXQUFXLEdBQUcsQ0FBQztJQUNuQixDQUFDO0NBQ0o7QUFuUUQsMENBbVFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFZhbGlkYXRpb25Ub29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAndmFsaWRhdGlvbicsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIGFuZCBmb3JtYXQgSlNPTi9NQ1AgZGF0YS4gQWN0aW9uczogdmFsaWRhdGVfanNvbiAodmFsaWRhdGUgYW5kIGZpeCBKU09OIHBhcmFtZXRlcnMpLCBzYWZlX3N0cmluZyAoY3JlYXRlIGEgc2FmZSBzdHJpbmcgdmFsdWUgZm9yIEpTT04pLCBmb3JtYXRfcmVxdWVzdCAoZm9ybWF0IGEgY29tcGxldGUgTUNQIHJlcXVlc3Qgd2l0aCBwcm9wZXIgSlNPTiBlc2NhcGluZyknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsndmFsaWRhdGVfanNvbicsICdzYWZlX3N0cmluZycsICdmb3JtYXRfcmVxdWVzdCddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25TdHJpbmc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdKU09OIHN0cmluZyB0byB2YWxpZGF0ZSBhbmQgZml4IChhY3Rpb246IHZhbGlkYXRlX2pzb24pJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4cGVjdGVkIHBhcmFtZXRlciBzY2hlbWEgKGFjdGlvbjogdmFsaWRhdGVfanNvbiwgb3B0aW9uYWwpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N0cmluZyB2YWx1ZSB0byBtYWtlIHNhZmUgKGFjdGlvbjogc2FmZV9zdHJpbmcpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sTmFtZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Rvb2wgbmFtZSB0byBjYWxsIChhY3Rpb246IGZvcm1hdF9yZXF1ZXN0KSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJndW1lbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVG9vbCBhcmd1bWVudHMgKGFjdGlvbjogZm9ybWF0X3JlcXVlc3QpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICd2YWxpZGF0aW9uJzpcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9qc29uJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVKc29uUGFyYW1zKGFyZ3MuanNvblN0cmluZywgYXJncy5leHBlY3RlZFNjaGVtYSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2FmZV9zdHJpbmcnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVTYWZlU3RyaW5nVmFsdWUoYXJncy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZm9ybWF0X3JlcXVlc3QnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5mb3JtYXRNY3BSZXF1ZXN0KGFyZ3MudG9vbE5hbWUsIGFyZ3MuYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVKc29uUGFyYW1zKGpzb25TdHJpbmc6IHN0cmluZywgZXhwZWN0ZWRTY2hlbWE/OiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghanNvblN0cmluZykge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjoganNvblN0cmluZycgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gRmlyc3QgdHJ5IHRvIHBhcnNlIGFzLWlzXHJcbiAgICAgICAgICAgIGxldCBwYXJzZWQ7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZml4IGNvbW1vbiBpc3N1ZXNcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkID0gdGhpcy5maXhKc29uU3RyaW5nKGpzb25TdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWQgPSBKU09OLnBhcnNlKGZpeGVkKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHNlY29uZEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ2Fubm90IGZpeCBKU09OOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxKc29uOiBqc29uU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWRBdHRlbXB0OiBmaXhlZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiB0aGlzLmdldEpzb25GaXhTdWdnZXN0aW9ucyhqc29uU3RyaW5nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gVmFsaWRhdGUgYWdhaW5zdCBzY2hlbWEgaWYgcHJvdmlkZWRcclxuICAgICAgICAgICAgaWYgKGV4cGVjdGVkU2NoZW1hKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUFnYWluc3RTY2hlbWEocGFyc2VkLCBleHBlY3RlZFNjaGVtYSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24udmFsaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdTY2hlbWEgdmFsaWRhdGlvbiBmYWlsZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWRKc29uOiBwYXJzZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uRXJyb3JzOiB2YWxpZGF0aW9uLmVycm9ycyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb25zOiB2YWxpZGF0aW9uLnN1Z2dlc3Rpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWRKc29uOiBwYXJzZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZml4ZWRKc29uOiBKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlU2FmZVN0cmluZ1ZhbHVlKHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiB2YWx1ZScgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcEpzb25TdHJpbmcodmFsdWUpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHZhbHVlLFxyXG4gICAgICAgICAgICAgICAgc2FmZVZhbHVlOiBzYWZlVmFsdWUsXHJcbiAgICAgICAgICAgICAgICBqc29uUmVhZHk6IEpTT04uc3RyaW5naWZ5KHNhZmVWYWx1ZSksXHJcbiAgICAgICAgICAgICAgICB1c2FnZTogYFVzZSBcIiR7c2FmZVZhbHVlfVwiIGluIHlvdXIgSlNPTiBwYXJhbWV0ZXJzYFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGZvcm1hdE1jcFJlcXVlc3QodG9vbE5hbWU6IHN0cmluZywgdG9vbEFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKCF0b29sTmFtZSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogdG9vbE5hbWUnIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1jcFJlcXVlc3QgPSB7XHJcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgIGlkOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndG9vbHMvY2FsbCcsXHJcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b29sTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IHRvb2xBcmdzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRKc29uID0gSlNPTi5zdHJpbmdpZnkobWNwUmVxdWVzdCwgbnVsbCwgMik7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBhY3RKc29uID0gSlNPTi5zdHJpbmdpZnkobWNwUmVxdWVzdCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0OiBtY3BSZXF1ZXN0LFxyXG4gICAgICAgICAgICAgICAgICAgIGZvcm1hdHRlZEpzb246IGZvcm1hdHRlZEpzb24sXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcGFjdEpzb246IGNvbXBhY3RKc29uLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cmxDb21tYW5kOiB0aGlzLmdlbmVyYXRlQ3VybENvbW1hbmQoY29tcGFjdEpzb24pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBmb3JtYXQgTUNQIHJlcXVlc3Q6ICR7ZXJyb3IubWVzc2FnZX1gXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZml4SnNvblN0cmluZyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgIGxldCBmaXhlZCA9IGpzb25TdHI7XHJcblxyXG4gICAgICAgIC8vIEZpeCBjb21tb24gZXNjYXBlIGNoYXJhY3RlciBpc3N1ZXNcclxuICAgICAgICBmaXhlZCA9IGZpeGVkXHJcbiAgICAgICAgICAgIC8vIEZpeCB1bmVzY2FwZWQgcXVvdGVzIGluIHN0cmluZyB2YWx1ZXNcclxuICAgICAgICAgICAgLnJlcGxhY2UoLyhcXHtbXn1dKlwiW15cIl0qXCI6XFxzKlwiKShbXlwiXSpcIikoW15cIl0qXCIpKFtefV0qXFx9KS9nLCAobWF0Y2gsIHByZWZpeCwgY29udGVudCwgc3VmZml4LCBlbmQpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVzY2FwZWRDb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJlZml4ICsgZXNjYXBlZENvbnRlbnQgKyBzdWZmaXggKyBlbmQ7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC8vIEZpeCB1bmVzY2FwZWQgYmFja3NsYXNoZXNcclxuICAgICAgICAgICAgLnJlcGxhY2UoLyhbXlxcXFxdKVxcXFwoW15cIlxcXFxcXC9iZm5ydHVdKS9nLCAnJDFcXFxcXFxcXCQyJylcclxuICAgICAgICAgICAgLy8gRml4IHRyYWlsaW5nIGNvbW1hc1xyXG4gICAgICAgICAgICAucmVwbGFjZSgvLChcXHMqW31cXF1dKS9nLCAnJDEnKVxyXG4gICAgICAgICAgICAvLyBGaXggY29udHJvbCBjaGFyYWN0ZXJzXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcclxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpXHJcbiAgICAgICAgICAgIC8vIEZpeCBzaW5nbGUgcXVvdGVzIHRvIGRvdWJsZSBxdW90ZXNcclxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJ1wiJyk7XHJcblxyXG4gICAgICAgIHJldHVybiBmaXhlZDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGVzY2FwSnNvblN0cmluZyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIHN0clxyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKSAgLy8gRXNjYXBlIGJhY2tzbGFzaGVzIGZpcnN0XHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgICAgLy8gRXNjYXBlIHF1b3Rlc1xyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxuL2csICdcXFxcbicpICAgLy8gRXNjYXBlIG5ld2xpbmVzXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJykgICAvLyBFc2NhcGUgY2FycmlhZ2UgcmV0dXJuc1xyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpICAgLy8gRXNjYXBlIHRhYnNcclxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKSAgIC8vIEVzY2FwZSBmb3JtIGZlZWRzXHJcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXGIvZywgJ1xcXFxiJyk7ICAvLyBFc2NhcGUgYmFja3NwYWNlc1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdmFsaWRhdGVBZ2FpbnN0U2NoZW1hKGRhdGE6IGFueSwgc2NoZW1hOiBhbnkpOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcnM6IHN0cmluZ1tdOyBzdWdnZXN0aW9uczogc3RyaW5nW10gfSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAvLyBCYXNpYyB0eXBlIGNoZWNraW5nXHJcbiAgICAgICAgaWYgKHNjaGVtYS50eXBlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gJ2FycmF5JyA6IHR5cGVvZiBkYXRhO1xyXG4gICAgICAgICAgICBpZiAoYWN0dWFsVHlwZSAhPT0gc2NoZW1hLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGBFeHBlY3RlZCB0eXBlICR7c2NoZW1hLnR5cGV9LCBnb3QgJHthY3R1YWxUeXBlfWApO1xyXG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChgQ29udmVydCB2YWx1ZSB0byAke3NjaGVtYS50eXBlfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBSZXF1aXJlZCBmaWVsZHMgY2hlY2tpbmdcclxuICAgICAgICBpZiAoc2NoZW1hLnJlcXVpcmVkICYmIEFycmF5LmlzQXJyYXkoc2NoZW1hLnJlcXVpcmVkKSkge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHNjaGVtYS5yZXF1aXJlZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoZGF0YSwgZmllbGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYE1pc3NpbmcgcmVxdWlyZWQgZmllbGQ6ICR7ZmllbGR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChgQWRkIHJlcXVpcmVkIGZpZWxkIFwiJHtmaWVsZH1cImApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgICAgICAgZXJyb3JzLFxyXG4gICAgICAgICAgICBzdWdnZXN0aW9uc1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRKc29uRml4U3VnZ2VzdGlvbnMoanNvblN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IHN1Z2dlc3Rpb25zOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBpZiAoanNvblN0ci5pbmNsdWRlcygnXFxcXFwiJykpIHtcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaCgnQ2hlY2sgZm9yIGltcHJvcGVybHkgZXNjYXBlZCBxdW90ZXMnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGpzb25TdHIuaW5jbHVkZXMoXCInXCIpKSB7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goJ1JlcGxhY2Ugc2luZ2xlIHF1b3RlcyB3aXRoIGRvdWJsZSBxdW90ZXMnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGpzb25TdHIuaW5jbHVkZXMoJ1xcbicpIHx8IGpzb25TdHIuaW5jbHVkZXMoJ1xcdCcpKSB7XHJcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0VzY2FwZSBuZXdsaW5lcyBhbmQgdGFicyBwcm9wZXJseScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoanNvblN0ci5tYXRjaCgvLFxccypbfVxcXV0vKSkge1xyXG4gICAgICAgICAgICBzdWdnZXN0aW9ucy5wdXNoKCdSZW1vdmUgdHJhaWxpbmcgY29tbWFzJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gc3VnZ2VzdGlvbnM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUN1cmxDb21tYW5kKGpzb25TdHI6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgZXNjYXBlZEpzb24gPSBqc29uU3RyLnJlcGxhY2UoLycvZywgXCInXFxcIidcXFwiJ1wiKTtcclxuICAgICAgICByZXR1cm4gYGN1cmwgLVggUE9TVCBodHRwOi8vMTI3LjAuMC4xOjg1ODUvbWNwIFxcXFxcclxuICAtSCBcIkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblwiIFxcXFxcclxuICAtZCAnJHtlc2NhcGVkSnNvbn0nYDtcclxuICAgIH1cclxufVxyXG4iXX0=