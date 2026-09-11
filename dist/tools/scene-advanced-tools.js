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
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'reset-property', { uuid, path, dump: { value: null } }), () => ({ message: `Property '${path}' reset to default value` }));
    }
    async moveArrayElement(uuid, path, target, offset) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'move-array-element', { uuid, path, target, offset }), () => ({ message: `Array element at index ${target} moved by ${offset}` }));
    }
    async removeArrayElement(uuid, path, index) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'remove-array-element', { uuid, path, index }), () => ({ message: `Array element at index ${index} removed` }));
    }
    async resetNodeTransform(uuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'reset-node', { uuid }), () => ({ message: 'Node transform reset to default' }));
    }
    async resetComponent(uuid) {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('scene', 'reset-component', { uuid }), () => ({ message: 'Component reset to default values' }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBQ2xFLDBEQUE4RDtBQUU5RCxNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsZ1JBQWdSO2dCQUM3UixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSw0QkFBNEIsRUFBRSxzQkFBc0IsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixDQUFDOzRCQUM1SyxXQUFXLEVBQUUsdUJBQXVCO3lCQUN2Qzt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG9FQUFvRTt5QkFDcEY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzRUFBc0U7eUJBQ3RGO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsOERBQThEO3lCQUM5RTt3QkFDRCxNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHlFQUF5RTt5QkFDekY7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxpRkFBaUY7eUJBQ2pHO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtZQUNEO2dCQUNJLElBQUks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VSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsU0FBUyxDQUFDLEVBQzlFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ1osSUFBSSxFQUFFO2dCQUNGLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixTQUFTLEVBQUUsU0FBUztnQkFDcEIsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxTQUFTLGNBQWMsQ0FBQyxDQUFDLENBQUMsY0FBYyxTQUFTLHdCQUF3QjthQUMvRztTQUNKLENBQUMsQ0FDTCxDQUFDO0lBQ04sQ0FBQztJQUVPLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxTQUFpQjtRQUNqRCxPQUFPLElBQUEseUJBQVEsRUFDWCxHQUFHLEVBQUUsQ0FBQyxJQUFBLDhCQUFhLEVBQVcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxFQUM5RSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNaLElBQUksRUFBRTtnQkFDRixTQUFTLEVBQUUsU0FBUztnQkFDcEIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLEtBQUssRUFBRSxTQUFTLENBQUMsTUFBTTtnQkFDdkIsT0FBTyxFQUFFLFNBQVMsU0FBUyxDQUFDLE1BQU0sb0JBQW9CO2FBQ3pEO1NBQ0osQ0FBQyxDQUNMLENBQUM7SUFDTixDQUFDO0NBQ0o7QUE5YUQsZ0RBOGFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyByZXNvbHZlTm9kZVJlZkZpZWxkcyB9IGZyb20gJy4uL3V0aWxzL25vZGUtcmVzb2x2ZXInO1xuXG5leHBvcnQgY2xhc3MgU2NlbmVBZHZhbmNlZFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfc3RhdGUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgc2NlbmUgc3RhdGUgLyBtYW5hZ2Ugc25hcHNob3RzLiBBY3Rpb25zOiBxdWVyeV9yZWFkeSwgcXVlcnlfZGlydHkgKHVuc2F2ZWQgY2hhbmdlcyksIHF1ZXJ5X2NsYXNzZXMgKHJlZ2lzdGVyZWQgY2xhc3NlcyksIHF1ZXJ5X2NvbXBvbmVudHMgKGZpbHRlcitsaW1pdCBvcHRpb25hbCwgZGVmYXVsdCAyMDApLCBxdWVyeV9jb21wb25lbnRfaGFzX3NjcmlwdCwgcXVlcnlfbm9kZXNfYnlfYXNzZXQsIHNvZnRfcmVsb2FkLCBzbmFwc2hvdCwgc25hcHNob3RfYWJvcnQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydxdWVyeV9yZWFkeScsICdxdWVyeV9kaXJ0eScsICdxdWVyeV9jbGFzc2VzJywgJ3F1ZXJ5X2NvbXBvbmVudHMnLCAncXVlcnlfY29tcG9uZW50X2hhc19zY3JpcHQnLCAncXVlcnlfbm9kZXNfYnlfYXNzZXQnLCAnc29mdF9yZWxvYWQnLCAnc25hcHNob3QnLCAnc25hcHNob3RfYWJvcnQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBleHRlbmRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWx0ZXIgY2xhc3NlcyB0aGF0IGV4dGVuZCB0aGlzIGJhc2UgY2xhc3MgKHVzZWQgYnkgcXVlcnlfY2xhc3NlcyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTY3JpcHQgY2xhc3MgbmFtZSB0byBjaGVjayAocmVxdWlyZWQgZm9yIHF1ZXJ5X2NvbXBvbmVudF9oYXNfc2NyaXB0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgdG8gc2VhcmNoIGZvciAocmVxdWlyZWQgZm9yIHF1ZXJ5X25vZGVzX2J5X2Fzc2V0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgb24gY29tcG9uZW50IG5hbWUgKG9wdGlvbmFsLCB1c2VkIGJ5IHF1ZXJ5X2NvbXBvbmVudHMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXggaXRlbXMgdG8gcmV0dXJuIChvcHRpb25hbCwgdXNlZCBieSBxdWVyeV9jb21wb25lbnRzLCBkZWZhdWx0IDIwMCwgbWF4IDEwMDApJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3VuZG8nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlIHVuZG8gcmVjb3JkaW5nIGZvciBzY2VuZSBvcGVyYXRpb25zLiBBY3Rpb25zOiBiZWdpbl9yZWNvcmRpbmcgKGZvciBhIG5vZGUpLCBlbmRfcmVjb3JkaW5nLCBjYW5jZWxfcmVjb3JkaW5nLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYmVnaW5fcmVjb3JkaW5nJywgJ2VuZF9yZWNvcmRpbmcnLCAnY2FuY2VsX3JlY29yZGluZyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgdG8gcmVjb3JkIChyZXF1aXJlZCBmb3IgYmVnaW5fcmVjb3JkaW5nKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1bmRvSWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VuZG8gcmVjb3JkaW5nIElEIGZyb20gYmVnaW5fcmVjb3JkaW5nIChyZXF1aXJlZCBmb3IgZW5kX3JlY29yZGluZywgY2FuY2VsX3JlY29yZGluZyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnbm9kZV9hZHZhbmNlZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZHZhbmNlZCBub2RlIG9wczogcHJvcGVydHkvdHJhbnNmb3JtL2NvbXBvbmVudCByZXNldHMsIGFycmF5IGVsZW1lbnQgbW92ZS9yZW1vdmUsIHByZWZhYiByZXN0b3JlLiBBY3Rpb25zOiByZXNldF9wcm9wZXJ0eSwgcmVzZXRfdHJhbnNmb3JtLCByZXNldF9jb21wb25lbnQsIG1vdmVfYXJyYXlfZWxlbWVudCwgcmVtb3ZlX2FycmF5X2VsZW1lbnQsIHJlc3RvcmVfcHJlZmFiLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncmVzZXRfcHJvcGVydHknLCAncmVzZXRfdHJhbnNmb3JtJywgJ3Jlc2V0X2NvbXBvbmVudCcsICdtb3ZlX2FycmF5X2VsZW1lbnQnLCAncmVtb3ZlX2FycmF5X2VsZW1lbnQnLCAncmVzdG9yZV9wcmVmYWInXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIG9yIGNvbXBvbmVudCBVVUlEIChyZXNldF9wcm9wZXJ0eSwgcmVzZXRfdHJhbnNmb3JtLCByZXNldF9jb21wb25lbnQsIG1vdmVfYXJyYXlfZWxlbWVudCwgcmVtb3ZlX2FycmF5X2VsZW1lbnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb3BlcnR5IG9yIGFycmF5IHByb3BlcnR5IHBhdGggKHJlc2V0X3Byb3BlcnR5LCBtb3ZlX2FycmF5X2VsZW1lbnQsIHJlbW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBpdGVtIG9yaWdpbmFsIGluZGV4IChtb3ZlX2FycmF5X2VsZW1lbnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT2Zmc2V0IGFtb3VudCwgcG9zaXRpdmUgb3IgbmVnYXRpdmUgKG1vdmVfYXJyYXlfZWxlbWVudCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZXg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBpdGVtIGluZGV4IHRvIHJlbW92ZSAocmVtb3ZlX2FycmF5X2VsZW1lbnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgKHJlc3RvcmVfcHJlZmFiKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZhYiBhc3NldCBVVUlEIChyZXN0b3JlX3ByZWZhYiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZXhlY3V0ZV9tZXRob2QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0ZSBtZXRob2RzIG9uIGNvbXBvbmVudHMgb3Igc2NlbmUgc2NyaXB0cy4gQWN0aW9uczogY29tcG9uZW50X21ldGhvZCwgc2NlbmVfc2NyaXB0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY29tcG9uZW50X21ldGhvZCcsICdzY2VuZV9zY3JpcHQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgVVVJRCAoY29tcG9uZW50X21ldGhvZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIG5hbWUgKGNvbXBvbmVudF9tZXRob2QpIG9yIHBsdWdpbiBuYW1lIChzY2VuZV9zY3JpcHQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIG5hbWUgKHNjZW5lX3NjcmlwdCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXRob2QgYXJndW1lbnRzICh1c2VkIGJ5IGJvdGggYWN0aW9ucyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gYHV1aWRgIG5hbWVzIGEgY29tcG9uZW50IGZvciBleGVjdXRlX21ldGhvZC9yZXNldF9jb21wb25lbnQgYW5kIGEgbm9kZVxuICAgICAgICAvLyBlbHNld2hlcmUuIFJlc29sdmluZyBib3RoIGlzIHN0aWxsIHNhZmU6IGEgVVVJRCBvZiBlaXRoZXIga2luZCBpc1xuICAgICAgICAvLyByZXR1cm5lZCB1bnRvdWNoZWQsIGFuZCBvbmx5IGEgcGF0aCBvciBhIG5hbWUgdHJpZ2dlcnMgYSBub2RlIGxvb2t1cC5cbiAgICAgICAgY29uc3QgdW5yZXNvbHZlZCA9IGF3YWl0IHJlc29sdmVOb2RlUmVmRmllbGRzKGFyZ3MsIFsnbm9kZVV1aWQnLCAndXVpZCddKTtcbiAgICAgICAgaWYgKHVucmVzb2x2ZWQpIHsgcmV0dXJuIHVucmVzb2x2ZWQ7IH1cblxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdzY2VuZV9zdGF0ZSc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9yZWFkeSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNjZW5lUmVhZHkoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfZGlydHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZURpcnR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2NsYXNzZXMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTY2VuZUNsYXNzZXMoYXJncy5leHRlbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfY29tcG9uZW50cyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNjZW5lQ29tcG9uZW50cyhhcmdzLmZpbHRlciwgYXJncy5saW1pdCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2NvbXBvbmVudF9oYXNfc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5Q29tcG9uZW50SGFzU2NyaXB0KGFyZ3MuY2xhc3NOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfbm9kZXNfYnlfYXNzZXQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlOb2Rlc0J5QXNzZXRVdWlkKGFyZ3MuYXNzZXRVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc29mdF9yZWxvYWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc29mdFJlbG9hZFNjZW5lKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NuYXBzaG90JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNjZW5lU25hcHNob3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc25hcHNob3RfYWJvcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NlbmVTbmFwc2hvdEFib3J0KCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FyZ3MuYWN0aW9ufScgZm9yIHRvb2wgJyR7dG9vbE5hbWV9J2ApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FzZSAnc2NlbmVfdW5kbyc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdiZWdpbl9yZWNvcmRpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmVnaW5VbmRvUmVjb3JkaW5nKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdlbmRfcmVjb3JkaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmVuZFVuZG9SZWNvcmRpbmcoYXJncy51bmRvSWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjYW5jZWxfcmVjb3JkaW5nJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNhbmNlbFVuZG9SZWNvcmRpbmcoYXJncy51bmRvSWQpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiAnJHthcmdzLmFjdGlvbn0nIGZvciB0b29sICcke3Rvb2xOYW1lfSdgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNhc2UgJ25vZGVfYWR2YW5jZWQnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzZXRfcHJvcGVydHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXROb2RlUHJvcGVydHkoYXJncy51dWlkLCBhcmdzLnBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXNldF90cmFuc2Zvcm0nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXROb2RlVHJhbnNmb3JtKGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X2NvbXBvbmVudCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldENvbXBvbmVudChhcmdzLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdtb3ZlX2FycmF5X2VsZW1lbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubW92ZUFycmF5RWxlbWVudChhcmdzLnV1aWQsIGFyZ3MucGF0aCwgYXJncy50YXJnZXQsIGFyZ3Mub2Zmc2V0KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVtb3ZlX2FycmF5X2VsZW1lbnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlQXJyYXlFbGVtZW50KGFyZ3MudXVpZCwgYXJncy5wYXRoLCBhcmdzLmluZGV4KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzdG9yZV9wcmVmYWInOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzdG9yZVByZWZhYihhcmdzLm5vZGVVdWlkLCBhcmdzLmFzc2V0VXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FyZ3MuYWN0aW9ufScgZm9yIHRvb2wgJyR7dG9vbE5hbWV9J2ApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FzZSAnZXhlY3V0ZV9tZXRob2QnOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcG9uZW50X21ldGhvZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlQ29tcG9uZW50TWV0aG9kKGFyZ3MudXVpZCwgYXJncy5uYW1lLCBhcmdzLmFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzY2VuZV9zY3JpcHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVNjZW5lU2NyaXB0KGFyZ3MubmFtZSwgYXJncy5tZXRob2QsIGFyZ3MuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FyZ3MuYWN0aW9ufScgZm9yIHRvb2wgJyR7dG9vbE5hbWV9J2ApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXROb2RlUHJvcGVydHkodXVpZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdyZXNldC1wcm9wZXJ0eScsIHsgdXVpZCwgcGF0aCwgZHVtcDogeyB2YWx1ZTogbnVsbCB9IH0pLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogYFByb3BlcnR5ICcke3BhdGh9JyByZXNldCB0byBkZWZhdWx0IHZhbHVlYCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbW92ZUFycmF5RWxlbWVudCh1dWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgdGFyZ2V0OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnbW92ZS1hcnJheS1lbGVtZW50JywgeyB1dWlkLCBwYXRoLCB0YXJnZXQsIG9mZnNldCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBBcnJheSBlbGVtZW50IGF0IGluZGV4ICR7dGFyZ2V0fSBtb3ZlZCBieSAke29mZnNldH1gIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmVBcnJheUVsZW1lbnQodXVpZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGluZGV4OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtYXJyYXktZWxlbWVudCcsIHsgdXVpZCwgcGF0aCwgaW5kZXggfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiBgQXJyYXkgZWxlbWVudCBhdCBpbmRleCAke2luZGV4fSByZW1vdmVkYCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXROb2RlVHJhbnNmb3JtKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LW5vZGUnLCB7IHV1aWQgfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnTm9kZSB0cmFuc2Zvcm0gcmVzZXQgdG8gZGVmYXVsdCcgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Q29tcG9uZW50KHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LWNvbXBvbmVudCcsIHsgdXVpZCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdDb21wb25lbnQgcmVzZXQgdG8gZGVmYXVsdCB2YWx1ZXMnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXN0b3JlUHJlZmFiKG5vZGVVdWlkOiBzdHJpbmcsIGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVzdG9yZS1wcmVmYWInLCBub2RlVXVpZCwgYXNzZXRVdWlkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdQcmVmYWIgcmVzdG9yZWQgc3VjY2Vzc2Z1bGx5JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZUNvbXBvbmVudE1ldGhvZCh1dWlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgYXJnczogYW55W10gPSBbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55Pignc2NlbmUnLCAnZXhlY3V0ZS1jb21wb25lbnQtbWV0aG9kJywgeyB1dWlkLCBuYW1lLCBhcmdzIH0pLFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDogcmVzdWx0LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTWV0aG9kICcke25hbWV9JyBleGVjdXRlZCBzdWNjZXNzZnVsbHlgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVTY2VuZVNjcmlwdChuYW1lOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmdzOiBhbnlbXSA9IFtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHsgbmFtZSwgbWV0aG9kLCBhcmdzIH0pLFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENvY29zIGBleGVjdXRlLXNjZW5lLXNjcmlwdGAgcmV0dXJucyB0aGUgc2NyaXB0J3MgYWN0dWFsIHJldHVybiB2YWx1ZS5cbiAgICAgICAgICAgICAgICAvLyBBIG5vbi1leGlzdGVudCBtZXRob2Qgc2lsZW50bHkgcmVzb2x2ZXMgdG8gYHVuZGVmaW5lZGAsIGluZGlzdGluZ3Vpc2hhYmxlIGZyb20gYSB2b2lkIHJldHVybi5cbiAgICAgICAgICAgICAgICAvLyBTdXJmYWNlIHRoaXMgc28gY2FsbGVycyBkb24ndCB0cmVhdCBtaXNzaW5nIG1ldGhvZCBhcyBzdWNjZXNzLlxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm5pbmc6IGBQbHVnaW4gJyR7bmFtZX0nIHJldHVybmVkIHVuZGVmaW5lZCBmb3IgbWV0aG9kICcke21ldGhvZH0nLiBUaGlzIG1heSBtZWFuIHRoZSBtZXRob2QgZG9lcyBub3QgZXhpc3QgT1IgdGhlIG1ldGhvZCBpbnRlbnRpb25hbGx5IHJldHVybnMgdm9pZC4gVmVyaWZ5IHRoZSBzY3JpcHQgZGVmaW5lcyAnJHttZXRob2R9JyBiZWZvcmUgcmVseWluZyBvbiB0aGlzIGNhbGwncyBlZmZlY3QuYFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4geyBkYXRhOiByZXN1bHQgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNjZW5lU25hcHNob3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc25hcHNob3QnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBjcmVhdGVkJyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTbmFwc2hvdEFib3J0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NuYXBzaG90LWFib3J0JyksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnU2NlbmUgc25hcHNob3QgYWJvcnRlZCcgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJlZ2luVW5kb1JlY29yZGluZyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxzdHJpbmc+KCdzY2VuZScsICdiZWdpbi1yZWNvcmRpbmcnLCBub2RlVXVpZCksXG4gICAgICAgICAgICAodW5kb0lkKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB1bmRvSWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBzdGFydGVkJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBlbmRVbmRvUmVjb3JkaW5nKHVuZG9JZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZW5kLXJlY29yZGluZycsIHVuZG9JZCksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnVW5kbyByZWNvcmRpbmcgZW5kZWQnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjYW5jZWxVbmRvUmVjb3JkaW5nKHVuZG9JZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnY2FuY2VsLXJlY29yZGluZycsIHVuZG9JZCksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnVW5kbyByZWNvcmRpbmcgY2FuY2VsbGVkJyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc29mdFJlbG9hZFNjZW5lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3NvZnQtcmVsb2FkJyksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiAnU2NlbmUgc29mdCByZWxvYWRlZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lUmVhZHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPignc2NlbmUnLCAncXVlcnktaXMtcmVhZHknKSxcbiAgICAgICAgICAgIChyZWFkeSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWR5OiByZWFkeSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVhZHkgPyAnU2NlbmUgaXMgcmVhZHknIDogJ1NjZW5lIGlzIG5vdCByZWFkeSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTY2VuZURpcnR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8Ym9vbGVhbj4oJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5JyksXG4gICAgICAgICAgICAoZGlydHkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBkaXJ0eTogZGlydHksXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGRpcnR5ID8gJ1NjZW5lIGhhcyB1bnNhdmVkIGNoYW5nZXMnIDogJ1NjZW5lIGlzIGNsZWFuJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lQ2xhc3NlcyhleHRlbmRzQ2xhc3M/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7fTtcbiAgICAgICAgaWYgKGV4dGVuZHNDbGFzcykge1xuICAgICAgICAgICAgb3B0aW9ucy5leHRlbmRzID0gZXh0ZW5kc0NsYXNzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ3NjZW5lJywgJ3F1ZXJ5LWNsYXNzZXMnLCBvcHRpb25zKSxcbiAgICAgICAgICAgIChjbGFzc2VzKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NlczogY2xhc3NlcyxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IGNsYXNzZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBleHRlbmRzRmlsdGVyOiBleHRlbmRzQ2xhc3NcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTY2VuZUNvbXBvbmVudHMoZmlsdGVyPzogc3RyaW5nLCBsaW1pdD86IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIEVkaXRvciByZXR1cm5zIH4xMDAwKyBlbnRyaWVzICh+MTcwayBjaGFycykgd2hpY2ggY2FuIGV4Y2VlZCBNQ1AgdG9rZW4gbGltaXRzLlxuICAgICAgICAvLyBTbGltIGVhY2ggZW50cnkgdG8ge25hbWUsIGNpZH0gYW5kIGFwcGx5IG9wdGlvbmFsIHN1YnN0cmluZyBmaWx0ZXIgKyBsaW1pdC5cbiAgICAgICAgY29uc3QgbWF4ID0gdHlwZW9mIGxpbWl0ID09PSAnbnVtYmVyJyAmJiBsaW1pdCA+IDAgPyBNYXRoLm1pbihsaW1pdCwgMTAwMCkgOiAyMDA7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55W10+KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnRzJyksXG4gICAgICAgICAgICAoY29tcG9uZW50cykgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzbGltID0gY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gKHsgbmFtZTogYy5uYW1lLCBjaWQ6IGMuY2lkIH0pKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5lZWRsZSA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICBzbGltID0gc2xpbS5maWx0ZXIoKGMpID0+IChjLm5hbWUgfHwgJycpLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobmVlZGxlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHRvdGFsID0gc2xpbS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkID0gdG90YWwgPiBtYXg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czogc2xpbS5zbGljZSgwLCBtYXgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IE1hdGgubWluKHRvdGFsLCBtYXgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWwsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnVuY2F0ZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IGZpbHRlciB8fCBudWxsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlDb21wb25lbnRIYXNTY3JpcHQoY2xhc3NOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGJvb2xlYW4+KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnQtaGFzLXNjcmlwdCcsIGNsYXNzTmFtZSksXG4gICAgICAgICAgICAoaGFzU2NyaXB0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lOiBjbGFzc05hbWUsXG4gICAgICAgICAgICAgICAgICAgIGhhc1NjcmlwdDogaGFzU2NyaXB0LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBoYXNTY3JpcHQgPyBgQ29tcG9uZW50ICcke2NsYXNzTmFtZX0nIGhhcyBzY3JpcHRgIDogYENvbXBvbmVudCAnJHtjbGFzc05hbWV9JyBkb2VzIG5vdCBoYXZlIHNjcmlwdGBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlOb2Rlc0J5QXNzZXRVdWlkKGFzc2V0VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxzdHJpbmdbXT4oJ3NjZW5lJywgJ3F1ZXJ5LW5vZGVzLWJ5LWFzc2V0LXV1aWQnLCBhc3NldFV1aWQpLFxuICAgICAgICAgICAgKG5vZGVVdWlkcykgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogYXNzZXRVdWlkLFxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZHM6IG5vZGVVdWlkcyxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IG5vZGVVdWlkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke25vZGVVdWlkcy5sZW5ndGh9IG5vZGVzIHVzaW5nIGFzc2V0YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxufVxuIl19