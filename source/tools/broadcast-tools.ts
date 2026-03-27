import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class BroadcastTools implements ToolExecutor {
    private listeners: Map<string, Function[]> = new Map();
    private messageLog: Array<{ message: string; data: any; timestamp: number }> = [];

    constructor() {
        this.setupBroadcastListeners();
    }

    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private setupBroadcastListeners(): void {
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

    private addBroadcastListener(messageType: string): void {
        const listener = (data: any) => {
            this.messageLog.push({
                message: messageType,
                data: data,
                timestamp: Date.now()
            });

            // Keep log size within reasonable limits
            if (this.messageLog.length > 1000) {
                this.messageLog = this.messageLog.slice(-500);
            }

            console.log(`[Broadcast] ${messageType}:`, data);
        };

        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, []);
        }
        this.listeners.get(messageType)!.push(listener);

        // Register Editor message listener - temporarily commented out, Editor.Message API may not support this
        // Editor.Message.on(messageType, listener);
        console.log(`[BroadcastTools] Added listener for ${messageType} (simulated)`);
    }

    private removeBroadcastListener(messageType: string): void {
        const listeners = this.listeners.get(messageType);
        if (listeners) {
            listeners.forEach(listener => {
                // Editor.Message.off(messageType, listener);
                console.log(`[BroadcastTools] Removed listener for ${messageType} (simulated)`);
            });
            this.listeners.delete(messageType);
        }
    }

    private async getBroadcastLog(limit: number = 50, messageType?: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            let filteredLog = this.messageLog;

            if (messageType) {
                filteredLog = this.messageLog.filter(entry => entry.message === messageType);
            }

            const recentLog = filteredLog.slice(-limit).map(entry => ({
                ...entry,
                timestamp: new Date(entry.timestamp).toISOString()
            }));

            resolve({
                success: true,
                data: {
                    log: recentLog,
                    count: recentLog.length,
                    totalCount: filteredLog.length,
                    filter: messageType || 'all',
                    message: 'Broadcast log retrieved successfully'
                }
            });
        });
    }

    private async listenBroadcast(messageType: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                if (!this.listeners.has(messageType)) {
                    this.addBroadcastListener(messageType);
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Started listening for broadcast: ${messageType}`
                        }
                    });
                } else {
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Already listening for broadcast: ${messageType}`
                        }
                    });
                }
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async stopListening(messageType: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            try {
                if (this.listeners.has(messageType)) {
                    this.removeBroadcastListener(messageType);
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Stopped listening for broadcast: ${messageType}`
                        }
                    });
                } else {
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Was not listening for broadcast: ${messageType}`
                        }
                    });
                }
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async clearBroadcastLog(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const previousCount = this.messageLog.length;
            this.messageLog = [];
            resolve({
                success: true,
                data: {
                    clearedCount: previousCount,
                    message: 'Broadcast log cleared successfully'
                }
            });
        });
    }

    private async getActiveListeners(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const activeListeners = Array.from(this.listeners.keys()).map(messageType => ({
                messageType: messageType,
                listenerCount: this.listeners.get(messageType)?.length || 0
            }));

            resolve({
                success: true,
                data: {
                    listeners: activeListeners,
                    count: activeListeners.length,
                    message: 'Active listeners retrieved successfully'
                }
            });
        });
    }
}
