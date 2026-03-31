"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationTools = void 0;
const action_aliases_1 = require("../utils/action-aliases");
class AnimationTools {
    getTools() {
        return [
            {
                name: 'manage_animation',
                description: 'Manage animations on nodes. Available actions: ' +
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
    async execute(_toolName, args) {
        const action = (0, action_aliases_1.normalizeAction)('manage_animation', args.action);
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
    async getClips(nodeUuid) {
        var _a, _b;
        try {
            // Query node to find Animation component
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__) {
                return { success: false, error: 'Node not found or has no components' };
            }
            const animComp = nodeData.__comps__.find((c) => c.__type__ === 'cc.Animation' || c.__type__ === 'cc.AnimationController');
            if (!animComp) {
                return { success: false, error: 'No Animation component found on this node' };
            }
            // Extract clip references
            const clips = [];
            if (animComp._clips && Array.isArray(animComp._clips)) {
                for (const clip of animComp._clips) {
                    if (clip && clip.__uuid__) {
                        try {
                            const clipInfo = await Editor.Message.request('asset-db', 'query-asset-info', clip.__uuid__);
                            clips.push((clipInfo === null || clipInfo === void 0 ? void 0 : clipInfo.name) || clip.__uuid__);
                        }
                        catch (_c) {
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
                    defaultClip: ((_a = animComp._defaultClip) === null || _a === void 0 ? void 0 : _a.__uuid__) || null,
                    playOnLoad: (_b = animComp.playOnLoad) !== null && _b !== void 0 ? _b : false
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getState(nodeUuid) {
        var _a, _b;
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__) {
                return { success: false, error: 'Node not found' };
            }
            const animComp = nodeData.__comps__.find((c) => c.__type__ === 'cc.Animation' || c.__type__ === 'cc.AnimationController');
            if (!animComp) {
                return { success: false, error: 'No Animation component found' };
            }
            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: animComp.__type__,
                    enabled: (_a = animComp.enabled) !== null && _a !== void 0 ? _a : true,
                    playOnLoad: (_b = animComp.playOnLoad) !== null && _b !== void 0 ? _b : false,
                    clipCount: animComp._clips ? animComp._clips.length : 0
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async controlAnimation(nodeUuid, command, clipName) {
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.AnimationTools = AnimationTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2FuaW1hdGlvbi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw0REFBMEQ7QUFFMUQsTUFBYSxjQUFjO0lBQ3ZCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUNQLGlEQUFpRDtvQkFDakQsOENBQThDO29CQUM5QywyQ0FBMkM7b0JBQzNDLGlDQUFpQztvQkFDakMseUJBQXlCO29CQUN6QiwyQkFBMkI7b0JBQzNCLG1DQUFtQztnQkFDdkMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUM7NEJBQ25FLFdBQVcsRUFBRSw2QkFBNkI7eUJBQzdDO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkNBQTJDO3lCQUMzRDt3QkFDRCxRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHVEQUF1RDt5QkFDdkU7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztpQkFDbkM7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFpQixFQUFFLElBQVM7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQ0FBZSxFQUFDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoRSxRQUFRLE1BQU0sRUFBRSxDQUFDO1lBQ2IsS0FBSyxXQUFXO2dCQUNaLE9B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QUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUEzSkQsd0NBMkpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbm9ybWFsaXplQWN0aW9uIH0gZnJvbSAnLi4vdXRpbHMvYWN0aW9uLWFsaWFzZXMnO1xuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdtYW5hZ2VfYW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ01hbmFnZSBhbmltYXRpb25zIG9uIG5vZGVzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfY2xpcHMgKGxpc3QgYW5pbWF0aW9uIGNsaXBzIG9uIGEgbm9kZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X3N0YXRlIChnZXQgY3VycmVudCBhbmltYXRpb24gc3RhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3BsYXkgKHBsYXkgYW4gYW5pbWF0aW9uIGNsaXApLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3N0b3AgKHN0b3AgYW5pbWF0aW9uKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdwYXVzZSAocGF1c2UgYW5pbWF0aW9uKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdyZXN1bWUgKHJlc3VtZSBwYXVzZWQgYW5pbWF0aW9uKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9jbGlwcycsICdnZXRfc3RhdGUnLCAncGxheScsICdzdG9wJywgJ3BhdXNlJywgJ3Jlc3VtZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQW5pbWF0aW9uIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVVUlEIG9mIHRoZSBub2RlIHdpdGggQW5pbWF0aW9uIGNvbXBvbmVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGlwTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgYW5pbWF0aW9uIGNsaXAgKHJlcXVpcmVkIGZvciBwbGF5IGFjdGlvbiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IG5vcm1hbGl6ZUFjdGlvbignbWFuYWdlX2FuaW1hdGlvbicsIGFyZ3MuYWN0aW9uKTtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jbGlwcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q2xpcHMoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc3RhdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFN0YXRlKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAncGxheSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAncGxheScsIGFyZ3MuY2xpcE5hbWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RvcCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAnc3RvcCcpO1xuICAgICAgICAgICAgY2FzZSAncGF1c2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3BhdXNlJyk7XG4gICAgICAgICAgICBjYXNlICdyZXN1bWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3Jlc3VtZScpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDbGlwcyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFF1ZXJ5IG5vZGUgdG8gZmluZCBBbmltYXRpb24gY29tcG9uZW50XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhIHx8ICFub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCBvciBoYXMgbm8gY29tcG9uZW50cycgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYW5pbUNvbXAgPSAobm9kZURhdGEuX19jb21wc19fIGFzIGFueVtdKS5maW5kKFxuICAgICAgICAgICAgICAgIChjOiBhbnkpID0+IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb24nIHx8IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb25Db250cm9sbGVyJ1xuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gdGhpcyBub2RlJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNsaXAgcmVmZXJlbmNlc1xuICAgICAgICAgICAgY29uc3QgY2xpcHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBpZiAoYW5pbUNvbXAuX2NsaXBzICYmIEFycmF5LmlzQXJyYXkoYW5pbUNvbXAuX2NsaXBzKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2xpcCBvZiBhbmltQ29tcC5fY2xpcHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNsaXAgJiYgY2xpcC5fX3V1aWRfXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGlwSW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBjbGlwLl9fdXVpZF9fKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGlwcy5wdXNoKGNsaXBJbmZvPy5uYW1lIHx8IGNsaXAuX191dWlkX18pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpcHMucHVzaChjbGlwLl9fdXVpZF9fKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGFuaW1Db21wLl9fdHlwZV9fLFxuICAgICAgICAgICAgICAgICAgICBjbGlwcyxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdENsaXA6IGFuaW1Db21wLl9kZWZhdWx0Q2xpcD8uX191dWlkX18gfHwgbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgcGxheU9uTG9hZDogYW5pbUNvbXAucGxheU9uTG9hZCA/PyBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFN0YXRlKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSB8fCAhbm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gKG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkuZmluZChcbiAgICAgICAgICAgICAgICAoYzogYW55KSA9PiBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uJyB8fCBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uQ29udHJvbGxlcidcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBBbmltYXRpb24gY29tcG9uZW50IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogYW5pbUNvbXAuX190eXBlX18sXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGFuaW1Db21wLmVuYWJsZWQgPz8gdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgcGxheU9uTG9hZDogYW5pbUNvbXAucGxheU9uTG9hZCA/PyBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcENvdW50OiBhbmltQ29tcC5fY2xpcHMgPyBhbmltQ29tcC5fY2xpcHMubGVuZ3RoIDogMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNvbnRyb2xBbmltYXRpb24obm9kZVV1aWQ6IHN0cmluZywgY29tbWFuZDogc3RyaW5nLCBjbGlwTmFtZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2NlbmUgc2NyaXB0IHRvIGNvbnRyb2wgYW5pbWF0aW9uIGF0IHJ1bnRpbWVcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NvbnRyb2xBbmltYXRpb24nLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tbWFuZCwgY2xpcE5hbWVdXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQW5pbWF0aW9uICR7Y29tbWFuZH0gc2VudCBmb3Igbm9kZSAke25vZGVVdWlkfWAgKyAoY2xpcE5hbWUgPyBgIChjbGlwOiAke2NsaXBOYW1lfSlgIDogJycpLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnQW5pbWF0aW9uIGNvbnRyb2wgcmVxdWlyZXMgdGhlIHNjZW5lIHRvIGJlIGluIHBsYXkvcHJldmlldyBtb2RlIGZvciBmdWxsIGVmZmVjdC4nXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19