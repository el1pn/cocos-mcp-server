import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class SceneViewTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'gizmo_tool',
                description: 'Manage Gizmo tool, pivot, coordinate system, and view mode. Actions: set_tool, query_tool, set_pivot, query_pivot, set_coordinate, query_coordinate, query_view_mode.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['set_tool', 'query_tool', 'set_pivot', 'query_pivot', 'set_coordinate', 'query_coordinate', 'query_view_mode']
                        },
                        name: {
                            type: 'string',
                            description: 'Tool name (for set_tool: position|rotation|scale|rect) or pivot point (for set_pivot: pivot|center)',
                            enum: ['position', 'rotation', 'scale', 'rect', 'pivot', 'center']
                        },
                        type: {
                            type: 'string',
                            description: 'Coordinate system (for set_coordinate)',
                            enum: ['local', 'global']
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_view',
                description: 'Manage scene view settings including 2D/3D mode, grid visibility, IconGizmo mode and size, status, and reset. Actions: set_2d_3d, query_2d_3d, set_grid_visible, query_grid_visible, set_icon_gizmo_3d, query_icon_gizmo_3d, set_icon_gizmo_size, query_icon_gizmo_size, get_status, reset.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['set_2d_3d', 'query_2d_3d', 'set_grid_visible', 'query_grid_visible', 'set_icon_gizmo_3d', 'query_icon_gizmo_3d', 'set_icon_gizmo_size', 'query_icon_gizmo_size', 'get_status', 'reset']
                        },
                        is2D: {
                            type: 'boolean',
                            description: '2D/3D view mode - true for 2D, false for 3D (for set_2d_3d)'
                        },
                        visible: {
                            type: 'boolean',
                            description: 'Grid visibility (for set_grid_visible)'
                        },
                        is3D: {
                            type: 'boolean',
                            description: '3D/2D IconGizmo - true for 3D, false for 2D (for set_icon_gizmo_3d)'
                        },
                        size: {
                            type: 'number',
                            description: 'IconGizmo size, 10-100 (for set_icon_gizmo_size)',
                            minimum: 10,
                            maximum: 100
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_camera',
                description: 'Control the scene camera: focus on nodes, align camera with view, or align view with a node. Actions: focus_on_nodes, align_with_view, align_view_with_node.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['focus_on_nodes', 'align_with_view', 'align_view_with_node']
                        },
                        uuids: {
                            oneOf: [
                                { type: 'array', items: { type: 'string' } },
                                { type: 'null' }
                            ],
                            description: 'Node UUIDs to focus on, or null for all (for focus_on_nodes)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'gizmo_tool': {
                switch (args.action) {
                    case 'set_tool':
                        return await this.changeGizmoTool(args.name);
                    case 'query_tool':
                        return await this.queryGizmoToolName();
                    case 'set_pivot':
                        return await this.changeGizmoPivot(args.name);
                    case 'query_pivot':
                        return await this.queryGizmoPivot();
                    case 'set_coordinate':
                        return await this.changeGizmoCoordinate(args.type);
                    case 'query_coordinate':
                        return await this.queryGizmoCoordinate();
                    case 'query_view_mode':
                        return await this.queryGizmoViewMode();
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            }
            case 'scene_view': {
                switch (args.action) {
                    case 'set_2d_3d':
                        return await this.changeViewMode2D3D(args.is2D);
                    case 'query_2d_3d':
                        return await this.queryViewMode2D3D();
                    case 'set_grid_visible':
                        return await this.setGridVisible(args.visible);
                    case 'query_grid_visible':
                        return await this.queryGridVisible();
                    case 'set_icon_gizmo_3d':
                        return await this.setIconGizmo3D(args.is3D);
                    case 'query_icon_gizmo_3d':
                        return await this.queryIconGizmo3D();
                    case 'set_icon_gizmo_size':
                        return await this.setIconGizmoSize(args.size);
                    case 'query_icon_gizmo_size':
                        return await this.queryIconGizmoSize();
                    case 'get_status':
                        return await this.getSceneViewStatus();
                    case 'reset':
                        return await this.resetSceneView();
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            }
            case 'scene_camera': {
                switch (args.action) {
                    case 'focus_on_nodes':
                        return await this.focusCameraOnNodes(args.uuids);
                    case 'align_with_view':
                        return await this.alignCameraWithView();
                    case 'align_view_with_node':
                        return await this.alignViewWithNode();
                    default:
                        throw new Error(`Unknown action '${args.action}' for tool '${toolName}'`);
                }
            }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async changeGizmoTool(name: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-tool', name).then(() => {
                resolve({
                    success: true,
                    message: `Gizmo tool changed to '${name}'`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryGizmoToolName(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-tool-name').then((toolName: string) => {
                resolve({
                    success: true,
                    data: {
                        currentTool: toolName,
                        message: `Current Gizmo tool: ${toolName}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async changeGizmoPivot(name: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-pivot', name).then(() => {
                resolve({
                    success: true,
                    message: `Gizmo pivot changed to '${name}'`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryGizmoPivot(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-pivot').then((pivotName: string) => {
                resolve({
                    success: true,
                    data: {
                        currentPivot: pivotName,
                        message: `Current Gizmo pivot: ${pivotName}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryGizmoViewMode(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-view-mode').then((viewMode: string) => {
                resolve({
                    success: true,
                    data: {
                        viewMode: viewMode,
                        message: `Current view mode: ${viewMode}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async changeGizmoCoordinate(type: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-coordinate', type).then(() => {
                resolve({
                    success: true,
                    message: `Coordinate system changed to '${type}'`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryGizmoCoordinate(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-coordinate').then((coordinate: string) => {
                resolve({
                    success: true,
                    data: {
                        coordinate: coordinate,
                        message: `Current coordinate system: ${coordinate}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async changeViewMode2D3D(is2D: boolean): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-is2D', is2D).then(() => {
                resolve({
                    success: true,
                    message: `View mode changed to ${is2D ? '2D' : '3D'}`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryViewMode2D3D(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is2D').then((is2D: boolean) => {
                resolve({
                    success: true,
                    data: {
                        is2D: is2D,
                        viewMode: is2D ? '2D' : '3D',
                        message: `Current view mode: ${is2D ? '2D' : '3D'}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async setGridVisible(visible: boolean): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-grid-visible', visible).then(() => {
                resolve({
                    success: true,
                    message: `Grid ${visible ? 'shown' : 'hidden'}`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryGridVisible(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is-grid-visible').then((visible: boolean) => {
                resolve({
                    success: true,
                    data: {
                        visible: visible,
                        message: `Grid is ${visible ? 'visible' : 'hidden'}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async setIconGizmo3D(is3D: boolean): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-icon-gizmo-3d', is3D).then(() => {
                resolve({
                    success: true,
                    message: `IconGizmo set to ${is3D ? '3D' : '2D'} mode`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryIconGizmo3D(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is-icon-gizmo-3d').then((is3D: boolean) => {
                resolve({
                    success: true,
                    data: {
                        is3D: is3D,
                        mode: is3D ? '3D' : '2D',
                        message: `IconGizmo is in ${is3D ? '3D' : '2D'} mode`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async setIconGizmoSize(size: number): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-icon-gizmo-size', size).then(() => {
                resolve({
                    success: true,
                    message: `IconGizmo size set to ${size}`
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryIconGizmoSize(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-icon-gizmo-size').then((size: number) => {
                resolve({
                    success: true,
                    data: {
                        size: size,
                        message: `IconGizmo size: ${size}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async focusCameraOnNodes(uuids: string[] | null): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'focus-camera', uuids || []).then(() => {
                const message = uuids === null ?
                    'Camera focused on all nodes' :
                    `Camera focused on ${uuids.length} node(s)`;
                resolve({
                    success: true,
                    message: message
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async alignCameraWithView(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'align-with-view').then(() => {
                resolve({
                    success: true,
                    message: 'Scene camera aligned with current view'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async alignViewWithNode(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'align-view-with-node').then(() => {
                resolve({
                    success: true,
                    message: 'View aligned with selected node'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getSceneViewStatus(): Promise<ToolResponse> {
        try {
            // Gather all view status information
            const [
                gizmoTool,
                gizmoPivot,
                gizmoCoordinate,
                viewMode2D3D,
                gridVisible,
                iconGizmo3D,
                iconGizmoSize
            ] = await Promise.allSettled([
                this.queryGizmoToolName(),
                this.queryGizmoPivot(),
                this.queryGizmoCoordinate(),
                this.queryViewMode2D3D(),
                this.queryGridVisible(),
                this.queryIconGizmo3D(),
                this.queryIconGizmoSize()
            ]);

            const status: any = {
                timestamp: new Date().toISOString()
            };

            // Extract data from fulfilled promises
            if (gizmoTool.status === 'fulfilled' && gizmoTool.value.success) {
                status.gizmoTool = gizmoTool.value.data.currentTool;
            }
            if (gizmoPivot.status === 'fulfilled' && gizmoPivot.value.success) {
                status.gizmoPivot = gizmoPivot.value.data.currentPivot;
            }
            if (gizmoCoordinate.status === 'fulfilled' && gizmoCoordinate.value.success) {
                status.coordinate = gizmoCoordinate.value.data.coordinate;
            }
            if (viewMode2D3D.status === 'fulfilled' && viewMode2D3D.value.success) {
                status.is2D = viewMode2D3D.value.data.is2D;
                status.viewMode = viewMode2D3D.value.data.viewMode;
            }
            if (gridVisible.status === 'fulfilled' && gridVisible.value.success) {
                status.gridVisible = gridVisible.value.data.visible;
            }
            if (iconGizmo3D.status === 'fulfilled' && iconGizmo3D.value.success) {
                status.iconGizmo3D = iconGizmo3D.value.data.is3D;
            }
            if (iconGizmoSize.status === 'fulfilled' && iconGizmoSize.value.success) {
                status.iconGizmoSize = iconGizmoSize.value.data.size;
            }

            return {
                success: true,
                data: status
            };

        } catch (err: any) {
            return {
                success: false,
                error: `Failed to get scene view status: ${err.message}`
            };
        }
    }

    private async resetSceneView(): Promise<ToolResponse> {
        try {
            // Reset scene view to default settings
            const resetActions = [
                this.changeGizmoTool('position'),
                this.changeGizmoPivot('pivot'),
                this.changeGizmoCoordinate('local'),
                this.changeViewMode2D3D(false), // 3D mode
                this.setGridVisible(true),
                this.setIconGizmo3D(true),
                this.setIconGizmoSize(60)
            ];

            await Promise.all(resetActions);

            return {
                success: true,
                message: 'Scene view reset to default settings'
            };

        } catch (err: any) {
            return {
                success: false,
                error: `Failed to reset scene view: ${err.message}`
            };
        }
    }
}
