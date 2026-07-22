"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastTools = void 0;
const logger_1 = require("../logger");
class BroadcastTools {
    constructor() {
        this.listeners = new Map();
        this.messageLog = [];
        this.setupBroadcastListeners();
    }
    getTools() {
        return [
            {
                name: 'broadcast',
                description: 'Manage broadcast message listeners and logs. Actions: get_log (get recent broadcast messages log), listen (start listening for specific broadcast messages), stop_listening (stop listening for specific broadcast messages), clear_log (clear the broadcast messages log), get_listeners (get list of active broadcast listeners)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_log', 'listen', 'stop_listening', 'clear_log', 'get_listeners']
                        },
                        limit: {
                            type: 'number',
                            description: 'Number of recent messages to return (action: get_log)',
                            default: 50
                        },
                        messageType: {
                            type: 'string',
                            description: 'Message type to filter/listen/stop (action: get_log, listen, stop_listening)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'broadcast':
                switch (args.action) {
                    case 'get_log':
                        return await this.getBroadcastLog(args.limit, args.messageType);
                    case 'listen':
                        return await this.listenBroadcast(args.messageType);
                    case 'stop_listening':
                        return await this.stopListening(args.messageType);
                    case 'clear_log':
                        return await this.clearBroadcastLog();
                    case 'get_listeners':
                        return await this.getActiveListeners();
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    setupBroadcastListeners() {
        // Set up predefined important broadcast message listeners
        const importantMessages = [
            'build-worker:ready',
            'build-worker:closed',
            'scene:ready',
            'scene:close',
            'scene:light-probe-edit-mode-changed',
            'scene:light-probe-bounding-box-edit-mode-changed',
            'asset-db:ready',
            'asset-db:close',
            'asset-db:asset-add',
            'asset-db:asset-change',
            'asset-db:asset-delete'
        ];
        importantMessages.forEach(messageType => {
            this.addBroadcastListener(messageType);
        });
    }
    addBroadcastListener(messageType) {
        const listener = (data) => {
            this.messageLog.push({
                message: messageType,
                data: data,
                timestamp: Date.now()
            });
            // Keep log size within reasonable limits
            if (this.messageLog.length > 1000) {
                this.messageLog = this.messageLog.slice(-500);
            }
            logger_1.logger.info(`[Broadcast] ${messageType}: ${JSON.stringify(data)}`);
        };
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, []);
        }
        this.listeners.get(messageType).push(listener);
        // Register Editor message listener - temporarily commented out, Editor.Message API may not support this
        // Editor.Message.on(messageType, listener);
        logger_1.logger.info(`[BroadcastTools] Added listener for ${messageType} (simulated)`);
    }
    removeBroadcastListener(messageType) {
        const listeners = this.listeners.get(messageType);
        if (listeners) {
            listeners.forEach(listener => {
                // Editor.Message.off(messageType, listener);
                logger_1.logger.info(`[BroadcastTools] Removed listener for ${messageType} (simulated)`);
            });
            this.listeners.delete(messageType);
        }
    }
    async getBroadcastLog(limit = 50, messageType) {
        let filteredLog = this.messageLog;
        if (messageType) {
            filteredLog = this.messageLog.filter(entry => entry.message === messageType);
        }
        const recentLog = filteredLog.slice(-limit).map(entry => (Object.assign(Object.assign({}, entry), { timestamp: new Date(entry.timestamp).toISOString() })));
        return {
            success: true,
            data: {
                log: recentLog,
                count: recentLog.length,
                totalCount: filteredLog.length,
                filter: messageType || 'all',
                message: 'Broadcast log retrieved successfully'
            }
        };
    }
    async listenBroadcast(messageType) {
        try {
            if (!this.listeners.has(messageType)) {
                this.addBroadcastListener(messageType);
                return {
                    success: true,
                    data: {
                        messageType: messageType,
                        message: `Started listening for broadcast: ${messageType}`
                    }
                };
            }
            else {
                return {
                    success: true,
                    data: {
                        messageType: messageType,
                        message: `Already listening for broadcast: ${messageType}`
                    }
                };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async stopListening(messageType) {
        try {
            if (this.listeners.has(messageType)) {
                this.removeBroadcastListener(messageType);
                return {
                    success: true,
                    data: {
                        messageType: messageType,
                        message: `Stopped listening for broadcast: ${messageType}`
                    }
                };
            }
            else {
                return {
                    success: true,
                    data: {
                        messageType: messageType,
                        message: `Was not listening for broadcast: ${messageType}`
                    }
                };
            }
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async clearBroadcastLog() {
        const previousCount = this.messageLog.length;
        this.messageLog = [];
        return {
            success: true,
            data: {
                clearedCount: previousCount,
                message: 'Broadcast log cleared successfully'
            }
        };
    }
    async getActiveListeners() {
        const activeListeners = Array.from(this.listeners.keys()).map(messageType => {
            var _a;
            return ({
                messageType: messageType,
                listenerCount: ((_a = this.listeners.get(messageType)) === null || _a === void 0 ? void 0 : _a.length) || 0
            });
        });
        return {
            success: true,
            data: {
                listeners: activeListeners,
                count: activeListeners.length,
                message: 'Active listeners retrieved successfully'
            }
        };
    }
}
exports.BroadcastTools = BroadcastTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvYWRjYXN0LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2Jyb2FkY2FzdC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxzQ0FBbUM7QUFFbkMsTUFBYSxjQUFjO0lBSXZCO1FBSFEsY0FBUyxHQUE0QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQy9DLGVBQVUsR0FBNkQsRUFBRSxDQUFDO1FBRzlFLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxXQUFXO2dCQUNqQixXQUFXLEVBQUUsb1VBQW9VO2dCQUNqVixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsbUJBQW1COzRCQUNoQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUM7eUJBQzlFO3dCQUNELEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdURBQXVEOzRCQUNwRSxPQUFPLEVBQUUsRUFBRTt5QkFDZDt3QkFDRCxXQUFXLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDhFQUE4RTt5QkFDOUY7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWdCLEVBQUUsSUFBUztRQUNyQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2YsS0FBSyxXQUFXO2dCQUNaLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNsQixLQUFLLFNBQVM7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LEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUI7UUFDM0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDN0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDckIsT0FBTztZQUNILE9BQU8sRUFBRSxJQUFJO1lBQ2IsSUFBSSxFQUFFO2dCQUNGLFlBQVksRUFBRSxhQUFhO2dCQUMzQixPQUFPLEVBQUUsb0NBQW9DO2FBQ2hEO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFTyxLQUFLLENBQUMsa0JBQWtCO1FBQzVCLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsRUFBRTs7WUFBQyxPQUFBLENBQUM7Z0JBQzFFLFdBQVcsRUFBRSxXQUFXO2dCQUN4QixhQUFhLEVBQUUsQ0FBQSxNQUFBLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQywwQ0FBRSxNQUFNLEtBQUksQ0FBQzthQUM5RCxDQUFDLENBQUE7U0FBQSxDQUFDLENBQUM7UUFFSixPQUFPO1lBQ0gsT0FBTyxFQUFFLElBQUk7WUFDYixJQUFJLEVBQUU7Z0JBQ0YsU0FBUyxFQUFFLGVBQWU7Z0JBQzFCLEtBQUssRUFBRSxlQUFlLENBQUMsTUFBTTtnQkFDN0IsT0FBTyxFQUFFLHlDQUF5QzthQUNyRDtTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0o7QUExTkQsd0NBME5DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcblxuZXhwb3J0IGNsYXNzIEJyb2FkY2FzdFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIGxpc3RlbmVyczogTWFwPHN0cmluZywgRnVuY3Rpb25bXT4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSBtZXNzYWdlTG9nOiBBcnJheTx7IG1lc3NhZ2U6IHN0cmluZzsgZGF0YTogYW55OyB0aW1lc3RhbXA6IG51bWJlciB9PiA9IFtdO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuc2V0dXBCcm9hZGNhc3RMaXN0ZW5lcnMoKTtcbiAgICB9XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYnJvYWRjYXN0JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hbmFnZSBicm9hZGNhc3QgbWVzc2FnZSBsaXN0ZW5lcnMgYW5kIGxvZ3MuIEFjdGlvbnM6IGdldF9sb2cgKGdldCByZWNlbnQgYnJvYWRjYXN0IG1lc3NhZ2VzIGxvZyksIGxpc3RlbiAoc3RhcnQgbGlzdGVuaW5nIGZvciBzcGVjaWZpYyBicm9hZGNhc3QgbWVzc2FnZXMpLCBzdG9wX2xpc3RlbmluZyAoc3RvcCBsaXN0ZW5pbmcgZm9yIHNwZWNpZmljIGJyb2FkY2FzdCBtZXNzYWdlcyksIGNsZWFyX2xvZyAoY2xlYXIgdGhlIGJyb2FkY2FzdCBtZXNzYWdlcyBsb2cpLCBnZXRfbGlzdGVuZXJzIChnZXQgbGlzdCBvZiBhY3RpdmUgYnJvYWRjYXN0IGxpc3RlbmVycyknLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9sb2cnLCAnbGlzdGVuJywgJ3N0b3BfbGlzdGVuaW5nJywgJ2NsZWFyX2xvZycsICdnZXRfbGlzdGVuZXJzJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIHJlY2VudCBtZXNzYWdlcyB0byByZXR1cm4gKGFjdGlvbjogZ2V0X2xvZyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01lc3NhZ2UgdHlwZSB0byBmaWx0ZXIvbGlzdGVuL3N0b3AgKGFjdGlvbjogZ2V0X2xvZywgbGlzdGVuLCBzdG9wX2xpc3RlbmluZyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYnJvYWRjYXN0JzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9sb2cnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QnJvYWRjYXN0TG9nKGFyZ3MubGltaXQsIGFyZ3MubWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdsaXN0ZW4nOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdGVuQnJvYWRjYXN0KGFyZ3MubWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzdG9wX2xpc3RlbmluZyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zdG9wTGlzdGVuaW5nKGFyZ3MubWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjbGVhcl9sb2cnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2xlYXJCcm9hZGNhc3RMb2coKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2xpc3RlbmVycyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBY3RpdmVMaXN0ZW5lcnMoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBCcm9hZGNhc3RMaXN0ZW5lcnMoKTogdm9pZCB7XG4gICAgICAgIC8vIFNldCB1cCBwcmVkZWZpbmVkIGltcG9ydGFudCBicm9hZGNhc3QgbWVzc2FnZSBsaXN0ZW5lcnNcbiAgICAgICAgY29uc3QgaW1wb3J0YW50TWVzc2FnZXMgPSBbXG4gICAgICAgICAgICAnYnVpbGQtd29ya2VyOnJlYWR5JyxcbiAgICAgICAgICAgICdidWlsZC13b3JrZXI6Y2xvc2VkJyxcbiAgICAgICAgICAgICdzY2VuZTpyZWFkeScsXG4gICAgICAgICAgICAnc2NlbmU6Y2xvc2UnLFxuICAgICAgICAgICAgJ3NjZW5lOmxpZ2h0LXByb2JlLWVkaXQtbW9kZS1jaGFuZ2VkJyxcbiAgICAgICAgICAgICdzY2VuZTpsaWdodC1wcm9iZS1ib3VuZGluZy1ib3gtZWRpdC1tb2RlLWNoYW5nZWQnLFxuICAgICAgICAgICAgJ2Fzc2V0LWRiOnJlYWR5JyxcbiAgICAgICAgICAgICdhc3NldC1kYjpjbG9zZScsXG4gICAgICAgICAgICAnYXNzZXQtZGI6YXNzZXQtYWRkJyxcbiAgICAgICAgICAgICdhc3NldC1kYjphc3NldC1jaGFuZ2UnLFxuICAgICAgICAgICAgJ2Fzc2V0LWRiOmFzc2V0LWRlbGV0ZSdcbiAgICAgICAgXTtcblxuICAgICAgICBpbXBvcnRhbnRNZXNzYWdlcy5mb3JFYWNoKG1lc3NhZ2VUeXBlID0+IHtcbiAgICAgICAgICAgIHRoaXMuYWRkQnJvYWRjYXN0TGlzdGVuZXIobWVzc2FnZVR5cGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZEJyb2FkY2FzdExpc3RlbmVyKG1lc3NhZ2VUeXBlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAoZGF0YTogYW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VMb2cucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVR5cGUsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBLZWVwIGxvZyBzaXplIHdpdGhpbiByZWFzb25hYmxlIGxpbWl0c1xuICAgICAgICAgICAgaWYgKHRoaXMubWVzc2FnZUxvZy5sZW5ndGggPiAxMDAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tZXNzYWdlTG9nID0gdGhpcy5tZXNzYWdlTG9nLnNsaWNlKC01MDApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsb2dnZXIuaW5mbyhgW0Jyb2FkY2FzdF0gJHttZXNzYWdlVHlwZX06ICR7SlNPTi5zdHJpbmdpZnkoZGF0YSl9YCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKCF0aGlzLmxpc3RlbmVycy5oYXMobWVzc2FnZVR5cGUpKSB7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVycy5zZXQobWVzc2FnZVR5cGUsIFtdKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxpc3RlbmVycy5nZXQobWVzc2FnZVR5cGUpIS5wdXNoKGxpc3RlbmVyKTtcblxuICAgICAgICAvLyBSZWdpc3RlciBFZGl0b3IgbWVzc2FnZSBsaXN0ZW5lciAtIHRlbXBvcmFyaWx5IGNvbW1lbnRlZCBvdXQsIEVkaXRvci5NZXNzYWdlIEFQSSBtYXkgbm90IHN1cHBvcnQgdGhpc1xuICAgICAgICAvLyBFZGl0b3IuTWVzc2FnZS5vbihtZXNzYWdlVHlwZSwgbGlzdGVuZXIpO1xuICAgICAgICBsb2dnZXIuaW5mbyhgW0Jyb2FkY2FzdFRvb2xzXSBBZGRlZCBsaXN0ZW5lciBmb3IgJHttZXNzYWdlVHlwZX0gKHNpbXVsYXRlZClgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIHJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKG1lc3NhZ2VUeXBlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lcnMuZ2V0KG1lc3NhZ2VUeXBlKTtcbiAgICAgICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgICAgICAgbGlzdGVuZXJzLmZvckVhY2gobGlzdGVuZXIgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvci5NZXNzYWdlLm9mZihtZXNzYWdlVHlwZSwgbGlzdGVuZXIpO1xuICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBbQnJvYWRjYXN0VG9vbHNdIFJlbW92ZWQgbGlzdGVuZXIgZm9yICR7bWVzc2FnZVR5cGV9IChzaW11bGF0ZWQpYCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMubGlzdGVuZXJzLmRlbGV0ZShtZXNzYWdlVHlwZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEJyb2FkY2FzdExvZyhsaW1pdDogbnVtYmVyID0gNTAsIG1lc3NhZ2VUeXBlPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgbGV0IGZpbHRlcmVkTG9nID0gdGhpcy5tZXNzYWdlTG9nO1xuXG4gICAgICAgIGlmIChtZXNzYWdlVHlwZSkge1xuICAgICAgICAgICAgZmlsdGVyZWRMb2cgPSB0aGlzLm1lc3NhZ2VMb2cuZmlsdGVyKGVudHJ5ID0+IGVudHJ5Lm1lc3NhZ2UgPT09IG1lc3NhZ2VUeXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlY2VudExvZyA9IGZpbHRlcmVkTG9nLnNsaWNlKC1saW1pdCkubWFwKGVudHJ5ID0+ICh7XG4gICAgICAgICAgICAuLi5lbnRyeSxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoZW50cnkudGltZXN0YW1wKS50b0lTT1N0cmluZygpXG4gICAgICAgIH0pKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBsb2c6IHJlY2VudExvZyxcbiAgICAgICAgICAgICAgICBjb3VudDogcmVjZW50TG9nLmxlbmd0aCxcbiAgICAgICAgICAgICAgICB0b3RhbENvdW50OiBmaWx0ZXJlZExvZy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiBtZXNzYWdlVHlwZSB8fCAnYWxsJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQnJvYWRjYXN0IGxvZyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbGlzdGVuQnJvYWRjYXN0KG1lc3NhZ2VUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxpc3RlbmVycy5oYXMobWVzc2FnZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hZGRCcm9hZGNhc3RMaXN0ZW5lcihtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN0YXJ0ZWQgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEFscmVhZHkgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3RvcExpc3RlbmluZyhtZXNzYWdlVHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICh0aGlzLmxpc3RlbmVycy5oYXMobWVzc2FnZVR5cGUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcihtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN0b3BwZWQgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFdhcyBub3QgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2xlYXJCcm9hZGNhc3RMb2coKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgcHJldmlvdXNDb3VudCA9IHRoaXMubWVzc2FnZUxvZy5sZW5ndGg7XG4gICAgICAgIHRoaXMubWVzc2FnZUxvZyA9IFtdO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBjbGVhcmVkQ291bnQ6IHByZXZpb3VzQ291bnQsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Jyb2FkY2FzdCBsb2cgY2xlYXJlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBY3RpdmVMaXN0ZW5lcnMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgYWN0aXZlTGlzdGVuZXJzID0gQXJyYXkuZnJvbSh0aGlzLmxpc3RlbmVycy5rZXlzKCkpLm1hcChtZXNzYWdlVHlwZSA9PiAoe1xuICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgbGlzdGVuZXJDb3VudDogdGhpcy5saXN0ZW5lcnMuZ2V0KG1lc3NhZ2VUeXBlKT8ubGVuZ3RoIHx8IDBcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyczogYWN0aXZlTGlzdGVuZXJzLFxuICAgICAgICAgICAgICAgIGNvdW50OiBhY3RpdmVMaXN0ZW5lcnMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBY3RpdmUgbGlzdGVuZXJzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufVxuIl19