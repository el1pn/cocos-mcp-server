# Cocos Creator MCP Server Plugin

A comprehensive MCP (Model Context Protocol) server plugin for Cocos Creator 3.8+, enabling AI assistants to interact with the Cocos Creator editor through standardized protocols. One-click installation and use, eliminating all cumbersome environments and configurations. Claude clients Claude CLI and Cursor have been tested, and other editors are also perfectly supported in theory.

**🚀 Now provides 50 powerful integrated tools, achieving 99% editor control!**

## Tool System and Operation Codes

- All tools are named with "category_operation", parameters use unified Schema, support multiple operation code (action) switching, greatly improving flexibility and extensibility.
- 50 core tools cover scene, node, component, prefab, asset, project, debugging, preferences, server, message broadcasting and all other editor operations.
- Tool calling example:

```json
{
  "tool": "node_lifecycle",
  "arguments": {
    "action": "create",
    "name": "MyNode",
    "parentUuid": "parent-uuid",
    "nodeType": "2DNode"
  }
}
```

---

## Main Function Categories (Partial Examples)

- **scene_management**: Scene management (get/open/save/create/close scenes)
- **node_query / node_lifecycle / node_transform**: Node query, creation, deletion, property changes
- **component_manage / component_script / component_query**: Component add/remove, script mounting, component information
- **prefab_browse / prefab_lifecycle / prefab_instance**: Prefab browsing, creation, instantiation, synchronization
- **asset_manage / asset_analyze**: Asset import, deletion, dependency analysis
- **project_manage / project_build_system**: Project running, building, configuration information
- **debug_console / debug_logs**: Console and log management
- **preferences_manage**: Preferences settings
- **server_info**: Server information
- **broadcast_message**: Message broadcasting


## Quick Usage

**Claude CLI configuration:**

```
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp (use your configured port number)
```

**Claude client configuration:**

```
{

  "mcpServers": {

		"cocos-creator": {

 		"type": "http",

		"url": "http://127.0.0.1:3000/mcp"

		 }

	  }

}
```

**Cursor or VS class MCP configuration**

```
{

  "mcpServers": { 

   "cocos-creator": {
      "url": "http://localhost:3000/mcp"
   }
  }

}
```

## Features

### 🎯 Scene Operations (scene_*)
- **scene_management**: Scene management - Get current scene, open/save/create/close scenes, support scene list query
- **scene_hierarchy**: Scene hierarchy - Get complete scene structure, support component information inclusion
- **scene_execution_control**: Execution control - Execute component methods, scene scripts, prefab synchronization

### 🎮 Node Operations (node_*)
- **node_query**: Node query - Find nodes by name/pattern, get node information, detect 2D/3D types
- **node_lifecycle**: Node lifecycle - Create/delete nodes, support component pre-installation, prefab instantiation
- **node_transform**: Node transform - Modify node name, position, rotation, scale, visibility and other properties
- **node_hierarchy**: Node hierarchy - Move, copy, paste nodes, support hierarchical structure operations
- **node_clipboard**: Node clipboard - Copy/paste/cut node operations
- **node_property_management**: Property management - Reset node properties, component properties, transform properties

### 🔧 Component Operations (component_*)
- **component_manage**: Component management - Add/remove engine components (cc.Sprite, cc.Button, etc.)
- **component_script**: Script components - Mount/remove custom script components
- **component_query**: Component query - Get component list, detailed information, available component types
- **set_component_property**: Property setting - Set single or multiple component property values

### 📦 Prefab Operations (prefab_*)
- **prefab_browse**: Prefab browsing - List prefabs, view information, validate files
- **prefab_lifecycle**: Prefab lifecycle - Create prefabs from nodes, delete prefabs
- **prefab_instance**: Prefab instances - Instantiate to scene, unlink, apply changes, restore original
- **prefab_edit**: Prefab editing - Enter/exit edit mode, save prefabs, test changes

### 🚀 Project Control (project_*)
- **project_manage**: Project management - Run project, build project, get project information and settings
- **project_build_system**: Build system - Control build panel, check build status, preview server management

### 🔍 Debug Tools (debug_*)
- **debug_console**: Console management - Get/clear console logs, support filtering and limiting
- **debug_logs**: Log analysis - Read/search/analyze project log files, support pattern matching
- **debug_system**: System debugging - Get editor information, performance statistics, environment information

### 📁 Asset Management (asset_*)
- **asset_manage**: Asset management - Batch import/delete assets, save metadata, generate URLs
- **asset_analyze**: Asset analysis - Get dependency relationships, export asset manifests
- **asset_system**: Asset system - Refresh assets, query asset database status
- **asset_query**: Asset query - Query assets by type/folder, get detailed information
- **asset_operations**: Asset operations - Create/copy/move/delete/save/re-import assets

### ⚙️ Preferences (preferences_*)
- **preferences_manage**: Preferences management - Get/set editor preferences
- **preferences_global**: Global settings - Manage global configuration and system settings

### 🌐 Server and Broadcasting (server_* / broadcast_*)
- **server_info**: Server information - Get server status, project details, environment information
- **broadcast_message**: Message broadcasting - Listen and broadcast custom messages

### 🖼️ Reference Images (referenceImage_*)
- **reference_image_manage**: Reference image management - Add/delete/manage reference images in scene view
- **reference_image_view**: Reference image view - Control reference image display and editing

### 🎨 Scene View (sceneView_*)
- **scene_view_control**: Scene view control - Control Gizmo tools, coordinate systems, view modes
- **scene_view_tools**: Scene view tools - Manage various scene view tools and options

### ✅ Validation Tools (validation_*)
- **validation_scene**: Scene validation - Validate scene integrity, check missing assets
- **validation_asset**: Asset validation - Validate asset references, check asset integrity

### 🛠️ Tool Management
- **Tool Configuration System**: Selectively enable/disable tools, support multiple configurations
- **Configuration Persistence**: Automatically save and load tool configurations
- **Configuration Import/Export**: Support tool configuration import/export functionality
- **Real-time State Management**: Real-time tool state updates and synchronization

### 🚀 Core Advantages
- **Unified Operation Codes**: All tools adopt "category_operation" naming, unified parameter Schema
- **High Reusability**: 50 core tools cover 99% editor functionality
- **AI-Friendly**: Clear parameters, complete documentation, simple calling
- **Performance Optimization**: Reduce 50% token consumption, improve AI calling success rate
- **Complete Compatibility**: 100% aligned with Cocos Creator official API

## Installation

### 1. Copy Plugin Files

Copy the entire `cocos-mcp-server` folder to your Cocos Creator project's `extensions` directory, or you can directly import the project in the extension manager:

```
YourProject/
├── assets/
├── extensions/
│   └── cocos-mcp-server/          <- Place plugin here
│       ├── source/
│       ├── dist/
│       ├── package.json
│       └── ...
├── settings/
└── ...
```

### 2. Install Dependencies

```bash
cd extensions/cocos-mcp-server
npm install
```

### 3. Build the Plugin

```bash
npm run build
```

### 4. Enable Plugin

1. Restart Cocos Creator or refresh extensions
2. The plugin will appear in the Extension menu
3. Click `Extension > Cocos MCP Server` to open the control panel

## Usage

### Starting the Server

1. Open the MCP Server panel from `Extension > Cocos MCP Server`
2. Configure settings:
   - **Port**: HTTP server port (default: 3000)
   - **Auto Start**: Automatically start server when editor opens
   - **Debug Logging**: Enable detailed logging for development
   - **Max Connections**: Maximum concurrent connections allowed

3. Click "Start Server" to begin accepting connections

### Connecting AI Assistants

The server exposes an HTTP endpoint at `http://localhost:3000/mcp` (or your configured port).

AI assistants can connect using the MCP protocol and access all available tools.


## Development

### Project Structure
```
cocos-mcp-server/
├── source/                    # TypeScript source files
│   ├── main.ts               # Plugin entry point
│   ├── mcp-server.ts         # MCP server implementation
│   ├── settings.ts           # Settings management
│   ├── types/                # TypeScript type definitions
│   ├── tools/                # Tool implementations
│   │   ├── scene-tools.ts
│   │   ├── node-tools.ts
│   │   ├── component-tools.ts
│   │   ├── prefab-tools.ts
│   │   ├── project-tools.ts
│   │   ├── debug-tools.ts
│   │   ├── preferences-tools.ts
│   │   ├── server-tools.ts
│   │   ├── broadcast-tools.ts
│   │   ├── scene-advanced-tools.ts (integrated into node-tools.ts and scene-tools.ts)
│   │   ├── scene-view-tools.ts
│   │   ├── reference-image-tools.ts
│   │   └── asset-advanced-tools.ts
│   ├── panels/               # UI panel implementation
│   └── test/                 # Test files
├── dist/                     # Compiled JavaScript output
├── static/                   # Static assets (icons, etc.)
├── i18n/                     # Internationalization files
├── package.json              # Plugin configuration
└── tsconfig.json             # TypeScript configuration
```

### Building from Source

```bash
# Install dependencies
npm install

# Build for development with watch mode
npm run watch

# Build for production
npm run build
```

### Adding New Tools

1. Create a new tool class in `source/tools/`
2. Implement the `ToolExecutor` interface
3. Add tool to `mcp-server.ts` initialization
4. Tools are automatically exposed via MCP protocol

### TypeScript Support

The plugin is fully written in TypeScript with:
- Strict type checking enabled
- Comprehensive type definitions for all APIs
- IntelliSense support for development
- Automatic compilation to JavaScript

## Troubleshooting

### Common Issues

1. **Server won't start**: Check port availability and firewall settings
2. **Tools not working**: Ensure scene is loaded and UUIDs are valid
3. **Build errors**: Run `npm run build` to check for TypeScript errors
4. **Connection issues**: Verify HTTP URL and server status

### Debug Mode

Enable debug logging in the plugin panel for detailed operation logs.

## Requirements

- Cocos Creator 3.8.0 or later
- Node.js (bundled with Cocos Creator)
- TypeScript (installed as dev dependency)

## Acknowledgments

This project is forked from the original [cocos-mcp-server](https://github.com/DaxianLee/cocos-mcp-server) by **LiDaxian**.

## License

This plugin is for Cocos Creator project use. The source code is provided for learning, communication, and secondary development. Any code of this project or its derivative code cannot be used for commercial purposes or resale.
