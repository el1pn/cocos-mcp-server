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
                return ['cc.UITransform', 'cc.EditBox'];
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
        if (type !== 'Panel' && type !== 'Image' && type !== 'Button') {
            return;
        }
        // For Button type, always set Sprite type to SLICED for proper 9-slice scaling
        // (engine default is SIMPLE, but editor template uses SLICED for buttons)
        if (type === 'Button') {
            await this.setProp(uuid, 'cc.Sprite', 'type', 'integer', 1, ctx); // SLICED
        }
        const background = (_a = spec.props) === null || _a === void 0 ? void 0 : _a.background;
        if (!background) {
            return;
        }
        await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', await this.resolveAssetUuid(background), ctx);
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
        // Add cc.Widget to stretch the label to fill the entire button area
        const widgetResult = await this.componentTools.execute('component_manage', {
            action: 'add',
            nodeUuid: labelUuid,
            componentType: 'cc.Widget',
        });
        if (widgetResult.success) {
            await this.setProp(labelUuid, 'cc.Widget', 'isAlignTop', 'boolean', true, ctx);
            await this.setProp(labelUuid, 'cc.Widget', 'isAlignBottom', 'boolean', true, ctx);
            await this.setProp(labelUuid, 'cc.Widget', 'isAlignLeft', 'boolean', true, ctx);
            await this.setProp(labelUuid, 'cc.Widget', 'isAlignRight', 'boolean', true, ctx);
            await this.setProp(labelUuid, 'cc.Widget', 'alignMode', 'integer', 2, ctx); // ON_WINDOW_RESIZE
        }
        else {
            ctx.warnings.push(`${spec.name} label add cc.Widget: ${(_e = widgetResult.error) !== null && _e !== void 0 ? _e : 'unknown error'}`);
        }
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
            const uuid = await Editor.Message.request('asset-db', 'query-uuid', ref);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy91aS1idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhDQU8wQjtBQUMxQiw2Q0FBeUM7QUFDekMsdURBQW1EO0FBQ25ELGlEQUE2QztBQUM3Qyw0REFBd0Q7QUFDeEQsc0NBQW1DO0FBRW5DLE1BQU0sZUFBZSxHQUEyQjtJQUM1QyxJQUFJLEVBQUUsQ0FBQztJQUNQLFVBQVUsRUFBRSxDQUFDO0lBQ2IsUUFBUSxFQUFFLENBQUM7SUFDWCxJQUFJLEVBQUUsQ0FBQztDQUNWLENBQUM7QUFPRixNQUFhLGNBQWM7SUFBM0I7UUFDWSxjQUFTLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7UUFDNUIsbUJBQWMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztRQUN0QyxnQkFBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0lBZ29CNUMsQ0FBQztJQTluQkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQ1Asc1lBQXNZO29CQUN0WSx5QkFBeUI7b0JBQ3pCLHNHQUFzRztvQkFDdEcsNkVBQTZFO29CQUM3RSw2SUFBNkk7b0JBQzdJLFVBQVU7b0JBQ1Ysb09BQW9PO29CQUNwTyw2R0FBNkc7b0JBQzdHLG9GQUFvRjtvQkFDcEYseUdBQXlHO29CQUN6Ryw2R0FBNkc7b0JBQzdHLDJQQUEyUDtvQkFDM1Asd0tBQXdLO2dCQUM1SyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxnQ0FDQyw2QkFBbUIsS0FDdEIsV0FBVyxFQUNQLGtRQUFrUSxHQUNsUTt3QkFDUixVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlEQUFpRDt5QkFDakU7d0JBQ0QsWUFB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RSxDQUFDO2dCQUNuQyxPQUFPLE9BQU8sQ0FBQztZQUNuQixDQUFDO1lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxJQUFJLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsT0FBTyxNQUFNLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDbkMsT0FBTyxNQUFNLENBQUM7WUFDbEIsQ0FBQztZQUNELElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLE9BQU8sTUFBTSxDQUFDO1lBQ2xCLENBQUM7UUFDTCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUM7SUFDcEIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLElBQVk7UUFDbEMsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLE9BQU8sS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FDSjtBQW5vQkQsd0NBbW9CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7XG4gICAgVUlTcGVjLFxuICAgIFVJU2VtYW50aWNUeXBlLFxuICAgIFVJQ29sb3IsXG4gICAgVUlXaWRnZXRTcGVjLFxuICAgIENvbXBvbmVudFNwZWMsXG4gICAgVUlfU1BFQ19KU09OX1NDSEVNQSxcbn0gZnJvbSAnLi4vdHlwZXMvdWktc3BlYyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuLi9sb2dnZXInO1xuXG5jb25zdCBMQVlPVVRfVFlQRV9NQVA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XG4gICAgTk9ORTogMCxcbiAgICBIT1JJWk9OVEFMOiAxLFxuICAgIFZFUlRJQ0FMOiAyLFxuICAgIEdSSUQ6IDMsXG59O1xuXG5pbnRlcmZhY2UgQnVpbGRDb250ZXh0IHtcbiAgICBjcmVhdGVkTm9kZVV1aWRzOiBzdHJpbmdbXTtcbiAgICB3YXJuaW5nczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBVSUJ1aWxkZXJUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgcHJpdmF0ZSBub2RlVG9vbHMgPSBuZXcgTm9kZVRvb2xzKCk7XG4gICAgcHJpdmF0ZSBjb21wb25lbnRUb29scyA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgIHByaXZhdGUgcHJlZmFiVG9vbHMgPSBuZXcgUHJlZmFiVG9vbHMoKTtcblxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd1aV9idWlsZF9mcm9tX3NwZWMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnQnVpbGQgYSBVSSBub2RlIGhpZXJhcmNoeSBkZWNsYXJhdGl2ZWx5IGZyb20gYSBVSVNwZWMgSlNPTiB0cmVlLiBFeHBhbmRzIHNlbWFudGljIHR5cGVzIChCdXR0b24sIExhYmVsLCBJbWFnZSwgUGFuZWwsIElucHV0LCBTY3JvbGxWaWV3LCBMaXN0KSBpbnRvIGNvbXBvbmVudCBjb21ib3MsIGFwcGxpZXMgcHJlc2V0cyAoZnVsbF9zdHJldGNoLCB0b3BfYmFyLCBib3R0b21fYmFyLCB2ZXJ0aWNhbF9saXN0LCBob3Jpem9udGFsX2xpc3QpLCBhbmQgc2V0cyBzaXplcy9hbmNob3JzL3Byb3BzIGluIGEgc2luZ2xlIGNhbGwuIE9wdGlvbmFsbHkgc2F2ZXMgdGhlIHJlc3VsdCBhcyBhIHByZWZhYi4gUmV0dXJucyByb290IFVVSUQgYW5kIGFsbCBjcmVhdGVkIG5vZGUgVVVJRHMuXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdXT1JLRkxPVyAobWFuZGF0b3J5KTpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzEuIFNrZXRjaCB0aGUgVUlTcGVjIEpTT04gcGx1cyBhbiBBU0NJSSB0cmVlIHByZXZpZXcsIHRoZW4gYXNrIHRoZSB1c2VyIFwiT0sgdG8gYnVpbGQsIG9yIGFkanVzdD9cIi5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzIuIE9ubHkgYWZ0ZXIgdGhlIHVzZXIgY29uZmlybXMsIGNhbGwgdGhpcyB0b29sIE9OQ0Ugd2l0aCB0aGUgZmluYWwgc3BlYy5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJzMuIERvIE5PVCB1c2Ugbm9kZV9saWZlY3ljbGUgLyBjb21wb25lbnRfbWFuYWdlIC8gc2V0X2NvbXBvbmVudF9wcm9wZXJ0eSB0byBidWlsZCBuZXcgVUkg4oCUIHRob3NlIGFyZSBmb3Igc21hbGwgZWRpdHMgb24gZXhpc3Rpbmcgbm9kZXMuXFxuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICdSVUxFUzpcXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gUHJlZmVyIHNlbWFudGljIGB0eXBlYCAoQnV0dG9uL0xhYmVsL0ltYWdlL1BhbmVsL0lucHV0L1Njcm9sbFZpZXcvTGlzdCkgb3ZlciByYXcgYGNvbXBvbmVudHNbXWAuIFVzZSBgY29tcG9uZW50c1tdYCBvbmx5IGZvciB0aGluZ3Mgd2l0aG91dCBhIHNlbWFudGljIGFsaWFzIChjYy5NYXNrLCBjYy5HcmFwaGljcywgY3VzdG9tIHNjcmlwdHMsIGNjLkJsb2NrSW5wdXRFdmVudHMsIC4uLikuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIFVzZSBgcHJlc2V0YCBmb3IgdGhlIDUgc3RhbmRhcmQgcmVzcG9uc2l2ZSBsYXlvdXRzOyBjb21iaW5lIHdpdGggYHdpZGdldGAgdG8gb3ZlcnJpZGUgaW5kaXZpZHVhbCBzaWRlcy5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gQXNzZXQgcGF0aHMgdXNlIGBkYjovL2Fzc2V0cy8uLi5gICh0aGUgdG9vbCByZXNvbHZlcyBVVUlEcyk7IGNvbG9ycyBhcmUgMOKAkzI1NS5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gRG8gbm90IG5lc3QgZGVlcGVyIHRoYW4gNiBsZXZlbHMg4oCUIHNwbGl0IGludG8gYSBzdWItcHJlZmFiIHZpYSBhIHNlcGFyYXRlIGNhbGwgd2l0aCBgc2F2ZUFzUHJlZmFiYC5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gRG8gbm90IGhhcmRjb2RlIGJ1c2luZXNzIGRhdGEgKHNwZWNpZmljIGl0ZW1zLCBwcmljZXMpOyBidWlsZCB0ZW1wbGF0ZXMgb25seSBhbmQgbGV0IHJ1bnRpbWUgZmlsbCBkYXRhLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBGb3IgU2Nyb2xsVmlldywganVzdCBkZWNsYXJlIGB0eXBlOiBcIlNjcm9sbFZpZXdcImAgKyBgc2Nyb2xsTGF5b3V0YDsgdGhlIHRvb2wgYnVpbGRzIHZpZXcrbWFzaytjb250ZW50K2xheW91dCBhbmQgd2lyZXMgYFNjcm9sbFZpZXcuY29udGVudGAuIENoaWxkcmVuIG9mIHRoZSBzcGVjIGFyZSByb3V0ZWQgaW50byB0aGUgY29udGVudCBub2RlIGF1dG9tYXRpY2FsbHkg4oCUIGRvIE5PVCBidWlsZCB0aGUgc2NhZmZvbGQgYnkgaGFuZC5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gV2hlbiB0aGUgdXNlciByZXF1ZXN0cyBhIHR3ZWFrIGFmdGVyIHRoZSBidWlsZCwgZWRpdCB0aGUgVUlTcGVjIEpTT04gYW5kIGNhbGwgdGhpcyB0b29sIGFnYWluIHJhdGhlciB0aGFuIHBhdGNoaW5nIG5vZGUtYnktbm9kZSwgdW5sZXNzIHRoZSBjaGFuZ2UgdG91Y2hlcyDiiaQzIG5vZGVzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwZWM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuLi5VSV9TUEVDX0pTT05fU0NIRU1BLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVUlTcGVjIHRyZWUuIEVhY2ggbm9kZSBoYXM6IG5hbWUgKHJlcXVpcmVkKSwgb3B0aW9uYWwgdHlwZSAoc2VtYW50aWMgc2hvcnRjdXQpLCBwcmVzZXQsIHNpemUgW3csaF0sIGFuY2hvciBbeCx5XSwgcG9zaXRpb24gW3gseV0sIHByb3BzICh0ZXh0L2NvbG9yL2JhY2tncm91bmQvb25DbGljay9sYXlvdXRUeXBlKSwgY29tcG9uZW50c1tdIChlc2NhcGUgaGF0Y2ggZm9yIHJhdyBjYy4qIGNvbXBvbmVudHMpLCBjaGlsZHJlbltdIChyZWN1cnNpdmUpLicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGFzIGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIFVVSUQuIE9taXQgdG8gY3JlYXRlIGF0IHNjZW5lIHJvb3QuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlQXNQcmVmYWI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wdGlvbmFsIHByZWZhYiBzYXZlIHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9TaG9wU2NyZWVuLnByZWZhYi4gSWYgc2V0LCB0aGUgYnVpbHQgcm9vdCBpcyBzYXZlZCBhcyBhIHByZWZhYiBhZnRlciBjb25zdHJ1Y3Rpb24uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NwZWMnXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICh0b29sTmFtZSAhPT0gJ3VpX2J1aWxkX2Zyb21fc3BlYycpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmJ1aWxkRnJvbVNwZWMoYXJncyk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZEZyb21TcGVjKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHNwZWM6IFVJU3BlYyB8IHVuZGVmaW5lZCA9IGFyZ3M/LnNwZWM7XG4gICAgICAgIGlmICghc3BlYyB8fCB0eXBlb2Ygc3BlYyAhPT0gJ29iamVjdCcgfHwgIXNwZWMubmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTWlzc2luZyBvciBpbnZhbGlkIHNwZWM6IGEgVUlTcGVjIG9iamVjdCB3aXRoIGF0IGxlYXN0IGEgXCJuYW1lXCIgZmllbGQgaXMgcmVxdWlyZWQuJyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3R4OiBCdWlsZENvbnRleHQgPSB7IGNyZWF0ZWROb2RlVXVpZHM6IFtdLCB3YXJuaW5nczogW10gfTtcbiAgICAgICAgbGV0IGF1dG9EZXRlY3RlZFNpemU6IHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKCFzcGVjLnNpemUgfHwgc3BlYy5zaXplLmxlbmd0aCAhPT0gMikge1xuICAgICAgICAgICAgYXV0b0RldGVjdGVkU2l6ZSA9IGF3YWl0IHRoaXMuZmV0Y2hEZXNpZ25SZXNvbHV0aW9uKCk7XG4gICAgICAgICAgICBpZiAoYXV0b0RldGVjdGVkU2l6ZSkge1xuICAgICAgICAgICAgICAgIHNwZWMuc2l6ZSA9IFthdXRvRGV0ZWN0ZWRTaXplLndpZHRoLCBhdXRvRGV0ZWN0ZWRTaXplLmhlaWdodF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHJvb3RVdWlkOiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByb290VXVpZCA9IGF3YWl0IHRoaXMuYnVpbGROb2RlKHNwZWMsIGFyZ3M/LnBhcmVudFV1aWQsIGN0eCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gYnVpbGQgVUkgc3BlYzogJHtlcnJvcj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWAsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjcmVhdGVkTm9kZVV1aWRzOiBjdHguY3JlYXRlZE5vZGVVdWlkcywgd2FybmluZ3M6IGN0eC53YXJuaW5ncyB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBwcmVmYWJQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChhcmdzPy5zYXZlQXNQcmVmYWIgJiYgdHlwZW9mIGFyZ3Muc2F2ZUFzUHJlZmFiID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGFyZ3Muc2F2ZUFzUHJlZmFiIGFzIHN0cmluZztcbiAgICAgICAgICAgIGNvbnN0IHByZWZhYk5hbWUgPSB0aGlzLmV4dHJhY3RQcmVmYWJOYW1lKHBhdGgpID8/IHNwZWMubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IHNhdmVQYXRoID0gcGF0aC5lbmRzV2l0aCgnLnByZWZhYicpID8gcGF0aCA6IGAke3BhdGgucmVwbGFjZSgvXFwvJC8sICcnKX0vJHtwcmVmYWJOYW1lfS5wcmVmYWJgO1xuICAgICAgICAgICAgY29uc3QgcHJlZmFiUmVzdWx0ID0gYXdhaXQgdGhpcy5wcmVmYWJUb29scy5leGVjdXRlKCdwcmVmYWJfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHJvb3RVdWlkLFxuICAgICAgICAgICAgICAgIHNhdmVQYXRoLFxuICAgICAgICAgICAgICAgIHByZWZhYk5hbWUsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUNoaWxkcmVuOiB0cnVlLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAocHJlZmFiUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBwcmVmYWJQYXRoID0gc2F2ZVBhdGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBGYWlsZWQgdG8gc2F2ZSBwcmVmYWIgYXQgJHtzYXZlUGF0aH06ICR7cHJlZmFiUmVzdWx0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiAhIXJvb3RVdWlkLFxuICAgICAgICAgICAgbWVzc2FnZTogYEJ1aWx0IFVJICcke3NwZWMubmFtZX0nIHdpdGggJHtjdHguY3JlYXRlZE5vZGVVdWlkcy5sZW5ndGh9IG5vZGUocykke2N0eC53YXJuaW5ncy5sZW5ndGggPiAwID8gYCAoJHtjdHgud2FybmluZ3MubGVuZ3RofSB3YXJuaW5nKHMpKWAgOiAnJ31gLFxuICAgICAgICAgICAgd2FybmluZzogY3R4Lndhcm5pbmdzLmxlbmd0aCA+IDAgPyBjdHgud2FybmluZ3Muam9pbignXFxuJykgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcm9vdFV1aWQsXG4gICAgICAgICAgICAgICAgY3JlYXRlZE5vZGVVdWlkczogY3R4LmNyZWF0ZWROb2RlVXVpZHMsXG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aCxcbiAgICAgICAgICAgICAgICB3YXJuaW5nQ291bnQ6IGN0eC53YXJuaW5ncy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgYXV0b0RldGVjdGVkU2l6ZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmZXRjaERlc2lnblJlc29sdXRpb24oKTogUHJvbWlzZTx7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gfCB1bmRlZmluZWQ+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgncHJvamVjdCcsICdxdWVyeS1jb25maWcnLCAncHJvamVjdCcpO1xuICAgICAgICAgICAgY29uc3QgY2FuZGlkYXRlczogQXJyYXk8eyB3aWR0aDogdW5rbm93bjsgaGVpZ2h0OiB1bmtub3duIH0gfCB1bmRlZmluZWQ+ID0gW1xuICAgICAgICAgICAgICAgIGNvbmZpZz8ucHJldmlldz8uZGVzaWduUmVzb2x1dGlvbixcbiAgICAgICAgICAgICAgICBjb25maWc/LnByZXZpZXc/LmRlc2lnbl9yZXNvbHV0aW9uLFxuICAgICAgICAgICAgICAgIHsgd2lkdGg6IGNvbmZpZz8ucHJldmlldz8uZGVzaWduX3dpZHRoLCBoZWlnaHQ6IGNvbmZpZz8ucHJldmlldz8uZGVzaWduX2hlaWdodCB9LFxuICAgICAgICAgICAgICAgIGNvbmZpZz8uZ2VuZXJhbD8uZGVzaWduUmVzb2x1dGlvbixcbiAgICAgICAgICAgIF07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGMgb2YgY2FuZGlkYXRlcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHcgPSBOdW1iZXIoYz8ud2lkdGgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGggPSBOdW1iZXIoYz8uaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHcpICYmIE51bWJlci5pc0Zpbml0ZShoKSAmJiB3ID4gMCAmJiBoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB3aWR0aDogdywgaGVpZ2h0OiBoIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBsb2dnZXIud2FybihgdWktYnVpbGRlcjogZmFpbGVkIHRvIGZldGNoIGRlc2lnbiByZXNvbHV0aW9uOiAke2Vycm9yPy5tZXNzYWdlID8/IGVycm9yfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZE5vZGUoc3BlYzogVUlTcGVjLCBwYXJlbnRVdWlkOiBzdHJpbmcgfCB1bmRlZmluZWQsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgaWYgKCFzcGVjLm5hbWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXZlcnkgVUlTcGVjIG5vZGUgbXVzdCBoYXZlIGEgbmFtZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3JlYXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgbmFtZTogc3BlYy5uYW1lLFxuICAgICAgICAgICAgcGFyZW50VXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlUmVzdWx0LnN1Y2Nlc3MgfHwgIWNyZWF0ZVJlc3VsdC5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgbm9kZSAnJHtzcGVjLm5hbWV9JzogJHtjcmVhdGVSZXN1bHQuZXJyb3IgPz8gJ25vIHV1aWQgcmV0dXJuZWQnfWApO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHV1aWQ6IHN0cmluZyA9IGNyZWF0ZVJlc3VsdC5kYXRhLnV1aWQ7XG4gICAgICAgIGN0eC5jcmVhdGVkTm9kZVV1aWRzLnB1c2godXVpZCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnRUeXBlIG9mIHRoaXMuY29tcG9uZW50c0ZvclNlbWFudGljVHlwZShzcGVjLnR5cGUpKSB7XG4gICAgICAgICAgICBjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWFkZFJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBhZGQgJHtjb21wb25lbnRUeXBlfTogJHthZGRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVNwcml0ZUZyYW1lRGVmYXVsdCh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5VHJhbnNmb3JtQmFzaWNzKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlTZW1hbnRpY1Byb3BzKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlSYXdDb21wb25lbnRzKHV1aWQsIHNwZWMuY29tcG9uZW50cywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVByZXNldCh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5V2lkZ2V0T3ZlcnJpZGUodXVpZCwgc3BlYywgY3R4KTtcblxuICAgICAgICBpZiAoc3BlYy50eXBlID09PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5idWlsZEJ1dHRvbkxhYmVsQ2hpbGQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzcGVjLmFjdGl2ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXRfcHJvcGVydHknLFxuICAgICAgICAgICAgICAgIHV1aWQsXG4gICAgICAgICAgICAgICAgcHJvcGVydHk6ICdhY3RpdmUnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiBmYWxzZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9LmFjdGl2ZT1mYWxzZTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBjaGlsZFBhcmVudFV1aWQgPSB1dWlkO1xuICAgICAgICBpZiAoc3BlYy50eXBlID09PSAnU2Nyb2xsVmlldycpIHtcbiAgICAgICAgICAgIGNoaWxkUGFyZW50VXVpZCA9IGF3YWl0IHRoaXMuYnVpbGRTY3JvbGxWaWV3U2NhZmZvbGQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNwZWMuY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIHNwZWMuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkTm9kZShjaGlsZCwgY2hpbGRQYXJlbnRVdWlkLCBjdHgpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYENoaWxkICcke2NoaWxkPy5uYW1lID8/ICc8dW5uYW1lZD4nfScgdW5kZXIgJyR7c3BlYy5uYW1lfSc6ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdXVpZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5V2lkZ2V0T3ZlcnJpZGUodXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHdpZGdldDogVUlXaWRnZXRTcGVjIHwgdW5kZWZpbmVkID0gc3BlYy53aWRnZXQ7XG4gICAgICAgIGlmICghd2lkZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5zdXJlZCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5XaWRnZXQnLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFlbnN1cmVkLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gZW5zdXJlIGNjLldpZGdldDogJHtlbnN1cmVkLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBmaWVsZHM6IEFycmF5PFtrZXlvZiBVSVdpZGdldFNwZWMsIHN0cmluZywgc3RyaW5nXT4gPSBbXG4gICAgICAgICAgICBbJ3RvcCcsICdpc0FsaWduVG9wJywgJ3RvcCddLFxuICAgICAgICAgICAgWydib3R0b20nLCAnaXNBbGlnbkJvdHRvbScsICdib3R0b20nXSxcbiAgICAgICAgICAgIFsnbGVmdCcsICdpc0FsaWduTGVmdCcsICdsZWZ0J10sXG4gICAgICAgICAgICBbJ3JpZ2h0JywgJ2lzQWxpZ25SaWdodCcsICdyaWdodCddLFxuICAgICAgICAgICAgWydob3Jpem9udGFsQ2VudGVyJywgJ2lzQWxpZ25Ib3Jpem9udGFsQ2VudGVyJywgJ2hvcml6b250YWxDZW50ZXInXSxcbiAgICAgICAgICAgIFsndmVydGljYWxDZW50ZXInLCAnaXNBbGlnblZlcnRpY2FsQ2VudGVyJywgJ3ZlcnRpY2FsQ2VudGVyJ10sXG4gICAgICAgIF07XG4gICAgICAgIGZvciAoY29uc3QgW3NwZWNGaWVsZCwgYWxpZ25GbGFnLCB2YWx1ZUZpZWxkXSBvZiBmaWVsZHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHYgPSB3aWRnZXRbc3BlY0ZpZWxkXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdiA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLldpZGdldCcsIGFsaWduRmxhZywgJ2Jvb2xlYW4nLCB0cnVlLCBjdHgpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuV2lkZ2V0JywgdmFsdWVGaWVsZCwgJ251bWJlcicsIHYsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdpZGdldC5hbGlnbk1vZGUpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHsgT05DRTogMCwgT05fV0lORE9XX1JFU0laRTogMSwgQUxXQVlTOiAyIH07XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLldpZGdldCcsICdhbGlnbk1vZGUnLCAnaW50ZWdlcicsIG1hcFt3aWRnZXQuYWxpZ25Nb2RlXSwgY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRTY3JvbGxWaWV3U2NhZmZvbGQocm9vdFV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGNvbnN0IHZpZXdSZXN1bHQgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiAndmlldycsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiByb290VXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghdmlld1Jlc3VsdC5zdWNjZXNzIHx8ICF2aWV3UmVzdWx0LmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gU2Nyb2xsVmlldzogZmFpbGVkIHRvIGNyZWF0ZSB2aWV3IG5vZGVgKTtcbiAgICAgICAgICAgIHJldHVybiByb290VXVpZDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2aWV3VXVpZDogc3RyaW5nID0gdmlld1Jlc3VsdC5kYXRhLnV1aWQ7XG4gICAgICAgIGN0eC5jcmVhdGVkTm9kZVV1aWRzLnB1c2godmlld1V1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLk1hc2snXSkge1xuICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB2aWV3VXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gdmlldyBhZGQgJHtjb21wb25lbnRUeXBlfTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ3VpX2FwcGx5X3Jlc3BvbnNpdmVfZGVmYXVsdHMnLCB7XG4gICAgICAgICAgICBub2RlVXVpZDogdmlld1V1aWQsXG4gICAgICAgICAgICBwcmVzZXQ6ICdmdWxsX3N0cmV0Y2gnLFxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBjb250ZW50UmVzdWx0ID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ2NvbnRlbnQnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogdmlld1V1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNvbnRlbnRSZXN1bHQuc3VjY2VzcyB8fCAhY29udGVudFJlc3VsdC5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IFNjcm9sbFZpZXc6IGZhaWxlZCB0byBjcmVhdGUgY29udGVudCBub2RlYCk7XG4gICAgICAgICAgICByZXR1cm4gdmlld1V1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29udGVudFV1aWQ6IHN0cmluZyA9IGNvbnRlbnRSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKGNvbnRlbnRVdWlkKTtcblxuICAgICAgICBjb25zdCBlbnN1cmVDb250ZW50ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgIG5vZGVVdWlkOiBjb250ZW50VXVpZCxcbiAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5VSVRyYW5zZm9ybScsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWVuc3VyZUNvbnRlbnQuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBjb250ZW50IGFkZCBjYy5VSVRyYW5zZm9ybTogJHtlbnN1cmVDb250ZW50LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNjcm9sbExheW91dCA9IHNwZWMuc2Nyb2xsTGF5b3V0O1xuICAgICAgICBpZiAoc2Nyb2xsTGF5b3V0KSB7XG4gICAgICAgICAgICBjb25zdCBlbnN1cmVMYXlvdXQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogY29udGVudFV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLkxheW91dCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghZW5zdXJlTGF5b3V0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGNvbnRlbnQgYWRkIGNjLkxheW91dDogJHtlbnN1cmVMYXlvdXQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbGF5b3V0VHlwZSA9IHNjcm9sbExheW91dCA9PT0gJ2hvcml6b250YWwnID8gMSA6IHNjcm9sbExheW91dCA9PT0gJ2dyaWQnID8gMyA6IDI7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AoY29udGVudFV1aWQsICdjYy5MYXlvdXQnLCAndHlwZScsICdpbnRlZ2VyJywgbGF5b3V0VHlwZSwgY3R4KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChjb250ZW50VXVpZCwgJ2NjLkxheW91dCcsICdyZXNpemVNb2RlJywgJ2ludGVnZXInLCAxLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHJvb3RVdWlkLCAnY2MuU2Nyb2xsVmlldycsICdjb250ZW50JywgJ25vZGUnLCBjb250ZW50VXVpZCwgY3R4KTtcblxuICAgICAgICBjb25zdCBpc0hvcml6b250YWwgPSBzY3JvbGxMYXlvdXQgPT09ICdob3Jpem9udGFsJztcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHJvb3RVdWlkLCAnY2MuU2Nyb2xsVmlldycsICdob3Jpem9udGFsJywgJ2Jvb2xlYW4nLCBpc0hvcml6b250YWwsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAndmVydGljYWwnLCAnYm9vbGVhbicsICFpc0hvcml6b250YWwsIGN0eCk7XG5cbiAgICAgICAgcmV0dXJuIGNvbnRlbnRVdWlkO1xuICAgIH1cblxuICAgIHByaXZhdGUgY29tcG9uZW50c0ZvclNlbWFudGljVHlwZSh0eXBlOiBVSVNlbWFudGljVHlwZSB8IHVuZGVmaW5lZCk6IHN0cmluZ1tdIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdQYW5lbCc6XG4gICAgICAgICAgICBjYXNlICdJbWFnZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuU3ByaXRlJ107XG4gICAgICAgICAgICBjYXNlICdMYWJlbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGFiZWwnXTtcbiAgICAgICAgICAgIGNhc2UgJ0J1dHRvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuU3ByaXRlJywgJ2NjLkJ1dHRvbiddO1xuICAgICAgICAgICAgY2FzZSAnSW5wdXQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkVkaXRCb3gnXTtcbiAgICAgICAgICAgIGNhc2UgJ1Njcm9sbFZpZXcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNjcm9sbFZpZXcnXTtcbiAgICAgICAgICAgIGNhc2UgJ0xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxheW91dCddO1xuICAgICAgICAgICAgY2FzZSAnTm9kZSc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJ107XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5VHJhbnNmb3JtQmFzaWNzKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoc3BlYy5zaXplICYmIHNwZWMuc2l6ZS5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IFt3aWR0aCwgaGVpZ2h0XSA9IHNwZWMuc2l6ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuVUlUcmFuc2Zvcm0nLCAnY29udGVudFNpemUnLCAnc2l6ZScsIHsgd2lkdGgsIGhlaWdodCB9LCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGVjLmFuY2hvciAmJiBzcGVjLmFuY2hvci5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHNwZWMuYW5jaG9yO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdhbmNob3JQb2ludCcsICd2ZWMyJywgeyB4LCB5IH0sIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMucG9zaXRpb24gJiYgc3BlYy5wb3NpdGlvbi5sZW5ndGggPT09IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IFt4LCB5XSA9IHNwZWMucG9zaXRpb247XG4gICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2V0X3RyYW5zZm9ybScsXG4gICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogeyB4LCB5LCB6OiAwIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfS5wb3NpdGlvbjogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlTcHJpdGVGcmFtZURlZmF1bHQodXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBzcGVjLnR5cGU7XG4gICAgICAgIGlmICh0eXBlICE9PSAnUGFuZWwnICYmIHR5cGUgIT09ICdJbWFnZScgJiYgdHlwZSAhPT0gJ0J1dHRvbicpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBGb3IgQnV0dG9uIHR5cGUsIGFsd2F5cyBzZXQgU3ByaXRlIHR5cGUgdG8gU0xJQ0VEIGZvciBwcm9wZXIgOS1zbGljZSBzY2FsaW5nXG4gICAgICAgIC8vIChlbmdpbmUgZGVmYXVsdCBpcyBTSU1QTEUsIGJ1dCBlZGl0b3IgdGVtcGxhdGUgdXNlcyBTTElDRUQgZm9yIGJ1dHRvbnMpXG4gICAgICAgIGlmICh0eXBlID09PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAndHlwZScsICdpbnRlZ2VyJywgMSwgY3R4KTsgLy8gU0xJQ0VEXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZCA9IHNwZWMucHJvcHM/LmJhY2tncm91bmQ7XG4gICAgICAgIGlmICghYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKGJhY2tncm91bmQpLCBjdHgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRCdXR0b25MYWJlbENoaWxkKGJ1dHRvblV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9wcyA9IHNwZWMucHJvcHMgPz8ge307XG4gICAgICAgIGlmIChwcm9wcy50ZXh0ID09PSB1bmRlZmluZWQgJiYgcHJvcHMuZm9udFNpemUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNyZWF0ZSA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdMYWJlbCcsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiBidXR0b25VdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjcmVhdGUuc3VjY2VzcyB8fCAhY3JlYXRlLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gYnV0dG9uIGxhYmVsIGNoaWxkOiAke2NyZWF0ZS5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGFiZWxVdWlkOiBzdHJpbmcgPSBjcmVhdGUuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKGxhYmVsVXVpZCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnRUeXBlIG9mIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGFiZWwnXSkge1xuICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBsYWJlbFV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGxhYmVsIGFkZCAke2NvbXBvbmVudFR5cGV9OiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIGNjLldpZGdldCB0byBzdHJldGNoIHRoZSBsYWJlbCB0byBmaWxsIHRoZSBlbnRpcmUgYnV0dG9uIGFyZWFcbiAgICAgICAgY29uc3Qgd2lkZ2V0UmVzdWx0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgIG5vZGVVdWlkOiBsYWJlbFV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuV2lkZ2V0JyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh3aWRnZXRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLldpZGdldCcsICdpc0FsaWduVG9wJywgJ2Jvb2xlYW4nLCB0cnVlLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLldpZGdldCcsICdpc0FsaWduQm90dG9tJywgJ2Jvb2xlYW4nLCB0cnVlLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLldpZGdldCcsICdpc0FsaWduTGVmdCcsICdib29sZWFuJywgdHJ1ZSwgY3R4KTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5XaWRnZXQnLCAnaXNBbGlnblJpZ2h0JywgJ2Jvb2xlYW4nLCB0cnVlLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLldpZGdldCcsICdhbGlnbk1vZGUnLCAnaW50ZWdlcicsIDIsIGN0eCk7IC8vIE9OX1dJTkRPV19SRVNJWkVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gbGFiZWwgYWRkIGNjLldpZGdldDogJHt3aWRnZXRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByb3BzLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BzLmZvbnRTaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdmb250U2l6ZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuZm9udFNpemUpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy5jb2xvcikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTGFiZWwgYWxpZ25tZW50IChCdXR0b24gdHlwZSBvbmx5KVxuICAgICAgICBpZiAocHJvcHMubGFiZWxBbGlnbkhvcml6b250YWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGhNYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IExFRlQ6IDAsIENFTlRFUjogMSwgUklHSFQ6IDIgfTtcbiAgICAgICAgICAgIGNvbnN0IGhWYWwgPSBoTWFwW3Byb3BzLmxhYmVsQWxpZ25Ib3Jpem9udGFsXTtcbiAgICAgICAgICAgIGlmIChoVmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnaG9yaXpvbnRhbEFsaWduJywgJ2ludGVnZXInLCBoVmFsLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy5sYWJlbEFsaWduVmVydGljYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IHZNYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IFRPUDogMCwgQ0VOVEVSOiAxLCBCT1RUT006IDIgfTtcbiAgICAgICAgICAgIGNvbnN0IHZWYWwgPSB2TWFwW3Byb3BzLmxhYmVsQWxpZ25WZXJ0aWNhbF07XG4gICAgICAgICAgICBpZiAodlZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ3ZlcnRpY2FsQWxpZ24nLCAnaW50ZWdlcicsIHZWYWwsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5U2VtYW50aWNQcm9wcyh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHNwZWMudHlwZTtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzcGVjLnByb3BzID8/IHt9O1xuXG4gICAgICAgIGlmICh0eXBlID09PSAnTGFiZWwnICYmIHByb3BzLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYWJlbCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnTGFiZWwnICYmIHByb3BzLmZvbnRTaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmZvbnRTaXplKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gJ0xhYmVsJyAmJiBwcm9wcy5jb2xvcikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuY29sb3IpLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUGFuZWwvSW1hZ2U6IGFwcGx5IGNvbG9yIHRvIGNjLlNwcml0ZSBvbmx5IChub3QgQnV0dG9uIOKAlCBCdXR0b24gY29sb3IgZ29lcyB0byBMYWJlbCBjaGlsZClcbiAgICAgICAgaWYgKCh0eXBlID09PSAnUGFuZWwnIHx8IHR5cGUgPT09ICdJbWFnZScpICYmIHByb3BzLmNvbG9yKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlNwcml0ZScsICdjb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuY29sb3IpLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnV0dG9uIGNvbXBvbmVudCAoY2MuQnV0dG9uKSBwcm9wZXJ0aWVzXG4gICAgICAgIGlmICh0eXBlID09PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgY29uc3QgdE1hcDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHsgTk9ORTogMCwgQ09MT1I6IDEsIFNQUklURTogMiwgU0NBTEU6IDMgfTtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gU0NBTEUgbGlrZSB0aGUgQ29jb3MgQ3JlYXRvciBlZGl0b3IgdGVtcGxhdGVcbiAgICAgICAgICAgIGNvbnN0IHRWYWwgPSBwcm9wcy50cmFuc2l0aW9uID8gdE1hcFtwcm9wcy50cmFuc2l0aW9uXSA6IHRNYXAuU0NBTEU7XG4gICAgICAgICAgICBpZiAodFZhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAndHJhbnNpdGlvbicsICdpbnRlZ2VyJywgdFZhbCwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5ub3JtYWxDb2xvcikge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ25vcm1hbENvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5ub3JtYWxDb2xvciksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMucHJlc3NlZENvbG9yKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAncHJlc3NlZENvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5wcmVzc2VkQ29sb3IpLCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHByb3BzLmhvdmVyQ29sb3IpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdob3ZlckNvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5ob3ZlckNvbG9yKSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChwcm9wcy5kaXNhYmxlZENvbG9yKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnZGlzYWJsZWRDb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuZGlzYWJsZWRDb2xvciksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuZHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ2R1cmF0aW9uJywgJ251bWJlcicsIE51bWJlcihwcm9wcy5kdXJhdGlvbiksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuem9vbVNjYWxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICd6b29tU2NhbGUnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLnpvb21TY2FsZSksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMubm9ybWFsU3ByaXRlKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5CdXR0b24nLCAnbm9ybWFsU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKHByb3BzLm5vcm1hbFNwcml0ZSksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMucHJlc3NlZFNwcml0ZSkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuQnV0dG9uJywgJ3ByZXNzZWRTcHJpdGUnLCAnc3ByaXRlRnJhbWUnLCBhd2FpdCB0aGlzLnJlc29sdmVBc3NldFV1aWQocHJvcHMucHJlc3NlZFNwcml0ZSksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuaG92ZXJTcHJpdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdob3ZlclNwcml0ZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChwcm9wcy5ob3ZlclNwcml0ZSksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocHJvcHMuZGlzYWJsZWRTcHJpdGUpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkJ1dHRvbicsICdkaXNhYmxlZFNwcml0ZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChwcm9wcy5kaXNhYmxlZFNwcml0ZSksIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gJ0lucHV0JyAmJiBwcm9wcy5wbGFjZWhvbGRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkVkaXRCb3gnLCAncGxhY2Vob2xkZXInLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnBsYWNlaG9sZGVyKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gJ0lucHV0JyAmJiBwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMaXN0JyAmJiBwcm9wcy5sYXlvdXRUeXBlKSB7XG4gICAgICAgICAgICBjb25zdCBsYXlvdXRWYWx1ZSA9IExBWU9VVF9UWVBFX01BUFtwcm9wcy5sYXlvdXRUeXBlXTtcbiAgICAgICAgICAgIGlmIChsYXlvdXRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYXlvdXQnLCAndHlwZScsICdpbnRlZ2VyJywgbGF5b3V0VmFsdWUsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UmF3Q29tcG9uZW50cyh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudHM6IENvbXBvbmVudFNwZWNbXSB8IHVuZGVmaW5lZCwgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBvbmVudHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGlmICghY29tcD8udHlwZSkge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBSYXcgY29tcG9uZW50IG1pc3NpbmcgJ3R5cGUnIGZpZWxkOyBza2lwcGVkYCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLnR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgYWRkICR7Y29tcC50eXBlfTogJHthZGRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbXAucHJvcHMgJiYgdHlwZW9mIGNvbXAucHJvcHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcGVydHksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb21wLnByb3BzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVR5cGUgPSB0aGlzLmluZmVyUHJvcGVydHlUeXBlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxWYWx1ZSA9IHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyA/IHRoaXMubm9ybWFsaXplQ29sb3IodmFsdWUgYXMgVUlDb2xvcikgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsIGNvbXAudHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgZmluYWxWYWx1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UHJlc2V0KHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXNwZWMucHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFyZ2lucyA9IHNwZWMubWFyZ2lucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IHNwZWMuc3BhY2luZyA/PyB7fTtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgcHJlc2V0OiBzcGVjLnByZXNldCxcbiAgICAgICAgICAgIG1hcmdpbkxlZnQ6IG1hcmdpbnMubGVmdCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IG1hcmdpbnMucmlnaHQgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpblRvcDogbWFyZ2lucy50b3AgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogbWFyZ2lucy5ib3R0b20gPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdYOiBzcGFjaW5nLnggPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdZOiBzcGFjaW5nLnkgPz8gMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHByZXNldCAnJHtzcGVjLnByZXNldH0nOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wKFxuICAgICAgICB1dWlkOiBzdHJpbmcsXG4gICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHk6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHlUeXBlOiBzdHJpbmcsXG4gICAgICAgIHZhbHVlOiB1bmtub3duLFxuICAgICAgICBjdHg6IEJ1aWxkQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBc3NldFV1aWQocmVmOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoIXJlZi5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVmO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHJlZik7XG4gICAgICAgICAgICBpZiAodXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1dWlkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVzb2x2ZSBhc3NldCAnJHtyZWZ9JzogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWY7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVDb2xvcihjb2xvcjogVUlDb2xvciB8IHVua25vd24pOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYyA9IChjb2xvciA/PyB7fSkgYXMgUGFydGlhbDxVSUNvbG9yPjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHI6IE51bWJlcihjLnIgPz8gMjU1KSxcbiAgICAgICAgICAgIGc6IE51bWJlcihjLmcgPz8gMjU1KSxcbiAgICAgICAgICAgIGI6IE51bWJlcihjLmIgPz8gMjU1KSxcbiAgICAgICAgICAgIGE6IE51bWJlcihjLmEgPz8gMjU1KSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluZmVyUHJvcGVydHlUeXBlKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nQXJyYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBvID0gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICBpZiAoJ3InIGluIG8gJiYgJ2cnIGluIG8gJiYgJ2InIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgnd2lkdGgnIGluIG8gJiYgJ2hlaWdodCcgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc2l6ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJ3gnIGluIG8gJiYgJ3knIGluIG8gJiYgJ3onIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlYzMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCd4JyBpbiBvICYmICd5JyBpbiBvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd2ZWMyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJlZmFiTmFtZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vXSs/KVxcLnByZWZhYiQvLmV4ZWMocGF0aCk7XG4gICAgICAgIHJldHVybiBtYXRjaD8uWzFdO1xuICAgIH1cbn1cbiJdfQ==