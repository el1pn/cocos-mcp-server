"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
exports.methods = {
    /**
     * Create a new scene
     */
    createNewScene() {
        try {
            const { director, Scene } = require('cc');
            const scene = new Scene();
            scene.name = 'New Scene';
            director.runScene(scene);
            return { success: true, message: 'New scene created successfully' };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
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
     * Remove component from a node
     */
    removeComponentFromNode(nodeUuid, componentType) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            node.removeComponent(component);
            return { success: true, message: `Component ${componentType} removed successfully` };
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
     * Set component property
     */
    setComponentProperty(nodeUuid, componentType, property, value) {
        try {
            const { director, js } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const ComponentClass = js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component type ${componentType} not found` };
            }
            const component = node.getComponent(ComponentClass);
            if (!component) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            // Special handling for common properties
            if (property === 'spriteFrame' && componentType === 'cc.Sprite') {
                // Support value as uuid or asset path
                if (typeof value === 'string') {
                    // Try to find by uuid first
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').SpriteFrame, (err, spriteFrame) => {
                        if (!err && spriteFrame) {
                            component.spriteFrame = spriteFrame;
                        }
                        else {
                            // Try loading by uuid
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.spriteFrame = asset;
                                }
                                else {
                                    // Direct assignment (compatible with passed asset objects)
                                    component.spriteFrame = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.spriteFrame = value;
                }
            }
            else if (property === 'material' && (componentType === 'cc.Sprite' || componentType === 'cc.MeshRenderer')) {
                // Support value as uuid or asset path
                if (typeof value === 'string') {
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').Material, (err, material) => {
                        if (!err && material) {
                            component.material = material;
                        }
                        else {
                            assetManager.loadAny({ uuid: value }, (err2, asset) => {
                                if (!err2 && asset) {
                                    component.material = asset;
                                }
                                else {
                                    component.material = value;
                                }
                            });
                        }
                    });
                }
                else {
                    component.material = value;
                }
            }
            else if (property === 'string' && (componentType === 'cc.Label' || componentType === 'cc.RichText')) {
                component.string = value;
            }
            else {
                component[property] = value;
            }
            // Optional: refresh Inspector
            // Editor.Message.send('scene', 'snapshot');
            return { success: true, message: `Component property '${property}' updated successfully` };
        }
        catch (error) {
            return { success: false, error: error.message };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFNUMsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOztPQUVHO0lBQ0gsY0FBYztRQUNWLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7WUFDekIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQztRQUN4RSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFF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SUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDakUsSUFBSSxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDYixPQUFPLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDN0YsQ0FBQztJQUNELE1BQU0sU0FBUyxHQUFRLEdBQUcsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbkQsU0FBUyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7SUFDM0IsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUM7SUFDN0IsTUFBTSxHQUFHLEdBQVEsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNwRixPQUFPLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQ3hGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5tb2R1bGUucGF0aHMucHVzaChqb2luKEVkaXRvci5BcHAucGF0aCwgJ25vZGVfbW9kdWxlcycpKTtcblxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgc2NlbmVcbiAgICAgKi9cbiAgICBjcmVhdGVOZXdTY2VuZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIFNjZW5lIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoKTtcbiAgICAgICAgICAgIHNjZW5lLm5hbWUgPSAnTmV3IFNjZW5lJztcbiAgICAgICAgICAgIGRpcmVjdG9yLnJ1blNjZW5lKHNjZW5lKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdOZXcgc2NlbmUgY3JlYXRlZCBzdWNjZXNzZnVsbHknIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjb21wb25lbnQgdG8gYSBub2RlXG4gICAgICovXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIG5vZGUgYnkgVVVJRFxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBjbGFzc1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjb21wb25lbnRJZDogY29tcG9uZW50LnV1aWQgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGNvbXBvbmVudCBmcm9tIGEgbm9kZVxuICAgICAqL1xuICAgIHJlbW92ZUNvbXBvbmVudEZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCB0eXBlICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IHJlbW92ZWQgc3VjY2Vzc2Z1bGx5YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgbm9kZVxuICAgICAqL1xuICAgIGNyZWF0ZU5vZGUobmFtZTogc3RyaW5nLCBwYXJlbnRVdWlkPzogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBOb2RlIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBOb2RlKG5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHNjZW5lLmdldENoaWxkQnlVdWlkKHBhcmVudFV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlICR7bmFtZX0gY3JlYXRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogbm9kZS51dWlkLCBuYW1lOiBub2RlLm5hbWUgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG5vZGUgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBnZXROb2RlSW5mbyhub2RlVXVpZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogbm9kZS5yb3RhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IG5vZGUuc2NhbGUsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQ/LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gY2hpbGQudXVpZCksXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IG5vZGUuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIG5vZGVzIGluIHNjZW5lXG4gICAgICovXG4gICAgZ2V0QWxsTm9kZXMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XG4gICAgICAgICAgICBjb25zdCBjb2xsZWN0Tm9kZXMgPSAobm9kZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZDogYW55KSA9PiBjb2xsZWN0Tm9kZXMoY2hpbGQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjZW5lLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkOiBhbnkpID0+IGNvbGxlY3ROb2RlcyhjaGlsZCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlcyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIG5vZGUgYnkgbmFtZVxuICAgICAqL1xuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBuYW1lICR7bmFtZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBzY2VuZSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc2NlbmUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogc2NlbmUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiBzY2VuZS5jaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgbm9kZSBwcm9wZXJ0eVxuICAgICAqL1xuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5XG4gICAgICAgICAgICBpZiAocHJvcGVydHkgPT09ICdwb3NpdGlvbicpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3JvdGF0aW9uJykge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIodmFsdWUueCB8fCAwLCB2YWx1ZS55IHx8IDAsIHZhbHVlLnogfHwgMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc2NhbGUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRTY2FsZSh2YWx1ZS54IHx8IDEsIHZhbHVlLnkgfHwgMSwgdmFsdWUueiB8fCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdhY3RpdmUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICduYW1lJykge1xuICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgc2V0dGluZyBwcm9wZXJ0eSBkaXJlY3RseVxuICAgICAgICAgICAgICAgIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzY2VuZSBoaWVyYXJjaHlcbiAgICAgKi9cbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc05vZGUgPSAobm9kZTogYW55KTogYW55ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gc2NlbmUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaGllcmFyY2h5IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHByZWZhYiBmcm9tIGEgbm9kZSBieSBkZWxlZ2F0aW5nIHRvIHRoZSBlbmdpbmUncyBvZmZpY2lhbFxuICAgICAqIFByZWZhYk1hbmFnZXIgKGNjZS5QcmVmYWIuY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSkuIFJlcGxpY2F0ZXMgdGhlXG4gICAgICogZWRpdG9yJ3MgXCJkcmFnIG5vZGUgdG8gQXNzZXRzXCIgZmxvdyDigJQgaGFuZGxlcyBzY3JpcHQgX190eXBlX18gY29tcHJlc3Npb24sXG4gICAgICogQHByb3BlcnR5IHJlZiBzZXJpYWxpemF0aW9uLCBhbmQgc291cmNlLW5vZGUgcmVsaW5raW5nLlxuICAgICAqL1xuICAgIC8qKlxuICAgICAqIFJldmVydCBhIHByZWZhYiBpbnN0YW5jZSB0byBtYXRjaCBpdHMgc291cmNlIGFzc2V0IGJ5IGRlbGVnYXRpbmcgdG9cbiAgICAgKiBjY2UuUHJlZmFiLnJldmVydFByZWZhYi4gTm8gcHVibGljIHNjZW5lIG1lc3NhZ2UgZXhpc3RzIGZvciB0aGlzLlxuICAgICAqL1xuICAgIGFzeW5jIHJldmVydFByZWZhYkluc3RhbmNlKG5vZGVVdWlkOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1nciA9IChnbG9iYWxUaGlzIGFzIGFueSkuY2NlPy5QcmVmYWI7XG4gICAgICAgICAgICBpZiAoIW1nciB8fCB0eXBlb2YgbWdyLnJldmVydFByZWZhYiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ2NjZS5QcmVmYWIucmV2ZXJ0UHJlZmFiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBDb2NvcyBDcmVhdG9yIHZlcnNpb24nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFwcGxpZWQgPSBhd2FpdCBtZ3IucmV2ZXJ0UHJlZmFiKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIC8vIEVuZ2luZSByZXR1cm5zIGZhbHNlIHdoZW4gdGhlIG5vZGUgaGFzIG5vIG92ZXJyaWRlcyB0byByZXZlcnQg4oCUXG4gICAgICAgICAgICAvLyBub3QgYW4gZXJyb3IsIGp1c3QgYSBuby1vcC4gU3VyZmFjZSBpdCBzbyBjYWxsZXJzIGNhbiBkaXN0aW5ndWlzaC5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGFwcGxpZWQ6IGFwcGxpZWQgIT09IGZhbHNlIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXN5bmMgY3JlYXRlUHJlZmFiRnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1nciA9IChnbG9iYWxUaGlzIGFzIGFueSkuY2NlPy5QcmVmYWI7XG4gICAgICAgICAgICBpZiAoIW1nciB8fCB0eXBlb2YgbWdyLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdjY2UuUHJlZmFiLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUgbm90IGF2YWlsYWJsZSBpbiB0aGlzIENvY29zIENyZWF0b3IgdmVyc2lvbidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJVdWlkID0gYXdhaXQgbWdyLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUobm9kZVV1aWQsIHVybCk7XG4gICAgICAgICAgICBpZiAoIXByZWZhYlV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdjcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIHJldHVybmVkIG51bGwvdW5kZWZpbmVkJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgcHJlZmFiVXVpZCwgdXJsLCBzb3VyY2VOb2RlVXVpZDogbm9kZVV1aWQgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGNvbXBvbmVudCBwcm9wZXJ0eVxuICAgICAqL1xuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29tbW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyAmJiBjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJykge1xuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgdmFsdWUgYXMgdXVpZCBvciBhc3NldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYnkgdXVpZCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldE1hbmFnZXIgPSByZXF1aXJlKCdjYycpLmFzc2V0TWFuYWdlcjtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLnJlc291cmNlcy5sb2FkKHZhbHVlLCByZXF1aXJlKCdjYycpLlNwcml0ZUZyYW1lLCAoZXJyOiBhbnksIHNwcml0ZUZyYW1lOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIHNwcml0ZUZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNwcml0ZUZyYW1lID0gc3ByaXRlRnJhbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSBsb2FkaW5nIGJ5IHV1aWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlIH0sIChlcnIyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIyICYmIGFzc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSBhc3NldDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERpcmVjdCBhc3NpZ25tZW50IChjb21wYXRpYmxlIHdpdGggcGFzc2VkIGFzc2V0IG9iamVjdHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbWF0ZXJpYWwnICYmIChjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuTWVzaFJlbmRlcmVyJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTdXBwb3J0IHZhbHVlIGFzIHV1aWQgb3IgYXNzZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIucmVzb3VyY2VzLmxvYWQodmFsdWUsIHJlcXVpcmUoJ2NjJykuTWF0ZXJpYWwsIChlcnI6IGFueSwgbWF0ZXJpYWw6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgbWF0ZXJpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLmxvYWRBbnkoeyB1dWlkOiB2YWx1ZSB9LCAoZXJyMjogYW55LCBhc3NldDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyMiAmJiBhc3NldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Lm1hdGVyaWFsID0gYXNzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc3RyaW5nJyAmJiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLkxhYmVsJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuUmljaFRleHQnKSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdHJpbmcgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3B0aW9uYWw6IHJlZnJlc2ggSW5zcGVjdG9yXG4gICAgICAgICAgICAvLyBFZGl0b3IuTWVzc2FnZS5zZW5kKCdzY2VuZScsICdzbmFwc2hvdCcpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIGN1cnJlbnRseS1vcGVuIHNjZW5lL3ByZWZhYiB0byBhIFBORyAocmV0dXJuZWQgYXMgYmFzZTY0KSB1c2luZyBhblxuICAgICAqIG9mZnNjcmVlbiBjbG9uZSBDYW1lcmEgKyBSZW5kZXJUZXh0dXJlLiBUaGlzIHByb2R1Y2VzIGEgQ0xFQU4gaW1hZ2UgKG5vIGVkaXRvclxuICAgICAqIGdpem1vcy9ncmlkKSBhbmQgbmV2ZXIgbXV0YXRlcyB0aGUgZXhpc3RpbmcgY2FtZXJhcyDigJQgYSB0ZW1wb3JhcnksIGhpZGRlbixcbiAgICAgKiBub24tcGVyc2lzdGVkIGNhbWVyYSBub2RlIGlzIGNyZWF0ZWQsIHVzZWQgZm9yIDEtMiBmcmFtZXMsIHRoZW4gZGVzdHJveWVkLlxuICAgICAqXG4gICAgICogb3B0czoge1xuICAgICAqICAgbW9kZTogJ3NjZW5lJyB8ICdjYW1lcmEnIHwgJ25vZGUnLFxuICAgICAqICAgY2FtZXJhVXVpZD86IHN0cmluZywgICAvLyBmb3IgbW9kZSAnY2FtZXJhJ1xuICAgICAqICAgbm9kZVV1aWQ/OiBzdHJpbmcsICAgICAvLyBmb3IgbW9kZSAnbm9kZSdcbiAgICAgKiAgIHdpZHRoPzogbnVtYmVyLCAgICAgICAgLy8gMS4uMjA0OCwgZGVmYXVsdCAxOTIwXG4gICAgICogICBoZWlnaHQ/OiBudW1iZXIsICAgICAgIC8vIDEuLjIwNDgsIGRlZmF1bHQgMTA4MFxuICAgICAqICAgYmFja2dyb3VuZENvbG9yPzogeyByLCBnLCBiLCBhIH0gIC8vIDAuLjI1NSwgZGVmYXVsdCBvcGFxdWUgYmxhY2tcbiAgICAgKiB9XG4gICAgICogb3B0cy5wcmV2aWV3TWF4V2lkdGgvcHJldmlld01heEhlaWdodCAoYm90aCByZXF1aXJlZCB0b2dldGhlcik6IGFsc28gcmV0dXJuIGEgZG93bnNjYWxlZFxuICAgICAqIHByZXZpZXdCYXNlNjQgKG5ldmVyIHVwc2NhbGVkKSBmaXR0aW5nIHdpdGhpbiB0aG9zZSBib3VuZHMsIGFsb25nc2lkZSBwcmV2aWV3V2lkdGgvcHJldmlld0hlaWdodC5cbiAgICAgKiBSZXR1cm5zIHsgc3VjY2VzcywgZGF0YTogeyBwbmdCYXNlNjQsIHdpZHRoLCBoZWlnaHQsIG1vZGUsIGNhbWVyYU5vZGVVdWlkLCBjYW1lcmFOb2RlTmFtZSwgbWFwcGluZywgcHJldmlld0Jhc2U2ND8sIHByZXZpZXdXaWR0aD8sIHByZXZpZXdIZWlnaHQ/IH0gfS5cbiAgICAgKi9cbiAgICBhc3luYyBjYXB0dXJlU2NlbmVWaWV3KG9wdHM6IGFueSkge1xuICAgICAgICBsZXQgY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBDYW1lcmEsIFJlbmRlclRleHR1cmUsIE5vZGUsIFZlYzMsIFF1YXQsIENvbG9yLCBDQ09iamVjdCwgVUlUcmFuc2Zvcm0gfSA9IGNjO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScsIGluc3RydWN0aW9uOiAnT3BlbiBhIHNjZW5lIGZpcnN0IHZpYSBzY2VuZV9tYW5hZ2VtZW50KGFjdGlvbj1cIm9wZW5cIiBvciBcImNyZWF0ZVwiKS4nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgbW9kZSA9IG9wdHMubW9kZSB8fCAnc2NlbmUnO1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLm1pbigyMDQ4LCBNYXRoLmZsb29yKG9wdHMud2lkdGggfHwgMTkyMCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IE1hdGgubWF4KDEsIE1hdGgubWluKDIwNDgsIE1hdGguZmxvb3Iob3B0cy5oZWlnaHQgfHwgMTA4MCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGJnID0gb3B0cy5iYWNrZ3JvdW5kQ29sb3IgfHwgeyByOiAwLCBnOiAwLCBiOiAwLCBhOiAyNTUgfTtcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgQ2FtZXJhIGNvbXBvbmVudHMgaW4gdGhlIHNjZW5lLlxuICAgICAgICAgICAgY29uc3QgY2FtZXJhczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbGxlY3QgPSAobjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFuKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIGlmIChuLmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gbi5nZXRDb21wb25lbnQoQ2FtZXJhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHsgY2FtZXJhcy5wdXNoKGMpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChuLmNoaWxkcmVuIHx8IFtdKS5mb3JFYWNoKGNvbGxlY3QpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjZW5lLmNoaWxkcmVuLmZvckVhY2goY29sbGVjdCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBpY2tNYWluID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzYWJsZSA9IGNhbWVyYXMuZmlsdGVyKChjOiBhbnkpID0+IGMuZW5hYmxlZEluSGllcmFyY2h5ICE9PSBmYWxzZSAmJiAhYy50YXJnZXRUZXh0dXJlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gdXNhYmxlLmxlbmd0aCA/IHVzYWJsZSA6IGNhbWVyYXM7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3J0aG8gPSBsaXN0LmZpbmQoKGM6IGFueSkgPT4gYy5wcm9qZWN0aW9uID09PSBDYW1lcmEuUHJvamVjdGlvblR5cGUuT1JUSE8pO1xuICAgICAgICAgICAgICAgIHJldHVybiBvcnRobyB8fCBsaXN0WzBdIHx8IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjYW1lcmEgd2Ugd2lsbCByZW5kZXIgd2l0aC5cbiAgICAgICAgICAgIGxldCB3b3JsZFBvczogYW55O1xuICAgICAgICAgICAgbGV0IHdvcmxkUm90OiBhbnk7XG4gICAgICAgICAgICBsZXQgcHJvamVjdGlvbjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IG9ydGhvSGVpZ2h0OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgZm92OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgbmVhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGZhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IHZpc2liaWxpdHk6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgbGV0IHNyY1V1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBzcmNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09PSAnbm9kZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVEZWVwKHNjZW5lLCBvcHRzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtvcHRzLm5vZGVVdWlkfSBub3QgZm91bmRgLCBpbnN0cnVjdGlvbjogJ1VzZSBzY2VuZV9tYW5hZ2VtZW50KGFjdGlvbj1cImdldF9oaWVyYXJjaHlcIikgb3Igbm9kZV9saWZlY3ljbGUoYWN0aW9uPVwiZ2V0X2luZm9cIikgdG8gZmluZCBhIHZhbGlkIFVVSUQuJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB1dCA9IG5vZGUuZ2V0Q29tcG9uZW50KFVJVHJhbnNmb3JtKTtcbiAgICAgICAgICAgICAgICBpZiAoIXV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NhcHR1cmVfbm9kZSByZXF1aXJlcyB0aGUgbm9kZSB0byBoYXZlIGEgVUlUcmFuc2Zvcm0gKDJEIG5vZGUpJywgaW5zdHJ1Y3Rpb246ICdVc2UgY2FwdHVyZV9zY2VuZSBvciBjYXB0dXJlX2NhbWVyYSBmb3IgM0Qgbm9kZXMgaW5zdGVhZC4nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB1dC5nZXRCb3VuZGluZ0JveFRvV29ybGQoKTsgLy8gd29ybGQtc3BhY2UgUmVjdCB7eCwgeSwgd2lkdGgsIGhlaWdodH1cbiAgICAgICAgICAgICAgICBpZiAoIXJlY3QgfHwgcmVjdC53aWR0aCA8PSAwIHx8IHJlY3QuaGVpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBoYXMgemVyby1zaXplIHdvcmxkIGJvdW5kaW5nIGJveCcsIGluc3RydWN0aW9uOiAnVGhlIG5vZGUgKG9yIGFsbCBpdHMgY2hpbGRyZW4pIGhhcyBhIHplcm8tc2l6ZSBVSVRyYW5zZm9ybS4gU2V0IGEgbm9uLXplcm8gY29udGVudFNpemUsIG9yIGNhcHR1cmUgYSBkaWZmZXJlbnQgbm9kZS4nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlZiA9IHBpY2tNYWluKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQXNwZWN0ID0gd2lkdGggLyBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdEFzcGVjdCA9IHJlY3Qud2lkdGggLyByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAvLyBGaXQtY29udGFpbiB0aGUgbm9kZSdzIGJib3ggaW5zaWRlIHRoZSBvdXRwdXQgYXNwZWN0LlxuICAgICAgICAgICAgICAgIG9ydGhvSGVpZ2h0ID0gcmVjdEFzcGVjdCA+IGltZ0FzcGVjdCA/IChyZWN0LndpZHRoIC8gaW1nQXNwZWN0KSAvIDIgOiByZWN0LmhlaWdodCAvIDI7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FtWiA9IHJlZiA/IHJlZi5ub2RlLndvcmxkUG9zaXRpb24ueiA6IDEwMDA7XG4gICAgICAgICAgICAgICAgd29ybGRQb3MgPSBuZXcgVmVjMyhyZWN0LnggKyByZWN0LndpZHRoIC8gMiwgcmVjdC55ICsgcmVjdC5oZWlnaHQgLyAyLCBjYW1aKTtcbiAgICAgICAgICAgICAgICB3b3JsZFJvdCA9IG5ldyBRdWF0KCk7XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbiA9IENhbWVyYS5Qcm9qZWN0aW9uVHlwZS5PUlRITztcbiAgICAgICAgICAgICAgICBmb3YgPSA0NTtcbiAgICAgICAgICAgICAgICBuZWFyID0gcmVmID8gcmVmLm5lYXIgOiAxO1xuICAgICAgICAgICAgICAgIGZhciA9IHJlZiA/IHJlZi5mYXIgOiAyMDAwO1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHkgPSByZWYgPyByZWYudmlzaWJpbGl0eSA6IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBzcmM6IGFueTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY24gPSBmaW5kTm9kZURlZXAoc2NlbmUsIG9wdHMuY2FtZXJhVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENhbWVyYSBub2RlIHdpdGggVVVJRCAke29wdHMuY2FtZXJhVXVpZH0gbm90IGZvdW5kYCwgaW5zdHJ1Y3Rpb246ICdVc2Ugc2NlbmVfbWFuYWdlbWVudChhY3Rpb249XCJnZXRfaGllcmFyY2h5XCIpIHRvIGZpbmQgYSB2YWxpZCBjYW1lcmEgbm9kZSBVVUlELicgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzcmMgPSBjbi5nZXRDb21wb25lbnQoQ2FtZXJhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgJHtvcHRzLmNhbWVyYVV1aWR9IGhhcyBubyBDYW1lcmEgY29tcG9uZW50YCwgaW5zdHJ1Y3Rpb246ICdQYXNzIHRoZSBVVUlEIG9mIGEgbm9kZSB0aGF0IGhhcyBhIENhbWVyYSBjb21wb25lbnQgYXR0YWNoZWQsIG9yIHVzZSBjYXB0dXJlX3NjZW5lIHRvIGF1dG8tcGljayBvbmUuJyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gcGlja01haW4oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIENhbWVyYSBjb21wb25lbnQgZm91bmQgaW4gdGhlIGN1cnJlbnQgc2NlbmUnLCBpbnN0cnVjdGlvbjogJ0FkZCBhIENhbWVyYSBjb21wb25lbnQgdG8gYSBub2RlLCBvciB1c2UgY2FwdHVyZV9jYW1lcmEvY2FwdHVyZV9ub2RlIHdpdGggYW4gZXhwbGljaXQgdGFyZ2V0LicgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3b3JsZFBvcyA9IHNyYy5ub2RlLmdldFdvcmxkUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB3b3JsZFJvdCA9IHNyYy5ub2RlLmdldFdvcmxkUm90YXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uID0gc3JjLnByb2plY3Rpb247XG4gICAgICAgICAgICAgICAgb3J0aG9IZWlnaHQgPSBzcmMub3J0aG9IZWlnaHQ7XG4gICAgICAgICAgICAgICAgZm92ID0gc3JjLmZvdjtcbiAgICAgICAgICAgICAgICBuZWFyID0gc3JjLm5lYXI7XG4gICAgICAgICAgICAgICAgZmFyID0gc3JjLmZhcjtcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5ID0gc3JjLnZpc2liaWxpdHk7XG4gICAgICAgICAgICAgICAgc3JjVXVpZCA9IHNyYy5ub2RlLnV1aWQ7XG4gICAgICAgICAgICAgICAgc3JjTmFtZSA9IHNyYy5ub2RlLm5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE9mZnNjcmVlbiByZW5kZXIgdGFyZ2V0LlxuICAgICAgICAgICAgY29uc3QgcnQgPSBuZXcgUmVuZGVyVGV4dHVyZSgpO1xuICAgICAgICAgICAgcnQucmVzZXQoeyB3aWR0aCwgaGVpZ2h0IH0pO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcnkgY2xvbmUgY2FtZXJhIOKAlCBoaWRkZW4sIG5vdCBzYXZlZCwgYXV0by1yZW1vdmVkIGFmdGVyIGNhcHR1cmUuXG4gICAgICAgICAgICBjb25zdCBjYW1Ob2RlID0gbmV3IE5vZGUoJ19fbWNwX2NhcHR1cmVfY2FtX18nKTtcbiAgICAgICAgICAgIGNhbU5vZGUuaGlkZUZsYWdzID0gQ0NPYmplY3QuRmxhZ3MuRG9udFNhdmUgfCBDQ09iamVjdC5GbGFncy5IaWRlSW5IaWVyYXJjaHkgfCBDQ09iamVjdC5GbGFncy5Eb250RGVzdHJveTtcbiAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKGNhbU5vZGUpO1xuICAgICAgICAgICAgY2FtTm9kZS5zZXRXb3JsZFBvc2l0aW9uKHdvcmxkUG9zKTtcbiAgICAgICAgICAgIGNhbU5vZGUuc2V0V29ybGRSb3RhdGlvbih3b3JsZFJvdCk7XG4gICAgICAgICAgICBjb25zdCBjYW0gPSBjYW1Ob2RlLmFkZENvbXBvbmVudChDYW1lcmEpO1xuICAgICAgICAgICAgY2FtLnByb2plY3Rpb24gPSBwcm9qZWN0aW9uO1xuICAgICAgICAgICAgY2FtLm9ydGhvSGVpZ2h0ID0gb3J0aG9IZWlnaHQ7XG4gICAgICAgICAgICBjYW0uZm92ID0gZm92O1xuICAgICAgICAgICAgY2FtLm5lYXIgPSBuZWFyO1xuICAgICAgICAgICAgY2FtLmZhciA9IGZhcjtcbiAgICAgICAgICAgIGlmICh2aXNpYmlsaXR5ICE9PSBudWxsICYmIHZpc2liaWxpdHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNhbS52aXNpYmlsaXR5ID0gdmlzaWJpbGl0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbS5jbGVhckZsYWdzID0gQ2FtZXJhLkNsZWFyRmxhZy5TT0xJRF9DT0xPUjtcbiAgICAgICAgICAgIGNhbS5jbGVhckNvbG9yID0gbmV3IENvbG9yKGJnLnIsIGJnLmcsIGJnLmIsIGJnLmEgPT09IHVuZGVmaW5lZCA/IDI1NSA6IGJnLmEpO1xuICAgICAgICAgICAgY2FtLnRhcmdldFRleHR1cmUgPSBydDtcblxuICAgICAgICAgICAgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkgeyBjYW0udGFyZ2V0VGV4dHVyZSA9IG51bGw7IH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICB0cnkgeyBjYW1Ob2RlLmRlc3Ryb3koKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgIHRyeSB7IHJ0LmRlc3Ryb3koKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gRHJpdmUgdGhlIHJlbmRlciBwaXBlbGluZSBzbyB0aGUgb2Zmc2NyZWVuIGNhbWVyYSBhY3R1YWxseSBkcmF3cyBpbnRvXG4gICAgICAgICAgICAvLyB0aGUgUlQuIEluIGVkaXRvciBlZGl0LW1vZGUgdGhlIGF1dG8gbG9vcCBkb2VzIG5vdCByZWxpYWJseSByZW5kZXIgYW5cbiAgICAgICAgICAgIC8vIG9mZnNjcmVlbiBjYW1lcmEgd2l0aGluIGEgY291cGxlIG9mIGZyYW1lcywgc28gd2UgZm9yY2UgZnJhbWVzIHZpYVxuICAgICAgICAgICAgLy8gZGlyZWN0b3Iucm9vdC5mcmFtZU1vdmUgYW5kIGFsc28gd2FpdCByZWFsIGZyYW1lcyBhcyBhIGZhbGxiYWNrLlxuICAgICAgICAgICAgY29uc3Qgcm9vdCA9IGRpcmVjdG9yLnJvb3Q7XG4gICAgICAgICAgICBjb25zdCBjYW5Gb3JjZVJlbmRlciA9ICEhKHJvb3QgJiYgdHlwZW9mIHJvb3QuZnJhbWVNb3ZlID09PSAnZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbS5jYW1lcmEgJiYgdHlwZW9mIGNhbS5jYW1lcmEudXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbS5jYW1lcmEudXBkYXRlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cblxuICAgICAgICAgICAgYXdhaXQgd2FpdEZyYW1lcygxKTtcbiAgICAgICAgICAgIGlmIChjYW5Gb3JjZVJlbmRlcikge1xuICAgICAgICAgICAgICAgIHRyeSB7IHJvb3QuZnJhbWVNb3ZlKDApOyByb290LmZyYW1lTW92ZSgwKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgd2FpdEZyYW1lcygxKTtcbiAgICAgICAgICAgIGlmIChjYW5Gb3JjZVJlbmRlcikge1xuICAgICAgICAgICAgICAgIHRyeSB7IHJvb3QuZnJhbWVNb3ZlKDApOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IHJ0LnJlYWRQaXhlbHMoKTsgLy8gUkdCQSBieXRlcywgT3BlbkdMIG9yaWdpbiAoYm90dG9tLWxlZnQpXG4gICAgICAgICAgICBpZiAoIXJhdyB8fCByYXcubGVuZ3RoIDwgd2lkdGggKiBoZWlnaHQgKiA0KSB7XG4gICAgICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgIGNsZWFudXAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3JlYWRQaXhlbHMgcmV0dXJuZWQgbm8vaW5zdWZmaWNpZW50IGRhdGEnLCBpbnN0cnVjdGlvbjogJ1RoZSByZW5kZXIgdGFyZ2V0IGxpa2VseSBwcm9kdWNlZCBubyBmcmFtZXMuIFJldHJ5OyBpZiBpdCBwZXJzaXN0cywgcmVkdWNlIHdpZHRoL2hlaWdodCBvciBjaGVjayBHUFUgcmVhZGJhY2sgc3VwcG9ydC4nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNhbnZhcyA9IGJ1aWxkRmxpcHBlZENhbnZhcyhyYXcsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgY29uc3QgcG5nQmFzZTY0ID0gY2FudmFzVG9QbmdCYXNlNjQoY2FudmFzKTtcbiAgICAgICAgICAgIGxldCBwcmV2aWV3QmFzZTY0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcHJldmlld1dpZHRoOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcHJldmlld0hlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG9wdHMucHJldmlld01heFdpZHRoICYmIG9wdHMucHJldmlld01heEhlaWdodCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpZXcgPSByZXNpemVDYW52YXNUb1BuZ0Jhc2U2NChjYW52YXMsIG9wdHMucHJldmlld01heFdpZHRoLCBvcHRzLnByZXZpZXdNYXhIZWlnaHQpO1xuICAgICAgICAgICAgICAgIHByZXZpZXdCYXNlNjQgPSBwcmV2aWV3LmJhc2U2NDtcbiAgICAgICAgICAgICAgICBwcmV2aWV3V2lkdGggPSBwcmV2aWV3LndpZHRoO1xuICAgICAgICAgICAgICAgIHByZXZpZXdIZWlnaHQgPSBwcmV2aWV3LmhlaWdodDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgd2MgPSBjYW1Ob2RlLmdldFdvcmxkUG9zaXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHdvcmxkVW5pdHNQZXJQaXhlbCA9ICgyICogb3J0aG9IZWlnaHQpIC8gaGVpZ2h0O1xuICAgICAgICAgICAgY29uc3QgbWFwcGluZyA9IHByb2plY3Rpb24gPT09IENhbWVyYS5Qcm9qZWN0aW9uVHlwZS5PUlRITyA/IHtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uOiAnb3J0aG8nLFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWDogd2MueCxcbiAgICAgICAgICAgICAgICB3b3JsZENlbnRlclk6IHdjLnksXG4gICAgICAgICAgICAgICAgd29ybGRVbml0c1BlclBpeGVsLFxuICAgICAgICAgICAgICAgIGltYWdlV2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgICAgIGltYWdlSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgZm9ybXVsYTogJ3B4ID0gaW1nVy8yICsgKHdvcmxkWCAtIHdvcmxkQ2VudGVyWCkvd29ybGRVbml0c1BlclBpeGVsIDsgcHkgPSBpbWdILzIgLSAod29ybGRZIC0gd29ybGRDZW50ZXJZKS93b3JsZFVuaXRzUGVyUGl4ZWwnXG4gICAgICAgICAgICB9IDoge1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb246ICdwZXJzcGVjdGl2ZScsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJYOiB3Yy54LFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWTogd2MueSxcbiAgICAgICAgICAgICAgICBpbWFnZVdpZHRoOiB3aWR0aCxcbiAgICAgICAgICAgICAgICBpbWFnZUhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgIGZvcm11bGE6ICdwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uOiBwaXhlbCBtYXBwaW5nIGlzIG5vbi1saW5lYXIsIHVzZSBmb3IgdmlzdWFsIGNvbXBhcmlzb24gb25seSdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgIGNsZWFudXAgPSBudWxsO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBwbmdCYXNlNjQsIHdpZHRoLCBoZWlnaHQsIG1vZGUsXG4gICAgICAgICAgICAgICAgICAgIGNhbWVyYU5vZGVVdWlkOiBzcmNVdWlkLCBjYW1lcmFOb2RlTmFtZTogc3JjTmFtZSwgbWFwcGluZyxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlld0Jhc2U2NCwgcHJldmlld1dpZHRoLCBwcmV2aWV3SGVpZ2h0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgaWYgKGNsZWFudXApIHsgY2xlYW51cCgpOyB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IFN0cmluZyhlcnJvcikgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaWFnbm9zdGljIHByb2JlIGZvciB0aGUgaW50ZXJuYWwgYGNjZS48bmFtZXNwYWNlPmAgZW5naW5lIG1hbmFnZXJzIChlLmcuIFByZWZhYixcbiAgICAgKiBOb2RlLCBTY2VuZSkgdGhhdCBhcmVuJ3QgZXhwb3NlZCB2aWEgdGhlIG5vcm1hbCBFZGl0b3IuTWVzc2FnZSBwcm90b2NvbC4gUmVwb3J0c1xuICAgICAqIHdoaWNoIG1ldGhvZHMgZXhpc3Qgb24gdGhlIGdpdmVuIG5hbWVzcGFjZSAodW5kb2N1bWVudGVkLCB2YXJpZXMgYnkgQ3JlYXRvciBidWlsZCksXG4gICAgICogcGx1cyBvcHRpb25hbGx5IGEgbGl2ZSBub2RlJ3MgcmF3IGBfcHJlZmFiYCAoUHJlZmFiSW5mbykgc3RhdGUuIFJlYWQtb25seTsgbWFrZXMgbm9cbiAgICAgKiBzY2VuZSBjaGFuZ2VzLiBPcmlnaW5hbGx5IHdyaXR0ZW4gdG8gaW52ZXN0aWdhdGUgdGhlIFwiaW5zdGFudGlhdGUgbG9zZXMgX3ByZWZhYlxuICAgICAqIGxpbmtcIiBidWcg4oCUIGtlcHQgZ2VuZXJpYyBzbyBpdCBjYW4gYmUgcmV1c2VkIGZvciBvdGhlciBjY2UuKiBpbnZlc3RpZ2F0aW9ucy5cbiAgICAgKi9cbiAgICBwcm9iZUNjZUFwaShuYW1lc3BhY2U/OiBzdHJpbmcgfCBudWxsLCBub2RlVXVpZD86IHN0cmluZyB8IG51bGwpIHtcbiAgICAgICAgLy8gZXhlY3V0ZS1zY2VuZS1zY3JpcHQgc2VyaWFsaXplcyBhcmdzIHRocm91Z2ggSlNPTiwgdHVybmluZyBgdW5kZWZpbmVkYCBpbnRvIGBudWxsYCxcbiAgICAgICAgLy8gc28gYSBkZWZhdWx0IHBhcmFtZXRlciAoYD0gJ1ByZWZhYidgKSBuZXZlciBraWNrcyBpbiDigJQgbm9ybWFsaXplIGV4cGxpY2l0bHkgaW5zdGVhZC5cbiAgICAgICAgbmFtZXNwYWNlID0gbmFtZXNwYWNlIHx8ICdQcmVmYWInO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbWdyID0gKGdsb2JhbFRoaXMgYXMgYW55KS5jY2U/LltuYW1lc3BhY2VdO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kcyA9IG1nclxuICAgICAgICAgICAgICAgID8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWdyKVxuICAgICAgICAgICAgICAgICAgICAuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihtZ3IpIHx8IHt9KSlcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoaywgaSwgYSkgPT4gYS5pbmRleE9mKGspID09PSBpICYmIHR5cGVvZiBtZ3Jba10gPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgICAgIGxldCBub2RlSW5mbzogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChub2RlVXVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZSA/IGZpbmROb2RlRGVlcChzY2VuZSwgbm9kZVV1aWQpIDogbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZm8gPSB7IGZvdW5kOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBpID0gbm9kZS5fcHJlZmFiO1xuICAgICAgICAgICAgICAgICAgICBub2RlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzUHJlZmFiSW5mbzogISFwaSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYkluZm86IHBpID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVJZDogcGkuZmlsZUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1Jvb3Q6ICEhcGkucm9vdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290SXNTZWxmOiBwaS5yb290ID09PSBub2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogcGkuYXNzZXQ/Ll91dWlkID8/IHBpLmFzc2V0Py51dWlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VGaWxlSWQ6IHBpLmluc3RhbmNlPy5maWxlSWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbnN0YW5jZTogISFwaS5pbnN0YW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNjZUF2YWlsYWJsZTogISEoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2VBdmFpbGFibGU6ICEhbWdyLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2RzLFxuICAgICAgICAgICAgICAgICAgICBub2RlSW5mb1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTk9URTogY2NlLlByZWZhYi5saW5rTm9kZVdpdGhQcmVmYWJBc3NldCBsb29rZWQgbGlrZSB0aGUgZml4IGZvciB0aGUgbWlzc2luZ1xuICAgIC8vIF9wcmVmYWIgbGluayAoc2VlIHByb2JlQ2NlQXBpIGFib3ZlKSwgYnV0IGNhbGxpbmcgaXQgc3RhbmRhbG9uZSBtYWtlcyB0aGUgbm9kZVxuICAgIC8vIHZhbmlzaCBmcm9tIHNjZW5lIHNlcmlhbGl6YXRpb24gZW50aXJlbHkg4oCUIHdvcnNlIHRoYW4gdGhlIG9yaWdpbmFsIGJ1Zy4gSXQnc1xuICAgIC8vIGFwcGFyZW50bHkgbWVhbnQgdG8gYmUgdXNlZCBpbnRlcm5hbGx5IGFsb25nc2lkZSBvdGhlciBib29ra2VlcGluZyB0aGUgZW5naW5lIGRvZXNcbiAgICAvLyB3aGVuIGEgcHJlZmFiIGlzIGRyYWdnZWQgaW4gKG9uQWRkTm9kZSwgZXRjLiksIG5vdCBjYWxsZWQgb24gaXRzIG93bi4gRG8gbm90IHdpcmVcbiAgICAvLyB0aGlzIHVwIGFnYWluIHdpdGhvdXQgcmVwcm9kdWNpbmcgd2hhdCB0aGUgRWRpdG9yIFVJJ3MgZHJhZy1hbmQtZHJvcCBwYXRoIGFjdHVhbGx5XG4gICAgLy8gZG9lcyBlbmQtdG8tZW5kLlxuICAgICxcbiAgICAvKipcbiAgICAgKiBFdmFsdWF0ZSBhIHNuaXBwZXQgaW5zaWRlIHRoZSBzY2VuZSBwcm9jZXNzLCB3aGVyZSBgY2NgIGFuZCB0aGUgbGl2ZSBzY2VuZVxuICAgICAqIGdyYXBoIGFyZSByZWFjaGFibGUuXG4gICAgICpcbiAgICAgKiBUaGUgcHJldmlvdXMgaW1wbGVtZW50YXRpb24gdGFyZ2V0ZWQgYSBgY29uc29sZWAgc2NlbmUgc2NyaXB0IHRoYXQgbm8gbG9uZ2VyXG4gICAgICogZXhpc3RzIGluIDMuOC54LCBzbyBldmVyeSBjYWxsIGZhaWxlZCB3aXRoIFwiU2NlbmFyaW8gc2NyaXB0cyBkbyBub3QgZXhpc3RcIi5cbiAgICAgKiBUaGUgc25pcHBldCBydW5zIGFzIGFuIGFzeW5jIGZ1bmN0aW9uIGJvZHksIHNvIGl0IG1heSB1c2UgYGF3YWl0YCBhbmQgbXVzdFxuICAgICAqIGByZXR1cm5gIHdoYXRldmVyIGl0IHdhbnRzIGJhY2suXG4gICAgICpcbiAgICAgKiBwb255dGFpbDogdGhlIHJldHVybiB2YWx1ZSBpcyBKU09OLXNlcmlhbGlzZWQgYWNyb3NzIHRoZSBwcm9jZXNzIGJvdW5kYXJ5LFxuICAgICAqIHNvIGVuZ2luZSBvYmplY3RzIGNvbWUgYmFjayBhcyBwbGFpbiBkYXRhLiBOb24tc2VyaWFsaXNhYmxlIHJlc3VsdHMgZGVncmFkZVxuICAgICAqIHRvIHRoZWlyIHN0cmluZyBmb3JtIHJhdGhlciB0aGFuIGZhaWxpbmcgdGhlIGNhbGwuXG4gICAgICovXG4gICAgYXN5bmMgZXZhbFNjcmlwdChzY3JpcHQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoIXNjcmlwdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3NjcmlwdCBpcyByZXF1aXJlZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IEFzeW5jRnVuY3Rpb24gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXN5bmMgZnVuY3Rpb24gKCkgeyAvKiBub29wICovIH0pLmNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgY29uc3QgZm4gPSBuZXcgQXN5bmNGdW5jdGlvbignY2MnLCBzY3JpcHQpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oY2MpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBSb3VuZC10cmlwIHRvIHN1cmZhY2Ugbm9uLXNlcmlhbGlzYWJsZSB2YWx1ZXMgaGVyZSByYXRoZXIgdGhhblxuICAgICAgICAgICAgICAgIC8vIGFzIGFuIG9wYXF1ZSBJUEMgZmFpbHVyZS5cbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShyZXN1bHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcmVzdWx0IH0gfTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcmVzdWx0OiBTdHJpbmcocmVzdWx0KSB9IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBSZWFkIHRoZSBwcm9wZXJ0eSBzY2hlbWEgb2YgYSBjb21wb25lbnQgY2xhc3Mgc3RyYWlnaHQgZnJvbSB0aGUgZW5naW5lJ3NcbiAgICAgKiBjbGFzcyBtZXRhZGF0YS5cbiAgICAgKlxuICAgICAqIGBzY2VuZS9xdWVyeS1jbGFzc2VzYCBhbmQgYHNjZW5lL3F1ZXJ5LWNvbXBvbmVudHNgIHJldHVybiBuYW1lcyBvbmx5IOKAlCBub1xuICAgICAqIHByb3BlcnR5IGluZm9ybWF0aW9uIGF0IGFsbCDigJQgc28gYSBzY2hlbWEgbG9va3VwIGhhcyB0byByZWFjaCBpbnRvIHRoZVxuICAgICAqIHJlZ2lzdGVyZWQgY2xhc3MgaGVyZSBpbiB0aGUgcmVuZGVyZXIsIHdoZXJlIGBjY2AgaXMgbG9hZGVkLlxuICAgICAqXG4gICAgICogVGhlIHNlcmlhbGlzZWQgZmllbGQgbGlzdCBhbG9uZSBpcyBub3QgZW5vdWdoOiB0aGUgZW5naW5lIHN0b3JlcyBgY2MuTGFiZWxgXG4gICAgICogdGV4dCBhcyBgX3N0cmluZ2AgYW5kIGV4cG9zZXMgaXQgYXMgdGhlIGBzdHJpbmdgIGFjY2Vzc29yLCBhbmQgYSBjYWxsZXIgaGFzXG4gICAgICogdG8gd3JpdGUgdGhlIGFjY2Vzc29yIG5hbWUuIFNvIHRoZSBhY2Nlc3NvcnMgZGVjbGFyZWQgb24gdGhlIHByb3RvdHlwZSBjaGFpblxuICAgICAqIGFyZSBtZXJnZWQgaW4sIGFuZCBhIGJhY2tpbmcgZmllbGQgd2hvc2UgYWNjZXNzb3IgaXMgcHJlc2VudCBpcyBkcm9wcGVkLlxuICAgICAqXG4gICAgICogcG9ueXRhaWw6IHJlcG9ydHMgYXR0cmlidXRlcyB0aGUgZW5naW5lIHJlY29yZHMgKHR5cGUsIGRlZmF1bHQsIHZpc2libGUsXG4gICAgICogcmFuZ2UsIGVudW0gb3B0aW9ucykuIEFuIGFjY2Vzc29yIGNhcnJ5aW5nIG5vIGVkaXRvciBhdHRyaWJ1dGVzIGlzIHN0aWxsXG4gICAgICogbGlzdGVkLCBqdXN0IHdpdGggZmV3ZXIgZmllbGRzIGZpbGxlZCBpbi5cbiAgICAgKi9cbiAgICBkZXNjcmliZUNsYXNzKGNsYXNzTmFtZT86IHN0cmluZyB8IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBjbGFzc05hbWUgfHwgJyc7XG4gICAgICAgICAgICBpZiAoIW5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdjbGFzc05hbWUgaXMgcmVxdWlyZWQnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGN0b3IgPSBjYy5qcz8uZ2V0Q2xhc3NCeU5hbWUgPyBjYy5qcy5nZXRDbGFzc0J5TmFtZShuYW1lKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGlmICghY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENsYXNzICcke25hbWV9JyBpcyBub3QgcmVnaXN0ZXJlZCBpbiB0aGUgZW5naW5lYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhdHRycyA9IGNjLkNDQ2xhc3M/LkF0dHI/LmdldENsYXNzQXR0cnMgPyBjYy5DQ0NsYXNzLkF0dHIuZ2V0Q2xhc3NBdHRycyhjdG9yKSA6IG51bGw7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmliZSA9IChwcm9wOiBzdHJpbmcsIGV4dHJhOiBSZWNvcmQ8c3RyaW5nLCBhbnk+LCBmYWxsYmFja0tleT86IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEF0dHJpYnV0ZXMgYXJlIHNwbGl0IGFjcm9zcyB0aGUgdHdvIGtleXM6IHRoZSBhY2Nlc3NvciBjYXJyaWVzXG4gICAgICAgICAgICAgICAgLy8gYHZpc2libGVgL2BkaXNwbGF5T3JkZXJgLCBpdHMgYmFja2luZyBmaWVsZCBjYXJyaWVzIGBkZWZhdWx0YC5cbiAgICAgICAgICAgICAgICAvLyBSZWFkIHRoZSBhY2Nlc3NvciBmaXJzdCBhbmQgZmlsbCB0aGUgZ2FwcyBmcm9tIHRoZSBmaWVsZC5cbiAgICAgICAgICAgICAgICBjb25zdCByZWFkID0gKHN1ZmZpeDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghYXR0cnMpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG93biA9IGF0dHJzW2Ake3Byb3B9JF8kJHtzdWZmaXh9YF07XG4gICAgICAgICAgICAgICAgICAgIGlmIChvd24gIT09IHVuZGVmaW5lZCkgcmV0dXJuIG93bjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbGxiYWNrS2V5ID8gYXR0cnNbYCR7ZmFsbGJhY2tLZXl9JF8kJHtzdWZmaXh9YF0gOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdG9yQXR0ciA9IHJlYWQoJ2N0b3InKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbnVtTGlzdCA9IHJlYWQoJ2VudW1MaXN0Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmF3RGVmYXVsdCA9IHJlYWQoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICAvLyBBIGRlZmF1bHQgaXMgc29tZXRpbWVzIGFuIGFub255bW91cyBmYWN0b3J5IGZ1bmN0aW9uIChjYy5Db2xvciBhbmRcbiAgICAgICAgICAgICAgICAvLyBmcmllbmRzKS4gVGhlIGVuZ2luZSBvYmplY3QgaXQgYnVpbGRzIGRvZXMgbm90IHN1cnZpdmUgdGhlIEpTT04gaG9wXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBmdW5jdGlvbiBpdHNlbGYgaXMgbmFtZWxlc3MsIHNvIGNhbGwgaXQgb25jZSBhbmQgcmVwb3J0IHRoZVxuICAgICAgICAgICAgICAgIC8vIGNvbnN0cnVjdG9yIG5hbWUgYXMgdGhlIHR5cGUuXG4gICAgICAgICAgICAgICAgY29uc3QgaXNGYWN0b3J5ID0gdHlwZW9mIHJhd0RlZmF1bHQgPT09ICdmdW5jdGlvbic7XG4gICAgICAgICAgICAgICAgbGV0IGZhY3RvcnlUeXBlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgaWYgKGlzRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFjdG9yeVR5cGUgPSByYXdEZWZhdWx0KCk/LmNvbnN0cnVjdG9yPy5uYW1lO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEEgZmFjdG9yeSBuZWVkaW5nIGFyZ3VtZW50cyBvciBlbmdpbmUgc3RhdGUganVzdCB5aWVsZHMgbm8gdHlwZS5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBkZWYgPSBpc0ZhY3RvcnkgPyB1bmRlZmluZWQgOiByYXdEZWZhdWx0O1xuXG4gICAgICAgICAgICAgICAgLy8gVGhlIGVuZ2luZSBvbmx5IHJlY29yZHMgYW4gZXhwbGljaXQgYHR5cGVgIGZvciBlbnVtcyBhbmQgb2JqZWN0XG4gICAgICAgICAgICAgICAgLy8gcmVmZXJlbmNlczsgYSBwbGFpbiBzdHJpbmcvbnVtYmVyL2Jvb2xlYW4gaGFzIG5vbmUsIHNvIGluZmVyIGl0XG4gICAgICAgICAgICAgICAgLy8gZnJvbSB0aGUgZGVmYXVsdCB2YWx1ZSByYXRoZXIgdGhhbiByZXBvcnRpbmcgbm90aGluZy5cbiAgICAgICAgICAgICAgICBjb25zdCBpbmZlcnJlZCA9IGlzRmFjdG9yeVxuICAgICAgICAgICAgICAgICAgICA/IGZhY3RvcnlUeXBlXG4gICAgICAgICAgICAgICAgICAgIDogZGVmID09PSBudWxsIHx8IGRlZiA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgICAgICAgICAgOiBBcnJheS5pc0FycmF5KGRlZikgPyAnQXJyYXknIDogdHlwZW9mIGRlZjtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBwcm9wLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiByZWFkKCd0eXBlJykgPz8gKGN0b3JBdHRyICYmIGN0b3JBdHRyLm5hbWUpID8/IGluZmVycmVkLFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBkZWYsXG4gICAgICAgICAgICAgICAgICAgIHZpc2libGU6IHJlYWQoJ3Zpc2libGUnKSxcbiAgICAgICAgICAgICAgICAgICAgcmVhZG9ubHk6IHJlYWQoJ3JlYWRvbmx5JyksXG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXA6IHJlYWQoJ3Rvb2x0aXAnKSxcbiAgICAgICAgICAgICAgICAgICAgcmFuZ2U6IHJlYWQoJ3JhbmdlJyksXG4gICAgICAgICAgICAgICAgICAgIC8vIEVudW0gb3B0aW9ucyBjb21lIGJhY2sgYXMge25hbWUsIHZhbHVlfSByb3dzOyBrZWVwIGp1c3QgdGhlXG4gICAgICAgICAgICAgICAgICAgIC8vIG5hbWVzIHNvIHRoZSBwYXlsb2FkIHN0YXlzIHNtYWxsLlxuICAgICAgICAgICAgICAgICAgICBlbnVtT3B0aW9uczogQXJyYXkuaXNBcnJheShlbnVtTGlzdClcbiAgICAgICAgICAgICAgICAgICAgICAgID8gZW51bUxpc3QubWFwKChlOiBhbnkpID0+IGU/Lm5hbWUpLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIC4uLmV4dHJhXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFB1YmxpYyBhY2Nlc3NvcnMgd2Fsa2VkIG9mZiB0aGUgcHJvdG90eXBlIGNoYWluIOKAlCB0aGVzZSBhcmUgdGhlIG5hbWVzXG4gICAgICAgICAgICAvLyBhIGNhbGxlciBhY3R1YWxseSB3cml0ZXMuXG4gICAgICAgICAgICBjb25zdCBhY2Nlc3NvcnMgPSBuZXcgTWFwPHN0cmluZywgeyBzZXR0YWJsZTogYm9vbGVhbiB9PigpO1xuICAgICAgICAgICAgbGV0IHByb3RvID0gY3Rvci5wcm90b3R5cGU7XG4gICAgICAgICAgICB3aGlsZSAocHJvdG8gJiYgcHJvdG8gIT09IE9iamVjdC5wcm90b3R5cGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90bykpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2NvbnN0cnVjdG9yJyB8fCBrZXkuc3RhcnRzV2l0aCgnXycpIHx8IGFjY2Vzc29ycy5oYXMoa2V5KSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBrZXkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGVzYyAmJiBkZXNjLmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWNjZXNzb3JzLnNldChrZXksIHsgc2V0dGFibGU6ICEhZGVzYy5zZXQgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXJpYWxpc2VkIGZpZWxkcy4gQSBiYWNraW5nIGZpZWxkIGlzIHNraXBwZWQgd2hlbiBpdHMgYWNjZXNzb3IgaXNcbiAgICAgICAgICAgIC8vIHByZXNlbnQsIHNvIGBfc3RyaW5nYCBkb2VzIG5vdCBzaGFkb3cgYHN0cmluZ2AuXG4gICAgICAgICAgICBjb25zdCBmaWVsZHM6IHN0cmluZ1tdID0gKGN0b3IgYXMgYW55KS5fX3ZhbHVlc19fIHx8IFtdO1xuICAgICAgICAgICAgY29uc3Qgc2hhZG93ZWQgPSBuZXcgU2V0KFxuICAgICAgICAgICAgICAgIGZpZWxkcy5maWx0ZXIoKGY6IHN0cmluZykgPT4gZi5zdGFydHNXaXRoKCdfJykgJiYgYWNjZXNzb3JzLmhhcyhmLnNsaWNlKDEpKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gZmllbGRzXG4gICAgICAgICAgICAgICAgLmZpbHRlcigoZjogc3RyaW5nKSA9PiAhc2hhZG93ZWQuaGFzKGYpKVxuICAgICAgICAgICAgICAgIC5tYXAoKGY6IHN0cmluZykgPT4gZGVzY3JpYmUoZiwgeyBzZXJpYWxpemVkOiB0cnVlIH0pKTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBba2V5LCBpbmZvXSBvZiBhY2Nlc3NvcnMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYWNraW5nID0gYF8ke2tleX1gO1xuICAgICAgICAgICAgICAgIHByb3BlcnRpZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgZGVzY3JpYmUoXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGFjY2Vzc29yOiB0cnVlLCByZWFkb25seTogIWluZm8uc2V0dGFibGUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNoYWRvd2VkLmhhcyhiYWNraW5nKSA/IGJhY2tpbmcgOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuZHM6IE9iamVjdC5nZXRQcm90b3R5cGVPZihjdG9yKT8ubmFtZSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnR5Q291bnQ6IHByb3BlcnRpZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhcHR1cmUgdGhlIHRyYW5zZm9ybS92aXNpYmlsaXR5IHN0YXRlIG9mIHRoZSBnaXZlbiBub2RlcyBzbyBhIGZhaWxlZCBiYXRjaFxuICAgICAqIGNhbiBiZSB1bmRvbmUuIFRoZSBlZGl0b3IgZXhwb3NlcyBubyB1bmRvIG1lc3NhZ2UsIHNvIHRoaXMgaXMgYSBkZWxpYmVyYXRlbHlcbiAgICAgKiBuYXJyb3cgaGFuZC1yb2xsZWQgc3Vic3RpdHV0ZS5cbiAgICAgKlxuICAgICAqIHBvbnl0YWlsOiByZWNvcmRzIHRyYW5zZm9ybSwgYWN0aXZlIGZsYWcgYW5kIG5hbWUgb25seSDigJQgZW5vdWdoIHRvIHVuZG8gdGhlXG4gICAgICogcHJvcGVydHkgd3JpdGVzIGEgYmF0Y2ggdHlwaWNhbGx5IG1ha2VzLiBJdCBjYW5ub3QgcmVzdG9yZSBjcmVhdGVkIG9yIGRlbGV0ZWRcbiAgICAgKiBub2RlcywgY29tcG9uZW50IGFkZC9yZW1vdmUsIG9yIGFzc2V0IHdyaXRlcy4gVG8gY292ZXIgdGhvc2UsIHNuYXBzaG90IHRoZVxuICAgICAqIHNlcmlhbGl6ZWQgc3VidHJlZSBpbnN0ZWFkIGFuZCByZS1pbnN0YW50aWF0ZSBvbiByZXN0b3JlLlxuICAgICAqL1xuICAgIHNuYXBzaG90Tm9kZXModXVpZHM/OiBzdHJpbmdbXSB8IG51bGwpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gdXVpZHMgfHwgW107XG4gICAgICAgICAgICBjb25zdCBub2RlczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiBsaXN0KSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlRGVlcChzY2VuZSwgdXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmcucHVzaCh1dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHsgeDogbm9kZS5wb3NpdGlvbi54LCB5OiBub2RlLnBvc2l0aW9uLnksIHo6IG5vZGUucG9zaXRpb24ueiB9LFxuICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogeyB4OiBub2RlLmV1bGVyQW5nbGVzLngsIHk6IG5vZGUuZXVsZXJBbmdsZXMueSwgejogbm9kZS5ldWxlckFuZ2xlcy56IH0sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7IHg6IG5vZGUuc2NhbGUueCwgeTogbm9kZS5zY2FsZS55LCB6OiBub2RlLnNjYWxlLnogfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogbm9kZS5wYXJlbnQgPyBub2RlLnBhcmVudC51dWlkIDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgc2libGluZ0luZGV4OiB0eXBlb2Ygbm9kZS5nZXRTaWJsaW5nSW5kZXggPT09ICdmdW5jdGlvbicgPyBub2RlLmdldFNpYmxpbmdJbmRleCgpIDogbnVsbFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVzLCBtaXNzaW5nLCBjYXB0dXJlZEF0OiBEYXRlLm5vdygpIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzdG9yZSBhIHNuYXBzaG90IHByb2R1Y2VkIGJ5IHNuYXBzaG90Tm9kZXMuIE5vZGVzIHRoYXQgbm8gbG9uZ2VyIGV4aXN0IGFyZVxuICAgICAqIHJlcG9ydGVkIHJhdGhlciB0aGFuIHNpbGVudGx5IHNraXBwZWQsIHNpbmNlIHRoYXQgbWVhbnMgdGhlIHJvbGxiYWNrIGlzIHBhcnRpYWwuXG4gICAgICovXG4gICAgcmVzdG9yZU5vZGVzKHNuYXBzaG90PzogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBWZWMzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZXMgPSAoc25hcHNob3QgJiYgc25hcHNob3Qubm9kZXMpIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgcmVzdG9yZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHNhdmVkIG9mIG5vZGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGZpbmROb2RlRGVlcChzY2VuZSwgc2F2ZWQudXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmcucHVzaChzYXZlZC51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHNhdmVkLm5hbWU7XG4gICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSBzYXZlZC5hY3RpdmU7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbihuZXcgVmVjMyhzYXZlZC5wb3NpdGlvbi54LCBzYXZlZC5wb3NpdGlvbi55LCBzYXZlZC5wb3NpdGlvbi56KSk7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcihzYXZlZC5yb3RhdGlvbi54LCBzYXZlZC5yb3RhdGlvbi55LCBzYXZlZC5yb3RhdGlvbi56KTtcbiAgICAgICAgICAgICAgICBub2RlLnNldFNjYWxlKG5ldyBWZWMzKHNhdmVkLnNjYWxlLngsIHNhdmVkLnNjYWxlLnksIHNhdmVkLnNjYWxlLnopKTtcbiAgICAgICAgICAgICAgICBpZiAoc2F2ZWQuc2libGluZ0luZGV4ICE9PSBudWxsICYmIHR5cGVvZiBub2RlLnNldFNpYmxpbmdJbmRleCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnNldFNpYmxpbmdJbmRleChzYXZlZC5zaWJsaW5nSW5kZXgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN0b3JlZC5wdXNoKHNhdmVkLnV1aWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IG1pc3NpbmcubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgcmVzdG9yZWQsIG1pc3NpbmcgfSxcbiAgICAgICAgICAgICAgICBlcnJvcjogbWlzc2luZy5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgICAgID8gYFJvbGxiYWNrIGluY29tcGxldGU6ICR7bWlzc2luZy5sZW5ndGh9IG5vZGUocykgbm8gbG9uZ2VyIGV4aXN0IGFuZCB3ZXJlIG5vdCByZXN0b3JlZGBcbiAgICAgICAgICAgICAgICAgICAgOiB1bmRlZmluZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqIFJlY3Vyc2l2ZWx5IGZpbmQgYSBub2RlIGJ5IFVVSUQgYW55d2hlcmUgdW5kZXIgcm9vdCAoZ2V0Q2hpbGRCeVV1aWQgaXMgbm90IHJlY3Vyc2l2ZSkuICovXG5mdW5jdGlvbiBmaW5kTm9kZURlZXAocm9vdDogYW55LCB1dWlkOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICghcm9vdCB8fCAhdXVpZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIGlmIChyb290LnV1aWQgPT09IHV1aWQpIHsgcmV0dXJuIHJvb3Q7IH1cbiAgICBjb25zdCBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4gfHwgW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmROb2RlRGVlcChjaGlsZCwgdXVpZCk7XG4gICAgICAgIGlmIChmb3VuZCkgeyByZXR1cm4gZm91bmQ7IH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKiBXYWl0IE4gcmVuZGVyZWQgZnJhbWVzIGluIHRoZSBzY2VuZSBwcm9jZXNzIGJlZm9yZSByZWFkaW5nIGJhY2sgcGl4ZWxzLiAqL1xuZnVuY3Rpb24gd2FpdEZyYW1lcyhuOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBnOiBhbnkgPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICBjb25zdCByYWY6IChjYjogKCkgPT4gdm9pZCkgPT4gYW55ID0gdHlwZW9mIGcucmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gZy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZChnKVxuICAgICAgICA6IChjYjogKCkgPT4gdm9pZCkgPT4gc2V0VGltZW91dChjYiwgMTYpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIGlmIChjb3VudCA+PSBuKSB7IHJlc29sdmUoKTsgfSBlbHNlIHsgcmFmKHRpY2spOyB9XG4gICAgICAgIH07XG4gICAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGNhbnZhcyBmcm9tIHJhdyBSR0JBIGJ5dGVzIChPcGVuR0wgYm90dG9tLWxlZnQgb3JpZ2luKSwgZmxpcHBpbmdcbiAqIHZlcnRpY2FsbHkgc28gdGhlIGltYWdlIGlzIHVwcmlnaHQuIFVzZXMgdGhlIHNjZW5lIHByb2Nlc3MgRE9NIGNhbnZhcywgd2hpY2hcbiAqIHRoZSBXZWJHTCBlbmdpbmUgcmVuZGVyZXIgYWx3YXlzIHByb3ZpZGVzLlxuICovXG5mdW5jdGlvbiBidWlsZEZsaXBwZWRDYW52YXMocmF3OiBVaW50OEFycmF5LCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGFueSB7XG4gICAgY29uc3QgZzogYW55ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gICAgY29uc3QgZG9jOiBhbnkgPSBnLmRvY3VtZW50O1xuICAgIGlmICghZG9jIHx8IHR5cGVvZiBkb2MuY3JlYXRlRWxlbWVudCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2RvY3VtZW50L2NhbnZhcyBub3QgYXZhaWxhYmxlIGluIHNjZW5lIGNvbnRleHQgZm9yIFBORyBlbmNvZGluZycpO1xuICAgIH1cbiAgICBjb25zdCBjYW52YXM6IGFueSA9IGRvYy5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIGNvbnN0IGN0eDogYW55ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29uc3QgaW1nOiBhbnkgPSBjdHguY3JlYXRlSW1hZ2VEYXRhKHdpZHRoLCBoZWlnaHQpO1xuICAgIGNvbnN0IHJvd0J5dGVzID0gd2lkdGggKiA0O1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgY29uc3Qgc3JjU3RhcnQgPSAoaGVpZ2h0IC0gMSAtIHkpICogcm93Qnl0ZXM7XG4gICAgICAgIGltZy5kYXRhLnNldChyYXcuc3ViYXJyYXkoc3JjU3RhcnQsIHNyY1N0YXJ0ICsgcm93Qnl0ZXMpLCB5ICogcm93Qnl0ZXMpO1xuICAgIH1cbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltZywgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbn1cblxuLyoqIEVuY29kZSBhIGNhbnZhcyB0byBiYXNlNjQgUE5HIChubyBkYXRhIFVSTCBwcmVmaXgpLiAqL1xuZnVuY3Rpb24gY2FudmFzVG9QbmdCYXNlNjQoY2FudmFzOiBhbnkpOiBzdHJpbmcge1xuICAgIGNvbnN0IGRhdGFVcmw6IHN0cmluZyA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuICAgIHJldHVybiBkYXRhVXJsLnN1YnN0cmluZyhkYXRhVXJsLmluZGV4T2YoJywnKSArIDEpO1xufVxuXG4vKiogRG93bnNjYWxlIChuZXZlciB1cHNjYWxlKSBhIGNhbnZhcyB0byBmaXQgd2l0aGluIG1heFdpZHRoIHggbWF4SGVpZ2h0LCBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbywgYW5kIGVuY29kZSBhcyBiYXNlNjQgUE5HLiAqL1xuZnVuY3Rpb24gcmVzaXplQ2FudmFzVG9QbmdCYXNlNjQoY2FudmFzOiBhbnksIG1heFdpZHRoOiBudW1iZXIsIG1heEhlaWdodDogbnVtYmVyKTogeyBiYXNlNjQ6IHN0cmluZzsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB7XG4gICAgY29uc3QgZzogYW55ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gICAgY29uc3QgZG9jOiBhbnkgPSBnLmRvY3VtZW50O1xuICAgIGNvbnN0IHNjYWxlID0gTWF0aC5taW4oMSwgbWF4V2lkdGggLyBjYW52YXMud2lkdGgsIG1heEhlaWdodCAvIGNhbnZhcy5oZWlnaHQpO1xuICAgIGNvbnN0IG91dFdpZHRoID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChjYW52YXMud2lkdGggKiBzY2FsZSkpO1xuICAgIGNvbnN0IG91dEhlaWdodCA9IE1hdGgubWF4KDEsIE1hdGgucm91bmQoY2FudmFzLmhlaWdodCAqIHNjYWxlKSk7XG4gICAgaWYgKHNjYWxlID49IDEpIHtcbiAgICAgICAgcmV0dXJuIHsgYmFzZTY0OiBjYW52YXNUb1BuZ0Jhc2U2NChjYW52YXMpLCB3aWR0aDogY2FudmFzLndpZHRoLCBoZWlnaHQ6IGNhbnZhcy5oZWlnaHQgfTtcbiAgICB9XG4gICAgY29uc3Qgb3V0Q2FudmFzOiBhbnkgPSBkb2MuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgb3V0Q2FudmFzLndpZHRoID0gb3V0V2lkdGg7XG4gICAgb3V0Q2FudmFzLmhlaWdodCA9IG91dEhlaWdodDtcbiAgICBjb25zdCBjdHg6IGFueSA9IG91dENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGN0eC5kcmF3SW1hZ2UoY2FudmFzLCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQsIDAsIDAsIG91dFdpZHRoLCBvdXRIZWlnaHQpO1xuICAgIHJldHVybiB7IGJhc2U2NDogY2FudmFzVG9QbmdCYXNlNjQob3V0Q2FudmFzKSwgd2lkdGg6IG91dFdpZHRoLCBoZWlnaHQ6IG91dEhlaWdodCB9O1xufSJdfQ==