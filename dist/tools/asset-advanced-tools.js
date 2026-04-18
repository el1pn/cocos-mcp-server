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
exports.AssetAdvancedTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AssetAdvancedTools {
    getTools() {
        return [
            {
                name: 'asset_advanced',
                description: 'Advanced asset operations: save meta, generate URLs, check DB readiness, open externally, get dependencies, find unused assets. Use the "action" parameter to select the operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['save_meta', 'generate_url', 'query_db_ready', 'open_external', 'get_dependencies', 'get_unused']
                        },
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID (used by: save_meta, open_external, get_dependencies)'
                        },
                        content: {
                            type: 'string',
                            description: 'Asset meta serialized content string (used by: save_meta)'
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL to generate available URL for (used by: generate_url)'
                        },
                        direction: {
                            type: 'string',
                            description: 'Dependency direction (used by: get_dependencies)',
                            enum: ['dependents', 'dependencies', 'both'],
                            default: 'dependencies'
                        },
                        directory: {
                            type: 'string',
                            description: 'Directory to scan (used by: get_unused)',
                            default: 'db://assets'
                        },
                        excludeDirectories: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Directories to exclude from scan (used by: get_unused)',
                            default: []
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of unused assets to return (used by: get_unused). Default: 50',
                            default: 50
                        },
                        groupByFolder: {
                            type: 'boolean',
                            description: 'Group results by folder with counts instead of listing every file (used by: get_unused). Default: false',
                            default: false
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'asset_batch',
                description: 'Batch asset operations: import, delete, validate references, compress textures, export manifest. Use the "action" parameter to select the operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['import', 'delete', 'validate_references', 'compress_textures', 'export_manifest', 'scan_scene_refs']
                        },
                        sourceDirectory: {
                            type: 'string',
                            description: 'Source directory path (used by: import)'
                        },
                        targetDirectory: {
                            type: 'string',
                            description: 'Target directory URL (used by: import)'
                        },
                        fileFilter: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include, e.g. [".png", ".jpg"] (used by: import)',
                            default: []
                        },
                        recursive: {
                            type: 'boolean',
                            description: 'Include subdirectories (used by: import)',
                            default: false
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing files (used by: import)',
                            default: false
                        },
                        urls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of asset URLs to delete (used by: delete)'
                        },
                        directory: {
                            type: 'string',
                            description: 'Directory to operate on (used by: validate_references, compress_textures, export_manifest)',
                            default: 'db://assets'
                        },
                        format: {
                            type: 'string',
                            description: 'Format for compression (enum: auto, jpg, png, webp) or export (enum: json, csv, xml) (used by: compress_textures, export_manifest)',
                            default: 'auto'
                        },
                        quality: {
                            type: 'number',
                            description: 'Compression quality 0.1-1.0 (used by: compress_textures)',
                            minimum: 0.1,
                            maximum: 1.0,
                            default: 0.8
                        },
                        includeMetadata: {
                            type: 'boolean',
                            description: 'Include asset metadata (used by: export_manifest)',
                            default: true
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'asset_advanced': {
                switch (args.action) {
                    case 'save_meta':
                        return await this.saveAssetMeta(args.urlOrUUID, args.content);
                    case 'generate_url':
                        return await this.generateAvailableUrl(args.url);
                    case 'query_db_ready':
                        return await this.queryAssetDbReady();
                    case 'open_external':
                        return await this.openAssetExternal(args.urlOrUUID);
                    case 'get_dependencies':
                        return await this.getAssetDependencies(args.urlOrUUID, args.direction);
                    case 'get_unused':
                        return await this.getUnusedAssets(args.directory, args.excludeDirectories, args.maxResults, args.groupByFolder);
                    default:
                        throw new Error(`Unknown action for asset_advanced: ${args.action}`);
                }
            }
            case 'asset_batch': {
                switch (args.action) {
                    case 'import':
                        return await this.batchImportAssets(args);
                    case 'delete':
                        return await this.batchDeleteAssets(args.urls);
                    case 'validate_references':
                        return await this.validateAssetReferences(args.directory);
                    case 'compress_textures':
                        return await this.compressTextures(args.directory, args.format, args.quality);
                    case 'export_manifest':
                        return await this.exportAssetManifest(args.directory, args.format, args.includeMetadata);
                    case 'scan_scene_refs':
                        return await this.scanSceneMissingRefs();
                    default:
                        throw new Error(`Unknown action for asset_batch: ${args.action}`);
                }
            }
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async saveAssetMeta(urlOrUUID, content) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset-meta', urlOrUUID, content).then((result) => {
                resolve({
                    success: true,
                    data: {
                        uuid: result === null || result === void 0 ? void 0 : result.uuid,
                        url: result === null || result === void 0 ? void 0 : result.url,
                        message: 'Asset meta saved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async generateAvailableUrl(url) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'generate-available-url', url).then((availableUrl) => {
                resolve({
                    success: true,
                    data: {
                        originalUrl: url,
                        availableUrl: availableUrl,
                        message: availableUrl === url ?
                            'URL is available' :
                            'Generated new available URL'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryAssetDbReady() {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-ready').then((ready) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Asset database is ready' : 'Asset database is not ready'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async openAssetExternal(urlOrUUID) {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'open-asset', urlOrUUID).then(() => {
                resolve({
                    success: true,
                    message: 'Asset opened with external program'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async batchImportAssets(args) {
        try {
            const fs = require('fs');
            const path = require('path');
            if (!fs.existsSync(args.sourceDirectory)) {
                return { success: false, error: 'Source directory does not exist' };
            }
            const files = this.getFilesFromDirectory(args.sourceDirectory, args.fileFilter || [], args.recursive || false);
            const importResults = [];
            let successCount = 0;
            let errorCount = 0;
            for (const filePath of files) {
                try {
                    const fileName = path.basename(filePath);
                    const targetPath = `${args.targetDirectory}/${fileName}`;
                    const result = await Editor.Message.request('asset-db', 'import-asset', filePath, targetPath, {
                        overwrite: args.overwrite || false,
                        rename: !(args.overwrite || false)
                    });
                    importResults.push({
                        source: filePath,
                        target: targetPath,
                        success: true,
                        uuid: result === null || result === void 0 ? void 0 : result.uuid
                    });
                    successCount++;
                }
                catch (err) {
                    importResults.push({
                        source: filePath,
                        success: false,
                        error: err.message
                    });
                    errorCount++;
                }
            }
            return {
                success: true,
                data: {
                    totalFiles: files.length,
                    successCount: successCount,
                    errorCount: errorCount,
                    results: importResults,
                    message: `Batch import completed: ${successCount} success, ${errorCount} errors`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    getFilesFromDirectory(dirPath, fileFilter, recursive) {
        const fs = require('fs');
        const path = require('path');
        const files = [];
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
                if (fileFilter.length === 0 || fileFilter.some(ext => item.toLowerCase().endsWith(ext.toLowerCase()))) {
                    files.push(fullPath);
                }
            }
            else if (stat.isDirectory() && recursive) {
                files.push(...this.getFilesFromDirectory(fullPath, fileFilter, recursive));
            }
        }
        return files;
    }
    async batchDeleteAssets(urls) {
        try {
            const deleteResults = [];
            let successCount = 0;
            let errorCount = 0;
            for (const url of urls) {
                try {
                    await Editor.Message.request('asset-db', 'delete-asset', url);
                    deleteResults.push({
                        url: url,
                        success: true
                    });
                    successCount++;
                }
                catch (err) {
                    deleteResults.push({
                        url: url,
                        success: false,
                        error: err.message
                    });
                    errorCount++;
                }
            }
            return {
                success: true,
                data: {
                    totalAssets: urls.length,
                    successCount: successCount,
                    errorCount: errorCount,
                    results: deleteResults,
                    message: `Batch delete completed: ${successCount} success, ${errorCount} errors`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async validateAssetReferences(directory = 'db://assets') {
        try {
            // Get all assets in directory
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
            const brokenReferences = [];
            const validReferences = [];
            for (const asset of assets) {
                try {
                    const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                    if (assetInfo) {
                        validReferences.push({
                            url: asset.url,
                            uuid: asset.uuid,
                            name: asset.name
                        });
                    }
                }
                catch (err) {
                    brokenReferences.push({
                        url: asset.url,
                        uuid: asset.uuid,
                        name: asset.name,
                        error: err.message
                    });
                }
            }
            return {
                success: true,
                data: {
                    directory: directory,
                    totalAssets: assets.length,
                    validReferences: validReferences.length,
                    brokenReferences: brokenReferences.length,
                    brokenAssets: brokenReferences,
                    message: `Validation completed: ${brokenReferences.length} broken references found`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async scanSceneMissingRefs() {
        var _a, _b, _c;
        try {
            // Step 1: Walk node tree, collect all node UUIDs
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree)
                return { success: false, error: 'Failed to query scene node tree' };
            const nodeUuids = [];
            const queue = [nodeTree];
            while (queue.length > 0) {
                const node = queue.shift();
                if (node === null || node === void 0 ? void 0 : node.uuid)
                    nodeUuids.push(node.uuid);
                if (node === null || node === void 0 ? void 0 : node.children)
                    queue.push(...node.children);
            }
            const nodeUuidSet = new Set(nodeUuids);
            // Step 2: Query all nodes in parallel batches, collect UUID refs
            const NODE_BATCH = 10;
            const uuidToRefs = new Map();
            for (let i = 0; i < nodeUuids.length; i += NODE_BATCH) {
                const batch = nodeUuids.slice(i, i + NODE_BATCH);
                const results = await Promise.all(batch.map(uuid => Editor.Message.request('scene', 'query-node', uuid).catch(() => null)));
                for (let j = 0; j < results.length; j++) {
                    const nodeData = results[j];
                    if (!(nodeData === null || nodeData === void 0 ? void 0 : nodeData.__comps__))
                        continue;
                    const nodeUuid = batch[j];
                    const nodeName = (_c = (_b = (_a = nodeData.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : nodeData.name) !== null && _c !== void 0 ? _c : nodeUuid;
                    for (const comp of nodeData.__comps__) {
                        const compType = comp.__type__ || comp.type || 'Unknown';
                        this.collectRefUuids(comp, compType, nodeUuid, String(nodeName), uuidToRefs);
                    }
                }
            }
            // Remove node-to-node refs (UUIDs that are scene nodes, not assets)
            for (const uuid of nodeUuidSet)
                uuidToRefs.delete(uuid);
            // Step 3: Validate unique asset UUIDs against asset-db in parallel batches
            const uniqueUuids = Array.from(uuidToRefs.keys());
            const ASSET_BATCH = 20;
            const missingUuids = new Set();
            for (let i = 0; i < uniqueUuids.length; i += ASSET_BATCH) {
                const batch = uniqueUuids.slice(i, i + ASSET_BATCH);
                const results = await Promise.all(batch.map(uuid => Editor.Message.request('asset-db', 'query-asset-info', uuid)
                    .then((info) => ({ uuid, exists: !!info }))
                    .catch(() => ({ uuid, exists: false }))));
                for (const { uuid, exists } of results) {
                    if (!exists)
                        missingUuids.add(uuid);
                }
            }
            // Step 4: Build report
            const missingRefs = Array.from(missingUuids).map(uuid => {
                var _a;
                return ({
                    missingUuid: uuid,
                    referencedBy: (_a = uuidToRefs.get(uuid)) !== null && _a !== void 0 ? _a : []
                });
            });
            return {
                success: true,
                data: {
                    totalNodes: nodeUuids.length,
                    totalUniqueAssetRefs: uniqueUuids.length,
                    missingCount: missingUuids.size,
                    missingRefs,
                    message: missingUuids.size === 0
                        ? 'No missing asset references found in scene'
                        : `Found ${missingUuids.size} missing asset reference(s) across ${missingRefs.reduce((n, r) => n + r.referencedBy.length, 0)} component properties`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    collectRefUuids(comp, compType, nodeUuid, nodeName, uuidToRefs) {
        const skip = new Set(['__type__', 'cid', 'node', 'uuid', '_id', '__scriptAsset', 'enabled', 'type', 'readonly', 'visible', 'editor', 'extends']);
        const extractUuid = (val, propName) => {
            if (!val || typeof val !== 'object')
                return;
            // Unwrap descriptor: { value: ..., type: ... }
            if ('value' in val && !('uuid' in val) && !('__uuid__' in val)) {
                extractUuid(val.value, propName);
                return;
            }
            // Direct ref: { uuid: "..." } or { __uuid__: "..." }
            const uuid = val.uuid || val.__uuid__;
            if (uuid && typeof uuid === 'string') {
                if (!uuidToRefs.has(uuid))
                    uuidToRefs.set(uuid, []);
                uuidToRefs.get(uuid).push({ nodeUuid, nodeName, componentType: compType, property: propName });
                return;
            }
            // Array of refs
            if (Array.isArray(val)) {
                for (const item of val)
                    extractUuid(item, propName);
            }
        };
        for (const key of Object.keys(comp)) {
            if (skip.has(key) || key.startsWith('_'))
                continue;
            extractUuid(comp[key], key);
        }
    }
    async getAssetDependencies(urlOrUUID, direction = 'dependencies') {
        try {
            // Resolve asset UUID and URL
            let assetUuid;
            let assetUrl;
            if (urlOrUUID.startsWith('db://')) {
                assetUrl = urlOrUUID;
                const info = await Editor.Message.request('asset-db', 'query-asset-info', urlOrUUID);
                if (!(info === null || info === void 0 ? void 0 : info.uuid))
                    return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUuid = info.uuid;
            }
            else {
                assetUuid = urlOrUUID;
                const url = await Editor.Message.request('asset-db', 'query-url', urlOrUUID);
                if (!url)
                    return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUrl = url;
            }
            const projectPath = Editor.Project.path;
            const assetsPath = path.join(projectPath, 'assets');
            // Collect all UUIDs for this asset (main + sub-assets from .meta)
            const allAssetUuids = new Set([assetUuid]);
            try {
                const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
                if (fsPath) {
                    const metaPath = fsPath + '.meta';
                    if (fs.existsSync(metaPath)) {
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                        this.collectSubUuids(meta.subMetas, allAssetUuids);
                    }
                }
            }
            catch ( /* ignore meta read errors */_a) { /* ignore meta read errors */ }
            const dependencies = [];
            const dependents = [];
            // Find dependencies: assets this file references via __uuid__ and __type__
            if (direction === 'dependencies' || direction === 'both') {
                try {
                    const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
                    if (fsPath && fs.existsSync(fsPath)) {
                        const content = fs.readFileSync(fsPath, 'utf8');
                        const seen = new Set();
                        // Extract __uuid__ references
                        const refUuids = this.extractUuidsFromContent(content);
                        for (const ref of refUuids) {
                            const baseUuid = ref.split('@')[0];
                            if (seen.has(baseUuid) || allAssetUuids.has(baseUuid))
                                continue;
                            seen.add(baseUuid);
                            try {
                                const refUrl = await Editor.Message.request('asset-db', 'query-url', baseUuid);
                                dependencies.push({ uuid: baseUuid, url: refUrl || 'unresolved' });
                            }
                            catch (_b) {
                                dependencies.push({ uuid: baseUuid, url: 'unresolved' });
                            }
                        }
                        // Extract __type__ references (custom script components use compressed UUIDs)
                        const typeIds = this.extractTypeIdsFromContent(content);
                        for (const typeId of typeIds) {
                            const decompressed = this.decompressUuid(typeId);
                            if (!decompressed || seen.has(decompressed))
                                continue;
                            seen.add(decompressed);
                            try {
                                const refUrl = await Editor.Message.request('asset-db', 'query-url', decompressed);
                                if (refUrl) {
                                    dependencies.push({ uuid: decompressed, url: refUrl });
                                }
                            }
                            catch ( /* not a valid script UUID */_c) { /* not a valid script UUID */ }
                        }
                    }
                }
                catch ( /* ignore read errors */_d) { /* ignore read errors */ }
            }
            // Find dependents: serialized files that reference this asset's UUIDs
            if (direction === 'dependents' || direction === 'both') {
                // Build search strings: original UUIDs + compressed forms for __type__ matching
                const searchStrings = new Set(allAssetUuids);
                for (const uid of allAssetUuids) {
                    const compressed = this.compressUuid(uid);
                    if (compressed.length === 22)
                        searchStrings.add(compressed);
                }
                this.walkSerializedFiles(assetsPath, (filePath, content) => {
                    for (const str of searchStrings) {
                        if (content.includes(str)) {
                            const fileUrl = 'db://' + filePath.substring(projectPath.length + 1);
                            if (fileUrl !== assetUrl) {
                                dependents.push({ url: fileUrl });
                            }
                            break;
                        }
                    }
                });
            }
            return {
                success: true,
                data: {
                    asset: { uuid: assetUuid, url: assetUrl, allUuids: Array.from(allAssetUuids) },
                    dependencies,
                    dependents,
                    dependenciesCount: dependencies.length,
                    dependentsCount: dependents.length,
                    message: `Found ${dependencies.length} dependencies and ${dependents.length} dependents for ${assetUrl}`
                }
            };
        }
        catch (err) {
            return { success: false, error: `Dependency analysis failed: ${err.message}` };
        }
    }
    async getUnusedAssets(directory = 'db://assets', excludeDirectories = [], maxResults = 50, groupByFolder = false) {
        try {
            const projectPath = Editor.Project.path;
            const basePath = path.join(projectPath, directory.replace('db://', ''));
            if (!fs.existsSync(basePath)) {
                return { success: false, error: `Directory not found: ${directory}` };
            }
            // Step 1: Build UUID -> asset URL map from .meta files
            // Also build compressed UUID map for __type__ matching (script components)
            const uuidToUrl = new Map();
            const compressedToUrl = new Map();
            const allAssets = [];
            this.walkDirectory(basePath, (filePath) => {
                if (!filePath.endsWith('.meta'))
                    return;
                const assetFsPath = filePath.slice(0, -5); // Remove .meta suffix
                const assetUrl = 'db://' + assetFsPath.substring(projectPath.length + 1);
                // Check exclude directories
                for (const excl of excludeDirectories) {
                    if (assetUrl.startsWith(excl))
                        return;
                }
                // Skip if actual asset doesn't exist or is a directory
                try {
                    if (!fs.existsSync(assetFsPath) || fs.statSync(assetFsPath).isDirectory())
                        return;
                }
                catch (_a) {
                    return;
                }
                try {
                    const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const ext = path.extname(assetFsPath).toLowerCase();
                    allAssets.push({ url: assetUrl, ext });
                    // Map main UUID to asset URL
                    if (meta.uuid) {
                        uuidToUrl.set(meta.uuid, assetUrl);
                        const compressed = this.compressUuid(meta.uuid);
                        if (compressed.length === 22)
                            compressedToUrl.set(compressed, assetUrl);
                    }
                    // Map sub-asset UUIDs to parent asset URL
                    const subUuids = new Set();
                    this.collectSubUuids(meta.subMetas, subUuids);
                    for (const subUuid of subUuids) {
                        uuidToUrl.set(subUuid, assetUrl);
                        const compressed = this.compressUuid(subUuid);
                        if (compressed.length === 22)
                            compressedToUrl.set(compressed, assetUrl);
                    }
                }
                catch ( /* skip unparseable meta files */_b) { /* skip unparseable meta files */ }
            });
            // Step 2: Scan ALL serialized files in entire assets folder (not just target directory)
            // because scenes/prefabs referencing target assets may be in other folders
            const assetsPath = path.join(projectPath, 'assets');
            const referencedUrls = new Set();
            this.walkSerializedFiles(assetsPath, (_filePath, content) => {
                // Check __uuid__ references (images, prefabs, materials, etc.)
                const uuids = this.extractUuidsFromContent(content);
                for (const uuid of uuids) {
                    const baseUuid = uuid.split('@')[0];
                    const url = uuidToUrl.get(baseUuid);
                    if (url)
                        referencedUrls.add(url);
                }
                // Check __type__ references (script components use compressed UUIDs)
                const typeIds = this.extractTypeIdsFromContent(content);
                for (const typeId of typeIds) {
                    const url = compressedToUrl.get(typeId);
                    if (url)
                        referencedUrls.add(url);
                }
            });
            // Step 3: Find unused assets, separate scripts from other assets
            const scriptExts = ['.ts', '.js'];
            const allUnusedAssets = [];
            const allUnusedScripts = [];
            for (const asset of allAssets) {
                if (!referencedUrls.has(asset.url)) {
                    if (scriptExts.includes(asset.ext)) {
                        allUnusedScripts.push(asset.url);
                    }
                    else {
                        allUnusedAssets.push(asset.url);
                    }
                }
            }
            const totalUnusedAssets = allUnusedAssets.length;
            const totalUnusedScripts = allUnusedScripts.length;
            const limit = Math.max(1, maxResults);
            if (groupByFolder) {
                // Group by parent folder with counts
                const folderMap = new Map();
                for (const url of allUnusedAssets) {
                    const folder = url.substring(0, url.lastIndexOf('/'));
                    const entry = folderMap.get(folder) || { assets: 0, scripts: 0, samples: [] };
                    entry.assets++;
                    if (entry.samples.length < 3)
                        entry.samples.push(url.substring(url.lastIndexOf('/') + 1));
                    folderMap.set(folder, entry);
                }
                for (const url of allUnusedScripts) {
                    const folder = url.substring(0, url.lastIndexOf('/'));
                    const entry = folderMap.get(folder) || { assets: 0, scripts: 0, samples: [] };
                    entry.scripts++;
                    folderMap.set(folder, entry);
                }
                // Sort by total count descending, limit results
                const folders = Array.from(folderMap.entries())
                    .map(([folder, data]) => (Object.assign(Object.assign({ folder }, data), { total: data.assets + data.scripts })))
                    .sort((a, b) => b.total - a.total)
                    .slice(0, limit);
                return {
                    success: true,
                    data: {
                        directory,
                        totalAssets: allAssets.length,
                        referencedCount: referencedUrls.size,
                        unusedCount: totalUnusedAssets + totalUnusedScripts,
                        unusedAssetCount: totalUnusedAssets,
                        unusedScriptCount: totalUnusedScripts,
                        folders,
                        foldersShown: folders.length,
                        totalFolders: folderMap.size,
                        message: `Found ${totalUnusedAssets + totalUnusedScripts} unused items across ${folderMap.size} folders`,
                        note: 'Assets loaded dynamically (e.g. resources.load) may still appear unused. Review before deleting.'
                    }
                };
            }
            // Flat list with maxResults limit
            const unusedAssets = allUnusedAssets.sort().slice(0, limit);
            const unusedScripts = allUnusedScripts.sort().slice(0, limit);
            return {
                success: true,
                data: {
                    directory,
                    totalAssets: allAssets.length,
                    referencedCount: referencedUrls.size,
                    unusedCount: totalUnusedAssets + totalUnusedScripts,
                    unusedAssets,
                    unusedScripts,
                    showing: unusedAssets.length + unusedScripts.length,
                    totalUnusedAssets,
                    totalUnusedScripts,
                    truncated: totalUnusedAssets > limit || totalUnusedScripts > limit,
                    message: `Found ${totalUnusedAssets} unused assets and ${totalUnusedScripts} unused scripts (showing up to ${limit} each)`,
                    note: 'Assets loaded dynamically (e.g. resources.load) may still appear unused. Use groupByFolder:true for overview. Review before deleting.'
                }
            };
        }
        catch (err) {
            return { success: false, error: `Unused asset detection failed: ${err.message}` };
        }
    }
    async compressTextures(directory = 'db://assets', format = 'auto', quality = 0.8) {
        return new Promise((resolve) => {
            // Note: Texture compression would require image processing APIs
            resolve({
                success: false,
                error: 'Texture compression requires image processing capabilities not available in current Cocos Creator MCP implementation. Use the Editor\'s built-in texture compression settings or external tools.'
            });
        });
    }
    async exportAssetManifest(directory = 'db://assets', format = 'json', includeMetadata = true) {
        try {
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
            const manifest = [];
            for (const asset of assets) {
                const manifestEntry = {
                    name: asset.name,
                    url: asset.url,
                    uuid: asset.uuid,
                    type: asset.type,
                    size: asset.size || 0,
                    isDirectory: asset.isDirectory || false
                };
                if (includeMetadata) {
                    try {
                        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                        if (assetInfo && assetInfo.meta) {
                            manifestEntry.meta = assetInfo.meta;
                        }
                    }
                    catch (err) {
                        // Skip metadata if not available
                    }
                }
                manifest.push(manifestEntry);
            }
            let exportData;
            switch (format) {
                case 'json':
                    exportData = JSON.stringify(manifest, null, 2);
                    break;
                case 'csv':
                    exportData = this.convertToCSV(manifest);
                    break;
                case 'xml':
                    exportData = this.convertToXML(manifest);
                    break;
                default:
                    exportData = JSON.stringify(manifest, null, 2);
            }
            return {
                success: true,
                data: {
                    directory: directory,
                    format: format,
                    assetCount: manifest.length,
                    includeMetadata: includeMetadata,
                    manifest: exportData,
                    message: `Asset manifest exported with ${manifest.length} assets`
                }
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    convertToCSV(data) {
        if (data.length === 0)
            return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'object' ? JSON.stringify(value) : String(value);
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    }
    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<assets>\n';
        for (const item of data) {
            xml += '  <asset>\n';
            for (const [key, value] of Object.entries(item)) {
                const xmlValue = typeof value === 'object' ?
                    JSON.stringify(value) :
                    String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                xml += `    <${key}>${xmlValue}</${key}>\n`;
            }
            xml += '  </asset>\n';
        }
        xml += '</assets>';
        return xml;
    }
    // --- Helper methods for dependency and unused asset analysis ---
    extractUuidsFromContent(content) {
        const uuids = [];
        const pattern = /"__uuid__"\s*:\s*"([^"]+)"/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            uuids.push(match[1]);
        }
        return uuids;
    }
    collectSubUuids(subMetas, uuids) {
        if (!subMetas || typeof subMetas !== 'object')
            return;
        for (const key of Object.keys(subMetas)) {
            const sub = subMetas[key];
            if (sub === null || sub === void 0 ? void 0 : sub.uuid)
                uuids.add(sub.uuid);
            if (sub === null || sub === void 0 ? void 0 : sub.subMetas)
                this.collectSubUuids(sub.subMetas, uuids);
        }
    }
    walkDirectory(dir, callback) {
        if (!fs.existsSync(dir))
            return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules')
                    continue;
                this.walkDirectory(fullPath, callback);
            }
            else {
                callback(fullPath);
            }
        }
    }
    walkSerializedFiles(dir, callback) {
        const extensions = ['.scene', '.prefab', '.anim', '.mtl', '.effect'];
        this.walkDirectory(dir, (filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            if (!extensions.includes(ext))
                return;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                callback(filePath, content);
            }
            catch ( /* skip binary or unreadable files */_a) { /* skip binary or unreadable files */ }
        });
    }
    extractTypeIdsFromContent(content) {
        const typeIds = [];
        const pattern = /"__type__"\s*:\s*"([^"]+)"/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            // Skip built-in Cocos types (cc.Node, cc.Sprite, etc.)
            if (!match[1].startsWith('cc.')) {
                typeIds.push(match[1]);
            }
        }
        return typeIds;
    }
    /**
     * Compress a standard UUID to Cocos Creator's 22-char format used in __type__.
     * Format: first 2 hex chars kept + 10 pairs of base64 chars (encoding remaining 30 hex chars).
     */
    compressUuid(uuid) {
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const hex = uuid.replace(/-/g, '').toLowerCase();
        if (hex.length !== 32)
            return uuid;
        let result = hex[0] + hex[1];
        for (let i = 2; i < 32; i += 3) {
            const val = (parseInt(hex[i], 16) << 8) | (parseInt(hex[i + 1], 16) << 4) | parseInt(hex[i + 2], 16);
            result += BASE64_KEYS[val >> 6];
            result += BASE64_KEYS[val & 0x3F];
        }
        return result; // 2 + 20 = 22 chars
    }
    /**
     * Decompress a 22-char Cocos Creator compressed UUID back to standard UUID format.
     * Returns null if the input is not a valid compressed UUID.
     */
    decompressUuid(compressed) {
        if (compressed.length !== 22)
            return null;
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const BASE64_VALUES = new Map();
        for (let i = 0; i < BASE64_KEYS.length; i++) {
            BASE64_VALUES.set(BASE64_KEYS[i], i);
        }
        const HEX = '0123456789abcdef';
        let hex = compressed[0] + compressed[1];
        for (let i = 2; i < 22; i += 2) {
            const lhs = BASE64_VALUES.get(compressed[i]);
            const rhs = BASE64_VALUES.get(compressed[i + 1]);
            if (lhs === undefined || rhs === undefined)
                return null;
            hex += HEX[lhs >> 2];
            hex += HEX[((lhs & 3) << 2) | (rhs >> 4)];
            hex += HEX[rhs & 0xF];
        }
        // Insert dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
}
exports.AssetAdvancedTools = AssetAdvancedTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxxTEFBcUw7Z0JBQ2xNLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLFlBQVksQ0FBQzt5QkFDM0c7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5RUFBeUU7eUJBQ3pGO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkRBQTJEO3lCQUMzRTt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlFQUFpRTt5QkFDakY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrREFBa0Q7NEJBQy9ELElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDOzRCQUM1QyxPQUFPLEVBQUUsY0FBYzt5QkFDMUI7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FB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Q0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxTQUFTO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQ3hELEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5SCxDQUFDO0NBQ0o7QUFoL0JELGdEQWcvQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBc3NldEFkdmFuY2VkVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2FkdmFuY2VkJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWR2YW5jZWQgYXNzZXQgb3BlcmF0aW9uczogc2F2ZSBtZXRhLCBnZW5lcmF0ZSBVUkxzLCBjaGVjayBEQiByZWFkaW5lc3MsIG9wZW4gZXh0ZXJuYWxseSwgZ2V0IGRlcGVuZGVuY2llcywgZmluZCB1bnVzZWQgYXNzZXRzLiBVc2UgdGhlIFwiYWN0aW9uXCIgcGFyYW1ldGVyIHRvIHNlbGVjdCB0aGUgb3BlcmF0aW9uLicsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnc2F2ZV9tZXRhJywgJ2dlbmVyYXRlX3VybCcsICdxdWVyeV9kYl9yZWFkeScsICdvcGVuX2V4dGVybmFsJywgJ2dldF9kZXBlbmRlbmNpZXMnLCAnZ2V0X3VudXNlZCddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybE9yVVVJRDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCBvciBVVUlEICh1c2VkIGJ5OiBzYXZlX21ldGEsIG9wZW5fZXh0ZXJuYWwsIGdldF9kZXBlbmRlbmNpZXMpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgbWV0YSBzZXJpYWxpemVkIGNvbnRlbnQgc3RyaW5nICh1c2VkIGJ5OiBzYXZlX21ldGEpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBVUkwgdG8gZ2VuZXJhdGUgYXZhaWxhYmxlIFVSTCBmb3IgKHVzZWQgYnk6IGdlbmVyYXRlX3VybCknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlcGVuZGVuY3kgZGlyZWN0aW9uICh1c2VkIGJ5OiBnZXRfZGVwZW5kZW5jaWVzKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2RlcGVuZGVudHMnLCAnZGVwZW5kZW5jaWVzJywgJ2JvdGgnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkZXBlbmRlbmNpZXMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSB0byBzY2FuICh1c2VkIGJ5OiBnZXRfdW51c2VkKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVEaXJlY3Rvcmllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yaWVzIHRvIGV4Y2x1ZGUgZnJvbSBzY2FuICh1c2VkIGJ5OiBnZXRfdW51c2VkKScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWF4aW11bSBudW1iZXIgb2YgdW51c2VkIGFzc2V0cyB0byByZXR1cm4gKHVzZWQgYnk6IGdldF91bnVzZWQpLiBEZWZhdWx0OiA1MCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBncm91cEJ5Rm9sZGVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dyb3VwIHJlc3VsdHMgYnkgZm9sZGVyIHdpdGggY291bnRzIGluc3RlYWQgb2YgbGlzdGluZyBldmVyeSBmaWxlICh1c2VkIGJ5OiBnZXRfdW51c2VkKS4gRGVmYXVsdDogZmFsc2UnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2JhdGNoJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggYXNzZXQgb3BlcmF0aW9uczogaW1wb3J0LCBkZWxldGUsIHZhbGlkYXRlIHJlZmVyZW5jZXMsIGNvbXByZXNzIHRleHR1cmVzLCBleHBvcnQgbWFuaWZlc3QuIFVzZSB0aGUgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc2VsZWN0IHRoZSBvcGVyYXRpb24uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydpbXBvcnQnLCAnZGVsZXRlJywgJ3ZhbGlkYXRlX3JlZmVyZW5jZXMnLCAnY29tcHJlc3NfdGV4dHVyZXMnLCAnZXhwb3J0X21hbmlmZXN0JywgJ3NjYW5fc2NlbmVfcmVmcyddXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBkaXJlY3RvcnkgcGF0aCAodXNlZCBieTogaW1wb3J0KSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RGlyZWN0b3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGRpcmVjdG9yeSBVUkwgKHVzZWQgYnk6IGltcG9ydCknXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVGaWx0ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWxlIGV4dGVuc2lvbnMgdG8gaW5jbHVkZSwgZS5nLiBbXCIucG5nXCIsIFwiLmpwZ1wiXSAodXNlZCBieTogaW1wb3J0KScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBzdWJkaXJlY3RvcmllcyAodXNlZCBieTogaW1wb3J0KScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3ZlcndyaXRlIGV4aXN0aW5nIGZpbGVzICh1c2VkIGJ5OiBpbXBvcnQpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBhc3NldCBVUkxzIHRvIGRlbGV0ZSAodXNlZCBieTogZGVsZXRlKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHRvIG9wZXJhdGUgb24gKHVzZWQgYnk6IHZhbGlkYXRlX3JlZmVyZW5jZXMsIGNvbXByZXNzX3RleHR1cmVzLCBleHBvcnRfbWFuaWZlc3QpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9ybWF0IGZvciBjb21wcmVzc2lvbiAoZW51bTogYXV0bywganBnLCBwbmcsIHdlYnApIG9yIGV4cG9ydCAoZW51bToganNvbiwgY3N2LCB4bWwpICh1c2VkIGJ5OiBjb21wcmVzc190ZXh0dXJlcywgZXhwb3J0X21hbmlmZXN0KScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYXV0bydcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbGl0eToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXByZXNzaW9uIHF1YWxpdHkgMC4xLTEuMCAodXNlZCBieTogY29tcHJlc3NfdGV4dHVyZXMpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDAuMSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IDEuMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDAuOFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBhc3NldCBtZXRhZGF0YSAodXNlZCBieTogZXhwb3J0X21hbmlmZXN0KScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0X2FkdmFuY2VkJzoge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NhdmVfbWV0YSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNhdmVBc3NldE1ldGEoYXJncy51cmxPclVVSUQsIGFyZ3MuY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2VuZXJhdGVfdXJsJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2VuZXJhdGVBdmFpbGFibGVVcmwoYXJncy51cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RiX3JlYWR5JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlBc3NldERiUmVhZHkoKTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdvcGVuX2V4dGVybmFsJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlbkFzc2V0RXh0ZXJuYWwoYXJncy51cmxPclVVSUQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9kZXBlbmRlbmNpZXMnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldERlcGVuZGVuY2llcyhhcmdzLnVybE9yVVVJRCwgYXJncy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF91bnVzZWQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRVbnVzZWRBc3NldHMoYXJncy5kaXJlY3RvcnksIGFyZ3MuZXhjbHVkZURpcmVjdG9yaWVzLCBhcmdzLm1heFJlc3VsdHMsIGFyZ3MuZ3JvdXBCeUZvbGRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgYXNzZXRfYWR2YW5jZWQ6ICR7YXJncy5hY3Rpb259YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2FzZSAnYXNzZXRfYmF0Y2gnOiB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW1wb3J0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hJbXBvcnRBc3NldHMoYXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hEZWxldGVBc3NldHMoYXJncy51cmxzKTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9yZWZlcmVuY2VzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVBc3NldFJlZmVyZW5jZXMoYXJncy5kaXJlY3RvcnkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXByZXNzX3RleHR1cmVzJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29tcHJlc3NUZXh0dXJlcyhhcmdzLmRpcmVjdG9yeSwgYXJncy5mb3JtYXQsIGFyZ3MucXVhbGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZXhwb3J0X21hbmlmZXN0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhwb3J0QXNzZXRNYW5pZmVzdChhcmdzLmRpcmVjdG9yeSwgYXJncy5mb3JtYXQsIGFyZ3MuaW5jbHVkZU1ldGFkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdzY2FuX3NjZW5lX3JlZnMnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2FuU2NlbmVNaXNzaW5nUmVmcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIGFzc2V0X2JhdGNoOiAke2FyZ3MuYWN0aW9ufWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlQXNzZXRNZXRhKHVybE9yVVVJRDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCB1cmxPclVVSUQsIGNvbnRlbnQpLnRoZW4oKHJlc3VsdDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0Py51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdD8udXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQXNzZXQgbWV0YSBzYXZlZCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUF2YWlsYWJsZVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2dlbmVyYXRlLWF2YWlsYWJsZS11cmwnLCB1cmwpLnRoZW4oKGF2YWlsYWJsZVVybDogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxVcmw6IHVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVXJsOiBhdmFpbGFibGVVcmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGF2YWlsYWJsZVVybCA9PT0gdXJsID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVUkwgaXMgYXZhaWxhYmxlJyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnR2VuZXJhdGVkIG5ldyBhdmFpbGFibGUgVVJMJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlBc3NldERiUmVhZHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcmVhZHknKS50aGVuKChyZWFkeTogYm9vbGVhbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5OiByZWFkeSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVhZHkgPyAnQXNzZXQgZGF0YWJhc2UgaXMgcmVhZHknIDogJ0Fzc2V0IGRhdGFiYXNlIGlzIG5vdCByZWFkeSdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9wZW5Bc3NldEV4dGVybmFsKHVybE9yVVVJRDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnb3Blbi1hc3NldCcsIHVybE9yVVVJRCkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBc3NldCBvcGVuZWQgd2l0aCBleHRlcm5hbCBwcm9ncmFtJ1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBiYXRjaEltcG9ydEFzc2V0cyhhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnNvdXJjZURpcmVjdG9yeSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1NvdXJjZSBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3QnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gdGhpcy5nZXRGaWxlc0Zyb21EaXJlY3RvcnkoXHJcbiAgICAgICAgICAgICAgICBhcmdzLnNvdXJjZURpcmVjdG9yeSxcclxuICAgICAgICAgICAgICAgIGFyZ3MuZmlsZUZpbHRlciB8fCBbXSxcclxuICAgICAgICAgICAgICAgIGFyZ3MucmVjdXJzaXZlIHx8IGZhbHNlXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpbXBvcnRSZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiBmaWxlcykge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBgJHthcmdzLnRhcmdldERpcmVjdG9yeX0vJHtmaWxlTmFtZX1gO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdpbXBvcnQtYXNzZXQnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCwgdGFyZ2V0UGF0aCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiBhcmdzLm92ZXJ3cml0ZSB8fCBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbmFtZTogIShhcmdzLm92ZXJ3cml0ZSB8fCBmYWxzZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydFJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0Py51dWlkXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGltcG9ydFJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ291bnQ6IHN1Y2Nlc3NDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiBlcnJvckNvdW50LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGltcG9ydFJlc3VsdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEJhdGNoIGltcG9ydCBjb21wbGV0ZWQ6ICR7c3VjY2Vzc0NvdW50fSBzdWNjZXNzLCAke2Vycm9yQ291bnR9IGVycm9yc2BcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KGRpclBhdGg6IHN0cmluZywgZmlsZUZpbHRlcjogc3RyaW5nW10sIHJlY3Vyc2l2ZTogYm9vbGVhbik6IHN0cmluZ1tdIHtcclxuICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XHJcbiAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcclxuICAgICAgICBjb25zdCBmaWxlczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhkaXJQYXRoKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIGl0ZW0pO1xyXG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChmaWxlRmlsdGVyLmxlbmd0aCA9PT0gMCB8fCBmaWxlRmlsdGVyLnNvbWUoZXh0ID0+IGl0ZW0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChleHQudG9Mb3dlckNhc2UoKSkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZXMucHVzaChmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpICYmIHJlY3Vyc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgZmlsZXMucHVzaCguLi50aGlzLmdldEZpbGVzRnJvbURpcmVjdG9yeShmdWxsUGF0aCwgZmlsZUZpbHRlciwgcmVjdXJzaXZlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmaWxlcztcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoRGVsZXRlQXNzZXRzKHVybHM6IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBkZWxldGVSZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgdXJscykge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdkZWxldGUtYXNzZXQnLCB1cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogdXJscy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JDb3VudDogZXJyb3JDb3VudCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBkZWxldGVSZXN1bHRzLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBkZWxldGUgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlQXNzZXRSZWZlcmVuY2VzKGRpcmVjdG9yeTogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gR2V0IGFsbCBhc3NldHMgaW4gZGlyZWN0b3J5XHJcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogYCR7ZGlyZWN0b3J5fS8qKi8qYCB9KTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGJyb2tlblJlZmVyZW5jZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkUmVmZXJlbmNlczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhc3NldC51cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRSZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnIgYXMgRXJyb3IpLm1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiBkaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFzc2V0cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRSZWZlcmVuY2VzOiB2YWxpZFJlZmVyZW5jZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXM6IGJyb2tlblJlZmVyZW5jZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlbkFzc2V0czogYnJva2VuUmVmZXJlbmNlcyxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVmFsaWRhdGlvbiBjb21wbGV0ZWQ6ICR7YnJva2VuUmVmZXJlbmNlcy5sZW5ndGh9IGJyb2tlbiByZWZlcmVuY2VzIGZvdW5kYFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzY2FuU2NlbmVNaXNzaW5nUmVmcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogV2FsayBub2RlIHRyZWUsIGNvbGxlY3QgYWxsIG5vZGUgVVVJRHNcclxuICAgICAgICAgICAgY29uc3Qgbm9kZVRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlVHJlZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHF1ZXJ5IHNjZW5lIG5vZGUgdHJlZScgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcclxuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGU/LnV1aWQpIG5vZGVVdWlkcy5wdXNoKG5vZGUudXVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZT8uY2hpbGRyZW4pIHF1ZXVlLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWRTZXQgPSBuZXcgU2V0KG5vZGVVdWlkcyk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDI6IFF1ZXJ5IGFsbCBub2RlcyBpbiBwYXJhbGxlbCBiYXRjaGVzLCBjb2xsZWN0IFVVSUQgcmVmc1xyXG4gICAgICAgICAgICBjb25zdCBOT0RFX0JBVENIID0gMTA7XHJcbiAgICAgICAgICAgIGNvbnN0IHV1aWRUb1JlZnMgPSBuZXcgTWFwPHN0cmluZywgeyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRUeXBlOiBzdHJpbmc7IHByb3BlcnR5OiBzdHJpbmcgfVtdPigpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlVXVpZHMubGVuZ3RoOyBpICs9IE5PREVfQkFUQ0gpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gbm9kZVV1aWRzLnNsaWNlKGksIGkgKyBOT0RFX0JBVENIKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgdXVpZCkuY2F0Y2goKCkgPT4gbnVsbCkpXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByZXN1bHRzLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSByZXN1bHRzW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGE/Ll9fY29tcHNfXykgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQgPSBiYXRjaFtqXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlTmFtZSA9IG5vZGVEYXRhLm5hbWU/LnZhbHVlID8/IG5vZGVEYXRhLm5hbWUgPz8gbm9kZVV1aWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IChjb21wIGFzIGFueSkuX190eXBlX18gfHwgKGNvbXAgYXMgYW55KS50eXBlIHx8ICdVbmtub3duJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0UmVmVXVpZHMoY29tcCBhcyBhbnksIGNvbXBUeXBlLCBub2RlVXVpZCwgU3RyaW5nKG5vZGVOYW1lKSwgdXVpZFRvUmVmcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBSZW1vdmUgbm9kZS10by1ub2RlIHJlZnMgKFVVSURzIHRoYXQgYXJlIHNjZW5lIG5vZGVzLCBub3QgYXNzZXRzKVxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHV1aWQgb2Ygbm9kZVV1aWRTZXQpIHV1aWRUb1JlZnMuZGVsZXRlKHV1aWQpO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBWYWxpZGF0ZSB1bmlxdWUgYXNzZXQgVVVJRHMgYWdhaW5zdCBhc3NldC1kYiBpbiBwYXJhbGxlbCBiYXRjaGVzXHJcbiAgICAgICAgICAgIGNvbnN0IHVuaXF1ZVV1aWRzID0gQXJyYXkuZnJvbSh1dWlkVG9SZWZzLmtleXMoKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IEFTU0VUX0JBVENIID0gMjA7XHJcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1bmlxdWVVdWlkcy5sZW5ndGg7IGkgKz0gQVNTRVRfQkFUQ0gpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gdW5pcXVlVXVpZHMuc2xpY2UoaSwgaSArIEFTU0VUX0JBVENIKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKChpbmZvOiBhbnkpID0+ICh7IHV1aWQsIGV4aXN0czogISFpbmZvIH0pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+ICh7IHV1aWQsIGV4aXN0czogZmFsc2UgfSkpXHJcbiAgICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgeyB1dWlkLCBleGlzdHMgfSBvZiByZXN1bHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHMpIG1pc3NpbmdVdWlkcy5hZGQodXVpZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgNDogQnVpbGQgcmVwb3J0XHJcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdSZWZzID0gQXJyYXkuZnJvbShtaXNzaW5nVXVpZHMpLm1hcCh1dWlkID0+ICh7XHJcbiAgICAgICAgICAgICAgICBtaXNzaW5nVXVpZDogdXVpZCxcclxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRCeTogdXVpZFRvUmVmcy5nZXQodXVpZCkgPz8gW11cclxuICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxOb2Rlczogbm9kZVV1aWRzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVuaXF1ZUFzc2V0UmVmczogdW5pcXVlVXVpZHMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmdDb3VudDogbWlzc2luZ1V1aWRzLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZ1JlZnMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbWlzc2luZ1V1aWRzLnNpemUgPT09IDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnTm8gbWlzc2luZyBhc3NldCByZWZlcmVuY2VzIGZvdW5kIGluIHNjZW5lJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGBGb3VuZCAke21pc3NpbmdVdWlkcy5zaXplfSBtaXNzaW5nIGFzc2V0IHJlZmVyZW5jZShzKSBhY3Jvc3MgJHttaXNzaW5nUmVmcy5yZWR1Y2UoKG4sIHIpID0+IG4gKyByLnJlZmVyZW5jZWRCeS5sZW5ndGgsIDApfSBjb21wb25lbnQgcHJvcGVydGllc2BcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY29sbGVjdFJlZlV1aWRzKFxyXG4gICAgICAgIGNvbXA6IGFueSxcclxuICAgICAgICBjb21wVHlwZTogc3RyaW5nLFxyXG4gICAgICAgIG5vZGVVdWlkOiBzdHJpbmcsXHJcbiAgICAgICAgbm9kZU5hbWU6IHN0cmluZyxcclxuICAgICAgICB1dWlkVG9SZWZzOiBNYXA8c3RyaW5nLCB7IG5vZGVVdWlkOiBzdHJpbmc7IG5vZGVOYW1lOiBzdHJpbmc7IGNvbXBvbmVudFR5cGU6IHN0cmluZzsgcHJvcGVydHk6IHN0cmluZyB9W10+XHJcbiAgICApOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBza2lwID0gbmV3IFNldChbJ19fdHlwZV9fJywgJ2NpZCcsICdub2RlJywgJ3V1aWQnLCAnX2lkJywgJ19fc2NyaXB0QXNzZXQnLCAnZW5hYmxlZCcsICd0eXBlJywgJ3JlYWRvbmx5JywgJ3Zpc2libGUnLCAnZWRpdG9yJywgJ2V4dGVuZHMnXSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGV4dHJhY3RVdWlkID0gKHZhbDogYW55LCBwcm9wTmFtZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdmFsIHx8IHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSByZXR1cm47XHJcbiAgICAgICAgICAgIC8vIFVud3JhcCBkZXNjcmlwdG9yOiB7IHZhbHVlOiAuLi4sIHR5cGU6IC4uLiB9XHJcbiAgICAgICAgICAgIGlmICgndmFsdWUnIGluIHZhbCAmJiAhKCd1dWlkJyBpbiB2YWwpICYmICEoJ19fdXVpZF9fJyBpbiB2YWwpKSB7XHJcbiAgICAgICAgICAgICAgICBleHRyYWN0VXVpZCh2YWwudmFsdWUsIHByb3BOYW1lKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBEaXJlY3QgcmVmOiB7IHV1aWQ6IFwiLi4uXCIgfSBvciB7IF9fdXVpZF9fOiBcIi4uLlwiIH1cclxuICAgICAgICAgICAgY29uc3QgdXVpZCA9IHZhbC51dWlkIHx8IHZhbC5fX3V1aWRfXztcclxuICAgICAgICAgICAgaWYgKHV1aWQgJiYgdHlwZW9mIHV1aWQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXV1aWRUb1JlZnMuaGFzKHV1aWQpKSB1dWlkVG9SZWZzLnNldCh1dWlkLCBbXSk7XHJcbiAgICAgICAgICAgICAgICB1dWlkVG9SZWZzLmdldCh1dWlkKSEucHVzaCh7IG5vZGVVdWlkLCBub2RlTmFtZSwgY29tcG9uZW50VHlwZTogY29tcFR5cGUsIHByb3BlcnR5OiBwcm9wTmFtZSB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBBcnJheSBvZiByZWZzXHJcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWwpIGV4dHJhY3RVdWlkKGl0ZW0sIHByb3BOYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbXApKSB7XHJcbiAgICAgICAgICAgIGlmIChza2lwLmhhcyhrZXkpIHx8IGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBleHRyYWN0VXVpZChjb21wW2tleV0sIGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXREZXBlbmRlbmNpZXModXJsT3JVVUlEOiBzdHJpbmcsIGRpcmVjdGlvbjogc3RyaW5nID0gJ2RlcGVuZGVuY2llcycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYXNzZXQgVVVJRCBhbmQgVVJMXHJcbiAgICAgICAgICAgIGxldCBhc3NldFV1aWQ6IHN0cmluZztcclxuICAgICAgICAgICAgbGV0IGFzc2V0VXJsOiBzdHJpbmc7XHJcblxyXG4gICAgICAgICAgICBpZiAodXJsT3JVVUlELnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcclxuICAgICAgICAgICAgICAgIGFzc2V0VXJsID0gdXJsT3JVVUlEO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCB1cmxPclVVSUQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpbmZvPy51dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcclxuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IGluZm8udXVpZDtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IHVybE9yVVVJRDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHVybE9yVVVJRCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXVybCkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke3VybE9yVVVJRH1gIH07XHJcbiAgICAgICAgICAgICAgICBhc3NldFVybCA9IHVybDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgICAgICBjb25zdCBhc3NldHNQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XHJcblxyXG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBVVUlEcyBmb3IgdGhpcyBhc3NldCAobWFpbiArIHN1Yi1hc3NldHMgZnJvbSAubWV0YSlcclxuICAgICAgICAgICAgY29uc3QgYWxsQXNzZXRVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPihbYXNzZXRVdWlkXSk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZzUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFQYXRoID0gZnNQYXRoICsgJy5tZXRhJztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhtZXRhUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1ldGFQYXRoLCAndXRmOCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0U3ViVXVpZHMobWV0YS5zdWJNZXRhcywgYWxsQXNzZXRVdWlkcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlIG1ldGEgcmVhZCBlcnJvcnMgKi8gfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgZGVwZW5kZW5jaWVzOiBBcnJheTx7IHV1aWQ6IHN0cmluZzsgdXJsOiBzdHJpbmcgfT4gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgZGVwZW5kZW50czogQXJyYXk8eyB1cmw6IHN0cmluZyB9PiA9IFtdO1xyXG5cclxuICAgICAgICAgICAgLy8gRmluZCBkZXBlbmRlbmNpZXM6IGFzc2V0cyB0aGlzIGZpbGUgcmVmZXJlbmNlcyB2aWEgX191dWlkX18gYW5kIF9fdHlwZV9fXHJcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdkZXBlbmRlbmNpZXMnIHx8IGRpcmVjdGlvbiA9PT0gJ2JvdGgnKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZzUGF0aCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCBhc3NldFVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZzUGF0aCAmJiBmcy5leGlzdHNTeW5jKGZzUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX191dWlkX18gcmVmZXJlbmNlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVdWlkcyA9IHRoaXMuZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcmVmIG9mIHJlZlV1aWRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHJlZi5zcGxpdCgnQCcpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlZW4uaGFzKGJhc2VVdWlkKSB8fCBhbGxBc3NldFV1aWRzLmhhcyhiYXNlVXVpZCkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vlbi5hZGQoYmFzZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXJsID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXJsJywgYmFzZVV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHsgdXVpZDogYmFzZVV1aWQsIHVybDogcmVmVXJsIHx8ICd1bnJlc29sdmVkJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHsgdXVpZDogYmFzZVV1aWQsIHVybDogJ3VucmVzb2x2ZWQnIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IF9fdHlwZV9fIHJlZmVyZW5jZXMgKGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cyB1c2UgY29tcHJlc3NlZCBVVUlEcylcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkcyA9IHRoaXMuZXh0cmFjdFR5cGVJZHNGcm9tQ29udGVudChjb250ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlSWQgb2YgdHlwZUlkcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb21wcmVzc2VkID0gdGhpcy5kZWNvbXByZXNzVXVpZCh0eXBlSWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWNvbXByZXNzZWQgfHwgc2Vlbi5oYXMoZGVjb21wcmVzc2VkKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVuLmFkZChkZWNvbXByZXNzZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBkZWNvbXByZXNzZWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWZVcmwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBkZWNvbXByZXNzZWQsIHVybDogcmVmVXJsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBub3QgYSB2YWxpZCBzY3JpcHQgVVVJRCAqLyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlIHJlYWQgZXJyb3JzICovIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluZCBkZXBlbmRlbnRzOiBzZXJpYWxpemVkIGZpbGVzIHRoYXQgcmVmZXJlbmNlIHRoaXMgYXNzZXQncyBVVUlEc1xyXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZGVwZW5kZW50cycgfHwgZGlyZWN0aW9uID09PSAnYm90aCcpIHtcclxuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHNlYXJjaCBzdHJpbmdzOiBvcmlnaW5hbCBVVUlEcyArIGNvbXByZXNzZWQgZm9ybXMgZm9yIF9fdHlwZV9fIG1hdGNoaW5nXHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hTdHJpbmdzID0gbmV3IFNldDxzdHJpbmc+KGFsbEFzc2V0VXVpZHMpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1aWQgb2YgYWxsQXNzZXRVdWlkcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZCh1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCA9PT0gMjIpIHNlYXJjaFN0cmluZ3MuYWRkKGNvbXByZXNzZWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa1NlcmlhbGl6ZWRGaWxlcyhhc3NldHNQYXRoLCAoZmlsZVBhdGgsIGNvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN0ciBvZiBzZWFyY2hTdHJpbmdzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50LmluY2x1ZGVzKHN0cikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVVcmwgPSAnZGI6Ly8nICsgZmlsZVBhdGguc3Vic3RyaW5nKHByb2plY3RQYXRoLmxlbmd0aCArIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVVcmwgIT09IGFzc2V0VXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW50cy5wdXNoKHsgdXJsOiBmaWxlVXJsIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXQ6IHsgdXVpZDogYXNzZXRVdWlkLCB1cmw6IGFzc2V0VXJsLCBhbGxVdWlkczogQXJyYXkuZnJvbShhbGxBc3NldFV1aWRzKSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcyxcclxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbnRzLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llc0NvdW50OiBkZXBlbmRlbmNpZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHNDb3VudDogZGVwZW5kZW50cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7ZGVwZW5kZW5jaWVzLmxlbmd0aH0gZGVwZW5kZW5jaWVzIGFuZCAke2RlcGVuZGVudHMubGVuZ3RofSBkZXBlbmRlbnRzIGZvciAke2Fzc2V0VXJsfWBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEZXBlbmRlbmN5IGFuYWx5c2lzIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0VW51c2VkQXNzZXRzKGRpcmVjdG9yeTogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJywgZXhjbHVkZURpcmVjdG9yaWVzOiBzdHJpbmdbXSA9IFtdLCBtYXhSZXN1bHRzOiBudW1iZXIgPSA1MCwgZ3JvdXBCeUZvbGRlcjogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCBkaXJlY3RvcnkucmVwbGFjZSgnZGI6Ly8nLCAnJykpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGJhc2VQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0b3J5IG5vdCBmb3VuZDogJHtkaXJlY3Rvcnl9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEJ1aWxkIFVVSUQgLT4gYXNzZXQgVVJMIG1hcCBmcm9tIC5tZXRhIGZpbGVzXHJcbiAgICAgICAgICAgIC8vIEFsc28gYnVpbGQgY29tcHJlc3NlZCBVVUlEIG1hcCBmb3IgX190eXBlX18gbWF0Y2hpbmcgKHNjcmlwdCBjb21wb25lbnRzKVxyXG4gICAgICAgICAgICBjb25zdCB1dWlkVG9VcmwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkVG9VcmwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xyXG4gICAgICAgICAgICBjb25zdCBhbGxBc3NldHM6IEFycmF5PHsgdXJsOiBzdHJpbmc7IGV4dDogc3RyaW5nIH0+ID0gW107XHJcblxyXG4gICAgICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoYmFzZVBhdGgsIChmaWxlUGF0aCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFmaWxlUGF0aC5lbmRzV2l0aCgnLm1ldGEnKSkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0RnNQYXRoID0gZmlsZVBhdGguc2xpY2UoMCwgLTUpOyAvLyBSZW1vdmUgLm1ldGEgc3VmZml4XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldFVybCA9ICdkYjovLycgKyBhc3NldEZzUGF0aC5zdWJzdHJpbmcocHJvamVjdFBhdGgubGVuZ3RoICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXhjbHVkZSBkaXJlY3Rvcmllc1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBleGNsIG9mIGV4Y2x1ZGVEaXJlY3Rvcmllcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldFVybC5zdGFydHNXaXRoKGV4Y2wpKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBpZiBhY3R1YWwgYXNzZXQgZG9lc24ndCBleGlzdCBvciBpcyBhIGRpcmVjdG9yeVxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXNzZXRGc1BhdGgpIHx8IGZzLnN0YXRTeW5jKGFzc2V0RnNQYXRoKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgcmV0dXJuOyB9XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JykpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShhc3NldEZzUGF0aCkudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYWxsQXNzZXRzLnB1c2goeyB1cmw6IGFzc2V0VXJsLCBleHQgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcCBtYWluIFVVSUQgdG8gYXNzZXQgVVJMXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGEudXVpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkVG9Vcmwuc2V0KG1ldGEudXVpZCwgYXNzZXRVcmwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gdGhpcy5jb21wcmVzc1V1aWQobWV0YS51dWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgc3ViLWFzc2V0IFVVSURzIHRvIHBhcmVudCBhc3NldCBVUkxcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWJVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdFN1YlV1aWRzKG1ldGEuc3ViTWV0YXMsIHN1YlV1aWRzKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN1YlV1aWQgb2Ygc3ViVXVpZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZFRvVXJsLnNldChzdWJVdWlkLCBhc3NldFVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZChzdWJVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNraXAgdW5wYXJzZWFibGUgbWV0YSBmaWxlcyAqLyB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAyOiBTY2FuIEFMTCBzZXJpYWxpemVkIGZpbGVzIGluIGVudGlyZSBhc3NldHMgZm9sZGVyIChub3QganVzdCB0YXJnZXQgZGlyZWN0b3J5KVxyXG4gICAgICAgICAgICAvLyBiZWNhdXNlIHNjZW5lcy9wcmVmYWJzIHJlZmVyZW5jaW5nIHRhcmdldCBhc3NldHMgbWF5IGJlIGluIG90aGVyIGZvbGRlcnNcclxuICAgICAgICAgICAgY29uc3QgYXNzZXRzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xyXG4gICAgICAgICAgICBjb25zdCByZWZlcmVuY2VkVXJscyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53YWxrU2VyaWFsaXplZEZpbGVzKGFzc2V0c1BhdGgsIChfZmlsZVBhdGgsIGNvbnRlbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIENoZWNrIF9fdXVpZF9fIHJlZmVyZW5jZXMgKGltYWdlcywgcHJlZmFicywgbWF0ZXJpYWxzLCBldGMuKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIHV1aWRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVV1aWQgPSB1dWlkLnNwbGl0KCdAJylbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gdXVpZFRvVXJsLmdldChiYXNlVXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVybCkgcmVmZXJlbmNlZFVybHMuYWRkKHVybCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgX190eXBlX18gcmVmZXJlbmNlcyAoc2NyaXB0IGNvbXBvbmVudHMgdXNlIGNvbXByZXNzZWQgVVVJRHMpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWRzID0gdGhpcy5leHRyYWN0VHlwZUlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlSWQgb2YgdHlwZUlkcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGNvbXByZXNzZWRUb1VybC5nZXQodHlwZUlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodXJsKSByZWZlcmVuY2VkVXJscy5hZGQodXJsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDM6IEZpbmQgdW51c2VkIGFzc2V0cywgc2VwYXJhdGUgc2NyaXB0cyBmcm9tIG90aGVyIGFzc2V0c1xyXG4gICAgICAgICAgICBjb25zdCBzY3JpcHRFeHRzID0gWycudHMnLCAnLmpzJ107XHJcbiAgICAgICAgICAgIGNvbnN0IGFsbFVudXNlZEFzc2V0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgYWxsVW51c2VkU2NyaXB0czogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYWxsQXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlZmVyZW5jZWRVcmxzLmhhcyhhc3NldC51cmwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmlwdEV4dHMuaW5jbHVkZXMoYXNzZXQuZXh0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxVbnVzZWRTY3JpcHRzLnB1c2goYXNzZXQudXJsKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxVbnVzZWRBc3NldHMucHVzaChhc3NldC51cmwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdG90YWxVbnVzZWRBc3NldHMgPSBhbGxVbnVzZWRBc3NldHMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCB0b3RhbFVudXNlZFNjcmlwdHMgPSBhbGxVbnVzZWRTY3JpcHRzLmxlbmd0aDtcclxuICAgICAgICAgICAgY29uc3QgbGltaXQgPSBNYXRoLm1heCgxLCBtYXhSZXN1bHRzKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChncm91cEJ5Rm9sZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBHcm91cCBieSBwYXJlbnQgZm9sZGVyIHdpdGggY291bnRzXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBhc3NldHM6IG51bWJlcjsgc2NyaXB0czogbnVtYmVyOyBzYW1wbGVzOiBzdHJpbmdbXSB9PigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdXJsIG9mIGFsbFVudXNlZEFzc2V0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxhc3RJbmRleE9mKCcvJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gZm9sZGVyTWFwLmdldChmb2xkZXIpIHx8IHsgYXNzZXRzOiAwLCBzY3JpcHRzOiAwLCBzYW1wbGVzOiBbXSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LmFzc2V0cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeS5zYW1wbGVzLmxlbmd0aCA8IDMpIGVudHJ5LnNhbXBsZXMucHVzaCh1cmwuc3Vic3RyaW5nKHVybC5sYXN0SW5kZXhPZignLycpICsgMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlck1hcC5zZXQoZm9sZGVyLCBlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBhbGxVbnVzZWRTY3JpcHRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdXJsLnN1YnN0cmluZygwLCB1cmwubGFzdEluZGV4T2YoJy8nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBmb2xkZXJNYXAuZ2V0KGZvbGRlcikgfHwgeyBhc3NldHM6IDAsIHNjcmlwdHM6IDAsIHNhbXBsZXM6IFtdIH07XHJcbiAgICAgICAgICAgICAgICAgICAgZW50cnkuc2NyaXB0cysrO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlck1hcC5zZXQoZm9sZGVyLCBlbnRyeSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gU29ydCBieSB0b3RhbCBjb3VudCBkZXNjZW5kaW5nLCBsaW1pdCByZXN1bHRzXHJcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJzID0gQXJyYXkuZnJvbShmb2xkZXJNYXAuZW50cmllcygpKVxyXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKFtmb2xkZXIsIGRhdGFdKSA9PiAoeyBmb2xkZXIsIC4uLmRhdGEsIHRvdGFsOiBkYXRhLmFzc2V0cyArIGRhdGEuc2NyaXB0cyB9KSlcclxuICAgICAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYi50b3RhbCAtIGEudG90YWwpXHJcbiAgICAgICAgICAgICAgICAgICAgLnNsaWNlKDAsIGxpbWl0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiBhbGxBc3NldHMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VkQ291bnQ6IHJlZmVyZW5jZWRVcmxzLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0cyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdW51c2VkQXNzZXRDb3VudDogdG90YWxVbnVzZWRBc3NldHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZFNjcmlwdENvdW50OiB0b3RhbFVudXNlZFNjcmlwdHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcnNTaG93bjogZm9sZGVycy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsRm9sZGVyczogZm9sZGVyTWFwLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke3RvdGFsVW51c2VkQXNzZXRzICsgdG90YWxVbnVzZWRTY3JpcHRzfSB1bnVzZWQgaXRlbXMgYWNyb3NzICR7Zm9sZGVyTWFwLnNpemV9IGZvbGRlcnNgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RlOiAnQXNzZXRzIGxvYWRlZCBkeW5hbWljYWxseSAoZS5nLiByZXNvdXJjZXMubG9hZCkgbWF5IHN0aWxsIGFwcGVhciB1bnVzZWQuIFJldmlldyBiZWZvcmUgZGVsZXRpbmcuJ1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZsYXQgbGlzdCB3aXRoIG1heFJlc3VsdHMgbGltaXRcclxuICAgICAgICAgICAgY29uc3QgdW51c2VkQXNzZXRzID0gYWxsVW51c2VkQXNzZXRzLnNvcnQoKS5zbGljZSgwLCBsaW1pdCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVudXNlZFNjcmlwdHMgPSBhbGxVbnVzZWRTY3JpcHRzLnNvcnQoKS5zbGljZSgwLCBsaW1pdCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBkaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFsbEFzc2V0cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVmZXJlbmNlZENvdW50OiByZWZlcmVuY2VkVXJscy5zaXplLFxyXG4gICAgICAgICAgICAgICAgICAgIHVudXNlZENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0cyxcclxuICAgICAgICAgICAgICAgICAgICB1bnVzZWRBc3NldHMsXHJcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkU2NyaXB0cyxcclxuICAgICAgICAgICAgICAgICAgICBzaG93aW5nOiB1bnVzZWRBc3NldHMubGVuZ3RoICsgdW51c2VkU2NyaXB0cy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRBc3NldHMsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRTY3JpcHRzLFxyXG4gICAgICAgICAgICAgICAgICAgIHRydW5jYXRlZDogdG90YWxVbnVzZWRBc3NldHMgPiBsaW1pdCB8fCB0b3RhbFVudXNlZFNjcmlwdHMgPiBsaW1pdCxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHt0b3RhbFVudXNlZEFzc2V0c30gdW51c2VkIGFzc2V0cyBhbmQgJHt0b3RhbFVudXNlZFNjcmlwdHN9IHVudXNlZCBzY3JpcHRzIChzaG93aW5nIHVwIHRvICR7bGltaXR9IGVhY2gpYCxcclxuICAgICAgICAgICAgICAgICAgICBub3RlOiAnQXNzZXRzIGxvYWRlZCBkeW5hbWljYWxseSAoZS5nLiByZXNvdXJjZXMubG9hZCkgbWF5IHN0aWxsIGFwcGVhciB1bnVzZWQuIFVzZSBncm91cEJ5Rm9sZGVyOnRydWUgZm9yIG92ZXJ2aWV3LiBSZXZpZXcgYmVmb3JlIGRlbGV0aW5nLidcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbnVzZWQgYXNzZXQgZGV0ZWN0aW9uIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY29tcHJlc3NUZXh0dXJlcyhkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGZvcm1hdDogc3RyaW5nID0gJ2F1dG8nLCBxdWFsaXR5OiBudW1iZXIgPSAwLjgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAvLyBOb3RlOiBUZXh0dXJlIGNvbXByZXNzaW9uIHdvdWxkIHJlcXVpcmUgaW1hZ2UgcHJvY2Vzc2luZyBBUElzXHJcbiAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogJ1RleHR1cmUgY29tcHJlc3Npb24gcmVxdWlyZXMgaW1hZ2UgcHJvY2Vzc2luZyBjYXBhYmlsaXRpZXMgbm90IGF2YWlsYWJsZSBpbiBjdXJyZW50IENvY29zIENyZWF0b3IgTUNQIGltcGxlbWVudGF0aW9uLiBVc2UgdGhlIEVkaXRvclxcJ3MgYnVpbHQtaW4gdGV4dHVyZSBjb21wcmVzc2lvbiBzZXR0aW5ncyBvciBleHRlcm5hbCB0b29scy4nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhwb3J0QXNzZXRNYW5pZmVzdChkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGZvcm1hdDogc3RyaW5nID0gJ2pzb24nLCBpbmNsdWRlTWV0YWRhdGE6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IGAke2RpcmVjdG9yeX0vKiovKmAgfSk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBtYW5pZmVzdDogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtYW5pZmVzdEVudHJ5OiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0LnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogKGFzc2V0IGFzIGFueSkuc2l6ZSB8fCAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzRGlyZWN0b3J5OiBhc3NldC5pc0RpcmVjdG9yeSB8fCBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZU1ldGFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFzc2V0LnVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8gJiYgYXNzZXRJbmZvLm1ldGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0RW50cnkubWV0YSA9IGFzc2V0SW5mby5tZXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgbWV0YWRhdGEgaWYgbm90IGF2YWlsYWJsZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBtYW5pZmVzdC5wdXNoKG1hbmlmZXN0RW50cnkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZXhwb3J0RGF0YTogc3RyaW5nO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGZvcm1hdCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnanNvbic6XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2Nzdic6XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IHRoaXMuY29udmVydFRvQ1NWKG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3htbCc6XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IHRoaXMuY29udmVydFRvWE1MKG1hbmlmZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YSA9IEpTT04uc3RyaW5naWZ5KG1hbmlmZXN0LCBudWxsLCAyKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiBkaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRDb3VudDogbWFuaWZlc3QubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVNZXRhZGF0YTogaW5jbHVkZU1ldGFkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0OiBleHBvcnREYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBc3NldCBtYW5pZmVzdCBleHBvcnRlZCB3aXRoICR7bWFuaWZlc3QubGVuZ3RofSBhc3NldHNgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvbnZlcnRUb0NTVihkYXRhOiBhbnlbXSk6IHN0cmluZyB7XHJcbiAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIGNvbnN0IGhlYWRlcnMgPSBPYmplY3Qua2V5cyhkYXRhWzBdKTtcclxuICAgICAgICBjb25zdCBjc3ZSb3dzID0gW2hlYWRlcnMuam9pbignLCcpXTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCByb3cgb2YgZGF0YSkge1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBoZWFkZXJzLm1hcChoZWFkZXIgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSByb3dbaGVhZGVyXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogU3RyaW5nKHZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGNzdlJvd3MucHVzaCh2YWx1ZXMuam9pbignLCcpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjc3ZSb3dzLmpvaW4oJ1xcbicpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgY29udmVydFRvWE1MKGRhdGE6IGFueVtdKTogc3RyaW5nIHtcclxuICAgICAgICBsZXQgeG1sID0gJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/Plxcbjxhc3NldHM+XFxuJztcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGRhdGEpIHtcclxuICAgICAgICAgICAgeG1sICs9ICcgIDxhc3NldD5cXG4nO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhpdGVtKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeG1sVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID9cclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOlxyXG4gICAgICAgICAgICAgICAgICAgIFN0cmluZyh2YWx1ZSkucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xyXG4gICAgICAgICAgICAgICAgeG1sICs9IGAgICAgPCR7a2V5fT4ke3htbFZhbHVlfTwvJHtrZXl9PlxcbmA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgeG1sICs9ICcgIDwvYXNzZXQ+XFxuJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHhtbCArPSAnPC9hc3NldHM+JztcclxuICAgICAgICByZXR1cm4geG1sO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLSBIZWxwZXIgbWV0aG9kcyBmb3IgZGVwZW5kZW5jeSBhbmQgdW51c2VkIGFzc2V0IGFuYWx5c2lzIC0tLVxyXG5cclxuICAgIHByaXZhdGUgZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IHV1aWRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSAvXCJfX3V1aWRfX1wiXFxzKjpcXHMqXCIoW15cIl0rKVwiL2c7XHJcbiAgICAgICAgbGV0IG1hdGNoO1xyXG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHV1aWRzLnB1c2gobWF0Y2hbMV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdXVpZHM7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb2xsZWN0U3ViVXVpZHMoc3ViTWV0YXM6IGFueSwgdXVpZHM6IFNldDxzdHJpbmc+KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKCFzdWJNZXRhcyB8fCB0eXBlb2Ygc3ViTWV0YXMgIT09ICdvYmplY3QnKSByZXR1cm47XHJcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3ViTWV0YXMpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN1YiA9IHN1Yk1ldGFzW2tleV07XHJcbiAgICAgICAgICAgIGlmIChzdWI/LnV1aWQpIHV1aWRzLmFkZChzdWIudXVpZCk7XHJcbiAgICAgICAgICAgIGlmIChzdWI/LnN1Yk1ldGFzKSB0aGlzLmNvbGxlY3RTdWJVdWlkcyhzdWIuc3ViTWV0YXMsIHV1aWRzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSB3YWxrRGlyZWN0b3J5KGRpcjogc3RyaW5nLCBjYWxsYmFjazogKGZpbGVQYXRoOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcclxuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBlbnRyeS5uYW1lKTtcclxuICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSB8fCBlbnRyeS5uYW1lID09PSAnbm9kZV9tb2R1bGVzJykgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoZnVsbFBhdGgsIGNhbGxiYWNrKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHdhbGtTZXJpYWxpemVkRmlsZXMoZGlyOiBzdHJpbmcsIGNhbGxiYWNrOiAoZmlsZVBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9ucyA9IFsnLnNjZW5lJywgJy5wcmVmYWInLCAnLmFuaW0nLCAnLm10bCcsICcuZWZmZWN0J107XHJcbiAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KGRpciwgKGZpbGVQYXRoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlUGF0aCkudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgaWYgKCFleHRlbnNpb25zLmluY2x1ZGVzKGV4dCkpIHJldHVybjtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmaWxlUGF0aCwgY29udGVudCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBza2lwIGJpbmFyeSBvciB1bnJlYWRhYmxlIGZpbGVzICovIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xyXG4gICAgICAgIGNvbnN0IHR5cGVJZHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IC9cIl9fdHlwZV9fXCJcXHMqOlxccypcIihbXlwiXSspXCIvZztcclxuICAgICAgICBsZXQgbWF0Y2g7XHJcbiAgICAgICAgd2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gU2tpcCBidWlsdC1pbiBDb2NvcyB0eXBlcyAoY2MuTm9kZSwgY2MuU3ByaXRlLCBldGMuKVxyXG4gICAgICAgICAgICBpZiAoIW1hdGNoWzFdLnN0YXJ0c1dpdGgoJ2NjLicpKSB7XHJcbiAgICAgICAgICAgICAgICB0eXBlSWRzLnB1c2gobWF0Y2hbMV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0eXBlSWRzO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29tcHJlc3MgYSBzdGFuZGFyZCBVVUlEIHRvIENvY29zIENyZWF0b3IncyAyMi1jaGFyIGZvcm1hdCB1c2VkIGluIF9fdHlwZV9fLlxyXG4gICAgICogRm9ybWF0OiBmaXJzdCAyIGhleCBjaGFycyBrZXB0ICsgMTAgcGFpcnMgb2YgYmFzZTY0IGNoYXJzIChlbmNvZGluZyByZW1haW5pbmcgMzAgaGV4IGNoYXJzKS5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBjb21wcmVzc1V1aWQodXVpZDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBCQVNFNjRfS0VZUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcclxuICAgICAgICBjb25zdCBoZXggPSB1dWlkLnJlcGxhY2UoLy0vZywgJycpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgaWYgKGhleC5sZW5ndGggIT09IDMyKSByZXR1cm4gdXVpZDtcclxuXHJcbiAgICAgICAgbGV0IHJlc3VsdCA9IGhleFswXSArIGhleFsxXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8IDMyOyBpICs9IDMpIHtcclxuICAgICAgICAgICAgY29uc3QgdmFsID0gKHBhcnNlSW50KGhleFtpXSwgMTYpIDw8IDgpIHwgKHBhcnNlSW50KGhleFtpICsgMV0sIDE2KSA8PCA0KSB8IHBhcnNlSW50KGhleFtpICsgMl0sIDE2KTtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IEJBU0U2NF9LRVlTW3ZhbCA+PiA2XTtcclxuICAgICAgICAgICAgcmVzdWx0ICs9IEJBU0U2NF9LRVlTW3ZhbCAmIDB4M0ZdO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0OyAvLyAyICsgMjAgPSAyMiBjaGFyc1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogRGVjb21wcmVzcyBhIDIyLWNoYXIgQ29jb3MgQ3JlYXRvciBjb21wcmVzc2VkIFVVSUQgYmFjayB0byBzdGFuZGFyZCBVVUlEIGZvcm1hdC5cclxuICAgICAqIFJldHVybnMgbnVsbCBpZiB0aGUgaW5wdXQgaXMgbm90IGEgdmFsaWQgY29tcHJlc3NlZCBVVUlELlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGRlY29tcHJlc3NVdWlkKGNvbXByZXNzZWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCAhPT0gMjIpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICBjb25zdCBCQVNFNjRfS0VZUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcclxuICAgICAgICBjb25zdCBCQVNFNjRfVkFMVUVTID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEJBU0U2NF9LRVlTLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIEJBU0U2NF9WQUxVRVMuc2V0KEJBU0U2NF9LRVlTW2ldLCBpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgSEVYID0gJzAxMjM0NTY3ODlhYmNkZWYnO1xyXG5cclxuICAgICAgICBsZXQgaGV4ID0gY29tcHJlc3NlZFswXSArIGNvbXByZXNzZWRbMV07XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPCAyMjsgaSArPSAyKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxocyA9IEJBU0U2NF9WQUxVRVMuZ2V0KGNvbXByZXNzZWRbaV0pO1xyXG4gICAgICAgICAgICBjb25zdCByaHMgPSBCQVNFNjRfVkFMVUVTLmdldChjb21wcmVzc2VkW2kgKyAxXSk7XHJcbiAgICAgICAgICAgIGlmIChsaHMgPT09IHVuZGVmaW5lZCB8fCByaHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGhleCArPSBIRVhbbGhzID4+IDJdO1xyXG4gICAgICAgICAgICBoZXggKz0gSEVYWygobGhzICYgMykgPDwgMikgfCAocmhzID4+IDQpXTtcclxuICAgICAgICAgICAgaGV4ICs9IEhFWFtyaHMgJiAweEZdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSW5zZXJ0IGRhc2hlczogeHh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHh4XHJcbiAgICAgICAgcmV0dXJuIGhleC5zbGljZSgwLCA4KSArICctJyArIGhleC5zbGljZSg4LCAxMikgKyAnLScgKyBoZXguc2xpY2UoMTIsIDE2KSArICctJyArIGhleC5zbGljZSgxNiwgMjApICsgJy0nICsgaGV4LnNsaWNlKDIwKTtcclxuICAgIH1cclxufVxyXG4iXX0=