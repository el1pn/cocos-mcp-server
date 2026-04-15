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
                description: 'Build a UI node hierarchy declaratively from a UISpec JSON tree. Expands semantic types (Button, Label, Image, Panel, Input, ScrollView, List) into component combos, applies presets (full_stretch, top_bar, bottom_bar, vertical_list, horizontal_list), and sets sizes/anchors/props in a single call. Optionally saves the result as a prefab. Returns root UUID and all created node UUIDs.',
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
            success: ctx.warnings.length === 0,
            message: `Built UI '${spec.name}' with ${ctx.createdNodeUuids.length} node(s)`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWktYnVpbGRlci10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy91aS1idWlsZGVyLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhDQU8wQjtBQUMxQiw2Q0FBeUM7QUFDekMsdURBQW1EO0FBQ25ELGlEQUE2QztBQUM3Qyw0REFBd0Q7QUFDeEQsc0NBQW1DO0FBRW5DLE1BQU0sZUFBZSxHQUEyQjtJQUM1QyxJQUFJLEVBQUUsQ0FBQztJQUNQLFVBQVUsRUFBRSxDQUFDO0lBQ2IsUUFBUSxFQUFFLENBQUM7SUFDWCxJQUFJLEVBQUUsQ0FBQztDQUNWLENBQUM7QUFPRixNQUFhLGNBQWM7SUFBM0I7UUFDWSxjQUFTLEdBQUcsSUFBSSxzQkFBUyxFQUFFLENBQUM7UUFDNUIsbUJBQWMsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztRQUN0QyxnQkFBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0lBc2lCNUMsQ0FBQztJQXBpQkcsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQ1Asa1lBQWtZO2dCQUN0WSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxnQ0FDQyw2QkFBbUIsS0FDdEIsV0FBVyxFQUNQLGtRQUFrUSxHQUNsUTt3QkFDUixVQUFVLEVBQUU7NEJBQ1IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlEQUFpRDt5QkFDakU7d0JBQ0QsWUFBWSxFQUFFOzRCQUNWLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx3SUFBd0k7eUJBQ3hKO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztpQkFDckI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElB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QUFJLE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE9BQU8sU0FBUyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixPQUFPLGFBQWEsQ0FBQztRQUN6QixDQUFDO1FBQ0QsSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsTUFBTSxDQUFDLEdBQUcsS0FBZ0MsQ0FBQztZQUMzQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sT0FBTyxDQUFDO1lBQ25CLENBQUM7WUFDRCxJQUFJLE9BQU8sSUFBSSxDQUFDLElBQUksUUFBUSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDO1lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNuQyxPQUFPLE1BQU0sQ0FBQztZQUNsQixDQUFDO1lBQ0QsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxNQUFNLENBQUM7WUFDbEIsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQztJQUNwQixDQUFDO0lBRU8saUJBQWlCLENBQUMsSUFBWTtRQUNsQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0MsT0FBTyxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdEIsQ0FBQztDQUNKO0FBemlCRCx3Q0F5aUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtcbiAgICBVSVNwZWMsXG4gICAgVUlTZW1hbnRpY1R5cGUsXG4gICAgVUlDb2xvcixcbiAgICBVSVdpZGdldFNwZWMsXG4gICAgQ29tcG9uZW50U3BlYyxcbiAgICBVSV9TUEVDX0pTT05fU0NIRU1BLFxufSBmcm9tICcuLi90eXBlcy91aS1zcGVjJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gJy4uL2xvZ2dlcic7XG5cbmNvbnN0IExBWU9VVF9UWVBFX01BUDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcbiAgICBOT05FOiAwLFxuICAgIEhPUklaT05UQUw6IDEsXG4gICAgVkVSVElDQUw6IDIsXG4gICAgR1JJRDogMyxcbn07XG5cbmludGVyZmFjZSBCdWlsZENvbnRleHQge1xuICAgIGNyZWF0ZWROb2RlVXVpZHM6IHN0cmluZ1tdO1xuICAgIHdhcm5pbmdzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFVJQnVpbGRlclRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIG5vZGVUb29scyA9IG5ldyBOb2RlVG9vbHMoKTtcbiAgICBwcml2YXRlIGNvbXBvbmVudFRvb2xzID0gbmV3IENvbXBvbmVudFRvb2xzKCk7XG4gICAgcHJpdmF0ZSBwcmVmYWJUb29scyA9IG5ldyBQcmVmYWJUb29scygpO1xuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3VpX2J1aWxkX2Zyb21fc3BlYycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdCdWlsZCBhIFVJIG5vZGUgaGllcmFyY2h5IGRlY2xhcmF0aXZlbHkgZnJvbSBhIFVJU3BlYyBKU09OIHRyZWUuIEV4cGFuZHMgc2VtYW50aWMgdHlwZXMgKEJ1dHRvbiwgTGFiZWwsIEltYWdlLCBQYW5lbCwgSW5wdXQsIFNjcm9sbFZpZXcsIExpc3QpIGludG8gY29tcG9uZW50IGNvbWJvcywgYXBwbGllcyBwcmVzZXRzIChmdWxsX3N0cmV0Y2gsIHRvcF9iYXIsIGJvdHRvbV9iYXIsIHZlcnRpY2FsX2xpc3QsIGhvcml6b250YWxfbGlzdCksIGFuZCBzZXRzIHNpemVzL2FuY2hvcnMvcHJvcHMgaW4gYSBzaW5nbGUgY2FsbC4gT3B0aW9uYWxseSBzYXZlcyB0aGUgcmVzdWx0IGFzIGEgcHJlZmFiLiBSZXR1cm5zIHJvb3QgVVVJRCBhbmQgYWxsIGNyZWF0ZWQgbm9kZSBVVUlEcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGVjOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLi4uVUlfU1BFQ19KU09OX1NDSEVNQSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ1VJU3BlYyB0cmVlLiBFYWNoIG5vZGUgaGFzOiBuYW1lIChyZXF1aXJlZCksIG9wdGlvbmFsIHR5cGUgKHNlbWFudGljIHNob3J0Y3V0KSwgcHJlc2V0LCBzaXplIFt3LGhdLCBhbmNob3IgW3gseV0sIHBvc2l0aW9uIFt4LHldLCBwcm9wcyAodGV4dC9jb2xvci9iYWNrZ3JvdW5kL29uQ2xpY2svbGF5b3V0VHlwZSksIGNvbXBvbmVudHNbXSAoZXNjYXBlIGhhdGNoIGZvciByYXcgY2MuKiBjb21wb25lbnRzKSwgY2hpbGRyZW5bXSAocmVjdXJzaXZlKS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSBhcyBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlELiBPbWl0IHRvIGNyZWF0ZSBhdCBzY2VuZSByb290LicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUFzUHJlZmFiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcHRpb25hbCBwcmVmYWIgc2F2ZSBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMvU2hvcFNjcmVlbi5wcmVmYWIuIElmIHNldCwgdGhlIGJ1aWx0IHJvb3QgaXMgc2F2ZWQgYXMgYSBwcmVmYWIgYWZ0ZXIgY29uc3RydWN0aW9uLicsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydzcGVjJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAodG9vbE5hbWUgIT09ICd1aV9idWlsZF9mcm9tX3NwZWMnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5idWlsZEZyb21TcGVjKGFyZ3MpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRGcm9tU3BlYyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzcGVjOiBVSVNwZWMgfCB1bmRlZmluZWQgPSBhcmdzPy5zcGVjO1xuICAgICAgICBpZiAoIXNwZWMgfHwgdHlwZW9mIHNwZWMgIT09ICdvYmplY3QnIHx8ICFzcGVjLm5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3Npbmcgb3IgaW52YWxpZCBzcGVjOiBhIFVJU3BlYyBvYmplY3Qgd2l0aCBhdCBsZWFzdCBhIFwibmFtZVwiIGZpZWxkIGlzIHJlcXVpcmVkLicgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN0eDogQnVpbGRDb250ZXh0ID0geyBjcmVhdGVkTm9kZVV1aWRzOiBbXSwgd2FybmluZ3M6IFtdIH07XG4gICAgICAgIGxldCBhdXRvRGV0ZWN0ZWRTaXplOiB7IHdpZHRoOiBudW1iZXI7IGhlaWdodDogbnVtYmVyIH0gfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmICghc3BlYy5zaXplIHx8IHNwZWMuc2l6ZS5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUgPSBhd2FpdCB0aGlzLmZldGNoRGVzaWduUmVzb2x1dGlvbigpO1xuICAgICAgICAgICAgaWYgKGF1dG9EZXRlY3RlZFNpemUpIHtcbiAgICAgICAgICAgICAgICBzcGVjLnNpemUgPSBbYXV0b0RldGVjdGVkU2l6ZS53aWR0aCwgYXV0b0RldGVjdGVkU2l6ZS5oZWlnaHRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCByb290VXVpZDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcm9vdFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkTm9kZShzcGVjLCBhcmdzPy5wYXJlbnRVdWlkLCBjdHgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiBgRmFpbGVkIHRvIGJ1aWxkIFVJIHNwZWM6ICR7ZXJyb3I/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycm9yKX1gLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY3JlYXRlZE5vZGVVdWlkczogY3R4LmNyZWF0ZWROb2RlVXVpZHMsIHdhcm5pbmdzOiBjdHgud2FybmluZ3MgfSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcHJlZmFiUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAoYXJncz8uc2F2ZUFzUHJlZmFiICYmIHR5cGVvZiBhcmdzLnNhdmVBc1ByZWZhYiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBhcmdzLnNhdmVBc1ByZWZhYiBhcyBzdHJpbmc7XG4gICAgICAgICAgICBjb25zdCBwcmVmYWJOYW1lID0gdGhpcy5leHRyYWN0UHJlZmFiTmFtZShwYXRoKSA/PyBzcGVjLm5hbWU7XG4gICAgICAgICAgICBjb25zdCBzYXZlUGF0aCA9IHBhdGguZW5kc1dpdGgoJy5wcmVmYWInKSA/IHBhdGggOiBgJHtwYXRoLnJlcGxhY2UoL1xcLyQvLCAnJyl9LyR7cHJlZmFiTmFtZX0ucHJlZmFiYDtcbiAgICAgICAgICAgIGNvbnN0IHByZWZhYlJlc3VsdCA9IGF3YWl0IHRoaXMucHJlZmFiVG9vbHMuZXhlY3V0ZSgncHJlZmFiX2xpZmVjeWNsZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiByb290VXVpZCxcbiAgICAgICAgICAgICAgICBzYXZlUGF0aCxcbiAgICAgICAgICAgICAgICBwcmVmYWJOYW1lLFxuICAgICAgICAgICAgICAgIGluY2x1ZGVDaGlsZHJlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogdHJ1ZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKHByZWZhYlJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcHJlZmFiUGF0aCA9IHNhdmVQYXRoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgRmFpbGVkIHRvIHNhdmUgcHJlZmFiIGF0ICR7c2F2ZVBhdGh9OiAke3ByZWZhYlJlc3VsdC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogY3R4Lndhcm5pbmdzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBCdWlsdCBVSSAnJHtzcGVjLm5hbWV9JyB3aXRoICR7Y3R4LmNyZWF0ZWROb2RlVXVpZHMubGVuZ3RofSBub2RlKHMpYCxcbiAgICAgICAgICAgIHdhcm5pbmc6IGN0eC53YXJuaW5ncy5sZW5ndGggPiAwID8gY3R4Lndhcm5pbmdzLmpvaW4oJ1xcbicpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHJvb3RVdWlkLFxuICAgICAgICAgICAgICAgIGNyZWF0ZWROb2RlVXVpZHM6IGN0eC5jcmVhdGVkTm9kZVV1aWRzLFxuICAgICAgICAgICAgICAgIHByZWZhYlBhdGgsXG4gICAgICAgICAgICAgICAgd2FybmluZ0NvdW50OiBjdHgud2FybmluZ3MubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGF1dG9EZXRlY3RlZFNpemUsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZmV0Y2hEZXNpZ25SZXNvbHV0aW9uKCk6IFByb21pc2U8eyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9IHwgdW5kZWZpbmVkPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb25maWc6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3Byb2plY3QnLCAncXVlcnktY29uZmlnJywgJ3Byb2plY3QnKTtcbiAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZXM6IEFycmF5PHsgd2lkdGg6IHVua25vd247IGhlaWdodDogdW5rbm93biB9IHwgdW5kZWZpbmVkPiA9IFtcbiAgICAgICAgICAgICAgICBjb25maWc/LnByZXZpZXc/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICAgICAgY29uZmlnPy5wcmV2aWV3Py5kZXNpZ25fcmVzb2x1dGlvbixcbiAgICAgICAgICAgICAgICB7IHdpZHRoOiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl93aWR0aCwgaGVpZ2h0OiBjb25maWc/LnByZXZpZXc/LmRlc2lnbl9oZWlnaHQgfSxcbiAgICAgICAgICAgICAgICBjb25maWc/LmdlbmVyYWw/LmRlc2lnblJlc29sdXRpb24sXG4gICAgICAgICAgICBdO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB3ID0gTnVtYmVyKGM/LndpZHRoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoID0gTnVtYmVyKGM/LmhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZSh3KSAmJiBOdW1iZXIuaXNGaW5pdGUoaCkgJiYgdyA+IDAgJiYgaCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgd2lkdGg6IHcsIGhlaWdodDogaCB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oYHVpLWJ1aWxkZXI6IGZhaWxlZCB0byBmZXRjaCBkZXNpZ24gcmVzb2x1dGlvbjogJHtlcnJvcj8ubWVzc2FnZSA/PyBlcnJvcn1gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGROb2RlKHNwZWM6IFVJU3BlYywgcGFyZW50VXVpZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGlmICghc3BlYy5uYW1lKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0V2ZXJ5IFVJU3BlYyBub2RlIG11c3QgaGF2ZSBhIG5hbWUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNyZWF0ZVJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6IHNwZWMubmFtZSxcbiAgICAgICAgICAgIHBhcmVudFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIWNyZWF0ZVJlc3VsdC5zdWNjZXNzIHx8ICFjcmVhdGVSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIG5vZGUgJyR7c3BlYy5uYW1lfSc6ICR7Y3JlYXRlUmVzdWx0LmVycm9yID8/ICdubyB1dWlkIHJldHVybmVkJ31gKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1dWlkOiBzdHJpbmcgPSBjcmVhdGVSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHV1aWQpO1xuXG4gICAgICAgIGZvciAoY29uc3QgY29tcG9uZW50VHlwZSBvZiB0aGlzLmNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUoc3BlYy50eXBlKSkge1xuICAgICAgICAgICAgY29uc3QgYWRkUmVzdWx0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFhZGRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gYWRkICR7Y29tcG9uZW50VHlwZX06ICR7YWRkUmVzdWx0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlTcHJpdGVGcmFtZURlZmF1bHQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVRyYW5zZm9ybUJhc2ljcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5U2VtYW50aWNQcm9wcyh1dWlkLCBzcGVjLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGx5UmF3Q29tcG9uZW50cyh1dWlkLCBzcGVjLmNvbXBvbmVudHMsIGN0eCk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwbHlQcmVzZXQodXVpZCwgc3BlYywgY3R4KTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBseVdpZGdldE92ZXJyaWRlKHV1aWQsIHNwZWMsIGN0eCk7XG5cbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ0J1dHRvbicpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYnVpbGRCdXR0b25MYWJlbENoaWxkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3BlYy5hY3RpdmUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV90cmFuc2Zvcm0nLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnc2V0X3Byb3BlcnR5JyxcbiAgICAgICAgICAgICAgICB1dWlkLFxuICAgICAgICAgICAgICAgIHByb3BlcnR5OiAnYWN0aXZlJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZmFsc2UsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfS5hY3RpdmU9ZmFsc2U6ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgY2hpbGRQYXJlbnRVdWlkID0gdXVpZDtcbiAgICAgICAgaWYgKHNwZWMudHlwZSA9PT0gJ1Njcm9sbFZpZXcnKSB7XG4gICAgICAgICAgICBjaGlsZFBhcmVudFV1aWQgPSBhd2FpdCB0aGlzLmJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHV1aWQsIHNwZWMsIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzcGVjLmNoaWxkcmVuKSkge1xuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBzcGVjLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5idWlsZE5vZGUoY2hpbGQsIGNoaWxkUGFyZW50VXVpZCwgY3R4KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBDaGlsZCAnJHtjaGlsZD8ubmFtZSA/PyAnPHVubmFtZWQ+J30nIHVuZGVyICcke3NwZWMubmFtZX0nOiAke2Vycm9yPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHV1aWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVdpZGdldE92ZXJyaWRlKHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB3aWRnZXQ6IFVJV2lkZ2V0U3BlYyB8IHVuZGVmaW5lZCA9IHNwZWMud2lkZ2V0O1xuICAgICAgICBpZiAoIXdpZGdldCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVuc3VyZWQgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuV2lkZ2V0JyxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghZW5zdXJlZC5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGVuc3VyZSBjYy5XaWRnZXQ6ICR7ZW5zdXJlZC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmllbGRzOiBBcnJheTxba2V5b2YgVUlXaWRnZXRTcGVjLCBzdHJpbmcsIHN0cmluZ10+ID0gW1xuICAgICAgICAgICAgWyd0b3AnLCAnaXNBbGlnblRvcCcsICd0b3AnXSxcbiAgICAgICAgICAgIFsnYm90dG9tJywgJ2lzQWxpZ25Cb3R0b20nLCAnYm90dG9tJ10sXG4gICAgICAgICAgICBbJ2xlZnQnLCAnaXNBbGlnbkxlZnQnLCAnbGVmdCddLFxuICAgICAgICAgICAgWydyaWdodCcsICdpc0FsaWduUmlnaHQnLCAncmlnaHQnXSxcbiAgICAgICAgICAgIFsnaG9yaXpvbnRhbENlbnRlcicsICdpc0FsaWduSG9yaXpvbnRhbENlbnRlcicsICdob3Jpem9udGFsQ2VudGVyJ10sXG4gICAgICAgICAgICBbJ3ZlcnRpY2FsQ2VudGVyJywgJ2lzQWxpZ25WZXJ0aWNhbENlbnRlcicsICd2ZXJ0aWNhbENlbnRlciddLFxuICAgICAgICBdO1xuICAgICAgICBmb3IgKGNvbnN0IFtzcGVjRmllbGQsIGFsaWduRmxhZywgdmFsdWVGaWVsZF0gb2YgZmllbGRzKSB7XG4gICAgICAgICAgICBjb25zdCB2ID0gd2lkZ2V0W3NwZWNGaWVsZF07XG4gICAgICAgICAgICBpZiAodHlwZW9mIHYgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCBhbGlnbkZsYWcsICdib29sZWFuJywgdHJ1ZSwgY3R4KTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLldpZGdldCcsIHZhbHVlRmllbGQsICdudW1iZXInLCB2LCBjdHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICh3aWRnZXQuYWxpZ25Nb2RlKSB7XG4gICAgICAgICAgICBjb25zdCBtYXA6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7IE9OQ0U6IDAsIE9OX1dJTkRPV19SRVNJWkU6IDEsIEFMV0FZUzogMiB9O1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5XaWRnZXQnLCAnYWxpZ25Nb2RlJywgJ2ludGVnZXInLCBtYXBbd2lkZ2V0LmFsaWduTW9kZV0sIGN0eCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkU2Nyb2xsVmlld1NjYWZmb2xkKHJvb3RVdWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICBjb25zdCB2aWV3UmVzdWx0ID0gYXdhaXQgdGhpcy5ub2RlVG9vbHMuZXhlY3V0ZSgnbm9kZV9saWZlY3ljbGUnLCB7XG4gICAgICAgICAgICBhY3Rpb246ICdjcmVhdGUnLFxuICAgICAgICAgICAgbmFtZTogJ3ZpZXcnLFxuICAgICAgICAgICAgcGFyZW50VXVpZDogcm9vdFV1aWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXZpZXdSZXN1bHQuc3VjY2VzcyB8fCAhdmlld1Jlc3VsdC5kYXRhPy51dWlkKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IFNjcm9sbFZpZXc6IGZhaWxlZCB0byBjcmVhdGUgdmlldyBub2RlYCk7XG4gICAgICAgICAgICByZXR1cm4gcm9vdFV1aWQ7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgdmlld1V1aWQ6IHN0cmluZyA9IHZpZXdSZXN1bHQuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKHZpZXdVdWlkKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGNvbXBvbmVudFR5cGUgb2YgWydjYy5VSVRyYW5zZm9ybScsICdjYy5NYXNrJ10pIHtcbiAgICAgICAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLmNvbXBvbmVudFRvb2xzLmV4ZWN1dGUoJ2NvbXBvbmVudF9tYW5hZ2UnLCB7XG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWRkJyxcbiAgICAgICAgICAgICAgICBub2RlVXVpZDogdmlld1V1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IHZpZXcgYWRkICR7Y29tcG9uZW50VHlwZX06ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCd1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzJywge1xuICAgICAgICAgICAgbm9kZVV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICAgICAgcHJlc2V0OiAnZnVsbF9zdHJldGNoJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgY29udGVudFJlc3VsdCA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdjb250ZW50JyxcbiAgICAgICAgICAgIHBhcmVudFV1aWQ6IHZpZXdVdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjb250ZW50UmVzdWx0LnN1Y2Nlc3MgfHwgIWNvbnRlbnRSZXN1bHQuZGF0YT8udXVpZCkge1xuICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBTY3JvbGxWaWV3OiBmYWlsZWQgdG8gY3JlYXRlIGNvbnRlbnQgbm9kZWApO1xuICAgICAgICAgICAgcmV0dXJuIHZpZXdVdWlkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbnRlbnRVdWlkOiBzdHJpbmcgPSBjb250ZW50UmVzdWx0LmRhdGEudXVpZDtcbiAgICAgICAgY3R4LmNyZWF0ZWROb2RlVXVpZHMucHVzaChjb250ZW50VXVpZCk7XG5cbiAgICAgICAgY29uc3QgZW5zdXJlQ29udGVudCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICBub2RlVXVpZDogY29udGVudFV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlOiAnY2MuVUlUcmFuc2Zvcm0nLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFlbnN1cmVDb250ZW50LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gY29udGVudCBhZGQgY2MuVUlUcmFuc2Zvcm06ICR7ZW5zdXJlQ29udGVudC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzY3JvbGxMYXlvdXQgPSBzcGVjLnNjcm9sbExheW91dDtcbiAgICAgICAgaWYgKHNjcm9sbExheW91dCkge1xuICAgICAgICAgICAgY29uc3QgZW5zdXJlTGF5b3V0ID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdjb21wb25lbnRfbWFuYWdlJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FkZCcsXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQ6IGNvbnRlbnRVdWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6ICdjYy5MYXlvdXQnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIWVuc3VyZUxheW91dC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYCR7c3BlYy5uYW1lfSBjb250ZW50IGFkZCBjYy5MYXlvdXQ6ICR7ZW5zdXJlTGF5b3V0LmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGxheW91dFR5cGUgPSBzY3JvbGxMYXlvdXQgPT09ICdob3Jpem9udGFsJyA/IDEgOiBzY3JvbGxMYXlvdXQgPT09ICdncmlkJyA/IDMgOiAyO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKGNvbnRlbnRVdWlkLCAnY2MuTGF5b3V0JywgJ3R5cGUnLCAnaW50ZWdlcicsIGxheW91dFR5cGUsIGN0eCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AoY29udGVudFV1aWQsICdjYy5MYXlvdXQnLCAncmVzaXplTW9kZScsICdpbnRlZ2VyJywgMSwgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnY29udGVudCcsICdub2RlJywgY29udGVudFV1aWQsIGN0eCk7XG5cbiAgICAgICAgY29uc3QgaXNIb3Jpem9udGFsID0gc2Nyb2xsTGF5b3V0ID09PSAnaG9yaXpvbnRhbCc7XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChyb290VXVpZCwgJ2NjLlNjcm9sbFZpZXcnLCAnaG9yaXpvbnRhbCcsICdib29sZWFuJywgaXNIb3Jpem9udGFsLCBjdHgpO1xuICAgICAgICBhd2FpdCB0aGlzLnNldFByb3Aocm9vdFV1aWQsICdjYy5TY3JvbGxWaWV3JywgJ3ZlcnRpY2FsJywgJ2Jvb2xlYW4nLCAhaXNIb3Jpem9udGFsLCBjdHgpO1xuXG4gICAgICAgIHJldHVybiBjb250ZW50VXVpZDtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbXBvbmVudHNGb3JTZW1hbnRpY1R5cGUodHlwZTogVUlTZW1hbnRpY1R5cGUgfCB1bmRlZmluZWQpOiBzdHJpbmdbXSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnUGFuZWwnOlxuICAgICAgICAgICAgY2FzZSAnSW1hZ2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZSddO1xuICAgICAgICAgICAgY2FzZSAnTGFiZWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLkxhYmVsJ107XG4gICAgICAgICAgICBjYXNlICdCdXR0b24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBbJ2NjLlVJVHJhbnNmb3JtJywgJ2NjLlNwcml0ZScsICdjYy5CdXR0b24nXTtcbiAgICAgICAgICAgIGNhc2UgJ0lucHV0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5FZGl0Qm94J107XG4gICAgICAgICAgICBjYXNlICdTY3JvbGxWaWV3JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5TY3JvbGxWaWV3J107XG4gICAgICAgICAgICBjYXNlICdMaXN0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybScsICdjYy5MYXlvdXQnXTtcbiAgICAgICAgICAgIGNhc2UgJ05vZGUnOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gWydjYy5VSVRyYW5zZm9ybSddO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVRyYW5zZm9ybUJhc2ljcyh1dWlkOiBzdHJpbmcsIHNwZWM6IFVJU3BlYywgY3R4OiBCdWlsZENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHNwZWMuc2l6ZSAmJiBzcGVjLnNpemUubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBbd2lkdGgsIGhlaWdodF0gPSBzcGVjLnNpemU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLlVJVHJhbnNmb3JtJywgJ2NvbnRlbnRTaXplJywgJ3NpemUnLCB7IHdpZHRoLCBoZWlnaHQgfSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3BlYy5hbmNob3IgJiYgc3BlYy5hbmNob3IubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBzcGVjLmFuY2hvcjtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuVUlUcmFuc2Zvcm0nLCAnYW5jaG9yUG9pbnQnLCAndmVjMicsIHsgeCwgeSB9LCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzcGVjLnBvc2l0aW9uICYmIHNwZWMucG9zaXRpb24ubGVuZ3RoID09PSAyKSB7XG4gICAgICAgICAgICBjb25zdCBbeCwgeV0gPSBzcGVjLnBvc2l0aW9uO1xuICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfdHJhbnNmb3JtJywge1xuICAgICAgICAgICAgICAgIGFjdGlvbjogJ3NldF90cmFuc2Zvcm0nLFxuICAgICAgICAgICAgICAgIHV1aWQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHsgeCwgeSwgejogMCB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXIuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0ucG9zaXRpb246ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFwcGx5U3ByaXRlRnJhbWVEZWZhdWx0KHV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCB0eXBlID0gc3BlYy50eXBlO1xuICAgICAgICBpZiAodHlwZSAhPT0gJ1BhbmVsJyAmJiB0eXBlICE9PSAnSW1hZ2UnICYmIHR5cGUgIT09ICdCdXR0b24nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYmFja2dyb3VuZCA9IHNwZWMucHJvcHM/LmJhY2tncm91bmQ7XG4gICAgICAgIGlmICghYmFja2dyb3VuZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuU3ByaXRlJywgJ3Nwcml0ZUZyYW1lJywgJ3Nwcml0ZUZyYW1lJywgYXdhaXQgdGhpcy5yZXNvbHZlQXNzZXRVdWlkKGJhY2tncm91bmQpLCBjdHgpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYnVpbGRCdXR0b25MYWJlbENoaWxkKGJ1dHRvblV1aWQ6IHN0cmluZywgc3BlYzogVUlTcGVjLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCBwcm9wcyA9IHNwZWMucHJvcHMgPz8ge307XG4gICAgICAgIGlmIChwcm9wcy50ZXh0ID09PSB1bmRlZmluZWQgJiYgcHJvcHMuZm9udFNpemUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNyZWF0ZSA9IGF3YWl0IHRoaXMubm9kZVRvb2xzLmV4ZWN1dGUoJ25vZGVfbGlmZWN5Y2xlJywge1xuICAgICAgICAgICAgYWN0aW9uOiAnY3JlYXRlJyxcbiAgICAgICAgICAgIG5hbWU6ICdMYWJlbCcsXG4gICAgICAgICAgICBwYXJlbnRVdWlkOiBidXR0b25VdWlkLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFjcmVhdGUuc3VjY2VzcyB8fCAhY3JlYXRlLmRhdGE/LnV1aWQpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gYnV0dG9uIGxhYmVsIGNoaWxkOiAke2NyZWF0ZS5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbGFiZWxVdWlkOiBzdHJpbmcgPSBjcmVhdGUuZGF0YS51dWlkO1xuICAgICAgICBjdHguY3JlYXRlZE5vZGVVdWlkcy5wdXNoKGxhYmVsVXVpZCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnRUeXBlIG9mIFsnY2MuVUlUcmFuc2Zvcm0nLCAnY2MuTGFiZWwnXSkge1xuICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBsYWJlbFV1aWQsXG4gICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtzcGVjLm5hbWV9IGxhYmVsIGFkZCAke2NvbXBvbmVudFR5cGV9OiAke3IuZXJyb3IgPz8gJ3Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdzdHJpbmcnLCAnc3RyaW5nJywgU3RyaW5nKHByb3BzLnRleHQpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9wcy5mb250U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AobGFiZWxVdWlkLCAnY2MuTGFiZWwnLCAnZm9udFNpemUnLCAnbnVtYmVyJywgTnVtYmVyKHByb3BzLmZvbnRTaXplKSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcChsYWJlbFV1aWQsICdjYy5MYWJlbCcsICdjb2xvcicsICdjb2xvcicsIHRoaXMubm9ybWFsaXplQ29sb3IocHJvcHMuY29sb3IpLCBjdHgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhcHBseVNlbWFudGljUHJvcHModXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBzcGVjLnR5cGU7XG4gICAgICAgIGNvbnN0IHByb3BzID0gc3BlYy5wcm9wcyA/PyB7fTtcblxuICAgICAgICBpZiAodHlwZSA9PT0gJ0xhYmVsJyAmJiBwcm9wcy50ZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuTGFiZWwnLCAnc3RyaW5nJywgJ3N0cmluZycsIFN0cmluZyhwcm9wcy50ZXh0KSwgY3R4KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PT0gJ0xhYmVsJyAmJiBwcm9wcy5mb250U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxhYmVsJywgJ2ZvbnRTaXplJywgJ251bWJlcicsIE51bWJlcihwcm9wcy5mb250U2l6ZSksIGN0eCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT09ICdMYWJlbCcgJiYgcHJvcHMuY29sb3IpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuTGFiZWwnLCAnY29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLmNvbG9yKSwgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgodHlwZSA9PT0gJ1BhbmVsJyB8fCB0eXBlID09PSAnSW1hZ2UnIHx8IHR5cGUgPT09ICdCdXR0b24nKSAmJiBwcm9wcy5jb2xvcikge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5TcHJpdGUnLCAnY29sb3InLCAnY29sb3InLCB0aGlzLm5vcm1hbGl6ZUNvbG9yKHByb3BzLmNvbG9yKSwgY3R4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnBsYWNlaG9sZGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcCh1dWlkLCAnY2MuRWRpdEJveCcsICdwbGFjZWhvbGRlcicsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMucGxhY2Vob2xkZXIpLCBjdHgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlID09PSAnSW5wdXQnICYmIHByb3BzLnRleHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wKHV1aWQsICdjYy5FZGl0Qm94JywgJ3N0cmluZycsICdzdHJpbmcnLCBTdHJpbmcocHJvcHMudGV4dCksIGN0eCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZSA9PT0gJ0xpc3QnICYmIHByb3BzLmxheW91dFR5cGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxheW91dFZhbHVlID0gTEFZT1VUX1RZUEVfTUFQW3Byb3BzLmxheW91dFR5cGVdO1xuICAgICAgICAgICAgaWYgKGxheW91dFZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgJ2NjLkxheW91dCcsICd0eXBlJywgJ2ludGVnZXInLCBsYXlvdXRWYWx1ZSwgY3R4KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlSYXdDb21wb25lbnRzKHV1aWQ6IHN0cmluZywgY29tcG9uZW50czogQ29tcG9uZW50U3BlY1tdIHwgdW5kZWZpbmVkLCBjdHg6IEJ1aWxkQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoY29tcG9uZW50cykpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgY29tcG9uZW50cykge1xuICAgICAgICAgICAgaWYgKCFjb21wPy50eXBlKSB7XG4gICAgICAgICAgICAgICAgY3R4Lndhcm5pbmdzLnB1c2goYFJhdyBjb21wb25lbnQgbWlzc2luZyAndHlwZScgZmllbGQ7IHNraXBwZWRgKTtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFkZFJlc3VsdCA9IGF3YWl0IHRoaXMuY29tcG9uZW50VG9vbHMuZXhlY3V0ZSgnY29tcG9uZW50X21hbmFnZScsIHtcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhZGQnLFxuICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXAudHlwZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFhZGRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGBhZGQgJHtjb21wLnR5cGV9OiAke2FkZFJlc3VsdC5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29tcC5wcm9wcyAmJiB0eXBlb2YgY29tcC5wcm9wcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtwcm9wZXJ0eSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXAucHJvcHMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHByb3BlcnR5VHlwZSA9IHRoaXMuaW5mZXJQcm9wZXJ0eVR5cGUodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbFZhbHVlID0gcHJvcGVydHlUeXBlID09PSAnY29sb3InID8gdGhpcy5ub3JtYWxpemVDb2xvcih2YWx1ZSBhcyBVSUNvbG9yKSA6IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3AodXVpZCwgY29tcC50eXBlLCBwcm9wZXJ0eSwgcHJvcGVydHlUeXBlLCBmaW5hbFZhbHVlLCBjdHgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYXBwbHlQcmVzZXQodXVpZDogc3RyaW5nLCBzcGVjOiBVSVNwZWMsIGN0eDogQnVpbGRDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGlmICghc3BlYy5wcmVzZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXJnaW5zID0gc3BlYy5tYXJnaW5zID8/IHt9O1xuICAgICAgICBjb25zdCBzcGFjaW5nID0gc3BlYy5zcGFjaW5nID8/IHt9O1xuICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCd1aV9hcHBseV9yZXNwb25zaXZlX2RlZmF1bHRzJywge1xuICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICBwcmVzZXQ6IHNwZWMucHJlc2V0LFxuICAgICAgICAgICAgbWFyZ2luTGVmdDogbWFyZ2lucy5sZWZ0ID8/IDAsXG4gICAgICAgICAgICBtYXJnaW5SaWdodDogbWFyZ2lucy5yaWdodCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luVG9wOiBtYXJnaW5zLnRvcCA/PyAwLFxuICAgICAgICAgICAgbWFyZ2luQm90dG9tOiBtYXJnaW5zLmJvdHRvbSA/PyAwLFxuICAgICAgICAgICAgc3BhY2luZ1g6IHNwYWNpbmcueCA/PyAwLFxuICAgICAgICAgICAgc3BhY2luZ1k6IHNwYWNpbmcueSA/PyAwLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFyLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIGN0eC53YXJuaW5ncy5wdXNoKGAke3NwZWMubmFtZX0gcHJlc2V0ICcke3NwZWMucHJlc2V0fSc6ICR7ci5lcnJvciA/PyAndW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3AoXG4gICAgICAgIHV1aWQ6IHN0cmluZyxcbiAgICAgICAgY29tcG9uZW50VHlwZTogc3RyaW5nLFxuICAgICAgICBwcm9wZXJ0eTogc3RyaW5nLFxuICAgICAgICBwcm9wZXJ0eVR5cGU6IHN0cmluZyxcbiAgICAgICAgdmFsdWU6IHVua25vd24sXG4gICAgICAgIGN0eDogQnVpbGRDb250ZXh0LFxuICAgICk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5jb21wb25lbnRUb29scy5leGVjdXRlKCdzZXRfY29tcG9uZW50X3Byb3BlcnR5Jywge1xuICAgICAgICAgICAgbm9kZVV1aWQ6IHV1aWQsXG4gICAgICAgICAgICBjb21wb25lbnRUeXBlLFxuICAgICAgICAgICAgcHJvcGVydHksXG4gICAgICAgICAgICBwcm9wZXJ0eVR5cGUsXG4gICAgICAgICAgICB2YWx1ZSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghci5zdWNjZXNzKSB7XG4gICAgICAgICAgICBjdHgud2FybmluZ3MucHVzaChgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fTogJHtyLmVycm9yID8/ICd1bmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVzb2x2ZUFzc2V0VXVpZChyZWY6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgICAgIGlmICghcmVmLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgIHJldHVybiByZWY7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgcmVmKTtcbiAgICAgICAgICAgIGlmICh1dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHV1aWQgYXMgc3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbG9nZ2VyLndhcm4oYEZhaWxlZCB0byByZXNvbHZlIGFzc2V0ICcke3JlZn0nOiAkeyhlcnJvciBhcyBhbnkpPy5tZXNzYWdlID8/IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlZjtcbiAgICB9XG5cbiAgICBwcml2YXRlIG5vcm1hbGl6ZUNvbG9yKGNvbG9yOiBVSUNvbG9yIHwgdW5rbm93bik6IHsgcjogbnVtYmVyOyBnOiBudW1iZXI7IGI6IG51bWJlcjsgYTogbnVtYmVyIH0ge1xuICAgICAgICBjb25zdCBjID0gKGNvbG9yID8/IHt9KSBhcyBQYXJ0aWFsPFVJQ29sb3I+O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcjogTnVtYmVyKGMuciA/PyAyNTUpLFxuICAgICAgICAgICAgZzogTnVtYmVyKGMuZyA/PyAyNTUpLFxuICAgICAgICAgICAgYjogTnVtYmVyKGMuYiA/PyAyNTUpLFxuICAgICAgICAgICAgYTogTnVtYmVyKGMuYSA/PyAyNTUpLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgaW5mZXJQcm9wZXJ0eVR5cGUodmFsdWU6IHVua25vd24pOiBzdHJpbmcge1xuICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuICdzdHJpbmcnO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gJ251bWJlcic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2Jvb2xlYW4nO1xuICAgICAgICB9XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuICdzdHJpbmdBcnJheSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGNvbnN0IG8gPSB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgICAgICAgICAgIGlmICgncicgaW4gbyAmJiAnZycgaW4gbyAmJiAnYicgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAnY29sb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCd3aWR0aCcgaW4gbyAmJiAnaGVpZ2h0JyBpbiBvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdzaXplJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgneCcgaW4gbyAmJiAneScgaW4gbyAmJiAneicgaW4gbykge1xuICAgICAgICAgICAgICAgIHJldHVybiAndmVjMyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJ3gnIGluIG8gJiYgJ3knIGluIG8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3ZlYzInO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnc3RyaW5nJztcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RQcmVmYWJOYW1lKHBhdGg6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi9dKz8pXFwucHJlZmFiJC8uZXhlYyhwYXRoKTtcbiAgICAgICAgcmV0dXJuIG1hdGNoPy5bMV07XG4gICAgfVxufVxuIl19