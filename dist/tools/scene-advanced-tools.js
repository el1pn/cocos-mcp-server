"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneAdvancedTools = void 0;
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
class SceneAdvancedTools {
    getTools() {
        return [
            {
                name: 'scene_state',
                description: 'Query scene state / manage snapshots. Actions: query_ready, query_dirty (unsaved changes), query_classes (registered classes), query_components (filter+limit optional, default 200), query_component_has_script, query_nodes_by_asset, soft_reload, snapshot, snapshot_abort.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['query_ready', 'query_dirty', 'query_classes', 'query_components', 'query_component_has_script', 'query_nodes_by_asset', 'soft_reload', 'snapshot', 'snapshot_abort'],
                            description: 'The action to perform'
                        },
                        extends: {
                            type: 'string',
                            description: 'Filter classes that extend this base class (used by query_classes)'
                        },
                        className: {
                            type: 'string',
                            description: 'Script class name to check (required for query_component_has_script)'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Asset UUID to search for (required for query_nodes_by_asset)'
                        },
                        filter: {
                            type: 'string',
                            description: 'Substring filter on component name (optional, used by query_components)'
                        },
                        limit: {
                            type: 'number',
                            description: 'Max items to return (optional, used by query_components, default 200, max 1000)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_undo',
                description: 'Manage undo recording for scene operations. Actions: begin_recording (for a node), end_recording, cancel_recording.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['begin_recording', 'end_recording', 'cancel_recording'],
                            description: 'The action to perform'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID to record (required for begin_recording)'
                        },
                        undoId: {
                            type: 'string',
                            description: 'Undo recording ID from begin_recording (required for end_recording, cancel_recording)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'node_advanced',
                description: 'Advanced node ops: property/transform/component resets, array element move/remove, prefab restore. Actions: reset_property, reset_transform, reset_component, move_array_element, remove_array_element, restore_prefab.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['reset_property', 'reset_transform', 'reset_component', 'move_array_element', 'remove_array_element', 'restore_prefab'],
                            description: 'The action to perform'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Node or component UUID (reset_property, reset_transform, reset_component, move_array_element, remove_array_element)'
                        },
                        path: {
                            type: 'string',
                            description: 'Property or array property path (reset_property, move_array_element, remove_array_element)'
                        },
                        target: {
                            type: 'number',
                            description: 'Target item original index (move_array_element)'
                        },
                        offset: {
                            type: 'number',
                            description: 'Offset amount, positive or negative (move_array_element)'
                        },
                        index: {
                            type: 'number',
                            description: 'Target item index to remove (remove_array_element)'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID (restore_prefab)'
                        },
                        assetUuid: {
                            type: 'string',
                            description: 'Prefab asset UUID (restore_prefab)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'execute_method',
                description: 'Execute methods on components or scene scripts. Actions: component_method, scene_script.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['component_method', 'scene_script'],
                            description: 'The action to perform'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Component UUID (component_method)'
                        },
                        name: {
                            type: 'string',
                            description: 'Method name (component_method) or plugin name (scene_script)'
                        },
                        method: {
                            type: 'string',
                            description: 'Method name (scene_script)'
                        },
                        args: {
                            type: 'array',
                            description: 'Method arguments (used by both actions)',
                            default: []
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        // `uuid` names a component for execute_method/reset_component and a node
        // elsewhere. Resolving both is still safe: a UUID of either kind is
        // returned untouched, and only a path or a name triggers a node lookup.
        const unresolved = await (0, node_resolver_1.resolveNodeRefFields)(args, ['nodeUuid', 'uuid']);
        if (unresolved) {
            return unresolved;
        }
        switch (toolName) {
            case 'scene_state':
                switch (args.action) {
                    case 'query_ready':
                        return await this.querySceneReady();
                    case 'query_dirty':
                        return await this.querySceneDirty();
                    case 'query_classes':
                        return await this.querySceneClasses(args.extends);
                    case 'query_components':
                        return await this.querySceneComponents(args.filter, args.limit);
                    case 'query_component_has_script':
                        return await this.queryComponentHasScript(args.className);
                    case 'query_nodes_by_asset':
                        return await this.queryNodesByAssetUuid(args.assetUuid);
                    case 'soft_reload':
                        return await this.softReloadScene();
                    case 'snapshot':
                        return await this.sceneSnapshot();
                    case 'snapshot_abort':
                        return await this.sceneSnapshotAbort();
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            case 'scene_undo':
                switch (args.action) {
                    case 'begin_recording':
                        return await this.beginUndoRecording(args.nodeUuid);
                    case 'end_recording':
                        return await this.endUndoRecording(args.undoId);
                    case 'cancel_recording':
                        return await this.cancelUndoRecording(args.undoId);
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            case 'node_advanced':
                switch (args.action) {
                    case 'reset_property':
                        return await this.resetNodeProperty(args.uuid, args.path);
                    case 'reset_transform':
                        return await this.resetNodeTransform(args.uuid);
                    case 'reset_component':
                        return await this.resetComponent(args.uuid);
                    case 'move_array_element':
                        return await this.moveArrayElement(args.uuid, args.path, args.target, args.offset);
                    case 'remove_array_element':
                        return await this.removeArrayElement(args.uuid, args.path, args.index);
                    case 'restore_prefab':
                        return await this.restorePrefab(args.nodeUuid, args.assetUuid);
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            case 'execute_method':
                switch (args.action) {
                    case 'component_method':
                        return await this.executeComponentMethod(args.uuid, args.name, args.args);
                    case 'scene_script':
                        return await this.executeSceneScript(args.name, args.method, args.args);
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async resetNodeProperty(uuid, path) {
        // `reset-property` returns true for a path that does not exist and throws
        // an opaque "Cannot read properties of undefined (reading 'indexOf')" for
        // node.name. Check the dump first so both cases report what is wrong.
        const dump = await (0, editor_request_1.editorRequest)('scene', 'query-node', uuid);
        if (!dump) {
            return { success: false, error: `Node '${uuid}' not found` };
        }
        // Editor paths skip the descriptor wrapper: "position.x" addresses
        // dump.position.value.x, and "__comps__.0.enabled" the component's
        // .value.enabled. Step through .value whenever the key is not direct.
        const prop = path.split('.').reduce((acc, key) => {
            var _a;
            if (acc === undefined || acc === null)
                return undefined;
            if (acc[key] !== undefined)
                return acc[key];
            return (_a = acc.value) === null || _a === void 0 ? void 0 : _a[key];
        }, dump);
        if (prop === undefined) {
            const available = Object.keys(dump).filter(k => !k.startsWith('__')).join(', ');
            return { success: false, error: `Property '${path}' does not exist on this node. Available: ${available}` };
        }
        // Only a top-level node property carries a `default` that says whether a
        // reset means anything. node.name and node.active have none: the engine
        // still answers true but writes "" / false, which is a clobber, not a
        // reset. Nested leaves (position.x, __comps__.0.enabled) are shaped
        // differently and do reset correctly, so the check stays at depth 1.
        const isTopLevel = !path.includes('.');
        if (isTopLevel && ((prop === null || prop === void 0 ? void 0 : prop.default) === null || (prop === null || prop === void 0 ? void 0 : prop.default) === undefined)) {
            return { success: false, error: `Property '${path}' has no default value to reset to. Set it explicitly with node_transform set_property.` };
        }
        return this.editorEdit('reset-property', { uuid, path, dump: { value: null } }, `Property '${path}' reset to default value`, `Could not reset '${path}' on '${uuid}'.`);
    }
    /**
     * Run an editor message that reports failure by *returning* false rather than
     * throwing — reset-property, reset-node and both array operations all do.
     * `toolCall` alone treats any non-throwing result as success, so a wrong path
     * or uuid came back as "moved successfully".
     *
     * `reset-component` is deliberately not routed through here: it returns null
     * whether it worked or not, so its caller validates the uuid up front instead.
     */
    async editorEdit(action, payload, message, failure) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', action, payload), (result) => {
            if (result === false || result === null || result === undefined) {
                throw new Error(failure);
            }
            return { message };
        });
    }
    async moveArrayElement(uuid, path, target, offset) {
        return this.editorEdit('move-array-element', { uuid, path, target, offset }, `Array element at index ${target} moved by ${offset}`, `Could not move element in '${path}' on '${uuid}'. Check that the path names an array property and the node/component uuid is correct.`);
    }
    async removeArrayElement(uuid, path, index) {
        return this.editorEdit('remove-array-element', { uuid, path, index }, `Array element at index ${index} removed`, `Could not remove element from '${path}' on '${uuid}'. Check that the path names an array property and the node/component uuid is correct.`);
    }
    async resetNodeTransform(uuid) {
        return this.editorEdit('reset-node', { uuid }, 'Node transform reset to default', `Could not reset transform on '${uuid}'. Check the node uuid.`);
    }
    async resetComponent(uuid) {
        // Unlike its siblings, `reset-component` always returns null — success and
        // a bogus uuid look identical. Confirm the uuid names a component first,
        // otherwise a node uuid (the likely mistake) reports a silent success.
        const dump = await (0, editor_request_1.editorRequest)('scene', 'query-component', uuid);
        if (!dump) {
            return { success: false, error: `No component with uuid '${uuid}'. This takes a component uuid, not a node uuid — use component_query get_all to find it.` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'reset-component', { uuid }), () => ({ message: `Component '${dump.type || uuid}' reset to default values` }));
    }
    async restorePrefab(nodeUuid, assetUuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'restore-prefab', nodeUuid, assetUuid), () => ({ message: 'Prefab restored successfully' }));
    }
    async executeComponentMethod(uuid, name, args = []) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'execute-component-method', { uuid, name, args }), (result) => ({
            data: {
                result: result,
                message: `Method '${name}' executed successfully`
            }
        }));
    }
    async executeSceneScript(name, method, args = []) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', { name, method, args }), (result) => {
            // Cocos `execute-scene-script` returns the script's actual return value.
            // A non-existent method silently resolves to `undefined`, indistinguishable from a void return.
            // Surface this so callers don't treat missing method as success.
            if (result === undefined) {
                return {
                    data: null,
                    warning: `Plugin '${name}' returned undefined for method '${method}'. This may mean the method does not exist OR the method intentionally returns void. Verify the script defines '${method}' before relying on this call's effect.`
                };
            }
            return { data: result };
        });
    }
    async sceneSnapshot() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'snapshot'), () => ({ message: 'Scene snapshot created' }));
    }
    async sceneSnapshotAbort() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'snapshot-abort'), () => ({ message: 'Scene snapshot aborted' }));
    }
    async beginUndoRecording(nodeUuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'begin-recording', nodeUuid), (undoId) => ({
            data: {
                undoId: undoId,
                message: 'Undo recording started'
            }
        }));
    }
    async endUndoRecording(undoId) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'end-recording', undoId), () => ({ message: 'Undo recording ended' }));
    }
    async cancelUndoRecording(undoId) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'cancel-recording', undoId), () => ({ message: 'Undo recording cancelled' }));
    }
    async softReloadScene() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'soft-reload'), () => ({ message: 'Scene soft reloaded successfully' }));
    }
    async querySceneReady() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-is-ready'), (ready) => ({
            data: {
                ready: ready,
                message: ready ? 'Scene is ready' : 'Scene is not ready'
            }
        }));
    }
    async querySceneDirty() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-dirty'), (dirty) => ({
            data: {
                dirty: dirty,
                message: dirty ? 'Scene has unsaved changes' : 'Scene is clean'
            }
        }));
    }
    async querySceneClasses(extendsClass) {
        const options = {};
        if (extendsClass) {
            options.extends = extendsClass;
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-classes', options), (classes) => ({
            data: {
                classes: classes,
                count: classes.length,
                extendsFilter: extendsClass
            }
        }));
    }
    async querySceneComponents(filter, limit) {
        // Editor returns ~1000+ entries (~170k chars) which can exceed MCP token limits.
        // Slim each entry to {name, cid} and apply optional substring filter + limit.
        const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, 1000) : 200;
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-components'), (components) => {
            let slim = components.map((c) => ({ name: c.name, cid: c.cid }));
            if (filter) {
                const needle = filter.toLowerCase();
                slim = slim.filter((c) => (c.name || '').toLowerCase().includes(needle));
            }
            const total = slim.length;
            const truncated = total > max;
            return {
                data: {
                    components: slim.slice(0, max),
                    count: Math.min(total, max),
                    total,
                    truncated,
                    filter: filter || null
                }
            };
        });
    }
    async queryComponentHasScript(className) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-component-has-script', className), (hasScript) => ({
            data: {
                className: className,
                hasScript: hasScript,
                message: hasScript ? `Component '${className}' has script` : `Component '${className}' does not have script`
            }
        }));
    }
    async queryNodesByAssetUuid(assetUuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'query-nodes-by-asset-uuid', assetUuid), (nodeUuids) => ({
            data: {
                assetUuid: assetUuid,
                nodeUuids: nodeUuids,
                count: nodeUuids.length,
                message: `Found ${nodeUuids.length} nodes using asset`
            }
        }));
    }
}
exports.SceneAdvancedTools = SceneAdvancedTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBQ2xFLDBEQUE4RDtBQUU5RCxNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsZ1JBQWdSO2dCQUM3UixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDOzRCQUM1SyxXQUFXLEVBQUUsdUJBQXVCO3lCQUN2Qzt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG9FQUFvRTt5QkFDcEY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzRUFBc0U7eUJBQ3RGO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsOERBQThEO3lCQUM5RTt3QkFDRCxNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHlFQUF5RTt5QkFDekY7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxpRkFBaUY7eUJBQ2pHO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtZQUNEO2dCQUNJLElBQUks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RUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLGNBQWMsU0FBUyxjQUFjLENBQUMsQ0FBQyxDQUFDLGNBQWMsU0FBUyx3QkFBd0I7YUFDL0c7U0FDSixDQUFDLENBQ0wsQ0FBQztJQUNOLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCLENBQUMsU0FBaUI7UUFDakQsT0FBTyxJQUFBLHlCQUFRLEVBQ1gsR0FBRyxFQUFFLENBQUMsSUFBQSw4QkFBYSxFQUFXLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxTQUFTLENBQUMsRUFDOUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDWixJQUFJLEVBQUU7Z0JBQ0YsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixLQUFLLEVBQUUsU0FBUyxDQUFDLE1BQU07Z0JBQ3ZCLE9BQU8sRUFBRSxTQUFTLFNBQVMsQ0FBQyxNQUFNLG9CQUFvQjthQUN6RDtTQUNKLENBQUMsQ0FDTCxDQUFDO0lBQ04sQ0FBQztDQUNKO0FBcmZELGdEQXFmQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QsIHRvb2xDYWxsIH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgcmVzb2x2ZU5vZGVSZWZGaWVsZHMgfSBmcm9tICcuLi91dGlscy9ub2RlLXJlc29sdmVyJztcblxuZXhwb3J0IGNsYXNzIFNjZW5lQWR2YW5jZWRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3N0YXRlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHNjZW5lIHN0YXRlIC8gbWFuYWdlIHNuYXBzaG90cy4gQWN0aW9uczogcXVlcnlfcmVhZHksIHF1ZXJ5X2RpcnR5ICh1bnNhdmVkIGNoYW5nZXMpLCBxdWVyeV9jbGFzc2VzIChyZWdpc3RlcmVkIGNsYXNzZXMpLCBxdWVyeV9jb21wb25lbnRzIChmaWx0ZXIrbGltaXQgb3B0aW9uYWwsIGRlZmF1bHQgMjAwKSwgcXVlcnlfY29tcG9uZW50X2hhc19zY3JpcHQsIHF1ZXJ5X25vZGVzX2J5X2Fzc2V0LCBzb2Z0X3JlbG9hZCwgc25hcHNob3QsIHNuYXBzaG90X2Fib3J0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncXVlcnlfcmVhZHknLCAncXVlcnlfZGlydHknLCAncXVlcnlfY2xhc3NlcycsICdxdWVyeV9jb21wb25lbnRzJywgJ3F1ZXJ5X2NvbXBvbmVudF9oYXNfc2NyaXB0JywgJ3F1ZXJ5X25vZGVzX2J5X2Fzc2V0JywgJ3NvZnRfcmVsb2FkJywgJ3NuYXBzaG90JywgJ3NuYXBzaG90X2Fib3J0J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBiYXNlIGNsYXNzICh1c2VkIGJ5IHF1ZXJ5X2NsYXNzZXMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NyaXB0IGNsYXNzIG5hbWUgdG8gY2hlY2sgKHJlcXVpcmVkIGZvciBxdWVyeV9jb21wb25lbnRfaGFzX3NjcmlwdCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIHRvIHNlYXJjaCBmb3IgKHJlcXVpcmVkIGZvciBxdWVyeV9ub2Rlc19ieV9hc3NldCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTdWJzdHJpbmcgZmlsdGVyIG9uIGNvbXBvbmVudCBuYW1lIChvcHRpb25hbCwgdXNlZCBieSBxdWVyeV9jb21wb25lbnRzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4IGl0ZW1zIHRvIHJldHVybiAob3B0aW9uYWwsIHVzZWQgYnkgcXVlcnlfY29tcG9uZW50cywgZGVmYXVsdCAyMDAsIG1heCAxMDAwKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV91bmRvJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSB1bmRvIHJlY29yZGluZyBmb3Igc2NlbmUgb3BlcmF0aW9ucy4gQWN0aW9uczogYmVnaW5fcmVjb3JkaW5nIChmb3IgYSBub2RlKSwgZW5kX3JlY29yZGluZywgY2FuY2VsX3JlY29yZGluZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2JlZ2luX3JlY29yZGluZycsICdlbmRfcmVjb3JkaW5nJywgJ2NhbmNlbF9yZWNvcmRpbmcnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIHJlY29yZCAocmVxdWlyZWQgZm9yIGJlZ2luX3JlY29yZGluZyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmRvIHJlY29yZGluZyBJRCBmcm9tIGJlZ2luX3JlY29yZGluZyAocmVxdWlyZWQgZm9yIGVuZF9yZWNvcmRpbmcsIGNhbmNlbF9yZWNvcmRpbmcpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ25vZGVfYWR2YW5jZWQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWR2YW5jZWQgbm9kZSBvcHM6IHByb3BlcnR5L3RyYW5zZm9ybS9jb21wb25lbnQgcmVzZXRzLCBhcnJheSBlbGVtZW50IG1vdmUvcmVtb3ZlLCBwcmVmYWIgcmVzdG9yZS4gQWN0aW9uczogcmVzZXRfcHJvcGVydHksIHJlc2V0X3RyYW5zZm9ybSwgcmVzZXRfY29tcG9uZW50LCBtb3ZlX2FycmF5X2VsZW1lbnQsIHJlbW92ZV9hcnJheV9lbGVtZW50LCByZXN0b3JlX3ByZWZhYi4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3Jlc2V0X3Byb3BlcnR5JywgJ3Jlc2V0X3RyYW5zZm9ybScsICdyZXNldF9jb21wb25lbnQnLCAnbW92ZV9hcnJheV9lbGVtZW50JywgJ3JlbW92ZV9hcnJheV9lbGVtZW50JywgJ3Jlc3RvcmVfcHJlZmFiJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBvciBjb21wb25lbnQgVVVJRCAocmVzZXRfcHJvcGVydHksIHJlc2V0X3RyYW5zZm9ybSwgcmVzZXRfY29tcG9uZW50LCBtb3ZlX2FycmF5X2VsZW1lbnQsIHJlbW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBvciBhcnJheSBwcm9wZXJ0eSBwYXRoIChyZXNldF9wcm9wZXJ0eSwgbW92ZV9hcnJheV9lbGVtZW50LCByZW1vdmVfYXJyYXlfZWxlbWVudCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgaXRlbSBvcmlnaW5hbCBpbmRleCAobW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09mZnNldCBhbW91bnQsIHBvc2l0aXZlIG9yIG5lZ2F0aXZlIChtb3ZlX2FycmF5X2VsZW1lbnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgaXRlbSBpbmRleCB0byByZW1vdmUgKHJlbW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIChyZXN0b3JlX3ByZWZhYiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCAocmVzdG9yZV9wcmVmYWIpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4ZWN1dGVfbWV0aG9kJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4ZWN1dGUgbWV0aG9kcyBvbiBjb21wb25lbnRzIG9yIHNjZW5lIHNjcmlwdHMuIEFjdGlvbnM6IGNvbXBvbmVudF9tZXRob2QsIHNjZW5lX3NjcmlwdC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NvbXBvbmVudF9tZXRob2QnLCAnc2NlbmVfc2NyaXB0J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IFVVSUQgKGNvbXBvbmVudF9tZXRob2QpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01ldGhvZCBuYW1lIChjb21wb25lbnRfbWV0aG9kKSBvciBwbHVnaW4gbmFtZSAoc2NlbmVfc2NyaXB0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01ldGhvZCBuYW1lIChzY2VuZV9zY3JpcHQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIGFyZ3VtZW50cyAodXNlZCBieSBib3RoIGFjdGlvbnMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIGB1dWlkYCBuYW1lcyBhIGNvbXBvbmVudCBmb3IgZXhlY3V0ZV9tZXRob2QvcmVzZXRfY29tcG9uZW50IGFuZCBhIG5vZGVcbiAgICAgICAgLy8gZWxzZXdoZXJlLiBSZXNvbHZpbmcgYm90aCBpcyBzdGlsbCBzYWZlOiBhIFVVSUQgb2YgZWl0aGVyIGtpbmQgaXNcbiAgICAgICAgLy8gcmV0dXJuZWQgdW50b3VjaGVkLCBhbmQgb25seSBhIHBhdGggb3IgYSBuYW1lIHRyaWdnZXJzIGEgbm9kZSBsb29rdXAuXG4gICAgICAgIGNvbnN0IHVucmVzb2x2ZWQgPSBhd2FpdCByZXNvbHZlTm9kZVJlZkZpZWxkcyhhcmdzLCBbJ25vZGVVdWlkJywgJ3V1aWQnXSk7XG4gICAgICAgIGlmICh1bnJlc29sdmVkKSB7IHJldHVybiB1bnJlc29sdmVkOyB9XG5cbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnc2NlbmVfc3RhdGUnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfcmVhZHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZVJlYWR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RpcnR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVEaXJ0eSgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9jbGFzc2VzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVDbGFzc2VzKGFyZ3MuZXh0ZW5kcyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2NvbXBvbmVudHMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZUNvbXBvbmVudHMoYXJncy5maWx0ZXIsIGFyZ3MubGltaXQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9jb21wb25lbnRfaGFzX3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUNvbXBvbmVudEhhc1NjcmlwdChhcmdzLmNsYXNzTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X25vZGVzX2J5X2Fzc2V0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5Tm9kZXNCeUFzc2V0VXVpZChhcmdzLmFzc2V0VXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NvZnRfcmVsb2FkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNvZnRSZWxvYWRTY2VuZSgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzbmFwc2hvdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2VuZVNuYXBzaG90KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NuYXBzaG90X2Fib3J0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNjZW5lU25hcHNob3RBYm9ydCgpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiAnJHthcmdzLmFjdGlvbn0nIGZvciB0b29sICcke3Rvb2xOYW1lfSdgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3VuZG8nOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnYmVnaW5fcmVjb3JkaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJlZ2luVW5kb1JlY29yZGluZyhhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZW5kX3JlY29yZGluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5lbmRVbmRvUmVjb3JkaW5nKGFyZ3MudW5kb0lkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2FuY2VsX3JlY29yZGluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jYW5jZWxVbmRvUmVjb3JkaW5nKGFyZ3MudW5kb0lkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gJyR7YXJncy5hY3Rpb259JyBmb3IgdG9vbCAnJHt0b29sTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYXNlICdub2RlX2FkdmFuY2VkJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X3Byb3BlcnR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0Tm9kZVByb3BlcnR5KGFyZ3MudXVpZCwgYXJncy5wYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzZXRfdHJhbnNmb3JtJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0Tm9kZVRyYW5zZm9ybShhcmdzLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXNldF9jb21wb25lbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXRDb21wb25lbnQoYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnbW92ZV9hcnJheV9lbGVtZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm1vdmVBcnJheUVsZW1lbnQoYXJncy51dWlkLCBhcmdzLnBhdGgsIGFyZ3MudGFyZ2V0LCBhcmdzLm9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlbW92ZV9hcnJheV9lbGVtZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlbW92ZUFycmF5RWxlbWVudChhcmdzLnV1aWQsIGFyZ3MucGF0aCwgYXJncy5pbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc3RvcmVfcHJlZmFiJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc3RvcmVQcmVmYWIoYXJncy5ub2RlVXVpZCwgYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiAnJHthcmdzLmFjdGlvbn0nIGZvciB0b29sICcke3Rvb2xOYW1lfSdgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfbWV0aG9kJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXBvbmVudF9tZXRob2QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZUNvbXBvbmVudE1ldGhvZChhcmdzLnV1aWQsIGFyZ3MubmFtZSwgYXJncy5hcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2NlbmVfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVTY2VuZVNjcmlwdChhcmdzLm5hbWUsIGFyZ3MubWV0aG9kLCBhcmdzLmFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiAnJHthcmdzLmFjdGlvbn0nIGZvciB0b29sICcke3Rvb2xOYW1lfSdgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Tm9kZVByb3BlcnR5KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gYHJlc2V0LXByb3BlcnR5YCByZXR1cm5zIHRydWUgZm9yIGEgcGF0aCB0aGF0IGRvZXMgbm90IGV4aXN0IGFuZCB0aHJvd3NcbiAgICAgICAgLy8gYW4gb3BhcXVlIFwiQ2Fubm90IHJlYWQgcHJvcGVydGllcyBvZiB1bmRlZmluZWQgKHJlYWRpbmcgJ2luZGV4T2YnKVwiIGZvclxuICAgICAgICAvLyBub2RlLm5hbWUuIENoZWNrIHRoZSBkdW1wIGZpcnN0IHNvIGJvdGggY2FzZXMgcmVwb3J0IHdoYXQgaXMgd3JvbmcuXG4gICAgICAgIGNvbnN0IGR1bXA6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcbiAgICAgICAgaWYgKCFkdW1wKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlICcke3V1aWR9JyBub3QgZm91bmRgIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gRWRpdG9yIHBhdGhzIHNraXAgdGhlIGRlc2NyaXB0b3Igd3JhcHBlcjogXCJwb3NpdGlvbi54XCIgYWRkcmVzc2VzXG4gICAgICAgIC8vIGR1bXAucG9zaXRpb24udmFsdWUueCwgYW5kIFwiX19jb21wc19fLjAuZW5hYmxlZFwiIHRoZSBjb21wb25lbnQnc1xuICAgICAgICAvLyAudmFsdWUuZW5hYmxlZC4gU3RlcCB0aHJvdWdoIC52YWx1ZSB3aGVuZXZlciB0aGUga2V5IGlzIG5vdCBkaXJlY3QuXG4gICAgICAgIGNvbnN0IHByb3AgPSBwYXRoLnNwbGl0KCcuJykucmVkdWNlKChhY2M6IGFueSwga2V5KSA9PiB7XG4gICAgICAgICAgICBpZiAoYWNjID09PSB1bmRlZmluZWQgfHwgYWNjID09PSBudWxsKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKGFjY1trZXldICE9PSB1bmRlZmluZWQpIHJldHVybiBhY2Nba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBhY2MudmFsdWU/LltrZXldO1xuICAgICAgICB9LCBkdW1wKTtcbiAgICAgICAgaWYgKHByb3AgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gT2JqZWN0LmtleXMoZHVtcCkuZmlsdGVyKGsgPT4gIWsuc3RhcnRzV2l0aCgnX18nKSkuam9pbignLCAnKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFByb3BlcnR5ICcke3BhdGh9JyBkb2VzIG5vdCBleGlzdCBvbiB0aGlzIG5vZGUuIEF2YWlsYWJsZTogJHthdmFpbGFibGV9YCB9O1xuICAgICAgICB9XG4gICAgICAgIC8vIE9ubHkgYSB0b3AtbGV2ZWwgbm9kZSBwcm9wZXJ0eSBjYXJyaWVzIGEgYGRlZmF1bHRgIHRoYXQgc2F5cyB3aGV0aGVyIGFcbiAgICAgICAgLy8gcmVzZXQgbWVhbnMgYW55dGhpbmcuIG5vZGUubmFtZSBhbmQgbm9kZS5hY3RpdmUgaGF2ZSBub25lOiB0aGUgZW5naW5lXG4gICAgICAgIC8vIHN0aWxsIGFuc3dlcnMgdHJ1ZSBidXQgd3JpdGVzIFwiXCIgLyBmYWxzZSwgd2hpY2ggaXMgYSBjbG9iYmVyLCBub3QgYVxuICAgICAgICAvLyByZXNldC4gTmVzdGVkIGxlYXZlcyAocG9zaXRpb24ueCwgX19jb21wc19fLjAuZW5hYmxlZCkgYXJlIHNoYXBlZFxuICAgICAgICAvLyBkaWZmZXJlbnRseSBhbmQgZG8gcmVzZXQgY29ycmVjdGx5LCBzbyB0aGUgY2hlY2sgc3RheXMgYXQgZGVwdGggMS5cbiAgICAgICAgY29uc3QgaXNUb3BMZXZlbCA9ICFwYXRoLmluY2x1ZGVzKCcuJyk7XG4gICAgICAgIGlmIChpc1RvcExldmVsICYmIChwcm9wPy5kZWZhdWx0ID09PSBudWxsIHx8IHByb3A/LmRlZmF1bHQgPT09IHVuZGVmaW5lZCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFByb3BlcnR5ICcke3BhdGh9JyBoYXMgbm8gZGVmYXVsdCB2YWx1ZSB0byByZXNldCB0by4gU2V0IGl0IGV4cGxpY2l0bHkgd2l0aCBub2RlX3RyYW5zZm9ybSBzZXRfcHJvcGVydHkuYCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZWRpdG9yRWRpdChcbiAgICAgICAgICAgICdyZXNldC1wcm9wZXJ0eScsXG4gICAgICAgICAgICB7IHV1aWQsIHBhdGgsIGR1bXA6IHsgdmFsdWU6IG51bGwgfSB9LFxuICAgICAgICAgICAgYFByb3BlcnR5ICcke3BhdGh9JyByZXNldCB0byBkZWZhdWx0IHZhbHVlYCxcbiAgICAgICAgICAgIGBDb3VsZCBub3QgcmVzZXQgJyR7cGF0aH0nIG9uICcke3V1aWR9Jy5gXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUnVuIGFuIGVkaXRvciBtZXNzYWdlIHRoYXQgcmVwb3J0cyBmYWlsdXJlIGJ5ICpyZXR1cm5pbmcqIGZhbHNlIHJhdGhlciB0aGFuXG4gICAgICogdGhyb3dpbmcg4oCUIHJlc2V0LXByb3BlcnR5LCByZXNldC1ub2RlIGFuZCBib3RoIGFycmF5IG9wZXJhdGlvbnMgYWxsIGRvLlxuICAgICAqIGB0b29sQ2FsbGAgYWxvbmUgdHJlYXRzIGFueSBub24tdGhyb3dpbmcgcmVzdWx0IGFzIHN1Y2Nlc3MsIHNvIGEgd3JvbmcgcGF0aFxuICAgICAqIG9yIHV1aWQgY2FtZSBiYWNrIGFzIFwibW92ZWQgc3VjY2Vzc2Z1bGx5XCIuXG4gICAgICpcbiAgICAgKiBgcmVzZXQtY29tcG9uZW50YCBpcyBkZWxpYmVyYXRlbHkgbm90IHJvdXRlZCB0aHJvdWdoIGhlcmU6IGl0IHJldHVybnMgbnVsbFxuICAgICAqIHdoZXRoZXIgaXQgd29ya2VkIG9yIG5vdCwgc28gaXRzIGNhbGxlciB2YWxpZGF0ZXMgdGhlIHV1aWQgdXAgZnJvbnQgaW5zdGVhZC5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIGVkaXRvckVkaXQoXG4gICAgICAgIGFjdGlvbjogc3RyaW5nLFxuICAgICAgICBwYXlsb2FkOiBhbnksXG4gICAgICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICAgICAgZmFpbHVyZTogc3RyaW5nXG4gICAgKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCBhY3Rpb24gYXMgYW55LCBwYXlsb2FkKSxcbiAgICAgICAgICAgIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09PSBmYWxzZSB8fCByZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZhaWx1cmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4geyBtZXNzYWdlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlQXJyYXlFbGVtZW50KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCB0YXJnZXQ6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5lZGl0b3JFZGl0KFxuICAgICAgICAgICAgJ21vdmUtYXJyYXktZWxlbWVudCcsXG4gICAgICAgICAgICB7IHV1aWQsIHBhdGgsIHRhcmdldCwgb2Zmc2V0IH0sXG4gICAgICAgICAgICBgQXJyYXkgZWxlbWVudCBhdCBpbmRleCAke3RhcmdldH0gbW92ZWQgYnkgJHtvZmZzZXR9YCxcbiAgICAgICAgICAgIGBDb3VsZCBub3QgbW92ZSBlbGVtZW50IGluICcke3BhdGh9JyBvbiAnJHt1dWlkfScuIENoZWNrIHRoYXQgdGhlIHBhdGggbmFtZXMgYW4gYXJyYXkgcHJvcGVydHkgYW5kIHRoZSBub2RlL2NvbXBvbmVudCB1dWlkIGlzIGNvcnJlY3QuYFxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQXJyYXlFbGVtZW50KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCBpbmRleDogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWRpdG9yRWRpdChcbiAgICAgICAgICAgICdyZW1vdmUtYXJyYXktZWxlbWVudCcsXG4gICAgICAgICAgICB7IHV1aWQsIHBhdGgsIGluZGV4IH0sXG4gICAgICAgICAgICBgQXJyYXkgZWxlbWVudCBhdCBpbmRleCAke2luZGV4fSByZW1vdmVkYCxcbiAgICAgICAgICAgIGBDb3VsZCBub3QgcmVtb3ZlIGVsZW1lbnQgZnJvbSAnJHtwYXRofScgb24gJyR7dXVpZH0nLiBDaGVjayB0aGF0IHRoZSBwYXRoIG5hbWVzIGFuIGFycmF5IHByb3BlcnR5IGFuZCB0aGUgbm9kZS9jb21wb25lbnQgdXVpZCBpcyBjb3JyZWN0LmBcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Tm9kZVRyYW5zZm9ybSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5lZGl0b3JFZGl0KFxuICAgICAgICAgICAgJ3Jlc2V0LW5vZGUnLFxuICAgICAgICAgICAgeyB1dWlkIH0sXG4gICAgICAgICAgICAnTm9kZSB0cmFuc2Zvcm0gcmVzZXQgdG8gZGVmYXVsdCcsXG4gICAgICAgICAgICBgQ291bGQgbm90IHJlc2V0IHRyYW5zZm9ybSBvbiAnJHt1dWlkfScuIENoZWNrIHRoZSBub2RlIHV1aWQuYFxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXRDb21wb25lbnQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gVW5saWtlIGl0cyBzaWJsaW5ncywgYHJlc2V0LWNvbXBvbmVudGAgYWx3YXlzIHJldHVybnMgbnVsbCDigJQgc3VjY2VzcyBhbmRcbiAgICAgICAgLy8gYSBib2d1cyB1dWlkIGxvb2sgaWRlbnRpY2FsLiBDb25maXJtIHRoZSB1dWlkIG5hbWVzIGEgY29tcG9uZW50IGZpcnN0LFxuICAgICAgICAvLyBvdGhlcndpc2UgYSBub2RlIHV1aWQgKHRoZSBsaWtlbHkgbWlzdGFrZSkgcmVwb3J0cyBhIHNpbGVudCBzdWNjZXNzLlxuICAgICAgICBjb25zdCBkdW1wOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnQnLCB1dWlkKTtcbiAgICAgICAgaWYgKCFkdW1wKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBObyBjb21wb25lbnQgd2l0aCB1dWlkICcke3V1aWR9Jy4gVGhpcyB0YWtlcyBhIGNvbXBvbmVudCB1dWlkLCBub3QgYSBub2RlIHV1aWQg4oCUIHVzZSBjb21wb25lbnRfcXVlcnkgZ2V0X2FsbCB0byBmaW5kIGl0LmAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LWNvbXBvbmVudCcsIHsgdXVpZCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBDb21wb25lbnQgJyR7ZHVtcC50eXBlIHx8IHV1aWR9JyByZXNldCB0byBkZWZhdWx0IHZhbHVlc2AgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWIobm9kZVV1aWQ6IHN0cmluZywgYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdyZXN0b3JlLXByZWZhYicsIG5vZGVVdWlkLCBhc3NldFV1aWQpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ1ByZWZhYiByZXN0b3JlZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlQ29tcG9uZW50TWV0aG9kKHV1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBhcmdzOiBhbnlbXSA9IFtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdleGVjdXRlLWNvbXBvbmVudC1tZXRob2QnLCB7IHV1aWQsIG5hbWUsIGFyZ3MgfSksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBNZXRob2QgJyR7bmFtZX0nIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjZW5lU2NyaXB0KG5hbWU6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdID0gW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0JywgeyBuYW1lLCBtZXRob2QsIGFyZ3MgfSksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ29jb3MgYGV4ZWN1dGUtc2NlbmUtc2NyaXB0YCByZXR1cm5zIHRoZSBzY3JpcHQncyBhY3R1YWwgcmV0dXJuIHZhbHVlLlxuICAgICAgICAgICAgICAgIC8vIEEgbm9uLWV4aXN0ZW50IG1ldGhvZCBzaWxlbnRseSByZXNvbHZlcyB0byBgdW5kZWZpbmVkYCwgaW5kaXN0aW5ndWlzaGFibGUgZnJvbSBhIHZvaWQgcmV0dXJuLlxuICAgICAgICAgICAgICAgIC8vIFN1cmZhY2UgdGhpcyBzbyBjYWxsZXJzIGRvbid0IHRyZWF0IG1pc3NpbmcgbWV0aG9kIGFzIHN1Y2Nlc3MuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FybmluZzogYFBsdWdpbiAnJHtuYW1lfScgcmV0dXJuZWQgdW5kZWZpbmVkIGZvciBtZXRob2QgJyR7bWV0aG9kfScuIFRoaXMgbWF5IG1lYW4gdGhlIG1ldGhvZCBkb2VzIG5vdCBleGlzdCBPUiB0aGUgbWV0aG9kIGludGVudGlvbmFsbHkgcmV0dXJucyB2b2lkLiBWZXJpZnkgdGhlIHNjcmlwdCBkZWZpbmVzICcke21ldGhvZH0nIGJlZm9yZSByZWx5aW5nIG9uIHRoaXMgY2FsbCdzIGVmZmVjdC5gXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7IGRhdGE6IHJlc3VsdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTbmFwc2hvdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzbmFwc2hvdCcpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ1NjZW5lIHNuYXBzaG90IGNyZWF0ZWQnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzY2VuZVNuYXBzaG90QWJvcnQoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc25hcHNob3QtYWJvcnQnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBhYm9ydGVkJyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5VbmRvUmVjb3JkaW5nKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZz4oJ3NjZW5lJywgJ2JlZ2luLXJlY29yZGluZycsIG5vZGVVdWlkKSxcbiAgICAgICAgICAgICh1bmRvSWQpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1bmRvSWQ6IHVuZG9JZCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1VuZG8gcmVjb3JkaW5nIHN0YXJ0ZWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVuZFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdlbmQtcmVjb3JkaW5nJywgdW5kb0lkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBlbmRlZCcgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNhbmNlbFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjYW5jZWwtcmVjb3JkaW5nJywgdW5kb0lkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBjYW5jZWxsZWQnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzb2Z0UmVsb2FkU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc29mdC1yZWxvYWQnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzb2Z0IHJlbG9hZGVkIHN1Y2Nlc3NmdWxseScgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVSZWFkeSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGJvb2xlYW4+KCdzY2VuZScsICdxdWVyeS1pcy1yZWFkeScpLFxuICAgICAgICAgICAgKHJlYWR5KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiByZWFkeSA/ICdTY2VuZSBpcyByZWFkeScgOiAnU2NlbmUgaXMgbm90IHJlYWR5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lRGlydHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPignc2NlbmUnLCAncXVlcnktZGlydHknKSxcbiAgICAgICAgICAgIChkaXJ0eSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcnR5OiBkaXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGlydHkgPyAnU2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycgOiAnU2NlbmUgaXMgY2xlYW4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVDbGFzc2VzKGV4dGVuZHNDbGFzcz86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGFueSA9IHt9O1xuICAgICAgICBpZiAoZXh0ZW5kc0NsYXNzKSB7XG4gICAgICAgICAgICBvcHRpb25zLmV4dGVuZHMgPSBleHRlbmRzQ2xhc3M7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueVtdPignc2NlbmUnLCAncXVlcnktY2xhc3NlcycsIG9wdGlvbnMpLFxuICAgICAgICAgICAgKGNsYXNzZXMpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzOiBjbGFzc2VzLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogY2xhc3Nlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuZHNGaWx0ZXI6IGV4dGVuZHNDbGFzc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lQ29tcG9uZW50cyhmaWx0ZXI/OiBzdHJpbmcsIGxpbWl0PzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gRWRpdG9yIHJldHVybnMgfjEwMDArIGVudHJpZXMgKH4xNzBrIGNoYXJzKSB3aGljaCBjYW4gZXhjZWVkIE1DUCB0b2tlbiBsaW1pdHMuXG4gICAgICAgIC8vIFNsaW0gZWFjaCBlbnRyeSB0byB7bmFtZSwgY2lkfSBhbmQgYXBwbHkgb3B0aW9uYWwgc3Vic3RyaW5nIGZpbHRlciArIGxpbWl0LlxuICAgICAgICBjb25zdCBtYXggPSB0eXBlb2YgbGltaXQgPT09ICdudW1iZXInICYmIGxpbWl0ID4gMCA/IE1hdGgubWluKGxpbWl0LCAxMDAwKSA6IDIwMDtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudHMnKSxcbiAgICAgICAgICAgIChjb21wb25lbnRzKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNsaW0gPSBjb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoeyBuYW1lOiBjLm5hbWUsIGNpZDogYy5jaWQgfSkpO1xuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmVlZGxlID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNsaW0gPSBzbGltLmZpbHRlcigoYykgPT4gKGMubmFtZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhuZWVkbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgdG90YWwgPSBzbGltLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSB0b3RhbCA+IG1heDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBzbGltLnNsaWNlKDAsIG1heCksXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogTWF0aC5taW4odG90YWwsIG1heCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRydW5jYXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogZmlsdGVyIHx8IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUNvbXBvbmVudEhhc1NjcmlwdChjbGFzc05hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8Ym9vbGVhbj4oJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudC1oYXMtc2NyaXB0JywgY2xhc3NOYW1lKSxcbiAgICAgICAgICAgIChoYXNTY3JpcHQpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IGNsYXNzTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgaGFzU2NyaXB0OiBoYXNTY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGhhc1NjcmlwdCA/IGBDb21wb25lbnQgJyR7Y2xhc3NOYW1lfScgaGFzIHNjcmlwdGAgOiBgQ29tcG9uZW50ICcke2NsYXNzTmFtZX0nIGRvZXMgbm90IGhhdmUgc2NyaXB0YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeU5vZGVzQnlBc3NldFV1aWQoYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZ1tdPignc2NlbmUnLCAncXVlcnktbm9kZXMtYnktYXNzZXQtdXVpZCcsIGFzc2V0VXVpZCksXG4gICAgICAgICAgICAobm9kZVV1aWRzKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkczogbm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogbm9kZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7bm9kZVV1aWRzLmxlbmd0aH0gbm9kZXMgdXNpbmcgYXNzZXRgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG59XG4iXX0=