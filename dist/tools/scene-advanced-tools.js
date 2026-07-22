"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneAdvancedTools = void 0;
const editor_request_1 = require("../utils/editor-request");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQWtFO0FBRWxFLE1BQWEsa0JBQWtCO0lBQzNCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLFdBQVcsRUFBRSxnUkFBZ1I7Z0JBQzdSLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLDRCQUE0QixFQUFFLHNCQUFzQixFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLENBQUM7NEJBQzVLLFdBQVcsRUFBRSx1QkFBdUI7eUJBQ3ZDO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0VBQW9FO3lCQUNwRjt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNFQUFzRTt5QkFDdEY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw4REFBOEQ7eUJBQzlFO3dCQUNELE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUseUVBQXlFO3lCQUN6Rjt3QkFDRCxLQUFLLEVBQUU7NEJBQ0gsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlGQUFpRjt5QkFDakc7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFlBQVk7Z0JB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QUFjLFNBQVMsd0JBQXdCO2FBQy9HO1NBQ0osQ0FBQyxDQUNMLENBQUM7SUFDTixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLFNBQWlCO1FBQ2pELE9BQU8sSUFBQSx5QkFBUSxFQUNYLEdBQUcsRUFBRSxDQUFDLElBQUEsOEJBQWEsRUFBVyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsU0FBUyxDQUFDLEVBQzlFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ1osSUFBSSxFQUFFO2dCQUNGLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixTQUFTLEVBQUUsU0FBUztnQkFDcEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxNQUFNO2dCQUN2QixPQUFPLEVBQUUsU0FBUyxTQUFTLENBQUMsTUFBTSxvQkFBb0I7YUFDekQ7U0FDSixDQUFDLENBQ0wsQ0FBQztJQUNOLENBQUM7Q0FDSjtBQXhhRCxnREF3YUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuZXhwb3J0IGNsYXNzIFNjZW5lQWR2YW5jZWRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3N0YXRlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHNjZW5lIHN0YXRlIC8gbWFuYWdlIHNuYXBzaG90cy4gQWN0aW9uczogcXVlcnlfcmVhZHksIHF1ZXJ5X2RpcnR5ICh1bnNhdmVkIGNoYW5nZXMpLCBxdWVyeV9jbGFzc2VzIChyZWdpc3RlcmVkIGNsYXNzZXMpLCBxdWVyeV9jb21wb25lbnRzIChmaWx0ZXIrbGltaXQgb3B0aW9uYWwsIGRlZmF1bHQgMjAwKSwgcXVlcnlfY29tcG9uZW50X2hhc19zY3JpcHQsIHF1ZXJ5X25vZGVzX2J5X2Fzc2V0LCBzb2Z0X3JlbG9hZCwgc25hcHNob3QsIHNuYXBzaG90X2Fib3J0LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncXVlcnlfcmVhZHknLCAncXVlcnlfZGlydHknLCAncXVlcnlfY2xhc3NlcycsICdxdWVyeV9jb21wb25lbnRzJywgJ3F1ZXJ5X2NvbXBvbmVudF9oYXNfc2NyaXB0JywgJ3F1ZXJ5X25vZGVzX2J5X2Fzc2V0JywgJ3NvZnRfcmVsb2FkJywgJ3NuYXBzaG90JywgJ3NuYXBzaG90X2Fib3J0J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGNsYXNzZXMgdGhhdCBleHRlbmQgdGhpcyBiYXNlIGNsYXNzICh1c2VkIGJ5IHF1ZXJ5X2NsYXNzZXMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2NyaXB0IGNsYXNzIG5hbWUgdG8gY2hlY2sgKHJlcXVpcmVkIGZvciBxdWVyeV9jb21wb25lbnRfaGFzX3NjcmlwdCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIHRvIHNlYXJjaCBmb3IgKHJlcXVpcmVkIGZvciBxdWVyeV9ub2Rlc19ieV9hc3NldCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTdWJzdHJpbmcgZmlsdGVyIG9uIGNvbXBvbmVudCBuYW1lIChvcHRpb25hbCwgdXNlZCBieSBxdWVyeV9jb21wb25lbnRzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4IGl0ZW1zIHRvIHJldHVybiAob3B0aW9uYWwsIHVzZWQgYnkgcXVlcnlfY29tcG9uZW50cywgZGVmYXVsdCAyMDAsIG1heCAxMDAwKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV91bmRvJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSB1bmRvIHJlY29yZGluZyBmb3Igc2NlbmUgb3BlcmF0aW9ucy4gQWN0aW9uczogYmVnaW5fcmVjb3JkaW5nIChmb3IgYSBub2RlKSwgZW5kX3JlY29yZGluZywgY2FuY2VsX3JlY29yZGluZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2JlZ2luX3JlY29yZGluZycsICdlbmRfcmVjb3JkaW5nJywgJ2NhbmNlbF9yZWNvcmRpbmcnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIHJlY29yZCAocmVxdWlyZWQgZm9yIGJlZ2luX3JlY29yZGluZyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5kb0lkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVbmRvIHJlY29yZGluZyBJRCBmcm9tIGJlZ2luX3JlY29yZGluZyAocmVxdWlyZWQgZm9yIGVuZF9yZWNvcmRpbmcsIGNhbmNlbF9yZWNvcmRpbmcpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ25vZGVfYWR2YW5jZWQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWR2YW5jZWQgbm9kZSBvcHM6IHByb3BlcnR5L3RyYW5zZm9ybS9jb21wb25lbnQgcmVzZXRzLCBhcnJheSBlbGVtZW50IG1vdmUvcmVtb3ZlLCBwcmVmYWIgcmVzdG9yZS4gQWN0aW9uczogcmVzZXRfcHJvcGVydHksIHJlc2V0X3RyYW5zZm9ybSwgcmVzZXRfY29tcG9uZW50LCBtb3ZlX2FycmF5X2VsZW1lbnQsIHJlbW92ZV9hcnJheV9lbGVtZW50LCByZXN0b3JlX3ByZWZhYi4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3Jlc2V0X3Byb3BlcnR5JywgJ3Jlc2V0X3RyYW5zZm9ybScsICdyZXNldF9jb21wb25lbnQnLCAnbW92ZV9hcnJheV9lbGVtZW50JywgJ3JlbW92ZV9hcnJheV9lbGVtZW50JywgJ3Jlc3RvcmVfcHJlZmFiJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBvciBjb21wb25lbnQgVVVJRCAocmVzZXRfcHJvcGVydHksIHJlc2V0X3RyYW5zZm9ybSwgcmVzZXRfY29tcG9uZW50LCBtb3ZlX2FycmF5X2VsZW1lbnQsIHJlbW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBvciBhcnJheSBwcm9wZXJ0eSBwYXRoIChyZXNldF9wcm9wZXJ0eSwgbW92ZV9hcnJheV9lbGVtZW50LCByZW1vdmVfYXJyYXlfZWxlbWVudCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgaXRlbSBvcmlnaW5hbCBpbmRleCAobW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09mZnNldCBhbW91bnQsIHBvc2l0aXZlIG9yIG5lZ2F0aXZlIChtb3ZlX2FycmF5X2VsZW1lbnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgaXRlbSBpbmRleCB0byByZW1vdmUgKHJlbW92ZV9hcnJheV9lbGVtZW50KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIChyZXN0b3JlX3ByZWZhYiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmYWIgYXNzZXQgVVVJRCAocmVzdG9yZV9wcmVmYWIpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4ZWN1dGVfbWV0aG9kJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4ZWN1dGUgbWV0aG9kcyBvbiBjb21wb25lbnRzIG9yIHNjZW5lIHNjcmlwdHMuIEFjdGlvbnM6IGNvbXBvbmVudF9tZXRob2QsIHNjZW5lX3NjcmlwdC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NvbXBvbmVudF9tZXRob2QnLCAnc2NlbmVfc2NyaXB0J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IFVVSUQgKGNvbXBvbmVudF9tZXRob2QpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01ldGhvZCBuYW1lIChjb21wb25lbnRfbWV0aG9kKSBvciBwbHVnaW4gbmFtZSAoc2NlbmVfc2NyaXB0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01ldGhvZCBuYW1lIChzY2VuZV9zY3JpcHQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWV0aG9kIGFyZ3VtZW50cyAodXNlZCBieSBib3RoIGFjdGlvbnMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3N0YXRlJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3JlYWR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVSZWFkeSgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9kaXJ0eSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNjZW5lRGlydHkoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfY2xhc3Nlcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNjZW5lQ2xhc3NlcyhhcmdzLmV4dGVuZHMpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9jb21wb25lbnRzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2NlbmVDb21wb25lbnRzKGFyZ3MuZmlsdGVyLCBhcmdzLmxpbWl0KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfY29tcG9uZW50X2hhc19zY3JpcHQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlDb21wb25lbnRIYXNTY3JpcHQoYXJncy5jbGFzc05hbWUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9ub2Rlc19ieV9hc3NldCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeU5vZGVzQnlBc3NldFV1aWQoYXJncy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzb2Z0X3JlbG9hZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zb2Z0UmVsb2FkU2NlbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc25hcHNob3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NlbmVTbmFwc2hvdCgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzbmFwc2hvdF9hYm9ydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2VuZVNuYXBzaG90QWJvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gJyR7YXJncy5hY3Rpb259JyBmb3IgdG9vbCAnJHt0b29sTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYXNlICdzY2VuZV91bmRvJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2JlZ2luX3JlY29yZGluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5iZWdpblVuZG9SZWNvcmRpbmcoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2VuZF9yZWNvcmRpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZW5kVW5kb1JlY29yZGluZyhhcmdzLnVuZG9JZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NhbmNlbF9yZWNvcmRpbmcnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2FuY2VsVW5kb1JlY29yZGluZyhhcmdzLnVuZG9JZCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uICcke2FyZ3MuYWN0aW9ufScgZm9yIHRvb2wgJyR7dG9vbE5hbWV9J2ApO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY2FzZSAnbm9kZV9hZHZhbmNlZCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXNldF9wcm9wZXJ0eSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldE5vZGVQcm9wZXJ0eShhcmdzLnV1aWQsIGFyZ3MucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X3RyYW5zZm9ybSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldE5vZGVUcmFuc2Zvcm0oYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVzZXRfY29tcG9uZW50JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlc2V0Q29tcG9uZW50KGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ21vdmVfYXJyYXlfZWxlbWVudCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5tb3ZlQXJyYXlFbGVtZW50KGFyZ3MudXVpZCwgYXJncy5wYXRoLCBhcmdzLnRhcmdldCwgYXJncy5vZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZW1vdmVfYXJyYXlfZWxlbWVudCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZW1vdmVBcnJheUVsZW1lbnQoYXJncy51dWlkLCBhcmdzLnBhdGgsIGFyZ3MuaW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXN0b3JlX3ByZWZhYic6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXN0b3JlUHJlZmFiKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuYXNzZXRVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gJyR7YXJncy5hY3Rpb259JyBmb3IgdG9vbCAnJHt0b29sTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYXNlICdleGVjdXRlX21ldGhvZCc6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjb21wb25lbnRfbWV0aG9kJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVDb21wb25lbnRNZXRob2QoYXJncy51dWlkLCBhcmdzLm5hbWUsIGFyZ3MuYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlU2NlbmVTY3JpcHQoYXJncy5uYW1lLCBhcmdzLm1ldGhvZCwgYXJncy5hcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gJyR7YXJncy5hY3Rpb259JyBmb3IgdG9vbCAnJHt0b29sTmFtZX0nYCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldE5vZGVQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LXByb3BlcnR5JywgeyB1dWlkLCBwYXRoLCBkdW1wOiB7IHZhbHVlOiBudWxsIH0gfSksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cGF0aH0nIHJlc2V0IHRvIGRlZmF1bHQgdmFsdWVgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlQXJyYXlFbGVtZW50KHV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nLCB0YXJnZXQ6IG51bWJlciwgb2Zmc2V0OiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdtb3ZlLWFycmF5LWVsZW1lbnQnLCB7IHV1aWQsIHBhdGgsIHRhcmdldCwgb2Zmc2V0IH0pLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogYEFycmF5IGVsZW1lbnQgYXQgaW5kZXggJHt0YXJnZXR9IG1vdmVkIGJ5ICR7b2Zmc2V0fWAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUFycmF5RWxlbWVudCh1dWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgaW5kZXg6IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1hcnJheS1lbGVtZW50JywgeyB1dWlkLCBwYXRoLCBpbmRleCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBBcnJheSBlbGVtZW50IGF0IGluZGV4ICR7aW5kZXh9IHJlbW92ZWRgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldE5vZGVUcmFuc2Zvcm0odXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVzZXQtbm9kZScsIHsgdXVpZCB9KSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdOb2RlIHRyYW5zZm9ybSByZXNldCB0byBkZWZhdWx0JyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXRDb21wb25lbnQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncmVzZXQtY29tcG9uZW50JywgeyB1dWlkIH0pLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ0NvbXBvbmVudCByZXNldCB0byBkZWZhdWx0IHZhbHVlcycgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVQcmVmYWIobm9kZVV1aWQ6IHN0cmluZywgYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdyZXN0b3JlLXByZWZhYicsIG5vZGVVdWlkLCBhc3NldFV1aWQpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ1ByZWZhYiByZXN0b3JlZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlQ29tcG9uZW50TWV0aG9kKHV1aWQ6IHN0cmluZywgbmFtZTogc3RyaW5nLCBhcmdzOiBhbnlbXSA9IFtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdzY2VuZScsICdleGVjdXRlLWNvbXBvbmVudC1tZXRob2QnLCB7IHV1aWQsIG5hbWUsIGFyZ3MgfSksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBNZXRob2QgJyR7bmFtZX0nIGV4ZWN1dGVkIHN1Y2Nlc3NmdWxseWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVNjZW5lU2NyaXB0KG5hbWU6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZ3M6IGFueVtdID0gW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0JywgeyBuYW1lLCBtZXRob2QsIGFyZ3MgfSksXG4gICAgICAgICAgICAocmVzdWx0KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ29jb3MgYGV4ZWN1dGUtc2NlbmUtc2NyaXB0YCByZXR1cm5zIHRoZSBzY3JpcHQncyBhY3R1YWwgcmV0dXJuIHZhbHVlLlxuICAgICAgICAgICAgICAgIC8vIEEgbm9uLWV4aXN0ZW50IG1ldGhvZCBzaWxlbnRseSByZXNvbHZlcyB0byBgdW5kZWZpbmVkYCwgaW5kaXN0aW5ndWlzaGFibGUgZnJvbSBhIHZvaWQgcmV0dXJuLlxuICAgICAgICAgICAgICAgIC8vIFN1cmZhY2UgdGhpcyBzbyBjYWxsZXJzIGRvbid0IHRyZWF0IG1pc3NpbmcgbWV0aG9kIGFzIHN1Y2Nlc3MuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgd2FybmluZzogYFBsdWdpbiAnJHtuYW1lfScgcmV0dXJuZWQgdW5kZWZpbmVkIGZvciBtZXRob2QgJyR7bWV0aG9kfScuIFRoaXMgbWF5IG1lYW4gdGhlIG1ldGhvZCBkb2VzIG5vdCBleGlzdCBPUiB0aGUgbWV0aG9kIGludGVudGlvbmFsbHkgcmV0dXJucyB2b2lkLiBWZXJpZnkgdGhlIHNjcmlwdCBkZWZpbmVzICcke21ldGhvZH0nIGJlZm9yZSByZWx5aW5nIG9uIHRoaXMgY2FsbCdzIGVmZmVjdC5gXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7IGRhdGE6IHJlc3VsdCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NlbmVTbmFwc2hvdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdzbmFwc2hvdCcpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ1NjZW5lIHNuYXBzaG90IGNyZWF0ZWQnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzY2VuZVNuYXBzaG90QWJvcnQoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc25hcHNob3QtYWJvcnQnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzbmFwc2hvdCBhYm9ydGVkJyB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmVnaW5VbmRvUmVjb3JkaW5nKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZz4oJ3NjZW5lJywgJ2JlZ2luLXJlY29yZGluZycsIG5vZGVVdWlkKSxcbiAgICAgICAgICAgICh1bmRvSWQpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1bmRvSWQ6IHVuZG9JZCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1VuZG8gcmVjb3JkaW5nIHN0YXJ0ZWQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGVuZFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdlbmQtcmVjb3JkaW5nJywgdW5kb0lkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBlbmRlZCcgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNhbmNlbFVuZG9SZWNvcmRpbmcodW5kb0lkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdjYW5jZWwtcmVjb3JkaW5nJywgdW5kb0lkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdVbmRvIHJlY29yZGluZyBjYW5jZWxsZWQnIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzb2Z0UmVsb2FkU2NlbmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnc29mdC1yZWxvYWQnKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6ICdTY2VuZSBzb2Z0IHJlbG9hZGVkIHN1Y2Nlc3NmdWxseScgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVSZWFkeSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGJvb2xlYW4+KCdzY2VuZScsICdxdWVyeS1pcy1yZWFkeScpLFxuICAgICAgICAgICAgKHJlYWR5KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiByZWFkeSA/ICdTY2VuZSBpcyByZWFkeScgOiAnU2NlbmUgaXMgbm90IHJlYWR5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lRGlydHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPignc2NlbmUnLCAncXVlcnktZGlydHknKSxcbiAgICAgICAgICAgIChkaXJ0eSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcnR5OiBkaXJ0eSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogZGlydHkgPyAnU2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycgOiAnU2NlbmUgaXMgY2xlYW4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2NlbmVDbGFzc2VzKGV4dGVuZHNDbGFzcz86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnM6IGFueSA9IHt9O1xuICAgICAgICBpZiAoZXh0ZW5kc0NsYXNzKSB7XG4gICAgICAgICAgICBvcHRpb25zLmV4dGVuZHMgPSBleHRlbmRzQ2xhc3M7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueVtdPignc2NlbmUnLCAncXVlcnktY2xhc3NlcycsIG9wdGlvbnMpLFxuICAgICAgICAgICAgKGNsYXNzZXMpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc2VzOiBjbGFzc2VzLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogY2xhc3Nlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuZHNGaWx0ZXI6IGV4dGVuZHNDbGFzc1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNjZW5lQ29tcG9uZW50cyhmaWx0ZXI/OiBzdHJpbmcsIGxpbWl0PzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgLy8gRWRpdG9yIHJldHVybnMgfjEwMDArIGVudHJpZXMgKH4xNzBrIGNoYXJzKSB3aGljaCBjYW4gZXhjZWVkIE1DUCB0b2tlbiBsaW1pdHMuXG4gICAgICAgIC8vIFNsaW0gZWFjaCBlbnRyeSB0byB7bmFtZSwgY2lkfSBhbmQgYXBwbHkgb3B0aW9uYWwgc3Vic3RyaW5nIGZpbHRlciArIGxpbWl0LlxuICAgICAgICBjb25zdCBtYXggPSB0eXBlb2YgbGltaXQgPT09ICdudW1iZXInICYmIGxpbWl0ID4gMCA/IE1hdGgubWluKGxpbWl0LCAxMDAwKSA6IDIwMDtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudHMnKSxcbiAgICAgICAgICAgIChjb21wb25lbnRzKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNsaW0gPSBjb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoeyBuYW1lOiBjLm5hbWUsIGNpZDogYy5jaWQgfSkpO1xuICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmVlZGxlID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHNsaW0gPSBzbGltLmZpbHRlcigoYykgPT4gKGMubmFtZSB8fCAnJykudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhuZWVkbGUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgdG90YWwgPSBzbGltLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBjb25zdCB0cnVuY2F0ZWQgPSB0b3RhbCA+IG1heDtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBzbGltLnNsaWNlKDAsIG1heCksXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogTWF0aC5taW4odG90YWwsIG1heCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRydW5jYXRlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogZmlsdGVyIHx8IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUNvbXBvbmVudEhhc1NjcmlwdChjbGFzc05hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8Ym9vbGVhbj4oJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudC1oYXMtc2NyaXB0JywgY2xhc3NOYW1lKSxcbiAgICAgICAgICAgIChoYXNTY3JpcHQpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU6IGNsYXNzTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgaGFzU2NyaXB0OiBoYXNTY3JpcHQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGhhc1NjcmlwdCA/IGBDb21wb25lbnQgJyR7Y2xhc3NOYW1lfScgaGFzIHNjcmlwdGAgOiBgQ29tcG9uZW50ICcke2NsYXNzTmFtZX0nIGRvZXMgbm90IGhhdmUgc2NyaXB0YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeU5vZGVzQnlBc3NldFV1aWQoYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZ1tdPignc2NlbmUnLCAncXVlcnktbm9kZXMtYnktYXNzZXQtdXVpZCcsIGFzc2V0VXVpZCksXG4gICAgICAgICAgICAobm9kZVV1aWRzKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldFV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkczogbm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogbm9kZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7bm9kZVV1aWRzLmxlbmd0aH0gbm9kZXMgdXNpbmcgYXNzZXRgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG59XG4iXX0=