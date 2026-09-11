"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneViewTools = void 0;
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
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
class SceneViewTools {
    getTools() {
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
    async execute(toolName, args) {
        if (toolName !== 'scene_view') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }
        switch (args === null || args === void 0 ? void 0 : args.action) {
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
                    error: `Unknown action '${args === null || args === void 0 ? void 0 : args.action}' for scene_view. Valid actions: get_state, set_gizmo_tool, set_pivot, set_coordinate, set_2d, set_grid, focus, align_with_node`
                };
        }
    }
    /** Read a view property, reporting null rather than failing the whole state query. */
    async safeQuery(message) {
        try {
            return await (0, editor_request_1.editorRequest)('scene', message);
        }
        catch (_a) {
            return null;
        }
    }
    async getState() {
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
    checkEnum(value, allowed, field) {
        if (!value) {
            return { success: false, error: `${field} is required. Valid values: ${allowed.join(', ')}` };
        }
        if (!allowed.includes(value)) {
            return { success: false, error: `Invalid ${field} '${value}'. Valid values: ${allowed.join(', ')}` };
        }
        return null;
    }
    async setGizmoTool(tool) {
        const bad = this.checkEnum(tool, SceneViewTools.GIZMO_TOOLS, 'tool');
        if (bad)
            return bad;
        return this.applyChange('change-gizmo-tool', tool, `Gizmo tool set to ${tool}`);
    }
    async setPivot(pivot) {
        const bad = this.checkEnum(pivot, SceneViewTools.PIVOTS, 'pivot');
        if (bad)
            return bad;
        return this.applyChange('change-gizmo-pivot', pivot, `Gizmo pivot set to ${pivot}`);
    }
    async setCoordinate(coordinate) {
        const bad = this.checkEnum(coordinate, SceneViewTools.COORDINATES, 'coordinate');
        if (bad)
            return bad;
        return this.applyChange('change-gizmo-coordinate', coordinate, `Gizmo coordinate set to ${coordinate}`);
    }
    async set2D(is2D) {
        if (typeof is2D !== 'boolean') {
            return { success: false, error: 'is2D must be a boolean (true for 2D view, false for 3D)' };
        }
        return this.applyChange('change-is2D', is2D, `Scene view set to ${is2D ? '2D' : '3D'}`);
    }
    async setGrid(visible) {
        if (typeof visible !== 'boolean') {
            return { success: false, error: 'visible must be a boolean' };
        }
        return this.applyChange('set-grid-visible', visible, `Grid ${visible ? 'shown' : 'hidden'}`);
    }
    async applyChange(message, value, successMessage) {
        try {
            await (0, editor_request_1.editorRequest)('scene', message, value);
            return { success: true, message: successMessage };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async focus(nodeRef) {
        return this.cameraOp(nodeRef, 'focus-camera', 'focus', uuid => `Scene view focused on ${uuid}`);
    }
    async alignWithNode(nodeRef) {
        return this.cameraOp(nodeRef, 'align-view-with-node', 'align_with_node', uuid => `Scene view aligned with ${uuid}`);
    }
    /**
     * Resolve a node reference then run a camera message against it.
     * `focus-camera` takes an array of uuids; `align-view-with-node` takes one.
     */
    async cameraOp(nodeRef, message, action, describe) {
        if (!nodeRef) {
            return { success: false, error: `nodeUuid is required for '${action}'` };
        }
        let uuid;
        try {
            uuid = await (0, node_resolver_1.resolveNodeUuid)(nodeRef);
        }
        catch (err) {
            return { success: false, error: `nodeUuid: ${err.message}` };
        }
        try {
            const payload = message === 'focus-camera' ? [uuid] : uuid;
            await (0, editor_request_1.editorRequest)('scene', message, payload);
            return {
                success: true,
                message: describe(uuid),
                instruction: 'Run scene_screenshot to see the new view.'
            };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
}
exports.SceneViewTools = SceneViewTools;
SceneViewTools.GIZMO_TOOLS = ['position', 'rotation', 'scale', 'rect'];
SceneViewTools.PIVOTS = ['pivot', 'center'];
SceneViewTools.COORDINATES = ['local', 'global'];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdmlldy10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS12aWV3LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDREQUF3RDtBQUN4RCwwREFBeUQ7QUFFekQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFhLGNBQWM7SUFLdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsV0FBVyxFQUFFLGdTQUFnUztnQkFDN1MsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQzs0QkFDdEgsV0FBVyxFQUFFLGtDQUFrQzt5QkFDbEQ7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQzs0QkFDL0MsV0FBVyxFQUFFLDRDQUE0Qzt5QkFDNUQ7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7NEJBQ3pCLFdBQVcsRUFBRSw4Q0FBOEM7eUJBQzlEO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDOzRCQUN6QixXQUFXLEVBQUUsd0RBQXdEO3lCQUN4RTt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLHdE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RUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxhQUFhLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ2pFLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyxPQUFPLEtBQUssY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDM0QsTUFBTSxJQUFBLDhCQUFhLEVBQUMsT0FBTyxFQUFFLE9BQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN0RCxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUN2QixXQUFXLEVBQUUsMkNBQTJDO2FBQzNELENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsT0FBTyxLQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ2xFLENBQUM7SUFDTCxDQUFDOztBQXZNTCx3Q0F3TUM7QUF2TTJCLDBCQUFXLEdBQUcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxxQkFBTSxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzdCLDBCQUFXLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgcmVzb2x2ZU5vZGVVdWlkIH0gZnJvbSAnLi4vdXRpbHMvbm9kZS1yZXNvbHZlcic7XG5cbi8qKlxuICogRWRpdG9yIHNjZW5lLXZpZXcgc3RhdGU6IGdpem1vIG1vZGUsIGdyaWQsIDJELzNELCBhbmQgY2FtZXJhIGZyYW1pbmcuXG4gKlxuICogQW4gZWFybGllciB2ZXJzaW9uIHdhcyByZW1vdmVkIG9uIHRoZSBncm91bmRzIHRoYXQgY2hhbmdpbmcgZWRpdG9yLW9ubHkgdmlld1xuICogc3RhdGUgd2FzIGludmlzaWJsZSB0byBhbiBBSSBjbGllbnQuIGBzY2VuZV9zY3JlZW5zaG90YCBjaGFuZ2VkIHRoYXQg4oCUIHRoZSB2aWV3XG4gKiBpcyBub3cgb2JzZXJ2YWJsZSwgc28gZnJhbWluZyBpdCBjb3JyZWN0bHkgYmVmb3JlIGEgY2FwdHVyZSBpcyB3aGF0IG1ha2VzIHRoZVxuICogY2FwdHVyZSB1c2VmdWwuIFVzZSB0aGlzIHRvIGFpbSB0aGUgY2FtZXJhLCB0aGVuIGNhcHR1cmUuXG4gKlxuICogRXZlcnkgbWVzc2FnZSBoZXJlIGlzIHB1YmxpYyBBUEkgb2YgdGhlIGJ1aWx0LWluIGBzY2VuZWAgZXh0ZW5zaW9uLiBOb3RlIHRoZXJlXG4gKiBpcyBubyBzZXR0ZXIgZm9yIGdpem1vIHZpZXcgbW9kZSAob25seSBgcXVlcnktZ2l6bW8tdmlldy1tb2RlYCksIGFuZCB0aGUgc25hcFxuICogYW5kIHpvb20gbWVzc2FnZXMgYXJlIGludGVybmFsLCBzbyBuZWl0aGVyIGlzIGV4cG9zZWQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2VuZVZpZXdUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgR0laTU9fVE9PTFMgPSBbJ3Bvc2l0aW9uJywgJ3JvdGF0aW9uJywgJ3NjYWxlJywgJ3JlY3QnXTtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBQSVZPVFMgPSBbJ3Bpdm90JywgJ2NlbnRlciddO1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IENPT1JESU5BVEVTID0gWydsb2NhbCcsICdnbG9iYWwnXTtcblxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV92aWV3JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbnRyb2wgdGhlIGVkaXRvciBzY2VuZSB2aWV3OiBnaXptbyB0b29sL3Bpdm90L2Nvb3JkaW5hdGUsIGdyaWQgdmlzaWJpbGl0eSwgMkQvM0QgbW9kZSwgYW5kIGNhbWVyYSBmcmFtaW5nLiBVc2UgYmVmb3JlIHNjZW5lX3NjcmVlbnNob3QgdG8gZnJhbWUgd2hhdCB5b3Ugd2FudCB0byBjYXB0dXJlLiBBdmFpbGFibGUgYWN0aW9uczogZ2V0X3N0YXRlLCBzZXRfZ2l6bW9fdG9vbCwgc2V0X3Bpdm90LCBzZXRfY29vcmRpbmF0ZSwgc2V0XzJkLCBzZXRfZ3JpZCwgZm9jdXMsIGFsaWduX3dpdGhfbm9kZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9zdGF0ZScsICdzZXRfZ2l6bW9fdG9vbCcsICdzZXRfcGl2b3QnLCAnc2V0X2Nvb3JkaW5hdGUnLCAnc2V0XzJkJywgJ3NldF9ncmlkJywgJ2ZvY3VzJywgJ2FsaWduX3dpdGhfbm9kZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hpY2ggdmlldyBvcGVyYXRpb24gdG8gcGVyZm9ybS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncG9zaXRpb24nLCAncm90YXRpb24nLCAnc2NhbGUnLCAncmVjdCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdpem1vIHRvb2wuIFJlcXVpcmVkIGZvciAnc2V0X2dpem1vX3Rvb2wnLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGl2b3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3Bpdm90JywgJ2NlbnRlciddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdpem1vIHBpdm90IHBvaW50LiBSZXF1aXJlZCBmb3IgJ3NldF9waXZvdCcuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjb29yZGluYXRlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydsb2NhbCcsICdnbG9iYWwnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJHaXptbyBjb29yZGluYXRlIHNwYWNlLiBSZXF1aXJlZCBmb3IgJ3NldF9jb29yZGluYXRlJy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzMkQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiVHJ1ZSBmb3IgMkQgdmlldywgZmFsc2UgZm9yIDNELiBSZXF1aXJlZCBmb3IgJ3NldF8yZCcuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIkdyaWQgdmlzaWJpbGl0eS4gUmVxdWlyZWQgZm9yICdzZXRfZ3JpZCcuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRCwgcGF0aCwgb3IgdW5pcXVlIG5hbWUuIFJlcXVpcmVkIGZvciAnZm9jdXMnIGFuZCAnYWxpZ25fd2l0aF9ub2RlJy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICh0b29sTmFtZSAhPT0gJ3NjZW5lX3ZpZXcnKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChhcmdzPy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zdGF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U3RhdGUoKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9naXptb190b29sJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRHaXptb1Rvb2woYXJncy50b29sKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9waXZvdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0UGl2b3QoYXJncy5waXZvdCk7XG4gICAgICAgICAgICBjYXNlICdzZXRfY29vcmRpbmF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0Q29vcmRpbmF0ZShhcmdzLmNvb3JkaW5hdGUpO1xuICAgICAgICAgICAgY2FzZSAnc2V0XzJkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXQyRChhcmdzLmlzMkQpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2dyaWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNldEdyaWQoYXJncy52aXNpYmxlKTtcbiAgICAgICAgICAgIGNhc2UgJ2ZvY3VzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mb2N1cyhhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ2FsaWduX3dpdGhfbm9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWxpZ25XaXRoTm9kZShhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgVW5rbm93biBhY3Rpb24gJyR7YXJncz8uYWN0aW9ufScgZm9yIHNjZW5lX3ZpZXcuIFZhbGlkIGFjdGlvbnM6IGdldF9zdGF0ZSwgc2V0X2dpem1vX3Rvb2wsIHNldF9waXZvdCwgc2V0X2Nvb3JkaW5hdGUsIHNldF8yZCwgc2V0X2dyaWQsIGZvY3VzLCBhbGlnbl93aXRoX25vZGVgXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKiBSZWFkIGEgdmlldyBwcm9wZXJ0eSwgcmVwb3J0aW5nIG51bGwgcmF0aGVyIHRoYW4gZmFpbGluZyB0aGUgd2hvbGUgc3RhdGUgcXVlcnkuICovXG4gICAgcHJpdmF0ZSBhc3luYyBzYWZlUXVlcnkobWVzc2FnZTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsIG1lc3NhZ2UgYXMgYW55KTtcbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U3RhdGUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgW2dpem1vVG9vbCwgcGl2b3QsIGNvb3JkaW5hdGUsIHZpZXdNb2RlLCBpczJELCBncmlkVmlzaWJsZV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICB0aGlzLnNhZmVRdWVyeSgncXVlcnktZ2l6bW8tdG9vbC1uYW1lJyksXG4gICAgICAgICAgICB0aGlzLnNhZmVRdWVyeSgncXVlcnktZ2l6bW8tcGl2b3QnKSxcbiAgICAgICAgICAgIHRoaXMuc2FmZVF1ZXJ5KCdxdWVyeS1naXptby1jb29yZGluYXRlJyksXG4gICAgICAgICAgICB0aGlzLnNhZmVRdWVyeSgncXVlcnktZ2l6bW8tdmlldy1tb2RlJyksXG4gICAgICAgICAgICB0aGlzLnNhZmVRdWVyeSgncXVlcnktaXMyRCcpLFxuICAgICAgICAgICAgdGhpcy5zYWZlUXVlcnkoJ3F1ZXJ5LWlzLWdyaWQtdmlzaWJsZScpXG4gICAgICAgIF0pO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YTogeyBnaXptb1Rvb2wsIHBpdm90LCBjb29yZGluYXRlLCB2aWV3TW9kZSwgaXMyRCwgZ3JpZFZpc2libGUgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKiBWYWxpZGF0ZSBhIHZhbHVlIGFnYWluc3QgYW4gYWxsb3ctbGlzdCwgcmV0dXJuaW5nIHRoZSBlcnJvciByZXNwb25zZS4gKi9cbiAgICBwcml2YXRlIGNoZWNrRW51bSh2YWx1ZTogYW55LCBhbGxvd2VkOiBzdHJpbmdbXSwgZmllbGQ6IHN0cmluZyk6IFRvb2xSZXNwb25zZSB8IG51bGwge1xuICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGAke2ZpZWxkfSBpcyByZXF1aXJlZC4gVmFsaWQgdmFsdWVzOiAke2FsbG93ZWQuam9pbignLCAnKX1gIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhbGxvd2VkLmluY2x1ZGVzKHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCAke2ZpZWxkfSAnJHt2YWx1ZX0nLiBWYWxpZCB2YWx1ZXM6ICR7YWxsb3dlZC5qb2luKCcsICcpfWAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldEdpem1vVG9vbCh0b29sOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBiYWQgPSB0aGlzLmNoZWNrRW51bSh0b29sLCBTY2VuZVZpZXdUb29scy5HSVpNT19UT09MUywgJ3Rvb2wnKTtcbiAgICAgICAgaWYgKGJhZCkgcmV0dXJuIGJhZDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwbHlDaGFuZ2UoJ2NoYW5nZS1naXptby10b29sJywgdG9vbCwgYEdpem1vIHRvb2wgc2V0IHRvICR7dG9vbH1gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldFBpdm90KHBpdm90OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBiYWQgPSB0aGlzLmNoZWNrRW51bShwaXZvdCwgU2NlbmVWaWV3VG9vbHMuUElWT1RTLCAncGl2b3QnKTtcbiAgICAgICAgaWYgKGJhZCkgcmV0dXJuIGJhZDtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwbHlDaGFuZ2UoJ2NoYW5nZS1naXptby1waXZvdCcsIHBpdm90LCBgR2l6bW8gcGl2b3Qgc2V0IHRvICR7cGl2b3R9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRDb29yZGluYXRlKGNvb3JkaW5hdGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGJhZCA9IHRoaXMuY2hlY2tFbnVtKGNvb3JkaW5hdGUsIFNjZW5lVmlld1Rvb2xzLkNPT1JESU5BVEVTLCAnY29vcmRpbmF0ZScpO1xuICAgICAgICBpZiAoYmFkKSByZXR1cm4gYmFkO1xuICAgICAgICByZXR1cm4gdGhpcy5hcHBseUNoYW5nZSgnY2hhbmdlLWdpem1vLWNvb3JkaW5hdGUnLCBjb29yZGluYXRlLCBgR2l6bW8gY29vcmRpbmF0ZSBzZXQgdG8gJHtjb29yZGluYXRlfWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0MkQoaXMyRDogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKHR5cGVvZiBpczJEICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2lzMkQgbXVzdCBiZSBhIGJvb2xlYW4gKHRydWUgZm9yIDJEIHZpZXcsIGZhbHNlIGZvciAzRCknIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwbHlDaGFuZ2UoJ2NoYW5nZS1pczJEJywgaXMyRCwgYFNjZW5lIHZpZXcgc2V0IHRvICR7aXMyRCA/ICcyRCcgOiAnM0QnfWApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0R3JpZCh2aXNpYmxlOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAodHlwZW9mIHZpc2libGUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndmlzaWJsZSBtdXN0IGJlIGEgYm9vbGVhbicgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5hcHBseUNoYW5nZSgnc2V0LWdyaWQtdmlzaWJsZScsIHZpc2libGUsIGBHcmlkICR7dmlzaWJsZSA/ICdzaG93bicgOiAnaGlkZGVuJ31gKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5Q2hhbmdlKG1lc3NhZ2U6IHN0cmluZywgdmFsdWU6IGFueSwgc3VjY2Vzc01lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsIG1lc3NhZ2UgYXMgYW55LCB2YWx1ZSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBzdWNjZXNzTWVzc2FnZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZm9jdXMobm9kZVJlZjogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FtZXJhT3Aobm9kZVJlZiwgJ2ZvY3VzLWNhbWVyYScsICdmb2N1cycsIHV1aWQgPT4gYFNjZW5lIHZpZXcgZm9jdXNlZCBvbiAke3V1aWR9YCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhbGlnbldpdGhOb2RlKG5vZGVSZWY6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbWVyYU9wKG5vZGVSZWYsICdhbGlnbi12aWV3LXdpdGgtbm9kZScsICdhbGlnbl93aXRoX25vZGUnLCB1dWlkID0+IGBTY2VuZSB2aWV3IGFsaWduZWQgd2l0aCAke3V1aWR9YCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUmVzb2x2ZSBhIG5vZGUgcmVmZXJlbmNlIHRoZW4gcnVuIGEgY2FtZXJhIG1lc3NhZ2UgYWdhaW5zdCBpdC5cbiAgICAgKiBgZm9jdXMtY2FtZXJhYCB0YWtlcyBhbiBhcnJheSBvZiB1dWlkczsgYGFsaWduLXZpZXctd2l0aC1ub2RlYCB0YWtlcyBvbmUuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyBjYW1lcmFPcChcbiAgICAgICAgbm9kZVJlZjogc3RyaW5nLFxuICAgICAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgICAgIGFjdGlvbjogc3RyaW5nLFxuICAgICAgICBkZXNjcmliZTogKHV1aWQ6IHN0cmluZykgPT4gc3RyaW5nXG4gICAgKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFub2RlUmVmKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBub2RlVXVpZCBpcyByZXF1aXJlZCBmb3IgJyR7YWN0aW9ufSdgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgdXVpZDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdXVpZCA9IGF3YWl0IHJlc29sdmVOb2RlVXVpZChub2RlUmVmKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYG5vZGVVdWlkOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwYXlsb2FkID0gbWVzc2FnZSA9PT0gJ2ZvY3VzLWNhbWVyYScgPyBbdXVpZF0gOiB1dWlkO1xuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCBtZXNzYWdlIGFzIGFueSwgcGF5bG9hZCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZGVzY3JpYmUodXVpZCksXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdSdW4gc2NlbmVfc2NyZWVuc2hvdCB0byBzZWUgdGhlIG5ldyB2aWV3LidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19