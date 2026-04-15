import { ToolDefinition, ToolResponse, ToolExecutor, ComponentInfo } from '../types';
import { resolveSpriteFrameUuid } from '../utils/asset-utils';
import { logger } from '../logger';

export class ComponentTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'component_manage',
                description: 'Manage components on nodes: add, remove, or attach scripts. Available actions: add, remove, attach_script.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform. MUST be one of: "add", "remove", "attach_script". Use "remove" (not "delete") to remove a component.',
                            enum: ['add', 'remove', 'attach_script']
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID. REQUIRED for all actions. Use get_all_nodes or find_node_by_name to get the UUID of the desired node.'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type (used by "add" and "remove" actions). For "add": e.g., cc.Sprite, cc.Label, cc.Button. For "remove": must be the component\'s classId (cid, i.e. the type field from get_all), not the script name or class name. Use get_all to get the correct cid.'
                        },
                        scriptPath: {
                            type: 'string',
                            description: 'Script asset path (used by "attach_script" action). e.g., db://assets/scripts/MyScript.ts'
                        }
                    },
                    required: ['action', 'nodeUuid']
                }
            },
            {
                name: 'component_query',
                description: 'Query component information: get all components on a node, get specific component info, or list available component types. Available actions: get_all, get_info, get_available.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['get_all', 'get_info', 'get_available']
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID (required for "get_all" and "get_info" actions)'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type to get info for (required for "get_info" action)'
                        },
                        category: {
                            type: 'string',
                            description: 'Component category filter (used by "get_available" action)',
                            enum: ['all', 'renderer', 'ui', 'physics', 'animation', 'audio'],
                            default: 'all'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'set_component_property',
                description: 'Set component property values for UI components or custom script components. Supports setting properties of built-in UI components (e.g., cc.Label, cc.Sprite) and custom script components. Note: For node basic properties (name, active, layer, etc.), use set_node_property. For node transform properties (position, rotation, scale, etc.), use set_node_transform.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID - Must specify the node to operate on'
                        },
                        componentType: {
                            type: 'string',
                            description: 'Component type - Can be built-in components (e.g., cc.Label) or custom script components (e.g., MyScript). If unsure about component type, use get_components first to retrieve all components on the node.',
                            // Remove enum restriction, allow any component type including custom scripts
                        },
                        property: {
                            type: 'string',
                            description: 'Property name - The property to set. Common properties include:\n' +
                                '• cc.Label: string (text content), fontSize (font size), color (text color)\n' +
                                '• cc.Sprite: spriteFrame (sprite frame), color (tint color), sizeMode (size mode)\n' +
                                '• cc.Button: normalColor (normal color), pressedColor (pressed color), target (target node)\n' +
                                '• cc.UITransform: contentSize (content size), anchorPoint (anchor point)\n' +
                                '• Custom Scripts: Based on properties defined in the script'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Property type - Must explicitly specify the property data type for correct value conversion and validation',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray',
                                'assetArray', 'spriteFrameArray'
                            ]
                        },

                        value: {
                            description: 'Property value - Use the corresponding data format based on propertyType:\n\n' +
                                '📝 Basic Data Types:\n' +
                                '• string: "Hello World" (text string)\n' +
                                '• number/integer/float: 42 or 3.14 (numeric value)\n' +
                                '• boolean: true or false (boolean value)\n\n' +
                                '🎨 Color Type:\n' +
                                '• color: {"r":255,"g":0,"b":0,"a":255} (RGBA values, range 0-255)\n' +
                                '  - Alternative: "#FF0000" (hexadecimal format)\n' +
                                '  - Transparency: a value controls opacity, 255 = fully opaque, 0 = fully transparent\n\n' +
                                '📐 Vector and Size Types:\n' +
                                '• vec2: {"x":100,"y":50} (2D vector)\n' +
                                '• vec3: {"x":1,"y":2,"z":3} (3D vector)\n' +
                                '• size: {"width":100,"height":50} (size dimensions)\n\n' +
                                '🔗 Reference Types (using UUID strings):\n' +
                                '• node: "target-node-uuid" (node reference)\n' +
                                '  How to get: Use get_all_nodes or find_node_by_name to get node UUIDs\n' +
                                '• component: "target-node-uuid" (component reference)\n' +
                                '  How it works: \n' +
                                '    1. Provide the UUID of the NODE that contains the target component\n' +
                                '    2. System auto-detects required component type from property metadata\n' +
                                '    3. Finds the component on target node and gets its scene __id__\n' +
                                '    4. Sets reference using the scene __id__ (not node UUID)\n' +
                                '  Example: value="label-node-uuid" will find cc.Label and use its scene ID\n' +
                                '• spriteFrame: "spriteframe-uuid" (sprite frame asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• prefab: "prefab-uuid" (prefab asset)\n' +
                                '  How to get: Check asset database or use asset browser\n' +
                                '• asset: "asset-uuid" (generic asset reference)\n' +
                                '  How to get: Check asset database or use asset browser\n\n' +
                                '📋 Array Types:\n' +
                                '• nodeArray: ["uuid1","uuid2"] (array of node UUIDs)\n' +
                                '• colorArray: [{"r":255,"g":0,"b":0,"a":255}] (array of colors)\n' +
                                '• numberArray: [1,2,3,4,5] (array of numbers)\n' +
                                '• stringArray: ["item1","item2"] (array of strings)\n' +
                                '• assetArray: ["asset-uuid1","asset-uuid2"] (array of asset UUIDs, e.g. cc.SpriteAtlas, cc.Material)\n' +
                                '• spriteFrameArray: ["sf-uuid1","sf-uuid2"] (array of SpriteFrame UUIDs)'
                        }
                    },
                    required: ['nodeUuid', 'componentType', 'property', 'propertyType', 'value']
                }
            },
            {
                name: 'ui_apply_responsive_defaults',
                description: 'Apply responsive UI defaults on a node by ensuring UITransform/Widget/Layout are configured consistently. Presets: full_stretch, top_bar, bottom_bar, vertical_list, horizontal_list.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: {
                            type: 'string',
                            description: 'Target node UUID'
                        },
                        preset: {
                            type: 'string',
                            enum: ['full_stretch', 'top_bar', 'bottom_bar', 'vertical_list', 'horizontal_list'],
                            default: 'full_stretch',
                            description: 'Responsive preset to apply'
                        },
                        marginLeft: {
                            type: 'number',
                            default: 0
                        },
                        marginRight: {
                            type: 'number',
                            default: 0
                        },
                        marginTop: {
                            type: 'number',
                            default: 0
                        },
                        marginBottom: {
                            type: 'number',
                            default: 0
                        },
                        spacingX: {
                            type: 'number',
                            default: 0
                        },
                        spacingY: {
                            type: 'number',
                            default: 0
                        }
                    },
                    required: ['nodeUuid']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'component_manage': {
                const action = args.action;
                switch (action) {
                    case 'add':
                        return await this.addComponent(args.nodeUuid, args.componentType);
                    case 'remove':
                        return await this.removeComponent(args.nodeUuid, args.componentType);
                    case 'attach_script':
                        return await this.attachScript(args.nodeUuid, args.scriptPath);
                    default:
                        throw new Error(`Unknown action '${action}' for component_manage. Valid actions: add, remove, attach_script`);
                }
            }
            case 'component_query': {
                const action = args.action;
                switch (action) {
                    case 'get_all':
                        return await this.getComponents(args.nodeUuid);
                    case 'get_info':
                        return await this.getComponentInfo(args.nodeUuid, args.componentType);
                    case 'get_available':
                        return await this.getAvailableComponents(args.category);
                    default:
                        throw new Error(`Unknown action '${action}' for component_query. Valid actions: get_all, get_info, get_available`);
                }
            }
            case 'set_component_property':
                return await this.setComponentProperty(args);
            case 'ui_apply_responsive_defaults':
                return await this.applyResponsiveDefaults(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async applyResponsiveDefaults(args: any): Promise<ToolResponse> {
        const nodeUuid = String(args?.nodeUuid || '');
        const preset = String(args?.preset || 'full_stretch');
        if (!nodeUuid) {
            return { success: false, error: 'Missing required parameter: nodeUuid' };
        }

        const marginLeft = Number(args?.marginLeft ?? 0);
        const marginRight = Number(args?.marginRight ?? 0);
        const marginTop = Number(args?.marginTop ?? 0);
        const marginBottom = Number(args?.marginBottom ?? 0);
        const spacingX = Number(args?.spacingX ?? 0);
        const spacingY = Number(args?.spacingY ?? 0);

        const applied: string[] = [];
        const warnings: string[] = [];

        try {
            const ensureResult = await this.addComponent(nodeUuid, 'cc.UITransform');
            if (!ensureResult.success) {
                return { success: false, error: ensureResult.error || 'Failed to ensure cc.UITransform component' };
            }

            await this.applyComponentPropertyOrThrow(nodeUuid, 'cc.UITransform', 'anchorPoint', 'vec2', this.getAnchorByPreset(preset));
            applied.push('cc.UITransform.anchorPoint');

            await this.ensureWidget(nodeUuid);
            const widgetConfig = this.getWidgetConfigByPreset(preset);
            const widgetProps = [
                { property: 'isAlignLeft', propertyType: 'boolean', value: widgetConfig.isAlignLeft },
                { property: 'isAlignRight', propertyType: 'boolean', value: widgetConfig.isAlignRight },
                { property: 'isAlignTop', propertyType: 'boolean', value: widgetConfig.isAlignTop },
                { property: 'isAlignBottom', propertyType: 'boolean', value: widgetConfig.isAlignBottom },
                { property: 'left', propertyType: 'number', value: marginLeft },
                { property: 'right', propertyType: 'number', value: marginRight },
                { property: 'top', propertyType: 'number', value: marginTop },
                { property: 'bottom', propertyType: 'number', value: marginBottom }
            ];
            for (const item of widgetProps) {
                const result = await this.setComponentProperty({
                    nodeUuid,
                    componentType: 'cc.Widget',
                    property: item.property,
                    propertyType: item.propertyType,
                    value: item.value
                });
                if (!result.success) {
                    warnings.push(`cc.Widget.${item.property}: ${result.error || 'unknown error'}`);
                } else {
                    applied.push(`cc.Widget.${item.property}`);
                }
            }

            if (preset === 'vertical_list' || preset === 'horizontal_list') {
                await this.ensureLayout(nodeUuid);
                const layoutType = preset === 'vertical_list' ? 2 : 1;
                const layoutProps = [
                    { property: 'type', propertyType: 'integer', value: layoutType },
                    { property: 'resizeMode', propertyType: 'integer', value: 2 },
                    { property: 'spacingX', propertyType: 'number', value: spacingX },
                    { property: 'spacingY', propertyType: 'number', value: spacingY }
                ];
                for (const item of layoutProps) {
                    const result = await this.setComponentProperty({
                        nodeUuid,
                        componentType: 'cc.Layout',
                        property: item.property,
                        propertyType: item.propertyType,
                        value: item.value
                    });
                    if (!result.success) {
                        warnings.push(`cc.Layout.${item.property}: ${result.error || 'unknown error'}`);
                    } else {
                        applied.push(`cc.Layout.${item.property}`);
                    }
                }
            }

            return {
                success: warnings.length === 0,
                message: `Applied responsive preset '${preset}'`,
                warning: warnings.length > 0 ? warnings.join('\n') : undefined,
                data: {
                    nodeUuid,
                    preset,
                    applied,
                    warningCount: warnings.length
                }
            };
        } catch (error: any) {
            return {
                success: false,
                error: error?.message || `Failed to apply responsive preset '${preset}'`
            };
        }
    }

    private async ensureWidget(nodeUuid: string): Promise<void> {
        const result = await this.addComponent(nodeUuid, 'cc.Widget');
        if (!result.success) {
            throw new Error(result.error || 'Failed to ensure cc.Widget');
        }
    }

    private async ensureLayout(nodeUuid: string): Promise<void> {
        const result = await this.addComponent(nodeUuid, 'cc.Layout');
        if (!result.success) {
            throw new Error(result.error || 'Failed to ensure cc.Layout');
        }
    }

    private async applyComponentPropertyOrThrow(
        nodeUuid: string,
        componentType: string,
        property: string,
        propertyType: string,
        value: any
    ): Promise<void> {
        const result = await this.setComponentProperty({
            nodeUuid,
            componentType,
            property,
            propertyType,
            value
        });
        if (!result.success) {
            throw new Error(result.error || `Failed to set ${componentType}.${property}`);
        }
    }

    private getAnchorByPreset(preset: string): { x: number; y: number } {
        switch (preset) {
            case 'top_bar':
                return { x: 0.5, y: 1 };
            case 'bottom_bar':
                return { x: 0.5, y: 0 };
            default:
                return { x: 0.5, y: 0.5 };
        }
    }

    private getWidgetConfigByPreset(preset: string): { isAlignLeft: boolean; isAlignRight: boolean; isAlignTop: boolean; isAlignBottom: boolean } {
        switch (preset) {
            case 'top_bar':
                return { isAlignLeft: true, isAlignRight: true, isAlignTop: true, isAlignBottom: false };
            case 'bottom_bar':
                return { isAlignLeft: true, isAlignRight: true, isAlignTop: false, isAlignBottom: true };
            case 'vertical_list':
            case 'horizontal_list':
            case 'full_stretch':
            default:
                return { isAlignLeft: true, isAlignRight: true, isAlignTop: true, isAlignBottom: true };
        }
    }

    private async addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        // First check if the component already exists on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (allComponentsInfo.success && allComponentsInfo.data?.components) {
            const existingComponent = allComponentsInfo.data.components.find((comp: any) => comp.type === componentType);
            if (existingComponent) {
                return {
                    success: true,
                    message: `Component '${componentType}' already exists on node`,
                    data: {
                        nodeUuid: nodeUuid,
                        componentType: componentType,
                        componentVerified: true,
                        existing: true
                    }
                };
            }
        }
        // Try adding component directly using Editor API
        try {
            await Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType
            });
            // Wait for Editor to complete component addition
            await new Promise(resolve => setTimeout(resolve, 100));
            // Re-query node info to verify component was actually added
            try {
                const allComponentsInfo2 = await this.getComponents(nodeUuid);
                if (allComponentsInfo2.success && allComponentsInfo2.data?.components) {
                    const addedComponent = allComponentsInfo2.data.components.find((comp: any) => comp.type === componentType);
                    if (addedComponent) {
                        return {
                            success: true,
                            message: `Component '${componentType}' added successfully`,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                componentVerified: true,
                                existing: false
                            }
                        };
                    } else {
                        return {
                            success: false,
                            error: `Component '${componentType}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c: any) => c.type).join(', ')}`
                        };
                    }
                } else {
                    return {
                        success: false,
                        error: `Failed to verify component addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                    };
                }
            } catch (verifyError: any) {
                return {
                    success: false,
                    error: `Failed to verify component addition: ${verifyError.message}`
                };
            }
        } catch (err: any) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'addComponentToNode',
                args: [nodeUuid, componentType]
            };
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                return result as ToolResponse;
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private async removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        // 1. Find all components on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (!allComponentsInfo.success || !allComponentsInfo.data?.components) {
            return { success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` };
        }
        // 2. Only find components whose type field equals componentType (i.e., cid)
        const exists = allComponentsInfo.data.components.some((comp: any) => comp.type === componentType);
        if (!exists) {
            return { success: false, error: `Component cid '${componentType}' not found on node '${nodeUuid}'. Please use getComponents to get the type field (cid) as componentType.` };
        }
        // 3. Remove directly using official API
        try {
            await Editor.Message.request('scene', 'remove-component', {
                uuid: nodeUuid,
                component: componentType
            });
            // 4. Query again to confirm removal
            const afterRemoveInfo = await this.getComponents(nodeUuid);
            const stillExists = afterRemoveInfo.success && afterRemoveInfo.data?.components?.some((comp: any) => comp.type === componentType);
            if (stillExists) {
                return { success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'.` };
            } else {
                return {
                    success: true,
                    message: `Component cid '${componentType}' removed successfully from node '${nodeUuid}'`,
                    data: { nodeUuid, componentType }
                };
            }
        } catch (err: any) {
            return { success: false, error: `Failed to remove component: ${err.message}` };
        }
    }

    private async getComponents(nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Try querying node info directly using Editor API first
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData: any) => {
                if (nodeData && nodeData.__comps__) {
                    const components = nodeData.__comps__.map((comp: any) => ({
                        type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                        uuid: comp.uuid?.value || comp.uuid || null,
                        enabled: comp.enabled !== undefined ? comp.enabled : true,
                        properties: this.extractComponentProperties(comp)
                    }));

                    resolve({
                        success: true,
                        data: {
                            nodeUuid: nodeUuid,
                            components: components
                        }
                    });
                } else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err: Error) => {
                // Fallback: use scene script
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };

                Editor.Message.request('scene', 'execute-scene-script', options).then((result: any) => {
                    if (result.success) {
                        resolve({
                            success: true,
                            data: result.data.components
                        });
                    } else {
                        resolve(result);
                    }
                }).catch((err2: Error) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }

    private async getComponentInfo(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Try querying node info directly using Editor API first
            Editor.Message.request('scene', 'query-node', nodeUuid).then((nodeData: any) => {
                if (nodeData && nodeData.__comps__) {
                    const component = nodeData.__comps__.find((comp: any) => {
                        const compType = comp.__type__ || comp.cid || comp.type;
                        return compType === componentType;
                    });

                    if (component) {
                        resolve({
                            success: true,
                            data: {
                                nodeUuid: nodeUuid,
                                componentType: componentType,
                                enabled: component.enabled !== undefined ? component.enabled : true,
                                properties: this.extractComponentProperties(component)
                            }
                        });
                    } else {
                        resolve({ success: false, error: `Component '${componentType}' not found on node` });
                    }
                } else {
                    resolve({ success: false, error: 'Node not found or no components data' });
                }
            }).catch((err: Error) => {
                // Fallback: use scene script
                const options = {
                    name: 'cocos-mcp-server',
                    method: 'getNodeInfo',
                    args: [nodeUuid]
                };

                Editor.Message.request('scene', 'execute-scene-script', options).then((result: any) => {
                    if (result.success && result.data.components) {
                        const component = result.data.components.find((comp: any) => comp.type === componentType);
                        if (component) {
                            resolve({
                                success: true,
                                data: {
                                    nodeUuid: nodeUuid,
                                    componentType: componentType,
                                    ...component
                                }
                            });
                        } else {
                            resolve({ success: false, error: `Component '${componentType}' not found on node` });
                        }
                    } else {
                        resolve({ success: false, error: result.error || 'Failed to get component info' });
                    }
                }).catch((err2: Error) => {
                    resolve({ success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` });
                });
            });
        });
    }

    private extractComponentProperties(component: any): Record<string, any> {
        logger.info(`[extractComponentProperties] Processing component: ${JSON.stringify(Object.keys(component))}`);

        // Check if component has value property, which usually contains the actual component properties
        if (component.value && typeof component.value === 'object') {
            logger.info(`[extractComponentProperties] Found component.value with properties: ${JSON.stringify(Object.keys(component.value))}`);
            return component.value; // Return value object directly, it contains all component properties
        }

        // Fallback: extract properties directly from component object
        const properties: Record<string, any> = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];

        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                logger.info(`[extractComponentProperties] Found direct property '${key}': ${typeof component[key]}`);
                properties[key] = component[key];
            }
        }

        logger.info(`[extractComponentProperties] Final extracted properties: ${JSON.stringify(Object.keys(properties))}`);
        return properties;
    }

    private async findComponentTypeByUuid(componentUuid: string): Promise<string | null> {
        logger.info(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree) {
                logger.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }

            const queue: any[] = [nodeTree];

            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }

                try {
                    const fullNodeData = await Editor.Message.request('scene', 'query-node', currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp as any; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                logger.info(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${fullNodeData.name?.value}`);
                                return componentType;
                            }
                        }
                    }
                } catch (e) {
                    logger.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}: ${(e as any)?.message ?? String(e)}`);
                }

                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }

            logger.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        } catch (error) {
            logger.error(`[findComponentTypeByUuid] Error while searching for component type: ${(error as any)?.message ?? String(error)}`);
            return null;
        }
    }

    private async setComponentProperty(args: any): Promise<ToolResponse> {
        const { nodeUuid, componentType, property, propertyType, value } = args;

        try {
            logger.info(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);

            // Step 0: Detect if this is a node property, redirect to corresponding node method if so
            const nodeRedirectResult = await this.checkAndRedirectNodeProperties(args);
            if (nodeRedirectResult) {
                return nodeRedirectResult;
            }

            // Step 1: Get component info using the same method as getComponents
            const componentsResponse = await this.getComponents(nodeUuid);
            if (!componentsResponse.success || !componentsResponse.data) {
                return {
                    success: false,
                    error: `Failed to get components for node '${nodeUuid}': ${componentsResponse.error}`,
                    instruction: `Please verify that node UUID '${nodeUuid}' is correct. Use get_all_nodes or find_node_by_name to get the correct node UUID.`
                };
            }

            const allComponents = componentsResponse.data.components;

            // Step 2: Find target component
            let targetComponent = null;
            const availableTypes: string[] = [];

            for (let i = 0; i < allComponents.length; i++) {
                const comp = allComponents[i];
                availableTypes.push(comp.type);

                if (comp.type === componentType) {
                    targetComponent = comp;
                    break;
                }
            }

            if (!targetComponent) {
                // Provide more detailed error info and suggestions
                const instruction = this.generateComponentSuggestion(componentType, availableTypes, property);
                return {
                    success: false,
                    error: `Component '${componentType}' not found on node. Available components: ${availableTypes.join(', ')}`,
                    instruction: instruction
                };
            }

            // Step 3: Auto-detect and convert property values
            let propertyInfo;
            try {
                logger.info(`[ComponentTools] Analyzing property: ${property}`);
                propertyInfo = this.analyzeProperty(targetComponent, property);
            } catch (analyzeError: any) {
                logger.error(`[ComponentTools] Error in analyzeProperty: ${analyzeError?.message ?? String(analyzeError)}`);
                return {
                    success: false,
                    error: `Failed to analyze property '${property}': ${analyzeError.message}`
                };
            }

            if (!propertyInfo.exists) {
                return {
                    success: false,
                    error: `Property '${property}' not found on component '${componentType}'. Available properties: ${propertyInfo.availableProperties.join(', ')}`
                };
            }

                // Step 4: Process property values and apply settings
                const originalValue = propertyInfo.originalValue;

                // Pre-check: null original value means type cannot be reliably verified
                const wasNull = originalValue === null || originalValue === undefined;
                const referenceTypes = ['node', 'component', 'spriteFrame', 'prefab', 'asset', 'nodeArray', 'assetArray', 'spriteFrameArray'];
                const isReferenceType = referenceTypes.includes(propertyType);

                let processedValue: any;

                // Process property values based on explicit propertyType
                switch (propertyType) {
                    case 'string':
                        processedValue = String(value);
                        break;
                    case 'number':
                    case 'integer':
                    case 'float':
                        processedValue = Number(value);
                        break;
                    case 'boolean':
                        processedValue = Boolean(value);
                        break;
                    case 'color':
                        if (typeof value === 'string') {
                            // String format: supports hex, color names, rgb()/rgba()
                            processedValue = this.parseColorString(value);
                        } else if (typeof value === 'object' && value !== null) {
                            // Object format: validate and convert RGBA values
                            processedValue = {
                                r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                                a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                            };
                        } else {
                            throw new Error('Color value must be an object with r, g, b properties or a hexadecimal string (e.g., "#FF0000")');
                        }
                        break;
                    case 'vec2':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0
                            };
                        } else {
                            throw new Error('Vec2 value must be an object with x, y properties');
                        }
                        break;
                    case 'vec3':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                x: Number(value.x) || 0,
                                y: Number(value.y) || 0,
                                z: Number(value.z) || 0
                            };
                        } else {
                            throw new Error('Vec3 value must be an object with x, y, z properties');
                        }
                        break;
                    case 'size':
                        if (typeof value === 'object' && value !== null) {
                            processedValue = {
                                width: Number(value.width) || 0,
                                height: Number(value.height) || 0
                            };
                        } else {
                            throw new Error('Size value must be an object with width, height properties');
                        }
                        break;
                    case 'node':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        } else {
                            throw new Error('Node reference value must be a string UUID');
                        }
                        break;
                    case 'component':
                        if (typeof value === 'string') {
                            // Component references need special handling: find component __id__ via node UUID
                            processedValue = value; // Save node UUID first, will be converted to __id__ later
                        } else {
                            throw new Error('Component reference value must be a string (node UUID containing the target component)');
                        }
                        break;
                    case 'spriteFrame': {
                        if (typeof value !== 'string') {
                            throw new Error('spriteFrame value must be a string UUID');
                        }
                        // Auto-convert Texture2D UUID → SpriteFrame UUID
                        const sfResult = await resolveSpriteFrameUuid(value);
                        if (sfResult.converted) {
                            logger.info(`[ComponentTools] Auto-converted Texture2D UUID to SpriteFrame: ${value} → ${sfResult.uuid}`);
                        }
                        processedValue = { uuid: sfResult.uuid };
                        break;
                    }
                    case 'prefab':
                    case 'asset':
                        if (typeof value === 'string') {
                            processedValue = { uuid: value };
                        } else {
                            throw new Error(`${propertyType} value must be a string UUID`);
                        }
                        break;
                    case 'nodeArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                } else {
                                    throw new Error('NodeArray items must be string UUIDs');
                                }
                            });
                        } else {
                            throw new Error('NodeArray value must be an array');
                        }
                        break;
                    case 'colorArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => {
                                if (typeof item === 'object' && item !== null && 'r' in item) {
                                    return {
                                        r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                        g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                        b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                        a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                    };
                                } else {
                                    return { r: 255, g: 255, b: 255, a: 255 };
                                }
                            });
                        } else {
                            throw new Error('ColorArray value must be an array');
                        }
                        break;
                    case 'numberArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => Number(item));
                        } else {
                            throw new Error('NumberArray value must be an array');
                        }
                        break;
                    case 'stringArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => String(item));
                        } else {
                            throw new Error('StringArray value must be an array');
                        }
                        break;
                    case 'assetArray':
                        if (Array.isArray(value)) {
                            processedValue = value.map((item: any) => {
                                if (typeof item === 'string') {
                                    return { uuid: item };
                                } else if (typeof item === 'object' && item !== null && 'uuid' in item) {
                                    return { uuid: item.uuid };
                                } else {
                                    throw new Error('AssetArray items must be string UUIDs or objects with uuid property');
                                }
                            });
                        } else {
                            throw new Error('AssetArray value must be an array');
                        }
                        break;
                    case 'spriteFrameArray':
                        if (Array.isArray(value)) {
                            processedValue = [];
                            for (const item of value) {
                                const uuid = typeof item === 'string' ? item : (item && item.uuid ? item.uuid : null);
                                if (!uuid) {
                                    throw new Error('SpriteFrameArray items must be string UUIDs');
                                }
                                const sfResult = await resolveSpriteFrameUuid(uuid);
                                if (sfResult.converted) {
                                    logger.info(`[ComponentTools] Auto-converted Texture2D UUID to SpriteFrame: ${uuid} → ${sfResult.uuid}`);
                                }
                                (processedValue as any[]).push({ uuid: sfResult.uuid });
                            }
                        } else {
                            throw new Error('SpriteFrameArray value must be an array');
                        }
                        break;
                    default:
                        throw new Error(`Unsupported property type: ${propertyType}`);
                }

                logger.info(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${propertyType})`);
                logger.info(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${propertyType}"`);
                logger.info(`[ComponentTools] Will use color special handling: ${propertyType === 'color' && processedValue && typeof processedValue === 'object'}`);

                // Actual expected value for verification (needs special handling for component references)
                let actualExpectedValue = processedValue;

                // Step 5a: Validate reference UUIDs exist before setting
                const assetRefTypes = ['spriteFrame', 'prefab', 'asset'];
                const assetArrayTypes = ['assetArray', 'spriteFrameArray'];
                if (assetRefTypes.includes(propertyType) && processedValue?.uuid) {
                    const missing = await this.validateReferenceUuids([processedValue.uuid]);
                    if (missing.length > 0) {
                        return { success: false, error: `Asset UUID '${missing[0]}' does not exist in asset database. The asset may have been deleted or moved.` };
                    }
                } else if (assetArrayTypes.includes(propertyType) && Array.isArray(processedValue)) {
                    const uuids = processedValue.map((item: any) => item?.uuid).filter(Boolean);
                    const missing = await this.validateReferenceUuids(uuids);
                    if (missing.length > 0) {
                        return { success: false, error: `Asset UUID(s) not found in asset database: ${missing.join(', ')}. These assets may have been deleted or moved.` };
                    }
                } else if (propertyType === 'node' && processedValue?.uuid) {
                    const nodeExists = await Editor.Message.request('scene', 'query-node', processedValue.uuid).then((n: any) => !!n).catch(() => false);
                    if (!nodeExists) {
                        return { success: false, error: `Node UUID '${processedValue.uuid}' does not exist in current scene.` };
                    }
                }

                // Step 5: Get original node data to build correct path
                const rawNodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                if (!rawNodeData || !rawNodeData.__comps__) {
                    return {
                        success: false,
                        error: `Failed to get raw node data for property setting`
                    };
                }

                // Find original component index
                let rawComponentIndex = -1;
                for (let i = 0; i < rawNodeData.__comps__.length; i++) {
                    const comp = rawNodeData.__comps__[i] as any;
                    const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                    if (compType === componentType) {
                        rawComponentIndex = i;
                        break;
                    }
                }

                if (rawComponentIndex === -1) {
                    return {
                        success: false,
                        error: `Could not find component index for setting property`
                    };
                }

                // Snapshot non-null properties before change
                const beforeNonNull = this.snapshotNonNullProps(rawNodeData.__comps__[rawComponentIndex]);

                // Build correct property path
                let propertyPath = `__comps__.${rawComponentIndex}.${property}`;

                // Special handling for asset-type properties
                if (propertyType === 'asset' || propertyType === 'spriteFrame' || propertyType === 'prefab' ||
                    (propertyInfo.type === 'asset' && propertyType === 'string')) {

                    logger.info(`[ComponentTools] Setting asset reference: ${JSON.stringify({
                        value: processedValue,
                        property: property,
                        propertyType: propertyType,
                        path: propertyPath
                    })}`);

                    // Determine asset type based on property name
                    let assetType = 'cc.SpriteFrame'; // default
                    if (property.toLowerCase().includes('texture')) {
                        assetType = 'cc.Texture2D';
                    } else if (property.toLowerCase().includes('material')) {
                        assetType = 'cc.Material';
                    } else if (property.toLowerCase().includes('font')) {
                        assetType = 'cc.Font';
                    } else if (property.toLowerCase().includes('clip')) {
                        assetType = 'cc.AudioClip';
                    } else if (propertyType === 'prefab') {
                        assetType = 'cc.Prefab';
                    }

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue,
                            type: assetType
                        }
                    });
                } else if (componentType === 'cc.UITransform' && (property === '_contentSize' || property === 'contentSize')) {
                    // Special handling for UITransform contentSize - set width and height separately
                    const width = Number(value.width) || 100;
                    const height = Number(value.height) || 100;

                    // Set width first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.width`,
                        dump: { value: width }
                    });

                    // Then set height
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.height`,
                        dump: { value: height }
                    });
                } else if (componentType === 'cc.UITransform' && (property === '_anchorPoint' || property === 'anchorPoint')) {
                    // Special handling for UITransform anchorPoint - set anchorX and anchorY separately
                    const anchorX = Number(value.x) || 0.5;
                    const anchorY = Number(value.y) || 0.5;

                    // Set anchorX first
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorX`,
                        dump: { value: anchorX }
                    });

                    // Then set anchorY
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `__comps__.${rawComponentIndex}.anchorY`,
                        dump: { value: anchorY }
                    });
                } else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                    // Special handling for color properties, ensure RGBA values are correct
                    // Cocos Creator color values range is 0-255
                    const colorValue = {
                        r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                        g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                        b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                        a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                    };

                    logger.info(`[ComponentTools] Setting color value: ${JSON.stringify(colorValue)}`);

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: colorValue,
                            type: 'cc.Color'
                        }
                    });
                } else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Vec3 properties
                    const vec3Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0,
                        z: Number(processedValue.z) || 0
                    };

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: vec3Value,
                            type: 'cc.Vec3'
                        }
                    });
                } else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Vec2 properties
                    const vec2Value = {
                        x: Number(processedValue.x) || 0,
                        y: Number(processedValue.y) || 0
                    };

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: vec2Value,
                            type: 'cc.Vec2'
                        }
                    });
                } else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                    // Special handling for Size properties
                    const sizeValue = {
                        width: Number(processedValue.width) || 0,
                        height: Number(processedValue.height) || 0
                    };

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: sizeValue,
                            type: 'cc.Size'
                        }
                    });
                } else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                    // Special handling for node references
                    logger.info(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue,
                            type: 'cc.Node'
                        }
                    });
                } else if (propertyType === 'component' && typeof processedValue === 'string') {
                    // Special handling for component references: find component __id__ via node UUID
                    const targetNodeUuid = processedValue;
                    logger.info(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);

                    // Get expected component type from current component property metadata
                    let expectedComponentType = '';

                    // Get current component details including property metadata
                    const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                    if (currentComponentInfo.success && currentComponentInfo.data?.properties?.[property]) {
                        const propertyMeta = currentComponentInfo.data.properties[property];

                        // Extract component type info from property metadata
                        if (propertyMeta && typeof propertyMeta === 'object') {
                            // Check if there is a type field indicating component type
                            if (propertyMeta.type) {
                                expectedComponentType = propertyMeta.type;
                            } else if (propertyMeta.ctor) {
                                // Some properties may use ctor field
                                expectedComponentType = propertyMeta.ctor;
                            } else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
                                // Check extends array, usually the first is the most specific type
                                for (const extendType of propertyMeta.extends) {
                                    if (extendType.startsWith('cc.') && extendType !== 'cc.Component' && extendType !== 'cc.Object') {
                                        expectedComponentType = extendType;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (!expectedComponentType) {
                        throw new Error(`Unable to determine required component type for property '${property}' on component '${componentType}'. Property metadata may not contain type information.`);
                    }

                    logger.info(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);

                    try {
                        // Get target node component info
                        const targetNodeData = await Editor.Message.request('scene', 'query-node', targetNodeUuid);
                        if (!targetNodeData || !targetNodeData.__comps__) {
                            throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                        }

                        // Print target node component overview
                        logger.info(`[ComponentTools] Target node ${targetNodeUuid} has ${targetNodeData.__comps__.length} components:`);
                        targetNodeData.__comps__.forEach((comp: any, index: number) => {
                            const sceneId = comp.value && comp.value.uuid && comp.value.uuid.value ? comp.value.uuid.value : 'unknown';
                            logger.info(`[ComponentTools] Component ${index}: ${comp.type} (scene_id: ${sceneId})`);
                        });

                        // Find corresponding component
                        let targetComponent = null;
                        let componentId: string | null = null;

                        // Find specified type of component in target node _components array
                        // Note: __comps__ and _components indices correspond to each other
                        logger.info(`[ComponentTools] Searching for component type: ${expectedComponentType}`);

                        for (let i = 0; i < targetNodeData.__comps__.length; i++) {
                            const comp = targetNodeData.__comps__[i] as any;
                            logger.info(`[ComponentTools] Checking component ${i}: type=${comp.type}, target=${expectedComponentType}`);

                            if (comp.type === expectedComponentType) {
                                targetComponent = comp;
                                logger.info(`[ComponentTools] Found matching component at index ${i}: ${comp.type}`);

                                // Get component scene ID from component value.uuid.value
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    componentId = comp.value.uuid.value;
                                    logger.info(`[ComponentTools] Got componentId from comp.value.uuid.value: ${componentId}`);
                                } else {
                                    logger.info(`[ComponentTools] Component structure: ${JSON.stringify({
                                        hasValue: !!comp.value,
                                        hasUuid: !!(comp.value && comp.value.uuid),
                                        hasUuidValue: !!(comp.value && comp.value.uuid && comp.value.uuid.value),
                                        uuidStructure: comp.value ? comp.value.uuid : 'No value'
                                    })}`);
                                    throw new Error(`Unable to extract component ID from component structure`);
                                }

                                break;
                            }
                        }

                        if (!targetComponent) {
                            // If not found, list available components for user reference, showing real scene IDs
                            const availableComponents = targetNodeData.__comps__.map((comp: any, index: number) => {
                                let sceneId = 'unknown';
                                // Get scene ID from component value.uuid.value
                                if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                    sceneId = comp.value.uuid.value;
                                }
                                return `${comp.type}(scene_id:${sceneId})`;
                            });
                            throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${availableComponents.join(', ')}`);
                        }

                        logger.info(`[ComponentTools] Found component ${expectedComponentType} with scene ID: ${componentId} on node ${targetNodeUuid}`);

                        // Update expected value to actual component ID object format for subsequent verification
                        if (componentId) {
                            actualExpectedValue = { uuid: componentId };
                        }

                        // Try using same format as node/asset references: {uuid: componentId}
                        // Test to see if component reference can be set correctly
                        await Editor.Message.request('scene', 'set-property', {
                            uuid: nodeUuid,
                            path: propertyPath,
                            dump: {
                                value: { uuid: componentId },  // Use object format, like node/asset references
                                type: expectedComponentType
                            }
                        });

                    } catch (error) {
                        logger.error(`[ComponentTools] Error setting component reference: ${(error as any)?.message ?? String(error)}`);
                        throw error;
                    }
                } else if (propertyType === 'nodeArray' && Array.isArray(processedValue)) {
                    // Special handling for node arrays - keep preprocessed format
                    logger.info(`[ComponentTools] Setting node array: ${JSON.stringify(processedValue)}`);

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue  // Keep [{uuid: "..."}, {uuid: "..."}] format
                        }
                    });
                } else if ((propertyType === 'assetArray' || propertyType === 'spriteFrameArray') && Array.isArray(processedValue)) {
                    // Special handling for asset arrays - set entire array in one request
                    logger.info(`[ComponentTools] Setting asset array (${propertyType}): ${JSON.stringify(processedValue)}`);

                    // Determine asset type based on property name
                    let assetType = 'cc.Asset'; // default
                    if (property.toLowerCase().includes('atlas')) {
                        assetType = 'cc.SpriteAtlas';
                    } else if (property.toLowerCase().includes('spriteframe') || propertyType === 'spriteFrameArray') {
                        assetType = 'cc.SpriteFrame';
                    } else if (property.toLowerCase().includes('texture')) {
                        assetType = 'cc.Texture2D';
                    } else if (property.toLowerCase().includes('material')) {
                        assetType = 'cc.Material';
                    } else if (property.toLowerCase().includes('clip')) {
                        assetType = 'cc.AudioClip';
                    } else if (property.toLowerCase().includes('prefab')) {
                        assetType = 'cc.Prefab';
                    } else if (property.toLowerCase().includes('font')) {
                        assetType = 'cc.Font';
                    }

                    // Set entire array at once with proper per-element dump format
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: processedValue.map((item: any) => ({
                                value: item,    // { uuid: "..." }
                                type: assetType
                            }))
                        }
                    });
                } else if (propertyType === 'colorArray' && Array.isArray(processedValue)) {
                    // Special handling for color arrays
                    const colorArrayValue = processedValue.map((item: any) => {
                        if (item && typeof item === 'object' && 'r' in item) {
                            return {
                                r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                            };
                        } else {
                            return { r: 255, g: 255, b: 255, a: 255 };
                        }
                    });

                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: colorArrayValue as any,
                            type: 'cc.Color'
                        }
                    });
                } else {
                    // Normal property setting for non-asset properties
                    await Editor.Message.request('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: { value: processedValue }
                    });
                }

                // Step 5: Wait for Editor to complete update, then verify result
                await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms for Editor to complete update

                const verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);

                // Check for lost properties
                let lostProperties: string[] = [];
                try {
                    const afterRawData = await Editor.Message.request('scene', 'query-node', nodeUuid);
                    if (afterRawData?.__comps__?.[rawComponentIndex]) {
                        const afterNonNull = this.snapshotNonNullProps(afterRawData.__comps__[rawComponentIndex]);
                        lostProperties = beforeNonNull.filter((p: string) => p !== property && !afterNonNull.includes(p));
                    }
                } catch { /* ignore snapshot errors */ }

            const stillNull = verification.actualValue === null || verification.actualValue === undefined;
            const nullSetFailed = wasNull && isReferenceType && stillNull;

            return {
                success: !nullSetFailed,
                message: nullSetFailed
                    ? `Set ${componentType}.${property} failed — value is still null after operation`
                    : `Successfully set ${componentType}.${property}`,
                data: {
                    nodeUuid,
                    componentType,
                    property,
                    actualValue: verification.actualValue,
                    changeVerified: verification.verified,
                    ...(wasNull && isReferenceType && { nullWarning: `Property '${property}' was null before set — verify propertyType '${propertyType}' is correct` }),
                    ...(lostProperties.length > 0 && { lostProperties, warning: `Properties lost after change: ${lostProperties.join(', ')}` })
                }
            };

        } catch (error: any) {
            logger.error(`[ComponentTools] Error setting property: ${error?.message ?? String(error)}`);
            return {
                success: false,
                error: `Failed to set property: ${error.message}`
            };
        }
    }


    private async validateReferenceUuids(uuids: string[]): Promise<string[]> {
        const missing: string[] = [];
        for (const uuid of uuids) {
            const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid).catch(() => null);
            if (!info) missing.push(uuid);
        }
        return missing;
    }

    private snapshotNonNullProps(rawComp: any): string[] {
        if (!rawComp) return [];
        const skip = new Set(['__type__', 'cid', 'node', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'enabled', 'type', 'readonly', 'visible', 'editor', 'extends', '__scriptAsset']);
        return Object.keys(rawComp).filter(key => {
            if (skip.has(key) || key.startsWith('_')) return false;
            const val = rawComp[key];
            if (val === null || val === undefined) return false;
            // Unwrap Cocos descriptor objects: { value: ..., type: ... }
            if (typeof val === 'object' && 'value' in val) return val.value !== null && val.value !== undefined;
            return true;
        });
    }

    private async attachScript(nodeUuid: string, scriptPath: string): Promise<ToolResponse> {
        // Extract component class name from script path
        const scriptName = scriptPath.split('/').pop()?.replace('.ts', '').replace('.js', '');
        if (!scriptName) {
            return { success: false, error: 'Invalid script path' };
        }
        // First check if the script component already exists on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (allComponentsInfo.success && allComponentsInfo.data?.components) {
            const existingScript = allComponentsInfo.data.components.find((comp: any) => comp.type === scriptName);
            if (existingScript) {
                return {
                    success: true,
                    message: `Script '${scriptName}' already exists on node`,
                    data: {
                        nodeUuid: nodeUuid,
                        componentName: scriptName,
                        existing: true
                    }
                };
            }
        }
        // First try using script name directly as component type
        try {
            await Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: scriptName  // Use script name instead of UUID
            });
            // Wait for Editor to complete component addition
            await new Promise(resolve => setTimeout(resolve, 100));
            // Re-query node info to verify script was actually added
            const allComponentsInfo2 = await this.getComponents(nodeUuid);
            if (allComponentsInfo2.success && allComponentsInfo2.data?.components) {
                const addedScript = allComponentsInfo2.data.components.find((comp: any) => comp.type === scriptName);
                if (addedScript) {
                    return {
                        success: true,
                        message: `Script '${scriptName}' attached successfully`,
                        data: {
                            nodeUuid: nodeUuid,
                            componentName: scriptName,
                            existing: false
                        }
                    };
                } else {
                    return {
                        success: false,
                        error: `Script '${scriptName}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c: any) => c.type).join(', ')}`
                    };
                }
            } else {
                return {
                    success: false,
                    error: `Failed to verify script addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                };
            }
        } catch (err: any) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'attachScript',
                args: [nodeUuid, scriptPath]
            };
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', options);
                return result as ToolResponse;
            } catch {
                return {
                    success: false,
                    error: `Failed to attach script '${scriptName}': ${err.message}`,
                    instruction: 'Please ensure the script is properly compiled and exported as a Component class. You can also manually attach the script through the Properties panel in the editor.'
                };
            }
        }
    }

    private async getAvailableComponents(category: string = 'all'): Promise<ToolResponse> {
        const componentCategories: Record<string, string[]> = {
            renderer: ['cc.Sprite', 'cc.Label', 'cc.RichText', 'cc.Mask', 'cc.Graphics'],
            ui: ['cc.Button', 'cc.Toggle', 'cc.Slider', 'cc.ScrollView', 'cc.EditBox', 'cc.ProgressBar'],
            physics: ['cc.RigidBody2D', 'cc.BoxCollider2D', 'cc.CircleCollider2D', 'cc.PolygonCollider2D'],
            animation: ['cc.Animation', 'cc.AnimationClip', 'cc.SkeletalAnimation'],
            audio: ['cc.AudioSource'],
            layout: ['cc.Layout', 'cc.Widget', 'cc.PageView', 'cc.PageViewIndicator'],
            effects: ['cc.MotionStreak', 'cc.ParticleSystem2D'],
            camera: ['cc.Camera'],
            light: ['cc.Light', 'cc.DirectionalLight', 'cc.PointLight', 'cc.SpotLight']
        };

        let components: string[] = [];

        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        } else if (componentCategories[category]) {
            components = componentCategories[category];
        }

        return {
            success: true,
            data: {
                category: category,
                components: components
            }
        };
    }

    private isValidPropertyDescriptor(propData: any): boolean {
        // Check if it is a valid property descriptor object
        if (typeof propData !== 'object' || propData === null) {
            return false;
        }

        try {
            const keys = Object.keys(propData);

            // Avoid traversing simple numeric objects (e.g., {width: 200, height: 150})
            const isSimpleValueObject = keys.every(key => {
                const value = propData[key];
                return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';
            });

            if (isSimpleValueObject) {
                return false;
            }

            // Check for property descriptor characteristic fields without using 'in' operator
            const hasName = keys.includes('name');
            const hasValue = keys.includes('value');
            const hasType = keys.includes('type');
            const hasDisplayName = keys.includes('displayName');
            const hasReadonly = keys.includes('readonly');

            // Must contain name or value field, and usually also a type field
            const hasValidStructure = (hasName || hasValue) && (hasType || hasDisplayName || hasReadonly);

            // Extra check: if default field exists with complex structure, avoid deep traversal
            if (keys.includes('default') && propData.default && typeof propData.default === 'object') {
                const defaultKeys = Object.keys(propData.default);
                if (defaultKeys.includes('value') && typeof propData.default.value === 'object') {
                    // In this case, only return top-level properties without deep traversal of default.value
                    return hasValidStructure;
                }
            }

            return hasValidStructure;
        } catch (error) {
            logger.warn(`[isValidPropertyDescriptor] Error checking property descriptor: ${(error as any)?.message ?? String(error)}`);
            return false;
        }
    }

    private analyzeProperty(component: any, propertyName: string): { exists: boolean; type: string; availableProperties: string[]; originalValue: any } {
        // Extract available properties from complex component structure
        const availableProperties: string[] = [];
        let propertyValue: any = undefined;
        let propertyExists = false;

        // Try multiple ways to find properties:
        // 1. Direct property access
        if (Object.prototype.hasOwnProperty.call(component, propertyName)) {
            propertyValue = component[propertyName];
            propertyExists = true;
        }

        // 2. Find from nested structure (like complex structures seen in test data)
        if (!propertyExists && component.properties && typeof component.properties === 'object') {
            // First check if properties.value exists (this is the structure we see in getComponents)
            if (component.properties.value && typeof component.properties.value === 'object') {
                const valueObj = component.properties.value;
                for (const [key, propData] of Object.entries(valueObj)) {
                    // Check if propData is a valid property descriptor object
                    // Ensure propData is an object and contains expected property structure
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData as any;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prefer value property, if not available use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            } catch (error) {
                                // If check fails, use propInfo directly
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            } else {
                // Fallback: find directly from properties
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData as any;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prefer value property, if not available use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            } catch (error) {
                                // If check fails, use propInfo directly
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
        }

        // 3. Extract simple property names from direct properties
        if (availableProperties.length === 0) {
            for (const key of Object.keys(component)) {
                if (!key.startsWith('_') && !['__type__', 'cid', 'node', 'uuid', 'name', 'enabled', 'type', 'readonly', 'visible'].includes(key)) {
                    availableProperties.push(key);
                }
            }
        }

        if (!propertyExists) {
            return {
                exists: false,
                type: 'unknown',
                availableProperties,
                originalValue: undefined
            };
        }

        let type = 'unknown';

        // Smart type detection
        if (Array.isArray(propertyValue)) {
            // Array type detection
            if (propertyName.toLowerCase().includes('node')) {
                type = 'nodeArray';
            } else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            } else {
                type = 'array';
            }
        } else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            } else {
                type = 'string';
            }
        } else if (typeof propertyValue === 'number') {
            type = 'number';
        } else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        } else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                } else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                } else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                } else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // Check if it is a node reference (by property name or __id__ property)
                    if (propertyName.toLowerCase().includes('node') ||
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    } else {
                        type = 'asset';
                    }
                } else if (keys.includes('__id__')) {
                    // Node reference characteristics
                    type = 'node';
                } else {
                    type = 'object';
                }
            } catch (error) {
                logger.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        } else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            } else if (propertyName.toLowerCase().includes('node') ||
                propertyName.toLowerCase().includes('target')) {
                type = 'node';
            } else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            } else {
                type = 'unknown';
            }
        }

        return {
            exists: true,
            type,
            availableProperties,
            originalValue: propertyValue
        };
    }

    private parseColorString(colorStr: string): { r: number; g: number; b: number; a: number } {
        const str = colorStr.trim();

        // Only supports hex format #RRGGBB or #RRGGBBAA
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            } else if (str.length === 9) { // #RRGGBBAA
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                const a = parseInt(str.substring(7, 9), 16);
                return { r, g, b, a };
            }
        }

        // If not valid hex format, return error message
        throw new Error(`Invalid color format: "${colorStr}". Only hexadecimal format is supported (e.g., "#FF0000" or "#FF0000FF")`);
    }

    private async verifyPropertyChange(nodeUuid: string, componentType: string, property: string, originalValue: any, expectedValue: any): Promise<{ verified: boolean; actualValue: any; fullData: any }> {
        logger.info(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        logger.info(`[verifyPropertyChange] Expected value: ${JSON.stringify(expectedValue)}`);
        logger.info(`[verifyPropertyChange] Original value: ${JSON.stringify(originalValue)}`);

        try {
            // Re-get component info for verification
            logger.info(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            logger.info(`[verifyPropertyChange] getComponentInfo success: ${componentInfo.success}`);

            const allComponents = await this.getComponents(nodeUuid);
            logger.info(`[verifyPropertyChange] getComponents success: ${allComponents.success}`);

            if (componentInfo.success && componentInfo.data) {
                logger.info(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                logger.info(`[verifyPropertyChange] Available properties: ${JSON.stringify(allPropertyNames)}`);
                const propertyData = componentInfo.data.properties?.[property];
                logger.info(`[verifyPropertyChange] Raw property data for '${property}': ${JSON.stringify(propertyData)}`);

                // Extract actual value from property data
                let actualValue = propertyData;
                logger.info(`[verifyPropertyChange] Initial actualValue: ${JSON.stringify(actualValue)}`);

                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    logger.info(`[verifyPropertyChange] Extracted actualValue from .value: ${JSON.stringify(actualValue)}`);
                } else {
                    logger.info(`[verifyPropertyChange] No .value property found, using raw data`);
                }

                // Fix verification logic: check if actual value matches expected value
                let verified = false;

                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // For reference types (node/component/asset), compare UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';

                    logger.info(`[verifyPropertyChange] Reference comparison:`);
                    logger.info(`  - Expected UUID: "${expectedUuid}"`);
                    logger.info(`  - Actual UUID: "${actualUuid}"`);
                    logger.info(`  - UUID match: ${actualUuid === expectedUuid}`);
                    logger.info(`  - UUID not empty: ${expectedUuid !== ''}`);
                    logger.info(`  - Final verified: ${verified}`);
                } else {
                    // For other types, compare values directly
                    logger.info(`[verifyPropertyChange] Value comparison:`);
                    logger.info(`  - Expected type: ${typeof expectedValue}`);
                    logger.info(`  - Actual type: ${typeof actualValue}`);

                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // Deep comparison for object types
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            logger.info(`  - Object comparison (JSON): ${verified}`);
                        } else {
                            // Direct comparison for basic types
                            verified = actualValue === expectedValue;
                            logger.info(`  - Direct comparison: ${verified}`);
                        }
                    } else {
                        // Special handling for type mismatch (e.g., number and string)
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        logger.info(`  - String match: ${stringMatch}`);
                        logger.info(`  - Number match: ${numberMatch}`);
                        logger.info(`  - Type mismatch verified: ${verified}`);
                    }
                }

                logger.info(`[verifyPropertyChange] Final verification result: ${verified}`);
                logger.info(`[verifyPropertyChange] Final actualValue: ${JSON.stringify(actualValue)}`);

                const result = {
                    verified,
                    actualValue,
                    fullData: {
                        // Only return modified property info, not complete component data
                        modifiedProperty: {
                            name: property,
                            before: originalValue,
                            expected: expectedValue,
                            actual: actualValue,
                            verified,
                            propertyMetadata: propertyData // Only includes this property's metadata
                        },
                        // Simplified component info
                        componentSummary: {
                            nodeUuid,
                            componentType,
                            totalProperties: Object.keys(componentInfo.data?.properties || {}).length
                        }
                    }
                };

                logger.info(`[verifyPropertyChange] Returning result: ${JSON.stringify(result, null, 2)}`);
                return result;
            } else {
                logger.info(`[verifyPropertyChange] ComponentInfo failed or no data: ${JSON.stringify(componentInfo)}`);
            }
        } catch (error) {
            logger.error(`[verifyPropertyChange] Verification failed with error: ${(error as any)?.message ?? String(error)}`);
            logger.error(`[verifyPropertyChange] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        }

        logger.info(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }

    /**
     * Detect if this is a node property, redirect to corresponding node method if so
     */
    private async checkAndRedirectNodeProperties(args: any): Promise<ToolResponse | null> {
        const { nodeUuid, componentType, property, value } = args;

        // Detect if this is a basic node property (should use set_node_property)
        const nodeBasicProperties = [
            'name', 'active', 'layer', 'mobility', 'parent', 'children', 'hideFlags'
        ];

        // Detect if this is a node transform property (should use set_node_transform)
        const nodeTransformProperties = [
            'position', 'rotation', 'scale', 'eulerAngles', 'angle'
        ];

        // Detect attempts to set cc.Node properties (common mistake)
        if (componentType === 'cc.Node' || componentType === 'Node') {
            if (nodeBasicProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node basic property, not a component property`,
                    instruction: `Please use set_node_property method to set node properties: set_node_property(uuid="${nodeUuid}", property="${property}", value=${JSON.stringify(value)})`
                };
            } else if (nodeTransformProperties.includes(property)) {
                return {
                    success: false,
                    error: `Property '${property}' is a node transform property, not a component property`,
                    instruction: `Please use set_node_transform method to set transform properties: set_node_transform(uuid="${nodeUuid}", ${property}=${JSON.stringify(value)})`
                };
            }
        }

        // Detect common incorrect usage
        if (nodeBasicProperties.includes(property) || nodeTransformProperties.includes(property)) {
            const methodName = nodeTransformProperties.includes(property) ? 'set_node_transform' : 'set_node_property';
            return {
                success: false,
                error: `Property '${property}' is a node property, not a component property`,
                instruction: `Property '${property}' should be set using ${methodName} method, not set_component_property. Please use: ${methodName}(uuid="${nodeUuid}", ${nodeTransformProperties.includes(property) ? property : `property="${property}"`}=${JSON.stringify(value)})`
            };
        }

        return null; // Not a node property, continue normal processing
    }

    /**
     * Generate component suggestion info
     */
    private generateComponentSuggestion(requestedType: string, availableTypes: string[], property: string): string {
        // Check if similar component types exist
        const similarTypes = availableTypes.filter(type =>
            type.toLowerCase().includes(requestedType.toLowerCase()) ||
            requestedType.toLowerCase().includes(type.toLowerCase())
        );

        let instruction = '';

        if (similarTypes.length > 0) {
            instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
            instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
        }

        // Recommend possible components based on property name
        const propertyToComponentMap: Record<string, string[]> = {
            'string': ['cc.Label', 'cc.RichText', 'cc.EditBox'],
            'text': ['cc.Label', 'cc.RichText'],
            'fontSize': ['cc.Label', 'cc.RichText'],
            'spriteFrame': ['cc.Sprite'],
            'color': ['cc.Label', 'cc.Sprite', 'cc.Graphics'],
            'normalColor': ['cc.Button'],
            'pressedColor': ['cc.Button'],
            'target': ['cc.Button'],
            'contentSize': ['cc.UITransform'],
            'anchorPoint': ['cc.UITransform']
        };

        const recommendedComponents = propertyToComponentMap[property] || [];
        const availableRecommended = recommendedComponents.filter(comp => availableTypes.includes(comp));

        if (availableRecommended.length > 0) {
            instruction += `\n\n🎯 Based on property '${property}', recommended components: ${availableRecommended.join(', ')}`;
        }

        // Provide operation suggestions
        instruction += `\n\n📋 Suggested Actions:`;
        instruction += `\n1. Use get_components(nodeUuid="${requestedType.includes('uuid') ? 'YOUR_NODE_UUID' : 'nodeUuid'}") to view all components on the node`;
        instruction += `\n2. If you need to add a component, use add_component(nodeUuid="...", componentType="${requestedType}")`;
        instruction += `\n3. Verify that the component type name is correct (case-sensitive)`;

        return instruction;
    }

}
