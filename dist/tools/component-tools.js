"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const asset_utils_1 = require("../utils/asset-utils");
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
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
                            description: 'Target node UUID, path ("Canvas/Panel/Button"), or unique name. REQUIRED for all actions.'
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
                annotations: { readOnlyHint: true },
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
                            description: 'Node UUID, path, or unique name (required for "get_all" and "get_info" actions)'
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
                        },
                        verbose: {
                            type: 'boolean',
                            description: 'For "get_all"/"get_info": when true, return full property metadata (default, type, readonly, visible, tooltip, etc.). Default false returns a slim shape ({value, type} per property) to avoid huge payloads. Use get_info with verbose=true when you need full metadata for a single component.',
                            default: false
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
                            description: 'Target node UUID, path, or unique name - Must specify the node to operate on'
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
            }
        ];
    }
    async execute(toolName, args) {
        // Every tool here addresses a node by `nodeUuid`; accept a path or unique
        // name there too so callers don't need a separate lookup call first.
        const unresolved = await (0, node_resolver_1.resolveNodeRefFields)(args, ['nodeUuid']);
        if (unresolved) {
            return unresolved;
        }
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
                        return await this.getComponents(args.nodeUuid, args.verbose === true);
                    case 'get_info':
                        return await this.getComponentInfo(args.nodeUuid, args.componentType, args.verbose === true);
                    case 'get_available':
                        return await this.getAvailableComponents(args.category);
                    default:
                        throw new Error(`Unknown action '${action}' for component_query. Valid actions: get_all, get_info, get_available`);
                }
            }
            case 'set_component_property':
                return await this.setComponentProperty(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    /**
     * Match a component by its registered type (cid or built-in class name like "cc.Sprite") OR
     * by a script class name appearing as `<ClassName>` in the component's instance name. Supports
     * both shapes seen across the codebase: extracted (from getComponents) and raw (from query-node).
     */
    static componentMatches(comp, componentType) {
        var _a, _b, _c, _d, _e, _f, _g;
        // A query-node dump carries both the class name (type) and the cid; accept either.
        if (componentType && [comp === null || comp === void 0 ? void 0 : comp.type, comp === null || comp === void 0 ? void 0 : comp.__type__, comp === null || comp === void 0 ? void 0 : comp.cid].includes(componentType))
            return true;
        const instanceName = (_f = (_c = (_b = (_a = comp === null || comp === void 0 ? void 0 : comp.properties) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : (_e = (_d = comp === null || comp === void 0 ? void 0 : comp.value) === null || _d === void 0 ? void 0 : _d.name) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : (_g = comp === null || comp === void 0 ? void 0 : comp.name) === null || _g === void 0 ? void 0 : _g.value;
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
    async getComponents(nodeUuid, verbose = false) {
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
                const properties = this.extractComponentProperties(comp);
                return {
                    type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                    // query-node nests instance uuid at comp.value.uuid.value; keep older shapes as fallback.
                    uuid: ((_b = (_a = comp.value) === null || _a === void 0 ? void 0 : _a.uuid) === null || _b === void 0 ? void 0 : _b.value) || ((_c = comp.uuid) === null || _c === void 0 ? void 0 : _c.value) || comp.uuid || null,
                    enabled: comp.enabled !== undefined ? comp.enabled : true,
                    properties: verbose ? properties : this.slimProperties(properties)
                };
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
    async getComponentInfo(nodeUuid, componentType, verbose = false) {
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
                const properties = this.extractComponentProperties(component);
                return {
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        componentType: componentType,
                        enabled: component.enabled !== undefined ? component.enabled : true,
                        properties: verbose ? properties : this.slimProperties(properties)
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
    /**
     * Reduce a full editor-dump property map to a slim shape.
     * The editor returns each property as a wrapper like
     * { value, default, type, readonly, visible, displayName, tooltip, extends, ... }.
     * Slim mode keeps only the actual value (recursively unwrapping nested wrappers)
     * plus the declared type when non-primitive, dropping the metadata that bloats payloads.
     */
    slimProperties(properties) {
        const slim = {};
        for (const key in properties) {
            slim[key] = this.slimValue(properties[key]);
        }
        return slim;
    }
    slimValue(v) {
        if (v === null || typeof v !== 'object') {
            return v;
        }
        if (Array.isArray(v)) {
            return v.map(item => this.slimValue(item));
        }
        // Editor wrapper: has an own `value` field alongside metadata keys.
        if ('value' in v) {
            const inner = this.slimValue(v.value);
            // For object references (assets/nodes), the type carries meaning; keep it.
            if (inner !== null && typeof inner === 'object' && v.type && typeof v.type === 'string') {
                return { value: inner, type: v.type };
            }
            return inner;
        }
        // Plain nested object without a wrapper: recurse into its fields.
        const out = {};
        for (const k in v) {
            out[k] = this.slimValue(v[k]);
        }
        return out;
    }
    extractComponentProperties(component) {
        // Check if component has value property, which usually contains the actual component properties
        if (component.value && typeof component.value === 'object') {
            return component.value; // Return value object directly, it contains all component properties
        }
        // Fallback: extract properties directly from component object
        const properties = {};
        const excludeKeys = ['__type__', 'enabled', 'node', '_id', '__scriptAsset', 'uuid', 'name', '_name', '_objFlags', '_enabled', 'type', 'readonly', 'visible', 'cid', 'editor', 'extends'];
        for (const key in component) {
            if (!excludeKeys.includes(key) && !key.startsWith('_')) {
                properties[key] = component[key];
            }
        }
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
            // Step 5: Verify the result. `Editor.Message.request` resolves only
            // after the editor has applied the change, so a re-query sees it
            // immediately — no settling delay is needed.
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
            return {
                success: false,
                error: `Failed to attach script '${scriptName}': ${err.message}`,
                instruction: 'Please ensure the script is properly compiled and exported as a Component class. You can also manually attach the script through the Properties panel in the editor.'
            };
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
                    // A primitive property is dumped as its bare value, not as a
                    // {value, type} descriptor — accept both.
                    const isDescriptor = this.isValidPropertyDescriptor(propData);
                    const isPrimitive = propData === null || ['string', 'number', 'boolean'].includes(typeof propData);
                    if (!isDescriptor && !isPrimitive) {
                        continue;
                    }
                    availableProperties.push(key);
                    if (key !== propertyName) {
                        continue;
                    }
                    if (isDescriptor) {
                        const propInfo = propData;
                        // Prefer value property, if not available use propData itself
                        try {
                            const propKeys = Object.keys(propInfo);
                            propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                        }
                        catch (error) {
                            // If check fails, use propInfo directly
                            propertyValue = propInfo;
                        }
                    }
                    else {
                        propertyValue = propData;
                    }
                    propertyExists = true;
                }
            }
            else {
                // Fallback: find directly from properties.
                //
                // The editor dumps a primitive property as its bare value —
                // cc.Label.string arrives as "label", fontSize as 40 — while an
                // object-valued one arrives wrapped as {value, type}. Only
                // descriptors were accepted here, so the most commonly written
                // properties on a component read as "not found".
                for (const [key, propData] of Object.entries(component.properties)) {
                    const isDescriptor = this.isValidPropertyDescriptor(propData);
                    const isPrimitive = propData === null || ['string', 'number', 'boolean'].includes(typeof propData);
                    if (!isDescriptor && !isPrimitive) {
                        continue;
                    }
                    availableProperties.push(key);
                    if (key !== propertyName) {
                        continue;
                    }
                    if (isDescriptor) {
                        const propInfo = propData;
                        // Prefer value property, if not available use propData itself
                        try {
                            const propKeys = Object.keys(propInfo);
                            propertyValue = propKeys.includes('value') ? propInfo.value : propInfo;
                        }
                        catch (error) {
                            // If check fails, use propInfo directly
                            propertyValue = propInfo;
                        }
                    }
                    else {
                        propertyValue = propData;
                    }
                    propertyExists = true;
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
        var _a, _b;
        try {
            // Re-get component info for verification
            const componentInfo = await this.getComponentInfo(nodeUuid, componentType);
            if (componentInfo.success && componentInfo.data) {
                const propertyData = (_a = componentInfo.data.properties) === null || _a === void 0 ? void 0 : _a[property];
                // Extract actual value from property data
                let actualValue = propertyData;
                if (propertyData && typeof propertyData === 'object' && 'value' in propertyData) {
                    actualValue = propertyData.value;
                }
                // Fix verification logic: check if actual value matches expected value
                let verified = false;
                if (typeof expectedValue === 'object' && expectedValue !== null && 'uuid' in expectedValue) {
                    // For reference types (node/component/asset), compare UUID
                    const actualUuid = actualValue && typeof actualValue === 'object' && 'uuid' in actualValue ? actualValue.uuid : '';
                    const expectedUuid = expectedValue.uuid || '';
                    verified = actualUuid === expectedUuid && expectedUuid !== '';
                }
                else {
                    // For other types, compare values directly
                    if (typeof actualValue === typeof expectedValue) {
                        if (typeof actualValue === 'object' && actualValue !== null && expectedValue !== null) {
                            // Deep comparison for object types
                            verified = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
                        }
                        else {
                            // Direct comparison for basic types
                            verified = actualValue === expectedValue;
                        }
                    }
                    else {
                        // Special handling for type mismatch (e.g., number and string)
                        verified = String(actualValue) === String(expectedValue) || Number(actualValue) === Number(expectedValue);
                    }
                }
                return {
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
            }
            logger_1.logger.warn(`[verifyPropertyChange] Could not re-read ${componentType}.${property}: ${componentInfo.error}`);
        }
        catch (error) {
            logger_1.logger.error(`[verifyPropertyChange] Verification failed: ${error instanceof Error ? error.stack : String(error)}`);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzREFBOEQ7QUFDOUQsNERBQXdEO0FBQ3hELDBEQUE4RDtBQUM5RCxzQ0FBbUM7QUFFbkMsTUFBYSxjQUFjO0lBQ3ZCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLDRHQUE0RztnQkFDekgsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDZIQUE2SDs0QkFDMUksSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxlQUFlLENBQUM7eUJBQzNDO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkZBQTJGO3lCQUMzRzt3QkFDRCxhQUFhLEVBQUU7NEJBQ1gsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNRQUFzUTt5QkFDdFI7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyRkFBMkY7eUJBQzNHO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUM7aUJBQ25DO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFO2dCQUNuQyxXQUFXLEVBQUUsaUxBQWlMO2dCQUM5TCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxX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LENBQUMsV0FBVyxDQUFDO1lBQzVCLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsYUFBYSxDQUFDO1lBQ2pELGFBQWEsRUFBRSxDQUFDLFdBQVcsQ0FBQztZQUM1QixjQUFjLEVBQUUsQ0FBQyxXQUFXLENBQUM7WUFDN0IsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO1lBQ3ZCLGFBQWEsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQ2pDLGFBQWEsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1NBQ3BDLENBQUM7UUFFRixNQUFNLHFCQUFxQixHQUFHLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNyRSxNQUFNLG9CQUFvQixHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVqRyxJQUFJLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxXQUFXLElBQUksNkJBQTZCLFFBQVEsOEJBQThCLG9CQUFvQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3hILENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsV0FBVyxJQUFJLDJCQUEyQixDQUFDO1FBQzNDLFdBQVcsSUFBSSxxQ0FBcUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFVBQVUsdUNBQXVDLENBQUM7UUFDMUosV0FBVyxJQUFJLHlGQUF5RixhQUFhLElBQUksQ0FBQztRQUMxSCxXQUFXLElBQUksc0VBQXNFLENBQUM7UUFFdEYsT0FBTyxXQUFXLENBQUM7SUFDdkIsQ0FBQztDQUVKO0FBL3RERCx3Q0ErdERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBDb21wb25lbnRJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZVNwcml0ZUZyYW1lVXVpZCB9IGZyb20gJy4uL3V0aWxzL2Fzc2V0LXV0aWxzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyByZXNvbHZlTm9kZVJlZkZpZWxkcyB9IGZyb20gJy4uL3V0aWxzL25vZGUtcmVzb2x2ZXInO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcblxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29tcG9uZW50X21hbmFnZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgY29tcG9uZW50cyBvbiBub2RlczogYWRkLCByZW1vdmUsIG9yIGF0dGFjaCBzY3JpcHRzLiBBdmFpbGFibGUgYWN0aW9uczogYWRkLCByZW1vdmUsIGF0dGFjaF9zY3JpcHQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0uIE1VU1QgYmUgb25lIG9mOiBcImFkZFwiLCBcInJlbW92ZVwiLCBcImF0dGFjaF9zY3JpcHRcIi4gVXNlIFwicmVtb3ZlXCIgKG5vdCBcImRlbGV0ZVwiKSB0byByZW1vdmUgYSBjb21wb25lbnQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FkZCcsICdyZW1vdmUnLCAnYXR0YWNoX3NjcmlwdCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBub2RlIFVVSUQsIHBhdGggKFwiQ2FudmFzL1BhbmVsL0J1dHRvblwiKSwgb3IgdW5pcXVlIG5hbWUuIFJFUVVJUkVEIGZvciBhbGwgYWN0aW9ucy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgKHVzZWQgYnkgXCJhZGRcIiBhbmQgXCJyZW1vdmVcIiBhY3Rpb25zKS4gRm9yIFwiYWRkXCI6IGUuZy4sIGNjLlNwcml0ZSwgY2MuTGFiZWwsIGNjLkJ1dHRvbi4gRm9yIFwicmVtb3ZlXCI6IG11c3QgYmUgdGhlIGNvbXBvbmVudFxcJ3MgY2xhc3NJZCAoY2lkLCBpLmUuIHRoZSB0eXBlIGZpZWxkIGZyb20gZ2V0X2FsbCksIG5vdCB0aGUgc2NyaXB0IG5hbWUgb3IgY2xhc3MgbmFtZS4gVXNlIGdldF9hbGwgdG8gZ2V0IHRoZSBjb3JyZWN0IGNpZC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NyaXB0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NyaXB0IGFzc2V0IHBhdGggKHVzZWQgYnkgXCJhdHRhY2hfc2NyaXB0XCIgYWN0aW9uKS4gZS5nLiwgZGI6Ly9hc3NldHMvc2NyaXB0cy9NeVNjcmlwdC50cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJywgJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb21wb25lbnRfcXVlcnknLFxuICAgICAgICAgICAgICAgIGFubm90YXRpb25zOiB7IHJlYWRPbmx5SGludDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgY29tcG9uZW50IGluZm9ybWF0aW9uOiBnZXQgYWxsIGNvbXBvbmVudHMgb24gYSBub2RlLCBnZXQgc3BlY2lmaWMgY29tcG9uZW50IGluZm8sIG9yIGxpc3QgYXZhaWxhYmxlIGNvbXBvbmVudCB0eXBlcy4gQXZhaWxhYmxlIGFjdGlvbnM6IGdldF9hbGwsIGdldF9pbmZvLCBnZXRfYXZhaWxhYmxlLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9hbGwnLCAnZ2V0X2luZm8nLCAnZ2V0X2F2YWlsYWJsZSddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCwgcGF0aCwgb3IgdW5pcXVlIG5hbWUgKHJlcXVpcmVkIGZvciBcImdldF9hbGxcIiBhbmQgXCJnZXRfaW5mb1wiIGFjdGlvbnMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIHRvIGdldCBpbmZvIGZvciAocmVxdWlyZWQgZm9yIFwiZ2V0X2luZm9cIiBhY3Rpb24pJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2F0ZWdvcnkgZmlsdGVyICh1c2VkIGJ5IFwiZ2V0X2F2YWlsYWJsZVwiIGFjdGlvbiknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3JlbmRlcmVyJywgJ3VpJywgJ3BoeXNpY3MnLCAnYW5pbWF0aW9uJywgJ2F1ZGlvJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJib3NlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yIFwiZ2V0X2FsbFwiL1wiZ2V0X2luZm9cIjogd2hlbiB0cnVlLCByZXR1cm4gZnVsbCBwcm9wZXJ0eSBtZXRhZGF0YSAoZGVmYXVsdCwgdHlwZSwgcmVhZG9ubHksIHZpc2libGUsIHRvb2x0aXAsIGV0Yy4pLiBEZWZhdWx0IGZhbHNlIHJldHVybnMgYSBzbGltIHNoYXBlICh7dmFsdWUsIHR5cGV9IHBlciBwcm9wZXJ0eSkgdG8gYXZvaWQgaHVnZSBwYXlsb2Fkcy4gVXNlIGdldF9pbmZvIHdpdGggdmVyYm9zZT10cnVlIHdoZW4geW91IG5lZWQgZnVsbCBtZXRhZGF0YSBmb3IgYSBzaW5nbGUgY29tcG9uZW50LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldCBjb21wb25lbnQgcHJvcGVydHkgdmFsdWVzIGZvciBVSSBjb21wb25lbnRzIG9yIGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cy4gU3VwcG9ydHMgc2V0dGluZyBwcm9wZXJ0aWVzIG9mIGJ1aWx0LWluIFVJIGNvbXBvbmVudHMgKGUuZy4sIGNjLkxhYmVsLCBjYy5TcHJpdGUpIGFuZCBjdXN0b20gc2NyaXB0IGNvbXBvbmVudHMuIE5vdGU6IEZvciBub2RlIGJhc2ljIHByb3BlcnRpZXMgKG5hbWUsIGFjdGl2ZSwgbGF5ZXIsIGV0Yy4pLCB1c2Ugc2V0X25vZGVfcHJvcGVydHkuIEZvciBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIChwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlLCBldGMuKSwgdXNlIHNldF9ub2RlX3RyYW5zZm9ybS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IG5vZGUgVVVJRCwgcGF0aCwgb3IgdW5pcXVlIG5hbWUgLSBNdXN0IHNwZWNpZnkgdGhlIG5vZGUgdG8gb3BlcmF0ZSBvbidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSAtIENhbiBiZSBidWlsdC1pbiBjb21wb25lbnRzIChlLmcuLCBjYy5MYWJlbCkgb3IgY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzIChlLmcuLCBNeVNjcmlwdCkuIElmIHVuc3VyZSBhYm91dCBjb21wb25lbnQgdHlwZSwgdXNlIGdldF9jb21wb25lbnRzIGZpcnN0IHRvIHJldHJpZXZlIGFsbCBjb21wb25lbnRzIG9uIHRoZSBub2RlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGVudW0gcmVzdHJpY3Rpb24sIGFsbG93IGFueSBjb21wb25lbnQgdHlwZSBpbmNsdWRpbmcgY3VzdG9tIHNjcmlwdHNcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgbmFtZSB0byBzZXQuIElmIHVuc3VyZSwgdXNlIGNvbXBvbmVudF9xdWVyeSBnZXRfaW5mbyBmaXJzdCB0byBsaXN0IGFjdHVhbCBwcm9wZXJ0aWVzLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RhdGEgdHlwZSBvZiB0aGUgdmFsdWUsIG11c3QgbWF0Y2ggcHJvcGVydHlUeXBlLT52YWx1ZSBmb3JtYXQgYmVsb3cuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzdHJpbmcnLCAnbnVtYmVyJywgJ2Jvb2xlYW4nLCAnaW50ZWdlcicsICdmbG9hdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb2xvcicsICd2ZWMyJywgJ3ZlYzMnLCAnc2l6ZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlJywgJ2NvbXBvbmVudCcsICdzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnYXNzZXRBcnJheScsICdzcHJpdGVGcmFtZUFycmF5J1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lT2Y6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2Jvb2xlYW4nIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ29iamVjdCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYXJyYXknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ251bGwnIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9ybWF0IHBlciBwcm9wZXJ0eVR5cGU6IHN0cmluZy9udW1iZXIvYm9vbGVhbiBsaXRlcmFsIGFzLWlzLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbG9yOiB7cixnLGIsYX0gMC0yNTUgb3IgXCIjRkYwMDAwXCIuIHZlYzI6IHt4LHl9LiB2ZWMzOiB7eCx5LHp9LiBzaXplOiB7d2lkdGgsaGVpZ2h0fS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdub2RlL3Nwcml0ZUZyYW1lL3ByZWZhYi9hc3NldDogdGFyZ2V0IFVVSUQgc3RyaW5nIChnZXRfYWxsX25vZGVzL2Fzc2V0IGJyb3dzZXIgdG8gZmluZCBpdCkuICcgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnY29tcG9uZW50OiBVVUlEIG9mIHRoZSBOT0RFIGhvbGRpbmcgdGhlIHRhcmdldCBjb21wb25lbnQgKHR5cGUgYXV0by1kZXRlY3RlZCBmcm9tIHByb3BlcnR5IG1ldGFkYXRhLCByZXNvbHZlZCB0byBpdHMgc2NlbmUgX19pZF9fKS4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcqQXJyYXkgdmFyaWFudHM6IEpTT04gYXJyYXkgb2YgdGhlIGFib3ZlIChlLmcuIG51bWJlckFycmF5OiBbMSwyLDNdLCBub2RlQXJyYXk6IFtcInV1aWQxXCIsXCJ1dWlkMlwiXSkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJywgJ3Byb3BlcnR5JywgJ3Byb3BlcnR5VHlwZScsICd2YWx1ZSddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gRXZlcnkgdG9vbCBoZXJlIGFkZHJlc3NlcyBhIG5vZGUgYnkgYG5vZGVVdWlkYDsgYWNjZXB0IGEgcGF0aCBvciB1bmlxdWVcbiAgICAgICAgLy8gbmFtZSB0aGVyZSB0b28gc28gY2FsbGVycyBkb24ndCBuZWVkIGEgc2VwYXJhdGUgbG9va3VwIGNhbGwgZmlyc3QuXG4gICAgICAgIGNvbnN0IHVucmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlTm9kZVJlZkZpZWxkcyhhcmdzLCBbJ25vZGVVdWlkJ10pO1xuICAgICAgICBpZiAodW5yZXNvbHZlZCkgeyByZXR1cm4gdW5yZXNvbHZlZDsgfVxuXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudF9tYW5hZ2UnOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZW1vdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2F0dGFjaF9zY3JpcHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYXR0YWNoU2NyaXB0KGFyZ3Mubm9kZVV1aWQsIGFyZ3Muc2NyaXB0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FjdGlvbn0nIGZvciBjb21wb25lbnRfbWFuYWdlLiBWYWxpZCBhY3Rpb25zOiBhZGQsIHJlbW92ZSwgYXR0YWNoX3NjcmlwdGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudF9xdWVyeSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfYWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMoYXJncy5ub2RlVXVpZCwgYXJncy52ZXJib3NlID09PSB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50SW5mbyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUsIGFyZ3MudmVyYm9zZSA9PT0gdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9hdmFpbGFibGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXZhaWxhYmxlQ29tcG9uZW50cyhhcmdzLmNhdGVnb3J5KTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gJyR7YWN0aW9ufScgZm9yIGNvbXBvbmVudF9xdWVyeS4gVmFsaWQgYWN0aW9uczogZ2V0X2FsbCwgZ2V0X2luZm8sIGdldF9hdmFpbGFibGVgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdzZXRfY29tcG9uZW50X3Byb3BlcnR5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRDb21wb25lbnRQcm9wZXJ0eShhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBNYXRjaCBhIGNvbXBvbmVudCBieSBpdHMgcmVnaXN0ZXJlZCB0eXBlIChjaWQgb3IgYnVpbHQtaW4gY2xhc3MgbmFtZSBsaWtlIFwiY2MuU3ByaXRlXCIpIE9SXG4gICAgICogYnkgYSBzY3JpcHQgY2xhc3MgbmFtZSBhcHBlYXJpbmcgYXMgYDxDbGFzc05hbWU+YCBpbiB0aGUgY29tcG9uZW50J3MgaW5zdGFuY2UgbmFtZS4gU3VwcG9ydHNcbiAgICAgKiBib3RoIHNoYXBlcyBzZWVuIGFjcm9zcyB0aGUgY29kZWJhc2U6IGV4dHJhY3RlZCAoZnJvbSBnZXRDb21wb25lbnRzKSBhbmQgcmF3IChmcm9tIHF1ZXJ5LW5vZGUpLlxuICAgICAqL1xuICAgIHByaXZhdGUgc3RhdGljIGNvbXBvbmVudE1hdGNoZXMoY29tcDogYW55LCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgICAgLy8gQSBxdWVyeS1ub2RlIGR1bXAgY2FycmllcyBib3RoIHRoZSBjbGFzcyBuYW1lICh0eXBlKSBhbmQgdGhlIGNpZDsgYWNjZXB0IGVpdGhlci5cbiAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgJiYgW2NvbXA/LnR5cGUsIGNvbXA/Ll9fdHlwZV9fLCBjb21wPy5jaWRdLmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgY29uc3QgaW5zdGFuY2VOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPVxuICAgICAgICAgICAgY29tcD8ucHJvcGVydGllcz8ubmFtZT8udmFsdWUgPz8gY29tcD8udmFsdWU/Lm5hbWU/LnZhbHVlID8/IGNvbXA/Lm5hbWU/LnZhbHVlO1xuICAgICAgICByZXR1cm4gdHlwZW9mIGluc3RhbmNlTmFtZSA9PT0gJ3N0cmluZycgJiYgaW5zdGFuY2VOYW1lLmVuZHNXaXRoKGA8JHtjb21wb25lbnRUeXBlfT5gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBGaXJzdCBjaGVjayBpZiB0aGUgY29tcG9uZW50IGFscmVhZHkgZXhpc3RzIG9uIHRoZSBub2RlXG4gICAgICAgIGNvbnN0IGFsbENvbXBvbmVudHNJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgaWYgKGFsbENvbXBvbmVudHNJbmZvLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdDb21wb25lbnQgPSBhbGxDb21wb25lbnRzSW5mby5kYXRhLmNvbXBvbmVudHMuZmluZCgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZ0NvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIGFscmVhZHkgZXhpc3RzIG9uIG5vZGVgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VmVyaWZpZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBUcnkgYWRkaW5nIGNvbXBvbmVudCBkaXJlY3RseSB1c2luZyBFZGl0b3IgQVBJXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAvLyBSZS1xdWVyeSBub2RlIGluZm8gdG8gdmVyaWZ5IGNvbXBvbmVudCB3YXMgYWN0dWFsbHkgYWRkZWRcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8yID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8yLnN1Y2Nlc3MgJiYgYWxsQ29tcG9uZW50c0luZm8yLmRhdGE/LmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWRkZWRDb21wb25lbnQgPSBhbGxDb21wb25lbnRzSW5mbzIuZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gQ29tcG9uZW50VG9vbHMuY29tcG9uZW50TWF0Y2hlcyhjb21wLCBjb21wb25lbnRUeXBlKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhZGRlZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIGFkZGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFZlcmlmaWVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgd2FzIG5vdCBmb3VuZCBvbiBub2RlIGFmdGVyIGFkZGl0aW9uLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthbGxDb21wb25lbnRzSW5mbzIuZGF0YS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHZlcmlmeSBjb21wb25lbnQgYWRkaXRpb246ICR7YWxsQ29tcG9uZW50c0luZm8yLmVycm9yIHx8ICdVbmFibGUgdG8gZ2V0IG5vZGUgY29tcG9uZW50cyd9YFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKHZlcmlmeUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gdmVyaWZ5IGNvbXBvbmVudCBhZGRpdGlvbjogJHt2ZXJpZnlFcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHVzZSBzY2VuZSBzY3JpcHRcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FkZENvbXBvbmVudFRvTm9kZScsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IGFzIFRvb2xSZXNwb25zZTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmVDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gMS4gRmluZCBhbGwgY29tcG9uZW50cyBvbiB0aGUgbm9kZVxuICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgIGlmICghYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyB8fCAhYWxsQ29tcG9uZW50c0luZm8uZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBjb21wb25lbnRzIGZvciBub2RlICcke25vZGVVdWlkfSc6ICR7YWxsQ29tcG9uZW50c0luZm8uZXJyb3J9YCB9O1xuICAgICAgICB9XG4gICAgICAgIC8vIDIuIEZpbmQgdGhlIGNvbXBvbmVudCBpbnN0YW5jZSDigJQgbWF0Y2ggYnkgY2lkIE9SIHNjcmlwdCBjbGFzcyBuYW1lICh2aWEgaW5zdGFuY2UgbmFtZSBzdWZmaXgpLlxuICAgICAgICBjb25zdCBtYXRjaGVkID0gYWxsQ29tcG9uZW50c0luZm8uZGF0YS5jb21wb25lbnRzLmZpbmQoKGNvbXA6IGFueSkgPT4gQ29tcG9uZW50VG9vbHMuY29tcG9uZW50TWF0Y2hlcyhjb21wLCBjb21wb25lbnRUeXBlKSk7XG4gICAgICAgIGlmICghbWF0Y2hlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICcke2NvbXBvbmVudFR5cGV9JyBub3QgZm91bmQgb24gbm9kZSAnJHtub2RlVXVpZH0nLiBQYXNzIGVpdGhlciB0aGUgcmVnaXN0ZXJlZCBjaWQgKGZyb20gZ2V0X2FsbCkgb3IgdGhlIHNjcmlwdCBjbGFzcyBuYW1lLmAgfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb21wb25lbnRJbnN0YW5jZVV1aWQ6IHN0cmluZyB8IG51bGwgPSBtYXRjaGVkLnV1aWQ7XG4gICAgICAgIGlmICghY29tcG9uZW50SW5zdGFuY2VVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyBvbiBub2RlICcke25vZGVVdWlkfScgaGFzIG5vIGluc3RhbmNlIHV1aWQ7IGNhbm5vdCByZW1vdmUuYCB9O1xuICAgICAgICB9XG4gICAgICAgIC8vIDMuIFJlbW92ZSB2aWEgb2ZmaWNpYWwgQVBJLiBSZW1vdmVDb21wb25lbnRPcHRpb25zLnV1aWQgaXMgdGhlIENPTVBPTkVOVCBpbnN0YW5jZSB1dWlkLCBub3QgdGhlIG5vZGUgdXVpZC5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogY29tcG9uZW50SW5zdGFuY2VVdWlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIDQuIFF1ZXJ5IGFnYWluIHRvIGNvbmZpcm0gcmVtb3ZhbFxuICAgICAgICAgICAgY29uc3QgYWZ0ZXJSZW1vdmVJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNvbnN0IHN0aWxsRXhpc3RzID0gYWZ0ZXJSZW1vdmVJbmZvLnN1Y2Nlc3MgJiYgYWZ0ZXJSZW1vdmVJbmZvLmRhdGE/LmNvbXBvbmVudHM/LnNvbWUoKGNvbXA6IGFueSkgPT4gQ29tcG9uZW50VG9vbHMuY29tcG9uZW50TWF0Y2hlcyhjb21wLCBjb21wb25lbnRUeXBlKSk7XG4gICAgICAgICAgICBpZiAoc3RpbGxFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2lkICcke2NvbXBvbmVudFR5cGV9JyB3YXMgbm90IHJlbW92ZWQgZnJvbSBub2RlICcke25vZGVVdWlkfScuYCB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50IGNpZCAnJHtjb21wb25lbnRUeXBlfScgcmVtb3ZlZCBzdWNjZXNzZnVsbHkgZnJvbSBub2RlICcke25vZGVVdWlkfSdgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIHJlbW92ZSBjb21wb25lbnQ6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRzKG5vZGVVdWlkOiBzdHJpbmcsIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIFRyeSBxdWVyeWluZyBub2RlIGluZm8gZGlyZWN0bHkgdXNpbmcgRWRpdG9yIEFQSSBmaXJzdFxuICAgICAgICBsZXQgbm9kZURhdGE6IGFueTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXROb2RlSW5mbycsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGVEYXRhICYmIG5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gcXVlcnktbm9kZSBuZXN0cyBpbnN0YW5jZSB1dWlkIGF0IGNvbXAudmFsdWUudXVpZC52YWx1ZTsga2VlcCBvbGRlciBzaGFwZXMgYXMgZmFsbGJhY2suXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGNvbXAudmFsdWU/LnV1aWQ/LnZhbHVlIHx8IGNvbXAudXVpZD8udmFsdWUgfHwgY29tcC51dWlkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gY29tcC5lbmFibGVkIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogdmVyYm9zZSA/IHByb3BlcnRpZXMgOiB0aGlzLnNsaW1Qcm9wZXJ0aWVzKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3Igbm8gY29tcG9uZW50cyBkYXRhJyB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgdmVyYm9zZTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gVHJ5IHF1ZXJ5aW5nIG5vZGUgaW5mbyBkaXJlY3RseSB1c2luZyBFZGl0b3IgQVBJIGZpcnN0XG4gICAgICAgIGxldCBub2RlRGF0YTogYW55O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbm9kZURhdGEgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHVzZSBzY2VuZSBzY3JpcHRcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWRdXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC5kYXRhLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gcmVzdWx0LmRhdGEuY29tcG9uZW50cy5maW5kKChjb21wOiBhbnkpID0+IENvbXBvbmVudFRvb2xzLmNvbXBvbmVudE1hdGNoZXMoY29tcCwgY29tcG9uZW50VHlwZSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLmNvbXBvbmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQuZXJyb3IgfHwgJ0ZhaWxlZCB0byBnZXQgY29tcG9uZW50IGluZm8nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyMjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZURhdGEgJiYgbm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlRGF0YS5fX2NvbXBzX18uZmluZCgoY29tcDogYW55KSA9PiBDb21wb25lbnRUb29scy5jb21wb25lbnRNYXRjaGVzKGNvbXAsIGNvbXBvbmVudFR5cGUpKTtcblxuICAgICAgICAgICAgaWYgKGNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RDb21wb25lbnRQcm9wZXJ0aWVzKGNvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXBvbmVudC5lbmFibGVkICE9PSB1bmRlZmluZWQgPyBjb21wb25lbnQuZW5hYmxlZCA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB2ZXJib3NlID8gcHJvcGVydGllcyA6IHRoaXMuc2xpbVByb3BlcnRpZXMocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScgbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCBvciBubyBjb21wb25lbnRzIGRhdGEnIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZWR1Y2UgYSBmdWxsIGVkaXRvci1kdW1wIHByb3BlcnR5IG1hcCB0byBhIHNsaW0gc2hhcGUuXG4gICAgICogVGhlIGVkaXRvciByZXR1cm5zIGVhY2ggcHJvcGVydHkgYXMgYSB3cmFwcGVyIGxpa2VcbiAgICAgKiB7IHZhbHVlLCBkZWZhdWx0LCB0eXBlLCByZWFkb25seSwgdmlzaWJsZSwgZGlzcGxheU5hbWUsIHRvb2x0aXAsIGV4dGVuZHMsIC4uLiB9LlxuICAgICAqIFNsaW0gbW9kZSBrZWVwcyBvbmx5IHRoZSBhY3R1YWwgdmFsdWUgKHJlY3Vyc2l2ZWx5IHVud3JhcHBpbmcgbmVzdGVkIHdyYXBwZXJzKVxuICAgICAqIHBsdXMgdGhlIGRlY2xhcmVkIHR5cGUgd2hlbiBub24tcHJpbWl0aXZlLCBkcm9wcGluZyB0aGUgbWV0YWRhdGEgdGhhdCBibG9hdHMgcGF5bG9hZHMuXG4gICAgICovXG4gICAgcHJpdmF0ZSBzbGltUHJvcGVydGllcyhwcm9wZXJ0aWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUmVjb3JkPHN0cmluZywgYW55PiB7XG4gICAgICAgIGNvbnN0IHNsaW06IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcGVydGllcykge1xuICAgICAgICAgICAgc2xpbVtrZXldID0gdGhpcy5zbGltVmFsdWUocHJvcGVydGllc1trZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc2xpbTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHNsaW1WYWx1ZSh2OiBhbnkpOiBhbnkge1xuICAgICAgICBpZiAodiA9PT0gbnVsbCB8fCB0eXBlb2YgdiAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiB2O1xuICAgICAgICB9XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHYpKSB7XG4gICAgICAgICAgICByZXR1cm4gdi5tYXAoaXRlbSA9PiB0aGlzLnNsaW1WYWx1ZShpdGVtKSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRWRpdG9yIHdyYXBwZXI6IGhhcyBhbiBvd24gYHZhbHVlYCBmaWVsZCBhbG9uZ3NpZGUgbWV0YWRhdGEga2V5cy5cbiAgICAgICAgaWYgKCd2YWx1ZScgaW4gdikge1xuICAgICAgICAgICAgY29uc3QgaW5uZXIgPSB0aGlzLnNsaW1WYWx1ZSh2LnZhbHVlKTtcbiAgICAgICAgICAgIC8vIEZvciBvYmplY3QgcmVmZXJlbmNlcyAoYXNzZXRzL25vZGVzKSwgdGhlIHR5cGUgY2FycmllcyBtZWFuaW5nOyBrZWVwIGl0LlxuICAgICAgICAgICAgaWYgKGlubmVyICE9PSBudWxsICYmIHR5cGVvZiBpbm5lciA9PT0gJ29iamVjdCcgJiYgdi50eXBlICYmIHR5cGVvZiB2LnR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IGlubmVyLCB0eXBlOiB2LnR5cGUgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbm5lcjtcbiAgICAgICAgfVxuICAgICAgICAvLyBQbGFpbiBuZXN0ZWQgb2JqZWN0IHdpdGhvdXQgYSB3cmFwcGVyOiByZWN1cnNlIGludG8gaXRzIGZpZWxkcy5cbiAgICAgICAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgICAgIGZvciAoY29uc3QgayBpbiB2KSB7XG4gICAgICAgICAgICBvdXRba10gPSB0aGlzLnNsaW1WYWx1ZSh2W2tdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIHByaXZhdGUgZXh0cmFjdENvbXBvbmVudFByb3BlcnRpZXMoY29tcG9uZW50OiBhbnkpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgY29tcG9uZW50IGhhcyB2YWx1ZSBwcm9wZXJ0eSwgd2hpY2ggdXN1YWxseSBjb250YWlucyB0aGUgYWN0dWFsIGNvbXBvbmVudCBwcm9wZXJ0aWVzXG4gICAgICAgIGlmIChjb21wb25lbnQudmFsdWUgJiYgdHlwZW9mIGNvbXBvbmVudC52YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudmFsdWU7IC8vIFJldHVybiB2YWx1ZSBvYmplY3QgZGlyZWN0bHksIGl0IGNvbnRhaW5zIGFsbCBjb21wb25lbnQgcHJvcGVydGllc1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmFsbGJhY2s6IGV4dHJhY3QgcHJvcGVydGllcyBkaXJlY3RseSBmcm9tIGNvbXBvbmVudCBvYmplY3RcbiAgICAgICAgY29uc3QgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICBjb25zdCBleGNsdWRlS2V5cyA9IFsnX190eXBlX18nLCAnZW5hYmxlZCcsICdub2RlJywgJ19pZCcsICdfX3NjcmlwdEFzc2V0JywgJ3V1aWQnLCAnbmFtZScsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnX2VuYWJsZWQnLCAndHlwZScsICdyZWFkb25seScsICd2aXNpYmxlJywgJ2NpZCcsICdlZGl0b3InLCAnZXh0ZW5kcyddO1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIGNvbXBvbmVudCkge1xuICAgICAgICAgICAgaWYgKCFleGNsdWRlS2V5cy5pbmNsdWRlcyhrZXkpICYmICFrZXkuc3RhcnRzV2l0aCgnXycpKSB7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllc1trZXldID0gY29tcG9uZW50W2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHJvcGVydGllcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZpbmRDb21wb25lbnRUeXBlQnlVdWlkKGNvbXBvbmVudFV1aWQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgICAgICBsb2dnZXIuaW5mbyhgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlIHdpdGggVVVJRDogJHtjb21wb25lbnRVdWlkfWApO1xuICAgICAgICBpZiAoIWNvbXBvbmVudFV1aWQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBub2RlVHJlZSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKCFub2RlVHJlZSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdbZmluZENvbXBvbmVudFR5cGVCeVV1aWRdIEZhaWxlZCB0byBxdWVyeSBub2RlIHRyZWUuJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHF1ZXVlOiBhbnlbXSA9IFtub2RlVHJlZV07XG5cbiAgICAgICAgICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudE5vZGVJbmZvID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnROb2RlSW5mbyB8fCAhY3VycmVudE5vZGVJbmZvLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbE5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIGN1cnJlbnROb2RlSW5mby51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZ1bGxOb2RlRGF0YSAmJiBmdWxsTm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgZnVsbE5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBBbnkgPSBjb21wIGFzIGFueTsgLy8gQ2FzdCB0byBhbnkgdG8gYWNjZXNzIGR5bmFtaWMgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjb21wb25lbnQgVVVJRCBpcyBuZXN0ZWQgaW4gdGhlICd2YWx1ZScgcHJvcGVydHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcEFueS51dWlkICYmIGNvbXBBbnkudXVpZC52YWx1ZSA9PT0gY29tcG9uZW50VXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wb25lbnRUeXBlID0gY29tcEFueS5fX3R5cGVfXztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRm91bmQgY29tcG9uZW50IHR5cGUgJyR7Y29tcG9uZW50VHlwZX0nIGZvciBVVUlEICR7Y29tcG9uZW50VXVpZH0gb24gbm9kZSAke2Z1bGxOb2RlRGF0YS5uYW1lPy52YWx1ZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudFR5cGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgW2ZpbmRDb21wb25lbnRUeXBlQnlVdWlkXSBDb3VsZCBub3QgcXVlcnkgbm9kZSAke2N1cnJlbnROb2RlSW5mby51dWlkfTogJHsoZSBhcyBhbnkpPy5tZXNzYWdlID8/IFN0cmluZyhlKX1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY3VycmVudE5vZGVJbmZvLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGNoaWxkKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbG9nZ2VyLndhcm4oYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gQ29tcG9uZW50IHdpdGggVVVJRCAke2NvbXBvbmVudFV1aWR9IG5vdCBmb3VuZCBpbiBzY2VuZSB0cmVlLmApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtmaW5kQ29tcG9uZW50VHlwZUJ5VXVpZF0gRXJyb3Igd2hpbGUgc2VhcmNoaW5nIGZvciBjb21wb25lbnQgdHlwZTogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldENvbXBvbmVudFByb3BlcnR5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlIH0gPSBhcmdzO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX0gKHR5cGU6ICR7cHJvcGVydHlUeXBlfSkgPSAke0pTT04uc3RyaW5naWZ5KHZhbHVlKX0gb24gbm9kZSAke25vZGVVdWlkfWApO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDA6IERldGVjdCBpZiB0aGlzIGlzIGEgbm9kZSBwcm9wZXJ0eSwgcmVkaXJlY3QgdG8gY29ycmVzcG9uZGluZyBub2RlIG1ldGhvZCBpZiBzb1xuICAgICAgICAgICAgY29uc3Qgbm9kZVJlZGlyZWN0UmVzdWx0ID0gYXdhaXQgdGhpcy5jaGVja0FuZFJlZGlyZWN0Tm9kZVByb3BlcnRpZXMoYXJncyk7XG4gICAgICAgICAgICBpZiAobm9kZVJlZGlyZWN0UmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5vZGVSZWRpcmVjdFJlc3VsdDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAxOiBHZXQgY29tcG9uZW50IGluZm8gdXNpbmcgdGhlIHNhbWUgbWV0aG9kIGFzIGdldENvbXBvbmVudHNcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0Q29tcG9uZW50cyhub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudHNSZXNwb25zZS5zdWNjZXNzIHx8ICFjb21wb25lbnRzUmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgY29tcG9uZW50cyBmb3Igbm9kZSAnJHtub2RlVXVpZH0nOiAke2NvbXBvbmVudHNSZXNwb25zZS5lcnJvcn1gLFxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB2ZXJpZnkgdGhhdCBub2RlIFVVSUQgJyR7bm9kZVV1aWR9JyBpcyBjb3JyZWN0LiBVc2UgZ2V0X2FsbF9ub2RlcyBvciBmaW5kX25vZGVfYnlfbmFtZSB0byBnZXQgdGhlIGNvcnJlY3Qgbm9kZSBVVUlELmBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhbGxDb21wb25lbnRzID0gY29tcG9uZW50c1Jlc3BvbnNlLmRhdGEuY29tcG9uZW50cztcblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBGaW5kIHRhcmdldCBjb21wb25lbnRcbiAgICAgICAgICAgIC8vIE1hdGNoIGJ5IGNpZCBmaXJzdCAodGhlIGNhbm9uaWNhbCBpZCBzdXJmYWNlZCBhcyBgY29tcC50eXBlYCkuXG4gICAgICAgICAgICAvLyBDdXN0b20tc2NyaXB0IGNvbXBvbmVudHMgc3VyZmFjZSBhcyBjaWQgKGUuZy4gXCIxYmQxMEVMQ2ZCUGNaMEk3eHFZRjJSa1wiKSwgc28gYWxzb1xuICAgICAgICAgICAgLy8gYWNjZXB0IGEgc2NyaXB0IGNsYXNzIG5hbWUgYnkgbWF0Y2hpbmcgdGhlIGA8Q2xhc3NOYW1lPmAgc3VmZml4IGluIHRoZSBjb21wb25lbnQnc1xuICAgICAgICAgICAgLy8gaW5zdGFuY2UgbmFtZSAoQ29jb3MgZm9ybWF0cyBpdCBhcyBcIjxOb2RlTmFtZT48Q2xhc3NOYW1lPlwiKS5cbiAgICAgICAgICAgIGxldCB0YXJnZXRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlVHlwZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBjb25zdCBjbGFzc1N1ZmZpeCA9IGA8JHtjb21wb25lbnRUeXBlfT5gO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFsbENvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gYWxsQ29tcG9uZW50c1tpXTtcbiAgICAgICAgICAgICAgICBhdmFpbGFibGVUeXBlcy5wdXNoKGNvbXAudHlwZSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoY29tcC50eXBlID09PSBjb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldENvbXBvbmVudCA9IGNvbXA7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gY29tcD8ucHJvcGVydGllcz8ubmFtZT8udmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpbnN0YW5jZU5hbWUgPT09ICdzdHJpbmcnICYmIGluc3RhbmNlTmFtZS5lbmRzV2l0aChjbGFzc1N1ZmZpeCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Q29tcG9uZW50ID0gY29tcDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXRhcmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIC8vIFByb3ZpZGUgbW9yZSBkZXRhaWxlZCBlcnJvciBpbmZvIGFuZCBzdWdnZXN0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGluc3RydWN0aW9uID0gdGhpcy5nZW5lcmF0ZUNvbXBvbmVudFN1Z2dlc3Rpb24oY29tcG9uZW50VHlwZSwgYXZhaWxhYmxlVHlwZXMsIHByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlLiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVUeXBlcy5qb2luKCcsICcpfWAsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBpbnN0cnVjdGlvblxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogQXV0by1kZXRlY3QgYW5kIGNvbnZlcnQgcHJvcGVydHkgdmFsdWVzXG4gICAgICAgICAgICBsZXQgcHJvcGVydHlJbmZvO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBBbmFseXppbmcgcHJvcGVydHk6ICR7cHJvcGVydHl9YCk7XG4gICAgICAgICAgICAgICAgcHJvcGVydHlJbmZvID0gdGhpcy5hbmFseXplUHJvcGVydHkodGFyZ2V0Q29tcG9uZW50LCBwcm9wZXJ0eSk7XG4gICAgICAgICAgICB9IGNhdGNoIChhbmFseXplRXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBpbiBhbmFseXplUHJvcGVydHk6ICR7YW5hbHl6ZUVycm9yPy5tZXNzYWdlID8/IFN0cmluZyhhbmFseXplRXJyb3IpfWApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBhbmFseXplIHByb3BlcnR5ICcke3Byb3BlcnR5fSc6ICR7YW5hbHl6ZUVycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghcHJvcGVydHlJbmZvLmV4aXN0cykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgbm90IGZvdW5kIG9uIGNvbXBvbmVudCAnJHtjb21wb25lbnRUeXBlfScuIEF2YWlsYWJsZSBwcm9wZXJ0aWVzOiAke3Byb3BlcnR5SW5mby5hdmFpbGFibGVQcm9wZXJ0aWVzLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTdGVwIDQ6IFByb2Nlc3MgcHJvcGVydHkgdmFsdWVzIGFuZCBhcHBseSBzZXR0aW5nc1xuICAgICAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsVmFsdWUgPSBwcm9wZXJ0eUluZm8ub3JpZ2luYWxWYWx1ZTtcblxuICAgICAgICAgICAgICAgIC8vIFByZS1jaGVjazogbnVsbCBvcmlnaW5hbCB2YWx1ZSBtZWFucyB0eXBlIGNhbm5vdCBiZSByZWxpYWJseSB2ZXJpZmllZFxuICAgICAgICAgICAgICAgIGNvbnN0IHdhc051bGwgPSBvcmlnaW5hbFZhbHVlID09PSBudWxsIHx8IG9yaWdpbmFsVmFsdWUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjb25zdCByZWZlcmVuY2VUeXBlcyA9IFsnbm9kZScsICdjb21wb25lbnQnLCAnc3ByaXRlRnJhbWUnLCAncHJlZmFiJywgJ2Fzc2V0JywgJ25vZGVBcnJheScsICdhc3NldEFycmF5JywgJ3Nwcml0ZUZyYW1lQXJyYXknXTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1JlZmVyZW5jZVR5cGUgPSByZWZlcmVuY2VUeXBlcy5pbmNsdWRlcyhwcm9wZXJ0eVR5cGUpO1xuXG4gICAgICAgICAgICAgICAgbGV0IHByb2Nlc3NlZFZhbHVlOiBhbnk7XG5cbiAgICAgICAgICAgICAgICAvLyBQcm9jZXNzIHByb3BlcnR5IHZhbHVlcyBiYXNlZCBvbiBleHBsaWNpdCBwcm9wZXJ0eVR5cGVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHByb3BlcnR5VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxuICAgICAgICAgICAgICAgICAgICBjYXNlICdmbG9hdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IEJvb2xlYW4odmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbG9yJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RyaW5nIGZvcm1hdDogc3VwcG9ydHMgaGV4LCBjb2xvciBuYW1lcywgcmdiKCkvcmdiYSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB0aGlzLnBhcnNlQ29sb3JTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gT2JqZWN0IGZvcm1hdDogdmFsaWRhdGUgYW5kIGNvbnZlcnQgUkdCQSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUucikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcih2YWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKHZhbHVlLmIpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogdmFsdWUuYSAhPT0gdW5kZWZpbmVkID8gTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIodmFsdWUuYSkpKSA6IDI1NVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29sb3IgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCByLCBnLCBiIHByb3BlcnRpZXMgb3IgYSBoZXhhZGVjaW1hbCBzdHJpbmcgKGUuZy4sIFwiI0ZGMDAwMFwiKScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZlYzInOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcih2YWx1ZS55KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMyIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmVjMyc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIodmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogTnVtYmVyKHZhbHVlLnkpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcih2YWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWZWMzIHZhbHVlIG11c3QgYmUgYW4gb2JqZWN0IHdpdGggeCwgeSwgeiBwcm9wZXJ0aWVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiB2YWx1ZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NpemUgdmFsdWUgbXVzdCBiZSBhbiBvYmplY3Qgd2l0aCB3aWR0aCwgaGVpZ2h0IHByb3BlcnRpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdub2RlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSByZWZlcmVuY2UgdmFsdWUgbXVzdCBiZSBhIHN0cmluZyBVVUlEJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29tcG9uZW50IHJlZmVyZW5jZXMgbmVlZCBzcGVjaWFsIGhhbmRsaW5nOiBmaW5kIGNvbXBvbmVudCBfX2lkX18gdmlhIG5vZGUgVVVJRFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWU7IC8vIFNhdmUgbm9kZSBVVUlEIGZpcnN0LCB3aWxsIGJlIGNvbnZlcnRlZCB0byBfX2lkX18gbGF0ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb21wb25lbnQgcmVmZXJlbmNlIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgKG5vZGUgVVVJRCBjb250YWluaW5nIHRoZSB0YXJnZXQgY29tcG9uZW50KScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lJzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nwcml0ZUZyYW1lIHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgVVVJRCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1jb252ZXJ0IFRleHR1cmUyRCBVVUlEIOKGkiBTcHJpdGVGcmFtZSBVVUlEXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZlJlc3VsdCA9IGF3YWl0IHJlc29sdmVTcHJpdGVGcmFtZVV1aWQodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNmUmVzdWx0LmNvbnZlcnRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIEF1dG8tY29udmVydGVkIFRleHR1cmUyRCBVVUlEIHRvIFNwcml0ZUZyYW1lOiAke3ZhbHVlfSDihpIgJHtzZlJlc3VsdC51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHNmUmVzdWx0LnV1aWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ByZWZhYic6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB7IHV1aWQ6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwcm9wZXJ0eVR5cGV9IHZhbHVlIG11c3QgYmUgYSBzdHJpbmcgVVVJRGApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ25vZGVBcnJheSc6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzZWRWYWx1ZSA9IHZhbHVlLm1hcCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGl0ZW0gfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZUFycmF5IGl0ZW1zIG11c3QgYmUgc3RyaW5nIFVVSURzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbG9yQXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmIGl0ZW0gIT09IG51bGwgJiYgJ3InIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaXRlbS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyByOiAyNTUsIGc6IDI1NSwgYjogMjU1LCBhOiAyNTUgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbG9yQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlckFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IE51bWJlcihpdGVtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTnVtYmVyQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZ0FycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gdmFsdWUubWFwKChpdGVtOiBhbnkpID0+IFN0cmluZyhpdGVtKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignU3RyaW5nQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2Fzc2V0QXJyYXknOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvY2Vzc2VkVmFsdWUgPSB2YWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBpdGVtIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnICYmIGl0ZW0gIT09IG51bGwgJiYgJ3V1aWQnIGluIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWQ6IGl0ZW0udXVpZCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NldEFycmF5IGl0ZW1zIG11c3QgYmUgc3RyaW5nIFVVSURzIG9yIG9iamVjdHMgd2l0aCB1dWlkIHByb3BlcnR5Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBc3NldEFycmF5IHZhbHVlIG11c3QgYmUgYW4gYXJyYXknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzcHJpdGVGcmFtZUFycmF5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3NlZFZhbHVlID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWQgPSB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgPyBpdGVtIDogKGl0ZW0gJiYgaXRlbS51dWlkID8gaXRlbS51dWlkIDogbnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTcHJpdGVGcmFtZUFycmF5IGl0ZW1zIG11c3QgYmUgc3RyaW5nIFVVSURzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2ZSZXN1bHQgPSBhd2FpdCByZXNvbHZlU3ByaXRlRnJhbWVVdWlkKHV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2ZSZXN1bHQuY29udmVydGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBBdXRvLWNvbnZlcnRlZCBUZXh0dXJlMkQgVVVJRCB0byBTcHJpdGVGcmFtZTogJHt1dWlkfSDihpIgJHtzZlJlc3VsdC51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIChwcm9jZXNzZWRWYWx1ZSBhcyBhbnlbXSkucHVzaCh7IHV1aWQ6IHNmUmVzdWx0LnV1aWQgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Nwcml0ZUZyYW1lQXJyYXkgdmFsdWUgbXVzdCBiZSBhbiBhcnJheScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHByb3BlcnR5IHR5cGU6ICR7cHJvcGVydHlUeXBlfWApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIENvbnZlcnRpbmcgdmFsdWU6ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSAtPiAke0pTT04uc3RyaW5naWZ5KHByb2Nlc3NlZFZhbHVlKX0gKHR5cGU6ICR7cHJvcGVydHlUeXBlfSlgKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBQcm9wZXJ0eSBhbmFseXNpcyByZXN1bHQ6IHByb3BlcnR5SW5mby50eXBlPVwiJHtwcm9wZXJ0eUluZm8udHlwZX1cIiwgcHJvcGVydHlUeXBlPVwiJHtwcm9wZXJ0eVR5cGV9XCJgKTtcbiAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBXaWxsIHVzZSBjb2xvciBzcGVjaWFsIGhhbmRsaW5nOiAke3Byb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnfWApO1xuXG4gICAgICAgICAgICAgICAgLy8gQWN0dWFsIGV4cGVjdGVkIHZhbHVlIGZvciB2ZXJpZmljYXRpb24gKG5lZWRzIHNwZWNpYWwgaGFuZGxpbmcgZm9yIGNvbXBvbmVudCByZWZlcmVuY2VzKVxuICAgICAgICAgICAgICAgIGxldCBhY3R1YWxFeHBlY3RlZFZhbHVlID0gcHJvY2Vzc2VkVmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyBTdGVwIDVhOiBWYWxpZGF0ZSByZWZlcmVuY2UgVVVJRHMgZXhpc3QgYmVmb3JlIHNldHRpbmdcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldFJlZlR5cGVzID0gWydzcHJpdGVGcmFtZScsICdwcmVmYWInLCAnYXNzZXQnXTtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldEFycmF5VHlwZXMgPSBbJ2Fzc2V0QXJyYXknLCAnc3ByaXRlRnJhbWVBcnJheSddO1xuICAgICAgICAgICAgICAgIGlmIChhc3NldFJlZlR5cGVzLmluY2x1ZGVzKHByb3BlcnR5VHlwZSkgJiYgcHJvY2Vzc2VkVmFsdWU/LnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWlzc2luZyA9IGF3YWl0IHRoaXMudmFsaWRhdGVSZWZlcmVuY2VVdWlkcyhbcHJvY2Vzc2VkVmFsdWUudXVpZF0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBVVUlEICcke21pc3NpbmdbMF19JyBkb2VzIG5vdCBleGlzdCBpbiBhc3NldCBkYXRhYmFzZS4gVGhlIGFzc2V0IG1heSBoYXZlIGJlZW4gZGVsZXRlZCBvciBtb3ZlZC5gIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFzc2V0QXJyYXlUeXBlcy5pbmNsdWRlcyhwcm9wZXJ0eVR5cGUpICYmIEFycmF5LmlzQXJyYXkocHJvY2Vzc2VkVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWRzID0gcHJvY2Vzc2VkVmFsdWUubWFwKChpdGVtOiBhbnkpID0+IGl0ZW0/LnV1aWQpLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWlzc2luZyA9IGF3YWl0IHRoaXMudmFsaWRhdGVSZWZlcmVuY2VVdWlkcyh1dWlkcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IFVVSUQocykgbm90IGZvdW5kIGluIGFzc2V0IGRhdGFiYXNlOiAke21pc3Npbmcuam9pbignLCAnKX0uIFRoZXNlIGFzc2V0cyBtYXkgaGF2ZSBiZWVuIGRlbGV0ZWQgb3IgbW92ZWQuYCB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlJyAmJiBwcm9jZXNzZWRWYWx1ZT8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlRXhpc3RzID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHByb2Nlc3NlZFZhbHVlLnV1aWQpLnRoZW4oKG46IGFueSkgPT4gISFuKS5jYXRjaCgoKSA9PiBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbm9kZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBVVUlEICcke3Byb2Nlc3NlZFZhbHVlLnV1aWR9JyBkb2VzIG5vdCBleGlzdCBpbiBjdXJyZW50IHNjZW5lLmAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFN0ZXAgNTogR2V0IG9yaWdpbmFsIG5vZGUgZGF0YSB0byBidWlsZCBjb3JyZWN0IHBhdGhcbiAgICAgICAgICAgICAgICBjb25zdCByYXdOb2RlRGF0YSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFyYXdOb2RlRGF0YSB8fCAhcmF3Tm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGdldCByYXcgbm9kZSBkYXRhIGZvciBwcm9wZXJ0eSBzZXR0aW5nYFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEZpbmQgb3JpZ2luYWwgY29tcG9uZW50IGluZGV4LiBNYXRjaCBieSBjaWQgZmlyc3QsIHRoZW4gYnkgY2xhc3MtbmFtZSBzdWZmaXhcbiAgICAgICAgICAgICAgICAvLyBpbiB0aGUgY29tcG9uZW50J3MgaW5zdGFuY2UgbmFtZSAocmF3IHF1ZXJ5LW5vZGUgc2hhcGU6IGNvbXAudmFsdWUubmFtZS52YWx1ZSkuXG4gICAgICAgICAgICAgICAgbGV0IHJhd0NvbXBvbmVudEluZGV4ID0gLTE7XG4gICAgICAgICAgICAgICAgY29uc3QgY2xhc3NTdWZmaXhGb3JSYXcgPSBgPCR7Y29tcG9uZW50VHlwZX0+YDtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJhd05vZGVEYXRhLl9fY29tcHNfXy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gcmF3Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZSB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wVHlwZSA9PT0gY29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmF3Q29tcG9uZW50SW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFuY2VOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBjb21wPy52YWx1ZT8ubmFtZT8udmFsdWUgPz8gY29tcD8ubmFtZT8udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaW5zdGFuY2VOYW1lID09PSAnc3RyaW5nJyAmJiBpbnN0YW5jZU5hbWUuZW5kc1dpdGgoY2xhc3NTdWZmaXhGb3JSYXcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByYXdDb21wb25lbnRJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChyYXdDb21wb25lbnRJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb3VsZCBub3QgZmluZCBjb21wb25lbnQgaW5kZXggZm9yIHNldHRpbmcgcHJvcGVydHlgXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU25hcHNob3Qgbm9uLW51bGwgcHJvcGVydGllcyBiZWZvcmUgY2hhbmdlXG4gICAgICAgICAgICAgICAgY29uc3QgYmVmb3JlTm9uTnVsbCA9IHRoaXMuc25hcHNob3ROb25OdWxsUHJvcHMocmF3Tm9kZURhdGEuX19jb21wc19fW3Jhd0NvbXBvbmVudEluZGV4XSk7XG5cbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBjb3JyZWN0IHByb3BlcnR5IHBhdGhcbiAgICAgICAgICAgICAgICBsZXQgcHJvcGVydHlQYXRoID0gYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS4ke3Byb3BlcnR5fWA7XG5cbiAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBhc3NldC10eXBlIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICBpZiAocHJvcGVydHlUeXBlID09PSAnYXNzZXQnIHx8IHByb3BlcnR5VHlwZSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBwcm9wZXJ0eVR5cGUgPT09ICdwcmVmYWInIHx8XG4gICAgICAgICAgICAgICAgICAgIChwcm9wZXJ0eUluZm8udHlwZSA9PT0gJ2Fzc2V0JyAmJiBwcm9wZXJ0eVR5cGUgPT09ICdzdHJpbmcnKSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIFNldHRpbmcgYXNzZXQgcmVmZXJlbmNlOiAke0pTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBwcm9jZXNzZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZTogcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoXG4gICAgICAgICAgICAgICAgICAgIH0pfWApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIERldGVybWluZSBhc3NldCB0eXBlIGJhc2VkIG9uIHByb3BlcnR5IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFzc2V0VHlwZSA9ICdjYy5TcHJpdGVGcmFtZSc7IC8vIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnR5LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RleHR1cmUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLlRleHR1cmUyRCc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbWF0ZXJpYWwnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlID0gJ2NjLk1hdGVyaWFsJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdmb250JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5Gb250JztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCdjbGlwJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5BdWRpb0NsaXAnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ3ByZWZhYicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZSA9ICdjYy5QcmVmYWInO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5VSVRyYW5zZm9ybScgJiYgKHByb3BlcnR5ID09PSAnX2NvbnRlbnRTaXplJyB8fCBwcm9wZXJ0eSA9PT0gJ2NvbnRlbnRTaXplJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgVUlUcmFuc2Zvcm0gY29udGVudFNpemUgLSBzZXQgd2lkdGggYW5kIGhlaWdodCBzZXBhcmF0ZWx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gTnVtYmVyKHZhbHVlLndpZHRoKSB8fCAxMDA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IE51bWJlcih2YWx1ZS5oZWlnaHQpIHx8IDEwMDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgd2lkdGggZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LndpZHRoYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHdpZHRoIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlbiBzZXQgaGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogYF9fY29tcHNfXy4ke3Jhd0NvbXBvbmVudEluZGV4fS5oZWlnaHRgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogaGVpZ2h0IH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21wb25lbnRUeXBlID09PSAnY2MuVUlUcmFuc2Zvcm0nICYmIChwcm9wZXJ0eSA9PT0gJ19hbmNob3JQb2ludCcgfHwgcHJvcGVydHkgPT09ICdhbmNob3JQb2ludCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFVJVHJhbnNmb3JtIGFuY2hvclBvaW50IC0gc2V0IGFuY2hvclggYW5kIGFuY2hvclkgc2VwYXJhdGVseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbmNob3JYID0gTnVtYmVyKHZhbHVlLngpIHx8IDAuNTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYW5jaG9yWSA9IE51bWJlcih2YWx1ZS55KSB8fCAwLjU7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGFuY2hvclggZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvclhgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYW5jaG9yWCB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZW4gc2V0IGFuY2hvcllcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7cmF3Q29tcG9uZW50SW5kZXh9LmFuY2hvcllgLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYW5jaG9yWSB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnY29sb3InICYmIHByb2Nlc3NlZFZhbHVlICYmIHR5cGVvZiBwcm9jZXNzZWRWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29sb3IgcHJvcGVydGllcywgZW5zdXJlIFJHQkEgdmFsdWVzIGFyZSBjb3JyZWN0XG4gICAgICAgICAgICAgICAgICAgIC8vIENvY29zIENyZWF0b3IgY29sb3IgdmFsdWVzIHJhbmdlIGlzIDAtMjU1XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbG9yVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5nKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBiOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5iKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiBwcm9jZXNzZWRWYWx1ZS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihwcm9jZXNzZWRWYWx1ZS5hKSkpIDogMjU1XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBjb2xvciB2YWx1ZTogJHtKU09OLnN0cmluZ2lmeShjb2xvclZhbHVlKX1gKTtcblxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29sb3JWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuQ29sb3InXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAndmVjMycgJiYgcHJvY2Vzc2VkVmFsdWUgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBWZWMzIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVjM1ZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueSkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHo6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS56KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZlYzNWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICd2ZWMyJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFZlYzIgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZWMyVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUueCkgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IE51bWJlcihwcm9jZXNzZWRWYWx1ZS55KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZlYzJWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdzaXplJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIFNpemUgcHJvcGVydGllc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzaXplVmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogTnVtYmVyKHByb2Nlc3NlZFZhbHVlLndpZHRoKSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBOdW1iZXIocHJvY2Vzc2VkVmFsdWUuaGVpZ2h0KSB8fCAwXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHNpemVWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuU2l6ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlJyAmJiBwcm9jZXNzZWRWYWx1ZSAmJiB0eXBlb2YgcHJvY2Vzc2VkVmFsdWUgPT09ICdvYmplY3QnICYmICd1dWlkJyBpbiBwcm9jZXNzZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBub2RlIHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBub2RlIHJlZmVyZW5jZSB3aXRoIFVVSUQ6ICR7cHJvY2Vzc2VkVmFsdWUudXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcm9wZXJ0eVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb2Nlc3NlZFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Ob2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ2NvbXBvbmVudCcgJiYgdHlwZW9mIHByb2Nlc3NlZFZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb21wb25lbnQgcmVmZXJlbmNlczogZmluZCBjb21wb25lbnQgX19pZF9fIHZpYSBub2RlIFVVSURcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0Tm9kZVV1aWQgPSBwcm9jZXNzZWRWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gU2V0dGluZyBjb21wb25lbnQgcmVmZXJlbmNlIC0gZmluZGluZyBjb21wb25lbnQgb24gbm9kZTogJHt0YXJnZXROb2RlVXVpZH1gKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZXhwZWN0ZWQgY29tcG9uZW50IHR5cGUgZnJvbSBjdXJyZW50IGNvbXBvbmVudCBwcm9wZXJ0eSBtZXRhZGF0YVxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29tcG9uZW50IGRldGFpbHMgaW5jbHVkaW5nIHByb3BlcnR5IG1ldGFkYXRhXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb21wb25lbnRJbmZvID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRDb21wb25lbnRJbmZvLnN1Y2Nlc3MgJiYgY3VycmVudENvbXBvbmVudEluZm8uZGF0YT8ucHJvcGVydGllcz8uW3Byb3BlcnR5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcGVydHlNZXRhID0gY3VycmVudENvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzW3Byb3BlcnR5XTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBjb21wb25lbnQgdHlwZSBpbmZvIGZyb20gcHJvcGVydHkgbWV0YWRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU1ldGEgJiYgdHlwZW9mIHByb3BlcnR5TWV0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIHR5cGUgZmllbGQgaW5kaWNhdGluZyBjb21wb25lbnQgdHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU1ldGEudHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBwcm9wZXJ0eU1ldGEudHlwZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5TWV0YS5jdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNvbWUgcHJvcGVydGllcyBtYXkgdXNlIGN0b3IgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb21wb25lbnRUeXBlID0gcHJvcGVydHlNZXRhLmN0b3I7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU1ldGEuZXh0ZW5kcyAmJiBBcnJheS5pc0FycmF5KHByb3BlcnR5TWV0YS5leHRlbmRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBleHRlbmRzIGFycmF5LCB1c3VhbGx5IHRoZSBmaXJzdCBpcyB0aGUgbW9zdCBzcGVjaWZpYyB0eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXh0ZW5kVHlwZSBvZiBwcm9wZXJ0eU1ldGEuZXh0ZW5kcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGV4dGVuZFR5cGUuc3RhcnRzV2l0aCgnY2MuJykgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLkNvbXBvbmVudCcgJiYgZXh0ZW5kVHlwZSAhPT0gJ2NjLk9iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZENvbXBvbmVudFR5cGUgPSBleHRlbmRUeXBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHBlY3RlZENvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGRldGVybWluZSByZXF1aXJlZCBjb21wb25lbnQgdHlwZSBmb3IgcHJvcGVydHkgJyR7cHJvcGVydHl9JyBvbiBjb21wb25lbnQgJyR7Y29tcG9uZW50VHlwZX0nLiBQcm9wZXJ0eSBtZXRhZGF0YSBtYXkgbm90IGNvbnRhaW4gdHlwZSBpbmZvcm1hdGlvbi5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIERldGVjdGVkIHJlcXVpcmVkIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX0gZm9yIHByb3BlcnR5OiAke3Byb3BlcnR5fWApO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGFyZ2V0IG5vZGUgY29tcG9uZW50IGluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldE5vZGVEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHRhcmdldE5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdGFyZ2V0Tm9kZURhdGEgfHwgIXRhcmdldE5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzYCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByaW50IHRhcmdldCBub2RlIGNvbXBvbmVudCBvdmVydmlld1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gVGFyZ2V0IG5vZGUgJHt0YXJnZXROb2RlVXVpZH0gaGFzICR7dGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLmxlbmd0aH0gY29tcG9uZW50czpgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldE5vZGVEYXRhLl9fY29tcHNfXy5mb3JFYWNoKChjb21wOiBhbnksIGluZGV4OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUlkID0gY29tcC52YWx1ZSAmJiBjb21wLnZhbHVlLnV1aWQgJiYgY29tcC52YWx1ZS51dWlkLnZhbHVlID8gY29tcC52YWx1ZS51dWlkLnZhbHVlIDogJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIENvbXBvbmVudCAke2luZGV4fTogJHtjb21wLnR5cGV9IChzY2VuZV9pZDogJHtzY2VuZUlkfSlgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIGNvcnJlc3BvbmRpbmcgY29tcG9uZW50XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFyZ2V0Q29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb21wb25lbnRJZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgc3BlY2lmaWVkIHR5cGUgb2YgY29tcG9uZW50IGluIHRhcmdldCBub2RlIF9jb21wb25lbnRzIGFycmF5XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3RlOiBfX2NvbXBzX18gYW5kIF9jb21wb25lbnRzIGluZGljZXMgY29ycmVzcG9uZCB0byBlYWNoIG90aGVyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZWFyY2hpbmcgZm9yIGNvbXBvbmVudCB0eXBlOiAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YXJnZXROb2RlRGF0YS5fX2NvbXBzX18ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fW2ldIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBDaGVja2luZyBjb21wb25lbnQgJHtpfTogdHlwZT0ke2NvbXAudHlwZX0sIHRhcmdldD0ke2V4cGVjdGVkQ29tcG9uZW50VHlwZX1gKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnR5cGUgPT09IGV4cGVjdGVkQ29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRDb21wb25lbnQgPSBjb21wO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBGb3VuZCBtYXRjaGluZyBjb21wb25lbnQgYXQgaW5kZXggJHtpfTogJHtjb21wLnR5cGV9YCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBzY2VuZSBJRCBmcm9tIGNvbXBvbmVudCB2YWx1ZS51dWlkLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudElkID0gY29tcC52YWx1ZS51dWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gR290IGNvbXBvbmVudElkIGZyb20gY29tcC52YWx1ZS51dWlkLnZhbHVlOiAke2NvbXBvbmVudElkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYFtDb21wb25lbnRUb29sc10gQ29tcG9uZW50IHN0cnVjdHVyZTogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVmFsdWU6ICEhY29tcC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNVdWlkOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzVXVpZFZhbHVlOiAhIShjb21wLnZhbHVlICYmIGNvbXAudmFsdWUudXVpZCAmJiBjb21wLnZhbHVlLnV1aWQudmFsdWUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRTdHJ1Y3R1cmU6IGNvbXAudmFsdWUgPyBjb21wLnZhbHVlLnV1aWQgOiAnTm8gdmFsdWUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIGV4dHJhY3QgY29tcG9uZW50IElEIGZyb20gY29tcG9uZW50IHN0cnVjdHVyZWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRhcmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIG5vdCBmb3VuZCwgbGlzdCBhdmFpbGFibGUgY29tcG9uZW50cyBmb3IgdXNlciByZWZlcmVuY2UsIHNob3dpbmcgcmVhbCBzY2VuZSBJRHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVDb21wb25lbnRzID0gdGFyZ2V0Tm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55LCBpbmRleDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzY2VuZUlkID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgc2NlbmUgSUQgZnJvbSBjb21wb25lbnQgdmFsdWUudXVpZC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcC52YWx1ZSAmJiBjb21wLnZhbHVlLnV1aWQgJiYgY29tcC52YWx1ZS51dWlkLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY2VuZUlkID0gY29tcC52YWx1ZS51dWlkLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgJHtjb21wLnR5cGV9KHNjZW5lX2lkOiR7c2NlbmVJZH0pYDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENvbXBvbmVudCB0eXBlICcke2V4cGVjdGVkQ29tcG9uZW50VHlwZX0nIG5vdCBmb3VuZCBvbiBub2RlICR7dGFyZ2V0Tm9kZVV1aWR9LiBBdmFpbGFibGUgY29tcG9uZW50czogJHthdmFpbGFibGVDb21wb25lbnRzLmpvaW4oJywgJyl9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQ29tcG9uZW50VG9vbHNdIEZvdW5kIGNvbXBvbmVudCAke2V4cGVjdGVkQ29tcG9uZW50VHlwZX0gd2l0aCBzY2VuZSBJRDogJHtjb21wb25lbnRJZH0gb24gbm9kZSAke3RhcmdldE5vZGVVdWlkfWApO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXhwZWN0ZWQgdmFsdWUgdG8gYWN0dWFsIGNvbXBvbmVudCBJRCBvYmplY3QgZm9ybWF0IGZvciBzdWJzZXF1ZW50IHZlcmlmaWNhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsRXhwZWN0ZWRWYWx1ZSA9IHsgdXVpZDogY29tcG9uZW50SWQgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHVzaW5nIHNhbWUgZm9ybWF0IGFzIG5vZGUvYXNzZXQgcmVmZXJlbmNlczoge3V1aWQ6IGNvbXBvbmVudElkfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGVzdCB0byBzZWUgaWYgY29tcG9uZW50IHJlZmVyZW5jZSBjYW4gYmUgc2V0IGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHV1aWQ6IGNvbXBvbmVudElkIH0sICAvLyBVc2Ugb2JqZWN0IGZvcm1hdCwgbGlrZSBub2RlL2Fzc2V0IHJlZmVyZW5jZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogZXhwZWN0ZWRDb21wb25lbnRUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgW0NvbXBvbmVudFRvb2xzXSBFcnJvciBzZXR0aW5nIGNvbXBvbmVudCByZWZlcmVuY2U6ICR7KGVycm9yIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShwcm9jZXNzZWRWYWx1ZSkgJiZcbiAgICAgICAgICAgICAgICAgICAgWydub2RlQXJyYXknLCAnYXNzZXRBcnJheScsICdzcHJpdGVGcmFtZUFycmF5JywgJ2NvbG9yQXJyYXknLCAnbnVtYmVyQXJyYXknLCAnc3RyaW5nQXJyYXknXS5pbmNsdWRlcyhwcm9wZXJ0eVR5cGUpXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENvY29zIGBzZXQtcHJvcGVydHlgIHdpdGggYGR1bXAudmFsdWUgPSBbaXRlbXNdYCBkb2VzIE5PVCBhdXRvLWV4dGVuZCB0aGUgYXJyYXlcbiAgICAgICAgICAgICAgICAgICAgLy8gYmV5b25kIGl0cyBjdXJyZW50IGxlbmd0aDsgc3VycGx1cyBpdGVtcyBhcmUgc2lsZW50bHkgZHJvcHBlZC4gU2V0IHBlci1pbmRleCB1c2luZ1xuICAgICAgICAgICAgICAgICAgICAvLyBwYXRoIGA8cHJvcGVydHlQYXRoPi48aT5gIHNvIENvY29zIGV4dGVuZHMgdGhlIGFycmF5IGFzIG5lZWRlZC5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnRUeXBlID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdub2RlQXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50VHlwZSA9ICdjYy5Ob2RlJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdjb2xvckFycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFR5cGUgPSAnY2MuQ29sb3InO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ251bWJlckFycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudFR5cGUgPSAnTnVtYmVyJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdzdHJpbmdBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRUeXBlID0gJ1N0cmluZyc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnc3ByaXRlRnJhbWVBcnJheScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnRUeXBlID0gJ2NjLlNwcml0ZUZyYW1lJztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eVR5cGUgPT09ICdhc3NldEFycmF5Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5mZXIgYXNzZXQgZWxlbWVudCB0eXBlIGZyb20gcHJvcGVydHkgbmFtZSAobWlycm9ycyBzaW5nbGUtYXNzZXQgaGV1cmlzdGljcykuXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50VHlwZSA9ICdjYy5Bc3NldCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb3dlciA9IHByb3BlcnR5LnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobG93ZXIuaW5jbHVkZXMoJ2F0bGFzJykpIGVsZW1lbnRUeXBlID0gJ2NjLlNwcml0ZUF0bGFzJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyLmluY2x1ZGVzKCdzcHJpdGVmcmFtZScpKSBlbGVtZW50VHlwZSA9ICdjYy5TcHJpdGVGcmFtZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlci5pbmNsdWRlcygndGV4dHVyZScpKSBlbGVtZW50VHlwZSA9ICdjYy5UZXh0dXJlMkQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAobG93ZXIuaW5jbHVkZXMoJ21hdGVyaWFsJykpIGVsZW1lbnRUeXBlID0gJ2NjLk1hdGVyaWFsJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKGxvd2VyLmluY2x1ZGVzKCdjbGlwJykpIGVsZW1lbnRUeXBlID0gJ2NjLkF1ZGlvQ2xpcCc7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlci5pbmNsdWRlcygncHJlZmFiJykpIGVsZW1lbnRUeXBlID0gJ2NjLlByZWZhYic7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChsb3dlci5pbmNsdWRlcygnZm9udCcpKSBlbGVtZW50VHlwZSA9ICdjYy5Gb250JztcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vcm1hbGl6ZSBjb2xvckFycmF5IGl0ZW1zIChjbGFtcCAwLTI1NSwgZW5zdXJlIGFscGhhKS5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBwcm9wZXJ0eVR5cGUgPT09ICdjb2xvckFycmF5J1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBwcm9jZXNzZWRWYWx1ZS5tYXAoKGl0ZW06IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIHR5cGVvZiBpdGVtID09PSAnb2JqZWN0JyAmJiAncicgaW4gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcjogTWF0aC5taW4oMjU1LCBNYXRoLm1heCgwLCBOdW1iZXIoaXRlbS5yKSB8fCAwKSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmcpIHx8IDApKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6IE1hdGgubWluKDI1NSwgTWF0aC5tYXgoMCwgTnVtYmVyKGl0ZW0uYikgfHwgMCkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYTogaXRlbS5hICE9PSB1bmRlZmluZWQgPyBNYXRoLm1pbigyNTUsIE1hdGgubWF4KDAsIE51bWJlcihpdGVtLmEpKSkgOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcjogMjU1LCBnOiAyNTUsIGI6IDI1NSwgYTogMjU1IH07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBwcm9jZXNzZWRWYWx1ZTtcblxuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0NvbXBvbmVudFRvb2xzXSBTZXR0aW5nICR7cHJvcGVydHlUeXBlfSBwZXItaW5kZXggKCR7aXRlbXMubGVuZ3RofSBpdGVtcywgZWxlbWVudFR5cGU9JHtlbGVtZW50VHlwZX0pYCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgJHtwcm9wZXJ0eVBhdGh9LiR7aX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW1zW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBlbGVtZW50VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIHByb3BlcnR5IHNldHRpbmcgZm9yIG5vbi1hc3NldCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogcHJvY2Vzc2VkVmFsdWUgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTdGVwIDU6IFZlcmlmeSB0aGUgcmVzdWx0LiBgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdGAgcmVzb2x2ZXMgb25seVxuICAgICAgICAgICAgICAgIC8vIGFmdGVyIHRoZSBlZGl0b3IgaGFzIGFwcGxpZWQgdGhlIGNoYW5nZSwgc28gYSByZS1xdWVyeSBzZWVzIGl0XG4gICAgICAgICAgICAgICAgLy8gaW1tZWRpYXRlbHkg4oCUIG5vIHNldHRsaW5nIGRlbGF5IGlzIG5lZWRlZC5cblxuICAgICAgICAgICAgICAgIGNvbnN0IHZlcmlmaWNhdGlvbiA9IGF3YWl0IHRoaXMudmVyaWZ5UHJvcGVydHlDaGFuZ2Uobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBvcmlnaW5hbFZhbHVlLCBhY3R1YWxFeHBlY3RlZFZhbHVlKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBsb3N0IHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICBsZXQgbG9zdFByb3BlcnRpZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWZ0ZXJSYXdEYXRhID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFmdGVyUmF3RGF0YT8uX19jb21wc19fPy5bcmF3Q29tcG9uZW50SW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhZnRlck5vbk51bGwgPSB0aGlzLnNuYXBzaG90Tm9uTnVsbFByb3BzKGFmdGVyUmF3RGF0YS5fX2NvbXBzX19bcmF3Q29tcG9uZW50SW5kZXhdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvc3RQcm9wZXJ0aWVzID0gYmVmb3JlTm9uTnVsbC5maWx0ZXIoKHA6IHN0cmluZykgPT4gcCAhPT0gcHJvcGVydHkgJiYgIWFmdGVyTm9uTnVsbC5pbmNsdWRlcyhwKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlIHNuYXBzaG90IGVycm9ycyAqLyB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN0aWxsTnVsbCA9IHZlcmlmaWNhdGlvbi5hY3R1YWxWYWx1ZSA9PT0gbnVsbCB8fCB2ZXJpZmljYXRpb24uYWN0dWFsVmFsdWUgPT09IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGNvbnN0IG51bGxTZXRGYWlsZWQgPSB3YXNOdWxsICYmIGlzUmVmZXJlbmNlVHlwZSAmJiBzdGlsbE51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogIW51bGxTZXRGYWlsZWQsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbnVsbFNldEZhaWxlZFxuICAgICAgICAgICAgICAgICAgICA/IGBTZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fSBmYWlsZWQg4oCUIHZhbHVlIGlzIHN0aWxsIG51bGwgYWZ0ZXIgb3BlcmF0aW9uYFxuICAgICAgICAgICAgICAgICAgICA6IGBTdWNjZXNzZnVsbHkgc2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZTogdmVyaWZpY2F0aW9uLmFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VWZXJpZmllZDogdmVyaWZpY2F0aW9uLnZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICAuLi4od2FzTnVsbCAmJiBpc1JlZmVyZW5jZVR5cGUgJiYgeyBudWxsV2FybmluZzogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgd2FzIG51bGwgYmVmb3JlIHNldCDigJQgdmVyaWZ5IHByb3BlcnR5VHlwZSAnJHtwcm9wZXJ0eVR5cGV9JyBpcyBjb3JyZWN0YCB9KSxcbiAgICAgICAgICAgICAgICAgICAgLi4uKGxvc3RQcm9wZXJ0aWVzLmxlbmd0aCA+IDAgJiYgeyBsb3N0UHJvcGVydGllcywgd2FybmluZzogYFByb3BlcnRpZXMgbG9zdCBhZnRlciBjaGFuZ2U6ICR7bG9zdFByb3BlcnRpZXMuam9pbignLCAnKX1gIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYFtDb21wb25lbnRUb29sc10gRXJyb3Igc2V0dGluZyBwcm9wZXJ0eTogJHtlcnJvcj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBzZXQgcHJvcGVydHk6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUmVmZXJlbmNlVXVpZHModXVpZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgICAgICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBmb3IgKGNvbnN0IHV1aWQgb2YgdXVpZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgICAgICAgICBpZiAoIWluZm8pIG1pc3NpbmcucHVzaCh1dWlkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbWlzc2luZztcbiAgICB9XG5cbiAgICBwcml2YXRlIHNuYXBzaG90Tm9uTnVsbFByb3BzKHJhd0NvbXA6IGFueSk6IHN0cmluZ1tdIHtcbiAgICAgICAgaWYgKCFyYXdDb21wKSByZXR1cm4gW107XG4gICAgICAgIGNvbnN0IHNraXAgPSBuZXcgU2V0KFsnX190eXBlX18nLCAnY2lkJywgJ25vZGUnLCAndXVpZCcsICduYW1lJywgJ19uYW1lJywgJ19vYmpGbGFncycsICdfZW5hYmxlZCcsICdlbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZScsICdlZGl0b3InLCAnZXh0ZW5kcycsICdfX3NjcmlwdEFzc2V0J10pO1xuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMocmF3Q29tcCkuZmlsdGVyKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoc2tpcC5oYXMoa2V5KSB8fCBrZXkuc3RhcnRzV2l0aCgnXycpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSByYXdDb21wW2tleV07XG4gICAgICAgICAgICBpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAvLyBVbndyYXAgQ29jb3MgZGVzY3JpcHRvciBvYmplY3RzOiB7IHZhbHVlOiAuLi4sIHR5cGU6IC4uLiB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiB2YWwpIHJldHVybiB2YWwudmFsdWUgIT09IG51bGwgJiYgdmFsLnZhbHVlICE9PSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhdHRhY2hTY3JpcHQobm9kZVV1aWQ6IHN0cmluZywgc2NyaXB0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gRXh0cmFjdCBjb21wb25lbnQgY2xhc3MgbmFtZSBmcm9tIHNjcmlwdCBwYXRoXG4gICAgICAgIGNvbnN0IHNjcmlwdE5hbWUgPSBzY3JpcHRQYXRoLnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy50cycsICcnKS5yZXBsYWNlKCcuanMnLCAnJyk7XG4gICAgICAgIGlmICghc2NyaXB0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnSW52YWxpZCBzY3JpcHQgcGF0aCcgfTtcbiAgICAgICAgfVxuICAgICAgICAvLyBSZXNvbHZlIHNjcmlwdCBhc3NldCB1dWlkIHNvIHdlIGNhbiBtYXRjaCBhdHRhY2hlZCBjb21wb25lbnQgcmVsaWFibHkuXG4gICAgICAgIC8vIEN1c3RvbS1zY3JpcHQgY29tcG9uZW50cyBzdXJmYWNlIGFzIGNpZCBpbiBgY29tcC50eXBlYCwgTk9UIGFzIHRoZSBjbGFzcyBuYW1lIOKAlFxuICAgICAgICAvLyBzbyBuYW1lLWJhc2VkIGNvbXBhcmlzb24gZ2l2ZXMgZmFsc2UgbmVnYXRpdmVzLiBNYXRjaCB2aWEgX19zY3JpcHRBc3NldC52YWx1ZS51dWlkIGluc3RlYWQuXG4gICAgICAgIGxldCBzY3JpcHRBc3NldFV1aWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgc2NyaXB0QXNzZXRVdWlkID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHNjcmlwdFBhdGgpIGFzIHN0cmluZztcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBuYW1lLWJhc2VkIG1hdGNoIGlmIHV1aWQgbG9va3VwIGZhaWxzLlxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoZXNTY3JpcHQgPSAoY29tcDogYW55KTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wU2NyaXB0VXVpZCA9IGNvbXA/LnByb3BlcnRpZXM/Ll9fc2NyaXB0QXNzZXQ/LnZhbHVlPy51dWlkO1xuICAgICAgICAgICAgaWYgKHNjcmlwdEFzc2V0VXVpZCAmJiBjb21wU2NyaXB0VXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wU2NyaXB0VXVpZCA9PT0gc2NyaXB0QXNzZXRVdWlkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHJlZ2lzdGVyZWQgY2xhc3MgbmFtZSAocmFyZSBmb3IgY3VzdG9tIHNjcmlwdHMpIG9yIGluc3RhbmNlIG5hbWUgc3VmZml4IGA8Q2xhc3NOYW1lPmAuXG4gICAgICAgICAgICBpZiAoY29tcC50eXBlID09PSBzY3JpcHROYW1lKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IGluc3RhbmNlTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gY29tcD8ucHJvcGVydGllcz8ubmFtZT8udmFsdWU7XG4gICAgICAgICAgICByZXR1cm4gISFpbnN0YW5jZU5hbWUgJiYgaW5zdGFuY2VOYW1lLmVuZHNXaXRoKGA8JHtzY3JpcHROYW1lfT5gKTtcbiAgICAgICAgfTtcbiAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgdGhlIHNjcmlwdCBjb21wb25lbnQgYWxyZWFkeSBleGlzdHMgb24gdGhlIG5vZGVcbiAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudHMobm9kZVV1aWQpO1xuICAgICAgICBpZiAoYWxsQ29tcG9uZW50c0luZm8uc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mby5kYXRhPy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ1NjcmlwdCA9IGFsbENvbXBvbmVudHNJbmZvLmRhdGEuY29tcG9uZW50cy5maW5kKG1hdGNoZXNTY3JpcHQpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nU2NyaXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjcmlwdCAnJHtzY3JpcHROYW1lfScgYWxyZWFkeSBleGlzdHMgb24gbm9kZWAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6IHNjcmlwdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdGluZzogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBGaXJzdCB0cnkgdXNpbmcgc2NyaXB0IG5hbWUgZGlyZWN0bHkgYXMgY29tcG9uZW50IHR5cGVcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBzY3JpcHROYW1lICAvLyBVc2Ugc2NyaXB0IG5hbWUgaW5zdGVhZCBvZiBVVUlEXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIFJlLXF1ZXJ5IG5vZGUgaW5mbyB0byB2ZXJpZnkgc2NyaXB0IHdhcyBhY3R1YWxseSBhZGRlZFxuICAgICAgICAgICAgY29uc3QgYWxsQ29tcG9uZW50c0luZm8yID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnRzKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmIChhbGxDb21wb25lbnRzSW5mbzIuc3VjY2VzcyAmJiBhbGxDb21wb25lbnRzSW5mbzIuZGF0YT8uY29tcG9uZW50cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFkZGVkU2NyaXB0ID0gYWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5maW5kKG1hdGNoZXNTY3JpcHQpO1xuICAgICAgICAgICAgICAgIGlmIChhZGRlZFNjcmlwdCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIGF0dGFjaGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudE5hbWU6IHNjcmlwdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhpc3Rpbmc6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBTY3JpcHQgJyR7c2NyaXB0TmFtZX0nIHdhcyBub3QgZm91bmQgb24gbm9kZSBhZnRlciBhZGRpdGlvbi4gQXZhaWxhYmxlIGNvbXBvbmVudHM6ICR7YWxsQ29tcG9uZW50c0luZm8yLmRhdGEuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byB2ZXJpZnkgc2NyaXB0IGFkZGl0aW9uOiAke2FsbENvbXBvbmVudHNJbmZvMi5lcnJvciB8fCAnVW5hYmxlIHRvIGdldCBub2RlIGNvbXBvbmVudHMnfWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBhdHRhY2ggc2NyaXB0ICcke3NjcmlwdE5hbWV9JzogJHtlcnIubWVzc2FnZX1gLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnUGxlYXNlIGVuc3VyZSB0aGUgc2NyaXB0IGlzIHByb3Blcmx5IGNvbXBpbGVkIGFuZCBleHBvcnRlZCBhcyBhIENvbXBvbmVudCBjbGFzcy4gWW91IGNhbiBhbHNvIG1hbnVhbGx5IGF0dGFjaCB0aGUgc2NyaXB0IHRocm91Z2ggdGhlIFByb3BlcnRpZXMgcGFuZWwgaW4gdGhlIGVkaXRvci4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBdmFpbGFibGVDb21wb25lbnRzKGNhdGVnb3J5OiBzdHJpbmcgPSAnYWxsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGNvbXBvbmVudENhdGVnb3JpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgIHJlbmRlcmVyOiBbJ2NjLlNwcml0ZScsICdjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCcsICdjYy5NYXNrJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICB1aTogWydjYy5CdXR0b24nLCAnY2MuVG9nZ2xlJywgJ2NjLlNsaWRlcicsICdjYy5TY3JvbGxWaWV3JywgJ2NjLkVkaXRCb3gnLCAnY2MuUHJvZ3Jlc3NCYXInXSxcbiAgICAgICAgICAgIHBoeXNpY3M6IFsnY2MuUmlnaWRCb2R5MkQnLCAnY2MuQm94Q29sbGlkZXIyRCcsICdjYy5DaXJjbGVDb2xsaWRlcjJEJywgJ2NjLlBvbHlnb25Db2xsaWRlcjJEJ10sXG4gICAgICAgICAgICBhbmltYXRpb246IFsnY2MuQW5pbWF0aW9uJywgJ2NjLkFuaW1hdGlvbkNsaXAnLCAnY2MuU2tlbGV0YWxBbmltYXRpb24nXSxcbiAgICAgICAgICAgIGF1ZGlvOiBbJ2NjLkF1ZGlvU291cmNlJ10sXG4gICAgICAgICAgICBsYXlvdXQ6IFsnY2MuTGF5b3V0JywgJ2NjLldpZGdldCcsICdjYy5QYWdlVmlldycsICdjYy5QYWdlVmlld0luZGljYXRvciddLFxuICAgICAgICAgICAgZWZmZWN0czogWydjYy5Nb3Rpb25TdHJlYWsnLCAnY2MuUGFydGljbGVTeXN0ZW0yRCddLFxuICAgICAgICAgICAgY2FtZXJhOiBbJ2NjLkNhbWVyYSddLFxuICAgICAgICAgICAgbGlnaHQ6IFsnY2MuTGlnaHQnLCAnY2MuRGlyZWN0aW9uYWxMaWdodCcsICdjYy5Qb2ludExpZ2h0JywgJ2NjLlNwb3RMaWdodCddXG4gICAgICAgIH07XG5cbiAgICAgICAgbGV0IGNvbXBvbmVudHM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAnYWxsJykge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjYXQgaW4gY29tcG9uZW50Q2F0ZWdvcmllcykge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmNvbmNhdChjb21wb25lbnRDYXRlZ29yaWVzW2NhdF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudENhdGVnb3JpZXNbY2F0ZWdvcnldKSB7XG4gICAgICAgICAgICBjb21wb25lbnRzID0gY29tcG9uZW50Q2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgY29tcG9uZW50czogY29tcG9uZW50c1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNWYWxpZFByb3BlcnR5RGVzY3JpcHRvcihwcm9wRGF0YTogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIC8vIENoZWNrIGlmIGl0IGlzIGEgdmFsaWQgcHJvcGVydHkgZGVzY3JpcHRvciBvYmplY3RcbiAgICAgICAgaWYgKHR5cGVvZiBwcm9wRGF0YSAhPT0gJ29iamVjdCcgfHwgcHJvcERhdGEgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEpO1xuXG4gICAgICAgICAgICAvLyBBdm9pZCB0cmF2ZXJzaW5nIHNpbXBsZSBudW1lcmljIG9iamVjdHMgKGUuZy4sIHt3aWR0aDogMjAwLCBoZWlnaHQ6IDE1MH0pXG4gICAgICAgICAgICBjb25zdCBpc1NpbXBsZVZhbHVlT2JqZWN0ID0ga2V5cy5ldmVyeShrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcHJvcERhdGFba2V5XTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnIHx8IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChpc1NpbXBsZVZhbHVlT2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgcHJvcGVydHkgZGVzY3JpcHRvciBjaGFyYWN0ZXJpc3RpYyBmaWVsZHMgd2l0aG91dCB1c2luZyAnaW4nIG9wZXJhdG9yXG4gICAgICAgICAgICBjb25zdCBoYXNOYW1lID0ga2V5cy5pbmNsdWRlcygnbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVmFsdWUgPSBrZXlzLmluY2x1ZGVzKCd2YWx1ZScpO1xuICAgICAgICAgICAgY29uc3QgaGFzVHlwZSA9IGtleXMuaW5jbHVkZXMoJ3R5cGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc0Rpc3BsYXlOYW1lID0ga2V5cy5pbmNsdWRlcygnZGlzcGxheU5hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1JlYWRvbmx5ID0ga2V5cy5pbmNsdWRlcygncmVhZG9ubHknKTtcblxuICAgICAgICAgICAgLy8gTXVzdCBjb250YWluIG5hbWUgb3IgdmFsdWUgZmllbGQsIGFuZCB1c3VhbGx5IGFsc28gYSB0eXBlIGZpZWxkXG4gICAgICAgICAgICBjb25zdCBoYXNWYWxpZFN0cnVjdHVyZSA9IChoYXNOYW1lIHx8IGhhc1ZhbHVlKSAmJiAoaGFzVHlwZSB8fCBoYXNEaXNwbGF5TmFtZSB8fCBoYXNSZWFkb25seSk7XG5cbiAgICAgICAgICAgIC8vIEV4dHJhIGNoZWNrOiBpZiBkZWZhdWx0IGZpZWxkIGV4aXN0cyB3aXRoIGNvbXBsZXggc3RydWN0dXJlLCBhdm9pZCBkZWVwIHRyYXZlcnNhbFxuICAgICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXMoJ2RlZmF1bHQnKSAmJiBwcm9wRGF0YS5kZWZhdWx0ICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRLZXlzID0gT2JqZWN0LmtleXMocHJvcERhdGEuZGVmYXVsdCk7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmF1bHRLZXlzLmluY2x1ZGVzKCd2YWx1ZScpICYmIHR5cGVvZiBwcm9wRGF0YS5kZWZhdWx0LnZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIGNhc2UsIG9ubHkgcmV0dXJuIHRvcC1sZXZlbCBwcm9wZXJ0aWVzIHdpdGhvdXQgZGVlcCB0cmF2ZXJzYWwgb2YgZGVmYXVsdC52YWx1ZVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaGFzVmFsaWRTdHJ1Y3R1cmU7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihgW2lzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3JdIEVycm9yIGNoZWNraW5nIHByb3BlcnR5IGRlc2NyaXB0b3I6ICR7KGVycm9yIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYW5hbHl6ZVByb3BlcnR5KGNvbXBvbmVudDogYW55LCBwcm9wZXJ0eU5hbWU6IHN0cmluZyk6IHsgZXhpc3RzOiBib29sZWFuOyB0eXBlOiBzdHJpbmc7IGF2YWlsYWJsZVByb3BlcnRpZXM6IHN0cmluZ1tdOyBvcmlnaW5hbFZhbHVlOiBhbnkgfSB7XG4gICAgICAgIC8vIEV4dHJhY3QgYXZhaWxhYmxlIHByb3BlcnRpZXMgZnJvbSBjb21wbGV4IGNvbXBvbmVudCBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlUHJvcGVydGllczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgbGV0IHByb3BlcnR5VmFsdWU6IGFueSA9IHVuZGVmaW5lZDtcbiAgICAgICAgbGV0IHByb3BlcnR5RXhpc3RzID0gZmFsc2U7XG5cbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHdheXMgdG8gZmluZCBwcm9wZXJ0aWVzOlxuICAgICAgICAvLyAxLiBEaXJlY3QgcHJvcGVydHkgYWNjZXNzXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29tcG9uZW50LCBwcm9wZXJ0eU5hbWUpKSB7XG4gICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gY29tcG9uZW50W3Byb3BlcnR5TmFtZV07XG4gICAgICAgICAgICBwcm9wZXJ0eUV4aXN0cyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyAyLiBGaW5kIGZyb20gbmVzdGVkIHN0cnVjdHVyZSAobGlrZSBjb21wbGV4IHN0cnVjdHVyZXMgc2VlbiBpbiB0ZXN0IGRhdGEpXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMgJiYgY29tcG9uZW50LnByb3BlcnRpZXMgJiYgdHlwZW9mIGNvbXBvbmVudC5wcm9wZXJ0aWVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgcHJvcGVydGllcy52YWx1ZSBleGlzdHMgKHRoaXMgaXMgdGhlIHN0cnVjdHVyZSB3ZSBzZWUgaW4gZ2V0Q29tcG9uZW50cylcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQucHJvcGVydGllcy52YWx1ZSAmJiB0eXBlb2YgY29tcG9uZW50LnByb3BlcnRpZXMudmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWVPYmogPSBjb21wb25lbnQucHJvcGVydGllcy52YWx1ZTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHByb3BEYXRhXSBvZiBPYmplY3QuZW50cmllcyh2YWx1ZU9iaikpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQSBwcmltaXRpdmUgcHJvcGVydHkgaXMgZHVtcGVkIGFzIGl0cyBiYXJlIHZhbHVlLCBub3QgYXMgYVxuICAgICAgICAgICAgICAgICAgICAvLyB7dmFsdWUsIHR5cGV9IGRlc2NyaXB0b3Ig4oCUIGFjY2VwdCBib3RoLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0Rlc2NyaXB0b3IgPSB0aGlzLmlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1ByaW1pdGl2ZSA9IHByb3BEYXRhID09PSBudWxsIHx8IFsnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJ10uaW5jbHVkZXModHlwZW9mIHByb3BEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0Rlc2NyaXB0b3IgJiYgIWlzUHJpbWl0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRGVzY3JpcHRvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVmZXIgdmFsdWUgcHJvcGVydHksIGlmIG5vdCBhdmFpbGFibGUgdXNlIHByb3BEYXRhIGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wS2V5cyA9IE9iamVjdC5rZXlzKHByb3BJbmZvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgPyBwcm9wSW5mby52YWx1ZSA6IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBjaGVjayBmYWlscywgdXNlIHByb3BJbmZvIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BEYXRhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBmaW5kIGRpcmVjdGx5IGZyb20gcHJvcGVydGllcy5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIFRoZSBlZGl0b3IgZHVtcHMgYSBwcmltaXRpdmUgcHJvcGVydHkgYXMgaXRzIGJhcmUgdmFsdWUg4oCUXG4gICAgICAgICAgICAgICAgLy8gY2MuTGFiZWwuc3RyaW5nIGFycml2ZXMgYXMgXCJsYWJlbFwiLCBmb250U2l6ZSBhcyA0MCDigJQgd2hpbGUgYW5cbiAgICAgICAgICAgICAgICAvLyBvYmplY3QtdmFsdWVkIG9uZSBhcnJpdmVzIHdyYXBwZWQgYXMge3ZhbHVlLCB0eXBlfS4gT25seVxuICAgICAgICAgICAgICAgIC8vIGRlc2NyaXB0b3JzIHdlcmUgYWNjZXB0ZWQgaGVyZSwgc28gdGhlIG1vc3QgY29tbW9ubHkgd3JpdHRlblxuICAgICAgICAgICAgICAgIC8vIHByb3BlcnRpZXMgb24gYSBjb21wb25lbnQgcmVhZCBhcyBcIm5vdCBmb3VuZFwiLlxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgcHJvcERhdGFdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXBvbmVudC5wcm9wZXJ0aWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0Rlc2NyaXB0b3IgPSB0aGlzLmlzVmFsaWRQcm9wZXJ0eURlc2NyaXB0b3IocHJvcERhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1ByaW1pdGl2ZSA9IHByb3BEYXRhID09PSBudWxsIHx8IFsnc3RyaW5nJywgJ251bWJlcicsICdib29sZWFuJ10uaW5jbHVkZXModHlwZW9mIHByb3BEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0Rlc2NyaXB0b3IgJiYgIWlzUHJpbWl0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSBwcm9wZXJ0eU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzRGVzY3JpcHRvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvcEluZm8gPSBwcm9wRGF0YSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmVmZXIgdmFsdWUgcHJvcGVydHksIGlmIG5vdCBhdmFpbGFibGUgdXNlIHByb3BEYXRhIGl0c2VsZlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wS2V5cyA9IE9iamVjdC5rZXlzKHByb3BJbmZvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVZhbHVlID0gcHJvcEtleXMuaW5jbHVkZXMoJ3ZhbHVlJykgPyBwcm9wSW5mby52YWx1ZSA6IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBjaGVjayBmYWlscywgdXNlIHByb3BJbmZvIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BJbmZvO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlWYWx1ZSA9IHByb3BEYXRhO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5RXhpc3RzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyAzLiBFeHRyYWN0IHNpbXBsZSBwcm9wZXJ0eSBuYW1lcyBmcm9tIGRpcmVjdCBwcm9wZXJ0aWVzXG4gICAgICAgIGlmIChhdmFpbGFibGVQcm9wZXJ0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoY29tcG9uZW50KSkge1xuICAgICAgICAgICAgICAgIGlmICgha2V5LnN0YXJ0c1dpdGgoJ18nKSAmJiAhWydfX3R5cGVfXycsICdjaWQnLCAnbm9kZScsICd1dWlkJywgJ25hbWUnLCAnZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnXS5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVByb3BlcnRpZXMucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghcHJvcGVydHlFeGlzdHMpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB0eXBlOiAndW5rbm93bicsXG4gICAgICAgICAgICAgICAgYXZhaWxhYmxlUHJvcGVydGllcyxcbiAgICAgICAgICAgICAgICBvcmlnaW5hbFZhbHVlOiB1bmRlZmluZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdHlwZSA9ICd1bmtub3duJztcblxuICAgICAgICAvLyBTbWFydCB0eXBlIGRldGVjdGlvblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwcm9wZXJ0eVZhbHVlKSkge1xuICAgICAgICAgICAgLy8gQXJyYXkgdHlwZSBkZXRlY3Rpb25cbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlQXJyYXknO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnY29sb3InKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnY29sb3JBcnJheSc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXJyYXknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgcHJvcGVydHkgbmFtZSBzdWdnZXN0cyBpdCdzIGFuIGFzc2V0XG4gICAgICAgICAgICBpZiAoWydzcHJpdGVGcmFtZScsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ2ZvbnQnLCAnY2xpcCcsICdwcmVmYWInXS5pbmNsdWRlcyhwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKSkpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ2Fzc2V0JztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdzdHJpbmcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgdHlwZSA9ICdudW1iZXInO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9wZXJ0eVZhbHVlID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHR5cGUgPSAnYm9vbGVhbic7XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSAmJiB0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzLmluY2x1ZGVzKCdyJykgJiYga2V5cy5pbmNsdWRlcygnZycpICYmIGtleXMuaW5jbHVkZXMoJ2InKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ2NvbG9yJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ3gnKSAmJiBrZXlzLmluY2x1ZGVzKCd5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHByb3BlcnR5VmFsdWUueiAhPT0gdW5kZWZpbmVkID8gJ3ZlYzMnIDogJ3ZlYzInO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygnd2lkdGgnKSAmJiBrZXlzLmluY2x1ZGVzKCdoZWlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ3NpemUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2V5cy5pbmNsdWRlcygndXVpZCcpIHx8IGtleXMuaW5jbHVkZXMoJ19fdXVpZF9fJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQgaXMgYSBub2RlIHJlZmVyZW5jZSAoYnkgcHJvcGVydHkgbmFtZSBvciBfX2lkX18gcHJvcGVydHkpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygndGFyZ2V0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMuaW5jbHVkZXMoJ19faWRfXycpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9ICdhc3NldCc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGtleXMuaW5jbHVkZXMoJ19faWRfXycpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vZGUgcmVmZXJlbmNlIGNoYXJhY3RlcmlzdGljc1xuICAgICAgICAgICAgICAgICAgICB0eXBlID0gJ25vZGUnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSAnb2JqZWN0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBbYW5hbHl6ZVByb3BlcnR5XSBFcnJvciBjaGVja2luZyBwcm9wZXJ0eSB0eXBlIGZvcjogJHtKU09OLnN0cmluZ2lmeShwcm9wZXJ0eVZhbHVlKX1gKTtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ29iamVjdCc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlWYWx1ZSA9PT0gbnVsbCB8fCBwcm9wZXJ0eVZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIEZvciBudWxsL3VuZGVmaW5lZCB2YWx1ZXMsIGNoZWNrIHByb3BlcnR5IG5hbWUgdG8gZGV0ZXJtaW5lIHR5cGVcbiAgICAgICAgICAgIGlmIChbJ3Nwcml0ZUZyYW1lJywgJ3RleHR1cmUnLCAnbWF0ZXJpYWwnLCAnZm9udCcsICdjbGlwJywgJ3ByZWZhYiddLmluY2x1ZGVzKHByb3BlcnR5TmFtZS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSAnYXNzZXQnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eU5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnbm9kZScpIHx8XG4gICAgICAgICAgICAgICAgcHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ3RhcmdldCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHlOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJ2NvbXBvbmVudCcpKSB7XG4gICAgICAgICAgICAgICAgdHlwZSA9ICdjb21wb25lbnQnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gJ3Vua25vd24nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGV4aXN0czogdHJ1ZSxcbiAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICBhdmFpbGFibGVQcm9wZXJ0aWVzLFxuICAgICAgICAgICAgb3JpZ2luYWxWYWx1ZTogcHJvcGVydHlWYWx1ZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgcGFyc2VDb2xvclN0cmluZyhjb2xvclN0cjogc3RyaW5nKTogeyByOiBudW1iZXI7IGc6IG51bWJlcjsgYjogbnVtYmVyOyBhOiBudW1iZXIgfSB7XG4gICAgICAgIGNvbnN0IHN0ciA9IGNvbG9yU3RyLnRyaW0oKTtcblxuICAgICAgICAvLyBPbmx5IHN1cHBvcnRzIGhleCBmb3JtYXQgI1JSR0dCQiBvciAjUlJHR0JCQUFcbiAgICAgICAgaWYgKHN0ci5zdGFydHNXaXRoKCcjJykpIHtcbiAgICAgICAgICAgIGlmIChzdHIubGVuZ3RoID09PSA3KSB7IC8vICNSUkdHQkJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAzKSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDMsIDUpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNSwgNyksIDE2KTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyByLCBnLCBiLCBhOiAyNTUgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RyLmxlbmd0aCA9PT0gOSkgeyAvLyAjUlJHR0JCQUFcbiAgICAgICAgICAgICAgICBjb25zdCByID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZygxLCAzKSwgMTYpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGcgPSBwYXJzZUludChzdHIuc3Vic3RyaW5nKDMsIDUpLCAxNik7XG4gICAgICAgICAgICAgICAgY29uc3QgYiA9IHBhcnNlSW50KHN0ci5zdWJzdHJpbmcoNSwgNyksIDE2KTtcbiAgICAgICAgICAgICAgICBjb25zdCBhID0gcGFyc2VJbnQoc3RyLnN1YnN0cmluZyg3LCA5KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHIsIGcsIGIsIGEgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIG5vdCB2YWxpZCBoZXggZm9ybWF0LCByZXR1cm4gZXJyb3IgbWVzc2FnZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgY29sb3IgZm9ybWF0OiBcIiR7Y29sb3JTdHJ9XCIuIE9ubHkgaGV4YWRlY2ltYWwgZm9ybWF0IGlzIHN1cHBvcnRlZCAoZS5nLiwgXCIjRkYwMDAwXCIgb3IgXCIjRkYwMDAwRkZcIilgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZlcmlmeVByb3BlcnR5Q2hhbmdlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgb3JpZ2luYWxWYWx1ZTogYW55LCBleHBlY3RlZFZhbHVlOiBhbnkpOiBQcm9taXNlPHsgdmVyaWZpZWQ6IGJvb2xlYW47IGFjdHVhbFZhbHVlOiBhbnk7IGZ1bGxEYXRhOiBhbnkgfT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gUmUtZ2V0IGNvbXBvbmVudCBpbmZvIGZvciB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudEluZm8gPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xuXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50SW5mby5zdWNjZXNzICYmIGNvbXBvbmVudEluZm8uZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5RGF0YSA9IGNvbXBvbmVudEluZm8uZGF0YS5wcm9wZXJ0aWVzPy5bcHJvcGVydHldO1xuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBhY3R1YWwgdmFsdWUgZnJvbSBwcm9wZXJ0eSBkYXRhXG4gICAgICAgICAgICAgICAgbGV0IGFjdHVhbFZhbHVlID0gcHJvcGVydHlEYXRhO1xuICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0eURhdGEgJiYgdHlwZW9mIHByb3BlcnR5RGF0YSA9PT0gJ29iamVjdCcgJiYgJ3ZhbHVlJyBpbiBwcm9wZXJ0eURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0dWFsVmFsdWUgPSBwcm9wZXJ0eURhdGEudmFsdWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gRml4IHZlcmlmaWNhdGlvbiBsb2dpYzogY2hlY2sgaWYgYWN0dWFsIHZhbHVlIG1hdGNoZXMgZXhwZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBsZXQgdmVyaWZpZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZXhwZWN0ZWRWYWx1ZSA9PT0gJ29iamVjdCcgJiYgZXhwZWN0ZWRWYWx1ZSAhPT0gbnVsbCAmJiAndXVpZCcgaW4gZXhwZWN0ZWRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgcmVmZXJlbmNlIHR5cGVzIChub2RlL2NvbXBvbmVudC9hc3NldCksIGNvbXBhcmUgVVVJRFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWxVdWlkID0gYWN0dWFsVmFsdWUgJiYgdHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiAndXVpZCcgaW4gYWN0dWFsVmFsdWUgPyBhY3R1YWxWYWx1ZS51dWlkIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVXVpZCA9IGV4cGVjdGVkVmFsdWUudXVpZCB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpZWQgPSBhY3R1YWxVdWlkID09PSBleHBlY3RlZFV1aWQgJiYgZXhwZWN0ZWRVdWlkICE9PSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgdHlwZXMsIGNvbXBhcmUgdmFsdWVzIGRpcmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYWN0dWFsVmFsdWUgPT09IHR5cGVvZiBleHBlY3RlZFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFjdHVhbFZhbHVlID09PSAnb2JqZWN0JyAmJiBhY3R1YWxWYWx1ZSAhPT0gbnVsbCAmJiBleHBlY3RlZFZhbHVlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGVlcCBjb21wYXJpc29uIGZvciBvYmplY3QgdHlwZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJpZmllZCA9IEpTT04uc3RyaW5naWZ5KGFjdHVhbFZhbHVlKSA9PT0gSlNPTi5zdHJpbmdpZnkoZXhwZWN0ZWRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERpcmVjdCBjb21wYXJpc29uIGZvciBiYXNpYyB0eXBlc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gYWN0dWFsVmFsdWUgPT09IGV4cGVjdGVkVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciB0eXBlIG1pc21hdGNoIChlLmcuLCBudW1iZXIgYW5kIHN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkID0gU3RyaW5nKGFjdHVhbFZhbHVlKSA9PT0gU3RyaW5nKGV4cGVjdGVkVmFsdWUpIHx8IE51bWJlcihhY3R1YWxWYWx1ZSkgPT09IE51bWJlcihleHBlY3RlZFZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICBhY3R1YWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgZnVsbERhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgcmV0dXJuIG1vZGlmaWVkIHByb3BlcnR5IGluZm8sIG5vdCBjb21wbGV0ZSBjb21wb25lbnQgZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZpZWRQcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogb3JpZ2luYWxWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWRWYWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbFZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcmlmaWVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5TWV0YWRhdGE6IHByb3BlcnR5RGF0YSAvLyBPbmx5IGluY2x1ZGVzIHRoaXMgcHJvcGVydHkncyBtZXRhZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNpbXBsaWZpZWQgY29tcG9uZW50IGluZm9cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFN1bW1hcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsUHJvcGVydGllczogT2JqZWN0LmtleXMoY29tcG9uZW50SW5mby5kYXRhPy5wcm9wZXJ0aWVzIHx8IHt9KS5sZW5ndGhcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsb2dnZXIud2FybihgW3ZlcmlmeVByb3BlcnR5Q2hhbmdlXSBDb3VsZCBub3QgcmUtcmVhZCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9OiAke2NvbXBvbmVudEluZm8uZXJyb3J9YCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBsb2dnZXIuZXJyb3IoYFt2ZXJpZnlQcm9wZXJ0eUNoYW5nZV0gVmVyaWZpY2F0aW9uIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3Iuc3RhY2sgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZlcmlmaWVkOiBmYWxzZSxcbiAgICAgICAgICAgIGFjdHVhbFZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBmdWxsRGF0YTogbnVsbFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERldGVjdCBpZiB0aGlzIGlzIGEgbm9kZSBwcm9wZXJ0eSwgcmVkaXJlY3QgdG8gY29ycmVzcG9uZGluZyBub2RlIG1ldGhvZCBpZiBzb1xuICAgICAqL1xuICAgIHByaXZhdGUgYXN5bmMgY2hlY2tBbmRSZWRpcmVjdE5vZGVQcm9wZXJ0aWVzKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlIHwgbnVsbD4ge1xuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgdmFsdWUgfSA9IGFyZ3M7XG5cbiAgICAgICAgLy8gRGV0ZWN0IGlmIHRoaXMgaXMgYSBiYXNpYyBub2RlIHByb3BlcnR5IChzaG91bGQgdXNlIHNldF9ub2RlX3Byb3BlcnR5KVxuICAgICAgICBjb25zdCBub2RlQmFzaWNQcm9wZXJ0aWVzID0gW1xuICAgICAgICAgICAgJ25hbWUnLCAnYWN0aXZlJywgJ2xheWVyJywgJ21vYmlsaXR5JywgJ3BhcmVudCcsICdjaGlsZHJlbicsICdoaWRlRmxhZ3MnXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gRGV0ZWN0IGlmIHRoaXMgaXMgYSBub2RlIHRyYW5zZm9ybSBwcm9wZXJ0eSAoc2hvdWxkIHVzZSBzZXRfbm9kZV90cmFuc2Zvcm0pXG4gICAgICAgIGNvbnN0IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzID0gW1xuICAgICAgICAgICAgJ3Bvc2l0aW9uJywgJ3JvdGF0aW9uJywgJ3NjYWxlJywgJ2V1bGVyQW5nbGVzJywgJ2FuZ2xlJ1xuICAgICAgICBdO1xuXG4gICAgICAgIC8vIERldGVjdCBhdHRlbXB0cyB0byBzZXQgY2MuTm9kZSBwcm9wZXJ0aWVzIChjb21tb24gbWlzdGFrZSlcbiAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5Ob2RlJyB8fCBjb21wb25lbnRUeXBlID09PSAnTm9kZScpIHtcbiAgICAgICAgICAgIGlmIChub2RlQmFzaWNQcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgaXMgYSBub2RlIGJhc2ljIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB1c2Ugc2V0X25vZGVfcHJvcGVydHkgbWV0aG9kIHRvIHNldCBub2RlIHByb3BlcnRpZXM6IHNldF9ub2RlX3Byb3BlcnR5KHV1aWQ9XCIke25vZGVVdWlkfVwiLCBwcm9wZXJ0eT1cIiR7cHJvcGVydHl9XCIsIHZhbHVlPSR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSlgXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyBpcyBhIG5vZGUgdHJhbnNmb3JtIHByb3BlcnR5LCBub3QgYSBjb21wb25lbnQgcHJvcGVydHlgLFxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFBsZWFzZSB1c2Ugc2V0X25vZGVfdHJhbnNmb3JtIG1ldGhvZCB0byBzZXQgdHJhbnNmb3JtIHByb3BlcnRpZXM6IHNldF9ub2RlX3RyYW5zZm9ybSh1dWlkPVwiJHtub2RlVXVpZH1cIiwgJHtwcm9wZXJ0eX09JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IGNvbW1vbiBpbmNvcnJlY3QgdXNhZ2VcbiAgICAgICAgaWYgKG5vZGVCYXNpY1Byb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpIHx8IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSkge1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kTmFtZSA9IG5vZGVUcmFuc2Zvcm1Qcm9wZXJ0aWVzLmluY2x1ZGVzKHByb3BlcnR5KSA/ICdzZXRfbm9kZV90cmFuc2Zvcm0nIDogJ3NldF9ub2RlX3Byb3BlcnR5JztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIGlzIGEgbm9kZSBwcm9wZXJ0eSwgbm90IGEgY29tcG9uZW50IHByb3BlcnR5YCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgc2hvdWxkIGJlIHNldCB1c2luZyAke21ldGhvZE5hbWV9IG1ldGhvZCwgbm90IHNldF9jb21wb25lbnRfcHJvcGVydHkuIFBsZWFzZSB1c2U6ICR7bWV0aG9kTmFtZX0odXVpZD1cIiR7bm9kZVV1aWR9XCIsICR7bm9kZVRyYW5zZm9ybVByb3BlcnRpZXMuaW5jbHVkZXMocHJvcGVydHkpID8gcHJvcGVydHkgOiBgcHJvcGVydHk9XCIke3Byb3BlcnR5fVwiYH09JHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9KWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDsgLy8gTm90IGEgbm9kZSBwcm9wZXJ0eSwgY29udGludWUgbm9ybWFsIHByb2Nlc3NpbmdcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBjb21wb25lbnQgc3VnZ2VzdGlvbiBpbmZvXG4gICAgICovXG4gICAgcHJpdmF0ZSBnZW5lcmF0ZUNvbXBvbmVudFN1Z2dlc3Rpb24ocmVxdWVzdGVkVHlwZTogc3RyaW5nLCBhdmFpbGFibGVUeXBlczogc3RyaW5nW10sIHByb3BlcnR5OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICAvLyBDaGVjayBpZiBzaW1pbGFyIGNvbXBvbmVudCB0eXBlcyBleGlzdFxuICAgICAgICBjb25zdCBzaW1pbGFyVHlwZXMgPSBhdmFpbGFibGVUeXBlcy5maWx0ZXIodHlwZSA9PlxuICAgICAgICAgICAgdHlwZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHJlcXVlc3RlZFR5cGUudG9Mb3dlckNhc2UoKSkgfHxcbiAgICAgICAgICAgIHJlcXVlc3RlZFR5cGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyh0eXBlLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgICk7XG5cbiAgICAgICAgbGV0IGluc3RydWN0aW9uID0gJyc7XG5cbiAgICAgICAgaWYgKHNpbWlsYXJUeXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuXFxu8J+UjSBGb3VuZCBzaW1pbGFyIGNvbXBvbmVudHM6ICR7c2ltaWxhclR5cGVzLmpvaW4oJywgJyl9YDtcbiAgICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG7wn5KhIFN1Z2dlc3Rpb246IFBlcmhhcHMgeW91IG1lYW50IHRvIHNldCB0aGUgJyR7c2ltaWxhclR5cGVzWzBdfScgY29tcG9uZW50P2A7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZWNvbW1lbmQgcG9zc2libGUgY29tcG9uZW50cyBiYXNlZCBvbiBwcm9wZXJ0eSBuYW1lXG4gICAgICAgIGNvbnN0IHByb3BlcnR5VG9Db21wb25lbnRNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICAgICAgICdzdHJpbmcnOiBbJ2NjLkxhYmVsJywgJ2NjLlJpY2hUZXh0JywgJ2NjLkVkaXRCb3gnXSxcbiAgICAgICAgICAgICd0ZXh0JzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxuICAgICAgICAgICAgJ2ZvbnRTaXplJzogWydjYy5MYWJlbCcsICdjYy5SaWNoVGV4dCddLFxuICAgICAgICAgICAgJ3Nwcml0ZUZyYW1lJzogWydjYy5TcHJpdGUnXSxcbiAgICAgICAgICAgICdjb2xvcic6IFsnY2MuTGFiZWwnLCAnY2MuU3ByaXRlJywgJ2NjLkdyYXBoaWNzJ10sXG4gICAgICAgICAgICAnbm9ybWFsQ29sb3InOiBbJ2NjLkJ1dHRvbiddLFxuICAgICAgICAgICAgJ3ByZXNzZWRDb2xvcic6IFsnY2MuQnV0dG9uJ10sXG4gICAgICAgICAgICAndGFyZ2V0JzogWydjYy5CdXR0b24nXSxcbiAgICAgICAgICAgICdjb250ZW50U2l6ZSc6IFsnY2MuVUlUcmFuc2Zvcm0nXSxcbiAgICAgICAgICAgICdhbmNob3JQb2ludCc6IFsnY2MuVUlUcmFuc2Zvcm0nXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlY29tbWVuZGVkQ29tcG9uZW50cyA9IHByb3BlcnR5VG9Db21wb25lbnRNYXBbcHJvcGVydHldIHx8IFtdO1xuICAgICAgICBjb25zdCBhdmFpbGFibGVSZWNvbW1lbmRlZCA9IHJlY29tbWVuZGVkQ29tcG9uZW50cy5maWx0ZXIoY29tcCA9PiBhdmFpbGFibGVUeXBlcy5pbmNsdWRlcyhjb21wKSk7XG5cbiAgICAgICAgaWYgKGF2YWlsYWJsZVJlY29tbWVuZGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGluc3RydWN0aW9uICs9IGBcXG5cXG7wn46vIEJhc2VkIG9uIHByb3BlcnR5ICcke3Byb3BlcnR5fScsIHJlY29tbWVuZGVkIGNvbXBvbmVudHM6ICR7YXZhaWxhYmxlUmVjb21tZW5kZWQuam9pbignLCAnKX1gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUHJvdmlkZSBvcGVyYXRpb24gc3VnZ2VzdGlvbnNcbiAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcblxcbvCfk4sgU3VnZ2VzdGVkIEFjdGlvbnM6YDtcbiAgICAgICAgaW5zdHJ1Y3Rpb24gKz0gYFxcbjEuIFVzZSBnZXRfY29tcG9uZW50cyhub2RlVXVpZD1cIiR7cmVxdWVzdGVkVHlwZS5pbmNsdWRlcygndXVpZCcpID8gJ1lPVVJfTk9ERV9VVUlEJyA6ICdub2RlVXVpZCd9XCIpIHRvIHZpZXcgYWxsIGNvbXBvbmVudHMgb24gdGhlIG5vZGVgO1xuICAgICAgICBpbnN0cnVjdGlvbiArPSBgXFxuMi4gSWYgeW91IG5lZWQgdG8gYWRkIGEgY29tcG9uZW50LCB1c2UgYWRkX2NvbXBvbmVudChub2RlVXVpZD1cIi4uLlwiLCBjb21wb25lbnRUeXBlPVwiJHtyZXF1ZXN0ZWRUeXBlfVwiKWA7XG4gICAgICAgIGluc3RydWN0aW9uICs9IGBcXG4zLiBWZXJpZnkgdGhhdCB0aGUgY29tcG9uZW50IHR5cGUgbmFtZSBpcyBjb3JyZWN0IChjYXNlLXNlbnNpdGl2ZSlgO1xuXG4gICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICB9XG5cbn1cbiJdfQ==