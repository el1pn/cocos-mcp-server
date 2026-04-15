import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import {
    UISpec,
    UISemanticType,
    UIColor,
    UIWidgetSpec,
    ComponentSpec,
    UI_SPEC_JSON_SCHEMA,
} from '../types/ui-spec';
import { NodeTools } from './node-tools';
import { ComponentTools } from './component-tools';
import { PrefabTools } from './prefab-tools';
import { editorRequest } from '../utils/editor-request';
import { logger } from '../logger';

const LAYOUT_TYPE_MAP: Record<string, number> = {
    NONE: 0,
    HORIZONTAL: 1,
    VERTICAL: 2,
    GRID: 3,
};

interface BuildContext {
    createdNodeUuids: string[];
    warnings: string[];
}

export class UIBuilderTools implements ToolExecutor {
    private nodeTools = new NodeTools();
    private componentTools = new ComponentTools();
    private prefabTools = new PrefabTools();

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'ui_build_from_spec',
                description:
                    'Build a UI node hierarchy declaratively from a UISpec JSON tree. Expands semantic types (Button, Label, Image, Panel, Input, ScrollView, List) into component combos, applies presets (full_stretch, top_bar, bottom_bar, vertical_list, horizontal_list), and sets sizes/anchors/props in a single call. Optionally saves the result as a prefab. Returns root UUID and all created node UUIDs.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        spec: {
                            ...UI_SPEC_JSON_SCHEMA,
                            description:
                                'UISpec tree. Each node has: name (required), optional type (semantic shortcut), preset, size [w,h], anchor [x,y], position [x,y], props (text/color/background/onClick/layoutType), components[] (escape hatch for raw cc.* components), children[] (recursive).',
                        } as any,
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        if (toolName !== 'ui_build_from_spec') {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        return this.buildFromSpec(args);
    }

    private async buildFromSpec(args: any): Promise<ToolResponse> {
        const spec: UISpec | undefined = args?.spec;
        if (!spec || typeof spec !== 'object' || !spec.name) {
            return { success: false, error: 'Missing or invalid spec: a UISpec object with at least a "name" field is required.' };
        }

        const ctx: BuildContext = { createdNodeUuids: [], warnings: [] };
        let autoDetectedSize: { width: number; height: number } | undefined;
        if (!spec.size || spec.size.length !== 2) {
            autoDetectedSize = await this.fetchDesignResolution();
            if (autoDetectedSize) {
                spec.size = [autoDetectedSize.width, autoDetectedSize.height];
            }
        }
        let rootUuid: string;
        try {
            rootUuid = await this.buildNode(spec, args?.parentUuid, ctx);
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to build UI spec: ${error?.message ?? String(error)}`,
                data: { createdNodeUuids: ctx.createdNodeUuids, warnings: ctx.warnings },
            };
        }

        let prefabPath: string | undefined;
        if (args?.saveAsPrefab && typeof args.saveAsPrefab === 'string') {
            const path = args.saveAsPrefab as string;
            const prefabName = this.extractPrefabName(path) ?? spec.name;
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
            } else {
                ctx.warnings.push(`Failed to save prefab at ${savePath}: ${prefabResult.error ?? 'unknown error'}`);
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

    private async fetchDesignResolution(): Promise<{ width: number; height: number } | undefined> {
        try {
            const config: any = await editorRequest('project', 'query-config', 'project');
            const candidates: Array<{ width: unknown; height: unknown } | undefined> = [
                config?.preview?.designResolution,
                config?.preview?.design_resolution,
                { width: config?.preview?.design_width, height: config?.preview?.design_height },
                config?.general?.designResolution,
            ];
            for (const c of candidates) {
                const w = Number(c?.width);
                const h = Number(c?.height);
                if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
                    return { width: w, height: h };
                }
            }
        } catch (error: any) {
            logger.warn(`ui-builder: failed to fetch design resolution: ${error?.message ?? error}`);
        }
        return undefined;
    }

    private async buildNode(spec: UISpec, parentUuid: string | undefined, ctx: BuildContext): Promise<string> {
        if (!spec.name) {
            throw new Error('Every UISpec node must have a name');
        }

        const createResult = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: spec.name,
            parentUuid,
        });
        if (!createResult.success || !createResult.data?.uuid) {
            throw new Error(`Failed to create node '${spec.name}': ${createResult.error ?? 'no uuid returned'}`);
        }
        const uuid: string = createResult.data.uuid;
        ctx.createdNodeUuids.push(uuid);

        for (const componentType of this.componentsForSemanticType(spec.type)) {
            const addResult = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: uuid,
                componentType,
            });
            if (!addResult.success) {
                ctx.warnings.push(`${spec.name} add ${componentType}: ${addResult.error ?? 'unknown error'}`);
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
                ctx.warnings.push(`${spec.name}.active=false: ${r.error ?? 'unknown error'}`);
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
                } catch (error: any) {
                    ctx.warnings.push(`Child '${child?.name ?? '<unnamed>'}' under '${spec.name}': ${error?.message ?? String(error)}`);
                }
            }
        }

        return uuid;
    }

    private async applyWidgetOverride(uuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
        const widget: UIWidgetSpec | undefined = spec.widget;
        if (!widget) {
            return;
        }
        const ensured = await this.componentTools.execute('component_manage', {
            action: 'add',
            nodeUuid: uuid,
            componentType: 'cc.Widget',
        });
        if (!ensured.success) {
            ctx.warnings.push(`${spec.name} ensure cc.Widget: ${ensured.error ?? 'unknown error'}`);
            return;
        }
        const fields: Array<[keyof UIWidgetSpec, string, string]> = [
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
            const map: Record<string, number> = { ONCE: 0, ON_WINDOW_RESIZE: 1, ALWAYS: 2 };
            await this.setProp(uuid, 'cc.Widget', 'alignMode', 'integer', map[widget.alignMode], ctx);
        }
    }

    private async buildScrollViewScaffold(rootUuid: string, spec: UISpec, ctx: BuildContext): Promise<string> {
        const viewResult = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'view',
            parentUuid: rootUuid,
        });
        if (!viewResult.success || !viewResult.data?.uuid) {
            ctx.warnings.push(`${spec.name} ScrollView: failed to create view node`);
            return rootUuid;
        }
        const viewUuid: string = viewResult.data.uuid;
        ctx.createdNodeUuids.push(viewUuid);

        for (const componentType of ['cc.UITransform', 'cc.Mask']) {
            const r = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: viewUuid,
                componentType,
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name} view add ${componentType}: ${r.error ?? 'unknown error'}`);
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
        if (!contentResult.success || !contentResult.data?.uuid) {
            ctx.warnings.push(`${spec.name} ScrollView: failed to create content node`);
            return viewUuid;
        }
        const contentUuid: string = contentResult.data.uuid;
        ctx.createdNodeUuids.push(contentUuid);

        const ensureContent = await this.componentTools.execute('component_manage', {
            action: 'add',
            nodeUuid: contentUuid,
            componentType: 'cc.UITransform',
        });
        if (!ensureContent.success) {
            ctx.warnings.push(`${spec.name} content add cc.UITransform: ${ensureContent.error ?? 'unknown error'}`);
        }

        const scrollLayout = spec.scrollLayout;
        if (scrollLayout) {
            const ensureLayout = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: contentUuid,
                componentType: 'cc.Layout',
            });
            if (!ensureLayout.success) {
                ctx.warnings.push(`${spec.name} content add cc.Layout: ${ensureLayout.error ?? 'unknown error'}`);
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

    private componentsForSemanticType(type: UISemanticType | undefined): string[] {
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

    private async applyTransformBasics(uuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
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
                ctx.warnings.push(`${spec.name}.position: ${r.error ?? 'unknown error'}`);
            }
        }
    }

    private async applySpriteFrameDefault(uuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
        const type = spec.type;
        if (type !== 'Panel' && type !== 'Image' && type !== 'Button') {
            return;
        }
        const background = spec.props?.background;
        if (!background) {
            return;
        }
        await this.setProp(uuid, 'cc.Sprite', 'spriteFrame', 'spriteFrame', await this.resolveAssetUuid(background), ctx);
    }

    private async buildButtonLabelChild(buttonUuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
        const props = spec.props ?? {};
        if (props.text === undefined && props.fontSize === undefined) {
            return;
        }
        const create = await this.nodeTools.execute('node_lifecycle', {
            action: 'create',
            name: 'Label',
            parentUuid: buttonUuid,
        });
        if (!create.success || !create.data?.uuid) {
            ctx.warnings.push(`${spec.name} button label child: ${create.error ?? 'unknown error'}`);
            return;
        }
        const labelUuid: string = create.data.uuid;
        ctx.createdNodeUuids.push(labelUuid);

        for (const componentType of ['cc.UITransform', 'cc.Label']) {
            const r = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: labelUuid,
                componentType,
            });
            if (!r.success) {
                ctx.warnings.push(`${spec.name} label add ${componentType}: ${r.error ?? 'unknown error'}`);
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

    private async applySemanticProps(uuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
        const type = spec.type;
        const props = spec.props ?? {};

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

    private async applyRawComponents(uuid: string, components: ComponentSpec[] | undefined, ctx: BuildContext): Promise<void> {
        if (!Array.isArray(components)) {
            return;
        }
        for (const comp of components) {
            if (!comp?.type) {
                ctx.warnings.push(`Raw component missing 'type' field; skipped`);
                continue;
            }
            const addResult = await this.componentTools.execute('component_manage', {
                action: 'add',
                nodeUuid: uuid,
                componentType: comp.type,
            });
            if (!addResult.success) {
                ctx.warnings.push(`add ${comp.type}: ${addResult.error ?? 'unknown error'}`);
                continue;
            }
            if (comp.props && typeof comp.props === 'object') {
                for (const [property, value] of Object.entries(comp.props)) {
                    const propertyType = this.inferPropertyType(value);
                    const finalValue = propertyType === 'color' ? this.normalizeColor(value as UIColor) : value;
                    await this.setProp(uuid, comp.type, property, propertyType, finalValue, ctx);
                }
            }
        }
    }

    private async applyPreset(uuid: string, spec: UISpec, ctx: BuildContext): Promise<void> {
        if (!spec.preset) {
            return;
        }
        const margins = spec.margins ?? {};
        const spacing = spec.spacing ?? {};
        const r = await this.componentTools.execute('ui_apply_responsive_defaults', {
            nodeUuid: uuid,
            preset: spec.preset,
            marginLeft: margins.left ?? 0,
            marginRight: margins.right ?? 0,
            marginTop: margins.top ?? 0,
            marginBottom: margins.bottom ?? 0,
            spacingX: spacing.x ?? 0,
            spacingY: spacing.y ?? 0,
        });
        if (!r.success) {
            ctx.warnings.push(`${spec.name} preset '${spec.preset}': ${r.error ?? 'unknown error'}`);
        }
    }

    private async setProp(
        uuid: string,
        componentType: string,
        property: string,
        propertyType: string,
        value: unknown,
        ctx: BuildContext,
    ): Promise<void> {
        const r = await this.componentTools.execute('set_component_property', {
            nodeUuid: uuid,
            componentType,
            property,
            propertyType,
            value,
        });
        if (!r.success) {
            ctx.warnings.push(`${componentType}.${property}: ${r.error ?? 'unknown error'}`);
        }
    }

    private async resolveAssetUuid(ref: string): Promise<string> {
        if (!ref.startsWith('db://')) {
            return ref;
        }
        try {
            const uuid = await Editor.Message.request('asset-db', 'query-uuid', ref);
            if (uuid) {
                return uuid as string;
            }
        } catch (error) {
            logger.warn(`Failed to resolve asset '${ref}': ${(error as any)?.message ?? String(error)}`);
        }
        return ref;
    }

    private normalizeColor(color: UIColor | unknown): { r: number; g: number; b: number; a: number } {
        const c = (color ?? {}) as Partial<UIColor>;
        return {
            r: Number(c.r ?? 255),
            g: Number(c.g ?? 255),
            b: Number(c.b ?? 255),
            a: Number(c.a ?? 255),
        };
    }

    private inferPropertyType(value: unknown): string {
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
            const o = value as Record<string, unknown>;
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

    private extractPrefabName(path: string): string | undefined {
        const match = /([^/]+?)\.prefab$/.exec(path);
        return match?.[1];
    }
}
