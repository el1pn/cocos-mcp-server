import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

export const methods: { [key: string]: (...any: any) => any } = {
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Add component to a node
     */
    addComponentToNode(nodeUuid: string, componentType: string) {
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Remove component from a node
     */
    removeComponentFromNode(nodeUuid: string, componentType: string) {
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Create a new node
     */
    createNode(name: string, parentUuid?: string) {
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
                } else {
                    scene.addChild(node);
                }
            } else {
                scene.addChild(node);
            }

            return { 
                success: true, 
                message: `Node ${name} created successfully`,
                data: { uuid: node.uuid, name: node.name }
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get node information
     */
    getNodeInfo(nodeUuid: string) {
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
                    parent: node.parent?.uuid,
                    children: node.children.map((child: any) => child.uuid),
                    components: node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }))
                }
            };
        } catch (error: any) {
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

            const nodes: any[] = [];
            const collectNodes = (node: any) => {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: node.parent?.uuid
                });
                
                node.children.forEach((child: any) => collectNodes(child));
            };

            scene.children.forEach((child: any) => collectNodes(child));
            
            return { success: true, data: nodes };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Find node by name
     */
    findNodeByName(name: string) {
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
        } catch (error: any) {
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Set node property
     */
    setNodeProperty(nodeUuid: string, property: string, value: any) {
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
            } else if (property === 'rotation') {
                node.setRotationFromEuler(value.x || 0, value.y || 0, value.z || 0);
            } else if (property === 'scale') {
                node.setScale(value.x || 1, value.y || 1, value.z || 1);
            } else if (property === 'active') {
                node.active = value;
            } else if (property === 'name') {
                node.name = value;
            } else {
                // Try setting property directly
                (node as any)[property] = value;
            }

            return { 
                success: true, 
                message: `Property '${property}' updated successfully` 
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Get scene hierarchy
     */
    getSceneHierarchy(includeComponents: boolean = false) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const processNode = (node: any): any => {
                const result: any = {
                    name: node.name,
                    uuid: node.uuid,
                    active: node.active,
                    children: []
                };

                if (includeComponents) {
                    result.components = node.components.map((comp: any) => ({
                        type: comp.constructor.name,
                        enabled: comp.enabled
                    }));
                }

                if (node.children && node.children.length > 0) {
                    result.children = node.children.map((child: any) => processNode(child));
                }

                return result;
            };

            const hierarchy = scene.children.map((child: any) => processNode(child));
            return { success: true, data: hierarchy };
        } catch (error: any) {
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
    async revertPrefabInstance(nodeUuid: string) {
        try {
            const mgr = (globalThis as any).cce?.Prefab;
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
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
        }
    },

    async createPrefabFromNode(nodeUuid: string, url: string) {
        try {
            const mgr = (globalThis as any).cce?.Prefab;
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
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
        }
    },

    /**
     * Control animation on a node (play/stop/pause/resume)
     */
    controlAnimation(nodeUuid: string, command: string, clipName?: string) {
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
                    } else {
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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Set component property
     */
    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: any) {
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
                    assetManager.resources.load(value, require('cc').SpriteFrame, (err: any, spriteFrame: any) => {
                        if (!err && spriteFrame) {
                            component.spriteFrame = spriteFrame;
                        } else {
                            // Try loading by uuid
                            assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                                if (!err2 && asset) {
                                    component.spriteFrame = asset;
                                } else {
                                    // Direct assignment (compatible with passed asset objects)
                                    component.spriteFrame = value;
                                }
                            });
                        }
                    });
                } else {
                    component.spriteFrame = value;
                }
            } else if (property === 'material' && (componentType === 'cc.Sprite' || componentType === 'cc.MeshRenderer')) {
                // Support value as uuid or asset path
                if (typeof value === 'string') {
                    const assetManager = require('cc').assetManager;
                    assetManager.resources.load(value, require('cc').Material, (err: any, material: any) => {
                        if (!err && material) {
                            component.material = material;
                        } else {
                            assetManager.loadAny({ uuid: value }, (err2: any, asset: any) => {
                                if (!err2 && asset) {
                                    component.material = asset;
                                } else {
                                    component.material = value;
                                }
                            });
                        }
                    });
                } else {
                    component.material = value;
                }
            } else if (property === 'string' && (componentType === 'cc.Label' || componentType === 'cc.RichText')) {
                component.string = value;
            } else {
                component[property] = value;
            }
            // Optional: refresh Inspector
            // Editor.Message.send('scene', 'snapshot');
            return { success: true, message: `Component property '${property}' updated successfully` };
        } catch (error: any) {
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
    async captureSceneView(opts: any) {
        let cleanup: (() => void) | null = null;
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
            const cameras: any[] = [];
            const collect = (n: any) => {
                if (!n) { return; }
                if (n.getComponent) {
                    const c = n.getComponent(Camera);
                    if (c) { cameras.push(c); }
                }
                (n.children || []).forEach(collect);
            };
            scene.children.forEach(collect);

            const pickMain = () => {
                const usable = cameras.filter((c: any) => c.enabledInHierarchy !== false && !c.targetTexture);
                const list = usable.length ? usable : cameras;
                const ortho = list.find((c: any) => c.projection === Camera.ProjectionType.ORTHO);
                return ortho || list[0] || null;
            };

            // Resolve the parameters of the camera we will render with.
            let worldPos: any;
            let worldRot: any;
            let projection: number;
            let orthoHeight: number;
            let fov: number;
            let near: number;
            let far: number;
            let visibility: number | null = null;
            let srcUuid: string | undefined;
            let srcName: string | undefined;

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
            } else {
                let src: any;
                if (mode === 'camera') {
                    const cn = findNodeDeep(scene, opts.cameraUuid);
                    if (!cn) {
                        return { success: false, error: `Camera node with UUID ${opts.cameraUuid} not found` };
                    }
                    src = cn.getComponent(Camera);
                    if (!src) {
                        return { success: false, error: `Node ${opts.cameraUuid} has no Camera component` };
                    }
                } else {
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
                try { cam.targetTexture = null; } catch (e) { /* ignore */ }
                try { camNode.destroy(); } catch (e) { /* ignore */ }
                try { rt.destroy(); } catch (e) { /* ignore */ }
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
            } catch (e) { /* ignore */ }

            await waitFrames(1);
            if (canForceRender) {
                try { root.frameMove(0); root.frameMove(0); } catch (e) { /* ignore */ }
            }
            await waitFrames(1);
            if (canForceRender) {
                try { root.frameMove(0); } catch (e) { /* ignore */ }
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
        } catch (error: any) {
            if (cleanup) { cleanup(); }
            return { success: false, error: error?.message || String(error) };
        }
    }
};

/** Recursively find a node by UUID anywhere under root (getChildByUuid is not recursive). */
function findNodeDeep(root: any, uuid: string): any {
    if (!root || !uuid) { return null; }
    if (root.uuid === uuid) { return root; }
    const children = root.children || [];
    for (const child of children) {
        const found = findNodeDeep(child, uuid);
        if (found) { return found; }
    }
    return null;
}

/** Wait N rendered frames in the scene process before reading back pixels. */
function waitFrames(n: number): Promise<void> {
    const g: any = globalThis as any;
    const raf: (cb: () => void) => any = typeof g.requestAnimationFrame === 'function'
        ? g.requestAnimationFrame.bind(g)
        : (cb: () => void) => setTimeout(cb, 16);
    return new Promise<void>((resolve) => {
        let count = 0;
        const tick = () => {
            count++;
            if (count >= n) { resolve(); } else { raf(tick); }
        };
        raf(tick);
    });
}

/**
 * Encode raw RGBA bytes (OpenGL bottom-left origin) into a base64 PNG, flipping
 * vertically so the image is upright. Uses the scene process DOM canvas, which
 * the WebGL engine renderer always provides.
 */
function encodePngFlipped(raw: Uint8Array, width: number, height: number): string {
    const g: any = globalThis as any;
    const doc: any = g.document;
    if (!doc || typeof doc.createElement !== 'function') {
        throw new Error('document/canvas not available in scene context for PNG encoding');
    }
    const canvas: any = doc.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx: any = canvas.getContext('2d');
    const img: any = ctx.createImageData(width, height);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
        const srcStart = (height - 1 - y) * rowBytes;
        img.data.set(raw.subarray(srcStart, srcStart + rowBytes), y * rowBytes);
    }
    ctx.putImageData(img, 0, 0);
    const dataUrl: string = canvas.toDataURL('image/png');
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
}