"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTools = void 0;
class ServerTools {
    getTools() {
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
    async execute(toolName, args) {
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
    async queryServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-ip-list').then((ipList) => {
                resolve({
                    success: true,
                    data: {
                        ipList: ipList,
                        count: ipList.length,
                        message: 'IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySortedServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-sort-ip-list').then((sortedIPList) => {
                resolve({
                    success: true,
                    data: {
                        sortedIPList: sortedIPList,
                        count: sortedIPList.length,
                        message: 'Sorted IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryServerPort() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-port').then((port) => {
                resolve({
                    success: true,
                    data: {
                        port: port,
                        message: `Editor server is running on port ${port}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getServerStatus() {
        var _a;
        try {
            const [ipListResult, portResult] = await Promise.allSettled([
                this.queryServerIPList(),
                this.queryServerPort()
            ]);
            const status = {
                timestamp: new Date().toISOString(),
                serverRunning: true
            };
            if (ipListResult.status === 'fulfilled' && ipListResult.value.success) {
                status.availableIPs = ipListResult.value.data.ipList;
                status.ipCount = ipListResult.value.data.count;
            }
            else {
                status.availableIPs = [];
                status.ipCount = 0;
                status.ipError = ipListResult.status === 'rejected' ? ipListResult.reason : ipListResult.value.error;
            }
            if (portResult.status === 'fulfilled' && portResult.value.success) {
                status.port = portResult.value.data.port;
            }
            else {
                status.port = null;
                status.portError = portResult.status === 'rejected' ? portResult.reason : portResult.value.error;
            }
            status.mcpServerPort = 3000;
            status.editorVersion = ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || 'Unknown';
            status.platform = process.platform;
            status.nodeVersion = process.version;
            return { success: true, data: status };
        }
        catch (err) {
            return { success: false, error: `Failed to get server status: ${err.message}` };
        }
    }
    async checkServerConnectivity(timeout = 5000) {
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
        }
        catch (err) {
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
    async getNetworkInterfaces() {
        try {
            const os = require('os');
            const interfaces = os.networkInterfaces();
            const networkInfo = Object.entries(interfaces).map(([name, addresses]) => ({
                name,
                addresses: addresses.map((addr) => ({
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
        }
        catch (err) {
            return { success: false, error: `Failed to get network interfaces: ${err.message}` };
        }
    }
}
exports.ServerTools = ServerTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlcnZlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFDcEIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLDRWQUE0VjtnQkFDelcsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG1CQUFtQjs0QkFDaEMsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsb0JBQW9CLEVBQUUsd0JBQXdCLENBQUM7eUJBQ3hIO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0RBQXNEOzRCQUNuRSxPQUFPLEVBQUUsSUFBSTt5QkFDaEI7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWdCLEVBQUUsSUFBUztRQUNyQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2YsS0FBSyxhQUFhO2dCQUNkLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNsQixLQUFLLGFBQWE7d0JBQ2QsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO29CQUMxQyxLQUFLLG9CQUFvQjt3QkFDckIsT0FBTyxNQUFNLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO29CQUNoRCxLQUFLLFVBQVU7d0JBQ1gsT0FBTyxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztvQkFDeEMsS0FBSyxZQUFZO3dC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QUNyQixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07b0JBQ25CLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtvQkFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2lCQUNsQixDQUFDLENBQUM7YUFDTixDQUFDLENBQUMsQ0FBQztZQUVKLE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDdEQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUU7b0JBQ0YsaUJBQWlCLEVBQUUsV0FBVztvQkFDOUIsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzVFLE9BQU8sRUFBRSwyQ0FBMkM7aUJBQ3ZEO2FBQ0osQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxxQ0FBcUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDekYsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQXpNRCxrQ0F5TUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2VydmVyVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NlcnZlcl9pbmZvJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgc2VydmVyIGFuZCBuZXR3b3JrIGluZm9ybWF0aW9uLiBBY3Rpb25zOiBnZXRfaXBfbGlzdCAocXVlcnkgc2VydmVyIElQIGxpc3QpLCBnZXRfc29ydGVkX2lwX2xpc3QgKGdldCBzb3J0ZWQgc2VydmVyIElQIGxpc3QpLCBnZXRfcG9ydCAocXVlcnkgZWRpdG9yIHNlcnZlciBjdXJyZW50IHBvcnQpLCBnZXRfc3RhdHVzIChnZXQgY29tcHJlaGVuc2l2ZSBzZXJ2ZXIgc3RhdHVzKSwgY2hlY2tfY29ubmVjdGl2aXR5IChjaGVjayBzZXJ2ZXIgY29ubmVjdGl2aXR5IGFuZCBuZXR3b3JrIHN0YXR1cyksIGdldF9uZXR3b3JrX2ludGVyZmFjZXMgKGdldCBhdmFpbGFibGUgbmV0d29yayBpbnRlcmZhY2VzKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWN0aW9uIHRvIHBlcmZvcm0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaXBfbGlzdCcsICdnZXRfc29ydGVkX2lwX2xpc3QnLCAnZ2V0X3BvcnQnLCAnZ2V0X3N0YXR1cycsICdjaGVja19jb25uZWN0aXZpdHknLCAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoYWN0aW9uOiBjaGVja19jb25uZWN0aXZpdHkpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwMDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAnc2VydmVyX2luZm8nOlxyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9pcF9saXN0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfc29ydGVkX2lwX2xpc3QnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNvcnRlZFNlcnZlcklQTGlzdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9wb3J0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJQb3J0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X3N0YXR1cyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNlcnZlclN0YXR1cygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NoZWNrX2Nvbm5lY3Rpdml0eSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KGFyZ3MudGltZW91dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldE5ldHdvcmtJbnRlcmZhY2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2VydmVySVBMaXN0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1pcC1saXN0JykudGhlbigoaXBMaXN0OiBzdHJpbmdbXSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlwTGlzdDogaXBMaXN0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogaXBMaXN0Lmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0lQIGxpc3QgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U29ydGVkU2VydmVySVBMaXN0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1zb3J0LWlwLWxpc3QnKS50aGVuKChzb3J0ZWRJUExpc3Q6IHN0cmluZ1tdKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc29ydGVkSVBMaXN0OiBzb3J0ZWRJUExpc3QsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBzb3J0ZWRJUExpc3QubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU29ydGVkIElQIGxpc3QgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2VydmVyUG9ydCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzZXJ2ZXInLCAncXVlcnktcG9ydCcpLnRoZW4oKHBvcnQ6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBFZGl0b3Igc2VydmVyIGlzIHJ1bm5pbmcgb24gcG9ydCAke3BvcnR9YFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2VydmVyU3RhdHVzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgW2lwTGlzdFJlc3VsdCwgcG9ydFJlc3VsdF0gPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xyXG4gICAgICAgICAgICAgICAgdGhpcy5xdWVyeVNlcnZlcklQTGlzdCgpLFxyXG4gICAgICAgICAgICAgICAgdGhpcy5xdWVyeVNlcnZlclBvcnQoKVxyXG4gICAgICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXR1czogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoaXBMaXN0UmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgaXBMaXN0UmVzdWx0LnZhbHVlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHN0YXR1cy5hdmFpbGFibGVJUHMgPSBpcExpc3RSZXN1bHQudmFsdWUuZGF0YS5pcExpc3Q7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMuaXBDb3VudCA9IGlwTGlzdFJlc3VsdC52YWx1ZS5kYXRhLmNvdW50O1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzLmF2YWlsYWJsZUlQcyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzLmlwQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzLmlwRXJyb3IgPSBpcExpc3RSZXN1bHQuc3RhdHVzID09PSAncmVqZWN0ZWQnID8gaXBMaXN0UmVzdWx0LnJlYXNvbiA6IGlwTGlzdFJlc3VsdC52YWx1ZS5lcnJvcjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHBvcnRSZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyAmJiBwb3J0UmVzdWx0LnZhbHVlLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0ID0gcG9ydFJlc3VsdC52YWx1ZS5kYXRhLnBvcnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMucG9ydCA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMucG9ydEVycm9yID0gcG9ydFJlc3VsdC5zdGF0dXMgPT09ICdyZWplY3RlZCcgPyBwb3J0UmVzdWx0LnJlYXNvbiA6IHBvcnRSZXN1bHQudmFsdWUuZXJyb3I7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHN0YXR1cy5tY3BTZXJ2ZXJQb3J0ID0gMzAwMDtcclxuICAgICAgICAgICAgc3RhdHVzLmVkaXRvclZlcnNpb24gPSAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmNvY29zIHx8ICdVbmtub3duJztcclxuICAgICAgICAgICAgc3RhdHVzLnBsYXRmb3JtID0gcHJvY2Vzcy5wbGF0Zm9ybTtcclxuICAgICAgICAgICAgc3RhdHVzLm5vZGVWZXJzaW9uID0gcHJvY2Vzcy52ZXJzaW9uO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc3RhdHVzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBzZXJ2ZXIgc3RhdHVzOiAke2Vyci5tZXNzYWdlfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja1NlcnZlckNvbm5lY3Rpdml0eSh0aW1lb3V0OiBudW1iZXIgPSA1MDAwKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRlc3RQcm9taXNlID0gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKTtcclxuICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoJ0Nvbm5lY3Rpb24gdGltZW91dCcpKSwgdGltZW91dCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKFt0ZXN0UHJvbWlzZSwgdGltZW91dFByb21pc2VdKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZVRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2VydmVyIGNvbm5lY3Rpdml0eSBjb25maXJtZWQgaW4gJHtyZXNwb25zZVRpbWV9bXNgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXQsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0TmV0d29ya0ludGVyZmFjZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBvcyA9IHJlcXVpcmUoJ29zJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbmV0d29ya0luZm8gPSBPYmplY3QuZW50cmllcyhpbnRlcmZhY2VzKS5tYXAoKFtuYW1lLCBhZGRyZXNzZXNdOiBbc3RyaW5nLCBhbnldKSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgICAgIGFkZHJlc3NlczogYWRkcmVzc2VzLm1hcCgoYWRkcjogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IGFkZHIuYWRkcmVzcyxcclxuICAgICAgICAgICAgICAgICAgICBmYW1pbHk6IGFkZHIuZmFtaWx5LFxyXG4gICAgICAgICAgICAgICAgICAgIGludGVybmFsOiBhZGRyLmludGVybmFsLFxyXG4gICAgICAgICAgICAgICAgICAgIGNpZHI6IGFkZHIuY2lkclxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcklQUmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeVNlcnZlcklQTGlzdCgpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrSW50ZXJmYWNlczogbmV0d29ya0luZm8sXHJcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyQXZhaWxhYmxlSVBzOiBzZXJ2ZXJJUFJlc3VsdC5zdWNjZXNzID8gc2VydmVySVBSZXN1bHQuZGF0YS5pcExpc3QgOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTmV0d29yayBpbnRlcmZhY2VzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBuZXR3b3JrIGludGVyZmFjZXM6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=