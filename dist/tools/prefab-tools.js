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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFFekIsc0NBQW1DO0FBQ25DLHdEQUF5RDtBQUN6RCw0REFBa0U7QUFFbEUsTUFBYSxXQUFXO0lBQ3BCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLHlTQUF5UztnQkFDdFQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQzs0QkFDOUQsV0FBVyxFQUFFLG1UQUFtVDt5QkFDblU7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxvRkFBb0Y7eUJBQ3BHO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUNBQW1DO3lCQUNuRDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDRFQUE0RTt5QkFDNUY7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzQkFBc0I7eUJBQ3RDO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMENBQTBDO3lCQUMxRDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDBDQUEwQzs0QkFDdkQsVUFB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Qy9DO2FBQ0osQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLGtDQUFrQyxLQUFLLENBQUMsT0FBTyxFQUFFO2FBQzNELENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBL2lCRCxrQ0EraUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBQcmVmYWJJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcbmltcG9ydCB7IHZhbGlkYXRlQXNzZXRVcmwgfSBmcm9tICcuLi91dGlscy9hc3NldC1zYWZldHknO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5cbmV4cG9ydCBjbGFzcyBQcmVmYWJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ByZWZhYl9saWZlY3ljbGUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiwgY3JlYXRlLCBpbnN0YW50aWF0ZSwgdXBkYXRlLCBvciBkdXBsaWNhdGUgcHJlZmFiIEFTU0VUUy4gRGlzdGluY3QgY29uY2VwdHM6IFwib3BlblwiIGVudGVycyBwcmVmYWItZWRpdCBtb2RlIG9uIHRoZSAucHJlZmFiIGl0c2VsZiAocmVwbGFjZXMgdGhlIGN1cnJlbnRseSBvcGVuIHNjZW5lKTsgXCJpbnN0YW50aWF0ZVwiIHNwYXducyB0aGUgcHJlZmFiIGFzIGEgbm9kZSBpbnNpZGUgdGhlIENVUlJFTlRMWSBvcGVuIHNjZW5lLiBGb3IgcmVhZC1vbmx5IG1ldGFkYXRhIHF1ZXJpZXMgdXNlIHByZWZhYl9xdWVyeS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ29wZW4nLCAnY3JlYXRlJywgJ2luc3RhbnRpYXRlJywgJ3VwZGF0ZScsICdkdXBsaWNhdGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1wib3BlblwiIC0gcHJlZmFiLWVkaXQgbW9kZSBvbiAucHJlZmFiLCByZXBsYWNlcyBjdXJyZW50IHNjZW5lIChuZWVkcyBwcmVmYWJQYXRoKTsgXCJjcmVhdGVcIiAtIHNhdmUgYSBzY2VuZSBub2RlIGFzIG5ldyBwcmVmYWIgYXNzZXQ7IFwiaW5zdGFudGlhdGVcIiAtIHNwYXduIHByZWZhYiBhcyBub2RlIGluIENVUlJFTlRMWSBvcGVuIHNjZW5lIChub3Qgc2FtZSBhcyBvcGVuKTsgXCJ1cGRhdGVcIiAtIG92ZXJ3cml0ZSBleGlzdGluZyBwcmVmYWIgZnJvbSBhIG5vZGU7IFwiZHVwbGljYXRlXCIgLSBjb3B5IHByZWZhYiBmaWxlIHRvIG5ldyBwYXRoLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9wcmVmYWJzL0Zvby5wcmVmYWIgKG9wZW4sIGluc3RhbnRpYXRlLCB1cGRhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2Ugbm9kZSBVVUlEIChjcmVhdGUsIHVwZGF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhdGggdG8gc2F2ZSB0aGUgcHJlZmFiLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMvTXlQcmVmYWIucHJlZmFiIChjcmVhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYk5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBuYW1lIChjcmVhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIFVVSUQgKGluc3RhbnRpYXRlLCBvcHRpb25hbCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luaXRpYWwgcG9zaXRpb24gKGluc3RhbnRpYXRlLCBvcHRpb25hbCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHo6IHsgdHlwZTogJ251bWJlcicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VQcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2UgcHJlZmFiIHBhdGggKGR1cGxpY2F0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0UHJlZmFiUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IHByZWZhYiBwYXRoIChkdXBsaWNhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1ByZWZhYk5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05ldyBwcmVmYWIgbmFtZSAoZHVwbGljYXRlLCBvcHRpb25hbCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmFiX3F1ZXJ5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlYWQtb25seSBtZXRhZGF0YSBxdWVyaWVzIGFib3V0IHByZWZhYiBhc3NldHMgb24gZGlzayDigJQgbm8gZWRpdG9yIHNpZGUtZWZmZWN0cy4gVXNlIHByZWZhYl9saWZlY3ljbGUgXCJvcGVuXCIgdG8gZWRpdCwgXCJpbnN0YW50aWF0ZVwiIHRvIHBsYWNlIGludG8gY3VycmVudCBzY2VuZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9saXN0JywgJ2dldF9pbmZvJywgJ3ZhbGlkYXRlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdcImdldF9saXN0XCIgLSBwcmVmYWIgYXNzZXQgcGF0aHMgdW5kZXIgYSBmb2xkZXI7IFwiZ2V0X2luZm9cIiAtIG1ldGFkYXRhICh1dWlkLCBuYW1lLCBwYXRoLCBjcmVhdGVUaW1lLCBtb2RpZnlUaW1lLCBkZXBlbmRlbmNpZXMpOyBcInZhbGlkYXRlXCIgLSBjaGVjayBwcmVmYWIgZmlsZSBpcyB3ZWxsLWZvcm1lZC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9Gb28ucHJlZmFiIChnZXRfaW5mbywgdmFsaWRhdGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9sZGVyIHBhdGggdG8gc2VhcmNoIChnZXRfbGlzdCwgb3B0aW9uYWwpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmFiX2luc3RhbmNlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSBwcmVmYWIgaW5zdGFuY2VzLiBBY3Rpb25zOiByZXZlcnQgKHRvIG9yaWdpbmFsIHN0YXRlKSwgcmVzdG9yZSAoZnJvbSBhIHByZWZhYiBhc3NldCwgYnVpbHQtaW4gdW5kbyByZWNvcmQpLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncmV2ZXJ0JywgJ3Jlc3RvcmUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGluc3RhbmNlIG5vZGUgVVVJRCAocmV2ZXJ0LCByZXN0b3JlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBVVUlEIChyZXN0b3JlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJywgJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdwcmVmYWJfbGlmZWN5Y2xlJzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnb3Blbic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5vcGVuUHJlZmFiKGFyZ3MucHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2luc3RhbnRpYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmluc3RhbnRpYXRlUHJlZmFiKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudXBkYXRlUHJlZmFiKGFyZ3MucHJlZmFiUGF0aCwgYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kdXBsaWNhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBwcmVmYWJfbGlmZWN5Y2xlOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3ByZWZhYl9xdWVyeSc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByZWZhYkxpc3QoYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfaW5mbyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcmVmYWJJbmZvKGFyZ3MucHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZhbGlkYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlZmFiKGFyZ3MucHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBwcmVmYWJfcXVlcnk6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncHJlZmFiX2luc3RhbmNlJzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmV2ZXJ0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJldmVydFByZWZhYihhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzdG9yZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXN0b3JlUHJlZmFiTm9kZShhcmdzLm5vZGVVdWlkLCBhcmdzLmFzc2V0VXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBwcmVmYWJfaW5zdGFuY2U6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiTGlzdChmb2xkZXI6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gZm9sZGVyLmVuZHNXaXRoKCcvJykgP1xuICAgICAgICAgICAgYCR7Zm9sZGVyfSoqLyoucHJlZmFiYCA6IGAke2ZvbGRlcn0vKiovKi5wcmVmYWJgO1xuXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55W10+KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm4gfSksXG4gICAgICAgICAgICAocmVzdWx0cykgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHRzLm1hcCgoYXNzZXQpOiBQcmVmYWJJbmZvID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGFzc2V0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiBhc3NldC51cmwuc3Vic3RyaW5nKDAsIGFzc2V0LnVybC5sYXN0SW5kZXhPZignLycpKVxuICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5QcmVmYWIocHJlZmFiUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFwcmVmYWJQYXRoKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdwcmVmYWJQYXRoIGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1dWlkOiBzdHJpbmcgfCBudWxsID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHByZWZhYlBhdGgpO1xuICAgICAgICAgICAgaWYgKCF1dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJlZmFiIG5vdCBmb3VuZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ29wZW4tc2NlbmUnLCB1dWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBQcmVmYWIgb3BlbmVkIGluIGVkaXQgbW9kZTogJHtwcmVmYWJQYXRofWAsIGRhdGE6IHsgdXVpZCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbnN0YW50aWF0ZVByZWZhYihhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MucHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUHJlZmFiIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjcmVhdGVOb2RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRJbmZvLnV1aWRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChhcmdzLnBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5wYXJlbnQgPSBhcmdzLnBhcmVudFV1aWQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChhcmdzLm5hbWUpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5uYW1lID0gYXJncy5uYW1lO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhc3NldEluZm8ubmFtZSkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLm5hbWUgPSBhc3NldEluZm8ubmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFyZ3MucG9zaXRpb24pIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlT3B0aW9ucy5kdW1wID0ge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGFyZ3MucG9zaXRpb25cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLW5vZGUnLCBjcmVhdGVOb2RlT3B0aW9ucyk7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gQXJyYXkuaXNBcnJheShub2RlVXVpZCkgPyBub2RlVXVpZFswXSA6IG5vZGVVdWlkO1xuXG4gICAgICAgICAgICAvLyBLTk9XTiBMSU1JVEFUSU9OOiBjcmVhdGUtbm9kZSB3aXRoIGFzc2V0VXVpZCBjb3BpZXMgdGhlIHByZWZhYidzIG5vZGVcbiAgICAgICAgICAgIC8vIHN0cnVjdHVyZSBidXQgZG9lcyBub3QgbGluayB0aGUgaW5zdGFuY2UgYmFjayB0byB0aGUgc291cmNlIHByZWZhYiBhc3NldFxuICAgICAgICAgICAgLy8gKF9wcmVmYWIgc3RheXMgdW5zZXQgYWZ0ZXIgc2F2ZSkuIHNjZW5lLnJlc3RvcmUtcHJlZmFiIG9ubHkgcmVzZXRzIGFuXG4gICAgICAgICAgICAvLyBFWElTVElORyBsaW5rLCBzbyBpdCBjYW4ndCBoZWxwIGhlcmUsIGFuZCBjY2UuUHJlZmFiLmxpbmtOb2RlV2l0aFByZWZhYkFzc2V0XG4gICAgICAgICAgICAvLyBjYWxsZWQgZGlyZWN0bHkgbWFrZXMgdGhlIG5vZGUgdmFuaXNoIGZyb20gc2NlbmUgc2VyaWFsaXphdGlvbiBlbnRpcmVseVxuICAgICAgICAgICAgLy8gKHdvcnNlIHRoYW4gdGhlIG9yaWdpbmFsIGJ1Zykg4oCUIGl0J3MgbWVhbnQgdG8gYmUgdXNlZCBpbnRlcm5hbGx5IGFsb25nc2lkZVxuICAgICAgICAgICAgLy8gb3RoZXIgYm9va2tlZXBpbmcgKG9uQWRkTm9kZSwgZXRjLiksIG5vdCBjYWxsZWQgc3RhbmRhbG9uZS4gVW50aWwgYSBzYWZlXG4gICAgICAgICAgICAvLyBmaXggaXMgZm91bmQsIHRoZSBpbnN0YW5jZSBrZWVwcyB3b3JraW5nIGF0IHJ1bnRpbWU7IHJlLXN5bmMgd2l0aCB0aGVcbiAgICAgICAgICAgIC8vIHNvdXJjZSBwcmVmYWIgYWZ0ZXIgZWRpdGluZyBpdCBpbiB0aGUgRWRpdG9yIFVJIG11c3QgYmUgZG9uZSBtYW51YWxseVxuICAgICAgICAgICAgLy8gKHVubGluay9yZWxpbmsgdmlhIHRoZSBFZGl0b3IgVUkpLCBub3QgdGhyb3VnaCB0aGlzIHRvb2wuXG5cbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBQcmVmYWIgbm9kZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseTogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgcHJlZmFiVXVpZDogYXNzZXRJbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aDogYXJncy5wcmVmYWJQYXRoXG4gICAgICAgICAgICB9KX1gKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogYXJncy5wYXJlbnRVdWlkLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXJncy5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBpbnN0YW50aWF0ZWQgc3VjY2Vzc2Z1bGx5LCBwcmVmYWIgYXNzb2NpYXRpb24gZXN0YWJsaXNoZWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBQcmVmYWIgaW5zdGFudGlhdGlvbiBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1BsZWFzZSBjaGVjayB0aGF0IHRoZSBwcmVmYWIgcGF0aCBpcyBjb3JyZWN0IGFuZCB0aGUgcHJlZmFiIGZpbGUgZm9ybWF0IGlzIHZhbGlkJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHBhdGhQYXJhbSA9IGFyZ3MucHJlZmFiUGF0aCB8fCBhcmdzLnNhdmVQYXRoO1xuICAgICAgICBpZiAoIXBhdGhQYXJhbSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogJ01pc3NpbmcgcHJlZmFiIHBhdGggcGFyYW1ldGVyLiBQbGVhc2UgcHJvdmlkZSBwcmVmYWJQYXRoIG9yIHNhdmVQYXRoLidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmdzLm5vZGVVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdub2RlVXVpZCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZWZhYk5hbWUgPSBhcmdzLnByZWZhYk5hbWUgfHwgJ05ld1ByZWZhYic7XG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aFBhcmFtLmVuZHNXaXRoKCcucHJlZmFiJykgP1xuICAgICAgICAgICAgcGF0aFBhcmFtIDogYCR7cGF0aFBhcmFtfS8ke3ByZWZhYk5hbWV9LnByZWZhYmA7XG5cbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUHJlZmFiVmlhRW5naW5lKGFyZ3Mubm9kZVV1aWQsIGZ1bGxQYXRoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxlZ2F0ZSB0byB0aGUgZW5naW5lJ3MgUHJlZmFiTWFuYWdlci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIHZpYSBzY2VuZS1zY3JpcHQuXG4gICAgICogUmVwbGljYXRlcyB0aGUgZWRpdG9yJ3MgXCJkcmFnIG5vZGUgdG8gQXNzZXRzXCIgZmxvdyDigJQgaGFuZGxlcyBzY3JpcHQgY29tcG9uZW50XG4gICAgICogX190eXBlX18gY29tcHJlc3Npb24sIEBwcm9wZXJ0eSByZWYgc2VyaWFsaXphdGlvbiwgYW5kIHNvdXJjZS1ub2RlIHJlbGlua2luZy5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVByZWZhYlZpYUVuZ2luZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnY3JlYXRlUHJlZmFiRnJvbU5vZGUnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgcHJlZmFiUGF0aF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdVbmtub3duIGVuZ2luZSBlcnJvcicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IGF3YWl0IHRoaXMudmVyaWZ5UHJlZmFiT3V0cHV0KHByZWZhYlBhdGgpO1xuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdQcmVmYWIgY3JlYXRlZCBidXQgZmFpbGVkIHBvc3Qtb3AgdmFsaWRhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgLi4ucmVzdWx0LmRhdGEsIHBhdGg6IHByZWZhYlBhdGgsIGlzc3VlczogdmFsaWRhdGlvbi5pc3N1ZXMgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLnJlc3VsdC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRUb1ByZWZhYkluc3RhbmNlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHZhbGlkYXRpb24ubm9kZUNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHZhbGlkYXRpb24uY29tcG9uZW50Q291bnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBjcmVhdGVkIHZpYSBlbmdpbmUgUHJlZmFiTWFuYWdlcidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUG9zdC1vcCBzYW5pdHkgY2hlY2sgb24gYSBuZXdseSBjcmVhdGVkIHByZWZhYi4gQ2F0Y2hlcyBzZW1hbnRpYyBjb3JydXB0aW9uXG4gICAgICogdGhhdCB0aGUgZW5naW5lIGNhbGwgcmVwb3J0cyBhcyBzdWNjZXNzIOKAlCB0aGUgY2xhc3Mgb2YgYnVnIHRoYXQgbW90aXZhdGVkXG4gICAgICogdGhlIG1vdmUgb2ZmIHRoZSBsZWdhY3kgaGFuZC1zeW50aCBwaXBlbGluZS5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHsgaXNWYWxpZDogYm9vbGVhbjsgaXNzdWVzOiBzdHJpbmdbXTsgbm9kZUNvdW50OiBudW1iZXI7IGNvbXBvbmVudENvdW50OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXNrUGF0aCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghZGlza1BhdGggfHwgdHlwZW9mIGRpc2tQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBDb3VsZCBub3QgcmVzb2x2ZSBkaXNrIHBhdGggZm9yICR7cHJlZmFiUGF0aH1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQ6IDAsIGNvbXBvbmVudENvdW50OiAwIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGRpc2tQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLnZhbGlkYXRlUHJlZmFiRm9ybWF0KGRhdGEpO1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goLi4uZm9ybWF0Lmlzc3Vlcyk7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZFV1aWQgPSAvXlswLTlhLWZdezV9W0EtWmEtejAtOSsvXXsxOH0kLztcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9iaiBvZiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBvYmo/Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHQgIT09ICdzdHJpbmcnIHx8IHQuc3RhcnRzV2l0aCgnY2MuJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb29rc0xpa2VDb21wb25lbnQgPSBvYmoubm9kZSAmJiB0eXBlb2Ygb2JqLm5vZGUgPT09ICdvYmplY3QnICYmICdfX2lkX18nIGluIG9iai5ub2RlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9va3NMaWtlQ29tcG9uZW50ICYmICFjb21wcmVzc2VkVXVpZC50ZXN0KHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgQ29tcG9uZW50IGhhcyBjbGFzcy1uYW1lIF9fdHlwZV9fIFwiJHt0fVwiIChleHBlY3RlZCBjb21wcmVzc2VkIFVVSUQpLiBUaGlzIGluZGljYXRlcyB0aGUgZW5naW5lIHNlcmlhbGl6ZXIgcmV0dXJuZWQgYW4gdW5yZWdpc3RlcmVkIHNjcmlwdCDigJQgZW5zdXJlIHRoZSBjbGFzcyBpcyBkZWNvcmF0ZWQgd2l0aCBAY2NjbGFzcyBhbmQgdGhlIHNjcmlwdCBpcyByZWltcG9ydGVkLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICAgICAgaXNzdWVzLFxuICAgICAgICAgICAgICAgIG5vZGVDb3VudDogZm9ybWF0Lm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRDb3VudDogZm9ybWF0LmNvbXBvbmVudENvdW50XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goYEZhaWxlZCB0byByZWFkL3BhcnNlIHByZWZhYiBmb3IgdmFsaWRhdGlvbjogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCk7XG4gICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQ6IDAsIGNvbXBvbmVudENvdW50OiAwIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcsIG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2FwcGx5LXByZWZhYicsIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYjogYXNzZXRJbmZvLnV1aWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnUHJlZmFiIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmV2ZXJ0UHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBObyBwdWJsaWMgXCJyZXZlcnQtcHJlZmFiXCIgbWVzc2FnZSBleGlzdHM7IGRlbGVnYXRlIHRvIHRoZSBlbmdpbmUnc1xuICAgICAgICAvLyBQcmVmYWJNYW5hZ2VyIHZpYSBzY2VuZS1zY3JpcHQgKHNhbWUgY2hhbm5lbCB1c2VkIGJ5IGNyZWF0ZVByZWZhYlZpYUVuZ2luZSkuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdyZXZlcnRQcmVmYWJJbnN0YW5jZScsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXBwbGllZCA9IHJlc3VsdC5kYXRhPy5hcHBsaWVkICE9PSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXBwbGllZCA/ICdQcmVmYWIgaW5zdGFuY2UgcmV2ZXJ0ZWQgc3VjY2Vzc2Z1bGx5JyA6ICdObyBvdmVycmlkZXMgdG8gcmV2ZXJ0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdD8uZXJyb3IgfHwgJ1Vua25vd24gZW5naW5lIGVycm9yJyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiSW5mbyhwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCBhc3NldEluZm8udXVpZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKG1ldGFJbmZvOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtZXRhSW5mby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBtZXRhSW5mby51dWlkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHByZWZhYlBhdGguc3Vic3RyaW5nKDAsIHByZWZhYlBhdGgubGFzdEluZGV4T2YoJy8nKSksXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVRpbWU6IG1ldGFJbmZvLmNyZWF0ZVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmeVRpbWU6IG1ldGFJbmZvLm1vZGlmeVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llczogbWV0YUluZm8uZGVwZW5kcyB8fCBbXVxuICAgICAgICAgICAgICAgIH0gYXMgUHJlZmFiSW5mb1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlZmFiKHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm86IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJlZmFiIGZpbGUgZG9lcyBub3QgZXhpc3QnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHJlc3VsdC5pc1ZhbGlkLFxuICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IHJlc3VsdC5pc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogcmVzdWx0Lm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHJlc3VsdC5jb21wb25lbnRDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVzdWx0LmlzVmFsaWQgPyAnUHJlZmFiIGZvcm1hdCBpcyB2YWxpZCcgOiAnUHJlZmFiIGZvcm1hdCBoYXMgaXNzdWVzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBFcnJvciBvY2N1cnJlZCB3aGlsZSB2YWxpZGF0aW5nIHByZWZhYjogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZVByZWZhYkZvcm1hdChwcmVmYWJEYXRhOiBhbnkpOiB7IGlzVmFsaWQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW107IG5vZGVDb3VudDogbnVtYmVyOyBjb21wb25lbnRDb3VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBub2RlQ291bnQgPSAwO1xuICAgICAgICBsZXQgY29tcG9uZW50Q291bnQgPSAwO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcmVmYWJEYXRhKSkge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goJ1ByZWZhYiBkYXRhIG11c3QgYmUgaW4gYXJyYXkgZm9ybWF0Jyk7XG4gICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQsIGNvbXBvbmVudENvdW50IH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJlZmFiRGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgZGF0YSBpcyBlbXB0eScpO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50LCBjb21wb25lbnRDb3VudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlyc3RFbGVtZW50ID0gcHJlZmFiRGF0YVswXTtcbiAgICAgICAgaWYgKCFmaXJzdEVsZW1lbnQgfHwgZmlyc3RFbGVtZW50Ll9fdHlwZV9fICE9PSAnY2MuUHJlZmFiJykge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goJ0ZpcnN0IGVsZW1lbnQgbXVzdCBiZSBjYy5QcmVmYWIgdHlwZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlZmFiRGF0YS5mb3JFYWNoKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLl9fdHlwZV9fID09PSAnY2MuTm9kZScpIHtcbiAgICAgICAgICAgICAgICBub2RlQ291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5fX3R5cGVfXyAmJiBpdGVtLl9fdHlwZV9fLmluY2x1ZGVzKCdjYy4nKSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChub2RlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBub2RlJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaXNWYWxpZDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgIG5vZGVDb3VudCxcbiAgICAgICAgICAgIGNvbXBvbmVudENvdW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkdXBsaWNhdGVQcmVmYWIoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgc291cmNlUHJlZmFiUGF0aCwgdGFyZ2V0UHJlZmFiUGF0aCwgbmV3UHJlZmFiTmFtZSB9ID0gYXJncztcblxuICAgICAgICAgICAgaWYgKCFzb3VyY2VQcmVmYWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc291cmNlUHJlZmFiUGF0aCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRhcmdldFByZWZhYlBhdGg7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIGlmICghbmV3UHJlZmFiTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdFaXRoZXIgdGFyZ2V0UHJlZmFiUGF0aCBvciBuZXdQcmVmYWJOYW1lIGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0U2xhc2ggPSBzb3VyY2VQcmVmYWJQYXRoLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyID0gbGFzdFNsYXNoID49IDAgPyBzb3VyY2VQcmVmYWJQYXRoLnN1YnN0cmluZygwLCBsYXN0U2xhc2gpIDogJ2RiOi8vYXNzZXRzJztcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gbmV3UHJlZmFiTmFtZS5lbmRzV2l0aCgnLnByZWZhYicpID8gbmV3UHJlZmFiTmFtZSA6IGAke25ld1ByZWZhYk5hbWV9LnByZWZhYmA7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gYCR7ZGlyfS8ke25hbWV9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbGlkYXRlZFNvdXJjZTogc3RyaW5nO1xuICAgICAgICAgICAgbGV0IHZhbGlkYXRlZFRhcmdldDogc3RyaW5nO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZWRTb3VyY2UgPSB2YWxpZGF0ZUFzc2V0VXJsKHNvdXJjZVByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlZFRhcmdldCA9IHZhbGlkYXRlQXNzZXRVcmwodGFyZ2V0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NvcHktYXNzZXQnLCB2YWxpZGF0ZWRTb3VyY2UsIHZhbGlkYXRlZFRhcmdldCwge1xuICAgICAgICAgICAgICAgIG92ZXJ3cml0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC51dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ29weSBmYWlsZWQg4oCUIGVkaXRvciByZXR1cm5lZCBubyB1dWlkIChzb3VyY2U9JHt2YWxpZGF0ZWRTb3VyY2V9IHRhcmdldD0ke3ZhbGlkYXRlZFRhcmdldH0pYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdC51dWlkLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC51cmwsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgZHVwbGljYXRlZCBzdWNjZXNzZnVsbHk6ICR7dmFsaWRhdGVkU291cmNlfSDihpIgJHtyZXN1bHQudXJsIHx8IHZhbGlkYXRlZFRhcmdldH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEVycm9yIG9jY3VycmVkIHdoaWxlIGNvcHlpbmcgcHJlZmFiOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzdG9yZVByZWZhYk5vZGUobm9kZVV1aWQ6IHN0cmluZywgYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVzdG9yZS1wcmVmYWInLCBub2RlVXVpZCwgYXNzZXRVdWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgbm9kZSByZXN0b3JlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZXN0b3JlIHByZWZhYiBub2RlOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==