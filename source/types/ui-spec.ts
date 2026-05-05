import type { JSONSchemaProperty } from './index';

export type UISemanticType =
    | 'Node'
    | 'Panel'
    | 'Image'
    | 'Label'
    | 'Button'
    | 'Input'
    | 'ScrollView'
    | 'List';

export type UIPreset =
    | 'full_stretch'
    | 'top_bar'
    | 'bottom_bar'
    | 'vertical_list'
    | 'horizontal_list';

export type UIAssetRef = string;

export interface UIColor {
    r: number;
    g: number;
    b: number;
    a?: number;
}

export interface UIMargins {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
}

export interface UISpacing {
    x?: number;
    y?: number;
}

export interface UISemanticProps {
    text?: string;
    fontSize?: number;
    color?: UIColor;
    background?: UIAssetRef;
    icon?: UIAssetRef;
    placeholder?: string;
    onClick?: string;
    layoutType?: 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
}

export type UIScrollLayout = 'vertical' | 'horizontal' | 'grid';

export type UIWidgetAlignMode = 'ONCE' | 'ON_WINDOW_RESIZE' | 'ALWAYS';

export interface UIWidgetSpec {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    horizontalCenter?: number;
    verticalCenter?: number;
    alignMode?: UIWidgetAlignMode;
}

export interface ComponentSpec {
    type: string;
    props?: Record<string, unknown>;
}

export interface UISpec {
    name: string;
    type?: UISemanticType;
    preset?: UIPreset;
    widget?: UIWidgetSpec;
    scrollLayout?: UIScrollLayout;
    margins?: UIMargins;
    spacing?: UISpacing;
    size?: [number, number];
    position?: [number, number];
    anchor?: [number, number];
    active?: boolean;
    props?: UISemanticProps;
    components?: ComponentSpec[];
    children?: UISpec[];
}

export interface UIBuildRequest {
    spec: UISpec;
    parentUuid?: string;
    saveAsPrefab?: string;
}

export interface UIBuildResult {
    rootUuid: string;
    createdNodeUuids: string[];
    prefabPath?: string;
}

export const UI_SEMANTIC_TYPES: readonly UISemanticType[] = [
    'Node', 'Panel', 'Image', 'Label', 'Button', 'Input', 'ScrollView', 'List',
] as const;

export const UI_PRESETS: readonly UIPreset[] = [
    'full_stretch', 'top_bar', 'bottom_bar', 'vertical_list', 'horizontal_list',
] as const;

export const UI_SPEC_JSON_SCHEMA: JSONSchemaProperty = {
    type: 'object',
    properties: {
        name: { type: 'string', description: 'Node name' },
        type: {
            type: 'string',
            enum: UI_SEMANTIC_TYPES as unknown as string[],
            description: 'Semantic shortcut; expands to a preset combo of components. Omit for a plain Node.',
        },
        preset: {
            type: 'string',
            enum: UI_PRESETS as unknown as string[],
            description: 'Responsive preset, maps 1:1 to ui_apply_responsive_defaults. Combine with `widget` to override individual fields.',
        },
        widget: {
            type: 'object',
            description: 'Explicit cc.Widget config. Each numeric field enables that align and sets the value. Applied AFTER preset, so it overrides preset values. Use this for non-standard responsive layouts.',
            properties: {
                top: { type: 'number' },
                bottom: { type: 'number' },
                left: { type: 'number' },
                right: { type: 'number' },
                horizontalCenter: { type: 'number' },
                verticalCenter: { type: 'number' },
                alignMode: { type: 'string', enum: ['ONCE', 'ON_WINDOW_RESIZE', 'ALWAYS'] },
            },
            additionalProperties: false,
        },
        scrollLayout: {
            type: 'string',
            enum: ['vertical', 'horizontal', 'grid'],
            description: 'Only for type=ScrollView. Selects scroll direction and Layout type on the auto-created content node.',
        },
        margins: {
            type: 'object',
            properties: {
                left: { type: 'number' },
                right: { type: 'number' },
                top: { type: 'number' },
                bottom: { type: 'number' },
            },
            additionalProperties: false,
        },
        spacing: {
            type: 'object',
            properties: {
                x: { type: 'number' },
                y: { type: 'number' },
            },
            additionalProperties: false,
        },
        size: {
            type: 'array',
            items: { type: 'number' },
            minLength: 2,
            maxLength: 2,
            description: '[width, height] in px; sets UITransform.contentSize.',
        },
        position: {
            type: 'array',
            items: { type: 'number' },
            minLength: 2,
            maxLength: 2,
        },
        anchor: {
            type: 'array',
            items: { type: 'number' },
            minLength: 2,
            maxLength: 2,
        },
        active: { type: 'boolean', default: true },
        props: {
            type: 'object',
            description: 'Semantic props for the chosen type (text, color, background, onClick, ...).',
            properties: {
                text: { type: 'string' },
                fontSize: { type: 'number' },
                color: {
                    type: 'object',
                    properties: {
                        r: { type: 'number', minimum: 0, maximum: 255 },
                        g: { type: 'number', minimum: 0, maximum: 255 },
                        b: { type: 'number', minimum: 0, maximum: 255 },
                        a: { type: 'number', minimum: 0, maximum: 255 },
                    },
                    required: ['r', 'g', 'b'],
                    additionalProperties: false,
                },
                background: { type: 'string', description: 'Asset path (db://...) or UUID.' },
                icon: { type: 'string' },
                placeholder: { type: 'string' },
                onClick: { type: 'string', description: 'Handler method name on attached script.' },
                layoutType: { type: 'string', enum: ['NONE', 'HORIZONTAL', 'VERTICAL', 'GRID'] },
            },
            additionalProperties: true,
        },
        components: {
            type: 'array',
            description: 'Escape hatch: raw components to add after semantic expansion.',
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string', description: 'Component type, e.g. cc.Sprite, cc.Widget.' },
                    props: { type: 'object', additionalProperties: true },
                },
                required: ['type'],
                additionalProperties: false,
            },
        },
        children: {
            type: 'array',
            description: 'Nested UISpec nodes. Recursive.',
            items: { type: 'object', additionalProperties: true },
        },
    },
    required: ['name'],
    additionalProperties: false,
};
