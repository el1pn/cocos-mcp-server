"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTools = void 0;
const component_tools_1 = require("./component-tools");
const logger_1 = require("../logger");
const editor_request_1 = require("../utils/editor-request");
class NodeTools {
    constructor() {
        this.componentTools = new component_tools_1.ComponentTools();
    }
    getTools() {
        return [
            {
                name: 'node_lifecycle',
                description: 'Manage node lifecycle: create, delete, duplicate, move, or rename nodes in the scene. Available actions: create, delete, duplicate, move, rename.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['create', 'delete', 'duplicate', 'move', 'rename'],
                            description: 'The lifecycle action to perform'
                        },
                        name: {
                            type: 'string',
                            description: "Node name. Required for 'create' and 'rename' actions."
                        },
                        uuid: {
                            type: 'string',
                            description: "Node UUID. Required for 'delete', 'duplicate', and 'rename' actions."
                        },
                        parentUuid: {
                            type: 'string',
                            description: "Parent node UUID (create). Strongly recommended — omit only to create at scene root."
                        },
                        nodeType: {
                            type: 'string',
                            description: "Node type for 'create' action: Node, 2DNode, 3DNode",
                            enum: ['Node', '2DNode', '3DNode'],
                            default: 'Node'
                        },
                        siblingIndex: {
                            type: 'number',
                            description: "Sibling index for ordering. Used for 'create' and 'move' actions. (-1 means append at end)",
                            default: -1
                        },
                        assetUuid: {
                            type: 'string',
                            description: "Asset UUID to instantiate from (create), e.g. a prefab UUID, instead of an empty node."
                        },
                        assetPath: {
                            type: 'string',
                            description: "Asset path to instantiate from (create), e.g. \"db://assets/prefabs/MyPrefab.prefab\". Alternative to assetUuid."
                        },
                        components: {
                            type: 'array',
                            items: { type: 'string' },
                            description: "Component types to add to the new node (create), e.g. [\"cc.Sprite\", \"cc.Button\"]."
                        },
                        unlinkPrefab: {
                            type: 'boolean',
                            description: "If true, unlink from source prefab to create a regular node (create).",
                            default: false
                        },
                        keepWorldTransform: {
                            type: 'boolean',
                            description: "Keep world transform when creating the node (create).",
                            default: false
                        },
                        initialTransform: {
                            type: 'object',
                            properties: {
                                position: {
                                    type: 'object',
                                    properties: {
                                        x: { type: 'number' },
                                        y: { type: 'number' },
                                        z: { type: 'number' }
                                    }
                                },
                                rotation: {
                                    type: 'object',
                                    properties: {
                                        x: { type: 'number' },
                                        y: { type: 'number' },
                                        z: { type: 'number' }
                                    }
                                },
                                scale: {
                                    type: 'object',
                                    properties: {
                                        x: { type: 'number' },
                                        y: { type: 'number' },
                                        z: { type: 'number' }
                                    }
                                }
                            },
                            description: "Initial transform for the created node (create)."
                        },
                        includeChildren: {
                            type: 'boolean',
                            description: "Include children when duplicating (duplicate).",
                            default: true
                        },
                        nodeUuid: {
                            type: 'string',
                            description: "Node UUID to move. Required for 'move'."
                        },
                        newParentUuid: {
                            type: 'string',
                            description: "New parent node UUID. Required for 'move'."
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'node_query',
                description: 'Query and inspect nodes in the scene. Available actions: get_info, find_by_pattern, find_by_name, get_all, detect_type.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_info', 'find_by_pattern', 'find_by_name', 'get_all', 'detect_type'],
                            description: 'The query action to perform'
                        },
                        uuid: {
                            type: 'string',
                            description: "Node UUID. Required for 'get_info' and 'detect_type' actions."
                        },
                        pattern: {
                            type: 'string',
                            description: "Name pattern to search. Required for 'find_by_pattern' action."
                        },
                        exactMatch: {
                            type: 'boolean',
                            description: "Exact match or partial match. Used for 'find_by_pattern' action.",
                            default: false
                        },
                        name: {
                            type: 'string',
                            description: "Node name to find. Required for 'find_by_name' action."
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'node_transform',
                description: 'Modify node transform or properties. Available actions: set_transform, set_property. set_transform automatically handles 2D/3D node differences.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['set_transform', 'set_property'],
                            description: 'The transform/property action to perform'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Node UUID. Required for both actions.'
                        },
                        position: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number', description: 'Z coordinate (ignored for 2D nodes)' }
                            },
                            description: "Node position. Used for 'set_transform' action. For 2D nodes, only x,y are used; z is ignored. For 3D nodes, all coordinates are used."
                        },
                        rotation: {
                            type: 'object',
                            properties: {
                                x: { type: 'number', description: 'X rotation (ignored for 2D nodes)' },
                                y: { type: 'number', description: 'Y rotation (ignored for 2D nodes)' },
                                z: { type: 'number', description: 'Z rotation (main rotation axis for 2D nodes)' }
                            },
                            description: "Node rotation in euler angles. Used for 'set_transform' action. For 2D nodes, only z rotation is used. For 3D nodes, all axes are used."
                        },
                        scale: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number', description: 'Z scale (usually 1 for 2D nodes)' }
                            },
                            description: "Node scale. Used for 'set_transform' action. For 2D nodes, z is typically 1. For 3D nodes, all axes are used."
                        },
                        property: {
                            type: 'string',
                            description: "Property name (e.g., active, name, layer). Required for 'set_property' action."
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
                            description: "Property value. Required for 'set_property' action."
                        }
                    },
                    required: ['action', 'uuid']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'node_lifecycle': {
                const action = args.action;
                switch (action) {
                    case 'create':
                        return await this.createNode(args);
                    case 'delete':
                        return await this.deleteNode(args.uuid);
                    case 'duplicate':
                        return await this.duplicateNode(args.uuid, args.includeChildren);
                    case 'move':
                        return await this.moveNode(args.nodeUuid, args.newParentUuid, args.siblingIndex);
                    case 'rename':
                        return await this.renameNode(args.uuid, args.name);
                    default:
                        throw new Error(`Unknown action for node_lifecycle: ${action}`);
                }
            }
            case 'node_query': {
                const action = args.action;
                switch (action) {
                    case 'get_info':
                        return await this.getNodeInfo(args.uuid);
                    case 'find_by_pattern':
                        return await this.findNodes(args.pattern, args.exactMatch);
                    case 'find_by_name':
                        return await this.findNodeByName(args.name);
                    case 'get_all':
                        return await this.getAllNodes();
                    case 'detect_type':
                        return await this.detectNodeType(args.uuid);
                    default:
                        throw new Error(`Unknown action for node_query: ${action}`);
                }
            }
            case 'node_transform':
                switch (args.action) {
                    case 'set_transform':
                        return await this.setNodeTransform(args);
                    case 'set_property':
                        return await this.setNodeProperty(args.uuid, args.property, args.value);
                    default:
                        throw new Error(`Unknown action for node_transform: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async createNode(args) {
        var _a, _b, _c, _d, _e;
        try {
            let targetParentUuid = args.parentUuid;
            // If no parent node UUID provided, get scene root node
            if (!targetParentUuid) {
                try {
                    const sceneInfo = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
                    if (sceneInfo && typeof sceneInfo === 'object' && !Array.isArray(sceneInfo) && Object.prototype.hasOwnProperty.call(sceneInfo, 'uuid')) {
                        targetParentUuid = sceneInfo.uuid;
                        logger_1.logger.info(`No parent specified, using scene root: ${targetParentUuid}`);
                    }
                    else if (Array.isArray(sceneInfo) && sceneInfo.length > 0 && sceneInfo[0].uuid) {
                        targetParentUuid = sceneInfo[0].uuid;
                        logger_1.logger.info(`No parent specified, using scene root: ${targetParentUuid}`);
                    }
                    else {
                        const currentScene = await (0, editor_request_1.editorRequest)('scene', 'query-current-scene');
                        if (currentScene && currentScene.uuid) {
                            targetParentUuid = currentScene.uuid;
                        }
                    }
                }
                catch (err) {
                    logger_1.logger.warn('Failed to get scene root, will use default behavior');
                }
            }
            // If assetPath is provided, first resolve to assetUuid
            let finalAssetUuid = args.assetUuid;
            if (args.assetPath && !finalAssetUuid) {
                try {
                    const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', args.assetPath);
                    if (assetInfo && assetInfo.uuid) {
                        finalAssetUuid = assetInfo.uuid;
                        logger_1.logger.info(`Asset path '${args.assetPath}' resolved to UUID: ${finalAssetUuid}`);
                    }
                    else {
                        return {
                            success: false,
                            error: `Asset not found at path: ${args.assetPath}`
                        };
                    }
                }
                catch (err) {
                    return {
                        success: false,
                        error: `Failed to resolve asset path '${args.assetPath}': ${err}`
                    };
                }
            }
            // Build create-node options
            const createNodeOptions = {
                name: args.name
            };
            // Set parent node
            if (targetParentUuid) {
                createNodeOptions.parent = targetParentUuid;
            }
            // Instantiate from asset
            if (finalAssetUuid) {
                createNodeOptions.assetUuid = finalAssetUuid;
                if (args.unlinkPrefab) {
                    createNodeOptions.unlinkPrefab = true;
                }
            }
            // Add components
            if (args.components && args.components.length > 0) {
                createNodeOptions.components = args.components;
            }
            else if (args.nodeType && args.nodeType !== 'Node' && !finalAssetUuid) {
                // Only add nodeType component when not instantiating from asset
                createNodeOptions.components = [args.nodeType];
            }
            // Keep world transform
            if (args.keepWorldTransform) {
                createNodeOptions.keepWorldTransform = true;
            }
            // Do not use dump params for initial transform, use set_node_transform after creation
            logger_1.logger.info(`Creating node with options: ${JSON.stringify(createNodeOptions)}`);
            // Create node
            const nodeUuid = await (0, editor_request_1.editorRequest)('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
            // Handle sibling index
            if (args.siblingIndex !== undefined && args.siblingIndex >= 0 && uuid && targetParentUuid) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for internal state update
                    await (0, editor_request_1.editorRequest)('scene', 'set-parent', {
                        parent: targetParentUuid,
                        uuids: [uuid],
                        keepWorldTransform: args.keepWorldTransform || false
                    });
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to set sibling index: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err)}`);
                }
            }
            // Add components (if provided)
            if (args.components && args.components.length > 0 && uuid) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for node creation to complete
                    for (const componentType of args.components) {
                        try {
                            const result = await this.componentTools.execute('component_manage', {
                                action: 'add',
                                nodeUuid: uuid,
                                componentType: componentType
                            });
                            if (result.success) {
                                logger_1.logger.info(`Component ${componentType} added successfully`);
                            }
                            else {
                                logger_1.logger.warn(`Failed to add component ${componentType}: ${String(result.error)}`);
                            }
                        }
                        catch (err) {
                            logger_1.logger.warn(`Failed to add component ${componentType}: ${(_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err)}`);
                        }
                    }
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to add components: ${(_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : String(err)}`);
                }
            }
            // Set initial transform (if provided)
            if (args.initialTransform && uuid) {
                try {
                    await new Promise(resolve => setTimeout(resolve, 150)); // Wait for node and component creation to complete
                    await this.setNodeTransform({
                        uuid: uuid,
                        position: args.initialTransform.position,
                        rotation: args.initialTransform.rotation,
                        scale: args.initialTransform.scale
                    });
                    logger_1.logger.info('Initial transform applied successfully');
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to set initial transform: ${(_d = err === null || err === void 0 ? void 0 : err.message) !== null && _d !== void 0 ? _d : String(err)}`);
                }
            }
            // Get created node info for verification
            let verificationData = null;
            try {
                const nodeInfo = await this.getNodeInfo(uuid);
                if (nodeInfo.success) {
                    verificationData = {
                        nodeInfo: nodeInfo.data,
                        creationDetails: {
                            parentUuid: targetParentUuid,
                            nodeType: args.nodeType || 'Node',
                            fromAsset: !!finalAssetUuid,
                            assetUuid: finalAssetUuid,
                            assetPath: args.assetPath,
                            timestamp: new Date().toISOString()
                        }
                    };
                }
            }
            catch (err) {
                logger_1.logger.warn(`Failed to get verification data: ${(_e = err === null || err === void 0 ? void 0 : err.message) !== null && _e !== void 0 ? _e : String(err)}`);
            }
            const successMessage = finalAssetUuid
                ? `Node '${args.name}' instantiated from asset successfully`
                : `Node '${args.name}' created successfully`;
            return {
                success: true,
                data: {
                    uuid: uuid,
                    name: args.name,
                    parentUuid: targetParentUuid,
                    nodeType: args.nodeType || 'Node',
                    fromAsset: !!finalAssetUuid,
                    assetUuid: finalAssetUuid,
                    message: successMessage
                },
                verificationData: verificationData
            };
        }
        catch (err) {
            return {
                success: false,
                error: `Failed to create node: ${err.message}. Args: ${JSON.stringify(args)}`
            };
        }
    }
    async getNodeInfo(uuid) {
        return (0, editor_request_1.toolCall)(async () => {
            const nodeData = await (0, editor_request_1.editorRequest)('scene', 'query-node', uuid);
            if (!nodeData) {
                throw new Error('Node not found or invalid response');
            }
            return nodeData;
        }, (nodeData) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            // Parse node info based on actual returned data structure
            const info = {
                uuid: ((_a = nodeData.uuid) === null || _a === void 0 ? void 0 : _a.value) || uuid,
                name: ((_b = nodeData.name) === null || _b === void 0 ? void 0 : _b.value) || 'Unknown',
                active: ((_c = nodeData.active) === null || _c === void 0 ? void 0 : _c.value) !== undefined ? nodeData.active.value : true,
                position: ((_d = nodeData.position) === null || _d === void 0 ? void 0 : _d.value) || { x: 0, y: 0, z: 0 },
                rotation: ((_e = nodeData.rotation) === null || _e === void 0 ? void 0 : _e.value) || { x: 0, y: 0, z: 0 },
                scale: ((_f = nodeData.scale) === null || _f === void 0 ? void 0 : _f.value) || { x: 1, y: 1, z: 1 },
                parent: ((_h = (_g = nodeData.parent) === null || _g === void 0 ? void 0 : _g.value) === null || _h === void 0 ? void 0 : _h.uuid) || null,
                children: nodeData.children || [],
                components: (nodeData.__comps__ || []).map((comp) => ({
                    type: comp.__type__ || comp.cid || comp.type || 'Unknown',
                    enabled: comp.enabled !== undefined ? comp.enabled : true
                })),
                layer: ((_j = nodeData.layer) === null || _j === void 0 ? void 0 : _j.value) || 1073741824,
                mobility: ((_k = nodeData.mobility) === null || _k === void 0 ? void 0 : _k.value) || 0
            };
            return { data: info };
        });
    }
    async findNodes(pattern, exactMatch = false) {
        // Note: 'query-nodes-by-name' API doesn't exist in official documentation
        // Using tree traversal as primary approach
        try {
            const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
            const nodes = [];
            const searchTree = (node, currentPath = '') => {
                const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
                const matches = exactMatch ?
                    node.name === pattern :
                    node.name.toLowerCase().includes(pattern.toLowerCase());
                if (matches) {
                    nodes.push({
                        uuid: node.uuid,
                        name: node.name,
                        path: nodePath
                    });
                }
                if (node.children) {
                    for (const child of node.children) {
                        searchTree(child, nodePath);
                    }
                }
            };
            if (tree) {
                searchTree(tree);
            }
            return { success: true, data: nodes };
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'findNodes',
                args: [pattern, exactMatch]
            };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Tree search failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    async findNodeByName(name) {
        try {
            // Try using Editor API to query node tree and search first
            const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
            const foundNode = this.searchNodeInTree(tree, name);
            if (foundNode) {
                return {
                    success: true,
                    data: {
                        uuid: foundNode.uuid,
                        name: foundNode.name,
                        path: this.getNodePath(foundNode)
                    }
                };
            }
            return { success: false, error: `Node '${name}' not found` };
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'findNodeByName',
                args: [name]
            };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    searchNodeInTree(node, targetName) {
        if (node.name === targetName) {
            return node;
        }
        if (node.children) {
            for (const child of node.children) {
                const found = this.searchNodeInTree(child, targetName);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    async getAllNodes() {
        try {
            // Try to query scene node tree
            const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
            const nodes = [];
            const traverseTree = (node) => {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    type: node.type,
                    active: node.active,
                    path: this.getNodePath(node)
                });
                if (node.children) {
                    for (const child of node.children) {
                        traverseTree(child);
                    }
                }
            };
            if (tree && tree.children) {
                traverseTree(tree);
            }
            return {
                success: true,
                data: {
                    totalNodes: nodes.length,
                    nodes: nodes
                }
            };
        }
        catch (err) {
            // Fallback: use scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'getAllNodes',
                args: []
            };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    getNodePath(node) {
        const path = [node.name];
        let current = node.parent;
        while (current && current.name !== 'Canvas') {
            path.unshift(current.name);
            current = current.parent;
        }
        return path.join('/');
    }
    async setNodeProperty(uuid, property, value) {
        try {
            // Try to set node property directly using Editor API
            await (0, editor_request_1.editorRequest)('scene', 'set-property', {
                uuid: uuid,
                path: property,
                dump: {
                    value: value
                }
            });
            // Get comprehensive verification data including updated node info
            try {
                const nodeInfo = await this.getNodeInfo(uuid);
                return {
                    success: true,
                    message: `Property '${property}' updated successfully`,
                    data: {
                        nodeUuid: uuid,
                        property: property,
                        newValue: value
                    },
                    verificationData: {
                        nodeInfo: nodeInfo.data,
                        changeDetails: {
                            property: property,
                            value: value,
                            timestamp: new Date().toISOString()
                        }
                    }
                };
            }
            catch (_a) {
                return {
                    success: true,
                    message: `Property '${property}' updated successfully (verification failed)`
                };
            }
        }
        catch (err) {
            // If direct setting fails, try using scene script
            const options = {
                name: 'cocos-mcp-server',
                method: 'setNodeProperty',
                args: [uuid, property, value]
            };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    async setNodeTransform(args) {
        const { uuid, position, rotation, scale } = args;
        const updatePromises = [];
        const updates = [];
        const warnings = [];
        try {
            // First get node info to determine if it's 2D or 3D
            const nodeInfoResponse = await this.getNodeInfo(uuid);
            if (!nodeInfoResponse.success || !nodeInfoResponse.data) {
                return { success: false, error: 'Failed to get node information' };
            }
            const nodeInfo = nodeInfoResponse.data;
            const is2DNode = this.is2DNode(nodeInfo);
            if (position) {
                const normalizedPosition = this.normalizeTransformValue(position, 'position', is2DNode);
                if (normalizedPosition.warning) {
                    warnings.push(normalizedPosition.warning);
                }
                updatePromises.push((0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: uuid,
                    path: 'position',
                    dump: { value: normalizedPosition.value }
                }));
                updates.push('position');
            }
            if (rotation) {
                const normalizedRotation = this.normalizeTransformValue(rotation, 'rotation', is2DNode);
                if (normalizedRotation.warning) {
                    warnings.push(normalizedRotation.warning);
                }
                updatePromises.push((0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: uuid,
                    path: 'rotation',
                    dump: { value: normalizedRotation.value }
                }));
                updates.push('rotation');
            }
            if (scale) {
                const normalizedScale = this.normalizeTransformValue(scale, 'scale', is2DNode);
                if (normalizedScale.warning) {
                    warnings.push(normalizedScale.warning);
                }
                updatePromises.push((0, editor_request_1.editorRequest)('scene', 'set-property', {
                    uuid: uuid,
                    path: 'scale',
                    dump: { value: normalizedScale.value }
                }));
                updates.push('scale');
            }
            if (updatePromises.length === 0) {
                return { success: false, error: 'No transform properties specified' };
            }
            await Promise.all(updatePromises);
            // Verify the changes by getting updated node info
            const updatedNodeInfo = await this.getNodeInfo(uuid);
            const response = {
                success: true,
                message: `Transform properties updated: ${updates.join(', ')} ${is2DNode ? '(2D node)' : '(3D node)'}`,
                updatedProperties: updates,
                data: {
                    nodeUuid: uuid,
                    nodeType: is2DNode ? '2D' : '3D',
                    appliedChanges: updates,
                    transformConstraints: {
                        position: is2DNode ? 'x, y only (z ignored)' : 'x, y, z all used',
                        rotation: is2DNode ? 'z only (x, y ignored)' : 'x, y, z all used',
                        scale: is2DNode ? 'x, y main, z typically 1' : 'x, y, z all used'
                    }
                },
                verificationData: {
                    nodeInfo: updatedNodeInfo.data,
                    transformDetails: {
                        originalNodeType: is2DNode ? '2D' : '3D',
                        appliedTransforms: updates,
                        timestamp: new Date().toISOString()
                    },
                    beforeAfterComparison: {
                        before: nodeInfo,
                        after: updatedNodeInfo.data
                    }
                }
            };
            if (warnings.length > 0) {
                response.warning = warnings.join('; ');
            }
            return response;
        }
        catch (err) {
            return {
                success: false,
                error: `Failed to update transform: ${err.message}`
            };
        }
    }
    is2DNode(nodeInfo) {
        // Check if node has 2D-specific components or is under Canvas
        const components = nodeInfo.components || [];
        // Check for common 2D components
        const has2DComponents = components.some((comp) => comp.type && (comp.type.includes('cc.Sprite') ||
            comp.type.includes('cc.Label') ||
            comp.type.includes('cc.Button') ||
            comp.type.includes('cc.Layout') ||
            comp.type.includes('cc.Widget') ||
            comp.type.includes('cc.Mask') ||
            comp.type.includes('cc.Graphics')));
        if (has2DComponents) {
            return true;
        }
        // Check for 3D-specific components
        const has3DComponents = components.some((comp) => comp.type && (comp.type.includes('cc.MeshRenderer') ||
            comp.type.includes('cc.Camera') ||
            comp.type.includes('cc.Light') ||
            comp.type.includes('cc.DirectionalLight') ||
            comp.type.includes('cc.PointLight') ||
            comp.type.includes('cc.SpotLight')));
        if (has3DComponents) {
            return false;
        }
        // Default heuristic: if z position is 0 and hasn't been changed, likely 2D
        const position = nodeInfo.position;
        if (position && Math.abs(position.z) < 0.001) {
            return true;
        }
        // Default to 3D if uncertain
        return false;
    }
    normalizeTransformValue(value, type, is2D) {
        const result = Object.assign({}, value);
        let warning;
        if (is2D) {
            switch (type) {
                case 'position':
                    if (value.z !== undefined && Math.abs(value.z) > 0.001) {
                        warning = `2D node: z position (${value.z}) ignored, set to 0`;
                        result.z = 0;
                    }
                    else if (value.z === undefined) {
                        result.z = 0;
                    }
                    break;
                case 'rotation':
                    if ((value.x !== undefined && Math.abs(value.x) > 0.001) ||
                        (value.y !== undefined && Math.abs(value.y) > 0.001)) {
                        warning = `2D node: x,y rotations ignored, only z rotation applied`;
                        result.x = 0;
                        result.y = 0;
                    }
                    else {
                        result.x = result.x || 0;
                        result.y = result.y || 0;
                    }
                    result.z = result.z || 0;
                    break;
                case 'scale':
                    if (value.z === undefined) {
                        result.z = 1; // Default scale for 2D
                    }
                    break;
            }
        }
        else {
            // 3D node - ensure all axes are defined
            result.x = result.x !== undefined ? result.x : (type === 'scale' ? 1 : 0);
            result.y = result.y !== undefined ? result.y : (type === 'scale' ? 1 : 0);
            result.z = result.z !== undefined ? result.z : (type === 'scale' ? 1 : 0);
        }
        return { value: result, warning };
    }
    async deleteNode(uuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'remove-node', { uuid: uuid }), () => ({ message: 'Node deleted successfully' }));
    }
    async moveNode(nodeUuid, newParentUuid, siblingIndex = -1) {
        // Use correct set-parent API instead of move-node
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'set-parent', {
            parent: newParentUuid,
            uuids: [nodeUuid],
            keepWorldTransform: false
        }), () => ({ message: 'Node moved successfully' }));
    }
    async renameNode(uuid, name) {
        if (!uuid)
            return { success: false, error: 'uuid is required' };
        if (!name)
            return { success: false, error: 'name is required' };
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'set-property', {
            uuid,
            path: 'name',
            dump: { type: 'String', value: name }
        }), () => ({ message: `Node renamed to "${name}"` }));
    }
    async duplicateNode(uuid, includeChildren = true) {
        // Note: includeChildren parameter is accepted for future use but not currently implemented
        // Cocos `duplicate-node` returns string[] of new node UUIDs.
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'duplicate-node', uuid), (result) => {
            var _a;
            const newUuids = Array.isArray(result) ? result : ((result === null || result === void 0 ? void 0 : result.uuid) ? [result.uuid] : []);
            return {
                data: {
                    newUuids,
                    newUuid: (_a = newUuids[0]) !== null && _a !== void 0 ? _a : null,
                    message: 'Node duplicated successfully'
                }
            };
        });
    }
    async detectNodeType(uuid) {
        try {
            const nodeInfoResponse = await this.getNodeInfo(uuid);
            if (!nodeInfoResponse.success || !nodeInfoResponse.data) {
                return { success: false, error: 'Failed to get node information' };
            }
            const nodeInfo = nodeInfoResponse.data;
            const is2D = this.is2DNode(nodeInfo);
            const components = nodeInfo.components || [];
            // Collect detection reasons
            const detectionReasons = [];
            // Check for 2D components
            const twoDComponents = components.filter((comp) => comp.type && (comp.type.includes('cc.Sprite') ||
                comp.type.includes('cc.Label') ||
                comp.type.includes('cc.Button') ||
                comp.type.includes('cc.Layout') ||
                comp.type.includes('cc.Widget') ||
                comp.type.includes('cc.Mask') ||
                comp.type.includes('cc.Graphics')));
            // Check for 3D components
            const threeDComponents = components.filter((comp) => comp.type && (comp.type.includes('cc.MeshRenderer') ||
                comp.type.includes('cc.Camera') ||
                comp.type.includes('cc.Light') ||
                comp.type.includes('cc.DirectionalLight') ||
                comp.type.includes('cc.PointLight') ||
                comp.type.includes('cc.SpotLight')));
            if (twoDComponents.length > 0) {
                detectionReasons.push(`Has 2D components: ${twoDComponents.map((c) => c.type).join(', ')}`);
            }
            if (threeDComponents.length > 0) {
                detectionReasons.push(`Has 3D components: ${threeDComponents.map((c) => c.type).join(', ')}`);
            }
            // Check position for heuristic
            const position = nodeInfo.position;
            if (position && Math.abs(position.z) < 0.001) {
                detectionReasons.push('Z position is ~0 (likely 2D)');
            }
            else if (position && Math.abs(position.z) > 0.001) {
                detectionReasons.push(`Z position is ${position.z} (likely 3D)`);
            }
            if (detectionReasons.length === 0) {
                detectionReasons.push('No specific indicators found, defaulting based on heuristics');
            }
            return {
                success: true,
                data: {
                    nodeUuid: uuid,
                    nodeName: nodeInfo.name,
                    nodeType: is2D ? '2D' : '3D',
                    detectionReasons: detectionReasons,
                    components: components.map((comp) => ({
                        type: comp.type,
                        category: this.getComponentCategory(comp.type)
                    })),
                    position: nodeInfo.position,
                    transformConstraints: {
                        position: is2D ? 'x, y only (z ignored)' : 'x, y, z all used',
                        rotation: is2D ? 'z only (x, y ignored)' : 'x, y, z all used',
                        scale: is2D ? 'x, y main, z typically 1' : 'x, y, z all used'
                    }
                }
            };
        }
        catch (err) {
            return {
                success: false,
                error: `Failed to detect node type: ${err.message}`
            };
        }
    }
    getComponentCategory(componentType) {
        if (!componentType)
            return 'unknown';
        if (componentType.includes('cc.Sprite') || componentType.includes('cc.Label') ||
            componentType.includes('cc.Button') || componentType.includes('cc.Layout') ||
            componentType.includes('cc.Widget') || componentType.includes('cc.Mask') ||
            componentType.includes('cc.Graphics')) {
            return '2D';
        }
        if (componentType.includes('cc.MeshRenderer') || componentType.includes('cc.Camera') ||
            componentType.includes('cc.Light') || componentType.includes('cc.DirectionalLight') ||
            componentType.includes('cc.PointLight') || componentType.includes('cc.SpotLight')) {
            return '3D';
        }
        return 'generic';
    }
}
exports.NodeTools = NodeTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHVEQUFtRDtBQUNuRCxzQ0FBbUM7QUFDbkMsNERBQWtFO0FBRWxFLE1BQWEsU0FBUztJQUF0QjtRQUNZLG1CQUFjLEdBQUcsSUFBSSxnQ0FBYyxFQUFFLENBQUM7SUFvaENsRCxDQUFDO0lBbmhDRyxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxtSkFBbUo7Z0JBQ2hLLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxRQUFRLENBQUM7NEJBQ3pELFdBQVcsRUFBRSxpQ0FBaUM7eUJBQ2pEO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsd0RBQXdEO3lCQUN4RTt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNFQUFzRTt5QkFDdEY7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzRkFBc0Y7eUJBQ3RHO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUscURBQXFEOzRCQUNsRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQzs0QkFDbEMsT0FBTyxFQUFFLE1BQU07eUJBQ2xCO3dCQUNELFlBQVksRUFBRTs0QkFDVixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsNEZB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LENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7Z0JBQzNFLFFBQVEsRUFBRSxDQUFBLE1BQUEsUUFBUSxDQUFDLFFBQVEsMENBQUUsS0FBSyxLQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzFELFFBQVEsRUFBRSxDQUFBLE1BQUEsUUFBUSxDQUFDLFFBQVEsMENBQUUsS0FBSyxLQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzFELEtBQUssRUFBRSxDQUFBLE1BQUEsUUFBUSxDQUFDLEtBQUssMENBQUUsS0FBSyxLQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BELE1BQU0sRUFBRSxDQUFBLE1BQUEsTUFBQSxRQUFRLENBQUMsTUFBTSwwQ0FBRSxLQUFLLDBDQUFFLElBQUksS0FBSSxJQUFJO2dCQUM1QyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVEsSUFBSSxFQUFFO2dCQUNqQyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLFNBQVM7b0JBQ3pELE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSTtpQkFDNUQsQ0FBQyxDQUFDO2dCQUNILEtBQUssRUFBRSxDQUFBLE1BQUEsUUFBUSxDQUFDLEtBQUssMENBQUUsS0FBSyxLQUFJLFVBQVU7Z0JBQzFDLFFB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QUM5QyxJQUFJLENBQUMsYUFBYTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBRXJDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztZQUN6RSxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQzFFLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDeEUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztZQUNoRixhQUFhLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUM7WUFDbkYsYUFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDcEYsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ3JCLENBQUM7Q0FDSjtBQXJoQ0QsOEJBcWhDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgTm9kZUluZm8gfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uL2xvZ2dlcic7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuZXhwb3J0IGNsYXNzIE5vZGVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBjb21wb25lbnRUb29scyA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdub2RlX2xpZmVjeWNsZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2Ugbm9kZSBsaWZlY3ljbGU6IGNyZWF0ZSwgZGVsZXRlLCBkdXBsaWNhdGUsIG1vdmUsIG9yIHJlbmFtZSBub2RlcyBpbiB0aGUgc2NlbmUuIEF2YWlsYWJsZSBhY3Rpb25zOiBjcmVhdGUsIGRlbGV0ZSwgZHVwbGljYXRlLCBtb3ZlLCByZW5hbWUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydjcmVhdGUnLCAnZGVsZXRlJywgJ2R1cGxpY2F0ZScsICdtb3ZlJywgJ3JlbmFtZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGxpZmVjeWNsZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBuYW1lLiBSZXF1aXJlZCBmb3IgJ2NyZWF0ZScgYW5kICdyZW5hbWUnIGFjdGlvbnMuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlELiBSZXF1aXJlZCBmb3IgJ2RlbGV0ZScsICdkdXBsaWNhdGUnLCBhbmQgJ3JlbmFtZScgYWN0aW9ucy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJQYXJlbnQgbm9kZSBVVUlEIChjcmVhdGUpLiBTdHJvbmdseSByZWNvbW1lbmRlZCDigJQgb21pdCBvbmx5IHRvIGNyZWF0ZSBhdCBzY2VuZSByb290LlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIHR5cGUgZm9yICdjcmVhdGUnIGFjdGlvbjogTm9kZSwgMkROb2RlLCAzRE5vZGVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ05vZGUnLCAnMkROb2RlJywgJzNETm9kZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdOb2RlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdJbmRleDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNpYmxpbmcgaW5kZXggZm9yIG9yZGVyaW5nLiBVc2VkIGZvciAnY3JlYXRlJyBhbmQgJ21vdmUnIGFjdGlvbnMuICgtMSBtZWFucyBhcHBlbmQgYXQgZW5kKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IC0xXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQXNzZXQgVVVJRCB0byBpbnN0YW50aWF0ZSBmcm9tIChjcmVhdGUpLCBlLmcuIGEgcHJlZmFiIFVVSUQsIGluc3RlYWQgb2YgYW4gZW1wdHkgbm9kZS5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkFzc2V0IHBhdGggdG8gaW5zdGFudGlhdGUgZnJvbSAoY3JlYXRlKSwgZS5nLiBcXFwiZGI6Ly9hc3NldHMvcHJlZmFicy9NeVByZWZhYi5wcmVmYWJcXFwiLiBBbHRlcm5hdGl2ZSB0byBhc3NldFV1aWQuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkNvbXBvbmVudCB0eXBlcyB0byBhZGQgdG8gdGhlIG5ldyBub2RlIChjcmVhdGUpLCBlLmcuIFtcXFwiY2MuU3ByaXRlXFxcIiwgXFxcImNjLkJ1dHRvblxcXCJdLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5saW5rUHJlZmFiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIklmIHRydWUsIHVubGluayBmcm9tIHNvdXJjZSBwcmVmYWIgdG8gY3JlYXRlIGEgcmVndWxhciBub2RlIChjcmVhdGUpLlwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIktlZXAgd29ybGQgdHJhbnNmb3JtIHdoZW4gY3JlYXRpbmcgdGhlIG5vZGUgKGNyZWF0ZSkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsVHJhbnNmb3JtOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiB7IHR5cGU6ICdudW1iZXInIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IHsgdHlwZTogJ251bWJlcicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJJbml0aWFsIHRyYW5zZm9ybSBmb3IgdGhlIGNyZWF0ZWQgbm9kZSAoY3JlYXRlKS5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJJbmNsdWRlIGNoaWxkcmVuIHdoZW4gZHVwbGljYXRpbmcgKGR1cGxpY2F0ZSkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlEIHRvIG1vdmUuIFJlcXVpcmVkIGZvciAnbW92ZScuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTmV3IHBhcmVudCBub2RlIFVVSUQuIFJlcXVpcmVkIGZvciAnbW92ZScuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdub2RlX3F1ZXJ5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGFuZCBpbnNwZWN0IG5vZGVzIGluIHRoZSBzY2VuZS4gQXZhaWxhYmxlIGFjdGlvbnM6IGdldF9pbmZvLCBmaW5kX2J5X3BhdHRlcm4sIGZpbmRfYnlfbmFtZSwgZ2V0X2FsbCwgZGV0ZWN0X3R5cGUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaW5mbycsICdmaW5kX2J5X3BhdHRlcm4nLCAnZmluZF9ieV9uYW1lJywgJ2dldF9hbGwnLCAnZGV0ZWN0X3R5cGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBxdWVyeSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlELiBSZXF1aXJlZCBmb3IgJ2dldF9pbmZvJyBhbmQgJ2RldGVjdF90eXBlJyBhY3Rpb25zLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5hbWUgcGF0dGVybiB0byBzZWFyY2guIFJlcXVpcmVkIGZvciAnZmluZF9ieV9wYXR0ZXJuJyBhY3Rpb24uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdE1hdGNoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkV4YWN0IG1hdGNoIG9yIHBhcnRpYWwgbWF0Y2guIFVzZWQgZm9yICdmaW5kX2J5X3BhdHRlcm4nIGFjdGlvbi5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIG5hbWUgdG8gZmluZC4gUmVxdWlyZWQgZm9yICdmaW5kX2J5X25hbWUnIGFjdGlvbi5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ25vZGVfdHJhbnNmb3JtJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vZGlmeSBub2RlIHRyYW5zZm9ybSBvciBwcm9wZXJ0aWVzLiBBdmFpbGFibGUgYWN0aW9uczogc2V0X3RyYW5zZm9ybSwgc2V0X3Byb3BlcnR5LiBzZXRfdHJhbnNmb3JtIGF1dG9tYXRpY2FsbHkgaGFuZGxlcyAyRC8zRCBub2RlIGRpZmZlcmVuY2VzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnc2V0X3RyYW5zZm9ybScsICdzZXRfcHJvcGVydHknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSB0cmFuc2Zvcm0vcHJvcGVydHkgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlELiBSZXF1aXJlZCBmb3IgYm90aCBhY3Rpb25zLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnWiBjb29yZGluYXRlIChpZ25vcmVkIGZvciAyRCBub2RlcyknIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgcG9zaXRpb24uIFVzZWQgZm9yICdzZXRfdHJhbnNmb3JtJyBhY3Rpb24uIEZvciAyRCBub2Rlcywgb25seSB4LHkgYXJlIHVzZWQ7IHogaXMgaWdub3JlZC4gRm9yIDNEIG5vZGVzLCBhbGwgY29vcmRpbmF0ZXMgYXJlIHVzZWQuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdYIHJvdGF0aW9uIChpZ25vcmVkIGZvciAyRCBub2RlcyknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnWSByb3RhdGlvbiAoaWdub3JlZCBmb3IgMkQgbm9kZXMpJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1ogcm90YXRpb24gKG1haW4gcm90YXRpb24gYXhpcyBmb3IgMkQgbm9kZXMpJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIHJvdGF0aW9uIGluIGV1bGVyIGFuZ2xlcy4gVXNlZCBmb3IgJ3NldF90cmFuc2Zvcm0nIGFjdGlvbi4gRm9yIDJEIG5vZGVzLCBvbmx5IHogcm90YXRpb24gaXMgdXNlZC4gRm9yIDNEIG5vZGVzLCBhbGwgYXhlcyBhcmUgdXNlZC5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdaIHNjYWxlICh1c3VhbGx5IDEgZm9yIDJEIG5vZGVzKScgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBzY2FsZS4gVXNlZCBmb3IgJ3NldF90cmFuc2Zvcm0nIGFjdGlvbi4gRm9yIDJEIG5vZGVzLCB6IGlzIHR5cGljYWxseSAxLiBGb3IgM0Qgbm9kZXMsIGFsbCBheGVzIGFyZSB1c2VkLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSBuYW1lIChlLmcuLCBhY3RpdmUsIG5hbWUsIGxheWVyKS4gUmVxdWlyZWQgZm9yICdzZXRfcHJvcGVydHknIGFjdGlvbi5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25lT2Y6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2Jvb2xlYW4nIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ29iamVjdCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnYXJyYXknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ251bGwnIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlByb3BlcnR5IHZhbHVlLiBSZXF1aXJlZCBmb3IgJ3NldF9wcm9wZXJ0eScgYWN0aW9uLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICd1dWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdub2RlX2xpZmVjeWNsZSc6IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbjtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlTm9kZShhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmRlbGV0ZU5vZGUoYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZHVwbGljYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmR1cGxpY2F0ZU5vZGUoYXJncy51dWlkLCBhcmdzLmluY2x1ZGVDaGlsZHJlbik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vdmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubW92ZU5vZGUoYXJncy5ub2RlVXVpZCwgYXJncy5uZXdQYXJlbnRVdWlkLCBhcmdzLnNpYmxpbmdJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW5hbWVOb2RlKGFyZ3MudXVpZCwgYXJncy5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIG5vZGVfbGlmZWN5Y2xlOiAke2FjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdub2RlX3F1ZXJ5Jzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbmRfYnlfcGF0dGVybic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5maW5kTm9kZXMoYXJncy5wYXR0ZXJuLCBhcmdzLmV4YWN0TWF0Y2gpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdmaW5kX2J5X25hbWUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZmluZE5vZGVCeU5hbWUoYXJncy5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2FsbCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBbGxOb2RlcygpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZXRlY3RfdHlwZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kZXRlY3ROb2RlVHlwZShhcmdzLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3Igbm9kZV9xdWVyeTogJHthY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnbm9kZV90cmFuc2Zvcm0nOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2V0X3RyYW5zZm9ybSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXROb2RlVHJhbnNmb3JtKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzZXRfcHJvcGVydHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0Tm9kZVByb3BlcnR5KGFyZ3MudXVpZCwgYXJncy5wcm9wZXJ0eSwgYXJncy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBub2RlX3RyYW5zZm9ybTogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVOb2RlKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBsZXQgdGFyZ2V0UGFyZW50VXVpZCA9IGFyZ3MucGFyZW50VXVpZDtcblxuICAgICAgICAgICAgLy8gSWYgbm8gcGFyZW50IG5vZGUgVVVJRCBwcm92aWRlZCwgZ2V0IHNjZW5lIHJvb3Qgbm9kZVxuICAgICAgICAgICAgaWYgKCF0YXJnZXRQYXJlbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVJbmZvID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY2VuZUluZm8gJiYgdHlwZW9mIHNjZW5lSW5mbyA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoc2NlbmVJbmZvKSAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc2NlbmVJbmZvLCAndXVpZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRQYXJlbnRVdWlkID0gKHNjZW5lSW5mbyBhcyBhbnkpLnV1aWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgTm8gcGFyZW50IHNwZWNpZmllZCwgdXNpbmcgc2NlbmUgcm9vdDogJHt0YXJnZXRQYXJlbnRVdWlkfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoc2NlbmVJbmZvKSAmJiBzY2VuZUluZm8ubGVuZ3RoID4gMCAmJiBzY2VuZUluZm9bMF0udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0UGFyZW50VXVpZCA9IHNjZW5lSW5mb1swXS51dWlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYE5vIHBhcmVudCBzcGVjaWZpZWQsIHVzaW5nIHNjZW5lIHJvb3Q6ICR7dGFyZ2V0UGFyZW50VXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTY2VuZTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY3VycmVudC1zY2VuZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTY2VuZSAmJiBjdXJyZW50U2NlbmUudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFBhcmVudFV1aWQgPSBjdXJyZW50U2NlbmUudXVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGdldCBzY2VuZSByb290LCB3aWxsIHVzZSBkZWZhdWx0IGJlaGF2aW9yJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJZiBhc3NldFBhdGggaXMgcHJvdmlkZWQsIGZpcnN0IHJlc29sdmUgdG8gYXNzZXRVdWlkXG4gICAgICAgICAgICBsZXQgZmluYWxBc3NldFV1aWQgPSBhcmdzLmFzc2V0VXVpZDtcbiAgICAgICAgICAgIGlmIChhcmdzLmFzc2V0UGF0aCAmJiAhZmluYWxBc3NldFV1aWQpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldEluZm86IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhcmdzLmFzc2V0UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8gJiYgYXNzZXRJbmZvLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmFsQXNzZXRVdWlkID0gYXNzZXRJbmZvLnV1aWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgQXNzZXQgcGF0aCAnJHthcmdzLmFzc2V0UGF0aH0nIHJlc29sdmVkIHRvIFVVSUQ6ICR7ZmluYWxBc3NldFV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kIGF0IHBhdGg6ICR7YXJncy5hc3NldFBhdGh9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZXNvbHZlIGFzc2V0IHBhdGggJyR7YXJncy5hc3NldFBhdGh9JzogJHtlcnJ9YFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQnVpbGQgY3JlYXRlLW5vZGUgb3B0aW9uc1xuICAgICAgICAgICAgY29uc3QgY3JlYXRlTm9kZU9wdGlvbnM6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBhcmdzLm5hbWVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFNldCBwYXJlbnQgbm9kZVxuICAgICAgICAgICAgaWYgKHRhcmdldFBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5wYXJlbnQgPSB0YXJnZXRQYXJlbnRVdWlkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbnN0YW50aWF0ZSBmcm9tIGFzc2V0XG4gICAgICAgICAgICBpZiAoZmluYWxBc3NldFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5hc3NldFV1aWQgPSBmaW5hbEFzc2V0VXVpZDtcbiAgICAgICAgICAgICAgICBpZiAoYXJncy51bmxpbmtQcmVmYWIpIHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMudW5saW5rUHJlZmFiID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAoYXJncy5jb21wb25lbnRzICYmIGFyZ3MuY29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMuY29tcG9uZW50cyA9IGFyZ3MuY29tcG9uZW50cztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJncy5ub2RlVHlwZSAmJiBhcmdzLm5vZGVUeXBlICE9PSAnTm9kZScgJiYgIWZpbmFsQXNzZXRVdWlkKSB7XG4gICAgICAgICAgICAgICAgLy8gT25seSBhZGQgbm9kZVR5cGUgY29tcG9uZW50IHdoZW4gbm90IGluc3RhbnRpYXRpbmcgZnJvbSBhc3NldFxuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLmNvbXBvbmVudHMgPSBbYXJncy5ub2RlVHlwZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEtlZXAgd29ybGQgdHJhbnNmb3JtXG4gICAgICAgICAgICBpZiAoYXJncy5rZWVwV29ybGRUcmFuc2Zvcm0pIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5rZWVwV29ybGRUcmFuc2Zvcm0gPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEbyBub3QgdXNlIGR1bXAgcGFyYW1zIGZvciBpbml0aWFsIHRyYW5zZm9ybSwgdXNlIHNldF9ub2RlX3RyYW5zZm9ybSBhZnRlciBjcmVhdGlvblxuXG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgQ3JlYXRpbmcgbm9kZSB3aXRoIG9wdGlvbnM6ICR7SlNPTi5zdHJpbmdpZnkoY3JlYXRlTm9kZU9wdGlvbnMpfWApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgbm9kZVxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1ub2RlJywgY3JlYXRlTm9kZU9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXVpZCA9IEFycmF5LmlzQXJyYXkobm9kZVV1aWQpID8gbm9kZVV1aWRbMF0gOiBub2RlVXVpZDtcblxuICAgICAgICAgICAgLy8gSGFuZGxlIHNpYmxpbmcgaW5kZXhcbiAgICAgICAgICAgIGlmIChhcmdzLnNpYmxpbmdJbmRleCAhPT0gdW5kZWZpbmVkICYmIGFyZ3Muc2libGluZ0luZGV4ID49IDAgJiYgdXVpZCAmJiB0YXJnZXRQYXJlbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwMCkpOyAvLyBXYWl0IGZvciBpbnRlcm5hbCBzdGF0ZSB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXBhcmVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudDogdGFyZ2V0UGFyZW50VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRzOiBbdXVpZF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBrZWVwV29ybGRUcmFuc2Zvcm06IGFyZ3Mua2VlcFdvcmxkVHJhbnNmb3JtIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIHNldCBzaWJsaW5nIGluZGV4OiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBjb21wb25lbnRzIChpZiBwcm92aWRlZClcbiAgICAgICAgICAgIGlmIChhcmdzLmNvbXBvbmVudHMgJiYgYXJncy5jb21wb25lbnRzLmxlbmd0aCA+IDAgJiYgdXVpZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAxMDApKTsgLy8gV2FpdCBmb3Igbm9kZSBjcmVhdGlvbiB0byBjb21wbGV0ZVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudFR5cGUgb2YgYXJncy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkIHN1Y2Nlc3NmdWxseWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gYWRkIGNvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9OiAke1N0cmluZyhyZXN1bHQuZXJyb3IpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gYWRkIGNvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9OiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIGFkZCBjb21wb25lbnRzOiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBpbml0aWFsIHRyYW5zZm9ybSAoaWYgcHJvdmlkZWQpXG4gICAgICAgICAgICBpZiAoYXJncy5pbml0aWFsVHJhbnNmb3JtICYmIHV1aWQpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMTUwKSk7IC8vIFdhaXQgZm9yIG5vZGUgYW5kIGNvbXBvbmVudCBjcmVhdGlvbiB0byBjb21wbGV0ZVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldE5vZGVUcmFuc2Zvcm0oe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBhcmdzLmluaXRpYWxUcmFuc2Zvcm0ucG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogYXJncy5pbml0aWFsVHJhbnNmb3JtLnJvdGF0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IGFyZ3MuaW5pdGlhbFRyYW5zZm9ybS5zY2FsZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0luaXRpYWwgdHJhbnNmb3JtIGFwcGxpZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gc2V0IGluaXRpYWwgdHJhbnNmb3JtOiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBjcmVhdGVkIG5vZGUgaW5mbyBmb3IgdmVyaWZpY2F0aW9uXG4gICAgICAgICAgICBsZXQgdmVyaWZpY2F0aW9uRGF0YTogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKHV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlSW5mby5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkRhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlSW5mbzogbm9kZUluZm8uZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNyZWF0aW9uRGV0YWlsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHRhcmdldFBhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGU6IGFyZ3Mubm9kZVR5cGUgfHwgJ05vZGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21Bc3NldDogISFmaW5hbEFzc2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGZpbmFsQXNzZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0UGF0aDogYXJncy5hc3NldFBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBsb2dnZXIud2FybihgRmFpbGVkIHRvIGdldCB2ZXJpZmljYXRpb24gZGF0YTogJHsoZXJyIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycil9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHN1Y2Nlc3NNZXNzYWdlID0gZmluYWxBc3NldFV1aWRcbiAgICAgICAgICAgICAgICA/IGBOb2RlICcke2FyZ3MubmFtZX0nIGluc3RhbnRpYXRlZCBmcm9tIGFzc2V0IHN1Y2Nlc3NmdWxseWBcbiAgICAgICAgICAgICAgICA6IGBOb2RlICcke2FyZ3MubmFtZX0nIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YDtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXJncy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB0YXJnZXRQYXJlbnRVdWlkLFxuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZTogYXJncy5ub2RlVHlwZSB8fCAnTm9kZScsXG4gICAgICAgICAgICAgICAgICAgIGZyb21Bc3NldDogISFmaW5hbEFzc2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBmaW5hbEFzc2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogc3VjY2Vzc01lc3NhZ2VcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkRhdGE6IHZlcmlmaWNhdGlvbkRhdGFcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gY3JlYXRlIG5vZGU6ICR7ZXJyLm1lc3NhZ2V9LiBBcmdzOiAke0pTT04uc3RyaW5naWZ5KGFyZ3MpfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldE5vZGVJbmZvKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHV1aWQpO1xuICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIG5vdCBmb3VuZCBvciBpbnZhbGlkIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBub2RlRGF0YTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAobm9kZURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBQYXJzZSBub2RlIGluZm8gYmFzZWQgb24gYWN0dWFsIHJldHVybmVkIGRhdGEgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogTm9kZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVEYXRhLnV1aWQ/LnZhbHVlIHx8IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGVEYXRhLm5hbWU/LnZhbHVlIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlRGF0YS5hY3RpdmU/LnZhbHVlICE9PSB1bmRlZmluZWQgPyBub2RlRGF0YS5hY3RpdmUudmFsdWUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZURhdGEucG9zaXRpb24/LnZhbHVlIHx8IHsgeDogMCwgeTogMCwgejogMCB9LFxuICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogbm9kZURhdGEucm90YXRpb24/LnZhbHVlIHx8IHsgeDogMCwgeTogMCwgejogMCB9LFxuICAgICAgICAgICAgICAgICAgICBzY2FsZTogbm9kZURhdGEuc2NhbGU/LnZhbHVlIHx8IHsgeDogMSwgeTogMSwgejogMSB9LFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGVEYXRhLnBhcmVudD8udmFsdWU/LnV1aWQgfHwgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IG5vZGVEYXRhLmNoaWxkcmVuIHx8IFtdLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiAobm9kZURhdGEuX19jb21wc19fIHx8IFtdKS5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgY29tcC50eXBlIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gY29tcC5lbmFibGVkIDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KSksXG4gICAgICAgICAgICAgICAgICAgIGxheWVyOiBub2RlRGF0YS5sYXllcj8udmFsdWUgfHwgMTA3Mzc0MTgyNCxcbiAgICAgICAgICAgICAgICAgICAgbW9iaWxpdHk6IG5vZGVEYXRhLm1vYmlsaXR5Py52YWx1ZSB8fCAwXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBkYXRhOiBpbmZvIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kTm9kZXMocGF0dGVybjogc3RyaW5nLCBleGFjdE1hdGNoOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBOb3RlOiAncXVlcnktbm9kZXMtYnktbmFtZScgQVBJIGRvZXNuJ3QgZXhpc3QgaW4gb2ZmaWNpYWwgZG9jdW1lbnRhdGlvblxuICAgICAgICAvLyBVc2luZyB0cmVlIHRyYXZlcnNhbCBhcyBwcmltYXJ5IGFwcHJvYWNoXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0cmVlOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xuXG4gICAgICAgICAgICBjb25zdCBzZWFyY2hUcmVlID0gKG5vZGU6IGFueSwgY3VycmVudFBhdGg6IHN0cmluZyA9ICcnKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZVBhdGggPSBjdXJyZW50UGF0aCA/IGAke2N1cnJlbnRQYXRofS8ke25vZGUubmFtZX1gIDogbm9kZS5uYW1lO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2hlcyA9IGV4YWN0TWF0Y2ggP1xuICAgICAgICAgICAgICAgICAgICBub2RlLm5hbWUgPT09IHBhdHRlcm4gOlxuICAgICAgICAgICAgICAgICAgICBub2RlLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhwYXR0ZXJuLnRvTG93ZXJDYXNlKCkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBub2RlUGF0aFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaFRyZWUoY2hpbGQsIG5vZGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0cmVlKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoVHJlZSh0cmVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbm9kZXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdmaW5kTm9kZXMnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtwYXR0ZXJuLCBleGFjdE1hdGNoXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFRyZWUgc2VhcmNoIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmluZE5vZGVCeU5hbWUobmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSB1c2luZyBFZGl0b3IgQVBJIHRvIHF1ZXJ5IG5vZGUgdHJlZSBhbmQgc2VhcmNoIGZpcnN0XG4gICAgICAgICAgICBjb25zdCB0cmVlOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kTm9kZSA9IHRoaXMuc2VhcmNoTm9kZUluVHJlZSh0cmVlLCBuYW1lKTtcbiAgICAgICAgICAgIGlmIChmb3VuZE5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBmb3VuZE5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGZvdW5kTm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5nZXROb2RlUGF0aChmb3VuZE5vZGUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSAnJHtuYW1lfScgbm90IGZvdW5kYCB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHVzZSBzY2VuZSBzY3JpcHRcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2ZpbmROb2RlQnlOYW1lJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbmFtZV1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2VhcmNoTm9kZUluVHJlZShub2RlOiBhbnksIHRhcmdldE5hbWU6IHN0cmluZyk6IGFueSB7XG4gICAgICAgIGlmIChub2RlLm5hbWUgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBub2RlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gdGhpcy5zZWFyY2hOb2RlSW5UcmVlKGNoaWxkLCB0YXJnZXROYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QWxsTm9kZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBxdWVyeSBzY2VuZSBub2RlIHRyZWVcbiAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XG5cbiAgICAgICAgICAgIGNvbnN0IHRyYXZlcnNlVHJlZSA9IChub2RlOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBub2Rlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IG5vZGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogdGhpcy5nZXROb2RlUGF0aChub2RlKVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmF2ZXJzZVRyZWUoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHRyZWUgJiYgdHJlZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIHRyYXZlcnNlVHJlZSh0cmVlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxOb2Rlczogbm9kZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBub2Rlczogbm9kZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHVzZSBzY2VuZSBzY3JpcHRcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldEFsbE5vZGVzJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXROb2RlUGF0aChub2RlOiBhbnkpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBwYXRoID0gW25vZGUubmFtZV07XG4gICAgICAgIGxldCBjdXJyZW50ID0gbm9kZS5wYXJlbnQ7XG4gICAgICAgIHdoaWxlIChjdXJyZW50ICYmIGN1cnJlbnQubmFtZSAhPT0gJ0NhbnZhcycpIHtcbiAgICAgICAgICAgIHBhdGgudW5zaGlmdChjdXJyZW50Lm5hbWUpO1xuICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoLmpvaW4oJy8nKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldE5vZGVQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIHNldCBub2RlIHByb3BlcnR5IGRpcmVjdGx5IHVzaW5nIEVkaXRvciBBUElcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIHBhdGg6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgIGR1bXA6IHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEdldCBjb21wcmVoZW5zaXZlIHZlcmlmaWNhdGlvbiBkYXRhIGluY2x1ZGluZyB1cGRhdGVkIG5vZGUgaW5mb1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Tm9kZUluZm8odXVpZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ZhbHVlOiB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25EYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlSW5mbzogbm9kZUluZm8uZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZURldGFpbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZCBzdWNjZXNzZnVsbHkgKHZlcmlmaWNhdGlvbiBmYWlsZWQpYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAvLyBJZiBkaXJlY3Qgc2V0dGluZyBmYWlscywgdHJ5IHVzaW5nIHNjZW5lIHNjcmlwdFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnc2V0Tm9kZVByb3BlcnR5JyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbdXVpZCwgcHJvcGVydHksIHZhbHVlXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXROb2RlVHJhbnNmb3JtKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgdXVpZCwgcG9zaXRpb24sIHJvdGF0aW9uLCBzY2FsZSB9ID0gYXJncztcbiAgICAgICAgY29uc3QgdXBkYXRlUHJvbWlzZXM6IFByb21pc2U8YW55PltdID0gW107XG4gICAgICAgIGNvbnN0IHVwZGF0ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBGaXJzdCBnZXQgbm9kZSBpbmZvIHRvIGRldGVybWluZSBpZiBpdCdzIDJEIG9yIDNEXG4gICAgICAgICAgICBjb25zdCBub2RlSW5mb1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXROb2RlSW5mbyh1dWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZUluZm9SZXNwb25zZS5zdWNjZXNzIHx8ICFub2RlSW5mb1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IG5vZGUgaW5mb3JtYXRpb24nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gbm9kZUluZm9SZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgY29uc3QgaXMyRE5vZGUgPSB0aGlzLmlzMkROb2RlKG5vZGVJbmZvKTtcblxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFBvc2l0aW9uID0gdGhpcy5ub3JtYWxpemVUcmFuc2Zvcm1WYWx1ZShwb3NpdGlvbiwgJ3Bvc2l0aW9uJywgaXMyRE5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUG9zaXRpb24ud2FybmluZykge1xuICAgICAgICAgICAgICAgICAgICB3YXJuaW5ncy5wdXNoKG5vcm1hbGl6ZWRQb3NpdGlvbi53YXJuaW5nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1cGRhdGVQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3Bvc2l0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IG5vcm1hbGl6ZWRQb3NpdGlvbi52YWx1ZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVzLnB1c2goJ3Bvc2l0aW9uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChyb3RhdGlvbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRSb3RhdGlvbiA9IHRoaXMubm9ybWFsaXplVHJhbnNmb3JtVmFsdWUocm90YXRpb24sICdyb3RhdGlvbicsIGlzMkROb2RlKTtcbiAgICAgICAgICAgICAgICBpZiAobm9ybWFsaXplZFJvdGF0aW9uLndhcm5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgd2FybmluZ3MucHVzaChub3JtYWxpemVkUm90YXRpb24ud2FybmluZyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXBkYXRlUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6ICdyb3RhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBub3JtYWxpemVkUm90YXRpb24udmFsdWUgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKCdyb3RhdGlvbicpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc2NhbGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub3JtYWxpemVkU2NhbGUgPSB0aGlzLm5vcm1hbGl6ZVRyYW5zZm9ybVZhbHVlKHNjYWxlLCAnc2NhbGUnLCBpczJETm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRTY2FsZS53YXJuaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHdhcm5pbmdzLnB1c2gobm9ybWFsaXplZFNjYWxlLndhcm5pbmcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHVwZGF0ZVByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnc2NhbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogbm9ybWFsaXplZFNjYWxlLnZhbHVlIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaCgnc2NhbGUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHVwZGF0ZVByb21pc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHRyYW5zZm9ybSBwcm9wZXJ0aWVzIHNwZWNpZmllZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwodXBkYXRlUHJvbWlzZXMpO1xuXG4gICAgICAgICAgICAvLyBWZXJpZnkgdGhlIGNoYW5nZXMgYnkgZ2V0dGluZyB1cGRhdGVkIG5vZGUgaW5mb1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlZE5vZGVJbmZvID0gYXdhaXQgdGhpcy5nZXROb2RlSW5mbyh1dWlkKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVHJhbnNmb3JtIHByb3BlcnRpZXMgdXBkYXRlZDogJHt1cGRhdGVzLmpvaW4oJywgJyl9ICR7aXMyRE5vZGUgPyAnKDJEIG5vZGUpJyA6ICcoM0Qgbm9kZSknfWAsXG4gICAgICAgICAgICAgICAgdXBkYXRlZFByb3BlcnRpZXM6IHVwZGF0ZXMsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGU6IGlzMkROb2RlID8gJzJEJyA6ICczRCcsXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpZWRDaGFuZ2VzOiB1cGRhdGVzLFxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1Db25zdHJhaW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGlzMkROb2RlID8gJ3gsIHkgb25seSAoeiBpZ25vcmVkKScgOiAneCwgeSwgeiBhbGwgdXNlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogaXMyRE5vZGUgPyAneiBvbmx5ICh4LCB5IGlnbm9yZWQpJyA6ICd4LCB5LCB6IGFsbCB1c2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlOiBpczJETm9kZSA/ICd4LCB5IG1haW4sIHogdHlwaWNhbGx5IDEnIDogJ3gsIHksIHogYWxsIHVzZWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZm86IHVwZGF0ZWROb2RlSW5mby5kYXRhLFxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1EZXRhaWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbE5vZGVUeXBlOiBpczJETm9kZSA/ICcyRCcgOiAnM0QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZFRyYW5zZm9ybXM6IHVwZGF0ZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBiZWZvcmVBZnRlckNvbXBhcmlzb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZTogbm9kZUluZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBhZnRlcjogdXBkYXRlZE5vZGVJbmZvLmRhdGFcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uud2FybmluZyA9IHdhcm5pbmdzLmpvaW4oJzsgJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcblxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byB1cGRhdGUgdHJhbnNmb3JtOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGlzMkROb2RlKG5vZGVJbmZvOiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgbm9kZSBoYXMgMkQtc3BlY2lmaWMgY29tcG9uZW50cyBvciBpcyB1bmRlciBDYW52YXNcbiAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVJbmZvLmNvbXBvbmVudHMgfHwgW107XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbW1vbiAyRCBjb21wb25lbnRzXG4gICAgICAgIGNvbnN0IGhhczJEQ29tcG9uZW50cyA9IGNvbXBvbmVudHMuc29tZSgoY29tcDogYW55KSA9PlxuICAgICAgICAgICAgY29tcC50eXBlICYmIChcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlNwcml0ZScpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5MYWJlbCcpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5CdXR0b24nKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTGF5b3V0JykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLldpZGdldCcpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5NYXNrJykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkdyYXBoaWNzJylcbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoaGFzMkRDb21wb25lbnRzKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGZvciAzRC1zcGVjaWZpYyBjb21wb25lbnRzXG4gICAgICAgIGNvbnN0IGhhczNEQ29tcG9uZW50cyA9IGNvbXBvbmVudHMuc29tZSgoY29tcDogYW55KSA9PlxuICAgICAgICAgICAgY29tcC50eXBlICYmIChcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLk1lc2hSZW5kZXJlcicpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5DYW1lcmEnKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTGlnaHQnKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuRGlyZWN0aW9uYWxMaWdodCcpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5Qb2ludExpZ2h0JykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlNwb3RMaWdodCcpXG4gICAgICAgICAgICApXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGhhczNEQ29tcG9uZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCBoZXVyaXN0aWM6IGlmIHogcG9zaXRpb24gaXMgMCBhbmQgaGFzbid0IGJlZW4gY2hhbmdlZCwgbGlrZWx5IDJEXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbm9kZUluZm8ucG9zaXRpb247XG4gICAgICAgIGlmIChwb3NpdGlvbiAmJiBNYXRoLmFicyhwb3NpdGlvbi56KSA8IDAuMDAxKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gM0QgaWYgdW5jZXJ0YWluXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIG5vcm1hbGl6ZVRyYW5zZm9ybVZhbHVlKHZhbHVlOiBhbnksIHR5cGU6ICdwb3NpdGlvbicgfCAncm90YXRpb24nIHwgJ3NjYWxlJywgaXMyRDogYm9vbGVhbik6IHsgdmFsdWU6IGFueSwgd2FybmluZz86IHN0cmluZyB9IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0geyAuLi52YWx1ZSB9O1xuICAgICAgICBsZXQgd2FybmluZzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gICAgICAgIGlmIChpczJEKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdwb3NpdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS56ICE9PSB1bmRlZmluZWQgJiYgTWF0aC5hYnModmFsdWUueikgPiAwLjAwMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2FybmluZyA9IGAyRCBub2RlOiB6IHBvc2l0aW9uICgke3ZhbHVlLnp9KSBpZ25vcmVkLCBzZXQgdG8gMGA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUueiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueiA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdyb3RhdGlvbic6XG4gICAgICAgICAgICAgICAgICAgIGlmICgodmFsdWUueCAhPT0gdW5kZWZpbmVkICYmIE1hdGguYWJzKHZhbHVlLngpID4gMC4wMDEpIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAodmFsdWUueSAhPT0gdW5kZWZpbmVkICYmIE1hdGguYWJzKHZhbHVlLnkpID4gMC4wMDEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuaW5nID0gYDJEIG5vZGU6IHgseSByb3RhdGlvbnMgaWdub3JlZCwgb25seSB6IHJvdGF0aW9uIGFwcGxpZWRgO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnkgPSAwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnggPSByZXN1bHQueCB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnkgPSByZXN1bHQueSB8fCAwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC56ID0gcmVzdWx0LnogfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlICdzY2FsZSc6XG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZS56ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC56ID0gMTsgLy8gRGVmYXVsdCBzY2FsZSBmb3IgMkRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIDNEIG5vZGUgLSBlbnN1cmUgYWxsIGF4ZXMgYXJlIGRlZmluZWRcbiAgICAgICAgICAgIHJlc3VsdC54ID0gcmVzdWx0LnggIT09IHVuZGVmaW5lZCA/IHJlc3VsdC54IDogKHR5cGUgPT09ICdzY2FsZScgPyAxIDogMCk7XG4gICAgICAgICAgICByZXN1bHQueSA9IHJlc3VsdC55ICE9PSB1bmRlZmluZWQgPyByZXN1bHQueSA6ICh0eXBlID09PSAnc2NhbGUnID8gMSA6IDApO1xuICAgICAgICAgICAgcmVzdWx0LnogPSByZXN1bHQueiAhPT0gdW5kZWZpbmVkID8gcmVzdWx0LnogOiAodHlwZSA9PT0gJ3NjYWxlJyA/IDEgOiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7IHZhbHVlOiByZXN1bHQsIHdhcm5pbmcgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRlbGV0ZU5vZGUodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLW5vZGUnLCB7IHV1aWQ6IHV1aWQgfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnTm9kZSBkZWxldGVkIHN1Y2Nlc3NmdWxseScgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG1vdmVOb2RlKG5vZGVVdWlkOiBzdHJpbmcsIG5ld1BhcmVudFV1aWQ6IHN0cmluZywgc2libGluZ0luZGV4OiBudW1iZXIgPSAtMSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IHNldC1wYXJlbnQgQVBJIGluc3RlYWQgb2YgbW92ZS1ub2RlXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wYXJlbnQnLCB7XG4gICAgICAgICAgICAgICAgcGFyZW50OiBuZXdQYXJlbnRVdWlkLFxuICAgICAgICAgICAgICAgIHV1aWRzOiBbbm9kZVV1aWRdLFxuICAgICAgICAgICAgICAgIGtlZXBXb3JsZFRyYW5zZm9ybTogZmFsc2VcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ05vZGUgbW92ZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVuYW1lTm9kZSh1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghdXVpZCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndXVpZCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgaWYgKCFuYW1lKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICduYW1lIGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICBwYXRoOiAnbmFtZScsXG4gICAgICAgICAgICAgICAgZHVtcDogeyB0eXBlOiAnU3RyaW5nJywgdmFsdWU6IG5hbWUgfVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiBgTm9kZSByZW5hbWVkIHRvIFwiJHtuYW1lfVwiYCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZHVwbGljYXRlTm9kZSh1dWlkOiBzdHJpbmcsIGluY2x1ZGVDaGlsZHJlbjogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBOb3RlOiBpbmNsdWRlQ2hpbGRyZW4gcGFyYW1ldGVyIGlzIGFjY2VwdGVkIGZvciBmdXR1cmUgdXNlIGJ1dCBub3QgY3VycmVudGx5IGltcGxlbWVudGVkXG4gICAgICAgIC8vIENvY29zIGBkdXBsaWNhdGUtbm9kZWAgcmV0dXJucyBzdHJpbmdbXSBvZiBuZXcgbm9kZSBVVUlEcy5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdkdXBsaWNhdGUtbm9kZScsIHV1aWQpLFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1V1aWRzOiBzdHJpbmdbXSA9IEFycmF5LmlzQXJyYXkocmVzdWx0KSA/IHJlc3VsdCA6IChyZXN1bHQ/LnV1aWQgPyBbcmVzdWx0LnV1aWRdIDogW10pO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1V1aWRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VXVpZDogbmV3VXVpZHNbMF0gPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOb2RlIGR1cGxpY2F0ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGRldGVjdE5vZGVUeXBlKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBub2RlSW5mb1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXROb2RlSW5mbyh1dWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZUluZm9SZXNwb25zZS5zdWNjZXNzIHx8ICFub2RlSW5mb1Jlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IG5vZGUgaW5mb3JtYXRpb24nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gbm9kZUluZm9SZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgY29uc3QgaXMyRCA9IHRoaXMuaXMyRE5vZGUobm9kZUluZm8pO1xuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IG5vZGVJbmZvLmNvbXBvbmVudHMgfHwgW107XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgZGV0ZWN0aW9uIHJlYXNvbnNcbiAgICAgICAgICAgIGNvbnN0IGRldGVjdGlvblJlYXNvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGZvciAyRCBjb21wb25lbnRzXG4gICAgICAgICAgICBjb25zdCB0d29EQ29tcG9uZW50cyA9IGNvbXBvbmVudHMuZmlsdGVyKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgY29tcC50eXBlICYmIChcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5TcHJpdGUnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkxhYmVsJykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5CdXR0b24nKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkxheW91dCcpIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuV2lkZ2V0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5NYXNrJykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5HcmFwaGljcycpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIDNEIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGNvbnN0IHRocmVlRENvbXBvbmVudHMgPSBjb21wb25lbnRzLmZpbHRlcigoY29tcDogYW55KSA9PlxuICAgICAgICAgICAgICAgIGNvbXAudHlwZSAmJiAoXG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTWVzaFJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5DYW1lcmEnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkxpZ2h0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5EaXJlY3Rpb25hbExpZ2h0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5Qb2ludExpZ2h0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5TcG90TGlnaHQnKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICh0d29EQ29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZGV0ZWN0aW9uUmVhc29ucy5wdXNoKGBIYXMgMkQgY29tcG9uZW50czogJHt0d29EQ29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gYy50eXBlKS5qb2luKCcsICcpfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhyZWVEQ29tcG9uZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZGV0ZWN0aW9uUmVhc29ucy5wdXNoKGBIYXMgM0QgY29tcG9uZW50czogJHt0aHJlZURDb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENoZWNrIHBvc2l0aW9uIGZvciBoZXVyaXN0aWNcbiAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uID0gbm9kZUluZm8ucG9zaXRpb247XG4gICAgICAgICAgICBpZiAocG9zaXRpb24gJiYgTWF0aC5hYnMocG9zaXRpb24ueikgPCAwLjAwMSkge1xuICAgICAgICAgICAgICAgIGRldGVjdGlvblJlYXNvbnMucHVzaCgnWiBwb3NpdGlvbiBpcyB+MCAobGlrZWx5IDJEKScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbiAmJiBNYXRoLmFicyhwb3NpdGlvbi56KSA+IDAuMDAxKSB7XG4gICAgICAgICAgICAgICAgZGV0ZWN0aW9uUmVhc29ucy5wdXNoKGBaIHBvc2l0aW9uIGlzICR7cG9zaXRpb24uen0gKGxpa2VseSAzRClgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGRldGVjdGlvblJlYXNvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZGV0ZWN0aW9uUmVhc29ucy5wdXNoKCdObyBzcGVjaWZpYyBpbmRpY2F0b3JzIGZvdW5kLCBkZWZhdWx0aW5nIGJhc2VkIG9uIGhldXJpc3RpY3MnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlSW5mby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZTogaXMyRCA/ICcyRCcgOiAnM0QnLFxuICAgICAgICAgICAgICAgICAgICBkZXRlY3Rpb25SZWFzb25zOiBkZXRlY3Rpb25SZWFzb25zLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBjb21wb25lbnRzLm1hcCgoY29tcDogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY29tcC50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHRoaXMuZ2V0Q29tcG9uZW50Q2F0ZWdvcnkoY29tcC50eXBlKVxuICAgICAgICAgICAgICAgICAgICB9KSksXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlSW5mby5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtQ29uc3RyYWludHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBpczJEID8gJ3gsIHkgb25seSAoeiBpZ25vcmVkKScgOiAneCwgeSwgeiBhbGwgdXNlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogaXMyRCA/ICd6IG9ubHkgKHgsIHkgaWdub3JlZCknIDogJ3gsIHksIHogYWxsIHVzZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IGlzMkQgPyAneCwgeSBtYWluLCB6IHR5cGljYWxseSAxJyA6ICd4LCB5LCB6IGFsbCB1c2VkJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBkZXRlY3Qgbm9kZSB0eXBlOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldENvbXBvbmVudENhdGVnb3J5KGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmICghY29tcG9uZW50VHlwZSkgcmV0dXJuICd1bmtub3duJztcblxuICAgICAgICBpZiAoY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuU3ByaXRlJykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuTGFiZWwnKSB8fFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuQnV0dG9uJykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuTGF5b3V0JykgfHxcbiAgICAgICAgICAgIGNvbXBvbmVudFR5cGUuaW5jbHVkZXMoJ2NjLldpZGdldCcpIHx8IGNvbXBvbmVudFR5cGUuaW5jbHVkZXMoJ2NjLk1hc2snKSB8fFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuR3JhcGhpY3MnKSkge1xuICAgICAgICAgICAgcmV0dXJuICcyRCc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuTWVzaFJlbmRlcmVyJykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuQ2FtZXJhJykgfHxcbiAgICAgICAgICAgIGNvbXBvbmVudFR5cGUuaW5jbHVkZXMoJ2NjLkxpZ2h0JykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuRGlyZWN0aW9uYWxMaWdodCcpIHx8XG4gICAgICAgICAgICBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5Qb2ludExpZ2h0JykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuU3BvdExpZ2h0JykpIHtcbiAgICAgICAgICAgIHJldHVybiAnM0QnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuICdnZW5lcmljJztcbiAgICB9XG59XG4iXX0=