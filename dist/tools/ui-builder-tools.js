"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIBuilderTools = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy91aS1idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhDQU8wQjtBQUMxQiw2Q0FBeUM7QUFDekMsdURBQW1EO0FBQ25ELGlEQUE2QztBQUM3Qyw0REFBd0Q7QUFDeEQsc0NBQW1DO0FBRW5DLE1BQU0sZUFBZSxHQUEyQjtJQUM1QyxJQUFJLEVBQUUsQ0FBQztJQUNQLFVBQVUsRUFBRSxDQUFDO0lBQ2IsUUFBUSxFQUFFLENBQUM7SUFDWCxJQUFJLEVBQUUsQ0FBQztDQUNWLENBQUM7QUFPRixNQUFhLGNBQWM7SUFBM0I7UUFDWSxjQUFTLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7UUFDNUIsbUJBQWMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztRQUN0QyxnQkFBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0lBK3VCNUMsQ0FBQztJQTd1QkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQ1Asc1lBQXNZO29CQUN0WSx5QkFBeUI7b0JBQ3pCLHNHQUFzRztvQkFDdEcsNkVBQTZFO29CQUM3RSw2SUFBNkk7b0JBQzdJLFVBQVU7b0JBQ1Ysb09BQW9PO29CQUNwTyw2R0FBNkc7b0JBQzdHLG9GQUFvRjtvQkFDcEYseUdBQXlHO29CQUN6Ryw2R0FBNkc7b0JBQzdHLDJQQUEyUDtvQkFDM1Asd0tBQXdLO2dCQUM1SyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxnQ0FDQyw2QkFBbUIsS0FDdEIsV0FBVyxFQUNQLGtRQUFrUSxHQUNsUTt3QkFDUixVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlEQUFpRDt5QkFDakU7d0JBQ0QsWUFB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S0FBSyxHQUFHLE9BQU8sS0FBSyxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDckcsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQy9FLENBQUM7UUFDTCxDQUFDO1FBQ0QsSUFBSSxJQUFJLEtBQUssT0FBTyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEQsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hHLENBQUM7UUFDRCxJQUFJLElBQUksS0FBSyxPQUFPLElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNyRCxNQUFNLEtBQUssR0FBMkIsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ2xHLE1BQU0sS0FBSyxHQUFHLE9BQU8sS0FBSyxDQUFDLFVBQVUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDeEcsSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sSUFB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QyxPQUFPLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQ0o7QUFsdkJELHdDQWt2QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQge1xuICAgIFVJU3BlYyxcbiAgICBVSVNlbWFudGljVHlwZSxcbiAgICBVSUNvbG9yLFxuICAgIFVJV2lkZ2V0U3BlYyxcbiAgICBDb21wb25lbnRTcGVjLFxuICAgIFVJX1NQRUNfSlNPTl9TQ0hFTUEsXG59IGZyb20gJy4uL3R5cGVzL3VpLXNwZWMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcblxuY29uc3QgTEFZT1VUX1RZUEVfTUFQOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xuICAgIE5PTkU6IDAsXG4gICAgSE9SSVpPTlRBTDogMSxcbiAgICBWRVJUSUNBTDogMixcbiAgICBHUklEOiAzLFxufTtcblxuaW50ZXJmYWNlIEJ1aWxkQ29udGV4dCB7XG4gICAgY3JlYXRlZE5vZGVVdWlkczogc3RyaW5nW107XG4gICAgd2FybmluZ3M6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgY2xhc3MgVUlCdWlsZGVyVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIHByaXZhdGUgbm9kZVRvb2xzID0gbmV3IE5vZGVUb29scygpO1xuICAgIHByaXZhdGUgY29tcG9uZW50VG9vbHMgPSBuZXcgQ29tcG9uZW50VG9vbHMoKTtcbiAgICBwcml2YXRlIHByZWZhYlRvb2xzID0gbmV3IFByZWZhYlRvb2xzKCk7XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAndWlfYnVpbGRfZnJvbV9zcGVjJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0J1aWxkIGEgVUkgbm9kZSBoaWVyYXJjaHkgZGVjbGFyYXRpdmVseSBmcm9tIGEgVUlTcGVjIEpTT04gdHJlZS4gRXhwYW5kcyBzZW1hbnRpYyB0eXBlcyAoQnV0dG9uLCBMYWJlbCwgSW1hZ2UsIFBhbmVsLCBJbnB1dCwgU2Nyb2xsVmlldywgTGlzdCkgaW50byBjb21wb25lbnQgY29tYm9zLCBhcHBsaWVzIHByZXNldHMgKGZ1bGxfc3RyZXRjaCwgdG9wX2JhciwgYm90dG9tX2JhciwgdmVydGljYWxfbGlzdCwgaG9yaXpvbnRhbF9saXN0KSwgYW5kIHNldHMgc2l6ZXMvYW5jaG9ycy9wcm9wcyBpbiBhIHNpbmdsZSBjYWxsLiBPcHRpb25hbGx5IHNhdmVzIHRoZSByZXN1bHQgYXMgYSBwcmVmYWIuIFJldHVybnMgcm9vdCBVVUlEIGFuZCBhbGwgY3JlYXRlZCBub2RlIFVVSURzLlxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnV09SS0ZMT1cgKG1hbmRhdG9yeSk6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcxLiBTa2V0Y2ggdGhlIFVJU3BlYyBKU09OIHBsdXMgYW4gQVNDSUkgdHJlZSBwcmV2aWV3LCB0aGVuIGFzayB0aGUgdXNlciBcIk9LIHRvIGJ1aWxkLCBvciBhZGp1c3Q/XCIuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICcyLiBPbmx5IGFmdGVyIHRoZSB1c2VyIGNvbmZpcm1zLCBjYWxsIHRoaXMgdG9vbCBPTkNFIHdpdGggdGhlIGZpbmFsIHNwZWMuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICczLiBEbyBOT1QgdXNlIG5vZGVfbGlmZWN5Y2xlIC8gY29tcG9uZW50X21hbmFnZSAvIHNldF9jb21wb25lbnRfcHJvcGVydHkgdG8gYnVpbGQgbmV3IFVJIOKAlCB0aG9zZSBhcmUgZm9yIHNtYWxsIGVkaXRzIG9uIGV4aXN0aW5nIG5vZGVzLlxcblxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnUlVMRVM6XFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIFByZWZlciBzZW1hbnRpYyBgdHlwZWAgKEJ1dHRvbi9MYWJlbC9JbWFnZS9QYW5lbC9JbnB1dC9TY3JvbGxWaWV3L0xpc3QpIG92ZXIgcmF3IGBjb21wb25lbnRzW11gLiBVc2UgYGNvbXBvbmVudHNbXWAgb25seSBmb3IgdGhpbmdzIHdpdGhvdXQgYSBzZW1hbnRpYyBhbGlhcyAoY2MuTWFzaywgY2MuR3JhcGhpY3MsIGN1c3RvbSBzY3JpcHRzLCBjYy5CbG9ja0lucHV0RXZlbnRzLCAuLi4pLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBVc2UgYHByZXNldGAgZm9yIHRoZSA1IHN0YW5kYXJkIHJlc3BvbnNpdmUgbGF5b3V0czsgY29tYmluZSB3aXRoIGB3aWRnZXRgIHRvIG92ZXJyaWRlIGluZGl2aWR1YWwgc2lkZXMuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIEFzc2V0IHBhdGhzIHVzZSBgZGI6Ly9hc3NldHMvLi4uYCAodGhlIHRvb2wgcmVzb2x2ZXMgVVVJRHMpOyBjb2xvcnMgYXJlIDDigJMyNTUuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIERvIG5vdCBuZXN0IGRlZXBlciB0aGFuIDYgbGV2ZWxzIOKAlCBzcGxpdCBpbnRvIGEgc3ViLXByZWZhYiB2aWEgYSBzZXBhcmF0ZSBjYWxsIHdpdGggYHNhdmVBc1ByZWZhYmAuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIERvIG5vdCBoYXJkY29kZSBidXNpbmVzcyBkYXRhIChzcGVjaWZpYyBpdGVtcywgcHJpY2VzKTsgYnVpbGQgdGVtcGxhdGVzIG9ubHkgYW5kIGxldCBydW50aW1lIGZpbGwgZGF0YS5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gRm9yIFNjcm9sbFZpZXcsIGp1c3QgZGVjbGFyZSBgdHlwZTogXCJTY3JvbGxWaWV3XCJgICsgYHNjcm9sbExheW91dGA7IHRoZSB0b29sIGJ1aWxkcyB2aWV3K21hc2srY29udGVudCtsYXlvdXQgYW5kIHdpcmVzIGBTY3JvbGxWaWV3LmNvbnRlbnRgLiBDaGlsZHJlbiBvZiB0aGUgc3BlYyBhcmUgcm91dGVkIGludG8gdGhlIGNvbnRlbnQgbm9kZSBhdXRvbWF0aWNhbGx5IOKAlCBkbyBOT1QgYnVpbGQgdGhlIHNjYWZmb2xkIGJ5IGhhbmQuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIFdoZW4gdGhlIHVzZXIgcmVxdWVzdHMgYSB0d2VhayBhZnRlciB0aGUgYnVpbGQsIGVkaXQgdGhlIFVJU3BlYyBKU09OIGFuZCBjYWxsIHRoaXMgdG9vbCBhZ2FpbiByYXRoZXIgdGhhbiBwYXRjaGluZyBub2RlLWJ5LW5vZGUsIHVubGVzcyB0aGUgY2hhbmdlIHRvdWNoZXMg4omkMyBub2Rlcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uVUlfU1BFQ19KU09OX1NDSEVNQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VJU3BlYyB0cmVlLiBFYWNoIG5vZGUgaGFzOiBuYW1lIChyZXF1aXJlZCksIG9wdGlvbmFsIHR5cGUgKHNlbWFudGljIHNob3J0Y3V0KSwgcHJlc2V0LCBzaXplIFt3LGhdLCBhbmNob3IgW3gseV0sIHBvc2l0aW9uIFt4LHldLCBwcm9wcyAodGV4dC9jb2xvci9iYWNrZ3JvdW5kL29uQ2xpY2svbGF5b3V0VHlwZSksIGNvbXBvbmVudHNbXSAoZXNjYXBlIGhhdGNoIGZvciByYXcgY2MuKiBjb21wb25lbnRzKSwgY2hpbGRyZW5bXSAocmVjdXJzaXZlKS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlELiBPbWl0IHRvIGNyZWF0ZSBhdCBzY2VuZSByb290LicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUFzUHJlZmFiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpb25hbCBwcmVmYWIgc2F2ZSBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMvU2hvcFNjcmVlbi5wcmVmYWIuIElmIHNldCwgdGhlIGJ1aWx0IHJvb3QgaXMgc2F2ZWQgYXMgYSBwcmVmYWIgYWZ0ZXIgY29uc3RydWN0aW9uLicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydzcGVjJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAodG9vbE5hbWUgIT09ICd1aV9idWlsZF9mcm9tX3NwZWMnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5idWlsZEZyb21TcGVjKGFyZ3MpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRGcm9tU3BlYyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzcGVjOiBVSVNwZWMgfCB1bmRlZmluZWQgPSBhcmdzPy5zcGVjO1xuICAgICAgICBpZiAoIXNwZWMgfHwgdHlwZW9mIHNwZWMgIT09ICdvYmplY3QnIHx8ICFzcGVjLm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3Npbmcgb3IgaW52YWxpZCBzcGVjOiBhIFVJU3BlYyBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIFwibmFtZVwiIGZpZWxkIGlzIHJlcXVpcmVkLicgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN0eDogQnVpbGRDb250ZXh0ID0geyBjcmVhdGVkTm9kZVV1aWRzOiBbXSwgd2FybmluZ3M6IFtdIH07XG4gICAgICAgIGxldCBhdXRvRGV0ZWN0ZWRTaXplOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghc3BlYy5zaXplIHx8IHNwZWMuc2l6ZS5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUgPSBhd2FpdCB0aGlzLmZldGNoRGVzaWduUmVzb2x1dGlvbigpO1xuICAgICAgICAgICAgaWYgKGF1dG9EZXRlY3RlZFNpemUpIHtcbiAgICAgICAgICAgICAgICBzcGVjLnNpemUgPSBbYXV0b0RldGVjdGVkU2l6ZS53aWR0aCwgYXV0b0RldGVjdGVkU2l6ZS5oZWlnaHRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCByb290VXVpZDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcm9vdFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkTm9kZShzcGVjLCBhcmdzPy5wYXJlbnRVdWlkLCBjdHgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGJ1aWxkIFVJIHNwZWM6ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY3JlYXRlZE5vZGVVdWlkczogY3R4LmNyZWF0ZWROb2RlVXVpZHMsIHdhcm5pbmdzOiBjdHgud2FybmluZ3MgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZmFiUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXJncz8uc2F2ZUFzUHJlZmFiICYmIHR5cGVvZiBhcmdzLnNhdmVBc1ByZWZhYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBhcmdzLnNhdmVBc1ByZWZhYiBhcyBzdHJpbmc7XG4gICAgICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gdGhpcy5leHRyYWN0UHJlZmFiTmFtZShwYXRoKSA/PyBzcGVjLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBzYXZlUGF0aCA9IHBhdGguZW5kc1dpdGgoJy5wcmVmYWInKSA/IHBhdGggOiBgJHtwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7cHJlZmFiTmFtZX0ucHJlZmFiYDtcbiAgICAgICAgICAgIGNvbnN0IHByZWZhYlJlc3VsdCA9IGF3YWl0IHRoaXMucHJlZmFiVG9vbHMuZXhlY3V0ZSgncHJlZmFiX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiByb290VXVpZCxcbiAgICAgICAgICAgICAgICBzYXZlUGF0aCxcbiAgICAgICAgICAgICAgICBwcmVmYWJOYW1lLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHByZWZhYlJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aCA9IHNhdmVQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHNhdmUgcHJlZmFiIGF0ICR7c2F2ZVBhdGh9OiAke3ByZWZhYlJlc3VsdC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogISFyb290VXVpZCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBCdWlsdCBVSSAnJHtzcGVjLm5hbWV9JyB3aXRoICR7Y3R4LmNyZWF0ZWROb2RlVXVpZHMubGVuZ3RofSBub2RlKHMpJHtjdHgud2FybmluZ3MubGVuZ3RoID4gMCA/IGAgKCR7Y3R4Lndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyhzKSlgIDogJyd9YCxcbiAgICAgICAgICAgIHdhcm5pbmc6IGN0eC53YXJuaW5ncy5sZW5ndGggPiAwID8gY3R4Lndhcm5pbmdzLmpvaW4oJ1xcbicpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHJvb3RVdWlkLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWROb2RlVXVpZHM6IGN0eC5jcmVhdGVkTm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgIHByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgd2FybmluZ0NvdW50OiBjdHgud2FybmluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmV0Y2hEZXNpZ25SZXNvbHV0aW9uKCk6IFByb21pc2U8eyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9IHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb25maWc6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3Byb2plY3QnLCAncXVlcnktY29uZmlnJywgJ3Byb2plY3QnKTtcbiAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZXM6IEFycmF5PHsgd2lkdGg6IHVua25vd247IGhlaWdodDogdW5rbm93biB9IHwgdW5kZWZpbmVkPiA9IFtcbiAgICAgICAgICAgICAgICBjb25maWc/LnByZXZpZXc/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25fcmVzb2x1dGlvbixcbiAgICAgICAgICAgICAgICB7IHdpZHRoOiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl93aWR0aCwgaGVpZ2h0OiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl9oZWlnaHQgfSxcbiAgICAgICAgICAgICAgICBjb25maWc/LmdlbmVyYWw/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3ID0gTnVtYmVyKGM/LndpZHRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoID0gTnVtYmVyKGM/LmhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh3KSAmJiBOdW1iZXIuaXNGaW5pdGUoaCkgJiYgdyA+IDAgJiYgaCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgd2lkdGg6IHcsIGhlaWdodDogaCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oYHVpLWJ1aWxkZXI6IGZhaWxlZCB0byBmZXRjaCBkZXNpZ24gcmVzb2x1dGlvbjogJHtlcnJvcj8ubWVzc2FnZSA/PyBlcnJvcn1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGROb2RlKHNwZWM6IFVJU3BlYywgcGFyZW50VXVpZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGlmICghc3BlYy5uYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZXJ5IFVJU3BlYyBub2RlIG11c3QgaGF2ZSBhIG5hbWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNyZWF0ZVJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6IHNwZWMubmFtZSxcbiAgICAgICAgICAgIHBhcmVudFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNyZWF0ZVJlc3VsdC5zdWNjZXNzIHx8ICFjcmVhdGVSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIG5vZGUgJyR7c3BlYy5uYW1lfSc6ICR7Y3JlYXRlUmVzdWx0LmVycm9yID8/ICdubyB1dWlkIHJldHVybmVkJ31gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1dWlkOiBzdHJpbmcgPSBjcmVhdGVSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiB0aGlzLmNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUoc3BlYy50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgYWRkUmVzdWx0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFhZGRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gYWRkICR7Y29tcG9uZW50VHlwZX06ICR7YWRkUmVzdWx0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlTcHJpdGVGcmFtZURlZmF1bHQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVRyYW5zZm9ybUJhc2ljcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5U2VtYW50aWNQcm9wcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5UmF3Q29tcG9uZW50cyh1dWlkLCBzcGVjLmNvbXBvbmVudHMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlQcmVzZXQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVdpZGdldE92ZXJyaWRlKHV1aWQsIHNwZWMsIGN0eCk7XG5cbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ0J1dHRvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnVpbGRCdXR0b25MYWJlbENoaWxkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3BlYy50eXBlID09PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkRWRpdGJveENoaWxkcmVuKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3BlYy5hY3RpdmUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2V0X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAnYWN0aXZlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZmFsc2UsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfS5hY3RpdmU9ZmFsc2U6ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2hpbGRQYXJlbnRVdWlkID0gdXVpZDtcbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ1Njcm9sbFZpZXcnKSB7XG4gICAgICAgICAgICBjaGlsZFBhcmVudFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzcGVjLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzcGVjLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5idWlsZE5vZGUoY2hpbGQsIGNoaWxkUGFyZW50VXVpZCwgY3R4KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBDaGlsZCAnJHtjaGlsZD8ubmFtZSA/PyAnPHVubmFtZWQ+J30nIHVuZGVyICcke3NwZWMubmFtZX0nOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHV1aWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVdpZGdldE92ZXJyaWRlKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB3aWRnZXQ6IFVJV2lkZ2V0U3BlYyB8IHVuZGVmaW5lZCA9IHNwZWMud2lkZ2V0O1xuICAgICAgICBpZiAoIXdpZGdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuc3VyZWQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuV2lkZ2V0JyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZW5zdXJlZC5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGVuc3VyZSBjYy5XaWRnZXQ6ICR7ZW5zdXJlZC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmllbGRzOiBBcnJheTxba2V5b2YgVUlXaWRnZXRTcGVjLCBzdHJpbmcsIHN0cmluZ10+ID0gW1xuICAgICAgICAgICAgWyd0b3AnLCAnaXNBbGlnblRvcCcsICd0b3AnXSxcbiAgICAgICAgICAgIFsnYm90dG9tJywgJ2lzQWxpZ25Cb3R0b20nLCAnYm90dG9tJ10sXG4gICAgICAgICAgICBbJ2xlZnQnLCAnaXNBbGlnbkxlZnQnLCAnbGVmdCddLFxuICAgICAgICAgICAgWydyaWdodCcsICdpc0FsaWduUmlnaHQnLCAncmlnaHQnXSxcbiAgICAgICAgICAgIFsnaG9yaXpvbnRhbENlbnRlcicsICdpc0FsaWduSG9yaXpvbnRhbENlbnRlcicsICdob3Jpem9udGFsQ2VudGVyJ10sXG4gICAgICAgICAgICBbJ3ZlcnRpY2FsQ2VudGVyJywgJ2lzQWxpZ25WZXJ0aWNhbENlbnRlcicsICd2ZXJ0aWNhbENlbnRlciddLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IFtzcGVjRmllbGQsIGFsaWduRmxhZywgdmFsdWVGaWVsZF0gb2YgZmllbGRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gd2lkZ2V0W3NwZWNGaWVsZF07XG4gICAgICAgICAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCBhbGlnbkZsYWcsICdib29sZWFuJywgdHJ1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLldpZGdldCcsIHZhbHVlRmllbGQsICdudW1iZXInLCB2LCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3aWRnZXQuYWxpZ25Nb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IE9OQ0U6IDAsIE9OX1dJTkRPV19SRVNJWkU6IDEsIEFMV0FZUzogMiB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCAnYWxpZ25Nb2RlJywgJ2ludGVnZXInLCBtYXBbd2lkZ2V0LmFsaWduTW9kZV0sIGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHJvb3RVdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCB2aWV3UmVzdWx0ID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ3ZpZXcnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogcm9vdFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXZpZXdSZXN1bHQuc3VjY2VzcyB8fCAhdmlld1Jlc3VsdC5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IFNjcm9sbFZpZXc6IGZhaWxlZCB0byBjcmVhdGUgdmlldyBub2RlYCk7XG4gICAgICAgICAgICByZXR1cm4gcm9vdFV1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgdmlld1V1aWQ6IHN0cmluZyA9IHZpZXdSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHZpZXdVdWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudFR5cGUgb2YgWydjYy5VSVRyYW5zZm9ybScsICdjYy5NYXNrJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdmlld1V1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHZpZXcgYWRkICR7Y29tcG9uZW50VHlwZX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCd1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzJywge1xuICAgICAgICAgICAgbm9kZVV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICAgICAgcHJlc2V0OiAnZnVsbF9zdHJldGNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdjb250ZW50JyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjb250ZW50UmVzdWx0LnN1Y2Nlc3MgfHwgIWNvbnRlbnRSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBTY3JvbGxWaWV3OiBmYWlsZWQgdG8gY3JlYXRlIGNvbnRlbnQgbm9kZWApO1xuICAgICAgICAgICAgcmV0dXJuIHZpZXdVdWlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRlbnRVdWlkOiBzdHJpbmcgPSBjb250ZW50UmVzdWx0LmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChjb250ZW50VXVpZCk7XG5cbiAgICAgICAgY29uc3QgZW5zdXJlQ29udGVudCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICBub2RlVXVpZDogY29udGVudFV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuVUlUcmFuc2Zvcm0nLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFlbnN1cmVDb250ZW50LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gY29udGVudCBhZGQgY2MuVUlUcmFuc2Zvcm06ICR7ZW5zdXJlQ29udGVudC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzY3JvbGxMYXlvdXQgPSBzcGVjLnNjcm9sbExheW91dDtcbiAgICAgICAgaWYgKHNjcm9sbExheW91dCkge1xuICAgICAgICAgICAgY29uc3QgZW5zdXJlTGF5b3V0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IGNvbnRlbnRVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5MYXlvdXQnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWVuc3VyZUxheW91dC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBjb250ZW50IGFkZCBjYy5MYXlvdXQ6ICR7ZW5zdXJlTGF5b3V0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxheW91dFR5cGUgPSBzY3JvbGxMYXlvdXQgPT09ICdob3Jpem9udGFsJyA/IDEgOiBzY3JvbGxMYXlvdXQgPT09ICdncmlkJyA/IDMgOiAyO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGNvbnRlbnRVdWlkLCAnY2MuTGF5b3V0JywgJ3R5cGUnLCAnaW50ZWdlcicsIGxheW91dFR5cGUsIGN0eCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AoY29udGVudFV1aWQsICdjYy5MYXlvdXQnLCAncmVzaXplTW9kZScsICdpbnRlZ2VyJywgMSwgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnY29udGVudCcsICdub2RlJywgY29udGVudFV1aWQsIGN0eCk7XG5cbiAgICAgICAgY29uc3QgaXNIb3Jpem9udGFsID0gc2Nyb2xsTGF5b3V0ID09PSAnaG9yaXpvbnRhbCc7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnaG9yaXpvbnRhbCcsICdib29sZWFuJywgaXNIb3Jpem9udGFsLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3Aocm9vdFV1aWQsICdjYy5TY3JvbGxWaWV3JywgJ3ZlcnRpY2FsJywgJ2Jvb2xlYW4nLCAhaXNIb3Jpem9udGFsLCBjdHgpO1xuXG4gICAgICAgIHJldHVybiBjb250ZW50VXVpZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUodHlwZTogVUlTZW1hbnRpY1R5cGUgfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnUGFuZWwnOlxuICAgICAgICAgICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZSddO1xuICAgICAgICAgICAgY2FzZSAnTGFiZWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ107XG4gICAgICAgICAgICBjYXNlICdCdXR0b24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZScsICdjYy5CdXR0b24nXTtcbiAgICAgICAgICAgIGNhc2UgJ0lucHV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5TcHJpdGUnLCAnY2MuRWRpdEJveCddO1xuICAgICAgICAgICAgY2FzZSAnU2Nyb2xsVmlldyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuU2Nyb2xsVmlldyddO1xuICAgICAgICAgICAgY2FzZSAnTGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGF5b3V0J107XG4gICAgICAgICAgICBjYXNlICdOb2RlJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlUcmFuc2Zvcm1CYXNpY3ModXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChzcGVjLnNpemUgJiYgc3BlYy5zaXplLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3dpZHRoLCBoZWlnaHRdID0gc3BlYy5zaXplO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJywgeyB3aWR0aCwgaGVpZ2h0IH0sIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuYW5jaG9yICYmIHNwZWMuYW5jaG9yLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5hbmNob3I7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2FuY2hvclBvaW50JywgJ3ZlYzInLCB7IHgsIHkgfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlYy5wb3NpdGlvbiAmJiBzcGVjLnBvc2l0aW9uLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5wb3NpdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXRfdHJhbnNmb3JtJyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHgsIHksIHo6IDAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9LnBvc2l0aW9uOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVNwcml0ZUZyYW1lRGVmYXVsdCh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHNwZWMudHlwZTtcbiAgICAgICAgaWYgKHR5cGUgIT09ICdQYW5lbCcgJiYgdHlwZSAhPT0gJ0ltYWdlJyAmJiB0eXBlICE9PSAnQnV0dG9uJyAmJiB0eXBlICE9PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gRm9yIEJ1dHRvbi9JbnB1dCB0eXBlLCBhbHdheXMgc2V0IFNwcml0ZSB0eXBlIHRvIFNMSUNFRCBmb3IgcHJvcGVyIDktc2xpY2Ugc2NhbGluZ1xuICAgICAgICBpZiAodHlwZSA9PT0gJ0J1dHRvbicgfHwgdHlwZSA9PT0gJ0lucHV0Jykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAndHlwZScsICdpbnRlZ2VyJywgMSwgY3R4KTsgLy8gU0xJQ0VEXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZCA9IHNwZWMucHJvcHM/LmJhY2tncm91bmQ7XG4gICAgICAgIGlmIChiYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlNwcml0ZScsICdzcHJpdGVGcmFtZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChiYWNrZ3JvdW5kKSwgY3R4KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBubyBiYWNrZ3JvdW5kIHByb3ZpZGVkIGZvciBCdXR0b24gdHlwZSwgc2V0IHRoZSBpbnRlcm5hbCBkZWZhdWx0IGJ1dHRvbiBzcHJpdGVzXG4gICAgICAgIGlmICh0eXBlID09PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsVXJsID0gJ2RiOi8vaW50ZXJuYWwvZGVmYXVsdF91aS9kZWZhdWx0X2J0bl9ub3JtYWwucG5nJztcbiAgICAgICAgICAgIGNvbnN0IHByZXNzZWRVcmwgPSAnZGI6Ly9pbnRlcm5hbC9kZWZhdWx0X3VpL2RlZmF1bHRfYnRuX3ByZXNzZWQucG5nJztcbiAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkVXJsID0gJ2RiOi8vaW50ZXJuYWwvZGVmYXVsdF91aS9kZWZhdWx0X2J0bl9kaXNhYmxlZC5wbmcnO1xuICAgICAgICAgICAgY29uc3Qgbm9ybWFsVXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChub3JtYWxVcmwpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAnc3ByaXRlRnJhbWUnLCAnc3ByaXRlRnJhbWUnLCBub3JtYWxVdWlkLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnbm9ybWFsU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgbm9ybWFsVXVpZCwgY3R4KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgbm9ybWFsVXVpZCwgY3R4KTtcbiAgICAgICAgICAgIGNvbnN0IHByZXNzZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByZXNzZWRVcmwpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAncHJlc3NlZFNwcml0ZScsICdzcHJpdGVGcmFtZScsIHByZXNzZWRVdWlkLCBjdHgpO1xuICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRVdWlkID0gYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKGRpc2FibGVkVXJsKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2Rpc2FibGVkU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgZGlzYWJsZWRVdWlkLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIG5vIGJhY2tncm91bmQgcHJvdmlkZWQgZm9yIElucHV0IHR5cGUsIHNldCB0aGUgZGVmYXVsdCBlZGl0Ym94IGJhY2tncm91bmQgc3ByaXRlXG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnKSB7XG4gICAgICAgICAgICBjb25zdCBlZGl0Ym94VXVpZCA9IGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZCgnZGI6Ly9pbnRlcm5hbC9kZWZhdWx0X3VpL2RlZmF1bHRfZWRpdGJveF9iZy5wbmcnKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgJ3Nwcml0ZUZyYW1lJywgZWRpdGJveFV1aWQsIGN0eCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkVkaXRCb3gnLCAnYmFja2dyb3VuZEltYWdlJywgJ3Nwcml0ZUZyYW1lJywgZWRpdGJveFV1aWQsIGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkQnV0dG9uTGFiZWxDaGlsZChidXR0b25VdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzcGVjLnByb3BzID8/IHt9O1xuICAgICAgICBpZiAocHJvcHMudGV4dCA9PT0gdW5kZWZpbmVkICYmIHByb3BzLmZvbnRTaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjcmVhdGUgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiAnTGFiZWwnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogYnV0dG9uVXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlLnN1Y2Nlc3MgfHwgIWNyZWF0ZS5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGJ1dHRvbiBsYWJlbCBjaGlsZDogJHtjcmVhdGUuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxhYmVsVXVpZDogc3RyaW5nID0gY3JlYXRlLmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChsYWJlbFV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogbGFiZWxVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBsYWJlbCBhZGQgJHtjb21wb25lbnRUeXBlfTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBvdmVyZmxvdyB0byBDTEFNUCBmaXJzdCBzbyB0ZXh0IGNoYW5nZXMgZG9uJ3QgYXV0by1yZXNpemUgdGhlIG5vZGVcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ292ZXJmbG93JywgJ2ludGVnZXInLCAxLCBjdHgpOyAvLyBDTEFNUFxuXG4gICAgICAgIGlmIChwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy5mb250U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmZvbnRTaXplKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuY29sb3IpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIExhYmVsIGFsaWdubWVudCAoQnV0dG9uIHR5cGUgb25seSlcbiAgICAgICAgaWYgKHByb3BzLmxhYmVsQWxpZ25Ib3Jpem9udGFsKSB7XG4gICAgICAgICAgICBjb25zdCBoTWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBMRUZUOiAwLCBDRU5URVI6IDEsIFJJR0hUOiAyIH07XG4gICAgICAgICAgICBjb25zdCBoVmFsID0gaE1hcFtwcm9wcy5sYWJlbEFsaWduSG9yaXpvbnRhbF07XG4gICAgICAgICAgICBpZiAoaFZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ2hvcml6b250YWxBbGlnbicsICdpbnRlZ2VyJywgaFZhbCwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMubGFiZWxBbGlnblZlcnRpY2FsKSB7XG4gICAgICAgICAgICBjb25zdCB2TWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBUT1A6IDAsIENFTlRFUjogMSwgQk9UVE9NOiAyIH07XG4gICAgICAgICAgICBjb25zdCB2VmFsID0gdk1hcFtwcm9wcy5sYWJlbEFsaWduVmVydGljYWxdO1xuICAgICAgICAgICAgaWYgKHZWYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCB2VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2l6ZSBhbmQgcG9zaXRpb24gdGhlIGxhYmVsIHRvIGZpbGwgdGhlIGJ1dHRvbiAoQUZURVIgdGV4dCwgc28gc2l6ZSBvdmVycmlkZXMgdGV4dClcbiAgICAgICAgY29uc3QgYnV0dG9uU2l6ZSA9IHNwZWMuc2l6ZTtcbiAgICAgICAgaWYgKGJ1dHRvblNpemUgJiYgYnV0dG9uU2l6ZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJyxcbiAgICAgICAgICAgICAgICB7IHdpZHRoOiBidXR0b25TaXplWzBdLCBoZWlnaHQ6IGJ1dHRvblNpemVbMV0gfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwb3NSZXN1bHQgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ3NldF90cmFuc2Zvcm0nLFxuICAgICAgICAgICAgdXVpZDogbGFiZWxVdWlkLFxuICAgICAgICAgICAgcG9zaXRpb246IHsgeDogMCwgeTogMCwgejogMCB9LFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFwb3NSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBsYWJlbCBwb3NpdGlvbjogJHtwb3NSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZEVkaXRib3hDaGlsZHJlbihlZGl0Ym94VXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHByb3BzID0gc3BlYy5wcm9wcyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc2l6ZSA9IHNwZWMuc2l6ZTtcbiAgICAgICAgY29uc3QgdyA9IHNpemUgJiYgc2l6ZS5sZW5ndGggPT09IDIgPyBzaXplWzBdIDogMjAwO1xuICAgICAgICBjb25zdCBoID0gc2l6ZSAmJiBzaXplLmxlbmd0aCA9PT0gMiA/IHNpemVbMV0gOiA0MDtcbiAgICAgICAgY29uc3QgY2hpbGRXID0gdyAtIDI7XG4gICAgICAgIGNvbnN0IGNoaWxkSCA9IGg7XG4gICAgICAgIGNvbnN0IGZvbnRTaXplID0gcHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCA/IE51bWJlcihwcm9wcy5mb250U2l6ZSkgOiAyMDtcblxuICAgICAgICAvLyBDcmVhdGUgVEVYVF9MQUJFTCBjaGlsZCAoaW5hY3RpdmUgYnkgZGVmYXVsdCwgc2hvd24gd2hlbiB0eXBpbmcpXG4gICAgICAgIGNvbnN0IGNyZWF0ZVRleHRMYWJlbCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdURVhUX0xBQkVMJyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IGVkaXRib3hVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjcmVhdGVUZXh0TGFiZWwuc3VjY2VzcyB8fCAhY3JlYXRlVGV4dExhYmVsLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gVEVYVF9MQUJFTDogJHtjcmVhdGVUZXh0TGFiZWwuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHRMYWJlbE5vZGVVdWlkOiBzdHJpbmcgPSBjcmVhdGVUZXh0TGFiZWwuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHRleHRMYWJlbE5vZGVVdWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGN0IG9mIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGFiZWwnXSkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywgeyBhY3Rpb246ICdhZGQnLCBub2RlVXVpZDogdGV4dExhYmVsTm9kZVV1aWQsIGNvbXBvbmVudFR5cGU6IGN0IH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2NvbnRlbnRTaXplJywgJ3NpemUnLCB7IHdpZHRoOiBjaGlsZFcsIGhlaWdodDogY2hpbGRIIH0sIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2FuY2hvclBvaW50JywgJ3ZlYzInLCB7IHg6IDAsIHk6IDEgfSwgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHRleHRMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnb3ZlcmZsb3cnLCAnaW50ZWdlcicsIDEsIGN0eCk7IC8vIENMQU1QXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLkxhYmVsJywgJ2hvcml6b250YWxBbGlnbicsICdpbnRlZ2VyJywgMCwgY3R4KTsgLy8gTEVGVFxuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodGV4dExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCAxLCBjdHgpOyAvLyBDRU5URVJcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHRleHRMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgZm9udFNpemUsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh0ZXh0TGFiZWxOb2RlVXVpZCwgJ2NjLkxhYmVsJywgJ2VuYWJsZVdyYXBUZXh0JywgJ2Jvb2xlYW4nLCBmYWxzZSwgY3R4KTtcbiAgICAgICAgLy8gU2V0IHRleHRMYWJlbCBpbmFjdGl2ZSB1bnRpbCB1c2VyIHN0YXJ0cyB0eXBpbmdcbiAgICAgICAgYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7IGFjdGlvbjogJ3NldF9wcm9wZXJ0eScsIHV1aWQ6IHRleHRMYWJlbE5vZGVVdWlkLCBwcm9wZXJ0eTogJ2FjdGl2ZScsIHZhbHVlOiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgUExBQ0VIT0xERVJfTEFCRUwgY2hpbGRcbiAgICAgICAgY29uc3QgY3JlYXRlUEhMYWJlbCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdQTEFDRUhPTERFUl9MQUJFTCcsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiBlZGl0Ym94VXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlUEhMYWJlbC5zdWNjZXNzIHx8ICFjcmVhdGVQSExhYmVsLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gUExBQ0VIT0xERVJfTEFCRUw6ICR7Y3JlYXRlUEhMYWJlbC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGhMYWJlbE5vZGVVdWlkOiBzdHJpbmcgPSBjcmVhdGVQSExhYmVsLmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChwaExhYmVsTm9kZVV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY3Qgb2YgWydjYy5VSVRyYW5zZm9ybScsICdjYy5MYWJlbCddKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7IGFjdGlvbjogJ2FkZCcsIG5vZGVVdWlkOiBwaExhYmVsTm9kZVV1aWQsIGNvbXBvbmVudFR5cGU6IGN0IH0pO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJywgeyB3aWR0aDogY2hpbGRXLCBoZWlnaHQ6IGNoaWxkSCB9LCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuVUlUcmFuc2Zvcm0nLCAnYW5jaG9yUG9pbnQnLCAndmVjMicsIHsgeDogMCwgeTogMSB9LCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnb3ZlcmZsb3cnLCAnaW50ZWdlcicsIDEsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdob3Jpem9udGFsQWxpZ24nLCAnaW50ZWdlcicsIDAsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICd2ZXJ0aWNhbEFsaWduJywgJ2ludGVnZXInLCAxLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgZm9udFNpemUsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdlbmFibGVXcmFwVGV4dCcsICdib29sZWFuJywgZmFsc2UsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChwaExhYmVsTm9kZVV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHsgcjogMTg3LCBnOiAxODcsIGI6IDE4NywgYTogMjU1IH0sIGN0eCk7XG4gICAgICAgIGlmIChwcm9wcy5wbGFjZWhvbGRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AocGhMYWJlbE5vZGVVdWlkLCAnY2MuTGFiZWwnLCAnc3RyaW5nJywgJ3N0cmluZycsIFN0cmluZyhwcm9wcy5wbGFjZWhvbGRlciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICB0aGlzLnNldFByb3AoZWRpdGJveFV1aWQsICdjYy5FZGl0Qm94JywgJ3RleHRMYWJlbCcsICdjb21wb25lbnQnLCB0ZXh0TGFiZWxOb2RlVXVpZCwgY3R4KSxcbiAgICAgICAgICAgIHRoaXMuc2V0UHJvcChlZGl0Ym94VXVpZCwgJ2NjLkVkaXRCb3gnLCAncGxhY2Vob2xkZXJMYWJlbCcsICdjb21wb25lbnQnLCBwaExhYmVsTm9kZVV1aWQsIGN0eCksXG4gICAgICAgIF0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlTZW1hbnRpY1Byb3BzKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0eXBlID0gc3BlYy50eXBlO1xuICAgICAgICBjb25zdCBwcm9wcyA9IHNwZWMucHJvcHMgPz8ge307XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYWJlbCcsICdmb250U2l6ZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuZm9udFNpemUpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnTGFiZWwnICYmIHByb3BzLmNvbG9yKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQYW5lbC9JbWFnZTogYXBwbHkgY29sb3IgdG8gY2MuU3ByaXRlIG9ubHkgKG5vdCBCdXR0b24g4oCUIEJ1dHRvbiBjb2xvciBnb2VzIHRvIExhYmVsIGNoaWxkKVxuICAgICAgICBpZiAoKHR5cGUgPT09ICdQYW5lbCcgfHwgdHlwZSA9PT0gJ0ltYWdlJykgJiYgcHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdXR0b24gY29tcG9uZW50IChjYy5CdXR0b24pIHByb3BlcnRpZXNcbiAgICAgICAgaWYgKHR5cGUgPT09ICdCdXR0b24nKSB7XG4gICAgICAgICAgICBjb25zdCB0TWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBOT05FOiAwLCBDT0xPUjogMSwgU1BSSVRFOiAyLCBTQ0FMRTogMyB9O1xuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBTQ0FMRSBsaWtlIHRoZSBDb2NvcyBDcmVhdG9yIGVkaXRvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgdFZhbCA9IHByb3BzLnRyYW5zaXRpb24gPyB0TWFwW3Byb3BzLnRyYW5zaXRpb25dIDogdE1hcC5TQ0FMRTtcbiAgICAgICAgICAgIGlmICh0VmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICd0cmFuc2l0aW9uJywgJ2ludGVnZXInLCB0VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3BzLm5vcm1hbENvbG9yKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnbm9ybWFsQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLm5vcm1hbENvbG9yKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5wcmVzc2VkQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdwcmVzc2VkQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLnByZXNzZWRDb2xvciksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuaG92ZXJDb2xvcikge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyQ29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLmhvdmVyQ29sb3IpLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3BzLmRpc2FibGVkQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdkaXNhYmxlZENvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5kaXNhYmxlZENvbG9yKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5kdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnZHVyYXRpb24nLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmR1cmF0aW9uKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy56b29tU2NhbGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ3pvb21TY2FsZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuem9vbVNjYWxlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5ub3JtYWxTcHJpdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdub3JtYWxTcHJpdGUnLCAnc3ByaXRlRnJhbWUnLCBhd2FpdCB0aGlzLnJlc29sdmVBc3NldFV1aWQocHJvcHMubm9ybWFsU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5wcmVzc2VkU3ByaXRlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAncHJlc3NlZFNwcml0ZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChwcm9wcy5wcmVzc2VkU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5ob3ZlclNwcml0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2hvdmVyU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByb3BzLmhvdmVyU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5kaXNhYmxlZFNwcml0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2Rpc2FibGVkU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByb3BzLmRpc2FibGVkU3ByaXRlKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnBsYWNlaG9sZGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdwbGFjZWhvbGRlcicsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMucGxhY2Vob2xkZXIpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMuaW5wdXRNb2RlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGltTWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBBTlk6IDAsIEVNQUlMX0FERFI6IDEsIE5VTUVSSUM6IDIsIFBIT05FX05VTUJFUjogMywgVVJMOiA0LCBERUNJTUFMOiA1LCBTSU5HTEVfTElORTogNiB9O1xuICAgICAgICAgICAgY29uc3QgaW1WYWwgPSB0eXBlb2YgcHJvcHMuaW5wdXRNb2RlID09PSAnbnVtYmVyJyA/IHByb3BzLmlucHV0TW9kZSA6IGltTWFwW1N0cmluZyhwcm9wcy5pbnB1dE1vZGUpXTtcbiAgICAgICAgICAgIGlmIChpbVZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ2lucHV0TW9kZScsICdpbnRlZ2VyJywgaW1WYWwsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMubWF4TGVuZ3RoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdtYXhMZW5ndGgnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLm1heExlbmd0aCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdJbnB1dCcgJiYgcHJvcHMucmV0dXJuVHlwZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBydE1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHsgREVGQVVMVDogMCwgRE9ORTogMSwgU0VORDogMiwgU0VBUkNIOiAzLCBHTzogNCwgTkVYVDogNSB9O1xuICAgICAgICAgICAgY29uc3QgcnRWYWwgPSB0eXBlb2YgcHJvcHMucmV0dXJuVHlwZSA9PT0gJ251bWJlcicgPyBwcm9wcy5yZXR1cm5UeXBlIDogcnRNYXBbU3RyaW5nKHByb3BzLnJldHVyblR5cGUpXTtcbiAgICAgICAgICAgIGlmIChydFZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ3JldHVyblR5cGUnLCAnaW50ZWdlcicsIHJ0VmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMaXN0JyAmJiBwcm9wcy5sYXlvdXRUeXBlKSB7XG4gICAgICAgICAgICBjb25zdCBsYXlvdXRWYWx1ZSA9IExBWU9VVF9UWVBFX01BUFtwcm9wcy5sYXlvdXRUeXBlXTtcbiAgICAgICAgICAgIGlmIChsYXlvdXRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYXlvdXQnLCAndHlwZScsICdpbnRlZ2VyJywgbGF5b3V0VmFsdWUsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UmF3Q29tcG9uZW50cyh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudHM6IENvbXBvbmVudFNwZWNbXSB8IHVuZGVmaW5lZCwgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBvbmVudHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGlmICghY29tcD8udHlwZSkge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBSYXcgY29tcG9uZW50IG1pc3NpbmcgJ3R5cGUnIGZpZWxkOyBza2lwcGVkYCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLnR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgYWRkICR7Y29tcC50eXBlfTogJHthZGRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbXAucHJvcHMgJiYgdHlwZW9mIGNvbXAucHJvcHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcGVydHksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb21wLnByb3BzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVR5cGUgPSB0aGlzLmluZmVyUHJvcGVydHlUeXBlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxWYWx1ZSA9IHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyA/IHRoaXMubm9ybWFsaXplQ29sb3IodmFsdWUgYXMgVUlDb2xvcikgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsIGNvbXAudHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgZmluYWxWYWx1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UHJlc2V0KHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXNwZWMucHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFyZ2lucyA9IHNwZWMubWFyZ2lucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IHNwZWMuc3BhY2luZyA/PyB7fTtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgcHJlc2V0OiBzcGVjLnByZXNldCxcbiAgICAgICAgICAgIG1hcmdpbkxlZnQ6IG1hcmdpbnMubGVmdCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IG1hcmdpbnMucmlnaHQgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpblRvcDogbWFyZ2lucy50b3AgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogbWFyZ2lucy5ib3R0b20gPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdYOiBzcGFjaW5nLnggPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdZOiBzcGFjaW5nLnkgPz8gMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHByZXNldCAnJHtzcGVjLnByZXNldH0nOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wKFxuICAgICAgICB1dWlkOiBzdHJpbmcsXG4gICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHk6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHlUeXBlOiBzdHJpbmcsXG4gICAgICAgIHZhbHVlOiB1bmtub3duLFxuICAgICAgICBjdHg6IEJ1aWxkQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBc3NldFV1aWQocmVmOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoIXJlZi5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVmO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHJlZik7XG4gICAgICAgICAgICBpZiAodXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1dWlkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVzb2x2ZSBhc3NldCAnJHtyZWZ9JzogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWY7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVDb2xvcihjb2xvcjogVUlDb2xvciB8IHVua25vd24pOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYyA9IChjb2xvciA/PyB7fSkgYXMgUGFydGlhbDxVSUNvbG9yPjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHI6IE51bWJlcihjLnIgPz8gMjU1KSxcbiAgICAgICAgICAgIGc6IE51bWJlcihjLmcgPz8gMjU1KSxcbiAgICAgICAgICAgIGI6IE51bWJlcihjLmIgPz8gMjU1KSxcbiAgICAgICAgICAgIGE6IE51bWJlcihjLmEgPz8gMjU1KSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluZmVyUHJvcGVydHlUeXBlKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nQXJyYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBvID0gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICBpZiAoJ3InIGluIG8gJiYgJ2cnIGluIG8gJiYgJ2InIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgnd2lkdGgnIGluIG8gJiYgJ2hlaWdodCcgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc2l6ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJ3gnIGluIG8gJiYgJ3knIGluIG8gJiYgJ3onIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlYzMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCd4JyBpbiBvICYmICd5JyBpbiBvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd2ZWMyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJlZmFiTmFtZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vXSs/KVxcLnByZWZhYiQvLmV4ZWMocGF0aCk7XG4gICAgICAgIHJldHVybiBtYXRjaD8uWzFdO1xuICAgIH1cbn1cbiJdfQ==