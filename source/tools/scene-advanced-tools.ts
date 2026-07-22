import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest, toolCall } from '../utils/editor-request';

export class SceneAdvancedTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async resetNodeProperty(uuid: string, path: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'reset-property', { uuid, path, dump: { value: null } }),
            () => ({ message: `Property '${path}' reset to default value` })
        );
    }

    private async moveArrayElement(uuid: string, path: string, target: number, offset: number): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'move-array-element', { uuid, path, target, offset }),
            () => ({ message: `Array element at index ${target} moved by ${offset}` })
        );
    }

    private async removeArrayElement(uuid: string, path: string, index: number): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'remove-array-element', { uuid, path, index }),
            () => ({ message: `Array element at index ${index} removed` })
        );
    }

    private async resetNodeTransform(uuid: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'reset-node', { uuid }),
            () => ({ message: 'Node transform reset to default' })
        );
    }

    private async resetComponent(uuid: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'reset-component', { uuid }),
            () => ({ message: 'Component reset to default values' })
        );
    }

    private async restorePrefab(nodeUuid: string, assetUuid: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'restore-prefab', nodeUuid, assetUuid),
            () => ({ message: 'Prefab restored successfully' })
        );
    }

    private async executeComponentMethod(uuid: string, name: string, args: any[] = []): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<any>('scene', 'execute-component-method', { uuid, name, args }),
            (result) => ({
                data: {
                    result: result,
                    message: `Method '${name}' executed successfully`
                }
            })
        );
    }

    private async executeSceneScript(name: string, method: string, args: any[] = []): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<any>('scene', 'execute-scene-script', { name, method, args }),
            (result) => {
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
            }
        );
    }

    private async sceneSnapshot(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'snapshot'),
            () => ({ message: 'Scene snapshot created' })
        );
    }

    private async sceneSnapshotAbort(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'snapshot-abort'),
            () => ({ message: 'Scene snapshot aborted' })
        );
    }

    private async beginUndoRecording(nodeUuid: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<string>('scene', 'begin-recording', nodeUuid),
            (undoId) => ({
                data: {
                    undoId: undoId,
                    message: 'Undo recording started'
                }
            })
        );
    }

    private async endUndoRecording(undoId: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'end-recording', undoId),
            () => ({ message: 'Undo recording ended' })
        );
    }

    private async cancelUndoRecording(undoId: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'cancel-recording', undoId),
            () => ({ message: 'Undo recording cancelled' })
        );
    }

    private async softReloadScene(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('scene', 'soft-reload'),
            () => ({ message: 'Scene soft reloaded successfully' })
        );
    }

    private async querySceneReady(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<boolean>('scene', 'query-is-ready'),
            (ready) => ({
                data: {
                    ready: ready,
                    message: ready ? 'Scene is ready' : 'Scene is not ready'
                }
            })
        );
    }

    private async querySceneDirty(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<boolean>('scene', 'query-dirty'),
            (dirty) => ({
                data: {
                    dirty: dirty,
                    message: dirty ? 'Scene has unsaved changes' : 'Scene is clean'
                }
            })
        );
    }

    private async querySceneClasses(extendsClass?: string): Promise<ToolResponse> {
        const options: any = {};
        if (extendsClass) {
            options.extends = extendsClass;
        }

        return toolCall(
            () => editorRequest<any[]>('scene', 'query-classes', options),
            (classes) => ({
                data: {
                    classes: classes,
                    count: classes.length,
                    extendsFilter: extendsClass
                }
            })
        );
    }

    private async querySceneComponents(filter?: string, limit?: number): Promise<ToolResponse> {
        // Editor returns ~1000+ entries (~170k chars) which can exceed MCP token limits.
        // Slim each entry to {name, cid} and apply optional substring filter + limit.
        const max = typeof limit === 'number' && limit > 0 ? Math.min(limit, 1000) : 200;
        return toolCall(
            () => editorRequest<any[]>('scene', 'query-components'),
            (components) => {
                let slim = components.map((c: any) => ({ name: c.name, cid: c.cid }));
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
            }
        );
    }

    private async queryComponentHasScript(className: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<boolean>('scene', 'query-component-has-script', className),
            (hasScript) => ({
                data: {
                    className: className,
                    hasScript: hasScript,
                    message: hasScript ? `Component '${className}' has script` : `Component '${className}' does not have script`
                }
            })
        );
    }

    private async queryNodesByAssetUuid(assetUuid: string): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<string[]>('scene', 'query-nodes-by-asset-uuid', assetUuid),
            (nodeUuids) => ({
                data: {
                    assetUuid: assetUuid,
                    nodeUuids: nodeUuids,
                    count: nodeUuids.length,
                    message: `Found ${nodeUuids.length} nodes using asset`
                }
            })
        );
    }
}
