# Cocos Creator MCP Server

MCP server plugin for Cocos Creator 3.8+. Lets AI assistants (Claude, Cursor, VS Code) control the editor via 41 action-based tools.

## Installation

```bash
# Copy to your project's extensions folder
cp -r cocos-mcp-server YourProject/extensions/

# Install & build
cd YourProject/extensions/cocos-mcp-server
npm install && npm run build
```

Restart Cocos Creator, then open `Extension > Cocos MCP Server` and click **Start Server**.

## Connect AI Client

### HTTP (recommended)

**Claude Code CLI:**
```
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**Other clients** (Cursor, VS Code, Trae, Windsurf, Codex, ...):
```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Stdio (via proxy)

Only use this if your client does not support HTTP transport:

```json
{
  "mcpServers": {
    "cocos-creator": {
      "command": "node",
      "args": ["/path/to/cocos-mcp-server/dist/mcp-proxy.js", "3000"]
    }
  }
}
```

Port (default `3000`) must match the plugin panel setting. Also configurable via `MCP_PORT` env var.

## Tools Overview

All tools use an `action` parameter to select the operation. Example:

```json
{
  "tool": "node_lifecycle",
  "arguments": { "action": "create", "name": "Player", "nodeType": "2DNode" }
}
```

| Category | Tool | Key Actions |
|----------|------|-------------|
| Scene | `scene_management` | `get_current`, `open`, `save`, `create`, `get_hierarchy` |
| Node | `node_lifecycle` | `create`, `delete`, `duplicate`, `move` |
| | `node_query` | `get_info`, `find_by_name`, `find_by_pattern`, `get_all` |
| | `node_transform` | `set_transform`, `set_property` |
| Component | `component_manage` | `add`, `remove`, `attach_script` |
| | `set_component_property` | set property values on components |
| Prefab | `prefab_lifecycle` | `create`, `instantiate`, `update` |
| Asset | `asset_query` | `get_info`, `get_assets`, `find_by_name` |
| | `asset_crud` | `create`, `copy`, `move`, `delete`, `save` |
| Project | `project_build` | `run`, `build`, `get_build_settings` |
| Material | `material_manage` | `create_material`, `create_shader`, `get_info`, `update_texture_meta` |
| Animation | `manage_animation` | `get_clips`, `play`, `stop`, `pause` |
| Search | `search_project` | `content`, `file_name`, `dir_name` |
| Editor | `editor_actions` | `execute_menu`, `apply_text_edits`, `find_references` |
| Batch | `batch_execute` | run multiple tools sequentially in one call |
| Debug | `debug_console` | `get_logs`, `clear`, `execute_script` |

Full tool inventory with all actions: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## MCP Resources

Read-only snapshots available via `resources/read`:

| URI | Description |
|-----|-------------|
| `cocos://hierarchy` | Current scene node tree |
| `cocos://selection` | Selected nodes and assets |
| `cocos://logs/latest` | Recent server log entries |

## When to Use MCP

MCP adds the most value where manual work is repetitive or time-consuming. Use the right tool for each job.

### High-value use cases

**Understand the scene without clicking through nodes:**
```
"Find all nodes with cc.Button but no cc.AudioSource"
"Which nodes reference assets from the tournament/ folder?"
"List all components on node PopupReward"
```

**Create repeated structures:**
```
"Create 8 identical slot items with Sprite, Label, and Button"
"Scaffold a popup prefab with standard background, title, close button"
```

**Write script + attach in one step:**
```
"Write a RewardController script, attach it to node Popup,
 set duration = 0.3 and maxItems = 5"
```

**Bulk property changes:**
```
"Set fontSize = 28 on all cc.Label nodes in this scene"
"Disable all Button components inside prefab ShopPanel"
```

**Audit & integrity checks:**
```
"Find assets in ui/ that are no longer referenced"
"Scan scene for component properties pointing to deleted assets"
```

### Better done manually in the Editor

| Task | Why |
|------|-----|
| Dragging assets into array properties | Visual feedback, drag-drop is faster |
| Pixel-level position/size tweaks | Requires visual judgment |
| First-time layout with unknown structure | Need to see it while building |
| Spine animations, particle effects | Not representable via API |

### Recommended workflow

```
AI queries scene structure        (MCP)
    ↓
AI writes + attaches scripts      (Write file → MCP attach)
    ↓
AI sets scalar properties         (MCP set)
    ↓
Dev assigns array assets, tweaks  (Manual in Editor)
    ↓
AI audits result for missing refs  (MCP scan)
```

### Design-to-scene pipeline (Figma)

When Figma layers use consistent naming (`btn_`, `lbl_`, `img_`, `panel_`), AI can build the full node hierarchy automatically:

```
Figma layer names → AI infer Cocos component types
    ↓
Asset names → UUID lookup in asset-db
    ↓
MCP creates node hierarchy + sets all properties
    ↓
Reference image overlay for visual comparison
    ↓
Dev does final pixel tweaks
```

Figma does not need to mirror the Cocos node structure exactly — AI handles the transformation. Consistent **naming conventions** matter more than hierarchy.

Figma works well for UI screens (lobby, shop, popups, HUD). For gameplay elements (characters, particles, tilemaps), use engine-native tools.

## Settings

Open the plugin panel (`Extension > Cocos MCP Server`):

| Setting | Default | Description |
|---------|---------|-------------|
| Port | 3000 | HTTP server port (auto-retries if in use) |
| Auto Start | off | Start server when editor opens |
| Debug Log | off | Verbose logging to disk |

## Development

```bash
npm run watch    # build with file watching
npm run build    # production build
```

Architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Requirements

- Cocos Creator 3.8.0+
- Node.js (bundled with Cocos Creator)

