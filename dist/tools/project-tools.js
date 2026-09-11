"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const asset_safety_1 = require("../utils/asset-safety");
const editor_request_1 = require("../utils/editor-request");
class ProjectTools {
    getTools() {
        return [
            {
                name: 'asset_query',
                description: 'Query asset info. Actions: get_info, get_assets (by type), find_by_name, get_details (with sub-assets), query_path (URL→disk path), query_uuid (URL→UUID), query_url (UUID→URL).',
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
                            description: 'Asset path, e.g. db://assets/... (get_info, get_details)'
                        },
                        type: {
                            type: 'string',
                            description: 'Asset type filter (get_assets)',
                            enum: ['all', 'scene', 'prefab', 'script', 'texture', 'material', 'mesh', 'audio', 'animation'],
                            default: 'all'
                        },
                        folder: {
                            type: 'string',
                            description: 'Folder to search in (get_assets, find_by_name)',
                            default: 'db://assets'
                        },
                        name: {
                            type: 'string',
                            description: 'Asset name to search, supports partial match (find_by_name)'
                        },
                        exactMatch: {
                            type: 'boolean',
                            description: 'Exact vs partial name match (find_by_name)',
                            default: false
                        },
                        assetType: {
                            type: 'string',
                            description: 'Filter by asset type (find_by_name)',
                            enum: ['all', 'scene', 'prefab', 'script', 'texture', 'material', 'mesh', 'audio', 'animation', 'spriteFrame'],
                            default: 'all'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Max results (find_by_name)',
                            default: 20,
                            minimum: 1,
                            maximum: 100
                        },
                        includeSubAssets: {
                            type: 'boolean',
                            description: 'Include sub-assets like spriteFrame, texture (get_details)',
                            default: true
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (query_path, query_uuid)'
                        },
                        uuid: {
                            type: 'string',
                            description: 'Asset UUID (query_url)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'asset_crud',
                description: 'Create/modify/manage assets. Actions: create, copy, move, delete, save (content), reimport, import (external file), refresh (asset DB).',
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
                            description: 'Asset URL (create, delete, save, reimport)'
                        },
                        content: {
                            type: 'string',
                            description: 'File content (create [null for folder], save)',
                            default: null
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing file (create, copy, move)',
                            default: false
                        },
                        source: {
                            type: 'string',
                            description: 'Source asset URL (copy, move)'
                        },
                        target: {
                            type: 'string',
                            description: 'Target location URL (copy, move)'
                        },
                        sourcePath: {
                            type: 'string',
                            description: 'Source file path on disk (import)'
                        },
                        targetFolder: {
                            type: 'string',
                            description: 'Target folder in assets (import)'
                        },
                        folder: {
                            type: 'string',
                            description: 'Specific folder to refresh (refresh)'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_info',
                description: 'Get project info/settings. Actions: get_info (name, path, UUID, version), get_settings (by category).',
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
                            description: 'Settings category (get_settings)',
                            enum: ['general', 'physics', 'render', 'assets'],
                            default: 'general'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_build',
                description: 'Inspect Cocos builder state. Actions: open_build_panel, get_build_settings (readiness only, full settings not exposed via MCP), check_builder_status. Cannot trigger an actual build/run/preview from MCP — user must start it manually.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The build action to perform',
                            enum: ['get_build_settings', 'open_build_panel', 'check_builder_status']
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'asset_query':
                return await this.executeAssetQuery(args);
            case 'asset_crud':
                return await this.executeAssetCrud(args);
            case 'project_info':
                return await this.executeProjectInfo(args);
            case 'project_build':
                return await this.executeProjectBuild(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async executeAssetQuery(args) {
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
    resolveAssetPathArg(args) {
        const candidate = args === null || args === void 0 ? void 0 : args.assetPath;
        if (typeof candidate !== 'string')
            return undefined;
        const trimmed = candidate.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    async executeAssetCrud(args) {
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
    async executeProjectInfo(args) {
        switch (args.action) {
            case 'get_info':
                return await this.getProjectInfo();
            case 'get_settings':
                return await this.getProjectSettings(args.category);
            default:
                throw new Error(`Unknown project_info action: ${args.action}`);
        }
    }
    async executeProjectBuild(args) {
        switch (args.action) {
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
    async getProjectInfo() {
        var _a;
        const info = {
            name: Editor.Project.name,
            path: Editor.Project.path,
            uuid: Editor.Project.uuid,
            version: Editor.Project.version || '1.0.0',
            // `Editor.versions` does not exist; the editor version lives on Editor.App.
            cocosVersion: ((_a = Editor.App) === null || _a === void 0 ? void 0 : _a.version) || 'Unknown'
        };
        try {
            const additionalInfo = await (0, editor_request_1.editorRequest)('project', 'query-config', 'project');
            if (additionalInfo) {
                Object.assign(info, { config: additionalInfo });
            }
        }
        catch (_b) {
            // Non-fatal — return basic info even if detailed query fails
        }
        return { success: true, data: info };
    }
    async getProjectSettings(category = 'general') {
        const configMap = {
            general: 'project',
            physics: 'physics',
            render: 'render',
            assets: 'asset-db'
        };
        const configName = configMap[category] || 'project';
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('project', 'query-config', configName), (settings) => ({
            data: {
                category,
                config: settings,
                message: `${category} settings retrieved successfully`
            }
        }));
    }
    async refreshAssets(folder) {
        const targetPath = folder !== null && folder !== void 0 ? folder : 'db://assets';
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(targetPath);
        if (!validated) {
            return { success: false, error: `Invalid folder URL: ${targetPath}` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'refresh-asset', validated), () => ({ message: `Assets refreshed in: ${validated}` }));
    }
    async importAsset(sourcePath, targetFolder) {
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
        const validatedTarget = (0, asset_safety_1.tryValidateAssetUrl)(targetUrl);
        if (!validatedTarget) {
            return { success: false, error: `Invalid target URL: ${targetUrl}` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'import-asset', absSource, validatedTarget), (result) => {
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
        });
    }
    async getAssetInfo(assetPath) {
        var _a;
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(assetPath);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${assetPath}` };
        }
        try {
            const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', validated);
            if (!assetInfo) {
                return { success: false, error: 'Asset not found' };
            }
            const info = {
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async getAssets(type = 'all', folder = 'db://assets') {
        const validatedFolder = (0, asset_safety_1.tryValidateAssetUrl)(folder);
        if (!validatedFolder) {
            return { success: false, error: `Invalid folder URL: ${folder}` };
        }
        let pattern = `${validatedFolder}/**/*`;
        if (type !== 'all') {
            const typeExtensions = {
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
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-assets', { pattern }), (results) => {
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
        });
    }
    async getBuildSettings() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'query-worker-ready'), (ready) => ({
            data: {
                builderReady: ready,
                message: 'Build settings are limited in MCP plugin environment',
                availableActions: [
                    'Open build panel with open_build_panel',
                    'Check builder status with check_builder_status'
                ],
                limitation: 'Full build configuration requires direct Editor UI access'
            }
        }));
    }
    async openBuildPanel() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'open'), () => ({ message: 'Build panel opened successfully' }));
    }
    async checkBuilderStatus() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'query-worker-ready'), (ready) => ({
            data: {
                ready,
                status: ready ? 'Builder worker is ready' : 'Builder worker is not ready',
                message: 'Builder status checked successfully'
            }
        }));
    }
    async createAsset(url, content = null, overwrite = false) {
        // AssetSafety.safeCreateAsset performs its own URL validation.
        const result = await asset_safety_1.AssetSafety.safeCreateAsset(url, content, { overwrite });
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
    async copyAsset(source, target, overwrite = false) {
        var _a;
        let validatedSource;
        let validatedTarget;
        try {
            validatedSource = (0, asset_safety_1.validateAssetUrl)(source);
            validatedTarget = (0, asset_safety_1.validateAssetUrl)(target);
        }
        catch (err) {
            return { success: false, error: err.message };
        }
        const options = { overwrite, rename: !overwrite };
        try {
            const result = await (0, editor_request_1.editorRequest)('asset-db', 'copy-asset', validatedSource, validatedTarget, options);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async moveAsset(source, target, overwrite = false) {
        var _a;
        let validatedSource;
        let validatedTarget;
        try {
            validatedSource = (0, asset_safety_1.validateAssetUrl)(source);
            validatedTarget = (0, asset_safety_1.validateAssetUrl)(target);
        }
        catch (err) {
            return { success: false, error: err.message };
        }
        const options = { overwrite, rename: !overwrite };
        try {
            const result = await (0, editor_request_1.editorRequest)('asset-db', 'move-asset', validatedSource, validatedTarget, options);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async deleteAsset(url) {
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'delete-asset', validated), () => ({ data: { url: validated, message: 'Asset deleted successfully' } }));
    }
    async saveAsset(url, content) {
        var _a;
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const result = await (0, editor_request_1.editorRequest)('asset-db', 'save-asset', validated, content);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async reimportAsset(url) {
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'reimport-asset', validated), () => ({ data: { url: validated, message: 'Asset reimported successfully' } }));
    }
    async queryAssetPath(url) {
        var _a;
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const diskPath = await (0, editor_request_1.editorRequest)('asset-db', 'query-path', validated);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async queryAssetUuid(url) {
        var _a;
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        try {
            const uuid = await (0, editor_request_1.editorRequest)('asset-db', 'query-uuid', validated);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async queryAssetUrl(uuid) {
        var _a;
        if (typeof uuid !== 'string' || !uuid.trim()) {
            return { success: false, error: 'Missing required parameter: uuid' };
        }
        try {
            const url = await (0, editor_request_1.editorRequest)('asset-db', 'query-url', uuid);
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
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
    }
    async findAssetByName(args) {
        var _a, _b;
        const { name, exactMatch = false, assetType = 'all', folder = 'db://assets', maxResults = 20 } = args;
        if (typeof name !== 'string' || !name) {
            return { success: false, error: 'Missing required parameter: name' };
        }
        try {
            const allAssetsResponse = await this.getAssets(assetType, folder);
            if (!allAssetsResponse.success || !allAssetsResponse.data) {
                return { success: false, error: `Failed to get assets: ${allAssetsResponse.error}` };
            }
            const allAssets = allAssetsResponse.data.assets;
            const matchedAssets = [];
            const needle = name.toLowerCase();
            for (const asset of allAssets) {
                const assetName = (_a = asset.name) !== null && _a !== void 0 ? _a : '';
                const matches = exactMatch
                    ? assetName === name
                    : assetName.toLowerCase().includes(needle);
                if (!matches)
                    continue;
                try {
                    const detailResponse = await this.getAssetInfo(asset.path);
                    matchedAssets.push(detailResponse.success
                        ? Object.assign(Object.assign({}, asset), { details: detailResponse.data }) : asset);
                }
                catch (_c) {
                    matchedAssets.push(asset);
                }
                if (matchedAssets.length >= maxResults)
                    break;
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
        }
        catch (err) {
            return { success: false, error: `Asset search failed: ${(_b = err === null || err === void 0 ? void 0 : err.message) !== null && _b !== void 0 ? _b : String(err)}` };
        }
    }
    async getAssetDetails(assetPath, includeSubAssets = true) {
        var _a;
        try {
            const assetInfoResponse = await this.getAssetInfo(assetPath);
            if (!assetInfoResponse.success) {
                return assetInfoResponse;
            }
            const assetInfo = assetInfoResponse.data;
            const detailedInfo = Object.assign(Object.assign({}, assetInfo), { subAssets: [] });
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
                        const subAssetUrl = await (0, editor_request_1.editorRequest)('asset-db', 'query-url', subAsset.uuid);
                        if (subAssetUrl) {
                            detailedInfo.subAssets.push({
                                type: subAsset.type,
                                uuid: subAsset.uuid,
                                url: subAssetUrl,
                                suffix: subAsset.suffix
                            });
                        }
                    }
                    catch (_b) {
                        // Sub-asset doesn't exist, skip
                    }
                }
            }
            return {
                success: true,
                data: Object.assign(Object.assign({ assetPath,
                    includeSubAssets }, detailedInfo), { message: `Asset details retrieved. Found ${detailedInfo.subAssets.length} sub-assets.` })
            };
        }
        catch (err) {
            return { success: false, error: `Failed to get asset details: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err)}` };
        }
    }
}
exports.ProjectTools = ProjectTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isd0RBQTJGO0FBQzNGLDREQUFrRTtBQUVsRSxNQUFhLFlBQVk7SUFDckIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLGtMQUFrTDtnQkFDL0wsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDZCQUE2Qjs0QkFDMUMsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDO3lCQUMzRzt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDBEQUEwRDt5QkFDMUU7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnQ0FBZ0M7NEJBQzdDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDOzRCQUMvRixPQUFPLEVBQUUsS0FBSzt5QkFDakI7d0JBQ0QsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnREFBZ0Q7NEJBQzdELE9BQU8sRUFBRSxhQUFhO3lCQUN6Qjt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxF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VztnQ0FDaEIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNOzZCQUMxQixDQUFDLENBQUM7d0JBQ1AsQ0FBQztvQkFDTCxDQUFDO29CQUFDLFdBQU0sQ0FBQzt3QkFDTCxnQ0FBZ0M7b0JBQ3BDLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFFRCxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksZ0NBQ0EsU0FBUztvQkFDVCxnQkFBZ0IsSUFDYixZQUFZLEtBQ2YsT0FBTyxFQUFFLGtDQUFrQyxZQUFZLENBQUMsU0FBUyxDQUFDLE1BQU0sY0FBYyxHQUN6RjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsZ0NBQWdDLE1BQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sbUNBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNwRyxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBaHdCRCxvQ0Fnd0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBQcm9qZWN0SW5mbywgQXNzZXRJbmZvIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEFzc2V0U2FmZXR5LCB2YWxpZGF0ZUFzc2V0VXJsLCB0cnlWYWxpZGF0ZUFzc2V0VXJsIH0gZnJvbSAnLi4vdXRpbHMvYXNzZXQtc2FmZXR5JztcbmltcG9ydCB7IGVkaXRvclJlcXVlc3QsIHRvb2xDYWxsIH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuXG5leHBvcnQgY2xhc3MgUHJvamVjdFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXNzZXRfcXVlcnknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgYXNzZXQgaW5mby4gQWN0aW9uczogZ2V0X2luZm8sIGdldF9hc3NldHMgKGJ5IHR5cGUpLCBmaW5kX2J5X25hbWUsIGdldF9kZXRhaWxzICh3aXRoIHN1Yi1hc3NldHMpLCBxdWVyeV9wYXRoIChVUkzihpJkaXNrIHBhdGgpLCBxdWVyeV91dWlkIChVUkzihpJVVUlEKSwgcXVlcnlfdXJsIChVVUlE4oaSVVJMKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBxdWVyeSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaW5mbycsICdnZXRfYXNzZXRzJywgJ2ZpbmRfYnlfbmFtZScsICdnZXRfZGV0YWlscycsICdxdWVyeV9wYXRoJywgJ3F1ZXJ5X3V1aWQnLCAncXVlcnlfdXJsJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvLi4uIChnZXRfaW5mbywgZ2V0X2RldGFpbHMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IHR5cGUgZmlsdGVyIChnZXRfYXNzZXRzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydhbGwnLCAnc2NlbmUnLCAncHJlZmFiJywgJ3NjcmlwdCcsICd0ZXh0dXJlJywgJ21hdGVyaWFsJywgJ21lc2gnLCAnYXVkaW8nLCAnYW5pbWF0aW9uJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2FsbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvbGRlciB0byBzZWFyY2ggaW4gKGdldF9hc3NldHMsIGZpbmRfYnlfbmFtZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBuYW1lIHRvIHNlYXJjaCwgc3VwcG9ydHMgcGFydGlhbCBtYXRjaCAoZmluZF9ieV9uYW1lKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBleGFjdE1hdGNoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhhY3QgdnMgcGFydGlhbCBuYW1lIG1hdGNoIChmaW5kX2J5X25hbWUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VHlwZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IGFzc2V0IHR5cGUgKGZpbmRfYnlfbmFtZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3NjZW5lJywgJ3ByZWZhYicsICdzY3JpcHQnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdtZXNoJywgJ2F1ZGlvJywgJ2FuaW1hdGlvbicsICdzcHJpdGVGcmFtZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdhbGwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4UmVzdWx0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4IHJlc3VsdHMgKGZpbmRfYnlfbmFtZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDIwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZVN1YkFzc2V0czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgc3ViLWFzc2V0cyBsaWtlIHNwcml0ZUZyYW1lLCB0ZXh0dXJlIChnZXRfZGV0YWlscyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCAocXVlcnlfcGF0aCwgcXVlcnlfdXVpZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCAocXVlcnlfdXJsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhc3NldF9jcnVkJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZS9tb2RpZnkvbWFuYWdlIGFzc2V0cy4gQWN0aW9uczogY3JlYXRlLCBjb3B5LCBtb3ZlLCBkZWxldGUsIHNhdmUgKGNvbnRlbnQpLCByZWltcG9ydCwgaW1wb3J0IChleHRlcm5hbCBmaWxlKSwgcmVmcmVzaCAoYXNzZXQgREIpLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIENSVUQgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY3JlYXRlJywgJ2NvcHknLCAnbW92ZScsICdkZWxldGUnLCAnc2F2ZScsICdyZWltcG9ydCcsICdpbXBvcnQnLCAncmVmcmVzaCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgKGNyZWF0ZSwgZGVsZXRlLCBzYXZlLCByZWltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsZSBjb250ZW50IChjcmVhdGUgW251bGwgZm9yIGZvbGRlcl0sIHNhdmUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBudWxsXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3ZlcndyaXRlIGV4aXN0aW5nIGZpbGUgKGNyZWF0ZSwgY29weSwgbW92ZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2UgYXNzZXQgVVJMIChjb3B5LCBtb3ZlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBsb2NhdGlvbiBVUkwgKGNvcHksIG1vdmUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZVBhdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBmaWxlIHBhdGggb24gZGlzayAoaW1wb3J0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRGb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBmb2xkZXIgaW4gYXNzZXRzIChpbXBvcnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3BlY2lmaWMgZm9sZGVyIHRvIHJlZnJlc2ggKHJlZnJlc2gpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3Byb2plY3RfaW5mbycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgcHJvamVjdCBpbmZvL3NldHRpbmdzLiBBY3Rpb25zOiBnZXRfaW5mbyAobmFtZSwgcGF0aCwgVVVJRCwgdmVyc2lvbiksIGdldF9zZXR0aW5ncyAoYnkgY2F0ZWdvcnkpLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dldF9pbmZvJywgJ2dldF9zZXR0aW5ncyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldHRpbmdzIGNhdGVnb3J5IChnZXRfc2V0dGluZ3MpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dlbmVyYWwnLCAncGh5c2ljcycsICdyZW5kZXInLCAnYXNzZXRzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2dlbmVyYWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJvamVjdF9idWlsZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbnNwZWN0IENvY29zIGJ1aWxkZXIgc3RhdGUuIEFjdGlvbnM6IG9wZW5fYnVpbGRfcGFuZWwsIGdldF9idWlsZF9zZXR0aW5ncyAocmVhZGluZXNzIG9ubHksIGZ1bGwgc2V0dGluZ3Mgbm90IGV4cG9zZWQgdmlhIE1DUCksIGNoZWNrX2J1aWxkZXJfc3RhdHVzLiBDYW5ub3QgdHJpZ2dlciBhbiBhY3R1YWwgYnVpbGQvcnVuL3ByZXZpZXcgZnJvbSBNQ1Ag4oCUIHVzZXIgbXVzdCBzdGFydCBpdCBtYW51YWxseS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBidWlsZCBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfYnVpbGRfc2V0dGluZ3MnLCAnb3Blbl9idWlsZF9wYW5lbCcsICdjaGVja19idWlsZGVyX3N0YXR1cyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYXNzZXRfcXVlcnknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVBc3NldFF1ZXJ5KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnYXNzZXRfY3J1ZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZUFzc2V0Q3J1ZChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3Byb2plY3RfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVByb2plY3RJbmZvKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncHJvamVjdF9idWlsZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVByb2plY3RCdWlsZChhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVBc3NldFF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkQXNzZXRQYXRoID0gdGhpcy5yZXNvbHZlQXNzZXRQYXRoQXJnKGFyZ3MpO1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfaW5mbyc6XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZEFzc2V0UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogYXNzZXRQYXRoJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8ocmVzb2x2ZWRBc3NldFBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2Fzc2V0cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXRzKGFyZ3MudHlwZSwgYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAnZmluZF9ieV9uYW1lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5maW5kQXNzZXRCeU5hbWUoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdnZXRfZGV0YWlscyc6XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZEFzc2V0UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogYXNzZXRQYXRoJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldERldGFpbHMocmVzb2x2ZWRBc3NldFBhdGgsIGFyZ3MuaW5jbHVkZVN1YkFzc2V0cyk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9wYXRoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUFzc2V0UGF0aChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV91dWlkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUFzc2V0VXVpZChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV91cmwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5QXNzZXRVcmwoYXJncy51dWlkKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFzc2V0X3F1ZXJ5IGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgcmVzb2x2ZUFzc2V0UGF0aEFyZyhhcmdzOiBhbnkpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGUgPSBhcmdzPy5hc3NldFBhdGg7XG4gICAgICAgIGlmICh0eXBlb2YgY2FuZGlkYXRlICE9PSAnc3RyaW5nJykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGNhbmRpZGF0ZS50cmltKCk7XG4gICAgICAgIHJldHVybiB0cmltbWVkLmxlbmd0aCA+IDAgPyB0cmltbWVkIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZUFzc2V0Q3J1ZChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbjtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlQXNzZXQoYXJncy51cmwsIGFyZ3MuY29udGVudCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnY29weSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29weUFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnbW92ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubW92ZUFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kZWxldGVBc3NldChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdzYXZlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlQXNzZXQoYXJncy51cmwsIGFyZ3MuY29udGVudCk7XG4gICAgICAgICAgICBjYXNlICdyZWltcG9ydCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVpbXBvcnRBc3NldChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmltcG9ydEFzc2V0KGFyZ3Muc291cmNlUGF0aCwgYXJncy50YXJnZXRGb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAncmVmcmVzaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVmcmVzaEFzc2V0cyhhcmdzLmZvbGRlcik7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhc3NldF9jcnVkIGFjdGlvbjogJHthY3Rpb259YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVQcm9qZWN0SW5mbyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJvamVjdEluZm8oKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0UHJvamVjdFNldHRpbmdzKGFyZ3MuY2F0ZWdvcnkpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvamVjdF9pbmZvIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVByb2plY3RCdWlsZChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfYnVpbGRfc2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEJ1aWxkU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIGNhc2UgJ29wZW5fYnVpbGRfcGFuZWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLm9wZW5CdWlsZFBhbmVsKCk7XG4gICAgICAgICAgICBjYXNlICdjaGVja19idWlsZGVyX3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2hlY2tCdWlsZGVyU3RhdHVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9qZWN0X2J1aWxkIGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJvamVjdEluZm8oKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgaW5mbzogUHJvamVjdEluZm8gPSB7XG4gICAgICAgICAgICBuYW1lOiBFZGl0b3IuUHJvamVjdC5uYW1lLFxuICAgICAgICAgICAgcGF0aDogRWRpdG9yLlByb2plY3QucGF0aCxcbiAgICAgICAgICAgIHV1aWQ6IEVkaXRvci5Qcm9qZWN0LnV1aWQsXG4gICAgICAgICAgICB2ZXJzaW9uOiAoRWRpdG9yLlByb2plY3QgYXMgYW55KS52ZXJzaW9uIHx8ICcxLjAuMCcsXG4gICAgICAgICAgICAvLyBgRWRpdG9yLnZlcnNpb25zYCBkb2VzIG5vdCBleGlzdDsgdGhlIGVkaXRvciB2ZXJzaW9uIGxpdmVzIG9uIEVkaXRvci5BcHAuXG4gICAgICAgICAgICBjb2Nvc1ZlcnNpb246IChFZGl0b3IgYXMgYW55KS5BcHA/LnZlcnNpb24gfHwgJ1Vua25vd24nXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFkZGl0aW9uYWxJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdwcm9qZWN0JywgJ3F1ZXJ5LWNvbmZpZycsICdwcm9qZWN0Jyk7XG4gICAgICAgICAgICBpZiAoYWRkaXRpb25hbEluZm8pIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKGluZm8sIHsgY29uZmlnOiBhZGRpdGlvbmFsSW5mbyB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAvLyBOb24tZmF0YWwg4oCUIHJldHVybiBiYXNpYyBpbmZvIGV2ZW4gaWYgZGV0YWlsZWQgcXVlcnkgZmFpbHNcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBpbmZvIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcm9qZWN0U2V0dGluZ3MoY2F0ZWdvcnk6IHN0cmluZyA9ICdnZW5lcmFsJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGNvbmZpZ01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICAgIGdlbmVyYWw6ICdwcm9qZWN0JyxcbiAgICAgICAgICAgIHBoeXNpY3M6ICdwaHlzaWNzJyxcbiAgICAgICAgICAgIHJlbmRlcjogJ3JlbmRlcicsXG4gICAgICAgICAgICBhc3NldHM6ICdhc3NldC1kYidcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgY29uZmlnTmFtZSA9IGNvbmZpZ01hcFtjYXRlZ29yeV0gfHwgJ3Byb2plY3QnO1xuXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55PigncHJvamVjdCcsICdxdWVyeS1jb25maWcnLCBjb25maWdOYW1lKSxcbiAgICAgICAgICAgIChzZXR0aW5ncykgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICBjb25maWc6IHNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHtjYXRlZ29yeX0gc2V0dGluZ3MgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVmcmVzaEFzc2V0cyhmb2xkZXI/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gZm9sZGVyID8/ICdkYjovL2Fzc2V0cyc7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwodGFyZ2V0UGF0aCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGZvbGRlciBVUkw6ICR7dGFyZ2V0UGF0aH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIHZhbGlkYXRlZCksXG4gICAgICAgICAgICAoKSA9PiAoeyBtZXNzYWdlOiBgQXNzZXRzIHJlZnJlc2hlZCBpbjogJHt2YWxpZGF0ZWR9YCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaW1wb3J0QXNzZXQoc291cmNlUGF0aDogc3RyaW5nLCB0YXJnZXRGb2xkZXI6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGlmICghc291cmNlUGF0aCB8fCB0eXBlb2Ygc291cmNlUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiBzb3VyY2VQYXRoJyB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghdGFyZ2V0Rm9sZGVyIHx8IHR5cGVvZiB0YXJnZXRGb2xkZXIgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogdGFyZ2V0Rm9sZGVyJyB9O1xuICAgICAgICB9XG4gICAgICAgIC8vIFJlamVjdCBwYXRoIHRyYXZlcnNhbCBpbiB0aGUgb24tZGlzayBzb3VyY2UgcGF0aFxuICAgICAgICBjb25zdCBhYnNTb3VyY2UgPSBwYXRoLnJlc29sdmUoc291cmNlUGF0aCk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNTb3VyY2UpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdTb3VyY2UgZmlsZSBub3QgZm91bmQnIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFmcy5zdGF0U3luYyhhYnNTb3VyY2UpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdTb3VyY2UgcGF0aCBpcyBub3QgYSByZWd1bGFyIGZpbGUnIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoYWJzU291cmNlKTtcbiAgICAgICAgY29uc3QgcmF3VGFyZ2V0ID0gdGFyZ2V0Rm9sZGVyLnN0YXJ0c1dpdGgoJ2RiOi8vJylcbiAgICAgICAgICAgID8gdGFyZ2V0Rm9sZGVyXG4gICAgICAgICAgICA6IGBkYjovL2Fzc2V0cy8ke3RhcmdldEZvbGRlcn1gO1xuICAgICAgICBjb25zdCB0YXJnZXRVcmwgPSBgJHtyYXdUYXJnZXQucmVwbGFjZSgvXFwvKyQvLCAnJyl9LyR7ZmlsZU5hbWV9YDtcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkVGFyZ2V0ID0gdHJ5VmFsaWRhdGVBc3NldFVybCh0YXJnZXRVcmwpO1xuICAgICAgICBpZiAoIXZhbGlkYXRlZFRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCB0YXJnZXQgVVJMOiAke3RhcmdldFVybH1gIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsIGFic1NvdXJjZSwgdmFsaWRhdGVkVGFyZ2V0KSxcbiAgICAgICAgICAgIChyZXN1bHQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgZGF0YTogeyB1cmw6IHZhbGlkYXRlZFRhcmdldCwgbWVzc2FnZTogYEFzc2V0IGltcG9ydGVkOiAke2ZpbGVOYW1lfWAgfSB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHJlc3VsdC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgaW1wb3J0ZWQ6ICR7ZmlsZU5hbWV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0SW5mbyhhc3NldFBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwoYXNzZXRQYXRoKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke2Fzc2V0UGF0aH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbzogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHZhbGlkYXRlZCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0Fzc2V0IG5vdCBmb3VuZCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgaW5mbzogQXNzZXRJbmZvID0ge1xuICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0SW5mby5uYW1lLFxuICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0SW5mby51dWlkLFxuICAgICAgICAgICAgICAgIHBhdGg6IGFzc2V0SW5mby51cmwsXG4gICAgICAgICAgICAgICAgdHlwZTogYXNzZXRJbmZvLnR5cGUsXG4gICAgICAgICAgICAgICAgc2l6ZTogYXNzZXRJbmZvLnNpemUsXG4gICAgICAgICAgICAgICAgaXNEaXJlY3Rvcnk6IGFzc2V0SW5mby5pc0RpcmVjdG9yeVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGFzc2V0SW5mby5tZXRhKSB7XG4gICAgICAgICAgICAgICAgaW5mby5tZXRhID0ge1xuICAgICAgICAgICAgICAgICAgICB2ZXI6IGFzc2V0SW5mby5tZXRhLnZlcixcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0ZXI6IGFzc2V0SW5mby5tZXRhLmltcG9ydGVyXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaW5mbyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXRzKHR5cGU6IHN0cmluZyA9ICdhbGwnLCBmb2xkZXI6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWRGb2xkZXIgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKGZvbGRlcik7XG4gICAgICAgIGlmICghdmFsaWRhdGVkRm9sZGVyKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGZvbGRlciBVUkw6ICR7Zm9sZGVyfWAgfTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgcGF0dGVybiA9IGAke3ZhbGlkYXRlZEZvbGRlcn0vKiovKmA7XG4gICAgICAgIGlmICh0eXBlICE9PSAnYWxsJykge1xuICAgICAgICAgICAgY29uc3QgdHlwZUV4dGVuc2lvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgICAgICAgICAgJ3NjZW5lJzogJy5zY2VuZScsXG4gICAgICAgICAgICAgICAgJ3ByZWZhYic6ICcucHJlZmFiJyxcbiAgICAgICAgICAgICAgICAnc2NyaXB0JzogJy57dHMsanN9JyxcbiAgICAgICAgICAgICAgICAndGV4dHVyZSc6ICcue3BuZyxqcGcsanBlZyxnaWYsdGdhLGJtcCxwc2R9JyxcbiAgICAgICAgICAgICAgICAnbWF0ZXJpYWwnOiAnLm10bCcsXG4gICAgICAgICAgICAgICAgJ21lc2gnOiAnLntmYngsb2JqLGRhZX0nLFxuICAgICAgICAgICAgICAgICdhdWRpbyc6ICcue21wMyxvZ2csd2F2LG00YX0nLFxuICAgICAgICAgICAgICAgICdhbmltYXRpb24nOiAnLnthbmltLGNsaXB9J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IHR5cGVFeHRlbnNpb25zW3R5cGVdO1xuICAgICAgICAgICAgaWYgKGV4dGVuc2lvbikge1xuICAgICAgICAgICAgICAgIHBhdHRlcm4gPSBgJHt2YWxpZGF0ZWRGb2xkZXJ9LyoqLyoke2V4dGVuc2lvbn1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnlbXT4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybiB9KSxcbiAgICAgICAgICAgIChyZXN1bHRzKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGlzdCA9IEFycmF5LmlzQXJyYXkocmVzdWx0cykgPyByZXN1bHRzIDogW107XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gbGlzdC5tYXAoKGFzc2V0KSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IGFzc2V0LnNpemUgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgaXNEaXJlY3Rvcnk6IGFzc2V0LmlzRGlyZWN0b3J5IHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHZhbGlkYXRlZEZvbGRlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBhc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QnVpbGRTZXR0aW5ncygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGJvb2xlYW4+KCdidWlsZGVyJywgJ3F1ZXJ5LXdvcmtlci1yZWFkeScpLFxuICAgICAgICAgICAgKHJlYWR5KSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYnVpbGRlclJlYWR5OiByZWFkeSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0J1aWxkIHNldHRpbmdzIGFyZSBsaW1pdGVkIGluIE1DUCBwbHVnaW4gZW52aXJvbm1lbnQnLFxuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVBY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAnT3BlbiBidWlsZCBwYW5lbCB3aXRoIG9wZW5fYnVpbGRfcGFuZWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0NoZWNrIGJ1aWxkZXIgc3RhdHVzIHdpdGggY2hlY2tfYnVpbGRlcl9zdGF0dXMnXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgIGxpbWl0YXRpb246ICdGdWxsIGJ1aWxkIGNvbmZpZ3VyYXRpb24gcmVxdWlyZXMgZGlyZWN0IEVkaXRvciBVSSBhY2Nlc3MnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5CdWlsZFBhbmVsKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ0J1aWxkIHBhbmVsIG9wZW5lZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja0J1aWxkZXJTdGF0dXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPignYnVpbGRlcicsICdxdWVyeS13b3JrZXItcmVhZHknKSxcbiAgICAgICAgICAgIChyZWFkeSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHJlYWR5ID8gJ0J1aWxkZXIgd29ya2VyIGlzIHJlYWR5JyA6ICdCdWlsZGVyIHdvcmtlciBpcyBub3QgcmVhZHknLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQnVpbGRlciBzdGF0dXMgY2hlY2tlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZUFzc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcgfCBudWxsID0gbnVsbCwgb3ZlcndyaXRlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBBc3NldFNhZmV0eS5zYWZlQ3JlYXRlQXNzZXQgcGVyZm9ybXMgaXRzIG93biBVUkwgdmFsaWRhdGlvbi5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXNzZXRTYWZldHkuc2FmZUNyZWF0ZUFzc2V0KHVybCwgY29udGVudCwgeyBvdmVyd3JpdGUgfSk7XG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVzdWx0Lm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0LmVycm9yIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjb3B5QXNzZXQoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nLCBvdmVyd3JpdGU6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGxldCB2YWxpZGF0ZWRTb3VyY2U6IHN0cmluZztcbiAgICAgICAgbGV0IHZhbGlkYXRlZFRhcmdldDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFsaWRhdGVkU291cmNlID0gdmFsaWRhdGVBc3NldFVybChzb3VyY2UpO1xuICAgICAgICAgICAgdmFsaWRhdGVkVGFyZ2V0ID0gdmFsaWRhdGVBc3NldFVybCh0YXJnZXQpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IG92ZXJ3cml0ZSwgcmVuYW1lOiAhb3ZlcndyaXRlIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAnY29weS1hc3NldCcsIHZhbGlkYXRlZFNvdXJjZSwgdmFsaWRhdGVkVGFyZ2V0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvcHkgZmFpbGVkIOKAlCBlZGl0b3IgcmV0dXJuZWQgbm8gdXVpZCAoc291cmNlPSR7dmFsaWRhdGVkU291cmNlfSB0YXJnZXQ9JHt2YWxpZGF0ZWRUYXJnZXR9KWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IGNvcGllZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG1vdmVBc3NldChzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcsIG92ZXJ3cml0ZTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgbGV0IHZhbGlkYXRlZFNvdXJjZTogc3RyaW5nO1xuICAgICAgICBsZXQgdmFsaWRhdGVkVGFyZ2V0OiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWxpZGF0ZWRTb3VyY2UgPSB2YWxpZGF0ZUFzc2V0VXJsKHNvdXJjZSk7XG4gICAgICAgICAgICB2YWxpZGF0ZWRUYXJnZXQgPSB2YWxpZGF0ZUFzc2V0VXJsKHRhcmdldCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgb3ZlcndyaXRlLCByZW5hbWU6ICFvdmVyd3JpdGUgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdtb3ZlLWFzc2V0JywgdmFsaWRhdGVkU291cmNlLCB2YWxpZGF0ZWRUYXJnZXQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC51dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgTW92ZSBmYWlsZWQg4oCUIGVkaXRvciByZXR1cm5lZCBubyB1dWlkIChzb3VyY2U9JHt2YWxpZGF0ZWRTb3VyY2V9IHRhcmdldD0ke3ZhbGlkYXRlZFRhcmdldH0pYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgbW92ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkZWxldGVBc3NldCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwodXJsKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke3VybH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgICgpID0+ICh7IGRhdGE6IHsgdXJsOiB2YWxpZGF0ZWQsIG1lc3NhZ2U6ICdBc3NldCBkZWxldGVkIHN1Y2Nlc3NmdWxseScgfSB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUFzc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQnLCB2YWxpZGF0ZWQsIGNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IHNhdmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1cmw6IHZhbGlkYXRlZCwgbWVzc2FnZTogJ0Fzc2V0IHNhdmVkIHN1Y2Nlc3NmdWxseScgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlaW1wb3J0QXNzZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlaW1wb3J0LWFzc2V0JywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgICgpID0+ICh7IGRhdGE6IHsgdXJsOiB2YWxpZGF0ZWQsIG1lc3NhZ2U6ICdBc3NldCByZWltcG9ydGVkIHN1Y2Nlc3NmdWxseScgfSB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlBc3NldFBhdGgodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXNrUGF0aDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCB2YWxpZGF0ZWQpO1xuICAgICAgICAgICAgaWYgKCFkaXNrUGF0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0Fzc2V0IHBhdGggbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB2YWxpZGF0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGRpc2tQYXRoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgcGF0aCByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUFzc2V0VXVpZCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwodXJsKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke3VybH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHV1aWQ6IHN0cmluZyB8IG51bGwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgdmFsaWRhdGVkKTtcbiAgICAgICAgICAgIGlmICghdXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0Fzc2V0IFVVSUQgbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB2YWxpZGF0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBc3NldCBVVUlEIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5QXNzZXRVcmwodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKHR5cGVvZiB1dWlkICE9PSAnc3RyaW5nJyB8fCAhdXVpZC50cmltKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiB1dWlkJyB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB1cmw6IHN0cmluZyB8IG51bGwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCB1dWlkKTtcbiAgICAgICAgICAgIGlmICghdXJsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgVVJMIG5vdCBmb3VuZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IFVSTCByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQXNzZXRCeU5hbWUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBuYW1lLCBleGFjdE1hdGNoID0gZmFsc2UsIGFzc2V0VHlwZSA9ICdhbGwnLCBmb2xkZXIgPSAnZGI6Ly9hc3NldHMnLCBtYXhSZXN1bHRzID0gMjAgfSA9IGFyZ3M7XG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycgfHwgIW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiBuYW1lJyB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhbGxBc3NldHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0QXNzZXRzKGFzc2V0VHlwZSwgZm9sZGVyKTtcbiAgICAgICAgICAgIGlmICghYWxsQXNzZXRzUmVzcG9uc2Uuc3VjY2VzcyB8fCAhYWxsQXNzZXRzUmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgYXNzZXRzOiAke2FsbEFzc2V0c1Jlc3BvbnNlLmVycm9yfWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYWxsQXNzZXRzID0gYWxsQXNzZXRzUmVzcG9uc2UuZGF0YS5hc3NldHMgYXMgYW55W107XG4gICAgICAgICAgICBjb25zdCBtYXRjaGVkQXNzZXRzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgbmVlZGxlID0gbmFtZS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFsbEFzc2V0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0TmFtZTogc3RyaW5nID0gYXNzZXQubmFtZSA/PyAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBtYXRjaGVzID0gZXhhY3RNYXRjaFxuICAgICAgICAgICAgICAgICAgICA/IGFzc2V0TmFtZSA9PT0gbmFtZVxuICAgICAgICAgICAgICAgICAgICA6IGFzc2V0TmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKG5lZWRsZSk7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRjaGVzKSBjb250aW51ZTtcblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbFJlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8oYXNzZXQucGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRBc3NldHMucHVzaChkZXRhaWxSZXNwb25zZS5zdWNjZXNzXG4gICAgICAgICAgICAgICAgICAgICAgICA/IHsgLi4uYXNzZXQsIGRldGFpbHM6IGRldGFpbFJlc3BvbnNlLmRhdGEgfVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBhc3NldCk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZWRBc3NldHMucHVzaChhc3NldCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtYXRjaGVkQXNzZXRzLmxlbmd0aCA+PSBtYXhSZXN1bHRzKSBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc2VhcmNoVGVybTogbmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZXhhY3RNYXRjaCxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRUeXBlLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRm91bmQ6IG1hdGNoZWRBc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBhc3NldHM6IG1hdGNoZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke21hdGNoZWRBc3NldHMubGVuZ3RofSBhc3NldHMgbWF0Y2hpbmcgJyR7bmFtZX0nYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBzZWFyY2ggZmFpbGVkOiAke2Vycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0RGV0YWlscyhhc3NldFBhdGg6IHN0cmluZywgaW5jbHVkZVN1YkFzc2V0czogYm9vbGVhbiA9IHRydWUpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldEFzc2V0SW5mbyhhc3NldFBhdGgpO1xuICAgICAgICAgICAgaWYgKCFhc3NldEluZm9SZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFzc2V0SW5mb1Jlc3BvbnNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhc3NldEluZm9SZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgY29uc3QgZGV0YWlsZWRJbmZvOiBhbnkgPSB7IC4uLmFzc2V0SW5mbywgc3ViQXNzZXRzOiBbXSB9O1xuXG4gICAgICAgICAgICBjb25zdCBsb29rc0xpa2VJbWFnZSA9IGFzc2V0UGF0aC5tYXRjaCgvXFwuKHBuZ3xqcGd8anBlZ3xnaWZ8dGdhfGJtcHxwc2QpJC9pKTtcbiAgICAgICAgICAgIGlmIChpbmNsdWRlU3ViQXNzZXRzICYmIGFzc2V0SW5mbyAmJiAoYXNzZXRJbmZvLnR5cGUgPT09ICdjYy5JbWFnZUFzc2V0JyB8fCBsb29rc0xpa2VJbWFnZSkpIHtcbiAgICAgICAgICAgICAgICAvLyBIZXVyaXN0aWMgc3ViLWFzc2V0IHN1ZmZpeGVzIGZvciBpbWFnZSBhc3NldHMgaW4gQ29jb3MgMy54LlxuICAgICAgICAgICAgICAgIC8vIFRoZXNlIGFyZSB3ZWxsLWtub3duIGJ1dCBub3Qgb2ZmaWNpYWxseSBkb2N1bWVudGVkOyBpZiB0aGV5XG4gICAgICAgICAgICAgICAgLy8gZXZlciBjaGFuZ2UsIHRoZSBzdXJyb3VuZGluZyBxdWVyeS11cmwgY2FsbCB3aWxsIHNpbXBseSBmYWlsXG4gICAgICAgICAgICAgICAgLy8gYW5kIHdlIHNraXAgdGhlIGVudHJ5LlxuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVdWlkID0gYXNzZXRJbmZvLnV1aWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9zc2libGVTdWJBc3NldHMgPSBbXG4gICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3Nwcml0ZUZyYW1lJywgdXVpZDogYCR7YmFzZVV1aWR9QGY5OTQxYCwgc3VmZml4OiAnQGY5OTQxJyB9LFxuICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICd0ZXh0dXJlJywgdXVpZDogYCR7YmFzZVV1aWR9QDZjNDhhYCwgc3VmZml4OiAnQDZjNDhhJyB9LFxuICAgICAgICAgICAgICAgICAgICB7IHR5cGU6ICd0ZXh0dXJlMkQnLCB1dWlkOiBgJHtiYXNlVXVpZH1ANmM0OGFgLCBzdWZmaXg6ICdANmM0OGEnIH1cbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzdWJBc3NldCBvZiBwb3NzaWJsZVN1YkFzc2V0cykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViQXNzZXRVcmwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBzdWJBc3NldC51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWJBc3NldFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRldGFpbGVkSW5mby5zdWJBc3NldHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHN1YkFzc2V0LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHN1YkFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogc3ViQXNzZXRVcmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1ZmZpeDogc3ViQXNzZXQuc3VmZml4XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3ViLWFzc2V0IGRvZXNuJ3QgZXhpc3QsIHNraXBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRQYXRoLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlU3ViQXNzZXRzLFxuICAgICAgICAgICAgICAgICAgICAuLi5kZXRhaWxlZEluZm8sXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBc3NldCBkZXRhaWxzIHJldHJpZXZlZC4gRm91bmQgJHtkZXRhaWxlZEluZm8uc3ViQXNzZXRzLmxlbmd0aH0gc3ViLWFzc2V0cy5gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgYXNzZXQgZGV0YWlsczogJHtlcnI/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycil9YCB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19