import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const MODULE_LOADED_AT = Date.now();

function readServerVersion(): string {
    try {
        const pkgPath = path.resolve(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return String(pkg.version ?? 'unknown');
    } catch {
        return 'unknown';
    }
}

function readDistBuiltAt(): number | null {
    try {
        const distEntry = path.resolve(__dirname, '../mcp-server.js');
        return fs.statSync(distEntry).mtimeMs;
    } catch {
        return null;
    }
}

export class ServerTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'server_info',
                description: 'Query server and network information. Actions: get_ip_list (query server IP list), get_sorted_ip_list (get sorted server IP list), get_port (query editor server current port), get_status (get comprehensive server status), check_connectivity (check server connectivity and network status), get_network_interfaces (get available network interfaces)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['get_ip_list', 'get_sorted_ip_list', 'get_port', 'get_status', 'check_connectivity', 'get_network_interfaces']
                        },
                        timeout: {
                            type: 'number',
                            description: 'Timeout in milliseconds (action: check_connectivity)',
                            default: 5000
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'server_info':
                switch (args.action) {
                    case 'get_ip_list':
                        return await this.queryServerIPList();
                    case 'get_sorted_ip_list':
                        return await this.querySortedServerIPList();
                    case 'get_port':
                        return await this.queryServerPort();
                    case 'get_status':
                        return await this.getServerStatus();
                    case 'check_connectivity':
                        return await this.checkServerConnectivity(args.timeout);
                    case 'get_network_interfaces':
                        return await this.getNetworkInterfaces();
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async queryServerIPList(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-ip-list').then((ipList: string[]) => {
                resolve({
                    success: true,
                    data: {
                        ipList: ipList,
                        count: ipList.length,
                        message: 'IP list retrieved successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async querySortedServerIPList(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-sort-ip-list').then((sortedIPList: string[]) => {
                resolve({
                    success: true,
                    data: {
                        sortedIPList: sortedIPList,
                        count: sortedIPList.length,
                        message: 'Sorted IP list retrieved successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryServerPort(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-port').then((port: number) => {
                resolve({
                    success: true,
                    data: {
                        port: port,
                        message: `Editor server is running on port ${port}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async getServerStatus(): Promise<ToolResponse> {
        try {
            const [ipListResult, portResult] = await Promise.allSettled([
                this.queryServerIPList(),
                this.queryServerPort()
            ]);

            const status: any = {
                timestamp: new Date().toISOString(),
                serverRunning: true
            };

            if (ipListResult.status === 'fulfilled' && ipListResult.value.success) {
                status.availableIPs = ipListResult.value.data.ipList;
                status.ipCount = ipListResult.value.data.count;
            } else {
                status.availableIPs = [];
                status.ipCount = 0;
                status.ipError = ipListResult.status === 'rejected' ? ipListResult.reason : ipListResult.value.error;
            }

            if (portResult.status === 'fulfilled' && portResult.value.success) {
                status.port = portResult.value.data.port;
            } else {
                status.port = null;
                status.portError = portResult.status === 'rejected' ? portResult.reason : portResult.value.error;
            }

            status.mcpServerPort = 3000;
            status.editorVersion = (Editor as any).versions?.cocos || 'Unknown';
            status.platform = process.platform;
            status.nodeVersion = process.version;

            status.serverVersion = readServerVersion();
            status.moduleLoadedAt = new Date(MODULE_LOADED_AT).toISOString();
            const builtAt = readDistBuiltAt();
            status.distBuiltAt = builtAt ? new Date(builtAt).toISOString() : null;
            status.reloadRequired = builtAt !== null && builtAt > MODULE_LOADED_AT;

            return { success: true, data: status };
        } catch (err: any) {
            return { success: false, error: `Failed to get server status: ${err.message}` };
        }
    }

    private async checkServerConnectivity(timeout: number = 5000): Promise<ToolResponse> {
        const startTime = Date.now();
        try {
            const testPromise = Editor.Message.request('server', 'query-port');
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), timeout);
            });

            await Promise.race([testPromise, timeoutPromise]);

            const responseTime = Date.now() - startTime;
            return {
                success: true,
                data: {
                    connected: true,
                    responseTime,
                    timeout,
                    message: `Server connectivity confirmed in ${responseTime}ms`
                }
            };
        } catch (err: any) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                data: {
                    connected: false,
                    responseTime,
                    timeout,
                    error: err.message
                }
            };
        }
    }

    private async getNetworkInterfaces(): Promise<ToolResponse> {
        try {
            const os = require('os');
            const interfaces = os.networkInterfaces();

            const networkInfo = Object.entries(interfaces).map(([name, addresses]: [string, any]) => ({
                name,
                addresses: addresses.map((addr: any) => ({
                    address: addr.address,
                    family: addr.family,
                    internal: addr.internal,
                    cidr: addr.cidr
                }))
            }));

            const serverIPResult = await this.queryServerIPList();
            return {
                success: true,
                data: {
                    networkInterfaces: networkInfo,
                    serverAvailableIPs: serverIPResult.success ? serverIPResult.data.ipList : [],
                    message: 'Network interfaces retrieved successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to get network interfaces: ${err.message}` };
        }
    }
}
