import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { logger } from './logger';

let mcpServer: MCPServer | null = null;

/**
 * @en Registration method for the main process of Extension
 * @zh Registration method for the main process of Extension
 */
export const methods: { [key: string]: (...any: any) => any } = {
    /**
     * @en Open the MCP server panel
     * @zh Open the MCP server panel
     */
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },



    /**
     * @en Start the MCP server
     * @zh Start the MCP server
     */
    async startServer() {
        if (mcpServer) {
            await mcpServer.start();
        } else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },

    /**
     * @en Stop the MCP server
     * @zh Stop the MCP server
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        } else {
            console.warn('[MCP Plugin] mcpServer not initialized');
        }
    },

    /**
     * @en Get server status
     * @zh Get server status
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0 };
        const settings = mcpServer ? mcpServer.getSettings() : readSettings();
        return {
            ...status,
            settings: settings
        };
    },

    /**
     * @en Update server settings
     * @zh Update server settings
     */
    updateSettings(settings: MCPServerSettings) {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.stop();
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        } else {
            mcpServer = new MCPServer(settings);
            mcpServer.start();
        }
        return { success: true, settings };
    },

    /**
     * @en Get server settings
     * @zh Get server settings
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },

    /**
     * @en Get server settings (alternative method)
     * @zh Get server settings (alternative method)
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : readSettings();
    },
};

/**
 * @en Method Triggered on Extension Startup
 * @zh Method Triggered on Extension Startup
 */
export function load() {
    console.log('Cocos MCP Server extension loaded');

    // Initialize logger disk persistence
    try {
        logger.initDiskLog(Editor.Project.path);
    } catch {
        // Logger works without disk — best effort
    }

    // Read settings
    const settings = readSettings();
    mcpServer = new MCPServer(settings);

    // Auto-start server if configured
    if (settings.autoStart) {
        mcpServer.start().catch(err => {
            console.error('Failed to auto-start MCP server:', err);
        });
    }
}

/**
 * @en Method triggered when uninstalling the extension
 * @zh Method triggered when uninstalling the extension
 */
export function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}