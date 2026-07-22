"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const editor_request_1 = require("../utils/editor-request");
const MODULE_LOADED_AT = Date.now();
function readServerVersion() {
    var _a;
    try {
        const pkgPath = path.resolve(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return String((_a = pkg.version) !== null && _a !== void 0 ? _a : 'unknown');
    }
    catch (_b) {
        return 'unknown';
    }
}
function readDistBuiltAt() {
    try {
        const distEntry = path.resolve(__dirname, '../mcp-server.js');
        return fs.statSync(distEntry).mtimeMs;
    }
    catch (_a) {
        return null;
    }
}
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
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('server', 'query-ip-list'), (ipList) => ({
            data: {
                ipList: ipList,
                count: ipList.length,
                message: 'IP list retrieved successfully'
            }
        }));
    }
    async querySortedServerIPList() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('server', 'query-sort-ip-list'), (sortedIPList) => ({
            data: {
                sortedIPList: sortedIPList,
                count: sortedIPList.length,
                message: 'Sorted IP list retrieved successfully'
            }
        }));
    }
    async queryServerPort() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('server', 'query-port'), (port) => ({
            data: {
                port: port,
                message: `Editor server is running on port ${port}`
            }
        }));
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
            status.serverVersion = readServerVersion();
            status.moduleLoadedAt = new Date(MODULE_LOADED_AT).toISOString();
            const builtAt = readDistBuiltAt();
            status.distBuiltAt = builtAt ? new Date(builtAt).toISOString() : null;
            status.reloadRequired = builtAt !== null && builtAt > MODULE_LOADED_AT;
            return { success: true, data: status };
        }
        catch (err) {
            return { success: false, error: `Failed to get server status: ${err.message}` };
        }
    }
    async checkServerConnectivity(timeout = 5000) {
        const startTime = Date.now();
        try {
            await (0, editor_request_1.withTimeout)(Editor.Message.request('server', 'query-port'), timeout, 'server.query-port');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlcnZlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLDREQUErRTtBQUUvRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUVwQyxTQUFTLGlCQUFpQjs7SUFDdEIsSUFBSSxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekQsT0FBTyxNQUFNLENBQUMsTUFBQSxHQUFHLENBQUMsT0FBTyxtQ0FBSSxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQUMsV0FBTSxDQUFDO1FBQ0wsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFDcEIsSUFBSSxDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM5RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzFDLENBQUM7SUFBQyxXQUFNLENBQUM7UUFDTCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0FBQ0wsQ0FBQztBQUVELE1BQWEsV0FBVztJQUNwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsNFZBQTRWO2dCQUN6VyxXQUFXLEVBQUU7b0JBQ1Qs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QVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3JDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztvQkFDckIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO29CQUNuQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7b0JBQ3ZCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtpQkFDbEIsQ0FBQyxDQUFDO2FBQ04sQ0FBQyxDQUFDLENBQUM7WUFFSixNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3RELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLGlCQUFpQixFQUFFLFdBQVc7b0JBQzlCLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUM1RSxPQUFPLEVBQUUsMkNBQTJDO2lCQUN2RDthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUscUNBQXFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3pGLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE5TEQsa0NBOExDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QsIHRvb2xDYWxsLCB3aXRoVGltZW91dCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuY29uc3QgTU9EVUxFX0xPQURFRF9BVCA9IERhdGUubm93KCk7XG5cbmZ1bmN0aW9uIHJlYWRTZXJ2ZXJWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcGtnUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlLmpzb24nKTtcbiAgICAgICAgY29uc3QgcGtnID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtnUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgIHJldHVybiBTdHJpbmcocGtnLnZlcnNpb24gPz8gJ3Vua25vd24nKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuICd1bmtub3duJztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlYWREaXN0QnVpbHRBdCgpOiBudW1iZXIgfCBudWxsIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBkaXN0RW50cnkgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vbWNwLXNlcnZlci5qcycpO1xuICAgICAgICByZXR1cm4gZnMuc3RhdFN5bmMoZGlzdEVudHJ5KS5tdGltZU1zO1xuICAgIH0gY2F0Y2gge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NlcnZlcl9pbmZvJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHNlcnZlciBhbmQgbmV0d29yayBpbmZvcm1hdGlvbi4gQWN0aW9uczogZ2V0X2lwX2xpc3QgKHF1ZXJ5IHNlcnZlciBJUCBsaXN0KSwgZ2V0X3NvcnRlZF9pcF9saXN0IChnZXQgc29ydGVkIHNlcnZlciBJUCBsaXN0KSwgZ2V0X3BvcnQgKHF1ZXJ5IGVkaXRvciBzZXJ2ZXIgY3VycmVudCBwb3J0KSwgZ2V0X3N0YXR1cyAoZ2V0IGNvbXByZWhlbnNpdmUgc2VydmVyIHN0YXR1cyksIGNoZWNrX2Nvbm5lY3Rpdml0eSAoY2hlY2sgc2VydmVyIGNvbm5lY3Rpdml0eSBhbmQgbmV0d29yayBzdGF0dXMpLCBnZXRfbmV0d29ya19pbnRlcmZhY2VzIChnZXQgYXZhaWxhYmxlIG5ldHdvcmsgaW50ZXJmYWNlcyknLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9pcF9saXN0JywgJ2dldF9zb3J0ZWRfaXBfbGlzdCcsICdnZXRfcG9ydCcsICdnZXRfc3RhdHVzJywgJ2NoZWNrX2Nvbm5lY3Rpdml0eScsICdnZXRfbmV0d29ya19pbnRlcmZhY2VzJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoYWN0aW9uOiBjaGVja19jb25uZWN0aXZpdHkpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MDAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnc2VydmVyX2luZm8nOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2lwX2xpc3QnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X3NvcnRlZF9pcF9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U29ydGVkU2VydmVySVBMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9wb3J0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2VydmVyUG9ydCgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfc3RhdHVzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNlcnZlclN0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdjaGVja19jb25uZWN0aXZpdHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2hlY2tTZXJ2ZXJDb25uZWN0aXZpdHkoYXJncy50aW1lb3V0KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXROZXR3b3JrSW50ZXJmYWNlcygpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNlcnZlcklQTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZ1tdPignc2VydmVyJywgJ3F1ZXJ5LWlwLWxpc3QnKSxcbiAgICAgICAgICAgIChpcExpc3QpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpcExpc3Q6IGlwTGlzdCxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IGlwTGlzdC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdJUCBsaXN0IHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U29ydGVkU2VydmVySVBMaXN0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8c3RyaW5nW10+KCdzZXJ2ZXInLCAncXVlcnktc29ydC1pcC1saXN0JyksXG4gICAgICAgICAgICAoc29ydGVkSVBMaXN0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc29ydGVkSVBMaXN0OiBzb3J0ZWRJUExpc3QsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiBzb3J0ZWRJUExpc3QubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU29ydGVkIElQIGxpc3QgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTZXJ2ZXJQb3J0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8bnVtYmVyPignc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKSxcbiAgICAgICAgICAgIChwb3J0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogcG9ydCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEVkaXRvciBzZXJ2ZXIgaXMgcnVubmluZyBvbiBwb3J0ICR7cG9ydH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFNlcnZlclN0YXR1cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgW2lwTGlzdFJlc3VsdCwgcG9ydFJlc3VsdF0gPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xuICAgICAgICAgICAgICAgIHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKSxcbiAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5U2VydmVyUG9ydCgpXG4gICAgICAgICAgICBdKTtcblxuICAgICAgICAgICAgY29uc3Qgc3RhdHVzOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgc2VydmVyUnVubmluZzogdHJ1ZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGlwTGlzdFJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIGlwTGlzdFJlc3VsdC52YWx1ZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmF2YWlsYWJsZUlQcyA9IGlwTGlzdFJlc3VsdC52YWx1ZS5kYXRhLmlwTGlzdDtcbiAgICAgICAgICAgICAgICBzdGF0dXMuaXBDb3VudCA9IGlwTGlzdFJlc3VsdC52YWx1ZS5kYXRhLmNvdW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0dXMuYXZhaWxhYmxlSVBzID0gW107XG4gICAgICAgICAgICAgICAgc3RhdHVzLmlwQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5pcEVycm9yID0gaXBMaXN0UmVzdWx0LnN0YXR1cyA9PT0gJ3JlamVjdGVkJyA/IGlwTGlzdFJlc3VsdC5yZWFzb24gOiBpcExpc3RSZXN1bHQudmFsdWUuZXJyb3I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwb3J0UmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgcG9ydFJlc3VsdC52YWx1ZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLnBvcnQgPSBwb3J0UmVzdWx0LnZhbHVlLmRhdGEucG9ydDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLnBvcnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0RXJyb3IgPSBwb3J0UmVzdWx0LnN0YXR1cyA9PT0gJ3JlamVjdGVkJyA/IHBvcnRSZXN1bHQucmVhc29uIDogcG9ydFJlc3VsdC52YWx1ZS5lcnJvcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3RhdHVzLm1jcFNlcnZlclBvcnQgPSAzMDAwO1xuICAgICAgICAgICAgc3RhdHVzLmVkaXRvclZlcnNpb24gPSAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmNvY29zIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgIHN0YXR1cy5wbGF0Zm9ybSA9IHByb2Nlc3MucGxhdGZvcm07XG4gICAgICAgICAgICBzdGF0dXMubm9kZVZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb247XG5cbiAgICAgICAgICAgIHN0YXR1cy5zZXJ2ZXJWZXJzaW9uID0gcmVhZFNlcnZlclZlcnNpb24oKTtcbiAgICAgICAgICAgIHN0YXR1cy5tb2R1bGVMb2FkZWRBdCA9IG5ldyBEYXRlKE1PRFVMRV9MT0FERURfQVQpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBidWlsdEF0ID0gcmVhZERpc3RCdWlsdEF0KCk7XG4gICAgICAgICAgICBzdGF0dXMuZGlzdEJ1aWx0QXQgPSBidWlsdEF0ID8gbmV3IERhdGUoYnVpbHRBdCkudG9JU09TdHJpbmcoKSA6IG51bGw7XG4gICAgICAgICAgICBzdGF0dXMucmVsb2FkUmVxdWlyZWQgPSBidWlsdEF0ICE9PSBudWxsICYmIGJ1aWx0QXQgPiBNT0RVTEVfTE9BREVEX0FUO1xuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzdGF0dXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgc2VydmVyIHN0YXR1czogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KHRpbWVvdXQ6IG51bWJlciA9IDUwMDApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgd2l0aFRpbWVvdXQoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKSwgdGltZW91dCwgJ3NlcnZlci5xdWVyeS1wb3J0Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNlcnZlciBjb25uZWN0aXZpdHkgY29uZmlybWVkIGluICR7cmVzcG9uc2VUaW1lfW1zYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0TmV0d29ya0ludGVyZmFjZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpO1xuXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrSW5mbyA9IE9iamVjdC5lbnRyaWVzKGludGVyZmFjZXMpLm1hcCgoW25hbWUsIGFkZHJlc3Nlc106IFtzdHJpbmcsIGFueV0pID0+ICh7XG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBhZGRyZXNzZXM6IGFkZHJlc3Nlcy5tYXAoKGFkZHI6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzczogYWRkci5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICBmYW1pbHk6IGFkZHIuZmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBpbnRlcm5hbDogYWRkci5pbnRlcm5hbCxcbiAgICAgICAgICAgICAgICAgICAgY2lkcjogYWRkci5jaWRyXG4gICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcklQUmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeVNlcnZlcklQTGlzdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya0ludGVyZmFjZXM6IG5ldHdvcmtJbmZvLFxuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJBdmFpbGFibGVJUHM6IHNlcnZlcklQUmVzdWx0LnN1Y2Nlc3MgPyBzZXJ2ZXJJUFJlc3VsdC5kYXRhLmlwTGlzdCA6IFtdLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTmV0d29yayBpbnRlcmZhY2VzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgbmV0d29yayBpbnRlcmZhY2VzOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==