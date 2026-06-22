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
     * Returns { success, data: { pngBase64, width, height, mode, cameraNodeUuid, cameraNodeName, mapping } }.
     */
    async captureSceneView(opts) {
        let cleanup = null;
        try {
            const cc = require('cc');
            const { director, Camera, RenderTexture, Node, Vec3, Quat, Color, CCObject, UITransform } = cc;
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
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
                    return { success: false, error: `Node with UUID ${opts.nodeUuid} not found` };
                }
                const ut = node.getComponent(UITransform);
                if (!ut) {
                    return { success: false, error: 'capture_node requires the node to have a UITransform (2D node)' };
                }
                const rect = ut.getBoundingBoxToWorld(); // world-space Rect {x, y, width, height}
                if (!rect || rect.width <= 0 || rect.height <= 0) {
                    return { success: false, error: 'Node has zero-size world bounding box' };
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
                        return { success: false, error: `Camera node with UUID ${opts.cameraUuid} not found` };
                    }
                    src = cn.getComponent(Camera);
                    if (!src) {
                        return { success: false, error: `Node ${opts.cameraUuid} has no Camera component` };
                    }
                }
                else {
                    src = pickMain();
                    if (!src) {
                        return { success: false, error: 'No Camera component found in the current scene' };
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
                return { success: false, error: 'readPixels returned no/insufficient data' };
            }
            const pngBase64 = encodePngFlipped(raw, width, height);
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
                data: { pngBase64, width, height, mode, cameraNodeUuid: srcUuid, cameraNodeName: srcName, mapping }
            };
        }
        catch (error) {
            if (cleanup) {
                cleanup();
            }
            return { success: false, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) };
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
 * Encode raw RGBA bytes (OpenGL bottom-left origin) into a base64 PNG, flipping
 * vertically so the image is upright. Uses the scene process DOM canvas, which
 * the WebGL engine renderer always provides.
 */
function encodePngFlipped(raw, width, height) {
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
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFNUMsUUFBQSxPQUFPLEdBQTRDO0lBQzVEOztPQUVHO0lBQ0gsY0FBYztRQUNWLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsS0FBSyxDQUFDLElBQUksR0FBRyxXQUFXLENBQUM7WUFDekIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQztRQUN4RSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFF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QUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3ZELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5tb2R1bGUucGF0aHMucHVzaChqb2luKEVkaXRvci5BcHAucGF0aCwgJ25vZGVfbW9kdWxlcycpKTtcblxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgc2NlbmVcbiAgICAgKi9cbiAgICBjcmVhdGVOZXdTY2VuZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IsIFNjZW5lIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBuZXcgU2NlbmUoKTtcbiAgICAgICAgICAgIHNjZW5lLm5hbWUgPSAnTmV3IFNjZW5lJztcbiAgICAgICAgICAgIGRpcmVjdG9yLnJ1blNjZW5lKHNjZW5lKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdOZXcgc2NlbmUgY3JlYXRlZCBzdWNjZXNzZnVsbHknIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBjb21wb25lbnQgdG8gYSBub2RlXG4gICAgICovXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIG5vZGUgYnkgVVVJRFxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gR2V0IGNvbXBvbmVudCBjbGFzc1xuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudFxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xuICAgICAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IGFkZGVkIHN1Y2Nlc3NmdWxseWAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjb21wb25lbnRJZDogY29tcG9uZW50LnV1aWQgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGNvbXBvbmVudCBmcm9tIGEgbm9kZVxuICAgICAqL1xuICAgIHJlbW92ZUNvbXBvbmVudEZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMgfSA9IHJlcXVpcmUoJ2NjJyk7XG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IGRpcmVjdG9yLmdldFNjZW5lKCk7XG4gICAgICAgICAgICBpZiAoIXNjZW5lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gYWN0aXZlIHNjZW5lJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCB0eXBlICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnQgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IHJlbW92ZWQgc3VjY2Vzc2Z1bGx5YCB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgbm9kZVxuICAgICAqL1xuICAgIGNyZWF0ZU5vZGUobmFtZTogc3RyaW5nLCBwYXJlbnRVdWlkPzogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBOb2RlIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IG5ldyBOb2RlKG5hbWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocGFyZW50VXVpZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudCA9IHNjZW5lLmdldENoaWxkQnlVdWlkKHBhcmVudFV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNjZW5lLmFkZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlICR7bmFtZX0gY3JlYXRlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogbm9kZS51dWlkLCBuYW1lOiBub2RlLm5hbWUgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG5vZGUgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBnZXROb2RlSW5mbyhub2RlVXVpZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBub2RlLnBvc2l0aW9uLFxuICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogbm9kZS5yb3RhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgc2NhbGU6IG5vZGUuc2NhbGUsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQ/LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gY2hpbGQudXVpZCksXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IG5vZGUuY29tcG9uZW50cy5tYXAoKGNvbXA6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGNvbXAuY29uc3RydWN0b3IubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZFxuICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgYWxsIG5vZGVzIGluIHNjZW5lXG4gICAgICovXG4gICAgZ2V0QWxsTm9kZXMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XG4gICAgICAgICAgICBjb25zdCBjb2xsZWN0Tm9kZXMgPSAobm9kZTogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZDogYW55KSA9PiBjb2xsZWN0Tm9kZXMoY2hpbGQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjZW5lLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkOiBhbnkpID0+IGNvbGxlY3ROb2RlcyhjaGlsZCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlcyB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIG5vZGUgYnkgbmFtZVxuICAgICAqL1xuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5TmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBuYW1lICR7bmFtZX0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IG5vZGUucG9zaXRpb25cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBzY2VuZSBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc2NlbmUubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogc2NlbmUudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiBzY2VuZS5jaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgbm9kZSBwcm9wZXJ0eVxuICAgICAqL1xuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHNjZW5lLmdldENoaWxkQnlVdWlkKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIGlmICghbm9kZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgd2l0aCBVVUlEICR7bm9kZVV1aWR9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2V0IHByb3BlcnR5XG4gICAgICAgICAgICBpZiAocHJvcGVydHkgPT09ICdwb3NpdGlvbicpIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldFBvc2l0aW9uKHZhbHVlLnggfHwgMCwgdmFsdWUueSB8fCAwLCB2YWx1ZS56IHx8IDApO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wZXJ0eSA9PT0gJ3JvdGF0aW9uJykge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIodmFsdWUueCB8fCAwLCB2YWx1ZS55IHx8IDAsIHZhbHVlLnogfHwgMCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BlcnR5ID09PSAnc2NhbGUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRTY2FsZSh2YWx1ZS54IHx8IDEsIHZhbHVlLnkgfHwgMSwgdmFsdWUueiB8fCAxKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdhY3RpdmUnKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICduYW1lJykge1xuICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUcnkgc2V0dGluZyBwcm9wZXJ0eSBkaXJlY3RseVxuICAgICAgICAgICAgICAgIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcm9wZXJ0eSAnJHtwcm9wZXJ0eX0nIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzY2VuZSBoaWVyYXJjaHlcbiAgICAgKi9cbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSBkaXJlY3Rvci5nZXRTY2VuZSgpO1xuICAgICAgICAgICAgaWYgKCFzY2VuZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGFjdGl2ZSBzY2VuZScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc05vZGUgPSAobm9kZTogYW55KTogYW55ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXG4gICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbXVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZUNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjb21wOiBhbnkpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjb21wLmNvbnN0cnVjdG9yLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWRcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT4gcHJvY2Vzc05vZGUoY2hpbGQpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gc2NlbmUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PiBwcm9jZXNzTm9kZShjaGlsZCkpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaGllcmFyY2h5IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHByZWZhYiBmcm9tIGEgbm9kZSBieSBkZWxlZ2F0aW5nIHRvIHRoZSBlbmdpbmUncyBvZmZpY2lhbFxuICAgICAqIFByZWZhYk1hbmFnZXIgKGNjZS5QcmVmYWIuY3JlYXRlUHJlZmFiQXNzZXRGcm9tTm9kZSkuIFJlcGxpY2F0ZXMgdGhlXG4gICAgICogZWRpdG9yJ3MgXCJkcmFnIG5vZGUgdG8gQXNzZXRzXCIgZmxvdyDigJQgaGFuZGxlcyBzY3JpcHQgX190eXBlX18gY29tcHJlc3Npb24sXG4gICAgICogQHByb3BlcnR5IHJlZiBzZXJpYWxpemF0aW9uLCBhbmQgc291cmNlLW5vZGUgcmVsaW5raW5nLlxuICAgICAqL1xuICAgIC8qKlxuICAgICAqIFJldmVydCBhIHByZWZhYiBpbnN0YW5jZSB0byBtYXRjaCBpdHMgc291cmNlIGFzc2V0IGJ5IGRlbGVnYXRpbmcgdG9cbiAgICAgKiBjY2UuUHJlZmFiLnJldmVydFByZWZhYi4gTm8gcHVibGljIHNjZW5lIG1lc3NhZ2UgZXhpc3RzIGZvciB0aGlzLlxuICAgICAqL1xuICAgIGFzeW5jIHJldmVydFByZWZhYkluc3RhbmNlKG5vZGVVdWlkOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1nciA9IChnbG9iYWxUaGlzIGFzIGFueSkuY2NlPy5QcmVmYWI7XG4gICAgICAgICAgICBpZiAoIW1nciB8fCB0eXBlb2YgbWdyLnJldmVydFByZWZhYiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ2NjZS5QcmVmYWIucmV2ZXJ0UHJlZmFiIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBDb2NvcyBDcmVhdG9yIHZlcnNpb24nXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFwcGxpZWQgPSBhd2FpdCBtZ3IucmV2ZXJ0UHJlZmFiKG5vZGVVdWlkKTtcbiAgICAgICAgICAgIC8vIEVuZ2luZSByZXR1cm5zIGZhbHNlIHdoZW4gdGhlIG5vZGUgaGFzIG5vIG92ZXJyaWRlcyB0byByZXZlcnQg4oCUXG4gICAgICAgICAgICAvLyBub3QgYW4gZXJyb3IsIGp1c3QgYSBuby1vcC4gU3VyZmFjZSBpdCBzbyBjYWxsZXJzIGNhbiBkaXN0aW5ndWlzaC5cbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGFwcGxpZWQ6IGFwcGxpZWQgIT09IGZhbHNlIH0gfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXN5bmMgY3JlYXRlUHJlZmFiRnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1nciA9IChnbG9iYWxUaGlzIGFzIGFueSkuY2NlPy5QcmVmYWI7XG4gICAgICAgICAgICBpZiAoIW1nciB8fCB0eXBlb2YgbWdyLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdjY2UuUHJlZmFiLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUgbm90IGF2YWlsYWJsZSBpbiB0aGlzIENvY29zIENyZWF0b3IgdmVyc2lvbidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJVdWlkID0gYXdhaXQgbWdyLmNyZWF0ZVByZWZhYkFzc2V0RnJvbU5vZGUobm9kZVV1aWQsIHVybCk7XG4gICAgICAgICAgICBpZiAoIXByZWZhYlV1aWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdjcmVhdGVQcmVmYWJBc3NldEZyb21Ob2RlIHJldHVybmVkIG51bGwvdW5kZWZpbmVkJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgcHJlZmFiVXVpZCwgdXJsLCBzb3VyY2VOb2RlVXVpZDogbm9kZVV1aWQgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udHJvbCBhbmltYXRpb24gb24gYSBub2RlIChwbGF5L3N0b3AvcGF1c2UvcmVzdW1lKVxuICAgICAqL1xuICAgIGNvbnRyb2xBbmltYXRpb24obm9kZVV1aWQ6IHN0cmluZywgY29tbWFuZDogc3RyaW5nLCBjbGlwTmFtZT86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwganMsIEFuaW1hdGlvbiB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBzY2VuZS5nZXRDaGlsZEJ5VXVpZChub2RlVXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIHdpdGggVVVJRCAke25vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFuaW0gPSBub2RlLmdldENvbXBvbmVudChBbmltYXRpb24pO1xuICAgICAgICAgICAgaWYgKCFhbmltKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgICAgICAgICAgICBjYXNlICdwbGF5JzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNsaXBOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmltLnBsYXkoY2xpcE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbS5wbGF5KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEFuaW1hdGlvbiBwbGF5OiAke2NsaXBOYW1lIHx8ICdkZWZhdWx0J31gIH07XG4gICAgICAgICAgICAgICAgY2FzZSAnc3RvcCc6XG4gICAgICAgICAgICAgICAgICAgIGFuaW0uc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQW5pbWF0aW9uIHN0b3BwZWQnIH07XG4gICAgICAgICAgICAgICAgY2FzZSAncGF1c2UnOlxuICAgICAgICAgICAgICAgICAgICBhbmltLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdBbmltYXRpb24gcGF1c2VkJyB9O1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Jlc3VtZSc6XG4gICAgICAgICAgICAgICAgICAgIGFuaW0ucmVzdW1lKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdBbmltYXRpb24gcmVzdW1lZCcgfTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFuaW1hdGlvbiBjb21tYW5kOiAke2NvbW1hbmR9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgY29tcG9uZW50IHByb3BlcnR5XG4gICAgICovXG4gICAgc2V0Q29tcG9uZW50UHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGRpcmVjdG9yLCBqcyB9ID0gcmVxdWlyZSgnY2MnKTtcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBub2RlID0gc2NlbmUuZ2V0Q2hpbGRCeVV1aWQobm9kZVV1aWQpO1xuICAgICAgICAgICAgaWYgKCFub2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtub2RlVXVpZH0gbm90IGZvdW5kYCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBqcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgdHlwZSAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZGAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBjb21tb24gcHJvcGVydGllc1xuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAnc3ByaXRlRnJhbWUnICYmIGNvbXBvbmVudFR5cGUgPT09ICdjYy5TcHJpdGUnKSB7XG4gICAgICAgICAgICAgICAgLy8gU3VwcG9ydCB2YWx1ZSBhcyB1dWlkIG9yIGFzc2V0IHBhdGhcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgdG8gZmluZCBieSB1dWlkIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TWFuYWdlciA9IHJlcXVpcmUoJ2NjJykuYXNzZXRNYW5hZ2VyO1xuICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIucmVzb3VyY2VzLmxvYWQodmFsdWUsIHJlcXVpcmUoJ2NjJykuU3ByaXRlRnJhbWUsIChlcnI6IGFueSwgc3ByaXRlRnJhbWU6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgc3ByaXRlRnJhbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc3ByaXRlRnJhbWUgPSBzcHJpdGVGcmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGxvYWRpbmcgYnkgdXVpZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5sb2FkQW55KHsgdXVpZDogdmFsdWUgfSwgKGVycjI6IGFueSwgYXNzZXQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVycjIgJiYgYXNzZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IGFzc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRGlyZWN0IGFzc2lnbm1lbnQgKGNvbXBhdGlibGUgd2l0aCBwYXNzZWQgYXNzZXQgb2JqZWN0cylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zcHJpdGVGcmFtZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdtYXRlcmlhbCcgJiYgKGNvbXBvbmVudFR5cGUgPT09ICdjYy5TcHJpdGUnIHx8IGNvbXBvbmVudFR5cGUgPT09ICdjYy5NZXNoUmVuZGVyZXInKSkge1xuICAgICAgICAgICAgICAgIC8vIFN1cHBvcnQgdmFsdWUgYXMgdXVpZCBvciBhc3NldCBwYXRoXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRNYW5hZ2VyID0gcmVxdWlyZSgnY2MnKS5hc3NldE1hbmFnZXI7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0TWFuYWdlci5yZXNvdXJjZXMubG9hZCh2YWx1ZSwgcmVxdWlyZSgnY2MnKS5NYXRlcmlhbCwgKGVycjogYW55LCBtYXRlcmlhbDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVyciAmJiBtYXRlcmlhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5tYXRlcmlhbCA9IG1hdGVyaWFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldE1hbmFnZXIubG9hZEFueSh7IHV1aWQ6IHZhbHVlIH0sIChlcnIyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIyICYmIGFzc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQubWF0ZXJpYWwgPSBhc3NldDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5tYXRlcmlhbCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5tYXRlcmlhbCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdzdHJpbmcnICYmIChjb21wb25lbnRUeXBlID09PSAnY2MuTGFiZWwnIHx8IGNvbXBvbmVudFR5cGUgPT09ICdjYy5SaWNoVGV4dCcpKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0cmluZyA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb21wb25lbnRbcHJvcGVydHldID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPcHRpb25hbDogcmVmcmVzaCBJbnNwZWN0b3JcbiAgICAgICAgICAgIC8vIEVkaXRvci5NZXNzYWdlLnNlbmQoJ3NjZW5lJywgJ3NuYXBzaG90Jyk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQ29tcG9uZW50IHByb3BlcnR5ICcke3Byb3BlcnR5fScgdXBkYXRlZCBzdWNjZXNzZnVsbHlgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciB0aGUgY3VycmVudGx5LW9wZW4gc2NlbmUvcHJlZmFiIHRvIGEgUE5HIChyZXR1cm5lZCBhcyBiYXNlNjQpIHVzaW5nIGFuXG4gICAgICogb2Zmc2NyZWVuIGNsb25lIENhbWVyYSArIFJlbmRlclRleHR1cmUuIFRoaXMgcHJvZHVjZXMgYSBDTEVBTiBpbWFnZSAobm8gZWRpdG9yXG4gICAgICogZ2l6bW9zL2dyaWQpIGFuZCBuZXZlciBtdXRhdGVzIHRoZSBleGlzdGluZyBjYW1lcmFzIOKAlCBhIHRlbXBvcmFyeSwgaGlkZGVuLFxuICAgICAqIG5vbi1wZXJzaXN0ZWQgY2FtZXJhIG5vZGUgaXMgY3JlYXRlZCwgdXNlZCBmb3IgMS0yIGZyYW1lcywgdGhlbiBkZXN0cm95ZWQuXG4gICAgICpcbiAgICAgKiBvcHRzOiB7XG4gICAgICogICBtb2RlOiAnc2NlbmUnIHwgJ2NhbWVyYScgfCAnbm9kZScsXG4gICAgICogICBjYW1lcmFVdWlkPzogc3RyaW5nLCAgIC8vIGZvciBtb2RlICdjYW1lcmEnXG4gICAgICogICBub2RlVXVpZD86IHN0cmluZywgICAgIC8vIGZvciBtb2RlICdub2RlJ1xuICAgICAqICAgd2lkdGg/OiBudW1iZXIsICAgICAgICAvLyAxLi4yMDQ4LCBkZWZhdWx0IDE5MjBcbiAgICAgKiAgIGhlaWdodD86IG51bWJlciwgICAgICAgLy8gMS4uMjA0OCwgZGVmYXVsdCAxMDgwXG4gICAgICogICBiYWNrZ3JvdW5kQ29sb3I/OiB7IHIsIGcsIGIsIGEgfSAgLy8gMC4uMjU1LCBkZWZhdWx0IG9wYXF1ZSBibGFja1xuICAgICAqIH1cbiAgICAgKiBSZXR1cm5zIHsgc3VjY2VzcywgZGF0YTogeyBwbmdCYXNlNjQsIHdpZHRoLCBoZWlnaHQsIG1vZGUsIGNhbWVyYU5vZGVVdWlkLCBjYW1lcmFOb2RlTmFtZSwgbWFwcGluZyB9IH0uXG4gICAgICovXG4gICAgYXN5bmMgY2FwdHVyZVNjZW5lVmlldyhvcHRzOiBhbnkpIHtcbiAgICAgICAgbGV0IGNsZWFudXA6ICgoKSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciwgQ2FtZXJhLCBSZW5kZXJUZXh0dXJlLCBOb2RlLCBWZWMzLCBRdWF0LCBDb2xvciwgQ0NPYmplY3QsIFVJVHJhbnNmb3JtIH0gPSBjYztcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gZGlyZWN0b3IuZ2V0U2NlbmUoKTtcbiAgICAgICAgICAgIGlmICghc2NlbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBhY3RpdmUgc2NlbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG9wdHMgPSBvcHRzIHx8IHt9O1xuICAgICAgICAgICAgY29uc3QgbW9kZSA9IG9wdHMubW9kZSB8fCAnc2NlbmUnO1xuICAgICAgICAgICAgY29uc3Qgd2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLm1pbigyMDQ4LCBNYXRoLmZsb29yKG9wdHMud2lkdGggfHwgMTkyMCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGhlaWdodCA9IE1hdGgubWF4KDEsIE1hdGgubWluKDIwNDgsIE1hdGguZmxvb3Iob3B0cy5oZWlnaHQgfHwgMTA4MCkpKTtcbiAgICAgICAgICAgIGNvbnN0IGJnID0gb3B0cy5iYWNrZ3JvdW5kQ29sb3IgfHwgeyByOiAwLCBnOiAwLCBiOiAwLCBhOiAyNTUgfTtcblxuICAgICAgICAgICAgLy8gQ29sbGVjdCBhbGwgQ2FtZXJhIGNvbXBvbmVudHMgaW4gdGhlIHNjZW5lLlxuICAgICAgICAgICAgY29uc3QgY2FtZXJhczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbGxlY3QgPSAobjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFuKSB7IHJldHVybjsgfVxuICAgICAgICAgICAgICAgIGlmIChuLmdldENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjID0gbi5nZXRDb21wb25lbnQoQ2FtZXJhKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGMpIHsgY2FtZXJhcy5wdXNoKGMpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIChuLmNoaWxkcmVuIHx8IFtdKS5mb3JFYWNoKGNvbGxlY3QpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHNjZW5lLmNoaWxkcmVuLmZvckVhY2goY29sbGVjdCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBpY2tNYWluID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHVzYWJsZSA9IGNhbWVyYXMuZmlsdGVyKChjOiBhbnkpID0+IGMuZW5hYmxlZEluSGllcmFyY2h5ICE9PSBmYWxzZSAmJiAhYy50YXJnZXRUZXh0dXJlKTtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gdXNhYmxlLmxlbmd0aCA/IHVzYWJsZSA6IGNhbWVyYXM7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3J0aG8gPSBsaXN0LmZpbmQoKGM6IGFueSkgPT4gYy5wcm9qZWN0aW9uID09PSBDYW1lcmEuUHJvamVjdGlvblR5cGUuT1JUSE8pO1xuICAgICAgICAgICAgICAgIHJldHVybiBvcnRobyB8fCBsaXN0WzBdIHx8IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBwYXJhbWV0ZXJzIG9mIHRoZSBjYW1lcmEgd2Ugd2lsbCByZW5kZXIgd2l0aC5cbiAgICAgICAgICAgIGxldCB3b3JsZFBvczogYW55O1xuICAgICAgICAgICAgbGV0IHdvcmxkUm90OiBhbnk7XG4gICAgICAgICAgICBsZXQgcHJvamVjdGlvbjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IG9ydGhvSGVpZ2h0OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgZm92OiBudW1iZXI7XG4gICAgICAgICAgICBsZXQgbmVhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IGZhcjogbnVtYmVyO1xuICAgICAgICAgICAgbGV0IHZpc2liaWxpdHk6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgICAgICAgICAgbGV0IHNyY1V1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIGxldCBzcmNOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICAgIGlmIChtb2RlID09PSAnbm9kZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gZmluZE5vZGVEZWVwKHNjZW5lLCBvcHRzLm5vZGVVdWlkKTtcbiAgICAgICAgICAgICAgICBpZiAoIW5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSB3aXRoIFVVSUQgJHtvcHRzLm5vZGVVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHV0ID0gbm9kZS5nZXRDb21wb25lbnQoVUlUcmFuc2Zvcm0pO1xuICAgICAgICAgICAgICAgIGlmICghdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnY2FwdHVyZV9ub2RlIHJlcXVpcmVzIHRoZSBub2RlIHRvIGhhdmUgYSBVSVRyYW5zZm9ybSAoMkQgbm9kZSknIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY3QgPSB1dC5nZXRCb3VuZGluZ0JveFRvV29ybGQoKTsgLy8gd29ybGQtc3BhY2UgUmVjdCB7eCwgeSwgd2lkdGgsIGhlaWdodH1cbiAgICAgICAgICAgICAgICBpZiAoIXJlY3QgfHwgcmVjdC53aWR0aCA8PSAwIHx8IHJlY3QuaGVpZ2h0IDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm9kZSBoYXMgemVyby1zaXplIHdvcmxkIGJvdW5kaW5nIGJveCcgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3QgcmVmID0gcGlja01haW4oKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdBc3BlY3QgPSB3aWR0aCAvIGhlaWdodDtcbiAgICAgICAgICAgICAgICBjb25zdCByZWN0QXNwZWN0ID0gcmVjdC53aWR0aCAvIHJlY3QuaGVpZ2h0O1xuICAgICAgICAgICAgICAgIC8vIEZpdC1jb250YWluIHRoZSBub2RlJ3MgYmJveCBpbnNpZGUgdGhlIG91dHB1dCBhc3BlY3QuXG4gICAgICAgICAgICAgICAgb3J0aG9IZWlnaHQgPSByZWN0QXNwZWN0ID4gaW1nQXNwZWN0ID8gKHJlY3Qud2lkdGggLyBpbWdBc3BlY3QpIC8gMiA6IHJlY3QuaGVpZ2h0IC8gMjtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW1aID0gcmVmID8gcmVmLm5vZGUud29ybGRQb3NpdGlvbi56IDogMTAwMDtcbiAgICAgICAgICAgICAgICB3b3JsZFBvcyA9IG5ldyBWZWMzKHJlY3QueCArIHJlY3Qud2lkdGggLyAyLCByZWN0LnkgKyByZWN0LmhlaWdodCAvIDIsIGNhbVopO1xuICAgICAgICAgICAgICAgIHdvcmxkUm90ID0gbmV3IFF1YXQoKTtcbiAgICAgICAgICAgICAgICBwcm9qZWN0aW9uID0gQ2FtZXJhLlByb2plY3Rpb25UeXBlLk9SVEhPO1xuICAgICAgICAgICAgICAgIGZvdiA9IDQ1O1xuICAgICAgICAgICAgICAgIG5lYXIgPSByZWYgPyByZWYubmVhciA6IDE7XG4gICAgICAgICAgICAgICAgZmFyID0gcmVmID8gcmVmLmZhciA6IDIwMDA7XG4gICAgICAgICAgICAgICAgdmlzaWJpbGl0eSA9IHJlZiA/IHJlZi52aXNpYmlsaXR5IDogbnVsbDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGV0IHNyYzogYW55O1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY2FtZXJhJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbiA9IGZpbmROb2RlRGVlcChzY2VuZSwgb3B0cy5jYW1lcmFVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ2FtZXJhIG5vZGUgd2l0aCBVVUlEICR7b3B0cy5jYW1lcmFVdWlkfSBub3QgZm91bmRgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3JjID0gY24uZ2V0Q29tcG9uZW50KENhbWVyYSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlICR7b3B0cy5jYW1lcmFVdWlkfSBoYXMgbm8gQ2FtZXJhIGNvbXBvbmVudGAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNyYyA9IHBpY2tNYWluKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3JjKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBDYW1lcmEgY29tcG9uZW50IGZvdW5kIGluIHRoZSBjdXJyZW50IHNjZW5lJyB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHdvcmxkUG9zID0gc3JjLm5vZGUuZ2V0V29ybGRQb3NpdGlvbigpO1xuICAgICAgICAgICAgICAgIHdvcmxkUm90ID0gc3JjLm5vZGUuZ2V0V29ybGRSb3RhdGlvbigpO1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb24gPSBzcmMucHJvamVjdGlvbjtcbiAgICAgICAgICAgICAgICBvcnRob0hlaWdodCA9IHNyYy5vcnRob0hlaWdodDtcbiAgICAgICAgICAgICAgICBmb3YgPSBzcmMuZm92O1xuICAgICAgICAgICAgICAgIG5lYXIgPSBzcmMubmVhcjtcbiAgICAgICAgICAgICAgICBmYXIgPSBzcmMuZmFyO1xuICAgICAgICAgICAgICAgIHZpc2liaWxpdHkgPSBzcmMudmlzaWJpbGl0eTtcbiAgICAgICAgICAgICAgICBzcmNVdWlkID0gc3JjLm5vZGUudXVpZDtcbiAgICAgICAgICAgICAgICBzcmNOYW1lID0gc3JjLm5vZGUubmFtZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT2Zmc2NyZWVuIHJlbmRlciB0YXJnZXQuXG4gICAgICAgICAgICBjb25zdCBydCA9IG5ldyBSZW5kZXJUZXh0dXJlKCk7XG4gICAgICAgICAgICBydC5yZXNldCh7IHdpZHRoLCBoZWlnaHQgfSk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyeSBjbG9uZSBjYW1lcmEg4oCUIGhpZGRlbiwgbm90IHNhdmVkLCBhdXRvLXJlbW92ZWQgYWZ0ZXIgY2FwdHVyZS5cbiAgICAgICAgICAgIGNvbnN0IGNhbU5vZGUgPSBuZXcgTm9kZSgnX19tY3BfY2FwdHVyZV9jYW1fXycpO1xuICAgICAgICAgICAgY2FtTm9kZS5oaWRlRmxhZ3MgPSBDQ09iamVjdC5GbGFncy5Eb250U2F2ZSB8IENDT2JqZWN0LkZsYWdzLkhpZGVJbkhpZXJhcmNoeSB8IENDT2JqZWN0LkZsYWdzLkRvbnREZXN0cm95O1xuICAgICAgICAgICAgc2NlbmUuYWRkQ2hpbGQoY2FtTm9kZSk7XG4gICAgICAgICAgICBjYW1Ob2RlLnNldFdvcmxkUG9zaXRpb24od29ybGRQb3MpO1xuICAgICAgICAgICAgY2FtTm9kZS5zZXRXb3JsZFJvdGF0aW9uKHdvcmxkUm90KTtcbiAgICAgICAgICAgIGNvbnN0IGNhbSA9IGNhbU5vZGUuYWRkQ29tcG9uZW50KENhbWVyYSk7XG4gICAgICAgICAgICBjYW0ucHJvamVjdGlvbiA9IHByb2plY3Rpb247XG4gICAgICAgICAgICBjYW0ub3J0aG9IZWlnaHQgPSBvcnRob0hlaWdodDtcbiAgICAgICAgICAgIGNhbS5mb3YgPSBmb3Y7XG4gICAgICAgICAgICBjYW0ubmVhciA9IG5lYXI7XG4gICAgICAgICAgICBjYW0uZmFyID0gZmFyO1xuICAgICAgICAgICAgaWYgKHZpc2liaWxpdHkgIT09IG51bGwgJiYgdmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY2FtLnZpc2liaWxpdHkgPSB2aXNpYmlsaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FtLmNsZWFyRmxhZ3MgPSBDYW1lcmEuQ2xlYXJGbGFnLlNPTElEX0NPTE9SO1xuICAgICAgICAgICAgY2FtLmNsZWFyQ29sb3IgPSBuZXcgQ29sb3IoYmcuciwgYmcuZywgYmcuYiwgYmcuYSA9PT0gdW5kZWZpbmVkID8gMjU1IDogYmcuYSk7XG4gICAgICAgICAgICBjYW0udGFyZ2V0VGV4dHVyZSA9IHJ0O1xuXG4gICAgICAgICAgICBjbGVhbnVwID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7IGNhbS50YXJnZXRUZXh0dXJlID0gbnVsbDsgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuICAgICAgICAgICAgICAgIHRyeSB7IGNhbU5vZGUuZGVzdHJveSgpOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICAgICAgdHJ5IHsgcnQuZGVzdHJveSgpOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBEcml2ZSB0aGUgcmVuZGVyIHBpcGVsaW5lIHNvIHRoZSBvZmZzY3JlZW4gY2FtZXJhIGFjdHVhbGx5IGRyYXdzIGludG9cbiAgICAgICAgICAgIC8vIHRoZSBSVC4gSW4gZWRpdG9yIGVkaXQtbW9kZSB0aGUgYXV0byBsb29wIGRvZXMgbm90IHJlbGlhYmx5IHJlbmRlciBhblxuICAgICAgICAgICAgLy8gb2Zmc2NyZWVuIGNhbWVyYSB3aXRoaW4gYSBjb3VwbGUgb2YgZnJhbWVzLCBzbyB3ZSBmb3JjZSBmcmFtZXMgdmlhXG4gICAgICAgICAgICAvLyBkaXJlY3Rvci5yb290LmZyYW1lTW92ZSBhbmQgYWxzbyB3YWl0IHJlYWwgZnJhbWVzIGFzIGEgZmFsbGJhY2suXG4gICAgICAgICAgICBjb25zdCByb290ID0gZGlyZWN0b3Iucm9vdDtcbiAgICAgICAgICAgIGNvbnN0IGNhbkZvcmNlUmVuZGVyID0gISEocm9vdCAmJiB0eXBlb2Ygcm9vdC5mcmFtZU1vdmUgPT09ICdmdW5jdGlvbicpO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoY2FtLmNhbWVyYSAmJiB0eXBlb2YgY2FtLmNhbWVyYS51cGRhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FtLmNhbWVyYS51cGRhdGUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZSkgeyAvKiBpZ25vcmUgKi8gfVxuXG4gICAgICAgICAgICBhd2FpdCB3YWl0RnJhbWVzKDEpO1xuICAgICAgICAgICAgaWYgKGNhbkZvcmNlUmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcm9vdC5mcmFtZU1vdmUoMCk7IHJvb3QuZnJhbWVNb3ZlKDApOyB9IGNhdGNoIChlKSB7IC8qIGlnbm9yZSAqLyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhd2FpdCB3YWl0RnJhbWVzKDEpO1xuICAgICAgICAgICAgaWYgKGNhbkZvcmNlUmVuZGVyKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgcm9vdC5mcmFtZU1vdmUoMCk7IH0gY2F0Y2ggKGUpIHsgLyogaWdub3JlICovIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcmF3ID0gcnQucmVhZFBpeGVscygpOyAvLyBSR0JBIGJ5dGVzLCBPcGVuR0wgb3JpZ2luIChib3R0b20tbGVmdClcbiAgICAgICAgICAgIGlmICghcmF3IHx8IHJhdy5sZW5ndGggPCB3aWR0aCAqIGhlaWdodCAqIDQpIHtcbiAgICAgICAgICAgICAgICBjbGVhbnVwKCk7XG4gICAgICAgICAgICAgICAgY2xlYW51cCA9IG51bGw7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAncmVhZFBpeGVscyByZXR1cm5lZCBuby9pbnN1ZmZpY2llbnQgZGF0YScgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcG5nQmFzZTY0ID0gZW5jb2RlUG5nRmxpcHBlZChyYXcsIHdpZHRoLCBoZWlnaHQpO1xuXG4gICAgICAgICAgICBjb25zdCB3YyA9IGNhbU5vZGUuZ2V0V29ybGRQb3NpdGlvbigpO1xuICAgICAgICAgICAgY29uc3Qgd29ybGRVbml0c1BlclBpeGVsID0gKDIgKiBvcnRob0hlaWdodCkgLyBoZWlnaHQ7XG4gICAgICAgICAgICBjb25zdCBtYXBwaW5nID0gcHJvamVjdGlvbiA9PT0gQ2FtZXJhLlByb2plY3Rpb25UeXBlLk9SVEhPID8ge1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb246ICdvcnRobycsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJYOiB3Yy54LFxuICAgICAgICAgICAgICAgIHdvcmxkQ2VudGVyWTogd2MueSxcbiAgICAgICAgICAgICAgICB3b3JsZFVuaXRzUGVyUGl4ZWwsXG4gICAgICAgICAgICAgICAgaW1hZ2VXaWR0aDogd2lkdGgsXG4gICAgICAgICAgICAgICAgaW1hZ2VIZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgICAgICBmb3JtdWxhOiAncHggPSBpbWdXLzIgKyAod29ybGRYIC0gd29ybGRDZW50ZXJYKS93b3JsZFVuaXRzUGVyUGl4ZWwgOyBweSA9IGltZ0gvMiAtICh3b3JsZFkgLSB3b3JsZENlbnRlclkpL3dvcmxkVW5pdHNQZXJQaXhlbCdcbiAgICAgICAgICAgIH0gOiB7XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbjogJ3BlcnNwZWN0aXZlJyxcbiAgICAgICAgICAgICAgICB3b3JsZENlbnRlclg6IHdjLngsXG4gICAgICAgICAgICAgICAgd29ybGRDZW50ZXJZOiB3Yy55LFxuICAgICAgICAgICAgICAgIGltYWdlV2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgICAgIGltYWdlSGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICAgICAgZm9ybXVsYTogJ3BlcnNwZWN0aXZlIHByb2plY3Rpb246IHBpeGVsIG1hcHBpbmcgaXMgbm9uLWxpbmVhciwgdXNlIGZvciB2aXN1YWwgY29tcGFyaXNvbiBvbmx5J1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2xlYW51cCgpO1xuICAgICAgICAgICAgY2xlYW51cCA9IG51bGw7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHBuZ0Jhc2U2NCwgd2lkdGgsIGhlaWdodCwgbW9kZSwgY2FtZXJhTm9kZVV1aWQ6IHNyY1V1aWQsIGNhbWVyYU5vZGVOYW1lOiBzcmNOYW1lLCBtYXBwaW5nIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGlmIChjbGVhbnVwKSB7IGNsZWFudXAoKTsgfVxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKiogUmVjdXJzaXZlbHkgZmluZCBhIG5vZGUgYnkgVVVJRCBhbnl3aGVyZSB1bmRlciByb290IChnZXRDaGlsZEJ5VXVpZCBpcyBub3QgcmVjdXJzaXZlKS4gKi9cbmZ1bmN0aW9uIGZpbmROb2RlRGVlcChyb290OiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XG4gICAgaWYgKCFyb290IHx8ICF1dWlkKSB7IHJldHVybiBudWxsOyB9XG4gICAgaWYgKHJvb3QudXVpZCA9PT0gdXVpZCkgeyByZXR1cm4gcm9vdDsgfVxuICAgIGNvbnN0IGNoaWxkcmVuID0gcm9vdC5jaGlsZHJlbiB8fCBbXTtcbiAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVEZWVwKGNoaWxkLCB1dWlkKTtcbiAgICAgICAgaWYgKGZvdW5kKSB7IHJldHVybiBmb3VuZDsgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuLyoqIFdhaXQgTiByZW5kZXJlZCBmcmFtZXMgaW4gdGhlIHNjZW5lIHByb2Nlc3MgYmVmb3JlIHJlYWRpbmcgYmFjayBwaXhlbHMuICovXG5mdW5jdGlvbiB3YWl0RnJhbWVzKG46IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGc6IGFueSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICAgIGNvbnN0IHJhZjogKGNiOiAoKSA9PiB2b2lkKSA9PiBhbnkgPSB0eXBlb2YgZy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09ICdmdW5jdGlvbidcbiAgICAgICAgPyBnLnJlcXVlc3RBbmltYXRpb25GcmFtZS5iaW5kKGcpXG4gICAgICAgIDogKGNiOiAoKSA9PiB2b2lkKSA9PiBzZXRUaW1lb3V0KGNiLCAxNik7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAgIGNvbnN0IHRpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICBjb3VudCsrO1xuICAgICAgICAgICAgaWYgKGNvdW50ID49IG4pIHsgcmVzb2x2ZSgpOyB9IGVsc2UgeyByYWYodGljayk7IH1cbiAgICAgICAgfTtcbiAgICAgICAgcmFmKHRpY2spO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIEVuY29kZSByYXcgUkdCQSBieXRlcyAoT3BlbkdMIGJvdHRvbS1sZWZ0IG9yaWdpbikgaW50byBhIGJhc2U2NCBQTkcsIGZsaXBwaW5nXG4gKiB2ZXJ0aWNhbGx5IHNvIHRoZSBpbWFnZSBpcyB1cHJpZ2h0LiBVc2VzIHRoZSBzY2VuZSBwcm9jZXNzIERPTSBjYW52YXMsIHdoaWNoXG4gKiB0aGUgV2ViR0wgZW5naW5lIHJlbmRlcmVyIGFsd2F5cyBwcm92aWRlcy5cbiAqL1xuZnVuY3Rpb24gZW5jb2RlUG5nRmxpcHBlZChyYXc6IFVpbnQ4QXJyYXksIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKTogc3RyaW5nIHtcbiAgICBjb25zdCBnOiBhbnkgPSBnbG9iYWxUaGlzIGFzIGFueTtcbiAgICBjb25zdCBkb2M6IGFueSA9IGcuZG9jdW1lbnQ7XG4gICAgaWYgKCFkb2MgfHwgdHlwZW9mIGRvYy5jcmVhdGVFbGVtZW50ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZG9jdW1lbnQvY2FudmFzIG5vdCBhdmFpbGFibGUgaW4gc2NlbmUgY29udGV4dCBmb3IgUE5HIGVuY29kaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGNhbnZhczogYW55ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgY29uc3QgY3R4OiBhbnkgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb25zdCBpbWc6IGFueSA9IGN0eC5jcmVhdGVJbWFnZURhdGEod2lkdGgsIGhlaWdodCk7XG4gICAgY29uc3Qgcm93Qnl0ZXMgPSB3aWR0aCAqIDQ7XG4gICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICBjb25zdCBzcmNTdGFydCA9IChoZWlnaHQgLSAxIC0geSkgKiByb3dCeXRlcztcbiAgICAgICAgaW1nLmRhdGEuc2V0KHJhdy5zdWJhcnJheShzcmNTdGFydCwgc3JjU3RhcnQgKyByb3dCeXRlcyksIHkgKiByb3dCeXRlcyk7XG4gICAgfVxuICAgIGN0eC5wdXRJbWFnZURhdGEoaW1nLCAwLCAwKTtcbiAgICBjb25zdCBkYXRhVXJsOiBzdHJpbmcgPSBjYW52YXMudG9EYXRhVVJMKCdpbWFnZS9wbmcnKTtcbiAgICByZXR1cm4gZGF0YVVybC5zdWJzdHJpbmcoZGF0YVVybC5pbmRleE9mKCcsJykgKyAxKTtcbn0iXX0=