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
                    const availableTools = (0, vue_1.ref)([]);
                    const toolCategories = (0, vue_1.ref)([]);
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
                    const totalTools = (0, vue_1.computed)(() => availableTools.value.length);
                    const enabledTools = (0, vue_1.computed)(() => availableTools.value.filter((tool) => tool.enabled).length);
                    const disabledTools = (0, vue_1.computed)(() => totalTools.value - enabledTools.value);
                    const toolStatsText = (0, vue_1.computed)(() => t('tool_stats_summary', totalTools.value, enabledTools.value, disabledTools.value));
                    const settingsChanged = (0, vue_1.ref)(false);
                    // Methods
                    const switchTab = (tabName) => {
                        activeTab.value = tabName;
                        if (tabName === 'tools') {
                            loadToolManagerState();
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
                    const loadToolManagerState = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'getToolManagerState');
                            if (result && result.success) {
                                availableTools.value = result.availableTools || [];
                                console.log('[Vue App] Loaded tools:', availableTools.value.length);
                                const categories = new Set(availableTools.value.map((tool) => tool.category));
                                toolCategories.value = Array.from(categories);
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to load tool manager state:', error);
                        }
                    };
                    const updateToolStatus = async (category, name, enabled) => {
                        try {
                            console.log('[Vue App] updateToolStatus called:', category, name, enabled);
                            const toolIndex = availableTools.value.findIndex((tool) => tool.category === category && tool.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = enabled;
                                availableTools.value = [...availableTools.value];
                                console.log('[Vue App] Local state updated, tool enabled:', availableTools.value[toolIndex].enabled);
                            }
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatus', category, name, enabled);
                            if (!result || !result.success) {
                                if (toolIndex !== -1) {
                                    availableTools.value[toolIndex].enabled = !enabled;
                                    availableTools.value = [...availableTools.value];
                                }
                                console.error('[Vue App] Backend update failed, rolled back local state');
                            }
                            else {
                                console.log('[Vue App] Backend update successful');
                            }
                        }
                        catch (error) {
                            const toolIndex = availableTools.value.findIndex((tool) => tool.category === category && tool.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = !enabled;
                                availableTools.value = [...availableTools.value];
                            }
                            console.error('[Vue App] Failed to update tool status:', error);
                        }
                    };
                    const selectAllTools = async () => {
                        try {
                            availableTools.value.forEach((tool) => {
                                tool.enabled = true;
                            });
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to select all tools:', error);
                        }
                    };
                    const deselectAllTools = async () => {
                        try {
                            availableTools.value.forEach((tool) => {
                                tool.enabled = false;
                            });
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to deselect all tools:', error);
                        }
                    };
                    const saveChanges = async () => {
                        try {
                            const updates = availableTools.value.map((tool) => ({
                                category: String(tool.category),
                                name: String(tool.name),
                                enabled: Boolean(tool.enabled),
                            }));
                            console.log('[Vue App] Sending updates:', updates.length, 'tools');
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', updates);
                            if (result && result.success) {
                                console.log('[Vue App] Tool changes saved successfully');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save tool changes:', error);
                        }
                    };
                    const toggleCategoryTools = async (category, enabled) => {
                        try {
                            availableTools.value.forEach((tool) => {
                                if (tool.category === category) {
                                    tool.enabled = enabled;
                                }
                            });
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle category tools:', error);
                        }
                    };
                    const getToolsByCategory = (category) => {
                        return availableTools.value.filter((tool) => tool.category === category);
                    };
                    const getCategoryDisplayName = (category) => {
                        const categoryNames = {
                            scene: 'scene_tools',
                            node: 'node_tools',
                            component: 'component_tools',
                            prefab: 'prefab_tools',
                            project: 'project_tools',
                            debug: 'debug_tools',
                            preferences: 'preferences_tools',
                            server: 'server_tools',
                            broadcast: 'broadcast_tools',
                            sceneAdvanced: 'scene_advanced_tools',
                            sceneView: 'scene_view_tools',
                            referenceImage: 'reference_image_tools',
                            assetAdvanced: 'asset_advanced_tools',
                            validation: 'validation_tools',
                        };
                        const categoryKey = categoryNames[category];
                        return categoryKey ? t(categoryKey) : category;
                    };
                    (0, vue_1.onMounted)(async () => {
                        await loadToolManagerState();
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
                        availableTools,
                        toolCategories,
                        settingsChanged,
                        statusClass,
                        totalTools,
                        enabledTools,
                        disabledTools,
                        toolStatsText,
                        t,
                        switchTab,
                        toggleServer,
                        saveSettings,
                        copyUrl,
                        loadToolManagerState,
                        updateToolStatus,
                        selectAllTools,
                        deselectAllTools,
                        saveChanges,
                        toggleCategoryTools,
                        getToolsByCategory,
                        getCategoryDisplayName,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7QUFFL0MsdUNBQXdDO0FBQ3hDLCtCQUE0QjtBQUM1Qiw2QkFBdUY7QUFFdkYsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQWtCN0MsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7S0FDSjtJQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQy9GLEtBQUssRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsVUFBVSxFQUFFLGFBQWE7S0FDNUI7SUFDRCxLQUFLO1FBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBQSxlQUFTLEVBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTVFLDRCQUE0QjtZQUM1QixHQUFHLENBQUMsU0FBUyxDQUFD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LFNBQVM7d0JBQ1QsWUFBWTt3QkFDWixZQUFZO3dCQUNaLE9BQU87d0JBQ1Asb0JBQW9CO3dCQUNwQixnQkFBZ0I7d0JBQ2hCLGNBQWM7d0JBQ2QsZ0JBQWdCO3dCQUNoQixXQUFXO3dCQUNYLG1CQUFtQjt3QkFDbkIsa0JBQWtCO3dCQUNsQixzQkFBc0I7cUJBQ3pCLENBQUM7Z0JBQ04sQ0FBQztnQkFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxrREFBa0QsQ0FBQyxFQUFFLE9BQU8sQ0FBQzthQUN2RyxDQUFDLENBQUMsQ0FBQztZQUVKLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUU1QixPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNMLENBQUM7SUFDRCxXQUFXLEtBQUksQ0FBQztJQUNoQixLQUFLO1FBQ0QsTUFBTSxHQUFHLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ04sR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgdnVlL29uZS1jb21wb25lbnQtcGVyLWZpbGUgKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlQXBwLCBBcHAsIGRlZmluZUNvbXBvbmVudCwgcmVmLCBjb21wdXRlZCwgb25Nb3VudGVkLCB3YXRjaCB9IGZyb20gJ3Z1ZSc7XG5cbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xuXG4vLyBEZWZpbmUgdG9vbCBjb25maWd1cmF0aW9uIGludGVyZmFjZVxuaW50ZXJmYWNlIFRvb2xDb25maWcge1xuICAgIGNhdGVnb3J5OiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbn1cblxuLy8gRGVmaW5lIHNlcnZlciBzZXR0aW5ncyBpbnRlcmZhY2VcbmludGVyZmFjZSBTZXJ2ZXJTZXR0aW5ncyB7XG4gICAgcG9ydDogbnVtYmVyO1xuICAgIGF1dG9TdGFydDogYm9vbGVhbjtcbiAgICBkZWJ1Z0xvZzogYm9vbGVhbjtcbiAgICBtYXhDb25uZWN0aW9uczogbnVtYmVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xuICAgIGxpc3RlbmVyczoge1xuICAgICAgICBzaG93KCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1AgUGFuZWxdIFBhbmVsIHNob3duJyk7XG4gICAgICAgIH0sXG4gICAgICAgIGhpZGUoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUCBQYW5lbF0gUGFuZWwgaGlkZGVuJyk7XG4gICAgICAgIH0sXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL2RlZmF1bHQvaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxuICAgICQ6IHtcbiAgICAgICAgYXBwOiAnI2FwcCcsXG4gICAgICAgIHBhbmVsVGl0bGU6ICcjcGFuZWxUaXRsZScsXG4gICAgfSxcbiAgICByZWFkeSgpIHtcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7fSk7XG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSAodGFnKSA9PiB0YWcuc3RhcnRzV2l0aCgndWktJyk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBtYWluIGFwcCBjb21wb25lbnRcbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ01jcFNlcnZlckFwcCcsIGRlZmluZUNvbXBvbmVudCh7XG4gICAgICAgICAgICAgICAgc2V0dXAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlYWN0aXZlIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0aXZlVGFiID0gcmVmKCdzZXJ2ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyUnVubmluZyA9IHJlZihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbm5lY3RlZENsaWVudHMgPSByZWYoMCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGh0dHBVcmwgPSByZWYoJycpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1Byb2Nlc3NpbmcgPSByZWYoZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVmPFNlcnZlclNldHRpbmdzPih7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiAzMDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnTG9nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiAxMCxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlVG9vbHMgPSByZWY8VG9vbENvbmZpZ1tdPihbXSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xDYXRlZ29yaWVzID0gcmVmPHN0cmluZ1tdPihbXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdCA9IChrZXk6IHN0cmluZywgLi4uYXJnczogQXJyYXk8c3RyaW5nIHwgbnVtYmVyPik6IHN0cmluZyA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpMThuS2V5ID0gYGNvY29zLW1jcC1zZXJ2ZXIuJHtrZXl9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWQgPSBFZGl0b3IuSTE4bj8udD8uKGkxOG5LZXkpIHx8IGtleTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VUZXh0ID0gU3RyaW5nKHRyYW5zbGF0ZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3MucmVkdWNlKCh0ZXh0OiBzdHJpbmcsIHZhbHVlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UoYHske2luZGV4fX1gLCBTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGJhc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBDb21wdXRlZCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1c0NsYXNzID0gY29tcHV0ZWQoKCkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdzdGF0dXMtcnVubmluZyc6IHNlcnZlclJ1bm5pbmcudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAnc3RhdHVzLXN0b3BwZWQnOiAhc2VydmVyUnVubmluZy52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlclN0YXR1c1RleHQgPSBjb21wdXRlZCgoKSA9PiAoXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nLnZhbHVlID8gdCgnc2VydmVyX3J1bm5pbmdfc3RhdHVzJykgOiB0KCdzZXJ2ZXJfc3RvcHBlZF9zdGF0dXMnKVxuICAgICAgICAgICAgICAgICAgICApKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b3RhbFRvb2xzID0gY29tcHV0ZWQoKCkgPT4gYXZhaWxhYmxlVG9vbHMudmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gY29tcHV0ZWQoKCkgPT4gYXZhaWxhYmxlVG9vbHMudmFsdWUuZmlsdGVyKCh0b29sKSA9PiB0b29sLmVuYWJsZWQpLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkVG9vbHMgPSBjb21wdXRlZCgoKSA9PiB0b3RhbFRvb2xzLnZhbHVlIC0gZW5hYmxlZFRvb2xzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbFN0YXRzVGV4dCA9IGNvbXB1dGVkKCgpID0+IHQoJ3Rvb2xfc3RhdHNfc3VtbWFyeScsIHRvdGFsVG9vbHMudmFsdWUsIGVuYWJsZWRUb29scy52YWx1ZSwgZGlzYWJsZWRUb29scy52YWx1ZSkpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzQ2hhbmdlZCA9IHJlZihmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWV0aG9kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzd2l0Y2hUYWIgPSAodGFiTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVUYWIudmFsdWUgPSB0YWJOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRhYk5hbWUgPT09ICd0b29scycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2FkVG9vbE1hbmFnZXJTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZ2dsZVNlcnZlciA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlcnZlclJ1bm5pbmcudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdzdG9wLXNlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnZhbHVlLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLnZhbHVlLmF1dG9TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBzZXR0aW5ncy52YWx1ZS5kZWJ1Z0xvZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiBzZXR0aW5ncy52YWx1ZS5tYXhDb25uZWN0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGUtc2V0dGluZ3MnLCBjdXJyZW50U2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3N0YXJ0LXNlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFNlcnZlciB0b2dnbGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gdG9nZ2xlIHNlcnZlcjonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVNldHRpbmdzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5nc0RhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnZhbHVlLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc2V0dGluZ3MudmFsdWUuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogc2V0dGluZ3MudmFsdWUuZGVidWdMb2csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiBzZXR0aW5ncy52YWx1ZS5tYXhDb25uZWN0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGUtc2V0dGluZ3MnLCBzZXR0aW5nc0RhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2F2ZSBzZXR0aW5ncyByZXN1bHQ6JywgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NoYW5nZWQudmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBzYXZlIHNldHRpbmdzOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5VXJsID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChodHRwVXJsLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFVSTCBjb3BpZWQgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gY29weSBVUkw6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvYWRUb29sTWFuYWdlclN0YXRlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldFRvb2xNYW5hZ2VyU3RhdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlID0gcmVzdWx0LmF2YWlsYWJsZVRvb2xzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIExvYWRlZCB0b29sczonLCBhdmFpbGFibGVUb29scy52YWx1ZS5sZW5ndGgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBuZXcgU2V0KGF2YWlsYWJsZVRvb2xzLnZhbHVlLm1hcCgodG9vbCkgPT4gdG9vbC5jYXRlZ29yeSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sQ2F0ZWdvcmllcy52YWx1ZSA9IEFycmF5LmZyb20oY2F0ZWdvcmllcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGxvYWQgdG9vbCBtYW5hZ2VyIHN0YXRlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVUb29sU3RhdHVzID0gYXN5bmMgKGNhdGVnb3J5OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIHVwZGF0ZVRvb2xTdGF0dXMgY2FsbGVkOicsIGNhdGVnb3J5LCBuYW1lLCBlbmFibGVkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xJbmRleCA9IGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZpbmRJbmRleCgodG9vbCkgPT4gdG9vbC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkgJiYgdG9vbC5uYW1lID09PSBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9vbEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZSA9IFsuLi5hdmFpbGFibGVUb29scy52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gTG9jYWwgc3RhdGUgdXBkYXRlZCwgdG9vbCBlbmFibGVkOicsIGF2YWlsYWJsZVRvb2xzLnZhbHVlW3Rvb2xJbmRleF0uZW5hYmxlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGVUb29sU3RhdHVzJywgY2F0ZWdvcnksIG5hbWUsIGVuYWJsZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9vbEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWVbdG9vbEluZGV4XS5lbmFibGVkID0gIWVuYWJsZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZSA9IFsuLi5hdmFpbGFibGVUb29scy52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEJhY2tlbmQgdXBkYXRlIGZhaWxlZCwgcm9sbGVkIGJhY2sgbG9jYWwgc3RhdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIEJhY2tlbmQgdXBkYXRlIHN1Y2Nlc3NmdWwnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xJbmRleCA9IGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZpbmRJbmRleCgodG9vbCkgPT4gdG9vbC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkgJiYgdG9vbC5uYW1lID09PSBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9vbEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSAhZW5hYmxlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUgPSBbLi4uYXZhaWxhYmxlVG9vbHMudmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHVwZGF0ZSB0b29sIHN0YXR1czonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0QWxsVG9vbHMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZvckVhY2goKHRvb2wpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbC5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzYXZlQ2hhbmdlcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHNlbGVjdCBhbGwgdG9vbHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2VsZWN0QWxsVG9vbHMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZvckVhY2goKHRvb2wpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbC5lbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2F2ZUNoYW5nZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBkZXNlbGVjdCBhbGwgdG9vbHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhdmVDaGFuZ2VzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVzID0gYXZhaWxhYmxlVG9vbHMudmFsdWUubWFwKCh0b29sKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogU3RyaW5nKHRvb2wuY2F0ZWdvcnkpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBTdHJpbmcodG9vbC5uYW1lKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogQm9vbGVhbih0b29sLmVuYWJsZWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2VuZGluZyB1cGRhdGVzOicsIHVwZGF0ZXMubGVuZ3RoLCAndG9vbHMnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAndXBkYXRlVG9vbFN0YXR1c0JhdGNoJywgdXBkYXRlcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVG9vbCBjaGFuZ2VzIHNhdmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBzYXZlIHRvb2wgY2hhbmdlczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9nZ2xlQ2F0ZWdvcnlUb29scyA9IGFzeW5jIChjYXRlZ29yeTogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZvckVhY2goKHRvb2wpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2wuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2F2ZUNoYW5nZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byB0b2dnbGUgY2F0ZWdvcnkgdG9vbHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdldFRvb2xzQnlDYXRlZ29yeSA9IChjYXRlZ29yeTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXZhaWxhYmxlVG9vbHMudmFsdWUuZmlsdGVyKCh0b29sKSA9PiB0b29sLmNhdGVnb3J5ID09PSBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2V0Q2F0ZWdvcnlEaXNwbGF5TmFtZSA9IChjYXRlZ29yeTogc3RyaW5nKTogc3RyaW5nID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5TmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmU6ICdzY2VuZV90b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogJ25vZGVfdG9vbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudDogJ2NvbXBvbmVudF90b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiOiAncHJlZmFiX3Rvb2xzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0OiAncHJvamVjdF90b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWc6ICdkZWJ1Z190b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXM6ICdwcmVmZXJlbmNlc190b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyOiAnc2VydmVyX3Rvb2xzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm9hZGNhc3Q6ICdicm9hZGNhc3RfdG9vbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lQWR2YW5jZWQ6ICdzY2VuZV9hZHZhbmNlZF90b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NlbmVWaWV3OiAnc2NlbmVfdmlld190b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVmZXJlbmNlSW1hZ2U6ICdyZWZlcmVuY2VfaW1hZ2VfdG9vbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0QWR2YW5jZWQ6ICdhc3NldF9hZHZhbmNlZF90b29scycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogJ3ZhbGlkYXRpb25fdG9vbHMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeUtleSA/IHQoY2F0ZWdvcnlLZXkpIDogY2F0ZWdvcnk7XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgb25Nb3VudGVkKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRUb29sTWFuYWdlclN0YXRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnNldHRpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLnZhbHVlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcmVzdWx0LnNldHRpbmdzLnBvcnQgfHwgMzAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogcmVzdWx0LnNldHRpbmdzLmF1dG9TdGFydCB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnTG9nOiByZXN1bHQuc2V0dGluZ3MuZW5hYmxlRGVidWdMb2cgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhDb25uZWN0aW9uczogcmVzdWx0LnNldHRpbmdzLm1heENvbm5lY3Rpb25zIHx8IDEwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFNlcnZlciBzZXR0aW5ncyBsb2FkZWQgZnJvbSBzdGF0dXM6JywgcmVzdWx0LnNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCAmJiByZXN1bHQucG9ydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy52YWx1ZS5wb3J0ID0gcmVzdWx0LnBvcnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gUG9ydCBsb2FkZWQgZnJvbSBzZXJ2ZXIgc3RhdHVzOicsIHJlc3VsdC5wb3J0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVXNpbmcgZGVmYXVsdCBzZXJ2ZXIgc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gV2F0Y2ggYWZ0ZXIgbG9hZGluZyBpcyBjb21wbGV0ZSB0byBhdm9pZCB0cmlnZ2VyaW5nIHNldHRpbmdzQ2hhbmdlZCBkdXJpbmcgbG9hZFxuICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2goc2V0dGluZ3MsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NoYW5nZWQudmFsdWUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgeyBkZWVwOiB0cnVlIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nLnZhbHVlID0gcmVzdWx0LnJ1bm5pbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzLnZhbHVlID0gcmVzdWx0LmNsaWVudHMgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBVcmwudmFsdWUgPSByZXN1bHQucnVubmluZyA/IGBodHRwOi8vbG9jYWxob3N0OiR7cmVzdWx0LnBvcnR9YCA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNQcm9jZXNzaW5nLnZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGdldCBzZXJ2ZXIgc3RhdHVzOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdGF0dXNUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkQ2xpZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0dHBVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1Byb2Nlc3NpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbENhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0NoYW5nZWQsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1c0NsYXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxUb29scyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29scyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkVG9vbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sU3RhdHNUZXh0LFxuXG4gICAgICAgICAgICAgICAgICAgICAgICB0LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoVGFiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlU2VydmVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZVNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29weVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRUb29sTWFuYWdlclN0YXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlVG9vbFN0YXR1cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdEFsbFRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzZWxlY3RBbGxUb29scyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVDaGFuZ2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9nZ2xlQ2F0ZWdvcnlUb29scyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldFRvb2xzQnlDYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdldENhdGVnb3J5RGlzcGxheU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3Z1ZS9tY3Atc2VydmVyLWFwcC5odG1sJyksICd1dGYtOCcpLFxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XG4gICAgICAgICAgICBwYW5lbERhdGFNYXAuc2V0KHRoaXMsIGFwcCk7XG5cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQIFBhbmVsXSBWdWUzIGFwcCBtb3VudGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBiZWZvcmVDbG9zZSgpIHt9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuIl19