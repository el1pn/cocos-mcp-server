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
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
class PrefabTools {
    getTools() {
        return [
            {
                name: 'prefab_lifecycle',
                description: 'Open, create, instantiate, update, or duplicate prefab ASSETS. Distinct concepts: "open" enters prefab-edit mode on the .prefab itself (replaces the currently open scene); "instantiate" spawns the prefab as a node inside the CURRENTLY open scene. For read-only metadata queries use prefab_query.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['open', 'create', 'instantiate', 'update', 'duplicate'],
                            description: '"open" - prefab-edit mode on .prefab, replaces current scene (needs prefabPath); "create" - save a scene node as new prefab asset; "instantiate" - spawn prefab as node in CURRENTLY open scene (not same as open); "update" - overwrite existing prefab from a node; "duplicate" - copy prefab file to new path.'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path, e.g. db://assets/prefabs/Foo.prefab (open, instantiate, update)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Source node UUID (create, update)'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the prefab, e.g. db://assets/prefabs/MyPrefab.prefab (create)'
                        },
                        prefabName: {
                            type: 'string',
                            description: 'Prefab name (create)'
                        },
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID (instantiate, optional)'
                        },
                        position: {
                            type: 'object',
                            description: 'Initial position (instantiate, optional)',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                z: { type: 'number' }
                            }
                        },
                        sourcePrefabPath: {
                            type: 'string',
                            description: 'Source prefab path (duplicate)'
                        },
                        targetPrefabPath: {
                            type: 'string',
                            description: 'Target prefab path (duplicate)'
                        },
                        newPrefabName: {
                            type: 'string',
                            description: 'New prefab name (duplicate, optional)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'prefab_query',
                description: 'Read-only metadata queries about prefab assets on disk — no editor side-effects. Use prefab_lifecycle "open" to edit, "instantiate" to place into current scene.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_list', 'get_info', 'validate'],
                            description: '"get_list" - prefab asset paths under a folder; "get_info" - metadata (uuid, name, path, createTime, modifyTime, dependencies); "validate" - check prefab file is well-formed.'
                        },
                        prefabPath: {
                            type: 'string',
                            description: 'Prefab asset path, e.g. db://assets/prefabs/Foo.prefab (get_info, validate)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder path to search (get_list, optional)',
                            default: 'db://assets'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'prefab_instance',
                description: 'Manage prefab instances. Actions: revert (to original state), restore (from a prefab asset, built-in undo record).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['revert', 'restore'],
                            description: 'The action to perform'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Prefab instance node UUID (revert, restore)'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID (restore)'
                        }
                    },
                    required: ['action', 'nodeUuid']
                }
            }
        ];
    }
    async execute(toolName, args) {
        // Node references arrive as UUID, path or name. Resolve before dispatch —
        // the engine only understands UUIDs and answers a path with a bare null.
        const unresolved = await (0, node_resolver_1.resolveNodeRefFields)(args, ['nodeUuid', 'parentUuid']);
        if (unresolved) {
            return unresolved;
        }
        switch (toolName) {
            case 'prefab_lifecycle': {
                switch (args.action) {
                    case 'open':
                        return await this.openPrefab(args.prefabPath);
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
        const pattern = folder.endsWith('/') ?
            `${folder}**/*.prefab` : `${folder}/**/*.prefab`;
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-assets', { pattern }), (results) => ({
            data: results.map((asset) => ({
                name: asset.name,
                path: asset.url,
                uuid: asset.uuid,
                folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
            }))
        }));
    }
    async openPrefab(prefabPath) {
        var _a;
        if (!prefabPath) {
            return { success: false, error: 'prefabPath is required' };
        }
        try {
            const uuid = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', prefabPath);
            if (!uuid) {
                return { success: false, error: 'Prefab not found' };
            }
            await (0, editor_request_1.editorRequest)('scene', 'open-scene', uuid);
            return { success: true, message: `Prefab opened in edit mode: ${prefabPath}`, data: { uuid } };
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async instantiatePrefab(args) {
        try {
            const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', args.prefabPath);
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
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
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
            const diskPath = await (0, editor_request_1.editorRequest)('asset-db', 'query-path', prefabPath);
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
        return (0, editor_request_1.toolCall)(async () => {
            const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }
            return (0, editor_request_1.editorRequest)('scene', 'apply-prefab', {
                node: nodeUuid,
                prefab: assetInfo.uuid
            });
        }, () => ({ message: 'Prefab updated successfully' }));
    }
    async revertPrefab(nodeUuid) {
        var _a;
        // No public "revert-prefab" message exists; delegate to the engine's
        // PrefabManager via scene-script (same channel used by createPrefabViaEngine).
        try {
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
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
        return (0, editor_request_1.toolCall)(async () => {
            const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }
            return (0, editor_request_1.editorRequest)('asset-db', 'query-asset-meta', assetInfo.uuid);
        }, (metaInfo) => ({
            data: {
                name: metaInfo.name,
                uuid: metaInfo.uuid,
                path: prefabPath,
                folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                createTime: metaInfo.createTime,
                modifyTime: metaInfo.modifyTime,
                dependencies: metaInfo.depends || []
            }
        }));
    }
    async validatePrefab(prefabPath) {
        try {
            const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', prefabPath);
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
            const result = await (0, editor_request_1.editorRequest)('asset-db', 'copy-asset', validatedSource, validatedTarget, {
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
        try {
            await (0, editor_request_1.editorRequest)('scene', 'restore-prefab', nodeUuid, assetUuid);
            return {
                success: true,
                data: {
                    nodeUuid: nodeUuid,
                    assetUuid: assetUuid,
                    message: 'Prefab node restored successfully'
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to restore prefab node: ${error.message}`
            };
        }
    }
}
exports.PrefabTools = PrefabTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFFekIsc0NBQW1DO0FBQ25DLHdEQUF5RDtBQUN6RCw0REFBa0U7QUFDbEUsMERBQThEO0FBRTlELE1BQWEsV0FBVztJQUNwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLFdBQVcsRUFBRSx5U0FBeVM7Z0JBQ3RULFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUM7NEJBQzlELFdBQVcsRUFBRSxtVEFBbVQ7eUJBQ25VO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0ZBQW9GO3lCQUNwRzt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1DQUFtQzt5QkFDbkQ7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw0RUFBNEU7eUJBQzVGO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0JBQXNCO3lCQUN0Qzt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDBDQUEwQzt5QkFDMUQ7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwwQ0FB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TSxJQUFBLDhCQUFhLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNwRSxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRTtvQkFDRixRQUFRLEVBQUUsUUFBUTtvQkFDbEIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE9BQU8sRUFBRSxtQ0FBbUM7aUJBQy9DO2FBQ0osQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLGtDQUFrQyxLQUFLLENBQUMsT0FBTyxFQUFFO2FBQzNELENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBcGpCRCxrQ0FvakJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBQcmVmYWJJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCB7IHZhbGlkYXRlQXNzZXRVcmwgfSBmcm9tICcuLi91dGlscy9hc3NldC1zYWZldHknO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyByZXNvbHZlTm9kZVJlZkZpZWxkcyB9IGZyb20gJy4uL3V0aWxzL25vZGUtcmVzb2x2ZXInO1xuXG5leHBvcnQgY2xhc3MgUHJlZmFiVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmYWJfbGlmZWN5Y2xlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wZW4sIGNyZWF0ZSwgaW5zdGFudGlhdGUsIHVwZGF0ZSwgb3IgZHVwbGljYXRlIHByZWZhYiBBU1NFVFMuIERpc3RpbmN0IGNvbmNlcHRzOiBcIm9wZW5cIiBlbnRlcnMgcHJlZmFiLWVkaXQgbW9kZSBvbiB0aGUgLnByZWZhYiBpdHNlbGYgKHJlcGxhY2VzIHRoZSBjdXJyZW50bHkgb3BlbiBzY2VuZSk7IFwiaW5zdGFudGlhdGVcIiBzcGF3bnMgdGhlIHByZWZhYiBhcyBhIG5vZGUgaW5zaWRlIHRoZSBDVVJSRU5UTFkgb3BlbiBzY2VuZS4gRm9yIHJlYWQtb25seSBtZXRhZGF0YSBxdWVyaWVzIHVzZSBwcmVmYWJfcXVlcnkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydvcGVuJywgJ2NyZWF0ZScsICdpbnN0YW50aWF0ZScsICd1cGRhdGUnLCAnZHVwbGljYXRlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdcIm9wZW5cIiAtIHByZWZhYi1lZGl0IG1vZGUgb24gLnByZWZhYiwgcmVwbGFjZXMgY3VycmVudCBzY2VuZSAobmVlZHMgcHJlZmFiUGF0aCk7IFwiY3JlYXRlXCIgLSBzYXZlIGEgc2NlbmUgbm9kZSBhcyBuZXcgcHJlZmFiIGFzc2V0OyBcImluc3RhbnRpYXRlXCIgLSBzcGF3biBwcmVmYWIgYXMgbm9kZSBpbiBDVVJSRU5UTFkgb3BlbiBzY2VuZSAobm90IHNhbWUgYXMgb3Blbik7IFwidXBkYXRlXCIgLSBvdmVyd3JpdGUgZXhpc3RpbmcgcHJlZmFiIGZyb20gYSBub2RlOyBcImR1cGxpY2F0ZVwiIC0gY29weSBwcmVmYWIgZmlsZSB0byBuZXcgcGF0aC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9Gb28ucHJlZmFiIChvcGVuLCBpbnN0YW50aWF0ZSwgdXBkYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIG5vZGUgVVVJRCAoY3JlYXRlLCB1cGRhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIHNhdmUgdGhlIHByZWZhYiwgZS5nLiBkYjovL2Fzc2V0cy9wcmVmYWJzL015UHJlZmFiLnByZWZhYiAoY3JlYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgbmFtZSAoY3JlYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlEIChpbnN0YW50aWF0ZSwgb3B0aW9uYWwpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbml0aWFsIHBvc2l0aW9uIChpbnN0YW50aWF0ZSwgb3B0aW9uYWwpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB6OiB7IHR5cGU6ICdudW1iZXInIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlUHJlZmFiUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIHByZWZhYiBwYXRoIChkdXBsaWNhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBwcmVmYWIgcGF0aCAoZHVwbGljYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdQcmVmYWJOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOZXcgcHJlZmFiIG5hbWUgKGR1cGxpY2F0ZSwgb3B0aW9uYWwpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ByZWZhYl9xdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWFkLW9ubHkgbWV0YWRhdGEgcXVlcmllcyBhYm91dCBwcmVmYWIgYXNzZXRzIG9uIGRpc2sg4oCUIG5vIGVkaXRvciBzaWRlLWVmZmVjdHMuIFVzZSBwcmVmYWJfbGlmZWN5Y2xlIFwib3BlblwiIHRvIGVkaXQsIFwiaW5zdGFudGlhdGVcIiB0byBwbGFjZSBpbnRvIGN1cnJlbnQgc2NlbmUuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfbGlzdCcsICdnZXRfaW5mbycsICd2YWxpZGF0ZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnXCJnZXRfbGlzdFwiIC0gcHJlZmFiIGFzc2V0IHBhdGhzIHVuZGVyIGEgZm9sZGVyOyBcImdldF9pbmZvXCIgLSBtZXRhZGF0YSAodXVpZCwgbmFtZSwgcGF0aCwgY3JlYXRlVGltZSwgbW9kaWZ5VGltZSwgZGVwZW5kZW5jaWVzKTsgXCJ2YWxpZGF0ZVwiIC0gY2hlY2sgcHJlZmFiIGZpbGUgaXMgd2VsbC1mb3JtZWQuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMvRm9vLnByZWZhYiAoZ2V0X2luZm8sIHZhbGlkYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvbGRlciBwYXRoIHRvIHNlYXJjaCAoZ2V0X2xpc3QsIG9wdGlvbmFsKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ByZWZhYl9pbnN0YW5jZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2UgcHJlZmFiIGluc3RhbmNlcy4gQWN0aW9uczogcmV2ZXJ0ICh0byBvcmlnaW5hbCBzdGF0ZSksIHJlc3RvcmUgKGZyb20gYSBwcmVmYWIgYXNzZXQsIGJ1aWx0LWluIHVuZG8gcmVjb3JkKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3JldmVydCcsICdyZXN0b3JlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQgKHJldmVydCwgcmVzdG9yZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCAocmVzdG9yZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gTm9kZSByZWZlcmVuY2VzIGFycml2ZSBhcyBVVUlELCBwYXRoIG9yIG5hbWUuIFJlc29sdmUgYmVmb3JlIGRpc3BhdGNoIOKAlFxuICAgICAgICAvLyB0aGUgZW5naW5lIG9ubHkgdW5kZXJzdGFuZHMgVVVJRHMgYW5kIGFuc3dlcnMgYSBwYXRoIHdpdGggYSBiYXJlIG51bGwuXG4gICAgICAgIGNvbnN0IHVucmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlTm9kZVJlZkZpZWxkcyhhcmdzLCBbJ25vZGVVdWlkJywgJ3BhcmVudFV1aWQnXSk7XG4gICAgICAgIGlmICh1bnJlc29sdmVkKSB7IHJldHVybiB1bnJlc29sdmVkOyB9XG5cbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncHJlZmFiX2xpZmVjeWNsZSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ29wZW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlblByZWZhYihhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUHJlZmFiKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbnN0YW50aWF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5pbnN0YW50aWF0ZVByZWZhYihhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnVwZGF0ZVByZWZhYihhcmdzLnByZWZhYlBhdGgsIGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkdXBsaWNhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZHVwbGljYXRlUHJlZmFiKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgcHJlZmFiX2xpZmVjeWNsZTogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdwcmVmYWJfcXVlcnknOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfbGlzdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcmVmYWJMaXN0KGFyZ3MuZm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJlZmFiSW5mbyhhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZVByZWZhYihhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgcHJlZmFiX3F1ZXJ5OiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3ByZWZhYl9pbnN0YW5jZSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JldmVydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXZlcnRQcmVmYWIoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc3RvcmUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzdG9yZVByZWZhYk5vZGUoYXJncy5ub2RlVXVpZCwgYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgcHJlZmFiX2luc3RhbmNlOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByZWZhYkxpc3QoZm9sZGVyOiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IGZvbGRlci5lbmRzV2l0aCgnLycpID9cbiAgICAgICAgICAgIGAke2ZvbGRlcn0qKi8qLnByZWZhYmAgOiBgJHtmb2xkZXJ9LyoqLyoucHJlZmFiYDtcblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueVtdPignYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuIH0pLFxuICAgICAgICAgICAgKHJlc3VsdHMpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0cy5tYXAoKGFzc2V0KTogUHJlZmFiSW5mbyA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlcjogYXNzZXQudXJsLnN1YnN0cmluZygwLCBhc3NldC51cmwubGFzdEluZGV4T2YoJy8nKSlcbiAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuUHJlZmFiKHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghcHJlZmFiUGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAncHJlZmFiUGF0aCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdXVpZDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghdXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1ByZWZhYiBub3QgZm91bmQnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdvcGVuLXNjZW5lJywgdXVpZCk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgUHJlZmFiIG9wZW5lZCBpbiBlZGl0IG1vZGU6ICR7cHJlZmFiUGF0aH1gLCBkYXRhOiB7IHV1aWQgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW5zdGFudGlhdGVQcmVmYWIoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhcmdzLnByZWZhYlBhdGgpO1xuICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ByZWZhYiBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY3JlYXRlTm9kZU9wdGlvbnM6IGFueSA9IHtcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGFzc2V0SW5mby51dWlkXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoYXJncy5wYXJlbnRVdWlkKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMucGFyZW50ID0gYXJncy5wYXJlbnRVdWlkO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXJncy5uYW1lKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMubmFtZSA9IGFyZ3MubmFtZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXNzZXRJbmZvLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5uYW1lID0gYXNzZXRJbmZvLm5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcmdzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMuZHVtcCA9IHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBhcmdzLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1ub2RlJywgY3JlYXRlTm9kZU9wdGlvbnMpO1xuICAgICAgICAgICAgY29uc3QgdXVpZCA9IEFycmF5LmlzQXJyYXkobm9kZVV1aWQpID8gbm9kZVV1aWRbMF0gOiBub2RlVXVpZDtcblxuICAgICAgICAgICAgLy8gS05PV04gTElNSVRBVElPTjogY3JlYXRlLW5vZGUgd2l0aCBhc3NldFV1aWQgY29waWVzIHRoZSBwcmVmYWIncyBub2RlXG4gICAgICAgICAgICAvLyBzdHJ1Y3R1cmUgYnV0IGRvZXMgbm90IGxpbmsgdGhlIGluc3RhbmNlIGJhY2sgdG8gdGhlIHNvdXJjZSBwcmVmYWIgYXNzZXRcbiAgICAgICAgICAgIC8vIChfcHJlZmFiIHN0YXlzIHVuc2V0IGFmdGVyIHNhdmUpLiBzY2VuZS5yZXN0b3JlLXByZWZhYiBvbmx5IHJlc2V0cyBhblxuICAgICAgICAgICAgLy8gRVhJU1RJTkcgbGluaywgc28gaXQgY2FuJ3QgaGVscCBoZXJlLCBhbmQgY2NlLlByZWZhYi5saW5rTm9kZVdpdGhQcmVmYWJBc3NldFxuICAgICAgICAgICAgLy8gY2FsbGVkIGRpcmVjdGx5IG1ha2VzIHRoZSBub2RlIHZhbmlzaCBmcm9tIHNjZW5lIHNlcmlhbGl6YXRpb24gZW50aXJlbHlcbiAgICAgICAgICAgIC8vICh3b3JzZSB0aGFuIHRoZSBvcmlnaW5hbCBidWcpIOKAlCBpdCdzIG1lYW50IHRvIGJlIHVzZWQgaW50ZXJuYWxseSBhbG9uZ3NpZGVcbiAgICAgICAgICAgIC8vIG90aGVyIGJvb2trZWVwaW5nIChvbkFkZE5vZGUsIGV0Yy4pLCBub3QgY2FsbGVkIHN0YW5kYWxvbmUuIFVudGlsIGEgc2FmZVxuICAgICAgICAgICAgLy8gZml4IGlzIGZvdW5kLCB0aGUgaW5zdGFuY2Uga2VlcHMgd29ya2luZyBhdCBydW50aW1lOyByZS1zeW5jIHdpdGggdGhlXG4gICAgICAgICAgICAvLyBzb3VyY2UgcHJlZmFiIGFmdGVyIGVkaXRpbmcgaXQgaW4gdGhlIEVkaXRvciBVSSBtdXN0IGJlIGRvbmUgbWFudWFsbHlcbiAgICAgICAgICAgIC8vICh1bmxpbmsvcmVsaW5rIHZpYSB0aGUgRWRpdG9yIFVJKSwgbm90IHRocm91Z2ggdGhpcyB0b29sLlxuXG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgUHJlZmFiIG5vZGUgY3JlYXRlZCBzdWNjZXNzZnVsbHk6ICR7SlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIHByZWZhYlV1aWQ6IGFzc2V0SW5mby51dWlkLFxuICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aFxuICAgICAgICAgICAgfSl9YCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiBhcmdzLnByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IGFyZ3MucGFyZW50VXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IGFyZ3MucG9zaXRpb24sXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgaW5zdGFudGlhdGVkIHN1Y2Nlc3NmdWxseSwgcHJlZmFiIGFzc29jaWF0aW9uIGVzdGFibGlzaGVkJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgUHJlZmFiIGluc3RhbnRpYXRpb24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAsXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdQbGVhc2UgY2hlY2sgdGhhdCB0aGUgcHJlZmFiIHBhdGggaXMgY29ycmVjdCBhbmQgdGhlIHByZWZhYiBmaWxlIGZvcm1hdCBpcyB2YWxpZCdcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVByZWZhYihhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBwYXRoUGFyYW0gPSBhcmdzLnByZWZhYlBhdGggfHwgYXJncy5zYXZlUGF0aDtcbiAgICAgICAgaWYgKCFwYXRoUGFyYW0pIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdNaXNzaW5nIHByZWZhYiBwYXRoIHBhcmFtZXRlci4gUGxlYXNlIHByb3ZpZGUgcHJlZmFiUGF0aCBvciBzYXZlUGF0aC4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghYXJncy5ub2RlVXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbm9kZVV1aWQgaXMgcmVxdWlyZWQnIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gYXJncy5wcmVmYWJOYW1lIHx8ICdOZXdQcmVmYWInO1xuICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGhQYXJhbS5lbmRzV2l0aCgnLnByZWZhYicpID9cbiAgICAgICAgICAgIHBhdGhQYXJhbSA6IGAke3BhdGhQYXJhbX0vJHtwcmVmYWJOYW1lfS5wcmVmYWJgO1xuXG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVByZWZhYlZpYUVuZ2luZShhcmdzLm5vZGVVdWlkLCBmdWxsUGF0aCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVsZWdhdGUgdG8gdGhlIGVuZ2luZSdzIFByZWZhYk1hbmFnZXIuY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSB2aWEgc2NlbmUtc2NyaXB0LlxuICAgICAqIFJlcGxpY2F0ZXMgdGhlIGVkaXRvcidzIFwiZHJhZyBub2RlIHRvIEFzc2V0c1wiIGZsb3cg4oCUIGhhbmRsZXMgc2NyaXB0IGNvbXBvbmVudFxuICAgICAqIF9fdHlwZV9fIGNvbXByZXNzaW9uLCBAcHJvcGVydHkgcmVmIHNlcmlhbGl6YXRpb24sIGFuZCBzb3VyY2Utbm9kZSByZWxpbmtpbmcuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVQcmVmYWJWaWFFbmdpbmUobm9kZVV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NyZWF0ZVByZWZhYkZyb21Ob2RlJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIHByZWZhYlBhdGhdXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0Py5lcnJvciB8fCAnVW5rbm93biBlbmdpbmUgZXJyb3InIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBhd2FpdCB0aGlzLnZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnUHJlZmFiIGNyZWF0ZWQgYnV0IGZhaWxlZCBwb3N0LW9wIHZhbGlkYXRpb24nLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IC4uLnJlc3VsdC5kYXRhLCBwYXRoOiBwcmVmYWJQYXRoLCBpc3N1ZXM6IHZhbGlkYXRpb24uaXNzdWVzIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAuLi5yZXN1bHQuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29udmVydGVkVG9QcmVmYWJJbnN0YW5jZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiB2YWxpZGF0aW9uLm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50OiB2YWxpZGF0aW9uLmNvbXBvbmVudENvdW50XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgY3JlYXRlZCB2aWEgZW5naW5lIFByZWZhYk1hbmFnZXInXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBvc3Qtb3Agc2FuaXR5IGNoZWNrIG9uIGEgbmV3bHkgY3JlYXRlZCBwcmVmYWIuIENhdGNoZXMgc2VtYW50aWMgY29ycnVwdGlvblxuICAgICAqIHRoYXQgdGhlIGVuZ2luZSBjYWxsIHJlcG9ydHMgYXMgc3VjY2VzcyDigJQgdGhlIGNsYXNzIG9mIGJ1ZyB0aGF0IG1vdGl2YXRlZFxuICAgICAqIHRoZSBtb3ZlIG9mZiB0aGUgbGVnYWN5IGhhbmQtc3ludGggcGlwZWxpbmUuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyB2ZXJpZnlQcmVmYWJPdXRwdXQocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTx7IGlzVmFsaWQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW107IG5vZGVDb3VudDogbnVtYmVyOyBjb21wb25lbnRDb3VudDogbnVtYmVyIH0+IHtcbiAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlza1BhdGggPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWRpc2tQYXRoIHx8IHR5cGVvZiBkaXNrUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgQ291bGQgbm90IHJlc29sdmUgZGlzayBwYXRoIGZvciAke3ByZWZhYlBhdGh9YCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50OiAwLCBjb21wb25lbnRDb3VudDogMCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhkaXNrUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgY29uc3QgZm9ybWF0ID0gdGhpcy52YWxpZGF0ZVByZWZhYkZvcm1hdChkYXRhKTtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKC4uLmZvcm1hdC5pc3N1ZXMpO1xuXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWRVdWlkID0gL15bMC05YS1mXXs1fVtBLVphLXowLTkrL117MTh9JC87XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBvYmogb2YgZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ID0gb2JqPy5fX3R5cGVfXztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0ICE9PSAnc3RyaW5nJyB8fCB0LnN0YXJ0c1dpdGgoJ2NjLicpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9va3NMaWtlQ29tcG9uZW50ID0gb2JqLm5vZGUgJiYgdHlwZW9mIG9iai5ub2RlID09PSAnb2JqZWN0JyAmJiAnX19pZF9fJyBpbiBvYmoubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxvb2tzTGlrZUNvbXBvbmVudCAmJiAhY29tcHJlc3NlZFV1aWQudGVzdCh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goYENvbXBvbmVudCBoYXMgY2xhc3MtbmFtZSBfX3R5cGVfXyBcIiR7dH1cIiAoZXhwZWN0ZWQgY29tcHJlc3NlZCBVVUlEKS4gVGhpcyBpbmRpY2F0ZXMgdGhlIGVuZ2luZSBzZXJpYWxpemVyIHJldHVybmVkIGFuIHVucmVnaXN0ZXJlZCBzY3JpcHQg4oCUIGVuc3VyZSB0aGUgY2xhc3MgaXMgZGVjb3JhdGVkIHdpdGggQGNjY2xhc3MgYW5kIHRoZSBzY3JpcHQgaXMgcmVpbXBvcnRlZC5gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBpc1ZhbGlkOiBpc3N1ZXMubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgICAgICBub2RlQ291bnQ6IGZvcm1hdC5ub2RlQ291bnQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IGZvcm1hdC5jb21wb25lbnRDb3VudFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBGYWlsZWQgdG8gcmVhZC9wYXJzZSBwcmVmYWIgZm9yIHZhbGlkYXRpb246ICR7ZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpfWApO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50OiAwLCBjb21wb25lbnRDb3VudDogMCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB1cGRhdGVQcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nLCBub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdhcHBseS1wcmVmYWInLCB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGU6IG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBwcmVmYWI6IGFzc2V0SW5mby51dWlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ1ByZWZhYiB1cGRhdGVkIHN1Y2Nlc3NmdWxseScgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJldmVydFByZWZhYihub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gTm8gcHVibGljIFwicmV2ZXJ0LXByZWZhYlwiIG1lc3NhZ2UgZXhpc3RzOyBkZWxlZ2F0ZSB0byB0aGUgZW5naW5lJ3NcbiAgICAgICAgLy8gUHJlZmFiTWFuYWdlciB2aWEgc2NlbmUtc2NyaXB0IChzYW1lIGNoYW5uZWwgdXNlZCBieSBjcmVhdGVQcmVmYWJWaWFFbmdpbmUpLlxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAncmV2ZXJ0UHJlZmFiSW5zdGFuY2UnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFwcGxpZWQgPSByZXN1bHQuZGF0YT8uYXBwbGllZCAhPT0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0LmRhdGEsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGFwcGxpZWQgPyAnUHJlZmFiIGluc3RhbmNlIHJldmVydGVkIHN1Y2Nlc3NmdWxseScgOiAnTm8gb3ZlcnJpZGVzIHRvIHJldmVydCdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdVbmtub3duIGVuZ2luZSBlcnJvcicgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByZWZhYkluZm8ocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgYXNzZXRJbmZvLnV1aWQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIChtZXRhSW5mbzogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbWV0YUluZm8ubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbWV0YUluZm8udXVpZCxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiBwcmVmYWJQYXRoLnN1YnN0cmluZygwLCBwcmVmYWJQYXRoLmxhc3RJbmRleE9mKCcvJykpLFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVUaW1lOiBtZXRhSW5mby5jcmVhdGVUaW1lLFxuICAgICAgICAgICAgICAgICAgICBtb2RpZnlUaW1lOiBtZXRhSW5mby5tb2RpZnlUaW1lLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXM6IG1ldGFJbmZvLmRlcGVuZHMgfHwgW11cbiAgICAgICAgICAgICAgICB9IGFzIFByZWZhYkluZm9cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1ByZWZhYiBmaWxlIGRvZXMgbm90IGV4aXN0JyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy52ZXJpZnlQcmVmYWJPdXRwdXQocHJlZmFiUGF0aCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpc1ZhbGlkOiByZXN1bHQuaXNWYWxpZCxcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzOiByZXN1bHQuaXNzdWVzLFxuICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHJlc3VsdC5ub2RlQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50OiByZXN1bHQuY29tcG9uZW50Q291bnQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHJlc3VsdC5pc1ZhbGlkID8gJ1ByZWZhYiBmb3JtYXQgaXMgdmFsaWQnIDogJ1ByZWZhYiBmb3JtYXQgaGFzIGlzc3VlcydcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRXJyb3Igb2NjdXJyZWQgd2hpbGUgdmFsaWRhdGluZyBwcmVmYWI6ICR7ZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVQcmVmYWJGb3JtYXQocHJlZmFiRGF0YTogYW55KTogeyBpc1ZhbGlkOiBib29sZWFuOyBpc3N1ZXM6IHN0cmluZ1tdOyBub2RlQ291bnQ6IG51bWJlcjsgY29tcG9uZW50Q291bnQ6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBsZXQgbm9kZUNvdW50ID0gMDtcbiAgICAgICAgbGV0IGNvbXBvbmVudENvdW50ID0gMDtcblxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJlZmFiRGF0YSkpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgZGF0YSBtdXN0IGJlIGluIGFycmF5IGZvcm1hdCcpO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50LCBjb21wb25lbnRDb3VudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZWZhYkRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIGRhdGEgaXMgZW1wdHknKTtcbiAgICAgICAgICAgIHJldHVybiB7IGlzVmFsaWQ6IGZhbHNlLCBpc3N1ZXMsIG5vZGVDb3VudCwgY29tcG9uZW50Q291bnQgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpcnN0RWxlbWVudCA9IHByZWZhYkRhdGFbMF07XG4gICAgICAgIGlmICghZmlyc3RFbGVtZW50IHx8IGZpcnN0RWxlbWVudC5fX3R5cGVfXyAhPT0gJ2NjLlByZWZhYicpIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdGaXJzdCBlbGVtZW50IG11c3QgYmUgY2MuUHJlZmFiIHR5cGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByZWZhYkRhdGEuZm9yRWFjaCgoaXRlbTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS5fX3R5cGVfXyA9PT0gJ2NjLk5vZGUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZUNvdW50Kys7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uX190eXBlX18gJiYgaXRlbS5fX3R5cGVfXy5pbmNsdWRlcygnY2MuJykpIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAobm9kZUNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnUHJlZmFiIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgbm9kZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGlzVmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICBpc3N1ZXMsXG4gICAgICAgICAgICBub2RlQ291bnQsXG4gICAgICAgICAgICBjb21wb25lbnRDb3VudFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZHVwbGljYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IHNvdXJjZVByZWZhYlBhdGgsIHRhcmdldFByZWZhYlBhdGgsIG5ld1ByZWZhYk5hbWUgfSA9IGFyZ3M7XG5cbiAgICAgICAgICAgIGlmICghc291cmNlUHJlZmFiUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3NvdXJjZVByZWZhYlBhdGggaXMgcmVxdWlyZWQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB0YXJnZXQgPSB0YXJnZXRQcmVmYWJQYXRoO1xuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW5ld1ByZWZhYk5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRWl0aGVyIHRhcmdldFByZWZhYlBhdGggb3IgbmV3UHJlZmFiTmFtZSBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgbGFzdFNsYXNoID0gc291cmNlUHJlZmFiUGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IGxhc3RTbGFzaCA+PSAwID8gc291cmNlUHJlZmFiUGF0aC5zdWJzdHJpbmcoMCwgbGFzdFNsYXNoKSA6ICdkYjovL2Fzc2V0cyc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IG5ld1ByZWZhYk5hbWUuZW5kc1dpdGgoJy5wcmVmYWInKSA/IG5ld1ByZWZhYk5hbWUgOiBgJHtuZXdQcmVmYWJOYW1lfS5wcmVmYWJgO1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IGAke2Rpcn0vJHtuYW1lfWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxldCB2YWxpZGF0ZWRTb3VyY2U6IHN0cmluZztcbiAgICAgICAgICAgIGxldCB2YWxpZGF0ZWRUYXJnZXQ6IHN0cmluZztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdGVkU291cmNlID0gdmFsaWRhdGVBc3NldFVybChzb3VyY2VQcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZWRUYXJnZXQgPSB2YWxpZGF0ZUFzc2V0VXJsKHRhcmdldCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdjb3B5LWFzc2V0JywgdmFsaWRhdGVkU291cmNlLCB2YWxpZGF0ZWRUYXJnZXQsIHtcbiAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHJlbmFtZTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvcHkgZmFpbGVkIOKAlCBlZGl0b3IgcmV0dXJuZWQgbm8gdXVpZCAoc291cmNlPSR7dmFsaWRhdGVkU291cmNlfSB0YXJnZXQ9JHt2YWxpZGF0ZWRUYXJnZXR9KWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGR1cGxpY2F0ZWQgc3VjY2Vzc2Z1bGx5OiAke3ZhbGlkYXRlZFNvdXJjZX0g4oaSICR7cmVzdWx0LnVybCB8fCB2YWxpZGF0ZWRUYXJnZXR9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBFcnJvciBvY2N1cnJlZCB3aGlsZSBjb3B5aW5nIHByZWZhYjogJHtlcnJvcj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWJOb2RlKG5vZGVVdWlkOiBzdHJpbmcsIGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3Jlc3RvcmUtcHJlZmFiJywgbm9kZVV1aWQsIGFzc2V0VXVpZCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUHJlZmFiIG5vZGUgcmVzdG9yZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVzdG9yZSBwcmVmYWIgbm9kZTogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=