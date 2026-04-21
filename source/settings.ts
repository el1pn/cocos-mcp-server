import * as fs from 'fs';
import * as path from 'path';
import { MCPServerSettings } from './types';

const DEFAULT_SETTINGS: MCPServerSettings = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    allowedOrigins: ['*'],
    maxConnections: 10
};

/** Machine-local data; Cocos project templates typically gitignore `local/`. */
export function getMcpServerDataDir(projectPath: string): string {
    return path.join(projectPath, 'local', 'cocos-mcp-server');
}

function getLegacySettingsPath(projectPath: string): string {
    return path.join(projectPath, 'settings', 'mcp-server.json');
}

function getSettingsPath(): string {
    return path.join(getMcpServerDataDir(Editor.Project.path), 'mcp-server.json');
}

function ensureDataDir(): void {
    const dir = getMcpServerDataDir(Editor.Project.path);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/** One-time copy from old `settings/mcp-server.json` (often tracked by git). */
function migrateLegacySettingsIfNeeded(): void {
    const projectPath = Editor.Project.path;
    const nextPath = path.join(getMcpServerDataDir(projectPath), 'mcp-server.json');
    if (fs.existsSync(nextPath)) {
        return;
    }
    const legacyPath = getLegacySettingsPath(projectPath);
    if (!fs.existsSync(legacyPath)) {
        return;
    }
    try {
        ensureDataDir();
        fs.copyFileSync(legacyPath, nextPath);
        fs.unlinkSync(legacyPath);
    } catch (e) {
        console.error('Failed to migrate legacy MCP settings:', e);
    }
}

export function readSettings(): MCPServerSettings {
    try {
        migrateLegacySettingsIfNeeded();
        ensureDataDir();
        const settingsFile = getSettingsPath();
        if (fs.existsSync(settingsFile)) {
            const content = fs.readFileSync(settingsFile, 'utf8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
        }
    } catch (e) {
        console.error('Failed to read settings:', e);
    }
    return DEFAULT_SETTINGS;
}

export function saveSettings(settings: MCPServerSettings): void {
    try {
        ensureDataDir();
        const settingsFile = getSettingsPath();
        fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('Failed to save settings:', e);
        throw e;
    }
}

export { DEFAULT_SETTINGS };
