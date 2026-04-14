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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxxTEFBcUw7Z0JBQ2xNLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLGtCQUFrQixFQUFFLFlBQVksQ0FBQzt5QkFDM0c7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5RUFBeUU7eUJBQ3pGO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMkRBQTJEO3lCQUMzRTt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlFQUFpRTt5QkFDakY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrREFBa0Q7NEJBQy9ELElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDOzRCQUM1QyxPQUFPLEVBQUUsY0FBYzt5QkFDMUI7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7NEJBQ3RELE9BQU8sRUFBRSxhQUFhO3lCQUN6Qjt3QkFDRCxrQkFBa0IsRUFBRTs0QkFDaEIsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDekIsV0FBVyxFQUFFLHdEQUF3RDs0QkFDckUsT0FBTyxFQUFFLEVBQUU7eUJBQ2Q7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw4RUFBOEU7NEJBQzNGLE9BQU8sRUFBRSxFQUFFO3lCQUNkO3dCQUNELGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUseUdBQXlHOzRCQUN0SCxPQUFPLEVBQUUsS0FBSzt5QkFDakI7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLFdBQVcsRUFBRSxzSkFBc0o7Z0JBQ25LLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUM7eUJBQy9HO3dCQUNELGVBQWUsRUFBRTs0QkFDYixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUseUNBQXlDO3lCQUN6RDt3QkFDRCxlQUFlLEVBQUU7NEJBQ2IsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHdDQUF3Qzt5QkFDeEQ7d0JBQ0QsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3pCLFdBQVcsRUFBRSxxRUFBcUU7NEJBQ2xGLE9BQU8sRUFBRSxFQUFFO3lCQUNkO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUsMENBQTBDOzRCQUN2RCxPQUFPLEVBQUUsS0FBSzt5QkFDakI7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSw0Q0FBNEM7NEJBQ3pELE9BQU8sRUFBRSxLQUFLO3lCQUNqQjt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs0QkFDekIsV0FBVyxFQUFFLGlEQUFpRDt5QkFDakU7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw0RkFBNEY7NEJBQ3pHLE9BQU8sRUFBRSxhQUFhO3lCQUN6Qjt3QkFDRCxNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLG9JQUFvSTs0QkFDakosT0FBTyxFQUFFLE1BQU07eUJBQ2xCO3dCQUNELE9BQU8sRUFBRTs0QkFDTCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsMERBQTBEOzRCQUN2RSxPQUFPLEVBQUUsR0FBRzs0QkFDWixPQUFPLEVBQUUsR0FBRzs0QkFDWixPQUFPLEVBQUUsR0FBRzt5QkFDZjt3QkFDRCxlQUFlLEVBQUU7NEJBQ2IsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLG1EQUFtRDs0QkFDaEUsT0FBTyxFQUFFLElBQUk7eUJBQ2hCO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQVM7UUFDckMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNmLEtBQUssZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDbEIsS0FBSyxXQUFXO3dCQUNaLE9BQU8sTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNsRSxLQUFLLGNBQWM7d0JBQ2YsT0FBTyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JELEtBQUssZ0JBQWdCO3dCQUNqQixPQUFPLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQzFDLEtBQUssZUFBZTt3QkFDaEIsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3hELEtBQUssa0JBQWtCO3dCQUNuQixPQUFPLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO29CQUMzRSxLQUFLLFlBQVk7d0JBQ2IsT0FBTyxNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ3BIO3dCQUNJLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RSxDQUFDO1lBQ0wsQ0FBQztZQUNELEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQztnQkFDakIsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2xCLEtBQUssUUFBUTt3QkFDVCxPQUFPLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM5QyxLQUFLLFFBQVE7d0JBQ1QsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ25ELEtBQUsscUJBQXFCO3dCQUN0QixPQUFPLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztvQkFDOUQsS0FBSyxtQkFBbUI7d0JBQ3BCLE9BQU8sTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbEYsS0FBSyxpQkFBaUI7d0JBQ2xCLE9BQU8sTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztvQkFDN0YsS0FBSyxpQkFBaUI7d0JBQ2xCLE9BQU8sTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztvQkFDN0M7d0JBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQzFFLENBQUM7WUFDTCxDQUFDO1lBQ0Q7Z0JBQ0ksTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBaUIsRUFBRSxPQUFlO1FBQzFELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQVcsRUFBRSxFQUFFO2dCQUMzRixPQUFPLENBQUM7b0JBQ0osT0FBTyxFQUFFLElBQUk7b0JBQ2IsSUFBSSxFQUFFO3dCQUNGLElBQUksRUFBRSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSTt3QkFDbEIsR0FBRyxFQUFFLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxHQUFHO3dCQUNoQixPQUFPLEVBQUUsK0JBQStCO3FCQUMzQztpQkFDSixDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtnQkFDcEIsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxLQUFLLENBQUMsb0JBQW9CLENBQUMsR0FBVztRQUMxQyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLHdCQUF3QixFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFlBQW9CLEVBQUUsRUFBRTtnQkFDNUYsT0FBTyxDQUFDO29CQUNKLE9BQU8sRUFBRSxJQUFJO29CQUNiLElBQUksRUFBRTt3QkFDRixXQUFXLEVBQUUsR0FBRzt3QkFDaEIsWUFBWSxFQUFFLFlBQVk7d0JBQzFCLE9BQU8sRUFBRSxZQUFZLEtBQUssR0FBRyxDQUFDLENBQUM7NEJBQzNCLGtCQUFrQixDQUFDLENBQUM7NEJBQ3BCLDZCQUE2QjtxQkFDcEM7aUJBQ0osQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQjtRQUMzQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQWMsRUFBRSxFQUFFO2dCQUN0RSxPQUFPLENBQUM7b0JBQ0osT0FBTyxFQUFFLElBQUk7b0JBQ2IsSUFBSSxFQUFFO3dCQUNGLEtBQUssRUFBRSxLQUFLO3dCQUNaLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyw2QkFBNkI7cUJBQzdFO2lCQUNKLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO2dCQUNwQixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxTQUFpQjtRQUM3QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNsRSxPQUFPLENBQUM7b0JBQ0osT0FBTyxFQUFFLElBQUk7b0JBQ2IsT0FBTyxFQUFFLG9DQUFvQztpQkFDaEQsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBVSxFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQVM7UUFDckMsSUFBSSxDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUU3QixJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLENBQUM7WUFDeEUsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FDcEMsSUFBSSxDQUFDLGVBQWUsRUFDcEIsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLEVBQ3JCLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxDQUMxQixDQUFDO1lBRUYsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFDO1lBQ2hDLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztZQUNyQixJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFFbkIsS0FBSyxNQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxDQUFDO29CQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sVUFBVSxHQUFHLEdBQUcsSUFBSSxDQUFDLGVBQWUsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFFekQsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUNsRSxRQUFRLEVBQUUsVUFBVSxFQUFFO3dCQUNsQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVMsSUFBSSxLQUFLO3dCQUNsQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxDQUFDO3FCQUNyQyxDQUFDLENBQUM7b0JBRVAsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDZixNQUFNLEVBQUUsUUFBUTt3QkFDaEIsTUFBTSxFQUFFLFVBQVU7d0JBQ2xCLE9BQU8sRUFBRSxJQUFJO3dCQUNiLElBQUksRUFBRSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSTtxQkFDckIsQ0FBQyxDQUFDO29CQUNILFlBQVksRUFBRSxDQUFDO2dCQUNuQixDQUFDO2dCQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7b0JBQ2hCLGFBQWEsQ0FBQyxJQUFJLENBQUM7d0JBQ2YsTUFBTSxFQUFFLFFBQVE7d0JBQ2hCLE9BQU8sRUFBRSxLQUFLO3dCQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTztxQkFDckIsQ0FBQyxDQUFDO29CQUNILFVBQVUsRUFBRSxDQUFDO2dCQUNqQixDQUFDO1lBQ0wsQ0FBQztZQUVELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFVBQVUsRUFBRSxLQUFLLENBQUMsTUFBTTtvQkFDeEIsWUFBWSxFQUFFLFlBQVk7b0JBQzFCLFVBQVUsRUFBRSxVQUFVO29CQUN0QixPQUFPLEVBQUUsYUFBYTtvQkFDdEIsT0FBTyxFQUFFLDJCQUEyQixZQUFZLGFBQWEsVUFBVSxTQUFTO2lCQUNuRjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8scUJBQXFCLENBQUMsT0FBZSxFQUFFLFVBQW9CLEVBQUUsU0FBa0I7UUFDbkYsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QixNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFFM0IsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFbkMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3BHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3pCLENBQUM7WUFDTCxDQUFDO2lCQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUN6QyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUMvRSxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBYztRQUMxQyxJQUFJLENBQUM7WUFDRCxNQUFNLGFBQWEsR0FBVSxFQUFFLENBQUM7WUFDaEMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBQ3JCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztZQUVuQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUM7b0JBQ0QsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUM5RCxhQUFhLENBQUMsSUFBSSxDQUFDO3dCQUNmLEdBQUcsRUFBRSxHQUFHO3dCQUNSLE9BQU8sRUFBRSxJQUFJO3FCQUNoQixDQUFDLENBQUM7b0JBQ0gsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLENBQUM7Z0JBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztvQkFDaEIsYUFBYSxDQUFDLElBQUksQ0FBQzt3QkFDZixHQUFHLEVBQUUsR0FBRzt3QkFDUixPQUFPLEVBQUUsS0FBSzt3QkFDZCxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU87cUJBQ3JCLENBQUMsQ0FBQztvQkFDSCxVQUFVLEVBQUUsQ0FBQztnQkFDakIsQ0FBQztZQUNMLENBQUM7WUFFRCxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRTtvQkFDRixXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU07b0JBQ3hCLFlBQVksRUFBRSxZQUFZO29CQUMxQixVQUFVLEVBQUUsVUFBVTtvQkFDdEIsT0FBTyxFQUFFLGFBQWE7b0JBQ3RCLE9BQU8sRUFBRSwyQkFBMkIsWUFBWSxhQUFhLFVBQVUsU0FBUztpQkFDbkY7YUFDSixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxZQUFvQixhQUFhO1FBQ25FLElBQUksQ0FBQztZQUNELDhCQUE4QjtZQUM5QixNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsR0FBRyxTQUFTLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFFMUcsTUFBTSxnQkFBZ0IsR0FBVSxFQUFFLENBQUM7WUFDbkMsTUFBTSxlQUFlLEdBQVUsRUFBRSxDQUFDO1lBRWxDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQztvQkFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzFGLElBQUksU0FBUyxFQUFFLENBQUM7d0JBQ1osZUFBZSxDQUFDLElBQUksQ0FBQzs0QkFDakIsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHOzRCQUNkLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTs0QkFDaEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO3lCQUNuQixDQUFDLENBQUM7b0JBQ1AsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ1gsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO3dCQUNsQixHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUc7d0JBQ2QsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO3dCQUNoQixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7d0JBQ2hCLEtBQUssRUFBRyxHQUFhLENBQUMsT0FBTztxQkFDaEMsQ0FBQyxDQUFDO2dCQUNQLENBQUM7WUFDTCxDQUFDO1lBRUQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUU7b0JBQ0YsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTTtvQkFDMUIsZUFBZSxFQUFFLGVBQWUsQ0FBQyxNQUFNO29CQUN2QyxnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO29CQUN6QyxZQUFZLEVBQUUsZ0JBQWdCO29CQUM5QixPQUFPLEVBQUUseUJBQXlCLGdCQUFnQixDQUFDLE1BQU0sMEJBQTBCO2lCQUN0RjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLG9CQUFvQjs7UUFDOUIsSUFBSSxDQUFDO1lBQ0QsaURBQWlEO1lBQ2pELE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLFFBQVE7Z0JBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLENBQUM7WUFFbkYsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1lBQy9CLE1BQU0sS0FBSyxHQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEMsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN0QixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzNCLElBQUksSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUk7b0JBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLElBQUksSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVE7b0JBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFFdkMsaUVBQWlFO1lBQ2pFLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztZQUN0QixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBNkYsQ0FBQztZQUV4SCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztnQkFDakQsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUM3QixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDM0YsQ0FBQztnQkFDRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUN0QyxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLElBQUksQ0FBQyxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxTQUFTLENBQUE7d0JBQUUsU0FBUztvQkFDbkMsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxQixNQUFNLFFBQVEsR0FBRyxNQUFBLE1BQUEsTUFBQSxRQUFRLENBQUMsSUFBSSwwQ0FBRSxLQUFLLG1DQUFJLFFBQVEsQ0FBQyxJQUFJLG1DQUFJLFFBQVEsQ0FBQztvQkFDbkUsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLENBQUMsU0FBa0IsRUFBRSxDQUFDO3dCQUM3QyxNQUFNLFFBQVEsR0FBSSxJQUFZLENBQUMsUUFBUSxJQUFLLElBQVksQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDO3dCQUMzRSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztvQkFDeEYsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVELG9FQUFvRTtZQUNwRSxLQUFLLE1BQU0sSUFBSSxJQUFJLFdBQVc7Z0JBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV4RCwyRUFBMkU7WUFDM0UsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNsRCxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFDdkIsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUV2QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ3ZELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUM3QixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ2IsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQztxQkFDdkQsSUFBSSxDQUFDLENBQUMsSUFBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztxQkFDL0MsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FDOUMsQ0FDSixDQUFDO2dCQUNGLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxPQUFPLEVBQUUsQ0FBQztvQkFDckMsSUFBSSxDQUFDLE1BQU07d0JBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDeEMsQ0FBQztZQUNMLENBQUM7WUFFRCx1QkFBdUI7WUFDdkIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7O2dCQUFDLE9BQUEsQ0FBQztvQkFDdEQsV0FBVyxFQUFFLElBQUk7b0JBQ2pCLFlBQVksRUFBRSxNQUFBLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFJLEVBQUU7aUJBQzNDLENBQUMsQ0FBQTthQUFBLENBQUMsQ0FBQztZQUVKLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFVBQVUsRUFBRSxTQUFTLENBQUMsTUFBTTtvQkFDNUIsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLE1BQU07b0JBQ3hDLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSTtvQkFDL0IsV0FBVztvQkFDWCxPQUFPLEVBQUUsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDO3dCQUM1QixDQUFDLENBQUMsNENBQTRDO3dCQUM5QyxDQUFDLENBQUMsU0FBUyxZQUFZLENBQUMsSUFBSSxzQ0FBc0MsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsdUJBQXVCO2lCQUMxSjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sZUFBZSxDQUNuQixJQUFTLEVBQ1QsUUFBZ0IsRUFDaEIsUUFBZ0IsRUFDaEIsUUFBZ0IsRUFDaEIsVUFBMEc7UUFFMUcsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFakosTUFBTSxXQUFXLEdBQUcsQ0FBQyxHQUFRLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO1lBQy9DLElBQUksQ0FBQyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtnQkFBRSxPQUFPO1lBQzVDLCtDQUErQztZQUMvQyxJQUFJLE9BQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzdELFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNqQyxPQUFPO1lBQ1gsQ0FBQztZQUNELHFEQUFxRDtZQUNyRCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDdEMsSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztvQkFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ2hHLE9BQU87WUFDWCxDQUFDO1lBQ0QsZ0JBQWdCO1lBQ2hCLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNyQixLQUFLLE1BQU0sSUFBSSxJQUFJLEdBQUc7b0JBQUUsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFDbkQsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLFlBQW9CLGNBQWM7UUFDcEYsSUFBSSxDQUFDO1lBQ0QsNkJBQTZCO1lBQzdCLElBQUksU0FBaUIsQ0FBQztZQUN0QixJQUFJLFFBQWdCLENBQUM7WUFFckIsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLFFBQVEsR0FBRyxTQUFTLENBQUM7Z0JBQ3JCLE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUNyRixJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxDQUFBO29CQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsU0FBUyxFQUFFLEVBQUUsQ0FBQztnQkFDbkYsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDMUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFNBQVMsR0FBRyxTQUFTLENBQUM7Z0JBQ3RCLE1BQU0sR0FBRyxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDN0UsSUFBSSxDQUFDLEdBQUc7b0JBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLG9CQUFvQixTQUFTLEVBQUUsRUFBRSxDQUFDO2dCQUM1RSxRQUFRLEdBQUcsR0FBRyxDQUFDO1lBQ25CLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztZQUN4QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVwRCxrRUFBa0U7WUFDbEUsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQztnQkFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2hGLElBQUksTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxRQUFRLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQztvQkFDbEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7d0JBQzFCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDM0QsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUN2RCxDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDO1lBQUMsUUFBUSw2QkFBNkIsSUFBL0IsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFFekMsTUFBTSxZQUFZLEdBQXlDLEVBQUUsQ0FBQztZQUM5RCxNQUFNLFVBQVUsR0FBMkIsRUFBRSxDQUFDO1lBRTlDLDJFQUEyRTtZQUMzRSxJQUFJLFNBQVMsS0FBSyxjQUFjLElBQUksU0FBUyxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN2RCxJQUFJLENBQUM7b0JBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUNoRixJQUFJLE1BQU0sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7d0JBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO3dCQUNoRCxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO3dCQUUvQiw4QkFBOEI7d0JBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDdkQsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQzs0QkFDekIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbkMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO2dDQUFFLFNBQVM7NEJBQ2hFLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBRW5CLElBQUksQ0FBQztnQ0FDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0NBQy9FLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxNQUFNLElBQUksWUFBWSxFQUFFLENBQUMsQ0FBQzs0QkFDdkUsQ0FBQzs0QkFBQyxXQUFNLENBQUM7Z0NBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7NEJBQzdELENBQUM7d0JBQ0wsQ0FBQzt3QkFFRCw4RUFBOEU7d0JBQzlFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDeEQsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQzs0QkFDM0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQzs0QkFDakQsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztnQ0FBRSxTQUFTOzRCQUN0RCxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDOzRCQUN2QixJQUFJLENBQUM7Z0NBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO2dDQUNuRixJQUFJLE1BQU0sRUFBRSxDQUFDO29DQUNULFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dDQUMzRCxDQUFDOzRCQUNMLENBQUM7NEJBQUMsUUFBUSw2QkFBNkIsSUFBL0IsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUM7d0JBQzdDLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLFFBQVEsd0JBQXdCLElBQTFCLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3hDLENBQUM7WUFFRCxzRUFBc0U7WUFDdEUsSUFBSSxTQUFTLEtBQUssWUFBWSxJQUFJLFNBQVMsS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDckQsZ0ZBQWdGO2dCQUNoRixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBUyxhQUFhLENBQUMsQ0FBQztnQkFDckQsS0FBSyxNQUFNLEdBQUcsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDMUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLEVBQUU7d0JBQUUsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDaEUsQ0FBQztnQkFFRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUN2RCxLQUFLLE1BQU0sR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO3dCQUM5QixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDeEIsTUFBTSxPQUFPLEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDckUsSUFBSSxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7Z0NBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQzs0QkFDdEMsQ0FBQzs0QkFDRCxNQUFNO3dCQUNWLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRTtvQkFDRixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUU7b0JBQzlFLFlBQVk7b0JBQ1osVUFBVTtvQkFDVixpQkFBaUIsRUFBRSxZQUFZLENBQUMsTUFBTTtvQkFDdEMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxNQUFNO29CQUNsQyxPQUFPLEVBQUUsU0FBUyxZQUFZLENBQUMsTUFBTSxxQkFBcUIsVUFBVSxDQUFDLE1BQU0sbUJBQW1CLFFBQVEsRUFBRTtpQkFDM0c7YUFDSixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLCtCQUErQixHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztRQUNuRixDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxlQUFlLENBQUMsWUFBb0IsYUFBYSxFQUFFLHFCQUErQixFQUFFLEVBQUUsYUFBcUIsRUFBRSxFQUFFLGdCQUF5QixLQUFLO1FBQ3ZKLElBQUksQ0FBQztZQUNELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFFeEUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixTQUFTLEVBQUUsRUFBRSxDQUFDO1lBQzFFLENBQUM7WUFFRCx1REFBdUQ7WUFDdkQsMkVBQTJFO1lBQzNFLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQzVDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1lBQ2xELE1BQU0sU0FBUyxHQUF3QyxFQUFFLENBQUM7WUFFMUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUFFLE9BQU87Z0JBRXhDLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7Z0JBQ2pFLE1BQU0sUUFBUSxHQUFHLE9BQU8sR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBRXpFLDRCQUE0QjtnQkFDNUIsS0FBSyxNQUFNLElBQUksSUFBSSxrQkFBa0IsRUFBRSxDQUFDO29CQUNwQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO3dCQUFFLE9BQU87Z0JBQzFDLENBQUM7Z0JBRUQsdURBQXVEO2dCQUN2RCxJQUFJLENBQUM7b0JBQ0QsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLEVBQUU7d0JBQUUsT0FBTztnQkFDdEYsQ0FBQztnQkFBQyxXQUFNLENBQUM7b0JBQUMsT0FBTztnQkFBQyxDQUFDO2dCQUVuQixJQUFJLENBQUM7b0JBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUVwRCxTQUFTLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUV2Qyw2QkFBNkI7b0JBQzdCLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNaLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2hELElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxFQUFFOzRCQUFFLGVBQWUsQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUM1RSxDQUFDO29CQUVELDBDQUEwQztvQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztvQkFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO29CQUM5QyxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO3dCQUM3QixTQUFTLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDakMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDOUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLEVBQUU7NEJBQUUsZUFBZSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7b0JBQzVFLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQyxRQUFRLGlDQUFpQyxJQUFuQyxDQUFDLENBQUMsaUNBQWlDLENBQUMsQ0FBQztZQUNqRCxDQUFDLENBQUMsQ0FBQztZQUVILHdGQUF3RjtZQUN4RiwyRUFBMkU7WUFDM0UsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUV6QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUN4RCwrREFBK0Q7Z0JBQy9ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDcEQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDcEMsSUFBSSxHQUFHO3dCQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7Z0JBRUQscUVBQXFFO2dCQUNyRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFLENBQUM7b0JBQzNCLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hDLElBQUksR0FBRzt3QkFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxpRUFBaUU7WUFDakUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEMsTUFBTSxlQUFlLEdBQWEsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sZ0JBQWdCLEdBQWEsRUFBRSxDQUFDO1lBRXRDLEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQzVCLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNqQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQ2pDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JDLENBQUM7eUJBQU0sQ0FBQzt3QkFDSixlQUFlLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEMsQ0FBQztnQkFDTCxDQUFDO1lBQ0wsQ0FBQztZQUVELE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQztZQUNqRCxNQUFNLGtCQUFrQixHQUFHLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUV0QyxJQUFJLGFBQWEsRUFBRSxDQUFDO2dCQUNoQixxQ0FBcUM7Z0JBQ3JDLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFrRSxDQUFDO2dCQUU1RixLQUFLLE1BQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO29CQUNoQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDO29CQUM5RSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2YsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDO3dCQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUMxRixTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDakMsQ0FBQztnQkFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7b0JBQ2pDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDdEQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7b0JBQzlFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDaEIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7Z0JBRUQsZ0RBQWdEO2dCQUNoRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDMUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLCtCQUFHLE1BQU0sSUFBSyxJQUFJLEtBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBRyxDQUFDO3FCQUNqRixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7cUJBQ2pDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRXJCLE9BQU87b0JBQ0gsT0FBTyxFQUFFLElBQUk7b0JBQ2IsSUFBSSxFQUFFO3dCQUNGLFNBQVM7d0JBQ1QsV0FBVyxFQUFFLFNBQVMsQ0FBQyxNQUFNO3dCQUM3QixlQUFlLEVBQUUsY0FBYyxDQUFDLElBQUk7d0JBQ3BDLFdBQVcsRUFBRSxpQkFBaUIsR0FBRyxrQkFBa0I7d0JBQ25ELGdCQUFnQixFQUFFLGlCQUFpQjt3QkFDbkMsaUJBQWlCLEVBQUUsa0JBQWtCO3dCQUNyQyxPQUFPO3dCQUNQLFlBQVksRUFBRSxPQUFPLENBQUMsTUFBTTt3QkFDNUIsWUFBWSxFQUFFLFNBQVMsQ0FBQyxJQUFJO3dCQUM1QixPQUFPLEVBQUUsU0FBUyxpQkFBaUIsR0FBRyxrQkFBa0Isd0JBQXdCLFNBQVMsQ0FBQyxJQUFJLFVBQVU7d0JBQ3hHLElBQUksRUFBRSxrR0FBa0c7cUJBQzNHO2lCQUNKLENBQUM7WUFDTixDQUFDO1lBRUQsa0NBQWtDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVELE1BQU0sYUFBYSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFFOUQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUU7b0JBQ0YsU0FBUztvQkFDVCxXQUFXLEVBQUUsU0FBUyxDQUFDLE1BQU07b0JBQzdCLGVBQWUsRUFBRSxjQUFjLENBQUMsSUFBSTtvQkFDcEMsV0FBVyxFQUFFLGlCQUFpQixHQUFHLGtCQUFrQjtvQkFDbkQsWUFBWTtvQkFDWixhQUFhO29CQUNiLE9BQU8sRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLGFBQWEsQ0FBQyxNQUFNO29CQUNuRCxpQkFBaUI7b0JBQ2pCLGtCQUFrQjtvQkFDbEIsU0FBUyxFQUFFLGlCQUFpQixHQUFHLEtBQUssSUFBSSxrQkFBa0IsR0FBRyxLQUFLO29CQUNsRSxPQUFPLEVBQUUsU0FBUyxpQkFBaUIsc0JBQXNCLGtCQUFrQixrQ0FBa0MsS0FBSyxRQUFRO29CQUMxSCxJQUFJLEVBQUUsdUlBQXVJO2lCQUNoSjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsa0NBQWtDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3RGLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQixDQUFDLFlBQW9CLGFBQWEsRUFBRSxTQUFpQixNQUFNLEVBQUUsVUFBa0IsR0FBRztRQUM1RyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsZ0VBQWdFO1lBQ2hFLE9BQU8sQ0FBQztnQkFDSixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsa01BQWtNO2FBQzVNLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxZQUFvQixhQUFhLEVBQUUsU0FBaUIsTUFBTSxFQUFFLGtCQUEyQixJQUFJO1FBQ3pILElBQUksQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLFNBQVMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUUxRyxNQUFNLFFBQVEsR0FBVSxFQUFFLENBQUM7WUFFM0IsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxhQUFhLEdBQVE7b0JBQ3ZCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO29CQUNkLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO29CQUNoQixJQUFJLEVBQUcsS0FBYSxDQUFDLElBQUksSUFBSSxDQUFDO29CQUM5QixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVcsSUFBSSxLQUFLO2lCQUMxQyxDQUFDO2dCQUVGLElBQUksZUFBZSxFQUFFLENBQUM7b0JBQ2xCLElBQUksQ0FBQzt3QkFDRCxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzFGLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQzs0QkFDOUIsYUFBYSxDQUFDLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO3dCQUN4QyxDQUFDO29CQUNMLENBQUM7b0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDWCxpQ0FBaUM7b0JBQ3JDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFFRCxJQUFJLFVBQWtCLENBQUM7WUFDdkIsUUFBUSxNQUFNLEVBQUUsQ0FBQztnQkFDYixLQUFLLE1BQU07b0JBQ1AsVUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDL0MsTUFBTTtnQkFDVixLQUFLLEtBQUs7b0JBQ04sVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3pDLE1BQU07Z0JBQ1YsS0FBSyxLQUFLO29CQUNOLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN6QyxNQUFNO2dCQUNWO29CQUNJLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkQsQ0FBQztZQUVELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNLEVBQUUsTUFBTTtvQkFDZCxVQUFVLEVBQUUsUUFBUSxDQUFDLE1BQU07b0JBQzNCLGVBQWUsRUFBRSxlQUFlO29CQUNoQyxRQUFRLEVBQUUsVUFBVTtvQkFDcEIsT0FBTyxFQUFFLGdDQUFnQyxRQUFRLENBQUMsTUFBTSxTQUFTO2lCQUNwRTthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sWUFBWSxDQUFDLElBQVc7UUFDNUIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLEVBQUUsQ0FBQztRQUVqQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRXBDLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDckIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtnQkFDaEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQixPQUFPLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdFLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRU8sWUFBWSxDQUFDLElBQVc7UUFDNUIsSUFBSSxHQUFHLEdBQUcsb0RBQW9ELENBQUM7UUFFL0QsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN0QixHQUFHLElBQUksYUFBYSxDQUFDO1lBQ3JCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLE1BQU0sUUFBUSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDO29CQUN4QyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDckYsR0FBRyxJQUFJLFFBQVEsR0FBRyxJQUFJLFFBQVEsS0FBSyxHQUFHLEtBQUssQ0FBQztZQUNoRCxDQUFDO1lBQ0QsR0FBRyxJQUFJLGNBQWMsQ0FBQztRQUMxQixDQUFDO1FBRUQsR0FBRyxJQUFJLFdBQVcsQ0FBQztRQUNuQixPQUFPLEdBQUcsQ0FBQztJQUNmLENBQUM7SUFFRCxrRUFBa0U7SUFFMUQsdUJBQXVCLENBQUMsT0FBZTtRQUMzQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFDM0IsTUFBTSxPQUFPLEdBQUcsNkJBQTZCLENBQUM7UUFDOUMsSUFBSSxLQUFLLENBQUM7UUFDVixPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM5QyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0lBRU8sZUFBZSxDQUFDLFFBQWEsRUFBRSxLQUFrQjtRQUNyRCxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVE7WUFBRSxPQUFPO1FBQ3RELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQixJQUFJLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxJQUFJO2dCQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25DLElBQUksR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLFFBQVE7Z0JBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pFLENBQUM7SUFDTCxDQUFDO0lBRU8sYUFBYSxDQUFDLEdBQVcsRUFBRSxRQUFvQztRQUNuRSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLGNBQWM7b0JBQUUsU0FBUztnQkFDMUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDM0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN2QixDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxHQUFXLEVBQUUsUUFBcUQ7UUFDMUYsTUFBTSxVQUFVLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pELElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFBRSxPQUFPO1lBQ3RDLElBQUksQ0FBQztnQkFDRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDbEQsUUFBUSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNoQyxDQUFDO1lBQUMsUUFBUSxxQ0FBcUMsSUFBdkMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8seUJBQXlCLENBQUMsT0FBZTtRQUM3QyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsTUFBTSxPQUFPLEdBQUcsNkJBQTZCLENBQUM7UUFDOUMsSUFBSSxLQUFLLENBQUM7UUFDVixPQUFPLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM5Qyx1REFBdUQ7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixDQUFDO1FBQ0wsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7O09BR0c7SUFDSyxZQUFZLENBQUMsSUFBWTtRQUM3QixNQUFNLFdBQVcsR0FBRyxrRUFBa0UsQ0FBQztRQUN2RixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNqRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDO1FBRW5DLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0IsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDckcsTUFBTSxJQUFJLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEMsTUFBTSxJQUFJLFdBQVcsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDLENBQUMsb0JBQW9CO0lBQ3ZDLENBQUM7SUFFRDs7O09BR0c7SUFDSyxjQUFjLENBQUMsVUFBa0I7UUFDckMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLEVBQUU7WUFBRSxPQUFPLElBQUksQ0FBQztRQUUxQyxNQUFNLFdBQVcsR0FBRyxrRUFBa0UsQ0FBQztRQUN2RixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUNoRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxrQkFBa0IsQ0FBQztRQUUvQixJQUFJLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0MsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxTQUFTO2dCQUFFLE9BQU8sSUFBSSxDQUFDO1lBQ3hELEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFFRCxzREFBc0Q7UUFDdEQsT0FBTyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5SCxDQUFDO0NBQ0o7QUFoL0JELGdEQWcvQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgY2xhc3MgQXNzZXRBZHZhbmNlZFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXNzZXRfYWR2YW5jZWQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWR2YW5jZWQgYXNzZXQgb3BlcmF0aW9uczogc2F2ZSBtZXRhLCBnZW5lcmF0ZSBVUkxzLCBjaGVjayBEQiByZWFkaW5lc3MsIG9wZW4gZXh0ZXJuYWxseSwgZ2V0IGRlcGVuZGVuY2llcywgZmluZCB1bnVzZWQgYXNzZXRzLiBVc2UgdGhlIFwiYWN0aW9uXCIgcGFyYW1ldGVyIHRvIHNlbGVjdCB0aGUgb3BlcmF0aW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3NhdmVfbWV0YScsICdnZW5lcmF0ZV91cmwnLCAncXVlcnlfZGJfcmVhZHknLCAnb3Blbl9leHRlcm5hbCcsICdnZXRfZGVwZW5kZW5jaWVzJywgJ2dldF91bnVzZWQnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybE9yVVVJRDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIG9yIFVVSUQgKHVzZWQgYnk6IHNhdmVfbWV0YSwgb3Blbl9leHRlcm5hbCwgZ2V0X2RlcGVuZGVuY2llcyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgbWV0YSBzZXJpYWxpemVkIGNvbnRlbnQgc3RyaW5nICh1c2VkIGJ5OiBzYXZlX21ldGEpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIHRvIGdlbmVyYXRlIGF2YWlsYWJsZSBVUkwgZm9yICh1c2VkIGJ5OiBnZW5lcmF0ZV91cmwpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVwZW5kZW5jeSBkaXJlY3Rpb24gKHVzZWQgYnk6IGdldF9kZXBlbmRlbmNpZXMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2RlcGVuZGVudHMnLCAnZGVwZW5kZW5jaWVzJywgJ2JvdGgnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGVwZW5kZW5jaWVzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHRvIHNjYW4gKHVzZWQgYnk6IGdldF91bnVzZWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZURpcmVjdG9yaWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3JpZXMgdG8gZXhjbHVkZSBmcm9tIHNjYW4gKHVzZWQgYnk6IGdldF91bnVzZWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gbnVtYmVyIG9mIHVudXNlZCBhc3NldHMgdG8gcmV0dXJuICh1c2VkIGJ5OiBnZXRfdW51c2VkKS4gRGVmYXVsdDogNTAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXBCeUZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dyb3VwIHJlc3VsdHMgYnkgZm9sZGVyIHdpdGggY291bnRzIGluc3RlYWQgb2YgbGlzdGluZyBldmVyeSBmaWxlICh1c2VkIGJ5OiBnZXRfdW51c2VkKS4gRGVmYXVsdDogZmFsc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXNzZXRfYmF0Y2gnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggYXNzZXQgb3BlcmF0aW9uczogaW1wb3J0LCBkZWxldGUsIHZhbGlkYXRlIHJlZmVyZW5jZXMsIGNvbXByZXNzIHRleHR1cmVzLCBleHBvcnQgbWFuaWZlc3QuIFVzZSB0aGUgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc2VsZWN0IHRoZSBvcGVyYXRpb24uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnaW1wb3J0JywgJ2RlbGV0ZScsICd2YWxpZGF0ZV9yZWZlcmVuY2VzJywgJ2NvbXByZXNzX3RleHR1cmVzJywgJ2V4cG9ydF9tYW5pZmVzdCcsICdzY2FuX3NjZW5lX3JlZnMnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIGRpcmVjdG9yeSBwYXRoICh1c2VkIGJ5OiBpbXBvcnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldERpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGRpcmVjdG9yeSBVUkwgKHVzZWQgYnk6IGltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUZpbHRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgZXh0ZW5zaW9ucyB0byBpbmNsdWRlLCBlLmcuIFtcIi5wbmdcIiwgXCIuanBnXCJdICh1c2VkIGJ5OiBpbXBvcnQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgc3ViZGlyZWN0b3JpZXMgKHVzZWQgYnk6IGltcG9ydCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3ZlcndyaXRlIGV4aXN0aW5nIGZpbGVzICh1c2VkIGJ5OiBpbXBvcnQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBhc3NldCBVUkxzIHRvIGRlbGV0ZSAodXNlZCBieTogZGVsZXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSB0byBvcGVyYXRlIG9uICh1c2VkIGJ5OiB2YWxpZGF0ZV9yZWZlcmVuY2VzLCBjb21wcmVzc190ZXh0dXJlcywgZXhwb3J0X21hbmlmZXN0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvcm1hdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9ybWF0IGZvciBjb21wcmVzc2lvbiAoZW51bTogYXV0bywganBnLCBwbmcsIHdlYnApIG9yIGV4cG9ydCAoZW51bToganNvbiwgY3N2LCB4bWwpICh1c2VkIGJ5OiBjb21wcmVzc190ZXh0dXJlcywgZXhwb3J0X21hbmlmZXN0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2F1dG8nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcXVhbGl0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcHJlc3Npb24gcXVhbGl0eSAwLjEtMS4wICh1c2VkIGJ5OiBjb21wcmVzc190ZXh0dXJlcyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDAuMSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAxLjAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogMC44XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZU1ldGFkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBhc3NldCBtZXRhZGF0YSAodXNlZCBieTogZXhwb3J0X21hbmlmZXN0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0X2FkdmFuY2VkJzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2F2ZV9tZXRhJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNhdmVBc3NldE1ldGEoYXJncy51cmxPclVVSUQsIGFyZ3MuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dlbmVyYXRlX3VybCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZW5lcmF0ZUF2YWlsYWJsZVVybChhcmdzLnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RiX3JlYWR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5QXNzZXREYlJlYWR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ29wZW5fZXh0ZXJuYWwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub3BlbkFzc2V0RXh0ZXJuYWwoYXJncy51cmxPclVVSUQpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfZGVwZW5kZW5jaWVzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEFzc2V0RGVwZW5kZW5jaWVzKGFyZ3MudXJsT3JVVUlELCBhcmdzLmRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF91bnVzZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0VW51c2VkQXNzZXRzKGFyZ3MuZGlyZWN0b3J5LCBhcmdzLmV4Y2x1ZGVEaXJlY3RvcmllcywgYXJncy5tYXhSZXN1bHRzLCBhcmdzLmdyb3VwQnlGb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgYXNzZXRfYWR2YW5jZWQ6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYXNzZXRfYmF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hJbXBvcnRBc3NldHMoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5iYXRjaERlbGV0ZUFzc2V0cyhhcmdzLnVybHMpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9yZWZlcmVuY2VzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZhbGlkYXRlQXNzZXRSZWZlcmVuY2VzKGFyZ3MuZGlyZWN0b3J5KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnY29tcHJlc3NfdGV4dHVyZXMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29tcHJlc3NUZXh0dXJlcyhhcmdzLmRpcmVjdG9yeSwgYXJncy5mb3JtYXQsIGFyZ3MucXVhbGl0eSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2V4cG9ydF9tYW5pZmVzdCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leHBvcnRBc3NldE1hbmlmZXN0KGFyZ3MuZGlyZWN0b3J5LCBhcmdzLmZvcm1hdCwgYXJncy5pbmNsdWRlTWV0YWRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzY2FuX3NjZW5lX3JlZnMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NhblNjZW5lTWlzc2luZ1JlZnMoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIGFzc2V0X2JhdGNoOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNhdmVBc3NldE1ldGEodXJsT3JVVUlEOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldC1tZXRhJywgdXJsT3JVVUlELCBjb250ZW50KS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQ/LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdD8udXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IG1ldGEgc2F2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVBdmFpbGFibGVVcmwodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2dlbmVyYXRlLWF2YWlsYWJsZS11cmwnLCB1cmwpLnRoZW4oKGF2YWlsYWJsZVVybDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVVcmw6IGF2YWlsYWJsZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGF2YWlsYWJsZVVybCA9PT0gdXJsID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVVJMIGlzIGF2YWlsYWJsZScgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdHZW5lcmF0ZWQgbmV3IGF2YWlsYWJsZSBVUkwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUFzc2V0RGJSZWFkeSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXJlYWR5JykudGhlbigocmVhZHk6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVhZHkgPyAnQXNzZXQgZGF0YWJhc2UgaXMgcmVhZHknIDogJ0Fzc2V0IGRhdGFiYXNlIGlzIG5vdCByZWFkeSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIG9wZW5Bc3NldEV4dGVybmFsKHVybE9yVVVJRDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdvcGVuLWFzc2V0JywgdXJsT3JVVUlEKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Fzc2V0IG9wZW5lZCB3aXRoIGV4dGVybmFsIHByb2dyYW0nXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hJbXBvcnRBc3NldHMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnNvdXJjZURpcmVjdG9yeSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdTb3VyY2UgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0JyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KFxuICAgICAgICAgICAgICAgIGFyZ3Muc291cmNlRGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgIGFyZ3MuZmlsZUZpbHRlciB8fCBbXSxcbiAgICAgICAgICAgICAgICBhcmdzLnJlY3Vyc2l2ZSB8fCBmYWxzZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgY29uc3QgaW1wb3J0UmVzdWx0czogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGAke2FyZ3MudGFyZ2V0RGlyZWN0b3J5fS8ke2ZpbGVOYW1lfWA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnaW1wb3J0LWFzc2V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLCB0YXJnZXRQYXRoLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiBhcmdzLm92ZXJ3cml0ZSB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5hbWU6ICEoYXJncy5vdmVyd3JpdGUgfHwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRSZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQ/LnV1aWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudCsrO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydFJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQ6IGVycm9yQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGltcG9ydFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBpbXBvcnQgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KGRpclBhdGg6IHN0cmluZywgZmlsZUZpbHRlcjogc3RyaW5nW10sIHJlY3Vyc2l2ZTogYm9vbGVhbik6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuICAgICAgICBjb25zdCBmaWxlczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBjb25zdCBpdGVtcyA9IGZzLnJlYWRkaXJTeW5jKGRpclBhdGgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyUGF0aCwgaXRlbSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRmlsdGVyLmxlbmd0aCA9PT0gMCB8fCBmaWxlRmlsdGVyLnNvbWUoZXh0ID0+IGl0ZW0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChleHQudG9Mb3dlckNhc2UoKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goZnVsbFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpICYmIHJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goLi4udGhpcy5nZXRGaWxlc0Zyb21EaXJlY3RvcnkoZnVsbFBhdGgsIGZpbGVGaWx0ZXIsIHJlY3Vyc2l2ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hEZWxldGVBc3NldHModXJsczogc3RyaW5nW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlUmVzdWx0czogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiB1cmxzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiB1cmxzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQ6IGVycm9yQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGRlbGV0ZVJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBkZWxldGUgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVBc3NldFJlZmVyZW5jZXMoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgYXNzZXRzIGluIGRpcmVjdG9yeVxuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBgJHtkaXJlY3Rvcnl9LyoqLypgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBicm9rZW5SZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRSZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFzc2V0cykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZFJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyIGFzIEVycm9yKS5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiBkaXJlY3RvcnksXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiBhc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZFJlZmVyZW5jZXM6IHZhbGlkUmVmZXJlbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXM6IGJyb2tlblJlZmVyZW5jZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBicm9rZW5Bc3NldHM6IGJyb2tlblJlZmVyZW5jZXMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBWYWxpZGF0aW9uIGNvbXBsZXRlZDogJHticm9rZW5SZWZlcmVuY2VzLmxlbmd0aH0gYnJva2VuIHJlZmVyZW5jZXMgZm91bmRgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NhblNjZW5lTWlzc2luZ1JlZnMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogV2FsayBub2RlIHRyZWUsIGNvbGxlY3QgYWxsIG5vZGUgVVVJRHNcbiAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAoIW5vZGVUcmVlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcXVlcnkgc2NlbmUgbm9kZSB0cmVlJyB9O1xuXG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBjb25zdCBxdWV1ZTogYW55W10gPSBbbm9kZVRyZWVdO1xuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZT8udXVpZCkgbm9kZVV1aWRzLnB1c2gobm9kZS51dWlkKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZT8uY2hpbGRyZW4pIHF1ZXVlLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZFNldCA9IG5ldyBTZXQobm9kZVV1aWRzKTtcblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBRdWVyeSBhbGwgbm9kZXMgaW4gcGFyYWxsZWwgYmF0Y2hlcywgY29sbGVjdCBVVUlEIHJlZnNcbiAgICAgICAgICAgIGNvbnN0IE5PREVfQkFUQ0ggPSAxMDtcbiAgICAgICAgICAgIGNvbnN0IHV1aWRUb1JlZnMgPSBuZXcgTWFwPHN0cmluZywgeyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRUeXBlOiBzdHJpbmc7IHByb3BlcnR5OiBzdHJpbmcgfVtdPigpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVVdWlkcy5sZW5ndGg7IGkgKz0gTk9ERV9CQVRDSCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gbm9kZVV1aWRzLnNsaWNlKGksIGkgKyBOT0RFX0JBVENIKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgICAgICAgICAgIGJhdGNoLm1hcCh1dWlkID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKS5jYXRjaCgoKSA9PiBudWxsKSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcmVzdWx0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IHJlc3VsdHNbal07XG4gICAgICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGE/Ll9fY29tcHNfXykgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkID0gYmF0Y2hbal07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVOYW1lID0gbm9kZURhdGEubmFtZT8udmFsdWUgPz8gbm9kZURhdGEubmFtZSA/PyBub2RlVXVpZDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSAoY29tcCBhcyBhbnkpLl9fdHlwZV9fIHx8IChjb21wIGFzIGFueSkudHlwZSB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RSZWZVdWlkcyhjb21wIGFzIGFueSwgY29tcFR5cGUsIG5vZGVVdWlkLCBTdHJpbmcobm9kZU5hbWUpLCB1dWlkVG9SZWZzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVtb3ZlIG5vZGUtdG8tbm9kZSByZWZzIChVVUlEcyB0aGF0IGFyZSBzY2VuZSBub2Rlcywgbm90IGFzc2V0cylcbiAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiBub2RlVXVpZFNldCkgdXVpZFRvUmVmcy5kZWxldGUodXVpZCk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogVmFsaWRhdGUgdW5pcXVlIGFzc2V0IFVVSURzIGFnYWluc3QgYXNzZXQtZGIgaW4gcGFyYWxsZWwgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlVXVpZHMgPSBBcnJheS5mcm9tKHV1aWRUb1JlZnMua2V5cygpKTtcbiAgICAgICAgICAgIGNvbnN0IEFTU0VUX0JBVENIID0gMjA7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nVXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1bmlxdWVVdWlkcy5sZW5ndGg7IGkgKz0gQVNTRVRfQkFUQ0gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYXRjaCA9IHVuaXF1ZVV1aWRzLnNsaWNlKGksIGkgKyBBU1NFVF9CQVRDSCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKGluZm86IGFueSkgPT4gKHsgdXVpZCwgZXhpc3RzOiAhIWluZm8gfSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+ICh7IHV1aWQsIGV4aXN0czogZmFsc2UgfSkpXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgeyB1dWlkLCBleGlzdHMgfSBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzKSBtaXNzaW5nVXVpZHMuYWRkKHV1aWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCA0OiBCdWlsZCByZXBvcnRcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdSZWZzID0gQXJyYXkuZnJvbShtaXNzaW5nVXVpZHMpLm1hcCh1dWlkID0+ICh7XG4gICAgICAgICAgICAgICAgbWlzc2luZ1V1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZEJ5OiB1dWlkVG9SZWZzLmdldCh1dWlkKSA/PyBbXVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbE5vZGVzOiBub2RlVXVpZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVuaXF1ZUFzc2V0UmVmczogdW5pcXVlVXVpZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nQ291bnQ6IG1pc3NpbmdVdWlkcy5zaXplLFxuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nUmVmcyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbWlzc2luZ1V1aWRzLnNpemUgPT09IDBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ05vIG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlcyBmb3VuZCBpbiBzY2VuZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYEZvdW5kICR7bWlzc2luZ1V1aWRzLnNpemV9IG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlKHMpIGFjcm9zcyAke21pc3NpbmdSZWZzLnJlZHVjZSgobiwgcikgPT4gbiArIHIucmVmZXJlbmNlZEJ5Lmxlbmd0aCwgMCl9IGNvbXBvbmVudCBwcm9wZXJ0aWVzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbGxlY3RSZWZVdWlkcyhcbiAgICAgICAgY29tcDogYW55LFxuICAgICAgICBjb21wVHlwZTogc3RyaW5nLFxuICAgICAgICBub2RlVXVpZDogc3RyaW5nLFxuICAgICAgICBub2RlTmFtZTogc3RyaW5nLFxuICAgICAgICB1dWlkVG9SZWZzOiBNYXA8c3RyaW5nLCB7IG5vZGVVdWlkOiBzdHJpbmc7IG5vZGVOYW1lOiBzdHJpbmc7IGNvbXBvbmVudFR5cGU6IHN0cmluZzsgcHJvcGVydHk6IHN0cmluZyB9W10+XG4gICAgKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IHNraXAgPSBuZXcgU2V0KFsnX190eXBlX18nLCAnY2lkJywgJ25vZGUnLCAndXVpZCcsICdfaWQnLCAnX19zY3JpcHRBc3NldCcsICdlbmFibGVkJywgJ3R5cGUnLCAncmVhZG9ubHknLCAndmlzaWJsZScsICdlZGl0b3InLCAnZXh0ZW5kcyddKTtcblxuICAgICAgICBjb25zdCBleHRyYWN0VXVpZCA9ICh2YWw6IGFueSwgcHJvcE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCF2YWwgfHwgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgICAgIC8vIFVud3JhcCBkZXNjcmlwdG9yOiB7IHZhbHVlOiAuLi4sIHR5cGU6IC4uLiB9XG4gICAgICAgICAgICBpZiAoJ3ZhbHVlJyBpbiB2YWwgJiYgISgndXVpZCcgaW4gdmFsKSAmJiAhKCdfX3V1aWRfXycgaW4gdmFsKSkge1xuICAgICAgICAgICAgICAgIGV4dHJhY3RVdWlkKHZhbC52YWx1ZSwgcHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIERpcmVjdCByZWY6IHsgdXVpZDogXCIuLi5cIiB9IG9yIHsgX191dWlkX186IFwiLi4uXCIgfVxuICAgICAgICAgICAgY29uc3QgdXVpZCA9IHZhbC51dWlkIHx8IHZhbC5fX3V1aWRfXztcbiAgICAgICAgICAgIGlmICh1dWlkICYmIHR5cGVvZiB1dWlkID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGlmICghdXVpZFRvUmVmcy5oYXModXVpZCkpIHV1aWRUb1JlZnMuc2V0KHV1aWQsIFtdKTtcbiAgICAgICAgICAgICAgICB1dWlkVG9SZWZzLmdldCh1dWlkKSEucHVzaCh7IG5vZGVVdWlkLCBub2RlTmFtZSwgY29tcG9uZW50VHlwZTogY29tcFR5cGUsIHByb3BlcnR5OiBwcm9wTmFtZSB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBcnJheSBvZiByZWZzXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbCkgZXh0cmFjdFV1aWQoaXRlbSwgcHJvcE5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGNvbXApKSB7XG4gICAgICAgICAgICBpZiAoc2tpcC5oYXMoa2V5KSB8fCBrZXkuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIGV4dHJhY3RVdWlkKGNvbXBba2V5XSwga2V5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXREZXBlbmRlbmNpZXModXJsT3JVVUlEOiBzdHJpbmcsIGRpcmVjdGlvbjogc3RyaW5nID0gJ2RlcGVuZGVuY2llcycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSBhc3NldCBVVUlEIGFuZCBVUkxcbiAgICAgICAgICAgIGxldCBhc3NldFV1aWQ6IHN0cmluZztcbiAgICAgICAgICAgIGxldCBhc3NldFVybDogc3RyaW5nO1xuXG4gICAgICAgICAgICBpZiAodXJsT3JVVUlELnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICBhc3NldFVybCA9IHVybE9yVVVJRDtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHVybE9yVVVJRCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbmZvPy51dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQgPSBpbmZvLnV1aWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IHVybE9yVVVJRDtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCB1cmxPclVVSUQpO1xuICAgICAgICAgICAgICAgIGlmICghdXJsKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcbiAgICAgICAgICAgICAgICBhc3NldFVybCA9IHVybDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBVVUlEcyBmb3IgdGhpcyBhc3NldCAobWFpbiArIHN1Yi1hc3NldHMgZnJvbSAubWV0YSlcbiAgICAgICAgICAgIGNvbnN0IGFsbEFzc2V0VXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oW2Fzc2V0VXVpZF0pO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgIGlmIChmc1BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YVBhdGggPSBmc1BhdGggKyAnLm1ldGEnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhtZXRhUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtZXRhUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RTdWJVdWlkcyhtZXRhLnN1Yk1ldGFzLCBhbGxBc3NldFV1aWRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgbWV0YSByZWFkIGVycm9ycyAqLyB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRlcGVuZGVuY2llczogQXJyYXk8eyB1dWlkOiBzdHJpbmc7IHVybDogc3RyaW5nIH0+ID0gW107XG4gICAgICAgICAgICBjb25zdCBkZXBlbmRlbnRzOiBBcnJheTx7IHVybDogc3RyaW5nIH0+ID0gW107XG5cbiAgICAgICAgICAgIC8vIEZpbmQgZGVwZW5kZW5jaWVzOiBhc3NldHMgdGhpcyBmaWxlIHJlZmVyZW5jZXMgdmlhIF9fdXVpZF9fIGFuZCBfX3R5cGVfX1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2RlcGVuZGVuY2llcycgfHwgZGlyZWN0aW9uID09PSAnYm90aCcpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnNQYXRoICYmIGZzLmV4aXN0c1N5bmMoZnNQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX191dWlkX18gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCByZWYgb2YgcmVmVXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHJlZi5zcGxpdCgnQCcpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWVuLmhhcyhiYXNlVXVpZCkgfHwgYWxsQXNzZXRVdWlkcy5oYXMoYmFzZVV1aWQpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVuLmFkZChiYXNlVXVpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBiYXNlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHsgdXVpZDogYmFzZVV1aWQsIHVybDogcmVmVXJsIHx8ICd1bnJlc29sdmVkJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBiYXNlVXVpZCwgdXJsOiAndW5yZXNvbHZlZCcgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IF9fdHlwZV9fIHJlZmVyZW5jZXMgKGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cyB1c2UgY29tcHJlc3NlZCBVVUlEcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZHMgPSB0aGlzLmV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHR5cGVJZCBvZiB0eXBlSWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb21wcmVzc2VkID0gdGhpcy5kZWNvbXByZXNzVXVpZCh0eXBlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGVjb21wcmVzc2VkIHx8IHNlZW4uaGFzKGRlY29tcHJlc3NlZCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZW4uYWRkKGRlY29tcHJlc3NlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXJsID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXJsJywgZGVjb21wcmVzc2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlZlVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBkZWNvbXByZXNzZWQsIHVybDogcmVmVXJsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIG5vdCBhIHZhbGlkIHNjcmlwdCBVVUlEICovIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgcmVhZCBlcnJvcnMgKi8gfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIGRlcGVuZGVudHM6IHNlcmlhbGl6ZWQgZmlsZXMgdGhhdCByZWZlcmVuY2UgdGhpcyBhc3NldCdzIFVVSURzXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZGVwZW5kZW50cycgfHwgZGlyZWN0aW9uID09PSAnYm90aCcpIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBzZWFyY2ggc3RyaW5nczogb3JpZ2luYWwgVVVJRHMgKyBjb21wcmVzc2VkIGZvcm1zIGZvciBfX3R5cGVfXyBtYXRjaGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFN0cmluZ3MgPSBuZXcgU2V0PHN0cmluZz4oYWxsQXNzZXRVdWlkcyk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1aWQgb2YgYWxsQXNzZXRVdWlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gdGhpcy5jb21wcmVzc1V1aWQodWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgc2VhcmNoU3RyaW5ncy5hZGQoY29tcHJlc3NlZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy53YWxrU2VyaWFsaXplZEZpbGVzKGFzc2V0c1BhdGgsIChmaWxlUGF0aCwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN0ciBvZiBzZWFyY2hTdHJpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5pbmNsdWRlcyhzdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVVybCA9ICdkYjovLycgKyBmaWxlUGF0aC5zdWJzdHJpbmcocHJvamVjdFBhdGgubGVuZ3RoICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVVcmwgIT09IGFzc2V0VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHMucHVzaCh7IHVybDogZmlsZVVybCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXQ6IHsgdXVpZDogYXNzZXRVdWlkLCB1cmw6IGFzc2V0VXJsLCBhbGxVdWlkczogQXJyYXkuZnJvbShhbGxBc3NldFV1aWRzKSB9LFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHMsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llc0NvdW50OiBkZXBlbmRlbmNpZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbnRzQ291bnQ6IGRlcGVuZGVudHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtkZXBlbmRlbmNpZXMubGVuZ3RofSBkZXBlbmRlbmNpZXMgYW5kICR7ZGVwZW5kZW50cy5sZW5ndGh9IGRlcGVuZGVudHMgZm9yICR7YXNzZXRVcmx9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEZXBlbmRlbmN5IGFuYWx5c2lzIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFVudXNlZEFzc2V0cyhkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGV4Y2x1ZGVEaXJlY3Rvcmllczogc3RyaW5nW10gPSBbXSwgbWF4UmVzdWx0czogbnVtYmVyID0gNTAsIGdyb3VwQnlGb2xkZXI6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgICAgICBjb25zdCBiYXNlUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgZGlyZWN0b3J5LnJlcGxhY2UoJ2RiOi8vJywgJycpKTtcblxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGJhc2VQYXRoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdG9yeSBub3QgZm91bmQ6ICR7ZGlyZWN0b3J5fWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAxOiBCdWlsZCBVVUlEIC0+IGFzc2V0IFVSTCBtYXAgZnJvbSAubWV0YSBmaWxlc1xuICAgICAgICAgICAgLy8gQWxzbyBidWlsZCBjb21wcmVzc2VkIFVVSUQgbWFwIGZvciBfX3R5cGVfXyBtYXRjaGluZyAoc2NyaXB0IGNvbXBvbmVudHMpXG4gICAgICAgICAgICBjb25zdCB1dWlkVG9VcmwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZFRvVXJsID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNvbnN0IGFsbEFzc2V0czogQXJyYXk8eyB1cmw6IHN0cmluZzsgZXh0OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KGJhc2VQYXRoLCAoZmlsZVBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGVQYXRoLmVuZHNXaXRoKCcubWV0YScpKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldEZzUGF0aCA9IGZpbGVQYXRoLnNsaWNlKDAsIC01KTsgLy8gUmVtb3ZlIC5tZXRhIHN1ZmZpeFxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0VXJsID0gJ2RiOi8vJyArIGFzc2V0RnNQYXRoLnN1YnN0cmluZyhwcm9qZWN0UGF0aC5sZW5ndGggKyAxKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV4Y2x1ZGUgZGlyZWN0b3JpZXNcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV4Y2wgb2YgZXhjbHVkZURpcmVjdG9yaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldFVybC5zdGFydHNXaXRoKGV4Y2wpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBpZiBhY3R1YWwgYXNzZXQgZG9lc24ndCBleGlzdCBvciBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhc3NldEZzUGF0aCkgfHwgZnMuc3RhdFN5bmMoYXNzZXRGc1BhdGgpLmlzRGlyZWN0b3J5KCkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoYXNzZXRGc1BhdGgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgYWxsQXNzZXRzLnB1c2goeyB1cmw6IGFzc2V0VXJsLCBleHQgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIG1haW4gVVVJRCB0byBhc3NldCBVUkxcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGEudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZFRvVXJsLnNldChtZXRhLnV1aWQsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZChtZXRhLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgc3ViLWFzc2V0IFVVSURzIHRvIHBhcmVudCBhc3NldCBVUkxcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViVXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0U3ViVXVpZHMobWV0YS5zdWJNZXRhcywgc3ViVXVpZHMpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN1YlV1aWQgb2Ygc3ViVXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRUb1VybC5zZXQoc3ViVXVpZCwgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZCA9IHRoaXMuY29tcHJlc3NVdWlkKHN1YlV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogc2tpcCB1bnBhcnNlYWJsZSBtZXRhIGZpbGVzICovIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDI6IFNjYW4gQUxMIHNlcmlhbGl6ZWQgZmlsZXMgaW4gZW50aXJlIGFzc2V0cyBmb2xkZXIgKG5vdCBqdXN0IHRhcmdldCBkaXJlY3RvcnkpXG4gICAgICAgICAgICAvLyBiZWNhdXNlIHNjZW5lcy9wcmVmYWJzIHJlZmVyZW5jaW5nIHRhcmdldCBhc3NldHMgbWF5IGJlIGluIG90aGVyIGZvbGRlcnNcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0c1BhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsICdhc3NldHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHJlZmVyZW5jZWRVcmxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgIHRoaXMud2Fsa1NlcmlhbGl6ZWRGaWxlcyhhc3NldHNQYXRoLCAoX2ZpbGVQYXRoLCBjb250ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgX191dWlkX18gcmVmZXJlbmNlcyAoaW1hZ2VzLCBwcmVmYWJzLCBtYXRlcmlhbHMsIGV0Yy4pXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiB1dWlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHV1aWQuc3BsaXQoJ0AnKVswXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gdXVpZFRvVXJsLmdldChiYXNlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1cmwpIHJlZmVyZW5jZWRVcmxzLmFkZCh1cmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIF9fdHlwZV9fIHJlZmVyZW5jZXMgKHNjcmlwdCBjb21wb25lbnRzIHVzZSBjb21wcmVzc2VkIFVVSURzKVxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZHMgPSB0aGlzLmV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlSWQgb2YgdHlwZUlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBjb21wcmVzc2VkVG9VcmwuZ2V0KHR5cGVJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1cmwpIHJlZmVyZW5jZWRVcmxzLmFkZCh1cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDM6IEZpbmQgdW51c2VkIGFzc2V0cywgc2VwYXJhdGUgc2NyaXB0cyBmcm9tIG90aGVyIGFzc2V0c1xuICAgICAgICAgICAgY29uc3Qgc2NyaXB0RXh0cyA9IFsnLnRzJywgJy5qcyddO1xuICAgICAgICAgICAgY29uc3QgYWxsVW51c2VkQXNzZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgYWxsVW51c2VkU2NyaXB0czogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBhc3NldCBvZiBhbGxBc3NldHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZmVyZW5jZWRVcmxzLmhhcyhhc3NldC51cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JpcHRFeHRzLmluY2x1ZGVzKGFzc2V0LmV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbFVudXNlZFNjcmlwdHMucHVzaChhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsVW51c2VkQXNzZXRzLnB1c2goYXNzZXQudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdG90YWxVbnVzZWRBc3NldHMgPSBhbGxVbnVzZWRBc3NldHMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgdG90YWxVbnVzZWRTY3JpcHRzID0gYWxsVW51c2VkU2NyaXB0cy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBsaW1pdCA9IE1hdGgubWF4KDEsIG1heFJlc3VsdHMpO1xuXG4gICAgICAgICAgICBpZiAoZ3JvdXBCeUZvbGRlcikge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGJ5IHBhcmVudCBmb2xkZXIgd2l0aCBjb3VudHNcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBhc3NldHM6IG51bWJlcjsgc2NyaXB0czogbnVtYmVyOyBzYW1wbGVzOiBzdHJpbmdbXSB9PigpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgYWxsVW51c2VkQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGZvbGRlck1hcC5nZXQoZm9sZGVyKSB8fCB7IGFzc2V0czogMCwgc2NyaXB0czogMCwgc2FtcGxlczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkuYXNzZXRzKys7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeS5zYW1wbGVzLmxlbmd0aCA8IDMpIGVudHJ5LnNhbXBsZXMucHVzaCh1cmwuc3Vic3RyaW5nKHVybC5sYXN0SW5kZXhPZignLycpICsgMSkpO1xuICAgICAgICAgICAgICAgICAgICBmb2xkZXJNYXAuc2V0KGZvbGRlciwgZW50cnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBhbGxVbnVzZWRTY3JpcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGZvbGRlck1hcC5nZXQoZm9sZGVyKSB8fCB7IGFzc2V0czogMCwgc2NyaXB0czogMCwgc2FtcGxlczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkuc2NyaXB0cysrO1xuICAgICAgICAgICAgICAgICAgICBmb2xkZXJNYXAuc2V0KGZvbGRlciwgZW50cnkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNvcnQgYnkgdG90YWwgY291bnQgZGVzY2VuZGluZywgbGltaXQgcmVzdWx0c1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlcnMgPSBBcnJheS5mcm9tKGZvbGRlck1hcC5lbnRyaWVzKCkpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKFtmb2xkZXIsIGRhdGFdKSA9PiAoeyBmb2xkZXIsIC4uLmRhdGEsIHRvdGFsOiBkYXRhLmFzc2V0cyArIGRhdGEuc2NyaXB0cyB9KSlcbiAgICAgICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIudG90YWwgLSBhLnRvdGFsKVxuICAgICAgICAgICAgICAgICAgICAuc2xpY2UoMCwgbGltaXQpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFsbEFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VkQ291bnQ6IHJlZmVyZW5jZWRVcmxzLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnVzZWRDb3VudDogdG90YWxVbnVzZWRBc3NldHMgKyB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnVzZWRBc3NldENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZFNjcmlwdENvdW50OiB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyc1Nob3duOiBmb2xkZXJzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsRm9sZGVyczogZm9sZGVyTWFwLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHt0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0c30gdW51c2VkIGl0ZW1zIGFjcm9zcyAke2ZvbGRlck1hcC5zaXplfSBmb2xkZXJzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGU6ICdBc3NldHMgbG9hZGVkIGR5bmFtaWNhbGx5IChlLmcuIHJlc291cmNlcy5sb2FkKSBtYXkgc3RpbGwgYXBwZWFyIHVudXNlZC4gUmV2aWV3IGJlZm9yZSBkZWxldGluZy4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGbGF0IGxpc3Qgd2l0aCBtYXhSZXN1bHRzIGxpbWl0XG4gICAgICAgICAgICBjb25zdCB1bnVzZWRBc3NldHMgPSBhbGxVbnVzZWRBc3NldHMuc29ydCgpLnNsaWNlKDAsIGxpbWl0KTtcbiAgICAgICAgICAgIGNvbnN0IHVudXNlZFNjcmlwdHMgPSBhbGxVbnVzZWRTY3JpcHRzLnNvcnQoKS5zbGljZSgwLCBsaW1pdCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFsbEFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRDb3VudDogcmVmZXJlbmNlZFVybHMuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkQ291bnQ6IHRvdGFsVW51c2VkQXNzZXRzICsgdG90YWxVbnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICB1bnVzZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIHVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgIHNob3dpbmc6IHVudXNlZEFzc2V0cy5sZW5ndGggKyB1bnVzZWRTY3JpcHRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgdHJ1bmNhdGVkOiB0b3RhbFVudXNlZEFzc2V0cyA+IGxpbWl0IHx8IHRvdGFsVW51c2VkU2NyaXB0cyA+IGxpbWl0LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHt0b3RhbFVudXNlZEFzc2V0c30gdW51c2VkIGFzc2V0cyBhbmQgJHt0b3RhbFVudXNlZFNjcmlwdHN9IHVudXNlZCBzY3JpcHRzIChzaG93aW5nIHVwIHRvICR7bGltaXR9IGVhY2gpYCxcbiAgICAgICAgICAgICAgICAgICAgbm90ZTogJ0Fzc2V0cyBsb2FkZWQgZHluYW1pY2FsbHkgKGUuZy4gcmVzb3VyY2VzLmxvYWQpIG1heSBzdGlsbCBhcHBlYXIgdW51c2VkLiBVc2UgZ3JvdXBCeUZvbGRlcjp0cnVlIGZvciBvdmVydmlldy4gUmV2aWV3IGJlZm9yZSBkZWxldGluZy4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVudXNlZCBhc3NldCBkZXRlY3Rpb24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY29tcHJlc3NUZXh0dXJlcyhkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGZvcm1hdDogc3RyaW5nID0gJ2F1dG8nLCBxdWFsaXR5OiBudW1iZXIgPSAwLjgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIE5vdGU6IFRleHR1cmUgY29tcHJlc3Npb24gd291bGQgcmVxdWlyZSBpbWFnZSBwcm9jZXNzaW5nIEFQSXNcbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGVycm9yOiAnVGV4dHVyZSBjb21wcmVzc2lvbiByZXF1aXJlcyBpbWFnZSBwcm9jZXNzaW5nIGNhcGFiaWxpdGllcyBub3QgYXZhaWxhYmxlIGluIGN1cnJlbnQgQ29jb3MgQ3JlYXRvciBNQ1AgaW1wbGVtZW50YXRpb24uIFVzZSB0aGUgRWRpdG9yXFwncyBidWlsdC1pbiB0ZXh0dXJlIGNvbXByZXNzaW9uIHNldHRpbmdzIG9yIGV4dGVybmFsIHRvb2xzLidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGV4cG9ydEFzc2V0TWFuaWZlc3QoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnLCBmb3JtYXQ6IHN0cmluZyA9ICdqc29uJywgaW5jbHVkZU1ldGFkYXRhOiBib29sZWFuID0gdHJ1ZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IGAke2RpcmVjdG9yeX0vKiovKmAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IG1hbmlmZXN0OiBhbnlbXSA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFzc2V0cykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbmlmZXN0RW50cnk6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGFzc2V0LnR5cGUsXG4gICAgICAgICAgICAgICAgICAgIHNpemU6IChhc3NldCBhcyBhbnkpLnNpemUgfHwgMCxcbiAgICAgICAgICAgICAgICAgICAgaXNEaXJlY3Rvcnk6IGFzc2V0LmlzRGlyZWN0b3J5IHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWV0YWRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0SW5mbyAmJiBhc3NldEluZm8ubWV0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbmlmZXN0RW50cnkubWV0YSA9IGFzc2V0SW5mby5tZXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNraXAgbWV0YWRhdGEgaWYgbm90IGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWFuaWZlc3QucHVzaChtYW5pZmVzdEVudHJ5KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGV4cG9ydERhdGE6IHN0cmluZztcbiAgICAgICAgICAgIHN3aXRjaCAoZm9ybWF0KSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnanNvbic6XG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydERhdGEgPSBKU09OLnN0cmluZ2lmeShtYW5pZmVzdCwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2Nzdic6XG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydERhdGEgPSB0aGlzLmNvbnZlcnRUb0NTVihtYW5pZmVzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydERhdGEgPSB0aGlzLmNvbnZlcnRUb1hNTChtYW5pZmVzdCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGV4cG9ydERhdGEgPSBKU09OLnN0cmluZ2lmeShtYW5pZmVzdCwgbnVsbCwgMik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeTogZGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgICAgICBmb3JtYXQ6IGZvcm1hdCxcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRDb3VudDogbWFuaWZlc3QubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTWV0YWRhdGE6IGluY2x1ZGVNZXRhZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3Q6IGV4cG9ydERhdGEsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBc3NldCBtYW5pZmVzdCBleHBvcnRlZCB3aXRoICR7bWFuaWZlc3QubGVuZ3RofSBhc3NldHNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY29udmVydFRvQ1NWKGRhdGE6IGFueVtdKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSByZXR1cm4gJyc7XG5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IE9iamVjdC5rZXlzKGRhdGFbMF0pO1xuICAgICAgICBjb25zdCBjc3ZSb3dzID0gW2hlYWRlcnMuam9pbignLCcpXTtcblxuICAgICAgICBmb3IgKGNvbnN0IHJvdyBvZiBkYXRhKSB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBoZWFkZXJzLm1hcChoZWFkZXIgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2hlYWRlcl07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgOiBTdHJpbmcodmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjc3ZSb3dzLnB1c2godmFsdWVzLmpvaW4oJywnKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3N2Um93cy5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbnZlcnRUb1hNTChkYXRhOiBhbnlbXSk6IHN0cmluZyB7XG4gICAgICAgIGxldCB4bWwgPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuPGFzc2V0cz5cXG4nO1xuXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBkYXRhKSB7XG4gICAgICAgICAgICB4bWwgKz0gJyAgPGFzc2V0Plxcbic7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhpdGVtKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHhtbFZhbHVlID0gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyA/XG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHZhbHVlKSA6XG4gICAgICAgICAgICAgICAgICAgIFN0cmluZyh2YWx1ZSkucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuICAgICAgICAgICAgICAgIHhtbCArPSBgICAgIDwke2tleX0+JHt4bWxWYWx1ZX08LyR7a2V5fT5cXG5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgeG1sICs9ICcgIDwvYXNzZXQ+XFxuJztcbiAgICAgICAgfVxuXG4gICAgICAgIHhtbCArPSAnPC9hc3NldHM+JztcbiAgICAgICAgcmV0dXJuIHhtbDtcbiAgICB9XG5cbiAgICAvLyAtLS0gSGVscGVyIG1ldGhvZHMgZm9yIGRlcGVuZGVuY3kgYW5kIHVudXNlZCBhc3NldCBhbmFseXNpcyAtLS1cblxuICAgIHByaXZhdGUgZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCB1dWlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IC9cIl9fdXVpZF9fXCJcXHMqOlxccypcIihbXlwiXSspXCIvZztcbiAgICAgICAgbGV0IG1hdGNoO1xuICAgICAgICB3aGlsZSAoKG1hdGNoID0gcGF0dGVybi5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdXVpZHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV1aWRzO1xuICAgIH1cblxuICAgIHByaXZhdGUgY29sbGVjdFN1YlV1aWRzKHN1Yk1ldGFzOiBhbnksIHV1aWRzOiBTZXQ8c3RyaW5nPik6IHZvaWQge1xuICAgICAgICBpZiAoIXN1Yk1ldGFzIHx8IHR5cGVvZiBzdWJNZXRhcyAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3ViTWV0YXMpKSB7XG4gICAgICAgICAgICBjb25zdCBzdWIgPSBzdWJNZXRhc1trZXldO1xuICAgICAgICAgICAgaWYgKHN1Yj8udXVpZCkgdXVpZHMuYWRkKHN1Yi51dWlkKTtcbiAgICAgICAgICAgIGlmIChzdWI/LnN1Yk1ldGFzKSB0aGlzLmNvbGxlY3RTdWJVdWlkcyhzdWIuc3ViTWV0YXMsIHV1aWRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgd2Fsa0RpcmVjdG9yeShkaXI6IHN0cmluZywgY2FsbGJhY2s6IChmaWxlUGF0aDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHRoaXMud2Fsa0RpcmVjdG9yeShmdWxsUGF0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmdWxsUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHdhbGtTZXJpYWxpemVkRmlsZXMoZGlyOiBzdHJpbmcsIGNhbGxiYWNrOiAoZmlsZVBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbnMgPSBbJy5zY2VuZScsICcucHJlZmFiJywgJy5hbmltJywgJy5tdGwnLCAnLmVmZmVjdCddO1xuICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoZGlyLCAoZmlsZVBhdGgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlUGF0aCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmICghZXh0ZW5zaW9ucy5pbmNsdWRlcyhleHQpKSByZXR1cm47XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZVBhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNraXAgYmluYXJ5IG9yIHVucmVhZGFibGUgZmlsZXMgKi8gfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCB0eXBlSWRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gL1wiX190eXBlX19cIlxccyo6XFxzKlwiKFteXCJdKylcIi9nO1xuICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBTa2lwIGJ1aWx0LWluIENvY29zIHR5cGVzIChjYy5Ob2RlLCBjYy5TcHJpdGUsIGV0Yy4pXG4gICAgICAgICAgICBpZiAoIW1hdGNoWzFdLnN0YXJ0c1dpdGgoJ2NjLicpKSB7XG4gICAgICAgICAgICAgICAgdHlwZUlkcy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHlwZUlkcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wcmVzcyBhIHN0YW5kYXJkIFVVSUQgdG8gQ29jb3MgQ3JlYXRvcidzIDIyLWNoYXIgZm9ybWF0IHVzZWQgaW4gX190eXBlX18uXG4gICAgICogRm9ybWF0OiBmaXJzdCAyIGhleCBjaGFycyBrZXB0ICsgMTAgcGFpcnMgb2YgYmFzZTY0IGNoYXJzIChlbmNvZGluZyByZW1haW5pbmcgMzAgaGV4IGNoYXJzKS5cbiAgICAgKi9cbiAgICBwcml2YXRlIGNvbXByZXNzVXVpZCh1dWlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBCQVNFNjRfS0VZUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbiAgICAgICAgY29uc3QgaGV4ID0gdXVpZC5yZXBsYWNlKC8tL2csICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoaGV4Lmxlbmd0aCAhPT0gMzIpIHJldHVybiB1dWlkO1xuXG4gICAgICAgIGxldCByZXN1bHQgPSBoZXhbMF0gKyBoZXhbMV07XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDwgMzI7IGkgKz0gMykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gKHBhcnNlSW50KGhleFtpXSwgMTYpIDw8IDgpIHwgKHBhcnNlSW50KGhleFtpICsgMV0sIDE2KSA8PCA0KSB8IHBhcnNlSW50KGhleFtpICsgMl0sIDE2KTtcbiAgICAgICAgICAgIHJlc3VsdCArPSBCQVNFNjRfS0VZU1t2YWwgPj4gNl07XG4gICAgICAgICAgICByZXN1bHQgKz0gQkFTRTY0X0tFWVNbdmFsICYgMHgzRl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDsgLy8gMiArIDIwID0gMjIgY2hhcnNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWNvbXByZXNzIGEgMjItY2hhciBDb2NvcyBDcmVhdG9yIGNvbXByZXNzZWQgVVVJRCBiYWNrIHRvIHN0YW5kYXJkIFVVSUQgZm9ybWF0LlxuICAgICAqIFJldHVybnMgbnVsbCBpZiB0aGUgaW5wdXQgaXMgbm90IGEgdmFsaWQgY29tcHJlc3NlZCBVVUlELlxuICAgICAqL1xuICAgIHByaXZhdGUgZGVjb21wcmVzc1V1aWQoY29tcHJlc3NlZDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCAhPT0gMjIpIHJldHVybiBudWxsO1xuXG4gICAgICAgIGNvbnN0IEJBU0U2NF9LRVlTID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuICAgICAgICBjb25zdCBCQVNFNjRfVkFMVUVTID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBCQVNFNjRfS0VZUy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgQkFTRTY0X1ZBTFVFUy5zZXQoQkFTRTY0X0tFWVNbaV0sIGkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IEhFWCA9ICcwMTIzNDU2Nzg5YWJjZGVmJztcblxuICAgICAgICBsZXQgaGV4ID0gY29tcHJlc3NlZFswXSArIGNvbXByZXNzZWRbMV07XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDwgMjI7IGkgKz0gMikge1xuICAgICAgICAgICAgY29uc3QgbGhzID0gQkFTRTY0X1ZBTFVFUy5nZXQoY29tcHJlc3NlZFtpXSk7XG4gICAgICAgICAgICBjb25zdCByaHMgPSBCQVNFNjRfVkFMVUVTLmdldChjb21wcmVzc2VkW2kgKyAxXSk7XG4gICAgICAgICAgICBpZiAobGhzID09PSB1bmRlZmluZWQgfHwgcmhzID09PSB1bmRlZmluZWQpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaGV4ICs9IEhFWFtsaHMgPj4gMl07XG4gICAgICAgICAgICBoZXggKz0gSEVYWygobGhzICYgMykgPDwgMikgfCAocmhzID4+IDQpXTtcbiAgICAgICAgICAgIGhleCArPSBIRVhbcmhzICYgMHhGXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluc2VydCBkYXNoZXM6IHh4eHh4eHh4LXh4eHgteHh4eC14eHh4LXh4eHh4eHh4eHh4eFxuICAgICAgICByZXR1cm4gaGV4LnNsaWNlKDAsIDgpICsgJy0nICsgaGV4LnNsaWNlKDgsIDEyKSArICctJyArIGhleC5zbGljZSgxMiwgMTYpICsgJy0nICsgaGV4LnNsaWNlKDE2LCAyMCkgKyAnLScgKyBoZXguc2xpY2UoMjApO1xuICAgIH1cbn1cbiJdfQ==