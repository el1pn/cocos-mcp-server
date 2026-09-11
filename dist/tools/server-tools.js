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
            // `Editor.versions` does not exist; the version lives on Editor.App.
            status.editorVersion = ((_a = Editor.App) === null || _a === void 0 ? void 0 : _a.version) || 'Unknown';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlcnZlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLDREQUErRTtBQUUvRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUVwQyxTQUFTLGlCQUFpQjs7SUFDdEIsSUFBSSxDQUFDO1FBQ0QsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUM5RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDekQsT0FBTyxNQUFNLENBQUMsTUFBQSxHQUFHLENBQUMsT0FBTyxtQ0FBSSxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBQUMsV0FBTSxDQUFDO1FBQ0wsT0FBTyxTQUFTLENBQUM7SUFDckIsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFDcEIsSUFBSSxDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM5RCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzFDLENBQUM7SUFBQyxXQUFNLENBQUM7UUFDTCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0FBQ0wsQ0FBQztBQUVELE1BQWEsV0FBVztJQUNwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxhQUFhO2dCQUNuQixXQUFXLEVBQUUsNFZBQTRWO2dCQUN6VyxXQUFXLEVBQUU7b0JBQ1Qs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LFNBQVMsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87b0JBQ3JCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO29CQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7aUJBQ2xCLENBQUMsQ0FBQzthQUNOLENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN0RCxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRTtvQkFDRixpQkFBaUIsRUFBRSxXQUFXO29CQUM5QixrQkFBa0IsRUFBRSxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDNUUsT0FBTyxFQUFFLDJDQUEyQztpQkFDdkQ7YUFDSixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHFDQUFxQyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUN6RixDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBL0xELGtDQStMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCwgd2l0aFRpbWVvdXQgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5cbmNvbnN0IE1PRFVMRV9MT0FERURfQVQgPSBEYXRlLm5vdygpO1xuXG5mdW5jdGlvbiByZWFkU2VydmVyVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBrZ1BhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vcGFja2FnZS5qc29uJyk7XG4gICAgICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrZ1BhdGgsICd1dGY4JykpO1xuICAgICAgICByZXR1cm4gU3RyaW5nKHBrZy52ZXJzaW9uID8/ICd1bmtub3duJyk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiAndW5rbm93bic7XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWFkRGlzdEJ1aWx0QXQoKTogbnVtYmVyIHwgbnVsbCB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZGlzdEVudHJ5ID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL21jcC1zZXJ2ZXIuanMnKTtcbiAgICAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGRpc3RFbnRyeSkubXRpbWVNcztcbiAgICB9IGNhdGNoIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgU2VydmVyVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXJ2ZXJfaW5mbycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBzZXJ2ZXIgYW5kIG5ldHdvcmsgaW5mb3JtYXRpb24uIEFjdGlvbnM6IGdldF9pcF9saXN0IChxdWVyeSBzZXJ2ZXIgSVAgbGlzdCksIGdldF9zb3J0ZWRfaXBfbGlzdCAoZ2V0IHNvcnRlZCBzZXJ2ZXIgSVAgbGlzdCksIGdldF9wb3J0IChxdWVyeSBlZGl0b3Igc2VydmVyIGN1cnJlbnQgcG9ydCksIGdldF9zdGF0dXMgKGdldCBjb21wcmVoZW5zaXZlIHNlcnZlciBzdGF0dXMpLCBjaGVja19jb25uZWN0aXZpdHkgKGNoZWNrIHNlcnZlciBjb25uZWN0aXZpdHkgYW5kIG5ldHdvcmsgc3RhdHVzKSwgZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyAoZ2V0IGF2YWlsYWJsZSBuZXR3b3JrIGludGVyZmFjZXMpJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaXBfbGlzdCcsICdnZXRfc29ydGVkX2lwX2xpc3QnLCAnZ2V0X3BvcnQnLCAnZ2V0X3N0YXR1cycsICdjaGVja19jb25uZWN0aXZpdHknLCAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGltZW91dCBpbiBtaWxsaXNlY29uZHMgKGFjdGlvbjogY2hlY2tfY29ubmVjdGl2aXR5KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNTAwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3NlcnZlcl9pbmZvJzpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9pcF9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2VydmVySVBMaXN0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9zb3J0ZWRfaXBfbGlzdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNvcnRlZFNlcnZlcklQTGlzdCgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfcG9ydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNlcnZlclBvcnQoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRTZXJ2ZXJTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY2hlY2tfY29ubmVjdGl2aXR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KGFyZ3MudGltZW91dCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9uZXR3b3JrX2ludGVyZmFjZXMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0TmV0d29ya0ludGVyZmFjZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb246ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTZXJ2ZXJJUExpc3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxzdHJpbmdbXT4oJ3NlcnZlcicsICdxdWVyeS1pcC1saXN0JyksXG4gICAgICAgICAgICAoaXBMaXN0KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgaXBMaXN0OiBpcExpc3QsXG4gICAgICAgICAgICAgICAgICAgIGNvdW50OiBpcExpc3QubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSVAgbGlzdCByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNvcnRlZFNlcnZlcklQTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PHN0cmluZ1tdPignc2VydmVyJywgJ3F1ZXJ5LXNvcnQtaXAtbGlzdCcpLFxuICAgICAgICAgICAgKHNvcnRlZElQTGlzdCkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHNvcnRlZElQTGlzdDogc29ydGVkSVBMaXN0LFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogc29ydGVkSVBMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1NvcnRlZCBJUCBsaXN0IHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U2VydmVyUG9ydCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PG51bWJlcj4oJ3NlcnZlcicsICdxdWVyeS1wb3J0JyksXG4gICAgICAgICAgICAocG9ydCkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHBvcnQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBFZGl0b3Igc2VydmVyIGlzIHJ1bm5pbmcgb24gcG9ydCAke3BvcnR9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRTZXJ2ZXJTdGF0dXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IFtpcExpc3RSZXN1bHQsIHBvcnRSZXN1bHRdID0gYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKFtcbiAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5U2VydmVySVBMaXN0KCksXG4gICAgICAgICAgICAgICAgdGhpcy5xdWVyeVNlcnZlclBvcnQoKVxuICAgICAgICAgICAgXSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHN0YXR1czogYW55ID0ge1xuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmc6IHRydWVcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmIChpcExpc3RSZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyAmJiBpcExpc3RSZXN1bHQudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5hdmFpbGFibGVJUHMgPSBpcExpc3RSZXN1bHQudmFsdWUuZGF0YS5pcExpc3Q7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmlwQ291bnQgPSBpcExpc3RSZXN1bHQudmFsdWUuZGF0YS5jb3VudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdHVzLmF2YWlsYWJsZUlQcyA9IFtdO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5pcENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICBzdGF0dXMuaXBFcnJvciA9IGlwTGlzdFJlc3VsdC5zdGF0dXMgPT09ICdyZWplY3RlZCcgPyBpcExpc3RSZXN1bHQucmVhc29uIDogaXBMaXN0UmVzdWx0LnZhbHVlLmVycm9yO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocG9ydFJlc3VsdC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIHBvcnRSZXN1bHQudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0ID0gcG9ydFJlc3VsdC52YWx1ZS5kYXRhLnBvcnQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBzdGF0dXMucG9ydEVycm9yID0gcG9ydFJlc3VsdC5zdGF0dXMgPT09ICdyZWplY3RlZCcgPyBwb3J0UmVzdWx0LnJlYXNvbiA6IHBvcnRSZXN1bHQudmFsdWUuZXJyb3I7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN0YXR1cy5tY3BTZXJ2ZXJQb3J0ID0gMzAwMDtcbiAgICAgICAgICAgIC8vIGBFZGl0b3IudmVyc2lvbnNgIGRvZXMgbm90IGV4aXN0OyB0aGUgdmVyc2lvbiBsaXZlcyBvbiBFZGl0b3IuQXBwLlxuICAgICAgICAgICAgc3RhdHVzLmVkaXRvclZlcnNpb24gPSAoRWRpdG9yIGFzIGFueSkuQXBwPy52ZXJzaW9uIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgIHN0YXR1cy5wbGF0Zm9ybSA9IHByb2Nlc3MucGxhdGZvcm07XG4gICAgICAgICAgICBzdGF0dXMubm9kZVZlcnNpb24gPSBwcm9jZXNzLnZlcnNpb247XG5cbiAgICAgICAgICAgIHN0YXR1cy5zZXJ2ZXJWZXJzaW9uID0gcmVhZFNlcnZlclZlcnNpb24oKTtcbiAgICAgICAgICAgIHN0YXR1cy5tb2R1bGVMb2FkZWRBdCA9IG5ldyBEYXRlKE1PRFVMRV9MT0FERURfQVQpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCBidWlsdEF0ID0gcmVhZERpc3RCdWlsdEF0KCk7XG4gICAgICAgICAgICBzdGF0dXMuZGlzdEJ1aWx0QXQgPSBidWlsdEF0ID8gbmV3IERhdGUoYnVpbHRBdCkudG9JU09TdHJpbmcoKSA6IG51bGw7XG4gICAgICAgICAgICBzdGF0dXMucmVsb2FkUmVxdWlyZWQgPSBidWlsdEF0ICE9PSBudWxsICYmIGJ1aWx0QXQgPiBNT0RVTEVfTE9BREVEX0FUO1xuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzdGF0dXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgc2VydmVyIHN0YXR1czogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KHRpbWVvdXQ6IG51bWJlciA9IDUwMDApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgd2l0aFRpbWVvdXQoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKSwgdGltZW91dCwgJ3NlcnZlci5xdWVyeS1wb3J0Jyk7XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlVGltZSA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNlcnZlciBjb25uZWN0aXZpdHkgY29uZmlybWVkIGluICR7cmVzcG9uc2VUaW1lfW1zYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0TmV0d29ya0ludGVyZmFjZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZXMgPSBvcy5uZXR3b3JrSW50ZXJmYWNlcygpO1xuXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrSW5mbyA9IE9iamVjdC5lbnRyaWVzKGludGVyZmFjZXMpLm1hcCgoW25hbWUsIGFkZHJlc3Nlc106IFtzdHJpbmcsIGFueV0pID0+ICh7XG4gICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICBhZGRyZXNzZXM6IGFkZHJlc3Nlcy5tYXAoKGFkZHI6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgYWRkcmVzczogYWRkci5hZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICBmYW1pbHk6IGFkZHIuZmFtaWx5LFxuICAgICAgICAgICAgICAgICAgICBpbnRlcm5hbDogYWRkci5pbnRlcm5hbCxcbiAgICAgICAgICAgICAgICAgICAgY2lkcjogYWRkci5jaWRyXG4gICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcklQUmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeVNlcnZlcklQTGlzdCgpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya0ludGVyZmFjZXM6IG5ldHdvcmtJbmZvLFxuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJBdmFpbGFibGVJUHM6IHNlcnZlcklQUmVzdWx0LnN1Y2Nlc3MgPyBzZXJ2ZXJJUFJlc3VsdC5kYXRhLmlwTGlzdCA6IFtdLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTmV0d29yayBpbnRlcmZhY2VzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgbmV0d29yayBpbnRlcmZhY2VzOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==