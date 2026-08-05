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
     * Control animation on a node (play/stop/pause/resume)
     */
    controlAnimation(nodeUuid, command, clipName) {
        try {
            const { director, js, Animation } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }
            const node = scene.getChildByUuid(nodeUuid);
            if (!node) {
                return { success: false, error: `Node with UUID ${nodeUuid} not found` };
            }
            const anim = node.getComponent(Animation);
            if (!anim) {
                return { success: false, error: 'No Animation component found on node' };
            }
            switch (command) {
                case 'play':
                    if (clipName) {
                        anim.play(clipName);
                    }
                    else {
                        anim.play();
                    }
                    return { success: true, message: `Animation play: ${clipName || 'default'}` };
                case 'stop':
                    anim.stop();
                    return { success: true, message: 'Animation stopped' };
                case 'pause':
                    anim.pause();
                    return { success: true, message: 'Animation paused' };
                case 'resume':
                    anim.resume();
                    return { success: true, message: 'Animation resumed' };
                default:
                    return { success: false, error: `Unknown animation command: ${command}` };
            }
        }
        catch (error) {
            return { success: false, error: error.message };
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
    probeCceApi(namespace = 'Prefab', nodeUuid) {
        var _a, _b, _c, _d, _e, _f, _g;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFNUMsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOztPQUVHO0lBQ0gsY0FBYztRQUNWLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7WUFDekIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQztRQUN4RSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFF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QVEsQ0FBQztJQUM1QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLElBQUksS0FBSyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2IsT0FBTyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzdGLENBQUM7SUFDRCxNQUFNLFNBQVMsR0FBUSxHQUFHLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25ELFNBQVMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO0lBQzNCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDO0lBQzdCLE1BQU0sR0FBRyxHQUFRLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQztBQUN4RixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XG5cbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IHNjZW5lXG4gICAgICovXG4gICAgY3JlYXRlTmV3U2NlbmUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBTY2VuZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gbmV3IFNjZW5lKCk7XG4gICAgICAgICAgICBzY2VuZS5uYW1lID0gJ05ldyBTY2VuZSc7XG4gICAgICAgICAgICBkaXJlY3Rvci5ydW5TY2VuZShzY2VuZSk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnTmV3IHNjZW5lIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgY29tcG9uZW50IHRvIGEgbm9kZVxuICAgICAqL1xuICAgIGFkZENvbXBvbmVudFRvTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmluZCBub2RlIGJ5IFVVSURcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEdldCBjb21wb25lbnQgY2xhc3NcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBjb21wb25lbnRcbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBhZGRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXBvbmVudC51dWlkIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBjb21wb25lbnQgZnJvbSBhIG5vZGVcbiAgICAgKi9cbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQoY29tcG9uZW50KTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSByZW1vdmVkIHN1Y2Nlc3NmdWxseWAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IG5vZGVcbiAgICAgKi9cbiAgICBjcmVhdGVOb2RlKG5hbWU6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgTm9kZSB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBuZXcgTm9kZShuYW1lKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnQgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChwYXJlbnRVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzY2VuZS5hZGRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTm9kZSAke25hbWV9IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBub2RlIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogbm9kZS5wb3NpdGlvbixcbiAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IG5vZGUucm90YXRpb24sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiBub2RlLnNjYWxlLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogbm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IGNoaWxkLnV1aWQpLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBub2RlcyBpbiBzY2VuZVxuICAgICAqL1xuICAgIGdldEFsbE5vZGVzKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgY29sbGVjdE5vZGVzID0gKG5vZGU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlLnBhcmVudD8udXVpZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG5vZGUuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQ6IGFueSkgPT4gY29sbGVjdE5vZGVzKGNoaWxkKSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY2VuZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZDogYW55KSA9PiBjb2xsZWN0Tm9kZXMoY2hpbGQpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbm9kZXMgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBub2RlIGJ5IG5hbWVcbiAgICAgKi9cbiAgICBmaW5kTm9kZUJ5TmFtZShuYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeU5hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggbmFtZSAke25hbWV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgc2NlbmUgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBnZXRDdXJyZW50U2NlbmVJbmZvKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHNjZW5lLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHNjZW5lLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogc2NlbmUuY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IG5vZGUgcHJvcGVydHlcbiAgICAgKi9cbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldCBwcm9wZXJ0eVxuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2YWx1ZS54IHx8IDAsIHZhbHVlLnkgfHwgMCwgdmFsdWUueiB8fCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdyb3RhdGlvbicpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3NjYWxlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0U2NhbGUodmFsdWUueCB8fCAxLCB2YWx1ZS55IHx8IDEsIHZhbHVlLnogfHwgMSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnYWN0aXZlJykge1xuICAgICAgICAgICAgICAgIG5vZGUuYWN0aXZlID0gdmFsdWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbmFtZScpIHtcbiAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gVHJ5IHNldHRpbmcgcHJvcGVydHkgZGlyZWN0bHlcbiAgICAgICAgICAgICAgICAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJvcGVydHkgJyR7cHJvcGVydHl9JyB1cGRhdGVkIHN1Y2Nlc3NmdWxseWAgXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc2NlbmUgaGllcmFyY2h5XG4gICAgICovXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHByb2Nlc3NOb2RlID0gKG5vZGU6IGFueSk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW11cbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVDb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoY29tcDogYW55KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogY29tcC5jb25zdHJ1Y3Rvci5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5tYXAoKGNoaWxkOiBhbnkpID0+IHByb2Nlc3NOb2RlKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHNjZW5lLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGhpZXJhcmNoeSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBwcmVmYWIgZnJvbSBhIG5vZGUgYnkgZGVsZWdhdGluZyB0byB0aGUgZW5naW5lJ3Mgb2ZmaWNpYWxcbiAgICAgKiBQcmVmYWJNYW5hZ2VyIChjY2UuUHJlZmFiLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUpLiBSZXBsaWNhdGVzIHRoZVxuICAgICAqIGVkaXRvcidzIFwiZHJhZyBub2RlIHRvIEFzc2V0c1wiIGZsb3cg4oCUIGhhbmRsZXMgc2NyaXB0IF9fdHlwZV9fIGNvbXByZXNzaW9uLFxuICAgICAqIEBwcm9wZXJ0eSByZWYgc2VyaWFsaXphdGlvbiwgYW5kIHNvdXJjZS1ub2RlIHJlbGlua2luZy5cbiAgICAgKi9cbiAgICAvKipcbiAgICAgKiBSZXZlcnQgYSBwcmVmYWIgaW5zdGFuY2UgdG8gbWF0Y2ggaXRzIHNvdXJjZSBhc3NldCBieSBkZWxlZ2F0aW5nIHRvXG4gICAgICogY2NlLlByZWZhYi5yZXZlcnRQcmVmYWIuIE5vIHB1YmxpYyBzY2VuZSBtZXNzYWdlIGV4aXN0cyBmb3IgdGhpcy5cbiAgICAgKi9cbiAgICBhc3luYyByZXZlcnRQcmVmYWJJbnN0YW5jZShub2RlVXVpZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZ3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZT8uUHJlZmFiO1xuICAgICAgICAgICAgaWYgKCFtZ3IgfHwgdHlwZW9mIG1nci5yZXZlcnRQcmVmYWIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdjY2UuUHJlZmFiLnJldmVydFByZWZhYiBub3QgYXZhaWxhYmxlIGluIHRoaXMgQ29jb3MgQ3JlYXRvciB2ZXJzaW9uJ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhcHBsaWVkID0gYXdhaXQgbWdyLnJldmVydFByZWZhYihub2RlVXVpZCk7XG4gICAgICAgICAgICAvLyBFbmdpbmUgcmV0dXJucyBmYWxzZSB3aGVuIHRoZSBub2RlIGhhcyBubyBvdmVycmlkZXMgdG8gcmV2ZXJ0IOKAlFxuICAgICAgICAgICAgLy8gbm90IGFuIGVycm9yLCBqdXN0IGEgbm8tb3AuIFN1cmZhY2UgaXQgc28gY2FsbGVycyBjYW4gZGlzdGluZ3Vpc2guXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBhcHBsaWVkOiBhcHBsaWVkICE9PSBmYWxzZSB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIGNyZWF0ZVByZWZhYkZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIHVybDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBtZ3IgPSAoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZT8uUHJlZmFiO1xuICAgICAgICAgICAgaWYgKCFtZ3IgfHwgdHlwZW9mIG1nci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnY2NlLlByZWZhYi5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBDb2NvcyBDcmVhdG9yIHZlcnNpb24nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJlZmFiVXVpZCA9IGF3YWl0IG1nci5jcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlKG5vZGVVdWlkLCB1cmwpO1xuICAgICAgICAgICAgaWYgKCFwcmVmYWJVdWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSByZXR1cm5lZCBudWxsL3VuZGVmaW5lZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHByZWZhYlV1aWQsIHVybCwgc291cmNlTm9kZVV1aWQ6IG5vZGVVdWlkIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnRyb2wgYW5pbWF0aW9uIG9uIGEgbm9kZSAocGxheS9zdG9wL3BhdXNlL3Jlc3VtZSlcbiAgICAgKi9cbiAgICBjb250cm9sQW5pbWF0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIGNvbW1hbmQ6IHN0cmluZywgY2xpcE5hbWU/OiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIGpzLCBBbmltYXRpb24gfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhbmltID0gbm9kZS5nZXRDb21wb25lbnQoQW5pbWF0aW9uKTtcbiAgICAgICAgICAgIGlmICghYW5pbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gbm9kZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAncGxheSc6XG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGlwTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbS5wbGF5KGNsaXBOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW0ucGxheSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBbmltYXRpb24gcGxheTogJHtjbGlwTmFtZSB8fCAnZGVmYXVsdCd9YCB9O1xuICAgICAgICAgICAgICAgIGNhc2UgJ3N0b3AnOlxuICAgICAgICAgICAgICAgICAgICBhbmltLnN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0FuaW1hdGlvbiBzdG9wcGVkJyB9O1xuICAgICAgICAgICAgICAgIGNhc2UgJ3BhdXNlJzpcbiAgICAgICAgICAgICAgICAgICAgYW5pbS5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQW5pbWF0aW9uIHBhdXNlZCcgfTtcbiAgICAgICAgICAgICAgICBjYXNlICdyZXN1bWUnOlxuICAgICAgICAgICAgICAgICAgICBhbmltLnJlc3VtZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQW5pbWF0aW9uIHJlc3VtZWQnIH07XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhbmltYXRpb24gY29tbWFuZDogJHtjb21tYW5kfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGNvbXBvbmVudCBwcm9wZXJ0eVxuICAgICAqL1xuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0ganMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IHR5cGUgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY29tbW9uIHByb3BlcnRpZXNcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyAmJiBjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJykge1xuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgdmFsdWUgYXMgdXVpZCBvciBhc3NldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IHRvIGZpbmQgYnkgdXVpZCBmaXJzdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldE1hbmFnZXIgPSByZXF1aXJlKCdjYycpLmFzc2V0TWFuYWdlcjtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLnJlc291cmNlcy5sb2FkKHZhbHVlLCByZXF1aXJlKCdjYycpLlNwcml0ZUZyYW1lLCAoZXJyOiBhbnksIHNwcml0ZUZyYW1lOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIHNwcml0ZUZyYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNwcml0ZUZyYW1lID0gc3ByaXRlRnJhbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyeSBsb2FkaW5nIGJ5IHV1aWRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlIH0sIChlcnIyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIyICYmIGFzc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSBhc3NldDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIERpcmVjdCBhc3NpZ25tZW50IChjb21wYXRpYmxlIHdpdGggcGFzc2VkIGFzc2V0IG9iamVjdHMpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnbWF0ZXJpYWwnICYmIChjb21wb25lbnRUeXBlID09PSAnY2MuU3ByaXRlJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuTWVzaFJlbmRlcmVyJykpIHtcbiAgICAgICAgICAgICAgICAvLyBTdXBwb3J0IHZhbHVlIGFzIHV1aWQgb3IgYXNzZXQgcGF0aFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIucmVzb3VyY2VzLmxvYWQodmFsdWUsIHJlcXVpcmUoJ2NjJykuTWF0ZXJpYWwsIChlcnI6IGFueSwgbWF0ZXJpYWw6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgbWF0ZXJpYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBtYXRlcmlhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRNYW5hZ2VyLmxvYWRBbnkoeyB1dWlkOiB2YWx1ZSB9LCAoZXJyMjogYW55LCBhc3NldDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyMiAmJiBhc3NldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Lm1hdGVyaWFsID0gYXNzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc3RyaW5nJyAmJiAoY29tcG9uZW50VHlwZSA9PT0gJ2NjLkxhYmVsJyB8fCBjb21wb25lbnRUeXBlID09PSAnY2MuUmljaFRleHQnKSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdHJpbmcgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50W3Byb3BlcnR5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gT3B0aW9uYWw6IHJlZnJlc2ggSW5zcGVjdG9yXG4gICAgICAgICAgICAvLyBFZGl0b3IuTWVzc2FnZS5zZW5kKCdzY2VuZScsICdzbmFwc2hvdCcpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCBwcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIGN1cnJlbnRseS1vcGVuIHNjZW5lL3ByZWZhYiB0byBhIFBORyAocmV0dXJuZWQgYXMgYmFzZTY0KSB1c2luZyBhblxuICAgICAqIG9mZnNjcmVlbiBjbG9uZSBDYW1lcmEgKyBSZW5kZXJUZXh0dXJlLiBUaGlzIHByb2R1Y2VzIGEgQ0xFQU4gaW1hZ2UgKG5vIGVkaXRvclxuICAgICAqIGdpem1vcy9ncmlkKSBhbmQgbmV2ZXIgbXV0YXRlcyB0aGUgZXhpc3RpbmcgY2FtZXJhcyDigJQgYSB0ZW1wb3JhcnksIGhpZGRlbixcbiAgICAgKiBub24tcGVyc2lzdGVkIGNhbWVyYSBub2RlIGlzIGNyZWF0ZWQsIHVzZWQgZm9yIDEtMiBmcmFtZXMsIHRoZW4gZGVzdHJveWVkLlxuICAgICAqXG4gICAgICogb3B0czoge1xuICAgICAqICAgbW9kZTogJ3NjZW5lJyB8ICdjYW1lcmEnIHwgJ25vZGUnLFxuICAgICAqICAgY2FtZXJhVXVpZD86IHN0cmluZywgICAvLyBmb3IgbW9kZSAnY2FtZXJhJ1xuICAgICAqICAgbm9kZVV1aWQ/OiBzdHJpbmcsICAgICAvLyBmb3IgbW9kZSAnbm9kZSdcbiAgICAgKiAgIHdpZHRoPzogbnVtYmVyLCAgICAgICAgLy8gMS4uMjA0OCwgZGVmYXVsdCAxOTIwXG4gICAgICogICBoZWlnaHQ/OiBudW1iZXIsICAgICAgIC8vIDEuLjIwNDgsIGRlZmF1bHQgMTA4MFxuICAgICAqICAgYmFja2dyb3VuZENvbG9yPzogeyByLCBnLCBiLCBhIH0gIC8vIDAuLjI1NSwgZGVmYXVsdCBvcGFxdWUgYmxhY2tcbiAgICAgKiB9XG4gICAgICogb3B0cy5wcmV2aWV3TWF4V2lkdGgvcHJldmlld01heEhlaWdodCAoYm90aCByZXF1aXJlZCB0b2dldGhlcik6IGFsc28gcmV0dXJuIGEgZG93bnNjYWxlZFxuICAgICAqIHByZXZpZXdCYXNlNjQgKG5ldmVyIHVwc2NhbGVkKSBmaXR0aW5nIHdpdGhpbiB0aG9zZSBib3VuZHMsIGFsb25nc2lkZSBwcmV2aWV3V2lkdGgvcHJldmlld0hlaWdodC5cbiAgICAgKiBSZXR1cm5zIHsgc3VjY2VzcywgZGF0YTogeyBwbmdCYXNlNjQsIHdpZHRoLCBoZWlnaHQsIG1vZGUsIGNhbWVyYU5vZGVVdWlkLCBjYW1lcmFOb2RlTmFtZSwgbWFwcGluZywgcHJldmlld0Jhc2U2ND8sIHByZXZpZXdXaWR0aD8sIHByZXZpZXdIZWlnaHQ/IH0gfS5cbiAgICAgKi9cbiAgICBhc3luYyBjYXB0dXJlU2NlbmVWaWV3KG9wdHM6IGFueSkge1xuICAgICAgICBsZXQgY2xlYW51cDogKCgpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBDYW1lcmEsIFJlbmRlclRleHR1cmUsIE5vZGUsIFZlYzMsIFF1YXQsIENvbG9yLCBDQ09iamVjdCwgVUlUcmFuc2Zvcm0gfSA9IGNjO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScsIGluc3RydWN0aW9uOiAnT3BlbiBhIHNjZW5lIGZpcnN0IHZpYSBzY2VuZV9tYW5hZ2VtZW50KGFjdGlvbj1cIm9wZW5cIiBvciBcImNyZWF0ZVwiKS4nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgbW9kZSA9IG9wdHMubW9kZSB8fCAnc2NlbmUnO1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLm1pbigyMDQ4LCBNYXRoLmZsb29yKG9wdHMud2lkdGggfHwgMTkyMCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IE1hdGgubWF4KDEsIE1hdGgubWluKDIwNDgsIE1hdGguZmxvb3Iob3B0cy5oZWlnaHQgfHwgMTA4MCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGJnID0gb3B0cy5iYWNrZ3JvdW5kQ29sb3IgfHwgeyByOiAwLCBnOiAwLCBiOiAwLCBhOiAyNTUgfTtcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgQ2FtZXJhIGNvbXBvbmVudHMgaW4gdGhlIHNjZW5lLlxuICAgICAgICAgICAgY29uc3QgY2FtZXJhczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbGxlY3QgPSAobjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFuKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIGlmIChuLmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gbi5nZXRDb21wb25lbnQoQ2FtZXJhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHsgY2FtZXJhcy5wdXNoKGMpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChuLmNoaWxkcmVuIHx8IFtdKS5mb3JFYWNoKGNvbGxlY3QpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjZW5lLmNoaWxkcmVuLmZvckVhY2goY29sbGVjdCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBpY2tNYWluID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzYWJsZSA9IGNhbWVyYXMuZmlsdGVyKChjOiBhbnkpID0+IGMuZW5hYmxlZEluSGllcmFyY2h5ICE9PSBmYWxzZSAmJiAhYy50YXJnZXRUZXh0dXJlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gdXNhYmxlLmxlbmd0aCA/IHVzYWJsZSA6IGNhbWVyYXM7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3J0aG8gPSBsaXN0LmZpbmQoKGM6IGFueSkgPT4gYy5wcm9qZWN0aW9uID09PSBDYW1lcmEuUHJvamVjdGlvblR5cGUuT1JUSE8pO1xuICAgICAgICAgICAgICAgIHJldHVybiBvcnRobyB8fCBsaXN0WzBdIHx8IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjYW1lcmEgd2Ugd2lsbCByZW5kZXIgd2l0aC5cbiAgICAgICAgICAgIGxldCB3b3JsZFBvczogYW55O1xuICAgICAgICAgICAgbGV0IHdvcmxkUm90OiBhbnk7XG4gICAgICAgICAgICBsZXQgcHJvamVjdGlvbjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IG9ydGhvSGVpZ2h0OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgZm92OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgbmVhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGZhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IHZpc2liaWxpdHk6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgbGV0IHNyY1V1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBzcmNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09PSAnbm9kZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVEZWVwKHNjZW5lLCBvcHRzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtvcHRzLm5vZGVVdWlkfSBub3QgZm91bmRgLCBpbnN0cnVjdGlvbjogJ1VzZSBzY2VuZV9tYW5hZ2VtZW50KGFjdGlvbj1cImdldF9oaWVyYXJjaHlcIikgb3Igbm9kZV9saWZlY3ljbGUoYWN0aW9uPVwiZ2V0X2luZm9cIikgdG8gZmluZCBhIHZhbGlkIFVVSUQuJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB1dCA9IG5vZGUuZ2V0Q29tcG9uZW50KFVJVHJhbnNmb3JtKTtcbiAgICAgICAgICAgICAgICBpZiAoIXV0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2NhcHR1cmVfbm9kZSByZXF1aXJlcyB0aGUgbm9kZSB0byBoYXZlIGEgVUlUcmFuc2Zvcm0gKDJEIG5vZGUpJywgaW5zdHJ1Y3Rpb246ICdVc2UgY2FwdHVyZV9zY2VuZSBvciBjYXB0dXJlX2NhbWVyYSBmb3IgM0Qgbm9kZXMgaW5zdGVhZC4nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB1dC5nZXRCb3VuZGluZ0JveFRvV29ybGQoKTsgLy8gd29ybGQtc3BhY2UgUmVjdCB7eCwgeSwgd2lkdGgsIGhlaWdodH1cbiAgICAgICAgICAgICAgICBpZiAoIXJlY3QgfHwgcmVjdC53aWR0aCA8PSAwIHx8IHJlY3QuaGVpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBoYXMgemVyby1zaXplIHdvcmxkIGJvdW5kaW5nIGJveCcsIGluc3RydWN0aW9uOiAnVGhlIG5vZGUgKG9yIGFsbCBpdHMgY2hpbGRyZW4pIGhhcyBhIHplcm8tc2l6ZSBVSVRyYW5zZm9ybS4gU2V0IGEgbm9uLXplcm8gY29udGVudFNpemUsIG9yIGNhcHR1cmUgYSBkaWZmZXJlbnQgbm9kZS4nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlZiA9IHBpY2tNYWluKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQXNwZWN0ID0gd2lkdGggLyBoZWlnaHQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVjdEFzcGVjdCA9IHJlY3Qud2lkdGggLyByZWN0LmhlaWdodDtcbiAgICAgICAgICAgICAgICAvLyBGaXQtY29udGFpbiB0aGUgbm9kZSdzIGJib3ggaW5zaWRlIHRoZSBvdXRwdXQgYXNwZWN0LlxuICAgICAgICAgICAgICAgIG9ydGhvSGVpZ2h0ID0gcmVjdEFzcGVjdCA+IGltZ0FzcGVjdCA/IChyZWN0LndpZHRoIC8gaW1nQXNwZWN0KSAvIDIgOiByZWN0LmhlaWdodCAvIDI7XG4gICAgICAgICAgICAgICAgY29uc3QgY2FtWiA9IHJlZiA/IHJlZi5ub2RlLndvcmxkUG9zaXRpb24ueiA6IDEwMDA7XG4gICAgICAgICAgICAgICAgd29ybGRQb3MgPSBuZXcgVmVjMyhyZWN0LnggKyByZWN0LndpZHRoIC8gMiwgcmVjdC55ICsgcmVjdC5oZWlnaHQgLyAyLCBjYW1aKTtcbiAgICAgICAgICAgICAgICB3b3JsZFJvdCA9IG5ldyBRdWF0KCk7XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbiA9IENhbWVyYS5Qcm9qZWN0aW9uVHlwZS5PUlRITztcbiAgICAgICAgICAgICAgICBmb3YgPSA0NTtcbiAgICAgICAgICAgICAgICBuZWFyID0gcmVmID8gcmVmLm5lYXIgOiAxO1xuICAgICAgICAgICAgICAgIGZhciA9IHJlZiA/IHJlZi5mYXIgOiAyMDAwO1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHkgPSByZWYgPyByZWYudmlzaWJpbGl0eSA6IG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxldCBzcmM6IGFueTtcbiAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2NhbWVyYScpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY24gPSBmaW5kTm9kZURlZXAoc2NlbmUsIG9wdHMuY2FtZXJhVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY24pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENhbWVyYSBub2RlIHdpdGggVVVJRCAke29wdHMuY2FtZXJhVXVpZH0gbm90IGZvdW5kYCwgaW5zdHJ1Y3Rpb246ICdVc2Ugc2NlbmVfbWFuYWdlbWVudChhY3Rpb249XCJnZXRfaGllcmFyY2h5XCIpIHRvIGZpbmQgYSB2YWxpZCBjYW1lcmEgbm9kZSBVVUlELicgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzcmMgPSBjbi5nZXRDb21wb25lbnQoQ2FtZXJhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgJHtvcHRzLmNhbWVyYVV1aWR9IGhhcyBubyBDYW1lcmEgY29tcG9uZW50YCwgaW5zdHJ1Y3Rpb246ICdQYXNzIHRoZSBVVUlEIG9mIGEgbm9kZSB0aGF0IGhhcyBhIENhbWVyYSBjb21wb25lbnQgYXR0YWNoZWQsIG9yIHVzZSBjYXB0dXJlX3NjZW5lIHRvIGF1dG8tcGljayBvbmUuJyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3JjID0gcGlja01haW4oKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIENhbWVyYSBjb21wb25lbnQgZm91bmQgaW4gdGhlIGN1cnJlbnQgc2NlbmUnLCBpbnN0cnVjdGlvbjogJ0FkZCBhIENhbWVyYSBjb21wb25lbnQgdG8gYSBub2RlLCBvciB1c2UgY2FwdHVyZV9jYW1lcmEvY2FwdHVyZV9ub2RlIHdpdGggYW4gZXhwbGljaXQgdGFyZ2V0LicgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB3b3JsZFBvcyA9IHNyYy5ub2RlLmdldFdvcmxkUG9zaXRpb24oKTtcbiAgICAgICAgICAgICAgICB3b3JsZFJvdCA9IHNyYy5ub2RlLmdldFdvcmxkUm90YXRpb24oKTtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uID0gc3JjLnByb2plY3Rpb247XG4gICAgICAgICAgICAgICAgb3J0aG9IZWlnaHQgPSBzcmMub3J0aG9IZWlnaHQ7XG4gICAgICAgICAgICAgICAgZm92ID0gc3JjLmZvdjtcbiAgICAgICAgICAgICAgICBuZWFyID0gc3JjLm5lYXI7XG4gICAgICAgICAgICAgICAgZmFyID0gc3JjLmZhcjtcbiAgICAgICAgICAgICAgICB2aXNpYmlsaXR5ID0gc3JjLnZpc2liaWxpdHk7XG4gICAgICAgICAgICAgICAgc3JjVXVpZCA9IHNyYy5ub2RlLnV1aWQ7XG4gICAgICAgICAgICAgICAgc3JjTmFtZSA9IHNyYy5ub2RlLm5hbWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE9mZnNjcmVlbiByZW5kZXIgdGFyZ2V0LlxuICAgICAgICAgICAgY29uc3QgcnQgPSBuZXcgUmVuZGVyVGV4dHVyZSgpO1xuICAgICAgICAgICAgcnQucmVzZXQoeyB3aWR0aCwgaGVpZ2h0IH0pO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcnkgY2xvbmUgY2FtZXJhIOKAlCBoaWRkZW4sIG5vdCBzYXZlZCwgYXV0by1yZW1vdmVkIGFmdGVyIGNhcHR1cmUuXG4gICAgICAgICAgICBjb25zdCBjYW1Ob2RlID0gbmV3IE5vZGUoJ19fbWNwX2NhcHR1cmVfY2FtX18nKTtcbiAgICAgICAgICAgIGNhbU5vZGUuaGlkZUZsYWdzID0gQ0NPYmplY3QuRmxhZ3MuRG9udFNhdmUgfCBDQ09iamVjdC5GbGFncy5IaWRlSW5IaWVyYXJjaHkgfCBDQ09iamVjdC5GbGFncy5Eb250RGVzdHJveTtcbiAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKGNhbU5vZGUpO1xuICAgICAgICAgICAgY2FtTm9kZS5zZXRXb3JsZFBvc2l0aW9uKHdvcmxkUG9zKTtcbiAgICAgICAgICAgIGNhbU5vZGUuc2V0V29ybGRSb3RhdGlvbih3b3JsZFJvdCk7XG4gICAgICAgICAgICBjb25zdCBjYW0gPSBjYW1Ob2RlLmFkZENvbXBvbmVudChDYW1lcmEpO1xuICAgICAgICAgICAgY2FtLnByb2plY3Rpb24gPSBwcm9qZWN0aW9uO1xuICAgICAgICAgICAgY2FtLm9ydGhvSGVpZ2h0ID0gb3J0aG9IZWlnaHQ7XG4gICAgICAgICAgICBjYW0uZm92ID0gZm92O1xuICAgICAgICAgICAgY2FtLm5lYXIgPSBuZWFyO1xuICAgICAgICAgICAgY2FtLmZhciA9IGZhcjtcbiAgICAgICAgICAgIGlmICh2aXNpYmlsaXR5ICE9PSBudWxsICYmIHZpc2liaWxpdHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNhbS52aXNpYmlsaXR5ID0gdmlzaWJpbGl0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhbS5jbGVhckZsYWdzID0gQ2FtZXJhLkNsZWFyRmxhZy5TT0xJRF9DT0xPUjtcbiAgICAgICAgICAgIGNhbS5jbGVhckNvbG9yID0gbmV3IENvbG9yKGJnLnIsIGJnLmcsIGJnLmIsIGJnLmEgPT09IHVuZGVmaW5lZCA/IDI1NSA6IGJnLmEpO1xuICAgICAgICAgICAgY2FtLnRhcmdldFRleHR1cmUgPSBydDtcblxuICAgICAgICAgICAgY2xlYW51cCA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkgeyBjYW0udGFyZ2V0VGV4dHVyZSA9IG51bGw7IH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgICAgICB0cnkgeyBjYW1Ob2RlLmRlc3Ryb3koKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgIHRyeSB7IHJ0LmRlc3Ryb3koKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gRHJpdmUgdGhlIHJlbmRlciBwaXBlbGluZSBzbyB0aGUgb2Zmc2NyZWVuIGNhbWVyYSBhY3R1YWxseSBkcmF3cyBpbnRvXG4gICAgICAgICAgICAvLyB0aGUgUlQuIEluIGVkaXRvciBlZGl0LW1vZGUgdGhlIGF1dG8gbG9vcCBkb2VzIG5vdCByZWxpYWJseSByZW5kZXIgYW5cbiAgICAgICAgICAgIC8vIG9mZnNjcmVlbiBjYW1lcmEgd2l0aGluIGEgY291cGxlIG9mIGZyYW1lcywgc28gd2UgZm9yY2UgZnJhbWVzIHZpYVxuICAgICAgICAgICAgLy8gZGlyZWN0b3Iucm9vdC5mcmFtZU1vdmUgYW5kIGFsc28gd2FpdCByZWFsIGZyYW1lcyBhcyBhIGZhbGxiYWNrLlxuICAgICAgICAgICAgY29uc3Qgcm9vdCA9IGRpcmVjdG9yLnJvb3Q7XG4gICAgICAgICAgICBjb25zdCBjYW5Gb3JjZVJlbmRlciA9ICEhKHJvb3QgJiYgdHlwZW9mIHJvb3QuZnJhbWVNb3ZlID09PSAnZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbS5jYW1lcmEgJiYgdHlwZW9mIGNhbS5jYW1lcmEudXBkYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbS5jYW1lcmEudXBkYXRlKHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cblxuICAgICAgICAgICAgYXdhaXQgd2FpdEZyYW1lcygxKTtcbiAgICAgICAgICAgIGlmIChjYW5Gb3JjZVJlbmRlcikge1xuICAgICAgICAgICAgICAgIHRyeSB7IHJvb3QuZnJhbWVNb3ZlKDApOyByb290LmZyYW1lTW92ZSgwKTsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgd2FpdEZyYW1lcygxKTtcbiAgICAgICAgICAgIGlmIChjYW5Gb3JjZVJlbmRlcikge1xuICAgICAgICAgICAgICAgIHRyeSB7IHJvb3QuZnJhbWVNb3ZlKDApOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJhdyA9IHJ0LnJlYWRQaXhlbHMoKTsgLy8gUkdCQSBieXRlcywgT3BlbkdMIG9yaWdpbiAoYm90dG9tLWxlZnQpXG4gICAgICAgICAgICBpZiAoIXJhdyB8fCByYXcubGVuZ3RoIDwgd2lkdGggKiBoZWlnaHQgKiA0KSB7XG4gICAgICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgICAgIGNsZWFudXAgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3JlYWRQaXhlbHMgcmV0dXJuZWQgbm8vaW5zdWZmaWNpZW50IGRhdGEnLCBpbnN0cnVjdGlvbjogJ1RoZSByZW5kZXIgdGFyZ2V0IGxpa2VseSBwcm9kdWNlZCBubyBmcmFtZXMuIFJldHJ5OyBpZiBpdCBwZXJzaXN0cywgcmVkdWNlIHdpZHRoL2hlaWdodCBvciBjaGVjayBHUFUgcmVhZGJhY2sgc3VwcG9ydC4nIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGNhbnZhcyA9IGJ1aWxkRmxpcHBlZENhbnZhcyhyYXcsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICAgICAgY29uc3QgcG5nQmFzZTY0ID0gY2FudmFzVG9QbmdCYXNlNjQoY2FudmFzKTtcbiAgICAgICAgICAgIGxldCBwcmV2aWV3QmFzZTY0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcHJldmlld1dpZHRoOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgICBsZXQgcHJldmlld0hlaWdodDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgICAgICAgICAgaWYgKG9wdHMucHJldmlld01heFdpZHRoICYmIG9wdHMucHJldmlld01heEhlaWdodCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHByZXZpZXcgPSByZXNpemVDYW52YXNUb1BuZ0Jhc2U2NChjYW52YXMsIG9wdHMucHJldmlld01heFdpZHRoLCBvcHRzLnByZXZpZXdNYXhIZWlnaHQpO1xuICAgICAgICAgICAgICAgIHByZXZpZXdCYXNlNjQgPSBwcmV2aWV3LmJhc2U2NDtcbiAgICAgICAgICAgICAgICBwcmV2aWV3V2lkdGggPSBwcmV2aWV3LndpZHRoO1xuICAgICAgICAgICAgICAgIHByZXZpZXdIZWlnaHQgPSBwcmV2aWV3LmhlaWdodDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgd2MgPSBjYW1Ob2RlLmdldFdvcmxkUG9zaXRpb24oKTtcbiAgICAgICAgICAgIGNvbnN0IHdvcmxkVW5pdHNQZXJQaXhlbCA9ICgyICogb3J0aG9IZWlnaHQpIC8gaGVpZ2h0O1xuICAgICAgICAgICAgY29uc3QgbWFwcGluZyA9IHByb2plY3Rpb24gPT09IENhbWVyYS5Qcm9qZWN0aW9uVHlwZS5PUlRITyA/IHtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uOiAnb3J0aG8nLFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWDogd2MueCxcbiAgICAgICAgICAgICAgICB3b3JsZENlbnRlclk6IHdjLnksXG4gICAgICAgICAgICAgICAgd29ybGRVbml0c1BlclBpeGVsLFxuICAgICAgICAgICAgICAgIGltYWdlV2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgICAgIGltYWdlSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgZm9ybXVsYTogJ3B4ID0gaW1nVy8yICsgKHdvcmxkWCAtIHdvcmxkQ2VudGVyWCkvd29ybGRVbml0c1BlclBpeGVsIDsgcHkgPSBpbWdILzIgLSAod29ybGRZIC0gd29ybGRDZW50ZXJZKS93b3JsZFVuaXRzUGVyUGl4ZWwnXG4gICAgICAgICAgICB9IDoge1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb246ICdwZXJzcGVjdGl2ZScsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJYOiB3Yy54LFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWTogd2MueSxcbiAgICAgICAgICAgICAgICBpbWFnZVdpZHRoOiB3aWR0aCxcbiAgICAgICAgICAgICAgICBpbWFnZUhlaWdodDogaGVpZ2h0LFxuICAgICAgICAgICAgICAgIGZvcm11bGE6ICdwZXJzcGVjdGl2ZSBwcm9qZWN0aW9uOiBwaXhlbCBtYXBwaW5nIGlzIG5vbi1saW5lYXIsIHVzZSBmb3IgdmlzdWFsIGNvbXBhcmlzb24gb25seSdcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNsZWFudXAoKTtcbiAgICAgICAgICAgIGNsZWFudXAgPSBudWxsO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBwbmdCYXNlNjQsIHdpZHRoLCBoZWlnaHQsIG1vZGUsXG4gICAgICAgICAgICAgICAgICAgIGNhbWVyYU5vZGVVdWlkOiBzcmNVdWlkLCBjYW1lcmFOb2RlTmFtZTogc3JjTmFtZSwgbWFwcGluZyxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlld0Jhc2U2NCwgcHJldmlld1dpZHRoLCBwcmV2aWV3SGVpZ2h0XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgaWYgKGNsZWFudXApIHsgY2xlYW51cCgpOyB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IFN0cmluZyhlcnJvcikgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaWFnbm9zdGljIHByb2JlIGZvciB0aGUgaW50ZXJuYWwgYGNjZS48bmFtZXNwYWNlPmAgZW5naW5lIG1hbmFnZXJzIChlLmcuIFByZWZhYixcbiAgICAgKiBOb2RlLCBTY2VuZSkgdGhhdCBhcmVuJ3QgZXhwb3NlZCB2aWEgdGhlIG5vcm1hbCBFZGl0b3IuTWVzc2FnZSBwcm90b2NvbC4gUmVwb3J0c1xuICAgICAqIHdoaWNoIG1ldGhvZHMgZXhpc3Qgb24gdGhlIGdpdmVuIG5hbWVzcGFjZSAodW5kb2N1bWVudGVkLCB2YXJpZXMgYnkgQ3JlYXRvciBidWlsZCksXG4gICAgICogcGx1cyBvcHRpb25hbGx5IGEgbGl2ZSBub2RlJ3MgcmF3IGBfcHJlZmFiYCAoUHJlZmFiSW5mbykgc3RhdGUuIFJlYWQtb25seTsgbWFrZXMgbm9cbiAgICAgKiBzY2VuZSBjaGFuZ2VzLiBPcmlnaW5hbGx5IHdyaXR0ZW4gdG8gaW52ZXN0aWdhdGUgdGhlIFwiaW5zdGFudGlhdGUgbG9zZXMgX3ByZWZhYlxuICAgICAqIGxpbmtcIiBidWcg4oCUIGtlcHQgZ2VuZXJpYyBzbyBpdCBjYW4gYmUgcmV1c2VkIGZvciBvdGhlciBjY2UuKiBpbnZlc3RpZ2F0aW9ucy5cbiAgICAgKi9cbiAgICBwcm9iZUNjZUFwaShuYW1lc3BhY2U6IHN0cmluZyA9ICdQcmVmYWInLCBub2RlVXVpZD86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbWdyID0gKGdsb2JhbFRoaXMgYXMgYW55KS5jY2U/LltuYW1lc3BhY2VdO1xuICAgICAgICAgICAgY29uc3QgbWV0aG9kcyA9IG1nclxuICAgICAgICAgICAgICAgID8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMobWdyKVxuICAgICAgICAgICAgICAgICAgICAuY29uY2F0KE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKE9iamVjdC5nZXRQcm90b3R5cGVPZihtZ3IpIHx8IHt9KSlcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigoaywgaSwgYSkgPT4gYS5pbmRleE9mKGspID09PSBpICYmIHR5cGVvZiBtZ3Jba10gPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KClcbiAgICAgICAgICAgICAgICA6IG51bGw7XG5cbiAgICAgICAgICAgIGxldCBub2RlSW5mbzogYW55ID0gbnVsbDtcbiAgICAgICAgICAgIGlmIChub2RlVXVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZSA/IGZpbmROb2RlRGVlcChzY2VuZSwgbm9kZVV1aWQpIDogbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZUluZm8gPSB7IGZvdW5kOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBpID0gbm9kZS5fcHJlZmFiO1xuICAgICAgICAgICAgICAgICAgICBub2RlSW5mbyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGFzUHJlZmFiSW5mbzogISFwaSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZhYkluZm86IHBpID8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVJZDogcGkuZmlsZUlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc1Jvb3Q6ICEhcGkucm9vdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb290SXNTZWxmOiBwaS5yb290ID09PSBub2RlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogcGkuYXNzZXQ/Ll91dWlkID8/IHBpLmFzc2V0Py51dWlkID8/IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VGaWxlSWQ6IHBpLmluc3RhbmNlPy5maWxlSWQgPz8gbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNJbnN0YW5jZTogISFwaS5pbnN0YW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSA6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNjZUF2YWlsYWJsZTogISEoZ2xvYmFsVGhpcyBhcyBhbnkpLmNjZSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZXNwYWNlLFxuICAgICAgICAgICAgICAgICAgICBuYW1lc3BhY2VBdmFpbGFibGU6ICEhbWdyLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2RzLFxuICAgICAgICAgICAgICAgICAgICBub2RlSW5mb1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3I/Lm1lc3NhZ2UgfHwgU3RyaW5nKGVycm9yKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTk9URTogY2NlLlByZWZhYi5saW5rTm9kZVdpdGhQcmVmYWJBc3NldCBsb29rZWQgbGlrZSB0aGUgZml4IGZvciB0aGUgbWlzc2luZ1xuICAgIC8vIF9wcmVmYWIgbGluayAoc2VlIHByb2JlQ2NlQXBpIGFib3ZlKSwgYnV0IGNhbGxpbmcgaXQgc3RhbmRhbG9uZSBtYWtlcyB0aGUgbm9kZVxuICAgIC8vIHZhbmlzaCBmcm9tIHNjZW5lIHNlcmlhbGl6YXRpb24gZW50aXJlbHkg4oCUIHdvcnNlIHRoYW4gdGhlIG9yaWdpbmFsIGJ1Zy4gSXQnc1xuICAgIC8vIGFwcGFyZW50bHkgbWVhbnQgdG8gYmUgdXNlZCBpbnRlcm5hbGx5IGFsb25nc2lkZSBvdGhlciBib29ra2VlcGluZyB0aGUgZW5naW5lIGRvZXNcbiAgICAvLyB3aGVuIGEgcHJlZmFiIGlzIGRyYWdnZWQgaW4gKG9uQWRkTm9kZSwgZXRjLiksIG5vdCBjYWxsZWQgb24gaXRzIG93bi4gRG8gbm90IHdpcmVcbiAgICAvLyB0aGlzIHVwIGFnYWluIHdpdGhvdXQgcmVwcm9kdWNpbmcgd2hhdCB0aGUgRWRpdG9yIFVJJ3MgZHJhZy1hbmQtZHJvcCBwYXRoIGFjdHVhbGx5XG4gICAgLy8gZG9lcyBlbmQtdG8tZW5kLlxufTtcblxuLyoqIFJlY3Vyc2l2ZWx5IGZpbmQgYSBub2RlIGJ5IFVVSUQgYW55d2hlcmUgdW5kZXIgcm9vdCAoZ2V0Q2hpbGRCeVV1aWQgaXMgbm90IHJlY3Vyc2l2ZSkuICovXG5mdW5jdGlvbiBmaW5kTm9kZURlZXAocm9vdDogYW55LCB1dWlkOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICghcm9vdCB8fCAhdXVpZCkgeyByZXR1cm4gbnVsbDsgfVxuICAgIGlmIChyb290LnV1aWQgPT09IHV1aWQpIHsgcmV0dXJuIHJvb3Q7IH1cbiAgICBjb25zdCBjaGlsZHJlbiA9IHJvb3QuY2hpbGRyZW4gfHwgW107XG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikge1xuICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmROb2RlRGVlcChjaGlsZCwgdXVpZCk7XG4gICAgICAgIGlmIChmb3VuZCkgeyByZXR1cm4gZm91bmQ7IH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8qKiBXYWl0IE4gcmVuZGVyZWQgZnJhbWVzIGluIHRoZSBzY2VuZSBwcm9jZXNzIGJlZm9yZSByZWFkaW5nIGJhY2sgcGl4ZWxzLiAqL1xuZnVuY3Rpb24gd2FpdEZyYW1lcyhuOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBnOiBhbnkgPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICBjb25zdCByYWY6IChjYjogKCkgPT4gdm9pZCkgPT4gYW55ID0gdHlwZW9mIGcucmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gZy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuYmluZChnKVxuICAgICAgICA6IChjYjogKCkgPT4gdm9pZCkgPT4gc2V0VGltZW91dChjYiwgMTYpO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4ge1xuICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgIGlmIChjb3VudCA+PSBuKSB7IHJlc29sdmUoKTsgfSBlbHNlIHsgcmFmKHRpY2spOyB9XG4gICAgICAgIH07XG4gICAgICAgIHJhZih0aWNrKTtcbiAgICB9KTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIGNhbnZhcyBmcm9tIHJhdyBSR0JBIGJ5dGVzIChPcGVuR0wgYm90dG9tLWxlZnQgb3JpZ2luKSwgZmxpcHBpbmdcbiAqIHZlcnRpY2FsbHkgc28gdGhlIGltYWdlIGlzIHVwcmlnaHQuIFVzZXMgdGhlIHNjZW5lIHByb2Nlc3MgRE9NIGNhbnZhcywgd2hpY2hcbiAqIHRoZSBXZWJHTCBlbmdpbmUgcmVuZGVyZXIgYWx3YXlzIHByb3ZpZGVzLlxuICovXG5mdW5jdGlvbiBidWlsZEZsaXBwZWRDYW52YXMocmF3OiBVaW50OEFycmF5LCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcik6IGFueSB7XG4gICAgY29uc3QgZzogYW55ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gICAgY29uc3QgZG9jOiBhbnkgPSBnLmRvY3VtZW50O1xuICAgIGlmICghZG9jIHx8IHR5cGVvZiBkb2MuY3JlYXRlRWxlbWVudCAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2RvY3VtZW50L2NhbnZhcyBub3QgYXZhaWxhYmxlIGluIHNjZW5lIGNvbnRleHQgZm9yIFBORyBlbmNvZGluZycpO1xuICAgIH1cbiAgICBjb25zdCBjYW52YXM6IGFueSA9IGRvYy5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aDtcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgIGNvbnN0IGN0eDogYW55ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29uc3QgaW1nOiBhbnkgPSBjdHguY3JlYXRlSW1hZ2VEYXRhKHdpZHRoLCBoZWlnaHQpO1xuICAgIGNvbnN0IHJvd0J5dGVzID0gd2lkdGggKiA0O1xuICAgIGZvciAobGV0IHkgPSAwOyB5IDwgaGVpZ2h0OyB5KyspIHtcbiAgICAgICAgY29uc3Qgc3JjU3RhcnQgPSAoaGVpZ2h0IC0gMSAtIHkpICogcm93Qnl0ZXM7XG4gICAgICAgIGltZy5kYXRhLnNldChyYXcuc3ViYXJyYXkoc3JjU3RhcnQsIHNyY1N0YXJ0ICsgcm93Qnl0ZXMpLCB5ICogcm93Qnl0ZXMpO1xuICAgIH1cbiAgICBjdHgucHV0SW1hZ2VEYXRhKGltZywgMCwgMCk7XG4gICAgcmV0dXJuIGNhbnZhcztcbn1cblxuLyoqIEVuY29kZSBhIGNhbnZhcyB0byBiYXNlNjQgUE5HIChubyBkYXRhIFVSTCBwcmVmaXgpLiAqL1xuZnVuY3Rpb24gY2FudmFzVG9QbmdCYXNlNjQoY2FudmFzOiBhbnkpOiBzdHJpbmcge1xuICAgIGNvbnN0IGRhdGFVcmw6IHN0cmluZyA9IGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xuICAgIHJldHVybiBkYXRhVXJsLnN1YnN0cmluZyhkYXRhVXJsLmluZGV4T2YoJywnKSArIDEpO1xufVxuXG4vKiogRG93bnNjYWxlIChuZXZlciB1cHNjYWxlKSBhIGNhbnZhcyB0byBmaXQgd2l0aGluIG1heFdpZHRoIHggbWF4SGVpZ2h0LCBwcmVzZXJ2aW5nIGFzcGVjdCByYXRpbywgYW5kIGVuY29kZSBhcyBiYXNlNjQgUE5HLiAqL1xuZnVuY3Rpb24gcmVzaXplQ2FudmFzVG9QbmdCYXNlNjQoY2FudmFzOiBhbnksIG1heFdpZHRoOiBudW1iZXIsIG1heEhlaWdodDogbnVtYmVyKTogeyBiYXNlNjQ6IHN0cmluZzsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB7XG4gICAgY29uc3QgZzogYW55ID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG4gICAgY29uc3QgZG9jOiBhbnkgPSBnLmRvY3VtZW50O1xuICAgIGNvbnN0IHNjYWxlID0gTWF0aC5taW4oMSwgbWF4V2lkdGggLyBjYW52YXMud2lkdGgsIG1heEhlaWdodCAvIGNhbnZhcy5oZWlnaHQpO1xuICAgIGNvbnN0IG91dFdpZHRoID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChjYW52YXMud2lkdGggKiBzY2FsZSkpO1xuICAgIGNvbnN0IG91dEhlaWdodCA9IE1hdGgubWF4KDEsIE1hdGgucm91bmQoY2FudmFzLmhlaWdodCAqIHNjYWxlKSk7XG4gICAgaWYgKHNjYWxlID49IDEpIHtcbiAgICAgICAgcmV0dXJuIHsgYmFzZTY0OiBjYW52YXNUb1BuZ0Jhc2U2NChjYW52YXMpLCB3aWR0aDogY2FudmFzLndpZHRoLCBoZWlnaHQ6IGNhbnZhcy5oZWlnaHQgfTtcbiAgICB9XG4gICAgY29uc3Qgb3V0Q2FudmFzOiBhbnkgPSBkb2MuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgb3V0Q2FudmFzLndpZHRoID0gb3V0V2lkdGg7XG4gICAgb3V0Q2FudmFzLmhlaWdodCA9IG91dEhlaWdodDtcbiAgICBjb25zdCBjdHg6IGFueSA9IG91dENhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGN0eC5kcmF3SW1hZ2UoY2FudmFzLCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQsIDAsIDAsIG91dFdpZHRoLCBvdXRIZWlnaHQpO1xuICAgIHJldHVybiB7IGJhc2U2NDogY2FudmFzVG9QbmdCYXNlNjQob3V0Q2FudmFzKSwgd2lkdGg6IG91dFdpZHRoLCBoZWlnaHQ6IG91dEhlaWdodCB9O1xufSJdfQ==