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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2FuaW1hdGlvbi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQ1AsaURBQWlEO29CQUNqRCw4Q0FBOEM7b0JBQzlDLDJDQUEyQztvQkFDM0MsaUNBQWlDO29CQUNqQyx5QkFBeUI7b0JBQ3pCLDJCQUEyQjtvQkFDM0IsbUNBQW1DO2dCQUN2QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzs0QkFDbkUsV0FBVyxFQUFFLDZCQUE2Qjt5QkFDN0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyQ0FBMkM7eUJBQzNEO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO2lCQUNuQzthQUNKO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQWlCLEVBQUUsSUFBUztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzNCLFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDYixLQUFLLFdBQVc7Z0JBQ1osT0FBTyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FB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QUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQTNKRCx3Q0EySkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQW5pbWF0aW9uVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ21hbmFnZV9hbmltYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XHJcbiAgICAgICAgICAgICAgICAgICAgJ01hbmFnZSBhbmltYXRpb25zIG9uIG5vZGVzLiBBdmFpbGFibGUgYWN0aW9uczogJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dldF9jbGlwcyAobGlzdCBhbmltYXRpb24gY2xpcHMgb24gYSBub2RlKSwgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ2dldF9zdGF0ZSAoZ2V0IGN1cnJlbnQgYW5pbWF0aW9uIHN0YXRlKSwgJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ3BsYXkgKHBsYXkgYW4gYW5pbWF0aW9uIGNsaXApLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAnc3RvcCAoc3RvcCBhbmltYXRpb24pLCAnICtcclxuICAgICAgICAgICAgICAgICAgICAncGF1c2UgKHBhdXNlIGFuaW1hdGlvbiksICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdyZXN1bWUgKHJlc3VtZSBwYXVzZWQgYW5pbWF0aW9uKS4nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9jbGlwcycsICdnZXRfc3RhdGUnLCAncGxheScsICdzdG9wJywgJ3BhdXNlJywgJ3Jlc3VtZSddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBbmltYXRpb24gYWN0aW9uIHRvIHBlcmZvcm0nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVVVJRCBvZiB0aGUgbm9kZSB3aXRoIEFuaW1hdGlvbiBjb21wb25lbnQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBOYW1lOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmFtZSBvZiB0aGUgYW5pbWF0aW9uIGNsaXAgKHJlcXVpcmVkIGZvciBwbGF5IGFjdGlvbiknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbicsICdub2RlVXVpZCddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUoX3Rvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XHJcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X2NsaXBzJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENsaXBzKGFyZ3Mubm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlICdnZXRfc3RhdGUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U3RhdGUoYXJncy5ub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3BsYXknOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAncGxheScsIGFyZ3MuY2xpcE5hbWUpO1xyXG4gICAgICAgICAgICBjYXNlICdzdG9wJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3N0b3AnKTtcclxuICAgICAgICAgICAgY2FzZSAncGF1c2UnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29udHJvbEFuaW1hdGlvbihhcmdzLm5vZGVVdWlkLCAncGF1c2UnKTtcclxuICAgICAgICAgICAgY2FzZSAncmVzdW1lJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3Jlc3VtZScpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDbGlwcyhub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBRdWVyeSBub2RlIHRvIGZpbmQgQW5pbWF0aW9uIGNvbXBvbmVudFxyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZURhdGEgfHwgIW5vZGVEYXRhLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHMnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gKG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkuZmluZChcclxuICAgICAgICAgICAgICAgIChjOiBhbnkpID0+IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb24nIHx8IGMuX190eXBlX18gPT09ICdjYy5BbmltYXRpb25Db250cm9sbGVyJ1xyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiB0aGlzIG5vZGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY2xpcCByZWZlcmVuY2VzXHJcbiAgICAgICAgICAgIGNvbnN0IGNsaXBzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAoYW5pbUNvbXAuX2NsaXBzICYmIEFycmF5LmlzQXJyYXkoYW5pbUNvbXAuX2NsaXBzKSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjbGlwIG9mIGFuaW1Db21wLl9jbGlwcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGlwICYmIGNsaXAuX191dWlkX18pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsaXBJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGNsaXAuX191dWlkX18pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpcHMucHVzaChjbGlwSW5mbz8ubmFtZSB8fCBjbGlwLl9fdXVpZF9fKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGlwcy5wdXNoKGNsaXAuX191dWlkX18pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBhbmltQ29tcC5fX3R5cGVfXyxcclxuICAgICAgICAgICAgICAgICAgICBjbGlwcyxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2xpcDogYW5pbUNvbXAuX2RlZmF1bHRDbGlwPy5fX3V1aWRfXyB8fCBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXlPbkxvYWQ6IGFuaW1Db21wLnBsYXlPbkxvYWQgPz8gZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U3RhdGUobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhIHx8ICFub2RlRGF0YS5fX2NvbXBzX18pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IChub2RlRGF0YS5fX2NvbXBzX18gYXMgYW55W10pLmZpbmQoXHJcbiAgICAgICAgICAgICAgICAoYzogYW55KSA9PiBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uJyB8fCBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uQ29udHJvbGxlcidcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGFuaW1Db21wLl9fdHlwZV9fLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGFuaW1Db21wLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwbGF5T25Mb2FkOiBhbmltQ29tcC5wbGF5T25Mb2FkID8/IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsaXBDb3VudDogYW5pbUNvbXAuX2NsaXBzID8gYW5pbUNvbXAuX2NsaXBzLmxlbmd0aCA6IDBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY29udHJvbEFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nLCBjb21tYW5kOiBzdHJpbmcsIGNsaXBOYW1lPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBVc2Ugc2NlbmUgc2NyaXB0IHRvIGNvbnRyb2wgYW5pbWF0aW9uIGF0IHJ1bnRpbWVcclxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NvbnRyb2xBbmltYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21tYW5kLCBjbGlwTmFtZV1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFuaW1hdGlvbiAke2NvbW1hbmR9IHNlbnQgZm9yIG5vZGUgJHtub2RlVXVpZH1gICsgKGNsaXBOYW1lID8gYCAoY2xpcDogJHtjbGlwTmFtZX0pYCA6ICcnKSxcclxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnQW5pbWF0aW9uIGNvbnRyb2wgcmVxdWlyZXMgdGhlIHNjZW5lIHRvIGJlIGluIHBsYXkvcHJldmlldyBtb2RlIGZvciBmdWxsIGVmZmVjdC4nXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=