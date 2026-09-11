"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceImageTools = void 0;
const editor_request_1 = require("../utils/editor-request");
const asset_safety_1 = require("../utils/asset-safety");
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
class ReferenceImageTools {
    getTools() {
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
    async execute(toolName, args) {
        if (toolName !== 'reference_image') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }
        switch (args === null || args === void 0 ? void 0 : args.action) {
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
                    error: `Unknown action '${args === null || args === void 0 ? void 0 : args.action}' for reference_image. Valid actions: add, remove, switch, set_transform, query`
                };
        }
    }
    /**
     * Turn a caller's reference into the absolute filesystem path this extension
     * actually stores. A db:// url is translated through the asset DB; an absolute
     * path is passed through unchanged.
     */
    async toFsPath(url, action) {
        if (!url) {
            throw new Error(`url is required for '${action}', e.g. 'db://assets/mockups/home.png'`);
        }
        if (!url.startsWith('db://')) {
            if (!url.startsWith('/')) {
                throw new Error(`url must be a db:// asset url or an absolute file path, got '${url}'`);
            }
            return url;
        }
        (0, asset_safety_1.validateAssetUrl)(url);
        const fsPath = await (0, editor_request_1.editorRequest)('asset-db', 'query-path', url);
        if (!fsPath) {
            throw new Error(`Asset '${url}' not found in the asset database`);
        }
        return fsPath;
    }
    async add(url) {
        try {
            const fsPath = await this.toFsPath(url, 'add');
            // Takes an ARRAY: a bare string gets iterated character by character,
            // registering one bogus entry per character.
            await (0, editor_request_1.editorRequest)('reference-image', 'add-image', [fsPath]);
            return {
                success: true,
                message: `Reference image added: ${fsPath}`,
                instruction: 'Run scene_screenshot to see the overlay and compare it against the scene.'
            };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async remove(url) {
        try {
            const fsPath = await this.toFsPath(url, 'remove');
            // Removing an unregistered path is a silent no-op in the editor, so
            // check first to give the caller a real answer.
            const config = await (0, editor_request_1.editorRequest)('reference-image', 'query-config');
            const images = (config === null || config === void 0 ? void 0 : config.images) || [];
            if (!images.some(img => (img === null || img === void 0 ? void 0 : img.path) === fsPath)) {
                return {
                    success: false,
                    error: `Reference image '${fsPath}' is not registered.`,
                    instruction: "Run reference_image with action 'query' to list registered images."
                };
            }
            // Takes an ARRAY, like add-image.
            await (0, editor_request_1.editorRequest)('reference-image', 'remove-image', [fsPath]);
            return { success: true, message: `Reference image removed: ${fsPath}` };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async switch(url) {
        try {
            const fsPath = await this.toFsPath(url, 'switch');
            await (0, editor_request_1.editorRequest)('reference-image', 'switch-image', fsPath);
            return {
                success: true,
                message: `Active reference image: ${fsPath}`,
                instruction: 'Run scene_screenshot to see the overlay.'
            };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async setTransform(args) {
        // The editor keeps separate sx/sy; `scale` is this tool's convenience for
        // setting both.
        const updates = [];
        if (typeof args.x === 'number')
            updates.push(['x', args.x]);
        if (typeof args.y === 'number')
            updates.push(['y', args.y]);
        const scaleX = typeof args.scaleX === 'number' ? args.scaleX : args.scale;
        const scaleY = typeof args.scaleY === 'number' ? args.scaleY : args.scale;
        if (typeof scaleX === 'number')
            updates.push(['sx', scaleX]);
        if (typeof scaleY === 'number')
            updates.push(['sy', scaleY]);
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
                await (0, editor_request_1.editorRequest)('reference-image', 'set-image-data', key, value);
            }
            const current = await (0, editor_request_1.editorRequest)('reference-image', 'query-current');
            return {
                success: true,
                message: `Reference image updated: ${updates.map(u => u[0]).join(', ')}`,
                data: { current },
                instruction: 'Run scene_screenshot to verify the new alignment.'
            };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async query() {
        try {
            const [config, current] = await Promise.all([
                (0, editor_request_1.editorRequest)('reference-image', 'query-config'),
                (0, editor_request_1.editorRequest)('reference-image', 'query-current')
            ]);
            return { success: true, data: { current, config } };
        }
        catch (err) {
            return { success: false, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
}
exports.ReferenceImageTools = ReferenceImageTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWltYWdlLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBd0Q7QUFDeEQsd0RBQXlEO0FBRXpEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0gsTUFBYSxtQkFBbUI7SUFDNUIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixXQUFXLEVBQUUscU9BQXFPO2dCQUNsUCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsT0FBTyxDQUFDOzRCQUMzRCxXQUFXLEVBQUUsOENBQThDO3lCQUM5RDt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGdKQUFnSjt5QkFDaEs7d0JBQ0QsQ0FBQyxFQUFFOzRCQUNDLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxtREFBbUQ7eUJBQ25FO3dCQUNELENBQUMsRUFBRTs0QkFDQyxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsaURBQWlEO3lCQUNqRTt3QkFDRCxLQUFLLEVBQUU7NEJBQ0gsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHFHQUFxRzt5QkFDckg7d0JBQ0QsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyREFBMkQ7eUJBQzNFO3dCQUNELE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUseURBQXlEO3lCQUN6RTt3QkFDRCxP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Q0FBRSxPQUFPLEtBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEUsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQTFNRCxrREEwTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgdmFsaWRhdGVBc3NldFVybCB9IGZyb20gJy4uL3V0aWxzL2Fzc2V0LXNhZmV0eSc7XG5cbi8qKlxuICogUmVmZXJlbmNlIGltYWdlczogZGVzaWduIG1vY2t1cHMgb3ZlcmxhaWQgb24gdGhlIHNjZW5lIHZpZXcuXG4gKlxuICogQW4gZWFybGllciB2ZXJzaW9uIG9mIHRoaXMgdG9vbCB3YXMgcmVtb3ZlZCBiZWNhdXNlIGFuIEFJIGNsaWVudCBoYWQgbm8gd2F5IHRvXG4gKiBzZWUgdGhlIHNjZW5lIHZpZXcsIHdoaWNoIG1hZGUgYW4gb3ZlcmxheSBwb2ludGxlc3MuIFRoYXQgaXMgbm8gbG9uZ2VyIHRydWUg4oCUXG4gKiBgc2NlbmVfc2NyZWVuc2hvdGAgcmV0dXJucyB0aGUgcmVuZGVyZWQgdmlldyBpbmxpbmUgYWxvbmcgd2l0aCBhIHdvcmxkPC0+cGl4ZWxcbiAqIG1hcHBpbmcsIHNvIGFuIG92ZXJsYXkgY2FuIG5vdyBiZSBhZGRlZCwgY2FwdHVyZWQsIGNvbXBhcmVkIGFnYWluc3QgdGhlIGludGVuZGVkXG4gKiBsYXlvdXQsIGFuZCBjb3JyZWN0ZWQuIFBhaXIgZXZlcnkgY2hhbmdlIGhlcmUgd2l0aCBhIGNhcHR1cmU7IG9uIGl0cyBvd24gdGhpc1xuICogdG9vbCBzdGlsbCBzaG93cyBub3RoaW5nLlxuICpcbiAqIEFsbCBzaXggbWVzc2FnZXMgdXNlZCBoZXJlIGFyZSBwdWJsaWMgQVBJIG9mIHRoZSBidWlsdC1pbiBgcmVmZXJlbmNlLWltYWdlYFxuICogZXh0ZW5zaW9uLiBUaGVpciBhcmd1bWVudCBzaGFwZXMgYXJlIHVuZG9jdW1lbnRlZCBhbmQgd2VyZSBjb25maXJtZWQgYWdhaW5zdCBhXG4gKiBydW5uaW5nIDMuOC44IGVkaXRvcjpcbiAqICAgYWRkLWltYWdlICAgICAgLT4gYXJyYXkgb2YgYWJzb2x1dGUgZmlsZXN5c3RlbSBwYXRocyAoTk9UIGRiOi8vIHVybHM7IGEgYmFyZVxuICogICAgICAgICAgICAgICAgICAgICBzdHJpbmcgaXMgaXRlcmF0ZWQgY2hhcmFjdGVyIGJ5IGNoYXJhY3RlciwgcmVnaXN0ZXJpbmcgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgIGJvZ3VzIGltYWdlIHBlciBjaGFyYWN0ZXIpXG4gKiAgIHJlbW92ZS1pbWFnZSAgIC0+IGFycmF5IG9mIGZpbGVzeXN0ZW0gcGF0aHMsIHNhbWUgYXMgYWRkLWltYWdlIChhIGJhcmUgbnVtYmVyXG4gKiAgICAgICAgICAgICAgICAgICAgIHRocm93cyBcImEgaXMgbm90IGl0ZXJhYmxlXCI7IGEgYmFyZSBzdHJpbmcgaGFwcGVucyB0byB3b3JrXG4gKiAgICAgICAgICAgICAgICAgICAgIGJlY2F1c2UgYSBzdHJpbmcgaXMgaXRlcmFibGUsIGJ1dCBvbmx5IGJ5IGFjY2lkZW50KVxuICogICBzd2l0Y2gtaW1hZ2UgICAtPiBzaW5nbGUgZmlsZXN5c3RlbSBwYXRoIHN0cmluZ1xuICogICBzZXQtaW1hZ2UtZGF0YSAtPiB0d28gcG9zaXRpb25hbCBhcmdzLCAoa2V5LCB2YWx1ZSksIG9uZSBmaWVsZCBwZXIgY2FsbDtcbiAqICAgICAgICAgICAgICAgICAgICAgYW4gb2JqZWN0IG9mIGZpZWxkcyBpcyBzaWxlbnRseSBpZ25vcmVkLiBGaWVsZHMgYXJlXG4gKiAgICAgICAgICAgICAgICAgICAgIHgsIHksIHN4LCBzeSwgb3BhY2l0eSDigJQgdGhlcmUgaXMgbm8gY29tYmluZWQgYHNjYWxlYC5cbiAqIFRoZSBlZGl0b3Igc3RvcmVzIGFuZCByZXBvcnRzIHRoZXNlIGFzIGZpbGVzeXN0ZW0gcGF0aHMsIHNvIGEgZGI6Ly8gdXJsIGdpdmVuXG4gKiBieSBhIGNhbGxlciBpcyByZXNvbHZlZCB0byBkaXNrIGJlZm9yZSBiZWluZyBwYXNzZWQgb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBSZWZlcmVuY2VJbWFnZVRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVmZXJlbmNlX2ltYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ092ZXJsYXkgYSBkZXNpZ24gbW9ja3VwIG9uIHRoZSBzY2VuZSB2aWV3IHRvIGNvbXBhcmUgYWdhaW5zdCB0aGUgYnVpbHQgbGF5b3V0LiBQYWlyIHdpdGggc2NlbmVfc2NyZWVuc2hvdDogYWRkIHRoZSBpbWFnZSwgY2FwdHVyZSwgY29tcGFyZSwgYWRqdXN0IG5vZGVzLCByZS1jYXB0dXJlLiBBdmFpbGFibGUgYWN0aW9uczogYWRkLCByZW1vdmUsIHN3aXRjaCwgc2V0X3RyYW5zZm9ybSwgcXVlcnkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydhZGQnLCAncmVtb3ZlJywgJ3N3aXRjaCcsICdzZXRfdHJhbnNmb3JtJywgJ3F1ZXJ5J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGF0IHRvIGRvIHdpdGggdGhlIHJlZmVyZW5jZSBpbWFnZSBvdmVybGF5LidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJJbWFnZSBsb2NhdGlvbjogYSBkYjovLyBhc3NldCBVUkwgc3VjaCBhcyAnZGI6Ly9hc3NldHMvbW9ja3Vwcy9ob21lLnBuZycsIG9yIGFuIGFic29sdXRlIGZpbGUgcGF0aC4gUmVxdWlyZWQgZm9yICdhZGQnLCAncmVtb3ZlJyBhbmQgJ3N3aXRjaCcuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB4OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSG9yaXpvbnRhbCBvZmZzZXQgaW4gc2NlbmUgdW5pdHMgKHNldF90cmFuc2Zvcm0pLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlZlcnRpY2FsIG9mZnNldCBpbiBzY2VuZSB1bml0cyAoc2V0X3RyYW5zZm9ybSkuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlVuaWZvcm0gc2NhbGUgZmFjdG9yLCAxID0gb3JpZ2luYWwgc2l6ZSAoc2V0X3RyYW5zZm9ybSkuIFVzZSBzY2FsZVgvc2NhbGVZIGZvciBhIG5vbi11bmlmb3JtIHNjYWxlLlwiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGVYOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiSG9yaXpvbnRhbCBzY2FsZSBmYWN0b3IgKHNldF90cmFuc2Zvcm0pLiBPdmVycmlkZXMgc2NhbGUuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZVk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJWZXJ0aWNhbCBzY2FsZSBmYWN0b3IgKHNldF90cmFuc2Zvcm0pLiBPdmVycmlkZXMgc2NhbGUuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiT3BhY2l0eSAwLTEwMDsgbG93ZXIgdmFsdWVzIGxldCB0aGUgc2NlbmUgc2hvdyB0aHJvdWdoIChzZXRfdHJhbnNmb3JtKS5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICh0b29sTmFtZSAhPT0gJ3JlZmVyZW5jZV9pbWFnZScpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gIH07XG4gICAgICAgIH1cblxuICAgICAgICBzd2l0Y2ggKGFyZ3M/LmFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoYXJncy51cmwpO1xuICAgICAgICAgICAgY2FzZSAncmVtb3ZlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmUoYXJncy51cmwpO1xuICAgICAgICAgICAgY2FzZSAnc3dpdGNoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zd2l0Y2goYXJncy51cmwpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X3RyYW5zZm9ybSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0VHJhbnNmb3JtKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnknOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFVua25vd24gYWN0aW9uICcke2FyZ3M/LmFjdGlvbn0nIGZvciByZWZlcmVuY2VfaW1hZ2UuIFZhbGlkIGFjdGlvbnM6IGFkZCwgcmVtb3ZlLCBzd2l0Y2gsIHNldF90cmFuc2Zvcm0sIHF1ZXJ5YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBUdXJuIGEgY2FsbGVyJ3MgcmVmZXJlbmNlIGludG8gdGhlIGFic29sdXRlIGZpbGVzeXN0ZW0gcGF0aCB0aGlzIGV4dGVuc2lvblxuICAgICAqIGFjdHVhbGx5IHN0b3Jlcy4gQSBkYjovLyB1cmwgaXMgdHJhbnNsYXRlZCB0aHJvdWdoIHRoZSBhc3NldCBEQjsgYW4gYWJzb2x1dGVcbiAgICAgKiBwYXRoIGlzIHBhc3NlZCB0aHJvdWdoIHVuY2hhbmdlZC5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHRvRnNQYXRoKHVybDogc3RyaW5nLCBhY3Rpb246IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYHVybCBpcyByZXF1aXJlZCBmb3IgJyR7YWN0aW9ufScsIGUuZy4gJ2RiOi8vYXNzZXRzL21vY2t1cHMvaG9tZS5wbmcnYCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF1cmwuc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xuICAgICAgICAgICAgaWYgKCF1cmwuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGB1cmwgbXVzdCBiZSBhIGRiOi8vIGFzc2V0IHVybCBvciBhbiBhYnNvbHV0ZSBmaWxlIHBhdGgsIGdvdCAnJHt1cmx9J2ApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbGlkYXRlQXNzZXRVcmwodXJsKTtcbiAgICAgICAgY29uc3QgZnNQYXRoID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxzdHJpbmc+KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgdXJsKTtcbiAgICAgICAgaWYgKCFmc1BhdGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQXNzZXQgJyR7dXJsfScgbm90IGZvdW5kIGluIHRoZSBhc3NldCBkYXRhYmFzZWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmc1BhdGg7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhZGQodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZnNQYXRoID0gYXdhaXQgdGhpcy50b0ZzUGF0aCh1cmwsICdhZGQnKTtcbiAgICAgICAgICAgIC8vIFRha2VzIGFuIEFSUkFZOiBhIGJhcmUgc3RyaW5nIGdldHMgaXRlcmF0ZWQgY2hhcmFjdGVyIGJ5IGNoYXJhY3RlcixcbiAgICAgICAgICAgIC8vIHJlZ2lzdGVyaW5nIG9uZSBib2d1cyBlbnRyeSBwZXIgY2hhcmFjdGVyLlxuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ2FkZC1pbWFnZScsIFtmc1BhdGhdKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUmVmZXJlbmNlIGltYWdlIGFkZGVkOiAke2ZzUGF0aH1gLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnUnVuIHNjZW5lX3NjcmVlbnNob3QgdG8gc2VlIHRoZSBvdmVybGF5IGFuZCBjb21wYXJlIGl0IGFnYWluc3QgdGhlIHNjZW5lLidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmUodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZnNQYXRoID0gYXdhaXQgdGhpcy50b0ZzUGF0aCh1cmwsICdyZW1vdmUnKTtcbiAgICAgICAgICAgIC8vIFJlbW92aW5nIGFuIHVucmVnaXN0ZXJlZCBwYXRoIGlzIGEgc2lsZW50IG5vLW9wIGluIHRoZSBlZGl0b3IsIHNvXG4gICAgICAgICAgICAvLyBjaGVjayBmaXJzdCB0byBnaXZlIHRoZSBjYWxsZXIgYSByZWFsIGFuc3dlci5cbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8YW55PigncmVmZXJlbmNlLWltYWdlJywgJ3F1ZXJ5LWNvbmZpZycpO1xuICAgICAgICAgICAgY29uc3QgaW1hZ2VzOiBhbnlbXSA9IGNvbmZpZz8uaW1hZ2VzIHx8IFtdO1xuICAgICAgICAgICAgaWYgKCFpbWFnZXMuc29tZShpbWcgPT4gaW1nPy5wYXRoID09PSBmc1BhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgUmVmZXJlbmNlIGltYWdlICcke2ZzUGF0aH0nIGlzIG5vdCByZWdpc3RlcmVkLmAsXG4gICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBcIlJ1biByZWZlcmVuY2VfaW1hZ2Ugd2l0aCBhY3Rpb24gJ3F1ZXJ5JyB0byBsaXN0IHJlZ2lzdGVyZWQgaW1hZ2VzLlwiXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGFrZXMgYW4gQVJSQVksIGxpa2UgYWRkLWltYWdlLlxuICAgICAgICAgICAgYXdhaXQgZWRpdG9yUmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ3JlbW92ZS1pbWFnZScsIFtmc1BhdGhdKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZWZlcmVuY2UgaW1hZ2UgcmVtb3ZlZDogJHtmc1BhdGh9YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3dpdGNoKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZzUGF0aCA9IGF3YWl0IHRoaXMudG9Gc1BhdGgodXJsLCAnc3dpdGNoJyk7XG4gICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAnc3dpdGNoLWltYWdlJywgZnNQYXRoKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQWN0aXZlIHJlZmVyZW5jZSBpbWFnZTogJHtmc1BhdGh9YCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1J1biBzY2VuZV9zY3JlZW5zaG90IHRvIHNlZSB0aGUgb3ZlcmxheS4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0VHJhbnNmb3JtKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIC8vIFRoZSBlZGl0b3Iga2VlcHMgc2VwYXJhdGUgc3gvc3k7IGBzY2FsZWAgaXMgdGhpcyB0b29sJ3MgY29udmVuaWVuY2UgZm9yXG4gICAgICAgIC8vIHNldHRpbmcgYm90aC5cbiAgICAgICAgY29uc3QgdXBkYXRlczogQXJyYXk8W3N0cmluZywgbnVtYmVyXT4gPSBbXTtcbiAgICAgICAgaWYgKHR5cGVvZiBhcmdzLnggPT09ICdudW1iZXInKSB1cGRhdGVzLnB1c2goWyd4JywgYXJncy54XSk7XG4gICAgICAgIGlmICh0eXBlb2YgYXJncy55ID09PSAnbnVtYmVyJykgdXBkYXRlcy5wdXNoKFsneScsIGFyZ3MueV0pO1xuXG4gICAgICAgIGNvbnN0IHNjYWxlWCA9IHR5cGVvZiBhcmdzLnNjYWxlWCA9PT0gJ251bWJlcicgPyBhcmdzLnNjYWxlWCA6IGFyZ3Muc2NhbGU7XG4gICAgICAgIGNvbnN0IHNjYWxlWSA9IHR5cGVvZiBhcmdzLnNjYWxlWSA9PT0gJ251bWJlcicgPyBhcmdzLnNjYWxlWSA6IGFyZ3Muc2NhbGU7XG4gICAgICAgIGlmICh0eXBlb2Ygc2NhbGVYID09PSAnbnVtYmVyJykgdXBkYXRlcy5wdXNoKFsnc3gnLCBzY2FsZVhdKTtcbiAgICAgICAgaWYgKHR5cGVvZiBzY2FsZVkgPT09ICdudW1iZXInKSB1cGRhdGVzLnB1c2goWydzeScsIHNjYWxlWV0pO1xuXG4gICAgICAgIGlmICh0eXBlb2YgYXJncy5vcGFjaXR5ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgaWYgKGFyZ3Mub3BhY2l0eSA8IDAgfHwgYXJncy5vcGFjaXR5ID4gMTAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnb3BhY2l0eSBtdXN0IGJlIGJldHdlZW4gMCBhbmQgMTAwJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlcy5wdXNoKFsnb3BhY2l0eScsIGFyZ3Mub3BhY2l0eV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHVwZGF0ZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdzZXRfdHJhbnNmb3JtIG5lZWRzIGF0IGxlYXN0IG9uZSBvZjogeCwgeSwgc2NhbGUsIHNjYWxlWCwgc2NhbGVZLCBvcGFjaXR5JyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIHNldC1pbWFnZS1kYXRhIHRha2VzIHR3byBwb3NpdGlvbmFsIGFyZ3MgKGtleSwgdmFsdWUpIGFuZCB3cml0ZXMgb25lXG4gICAgICAgICAgICAvLyBmaWVsZCBwZXIgY2FsbDsgYW4gb2JqZWN0IG9mIGZpZWxkcyBpcyBhY2NlcHRlZCBhbmQgc2lsZW50bHkgaWdub3JlZC5cbiAgICAgICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHVwZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAnc2V0LWltYWdlLWRhdGEnLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY3VycmVudCcpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBSZWZlcmVuY2UgaW1hZ2UgdXBkYXRlZDogJHt1cGRhdGVzLm1hcCh1ID0+IHVbMF0pLmpvaW4oJywgJyl9YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGN1cnJlbnQgfSxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1J1biBzY2VuZV9zY3JlZW5zaG90IHRvIHZlcmlmeSB0aGUgbmV3IGFsaWdubWVudC4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFtjb25maWcsIGN1cnJlbnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgICAgIGVkaXRvclJlcXVlc3QoJ3JlZmVyZW5jZS1pbWFnZScsICdxdWVyeS1jb25maWcnKSxcbiAgICAgICAgICAgICAgICBlZGl0b3JSZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY3VycmVudCcpXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgY3VycmVudCwgY29uZmlnIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=