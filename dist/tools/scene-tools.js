"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneTools = void 0;
const editor_request_1 = require("../utils/editor-request");
class SceneTools {
    getTools() {
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
    async execute(toolName, args) {
        var _a, _b;
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
                return await this.getSceneHierarchy(args.includeComponents, Math.min((_a = args.maxDepth) !== null && _a !== void 0 ? _a : 10, 50), Math.min((_b = args.maxChildrenPerLevel) !== null && _b !== void 0 ? _b : 50, 200));
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }
    async getCurrentScene() {
        try {
            const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
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
        }
        catch (err) {
            // Fallback: use scene script
            const options = { name: 'cocos-mcp-server', method: 'getCurrentSceneInfo', args: [] };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    async getSceneList() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' }), (results) => ({
            data: results.map((asset) => ({ name: asset.name, path: asset.url, uuid: asset.uuid }))
        }));
    }
    async openScene(scenePath, discardChanges = false) {
        return (0, editor_request_1.toolCall)(async () => {
            if (!discardChanges) {
                const dirty = await (0, editor_request_1.editorRequest)('scene', 'query-dirty');
                if (dirty) {
                    throw new Error('Scene has unsaved changes. Save first (action: "save"), or pass discardChanges: true to open without saving.');
                }
            }
            const uuid = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', scenePath);
            if (!uuid) {
                throw new Error('Scene not found');
            }
            return (0, editor_request_1.editorRequest)('scene', 'open-scene', uuid);
        }, () => ({ message: `Scene opened: ${scenePath}` }));
    }
    async saveScene() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'save-scene'), () => ({ message: 'Scene saved successfully' }));
    }
    async createScene(sceneName, savePath) {
        var _a;
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
            const result = await (0, editor_request_1.editorRequest)('asset-db', 'create-asset', fullPath, sceneContent);
            // Verify scene creation by checking if it exists
            let sceneVerified = false;
            let verificationData;
            try {
                const sceneList = await this.getSceneList();
                verificationData = (_a = sceneList.data) === null || _a === void 0 ? void 0 : _a.find((scene) => scene.uuid === result.uuid);
                sceneVerified = !!verificationData;
            }
            catch (_b) {
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getSceneHierarchy(includeComponents = false, maxDepth = 10, maxChildrenPerLevel = 50) {
        try {
            const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
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
        }
        catch (err) {
            // Fallback: use scene script
            const options = { name: 'cocos-mcp-server', method: 'getSceneHierarchy', args: [includeComponents] };
            try {
                return await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', options);
            }
            catch (err2) {
                return { success: false, error: `Direct API failed: ${err.message}, Scene script failed: ${err2.message}` };
            }
        }
    }
    unwrapPrefabHierarchy(tree) {
        var _a, _b;
        if (((_a = tree === null || tree === void 0 ? void 0 : tree.children) === null || _a === void 0 ? void 0 : _a.length) === 1 && ((_b = tree.children[0]) === null || _b === void 0 ? void 0 : _b.name) === 'should_hide_in_hierarchy') {
            return Object.assign(Object.assign({}, tree), { children: tree.children[0].children || [] });
        }
        return tree;
    }
    buildHierarchy(node, includeComponents, maxDepth, maxChildrenPerLevel, currentDepth) {
        const nodeInfo = {
            uuid: node.uuid,
            name: node.name,
            type: node.type,
            active: node.active,
            children: []
        };
        if (includeComponents && node.__comps__) {
            nodeInfo.components = node.__comps__.map((comp) => ({
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
            nodeInfo.children = childrenToProcess.map((child) => this.buildHierarchy(child, includeComponents, maxDepth, maxChildrenPerLevel, currentDepth + 1));
            if (totalChildren > maxChildrenPerLevel) {
                nodeInfo.childrenTruncated = true;
                nodeInfo.totalChildren = totalChildren;
                nodeInfo.shownChildren = maxChildrenPerLevel;
            }
        }
        return nodeInfo;
    }
    async saveSceneAs(path) {
        // save-as-scene API does not accept path parameters, it opens a dialog for the user to choose
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'save-as-scene'), () => ({ data: { path, message: `Scene save-as dialog opened` } }));
    }
    async closeScene(discardChanges = false) {
        return (0, editor_request_1.toolCall)(async () => {
            if (!discardChanges) {
                const dirty = await (0, editor_request_1.editorRequest)('scene', 'query-dirty');
                if (dirty) {
                    throw new Error('Scene has unsaved changes. Save first (action: "save"), or pass discardChanges: true to close without saving.');
                }
            }
            return (0, editor_request_1.editorRequest)('scene', 'close-scene');
        }, () => ({ message: 'Scene closed successfully' }));
    }
}
exports.SceneTools = SceneTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBRWxFLE1BQWEsVUFBVTtJQUNuQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLFdBQVcsRUFBRSx1aUJBQXVpQjtnQkFDcGpCLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUM7NEJBQ2hHLFdBQVcsRUFBRSx3Q0FBd0M7eUJBQ3hEO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUscUlBQXFJO3lCQUNySjt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHVEQUF1RDt5QkFDdkU7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnR0FBZ0c7eUJBQ2hIO3dCQUNELElBQUksRUFBRTs0QkFDRixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUseURBQXlEO3lCQUN6RTt3QkFDRCxpQkFBaUIsRUFBRTs0QkFDZixJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUsc0ZBQXNGOzRCQUNuRyxPQUFPLEVBQUUsS0FBSzt5QkFDakI7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtR0FBbUc7NEJBQ2hILE9BQU8sRUFBRSxFQUFFO3lCQUNk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LEdBQUcsRUFBRSxDQUFDLElBQUEsOEJBQWEsRUFBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLEVBQzdDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLEVBQUUsQ0FBQyxDQUNyRSxDQUFDO0lBQ04sQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVLENBQUMsaUJBQTBCLEtBQUs7UUFDcEQsT0FBTyxJQUFBLHlCQUFRLEVBQ1gsS0FBSyxJQUFJLEVBQUU7WUFDUCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBQSw4QkFBYSxFQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDUixNQUFNLElBQUksS0FBSyxDQUFDLCtHQUErRyxDQUFDLENBQUM7Z0JBQ3JJLENBQUM7WUFDTCxDQUFDO1lBQ0QsT0FBTyxJQUFBLDhCQUFhLEVBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELENBQUMsRUFDRCxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLENBQUMsQ0FDbkQsQ0FBQztJQUNOLENBQUM7Q0FDSjtBQTliRCxnQ0E4YkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIFNjZW5lSW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QsIHRvb2xDYWxsIH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuXG5leHBvcnQgY2xhc3MgU2NlbmVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX21hbmFnZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlIHNjZW5lcyBpbiB0aGUgQ29jb3MgQ3JlYXRvciBwcm9qZWN0LiBBdmFpbGFibGUgYWN0aW9uczogZ2V0X2N1cnJlbnQgKGdldCBjdXJyZW50IHNjZW5lIGluZm8pLCBnZXRfbGlzdCAobGlzdCBhbGwgc2NlbmVzKSwgb3BlbiAob3BlbiBhIC5zY2VuZSBvciAucHJlZmFiIGZpbGUgYnkgcGF0aCDigJQgYWxzbyB3b3JrcyBmb3Igb3BlbmluZyBwcmVmYWJzIGluIHByZWZhYi1lZGl0IG1vZGUpLCBzYXZlIChzYXZlIGN1cnJlbnQgc2NlbmUvcHJlZmFiKSwgc2F2ZV9hcyAoc2F2ZSBzY2VuZSBhcyBuZXcgZmlsZSksIGNyZWF0ZSAoY3JlYXRlIGEgbmV3IHNjZW5lKSwgY2xvc2UgKGNsb3NlIGN1cnJlbnQgc2NlbmUpLCBnZXRfaGllcmFyY2h5IChnZXQgc2NlbmUgbm9kZSBoaWVyYXJjaHkpLiBcIm9wZW5cIiBhbmQgXCJjbG9zZVwiIGZhaWwgd2l0aCBhbiB1bnNhdmVkLWNoYW5nZXMgZXJyb3IgaWYgdGhlIGN1cnJlbnQgc2NlbmUgaXMgZGlydHkg4oCUIHNhdmUgZmlyc3QsIG9yIHBhc3MgZGlzY2FyZENoYW5nZXM6IHRydWUgdG8gcHJvY2VlZCB3aXRob3V0IHNhdmluZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9jdXJyZW50JywgJ2dldF9saXN0JywgJ29wZW4nLCAnc2F2ZScsICdzYXZlX2FzJywgJ2NyZWF0ZScsICdjbG9zZScsICdnZXRfaGllcmFyY2h5J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgc2NlbmUgbWFuYWdlbWVudCBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhdGggdG8gb3BlbiAocmVxdWlyZWQgZm9yIGFjdGlvbjogXCJvcGVuXCIpLiBTdXBwb3J0cyBib3RoIC5zY2VuZSBhbmQgLnByZWZhYiBmaWxlcyDigJQgdXNlIHRoaXMgdG8gb3BlbiBhIHByZWZhYiBpbiBwcmVmYWItZWRpdCBtb2RlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZU5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIG5ldyBzY2VuZSAocmVxdWlyZWQgZm9yIGFjdGlvbjogXCJjcmVhdGVcIiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhdGggdG8gc2F2ZSB0aGUgc2NlbmUsIGUuZy4gZGI6Ly9hc3NldHMvc2NlbmVzL05ld1NjZW5lLnNjZW5lIChyZXF1aXJlZCBmb3IgYWN0aW9uOiBcImNyZWF0ZVwiKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXRoIHRvIHNhdmUgdGhlIHNjZW5lIChyZXF1aXJlZCBmb3IgYWN0aW9uOiBcInNhdmVfYXNcIiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIGNvbXBvbmVudCBpbmZvcm1hdGlvbiAob3B0aW9uYWwgZm9yIGFjdGlvbjogXCJnZXRfaGllcmFyY2h5XCIsIGRlZmF1bHQ6IGZhbHNlKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSBkZXB0aCBvZiBoaWVyYXJjaHkgdHJhdmVyc2FsIChvcHRpb25hbCBmb3IgYWN0aW9uOiBcImdldF9oaWVyYXJjaHlcIiwgZGVmYXVsdDogMTAsIG1heDogNTApJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heENoaWxkcmVuUGVyTGV2ZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gY2hpbGRyZW4gcGVyIG5vZGUgbGV2ZWwgKG9wdGlvbmFsIGZvciBhY3Rpb246IFwiZ2V0X2hpZXJhcmNoeVwiLCBkZWZhdWx0OiA1MCwgbWF4OiAyMDApLiBFeGNlZWRpbmcgY2hpbGRyZW4gYXJlIHRydW5jYXRlZCB3aXRoIGEgc3VtbWFyeS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzY2FyZENoYW5nZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEaXNjYXJkIHVuc2F2ZWQgY2hhbmdlcyBpbiB0aGUgY3VycmVudCBzY2VuZSB3aXRob3V0IHNhdmluZyAob3B0aW9uYWwgZm9yIGFjdGlvbnM6IFwib3BlblwiLCBcImNsb3NlXCIsIGRlZmF1bHQ6IGZhbHNlKS4gUmVxdWlyZWQgdG8gcHJvY2VlZCBpZiB0aGUgc2NlbmUgaXMgZGlydHkuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3MuYWN0aW9uO1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2N1cnJlbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEN1cnJlbnRTY2VuZSgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNjZW5lTGlzdCgpO1xuICAgICAgICAgICAgY2FzZSAnb3Blbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlblNjZW5lKGFyZ3Muc2NlbmVQYXRoLCAhIWFyZ3MuZGlzY2FyZENoYW5nZXMpO1xuICAgICAgICAgICAgY2FzZSAnc2F2ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2F2ZVNjZW5lKCk7XG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVNjZW5lKGFyZ3Muc2NlbmVOYW1lLCBhcmdzLnNhdmVQYXRoKTtcbiAgICAgICAgICAgIGNhc2UgJ3NhdmVfYXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNhdmVTY2VuZUFzKGFyZ3MucGF0aCk7XG4gICAgICAgICAgICBjYXNlICdjbG9zZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2xvc2VTY2VuZSghIWFyZ3MuZGlzY2FyZENoYW5nZXMpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2hpZXJhcmNoeSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2NlbmVIaWVyYXJjaHkoXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MuaW5jbHVkZUNvbXBvbmVudHMsXG4gICAgICAgICAgICAgICAgICAgIE1hdGgubWluKGFyZ3MubWF4RGVwdGggPz8gMTAsIDUwKSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4oYXJncy5tYXhDaGlsZHJlblBlckxldmVsID8/IDUwLCAyMDApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbjogJHthY3Rpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEN1cnJlbnRTY2VuZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdHJlZTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAodHJlZSAmJiB0cmVlLnV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0cmVlLm5hbWUgfHwgJ0N1cnJlbnQgU2NlbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogdHJlZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdHJlZS50eXBlIHx8ICdjYy5TY2VuZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IHRyZWUuYWN0aXZlICE9PSB1bmRlZmluZWQgPyB0cmVlLmFjdGl2ZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlQ291bnQ6IHRyZWUuY2hpbGRyZW4gPyB0cmVlLmNoaWxkcmVuLmxlbmd0aCA6IDBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSBkYXRhIGF2YWlsYWJsZScgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiB1c2Ugc2NlbmUgc2NyaXB0XG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0geyBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsIG1ldGhvZDogJ2dldEN1cnJlbnRTY2VuZUluZm8nLCBhcmdzOiBbXSB9O1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdCBBUEkgZmFpbGVkOiAke2Vyci5tZXNzYWdlfSwgU2NlbmUgc2NyaXB0IGZhaWxlZDogJHtlcnIyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRTY2VuZUxpc3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogJ2RiOi8vYXNzZXRzLyoqLyouc2NlbmUnIH0pLFxuICAgICAgICAgICAgKHJlc3VsdHMpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YTogcmVzdWx0cy5tYXAoKGFzc2V0KTogU2NlbmVJbmZvID0+ICh7IG5hbWU6IGFzc2V0Lm5hbWUsIHBhdGg6IGFzc2V0LnVybCwgdXVpZDogYXNzZXQudXVpZCB9KSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuU2NlbmUoc2NlbmVQYXRoOiBzdHJpbmcsIGRpc2NhcmRDaGFuZ2VzOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFkaXNjYXJkQ2hhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXJ0eSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTY2VuZSBoYXMgdW5zYXZlZCBjaGFuZ2VzLiBTYXZlIGZpcnN0IChhY3Rpb246IFwic2F2ZVwiKSwgb3IgcGFzcyBkaXNjYXJkQ2hhbmdlczogdHJ1ZSB0byBvcGVuIHdpdGhvdXQgc2F2aW5nLicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBzY2VuZVBhdGgpO1xuICAgICAgICAgICAgICAgIGlmICghdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NjZW5lIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdvcGVuLXNjZW5lJywgdXVpZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogYFNjZW5lIG9wZW5lZDogJHtzY2VuZVBhdGh9YCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZVNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtc2NlbmUnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzYXZlZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVTY2VuZShzY2VuZU5hbWU6IHN0cmluZywgc2F2ZVBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIEVuc3VyZSBwYXRoIGVuZHMgd2l0aCAuc2NlbmVcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBzYXZlUGF0aC5lbmRzV2l0aCgnLnNjZW5lJykgPyBzYXZlUGF0aCA6IGAke3NhdmVQYXRofS8ke3NjZW5lTmFtZX0uc2NlbmVgO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIGNvcnJlY3QgQ29jb3MgQ3JlYXRvciAzLjggc2NlbmUgZm9ybWF0XG4gICAgICAgICAgICBjb25zdCBzY2VuZUNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuU2NlbmVBc3NldFwiLFxuICAgICAgICAgICAgICAgICAgICBcIl9uYW1lXCI6IHNjZW5lTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgXCJfb2JqRmxhZ3NcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfX2VkaXRvckV4dHJhc19fXCI6IHt9LFxuICAgICAgICAgICAgICAgICAgICBcIl9uYXRpdmVcIjogXCJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJzY2VuZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNjZW5lXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiX25hbWVcIjogc2NlbmVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBcIl9vYmpGbGFnc1wiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9fZWRpdG9yRXh0cmFzX19cIjoge30sXG4gICAgICAgICAgICAgICAgICAgIFwiX3BhcmVudFwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9jaGlsZHJlblwiOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgXCJfYWN0aXZlXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIFwiX2NvbXBvbmVudHNcIjogW10sXG4gICAgICAgICAgICAgICAgICAgIFwiX3ByZWZhYlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9scG9zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbHJvdFwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuUXVhdFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDFcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbHNjYWxlXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWMzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDFcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfbW9iaWxpdHlcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfbGF5ZXJcIjogMTA3Mzc0MTgyNCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZXVsZXJcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImF1dG9SZWxlYXNlQXNzZXRzXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIl9nbG9iYWxzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfaWRcIjogXCJzY2VuZVwiXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5TY2VuZUdsb2JhbHNcIixcbiAgICAgICAgICAgICAgICAgICAgXCJhbWJpZW50XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDNcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJza3lib3hcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX2lkX19cIjogNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImZvZ1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9faWRfX1wiOiA1XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwib2N0cmVlXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX19pZF9fXCI6IDZcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuQW1iaWVudEluZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfc2t5Q29sb3JIRFJcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMC41LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuOCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwid1wiOiAwLjUyMDgzM1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9za3lDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuVmVjNFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAwLjUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMC44LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ3XCI6IDAuNTIwODMzXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiX3NreUlsbHVtSERSXCI6IDIwMDAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9za3lJbGx1bVwiOiAyMDAwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZ3JvdW5kQWxiZWRvSERSXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiX190eXBlX19cIjogXCJjYy5WZWM0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInhcIjogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIndcIjogMVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9ncm91bmRBbGJlZG9cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAwLjIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInlcIjogMC4yLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ6XCI6IDAuMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwid1wiOiAxXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlNreWJveEluZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfZW52TGlnaHRpbmdUeXBlXCI6IDAsXG4gICAgICAgICAgICAgICAgICAgIFwiX2Vudm1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9lbnZtYXBcIjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZW52bWFwTG9kQ291bnRcIjogMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZGlmZnVzZU1hcEhEUlwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9kaWZmdXNlTWFwXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiX2VuYWJsZWRcIjogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIFwiX3VzZUhEUlwiOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBcIl9lZGl0YWJsZU1hdGVyaWFsXCI6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIFwiX3JlZmxlY3Rpb25IRFJcIjogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJfcmVmbGVjdGlvbk1hcFwiOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBcIl9yb3RhdGlvbkFuZ2xlXCI6IDBcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLkZvZ0luZm9cIixcbiAgICAgICAgICAgICAgICAgICAgXCJfdHlwZVwiOiAwLFxuICAgICAgICAgICAgICAgICAgICBcIl9mb2dDb2xvclwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuQ29sb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiclwiOiAyMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBcImdcIjogMjAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJiXCI6IDIwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiYVwiOiAyNTVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZW5hYmxlZFwiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nRGVuc2l0eVwiOiAwLjMsXG4gICAgICAgICAgICAgICAgICAgIFwiX2ZvZ1N0YXJ0XCI6IDAuNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nRW5kXCI6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nQXR0ZW5cIjogNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nVG9wXCI6IDEuNSxcbiAgICAgICAgICAgICAgICAgICAgXCJfZm9nUmFuZ2VcIjogMS4yLFxuICAgICAgICAgICAgICAgICAgICBcIl9hY2N1cmF0ZVwiOiBmYWxzZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBcIl9fdHlwZV9fXCI6IFwiY2MuT2N0cmVlSW5mb1wiLFxuICAgICAgICAgICAgICAgICAgICBcIl9lbmFibGVkXCI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBcIl9taW5Qb3NcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAtMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieVwiOiAtMTAyNCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwielwiOiAtMTAyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9tYXhQb3NcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJfX3R5cGVfX1wiOiBcImNjLlZlYzNcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwieFwiOiAxMDI0LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ5XCI6IDEwMjQsXG4gICAgICAgICAgICAgICAgICAgICAgICBcInpcIjogMTAyNFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcIl9kZXB0aFwiOiA4XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSwgbnVsbCwgMik7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgZnVsbFBhdGgsIHNjZW5lQ29udGVudCk7XG4gICAgICAgICAgICAvLyBWZXJpZnkgc2NlbmUgY3JlYXRpb24gYnkgY2hlY2tpbmcgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICBsZXQgc2NlbmVWZXJpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgbGV0IHZlcmlmaWNhdGlvbkRhdGE6IGFueTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVMaXN0ID0gYXdhaXQgdGhpcy5nZXRTY2VuZUxpc3QoKTtcbiAgICAgICAgICAgICAgICB2ZXJpZmljYXRpb25EYXRhID0gc2NlbmVMaXN0LmRhdGE/LmZpbmQoKHNjZW5lOiBhbnkpID0+IHNjZW5lLnV1aWQgPT09IHJlc3VsdC51dWlkKTtcbiAgICAgICAgICAgICAgICBzY2VuZVZlcmlmaWVkID0gISF2ZXJpZmljYXRpb25EYXRhO1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gTm9uLWZhdGFsIOKAlCBjcmVhdGlvbiBhbHJlYWR5IHN1Y2NlZWRlZCwgdmVyaWZpY2F0aW9uIGlzIGJlc3QtZWZmb3J0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBzY2VuZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHNjZW5lVmVyaWZpZWRcbiAgICAgICAgICAgICAgICAgICAgICAgID8gYFNjZW5lICcke3NjZW5lTmFtZX0nIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBgU2NlbmUgJyR7c2NlbmVOYW1lfScgY3JlYXRlZCBzdWNjZXNzZnVsbHkgKHZlcmlmaWNhdGlvbiBmYWlsZWQpYCxcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVWZXJpZmllZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdmVyaWZpY2F0aW9uRGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2NlbmVIaWVyYXJjaHkoXG4gICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuID0gZmFsc2UsXG4gICAgICAgIG1heERlcHRoOiBudW1iZXIgPSAxMCxcbiAgICAgICAgbWF4Q2hpbGRyZW5QZXJMZXZlbDogbnVtYmVyID0gNTBcbiAgICApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdHJlZTogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAodHJlZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVud3JhcHBlZCA9IHRoaXMudW53cmFwUHJlZmFiSGllcmFyY2h5KHRyZWUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHRoaXMuYnVpbGRIaWVyYXJjaHkodW53cmFwcGVkLCBpbmNsdWRlQ29tcG9uZW50cywgbWF4RGVwdGgsIG1heENoaWxkcmVuUGVyTGV2ZWwsIDApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGhpZXJhcmNoeSxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IGBIaWVyYXJjaHkgcmV0dXJuZWQgd2l0aCBtYXhEZXB0aD0ke21heERlcHRofSwgbWF4Q2hpbGRyZW5QZXJMZXZlbD0ke21heENoaWxkcmVuUGVyTGV2ZWx9LiBMb29rIGZvciBcImNoaWxkcmVuVHJ1bmNhdGVkXCIgb3IgXCJkZXB0aExpbWl0UmVhY2hlZFwiIGZsYWdzIHRvIGRldGVjdCB0cnVuY2F0aW9uLiBSZS1yZXF1ZXN0IHdpdGggaGlnaGVyIGxpbWl0cyBvciBzcGVjaWZpYyBub2RlVXVpZCB0byBleHBsb3JlIGRlZXBlci5gXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIGhpZXJhcmNoeSBhdmFpbGFibGUnIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjazogdXNlIHNjZW5lIHNjcmlwdFxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLCBtZXRob2Q6ICdnZXRTY2VuZUhpZXJhcmNoeScsIGFyZ3M6IFtpbmNsdWRlQ29tcG9uZW50c10gfTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3QgQVBJIGZhaWxlZDogJHtlcnIubWVzc2FnZX0sIFNjZW5lIHNjcmlwdCBmYWlsZWQ6ICR7ZXJyMi5tZXNzYWdlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgdW53cmFwUHJlZmFiSGllcmFyY2h5KHRyZWU6IGFueSk6IGFueSB7XG4gICAgICAgIGlmICh0cmVlPy5jaGlsZHJlbj8ubGVuZ3RoID09PSAxICYmIHRyZWUuY2hpbGRyZW5bMF0/Lm5hbWUgPT09ICdzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHknKSB7XG4gICAgICAgICAgICByZXR1cm4geyAuLi50cmVlLCBjaGlsZHJlbjogdHJlZS5jaGlsZHJlblswXS5jaGlsZHJlbiB8fCBbXSB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cmVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgYnVpbGRIaWVyYXJjaHkoXG4gICAgICAgIG5vZGU6IGFueSxcbiAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4sXG4gICAgICAgIG1heERlcHRoOiBudW1iZXIsXG4gICAgICAgIG1heENoaWxkcmVuUGVyTGV2ZWw6IG51bWJlcixcbiAgICAgICAgY3VycmVudERlcHRoOiBudW1iZXJcbiAgICApOiBhbnkge1xuICAgICAgICBjb25zdCBub2RlSW5mbzogYW55ID0ge1xuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgdHlwZTogbm9kZS50eXBlLFxuICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLl9fY29tcHNfXykge1xuICAgICAgICAgICAgbm9kZUluZm8uY29tcG9uZW50cyA9IG5vZGUuX19jb21wc19fLm1hcCgoY29tcDogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuX190eXBlX18gfHwgJ1Vua25vd24nLFxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCAhPT0gdW5kZWZpbmVkID8gY29tcC5lbmFibGVkIDogdHJ1ZVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN1cnJlbnREZXB0aCA+PSBtYXhEZXB0aCkge1xuICAgICAgICAgICAgY29uc3QgY2hpbGRDb3VudCA9IG5vZGUuY2hpbGRyZW4gPyBub2RlLmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gICAgICAgICAgICBub2RlSW5mby5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgaWYgKGNoaWxkQ291bnQgPiAwKSB7XG4gICAgICAgICAgICAgICAgbm9kZUluZm8uZGVwdGhMaW1pdFJlYWNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG5vZGVJbmZvLnRvdGFsQ2hpbGRyZW4gPSBjaGlsZENvdW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5vZGVJbmZvO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsQ2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGNoaWxkcmVuVG9Qcm9jZXNzID0gbm9kZS5jaGlsZHJlbi5zbGljZSgwLCBtYXhDaGlsZHJlblBlckxldmVsKTtcblxuICAgICAgICAgICAgbm9kZUluZm8uY2hpbGRyZW4gPSBjaGlsZHJlblRvUHJvY2Vzcy5tYXAoKGNoaWxkOiBhbnkpID0+XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZEhpZXJhcmNoeShjaGlsZCwgaW5jbHVkZUNvbXBvbmVudHMsIG1heERlcHRoLCBtYXhDaGlsZHJlblBlckxldmVsLCBjdXJyZW50RGVwdGggKyAxKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKHRvdGFsQ2hpbGRyZW4gPiBtYXhDaGlsZHJlblBlckxldmVsKSB7XG4gICAgICAgICAgICAgICAgbm9kZUluZm8uY2hpbGRyZW5UcnVuY2F0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIG5vZGVJbmZvLnRvdGFsQ2hpbGRyZW4gPSB0b3RhbENoaWxkcmVuO1xuICAgICAgICAgICAgICAgIG5vZGVJbmZvLnNob3duQ2hpbGRyZW4gPSBtYXhDaGlsZHJlblBlckxldmVsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG5vZGVJbmZvO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZVNjZW5lQXMocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gc2F2ZS1hcy1zY2VuZSBBUEkgZG9lcyBub3QgYWNjZXB0IHBhdGggcGFyYW1ldGVycywgaXQgb3BlbnMgYSBkaWFsb2cgZm9yIHRoZSB1c2VyIHRvIGNob29zZVxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzYXZlLWFzLXNjZW5lJyksXG4gICAgICAgICAgICAoKSA9PiAoeyBkYXRhOiB7IHBhdGgsIG1lc3NhZ2U6IGBTY2VuZSBzYXZlLWFzIGRpYWxvZyBvcGVuZWRgIH0gfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNsb3NlU2NlbmUoZGlzY2FyZENoYW5nZXM6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWRpc2NhcmRDaGFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpcnR5ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZGlydHknKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpcnR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NjZW5lIGhhcyB1bnNhdmVkIGNoYW5nZXMuIFNhdmUgZmlyc3QgKGFjdGlvbjogXCJzYXZlXCIpLCBvciBwYXNzIGRpc2NhcmRDaGFuZ2VzOiB0cnVlIHRvIGNsb3NlIHdpdGhvdXQgc2F2aW5nLicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjbG9zZS1zY2VuZScpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBjbG9zZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cbn1cbiJdfQ==