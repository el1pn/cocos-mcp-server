"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationTools = void 0;
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
        switch (args.action) {
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
                return { success: false, error: `Unknown action: ${args.action}` };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2FuaW1hdGlvbi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQ1AsaURBQWlEO29CQUNqRCw4Q0FBOEM7b0JBQzlDLDJDQUEyQztvQkFDM0MsaUNBQWlDO29CQUNqQyx5QkFBeUI7b0JBQ3pCLDJCQUEyQjtvQkFDM0IsbUNBQW1DO2dCQUN2QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzs0QkFDbkUsV0FBVyxFQUFFLDZCQUE2Qjt5QkFDN0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyQ0FBMkM7eUJBQzNEO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO2lCQUNuQzthQUNKO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQWlCLEVBQUUsSUFBUztRQUN0QyxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsQixLQUFLLFdBQVc7Z0JBQ1osT0FBTyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzlDLEtBQUssV0FBVztnQkFDWixP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Q2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUExSkQsd0NBMEpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdtYW5hZ2VfYW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ01hbmFnZSBhbmltYXRpb25zIG9uIG5vZGVzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfY2xpcHMgKGxpc3QgYW5pbWF0aW9uIGNsaXBzIG9uIGEgbm9kZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAnZ2V0X3N0YXRlIChnZXQgY3VycmVudCBhbmltYXRpb24gc3RhdGUpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3BsYXkgKHBsYXkgYW4gYW5pbWF0aW9uIGNsaXApLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3N0b3AgKHN0b3AgYW5pbWF0aW9uKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdwYXVzZSAocGF1c2UgYW5pbWF0aW9uKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdyZXN1bWUgKHJlc3VtZSBwYXVzZWQgYW5pbWF0aW9uKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9jbGlwcycsICdnZXRfc3RhdGUnLCAncGxheScsICdzdG9wJywgJ3BhdXNlJywgJ3Jlc3VtZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQW5pbWF0aW9uIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdVVUlEIG9mIHRoZSBub2RlIHdpdGggQW5pbWF0aW9uIGNvbXBvbmVudCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGlwTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgYW5pbWF0aW9uIGNsaXAgKHJlcXVpcmVkIGZvciBwbGF5IGFjdGlvbiknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jbGlwcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0Q2xpcHMoYXJncy5ub2RlVXVpZCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc3RhdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFN0YXRlKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAncGxheSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAncGxheScsIGFyZ3MuY2xpcE5hbWUpO1xuICAgICAgICAgICAgY2FzZSAnc3RvcCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAnc3RvcCcpO1xuICAgICAgICAgICAgY2FzZSAncGF1c2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3BhdXNlJyk7XG4gICAgICAgICAgICBjYXNlICdyZXN1bWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3Jlc3VtZScpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldENsaXBzKG5vZGVVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gUXVlcnkgbm9kZSB0byBmaW5kIEFuaW1hdGlvbiBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZURhdGEgfHwgIW5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kIG9yIGhhcyBubyBjb21wb25lbnRzJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IChub2RlRGF0YS5fX2NvbXBzX18gYXMgYW55W10pLmZpbmQoXG4gICAgICAgICAgICAgICAgKGM6IGFueSkgPT4gYy5fX3R5cGVfXyA9PT0gJ2NjLkFuaW1hdGlvbicgfHwgYy5fX3R5cGVfXyA9PT0gJ2NjLkFuaW1hdGlvbkNvbnRyb2xsZXInXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoIWFuaW1Db21wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiB0aGlzIG5vZGUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2xpcCByZWZlcmVuY2VzXG4gICAgICAgICAgICBjb25zdCBjbGlwczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGlmIChhbmltQ29tcC5fY2xpcHMgJiYgQXJyYXkuaXNBcnJheShhbmltQ29tcC5fY2xpcHMpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjbGlwIG9mIGFuaW1Db21wLl9jbGlwcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2xpcCAmJiBjbGlwLl9fdXVpZF9fKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaXBJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGNsaXAuX191dWlkX18pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBzLnB1c2goY2xpcEluZm8/Lm5hbWUgfHwgY2xpcC5fX3V1aWRfXyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGlwcy5wdXNoKGNsaXAuX191dWlkX18pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogYW5pbUNvbXAuX190eXBlX18sXG4gICAgICAgICAgICAgICAgICAgIGNsaXBzLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2xpcDogYW5pbUNvbXAuX2RlZmF1bHRDbGlwPy5fX3V1aWRfXyB8fCBudWxsLFxuICAgICAgICAgICAgICAgICAgICBwbGF5T25Mb2FkOiBhbmltQ29tcC5wbGF5T25Mb2FkID8/IGZhbHNlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U3RhdGUobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhIHx8ICFub2RlRGF0YS5fX2NvbXBzX18pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIG5vdCBmb3VuZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYW5pbUNvbXAgPSAobm9kZURhdGEuX19jb21wc19fIGFzIGFueVtdKS5maW5kKFxuICAgICAgICAgICAgICAgIChjOiBhbnkpID0+IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb24nIHx8IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb25Db250cm9sbGVyJ1xuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBhbmltQ29tcC5fX3R5cGVfXyxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogYW5pbUNvbXAuZW5hYmxlZCA/PyB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBwbGF5T25Mb2FkOiBhbmltQ29tcC5wbGF5T25Mb2FkID8/IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwQ291bnQ6IGFuaW1Db21wLl9jbGlwcyA/IGFuaW1Db21wLl9jbGlwcy5sZW5ndGggOiAwXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY29udHJvbEFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nLCBjb21tYW5kOiBzdHJpbmcsIGNsaXBOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFVzZSBzY2VuZSBzY3JpcHQgdG8gY29udHJvbCBhbmltYXRpb24gYXQgcnVudGltZVxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnY29udHJvbEFuaW1hdGlvbicsXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21tYW5kLCBjbGlwTmFtZV1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBbmltYXRpb24gJHtjb21tYW5kfSBzZW50IGZvciBub2RlICR7bm9kZVV1aWR9YCArIChjbGlwTmFtZSA/IGAgKGNsaXA6ICR7Y2xpcE5hbWV9KWAgOiAnJyksXG4gICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdBbmltYXRpb24gY29udHJvbCByZXF1aXJlcyB0aGUgc2NlbmUgdG8gYmUgaW4gcGxheS9wcmV2aWV3IG1vZGUgZm9yIGZ1bGwgZWZmZWN0LidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=