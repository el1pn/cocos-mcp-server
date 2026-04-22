# Bug: `prefab_lifecycle.create` generates broken prefab for nodes with custom script components

## Summary

When calling `prefab_lifecycle.create` on a node that has a custom script component, the resulting prefab is corrupted on two levels:

1. The script component's `__type__` is written as the **class name** (e.g. `"PokerTypeRoomView"`) instead of the **compressed script UUID** (e.g. `"8f550ohMAVIrqkJqwmHjir3"`). Cocos cannot resolve the class and logs `[Scene] Missing class: PokerTypeRoomView` / `Script "X" attached to "X" is missing or invalid`.
2. The custom `@property` references on the script component (nested node / component refs) are **not serialized at all** — the script component block only contains `__type__`, `_name`, `_objFlags`, `__editorExtras__`, `node`, `_enabled`, `__prefab`, `_id`. Every `@property` field (Sprite / Label / Node refs to children) is dropped.

Additional issue: `convertResult` returns `"Converting node to prefab instance requires deeper engine integration support"` — the source scene node is not relinked as an instance of the newly created prefab.

## Environment

- Cocos Creator: 3.8.8
- cocos-mcp-server: current HEAD of `/Users/longpn/Projects/cocos-mcp-server`
- Reproduced on: `assets/games/txh/scenes/scn_txh_lobby.scene`, node `PokerTypeRoomView` (UUID `c4Mf+bUE1PN6pG7QerQI9q`) with script `PokerTypeRoomView.ts` (script asset UUID `8f550a21-3005-48ae-a909-ab09878e2af7`).

## Reproduction

1. Open a scene that contains a node with a custom script component whose class declares several `@property` fields referencing child nodes/components.
2. Call:
   ```
   prefab_lifecycle.create({
     nodeUuid: "<node-uuid>",
     prefabName: "PokerTypeRoomView",
     savePath: "db://assets/.../PokerTypeRoomView.prefab"
   })
   ```
3. Open the generated `.prefab` or instantiate it via `prefab_lifecycle.instantiate`.

## Observed behavior

### 1. Wrong `__type__` for script components

Generated prefab contains:

```json
{ "__type__": "PokerTypeRoomView", ... }
{ "__type__": "ptl_sfxButton", ... }
```

Cocos editor log:

```
warn: [Scene] Missing class: PokerTypeRoomView
error: [Scene] Script "PokerTypeRoomView" attached to "PokerTypeRoomView" is missing or invalid
error: [Assets] Importer exec failed: {asset[.../PokerTypeRoomView.prefab]}
```

Expected (verified against the original scene file and working prefabs in the project):

```json
{ "__type__": "8f550ohMAVIrqkJqwmHjir3", ... }
{ "__type__": "6816dZAYu9PIr+z0iRIkOzx", ... }
```

The compressed UUID is deterministic: first 5 chars of the script asset UUID, followed by base64 encoding of the remaining 27 hex chars. `prefab-tools.ts` already has `uuidToCompressedId()` — but it is not applied to the script component's `__type__`.

### 2. Custom `@property` references dropped

Source script (`PokerTypeRoomView.ts`):

```ts
@property(Sprite) public background: Sprite | null = null;
@property(Label) public roomName: Label | null = null;
@property(Label) public buyIn: Label | null = null;
@property(Label) public onlinePlayer: Label | null = null;
@property(Label) public stake: Label | null = null;
@property(Sprite) public line: Sprite | null = null;
@property(Sprite) public icon: Sprite | null = null;
```

These are wired on the source node in the scene (verified via `component_query.get_all` before prefab creation). After `prefab_lifecycle.create`, the corresponding component object in the prefab file is:

```json
{
  "__type__": "8f550ohMAVIrqkJqwmHjir3",
  "_name": "",
  "_objFlags": 0,
  "__editorExtras__": {},
  "node": { "__id__": 1 },
  "_enabled": true,
  "__prefab": { "__id__": 71 },
  "_id": ""
}
```

All `@property` fields are missing. Instantiating the prefab therefore produces a node whose script component has every reference set to `null`, which breaks runtime.

### 3. Source node not converted to prefab instance

`prefab_lifecycle.create` result:

```json
"convertResult": {
  "success": false,
  "error": "Converting node to prefab instance requires deeper engine integration support"
},
"message": "Prefab created successfully, but node conversion failed"
```

After a normal Cocos editor "drag node into Assets" operation, the source node becomes a prefab instance (linked to the generated prefab). The MCP tool leaves the source node unlinked, so subsequent edits on the prefab don't propagate and vice-versa.

## Suspected root causes in `source/tools/prefab-tools.ts`

### (a) `__type__` written as class name

`createComponentObject()` around line 1809–1822:

```ts
let componentType = componentData.type || componentData.__type__ || 'cc.Component';
...
// Handle script components - MCP interface already returns correct compressed UUID format
if (componentType && !componentType.startsWith('cc.')) {
    logger.info(`Using script component compressed UUID type: ${componentType}`);
}
const component: any = {
    "__type__": componentType,
    ...
};
```

The comment asserts that the MCP interface already supplies the compressed UUID, but in practice `componentData.type` for a custom script can be the class name (e.g. `"PokerTypeRoomView"`). There is no conversion step.

Proposed fix: when `componentType` is not a `cc.*` type, resolve the script asset UUID (available via `componentData.properties.__scriptAsset.value.uuid`) and pass it through the existing `uuidToCompressedId()` helper.

### (b) Custom `@property` values not serialized

The dispatch at line 1834–1934 special-cases `cc.UITransform`, `cc.Sprite`, `cc.Button`, `cc.Label`. For any other type (including custom scripts) it falls through to:

```ts
} else if (componentData.properties) {
    for (const [key, value] of Object.entries(componentData.properties)) {
        if (key === 'node' || key === 'enabled' || key === '__type__' ||
            key === 'uuid' || key === 'name' || key === '__scriptAsset' || key === '_objFlags') {
            continue;
        }
        ...
        const propValue = this.processComponentProperty(value, context);
        if (propValue !== undefined) {
            component[key] = propValue;
        }
    }
}
```

Despite this branch, the generated prefab contains no custom property fields. Likely causes to investigate:

- `componentData.properties` is absent or empty for the custom-script case (the data path through `enhanceTreeWithMCPComponents` → `component_get_components` may not be populating it).
- `processComponentProperty` returns `undefined` for every @property (e.g. because `context.componentUuidToIndex` is missing the referenced component IDs at the time properties are processed, so the ref resolves to `null` — but that should still land in the output, unless `null` is being filtered out elsewhere).

A focused unit test on a node with @property refs to its own descendants would surface which branch drops the values.

### (c) `convertResult` failure

`convertResult.error`: "Converting node to prefab instance requires deeper engine integration support". The tool creates the prefab asset but does not perform the "generate prefab from node" flow that relinks the scene node to the prefab. The editor's built-in flow uses `Editor.Message.request('scene', 'generate-prefab', ...)` (or the equivalent for v3.8.x); `prefab_lifecycle.create` should invoke that instead of synthesizing the prefab JSON by hand, which avoids the two issues above entirely.

## Suggested fix direction

Short-term (patch around the current synthesis path):

1. In `createComponentObject`, when `!componentType.startsWith('cc.')`, read the script asset UUID from `componentData.properties?.__scriptAsset?.value?.uuid` and run it through `uuidToCompressedId` before writing `__type__`. Correct the misleading log line.
2. Ensure `componentData.properties` for custom scripts is actually populated in `enhanceTreeWithMCPComponents` (log `Object.keys(node.components[i].properties)` and verify the `@property` keys are present before `createComponentObject` is called).
3. When `processComponentProperty` resolves a component ref to `null` because of missing `componentUuidToIndex` entry, confirm the value is still written to `component[key]` (do not filter nulls for custom scripts).

Long-term:

Replace the hand-written JSON synthesis with the engine's own "generate prefab from node" API. It handles script UUIDs, nested refs, and source-node relinking correctly, and keeps the output byte-identical to what a user would get by dragging the node into the Assets panel.

## Workaround used in the meantime

1. After `prefab_lifecycle.create`, manually rewrite the prefab file:
   - Replace `"__type__": "<ClassName>"` with `"__type__": "<compressed-uuid>"` (compressed UUID derived from the script's `.ts.meta` UUID).
2. Re-open the prefab in the editor and manually re-wire every `@property` reference (they are all empty after MCP creation).
3. Delete the original scene node and replace it with a fresh `prefab_lifecycle.instantiate` so the scene references the prefab correctly.

This is error-prone and defeats the point of the MCP tool; fixing (a)+(b)+(c) would remove the manual step entirely.
