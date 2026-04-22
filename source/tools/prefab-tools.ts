import { ToolDefinition, ToolResponse, ToolExecutor, PrefabInfo } from '../types';
import { logger } from '../logger';
import { validateAssetUrl } from '../utils/asset-safety';

export class PrefabTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async getPrefabList(folder: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const pattern = folder.endsWith('/') ?
                `${folder}**/*.prefab` : `${folder}/**/*.prefab`;

            Editor.Message.request('asset-db', 'query-assets', {
                pattern: pattern
            }).then((results: any[]) => {
                const prefabs: PrefabInfo[] = results.map(asset => ({
                    name: asset.name,
                    path: asset.url,
                    uuid: asset.uuid,
                    folder: asset.url.substring(0, asset.url.lastIndexOf('/'))
                }));
                resolve({ success: true, data: prefabs });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async loadPrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('scene', 'load-asset', {
                    uuid: assetInfo.uuid
                });
            }).then((prefabData: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: prefabData.uuid,
                        name: prefabData.name,
                        message: 'Prefab loaded successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async instantiatePrefab(args: any): Promise<ToolResponse> {
        try {
            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', args.prefabPath);
            if (!assetInfo) {
                throw new Error('Prefab not found');
            }

            const createNodeOptions: any = {
                assetUuid: assetInfo.uuid
            };

            if (args.parentUuid) {
                createNodeOptions.parent = args.parentUuid;
            }

            if (args.name) {
                createNodeOptions.name = args.name;
            } else if (assetInfo.name) {
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

            logger.info(`Prefab node created successfully: ${JSON.stringify({
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
        } catch (err: any) {
            return {
                success: false,
                error: `Prefab instantiation failed: ${err.message}`,
                instruction: 'Please check that the prefab path is correct and the prefab file format is valid'
            };
        }
    }

    private async createPrefab(args: any): Promise<ToolResponse> {
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
    private async createPrefabViaEngine(nodeUuid: string, prefabPath: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'createPrefabFromNode',
                args: [nodeUuid, prefabPath]
            });
            if (result && result.success) {
                return {
                    success: true,
                    data: {
                        ...result.data,
                        path: prefabPath,
                        convertedToPrefabInstance: true
                    },
                    message: 'Prefab created via engine PrefabManager'
                };
            }
            return { success: false, error: result?.error || 'Unknown engine error' };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async updatePrefab(prefabPath: string, nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
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
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async revertPrefab(nodeUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'revert-prefab', {
                node: nodeUuid
            }).then(() => {
                resolve({
                    success: true,
                    message: 'Prefab instance reverted successfully'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getPrefabInfo(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                if (!assetInfo) {
                    throw new Error('Prefab not found');
                }

                return Editor.Message.request('asset-db', 'query-asset-meta', assetInfo.uuid);
            }).then((metaInfo: any) => {
                const info: PrefabInfo = {
                    name: metaInfo.name,
                    uuid: metaInfo.uuid,
                    path: prefabPath,
                    folder: prefabPath.substring(0, prefabPath.lastIndexOf('/')),
                    createTime: metaInfo.createTime,
                    modifyTime: metaInfo.modifyTime,
                    dependencies: metaInfo.depends || []
                };
                resolve({ success: true, data: info });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async validatePrefab(prefabPath: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                Editor.Message.request('asset-db', 'query-asset-info', prefabPath).then((assetInfo: any) => {
                    if (!assetInfo) {
                        resolve({ success: false, error: 'Prefab file does not exist' });
                        return;
                    }

                    Editor.Message.request('asset-db', 'read-asset', prefabPath).then((content: string) => {
                        try {
                            const prefabData = JSON.parse(content);
                            const validationResult = this.validatePrefabFormat(prefabData);

                            resolve({
                                success: true,
                                data: {
                                    isValid: validationResult.isValid,
                                    issues: validationResult.issues,
                                    nodeCount: validationResult.nodeCount,
                                    componentCount: validationResult.componentCount,
                                    message: validationResult.isValid ? 'Prefab format is valid' : 'Prefab format has issues'
                                }
                            });
                        } catch {
                            resolve({ success: false, error: 'Prefab file format error, unable to parse JSON' });
                        }
                    }).catch((error: any) => {
                        resolve({ success: false, error: `Failed to read prefab file: ${error.message}` });
                    });
                }).catch((error: any) => {
                    resolve({ success: false, error: `Failed to query prefab info: ${error.message}` });
                });
            } catch (error) {
                resolve({ success: false, error: `Error occurred while validating prefab: ${error}` });
            }
        });
    }

    private validatePrefabFormat(prefabData: any): { isValid: boolean; issues: string[]; nodeCount: number; componentCount: number } {
        const issues: string[] = [];
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

        prefabData.forEach((item: any) => {
            if (item.__type__ === 'cc.Node') {
                nodeCount++;
            } else if (item.__type__ && item.__type__.includes('cc.')) {
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

    private async duplicatePrefab(args: any): Promise<ToolResponse> {
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

            let validatedSource: string;
            let validatedTarget: string;
            try {
                validatedSource = validateAssetUrl(sourcePrefabPath);
                validatedTarget = validateAssetUrl(target);
            } catch (err: any) {
                return { success: false, error: err.message };
            }

            const result: any = await Editor.Message.request('asset-db', 'copy-asset', validatedSource, validatedTarget, {
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
        } catch (error: any) {
            return {
                success: false,
                error: `Error occurred while copying prefab: ${error?.message ?? String(error)}`
            };
        }
    }

    private async restorePrefabNode(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid, assetUuid).then(() => {
                resolve({
                    success: true,
                    data: {
                        nodeUuid: nodeUuid,
                        assetUuid: assetUuid,
                        message: 'Prefab node restored successfully'
                    }
                });
            }).catch((error: any) => {
                resolve({
                    success: false,
                    error: `Failed to restore prefab node: ${error.message}`
                });
            });
        });
    }
}
