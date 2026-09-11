"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
exports.methods = {
    /**
     * Add component to a node
     */
    addComponentToNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            // Find node by UUID
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Get component class
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            // Add component
            const component = node.addComponent(ComponentClass);
            return {
                success: true,
                message: `Component ${componentType} added successfully`,
                data: { componentId: component.uuid }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create a new node
     */
    createNode(name, parentUuid) {
        try {
            const { director, Node } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = new Node(name);
            if (parentUuid) {
                const parent = scene.getChildByUuid(parentUuid);
                if (parent) {
                    parent.addChild(node);
                }
                else {
                    scene.addChild(node);
                }
            }
            else {
                scene.addChild(node);
            }
            return {
                success: true,
                message: `Node ${name} created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get node information
     */
    getNodeInfo(nodeUuid) {
        var _a;
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position,
                    rotation: node.rotation,
                    scale: node.scale,
                    parent: (_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid,
                    children: node.children.map((child) => child.uuid),
                    components: node.components.map((comp) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }))
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get all nodes in scene
     */
    getAllNodes() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const nodes = [];
            const collectNodes = (node) => {
                var _a;
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: (_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid
                });
                node.children.forEach((child) => collectNodes(child));
            };
            scene.children.forEach((child) => collectNodes(child));
            return { success: true, data: nodes };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Find node by name
     */
    findNodeByName(name) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByName(name);
            if (!node) {
                return { success: false, error: `Node with name ${name} not found` };
            }
            return {
                success: true,
                data: {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: node.position
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get current scene information
     */
    getCurrentSceneInfo() {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children.length
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Set node property
     */
    setNodeProperty(nodeUuid, property, value) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            // Set property
            if (property === 'position') {
                node.setPosition(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'rotation') {
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            }
            else if (property === 'scale') {
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            }
            else if (property === 'active') {
                node.active = value;
            }
            else if (property === 'name') {
                node.name = value;
            }
            else {
                // Try setting property directly
                node[property] = value;
            }
            return {
                success: true,
                message: `Property '${property}' updated successfully`
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Get scene hierarchy
     */
    getSceneHierarchy(includeComponents = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const processNode = (node) => {
                const result = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };
                if (includeComponents) {
                    result.components = node.components.map((comp) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }
                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child) => processNode(child));
                }
                return result;
            };
            const hierarchy = scene.children.map((child) => processNode(child));
            return { success: true, data: hierarchy };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Create a prefab from a node by delegating to the engine's official
     * PrefabManager (cce.Prefab.createPrefabAssetFromNode). Replicates the
     * editor's "drag node to Assets" flow — handles script __type__ compression,
     * @property ref serialization, and source-node relinking.
     */
    /**
     * Revert a prefab instance to match its source asset by delegating to
     * cce.Prefab.revertPrefab. No public scene message exists for this.
     */
    async revertPrefabInstance(nodeUuid) {
        var _a;
        try {
            const mgr = (_a = globalThis.cce) === null || _a === void 0 ? void 0 : _a.Prefab;
            if (!mgr || typeof mgr.revertPrefab !== 'function') {
                return {
                    success: false,
                    error: 'cce.Prefab.revertPrefab not available in this Cocos Creator version'
                };
            }
            const applied = await mgr.revertPrefab(nodeUuid);
            // Engine returns false when the node has no overrides to revert —
            // not an error, just a no-op. Surface it so callers can distinguish.
            return { success: true, data: { nodeUuid, applied: applied !== false } };
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    },
    async createPrefabFromNode(nodeUuid, url) {
        var _a;
        try {
            const mgr = (_a = globalThis.cce) === null || _a === void 0 ? void 0 : _a.Prefab;
            if (!mgr || typeof mgr.createPrefabAssetFromNode !== 'function') {
                return {
                    success: false,
                    error: 'cce.Prefab.createPrefabAssetFromNode not available in this Cocos Creator version'
                };
            }
            const prefabUuid = await mgr.createPrefabAssetFromNode(nodeUuid, url);
            if (!prefabUuid) {
                return { success: false, error: 'createPrefabAssetFromNode returned null/undefined' };
            }
            return {
                success: true,
                data: { prefabUuid, url, sourceNodeUuid: nodeUuid }
            };
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    },
    /**
     * Render the currently-open scene/prefab to a PNG (returned as base64) using an
     * offscreen clone Camera + RenderTexture. This produces a CLEAN image (no editor
     * gizmos/grid) and never mutates the existing cameras — a temporary, hidden,
     * non-persisted camera node is created, used for 1-2 frames, then destroyed.
     *
     * opts: {
     *   mode: 'scene' | 'camera' | 'node',
     *   cameraUuid?: string,   // for mode 'camera'
     *   nodeUuid?: string,     // for mode 'node'
     *   width?: number,        // 1..2048, default 1920
     *   height?: number,       // 1..2048, default 1080
     *   backgroundColor?: { r, g, b, a }  // 0..255, default opaque black
     * }
     * opts.previewMaxWidth/previewMaxHeight (both required together): also return a downscaled
     * previewBase64 (never upscaled) fitting within those bounds, alongside previewWidth/previewHeight.
     * Returns { success, data: { pngBase64, width, height, mode, cameraNodeUuid, cameraNodeName, mapping, previewBase64?, previewWidth?, previewHeight? } }.
     */
    async captureSceneView(opts) {
        let cleanup = null;
        try {
            const cc = require('cc');
            const { director, Camera, RenderTexture, Node, Vec3, Quat, Color, CCObject, UITransform } = cc;
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene', instruction: 'Open a scene first via scene_management(action="open" or "create").' };
            }
            opts = opts || {};
            const mode = opts.mode || 'scene';
            const width = Math.max(1, Math.min(2048, Math.floor(opts.width || 1920)));
            const height = Math.max(1, Math.min(2048, Math.floor(opts.height || 1080)));
            const bg = opts.backgroundColor || { r: 0, g: 0, b: 0, a: 255 };
            // Collect all Camera components in the scene.
            const cameras = [];
            const collect = (n) => {
                if (!n) {
                    return;
                }
                if (n.getComponent) {
                    const c = n.getComponent(Camera);
                    if (c) {
                        cameras.push(c);
                    }
                }
                (n.children || []).forEach(collect);
            };
            scene.children.forEach(collect);
            const pickMain = () => {
                const usable = cameras.filter((c) => c.enabledInHierarchy !== false && !c.targetTexture);
                const list = usable.length ? usable : cameras;
                const ortho = list.find((c) => c.projection === Camera.ProjectionType.ORTHO);
                return ortho || list[0] || null;
            };
            // Resolve the parameters of the camera we will render with.
            let worldPos;
            let worldRot;
            let projection;
            let orthoHeight;
            let fov;
            let near;
            let far;
            let visibility = null;
            let srcUuid;
            let srcName;
            if (mode === 'node') {
                const node = findNodeDeep(scene, opts.nodeUuid);
                if (!node) {
                    return { success: false, error: `Node with UUID ${opts.nodeUuid} not found`, instruction: 'Use scene_management(action="get_hierarchy") or node_lifecycle(action="get_info") to find a valid UUID.' };
                }
                const ut = node.getComponent(UITransform);
                if (!ut) {
                    return { success: false, error: 'capture_node requires the node to have a UITransform (2D node)', instruction: 'Use capture_scene or capture_camera for 3D nodes instead.' };
                }
                const rect = ut.getBoundingBoxToWorld(); // world-space Rect {x, y, width, height}
                if (!rect || rect.width <= 0 || rect.height <= 0) {
                    return { success: false, error: 'Node has zero-size world bounding box', instruction: 'The node (or all its children) has a zero-size UITransform. Set a non-zero contentSize, or capture a different node.' };
                }
                const ref = pickMain();
                const imgAspect = width / height;
                const rectAspect = rect.width / rect.height;
                // Fit-contain the node's bbox inside the output aspect.
                orthoHeight = rectAspect > imgAspect ? (rect.width / imgAspect) / 2 : rect.height / 2;
                const camZ = ref ? ref.node.worldPosition.z : 1000;
                worldPos = new Vec3(rect.x + rect.width / 2, rect.y + rect.height / 2, camZ);
                worldRot = new Quat();
                projection = Camera.ProjectionType.ORTHO;
                fov = 45;
                near = ref ? ref.near : 1;
                far = ref ? ref.far : 2000;
                visibility = ref ? ref.visibility : null;
            }
            else {
                let src;
                if (mode === 'camera') {
                    const cn = findNodeDeep(scene, opts.cameraUuid);
                    if (!cn) {
                        return { success: false, error: `Camera node with UUID ${opts.cameraUuid} not found`, instruction: 'Use scene_management(action="get_hierarchy") to find a valid camera node UUID.' };
                    }
                    src = cn.getComponent(Camera);
                    if (!src) {
                        return { success: false, error: `Node ${opts.cameraUuid} has no Camera component`, instruction: 'Pass the UUID of a node that has a Camera component attached, or use capture_scene to auto-pick one.' };
                    }
                }
                else {
                    src = pickMain();
                    if (!src) {
                        return { success: false, error: 'No Camera component found in the current scene', instruction: 'Add a Camera component to a node, or use capture_camera/capture_node with an explicit target.' };
                    }
                }
                worldPos = src.node.getWorldPosition();
                worldRot = src.node.getWorldRotation();
                projection = src.projection;
                orthoHeight = src.orthoHeight;
                fov = src.fov;
                near = src.near;
                far = src.far;
                visibility = src.visibility;
                srcUuid = src.node.uuid;
                srcName = src.node.name;
            }
            // Offscreen render target.
            const rt = new RenderTexture();
            rt.reset({ width, height });
            // Temporary clone camera — hidden, not saved, auto-removed after capture.
            const camNode = new Node('__mcp_capture_cam__');
            camNode.hideFlags = CCObject.Flags.DontSave | CCObject.Flags.HideInHierarchy | CCObject.Flags.DontDestroy;
            scene.addChild(camNode);
            camNode.setWorldPosition(worldPos);
            camNode.setWorldRotation(worldRot);
            const cam = camNode.addComponent(Camera);
            cam.projection = projection;
            cam.orthoHeight = orthoHeight;
            cam.fov = fov;
            cam.near = near;
            cam.far = far;
            if (visibility !== null && visibility !== undefined) {
                cam.visibility = visibility;
            }
            cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
            cam.clearColor = new Color(bg.r, bg.g, bg.b, bg.a === undefined ? 255 : bg.a);
            cam.targetTexture = rt;
            cleanup = () => {
                try {
                    cam.targetTexture = null;
                }
                catch (e) { /* ignore */ }
                try {
                    camNode.destroy();
                }
                catch (e) { /* ignore */ }
                try {
                    rt.destroy();
                }
                catch (e) { /* ignore */ }
            };
            // Drive the render pipeline so the offscreen camera actually draws into
            // the RT. In editor edit-mode the auto loop does not reliably render an
            // offscreen camera within a couple of frames, so we force frames via
            // director.root.frameMove and also wait real frames as a fallback.
            const root = director.root;
            const canForceRender = !!(root && typeof root.frameMove === 'function');
            try {
                if (cam.camera && typeof cam.camera.update === 'function') {
                    cam.camera.update(true);
                }
            }
            catch (e) { /* ignore */ }
            await waitFrames(1);
            if (canForceRender) {
                try {
                    root.frameMove(0);
                    root.frameMove(0);
                }
                catch (e) { /* ignore */ }
            }
            await waitFrames(1);
            if (canForceRender) {
                try {
                    root.frameMove(0);
                }
                catch (e) { /* ignore */ }
            }
            const raw = rt.readPixels(); // RGBA bytes, OpenGL origin (bottom-left)
            if (!raw || raw.length < width * height * 4) {
                cleanup();
                cleanup = null;
                return { success: false, error: 'readPixels returned no/insufficient data', instruction: 'The render target likely produced no frames. Retry; if it persists, reduce width/height or check GPU readback support.' };
            }
            const canvas = buildFlippedCanvas(raw, width, height);
            const pngBase64 = canvasToPngBase64(canvas);
            let previewBase64;
            let previewWidth;
            let previewHeight;
            if (opts.previewMaxWidth && opts.previewMaxHeight) {
                const preview = resizeCanvasToPngBase64(canvas, opts.previewMaxWidth, opts.previewMaxHeight);
                previewBase64 = preview.base64;
                previewWidth = preview.width;
                previewHeight = preview.height;
            }
            const wc = camNode.getWorldPosition();
            const worldUnitsPerPixel = (2 * orthoHeight) / height;
            const mapping = projection === Camera.ProjectionType.ORTHO ? {
                projection: 'ortho',
                worldCenterX: wc.x,
                worldCenterY: wc.y,
                worldUnitsPerPixel,
                imageWidth: width,
                imageHeight: height,
                formula: 'px = imgW/2 + (worldX - worldCenterX)/worldUnitsPerPixel ; py = imgH/2 - (worldY - worldCenterY)/worldUnitsPerPixel'
            } : {
                projection: 'perspective',
                worldCenterX: wc.x,
                worldCenterY: wc.y,
                imageWidth: width,
                imageHeight: height,
                formula: 'perspective projection: pixel mapping is non-linear, use for visual comparison only'
            };
            cleanup();
            cleanup = null;
            return {
                success: true,
                data: {
                    pngBase64, width, height, mode,
                    cameraNodeUuid: srcUuid, cameraNodeName: srcName, mapping,
                    previewBase64, previewWidth, previewHeight
                }
            };
        }
        catch (error) {
            if (cleanup) {
                cleanup();
            }
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    },
    /**
     * Diagnostic probe for the internal `cce.<namespace>` engine managers (e.g. Prefab,
     * Node, Scene) that aren't exposed via the normal Editor.Message protocol. Reports
     * which methods exist on the given namespace (undocumented, varies by Creator build),
     * plus optionally a live node's raw `_prefab` (PrefabInfo) state. Read-only; makes no
     * scene changes. Originally written to investigate the "instantiate loses _prefab
     * link" bug — kept generic so it can be reused for other cce.* investigations.
     */
    probeCceApi(namespace, nodeUuid) {
        var _a, _b, _c, _d, _e, _f, _g;
        // execute-scene-script serializes args through JSON, turning `undefined` into `null`,
        // so a default parameter (`= 'Prefab'`) never kicks in — normalize explicitly instead.
        namespace = namespace || 'Prefab';
        try {
            const mgr = (_a = globalThis.cce) === null || _a === void 0 ? void 0 : _a[namespace];
            const methods = mgr
                ? Object.getOwnPropertyNames(mgr)
                    .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(mgr) || {}))
                    .filter((k, i, a) => a.indexOf(k) === i && typeof mgr[k] === 'function')
                    .sort()
                : null;
            let nodeInfo = null;
            if (nodeUuid) {
                const { director } = require('cc');
                const scene = director.getScene();
                const node = scene ? findNodeDeep(scene, nodeUuid) : null;
                if (!node) {
                    nodeInfo = { found: false };
                }
                else {
                    const pi = node._prefab;
                    nodeInfo = {
                        found: true,
                        name: node.name,
                        hasPrefabInfo: !!pi,
                        prefabInfo: pi ? {
                            fileId: pi.fileId,
                            hasRoot: !!pi.root,
                            rootIsSelf: pi.root === node,
                            assetUuid: (_e = (_c = (_b = pi.asset) === null || _b === void 0 ? void 0 : _b._uuid) !== null && _c !== void 0 ? _c : (_d = pi.asset) === null || _d === void 0 ? void 0 : _d.uuid) !== null && _e !== void 0 ? _e : null,
                            instanceFileId: (_g = (_f = pi.instance) === null || _f === void 0 ? void 0 : _f.fileId) !== null && _g !== void 0 ? _g : null,
                            hasInstance: !!pi.instance
                        } : null
                    };
                }
            }
            return {
                success: true,
                data: {
                    cceAvailable: !!globalThis.cce,
                    namespace,
                    namespaceAvailable: !!mgr,
                    methods,
                    nodeInfo
                }
            };
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    }
    // NOTE: cce.Prefab.linkNodeWithPrefabAsset looked like the fix for the missing
    // _prefab link (see probeCceApi above), but calling it standalone makes the node
    // vanish from scene serialization entirely — worse than the original bug. It's
    // apparently meant to be used internally alongside other bookkeeping the engine does
    // when a prefab is dragged in (onAddNode, etc.), not called on its own. Do not wire
    // this up again without reproducing what the Editor UI's drag-and-drop path actually
    // does end-to-end.
    ,
    /**
     * Evaluate a snippet inside the scene process, where `cc` and the live scene
     * graph are reachable.
     *
     * The previous implementation targeted a `console` scene script that no longer
     * exists in 3.8.x, so every call failed with "Scenario scripts do not exist".
     * The snippet runs as an async function body, so it may use `await` and must
     * `return` whatever it wants back.
     *
     * ponytail: the return value is JSON-serialised across the process boundary,
     * so engine objects come back as plain data. Non-serialisable results degrade
     * to their string form rather than failing the call.
     */
    async evalScript(script) {
        try {
            if (!script) {
                return { success: false, error: 'script is required' };
            }
            const cc = require('cc');
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const fn = new AsyncFunction('cc', script);
            const result = await fn(cc);
            try {
                // Round-trip to surface non-serialisable values here rather than
                // as an opaque IPC failure.
                JSON.stringify(result);
                return { success: true, data: { result } };
            }
            catch (_a) {
                return { success: true, data: { result: String(result) } };
            }
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    },
    /**
     * Read the property schema of a component class straight from the engine's
     * class metadata.
     *
     * `scene/query-classes` and `scene/query-components` return names only — no
     * property information at all — so a schema lookup has to reach into the
     * registered class here in the renderer, where `cc` is loaded.
     *
     * The serialised field list alone is not enough: the engine stores `cc.Label`
     * text as `_string` and exposes it as the `string` accessor, and a caller has
     * to write the accessor name. So the accessors declared on the prototype chain
     * are merged in, and a backing field whose accessor is present is dropped.
     *
     * ponytail: reports attributes the engine records (type, default, visible,
     * range, enum options). An accessor carrying no editor attributes is still
     * listed, just with fewer fields filled in.
     */
    describeClass(className) {
        var _a, _b, _c, _d;
        try {
            const cc = require('cc');
            const name = className || '';
            if (!name) {
                return { success: false, error: 'className is required' };
            }
            const ctor = ((_a = cc.js) === null || _a === void 0 ? void 0 : _a.getClassByName) ? cc.js.getClassByName(name) : undefined;
            if (!ctor) {
                return { success: false, error: `Class '${name}' is not registered in the engine` };
            }
            const attrs = ((_c = (_b = cc.CCClass) === null || _b === void 0 ? void 0 : _b.Attr) === null || _c === void 0 ? void 0 : _c.getClassAttrs) ? cc.CCClass.Attr.getClassAttrs(ctor) : null;
            const describe = (prop, extra, fallbackKey) => {
                var _a, _b, _c, _d;
                // Attributes are split across the two keys: the accessor carries
                // `visible`/`displayOrder`, its backing field carries `default`.
                // Read the accessor first and fill the gaps from the field.
                const read = (suffix) => {
                    if (!attrs)
                        return undefined;
                    const own = attrs[`${prop}$_$${suffix}`];
                    if (own !== undefined)
                        return own;
                    return fallbackKey ? attrs[`${fallbackKey}$_$${suffix}`] : undefined;
                };
                const ctorAttr = read('ctor');
                const enumList = read('enumList');
                const rawDefault = read('default');
                // A default is sometimes an anonymous factory function (cc.Color and
                // friends). The engine object it builds does not survive the JSON hop
                // and the function itself is nameless, so call it once and report the
                // constructor name as the type.
                const isFactory = typeof rawDefault === 'function';
                let factoryType;
                if (isFactory) {
                    try {
                        factoryType = (_b = (_a = rawDefault()) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name;
                    }
                    catch (_e) {
                        // A factory needing arguments or engine state just yields no type.
                    }
                }
                const def = isFactory ? undefined : rawDefault;
                // The engine only records an explicit `type` for enums and object
                // references; a plain string/number/boolean has none, so infer it
                // from the default value rather than reporting nothing.
                const inferred = isFactory
                    ? factoryType
                    : def === null || def === undefined
                        ? undefined
                        : Array.isArray(def) ? 'Array' : typeof def;
                return Object.assign({ name: prop, type: (_d = (_c = read('type')) !== null && _c !== void 0 ? _c : (ctorAttr && ctorAttr.name)) !== null && _d !== void 0 ? _d : inferred, default: def, visible: read('visible'), readonly: read('readonly'), tooltip: read('tooltip'), range: read('range'), 
                    // Enum options come back as {name, value} rows; keep just the
                    // names so the payload stays small.
                    enumOptions: Array.isArray(enumList)
                        ? enumList.map((e) => e === null || e === void 0 ? void 0 : e.name).filter(Boolean)
                        : undefined }, extra);
            };
            // Public accessors walked off the prototype chain — these are the names
            // a caller actually writes.
            const accessors = new Map();
            let proto = ctor.prototype;
            while (proto && proto !== Object.prototype) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor' || key.startsWith('_') || accessors.has(key))
                        continue;
                    const desc = Object.getOwnPropertyDescriptor(proto, key);
                    if (desc && desc.get) {
                        accessors.set(key, { settable: !!desc.set });
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }
            // Serialised fields. A backing field is skipped when its accessor is
            // present, so `_string` does not shadow `string`.
            const fields = ctor.__values__ || [];
            const shadowed = new Set(fields.filter((f) => f.startsWith('_') && accessors.has(f.slice(1))));
            const properties = fields
                .filter((f) => !shadowed.has(f))
                .map((f) => describe(f, { serialized: true }));
            for (const [key, info] of accessors) {
                const backing = `_${key}`;
                properties.push(describe(key, { accessor: true, readonly: !info.settable }, shadowed.has(backing) ? backing : undefined));
            }
            return {
                success: true,
                data: {
                    name,
                    extends: ((_d = Object.getPrototypeOf(ctor)) === null || _d === void 0 ? void 0 : _d.name) || undefined,
                    propertyCount: properties.length,
                    properties
                }
            };
        }
        catch (error) {
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
        }
    },
    /**
     * Capture the transform/visibility state of the given nodes so a failed batch
     * can be undone. The editor exposes no undo message, so this is a deliberately
     * narrow hand-rolled substitute.
     *
     * ponytail: records transform, active flag and name only — enough to undo the
     * property writes a batch typically makes. It cannot restore created or deleted
     * nodes, component add/remove, or asset writes. To cover those, snapshot the
     * serialized subtree instead and re-instantiate on restore.
     */
    snapshotNodes(uuids) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const list = uuids || [];
            const nodes = [];
            const missing = [];
            for (const uuid of list) {
                const node = findNodeDeep(scene, uuid);
                if (!node) {
                    missing.push(uuid);
                    continue;
                }
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    position: { x: node.position.x, y: node.position.y, z: node.position.z },
                    rotation: { x: node.eulerAngles.x, y: node.eulerAngles.y, z: node.eulerAngles.z },
                    scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
                    parentUuid: node.parent ? node.parent.uuid : null,
                    siblingIndex: typeof node.getSiblingIndex === 'function' ? node.getSiblingIndex() : null
                });
            }
            return { success: true, data: { nodes, missing, capturedAt: Date.now() } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    /**
     * Restore a snapshot produced by snapshotNodes. Nodes that no longer exist are
     * reported rather than silently skipped, since that means the rollback is partial.
     */
    restoreNodes(snapshot) {
        try {
            const { director, Vec3 } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const nodes = (snapshot && snapshot.nodes) || [];
            const restored = [];
            const missing = [];
            for (const saved of nodes) {
                const node = findNodeDeep(scene, saved.uuid);
                if (!node) {
                    missing.push(saved.uuid);
                    continue;
                }
                node.name = saved.name;
                node.active = saved.active;
                node.setPosition(new Vec3(saved.position.x, saved.position.y, saved.position.z));
                node.setRotationFromEuler(saved.rotation.x, saved.rotation.y, saved.rotation.z);
                node.setScale(new Vec3(saved.scale.x, saved.scale.y, saved.scale.z));
                if (saved.siblingIndex !== null && typeof node.setSiblingIndex === 'function') {
                    node.setSiblingIndex(saved.siblingIndex);
                }
                restored.push(saved.uuid);
            }
            return {
                success: missing.length === 0,
                data: { restored, missing },
                error: missing.length > 0
                    ? `Rollback incomplete: ${missing.length} node(s) no longer exist and were not restored`
                    : undefined
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
};
/** Recursively find a node by UUID anywhere under root (getChildByUuid is not recursive). */
function findNodeDeep(root, uuid) {
    if (!root || !uuid) {
        return null;
    }
    if (root.uuid === uuid) {
        return root;
    }
    const children = root.children || [];
    for (const child of children) {
        const found = findNodeDeep(child, uuid);
        if (found) {
            return found;
        }
    }
    return null;
}
/** Wait N rendered frames in the scene process before reading back pixels. */
function waitFrames(n) {
    const g = globalThis;
    const raf = typeof g.requestAnimationFrame === 'function'
        ? g.requestAnimationFrame.bind(g)
        : (cb) => setTimeout(cb, 16);
    return new Promise((resolve) => {
        let count = 0;
        const tick = () => {
            count++;
            if (count >= n) {
                resolve();
            }
            else {
                raf(tick);
            }
        };
        raf(tick);
    });
}
/**
 * Build a canvas from raw RGBA bytes (OpenGL bottom-left origin), flipping
 * vertically so the image is upright. Uses the scene process DOM canvas, which
 * the WebGL engine renderer always provides.
 */
function buildFlippedCanvas(raw, width, height) {
    const g = globalThis;
    const doc = g.document;
    if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('document/canvas not available in scene context for PNG encoding');
    }
    const canvas = doc.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(width, height);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
        const srcStart = (height - 1 - y) * rowBytes;
        img.data.set(raw.subarray(srcStart, srcStart + rowBytes), y * rowBytes);
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}
/** Encode a canvas to base64 PNG (no data URL prefix). */
function canvasToPngBase64(canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
}
/** Downscale (never upscale) a canvas to fit within maxWidth x maxHeight, preserving aspect ratio, and encode as base64 PNG. */
function resizeCanvasToPngBase64(canvas, maxWidth, maxHeight) {
    const g = globalThis;
    const doc = g.document;
    const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height);
    const outWidth = Math.max(1, Math.round(canvas.width * scale));
    const outHeight = Math.max(1, Math.round(canvas.height * scale));
    if (scale >= 1) {
        return { base64: canvasToPngBase64(canvas), width: canvas.width, height: canvas.height };
    }
    const outCanvas = doc.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const ctx = outCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, outWidth, outHeight);
    return { base64: canvasToPngBase64(outCanvas), width: outWidth, height: outHeight };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFNUMsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOztPQUVHO0lBQ0gsa0JBQWtCLENBQUMsUUFBZ0IsRUFBRSxhQUFxQjtRQUN0RCxJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNULE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3hELENBQUM7WUFFRCxvQkFBb0I7WUFDcEIsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM1QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1IsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixRQUFRLFlBQVksRUFBRSxDQUFDO1lBQzdFLENBQUM7WUFFRCxzQkFBc0I7WUFDdEIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN4RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxrQkFBa0IsYUFBYSxZQUFZLEVBQUUsQ0FBQztZQUNsRixDQUFDO1lBRUQsZ0JBQWdCO1lB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ZXNDb250ZW50IjpbImltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbm1vZHVsZS5wYXRocy5wdXNoKGpvaW4oRWRpdG9yLkFwcC5wYXRoLCAnbm9kZV9tb2R1bGVzJykpO1xuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuICAgIC8qKlxuICAgICAqIEFkZCBjb21wb25lbnQgdG8gYSBub2RlXG4gICAgICovXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIG5vZGUgYnkgVVVJRFxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBjbGFzc1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjb21wb25lbnRJZDogY29tcG9uZW50LnV1aWQgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IG5vZGVcbiAgICAgKi9cbiAgICBjcmVhdGVOb2RlKG5hbWU6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgTm9kZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgTm9kZShuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChwYXJlbnRVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTm9kZSAke25hbWV9IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBub2RlIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IG5vZGUucm90YXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiBub2RlLnNjYWxlLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogbm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IGNoaWxkLnV1aWQpLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBub2RlcyBpbiBzY2VuZVxuICAgICAqL1xuICAgIGdldEFsbE5vZGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgY29sbGVjdE5vZGVzID0gKG5vZGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlLnBhcmVudD8udXVpZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQ6IGFueSkgPT4gY29sbGVjdE5vZGVzKGNoaWxkKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY2VuZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZDogYW55KSA9PiBjb2xsZWN0Tm9kZXMoY2hpbGQpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbm9kZXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBub2RlIGJ5IG5hbWVcbiAgICAgKi9cbiAgICBmaW5kTm9kZUJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggbmFtZSAke25hbWV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgc2NlbmUgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBnZXRDdXJyZW50U2NlbmVJbmZvKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHNjZW5lLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogc2NlbmUuY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IG5vZGUgcHJvcGVydHlcbiAgICAgKi9cbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2YWx1ZS54IHx8IDAsIHZhbHVlLnkgfHwgMCwgdmFsdWUueiB8fCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdyb3RhdGlvbicpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3NjYWxlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0U2NhbGUodmFsdWUueCB8fCAxLCB2YWx1ZS55IHx8IDEsIHZhbHVlLnogfHwgMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuYWN0aXZlID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbmFtZScpIHtcbiAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHNldHRpbmcgcHJvcGVydHkgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkIHN1Y2Nlc3NmdWxseWAgXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2NlbmUgaGllcmFyY2h5XG4gICAgICovXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NOb2RlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVDb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoY29tcDogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY29tcC5jb25zdHJ1Y3Rvci5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IHByb2Nlc3NOb2RlKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHNjZW5lLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGhpZXJhcmNoeSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBwcmVmYWIgZnJvbSBhIG5vZGUgYnkgZGVsZWdhdGluZyB0byB0aGUgZW5naW5lJ3Mgb2ZmaWNpYWxcbiAgICAgKiBQcmVmYWJNYW5hZ2VyIChjY2UuUHJlZmFiLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUpLiBSZXBsaWNhdGVzIHRoZVxuICAgICAqIGVkaXRvcidzIFwiZHJhZyBub2RlIHRvIEFzc2V0c1wiIGZsb3cg4oCUIGhhbmRsZXMgc2NyaXB0IF9fdHlwZV9fIGNvbXByZXNzaW9uLFxuICAgICAqIEBwcm9wZXJ0eSByZWYgc2VyaWFsaXphdGlvbiwgYW5kIHNvdXJjZS1ub2RlIHJlbGlua2luZy5cbiAgICAgKi9cbiAgICAvKipcbiAgICAgKiBSZXZlcnQgYSBwcmVmYWIgaW5zdGFuY2UgdG8gbWF0Y2ggaXRzIHNvdXJjZSBhc3NldCBieSBkZWxlZ2F0aW5nIHRvXG4gICAgICogY2NlLlByZWZhYi5yZXZlcnRQcmVmYWIuIE5vIHB1YmxpYyBzY2VuZSBtZXNzYWdlIGV4aXN0cyBmb3IgdGhpcy5cbiAgICAgKi9cbiAgICBhc3luYyByZXZlcnRQcmVmYWJJbnN0YW5jZShub2RlVXVpZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZ3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZT8uUHJlZmFiO1xuICAgICAgICAgICAgaWYgKCFtZ3IgfHwgdHlwZW9mIG1nci5yZXZlcnRQcmVmYWIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdjY2UuUHJlZmFiLnJldmVydFByZWZhYiBub3QgYXZhaWxhYmxlIGluIHRoaXMgQ29jb3MgQ3JlYXRvciB2ZXJzaW9uJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhcHBsaWVkID0gYXdhaXQgbWdyLnJldmVydFByZWZhYihub2RlVXVpZCk7XG4gICAgICAgICAgICAvLyBFbmdpbmUgcmV0dXJucyBmYWxzZSB3aGVuIHRoZSBub2RlIGhhcyBubyBvdmVycmlkZXMgdG8gcmV2ZXJ0IOKAlFxuICAgICAgICAgICAgLy8gbm90IGFuIGVycm9yLCBqdXN0IGEgbm8tb3AuIFN1cmZhY2UgaXQgc28gY2FsbGVycyBjYW4gZGlzdGluZ3Vpc2guXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBhcHBsaWVkOiBhcHBsaWVkICE9PSBmYWxzZSB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIGNyZWF0ZVByZWZhYkZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIHVybDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZ3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZT8uUHJlZmFiO1xuICAgICAgICAgICAgaWYgKCFtZ3IgfHwgdHlwZW9mIG1nci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnY2NlLlByZWZhYi5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBDb2NvcyBDcmVhdG9yIHZlcnNpb24nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJlZmFiVXVpZCA9IGF3YWl0IG1nci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlKG5vZGVVdWlkLCB1cmwpO1xuICAgICAgICAgICAgaWYgKCFwcmVmYWJVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSByZXR1cm5lZCBudWxsL3VuZGVmaW5lZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHByZWZhYlV1aWQsIHVybCwgc291cmNlTm9kZVV1aWQ6IG5vZGVVdWlkIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgY3VycmVudGx5LW9wZW4gc2NlbmUvcHJlZmFiIHRvIGEgUE5HIChyZXR1cm5lZCBhcyBiYXNlNjQpIHVzaW5nIGFuXG4gICAgICogb2Zmc2NyZWVuIGNsb25lIENhbWVyYSArIFJlbmRlclRleHR1cmUuIFRoaXMgcHJvZHVjZXMgYSBDTEVBTiBpbWFnZSAobm8gZWRpdG9yXG4gICAgICogZ2l6bW9zL2dyaWQpIGFuZCBuZXZlciBtdXRhdGVzIHRoZSBleGlzdGluZyBjYW1lcmFzIOKAlCBhIHRlbXBvcmFyeSwgaGlkZGVuLFxuICAgICAqIG5vbi1wZXJzaXN0ZWQgY2FtZXJhIG5vZGUgaXMgY3JlYXRlZCwgdXNlZCBmb3IgMS0yIGZyYW1lcywgdGhlbiBkZXN0cm95ZWQuXG4gICAgICpcbiAgICAgKiBvcHRzOiB7XG4gICAgICogICBtb2RlOiAnc2NlbmUnIHwgJ2NhbWVyYScgfCAnbm9kZScsXG4gICAgICogICBjYW1lcmFVdWlkPzogc3RyaW5nLCAgIC8vIGZvciBtb2RlICdjYW1lcmEnXG4gICAgICogICBub2RlVXVpZD86IHN0cmluZywgICAgIC8vIGZvciBtb2RlICdub2RlJ1xuICAgICAqICAgd2lkdGg/OiBudW1iZXIsICAgICAgICAvLyAxLi4yMDQ4LCBkZWZhdWx0IDE5MjBcbiAgICAgKiAgIGhlaWdodD86IG51bWJlciwgICAgICAgLy8gMS4uMjA0OCwgZGVmYXVsdCAxMDgwXG4gICAgICogICBiYWNrZ3JvdW5kQ29sb3I/OiB7IHIsIGcsIGIsIGEgfSAgLy8gMC4uMjU1LCBkZWZhdWx0IG9wYXF1ZSBibGFja1xuICAgICAqIH1cbiAgICAgKiBvcHRzLnByZXZpZXdNYXhXaWR0aC9wcmV2aWV3TWF4SGVpZ2h0IChib3RoIHJlcXVpcmVkIHRvZ2V0aGVyKTogYWxzbyByZXR1cm4gYSBkb3duc2NhbGVkXG4gICAgICogcHJldmlld0Jhc2U2NCAobmV2ZXIgdXBzY2FsZWQpIGZpdHRpbmcgd2l0aGluIHRob3NlIGJvdW5kcywgYWxvbmdzaWRlIHByZXZpZXdXaWR0aC9wcmV2aWV3SGVpZ2h0LlxuICAgICAqIFJldHVybnMgeyBzdWNjZXNzLCBkYXRhOiB7IHBuZ0Jhc2U2NCwgd2lkdGgsIGhlaWdodCwgbW9kZSwgY2FtZXJhTm9kZVV1aWQsIGNhbWVyYU5vZGVOYW1lLCBtYXBwaW5nLCBwcmV2aWV3QmFzZTY0PywgcHJldmlld1dpZHRoPywgcHJldmlld0hlaWdodD8gfSB9LlxuICAgICAqL1xuICAgIGFzeW5jIGNhcHR1cmVTY2VuZVZpZXcob3B0czogYW55KSB7XG4gICAgICAgIGxldCBjbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIENhbWVyYSwgUmVuZGVyVGV4dHVyZSwgTm9kZSwgVmVjMywgUXVhdCwgQ29sb3IsIENDT2JqZWN0LCBVSVRyYW5zZm9ybSB9ID0gY2M7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJywgaW5zdHJ1Y3Rpb246ICdPcGVuIGEgc2NlbmUgZmlyc3QgdmlhIHNjZW5lX21hbmFnZW1lbnQoYWN0aW9uPVwib3BlblwiIG9yIFwiY3JlYXRlXCIpLicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3B0cyA9IG9wdHMgfHwge307XG4gICAgICAgICAgICBjb25zdCBtb2RlID0gb3B0cy5tb2RlIHx8ICdzY2VuZSc7XG4gICAgICAgICAgICBjb25zdCB3aWR0aCA9IE1hdGgubWF4KDEsIE1hdGgubWluKDIwNDgsIE1hdGguZmxvb3Iob3B0cy53aWR0aCB8fCAxOTIwKSkpO1xuICAgICAgICAgICAgY29uc3QgaGVpZ2h0ID0gTWF0aC5tYXgoMSwgTWF0aC5taW4oMjA0OCwgTWF0aC5mbG9vcihvcHRzLmhlaWdodCB8fCAxMDgwKSkpO1xuICAgICAgICAgICAgY29uc3QgYmcgPSBvcHRzLmJhY2tncm91bmRDb2xvciB8fCB7IHI6IDAsIGc6IDAsIGI6IDAsIGE6IDI1NSB9O1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBDYW1lcmEgY29tcG9uZW50cyBpbiB0aGUgc2NlbmUuXG4gICAgICAgICAgICBjb25zdCBjYW1lcmFzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgY29sbGVjdCA9IChuOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIW4pIHsgcmV0dXJuOyB9XG4gICAgICAgICAgICAgICAgaWYgKG4uZ2V0Q29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGMgPSBuLmdldENvbXBvbmVudChDYW1lcmEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYykgeyBjYW1lcmFzLnB1c2goYyk7IH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgKG4uY2hpbGRyZW4gfHwgW10pLmZvckVhY2goY29sbGVjdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgc2NlbmUuY2hpbGRyZW4uZm9yRWFjaChjb2xsZWN0KTtcblxuICAgICAgICAgICAgY29uc3QgcGlja01haW4gPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdXNhYmxlID0gY2FtZXJhcy5maWx0ZXIoKGM6IGFueSkgPT4gYy5lbmFibGVkSW5IaWVyYXJjaHkgIT09IGZhbHNlICYmICFjLnRhcmdldFRleHR1cmUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSB1c2FibGUubGVuZ3RoID8gdXNhYmxlIDogY2FtZXJhcztcbiAgICAgICAgICAgICAgICBjb25zdCBvcnRobyA9IGxpc3QuZmluZCgoYzogYW55KSA9PiBjLnByb2plY3Rpb24gPT09IENhbWVyYS5Qcm9qZWN0aW9uVHlwZS5PUlRITyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG9ydGhvIHx8IGxpc3RbMF0gfHwgbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFJlc29sdmUgdGhlIHBhcmFtZXRlcnMgb2YgdGhlIGNhbWVyYSB3ZSB3aWxsIHJlbmRlciB3aXRoLlxuICAgICAgICAgICAgbGV0IHdvcmxkUG9zOiBhbnk7XG4gICAgICAgICAgICBsZXQgd29ybGRSb3Q6IGFueTtcbiAgICAgICAgICAgIGxldCBwcm9qZWN0aW9uOiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgb3J0aG9IZWlnaHQ6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBmb3Y6IG51bWJlcjtcbiAgICAgICAgICAgIGxldCBuZWFyOiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgZmFyOiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgdmlzaWJpbGl0eTogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG4gICAgICAgICAgICBsZXQgc3JjVXVpZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgbGV0IHNyY05hbWU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdub2RlJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZURlZXAoc2NlbmUsIG9wdHMubm9kZVV1aWQpO1xuICAgICAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke29wdHMubm9kZVV1aWR9IG5vdCBmb3VuZGAsIGluc3RydWN0aW9uOiAnVXNlIHNjZW5lX21hbmFnZW1lbnQoYWN0aW9uPVwiZ2V0X2hpZXJhcmNoeVwiKSBvciBub2RlX2xpZmVjeWNsZShhY3Rpb249XCJnZXRfaW5mb1wiKSB0byBmaW5kIGEgdmFsaWQgVVVJRC4nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHV0ID0gbm9kZS5nZXRDb21wb25lbnQoVUlUcmFuc2Zvcm0pO1xuICAgICAgICAgICAgICAgIGlmICghdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY2FwdHVyZV9ub2RlIHJlcXVpcmVzIHRoZSBub2RlIHRvIGhhdmUgYSBVSVRyYW5zZm9ybSAoMkQgbm9kZSknLCBpbnN0cnVjdGlvbjogJ1VzZSBjYXB0dXJlX3NjZW5lIG9yIGNhcHR1cmVfY2FtZXJhIGZvciAzRCBub2RlcyBpbnN0ZWFkLicgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdCA9IHV0LmdldEJvdW5kaW5nQm94VG9Xb3JsZCgpOyAvLyB3b3JsZC1zcGFjZSBSZWN0IHt4LCB5LCB3aWR0aCwgaGVpZ2h0fVxuICAgICAgICAgICAgICAgIGlmICghcmVjdCB8fCByZWN0LndpZHRoIDw9IDAgfHwgcmVjdC5oZWlnaHQgPD0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdOb2RlIGhhcyB6ZXJvLXNpemUgd29ybGQgYm91bmRpbmcgYm94JywgaW5zdHJ1Y3Rpb246ICdUaGUgbm9kZSAob3IgYWxsIGl0cyBjaGlsZHJlbikgaGFzIGEgemVyby1zaXplIFVJVHJhbnNmb3JtLiBTZXQgYSBub24temVybyBjb250ZW50U2l6ZSwgb3IgY2FwdHVyZSBhIGRpZmZlcmVudCBub2RlLicgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmID0gcGlja01haW4oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdBc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0QXNwZWN0ID0gcmVjdC53aWR0aCAvIHJlY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIC8vIEZpdC1jb250YWluIHRoZSBub2RlJ3MgYmJveCBpbnNpZGUgdGhlIG91dHB1dCBhc3BlY3QuXG4gICAgICAgICAgICAgICAgb3J0aG9IZWlnaHQgPSByZWN0QXNwZWN0ID4gaW1nQXNwZWN0ID8gKHJlY3Qud2lkdGggLyBpbWdBc3BlY3QpIC8gMiA6IHJlY3QuaGVpZ2h0IC8gMjtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW1aID0gcmVmID8gcmVmLm5vZGUud29ybGRQb3NpdGlvbi56IDogMTAwMDtcbiAgICAgICAgICAgICAgICB3b3JsZFBvcyA9IG5ldyBWZWMzKHJlY3QueCArIHJlY3Qud2lkdGggLyAyLCByZWN0LnkgKyByZWN0LmhlaWdodCAvIDIsIGNhbVopO1xuICAgICAgICAgICAgICAgIHdvcmxkUm90ID0gbmV3IFF1YXQoKTtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uID0gQ2FtZXJhLlByb2plY3Rpb25UeXBlLk9SVEhPO1xuICAgICAgICAgICAgICAgIGZvdiA9IDQ1O1xuICAgICAgICAgICAgICAgIG5lYXIgPSByZWYgPyByZWYubmVhciA6IDE7XG4gICAgICAgICAgICAgICAgZmFyID0gcmVmID8gcmVmLmZhciA6IDIwMDA7XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eSA9IHJlZiA/IHJlZi52aXNpYmlsaXR5IDogbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHNyYzogYW55O1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbiA9IGZpbmROb2RlRGVlcChzY2VuZSwgb3B0cy5jYW1lcmFVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ2FtZXJhIG5vZGUgd2l0aCBVVUlEICR7b3B0cy5jYW1lcmFVdWlkfSBub3QgZm91bmRgLCBpbnN0cnVjdGlvbjogJ1VzZSBzY2VuZV9tYW5hZ2VtZW50KGFjdGlvbj1cImdldF9oaWVyYXJjaHlcIikgdG8gZmluZCBhIHZhbGlkIGNhbWVyYSBub2RlIFVVSUQuJyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IGNuLmdldENvbXBvbmVudChDYW1lcmEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSAke29wdHMuY2FtZXJhVXVpZH0gaGFzIG5vIENhbWVyYSBjb21wb25lbnRgLCBpbnN0cnVjdGlvbjogJ1Bhc3MgdGhlIFVVSUQgb2YgYSBub2RlIHRoYXQgaGFzIGEgQ2FtZXJhIGNvbXBvbmVudCBhdHRhY2hlZCwgb3IgdXNlIGNhcHR1cmVfc2NlbmUgdG8gYXV0by1waWNrIG9uZS4nIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzcmMgPSBwaWNrTWFpbigpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNyYykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQ2FtZXJhIGNvbXBvbmVudCBmb3VuZCBpbiB0aGUgY3VycmVudCBzY2VuZScsIGluc3RydWN0aW9uOiAnQWRkIGEgQ2FtZXJhIGNvbXBvbmVudCB0byBhIG5vZGUsIG9yIHVzZSBjYXB0dXJlX2NhbWVyYS9jYXB0dXJlX25vZGUgd2l0aCBhbiBleHBsaWNpdCB0YXJnZXQuJyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdvcmxkUG9zID0gc3JjLm5vZGUuZ2V0V29ybGRQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIHdvcmxkUm90ID0gc3JjLm5vZGUuZ2V0V29ybGRSb3RhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb24gPSBzcmMucHJvamVjdGlvbjtcbiAgICAgICAgICAgICAgICBvcnRob0hlaWdodCA9IHNyYy5vcnRob0hlaWdodDtcbiAgICAgICAgICAgICAgICBmb3YgPSBzcmMuZm92O1xuICAgICAgICAgICAgICAgIG5lYXIgPSBzcmMubmVhcjtcbiAgICAgICAgICAgICAgICBmYXIgPSBzcmMuZmFyO1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHkgPSBzcmMudmlzaWJpbGl0eTtcbiAgICAgICAgICAgICAgICBzcmNVdWlkID0gc3JjLm5vZGUudXVpZDtcbiAgICAgICAgICAgICAgICBzcmNOYW1lID0gc3JjLm5vZGUubmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT2Zmc2NyZWVuIHJlbmRlciB0YXJnZXQuXG4gICAgICAgICAgICBjb25zdCBydCA9IG5ldyBSZW5kZXJUZXh0dXJlKCk7XG4gICAgICAgICAgICBydC5yZXNldCh7IHdpZHRoLCBoZWlnaHQgfSk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyeSBjbG9uZSBjYW1lcmEg4oCUIGhpZGRlbiwgbm90IHNhdmVkLCBhdXRvLXJlbW92ZWQgYWZ0ZXIgY2FwdHVyZS5cbiAgICAgICAgICAgIGNvbnN0IGNhbU5vZGUgPSBuZXcgTm9kZSgnX19tY3BfY2FwdHVyZV9jYW1fXycpO1xuICAgICAgICAgICAgY2FtTm9kZS5oaWRlRmxhZ3MgPSBDQ09iamVjdC5GbGFncy5Eb250U2F2ZSB8IENDT2JqZWN0LkZsYWdzLkhpZGVJbkhpZXJhcmNoeSB8IENDT2JqZWN0LkZsYWdzLkRvbnREZXN0cm95O1xuICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQoY2FtTm9kZSk7XG4gICAgICAgICAgICBjYW1Ob2RlLnNldFdvcmxkUG9zaXRpb24od29ybGRQb3MpO1xuICAgICAgICAgICAgY2FtTm9kZS5zZXRXb3JsZFJvdGF0aW9uKHdvcmxkUm90KTtcbiAgICAgICAgICAgIGNvbnN0IGNhbSA9IGNhbU5vZGUuYWRkQ29tcG9uZW50KENhbWVyYSk7XG4gICAgICAgICAgICBjYW0ucHJvamVjdGlvbiA9IHByb2plY3Rpb247XG4gICAgICAgICAgICBjYW0ub3J0aG9IZWlnaHQgPSBvcnRob0hlaWdodDtcbiAgICAgICAgICAgIGNhbS5mb3YgPSBmb3Y7XG4gICAgICAgICAgICBjYW0ubmVhciA9IG5lYXI7XG4gICAgICAgICAgICBjYW0uZmFyID0gZmFyO1xuICAgICAgICAgICAgaWYgKHZpc2liaWxpdHkgIT09IG51bGwgJiYgdmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FtLnZpc2liaWxpdHkgPSB2aXNpYmlsaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FtLmNsZWFyRmxhZ3MgPSBDYW1lcmEuQ2xlYXJGbGFnLlNPTElEX0NPTE9SO1xuICAgICAgICAgICAgY2FtLmNsZWFyQ29sb3IgPSBuZXcgQ29sb3IoYmcuciwgYmcuZywgYmcuYiwgYmcuYSA9PT0gdW5kZWZpbmVkID8gMjU1IDogYmcuYSk7XG4gICAgICAgICAgICBjYW0udGFyZ2V0VGV4dHVyZSA9IHJ0O1xuXG4gICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7IGNhbS50YXJnZXRUZXh0dXJlID0gbnVsbDsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgIHRyeSB7IGNhbU5vZGUuZGVzdHJveSgpOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICAgICAgdHJ5IHsgcnQuZGVzdHJveSgpOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBEcml2ZSB0aGUgcmVuZGVyIHBpcGVsaW5lIHNvIHRoZSBvZmZzY3JlZW4gY2FtZXJhIGFjdHVhbGx5IGRyYXdzIGludG9cbiAgICAgICAgICAgIC8vIHRoZSBSVC4gSW4gZWRpdG9yIGVkaXQtbW9kZSB0aGUgYXV0byBsb29wIGRvZXMgbm90IHJlbGlhYmx5IHJlbmRlciBhblxuICAgICAgICAgICAgLy8gb2Zmc2NyZWVuIGNhbWVyYSB3aXRoaW4gYSBjb3VwbGUgb2YgZnJhbWVzLCBzbyB3ZSBmb3JjZSBmcmFtZXMgdmlhXG4gICAgICAgICAgICAvLyBkaXJlY3Rvci5yb290LmZyYW1lTW92ZSBhbmQgYWxzbyB3YWl0IHJlYWwgZnJhbWVzIGFzIGEgZmFsbGJhY2suXG4gICAgICAgICAgICBjb25zdCByb290ID0gZGlyZWN0b3Iucm9vdDtcbiAgICAgICAgICAgIGNvbnN0IGNhbkZvcmNlUmVuZGVyID0gISEocm9vdCAmJiB0eXBlb2Ygcm9vdC5mcmFtZU1vdmUgPT09ICdmdW5jdGlvbicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoY2FtLmNhbWVyYSAmJiB0eXBlb2YgY2FtLmNhbWVyYS51cGRhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FtLmNhbWVyYS51cGRhdGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuXG4gICAgICAgICAgICBhd2FpdCB3YWl0RnJhbWVzKDEpO1xuICAgICAgICAgICAgaWYgKGNhbkZvcmNlUmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcm9vdC5mcmFtZU1vdmUoMCk7IHJvb3QuZnJhbWVNb3ZlKDApOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCB3YWl0RnJhbWVzKDEpO1xuICAgICAgICAgICAgaWYgKGNhbkZvcmNlUmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcm9vdC5mcmFtZU1vdmUoMCk7IH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF3ID0gcnQucmVhZFBpeGVscygpOyAvLyBSR0JBIGJ5dGVzLCBPcGVuR0wgb3JpZ2luIChib3R0b20tbGVmdClcbiAgICAgICAgICAgIGlmICghcmF3IHx8IHJhdy5sZW5ndGggPCB3aWR0aCAqIGhlaWdodCAqIDQpIHtcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgY2xlYW51cCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAncmVhZFBpeGVscyByZXR1cm5lZCBuby9pbnN1ZmZpY2llbnQgZGF0YScsIGluc3RydWN0aW9uOiAnVGhlIHJlbmRlciB0YXJnZXQgbGlrZWx5IHByb2R1Y2VkIG5vIGZyYW1lcy4gUmV0cnk7IGlmIGl0IHBlcnNpc3RzLCByZWR1Y2Ugd2lkdGgvaGVpZ2h0IG9yIGNoZWNrIEdQVSByZWFkYmFjayBzdXBwb3J0LicgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY2FudmFzID0gYnVpbGRGbGlwcGVkQ2FudmFzKHJhdywgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgICAgICBjb25zdCBwbmdCYXNlNjQgPSBjYW52YXNUb1BuZ0Jhc2U2NChjYW52YXMpO1xuICAgICAgICAgICAgbGV0IHByZXZpZXdCYXNlNjQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBwcmV2aWV3V2lkdGg6IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBwcmV2aWV3SGVpZ2h0OiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBpZiAob3B0cy5wcmV2aWV3TWF4V2lkdGggJiYgb3B0cy5wcmV2aWV3TWF4SGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcHJldmlldyA9IHJlc2l6ZUNhbnZhc1RvUG5nQmFzZTY0KGNhbnZhcywgb3B0cy5wcmV2aWV3TWF4V2lkdGgsIG9wdHMucHJldmlld01heEhlaWdodCk7XG4gICAgICAgICAgICAgICAgcHJldmlld0Jhc2U2NCA9IHByZXZpZXcuYmFzZTY0O1xuICAgICAgICAgICAgICAgIHByZXZpZXdXaWR0aCA9IHByZXZpZXcud2lkdGg7XG4gICAgICAgICAgICAgICAgcHJldmlld0hlaWdodCA9IHByZXZpZXcuaGVpZ2h0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB3YyA9IGNhbU5vZGUuZ2V0V29ybGRQb3NpdGlvbigpO1xuICAgICAgICAgICAgY29uc3Qgd29ybGRVbml0c1BlclBpeGVsID0gKDIgKiBvcnRob0hlaWdodCkgLyBoZWlnaHQ7XG4gICAgICAgICAgICBjb25zdCBtYXBwaW5nID0gcHJvamVjdGlvbiA9PT0gQ2FtZXJhLlByb2plY3Rpb25UeXBlLk9SVEhPID8ge1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb246ICdvcnRobycsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJYOiB3Yy54LFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWTogd2MueSxcbiAgICAgICAgICAgICAgICB3b3JsZFVuaXRzUGVyUGl4ZWwsXG4gICAgICAgICAgICAgICAgaW1hZ2VXaWR0aDogd2lkdGgsXG4gICAgICAgICAgICAgICAgaW1hZ2VIZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgICAgICBmb3JtdWxhOiAncHggPSBpbWdXLzIgKyAod29ybGRYIC0gd29ybGRDZW50ZXJYKS93b3JsZFVuaXRzUGVyUGl4ZWwgOyBweSA9IGltZ0gvMiAtICh3b3JsZFkgLSB3b3JsZENlbnRlclkpL3dvcmxkVW5pdHNQZXJQaXhlbCdcbiAgICAgICAgICAgIH0gOiB7XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbjogJ3BlcnNwZWN0aXZlJyxcbiAgICAgICAgICAgICAgICB3b3JsZENlbnRlclg6IHdjLngsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJZOiB3Yy55LFxuICAgICAgICAgICAgICAgIGltYWdlV2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgICAgIGltYWdlSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgZm9ybXVsYTogJ3BlcnNwZWN0aXZlIHByb2plY3Rpb246IHBpeGVsIG1hcHBpbmcgaXMgbm9uLWxpbmVhciwgdXNlIGZvciB2aXN1YWwgY29tcGFyaXNvbiBvbmx5J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgY2xlYW51cCA9IG51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHBuZ0Jhc2U2NCwgd2lkdGgsIGhlaWdodCwgbW9kZSxcbiAgICAgICAgICAgICAgICAgICAgY2FtZXJhTm9kZVV1aWQ6IHNyY1V1aWQsIGNhbWVyYU5vZGVOYW1lOiBzcmNOYW1lLCBtYXBwaW5nLFxuICAgICAgICAgICAgICAgICAgICBwcmV2aWV3QmFzZTY0LCBwcmV2aWV3V2lkdGgsIHByZXZpZXdIZWlnaHRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBpZiAoY2xlYW51cCkgeyBjbGVhbnVwKCk7IH1cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpYWdub3N0aWMgcHJvYmUgZm9yIHRoZSBpbnRlcm5hbCBgY2NlLjxuYW1lc3BhY2U+YCBlbmdpbmUgbWFuYWdlcnMgKGUuZy4gUHJlZmFiLFxuICAgICAqIE5vZGUsIFNjZW5lKSB0aGF0IGFyZW4ndCBleHBvc2VkIHZpYSB0aGUgbm9ybWFsIEVkaXRvci5NZXNzYWdlIHByb3RvY29sLiBSZXBvcnRzXG4gICAgICogd2hpY2ggbWV0aG9kcyBleGlzdCBvbiB0aGUgZ2l2ZW4gbmFtZXNwYWNlICh1bmRvY3VtZW50ZWQsIHZhcmllcyBieSBDcmVhdG9yIGJ1aWxkKSxcbiAgICAgKiBwbHVzIG9wdGlvbmFsbHkgYSBsaXZlIG5vZGUncyByYXcgYF9wcmVmYWJgIChQcmVmYWJJbmZvKSBzdGF0ZS4gUmVhZC1vbmx5OyBtYWtlcyBub1xuICAgICAqIHNjZW5lIGNoYW5nZXMuIE9yaWdpbmFsbHkgd3JpdHRlbiB0byBpbnZlc3RpZ2F0ZSB0aGUgXCJpbnN0YW50aWF0ZSBsb3NlcyBfcHJlZmFiXG4gICAgICogbGlua1wiIGJ1ZyDigJQga2VwdCBnZW5lcmljIHNvIGl0IGNhbiBiZSByZXVzZWQgZm9yIG90aGVyIGNjZS4qIGludmVzdGlnYXRpb25zLlxuICAgICAqL1xuICAgIHByb2JlQ2NlQXBpKG5hbWVzcGFjZT86IHN0cmluZyB8IG51bGwsIG5vZGVVdWlkPzogc3RyaW5nIHwgbnVsbCkge1xuICAgICAgICAvLyBleGVjdXRlLXNjZW5lLXNjcmlwdCBzZXJpYWxpemVzIGFyZ3MgdGhyb3VnaCBKU09OLCB0dXJuaW5nIGB1bmRlZmluZWRgIGludG8gYG51bGxgLFxuICAgICAgICAvLyBzbyBhIGRlZmF1bHQgcGFyYW1ldGVyIChgPSAnUHJlZmFiJ2ApIG5ldmVyIGtpY2tzIGluIOKAlCBub3JtYWxpemUgZXhwbGljaXRseSBpbnN0ZWFkLlxuICAgICAgICBuYW1lc3BhY2UgPSBuYW1lc3BhY2UgfHwgJ1ByZWZhYic7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZ3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZT8uW25hbWVzcGFjZV07XG4gICAgICAgICAgICBjb25zdCBtZXRob2RzID0gbWdyXG4gICAgICAgICAgICAgICAgPyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhtZ3IpXG4gICAgICAgICAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LmdldFByb3RvdHlwZU9mKG1ncikgfHwge30pKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChrLCBpLCBhKSA9PiBhLmluZGV4T2YoaykgPT09IGkgJiYgdHlwZW9mIG1ncltrXSA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgICAgICAgICAgLnNvcnQoKVxuICAgICAgICAgICAgICAgIDogbnVsbDtcblxuICAgICAgICAgICAgbGV0IG5vZGVJbmZvOiBhbnkgPSBudWxsO1xuICAgICAgICAgICAgaWYgKG5vZGVVdWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lID8gZmluZE5vZGVEZWVwKHNjZW5lLCBub2RlVXVpZCkgOiBudWxsO1xuICAgICAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlSW5mbyA9IHsgZm91bmQ6IGZhbHNlIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGkgPSBub2RlLl9wcmVmYWI7XG4gICAgICAgICAgICAgICAgICAgIG5vZGVJbmZvID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNQcmVmYWJJbmZvOiAhIXBpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmFiSW5mbzogcGkgPyB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUlkOiBwaS5maWxlSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzUm9vdDogISFwaS5yb290LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb3RJc1NlbGY6IHBpLnJvb3QgPT09IG5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBwaS5hc3NldD8uX3V1aWQgPz8gcGkuYXNzZXQ/LnV1aWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZUZpbGVJZDogcGkuaW5zdGFuY2U/LmZpbGVJZCA/PyBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0luc3RhbmNlOiAhIXBpLmluc3RhbmNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9IDogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2NlQXZhaWxhYmxlOiAhIShnbG9iYWxUaGlzIGFzIGFueSkuY2NlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2UsXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzcGFjZUF2YWlsYWJsZTogISFtZ3IsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZHMsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVJbmZvXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOT1RFOiBjY2UuUHJlZmFiLmxpbmtOb2RlV2l0aFByZWZhYkFzc2V0IGxvb2tlZCBsaWtlIHRoZSBmaXggZm9yIHRoZSBtaXNzaW5nXG4gICAgLy8gX3ByZWZhYiBsaW5rIChzZWUgcHJvYmVDY2VBcGkgYWJvdmUpLCBidXQgY2FsbGluZyBpdCBzdGFuZGFsb25lIG1ha2VzIHRoZSBub2RlXG4gICAgLy8gdmFuaXNoIGZyb20gc2NlbmUgc2VyaWFsaXphdGlvbiBlbnRpcmVseSDigJQgd29yc2UgdGhhbiB0aGUgb3JpZ2luYWwgYnVnLiBJdCdzXG4gICAgLy8gYXBwYXJlbnRseSBtZWFudCB0byBiZSB1c2VkIGludGVybmFsbHkgYWxvbmdzaWRlIG90aGVyIGJvb2trZWVwaW5nIHRoZSBlbmdpbmUgZG9lc1xuICAgIC8vIHdoZW4gYSBwcmVmYWIgaXMgZHJhZ2dlZCBpbiAob25BZGROb2RlLCBldGMuKSwgbm90IGNhbGxlZCBvbiBpdHMgb3duLiBEbyBub3Qgd2lyZVxuICAgIC8vIHRoaXMgdXAgYWdhaW4gd2l0aG91dCByZXByb2R1Y2luZyB3aGF0IHRoZSBFZGl0b3IgVUkncyBkcmFnLWFuZC1kcm9wIHBhdGggYWN0dWFsbHlcbiAgICAvLyBkb2VzIGVuZC10by1lbmQuXG4gICAgLFxuICAgIC8qKlxuICAgICAqIEV2YWx1YXRlIGEgc25pcHBldCBpbnNpZGUgdGhlIHNjZW5lIHByb2Nlc3MsIHdoZXJlIGBjY2AgYW5kIHRoZSBsaXZlIHNjZW5lXG4gICAgICogZ3JhcGggYXJlIHJlYWNoYWJsZS5cbiAgICAgKlxuICAgICAqIFRoZSBwcmV2aW91cyBpbXBsZW1lbnRhdGlvbiB0YXJnZXRlZCBhIGBjb25zb2xlYCBzY2VuZSBzY3JpcHQgdGhhdCBubyBsb25nZXJcbiAgICAgKiBleGlzdHMgaW4gMy44LngsIHNvIGV2ZXJ5IGNhbGwgZmFpbGVkIHdpdGggXCJTY2VuYXJpbyBzY3JpcHRzIGRvIG5vdCBleGlzdFwiLlxuICAgICAqIFRoZSBzbmlwcGV0IHJ1bnMgYXMgYW4gYXN5bmMgZnVuY3Rpb24gYm9keSwgc28gaXQgbWF5IHVzZSBgYXdhaXRgIGFuZCBtdXN0XG4gICAgICogYHJldHVybmAgd2hhdGV2ZXIgaXQgd2FudHMgYmFjay5cbiAgICAgKlxuICAgICAqIHBvbnl0YWlsOiB0aGUgcmV0dXJuIHZhbHVlIGlzIEpTT04tc2VyaWFsaXNlZCBhY3Jvc3MgdGhlIHByb2Nlc3MgYm91bmRhcnksXG4gICAgICogc28gZW5naW5lIG9iamVjdHMgY29tZSBiYWNrIGFzIHBsYWluIGRhdGEuIE5vbi1zZXJpYWxpc2FibGUgcmVzdWx0cyBkZWdyYWRlXG4gICAgICogdG8gdGhlaXIgc3RyaW5nIGZvcm0gcmF0aGVyIHRoYW4gZmFpbGluZyB0aGUgY2FsbC5cbiAgICAgKi9cbiAgICBhc3luYyBldmFsU2NyaXB0KHNjcmlwdD86IHN0cmluZyB8IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghc2NyaXB0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc2NyaXB0IGlzIHJlcXVpcmVkJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3QgQXN5bmNGdW5jdGlvbiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihhc3luYyBmdW5jdGlvbiAoKSB7IC8qIG5vb3AgKi8gfSkuY29uc3RydWN0b3I7XG4gICAgICAgICAgICBjb25zdCBmbiA9IG5ldyBBc3luY0Z1bmN0aW9uKCdjYycsIHNjcmlwdCk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbihjYyk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFJvdW5kLXRyaXAgdG8gc3VyZmFjZSBub24tc2VyaWFsaXNhYmxlIHZhbHVlcyBoZXJlIHJhdGhlciB0aGFuXG4gICAgICAgICAgICAgICAgLy8gYXMgYW4gb3BhcXVlIElQQyBmYWlsdXJlLlxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZXN1bHQgfSB9O1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZXN1bHQ6IFN0cmluZyhyZXN1bHQpIH0gfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIFJlYWQgdGhlIHByb3BlcnR5IHNjaGVtYSBvZiBhIGNvbXBvbmVudCBjbGFzcyBzdHJhaWdodCBmcm9tIHRoZSBlbmdpbmUnc1xuICAgICAqIGNsYXNzIG1ldGFkYXRhLlxuICAgICAqXG4gICAgICogYHNjZW5lL3F1ZXJ5LWNsYXNzZXNgIGFuZCBgc2NlbmUvcXVlcnktY29tcG9uZW50c2AgcmV0dXJuIG5hbWVzIG9ubHkg4oCUIG5vXG4gICAgICogcHJvcGVydHkgaW5mb3JtYXRpb24gYXQgYWxsIOKAlCBzbyBhIHNjaGVtYSBsb29rdXAgaGFzIHRvIHJlYWNoIGludG8gdGhlXG4gICAgICogcmVnaXN0ZXJlZCBjbGFzcyBoZXJlIGluIHRoZSByZW5kZXJlciwgd2hlcmUgYGNjYCBpcyBsb2FkZWQuXG4gICAgICpcbiAgICAgKiBUaGUgc2VyaWFsaXNlZCBmaWVsZCBsaXN0IGFsb25lIGlzIG5vdCBlbm91Z2g6IHRoZSBlbmdpbmUgc3RvcmVzIGBjYy5MYWJlbGBcbiAgICAgKiB0ZXh0IGFzIGBfc3RyaW5nYCBhbmQgZXhwb3NlcyBpdCBhcyB0aGUgYHN0cmluZ2AgYWNjZXNzb3IsIGFuZCBhIGNhbGxlciBoYXNcbiAgICAgKiB0byB3cml0ZSB0aGUgYWNjZXNzb3IgbmFtZS4gU28gdGhlIGFjY2Vzc29ycyBkZWNsYXJlZCBvbiB0aGUgcHJvdG90eXBlIGNoYWluXG4gICAgICogYXJlIG1lcmdlZCBpbiwgYW5kIGEgYmFja2luZyBmaWVsZCB3aG9zZSBhY2Nlc3NvciBpcyBwcmVzZW50IGlzIGRyb3BwZWQuXG4gICAgICpcbiAgICAgKiBwb255dGFpbDogcmVwb3J0cyBhdHRyaWJ1dGVzIHRoZSBlbmdpbmUgcmVjb3JkcyAodHlwZSwgZGVmYXVsdCwgdmlzaWJsZSxcbiAgICAgKiByYW5nZSwgZW51bSBvcHRpb25zKS4gQW4gYWNjZXNzb3IgY2Fycnlpbmcgbm8gZWRpdG9yIGF0dHJpYnV0ZXMgaXMgc3RpbGxcbiAgICAgKiBsaXN0ZWQsIGp1c3Qgd2l0aCBmZXdlciBmaWVsZHMgZmlsbGVkIGluLlxuICAgICAqL1xuICAgIGRlc2NyaWJlQ2xhc3MoY2xhc3NOYW1lPzogc3RyaW5nIHwgbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGNsYXNzTmFtZSB8fCAnJztcbiAgICAgICAgICAgIGlmICghbmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NsYXNzTmFtZSBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY3RvciA9IGNjLmpzPy5nZXRDbGFzc0J5TmFtZSA/IGNjLmpzLmdldENsYXNzQnlOYW1lKG5hbWUpIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKCFjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ2xhc3MgJyR7bmFtZX0nIGlzIG5vdCByZWdpc3RlcmVkIGluIHRoZSBlbmdpbmVgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGF0dHJzID0gY2MuQ0NDbGFzcz8uQXR0cj8uZ2V0Q2xhc3NBdHRycyA/IGNjLkNDQ2xhc3MuQXR0ci5nZXRDbGFzc0F0dHJzKGN0b3IpIDogbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaWJlID0gKHByb3A6IHN0cmluZywgZXh0cmE6IFJlY29yZDxzdHJpbmcsIGFueT4sIGZhbGxiYWNrS2V5Pzogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXR0cmlidXRlcyBhcmUgc3BsaXQgYWNyb3NzIHRoZSB0d28ga2V5czogdGhlIGFjY2Vzc29yIGNhcnJpZXNcbiAgICAgICAgICAgICAgICAvLyBgdmlzaWJsZWAvYGRpc3BsYXlPcmRlcmAsIGl0cyBiYWNraW5nIGZpZWxkIGNhcnJpZXMgYGRlZmF1bHRgLlxuICAgICAgICAgICAgICAgIC8vIFJlYWQgdGhlIGFjY2Vzc29yIGZpcnN0IGFuZCBmaWxsIHRoZSBnYXBzIGZyb20gdGhlIGZpZWxkLlxuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWQgPSAoc3VmZml4OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhdHRycykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3duID0gYXR0cnNbYCR7cHJvcH0kXyQke3N1ZmZpeH1gXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG93biAhPT0gdW5kZWZpbmVkKSByZXR1cm4gb3duO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsbGJhY2tLZXkgPyBhdHRyc1tgJHtmYWxsYmFja0tleX0kXyQke3N1ZmZpeH1gXSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IGN0b3JBdHRyID0gcmVhZCgnY3RvcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudW1MaXN0ID0gcmVhZCgnZW51bUxpc3QnKTtcbiAgICAgICAgICAgICAgICBjb25zdCByYXdEZWZhdWx0ID0gcmVhZCgnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIC8vIEEgZGVmYXVsdCBpcyBzb21ldGltZXMgYW4gYW5vbnltb3VzIGZhY3RvcnkgZnVuY3Rpb24gKGNjLkNvbG9yIGFuZFxuICAgICAgICAgICAgICAgIC8vIGZyaWVuZHMpLiBUaGUgZW5naW5lIG9iamVjdCBpdCBidWlsZHMgZG9lcyBub3Qgc3Vydml2ZSB0aGUgSlNPTiBob3BcbiAgICAgICAgICAgICAgICAvLyBhbmQgdGhlIGZ1bmN0aW9uIGl0c2VsZiBpcyBuYW1lbGVzcywgc28gY2FsbCBpdCBvbmNlIGFuZCByZXBvcnQgdGhlXG4gICAgICAgICAgICAgICAgLy8gY29uc3RydWN0b3IgbmFtZSBhcyB0aGUgdHlwZS5cbiAgICAgICAgICAgICAgICBjb25zdCBpc0ZhY3RvcnkgPSB0eXBlb2YgcmF3RGVmYXVsdCA9PT0gJ2Z1bmN0aW9uJztcbiAgICAgICAgICAgICAgICBsZXQgZmFjdG9yeVR5cGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBpZiAoaXNGYWN0b3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWN0b3J5VHlwZSA9IHJhd0RlZmF1bHQoKT8uY29uc3RydWN0b3I/Lm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQSBmYWN0b3J5IG5lZWRpbmcgYXJndW1lbnRzIG9yIGVuZ2luZSBzdGF0ZSBqdXN0IHlpZWxkcyBubyB0eXBlLlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IGRlZiA9IGlzRmFjdG9yeSA/IHVuZGVmaW5lZCA6IHJhd0RlZmF1bHQ7XG5cbiAgICAgICAgICAgICAgICAvLyBUaGUgZW5naW5lIG9ubHkgcmVjb3JkcyBhbiBleHBsaWNpdCBgdHlwZWAgZm9yIGVudW1zIGFuZCBvYmplY3RcbiAgICAgICAgICAgICAgICAvLyByZWZlcmVuY2VzOyBhIHBsYWluIHN0cmluZy9udW1iZXIvYm9vbGVhbiBoYXMgbm9uZSwgc28gaW5mZXIgaXRcbiAgICAgICAgICAgICAgICAvLyBmcm9tIHRoZSBkZWZhdWx0IHZhbHVlIHJhdGhlciB0aGFuIHJlcG9ydGluZyBub3RoaW5nLlxuICAgICAgICAgICAgICAgIGNvbnN0IGluZmVycmVkID0gaXNGYWN0b3J5XG4gICAgICAgICAgICAgICAgICAgID8gZmFjdG9yeVR5cGVcbiAgICAgICAgICAgICAgICAgICAgOiBkZWYgPT09IG51bGwgfHwgZGVmID09PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgICAgID8gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICA6IEFycmF5LmlzQXJyYXkoZGVmKSA/ICdBcnJheScgOiB0eXBlb2YgZGVmO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHByb3AsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHJlYWQoJ3R5cGUnKSA/PyAoY3RvckF0dHIgJiYgY3RvckF0dHIubmFtZSkgPz8gaW5mZXJyZWQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGRlZixcbiAgICAgICAgICAgICAgICAgICAgdmlzaWJsZTogcmVhZCgndmlzaWJsZScpLFxuICAgICAgICAgICAgICAgICAgICByZWFkb25seTogcmVhZCgncmVhZG9ubHknKSxcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcDogcmVhZCgndG9vbHRpcCcpLFxuICAgICAgICAgICAgICAgICAgICByYW5nZTogcmVhZCgncmFuZ2UnKSxcbiAgICAgICAgICAgICAgICAgICAgLy8gRW51bSBvcHRpb25zIGNvbWUgYmFjayBhcyB7bmFtZSwgdmFsdWV9IHJvd3M7IGtlZXAganVzdCB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gbmFtZXMgc28gdGhlIHBheWxvYWQgc3RheXMgc21hbGwuXG4gICAgICAgICAgICAgICAgICAgIGVudW1PcHRpb25zOiBBcnJheS5pc0FycmF5KGVudW1MaXN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBlbnVtTGlzdC5tYXAoKGU6IGFueSkgPT4gZT8ubmFtZSkuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgLi4uZXh0cmFcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUHVibGljIGFjY2Vzc29ycyB3YWxrZWQgb2ZmIHRoZSBwcm90b3R5cGUgY2hhaW4g4oCUIHRoZXNlIGFyZSB0aGUgbmFtZXNcbiAgICAgICAgICAgIC8vIGEgY2FsbGVyIGFjdHVhbGx5IHdyaXRlcy5cbiAgICAgICAgICAgIGNvbnN0IGFjY2Vzc29ycyA9IG5ldyBNYXA8c3RyaW5nLCB7IHNldHRhYmxlOiBib29sZWFuIH0+KCk7XG4gICAgICAgICAgICBsZXQgcHJvdG8gPSBjdG9yLnByb3RvdHlwZTtcbiAgICAgICAgICAgIHdoaWxlIChwcm90byAmJiBwcm90byAhPT0gT2JqZWN0LnByb3RvdHlwZSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHByb3RvKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnY29uc3RydWN0b3InIHx8IGtleS5zdGFydHNXaXRoKCdfJykgfHwgYWNjZXNzb3JzLmhhcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIGtleSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXNjICYmIGRlc2MuZ2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY2Nlc3NvcnMuc2V0KGtleSwgeyBzZXR0YWJsZTogISFkZXNjLnNldCB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNlcmlhbGlzZWQgZmllbGRzLiBBIGJhY2tpbmcgZmllbGQgaXMgc2tpcHBlZCB3aGVuIGl0cyBhY2Nlc3NvciBpc1xuICAgICAgICAgICAgLy8gcHJlc2VudCwgc28gYF9zdHJpbmdgIGRvZXMgbm90IHNoYWRvdyBgc3RyaW5nYC5cbiAgICAgICAgICAgIGNvbnN0IGZpZWxkczogc3RyaW5nW10gPSAoY3RvciBhcyBhbnkpLl9fdmFsdWVzX18gfHwgW107XG4gICAgICAgICAgICBjb25zdCBzaGFkb3dlZCA9IG5ldyBTZXQoXG4gICAgICAgICAgICAgICAgZmllbGRzLmZpbHRlcigoZjogc3RyaW5nKSA9PiBmLnN0YXJ0c1dpdGgoJ18nKSAmJiBhY2Nlc3NvcnMuaGFzKGYuc2xpY2UoMSkpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBmaWVsZHNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChmOiBzdHJpbmcpID0+ICFzaGFkb3dlZC5oYXMoZikpXG4gICAgICAgICAgICAgICAgLm1hcCgoZjogc3RyaW5nKSA9PiBkZXNjcmliZShmLCB7IHNlcmlhbGl6ZWQ6IHRydWUgfSkpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIGluZm9dIG9mIGFjY2Vzc29ycykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhY2tpbmcgPSBgXyR7a2V5fWA7XG4gICAgICAgICAgICAgICAgcHJvcGVydGllcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBkZXNjcmliZShcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHsgYWNjZXNzb3I6IHRydWUsIHJlYWRvbmx5OiAhaW5mby5zZXR0YWJsZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2hhZG93ZWQuaGFzKGJhY2tpbmcpID8gYmFja2luZyA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5kczogT2JqZWN0LmdldFByb3RvdHlwZU9mKGN0b3IpPy5uYW1lIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlDb3VudDogcHJvcGVydGllcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IFN0cmluZyhlcnJvcikgfTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FwdHVyZSB0aGUgdHJhbnNmb3JtL3Zpc2liaWxpdHkgc3RhdGUgb2YgdGhlIGdpdmVuIG5vZGVzIHNvIGEgZmFpbGVkIGJhdGNoXG4gICAgICogY2FuIGJlIHVuZG9uZS4gVGhlIGVkaXRvciBleHBvc2VzIG5vIHVuZG8gbWVzc2FnZSwgc28gdGhpcyBpcyBhIGRlbGliZXJhdGVseVxuICAgICAqIG5hcnJvdyBoYW5kLXJvbGxlZCBzdWJzdGl0dXRlLlxuICAgICAqXG4gICAgICogcG9ueXRhaWw6IHJlY29yZHMgdHJhbnNmb3JtLCBhY3RpdmUgZmxhZyBhbmQgbmFtZSBvbmx5IOKAlCBlbm91Z2ggdG8gdW5kbyB0aGVcbiAgICAgKiBwcm9wZXJ0eSB3cml0ZXMgYSBiYXRjaCB0eXBpY2FsbHkgbWFrZXMuIEl0IGNhbm5vdCByZXN0b3JlIGNyZWF0ZWQgb3IgZGVsZXRlZFxuICAgICAqIG5vZGVzLCBjb21wb25lbnQgYWRkL3JlbW92ZSwgb3IgYXNzZXQgd3JpdGVzLiBUbyBjb3ZlciB0aG9zZSwgc25hcHNob3QgdGhlXG4gICAgICogc2VyaWFsaXplZCBzdWJ0cmVlIGluc3RlYWQgYW5kIHJlLWluc3RhbnRpYXRlIG9uIHJlc3RvcmUuXG4gICAgICovXG4gICAgc25hcHNob3ROb2Rlcyh1dWlkcz86IHN0cmluZ1tdIHwgbnVsbCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSB1dWlkcyB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIGxpc3QpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVEZWVwKHNjZW5lLCB1dWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZy5wdXNoKHV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogeyB4OiBub2RlLnBvc2l0aW9uLngsIHk6IG5vZGUucG9zaXRpb24ueSwgejogbm9kZS5wb3NpdGlvbi56IH0sXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiB7IHg6IG5vZGUuZXVsZXJBbmdsZXMueCwgeTogbm9kZS5ldWxlckFuZ2xlcy55LCB6OiBub2RlLmV1bGVyQW5nbGVzLnogfSxcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHsgeDogbm9kZS5zY2FsZS54LCB5OiBub2RlLnNjYWxlLnksIHo6IG5vZGUuc2NhbGUueiB9LFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiBub2RlLnBhcmVudCA/IG5vZGUucGFyZW50LnV1aWQgOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBzaWJsaW5nSW5kZXg6IHR5cGVvZiBub2RlLmdldFNpYmxpbmdJbmRleCA9PT0gJ2Z1bmN0aW9uJyA/IG5vZGUuZ2V0U2libGluZ0luZGV4KCkgOiBudWxsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZXMsIG1pc3NpbmcsIGNhcHR1cmVkQXQ6IERhdGUubm93KCkgfSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXN0b3JlIGEgc25hcHNob3QgcHJvZHVjZWQgYnkgc25hcHNob3ROb2Rlcy4gTm9kZXMgdGhhdCBubyBsb25nZXIgZXhpc3QgYXJlXG4gICAgICogcmVwb3J0ZWQgcmF0aGVyIHRoYW4gc2lsZW50bHkgc2tpcHBlZCwgc2luY2UgdGhhdCBtZWFucyB0aGUgcm9sbGJhY2sgaXMgcGFydGlhbC5cbiAgICAgKi9cbiAgICByZXN0b3JlTm9kZXMoc25hcHNob3Q/OiBhbnkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIFZlYzMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlcyA9IChzbmFwc2hvdCAmJiBzbmFwc2hvdC5ub2RlcykgfHwgW107XG4gICAgICAgICAgICBjb25zdCByZXN0b3JlZDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgICAgIGZvciAoY29uc3Qgc2F2ZWQgb2Ygbm9kZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVEZWVwKHNjZW5lLCBzYXZlZC51dWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZy5wdXNoKHNhdmVkLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gc2F2ZWQubmFtZTtcbiAgICAgICAgICAgICAgICBub2RlLmFjdGl2ZSA9IHNhdmVkLmFjdGl2ZTtcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKG5ldyBWZWMzKHNhdmVkLnBvc2l0aW9uLngsIHNhdmVkLnBvc2l0aW9uLnksIHNhdmVkLnBvc2l0aW9uLnopKTtcbiAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHNhdmVkLnJvdGF0aW9uLngsIHNhdmVkLnJvdGF0aW9uLnksIHNhdmVkLnJvdGF0aW9uLnopO1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0U2NhbGUobmV3IFZlYzMoc2F2ZWQuc2NhbGUueCwgc2F2ZWQuc2NhbGUueSwgc2F2ZWQuc2NhbGUueikpO1xuICAgICAgICAgICAgICAgIGlmIChzYXZlZC5zaWJsaW5nSW5kZXggIT09IG51bGwgJiYgdHlwZW9mIG5vZGUuc2V0U2libGluZ0luZGV4ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0U2libGluZ0luZGV4KHNhdmVkLnNpYmxpbmdJbmRleCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3RvcmVkLnB1c2goc2F2ZWQudXVpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogbWlzc2luZy5sZW5ndGggPT09IDAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyByZXN0b3JlZCwgbWlzc2luZyB9LFxuICAgICAgICAgICAgICAgIGVycm9yOiBtaXNzaW5nLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICAgICAgPyBgUm9sbGJhY2sgaW5jb21wbGV0ZTogJHttaXNzaW5nLmxlbmd0aH0gbm9kZShzKSBubyBsb25nZXIgZXhpc3QgYW5kIHdlcmUgbm90IHJlc3RvcmVkYFxuICAgICAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogUmVjdXJzaXZlbHkgZmluZCBhIG5vZGUgYnkgVVVJRCBhbnl3aGVyZSB1bmRlciByb290IChnZXRDaGlsZEJ5VXVpZCBpcyBub3QgcmVjdXJzaXZlKS4gKi9cbmZ1bmN0aW9uIGZpbmROb2RlRGVlcChyb290OiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XG4gICAgaWYgKCFyb290IHx8ICF1dWlkKSB7IHJldHVybiBudWxsOyB9XG4gICAgaWYgKHJvb3QudXVpZCA9PT0gdXVpZCkgeyByZXR1cm4gcm9vdDsgfVxuICAgIGNvbnN0IGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbiB8fCBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVEZWVwKGNoaWxkLCB1dWlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSB7IHJldHVybiBmb3VuZDsgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIFdhaXQgTiByZW5kZXJlZCBmcmFtZXMgaW4gdGhlIHNjZW5lIHByb2Nlc3MgYmVmb3JlIHJlYWRpbmcgYmFjayBwaXhlbHMuICovXG5mdW5jdGlvbiB3YWl0RnJhbWVzKG46IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGc6IGFueSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICAgIGNvbnN0IHJhZjogKGNiOiAoKSA9PiB2b2lkKSA9PiBhbnkgPSB0eXBlb2YgZy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09ICdmdW5jdGlvbidcbiAgICAgICAgPyBnLnJlcXVlc3RBbmltYXRpb25GcmFtZS5iaW5kKGcpXG4gICAgICAgIDogKGNiOiAoKSA9PiB2b2lkKSA9PiBzZXRUaW1lb3V0KGNiLCAxNik7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgaWYgKGNvdW50ID49IG4pIHsgcmVzb2x2ZSgpOyB9IGVsc2UgeyByYWYodGljayk7IH1cbiAgICAgICAgfTtcbiAgICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEJ1aWxkIGEgY2FudmFzIGZyb20gcmF3IFJHQkEgYnl0ZXMgKE9wZW5HTCBib3R0b20tbGVmdCBvcmlnaW4pLCBmbGlwcGluZ1xuICogdmVydGljYWxseSBzbyB0aGUgaW1hZ2UgaXMgdXByaWdodC4gVXNlcyB0aGUgc2NlbmUgcHJvY2VzcyBET00gY2FudmFzLCB3aGljaFxuICogdGhlIFdlYkdMIGVuZ2luZSByZW5kZXJlciBhbHdheXMgcHJvdmlkZXMuXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkRmxpcHBlZENhbnZhcyhyYXc6IFVpbnQ4QXJyYXksIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogYW55IHtcbiAgICBjb25zdCBnOiBhbnkgPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICBjb25zdCBkb2M6IGFueSA9IGcuZG9jdW1lbnQ7XG4gICAgaWYgKCFkb2MgfHwgdHlwZW9mIGRvYy5jcmVhdGVFbGVtZW50ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZG9jdW1lbnQvY2FudmFzIG5vdCBhdmFpbGFibGUgaW4gc2NlbmUgY29udGV4dCBmb3IgUE5HIGVuY29kaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGNhbnZhczogYW55ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgY29uc3QgY3R4OiBhbnkgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb25zdCBpbWc6IGFueSA9IGN0eC5jcmVhdGVJbWFnZURhdGEod2lkdGgsIGhlaWdodCk7XG4gICAgY29uc3Qgcm93Qnl0ZXMgPSB3aWR0aCAqIDQ7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICBjb25zdCBzcmNTdGFydCA9IChoZWlnaHQgLSAxIC0geSkgKiByb3dCeXRlcztcbiAgICAgICAgaW1nLmRhdGEuc2V0KHJhdy5zdWJhcnJheShzcmNTdGFydCwgc3JjU3RhcnQgKyByb3dCeXRlcyksIHkgKiByb3dCeXRlcyk7XG4gICAgfVxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nLCAwLCAwKTtcbiAgICByZXR1cm4gY2FudmFzO1xufVxuXG4vKiogRW5jb2RlIGEgY2FudmFzIHRvIGJhc2U2NCBQTkcgKG5vIGRhdGEgVVJMIHByZWZpeCkuICovXG5mdW5jdGlvbiBjYW52YXNUb1BuZ0Jhc2U2NChjYW52YXM6IGFueSk6IHN0cmluZyB7XG4gICAgY29uc3QgZGF0YVVybDogc3RyaW5nID0gY2FudmFzLnRvRGF0YVVSTCgnaW1hZ2UvcG5nJyk7XG4gICAgcmV0dXJuIGRhdGFVcmwuc3Vic3RyaW5nKGRhdGFVcmwuaW5kZXhPZignLCcpICsgMSk7XG59XG5cbi8qKiBEb3duc2NhbGUgKG5ldmVyIHVwc2NhbGUpIGEgY2FudmFzIHRvIGZpdCB3aXRoaW4gbWF4V2lkdGggeCBtYXhIZWlnaHQsIHByZXNlcnZpbmcgYXNwZWN0IHJhdGlvLCBhbmQgZW5jb2RlIGFzIGJhc2U2NCBQTkcuICovXG5mdW5jdGlvbiByZXNpemVDYW52YXNUb1BuZ0Jhc2U2NChjYW52YXM6IGFueSwgbWF4V2lkdGg6IG51bWJlciwgbWF4SGVpZ2h0OiBudW1iZXIpOiB7IGJhc2U2NDogc3RyaW5nOyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9IHtcbiAgICBjb25zdCBnOiBhbnkgPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICBjb25zdCBkb2M6IGFueSA9IGcuZG9jdW1lbnQ7XG4gICAgY29uc3Qgc2NhbGUgPSBNYXRoLm1pbigxLCBtYXhXaWR0aCAvIGNhbnZhcy53aWR0aCwgbWF4SGVpZ2h0IC8gY2FudmFzLmhlaWdodCk7XG4gICAgY29uc3Qgb3V0V2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKGNhbnZhcy53aWR0aCAqIHNjYWxlKSk7XG4gICAgY29uc3Qgb3V0SGVpZ2h0ID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChjYW52YXMuaGVpZ2h0ICogc2NhbGUpKTtcbiAgICBpZiAoc2NhbGUgPj0gMSkge1xuICAgICAgICByZXR1cm4geyBiYXNlNjQ6IGNhbnZhc1RvUG5nQmFzZTY0KGNhbnZhcyksIHdpZHRoOiBjYW52YXMud2lkdGgsIGhlaWdodDogY2FudmFzLmhlaWdodCB9O1xuICAgIH1cbiAgICBjb25zdCBvdXRDYW52YXM6IGFueSA9IGRvYy5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBvdXRDYW52YXMud2lkdGggPSBvdXRXaWR0aDtcbiAgICBvdXRDYW52YXMuaGVpZ2h0ID0gb3V0SGVpZ2h0O1xuICAgIGNvbnN0IGN0eDogYW55ID0gb3V0Q2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LmRyYXdJbWFnZShjYW52YXMsIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCwgMCwgMCwgb3V0V2lkdGgsIG91dEhlaWdodCk7XG4gICAgcmV0dXJuIHsgYmFzZTY0OiBjYW52YXNUb1BuZ0Jhc2U2NChvdXRDYW52YXMpLCB3aWR0aDogb3V0V2lkdGgsIGhlaWdodDogb3V0SGVpZ2h0IH07XG59Il19