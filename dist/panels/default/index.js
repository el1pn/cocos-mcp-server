"use strict";
/* eslint-disable vue/one-component-per-file */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const panelDataMap = new WeakMap();
module.exports = Editor.Panel.define({
    listeners: {
        show() {
            console.log('[MCP Panel] Panel shown');
        },
        hide() {
            console.log('[MCP Panel] Panel hidden');
        },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            // Create main app component
            app.component('McpServerApp', (0, vue_1.defineComponent)({
                setup() {
                    // Reactive data
                    const activeTab = (0, vue_1.ref)('server');
                    const serverRunning = (0, vue_1.ref)(false);
                    const connectedClients = (0, vue_1.ref)(0);
                    const httpUrl = (0, vue_1.ref)('');
                    const isProcessing = (0, vue_1.ref)(false);
                    const settings = (0, vue_1.ref)({
                        port: 3000,
                        autoStart: false,
                        debugLog: false,
                        maxConnections: 10,
                    });
                    const t = (key, ...args) => {
                        var _a, _b;
                        const i18nKey = `cocos-mcp-server.${key}`;
                        const translated = ((_b = (_a = Editor.I18n) === null || _a === void 0 ? void 0 : _a.t) === null || _b === void 0 ? void 0 : _b.call(_a, i18nKey)) || key;
                        const baseText = String(translated);
                        return args.reduce((text, value, index) => {
                            return text.replace(`{${index}}`, String(value));
                        }, baseText);
                    };
                    // Computed properties
                    const statusClass = (0, vue_1.computed)(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value,
                    }));
                    const serverStatusText = (0, vue_1.computed)(() => (serverRunning.value ? t('server_running_status') : t('server_stopped_status')));
                    const settingsChanged = (0, vue_1.ref)(false);
                    // Methods
                    const switchTab = (tabName) => {
                        activeTab.value = tabName;
                        if (tabName === 'tester') {
                            loadTesterTools();
                        }
                    };
                    const toggleServer = async () => {
                        try {
                            if (serverRunning.value) {
                                await Editor.Message.request('cocos-mcp-server', 'stop-server');
                            }
                            else {
                                const currentSettings = {
                                    port: settings.value.port,
                                    autoStart: settings.value.autoStart,
                                    enableDebugLog: settings.value.debugLog,
                                    maxConnections: settings.value.maxConnections,
                                };
                                await Editor.Message.request('cocos-mcp-server', 'update-settings', currentSettings);
                                await Editor.Message.request('cocos-mcp-server', 'start-server');
                            }
                            console.log('[Vue App] Server toggled');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle server:', error);
                        }
                    };
                    const saveSettings = async () => {
                        try {
                            const settingsData = {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                enableDebugLog: settings.value.debugLog,
                                maxConnections: settings.value.maxConnections,
                            };
                            const result = await Editor.Message.request('cocos-mcp-server', 'update-settings', settingsData);
                            console.log('[Vue App] Save settings result:', result);
                            settingsChanged.value = false;
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save settings:', error);
                        }
                    };
                    const copyUrl = async () => {
                        try {
                            await navigator.clipboard.writeText(httpUrl.value);
                            console.log('[Vue App] URL copied to clipboard');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to copy URL:', error);
                        }
                    };
                    // --- Tool Tester state ---
                    const testerSelectedTool = (0, vue_1.ref)('');
                    const testerArgs = (0, vue_1.ref)('{}');
                    const testerResult = (0, vue_1.ref)(null);
                    const testerRunning = (0, vue_1.ref)(false);
                    const testerDuration = (0, vue_1.ref)(null);
                    const testerToolDefs = (0, vue_1.ref)([]);
                    const testerToolNames = (0, vue_1.computed)(() => testerToolDefs.value.map(t => t.name).sort());
                    const testerSelectedToolDef = (0, vue_1.computed)(() => testerToolDefs.value.find(t => t.name === testerSelectedTool.value) || null);
                    const testerResultText = (0, vue_1.computed)(() => {
                        if (testerResult.value === null)
                            return '';
                        return JSON.stringify(testerResult.value, null, 2);
                    });
                    const testerParams = (0, vue_1.computed)(() => {
                        var _a;
                        const def = testerSelectedToolDef.value;
                        if (!((_a = def === null || def === void 0 ? void 0 : def.inputSchema) === null || _a === void 0 ? void 0 : _a.properties))
                            return [];
                        const required = new Set(def.inputSchema.required || []);
                        return Object.entries(def.inputSchema.properties).map(([name, prop]) => ({
                            name,
                            type: prop.type || 'any',
                            required: required.has(name),
                            description: prop.description || '',
                            enum: prop.enum || null,
                        }));
                    });
                    const testerSelectTool = (toolName) => {
                        var _a, _b;
                        testerSelectedTool.value = toolName;
                        const def = testerToolDefs.value.find(t => t.name === toolName);
                        if ((_a = def === null || def === void 0 ? void 0 : def.inputSchema) === null || _a === void 0 ? void 0 : _a.properties) {
                            const sample = {};
                            const props = def.inputSchema.properties;
                            const required = new Set(def.inputSchema.required || []);
                            for (const [key, prop] of Object.entries(props)) {
                                if (((_b = prop.enum) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                                    sample[key] = prop.enum[0];
                                }
                                else if (prop.type === 'string') {
                                    sample[key] = '';
                                }
                                else if (prop.type === 'number') {
                                    sample[key] = 0;
                                }
                                else if (prop.type === 'boolean') {
                                    sample[key] = false;
                                }
                                else if (prop.type === 'object') {
                                    sample[key] = {};
                                }
                                else if (prop.type === 'array') {
                                    sample[key] = [];
                                }
                            }
                            testerArgs.value = JSON.stringify(sample, null, 2);
                        }
                        else {
                            testerArgs.value = '{}';
                        }
                    };
                    const testerExecute = async () => {
                        if (!testerSelectedTool.value)
                            return;
                        testerRunning.value = true;
                        testerResult.value = null;
                        testerDuration.value = null;
                        const start = Date.now();
                        try {
                            let args = {};
                            try {
                                args = JSON.parse(testerArgs.value);
                            }
                            catch ( /* ignore */_a) { /* ignore */ }
                            const result = await Editor.Message.request('cocos-mcp-server', 'executeToolFromPanel', testerSelectedTool.value, args);
                            testerResult.value = result;
                        }
                        catch (error) {
                            testerResult.value = { error: error.message || String(error) };
                        }
                        testerDuration.value = Date.now() - start;
                        testerRunning.value = false;
                    };
                    const testerClear = () => {
                        testerResult.value = null;
                        testerDuration.value = null;
                    };
                    const loadTesterTools = async () => {
                        try {
                            const tools = await Editor.Message.request('cocos-mcp-server', 'getToolsList');
                            testerToolDefs.value = tools || [];
                        }
                        catch ( /* ignore */_a) { /* ignore */ }
                    };
                    (0, vue_1.onMounted)(async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                            if (result && result.settings) {
                                settings.value = {
                                    port: result.settings.port || 3000,
                                    autoStart: result.settings.autoStart || false,
                                    debugLog: result.settings.enableDebugLog || false,
                                    maxConnections: result.settings.maxConnections || 10,
                                };
                                console.log('[Vue App] Server settings loaded from status:', result.settings);
                            }
                            else if (result && result.port) {
                                settings.value.port = result.port;
                                console.log('[Vue App] Port loaded from server status:', result.port);
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                            console.log('[Vue App] Using default server settings');
                        }
                        // Watch after loading is complete to avoid triggering settingsChanged during load
                        (0, vue_1.watch)(settings, () => {
                            settingsChanged.value = true;
                        }, { deep: true });
                        setInterval(async () => {
                            try {
                                const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                                if (result) {
                                    serverRunning.value = result.running;
                                    connectedClients.value = result.clients || 0;
                                    httpUrl.value = result.running ? `http://localhost:${result.port}` : '';
                                    isProcessing.value = false;
                                }
                            }
                            catch (error) {
                                console.error('[Vue App] Failed to get server status:', error);
                            }
                        }, 2000);
                    });
                    return {
                        activeTab,
                        serverRunning,
                        serverStatusText,
                        connectedClients,
                        httpUrl,
                        isProcessing,
                        settings,
                        settingsChanged,
                        statusClass,
                        t,
                        switchTab,
                        toggleServer,
                        saveSettings,
                        copyUrl,
                        // Tester
                        testerSelectedTool,
                        testerArgs,
                        testerResult,
                        testerRunning,
                        testerDuration,
                        testerToolNames,
                        testerSelectedToolDef,
                        testerResultText,
                        testerParams,
                        testerSelectTool,
                        testerExecute,
                        testerClear,
                    };
                },
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
            console.log('[MCP Panel] Vue3 app mounted successfully');
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7QUFFL0MsdUNBQXdDO0FBQ3hDLCtCQUE0QjtBQUM1Qiw2QkFBdUY7QUFFdkYsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQVU3QyxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUk7WUFDQSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDM0MsQ0FBQztRQUNELElBQUk7WUFDQSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDNUMsQ0FBQztLQUNKO0lBQ0QsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsNkNBQTZDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDL0YsS0FBSyxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUseUNBQXlDLENBQUMsRUFBRSxPQUFPLENBQUM7SUFDeEYsQ0FBQyxFQUFFO1FBQ0MsR0FBRyxFQUFFLE1BQU07UUFDWCxVQUFVLEVBQUUsYUFBYTtLQUM1QjtJQUNELEtBQUs7UUFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVMsRUFBQyxFQUFFLENBQUMsQ0FBQztZQUMxQixHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFNUUsNEJBQTRCO1lBQzVCLEdBQUcsQ0FBQyxTQUFTLENBQUMs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a0QsQ0FBQyxFQUFFLE9BQU8sQ0FBQzthQUN2RyxDQUFDLENBQUMsQ0FBQztZQUVKLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUU1QixPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXLEtBQUksQ0FBQztJQUNoQixLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04sR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCwgcmVmLCBjb21wdXRlZCwgb25Nb3VudGVkLCB3YXRjaCB9IGZyb20gJ3Z1ZSc7XG5cbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xuXG4vLyBEZWZpbmUgc2VydmVyIHNldHRpbmdzIGludGVyZmFjZVxuaW50ZXJmYWNlIFNlcnZlclNldHRpbmdzIHtcbiAgICBwb3J0OiBudW1iZXI7XG4gICAgYXV0b1N0YXJ0OiBib29sZWFuO1xuICAgIGRlYnVnTG9nOiBib29sZWFuO1xuICAgIG1heENvbm5lY3Rpb25zOiBudW1iZXI7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yLlBhbmVsLmRlZmluZSh7XG4gICAgbGlzdGVuZXJzOiB7XG4gICAgICAgIHNob3coKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUCBQYW5lbF0gUGFuZWwgc2hvd24nKTtcbiAgICAgICAgfSxcbiAgICAgICAgaGlkZSgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQIFBhbmVsXSBQYW5lbCBoaWRkZW4nKTtcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXG4gICAgJDoge1xuICAgICAgICBhcHA6ICcjYXBwJyxcbiAgICAgICAgcGFuZWxUaXRsZTogJyNwYW5lbFRpdGxlJyxcbiAgICB9LFxuICAgIHJlYWR5KCkge1xuICAgICAgICBpZiAodGhpcy4kLmFwcCkge1xuICAgICAgICAgICAgY29uc3QgYXBwID0gY3JlYXRlQXBwKHt9KTtcbiAgICAgICAgICAgIGFwcC5jb25maWcuY29tcGlsZXJPcHRpb25zLmlzQ3VzdG9tRWxlbWVudCA9ICh0YWcpID0+IHRhZy5zdGFydHNXaXRoKCd1aS0nKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIG1haW4gYXBwIGNvbXBvbmVudFxuICAgICAgICAgICAgYXBwLmNvbXBvbmVudCgnTWNwU2VydmVyQXBwJywgZGVmaW5lQ29tcG9uZW50KHtcbiAgICAgICAgICAgICAgICBzZXR1cCgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVhY3RpdmUgZGF0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmVUYWIgPSByZWYoJ3NlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJSdW5uaW5nID0gcmVmKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkQ2xpZW50cyA9IHJlZigwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaHR0cFVybCA9IHJlZignJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJvY2Vzc2luZyA9IHJlZihmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSByZWY8U2VydmVyU2V0dGluZ3M+KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IDMwMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdMb2c6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IDEwLFxuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ID0gKGtleTogc3RyaW5nLCAuLi5hcmdzOiBBcnJheTxzdHJpbmcgfCBudW1iZXI+KTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGkxOG5LZXkgPSBgY29jb3MtbWNwLXNlcnZlci4ke2tleX1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZCA9IEVkaXRvci5JMThuPy50Py4oaTE4bktleSkgfHwga2V5O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVRleHQgPSBTdHJpbmcodHJhbnNsYXRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJncy5yZWR1Y2U8c3RyaW5nPigodGV4dCwgdmFsdWUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZShgeyR7aW5kZXh9fWAsIFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgYmFzZVRleHQpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIENvbXB1dGVkIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBjb21wdXRlZCgoKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgJ3N0YXR1cy1ydW5uaW5nJzogc2VydmVyUnVubmluZy52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMtc3RvcHBlZCc6ICFzZXJ2ZXJSdW5uaW5nLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyU3RhdHVzVGV4dCA9IGNvbXB1dGVkKCgpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcudmFsdWUgPyB0KCdzZXJ2ZXJfcnVubmluZ19zdGF0dXMnKSA6IHQoJ3NlcnZlcl9zdG9wcGVkX3N0YXR1cycpXG4gICAgICAgICAgICAgICAgICAgICkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzQ2hhbmdlZCA9IHJlZihmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWV0aG9kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzd2l0Y2hUYWIgPSAodGFiTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVUYWIudmFsdWUgPSB0YWJOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhYk5hbWUgPT09ICd0ZXN0ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFRlc3RlclRvb2xzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9nZ2xlU2VydmVyID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc2VydmVyUnVubmluZy52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3N0b3Atc2VydmVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MudmFsdWUucG9ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc2V0dGluZ3MudmFsdWUuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IHNldHRpbmdzLnZhbHVlLmRlYnVnTG9nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IHNldHRpbmdzLnZhbHVlLm1heENvbm5lY3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZS1zZXR0aW5ncycsIGN1cnJlbnRTZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnc3RhcnQtc2VydmVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2VydmVyIHRvZ2dsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byB0b2dnbGUgc2VydmVyOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYXZlU2V0dGluZ3MgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzRGF0YSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MudmFsdWUucG9ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBzZXR0aW5ncy52YWx1ZS5hdXRvU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBzZXR0aW5ncy52YWx1ZS5kZWJ1Z0xvZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IHNldHRpbmdzLnZhbHVlLm1heENvbm5lY3Rpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZS1zZXR0aW5ncycsIHNldHRpbmdzRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTYXZlIHNldHRpbmdzIHJlc3VsdDonLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZC52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHNhdmUgc2V0dGluZ3M6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvcHlVcmwgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGh0dHBVcmwudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVVJMIGNvcGllZCB0byBjbGlwYm9hcmQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBjb3B5IFVSTDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gLS0tIFRvb2wgVGVzdGVyIHN0YXRlIC0tLVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJTZWxlY3RlZFRvb2wgPSByZWYoJycpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJBcmdzID0gcmVmKCd7fScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJSZXN1bHQgPSByZWY8YW55PihudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVzdGVyUnVubmluZyA9IHJlZihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RlckR1cmF0aW9uID0gcmVmPG51bWJlciB8IG51bGw+KG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJUb29sRGVmcyA9IHJlZjxhbnlbXT4oW10pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RlclRvb2xOYW1lcyA9IGNvbXB1dGVkKCgpID0+IHRlc3RlclRvb2xEZWZzLnZhbHVlLm1hcCh0ID0+IHQubmFtZSkuc29ydCgpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVzdGVyU2VsZWN0ZWRUb29sRGVmID0gY29tcHV0ZWQoKCkgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclRvb2xEZWZzLnZhbHVlLmZpbmQodCA9PiB0Lm5hbWUgPT09IHRlc3RlclNlbGVjdGVkVG9vbC52YWx1ZSkgfHwgbnVsbFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJSZXN1bHRUZXh0ID0gY29tcHV0ZWQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRlc3RlclJlc3VsdC52YWx1ZSA9PT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRlc3RlclJlc3VsdC52YWx1ZSwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RlclBhcmFtcyA9IGNvbXB1dGVkKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlZiA9IHRlc3RlclNlbGVjdGVkVG9vbERlZi52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGVmPy5pbnB1dFNjaGVtYT8ucHJvcGVydGllcykgcmV0dXJuIFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBuZXcgU2V0KGRlZi5pbnB1dFNjaGVtYS5yZXF1aXJlZCB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXMoZGVmLmlucHV0U2NoZW1hLnByb3BlcnRpZXMpLm1hcCgoW25hbWUsIHByb3BdOiBbc3RyaW5nLCBhbnldKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogcHJvcC50eXBlIHx8ICdhbnknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiByZXF1aXJlZC5oYXMobmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHByb3AuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogcHJvcC5lbnVtIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RlclNlbGVjdFRvb2wgPSAodG9vbE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyU2VsZWN0ZWRUb29sLnZhbHVlID0gdG9vbE5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWYgPSB0ZXN0ZXJUb29sRGVmcy52YWx1ZS5maW5kKHQgPT4gdC5uYW1lID09PSB0b29sTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGVmPy5pbnB1dFNjaGVtYT8ucHJvcGVydGllcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhbXBsZTogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BzID0gZGVmLmlucHV0U2NoZW1hLnByb3BlcnRpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBuZXcgU2V0KGRlZi5pbnB1dFNjaGVtYS5yZXF1aXJlZCB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBwcm9wXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykgYXMgW3N0cmluZywgYW55XVtdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwcm9wLmVudW0/Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gcHJvcC5lbnVtWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AudHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC50eXBlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2FtcGxlW2tleV0gPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AudHlwZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHByb3AudHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNhbXBsZVtrZXldID0ge307XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcC50eXBlID09PSAnYXJyYXknKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzYW1wbGVba2V5XSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlckFyZ3MudmFsdWUgPSBKU09OLnN0cmluZ2lmeShzYW1wbGUsIG51bGwsIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJBcmdzLnZhbHVlID0gJ3t9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXN0ZXJFeGVjdXRlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0ZXN0ZXJTZWxlY3RlZFRvb2wudmFsdWUpIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclJ1bm5pbmcudmFsdWUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyUmVzdWx0LnZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlckR1cmF0aW9uLnZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZ3MgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkgeyBhcmdzID0gSlNPTi5wYXJzZSh0ZXN0ZXJBcmdzLnZhbHVlKTsgfSBjYXRjaCB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdleGVjdXRlVG9vbEZyb21QYW5lbCcsIHRlc3RlclNlbGVjdGVkVG9vbC52YWx1ZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyUmVzdWx0LnZhbHVlID0gcmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclJlc3VsdC52YWx1ZSA9IHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyRHVyYXRpb24udmFsdWUgPSBEYXRlLm5vdygpIC0gc3RhcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJSdW5uaW5nLnZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVzdGVyQ2xlYXIgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJSZXN1bHQudmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyRHVyYXRpb24udmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRUZXN0ZXJUb29scyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldFRvb2xzTGlzdCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclRvb2xEZWZzLnZhbHVlID0gdG9vbHMgfHwgW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBvbk1vdW50ZWQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MudmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiByZXN1bHQuc2V0dGluZ3MucG9ydCB8fCAzMDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiByZXN1bHQuc2V0dGluZ3MuYXV0b1N0YXJ0IHx8IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdMb2c6IHJlc3VsdC5zZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZyB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiByZXN1bHQuc2V0dGluZ3MubWF4Q29ubmVjdGlvbnMgfHwgMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2VydmVyIHNldHRpbmdzIGxvYWRlZCBmcm9tIHN0YXR1czonLCByZXN1bHQuc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0ICYmIHJlc3VsdC5wb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLnZhbHVlLnBvcnQgPSByZXN1bHQucG9ydDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBQb3J0IGxvYWRlZCBmcm9tIHNlcnZlciBzdGF0dXM6JywgcmVzdWx0LnBvcnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBnZXQgc2VydmVyIHN0YXR1czonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBVc2luZyBkZWZhdWx0IHNlcnZlciBzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXYXRjaCBhZnRlciBsb2FkaW5nIGlzIGNvbXBsZXRlIHRvIGF2b2lkIHRyaWdnZXJpbmcgc2V0dGluZ3NDaGFuZ2VkIGR1cmluZyBsb2FkXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXRjaChzZXR0aW5ncywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZC52YWx1ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB7IGRlZXA6IHRydWUgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEludGVydmFsKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcudmFsdWUgPSByZXN1bHQucnVubmluZztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZENsaWVudHMudmFsdWUgPSByZXN1bHQuY2xpZW50cyB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFVybC52YWx1ZSA9IHJlc3VsdC5ydW5uaW5nID8gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtyZXN1bHQucG9ydH1gIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1Byb2Nlc3NpbmcudmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aXZlVGFiLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyUnVubmluZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclN0YXR1c1RleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NDaGFuZ2VkLFxuXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0dXNDbGFzcyxcblxuICAgICAgICAgICAgICAgICAgICAgICAgdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaFRhYixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZ2dsZVNlcnZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVTZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlVcmwsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRlc3RlclxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyU2VsZWN0ZWRUb29sLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyQXJncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclJlc3VsdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclJ1bm5pbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclRvb2xOYW1lcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclNlbGVjdGVkVG9vbERlZixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlclJlc3VsdFRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXN0ZXJTZWxlY3RUb29sLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGVzdGVyRXhlY3V0ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlc3RlckNsZWFyLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS92dWUvbWNwLXNlcnZlci1hcHAuaHRtbCcpLCAndXRmLTgnKSxcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgYXBwLm1vdW50KHRoaXMuJC5hcHApO1xuICAgICAgICAgICAgcGFuZWxEYXRhTWFwLnNldCh0aGlzLCBhcHApO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUCBQYW5lbF0gVnVlMyBhcHAgbW91bnRlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYmVmb3JlQ2xvc2UoKSB7fSxcbiAgICBjbG9zZSgpIHtcbiAgICAgICAgY29uc3QgYXBwID0gcGFuZWxEYXRhTWFwLmdldCh0aGlzKTtcbiAgICAgICAgaWYgKGFwcCkge1xuICAgICAgICAgICAgYXBwLnVubW91bnQoKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcbiJdfQ==