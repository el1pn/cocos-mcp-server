import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class ReferenceImageTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'reference_image_manage',
                description: 'Manage reference images. Actions: add (add reference images to scene), remove (remove reference images), switch (switch to specific reference image), list (list all available reference images), clear_all (clear all reference images), query_config (query reference image configuration), query_current (query current reference image data), refresh (refresh reference image display)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['add', 'remove', 'switch', 'list', 'clear_all', 'query_config', 'query_current', 'refresh']
                        },
                        paths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of reference image absolute paths (action: add, remove)'
                        },
                        path: {
                            type: 'string',
                            description: 'Reference image absolute path (action: switch)'
                        },
                        sceneUUID: {
                            type: 'string',
                            description: 'Specific scene UUID (action: switch, optional)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'reference_image_transform',
                description: 'Set reference image transform and display properties. Actions: set_data (set arbitrary property by key), set_position (set position x/y), set_scale (set scale sx/sy), set_opacity (set opacity)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Action to perform',
                            enum: ['set_data', 'set_position', 'set_scale', 'set_opacity']
                        },
                        key: {
                            type: 'string',
                            description: 'Property key (action: set_data)',
                            enum: ['path', 'x', 'y', 'sx', 'sy', 'opacity']
                        },
                        value: {
                            description: 'Property value - path: string, x/y/sx/sy: number, opacity: number 0-1 (action: set_data)'
                        },
                        x: {
                            type: 'number',
                            description: 'X offset (action: set_position)'
                        },
                        y: {
                            type: 'number',
                            description: 'Y offset (action: set_position)'
                        },
                        sx: {
                            type: 'number',
                            description: 'X scale (action: set_scale)',
                            minimum: 0.1,
                            maximum: 10
                        },
                        sy: {
                            type: 'number',
                            description: 'Y scale (action: set_scale)',
                            minimum: 0.1,
                            maximum: 10
                        },
                        opacity: {
                            type: 'number',
                            description: 'Opacity 0.0 to 1.0 (action: set_opacity)',
                            minimum: 0,
                            maximum: 1
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'reference_image_manage': {
                const action = args.action;
                switch (action) {
                    case 'add':
                        return await this.addReferenceImage(args.paths);
                    case 'remove':
                        return await this.removeReferenceImage(args.paths);
                    case 'switch':
                        return await this.switchReferenceImage(args.path, args.sceneUUID);
                    case 'list':
                        return await this.listReferenceImages();
                    case 'clear_all':
                        return await this.clearAllReferenceImages();
                    case 'query_config':
                        return await this.queryReferenceImageConfig();
                    case 'query_current':
                        return await this.queryCurrentReferenceImage();
                    case 'refresh':
                        return await this.refreshReferenceImage();
                    default:
                        throw new Error(`Unknown action: ${action}`);
                }
            }
            // falls through never reached – all branches return/throw
            case 'reference_image_transform':
                switch (args.action) {
                    case 'set_data':
                        return await this.setReferenceImageData(args.key, args.value);
                    case 'set_position':
                        return await this.setReferenceImagePosition(args.x, args.y);
                    case 'set_scale':
                        return await this.setReferenceImageScale(args.sx, args.sy);
                    case 'set_opacity':
                        return await this.setReferenceImageOpacity(args.opacity);
                    default:
                        throw new Error(`Unknown action: ${args.action}`);
                }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async addReferenceImage(paths: string[]): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'add-image', paths).then(() => {
                resolve({
                    success: true,
                    data: {
                        addedPaths: paths,
                        count: paths.length,
                        message: `Added ${paths.length} reference image(s)`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async removeReferenceImage(paths?: string[]): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'remove-image', paths).then(() => {
                const message = paths && paths.length > 0 ?
                    `Removed ${paths.length} reference image(s)` :
                    'Removed current reference image';
                resolve({
                    success: true,
                    message: message
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async switchReferenceImage(path: string, sceneUUID?: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            const args = sceneUUID ? [path, sceneUUID] : [path];
            Editor.Message.request('reference-image', 'switch-image', ...args).then(() => {
                resolve({
                    success: true,
                    data: {
                        path: path,
                        sceneUUID: sceneUUID,
                        message: `Switched to reference image: ${path}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async setReferenceImageData(key: string, value: any): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'set-image-data', key, value).then(() => {
                resolve({
                    success: true,
                    data: {
                        key: key,
                        value: value,
                        message: `Reference image ${key} set to ${value}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryReferenceImageConfig(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'query-config').then((config: any) => {
                resolve({
                    success: true,
                    data: config
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryCurrentReferenceImage(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'query-current').then((current: any) => {
                resolve({
                    success: true,
                    data: current
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async refreshReferenceImage(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'refresh').then(() => {
                resolve({
                    success: true,
                    message: 'Reference image refreshed'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async setReferenceImagePosition(x: number, y: number): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'set-image-data', 'x', x);
            await Editor.Message.request('reference-image', 'set-image-data', 'y', y);

            return {
                success: true,
                data: {
                    x: x,
                    y: y,
                    message: `Reference image position set to (${x}, ${y})`
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setReferenceImageScale(sx: number, sy: number): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'set-image-data', 'sx', sx);
            await Editor.Message.request('reference-image', 'set-image-data', 'sy', sy);

            return {
                success: true,
                data: {
                    sx: sx,
                    sy: sy,
                    message: `Reference image scale set to (${sx}, ${sy})`
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setReferenceImageOpacity(opacity: number): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'set-image-data', 'opacity', opacity).then(() => {
                resolve({
                    success: true,
                    data: {
                        opacity: opacity,
                        message: `Reference image opacity set to ${opacity}`
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async listReferenceImages(): Promise<ToolResponse> {
        try {
            const config = await Editor.Message.request('reference-image', 'query-config');
            const current = await Editor.Message.request('reference-image', 'query-current');

            return {
                success: true,
                data: {
                    config: config,
                    current: current,
                    message: 'Reference image information retrieved'
                }
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async clearAllReferenceImages(): Promise<ToolResponse> {
        try {
            // Remove all reference images by calling remove-image without paths
            await Editor.Message.request('reference-image', 'remove-image');

            return {
                success: true,
                message: 'All reference images cleared'
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
