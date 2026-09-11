"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTools = void 0;
const component_tools_1 = require("./component-tools");
const logger_1 = require("../logger");
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
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
                            description: "Node UUID, path (\"Canvas/Panel/Button\"), or unique name. Required for 'delete', 'duplicate', and 'rename' actions."
                        },
                        parentUuid: {
                            type: 'string',
                            description: "Parent node UUID, path, or unique name (create). Strongly recommended — omit only to create at scene root."
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
                            description: "Node UUID, path, or unique name to move. Required for 'move'."
                        },
                        newParentUuid: {
                            type: 'string',
                            description: "New parent node UUID, path, or unique name. Required for 'move'."
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
        const refFields = {
            node_lifecycle: ['uuid', 'parentUuid', 'nodeUuid', 'newParentUuid'],
            node_query: ['uuid'],
            node_transform: ['uuid']
        };
        if (refFields[toolName]) {
            const refError = await (0, node_resolver_1.resolveNodeRefFields)(args, refFields[toolName]);
            if (refError)
                return refError;
        }
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
        var _a, _b, _c, _d;
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
            // KNOWN LIMITATION: create-node with assetUuid copies the prefab's node
            // structure but does not link the instance back to the source prefab asset
            // (_prefab stays unset after save). scene.restore-prefab only resets an
            // EXISTING link, so it can't help here, and cce.Prefab.linkNodeWithPrefabAsset
            // called directly makes the node vanish from scene serialization entirely
            // (worse than the original bug) — it's meant to be used internally alongside
            // other bookkeeping (onAddNode, etc.), not called standalone. Until a safe
            // fix is found, the instance keeps working at runtime; re-sync with the
            // source prefab after editing it in the Editor UI must be done manually
            // (unlink/relink via the Editor UI), not through this tool.
            // Handle sibling index
            if (args.siblingIndex !== undefined && args.siblingIndex >= 0 && uuid && targetParentUuid) {
                try {
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
            // Add components (if provided). A component that fails to attach used to
            // be logged and forgotten, so `components: [...]` could come back
            // successful having added nothing. Collect the failures and report them.
            const componentErrors = [];
            if (args.components && args.components.length > 0 && uuid) {
                for (const componentType of args.components) {
                    try {
                        const result = await this.componentTools.execute('component_manage', {
                            action: 'add',
                            nodeUuid: uuid,
                            componentType: componentType
                        });
                        if (!result.success) {
                            componentErrors.push(`${componentType}: ${String(result.error)}`);
                        }
                    }
                    catch (err) {
                        componentErrors.push(`${componentType}: ${(_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err)}`);
                    }
                }
            }
            // Set initial transform (if provided)
            if (args.initialTransform && uuid) {
                try {
                    await this.setNodeTransform({
                        uuid: uuid,
                        position: args.initialTransform.position,
                        rotation: args.initialTransform.rotation,
                        scale: args.initialTransform.scale
                    });
                    logger_1.logger.info('Initial transform applied successfully');
                }
                catch (err) {
                    logger_1.logger.warn(`Failed to set initial transform: ${(_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : String(err)}`);
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
                logger_1.logger.warn(`Failed to get verification data: ${(_d = err === null || err === void 0 ? void 0 : err.message) !== null && _d !== void 0 ? _d : String(err)}`);
            }
            // The node exists either way, so this is not a plain failure — but a
            // caller that asked for components and got none needs to know, and
            // "created successfully" alone reads as though it got them.
            if (componentErrors.length > 0) {
                return {
                    success: false,
                    error: `Node '${args.name}' was created (uuid ${uuid}) but ${componentErrors.length} component(s) could not be added: ${componentErrors.join('; ')}`,
                    data: {
                        uuid,
                        name: args.name,
                        parentUuid: targetParentUuid,
                        componentErrors
                    },
                    instruction: 'The node is in the scene. Add the missing components with component_manage, or delete it with node_lifecycle delete.'
                };
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
            return { success: false, error: `Tree search failed: ${err.message}` };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHVEQUFtRDtBQUNuRCxzQ0FBbUM7QUFDbkMsNERBQWtFO0FBQ2xFLDBEQUE4RDtBQUU5RCxNQUFhLFNBQVM7SUFBdEI7UUFDWSxtQkFBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO0lBeWlDbEQsQ0FBQztJQXhpQ0csUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixXQUFXLEVBQUUsbUpBQW1KO2dCQUNoSyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDOzRCQUN6RCxXQUFXLEVBQUUsaUNBQWlDO3lCQUNqRDt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHdEQUF3RDt5QkFDeEU7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzSEFBc0g7eUJBQ3RJO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsNEdBQTRHO3lCQUM1SDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHFEQUFxRDs0QkFDbEUsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUM7NEJBQ2xDLE9BQU8sRUFBRSxNQUFNO3lCQUNsQjt3QkFDRCxZQUFZLEVBQUU7NEJBQ1YsSUFBSSxFQUFFLFFBQVE7NEJBQ2Qs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TyxFQUFFO2FBQ3RELENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztJQUVPLG9CQUFvQixDQUFDLGFBQXFCO1FBQzlDLElBQUksQ0FBQyxhQUFhO1lBQUUsT0FBTyxTQUFTLENBQUM7UUFFckMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDO1lBQ3pFLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7WUFDMUUsYUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUN4RSxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDeEMsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUVELElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1lBQ2hGLGFBQWEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksYUFBYSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQztZQUNuRixhQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNwRixPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztDQUNKO0FBMWlDRCw4QkEwaUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBOb2RlSW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QsIHRvb2xDYWxsIH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgcmVzb2x2ZU5vZGVSZWZGaWVsZHMgfSBmcm9tICcuLi91dGlscy9ub2RlLXJlc29sdmVyJztcblxuZXhwb3J0IGNsYXNzIE5vZGVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBjb21wb25lbnRUb29scyA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdub2RlX2xpZmVjeWNsZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2Ugbm9kZSBsaWZlY3ljbGU6IGNyZWF0ZSwgZGVsZXRlLCBkdXBsaWNhdGUsIG1vdmUsIG9yIHJlbmFtZSBub2RlcyBpbiB0aGUgc2NlbmUuIEF2YWlsYWJsZSBhY3Rpb25zOiBjcmVhdGUsIGRlbGV0ZSwgZHVwbGljYXRlLCBtb3ZlLCByZW5hbWUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydjcmVhdGUnLCAnZGVsZXRlJywgJ2R1cGxpY2F0ZScsICdtb3ZlJywgJ3JlbmFtZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGxpZmVjeWNsZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBuYW1lLiBSZXF1aXJlZCBmb3IgJ2NyZWF0ZScgYW5kICdyZW5hbWUnIGFjdGlvbnMuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBVVUlELCBwYXRoIChcXFwiQ2FudmFzL1BhbmVsL0J1dHRvblxcXCIpLCBvciB1bmlxdWUgbmFtZS4gUmVxdWlyZWQgZm9yICdkZWxldGUnLCAnZHVwbGljYXRlJywgYW5kICdyZW5hbWUnIGFjdGlvbnMuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUGFyZW50IG5vZGUgVVVJRCwgcGF0aCwgb3IgdW5pcXVlIG5hbWUgKGNyZWF0ZSkuIFN0cm9uZ2x5IHJlY29tbWVuZGVkIOKAlCBvbWl0IG9ubHkgdG8gY3JlYXRlIGF0IHNjZW5lIHJvb3QuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgdHlwZSBmb3IgJ2NyZWF0ZScgYWN0aW9uOiBOb2RlLCAyRE5vZGUsIDNETm9kZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnTm9kZScsICcyRE5vZGUnLCAnM0ROb2RlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ05vZGUnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2libGluZ0luZGV4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiU2libGluZyBpbmRleCBmb3Igb3JkZXJpbmcuIFVzZWQgZm9yICdjcmVhdGUnIGFuZCAnbW92ZScgYWN0aW9ucy4gKC0xIG1lYW5zIGFwcGVuZCBhdCBlbmQpXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogLTFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJBc3NldCBVVUlEIHRvIGluc3RhbnRpYXRlIGZyb20gKGNyZWF0ZSksIGUuZy4gYSBwcmVmYWIgVVVJRCwgaW5zdGVhZCBvZiBhbiBlbXB0eSBub2RlLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQXNzZXQgcGF0aCB0byBpbnN0YW50aWF0ZSBmcm9tIChjcmVhdGUpLCBlLmcuIFxcXCJkYjovL2Fzc2V0cy9wcmVmYWJzL015UHJlZmFiLnByZWZhYlxcXCIuIEFsdGVybmF0aXZlIHRvIGFzc2V0VXVpZC5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQ29tcG9uZW50IHR5cGVzIHRvIGFkZCB0byB0aGUgbmV3IG5vZGUgKGNyZWF0ZSksIGUuZy4gW1xcXCJjYy5TcHJpdGVcXFwiLCBcXFwiY2MuQnV0dG9uXFxcIl0uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmxpbmtQcmVmYWI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSWYgdHJ1ZSwgdW5saW5rIGZyb20gc291cmNlIHByZWZhYiB0byBjcmVhdGUgYSByZWd1bGFyIG5vZGUgKGNyZWF0ZSkuXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBrZWVwV29ybGRUcmFuc2Zvcm06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiS2VlcCB3b3JsZCB0cmFuc2Zvcm0gd2hlbiBjcmVhdGluZyB0aGUgbm9kZSAoY3JlYXRlKS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxUcmFuc2Zvcm06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IHsgdHlwZTogJ251bWJlcicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiB7IHR5cGU6ICdudW1iZXInIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkluaXRpYWwgdHJhbnNmb3JtIGZvciB0aGUgY3JlYXRlZCBub2RlIChjcmVhdGUpLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNoaWxkcmVuOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkluY2x1ZGUgY2hpbGRyZW4gd2hlbiBkdXBsaWNhdGluZyAoZHVwbGljYXRlKS5cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIFVVSUQsIHBhdGgsIG9yIHVuaXF1ZSBuYW1lIHRvIG1vdmUuIFJlcXVpcmVkIGZvciAnbW92ZScuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTmV3IHBhcmVudCBub2RlIFVVSUQsIHBhdGgsIG9yIHVuaXF1ZSBuYW1lLiBSZXF1aXJlZCBmb3IgJ21vdmUnLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbm9kZV9xdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBhbmQgaW5zcGVjdCBub2RlcyBpbiB0aGUgc2NlbmUuIEF2YWlsYWJsZSBhY3Rpb25zOiBnZXRfaW5mbywgZmluZF9ieV9wYXR0ZXJuLCBmaW5kX2J5X25hbWUsIGdldF9hbGwsIGRldGVjdF90eXBlLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2luZm8nLCAnZmluZF9ieV9wYXR0ZXJuJywgJ2ZpbmRfYnlfbmFtZScsICdnZXRfYWxsJywgJ2RldGVjdF90eXBlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgcXVlcnkgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRC4gUmVxdWlyZWQgZm9yICdnZXRfaW5mbycgYW5kICdkZXRlY3RfdHlwZScgYWN0aW9ucy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOYW1lIHBhdHRlcm4gdG8gc2VhcmNoLiBSZXF1aXJlZCBmb3IgJ2ZpbmRfYnlfcGF0dGVybicgYWN0aW9uLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3RNYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJFeGFjdCBtYXRjaCBvciBwYXJ0aWFsIG1hdGNoLiBVc2VkIGZvciAnZmluZF9ieV9wYXR0ZXJuJyBhY3Rpb24uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSBuYW1lIHRvIGZpbmQuIFJlcXVpcmVkIGZvciAnZmluZF9ieV9uYW1lJyBhY3Rpb24uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdub2RlX3RyYW5zZm9ybScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNb2RpZnkgbm9kZSB0cmFuc2Zvcm0gb3IgcHJvcGVydGllcy4gQXZhaWxhYmxlIGFjdGlvbnM6IHNldF90cmFuc2Zvcm0sIHNldF9wcm9wZXJ0eS4gc2V0X3RyYW5zZm9ybSBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgMkQvM0Qgbm9kZSBkaWZmZXJlbmNlcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3NldF90cmFuc2Zvcm0nLCAnc2V0X3Byb3BlcnR5J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgdHJhbnNmb3JtL3Byb3BlcnR5IGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRC4gUmVxdWlyZWQgZm9yIGJvdGggYWN0aW9ucy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1ogY29vcmRpbmF0ZSAoaWdub3JlZCBmb3IgMkQgbm9kZXMpJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJOb2RlIHBvc2l0aW9uLiBVc2VkIGZvciAnc2V0X3RyYW5zZm9ybScgYWN0aW9uLiBGb3IgMkQgbm9kZXMsIG9ubHkgeCx5IGFyZSB1c2VkOyB6IGlzIGlnbm9yZWQuIEZvciAzRCBub2RlcywgYWxsIGNvb3JkaW5hdGVzIGFyZSB1c2VkLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnWCByb3RhdGlvbiAoaWdub3JlZCBmb3IgMkQgbm9kZXMpJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1kgcm90YXRpb24gKGlnbm9yZWQgZm9yIDJEIG5vZGVzKScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdaIHJvdGF0aW9uIChtYWluIHJvdGF0aW9uIGF4aXMgZm9yIDJEIG5vZGVzKScgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiTm9kZSByb3RhdGlvbiBpbiBldWxlciBhbmdsZXMuIFVzZWQgZm9yICdzZXRfdHJhbnNmb3JtJyBhY3Rpb24uIEZvciAyRCBub2Rlcywgb25seSB6IHJvdGF0aW9uIGlzIHVzZWQuIEZvciAzRCBub2RlcywgYWxsIGF4ZXMgYXJlIHVzZWQuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnWiBzY2FsZSAodXN1YWxseSAxIGZvciAyRCBub2RlcyknIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgc2NhbGUuIFVzZWQgZm9yICdzZXRfdHJhbnNmb3JtJyBhY3Rpb24uIEZvciAyRCBub2RlcywgeiBpcyB0eXBpY2FsbHkgMS4gRm9yIDNEIG5vZGVzLCBhbGwgYXhlcyBhcmUgdXNlZC5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiUHJvcGVydHkgbmFtZSAoZS5nLiwgYWN0aXZlLCBuYW1lLCBsYXllcikuIFJlcXVpcmVkIGZvciAnc2V0X3Byb3BlcnR5JyBhY3Rpb24uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uZU9mOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdvYmplY3QnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ2FycmF5JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICdudWxsJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJQcm9wZXJ0eSB2YWx1ZS4gUmVxdWlyZWQgZm9yICdzZXRfcHJvcGVydHknIGFjdGlvbi5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nLCAndXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgcmVmRmllbGRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gICAgICAgICAgICBub2RlX2xpZmVjeWNsZTogWyd1dWlkJywgJ3BhcmVudFV1aWQnLCAnbm9kZVV1aWQnLCAnbmV3UGFyZW50VXVpZCddLFxuICAgICAgICAgICAgbm9kZV9xdWVyeTogWyd1dWlkJ10sXG4gICAgICAgICAgICBub2RlX3RyYW5zZm9ybTogWyd1dWlkJ11cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHJlZkZpZWxkc1t0b29sTmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnN0IHJlZkVycm9yID0gYXdhaXQgcmVzb2x2ZU5vZGVSZWZGaWVsZHMoYXJncywgcmVmRmllbGRzW3Rvb2xOYW1lXSk7XG4gICAgICAgICAgICBpZiAocmVmRXJyb3IpIHJldHVybiByZWZFcnJvcjtcbiAgICAgICAgfVxuXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vZGVfbGlmZWN5Y2xlJzoge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVOb2RlKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZGVsZXRlTm9kZShhcmdzLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkdXBsaWNhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZHVwbGljYXRlTm9kZShhcmdzLnV1aWQsIGFyZ3MuaW5jbHVkZUNoaWxkcmVuKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW92ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tb3ZlTm9kZShhcmdzLm5vZGVVdWlkLCBhcmdzLm5ld1BhcmVudFV1aWQsIGFyZ3Muc2libGluZ0luZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVuYW1lJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlbmFtZU5vZGUoYXJncy51dWlkLCBhcmdzLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3Igbm9kZV9saWZlY3ljbGU6ICR7YWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ25vZGVfcXVlcnknOiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Tm9kZUluZm8oYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZmluZF9ieV9wYXR0ZXJuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmZpbmROb2RlcyhhcmdzLnBhdHRlcm4sIGFyZ3MuZXhhY3RNYXRjaCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbmRfYnlfbmFtZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5maW5kTm9kZUJ5TmFtZShhcmdzLm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfYWxsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEFsbE5vZGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RldGVjdF90eXBlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmRldGVjdE5vZGVUeXBlKGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBub2RlX3F1ZXJ5OiAke2FjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdub2RlX3RyYW5zZm9ybSc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzZXRfdHJhbnNmb3JtJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldE5vZGVUcmFuc2Zvcm0oYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NldF9wcm9wZXJ0eSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXROb2RlUHJvcGVydHkoYXJncy51dWlkLCBhcmdzLnByb3BlcnR5LCBhcmdzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIG5vZGVfdHJhbnNmb3JtOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vZGUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCB0YXJnZXRQYXJlbnRVdWlkID0gYXJncy5wYXJlbnRVdWlkO1xuXG4gICAgICAgICAgICAvLyBJZiBubyBwYXJlbnQgbm9kZSBVVUlEIHByb3ZpZGVkLCBnZXQgc2NlbmUgcm9vdCBub2RlXG4gICAgICAgICAgICBpZiAoIXRhcmdldFBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUluZm8gPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjZW5lSW5mbyAmJiB0eXBlb2Ygc2NlbmVJbmZvID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShzY2VuZUluZm8pICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzY2VuZUluZm8sICd1dWlkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFBhcmVudFV1aWQgPSAoc2NlbmVJbmZvIGFzIGFueSkudXVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBObyBwYXJlbnQgc3BlY2lmaWVkLCB1c2luZyBzY2VuZSByb290OiAke3RhcmdldFBhcmVudFV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShzY2VuZUluZm8pICYmIHNjZW5lSW5mby5sZW5ndGggPiAwICYmIHNjZW5lSW5mb1swXS51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRQYXJlbnRVdWlkID0gc2NlbmVJbmZvWzBdLnV1aWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbyhgTm8gcGFyZW50IHNwZWNpZmllZCwgdXNpbmcgc2NlbmUgcm9vdDogJHt0YXJnZXRQYXJlbnRVdWlkfWApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFNjZW5lOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jdXJyZW50LXNjZW5lJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudFNjZW5lICYmIGN1cnJlbnRTY2VuZS51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0UGFyZW50VXVpZCA9IGN1cnJlbnRTY2VuZS51dWlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZ2V0IHNjZW5lIHJvb3QsIHdpbGwgdXNlIGRlZmF1bHQgYmVoYXZpb3InKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIElmIGFzc2V0UGF0aCBpcyBwcm92aWRlZCwgZmlyc3QgcmVzb2x2ZSB0byBhc3NldFV1aWRcbiAgICAgICAgICAgIGxldCBmaW5hbEFzc2V0VXVpZCA9IGFyZ3MuYXNzZXRVdWlkO1xuICAgICAgICAgICAgaWYgKGFyZ3MuYXNzZXRQYXRoICYmICFmaW5hbEFzc2V0VXVpZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MuYXNzZXRQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0SW5mbyAmJiBhc3NldEluZm8udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmluYWxBc3NldFV1aWQgPSBhc3NldEluZm8udXVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBBc3NldCBwYXRoICcke2FyZ3MuYXNzZXRQYXRofScgcmVzb2x2ZWQgdG8gVVVJRDogJHtmaW5hbEFzc2V0VXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBBc3NldCBub3QgZm91bmQgYXQgcGF0aDogJHthcmdzLmFzc2V0UGF0aH1gXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHJlc29sdmUgYXNzZXQgcGF0aCAnJHthcmdzLmFzc2V0UGF0aH0nOiAke2Vycn1gXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBCdWlsZCBjcmVhdGUtbm9kZSBvcHRpb25zXG4gICAgICAgICAgICBjb25zdCBjcmVhdGVOb2RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gU2V0IHBhcmVudCBub2RlXG4gICAgICAgICAgICBpZiAodGFyZ2V0UGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLnBhcmVudCA9IHRhcmdldFBhcmVudFV1aWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluc3RhbnRpYXRlIGZyb20gYXNzZXRcbiAgICAgICAgICAgIGlmIChmaW5hbEFzc2V0VXVpZCkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLmFzc2V0VXVpZCA9IGZpbmFsQXNzZXRVdWlkO1xuICAgICAgICAgICAgICAgIGlmIChhcmdzLnVubGlua1ByZWZhYikge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy51bmxpbmtQcmVmYWIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmIChhcmdzLmNvbXBvbmVudHMgJiYgYXJncy5jb21wb25lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5jb21wb25lbnRzID0gYXJncy5jb21wb25lbnRzO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhcmdzLm5vZGVUeXBlICYmIGFyZ3Mubm9kZVR5cGUgIT09ICdOb2RlJyAmJiAhZmluYWxBc3NldFV1aWQpIHtcbiAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBub2RlVHlwZSBjb21wb25lbnQgd2hlbiBub3QgaW5zdGFudGlhdGluZyBmcm9tIGFzc2V0XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMuY29tcG9uZW50cyA9IFthcmdzLm5vZGVUeXBlXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gS2VlcCB3b3JsZCB0cmFuc2Zvcm1cbiAgICAgICAgICAgIGlmIChhcmdzLmtlZXBXb3JsZFRyYW5zZm9ybSkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLmtlZXBXb3JsZFRyYW5zZm9ybSA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERvIG5vdCB1c2UgZHVtcCBwYXJhbXMgZm9yIGluaXRpYWwgdHJhbnNmb3JtLCB1c2Ugc2V0X25vZGVfdHJhbnNmb3JtIGFmdGVyIGNyZWF0aW9uXG5cbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBDcmVhdGluZyBub2RlIHdpdGggb3B0aW9uczogJHtKU09OLnN0cmluZ2lmeShjcmVhdGVOb2RlT3B0aW9ucyl9YCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBub2RlXG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLW5vZGUnLCBjcmVhdGVOb2RlT3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gQXJyYXkuaXNBcnJheShub2RlVXVpZCkgPyBub2RlVXVpZFswXSA6IG5vZGVVdWlkO1xuXG4gICAgICAgICAgICAvLyBLTk9XTiBMSU1JVEFUSU9OOiBjcmVhdGUtbm9kZSB3aXRoIGFzc2V0VXVpZCBjb3BpZXMgdGhlIHByZWZhYidzIG5vZGVcbiAgICAgICAgICAgIC8vIHN0cnVjdHVyZSBidXQgZG9lcyBub3QgbGluayB0aGUgaW5zdGFuY2UgYmFjayB0byB0aGUgc291cmNlIHByZWZhYiBhc3NldFxuICAgICAgICAgICAgLy8gKF9wcmVmYWIgc3RheXMgdW5zZXQgYWZ0ZXIgc2F2ZSkuIHNjZW5lLnJlc3RvcmUtcHJlZmFiIG9ubHkgcmVzZXRzIGFuXG4gICAgICAgICAgICAvLyBFWElTVElORyBsaW5rLCBzbyBpdCBjYW4ndCBoZWxwIGhlcmUsIGFuZCBjY2UuUHJlZmFiLmxpbmtOb2RlV2l0aFByZWZhYkFzc2V0XG4gICAgICAgICAgICAvLyBjYWxsZWQgZGlyZWN0bHkgbWFrZXMgdGhlIG5vZGUgdmFuaXNoIGZyb20gc2NlbmUgc2VyaWFsaXphdGlvbiBlbnRpcmVseVxuICAgICAgICAgICAgLy8gKHdvcnNlIHRoYW4gdGhlIG9yaWdpbmFsIGJ1Zykg4oCUIGl0J3MgbWVhbnQgdG8gYmUgdXNlZCBpbnRlcm5hbGx5IGFsb25nc2lkZVxuICAgICAgICAgICAgLy8gb3RoZXIgYm9va2tlZXBpbmcgKG9uQWRkTm9kZSwgZXRjLiksIG5vdCBjYWxsZWQgc3RhbmRhbG9uZS4gVW50aWwgYSBzYWZlXG4gICAgICAgICAgICAvLyBmaXggaXMgZm91bmQsIHRoZSBpbnN0YW5jZSBrZWVwcyB3b3JraW5nIGF0IHJ1bnRpbWU7IHJlLXN5bmMgd2l0aCB0aGVcbiAgICAgICAgICAgIC8vIHNvdXJjZSBwcmVmYWIgYWZ0ZXIgZWRpdGluZyBpdCBpbiB0aGUgRWRpdG9yIFVJIG11c3QgYmUgZG9uZSBtYW51YWxseVxuICAgICAgICAgICAgLy8gKHVubGluay9yZWxpbmsgdmlhIHRoZSBFZGl0b3IgVUkpLCBub3QgdGhyb3VnaCB0aGlzIHRvb2wuXG5cbiAgICAgICAgICAgIC8vIEhhbmRsZSBzaWJsaW5nIGluZGV4XG4gICAgICAgICAgICBpZiAoYXJncy5zaWJsaW5nSW5kZXggIT09IHVuZGVmaW5lZCAmJiBhcmdzLnNpYmxpbmdJbmRleCA+PSAwICYmIHV1aWQgJiYgdGFyZ2V0UGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wYXJlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHRhcmdldFBhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczogW3V1aWRdLFxuICAgICAgICAgICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBhcmdzLmtlZXBXb3JsZFRyYW5zZm9ybSB8fCBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBzZXQgc2libGluZyBpbmRleDogJHsoZXJyIGFzIGFueSk/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycil9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgY29tcG9uZW50cyAoaWYgcHJvdmlkZWQpLiBBIGNvbXBvbmVudCB0aGF0IGZhaWxzIHRvIGF0dGFjaCB1c2VkIHRvXG4gICAgICAgICAgICAvLyBiZSBsb2dnZWQgYW5kIGZvcmdvdHRlbiwgc28gYGNvbXBvbmVudHM6IFsuLi5dYCBjb3VsZCBjb21lIGJhY2tcbiAgICAgICAgICAgIC8vIHN1Y2Nlc3NmdWwgaGF2aW5nIGFkZGVkIG5vdGhpbmcuIENvbGxlY3QgdGhlIGZhaWx1cmVzIGFuZCByZXBvcnQgdGhlbS5cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudEVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGlmIChhcmdzLmNvbXBvbmVudHMgJiYgYXJncy5jb21wb25lbnRzLmxlbmd0aCA+IDAgJiYgdXVpZCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiBhcmdzLmNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXBvbmVudFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudEVycm9ycy5wdXNoKGAke2NvbXBvbmVudFR5cGV9OiAke1N0cmluZyhyZXN1bHQuZXJyb3IpfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudEVycm9ycy5wdXNoKGAke2NvbXBvbmVudFR5cGV9OiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdHJhbnNmb3JtIChpZiBwcm92aWRlZClcbiAgICAgICAgICAgIGlmIChhcmdzLmluaXRpYWxUcmFuc2Zvcm0gJiYgdXVpZCkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0Tm9kZVRyYW5zZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGFyZ3MuaW5pdGlhbFRyYW5zZm9ybS5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBhcmdzLmluaXRpYWxUcmFuc2Zvcm0ucm90YXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZTogYXJncy5pbml0aWFsVHJhbnNmb3JtLnNjYWxlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBsb2dnZXIuaW5mbygnSW5pdGlhbCB0cmFuc2Zvcm0gYXBwbGllZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byBzZXQgaW5pdGlhbCB0cmFuc2Zvcm06ICR7KGVyciBhcyBhbnkpPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IGNyZWF0ZWQgbm9kZSBpbmZvIGZvciB2ZXJpZmljYXRpb25cbiAgICAgICAgICAgIGxldCB2ZXJpZmljYXRpb25EYXRhOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlSW5mbyA9IGF3YWl0IHRoaXMuZ2V0Tm9kZUluZm8odXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVJbmZvLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVJbmZvOiBub2RlSW5mby5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgY3JlYXRpb25EZXRhaWxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogdGFyZ2V0UGFyZW50VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlVHlwZTogYXJncy5ub2RlVHlwZSB8fCAnTm9kZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbUFzc2V0OiAhIWZpbmFsQXNzZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogZmluYWxBc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRQYXRoOiBhcmdzLmFzc2V0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gZ2V0IHZlcmlmaWNhdGlvbiBkYXRhOiAkeyhlcnIgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhlIG5vZGUgZXhpc3RzIGVpdGhlciB3YXksIHNvIHRoaXMgaXMgbm90IGEgcGxhaW4gZmFpbHVyZSDigJQgYnV0IGFcbiAgICAgICAgICAgIC8vIGNhbGxlciB0aGF0IGFza2VkIGZvciBjb21wb25lbnRzIGFuZCBnb3Qgbm9uZSBuZWVkcyB0byBrbm93LCBhbmRcbiAgICAgICAgICAgIC8vIFwiY3JlYXRlZCBzdWNjZXNzZnVsbHlcIiBhbG9uZSByZWFkcyBhcyB0aG91Z2ggaXQgZ290IHRoZW0uXG4gICAgICAgICAgICBpZiAoY29tcG9uZW50RXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBOb2RlICcke2FyZ3MubmFtZX0nIHdhcyBjcmVhdGVkICh1dWlkICR7dXVpZH0pIGJ1dCAke2NvbXBvbmVudEVycm9ycy5sZW5ndGh9IGNvbXBvbmVudChzKSBjb3VsZCBub3QgYmUgYWRkZWQ6ICR7Y29tcG9uZW50RXJyb3JzLmpvaW4oJzsgJyl9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHRhcmdldFBhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRFcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdUaGUgbm9kZSBpcyBpbiB0aGUgc2NlbmUuIEFkZCB0aGUgbWlzc2luZyBjb21wb25lbnRzIHdpdGggY29tcG9uZW50X21hbmFnZSwgb3IgZGVsZXRlIGl0IHdpdGggbm9kZV9saWZlY3ljbGUgZGVsZXRlLidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdWNjZXNzTWVzc2FnZSA9IGZpbmFsQXNzZXRVdWlkXG4gICAgICAgICAgICAgICAgPyBgTm9kZSAnJHthcmdzLm5hbWV9JyBpbnN0YW50aWF0ZWQgZnJvbSBhc3NldCBzdWNjZXNzZnVsbHlgXG4gICAgICAgICAgICAgICAgOiBgTm9kZSAnJHthcmdzLm5hbWV9JyBjcmVhdGVkIHN1Y2Nlc3NmdWxseWA7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogdGFyZ2V0UGFyZW50VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZVR5cGU6IGFyZ3Mubm9kZVR5cGUgfHwgJ05vZGUnLFxuICAgICAgICAgICAgICAgICAgICBmcm9tQXNzZXQ6ICEhZmluYWxBc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogZmluYWxBc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHN1Y2Nlc3NNZXNzYWdlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25EYXRhOiB2ZXJpZmljYXRpb25EYXRhXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGNyZWF0ZSBub2RlOiAke2Vyci5tZXNzYWdlfS4gQXJnczogJHtKU09OLnN0cmluZ2lmeShhcmdzKX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXROb2RlSW5mbyh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm9kZSBub3QgZm91bmQgb3IgaW52YWxpZCByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZURhdGE7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKG5vZGVEYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUGFyc2Ugbm9kZSBpbmZvIGJhc2VkIG9uIGFjdHVhbCByZXR1cm5lZCBkYXRhIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgIGNvbnN0IGluZm86IE5vZGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlRGF0YS51dWlkPy52YWx1ZSB8fCB1dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlRGF0YS5uYW1lPy52YWx1ZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZURhdGEuYWN0aXZlPy52YWx1ZSAhPT0gdW5kZWZpbmVkID8gbm9kZURhdGEuYWN0aXZlLnZhbHVlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGVEYXRhLnBvc2l0aW9uPy52YWx1ZSB8fCB7IHg6IDAsIHk6IDAsIHo6IDAgfSxcbiAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IG5vZGVEYXRhLnJvdGF0aW9uPy52YWx1ZSB8fCB7IHg6IDAsIHk6IDAsIHo6IDAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IG5vZGVEYXRhLnNjYWxlPy52YWx1ZSB8fCB7IHg6IDEsIHk6IDEsIHo6IDEgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlRGF0YS5wYXJlbnQ/LnZhbHVlPy51dWlkIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBub2RlRGF0YS5jaGlsZHJlbiB8fCBbXSxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogKG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXSkubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLl9fdHlwZV9fIHx8IGNvbXAuY2lkIHx8IGNvbXAudHlwZSB8fCAnVW5rbm93bicsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQgIT09IHVuZGVmaW5lZCA/IGNvbXAuZW5hYmxlZCA6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgICAgICAgICBsYXllcjogbm9kZURhdGEubGF5ZXI/LnZhbHVlIHx8IDEwNzM3NDE4MjQsXG4gICAgICAgICAgICAgICAgICAgIG1vYmlsaXR5OiBub2RlRGF0YS5tb2JpbGl0eT8udmFsdWUgfHwgMFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZGF0YTogaW5mbyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmluZE5vZGVzKHBhdHRlcm46IHN0cmluZywgZXhhY3RNYXRjaDogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gTm90ZTogJ3F1ZXJ5LW5vZGVzLWJ5LW5hbWUnIEFQSSBkb2Vzbid0IGV4aXN0IGluIG9mZmljaWFsIGRvY3VtZW50YXRpb25cbiAgICAgICAgLy8gVXNpbmcgdHJlZSB0cmF2ZXJzYWwgYXMgcHJpbWFyeSBhcHByb2FjaFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdHJlZTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBjb25zdCBub2RlczogYW55W10gPSBbXTtcblxuICAgICAgICAgICAgY29uc3Qgc2VhcmNoVHJlZSA9IChub2RlOiBhbnksIGN1cnJlbnRQYXRoOiBzdHJpbmcgPSAnJykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVQYXRoID0gY3VycmVudFBhdGggPyBgJHtjdXJyZW50UGF0aH0vJHtub2RlLm5hbWV9YCA6IG5vZGUubmFtZTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBleGFjdE1hdGNoID9cbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID09PSBwYXR0ZXJuIDpcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocGF0dGVybi50b0xvd2VyQ2FzZSgpKTtcblxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogbm9kZVBhdGhcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hUcmVlKGNoaWxkLCBub2RlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHJlZSkge1xuICAgICAgICAgICAgICAgIHNlYXJjaFRyZWUodHJlZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IG5vZGVzIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBUcmVlIHNlYXJjaCBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kTm9kZUJ5TmFtZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHVzaW5nIEVkaXRvciBBUEkgdG8gcXVlcnkgbm9kZSB0cmVlIGFuZCBzZWFyY2ggZmlyc3RcbiAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgY29uc3QgZm91bmROb2RlID0gdGhpcy5zZWFyY2hOb2RlSW5UcmVlKHRyZWUsIG5hbWUpO1xuICAgICAgICAgICAgaWYgKGZvdW5kTm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IGZvdW5kTm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZm91bmROb2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLmdldE5vZGVQYXRoKGZvdW5kTm9kZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlICcke25hbWV9JyBub3QgZm91bmRgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogdXNlIHNjZW5lIHNjcmlwdFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnZmluZE5vZGVCeU5hbWUnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtuYW1lXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzZWFyY2hOb2RlSW5UcmVlKG5vZGU6IGFueSwgdGFyZ2V0TmFtZTogc3RyaW5nKTogYW55IHtcbiAgICAgICAgaWYgKG5vZGUubmFtZSA9PT0gdGFyZ2V0TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSB0aGlzLnNlYXJjaE5vZGVJblRyZWUoY2hpbGQsIHRhcmdldE5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm91bmQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBbGxOb2RlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIHF1ZXJ5IHNjZW5lIG5vZGUgdHJlZVxuICAgICAgICAgICAgY29uc3QgdHJlZTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBjb25zdCBub2RlczogYW55W10gPSBbXTtcblxuICAgICAgICAgICAgY29uc3QgdHJhdmVyc2VUcmVlID0gKG5vZGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogbm9kZS50eXBlLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiB0aGlzLmdldE5vZGVQYXRoKG5vZGUpXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYXZlcnNlVHJlZShjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHJlZSAmJiB0cmVlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgdHJhdmVyc2VUcmVlKHRyZWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVzOiBub2Rlc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogdXNlIHNjZW5lIHNjcmlwdFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0QWxsTm9kZXMnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyMjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldE5vZGVQYXRoKG5vZGU6IGFueSk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IHBhdGggPSBbbm9kZS5uYW1lXTtcbiAgICAgICAgbGV0IGN1cnJlbnQgPSBub2RlLnBhcmVudDtcbiAgICAgICAgd2hpbGUgKGN1cnJlbnQgJiYgY3VycmVudC5uYW1lICE9PSAnQ2FudmFzJykge1xuICAgICAgICAgICAgcGF0aC51bnNoaWZ0KGN1cnJlbnQubmFtZSk7XG4gICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhdGguam9pbignLycpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0Tm9kZVByb3BlcnR5KHV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gc2V0IG5vZGUgcHJvcGVydHkgZGlyZWN0bHkgdXNpbmcgRWRpdG9yIEFQSVxuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgIHV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgcGF0aDogcHJvcGVydHksXG4gICAgICAgICAgICAgICAgZHVtcDoge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gR2V0IGNvbXByZWhlbnNpdmUgdmVyaWZpY2F0aW9uIGRhdGEgaW5jbHVkaW5nIHVwZGF0ZWQgbm9kZSBpbmZvXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvID0gYXdhaXQgdGhpcy5nZXROb2RlSW5mbyh1dWlkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHByb3BlcnR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VmFsdWU6IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZlcmlmaWNhdGlvbkRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVJbmZvOiBub2RlSW5mby5kYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlRGV0YWlsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiBwcm9wZXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkIHN1Y2Nlc3NmdWxseSAodmVyaWZpY2F0aW9uIGZhaWxlZClgXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIElmIGRpcmVjdCBzZXR0aW5nIGZhaWxzLCB0cnkgdXNpbmcgc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkLCBwcm9wZXJ0eSwgdmFsdWVdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyMjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0IEFQSSBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9LCBTY2VuZSBzY3JpcHQgZmFpbGVkOiAke2VycjIubWVzc2FnZX1gIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldE5vZGVUcmFuc2Zvcm0oYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyB1dWlkLCBwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlIH0gPSBhcmdzO1xuICAgICAgICBjb25zdCB1cGRhdGVQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICAgICAgY29uc3QgdXBkYXRlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEZpcnN0IGdldCBub2RlIGluZm8gdG8gZGV0ZXJtaW5lIGlmIGl0J3MgMkQgb3IgM0RcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKHV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlSW5mb1Jlc3BvbnNlLnN1Y2Nlc3MgfHwgIW5vZGVJbmZvUmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgbm9kZSBpbmZvcm1hdGlvbicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBub2RlSW5mb1Jlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBjb25zdCBpczJETm9kZSA9IHRoaXMuaXMyRE5vZGUobm9kZUluZm8pO1xuXG4gICAgICAgICAgICBpZiAocG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUG9zaXRpb24gPSB0aGlzLm5vcm1hbGl6ZVRyYW5zZm9ybVZhbHVlKHBvc2l0aW9uLCAncG9zaXRpb24nLCBpczJETm9kZSk7XG4gICAgICAgICAgICAgICAgaWYgKG5vcm1hbGl6ZWRQb3NpdGlvbi53YXJuaW5nKSB7XG4gICAgICAgICAgICAgICAgICAgIHdhcm5pbmdzLnB1c2gobm9ybWFsaXplZFBvc2l0aW9uLndhcm5pbmcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHVwZGF0ZVByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAncG9zaXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogbm9ybWFsaXplZFBvc2l0aW9uLnZhbHVlIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHVwZGF0ZXMucHVzaCgncG9zaXRpb24nKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJvdGF0aW9uKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9ybWFsaXplZFJvdGF0aW9uID0gdGhpcy5ub3JtYWxpemVUcmFuc2Zvcm1WYWx1ZShyb3RhdGlvbiwgJ3JvdGF0aW9uJywgaXMyRE5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChub3JtYWxpemVkUm90YXRpb24ud2FybmluZykge1xuICAgICAgICAgICAgICAgICAgICB3YXJuaW5ncy5wdXNoKG5vcm1hbGl6ZWRSb3RhdGlvbi53YXJuaW5nKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB1cGRhdGVQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3JvdGF0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IG5vcm1hbGl6ZWRSb3RhdGlvbi52YWx1ZSB9XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVzLnB1c2goJ3JvdGF0aW9uJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzY2FsZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRTY2FsZSA9IHRoaXMubm9ybWFsaXplVHJhbnNmb3JtVmFsdWUoc2NhbGUsICdzY2FsZScsIGlzMkROb2RlKTtcbiAgICAgICAgICAgICAgICBpZiAobm9ybWFsaXplZFNjYWxlLndhcm5pbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgd2FybmluZ3MucHVzaChub3JtYWxpemVkU2NhbGUud2FybmluZyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdXBkYXRlUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6ICdzY2FsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBub3JtYWxpemVkU2NhbGUudmFsdWUgfVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgdXBkYXRlcy5wdXNoKCdzY2FsZScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodXBkYXRlUHJvbWlzZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gdHJhbnNmb3JtIHByb3BlcnRpZXMgc3BlY2lmaWVkJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCBQcm9taXNlLmFsbCh1cGRhdGVQcm9taXNlcyk7XG5cbiAgICAgICAgICAgIC8vIFZlcmlmeSB0aGUgY2hhbmdlcyBieSBnZXR0aW5nIHVwZGF0ZWQgbm9kZSBpbmZvXG4gICAgICAgICAgICBjb25zdCB1cGRhdGVkTm9kZUluZm8gPSBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKHV1aWQpO1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2U6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBUcmFuc2Zvcm0gcHJvcGVydGllcyB1cGRhdGVkOiAke3VwZGF0ZXMuam9pbignLCAnKX0gJHtpczJETm9kZSA/ICcoMkQgbm9kZSknIDogJygzRCBub2RlKSd9YCxcbiAgICAgICAgICAgICAgICB1cGRhdGVkUHJvcGVydGllczogdXBkYXRlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICBub2RlVHlwZTogaXMyRE5vZGUgPyAnMkQnIDogJzNEJyxcbiAgICAgICAgICAgICAgICAgICAgYXBwbGllZENoYW5nZXM6IHVwZGF0ZXMsXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybUNvbnN0cmFpbnRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogaXMyRE5vZGUgPyAneCwgeSBvbmx5ICh6IGlnbm9yZWQpJyA6ICd4LCB5LCB6IGFsbCB1c2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBpczJETm9kZSA/ICd6IG9ubHkgKHgsIHkgaWdub3JlZCknIDogJ3gsIHksIHogYWxsIHVzZWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IGlzMkROb2RlID8gJ3gsIHkgbWFpbiwgeiB0eXBpY2FsbHkgMScgOiAneCwgeSwgeiBhbGwgdXNlZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlSW5mbzogdXBkYXRlZE5vZGVJbmZvLmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybURldGFpbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsTm9kZVR5cGU6IGlzMkROb2RlID8gJzJEJyA6ICczRCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkVHJhbnNmb3JtczogdXBkYXRlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGJlZm9yZUFmdGVyQ29tcGFyaXNvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlOiBub2RlSW5mbyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyOiB1cGRhdGVkTm9kZUluZm8uZGF0YVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXNwb25zZS53YXJuaW5nID0gd2FybmluZ3Muam9pbignOyAnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIHVwZGF0ZSB0cmFuc2Zvcm06ICR7ZXJyLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaXMyRE5vZGUobm9kZUluZm86IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICAvLyBDaGVjayBpZiBub2RlIGhhcyAyRC1zcGVjaWZpYyBjb21wb25lbnRzIG9yIGlzIHVuZGVyIENhbnZhc1xuICAgICAgICBjb25zdCBjb21wb25lbnRzID0gbm9kZUluZm8uY29tcG9uZW50cyB8fCBbXTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgY29tbW9uIDJEIGNvbXBvbmVudHNcbiAgICAgICAgY29uc3QgaGFzMkRDb21wb25lbnRzID0gY29tcG9uZW50cy5zb21lKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICBjb21wLnR5cGUgJiYgKFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuU3ByaXRlJykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkxhYmVsJykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkJ1dHRvbicpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5MYXlvdXQnKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuV2lkZ2V0JykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLk1hc2snKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuR3JhcGhpY3MnKVxuICAgICAgICAgICAgKVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChoYXMyRENvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIDNELXNwZWNpZmljIGNvbXBvbmVudHNcbiAgICAgICAgY29uc3QgaGFzM0RDb21wb25lbnRzID0gY29tcG9uZW50cy5zb21lKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICBjb21wLnR5cGUgJiYgKFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTWVzaFJlbmRlcmVyJykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkNhbWVyYScpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5MaWdodCcpIHx8XG4gICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5EaXJlY3Rpb25hbExpZ2h0JykgfHxcbiAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlBvaW50TGlnaHQnKSB8fFxuICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuU3BvdExpZ2h0JylcbiAgICAgICAgICAgIClcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoaGFzM0RDb21wb25lbnRzKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZWZhdWx0IGhldXJpc3RpYzogaWYgeiBwb3NpdGlvbiBpcyAwIGFuZCBoYXNuJ3QgYmVlbiBjaGFuZ2VkLCBsaWtlbHkgMkRcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSBub2RlSW5mby5wb3NpdGlvbjtcbiAgICAgICAgaWYgKHBvc2l0aW9uICYmIE1hdGguYWJzKHBvc2l0aW9uLnopIDwgMC4wMDEpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVmYXVsdCB0byAzRCBpZiB1bmNlcnRhaW5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgbm9ybWFsaXplVHJhbnNmb3JtVmFsdWUodmFsdWU6IGFueSwgdHlwZTogJ3Bvc2l0aW9uJyB8ICdyb3RhdGlvbicgfCAnc2NhbGUnLCBpczJEOiBib29sZWFuKTogeyB2YWx1ZTogYW55LCB3YXJuaW5nPzogc3RyaW5nIH0ge1xuICAgICAgICBjb25zdCByZXN1bHQgPSB7IC4uLnZhbHVlIH07XG4gICAgICAgIGxldCB3YXJuaW5nOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgaWYgKGlzMkQpIHtcbiAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Bvc2l0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLnogIT09IHVuZGVmaW5lZCAmJiBNYXRoLmFicyh2YWx1ZS56KSA+IDAuMDAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuaW5nID0gYDJEIG5vZGU6IHogcG9zaXRpb24gKCR7dmFsdWUuen0pIGlnbm9yZWQsIHNldCB0byAwYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC56ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWx1ZS56ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC56ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3JvdGF0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh2YWx1ZS54ICE9PSB1bmRlZmluZWQgJiYgTWF0aC5hYnModmFsdWUueCkgPiAwLjAwMSkgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICh2YWx1ZS55ICE9PSB1bmRlZmluZWQgJiYgTWF0aC5hYnModmFsdWUueSkgPiAwLjAwMSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm5pbmcgPSBgMkQgbm9kZTogeCx5IHJvdGF0aW9ucyBpZ25vcmVkLCBvbmx5IHogcm90YXRpb24gYXBwbGllZGA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueCA9IHJlc3VsdC54IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQueSA9IHJlc3VsdC55IHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnogPSByZXN1bHQueiB8fCAwO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgJ3NjYWxlJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlLnogPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnogPSAxOyAvLyBEZWZhdWx0IHNjYWxlIGZvciAyRFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gM0Qgbm9kZSAtIGVuc3VyZSBhbGwgYXhlcyBhcmUgZGVmaW5lZFxuICAgICAgICAgICAgcmVzdWx0LnggPSByZXN1bHQueCAhPT0gdW5kZWZpbmVkID8gcmVzdWx0LnggOiAodHlwZSA9PT0gJ3NjYWxlJyA/IDEgOiAwKTtcbiAgICAgICAgICAgIHJlc3VsdC55ID0gcmVzdWx0LnkgIT09IHVuZGVmaW5lZCA/IHJlc3VsdC55IDogKHR5cGUgPT09ICdzY2FsZScgPyAxIDogMCk7XG4gICAgICAgICAgICByZXN1bHQueiA9IHJlc3VsdC56ICE9PSB1bmRlZmluZWQgPyByZXN1bHQueiA6ICh0eXBlID09PSAnc2NhbGUnID8gMSA6IDApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHJlc3VsdCwgd2FybmluZyB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZGVsZXRlTm9kZSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtbm9kZScsIHsgdXVpZDogdXVpZCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdOb2RlIGRlbGV0ZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbW92ZU5vZGUobm9kZVV1aWQ6IHN0cmluZywgbmV3UGFyZW50VXVpZDogc3RyaW5nLCBzaWJsaW5nSW5kZXg6IG51bWJlciA9IC0xKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gVXNlIGNvcnJlY3Qgc2V0LXBhcmVudCBBUEkgaW5zdGVhZCBvZiBtb3ZlLW5vZGVcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc2V0LXBhcmVudCcsIHtcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IG5ld1BhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgdXVpZHM6IFtub2RlVXVpZF0sXG4gICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBmYWxzZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnTm9kZSBtb3ZlZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZW5hbWVOb2RlKHV1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCF1dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd1dWlkIGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICBpZiAoIW5hbWUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ25hbWUgaXMgcmVxdWlyZWQnIH07XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBhdGg6ICduYW1lJyxcbiAgICAgICAgICAgICAgICBkdW1wOiB7IHR5cGU6ICdTdHJpbmcnLCB2YWx1ZTogbmFtZSB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBOb2RlIHJlbmFtZWQgdG8gXCIke25hbWV9XCJgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkdXBsaWNhdGVOb2RlKHV1aWQ6IHN0cmluZywgaW5jbHVkZUNoaWxkcmVuOiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIE5vdGU6IGluY2x1ZGVDaGlsZHJlbiBwYXJhbWV0ZXIgaXMgYWNjZXB0ZWQgZm9yIGZ1dHVyZSB1c2UgYnV0IG5vdCBjdXJyZW50bHkgaW1wbGVtZW50ZWRcbiAgICAgICAgLy8gQ29jb3MgYGR1cGxpY2F0ZS1ub2RlYCByZXR1cm5zIHN0cmluZ1tdIG9mIG5ldyBub2RlIFVVSURzLlxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ2R1cGxpY2F0ZS1ub2RlJywgdXVpZCksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXVpZHM6IHN0cmluZ1tdID0gQXJyYXkuaXNBcnJheShyZXN1bHQpID8gcmVzdWx0IDogKHJlc3VsdD8udXVpZCA/IFtyZXN1bHQudXVpZF0gOiBbXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VXVpZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdVdWlkOiBuZXdVdWlkc1swXSA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUgZHVwbGljYXRlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZGV0ZWN0Tm9kZVR5cGUodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVJbmZvUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKHV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlSW5mb1Jlc3BvbnNlLnN1Y2Nlc3MgfHwgIW5vZGVJbmZvUmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBnZXQgbm9kZSBpbmZvcm1hdGlvbicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZUluZm8gPSBub2RlSW5mb1Jlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBjb25zdCBpczJEID0gdGhpcy5pczJETm9kZShub2RlSW5mbyk7XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRzID0gbm9kZUluZm8uY29tcG9uZW50cyB8fCBbXTtcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCBkZXRlY3Rpb24gcmVhc29uc1xuICAgICAgICAgICAgY29uc3QgZGV0ZWN0aW9uUmVhc29uczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIDJEIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGNvbnN0IHR3b0RDb21wb25lbnRzID0gY29tcG9uZW50cy5maWx0ZXIoKGNvbXA6IGFueSkgPT5cbiAgICAgICAgICAgICAgICBjb21wLnR5cGUgJiYgKFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlNwcml0ZScpIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTGFiZWwnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkJ1dHRvbicpIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTGF5b3V0JykgfHxcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5XaWRnZXQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLk1hc2snKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkdyYXBoaWNzJylcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBmb3IgM0QgY29tcG9uZW50c1xuICAgICAgICAgICAgY29uc3QgdGhyZWVEQ29tcG9uZW50cyA9IGNvbXBvbmVudHMuZmlsdGVyKChjb21wOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgY29tcC50eXBlICYmIChcbiAgICAgICAgICAgICAgICAgICAgY29tcC50eXBlLmluY2x1ZGVzKCdjYy5NZXNoUmVuZGVyZXInKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkNhbWVyYScpIHx8XG4gICAgICAgICAgICAgICAgICAgIGNvbXAudHlwZS5pbmNsdWRlcygnY2MuTGlnaHQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLkRpcmVjdGlvbmFsTGlnaHQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlBvaW50TGlnaHQnKSB8fFxuICAgICAgICAgICAgICAgICAgICBjb21wLnR5cGUuaW5jbHVkZXMoJ2NjLlNwb3RMaWdodCcpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHR3b0RDb21wb25lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBkZXRlY3Rpb25SZWFzb25zLnB1c2goYEhhcyAyRCBjb21wb25lbnRzOiAke3R3b0RDb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUpLmpvaW4oJywgJyl9YCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0aHJlZURDb21wb25lbnRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBkZXRlY3Rpb25SZWFzb25zLnB1c2goYEhhcyAzRCBjb21wb25lbnRzOiAke3RocmVlRENvbXBvbmVudHMubWFwKChjOiBhbnkpID0+IGMudHlwZSkuam9pbignLCAnKX1gKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ2hlY2sgcG9zaXRpb24gZm9yIGhldXJpc3RpY1xuICAgICAgICAgICAgY29uc3QgcG9zaXRpb24gPSBub2RlSW5mby5wb3NpdGlvbjtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiAmJiBNYXRoLmFicyhwb3NpdGlvbi56KSA8IDAuMDAxKSB7XG4gICAgICAgICAgICAgICAgZGV0ZWN0aW9uUmVhc29ucy5wdXNoKCdaIHBvc2l0aW9uIGlzIH4wIChsaWtlbHkgMkQpJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uICYmIE1hdGguYWJzKHBvc2l0aW9uLnopID4gMC4wMDEpIHtcbiAgICAgICAgICAgICAgICBkZXRlY3Rpb25SZWFzb25zLnB1c2goYFogcG9zaXRpb24gaXMgJHtwb3NpdGlvbi56fSAobGlrZWx5IDNEKWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZGV0ZWN0aW9uUmVhc29ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBkZXRlY3Rpb25SZWFzb25zLnB1c2goJ05vIHNwZWNpZmljIGluZGljYXRvcnMgZm91bmQsIGRlZmF1bHRpbmcgYmFzZWQgb24gaGV1cmlzdGljcycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGVJbmZvLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVUeXBlOiBpczJEID8gJzJEJyA6ICczRCcsXG4gICAgICAgICAgICAgICAgICAgIGRldGVjdGlvblJlYXNvbnM6IGRldGVjdGlvblJlYXNvbnMsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IGNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdGhpcy5nZXRDb21wb25lbnRDYXRlZ29yeShjb21wLnR5cGUpXG4gICAgICAgICAgICAgICAgICAgIH0pKSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGVJbmZvLnBvc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm1Db25zdHJhaW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGlzMkQgPyAneCwgeSBvbmx5ICh6IGlnbm9yZWQpJyA6ICd4LCB5LCB6IGFsbCB1c2VkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiBpczJEID8gJ3ogb25seSAoeCwgeSBpZ25vcmVkKScgOiAneCwgeSwgeiBhbGwgdXNlZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZTogaXMyRCA/ICd4LCB5IG1haW4sIHogdHlwaWNhbGx5IDEnIDogJ3gsIHksIHogYWxsIHVzZWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGRldGVjdCBub2RlIHR5cGU6ICR7ZXJyLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0Q29tcG9uZW50Q2F0ZWdvcnkoY29tcG9uZW50VHlwZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSByZXR1cm4gJ3Vua25vd24nO1xuXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5TcHJpdGUnKSB8fCBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5MYWJlbCcpIHx8XG4gICAgICAgICAgICBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5CdXR0b24nKSB8fCBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5MYXlvdXQnKSB8fFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuV2lkZ2V0JykgfHwgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuTWFzaycpIHx8XG4gICAgICAgICAgICBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5HcmFwaGljcycpKSB7XG4gICAgICAgICAgICByZXR1cm4gJzJEJztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5NZXNoUmVuZGVyZXInKSB8fCBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5DYW1lcmEnKSB8fFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZS5pbmNsdWRlcygnY2MuTGlnaHQnKSB8fCBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5EaXJlY3Rpb25hbExpZ2h0JykgfHxcbiAgICAgICAgICAgIGNvbXBvbmVudFR5cGUuaW5jbHVkZXMoJ2NjLlBvaW50TGlnaHQnKSB8fCBjb21wb25lbnRUeXBlLmluY2x1ZGVzKCdjYy5TcG90TGlnaHQnKSkge1xuICAgICAgICAgICAgcmV0dXJuICczRCc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gJ2dlbmVyaWMnO1xuICAgIH1cbn1cbiJdfQ==