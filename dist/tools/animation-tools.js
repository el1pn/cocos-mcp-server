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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5pbWF0aW9uLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2FuaW1hdGlvbi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGNBQWM7SUFDdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixXQUFXLEVBQ1AsaURBQWlEO29CQUNqRCw4Q0FBOEM7b0JBQzlDLDJDQUEyQztvQkFDM0MsaUNBQWlDO29CQUNqQyx5QkFBeUI7b0JBQ3pCLDJCQUEyQjtvQkFDM0IsbUNBQW1DO2dCQUN2QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQzs0QkFDbkUsV0FBVyxFQUFFLDZCQUE2Qjt5QkFDN0M7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyQ0FBMkM7eUJBQzNEO3dCQUNELFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEO3lCQUN2RTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDO2lCQUNuQzthQUNKO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQWlCLEVBQUUsSUFBUztRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzNCLFFBQVEsTUFBTSxFQUFFLENBQUM7WUFDYixLQUFLLFdBQVc7Z0JBQ1osT0FBTyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FB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QUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQTNKRCx3Q0EySkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBBbmltYXRpb25Ub29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ21hbmFnZV9hbmltYXRpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnTWFuYWdlIGFuaW1hdGlvbnMgb24gbm9kZXMuIEF2YWlsYWJsZSBhY3Rpb25zOiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2dldF9jbGlwcyAobGlzdCBhbmltYXRpb24gY2xpcHMgb24gYSBub2RlKSwgJyArXG4gICAgICAgICAgICAgICAgICAgICdnZXRfc3RhdGUgKGdldCBjdXJyZW50IGFuaW1hdGlvbiBzdGF0ZSksICcgK1xuICAgICAgICAgICAgICAgICAgICAncGxheSAocGxheSBhbiBhbmltYXRpb24gY2xpcCksICcgK1xuICAgICAgICAgICAgICAgICAgICAnc3RvcCAoc3RvcCBhbmltYXRpb24pLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3BhdXNlIChwYXVzZSBhbmltYXRpb24pLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ3Jlc3VtZSAocmVzdW1lIHBhdXNlZCBhbmltYXRpb24pLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2NsaXBzJywgJ2dldF9zdGF0ZScsICdwbGF5JywgJ3N0b3AnLCAncGF1c2UnLCAncmVzdW1lJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBbmltYXRpb24gYWN0aW9uIHRvIHBlcmZvcm0nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1VVSUQgb2YgdGhlIG5vZGUgd2l0aCBBbmltYXRpb24gY29tcG9uZW50J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBOYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOYW1lIG9mIHRoZSBhbmltYXRpb24gY2xpcCAocmVxdWlyZWQgZm9yIHBsYXkgYWN0aW9uKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJywgJ25vZGVVdWlkJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZShfdG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncy5hY3Rpb247XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfY2xpcHMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldENsaXBzKGFyZ3Mubm9kZVV1aWQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X3N0YXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRTdGF0ZShhcmdzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgIGNhc2UgJ3BsYXknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3BsYXknLCBhcmdzLmNsaXBOYW1lKTtcbiAgICAgICAgICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbnRyb2xBbmltYXRpb24oYXJncy5ub2RlVXVpZCwgJ3N0b3AnKTtcbiAgICAgICAgICAgIGNhc2UgJ3BhdXNlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb250cm9sQW5pbWF0aW9uKGFyZ3Mubm9kZVV1aWQsICdwYXVzZScpO1xuICAgICAgICAgICAgY2FzZSAncmVzdW1lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb250cm9sQW5pbWF0aW9uKGFyZ3Mubm9kZVV1aWQsICdyZXN1bWUnKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q2xpcHMobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBRdWVyeSBub2RlIHRvIGZpbmQgQW5pbWF0aW9uIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSB8fCAhbm9kZURhdGEuX19jb21wc19fKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBub3QgZm91bmQgb3IgaGFzIG5vIGNvbXBvbmVudHMnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gKG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkuZmluZChcbiAgICAgICAgICAgICAgICAoYzogYW55KSA9PiBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uJyB8fCBjLl9fdHlwZV9fID09PSAnY2MuQW5pbWF0aW9uQ29udHJvbGxlcidcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBBbmltYXRpb24gY29tcG9uZW50IGZvdW5kIG9uIHRoaXMgbm9kZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRXh0cmFjdCBjbGlwIHJlZmVyZW5jZXNcbiAgICAgICAgICAgIGNvbnN0IGNsaXBzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgaWYgKGFuaW1Db21wLl9jbGlwcyAmJiBBcnJheS5pc0FycmF5KGFuaW1Db21wLl9jbGlwcykpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNsaXAgb2YgYW5pbUNvbXAuX2NsaXBzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGlwICYmIGNsaXAuX191dWlkX18pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpcEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgY2xpcC5fX3V1aWRfXyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpcHMucHVzaChjbGlwSW5mbz8ubmFtZSB8fCBjbGlwLl9fdXVpZF9fKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaXBzLnB1c2goY2xpcC5fX3V1aWRfXyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBhbmltQ29tcC5fX3R5cGVfXyxcbiAgICAgICAgICAgICAgICAgICAgY2xpcHMsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDbGlwOiBhbmltQ29tcC5fZGVmYXVsdENsaXA/Ll9fdXVpZF9fIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIHBsYXlPbkxvYWQ6IGFuaW1Db21wLnBsYXlPbkxvYWQgPz8gZmFsc2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRTdGF0ZShub2RlVXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZURhdGEgfHwgIW5vZGVEYXRhLl9fY29tcHNfXykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vZGUgbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IChub2RlRGF0YS5fX2NvbXBzX18gYXMgYW55W10pLmZpbmQoXG4gICAgICAgICAgICAgICAgKGM6IGFueSkgPT4gYy5fX3R5cGVfXyA9PT0gJ2NjLkFuaW1hdGlvbicgfHwgYy5fX3R5cGVfXyA9PT0gJ2NjLkFuaW1hdGlvbkNvbnRyb2xsZXInXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBpZiAoIWFuaW1Db21wKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGFuaW1Db21wLl9fdHlwZV9fLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBhbmltQ29tcC5lbmFibGVkID8/IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHBsYXlPbkxvYWQ6IGFuaW1Db21wLnBsYXlPbkxvYWQgPz8gZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBDb3VudDogYW5pbUNvbXAuX2NsaXBzID8gYW5pbUNvbXAuX2NsaXBzLmxlbmd0aCA6IDBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjb250cm9sQW5pbWF0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZywgY2xpcE5hbWU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVXNlIHNjZW5lIHNjcmlwdCB0byBjb250cm9sIGFuaW1hdGlvbiBhdCBydW50aW1lXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdjb2Nvcy1tY3Atc2VydmVyJyxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdjb250cm9sQW5pbWF0aW9uJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbW1hbmQsIGNsaXBOYW1lXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFuaW1hdGlvbiAke2NvbW1hbmR9IHNlbnQgZm9yIG5vZGUgJHtub2RlVXVpZH1gICsgKGNsaXBOYW1lID8gYCAoY2xpcDogJHtjbGlwTmFtZX0pYCA6ICcnKSxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ0FuaW1hdGlvbiBjb250cm9sIHJlcXVpcmVzIHRoZSBzY2VuZSB0byBiZSBpbiBwbGF5L3ByZXZpZXcgbW9kZSBmb3IgZnVsbCBlZmZlY3QuJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==