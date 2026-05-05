# Cocos Creator MCP Server

MCP server plugin for Cocos Creator 3.8+. Lets AI assistants (Claude, Cursor, VS Code) control the editor via 41 action-based tools.

## Installation

```bash
cp -r cocos-mcp-server YourProject/extensions/
cd YourProject/extensions/cocos-mcp-server
npm install && npm run build
```

Restart Cocos Creator, then open `Extension > Cocos MCP Server` and click **Start Server**.

## Connect AI Client

Default endpoint: `http://127.0.0.1:3000/mcp` (Streamable HTTP, with `/sse` legacy fallback). Port configurable via plugin panel or `MCP_PORT`.

**Claude Code CLI:**
```
claude mcp add --transport http cocos-creator-3x http://127.0.0.1:3000/mcp
```

**Claude Desktop / Cursor / VS Code / Trae / Windsurf / Codex:**
```json
{
  "mcpServers": {
    "cocos-creator-3x": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**Stdio (for clients without HTTP support):**
```json
{
  "mcpServers": {
    "cocos-creator-3x": {
      "command": "node",
      "args": ["/path/to/cocos-mcp-server/dist/mcp-proxy.js", "3000"]
    }
  }
}
```

## Tools Overview

All tools use an `action` parameter:

```json
{ "tool": "node_lifecycle", "arguments": { "action": "create", "name": "Player", "nodeType": "2DNode" } }
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
| UI Builder | `ui_build_from_spec` | declarative UI tree from a UISpec JSON |
| Project | `project_build` | `run`, `build`, `get_build_settings` |
| Material | `material_manage` | `create_material`, `create_shader`, `get_info`, `update_texture_meta` |
| Animation | `manage_animation` | `get_clips`, `play`, `stop`, `pause` |
| Search | `search_project` | `content`, `file_name`, `dir_name` |
| Editor | `editor_actions` | `execute_menu`, `apply_text_edits`, `find_references` |
| Batch | `batch_execute` | run multiple tools sequentially in one call |
| Debug | `debug_console` | `get_logs`, `clear`, `execute_script` |

Full inventory: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## MCP Resources

Read-only snapshots via `resources/read`:

| URI | Description |
|-----|-------------|
| `cocos://hierarchy` | Current scene node tree |
| `cocos://selection` | Selected nodes and assets |
| `cocos://logs/latest` | Recent server log entries |

## When to Use MCP

Best for repetitive or scriptable work: scene audits, bulk property changes, scaffolding repeated structures, writing-and-attaching scripts, building UI from a spec or Figma export.

Better done in-editor: pixel-level layout, dragging assets into array properties, particle/spine setup, first-time exploratory layout.

Typical flow: AI queries scene → writes scripts and scaffolds nodes → developer does visual tweaks → AI audits for missing references.

## Settings

Plugin panel (`Extension > Cocos MCP Server`):

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

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Requirements

- Cocos Creator 3.8.0+
- Node.js (bundled with Cocos Creator)
