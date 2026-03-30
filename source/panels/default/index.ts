/* eslint-disable vue/one-component-per-file */

import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { createApp, App, defineComponent, ref, computed, onMounted, watch } from 'vue';

const panelDataMap = new WeakMap<any, App>();

// Define server settings interface
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

            // Create main app component
            app.component('McpServerApp', defineComponent({
                setup() {
                    // Reactive data
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

                    const t = (key: string, ...args: Array<string | number>): string => {
                        const i18nKey = `cocos-mcp-server.${key}`;
                        const translated = Editor.I18n?.t?.(i18nKey) || key;
                        const baseText = String(translated);
                        return args.reduce((text: string, value, index) => {
                            return text.replace(`{${index}}`, String(value));
                        }, baseText);
                    };

                    // Computed properties
                    const statusClass = computed(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value,
                    }));

                    const serverStatusText = computed(() => (
                        serverRunning.value ? t('server_running_status') : t('server_stopped_status')
                    ));

                    const settingsChanged = ref(false);

                    // Methods
                    const switchTab = (tabName: string) => {
                        activeTab.value = tabName;
                        if (tabName === 'tester') {
                            loadTesterTools();
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

                    // --- Tool Tester state ---
                    const testerSelectedTool = ref('');
                    const testerArgs = ref('{}');
                    const testerResult = ref<any>(null);
                    const testerRunning = ref(false);
                    const testerDuration = ref<number | null>(null);
                    const testerToolDefs = ref<any[]>([]);

                    const testerToolNames = computed(() => testerToolDefs.value.map(t => t.name).sort());
                    const testerSelectedToolDef = computed(() =>
                        testerToolDefs.value.find(t => t.name === testerSelectedTool.value) || null
                    );
                    const testerResultText = computed(() => {
                        if (testerResult.value === null) return '';
                        return JSON.stringify(testerResult.value, null, 2);
                    });

                    const testerParams = computed(() => {
                        const def = testerSelectedToolDef.value;
                        if (!def?.inputSchema?.properties) return [];
                        const required = new Set(def.inputSchema.required || []);
                        return Object.entries(def.inputSchema.properties).map(([name, prop]: [string, any]) => ({
                            name,
                            type: prop.type || 'any',
                            required: required.has(name),
                            description: prop.description || '',
                            enum: prop.enum || null,
                        }));
                    });

                    const testerSelectTool = (toolName: string) => {
                        testerSelectedTool.value = toolName;
                        const def = testerToolDefs.value.find(t => t.name === toolName);
                        if (def?.inputSchema?.properties) {
                            const sample: Record<string, any> = {};
                            const props = def.inputSchema.properties;
                            const required = new Set(def.inputSchema.required || []);
                            for (const [key, prop] of Object.entries(props) as [string, any][]) {
                                if (prop.enum?.length > 0) {
                                    sample[key] = prop.enum[0];
                                } else if (prop.type === 'string') {
                                    sample[key] = '';
                                } else if (prop.type === 'number') {
                                    sample[key] = 0;
                                } else if (prop.type === 'boolean') {
                                    sample[key] = false;
                                } else if (prop.type === 'object') {
                                    sample[key] = {};
                                } else if (prop.type === 'array') {
                                    sample[key] = [];
                                }
                            }
                            testerArgs.value = JSON.stringify(sample, null, 2);
                        } else {
                            testerArgs.value = '{}';
                        }
                    };

                    const testerExecute = async () => {
                        if (!testerSelectedTool.value) return;
                        testerRunning.value = true;
                        testerResult.value = null;
                        testerDuration.value = null;
                        const start = Date.now();
                        try {
                            let args = {};
                            try { args = JSON.parse(testerArgs.value); } catch { /* ignore */ }
                            const result = await Editor.Message.request('cocos-mcp-server', 'executeToolFromPanel', testerSelectedTool.value, args);
                            testerResult.value = result;
                        } catch (error: any) {
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
                        } catch { /* ignore */ }
                    };

                    onMounted(async () => {
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

                        // Watch after loading is complete to avoid triggering settingsChanged during load
                        watch(settings, () => {
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
