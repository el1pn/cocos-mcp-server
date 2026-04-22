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
exports.PrefabTools = void 0;
const fs = __importStar(require("fs"));
const logger_1 = require("../logger");
const asset_safety_1 = require("../utils/asset-safety");
class PrefabTools {
    getTools() {
        return [
            {
                name: 'prefab_lifecycle',
                description: 'Manage prefab lifecycle: create, instantiate, update, or duplicate prefabs. Use the "action" parameter to select the operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['create', 'instantiate', 'update', 'duplicate'],
                            description: 'Action to perform: "create" - create a prefab from a node, "instantiate" - instantiate a prefab in the scene, "update" - update an existing prefab, "duplicate" - duplicate an existing prefab'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path (used by: instantiate, update)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID (used by: create, update)'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the prefab, e.g. db://assets/prefabs/MyPrefab.prefab (used by: create)'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'Prefab name (used by: create)'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID (used by: instantiate, optional)'
                        },
                        position: {
                            type: 'object',
                            description: 'Initial position (used by: instantiate, optional)',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        },
                        sourcePrefabPath: {
                            type: 'string',
                            description: 'Source prefab path (used by: duplicate)'
                        },
                        targetPrefabPath: {
                            type: 'string',
                            description: 'Target prefab path (used by: duplicate)'
                        },
                        newPrefabName: {
                            type: 'string',
                            description: 'New prefab name (used by: duplicate, optional)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'prefab_query',
                description: 'Query prefab information: get a list of prefabs, load a prefab, get detailed info, or validate a prefab file. Use the "action" parameter to select the operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_list', 'load', 'get_info', 'validate'],
                            description: 'Action to perform: "get_list" - get all prefabs in the project, "load" - load a prefab by path, "get_info" - get detailed prefab information, "validate" - validate a prefab file format'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path (used by: load, get_info, validate)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder path to search (used by: get_list, optional, default: db://assets)',
                            default: 'db://assets'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'prefab_instance',
                description: 'Manage prefab instances: revert a prefab instance to its original state or restore a prefab node using a prefab asset. Use the "action" parameter to select the operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['revert', 'restore'],
                            description: 'Action to perform: "revert" - revert prefab instance to original, "restore" - restore prefab node using prefab asset (built-in undo record)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID (used by: revert, restore)'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID (used by: restore)'
                        }
                    },
                    required: ['action', 'nodeUuid']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'prefab_lifecycle': {
                switch (args.action) {
                    case 'create':
                        return await this.createPrefab(args);
                    case 'instantiate':
                        return await this.instantiatePrefab(args);
                    case 'update':
                        return await this.updatePrefab(args.prefabPath, args.nodeUuid);
                    case 'duplicate':
                        return await this.duplicatePrefab(args);
                    default:
                        throw new Error(`Unknown action for prefab_lifecycle: ${args.action}`);
                }
            }
            case 'prefab_query': {
                switch (args.action) {
                    case 'get_list':
                        return await this.getPrefabList(args.folder);
                    case 'load':
                        return await this.loadPrefab(args.prefabPath);
                    case 'get_info':
                        return await this.getPrefabInfo(args.prefabPath);
                    case 'validate':
                        return await this.validatePrefab(args.prefabPath);
                    default:
                        throw new Error(`Unknown action for prefab_query: ${args.action}`);
                }
            }
            case 'prefab_instance': {
                switch (args.action) {
                    case 'revert':
                        return await this.revertPrefab(args.nodeUuid);
                    case 'restore':
                        return await this.restorePrefabNode(args.nodeUuid, args.assetUuid);
                    default:
                        throw new Error(`Unknown action for prefab_instance: ${args.action}`);
                }
            }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async getPrefabList(folder = 'db://assets') {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ?
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results) => {
                const prefabs = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async loadPrefab(prefabPath) {
        // "Load" here just resolves the prefab asset metadata — no scene-side
        // load message exists in Cocos 3.8.x. Use asset-db directly.
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                resolve({
                    success: true,
                    data: {
                        uuid: assetInfo.uuid,
                        name: assetInfo.name,
                        message: 'Prefab asset resolved'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async instantiatePrefab(args) {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }
            const createNodeOptions = {
                assetUuid: assetInfo.uuid
            };
            if (args.parentUuid) {
                createNodeOptions.parent = args.parentUuid;
            }
            if (args.name) {
                createNodeOptions.name = args.name;
            }
            else if (assetInfo.name) {
                createNodeOptions.name = assetInfo.name;
            }
            if (args.position) {
                createNodeOptions.dump = {
                    position: {
                        value: args.position
                    }
                };
            }
            const nodeUuid = await Editor.Message.request('scene', 'create-node', createNodeOptions);
            const uuid = Array.isArray(nodeUuid) ? nodeUuid[0] : nodeUuid;
            logger_1.logger.info(`Prefab node created successfully: ${JSON.stringify({
                nodeUuid: uuid,
                prefabUuid: assetInfo.uuid,
                prefabPath: args.prefabPath
            })}`);
            return {
                success: true,
                data: {
                    nodeUuid: uuid,
                    prefabPath: args.prefabPath,
                    parentUuid: args.parentUuid,
                    position: args.position,
                    message: 'Prefab instantiated successfully, prefab association established'
                }
            };
        }
        catch (err) {
            return {
                success: false,
                error: `Prefab instantiation failed: ${err.message}`,
                instruction: 'Please check that the prefab path is correct and the prefab file format is valid'
            };
        }
    }
    async createPrefab(args) {
        const pathParam = args.prefabPath || args.savePath;
        if (!pathParam) {
            return {
                success: false,
                error: 'Missing prefab path parameter. Please provide prefabPath or savePath.'
            };
        }
        if (!args.nodeUuid) {
            return { success: false, error: 'nodeUuid is required' };
        }
        const prefabName = args.prefabName || 'NewPrefab';
        const fullPath = pathParam.endsWith('.prefab') ?
            pathParam : `${pathParam}/${prefabName}.prefab`;
        return await this.createPrefabViaEngine(args.nodeUuid, fullPath);
    }
    /**
     * Delegate to the engine's PrefabManager.createPrefabAssetFromNode via scene-script.
     * Replicates the editor's "drag node to Assets" flow — handles script component
     * __type__ compression, @property ref serialization, and source-node relinking.
     */
    async createPrefabViaEngine(nodeUuid, prefabPath) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'createPrefabFromNode',
                args: [nodeUuid, prefabPath]
            });
            if (!result || !result.success) {
                return { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Unknown engine error' };
            }
            const validation = await this.verifyPrefabOutput(prefabPath);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'Prefab created but failed post-op validation',
                    data: Object.assign(Object.assign({}, result.data), { path: prefabPath, issues: validation.issues })
                };
            }
            return {
                success: true,
                data: Object.assign(Object.assign({}, result.data), { path: prefabPath, convertedToPrefabInstance: true, validation: {
                        nodeCount: validation.nodeCount,
                        componentCount: validation.componentCount
                    } }),
                message: 'Prefab created via engine PrefabManager'
            };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    /**
     * Post-op sanity check on a newly created prefab. Catches semantic corruption
     * that the engine call reports as success — the class of bug that motivated
     * the move off the legacy hand-synth pipeline.
     */
    async verifyPrefabOutput(prefabPath) {
        const issues = [];
        try {
            const diskPath = await Editor.Message.request('asset-db', 'query-path', prefabPath);
            if (!diskPath || typeof diskPath !== 'string') {
                issues.push(`Could not resolve disk path for ${prefabPath}`);
                return { isValid: false, issues, nodeCount: 0, componentCount: 0 };
            }
            const content = fs.readFileSync(diskPath, 'utf8');
            const data = JSON.parse(content);
            const format = this.validatePrefabFormat(data);
            issues.push(...format.issues);
            if (Array.isArray(data)) {
                const compressedUuid = /^[0-9a-f]{5}[A-Za-z0-9+/]{18}$/;
                for (const obj of data) {
                    const t = obj === null || obj === void 0 ? void 0 : obj.__type__;
                    if (typeof t !== 'string' || t.startsWith('cc.'))
                        continue;
                    const looksLikeComponent = obj.node && typeof obj.node === 'object' && '__id__' in obj.node;
                    if (looksLikeComponent && !compressedUuid.test(t)) {
                        issues.push(`Component has class-name __type__ "${t}" (expected compressed UUID). This indicates the engine serializer returned an unregistered script — ensure the class is decorated with @ccclass and the script is reimported.`);
                    }
                }
            }
            return {
                isValid: issues.length === 0,
                issues,
                nodeCount: format.nodeCount,
                componentCount: format.componentCount
            };
        }
        catch (err) {
            issues.push(`Failed to read/parse prefab for validation: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`);
            return { isValid: false, issues, nodeCount: 0, componentCount: 0 };
        }
    }
    async updatePrefab(prefabPath, nodeUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                return Editor.Message.request('scene', 'apply-prefab', {
                    node: nodeUuid,
                    prefab: assetInfo.uuid
                });
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab updated successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async revertPrefab(nodeUuid) {
        var _a;
        // No public "revert-prefab" message exists; delegate to the engine's
        // PrefabManager via scene-script (same channel used by createPrefabViaEngine).
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'revertPrefabInstance',
                args: [nodeUuid]
            });
            if (result && result.success) {
                const applied = ((_a = result.data) === null || _a === void 0 ? void 0 : _a.applied) !== false;
                return {
                    success: true,
                    data: result.data,
                    message: applied ? 'Prefab instance reverted successfully' : 'No overrides to revert'
                };
            }
            return { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Unknown engine error' };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async getPrefabInfo(prefabPath) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }
                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo) => {
                const info = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async validatePrefab(prefabPath) {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                return { success: false, error: 'Prefab file does not exist' };
            }
            const result = await this.verifyPrefabOutput(prefabPath);
            return {
                success: true,
                data: {
                    isValid: result.isValid,
                    issues: result.issues,
                    nodeCount: result.nodeCount,
                    componentCount: result.componentCount,
                    message: result.isValid ? 'Prefab format is valid' : 'Prefab format has issues'
                }
            };
        }
        catch (err) {
            return { success: false, error: `Error occurred while validating prefab: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}` };
        }
    }
    validatePrefabFormat(prefabData) {
        const issues = [];
        let nodeCount = 0;
        let componentCount = 0;
        if (!Array.isArray(prefabData)) {
            issues.push('Prefab data must be in array format');
            return { isValid: false, issues, nodeCount, componentCount };
        }
        if (prefabData.length === 0) {
            issues.push('Prefab data is empty');
            return { isValid: false, issues, nodeCount, componentCount };
        }
        const firstElement = prefabData[0];
        if (!firstElement || firstElement.__type__ !== 'cc.Prefab') {
            issues.push('First element must be cc.Prefab type');
        }
        prefabData.forEach((item) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            }
            else if (item.__type__ && item.__type__.includes('cc.')) {
                componentCount++;
            }
        });
        if (nodeCount === 0) {
            issues.push('Prefab must contain at least one node');
        }
        return {
            isValid: issues.length === 0,
            issues,
            nodeCount,
            componentCount
        };
    }
    async duplicatePrefab(args) {
        var _a;
        try {
            const { sourcePrefabPath, targetPrefabPath, newPrefabName } = args;
            if (!sourcePrefabPath) {
                return { success: false, error: 'sourcePrefabPath is required' };
            }
            let target = targetPrefabPath;
            if (!target) {
                if (!newPrefabName) {
                    return { success: false, error: 'Either targetPrefabPath or newPrefabName is required' };
                }
                const lastSlash = sourcePrefabPath.lastIndexOf('/');
                const dir = lastSlash >= 0 ? sourcePrefabPath.substring(0, lastSlash) : 'db://assets';
                const name = newPrefabName.endsWith('.prefab') ? newPrefabName : `${newPrefabName}.prefab`;
                target = `${dir}/${name}`;
            }
            let validatedSource;
            let validatedTarget;
            try {
                validatedSource = (0, asset_safety_1.validateAssetUrl)(sourcePrefabPath);
                validatedTarget = (0, asset_safety_1.validateAssetUrl)(target);
            }
            catch (err) {
                return { success: false, error: err.message };
            }
            const result = await Editor.Message.request('asset-db', 'copy-asset', validatedSource, validatedTarget, {
                overwrite: false,
                rename: true
            });
            if (!result || !result.uuid) {
                return {
                    success: false,
                    error: `Copy failed — editor returned no uuid (source=${validatedSource} target=${validatedTarget})`
                };
            }
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    message: `Prefab duplicated successfully: ${validatedSource} → ${result.url || validatedTarget}`
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Error occurred while copying prefab: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`
            };
        }
    }
    async restorePrefabNode(nodeUuid, assetUuid) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: 'Prefab node restored successfully'
                    }
                });
            }).catch((error) => {
                resolve({
                    success: false,
                    error: `Failed to restore prefab node: ${error.message}`
                });
            });
        });
    }
}
exports.PrefabTools = PrefabTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFFekIsc0NBQW1DO0FBQ25DLHdEQUF5RDtBQUV6RCxNQUFhLFdBQVc7SUFDcEIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsaUlBQWlJO2dCQUM5SSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUM7NEJBQ3RELFdBQVcsRUFBRSxnTUFBZ007eUJBQ2hOO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsa0RBQWtEO3lCQUNsRTt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDRDQUE0Qzt5QkFDNUQ7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxxRkFBcUY7eUJBQ3JHO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsK0JBQStCO3lCQUMvQzt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1EQUFtRDt5QkFDbkU7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtREFBbUQ7NEJBQ2hFLFVBQVUsRUFBRTtnQ0FDUixDQUFDLEVBQUUs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QUFFLEtBQUs7b0JBQ2QsS0FBSyxFQUFFLGtDQUFrQyxLQUFLLENBQUMsT0FBTyxFQUFFO2lCQUMzRCxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBcmpCRCxrQ0FxakJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBQcmVmYWJJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCB7IHZhbGlkYXRlQXNzZXRVcmwgfSBmcm9tICcuLi91dGlscy9hc3NldC1zYWZldHknO1xuXG5leHBvcnQgY2xhc3MgUHJlZmFiVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmYWJfbGlmZWN5Y2xlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSBwcmVmYWIgbGlmZWN5Y2xlOiBjcmVhdGUsIGluc3RhbnRpYXRlLCB1cGRhdGUsIG9yIGR1cGxpY2F0ZSBwcmVmYWJzLiBVc2UgdGhlIFwiYWN0aW9uXCIgcGFyYW1ldGVyIHRvIHNlbGVjdCB0aGUgb3BlcmF0aW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY3JlYXRlJywgJ2luc3RhbnRpYXRlJywgJ3VwZGF0ZScsICdkdXBsaWNhdGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtOiBcImNyZWF0ZVwiIC0gY3JlYXRlIGEgcHJlZmFiIGZyb20gYSBub2RlLCBcImluc3RhbnRpYXRlXCIgLSBpbnN0YW50aWF0ZSBhIHByZWZhYiBpbiB0aGUgc2NlbmUsIFwidXBkYXRlXCIgLSB1cGRhdGUgYW4gZXhpc3RpbmcgcHJlZmFiLCBcImR1cGxpY2F0ZVwiIC0gZHVwbGljYXRlIGFuIGV4aXN0aW5nIHByZWZhYidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCAodXNlZCBieTogaW5zdGFudGlhdGUsIHVwZGF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBub2RlIFVVSUQgKHVzZWQgYnk6IGNyZWF0ZSwgdXBkYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGF0aCB0byBzYXZlIHRoZSBwcmVmYWIsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9NeVByZWZhYi5wcmVmYWIgKHVzZWQgYnk6IGNyZWF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIG5hbWUgKHVzZWQgYnk6IGNyZWF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRCAodXNlZCBieTogaW5zdGFudGlhdGUsIG9wdGlvbmFsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5pdGlhbCBwb3NpdGlvbiAodXNlZCBieTogaW5zdGFudGlhdGUsIG9wdGlvbmFsKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBwcmVmYWIgcGF0aCAodXNlZCBieTogZHVwbGljYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRQcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgcHJlZmFiIHBhdGggKHVzZWQgYnk6IGR1cGxpY2F0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UHJlZmFiTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmV3IHByZWZhYiBuYW1lICh1c2VkIGJ5OiBkdXBsaWNhdGUsIG9wdGlvbmFsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmYWJfcXVlcnknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgcHJlZmFiIGluZm9ybWF0aW9uOiBnZXQgYSBsaXN0IG9mIHByZWZhYnMsIGxvYWQgYSBwcmVmYWIsIGdldCBkZXRhaWxlZCBpbmZvLCBvciB2YWxpZGF0ZSBhIHByZWZhYiBmaWxlLiBVc2UgdGhlIFwiYWN0aW9uXCIgcGFyYW1ldGVyIHRvIHNlbGVjdCB0aGUgb3BlcmF0aW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2xpc3QnLCAnbG9hZCcsICdnZXRfaW5mbycsICd2YWxpZGF0ZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWN0aW9uIHRvIHBlcmZvcm06IFwiZ2V0X2xpc3RcIiAtIGdldCBhbGwgcHJlZmFicyBpbiB0aGUgcHJvamVjdCwgXCJsb2FkXCIgLSBsb2FkIGEgcHJlZmFiIGJ5IHBhdGgsIFwiZ2V0X2luZm9cIiAtIGdldCBkZXRhaWxlZCBwcmVmYWIgaW5mb3JtYXRpb24sIFwidmFsaWRhdGVcIiAtIHZhbGlkYXRlIGEgcHJlZmFiIGZpbGUgZm9ybWF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBwYXRoICh1c2VkIGJ5OiBsb2FkLCBnZXRfaW5mbywgdmFsaWRhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9sZGVyIHBhdGggdG8gc2VhcmNoICh1c2VkIGJ5OiBnZXRfbGlzdCwgb3B0aW9uYWwsIGRlZmF1bHQ6IGRiOi8vYXNzZXRzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ByZWZhYl9pbnN0YW5jZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgcHJlZmFiIGluc3RhbmNlczogcmV2ZXJ0IGEgcHJlZmFiIGluc3RhbmNlIHRvIGl0cyBvcmlnaW5hbCBzdGF0ZSBvciByZXN0b3JlIGEgcHJlZmFiIG5vZGUgdXNpbmcgYSBwcmVmYWIgYXNzZXQuIFVzZSB0aGUgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc2VsZWN0IHRoZSBvcGVyYXRpb24uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydyZXZlcnQnLCAncmVzdG9yZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWN0aW9uIHRvIHBlcmZvcm06IFwicmV2ZXJ0XCIgLSByZXZlcnQgcHJlZmFiIGluc3RhbmNlIHRvIG9yaWdpbmFsLCBcInJlc3RvcmVcIiAtIHJlc3RvcmUgcHJlZmFiIG5vZGUgdXNpbmcgcHJlZmFiIGFzc2V0IChidWlsdC1pbiB1bmRvIHJlY29yZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQgKHVzZWQgYnk6IHJldmVydCwgcmVzdG9yZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCAodXNlZCBieTogcmVzdG9yZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncHJlZmFiX2xpZmVjeWNsZSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2luc3RhbnRpYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmluc3RhbnRpYXRlUHJlZmFiKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudXBkYXRlUHJlZmFiKGFyZ3MucHJlZmFiUGF0aCwgYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kdXBsaWNhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBwcmVmYWJfbGlmZWN5Y2xlOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3ByZWZhYl9xdWVyeSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByZWZhYkxpc3QoYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdsb2FkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxvYWRQcmVmYWIoYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJlZmFiSW5mbyhhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZVByZWZhYihhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgcHJlZmFiX3F1ZXJ5OiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3ByZWZhYl9pbnN0YW5jZSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JldmVydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXZlcnRQcmVmYWIoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc3RvcmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzdG9yZVByZWZhYk5vZGUoYXJncy5ub2RlVXVpZCwgYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgcHJlZmFiX2luc3RhbmNlOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByZWZhYkxpc3QoZm9sZGVyOiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwYXR0ZXJuID0gZm9sZGVyLmVuZHNXaXRoKCcvJykgP1xuICAgICAgICAgICAgICAgIGAke2ZvbGRlcn0qKi8qLnByZWZhYmAgOiBgJHtmb2xkZXJ9LyoqLyoucHJlZmFiYDtcblxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywge1xuICAgICAgICAgICAgICAgIHBhdHRlcm46IHBhdHRlcm5cbiAgICAgICAgICAgIH0pLnRoZW4oKHJlc3VsdHM6IGFueVtdKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiczogUHJlZmFiSW5mb1tdID0gcmVzdWx0cy5tYXAoYXNzZXQgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogYXNzZXQudXJsLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IGFzc2V0LnVybC5zdWJzdHJpbmcoMCwgYXNzZXQudXJsLmxhc3RJbmRleE9mKCcvJykpXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBwcmVmYWJzIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGxvYWRQcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gXCJMb2FkXCIgaGVyZSBqdXN0IHJlc29sdmVzIHRoZSBwcmVmYWIgYXNzZXQgbWV0YWRhdGEg4oCUIG5vIHNjZW5lLXNpZGVcbiAgICAgICAgLy8gbG9hZCBtZXNzYWdlIGV4aXN0cyBpbiBDb2NvcyAzLjgueC4gVXNlIGFzc2V0LWRiIGRpcmVjdGx5LlxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBwcmVmYWJQYXRoKS50aGVuKChhc3NldEluZm86IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXRJbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldEluZm8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgYXNzZXQgcmVzb2x2ZWQnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbnN0YW50aWF0ZVByZWZhYihhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MucHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjcmVhdGVOb2RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRJbmZvLnV1aWRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChhcmdzLnBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5wYXJlbnQgPSBhcmdzLnBhcmVudFV1aWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcmdzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5uYW1lID0gYXJncy5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3NldEluZm8ubmFtZSkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLm5hbWUgPSBhc3NldEluZm8ubmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFyZ3MucG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5kdW1wID0ge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGFyZ3MucG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLW5vZGUnLCBjcmVhdGVOb2RlT3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gQXJyYXkuaXNBcnJheShub2RlVXVpZCkgPyBub2RlVXVpZFswXSA6IG5vZGVVdWlkO1xuXG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgUHJlZmFiIG5vZGUgY3JlYXRlZCBzdWNjZXNzZnVsbHk6ICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIHByZWZhYlV1aWQ6IGFzc2V0SW5mby51dWlkLFxuICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aFxuICAgICAgICAgICAgfSl9YCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBhcmdzLnByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IGFyZ3MucGFyZW50VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGFyZ3MucG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgaW5zdGFudGlhdGVkIHN1Y2Nlc3NmdWxseSwgcHJlZmFiIGFzc29jaWF0aW9uIGVzdGFibGlzaGVkJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgUHJlZmFiIGluc3RhbnRpYXRpb24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdQbGVhc2UgY2hlY2sgdGhhdCB0aGUgcHJlZmFiIHBhdGggaXMgY29ycmVjdCBhbmQgdGhlIHByZWZhYiBmaWxlIGZvcm1hdCBpcyB2YWxpZCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVByZWZhYihhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBwYXRoUGFyYW0gPSBhcmdzLnByZWZhYlBhdGggfHwgYXJncy5zYXZlUGF0aDtcbiAgICAgICAgaWYgKCFwYXRoUGFyYW0pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdNaXNzaW5nIHByZWZhYiBwYXRoIHBhcmFtZXRlci4gUGxlYXNlIHByb3ZpZGUgcHJlZmFiUGF0aCBvciBzYXZlUGF0aC4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJncy5ub2RlVXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbm9kZVV1aWQgaXMgcmVxdWlyZWQnIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gYXJncy5wcmVmYWJOYW1lIHx8ICdOZXdQcmVmYWInO1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGhQYXJhbS5lbmRzV2l0aCgnLnByZWZhYicpID9cbiAgICAgICAgICAgIHBhdGhQYXJhbSA6IGAke3BhdGhQYXJhbX0vJHtwcmVmYWJOYW1lfS5wcmVmYWJgO1xuXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVByZWZhYlZpYUVuZ2luZShhcmdzLm5vZGVVdWlkLCBmdWxsUGF0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZWdhdGUgdG8gdGhlIGVuZ2luZSdzIFByZWZhYk1hbmFnZXIuY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSB2aWEgc2NlbmUtc2NyaXB0LlxuICAgICAqIFJlcGxpY2F0ZXMgdGhlIGVkaXRvcidzIFwiZHJhZyBub2RlIHRvIEFzc2V0c1wiIGZsb3cg4oCUIGhhbmRsZXMgc2NyaXB0IGNvbXBvbmVudFxuICAgICAqIF9fdHlwZV9fIGNvbXByZXNzaW9uLCBAcHJvcGVydHkgcmVmIHNlcmlhbGl6YXRpb24sIGFuZCBzb3VyY2Utbm9kZSByZWxpbmtpbmcuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVQcmVmYWJWaWFFbmdpbmUobm9kZVV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NyZWF0ZVByZWZhYkZyb21Ob2RlJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIHByZWZhYlBhdGhdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0Py5lcnJvciB8fCAnVW5rbm93biBlbmdpbmUgZXJyb3InIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnUHJlZmFiIGNyZWF0ZWQgYnV0IGZhaWxlZCBwb3N0LW9wIHZhbGlkYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IC4uLnJlc3VsdC5kYXRhLCBwYXRoOiBwcmVmYWJQYXRoLCBpc3N1ZXM6IHZhbGlkYXRpb24uaXNzdWVzIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAuLi5yZXN1bHQuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydGVkVG9QcmVmYWJJbnN0YW5jZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiB2YWxpZGF0aW9uLm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50OiB2YWxpZGF0aW9uLmNvbXBvbmVudENvdW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgY3JlYXRlZCB2aWEgZW5naW5lIFByZWZhYk1hbmFnZXInXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBvc3Qtb3Agc2FuaXR5IGNoZWNrIG9uIGEgbmV3bHkgY3JlYXRlZCBwcmVmYWIuIENhdGNoZXMgc2VtYW50aWMgY29ycnVwdGlvblxuICAgICAqIHRoYXQgdGhlIGVuZ2luZSBjYWxsIHJlcG9ydHMgYXMgc3VjY2VzcyDigJQgdGhlIGNsYXNzIG9mIGJ1ZyB0aGF0IG1vdGl2YXRlZFxuICAgICAqIHRoZSBtb3ZlIG9mZiB0aGUgbGVnYWN5IGhhbmQtc3ludGggcGlwZWxpbmUuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyB2ZXJpZnlQcmVmYWJPdXRwdXQocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IGlzVmFsaWQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW107IG5vZGVDb3VudDogbnVtYmVyOyBjb21wb25lbnRDb3VudDogbnVtYmVyIH0+IHtcbiAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlza1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWRpc2tQYXRoIHx8IHR5cGVvZiBkaXNrUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgQ291bGQgbm90IHJlc29sdmUgZGlzayBwYXRoIGZvciAke3ByZWZhYlBhdGh9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50OiAwLCBjb21wb25lbnRDb3VudDogMCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhkaXNrUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gdGhpcy52YWxpZGF0ZVByZWZhYkZvcm1hdChkYXRhKTtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKC4uLmZvcm1hdC5pc3N1ZXMpO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWRVdWlkID0gL15bMC05YS1mXXs1fVtBLVphLXowLTkrL117MTh9JC87XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvYmogb2YgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ID0gb2JqPy5fX3R5cGVfXztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0ICE9PSAnc3RyaW5nJyB8fCB0LnN0YXJ0c1dpdGgoJ2NjLicpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9va3NMaWtlQ29tcG9uZW50ID0gb2JqLm5vZGUgJiYgdHlwZW9mIG9iai5ub2RlID09PSAnb2JqZWN0JyAmJiAnX19pZF9fJyBpbiBvYmoubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb2tzTGlrZUNvbXBvbmVudCAmJiAhY29tcHJlc3NlZFV1aWQudGVzdCh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goYENvbXBvbmVudCBoYXMgY2xhc3MtbmFtZSBfX3R5cGVfXyBcIiR7dH1cIiAoZXhwZWN0ZWQgY29tcHJlc3NlZCBVVUlEKS4gVGhpcyBpbmRpY2F0ZXMgdGhlIGVuZ2luZSBzZXJpYWxpemVyIHJldHVybmVkIGFuIHVucmVnaXN0ZXJlZCBzY3JpcHQg4oCUIGVuc3VyZSB0aGUgY2xhc3MgaXMgZGVjb3JhdGVkIHdpdGggQGNjY2xhc3MgYW5kIHRoZSBzY3JpcHQgaXMgcmVpbXBvcnRlZC5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBpc1ZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgICAgICBub2RlQ291bnQ6IGZvcm1hdC5ub2RlQ291bnQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IGZvcm1hdC5jb21wb25lbnRDb3VudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBGYWlsZWQgdG8gcmVhZC9wYXJzZSBwcmVmYWIgZm9yIHZhbGlkYXRpb246ICR7ZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpfWApO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50OiAwLCBjb21wb25lbnRDb3VudDogMCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nLCBub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCkudGhlbigoYXNzZXRJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnYXBwbHktcHJlZmFiJywge1xuICAgICAgICAgICAgICAgICAgICBub2RlOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcHJlZmFiOiBhc3NldEluZm8udXVpZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgdXBkYXRlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmV2ZXJ0UHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBObyBwdWJsaWMgXCJyZXZlcnQtcHJlZmFiXCIgbWVzc2FnZSBleGlzdHM7IGRlbGVnYXRlIHRvIHRoZSBlbmdpbmUnc1xuICAgICAgICAvLyBQcmVmYWJNYW5hZ2VyIHZpYSBzY2VuZS1zY3JpcHQgKHNhbWUgY2hhbm5lbCB1c2VkIGJ5IGNyZWF0ZVByZWZhYlZpYUVuZ2luZSkuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdyZXZlcnRQcmVmYWJJbnN0YW5jZScsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXBwbGllZCA9IHJlc3VsdC5kYXRhPy5hcHBsaWVkICE9PSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXBwbGllZCA/ICdQcmVmYWIgaW5zdGFuY2UgcmV2ZXJ0ZWQgc3VjY2Vzc2Z1bGx5JyA6ICdObyBvdmVycmlkZXMgdG8gcmV2ZXJ0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdD8uZXJyb3IgfHwgJ1Vua25vd24gZW5naW5lIGVycm9yJyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiSW5mbyhwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBwcmVmYWJQYXRoKS50aGVuKChhc3NldEluZm86IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgYXNzZXRJbmZvLnV1aWQpO1xuICAgICAgICAgICAgfSkudGhlbigobWV0YUluZm86IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZm86IFByZWZhYkluZm8gPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1ldGFJbmZvLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG1ldGFJbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlcjogcHJlZmFiUGF0aC5zdWJzdHJpbmcoMCwgcHJlZmFiUGF0aC5sYXN0SW5kZXhPZignLycpKSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlVGltZTogbWV0YUluZm8uY3JlYXRlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5VGltZTogbWV0YUluZm8ubW9kaWZ5VGltZSxcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzOiBtZXRhSW5mby5kZXBlbmRzIHx8IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaW5mbyB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1ByZWZhYiBmaWxlIGRvZXMgbm90IGV4aXN0JyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy52ZXJpZnlQcmVmYWJPdXRwdXQocHJlZmFiUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpc1ZhbGlkOiByZXN1bHQuaXNWYWxpZCxcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiByZXN1bHQuaXNzdWVzLFxuICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHJlc3VsdC5ub2RlQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50OiByZXN1bHQuY29tcG9uZW50Q291bnQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5pc1ZhbGlkID8gJ1ByZWZhYiBmb3JtYXQgaXMgdmFsaWQnIDogJ1ByZWZhYiBmb3JtYXQgaGFzIGlzc3VlcydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRXJyb3Igb2NjdXJyZWQgd2hpbGUgdmFsaWRhdGluZyBwcmVmYWI6ICR7ZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVQcmVmYWJGb3JtYXQocHJlZmFiRGF0YTogYW55KTogeyBpc1ZhbGlkOiBib29sZWFuOyBpc3N1ZXM6IHN0cmluZ1tdOyBub2RlQ291bnQ6IG51bWJlcjsgY29tcG9uZW50Q291bnQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgbm9kZUNvdW50ID0gMDtcbiAgICAgICAgbGV0IGNvbXBvbmVudENvdW50ID0gMDtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJlZmFiRGF0YSkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgZGF0YSBtdXN0IGJlIGluIGFycmF5IGZvcm1hdCcpO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50LCBjb21wb25lbnRDb3VudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZWZhYkRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIGRhdGEgaXMgZW1wdHknKTtcbiAgICAgICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCBpc3N1ZXMsIG5vZGVDb3VudCwgY29tcG9uZW50Q291bnQgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpcnN0RWxlbWVudCA9IHByZWZhYkRhdGFbMF07XG4gICAgICAgIGlmICghZmlyc3RFbGVtZW50IHx8IGZpcnN0RWxlbWVudC5fX3R5cGVfXyAhPT0gJ2NjLlByZWZhYicpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdGaXJzdCBlbGVtZW50IG11c3QgYmUgY2MuUHJlZmFiIHR5cGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZWZhYkRhdGEuZm9yRWFjaCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS5fX3R5cGVfXyA9PT0gJ2NjLk5vZGUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZUNvdW50Kys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uX190eXBlX18gJiYgaXRlbS5fX3R5cGVfXy5pbmNsdWRlcygnY2MuJykpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobm9kZUNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgbm9kZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICBpc3N1ZXMsXG4gICAgICAgICAgICBub2RlQ291bnQsXG4gICAgICAgICAgICBjb21wb25lbnRDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZHVwbGljYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHNvdXJjZVByZWZhYlBhdGgsIHRhcmdldFByZWZhYlBhdGgsIG5ld1ByZWZhYk5hbWUgfSA9IGFyZ3M7XG5cbiAgICAgICAgICAgIGlmICghc291cmNlUHJlZmFiUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3NvdXJjZVByZWZhYlBhdGggaXMgcmVxdWlyZWQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSB0YXJnZXRQcmVmYWJQYXRoO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5ld1ByZWZhYk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRWl0aGVyIHRhcmdldFByZWZhYlBhdGggb3IgbmV3UHJlZmFiTmFtZSBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdFNsYXNoID0gc291cmNlUHJlZmFiUGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IGxhc3RTbGFzaCA+PSAwID8gc291cmNlUHJlZmFiUGF0aC5zdWJzdHJpbmcoMCwgbGFzdFNsYXNoKSA6ICdkYjovL2Fzc2V0cyc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IG5ld1ByZWZhYk5hbWUuZW5kc1dpdGgoJy5wcmVmYWInKSA/IG5ld1ByZWZhYk5hbWUgOiBgJHtuZXdQcmVmYWJOYW1lfS5wcmVmYWJgO1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IGAke2Rpcn0vJHtuYW1lfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWxpZGF0ZWRTb3VyY2U6IHN0cmluZztcbiAgICAgICAgICAgIGxldCB2YWxpZGF0ZWRUYXJnZXQ6IHN0cmluZztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGVkU291cmNlID0gdmFsaWRhdGVBc3NldFVybChzb3VyY2VQcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZWRUYXJnZXQgPSB2YWxpZGF0ZUFzc2V0VXJsKHRhcmdldCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjb3B5LWFzc2V0JywgdmFsaWRhdGVkU291cmNlLCB2YWxpZGF0ZWRUYXJnZXQsIHtcbiAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHJlbmFtZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvcHkgZmFpbGVkIOKAlCBlZGl0b3IgcmV0dXJuZWQgbm8gdXVpZCAoc291cmNlPSR7dmFsaWRhdGVkU291cmNlfSB0YXJnZXQ9JHt2YWxpZGF0ZWRUYXJnZXR9KWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGR1cGxpY2F0ZWQgc3VjY2Vzc2Z1bGx5OiAke3ZhbGlkYXRlZFNvdXJjZX0g4oaSICR7cmVzdWx0LnVybCB8fCB2YWxpZGF0ZWRUYXJnZXR9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBFcnJvciBvY2N1cnJlZCB3aGlsZSBjb3B5aW5nIHByZWZhYjogJHtlcnJvcj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWJOb2RlKG5vZGVVdWlkOiBzdHJpbmcsIGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdyZXN0b3JlLXByZWZhYicsIG5vZGVVdWlkLCBhc3NldFV1aWQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGFzc2V0VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgbm9kZSByZXN0b3JlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZXN0b3JlIHByZWZhYiBub2RlOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiJdfQ==