import { v4 as uuidv4 } from 'uuid';
import { ToolConfig, ToolConfiguration, ToolManagerSettings, ToolDefinition } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ToolManager {
    private settings: ToolManagerSettings;
    private availableTools: ToolConfig[] = [];

    constructor() {
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();

        // If no configurations exist, automatically create a default one
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration('Default Configuration', 'Automatically created default tool configuration');
        } else {
            // Migrate old configurations: if saved tool names don't match current tools,
            // reset configurations to use the new consolidated tool names
            this.migrateConfigurationsIfNeeded();
        }
    }

    private migrateConfigurationsIfNeeded(): void {
        const currentToolNames = new Set(this.availableTools.map(t => t.name));

        for (const config of this.settings.configurations) {
            // Check if any saved tool name matches current tools
            const matchCount = config.tools.filter(t => currentToolNames.has(t.name)).length;
            const totalSaved = config.tools.length;

            // If less than half of saved tools match, this is an old config that needs migration
            if (totalSaved > 0 && matchCount < totalSaved * 0.5) {
                console.log(`[ToolManager] Migrating config "${config.name}": ${matchCount}/${totalSaved} tools matched. Resetting to current tool set.`);
                config.tools = this.availableTools.map(tool => ({ ...tool }));
                config.updatedAt = new Date().toISOString();
            }
        }

        this.saveSettings();
    }

    private getToolManagerSettingsPath(): string {
        return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
    }

    private ensureSettingsDir(): void {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }

    private readToolManagerSettings(): ToolManagerSettings {
        const DEFAULT_TOOL_MANAGER_SETTINGS: ToolManagerSettings = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };

        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return { ...DEFAULT_TOOL_MANAGER_SETTINGS, ...JSON.parse(content) };
            }
        } catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }

    private saveToolManagerSettings(settings: ToolManagerSettings): void {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        } catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }

    private exportToolConfiguration(config: ToolConfiguration): string {
        return JSON.stringify(config, null, 2);
    }

    private importToolConfiguration(configJson: string): ToolConfiguration {
        try {
            const config = JSON.parse(configJson);
            // Validate configuration format
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        } catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }

    private initializeAvailableTools(): void {
        // Get the real tool list from the MCP server
        try {
            // Import all tool classes
            const { SceneTools } = require('./scene-tools');
            const { NodeTools } = require('./node-tools');
            const { ComponentTools } = require('./component-tools');
            const { PrefabTools } = require('./prefab-tools');
            const { ProjectTools } = require('./project-tools');
            const { DebugTools } = require('./debug-tools');
            const { PreferencesTools } = require('./preferences-tools');
            const { ServerTools } = require('./server-tools');
            const { BroadcastTools } = require('./broadcast-tools');
            const { SceneAdvancedTools } = require('./scene-advanced-tools');
            const { SceneViewTools } = require('./scene-view-tools');
            const { ReferenceImageTools } = require('./reference-image-tools');
            const { AssetAdvancedTools } = require('./asset-advanced-tools');
            const { ValidationTools } = require('./validation-tools');

            // Initialize tool instances
            const tools = {
                scene: new SceneTools(),
                node: new NodeTools(),
                component: new ComponentTools(),
                prefab: new PrefabTools(),
                project: new ProjectTools(),
                debug: new DebugTools(),
                preferences: new PreferencesTools(),
                server: new ServerTools(),
                broadcast: new BroadcastTools(),
                sceneAdvanced: new SceneAdvancedTools(),
                sceneView: new SceneViewTools(),
                referenceImage: new ReferenceImageTools(),
                assetAdvanced: new AssetAdvancedTools(),
                validation: new ValidationTools()
            };

            // Get tool list from each tool class
            // Tools now return their final consolidated names directly
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool: any) => {
                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: true, // Enabled by default
                        description: tool.description
                    });
                });
            }

            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        } catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // If fetching fails, use default tool list as fallback
            this.initializeDefaultTools();
        }
    }

    private initializeDefaultTools(): void {
        // Default tool list as fallback (consolidated action-based tools)
        const toolCategories = [
            { category: 'scene', tools: [
                { name: 'scene_management', description: 'Manage scenes (get_current/get_list/open/save/save_as/create/close/get_hierarchy)' }
            ]},
            { category: 'sceneAdvanced', tools: [
                { name: 'scene_state', description: 'Query and manage scene state' },
                { name: 'scene_undo', description: 'Undo recording management' },
                { name: 'node_clipboard', description: 'Copy/paste/cut nodes' },
                { name: 'node_advanced', description: 'Reset properties, array operations, restore prefab' },
                { name: 'execute_method', description: 'Execute component or scene script methods' }
            ]},
            { category: 'sceneView', tools: [
                { name: 'gizmo_tool', description: 'Gizmo tool, pivot, and coordinate management' },
                { name: 'scene_view', description: 'Scene view settings (2D/3D, grid, icons)' },
                { name: 'scene_camera', description: 'Camera focus and alignment' }
            ]},
            { category: 'node', tools: [
                { name: 'node_lifecycle', description: 'Create/delete/duplicate/move nodes' },
                { name: 'node_query', description: 'Query and find nodes' },
                { name: 'node_transform', description: 'Set node transform and properties' }
            ]},
            { category: 'component', tools: [
                { name: 'component_manage', description: 'Add/remove components and attach scripts' },
                { name: 'component_query', description: 'Query component information' },
                { name: 'set_component_property', description: 'Set component property values' }
            ]},
            { category: 'prefab', tools: [
                { name: 'prefab_lifecycle', description: 'Create/instantiate/update/duplicate prefabs' },
                { name: 'prefab_query', description: 'Query prefab information' },
                { name: 'prefab_instance', description: 'Revert/restore prefab instances' }
            ]},
            { category: 'project', tools: [
                { name: 'asset_query', description: 'Query and find assets' },
                { name: 'asset_crud', description: 'Create/copy/move/delete/save assets' },
                { name: 'project_info', description: 'Get project info and settings' },
                { name: 'project_build', description: 'Run/build project' },
                { name: 'project_preview', description: 'Start/stop preview server' }
            ]},
            { category: 'assetAdvanced', tools: [
                { name: 'asset_advanced', description: 'Advanced asset operations' },
                { name: 'asset_batch', description: 'Batch asset operations' }
            ]},
            { category: 'debug', tools: [
                { name: 'debug_console', description: 'Console logs and script execution' },
                { name: 'debug_inspect', description: 'Node tree, performance, validation' },
                { name: 'debug_logs', description: 'Project log file operations' }
            ]},
            { category: 'preferences', tools: [
                { name: 'preferences_config', description: 'Preferences management' },
                { name: 'preferences_io', description: 'Export/import preferences' }
            ]},
            { category: 'server', tools: [
                { name: 'server_info', description: 'Server status and network info' }
            ]},
            { category: 'broadcast', tools: [
                { name: 'broadcast', description: 'Broadcast message management' }
            ]},
            { category: 'referenceImage', tools: [
                { name: 'reference_image_manage', description: 'Add/remove/switch reference images' },
                { name: 'reference_image_transform', description: 'Set reference image transform' }
            ]},
            { category: 'validation', tools: [
                { name: 'validation', description: 'JSON validation and formatting utilities' }
            ]}
        ];

        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true,
                    description: tool.description
                });
            });
        });

        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }

    public getAvailableTools(): ToolConfig[] {
        return [...this.availableTools];
    }

    public getConfigurations(): ToolConfiguration[] {
        return [...this.settings.configurations];
    }

    public getCurrentConfiguration(): ToolConfiguration | null {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }

    public createConfiguration(name: string, description?: string): ToolConfiguration {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }

        const config: ToolConfiguration = {
            id: uuidv4(),
            name,
            description,
            tools: this.availableTools.map(tool => ({ ...tool })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();

        return config;
    }

    public updateConfiguration(configId: string, updates: Partial<ToolConfiguration>): ToolConfiguration {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration not found');
        }

        const config = this.settings.configurations[configIndex];
        const updatedConfig: ToolConfiguration = {
            ...config,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();

        return updatedConfig;
    }

    public deleteConfiguration(configId: string): void {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration not found');
        }

        this.settings.configurations.splice(configIndex, 1);
        
        // If the deleted config was the current one, clear the current config ID
        if (this.settings.currentConfigId === configId) {
            this.settings.currentConfigId = this.settings.configurations.length > 0 
                ? this.settings.configurations[0].id 
                : '';
        }

        this.saveSettings();
    }

    public setCurrentConfiguration(configId: string): void {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration not found');
        }

        this.settings.currentConfigId = configId;
        this.saveSettings();
    }

    public updateToolStatus(configId: string, category: string, toolName: string, enabled: boolean): void {
        console.log(`Backend: Updating tool status - configId: ${configId}, category: ${category}, toolName: ${toolName}, enabled: ${enabled}`);
        
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            throw new Error('Configuration not found');
        }

        console.log(`Backend: Found config: ${config.name}`);

        const tool = config.tools.find(t => t.category === category && t.name === toolName);
        if (!tool) {
            console.error(`Backend: Tool not found - category: ${category}, name: ${toolName}`);
            throw new Error('Tool not found');
        }

        console.log(`Backend: Found tool: ${tool.name}, current enabled: ${tool.enabled}, new enabled: ${enabled}`);
        
        tool.enabled = enabled;
        config.updatedAt = new Date().toISOString();
        
        console.log(`Backend: Tool updated, saving settings...`);
        this.saveSettings();
        console.log(`Backend: Settings saved successfully`);
    }

    public updateToolStatusBatch(configId: string, updates: { category: string; name: string; enabled: boolean }[]): void {
        console.log(`Backend: updateToolStatusBatch called with configId: ${configId}`);
        console.log(`Backend: Current configurations count: ${this.settings.configurations.length}`);
        console.log(`Backend: Current config IDs:`, this.settings.configurations.map(c => c.id));
        
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            console.error(`Backend: Config not found with ID: ${configId}`);
            console.error(`Backend: Available config IDs:`, this.settings.configurations.map(c => c.id));
            throw new Error('Configuration not found');
        }

        console.log(`Backend: Found config: ${config.name}, updating ${updates.length} tools`);

        updates.forEach(update => {
            const tool = config.tools.find(t => t.category === update.category && t.name === update.name);
            if (tool) {
                tool.enabled = update.enabled;
            }
        });

        config.updatedAt = new Date().toISOString();
        this.saveSettings();
        console.log(`Backend: Batch update completed successfully`);
    }

    public exportConfiguration(configId: string): string {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration not found');
        }

        return this.exportToolConfiguration(config);
    }

    public importConfiguration(configJson: string): ToolConfiguration {
        const config = this.importToolConfiguration(configJson);
        
        // Generate new ID and timestamps
        config.id = uuidv4();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();

        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }

        this.settings.configurations.push(config);
        this.saveSettings();

        return config;
    }

    public getEnabledTools(): ToolConfig[] {
        const currentConfig = this.getCurrentConfiguration();
        if (!currentConfig) {
            return this.availableTools.filter(tool => tool.enabled);
        }
        return currentConfig.tools.filter(tool => tool.enabled);
    }

    public getToolManagerState() {
        const currentConfig = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: currentConfig ? currentConfig.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }

    private saveSettings(): void {
        console.log(`Backend: Saving settings, current configs count: ${this.settings.configurations.length}`);
        this.saveToolManagerSettings(this.settings);
        console.log(`Backend: Settings saved to file`);
    }
} 
