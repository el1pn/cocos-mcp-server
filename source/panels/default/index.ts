/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, ref, computed, onMounted, watch } from 'vue';

const panelDataMap = new WeakMap<any, App>();

// 定义工具配置接口
interface ToolConfig {
    category: string;
    name: string;
    enabled: boolean;
    description: string;
}

// 定义服务器设置接口
interface ServerSettings {
    port: number;
    autoStart: boolean;
    debugLog: boolean;
    maxConnections: number;
}

module.exports = Editor.Panel.define({
    listeners: {
        show() {
            console.log('[MCP Panel] Panel shown');
        },
        hide() {
            console.log('[MCP Panel] Panel hidden');
        },
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (this.$.app) {
            const app = createApp({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');

            // 创建主应用组件
            app.component('McpServerApp', defineComponent({
                setup() {
                    // 响应式数据
                    const activeTab = ref('server');
                    const serverRunning = ref(false);
                    const connectedClients = ref(0);
                    const httpUrl = ref('');
                    const isProcessing = ref(false);

                    const settings = ref<ServerSettings>({
                        port: 3000,
                        autoStart: false,
                        debugLog: false,
                        maxConnections: 10,
                    });

                    const availableTools = ref<ToolConfig[]>([]);
                    const toolCategories = ref<string[]>([]);

                    const t = (key: string, ...args: Array<string | number>): string => {
                        const i18nKey = `cocos-mcp-server.${key}`;
                        const translated = Editor.I18n?.t?.(i18nKey) || key;
                        const baseText = String(translated);
                        return args.reduce((text: string, value, index) => {
                            return text.replace(`{${index}}`, String(value));
                        }, baseText);
                    };

                    // 计算属性
                    const statusClass = computed(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value,
                    }));

                    const serverStatusText = computed(() => (
                        serverRunning.value ? t('server_running_status') : t('server_stopped_status')
                    ));

                    const totalTools = computed(() => availableTools.value.length);
                    const enabledTools = computed(() => availableTools.value.filter((tool) => tool.enabled).length);
                    const disabledTools = computed(() => totalTools.value - enabledTools.value);
                    const toolStatsText = computed(() => t('tool_stats_summary', totalTools.value, enabledTools.value, disabledTools.value));

                    const settingsChanged = ref(false);

                    // 方法
                    const switchTab = (tabName: string) => {
                        activeTab.value = tabName;
                        if (tabName === 'tools') {
                            loadToolManagerState();
                        }
                    };

                    const toggleServer = async () => {
                        try {
                            if (serverRunning.value) {
                                await Editor.Message.request('cocos-mcp-server', 'stop-server');
                            } else {
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
                        } catch (error) {
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
                        } catch (error) {
                            console.error('[Vue App] Failed to save settings:', error);
                        }
                    };

                    const copyUrl = async () => {
                        try {
                            await navigator.clipboard.writeText(httpUrl.value);
                            console.log('[Vue App] URL copied to clipboard');
                        } catch (error) {
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
                        } catch (error) {
                            console.error('[Vue App] Failed to load tool manager state:', error);
                        }
                    };

                    const updateToolStatus = async (category: string, name: string, enabled: boolean) => {
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
                            } else {
                                console.log('[Vue App] Backend update successful');
                            }
                        } catch (error) {
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
                        } catch (error) {
                            console.error('[Vue App] Failed to select all tools:', error);
                        }
                    };

                    const deselectAllTools = async () => {
                        try {
                            availableTools.value.forEach((tool) => {
                                tool.enabled = false;
                            });
                            await saveChanges();
                        } catch (error) {
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
                        } catch (error) {
                            console.error('[Vue App] Failed to save tool changes:', error);
                        }
                    };

                    const toggleCategoryTools = async (category: string, enabled: boolean) => {
                        try {
                            availableTools.value.forEach((tool) => {
                                if (tool.category === category) {
                                    tool.enabled = enabled;
                                }
                            });
                            await saveChanges();
                        } catch (error) {
                            console.error('[Vue App] Failed to toggle category tools:', error);
                        }
                    };

                    const getToolsByCategory = (category: string) => {
                        return availableTools.value.filter((tool) => tool.category === category);
                    };

                    const getCategoryDisplayName = (category: string): string => {
                        const categoryNames: Record<string, string> = {
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

                    watch(settings, () => {
                        settingsChanged.value = true;
                    }, { deep: true });

                    onMounted(async () => {
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
                            } else if (result && result.port) {
                                settings.value.port = result.port;
                                console.log('[Vue App] Port loaded from server status:', result.port);
                            }
                        } catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                            console.log('[Vue App] Using default server settings');
                        }

                        setInterval(async () => {
                            try {
                                const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                                if (result) {
                                    serverRunning.value = result.running;
                                    connectedClients.value = result.clients || 0;
                                    httpUrl.value = result.running ? `http://localhost:${result.port}` : '';
                                    isProcessing.value = false;
                                }
                            } catch (error) {
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
                template: readFileSync(join(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
            }));

            app.mount(this.$.app);
            panelDataMap.set(this, app);

            console.log('[MCP Panel] Vue3 app mounted successfully');
        }
    },
    beforeClose() {},
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
