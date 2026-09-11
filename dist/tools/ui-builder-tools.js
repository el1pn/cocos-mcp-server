"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIBuilderTools = void 0;
const node_resolver_1 = require("../utils/node-resolver");
const ui_spec_1 = require("../types/ui-spec");
const node_tools_1 = require("./node-tools");
const component_tools_1 = require("./component-tools");
const prefab_tools_1 = require("./prefab-tools");
const editor_request_1 = require("../utils/editor-request");
const logger_1 = require("../logger");
const LAYOUT_TYPE_MAP = {
    NONE: 0,
    HORIZONTAL: 1,
    VERTICAL: 2,
    GRID: 3,
};
class UIBuilderTools {
    constructor() {
        this.nodeTools = new node_tools_1.NodeTools();
        this.componentTools = new component_tools_1.ComponentTools();
        this.prefabTools = new prefab_tools_1.PrefabTools();
    }
    getTools() {
        return [
            {
                name: 'ui_build_from_spec',
                description: 'Build a UI node hierarchy declaratively from a UISpec JSON tree. Expands semantic types (Button, Label, Image, Panel, Input, ScrollView, List) into component combos, applies presets (full_stretch, top_bar, bottom_bar, vertical_list, horizontal_list), and sets sizes/anchors/props in a single call. Optionally saves the result as a prefab. Returns root UUID and all created node UUIDs.\n\n' +
                    'WORKFLOW (mandatory):\n' +
                    '1. Sketch the UISpec JSON plus an ASCII tree preview, then ask the user "OK to build, or adjust?".\n' +
                    '2. Only after the user confirms, call this tool ONCE with the final spec.\n' +
                    '3. Do NOT use node_lifecycle / component_manage / set_component_property to build new UI — those are for small edits on existing nodes.\n\n' +
                    'RULES:\n' +
                    '- Prefer semantic `type` (Button/Label/Image/Panel/Input/ScrollView/List) over raw `components[]`. Use `components[]` only for things without a semantic alias (cc.Mask, cc.Graphics, custom scripts, cc.BlockInputEvents, ...).\n' +
                    '- Use `preset` for the 5 standard responsive layouts; combine with `widget` to override individual sides.\n' +
                    '- Asset paths use `db://assets/...` (the tool resolves UUIDs); colors are 0–255.\n' +
                    '- Do not nest deeper than 6 levels — split into a sub-prefab via a separate call with `saveAsPrefab`.\n' +
                    '- Do not hardcode business data (specific items, prices); build templates only and let runtime fill data.\n' +
                    '- For ScrollView, just declare `type: "ScrollView"` + `scrollLayout`; the tool builds view+mask+content+layout and wires `ScrollView.content`. Children of the spec are routed into the content node automatically — do NOT build the scaffold by hand.\n' +
                    '- When the user requests a tweak after the build, edit the UISpec JSON and call this tool again rather than patching node-by-node, unless the change touches ≤3 nodes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        spec: Object.assign(Object.assign({}, ui_spec_1.UI_SPEC_JSON_SCHEMA), { description: 'UISpec tree. Each node has: name (required), optional type (semantic shortcut), preset, size [w,h], anchor [x,y], position [x,y], props (text/color/background/onClick/layoutType), components[] (escape hatch for raw cc.* components), children[] (recursive).' }),
                        parentUuid: {
                            type: 'string',
                            description: 'Parent node UUID. Omit to create at scene root.',
                        },
                        saveAsPrefab: {
                            type: 'string',
                            description: 'Optional prefab save path, e.g. db://assets/prefabs/ShopScreen.prefab. If set, the built root is saved as a prefab after construction.',
                        },
                    },
                    required: ['spec'],
                },
            },
        ];
    }
    async execute(toolName, args) {
        if (toolName !== 'ui_build_from_spec') {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        // The parent may be given as a path or a name; the engine wants a UUID.
        const unresolved = await (0, node_resolver_1.resolveNodeRefFields)(args, ['parentUuid']);
        if (unresolved) {
            return unresolved;
        }
        return this.buildFromSpec(args);
    }
    async buildFromSpec(args) {
        var _a, _b, _c;
        const spec = args === null || args === void 0 ? void 0 : args.spec;
        if (!spec || typeof spec !== 'object' || !spec.name) {
            return { success: false, error: 'Missing or invalid spec: a UISpec object with at least a "name" field is required.' };
        }
        const ctx = { createdNodeUuids: [], warnings: [] };
        let autoDetectedSize;
        if (!spec.size || spec.size.length !== 2) {
            autoDetectedSize = await this.fetchDesignResolution();
            if (autoDetectedSize) {
                spec.size = [autoDetectedSize.width, autoDetectedSize.height];
            }
        }
        let rootUuid;
        try {
            rootUuid = await this.buildNode(spec, args === null || args === void 0 ? void 0 : args.parentUuid, ctx);
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to build UI spec: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`,
                data: { createdNodeUuids: ctx.createdNodeUuids, warnings: ctx.warnings },
            };
        }
        let prefabPath;
        if ((args === null || args === void 0 ? void 0 : args.saveAsPrefab) && typeof args.saveAsPrefab === 'string') {
            const path = args.saveAsPrefab;
            const prefabName = (_b = this.extractPrefabName(path)) !== null && _b !== void 0 ? _b : spec.name;
            const savePath = path.endsWith('.prefab') ? path : `${path.replace(/\/$/, '')}/${prefabName}.prefab`;
            const prefabResult = await this.prefabTools.execute('prefab_lifecycle', {
                action: 'create',
                nodeUuid: rootUuid,
                savePath,
                prefabName,
                includeChildren: true,
                includeComponents: true,
            });
            if (prefabResult.success) {
                prefabPath = savePath;
            }
            else {
                ctx.warnings.push(`Failed to save prefab at ${savePath}: ${(_c = prefabResult.error) !== null && _c !== void 0 ? _c : 'unknown error'}`);
            }
        }
        return {
            success: !!rootUuid,
            message: `Built UI '${spec.name}' with ${ctx.createdNodeUuids.length} node(s)${ctx.warnings.length > 0 ? ` (${ctx.warnings.length} warning(s))` : ''}`,
            warning: ctx.warnings.length > 0 ? ctx.warnings.join('\n') : undefined,
            data: {
                rootUuid,
                createdNodeUuids: ctx.createdNodeUuids,
                prefabPath,
                warningCount: ctx.warnings.length,
                autoDetectedSize,
            },
        };
    }
    async fetchDesignResolution() {
        var _a, _b, _c, _d, _e, _f;
        try {
            const config = await (0, editor_request_1.editorRequest)('project', 'query-config', 'project');
            const candidates = [
                (_a = config === null || config === void 0 ? void 0 : config.preview) === null || _a === void 0 ? void 0 : _a.designResolution,
                (_b = config === null || config === void 0 ? void 0 : config.preview) === null || _b === void 0 ? void 0 : _b.design_resolution,
                { width: (_c = config === null || config === void 0 ? void 0 : config.preview) === null || _c === void 0 ? void 0 : _c.design_width, height: (_d = config === null || config === void 0 ? void 0 : config.preview) === null || _d === void 0 ? void 0 : _d.design_height },
                (_e = config === null || config === void 0 ? void 0 : config.general) === null || _e === void 0 ? void 0 : _e.designResolution,
            ];
            for (const c of candidates) {
                const w = Number(c === null || c === void 0 ? void 0 : c.width);
                const h = Number(c === null || c === void 0 ? void 0 : c.height);
                if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                    return { width: w, height: h };
                }
            }
        }
        catch (error) {
            logger_1.logger.warn(`ui-builder: failed to fetch design resolution: ${(_f = error === null || error === void 0 ? void 0 : error.message) !== null && _f !== void 0 ? _f : error}`);
        }
        return undefined;
    }
    async buildNode(spec, parentUuid, ctx) {
        var _a, _b, _c, _d, _e, _f;
        if (!spec.name) {
            throw new Error('Every UISpec node must have a name');
        }
        const createResult = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: spec.name,
            parentUuid,
        });
        if (!createResult.success || !((_a = createResult.data) === null || _a === void 0 ? void 0 : _a.uuid)) {
            throw new Error(`Failed to create node '${spec.name}': ${(_b = createResult.error) !== null && _b !== void 0 ? _b : 'no uuid returned'}`);
        }
        const uuid = createResult.data.uuid;
        ctx.createdNodeUuids.push(uuid);
        for (const componentType of this.componentsForSemanticType(spec.type)) {
            const addResult = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: uuid,
                componentType,
            });
            if (!addResult.success) {
                ctx.warnings.push(`${spec.name} add ${componentType}: ${(_c = addResult.error) !== null && _c !== void 0 ? _c : 'unknown error'}`);
            }
        }
        await this.applySpriteFrameDefault(uuid, spec, ctx);
        await this.applyTransformBasics(uuid, spec, ctx);
        await this.applySemanticProps(uuid, spec, ctx);
        await this.applyRawComponents(uuid, spec.components, ctx);
        await this.applyPreset(uuid, spec, ctx);
        await this.applyWidgetOverride(uuid, spec, ctx);
        if (spec.type === 'Button') {
            await this.buildButtonLabelChild(uuid, spec, ctx);
        }
        if (spec.type === 'Input') {
            await this.buildEditboxChildren(uuid, spec, ctx);
        }
        if (spec.active === false) {
            const r = await this.nodeTools.execute('node_transform', {
                action: 'set_property',
                uuid,
                property: 'active',
                value: false,
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name}.active=false: ${(_d = r.error) !== null && _d !== void 0 ? _d : 'unknown error'}`);
            }
        }
        let childParentUuid = uuid;
        if (spec.type === 'ScrollView') {
            childParentUuid = await this.buildScrollViewScaffold(uuid, spec, ctx);
        }
        if (Array.isArray(spec.children)) {
            for (const child of spec.children) {
                try {
                    await this.buildNode(child, childParentUuid, ctx);
                }
                catch (error) {
                    ctx.warnings.push(`Child '${(_e = child === null || child === void 0 ? void 0 : child.name) !== null && _e !== void 0 ? _e : '<unnamed>'}' under '${spec.name}': ${(_f = error === null || error === void 0 ? void 0 : error.message) !== null && _f !== void 0 ? _f : String(error)}`);
                }
            }
        }
        return uuid;
    }
    async applyWidgetOverride(uuid, spec, ctx) {
        var _a;
        const widget = spec.widget;
        if (!widget) {
            return;
        }
        const ensured = await this.componentTools.execute('component_manage', {
            action: 'add',
            nodeUuid: uuid,
            componentType: 'cc.Widget',
        });
        if (!ensured.success) {
            ctx.warnings.push(`${spec.name} ensure cc.Widget: ${(_a = ensured.error) !== null && _a !== void 0 ? _a : 'unknown error'}`);
            return;
        }
        const fields = [
            ['top', 'isAlignTop', 'top'],
            ['bottom', 'isAlignBottom', 'bottom'],
            ['left', 'isAlignLeft', 'left'],
            ['right', 'isAlignRight', 'right'],
            ['horizontalCenter', 'isAlignHorizontalCenter', 'horizontalCenter'],
            ['verticalCenter', 'isAlignVerticalCenter', 'verticalCenter'],
        ];
        for (const [specField, alignFlag, valueField] of fields) {
            const v = widget[specField];
            if (typeof v === 'number') {
                await this.setProp(uuid, 'cc.Widget', alignFlag, 'boolean', true, ctx);
                await this.setProp(uuid, 'cc.Widget', valueField, 'number', v, ctx);
            }
        }
        if (widget.alignMode) {
            const map = { ONCE: 0, ON_WINDOW_RESIZE: 1, ALWAYS: 2 };
            await this.setProp(uuid, 'cc.Widget', 'alignMode', 'integer', map[widget.alignMode], ctx);
        }
    }
    async buildScrollViewScaffold(rootUuid, spec, ctx) {
        var _a, _b, _c, _d, _e;
        const viewResult = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'view',
            parentUuid: rootUuid,
        });
        if (!viewResult.success || !((_a = viewResult.data) === null || _a === void 0 ? void 0 : _a.uuid)) {
            ctx.warnings.push(`${spec.name} ScrollView: failed to create view node`);
            return rootUuid;
        }
        const viewUuid = viewResult.data.uuid;
        ctx.createdNodeUuids.push(viewUuid);
        for (const componentType of ['cc.UITransform', 'cc.Mask']) {
            const r = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: viewUuid,
                componentType,
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name} view add ${componentType}: ${(_b = r.error) !== null && _b !== void 0 ? _b : 'unknown error'}`);
            }
        }
        await this.componentTools.execute('ui_apply_responsive_defaults', {
            nodeUuid: viewUuid,
            preset: 'full_stretch',
        });
        const contentResult = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'content',
            parentUuid: viewUuid,
        });
        if (!contentResult.success || !((_c = contentResult.data) === null || _c === void 0 ? void 0 : _c.uuid)) {
            ctx.warnings.push(`${spec.name} ScrollView: failed to create content node`);
            return viewUuid;
        }
        const contentUuid = contentResult.data.uuid;
        ctx.createdNodeUuids.push(contentUuid);
        const ensureContent = await this.componentTools.execute('component_manage', {
            action: 'add',
            nodeUuid: contentUuid,
            componentType: 'cc.UITransform',
        });
        if (!ensureContent.success) {
            ctx.warnings.push(`${spec.name} content add cc.UITransform: ${(_d = ensureContent.error) !== null && _d !== void 0 ? _d : 'unknown error'}`);
        }
        const scrollLayout = spec.scrollLayout;
        if (scrollLayout) {
            const ensureLayout = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: contentUuid,
                componentType: 'cc.Layout',
            });
            if (!ensureLayout.success) {
                ctx.warnings.push(`${spec.name} content add cc.Layout: ${(_e = ensureLayout.error) !== null && _e !== void 0 ? _e : 'unknown error'}`);
            }
            const layoutType = scrollLayout === 'horizontal' ? 1 : scrollLayout === 'grid' ? 3 : 2;
            await this.setProp(contentUuid, 'cc.Layout', 'type', 'integer', layoutType, ctx);
            await this.setProp(contentUuid, 'cc.Layout', 'resizeMode', 'integer', 1, ctx);
        }
        await this.setProp(rootUuid, 'cc.ScrollView', 'content', 'node', contentUuid, ctx);
        const isHorizontal = scrollLayout === 'horizontal';
        await this.setProp(rootUuid, 'cc.ScrollView', 'horizontal', 'boolean', isHorizontal, ctx);
        await this.setProp(rootUuid, 'cc.ScrollView', 'vertical', 'boolean', !isHorizontal, ctx);
        return contentUuid;
    }
    componentsForSemanticType(type) {
        switch (type) {
            case 'Panel':
            case 'Image':
                return ['cc.UITransform', 'cc.Sprite'];
            case 'Label':
                return ['cc.UITransform', 'cc.Label'];
            case 'Button':
                return ['cc.UITransform', 'cc.Sprite', 'cc.Button'];
            case 'Input':
                return ['cc.UITransform', 'cc.Sprite', 'cc.EditBox'];
            case 'ScrollView':
                return ['cc.UITransform', 'cc.ScrollView'];
            case 'List':
                return ['cc.UITransform', 'cc.Layout'];
            case 'Node':
            default:
                return ['cc.UITransform'];
        }
    }
    async applyTransformBasics(uuid, spec, ctx) {
        var _a;
        if (spec.size && spec.size.length === 2) {
            const [width, height] = spec.size;
            await this.setProp(uuid, 'cc.UITransform', 'contentSize', 'size', { width, height }, ctx);
        }
        if (spec.anchor && spec.anchor.length === 2) {
            const [x, y] = spec.anchor;
            await this.setProp(uuid, 'cc.UITransform', 'anchorPoint', 'vec2', { x, y }, ctx);
        }
        if (spec.position && spec.position.length === 2) {
            const [x, y] = spec.position;
            const r = await this.nodeTools.execute('node_transform', {
                action: 'set_transform',
                uuid,
                position: { x, y, z: 0 },
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name}.position: ${(_a = r.error) !== null && _a !== void 0 ? _a : 'unknown error'}`);
            }
        }
    }
    async applySpriteFrameDefault(uuid, spec, ctx) {
        var _a;
        const type = spec.type;
        if (type !== 'Panel' && type !== 'Image' && type !== 'Button' && type !== 'Input') {
            return;
        }
        // For Button/Input type, always set Sprite type to SLICED for proper 9-slice scaling
        if (type === 'Button' || type === 'Input') {
            await this.setProp(uuid, 'cc.Sprite', 'type', 'integer', 1, ctx); // SLICED
        }
        const background = (_a = spec.props) === null || _a === void 0 ? void 0 : _a.background;
        if (background) {
            await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', await this.resolveAssetUuid(background), ctx);
            return;
        }
        // If no background provided for Button type, set the internal default button sprites
        if (type === 'Button') {
            const normalUrl = 'db://internal/default_ui/default_btn_normal.png';
            const pressedUrl = 'db://internal/default_ui/default_btn_pressed.png';
            const disabledUrl = 'db://internal/default_ui/default_btn_disabled.png';
            const normalUuid = await this.resolveAssetUuid(normalUrl);
            await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', normalUuid, ctx);
            await this.setProp(uuid, 'cc.Button', 'normalSprite', 'spriteFrame', normalUuid, ctx);
            await this.setProp(uuid, 'cc.Button', 'hoverSprite', 'spriteFrame', normalUuid, ctx);
            const pressedUuid = await this.resolveAssetUuid(pressedUrl);
            await this.setProp(uuid, 'cc.Button', 'pressedSprite', 'spriteFrame', pressedUuid, ctx);
            const disabledUuid = await this.resolveAssetUuid(disabledUrl);
            await this.setProp(uuid, 'cc.Button', 'disabledSprite', 'spriteFrame', disabledUuid, ctx);
        }
        // If no background provided for Input type, set the default editbox background sprite
        if (type === 'Input') {
            const editboxUuid = await this.resolveAssetUuid('db://internal/default_ui/default_editbox_bg.png');
            await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', editboxUuid, ctx);
            await this.setProp(uuid, 'cc.EditBox', 'backgroundImage', 'spriteFrame', editboxUuid, ctx);
        }
    }
    async buildButtonLabelChild(buttonUuid, spec, ctx) {
        var _a, _b, _c, _d, _e;
        const props = (_a = spec.props) !== null && _a !== void 0 ? _a : {};
        if (props.text === undefined && props.fontSize === undefined) {
            return;
        }
        const create = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'Label',
            parentUuid: buttonUuid,
        });
        if (!create.success || !((_b = create.data) === null || _b === void 0 ? void 0 : _b.uuid)) {
            ctx.warnings.push(`${spec.name} button label child: ${(_c = create.error) !== null && _c !== void 0 ? _c : 'unknown error'}`);
            return;
        }
        const labelUuid = create.data.uuid;
        ctx.createdNodeUuids.push(labelUuid);
        for (const componentType of ['cc.UITransform', 'cc.Label']) {
            const r = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: labelUuid,
                componentType,
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name} label add ${componentType}: ${(_d = r.error) !== null && _d !== void 0 ? _d : 'unknown error'}`);
            }
        }
        // Set overflow to CLAMP first so text changes don't auto-resize the node
        await this.setProp(labelUuid, 'cc.Label', 'overflow', 'integer', 1, ctx); // CLAMP
        if (props.text !== undefined) {
            await this.setProp(labelUuid, 'cc.Label', 'string', 'string', String(props.text), ctx);
        }
        if (props.fontSize !== undefined) {
            await this.setProp(labelUuid, 'cc.Label', 'fontSize', 'number', Number(props.fontSize), ctx);
        }
        if (props.color) {
            await this.setProp(labelUuid, 'cc.Label', 'color', 'color', this.normalizeColor(props.color), ctx);
        }
        // Label alignment (Button type only)
        if (props.labelAlignHorizontal) {
            const hMap = { LEFT: 0, CENTER: 1, RIGHT: 2 };
            const hVal = hMap[props.labelAlignHorizontal];
            if (hVal !== undefined) {
                await this.setProp(labelUuid, 'cc.Label', 'horizontalAlign', 'integer', hVal, ctx);
            }
        }
        if (props.labelAlignVertical) {
            const vMap = { TOP: 0, CENTER: 1, BOTTOM: 2 };
            const vVal = vMap[props.labelAlignVertical];
            if (vVal !== undefined) {
                await this.setProp(labelUuid, 'cc.Label', 'verticalAlign', 'integer', vVal, ctx);
            }
        }
        // Size and position the label to fill the button (AFTER text, so size overrides text)
        const buttonSize = spec.size;
        if (buttonSize && buttonSize.length === 2) {
            await this.setProp(labelUuid, 'cc.UITransform', 'contentSize', 'size', { width: buttonSize[0], height: buttonSize[1] }, ctx);
        }
        const posResult = await this.nodeTools.execute('node_transform', {
            action: 'set_transform',
            uuid: labelUuid,
            position: { x: 0, y: 0, z: 0 },
        });
        if (!posResult.success) {
            ctx.warnings.push(`${spec.name} label position: ${(_e = posResult.error) !== null && _e !== void 0 ? _e : 'unknown error'}`);
        }
    }
    async buildEditboxChildren(editboxUuid, spec, ctx) {
        var _a, _b, _c, _d, _e;
        const props = (_a = spec.props) !== null && _a !== void 0 ? _a : {};
        const size = spec.size;
        const w = size && size.length === 2 ? size[0] : 200;
        const h = size && size.length === 2 ? size[1] : 40;
        const childW = w - 2;
        const childH = h;
        const fontSize = props.fontSize !== undefined ? Number(props.fontSize) : 20;
        // Create TEXT_LABEL child (inactive by default, shown when typing)
        const createTextLabel = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'TEXT_LABEL',
            parentUuid: editboxUuid,
        });
        if (!createTextLabel.success || !((_b = createTextLabel.data) === null || _b === void 0 ? void 0 : _b.uuid)) {
            ctx.warnings.push(`${spec.name} TEXT_LABEL: ${(_c = createTextLabel.error) !== null && _c !== void 0 ? _c : 'unknown error'}`);
            return;
        }
        const textLabelNodeUuid = createTextLabel.data.uuid;
        ctx.createdNodeUuids.push(textLabelNodeUuid);
        for (const ct of ['cc.UITransform', 'cc.Label']) {
            await this.componentTools.execute('component_manage', { action: 'add', nodeUuid: textLabelNodeUuid, componentType: ct });
        }
        await this.setProp(textLabelNodeUuid, 'cc.UITransform', 'contentSize', 'size', { width: childW, height: childH }, ctx);
        await this.setProp(textLabelNodeUuid, 'cc.UITransform', 'anchorPoint', 'vec2', { x: 0, y: 1 }, ctx);
        await this.setProp(textLabelNodeUuid, 'cc.Label', 'overflow', 'integer', 1, ctx); // CLAMP
        await this.setProp(textLabelNodeUuid, 'cc.Label', 'horizontalAlign', 'integer', 0, ctx); // LEFT
        await this.setProp(textLabelNodeUuid, 'cc.Label', 'verticalAlign', 'integer', 1, ctx); // CENTER
        await this.setProp(textLabelNodeUuid, 'cc.Label', 'fontSize', 'number', fontSize, ctx);
        await this.setProp(textLabelNodeUuid, 'cc.Label', 'enableWrapText', 'boolean', false, ctx);
        // Set textLabel inactive until user starts typing
        await this.nodeTools.execute('node_transform', { action: 'set_property', uuid: textLabelNodeUuid, property: 'active', value: false });
        // Create PLACEHOLDER_LABEL child
        const createPHLabel = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'PLACEHOLDER_LABEL',
            parentUuid: editboxUuid,
        });
        if (!createPHLabel.success || !((_d = createPHLabel.data) === null || _d === void 0 ? void 0 : _d.uuid)) {
            ctx.warnings.push(`${spec.name} PLACEHOLDER_LABEL: ${(_e = createPHLabel.error) !== null && _e !== void 0 ? _e : 'unknown error'}`);
            return;
        }
        const phLabelNodeUuid = createPHLabel.data.uuid;
        ctx.createdNodeUuids.push(phLabelNodeUuid);
        for (const ct of ['cc.UITransform', 'cc.Label']) {
            await this.componentTools.execute('component_manage', { action: 'add', nodeUuid: phLabelNodeUuid, componentType: ct });
        }
        await this.setProp(phLabelNodeUuid, 'cc.UITransform', 'contentSize', 'size', { width: childW, height: childH }, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.UITransform', 'anchorPoint', 'vec2', { x: 0, y: 1 }, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'overflow', 'integer', 1, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'horizontalAlign', 'integer', 0, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'verticalAlign', 'integer', 1, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'fontSize', 'number', fontSize, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'enableWrapText', 'boolean', false, ctx);
        await this.setProp(phLabelNodeUuid, 'cc.Label', 'color', 'color', { r: 187, g: 187, b: 187, a: 255 }, ctx);
        if (props.placeholder !== undefined) {
            await this.setProp(phLabelNodeUuid, 'cc.Label', 'string', 'string', String(props.placeholder), ctx);
        }
        await Promise.all([
            this.setProp(editboxUuid, 'cc.EditBox', 'textLabel', 'component', textLabelNodeUuid, ctx),
            this.setProp(editboxUuid, 'cc.EditBox', 'placeholderLabel', 'component', phLabelNodeUuid, ctx),
        ]);
    }
    async applySemanticProps(uuid, spec, ctx) {
        var _a;
        const type = spec.type;
        const props = (_a = spec.props) !== null && _a !== void 0 ? _a : {};
        if (type === 'Label' && props.text !== undefined) {
            await this.setProp(uuid, 'cc.Label', 'string', 'string', String(props.text), ctx);
        }
        if (type === 'Label' && props.fontSize !== undefined) {
            await this.setProp(uuid, 'cc.Label', 'fontSize', 'number', Number(props.fontSize), ctx);
        }
        if (type === 'Label' && props.color) {
            await this.setProp(uuid, 'cc.Label', 'color', 'color', this.normalizeColor(props.color), ctx);
        }
        // Panel/Image: apply color to cc.Sprite only (not Button — Button color goes to Label child)
        if ((type === 'Panel' || type === 'Image') && props.color) {
            await this.setProp(uuid, 'cc.Sprite', 'color', 'color', this.normalizeColor(props.color), ctx);
        }
        // Button component (cc.Button) properties
        if (type === 'Button') {
            const tMap = { NONE: 0, COLOR: 1, SPRITE: 2, SCALE: 3 };
            // Default to SCALE like the Cocos Creator editor template
            const tVal = props.transition ? tMap[props.transition] : tMap.SCALE;
            if (tVal !== undefined) {
                await this.setProp(uuid, 'cc.Button', 'transition', 'integer', tVal, ctx);
            }
            if (props.normalColor) {
                await this.setProp(uuid, 'cc.Button', 'normalColor', 'color', this.normalizeColor(props.normalColor), ctx);
            }
            if (props.pressedColor) {
                await this.setProp(uuid, 'cc.Button', 'pressedColor', 'color', this.normalizeColor(props.pressedColor), ctx);
            }
            if (props.hoverColor) {
                await this.setProp(uuid, 'cc.Button', 'hoverColor', 'color', this.normalizeColor(props.hoverColor), ctx);
            }
            if (props.disabledColor) {
                await this.setProp(uuid, 'cc.Button', 'disabledColor', 'color', this.normalizeColor(props.disabledColor), ctx);
            }
            if (props.duration !== undefined) {
                await this.setProp(uuid, 'cc.Button', 'duration', 'number', Number(props.duration), ctx);
            }
            if (props.zoomScale !== undefined) {
                await this.setProp(uuid, 'cc.Button', 'zoomScale', 'number', Number(props.zoomScale), ctx);
            }
            if (props.normalSprite) {
                await this.setProp(uuid, 'cc.Button', 'normalSprite', 'spriteFrame', await this.resolveAssetUuid(props.normalSprite), ctx);
            }
            if (props.pressedSprite) {
                await this.setProp(uuid, 'cc.Button', 'pressedSprite', 'spriteFrame', await this.resolveAssetUuid(props.pressedSprite), ctx);
            }
            if (props.hoverSprite) {
                await this.setProp(uuid, 'cc.Button', 'hoverSprite', 'spriteFrame', await this.resolveAssetUuid(props.hoverSprite), ctx);
            }
            if (props.disabledSprite) {
                await this.setProp(uuid, 'cc.Button', 'disabledSprite', 'spriteFrame', await this.resolveAssetUuid(props.disabledSprite), ctx);
            }
        }
        if (type === 'Input' && props.placeholder !== undefined) {
            await this.setProp(uuid, 'cc.EditBox', 'placeholder', 'string', String(props.placeholder), ctx);
        }
        if (type === 'Input' && props.text !== undefined) {
            await this.setProp(uuid, 'cc.EditBox', 'string', 'string', String(props.text), ctx);
        }
        if (type === 'Input' && props.inputMode !== undefined) {
            const imMap = { ANY: 0, EMAIL_ADDR: 1, NUMERIC: 2, PHONE_NUMBER: 3, URL: 4, DECIMAL: 5, SINGLE_LINE: 6 };
            const imVal = typeof props.inputMode === 'number' ? props.inputMode : imMap[String(props.inputMode)];
            if (imVal !== undefined) {
                await this.setProp(uuid, 'cc.EditBox', 'inputMode', 'integer', imVal, ctx);
            }
        }
        if (type === 'Input' && props.maxLength !== undefined) {
            await this.setProp(uuid, 'cc.EditBox', 'maxLength', 'number', Number(props.maxLength), ctx);
        }
        if (type === 'Input' && props.returnType !== undefined) {
            const rtMap = { DEFAULT: 0, DONE: 1, SEND: 2, SEARCH: 3, GO: 4, NEXT: 5 };
            const rtVal = typeof props.returnType === 'number' ? props.returnType : rtMap[String(props.returnType)];
            if (rtVal !== undefined) {
                await this.setProp(uuid, 'cc.EditBox', 'returnType', 'integer', rtVal, ctx);
            }
        }
        if (type === 'List' && props.layoutType) {
            const layoutValue = LAYOUT_TYPE_MAP[props.layoutType];
            if (layoutValue !== undefined) {
                await this.setProp(uuid, 'cc.Layout', 'type', 'integer', layoutValue, ctx);
            }
        }
    }
    async applyRawComponents(uuid, components, ctx) {
        var _a;
        if (!Array.isArray(components)) {
            return;
        }
        for (const comp of components) {
            if (!(comp === null || comp === void 0 ? void 0 : comp.type)) {
                ctx.warnings.push(`Raw component missing 'type' field; skipped`);
                continue;
            }
            const addResult = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: uuid,
                componentType: comp.type,
            });
            if (!addResult.success) {
                ctx.warnings.push(`add ${comp.type}: ${(_a = addResult.error) !== null && _a !== void 0 ? _a : 'unknown error'}`);
                continue;
            }
            if (comp.props && typeof comp.props === 'object') {
                for (const [property, value] of Object.entries(comp.props)) {
                    const propertyType = this.inferPropertyType(value);
                    const finalValue = propertyType === 'color' ? this.normalizeColor(value) : value;
                    await this.setProp(uuid, comp.type, property, propertyType, finalValue, ctx);
                }
            }
        }
    }
    async applyPreset(uuid, spec, ctx) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!spec.preset) {
            return;
        }
        const margins = (_a = spec.margins) !== null && _a !== void 0 ? _a : {};
        const spacing = (_b = spec.spacing) !== null && _b !== void 0 ? _b : {};
        const r = await this.componentTools.execute('ui_apply_responsive_defaults', {
            nodeUuid: uuid,
            preset: spec.preset,
            marginLeft: (_c = margins.left) !== null && _c !== void 0 ? _c : 0,
            marginRight: (_d = margins.right) !== null && _d !== void 0 ? _d : 0,
            marginTop: (_e = margins.top) !== null && _e !== void 0 ? _e : 0,
            marginBottom: (_f = margins.bottom) !== null && _f !== void 0 ? _f : 0,
            spacingX: (_g = spacing.x) !== null && _g !== void 0 ? _g : 0,
            spacingY: (_h = spacing.y) !== null && _h !== void 0 ? _h : 0,
        });
        if (!r.success) {
            ctx.warnings.push(`${spec.name} preset '${spec.preset}': ${(_j = r.error) !== null && _j !== void 0 ? _j : 'unknown error'}`);
        }
    }
    async setProp(uuid, componentType, property, propertyType, value, ctx) {
        var _a;
        const r = await this.componentTools.execute('set_component_property', {
            nodeUuid: uuid,
            componentType,
            property,
            propertyType,
            value,
        });
        if (!r.success) {
            ctx.warnings.push(`${componentType}.${property}: ${(_a = r.error) !== null && _a !== void 0 ? _a : 'unknown error'}`);
        }
    }
    async resolveAssetUuid(ref) {
        var _a;
        if (!ref.startsWith('db://')) {
            return ref;
        }
        try {
            const uuid = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', ref);
            if (uuid) {
                return uuid;
            }
        }
        catch (error) {
            logger_1.logger.warn(`Failed to resolve asset '${ref}': ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`);
        }
        return ref;
    }
    normalizeColor(color) {
        var _a, _b, _c, _d;
        const c = (color !== null && color !== void 0 ? color : {});
        return {
            r: Number((_a = c.r) !== null && _a !== void 0 ? _a : 255),
            g: Number((_b = c.g) !== null && _b !== void 0 ? _b : 255),
            b: Number((_c = c.b) !== null && _c !== void 0 ? _c : 255),
            a: Number((_d = c.a) !== null && _d !== void 0 ? _d : 255),
        };
    }
    inferPropertyType(value) {
        if (typeof value === 'string') {
            return 'string';
        }
        if (typeof value === 'number') {
            return 'number';
        }
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (Array.isArray(value)) {
            return 'stringArray';
        }
        if (value && typeof value === 'object') {
            const o = value;
            if ('r' in o && 'g' in o && 'b' in o) {
                return 'color';
            }
            if ('width' in o && 'height' in o) {
                return 'size';
            }
            if ('x' in o && 'y' in o && 'z' in o) {
                return 'vec3';
            }
            if ('x' in o && 'y' in o) {
                return 'vec2';
            }
        }
        return 'string';
    }
    extractPrefabName(path) {
        const match = /([^/]+?)\.prefab$/.exec(path);
        return match === null || match === void 0 ? void 0 : match[1];
    }
}
exports.UIBuilderTools = UIBuilderTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy91aS1idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDBEQUE4RDtBQUM5RCw4Q0FPMEI7QUFDMUIsNkNBQXlDO0FBQ3pDLHVEQUFtRDtBQUNuRCxpREFBNkM7QUFDN0MsNERBQXdEO0FBQ3hELHNDQUFtQztBQUVuQyxNQUFNLGVBQWUsR0FBMkI7SUFDNUMsSUFBSSxFQUFFLENBQUM7SUFDUCxVQUFVLEVBQUUsQ0FBQztJQUNiLFFBQVEsRUFBRSxDQUFDO0lBQ1gsSUFBSSxFQUFFLENBQUM7Q0FDVixDQUFDO0FBT0YsTUFBYSxjQUFjO0lBQTNCO1FBQ1ksY0FBUyxHQUFHLElBQUksc0JBQVMsRUFBRSxDQUFDO1FBQzVCLG1CQUFjLEdBQUcsSUFBSSxnQ0FBYyxFQUFFLENBQUM7UUFDdEMsZ0JBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztJQWt2QjVDLENBQUM7SUFodkJHLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsV0FBVyxFQUNQLHNZQUFzWTtvQkFDdFkseUJBQXlCO29CQUN6QixzR0FBc0c7b0JBQ3RHLDZFQUE2RTtvQkFDN0UsNklBQTZJO29CQUM3SSxVQUFVO29CQUNWLG9PQUFvTztvQkFDcE8sNkdBQTZHO29CQUM3RyxvRkFBb0Y7b0JBQ3BGLHlHQUF5RztvQkFDekcsNkdBQTZHO29CQUM3RywyUEFBMlA7b0JBQzNQLHdLQUF3SztnQkFDNUssV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixJQUFJLEVBQUUsZ0NBQ0MsNkJBQW1CLEtBQ3RCLFdBQVcsRUFDUCxrUUFBa1EsR0FDbFE7d0JBQ1IsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxpREFBaUQ7eUJB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QztnQkFDdkIsT0FBTyxNQUFNLENBQUM7WUFDbEIsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0lBRU8saUJBQWlCLENBQUMsSUFBWTtRQUNsQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsT0FBTyxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNKO0FBcnZCRCx3Q0FxdkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgcmVzb2x2ZU5vZGVSZWZGaWVsZHMgfSBmcm9tICcuLi91dGlscy9ub2RlLXJlc29sdmVyJztcbmltcG9ydCB7XG4gICAgVUlTcGVjLFxuICAgIFVJU2VtYW50aWNUeXBlLFxuICAgIFVJQ29sb3IsXG4gICAgVUlXaWRnZXRTcGVjLFxuICAgIENvbXBvbmVudFNwZWMsXG4gICAgVUlfU1BFQ19KU09OX1NDSEVNQSxcbn0gZnJvbSAnLi4vdHlwZXMvdWktc3BlYyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi9sb2dnZXInO1xuXG5jb25zdCBMQVlPVVRfVFlQRV9NQVA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XG4gICAgTk9ORTogMCxcbiAgICBIT1JJWk9OVEFMOiAxLFxuICAgIFZFUlRJQ0FMOiAyLFxuICAgIEdSSUQ6IDMsXG59O1xuXG5pbnRlcmZhY2UgQnVpbGRDb250ZXh0IHtcbiAgICBjcmVhdGVkTm9kZVV1aWRzOiBzdHJpbmdbXTtcbiAgICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBVSUJ1aWxkZXJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBub2RlVG9vbHMgPSBuZXcgTm9kZVRvb2xzKCk7XG4gICAgcHJpdmF0ZSBjb21wb25lbnRUb29scyA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgIHByaXZhdGUgcHJlZmFiVG9vbHMgPSBuZXcgUHJlZmFiVG9vbHMoKTtcblxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd1aV9idWlsZF9mcm9tX3NwZWMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnQnVpbGQgYSBVSSBub2RlIGhpZXJhcmNoeSBkZWNsYXJhdGl2ZWx5IGZyb20gYSBVSVNwZWMgSlNPTiB0cmVlLiBFeHBhbmRzIHNlbWFudGljIHR5cGVzIChCdXR0b24sIExhYmVsLCBJbWFnZSwgUGFuZWwsIElucHV0LCBTY3JvbGxWaWV3LCBMaXN0KSBpbnRvIGNvbXBvbmVudCBjb21ib3MsIGFwcGxpZXMgcHJlc2V0cyAoZnVsbF9zdHJldGNoLCB0b3BfYmFyLCBib3R0b21fYmFyLCB2ZXJ0aWNhbF9saXN0LCBob3Jpem9udGFsX2xpc3QpLCBhbmQgc2V0cyBzaXplcy9hbmNob3JzL3Byb3BzIGluIGEgc2luZ2xlIGNhbGwuIE9wdGlvbmFsbHkgc2F2ZXMgdGhlIHJlc3VsdCBhcyBhIHByZWZhYi4gUmV0dXJucyByb290IFVVSUQgYW5kIGFsbCBjcmVhdGVkIG5vZGUgVVVJRHMuXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdXT1JLRkxPVyAobWFuZGF0b3J5KTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzEuIFNrZXRjaCB0aGUgVUlTcGVjIEpTT04gcGx1cyBhbiBBU0NJSSB0cmVlIHByZXZpZXcsIHRoZW4gYXNrIHRoZSB1c2VyIFwiT0sgdG8gYnVpbGQsIG9yIGFkanVzdD9cIi5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzIuIE9ubHkgYWZ0ZXIgdGhlIHVzZXIgY29uZmlybXMsIGNhbGwgdGhpcyB0b29sIE9OQ0Ugd2l0aCB0aGUgZmluYWwgc3BlYy5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzMuIERvIE5PVCB1c2Ugbm9kZV9saWZlY3ljbGUgLyBjb21wb25lbnRfbWFuYWdlIC8gc2V0X2NvbXBvbmVudF9wcm9wZXJ0eSB0byBidWlsZCBuZXcgVUkg4oCUIHRob3NlIGFyZSBmb3Igc21hbGwgZWRpdHMgb24gZXhpc3Rpbmcgbm9kZXMuXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdSVUxFUzpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gUHJlZmVyIHNlbWFudGljIGB0eXBlYCAoQnV0dG9uL0xhYmVsL0ltYWdlL1BhbmVsL0lucHV0L1Njcm9sbFZpZXcvTGlzdCkgb3ZlciByYXcgYGNvbXBvbmVudHNbXWAuIFVzZSBgY29tcG9uZW50c1tdYCBvbmx5IGZvciB0aGluZ3Mgd2l0aG91dCBhIHNlbWFudGljIGFsaWFzIChjYy5NYXNrLCBjYy5HcmFwaGljcywgY3VzdG9tIHNjcmlwdHMsIGNjLkJsb2NrSW5wdXRFdmVudHMsIC4uLikuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIFVzZSBgcHJlc2V0YCBmb3IgdGhlIDUgc3RhbmRhcmQgcmVzcG9uc2l2ZSBsYXlvdXRzOyBjb21iaW5lIHdpdGggYHdpZGdldGAgdG8gb3ZlcnJpZGUgaW5kaXZpZHVhbCBzaWRlcy5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gQXNzZXQgcGF0aHMgdXNlIGBkYjovL2Fzc2V0cy8uLi5gICh0aGUgdG9vbCByZXNvbHZlcyBVVUlEcyk7IGNvbG9ycyBhcmUgMOKAkzI1NS5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gRG8gbm90IG5lc3QgZGVlcGVyIHRoYW4gNiBsZXZlbHMg4oCUIHNwbGl0IGludG8gYSBzdWItcHJlZmFiIHZpYSBhIHNlcGFyYXRlIGNhbGwgd2l0aCBgc2F2ZUFzUHJlZmFiYC5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gRG8gbm90IGhhcmRjb2RlIGJ1c2luZXNzIGRhdGEgKHNwZWNpZmljIGl0ZW1zLCBwcmljZXMpOyBidWlsZCB0ZW1wbGF0ZXMgb25seSBhbmQgbGV0IHJ1bnRpbWUgZmlsbCBkYXRhLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBGb3IgU2Nyb2xsVmlldywganVzdCBkZWNsYXJlIGB0eXBlOiBcIlNjcm9sbFZpZXdcImAgKyBgc2Nyb2xsTGF5b3V0YDsgdGhlIHRvb2wgYnVpbGRzIHZpZXcrbWFzaytjb250ZW50K2xheW91dCBhbmQgd2lyZXMgYFNjcm9sbFZpZXcuY29udGVudGAuIENoaWxkcmVuIG9mIHRoZSBzcGVjIGFyZSByb3V0ZWQgaW50byB0aGUgY29udGVudCBub2RlIGF1dG9tYXRpY2FsbHkg4oCUIGRvIE5PVCBidWlsZCB0aGUgc2NhZmZvbGQgYnkgaGFuZC5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gV2hlbiB0aGUgdXNlciByZXF1ZXN0cyBhIHR3ZWFrIGFmdGVyIHRoZSBidWlsZCwgZWRpdCB0aGUgVUlTcGVjIEpTT04gYW5kIGNhbGwgdGhpcyB0b29sIGFnYWluIHJhdGhlciB0aGFuIHBhdGNoaW5nIG5vZGUtYnktbm9kZSwgdW5sZXNzIHRoZSBjaGFuZ2UgdG91Y2hlcyDiiaQzIG5vZGVzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwZWM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5VSV9TUEVDX0pTT05fU0NIRU1BLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVUlTcGVjIHRyZWUuIEVhY2ggbm9kZSBoYXM6IG5hbWUgKHJlcXVpcmVkKSwgb3B0aW9uYWwgdHlwZSAoc2VtYW50aWMgc2hvcnRjdXQpLCBwcmVzZXQsIHNpemUgW3csaF0sIGFuY2hvciBbeCx5XSwgcG9zaXRpb24gW3gseV0sIHByb3BzICh0ZXh0L2NvbG9yL2JhY2tncm91bmQvb25DbGljay9sYXlvdXRUeXBlKSwgY29tcG9uZW50c1tdIChlc2NhcGUgaGF0Y2ggZm9yIHJhdyBjYy4qIGNvbXBvbmVudHMpLCBjaGlsZHJlbltdIChyZWN1cnNpdmUpLicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIFVVSUQuIE9taXQgdG8gY3JlYXRlIGF0IHNjZW5lIHJvb3QuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlQXNQcmVmYWI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIHByZWZhYiBzYXZlIHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9TaG9wU2NyZWVuLnByZWZhYi4gSWYgc2V0LCB0aGUgYnVpbHQgcm9vdCBpcyBzYXZlZCBhcyBhIHByZWZhYiBhZnRlciBjb25zdHJ1Y3Rpb24uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NwZWMnXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICh0b29sTmFtZSAhPT0gJ3VpX2J1aWxkX2Zyb21fc3BlYycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBwYXJlbnQgbWF5IGJlIGdpdmVuIGFzIGEgcGF0aCBvciBhIG5hbWU7IHRoZSBlbmdpbmUgd2FudHMgYSBVVUlELlxuICAgICAgICBjb25zdCB1bnJlc29sdmVkID0gYXdhaXQgcmVzb2x2ZU5vZGVSZWZGaWVsZHMoYXJncywgWydwYXJlbnRVdWlkJ10pO1xuICAgICAgICBpZiAodW5yZXNvbHZlZCkgeyByZXR1cm4gdW5yZXNvbHZlZDsgfVxuICAgICAgICByZXR1cm4gdGhpcy5idWlsZEZyb21TcGVjKGFyZ3MpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRGcm9tU3BlYyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzcGVjOiBVSVNwZWMgfCB1bmRlZmluZWQgPSBhcmdzPy5zcGVjO1xuICAgICAgICBpZiAoIXNwZWMgfHwgdHlwZW9mIHNwZWMgIT09ICdvYmplY3QnIHx8ICFzcGVjLm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3Npbmcgb3IgaW52YWxpZCBzcGVjOiBhIFVJU3BlYyBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIFwibmFtZVwiIGZpZWxkIGlzIHJlcXVpcmVkLicgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN0eDogQnVpbGRDb250ZXh0ID0geyBjcmVhdGVkTm9kZVV1aWRzOiBbXSwgd2FybmluZ3M6IFtdIH07XG4gICAgICAgIGxldCBhdXRvRGV0ZWN0ZWRTaXplOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghc3BlYy5zaXplIHx8IHNwZWMuc2l6ZS5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUgPSBhd2FpdCB0aGlzLmZldGNoRGVzaWduUmVzb2x1dGlvbigpO1xuICAgICAgICAgICAgaWYgKGF1dG9EZXRlY3RlZFNpemUpIHtcbiAgICAgICAgICAgICAgICBzcGVjLnNpemUgPSBbYXV0b0RldGVjdGVkU2l6ZS53aWR0aCwgYXV0b0RldGVjdGVkU2l6ZS5oZWlnaHRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCByb290VXVpZDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcm9vdFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkTm9kZShzcGVjLCBhcmdzPy5wYXJlbnRVdWlkLCBjdHgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGJ1aWxkIFVJIHNwZWM6ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY3JlYXRlZE5vZGVVdWlkczogY3R4LmNyZWF0ZWROb2RlVXVpZHMsIHdhcm5pbmdzOiBjdHgud2FybmluZ3MgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZmFiUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXJncz8uc2F2ZUFzUHJlZmFiICYmIHR5cGVvZiBhcmdzLnNhdmVBc1ByZWZhYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBhcmdzLnNhdmVBc1ByZWZhYiBhcyBzdHJpbmc7XG4gICAgICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gdGhpcy5leHRyYWN0UHJlZmFiTmFtZShwYXRoKSA/PyBzcGVjLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBzYXZlUGF0aCA9IHBhdGguZW5kc1dpdGgoJy5wcmVmYWInKSA/IHBhdGggOiBgJHtwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7cHJlZmFiTmFtZX0ucHJlZmFiYDtcbiAgICAgICAgICAgIGNvbnN0IHByZWZhYlJlc3VsdCA9IGF3YWl0IHRoaXMucHJlZmFiVG9vbHMuZXhlY3V0ZSgncHJlZmFiX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiByb290VXVpZCxcbiAgICAgICAgICAgICAgICBzYXZlUGF0aCxcbiAgICAgICAgICAgICAgICBwcmVmYWJOYW1lLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHByZWZhYlJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aCA9IHNhdmVQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHNhdmUgcHJlZmFiIGF0ICR7c2F2ZVBhdGh9OiAke3ByZWZhYlJlc3VsdC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogISFyb290VXVpZCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBCdWlsdCBVSSAnJHtzcGVjLm5hbWV9JyB3aXRoICR7Y3R4LmNyZWF0ZWROb2RlVXVpZHMubGVuZ3RofSBub2RlKHMpJHtjdHgud2FybmluZ3MubGVuZ3RoID4gMCA/IGAgKCR7Y3R4Lndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyhzKSlgIDogJyd9YCxcbiAgICAgICAgICAgIHdhcm5pbmc6IGN0eC53YXJuaW5ncy5sZW5ndGggPiAwID8gY3R4Lndhcm5pbmdzLmpvaW4oJ1xcbicpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHJvb3RVdWlkLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWROb2RlVXVpZHM6IGN0eC5jcmVhdGVkTm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgIHByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgd2FybmluZ0NvdW50OiBjdHgud2FybmluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmV0Y2hEZXNpZ25SZXNvbHV0aW9uKCk6IFByb21pc2U8eyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9IHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb25maWc6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3Byb2plY3QnLCAncXVlcnktY29uZmlnJywgJ3Byb2plY3QnKTtcbiAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZXM6IEFycmF5PHsgd2lkdGg6IHVua25vd247IGhlaWdodDogdW5rbm93biB9IHwgdW5kZWZpbmVkPiA9IFtcbiAgICAgICAgICAgICAgICBjb25maWc/LnByZXZpZXc/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25fcmVzb2x1dGlvbixcbiAgICAgICAgICAgICAgICB7IHdpZHRoOiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl93aWR0aCwgaGVpZ2h0OiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl9oZWlnaHQgfSxcbiAgICAgICAgICAgICAgICBjb25maWc/LmdlbmVyYWw/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3ID0gTnVtYmVyKGM/LndpZHRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoID0gTnVtYmVyKGM/LmhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh3KSAmJiBOdW1iZXIuaXNGaW5pdGUoaCkgJiYgdyA+IDAgJiYgaCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgd2lkdGg6IHcsIGhlaWdodDogaCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oYHVpLWJ1aWxkZXI6IGZhaWxlZCB0byBmZXRjaCBkZXNpZ24gcmVzb2x1dGlvbjogJHtlcnJvcj8ubWVzc2FnZSA/PyBlcnJvcn1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGROb2RlKHNwZWM6IFVJU3BlYywgcGFyZW50VXVpZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGlmICghc3BlYy5uYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZXJ5IFVJU3BlYyBub2RlIG11c3QgaGF2ZSBhIG5hbWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNyZWF0ZVJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6IHNwZWMubmFtZSxcbiAgICAgICAgICAgIHBhcmVudFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNyZWF0ZVJlc3VsdC5zdWNjZXNzIHx8ICFjcmVhdGVSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIG5vZGUgJyR7c3BlYy5uYW1lfSc6ICR7Y3JlYXRlUmVzdWx0LmVycm9yID8/ICdubyB1dWlkIHJldHVybmVkJ31gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1dWlkOiBzdHJpbmcgPSBjcmVhdGVSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiB0aGlzLmNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUoc3BlYy50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgYWRkUmVzdWx0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFhZGRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gYWRkICR7Y29tcG9uZW50VHlwZX06ICR7YWRkUmVzdWx0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlTcHJpdGVGcmFtZURlZmF1bHQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVRyYW5zZm9ybUJhc2ljcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5U2VtYW50aWNQcm9wcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5UmF3Q29tcG9uZW50cyh1dWlkLCBzcGVjLmNvbXBvbmVudHMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlQcmVzZXQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVdpZGdldE92ZXJyaWRlKHV1aWQsIHNwZWMsIGN0eCk7XG5cbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ0J1dHRvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnVpbGRCdXR0b25MYWJlbENoaWxkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3BlYy50eXBlID09PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkRWRpdGJveENoaWxkcmVuKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3BlYy5hY3RpdmUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2V0X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAnYWN0aXZlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZmFsc2UsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfS5hY3RpdmU9ZmFsc2U6ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2hpbGRQYXJlbnRVdWlkID0gdXVpZDtcbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ1Njcm9sbFZpZXcnKSB7XG4gICAgICAgICAgICBjaGlsZFBhcmVudFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzcGVjLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzcGVjLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5idWlsZE5vZGUoY2hpbGQsIGNoaWxkUGFyZW50VXVpZCwgY3R4KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBDaGlsZCAnJHtjaGlsZD8ubmFtZSA/PyAnPHVubmFtZWQ+J30nIHVuZGVyICcke3NwZWMubmFtZX0nOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHV1aWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVdpZGdldE92ZXJyaWRlKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB3aWRnZXQ6IFVJV2lkZ2V0U3BlYyB8IHVuZGVmaW5lZCA9IHNwZWMud2lkZ2V0O1xuICAgICAgICBpZiAoIXdpZGdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuc3VyZWQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuV2lkZ2V0JyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZW5zdXJlZC5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGVuc3VyZSBjYy5XaWRnZXQ6ICR7ZW5zdXJlZC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmllbGRzOiBBcnJheTxba2V5b2YgVUlXaWRnZXRTcGVjLCBzdHJpbmcsIHN0cmluZ10+ID0gW1xuICAgICAgICAgICAgWyd0b3AnLCAnaXNBbGlnblRvcCcsICd0b3AnXSxcbiAgICAgICAgICAgIFsnYm90dG9tJywgJ2lzQWxpZ25Cb3R0b20nLCAnYm90dG9tJ10sXG4gICAgICAgICAgICBbJ2xlZnQnLCAnaXNBbGlnbkxlZnQnLCAnbGVmdCddLFxuICAgICAgICAgICAgWydyaWdodCcsICdpc0FsaWduUmlnaHQnLCAncmlnaHQnXSxcbiAgICAgICAgICAgIFsnaG9yaXpvbnRhbENlbnRlcicsICdpc0FsaWduSG9yaXpvbnRhbENlbnRlcicsICdob3Jpem9udGFsQ2VudGVyJ10sXG4gICAgICAgICAgICBbJ3ZlcnRpY2FsQ2VudGVyJywgJ2lzQWxpZ25WZXJ0aWNhbENlbnRlcicsICd2ZXJ0aWNhbENlbnRlciddLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IFtzcGVjRmllbGQsIGFsaWduRmxhZywgdmFsdWVGaWVsZF0gb2YgZmllbGRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gd2lkZ2V0W3NwZWNGaWVsZF07XG4gICAgICAgICAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCBhbGlnbkZsYWcsICdib29sZWFuJywgdHJ1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLldpZGdldCcsIHZhbHVlRmllbGQsICdudW1iZXInLCB2LCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3aWRnZXQuYWxpZ25Nb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IE9OQ0U6IDAsIE9OX1dJTkRPV19SRVNJWkU6IDEsIEFMV0FZUzogMiB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCAnYWxpZ25Nb2RlJywgJ2ludGVnZXInLCBtYXBbd2lkZ2V0LmFsaWduTW9kZV0sIGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHJvb3RVdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCB2aWV3UmVzdWx0ID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ3ZpZXcnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogcm9vdFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXZpZXdSZXN1bHQuc3VjY2VzcyB8fCAhdmlld1Jlc3VsdC5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IFNjcm9sbFZpZXc6IGZhaWxlZCB0byBjcmVhdGUgdmlldyBub2RlYCk7XG4gICAgICAgICAgICByZXR1cm4gcm9vdFV1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgdmlld1V1aWQ6IHN0cmluZyA9IHZpZXdSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHZpZXdVdWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudFR5cGUgb2YgWydjYy5VSVRyYW5zZm9ybScsICdjYy5NYXNrJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdmlld1V1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHZpZXcgYWRkICR7Y29tcG9uZW50VHlwZX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCd1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzJywge1xuICAgICAgICAgICAgbm9kZVV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICAgICAgcHJlc2V0OiAnZnVsbF9zdHJldGNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdjb250ZW50JyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjb250ZW50UmVzdWx0LnN1Y2Nlc3MgfHwgIWNvbnRlbnRSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBTY3JvbGxWaWV3OiBmYWlsZWQgdG8gY3JlYXRlIGNvbnRlbnQgbm9kZWApO1xuICAgICAgICAgICAgcmV0dXJuIHZpZXdVdWlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRlbnRVdWlkOiBzdHJpbmcgPSBjb250ZW50UmVzdWx0LmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChjb250ZW50VXVpZCk7XG5cbiAgICAgICAgY29uc3QgZW5zdXJlQ29udGVudCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICBub2RlVXVpZDogY29udGVudFV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuVUlUcmFuc2Zvcm0nLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFlbnN1cmVDb250ZW50LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gY29udGVudCBhZGQgY2MuVUlUcmFuc2Zvcm06ICR7ZW5zdXJlQ29udGVudC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzY3JvbGxMYXlvdXQgPSBzcGVjLnNjcm9sbExheW91dDtcbiAgICAgICAgaWYgKHNjcm9sbExheW91dCkge1xuICAgICAgICAgICAgY29uc3QgZW5zdXJlTGF5b3V0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IGNvbnRlbnRVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5MYXlvdXQnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWVuc3VyZUxheW91dC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBjb250ZW50IGFkZCBjYy5MYXlvdXQ6ICR7ZW5zdXJlTGF5b3V0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxheW91dFR5cGUgPSBzY3JvbGxMYXlvdXQgPT09ICdob3Jpem9udGFsJyA/IDEgOiBzY3JvbGxMYXlvdXQgPT09ICdncmlkJyA/IDMgOiAyO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGNvbnRlbnRVdWlkLCAnY2MuTGF5b3V0JywgJ3R5cGUnLCAnaW50ZWdlcicsIGxheW91dFR5cGUsIGN0eCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AoY29udGVudFV1aWQsICdjYy5MYXlvdXQnLCAncmVzaXplTW9kZScsICdpbnRlZ2VyJywgMSwgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnY29udGVudCcsICdub2RlJywgY29udGVudFV1aWQsIGN0eCk7XG5cbiAgICAgICAgY29uc3QgaXNIb3Jpem9udGFsID0gc2Nyb2xsTGF5b3V0ID09PSAnaG9yaXpvbnRhbCc7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnaG9yaXpvbnRhbCcsICdib29sZWFuJywgaXNIb3Jpem9udGFsLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3Aocm9vdFV1aWQsICdjYy5TY3JvbGxWaWV3JywgJ3ZlcnRpY2FsJywgJ2Jvb2xlYW4nLCAhaXNIb3Jpem9udGFsLCBjdHgpO1xuXG4gICAgICAgIHJldHVybiBjb250ZW50VXVpZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUodHlwZTogVUlTZW1hbnRpY1R5cGUgfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnUGFuZWwnOlxuICAgICAgICAgICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZSddO1xuICAgICAgICAgICAgY2FzZSAnTGFiZWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ107XG4gICAgICAgICAgICBjYXNlICdCdXR0b24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZScsICdjYy5CdXR0b24nXTtcbiAgICAgICAgICAgIGNhc2UgJ0lucHV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5TcHJpdGUnLCAnY2MuRWRpdEJveCddO1xuICAgICAgICAgICAgY2FzZSAnU2Nyb2xsVmlldyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuU2Nyb2xsVmlldyddO1xuICAgICAgICAgICAgY2FzZSAnTGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGF5b3V0J107XG4gICAgICAgICAgICBjYXNlICdOb2RlJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlUcmFuc2Zvcm1CYXNpY3ModXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChzcGVjLnNpemUgJiYgc3BlYy5zaXplLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3dpZHRoLCBoZWlnaHRdID0gc3BlYy5zaXplO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJywgeyB3aWR0aCwgaGVpZ2h0IH0sIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuYW5jaG9yICYmIHNwZWMuYW5jaG9yLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5hbmNob3I7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2FuY2hvclBvaW50JywgJ3ZlYzInLCB7IHgsIHkgfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlYy5wb3NpdGlvbiAmJiBzcGVjLnBvc2l0aW9uLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5wb3NpdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXRfdHJhbnNmb3JtJyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHgsIHksIHo6IDAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9LnBvc2l0aW9uOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVNwcml0ZUZyYW1lRGVmYXVsdCh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHNwZWMudHlwZTtcbiAgICAgICAgaWYgKHR5cGUgIT09ICdQYW5lbCcgJiYgdHlwZSAhPT0gJ0ltYWdlJyAmJiB0eXBlICE9PSAnQnV0dG9uJyAmJiB0eXBlICE9PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIEJ1dHRvbi9JbnB1dCB0eXBlLCBhbHdheXMgc2V0IFNwcml0ZSB0eXBlIHRvIFNMSUNFRCBmb3IgcHJvcGVyIDktc2xpY2Ugc2NhbGluZ1xuICAgICAgICBpZiAodHlwZSA9PT0gJ0J1dHRvbicgfHwgdHlwZSA9PT0gJ0lucHV0Jykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAndHlwZScsICdpbnRlZ2VyJywgMSwgY3R4KTsgLy8gU0xJQ0VEXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZCA9IHNwZWMucHJvcHM/LmJhY2tncm91bmQ7XG4gICAgICAgIGlmIChiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlNwcml0ZScsICdzcHJpdGVGcmFtZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChiYWNrZ3JvdW5kKSwgY3R4KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBubyBiYWNrZ3JvdW5kIHByb3ZpZGVkIGZvciBCdXR0b24gdHlwZSwgc2V0IHRoZSBpbnRlcm5hbCBkZWZhdWx0IGJ1dHRvbiBzcHJpdGVzXG4gICAgICAgIGlmICh0eXBlID09PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsVXJsID0gJ2RiOi8vaW50ZXJuYWwvZGVmYXVsdF91aS9kZWZhdWx0X2J0bl9ub3JtYWwucG5nJztcbiAgICAgICAgICAgIGNvbnN0IHByZXNzZWRVcmwgPSAnZGI6Ly9pbnRlcm5hbC9kZWZhdWx0X3VpL2RlZmF1bHRfYnRuX3ByZXNzZWQucG5nJztcbiAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkVXJsID0gJ2RiOi8vaW50ZXJuYWwvZGVmYXVsdF91aS9kZWZhdWx0X2J0bl9kaXNhYmxlZC5wbmcnO1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsVXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChub3JtYWxVcmwpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAnc3ByaXRlRnJhbWUnLCAnc3ByaXRlRnJhbWUnLCBub3JtYWxVdWlkLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnbm9ybWFsU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgbm9ybWFsVXVpZCwgY3R4KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgbm9ybWFsVXVpZCwgY3R4KTtcbiAgICAgICAgICAgIGNvbnN0IHByZXNzZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByZXNzZWRVcmwpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAncHJlc3NlZFNwcml0ZScsICdzcHJpdGVGcmFtZScsIHByZXNzZWRVdWlkLCBjdHgpO1xuICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKGRpc2FibGVkVXJsKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2Rpc2FibGVkU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgZGlzYWJsZWRVdWlkLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIG5vIGJhY2tncm91bmQgcHJvdmlkZWQgZm9yIElucHV0IHR5cGUsIHNldCB0aGUgZGVmYXVsdCBlZGl0Ym94IGJhY2tncm91bmQgc3ByaXRlXG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICBjb25zdCBlZGl0Ym94VXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZCgnZGI6Ly9pbnRlcm5hbC9kZWZhdWx0X3VpL2RlZmF1bHRfZWRpdGJveF9iZy5wbmcnKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgJ3Nwcml0ZUZyYW1lJywgZWRpdGJveFV1aWQsIGN0eCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkVkaXRCb3gnLCAnYmFja2dyb3VuZEltYWdlJywgJ3Nwcml0ZUZyYW1lJywgZWRpdGJveFV1aWQsIGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkQnV0dG9uTGFiZWxDaGlsZChidXR0b25VdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzcGVjLnByb3BzID8/IHt9O1xuICAgICAgICBpZiAocHJvcHMudGV4dCA9PT0gdW5kZWZpbmVkICYmIHByb3BzLmZvbnRTaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjcmVhdGUgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiAnTGFiZWwnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogYnV0dG9uVXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlLnN1Y2Nlc3MgfHwgIWNyZWF0ZS5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGJ1dHRvbiBsYWJlbCBjaGlsZDogJHtjcmVhdGUuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxhYmVsVXVpZDogc3RyaW5nID0gY3JlYXRlLmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChsYWJlbFV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogbGFiZWxVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBsYWJlbCBhZGQgJHtjb21wb25lbnRUeXBlfTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBvdmVyZmxvdyB0byBDTEFNUCBmaXJzdCBzbyB0ZXh0IGNoYW5nZXMgZG9uJ3QgYXV0by1yZXNpemUgdGhlIG5vZGVcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ292ZXJmbG93JywgJ2ludGVnZXInLCAxLCBjdHgpOyAvLyBDTEFNUFxuXG4gICAgICAgIGlmIChwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy5mb250U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmZvbnRTaXplKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuY29sb3IpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIExhYmVsIGFsaWdubWVudCAoQnV0dG9uIHR5cGUgb25seSlcbiAgICAgICAgaWYgKHByb3BzLmxhYmVsQWxpZ25Ib3Jpem9udGFsKSB7XG4gICAgICAgICAgICBjb25zdCBoTWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBMRUZUOiAwLCBDRU5URVI6IDEsIFJJR0hUOiAyIH07XG4gICAgICAgICAgICBjb25zdCBoVmFsID0gaE1hcFtwcm9wcy5sYWJlbEFsaWduSG9yaXpvbnRhbF07XG4gICAgICAgICAgICBpZiAoaFZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ2hvcml6b250YWxBbGlnbicsICdpbnRlZ2VyJywgaFZhbCwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMubGFiZWxBbGlnblZlcnRpY2FsKSB7XG4gICAgICAgICAgICBjb25zdCB2TWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBUT1A6IDAsIENFTlRFUjogMSwgQk9UVE9NOiAyIH07XG4gICAgICAgICAgICBjb25zdCB2VmFsID0gdk1hcFtwcm9wcy5sYWJlbEFsaWduVmVydGljYWxdO1xuICAgICAgICAgICAgaWYgKHZWYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCB2VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2l6ZSBhbmQgcG9zaXRpb24gdGhlIGxhYmVsIHRvIGZpbGwgdGhlIGJ1dHRvbiAoQUZURVIgdGV4dCwgc28gc2l6ZSBvdmVycmlkZXMgdGV4dClcbiAgICAgICAgY29uc3QgYnV0dG9uU2l6ZSA9IHNwZWMuc2l6ZTtcbiAgICAgICAgaWYgKGJ1dHRvblNpemUgJiYgYnV0dG9uU2l6ZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJyxcbiAgICAgICAgICAgICAgICB7IHdpZHRoOiBidXR0b25TaXplWzBdLCBoZWlnaHQ6IGJ1dHRvblNpemVbMV0gfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwb3NSZXN1bHQgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ3NldF90cmFuc2Zvcm0nLFxuICAgICAgICAgICAgdXVpZDogbGFiZWxVdWlkLFxuICAgICAgICAgICAgcG9zaXRpb246IHsgeDogMCwgeTogMCwgejogMCB9LFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFwb3NSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBsYWJlbCBwb3NpdGlvbjogJHtwb3NSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZEVkaXRib3hDaGlsZHJlbihlZGl0Ym94VXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb3BzID0gc3BlYy5wcm9wcyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHNwZWMuc2l6ZTtcbiAgICAgICAgY29uc3QgdyA9IHNpemUgJiYgc2l6ZS5sZW5ndGggPT09IDIgPyBzaXplWzBdIDogMjAwO1xuICAgICAgICBjb25zdCBoID0gc2l6ZSAmJiBzaXplLmxlbmd0aCA9PT0gMiA/IHNpemVbMV0gOiA0MDtcbiAgICAgICAgY29uc3QgY2hpbGRXID0gdyAtIDI7XG4gICAgICAgIGNvbnN0IGNoaWxkSCA9IGg7XG4gICAgICAgIGNvbnN0IGZvbnRTaXplID0gcHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCA/IE51bWJlcihwcm9wcy5mb250U2l6ZSkgOiAyMDtcblxuICAgICAgICAvLyBDcmVhdGUgVEVYVF9MQUJFTCBjaGlsZCAoaW5hY3RpdmUgYnkgZGVmYXVsdCwgc2hvd24gd2hlbiB0eXBpbmcpXG4gICAgICAgIGNvbnN0IGNyZWF0ZVRleHRMYWJlbCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdURVhUX0xBQkVMJyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IGVkaXRib3hVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjcmVhdGVUZXh0TGFiZWwuc3VjY2VzcyB8fCAhY3JlYXRlVGV4dExhYmVsLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gVEVYVF9MQUJFTDogJHtjcmVhdGVUZXh0TGFiZWwuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHRMYWJlbE5vZGVVdWlkOiBzdHJpbmcgPSBjcmVhdGVUZXh0TGFiZWwuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHRleHRMYWJlbE5vZGVVdWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGN0IG9mIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGFiZWwnXSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywgeyBhY3Rpb246ICdhZGQnLCBub2RlVXVpZDogdGV4dExhYmVsTm9kZVV1aWQsIGNvbXBvbmVudFR5cGU6IGN0IH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2NvbnRlbnRTaXplJywgJ3NpemUnLCB7IHdpZHRoOiBjaGlsZFcsIGhlaWdodDogY2hpbGRIIH0sIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2FuY2hvclBvaW50JywgJ3ZlYzInLCB7IHg6IDAsIHk6IDEgfSwgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHRleHRMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnb3ZlcmZsb3cnLCAnaW50ZWdlcicsIDEsIGN0eCk7IC8vIENMQU1QXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLkxhYmVsJywgJ2hvcml6b250YWxBbGlnbicsICdpbnRlZ2VyJywgMCwgY3R4KTsgLy8gTEVGVFxuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodGV4dExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCAxLCBjdHgpOyAvLyBDRU5URVJcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHRleHRMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgZm9udFNpemUsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLkxhYmVsJywgJ2VuYWJsZVdyYXBUZXh0JywgJ2Jvb2xlYW4nLCBmYWxzZSwgY3R4KTtcbiAgICAgICAgLy8gU2V0IHRleHRMYWJlbCBpbmFjdGl2ZSB1bnRpbCB1c2VyIHN0YXJ0cyB0eXBpbmdcbiAgICAgICAgYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7IGFjdGlvbjogJ3NldF9wcm9wZXJ0eScsIHV1aWQ6IHRleHRMYWJlbE5vZGVVdWlkLCBwcm9wZXJ0eTogJ2FjdGl2ZScsIHZhbHVlOiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgUExBQ0VIT0xERVJfTEFCRUwgY2hpbGRcbiAgICAgICAgY29uc3QgY3JlYXRlUEhMYWJlbCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdQTEFDRUhPTERFUl9MQUJFTCcsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiBlZGl0Ym94VXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlUEhMYWJlbC5zdWNjZXNzIHx8ICFjcmVhdGVQSExhYmVsLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gUExBQ0VIT0xERVJfTEFCRUw6ICR7Y3JlYXRlUEhMYWJlbC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGhMYWJlbE5vZGVVdWlkOiBzdHJpbmcgPSBjcmVhdGVQSExhYmVsLmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChwaExhYmVsTm9kZVV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY3Qgb2YgWydjYy5VSVRyYW5zZm9ybScsICdjYy5MYWJlbCddKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7IGFjdGlvbjogJ2FkZCcsIG5vZGVVdWlkOiBwaExhYmVsTm9kZVV1aWQsIGNvbXBvbmVudFR5cGU6IGN0IH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJywgeyB3aWR0aDogY2hpbGRXLCBoZWlnaHQ6IGNoaWxkSCB9LCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuVUlUcmFuc2Zvcm0nLCAnYW5jaG9yUG9pbnQnLCAndmVjMicsIHsgeDogMCwgeTogMSB9LCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnb3ZlcmZsb3cnLCAnaW50ZWdlcicsIDEsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdob3Jpem9udGFsQWxpZ24nLCAnaW50ZWdlcicsIDAsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCAxLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgZm9udFNpemUsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdlbmFibGVXcmFwVGV4dCcsICdib29sZWFuJywgZmFsc2UsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHsgcjogMTg3LCBnOiAxODcsIGI6IDE4NywgYTogMjU1IH0sIGN0eCk7XG4gICAgICAgIGlmIChwcm9wcy5wbGFjZWhvbGRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnc3RyaW5nJywgJ3N0cmluZycsIFN0cmluZyhwcm9wcy5wbGFjZWhvbGRlciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICB0aGlzLnNldFByb3AoZWRpdGJveFV1aWQsICdjYy5FZGl0Qm94JywgJ3RleHRMYWJlbCcsICdjb21wb25lbnQnLCB0ZXh0TGFiZWxOb2RlVXVpZCwgY3R4KSxcbiAgICAgICAgICAgIHRoaXMuc2V0UHJvcChlZGl0Ym94VXVpZCwgJ2NjLkVkaXRCb3gnLCAncGxhY2Vob2xkZXJMYWJlbCcsICdjb21wb25lbnQnLCBwaExhYmVsTm9kZVV1aWQsIGN0eCksXG4gICAgICAgIF0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlTZW1hbnRpY1Byb3BzKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0eXBlID0gc3BlYy50eXBlO1xuICAgICAgICBjb25zdCBwcm9wcyA9IHNwZWMucHJvcHMgPz8ge307XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYWJlbCcsICdmb250U2l6ZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuZm9udFNpemUpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnTGFiZWwnICYmIHByb3BzLmNvbG9yKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQYW5lbC9JbWFnZTogYXBwbHkgY29sb3IgdG8gY2MuU3ByaXRlIG9ubHkgKG5vdCBCdXR0b24g4oCUIEJ1dHRvbiBjb2xvciBnb2VzIHRvIExhYmVsIGNoaWxkKVxuICAgICAgICBpZiAoKHR5cGUgPT09ICdQYW5lbCcgfHwgdHlwZSA9PT0gJ0ltYWdlJykgJiYgcHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdXR0b24gY29tcG9uZW50IChjYy5CdXR0b24pIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKHR5cGUgPT09ICdCdXR0b24nKSB7XG4gICAgICAgICAgICBjb25zdCB0TWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBOT05FOiAwLCBDT0xPUjogMSwgU1BSSVRFOiAyLCBTQ0FMRTogMyB9O1xuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBTQ0FMRSBsaWtlIHRoZSBDb2NvcyBDcmVhdG9yIGVkaXRvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgdFZhbCA9IHByb3BzLnRyYW5zaXRpb24gPyB0TWFwW3Byb3BzLnRyYW5zaXRpb25dIDogdE1hcC5TQ0FMRTtcbiAgICAgICAgICAgIGlmICh0VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICd0cmFuc2l0aW9uJywgJ2ludGVnZXInLCB0VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3BzLm5vcm1hbENvbG9yKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnbm9ybWFsQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLm5vcm1hbENvbG9yKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5wcmVzc2VkQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdwcmVzc2VkQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLnByZXNzZWRDb2xvciksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuaG92ZXJDb2xvcikge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLmhvdmVyQ29sb3IpLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3BzLmRpc2FibGVkQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdkaXNhYmxlZENvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5kaXNhYmxlZENvbG9yKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5kdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnZHVyYXRpb24nLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmR1cmF0aW9uKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy56b29tU2NhbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ3pvb21TY2FsZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuem9vbVNjYWxlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5ub3JtYWxTcHJpdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdub3JtYWxTcHJpdGUnLCAnc3ByaXRlRnJhbWUnLCBhd2FpdCB0aGlzLnJlc29sdmVBc3NldFV1aWQocHJvcHMubm9ybWFsU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5wcmVzc2VkU3ByaXRlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAncHJlc3NlZFNwcml0ZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChwcm9wcy5wcmVzc2VkU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5ob3ZlclNwcml0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByb3BzLmhvdmVyU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5kaXNhYmxlZFNwcml0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2Rpc2FibGVkU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByb3BzLmRpc2FibGVkU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnBsYWNlaG9sZGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdwbGFjZWhvbGRlcicsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMucGxhY2Vob2xkZXIpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMuaW5wdXRNb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGltTWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBBTlk6IDAsIEVNQUlMX0FERFI6IDEsIE5VTUVSSUM6IDIsIFBIT05FX05VTUJFUjogMywgVVJMOiA0LCBERUNJTUFMOiA1LCBTSU5HTEVfTElORTogNiB9O1xuICAgICAgICAgICAgY29uc3QgaW1WYWwgPSB0eXBlb2YgcHJvcHMuaW5wdXRNb2RlID09PSAnbnVtYmVyJyA/IHByb3BzLmlucHV0TW9kZSA6IGltTWFwW1N0cmluZyhwcm9wcy5pbnB1dE1vZGUpXTtcbiAgICAgICAgICAgIGlmIChpbVZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ2lucHV0TW9kZScsICdpbnRlZ2VyJywgaW1WYWwsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMubWF4TGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdtYXhMZW5ndGgnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLm1heExlbmd0aCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMucmV0dXJuVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBydE1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHsgREVGQVVMVDogMCwgRE9ORTogMSwgU0VORDogMiwgU0VBUkNIOiAzLCBHTzogNCwgTkVYVDogNSB9O1xuICAgICAgICAgICAgY29uc3QgcnRWYWwgPSB0eXBlb2YgcHJvcHMucmV0dXJuVHlwZSA9PT0gJ251bWJlcicgPyBwcm9wcy5yZXR1cm5UeXBlIDogcnRNYXBbU3RyaW5nKHByb3BzLnJldHVyblR5cGUpXTtcbiAgICAgICAgICAgIGlmIChydFZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ3JldHVyblR5cGUnLCAnaW50ZWdlcicsIHJ0VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMaXN0JyAmJiBwcm9wcy5sYXlvdXRUeXBlKSB7XG4gICAgICAgICAgICBjb25zdCBsYXlvdXRWYWx1ZSA9IExBWU9VVF9UWVBFX01BUFtwcm9wcy5sYXlvdXRUeXBlXTtcbiAgICAgICAgICAgIGlmIChsYXlvdXRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYXlvdXQnLCAndHlwZScsICdpbnRlZ2VyJywgbGF5b3V0VmFsdWUsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UmF3Q29tcG9uZW50cyh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudHM6IENvbXBvbmVudFNwZWNbXSB8IHVuZGVmaW5lZCwgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBvbmVudHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGlmICghY29tcD8udHlwZSkge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBSYXcgY29tcG9uZW50IG1pc3NpbmcgJ3R5cGUnIGZpZWxkOyBza2lwcGVkYCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLnR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgYWRkICR7Y29tcC50eXBlfTogJHthZGRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbXAucHJvcHMgJiYgdHlwZW9mIGNvbXAucHJvcHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcGVydHksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb21wLnByb3BzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVR5cGUgPSB0aGlzLmluZmVyUHJvcGVydHlUeXBlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxWYWx1ZSA9IHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyA/IHRoaXMubm9ybWFsaXplQ29sb3IodmFsdWUgYXMgVUlDb2xvcikgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsIGNvbXAudHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgZmluYWxWYWx1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UHJlc2V0KHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXNwZWMucHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFyZ2lucyA9IHNwZWMubWFyZ2lucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IHNwZWMuc3BhY2luZyA/PyB7fTtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgcHJlc2V0OiBzcGVjLnByZXNldCxcbiAgICAgICAgICAgIG1hcmdpbkxlZnQ6IG1hcmdpbnMubGVmdCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IG1hcmdpbnMucmlnaHQgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpblRvcDogbWFyZ2lucy50b3AgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogbWFyZ2lucy5ib3R0b20gPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdYOiBzcGFjaW5nLnggPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdZOiBzcGFjaW5nLnkgPz8gMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHByZXNldCAnJHtzcGVjLnByZXNldH0nOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wKFxuICAgICAgICB1dWlkOiBzdHJpbmcsXG4gICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHk6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHlUeXBlOiBzdHJpbmcsXG4gICAgICAgIHZhbHVlOiB1bmtub3duLFxuICAgICAgICBjdHg6IEJ1aWxkQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBc3NldFV1aWQocmVmOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoIXJlZi5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVmO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHJlZik7XG4gICAgICAgICAgICBpZiAodXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1dWlkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVzb2x2ZSBhc3NldCAnJHtyZWZ9JzogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWY7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVDb2xvcihjb2xvcjogVUlDb2xvciB8IHVua25vd24pOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYyA9IChjb2xvciA/PyB7fSkgYXMgUGFydGlhbDxVSUNvbG9yPjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHI6IE51bWJlcihjLnIgPz8gMjU1KSxcbiAgICAgICAgICAgIGc6IE51bWJlcihjLmcgPz8gMjU1KSxcbiAgICAgICAgICAgIGI6IE51bWJlcihjLmIgPz8gMjU1KSxcbiAgICAgICAgICAgIGE6IE51bWJlcihjLmEgPz8gMjU1KSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluZmVyUHJvcGVydHlUeXBlKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nQXJyYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBvID0gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICBpZiAoJ3InIGluIG8gJiYgJ2cnIGluIG8gJiYgJ2InIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgnd2lkdGgnIGluIG8gJiYgJ2hlaWdodCcgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc2l6ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJ3gnIGluIG8gJiYgJ3knIGluIG8gJiYgJ3onIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlYzMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCd4JyBpbiBvICYmICd5JyBpbiBvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd2ZWMyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJlZmFiTmFtZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vXSs/KVxcLnByZWZhYiQvLmV4ZWMocGF0aCk7XG4gICAgICAgIHJldHVybiBtYXRjaD8uWzFdO1xuICAgIH1cbn1cbiJdfQ==