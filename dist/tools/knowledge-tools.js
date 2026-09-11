"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeTools = void 0;
const editor_request_1 = require("../utils/editor-request");
/**
 * Read-only introspection of the editor's own type system.
 *
 * Exists so a client can look up what a component actually exposes instead of
 * guessing property names and discovering the mistake through a failed write.
 * Everything here is a query — nothing in this file mutates project state.
 *
 * `query-classes`, `query-components` and `query-component-has-script` are
 * public editor messages. The enum/layer lookups are declared but private, so
 * they are wrapped and degrade to an explanatory failure rather than throwing
 * if a future editor build drops them.
 */
class KnowledgeTools {
    getTools() {
        return [
            {
                name: 'knowledge_query',
                description: 'Look up editor type information: component types, their property schemas, registered classes, and built-in enums/layers. Use before setting a component property to confirm the exact property name and type. Available actions: list_component_types, describe_component, list_classes, has_script, list_enum, list_layers.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list_component_types', 'describe_component', 'list_classes', 'has_script', 'list_enum', 'list_layers'],
                            description: 'Which lookup to perform.'
                        },
                        componentType: {
                            type: 'string',
                            description: "Component class name, e.g. 'cc.Label'. Required for 'describe_component'."
                        },
                        className: {
                            type: 'string',
                            description: "Filter class list by name or extends-target, e.g. 'cc.Component'. Optional for 'list_classes'."
                        },
                        scriptName: {
                            type: 'string',
                            description: "Script class name to check. Required for 'has_script'."
                        },
                        enumPath: {
                            type: 'string',
                            description: "Bare enum name whose options to list, e.g. 'Overflow' or 'VerticalTextAlignment'. A dotted path like 'cc.Label.Overflow' is reduced to its last segment. Required for 'list_enum'."
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        if (toolName !== 'knowledge_query') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }
        switch (args === null || args === void 0 ? void 0 : args.action) {
            case 'list_component_types':
                return this.listComponentTypes();
            case 'describe_component':
                return this.describeComponent(args.componentType);
            case 'list_classes':
                return this.listClasses(args.className);
            case 'has_script':
                return this.hasScript(args.scriptName);
            case 'list_enum':
                return this.listEnum(args.enumPath);
            case 'list_layers':
                return this.listLayers();
            default:
                return {
                    success: false,
                    error: `Unknown action '${args === null || args === void 0 ? void 0 : args.action}' for knowledge_query. Valid actions: list_component_types, describe_component, list_classes, has_script, list_enum, list_layers`
                };
        }
    }
    async listComponentTypes() {
        try {
            const components = await (0, editor_request_1.editorRequest)('scene', 'query-components');
            const list = (components || []).map((c) => {
                var _a, _b;
                return ({
                    name: (_b = (_a = c.name) !== null && _a !== void 0 ? _a : c.cid) !== null && _b !== void 0 ? _b : String(c),
                    path: c.path,
                    cid: c.cid
                });
            });
            return { success: true, data: { count: list.length, components: list } };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async describeComponent(componentType) {
        if (!componentType) {
            return { success: false, error: "componentType is required for 'describe_component', e.g. 'cc.Label'" };
        }
        // `query-classes` and `query-components` return names only, so the schema
        // has to be read from the engine's class metadata in the scene process.
        try {
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'describeClass',
                args: [componentType]
            });
            if (!(result === null || result === void 0 ? void 0 : result.success)) {
                return {
                    success: false,
                    error: (result === null || result === void 0 ? void 0 : result.error) || `Component type '${componentType}' not found.`,
                    instruction: "Run knowledge_query with action 'list_component_types' to see valid names."
                };
            }
            return { success: true, data: result.data };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async listClasses(className) {
        try {
            const options = className ? { extends: className } : undefined;
            const classes = await (0, editor_request_1.editorRequest)('scene', 'query-classes', options);
            const list = (classes || []).map((c) => ({
                name: c.name,
                cid: c.cid,
                extends: c.extends
            }));
            return { success: true, data: { count: list.length, filter: className, classes: list } };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async hasScript(scriptName) {
        if (!scriptName) {
            return { success: false, error: "scriptName is required for 'has_script'" };
        }
        try {
            const result = await (0, editor_request_1.editorRequest)('scene', 'query-component-has-script', scriptName);
            return { success: true, data: { scriptName, exists: !!result, raw: result } };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async listEnum(enumPath) {
        if (!enumPath) {
            return { success: false, error: "enumPath is required for 'list_enum', e.g. 'Overflow'" };
        }
        // Despite the message name, this takes the BARE enum name: 'Overflow'
        // returns the option list, 'cc.Label.Overflow' returns null. Callers
        // naturally write the qualified form, so reduce it here.
        const enumName = enumPath.split('.').pop();
        // Private editor message: degrade with an explanation instead of throwing.
        try {
            const options = await (0, editor_request_1.editorRequest)('scene', 'query-enum-list-with-path', enumName);
            if (!options || options.length === 0) {
                return {
                    success: false,
                    error: `No enum named '${enumName}' is registered.`,
                    instruction: "Run knowledge_query with action 'describe_component' on the owning component — a property's enumOptions names the values it accepts."
                };
            }
            return { success: true, data: { enumName, options } };
        }
        catch (err) {
            return {
                success: false,
                error: `Enum lookup failed for '${enumName}': ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`,
                instruction: "This uses an internal editor message that may be unavailable. Read the property's current value with component_query instead."
            };
        }
    }
    async listLayers() {
        try {
            const layers = await (0, editor_request_1.editorRequest)('scene', 'query-layer-builtin');
            return { success: true, data: { layers } };
        }
        catch (err) {
            return {
                success: false,
                error: `Layer lookup failed: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`,
                instruction: 'This uses an internal editor message that may be unavailable in this editor version.'
            };
        }
    }
}
exports.KnowledgeTools = KnowledgeTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia25vd2xlZGdlLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2tub3dsZWRnZS10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBd0Q7QUFFeEQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUsOFRBQThUO2dCQUMzVSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsRUFBRSxjQUFjLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxhQUFhLENBQUM7NEJBQzlHLFdBQVcsRUFBRSwwQkFBMEI7eUJBQzFDO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkVBQTJFO3lCQUMzRjt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGdHQUFnRzt5QkFDaEg7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx3REFBd0Q7eUJBQ3hFO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0xBQW9MO3lCQUNwTTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBZ0IsRUFBRSxJQUFTO1FBQ3JDLElBQUksUUFBUSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDakMsT0FBTyxFQUFFLE9BQU8s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d0IsQ0FBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsT0FBTyxLQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDNUQsV0FBVyxFQUFFLHNGQUFzRjthQUN0RyxDQUFDO1FBQ04sQ0FBQztJQUNMLENBQUM7Q0FDSjtBQTVLRCx3Q0E0S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuXG4vKipcbiAqIFJlYWQtb25seSBpbnRyb3NwZWN0aW9uIG9mIHRoZSBlZGl0b3IncyBvd24gdHlwZSBzeXN0ZW0uXG4gKlxuICogRXhpc3RzIHNvIGEgY2xpZW50IGNhbiBsb29rIHVwIHdoYXQgYSBjb21wb25lbnQgYWN0dWFsbHkgZXhwb3NlcyBpbnN0ZWFkIG9mXG4gKiBndWVzc2luZyBwcm9wZXJ0eSBuYW1lcyBhbmQgZGlzY292ZXJpbmcgdGhlIG1pc3Rha2UgdGhyb3VnaCBhIGZhaWxlZCB3cml0ZS5cbiAqIEV2ZXJ5dGhpbmcgaGVyZSBpcyBhIHF1ZXJ5IOKAlCBub3RoaW5nIGluIHRoaXMgZmlsZSBtdXRhdGVzIHByb2plY3Qgc3RhdGUuXG4gKlxuICogYHF1ZXJ5LWNsYXNzZXNgLCBgcXVlcnktY29tcG9uZW50c2AgYW5kIGBxdWVyeS1jb21wb25lbnQtaGFzLXNjcmlwdGAgYXJlXG4gKiBwdWJsaWMgZWRpdG9yIG1lc3NhZ2VzLiBUaGUgZW51bS9sYXllciBsb29rdXBzIGFyZSBkZWNsYXJlZCBidXQgcHJpdmF0ZSwgc29cbiAqIHRoZXkgYXJlIHdyYXBwZWQgYW5kIGRlZ3JhZGUgdG8gYW4gZXhwbGFuYXRvcnkgZmFpbHVyZSByYXRoZXIgdGhhbiB0aHJvd2luZ1xuICogaWYgYSBmdXR1cmUgZWRpdG9yIGJ1aWxkIGRyb3BzIHRoZW0uXG4gKi9cbmV4cG9ydCBjbGFzcyBLbm93bGVkZ2VUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2tub3dsZWRnZV9xdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMb29rIHVwIGVkaXRvciB0eXBlIGluZm9ybWF0aW9uOiBjb21wb25lbnQgdHlwZXMsIHRoZWlyIHByb3BlcnR5IHNjaGVtYXMsIHJlZ2lzdGVyZWQgY2xhc3NlcywgYW5kIGJ1aWx0LWluIGVudW1zL2xheWVycy4gVXNlIGJlZm9yZSBzZXR0aW5nIGEgY29tcG9uZW50IHByb3BlcnR5IHRvIGNvbmZpcm0gdGhlIGV4YWN0IHByb3BlcnR5IG5hbWUgYW5kIHR5cGUuIEF2YWlsYWJsZSBhY3Rpb25zOiBsaXN0X2NvbXBvbmVudF90eXBlcywgZGVzY3JpYmVfY29tcG9uZW50LCBsaXN0X2NsYXNzZXMsIGhhc19zY3JpcHQsIGxpc3RfZW51bSwgbGlzdF9sYXllcnMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydsaXN0X2NvbXBvbmVudF90eXBlcycsICdkZXNjcmliZV9jb21wb25lbnQnLCAnbGlzdF9jbGFzc2VzJywgJ2hhc19zY3JpcHQnLCAnbGlzdF9lbnVtJywgJ2xpc3RfbGF5ZXJzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGljaCBsb29rdXAgdG8gcGVyZm9ybS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbXBvbmVudCBjbGFzcyBuYW1lLCBlLmcuICdjYy5MYWJlbCcuIFJlcXVpcmVkIGZvciAnZGVzY3JpYmVfY29tcG9uZW50Jy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkZpbHRlciBjbGFzcyBsaXN0IGJ5IG5hbWUgb3IgZXh0ZW5kcy10YXJnZXQsIGUuZy4gJ2NjLkNvbXBvbmVudCcuIE9wdGlvbmFsIGZvciAnbGlzdF9jbGFzc2VzJy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdE5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTY3JpcHQgY2xhc3MgbmFtZSB0byBjaGVjay4gUmVxdWlyZWQgZm9yICdoYXNfc2NyaXB0Jy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudW1QYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQmFyZSBlbnVtIG5hbWUgd2hvc2Ugb3B0aW9ucyB0byBsaXN0LCBlLmcuICdPdmVyZmxvdycgb3IgJ1ZlcnRpY2FsVGV4dEFsaWdubWVudCcuIEEgZG90dGVkIHBhdGggbGlrZSAnY2MuTGFiZWwuT3ZlcmZsb3cnIGlzIHJlZHVjZWQgdG8gaXRzIGxhc3Qgc2VnbWVudC4gUmVxdWlyZWQgZm9yICdsaXN0X2VudW0nLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKHRvb2xOYW1lICE9PSAna25vd2xlZGdlX3F1ZXJ5Jykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAoYXJncz8uYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdsaXN0X2NvbXBvbmVudF90eXBlcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdENvbXBvbmVudFR5cGVzKCk7XG4gICAgICAgICAgICBjYXNlICdkZXNjcmliZV9jb21wb25lbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRlc2NyaWJlQ29tcG9uZW50KGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBjYXNlICdsaXN0X2NsYXNzZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RDbGFzc2VzKGFyZ3MuY2xhc3NOYW1lKTtcbiAgICAgICAgICAgIGNhc2UgJ2hhc19zY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc1NjcmlwdChhcmdzLnNjcmlwdE5hbWUpO1xuICAgICAgICAgICAgY2FzZSAnbGlzdF9lbnVtJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5saXN0RW51bShhcmdzLmVudW1QYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfbGF5ZXJzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5saXN0TGF5ZXJzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFVua25vd24gYWN0aW9uICcke2FyZ3M/LmFjdGlvbn0nIGZvciBrbm93bGVkZ2VfcXVlcnkuIFZhbGlkIGFjdGlvbnM6IGxpc3RfY29tcG9uZW50X3R5cGVzLCBkZXNjcmliZV9jb21wb25lbnQsIGxpc3RfY2xhc3NlcywgaGFzX3NjcmlwdCwgbGlzdF9lbnVtLCBsaXN0X2xheWVyc2BcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0Q29tcG9uZW50VHlwZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PGFueVtdPignc2NlbmUnLCAncXVlcnktY29tcG9uZW50cycpO1xuICAgICAgICAgICAgY29uc3QgbGlzdCA9IChjb21wb25lbnRzIHx8IFtdKS5tYXAoKGM6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICBuYW1lOiBjLm5hbWUgPz8gYy5jaWQgPz8gU3RyaW5nKGMpLFxuICAgICAgICAgICAgICAgIHBhdGg6IGMucGF0aCxcbiAgICAgICAgICAgICAgICBjaWQ6IGMuY2lkXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGNvdW50OiBsaXN0Lmxlbmd0aCwgY29tcG9uZW50czogbGlzdCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkZXNjcmliZUNvbXBvbmVudChjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIWNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJjb21wb25lbnRUeXBlIGlzIHJlcXVpcmVkIGZvciAnZGVzY3JpYmVfY29tcG9uZW50JywgZS5nLiAnY2MuTGFiZWwnXCIgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGBxdWVyeS1jbGFzc2VzYCBhbmQgYHF1ZXJ5LWNvbXBvbmVudHNgIHJldHVybiBuYW1lcyBvbmx5LCBzbyB0aGUgc2NoZW1hXG4gICAgICAgIC8vIGhhcyB0byBiZSByZWFkIGZyb20gdGhlIGVuZ2luZSdzIGNsYXNzIG1ldGFkYXRhIGluIHRoZSBzY2VuZSBwcm9jZXNzLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnZGVzY3JpYmVDbGFzcycsXG4gICAgICAgICAgICAgICAgYXJnczogW2NvbXBvbmVudFR5cGVdXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFyZXN1bHQ/LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHJlc3VsdD8uZXJyb3IgfHwgYENvbXBvbmVudCB0eXBlICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQuYCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IFwiUnVuIGtub3dsZWRnZV9xdWVyeSB3aXRoIGFjdGlvbiAnbGlzdF9jb21wb25lbnRfdHlwZXMnIHRvIHNlZSB2YWxpZCBuYW1lcy5cIlxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdC5kYXRhIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0Q2xhc3NlcyhjbGFzc05hbWU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IGNsYXNzTmFtZSA/IHsgZXh0ZW5kczogY2xhc3NOYW1lIH0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ3NjZW5lJywgJ3F1ZXJ5LWNsYXNzZXMnLCBvcHRpb25zIGFzIGFueSk7XG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gKGNsYXNzZXMgfHwgW10pLm1hcCgoYzogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgIG5hbWU6IGMubmFtZSxcbiAgICAgICAgICAgICAgICBjaWQ6IGMuY2lkLFxuICAgICAgICAgICAgICAgIGV4dGVuZHM6IGMuZXh0ZW5kc1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBjb3VudDogbGlzdC5sZW5ndGgsIGZpbHRlcjogY2xhc3NOYW1lLCBjbGFzc2VzOiBsaXN0IH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhc1NjcmlwdChzY3JpcHROYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIXNjcmlwdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJzY3JpcHROYW1lIGlzIHJlcXVpcmVkIGZvciAnaGFzX3NjcmlwdCdcIiB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnQtaGFzLXNjcmlwdCcsIHNjcmlwdE5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBzY3JpcHROYW1lLCBleGlzdHM6ICEhcmVzdWx0LCByYXc6IHJlc3VsdCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0RW51bShlbnVtUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFlbnVtUGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcImVudW1QYXRoIGlzIHJlcXVpcmVkIGZvciAnbGlzdF9lbnVtJywgZS5nLiAnT3ZlcmZsb3cnXCIgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEZXNwaXRlIHRoZSBtZXNzYWdlIG5hbWUsIHRoaXMgdGFrZXMgdGhlIEJBUkUgZW51bSBuYW1lOiAnT3ZlcmZsb3cnXG4gICAgICAgIC8vIHJldHVybnMgdGhlIG9wdGlvbiBsaXN0LCAnY2MuTGFiZWwuT3ZlcmZsb3cnIHJldHVybnMgbnVsbC4gQ2FsbGVyc1xuICAgICAgICAvLyBuYXR1cmFsbHkgd3JpdGUgdGhlIHF1YWxpZmllZCBmb3JtLCBzbyByZWR1Y2UgaXQgaGVyZS5cbiAgICAgICAgY29uc3QgZW51bU5hbWUgPSBlbnVtUGF0aC5zcGxpdCgnLicpLnBvcCgpIGFzIHN0cmluZztcbiAgICAgICAgLy8gUHJpdmF0ZSBlZGl0b3IgbWVzc2FnZTogZGVncmFkZSB3aXRoIGFuIGV4cGxhbmF0aW9uIGluc3RlYWQgb2YgdGhyb3dpbmcuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ3NjZW5lJywgJ3F1ZXJ5LWVudW0tbGlzdC13aXRoLXBhdGgnLCBlbnVtTmFtZSk7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMgfHwgb3B0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBObyBlbnVtIG5hbWVkICcke2VudW1OYW1lfScgaXMgcmVnaXN0ZXJlZC5gLFxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogXCJSdW4ga25vd2xlZGdlX3F1ZXJ5IHdpdGggYWN0aW9uICdkZXNjcmliZV9jb21wb25lbnQnIG9uIHRoZSBvd25pbmcgY29tcG9uZW50IOKAlCBhIHByb3BlcnR5J3MgZW51bU9wdGlvbnMgbmFtZXMgdGhlIHZhbHVlcyBpdCBhY2NlcHRzLlwiXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZW51bU5hbWUsIG9wdGlvbnMgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEVudW0gbG9va3VwIGZhaWxlZCBmb3IgJyR7ZW51bU5hbWV9JzogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogXCJUaGlzIHVzZXMgYW4gaW50ZXJuYWwgZWRpdG9yIG1lc3NhZ2UgdGhhdCBtYXkgYmUgdW5hdmFpbGFibGUuIFJlYWQgdGhlIHByb3BlcnR5J3MgY3VycmVudCB2YWx1ZSB3aXRoIGNvbXBvbmVudF9xdWVyeSBpbnN0ZWFkLlwiXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0TGF5ZXJzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBsYXllcnMgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ3F1ZXJ5LWxheWVyLWJ1aWx0aW4nKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbGF5ZXJzIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBMYXllciBsb29rdXAgZmFpbGVkOiAke2Vycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKX1gLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnVGhpcyB1c2VzIGFuIGludGVybmFsIGVkaXRvciBtZXNzYWdlIHRoYXQgbWF5IGJlIHVuYXZhaWxhYmxlIGluIHRoaXMgZWRpdG9yIHZlcnNpb24uJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==