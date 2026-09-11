import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';
import { validateAssetUrl } from '../utils/asset-safety';

/**
 * Reference images: design mockups overlaid on the scene view.
 *
 * An earlier version of this tool was removed because an AI client had no way to
 * see the scene view, which made an overlay pointless. That is no longer true —
 * `scene_screenshot` returns the rendered view inline along with a world<->pixel
 * mapping, so an overlay can now be added, captured, compared against the intended
 * layout, and corrected. Pair every change here with a capture; on its own this
 * tool still shows nothing.
 *
 * All six messages used here are public API of the built-in `reference-image`
 * extension. Their argument shapes are undocumented and were confirmed against a
 * running 3.8.8 editor:
 *   add-image      -> array of absolute filesystem paths (NOT db:// urls; a bare
 *                     string is iterated character by character, registering one
 *                     bogus image per character)
 *   remove-image   -> array of filesystem paths, same as add-image (a bare number
 *                     throws "a is not iterable"; a bare string happens to work
 *                     because a string is iterable, but only by accident)
 *   switch-image   -> single filesystem path string
 *   set-image-data -> two positional args, (key, value), one field per call;
 *                     an object of fields is silently ignored. Fields are
 *                     x, y, sx, sy, opacity — there is no combined `scale`.
 * The editor stores and reports these as filesystem paths, so a db:// url given
 * by a caller is resolved to disk before being passed on.
 */
export class ReferenceImageTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'reference_image',
                description: 'Overlay a design mockup on the scene view to compare against the built layout. Pair with scene_screenshot: add the image, capture, compare, adjust nodes, re-capture. Available actions: add, remove, switch, set_transform, query.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['add', 'remove', 'switch', 'set_transform', 'query'],
                            description: 'What to do with the reference image overlay.'
                        },
                        url: {
                            type: 'string',
                            description: "Image location: a db:// asset URL such as 'db://assets/mockups/home.png', or an absolute file path. Required for 'add', 'remove' and 'switch'."
                        },
                        x: {
                            type: 'number',
                            description: "Horizontal offset in scene units (set_transform)."
                        },
                        y: {
                            type: 'number',
                            description: "Vertical offset in scene units (set_transform)."
                        },
                        scale: {
                            type: 'number',
                            description: "Uniform scale factor, 1 = original size (set_transform). Use scaleX/scaleY for a non-uniform scale."
                        },
                        scaleX: {
                            type: 'number',
                            description: "Horizontal scale factor (set_transform). Overrides scale."
                        },
                        scaleY: {
                            type: 'number',
                            description: "Vertical scale factor (set_transform). Overrides scale."
                        },
                        opacity: {
                            type: 'number',
                            description: "Opacity 0-100; lower values let the scene show through (set_transform)."
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName !== 'reference_image') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }

        switch (args?.action) {
            case 'add':
                return this.add(args.url);
            case 'remove':
                return this.remove(args.url);
            case 'switch':
                return this.switch(args.url);
            case 'set_transform':
                return this.setTransform(args);
            case 'query':
                return this.query();
            default:
                return {
                    success: false,
                    error: `Unknown action '${args?.action}' for reference_image. Valid actions: add, remove, switch, set_transform, query`
                };
        }
    }

    /**
     * Turn a caller's reference into the absolute filesystem path this extension
     * actually stores. A db:// url is translated through the asset DB; an absolute
     * path is passed through unchanged.
     */
    private async toFsPath(url: string, action: string): Promise<string> {
        if (!url) {
            throw new Error(`url is required for '${action}', e.g. 'db://assets/mockups/home.png'`);
        }
        if (!url.startsWith('db://')) {
            if (!url.startsWith('/')) {
                throw new Error(`url must be a db:// asset url or an absolute file path, got '${url}'`);
            }
            return url;
        }

        validateAssetUrl(url);
        const fsPath = await editorRequest<string>('asset-db', 'query-path', url);
        if (!fsPath) {
            throw new Error(`Asset '${url}' not found in the asset database`);
        }
        return fsPath;
    }

    private async add(url: string): Promise<ToolResponse> {
        try {
            const fsPath = await this.toFsPath(url, 'add');
            // Takes an ARRAY: a bare string gets iterated character by character,
            // registering one bogus entry per character.
            await editorRequest('reference-image', 'add-image', [fsPath]);
            return {
                success: true,
                message: `Reference image added: ${fsPath}`,
                instruction: 'Run scene_screenshot to see the overlay and compare it against the scene.'
            };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async remove(url: string): Promise<ToolResponse> {
        try {
            const fsPath = await this.toFsPath(url, 'remove');
            // Removing an unregistered path is a silent no-op in the editor, so
            // check first to give the caller a real answer.
            const config = await editorRequest<any>('reference-image', 'query-config');
            const images: any[] = config?.images || [];
            if (!images.some(img => img?.path === fsPath)) {
                return {
                    success: false,
                    error: `Reference image '${fsPath}' is not registered.`,
                    instruction: "Run reference_image with action 'query' to list registered images."
                };
            }

            // Takes an ARRAY, like add-image.
            await editorRequest('reference-image', 'remove-image', [fsPath]);
            return { success: true, message: `Reference image removed: ${fsPath}` };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async switch(url: string): Promise<ToolResponse> {
        try {
            const fsPath = await this.toFsPath(url, 'switch');
            await editorRequest('reference-image', 'switch-image', fsPath);
            return {
                success: true,
                message: `Active reference image: ${fsPath}`,
                instruction: 'Run scene_screenshot to see the overlay.'
            };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async setTransform(args: any): Promise<ToolResponse> {
        // The editor keeps separate sx/sy; `scale` is this tool's convenience for
        // setting both.
        const updates: Array<[string, number]> = [];
        if (typeof args.x === 'number') updates.push(['x', args.x]);
        if (typeof args.y === 'number') updates.push(['y', args.y]);

        const scaleX = typeof args.scaleX === 'number' ? args.scaleX : args.scale;
        const scaleY = typeof args.scaleY === 'number' ? args.scaleY : args.scale;
        if (typeof scaleX === 'number') updates.push(['sx', scaleX]);
        if (typeof scaleY === 'number') updates.push(['sy', scaleY]);

        if (typeof args.opacity === 'number') {
            if (args.opacity < 0 || args.opacity > 100) {
                return { success: false, error: 'opacity must be between 0 and 100' };
            }
            updates.push(['opacity', args.opacity]);
        }

        if (updates.length === 0) {
            return { success: false, error: 'set_transform needs at least one of: x, y, scale, scaleX, scaleY, opacity' };
        }

        try {
            // set-image-data takes two positional args (key, value) and writes one
            // field per call; an object of fields is accepted and silently ignored.
            for (const [key, value] of updates) {
                await editorRequest('reference-image', 'set-image-data', key, value);
            }
            const current = await editorRequest('reference-image', 'query-current');
            return {
                success: true,
                message: `Reference image updated: ${updates.map(u => u[0]).join(', ')}`,
                data: { current },
                instruction: 'Run scene_screenshot to verify the new alignment.'
            };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }

    private async query(): Promise<ToolResponse> {
        try {
            const [config, current] = await Promise.all([
                editorRequest('reference-image', 'query-config'),
                editorRequest('reference-image', 'query-current')
            ]);
            return { success: true, data: { current, config } };
        } catch (err: any) {
            return { success: false, error: err?.message || String(err) };
        }
    }
}
