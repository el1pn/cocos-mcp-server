import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';
import { resolveNodeUuid } from '../utils/node-resolver';

/**
 * Editor scene-view state: gizmo mode, grid, 2D/3D, and camera framing.
 *
 * An earlier version was removed on the grounds that changing editor-only view
 * state was invisible to an AI client. `scene_screenshot` changed that — the view
 * is now observable, so framing it correctly before a capture is what makes the
 * capture useful. Use this to aim the camera, then capture.
 *
 * Every message here is public API of the built-in `scene` extension. Note there
 * is no setter for gizmo view mode (only `query-gizmo-view-mode`), and the snap
 * and zoom messages are internal, so neither is exposed.
 */
export class SceneViewTools implements ToolExecutor {
    private static readonly GIZMO_TOOLS = ['position', 'rotation', 'scale', 'rect'];
    private static readonly PIVOTS = ['pivot', 'center'];
    private static readonly COORDINATES = ['local', 'global'];

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'scene_view',
                description: 'Control the editor scene view: gizmo tool/pivot/coordinate, grid visibility, 2D/3D mode, and camera framing. Use before scene_screenshot to frame what you want to capture. Available actions: get_state, set_gizmo_tool, set_pivot, set_coordinate, set_2d, set_grid, focus, align_with_node.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_state', 'set_gizmo_tool', 'set_pivot', 'set_coordinate', 'set_2d', 'set_grid', 'focus', 'align_with_node'],
                            description: 'Which view operation to perform.'
                        },
                        tool: {
                            type: 'string',
                            enum: ['position', 'rotation', 'scale', 'rect'],
                            description: "Gizmo tool. Required for 'set_gizmo_tool'."
                        },
                        pivot: {
                            type: 'string',
                            enum: ['pivot', 'center'],
                            description: "Gizmo pivot point. Required for 'set_pivot'."
                        },
                        coordinate: {
                            type: 'string',
                            enum: ['local', 'global'],
                            description: "Gizmo coordinate space. Required for 'set_coordinate'."
                        },
                        is2D: {
                            type: 'boolean',
                            description: "True for 2D view, false for 3D. Required for 'set_2d'."
                        },
                        visible: {
                            type: 'boolean',
                            description: "Grid visibility. Required for 'set_grid'."
                        },
                        nodeUuid: {
                            type: 'string',
                            description: "Node UUID, path, or unique name. Required for 'focus' and 'align_with_node'."
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName !== 'scene_view') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }

        switch (args?.action) {
            case 'get_state':
                return this.getState();
            case 'set_gizmo_tool':
                return this.setGizmoTool(args.tool);
            case 'set_pivot':
                return this.setPivot(args.pivot);
            case 'set_coordinate':
                return this.setCoordinate(args.coordinate);
            case 'set_2d':
                return this.set2D(args.is2D);
            case 'set_grid':
                return this.setGrid(args.visible);
            case 'focus':
                return this.focus(args.nodeUuid);
            case 'align_with_node':
                return this.alignWithNode(args.nodeUuid);
            default:
                return {
                    success: false,
                    error: `Unknown action '${args?.action}' for scene_view. Valid actions: get_state, set_gizmo_tool, set_pivot, set_coordinate, set_2d, set_grid, focus, align_with_node`
                };
        }
    }

    /** Read a view property, reporting null rather than failing the whole state query. */
    private async safeQuery(message: string): Promise<any> {
        try {
            return await editorRequest('scene', message as any);
        } catch {
            return null;
        }
    }

    private async getState(): Promise<ToolResponse> {
        const [gizmoTool, pivot, coordinate, viewMode, is2D, gridVisible] = await Promise.all([
            this.safeQuery('query-gizmo-tool-name'),
            this.safeQuery('query-gizmo-pivot'),
            this.safeQuery('query-gizmo-coordinate'),
            this.safeQuery('query-gizmo-view-mode'),
            this.safeQuery('query-is2D'),
            this.safeQuery('query-is-grid-visible')
        ]);

        return {
            success: true,
            data: { gizmoTool, pivot, coordinate, viewMode, is2D, gridVisible }
        };
    }

    /** Validate a value against an allow-list, returning the error response. */
    private checkEnum(value: any, allowed: string[], field: string): ToolResponse | null {
        if (!value) {
            return { success: false, error: `${field} is required. Valid values: ${allowed.join(', ')}` };
        }
        if (!allowed.includes(value)) {
            return { success: false, error: `Invalid ${field} '${value}'. Valid values: ${allowed.join(', ')}` };
        }
        return null;
    }

    private async setGizmoTool(tool: string): Promise<ToolResponse> {
        const bad = this.checkEnum(tool, SceneViewTools.GIZMO_TOOLS, 'tool');
        if (bad) return bad;
        return this.applyChange('change-gizmo-tool', tool, `Gizmo tool set to ${tool}`);
    }

    private async setPivot(pivot: string): Promise<ToolResponse> {
        const bad = this.checkEnum(pivot, SceneViewTools.PIVOTS, 'pivot');
        if (bad) return bad;
        return this.applyChange('change-gizmo-pivot', pivot, `Gizmo pivot set to ${pivot}`);
    }

    private async setCoordinate(coordinate: string): Promise<ToolResponse> {
        const bad = this.checkEnum(coordinate, SceneViewTools.COORDINATES, 'coordinate');
        if (bad) return bad;
        return this.applyChange('change-gizmo-coordinate', coordinate, `Gizmo coordinate set to ${coordinate}`);
    }

    private async set2D(is2D: any): Promise<ToolResponse> {
        if (typeof is2D !== 'boolean') {
            return { success: false, error: 'is2D must be a boolean (true for 2D view, false for 3D)' };
        }
        return this.applyChange('change-is2D', is2D, `Scene view set to ${is2D ? '2D' : '3D'}`);
    }

    private async setGrid(visible: any): Promise<ToolResponse> {
        if (typeof visible !== 'boolean') {
            return { success: false, error: 'visible must be a boolean' };
        }
        return this.applyChange('set-grid-visible', visible, `Grid ${visible ? 'shown' : 'hidden'}`);
    }

    private async applyChange(message: string, value: any, successMessage: string): Promise<ToolResponse> {
        try {
            await editorRequest('scene', message as any, value);
            return { success: true, message: successMessage };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async focus(nodeRef: string): Promise<ToolResponse> {
        return this.cameraOp(nodeRef, 'focus-camera', 'focus', uuid => `Scene view focused on ${uuid}`);
    }

    private async alignWithNode(nodeRef: string): Promise<ToolResponse> {
        return this.cameraOp(nodeRef, 'align-view-with-node', 'align_with_node', uuid => `Scene view aligned with ${uuid}`);
    }

    /**
     * Resolve a node reference then run a camera message against it.
     * `focus-camera` takes an array of uuids; `align-view-with-node` takes one.
     */
    private async cameraOp(
        nodeRef: string,
        message: string,
        action: string,
        describe: (uuid: string) => string
    ): Promise<ToolResponse> {
        if (!nodeRef) {
            return { success: false, error: `nodeUuid is required for '${action}'` };
        }

        let uuid: string;
        try {
            uuid = await resolveNodeUuid(nodeRef);
        } catch (err: any) {
            return { success: false, error: `nodeUuid: ${err.message}` };
        }

        try {
            const payload = message === 'focus-camera' ? [uuid] : uuid;
            await editorRequest('scene', message as any, payload);
            return {
                success: true,
                message: describe(uuid),
                instruction: 'Run scene_screenshot to see the new view.'
            };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }
}
