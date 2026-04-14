import { ToolDefinition, ToolResponse, ToolExecutor, ProjectInfo, AssetInfo } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { AssetSafety, validateAssetUrl, tryValidateAssetUrl } from '../utils/asset-safety';
import { editorRequest, toolCall } from '../utils/editor-request';

export class ProjectTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
        return [
            {
                name: 'asset_query',
                description: 'Query and retrieve asset information. Actions: get_info (get asset info by path), get_assets (list assets by type), find_by_name (search assets by name), get_details (get detailed asset info with sub-assets), query_path (get disk path from URL), query_uuid (get UUID from URL), query_url (get URL from UUID).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The query action to perform',
                            enum: ['get_info', 'get_assets', 'find_by_name', 'get_details', 'query_path', 'query_uuid', 'query_url']
                        },
                        assetPath: {
                            type: 'string',
                            description: 'Asset path, e.g. db://assets/... (used by: get_info, get_details)'
                        },
                        type: {
                            type: 'string',
                            description: 'Asset type filter (used by: get_assets)',
                            enum: ['all', 'scene', 'prefab', 'script', 'texture', 'material', 'mesh', 'audio', 'animation'],
                            default: 'all'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder to search in (used by: get_assets, find_by_name)',
                            default: 'db://assets'
                        },
                        name: {
                            type: 'string',
                            description: 'Asset name to search for, supports partial matching (used by: find_by_name)'
                        },
                        exactMatch: {
                            type: 'boolean',
                            description: 'Whether to use exact name matching (used by: find_by_name)',
                            default: false
                        },
                        assetType: {
                            type: 'string',
                            description: 'Filter by asset type (used by: find_by_name)',
                            enum: ['all', 'scene', 'prefab', 'script', 'texture', 'material', 'mesh', 'audio', 'animation', 'spriteFrame'],
                            default: 'all'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results to return (used by: find_by_name)',
                            default: 20,
                            minimum: 1,
                            maximum: 100
                        },
                        includeSubAssets: {
                            type: 'boolean',
                            description: 'Include sub-assets like spriteFrame, texture (used by: get_details)',
                            default: true
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (used by: query_path, query_uuid)'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Asset UUID (used by: query_url)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'asset_crud',
                description: 'Create, modify, and manage assets. Actions: create (create a new asset file or folder), copy (copy an asset), move (move an asset), delete (delete an asset), save (save asset content), reimport (reimport an asset), import (import an external file), refresh (refresh asset database).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The CRUD action to perform',
                            enum: ['create', 'copy', 'move', 'delete', 'save', 'reimport', 'import', 'refresh']
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (used by: create, delete, save, reimport)'
                        },
                        content: {
                            type: 'string',
                            description: 'File content (used by: create [null for folder], save)',
                            default: null
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing file (used by: create, copy, move)',
                            default: false
                        },
                        source: {
                            type: 'string',
                            description: 'Source asset URL (used by: copy, move)'
                        },
                        target: {
                            type: 'string',
                            description: 'Target location URL (used by: copy, move)'
                        },
                        sourcePath: {
                            type: 'string',
                            description: 'Source file path on disk (used by: import)'
                        },
                        targetFolder: {
                            type: 'string',
                            description: 'Target folder in assets (used by: import)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Specific folder to refresh (used by: refresh)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_info',
                description: 'Get project information and settings. Actions: get_info (get project name, path, UUID, version), get_settings (get project settings by category).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['get_info', 'get_settings']
                        },
                        category: {
                            type: 'string',
                            description: 'Settings category (used by: get_settings)',
                            enum: ['general', 'physics', 'render', 'assets'],
                            default: 'general'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_build',
                description: 'Open the build panel and inspect builder state. Actions: open_build_panel (open the build panel), get_build_settings (report builder readiness — full settings are not exposed via MCP), check_builder_status (check if builder worker is ready), run (NOT SUPPORTED — opens the build panel; the user must run the build manually), build (NOT SUPPORTED — opens the build panel; the user must configure and start the build manually). Do not assume run/build actually produced output.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The build action to perform',
                            enum: ['run', 'build', 'get_build_settings', 'open_build_panel', 'check_builder_status']
                        },
                        platform: {
                            type: 'string',
                            description: 'Target platform (recorded for context only; not actually applied since run/build are not supported via MCP)'
                        },
                        debug: {
                            type: 'boolean',
                            description: 'Debug build (recorded for context only)',
                            default: true
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_preview',
                description: 'Preview server control. Actions: start_server (NOT SUPPORTED via MCP — instructs user to start preview manually), stop_server (NOT SUPPORTED via MCP — instructs user to stop preview manually). Both actions return success=false; the LLM should not assume the preview server is running after calling them.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The preview action to perform',
                            enum: ['start_server', 'stop_server']
                        },
                        port: {
                            type: 'number',
                            description: 'Preview server port (recorded for context only)',
                            default: 7456
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'asset_query':
                return await this.executeAssetQuery(args);
            case 'asset_crud':
                return await this.executeAssetCrud(args);
            case 'project_info':
                return await this.executeProjectInfo(args);
            case 'project_build':
                return await this.executeProjectBuild(args);
            case 'project_preview':
                return await this.executeProjectPreview(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private async executeAssetQuery(args: any): Promise<ToolResponse> {
        const resolvedAssetPath = this.resolveAssetPathArg(args);
        switch (args.action) {
            case 'get_info':
                if (!resolvedAssetPath) {
                    return { success: false, error: 'Missing required parameter: assetPath' };
                }
                return await this.getAssetInfo(resolvedAssetPath);
            case 'get_assets':
                return await this.getAssets(args.type, args.folder);
            case 'find_by_name':
                return await this.findAssetByName(args);
            case 'get_details':
                if (!resolvedAssetPath) {
                    return { success: false, error: 'Missing required parameter: assetPath' };
                }
                return await this.getAssetDetails(resolvedAssetPath, args.includeSubAssets);
            case 'query_path':
                return await this.queryAssetPath(args.url);
            case 'query_uuid':
                return await this.queryAssetUuid(args.url);
            case 'query_url':
                return await this.queryAssetUrl(args.uuid);
            default:
                throw new Error(`Unknown asset_query action: ${args.action}`);
        }
    }

    private resolveAssetPathArg(args: any): string | undefined {
        const candidate = args?.assetPath;
        if (typeof candidate !== 'string') return undefined;
        const trimmed = candidate.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private async executeAssetCrud(args: any): Promise<ToolResponse> {
        const action = args.action;
        switch (action) {
            case 'create':
                return await this.createAsset(args.url, args.content, args.overwrite);
            case 'copy':
                return await this.copyAsset(args.source, args.target, args.overwrite);
            case 'move':
                return await this.moveAsset(args.source, args.target, args.overwrite);
            case 'delete':
                return await this.deleteAsset(args.url);
            case 'save':
                return await this.saveAsset(args.url, args.content);
            case 'reimport':
                return await this.reimportAsset(args.url);
            case 'import':
                return await this.importAsset(args.sourcePath, args.targetFolder);
            case 'refresh':
                return await this.refreshAssets(args.folder);
            default:
                throw new Error(`Unknown asset_crud action: ${action}`);
        }
    }

    private async executeProjectInfo(args: any): Promise<ToolResponse> {
        switch (args.action) {
            case 'get_info':
                return await this.getProjectInfo();
            case 'get_settings':
                return await this.getProjectSettings(args.category);
            default:
                throw new Error(`Unknown project_info action: ${args.action}`);
        }
    }

    private async executeProjectBuild(args: any): Promise<ToolResponse> {
        switch (args.action) {
            case 'run':
                return await this.runProject(args.platform);
            case 'build':
                return await this.buildProject(args);
            case 'get_build_settings':
                return await this.getBuildSettings();
            case 'open_build_panel':
                return await this.openBuildPanel();
            case 'check_builder_status':
                return await this.checkBuilderStatus();
            default:
                throw new Error(`Unknown project_build action: ${args.action}`);
        }
    }

    private async executeProjectPreview(args: any): Promise<ToolResponse> {
        switch (args.action) {
            case 'start_server':
                return this.startPreviewServer(args.port);
            case 'stop_server':
                return this.stopPreviewServer();
            default:
                throw new Error(`Unknown project_preview action: ${args.action}`);
        }
    }

    private async runProject(platform: string = 'browser'): Promise<ToolResponse> {
        // The Cocos preview API isn't exposed to extensions; we can only open
        // the build panel. Be honest with the LLM so it doesn't assume the
        // project is running.
        try {
            await editorRequest('builder', 'open');
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
        return {
            success: false,
            error: 'project_build.run is not supported via MCP — opened the build panel instead. Ask the user to start the preview manually.',
            instruction: `Build panel opened. The user must start preview/run for platform "${platform}" manually from the editor UI.`
        };
    }

    private async buildProject(args: any): Promise<ToolResponse> {
        // Builder module only exposes 'open' and 'query-worker-ready' — the
        // actual build pipeline isn't reachable. Don't pretend it ran.
        try {
            await editorRequest('builder', 'open');
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
        return {
            success: false,
            error: 'project_build.build is not supported via MCP — opened the build panel instead. Ask the user to configure and start the build manually.',
            instruction: `Build panel opened for platform "${args?.platform ?? 'unspecified'}". The user must configure and start the build manually.`,
            data: {
                platform: args?.platform ?? null,
                debug: args?.debug !== false,
                actuallyBuilt: false
            }
        };
    }

    private async getProjectInfo(): Promise<ToolResponse> {
        const info: ProjectInfo = {
            name: Editor.Project.name,
            path: Editor.Project.path,
            uuid: Editor.Project.uuid,
            version: (Editor.Project as any).version || '1.0.0',
            cocosVersion: (Editor as any).versions?.cocos || 'Unknown'
        };

        try {
            const additionalInfo: any = await editorRequest('project', 'query-config', 'project');
            if (additionalInfo) {
                Object.assign(info, { config: additionalInfo });
            }
        } catch {
            // Non-fatal — return basic info even if detailed query fails
        }
        return { success: true, data: info };
    }

    private async getProjectSettings(category: string = 'general'): Promise<ToolResponse> {
        const configMap: Record<string, string> = {
            general: 'project',
            physics: 'physics',
            render: 'render',
            assets: 'asset-db'
        };
        const configName = configMap[category] || 'project';

        return toolCall(
            () => editorRequest<any>('project', 'query-config', configName),
            (settings) => ({
                data: {
                    category,
                    config: settings,
                    message: `${category} settings retrieved successfully`
                }
            })
        );
    }

    private async refreshAssets(folder?: string): Promise<ToolResponse> {
        const targetPath = folder ?? 'db://assets';
        const validated = tryValidateAssetUrl(targetPath);
        if (!validated) {
            return { success: false, error: `Invalid folder URL: ${targetPath}` };
        }
        return toolCall(
            () => editorRequest('asset-db', 'refresh-asset', validated),
            () => ({ message: `Assets refreshed in: ${validated}` })
        );
    }

    private async importAsset(sourcePath: string, targetFolder: string): Promise<ToolResponse> {
        if (!sourcePath || typeof sourcePath !== 'string') {
            return { success: false, error: 'Missing required parameter: sourcePath' };
        }
        if (!targetFolder || typeof targetFolder !== 'string') {
            return { success: false, error: 'Missing required parameter: targetFolder' };
        }
        // Reject path traversal in the on-disk source path
        const absSource = path.resolve(sourcePath);
        if (!fs.existsSync(absSource)) {
            return { success: false, error: 'Source file not found' };
        }
        if (!fs.statSync(absSource).isFile()) {
            return { success: false, error: 'Source path is not a regular file' };
        }

        const fileName = path.basename(absSource);
        const rawTarget = targetFolder.startsWith('db://')
            ? targetFolder
            : `db://assets/${targetFolder}`;
        const targetUrl = `${rawTarget.replace(/\/+$/, '')}/${fileName}`;
        const validatedTarget = tryValidateAssetUrl(targetUrl);
        if (!validatedTarget) {
            return { success: false, error: `Invalid target URL: ${targetUrl}` };
        }

        return toolCall(
            () => editorRequest<any>('asset-db', 'import-asset', absSource, validatedTarget),
            (result) => {
                if (!result || !result.uuid) {
                    return { data: { url: validatedTarget, message: `Asset imported: ${fileName}` } };
                }
                return {
                    data: {
                        uuid: result.uuid,
                        path: result.url,
                        message: `Asset imported: ${fileName}`
                    }
                };
            }
        );
    }

    private async getAssetInfo(assetPath: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(assetPath);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${assetPath}` };
        }
        try {
            const assetInfo: any = await editorRequest('asset-db', 'query-asset-info', validated);
            if (!assetInfo) {
                return { success: false, error: 'Asset not found' };
            }

            const info: AssetInfo = {
                name: assetInfo.name,
                uuid: assetInfo.uuid,
                path: assetInfo.url,
                type: assetInfo.type,
                size: assetInfo.size,
                isDirectory: assetInfo.isDirectory
            };

            if (assetInfo.meta) {
                info.meta = {
                    ver: assetInfo.meta.ver,
                    importer: assetInfo.meta.importer
                };
            }

            return { success: true, data: info };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async getAssets(type: string = 'all', folder: string = 'db://assets'): Promise<ToolResponse> {
        const validatedFolder = tryValidateAssetUrl(folder);
        if (!validatedFolder) {
            return { success: false, error: `Invalid folder URL: ${folder}` };
        }
        let pattern = `${validatedFolder}/**/*`;
        if (type !== 'all') {
            const typeExtensions: Record<string, string> = {
                'scene': '.scene',
                'prefab': '.prefab',
                'script': '.{ts,js}',
                'texture': '.{png,jpg,jpeg,gif,tga,bmp,psd}',
                'material': '.mtl',
                'mesh': '.{fbx,obj,dae}',
                'audio': '.{mp3,ogg,wav,m4a}',
                'animation': '.{anim,clip}'
            };
            const extension = typeExtensions[type];
            if (extension) {
                pattern = `${validatedFolder}/**/*${extension}`;
            }
        }

        return toolCall(
            () => editorRequest<any[]>('asset-db', 'query-assets', { pattern }),
            (results) => {
                const list = Array.isArray(results) ? results : [];
                const assets = list.map((asset) => ({
                    name: asset.name,
                    uuid: asset.uuid,
                    path: asset.url,
                    type: asset.type,
                    size: asset.size || 0,
                    isDirectory: asset.isDirectory || false
                }));
                return {
                    data: {
                        type,
                        folder: validatedFolder,
                        count: assets.length,
                        assets
                    }
                };
            }
        );
    }

    private async getBuildSettings(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<boolean>('builder', 'query-worker-ready'),
            (ready) => ({
                data: {
                    builderReady: ready,
                    message: 'Build settings are limited in MCP plugin environment',
                    availableActions: [
                        'Open build panel with open_build_panel',
                        'Check builder status with check_builder_status'
                    ],
                    limitation: 'Full build configuration requires direct Editor UI access'
                }
            })
        );
    }

    private async openBuildPanel(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest('builder', 'open'),
            () => ({ message: 'Build panel opened successfully' })
        );
    }

    private async checkBuilderStatus(): Promise<ToolResponse> {
        return toolCall(
            () => editorRequest<boolean>('builder', 'query-worker-ready'),
            (ready) => ({
                data: {
                    ready,
                    status: ready ? 'Builder worker is ready' : 'Builder worker is not ready',
                    message: 'Builder status checked successfully'
                }
            })
        );
    }

    private startPreviewServer(_port: number = 7456): ToolResponse {
        return {
            success: false,
            error: 'Preview server control is not supported through MCP API',
            instruction: 'Please start the preview server manually using the editor menu: Project > Preview, or use the preview panel in the editor'
        };
    }

    private stopPreviewServer(): ToolResponse {
        return {
            success: false,
            error: 'Preview server control is not supported through MCP API',
            instruction: 'Please stop the preview server manually using the preview panel in the editor'
        };
    }

    private async createAsset(url: string, content: string | null = null, overwrite: boolean = false): Promise<ToolResponse> {
        // AssetSafety.safeCreateAsset performs its own URL validation.
        const result = await AssetSafety.safeCreateAsset(url, content, { overwrite });
        if (result.success) {
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    message: result.message
                }
            };
        }
        return { success: false, error: result.error };
    }

    private async copyAsset(source: string, target: string, overwrite: boolean = false): Promise<ToolResponse> {
        let validatedSource: string;
        let validatedTarget: string;
        try {
            validatedSource = validateAssetUrl(source);
            validatedTarget = validateAssetUrl(target);
        } catch (err: any) {
            return { success: false, error: err.message };
        }
        const options = { overwrite, rename: !overwrite };

        try {
            const result: any = await editorRequest('asset-db', 'copy-asset', validatedSource, validatedTarget, options);
            if (!result || !result.uuid) {
                return {
                    success: false,
                    error: `Copy failed — editor returned no uuid (source=${validatedSource} target=${validatedTarget})`
                };
            }
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    message: 'Asset copied successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async moveAsset(source: string, target: string, overwrite: boolean = false): Promise<ToolResponse> {
        let validatedSource: string;
        let validatedTarget: string;
        try {
            validatedSource = validateAssetUrl(source);
            validatedTarget = validateAssetUrl(target);
        } catch (err: any) {
            return { success: false, error: err.message };
        }
        const options = { overwrite, rename: !overwrite };

        try {
            const result: any = await editorRequest('asset-db', 'move-asset', validatedSource, validatedTarget, options);
            if (!result || !result.uuid) {
                return {
                    success: false,
                    error: `Move failed — editor returned no uuid (source=${validatedSource} target=${validatedTarget})`
                };
            }
            return {
                success: true,
                data: {
                    uuid: result.uuid,
                    url: result.url,
                    message: 'Asset moved successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async deleteAsset(url: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        return toolCall(
            () => editorRequest('asset-db', 'delete-asset', validated),
            () => ({ data: { url: validated, message: 'Asset deleted successfully' } })
        );
    }

    private async saveAsset(url: string, content: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const result: any = await editorRequest('asset-db', 'save-asset', validated, content);
            if (result && result.uuid) {
                return {
                    success: true,
                    data: {
                        uuid: result.uuid,
                        url: result.url,
                        message: 'Asset saved successfully'
                    }
                };
            }
            return {
                success: true,
                data: { url: validated, message: 'Asset saved successfully' }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async reimportAsset(url: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        return toolCall(
            () => editorRequest('asset-db', 'reimport-asset', validated),
            () => ({ data: { url: validated, message: 'Asset reimported successfully' } })
        );
    }

    private async queryAssetPath(url: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const diskPath: string | null = await editorRequest('asset-db', 'query-path', validated);
            if (!diskPath) {
                return { success: false, error: 'Asset path not found' };
            }
            return {
                success: true,
                data: {
                    url: validated,
                    path: diskPath,
                    message: 'Asset path retrieved successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async queryAssetUuid(url: string): Promise<ToolResponse> {
        const validated = tryValidateAssetUrl(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const uuid: string | null = await editorRequest('asset-db', 'query-uuid', validated);
            if (!uuid) {
                return { success: false, error: 'Asset UUID not found' };
            }
            return {
                success: true,
                data: {
                    url: validated,
                    uuid,
                    message: 'Asset UUID retrieved successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async queryAssetUrl(uuid: string): Promise<ToolResponse> {
        if (typeof uuid !== 'string' || !uuid.trim()) {
            return { success: false, error: 'Missing required parameter: uuid' };
        }
        try {
            const url: string | null = await editorRequest('asset-db', 'query-url', uuid);
            if (!url) {
                return { success: false, error: 'Asset URL not found' };
            }
            return {
                success: true,
                data: {
                    uuid,
                    url,
                    message: 'Asset URL retrieved successfully'
                }
            };
        } catch (err: any) {
            return { success: false, error: err?.message ?? String(err) };
        }
    }

    private async findAssetByName(args: any): Promise<ToolResponse> {
        const { name, exactMatch = false, assetType = 'all', folder = 'db://assets', maxResults = 20 } = args;
        if (typeof name !== 'string' || !name) {
            return { success: false, error: 'Missing required parameter: name' };
        }
        try {
            const allAssetsResponse = await this.getAssets(assetType, folder);
            if (!allAssetsResponse.success || !allAssetsResponse.data) {
                return { success: false, error: `Failed to get assets: ${allAssetsResponse.error}` };
            }

            const allAssets = allAssetsResponse.data.assets as any[];
            const matchedAssets: any[] = [];
            const needle = name.toLowerCase();

            for (const asset of allAssets) {
                const assetName: string = asset.name ?? '';
                const matches = exactMatch
                    ? assetName === name
                    : assetName.toLowerCase().includes(needle);
                if (!matches) continue;

                try {
                    const detailResponse = await this.getAssetInfo(asset.path);
                    matchedAssets.push(detailResponse.success
                        ? { ...asset, details: detailResponse.data }
                        : asset);
                } catch {
                    matchedAssets.push(asset);
                }
                if (matchedAssets.length >= maxResults) break;
            }

            return {
                success: true,
                data: {
                    searchTerm: name,
                    exactMatch,
                    assetType,
                    folder,
                    totalFound: matchedAssets.length,
                    maxResults,
                    assets: matchedAssets,
                    message: `Found ${matchedAssets.length} assets matching '${name}'`
                }
            };
        } catch (err: any) {
            return { success: false, error: `Asset search failed: ${err?.message ?? String(err)}` };
        }
    }

    private async getAssetDetails(assetPath: string, includeSubAssets: boolean = true): Promise<ToolResponse> {
        try {
            const assetInfoResponse = await this.getAssetInfo(assetPath);
            if (!assetInfoResponse.success) {
                return assetInfoResponse;
            }

            const assetInfo = assetInfoResponse.data;
            const detailedInfo: any = { ...assetInfo, subAssets: [] };

            const looksLikeImage = assetPath.match(/\.(png|jpg|jpeg|gif|tga|bmp|psd)$/i);
            if (includeSubAssets && assetInfo && (assetInfo.type === 'cc.ImageAsset' || looksLikeImage)) {
                // Heuristic sub-asset suffixes for image assets in Cocos 3.x.
                // These are well-known but not officially documented; if they
                // ever change, the surrounding query-url call will simply fail
                // and we skip the entry.
                const baseUuid = assetInfo.uuid;
                const possibleSubAssets = [
                    { type: 'spriteFrame', uuid: `${baseUuid}@f9941`, suffix: '@f9941' },
                    { type: 'texture', uuid: `${baseUuid}@6c48a`, suffix: '@6c48a' },
                    { type: 'texture2D', uuid: `${baseUuid}@6c48a`, suffix: '@6c48a' }
                ];

                for (const subAsset of possibleSubAssets) {
                    try {
                        const subAssetUrl = await editorRequest('asset-db', 'query-url', subAsset.uuid);
                        if (subAssetUrl) {
                            detailedInfo.subAssets.push({
                                type: subAsset.type,
                                uuid: subAsset.uuid,
                                url: subAssetUrl,
                                suffix: subAsset.suffix
                            });
                        }
                    } catch {
                        // Sub-asset doesn't exist, skip
                    }
                }
            }

            return {
                success: true,
                data: {
                    assetPath,
                    includeSubAssets,
                    ...detailedInfo,
                    message: `Asset details retrieved. Found ${detailedInfo.subAssets.length} sub-assets.`
                }
            };
        } catch (err: any) {
            return { success: false, error: `Failed to get asset details: ${err?.message ?? String(err)}` };
        }
    }
}
