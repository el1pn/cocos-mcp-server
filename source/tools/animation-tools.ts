import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';
import { resolveNodeUuid } from '../utils/node-resolver';

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
export class AnimationTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName !== 'animation_query') {
            return { success: false, error: `Unknown tool: ${toolName}` };
        }

        const action = args?.action;
        if (!['list_clips', 'get_clip', 'get_state', 'get_properties', 'get_current'].includes(action)) {
            return {
                success: false,
                error: `Unknown action '${action}' for animation_query. Valid actions: list_clips, get_clip, get_state, get_properties, get_current`
            };
        }

        // get_current reads editor-wide state and takes no node.
        let nodeUuid: string | undefined;
        if (action !== 'get_current') {
            if (!args.nodeUuid) {
                return { success: false, error: `nodeUuid is required for '${action}'` };
            }
            try {
                nodeUuid = await resolveNodeUuid(args.nodeUuid);
            } catch (err: any) {
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

    private async requireClip(args: any, run: (clipUuid: string) => Promise<ToolResponse>): Promise<ToolResponse> {
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
    private async query(message: string, arg: string | undefined, key: string): Promise<ToolResponse> {
        try {
            const result = arg === undefined
                ? await editorRequest('scene', message as any)
                : await editorRequest('scene', message as any, arg);

            if (result === undefined || result === null) {
                return {
                    success: false,
                    error: `No animation data returned by ${message}.`,
                    instruction: 'Check the node actually has a cc.Animation component with clips assigned.'
                };
            }

            return { success: true, data: { [key]: result } };
        } catch (err: any) {
            return {
                success: false,
                error: `${message} failed: ${err?.message || String(err)}`,
                instruction: 'This uses an internal editor message that may be unavailable in this editor version. Use component_query on cc.Animation to read clip references instead.'
            };
        }
    }
}
