"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const asset_utils_1 = require("../utils/asset-utils");
const editor_request_1 = require("../utils/editor-request");
const logger_1 = require("../logger");
class ComponentTools {
    getTools() {
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
                            description: 'Property name to set. If unsure, use component_query get_info first to list actual properties.'
                        },
                        propertyType: {
                            type: 'string',
                            description: 'Data type of the value, must match propertyType->value format below.',
                            enum: [
                                'string', 'number', 'boolean', 'integer', 'float',
                                'color', 'vec2', 'vec3', 'size',
                                'node', 'component', 'spriteFrame', 'prefab', 'asset',
                                'nodeArray', 'colorArray', 'numberArray', 'stringArray',
                                'assetArray', 'spriteFrameArray'
                            ]
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
                            description: 'Format per propertyType: string/number/boolean literal as-is. ' +
                                'color: {r,g,b,a} 0-255 or "#FF0000". vec2: {x,y}. vec3: {x,y,z}. size: {width,height}. ' +
                                'node/spriteFrame/prefab/asset: target UUID string (get_all_nodes/asset browser to find it). ' +
                                'component: UUID of the NODE holding the target component (type auto-detected from property metadata, resolved to its scene __id__). ' +
                                '*Array variants: JSON array of the above (e.g. numberArray: [1,2,3], nodeArray: ["uuid1","uuid2"]).'
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
    async execute(toolName, args) {
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
    async applyResponsiveDefaults(args) {
        var _a, _b, _c, _d, _e, _f;
        const nodeUuid = String((args === null || args === void 0 ? void 0 : args.nodeUuid) || '');
        const preset = String((args === null || args === void 0 ? void 0 : args.preset) || 'full_stretch');
        if (!nodeUuid) {
            return { success: false, error: 'Missing required parameter: nodeUuid' };
        }
        const marginLeft = Number((_a = args === null || args === void 0 ? void 0 : args.marginLeft) !== null && _a !== void 0 ? _a : 0);
        const marginRight = Number((_b = args === null || args === void 0 ? void 0 : args.marginRight) !== null && _b !== void 0 ? _b : 0);
        const marginTop = Number((_c = args === null || args === void 0 ? void 0 : args.marginTop) !== null && _c !== void 0 ? _c : 0);
        const marginBottom = Number((_d = args === null || args === void 0 ? void 0 : args.marginBottom) !== null && _d !== void 0 ? _d : 0);
        const spacingX = Number((_e = args === null || args === void 0 ? void 0 : args.spacingX) !== null && _e !== void 0 ? _e : 0);
        const spacingY = Number((_f = args === null || args === void 0 ? void 0 : args.spacingY) !== null && _f !== void 0 ? _f : 0);
        const applied = [];
        const warnings = [];
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
                }
                else {
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
                    }
                    else {
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
        }
        catch (error) {
            return {
                success: false,
                error: (error === null || error === void 0 ? void 0 : error.message) || `Failed to apply responsive preset '${preset}'`
            };
        }
    }
    async ensureWidget(nodeUuid) {
        const result = await this.addComponent(nodeUuid, 'cc.Widget');
        if (!result.success) {
            throw new Error(result.error || 'Failed to ensure cc.Widget');
        }
    }
    async ensureLayout(nodeUuid) {
        const result = await this.addComponent(nodeUuid, 'cc.Layout');
        if (!result.success) {
            throw new Error(result.error || 'Failed to ensure cc.Layout');
        }
    }
    async applyComponentPropertyOrThrow(nodeUuid, componentType, property, propertyType, value) {
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
    getAnchorByPreset(preset) {
        switch (preset) {
            case 'top_bar':
                return { x: 0.5, y: 1 };
            case 'bottom_bar':
                return { x: 0.5, y: 0 };
            default:
                return { x: 0.5, y: 0.5 };
        }
    }
    getWidgetConfigByPreset(preset) {
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
    /**
     * Match a component by its registered type (cid or built-in class name like "cc.Sprite") OR
     * by a script class name appearing as `<ClassName>` in the component's instance name. Supports
     * both shapes seen across the codebase: extracted (from getComponents) and raw (from query-node).
     */
    static componentMatches(comp, componentType) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const t = (_b = (_a = comp === null || comp === void 0 ? void 0 : comp.type) !== null && _a !== void 0 ? _a : comp === null || comp === void 0 ? void 0 : comp.__type__) !== null && _b !== void 0 ? _b : comp === null || comp === void 0 ? void 0 : comp.cid;
        if (t === componentType)
            return true;
        const instanceName = (_h = (_e = (_d = (_c = comp === null || comp === void 0 ? void 0 : comp.properties) === null || _c === void 0 ? void 0 : _c.name) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : (_g = (_f = comp === null || comp === void 0 ? void 0 : comp.value) === null || _f === void 0 ? void 0 : _f.name) === null || _g === void 0 ? void 0 : _g.value) !== null && _h !== void 0 ? _h : (_j = comp === null || comp === void 0 ? void 0 : comp.name) === null || _j === void 0 ? void 0 : _j.value;
        return typeof instanceName === 'string' && instanceName.endsWith(`<${componentType}>`);
    }
    async addComponent(nodeUuid, componentType) {
        var _a, _b;
        // First check if the component already exists on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (allComponentsInfo.success && ((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
            const existingComponent = allComponentsInfo.data.components.find((comp) => ComponentTools.componentMatches(comp, componentType));
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
            await (0, editor_request_1.editorRequest)('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType
            });
            // Wait for Editor to complete component addition
            await new Promise(resolve => setTimeout(resolve, 100));
            // Re-query node info to verify component was actually added
            try {
                const allComponentsInfo2 = await this.getComponents(nodeUuid);
                if (allComponentsInfo2.success && ((_b = allComponentsInfo2.data) === null || _b === void 0 ? void 0 : _b.components)) {
                    const addedComponent = allComponentsInfo2.data.components.find((comp) => ComponentTools.componentMatches(comp, componentType));
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
                    }
                    else {
                        return {
                            success: false,
                            error: `Component '${componentType}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                        };
                    }
                }
                else {
                    return {
                        success: false,
                        error: `Failed to verify component addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                    };
                }
            }
            catch (verifyError) {
                return {
                    success: false,
                    error: `Failed to verify component addition: ${verifyError.message}`
                };
            }
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'addComponentToNode',
                args: [nodeUuid, componentType]
            };
            try {
                const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
                return result;
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    async removeComponent(nodeUuid, componentType) {
        var _a, _b, _c;
        // 1. Find all components on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (!allComponentsInfo.success || !((_a = allComponentsInfo.data) === null || _a === void 0 ? void 0 : _a.components)) {
            return { success: false, error: `Failed to get components for node '${nodeUuid}': ${allComponentsInfo.error}` };
        }
        // 2. Find the component instance — match by cid OR script class name (via instance name suffix).
        const matched = allComponentsInfo.data.components.find((comp) => ComponentTools.componentMatches(comp, componentType));
        if (!matched) {
            return { success: false, error: `Component '${componentType}' not found on node '${nodeUuid}'. Pass either the registered cid (from get_all) or the script class name.` };
        }
        const componentInstanceUuid = matched.uuid;
        if (!componentInstanceUuid) {
            return { success: false, error: `Component cid '${componentType}' on node '${nodeUuid}' has no instance uuid; cannot remove.` };
        }
        // 3. Remove via official API. RemoveComponentOptions.uuid is the COMPONENT instance uuid, not the node uuid.
        try {
            await (0, editor_request_1.editorRequest)('scene', 'remove-component', {
                uuid: componentInstanceUuid
            });
            // 4. Query again to confirm removal
            const afterRemoveInfo = await this.getComponents(nodeUuid);
            const stillExists = afterRemoveInfo.success && ((_c = (_b = afterRemoveInfo.data) === null || _b === void 0 ? void 0 : _b.components) === null || _c === void 0 ? void 0 : _c.some((comp) => ComponentTools.componentMatches(comp, componentType)));
            if (stillExists) {
                return { success: false, error: `Component cid '${componentType}' was not removed from node '${nodeUuid}'.` };
            }
            else {
                return {
                    success: true,
                    message: `Component cid '${componentType}' removed successfully from node '${nodeUuid}'`,
                    data: { nodeUuid, componentType }
                };
            }
        }
        catch (err) {
            return { success: false, error: `Failed to remove component: ${err.message}` };
        }
    }
    async getComponents(nodeUuid) {
        // Try querying node info directly using Editor API first
        let nodeData;
        try {
            nodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', nodeUuid);
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'getNodeInfo',
                args: [nodeUuid]
            };
            try {
                const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
                if (result.success) {
                    return {
                        success: true,
                        data: result.data.components
                    };
                }
                else {
                    return result;
                }
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
        if (nodeData && nodeData.__comps__) {
            const components = nodeData.__comps__.map((comp) => {
                var _a, _b, _c;
                return ({
                    type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                    // query-node nests instance uuid at comp.value.uuid.value; keep older shapes as fallback.
                    uuid: ((_b = (_a = comp.value) === null || _a === void 0 ? void 0 : _a.uuid) === null || _b === void 0 ? void 0 : _b.value) || ((_c = comp.uuid) === null || _c === void 0 ? void 0 : _c.value) || comp.uuid || null,
                    enabled: comp.enabled !== undefined ? comp.enabled : true,
                    properties: this.extractComponentProperties(comp)
                });
            });
            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    components: components
                }
            };
        }
        else {
            return { success: false, error: 'Node not found or no components data' };
        }
    }
    async getComponentInfo(nodeUuid, componentType) {
        // Try querying node info directly using Editor API first
        let nodeData;
        try {
            nodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', nodeUuid);
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'getNodeInfo',
                args: [nodeUuid]
            };
            try {
                const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
                if (result.success && result.data.components) {
                    const component = result.data.components.find((comp) => ComponentTools.componentMatches(comp, componentType));
                    if (component) {
                        return {
                            success: true,
                            data: Object.assign({ nodeUuid: nodeUuid, componentType: componentType }, component)
                        };
                    }
                    else {
                        return { success: false, error: `Component '${componentType}' not found on node` };
                    }
                }
                else {
                    return { success: false, error: result.error || 'Failed to get component info' };
                }
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
        if (nodeData && nodeData.__comps__) {
            const component = nodeData.__comps__.find((comp) => ComponentTools.componentMatches(comp, componentType));
            if (component) {
                return {
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        componentType: componentType,
                        enabled: component.enabled !== undefined ? component.enabled : true,
                        properties: this.extractComponentProperties(component)
                    }
                };
            }
            else {
                return { success: false, error: `Component '${componentType}' not found on node` };
            }
        }
        else {
            return { success: false, error: 'Node not found or no components data' };
        }
    }
    extractComponentProperties(component) {
        logger_1.logger.info(`[extractComponentProperties] Processing component: ${JSON.stringify(Object.keys(component))}`);
        // Check if component has value property, which usually contains the actual component properties
        if (component.value && typeof component.value === 'object') {
            logger_1.logger.info(`[extractComponentProperties] Found component.value with properties: ${JSON.stringify(Object.keys(component.value))}`);
            return component.value; // Return value object directly, it contains all component properties
        }
        // Fallback: extract properties directly from component object
        const properties = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                logger_1.logger.info(`[extractComponentProperties] Found direct property '${key}': ${typeof component[key]}`);
                properties[key] = component[key];
            }
        }
        logger_1.logger.info(`[extractComponentProperties] Final extracted properties: ${JSON.stringify(Object.keys(properties))}`);
        return properties;
    }
    async findComponentTypeByUuid(componentUuid) {
        var _a, _b, _c;
        logger_1.logger.info(`[findComponentTypeByUuid] Searching for component type with UUID: ${componentUuid}`);
        if (!componentUuid) {
            return null;
        }
        try {
            const nodeTree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
            if (!nodeTree) {
                logger_1.logger.warn('[findComponentTypeByUuid] Failed to query node tree.');
                return null;
            }
            const queue = [nodeTree];
            while (queue.length > 0) {
                const currentNodeInfo = queue.shift();
                if (!currentNodeInfo || !currentNodeInfo.uuid) {
                    continue;
                }
                try {
                    const fullNodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', currentNodeInfo.uuid);
                    if (fullNodeData && fullNodeData.__comps__) {
                        for (const comp of fullNodeData.__comps__) {
                            const compAny = comp; // Cast to any to access dynamic properties
                            // The component UUID is nested in the 'value' property
                            if (compAny.uuid && compAny.uuid.value === componentUuid) {
                                const componentType = compAny.__type__;
                                logger_1.logger.info(`[findComponentTypeByUuid] Found component type '${componentType}' for UUID ${componentUuid} on node ${(_a = fullNodeData.name) === null || _a === void 0 ? void 0 : _a.value}`);
                                return componentType;
                            }
                        }
                    }
                }
                catch (e) {
                    logger_1.logger.warn(`[findComponentTypeByUuid] Could not query node ${currentNodeInfo.uuid}: ${(_b = e === null || e === void 0 ? void 0 : e.message) !== null && _b !== void 0 ? _b : String(e)}`);
                }
                if (currentNodeInfo.children) {
                    for (const child of currentNodeInfo.children) {
                        queue.push(child);
                    }
                }
            }
            logger_1.logger.warn(`[findComponentTypeByUuid] Component with UUID ${componentUuid} not found in scene tree.`);
            return null;
        }
        catch (error) {
            logger_1.logger.error(`[findComponentTypeByUuid] Error while searching for component type: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : String(error)}`);
            return null;
        }
    }
    async setComponentProperty(args) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        const { nodeUuid, componentType, property, propertyType, value } = args;
        try {
            logger_1.logger.info(`[ComponentTools] Setting ${componentType}.${property} (type: ${propertyType}) = ${JSON.stringify(value)} on node ${nodeUuid}`);
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
            // Match by cid first (the canonical id surfaced as `comp.type`).
            // Custom-script components surface as cid (e.g. "1bd10ELCfBPcZ0I7xqYF2Rk"), so also
            // accept a script class name by matching the `<ClassName>` suffix in the component's
            // instance name (Cocos formats it as "<NodeName><ClassName>").
            let targetComponent = null;
            const availableTypes = [];
            const classSuffix = `<${componentType}>`;
            for (let i = 0; i < allComponents.length; i++) {
                const comp = allComponents[i];
                availableTypes.push(comp.type);
                if (comp.type === componentType) {
                    targetComponent = comp;
                    break;
                }
                const instanceName = (_b = (_a = comp === null || comp === void 0 ? void 0 : comp.properties) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.value;
                if (typeof instanceName === 'string' && instanceName.endsWith(classSuffix)) {
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
                logger_1.logger.info(`[ComponentTools] Analyzing property: ${property}`);
                propertyInfo = this.analyzeProperty(targetComponent, property);
            }
            catch (analyzeError) {
                logger_1.logger.error(`[ComponentTools] Error in analyzeProperty: ${(_c = analyzeError === null || analyzeError === void 0 ? void 0 : analyzeError.message) !== null && _c !== void 0 ? _c : String(analyzeError)}`);
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
            let processedValue;
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
                    }
                    else if (typeof value === 'object' && value !== null) {
                        // Object format: validate and convert RGBA values
                        processedValue = {
                            r: Math.min(255, Math.max(0, Number(value.r) || 0)),
                            g: Math.min(255, Math.max(0, Number(value.g) || 0)),
                            b: Math.min(255, Math.max(0, Number(value.b) || 0)),
                            a: value.a !== undefined ? Math.min(255, Math.max(0, Number(value.a))) : 255
                        };
                    }
                    else {
                        throw new Error('Color value must be an object with r, g, b properties or a hexadecimal string (e.g., "#FF0000")');
                    }
                    break;
                case 'vec2':
                    if (typeof value === 'object' && value !== null) {
                        processedValue = {
                            x: Number(value.x) || 0,
                            y: Number(value.y) || 0
                        };
                    }
                    else {
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
                    }
                    else {
                        throw new Error('Vec3 value must be an object with x, y, z properties');
                    }
                    break;
                case 'size':
                    if (typeof value === 'object' && value !== null) {
                        processedValue = {
                            width: Number(value.width) || 0,
                            height: Number(value.height) || 0
                        };
                    }
                    else {
                        throw new Error('Size value must be an object with width, height properties');
                    }
                    break;
                case 'node':
                    if (typeof value === 'string') {
                        processedValue = { uuid: value };
                    }
                    else {
                        throw new Error('Node reference value must be a string UUID');
                    }
                    break;
                case 'component':
                    if (typeof value === 'string') {
                        // Component references need special handling: find component __id__ via node UUID
                        processedValue = value; // Save node UUID first, will be converted to __id__ later
                    }
                    else {
                        throw new Error('Component reference value must be a string (node UUID containing the target component)');
                    }
                    break;
                case 'spriteFrame': {
                    if (typeof value !== 'string') {
                        throw new Error('spriteFrame value must be a string UUID');
                    }
                    // Auto-convert Texture2D UUID → SpriteFrame UUID
                    const sfResult = await (0, asset_utils_1.resolveSpriteFrameUuid)(value);
                    if (sfResult.converted) {
                        logger_1.logger.info(`[ComponentTools] Auto-converted Texture2D UUID to SpriteFrame: ${value} → ${sfResult.uuid}`);
                    }
                    processedValue = { uuid: sfResult.uuid };
                    break;
                }
                case 'prefab':
                case 'asset':
                    if (typeof value === 'string') {
                        processedValue = { uuid: value };
                    }
                    else {
                        throw new Error(`${propertyType} value must be a string UUID`);
                    }
                    break;
                case 'nodeArray':
                    if (Array.isArray(value)) {
                        processedValue = value.map((item) => {
                            if (typeof item === 'string') {
                                return { uuid: item };
                            }
                            else {
                                throw new Error('NodeArray items must be string UUIDs');
                            }
                        });
                    }
                    else {
                        throw new Error('NodeArray value must be an array');
                    }
                    break;
                case 'colorArray':
                    if (Array.isArray(value)) {
                        processedValue = value.map((item) => {
                            if (typeof item === 'object' && item !== null && 'r' in item) {
                                return {
                                    r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                    g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                    b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                    a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                                };
                            }
                            else {
                                return { r: 255, g: 255, b: 255, a: 255 };
                            }
                        });
                    }
                    else {
                        throw new Error('ColorArray value must be an array');
                    }
                    break;
                case 'numberArray':
                    if (Array.isArray(value)) {
                        processedValue = value.map((item) => Number(item));
                    }
                    else {
                        throw new Error('NumberArray value must be an array');
                    }
                    break;
                case 'stringArray':
                    if (Array.isArray(value)) {
                        processedValue = value.map((item) => String(item));
                    }
                    else {
                        throw new Error('StringArray value must be an array');
                    }
                    break;
                case 'assetArray':
                    if (Array.isArray(value)) {
                        processedValue = value.map((item) => {
                            if (typeof item === 'string') {
                                return { uuid: item };
                            }
                            else if (typeof item === 'object' && item !== null && 'uuid' in item) {
                                return { uuid: item.uuid };
                            }
                            else {
                                throw new Error('AssetArray items must be string UUIDs or objects with uuid property');
                            }
                        });
                    }
                    else {
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
                            const sfResult = await (0, asset_utils_1.resolveSpriteFrameUuid)(uuid);
                            if (sfResult.converted) {
                                logger_1.logger.info(`[ComponentTools] Auto-converted Texture2D UUID to SpriteFrame: ${uuid} → ${sfResult.uuid}`);
                            }
                            processedValue.push({ uuid: sfResult.uuid });
                        }
                    }
                    else {
                        throw new Error('SpriteFrameArray value must be an array');
                    }
                    break;
                default:
                    throw new Error(`Unsupported property type: ${propertyType}`);
            }
            logger_1.logger.info(`[ComponentTools] Converting value: ${JSON.stringify(value)} -> ${JSON.stringify(processedValue)} (type: ${propertyType})`);
            logger_1.logger.info(`[ComponentTools] Property analysis result: propertyInfo.type="${propertyInfo.type}", propertyType="${propertyType}"`);
            logger_1.logger.info(`[ComponentTools] Will use color special handling: ${propertyType === 'color' && processedValue && typeof processedValue === 'object'}`);
            // Actual expected value for verification (needs special handling for component references)
            let actualExpectedValue = processedValue;
            // Step 5a: Validate reference UUIDs exist before setting
            const assetRefTypes = ['spriteFrame', 'prefab', 'asset'];
            const assetArrayTypes = ['assetArray', 'spriteFrameArray'];
            if (assetRefTypes.includes(propertyType) && (processedValue === null || processedValue === void 0 ? void 0 : processedValue.uuid)) {
                const missing = await this.validateReferenceUuids([processedValue.uuid]);
                if (missing.length > 0) {
                    return { success: false, error: `Asset UUID '${missing[0]}' does not exist in asset database. The asset may have been deleted or moved.` };
                }
            }
            else if (assetArrayTypes.includes(propertyType) && Array.isArray(processedValue)) {
                const uuids = processedValue.map((item) => item === null || item === void 0 ? void 0 : item.uuid).filter(Boolean);
                const missing = await this.validateReferenceUuids(uuids);
                if (missing.length > 0) {
                    return { success: false, error: `Asset UUID(s) not found in asset database: ${missing.join(', ')}. These assets may have been deleted or moved.` };
                }
            }
            else if (propertyType === 'node' && (processedValue === null || processedValue === void 0 ? void 0 : processedValue.uuid)) {
                const nodeExists = await (0, editor_request_1.editorRequest)('scene', 'query-node', processedValue.uuid).then((n) => !!n).catch(() => false);
                if (!nodeExists) {
                    return { success: false, error: `Node UUID '${processedValue.uuid}' does not exist in current scene.` };
                }
            }
            // Step 5: Get original node data to build correct path
            const rawNodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', nodeUuid);
            if (!rawNodeData || !rawNodeData.__comps__) {
                return {
                    success: false,
                    error: `Failed to get raw node data for property setting`
                };
            }
            // Find original component index. Match by cid first, then by class-name suffix
            // in the component's instance name (raw query-node shape: comp.value.name.value).
            let rawComponentIndex = -1;
            const classSuffixForRaw = `<${componentType}>`;
            for (let i = 0; i < rawNodeData.__comps__.length; i++) {
                const comp = rawNodeData.__comps__[i];
                const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                if (compType === componentType) {
                    rawComponentIndex = i;
                    break;
                }
                const instanceName = (_f = (_e = (_d = comp === null || comp === void 0 ? void 0 : comp.value) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : (_g = comp === null || comp === void 0 ? void 0 : comp.name) === null || _g === void 0 ? void 0 : _g.value;
                if (typeof instanceName === 'string' && instanceName.endsWith(classSuffixForRaw)) {
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
                logger_1.logger.info(`[ComponentTools] Setting asset reference: ${JSON.stringify({
                    value: processedValue,
                    property: property,
                    propertyType: propertyType,
                    path: propertyPath
                })}`);
                // Determine asset type based on property name
                let assetType = 'cc.SpriteFrame'; // default
                if (property.toLowerCase().includes('texture')) {
                    assetType = 'cc.Texture2D';
                }
                else if (property.toLowerCase().includes('material')) {
                    assetType = 'cc.Material';
                }
                else if (property.toLowerCase().includes('font')) {
                    assetType = 'cc.Font';
                }
                else if (property.toLowerCase().includes('clip')) {
                    assetType = 'cc.AudioClip';
                }
                else if (propertyType === 'prefab') {
                    assetType = 'cc.Prefab';
                }
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: processedValue,
                        type: assetType
                    }
                });
            }
            else if (componentType === 'cc.UITransform' && (property === '_contentSize' || property === 'contentSize')) {
                // Special handling for UITransform contentSize - set width and height separately
                const width = Number(value.width) || 100;
                const height = Number(value.height) || 100;
                // Set width first
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: `__comps__.${rawComponentIndex}.width`,
                    dump: { value: width }
                });
                // Then set height
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: `__comps__.${rawComponentIndex}.height`,
                    dump: { value: height }
                });
            }
            else if (componentType === 'cc.UITransform' && (property === '_anchorPoint' || property === 'anchorPoint')) {
                // Special handling for UITransform anchorPoint - set anchorX and anchorY separately
                const anchorX = Number(value.x) || 0.5;
                const anchorY = Number(value.y) || 0.5;
                // Set anchorX first
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: `__comps__.${rawComponentIndex}.anchorX`,
                    dump: { value: anchorX }
                });
                // Then set anchorY
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: `__comps__.${rawComponentIndex}.anchorY`,
                    dump: { value: anchorY }
                });
            }
            else if (propertyType === 'color' && processedValue && typeof processedValue === 'object') {
                // Special handling for color properties, ensure RGBA values are correct
                // Cocos Creator color values range is 0-255
                const colorValue = {
                    r: Math.min(255, Math.max(0, Number(processedValue.r) || 0)),
                    g: Math.min(255, Math.max(0, Number(processedValue.g) || 0)),
                    b: Math.min(255, Math.max(0, Number(processedValue.b) || 0)),
                    a: processedValue.a !== undefined ? Math.min(255, Math.max(0, Number(processedValue.a))) : 255
                };
                logger_1.logger.info(`[ComponentTools] Setting color value: ${JSON.stringify(colorValue)}`);
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: colorValue,
                        type: 'cc.Color'
                    }
                });
            }
            else if (propertyType === 'vec3' && processedValue && typeof processedValue === 'object') {
                // Special handling for Vec3 properties
                const vec3Value = {
                    x: Number(processedValue.x) || 0,
                    y: Number(processedValue.y) || 0,
                    z: Number(processedValue.z) || 0
                };
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: vec3Value,
                        type: 'cc.Vec3'
                    }
                });
            }
            else if (propertyType === 'vec2' && processedValue && typeof processedValue === 'object') {
                // Special handling for Vec2 properties
                const vec2Value = {
                    x: Number(processedValue.x) || 0,
                    y: Number(processedValue.y) || 0
                };
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: vec2Value,
                        type: 'cc.Vec2'
                    }
                });
            }
            else if (propertyType === 'size' && processedValue && typeof processedValue === 'object') {
                // Special handling for Size properties
                const sizeValue = {
                    width: Number(processedValue.width) || 0,
                    height: Number(processedValue.height) || 0
                };
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: sizeValue,
                        type: 'cc.Size'
                    }
                });
            }
            else if (propertyType === 'node' && processedValue && typeof processedValue === 'object' && 'uuid' in processedValue) {
                // Special handling for node references
                logger_1.logger.info(`[ComponentTools] Setting node reference with UUID: ${processedValue.uuid}`);
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: {
                        value: processedValue,
                        type: 'cc.Node'
                    }
                });
            }
            else if (propertyType === 'component' && typeof processedValue === 'string') {
                // Special handling for component references: find component __id__ via node UUID
                const targetNodeUuid = processedValue;
                logger_1.logger.info(`[ComponentTools] Setting component reference - finding component on node: ${targetNodeUuid}`);
                // Get expected component type from current component property metadata
                let expectedComponentType = '';
                // Get current component details including property metadata
                const currentComponentInfo = await this.getComponentInfo(nodeUuid, componentType);
                if (currentComponentInfo.success && ((_j = (_h = currentComponentInfo.data) === null || _h === void 0 ? void 0 : _h.properties) === null || _j === void 0 ? void 0 : _j[property])) {
                    const propertyMeta = currentComponentInfo.data.properties[property];
                    // Extract component type info from property metadata
                    if (propertyMeta && typeof propertyMeta === 'object') {
                        // Check if there is a type field indicating component type
                        if (propertyMeta.type) {
                            expectedComponentType = propertyMeta.type;
                        }
                        else if (propertyMeta.ctor) {
                            // Some properties may use ctor field
                            expectedComponentType = propertyMeta.ctor;
                        }
                        else if (propertyMeta.extends && Array.isArray(propertyMeta.extends)) {
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
                logger_1.logger.info(`[ComponentTools] Detected required component type: ${expectedComponentType} for property: ${property}`);
                try {
                    // Get target node component info
                    const targetNodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', targetNodeUuid);
                    if (!targetNodeData || !targetNodeData.__comps__) {
                        throw new Error(`Target node ${targetNodeUuid} not found or has no components`);
                    }
                    // Print target node component overview
                    logger_1.logger.info(`[ComponentTools] Target node ${targetNodeUuid} has ${targetNodeData.__comps__.length} components:`);
                    targetNodeData.__comps__.forEach((comp, index) => {
                        const sceneId = comp.value && comp.value.uuid && comp.value.uuid.value ? comp.value.uuid.value : 'unknown';
                        logger_1.logger.info(`[ComponentTools] Component ${index}: ${comp.type} (scene_id: ${sceneId})`);
                    });
                    // Find corresponding component
                    let targetComponent = null;
                    let componentId = null;
                    // Find specified type of component in target node _components array
                    // Note: __comps__ and _components indices correspond to each other
                    logger_1.logger.info(`[ComponentTools] Searching for component type: ${expectedComponentType}`);
                    for (let i = 0; i < targetNodeData.__comps__.length; i++) {
                        const comp = targetNodeData.__comps__[i];
                        logger_1.logger.info(`[ComponentTools] Checking component ${i}: type=${comp.type}, target=${expectedComponentType}`);
                        if (comp.type === expectedComponentType) {
                            targetComponent = comp;
                            logger_1.logger.info(`[ComponentTools] Found matching component at index ${i}: ${comp.type}`);
                            // Get component scene ID from component value.uuid.value
                            if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                componentId = comp.value.uuid.value;
                                logger_1.logger.info(`[ComponentTools] Got componentId from comp.value.uuid.value: ${componentId}`);
                            }
                            else {
                                logger_1.logger.info(`[ComponentTools] Component structure: ${JSON.stringify({
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
                        const availableComponents = targetNodeData.__comps__.map((comp, index) => {
                            let sceneId = 'unknown';
                            // Get scene ID from component value.uuid.value
                            if (comp.value && comp.value.uuid && comp.value.uuid.value) {
                                sceneId = comp.value.uuid.value;
                            }
                            return `${comp.type}(scene_id:${sceneId})`;
                        });
                        throw new Error(`Component type '${expectedComponentType}' not found on node ${targetNodeUuid}. Available components: ${availableComponents.join(', ')}`);
                    }
                    logger_1.logger.info(`[ComponentTools] Found component ${expectedComponentType} with scene ID: ${componentId} on node ${targetNodeUuid}`);
                    // Update expected value to actual component ID object format for subsequent verification
                    if (componentId) {
                        actualExpectedValue = { uuid: componentId };
                    }
                    // Try using same format as node/asset references: {uuid: componentId}
                    // Test to see if component reference can be set correctly
                    await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: propertyPath,
                        dump: {
                            value: { uuid: componentId }, // Use object format, like node/asset references
                            type: expectedComponentType
                        }
                    });
                }
                catch (error) {
                    logger_1.logger.error(`[ComponentTools] Error setting component reference: ${(_k = error === null || error === void 0 ? void 0 : error.message) !== null && _k !== void 0 ? _k : String(error)}`);
                    throw error;
                }
            }
            else if (Array.isArray(processedValue) &&
                ['nodeArray', 'assetArray', 'spriteFrameArray', 'colorArray', 'numberArray', 'stringArray'].includes(propertyType)) {
                // Cocos `set-property` with `dump.value = [items]` does NOT auto-extend the array
                // beyond its current length; surplus items are silently dropped. Set per-index using
                // path `<propertyPath>.<i>` so Cocos extends the array as needed.
                let elementType = '';
                if (propertyType === 'nodeArray') {
                    elementType = 'cc.Node';
                }
                else if (propertyType === 'colorArray') {
                    elementType = 'cc.Color';
                }
                else if (propertyType === 'numberArray') {
                    elementType = 'Number';
                }
                else if (propertyType === 'stringArray') {
                    elementType = 'String';
                }
                else if (propertyType === 'spriteFrameArray') {
                    elementType = 'cc.SpriteFrame';
                }
                else if (propertyType === 'assetArray') {
                    // Infer asset element type from property name (mirrors single-asset heuristics).
                    elementType = 'cc.Asset';
                    const lower = property.toLowerCase();
                    if (lower.includes('atlas'))
                        elementType = 'cc.SpriteAtlas';
                    else if (lower.includes('spriteframe'))
                        elementType = 'cc.SpriteFrame';
                    else if (lower.includes('texture'))
                        elementType = 'cc.Texture2D';
                    else if (lower.includes('material'))
                        elementType = 'cc.Material';
                    else if (lower.includes('clip'))
                        elementType = 'cc.AudioClip';
                    else if (lower.includes('prefab'))
                        elementType = 'cc.Prefab';
                    else if (lower.includes('font'))
                        elementType = 'cc.Font';
                }
                // Normalize colorArray items (clamp 0-255, ensure alpha).
                const items = propertyType === 'colorArray'
                    ? processedValue.map((item) => {
                        if (item && typeof item === 'object' && 'r' in item) {
                            return {
                                r: Math.min(255, Math.max(0, Number(item.r) || 0)),
                                g: Math.min(255, Math.max(0, Number(item.g) || 0)),
                                b: Math.min(255, Math.max(0, Number(item.b) || 0)),
                                a: item.a !== undefined ? Math.min(255, Math.max(0, Number(item.a))) : 255
                            };
                        }
                        return { r: 255, g: 255, b: 255, a: 255 };
                    })
                    : processedValue;
                logger_1.logger.info(`[ComponentTools] Setting ${propertyType} per-index (${items.length} items, elementType=${elementType})`);
                for (let i = 0; i < items.length; i++) {
                    await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                        uuid: nodeUuid,
                        path: `${propertyPath}.${i}`,
                        dump: {
                            value: items[i],
                            type: elementType
                        }
                    });
                }
            }
            else {
                // Normal property setting for non-asset properties
                await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: nodeUuid,
                    path: propertyPath,
                    dump: { value: processedValue }
                });
            }
            // Step 5: Wait for Editor to complete update, then verify result
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms for Editor to complete update
            const verification = await this.verifyPropertyChange(nodeUuid, componentType, property, originalValue, actualExpectedValue);
            // Check for lost properties
            let lostProperties = [];
            try {
                const afterRawData = await (0, editor_request_1.editorRequest)('scene', 'query-node', nodeUuid);
                if ((_l = afterRawData === null || afterRawData === void 0 ? void 0 : afterRawData.__comps__) === null || _l === void 0 ? void 0 : _l[rawComponentIndex]) {
                    const afterNonNull = this.snapshotNonNullProps(afterRawData.__comps__[rawComponentIndex]);
                    lostProperties = beforeNonNull.filter((p) => p !== property && !afterNonNull.includes(p));
                }
            }
            catch ( /* ignore snapshot errors */_o) { /* ignore snapshot errors */ }
            const stillNull = verification.actualValue === null || verification.actualValue === undefined;
            const nullSetFailed = wasNull && isReferenceType && stillNull;
            return {
                success: !nullSetFailed,
                message: nullSetFailed
                    ? `Set ${componentType}.${property} failed — value is still null after operation`
                    : `Successfully set ${componentType}.${property}`,
                data: Object.assign(Object.assign({ nodeUuid,
                    componentType,
                    property, actualValue: verification.actualValue, changeVerified: verification.verified }, (wasNull && isReferenceType && { nullWarning: `Property '${property}' was null before set — verify propertyType '${propertyType}' is correct` })), (lostProperties.length > 0 && { lostProperties, warning: `Properties lost after change: ${lostProperties.join(', ')}` }))
            };
        }
        catch (error) {
            logger_1.logger.error(`[ComponentTools] Error setting property: ${(_m = error === null || error === void 0 ? void 0 : error.message) !== null && _m !== void 0 ? _m : String(error)}`);
            return {
                success: false,
                error: `Failed to set property: ${error.message}`
            };
        }
    }
    async validateReferenceUuids(uuids) {
        const missing = [];
        for (const uuid of uuids) {
            const info = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', uuid).catch(() => null);
            if (!info)
                missing.push(uuid);
        }
        return missing;
    }
    snapshotNonNullProps(rawComp) {
        if (!rawComp)
            return [];
        const skip = new Set(['__type__', 'cid', 'node', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'enabled', 'type', 'readonly', 'visible', 'editor', 'extends', '__scriptAsset']);
        return Object.keys(rawComp).filter(key => {
            if (skip.has(key) || key.startsWith('_'))
                return false;
            const val = rawComp[key];
            if (val === null || val === undefined)
                return false;
            // Unwrap Cocos descriptor objects: { value: ..., type: ... }
            if (typeof val === 'object' && 'value' in val)
                return val.value !== null && val.value !== undefined;
            return true;
        });
    }
    async attachScript(nodeUuid, scriptPath) {
        var _a, _b, _c;
        // Extract component class name from script path
        const scriptName = (_a = scriptPath.split('/').pop()) === null || _a === void 0 ? void 0 : _a.replace('.ts', '').replace('.js', '');
        if (!scriptName) {
            return { success: false, error: 'Invalid script path' };
        }
        // Resolve script asset uuid so we can match attached component reliably.
        // Custom-script components surface as cid in `comp.type`, NOT as the class name —
        // so name-based comparison gives false negatives. Match via __scriptAsset.value.uuid instead.
        let scriptAssetUuid = null;
        try {
            scriptAssetUuid = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', scriptPath);
        }
        catch (_d) {
            // Fallback to name-based match if uuid lookup fails.
        }
        const matchesScript = (comp) => {
            var _a, _b, _c, _d, _e;
            const compScriptUuid = (_c = (_b = (_a = comp === null || comp === void 0 ? void 0 : comp.properties) === null || _a === void 0 ? void 0 : _a.__scriptAsset) === null || _b === void 0 ? void 0 : _b.value) === null || _c === void 0 ? void 0 : _c.uuid;
            if (scriptAssetUuid && compScriptUuid) {
                return compScriptUuid === scriptAssetUuid;
            }
            // Fallback: registered class name (rare for custom scripts) or instance name suffix `<ClassName>`.
            if (comp.type === scriptName)
                return true;
            const instanceName = (_e = (_d = comp === null || comp === void 0 ? void 0 : comp.properties) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.value;
            return !!instanceName && instanceName.endsWith(`<${scriptName}>`);
        };
        // First check if the script component already exists on the node
        const allComponentsInfo = await this.getComponents(nodeUuid);
        if (allComponentsInfo.success && ((_b = allComponentsInfo.data) === null || _b === void 0 ? void 0 : _b.components)) {
            const existingScript = allComponentsInfo.data.components.find(matchesScript);
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
            await (0, editor_request_1.editorRequest)('scene', 'create-component', {
                uuid: nodeUuid,
                component: scriptName // Use script name instead of UUID
            });
            // Wait for Editor to complete component addition
            await new Promise(resolve => setTimeout(resolve, 100));
            // Re-query node info to verify script was actually added
            const allComponentsInfo2 = await this.getComponents(nodeUuid);
            if (allComponentsInfo2.success && ((_c = allComponentsInfo2.data) === null || _c === void 0 ? void 0 : _c.components)) {
                const addedScript = allComponentsInfo2.data.components.find(matchesScript);
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
                }
                else {
                    return {
                        success: false,
                        error: `Script '${scriptName}' was not found on node after addition. Available components: ${allComponentsInfo2.data.components.map((c) => c.type).join(', ')}`
                    };
                }
            }
            else {
                return {
                    success: false,
                    error: `Failed to verify script addition: ${allComponentsInfo2.error || 'Unable to get node components'}`
                };
            }
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'attachScript',
                args: [nodeUuid, scriptPath]
            };
            try {
                const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
                return result;
            }
            catch (_e) {
                return {
                    success: false,
                    error: `Failed to attach script '${scriptName}': ${err.message}`,
                    instruction: 'Please ensure the script is properly compiled and exported as a Component class. You can also manually attach the script through the Properties panel in the editor.'
                };
            }
        }
    }
    async getAvailableComponents(category = 'all') {
        const componentCategories = {
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
        let components = [];
        if (category === 'all') {
            for (const cat in componentCategories) {
                components = components.concat(componentCategories[cat]);
            }
        }
        else if (componentCategories[category]) {
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
    isValidPropertyDescriptor(propData) {
        var _a;
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
        }
        catch (error) {
            logger_1.logger.warn(`[isValidPropertyDescriptor] Error checking property descriptor: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`);
            return false;
        }
    }
    analyzeProperty(component, propertyName) {
        // Extract available properties from complex component structure
        const availableProperties = [];
        let propertyValue = undefined;
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
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prefer value property, if not available use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
                                // If check fails, use propInfo directly
                                propertyValue = propInfo;
                            }
                            propertyExists = true;
                        }
                    }
                }
            }
            else {
                // Fallback: find directly from properties
                for (const [key, propData] of Object.entries(component.properties)) {
                    if (this.isValidPropertyDescriptor(propData)) {
                        const propInfo = propData;
                        availableProperties.push(key);
                        if (key === propertyName) {
                            // Prefer value property, if not available use propData itself
                            try {
                                const propKeys = Object.keys(propInfo);
                                propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                            }
                            catch (error) {
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
            }
            else if (propertyName.toLowerCase().includes('color')) {
                type = 'colorArray';
            }
            else {
                type = 'array';
            }
        }
        else if (typeof propertyValue === 'string') {
            // Check if property name suggests it's an asset
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else {
                type = 'string';
            }
        }
        else if (typeof propertyValue === 'number') {
            type = 'number';
        }
        else if (typeof propertyValue === 'boolean') {
            type = 'boolean';
        }
        else if (propertyValue && typeof propertyValue === 'object') {
            try {
                const keys = Object.keys(propertyValue);
                if (keys.includes('r') && keys.includes('g') && keys.includes('b')) {
                    type = 'color';
                }
                else if (keys.includes('x') && keys.includes('y')) {
                    type = propertyValue.z !== undefined ? 'vec3' : 'vec2';
                }
                else if (keys.includes('width') && keys.includes('height')) {
                    type = 'size';
                }
                else if (keys.includes('uuid') || keys.includes('__uuid__')) {
                    // Check if it is a node reference (by property name or __id__ property)
                    if (propertyName.toLowerCase().includes('node') ||
                        propertyName.toLowerCase().includes('target') ||
                        keys.includes('__id__')) {
                        type = 'node';
                    }
                    else {
                        type = 'asset';
                    }
                }
                else if (keys.includes('__id__')) {
                    // Node reference characteristics
                    type = 'node';
                }
                else {
                    type = 'object';
                }
            }
            catch (error) {
                logger_1.logger.warn(`[analyzeProperty] Error checking property type for: ${JSON.stringify(propertyValue)}`);
                type = 'object';
            }
        }
        else if (propertyValue === null || propertyValue === undefined) {
            // For null/undefined values, check property name to determine type
            if (['spriteFrame', 'texture', 'material', 'font', 'clip', 'prefab'].includes(propertyName.toLowerCase())) {
                type = 'asset';
            }
            else if (propertyName.toLowerCase().includes('node') ||
                propertyName.toLowerCase().includes('target')) {
                type = 'node';
            }
            else if (propertyName.toLowerCase().includes('component')) {
                type = 'component';
            }
            else {
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
    parseColorString(colorStr) {
        const str = colorStr.trim();
        // Only supports hex format #RRGGBB or #RRGGBBAA
        if (str.startsWith('#')) {
            if (str.length === 7) { // #RRGGBB
                const r = parseInt(str.substring(1, 3), 16);
                const g = parseInt(str.substring(3, 5), 16);
                const b = parseInt(str.substring(5, 7), 16);
                return { r, g, b, a: 255 };
            }
            else if (str.length === 9) { // #RRGGBBAA
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
    async verifyPropertyChange(nodeUuid, componentType, property, originalValue, expectedValue) {
        var _a, _b, _c;
        logger_1.logger.info(`[verifyPropertyChange] Starting verification for ${componentType}.${property}`);
        logger_1.logger.info(`[verifyPropertyChange] Expected value: ${JSON.stringify(expectedValue)}`);
        logger_1.logger.info(`[verifyPropertyChange] Original value: ${JSON.stringify(originalValue)}`);
        try {
            // Re-get component info for verification
            logger_1.logger.info(`[verifyPropertyChange] Calling getComponentInfo...`);
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            logger_1.logger.info(`[verifyPropertyChange] getComponentInfo success: ${componentInfo.success}`);
            const allComponents = await this.getComponents(nodeUuid);
            logger_1.logger.info(`[verifyPropertyChange] getComponents success: ${allComponents.success}`);
            if (componentInfo.success && componentInfo.data) {
                logger_1.logger.info(`[verifyPropertyChange] Component data available, extracting property '${property}'`);
                const allPropertyNames = Object.keys(componentInfo.data.properties || {});
                logger_1.logger.info(`[verifyPropertyChange] Available properties: ${JSON.stringify(allPropertyNames)}`);
                const propertyData = (_a = componentInfo.data.properties) === null || _a === void 0 ? void 0 : _a[property];
                logger_1.logger.info(`[verifyPropertyChange] Raw property data for '${property}': ${JSON.stringify(propertyData)}`);
                // Extract actual value from property data
                let actualValue = propertyData;
                logger_1.logger.info(`[verifyPropertyChange] Initial actualValue: ${JSON.stringify(actualValue)}`);
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                    logger_1.logger.info(`[verifyPropertyChange] Extracted actualValue from .value: ${JSON.stringify(actualValue)}`);
                }
                else {
                    logger_1.logger.info(`[verifyPropertyChange] No .value property found, using raw data`);
                }
                // Fix verification logic: check if actual value matches expected value
                let verified = false;
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // For reference types (node/component/asset), compare UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                    logger_1.logger.info(`[verifyPropertyChange] Reference comparison:`);
                    logger_1.logger.info(`  - Expected UUID: "${expectedUuid}"`);
                    logger_1.logger.info(`  - Actual UUID: "${actualUuid}"`);
                    logger_1.logger.info(`  - UUID match: ${actualUuid === expectedUuid}`);
                    logger_1.logger.info(`  - UUID not empty: ${expectedUuid !== ''}`);
                    logger_1.logger.info(`  - Final verified: ${verified}`);
                }
                else {
                    // For other types, compare values directly
                    logger_1.logger.info(`[verifyPropertyChange] Value comparison:`);
                    logger_1.logger.info(`  - Expected type: ${typeof expectedValue}`);
                    logger_1.logger.info(`  - Actual type: ${typeof actualValue}`);
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // Deep comparison for object types
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                            logger_1.logger.info(`  - Object comparison (JSON): ${verified}`);
                        }
                        else {
                            // Direct comparison for basic types
                            verified = actualValue === expectedValue;
                            logger_1.logger.info(`  - Direct comparison: ${verified}`);
                        }
                    }
                    else {
                        // Special handling for type mismatch (e.g., number and string)
                        const stringMatch = String(actualValue) === String(expectedValue);
                        const numberMatch = Number(actualValue) === Number(expectedValue);
                        verified = stringMatch || numberMatch;
                        logger_1.logger.info(`  - String match: ${stringMatch}`);
                        logger_1.logger.info(`  - Number match: ${numberMatch}`);
                        logger_1.logger.info(`  - Type mismatch verified: ${verified}`);
                    }
                }
                logger_1.logger.info(`[verifyPropertyChange] Final verification result: ${verified}`);
                logger_1.logger.info(`[verifyPropertyChange] Final actualValue: ${JSON.stringify(actualValue)}`);
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
                            totalProperties: Object.keys(((_b = componentInfo.data) === null || _b === void 0 ? void 0 : _b.properties) || {}).length
                        }
                    }
                };
                logger_1.logger.info(`[verifyPropertyChange] Returning result: ${JSON.stringify(result, null, 2)}`);
                return result;
            }
            else {
                logger_1.logger.info(`[verifyPropertyChange] ComponentInfo failed or no data: ${JSON.stringify(componentInfo)}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`[verifyPropertyChange] Verification failed with error: ${(_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : String(error)}`);
            logger_1.logger.error(`[verifyPropertyChange] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
        }
        logger_1.logger.info(`[verifyPropertyChange] Returning fallback result`);
        return {
            verified: false,
            actualValue: undefined,
            fullData: null
        };
    }
    /**
     * Detect if this is a node property, redirect to corresponding node method if so
     */
    async checkAndRedirectNodeProperties(args) {
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
            }
            else if (nodeTransformProperties.includes(property)) {
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
    generateComponentSuggestion(requestedType, availableTypes, property) {
        // Check if similar component types exist
        const similarTypes = availableTypes.filter(type => type.toLowerCase().includes(requestedType.toLowerCase()) ||
            requestedType.toLowerCase().includes(type.toLowerCase()));
        let instruction = '';
        if (similarTypes.length > 0) {
            instruction += `\n\n🔍 Found similar components: ${similarTypes.join(', ')}`;
            instruction += `\n💡 Suggestion: Perhaps you meant to set the '${similarTypes[0]}' component?`;
        }
        // Recommend possible components based on property name
        const propertyToComponentMap = {
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
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzREFBOEQ7QUFDOUQsNERBQXdEO0FBQ3hELHNDQUFtQztBQUVuQyxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsNEdBQTRHO2dCQUN6SCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsNkhBQTZIOzRCQUMxSSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQzt5QkFDM0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5SEFBeUg7eUJBQ3pJO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc1FBQXNRO3lCQUN0Ujt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJGQUEyRjt5QkFDM0c7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztpQkFDbkM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVcsRUFBRSxpTEFBaUw7Z0JBQzlMLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVB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TSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUMvQixDQUFDO2lCQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVk7Z0JBQ3ZDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDTCxDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBC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QUFDO0lBQ3ZCLENBQUM7Q0FFSjtBQXg1REQsd0NBdzVEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgQ29tcG9uZW50SW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IHJlc29sdmVTcHJpdGVGcmFtZVV1aWQgfSBmcm9tICcuLi91dGlscy9hc3NldC11dGlscyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcblxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29tcG9uZW50X21hbmFnZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgY29tcG9uZW50cyBvbiBub2RlczogYWRkLCByZW1vdmUsIG9yIGF0dGFjaCBzY3JpcHRzLiBBdmFpbGFibGUgYWN0aW9uczogYWRkLCByZW1vdmUsIGF0dGFjaF9zY3JpcHQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0uIE1VU1QgYmUgb25lIG9mOiBcImFkZFwiLCBcInJlbW92ZVwiLCBcImF0dGFjaF9zY3JpcHRcIi4gVXNlIFwicmVtb3ZlXCIgKG5vdCBcImRlbGV0ZVwiKSB0byByZW1vdmUgYSBjb21wb25lbnQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FkZCcsICdyZW1vdmUnLCAnYXR0YWNoX3NjcmlwdCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQuIFJFUVVJUkVEIGZvciBhbGwgYWN0aW9ucy4gVXNlIGdldF9hbGxfbm9kZXMgb3IgZmluZF9ub2RlX2J5X25hbWUgdG8gZ2V0IHRoZSBVVUlEIG9mIHRoZSBkZXNpcmVkIG5vZGUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlICh1c2VkIGJ5IFwiYWRkXCIgYW5kIFwicmVtb3ZlXCIgYWN0aW9ucykuIEZvciBcImFkZFwiOiBlLmcuLCBjYy5TcHJpdGUsIGNjLkxhYmVsLCBjYy5CdXR0b24uIEZvciBcInJlbW92ZVwiOiBtdXN0IGJlIHRoZSBjb21wb25lbnRcXCdzIGNsYXNzSWQgKGNpZCwgaS5lLiB0aGUgdHlwZSBmaWVsZCBmcm9tIGdldF9hbGwpLCBub3QgdGhlIHNjcmlwdCBuYW1lIG9yIGNsYXNzIG5hbWUuIFVzZSBnZXRfYWxsIHRvIGdldCB0aGUgY29ycmVjdCBjaWQuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcmlwdFBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjcmlwdCBhc3NldCBwYXRoICh1c2VkIGJ5IFwiYXR0YWNoX3NjcmlwdFwiIGFjdGlvbikuIGUuZy4sIGRiOi8vYXNzZXRzL3NjcmlwdHMvTXlTY3JpcHQudHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29tcG9uZW50X3F1ZXJ5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGNvbXBvbmVudCBpbmZvcm1hdGlvbjogZ2V0IGFsbCBjb21wb25lbnRzIG9uIGEgbm9kZSwgZ2V0IHNwZWNpZmljIGNvbXBvbmVudCBpbmZvLCBvciBsaXN0IGF2YWlsYWJsZSBjb21wb25lbnQgdHlwZXMuIEF2YWlsYWJsZSBhY3Rpb25zOiBnZXRfYWxsLCBnZXRfaW5mbywgZ2V0X2F2YWlsYWJsZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfYWxsJywgJ2dldF9pbmZvJywgJ2dldF9hdmFpbGFibGUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgKHJlcXVpcmVkIGZvciBcImdldF9hbGxcIiBhbmQgXCJnZXRfaW5mb1wiIGFjdGlvbnMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIHRvIGdldCBpbmZvIGZvciAocmVxdWlyZWQgZm9yIFwiZ2V0X2luZm9cIiBhY3Rpb24pJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2F0ZWdvcnkgZmlsdGVyICh1c2VkIGJ5IFwiZ2V0X2F2YWlsYWJsZVwiIGFjdGlvbiknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3JlbmRlcmVyJywgJ3VpJywgJ3BoeXNpY3MnLCAnYW5pbWF0aW9uJywgJ2F1ZGlvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldCBjb21wb25lbnQgcHJvcGVydHkgdmFsdWVzIGZvciBVSSBjb21wb25lbnRzIG9yIGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cy4gU3VwcG9ydHMgc2V0dGluZyBwcm9wZXJ0aWVzIG9mIGJ1aWx0LWluIFVJIGNvbXBvbmVudHMgKGUuZy4sIGNjLkxhYmVsLCBjYy5TcHJpdGUpIGFuZCBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMuIE5vdGU6IEZvciBub2RlIGJhc2ljIHByb3BlcnRpZXMgKG5hbWUsIGFjdGl2ZSwgbGF5ZXIsIGV0Yy4pLCB1c2Ugc2V0X25vZGVfcHJvcGVydHkuIEZvciBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIChwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlLCBldGMuKSwgdXNlIHNldF9ub2RlX3RyYW5zZm9ybS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCAtIE11c3Qgc3BlY2lmeSB0aGUgbm9kZSB0byBvcGVyYXRlIG9uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIC0gQ2FuIGJlIGJ1aWx0LWluIGNvbXBvbmVudHMgKGUuZy4sIGNjLkxhYmVsKSBvciBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMgKGUuZy4sIE15U2NyaXB0KS4gSWYgdW5zdXJlIGFib3V0IGNvbXBvbmVudCB0eXBlLCB1c2UgZ2V0X2NvbXBvbmVudHMgZmlyc3QgdG8gcmV0cmlldmUgYWxsIGNvbXBvbmVudHMgb24gdGhlIG5vZGUuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZW51bSByZXN0cmljdGlvbiwgYWxsb3cgYW55IGNvbXBvbmVudCB0eXBlIGluY2x1ZGluZyBjdXN0b20gc2NyaXB0c1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIHRvIHNldC4gSWYgdW5zdXJlLCB1c2UgY29tcG9uZW50X3F1ZXJ5IGdldF9pbmZvIGZpcnN0IHRvIGxpc3QgYWN0dWFsIHByb3BlcnRpZXMuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YSB0eXBlIG9mIHRoZSB2YWx1ZSwgbXVzdCBtYXRjaCBwcm9wZXJ0eVR5cGUtPnZhbHVlIGZvcm1hdCBiZWxvdy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3N0cmluZycsICdudW1iZXInLCAnYm9vbGVhbicsICdpbnRlZ2VyJywgJ2Zsb2F0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yJywgJ3ZlYzInLCAndmVjMycsICdzaXplJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGUnLCAnY29tcG9uZW50JywgJ3Nwcml0ZUZyYW1lJywgJ3ByZWZhYicsICdhc3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlQXJyYXknLCAnY29sb3JBcnJheScsICdudW1iZXJBcnJheScsICdzdHJpbmdBcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldEFycmF5JywgJ3Nwcml0ZUZyYW1lQXJyYXknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbmVPZjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYm9vbGVhbicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnb2JqZWN0JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdhcnJheScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnbnVsbCcgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGb3JtYXQgcGVyIHByb3BlcnR5VHlwZTogc3RyaW5nL251bWJlci9ib29sZWFuIGxpdGVyYWwgYXMtaXMuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29sb3I6IHtyLGcsYixhfSAwLTI1NSBvciBcIiNGRjAwMDBcIi4gdmVjMjoge3gseX0uIHZlYzM6IHt4LHksen0uIHNpemU6IHt3aWR0aCxoZWlnaHR9LiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ25vZGUvc3ByaXRlRnJhbWUvcHJlZmFiL2Fzc2V0OiB0YXJnZXQgVVVJRCBzdHJpbmcgKGdldF9hbGxfbm9kZXMvYXNzZXQgYnJvd3NlciB0byBmaW5kIGl0KS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb21wb25lbnQ6IFVVSUQgb2YgdGhlIE5PREUgaG9sZGluZyB0aGUgdGFyZ2V0IGNvbXBvbmVudCAodHlwZSBhdXRvLWRldGVjdGVkIGZyb20gcHJvcGVydHkgbWV0YWRhdGEsIHJlc29sdmVkIHRvIGl0cyBzY2VuZSBfX2lkX18pLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJypBcnJheSB2YXJpYW50czogSlNPTiBhcnJheSBvZiB0aGUgYWJvdmUgKGUuZy4gbnVtYmVyQXJyYXk6IFsxLDIsM10sIG5vZGVBcnJheTogW1widXVpZDFcIixcInV1aWQyXCJdKS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnLCAncHJvcGVydHknLCAncHJvcGVydHlUeXBlJywgJ3ZhbHVlJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FwcGx5IHJlc3BvbnNpdmUgVUkgZGVmYXVsdHMgb24gYSBub2RlIGJ5IGVuc3VyaW5nIFVJVHJhbnNmb3JtL1dpZGdldC9MYXlvdXQgYXJlIGNvbmZpZ3VyZWQgY29uc2lzdGVudGx5LiBQcmVzZXRzOiBmdWxsX3N0cmV0Y2gsIHRvcF9iYXIsIGJvdHRvbV9iYXIsIHZlcnRpY2FsX2xpc3QsIGhvcml6b250YWxfbGlzdC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2Z1bGxfc3RyZXRjaCcsICd0b3BfYmFyJywgJ2JvdHRvbV9iYXInLCAndmVydGljYWxfbGlzdCcsICdob3Jpem9udGFsX2xpc3QnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZnVsbF9zdHJldGNoJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc3BvbnNpdmUgcHJlc2V0IHRvIGFwcGx5J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkxlZnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWFyZ2luVG9wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmdpbkJvdHRvbToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjaW5nWDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzcGFjaW5nWToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudF9tYW5hZ2UnOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2F0dGFjaF9zY3JpcHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXR0YWNoU2NyaXB0KGFyZ3Mubm9kZVV1aWQsIGFyZ3Muc2NyaXB0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FjdGlvbn0nIGZvciBjb21wb25lbnRfbWFuYWdlLiBWYWxpZCBhY3Rpb25zOiBhZGQsIHJlbW92ZSwgYXR0YWNoX3NjcmlwdGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudF9xdWVyeSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfYWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8oYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2F2YWlsYWJsZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBdmFpbGFibGVDb21wb25lbnRzKGFyZ3MuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiAnJHthY3Rpb259JyBmb3IgY29tcG9uZW50X3F1ZXJ5LiBWYWxpZCBhY3Rpb25zOiBnZXRfYWxsLCBnZXRfaW5mbywgZ2V0X2F2YWlsYWJsZWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3NldF9jb21wb25lbnRfcHJvcGVydHknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldENvbXBvbmVudFByb3BlcnR5KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXBwbHlSZXNwb25zaXZlRGVmYXVsdHMoYXJncyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVJlc3BvbnNpdmVEZWZhdWx0cyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBub2RlVXVpZCA9IFN0cmluZyhhcmdzPy5ub2RlVXVpZCB8fCAnJyk7XG4gICAgICAgIGNvbnN0IHByZXNldCA9IFN0cmluZyhhcmdzPy5wcmVzZXQgfHwgJ2Z1bGxfc3RyZXRjaCcpO1xuICAgICAgICBpZiAoIW5vZGVVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogbm9kZVV1aWQnIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtYXJnaW5MZWZ0ID0gTnVtYmVyKGFyZ3M/Lm1hcmdpbkxlZnQgPz8gMCk7XG4gICAgICAgIGNvbnN0IG1hcmdpblJpZ2h0ID0gTnVtYmVyKGFyZ3M/Lm1hcmdpblJpZ2h0ID8/IDApO1xuICAgICAgICBjb25zdCBtYXJnaW5Ub3AgPSBOdW1iZXIoYXJncz8ubWFyZ2luVG9wID8/IDApO1xuICAgICAgICBjb25zdCBtYXJnaW5Cb3R0b20gPSBOdW1iZXIoYXJncz8ubWFyZ2luQm90dG9tID8/IDApO1xuICAgICAgICBjb25zdCBzcGFjaW5nWCA9IE51bWJlcihhcmdzPy5zcGFjaW5nWCA/PyAwKTtcbiAgICAgICAgY29uc3Qgc3BhY2luZ1kgPSBOdW1iZXIoYXJncz8uc3BhY2luZ1kgPz8gMCk7XG5cbiAgICAgICAgY29uc3QgYXBwbGllZDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZVJlc3VsdCA9IGF3YWl0IHRoaXMuYWRkQ29tcG9uZW50KG5vZGVVdWlkLCAnY2MuVUlUcmFuc2Zvcm0nKTtcbiAgICAgICAgICAgIGlmICghZW5zdXJlUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVuc3VyZVJlc3VsdC5lcnJvciB8fCAnRmFpbGVkIHRvIGVuc3VyZSBjYy5VSVRyYW5zZm9ybSBjb21wb25lbnQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYXBwbHlDb21wb25lbnRQcm9wZXJ0eU9yVGhyb3cobm9kZVV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdhbmNob3JQb2ludCcsICd2ZWMyJywgdGhpcy5nZXRBbmNob3JCeVByZXNldChwcmVzZXQpKTtcbiAgICAgICAgICAgIGFwcGxpZWQucHVzaCgnY2MuVUlUcmFuc2Zvcm0uYW5jaG9yUG9pbnQnKTtcblxuICAgICAgICAgICAgYXdhaXQgdGhpcy5lbnN1cmVXaWRnZXQobm9kZVV1aWQpO1xuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0Q29uZmlnID0gdGhpcy5nZXRXaWRnZXRDb25maWdCeVByZXNldChwcmVzZXQpO1xuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0UHJvcHMgPSBbXG4gICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ2lzQWxpZ25MZWZ0JywgcHJvcGVydHlUeXBlOiAnYm9vbGVhbicsIHZhbHVlOiB3aWRnZXRDb25maWcuaXNBbGlnbkxlZnQgfSxcbiAgICAgICAgICAgICAgICB7IHByb3BlcnR5OiAnaXNBbGlnblJpZ2h0JywgcHJvcGVydHlUeXBlOiAnYm9vbGVhbicsIHZhbHVlOiB3aWRnZXRDb25maWcuaXNBbGlnblJpZ2h0IH0sXG4gICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ2lzQWxpZ25Ub3AnLCBwcm9wZXJ0eVR5cGU6ICdib29sZWFuJywgdmFsdWU6IHdpZGdldENvbmZpZy5pc0FsaWduVG9wIH0sXG4gICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ2lzQWxpZ25Cb3R0b20nLCBwcm9wZXJ0eVR5cGU6ICdib29sZWFuJywgdmFsdWU6IHdpZGdldENvbmZpZy5pc0FsaWduQm90dG9tIH0sXG4gICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ2xlZnQnLCBwcm9wZXJ0eVR5cGU6ICdudW1iZXInLCB2YWx1ZTogbWFyZ2luTGVmdCB9LFxuICAgICAgICAgICAgICAgIHsgcHJvcGVydHk6ICdyaWdodCcsIHByb3BlcnR5VHlwZTogJ251bWJlcicsIHZhbHVlOiBtYXJnaW5SaWdodCB9LFxuICAgICAgICAgICAgICAgIHsgcHJvcGVydHk6ICd0b3AnLCBwcm9wZXJ0eVR5cGU6ICdudW1iZXInLCB2YWx1ZTogbWFyZ2luVG9wIH0sXG4gICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ2JvdHRvbScsIHByb3BlcnR5VHlwZTogJ251bWJlcicsIHZhbHVlOiBtYXJnaW5Cb3R0b20gfVxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB3aWRnZXRQcm9wcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuc2V0Q29tcG9uZW50UHJvcGVydHkoe1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLldpZGdldCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBpdGVtLnByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IGl0ZW0ucHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgd2FybmluZ3MucHVzaChgY2MuV2lkZ2V0LiR7aXRlbS5wcm9wZXJ0eX06ICR7cmVzdWx0LmVycm9yIHx8ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goYGNjLldpZGdldC4ke2l0ZW0ucHJvcGVydHl9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJlc2V0ID09PSAndmVydGljYWxfbGlzdCcgfHwgcHJlc2V0ID09PSAnaG9yaXpvbnRhbF9saXN0Jykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZW5zdXJlTGF5b3V0KG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXlvdXRUeXBlID0gcHJlc2V0ID09PSAndmVydGljYWxfbGlzdCcgPyAyIDogMTtcbiAgICAgICAgICAgICAgICBjb25zdCBsYXlvdXRQcm9wcyA9IFtcbiAgICAgICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ3R5cGUnLCBwcm9wZXJ0eVR5cGU6ICdpbnRlZ2VyJywgdmFsdWU6IGxheW91dFR5cGUgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ3Jlc2l6ZU1vZGUnLCBwcm9wZXJ0eVR5cGU6ICdpbnRlZ2VyJywgdmFsdWU6IDIgfSxcbiAgICAgICAgICAgICAgICAgICAgeyBwcm9wZXJ0eTogJ3NwYWNpbmdYJywgcHJvcGVydHlUeXBlOiAnbnVtYmVyJywgdmFsdWU6IHNwYWNpbmdYIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgcHJvcGVydHk6ICdzcGFjaW5nWScsIHByb3BlcnR5VHlwZTogJ251bWJlcicsIHZhbHVlOiBzcGFjaW5nWSB9XG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgbGF5b3V0UHJvcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5zZXRDb21wb25lbnRQcm9wZXJ0eSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5MYXlvdXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IGl0ZW0ucHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IGl0ZW0ucHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm5pbmdzLnB1c2goYGNjLkxheW91dC4ke2l0ZW0ucHJvcGVydHl9OiAke3Jlc3VsdC5lcnJvciB8fCAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goYGNjLkxheW91dC4ke2l0ZW0ucHJvcGVydHl9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2Vzczogd2FybmluZ3MubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBcHBsaWVkIHJlc3BvbnNpdmUgcHJlc2V0ICcke3ByZXNldH0nYCxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB3YXJuaW5ncy5sZW5ndGggPiAwID8gd2FybmluZ3Muam9pbignXFxuJykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcHJlc2V0LFxuICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLFxuICAgICAgICAgICAgICAgICAgICB3YXJuaW5nQ291bnQ6IHdhcm5pbmdzLmxlbmd0aFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IGBGYWlsZWQgdG8gYXBwbHkgcmVzcG9uc2l2ZSBwcmVzZXQgJyR7cHJlc2V0fSdgXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnN1cmVXaWRnZXQobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChub2RlVXVpZCwgJ2NjLldpZGdldCcpO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gZW5zdXJlIGNjLldpZGdldCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbnN1cmVMYXlvdXQobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChub2RlVXVpZCwgJ2NjLkxheW91dCcpO1xuICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IocmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gZW5zdXJlIGNjLkxheW91dCcpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseUNvbXBvbmVudFByb3BlcnR5T3JUaHJvdyhcbiAgICAgICAgbm9kZVV1aWQ6IHN0cmluZyxcbiAgICAgICAgY29tcG9uZW50VHlwZTogc3RyaW5nLFxuICAgICAgICBwcm9wZXJ0eTogc3RyaW5nLFxuICAgICAgICBwcm9wZXJ0eVR5cGU6IHN0cmluZyxcbiAgICAgICAgdmFsdWU6IGFueVxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnNldENvbXBvbmVudFByb3BlcnR5KHtcbiAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgdmFsdWVcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihyZXN1bHQuZXJyb3IgfHwgYEZhaWxlZCB0byBzZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRBbmNob3JCeVByZXNldChwcmVzZXQ6IHN0cmluZyk6IHsgeDogbnVtYmVyOyB5OiBudW1iZXIgfSB7XG4gICAgICAgIHN3aXRjaCAocHJlc2V0KSB7XG4gICAgICAgICAgICBjYXNlICd0b3BfYmFyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4geyB4OiAwLjUsIHk6IDEgfTtcbiAgICAgICAgICAgIGNhc2UgJ2JvdHRvbV9iYXInOlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHg6IDAuNSwgeTogMCB9O1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyB4OiAwLjUsIHk6IDAuNSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRXaWRnZXRDb25maWdCeVByZXNldChwcmVzZXQ6IHN0cmluZyk6IHsgaXNBbGlnbkxlZnQ6IGJvb2xlYW47IGlzQWxpZ25SaWdodDogYm9vbGVhbjsgaXNBbGlnblRvcDogYm9vbGVhbjsgaXNBbGlnbkJvdHRvbTogYm9vbGVhbiB9IHtcbiAgICAgICAgc3dpdGNoIChwcmVzZXQpIHtcbiAgICAgICAgICAgIGNhc2UgJ3RvcF9iYXInOlxuICAgICAgICAgICAgICAgIHJldHVybiB7IGlzQWxpZ25MZWZ0OiB0cnVlLCBpc0FsaWduUmlnaHQ6IHRydWUsIGlzQWxpZ25Ub3A6IHRydWUsIGlzQWxpZ25Cb3R0b206IGZhbHNlIH07XG4gICAgICAgICAgICBjYXNlICdib3R0b21fYmFyJzpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBpc0FsaWduTGVmdDogdHJ1ZSwgaXNBbGlnblJpZ2h0OiB0cnVlLCBpc0FsaWduVG9wOiBmYWxzZSwgaXNBbGlnbkJvdHRvbTogdHJ1ZSB9O1xuICAgICAgICAgICAgY2FzZSAndmVydGljYWxfbGlzdCc6XG4gICAgICAgICAgICBjYXNlICdob3Jpem9udGFsX2xpc3QnOlxuICAgICAgICAgICAgY2FzZSAnZnVsbF9zdHJldGNoJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgaXNBbGlnbkxlZnQ6IHRydWUsIGlzQWxpZ25SaWdodDogdHJ1ZSwgaXNBbGlnblRvcDogdHJ1ZSwgaXNBbGlnbkJvdHRvbTogdHJ1ZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTWF0Y2ggYSBjb21wb25lbnQgYnkgaXRzIHJlZ2lzdGVyZWQgdHlwZSAoY2lkIG9yIGJ1aWx0LWluIGNsYXNzIG5hbWUgbGlrZSBcImNjLlNwcml0ZVwiKSBPUlxuICAgICAqIGJ5IGEgc2NyaXB0IGNsYXNzIG5hbWUgYXBwZWFyaW5nIGFzIGA8Q2xhc3NOYW1lPmAgaW4gdGhlIGNvbXBvbmVudCdzIGluc3RhbmNlIG5hbWUuIFN1cHBvcnRzXG4gICAgICogYm90aCBzaGFwZXMgc2VlbiBhY3Jvc3MgdGhlIGNvZGViYXNlOiBleHRyYWN0ZWQgKGZyb20gZ2V0Q29tcG9uZW50cykgYW5kIHJhdyAoZnJvbSBxdWVyeS1ub2RlKS5cbiAgICAgKi9cbiAgICBwcml2YXRlIHN0YXRpYyBjb21wb25lbnRNYXRjaGVzKGNvbXA6IGFueSwgY29tcG9uZW50VHlwZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IHQgPSBjb21wPy50eXBlID8/IGNvbXA/Ll9fdHlwZV9fID8/IGNvbXA/LmNpZDtcbiAgICAgICAgaWYgKHQgPT09IGNvbXBvbmVudFR5cGUpIHJldHVybiB0cnVlO1xuICAgICAgICBjb25zdCBpbnN0YW5jZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9XG4gICAgICAgICAgICBjb21wPy5wcm9wZXJ0aWVzPy5uYW1lPy52YWx1ZSA/PyBjb21wPy52YWx1ZT8ubmFtZT8udmFsdWUgPz8gY29tcD8ubmFtZT8udmFsdWU7XG4gICAgICAgIHJldHVybiB0eXBlb2YgaW5zdGFuY2VOYW1lID09PSAnc3RyaW5nJyAmJiBpbnN0YW5jZU5hbWUuZW5kc1dpdGgoYDwke2NvbXBvbmVudFR5cGV9PmApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYWRkQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBjb21wb25lbnQgYWxyZWFkeSBleGlzdHMgb24gdGhlIG5vZGVcbiAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0NvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IENvbXBvbmVudFRvb2xzLmNvbXBvbmVudE1hdGNoZXMoY29tcCwgY29tcG9uZW50VHlwZSkpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRWZXJpZmllZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIFRyeSBhZGRpbmcgY29tcG9uZW50IGRpcmVjdGx5IHVzaW5nIEVkaXRvciBBUElcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFdhaXQgZm9yIEVkaXRvciB0byBjb21wbGV0ZSBjb21wb25lbnQgYWRkaXRpb25cbiAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTtcbiAgICAgICAgICAgIC8vIFJlLXF1ZXJ5IG5vZGUgaW5mbyB0byB2ZXJpZnkgY29tcG9uZW50IHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbzIgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChhbGxDb21wb25lbnRzSW5mbzIuc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mbzIuZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZENvbXBvbmVudCA9IGFsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGVkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgYWRkZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VmVyaWZpZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IGZvdW5kIG9uIG5vZGUgYWZ0ZXIgYWRkaXRpb24uIEF2YWlsYWJsZSBjb21wb25lbnRzOiAke2FsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+IGMudHlwZSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IGNvbXBvbmVudCBhZGRpdGlvbjogJHthbGxDb21wb25lbnRzSW5mbzIuZXJyb3IgfHwgJ1VuYWJsZSB0byBnZXQgbm9kZSBjb21wb25lbnRzJ31gXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAodmVyaWZ5RXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byB2ZXJpZnkgY29tcG9uZW50IGFkZGl0aW9uOiAke3ZlcmlmeUVycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogdXNlIHNjZW5lIHNjcmlwdFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnYWRkQ29tcG9uZW50VG9Ob2RlJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgYXMgVG9vbFJlc3BvbnNlO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyMjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyAxLiBGaW5kIGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlXG4gICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKCFhbGxDb21wb25lbnRzSW5mby5zdWNjZXNzIHx8ICFhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gZ2V0IGNvbXBvbmVudHMgZm9yIG5vZGUgJyR7bm9kZVV1aWR9JzogJHthbGxDb21wb25lbnRzSW5mby5lcnJvcn1gIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gMi4gRmluZCB0aGUgY29tcG9uZW50IGluc3RhbmNlIOKAlCBtYXRjaCBieSBjaWQgT1Igc2NyaXB0IGNsYXNzIG5hbWUgKHZpYSBpbnN0YW5jZSBuYW1lIHN1ZmZpeCkuXG4gICAgICAgIGNvbnN0IG1hdGNoZWQgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcbiAgICAgICAgaWYgKCFtYXRjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlICcke25vZGVVdWlkfScuIFBhc3MgZWl0aGVyIHRoZSByZWdpc3RlcmVkIGNpZCAoZnJvbSBnZXRfYWxsKSBvciB0aGUgc2NyaXB0IGNsYXNzIG5hbWUuYCB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudEluc3RhbmNlVXVpZDogc3RyaW5nIHwgbnVsbCA9IG1hdGNoZWQudXVpZDtcbiAgICAgICAgaWYgKCFjb21wb25lbnRJbnN0YW5jZVV1aWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIG9uIG5vZGUgJyR7bm9kZVV1aWR9JyBoYXMgbm8gaW5zdGFuY2UgdXVpZDsgY2Fubm90IHJlbW92ZS5gIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gMy4gUmVtb3ZlIHZpYSBvZmZpY2lhbCBBUEkuIFJlbW92ZUNvbXBvbmVudE9wdGlvbnMudXVpZCBpcyB0aGUgQ09NUE9ORU5UIGluc3RhbmNlIHV1aWQsIG5vdCB0aGUgbm9kZSB1dWlkLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLWNvbXBvbmVudCcsIHtcbiAgICAgICAgICAgICAgICB1dWlkOiBjb21wb25lbnRJbnN0YW5jZVV1aWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gNC4gUXVlcnkgYWdhaW4gdG8gY29uZmlybSByZW1vdmFsXG4gICAgICAgICAgICBjb25zdCBhZnRlclJlbW92ZUluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICAgICAgY29uc3Qgc3RpbGxFeGlzdHMgPSBhZnRlclJlbW92ZUluZm8uc3VjY2VzcyAmJiBhZnRlclJlbW92ZUluZm8uZGF0YT8uY29tcG9uZW50cz8uc29tZSgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcbiAgICAgICAgICAgIGlmIChzdGlsbEV4aXN0cykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCBjaWQgJyR7Y29tcG9uZW50VHlwZX0nIHdhcyBub3QgcmVtb3ZlZCBmcm9tIG5vZGUgJyR7bm9kZVV1aWR9Jy5gIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyByZW1vdmVkIHN1Y2Nlc3NmdWxseSBmcm9tIG5vZGUgJyR7bm9kZVV1aWR9J2AsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gcmVtb3ZlIGNvbXBvbmVudDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldENvbXBvbmVudHMobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIFRyeSBxdWVyeWluZyBub2RlIGluZm8gZGlyZWN0bHkgdXNpbmcgRWRpdG9yIEFQSSBmaXJzdFxuICAgICAgICBsZXQgbm9kZURhdGE6IGFueTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGVEYXRhICYmIG5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICB0eXBlOiBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgLy8gcXVlcnktbm9kZSBuZXN0cyBpbnN0YW5jZSB1dWlkIGF0IGNvbXAudmFsdWUudXVpZC52YWx1ZTsga2VlcCBvbGRlciBzaGFwZXMgYXMgZmFsbGJhY2suXG4gICAgICAgICAgICAgICAgdXVpZDogY29tcC52YWx1ZT8udXVpZD8udmFsdWUgfHwgY29tcC51dWlkPy52YWx1ZSB8fCBjb21wLnV1aWQgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWUsXG4gICAgICAgICAgICAgICAgcHJvcGVydGllczogdGhpcy5leHRyYWN0Q29tcG9uZW50UHJvcGVydGllcyhjb21wKVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIFRyeSBxdWVyeWluZyBub2RlIGluZm8gZGlyZWN0bHkgdXNpbmcgRWRpdG9yIEFQSSBmaXJzdFxuICAgICAgICBsZXQgbm9kZURhdGE6IGFueTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcyAmJiByZXN1bHQuZGF0YS5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IHJlc3VsdC5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5jb21wb25lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICdGYWlsZWQgdG8gZ2V0IGNvbXBvbmVudCBpbmZvJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGVEYXRhICYmIG5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZURhdGEuX19jb21wc19fLmZpbmQoKGNvbXA6IGFueSkgPT4gQ29tcG9uZW50VG9vbHMuY29tcG9uZW50TWF0Y2hlcyhjb21wLCBjb21wb25lbnRUeXBlKSk7XG5cbiAgICAgICAgICAgIGlmIChjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcG9uZW50LmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXBvbmVudC5lbmFibGVkIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRoaXMuZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kIG9yIG5vIGNvbXBvbmVudHMgZGF0YScgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50OiBhbnkpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFtleHRyYWN0Q29tcG9uZW50UHJvcGVydGllc10gUHJvY2Vzc2luZyBjb21wb25lbnQ6ICR7SlNPTi5zdHJpbmdpZnkoT2JqZWN0LmtleXMoY29tcG9uZW50KSl9YCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgY29tcG9uZW50IGhhcyB2YWx1ZSBwcm9wZXJ0eSwgd2hpY2ggdXN1YWxseSBjb250YWlucyB0aGUgYWN0dWFsIGNvbXBvbmVudCBwcm9wZXJ0aWVzXG4gICAgICAgIGlmIChjb21wb25lbnQudmFsdWUgJiYgdHlwZW9mIGNvbXBvbmVudC52YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIEZvdW5kIGNvbXBvbmVudC52YWx1ZSB3aXRoIHByb3BlcnRpZXM6ICR7SlNPTi5zdHJpbmdpZnkoT2JqZWN0LmtleXMoY29tcG9uZW50LnZhbHVlKSl9YCk7XG4gICAgICAgICAgICByZXR1cm4gY29tcG9uZW50LnZhbHVlOyAvLyBSZXR1cm4gdmFsdWUgb2JqZWN0IGRpcmVjdGx5LCBpdCBjb250YWlucyBhbGwgY29tcG9uZW50IHByb3BlcnRpZXNcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZhbGxiYWNrOiBleHRyYWN0IHByb3BlcnRpZXMgZGlyZWN0bHkgZnJvbSBjb21wb25lbnQgb2JqZWN0XG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICAgICAgY29uc3QgZXhjbHVkZUtleXMgPSBbJ19fdHlwZV9fJywgJ2VuYWJsZWQnLCAnbm9kZScsICdfaWQnLCAnX19zY3JpcHRBc3NldCcsICd1dWlkJywgJ25hbWUnLCAnX25hbWUnLCAnX29iakZsYWdzJywgJ19lbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZScsICdjaWQnLCAnZWRpdG9yJywgJ2V4dGVuZHMnXTtcblxuICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBjb21wb25lbnQpIHtcbiAgICAgICAgICAgIGlmICghZXhjbHVkZUtleXMuaW5jbHVkZXMoa2V5KSAmJiAha2V5LnN0YXJ0c1dpdGgoJ18nKSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXNdIEZvdW5kIGRpcmVjdCBwcm9wZXJ0eSAnJHtrZXl9JzogJHt0eXBlb2YgY29tcG9uZW50W2tleV19YCk7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1trZXldID0gY29tcG9uZW50W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuaW5mbyhgW2V4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzXSBGaW5hbCBleHRyYWN0ZWQgcHJvcGVydGllczogJHtKU09OLnN0cmluZ2lmeShPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSl9YCk7XG4gICAgICAgIHJldHVybiBwcm9wZXJ0aWVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmluZENvbXBvbmVudFR5cGVCeVV1aWQoY29tcG9uZW50VXVpZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIFNlYXJjaGluZyBmb3IgY29tcG9uZW50IHR5cGUgd2l0aCBVVUlEOiAke2NvbXBvbmVudFV1aWR9YCk7XG4gICAgICAgIGlmICghY29tcG9uZW50VXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAoIW5vZGVUcmVlKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oJ1tmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRmFpbGVkIHRvIHF1ZXJ5IG5vZGUgdHJlZS4nKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcblxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Tm9kZUluZm8gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudE5vZGVJbmZvIHx8ICFjdXJyZW50Tm9kZUluZm8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsTm9kZURhdGEgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgY3VycmVudE5vZGVJbmZvLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnVsbE5vZGVEYXRhICYmIGZ1bGxOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEFueSA9IGNvbXAgYXMgYW55OyAvLyBDYXN0IHRvIGFueSB0byBhY2Nlc3MgZHluYW1pYyBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGNvbXBvbmVudCBVVUlEIGlzIG5lc3RlZCBpbiB0aGUgJ3ZhbHVlJyBwcm9wZXJ0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wQW55LnV1aWQgJiYgY29tcEFueS51dWlkLnZhbHVlID09PSBjb21wb25lbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFR5cGUgPSBjb21wQW55Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBGb3VuZCBjb21wb25lbnQgdHlwZSAnJHtjb21wb25lbnRUeXBlfScgZm9yIFVVSUQgJHtjb21wb25lbnRVdWlkfSBvbiBub2RlICR7ZnVsbE5vZGVEYXRhLm5hbWU/LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIENvdWxkIG5vdCBxdWVyeSBub2RlICR7Y3VycmVudE5vZGVJbmZvLnV1aWR9OiAkeyhlIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGUpfWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Tm9kZUluZm8uY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjdXJyZW50Tm9kZUluZm8uY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsb2dnZXIud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb21wb25lbnQgd2l0aCBVVUlEICR7Y29tcG9uZW50VXVpZH0gbm90IGZvdW5kIGluIHNjZW5lIHRyZWUuYCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBFcnJvciB3aGlsZSBzZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOiAkeyhlcnJvciBhcyBhbnkpPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0Q29tcG9uZW50UHJvcGVydHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fSAodHlwZTogJHtwcm9wZXJ0eVR5cGV9KSA9ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSBvbiBub2RlICR7bm9kZVV1aWR9YCk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMDogRGV0ZWN0IGlmIHRoaXMgaXMgYSBub2RlIHByb3BlcnR5LCByZWRpcmVjdCB0byBjb3JyZXNwb25kaW5nIG5vZGUgbWV0aG9kIGlmIHNvXG4gICAgICAgICAgICBjb25zdCBub2RlUmVkaXJlY3RSZXN1bHQgPSBhd2FpdCB0aGlzLmNoZWNrQW5kUmVkaXJlY3ROb2RlUHJvcGVydGllcyhhcmdzKTtcbiAgICAgICAgICAgIGlmIChub2RlUmVkaXJlY3RSZXN1bHQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZVJlZGlyZWN0UmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEdldCBjb21wb25lbnQgaW5mbyB1c2luZyB0aGUgc2FtZSBtZXRob2QgYXMgZ2V0Q29tcG9uZW50c1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50c1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50c1Jlc3BvbnNlLnN1Y2Nlc3MgfHwgIWNvbXBvbmVudHNSZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7Y29tcG9uZW50c1Jlc3BvbnNlLmVycm9yfWAsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBgUGxlYXNlIHZlcmlmeSB0aGF0IG5vZGUgVVVJRCAnJHtub2RlVXVpZH0nIGlzIGNvcnJlY3QuIFVzZSBnZXRfYWxsX25vZGVzIG9yIGZpbmRfbm9kZV9ieV9uYW1lIHRvIGdldCB0aGUgY29ycmVjdCBub2RlIFVVSUQuYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHMgPSBjb21wb25lbnRzUmVzcG9uc2UuZGF0YS5jb21wb25lbnRzO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDI6IEZpbmQgdGFyZ2V0IGNvbXBvbmVudFxuICAgICAgICAgICAgLy8gTWF0Y2ggYnkgY2lkIGZpcnN0ICh0aGUgY2Fub25pY2FsIGlkIHN1cmZhY2VkIGFzIGBjb21wLnR5cGVgKS5cbiAgICAgICAgICAgIC8vIEN1c3RvbS1zY3JpcHQgY29tcG9uZW50cyBzdXJmYWNlIGFzIGNpZCAoZS5nLiBcIjFiZDEwRUxDZkJQY1owSTd4cVlGMlJrXCIpLCBzbyBhbHNvXG4gICAgICAgICAgICAvLyBhY2NlcHQgYSBzY3JpcHQgY2xhc3MgbmFtZSBieSBtYXRjaGluZyB0aGUgYDxDbGFzc05hbWU+YCBzdWZmaXggaW4gdGhlIGNvbXBvbmVudCdzXG4gICAgICAgICAgICAvLyBpbnN0YW5jZSBuYW1lIChDb2NvcyBmb3JtYXRzIGl0IGFzIFwiPE5vZGVOYW1lPjxDbGFzc05hbWU+XCIpLlxuICAgICAgICAgICAgbGV0IHRhcmdldENvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzU3VmZml4ID0gYDwke2NvbXBvbmVudFR5cGV9PmA7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsQ29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBhbGxDb21wb25lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGF2YWlsYWJsZVR5cGVzLnB1c2goY29tcC50eXBlKTtcblxuICAgICAgICAgICAgICAgIGlmIChjb21wLnR5cGUgPT09IGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50ID0gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2VOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBjb21wPy5wcm9wZXJ0aWVzPy5uYW1lPy52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGluc3RhbmNlTmFtZSA9PT0gJ3N0cmluZycgJiYgaW5zdGFuY2VOYW1lLmVuZHNXaXRoKGNsYXNzU3VmZml4KSkge1xuICAgICAgICAgICAgICAgICAgICB0YXJnZXRDb21wb25lbnQgPSBjb21wO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJvdmlkZSBtb3JlIGRldGFpbGVkIGVycm9yIGluZm8gYW5kIHN1Z2dlc3Rpb25zXG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlQ29tcG9uZW50U3VnZ2VzdGlvbihjb21wb25lbnRUeXBlLCBhdmFpbGFibGVUeXBlcywgcHJvcGVydHkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGUuIEF2YWlsYWJsZSBjb21wb25lbnRzOiAke2F2YWlsYWJsZVR5cGVzLmpvaW4oJywgJyl9YCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGluc3RydWN0aW9uXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBBdXRvLWRldGVjdCBhbmQgY29udmVydCBwcm9wZXJ0eSB2YWx1ZXNcbiAgICAgICAgICAgIGxldCBwcm9wZXJ0eUluZm87XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIEFuYWx5emluZyBwcm9wZXJ0eTogJHtwcm9wZXJ0eX1gKTtcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eUluZm8gPSB0aGlzLmFuYWx5emVQcm9wZXJ0eSh0YXJnZXRDb21wb25lbnQsIHByb3BlcnR5KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGFuYWx5emVFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIGluIGFuYWx5emVQcm9wZXJ0eTogJHthbmFseXplRXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGFuYWx5emVFcnJvcil9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGFuYWx5emUgcHJvcGVydHkgJyR7cHJvcGVydHl9JzogJHthbmFseXplRXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFwcm9wZXJ0eUluZm8uZXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBub3QgZm91bmQgb24gY29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9Jy4gQXZhaWxhYmxlIHByb3BlcnRpZXM6ICR7cHJvcGVydHlJbmZvLmF2YWlsYWJsZVByb3BlcnRpZXMuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNDogUHJvY2VzcyBwcm9wZXJ0eSB2YWx1ZXMgYW5kIGFwcGx5IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxWYWx1ZSA9IHByb3BlcnR5SW5mby5vcmlnaW5hbFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgLy8gUHJlLWNoZWNrOiBudWxsIG9yaWdpbmFsIHZhbHVlIG1lYW5zIHR5cGUgY2Fubm90IGJlIHJlbGlhYmx5IHZlcmlmaWVkXG4gICAgICAgICAgICAgICAgY29uc3Qgd2FzTnVsbCA9IG9yaWdpbmFsVmFsdWUgPT09IG51bGwgfHwgb3JpZ2luYWxWYWx1ZSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlZmVyZW5jZVR5cGVzID0gWydub2RlJywgJ2NvbXBvbmVudCcsICdzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnLCAnbm9kZUFycmF5JywgJ2Fzc2V0QXJyYXknLCAnc3ByaXRlRnJhbWVBcnJheSddO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUmVmZXJlbmNlVHlwZSA9IHJlZmVyZW5jZVR5cGVzLmluY2x1ZGVzKHByb3BlcnR5VHlwZSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgcHJvY2Vzc2VkVmFsdWU6IGFueTtcblxuICAgICAgICAgICAgICAgIC8vIFByb2Nlc3MgcHJvcGVydHkgdmFsdWVzIGJhc2VkIG9uIGV4cGxpY2l0IHByb3BlcnR5VHlwZVxuICAgICAgICAgICAgICAgIHN3aXRjaCAocHJvcGVydHlUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Zsb2F0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gQm9vbGVhbih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29sb3InOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdHJpbmcgZm9ybWF0OiBzdXBwb3J0cyBoZXgsIGNvbG9yIG5hbWVzLCByZ2IoKS9yZ2JhKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHRoaXMucGFyc2VDb2xvclN0cmluZyh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPYmplY3QgZm9ybWF0OiB2YWxpZGF0ZSBhbmQgY29udmVydCBSR0JBIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiB2YWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb2xvciB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHIsIGcsIGIgcHJvcGVydGllcyBvciBhIGhleGFkZWNpbWFsIHN0cmluZyAoZS5nLiwgXCIjRkYwMDAwXCIpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMic6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHZhbHVlLnkpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZlYzIgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB4LCB5IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2ZWMzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcih2YWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIodmFsdWUueSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKHZhbHVlLnopIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZlYzMgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB4LCB5LCB6IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzaXplJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIodmFsdWUud2lkdGgpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU2l6ZSB2YWx1ZSBtdXN0IGJlIGFuIG9iamVjdCB3aXRoIHdpZHRoLCBoZWlnaHQgcHJvcGVydGllcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHJlZmVyZW5jZSB2YWx1ZSBtdXN0IGJlIGEgc3RyaW5nIFVVSUQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb21wb25lbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wb25lbnQgcmVmZXJlbmNlcyBuZWVkIHNwZWNpYWwgaGFuZGxpbmc6IGZpbmQgY29tcG9uZW50IF9faWRfXyB2aWEgbm9kZSBVVUlEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZTsgLy8gU2F2ZSBub2RlIFVVSUQgZmlyc3QsIHdpbGwgYmUgY29udmVydGVkIHRvIF9faWRfXyBsYXRlclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCByZWZlcmVuY2UgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyAobm9kZSBVVUlEIGNvbnRhaW5pbmcgdGhlIHRhcmdldCBjb21wb25lbnQpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3ByaXRlRnJhbWUnOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc3ByaXRlRnJhbWUgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLWNvbnZlcnQgVGV4dHVyZTJEIFVVSUQg4oaSIFNwcml0ZUZyYW1lIFVVSURcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNmUmVzdWx0ID0gYXdhaXQgcmVzb2x2ZVNwcml0ZUZyYW1lVXVpZCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2ZSZXN1bHQuY29udmVydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gQXV0by1jb252ZXJ0ZWQgVGV4dHVyZTJEIFVVSUQgdG8gU3ByaXRlRnJhbWU6ICR7dmFsdWV9IOKGkiAke3NmUmVzdWx0LnV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogc2ZSZXN1bHQudXVpZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncHJlZmFiJzpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXNzZXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHsgdXVpZDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3Byb3BlcnR5VHlwZX0gdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbm9kZUFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogaXRlbSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vZGVBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29sb3JBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUsIGE6IDI1NSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3JBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gTnVtYmVyKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOdW1iZXJBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gU3RyaW5nKGl0ZW0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTdHJpbmdBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYXNzZXRBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGl0ZW0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcgJiYgaXRlbSAhPT0gbnVsbCAmJiAndXVpZCcgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZDogaXRlbS51dWlkIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2V0QXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMgb3Igb2JqZWN0cyB3aXRoIHV1aWQgcHJvcGVydHknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Fzc2V0QXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXVpZCA9IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyA/IGl0ZW0gOiAoaXRlbSAmJiBpdGVtLnV1aWQgPyBpdGVtLnV1aWQgOiBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF1dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nwcml0ZUZyYW1lQXJyYXkgaXRlbXMgbXVzdCBiZSBzdHJpbmcgVVVJRHMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZlJlc3VsdCA9IGF3YWl0IHJlc29sdmVTcHJpdGVGcmFtZVV1aWQodXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZlJlc3VsdC5jb252ZXJ0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIEF1dG8tY29udmVydGVkIFRleHR1cmUyRCBVVUlEIHRvIFNwcml0ZUZyYW1lOiAke3V1aWR9IOKGkiAke3NmUmVzdWx0LnV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHByb2Nlc3NlZFZhbHVlIGFzIGFueVtdKS5wdXNoKHsgdXVpZDogc2ZSZXN1bHQudXVpZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3ByaXRlRnJhbWVBcnJheSB2YWx1ZSBtdXN0IGJlIGFuIGFycmF5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgcHJvcGVydHkgdHlwZTogJHtwcm9wZXJ0eVR5cGV9YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gQ29udmVydGluZyB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9IC0+ICR7SlNPTi5zdHJpbmdpZnkocHJvY2Vzc2VkVmFsdWUpfSAodHlwZTogJHtwcm9wZXJ0eVR5cGV9KWApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFByb3BlcnR5IGFuYWx5c2lzIHJlc3VsdDogcHJvcGVydHlJbmZvLnR5cGU9XCIke3Byb3BlcnR5SW5mby50eXBlfVwiLCBwcm9wZXJ0eVR5cGU9XCIke3Byb3BlcnR5VHlwZX1cImApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFdpbGwgdXNlIGNvbG9yIHNwZWNpYWwgaGFuZGxpbmc6ICR7cHJvcGVydHlUeXBlID09PSAnY29sb3InICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCd9YCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBY3R1YWwgZXhwZWN0ZWQgdmFsdWUgZm9yIHZlcmlmaWNhdGlvbiAobmVlZHMgc3BlY2lhbCBoYW5kbGluZyBmb3IgY29tcG9uZW50IHJlZmVyZW5jZXMpXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbEV4cGVjdGVkVmFsdWUgPSBwcm9jZXNzZWRWYWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNWE6IFZhbGlkYXRlIHJlZmVyZW5jZSBVVUlEcyBleGlzdCBiZWZvcmUgc2V0dGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0UmVmVHlwZXMgPSBbJ3Nwcml0ZUZyYW1lJywgJ3ByZWZhYicsICdhc3NldCddO1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0QXJyYXlUeXBlcyA9IFsnYXNzZXRBcnJheScsICdzcHJpdGVGcmFtZUFycmF5J107XG4gICAgICAgICAgICAgICAgaWYgKGFzc2V0UmVmVHlwZXMuaW5jbHVkZXMocHJvcGVydHlUeXBlKSAmJiBwcm9jZXNzZWRWYWx1ZT8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaXNzaW5nID0gYXdhaXQgdGhpcy52YWxpZGF0ZVJlZmVyZW5jZVV1aWRzKFtwcm9jZXNzZWRWYWx1ZS51dWlkXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IFVVSUQgJyR7bWlzc2luZ1swXX0nIGRvZXMgbm90IGV4aXN0IGluIGFzc2V0IGRhdGFiYXNlLiBUaGUgYXNzZXQgbWF5IGhhdmUgYmVlbiBkZWxldGVkIG9yIG1vdmVkLmAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYXNzZXRBcnJheVR5cGVzLmluY2x1ZGVzKHByb3BlcnR5VHlwZSkgJiYgQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXVpZHMgPSBwcm9jZXNzZWRWYWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4gaXRlbT8udXVpZCkuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtaXNzaW5nID0gYXdhaXQgdGhpcy52YWxpZGF0ZVJlZmVyZW5jZVV1aWRzKHV1aWRzKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1pc3NpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgVVVJRChzKSBub3QgZm91bmQgaW4gYXNzZXQgZGF0YWJhc2U6ICR7bWlzc2luZy5qb2luKCcsICcpfS4gVGhlc2UgYXNzZXRzIG1heSBoYXZlIGJlZW4gZGVsZXRlZCBvciBtb3ZlZC5gIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGUnICYmIHByb2Nlc3NlZFZhbHVlPy51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVFeGlzdHMgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcHJvY2Vzc2VkVmFsdWUudXVpZCkudGhlbigobjogYW55KSA9PiAhIW4pLmNhdGNoKCgpID0+IGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIFVVSUQgJyR7cHJvY2Vzc2VkVmFsdWUudXVpZH0nIGRvZXMgbm90IGV4aXN0IGluIGN1cnJlbnQgc2NlbmUuYCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU3RlcCA1OiBHZXQgb3JpZ2luYWwgbm9kZSBkYXRhIHRvIGJ1aWxkIGNvcnJlY3QgcGF0aFxuICAgICAgICAgICAgICAgIGNvbnN0IHJhd05vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJhd05vZGVEYXRhIHx8ICFyYXdOb2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gZ2V0IHJhdyBub2RlIGRhdGEgZm9yIHByb3BlcnR5IHNldHRpbmdgXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRmluZCBvcmlnaW5hbCBjb21wb25lbnQgaW5kZXguIE1hdGNoIGJ5IGNpZCBmaXJzdCwgdGhlbiBieSBjbGFzcy1uYW1lIHN1ZmZpeFxuICAgICAgICAgICAgICAgIC8vIGluIHRoZSBjb21wb25lbnQncyBpbnN0YW5jZSBuYW1lIChyYXcgcXVlcnktbm9kZSBzaGFwZTogY29tcC52YWx1ZS5uYW1lLnZhbHVlKS5cbiAgICAgICAgICAgICAgICBsZXQgcmF3Q29tcG9uZW50SW5kZXggPSAtMTtcbiAgICAgICAgICAgICAgICBjb25zdCBjbGFzc1N1ZmZpeEZvclJhdyA9IGA8JHtjb21wb25lbnRUeXBlfT5gO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmF3Tm9kZURhdGEuX19jb21wc19fLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXAgPSByYXdOb2RlRGF0YS5fX2NvbXBzX19baV0gYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBUeXBlID09PSBjb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYXdDb21wb25lbnRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnN0YW5jZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IGNvbXA/LnZhbHVlPy5uYW1lPy52YWx1ZSA/PyBjb21wPy5uYW1lPy52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnN0YW5jZU5hbWUgPT09ICdzdHJpbmcnICYmIGluc3RhbmNlTmFtZS5lbmRzV2l0aChjbGFzc1N1ZmZpeEZvclJhdykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhd0NvbXBvbmVudEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHJhd0NvbXBvbmVudEluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvdWxkIG5vdCBmaW5kIGNvbXBvbmVudCBpbmRleCBmb3Igc2V0dGluZyBwcm9wZXJ0eWBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTbmFwc2hvdCBub24tbnVsbCBwcm9wZXJ0aWVzIGJlZm9yZSBjaGFuZ2VcbiAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmVOb25OdWxsID0gdGhpcy5zbmFwc2hvdE5vbk51bGxQcm9wcyhyYXdOb2RlRGF0YS5fX2NvbXBzX19bcmF3Q29tcG9uZW50SW5kZXhdKTtcblxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIGNvcnJlY3QgcHJvcGVydHkgcGF0aFxuICAgICAgICAgICAgICAgIGxldCBwcm9wZXJ0eVBhdGggPSBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LiR7cHJvcGVydHl9YDtcblxuICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGFzc2V0LXR5cGUgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdhc3NldCcgfHwgcHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicgfHxcbiAgICAgICAgICAgICAgICAgICAgKHByb3BlcnR5SW5mby50eXBlID09PSAnYXNzZXQnICYmIHByb3BlcnR5VHlwZSA9PT0gJ3N0cmluZycpKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBhc3NldCByZWZlcmVuY2U6ICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiBwcm9wZXJ0eVR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGhcbiAgICAgICAgICAgICAgICAgICAgfSl9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGFzc2V0IHR5cGUgYmFzZWQgb24gcHJvcGVydHkgbmFtZVxuICAgICAgICAgICAgICAgICAgICBsZXQgYXNzZXRUeXBlID0gJ2NjLlNwcml0ZUZyYW1lJzsgLy8gZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGV4dHVyZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuVGV4dHVyZTJEJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdtYXRlcmlhbCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUgPSAnY2MuTWF0ZXJpYWwnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2ZvbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLkZvbnQnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NsaXAnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLkF1ZGlvQ2xpcCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAncHJlZmFiJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlByZWZhYic7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogYXNzZXRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLlVJVHJhbnNmb3JtJyAmJiAocHJvcGVydHkgPT09ICdfY29udGVudFNpemUnIHx8IHByb3BlcnR5ID09PSAnY29udGVudFNpemUnKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBVSVRyYW5zZm9ybSBjb250ZW50U2l6ZSAtIHNldCB3aWR0aCBhbmQgaGVpZ2h0IHNlcGFyYXRlbHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBOdW1iZXIodmFsdWUud2lkdGgpIHx8IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gTnVtYmVyKHZhbHVlLmhlaWdodCkgfHwgMTAwO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCB3aWR0aCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0ud2lkdGhgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogd2lkdGggfVxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBUaGVuIHNldCBoZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmhlaWdodGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBoZWlnaHQgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgJiYgKHByb3BlcnR5ID09PSAnX2FuY2hvclBvaW50JyB8fCBwcm9wZXJ0eSA9PT0gJ2FuY2hvclBvaW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgVUlUcmFuc2Zvcm0gYW5jaG9yUG9pbnQgLSBzZXQgYW5jaG9yWCBhbmQgYW5jaG9yWSBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFuY2hvclggPSBOdW1iZXIodmFsdWUueCkgfHwgMC41O1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JZID0gTnVtYmVyKHZhbHVlLnkpIHx8IDAuNTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgYW5jaG9yWCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uYW5jaG9yWGAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBhbmNob3JYIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgYW5jaG9yWVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtyYXdDb21wb25lbnRJbmRleH0uYW5jaG9yWWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBhbmNob3JZIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvcicgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb2xvciBwcm9wZXJ0aWVzLCBlbnN1cmUgUkdCQSB2YWx1ZXMgYXJlIGNvcnJlY3RcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29jb3MgQ3JlYXRvciBjb2xvciB2YWx1ZXMgcmFuZ2UgaXMgMC0yNTVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sb3JWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGE6IHByb2Nlc3NlZFZhbHVlLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHByb2Nlc3NlZFZhbHVlLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGNvbG9yIHZhbHVlOiAke0pTT04uc3RyaW5naWZ5KGNvbG9yVmFsdWUpfWApO1xuXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjb2xvclZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMzJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFZlYzMgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZWMzVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS55KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgejogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnopIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmVjM1ZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5WZWMzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ZlYzInICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgVmVjMiBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlYzJWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS54KSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLnkpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmVjMlZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5WZWMyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3NpemUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgU2l6ZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNpemVWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUud2lkdGgpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc2l6ZVZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGUnICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgJ3V1aWQnIGluIHByb2Nlc3NlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIG5vZGUgcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIG5vZGUgcmVmZXJlbmNlIHdpdGggVVVJRDogJHtwcm9jZXNzZWRWYWx1ZS51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLk5vZGUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnY29tcG9uZW50JyAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvbXBvbmVudCByZWZlcmVuY2VzOiBmaW5kIGNvbXBvbmVudCBfX2lkX18gdmlhIG5vZGUgVVVJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXROb2RlVXVpZCA9IHByb2Nlc3NlZFZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nIGNvbXBvbmVudCByZWZlcmVuY2UgLSBmaW5kaW5nIGNvbXBvbmVudCBvbiBub2RlOiAke3RhcmdldE5vZGVVdWlkfWApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBleHBlY3RlZCBjb21wb25lbnQgdHlwZSBmcm9tIGN1cnJlbnQgY29tcG9uZW50IHByb3BlcnR5IG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgICAgIGxldCBleHBlY3RlZENvbXBvbmVudFR5cGUgPSAnJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCBjb21wb25lbnQgZGV0YWlscyBpbmNsdWRpbmcgcHJvcGVydHkgbWV0YWRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudENvbXBvbmVudEluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudENvbXBvbmVudEluZm8uc3VjY2VzcyAmJiBjdXJyZW50Q29tcG9uZW50SW5mby5kYXRhPy5wcm9wZXJ0aWVzPy5bcHJvcGVydHldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eU1ldGEgPSBjdXJyZW50Q29tcG9uZW50SW5mby5kYXRhLnByb3BlcnRpZXNbcHJvcGVydHldO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGNvbXBvbmVudCB0eXBlIGluZm8gZnJvbSBwcm9wZXJ0eSBtZXRhZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TWV0YSAmJiB0eXBlb2YgcHJvcGVydHlNZXRhID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZXJlIGlzIGEgdHlwZSBmaWVsZCBpbmRpY2F0aW5nIGNvbXBvbmVudCB0eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TWV0YS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9IHByb3BlcnR5TWV0YS50eXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlNZXRhLmN0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU29tZSBwcm9wZXJ0aWVzIG1heSB1c2UgY3RvciBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBwcm9wZXJ0eU1ldGEuY3RvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5leHRlbmRzICYmIEFycmF5LmlzQXJyYXkocHJvcGVydHlNZXRhLmV4dGVuZHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGV4dGVuZHMgYXJyYXksIHVzdWFsbHkgdGhlIGZpcnN0IGlzIHRoZSBtb3N0IHNwZWNpZmljIHR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBleHRlbmRUeXBlIG9mIHByb3BlcnR5TWV0YS5leHRlbmRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXh0ZW5kVHlwZS5zdGFydHNXaXRoKCdjYy4nKSAmJiBleHRlbmRUeXBlICE9PSAnY2MuQ29tcG9uZW50JyAmJiBleHRlbmRUeXBlICE9PSAnY2MuT2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29tcG9uZW50VHlwZSA9IGV4dGVuZFR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZGV0ZXJtaW5lIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlIGZvciBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIFByb3BlcnR5IG1ldGFkYXRhIG1heSBub3QgY29udGFpbiB0eXBlIGluZm9ybWF0aW9uLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gRGV0ZWN0ZWQgcmVxdWlyZWQgY29tcG9uZW50IHR5cGU6ICR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfSBmb3IgcHJvcGVydHk6ICR7cHJvcGVydHl9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCB0YXJnZXQgbm9kZSBjb21wb25lbnQgaW5mb1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Tm9kZURhdGEgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgdGFyZ2V0Tm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0YXJnZXROb2RlRGF0YSB8fCAhdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUYXJnZXQgbm9kZSAke3RhcmdldE5vZGVVdWlkfSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHNgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJpbnQgdGFyZ2V0IG5vZGUgY29tcG9uZW50IG92ZXJ2aWV3XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBUYXJnZXQgbm9kZSAke3RhcmdldE5vZGVVdWlkfSBoYXMgJHt0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RofSBjb21wb25lbnRzOmApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLmZvckVhY2goKGNvbXA6IGFueSwgaW5kZXg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lSWQgPSBjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUgPyBjb21wLnZhbHVlLnV1aWQudmFsdWUgOiAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gQ29tcG9uZW50ICR7aW5kZXh9OiAke2NvbXAudHlwZX0gKHNjZW5lX2lkOiAke3NjZW5lSWR9KWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgY29ycmVzcG9uZGluZyBjb21wb25lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbXBvbmVudElkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBzcGVjaWZpZWQgdHlwZSBvZiBjb21wb25lbnQgaW4gdGFyZ2V0IG5vZGUgX2NvbXBvbmVudHMgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vdGU6IF9fY29tcHNfXyBhbmQgX2NvbXBvbmVudHMgaW5kaWNlcyBjb3JyZXNwb25kIHRvIGVhY2ggb3RoZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFNlYXJjaGluZyBmb3IgY29tcG9uZW50IHR5cGU6ICR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfWApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRhcmdldE5vZGVEYXRhLl9fY29tcHNfXy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXAgPSB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX19baV0gYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIENoZWNraW5nIGNvbXBvbmVudCAke2l9OiB0eXBlPSR7Y29tcC50eXBlfSwgdGFyZ2V0PSR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfWApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAudHlwZSA9PT0gZXhwZWN0ZWRDb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudCA9IGNvbXA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIEZvdW5kIG1hdGNoaW5nIGNvbXBvbmVudCBhdCBpbmRleCAke2l9OiAke2NvbXAudHlwZX1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgY29tcG9uZW50IHNjZW5lIElEIGZyb20gY29tcG9uZW50IHZhbHVlLnV1aWQudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkICYmIGNvbXAudmFsdWUudXVpZC52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50SWQgPSBjb21wLnZhbHVlLnV1aWQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBHb3QgY29tcG9uZW50SWQgZnJvbSBjb21wLnZhbHVlLnV1aWQudmFsdWU6ICR7Y29tcG9uZW50SWR9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBDb21wb25lbnQgc3RydWN0dXJlOiAke0pTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNWYWx1ZTogISFjb21wLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1V1aWQ6ICEhKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNVdWlkVmFsdWU6ICEhKGNvbXAudmFsdWUgJiYgY29tcC52YWx1ZS51dWlkICYmIGNvbXAudmFsdWUudXVpZC52YWx1ZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZFN0cnVjdHVyZTogY29tcC52YWx1ZSA/IGNvbXAudmFsdWUudXVpZCA6ICdObyB2YWx1ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gZXh0cmFjdCBjb21wb25lbnQgSUQgZnJvbSBjb21wb25lbnQgc3RydWN0dXJlYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgbm90IGZvdW5kLCBsaXN0IGF2YWlsYWJsZSBjb21wb25lbnRzIGZvciB1c2VyIHJlZmVyZW5jZSwgc2hvd2luZyByZWFsIHNjZW5lIElEc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZUNvbXBvbmVudHMgPSB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubWFwKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHNjZW5lSWQgPSAndW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBzY2VuZSBJRCBmcm9tIGNvbXBvbmVudCB2YWx1ZS51dWlkLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lSWQgPSBjb21wLnZhbHVlLnV1aWQudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke2NvbXAudHlwZX0oc2NlbmVfaWQ6JHtzY2VuZUlkfSlgO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ29tcG9uZW50IHR5cGUgJyR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGUgJHt0YXJnZXROb2RlVXVpZH0uIEF2YWlsYWJsZSBjb21wb25lbnRzOiAke2F2YWlsYWJsZUNvbXBvbmVudHMuam9pbignLCAnKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gRm91bmQgY29tcG9uZW50ICR7ZXhwZWN0ZWRDb21wb25lbnRUeXBlfSB3aXRoIHNjZW5lIElEOiAke2NvbXBvbmVudElkfSBvbiBub2RlICR7dGFyZ2V0Tm9kZVV1aWR9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHBlY3RlZCB2YWx1ZSB0byBhY3R1YWwgY29tcG9uZW50IElEIG9iamVjdCBmb3JtYXQgZm9yIHN1YnNlcXVlbnQgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWxFeHBlY3RlZFZhbHVlID0geyB1dWlkOiBjb21wb25lbnRJZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdXNpbmcgc2FtZSBmb3JtYXQgYXMgbm9kZS9hc3NldCByZWZlcmVuY2VzOiB7dXVpZDogY29tcG9uZW50SWR9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUZXN0IHRvIHNlZSBpZiBjb21wb25lbnQgcmVmZXJlbmNlIGNhbiBiZSBzZXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgdXVpZDogY29tcG9uZW50SWQgfSwgIC8vIFVzZSBvYmplY3QgZm9ybWF0LCBsaWtlIG5vZGUvYXNzZXQgcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBleHBlY3RlZENvbXBvbmVudFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgY29tcG9uZW50IHJlZmVyZW5jZTogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFxuICAgICAgICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KHByb2Nlc3NlZFZhbHVlKSAmJlxuICAgICAgICAgICAgICAgICAgICBbJ25vZGVBcnJheScsICdhc3NldEFycmF5JywgJ3Nwcml0ZUZyYW1lQXJyYXknLCAnY29sb3JBcnJheScsICdudW1iZXJBcnJheScsICdzdHJpbmdBcnJheSddLmluY2x1ZGVzKHByb3BlcnR5VHlwZSlcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ29jb3MgYHNldC1wcm9wZXJ0eWAgd2l0aCBgZHVtcC52YWx1ZSA9IFtpdGVtc11gIGRvZXMgTk9UIGF1dG8tZXh0ZW5kIHRoZSBhcnJheVxuICAgICAgICAgICAgICAgICAgICAvLyBiZXlvbmQgaXRzIGN1cnJlbnQgbGVuZ3RoOyBzdXJwbHVzIGl0ZW1zIGFyZSBzaWxlbnRseSBkcm9wcGVkLiBTZXQgcGVyLWluZGV4IHVzaW5nXG4gICAgICAgICAgICAgICAgICAgIC8vIHBhdGggYDxwcm9wZXJ0eVBhdGg+LjxpPmAgc28gQ29jb3MgZXh0ZW5kcyB0aGUgYXJyYXkgYXMgbmVlZGVkLlxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudFR5cGUgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ25vZGVBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRUeXBlID0gJ2NjLk5vZGUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50VHlwZSA9ICdjYy5Db2xvcic7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnbnVtYmVyQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50VHlwZSA9ICdOdW1iZXInO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3N0cmluZ0FycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFR5cGUgPSAnU3RyaW5nJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdzcHJpdGVGcmFtZUFycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFR5cGUgPSAnY2MuU3ByaXRlRnJhbWUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2Fzc2V0QXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbmZlciBhc3NldCBlbGVtZW50IHR5cGUgZnJvbSBwcm9wZXJ0eSBuYW1lIChtaXJyb3JzIHNpbmdsZS1hc3NldCBoZXVyaXN0aWNzKS5cbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRUeXBlID0gJ2NjLkFzc2V0JztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyID0gcHJvcGVydHkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb3dlci5pbmNsdWRlcygnYXRsYXMnKSkgZWxlbWVudFR5cGUgPSAnY2MuU3ByaXRlQXRsYXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXIuaW5jbHVkZXMoJ3Nwcml0ZWZyYW1lJykpIGVsZW1lbnRUeXBlID0gJ2NjLlNwcml0ZUZyYW1lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyLmluY2x1ZGVzKCd0ZXh0dXJlJykpIGVsZW1lbnRUeXBlID0gJ2NjLlRleHR1cmUyRCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlci5pbmNsdWRlcygnbWF0ZXJpYWwnKSkgZWxlbWVudFR5cGUgPSAnY2MuTWF0ZXJpYWwnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXIuaW5jbHVkZXMoJ2NsaXAnKSkgZWxlbWVudFR5cGUgPSAnY2MuQXVkaW9DbGlwJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyLmluY2x1ZGVzKCdwcmVmYWInKSkgZWxlbWVudFR5cGUgPSAnY2MuUHJlZmFiJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyLmluY2x1ZGVzKCdmb250JykpIGVsZW1lbnRUeXBlID0gJ2NjLkZvbnQnO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsaXplIGNvbG9yQXJyYXkgaXRlbXMgKGNsYW1wIDAtMjU1LCBlbnN1cmUgYWxwaGEpLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpdGVtcyA9IHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yQXJyYXknXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHByb2Nlc3NlZFZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgdHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmICdyJyBpbiBpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLnIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uZykgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiBpdGVtLmEgIT09IHVuZGVmaW5lZCA/IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyByOiAyNTUsIGc6IDI1NSwgYjogMjU1LCBhOiAyNTUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHByb2Nlc3NlZFZhbHVlO1xuXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgJHtwcm9wZXJ0eVR5cGV9IHBlci1pbmRleCAoJHtpdGVtcy5sZW5ndGh9IGl0ZW1zLCBlbGVtZW50VHlwZT0ke2VsZW1lbnRUeXBlfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGAke3Byb3BlcnR5UGF0aH0uJHtpfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbXNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGVsZW1lbnRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgcHJvcGVydHkgc2V0dGluZyBmb3Igbm9uLWFzc2V0IHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNTogV2FpdCBmb3IgRWRpdG9yIHRvIGNvbXBsZXRlIHVwZGF0ZSwgdGhlbiB2ZXJpZnkgcmVzdWx0XG4gICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDIwMCkpOyAvLyBXYWl0IDIwMG1zIGZvciBFZGl0b3IgdG8gY29tcGxldGUgdXBkYXRlXG5cbiAgICAgICAgICAgICAgICBjb25zdCB2ZXJpZmljYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgb3JpZ2luYWxWYWx1ZSwgYWN0dWFsRXhwZWN0ZWRWYWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBmb3IgbG9zdCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgbGV0IGxvc3RQcm9wZXJ0aWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFmdGVyUmF3RGF0YSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhZnRlclJhd0RhdGE/Ll9fY29tcHNfXz8uW3Jhd0NvbXBvbmVudEluZGV4XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJOb25OdWxsID0gdGhpcy5zbmFwc2hvdE5vbk51bGxQcm9wcyhhZnRlclJhd0RhdGEuX19jb21wc19fW3Jhd0NvbXBvbmVudEluZGV4XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb3N0UHJvcGVydGllcyA9IGJlZm9yZU5vbk51bGwuZmlsdGVyKChwOiBzdHJpbmcpID0+IHAgIT09IHByb3BlcnR5ICYmICFhZnRlck5vbk51bGwuaW5jbHVkZXMocCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSBzbmFwc2hvdCBlcnJvcnMgKi8gfVxuXG4gICAgICAgICAgICBjb25zdCBzdGlsbE51bGwgPSB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUgPT09IG51bGwgfHwgdmVyaWZpY2F0aW9uLmFjdHVhbFZhbHVlID09PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICBjb25zdCBudWxsU2V0RmFpbGVkID0gd2FzTnVsbCAmJiBpc1JlZmVyZW5jZVR5cGUgJiYgc3RpbGxOdWxsO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6ICFudWxsU2V0RmFpbGVkLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG51bGxTZXRGYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgPyBgU2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX0gZmFpbGVkIOKAlCB2YWx1ZSBpcyBzdGlsbCBudWxsIGFmdGVyIG9wZXJhdGlvbmBcbiAgICAgICAgICAgICAgICAgICAgOiBgU3VjY2Vzc2Z1bGx5IHNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWU6IHZlcmlmaWNhdGlvbi5hY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlVmVyaWZpZWQ6IHZlcmlmaWNhdGlvbi52ZXJpZmllZCxcbiAgICAgICAgICAgICAgICAgICAgLi4uKHdhc051bGwgJiYgaXNSZWZlcmVuY2VUeXBlICYmIHsgbnVsbFdhcm5pbmc6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHdhcyBudWxsIGJlZm9yZSBzZXQg4oCUIHZlcmlmeSBwcm9wZXJ0eVR5cGUgJyR7cHJvcGVydHlUeXBlfScgaXMgY29ycmVjdGAgfSksXG4gICAgICAgICAgICAgICAgICAgIC4uLihsb3N0UHJvcGVydGllcy5sZW5ndGggPiAwICYmIHsgbG9zdFByb3BlcnRpZXMsIHdhcm5pbmc6IGBQcm9wZXJ0aWVzIGxvc3QgYWZ0ZXIgY2hhbmdlOiAke2xvc3RQcm9wZXJ0aWVzLmpvaW4oJywgJyl9YCB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBbQ29tcG9uZW50VG9vbHNdIEVycm9yIHNldHRpbmcgcHJvcGVydHk6ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gc2V0IHByb3BlcnR5OiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVJlZmVyZW5jZVV1aWRzKHV1aWRzOiBzdHJpbmdbXSk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICAgICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIHV1aWRzKSB7XG4gICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICAgICAgaWYgKCFpbmZvKSBtaXNzaW5nLnB1c2godXVpZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1pc3Npbmc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzbmFwc2hvdE5vbk51bGxQcm9wcyhyYXdDb21wOiBhbnkpOiBzdHJpbmdbXSB7XG4gICAgICAgIGlmICghcmF3Q29tcCkgcmV0dXJuIFtdO1xuICAgICAgICBjb25zdCBza2lwID0gbmV3IFNldChbJ19fdHlwZV9fJywgJ2NpZCcsICdub2RlJywgJ3V1aWQnLCAnbmFtZScsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnX2VuYWJsZWQnLCAnZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnLCAnZWRpdG9yJywgJ2V4dGVuZHMnLCAnX19zY3JpcHRBc3NldCddKTtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHJhd0NvbXApLmZpbHRlcihrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKHNraXAuaGFzKGtleSkgfHwga2V5LnN0YXJ0c1dpdGgoJ18nKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgY29uc3QgdmFsID0gcmF3Q29tcFtrZXldO1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgLy8gVW53cmFwIENvY29zIGRlc2NyaXB0b3Igb2JqZWN0czogeyB2YWx1ZTogLi4uLCB0eXBlOiAuLi4gfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gdmFsKSByZXR1cm4gdmFsLnZhbHVlICE9PSBudWxsICYmIHZhbC52YWx1ZSAhPT0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXR0YWNoU2NyaXB0KG5vZGVVdWlkOiBzdHJpbmcsIHNjcmlwdFBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIEV4dHJhY3QgY29tcG9uZW50IGNsYXNzIG5hbWUgZnJvbSBzY3JpcHQgcGF0aFxuICAgICAgICBjb25zdCBzY3JpcHROYW1lID0gc2NyaXB0UGF0aC5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcudHMnLCAnJykucmVwbGFjZSgnLmpzJywgJycpO1xuICAgICAgICBpZiAoIXNjcmlwdE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ludmFsaWQgc2NyaXB0IHBhdGgnIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVzb2x2ZSBzY3JpcHQgYXNzZXQgdXVpZCBzbyB3ZSBjYW4gbWF0Y2ggYXR0YWNoZWQgY29tcG9uZW50IHJlbGlhYmx5LlxuICAgICAgICAvLyBDdXN0b20tc2NyaXB0IGNvbXBvbmVudHMgc3VyZmFjZSBhcyBjaWQgaW4gYGNvbXAudHlwZWAsIE5PVCBhcyB0aGUgY2xhc3MgbmFtZSDigJRcbiAgICAgICAgLy8gc28gbmFtZS1iYXNlZCBjb21wYXJpc29uIGdpdmVzIGZhbHNlIG5lZ2F0aXZlcy4gTWF0Y2ggdmlhIF9fc2NyaXB0QXNzZXQudmFsdWUudXVpZCBpbnN0ZWFkLlxuICAgICAgICBsZXQgc2NyaXB0QXNzZXRVdWlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHNjcmlwdEFzc2V0VXVpZCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBzY3JpcHRQYXRoKSBhcyBzdHJpbmc7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbmFtZS1iYXNlZCBtYXRjaCBpZiB1dWlkIGxvb2t1cCBmYWlscy5cbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXRjaGVzU2NyaXB0ID0gKGNvbXA6IGFueSk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgY29uc3QgY29tcFNjcmlwdFV1aWQgPSBjb21wPy5wcm9wZXJ0aWVzPy5fX3NjcmlwdEFzc2V0Py52YWx1ZT8udXVpZDtcbiAgICAgICAgICAgIGlmIChzY3JpcHRBc3NldFV1aWQgJiYgY29tcFNjcmlwdFV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcFNjcmlwdFV1aWQgPT09IHNjcmlwdEFzc2V0VXVpZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiByZWdpc3RlcmVkIGNsYXNzIG5hbWUgKHJhcmUgZm9yIGN1c3RvbSBzY3JpcHRzKSBvciBpbnN0YW5jZSBuYW1lIHN1ZmZpeCBgPENsYXNzTmFtZT5gLlxuICAgICAgICAgICAgaWYgKGNvbXAudHlwZSA9PT0gc2NyaXB0TmFtZSkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICBjb25zdCBpbnN0YW5jZU5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IGNvbXA/LnByb3BlcnRpZXM/Lm5hbWU/LnZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuICEhaW5zdGFuY2VOYW1lICYmIGluc3RhbmNlTmFtZS5lbmRzV2l0aChgPCR7c2NyaXB0TmFtZX0+YCk7XG4gICAgICAgIH07XG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIHRoZSBzY3JpcHQgY29tcG9uZW50IGFscmVhZHkgZXhpc3RzIG9uIHRoZSBub2RlXG4gICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdTY3JpcHQgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZChtYXRjaGVzU2NyaXB0KTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ1NjcmlwdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIGFscmVhZHkgZXhpc3RzIG9uIG5vZGVgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmlyc3QgdHJ5IHVzaW5nIHNjcmlwdCBuYW1lIGRpcmVjdGx5IGFzIGNvbXBvbmVudCB0eXBlXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogc2NyaXB0TmFtZSAgLy8gVXNlIHNjcmlwdCBuYW1lIGluc3RlYWQgb2YgVVVJRFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBXYWl0IGZvciBFZGl0b3IgdG8gY29tcGxldGUgY29tcG9uZW50IGFkZGl0aW9uXG4gICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTAwKSk7XG4gICAgICAgICAgICAvLyBSZS1xdWVyeSBub2RlIGluZm8gdG8gdmVyaWZ5IHNjcmlwdCB3YXMgYWN0dWFsbHkgYWRkZWRcbiAgICAgICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvMiA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8yLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8yLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBhZGRlZFNjcmlwdCA9IGFsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMuZmluZChtYXRjaGVzU2NyaXB0KTtcbiAgICAgICAgICAgICAgICBpZiAoYWRkZWRTY3JpcHQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyBhdHRhY2hlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnROYW1lOiBzY3JpcHROYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4aXN0aW5nOiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgU2NyaXB0ICcke3NjcmlwdE5hbWV9JyB3YXMgbm90IGZvdW5kIG9uIG5vZGUgYWZ0ZXIgYWRkaXRpb24uIEF2YWlsYWJsZSBjb21wb25lbnRzOiAke2FsbENvbXBvbmVudHNJbmZvMi5kYXRhLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+IGMudHlwZSkuam9pbignLCAnKX1gXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IHNjcmlwdCBhZGRpdGlvbjogJHthbGxDb21wb25lbnRzSW5mbzIuZXJyb3IgfHwgJ1VuYWJsZSB0byBnZXQgbm9kZSBjb21wb25lbnRzJ31gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdhdHRhY2hTY3JpcHQnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgc2NyaXB0UGF0aF1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBUb29sUmVzcG9uc2U7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gYXR0YWNoIHNjcmlwdCAnJHtzY3JpcHROYW1lfSc6ICR7ZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdQbGVhc2UgZW5zdXJlIHRoZSBzY3JpcHQgaXMgcHJvcGVybHkgY29tcGlsZWQgYW5kIGV4cG9ydGVkIGFzIGEgQ29tcG9uZW50IGNsYXNzLiBZb3UgY2FuIGFsc28gbWFudWFsbHkgYXR0YWNoIHRoZSBzY3JpcHQgdGhyb3VnaCB0aGUgUHJvcGVydGllcyBwYW5lbCBpbiB0aGUgZWRpdG9yLidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBdmFpbGFibGVDb21wb25lbnRzKGNhdGVnb3J5OiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudENhdGVnb3JpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgIHJlbmRlcmVyOiBbJ2NjLlNwcml0ZScsICdjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5NYXNrJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICB1aTogWydjYy5CdXR0b24nLCAnY2MuVG9nZ2xlJywgJ2NjLlNsaWRlcicsICdjYy5TY3JvbGxWaWV3JywgJ2NjLkVkaXRCb3gnLCAnY2MuUHJvZ3Jlc3NCYXInXSxcbiAgICAgICAgICAgIHBoeXNpY3M6IFsnY2MuUmlnaWRCb2R5MkQnLCAnY2MuQm94Q29sbGlkZXIyRCcsICdjYy5DaXJjbGVDb2xsaWRlcjJEJywgJ2NjLlBvbHlnb25Db2xsaWRlcjJEJ10sXG4gICAgICAgICAgICBhbmltYXRpb246IFsnY2MuQW5pbWF0aW9uJywgJ2NjLkFuaW1hdGlvbkNsaXAnLCAnY2MuU2tlbGV0YWxBbmltYXRpb24nXSxcbiAgICAgICAgICAgIGF1ZGlvOiBbJ2NjLkF1ZGlvU291cmNlJ10sXG4gICAgICAgICAgICBsYXlvdXQ6IFsnY2MuTGF5b3V0JywgJ2NjLldpZGdldCcsICdjYy5QYWdlVmlldycsICdjYy5QYWdlVmlld0luZGljYXRvciddLFxuICAgICAgICAgICAgZWZmZWN0czogWydjYy5Nb3Rpb25TdHJlYWsnLCAnY2MuUGFydGljbGVTeXN0ZW0yRCddLFxuICAgICAgICAgICAgY2FtZXJhOiBbJ2NjLkNhbWVyYSddLFxuICAgICAgICAgICAgbGlnaHQ6IFsnY2MuTGlnaHQnLCAnY2MuRGlyZWN0aW9uYWxMaWdodCcsICdjYy5Qb2ludExpZ2h0JywgJ2NjLlNwb3RMaWdodCddXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudHM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAnYWxsJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYXQgaW4gY29tcG9uZW50Q2F0ZWdvcmllcykge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmNvbmNhdChjb21wb25lbnRDYXRlZ29yaWVzW2NhdF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudENhdGVnb3JpZXNbY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzID0gY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50c1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgdmFsaWQgcHJvcGVydHkgZGVzY3JpcHRvciBvYmplY3RcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wRGF0YSAhPT0gJ29iamVjdCcgfHwgcHJvcERhdGEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEpO1xuXG4gICAgICAgICAgICAvLyBBdm9pZCB0cmF2ZXJzaW5nIHNpbXBsZSBudW1lcmljIG9iamVjdHMgKGUuZy4sIHt3aWR0aDogMjAwLCBoZWlnaHQ6IDE1MH0pXG4gICAgICAgICAgICBjb25zdCBpc1NpbXBsZVZhbHVlT2JqZWN0ID0ga2V5cy5ldmVyeShrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJvcERhdGFba2V5XTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChpc1NpbXBsZVZhbHVlT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgcHJvcGVydHkgZGVzY3JpcHRvciBjaGFyYWN0ZXJpc3RpYyBmaWVsZHMgd2l0aG91dCB1c2luZyAnaW4nIG9wZXJhdG9yXG4gICAgICAgICAgICBjb25zdCBoYXNOYW1lID0ga2V5cy5pbmNsdWRlcygnbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBrZXlzLmluY2x1ZGVzKCd2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVHlwZSA9IGtleXMuaW5jbHVkZXMoJ3R5cGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc0Rpc3BsYXlOYW1lID0ga2V5cy5pbmNsdWRlcygnZGlzcGxheU5hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlYWRvbmx5ID0ga2V5cy5pbmNsdWRlcygncmVhZG9ubHknKTtcblxuICAgICAgICAgICAgLy8gTXVzdCBjb250YWluIG5hbWUgb3IgdmFsdWUgZmllbGQsIGFuZCB1c3VhbGx5IGFsc28gYSB0eXBlIGZpZWxkXG4gICAgICAgICAgICBjb25zdCBoYXNWYWxpZFN0cnVjdHVyZSA9IChoYXNOYW1lIHx8IGhhc1ZhbHVlKSAmJiAoaGFzVHlwZSB8fCBoYXNEaXNwbGF5TmFtZSB8fCBoYXNSZWFkb25seSk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhIGNoZWNrOiBpZiBkZWZhdWx0IGZpZWxkIGV4aXN0cyB3aXRoIGNvbXBsZXggc3RydWN0dXJlLCBhdm9pZCBkZWVwIHRyYXZlcnNhbFxuICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ2RlZmF1bHQnKSAmJiBwcm9wRGF0YS5kZWZhdWx0ICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRLZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEuZGVmYXVsdCk7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRLZXlzLmluY2x1ZGVzKCd2YWx1ZScpICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIG9ubHkgcmV0dXJuIHRvcC1sZXZlbCBwcm9wZXJ0aWVzIHdpdGhvdXQgZGVlcCB0cmF2ZXJzYWwgb2YgZGVmYXVsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihgW2lzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3JdIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IGRlc2NyaXB0b3I6ICR7KGVycm9yIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYW5hbHl6ZVByb3BlcnR5KGNvbXBvbmVudDogYW55LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHsgZXhpc3RzOiBib29sZWFuOyB0eXBlOiBzdHJpbmc7IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdOyBvcmlnaW5hbFZhbHVlOiBhbnkgfSB7XG4gICAgICAgIC8vIEV4dHJhY3QgYXZhaWxhYmxlIHByb3BlcnRpZXMgZnJvbSBjb21wbGV4IGNvbXBvbmVudCBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUHJvcGVydGllczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IHByb3BlcnR5VmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHByb3BlcnR5RXhpc3RzID0gZmFsc2U7XG5cbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHdheXMgdG8gZmluZCBwcm9wZXJ0aWVzOlxuICAgICAgICAvLyAxLiBEaXJlY3QgcHJvcGVydHkgYWNjZXNzXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29tcG9uZW50LCBwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gY29tcG9uZW50W3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLiBGaW5kIGZyb20gbmVzdGVkIHN0cnVjdHVyZSAobGlrZSBjb21wbGV4IHN0cnVjdHVyZXMgc2VlbiBpbiB0ZXN0IGRhdGEpXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMgJiYgY29tcG9uZW50LnByb3BlcnRpZXMgJiYgdHlwZW9mIGNvbXBvbmVudC5wcm9wZXJ0aWVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgcHJvcGVydGllcy52YWx1ZSBleGlzdHMgKHRoaXMgaXMgdGhlIHN0cnVjdHVyZSB3ZSBzZWUgaW4gZ2V0Q29tcG9uZW50cylcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVPYmogPSBjb21wb25lbnQucHJvcGVydGllcy52YWx1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZU9iaikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJvcERhdGEgaXMgYSB2YWxpZCBwcm9wZXJ0eSBkZXNjcmlwdG9yIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgcHJvcERhdGEgaXMgYW4gb2JqZWN0IGFuZCBjb250YWlucyBleHBlY3RlZCBwcm9wZXJ0eSBzdHJ1Y3R1cmVcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BJbmZvID0gcHJvcERhdGEgYXMgYW55O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVmZXIgdmFsdWUgcHJvcGVydHksIGlmIG5vdCBhdmFpbGFibGUgdXNlIHByb3BEYXRhIGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BLZXlzID0gT2JqZWN0LmtleXMocHJvcEluZm8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgPyBwcm9wSW5mby52YWx1ZSA6IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGNoZWNrIGZhaWxzLCB1c2UgcHJvcEluZm8gZGlyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBmaW5kIGRpcmVjdGx5IGZyb20gcHJvcGVydGllc1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcERhdGFdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXBvbmVudC5wcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pc1ZhbGlkUHJvcGVydHlEZXNjcmlwdG9yKHByb3BEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT09IHByb3BlcnR5TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZWZlciB2YWx1ZSBwcm9wZXJ0eSwgaWYgbm90IGF2YWlsYWJsZSB1c2UgcHJvcERhdGEgaXRzZWxmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEtleXMgPSBPYmplY3Qua2V5cyhwcm9wSW5mbyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VmFsdWUgPSBwcm9wS2V5cy5pbmNsdWRlcygndmFsdWUnKSA/IHByb3BJbmZvLnZhbHVlIDogcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgY2hlY2sgZmFpbHMsIHVzZSBwcm9wSW5mbyBkaXJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEluZm87XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDMuIEV4dHJhY3Qgc2ltcGxlIHByb3BlcnR5IG5hbWVzIGZyb20gZGlyZWN0IHByb3BlcnRpZXNcbiAgICAgICAgaWYgKGF2YWlsYWJsZVByb3BlcnRpZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhjb21wb25lbnQpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFrZXkuc3RhcnRzV2l0aCgnXycpICYmICFbJ19fdHlwZV9fJywgJ2NpZCcsICdub2RlJywgJ3V1aWQnLCAnbmFtZScsICdlbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZSddLmluY2x1ZGVzKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcy5wdXNoKGtleSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFwcm9wZXJ0eUV4aXN0cykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBleGlzdHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHR5cGU6ICd1bmtub3duJyxcbiAgICAgICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLFxuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHVuZGVmaW5lZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0eXBlID0gJ3Vua25vd24nO1xuXG4gICAgICAgIC8vIFNtYXJ0IHR5cGUgZGV0ZWN0aW9uXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHByb3BlcnR5VmFsdWUpKSB7XG4gICAgICAgICAgICAvLyBBcnJheSB0eXBlIGRldGVjdGlvblxuICAgICAgICAgICAgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGVBcnJheSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjb2xvcicpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb2xvckFycmF5JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhcnJheSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBwcm9wZXJ0eSBuYW1lIHN1Z2dlc3RzIGl0J3MgYW4gYXNzZXRcbiAgICAgICAgICAgIGlmIChbJ3Nwcml0ZUZyYW1lJywgJ3RleHR1cmUnLCAnbWF0ZXJpYWwnLCAnZm9udCcsICdjbGlwJywgJ3ByZWZhYiddLmluY2x1ZGVzKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3N0cmluZyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICB0eXBlID0gJ251bWJlcic7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByb3BlcnR5VmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdHlwZSA9ICdib29sZWFuJztcbiAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVZhbHVlICYmIHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydHlWYWx1ZSk7XG4gICAgICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ3InKSAmJiBrZXlzLmluY2x1ZGVzKCdnJykgJiYga2V5cy5pbmNsdWRlcygnYicpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3InO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygneCcpICYmIGtleXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gcHJvcGVydHlWYWx1ZS56ICE9PSB1bmRlZmluZWQgPyAndmVjMycgOiAndmVjMic7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd3aWR0aCcpICYmIGtleXMuaW5jbHVkZXMoJ2hlaWdodCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnc2l6ZSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXlzLmluY2x1ZGVzKCd1dWlkJykgfHwga2V5cy5pbmNsdWRlcygnX191dWlkX18nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBpdCBpcyBhIG5vZGUgcmVmZXJlbmNlIChieSBwcm9wZXJ0eSBuYW1lIG9yIF9faWRfXyBwcm9wZXJ0eSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCd0YXJnZXQnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5cy5pbmNsdWRlcygnX19pZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygnX19pZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9kZSByZWZlcmVuY2UgY2hhcmFjdGVyaXN0aWNzXG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnbm9kZSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdvYmplY3QnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFthbmFseXplUHJvcGVydHldIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IHR5cGUgZm9yOiAke0pTT04uc3RyaW5naWZ5KHByb3BlcnR5VmFsdWUpfWApO1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVZhbHVlID09PSBudWxsIHx8IHByb3BlcnR5VmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gRm9yIG51bGwvdW5kZWZpbmVkIHZhbHVlcywgY2hlY2sgcHJvcGVydHkgbmFtZSB0byBkZXRlcm1pbmUgdHlwZVxuICAgICAgICAgICAgaWYgKFsnc3ByaXRlRnJhbWUnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdmb250JywgJ2NsaXAnLCAncHJlZmFiJ10uaW5jbHVkZXMocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdub2RlJykgfHxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGFyZ2V0JykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY29tcG9uZW50JykpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbXBvbmVudCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAndW5rbm93bic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZXhpc3RzOiB0cnVlLFxuICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMsXG4gICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiBwcm9wZXJ0eVZhbHVlXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBwYXJzZUNvbG9yU3RyaW5nKGNvbG9yU3RyOiBzdHJpbmcpOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3Qgc3RyID0gY29sb3JTdHIudHJpbSgpO1xuXG4gICAgICAgIC8vIE9ubHkgc3VwcG9ydHMgaGV4IGZvcm1hdCAjUlJHR0JCIG9yICNSUkdHQkJBQVxuICAgICAgICBpZiAoc3RyLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgICAgICAgaWYgKHN0ci5sZW5ndGggPT09IDcpIHsgLy8gI1JSR0dCQlxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGE6IDI1NSB9O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdHIubGVuZ3RoID09PSA5KSB7IC8vICNSUkdHQkJBQVxuICAgICAgICAgICAgICAgIGNvbnN0IHIgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgZyA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBiID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg1LCA3KSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGEgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDcsIDkpLCAxNik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgciwgZywgYiwgYSB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gSWYgbm90IHZhbGlkIGhleCBmb3JtYXQsIHJldHVybiBlcnJvciBtZXNzYWdlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBjb2xvciBmb3JtYXQ6IFwiJHtjb2xvclN0cn1cIi4gT25seSBoZXhhZGVjaW1hbCBmb3JtYXQgaXMgc3VwcG9ydGVkIChlLmcuLCBcIiNGRjAwMDBcIiBvciBcIiNGRjAwMDBGRlwiKWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmVyaWZ5UHJvcGVydHlDaGFuZ2Uobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCBvcmlnaW5hbFZhbHVlOiBhbnksIGV4cGVjdGVkVmFsdWU6IGFueSk6IFByb21pc2U8eyB2ZXJpZmllZDogYm9vbGVhbjsgYWN0dWFsVmFsdWU6IGFueTsgZnVsbERhdGE6IGFueSB9PiB7XG4gICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFN0YXJ0aW5nIHZlcmlmaWNhdGlvbiBmb3IgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWApO1xuICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBFeHBlY3RlZCB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlKX1gKTtcbiAgICAgICAgbG9nZ2VyLmluZm8oYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gT3JpZ2luYWwgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkob3JpZ2luYWxWYWx1ZSl9YCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFJlLWdldCBjb21wb25lbnQgaW5mbyBmb3IgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDYWxsaW5nIGdldENvbXBvbmVudEluZm8uLi5gKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudEluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gZ2V0Q29tcG9uZW50SW5mbyBzdWNjZXNzOiAke2NvbXBvbmVudEluZm8uc3VjY2Vzc31gKTtcblxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50cyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBnZXRDb21wb25lbnRzIHN1Y2Nlc3M6ICR7YWxsQ29tcG9uZW50cy5zdWNjZXNzfWApO1xuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5mby5zdWNjZXNzICYmIGNvbXBvbmVudEluZm8uZGF0YSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIENvbXBvbmVudCBkYXRhIGF2YWlsYWJsZSwgZXh0cmFjdGluZyBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nYCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsUHJvcGVydHlOYW1lcyA9IE9iamVjdC5rZXlzKGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzIHx8IHt9KTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBBdmFpbGFibGUgcHJvcGVydGllczogJHtKU09OLnN0cmluZ2lmeShhbGxQcm9wZXJ0eU5hbWVzKX1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eURhdGEgPSBjb21wb25lbnRJbmZvLmRhdGEucHJvcGVydGllcz8uW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSYXcgcHJvcGVydHkgZGF0YSBmb3IgJyR7cHJvcGVydHl9JzogJHtKU09OLnN0cmluZ2lmeShwcm9wZXJ0eURhdGEpfWApO1xuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBhY3R1YWwgdmFsdWUgZnJvbSBwcm9wZXJ0eSBkYXRhXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbFZhbHVlID0gcHJvcGVydHlEYXRhO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEluaXRpYWwgYWN0dWFsVmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpfWApO1xuXG4gICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5RGF0YSAmJiB0eXBlb2YgcHJvcGVydHlEYXRhID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluIHByb3BlcnR5RGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZSA9IHByb3BlcnR5RGF0YS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gRXh0cmFjdGVkIGFjdHVhbFZhbHVlIGZyb20gLnZhbHVlOiAke0pTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBObyAudmFsdWUgcHJvcGVydHkgZm91bmQsIHVzaW5nIHJhdyBkYXRhYCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRml4IHZlcmlmaWNhdGlvbiBsb2dpYzogY2hlY2sgaWYgYWN0dWFsIHZhbHVlIG1hdGNoZXMgZXhwZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0ZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgZXhwZWN0ZWRWYWx1ZSAhPT0gbnVsbCAmJiAndXVpZCcgaW4gZXhwZWN0ZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgcmVmZXJlbmNlIHR5cGVzIChub2RlL2NvbXBvbmVudC9hc3NldCksIGNvbXBhcmUgVVVJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxVdWlkID0gYWN0dWFsVmFsdWUgJiYgdHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiAndXVpZCcgaW4gYWN0dWFsVmFsdWUgPyBhY3R1YWxWYWx1ZS51dWlkIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVXVpZCA9IGV4cGVjdGVkVmFsdWUudXVpZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWQgJiYgZXhwZWN0ZWRVdWlkICE9PSAnJztcblxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZWZlcmVuY2UgY29tcGFyaXNvbjpgKTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYCAgLSBFeHBlY3RlZCBVVUlEOiBcIiR7ZXhwZWN0ZWRVdWlkfVwiYCk7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAgIC0gQWN0dWFsIFVVSUQ6IFwiJHthY3R1YWxVdWlkfVwiYCk7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAgIC0gVVVJRCBtYXRjaDogJHthY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAgIC0gVVVJRCBub3QgZW1wdHk6ICR7ZXhwZWN0ZWRVdWlkICE9PSAnJ31gKTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYCAgLSBGaW5hbCB2ZXJpZmllZDogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgdHlwZXMsIGNvbXBhcmUgdmFsdWVzIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFZhbHVlIGNvbXBhcmlzb246YCk7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAgIC0gRXhwZWN0ZWQgdHlwZTogJHt0eXBlb2YgZXhwZWN0ZWRWYWx1ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYCAgLSBBY3R1YWwgdHlwZTogJHt0eXBlb2YgYWN0dWFsVmFsdWV9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhY3R1YWxWYWx1ZSA9PT0gdHlwZW9mIGV4cGVjdGVkVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsVmFsdWUgPT09ICdvYmplY3QnICYmIGFjdHVhbFZhbHVlICE9PSBudWxsICYmIGV4cGVjdGVkVmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWVwIGNvbXBhcmlzb24gZm9yIG9iamVjdCB0eXBlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gSlNPTi5zdHJpbmdpZnkoYWN0dWFsVmFsdWUpID09PSBKU09OLnN0cmluZ2lmeShleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgICAtIE9iamVjdCBjb21wYXJpc29uIChKU09OKTogJHt2ZXJpZmllZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGlyZWN0IGNvbXBhcmlzb24gZm9yIGJhc2ljIHR5cGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxWYWx1ZSA9PT0gZXhwZWN0ZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgICAtIERpcmVjdCBjb21wYXJpc29uOiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgdHlwZSBtaXNtYXRjaCAoZS5nLiwgbnVtYmVyIGFuZCBzdHJpbmcpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdHJpbmdNYXRjaCA9IFN0cmluZyhhY3R1YWxWYWx1ZSkgPT09IFN0cmluZyhleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG51bWJlck1hdGNoID0gTnVtYmVyKGFjdHVhbFZhbHVlKSA9PT0gTnVtYmVyKGV4cGVjdGVkVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBzdHJpbmdNYXRjaCB8fCBudW1iZXJNYXRjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGAgIC0gU3RyaW5nIG1hdGNoOiAke3N0cmluZ01hdGNofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYCAgLSBOdW1iZXIgbWF0Y2g6ICR7bnVtYmVyTWF0Y2h9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgICAtIFR5cGUgbWlzbWF0Y2ggdmVyaWZpZWQ6ICR7dmVyaWZpZWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBGaW5hbCB2ZXJpZmljYXRpb24gcmVzdWx0OiAke3ZlcmlmaWVkfWApO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEZpbmFsIGFjdHVhbFZhbHVlOiAke0pTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKX1gKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBmdWxsRGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSByZXR1cm4gbW9kaWZpZWQgcHJvcGVydHkgaW5mbywgbm90IGNvbXBsZXRlIGNvbXBvbmVudCBkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RpZmllZFByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlOiBvcmlnaW5hbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsVmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlNZXRhZGF0YTogcHJvcGVydHlEYXRhIC8vIE9ubHkgaW5jbHVkZXMgdGhpcyBwcm9wZXJ0eSdzIG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2ltcGxpZmllZCBjb21wb25lbnQgaW5mb1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50U3VtbWFyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxQcm9wZXJ0aWVzOiBPYmplY3Qua2V5cyhjb21wb25lbnRJbmZvLmRhdGE/LnByb3BlcnRpZXMgfHwge30pLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFJldHVybmluZyByZXN1bHQ6ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKX1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDb21wb25lbnRJbmZvIGZhaWxlZCBvciBubyBkYXRhOiAke0pTT04uc3RyaW5naWZ5KGNvbXBvbmVudEluZm8pfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIFZlcmlmaWNhdGlvbiBmYWlsZWQgd2l0aCBlcnJvcjogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICAgICAgbG9nZ2VyLmVycm9yKGBbdmVyaWZ5UHJvcGVydHlDaGFuZ2VdIEVycm9yIHN0YWNrOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5zdGFjayA6ICdObyBzdGFjayB0cmFjZSd9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBsb2dnZXIuaW5mbyhgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBSZXR1cm5pbmcgZmFsbGJhY2sgcmVzdWx0YCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2ZXJpZmllZDogZmFsc2UsXG4gICAgICAgICAgICBhY3R1YWxWYWx1ZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZnVsbERhdGE6IG51bGxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaWYgdGhpcyBpcyBhIG5vZGUgcHJvcGVydHksIHJlZGlyZWN0IHRvIGNvcnJlc3BvbmRpbmcgbm9kZSBtZXRob2QgaWYgc29cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrQW5kUmVkaXJlY3ROb2RlUHJvcGVydGllcyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZSB8IG51bGw+IHtcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHZhbHVlIH0gPSBhcmdzO1xuXG4gICAgICAgIC8vIERldGVjdCBpZiB0aGlzIGlzIGEgYmFzaWMgbm9kZSBwcm9wZXJ0eSAoc2hvdWxkIHVzZSBzZXRfbm9kZV9wcm9wZXJ0eSlcbiAgICAgICAgY29uc3Qgbm9kZUJhc2ljUHJvcGVydGllcyA9IFtcbiAgICAgICAgICAgICduYW1lJywgJ2FjdGl2ZScsICdsYXllcicsICdtb2JpbGl0eScsICdwYXJlbnQnLCAnY2hpbGRyZW4nLCAnaGlkZUZsYWdzJ1xuICAgICAgICBdO1xuXG4gICAgICAgIC8vIERldGVjdCBpZiB0aGlzIGlzIGEgbm9kZSB0cmFuc2Zvcm0gcHJvcGVydHkgKHNob3VsZCB1c2Ugc2V0X25vZGVfdHJhbnNmb3JtKVxuICAgICAgICBjb25zdCBub2RlVHJhbnNmb3JtUHJvcGVydGllcyA9IFtcbiAgICAgICAgICAgICdwb3NpdGlvbicsICdyb3RhdGlvbicsICdzY2FsZScsICdldWxlckFuZ2xlcycsICdhbmdsZSdcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBEZXRlY3QgYXR0ZW1wdHMgdG8gc2V0IGNjLk5vZGUgcHJvcGVydGllcyAoY29tbW9uIG1pc3Rha2UpXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuTm9kZScgfHwgY29tcG9uZW50VHlwZSA9PT0gJ05vZGUnKSB7XG4gICAgICAgICAgICBpZiAobm9kZUJhc2ljUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSBiYXNpYyBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3Byb3BlcnR5IG1ldGhvZCB0byBzZXQgbm9kZSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV9wcm9wZXJ0eSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiLCB2YWx1ZT0ke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0pYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQbGVhc2UgdXNlIHNldF9ub2RlX3RyYW5zZm9ybSBtZXRob2QgdG8gc2V0IHRyYW5zZm9ybSBwcm9wZXJ0aWVzOiBzZXRfbm9kZV90cmFuc2Zvcm0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7cHJvcGVydHl9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBjb21tb24gaW5jb3JyZWN0IHVzYWdlXG4gICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSB8fCBub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1ldGhvZE5hbWUgPSBub2RlVHJhbnNmb3JtUHJvcGVydGllcy5pbmNsdWRlcyhwcm9wZXJ0eSkgPyAnc2V0X25vZGVfdHJhbnNmb3JtJyA6ICdzZXRfbm9kZV9wcm9wZXJ0eSc7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgcHJvcGVydHksIG5vdCBhIGNvbXBvbmVudCBwcm9wZXJ0eWAsXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHNob3VsZCBiZSBzZXQgdXNpbmcgJHttZXRob2ROYW1lfSBtZXRob2QsIG5vdCBzZXRfY29tcG9uZW50X3Byb3BlcnR5LiBQbGVhc2UgdXNlOiAke21ldGhvZE5hbWV9KHV1aWQ9XCIke25vZGVVdWlkfVwiLCAke25vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSA/IHByb3BlcnR5IDogYHByb3BlcnR5PVwiJHtwcm9wZXJ0eX1cImB9PSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7IC8vIE5vdCBhIG5vZGUgcHJvcGVydHksIGNvbnRpbnVlIG5vcm1hbCBwcm9jZXNzaW5nXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgY29tcG9uZW50IHN1Z2dlc3Rpb24gaW5mb1xuICAgICAqL1xuICAgIHByaXZhdGUgZ2VuZXJhdGVDb21wb25lbnRTdWdnZXN0aW9uKHJlcXVlc3RlZFR5cGU6IHN0cmluZywgYXZhaWxhYmxlVHlwZXM6IHN0cmluZ1tdLCBwcm9wZXJ0eTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgc2ltaWxhciBjb21wb25lbnQgdHlwZXMgZXhpc3RcbiAgICAgICAgY29uc3Qgc2ltaWxhclR5cGVzID0gYXZhaWxhYmxlVHlwZXMuZmlsdGVyKHR5cGUgPT5cbiAgICAgICAgICAgIHR5cGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhyZXF1ZXN0ZWRUeXBlLnRvTG93ZXJDYXNlKCkpIHx8XG4gICAgICAgICAgICByZXF1ZXN0ZWRUeXBlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModHlwZS50b0xvd2VyQ2FzZSgpKVxuICAgICAgICApO1xuXG4gICAgICAgIGxldCBpbnN0cnVjdGlvbiA9ICcnO1xuXG4gICAgICAgIGlmIChzaW1pbGFyVHlwZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCflI0gRm91bmQgc2ltaWxhciBjb21wb25lbnRzOiAke3NpbWlsYXJUeXBlcy5qb2luKCcsICcpfWA7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxu8J+SoSBTdWdnZXN0aW9uOiBQZXJoYXBzIHlvdSBtZWFudCB0byBzZXQgdGhlICcke3NpbWlsYXJUeXBlc1swXX0nIGNvbXBvbmVudD9gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVjb21tZW5kIHBvc3NpYmxlIGNvbXBvbmVudHMgYmFzZWQgb24gcHJvcGVydHkgbmFtZVxuICAgICAgICBjb25zdCBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gICAgICAgICAgICAnc3RyaW5nJzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5FZGl0Qm94J10sXG4gICAgICAgICAgICAndGV4dCc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcbiAgICAgICAgICAgICdmb250U2l6ZSc6IFsnY2MuTGFiZWwnLCAnY2MuUmljaFRleHQnXSxcbiAgICAgICAgICAgICdzcHJpdGVGcmFtZSc6IFsnY2MuU3ByaXRlJ10sXG4gICAgICAgICAgICAnY29sb3InOiBbJ2NjLkxhYmVsJywgJ2NjLlNwcml0ZScsICdjYy5HcmFwaGljcyddLFxuICAgICAgICAgICAgJ25vcm1hbENvbG9yJzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICdwcmVzc2VkQ29sb3InOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgJ3RhcmdldCc6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAnY29udGVudFNpemUnOiBbJ2NjLlVJVHJhbnNmb3JtJ10sXG4gICAgICAgICAgICAnYW5jaG9yUG9pbnQnOiBbJ2NjLlVJVHJhbnNmb3JtJ11cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNvbW1lbmRlZENvbXBvbmVudHMgPSBwcm9wZXJ0eVRvQ29tcG9uZW50TWFwW3Byb3BlcnR5XSB8fCBbXTtcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUmVjb21tZW5kZWQgPSByZWNvbW1lbmRlZENvbXBvbmVudHMuZmlsdGVyKGNvbXAgPT4gYXZhaWxhYmxlVHlwZXMuaW5jbHVkZXMoY29tcCkpO1xuXG4gICAgICAgIGlmIChhdmFpbGFibGVSZWNvbW1lbmRlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+OryBCYXNlZCBvbiBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nLCByZWNvbW1lbmRlZCBjb21wb25lbnRzOiAke2F2YWlsYWJsZVJlY29tbWVuZGVkLmpvaW4oJywgJyl9YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFByb3ZpZGUgb3BlcmF0aW9uIHN1Z2dlc3Rpb25zXG4gICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn5OLIFN1Z2dlc3RlZCBBY3Rpb25zOmA7XG4gICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4xLiBVc2UgZ2V0X2NvbXBvbmVudHMobm9kZVV1aWQ9XCIke3JlcXVlc3RlZFR5cGUuaW5jbHVkZXMoJ3V1aWQnKSA/ICdZT1VSX05PREVfVVVJRCcgOiAnbm9kZVV1aWQnfVwiKSB0byB2aWV3IGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlYDtcbiAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjIuIElmIHlvdSBuZWVkIHRvIGFkZCBhIGNvbXBvbmVudCwgdXNlIGFkZF9jb21wb25lbnQobm9kZVV1aWQ9XCIuLi5cIiwgY29tcG9uZW50VHlwZT1cIiR7cmVxdWVzdGVkVHlwZX1cIilgO1xuICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMy4gVmVyaWZ5IHRoYXQgdGhlIGNvbXBvbmVudCB0eXBlIG5hbWUgaXMgY29ycmVjdCAoY2FzZS1zZW5zaXRpdmUpYDtcblxuICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb247XG4gICAgfVxuXG59XG4iXX0=