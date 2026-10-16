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
                annotations: { readOnlyHint: true },
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
                description: 'Create/modify/manage assets. Actions: create, copy, move, delete, save (content), reimport, import (external file), refresh (asset DB), get_meta, set_meta (import settings in .meta).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The CRUD action to perform',
                            enum: ['create', 'copy', 'move', 'delete', 'save', 'reimport', 'import', 'refresh', 'get_meta', 'set_meta']
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL (create, delete, save, reimport, get_meta, set_meta)'
                        },
                        metaChanges: {
                            type: 'object',
                            description: 'Deep-merged into the .meta, e.g. {"userData":{"compressSettings":{...}}} or {"subMetas":{"<id>":{"userData":{...}}}}; get_meta first (set_meta)'
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
                annotations: { readOnlyHint: true },
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
                description: 'Cocos builder. Actions: build (queue a build task, returns at once; runs the project\'s build plugins, which may edit source files), build_status (poll tasks), cancel_build, open_build_panel, get_build_settings, check_builder_status.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The build action to perform',
                            enum: ['build', 'build_status', 'cancel_build', 'get_build_settings', 'open_build_panel', 'check_builder_status']
                        },
                        platform: {
                            type: 'string',
                            description: 'e.g. web-mobile, android, ios; defaults to the newest task\'s platform (build)'
                        },
                        buildOptions: {
                            type: 'object',
                            description: 'Overrides, e.g. {"debug":true,"md5Cache":true}; the builder validates and fills the rest (build)'
                        },
                        taskId: {
                            type: 'string',
                            description: 'Task id from build (build_status: one task, else all; cancel_build: required)'
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
            case 'get_meta':
                return await this.getAssetMeta(args.url);
            case 'set_meta':
                return await this.setAssetMeta(args.url, args.metaChanges);
            default:
                return { success: false, error: `Unknown action '${action}'. Valid actions: create, copy, move, delete, save, reimport, import, refresh, get_meta, set_meta` };
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
            case 'build':
                return await this.startBuild(args.platform, args.buildOptions);
            case 'build_status':
                return await this.buildStatus(args.taskId);
            case 'cancel_build':
                if (!args.taskId)
                    return { success: false, error: 'taskId is required' };
                return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'break-task', args.taskId), () => ({ message: `Cancel requested for ${args.taskId}` }));
            default:
                return { success: false, error: `Unknown action '${args.action}'. Valid actions: build, build_status, cancel_build, get_build_settings, open_build_panel, check_builder_status` };
        }
    }
    // add-task queues happily on bad options and an already-busy builder, so validate
    // with the builder's own check-and-complete-options and report any task ahead.
    async startBuild(platform, overrides) {
        var _a, _b, _c, _d, _e;
        try {
            const before = await (0, editor_request_1.editorRequest)('builder', 'query-tasks-info', { type: 'build' });
            const tasks = (_a = before === null || before === void 0 ? void 0 : before.list) !== null && _a !== void 0 ? _a : [];
            // Task ids are creation timestamps; the list order is not reliable.
            const newest = [...tasks].sort((a, b) => Number(b.id) - Number(a.id))[0];
            const options = Object.assign(Object.assign({}, (overrides !== null && overrides !== void 0 ? overrides : {})), { platform: platform || (overrides === null || overrides === void 0 ? void 0 : overrides.platform) || ((_b = newest === null || newest === void 0 ? void 0 : newest.options) === null || _b === void 0 ? void 0 : _b.platform) });
            if (!options.platform) {
                return { success: false, error: 'platform is required (no previous build task to take it from)' };
            }
            let completed;
            try {
                completed = await (0, editor_request_1.editorRequest)('builder', 'check-and-complete-options', options);
            }
            catch (err) {
                const cfg = await (0, editor_request_1.editorRequest)('builder', 'query-platform-config').catch(() => null);
                return { success: false, error: `Builder rejected the options: ${(_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err}.${(cfg === null || cfg === void 0 ? void 0 : cfg.order) ? ` Valid platforms: ${cfg.order.join(', ')}` : ''}` };
            }
            const known = new Set(tasks.map(t => t.id));
            // shouldWait=false: returns TaskAddResult right away (0 busy, 1 queued, 2 param error).
            const code = await (0, editor_request_1.editorRequest)('builder', 'add-task', completed, false);
            if (code !== 1) {
                return { success: false, error: `add-task returned ${code === 0 ? 'BUSY' : code === 2 ? 'PARAM_ERROR' : code}` };
            }
            const after = await (0, editor_request_1.editorRequest)('builder', 'query-tasks-info', { type: 'build' });
            const task = ((_d = after === null || after === void 0 ? void 0 : after.list) !== null && _d !== void 0 ? _d : []).find((t) => !known.has(t.id));
            const ahead = tasks.filter(t => t.state === 'processing' || t.state === 'waiting').map(t => t.id);
            return {
                success: true,
                message: 'Build queued; poll build_status with taskId',
                data: Object.assign({ taskId: task === null || task === void 0 ? void 0 : task.id, platform: completed.platform, dest: `${completed.buildPath}/${completed.outputName}` }, (ahead.length && { queuedBehind: ahead }))
            };
        }
        catch (err) {
            return { success: false, error: (_e = err === null || err === void 0 ? void 0 : err.message) !== null && _e !== void 0 ? _e : String(err) };
        }
    }
    async buildStatus(taskId) {
        const brief = (t) => {
            var _a;
            return ({
                id: t.id,
                state: t.state,
                progress: t.progress,
                message: t.message,
                detailMessage: t.detailMessage,
                platform: (_a = t.options) === null || _a === void 0 ? void 0 : _a.platform,
                dest: t.options && `${t.options.buildPath}/${t.options.outputName}`
            });
        };
        if (taskId) {
            return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'query-task', taskId), (t) => (t ? { data: brief(t) } : { success: false, error: `No build task ${taskId}` }));
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('builder', 'query-tasks-info', { type: 'build' }), (info) => { var _a; return ({ data: { free: info === null || info === void 0 ? void 0 : info.free, tasks: ((_a = info === null || info === void 0 ? void 0 : info.list) !== null && _a !== void 0 ? _a : []).map(brief) } }); });
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
                message: 'Use build_status for the options of past tasks; build validates and completes options itself'
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
    async getAssetMeta(url) {
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url, { allowInternal: true });
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-asset-meta', validated), (meta) => (meta ? { data: { url: validated, meta } } : { success: false, error: `Asset not found: ${validated}` }));
    }
    async setAssetMeta(url, changes) {
        var _a;
        const validated = (0, asset_safety_1.tryValidateAssetUrl)(url);
        if (!validated) {
            return { success: false, error: `Invalid asset URL: ${url}` };
        }
        if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
            return { success: false, error: 'metaChanges must be an object' };
        }
        // Changing these would orphan every reference to the asset or confuse the importer.
        const locked = ['uuid', 'importer', 'ver'].filter(k => k in changes);
        if (locked.length) {
            return { success: false, error: `metaChanges cannot change: ${locked.join(', ')}` };
        }
        // Objects merge key by key; anything else (incl. arrays) replaces.
        const merge = (base, patch) => {
            if (!patch || typeof patch !== 'object' || Array.isArray(patch))
                return patch;
            const out = base && typeof base === 'object' && !Array.isArray(base) ? Object.assign({}, base) : {};
            for (const [k, v] of Object.entries(patch))
                out[k] = merge(out[k], v);
            return out;
        };
        try {
            const meta = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-meta', validated);
            if (!meta) {
                return { success: false, error: `Asset not found: ${validated}` };
            }
            const next = merge(meta, changes);
            await (0, editor_request_1.editorRequest)('asset-db', 'save-asset-meta', validated, JSON.stringify(next, null, 2));
            return { success: true, data: { url: validated, meta: next } };
        }
        catch (err) {
            return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isd0RBQTJGO0FBQzNGLDREQUFrRTtBQUVsRSxNQUFhLFlBQVk7SUFDckIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRTtnQkFDbkMsV0FBVyxFQUFFLGtMQUFrTDtnQkFDL0wsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDZCQUE2Qjs0QkFDMUMsSUFBSSxFQUFFLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsV0FBVyxDQUFDO3lCQUMzRzt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDBEQUEwRDt5QkFDMUU7d0JBQ0QsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnQ0FBZ0M7NEJBQzdDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDOzRCQUMvRixPQUFPLEVBQUUsS0FBSzt5QkFDakI7d0JBQ0QsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnREFBZ0Q7NEJBQzdELE9BQU8sRUFB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QUM7WUFDTCxDQUFDO1lBRUQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLGdDQUNBLFNBQVM7b0JBQ1QsZ0JBQWdCLElBQ2IsWUFBWSxLQUNmLE9BQU8sRUFBRSxrQ0FBa0MsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLGNBQWMsR0FDekY7YUFDSixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGdDQUFnQyxNQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxPQUFPLG1DQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDcEcsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQXI0QkQsb0NBcTRCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgUHJvamVjdEluZm8sIEFzc2V0SW5mbyB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBBc3NldFNhZmV0eSwgdmFsaWRhdGVBc3NldFVybCwgdHJ5VmFsaWRhdGVBc3NldFVybCB9IGZyb20gJy4uL3V0aWxzL2Fzc2V0LXNhZmV0eSc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0LCB0b29sQ2FsbCB9IGZyb20gJy4uL3V0aWxzL2VkaXRvci1yZXF1ZXN0JztcblxuZXhwb3J0IGNsYXNzIFByb2plY3RUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X3F1ZXJ5JyxcbiAgICAgICAgICAgICAgICBhbm5vdGF0aW9uczogeyByZWFkT25seUhpbnQ6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGFzc2V0IGluZm8uIEFjdGlvbnM6IGdldF9pbmZvLCBnZXRfYXNzZXRzIChieSB0eXBlKSwgZmluZF9ieV9uYW1lLCBnZXRfZGV0YWlscyAod2l0aCBzdWItYXNzZXRzKSwgcXVlcnlfcGF0aCAoVVJM4oaSZGlzayBwYXRoKSwgcXVlcnlfdXVpZCAoVVJM4oaSVVVJRCksIHF1ZXJ5X3VybCAoVVVJROKGklVSTCkuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgcXVlcnkgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2luZm8nLCAnZ2V0X2Fzc2V0cycsICdmaW5kX2J5X25hbWUnLCAnZ2V0X2RldGFpbHMnLCAncXVlcnlfcGF0aCcsICdxdWVyeV91dWlkJywgJ3F1ZXJ5X3VybCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzLy4uLiAoZ2V0X2luZm8sIGdldF9kZXRhaWxzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCB0eXBlIGZpbHRlciAoZ2V0X2Fzc2V0cyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYWxsJywgJ3NjZW5lJywgJ3ByZWZhYicsICdzY3JpcHQnLCAndGV4dHVyZScsICdtYXRlcmlhbCcsICdtZXNoJywgJ2F1ZGlvJywgJ2FuaW1hdGlvbiddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdhbGwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGb2xkZXIgdG8gc2VhcmNoIGluIChnZXRfYXNzZXRzLCBmaW5kX2J5X25hbWUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgbmFtZSB0byBzZWFyY2gsIHN1cHBvcnRzIHBhcnRpYWwgbWF0Y2ggKGZpbmRfYnlfbmFtZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhhY3RNYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4YWN0IHZzIHBhcnRpYWwgbmFtZSBtYXRjaCAoZmluZF9ieV9uYW1lKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbHRlciBieSBhc3NldCB0eXBlIChmaW5kX2J5X25hbWUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FsbCcsICdzY2VuZScsICdwcmVmYWInLCAnc2NyaXB0JywgJ3RleHR1cmUnLCAnbWF0ZXJpYWwnLCAnbWVzaCcsICdhdWRpbycsICdhbmltYXRpb24nLCAnc3ByaXRlRnJhbWUnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYWxsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heCByZXN1bHRzIChmaW5kX2J5X25hbWUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAyMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiAxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IDEwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVTdWJBc3NldHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIHN1Yi1hc3NldHMgbGlrZSBzcHJpdGVGcmFtZSwgdGV4dHVyZSAoZ2V0X2RldGFpbHMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgKHF1ZXJ5X3BhdGgsIHF1ZXJ5X3V1aWQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgKHF1ZXJ5X3VybCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXNzZXRfY3J1ZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUvbW9kaWZ5L21hbmFnZSBhc3NldHMuIEFjdGlvbnM6IGNyZWF0ZSwgY29weSwgbW92ZSwgZGVsZXRlLCBzYXZlIChjb250ZW50KSwgcmVpbXBvcnQsIGltcG9ydCAoZXh0ZXJuYWwgZmlsZSksIHJlZnJlc2ggKGFzc2V0IERCKSwgZ2V0X21ldGEsIHNldF9tZXRhIChpbXBvcnQgc2V0dGluZ3MgaW4gLm1ldGEpLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIENSVUQgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnY3JlYXRlJywgJ2NvcHknLCAnbW92ZScsICdkZWxldGUnLCAnc2F2ZScsICdyZWltcG9ydCcsICdpbXBvcnQnLCAncmVmcmVzaCcsICdnZXRfbWV0YScsICdzZXRfbWV0YSddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgKGNyZWF0ZSwgZGVsZXRlLCBzYXZlLCByZWltcG9ydCwgZ2V0X21ldGEsIHNldF9tZXRhKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRhQ2hhbmdlczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVlcC1tZXJnZWQgaW50byB0aGUgLm1ldGEsIGUuZy4ge1widXNlckRhdGFcIjp7XCJjb21wcmVzc1NldHRpbmdzXCI6ey4uLn19fSBvciB7XCJzdWJNZXRhc1wiOntcIjxpZD5cIjp7XCJ1c2VyRGF0YVwiOnsuLi59fX19OyBnZXRfbWV0YSBmaXJzdCAoc2V0X21ldGEpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgY29udGVudCAoY3JlYXRlIFtudWxsIGZvciBmb2xkZXJdLCBzYXZlKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ092ZXJ3cml0ZSBleGlzdGluZyBmaWxlIChjcmVhdGUsIGNvcHksIG1vdmUpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIGFzc2V0IFVSTCAoY29weSwgbW92ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgbG9jYXRpb24gVVJMIChjb3B5LCBtb3ZlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VQYXRoOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2UgZmlsZSBwYXRoIG9uIGRpc2sgKGltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Rm9sZGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgZm9sZGVyIGluIGFzc2V0cyAoaW1wb3J0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NwZWNpZmljIGZvbGRlciB0byByZWZyZXNoIChyZWZyZXNoKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcm9qZWN0X2luZm8nLFxuICAgICAgICAgICAgICAgIGFubm90YXRpb25zOiB7IHJlYWRPbmx5SGludDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IHByb2plY3QgaW5mby9zZXR0aW5ncy4gQWN0aW9uczogZ2V0X2luZm8gKG5hbWUsIHBhdGgsIFVVSUQsIHZlcnNpb24pLCBnZXRfc2V0dGluZ3MgKGJ5IGNhdGVnb3J5KS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaW5mbycsICdnZXRfc2V0dGluZ3MnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXR0aW5ncyBjYXRlZ29yeSAoZ2V0X3NldHRpbmdzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmFsJywgJ3BoeXNpY3MnLCAncmVuZGVyJywgJ2Fzc2V0cyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdnZW5lcmFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3Byb2plY3RfYnVpbGQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29jb3MgYnVpbGRlci4gQWN0aW9uczogYnVpbGQgKHF1ZXVlIGEgYnVpbGQgdGFzaywgcmV0dXJucyBhdCBvbmNlOyBydW5zIHRoZSBwcm9qZWN0XFwncyBidWlsZCBwbHVnaW5zLCB3aGljaCBtYXkgZWRpdCBzb3VyY2UgZmlsZXMpLCBidWlsZF9zdGF0dXMgKHBvbGwgdGFza3MpLCBjYW5jZWxfYnVpbGQsIG9wZW5fYnVpbGRfcGFuZWwsIGdldF9idWlsZF9zZXR0aW5ncywgY2hlY2tfYnVpbGRlcl9zdGF0dXMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYnVpbGQgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnYnVpbGQnLCAnYnVpbGRfc3RhdHVzJywgJ2NhbmNlbF9idWlsZCcsICdnZXRfYnVpbGRfc2V0dGluZ3MnLCAnb3Blbl9idWlsZF9wYW5lbCcsICdjaGVja19idWlsZGVyX3N0YXR1cyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ2UuZy4gd2ViLW1vYmlsZSwgYW5kcm9pZCwgaW9zOyBkZWZhdWx0cyB0byB0aGUgbmV3ZXN0IHRhc2tcXCdzIHBsYXRmb3JtIChidWlsZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGRPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdmVycmlkZXMsIGUuZy4ge1wiZGVidWdcIjp0cnVlLFwibWQ1Q2FjaGVcIjp0cnVlfTsgdGhlIGJ1aWxkZXIgdmFsaWRhdGVzIGFuZCBmaWxscyB0aGUgcmVzdCAoYnVpbGQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhc2tJZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFzayBpZCBmcm9tIGJ1aWxkIChidWlsZF9zdGF0dXM6IG9uZSB0YXNrLCBlbHNlIGFsbDsgY2FuY2VsX2J1aWxkOiByZXF1aXJlZCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYXNzZXRfcXVlcnknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVBc3NldFF1ZXJ5KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnYXNzZXRfY3J1ZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZUFzc2V0Q3J1ZChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3Byb2plY3RfaW5mbyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVByb2plY3RJbmZvKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncHJvamVjdF9idWlsZCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVByb2plY3RCdWlsZChhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVBc3NldFF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkQXNzZXRQYXRoID0gdGhpcy5yZXNvbHZlQXNzZXRQYXRoQXJnKGFyZ3MpO1xuICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfaW5mbyc6XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZEFzc2V0UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogYXNzZXRQYXRoJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldEluZm8ocmVzb2x2ZWRBc3NldFBhdGgpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2Fzc2V0cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXRzKGFyZ3MudHlwZSwgYXJncy5mb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAnZmluZF9ieV9uYW1lJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5maW5kQXNzZXRCeU5hbWUoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdnZXRfZGV0YWlscyc6XG4gICAgICAgICAgICAgICAgaWYgKCFyZXNvbHZlZEFzc2V0UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogYXNzZXRQYXRoJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldERldGFpbHMocmVzb2x2ZWRBc3NldFBhdGgsIGFyZ3MuaW5jbHVkZVN1YkFzc2V0cyk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9wYXRoJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUFzc2V0UGF0aChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV91dWlkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUFzc2V0VXVpZChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV91cmwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5QXNzZXRVcmwoYXJncy51dWlkKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFzc2V0X3F1ZXJ5IGFjdGlvbjogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgcmVzb2x2ZUFzc2V0UGF0aEFyZyhhcmdzOiBhbnkpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgICAgICBjb25zdCBjYW5kaWRhdGUgPSBhcmdzPy5hc3NldFBhdGg7XG4gICAgICAgIGlmICh0eXBlb2YgY2FuZGlkYXRlICE9PSAnc3RyaW5nJykgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgY29uc3QgdHJpbW1lZCA9IGNhbmRpZGF0ZS50cmltKCk7XG4gICAgICAgIHJldHVybiB0cmltbWVkLmxlbmd0aCA+IDAgPyB0cmltbWVkIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZUFzc2V0Q3J1ZChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzLmFjdGlvbjtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlQXNzZXQoYXJncy51cmwsIGFyZ3MuY29udGVudCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnY29weSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29weUFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnbW92ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubW92ZUFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCwgYXJncy5vdmVyd3JpdGUpO1xuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5kZWxldGVBc3NldChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdzYXZlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlQXNzZXQoYXJncy51cmwsIGFyZ3MuY29udGVudCk7XG4gICAgICAgICAgICBjYXNlICdyZWltcG9ydCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVpbXBvcnRBc3NldChhcmdzLnVybCk7XG4gICAgICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmltcG9ydEFzc2V0KGFyZ3Muc291cmNlUGF0aCwgYXJncy50YXJnZXRGb2xkZXIpO1xuICAgICAgICAgICAgY2FzZSAncmVmcmVzaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVmcmVzaEFzc2V0cyhhcmdzLmZvbGRlcik7XG4gICAgICAgICAgICBjYXNlICdnZXRfbWV0YSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXRNZXRhKGFyZ3MudXJsKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9tZXRhJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRBc3NldE1ldGEoYXJncy51cmwsIGFyZ3MubWV0YUNoYW5nZXMpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFjdGlvbiAnJHthY3Rpb259Jy4gVmFsaWQgYWN0aW9uczogY3JlYXRlLCBjb3B5LCBtb3ZlLCBkZWxldGUsIHNhdmUsIHJlaW1wb3J0LCBpbXBvcnQsIHJlZnJlc2gsIGdldF9tZXRhLCBzZXRfbWV0YWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVByb2plY3RJbmZvKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9pbmZvJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcm9qZWN0SW5mbygpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X3NldHRpbmdzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcm9qZWN0U2V0dGluZ3MoYXJncy5jYXRlZ29yeSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm9qZWN0X2luZm8gYWN0aW9uOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUHJvamVjdEJ1aWxkKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9idWlsZF9zZXR0aW5ncyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QnVpbGRTZXR0aW5ncygpO1xuICAgICAgICAgICAgY2FzZSAnb3Blbl9idWlsZF9wYW5lbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlbkJ1aWxkUGFuZWwoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NoZWNrX2J1aWxkZXJfc3RhdHVzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jaGVja0J1aWxkZXJTdGF0dXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2J1aWxkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zdGFydEJ1aWxkKGFyZ3MucGxhdGZvcm0sIGFyZ3MuYnVpbGRPcHRpb25zKTtcbiAgICAgICAgICAgIGNhc2UgJ2J1aWxkX3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYnVpbGRTdGF0dXMoYXJncy50YXNrSWQpO1xuICAgICAgICAgICAgY2FzZSAnY2FuY2VsX2J1aWxkJzpcbiAgICAgICAgICAgICAgICBpZiAoIWFyZ3MudGFza0lkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd0YXNrSWQgaXMgcmVxdWlyZWQnIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRvb2xDYWxsKCgpID0+IGVkaXRvclJlcXVlc3QoJ2J1aWxkZXInLCAnYnJlYWstdGFzaycsIGFyZ3MudGFza0lkKSwgKCkgPT4gKHsgbWVzc2FnZTogYENhbmNlbCByZXF1ZXN0ZWQgZm9yICR7YXJncy50YXNrSWR9YCB9KSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uICcke2FyZ3MuYWN0aW9ufScuIFZhbGlkIGFjdGlvbnM6IGJ1aWxkLCBidWlsZF9zdGF0dXMsIGNhbmNlbF9idWlsZCwgZ2V0X2J1aWxkX3NldHRpbmdzLCBvcGVuX2J1aWxkX3BhbmVsLCBjaGVja19idWlsZGVyX3N0YXR1c2AgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFkZC10YXNrIHF1ZXVlcyBoYXBwaWx5IG9uIGJhZCBvcHRpb25zIGFuZCBhbiBhbHJlYWR5LWJ1c3kgYnVpbGRlciwgc28gdmFsaWRhdGVcbiAgICAvLyB3aXRoIHRoZSBidWlsZGVyJ3Mgb3duIGNoZWNrLWFuZC1jb21wbGV0ZS1vcHRpb25zIGFuZCByZXBvcnQgYW55IHRhc2sgYWhlYWQuXG4gICAgcHJpdmF0ZSBhc3luYyBzdGFydEJ1aWxkKHBsYXRmb3JtPzogc3RyaW5nLCBvdmVycmlkZXM/OiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYmVmb3JlID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnk+KCdidWlsZGVyJywgJ3F1ZXJ5LXRhc2tzLWluZm8nLCB7IHR5cGU6ICdidWlsZCcgfSk7XG4gICAgICAgICAgICBjb25zdCB0YXNrczogYW55W10gPSBiZWZvcmU/Lmxpc3QgPz8gW107XG4gICAgICAgICAgICAvLyBUYXNrIGlkcyBhcmUgY3JlYXRpb24gdGltZXN0YW1wczsgdGhlIGxpc3Qgb3JkZXIgaXMgbm90IHJlbGlhYmxlLlxuICAgICAgICAgICAgY29uc3QgbmV3ZXN0ID0gWy4uLnRhc2tzXS5zb3J0KChhLCBiKSA9PiBOdW1iZXIoYi5pZCkgLSBOdW1iZXIoYS5pZCkpWzBdO1xuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgLi4uKG92ZXJyaWRlcyA/PyB7fSksIHBsYXRmb3JtOiBwbGF0Zm9ybSB8fCBvdmVycmlkZXM/LnBsYXRmb3JtIHx8IG5ld2VzdD8ub3B0aW9ucz8ucGxhdGZvcm0gfTtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5wbGF0Zm9ybSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3BsYXRmb3JtIGlzIHJlcXVpcmVkIChubyBwcmV2aW91cyBidWlsZCB0YXNrIHRvIHRha2UgaXQgZnJvbSknIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBsZXQgY29tcGxldGVkOiBhbnk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbXBsZXRlZCA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8YW55PignYnVpbGRlcicsICdjaGVjay1hbmQtY29tcGxldGUtb3B0aW9ucycsIG9wdGlvbnMpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjZmcgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PGFueT4oJ2J1aWxkZXInLCAncXVlcnktcGxhdGZvcm0tY29uZmlnJykuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQnVpbGRlciByZWplY3RlZCB0aGUgb3B0aW9uczogJHtlcnI/Lm1lc3NhZ2UgPz8gZXJyfS4ke2NmZz8ub3JkZXIgPyBgIFZhbGlkIHBsYXRmb3JtczogJHtjZmcub3JkZXIuam9pbignLCAnKX1gIDogJyd9YCB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qga25vd24gPSBuZXcgU2V0KHRhc2tzLm1hcCh0ID0+IHQuaWQpKTtcbiAgICAgICAgICAgIC8vIHNob3VsZFdhaXQ9ZmFsc2U6IHJldHVybnMgVGFza0FkZFJlc3VsdCByaWdodCBhd2F5ICgwIGJ1c3ksIDEgcXVldWVkLCAyIHBhcmFtIGVycm9yKS5cbiAgICAgICAgICAgIGNvbnN0IGNvZGUgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PG51bWJlcj4oJ2J1aWxkZXInLCAnYWRkLXRhc2snLCBjb21wbGV0ZWQsIGZhbHNlKTtcbiAgICAgICAgICAgIGlmIChjb2RlICE9PSAxKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgYWRkLXRhc2sgcmV0dXJuZWQgJHtjb2RlID09PSAwID8gJ0JVU1knIDogY29kZSA9PT0gMiA/ICdQQVJBTV9FUlJPUicgOiBjb2RlfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGFmdGVyID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxhbnk+KCdidWlsZGVyJywgJ3F1ZXJ5LXRhc2tzLWluZm8nLCB7IHR5cGU6ICdidWlsZCcgfSk7XG4gICAgICAgICAgICBjb25zdCB0YXNrID0gKGFmdGVyPy5saXN0ID8/IFtdKS5maW5kKCh0OiBhbnkpID0+ICFrbm93bi5oYXModC5pZCkpO1xuICAgICAgICAgICAgY29uc3QgYWhlYWQgPSB0YXNrcy5maWx0ZXIodCA9PiB0LnN0YXRlID09PSAncHJvY2Vzc2luZycgfHwgdC5zdGF0ZSA9PT0gJ3dhaXRpbmcnKS5tYXAodCA9PiB0LmlkKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQnVpbGQgcXVldWVkOyBwb2xsIGJ1aWxkX3N0YXR1cyB3aXRoIHRhc2tJZCcsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0YXNrSWQ6IHRhc2s/LmlkLFxuICAgICAgICAgICAgICAgICAgICBwbGF0Zm9ybTogY29tcGxldGVkLnBsYXRmb3JtLFxuICAgICAgICAgICAgICAgICAgICBkZXN0OiBgJHtjb21wbGV0ZWQuYnVpbGRQYXRofS8ke2NvbXBsZXRlZC5vdXRwdXROYW1lfWAsXG4gICAgICAgICAgICAgICAgICAgIC4uLihhaGVhZC5sZW5ndGggJiYgeyBxdWV1ZWRCZWhpbmQ6IGFoZWFkIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkU3RhdHVzKHRhc2tJZD86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IGJyaWVmID0gKHQ6IGFueSkgPT4gKHtcbiAgICAgICAgICAgIGlkOiB0LmlkLFxuICAgICAgICAgICAgc3RhdGU6IHQuc3RhdGUsXG4gICAgICAgICAgICBwcm9ncmVzczogdC5wcm9ncmVzcyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IHQubWVzc2FnZSxcbiAgICAgICAgICAgIGRldGFpbE1lc3NhZ2U6IHQuZGV0YWlsTWVzc2FnZSxcbiAgICAgICAgICAgIHBsYXRmb3JtOiB0Lm9wdGlvbnM/LnBsYXRmb3JtLFxuICAgICAgICAgICAgZGVzdDogdC5vcHRpb25zICYmIGAke3Qub3B0aW9ucy5idWlsZFBhdGh9LyR7dC5vcHRpb25zLm91dHB1dE5hbWV9YFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRhc2tJZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55PignYnVpbGRlcicsICdxdWVyeS10YXNrJywgdGFza0lkKSxcbiAgICAgICAgICAgICAgICAodCkgPT4gKHQgPyB7IGRhdGE6IGJyaWVmKHQpIH0gOiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vIGJ1aWxkIHRhc2sgJHt0YXNrSWR9YCB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueT4oJ2J1aWxkZXInLCAncXVlcnktdGFza3MtaW5mbycsIHsgdHlwZTogJ2J1aWxkJyB9KSxcbiAgICAgICAgICAgIChpbmZvKSA9PiAoeyBkYXRhOiB7IGZyZWU6IGluZm8/LmZyZWUsIHRhc2tzOiAoaW5mbz8ubGlzdCA/PyBbXSkubWFwKGJyaWVmKSB9IH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcm9qZWN0SW5mbygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBpbmZvOiBQcm9qZWN0SW5mbyA9IHtcbiAgICAgICAgICAgIG5hbWU6IEVkaXRvci5Qcm9qZWN0Lm5hbWUsXG4gICAgICAgICAgICBwYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxuICAgICAgICAgICAgdXVpZDogRWRpdG9yLlByb2plY3QudXVpZCxcbiAgICAgICAgICAgIHZlcnNpb246IChFZGl0b3IuUHJvamVjdCBhcyBhbnkpLnZlcnNpb24gfHwgJzEuMC4wJyxcbiAgICAgICAgICAgIC8vIGBFZGl0b3IudmVyc2lvbnNgIGRvZXMgbm90IGV4aXN0OyB0aGUgZWRpdG9yIHZlcnNpb24gbGl2ZXMgb24gRWRpdG9yLkFwcC5cbiAgICAgICAgICAgIGNvY29zVmVyc2lvbjogKEVkaXRvciBhcyBhbnkpLkFwcD8udmVyc2lvbiB8fCAnVW5rbm93bidcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYWRkaXRpb25hbEluZm86IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ3Byb2plY3QnLCAncXVlcnktY29uZmlnJywgJ3Byb2plY3QnKTtcbiAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsSW5mbykge1xuICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oaW5mbywgeyBjb25maWc6IGFkZGl0aW9uYWxJbmZvIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIE5vbi1mYXRhbCDigJQgcmV0dXJuIGJhc2ljIGluZm8gZXZlbiBpZiBkZXRhaWxlZCBxdWVyeSBmYWlsc1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGluZm8gfTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RTZXR0aW5ncyhjYXRlZ29yeTogc3RyaW5nID0gJ2dlbmVyYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgY29uZmlnTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgICAgZ2VuZXJhbDogJ3Byb2plY3QnLFxuICAgICAgICAgICAgcGh5c2ljczogJ3BoeXNpY3MnLFxuICAgICAgICAgICAgcmVuZGVyOiAncmVuZGVyJyxcbiAgICAgICAgICAgIGFzc2V0czogJ2Fzc2V0LWRiJ1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBjb25maWdOYW1lID0gY29uZmlnTWFwW2NhdGVnb3J5XSB8fCAncHJvamVjdCc7XG5cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdwcm9qZWN0JywgJ3F1ZXJ5LWNvbmZpZycsIGNvbmZpZ05hbWUpLFxuICAgICAgICAgICAgKHNldHRpbmdzKSA9PiAoe1xuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzogc2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke2NhdGVnb3J5fSBzZXR0aW5ncyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZWZyZXNoQXNzZXRzKGZvbGRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBmb2xkZXIgPz8gJ2RiOi8vYXNzZXRzJztcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkID0gdHJ5VmFsaWRhdGVBc3NldFVybCh0YXJnZXRQYXRoKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgZm9sZGVyIFVSTDogJHt0YXJnZXRQYXRofWAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdyZWZyZXNoLWFzc2V0JywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgICgpID0+ICh7IG1lc3NhZ2U6IGBBc3NldHMgcmVmcmVzaGVkIGluOiAke3ZhbGlkYXRlZH1gIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBpbXBvcnRBc3NldChzb3VyY2VQYXRoOiBzdHJpbmcsIHRhcmdldEZvbGRlcjogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgaWYgKCFzb3VyY2VQYXRoIHx8IHR5cGVvZiBzb3VyY2VQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IHNvdXJjZVBhdGgnIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCF0YXJnZXRGb2xkZXIgfHwgdHlwZW9mIHRhcmdldEZvbGRlciAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiB0YXJnZXRGb2xkZXInIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVqZWN0IHBhdGggdHJhdmVyc2FsIGluIHRoZSBvbi1kaXNrIHNvdXJjZSBwYXRoXG4gICAgICAgIGNvbnN0IGFic1NvdXJjZSA9IHBhdGgucmVzb2x2ZShzb3VyY2VQYXRoKTtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic1NvdXJjZSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1NvdXJjZSBmaWxlIG5vdCBmb3VuZCcgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZzLnN0YXRTeW5jKGFic1NvdXJjZSkuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1NvdXJjZSBwYXRoIGlzIG5vdCBhIHJlZ3VsYXIgZmlsZScgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShhYnNTb3VyY2UpO1xuICAgICAgICBjb25zdCByYXdUYXJnZXQgPSB0YXJnZXRGb2xkZXIuc3RhcnRzV2l0aCgnZGI6Ly8nKVxuICAgICAgICAgICAgPyB0YXJnZXRGb2xkZXJcbiAgICAgICAgICAgIDogYGRiOi8vYXNzZXRzLyR7dGFyZ2V0Rm9sZGVyfWA7XG4gICAgICAgIGNvbnN0IHRhcmdldFVybCA9IGAke3Jhd1RhcmdldC5yZXBsYWNlKC9cXC8rJC8sICcnKX0vJHtmaWxlTmFtZX1gO1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWRUYXJnZXQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHRhcmdldFVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkVGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIHRhcmdldCBVUkw6ICR7dGFyZ2V0VXJsfWAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8YW55PignYXNzZXQtZGInLCAnaW1wb3J0LWFzc2V0JywgYWJzU291cmNlLCB2YWxpZGF0ZWRUYXJnZXQpLFxuICAgICAgICAgICAgKHJlc3VsdCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBkYXRhOiB7IHVybDogdmFsaWRhdGVkVGFyZ2V0LCBtZXNzYWdlOiBgQXNzZXQgaW1wb3J0ZWQ6ICR7ZmlsZU5hbWV9YCB9IH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBc3NldCBpbXBvcnRlZDogJHtmaWxlTmFtZX1gXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXRJbmZvKGFzc2V0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkID0gdHJ5VmFsaWRhdGVBc3NldFVybChhc3NldFBhdGgpO1xuICAgICAgICBpZiAoIXZhbGlkYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCBhc3NldCBVUkw6ICR7YXNzZXRQYXRofWAgfTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvOiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdmFsaWRhdGVkKTtcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBpbmZvOiBBc3NldEluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogYXNzZXRJbmZvLm5hbWUsXG4gICAgICAgICAgICAgICAgdXVpZDogYXNzZXRJbmZvLnV1aWQsXG4gICAgICAgICAgICAgICAgcGF0aDogYXNzZXRJbmZvLnVybCxcbiAgICAgICAgICAgICAgICB0eXBlOiBhc3NldEluZm8udHlwZSxcbiAgICAgICAgICAgICAgICBzaXplOiBhc3NldEluZm8uc2l6ZSxcbiAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogYXNzZXRJbmZvLmlzRGlyZWN0b3J5XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoYXNzZXRJbmZvLm1ldGEpIHtcbiAgICAgICAgICAgICAgICBpbmZvLm1ldGEgPSB7XG4gICAgICAgICAgICAgICAgICAgIHZlcjogYXNzZXRJbmZvLm1ldGEudmVyLFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlcjogYXNzZXRJbmZvLm1ldGEuaW1wb3J0ZXJcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBpbmZvIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBc3NldHModHlwZTogc3RyaW5nID0gJ2FsbCcsIGZvbGRlcjogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZEZvbGRlciA9IHRyeVZhbGlkYXRlQXNzZXRVcmwoZm9sZGVyKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWRGb2xkZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgZm9sZGVyIFVSTDogJHtmb2xkZXJ9YCB9O1xuICAgICAgICB9XG4gICAgICAgIGxldCBwYXR0ZXJuID0gYCR7dmFsaWRhdGVkRm9sZGVyfS8qKi8qYDtcbiAgICAgICAgaWYgKHR5cGUgIT09ICdhbGwnKSB7XG4gICAgICAgICAgICBjb25zdCB0eXBlRXh0ZW5zaW9uczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICAgICAgICAnc2NlbmUnOiAnLnNjZW5lJyxcbiAgICAgICAgICAgICAgICAncHJlZmFiJzogJy5wcmVmYWInLFxuICAgICAgICAgICAgICAgICdzY3JpcHQnOiAnLnt0cyxqc30nLFxuICAgICAgICAgICAgICAgICd0ZXh0dXJlJzogJy57cG5nLGpwZyxqcGVnLGdpZix0Z2EsYm1wLHBzZH0nLFxuICAgICAgICAgICAgICAgICdtYXRlcmlhbCc6ICcubXRsJyxcbiAgICAgICAgICAgICAgICAnbWVzaCc6ICcue2ZieCxvYmosZGFlfScsXG4gICAgICAgICAgICAgICAgJ2F1ZGlvJzogJy57bXAzLG9nZyx3YXYsbTRhfScsXG4gICAgICAgICAgICAgICAgJ2FuaW1hdGlvbic6ICcue2FuaW0sY2xpcH0nXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgZXh0ZW5zaW9uID0gdHlwZUV4dGVuc2lvbnNbdHlwZV07XG4gICAgICAgICAgICBpZiAoZXh0ZW5zaW9uKSB7XG4gICAgICAgICAgICAgICAgcGF0dGVybiA9IGAke3ZhbGlkYXRlZEZvbGRlcn0vKiovKiR7ZXh0ZW5zaW9ufWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdG9vbENhbGwoXG4gICAgICAgICAgICAoKSA9PiBlZGl0b3JSZXF1ZXN0PGFueVtdPignYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuIH0pLFxuICAgICAgICAgICAgKHJlc3VsdHMpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gQXJyYXkuaXNBcnJheShyZXN1bHRzKSA/IHJlc3VsdHMgOiBbXTtcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldHMgPSBsaXN0Lm1hcCgoYXNzZXQpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGFzc2V0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYXNzZXQudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogYXNzZXQuc2l6ZSB8fCAwLFxuICAgICAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogYXNzZXQuaXNEaXJlY3RvcnkgfHwgZmFsc2VcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcjogdmFsaWRhdGVkRm9sZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IGFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldHNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRCdWlsZFNldHRpbmdzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8Ym9vbGVhbj4oJ2J1aWxkZXInLCAncXVlcnktd29ya2VyLXJlYWR5JyksXG4gICAgICAgICAgICAocmVhZHkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBidWlsZGVyUmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnVXNlIGJ1aWxkX3N0YXR1cyBmb3IgdGhlIG9wdGlvbnMgb2YgcGFzdCB0YXNrczsgYnVpbGQgdmFsaWRhdGVzIGFuZCBjb21wbGV0ZXMgb3B0aW9ucyBpdHNlbGYnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5CdWlsZFBhbmVsKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ2J1aWxkZXInLCAnb3BlbicpLFxuICAgICAgICAgICAgKCkgPT4gKHsgbWVzc2FnZTogJ0J1aWxkIHBhbmVsIG9wZW5lZCBzdWNjZXNzZnVsbHknIH0pXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja0J1aWxkZXJTdGF0dXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxib29sZWFuPignYnVpbGRlcicsICdxdWVyeS13b3JrZXItcmVhZHknKSxcbiAgICAgICAgICAgIChyZWFkeSkgPT4gKHtcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IHJlYWR5ID8gJ0J1aWxkZXIgd29ya2VyIGlzIHJlYWR5JyA6ICdCdWlsZGVyIHdvcmtlciBpcyBub3QgcmVhZHknLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQnVpbGRlciBzdGF0dXMgY2hlY2tlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZUFzc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcgfCBudWxsID0gbnVsbCwgb3ZlcndyaXRlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICAvLyBBc3NldFNhZmV0eS5zYWZlQ3JlYXRlQXNzZXQgcGVyZm9ybXMgaXRzIG93biBVUkwgdmFsaWRhdGlvbi5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgQXNzZXRTYWZldHkuc2FmZUNyZWF0ZUFzc2V0KHVybCwgY29udGVudCwgeyBvdmVyd3JpdGUgfSk7XG4gICAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVzdWx0Lm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogcmVzdWx0LmVycm9yIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjb3B5QXNzZXQoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nLCBvdmVyd3JpdGU6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGxldCB2YWxpZGF0ZWRTb3VyY2U6IHN0cmluZztcbiAgICAgICAgbGV0IHZhbGlkYXRlZFRhcmdldDogc3RyaW5nO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdmFsaWRhdGVkU291cmNlID0gdmFsaWRhdGVBc3NldFVybChzb3VyY2UpO1xuICAgICAgICAgICAgdmFsaWRhdGVkVGFyZ2V0ID0gdmFsaWRhdGVBc3NldFVybCh0YXJnZXQpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7IG92ZXJ3cml0ZSwgcmVuYW1lOiAhb3ZlcndyaXRlIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAnY29weS1hc3NldCcsIHZhbGlkYXRlZFNvdXJjZSwgdmFsaWRhdGVkVGFyZ2V0LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYENvcHkgZmFpbGVkIOKAlCBlZGl0b3IgcmV0dXJuZWQgbm8gdXVpZCAoc291cmNlPSR7dmFsaWRhdGVkU291cmNlfSB0YXJnZXQ9JHt2YWxpZGF0ZWRUYXJnZXR9KWBcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IGNvcGllZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG1vdmVBc3NldChzb3VyY2U6IHN0cmluZywgdGFyZ2V0OiBzdHJpbmcsIG92ZXJ3cml0ZTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgbGV0IHZhbGlkYXRlZFNvdXJjZTogc3RyaW5nO1xuICAgICAgICBsZXQgdmFsaWRhdGVkVGFyZ2V0OiBzdHJpbmc7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YWxpZGF0ZWRTb3VyY2UgPSB2YWxpZGF0ZUFzc2V0VXJsKHNvdXJjZSk7XG4gICAgICAgICAgICB2YWxpZGF0ZWRUYXJnZXQgPSB2YWxpZGF0ZUFzc2V0VXJsKHRhcmdldCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHsgb3ZlcndyaXRlLCByZW5hbWU6ICFvdmVyd3JpdGUgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdtb3ZlLWFzc2V0JywgdmFsaWRhdGVkU291cmNlLCB2YWxpZGF0ZWRUYXJnZXQsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKCFyZXN1bHQgfHwgIXJlc3VsdC51dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgTW92ZSBmYWlsZWQg4oCUIGVkaXRvciByZXR1cm5lZCBubyB1dWlkIChzb3VyY2U9JHt2YWxpZGF0ZWRTb3VyY2V9IHRhcmdldD0ke3ZhbGlkYXRlZFRhcmdldH0pYFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgbW92ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBkZWxldGVBc3NldCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwodXJsKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke3VybH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgICgpID0+ICh7IGRhdGE6IHsgdXJsOiB2YWxpZGF0ZWQsIG1lc3NhZ2U6ICdBc3NldCBkZWxldGVkIHN1Y2Nlc3NmdWxseScgfSB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUFzc2V0KHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQnLCB2YWxpZGF0ZWQsIGNvbnRlbnQpO1xuICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHJlc3VsdC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiByZXN1bHQudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IHNhdmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1cmw6IHZhbGlkYXRlZCwgbWVzc2FnZTogJ0Fzc2V0IHNhdmVkIHN1Y2Nlc3NmdWxseScgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlaW1wb3J0QXNzZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlaW1wb3J0LWFzc2V0JywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgICgpID0+ICh7IGRhdGE6IHsgdXJsOiB2YWxpZGF0ZWQsIG1lc3NhZ2U6ICdBc3NldCByZWltcG9ydGVkIHN1Y2Nlc3NmdWxseScgfSB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXRNZXRhKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkID0gdHJ5VmFsaWRhdGVBc3NldFVybCh1cmwsIHsgYWxsb3dJbnRlcm5hbDogdHJ1ZSB9KTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke3VybH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxhbnk+KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgdmFsaWRhdGVkKSxcbiAgICAgICAgICAgIChtZXRhKSA9PiAobWV0YSA/IHsgZGF0YTogeyB1cmw6IHZhbGlkYXRlZCwgbWV0YSB9IH0gOiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHt2YWxpZGF0ZWR9YCB9KVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0QXNzZXRNZXRhKHVybDogc3RyaW5nLCBjaGFuZ2VzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB2YWxpZGF0ZWQgPSB0cnlWYWxpZGF0ZUFzc2V0VXJsKHVybCk7XG4gICAgICAgIGlmICghdmFsaWRhdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBJbnZhbGlkIGFzc2V0IFVSTDogJHt1cmx9YCB9O1xuICAgICAgICB9XG4gICAgICAgIGlmICghY2hhbmdlcyB8fCB0eXBlb2YgY2hhbmdlcyAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShjaGFuZ2VzKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnbWV0YUNoYW5nZXMgbXVzdCBiZSBhbiBvYmplY3QnIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2hhbmdpbmcgdGhlc2Ugd291bGQgb3JwaGFuIGV2ZXJ5IHJlZmVyZW5jZSB0byB0aGUgYXNzZXQgb3IgY29uZnVzZSB0aGUgaW1wb3J0ZXIuXG4gICAgICAgIGNvbnN0IGxvY2tlZCA9IFsndXVpZCcsICdpbXBvcnRlcicsICd2ZXInXS5maWx0ZXIoayA9PiBrIGluIGNoYW5nZXMpO1xuICAgICAgICBpZiAobG9ja2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgbWV0YUNoYW5nZXMgY2Fubm90IGNoYW5nZTogJHtsb2NrZWQuam9pbignLCAnKX1gIH07XG4gICAgICAgIH1cbiAgICAgICAgLy8gT2JqZWN0cyBtZXJnZSBrZXkgYnkga2V5OyBhbnl0aGluZyBlbHNlIChpbmNsLiBhcnJheXMpIHJlcGxhY2VzLlxuICAgICAgICBjb25zdCBtZXJnZSA9IChiYXNlOiBhbnksIHBhdGNoOiBhbnkpOiBhbnkgPT4ge1xuICAgICAgICAgICAgaWYgKCFwYXRjaCB8fCB0eXBlb2YgcGF0Y2ggIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkocGF0Y2gpKSByZXR1cm4gcGF0Y2g7XG4gICAgICAgICAgICBjb25zdCBvdXQgPSBiYXNlICYmIHR5cGVvZiBiYXNlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheShiYXNlKSA/IHsgLi4uYmFzZSB9IDoge307XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhwYXRjaCkpIG91dFtrXSA9IG1lcmdlKG91dFtrXSwgdik7XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbWV0YSA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8YW55PignYXNzZXQtZGInLCAncXVlcnktYXNzZXQtbWV0YScsIHZhbGlkYXRlZCk7XG4gICAgICAgICAgICBpZiAoIW1ldGEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dmFsaWRhdGVkfWAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBtZXJnZShtZXRhLCBjaGFuZ2VzKTtcbiAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQtbWV0YScsIHZhbGlkYXRlZCwgSlNPTi5zdHJpbmdpZnkobmV4dCwgbnVsbCwgMikpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB1cmw6IHZhbGlkYXRlZCwgbWV0YTogbmV4dCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUFzc2V0UGF0aCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHZhbGlkYXRlZCA9IHRyeVZhbGlkYXRlQXNzZXRVcmwodXJsKTtcbiAgICAgICAgaWYgKCF2YWxpZGF0ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEludmFsaWQgYXNzZXQgVVJMOiAke3VybH1gIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpc2tQYXRoOiBzdHJpbmcgfCBudWxsID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIHZhbGlkYXRlZCk7XG4gICAgICAgICAgICBpZiAoIWRpc2tQYXRoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgcGF0aCBub3QgZm91bmQnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IHZhbGlkYXRlZCxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZGlza1BhdGgsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBc3NldCBwYXRoIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5QXNzZXRVdWlkKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgdmFsaWRhdGVkID0gdHJ5VmFsaWRhdGVBc3NldFVybCh1cmwpO1xuICAgICAgICBpZiAoIXZhbGlkYXRlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgSW52YWxpZCBhc3NldCBVUkw6ICR7dXJsfWAgfTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdXVpZDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCB2YWxpZGF0ZWQpO1xuICAgICAgICAgICAgaWYgKCF1dWlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgVVVJRCBub3QgZm91bmQnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IHZhbGlkYXRlZCxcbiAgICAgICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IFVVSUQgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnI/Lm1lc3NhZ2UgPz8gU3RyaW5nKGVycikgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlBc3NldFVybCh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBpZiAodHlwZW9mIHV1aWQgIT09ICdzdHJpbmcnIHx8ICF1dWlkLnRyaW0oKSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IHV1aWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHVybDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHV1aWQpO1xuICAgICAgICAgICAgaWYgKCF1cmwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdBc3NldCBVUkwgbm90IGZvdW5kJyB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgdXJsLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgVVJMIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZpbmRBc3NldEJ5TmFtZShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IG5hbWUsIGV4YWN0TWF0Y2ggPSBmYWxzZSwgYXNzZXRUeXBlID0gJ2FsbCcsIGZvbGRlciA9ICdkYjovL2Fzc2V0cycsIG1heFJlc3VsdHMgPSAyMCB9ID0gYXJncztcbiAgICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJyB8fCAhbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXI6IG5hbWUnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGFsbEFzc2V0c1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRBc3NldHMoYXNzZXRUeXBlLCBmb2xkZXIpO1xuICAgICAgICAgICAgaWYgKCFhbGxBc3NldHNSZXNwb25zZS5zdWNjZXNzIHx8ICFhbGxBc3NldHNSZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBhc3NldHM6ICR7YWxsQXNzZXRzUmVzcG9uc2UuZXJyb3J9YCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBhbGxBc3NldHMgPSBhbGxBc3NldHNSZXNwb25zZS5kYXRhLmFzc2V0cyBhcyBhbnlbXTtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoZWRBc3NldHM6IGFueVtdID0gW107XG4gICAgICAgICAgICBjb25zdCBuZWVkbGUgPSBuYW1lLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYWxsQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXROYW1lOiBzdHJpbmcgPSBhc3NldC5uYW1lID8/ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoZXMgPSBleGFjdE1hdGNoXG4gICAgICAgICAgICAgICAgICAgID8gYXNzZXROYW1lID09PSBuYW1lXG4gICAgICAgICAgICAgICAgICAgIDogYXNzZXROYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobmVlZGxlKTtcbiAgICAgICAgICAgICAgICBpZiAoIW1hdGNoZXMpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGV0YWlsUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmdldEFzc2V0SW5mbyhhc3NldC5wYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEFzc2V0cy5wdXNoKGRldGFpbFJlc3BvbnNlLnN1Y2Nlc3NcbiAgICAgICAgICAgICAgICAgICAgICAgID8geyAuLi5hc3NldCwgZGV0YWlsczogZGV0YWlsUmVzcG9uc2UuZGF0YSB9XG4gICAgICAgICAgICAgICAgICAgICAgICA6IGFzc2V0KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlZEFzc2V0cy5wdXNoKGFzc2V0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoZWRBc3NldHMubGVuZ3RoID49IG1heFJlc3VsdHMpIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBzZWFyY2hUZXJtOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICBleGFjdE1hdGNoLFxuICAgICAgICAgICAgICAgICAgICBhc3NldFR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlcixcbiAgICAgICAgICAgICAgICAgICAgdG90YWxGb3VuZDogbWF0Y2hlZEFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0czogbWF0Y2hlZEFzc2V0cyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7bWF0Y2hlZEFzc2V0cy5sZW5ndGh9IGFzc2V0cyBtYXRjaGluZyAnJHtuYW1lfSdgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IHNlYXJjaCBmYWlsZWQ6ICR7ZXJyPy5tZXNzYWdlID8/IFN0cmluZyhlcnIpfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXREZXRhaWxzKGFzc2V0UGF0aDogc3RyaW5nLCBpbmNsdWRlU3ViQXNzZXRzOiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldEluZm9SZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0QXNzZXRJbmZvKGFzc2V0UGF0aCk7XG4gICAgICAgICAgICBpZiAoIWFzc2V0SW5mb1Jlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXRJbmZvUmVzcG9uc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGFzc2V0SW5mb1Jlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBjb25zdCBkZXRhaWxlZEluZm86IGFueSA9IHsgLi4uYXNzZXRJbmZvLCBzdWJBc3NldHM6IFtdIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGxvb2tzTGlrZUltYWdlID0gYXNzZXRQYXRoLm1hdGNoKC9cXC4ocG5nfGpwZ3xqcGVnfGdpZnx0Z2F8Ym1wfHBzZCkkL2kpO1xuICAgICAgICAgICAgaWYgKGluY2x1ZGVTdWJBc3NldHMgJiYgYXNzZXRJbmZvICYmIChhc3NldEluZm8udHlwZSA9PT0gJ2NjLkltYWdlQXNzZXQnIHx8IGxvb2tzTGlrZUltYWdlKSkge1xuICAgICAgICAgICAgICAgIC8vIEhldXJpc3RpYyBzdWItYXNzZXQgc3VmZml4ZXMgZm9yIGltYWdlIGFzc2V0cyBpbiBDb2NvcyAzLnguXG4gICAgICAgICAgICAgICAgLy8gVGhlc2UgYXJlIHdlbGwta25vd24gYnV0IG5vdCBvZmZpY2lhbGx5IGRvY3VtZW50ZWQ7IGlmIHRoZXlcbiAgICAgICAgICAgICAgICAvLyBldmVyIGNoYW5nZSwgdGhlIHN1cnJvdW5kaW5nIHF1ZXJ5LXVybCBjYWxsIHdpbGwgc2ltcGx5IGZhaWxcbiAgICAgICAgICAgICAgICAvLyBhbmQgd2Ugc2tpcCB0aGUgZW50cnkuXG4gICAgICAgICAgICAgICAgY29uc3QgYmFzZVV1aWQgPSBhc3NldEluZm8udXVpZDtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3NzaWJsZVN1YkFzc2V0cyA9IFtcbiAgICAgICAgICAgICAgICAgICAgeyB0eXBlOiAnc3ByaXRlRnJhbWUnLCB1dWlkOiBgJHtiYXNlVXVpZH1AZjk5NDFgLCBzdWZmaXg6ICdAZjk5NDEnIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3RleHR1cmUnLCB1dWlkOiBgJHtiYXNlVXVpZH1ANmM0OGFgLCBzdWZmaXg6ICdANmM0OGEnIH0sXG4gICAgICAgICAgICAgICAgICAgIHsgdHlwZTogJ3RleHR1cmUyRCcsIHV1aWQ6IGAke2Jhc2VVdWlkfUA2YzQ4YWAsIHN1ZmZpeDogJ0A2YzQ4YScgfVxuICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN1YkFzc2V0IG9mIHBvc3NpYmxlU3ViQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWJBc3NldFVybCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHN1YkFzc2V0LnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN1YkFzc2V0VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsZWRJbmZvLnN1YkFzc2V0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogc3ViQXNzZXQudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogc3ViQXNzZXQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBzdWJBc3NldFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VmZml4OiBzdWJBc3NldC5zdWZmaXhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTdWItYXNzZXQgZG9lc24ndCBleGlzdCwgc2tpcFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBhc3NldFBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVTdWJBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIC4uLmRldGFpbGVkSW5mbyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEFzc2V0IGRldGFpbHMgcmV0cmlldmVkLiBGb3VuZCAke2RldGFpbGVkSW5mby5zdWJBc3NldHMubGVuZ3RofSBzdWItYXNzZXRzLmBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGdldCBhc3NldCBkZXRhaWxzOiAke2Vycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKX1gIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=