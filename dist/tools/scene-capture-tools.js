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
 * The scene side returns the PNG as base64; this side writes it to an absolute
 * file path so the agent can open it with the Read tool (no base64 round-trip).
 */
class SceneCaptureTools {
    getTools() {
        return [
            {
                name: 'scene_screenshot',
                description: 'Capture a clean PNG render of the currently-open scene/prefab and write it to an absolute file path for the agent to Read (NOT base64). Renders through an offscreen clone camera + RenderTexture, so there are no editor gizmos/grid and the open scene is not modified. Actions: capture_scene (auto-pick the main 2D/UI camera), capture_camera (render a specific Camera node via cameraUuid), capture_node (frame a single node by its world bounding box via nodeUuid). The result includes a `mapping` object that converts scene world coordinates <-> image pixels (orthographic cameras map within 1px), so you can measure how far a node is from its target pixel position, adjust its position, and re-capture to verify. Typical use: set width/height to match a design mockup, capture, compare, measure offsets, fix, re-capture.',
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
            const dirtyBefore = await this.queryDirty();
            const opts = {
                mode,
                cameraUuid: args.cameraUuid,
                nodeUuid: args.nodeUuid,
                width: args.width,
                height: args.height,
                backgroundColor: args.backgroundColor
            };
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'captureSceneView',
                args: [opts]
            });
            if (!result || !result.success) {
                return { success: false, error: (result === null || result === void 0 ? void 0 : result.error) || 'Capture failed in scene context' };
            }
            const data = result.data || {};
            const pngBase64 = data.pngBase64;
            if (!pngBase64) {
                return { success: false, error: 'Scene capture returned no image data' };
            }
            const buffer = Buffer.from(pngBase64, 'base64');
            const outPath = this.resolveOutputPath(args.outputPath, mode);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, buffer);
            const dirtyAfter = await this.queryDirty();
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
                    sceneDirtyAfter: dirtyAfter
                },
                instruction: `Open the PNG with the Read tool to view it: ${outPath}`
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtY2FwdHVyZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS1jYXB0dXJlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFHN0I7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGlCQUFpQjtJQUMxQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLFdBQVcsRUFBRSxvekJBQW96QjtnQkFDajBCLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLENBQUM7NEJBQ3pELFdBQVcsRUFBRSxvSEFBb0g7eUJBQ3BJO3dCQUNELFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHVEQUF1RDt5QkFDdkU7d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzREFBc0Q7eUJBQ3RFO3dCQUNELE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTt3QkFDRCxVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG9LQUFvSzt5QkFDcEw7d0JBQ0QsZUFBZSxFQUFFOzRCQUNiLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwySEFBMkg7NEJBQ3hJLFVBQVUsRUFBRTtn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bEUsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDbEMsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDakcsQ0FBQztRQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdEUsTUFBTSxFQUFFLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzFELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVU7UUFDcEIsSUFBSSxDQUFDO1lBQ0QsT0FBTyxDQUFDLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFRLENBQUM7UUFDekUsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDVCxPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBaEpELDhDQWdKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogQ2FwdHVyZXMgYSBjbGVhbiBQTkcgcmVuZGVyIG9mIHRoZSBjdXJyZW50bHktb3BlbiBzY2VuZS9wcmVmYWIgZnJvbSB0aGUgZWRpdG9yLlxuICpcbiAqIFJlbmRlcmluZyBpcyBkZWxlZ2F0ZWQgdG8gdGhlIHNjZW5lLXNjcmlwdCBtZXRob2QgYGNhcHR1cmVTY2VuZVZpZXdgIChzZWVcbiAqIHNvdXJjZS9zY2VuZS50cyksIHdoaWNoIHVzZXMgYW4gb2Zmc2NyZWVuIGNsb25lIGNhbWVyYSArIFJlbmRlclRleHR1cmUgc28gdGhlXG4gKiByZXN1bHQgY29udGFpbnMgbm8gZWRpdG9yIGdpem1vcy9ncmlkIGFuZCB0aGUgb3BlbiBzY2VuZSBpcyBsZWZ0IHVudG91Y2hlZC5cbiAqIFRoZSBzY2VuZSBzaWRlIHJldHVybnMgdGhlIFBORyBhcyBiYXNlNjQ7IHRoaXMgc2lkZSB3cml0ZXMgaXQgdG8gYW4gYWJzb2x1dGVcbiAqIGZpbGUgcGF0aCBzbyB0aGUgYWdlbnQgY2FuIG9wZW4gaXQgd2l0aCB0aGUgUmVhZCB0b29sIChubyBiYXNlNjQgcm91bmQtdHJpcCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBTY2VuZUNhcHR1cmVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3NjcmVlbnNob3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FwdHVyZSBhIGNsZWFuIFBORyByZW5kZXIgb2YgdGhlIGN1cnJlbnRseS1vcGVuIHNjZW5lL3ByZWZhYiBhbmQgd3JpdGUgaXQgdG8gYW4gYWJzb2x1dGUgZmlsZSBwYXRoIGZvciB0aGUgYWdlbnQgdG8gUmVhZCAoTk9UIGJhc2U2NCkuIFJlbmRlcnMgdGhyb3VnaCBhbiBvZmZzY3JlZW4gY2xvbmUgY2FtZXJhICsgUmVuZGVyVGV4dHVyZSwgc28gdGhlcmUgYXJlIG5vIGVkaXRvciBnaXptb3MvZ3JpZCBhbmQgdGhlIG9wZW4gc2NlbmUgaXMgbm90IG1vZGlmaWVkLiBBY3Rpb25zOiBjYXB0dXJlX3NjZW5lIChhdXRvLXBpY2sgdGhlIG1haW4gMkQvVUkgY2FtZXJhKSwgY2FwdHVyZV9jYW1lcmEgKHJlbmRlciBhIHNwZWNpZmljIENhbWVyYSBub2RlIHZpYSBjYW1lcmFVdWlkKSwgY2FwdHVyZV9ub2RlIChmcmFtZSBhIHNpbmdsZSBub2RlIGJ5IGl0cyB3b3JsZCBib3VuZGluZyBib3ggdmlhIG5vZGVVdWlkKS4gVGhlIHJlc3VsdCBpbmNsdWRlcyBhIGBtYXBwaW5nYCBvYmplY3QgdGhhdCBjb252ZXJ0cyBzY2VuZSB3b3JsZCBjb29yZGluYXRlcyA8LT4gaW1hZ2UgcGl4ZWxzIChvcnRob2dyYXBoaWMgY2FtZXJhcyBtYXAgd2l0aGluIDFweCksIHNvIHlvdSBjYW4gbWVhc3VyZSBob3cgZmFyIGEgbm9kZSBpcyBmcm9tIGl0cyB0YXJnZXQgcGl4ZWwgcG9zaXRpb24sIGFkanVzdCBpdHMgcG9zaXRpb24sIGFuZCByZS1jYXB0dXJlIHRvIHZlcmlmeS4gVHlwaWNhbCB1c2U6IHNldCB3aWR0aC9oZWlnaHQgdG8gbWF0Y2ggYSBkZXNpZ24gbW9ja3VwLCBjYXB0dXJlLCBjb21wYXJlLCBtZWFzdXJlIG9mZnNldHMsIGZpeCwgcmUtY2FwdHVyZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NhcHR1cmVfc2NlbmUnLCAnY2FwdHVyZV9jYW1lcmEnLCAnY2FwdHVyZV9ub2RlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGF0IHRvIGNhcHR1cmU6IGNhcHR1cmVfc2NlbmUgKGF1dG8gbWFpbiBjYW1lcmEpLCBjYXB0dXJlX2NhbWVyYSAoc3BlY2lmaWMgY2FtZXJhKSwgY2FwdHVyZV9ub2RlIChmcmFtZSBvbmUgbm9kZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FtZXJhVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FtZXJhIG5vZGUgVVVJRC4gUmVxdWlyZWQgZm9yIGFjdGlvbiBjYXB0dXJlX2NhbWVyYS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCB0byBmcmFtZS4gUmVxdWlyZWQgZm9yIGFjdGlvbiBjYXB0dXJlX25vZGUuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdXRwdXQgaW1hZ2Ugd2lkdGggaW4gcGl4ZWxzICgxLTIwNDgsIGRlZmF1bHQgMTkyMCkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3V0cHV0IGltYWdlIGhlaWdodCBpbiBwaXhlbHMgKDEtMjA0OCwgZGVmYXVsdCAxMDgwKS4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0UGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWJzb2x1dGUgZmlsZSBwYXRoIHRvIHdyaXRlIHRoZSBQTkcuIElmIG9taXR0ZWQsIGFuIGF1dG8gcGF0aCB1bmRlciA8cHJvamVjdD4vdGVtcC9tY3Atc2NyZWVuc2hvdHMvIGlzIHVzZWQuIFJlbGF0aXZlIHBhdGhzIGFyZSByZXNvbHZlZCBhZ2FpbnN0IHRoZSBwcm9qZWN0IHJvb3QuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU29saWQgYmFja2dyb3VuZCBjb2xvciwgY29tcG9uZW50cyAwLTI1NS4gRGVmYXVsdCBvcGFxdWUgYmxhY2sge3I6MCxnOjAsYjowLGE6MjU1fS4gU2V0IGE6MCBmb3IgYSB0cmFuc3BhcmVudCBiYWNrZ3JvdW5kLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGc6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhOiB7IHR5cGU6ICdudW1iZXInIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2NhcHR1cmVfc2NlbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhcHR1cmUoJ3NjZW5lJywgYXJncyk7XG4gICAgICAgICAgICBjYXNlICdjYXB0dXJlX2NhbWVyYSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FwdHVyZSgnY2FtZXJhJywgYXJncyk7XG4gICAgICAgICAgICBjYXNlICdjYXB0dXJlX25vZGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhcHR1cmUoJ25vZGUnLCBhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjYXB0dXJlKG1vZGU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChtb2RlID09PSAnY2FtZXJhJyAmJiAhYXJncy5jYW1lcmFVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY2FtZXJhVXVpZCBpcyByZXF1aXJlZCBmb3IgY2FwdHVyZV9jYW1lcmEnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobW9kZSA9PT0gJ25vZGUnICYmICFhcmdzLm5vZGVVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbm9kZVV1aWQgaXMgcmVxdWlyZWQgZm9yIGNhcHR1cmVfbm9kZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGlydHlCZWZvcmUgPSBhd2FpdCB0aGlzLnF1ZXJ5RGlydHkoKTtcblxuICAgICAgICAgICAgY29uc3Qgb3B0cyA9IHtcbiAgICAgICAgICAgICAgICBtb2RlLFxuICAgICAgICAgICAgICAgIGNhbWVyYVV1aWQ6IGFyZ3MuY2FtZXJhVXVpZCxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogYXJncy5ub2RlVXVpZCxcbiAgICAgICAgICAgICAgICB3aWR0aDogYXJncy53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGFyZ3MuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcjogYXJncy5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NhcHR1cmVTY2VuZVZpZXcnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtvcHRzXVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0Py5lcnJvciB8fCAnQ2FwdHVyZSBmYWlsZWQgaW4gc2NlbmUgY29udGV4dCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3VsdC5kYXRhIHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgcG5nQmFzZTY0OiBzdHJpbmcgPSBkYXRhLnBuZ0Jhc2U2NDtcbiAgICAgICAgICAgIGlmICghcG5nQmFzZTY0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU2NlbmUgY2FwdHVyZSByZXR1cm5lZCBubyBpbWFnZSBkYXRhJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20ocG5nQmFzZTY0LCAnYmFzZTY0Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IG91dFBhdGggPSB0aGlzLnJlc29sdmVPdXRwdXRQYXRoKGFyZ3Mub3V0cHV0UGF0aCwgbW9kZSk7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKG91dFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMob3V0UGF0aCwgYnVmZmVyKTtcblxuICAgICAgICAgICAgY29uc3QgZGlydHlBZnRlciA9IGF3YWl0IHRoaXMucXVlcnlEaXJ0eSgpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBwYXRoOiBvdXRQYXRoLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogZGF0YS53aWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBkYXRhLmhlaWdodCxcbiAgICAgICAgICAgICAgICAgICAgbW9kZSxcbiAgICAgICAgICAgICAgICAgICAgY2FtZXJhTm9kZVV1aWQ6IGRhdGEuY2FtZXJhTm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNhbWVyYU5vZGVOYW1lOiBkYXRhLmNhbWVyYU5vZGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nOiBkYXRhLm1hcHBpbmcsXG4gICAgICAgICAgICAgICAgICAgIGJ5dGVzOiBidWZmZXIubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBzY2VuZURpcnR5QmVmb3JlOiBkaXJ0eUJlZm9yZSxcbiAgICAgICAgICAgICAgICAgICAgc2NlbmVEaXJ0eUFmdGVyOiBkaXJ0eUFmdGVyXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogYE9wZW4gdGhlIFBORyB3aXRoIHRoZSBSZWFkIHRvb2wgdG8gdmlldyBpdDogJHtvdXRQYXRofWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZXNvbHZlT3V0cHV0UGF0aChvdXRwdXRQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQsIG1vZGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGlmIChvdXRwdXRQYXRoICYmIG91dHB1dFBhdGgudHJpbSgpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aC5pc0Fic29sdXRlKG91dHB1dFBhdGgpID8gb3V0cHV0UGF0aCA6IHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCBvdXRwdXRQYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ3RlbXAnLCAnbWNwLXNjcmVlbnNob3RzJyk7XG4gICAgICAgIGNvbnN0IHRzID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnJlcGxhY2UoL1s6Ll0vZywgJy0nKTtcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihkaXIsIGAke21vZGV9LSR7dHN9LnBuZ2ApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlEaXJ0eSgpOiBQcm9taXNlPGJvb2xlYW4gfCBudWxsPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gKGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5JykpIGFzIGFueTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=