"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneCaptureTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Captures a clean PNG render of the currently-open scene/prefab from the editor.
 *
 * Rendering is delegated to the scene-script method `captureSceneView` (see
 * source/scene.ts), which uses an offscreen clone camera + RenderTexture so the
 * result contains no editor gizmos/grid and the open scene is left untouched.
 * The scene side returns the PNG (and, in preview mode, a resized copy) as base64;
 * this side always writes the full-resolution PNG to disk, and additionally
 * returns an inline MCP image content block per `responseMode` (see ToolResponse.imageContent).
 */
class SceneCaptureTools {
    getTools() {
        return [
            {
                name: 'scene_screenshot',
                description: 'Capture a clean PNG render of the currently-open scene/prefab. Renders through an offscreen clone camera + RenderTexture, so there are no editor gizmos/grid and the open scene is not modified. Actions: capture_scene (auto-pick the main 2D/UI camera), capture_camera (render a specific Camera node via cameraUuid), capture_node (frame a single node by its world bounding box via nodeUuid). The result includes a `mapping` object that converts scene world coordinates <-> image pixels (orthographic cameras map within 1px), so you can measure how far a node is from its target pixel position, adjust its position, and re-capture to verify. responseMode controls how the image is returned: preview (default) returns a resized inline image (fast visual check, low token cost) plus writes the full-resolution PNG to disk; full returns the full-resolution image inline (use for small text/pixel-level inspection); path_only writes the PNG to disk and returns only the file path, no inline image (use when only measuring via `mapping`, not looking at pixels). Typical use: set width/height to match a design mockup, capture with responseMode preview, compare, measure offsets, fix, re-capture.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['capture_scene', 'capture_camera', 'capture_node'],
                            description: 'What to capture: capture_scene (auto main camera), capture_camera (specific camera), capture_node (frame one node)'
                        },
                        cameraUuid: {
                            type: 'string',
                            description: 'Camera node UUID. Required for action capture_camera.'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'Node UUID to frame. Required for action capture_node.'
                        },
                        width: {
                            type: 'number',
                            description: 'Output image width in pixels (1-2048, default 1920).'
                        },
                        height: {
                            type: 'number',
                            description: 'Output image height in pixels (1-2048, default 1080).'
                        },
                        outputPath: {
                            type: 'string',
                            description: 'Absolute file path to write the PNG. If omitted, an auto path under <project>/temp/mcp-screenshots/ is used. Relative paths are resolved against the project root.'
                        },
                        backgroundColor: {
                            type: 'object',
                            description: 'Solid background color, components 0-255. Default opaque black {r:0,g:0,b:0,a:255}. Set a:0 for a transparent background.',
                            properties: {
                                r: { type: 'number' },
                                g: { type: 'number' },
                                b: { type: 'number' },
                                a: { type: 'number' }
                            }
                        },
                        responseMode: {
                            type: 'string',
                            enum: ['preview', 'full', 'path_only'],
                            description: 'preview (default): resized inline image for a fast visual check. full: full-resolution inline image, use for small text/pixel-level inspection. path_only: no inline image, only file path (lowest cost, use for coordinate measurement via `mapping` only).'
                        },
                        previewMaxWidth: {
                            type: 'number',
                            description: 'Max width for the inline preview image in responseMode "preview" (default 960). Never upscales.'
                        },
                        previewMaxHeight: {
                            type: 'number',
                            description: 'Max height for the inline preview image in responseMode "preview" (default 540). Never upscales.'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(_toolName, args) {
        switch (args.action) {
            case 'capture_scene':
                return this.capture('scene', args);
            case 'capture_camera':
                return this.capture('camera', args);
            case 'capture_node':
                return this.capture('node', args);
            default:
                return { success: false, error: `Unknown action: ${args.action}` };
        }
    }
    async capture(mode, args) {
        try {
            if (mode === 'camera' && !args.cameraUuid) {
                return { success: false, error: 'cameraUuid is required for capture_camera' };
            }
            if (mode === 'node' && !args.nodeUuid) {
                return { success: false, error: 'nodeUuid is required for capture_node' };
            }
            const responseMode = args.responseMode || 'preview';
            if (!['preview', 'full', 'path_only'].includes(responseMode)) {
                return { success: false, error: `Invalid responseMode: ${responseMode}. Use one of: preview, full, path_only` };
            }
            const dirtyBefore = await this.queryDirty();
            const opts = {
                mode,
                cameraUuid: args.cameraUuid,
                nodeUuid: args.nodeUuid,
                width: args.width,
                height: args.height,
                backgroundColor: args.backgroundColor
            };
            if (responseMode === 'preview') {
                opts.previewMaxWidth = args.previewMaxWidth || 960;
                opts.previewMaxHeight = args.previewMaxHeight || 540;
            }
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'captureSceneView',
                args: [opts]
            });
            if (!result || !result.success) {
                return { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Capture failed in scene context', instruction: result === null || result === void 0 ? void 0 : result.instruction };
            }
            const data = result.data || {};
            const pngBase64 = data.pngBase64;
            if (!pngBase64) {
                return { success: false, error: 'Scene capture returned no image data', instruction: 'Retry the capture; if it persists, this indicates a bug in captureSceneView, not a bad request.' };
            }
            const buffer = Buffer.from(pngBase64, 'base64');
            const outPath = this.resolveOutputPath(args.outputPath, mode);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, buffer);
            const dirtyAfter = await this.queryDirty();
            let imageContent;
            let instruction;
            if (responseMode === 'full') {
                imageContent = [{ mimeType: 'image/png', base64: pngBase64 }];
            }
            else if (responseMode === 'preview') {
                imageContent = [{ mimeType: 'image/png', base64: data.previewBase64 || pngBase64 }];
            }
            else {
                instruction = `Open the PNG with the Read tool to view it: ${outPath}`;
            }
            return {
                success: true,
                data: {
                    path: outPath,
                    width: data.width,
                    height: data.height,
                    mode,
                    cameraNodeUuid: data.cameraNodeUuid,
                    cameraNodeName: data.cameraNodeName,
                    mapping: data.mapping,
                    bytes: buffer.length,
                    sceneDirtyBefore: dirtyBefore,
                    sceneDirtyAfter: dirtyAfter,
                    responseMode,
                    previewWidth: data.previewWidth,
                    previewHeight: data.previewHeight
                },
                imageContent,
                instruction
            };
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    }
    resolveOutputPath(outputPath, mode) {
        if (outputPath && outputPath.trim()) {
            return path.isAbsolute(outputPath) ? outputPath : path.join(Editor.Project.path, outputPath);
        }
        const dir = path.join(Editor.Project.path, 'temp', 'mcp-screenshots');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        return path.join(dir, `${mode}-${ts}.png`);
    }
    async queryDirty() {
        try {
            return (await Editor.Message.request('scene', 'query-dirty'));
        }
        catch (e) {
            return null;
        }
    }
}
exports.SceneCaptureTools = SceneCaptureTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtY2FwdHVyZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS1jYXB0dXJlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFHN0I7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxpQkFBaUI7SUFDMUIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQUUsb3FDQUFvcUM7Z0JBQ2pyQyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDOzRCQUN6RCxXQUFXLEVBQUUsb0hBQW9IO3lCQUNwSTt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHVEQUF1RDt5QkFDdkU7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1REFBdUQ7eUJBQ3ZFO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0RBQXNEO3lCQUN0RTt3QkFDRCxNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHVEQUF1RDt5QkFDdkU7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxvS0FBb0s7eUJBQ3BMO3dCQUNELGVBQWUsRUFBRTs0QkFDYixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkhBQTJIOzRCQUN4SSxVQUFVLEVBQUU7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aEIsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQXBMRCw4Q0FvTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG4vKipcbiAqIENhcHR1cmVzIGEgY2xlYW4gUE5HIHJlbmRlciBvZiB0aGUgY3VycmVudGx5LW9wZW4gc2NlbmUvcHJlZmFiIGZyb20gdGhlIGVkaXRvci5cbiAqXG4gKiBSZW5kZXJpbmcgaXMgZGVsZWdhdGVkIHRvIHRoZSBzY2VuZS1zY3JpcHQgbWV0aG9kIGBjYXB0dXJlU2NlbmVWaWV3YCAoc2VlXG4gKiBzb3VyY2Uvc2NlbmUudHMpLCB3aGljaCB1c2VzIGFuIG9mZnNjcmVlbiBjbG9uZSBjYW1lcmEgKyBSZW5kZXJUZXh0dXJlIHNvIHRoZVxuICogcmVzdWx0IGNvbnRhaW5zIG5vIGVkaXRvciBnaXptb3MvZ3JpZCBhbmQgdGhlIG9wZW4gc2NlbmUgaXMgbGVmdCB1bnRvdWNoZWQuXG4gKiBUaGUgc2NlbmUgc2lkZSByZXR1cm5zIHRoZSBQTkcgKGFuZCwgaW4gcHJldmlldyBtb2RlLCBhIHJlc2l6ZWQgY29weSkgYXMgYmFzZTY0O1xuICogdGhpcyBzaWRlIGFsd2F5cyB3cml0ZXMgdGhlIGZ1bGwtcmVzb2x1dGlvbiBQTkcgdG8gZGlzaywgYW5kIGFkZGl0aW9uYWxseVxuICogcmV0dXJucyBhbiBpbmxpbmUgTUNQIGltYWdlIGNvbnRlbnQgYmxvY2sgcGVyIGByZXNwb25zZU1vZGVgIChzZWUgVG9vbFJlc3BvbnNlLmltYWdlQ29udGVudCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2VuZUNhcHR1cmVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3NjcmVlbnNob3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FwdHVyZSBhIGNsZWFuIFBORyByZW5kZXIgb2YgdGhlIGN1cnJlbnRseS1vcGVuIHNjZW5lL3ByZWZhYi4gUmVuZGVycyB0aHJvdWdoIGFuIG9mZnNjcmVlbiBjbG9uZSBjYW1lcmEgKyBSZW5kZXJUZXh0dXJlLCBzbyB0aGVyZSBhcmUgbm8gZWRpdG9yIGdpem1vcy9ncmlkIGFuZCB0aGUgb3BlbiBzY2VuZSBpcyBub3QgbW9kaWZpZWQuIEFjdGlvbnM6IGNhcHR1cmVfc2NlbmUgKGF1dG8tcGljayB0aGUgbWFpbiAyRC9VSSBjYW1lcmEpLCBjYXB0dXJlX2NhbWVyYSAocmVuZGVyIGEgc3BlY2lmaWMgQ2FtZXJhIG5vZGUgdmlhIGNhbWVyYVV1aWQpLCBjYXB0dXJlX25vZGUgKGZyYW1lIGEgc2luZ2xlIG5vZGUgYnkgaXRzIHdvcmxkIGJvdW5kaW5nIGJveCB2aWEgbm9kZVV1aWQpLiBUaGUgcmVzdWx0IGluY2x1ZGVzIGEgYG1hcHBpbmdgIG9iamVjdCB0aGF0IGNvbnZlcnRzIHNjZW5lIHdvcmxkIGNvb3JkaW5hdGVzIDwtPiBpbWFnZSBwaXhlbHMgKG9ydGhvZ3JhcGhpYyBjYW1lcmFzIG1hcCB3aXRoaW4gMXB4KSwgc28geW91IGNhbiBtZWFzdXJlIGhvdyBmYXIgYSBub2RlIGlzIGZyb20gaXRzIHRhcmdldCBwaXhlbCBwb3NpdGlvbiwgYWRqdXN0IGl0cyBwb3NpdGlvbiwgYW5kIHJlLWNhcHR1cmUgdG8gdmVyaWZ5LiByZXNwb25zZU1vZGUgY29udHJvbHMgaG93IHRoZSBpbWFnZSBpcyByZXR1cm5lZDogcHJldmlldyAoZGVmYXVsdCkgcmV0dXJucyBhIHJlc2l6ZWQgaW5saW5lIGltYWdlIChmYXN0IHZpc3VhbCBjaGVjaywgbG93IHRva2VuIGNvc3QpIHBsdXMgd3JpdGVzIHRoZSBmdWxsLXJlc29sdXRpb24gUE5HIHRvIGRpc2s7IGZ1bGwgcmV0dXJucyB0aGUgZnVsbC1yZXNvbHV0aW9uIGltYWdlIGlubGluZSAodXNlIGZvciBzbWFsbCB0ZXh0L3BpeGVsLWxldmVsIGluc3BlY3Rpb24pOyBwYXRoX29ubHkgd3JpdGVzIHRoZSBQTkcgdG8gZGlzayBhbmQgcmV0dXJucyBvbmx5IHRoZSBmaWxlIHBhdGgsIG5vIGlubGluZSBpbWFnZSAodXNlIHdoZW4gb25seSBtZWFzdXJpbmcgdmlhIGBtYXBwaW5nYCwgbm90IGxvb2tpbmcgYXQgcGl4ZWxzKS4gVHlwaWNhbCB1c2U6IHNldCB3aWR0aC9oZWlnaHQgdG8gbWF0Y2ggYSBkZXNpZ24gbW9ja3VwLCBjYXB0dXJlIHdpdGggcmVzcG9uc2VNb2RlIHByZXZpZXcsIGNvbXBhcmUsIG1lYXN1cmUgb2Zmc2V0cywgZml4LCByZS1jYXB0dXJlLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY2FwdHVyZV9zY2VuZScsICdjYXB0dXJlX2NhbWVyYScsICdjYXB0dXJlX25vZGUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doYXQgdG8gY2FwdHVyZTogY2FwdHVyZV9zY2VuZSAoYXV0byBtYWluIGNhbWVyYSksIGNhcHR1cmVfY2FtZXJhIChzcGVjaWZpYyBjYW1lcmEpLCBjYXB0dXJlX25vZGUgKGZyYW1lIG9uZSBub2RlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW1lcmFVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDYW1lcmEgbm9kZSBVVUlELiBSZXF1aXJlZCBmb3IgYWN0aW9uIGNhcHR1cmVfY2FtZXJhLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIGZyYW1lLiBSZXF1aXJlZCBmb3IgYWN0aW9uIGNhcHR1cmVfbm9kZS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ091dHB1dCBpbWFnZSB3aWR0aCBpbiBwaXhlbHMgKDEtMjA0OCwgZGVmYXVsdCAxOTIwKS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdXRwdXQgaW1hZ2UgaGVpZ2h0IGluIHBpeGVscyAoMS0yMDQ4LCBkZWZhdWx0IDEwODApLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBYnNvbHV0ZSBmaWxlIHBhdGggdG8gd3JpdGUgdGhlIFBORy4gSWYgb21pdHRlZCwgYW4gYXV0byBwYXRoIHVuZGVyIDxwcm9qZWN0Pi90ZW1wL21jcC1zY3JlZW5zaG90cy8gaXMgdXNlZC4gUmVsYXRpdmUgcGF0aHMgYXJlIHJlc29sdmVkIGFnYWluc3QgdGhlIHByb2plY3Qgcm9vdC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb2xpZCBiYWNrZ3JvdW5kIGNvbG9yLCBjb21wb25lbnRzIDAtMjU1LiBEZWZhdWx0IG9wYXF1ZSBibGFjayB7cjowLGc6MCxiOjAsYToyNTV9LiBTZXQgYTowIGZvciBhIHRyYW5zcGFyZW50IGJhY2tncm91bmQuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGE6IHsgdHlwZTogJ251bWJlcicgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZU1vZGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3ByZXZpZXcnLCAnZnVsbCcsICdwYXRoX29ubHknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ3ByZXZpZXcgKGRlZmF1bHQpOiByZXNpemVkIGlubGluZSBpbWFnZSBmb3IgYSBmYXN0IHZpc3VhbCBjaGVjay4gZnVsbDogZnVsbC1yZXNvbHV0aW9uIGlubGluZSBpbWFnZSwgdXNlIGZvciBzbWFsbCB0ZXh0L3BpeGVsLWxldmVsIGluc3BlY3Rpb24uIHBhdGhfb25seTogbm8gaW5saW5lIGltYWdlLCBvbmx5IGZpbGUgcGF0aCAobG93ZXN0IGNvc3QsIHVzZSBmb3IgY29vcmRpbmF0ZSBtZWFzdXJlbWVudCB2aWEgYG1hcHBpbmdgIG9ubHkpLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aWV3TWF4V2lkdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heCB3aWR0aCBmb3IgdGhlIGlubGluZSBwcmV2aWV3IGltYWdlIGluIHJlc3BvbnNlTW9kZSBcInByZXZpZXdcIiAoZGVmYXVsdCA5NjApLiBOZXZlciB1cHNjYWxlcy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld01heEhlaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4IGhlaWdodCBmb3IgdGhlIGlubGluZSBwcmV2aWV3IGltYWdlIGluIHJlc3BvbnNlTW9kZSBcInByZXZpZXdcIiAoZGVmYXVsdCA1NDApLiBOZXZlciB1cHNjYWxlcy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2NhcHR1cmVfc2NlbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhcHR1cmUoJ3NjZW5lJywgYXJncyk7XG4gICAgICAgICAgICBjYXNlICdjYXB0dXJlX2NhbWVyYSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FwdHVyZSgnY2FtZXJhJywgYXJncyk7XG4gICAgICAgICAgICBjYXNlICdjYXB0dXJlX25vZGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhcHR1cmUoJ25vZGUnLCBhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjYXB0dXJlKG1vZGU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChtb2RlID09PSAnY2FtZXJhJyAmJiAhYXJncy5jYW1lcmFVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY2FtZXJhVXVpZCBpcyByZXF1aXJlZCBmb3IgY2FwdHVyZV9jYW1lcmEnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW9kZSA9PT0gJ25vZGUnICYmICFhcmdzLm5vZGVVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbm9kZVV1aWQgaXMgcmVxdWlyZWQgZm9yIGNhcHR1cmVfbm9kZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2VNb2RlID0gYXJncy5yZXNwb25zZU1vZGUgfHwgJ3ByZXZpZXcnO1xuICAgICAgICAgICAgaWYgKCFbJ3ByZXZpZXcnLCAnZnVsbCcsICdwYXRoX29ubHknXS5pbmNsdWRlcyhyZXNwb25zZU1vZGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCByZXNwb25zZU1vZGU6ICR7cmVzcG9uc2VNb2RlfS4gVXNlIG9uZSBvZjogcHJldmlldywgZnVsbCwgcGF0aF9vbmx5YCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBkaXJ0eUJlZm9yZSA9IGF3YWl0IHRoaXMucXVlcnlEaXJ0eSgpO1xuXG4gICAgICAgICAgICBjb25zdCBvcHRzOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgbW9kZSxcbiAgICAgICAgICAgICAgICBjYW1lcmFVdWlkOiBhcmdzLmNhbWVyYVV1aWQsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IGFyZ3Mubm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgd2lkdGg6IGFyZ3Mud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBhcmdzLmhlaWdodCxcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IGFyZ3MuYmFja2dyb3VuZENvbG9yXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlTW9kZSA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgb3B0cy5wcmV2aWV3TWF4V2lkdGggPSBhcmdzLnByZXZpZXdNYXhXaWR0aCB8fCA5NjA7XG4gICAgICAgICAgICAgICAgb3B0cy5wcmV2aWV3TWF4SGVpZ2h0ID0gYXJncy5wcmV2aWV3TWF4SGVpZ2h0IHx8IDU0MDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnY2FwdHVyZVNjZW5lVmlldycsXG4gICAgICAgICAgICAgICAgYXJnczogW29wdHNdXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdDYXB0dXJlIGZhaWxlZCBpbiBzY2VuZSBjb250ZXh0JywgaW5zdHJ1Y3Rpb246IHJlc3VsdD8uaW5zdHJ1Y3Rpb24gfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3VsdC5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgcG5nQmFzZTY0OiBzdHJpbmcgPSBkYXRhLnBuZ0Jhc2U2NDtcbiAgICAgICAgICAgIGlmICghcG5nQmFzZTY0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU2NlbmUgY2FwdHVyZSByZXR1cm5lZCBubyBpbWFnZSBkYXRhJywgaW5zdHJ1Y3Rpb246ICdSZXRyeSB0aGUgY2FwdHVyZTsgaWYgaXQgcGVyc2lzdHMsIHRoaXMgaW5kaWNhdGVzIGEgYnVnIGluIGNhcHR1cmVTY2VuZVZpZXcsIG5vdCBhIGJhZCByZXF1ZXN0LicgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKHBuZ0Jhc2U2NCwgJ2Jhc2U2NCcpO1xuXG4gICAgICAgICAgICBjb25zdCBvdXRQYXRoID0gdGhpcy5yZXNvbHZlT3V0cHV0UGF0aChhcmdzLm91dHB1dFBhdGgsIG1vZGUpO1xuICAgICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShvdXRQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKG91dFBhdGgsIGJ1ZmZlcik7XG5cbiAgICAgICAgICAgIGNvbnN0IGRpcnR5QWZ0ZXIgPSBhd2FpdCB0aGlzLnF1ZXJ5RGlydHkoKTtcblxuICAgICAgICAgICAgbGV0IGltYWdlQ29udGVudDogQXJyYXk8eyBtaW1lVHlwZTogc3RyaW5nOyBiYXNlNjQ6IHN0cmluZyB9PiB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBpbnN0cnVjdGlvbjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlTW9kZSA9PT0gJ2Z1bGwnKSB7XG4gICAgICAgICAgICAgICAgaW1hZ2VDb250ZW50ID0gW3sgbWltZVR5cGU6ICdpbWFnZS9wbmcnLCBiYXNlNjQ6IHBuZ0Jhc2U2NCB9XTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2VNb2RlID09PSAncHJldmlldycpIHtcbiAgICAgICAgICAgICAgICBpbWFnZUNvbnRlbnQgPSBbeyBtaW1lVHlwZTogJ2ltYWdlL3BuZycsIGJhc2U2NDogZGF0YS5wcmV2aWV3QmFzZTY0IHx8IHBuZ0Jhc2U2NCB9XTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb24gPSBgT3BlbiB0aGUgUE5HIHdpdGggdGhlIFJlYWQgdG9vbCB0byB2aWV3IGl0OiAke291dFBhdGh9YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogb3V0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGRhdGEud2lkdGgsXG4gICAgICAgICAgICAgICAgICAgIGhlaWdodDogZGF0YS5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgIG1vZGUsXG4gICAgICAgICAgICAgICAgICAgIGNhbWVyYU5vZGVVdWlkOiBkYXRhLmNhbWVyYU5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBjYW1lcmFOb2RlTmFtZTogZGF0YS5jYW1lcmFOb2RlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZzogZGF0YS5tYXBwaW5nLFxuICAgICAgICAgICAgICAgICAgICBieXRlczogYnVmZmVyLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVEaXJ0eUJlZm9yZTogZGlydHlCZWZvcmUsXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lRGlydHlBZnRlcjogZGlydHlBZnRlcixcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VNb2RlLFxuICAgICAgICAgICAgICAgICAgICBwcmV2aWV3V2lkdGg6IGRhdGEucHJldmlld1dpZHRoLFxuICAgICAgICAgICAgICAgICAgICBwcmV2aWV3SGVpZ2h0OiBkYXRhLnByZXZpZXdIZWlnaHRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGltYWdlQ29udGVudCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvblxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHJlc29sdmVPdXRwdXRQYXRoKG91dHB1dFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZCwgbW9kZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKG91dHB1dFBhdGggJiYgb3V0cHV0UGF0aC50cmltKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXRoLmlzQWJzb2x1dGUob3V0cHV0UGF0aCkgPyBvdXRwdXRQYXRoIDogcGF0aC5qb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsIG91dHB1dFBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAndGVtcCcsICdtY3Atc2NyZWVuc2hvdHMnKTtcbiAgICAgICAgY29uc3QgdHMgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCAnLScpO1xuICAgICAgICByZXR1cm4gcGF0aC5qb2luKGRpciwgYCR7bW9kZX0tJHt0c30ucG5nYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeURpcnR5KCk6IFByb21pc2U8Ym9vbGVhbiB8IG51bGw+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiAoYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZGlydHknKSkgYXMgYW55O1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==