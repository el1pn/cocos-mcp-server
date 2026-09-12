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
                        │  │          │  Tools  │ (36 tools)     │  │
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
│   ├── asset-utils.ts      # Texture2D → SpriteFrame UUID auto-conversion
│   ├── editor-request.ts   # Editor.Message wrapper with timeout; toolCall() response helper
│   └── node-resolver.ts    # Resolve UUID / path / name to a node UUID
├── tools/                  # Tool implementations (ToolExecutor pattern)
│   ├── scene-tools.ts
│   ├── scene-advanced-tools.ts
│   ├── scene-view-tools.ts
│   ├── scene-capture-tools.ts
│   ├── node-tools.ts
│   ├── component-tools.ts
│   ├── prefab-tools.ts
│   ├── project-tools.ts
│   ├── asset-advanced-tools.ts
│   ├── debug-tools.ts
│   ├── preferences-tools.ts
│   ├── server-tools.ts
│   ├── reference-image-tools.ts
│   ├── knowledge-tools.ts
│   ├── animation-tools.ts
│   ├── validation-tools.ts
│   ├── batch-tools.ts
│   ├── search-tools.ts
│   ├── editor-tools.ts
│   └── material-tools.ts
└── panels/
    └── default/index.ts    # Vanilla DOM panel using native Cocos UI elements
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
        └── toolExecutors.set()    → maps name → executor function
```

All registered tools are always exposed — there is no enable/disable-by-category config.

### Tool Inventory (36 tools across 20 executors)

| Category | Tool | Key Actions |
|---|---|---|
| Scene | `scene_management` | `get_current`, `get_list`, `open`, `save`, `save_as`, `create`, `close`, `get_hierarchy` |
| | `scene_state` | `query_ready`, `query_dirty`, `query_classes`, `query_components`, `query_component_has_script`, `query_nodes_by_asset`, `soft_reload`, `snapshot`, `snapshot_abort` |
| | `scene_undo` | `begin_recording`, `end_recording`, `cancel_recording` |
| | `scene_screenshot` | `capture_scene`, `capture_camera`, `capture_node` — returns an inline image + world<->pixel `mapping` |
| Scene View | `scene_view` | `get_state`, `set_gizmo_tool`, `set_pivot`, `set_coordinate`, `set_grid`, `focus`, `align_with_node` |
| Node | `node_lifecycle` | `create`, `delete`, `duplicate`, `move`, `rename` |
| | `node_query` | `get_info`, `find_by_name`, `find_by_pattern`, `get_all`, `detect_type` |
| | `node_transform` | `set_transform`, `set_property` |
| | `node_advanced` | `reset_property`, `reset_transform`, `reset_component`, `restore_prefab`, `move_array_element`, `remove_array_element` |
| Component | `component_manage` | `add`, `remove`, `attach_script` |
| | `component_query` | `get_all`, `get_info`, `get_available` |
| | `set_component_property` | (direct property setting) |
| Knowledge | `knowledge_query` | `list_component_types`, `describe_component`, `list_classes`, `has_script`, `list_enum`, `list_layers` |
| Prefab | `prefab_lifecycle` | `create`, `instantiate`, `update`, `duplicate`, `open` |
| | `prefab_query` | `get_list`, `get_info`, `validate` |
| | `prefab_instance` | `revert`, `restore` |
| Reference Image | `reference_image` | `add`, `remove`, `switch`, `set_transform`, `query` |
| Animation | `animation_query` | `list_clips`, `get_clip`, `get_state`, `get_properties`, `get_current` — read-only |
| Asset | `asset_query` | `get_info`, `get_assets`, `find_by_name`, `get_details`, `query_path`, `query_uuid`, `query_url` |
| | `asset_crud` | `create`, `copy`, `move`, `delete`, `save`, `reimport`, `import`, `refresh` |
| | `asset_advanced` | `generate_url`, `query_db_ready`, `get_dependencies`, `get_unused` |
| | `asset_batch` | `import`, `delete`, `validate_references`, `scan_scene_refs` |
| Material | `material_manage` | `get_info`, `get_material_list`, `get_texture_list`, `get_shader_list`, `update_texture_meta` |
| Project | `project_info` | `get_info`, `get_settings` |
| | `project_build` | `get_build_settings`, `open_build_panel`, `check_builder_status` |
| Debug | `debug_console` | `get_logs`, `clear`, `execute_script` |
| | `debug_inspect` | `get_node_tree`, `get_performance_stats`, `validate_scene`, `get_editor_info`, `probe_cce_api` |
| | `debug_logs` | `get_project_logs`, `get_log_file_info`, `search_logs` |
| Preferences | `preferences_config` | `open_settings`, `query`, `set`, `get_all`, `reset` |
| | `preferences_io` | `export`, `import` |
| Search | `search_project` | `content`, `file_name`, `dir_name` |
| Editor | `editor_actions` | `execute_menu`, `apply_text_edits`, `find_references` |
| Execute | `execute_method` | `component_method`, `scene_script` |
| Batch | `batch_execute` | (runs array of `{tool, args}` sequentially, max 20; `stopOnError`, `rollbackOnError`) |
| Server | `server_info` | `get_ip_list`, `get_sorted_ip_list`, `get_port`, `get_status`, `check_connectivity`, `get_network_interfaces` |
| Validation | `validation` | `validate_json`, `safe_string`, `format_request` |

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

## Parameter Validation

There is no argument normalization layer. `normalizeToolArguments()` used to
rewrite `operation` → `action`, `node_uuid` → `nodeUuid` and similar before
dispatch; it was removed because silently accepting a wrong parameter name hides
the mistake from the model, which then keeps making it.

Each tool validates its own arguments and returns an error that names the valid
values, e.g. `Unknown action 'x'. Valid actions: create, delete, ...`. Return
this rather than throwing: a thrown error becomes JSON-RPC `-32603`, while a
returned `{success: false}` becomes an MCP `isError` result and stays visible to
`batch_execute`.

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

Vanilla DOM using native Cocos UI elements (`ui-button`, `ui-input`, …) — no framework:

| Section | Purpose |
|---------|---------|
| **Server** | Start/stop server, port/autoStart/debug settings, connection URL |
| **Tools** | Enable/disable tools per category |

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

### Undocumented argument shapes

These messages are public API but their argument shapes are documented nowhere.
Each was confirmed against a running 3.8.8 editor; several fail *silently* when
called wrongly, so change them only with a live editor to verify against.

| Message | Shape | Failure mode if wrong |
|---------|-------|----------------------|
| `reference-image`, `add-image` | `([fsPath, ...])` — array of absolute **filesystem** paths, not `db://` urls | A bare string is iterated character by character, registering one bogus entry per character |
| `reference-image`, `remove-image` | `([fsPath, ...])` — array, same as add | A number throws `a is not iterable`; a bare string works only because strings are iterable |
| `reference-image`, `switch-image` | `(fsPath)` — single string | — |
| `reference-image`, `set-image-data` | `(key, value)` — two positional args, **one field per call**; fields are `x`, `y`, `sx`, `sy`, `opacity` | An object of fields is accepted and silently ignored |
| `scene`, `query-enum-list-with-path` | `(enumName)` — the **bare** name, e.g. `Overflow` | A qualified path like `cc.Label.Overflow` returns `null` |

### Editor edits that fail by returning, not throwing

`toolCall()` turns a thrown error into `success: false`, but these messages report
failure in their **return value**. Wrapping one in a bare `toolCall` reports
"reset successfully" for a wrong uuid or path while nothing changed — the most
expensive kind of bug here, because the caller believes the scene was edited.
`SceneAdvancedTools.editorEdit()` exists to reject the `false` cases.

| Message | On failure | Notes |
|---------|-----------|-------|
| `scene`, `reset-property` | returns `false` | Except an unknown path, which returns **`true`**, and `node.name`, which throws `Cannot read properties of undefined (reading 'indexOf')`. Validate against the node dump first. |
| `scene`, `reset-node` | returns `false` | — |
| `scene`, `move-array-element` | returns `false` | `path` must name an array property, e.g. `__comps__.1.clickEvents` |
| `scene`, `remove-array-element` | returns `false` | An out-of-range `index` returns `true` and changes nothing; omitting `index` removes the **last** element |
| `scene`, `reset-component` | returns `null` — **and also on success** | Indistinguishable either way. Validate the uuid with `query-component` first; it takes a *component* uuid, not a node uuid. |

A node property is only resettable when its dump carries a non-null `default`.
`node.name` and `node.active` have none: the engine still answers `true` but
writes `""` / `false`, which is a clobber rather than a reset. Nested leaves
(`position.x`, `__comps__.0.enabled`) are shaped differently and do reset
correctly, so that check only applies at depth 1.

Editor property paths skip the descriptor wrapper: `position.x` addresses
`dump.position.value.x`, and `__comps__.0.enabled` the component's
`.value.enabled`. A walker over a dump has to step through `.value`.

Two lookups that simply do not exist, despite their names suggesting otherwise:

- `scene`/`query-classes` and `scene`/`query-components` return **names only** — no
  property information. A component's property schema has to be read from the
  engine's class metadata inside the scene script (`describeClass` in `scene.ts`).
- There is no `console` scene script in 3.8.x. Evaluating a snippet in the scene
  process goes through this extension's own `evalScript` method.

### Node UUIDs come in two forms

Assets use the dashed form (`8f3c1d24-6b0a-...`), but **scene nodes report a
compressed 22-character base64 UUID** (`cb+IZEFoRLnIr4qCPyF+VK`). Anything that
recognises a UUID must accept both — matching only the dashed form makes every
node round-trip fail, and the failure is easy to miss because a rejected UUID
falls through to a node-name lookup and reports "no node found with that name".
