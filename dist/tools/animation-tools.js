"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationTools = void 0;
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
/**
 * Read-only inspection of animation clips and state.
 *
 * Deliberately read-only. Every animation message in the editor is internal
 * (none are declared public), and the write path goes through `animation-operation`
 * — an opaque generic dispatcher whose payloads are not documented anywhere in the
 * message inventory. Guessing at those would corrupt clips, so writes are out of
 * scope until the payload shapes are confirmed against a running editor.
 *
 * Because these messages are internal, each call degrades to an explanatory
 * failure rather than throwing if the editor version doesn't implement it.
 *
 * ponytail: read-only by design — no keyframe/curve editing, no recording. To add
 * writes, first probe `animation-operation` on a real editor (debug_tools
 * probe_cce_api) and record the payload shape before implementing.
 *
 * Spine/skeletal animation is intentionally absent: the message inventory has no
 * spine/skeleton/dragonbones entries at all, so a Spine module would just be
 * generic component property access under a misleading name — use component_query
 * and component_manage against sp.Skeleton instead.
 */
class AnimationTools {
    getTools() {
        return [
            {
                name: 'animation_query',
                description: 'Inspect animation clips and playback state on a node. Read-only — clip editing is not supported. Available actions: list_clips, get_clip, get_state, get_properties, get_current.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list_clips', 'get_clip', 'get_state', 'get_properties', 'get_current'],
                            description: 'Which animation query to run.'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: "Node UUID, path, or unique name carrying the Animation component. Required for all actions except 'get_current'."
                        },
                        clipUuid: {
                            type: 'string',
                            description: "Animation clip UUID. Required for 'get_clip' and 'get_properties'."
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        if (toolName !== 'animation_query') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }
        const action = args === null || args === void 0 ? void 0 : args.action;
        if (!['list_clips', 'get_clip', 'get_state', 'get_properties', 'get_current'].includes(action)) {
            return {
                success: false,
                error: `Unknown action '${action}' for animation_query. Valid actions: list_clips, get_clip, get_state, get_properties, get_current`
            };
        }
        // get_current reads editor-wide state and takes no node.
        let nodeUuid;
        if (action !== 'get_current') {
            if (!args.nodeUuid) {
                return { success: false, error: `nodeUuid is required for '${action}'` };
            }
            try {
                nodeUuid = await (0, node_resolver_1.resolveNodeUuid)(args.nodeUuid);
            }
            catch (err) {
                return { success: false, error: `nodeUuid: ${err.message}` };
            }
        }
        switch (action) {
            case 'list_clips':
                return this.query('query-animation-clips-info', nodeUuid, 'clips');
            case 'get_clip':
                return this.requireClip(args, clip => this.query('query-animation-clip', clip, 'clip'));
            case 'get_state':
                return this.query('query-animation-state', nodeUuid, 'state');
            case 'get_properties':
                return this.requireClip(args, clip => this.query('query-animation-properties', clip, 'properties'));
            case 'get_current':
                return this.query('query-current-animation-info', undefined, 'current');
            default:
                return { success: false, error: `Unhandled action '${action}'` };
        }
    }
    async requireClip(args, run) {
        if (!args.clipUuid) {
            return {
                success: false,
                error: `clipUuid is required for '${args.action}'`,
                instruction: "Run animation_query with action 'list_clips' to get clip UUIDs."
            };
        }
        return run(args.clipUuid);
    }
    /**
     * Run one internal animation message. These are not public API, so an editor
     * that doesn't implement the message yields an explanation, not a raw throw.
     */
    async query(message, arg, key) {
        try {
            const result = arg === undefined
                ? await (0, editor_request_1.editorRequest)('scene', message)
                : await (0, editor_request_1.editorRequest)('scene', message, arg);
            if (result === undefined || result === null) {
                return {
                    success: false,
                    error: `No animation data returned by ${message}.`,
                    instruction: 'Check the node actually has a cc.Animation component with clips assigned.'
                };
            }
            return { success: true, data: { [key]: result } };
        }
        catch (err) {
            return {
                success: false,
                error: `${message} failed: ${(err === null || err === void 0 ? void 0 : err.message) || String(err)}`,
                instruction: 'This uses an internal editor message that may be unavailable in this editor version. Use component_query on cc.Animation to read clip references instead.'
            };
        }
    }
}
exports.AnimationTools = AnimationTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2FuaW1hdGlvbi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBd0Q7QUFDeEQsMERBQXlEO0FBRXpEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNILE1BQWEsY0FBYztJQUN2QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLFdBQVcsRUFBRSxtTEFBbUw7Z0JBQ2hNLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsQ0FBQzs0QkFDOUUsV0FBVyxFQUFFLCtCQUErQjt5QkFDL0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrSEFBa0g7eUJBQ2xJO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb0VBQW9FO3lCQUNwRjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBZ0IsRUFBRSxJQUFTO1FBQ3JDLElBQUksUUFBUSxLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ2xFLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsTUFBTSxDQUFD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TUFBTSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUMxQyxPQUFPO29CQUNILE9BQU8sRUFBRSxLQUFLO29CQUNkLEtBQUssRUFBRSxpQ0FBaUMsT0FBTyxHQUFHO29CQUNsRCxXQUFXLEVBQUUsMkVBQTJFO2lCQUMzRixDQUFDO1lBQ04sQ0FBQztZQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUN0RCxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNILE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxHQUFHLE9BQU8sWUFBWSxDQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxPQUFPLEtBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMxRCxXQUFXLEVBQUUsMkpBQTJKO2FBQzNLLENBQUM7UUFDTixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBN0dELHdDQTZHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyByZXNvbHZlTm9kZVV1aWQgfSBmcm9tICcuLi91dGlscy9ub2RlLXJlc29sdmVyJztcblxuLyoqXG4gKiBSZWFkLW9ubHkgaW5zcGVjdGlvbiBvZiBhbmltYXRpb24gY2xpcHMgYW5kIHN0YXRlLlxuICpcbiAqIERlbGliZXJhdGVseSByZWFkLW9ubHkuIEV2ZXJ5IGFuaW1hdGlvbiBtZXNzYWdlIGluIHRoZSBlZGl0b3IgaXMgaW50ZXJuYWxcbiAqIChub25lIGFyZSBkZWNsYXJlZCBwdWJsaWMpLCBhbmQgdGhlIHdyaXRlIHBhdGggZ29lcyB0aHJvdWdoIGBhbmltYXRpb24tb3BlcmF0aW9uYFxuICog4oCUIGFuIG9wYXF1ZSBnZW5lcmljIGRpc3BhdGNoZXIgd2hvc2UgcGF5bG9hZHMgYXJlIG5vdCBkb2N1bWVudGVkIGFueXdoZXJlIGluIHRoZVxuICogbWVzc2FnZSBpbnZlbnRvcnkuIEd1ZXNzaW5nIGF0IHRob3NlIHdvdWxkIGNvcnJ1cHQgY2xpcHMsIHNvIHdyaXRlcyBhcmUgb3V0IG9mXG4gKiBzY29wZSB1bnRpbCB0aGUgcGF5bG9hZCBzaGFwZXMgYXJlIGNvbmZpcm1lZCBhZ2FpbnN0IGEgcnVubmluZyBlZGl0b3IuXG4gKlxuICogQmVjYXVzZSB0aGVzZSBtZXNzYWdlcyBhcmUgaW50ZXJuYWwsIGVhY2ggY2FsbCBkZWdyYWRlcyB0byBhbiBleHBsYW5hdG9yeVxuICogZmFpbHVyZSByYXRoZXIgdGhhbiB0aHJvd2luZyBpZiB0aGUgZWRpdG9yIHZlcnNpb24gZG9lc24ndCBpbXBsZW1lbnQgaXQuXG4gKlxuICogcG9ueXRhaWw6IHJlYWQtb25seSBieSBkZXNpZ24g4oCUIG5vIGtleWZyYW1lL2N1cnZlIGVkaXRpbmcsIG5vIHJlY29yZGluZy4gVG8gYWRkXG4gKiB3cml0ZXMsIGZpcnN0IHByb2JlIGBhbmltYXRpb24tb3BlcmF0aW9uYCBvbiBhIHJlYWwgZWRpdG9yIChkZWJ1Z190b29sc1xuICogcHJvYmVfY2NlX2FwaSkgYW5kIHJlY29yZCB0aGUgcGF5bG9hZCBzaGFwZSBiZWZvcmUgaW1wbGVtZW50aW5nLlxuICpcbiAqIFNwaW5lL3NrZWxldGFsIGFuaW1hdGlvbiBpcyBpbnRlbnRpb25hbGx5IGFic2VudDogdGhlIG1lc3NhZ2UgaW52ZW50b3J5IGhhcyBub1xuICogc3BpbmUvc2tlbGV0b24vZHJhZ29uYm9uZXMgZW50cmllcyBhdCBhbGwsIHNvIGEgU3BpbmUgbW9kdWxlIHdvdWxkIGp1c3QgYmVcbiAqIGdlbmVyaWMgY29tcG9uZW50IHByb3BlcnR5IGFjY2VzcyB1bmRlciBhIG1pc2xlYWRpbmcgbmFtZSDigJQgdXNlIGNvbXBvbmVudF9xdWVyeVxuICogYW5kIGNvbXBvbmVudF9tYW5hZ2UgYWdhaW5zdCBzcC5Ta2VsZXRvbiBpbnN0ZWFkLlxuICovXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhbmltYXRpb25fcXVlcnknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5zcGVjdCBhbmltYXRpb24gY2xpcHMgYW5kIHBsYXliYWNrIHN0YXRlIG9uIGEgbm9kZS4gUmVhZC1vbmx5IOKAlCBjbGlwIGVkaXRpbmcgaXMgbm90IHN1cHBvcnRlZC4gQXZhaWxhYmxlIGFjdGlvbnM6IGxpc3RfY2xpcHMsIGdldF9jbGlwLCBnZXRfc3RhdGUsIGdldF9wcm9wZXJ0aWVzLCBnZXRfY3VycmVudC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2xpc3RfY2xpcHMnLCAnZ2V0X2NsaXAnLCAnZ2V0X3N0YXRlJywgJ2dldF9wcm9wZXJ0aWVzJywgJ2dldF9jdXJyZW50J10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXaGljaCBhbmltYXRpb24gcXVlcnkgdG8gcnVuLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIk5vZGUgVVVJRCwgcGF0aCwgb3IgdW5pcXVlIG5hbWUgY2FycnlpbmcgdGhlIEFuaW1hdGlvbiBjb21wb25lbnQuIFJlcXVpcmVkIGZvciBhbGwgYWN0aW9ucyBleGNlcHQgJ2dldF9jdXJyZW50Jy5cIlxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQW5pbWF0aW9uIGNsaXAgVVVJRC4gUmVxdWlyZWQgZm9yICdnZXRfY2xpcCcgYW5kICdnZXRfcHJvcGVydGllcycuXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAodG9vbE5hbWUgIT09ICdhbmltYXRpb25fcXVlcnknKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncz8uYWN0aW9uO1xuICAgICAgICBpZiAoIVsnbGlzdF9jbGlwcycsICdnZXRfY2xpcCcsICdnZXRfc3RhdGUnLCAnZ2V0X3Byb3BlcnRpZXMnLCAnZ2V0X2N1cnJlbnQnXS5pbmNsdWRlcyhhY3Rpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgVW5rbm93biBhY3Rpb24gJyR7YWN0aW9ufScgZm9yIGFuaW1hdGlvbl9xdWVyeS4gVmFsaWQgYWN0aW9uczogbGlzdF9jbGlwcywgZ2V0X2NsaXAsIGdldF9zdGF0ZSwgZ2V0X3Byb3BlcnRpZXMsIGdldF9jdXJyZW50YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGdldF9jdXJyZW50IHJlYWRzIGVkaXRvci13aWRlIHN0YXRlIGFuZCB0YWtlcyBubyBub2RlLlxuICAgICAgICBsZXQgbm9kZVV1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGFjdGlvbiAhPT0gJ2dldF9jdXJyZW50Jykge1xuICAgICAgICAgICAgaWYgKCFhcmdzLm5vZGVVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgbm9kZVV1aWQgaXMgcmVxdWlyZWQgZm9yICcke2FjdGlvbn0nYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBub2RlVXVpZCA9IGF3YWl0IHJlc29sdmVOb2RlVXVpZChhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgbm9kZVV1aWQ6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfY2xpcHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KCdxdWVyeS1hbmltYXRpb24tY2xpcHMtaW5mbycsIG5vZGVVdWlkLCAnY2xpcHMnKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jbGlwJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXF1aXJlQ2xpcChhcmdzLCBjbGlwID0+IHRoaXMucXVlcnkoJ3F1ZXJ5LWFuaW1hdGlvbi1jbGlwJywgY2xpcCwgJ2NsaXAnKSk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc3RhdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KCdxdWVyeS1hbmltYXRpb24tc3RhdGUnLCBub2RlVXVpZCwgJ3N0YXRlJyk7XG4gICAgICAgICAgICBjYXNlICdnZXRfcHJvcGVydGllcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVxdWlyZUNsaXAoYXJncywgY2xpcCA9PiB0aGlzLnF1ZXJ5KCdxdWVyeS1hbmltYXRpb24tcHJvcGVydGllcycsIGNsaXAsICdwcm9wZXJ0aWVzJykpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2N1cnJlbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KCdxdWVyeS1jdXJyZW50LWFuaW1hdGlvbi1pbmZvJywgdW5kZWZpbmVkLCAnY3VycmVudCcpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmhhbmRsZWQgYWN0aW9uICcke2FjdGlvbn0nYCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXF1aXJlQ2xpcChhcmdzOiBhbnksIHJ1bjogKGNsaXBVdWlkOiBzdHJpbmcpID0+IFByb21pc2U8VG9vbFJlc3BvbnNlPik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghYXJncy5jbGlwVXVpZCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYGNsaXBVdWlkIGlzIHJlcXVpcmVkIGZvciAnJHthcmdzLmFjdGlvbn0nYCxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogXCJSdW4gYW5pbWF0aW9uX3F1ZXJ5IHdpdGggYWN0aW9uICdsaXN0X2NsaXBzJyB0byBnZXQgY2xpcCBVVUlEcy5cIlxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnVuKGFyZ3MuY2xpcFV1aWQpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJ1biBvbmUgaW50ZXJuYWwgYW5pbWF0aW9uIG1lc3NhZ2UuIFRoZXNlIGFyZSBub3QgcHVibGljIEFQSSwgc28gYW4gZWRpdG9yXG4gICAgICogdGhhdCBkb2Vzbid0IGltcGxlbWVudCB0aGUgbWVzc2FnZSB5aWVsZHMgYW4gZXhwbGFuYXRpb24sIG5vdCBhIHJhdyB0aHJvdy5cbiAgICAgKi9cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KG1lc3NhZ2U6IHN0cmluZywgYXJnOiBzdHJpbmcgfCB1bmRlZmluZWQsIGtleTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGFyZyA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgPyBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsIG1lc3NhZ2UgYXMgYW55KVxuICAgICAgICAgICAgICAgIDogYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCBtZXNzYWdlIGFzIGFueSwgYXJnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkIHx8IHJlc3VsdCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYE5vIGFuaW1hdGlvbiBkYXRhIHJldHVybmVkIGJ5ICR7bWVzc2FnZX0uYCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdDaGVjayB0aGUgbm9kZSBhY3R1YWxseSBoYXMgYSBjYy5BbmltYXRpb24gY29tcG9uZW50IHdpdGggY2xpcHMgYXNzaWduZWQuJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgW2tleV06IHJlc3VsdCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgJHttZXNzYWdlfSBmYWlsZWQ6ICR7ZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpfWAsXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdUaGlzIHVzZXMgYW4gaW50ZXJuYWwgZWRpdG9yIG1lc3NhZ2UgdGhhdCBtYXkgYmUgdW5hdmFpbGFibGUgaW4gdGhpcyBlZGl0b3IgdmVyc2lvbi4gVXNlIGNvbXBvbmVudF9xdWVyeSBvbiBjYy5BbmltYXRpb24gdG8gcmVhZCBjbGlwIHJlZmVyZW5jZXMgaW5zdGVhZC4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19