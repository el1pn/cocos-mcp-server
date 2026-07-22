import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';

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
export class SceneCaptureTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
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

    private async capture(mode: string, args: any): Promise<ToolResponse> {
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

            const opts: any = {
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

            const result: any = await editorRequest('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'captureSceneView',
                args: [opts]
            });

            if (!result || !result.success) {
                return { success: false, error: result?.error || 'Capture failed in scene context', instruction: result?.instruction };
            }

            const data = result.data || {};
            const pngBase64: string = data.pngBase64;
            if (!pngBase64) {
                return { success: false, error: 'Scene capture returned no image data', instruction: 'Retry the capture; if it persists, this indicates a bug in captureSceneView, not a bad request.' };
            }
            const buffer = Buffer.from(pngBase64, 'base64');

            const outPath = this.resolveOutputPath(args.outputPath, mode);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, buffer);

            const dirtyAfter = await this.queryDirty();

            let imageContent: Array<{ mimeType: string; base64: string }> | undefined;
            let instruction: string | undefined;
            if (responseMode === 'full') {
                imageContent = [{ mimeType: 'image/png', base64: pngBase64 }];
            } else if (responseMode === 'preview') {
                imageContent = [{ mimeType: 'image/png', base64: data.previewBase64 || pngBase64 }];
            } else {
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
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
        }
    }

    private resolveOutputPath(outputPath: string | undefined, mode: string): string {
        if (outputPath && outputPath.trim()) {
            return path.isAbsolute(outputPath) ? outputPath : path.join(Editor.Project.path, outputPath);
        }
        const dir = path.join(Editor.Project.path, 'temp', 'mcp-screenshots');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        return path.join(dir, `${mode}-${ts}.png`);
    }

    private async queryDirty(): Promise<boolean | null> {
        try {
            return (await editorRequest('scene', 'query-dirty')) as any;
        } catch (e) {
            return null;
        }
    }
}
