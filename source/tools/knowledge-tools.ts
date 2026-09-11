import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';

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
export class KnowledgeTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName !== 'knowledge_query') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }

        switch (args?.action) {
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
                    error: `Unknown action '${args?.action}' for knowledge_query. Valid actions: list_component_types, describe_component, list_classes, has_script, list_enum, list_layers`
                };
        }
    }

    private async listComponentTypes(): Promise<ToolResponse> {
        try {
            const components = await editorRequest<any[]>('scene', 'query-components');
            const list = (components || []).map((c: any) => ({
                name: c.name ?? c.cid ?? String(c),
                path: c.path,
                cid: c.cid
            }));
            return { success: true, data: { count: list.length, components: list } };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async describeComponent(componentType: string): Promise<ToolResponse> {
        if (!componentType) {
            return { success: false, error: "componentType is required for 'describe_component', e.g. 'cc.Label'" };
        }

        // `query-classes` and `query-components` return names only, so the schema
        // has to be read from the engine's class metadata in the scene process.
        try {
            const result = await editorRequest<any>('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'describeClass',
                args: [componentType]
            });

            if (!result?.success) {
                return {
                    success: false,
                    error: result?.error || `Component type '${componentType}' not found.`,
                    instruction: "Run knowledge_query with action 'list_component_types' to see valid names."
                };
            }

            return { success: true, data: result.data };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async listClasses(className?: string): Promise<ToolResponse> {
        try {
            const options = className ? { extends: className } : undefined;
            const classes = await editorRequest<any[]>('scene', 'query-classes', options as any);
            const list = (classes || []).map((c: any) => ({
                name: c.name,
                cid: c.cid,
                extends: c.extends
            }));
            return { success: true, data: { count: list.length, filter: className, classes: list } };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async hasScript(scriptName: string): Promise<ToolResponse> {
        if (!scriptName) {
            return { success: false, error: "scriptName is required for 'has_script'" };
        }
        try {
            const result = await editorRequest('scene', 'query-component-has-script', scriptName);
            return { success: true, data: { scriptName, exists: !!result, raw: result } };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async listEnum(enumPath: string): Promise<ToolResponse> {
        if (!enumPath) {
            return { success: false, error: "enumPath is required for 'list_enum', e.g. 'Overflow'" };
        }
        // Despite the message name, this takes the BARE enum name: 'Overflow'
        // returns the option list, 'cc.Label.Overflow' returns null. Callers
        // naturally write the qualified form, so reduce it here.
        const enumName = enumPath.split('.').pop() as string;
        // Private editor message: degrade with an explanation instead of throwing.
        try {
            const options = await editorRequest<any[]>('scene', 'query-enum-list-with-path', enumName);
            if (!options || options.length === 0) {
                return {
                    success: false,
                    error: `No enum named '${enumName}' is registered.`,
                    instruction: "Run knowledge_query with action 'describe_component' on the owning component — a property's enumOptions names the values it accepts."
                };
            }
            return { success: true, data: { enumName, options } };
        } catch (err: any) {
            return {
                success: false,
                error: `Enum lookup failed for '${enumName}': ${err?.message || String(err)}`,
                instruction: "This uses an internal editor message that may be unavailable. Read the property's current value with component_query instead."
            };
        }
    }

    private async listLayers(): Promise<ToolResponse> {
        try {
            const layers = await editorRequest<any>('scene', 'query-layer-builtin');
            return { success: true, data: { layers } };
        } catch (err: any) {
            return {
                success: false,
                error: `Layer lookup failed: ${err?.message || String(err)}`,
                instruction: 'This uses an internal editor message that may be unavailable in this editor version.'
            };
        }
    }
}
