import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class AnimationTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'manage_animation',
                description:
                    'Manage animations on nodes. Available actions: ' +
                    'get_clips (list animation clips on a node), ' +
                    'get_state (get current animation state), ' +
                    'play (play an animation clip), ' +
                    'stop (stop animation), ' +
                    'pause (pause animation), ' +
                    'resume (resume paused animation).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_clips', 'get_state', 'play', 'stop', 'pause', 'resume'],
                            description: 'Animation action to perform'
                        },
                        nodeUuid: {
                            type: 'string',
                            description: 'UUID of the node with Animation component'
                        },
                        clipName: {
                            type: 'string',
                            description: 'Name of the animation clip (required for play action)'
                        }
                    },
                    required: ['action', 'nodeUuid']
                }
            }
        ];
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        const action = args.action;
        switch (action) {
            case 'get_clips':
                return await this.getClips(args.nodeUuid);
            case 'get_state':
                return await this.getState(args.nodeUuid);
            case 'play':
                return await this.controlAnimation(args.nodeUuid, 'play', args.clipName);
            case 'stop':
                return await this.controlAnimation(args.nodeUuid, 'stop');
            case 'pause':
                return await this.controlAnimation(args.nodeUuid, 'pause');
            case 'resume':
                return await this.controlAnimation(args.nodeUuid, 'resume');
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }

    private async getClips(nodeUuid: string): Promise<ToolResponse> {
        try {
            // Query node to find Animation component
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__) {
                return { success: false, error: 'Node not found or has no components' };
            }

            const animComp = (nodeData.__comps__ as any[]).find(
                (c: any) => c.__type__ === 'cc.Animation' || c.__type__ === 'cc.AnimationController'
            );

            if (!animComp) {
                return { success: false, error: 'No Animation component found on this node' };
            }

            // Extract clip references
            const clips: string[] = [];
            if (animComp._clips && Array.isArray(animComp._clips)) {
                for (const clip of animComp._clips) {
                    if (clip && clip.__uuid__) {
                        try {
                            const clipInfo = await Editor.Message.request('asset-db', 'query-asset-info', clip.__uuid__);
                            clips.push(clipInfo?.name || clip.__uuid__);
                        } catch {
                            clips.push(clip.__uuid__);
                        }
                    }
                }
            }

            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: animComp.__type__,
                    clips,
                    defaultClip: animComp._defaultClip?.__uuid__ || null,
                    playOnLoad: animComp.playOnLoad ?? false
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getState(nodeUuid: string): Promise<ToolResponse> {
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__) {
                return { success: false, error: 'Node not found' };
            }

            const animComp = (nodeData.__comps__ as any[]).find(
                (c: any) => c.__type__ === 'cc.Animation' || c.__type__ === 'cc.AnimationController'
            );

            if (!animComp) {
                return { success: false, error: 'No Animation component found' };
            }

            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: animComp.__type__,
                    enabled: animComp.enabled ?? true,
                    playOnLoad: animComp.playOnLoad ?? false,
                    clipCount: animComp._clips ? animComp._clips.length : 0
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async controlAnimation(nodeUuid: string, command: string, clipName?: string): Promise<ToolResponse> {
        try {
            // Use scene script to control animation at runtime
            const options = {
                name: 'cocos-mcp-server',
                method: 'controlAnimation',
                args: [nodeUuid, command, clipName]
            };

            const result = await Editor.Message.request('scene', 'execute-scene-script', options);
            if (result && result.success) {
                return result;
            }

            return {
                success: true,
                message: `Animation ${command} sent for node ${nodeUuid}` + (clipName ? ` (clip: ${clipName})` : ''),
                instruction: 'Animation control requires the scene to be in play/preview mode for full effect.'
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
