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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFFekIsc0NBQW1DO0FBQ25DLHdEQUF5RDtBQUN6RCw0REFBa0U7QUFFbEUsTUFBYSxXQUFXO0lBQ3BCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLHlTQUF5UztnQkFDdFQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQzs0QkFDOUQsV0FBVyxFQUFFLG1UQUFtVDt5QkFDblU7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxvRkFBb0Y7eUJBQ3BHO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUNBQW1DO3lCQUNuRDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDRFQUE0RTt5QkFDNUY7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzQkFBc0I7eUJBQ3RDO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMENBQTBDO3lCQUMxRDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDBDQUEwQzs0QkFDdkQsVUFB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Q0FBQztRQUNOLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFwaUJELGtDQW9pQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFByZWZhYkluZm8gfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi9sb2dnZXInO1xuaW1wb3J0IHsgdmFsaWRhdGVBc3NldFVybCB9IGZyb20gJy4uL3V0aWxzL2Fzc2V0LXNhZmV0eSc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuZXhwb3J0IGNsYXNzIFByZWZhYlRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmFiX2xpZmVjeWNsZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcGVuLCBjcmVhdGUsIGluc3RhbnRpYXRlLCB1cGRhdGUsIG9yIGR1cGxpY2F0ZSBwcmVmYWIgQVNTRVRTLiBEaXN0aW5jdCBjb25jZXB0czogXCJvcGVuXCIgZW50ZXJzIHByZWZhYi1lZGl0IG1vZGUgb24gdGhlIC5wcmVmYWIgaXRzZWxmIChyZXBsYWNlcyB0aGUgY3VycmVudGx5IG9wZW4gc2NlbmUpOyBcImluc3RhbnRpYXRlXCIgc3Bhd25zIHRoZSBwcmVmYWIgYXMgYSBub2RlIGluc2lkZSB0aGUgQ1VSUkVOVExZIG9wZW4gc2NlbmUuIEZvciByZWFkLW9ubHkgbWV0YWRhdGEgcXVlcmllcyB1c2UgcHJlZmFiX3F1ZXJ5LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnb3BlbicsICdjcmVhdGUnLCAnaW5zdGFudGlhdGUnLCAndXBkYXRlJywgJ2R1cGxpY2F0ZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnXCJvcGVuXCIgLSBwcmVmYWItZWRpdCBtb2RlIG9uIC5wcmVmYWIsIHJlcGxhY2VzIGN1cnJlbnQgc2NlbmUgKG5lZWRzIHByZWZhYlBhdGgpOyBcImNyZWF0ZVwiIC0gc2F2ZSBhIHNjZW5lIG5vZGUgYXMgbmV3IHByZWZhYiBhc3NldDsgXCJpbnN0YW50aWF0ZVwiIC0gc3Bhd24gcHJlZmFiIGFzIG5vZGUgaW4gQ1VSUkVOVExZIG9wZW4gc2NlbmUgKG5vdCBzYW1lIGFzIG9wZW4pOyBcInVwZGF0ZVwiIC0gb3ZlcndyaXRlIGV4aXN0aW5nIHByZWZhYiBmcm9tIGEgbm9kZTsgXCJkdXBsaWNhdGVcIiAtIGNvcHkgcHJlZmFiIGZpbGUgdG8gbmV3IHBhdGguJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMvRm9vLnByZWZhYiAob3BlbiwgaW5zdGFudGlhdGUsIHVwZGF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBub2RlIFVVSUQgKGNyZWF0ZSwgdXBkYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlUGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGF0aCB0byBzYXZlIHRoZSBwcmVmYWIsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9NeVByZWZhYi5wcmVmYWIgKGNyZWF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIG5hbWUgKGNyZWF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRCAoaW5zdGFudGlhdGUsIG9wdGlvbmFsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5pdGlhbCBwb3NpdGlvbiAoaW5zdGFudGlhdGUsIG9wdGlvbmFsKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgejogeyB0eXBlOiAnbnVtYmVyJyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVByZWZhYlBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBwcmVmYWIgcGF0aCAoZHVwbGljYXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRQcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgcHJlZmFiIHBhdGggKGR1cGxpY2F0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3UHJlZmFiTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmV3IHByZWZhYiBuYW1lIChkdXBsaWNhdGUsIG9wdGlvbmFsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmYWJfcXVlcnknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVhZC1vbmx5IG1ldGFkYXRhIHF1ZXJpZXMgYWJvdXQgcHJlZmFiIGFzc2V0cyBvbiBkaXNrIOKAlCBubyBlZGl0b3Igc2lkZS1lZmZlY3RzLiBVc2UgcHJlZmFiX2xpZmVjeWNsZSBcIm9wZW5cIiB0byBlZGl0LCBcImluc3RhbnRpYXRlXCIgdG8gcGxhY2UgaW50byBjdXJyZW50IHNjZW5lLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2xpc3QnLCAnZ2V0X2luZm8nLCAndmFsaWRhdGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1wiZ2V0X2xpc3RcIiAtIHByZWZhYiBhc3NldCBwYXRocyB1bmRlciBhIGZvbGRlcjsgXCJnZXRfaW5mb1wiIC0gbWV0YWRhdGEgKHV1aWQsIG5hbWUsIHBhdGgsIGNyZWF0ZVRpbWUsIG1vZGlmeVRpbWUsIGRlcGVuZGVuY2llcyk7IFwidmFsaWRhdGVcIiAtIGNoZWNrIHByZWZhYiBmaWxlIGlzIHdlbGwtZm9ybWVkLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmVmYWJQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9wcmVmYWJzL0Zvby5wcmVmYWIgKGdldF9pbmZvLCB2YWxpZGF0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGb2xkZXIgcGF0aCB0byBzZWFyY2ggKGdldF9saXN0LCBvcHRpb25hbCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmYWJfaW5zdGFuY2UnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlIHByZWZhYiBpbnN0YW5jZXMuIEFjdGlvbnM6IHJldmVydCAodG8gb3JpZ2luYWwgc3RhdGUpLCByZXN0b3JlIChmcm9tIGEgcHJlZmFiIGFzc2V0LCBidWlsdC1pbiB1bmRvIHJlY29yZCkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydyZXZlcnQnLCAncmVzdG9yZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgaW5zdGFuY2Ugbm9kZSBVVUlEIChyZXZlcnQsIHJlc3RvcmUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IFVVSUQgKHJlc3RvcmUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nLCAnbm9kZVV1aWQnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3ByZWZhYl9saWZlY3ljbGUnOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdvcGVuJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9wZW5QcmVmYWIoYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVByZWZhYihhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5zdGFudGlhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaW5zdGFudGlhdGVQcmVmYWIoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy51cGRhdGVQcmVmYWIoYXJncy5wcmVmYWJQYXRoLCBhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZHVwbGljYXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmR1cGxpY2F0ZVByZWZhYihhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIHByZWZhYl9saWZlY3ljbGU6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncHJlZmFiX3F1ZXJ5Jzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJlZmFiTGlzdChhcmdzLmZvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByZWZhYkluZm8oYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmFsaWRhdGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVmYWIoYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIHByZWZhYl9xdWVyeTogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdwcmVmYWJfaW5zdGFuY2UnOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXZlcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmV2ZXJ0UHJlZmFiKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXN0b3JlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc3RvcmVQcmVmYWJOb2RlKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuYXNzZXRVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIHByZWZhYl9pbnN0YW5jZTogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcmVmYWJMaXN0KGZvbGRlcjogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSBmb2xkZXIuZW5kc1dpdGgoJy8nKSA/XG4gICAgICAgICAgICBgJHtmb2xkZXJ9KiovKi5wcmVmYWJgIDogYCR7Zm9sZGVyfS8qKi8qLnByZWZhYmA7XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybiB9KSxcbiAgICAgICAgICAgIChyZXN1bHRzKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdHMubWFwKChhc3NldCk6IFByZWZhYkluZm8gPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogYXNzZXQudXJsLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IGFzc2V0LnVybC5zdWJzdHJpbmcoMCwgYXNzZXQudXJsLmxhc3RJbmRleE9mKCcvJykpXG4gICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb3BlblByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAoIXByZWZhYlBhdGgpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3ByZWZhYlBhdGggaXMgcmVxdWlyZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHV1aWQ6IHN0cmluZyB8IG51bGwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICBpZiAoIXV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcmVmYWIgbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnb3Blbi1zY2VuZScsIHV1aWQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFByZWZhYiBvcGVuZWQgaW4gZWRpdCBtb2RlOiAke3ByZWZhYlBhdGh9YCwgZGF0YTogeyB1dWlkIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGluc3RhbnRpYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXJncy5wcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNyZWF0ZU5vZGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldEluZm8udXVpZFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGFyZ3MucGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLnBhcmVudCA9IGFyZ3MucGFyZW50VXVpZDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGFyZ3MubmFtZSkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLm5hbWUgPSBhcmdzLm5hbWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFzc2V0SW5mby5uYW1lKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm9kZU9wdGlvbnMubmFtZSA9IGFzc2V0SW5mby5uYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoYXJncy5wb3NpdGlvbikge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGVPcHRpb25zLmR1bXAgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogYXJncy5wb3NpdGlvblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIGNyZWF0ZU5vZGVPcHRpb25zKTtcbiAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBBcnJheS5pc0FycmF5KG5vZGVVdWlkKSA/IG5vZGVVdWlkWzBdIDogbm9kZVV1aWQ7XG5cbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBQcmVmYWIgbm9kZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseTogJHtKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgcHJlZmFiVXVpZDogYXNzZXRJbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aDogYXJncy5wcmVmYWJQYXRoXG4gICAgICAgICAgICB9KX1gKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYlBhdGg6IGFyZ3MucHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogYXJncy5wYXJlbnRVdWlkLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogYXJncy5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBpbnN0YW50aWF0ZWQgc3VjY2Vzc2Z1bGx5LCBwcmVmYWIgYXNzb2NpYXRpb24gZXN0YWJsaXNoZWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBQcmVmYWIgaW5zdGFudGlhdGlvbiBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1BsZWFzZSBjaGVjayB0aGF0IHRoZSBwcmVmYWIgcGF0aCBpcyBjb3JyZWN0IGFuZCB0aGUgcHJlZmFiIGZpbGUgZm9ybWF0IGlzIHZhbGlkJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJlZmFiKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHBhdGhQYXJhbSA9IGFyZ3MucHJlZmFiUGF0aCB8fCBhcmdzLnNhdmVQYXRoO1xuICAgICAgICBpZiAoIXBhdGhQYXJhbSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogJ01pc3NpbmcgcHJlZmFiIHBhdGggcGFyYW1ldGVyLiBQbGVhc2UgcHJvdmlkZSBwcmVmYWJQYXRoIG9yIHNhdmVQYXRoLidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhcmdzLm5vZGVVdWlkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdub2RlVXVpZCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHByZWZhYk5hbWUgPSBhcmdzLnByZWZhYk5hbWUgfHwgJ05ld1ByZWZhYic7XG4gICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aFBhcmFtLmVuZHNXaXRoKCcucHJlZmFiJykgP1xuICAgICAgICAgICAgcGF0aFBhcmFtIDogYCR7cGF0aFBhcmFtfS8ke3ByZWZhYk5hbWV9LnByZWZhYmA7XG5cbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUHJlZmFiVmlhRW5naW5lKGFyZ3Mubm9kZVV1aWQsIGZ1bGxQYXRoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWxlZ2F0ZSB0byB0aGUgZW5naW5lJ3MgUHJlZmFiTWFuYWdlci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIHZpYSBzY2VuZS1zY3JpcHQuXG4gICAgICogUmVwbGljYXRlcyB0aGUgZWRpdG9yJ3MgXCJkcmFnIG5vZGUgdG8gQXNzZXRzXCIgZmxvdyDigJQgaGFuZGxlcyBzY3JpcHQgY29tcG9uZW50XG4gICAgICogX190eXBlX18gY29tcHJlc3Npb24sIEBwcm9wZXJ0eSByZWYgc2VyaWFsaXphdGlvbiwgYW5kIHNvdXJjZS1ub2RlIHJlbGlua2luZy5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZVByZWZhYlZpYUVuZ2luZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnY3JlYXRlUHJlZmFiRnJvbU5vZGUnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgcHJlZmFiUGF0aF1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdVbmtub3duIGVuZ2luZSBlcnJvcicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IGF3YWl0IHRoaXMudmVyaWZ5UHJlZmFiT3V0cHV0KHByZWZhYlBhdGgpO1xuICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdQcmVmYWIgY3JlYXRlZCBidXQgZmFpbGVkIHBvc3Qtb3AgdmFsaWRhdGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgLi4ucmVzdWx0LmRhdGEsIHBhdGg6IHByZWZhYlBhdGgsIGlzc3VlczogdmFsaWRhdGlvbi5pc3N1ZXMgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLnJlc3VsdC5kYXRhLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb252ZXJ0ZWRUb1ByZWZhYkluc3RhbmNlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHZhbGlkYXRpb24ubm9kZUNvdW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHZhbGlkYXRpb24uY29tcG9uZW50Q291bnRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ1ByZWZhYiBjcmVhdGVkIHZpYSBlbmdpbmUgUHJlZmFiTWFuYWdlcidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUG9zdC1vcCBzYW5pdHkgY2hlY2sgb24gYSBuZXdseSBjcmVhdGVkIHByZWZhYi4gQ2F0Y2hlcyBzZW1hbnRpYyBjb3JydXB0aW9uXG4gICAgICogdGhhdCB0aGUgZW5naW5lIGNhbGwgcmVwb3J0cyBhcyBzdWNjZXNzIOKAlCB0aGUgY2xhc3Mgb2YgYnVnIHRoYXQgbW90aXZhdGVkXG4gICAgICogdGhlIG1vdmUgb2ZmIHRoZSBsZWdhY3kgaGFuZC1zeW50aCBwaXBlbGluZS5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHsgaXNWYWxpZDogYm9vbGVhbjsgaXNzdWVzOiBzdHJpbmdbXTsgbm9kZUNvdW50OiBudW1iZXI7IGNvbXBvbmVudENvdW50OiBudW1iZXIgfT4ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXNrUGF0aCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghZGlza1BhdGggfHwgdHlwZW9mIGRpc2tQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKGBDb3VsZCBub3QgcmVzb2x2ZSBkaXNrIHBhdGggZm9yICR7cHJlZmFiUGF0aH1gKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQ6IDAsIGNvbXBvbmVudENvdW50OiAwIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGRpc2tQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04ucGFyc2UoY29udGVudCk7XG4gICAgICAgICAgICBjb25zdCBmb3JtYXQgPSB0aGlzLnZhbGlkYXRlUHJlZmFiRm9ybWF0KGRhdGEpO1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goLi4uZm9ybWF0Lmlzc3Vlcyk7XG5cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZFV1aWQgPSAvXlswLTlhLWZdezV9W0EtWmEtejAtOSsvXXsxOH0kLztcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IG9iaiBvZiBkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBvYmo/Ll9fdHlwZV9fO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHQgIT09ICdzdHJpbmcnIHx8IHQuc3RhcnRzV2l0aCgnY2MuJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb29rc0xpa2VDb21wb25lbnQgPSBvYmoubm9kZSAmJiB0eXBlb2Ygb2JqLm5vZGUgPT09ICdvYmplY3QnICYmICdfX2lkX18nIGluIG9iai5ub2RlO1xuICAgICAgICAgICAgICAgICAgICBpZiAobG9va3NMaWtlQ29tcG9uZW50ICYmICFjb21wcmVzc2VkVXVpZC50ZXN0KHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgQ29tcG9uZW50IGhhcyBjbGFzcy1uYW1lIF9fdHlwZV9fIFwiJHt0fVwiIChleHBlY3RlZCBjb21wcmVzc2VkIFVVSUQpLiBUaGlzIGluZGljYXRlcyB0aGUgZW5naW5lIHNlcmlhbGl6ZXIgcmV0dXJuZWQgYW4gdW5yZWdpc3RlcmVkIHNjcmlwdCDigJQgZW5zdXJlIHRoZSBjbGFzcyBpcyBkZWNvcmF0ZWQgd2l0aCBAY2NjbGFzcyBhbmQgdGhlIHNjcmlwdCBpcyByZWltcG9ydGVkLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGlzVmFsaWQ6IGlzc3Vlcy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICAgICAgaXNzdWVzLFxuICAgICAgICAgICAgICAgIG5vZGVDb3VudDogZm9ybWF0Lm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRDb3VudDogZm9ybWF0LmNvbXBvbmVudENvdW50XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goYEZhaWxlZCB0byByZWFkL3BhcnNlIHByZWZhYiBmb3IgdmFsaWRhdGlvbjogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCk7XG4gICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQ6IDAsIGNvbXBvbmVudENvdW50OiAwIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHVwZGF0ZVByZWZhYihwcmVmYWJQYXRoOiBzdHJpbmcsIG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2FwcGx5LXByZWZhYicsIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHByZWZhYjogYXNzZXRJbmZvLnV1aWRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnUHJlZmFiIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmV2ZXJ0UHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBObyBwdWJsaWMgXCJyZXZlcnQtcHJlZmFiXCIgbWVzc2FnZSBleGlzdHM7IGRlbGVnYXRlIHRvIHRoZSBlbmdpbmUnc1xuICAgICAgICAvLyBQcmVmYWJNYW5hZ2VyIHZpYSBzY2VuZS1zY3JpcHQgKHNhbWUgY2hhbm5lbCB1c2VkIGJ5IGNyZWF0ZVByZWZhYlZpYUVuZ2luZSkuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdyZXZlcnRQcmVmYWJJbnN0YW5jZScsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXBwbGllZCA9IHJlc3VsdC5kYXRhPy5hcHBsaWVkICE9PSBmYWxzZTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXBwbGllZCA/ICdQcmVmYWIgaW5zdGFuY2UgcmV2ZXJ0ZWQgc3VjY2Vzc2Z1bGx5JyA6ICdObyBvdmVycmlkZXMgdG8gcmV2ZXJ0J1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IHJlc3VsdD8uZXJyb3IgfHwgJ1Vua25vd24gZW5naW5lIGVycm9yJyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJlZmFiSW5mbyhwcmVmYWJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgcHJlZmFiUGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQcmVmYWIgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCBhc3NldEluZm8udXVpZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKG1ldGFJbmZvOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBtZXRhSW5mby5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBtZXRhSW5mby51dWlkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHByZWZhYlBhdGguc3Vic3RyaW5nKDAsIHByZWZhYlBhdGgubGFzdEluZGV4T2YoJy8nKSksXG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVRpbWU6IG1ldGFJbmZvLmNyZWF0ZVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIG1vZGlmeVRpbWU6IG1ldGFJbmZvLm1vZGlmeVRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llczogbWV0YUluZm8uZGVwZW5kcyB8fCBbXVxuICAgICAgICAgICAgICAgIH0gYXMgUHJlZmFiSW5mb1xuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlZmFiKHByZWZhYlBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm86IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJlZmFiIGZpbGUgZG9lcyBub3QgZXhpc3QnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnZlcmlmeVByZWZhYk91dHB1dChwcmVmYWJQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHJlc3VsdC5pc1ZhbGlkLFxuICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IHJlc3VsdC5pc3N1ZXMsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogcmVzdWx0Lm5vZGVDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Q291bnQ6IHJlc3VsdC5jb21wb25lbnRDb3VudCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVzdWx0LmlzVmFsaWQgPyAnUHJlZmFiIGZvcm1hdCBpcyB2YWxpZCcgOiAnUHJlZmFiIGZvcm1hdCBoYXMgaXNzdWVzJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBFcnJvciBvY2N1cnJlZCB3aGlsZSB2YWxpZGF0aW5nIHByZWZhYjogJHtlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycil9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZVByZWZhYkZvcm1hdChwcmVmYWJEYXRhOiBhbnkpOiB7IGlzVmFsaWQ6IGJvb2xlYW47IGlzc3Vlczogc3RyaW5nW107IG5vZGVDb3VudDogbnVtYmVyOyBjb21wb25lbnRDb3VudDogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBpc3N1ZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGxldCBub2RlQ291bnQgPSAwO1xuICAgICAgICBsZXQgY29tcG9uZW50Q291bnQgPSAwO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcmVmYWJEYXRhKSkge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goJ1ByZWZhYiBkYXRhIG11c3QgYmUgaW4gYXJyYXkgZm9ybWF0Jyk7XG4gICAgICAgICAgICByZXR1cm4geyBpc1ZhbGlkOiBmYWxzZSwgaXNzdWVzLCBub2RlQ291bnQsIGNvbXBvbmVudENvdW50IH07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocHJlZmFiRGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgZGF0YSBpcyBlbXB0eScpO1xuICAgICAgICAgICAgcmV0dXJuIHsgaXNWYWxpZDogZmFsc2UsIGlzc3Vlcywgbm9kZUNvdW50LCBjb21wb25lbnRDb3VudCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlyc3RFbGVtZW50ID0gcHJlZmFiRGF0YVswXTtcbiAgICAgICAgaWYgKCFmaXJzdEVsZW1lbnQgfHwgZmlyc3RFbGVtZW50Ll9fdHlwZV9fICE9PSAnY2MuUHJlZmFiJykge1xuICAgICAgICAgICAgaXNzdWVzLnB1c2goJ0ZpcnN0IGVsZW1lbnQgbXVzdCBiZSBjYy5QcmVmYWIgdHlwZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJlZmFiRGF0YS5mb3JFYWNoKChpdGVtOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLl9fdHlwZV9fID09PSAnY2MuTm9kZScpIHtcbiAgICAgICAgICAgICAgICBub2RlQ291bnQrKztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS5fX3R5cGVfXyAmJiBpdGVtLl9fdHlwZV9fLmluY2x1ZGVzKCdjYy4nKSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChub2RlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdQcmVmYWIgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBub2RlJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgaXNWYWxpZDogaXNzdWVzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIGlzc3VlcyxcbiAgICAgICAgICAgIG5vZGVDb3VudCxcbiAgICAgICAgICAgIGNvbXBvbmVudENvdW50XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkdXBsaWNhdGVQcmVmYWIoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgc291cmNlUHJlZmFiUGF0aCwgdGFyZ2V0UHJlZmFiUGF0aCwgbmV3UHJlZmFiTmFtZSB9ID0gYXJncztcblxuICAgICAgICAgICAgaWYgKCFzb3VyY2VQcmVmYWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc291cmNlUHJlZmFiUGF0aCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRhcmdldFByZWZhYlBhdGg7XG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgICAgIGlmICghbmV3UHJlZmFiTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdFaXRoZXIgdGFyZ2V0UHJlZmFiUGF0aCBvciBuZXdQcmVmYWJOYW1lIGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBsYXN0U2xhc2ggPSBzb3VyY2VQcmVmYWJQYXRoLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGlyID0gbGFzdFNsYXNoID49IDAgPyBzb3VyY2VQcmVmYWJQYXRoLnN1YnN0cmluZygwLCBsYXN0U2xhc2gpIDogJ2RiOi8vYXNzZXRzJztcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gbmV3UHJlZmFiTmFtZS5lbmRzV2l0aCgnLnByZWZhYicpID8gbmV3UHJlZmFiTmFtZSA6IGAke25ld1ByZWZhYk5hbWV9LnByZWZhYmA7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gYCR7ZGlyfS8ke25hbWV9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IHZhbGlkYXRlZFNvdXJjZTogc3RyaW5nO1xuICAgICAgICAgICAgbGV0IHZhbGlkYXRlZFRhcmdldDogc3RyaW5nO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZWRTb3VyY2UgPSB2YWxpZGF0ZUFzc2V0VXJsKHNvdXJjZVByZWZhYlBhdGgpO1xuICAgICAgICAgICAgICAgIHZhbGlkYXRlZFRhcmdldCA9IHZhbGlkYXRlQXNzZXRVcmwodGFyZ2V0KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NvcHktYXNzZXQnLCB2YWxpZGF0ZWRTb3VyY2UsIHZhbGlkYXRlZFRhcmdldCwge1xuICAgICAgICAgICAgICAgIG92ZXJ3cml0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmVuYW1lOiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC51dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ29weSBmYWlsZWQg4oCUIGVkaXRvciByZXR1cm5lZCBubyB1dWlkIChzb3VyY2U9JHt2YWxpZGF0ZWRTb3VyY2V9IHRhcmdldD0ke3ZhbGlkYXRlZFRhcmdldH0pYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdC51dWlkLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC51cmwsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgZHVwbGljYXRlZCBzdWNjZXNzZnVsbHk6ICR7dmFsaWRhdGVkU291cmNlfSDihpIgJHtyZXN1bHQudXJsIHx8IHZhbGlkYXRlZFRhcmdldH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEVycm9yIG9jY3VycmVkIHdoaWxlIGNvcHlpbmcgcHJlZmFiOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzdG9yZVByZWZhYk5vZGUobm9kZVV1aWQ6IHN0cmluZywgYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVzdG9yZS1wcmVmYWInLCBub2RlVXVpZCwgYXNzZXRVdWlkKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdQcmVmYWIgbm9kZSByZXN0b3JlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZXN0b3JlIHByZWZhYiBub2RlOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==