import { ToolDefinition, ToolResponse, ToolExecutor, SceneInfo } from '../types';
import { editorRequest, toolCall } from '../utils/editor-request';

export class SceneTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'scene_management',
                description: 'Manage scenes in the Cocos Creator project. Available actions: get_current (get current scene info), get_list (list all scenes), open (open a .scene or .prefab file by path — also works for opening prefabs in prefab-edit mode), save (save current scene/prefab), save_as (save scene as new file), create (create a new scene), close (close current scene), get_hierarchy (get scene node hierarchy). "open" and "close" fail with an unsaved-changes error if the current scene is dirty — save first, or pass discardChanges: true to proceed without saving.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_current', 'get_list', 'open', 'save', 'save_as', 'create', 'close', 'get_hierarchy'],
                            description: 'The scene management action to perform'
                        },
                        scenePath: {
                            type: 'string',
                            description: 'Path to open (required for action: "open"). Supports both .scene and .prefab files — use this to open a prefab in prefab-edit mode.'
                        },
                        sceneName: {
                            type: 'string',
                            description: 'Name of the new scene (required for action: "create")'
                        },
                        savePath: {
                            type: 'string',
                            description: 'Path to save the scene, e.g. db://assets/scenes/NewScene.scene (required for action: "create")'
                        },
                        path: {
                            type: 'string',
                            description: 'Path to save the scene (required for action: "save_as")'
                        },
                        includeComponents: {
                            type: 'boolean',
                            description: 'Include component information (optional for action: "get_hierarchy", default: false)',
                            default: false
                        },
                        maxDepth: {
                            type: 'number',
                            description: 'Maximum depth of hierarchy traversal (optional for action: "get_hierarchy", default: 10, max: 50)',
                            default: 10
                        },
                        maxChildrenPerLevel: {
                            type: 'number',
                            description: 'Maximum children per node level (optional for action: "get_hierarchy", default: 50, max: 200). Exceeding children are truncated with a summary.',
                            default: 50
                        },
                        discardChanges: {
                            type: 'boolean',
                            description: 'Discard unsaved changes in the current scene without saving (optional for actions: "open", "close", default: false). Required to proceed if the scene is dirty.',
                            default: false
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        const action = args.action;
        switch (action) {
            case 'get_current':
                return await this.getCurrentScene();
            case 'get_list':
                return await this.getSceneList();
            case 'open':
                return await this.openScene(args.scenePath, !!args.discardChanges);
            case 'save':
                return await this.saveScene();
            case 'create':
                return await this.createScene(args.sceneName, args.savePath);
            case 'save_as':
                return await this.saveSceneAs(args.path);
            case 'close':
                return await this.closeScene(!!args.discardChanges);
            case 'get_hierarchy':
                return await this.getSceneHierarchy(
                    args.includeComponents,
                    Math.min(args.maxDepth ?? 10, 50),
                    Math.min(args.maxChildrenPerLevel ?? 50, 200)
                );
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async getCurrentScene(): Promise<ToolResponse> {
        try {
            const tree: any = await editorRequest('scene', 'query-node-tree');
            if (tree && tree.uuid) {
                return {
                    success: true,
                    data: {
                        name: tree.name || 'Current Scene',
                        uuid: tree.uuid,
                        type: tree.type || 'cc.Scene',
                        active: tree.active !== undefined ? tree.active : true,
                        nodeCount: tree.children ? tree.children.length : 0
                    }
                };
            }
            return { success: false, error: 'No scene data available' };
        } catch (err: any) {
            // Fallback: use scene script
            const options = { name: 'cocos-mcp-server', method: 'getCurrentSceneInfo', args: [] };
            try {
                return await editorRequest('scene', 'execute-scene-script', options);
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private async getSceneList(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<any[]>('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' }),
            (results) => ({
                data: results.map((asset): SceneInfo => ({ name: asset.name, path: asset.url, uuid: asset.uuid }))
            })
        );
    }

    private async openScene(scenePath: string, discardChanges: boolean = false): Promise<ToolResponse> {
        return toolCall(
            async () => {
                if (!discardChanges) {
                    const dirty = await editorRequest('scene', 'query-dirty');
                    if (dirty) {
                        throw new Error('Scene has unsaved changes. Save first (action: "save"), or pass discardChanges: true to open without saving.');
                    }
                }

                const uuid: string | null = await editorRequest('asset-db', 'query-uuid', scenePath);
                if (!uuid) {
                    throw new Error('Scene not found');
                }

                return editorRequest('scene', 'open-scene', uuid);
            },
            () => ({ message: `Scene opened: ${scenePath}` })
        );
    }

    private async saveScene(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'save-scene'),
            () => ({ message: 'Scene saved successfully' })
        );
    }

    private async createScene(sceneName: string, savePath: string): Promise<ToolResponse> {
        // Ensure path ends with .scene
        const fullPath = savePath.endsWith('.scene') ? savePath : `${savePath}/${sceneName}.scene`;

        try {
            // Use the correct Cocos Creator 3.8 scene format
            const sceneContent = JSON.stringify([
                {
                    "__type__": "cc.SceneAsset",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_native": "",
                    "scene": {
                        "__id__": 1
                    }
                },
                {
                    "__type__": "cc.Scene",
                    "_name": sceneName,
                    "_objFlags": 0,
                    "__editorExtras__": {},
                    "_parent": null,
                    "_children": [],
                    "_active": true,
                    "_components": [],
                    "_prefab": null,
                    "_lpos": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "_lrot": {
                        "__type__": "cc.Quat",
                        "x": 0,
                        "y": 0,
                        "z": 0,
                        "w": 1
                    },
                    "_lscale": {
                        "__type__": "cc.Vec3",
                        "x": 1,
                        "y": 1,
                        "z": 1
                    },
                    "_mobility": 0,
                    "_layer": 1073741824,
                    "_euler": {
                        "__type__": "cc.Vec3",
                        "x": 0,
                        "y": 0,
                        "z": 0
                    },
                    "autoReleaseAssets": false,
                    "_globals": {
                        "__id__": 2
                    },
                    "_id": "scene"
                },
                {
                    "__type__": "cc.SceneGlobals",
                    "ambient": {
                        "__id__": 3
                    },
                    "skybox": {
                        "__id__": 4
                    },
                    "fog": {
                        "__id__": 5
                    },
                    "octree": {
                        "__id__": 6
                    }
                },
                {
                    "__type__": "cc.AmbientInfo",
                    "_skyColorHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyColor": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.5,
                        "z": 0.8,
                        "w": 0.520833
                    },
                    "_skyIllumHDR": 20000,
                    "_skyIllum": 20000,
                    "_groundAlbedoHDR": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    },
                    "_groundAlbedo": {
                        "__type__": "cc.Vec4",
                        "x": 0.2,
                        "y": 0.2,
                        "z": 0.2,
                        "w": 1
                    }
                },
                {
                    "__type__": "cc.SkyboxInfo",
                    "_envLightingType": 0,
                    "_envmapHDR": null,
                    "_envmap": null,
                    "_envmapLodCount": 0,
                    "_diffuseMapHDR": null,
                    "_diffuseMap": null,
                    "_enabled": false,
                    "_useHDR": true,
                    "_editableMaterial": null,
                    "_reflectionHDR": null,
                    "_reflectionMap": null,
                    "_rotationAngle": 0
                },
                {
                    "__type__": "cc.FogInfo",
                    "_type": 0,
                    "_fogColor": {
                        "__type__": "cc.Color",
                        "r": 200,
                        "g": 200,
                        "b": 200,
                        "a": 255
                    },
                    "_enabled": false,
                    "_fogDensity": 0.3,
                    "_fogStart": 0.5,
                    "_fogEnd": 300,
                    "_fogAtten": 5,
                    "_fogTop": 1.5,
                    "_fogRange": 1.2,
                    "_accurate": false
                },
                {
                    "__type__": "cc.OctreeInfo",
                    "_enabled": false,
                    "_minPos": {
                        "__type__": "cc.Vec3",
                        "x": -1024,
                        "y": -1024,
                        "z": -1024
                    },
                    "_maxPos": {
                        "__type__": "cc.Vec3",
                        "x": 1024,
                        "y": 1024,
                        "z": 1024
                    },
                    "_depth": 8
                }
            ], null, 2);

            const result: any = await editorRequest('asset-db', 'create-asset', fullPath, sceneContent);
            // Verify scene creation by checking if it exists
            let sceneVerified = false;
            let verificationData: any;
            try {
                const sceneList = await this.getSceneList();
                verificationData = sceneList.data?.find((scene: any) => scene.uuid === result.uuid);
                sceneVerified = !!verificationData;
            } catch {
                // Non-fatal — creation already succeeded, verification is best-effort
            }
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    name: sceneName,
                    message: sceneVerified
                        ? `Scene '${sceneName}' created successfully`
                        : `Scene '${sceneName}' created successfully (verification failed)`,
                    sceneVerified
                },
                verificationData
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getSceneHierarchy(
        includeComponents: boolean = false,
        maxDepth: number = 10,
        maxChildrenPerLevel: number = 50
    ): Promise<ToolResponse> {
        try {
            const tree: any = await editorRequest('scene', 'query-node-tree');
            if (tree) {
                const unwrapped = this.unwrapPrefabHierarchy(tree);
                const hierarchy = this.buildHierarchy(unwrapped, includeComponents, maxDepth, maxChildrenPerLevel, 0);
                return {
                    success: true,
                    data: hierarchy,
                    instruction: `Hierarchy returned with maxDepth=${maxDepth}, maxChildrenPerLevel=${maxChildrenPerLevel}. Look for "childrenTruncated" or "depthLimitReached" flags to detect truncation. Re-request with higher limits or specific nodeUuid to explore deeper.`
                };
            }
            return { success: false, error: 'No scene hierarchy available' };
        } catch (err: any) {
            // Fallback: use scene script
            const options = { name: 'cocos-mcp-server', method: 'getSceneHierarchy', args: [includeComponents] };
            try {
                return await editorRequest('scene', 'execute-scene-script', options);
            } catch (err2: any) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }

    private unwrapPrefabHierarchy(tree: any): any {
        if (tree?.children?.length === 1 && tree.children[0]?.name === 'should_hide_in_hierarchy') {
            return { ...tree, children: tree.children[0].children || [] };
        }
        return tree;
    }

    private buildHierarchy(
        node: any,
        includeComponents: boolean,
        maxDepth: number,
        maxChildrenPerLevel: number,
        currentDepth: number
    ): any {
        const nodeInfo: any = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: []
        };

        if (includeComponents && node.__comps__) {
            nodeInfo.components = node.__comps__.map((comp: any) => ({
                type: comp.__type__ || 'Unknown',
                enabled: comp.enabled !== undefined ? comp.enabled : true
            }));
        }

        if (currentDepth >= maxDepth) {
            const childCount = node.children ? node.children.length : 0;
            nodeInfo.children = [];
            if (childCount > 0) {
                nodeInfo.depthLimitReached = true;
                nodeInfo.totalChildren = childCount;
            }
            return nodeInfo;
        }

        if (node.children) {
            const totalChildren = node.children.length;
            const childrenToProcess = node.children.slice(0, maxChildrenPerLevel);

            nodeInfo.children = childrenToProcess.map((child: any) =>
                this.buildHierarchy(child, includeComponents, maxDepth, maxChildrenPerLevel, currentDepth + 1)
            );

            if (totalChildren > maxChildrenPerLevel) {
                nodeInfo.childrenTruncated = true;
                nodeInfo.totalChildren = totalChildren;
                nodeInfo.shownChildren = maxChildrenPerLevel;
            }
        }

        return nodeInfo;
    }

    private async saveSceneAs(path: string): Promise<ToolResponse> {
        // save-as-scene API does not accept path parameters, it opens a dialog for the user to choose
        return toolCall(
            () => editorRequest('scene', 'save-as-scene'),
            () => ({ data: { path, message: `Scene save-as dialog opened` } })
        );
    }

    private async closeScene(discardChanges: boolean = false): Promise<ToolResponse> {
        return toolCall(
            async () => {
                if (!discardChanges) {
                    const dirty = await editorRequest('scene', 'query-dirty');
                    if (dirty) {
                        throw new Error('Scene has unsaved changes. Save first (action: "save"), or pass discardChanges: true to close without saving.');
                    }
                }
                return editorRequest('scene', 'close-scene');
            },
            () => ({ message: 'Scene closed successfully' })
        );
    }
}
