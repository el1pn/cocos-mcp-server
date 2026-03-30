# Architecture

## Overview

Cocos MCP Server is a Cocos Creator 3.8+ editor extension that exposes an MCP (Model Context Protocol) server over HTTP, allowing AI assistants to programmatically control the editor.

```
┌─────────────────────────────────────────────────────┐
│                   MCP Clients                       │
│  Claude Desktop / Claude CLI / Cursor / VS Code     │
└──────────┬──────────────────────┬───────────────────┘
           │ stdio                │ HTTP
           ▼                     ▼
    ┌──────────────┐    ┌──────────────────────────────────────────┐
    │  mcp-proxy   │───▶│           Cocos Creator Editor            │
    │  (Node.js)   │    │  ┌────────────────────────────────────┐  │
    └──────────────┘    │  │     cocos-mcp-server (extension)   │  │
                        │  │                                    │  │
                        │  │  main.ts ─── mcp-server.ts         │  │
                        │  │               │  HTTP :3000         │  │
                        │  │               ├─ POST /mcp          │  │
                        │  │               ├─ POST /api/tool/*   │  │
                        │  │               ├─ GET  /health       │  │
                        │  │               └─ GET  /api/tools    │  │
                        │  │               │                     │  │
                        │  │          ┌────┴────┐                │  │
                        │  │          │  Tools  │ (41 tools)     │  │
                        │  │          └────┬────┘                │  │
                        │  │               │                     │  │
                        │  │          Editor.Message.request()   │  │
                        │  │               │                     │  │
                        │  │  ┌────────────┴──────────────┐     │  │
                        │  │  │  scene.ts (renderer proc) │     │  │
                        │  │  │  cc.director / cc.Node    │     │  │
                        │  │  └───────────────────────────┘     │  │
                        │  └────────────────────────────────────┘  │
                        └──────────────────────────────────────────┘
```

## Transport

Two transport modes are supported:

| Mode | Endpoint | Use case |
|------|----------|----------|
| **HTTP** (direct) | `POST /mcp` | Claude CLI (`--transport http`), Cursor, VS Code |
| **Stdio** (via proxy) | `node dist/mcp-proxy.js [port]` | Claude Desktop, stdio-only MCP clients |

The stdio proxy (`mcp-proxy.ts`) reads JSON-RPC from stdin, forwards to HTTP `/mcp`, and writes responses to stdout. It adds no logic — the server handles all protocol concerns.

## Protocol

JSON-RPC 2.0 over HTTP, conforming to MCP spec `2024-11-05`.

**Methods handled by `handleMessage()`:**

| Method | Description |
|--------|-------------|
| `initialize` | Returns server info, capabilities (`tools`, `resources`), and instructions |
| `tools/list` | Returns available tool definitions |
| `tools/call` | Executes a tool via the queue |
| `resources/list` | Lists available resources (`cocos://hierarchy`, `cocos://selection`, `cocos://logs/latest`) |
| `resources/read` | Reads a resource by URI |

## File Structure

```
source/
├── main.ts                 # Extension entry: load/unload, IPC message handlers
├── mcp-server.ts           # HTTP server, JSON-RPC routing, tool queue, resources
├── mcp-proxy.ts            # Standalone stdio-to-HTTP bridge (runs outside editor)
├── logger.ts               # Centralized logger: circular buffer, disk, panel broadcast
├── settings.ts             # Read/write settings to {project}/settings/mcp-server.json
├── scene.ts                # Scene script (runs in renderer process via cc.director)
├── types/
│   └── index.ts            # All shared interfaces
├── utils/
│   ├── asset-safety.ts     # Atomic asset creation pipeline (ensure dirs, create, refresh)
│   └── asset-utils.ts      # Texture2D → SpriteFrame UUID auto-conversion
├── tools/                  # Tool implementations (ToolExecutor pattern)
│   ├── scene-tools.ts
│   ├── scene-advanced-tools.ts
│   ├── scene-view-tools.ts
│   ├── node-tools.ts
│   ├── component-tools.ts
│   ├── prefab-tools.ts
│   ├── project-tools.ts
│   ├── asset-advanced-tools.ts
│   ├── debug-tools.ts
│   ├── preferences-tools.ts
│   ├── server-tools.ts
│   ├── broadcast-tools.ts
│   ├── reference-image-tools.ts
│   ├── validation-tools.ts
│   ├── batch-tools.ts
│   ├── search-tools.ts
│   ├── editor-tools.ts
│   ├── animation-tools.ts
│   ├── material-tools.ts
│   └── tool-manager.ts     # Tool configuration persistence (enable/disable per slot)
└── panels/
    └── default/index.ts    # Vue 3 panel: Server tab, Tools tab, Tester tab
```

## Tool Architecture

### Action-Based Consolidation

All tools follow a **consolidated action-based pattern**: one tool name per category, with an `action` enum parameter to select the operation.

```
WRONG (old pattern):               CORRECT (current pattern):
├── get_current_scene               ├── scene_management
├── get_scene_list                  │     action: get_current
├── open_scene                      │     action: get_list
├── save_scene                      │     action: open
└── create_scene                    │     action: save
                                    │     action: create
```

**Why:** Reduces tool count for AI (fewer tokens in `tools/list`), higher call accuracy.

### ToolExecutor Interface

Every tool file implements:

```typescript
interface ToolExecutor {
    getTools(): ToolDefinition[];                           // Schema definitions
    execute(toolName: string, args: any): Promise<ToolResponse>;  // Dispatch by action
}
```

### Registration Flow

```
MCPServer.initializeTools()
  │
  ├── new SceneTools()        → this.tools.scene
  ├── new NodeTools()         → this.tools.node
  ├── new BatchTools(exec)    → this.tools.batch
  ├── ...                     → this.tools.*
  │
  └── setupTools()
        │
        ├── toolSet.getTools()     → collects all ToolDefinition[]
        ├── filter by enabledTools → applies tool manager config
        └── toolExecutors.set()    → maps name → executor function
```

### Tool Inventory (41 tools)

| Category | Tool | Actions |
|----------|------|---------|
| Scene | `scene_management` | `get_current`, `get_list`, `open`, `save`, `save_as`, `create`, `close`, `get_hierarchy` |
| | `scene_state` | `query_dirty`, `query_ready`, `query_classes`, `query_components` |
| | `scene_undo` | `begin_recording`, `cancel_recording`, `snapshot`, `abort_snapshot` |
| Node | `node_lifecycle` | `create`, `delete`, `duplicate`, `move` |
| | `node_query` | `get_info`, `find_by_name`, `find_by_pattern`, `get_all`, `detect_type` |
| | `node_transform` | `set_transform`, `set_property` |
| | `node_clipboard` | `copy`, `paste`, `cut` |
| | `node_advanced` | `reset_property`, `reset_transform`, `reset_component`, `restore_prefab`, `move_array_element`, `remove_array_element` |
| Component | `component_manage` | `add`, `remove`, `attach_script` |
| | `component_query` | `get_all`, `get_info`, `get_available` |
| | `set_component_property` | (direct property setting) |
| Prefab | `prefab_lifecycle` | `create`, `instantiate`, `update`, `duplicate` |
| | `prefab_query` | `get_list`, `load`, `get_info`, `validate` |
| | `prefab_instance` | `revert`, `restore` |
| Asset | `asset_query` | `get_info`, `get_assets`, `find_by_name`, `get_details`, `query_path`, `query_uuid`, `query_url` |
| | `asset_crud` | `create`, `copy`, `move`, `delete`, `save`, `reimport`, `import`, `refresh` |
| | `asset_advanced` | `save_meta`, `generate_url`, `get_dependencies`, `export_manifest`, `open_external` |
| | `asset_batch` | `batch_import`, `batch_delete`, `compress_textures`, `get_unused` |
| Project | `project_info` | `get_info`, `get_settings` |
| | `project_build` | `run`, `build`, `get_build_settings`, `open_build_panel`, `check_builder_status` |
| | `project_preview` | `start_preview`, `stop_preview` |
| Debug | `debug_console` | `get_logs`, `clear`, `execute_script` |
| | `debug_inspect` | `get_node_tree`, `get_performance`, `validate_scene` |
| | `debug_logs` | `get_file_info`, `get_logs`, `search_logs` |
| Scene View | `gizmo_tool` | `change_tool`, `change_pivot`, `change_coordinate`, `query_tool`, `query_pivot`, `query_coordinate` |
| | `scene_view` | `change_2d_3d`, `query_2d_3d`, `set_grid`, `query_grid`, `set_icon_3d`, `query_icon_3d`, `set_icon_size`, `query_icon_size`, `reset` |
| | `scene_camera` | `focus_on_nodes`, `align_with_view`, `align_view_with_node` |
| Preferences | `preferences_config` | `get`, `set`, `get_all`, `reset`, `open_settings` |
| | `preferences_io` | `export`, `import` |
| Reference Image | `reference_image_manage` | `add`, `remove`, `clear_all`, `list`, `switch`, `query_current`, `refresh`, `query_config` |
| | `reference_image_transform` | `set_data`, `set_opacity`, `set_position`, `set_scale` |
| Material | `material_manage` | `create_material`, `create_shader`, `get_info`, `get_material_list`, `get_texture_list`, `get_shader_list`, `update_texture_meta` |
| Animation | `manage_animation` | `get_clips`, `get_state`, `play`, `stop`, `pause`, `resume` |
| Search | `search_project` | `content`, `file_name`, `dir_name` |
| Editor | `editor_actions` | `execute_menu`, `apply_text_edits`, `find_references` |
| Execute | `execute_method` | `component_method`, `scene_script`, `sync_prefab` |
| Batch | `batch_execute` | (runs array of `{tool, args}` sequentially, max 20) |
| Server | `server_info` | `get_status`, `get_network`, `check_connectivity` |
| Broadcast | `broadcast` | `send`, `listen`, `stop`, `get_log`, `clear_log`, `get_listeners` |
| Validation | `validation` | `validate_json`, `format_json` |

## Request Flow

```
HTTP Request
  │
  ▼
handleHttpRequest()          ── CORS, routing
  │
  ├─ /mcp POST → handleMCPRequest()
  │    │
  │    ▼
  │  handleMessage()          ── JSON-RPC dispatch
  │    │
  │    ├─ initialize          ── return capabilities + instructions
  │    ├─ tools/list          ── return tool schemas
  │    ├─ tools/call          ── enqueueToolExecution()
  │    │    │
  │    │    ▼
  │    │  Tool Queue           ── max 100 queued, max 5 concurrent, 60s timeout
  │    │    │
  │    │    ▼
  │    │  normalizeToolArguments()  ── fix LLM hallucinations (operation→action, etc.)
  │    │    │
  │    │    ▼
  │    │  toolExecutor(args)   ── dispatch to ToolExecutor.execute()
  │    │    │
  │    │    ▼
  │    │  Editor.Message.request()  ── Cocos 3.8.x editor API
  │    │
  │    ├─ resources/list      ── return resource URIs
  │    └─ resources/read      ── read cocos://hierarchy|selection|logs
  │
  ├─ /api/tool/* POST → handleSimpleAPIRequest()  (REST shortcut)
  ├─ /api/tools GET   → tool list with curl examples
  └─ /health GET      → { status: "ok" }
```

## Concurrency & Safety

| Mechanism | Value | Purpose |
|-----------|-------|---------|
| Tool queue | max 100 | Prevent unbounded memory growth |
| Concurrent tools | max 5 | Prevent editor freeze |
| Execution timeout | 60s | Prevent hanging operations |
| Request body limit | 5MB | Prevent abuse |
| Port auto-retry | 10 attempts | Handle EADDRINUSE gracefully |
| HTTP 429 + Retry-After | 5s | Signal queue full to client |

## Logging

`logger.ts` provides centralized logging:

- **Circular buffer**: 2000 entries in memory (trims to 1500 when full)
- **Disk persistence**: `{project}/settings/mcp-server.log`, auto-rotates at 2MB
- **Panel broadcast**: `Editor.Message.broadcast('cocos-mcp-server:on-log', entry)`
- **Console**: only `warn`/`error` go to editor console to avoid spam
- **Levels**: `info`, `success`, `warn`, `error`, `mcp`

Accessible via MCP resource `cocos://logs/latest`.

## Parameter Aliasing

`normalizeToolArguments()` automatically corrects common LLM hallucinations before tool execution:

**Name aliases** (applied when canonical param is absent):
```
operation, command, method  →  action
node_uuid, nodeId, node_id  →  nodeUuid
component, comp             →  componentType
filePath, file, assetPath   →  url
parent, parent_uuid         →  parentUuid
```

**Action value aliases:**
```
remove, destroy  →  delete
list             →  get_list
info             →  get_info
find             →  find_by_name
```

## Asset Safety

`AssetSafety.safeCreateAsset()` provides an atomic creation pipeline:

```
1. ensureParentDirs()    ── walk db://assets/a/b/c, create missing dirs
2. create-asset          ── Editor.Message.request('asset-db', 'create-asset', ...)
3. metaModifier()        ── optional post-creation meta changes
4. refresh-asset         ── sync editor state
```

## Texture → SpriteFrame Auto-Conversion

`resolveSpriteFrameUuid()` in `asset-utils.ts` handles a common AI mistake: passing a Texture2D UUID where a SpriteFrame UUID is expected.

```
1. query-asset-info(uuid)   ── check importer type
2. If image/texture:
   a. query-url → query-path  ── get filesystem path
   b. Read .meta file         ── parse subMetas
   c. Extract SpriteFrame UUID from subMetas
3. Return resolved UUID
```

Hooked into `component-tools.ts` for `spriteFrame` property type.

## Panel UI

Vue 3 app with 3 tabs:

| Tab | Purpose |
|-----|---------|
| **Server** | Start/stop server, port/autoStart/debug settings, connection URL |
| **Tools** | Enable/disable tools per category, save/load configurations (max 5 slots) |
| **Tester** | Select tool from dropdown, auto-prefill args from schema, execute, view JSON result with timing |

## Cocos Creator 3.8.x API Reference

All editor interactions use `Editor.Message.request()`:

| API | Method | Notes |
|-----|--------|-------|
| Asset DB | `asset-db`, `create-asset` | `(url, content, {overwrite, rename})` |
| | `asset-db`, `save-asset` | `(url, content)` |
| | `asset-db`, `query-asset-info` | `(urlOrUUIDOrPath)` → `AssetInfo \| null` |
| | `asset-db`, `query-asset-meta` | `(urlOrUUID)` → `IAssetMeta \| null` |
| | `asset-db`, `save-asset-meta` | `(urlOrUUID, jsonString)` |
| | `asset-db`, `query-uuid` | `(url)` → `string \| null` |
| | `asset-db`, `query-url` | `(uuid)` → `string \| null` |
| | `asset-db`, `query-path` | `(url)` → `string \| null` |
| | `asset-db`, `query-assets` | `({pattern})` → `AssetInfo[]` |
| | `asset-db`, `refresh-asset` | `(url)` → `boolean` |
| Scene | `scene`, `query-node-tree` | Full scene hierarchy |
| | `scene`, `query-node` | `(uuid)` → node data with `__comps__` |
| | `scene`, `open-scene` | `(uuid)` |
| | `scene`, `save-scene` | |
| | `scene`, `execute-scene-script` | `({name, method, args})` → runs in renderer |
| Selection | `Editor.Selection.getSelected(type)` | Synchronous, `type` = `'node'` or `'asset'` |
