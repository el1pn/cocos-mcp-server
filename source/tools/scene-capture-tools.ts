import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

/**
 * Captures a clean PNG render of the currently-open scene/prefab from the editor.
 *
 * Rendering is delegated to the scene-script method `captureSceneView` (see
 * source/scene.ts), which uses an offscreen clone camera + RenderTexture so the
 * result contains no editor gizmos/grid and the open scene is left untouched.
 * The scene side returns the PNG as base64; this side writes it to an absolute
 * file path so the agent can open it with the Read tool (no base64 round-trip).
 */
export class SceneCaptureTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

            const dirtyBefore = await this.queryDirty();

            const opts = {
                mode,
                cameraUuid: args.cameraUuid,
                nodeUuid: args.nodeUuid,
                width: args.width,
                height: args.height,
                backgroundColor: args.backgroundColor
            };

            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'captureSceneView',
                args: [opts]
            });

            if (!result || !result.success) {
                return { success: false, error: result?.error || 'Capture failed in scene context' };
            }

            const data = result.data || {};
            const pngBase64: string = data.pngBase64;
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
            return (await Editor.Message.request('scene', 'query-dirty')) as any;
        } catch (e) {
            return null;
        }
    }
}
