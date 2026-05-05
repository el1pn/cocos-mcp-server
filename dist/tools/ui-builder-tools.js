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
        const background = (_a = spec.props) === null || _a === void 0 ? void 0 : _a.background;
        if (!background) {
            return;
        }
        await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', await this.resolveAssetUuid(background), ctx);
    }
    async buildButtonLabelChild(buttonUuid, spec, ctx) {
        var _a, _b, _c, _d;
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
        if (props.text !== undefined) {
            await this.setProp(labelUuid, 'cc.Label', 'string', 'string', String(props.text), ctx);
        }
        if (props.fontSize !== undefined) {
            await this.setProp(labelUuid, 'cc.Label', 'fontSize', 'number', Number(props.fontSize), ctx);
        }
        if (props.color) {
            await this.setProp(labelUuid, 'cc.Label', 'color', 'color', this.normalizeColor(props.color), ctx);
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
        if ((type === 'Panel' || type === 'Image' || type === 'Button') && props.color) {
            await this.setProp(uuid, 'cc.Sprite', 'color', 'color', this.normalizeColor(props.color), ctx);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy91aS1idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhDQU8wQjtBQUMxQiw2Q0FBeUM7QUFDekMsdURBQW1EO0FBQ25ELGlEQUE2QztBQUM3Qyw0REFBd0Q7QUFDeEQsc0NBQW1DO0FBRW5DLE1BQU0sZUFBZSxHQUEyQjtJQUM1QyxJQUFJLEVBQUUsQ0FBQztJQUNQLFVBQVUsRUFBRSxDQUFDO0lBQ2IsUUFBUSxFQUFFLENBQUM7SUFDWCxJQUFJLEVBQUUsQ0FBQztDQUNWLENBQUM7QUFPRixNQUFhLGNBQWM7SUFBM0I7UUFDWSxjQUFTLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7UUFDNUIsbUJBQWMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztRQUN0QyxnQkFBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0lBa2pCNUMsQ0FBQztJQWhqQkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQ1Asc1lBQXNZO29CQUN0WSx5QkFBeUI7b0JBQ3pCLHNHQUFzRztvQkFDdEcsNkVBQTZFO29CQUM3RSw2SUFBNkk7b0JBQzdJLFVBQVU7b0JBQ1Ysb09BQW9PO29CQUNwTyw2R0FBNkc7b0JBQzdHLG9GQUFvRjtvQkFDcEYseUdBQXlHO29CQUN6Ryw2R0FBNkc7b0JBQzdHLDJQQUEyUDtvQkFDM1Asd0tBQXdLO2dCQUM1SyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxnQ0FDQyw2QkFBbUIsS0FDdEIsV0FBVyxFQUNQLGtRQUFrUSxHQUNsUTt3QkFDUixVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlEQUFpRDt5QkFDakU7d0JBQ0QsWUFB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QVEsQ0FBQztJQUNwQixDQUFDO0lBRU8saUJBQWlCLENBQUMsSUFBWTtRQUNsQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsT0FBTyxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNKO0FBcmpCRCx3Q0FxakJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtcbiAgICBVSVNwZWMsXG4gICAgVUlTZW1hbnRpY1R5cGUsXG4gICAgVUlDb2xvcixcbiAgICBVSVdpZGdldFNwZWMsXG4gICAgQ29tcG9uZW50U3BlYyxcbiAgICBVSV9TUEVDX0pTT05fU0NIRU1BLFxufSBmcm9tICcuLi90eXBlcy91aS1zcGVjJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uL2xvZ2dlcic7XG5cbmNvbnN0IExBWU9VVF9UWVBFX01BUDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcbiAgICBOT05FOiAwLFxuICAgIEhPUklaT05UQUw6IDEsXG4gICAgVkVSVElDQUw6IDIsXG4gICAgR1JJRDogMyxcbn07XG5cbmludGVyZmFjZSBCdWlsZENvbnRleHQge1xuICAgIGNyZWF0ZWROb2RlVXVpZHM6IHN0cmluZ1tdO1xuICAgIHdhcm5pbmdzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFVJQnVpbGRlclRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIG5vZGVUb29scyA9IG5ldyBOb2RlVG9vbHMoKTtcbiAgICBwcml2YXRlIGNvbXBvbmVudFRvb2xzID0gbmV3IENvbXBvbmVudFRvb2xzKCk7XG4gICAgcHJpdmF0ZSBwcmVmYWJUb29scyA9IG5ldyBQcmVmYWJUb29scygpO1xuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3VpX2J1aWxkX2Zyb21fc3BlYycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdCdWlsZCBhIFVJIG5vZGUgaGllcmFyY2h5IGRlY2xhcmF0aXZlbHkgZnJvbSBhIFVJU3BlYyBKU09OIHRyZWUuIEV4cGFuZHMgc2VtYW50aWMgdHlwZXMgKEJ1dHRvbiwgTGFiZWwsIEltYWdlLCBQYW5lbCwgSW5wdXQsIFNjcm9sbFZpZXcsIExpc3QpIGludG8gY29tcG9uZW50IGNvbWJvcywgYXBwbGllcyBwcmVzZXRzIChmdWxsX3N0cmV0Y2gsIHRvcF9iYXIsIGJvdHRvbV9iYXIsIHZlcnRpY2FsX2xpc3QsIGhvcml6b250YWxfbGlzdCksIGFuZCBzZXRzIHNpemVzL2FuY2hvcnMvcHJvcHMgaW4gYSBzaW5nbGUgY2FsbC4gT3B0aW9uYWxseSBzYXZlcyB0aGUgcmVzdWx0IGFzIGEgcHJlZmFiLiBSZXR1cm5zIHJvb3QgVVVJRCBhbmQgYWxsIGNyZWF0ZWQgbm9kZSBVVUlEcy5cXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ1dPUktGTE9XIChtYW5kYXRvcnkpOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnMS4gU2tldGNoIHRoZSBVSVNwZWMgSlNPTiBwbHVzIGFuIEFTQ0lJIHRyZWUgcHJldmlldywgdGhlbiBhc2sgdGhlIHVzZXIgXCJPSyB0byBidWlsZCwgb3IgYWRqdXN0P1wiLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnMi4gT25seSBhZnRlciB0aGUgdXNlciBjb25maXJtcywgY2FsbCB0aGlzIHRvb2wgT05DRSB3aXRoIHRoZSBmaW5hbCBzcGVjLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnMy4gRG8gTk9UIHVzZSBub2RlX2xpZmVjeWNsZSAvIGNvbXBvbmVudF9tYW5hZ2UgLyBzZXRfY29tcG9uZW50X3Byb3BlcnR5IHRvIGJ1aWxkIG5ldyBVSSDigJQgdGhvc2UgYXJlIGZvciBzbWFsbCBlZGl0cyBvbiBleGlzdGluZyBub2Rlcy5cXG5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJ1JVTEVTOlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBQcmVmZXIgc2VtYW50aWMgYHR5cGVgIChCdXR0b24vTGFiZWwvSW1hZ2UvUGFuZWwvSW5wdXQvU2Nyb2xsVmlldy9MaXN0KSBvdmVyIHJhdyBgY29tcG9uZW50c1tdYC4gVXNlIGBjb21wb25lbnRzW11gIG9ubHkgZm9yIHRoaW5ncyB3aXRob3V0IGEgc2VtYW50aWMgYWxpYXMgKGNjLk1hc2ssIGNjLkdyYXBoaWNzLCBjdXN0b20gc2NyaXB0cywgY2MuQmxvY2tJbnB1dEV2ZW50cywgLi4uKS5cXG4nICtcbiAgICAgICAgICAgICAgICAgICAgJy0gVXNlIGBwcmVzZXRgIGZvciB0aGUgNSBzdGFuZGFyZCByZXNwb25zaXZlIGxheW91dHM7IGNvbWJpbmUgd2l0aCBgd2lkZ2V0YCB0byBvdmVycmlkZSBpbmRpdmlkdWFsIHNpZGVzLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBBc3NldCBwYXRocyB1c2UgYGRiOi8vYXNzZXRzLy4uLmAgKHRoZSB0b29sIHJlc29sdmVzIFVVSURzKTsgY29sb3JzIGFyZSAw4oCTMjU1LlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBEbyBub3QgbmVzdCBkZWVwZXIgdGhhbiA2IGxldmVscyDigJQgc3BsaXQgaW50byBhIHN1Yi1wcmVmYWIgdmlhIGEgc2VwYXJhdGUgY2FsbCB3aXRoIGBzYXZlQXNQcmVmYWJgLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBEbyBub3QgaGFyZGNvZGUgYnVzaW5lc3MgZGF0YSAoc3BlY2lmaWMgaXRlbXMsIHByaWNlcyk7IGJ1aWxkIHRlbXBsYXRlcyBvbmx5IGFuZCBsZXQgcnVudGltZSBmaWxsIGRhdGEuXFxuJyArXG4gICAgICAgICAgICAgICAgICAgICctIEZvciBTY3JvbGxWaWV3LCBqdXN0IGRlY2xhcmUgYHR5cGU6IFwiU2Nyb2xsVmlld1wiYCArIGBzY3JvbGxMYXlvdXRgOyB0aGUgdG9vbCBidWlsZHMgdmlldyttYXNrK2NvbnRlbnQrbGF5b3V0IGFuZCB3aXJlcyBgU2Nyb2xsVmlldy5jb250ZW50YC4gQ2hpbGRyZW4gb2YgdGhlIHNwZWMgYXJlIHJvdXRlZCBpbnRvIHRoZSBjb250ZW50IG5vZGUgYXV0b21hdGljYWxseSDigJQgZG8gTk9UIGJ1aWxkIHRoZSBzY2FmZm9sZCBieSBoYW5kLlxcbicgK1xuICAgICAgICAgICAgICAgICAgICAnLSBXaGVuIHRoZSB1c2VyIHJlcXVlc3RzIGEgdHdlYWsgYWZ0ZXIgdGhlIGJ1aWxkLCBlZGl0IHRoZSBVSVNwZWMgSlNPTiBhbmQgY2FsbCB0aGlzIHRvb2wgYWdhaW4gcmF0aGVyIHRoYW4gcGF0Y2hpbmcgbm9kZS1ieS1ub2RlLCB1bmxlc3MgdGhlIGNoYW5nZSB0b3VjaGVzIOKJpDMgbm9kZXMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BlYzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC4uLlVJX1NQRUNfSlNPTl9TQ0hFTUEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVSVNwZWMgdHJlZS4gRWFjaCBub2RlIGhhczogbmFtZSAocmVxdWlyZWQpLCBvcHRpb25hbCB0eXBlIChzZW1hbnRpYyBzaG9ydGN1dCksIHByZXNldCwgc2l6ZSBbdyxoXSwgYW5jaG9yIFt4LHldLCBwb3NpdGlvbiBbeCx5XSwgcHJvcHMgKHRleHQvY29sb3IvYmFja2dyb3VuZC9vbkNsaWNrL2xheW91dFR5cGUpLCBjb21wb25lbnRzW10gKGVzY2FwZSBoYXRjaCBmb3IgcmF3IGNjLiogY29tcG9uZW50cyksIGNoaWxkcmVuW10gKHJlY3Vyc2l2ZSkuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gYXMgYW55LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRC4gT21pdCB0byBjcmVhdGUgYXQgc2NlbmUgcm9vdC4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNhdmVBc1ByZWZhYjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgcHJlZmFiIHNhdmUgcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9wcmVmYWJzL1Nob3BTY3JlZW4ucHJlZmFiLiBJZiBzZXQsIHRoZSBidWlsdCByb290IGlzIHNhdmVkIGFzIGEgcHJlZmFiIGFmdGVyIGNvbnN0cnVjdGlvbi4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnc3BlYyddLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKHRvb2xOYW1lICE9PSAndWlfYnVpbGRfZnJvbV9zcGVjJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuYnVpbGRGcm9tU3BlYyhhcmdzKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkRnJvbVNwZWMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3Qgc3BlYzogVUlTcGVjIHwgdW5kZWZpbmVkID0gYXJncz8uc3BlYztcbiAgICAgICAgaWYgKCFzcGVjIHx8IHR5cGVvZiBzcGVjICE9PSAnb2JqZWN0JyB8fCAhc3BlYy5uYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIG9yIGludmFsaWQgc3BlYzogYSBVSVNwZWMgb2JqZWN0IHdpdGggYXQgbGVhc3QgYSBcIm5hbWVcIiBmaWVsZCBpcyByZXF1aXJlZC4nIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdHg6IEJ1aWxkQ29udGV4dCA9IHsgY3JlYXRlZE5vZGVVdWlkczogW10sIHdhcm5pbmdzOiBbXSB9O1xuICAgICAgICBsZXQgYXV0b0RldGVjdGVkU2l6ZTogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9IHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoIXNwZWMuc2l6ZSB8fCBzcGVjLnNpemUubGVuZ3RoICE9PSAyKSB7XG4gICAgICAgICAgICBhdXRvRGV0ZWN0ZWRTaXplID0gYXdhaXQgdGhpcy5mZXRjaERlc2lnblJlc29sdXRpb24oKTtcbiAgICAgICAgICAgIGlmIChhdXRvRGV0ZWN0ZWRTaXplKSB7XG4gICAgICAgICAgICAgICAgc3BlYy5zaXplID0gW2F1dG9EZXRlY3RlZFNpemUud2lkdGgsIGF1dG9EZXRlY3RlZFNpemUuaGVpZ2h0XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgcm9vdFV1aWQ6IHN0cmluZztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJvb3RVdWlkID0gYXdhaXQgdGhpcy5idWlsZE5vZGUoc3BlYywgYXJncz8ucGFyZW50VXVpZCwgY3R4KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBidWlsZCBVSSBzcGVjOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGNyZWF0ZWROb2RlVXVpZHM6IGN0eC5jcmVhdGVkTm9kZVV1aWRzLCB3YXJuaW5nczogY3R4Lndhcm5pbmdzIH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHByZWZhYlBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKGFyZ3M/LnNhdmVBc1ByZWZhYiAmJiB0eXBlb2YgYXJncy5zYXZlQXNQcmVmYWIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gYXJncy5zYXZlQXNQcmVmYWIgYXMgc3RyaW5nO1xuICAgICAgICAgICAgY29uc3QgcHJlZmFiTmFtZSA9IHRoaXMuZXh0cmFjdFByZWZhYk5hbWUocGF0aCkgPz8gc3BlYy5uYW1lO1xuICAgICAgICAgICAgY29uc3Qgc2F2ZVBhdGggPSBwYXRoLmVuZHNXaXRoKCcucHJlZmFiJykgPyBwYXRoIDogYCR7cGF0aC5yZXBsYWNlKC9cXC8kLywgJycpfS8ke3ByZWZhYk5hbWV9LnByZWZhYmA7XG4gICAgICAgICAgICBjb25zdCBwcmVmYWJSZXN1bHQgPSBhd2FpdCB0aGlzLnByZWZhYlRvb2xzLmV4ZWN1dGUoJ3ByZWZhYl9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogcm9vdFV1aWQsXG4gICAgICAgICAgICAgICAgc2F2ZVBhdGgsXG4gICAgICAgICAgICAgICAgcHJlZmFiTmFtZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlQ2hpbGRyZW46IHRydWUsXG4gICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHRydWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmIChwcmVmYWJSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHByZWZhYlBhdGggPSBzYXZlUGF0aDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYEZhaWxlZCB0byBzYXZlIHByZWZhYiBhdCAke3NhdmVQYXRofTogJHtwcmVmYWJSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6ICEhcm9vdFV1aWQsXG4gICAgICAgICAgICBtZXNzYWdlOiBgQnVpbHQgVUkgJyR7c3BlYy5uYW1lfScgd2l0aCAke2N0eC5jcmVhdGVkTm9kZVV1aWRzLmxlbmd0aH0gbm9kZShzKSR7Y3R4Lndhcm5pbmdzLmxlbmd0aCA+IDAgPyBgICgke2N0eC53YXJuaW5ncy5sZW5ndGh9IHdhcm5pbmcocykpYCA6ICcnfWAsXG4gICAgICAgICAgICB3YXJuaW5nOiBjdHgud2FybmluZ3MubGVuZ3RoID4gMCA/IGN0eC53YXJuaW5ncy5qb2luKCdcXG4nKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICByb290VXVpZCxcbiAgICAgICAgICAgICAgICBjcmVhdGVkTm9kZVV1aWRzOiBjdHguY3JlYXRlZE5vZGVVdWlkcyxcbiAgICAgICAgICAgICAgICBwcmVmYWJQYXRoLFxuICAgICAgICAgICAgICAgIHdhcm5pbmdDb3VudDogY3R4Lndhcm5pbmdzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBhdXRvRGV0ZWN0ZWRTaXplLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZldGNoRGVzaWduUmVzb2x1dGlvbigpOiBQcm9taXNlPHsgd2lkdGg6IG51bWJlcjsgaGVpZ2h0OiBudW1iZXIgfSB8IHVuZGVmaW5lZD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29uZmlnOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdwcm9qZWN0JywgJ3F1ZXJ5LWNvbmZpZycsICdwcm9qZWN0Jyk7XG4gICAgICAgICAgICBjb25zdCBjYW5kaWRhdGVzOiBBcnJheTx7IHdpZHRoOiB1bmtub3duOyBoZWlnaHQ6IHVua25vd24gfSB8IHVuZGVmaW5lZD4gPSBbXG4gICAgICAgICAgICAgICAgY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25SZXNvbHV0aW9uLFxuICAgICAgICAgICAgICAgIGNvbmZpZz8ucHJldmlldz8uZGVzaWduX3Jlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgeyB3aWR0aDogY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25fd2lkdGgsIGhlaWdodDogY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25faGVpZ2h0IH0sXG4gICAgICAgICAgICAgICAgY29uZmlnPy5nZW5lcmFsPy5kZXNpZ25SZXNvbHV0aW9uLFxuICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgYyBvZiBjYW5kaWRhdGVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdyA9IE51bWJlcihjPy53aWR0aCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaCA9IE51bWJlcihjPy5oZWlnaHQpO1xuICAgICAgICAgICAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUodykgJiYgTnVtYmVyLmlzRmluaXRlKGgpICYmIHcgPiAwICYmIGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHdpZHRoOiB3LCBoZWlnaHQ6IGggfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGB1aS1idWlsZGVyOiBmYWlsZWQgdG8gZmV0Y2ggZGVzaWduIHJlc29sdXRpb246ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gZXJyb3J9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkTm9kZShzcGVjOiBVSVNwZWMsIHBhcmVudFV1aWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoIXNwZWMubmFtZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFdmVyeSBVSVNwZWMgbm9kZSBtdXN0IGhhdmUgYSBuYW1lJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjcmVhdGVSZXN1bHQgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiBzcGVjLm5hbWUsXG4gICAgICAgICAgICBwYXJlbnRVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjcmVhdGVSZXN1bHQuc3VjY2VzcyB8fCAhY3JlYXRlUmVzdWx0LmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBub2RlICcke3NwZWMubmFtZX0nOiAke2NyZWF0ZVJlc3VsdC5lcnJvciA/PyAnbm8gdXVpZCByZXR1cm5lZCd9YCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdXVpZDogc3RyaW5nID0gY3JlYXRlUmVzdWx0LmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaCh1dWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudFR5cGUgb2YgdGhpcy5jb21wb25lbnRzRm9yU2VtYW50aWNUeXBlKHNwZWMudHlwZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZFJlc3VsdCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGFkZCAke2NvbXBvbmVudFR5cGV9OiAke2FkZFJlc3VsdC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5U3ByaXRlRnJhbWVEZWZhdWx0KHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlUcmFuc2Zvcm1CYXNpY3ModXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVNlbWFudGljUHJvcHModXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVJhd0NvbXBvbmVudHModXVpZCwgc3BlYy5jb21wb25lbnRzLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5UHJlc2V0KHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlXaWRnZXRPdmVycmlkZSh1dWlkLCBzcGVjLCBjdHgpO1xuXG4gICAgICAgIGlmIChzcGVjLnR5cGUgPT09ICdCdXR0b24nKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmJ1aWxkQnV0dG9uTGFiZWxDaGlsZCh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHNwZWMuYWN0aXZlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfdHJhbnNmb3JtJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ3NldF9wcm9wZXJ0eScsXG4gICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0eTogJ2FjdGl2ZScsXG4gICAgICAgICAgICAgICAgdmFsdWU6IGZhbHNlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0uYWN0aXZlPWZhbHNlOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGNoaWxkUGFyZW50VXVpZCA9IHV1aWQ7XG4gICAgICAgIGlmIChzcGVjLnR5cGUgPT09ICdTY3JvbGxWaWV3Jykge1xuICAgICAgICAgICAgY2hpbGRQYXJlbnRVdWlkID0gYXdhaXQgdGhpcy5idWlsZFNjcm9sbFZpZXdTY2FmZm9sZCh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc3BlYy5jaGlsZHJlbikpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygc3BlYy5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuYnVpbGROb2RlKGNoaWxkLCBjaGlsZFBhcmVudFV1aWQsIGN0eCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgQ2hpbGQgJyR7Y2hpbGQ/Lm5hbWUgPz8gJzx1bm5hbWVkPid9JyB1bmRlciAnJHtzcGVjLm5hbWV9JzogJHtlcnJvcj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB1dWlkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlXaWRnZXRPdmVycmlkZSh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3Qgd2lkZ2V0OiBVSVdpZGdldFNwZWMgfCB1bmRlZmluZWQgPSBzcGVjLndpZGdldDtcbiAgICAgICAgaWYgKCF3aWRnZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBlbnN1cmVkID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLldpZGdldCcsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWVuc3VyZWQuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBlbnN1cmUgY2MuV2lkZ2V0OiAke2Vuc3VyZWQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpZWxkczogQXJyYXk8W2tleW9mIFVJV2lkZ2V0U3BlYywgc3RyaW5nLCBzdHJpbmddPiA9IFtcbiAgICAgICAgICAgIFsndG9wJywgJ2lzQWxpZ25Ub3AnLCAndG9wJ10sXG4gICAgICAgICAgICBbJ2JvdHRvbScsICdpc0FsaWduQm90dG9tJywgJ2JvdHRvbSddLFxuICAgICAgICAgICAgWydsZWZ0JywgJ2lzQWxpZ25MZWZ0JywgJ2xlZnQnXSxcbiAgICAgICAgICAgIFsncmlnaHQnLCAnaXNBbGlnblJpZ2h0JywgJ3JpZ2h0J10sXG4gICAgICAgICAgICBbJ2hvcml6b250YWxDZW50ZXInLCAnaXNBbGlnbkhvcml6b250YWxDZW50ZXInLCAnaG9yaXpvbnRhbENlbnRlciddLFxuICAgICAgICAgICAgWyd2ZXJ0aWNhbENlbnRlcicsICdpc0FsaWduVmVydGljYWxDZW50ZXInLCAndmVydGljYWxDZW50ZXInXSxcbiAgICAgICAgXTtcbiAgICAgICAgZm9yIChjb25zdCBbc3BlY0ZpZWxkLCBhbGlnbkZsYWcsIHZhbHVlRmllbGRdIG9mIGZpZWxkcykge1xuICAgICAgICAgICAgY29uc3QgdiA9IHdpZGdldFtzcGVjRmllbGRdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2ID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuV2lkZ2V0JywgYWxpZ25GbGFnLCAnYm9vbGVhbicsIHRydWUsIGN0eCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCB2YWx1ZUZpZWxkLCAnbnVtYmVyJywgdiwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAod2lkZ2V0LmFsaWduTW9kZSkge1xuICAgICAgICAgICAgY29uc3QgbWFwOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBPTkNFOiAwLCBPTl9XSU5ET1dfUkVTSVpFOiAxLCBBTFdBWVM6IDIgfTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuV2lkZ2V0JywgJ2FsaWduTW9kZScsICdpbnRlZ2VyJywgbWFwW3dpZGdldC5hbGlnbk1vZGVdLCBjdHgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBidWlsZFNjcm9sbFZpZXdTY2FmZm9sZChyb290VXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICAgICAgY29uc3Qgdmlld1Jlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICd2aWV3JyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IHJvb3RVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCF2aWV3UmVzdWx0LnN1Y2Nlc3MgfHwgIXZpZXdSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBTY3JvbGxWaWV3OiBmYWlsZWQgdG8gY3JlYXRlIHZpZXcgbm9kZWApO1xuICAgICAgICAgICAgcmV0dXJuIHJvb3RVdWlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHZpZXdVdWlkOiBzdHJpbmcgPSB2aWV3UmVzdWx0LmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaCh2aWV3VXVpZCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnRUeXBlIG9mIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTWFzayddKSB7XG4gICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSB2aWV3IGFkZCAke2NvbXBvbmVudFR5cGV9OiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB2aWV3VXVpZCxcbiAgICAgICAgICAgIHByZXNldDogJ2Z1bGxfc3RyZXRjaCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGNvbnRlbnRSZXN1bHQgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiAnY29udGVudCcsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiB2aWV3VXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY29udGVudFJlc3VsdC5zdWNjZXNzIHx8ICFjb250ZW50UmVzdWx0LmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gU2Nyb2xsVmlldzogZmFpbGVkIHRvIGNyZWF0ZSBjb250ZW50IG5vZGVgKTtcbiAgICAgICAgICAgIHJldHVybiB2aWV3VXVpZDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb250ZW50VXVpZDogc3RyaW5nID0gY29udGVudFJlc3VsdC5kYXRhLnV1aWQ7XG4gICAgICAgIGN0eC5jcmVhdGVkTm9kZVV1aWRzLnB1c2goY29udGVudFV1aWQpO1xuXG4gICAgICAgIGNvbnN0IGVuc3VyZUNvbnRlbnQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgbm9kZVV1aWQ6IGNvbnRlbnRVdWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZTogJ2NjLlVJVHJhbnNmb3JtJyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZW5zdXJlQ29udGVudC5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGNvbnRlbnQgYWRkIGNjLlVJVHJhbnNmb3JtOiAke2Vuc3VyZUNvbnRlbnQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgc2Nyb2xsTGF5b3V0ID0gc3BlYy5zY3JvbGxMYXlvdXQ7XG4gICAgICAgIGlmIChzY3JvbGxMYXlvdXQpIHtcbiAgICAgICAgICAgIGNvbnN0IGVuc3VyZUxheW91dCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBjb250ZW50VXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuTGF5b3V0JyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFlbnN1cmVMYXlvdXQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gY29udGVudCBhZGQgY2MuTGF5b3V0OiAke2Vuc3VyZUxheW91dC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBsYXlvdXRUeXBlID0gc2Nyb2xsTGF5b3V0ID09PSAnaG9yaXpvbnRhbCcgPyAxIDogc2Nyb2xsTGF5b3V0ID09PSAnZ3JpZCcgPyAzIDogMjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChjb250ZW50VXVpZCwgJ2NjLkxheW91dCcsICd0eXBlJywgJ2ludGVnZXInLCBsYXlvdXRUeXBlLCBjdHgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGNvbnRlbnRVdWlkLCAnY2MuTGF5b3V0JywgJ3Jlc2l6ZU1vZGUnLCAnaW50ZWdlcicsIDEsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3Aocm9vdFV1aWQsICdjYy5TY3JvbGxWaWV3JywgJ2NvbnRlbnQnLCAnbm9kZScsIGNvbnRlbnRVdWlkLCBjdHgpO1xuXG4gICAgICAgIGNvbnN0IGlzSG9yaXpvbnRhbCA9IHNjcm9sbExheW91dCA9PT0gJ2hvcml6b250YWwnO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3Aocm9vdFV1aWQsICdjYy5TY3JvbGxWaWV3JywgJ2hvcml6b250YWwnLCAnYm9vbGVhbicsIGlzSG9yaXpvbnRhbCwgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHJvb3RVdWlkLCAnY2MuU2Nyb2xsVmlldycsICd2ZXJ0aWNhbCcsICdib29sZWFuJywgIWlzSG9yaXpvbnRhbCwgY3R4KTtcblxuICAgICAgICByZXR1cm4gY29udGVudFV1aWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb21wb25lbnRzRm9yU2VtYW50aWNUeXBlKHR5cGU6IFVJU2VtYW50aWNUeXBlIHwgdW5kZWZpbmVkKTogc3RyaW5nW10ge1xuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ1BhbmVsJzpcbiAgICAgICAgICAgIGNhc2UgJ0ltYWdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5TcHJpdGUnXTtcbiAgICAgICAgICAgIGNhc2UgJ0xhYmVsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5MYWJlbCddO1xuICAgICAgICAgICAgY2FzZSAnQnV0dG9uJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5TcHJpdGUnLCAnY2MuQnV0dG9uJ107XG4gICAgICAgICAgICBjYXNlICdJbnB1dCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuRWRpdEJveCddO1xuICAgICAgICAgICAgY2FzZSAnU2Nyb2xsVmlldyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuU2Nyb2xsVmlldyddO1xuICAgICAgICAgICAgY2FzZSAnTGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGF5b3V0J107XG4gICAgICAgICAgICBjYXNlICdOb2RlJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIFsnY2MuVUlUcmFuc2Zvcm0nXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlUcmFuc2Zvcm1CYXNpY3ModXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmIChzcGVjLnNpemUgJiYgc3BlYy5zaXplLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3dpZHRoLCBoZWlnaHRdID0gc3BlYy5zaXplO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5VSVRyYW5zZm9ybScsICdjb250ZW50U2l6ZScsICdzaXplJywgeyB3aWR0aCwgaGVpZ2h0IH0sIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNwZWMuYW5jaG9yICYmIHNwZWMuYW5jaG9yLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5hbmNob3I7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2FuY2hvclBvaW50JywgJ3ZlYzInLCB7IHgsIHkgfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlYy5wb3NpdGlvbiAmJiBzcGVjLnBvc2l0aW9uLmxlbmd0aCA9PT0gMikge1xuICAgICAgICAgICAgY29uc3QgW3gsIHldID0gc3BlYy5wb3NpdGlvbjtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX3RyYW5zZm9ybScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdzZXRfdHJhbnNmb3JtJyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHgsIHksIHo6IDAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9LnBvc2l0aW9uOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVNwcml0ZUZyYW1lRGVmYXVsdCh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHNwZWMudHlwZTtcbiAgICAgICAgaWYgKHR5cGUgIT09ICdQYW5lbCcgJiYgdHlwZSAhPT0gJ0ltYWdlJyAmJiB0eXBlICE9PSAnQnV0dG9uJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGJhY2tncm91bmQgPSBzcGVjLnByb3BzPy5iYWNrZ3JvdW5kO1xuICAgICAgICBpZiAoIWJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlNwcml0ZScsICdzcHJpdGVGcmFtZScsICdzcHJpdGVGcmFtZScsIGF3YWl0IHRoaXMucmVzb2x2ZUFzc2V0VXVpZChiYWNrZ3JvdW5kKSwgY3R4KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkQnV0dG9uTGFiZWxDaGlsZChidXR0b25VdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzcGVjLnByb3BzID8/IHt9O1xuICAgICAgICBpZiAocHJvcHMudGV4dCA9PT0gdW5kZWZpbmVkICYmIHByb3BzLmZvbnRTaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjcmVhdGUgPSBhd2FpdCB0aGlzLm5vZGVUb29scy5leGVjdXRlKCdub2RlX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2NyZWF0ZScsXG4gICAgICAgICAgICBuYW1lOiAnTGFiZWwnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogYnV0dG9uVXVpZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghY3JlYXRlLnN1Y2Nlc3MgfHwgIWNyZWF0ZS5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGJ1dHRvbiBsYWJlbCBjaGlsZDogJHtjcmVhdGUuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxhYmVsVXVpZDogc3RyaW5nID0gY3JlYXRlLmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChsYWJlbFV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogbGFiZWxVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBsYWJlbCBhZGQgJHtjb21wb25lbnRUeXBlfTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnc3RyaW5nJywgJ3N0cmluZycsIFN0cmluZyhwcm9wcy50ZXh0KSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGxhYmVsVXVpZCwgJ2NjLkxhYmVsJywgJ2ZvbnRTaXplJywgJ251bWJlcicsIE51bWJlcihwcm9wcy5mb250U2l6ZSksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BzLmNvbG9yKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnY29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLmNvbG9yKSwgY3R4KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlTZW1hbnRpY1Byb3BzKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0eXBlID0gc3BlYy50eXBlO1xuICAgICAgICBjb25zdCBwcm9wcyA9IHNwZWMucHJvcHMgPz8ge307XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMudGV4dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMuZm9udFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYWJlbCcsICdmb250U2l6ZScsICdudW1iZXInLCBOdW1iZXIocHJvcHMuZm9udFNpemUpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnTGFiZWwnICYmIHByb3BzLmNvbG9yKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoKHR5cGUgPT09ICdQYW5lbCcgfHwgdHlwZSA9PT0gJ0ltYWdlJyB8fCB0eXBlID09PSAnQnV0dG9uJykgJiYgcHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ2NvbG9yJywgJ2NvbG9yJywgdGhpcy5ub3JtYWxpemVDb2xvcihwcm9wcy5jb2xvciksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gJ0lucHV0JyAmJiBwcm9wcy5wbGFjZWhvbGRlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkVkaXRCb3gnLCAncGxhY2Vob2xkZXInLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnBsYWNlaG9sZGVyKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gJ0lucHV0JyAmJiBwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMaXN0JyAmJiBwcm9wcy5sYXlvdXRUeXBlKSB7XG4gICAgICAgICAgICBjb25zdCBsYXlvdXRWYWx1ZSA9IExBWU9VVF9UWVBFX01BUFtwcm9wcy5sYXlvdXRUeXBlXTtcbiAgICAgICAgICAgIGlmIChsYXlvdXRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5MYXlvdXQnLCAndHlwZScsICdpbnRlZ2VyJywgbGF5b3V0VmFsdWUsIGN0eCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UmF3Q29tcG9uZW50cyh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudHM6IENvbXBvbmVudFNwZWNbXSB8IHVuZGVmaW5lZCwgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGNvbXBvbmVudHMpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBvbmVudHMpIHtcbiAgICAgICAgICAgIGlmICghY29tcD8udHlwZSkge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBSYXcgY29tcG9uZW50IG1pc3NpbmcgJ3R5cGUnIGZpZWxkOyBza2lwcGVkYCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLnR5cGUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgYWRkICR7Y29tcC50eXBlfTogJHthZGRSZXN1bHQuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbXAucHJvcHMgJiYgdHlwZW9mIGNvbXAucHJvcHMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcGVydHksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhjb21wLnByb3BzKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVR5cGUgPSB0aGlzLmluZmVyUHJvcGVydHlUeXBlKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxWYWx1ZSA9IHByb3BlcnR5VHlwZSA9PT0gJ2NvbG9yJyA/IHRoaXMubm9ybWFsaXplQ29sb3IodmFsdWUgYXMgVUlDb2xvcikgOiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsIGNvbXAudHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgZmluYWxWYWx1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5UHJlc2V0KHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIXNwZWMucHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbWFyZ2lucyA9IHNwZWMubWFyZ2lucyA/PyB7fTtcbiAgICAgICAgY29uc3Qgc3BhY2luZyA9IHNwZWMuc3BhY2luZyA/PyB7fTtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgndWlfYXBwbHlfcmVzcG9uc2l2ZV9kZWZhdWx0cycsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgcHJlc2V0OiBzcGVjLnByZXNldCxcbiAgICAgICAgICAgIG1hcmdpbkxlZnQ6IG1hcmdpbnMubGVmdCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luUmlnaHQ6IG1hcmdpbnMucmlnaHQgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpblRvcDogbWFyZ2lucy50b3AgPz8gMCxcbiAgICAgICAgICAgIG1hcmdpbkJvdHRvbTogbWFyZ2lucy5ib3R0b20gPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdYOiBzcGFjaW5nLnggPz8gMCxcbiAgICAgICAgICAgIHNwYWNpbmdZOiBzcGFjaW5nLnkgPz8gMCxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHByZXNldCAnJHtzcGVjLnByZXNldH0nOiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wKFxuICAgICAgICB1dWlkOiBzdHJpbmcsXG4gICAgICAgIGNvbXBvbmVudFR5cGU6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHk6IHN0cmluZyxcbiAgICAgICAgcHJvcGVydHlUeXBlOiBzdHJpbmcsXG4gICAgICAgIHZhbHVlOiB1bmtub3duLFxuICAgICAgICBjdHg6IEJ1aWxkQ29udGV4dCxcbiAgICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnc2V0X2NvbXBvbmVudF9wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIHByb3BlcnR5LFxuICAgICAgICAgICAgcHJvcGVydHlUeXBlLFxuICAgICAgICAgICAgdmFsdWUsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc29sdmVBc3NldFV1aWQocmVmOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBpZiAoIXJlZi5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVmO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1dWlkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHJlZik7XG4gICAgICAgICAgICBpZiAodXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1dWlkIGFzIHN0cmluZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGxvZ2dlci53YXJuKGBGYWlsZWQgdG8gcmVzb2x2ZSBhc3NldCAnJHtyZWZ9JzogJHsoZXJyb3IgYXMgYW55KT8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZWY7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBub3JtYWxpemVDb2xvcihjb2xvcjogVUlDb2xvciB8IHVua25vd24pOiB7IHI6IG51bWJlcjsgZzogbnVtYmVyOyBiOiBudW1iZXI7IGE6IG51bWJlciB9IHtcbiAgICAgICAgY29uc3QgYyA9IChjb2xvciA/PyB7fSkgYXMgUGFydGlhbDxVSUNvbG9yPjtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHI6IE51bWJlcihjLnIgPz8gMjU1KSxcbiAgICAgICAgICAgIGc6IE51bWJlcihjLmcgPz8gMjU1KSxcbiAgICAgICAgICAgIGI6IE51bWJlcihjLmIgPz8gMjU1KSxcbiAgICAgICAgICAgIGE6IE51bWJlcihjLmEgPz8gMjU1KSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGluZmVyUHJvcGVydHlUeXBlKHZhbHVlOiB1bmtub3duKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgcmV0dXJuICdudW1iZXInO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgcmV0dXJuICdib29sZWFuJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiAnc3RyaW5nQXJyYXknO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBjb25zdCBvID0gdmFsdWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gICAgICAgICAgICBpZiAoJ3InIGluIG8gJiYgJ2cnIGluIG8gJiYgJ2InIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ2NvbG9yJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgnd2lkdGgnIGluIG8gJiYgJ2hlaWdodCcgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnc2l6ZSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJ3gnIGluIG8gJiYgJ3knIGluIG8gJiYgJ3onIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlYzMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCd4JyBpbiBvICYmICd5JyBpbiBvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd2ZWMyJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJ3N0cmluZyc7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJlZmFiTmFtZShwYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vXSs/KVxcLnByZWZhYiQvLmV4ZWMocGF0aCk7XG4gICAgICAgIHJldHVybiBtYXRjaD8uWzFdO1xuICAgIH1cbn1cbiJdfQ==