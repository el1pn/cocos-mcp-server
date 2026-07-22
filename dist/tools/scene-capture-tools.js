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
const editor_request_1 = require("../utils/editor-request");
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
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
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
            return (await (0, editor_request_1.editorRequest)('scene', 'query-dirty'));
        }
        catch (e) {
            return null;
        }
    }
}
exports.SceneCaptureTools = SceneCaptureTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtY2FwdHVyZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS1jYXB0dXJlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFFN0IsNERBQXdEO0FBRXhEOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsaUJBQWlCO0lBQzFCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLG9xQ0FBb3FDO2dCQUNqckMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsZUFBZSxFQUFFLGdCQUFnQixFQUFFLGNBQWMsQ0FBQzs0QkFDekQsV0FBVyxFQUFFLG9IQUFvSDt5QkFDcEk7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1REFBdUQ7eUJBQ3ZFO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTt3QkFDRCxLQUFLLEVBQUU7NEJBQ0gsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNEQUFzRDt5QkFDdEU7d0JBQ0QsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1REFBdUQ7eUJBQ3ZFO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0tBQW9LO3lCQUNwTDt3QkFDRCxlQUFlLEVBQUU7NEJBQ2IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJIQUEySDs0QkFD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QUM7Q0FDSjtBQXBMRCw4Q0FvTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuLyoqXG4gKiBDYXB0dXJlcyBhIGNsZWFuIFBORyByZW5kZXIgb2YgdGhlIGN1cnJlbnRseS1vcGVuIHNjZW5lL3ByZWZhYiBmcm9tIHRoZSBlZGl0b3IuXG4gKlxuICogUmVuZGVyaW5nIGlzIGRlbGVnYXRlZCB0byB0aGUgc2NlbmUtc2NyaXB0IG1ldGhvZCBgY2FwdHVyZVNjZW5lVmlld2AgKHNlZVxuICogc291cmNlL3NjZW5lLnRzKSwgd2hpY2ggdXNlcyBhbiBvZmZzY3JlZW4gY2xvbmUgY2FtZXJhICsgUmVuZGVyVGV4dHVyZSBzbyB0aGVcbiAqIHJlc3VsdCBjb250YWlucyBubyBlZGl0b3IgZ2l6bW9zL2dyaWQgYW5kIHRoZSBvcGVuIHNjZW5lIGlzIGxlZnQgdW50b3VjaGVkLlxuICogVGhlIHNjZW5lIHNpZGUgcmV0dXJucyB0aGUgUE5HIChhbmQsIGluIHByZXZpZXcgbW9kZSwgYSByZXNpemVkIGNvcHkpIGFzIGJhc2U2NDtcbiAqIHRoaXMgc2lkZSBhbHdheXMgd3JpdGVzIHRoZSBmdWxsLXJlc29sdXRpb24gUE5HIHRvIGRpc2ssIGFuZCBhZGRpdGlvbmFsbHlcbiAqIHJldHVybnMgYW4gaW5saW5lIE1DUCBpbWFnZSBjb250ZW50IGJsb2NrIHBlciBgcmVzcG9uc2VNb2RlYCAoc2VlIFRvb2xSZXNwb25zZS5pbWFnZUNvbnRlbnQpLlxuICovXG5leHBvcnQgY2xhc3MgU2NlbmVDYXB0dXJlVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV9zY3JlZW5zaG90JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NhcHR1cmUgYSBjbGVhbiBQTkcgcmVuZGVyIG9mIHRoZSBjdXJyZW50bHktb3BlbiBzY2VuZS9wcmVmYWIuIFJlbmRlcnMgdGhyb3VnaCBhbiBvZmZzY3JlZW4gY2xvbmUgY2FtZXJhICsgUmVuZGVyVGV4dHVyZSwgc28gdGhlcmUgYXJlIG5vIGVkaXRvciBnaXptb3MvZ3JpZCBhbmQgdGhlIG9wZW4gc2NlbmUgaXMgbm90IG1vZGlmaWVkLiBBY3Rpb25zOiBjYXB0dXJlX3NjZW5lIChhdXRvLXBpY2sgdGhlIG1haW4gMkQvVUkgY2FtZXJhKSwgY2FwdHVyZV9jYW1lcmEgKHJlbmRlciBhIHNwZWNpZmljIENhbWVyYSBub2RlIHZpYSBjYW1lcmFVdWlkKSwgY2FwdHVyZV9ub2RlIChmcmFtZSBhIHNpbmdsZSBub2RlIGJ5IGl0cyB3b3JsZCBib3VuZGluZyBib3ggdmlhIG5vZGVVdWlkKS4gVGhlIHJlc3VsdCBpbmNsdWRlcyBhIGBtYXBwaW5nYCBvYmplY3QgdGhhdCBjb252ZXJ0cyBzY2VuZSB3b3JsZCBjb29yZGluYXRlcyA8LT4gaW1hZ2UgcGl4ZWxzIChvcnRob2dyYXBoaWMgY2FtZXJhcyBtYXAgd2l0aGluIDFweCksIHNvIHlvdSBjYW4gbWVhc3VyZSBob3cgZmFyIGEgbm9kZSBpcyBmcm9tIGl0cyB0YXJnZXQgcGl4ZWwgcG9zaXRpb24sIGFkanVzdCBpdHMgcG9zaXRpb24sIGFuZCByZS1jYXB0dXJlIHRvIHZlcmlmeS4gcmVzcG9uc2VNb2RlIGNvbnRyb2xzIGhvdyB0aGUgaW1hZ2UgaXMgcmV0dXJuZWQ6IHByZXZpZXcgKGRlZmF1bHQpIHJldHVybnMgYSByZXNpemVkIGlubGluZSBpbWFnZSAoZmFzdCB2aXN1YWwgY2hlY2ssIGxvdyB0b2tlbiBjb3N0KSBwbHVzIHdyaXRlcyB0aGUgZnVsbC1yZXNvbHV0aW9uIFBORyB0byBkaXNrOyBmdWxsIHJldHVybnMgdGhlIGZ1bGwtcmVzb2x1dGlvbiBpbWFnZSBpbmxpbmUgKHVzZSBmb3Igc21hbGwgdGV4dC9waXhlbC1sZXZlbCBpbnNwZWN0aW9uKTsgcGF0aF9vbmx5IHdyaXRlcyB0aGUgUE5HIHRvIGRpc2sgYW5kIHJldHVybnMgb25seSB0aGUgZmlsZSBwYXRoLCBubyBpbmxpbmUgaW1hZ2UgKHVzZSB3aGVuIG9ubHkgbWVhc3VyaW5nIHZpYSBgbWFwcGluZ2AsIG5vdCBsb29raW5nIGF0IHBpeGVscykuIFR5cGljYWwgdXNlOiBzZXQgd2lkdGgvaGVpZ2h0IHRvIG1hdGNoIGEgZGVzaWduIG1vY2t1cCwgY2FwdHVyZSB3aXRoIHJlc3BvbnNlTW9kZSBwcmV2aWV3LCBjb21wYXJlLCBtZWFzdXJlIG9mZnNldHMsIGZpeCwgcmUtY2FwdHVyZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NhcHR1cmVfc2NlbmUnLCAnY2FwdHVyZV9jYW1lcmEnLCAnY2FwdHVyZV9ub2RlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGF0IHRvIGNhcHR1cmU6IGNhcHR1cmVfc2NlbmUgKGF1dG8gbWFpbiBjYW1lcmEpLCBjYXB0dXJlX2NhbWVyYSAoc3BlY2lmaWMgY2FtZXJhKSwgY2FwdHVyZV9ub2RlIChmcmFtZSBvbmUgbm9kZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FtZXJhVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FtZXJhIG5vZGUgVVVJRC4gUmVxdWlyZWQgZm9yIGFjdGlvbiBjYXB0dXJlX2NhbWVyYS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCB0byBmcmFtZS4gUmVxdWlyZWQgZm9yIGFjdGlvbiBjYXB0dXJlX25vZGUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdXRwdXQgaW1hZ2Ugd2lkdGggaW4gcGl4ZWxzICgxLTIwNDgsIGRlZmF1bHQgMTkyMCkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3V0cHV0IGltYWdlIGhlaWdodCBpbiBwaXhlbHMgKDEtMjA0OCwgZGVmYXVsdCAxMDgwKS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWJzb2x1dGUgZmlsZSBwYXRoIHRvIHdyaXRlIHRoZSBQTkcuIElmIG9taXR0ZWQsIGFuIGF1dG8gcGF0aCB1bmRlciA8cHJvamVjdD4vdGVtcC9tY3Atc2NyZWVuc2hvdHMvIGlzIHVzZWQuIFJlbGF0aXZlIHBhdGhzIGFyZSByZXNvbHZlZCBhZ2FpbnN0IHRoZSBwcm9qZWN0IHJvb3QuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU29saWQgYmFja2dyb3VuZCBjb2xvciwgY29tcG9uZW50cyAwLTI1NS4gRGVmYXVsdCBvcGFxdWUgYmxhY2sge3I6MCxnOjAsYjowLGE6MjU1fS4gU2V0IGE6MCBmb3IgYSB0cmFuc3BhcmVudCBiYWNrZ3JvdW5kLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiB7IHR5cGU6ICdudW1iZXInIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VNb2RlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydwcmV2aWV3JywgJ2Z1bGwnLCAncGF0aF9vbmx5J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdwcmV2aWV3IChkZWZhdWx0KTogcmVzaXplZCBpbmxpbmUgaW1hZ2UgZm9yIGEgZmFzdCB2aXN1YWwgY2hlY2suIGZ1bGw6IGZ1bGwtcmVzb2x1dGlvbiBpbmxpbmUgaW1hZ2UsIHVzZSBmb3Igc21hbGwgdGV4dC9waXhlbC1sZXZlbCBpbnNwZWN0aW9uLiBwYXRoX29ubHk6IG5vIGlubGluZSBpbWFnZSwgb25seSBmaWxlIHBhdGggKGxvd2VzdCBjb3N0LCB1c2UgZm9yIGNvb3JkaW5hdGUgbWVhc3VyZW1lbnQgdmlhIGBtYXBwaW5nYCBvbmx5KS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJldmlld01heFdpZHRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXggd2lkdGggZm9yIHRoZSBpbmxpbmUgcHJldmlldyBpbWFnZSBpbiByZXNwb25zZU1vZGUgXCJwcmV2aWV3XCIgKGRlZmF1bHQgOTYwKS4gTmV2ZXIgdXBzY2FsZXMuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpZXdNYXhIZWlnaHQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heCBoZWlnaHQgZm9yIHRoZSBpbmxpbmUgcHJldmlldyBpbWFnZSBpbiByZXNwb25zZU1vZGUgXCJwcmV2aWV3XCIgKGRlZmF1bHQgNTQwKS4gTmV2ZXIgdXBzY2FsZXMuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdjYXB0dXJlX3NjZW5lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYXB0dXJlKCdzY2VuZScsIGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnY2FwdHVyZV9jYW1lcmEnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhcHR1cmUoJ2NhbWVyYScsIGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnY2FwdHVyZV9ub2RlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYXB0dXJlKCdub2RlJywgYXJncyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2FwdHVyZShtb2RlOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2NhbWVyYScgJiYgIWFyZ3MuY2FtZXJhVXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NhbWVyYVV1aWQgaXMgcmVxdWlyZWQgZm9yIGNhcHR1cmVfY2FtZXJhJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdub2RlJyAmJiAhYXJncy5ub2RlVXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ25vZGVVdWlkIGlzIHJlcXVpcmVkIGZvciBjYXB0dXJlX25vZGUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlTW9kZSA9IGFyZ3MucmVzcG9uc2VNb2RlIHx8ICdwcmV2aWV3JztcbiAgICAgICAgICAgIGlmICghWydwcmV2aWV3JywgJ2Z1bGwnLCAncGF0aF9vbmx5J10uaW5jbHVkZXMocmVzcG9uc2VNb2RlKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgcmVzcG9uc2VNb2RlOiAke3Jlc3BvbnNlTW9kZX0uIFVzZSBvbmUgb2Y6IHByZXZpZXcsIGZ1bGwsIHBhdGhfb25seWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGlydHlCZWZvcmUgPSBhd2FpdCB0aGlzLnF1ZXJ5RGlydHkoKTtcblxuICAgICAgICAgICAgY29uc3Qgb3B0czogYW55ID0ge1xuICAgICAgICAgICAgICAgIG1vZGUsXG4gICAgICAgICAgICAgICAgY2FtZXJhVXVpZDogYXJncy5jYW1lcmFVdWlkLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBhcmdzLm5vZGVVdWlkLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBhcmdzLndpZHRoLFxuICAgICAgICAgICAgICAgIGhlaWdodDogYXJncy5oZWlnaHQsXG4gICAgICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBhcmdzLmJhY2tncm91bmRDb2xvclxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZU1vZGUgPT09ICdwcmV2aWV3Jykge1xuICAgICAgICAgICAgICAgIG9wdHMucHJldmlld01heFdpZHRoID0gYXJncy5wcmV2aWV3TWF4V2lkdGggfHwgOTYwO1xuICAgICAgICAgICAgICAgIG9wdHMucHJldmlld01heEhlaWdodCA9IGFyZ3MucHJldmlld01heEhlaWdodCB8fCA1NDA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NhcHR1cmVTY2VuZVZpZXcnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtvcHRzXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0Py5lcnJvciB8fCAnQ2FwdHVyZSBmYWlsZWQgaW4gc2NlbmUgY29udGV4dCcsIGluc3RydWN0aW9uOiByZXN1bHQ/Lmluc3RydWN0aW9uIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHQuZGF0YSB8fCB7fTtcbiAgICAgICAgICAgIGNvbnN0IHBuZ0Jhc2U2NDogc3RyaW5nID0gZGF0YS5wbmdCYXNlNjQ7XG4gICAgICAgICAgICBpZiAoIXBuZ0Jhc2U2NCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1NjZW5lIGNhcHR1cmUgcmV0dXJuZWQgbm8gaW1hZ2UgZGF0YScsIGluc3RydWN0aW9uOiAnUmV0cnkgdGhlIGNhcHR1cmU7IGlmIGl0IHBlcnNpc3RzLCB0aGlzIGluZGljYXRlcyBhIGJ1ZyBpbiBjYXB0dXJlU2NlbmVWaWV3LCBub3QgYSBiYWQgcmVxdWVzdC4nIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShwbmdCYXNlNjQsICdiYXNlNjQnKTtcblxuICAgICAgICAgICAgY29uc3Qgb3V0UGF0aCA9IHRoaXMucmVzb2x2ZU91dHB1dFBhdGgoYXJncy5vdXRwdXRQYXRoLCBtb2RlKTtcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUob3V0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhvdXRQYXRoLCBidWZmZXIpO1xuXG4gICAgICAgICAgICBjb25zdCBkaXJ0eUFmdGVyID0gYXdhaXQgdGhpcy5xdWVyeURpcnR5KCk7XG5cbiAgICAgICAgICAgIGxldCBpbWFnZUNvbnRlbnQ6IEFycmF5PHsgbWltZVR5cGU6IHN0cmluZzsgYmFzZTY0OiBzdHJpbmcgfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgaW5zdHJ1Y3Rpb246IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZU1vZGUgPT09ICdmdWxsJykge1xuICAgICAgICAgICAgICAgIGltYWdlQ29udGVudCA9IFt7IG1pbWVUeXBlOiAnaW1hZ2UvcG5nJywgYmFzZTY0OiBwbmdCYXNlNjQgfV07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlTW9kZSA9PT0gJ3ByZXZpZXcnKSB7XG4gICAgICAgICAgICAgICAgaW1hZ2VDb250ZW50ID0gW3sgbWltZVR5cGU6ICdpbWFnZS9wbmcnLCBiYXNlNjQ6IGRhdGEucHJldmlld0Jhc2U2NCB8fCBwbmdCYXNlNjQgfV07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uID0gYE9wZW4gdGhlIFBORyB3aXRoIHRoZSBSZWFkIHRvb2wgdG8gdmlldyBpdDogJHtvdXRQYXRofWA7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IG91dFBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiBkYXRhLndpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGRhdGEuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICBtb2RlLFxuICAgICAgICAgICAgICAgICAgICBjYW1lcmFOb2RlVXVpZDogZGF0YS5jYW1lcmFOb2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY2FtZXJhTm9kZU5hbWU6IGRhdGEuY2FtZXJhTm9kZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmc6IGRhdGEubWFwcGluZyxcbiAgICAgICAgICAgICAgICAgICAgYnl0ZXM6IGJ1ZmZlci5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lRGlydHlCZWZvcmU6IGRpcnR5QmVmb3JlLFxuICAgICAgICAgICAgICAgICAgICBzY2VuZURpcnR5QWZ0ZXI6IGRpcnR5QWZ0ZXIsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlTW9kZSxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlld1dpZHRoOiBkYXRhLnByZXZpZXdXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlld0hlaWdodDogZGF0YS5wcmV2aWV3SGVpZ2h0XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbWFnZUNvbnRlbnQsXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb25cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZXNvbHZlT3V0cHV0UGF0aChvdXRwdXRQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsIG1vZGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChvdXRwdXRQYXRoICYmIG91dHB1dFBhdGgudHJpbSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5pc0Fic29sdXRlKG91dHB1dFBhdGgpID8gb3V0cHV0UGF0aCA6IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCBvdXRwdXRQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ3RlbXAnLCAnbWNwLXNjcmVlbnNob3RzJyk7XG4gICAgICAgIGNvbnN0IHRzID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKTtcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihkaXIsIGAke21vZGV9LSR7dHN9LnBuZ2ApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlEaXJ0eSgpOiBQcm9taXNlPGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gKGF3YWl0IGVkaXRvclJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5JykpIGFzIGFueTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=