import { readFileSync } from 'fs';
import { join } from 'path';

interface ServerSettings {
    port: number;
    autoStart: boolean;
    debugLog: boolean;
    maxConnections: number;
}

const panelMap = new WeakMap<object, ReturnType<typeof setInterval>>();

module.exports = Editor.Panel.define({
    listeners: {
        show() {},
        hide() {},
    },
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
    },
    ready() {
        const root = this.$.app as HTMLElement;
        const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

        const t = (key: string): string => {
            const i18nKey = `cocos-mcp-server.${key}`;
            return String(Editor.I18n?.t?.(i18nKey) || key);
        };

        const settings: ServerSettings = { port: 3000, autoStart: false, debugLog: false, maxConnections: 10 };
        let serverRunning = false;

        const elStatusValue    = q('#el-status-value');
        const elPropConnections = q<HTMLElement>('#el-prop-connections');
        const elConnectedClients = q('#el-connected-clients');
        const btnToggle        = q<HTMLElement>('#btn-toggle');
        const sectionInfo      = q<HTMLElement>('#section-info');
        const elHttpUrl        = q<HTMLElement>('#el-http-url');
        const inputPort        = q<HTMLElement>('#input-port');
        const inputAutoStart   = q<HTMLElement>('#input-auto-start');
        const inputDebugLog    = q<HTMLElement>('#input-debug-log');
        const inputMaxConns    = q<HTMLElement>('#input-max-connections');
        const btnSave          = q<HTMLElement>('#btn-save');
        const btnCopy          = q<HTMLElement>('#btn-copy');

        q('#txt-server-status').textContent    = t('server_status');
        q('#txt-status-label').textContent     = t('status_label');
        q('#txt-connections-label').textContent = t('connections_label');
        q('#txt-settings').textContent         = t('settings');
        q('#txt-port').textContent             = t('port');
        q('#txt-auto-start').textContent       = t('auto_start');
        q('#txt-debug-log').textContent        = t('debug_log');
        q('#txt-max-connections').textContent  = t('max_connections');
        q('#txt-connection-info').textContent  = t('connection_info');
        q('#txt-http-url').textContent         = t('http_url');
        btnCopy.textContent  = t('copy');
        btnSave.textContent  = t('save_settings');

        const updateUI = (running: boolean, clients: number, httpUrl: string) => {
            serverRunning = running;
            elStatusValue.textContent = running ? t('server_running_status') : t('server_stopped_status');
            elStatusValue.className = `status-value ${running ? 'running' : 'stopped'}`;
            elPropConnections.style.display = running ? '' : 'none';
            elConnectedClients.textContent = String(clients);
            btnToggle.textContent = running ? t('stop_server') : t('start_server');
            sectionInfo.style.display = running ? '' : 'none';
            elHttpUrl.setAttribute('value', httpUrl);
            running ? inputPort.setAttribute('disabled', '') : inputPort.removeAttribute('disabled');
        };

        const markChanged = () => {
            btnSave.removeAttribute('disabled');
        };

        Editor.Message.request('cocos-mcp-server', 'get-server-status').then((result: any) => {
            if (result?.settings) {
                settings.port           = result.settings.port           || 3000;
                settings.autoStart      = result.settings.autoStart      || false;
                settings.debugLog       = result.settings.enableDebugLog || false;
                settings.maxConnections = result.settings.maxConnections || 10;
            } else if (result?.port) {
                settings.port = result.port;
            }
            inputPort.setAttribute('value', String(settings.port));
            inputAutoStart.setAttribute('value', String(settings.autoStart));
            inputDebugLog.setAttribute('value', String(settings.debugLog));
            inputMaxConns.setAttribute('value', String(settings.maxConnections));

            inputPort.addEventListener('confirm', (e: any)       => { settings.port           = Number(e.target.value);  markChanged(); });
            inputAutoStart.addEventListener('confirm', (e: any)  => { settings.autoStart      = Boolean(e.target.value); markChanged(); });
            inputDebugLog.addEventListener('confirm', (e: any)   => { settings.debugLog       = Boolean(e.target.value); markChanged(); });
            inputMaxConns.addEventListener('confirm', (e: any)   => { settings.maxConnections = Number(e.target.value);  markChanged(); });
        }).catch((e: any) => console.error('[MCP Panel] Failed to get server status:', e));

        btnToggle.addEventListener('click', async () => {
            if (serverRunning) {
                await Editor.Message.request('cocos-mcp-server', 'stop-server');
            } else {
                await Editor.Message.request('cocos-mcp-server', 'update-settings', {
                    port: settings.port, autoStart: settings.autoStart,
                    enableDebugLog: settings.debugLog, maxConnections: settings.maxConnections,
                });
                await Editor.Message.request('cocos-mcp-server', 'start-server');
            }
        });

        btnSave.addEventListener('click', async () => {
            await Editor.Message.request('cocos-mcp-server', 'update-settings', {
                port: settings.port, autoStart: settings.autoStart,
                enableDebugLog: settings.debugLog, maxConnections: settings.maxConnections,
            });
            btnSave.setAttribute('disabled', '');
        });

        btnCopy.addEventListener('click', () => {
            navigator.clipboard.writeText(elHttpUrl.getAttribute('value') || '');
        });

        panelMap.set(this, setInterval(async () => {
            try {
                const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                if (result) {
                    updateUI(result.running, result.clients || 0, result.running ? `http://localhost:${result.port}` : '');
                }
            } catch (e) {
                console.error('[MCP Panel] Failed to poll server status:', e);
            }
        }, 2000));
    },
    beforeClose() {},
    close() {
        const interval = panelMap.get(this);
        if (interval) clearInterval(interval);
    },
});
