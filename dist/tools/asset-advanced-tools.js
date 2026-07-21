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
                description: 'Advanced asset ops: generate available URLs, check DB readiness, get dependencies, find unused assets.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['generate_url', 'query_db_ready', 'get_dependencies', 'get_unused']
                        },
                        urlOrUUID: {
                            type: 'string',
                            description: 'Asset URL or UUID (get_dependencies)'
                        },
                        url: {
                            type: 'string',
                            description: 'Asset URL to generate available URL for (generate_url)'
                        },
                        direction: {
                            type: 'string',
                            description: 'Dependency direction (get_dependencies)',
                            enum: ['dependents', 'dependencies', 'both'],
                            default: 'dependencies'
                        },
                        directory: {
                            type: 'string',
                            description: 'Directory to scan (get_unused)',
                            default: 'db://assets'
                        },
                        excludeDirectories: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Directories to exclude from scan (get_unused)',
                            default: []
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of unused assets to return (get_unused). Default: 50',
                            default: 50
                        },
                        groupByFolder: {
                            type: 'boolean',
                            description: 'Group results by folder with counts instead of listing every file (get_unused). Default: false',
                            default: false
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'asset_batch',
                description: 'Batch asset ops: import, delete, validate references, scan scene for missing refs.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'The action to perform',
                            enum: ['import', 'delete', 'validate_references', 'scan_scene_refs']
                        },
                        sourceDirectory: {
                            type: 'string',
                            description: 'Source directory path (import)'
                        },
                        targetDirectory: {
                            type: 'string',
                            description: 'Target directory URL (import)'
                        },
                        fileFilter: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'File extensions to include, e.g. [".png", ".jpg"] (import)',
                            default: []
                        },
                        recursive: {
                            type: 'boolean',
                            description: 'Include subdirectories (import)',
                            default: false
                        },
                        overwrite: {
                            type: 'boolean',
                            description: 'Overwrite existing files (import)',
                            default: false
                        },
                        urls: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Array of asset URLs to delete (delete)'
                        },
                        directory: {
                            type: 'string',
                            description: 'Directory to operate on (validate_references)',
                            default: 'db://assets'
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
                    case 'generate_url':
                        return await this.generateAvailableUrl(args.url);
                    case 'query_db_ready':
                        return await this.queryAssetDbReady();
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
        var _a, _b, _c, _d, _e, _f;
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
            // Track component-instance uuids so we can exclude them from "asset" candidates below.
            const componentUuidSet = new Set();
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
                        const compType = comp.__type__ || comp.cid || comp.type || 'Unknown';
                        // Component instance uuid lives at comp.value.uuid.value (raw query-node shape) or comp.uuid.
                        const compInstanceUuid = ((_e = (_d = comp.value) === null || _d === void 0 ? void 0 : _d.uuid) === null || _e === void 0 ? void 0 : _e.value) || ((_f = comp.uuid) === null || _f === void 0 ? void 0 : _f.value) || comp.uuid;
                        if (typeof compInstanceUuid === 'string' && compInstanceUuid.length > 0) {
                            componentUuidSet.add(compInstanceUuid);
                        }
                        this.collectRefUuids(comp, compType, nodeUuid, String(nodeName), uuidToRefs);
                    }
                }
            }
            // Remove non-asset uuids: scene node uuids and component-instance uuids both surface as `{uuid}`
            // refs but are not assets in the asset-db.
            for (const uuid of nodeUuidSet)
                uuidToRefs.delete(uuid);
            for (const uuid of componentUuidSet)
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
        // Walk the Cocos query-node component shape. Editable fields live under either `comp.value`
        // (raw scene payload) or directly on `comp` (some builds). Each field is a descriptor of the
        // form `{ name, value, type, ... }` where `value` holds the actual data.
        // We attribute refs to the OUTER key (e.g. `cameraComponent`), not the descriptor's literal `value`.
        const isDescriptor = (v) => v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && ('type' in v || 'name' in v);
        const seen = new WeakSet();
        const recordRef = (uuid, propName) => {
            if (!uuidToRefs.has(uuid))
                uuidToRefs.set(uuid, []);
            uuidToRefs.get(uuid).push({ nodeUuid, nodeName, componentType: compType, property: propName });
        };
        const walkValue = (val, propName, depth) => {
            var _a;
            if (val === null || val === undefined || depth > 12)
                return;
            if (typeof val !== 'object')
                return;
            if (seen.has(val))
                return;
            seen.add(val);
            // Array: recurse each item, keep propName
            if (Array.isArray(val)) {
                for (const item of val)
                    walkValue(item, propName, depth + 1);
                return;
            }
            // Direct ref shape `{ uuid }` or `{ __uuid__ }`. Filter empty strings (unset slots).
            const uuid = (_a = val.uuid) !== null && _a !== void 0 ? _a : val.__uuid__;
            if (typeof uuid === 'string' && uuid.length > 0) {
                recordRef(uuid, propName);
                return;
            }
            // Descriptor wrapper `{ name, value, type, ... }` — recurse into `value` only, keep propName.
            if (isDescriptor(val)) {
                walkValue(val.value, propName, depth + 1);
                return;
            }
            // Plain object: each own key becomes the new propName for its subtree.
            for (const key of Object.keys(val)) {
                if (key.startsWith('_'))
                    continue; // skip private mirrors like `_color`
                walkValue(val[key], key, depth + 1);
            }
        };
        // Top-level: handle both shapes (`comp.value` wrapper and direct).
        const root = comp && typeof comp === 'object' && comp.value && typeof comp.value === 'object' ? comp.value : comp;
        for (const key of Object.keys(root)) {
            if (key.startsWith('_'))
                continue;
            // Skip wrapper metadata keys at the component root.
            if (['__type__', 'cid', 'enabled', 'type', 'name', 'uuid'].includes(key))
                continue;
            // `node` is the back-pointer to the owning node — never an asset.
            if (key === 'node')
                continue;
            walkValue(root[key], key, 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSx3R0FBd0c7Z0JBQ3JILFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLENBQUM7eUJBQzdFO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsc0NBQXNDO3lCQUN0RDt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHdEQUF3RDt5QkFDeEU7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7NEJBQ3RELElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDOzRCQUM1QyxPQUFPLEVBQUUsY0FBYzt5QkFDMUI7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxnQ0FBZ0M7NEJBQzdDLE9BQU8sRUFBRSxhQUFhO3lCQUN6Qjt3QkFDRCxrQkFBa0IsRUFBRTs0QkFDaEIsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFF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LE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssU0FBUztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUN4RCxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUgsQ0FBQztDQUNKO0FBbDNCRCxnREFrM0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEFzc2V0QWR2YW5jZWRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2FkdmFuY2VkJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkIGFzc2V0IG9wczogZ2VuZXJhdGUgYXZhaWxhYmxlIFVSTHMsIGNoZWNrIERCIHJlYWRpbmVzcywgZ2V0IGRlcGVuZGVuY2llcywgZmluZCB1bnVzZWQgYXNzZXRzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dlbmVyYXRlX3VybCcsICdxdWVyeV9kYl9yZWFkeScsICdnZXRfZGVwZW5kZW5jaWVzJywgJ2dldF91bnVzZWQnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybE9yVVVJRDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIG9yIFVVSUQgKGdldF9kZXBlbmRlbmNpZXMpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVJMIHRvIGdlbmVyYXRlIGF2YWlsYWJsZSBVUkwgZm9yIChnZW5lcmF0ZV91cmwpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVwZW5kZW5jeSBkaXJlY3Rpb24gKGdldF9kZXBlbmRlbmNpZXMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2RlcGVuZGVudHMnLCAnZGVwZW5kZW5jaWVzJywgJ2JvdGgnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGVwZW5kZW5jaWVzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHRvIHNjYW4gKGdldF91bnVzZWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhjbHVkZURpcmVjdG9yaWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3JpZXMgdG8gZXhjbHVkZSBmcm9tIHNjYW4gKGdldF91bnVzZWQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heFJlc3VsdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gbnVtYmVyIG9mIHVudXNlZCBhc3NldHMgdG8gcmV0dXJuIChnZXRfdW51c2VkKS4gRGVmYXVsdDogNTAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JvdXBCeUZvbGRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dyb3VwIHJlc3VsdHMgYnkgZm9sZGVyIHdpdGggY291bnRzIGluc3RlYWQgb2YgbGlzdGluZyBldmVyeSBmaWxlIChnZXRfdW51c2VkKS4gRGVmYXVsdDogZmFsc2UnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXNzZXRfYmF0Y2gnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggYXNzZXQgb3BzOiBpbXBvcnQsIGRlbGV0ZSwgdmFsaWRhdGUgcmVmZXJlbmNlcywgc2NhbiBzY2VuZSBmb3IgbWlzc2luZyByZWZzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2ltcG9ydCcsICdkZWxldGUnLCAndmFsaWRhdGVfcmVmZXJlbmNlcycsICdzY2FuX3NjZW5lX3JlZnMnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZURpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIGRpcmVjdG9yeSBwYXRoIChpbXBvcnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldERpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGRpcmVjdG9yeSBVUkwgKGltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZUZpbHRlcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbGUgZXh0ZW5zaW9ucyB0byBpbmNsdWRlLCBlLmcuIFtcIi5wbmdcIiwgXCIuanBnXCJdIChpbXBvcnQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgc3ViZGlyZWN0b3JpZXMgKGltcG9ydCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3ZlcndyaXRlIGV4aXN0aW5nIGZpbGVzIChpbXBvcnQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBhc3NldCBVUkxzIHRvIGRlbGV0ZSAoZGVsZXRlKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSB0byBvcGVyYXRlIG9uICh2YWxpZGF0ZV9yZWZlcmVuY2VzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0X2FkdmFuY2VkJzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2VuZXJhdGVfdXJsJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdlbmVyYXRlQXZhaWxhYmxlVXJsKGFyZ3MudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAncXVlcnlfZGJfcmVhZHknOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlBc3NldERiUmVhZHkoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X2RlcGVuZGVuY2llcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRBc3NldERlcGVuZGVuY2llcyhhcmdzLnVybE9yVVVJRCwgYXJncy5kaXJlY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfdW51c2VkJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFVudXNlZEFzc2V0cyhhcmdzLmRpcmVjdG9yeSwgYXJncy5leGNsdWRlRGlyZWN0b3JpZXMsIGFyZ3MubWF4UmVzdWx0cywgYXJncy5ncm91cEJ5Rm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIGFzc2V0X2FkdmFuY2VkOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0X2JhdGNoJzoge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW1wb3J0JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJhdGNoSW1wb3J0QXNzZXRzKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hEZWxldGVBc3NldHMoYXJncy51cmxzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfcmVmZXJlbmNlcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy52YWxpZGF0ZUFzc2V0UmVmZXJlbmNlcyhhcmdzLmRpcmVjdG9yeSk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NjYW5fc2NlbmVfcmVmcyc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zY2FuU2NlbmVNaXNzaW5nUmVmcygpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgYXNzZXRfYmF0Y2g6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVBdmFpbGFibGVVcmwodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2dlbmVyYXRlLWF2YWlsYWJsZS11cmwnLCB1cmwpLnRoZW4oKGF2YWlsYWJsZVVybDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsVXJsOiB1cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVVcmw6IGF2YWlsYWJsZVVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGF2YWlsYWJsZVVybCA9PT0gdXJsID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnVVJMIGlzIGF2YWlsYWJsZScgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdHZW5lcmF0ZWQgbmV3IGF2YWlsYWJsZSBVUkwnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUFzc2V0RGJSZWFkeSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXJlYWR5JykudGhlbigocmVhZHk6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogcmVhZHkgPyAnQXNzZXQgZGF0YWJhc2UgaXMgcmVhZHknIDogJ0Fzc2V0IGRhdGFiYXNlIGlzIG5vdCByZWFkeSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoSW1wb3J0QXNzZXRzKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXJncy5zb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU291cmNlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmdldEZpbGVzRnJvbURpcmVjdG9yeShcbiAgICAgICAgICAgICAgICBhcmdzLnNvdXJjZURpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICBhcmdzLmZpbGVGaWx0ZXIgfHwgW10sXG4gICAgICAgICAgICAgICAgYXJncy5yZWN1cnNpdmUgfHwgZmFsc2VcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGNvbnN0IGltcG9ydFJlc3VsdHM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBgJHthcmdzLnRhcmdldERpcmVjdG9yeX0vJHtmaWxlTmFtZX1gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCwgdGFyZ2V0UGF0aCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZTogYXJncy5vdmVyd3JpdGUgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuYW1lOiAhKGFyZ3Mub3ZlcndyaXRlIHx8IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldFBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0Py51dWlkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ291bnQrKztcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRSZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudDogc3VjY2Vzc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiBlcnJvckNvdW50LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBpbXBvcnRSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQmF0Y2ggaW1wb3J0IGNvbXBsZXRlZDogJHtzdWNjZXNzQ291bnR9IHN1Y2Nlc3MsICR7ZXJyb3JDb3VudH0gZXJyb3JzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEZpbGVzRnJvbURpcmVjdG9yeShkaXJQYXRoOiBzdHJpbmcsIGZpbGVGaWx0ZXI6IHN0cmluZ1tdLCByZWN1cnNpdmU6IGJvb2xlYW4pOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICAgICAgY29uc3QgZmlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhkaXJQYXRoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIGl0ZW0pO1xuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgICAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUZpbHRlci5sZW5ndGggPT09IDAgfHwgZmlsZUZpbHRlci5zb21lKGV4dCA9PiBpdGVtLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoZXh0LnRvTG93ZXJDYXNlKCkpKSkge1xuICAgICAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSAmJiByZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKC4uLnRoaXMuZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KGZ1bGxQYXRoLCBmaWxlRmlsdGVyLCByZWN1cnNpdmUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmaWxlcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoRGVsZXRlQXNzZXRzKHVybHM6IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVJlc3VsdHM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcblxuICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgdXJscykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudCsrO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogdXJscy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudDogc3VjY2Vzc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiBlcnJvckNvdW50LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBkZWxldGVSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQmF0Y2ggZGVsZXRlIGNvbXBsZXRlZDogJHtzdWNjZXNzQ291bnR9IHN1Y2Nlc3MsICR7ZXJyb3JDb3VudH0gZXJyb3JzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlQXNzZXRSZWZlcmVuY2VzKGRpcmVjdG9yeTogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBHZXQgYWxsIGFzc2V0cyBpbiBkaXJlY3RvcnlcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogYCR7ZGlyZWN0b3J5fS8qKi8qYCB9KTtcblxuICAgICAgICAgICAgY29uc3QgYnJva2VuUmVmZXJlbmNlczogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkUmVmZXJlbmNlczogYW55W10gPSBbXTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBhc3NldCBvZiBhc3NldHMpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXNzZXQudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0SW5mbykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRSZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXNzZXQudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJva2VuUmVmZXJlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogYXNzZXQudXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogKGVyciBhcyBFcnJvcikubWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeTogZGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogYXNzZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRSZWZlcmVuY2VzOiB2YWxpZFJlZmVyZW5jZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzOiBicm9rZW5SZWZlcmVuY2VzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgYnJva2VuQXNzZXRzOiBicm9rZW5SZWZlcmVuY2VzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVmFsaWRhdGlvbiBjb21wbGV0ZWQ6ICR7YnJva2VuUmVmZXJlbmNlcy5sZW5ndGh9IGJyb2tlbiByZWZlcmVuY2VzIGZvdW5kYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNjYW5TY2VuZU1pc3NpbmdSZWZzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBTdGVwIDE6IFdhbGsgbm9kZSB0cmVlLCBjb2xsZWN0IGFsbCBub2RlIFVVSURzXG4gICAgICAgICAgICBjb25zdCBub2RlVHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xuICAgICAgICAgICAgaWYgKCFub2RlVHJlZSkgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHF1ZXJ5IHNjZW5lIG5vZGUgdHJlZScgfTtcblxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgcXVldWU6IGFueVtdID0gW25vZGVUcmVlXTtcbiAgICAgICAgICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGU/LnV1aWQpIG5vZGVVdWlkcy5wdXNoKG5vZGUudXVpZCk7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGU/LmNoaWxkcmVuKSBxdWV1ZS5wdXNoKC4uLm5vZGUuY2hpbGRyZW4pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWRTZXQgPSBuZXcgU2V0KG5vZGVVdWlkcyk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMjogUXVlcnkgYWxsIG5vZGVzIGluIHBhcmFsbGVsIGJhdGNoZXMsIGNvbGxlY3QgVVVJRCByZWZzXG4gICAgICAgICAgICBjb25zdCBOT0RFX0JBVENIID0gMTA7XG4gICAgICAgICAgICBjb25zdCB1dWlkVG9SZWZzID0gbmV3IE1hcDxzdHJpbmcsIHsgbm9kZVV1aWQ6IHN0cmluZzsgbm9kZU5hbWU6IHN0cmluZzsgY29tcG9uZW50VHlwZTogc3RyaW5nOyBwcm9wZXJ0eTogc3RyaW5nIH1bXT4oKTtcblxuICAgICAgICAgICAgLy8gVHJhY2sgY29tcG9uZW50LWluc3RhbmNlIHV1aWRzIHNvIHdlIGNhbiBleGNsdWRlIHRoZW0gZnJvbSBcImFzc2V0XCIgY2FuZGlkYXRlcyBiZWxvdy5cbiAgICAgICAgICAgIGNvbnN0IGNvbXBvbmVudFV1aWRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlVXVpZHMubGVuZ3RoOyBpICs9IE5PREVfQkFUQ0gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYXRjaCA9IG5vZGVVdWlkcy5zbGljZShpLCBpICsgTk9ERV9CQVRDSCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgdXVpZCkuY2F0Y2goKCkgPT4gbnVsbCkpXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHJlc3VsdHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGEgPSByZXN1bHRzW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGVEYXRhPy5fX2NvbXBzX18pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlVXVpZCA9IGJhdGNoW2pdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlTmFtZSA9IG5vZGVEYXRhLm5hbWU/LnZhbHVlID8/IG5vZGVEYXRhLm5hbWUgPz8gbm9kZVV1aWQ7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBub2RlRGF0YS5fX2NvbXBzX18gYXMgYW55W10pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBUeXBlID0gKGNvbXAgYXMgYW55KS5fX3R5cGVfXyB8fCAoY29tcCBhcyBhbnkpLmNpZCB8fCAoY29tcCBhcyBhbnkpLnR5cGUgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29tcG9uZW50IGluc3RhbmNlIHV1aWQgbGl2ZXMgYXQgY29tcC52YWx1ZS51dWlkLnZhbHVlIChyYXcgcXVlcnktbm9kZSBzaGFwZSkgb3IgY29tcC51dWlkLlxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcEluc3RhbmNlVXVpZCA9IChjb21wIGFzIGFueSkudmFsdWU/LnV1aWQ/LnZhbHVlIHx8IChjb21wIGFzIGFueSkudXVpZD8udmFsdWUgfHwgKGNvbXAgYXMgYW55KS51dWlkO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wSW5zdGFuY2VVdWlkID09PSAnc3RyaW5nJyAmJiBjb21wSW5zdGFuY2VVdWlkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRVdWlkU2V0LmFkZChjb21wSW5zdGFuY2VVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdFJlZlV1aWRzKGNvbXAgYXMgYW55LCBjb21wVHlwZSwgbm9kZVV1aWQsIFN0cmluZyhub2RlTmFtZSksIHV1aWRUb1JlZnMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgbm9uLWFzc2V0IHV1aWRzOiBzY2VuZSBub2RlIHV1aWRzIGFuZCBjb21wb25lbnQtaW5zdGFuY2UgdXVpZHMgYm90aCBzdXJmYWNlIGFzIGB7dXVpZH1gXG4gICAgICAgICAgICAvLyByZWZzIGJ1dCBhcmUgbm90IGFzc2V0cyBpbiB0aGUgYXNzZXQtZGIuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHV1aWQgb2Ygbm9kZVV1aWRTZXQpIHV1aWRUb1JlZnMuZGVsZXRlKHV1aWQpO1xuICAgICAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIGNvbXBvbmVudFV1aWRTZXQpIHV1aWRUb1JlZnMuZGVsZXRlKHV1aWQpO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDM6IFZhbGlkYXRlIHVuaXF1ZSBhc3NldCBVVUlEcyBhZ2FpbnN0IGFzc2V0LWRiIGluIHBhcmFsbGVsIGJhdGNoZXNcbiAgICAgICAgICAgIGNvbnN0IHVuaXF1ZVV1aWRzID0gQXJyYXkuZnJvbSh1dWlkVG9SZWZzLmtleXMoKSk7XG4gICAgICAgICAgICBjb25zdCBBU1NFVF9CQVRDSCA9IDIwO1xuICAgICAgICAgICAgY29uc3QgbWlzc2luZ1V1aWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdW5pcXVlVXVpZHMubGVuZ3RoOyBpICs9IEFTU0VUX0JBVENIKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSB1bmlxdWVVdWlkcy5zbGljZShpLCBpICsgQVNTRVRfQkFUQ0gpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICAgICAgYmF0Y2gubWFwKHV1aWQgPT5cbiAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCB1dWlkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuKChpbmZvOiBhbnkpID0+ICh7IHV1aWQsIGV4aXN0czogISFpbmZvIH0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5jYXRjaCgoKSA9PiAoeyB1dWlkLCBleGlzdHM6IGZhbHNlIH0pKVxuICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHsgdXVpZCwgZXhpc3RzIH0gb2YgcmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0cykgbWlzc2luZ1V1aWRzLmFkZCh1dWlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgNDogQnVpbGQgcmVwb3J0XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nUmVmcyA9IEFycmF5LmZyb20obWlzc2luZ1V1aWRzKS5tYXAodXVpZCA9PiAoe1xuICAgICAgICAgICAgICAgIG1pc3NpbmdVdWlkOiB1dWlkLFxuICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRCeTogdXVpZFRvUmVmcy5nZXQodXVpZCkgPz8gW11cbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgdG90YWxOb2Rlczogbm9kZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbmlxdWVBc3NldFJlZnM6IHVuaXF1ZVV1aWRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0NvdW50OiBtaXNzaW5nVXVpZHMuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgbWlzc2luZ1JlZnMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1pc3NpbmdVdWlkcy5zaXplID09PSAwXG4gICAgICAgICAgICAgICAgICAgICAgICA/ICdObyBtaXNzaW5nIGFzc2V0IHJlZmVyZW5jZXMgZm91bmQgaW4gc2NlbmUnXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGBGb3VuZCAke21pc3NpbmdVdWlkcy5zaXplfSBtaXNzaW5nIGFzc2V0IHJlZmVyZW5jZShzKSBhY3Jvc3MgJHttaXNzaW5nUmVmcy5yZWR1Y2UoKG4sIHIpID0+IG4gKyByLnJlZmVyZW5jZWRCeS5sZW5ndGgsIDApfSBjb21wb25lbnQgcHJvcGVydGllc2BcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb2xsZWN0UmVmVXVpZHMoXG4gICAgICAgIGNvbXA6IGFueSxcbiAgICAgICAgY29tcFR5cGU6IHN0cmluZyxcbiAgICAgICAgbm9kZVV1aWQ6IHN0cmluZyxcbiAgICAgICAgbm9kZU5hbWU6IHN0cmluZyxcbiAgICAgICAgdXVpZFRvUmVmczogTWFwPHN0cmluZywgeyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRUeXBlOiBzdHJpbmc7IHByb3BlcnR5OiBzdHJpbmcgfVtdPlxuICAgICk6IHZvaWQge1xuICAgICAgICAvLyBXYWxrIHRoZSBDb2NvcyBxdWVyeS1ub2RlIGNvbXBvbmVudCBzaGFwZS4gRWRpdGFibGUgZmllbGRzIGxpdmUgdW5kZXIgZWl0aGVyIGBjb21wLnZhbHVlYFxuICAgICAgICAvLyAocmF3IHNjZW5lIHBheWxvYWQpIG9yIGRpcmVjdGx5IG9uIGBjb21wYCAoc29tZSBidWlsZHMpLiBFYWNoIGZpZWxkIGlzIGEgZGVzY3JpcHRvciBvZiB0aGVcbiAgICAgICAgLy8gZm9ybSBgeyBuYW1lLCB2YWx1ZSwgdHlwZSwgLi4uIH1gIHdoZXJlIGB2YWx1ZWAgaG9sZHMgdGhlIGFjdHVhbCBkYXRhLlxuICAgICAgICAvLyBXZSBhdHRyaWJ1dGUgcmVmcyB0byB0aGUgT1VURVIga2V5IChlLmcuIGBjYW1lcmFDb21wb25lbnRgKSwgbm90IHRoZSBkZXNjcmlwdG9yJ3MgbGl0ZXJhbCBgdmFsdWVgLlxuICAgICAgICBjb25zdCBpc0Rlc2NyaXB0b3IgPSAodjogYW55KTogYm9vbGVhbiA9PlxuICAgICAgICAgICAgdiAmJiB0eXBlb2YgdiA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodikgJiYgJ3ZhbHVlJyBpbiB2ICYmICgndHlwZScgaW4gdiB8fCAnbmFtZScgaW4gdik7XG5cbiAgICAgICAgY29uc3Qgc2VlbiA9IG5ldyBXZWFrU2V0PG9iamVjdD4oKTtcbiAgICAgICAgY29uc3QgcmVjb3JkUmVmID0gKHV1aWQ6IHN0cmluZywgcHJvcE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgaWYgKCF1dWlkVG9SZWZzLmhhcyh1dWlkKSkgdXVpZFRvUmVmcy5zZXQodXVpZCwgW10pO1xuICAgICAgICAgICAgdXVpZFRvUmVmcy5nZXQodXVpZCkhLnB1c2goeyBub2RlVXVpZCwgbm9kZU5hbWUsIGNvbXBvbmVudFR5cGU6IGNvbXBUeXBlLCBwcm9wZXJ0eTogcHJvcE5hbWUgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgd2Fsa1ZhbHVlID0gKHZhbDogYW55LCBwcm9wTmFtZTogc3RyaW5nLCBkZXB0aDogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICBpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkIHx8IGRlcHRoID4gMTIpIHJldHVybjtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHNlZW4uaGFzKHZhbCkpIHJldHVybjtcbiAgICAgICAgICAgIHNlZW4uYWRkKHZhbCk7XG5cbiAgICAgICAgICAgIC8vIEFycmF5OiByZWN1cnNlIGVhY2ggaXRlbSwga2VlcCBwcm9wTmFtZVxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWwpIHdhbGtWYWx1ZShpdGVtLCBwcm9wTmFtZSwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERpcmVjdCByZWYgc2hhcGUgYHsgdXVpZCB9YCBvciBgeyBfX3V1aWRfXyB9YC4gRmlsdGVyIGVtcHR5IHN0cmluZ3MgKHVuc2V0IHNsb3RzKS5cbiAgICAgICAgICAgIGNvbnN0IHV1aWQgPSAodmFsIGFzIGFueSkudXVpZCA/PyAodmFsIGFzIGFueSkuX191dWlkX187XG4gICAgICAgICAgICBpZiAodHlwZW9mIHV1aWQgPT09ICdzdHJpbmcnICYmIHV1aWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJlY29yZFJlZih1dWlkLCBwcm9wTmFtZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXNjcmlwdG9yIHdyYXBwZXIgYHsgbmFtZSwgdmFsdWUsIHR5cGUsIC4uLiB9YCDigJQgcmVjdXJzZSBpbnRvIGB2YWx1ZWAgb25seSwga2VlcCBwcm9wTmFtZS5cbiAgICAgICAgICAgIGlmIChpc0Rlc2NyaXB0b3IodmFsKSkge1xuICAgICAgICAgICAgICAgIHdhbGtWYWx1ZSgodmFsIGFzIGFueSkudmFsdWUsIHByb3BOYW1lLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUGxhaW4gb2JqZWN0OiBlYWNoIG93biBrZXkgYmVjb21lcyB0aGUgbmV3IHByb3BOYW1lIGZvciBpdHMgc3VidHJlZS5cbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHZhbCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7IC8vIHNraXAgcHJpdmF0ZSBtaXJyb3JzIGxpa2UgYF9jb2xvcmBcbiAgICAgICAgICAgICAgICB3YWxrVmFsdWUoKHZhbCBhcyBhbnkpW2tleV0sIGtleSwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBUb3AtbGV2ZWw6IGhhbmRsZSBib3RoIHNoYXBlcyAoYGNvbXAudmFsdWVgIHdyYXBwZXIgYW5kIGRpcmVjdCkuXG4gICAgICAgIGNvbnN0IHJvb3QgPSBjb21wICYmIHR5cGVvZiBjb21wID09PSAnb2JqZWN0JyAmJiBjb21wLnZhbHVlICYmIHR5cGVvZiBjb21wLnZhbHVlID09PSAnb2JqZWN0JyA/IGNvbXAudmFsdWUgOiBjb21wO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhyb290KSkge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xuICAgICAgICAgICAgLy8gU2tpcCB3cmFwcGVyIG1ldGFkYXRhIGtleXMgYXQgdGhlIGNvbXBvbmVudCByb290LlxuICAgICAgICAgICAgaWYgKFsnX190eXBlX18nLCAnY2lkJywgJ2VuYWJsZWQnLCAndHlwZScsICduYW1lJywgJ3V1aWQnXS5pbmNsdWRlcyhrZXkpKSBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIGBub2RlYCBpcyB0aGUgYmFjay1wb2ludGVyIHRvIHRoZSBvd25pbmcgbm9kZSDigJQgbmV2ZXIgYW4gYXNzZXQuXG4gICAgICAgICAgICBpZiAoa2V5ID09PSAnbm9kZScpIGNvbnRpbnVlO1xuICAgICAgICAgICAgd2Fsa1ZhbHVlKChyb290IGFzIGFueSlba2V5XSwga2V5LCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0QXNzZXREZXBlbmRlbmNpZXModXJsT3JVVUlEOiBzdHJpbmcsIGRpcmVjdGlvbjogc3RyaW5nID0gJ2RlcGVuZGVuY2llcycpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSBhc3NldCBVVUlEIGFuZCBVUkxcbiAgICAgICAgICAgIGxldCBhc3NldFV1aWQ6IHN0cmluZztcbiAgICAgICAgICAgIGxldCBhc3NldFVybDogc3RyaW5nO1xuXG4gICAgICAgICAgICBpZiAodXJsT3JVVUlELnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICBhc3NldFVybCA9IHVybE9yVVVJRDtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHVybE9yVVVJRCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbmZvPy51dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQgPSBpbmZvLnV1aWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IHVybE9yVVVJRDtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCB1cmxPclVVSUQpO1xuICAgICAgICAgICAgICAgIGlmICghdXJsKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcbiAgICAgICAgICAgICAgICBhc3NldFVybCA9IHVybDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xuXG4gICAgICAgICAgICAvLyBDb2xsZWN0IGFsbCBVVUlEcyBmb3IgdGhpcyBhc3NldCAobWFpbiArIHN1Yi1hc3NldHMgZnJvbSAubWV0YSlcbiAgICAgICAgICAgIGNvbnN0IGFsbEFzc2V0VXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oW2Fzc2V0VXVpZF0pO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgIGlmIChmc1BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YVBhdGggPSBmc1BhdGggKyAnLm1ldGEnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhtZXRhUGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhtZXRhUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RTdWJVdWlkcyhtZXRhLnN1Yk1ldGFzLCBhbGxBc3NldFV1aWRzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgbWV0YSByZWFkIGVycm9ycyAqLyB9XG5cbiAgICAgICAgICAgIGNvbnN0IGRlcGVuZGVuY2llczogQXJyYXk8eyB1dWlkOiBzdHJpbmc7IHVybDogc3RyaW5nIH0+ID0gW107XG4gICAgICAgICAgICBjb25zdCBkZXBlbmRlbnRzOiBBcnJheTx7IHVybDogc3RyaW5nIH0+ID0gW107XG5cbiAgICAgICAgICAgIC8vIEZpbmQgZGVwZW5kZW5jaWVzOiBhc3NldHMgdGhpcyBmaWxlIHJlZmVyZW5jZXMgdmlhIF9fdXVpZF9fIGFuZCBfX3R5cGVfX1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2RlcGVuZGVuY2llcycgfHwgZGlyZWN0aW9uID09PSAnYm90aCcpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnNQYXRoICYmIGZzLmV4aXN0c1N5bmMoZnNQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX191dWlkX18gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCByZWYgb2YgcmVmVXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHJlZi5zcGxpdCgnQCcpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWVuLmhhcyhiYXNlVXVpZCkgfHwgYWxsQXNzZXRVdWlkcy5oYXMoYmFzZVV1aWQpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVuLmFkZChiYXNlVXVpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBiYXNlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHsgdXVpZDogYmFzZVV1aWQsIHVybDogcmVmVXJsIHx8ICd1bnJlc29sdmVkJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBiYXNlVXVpZCwgdXJsOiAndW5yZXNvbHZlZCcgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IF9fdHlwZV9fIHJlZmVyZW5jZXMgKGN1c3RvbSBzY3JpcHQgY29tcG9uZW50cyB1c2UgY29tcHJlc3NlZCBVVUlEcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZHMgPSB0aGlzLmV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHR5cGVJZCBvZiB0eXBlSWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb21wcmVzc2VkID0gdGhpcy5kZWNvbXByZXNzVXVpZCh0eXBlSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZGVjb21wcmVzc2VkIHx8IHNlZW4uaGFzKGRlY29tcHJlc3NlZCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZW4uYWRkKGRlY29tcHJlc3NlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXJsID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXJsJywgZGVjb21wcmVzc2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlZlVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBkZWNvbXByZXNzZWQsIHVybDogcmVmVXJsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIG5vdCBhIHZhbGlkIHNjcmlwdCBVVUlEICovIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBpZ25vcmUgcmVhZCBlcnJvcnMgKi8gfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaW5kIGRlcGVuZGVudHM6IHNlcmlhbGl6ZWQgZmlsZXMgdGhhdCByZWZlcmVuY2UgdGhpcyBhc3NldCdzIFVVSURzXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZGVwZW5kZW50cycgfHwgZGlyZWN0aW9uID09PSAnYm90aCcpIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCBzZWFyY2ggc3RyaW5nczogb3JpZ2luYWwgVVVJRHMgKyBjb21wcmVzc2VkIGZvcm1zIGZvciBfX3R5cGVfXyBtYXRjaGluZ1xuICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaFN0cmluZ3MgPSBuZXcgU2V0PHN0cmluZz4oYWxsQXNzZXRVdWlkcyk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1aWQgb2YgYWxsQXNzZXRVdWlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gdGhpcy5jb21wcmVzc1V1aWQodWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgc2VhcmNoU3RyaW5ncy5hZGQoY29tcHJlc3NlZCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy53YWxrU2VyaWFsaXplZEZpbGVzKGFzc2V0c1BhdGgsIChmaWxlUGF0aCwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN0ciBvZiBzZWFyY2hTdHJpbmdzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGVudC5pbmNsdWRlcyhzdHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVVybCA9ICdkYjovLycgKyBmaWxlUGF0aC5zdWJzdHJpbmcocHJvamVjdFBhdGgubGVuZ3RoICsgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVVcmwgIT09IGFzc2V0VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHMucHVzaCh7IHVybDogZmlsZVVybCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXQ6IHsgdXVpZDogYXNzZXRVdWlkLCB1cmw6IGFzc2V0VXJsLCBhbGxVdWlkczogQXJyYXkuZnJvbShhbGxBc3NldFV1aWRzKSB9LFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHMsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llc0NvdW50OiBkZXBlbmRlbmNpZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbnRzQ291bnQ6IGRlcGVuZGVudHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHtkZXBlbmRlbmNpZXMubGVuZ3RofSBkZXBlbmRlbmNpZXMgYW5kICR7ZGVwZW5kZW50cy5sZW5ndGh9IGRlcGVuZGVudHMgZm9yICR7YXNzZXRVcmx9YFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEZXBlbmRlbmN5IGFuYWx5c2lzIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFVudXNlZEFzc2V0cyhkaXJlY3Rvcnk6IHN0cmluZyA9ICdkYjovL2Fzc2V0cycsIGV4Y2x1ZGVEaXJlY3Rvcmllczogc3RyaW5nW10gPSBbXSwgbWF4UmVzdWx0czogbnVtYmVyID0gNTAsIGdyb3VwQnlGb2xkZXI6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgICAgICBjb25zdCBiYXNlUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgZGlyZWN0b3J5LnJlcGxhY2UoJ2RiOi8vJywgJycpKTtcblxuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGJhc2VQYXRoKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERpcmVjdG9yeSBub3QgZm91bmQ6ICR7ZGlyZWN0b3J5fWAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCAxOiBCdWlsZCBVVUlEIC0+IGFzc2V0IFVSTCBtYXAgZnJvbSAubWV0YSBmaWxlc1xuICAgICAgICAgICAgLy8gQWxzbyBidWlsZCBjb21wcmVzc2VkIFVVSUQgbWFwIGZvciBfX3R5cGVfXyBtYXRjaGluZyAoc2NyaXB0IGNvbXBvbmVudHMpXG4gICAgICAgICAgICBjb25zdCB1dWlkVG9VcmwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZFRvVXJsID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNvbnN0IGFsbEFzc2V0czogQXJyYXk8eyB1cmw6IHN0cmluZzsgZXh0OiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KGJhc2VQYXRoLCAoZmlsZVBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGVQYXRoLmVuZHNXaXRoKCcubWV0YScpKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldEZzUGF0aCA9IGZpbGVQYXRoLnNsaWNlKDAsIC01KTsgLy8gUmVtb3ZlIC5tZXRhIHN1ZmZpeFxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0VXJsID0gJ2RiOi8vJyArIGFzc2V0RnNQYXRoLnN1YnN0cmluZyhwcm9qZWN0UGF0aC5sZW5ndGggKyAxKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGV4Y2x1ZGUgZGlyZWN0b3JpZXNcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGV4Y2wgb2YgZXhjbHVkZURpcmVjdG9yaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldFVybC5zdGFydHNXaXRoKGV4Y2wpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2tpcCBpZiBhY3R1YWwgYXNzZXQgZG9lc24ndCBleGlzdCBvciBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhc3NldEZzUGF0aCkgfHwgZnMuc3RhdFN5bmMoYXNzZXRGc1BhdGgpLmlzRGlyZWN0b3J5KCkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgcmV0dXJuOyB9XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4JykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoYXNzZXRGc1BhdGgpLnRvTG93ZXJDYXNlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgYWxsQXNzZXRzLnB1c2goeyB1cmw6IGFzc2V0VXJsLCBleHQgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIG1haW4gVVVJRCB0byBhc3NldCBVUkxcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1ldGEudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZFRvVXJsLnNldChtZXRhLnV1aWQsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZChtZXRhLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgc3ViLWFzc2V0IFVVSURzIHRvIHBhcmVudCBhc3NldCBVUkxcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViVXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0U3ViVXVpZHMobWV0YS5zdWJNZXRhcywgc3ViVXVpZHMpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHN1YlV1aWQgb2Ygc3ViVXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRUb1VybC5zZXQoc3ViVXVpZCwgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZCA9IHRoaXMuY29tcHJlc3NVdWlkKHN1YlV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoID09PSAyMikgY29tcHJlc3NlZFRvVXJsLnNldChjb21wcmVzc2VkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogc2tpcCB1bnBhcnNlYWJsZSBtZXRhIGZpbGVzICovIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDI6IFNjYW4gQUxMIHNlcmlhbGl6ZWQgZmlsZXMgaW4gZW50aXJlIGFzc2V0cyBmb2xkZXIgKG5vdCBqdXN0IHRhcmdldCBkaXJlY3RvcnkpXG4gICAgICAgICAgICAvLyBiZWNhdXNlIHNjZW5lcy9wcmVmYWJzIHJlZmVyZW5jaW5nIHRhcmdldCBhc3NldHMgbWF5IGJlIGluIG90aGVyIGZvbGRlcnNcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0c1BhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsICdhc3NldHMnKTtcbiAgICAgICAgICAgIGNvbnN0IHJlZmVyZW5jZWRVcmxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgIHRoaXMud2Fsa1NlcmlhbGl6ZWRGaWxlcyhhc3NldHNQYXRoLCAoX2ZpbGVQYXRoLCBjb250ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgX191dWlkX18gcmVmZXJlbmNlcyAoaW1hZ2VzLCBwcmVmYWJzLCBtYXRlcmlhbHMsIGV0Yy4pXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiB1dWlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHV1aWQuc3BsaXQoJ0AnKVswXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gdXVpZFRvVXJsLmdldChiYXNlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1cmwpIHJlZmVyZW5jZWRVcmxzLmFkZCh1cmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIF9fdHlwZV9fIHJlZmVyZW5jZXMgKHNjcmlwdCBjb21wb25lbnRzIHVzZSBjb21wcmVzc2VkIFVVSURzKVxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVJZHMgPSB0aGlzLmV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0eXBlSWQgb2YgdHlwZUlkcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBjb21wcmVzc2VkVG9VcmwuZ2V0KHR5cGVJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1cmwpIHJlZmVyZW5jZWRVcmxzLmFkZCh1cmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDM6IEZpbmQgdW51c2VkIGFzc2V0cywgc2VwYXJhdGUgc2NyaXB0cyBmcm9tIG90aGVyIGFzc2V0c1xuICAgICAgICAgICAgY29uc3Qgc2NyaXB0RXh0cyA9IFsnLnRzJywgJy5qcyddO1xuICAgICAgICAgICAgY29uc3QgYWxsVW51c2VkQXNzZXRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgYWxsVW51c2VkU2NyaXB0czogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBhc3NldCBvZiBhbGxBc3NldHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlZmVyZW5jZWRVcmxzLmhhcyhhc3NldC51cmwpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzY3JpcHRFeHRzLmluY2x1ZGVzKGFzc2V0LmV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbFVudXNlZFNjcmlwdHMucHVzaChhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsVW51c2VkQXNzZXRzLnB1c2goYXNzZXQudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdG90YWxVbnVzZWRBc3NldHMgPSBhbGxVbnVzZWRBc3NldHMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgdG90YWxVbnVzZWRTY3JpcHRzID0gYWxsVW51c2VkU2NyaXB0cy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBsaW1pdCA9IE1hdGgubWF4KDEsIG1heFJlc3VsdHMpO1xuXG4gICAgICAgICAgICBpZiAoZ3JvdXBCeUZvbGRlcikge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGJ5IHBhcmVudCBmb2xkZXIgd2l0aCBjb3VudHNcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJNYXAgPSBuZXcgTWFwPHN0cmluZywgeyBhc3NldHM6IG51bWJlcjsgc2NyaXB0czogbnVtYmVyOyBzYW1wbGVzOiBzdHJpbmdbXSB9PigpO1xuXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgYWxsVW51c2VkQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGZvbGRlck1hcC5nZXQoZm9sZGVyKSB8fCB7IGFzc2V0czogMCwgc2NyaXB0czogMCwgc2FtcGxlczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkuYXNzZXRzKys7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbnRyeS5zYW1wbGVzLmxlbmd0aCA8IDMpIGVudHJ5LnNhbXBsZXMucHVzaCh1cmwuc3Vic3RyaW5nKHVybC5sYXN0SW5kZXhPZignLycpICsgMSkpO1xuICAgICAgICAgICAgICAgICAgICBmb2xkZXJNYXAuc2V0KGZvbGRlciwgZW50cnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBhbGxVbnVzZWRTY3JpcHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlciA9IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxhc3RJbmRleE9mKCcvJykpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRyeSA9IGZvbGRlck1hcC5nZXQoZm9sZGVyKSB8fCB7IGFzc2V0czogMCwgc2NyaXB0czogMCwgc2FtcGxlczogW10gfTtcbiAgICAgICAgICAgICAgICAgICAgZW50cnkuc2NyaXB0cysrO1xuICAgICAgICAgICAgICAgICAgICBmb2xkZXJNYXAuc2V0KGZvbGRlciwgZW50cnkpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNvcnQgYnkgdG90YWwgY291bnQgZGVzY2VuZGluZywgbGltaXQgcmVzdWx0c1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlcnMgPSBBcnJheS5mcm9tKGZvbGRlck1hcC5lbnRyaWVzKCkpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKFtmb2xkZXIsIGRhdGFdKSA9PiAoeyBmb2xkZXIsIC4uLmRhdGEsIHRvdGFsOiBkYXRhLmFzc2V0cyArIGRhdGEuc2NyaXB0cyB9KSlcbiAgICAgICAgICAgICAgICAgICAgLnNvcnQoKGEsIGIpID0+IGIudG90YWwgLSBhLnRvdGFsKVxuICAgICAgICAgICAgICAgICAgICAuc2xpY2UoMCwgbGltaXQpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFsbEFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VkQ291bnQ6IHJlZmVyZW5jZWRVcmxzLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnVzZWRDb3VudDogdG90YWxVbnVzZWRBc3NldHMgKyB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnVzZWRBc3NldENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZFNjcmlwdENvdW50OiB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVyc1Nob3duOiBmb2xkZXJzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsRm9sZGVyczogZm9sZGVyTWFwLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHt0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0c30gdW51c2VkIGl0ZW1zIGFjcm9zcyAke2ZvbGRlck1hcC5zaXplfSBmb2xkZXJzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vdGU6ICdBc3NldHMgbG9hZGVkIGR5bmFtaWNhbGx5IChlLmcuIHJlc291cmNlcy5sb2FkKSBtYXkgc3RpbGwgYXBwZWFyIHVudXNlZC4gUmV2aWV3IGJlZm9yZSBkZWxldGluZy4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGbGF0IGxpc3Qgd2l0aCBtYXhSZXN1bHRzIGxpbWl0XG4gICAgICAgICAgICBjb25zdCB1bnVzZWRBc3NldHMgPSBhbGxVbnVzZWRBc3NldHMuc29ydCgpLnNsaWNlKDAsIGxpbWl0KTtcbiAgICAgICAgICAgIGNvbnN0IHVudXNlZFNjcmlwdHMgPSBhbGxVbnVzZWRTY3JpcHRzLnNvcnQoKS5zbGljZSgwLCBsaW1pdCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFsbEFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRDb3VudDogcmVmZXJlbmNlZFVybHMuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkQ291bnQ6IHRvdGFsVW51c2VkQXNzZXRzICsgdG90YWxVbnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICB1bnVzZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIHVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgIHNob3dpbmc6IHVudXNlZEFzc2V0cy5sZW5ndGggKyB1bnVzZWRTY3JpcHRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgdHJ1bmNhdGVkOiB0b3RhbFVudXNlZEFzc2V0cyA+IGxpbWl0IHx8IHRvdGFsVW51c2VkU2NyaXB0cyA+IGxpbWl0LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgRm91bmQgJHt0b3RhbFVudXNlZEFzc2V0c30gdW51c2VkIGFzc2V0cyBhbmQgJHt0b3RhbFVudXNlZFNjcmlwdHN9IHVudXNlZCBzY3JpcHRzIChzaG93aW5nIHVwIHRvICR7bGltaXR9IGVhY2gpYCxcbiAgICAgICAgICAgICAgICAgICAgbm90ZTogJ0Fzc2V0cyBsb2FkZWQgZHluYW1pY2FsbHkgKGUuZy4gcmVzb3VyY2VzLmxvYWQpIG1heSBzdGlsbCBhcHBlYXIgdW51c2VkLiBVc2UgZ3JvdXBCeUZvbGRlcjp0cnVlIGZvciBvdmVydmlldy4gUmV2aWV3IGJlZm9yZSBkZWxldGluZy4nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVudXNlZCBhc3NldCBkZXRlY3Rpb24gZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIC0tLSBIZWxwZXIgbWV0aG9kcyBmb3IgZGVwZW5kZW5jeSBhbmQgdW51c2VkIGFzc2V0IGFuYWx5c2lzIC0tLVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0VXVpZHNGcm9tQ29udGVudChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHV1aWRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gL1wiX191dWlkX19cIlxccyo6XFxzKlwiKFteXCJdKylcIi9nO1xuICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICB1dWlkcy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdXVpZHM7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBjb2xsZWN0U3ViVXVpZHMoc3ViTWV0YXM6IGFueSwgdXVpZHM6IFNldDxzdHJpbmc+KTogdm9pZCB7XG4gICAgICAgIGlmICghc3ViTWV0YXMgfHwgdHlwZW9mIHN1Yk1ldGFzICE9PSAnb2JqZWN0JykgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzdWJNZXRhcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHN1YiA9IHN1Yk1ldGFzW2tleV07XG4gICAgICAgICAgICBpZiAoc3ViPy51dWlkKSB1dWlkcy5hZGQoc3ViLnV1aWQpO1xuICAgICAgICAgICAgaWYgKHN1Yj8uc3ViTWV0YXMpIHRoaXMuY29sbGVjdFN1YlV1aWRzKHN1Yi5zdWJNZXRhcywgdXVpZHMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB3YWxrRGlyZWN0b3J5KGRpcjogc3RyaW5nLCBjYWxsYmFjazogKGZpbGVQYXRoOiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHJldHVybjtcbiAgICAgICAgY29uc3QgZW50cmllcyA9IGZzLnJlYWRkaXJTeW5jKGRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pO1xuICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XG4gICAgICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgICAgIGlmIChlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSB8fCBlbnRyeS5uYW1lID09PSAnbm9kZV9tb2R1bGVzJykgY29udGludWU7XG4gICAgICAgICAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KGZ1bGxQYXRoLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgd2Fsa1NlcmlhbGl6ZWRGaWxlcyhkaXI6IHN0cmluZywgY2FsbGJhY2s6IChmaWxlUGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZXh0ZW5zaW9ucyA9IFsnLnNjZW5lJywgJy5wcmVmYWInLCAnLmFuaW0nLCAnLm10bCcsICcuZWZmZWN0J107XG4gICAgICAgIHRoaXMud2Fsa0RpcmVjdG9yeShkaXIsIChmaWxlUGF0aCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGZpbGVQYXRoKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKCFleHRlbnNpb25zLmluY2x1ZGVzKGV4dCkpIHJldHVybjtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmaWxlUGF0aCwgY29udGVudCk7XG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogc2tpcCBiaW5hcnkgb3IgdW5yZWFkYWJsZSBmaWxlcyAqLyB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgZXh0cmFjdFR5cGVJZHNGcm9tQ29udGVudChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IHR5cGVJZHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSAvXCJfX3R5cGVfX1wiXFxzKjpcXHMqXCIoW15cIl0rKVwiL2c7XG4gICAgICAgIGxldCBtYXRjaDtcbiAgICAgICAgd2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIC8vIFNraXAgYnVpbHQtaW4gQ29jb3MgdHlwZXMgKGNjLk5vZGUsIGNjLlNwcml0ZSwgZXRjLilcbiAgICAgICAgICAgIGlmICghbWF0Y2hbMV0uc3RhcnRzV2l0aCgnY2MuJykpIHtcbiAgICAgICAgICAgICAgICB0eXBlSWRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0eXBlSWRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbXByZXNzIGEgc3RhbmRhcmQgVVVJRCB0byBDb2NvcyBDcmVhdG9yJ3MgMjItY2hhciBmb3JtYXQgdXNlZCBpbiBfX3R5cGVfXy5cbiAgICAgKiBGb3JtYXQ6IGZpcnN0IDIgaGV4IGNoYXJzIGtlcHQgKyAxMCBwYWlycyBvZiBiYXNlNjQgY2hhcnMgKGVuY29kaW5nIHJlbWFpbmluZyAzMCBoZXggY2hhcnMpLlxuICAgICAqL1xuICAgIHByaXZhdGUgY29tcHJlc3NVdWlkKHV1aWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgICAgIGNvbnN0IEJBU0U2NF9LRVlTID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuICAgICAgICBjb25zdCBoZXggPSB1dWlkLnJlcGxhY2UoLy0vZywgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIGlmIChoZXgubGVuZ3RoICE9PSAzMikgcmV0dXJuIHV1aWQ7XG5cbiAgICAgICAgbGV0IHJlc3VsdCA9IGhleFswXSArIGhleFsxXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPCAzMjsgaSArPSAzKSB7XG4gICAgICAgICAgICBjb25zdCB2YWwgPSAocGFyc2VJbnQoaGV4W2ldLCAxNikgPDwgOCkgfCAocGFyc2VJbnQoaGV4W2kgKyAxXSwgMTYpIDw8IDQpIHwgcGFyc2VJbnQoaGV4W2kgKyAyXSwgMTYpO1xuICAgICAgICAgICAgcmVzdWx0ICs9IEJBU0U2NF9LRVlTW3ZhbCA+PiA2XTtcbiAgICAgICAgICAgIHJlc3VsdCArPSBCQVNFNjRfS0VZU1t2YWwgJiAweDNGXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0OyAvLyAyICsgMjAgPSAyMiBjaGFyc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIERlY29tcHJlc3MgYSAyMi1jaGFyIENvY29zIENyZWF0b3IgY29tcHJlc3NlZCBVVUlEIGJhY2sgdG8gc3RhbmRhcmQgVVVJRCBmb3JtYXQuXG4gICAgICogUmV0dXJucyBudWxsIGlmIHRoZSBpbnB1dCBpcyBub3QgYSB2YWxpZCBjb21wcmVzc2VkIFVVSUQuXG4gICAgICovXG4gICAgcHJpdmF0ZSBkZWNvbXByZXNzVXVpZChjb21wcmVzc2VkOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAgICAgaWYgKGNvbXByZXNzZWQubGVuZ3RoICE9PSAyMikgcmV0dXJuIG51bGw7XG5cbiAgICAgICAgY29uc3QgQkFTRTY0X0tFWVMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG4gICAgICAgIGNvbnN0IEJBU0U2NF9WQUxVRVMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEJBU0U2NF9LRVlTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBCQVNFNjRfVkFMVUVTLnNldChCQVNFNjRfS0VZU1tpXSwgaSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgSEVYID0gJzAxMjM0NTY3ODlhYmNkZWYnO1xuXG4gICAgICAgIGxldCBoZXggPSBjb21wcmVzc2VkWzBdICsgY29tcHJlc3NlZFsxXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPCAyMjsgaSArPSAyKSB7XG4gICAgICAgICAgICBjb25zdCBsaHMgPSBCQVNFNjRfVkFMVUVTLmdldChjb21wcmVzc2VkW2ldKTtcbiAgICAgICAgICAgIGNvbnN0IHJocyA9IEJBU0U2NF9WQUxVRVMuZ2V0KGNvbXByZXNzZWRbaSArIDFdKTtcbiAgICAgICAgICAgIGlmIChsaHMgPT09IHVuZGVmaW5lZCB8fCByaHMgPT09IHVuZGVmaW5lZCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICBoZXggKz0gSEVYW2xocyA+PiAyXTtcbiAgICAgICAgICAgIGhleCArPSBIRVhbKChsaHMgJiAzKSA8PCAyKSB8IChyaHMgPj4gNCldO1xuICAgICAgICAgICAgaGV4ICs9IEhFWFtyaHMgJiAweEZdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5zZXJ0IGRhc2hlczogeHh4eHh4eHgteHh4eC14eHh4LXh4eHgteHh4eHh4eHh4eHh4XG4gICAgICAgIHJldHVybiBoZXguc2xpY2UoMCwgOCkgKyAnLScgKyBoZXguc2xpY2UoOCwgMTIpICsgJy0nICsgaGV4LnNsaWNlKDEyLCAxNikgKyAnLScgKyBoZXguc2xpY2UoMTYsIDIwKSArICctJyArIGhleC5zbGljZSgyMCk7XG4gICAgfVxufVxuIl19