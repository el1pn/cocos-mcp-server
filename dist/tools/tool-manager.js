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
exports.ToolManager = void 0;
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ToolManager {
    constructor() {
        this.availableTools = [];
        this.settings = this.readToolManagerSettings();
        this.initializeAvailableTools();
        // If no configurations exist, automatically create a default one
        if (this.settings.configurations.length === 0) {
            console.log('[ToolManager] No configurations found, creating default configuration...');
            this.createConfiguration('Default Configuration', 'Automatically created default tool configuration');
        }
    }
    getToolManagerSettingsPath() {
        return path.join(Editor.Project.path, 'settings', 'tool-manager.json');
    }
    ensureSettingsDir() {
        const settingsDir = path.dirname(this.getToolManagerSettingsPath());
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
    }
    readToolManagerSettings() {
        const DEFAULT_TOOL_MANAGER_SETTINGS = {
            configurations: [],
            currentConfigId: '',
            maxConfigSlots: 5
        };
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            if (fs.existsSync(settingsFile)) {
                const content = fs.readFileSync(settingsFile, 'utf8');
                return Object.assign(Object.assign({}, DEFAULT_TOOL_MANAGER_SETTINGS), JSON.parse(content));
            }
        }
        catch (e) {
            console.error('Failed to read tool manager settings:', e);
        }
        return DEFAULT_TOOL_MANAGER_SETTINGS;
    }
    saveToolManagerSettings(settings) {
        try {
            this.ensureSettingsDir();
            const settingsFile = this.getToolManagerSettingsPath();
            fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
        }
        catch (e) {
            console.error('Failed to save tool manager settings:', e);
            throw e;
        }
    }
    exportToolConfiguration(config) {
        return JSON.stringify(config, null, 2);
    }
    importToolConfiguration(configJson) {
        try {
            const config = JSON.parse(configJson);
            // Validate configuration format
            if (!config.id || !config.name || !Array.isArray(config.tools)) {
                throw new Error('Invalid configuration format');
            }
            return config;
        }
        catch (e) {
            console.error('Failed to parse tool configuration:', e);
            throw new Error('Invalid JSON format or configuration structure');
        }
    }
    initializeAvailableTools() {
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
            this.availableTools = [];
            for (const [category, toolSet] of Object.entries(tools)) {
                const toolDefinitions = toolSet.getTools();
                toolDefinitions.forEach((tool) => {
                    this.availableTools.push({
                        category: category,
                        name: tool.name,
                        enabled: true, // Enabled by default
                        description: tool.description
                    });
                });
            }
            console.log(`[ToolManager] Initialized ${this.availableTools.length} tools from MCP server`);
        }
        catch (error) {
            console.error('[ToolManager] Failed to initialize tools from MCP server:', error);
            // If fetching fails, use default tool list as fallback
            this.initializeDefaultTools();
        }
    }
    initializeDefaultTools() {
        // Default tool list as fallback
        const toolCategories = [
            { category: 'scene', name: 'Scene Tools', tools: [
                    { name: 'getCurrentSceneInfo', description: 'Get current scene info' },
                    { name: 'getSceneHierarchy', description: 'Get scene hierarchy' },
                    { name: 'createNewScene', description: 'Create new scene' },
                    { name: 'saveScene', description: 'Save scene' },
                    { name: 'loadScene', description: 'Load scene' }
                ] },
            { category: 'node', name: 'Node Tools', tools: [
                    { name: 'getAllNodes', description: 'Get all nodes' },
                    { name: 'findNodeByName', description: 'Find node by name' },
                    { name: 'createNode', description: 'Create node' },
                    { name: 'deleteNode', description: 'Delete node' },
                    { name: 'setNodeProperty', description: 'Set node property' },
                    { name: 'getNodeInfo', description: 'Get node info' }
                ] },
            { category: 'component', name: 'Component Tools', tools: [
                    { name: 'addComponentToNode', description: 'Add component to node' },
                    { name: 'removeComponentFromNode', description: 'Remove component from node' },
                    { name: 'setComponentProperty', description: 'Set component property' },
                    { name: 'getComponentInfo', description: 'Get component info' }
                ] },
            { category: 'prefab', name: 'Prefab Tools', tools: [
                    { name: 'createPrefabFromNode', description: 'Create prefab from node' },
                    { name: 'instantiatePrefab', description: 'Instantiate prefab' },
                    { name: 'getPrefabInfo', description: 'Get prefab info' },
                    { name: 'savePrefab', description: 'Save prefab' }
                ] },
            { category: 'project', name: 'Project Tools', tools: [
                    { name: 'getProjectInfo', description: 'Get project info' },
                    { name: 'getAssetList', description: 'Get asset list' },
                    { name: 'createAsset', description: 'Create asset' },
                    { name: 'deleteAsset', description: 'Delete asset' }
                ] },
            { category: 'debug', name: 'Debug Tools', tools: [
                    { name: 'getConsoleLogs', description: 'Get console logs' },
                    { name: 'getPerformanceStats', description: 'Get performance stats' },
                    { name: 'validateScene', description: 'Validate scene' },
                    { name: 'getErrorLogs', description: 'Get error logs' }
                ] },
            { category: 'preferences', name: 'Preferences Tools', tools: [
                    { name: 'getPreferences', description: 'Get preferences' },
                    { name: 'setPreferences', description: 'Set preferences' },
                    { name: 'resetPreferences', description: 'Reset preferences' }
                ] },
            { category: 'server', name: 'Server Tools', tools: [
                    { name: 'getServerStatus', description: 'Get server status' },
                    { name: 'getConnectedClients', description: 'Get connected clients' },
                    { name: 'getServerLogs', description: 'Get server logs' }
                ] },
            { category: 'broadcast', name: 'Broadcast Tools', tools: [
                    { name: 'broadcastMessage', description: 'Broadcast message' },
                    { name: 'getBroadcastHistory', description: 'Get broadcast history' }
                ] },
            { category: 'sceneAdvanced', name: 'Advanced Scene Tools', tools: [
                    { name: 'optimizeScene', description: 'Optimize scene' },
                    { name: 'analyzeScene', description: 'Analyze scene' },
                    { name: 'batchOperation', description: 'Batch operation' }
                ] },
            { category: 'sceneView', name: 'Scene View Tools', tools: [
                    { name: 'getViewportInfo', description: 'Get viewport info' },
                    { name: 'setViewportCamera', description: 'Set viewport camera' },
                    { name: 'focusOnNode', description: 'Focus on node' }
                ] },
            { category: 'referenceImage', name: 'Reference Image Tools', tools: [
                    { name: 'addReferenceImage', description: 'Add reference image' },
                    { name: 'removeReferenceImage', description: 'Remove reference image' },
                    { name: 'getReferenceImages', description: 'Get reference image list' }
                ] },
            { category: 'assetAdvanced', name: 'Advanced Asset Tools', tools: [
                    { name: 'importAsset', description: 'Import asset' },
                    { name: 'exportAsset', description: 'Export asset' },
                    { name: 'processAsset', description: 'Process asset' }
                ] },
            { category: 'validation', name: 'Validation Tools', tools: [
                    { name: 'validateProject', description: 'Validate project' },
                    { name: 'validateAssets', description: 'Validate assets' },
                    { name: 'generateReport', description: 'Generate report' }
                ] }
        ];
        this.availableTools = [];
        toolCategories.forEach(category => {
            category.tools.forEach(tool => {
                this.availableTools.push({
                    category: category.category,
                    name: tool.name,
                    enabled: true, // Enabled by default
                    description: tool.description
                });
            });
        });
        console.log(`[ToolManager] Initialized ${this.availableTools.length} default tools`);
    }
    getAvailableTools() {
        return [...this.availableTools];
    }
    getConfigurations() {
        return [...this.settings.configurations];
    }
    getCurrentConfiguration() {
        if (!this.settings.currentConfigId) {
            return null;
        }
        return this.settings.configurations.find(config => config.id === this.settings.currentConfigId) || null;
    }
    createConfiguration(name, description) {
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }
        const config = {
            id: (0, uuid_1.v4)(),
            name,
            description,
            tools: this.availableTools.map(tool => (Object.assign({}, tool))),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this.settings.configurations.push(config);
        this.settings.currentConfigId = config.id;
        this.saveSettings();
        return config;
    }
    updateConfiguration(configId, updates) {
        const configIndex = this.settings.configurations.findIndex(config => config.id === configId);
        if (configIndex === -1) {
            throw new Error('Configuration not found');
        }
        const config = this.settings.configurations[configIndex];
        const updatedConfig = Object.assign(Object.assign(Object.assign({}, config), updates), { updatedAt: new Date().toISOString() });
        this.settings.configurations[configIndex] = updatedConfig;
        this.saveSettings();
        return updatedConfig;
    }
    deleteConfiguration(configId) {
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
    setCurrentConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration not found');
        }
        this.settings.currentConfigId = configId;
        this.saveSettings();
    }
    updateToolStatus(configId, category, toolName, enabled) {
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
    updateToolStatusBatch(configId, updates) {
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
    exportConfiguration(configId) {
        const config = this.settings.configurations.find(config => config.id === configId);
        if (!config) {
            throw new Error('Configuration not found');
        }
        return this.exportToolConfiguration(config);
    }
    importConfiguration(configJson) {
        const config = this.importToolConfiguration(configJson);
        // Generate new ID and timestamps
        config.id = (0, uuid_1.v4)();
        config.createdAt = new Date().toISOString();
        config.updatedAt = new Date().toISOString();
        if (this.settings.configurations.length >= this.settings.maxConfigSlots) {
            throw new Error(`Maximum configuration slots reached (${this.settings.maxConfigSlots})`);
        }
        this.settings.configurations.push(config);
        this.saveSettings();
        return config;
    }
    getEnabledTools() {
        const currentConfig = this.getCurrentConfiguration();
        if (!currentConfig) {
            return this.availableTools.filter(tool => tool.enabled);
        }
        return currentConfig.tools.filter(tool => tool.enabled);
    }
    getToolManagerState() {
        const currentConfig = this.getCurrentConfiguration();
        return {
            success: true,
            availableTools: currentConfig ? currentConfig.tools : this.getAvailableTools(),
            selectedConfigId: this.settings.currentConfigId,
            configurations: this.getConfigurations(),
            maxConfigSlots: this.settings.maxConfigSlots
        };
    }
    saveSettings() {
        console.log(`Backend: Saving settings, current configs count: ${this.settings.configurations.length}`);
        this.saveToolManagerSettings(this.settings);
        console.log(`Backend: Settings saved to file`);
    }
}
exports.ToolManager = ToolManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbC1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3Rvb2wtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBb0M7QUFFcEMsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLFdBQVc7SUFJcEI7UUFGUSxtQkFBYyxHQUFpQixFQUFFLENBQUM7UUFHdEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUMvQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUVoQyxpRUFBaUU7UUFDakUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwRUFBMEUsQ0FBQyxDQUFDO1lBQ3hGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsRUFBRSxrREFBa0QsQ0FBQyxDQUFDO1FBQzFHLENBQUM7SUFDTCxDQUFDO0lBRU8sMEJBQTBCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUMzRSxDQUFDO0lBRU8saUJBQWlCO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUNwRSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzlCLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNMLENBQUM7SUFFTyx1QkFBdUI7UUFDM0IsTUFBTSw2QkFBNkIsR0FBd0I7WUFDdkQsY0FBYyxFQUFFLEVBQUU7WUFDbEIsZUFBZSxFQUFFLEVBQUU7WUFDbkIsY0FBYyxFQUFFLENBQUM7U0FDcEIsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO1lBQ3ZELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUM5QixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEQsdUNBQVksNkJBQTZCLEdBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRztZQUN4RSxDQUFDO1FBQ0wsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDVCxPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFDRCxPQUFPLDZCQUE2QixDQUFDO0lBQ3pDLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxRQUE2QjtRQUN6RCxJQUFJLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUN2RCxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNULE9BQU8sQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLENBQUM7UUFDWixDQUFDO0lBQ0wsQ0FBQztJQUVPLHVCQUF1QixDQUFDLE1BQXlCO1FBQ3JELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxVQUFrQjtRQUM5QyxJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3RDLGdDQUFnQztZQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxNQUFNLElBQUksS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUM7WUFDcEQsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2xCLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1QsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNMLENBQUM7SUFFTyx3QkFBd0I7UUFDNUIsNkNBQTZDO1FBQzdDLElBQUksQ0FBQztZQUNELDBCQUEwQjtZQUMxQixNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDOUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUNsRCxNQUFNLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDcEQsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNoRCxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUM1RCxNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbEQsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ2pFLE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQztZQUN6RCxNQUFNLEVBQUUsbUJBQW1CLEVBQUUsR0FBRyxPQUFPLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUNuRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsR0FBRyxPQUFPLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUNqRSxNQUFNLEVBQUUsZUFBZSxFQUFFLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFFMUQsNEJBQTRCO1lBQzVCLE1BQU0sS0FBSyxHQUFHO2dCQUNWLEtBQUssRUFBRSxJQUFJLFVBQVUsRUFBRTtnQkFDdkIsSUFBSSxFQUFFLElBQUksU0FBUyxFQUFFO2dCQUNyQixTQUFTLEVBQUUsSUFBSSxjQUFjLEVBQUU7Z0JBQy9CLE1BQU0sRUFBRSxJQUFJLFdBQVcsRUFBRTtnQkFDekIsT0FBTyxFQUFFLElBQUksWUFBWSxFQUFFO2dCQUMzQixLQUFLLEVBQUUsSUFBSSxVQUFVLEVBQUU7Z0JBQ3ZCLFdBQVcsRUFBRSxJQUFJLGdCQUFnQixFQUFFO2dCQUNuQyxNQUFNLEVBQUUsSUFBSSxXQUFXLEVBQUU7Z0JBQ3pCLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRTtnQkFDL0IsYUFBYSxFQUFFLElBQUksa0JBQWtCLEVBQUU7Z0JBQ3ZDLFNBQVMsRUFBRSxJQUFJLGNBQWMsRUFBRTtnQkFDL0IsY0FBYyxFQUFFLElBQUksbUJBQW1CLEVBQUU7Z0JBQ3pDLGFBQWEsRUFBRSxJQUFJLGtCQUFrQixFQUFFO2dCQUN2QyxVQUFVLEVBQUUsSUFBSSxlQUFlLEVBQUU7YUFDcEMsQ0FBQztZQUVGLHFDQUFxQztZQUNyQyxJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUN6QixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN0RCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzNDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRTtvQkFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7d0JBQ3JCLFFBQVEsRUFBRSxRQUFRO3dCQUNsQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7d0JBQ2YsT0FBTyxFQUFFLElBQUksRUFBRSxxQkFBcUI7d0JBQ3BDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztxQkFDaEMsQ0FBQyxDQUFDO2dCQUNQLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pHLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQywyREFBMkQsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRix1REFBdUQ7WUFDdkQsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7UUFDbEMsQ0FBQztJQUNMLENBQUM7SUFFTyxzQkFBc0I7UUFDMUIsZ0NBQWdDO1FBQ2hDLE1BQU0sY0FBYyxHQUFHO1lBQ25CLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRTtvQkFDN0MsRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsV0FBVyxFQUFFLHdCQUF3QixFQUFFO29CQUN0RSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUU7b0JBQ2pFLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRTtvQkFDM0QsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUU7b0JBQ2hELEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFO2lCQUNuRCxFQUFDO1lBQ0YsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFO29CQUMzQyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRTtvQkFDckQsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFO29CQUM1RCxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRTtvQkFDbEQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUU7b0JBQ2xELEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRTtvQkFDN0QsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUU7aUJBQ3hELEVBQUM7WUFDRixFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRTtvQkFDckQsRUFBRSxJQUFJLEVBQUUsb0JBQW9CLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFO29CQUNwRSxFQUFFLElBQUksRUFBRSx5QkFBeUIsRUFBRSxXQUFXLEVBQUUsNEJBQTRCLEVBQUU7b0JBQzlFLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFLFdBQVcsRUFBRSx3QkFBd0IsRUFBRTtvQkFDdkUsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFO2lCQUNsRSxFQUFDO1lBQ0YsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO29CQUMvQyxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRSxXQUFXLEVBQUUseUJBQXlCLEVBQUU7b0JBQ3hFLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRTtvQkFDaEUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTtvQkFDekQsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUU7aUJBQ3JELEVBQUM7WUFDRixFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUU7b0JBQ2pELEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxrQkFBa0IsRUFBRTtvQkFDM0QsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRTtvQkFDdkQsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUU7b0JBQ3BELEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFO2lCQUN2RCxFQUFDO1lBQ0YsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFO29CQUM3QyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUU7b0JBQzNELEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtvQkFDckUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRTtvQkFDeEQsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRTtpQkFDMUQsRUFBQztZQUNGLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxFQUFFO29CQUN6RCxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUU7b0JBQzFELEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTtvQkFDMUQsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFO2lCQUNqRSxFQUFDO1lBQ0YsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO29CQUMvQyxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUU7b0JBQzdELEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtvQkFDckUsRUFBRSxJQUFJLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTtpQkFDNUQsRUFBQztZQUNGLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFO29CQUNyRCxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUU7b0JBQzlELEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtpQkFDeEUsRUFBQztZQUNGLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsS0FBSyxFQUFFO29CQUM5RCxFQUFFLElBQUksRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFO29CQUN4RCxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRTtvQkFDdEQsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFO2lCQUM3RCxFQUFDO1lBQ0YsRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxrQkFBa0IsRUFBRSxLQUFLLEVBQUU7b0JBQ3RELEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxtQkFBbUIsRUFBRTtvQkFDN0QsRUFBRSxJQUFJLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFO29CQUNqRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRTtpQkFDeEQsRUFBQztZQUNGLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSx1QkFBdUIsRUFBRSxLQUFLLEVBQUU7b0JBQ2hFLEVBQUUsSUFBSSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxxQkFBcUIsRUFBRTtvQkFDakUsRUFBRSxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsV0FBVyxFQUFFLHdCQUF3QixFQUFFO29CQUN2RSxFQUFFLElBQUksRUFBRSxvQkFBb0IsRUFBRSxXQUFXLEVBQUUsMEJBQTBCLEVBQUU7aUJBQzFFLEVBQUM7WUFDRixFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLHNCQUFzQixFQUFFLEtBQUssRUFBRTtvQkFDOUQsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUU7b0JBQ3BELEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFO29CQUNwRCxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRTtpQkFDekQsRUFBQztZQUNGLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFO29CQUN2RCxFQUFFLElBQUksRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUU7b0JBQzVELEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTtvQkFDMUQsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFO2lCQUM3RCxFQUFDO1NBQ0wsQ0FBQztRQUVGLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLGNBQWMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDOUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO29CQUNyQixRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVE7b0JBQzNCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixPQUFPLEVBQUUsSUFBSSxFQUFFLHFCQUFxQjtvQkFDcEMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2lCQUNoQyxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLGdCQUFnQixDQUFDLENBQUM7SUFDekYsQ0FBQztJQUVNLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVNLGlCQUFpQjtRQUNwQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFTSx1QkFBdUI7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDakMsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxJQUFJLElBQUksQ0FBQztJQUM1RyxDQUFDO0lBRU0sbUJBQW1CLENBQUMsSUFBWSxFQUFFLFdBQW9CO1FBQ3pELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEUsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDO1FBQzdGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBc0I7WUFDOUIsRUFBRSxFQUFFLElBQUEsU0FBTSxHQUFFO1lBQ1osSUFBSTtZQUNKLFdBQVc7WUFDWCxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxtQkFBTSxJQUFJLEVBQUcsQ0FBQztZQUNyRCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDbkMsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1NBQ3RDLENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUMxQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFcEIsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFFBQWdCLEVBQUUsT0FBbUM7UUFDNUUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUM3RixJQUFJLFdBQVcsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDekQsTUFBTSxhQUFhLGlEQUNaLE1BQU0sR0FDTixPQUFPLEtBQ1YsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQ3RDLENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsR0FBRyxhQUFhLENBQUM7UUFDMUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXBCLE9BQU8sYUFBYSxDQUFDO0lBQ3pCLENBQUM7SUFFTSxtQkFBbUIsQ0FBQyxRQUFnQjtRQUN2QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBQzdGLElBQUksV0FBVyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBELHlFQUF5RTtRQUN6RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUNuRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDcEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVNLHVCQUF1QixDQUFDLFFBQWdCO1FBQzNDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUM7UUFDekMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLFFBQWdCLEVBQUUsUUFBZ0IsRUFBRSxPQUFnQjtRQUMxRixPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxRQUFRLGVBQWUsUUFBUSxlQUFlLFFBQVEsY0FBYyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBRXhJLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNoRSxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRXJELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsQ0FBQztRQUNwRixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDUixPQUFPLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxRQUFRLFdBQVcsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUNwRixNQUFNLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksQ0FBQyxJQUFJLHNCQUFzQixJQUFJLENBQUMsT0FBTyxrQkFBa0IsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUU1RyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixNQUFNLENBQUMsU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDeEQsQ0FBQztJQUVNLHFCQUFxQixDQUFDLFFBQWdCLEVBQUUsT0FBK0Q7UUFDMUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3REFBd0QsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNoRixPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzdGLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFekYsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDVixPQUFPLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixNQUFNLENBQUMsSUFBSSxjQUFjLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQyxDQUFDO1FBRXZGLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDckIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUYsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDbEMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVNLG1CQUFtQixDQUFDLFFBQWdCO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQy9DLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRU0sbUJBQW1CLENBQUMsVUFBa0I7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhELGlDQUFpQztRQUNqQyxNQUFNLENBQUMsRUFBRSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDckIsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUU1QyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RFLE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQztRQUM3RixDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUVwQixPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU0sZUFBZTtRQUNsQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUNyRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDakIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQ0QsT0FBTyxhQUFhLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBRU0sbUJBQW1CO1FBQ3RCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ3JELE9BQU87WUFDSCxPQUFPLEVBQUUsSUFBSTtZQUNiLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUM5RSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWU7WUFDL0MsY0FBYyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsRUFBRTtZQUN4QyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjO1NBQy9DLENBQUM7SUFDTixDQUFDO0lBRU8sWUFBWTtRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLG9EQUFvRCxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO0lBQ25ELENBQUM7Q0FDSjtBQW5hRCxrQ0FtYUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcbmltcG9ydCB7IFRvb2xDb25maWcsIFRvb2xDb25maWd1cmF0aW9uLCBUb29sTWFuYWdlclNldHRpbmdzLCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBjbGFzcyBUb29sTWFuYWdlciB7XG4gICAgcHJpdmF0ZSBzZXR0aW5nczogVG9vbE1hbmFnZXJTZXR0aW5ncztcbiAgICBwcml2YXRlIGF2YWlsYWJsZVRvb2xzOiBUb29sQ29uZmlnW10gPSBbXTtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gdGhpcy5yZWFkVG9vbE1hbmFnZXJTZXR0aW5ncygpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVBdmFpbGFibGVUb29scygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgbm8gY29uZmlndXJhdGlvbnMgZXhpc3QsIGF1dG9tYXRpY2FsbHkgY3JlYXRlIGEgZGVmYXVsdCBvbmVcbiAgICAgICAgaWYgKHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW1Rvb2xNYW5hZ2VyXSBObyBjb25maWd1cmF0aW9ucyBmb3VuZCwgY3JlYXRpbmcgZGVmYXVsdCBjb25maWd1cmF0aW9uLi4uJyk7XG4gICAgICAgICAgICB0aGlzLmNyZWF0ZUNvbmZpZ3VyYXRpb24oJ0RlZmF1bHQgQ29uZmlndXJhdGlvbicsICdBdXRvbWF0aWNhbGx5IGNyZWF0ZWQgZGVmYXVsdCB0b29sIGNvbmZpZ3VyYXRpb24nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0VG9vbE1hbmFnZXJTZXR0aW5nc1BhdGgoKTogc3RyaW5nIHtcbiAgICAgICAgcmV0dXJuIHBhdGguam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnc2V0dGluZ3MnLCAndG9vbC1tYW5hZ2VyLmpzb24nKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGVuc3VyZVNldHRpbmdzRGlyKCk6IHZvaWQge1xuICAgICAgICBjb25zdCBzZXR0aW5nc0RpciA9IHBhdGguZGlybmFtZSh0aGlzLmdldFRvb2xNYW5hZ2VyU2V0dGluZ3NQYXRoKCkpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2V0dGluZ3NEaXIpKSB7XG4gICAgICAgICAgICBmcy5ta2RpclN5bmMoc2V0dGluZ3NEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZWFkVG9vbE1hbmFnZXJTZXR0aW5ncygpOiBUb29sTWFuYWdlclNldHRpbmdzIHtcbiAgICAgICAgY29uc3QgREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1M6IFRvb2xNYW5hZ2VyU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBjb25maWd1cmF0aW9uczogW10sXG4gICAgICAgICAgICBjdXJyZW50Q29uZmlnSWQ6ICcnLFxuICAgICAgICAgICAgbWF4Q29uZmlnU2xvdHM6IDVcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5lbnN1cmVTZXR0aW5nc0RpcigpO1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gdGhpcy5nZXRUb29sTWFuYWdlclNldHRpbmdzUGF0aCgpO1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoc2V0dGluZ3NGaWxlKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoc2V0dGluZ3NGaWxlLCAndXRmOCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IC4uLkRFRkFVTFRfVE9PTF9NQU5BR0VSX1NFVFRJTkdTLCAuLi5KU09OLnBhcnNlKGNvbnRlbnQpIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIHRvb2wgbWFuYWdlciBzZXR0aW5nczonLCBlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gREVGQVVMVF9UT09MX01BTkFHRVJfU0VUVElOR1M7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBzYXZlVG9vbE1hbmFnZXJTZXR0aW5ncyhzZXR0aW5nczogVG9vbE1hbmFnZXJTZXR0aW5ncyk6IHZvaWQge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5lbnN1cmVTZXR0aW5nc0RpcigpO1xuICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3NGaWxlID0gdGhpcy5nZXRUb29sTWFuYWdlclNldHRpbmdzUGF0aCgpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhzZXR0aW5nc0ZpbGUsIEpTT04uc3RyaW5naWZ5KHNldHRpbmdzLCBudWxsLCAyKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIHRvb2wgbWFuYWdlciBzZXR0aW5nczonLCBlKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGV4cG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZzogVG9vbENvbmZpZ3VyYXRpb24pOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGltcG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0pzb246IHN0cmluZyk6IFRvb2xDb25maWd1cmF0aW9uIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoY29uZmlnSnNvbik7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjb25maWd1cmF0aW9uIGZvcm1hdFxuICAgICAgICAgICAgaWYgKCFjb25maWcuaWQgfHwgIWNvbmZpZy5uYW1lIHx8ICFBcnJheS5pc0FycmF5KGNvbmZpZy50b29scykpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbiBmb3JtYXQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBjb25maWc7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSB0b29sIGNvbmZpZ3VyYXRpb246JywgZSk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgSlNPTiBmb3JtYXQgb3IgY29uZmlndXJhdGlvbiBzdHJ1Y3R1cmUnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZUF2YWlsYWJsZVRvb2xzKCk6IHZvaWQge1xuICAgICAgICAvLyBHZXQgdGhlIHJlYWwgdG9vbCBsaXN0IGZyb20gdGhlIE1DUCBzZXJ2ZXJcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEltcG9ydCBhbGwgdG9vbCBjbGFzc2VzXG4gICAgICAgICAgICBjb25zdCB7IFNjZW5lVG9vbHMgfSA9IHJlcXVpcmUoJy4vc2NlbmUtdG9vbHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgTm9kZVRvb2xzIH0gPSByZXF1aXJlKCcuL25vZGUtdG9vbHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgQ29tcG9uZW50VG9vbHMgfSA9IHJlcXVpcmUoJy4vY29tcG9uZW50LXRvb2xzJyk7XG4gICAgICAgICAgICBjb25zdCB7IFByZWZhYlRvb2xzIH0gPSByZXF1aXJlKCcuL3ByZWZhYi10b29scycpO1xuICAgICAgICAgICAgY29uc3QgeyBQcm9qZWN0VG9vbHMgfSA9IHJlcXVpcmUoJy4vcHJvamVjdC10b29scycpO1xuICAgICAgICAgICAgY29uc3QgeyBEZWJ1Z1Rvb2xzIH0gPSByZXF1aXJlKCcuL2RlYnVnLXRvb2xzJyk7XG4gICAgICAgICAgICBjb25zdCB7IFByZWZlcmVuY2VzVG9vbHMgfSA9IHJlcXVpcmUoJy4vcHJlZmVyZW5jZXMtdG9vbHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgU2VydmVyVG9vbHMgfSA9IHJlcXVpcmUoJy4vc2VydmVyLXRvb2xzJyk7XG4gICAgICAgICAgICBjb25zdCB7IEJyb2FkY2FzdFRvb2xzIH0gPSByZXF1aXJlKCcuL2Jyb2FkY2FzdC10b29scycpO1xuICAgICAgICAgICAgY29uc3QgeyBTY2VuZUFkdmFuY2VkVG9vbHMgfSA9IHJlcXVpcmUoJy4vc2NlbmUtYWR2YW5jZWQtdG9vbHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgU2NlbmVWaWV3VG9vbHMgfSA9IHJlcXVpcmUoJy4vc2NlbmUtdmlldy10b29scycpO1xuICAgICAgICAgICAgY29uc3QgeyBSZWZlcmVuY2VJbWFnZVRvb2xzIH0gPSByZXF1aXJlKCcuL3JlZmVyZW5jZS1pbWFnZS10b29scycpO1xuICAgICAgICAgICAgY29uc3QgeyBBc3NldEFkdmFuY2VkVG9vbHMgfSA9IHJlcXVpcmUoJy4vYXNzZXQtYWR2YW5jZWQtdG9vbHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgVmFsaWRhdGlvblRvb2xzIH0gPSByZXF1aXJlKCcuL3ZhbGlkYXRpb24tdG9vbHMnKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sIGluc3RhbmNlc1xuICAgICAgICAgICAgY29uc3QgdG9vbHMgPSB7XG4gICAgICAgICAgICAgICAgc2NlbmU6IG5ldyBTY2VuZVRvb2xzKCksXG4gICAgICAgICAgICAgICAgbm9kZTogbmV3IE5vZGVUb29scygpLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogbmV3IENvbXBvbmVudFRvb2xzKCksXG4gICAgICAgICAgICAgICAgcHJlZmFiOiBuZXcgUHJlZmFiVG9vbHMoKSxcbiAgICAgICAgICAgICAgICBwcm9qZWN0OiBuZXcgUHJvamVjdFRvb2xzKCksXG4gICAgICAgICAgICAgICAgZGVidWc6IG5ldyBEZWJ1Z1Rvb2xzKCksXG4gICAgICAgICAgICAgICAgcHJlZmVyZW5jZXM6IG5ldyBQcmVmZXJlbmNlc1Rvb2xzKCksXG4gICAgICAgICAgICAgICAgc2VydmVyOiBuZXcgU2VydmVyVG9vbHMoKSxcbiAgICAgICAgICAgICAgICBicm9hZGNhc3Q6IG5ldyBCcm9hZGNhc3RUb29scygpLFxuICAgICAgICAgICAgICAgIHNjZW5lQWR2YW5jZWQ6IG5ldyBTY2VuZUFkdmFuY2VkVG9vbHMoKSxcbiAgICAgICAgICAgICAgICBzY2VuZVZpZXc6IG5ldyBTY2VuZVZpZXdUb29scygpLFxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZUltYWdlOiBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpLFxuICAgICAgICAgICAgICAgIGFzc2V0QWR2YW5jZWQ6IG5ldyBBc3NldEFkdmFuY2VkVG9vbHMoKSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBuZXcgVmFsaWRhdGlvblRvb2xzKClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEdldCB0b29sIGxpc3QgZnJvbSBlYWNoIHRvb2wgY2xhc3NcbiAgICAgICAgICAgIHRoaXMuYXZhaWxhYmxlVG9vbHMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCB0b29sU2V0XSBvZiBPYmplY3QuZW50cmllcyh0b29scykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sRGVmaW5pdGlvbnMgPSB0b29sU2V0LmdldFRvb2xzKCk7XG4gICAgICAgICAgICAgICAgdG9vbERlZmluaXRpb25zLmZvckVhY2goKHRvb2w6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmF2YWlsYWJsZVRvb2xzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8gRW5hYmxlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtUb29sTWFuYWdlcl0gSW5pdGlhbGl6ZWQgJHt0aGlzLmF2YWlsYWJsZVRvb2xzLmxlbmd0aH0gdG9vbHMgZnJvbSBNQ1Agc2VydmVyYCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVG9vbE1hbmFnZXJdIEZhaWxlZCB0byBpbml0aWFsaXplIHRvb2xzIGZyb20gTUNQIHNlcnZlcjonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBJZiBmZXRjaGluZyBmYWlscywgdXNlIGRlZmF1bHQgdG9vbCBsaXN0IGFzIGZhbGxiYWNrXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEZWZhdWx0VG9vbHMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZURlZmF1bHRUb29scygpOiB2b2lkIHtcbiAgICAgICAgLy8gRGVmYXVsdCB0b29sIGxpc3QgYXMgZmFsbGJhY2tcbiAgICAgICAgY29uc3QgdG9vbENhdGVnb3JpZXMgPSBbXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2NlbmUnLCBuYW1lOiAnU2NlbmUgVG9vbHMnLCB0b29sczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEN1cnJlbnRTY2VuZUluZm8nLCBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IHNjZW5lIGluZm8nIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0U2NlbmVIaWVyYXJjaHknLCBkZXNjcmlwdGlvbjogJ0dldCBzY2VuZSBoaWVyYXJjaHknIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlTmV3U2NlbmUnLCBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBuZXcgc2NlbmUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2F2ZVNjZW5lJywgZGVzY3JpcHRpb246ICdTYXZlIHNjZW5lJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2xvYWRTY2VuZScsIGRlc2NyaXB0aW9uOiAnTG9hZCBzY2VuZScgfVxuICAgICAgICAgICAgXX0sXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnbm9kZScsIG5hbWU6ICdOb2RlIFRvb2xzJywgdG9vbHM6IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRBbGxOb2RlcycsIGRlc2NyaXB0aW9uOiAnR2V0IGFsbCBub2RlcycgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdmaW5kTm9kZUJ5TmFtZScsIGRlc2NyaXB0aW9uOiAnRmluZCBub2RlIGJ5IG5hbWUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlTm9kZScsIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIG5vZGUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZGVsZXRlTm9kZScsIGRlc2NyaXB0aW9uOiAnRGVsZXRlIG5vZGUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2V0Tm9kZVByb3BlcnR5JywgZGVzY3JpcHRpb246ICdTZXQgbm9kZSBwcm9wZXJ0eScgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXROb2RlSW5mbycsIGRlc2NyaXB0aW9uOiAnR2V0IG5vZGUgaW5mbycgfVxuICAgICAgICAgICAgXX0sXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnY29tcG9uZW50JywgbmFtZTogJ0NvbXBvbmVudCBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYWRkQ29tcG9uZW50VG9Ob2RlJywgZGVzY3JpcHRpb246ICdBZGQgY29tcG9uZW50IHRvIG5vZGUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLCBkZXNjcmlwdGlvbjogJ1JlbW92ZSBjb21wb25lbnQgZnJvbSBub2RlJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NldENvbXBvbmVudFByb3BlcnR5JywgZGVzY3JpcHRpb246ICdTZXQgY29tcG9uZW50IHByb3BlcnR5JyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldENvbXBvbmVudEluZm8nLCBkZXNjcmlwdGlvbjogJ0dldCBjb21wb25lbnQgaW5mbycgfVxuICAgICAgICAgICAgXX0sXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAncHJlZmFiJywgbmFtZTogJ1ByZWZhYiBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlUHJlZmFiRnJvbU5vZGUnLCBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBwcmVmYWIgZnJvbSBub2RlJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2luc3RhbnRpYXRlUHJlZmFiJywgZGVzY3JpcHRpb246ICdJbnN0YW50aWF0ZSBwcmVmYWInIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UHJlZmFiSW5mbycsIGRlc2NyaXB0aW9uOiAnR2V0IHByZWZhYiBpbmZvJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NhdmVQcmVmYWInLCBkZXNjcmlwdGlvbjogJ1NhdmUgcHJlZmFiJyB9XG4gICAgICAgICAgICBdfSxcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdwcm9qZWN0JywgbmFtZTogJ1Byb2plY3QgVG9vbHMnLCB0b29sczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFByb2plY3RJbmZvJywgZGVzY3JpcHRpb246ICdHZXQgcHJvamVjdCBpbmZvJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEFzc2V0TGlzdCcsIGRlc2NyaXB0aW9uOiAnR2V0IGFzc2V0IGxpc3QnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnY3JlYXRlQXNzZXQnLCBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhc3NldCcgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdkZWxldGVBc3NldCcsIGRlc2NyaXB0aW9uOiAnRGVsZXRlIGFzc2V0JyB9XG4gICAgICAgICAgICBdfSxcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdkZWJ1ZycsIG5hbWU6ICdEZWJ1ZyBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Q29uc29sZUxvZ3MnLCBkZXNjcmlwdGlvbjogJ0dldCBjb25zb2xlIGxvZ3MnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UGVyZm9ybWFuY2VTdGF0cycsIGRlc2NyaXB0aW9uOiAnR2V0IHBlcmZvcm1hbmNlIHN0YXRzJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ZhbGlkYXRlU2NlbmUnLCBkZXNjcmlwdGlvbjogJ1ZhbGlkYXRlIHNjZW5lJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldEVycm9yTG9ncycsIGRlc2NyaXB0aW9uOiAnR2V0IGVycm9yIGxvZ3MnIH1cbiAgICAgICAgICAgIF19LFxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ3ByZWZlcmVuY2VzJywgbmFtZTogJ1ByZWZlcmVuY2VzIFRvb2xzJywgdG9vbHM6IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZXRQcmVmZXJlbmNlcycsIGRlc2NyaXB0aW9uOiAnR2V0IHByZWZlcmVuY2VzJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3NldFByZWZlcmVuY2VzJywgZGVzY3JpcHRpb246ICdTZXQgcHJlZmVyZW5jZXMnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVzZXRQcmVmZXJlbmNlcycsIGRlc2NyaXB0aW9uOiAnUmVzZXQgcHJlZmVyZW5jZXMnIH1cbiAgICAgICAgICAgIF19LFxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ3NlcnZlcicsIG5hbWU6ICdTZXJ2ZXIgVG9vbHMnLCB0b29sczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFNlcnZlclN0YXR1cycsIGRlc2NyaXB0aW9uOiAnR2V0IHNlcnZlciBzdGF0dXMnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0Q29ubmVjdGVkQ2xpZW50cycsIGRlc2NyaXB0aW9uOiAnR2V0IGNvbm5lY3RlZCBjbGllbnRzJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFNlcnZlckxvZ3MnLCBkZXNjcmlwdGlvbjogJ0dldCBzZXJ2ZXIgbG9ncycgfVxuICAgICAgICAgICAgXX0sXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnYnJvYWRjYXN0JywgbmFtZTogJ0Jyb2FkY2FzdCBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYnJvYWRjYXN0TWVzc2FnZScsIGRlc2NyaXB0aW9uOiAnQnJvYWRjYXN0IG1lc3NhZ2UnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0QnJvYWRjYXN0SGlzdG9yeScsIGRlc2NyaXB0aW9uOiAnR2V0IGJyb2FkY2FzdCBoaXN0b3J5JyB9XG4gICAgICAgICAgICBdfSxcbiAgICAgICAgICAgIHsgY2F0ZWdvcnk6ICdzY2VuZUFkdmFuY2VkJywgbmFtZTogJ0FkdmFuY2VkIFNjZW5lIFRvb2xzJywgdG9vbHM6IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdvcHRpbWl6ZVNjZW5lJywgZGVzY3JpcHRpb246ICdPcHRpbWl6ZSBzY2VuZScgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdhbmFseXplU2NlbmUnLCBkZXNjcmlwdGlvbjogJ0FuYWx5emUgc2NlbmUnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYmF0Y2hPcGVyYXRpb24nLCBkZXNjcmlwdGlvbjogJ0JhdGNoIG9wZXJhdGlvbicgfVxuICAgICAgICAgICAgXX0sXG4gICAgICAgICAgICB7IGNhdGVnb3J5OiAnc2NlbmVWaWV3JywgbmFtZTogJ1NjZW5lIFZpZXcgVG9vbHMnLCB0b29sczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2dldFZpZXdwb3J0SW5mbycsIGRlc2NyaXB0aW9uOiAnR2V0IHZpZXdwb3J0IGluZm8nIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnc2V0Vmlld3BvcnRDYW1lcmEnLCBkZXNjcmlwdGlvbjogJ1NldCB2aWV3cG9ydCBjYW1lcmEnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZm9jdXNPbk5vZGUnLCBkZXNjcmlwdGlvbjogJ0ZvY3VzIG9uIG5vZGUnIH1cbiAgICAgICAgICAgIF19LFxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ3JlZmVyZW5jZUltYWdlJywgbmFtZTogJ1JlZmVyZW5jZSBJbWFnZSBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnYWRkUmVmZXJlbmNlSW1hZ2UnLCBkZXNjcmlwdGlvbjogJ0FkZCByZWZlcmVuY2UgaW1hZ2UnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAncmVtb3ZlUmVmZXJlbmNlSW1hZ2UnLCBkZXNjcmlwdGlvbjogJ1JlbW92ZSByZWZlcmVuY2UgaW1hZ2UnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2V0UmVmZXJlbmNlSW1hZ2VzJywgZGVzY3JpcHRpb246ICdHZXQgcmVmZXJlbmNlIGltYWdlIGxpc3QnIH1cbiAgICAgICAgICAgIF19LFxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ2Fzc2V0QWR2YW5jZWQnLCBuYW1lOiAnQWR2YW5jZWQgQXNzZXQgVG9vbHMnLCB0b29sczogW1xuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2ltcG9ydEFzc2V0JywgZGVzY3JpcHRpb246ICdJbXBvcnQgYXNzZXQnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXhwb3J0QXNzZXQnLCBkZXNjcmlwdGlvbjogJ0V4cG9ydCBhc3NldCcgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdwcm9jZXNzQXNzZXQnLCBkZXNjcmlwdGlvbjogJ1Byb2Nlc3MgYXNzZXQnIH1cbiAgICAgICAgICAgIF19LFxuICAgICAgICAgICAgeyBjYXRlZ29yeTogJ3ZhbGlkYXRpb24nLCBuYW1lOiAnVmFsaWRhdGlvbiBUb29scycsIHRvb2xzOiBbXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAndmFsaWRhdGVQcm9qZWN0JywgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBwcm9qZWN0JyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ZhbGlkYXRlQXNzZXRzJywgZGVzY3JpcHRpb246ICdWYWxpZGF0ZSBhc3NldHMnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZ2VuZXJhdGVSZXBvcnQnLCBkZXNjcmlwdGlvbjogJ0dlbmVyYXRlIHJlcG9ydCcgfVxuICAgICAgICAgICAgXX1cbiAgICAgICAgXTtcblxuICAgICAgICB0aGlzLmF2YWlsYWJsZVRvb2xzID0gW107XG4gICAgICAgIHRvb2xDYXRlZ29yaWVzLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY2F0ZWdvcnkudG9vbHMuZm9yRWFjaCh0b29sID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmF2YWlsYWJsZVRvb2xzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnkuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2wubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSwgLy8gRW5hYmxlZCBieSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coYFtUb29sTWFuYWdlcl0gSW5pdGlhbGl6ZWQgJHt0aGlzLmF2YWlsYWJsZVRvb2xzLmxlbmd0aH0gZGVmYXVsdCB0b29sc2ApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRBdmFpbGFibGVUb29scygpOiBUb29sQ29uZmlnW10ge1xuICAgICAgICByZXR1cm4gWy4uLnRoaXMuYXZhaWxhYmxlVG9vbHNdO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDb25maWd1cmF0aW9ucygpOiBUb29sQ29uZmlndXJhdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q3VycmVudENvbmZpZ3VyYXRpb24oKTogVG9vbENvbmZpZ3VyYXRpb24gfCBudWxsIHtcbiAgICAgICAgaWYgKCF0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSB0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCkgfHwgbnVsbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgY3JlYXRlQ29uZmlndXJhdGlvbihuYW1lOiBzdHJpbmcsIGRlc2NyaXB0aW9uPzogc3RyaW5nKTogVG9vbENvbmZpZ3VyYXRpb24ge1xuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5sZW5ndGggPj0gdGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90cykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXhpbXVtIGNvbmZpZ3VyYXRpb24gc2xvdHMgcmVhY2hlZCAoJHt0aGlzLnNldHRpbmdzLm1heENvbmZpZ1Nsb3RzfSlgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpZzogVG9vbENvbmZpZ3VyYXRpb24gPSB7XG4gICAgICAgICAgICBpZDogdXVpZHY0KCksXG4gICAgICAgICAgICBuYW1lLFxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXG4gICAgICAgICAgICB0b29sczogdGhpcy5hdmFpbGFibGVUb29scy5tYXAodG9vbCA9PiAoeyAuLi50b29sIH0pKSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLnB1c2goY29uZmlnKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQgPSBjb25maWcuaWQ7XG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XG5cbiAgICAgICAgcmV0dXJuIGNvbmZpZztcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nLCB1cGRhdGVzOiBQYXJ0aWFsPFRvb2xDb25maWd1cmF0aW9uPik6IFRvb2xDb25maWd1cmF0aW9uIHtcbiAgICAgICAgY29uc3QgY29uZmlnSW5kZXggPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmRJbmRleChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XG4gICAgICAgIGlmIChjb25maWdJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBub3QgZm91bmQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNbY29uZmlnSW5kZXhdO1xuICAgICAgICBjb25zdCB1cGRhdGVkQ29uZmlnOiBUb29sQ29uZmlndXJhdGlvbiA9IHtcbiAgICAgICAgICAgIC4uLmNvbmZpZyxcbiAgICAgICAgICAgIC4uLnVwZGF0ZXMsXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnNbY29uZmlnSW5kZXhdID0gdXBkYXRlZENvbmZpZztcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcblxuICAgICAgICByZXR1cm4gdXBkYXRlZENvbmZpZztcbiAgICB9XG5cbiAgICBwdWJsaWMgZGVsZXRlQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGNvbmZpZ0luZGV4ID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5maW5kSW5kZXgoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gY29uZmlnSWQpO1xuICAgICAgICBpZiAoY29uZmlnSW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gbm90IGZvdW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLnNwbGljZShjb25maWdJbmRleCwgMSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB0aGUgZGVsZXRlZCBjb25maWcgd2FzIHRoZSBjdXJyZW50IG9uZSwgY2xlYXIgdGhlIGN1cnJlbnQgY29uZmlnIElEXG4gICAgICAgIGlmICh0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCA9PT0gY29uZmlnSWQpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0dGluZ3MuY3VycmVudENvbmZpZ0lkID0gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5sZW5ndGggPiAwIFxuICAgICAgICAgICAgICAgID8gdGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9uc1swXS5pZCBcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0Q3VycmVudENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgICAgICBjb25zdCBjb25maWcgPSB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmZpbmQoY29uZmlnID0+IGNvbmZpZy5pZCA9PT0gY29uZmlnSWQpO1xuICAgICAgICBpZiAoIWNvbmZpZykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25maWd1cmF0aW9uIG5vdCBmb3VuZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZXR0aW5ncy5jdXJyZW50Q29uZmlnSWQgPSBjb25maWdJZDtcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlVG9vbFN0YXR1cyhjb25maWdJZDogc3RyaW5nLCBjYXRlZ29yeTogc3RyaW5nLCB0b29sTmFtZTogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKTogdm9pZCB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBVcGRhdGluZyB0b29sIHN0YXR1cyAtIGNvbmZpZ0lkOiAke2NvbmZpZ0lkfSwgY2F0ZWdvcnk6ICR7Y2F0ZWdvcnl9LCB0b29sTmFtZTogJHt0b29sTmFtZX0sIGVuYWJsZWQ6ICR7ZW5hYmxlZH1gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBDb25maWcgbm90IGZvdW5kIHdpdGggSUQ6ICR7Y29uZmlnSWR9YCk7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gbm90IGZvdW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogRm91bmQgY29uZmlnOiAke2NvbmZpZy5uYW1lfWApO1xuXG4gICAgICAgIGNvbnN0IHRvb2wgPSBjb25maWcudG9vbHMuZmluZCh0ID0+IHQuY2F0ZWdvcnkgPT09IGNhdGVnb3J5ICYmIHQubmFtZSA9PT0gdG9vbE5hbWUpO1xuICAgICAgICBpZiAoIXRvb2wpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEJhY2tlbmQ6IFRvb2wgbm90IGZvdW5kIC0gY2F0ZWdvcnk6ICR7Y2F0ZWdvcnl9LCBuYW1lOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb29sIG5vdCBmb3VuZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEZvdW5kIHRvb2w6ICR7dG9vbC5uYW1lfSwgY3VycmVudCBlbmFibGVkOiAke3Rvb2wuZW5hYmxlZH0sIG5ldyBlbmFibGVkOiAke2VuYWJsZWR9YCk7XG4gICAgICAgIFxuICAgICAgICB0b29sLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICBjb25maWcudXBkYXRlZEF0ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IFRvb2wgdXBkYXRlZCwgc2F2aW5nIHNldHRpbmdzLi4uYCk7XG4gICAgICAgIHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBTZXR0aW5ncyBzYXZlZCBzdWNjZXNzZnVsbHlgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlVG9vbFN0YXR1c0JhdGNoKGNvbmZpZ0lkOiBzdHJpbmcsIHVwZGF0ZXM6IHsgY2F0ZWdvcnk6IHN0cmluZzsgbmFtZTogc3RyaW5nOyBlbmFibGVkOiBib29sZWFuIH1bXSk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogdXBkYXRlVG9vbFN0YXR1c0JhdGNoIGNhbGxlZCB3aXRoIGNvbmZpZ0lkOiAke2NvbmZpZ0lkfWApO1xuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogQ3VycmVudCBjb25maWd1cmF0aW9ucyBjb3VudDogJHt0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLmxlbmd0aH1gKTtcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEN1cnJlbnQgY29uZmlnIElEczpgLCB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLm1hcChjID0+IGMuaWQpKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBDb25maWcgbm90IGZvdW5kIHdpdGggSUQ6ICR7Y29uZmlnSWR9YCk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBCYWNrZW5kOiBBdmFpbGFibGUgY29uZmlnIElEczpgLCB0aGlzLnNldHRpbmdzLmNvbmZpZ3VyYXRpb25zLm1hcChjID0+IGMuaWQpKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZmlndXJhdGlvbiBub3QgZm91bmQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBGb3VuZCBjb25maWc6ICR7Y29uZmlnLm5hbWV9LCB1cGRhdGluZyAke3VwZGF0ZXMubGVuZ3RofSB0b29sc2ApO1xuXG4gICAgICAgIHVwZGF0ZXMuZm9yRWFjaCh1cGRhdGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgdG9vbCA9IGNvbmZpZy50b29scy5maW5kKHQgPT4gdC5jYXRlZ29yeSA9PT0gdXBkYXRlLmNhdGVnb3J5ICYmIHQubmFtZSA9PT0gdXBkYXRlLm5hbWUpO1xuICAgICAgICAgICAgaWYgKHRvb2wpIHtcbiAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSB1cGRhdGUuZW5hYmxlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uZmlnLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgdGhpcy5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgY29uc29sZS5sb2coYEJhY2tlbmQ6IEJhdGNoIHVwZGF0ZSBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5YCk7XG4gICAgfVxuXG4gICAgcHVibGljIGV4cG9ydENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMuZmluZChjb25maWcgPT4gY29uZmlnLmlkID09PSBjb25maWdJZCk7XG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmZpZ3VyYXRpb24gbm90IGZvdW5kJyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5leHBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWcpO1xuICAgIH1cblxuICAgIHB1YmxpYyBpbXBvcnRDb25maWd1cmF0aW9uKGNvbmZpZ0pzb246IHN0cmluZyk6IFRvb2xDb25maWd1cmF0aW9uIHtcbiAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5pbXBvcnRUb29sQ29uZmlndXJhdGlvbihjb25maWdKc29uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyBJRCBhbmQgdGltZXN0YW1wc1xuICAgICAgICBjb25maWcuaWQgPSB1dWlkdjQoKTtcbiAgICAgICAgY29uZmlnLmNyZWF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICAgICAgY29uZmlnLnVwZGF0ZWRBdCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5sZW5ndGggPj0gdGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90cykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXhpbXVtIGNvbmZpZ3VyYXRpb24gc2xvdHMgcmVhY2hlZCAoJHt0aGlzLnNldHRpbmdzLm1heENvbmZpZ1Nsb3RzfSlgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2V0dGluZ3MuY29uZmlndXJhdGlvbnMucHVzaChjb25maWcpO1xuICAgICAgICB0aGlzLnNhdmVTZXR0aW5ncygpO1xuXG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgfVxuXG4gICAgcHVibGljIGdldEVuYWJsZWRUb29scygpOiBUb29sQ29uZmlnW10ge1xuICAgICAgICBjb25zdCBjdXJyZW50Q29uZmlnID0gdGhpcy5nZXRDdXJyZW50Q29uZmlndXJhdGlvbigpO1xuICAgICAgICBpZiAoIWN1cnJlbnRDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF2YWlsYWJsZVRvb2xzLmZpbHRlcih0b29sID0+IHRvb2wuZW5hYmxlZCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRDb25maWcudG9vbHMuZmlsdGVyKHRvb2wgPT4gdG9vbC5lbmFibGVkKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0VG9vbE1hbmFnZXJTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHRoaXMuZ2V0Q3VycmVudENvbmZpZ3VyYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICBhdmFpbGFibGVUb29sczogY3VycmVudENvbmZpZyA/IGN1cnJlbnRDb25maWcudG9vbHMgOiB0aGlzLmdldEF2YWlsYWJsZVRvb2xzKCksXG4gICAgICAgICAgICBzZWxlY3RlZENvbmZpZ0lkOiB0aGlzLnNldHRpbmdzLmN1cnJlbnRDb25maWdJZCxcbiAgICAgICAgICAgIGNvbmZpZ3VyYXRpb25zOiB0aGlzLmdldENvbmZpZ3VyYXRpb25zKCksXG4gICAgICAgICAgICBtYXhDb25maWdTbG90czogdGhpcy5zZXR0aW5ncy5tYXhDb25maWdTbG90c1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgc2F2ZVNldHRpbmdzKCk6IHZvaWQge1xuICAgICAgICBjb25zb2xlLmxvZyhgQmFja2VuZDogU2F2aW5nIHNldHRpbmdzLCBjdXJyZW50IGNvbmZpZ3MgY291bnQ6ICR7dGhpcy5zZXR0aW5ncy5jb25maWd1cmF0aW9ucy5sZW5ndGh9YCk7XG4gICAgICAgIHRoaXMuc2F2ZVRvb2xNYW5hZ2VyU2V0dGluZ3ModGhpcy5zZXR0aW5ncyk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kOiBTZXR0aW5ncyBzYXZlZCB0byBmaWxlYCk7XG4gICAgfVxufSBcbiJdfQ==