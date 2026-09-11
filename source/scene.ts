import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

export const methods: { [key: string]: (...any: any) => any } = {
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
    async captureSceneView(opts: any) {
        let cleanup: (() => void) | null = null;
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
            } else {
                let src: any;
                if (mode === 'camera') {
                    const cn = findNodeDeep(scene, opts.cameraUuid);
                    if (!cn) {
                        return { success: false, error: `Camera node with UUID ${opts.cameraUuid} not found`, instruction: 'Use scene_management(action="get_hierarchy") to find a valid camera node UUID.' };
                    }
                    src = cn.getComponent(Camera);
                    if (!src) {
                        return { success: false, error: `Node ${opts.cameraUuid} has no Camera component`, instruction: 'Pass the UUID of a node that has a Camera component attached, or use capture_scene to auto-pick one.' };
                    }
                } else {
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
                return { success: false, error: 'readPixels returned no/insufficient data', instruction: 'The render target likely produced no frames. Retry; if it persists, reduce width/height or check GPU readback support.' };
            }

            const canvas = buildFlippedCanvas(raw, width, height);
            const pngBase64 = canvasToPngBase64(canvas);
            let previewBase64: string | undefined;
            let previewWidth: number | undefined;
            let previewHeight: number | undefined;
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
        } catch (error: any) {
            if (cleanup) { cleanup(); }
            return { success: false, error: error?.message || String(error) };
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
    probeCceApi(namespace?: string | null, nodeUuid?: string | null) {
        // execute-scene-script serializes args through JSON, turning `undefined` into `null`,
        // so a default parameter (`= 'Prefab'`) never kicks in — normalize explicitly instead.
        namespace = namespace || 'Prefab';
        try {
            const mgr = (globalThis as any).cce?.[namespace];
            const methods = mgr
                ? Object.getOwnPropertyNames(mgr)
                    .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(mgr) || {}))
                    .filter((k, i, a) => a.indexOf(k) === i && typeof mgr[k] === 'function')
                    .sort()
                : null;

            let nodeInfo: any = null;
            if (nodeUuid) {
                const { director } = require('cc');
                const scene = director.getScene();
                const node = scene ? findNodeDeep(scene, nodeUuid) : null;
                if (!node) {
                    nodeInfo = { found: false };
                } else {
                    const pi = node._prefab;
                    nodeInfo = {
                        found: true,
                        name: node.name,
                        hasPrefabInfo: !!pi,
                        prefabInfo: pi ? {
                            fileId: pi.fileId,
                            hasRoot: !!pi.root,
                            rootIsSelf: pi.root === node,
                            assetUuid: pi.asset?._uuid ?? pi.asset?.uuid ?? null,
                            instanceFileId: pi.instance?.fileId ?? null,
                            hasInstance: !!pi.instance
                        } : null
                    };
                }
            }

            return {
                success: true,
                data: {
                    cceAvailable: !!(globalThis as any).cce,
                    namespace,
                    namespaceAvailable: !!mgr,
                    methods,
                    nodeInfo
                }
            };
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
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
    async evalScript(script?: string | null) {
        try {
            if (!script) {
                return { success: false, error: 'script is required' };
            }
            const cc = require('cc');
            const AsyncFunction = Object.getPrototypeOf(async function () { /* noop */ }).constructor;
            const fn = new AsyncFunction('cc', script);
            const result = await fn(cc);
            try {
                // Round-trip to surface non-serialisable values here rather than
                // as an opaque IPC failure.
                JSON.stringify(result);
                return { success: true, data: { result } };
            } catch {
                return { success: true, data: { result: String(result) } };
            }
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
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
    describeClass(className?: string | null) {
        try {
            const cc = require('cc');
            const name = className || '';
            if (!name) {
                return { success: false, error: 'className is required' };
            }

            const ctor = cc.js?.getClassByName ? cc.js.getClassByName(name) : undefined;
            if (!ctor) {
                return { success: false, error: `Class '${name}' is not registered in the engine` };
            }

            const attrs = cc.CCClass?.Attr?.getClassAttrs ? cc.CCClass.Attr.getClassAttrs(ctor) : null;
            const describe = (prop: string, extra: Record<string, any>, fallbackKey?: string) => {
                // Attributes are split across the two keys: the accessor carries
                // `visible`/`displayOrder`, its backing field carries `default`.
                // Read the accessor first and fill the gaps from the field.
                const read = (suffix: string) => {
                    if (!attrs) return undefined;
                    const own = attrs[`${prop}$_$${suffix}`];
                    if (own !== undefined) return own;
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
                let factoryType: string | undefined;
                if (isFactory) {
                    try {
                        factoryType = rawDefault()?.constructor?.name;
                    } catch {
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
                return {
                    name: prop,
                    type: read('type') ?? (ctorAttr && ctorAttr.name) ?? inferred,
                    default: def,
                    visible: read('visible'),
                    readonly: read('readonly'),
                    tooltip: read('tooltip'),
                    range: read('range'),
                    // Enum options come back as {name, value} rows; keep just the
                    // names so the payload stays small.
                    enumOptions: Array.isArray(enumList)
                        ? enumList.map((e: any) => e?.name).filter(Boolean)
                        : undefined,
                    ...extra
                };
            };

            // Public accessors walked off the prototype chain — these are the names
            // a caller actually writes.
            const accessors = new Map<string, { settable: boolean }>();
            let proto = ctor.prototype;
            while (proto && proto !== Object.prototype) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor' || key.startsWith('_') || accessors.has(key)) continue;
                    const desc = Object.getOwnPropertyDescriptor(proto, key);
                    if (desc && desc.get) {
                        accessors.set(key, { settable: !!desc.set });
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }

            // Serialised fields. A backing field is skipped when its accessor is
            // present, so `_string` does not shadow `string`.
            const fields: string[] = (ctor as any).__values__ || [];
            const shadowed = new Set(
                fields.filter((f: string) => f.startsWith('_') && accessors.has(f.slice(1)))
            );
            const properties = fields
                .filter((f: string) => !shadowed.has(f))
                .map((f: string) => describe(f, { serialized: true }));

            for (const [key, info] of accessors) {
                const backing = `_${key}`;
                properties.push(
                    describe(
                        key,
                        { accessor: true, readonly: !info.settable },
                        shadowed.has(backing) ? backing : undefined
                    )
                );
            }

            return {
                success: true,
                data: {
                    name,
                    extends: Object.getPrototypeOf(ctor)?.name || undefined,
                    propertyCount: properties.length,
                    properties
                }
            };
        } catch (error: any) {
            return { success: false, error: error?.message || String(error) };
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
    snapshotNodes(uuids?: string[] | null) {
        try {
            const { director } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const list = uuids || [];
            const nodes: any[] = [];
            const missing: string[] = [];

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
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Restore a snapshot produced by snapshotNodes. Nodes that no longer exist are
     * reported rather than silently skipped, since that means the rollback is partial.
     */
    restoreNodes(snapshot?: any) {
        try {
            const { director, Vec3 } = require('cc');
            const scene = director.getScene();
            if (!scene) {
                return { success: false, error: 'No active scene' };
            }

            const nodes = (snapshot && snapshot.nodes) || [];
            const restored: string[] = [];
            const missing: string[] = [];

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
        } catch (error: any) {
            return { success: false, error: error.message };
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
 * Build a canvas from raw RGBA bytes (OpenGL bottom-left origin), flipping
 * vertically so the image is upright. Uses the scene process DOM canvas, which
 * the WebGL engine renderer always provides.
 */
function buildFlippedCanvas(raw: Uint8Array, width: number, height: number): any {
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
    return canvas;
}

/** Encode a canvas to base64 PNG (no data URL prefix). */
function canvasToPngBase64(canvas: any): string {
    const dataUrl: string = canvas.toDataURL('image/png');
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
}

/** Downscale (never upscale) a canvas to fit within maxWidth x maxHeight, preserving aspect ratio, and encode as base64 PNG. */
function resizeCanvasToPngBase64(canvas: any, maxWidth: number, maxHeight: number): { base64: string; width: number; height: number } {
    const g: any = globalThis as any;
    const doc: any = g.document;
    const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height);
    const outWidth = Math.max(1, Math.round(canvas.width * scale));
    const outHeight = Math.max(1, Math.round(canvas.height * scale));
    if (scale >= 1) {
        return { base64: canvasToPngBase64(canvas), width: canvas.width, height: canvas.height };
    }
    const outCanvas: any = doc.createElement('canvas');
    outCanvas.width = outWidth;
    outCanvas.height = outHeight;
    const ctx: any = outCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, outWidth, outHeight);
    return { base64: canvasToPngBase64(outCanvas), width: outWidth, height: outHeight };
}