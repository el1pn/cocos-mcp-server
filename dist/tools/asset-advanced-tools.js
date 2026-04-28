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
                description: 'Advanced asset operations: generate available URLs, check DB readiness, get dependencies, find unused assets. Use the "action" parameter to select the operation.',
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
                            description: 'Asset URL or UUID (used by: get_dependencies)'
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
                description: 'Batch asset operations: import, delete, validate references, scan scene for missing refs. Use the "action" parameter to select the operation.',
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
                            description: 'Directory to operate on (used by: validate_references)',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLGtCQUFrQjtJQUMzQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxtS0FBbUs7Z0JBQ2hMLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx1QkFBdUI7NEJBQ3BDLElBQUksRUFBRSxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxZQUFZLENBQUM7eUJBQzdFO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsK0NBQStDO3lCQUMvRDt3QkFDRCxHQUFHLEVBQUU7NEJBQ0QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLGlFQUFpRTt5QkFDakY7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxrREFBa0Q7NEJBQy9ELElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDOzRCQUM1QyxPQUFPLEVBQUUsY0FBYzt5QkFDMUI7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5Q0FBeUM7NEJBQ3RELE9BQU8sRUFBRSxhQUFhO3lCQUN6Qjt3QkFDRCxrQkFBa0IsRUFBRTs0QkFDaEIsSUFBSSxFQUFFLE9BQU87NEJBQ2IsS0FBSyxFQUFF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LE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssU0FBUztnQkFBRSxPQUFPLElBQUksQ0FBQztZQUN4RCxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQixHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMxQixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDOUgsQ0FBQztDQUNKO0FBbDNCRCxnREFrM0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEFzc2V0QWR2YW5jZWRUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2FkdmFuY2VkJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkIGFzc2V0IG9wZXJhdGlvbnM6IGdlbmVyYXRlIGF2YWlsYWJsZSBVUkxzLCBjaGVjayBEQiByZWFkaW5lc3MsIGdldCBkZXBlbmRlbmNpZXMsIGZpbmQgdW51c2VkIGFzc2V0cy4gVXNlIHRoZSBcImFjdGlvblwiIHBhcmFtZXRlciB0byBzZWxlY3QgdGhlIG9wZXJhdGlvbi4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmF0ZV91cmwnLCAncXVlcnlfZGJfcmVhZHknLCAnZ2V0X2RlcGVuZGVuY2llcycsICdnZXRfdW51c2VkJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxPclVVSUQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCBvciBVVUlEICh1c2VkIGJ5OiBnZXRfZGVwZW5kZW5jaWVzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCB0byBnZW5lcmF0ZSBhdmFpbGFibGUgVVJMIGZvciAodXNlZCBieTogZ2VuZXJhdGVfdXJsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlcGVuZGVuY3kgZGlyZWN0aW9uICh1c2VkIGJ5OiBnZXRfZGVwZW5kZW5jaWVzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydkZXBlbmRlbnRzJywgJ2RlcGVuZGVuY2llcycsICdib3RoJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RlcGVuZGVuY2llcydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSB0byBzY2FuICh1c2VkIGJ5OiBnZXRfdW51c2VkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVEaXJlY3Rvcmllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yaWVzIHRvIGV4Y2x1ZGUgZnJvbSBzY2FuICh1c2VkIGJ5OiBnZXRfdW51c2VkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXhpbXVtIG51bWJlciBvZiB1bnVzZWQgYXNzZXRzIHRvIHJldHVybiAodXNlZCBieTogZ2V0X3VudXNlZCkuIERlZmF1bHQ6IDUwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwQnlGb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHcm91cCByZXN1bHRzIGJ5IGZvbGRlciB3aXRoIGNvdW50cyBpbnN0ZWFkIG9mIGxpc3RpbmcgZXZlcnkgZmlsZSAodXNlZCBieTogZ2V0X3VudXNlZCkuIERlZmF1bHQ6IGZhbHNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2JhdGNoJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0JhdGNoIGFzc2V0IG9wZXJhdGlvbnM6IGltcG9ydCwgZGVsZXRlLCB2YWxpZGF0ZSByZWZlcmVuY2VzLCBzY2FuIHNjZW5lIGZvciBtaXNzaW5nIHJlZnMuIFVzZSB0aGUgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgdG8gc2VsZWN0IHRoZSBvcGVyYXRpb24uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnaW1wb3J0JywgJ2RlbGV0ZScsICd2YWxpZGF0ZV9yZWZlcmVuY2VzJywgJ3NjYW5fc2NlbmVfcmVmcyddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlRGlyZWN0b3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb3VyY2UgZGlyZWN0b3J5IHBhdGggKHVzZWQgYnk6IGltcG9ydCknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RGlyZWN0b3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgZGlyZWN0b3J5IFVSTCAodXNlZCBieTogaW1wb3J0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlRmlsdGVyOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmlsZSBleHRlbnNpb25zIHRvIGluY2x1ZGUsIGUuZy4gW1wiLnBuZ1wiLCBcIi5qcGdcIl0gKHVzZWQgYnk6IGltcG9ydCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBzdWJkaXJlY3RvcmllcyAodXNlZCBieTogaW1wb3J0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvdmVyd3JpdGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPdmVyd3JpdGUgZXhpc3RpbmcgZmlsZXMgKHVzZWQgYnk6IGltcG9ydCknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIGFzc2V0IFVSTHMgdG8gZGVsZXRlICh1c2VkIGJ5OiBkZWxldGUpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlyZWN0b3J5IHRvIG9wZXJhdGUgb24gKHVzZWQgYnk6IHZhbGlkYXRlX3JlZmVyZW5jZXMpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZGI6Ly9hc3NldHMnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnYXNzZXRfYWR2YW5jZWQnOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZW5lcmF0ZV91cmwnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2VuZXJhdGVBdmFpbGFibGVVcmwoYXJncy51cmwpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdxdWVyeV9kYl9yZWFkeSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUFzc2V0RGJSZWFkeSgpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdnZXRfZGVwZW5kZW5jaWVzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEFzc2V0RGVwZW5kZW5jaWVzKGFyZ3MudXJsT3JVVUlELCBhcmdzLmRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF91bnVzZWQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0VW51c2VkQXNzZXRzKGFyZ3MuZGlyZWN0b3J5LCBhcmdzLmV4Y2x1ZGVEaXJlY3RvcmllcywgYXJncy5tYXhSZXN1bHRzLCBhcmdzLmdyb3VwQnlGb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGFjdGlvbiBmb3IgYXNzZXRfYWR2YW5jZWQ6ICR7YXJncy5hY3Rpb259YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYXNzZXRfYmF0Y2gnOiB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhcmdzLmFjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbXBvcnQnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYmF0Y2hJbXBvcnRBc3NldHMoYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5iYXRjaERlbGV0ZUFzc2V0cyhhcmdzLnVybHMpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9yZWZlcmVuY2VzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZhbGlkYXRlQXNzZXRSZWZlcmVuY2VzKGFyZ3MuZGlyZWN0b3J5KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2Nhbl9zY2VuZV9yZWZzJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNjYW5TY2VuZU1pc3NpbmdSZWZzKCk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBhc3NldF9iYXRjaDogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUF2YWlsYWJsZVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZ2VuZXJhdGUtYXZhaWxhYmxlLXVybCcsIHVybCkudGhlbigoYXZhaWxhYmxlVXJsOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxVcmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVVybDogYXZhaWxhYmxlVXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXZhaWxhYmxlVXJsID09PSB1cmwgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdVUkwgaXMgYXZhaWxhYmxlJyA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0dlbmVyYXRlZCBuZXcgYXZhaWxhYmxlIFVSTCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5QXNzZXREYlJlYWR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcmVhZHknKS50aGVuKChyZWFkeTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWFkeTogcmVhZHksXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiByZWFkeSA/ICdBc3NldCBkYXRhYmFzZSBpcyByZWFkeScgOiAnQXNzZXQgZGF0YWJhc2UgaXMgbm90IHJlYWR5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hJbXBvcnRBc3NldHMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG5cbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhcmdzLnNvdXJjZURpcmVjdG9yeSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdTb3VyY2UgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0JyB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IHRoaXMuZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KFxuICAgICAgICAgICAgICAgIGFyZ3Muc291cmNlRGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgIGFyZ3MuZmlsZUZpbHRlciB8fCBbXSxcbiAgICAgICAgICAgICAgICBhcmdzLnJlY3Vyc2l2ZSB8fCBmYWxzZVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgY29uc3QgaW1wb3J0UmVzdWx0czogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIGZpbGVzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGF0aCA9IGAke2FyZ3MudGFyZ2V0RGlyZWN0b3J5fS8ke2ZpbGVOYW1lfWA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnaW1wb3J0LWFzc2V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLCB0YXJnZXRQYXRoLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3ZlcndyaXRlOiBhcmdzLm92ZXJ3cml0ZSB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZW5hbWU6ICEoYXJncy5vdmVyd3JpdGUgfHwgZmFsc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRSZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQ/LnV1aWRcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudCsrO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydFJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsRmlsZXM6IGZpbGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQ6IGVycm9yQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGltcG9ydFJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBpbXBvcnQgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KGRpclBhdGg6IHN0cmluZywgZmlsZUZpbHRlcjogc3RyaW5nW10sIHJlY3Vyc2l2ZTogYm9vbGVhbik6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuICAgICAgICBjb25zdCBmaWxlczogc3RyaW5nW10gPSBbXTtcblxuICAgICAgICBjb25zdCBpdGVtcyA9IGZzLnJlYWRkaXJTeW5jKGRpclBhdGgpO1xuXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyUGF0aCwgaXRlbSk7XG4gICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoZnVsbFBhdGgpO1xuXG4gICAgICAgICAgICBpZiAoc3RhdC5pc0ZpbGUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRmlsdGVyLmxlbmd0aCA9PT0gMCB8fCBmaWxlRmlsdGVyLnNvbWUoZXh0ID0+IGl0ZW0udG9Mb3dlckNhc2UoKS5lbmRzV2l0aChleHQudG9Mb3dlckNhc2UoKSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goZnVsbFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpICYmIHJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIGZpbGVzLnB1c2goLi4udGhpcy5nZXRGaWxlc0Zyb21EaXJlY3RvcnkoZnVsbFBhdGgsIGZpbGVGaWx0ZXIsIHJlY3Vyc2l2ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZpbGVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgYmF0Y2hEZWxldGVBc3NldHModXJsczogc3RyaW5nW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlUmVzdWx0czogYW55W10gPSBbXTtcbiAgICAgICAgICAgIGxldCBzdWNjZXNzQ291bnQgPSAwO1xuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiB1cmxzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdXJsKTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZXJyLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiB1cmxzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50OiBzdWNjZXNzQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQ6IGVycm9yQ291bnQsXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IGRlbGV0ZVJlc3VsdHMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBCYXRjaCBkZWxldGUgY29tcGxldGVkOiAke3N1Y2Nlc3NDb3VudH0gc3VjY2VzcywgJHtlcnJvckNvdW50fSBlcnJvcnNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVBc3NldFJlZmVyZW5jZXMoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIEdldCBhbGwgYXNzZXRzIGluIGRpcmVjdG9yeVxuICAgICAgICAgICAgY29uc3QgYXNzZXRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBgJHtkaXJlY3Rvcnl9LyoqLypgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBicm9rZW5SZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRSZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFzc2V0cykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0SW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZFJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXQudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyIGFzIEVycm9yKS5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiBkaXJlY3RvcnksXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiBhc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZFJlZmVyZW5jZXM6IHZhbGlkUmVmZXJlbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXM6IGJyb2tlblJlZmVyZW5jZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBicm9rZW5Bc3NldHM6IGJyb2tlblJlZmVyZW5jZXMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBWYWxpZGF0aW9uIGNvbXBsZXRlZDogJHticm9rZW5SZWZlcmVuY2VzLmxlbmd0aH0gYnJva2VuIHJlZmVyZW5jZXMgZm91bmRgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2NhblNjZW5lTWlzc2luZ1JlZnMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogV2FsayBub2RlIHRyZWUsIGNvbGxlY3QgYWxsIG5vZGUgVVVJRHNcbiAgICAgICAgICAgIGNvbnN0IG5vZGVUcmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICBpZiAoIW5vZGVUcmVlKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcXVlcnkgc2NlbmUgbm9kZSB0cmVlJyB9O1xuXG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBjb25zdCBxdWV1ZTogYW55W10gPSBbbm9kZVRyZWVdO1xuICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZT8udXVpZCkgbm9kZVV1aWRzLnB1c2gobm9kZS51dWlkKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZT8uY2hpbGRyZW4pIHF1ZXVlLnB1c2goLi4ubm9kZS5jaGlsZHJlbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBub2RlVXVpZFNldCA9IG5ldyBTZXQobm9kZVV1aWRzKTtcblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBRdWVyeSBhbGwgbm9kZXMgaW4gcGFyYWxsZWwgYmF0Y2hlcywgY29sbGVjdCBVVUlEIHJlZnNcbiAgICAgICAgICAgIGNvbnN0IE5PREVfQkFUQ0ggPSAxMDtcbiAgICAgICAgICAgIGNvbnN0IHV1aWRUb1JlZnMgPSBuZXcgTWFwPHN0cmluZywgeyBub2RlVXVpZDogc3RyaW5nOyBub2RlTmFtZTogc3RyaW5nOyBjb21wb25lbnRUeXBlOiBzdHJpbmc7IHByb3BlcnR5OiBzdHJpbmcgfVtdPigpO1xuXG4gICAgICAgICAgICAvLyBUcmFjayBjb21wb25lbnQtaW5zdGFuY2UgdXVpZHMgc28gd2UgY2FuIGV4Y2x1ZGUgdGhlbSBmcm9tIFwiYXNzZXRcIiBjYW5kaWRhdGVzIGJlbG93LlxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50VXVpZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVVdWlkcy5sZW5ndGg7IGkgKz0gTk9ERV9CQVRDSCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gbm9kZVV1aWRzLnNsaWNlKGksIGkgKyBOT0RFX0JBVENIKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgICAgICAgICAgIGJhdGNoLm1hcCh1dWlkID0+IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKS5jYXRjaCgoKSA9PiBudWxsKSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcmVzdWx0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlRGF0YSA9IHJlc3VsdHNbal07XG4gICAgICAgICAgICAgICAgICAgIGlmICghbm9kZURhdGE/Ll9fY29tcHNfXykgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkID0gYmF0Y2hbal07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVOYW1lID0gbm9kZURhdGEubmFtZT8udmFsdWUgPz8gbm9kZURhdGEubmFtZSA/PyBub2RlVXVpZDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGVEYXRhLl9fY29tcHNfXyBhcyBhbnlbXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcFR5cGUgPSAoY29tcCBhcyBhbnkpLl9fdHlwZV9fIHx8IChjb21wIGFzIGFueSkuY2lkIHx8IChjb21wIGFzIGFueSkudHlwZSB8fCAnVW5rbm93bic7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb21wb25lbnQgaW5zdGFuY2UgdXVpZCBsaXZlcyBhdCBjb21wLnZhbHVlLnV1aWQudmFsdWUgKHJhdyBxdWVyeS1ub2RlIHNoYXBlKSBvciBjb21wLnV1aWQuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wSW5zdGFuY2VVdWlkID0gKGNvbXAgYXMgYW55KS52YWx1ZT8udXVpZD8udmFsdWUgfHwgKGNvbXAgYXMgYW55KS51dWlkPy52YWx1ZSB8fCAoY29tcCBhcyBhbnkpLnV1aWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBJbnN0YW5jZVV1aWQgPT09ICdzdHJpbmcnICYmIGNvbXBJbnN0YW5jZVV1aWQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFV1aWRTZXQuYWRkKGNvbXBJbnN0YW5jZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0UmVmVXVpZHMoY29tcCBhcyBhbnksIGNvbXBUeXBlLCBub2RlVXVpZCwgU3RyaW5nKG5vZGVOYW1lKSwgdXVpZFRvUmVmcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBub24tYXNzZXQgdXVpZHM6IHNjZW5lIG5vZGUgdXVpZHMgYW5kIGNvbXBvbmVudC1pbnN0YW5jZSB1dWlkcyBib3RoIHN1cmZhY2UgYXMgYHt1dWlkfWBcbiAgICAgICAgICAgIC8vIHJlZnMgYnV0IGFyZSBub3QgYXNzZXRzIGluIHRoZSBhc3NldC1kYi5cbiAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiBub2RlVXVpZFNldCkgdXVpZFRvUmVmcy5kZWxldGUodXVpZCk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHV1aWQgb2YgY29tcG9uZW50VXVpZFNldCkgdXVpZFRvUmVmcy5kZWxldGUodXVpZCk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogVmFsaWRhdGUgdW5pcXVlIGFzc2V0IFVVSURzIGFnYWluc3QgYXNzZXQtZGIgaW4gcGFyYWxsZWwgYmF0Y2hlc1xuICAgICAgICAgICAgY29uc3QgdW5pcXVlVXVpZHMgPSBBcnJheS5mcm9tKHV1aWRUb1JlZnMua2V5cygpKTtcbiAgICAgICAgICAgIGNvbnN0IEFTU0VUX0JBVENIID0gMjA7XG4gICAgICAgICAgICBjb25zdCBtaXNzaW5nVXVpZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB1bmlxdWVVdWlkcy5sZW5ndGg7IGkgKz0gQVNTRVRfQkFUQ0gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiYXRjaCA9IHVuaXF1ZVV1aWRzLnNsaWNlKGksIGkgKyBBU1NFVF9CQVRDSCk7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICAgICAgICAgICAgICBiYXRjaC5tYXAodXVpZCA9PlxuICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW4oKGluZm86IGFueSkgPT4gKHsgdXVpZCwgZXhpc3RzOiAhIWluZm8gfSkpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+ICh7IHV1aWQsIGV4aXN0czogZmFsc2UgfSkpXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgeyB1dWlkLCBleGlzdHMgfSBvZiByZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZXhpc3RzKSBtaXNzaW5nVXVpZHMuYWRkKHV1aWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCA0OiBCdWlsZCByZXBvcnRcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdSZWZzID0gQXJyYXkuZnJvbShtaXNzaW5nVXVpZHMpLm1hcCh1dWlkID0+ICh7XG4gICAgICAgICAgICAgICAgbWlzc2luZ1V1aWQ6IHV1aWQsXG4gICAgICAgICAgICAgICAgcmVmZXJlbmNlZEJ5OiB1dWlkVG9SZWZzLmdldCh1dWlkKSA/PyBbXVxuICAgICAgICAgICAgfSkpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbE5vZGVzOiBub2RlVXVpZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVuaXF1ZUFzc2V0UmVmczogdW5pcXVlVXVpZHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nQ291bnQ6IG1pc3NpbmdVdWlkcy5zaXplLFxuICAgICAgICAgICAgICAgICAgICBtaXNzaW5nUmVmcyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogbWlzc2luZ1V1aWRzLnNpemUgPT09IDBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ05vIG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlcyBmb3VuZCBpbiBzY2VuZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYEZvdW5kICR7bWlzc2luZ1V1aWRzLnNpemV9IG1pc3NpbmcgYXNzZXQgcmVmZXJlbmNlKHMpIGFjcm9zcyAke21pc3NpbmdSZWZzLnJlZHVjZSgobiwgcikgPT4gbiArIHIucmVmZXJlbmNlZEJ5Lmxlbmd0aCwgMCl9IGNvbXBvbmVudCBwcm9wZXJ0aWVzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbGxlY3RSZWZVdWlkcyhcbiAgICAgICAgY29tcDogYW55LFxuICAgICAgICBjb21wVHlwZTogc3RyaW5nLFxuICAgICAgICBub2RlVXVpZDogc3RyaW5nLFxuICAgICAgICBub2RlTmFtZTogc3RyaW5nLFxuICAgICAgICB1dWlkVG9SZWZzOiBNYXA8c3RyaW5nLCB7IG5vZGVVdWlkOiBzdHJpbmc7IG5vZGVOYW1lOiBzdHJpbmc7IGNvbXBvbmVudFR5cGU6IHN0cmluZzsgcHJvcGVydHk6IHN0cmluZyB9W10+XG4gICAgKTogdm9pZCB7XG4gICAgICAgIC8vIFdhbGsgdGhlIENvY29zIHF1ZXJ5LW5vZGUgY29tcG9uZW50IHNoYXBlLiBFZGl0YWJsZSBmaWVsZHMgbGl2ZSB1bmRlciBlaXRoZXIgYGNvbXAudmFsdWVgXG4gICAgICAgIC8vIChyYXcgc2NlbmUgcGF5bG9hZCkgb3IgZGlyZWN0bHkgb24gYGNvbXBgIChzb21lIGJ1aWxkcykuIEVhY2ggZmllbGQgaXMgYSBkZXNjcmlwdG9yIG9mIHRoZVxuICAgICAgICAvLyBmb3JtIGB7IG5hbWUsIHZhbHVlLCB0eXBlLCAuLi4gfWAgd2hlcmUgYHZhbHVlYCBob2xkcyB0aGUgYWN0dWFsIGRhdGEuXG4gICAgICAgIC8vIFdlIGF0dHJpYnV0ZSByZWZzIHRvIHRoZSBPVVRFUiBrZXkgKGUuZy4gYGNhbWVyYUNvbXBvbmVudGApLCBub3QgdGhlIGRlc2NyaXB0b3IncyBsaXRlcmFsIGB2YWx1ZWAuXG4gICAgICAgIGNvbnN0IGlzRGVzY3JpcHRvciA9ICh2OiBhbnkpOiBib29sZWFuID0+XG4gICAgICAgICAgICB2ICYmIHR5cGVvZiB2ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2KSAmJiAndmFsdWUnIGluIHYgJiYgKCd0eXBlJyBpbiB2IHx8ICduYW1lJyBpbiB2KTtcblxuICAgICAgICBjb25zdCBzZWVuID0gbmV3IFdlYWtTZXQ8b2JqZWN0PigpO1xuICAgICAgICBjb25zdCByZWNvcmRSZWYgPSAodXVpZDogc3RyaW5nLCBwcm9wTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXV1aWRUb1JlZnMuaGFzKHV1aWQpKSB1dWlkVG9SZWZzLnNldCh1dWlkLCBbXSk7XG4gICAgICAgICAgICB1dWlkVG9SZWZzLmdldCh1dWlkKSEucHVzaCh7IG5vZGVVdWlkLCBub2RlTmFtZSwgY29tcG9uZW50VHlwZTogY29tcFR5cGUsIHByb3BlcnR5OiBwcm9wTmFtZSB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCB3YWxrVmFsdWUgPSAodmFsOiBhbnksIHByb3BOYW1lOiBzdHJpbmcsIGRlcHRoOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwgfHwgdmFsID09PSB1bmRlZmluZWQgfHwgZGVwdGggPiAxMikgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoc2Vlbi5oYXModmFsKSkgcmV0dXJuO1xuICAgICAgICAgICAgc2Vlbi5hZGQodmFsKTtcblxuICAgICAgICAgICAgLy8gQXJyYXk6IHJlY3Vyc2UgZWFjaCBpdGVtLCBrZWVwIHByb3BOYW1lXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWwpKSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHZhbCkgd2Fsa1ZhbHVlKGl0ZW0sIHByb3BOYW1lLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGlyZWN0IHJlZiBzaGFwZSBgeyB1dWlkIH1gIG9yIGB7IF9fdXVpZF9fIH1gLiBGaWx0ZXIgZW1wdHkgc3RyaW5ncyAodW5zZXQgc2xvdHMpLlxuICAgICAgICAgICAgY29uc3QgdXVpZCA9ICh2YWwgYXMgYW55KS51dWlkID8/ICh2YWwgYXMgYW55KS5fX3V1aWRfXztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdXVpZCA9PT0gJ3N0cmluZycgJiYgdXVpZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVjb3JkUmVmKHV1aWQsIHByb3BOYW1lKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlc2NyaXB0b3Igd3JhcHBlciBgeyBuYW1lLCB2YWx1ZSwgdHlwZSwgLi4uIH1gIOKAlCByZWN1cnNlIGludG8gYHZhbHVlYCBvbmx5LCBrZWVwIHByb3BOYW1lLlxuICAgICAgICAgICAgaWYgKGlzRGVzY3JpcHRvcih2YWwpKSB7XG4gICAgICAgICAgICAgICAgd2Fsa1ZhbHVlKCh2YWwgYXMgYW55KS52YWx1ZSwgcHJvcE5hbWUsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBQbGFpbiBvYmplY3Q6IGVhY2ggb3duIGtleSBiZWNvbWVzIHRoZSBuZXcgcHJvcE5hbWUgZm9yIGl0cyBzdWJ0cmVlLlxuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModmFsKSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTsgLy8gc2tpcCBwcml2YXRlIG1pcnJvcnMgbGlrZSBgX2NvbG9yYFxuICAgICAgICAgICAgICAgIHdhbGtWYWx1ZSgodmFsIGFzIGFueSlba2V5XSwga2V5LCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFRvcC1sZXZlbDogaGFuZGxlIGJvdGggc2hhcGVzIChgY29tcC52YWx1ZWAgd3JhcHBlciBhbmQgZGlyZWN0KS5cbiAgICAgICAgY29uc3Qgcm9vdCA9IGNvbXAgJiYgdHlwZW9mIGNvbXAgPT09ICdvYmplY3QnICYmIGNvbXAudmFsdWUgJiYgdHlwZW9mIGNvbXAudmFsdWUgPT09ICdvYmplY3QnID8gY29tcC52YWx1ZSA6IGNvbXA7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHJvb3QpKSB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XG4gICAgICAgICAgICAvLyBTa2lwIHdyYXBwZXIgbWV0YWRhdGEga2V5cyBhdCB0aGUgY29tcG9uZW50IHJvb3QuXG4gICAgICAgICAgICBpZiAoWydfX3R5cGVfXycsICdjaWQnLCAnZW5hYmxlZCcsICd0eXBlJywgJ25hbWUnLCAndXVpZCddLmluY2x1ZGVzKGtleSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgLy8gYG5vZGVgIGlzIHRoZSBiYWNrLXBvaW50ZXIgdG8gdGhlIG93bmluZyBub2RlIOKAlCBuZXZlciBhbiBhc3NldC5cbiAgICAgICAgICAgIGlmIChrZXkgPT09ICdub2RlJykgY29udGludWU7XG4gICAgICAgICAgICB3YWxrVmFsdWUoKHJvb3QgYXMgYW55KVtrZXldLCBrZXksIDApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBc3NldERlcGVuZGVuY2llcyh1cmxPclVVSUQ6IHN0cmluZywgZGlyZWN0aW9uOiBzdHJpbmcgPSAnZGVwZW5kZW5jaWVzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBSZXNvbHZlIGFzc2V0IFVVSUQgYW5kIFVSTFxuICAgICAgICAgICAgbGV0IGFzc2V0VXVpZDogc3RyaW5nO1xuICAgICAgICAgICAgbGV0IGFzc2V0VXJsOiBzdHJpbmc7XG5cbiAgICAgICAgICAgIGlmICh1cmxPclVVSUQuc3RhcnRzV2l0aCgnZGI6Ly8nKSkge1xuICAgICAgICAgICAgICAgIGFzc2V0VXJsID0gdXJsT3JVVUlEO1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXJsT3JVVUlEKTtcbiAgICAgICAgICAgICAgICBpZiAoIWluZm8/LnV1aWQpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHt1cmxPclVVSUR9YCB9O1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IGluZm8udXVpZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXNzZXRVdWlkID0gdXJsT3JVVUlEO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHVybE9yVVVJRCk7XG4gICAgICAgICAgICAgICAgaWYgKCF1cmwpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHt1cmxPclVVSUR9YCB9O1xuICAgICAgICAgICAgICAgIGFzc2V0VXJsID0gdXJsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgICAgICBjb25zdCBhc3NldHNQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgYWxsIFVVSURzIGZvciB0aGlzIGFzc2V0IChtYWluICsgc3ViLWFzc2V0cyBmcm9tIC5tZXRhKVxuICAgICAgICAgICAgY29uc3QgYWxsQXNzZXRVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPihbYXNzZXRVdWlkXSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZzUGF0aCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgaWYgKGZzUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhUGF0aCA9IGZzUGF0aCArICcubWV0YSc7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKG1ldGFQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1ldGFQYXRoLCAndXRmOCcpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdFN1YlV1aWRzKG1ldGEuc3ViTWV0YXMsIGFsbEFzc2V0VXVpZHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSBtZXRhIHJlYWQgZXJyb3JzICovIH1cblxuICAgICAgICAgICAgY29uc3QgZGVwZW5kZW5jaWVzOiBBcnJheTx7IHV1aWQ6IHN0cmluZzsgdXJsOiBzdHJpbmcgfT4gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGRlcGVuZGVudHM6IEFycmF5PHsgdXJsOiBzdHJpbmcgfT4gPSBbXTtcblxuICAgICAgICAgICAgLy8gRmluZCBkZXBlbmRlbmNpZXM6IGFzc2V0cyB0aGlzIGZpbGUgcmVmZXJlbmNlcyB2aWEgX191dWlkX18gYW5kIF9fdHlwZV9fXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnZGVwZW5kZW5jaWVzJyB8fCBkaXJlY3Rpb24gPT09ICdib3RoJykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZzUGF0aCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmc1BhdGggJiYgZnMuZXhpc3RzU3luYyhmc1BhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZzUGF0aCwgJ3V0ZjgnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBfX3V1aWRfXyByZWZlcmVuY2VzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVdWlkcyA9IHRoaXMuZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHJlZiBvZiByZWZVdWlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVdWlkID0gcmVmLnNwbGl0KCdAJylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNlZW4uaGFzKGJhc2VVdWlkKSB8fCBhbGxBc3NldFV1aWRzLmhhcyhiYXNlVXVpZCkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlZW4uYWRkKGJhc2VVdWlkKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZlVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIGJhc2VVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBiYXNlVXVpZCwgdXJsOiByZWZVcmwgfHwgJ3VucmVzb2x2ZWQnIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMucHVzaCh7IHV1aWQ6IGJhc2VVdWlkLCB1cmw6ICd1bnJlc29sdmVkJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX190eXBlX18gcmVmZXJlbmNlcyAoY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzIHVzZSBjb21wcmVzc2VkIFVVSURzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkcyA9IHRoaXMuZXh0cmFjdFR5cGVJZHNGcm9tQ29udGVudChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZUlkIG9mIHR5cGVJZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvbXByZXNzZWQgPSB0aGlzLmRlY29tcHJlc3NVdWlkKHR5cGVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWNvbXByZXNzZWQgfHwgc2Vlbi5oYXMoZGVjb21wcmVzc2VkKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vlbi5hZGQoZGVjb21wcmVzc2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBkZWNvbXByZXNzZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVmVXJsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMucHVzaCh7IHV1aWQ6IGRlY29tcHJlc3NlZCwgdXJsOiByZWZVcmwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogbm90IGEgdmFsaWQgc2NyaXB0IFVVSUQgKi8gfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIGlnbm9yZSByZWFkIGVycm9ycyAqLyB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpbmQgZGVwZW5kZW50czogc2VyaWFsaXplZCBmaWxlcyB0aGF0IHJlZmVyZW5jZSB0aGlzIGFzc2V0J3MgVVVJRHNcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdkZXBlbmRlbnRzJyB8fCBkaXJlY3Rpb24gPT09ICdib3RoJykge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHNlYXJjaCBzdHJpbmdzOiBvcmlnaW5hbCBVVUlEcyArIGNvbXByZXNzZWQgZm9ybXMgZm9yIF9fdHlwZV9fIG1hdGNoaW5nXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoU3RyaW5ncyA9IG5ldyBTZXQ8c3RyaW5nPihhbGxBc3NldFV1aWRzKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVpZCBvZiBhbGxBc3NldFV1aWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZCh1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcHJlc3NlZC5sZW5ndGggPT09IDIyKSBzZWFyY2hTdHJpbmdzLmFkZChjb21wcmVzc2VkKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLndhbGtTZXJpYWxpemVkRmlsZXMoYXNzZXRzUGF0aCwgKGZpbGVQYXRoLCBjb250ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3RyIG9mIHNlYXJjaFN0cmluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50LmluY2x1ZGVzKHN0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlVXJsID0gJ2RiOi8vJyArIGZpbGVQYXRoLnN1YnN0cmluZyhwcm9qZWN0UGF0aC5sZW5ndGggKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZVVybCAhPT0gYXNzZXRVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW50cy5wdXNoKHsgdXJsOiBmaWxlVXJsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBhc3NldDogeyB1dWlkOiBhc3NldFV1aWQsIHVybDogYXNzZXRVcmwsIGFsbFV1aWRzOiBBcnJheS5mcm9tKGFsbEFzc2V0VXVpZHMpIH0sXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcyxcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW50cyxcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzQ291bnQ6IGRlcGVuZGVuY2llcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGRlcGVuZGVudHNDb3VudDogZGVwZW5kZW50cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke2RlcGVuZGVuY2llcy5sZW5ndGh9IGRlcGVuZGVuY2llcyBhbmQgJHtkZXBlbmRlbnRzLmxlbmd0aH0gZGVwZW5kZW50cyBmb3IgJHthc3NldFVybH1gXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYERlcGVuZGVuY3kgYW5hbHlzaXMgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0VW51c2VkQXNzZXRzKGRpcmVjdG9yeTogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJywgZXhjbHVkZURpcmVjdG9yaWVzOiBzdHJpbmdbXSA9IFtdLCBtYXhSZXN1bHRzOiBudW1iZXIgPSA1MCwgZ3JvdXBCeUZvbGRlcjogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3QucGF0aDtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCBkaXJlY3RvcnkucmVwbGFjZSgnZGI6Ly8nLCAnJykpO1xuXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYmFzZVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGlyZWN0b3J5IG5vdCBmb3VuZDogJHtkaXJlY3Rvcnl9YCB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdGVwIDE6IEJ1aWxkIFVVSUQgLT4gYXNzZXQgVVJMIG1hcCBmcm9tIC5tZXRhIGZpbGVzXG4gICAgICAgICAgICAvLyBBbHNvIGJ1aWxkIGNvbXByZXNzZWQgVVVJRCBtYXAgZm9yIF9fdHlwZV9fIG1hdGNoaW5nIChzY3JpcHQgY29tcG9uZW50cylcbiAgICAgICAgICAgIGNvbnN0IHV1aWRUb1VybCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkVG9VcmwgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICAgICAgICAgICAgY29uc3QgYWxsQXNzZXRzOiBBcnJheTx7IHVybDogc3RyaW5nOyBleHQ6IHN0cmluZyB9PiA9IFtdO1xuXG4gICAgICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoYmFzZVBhdGgsIChmaWxlUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghZmlsZVBhdGguZW5kc1dpdGgoJy5tZXRhJykpIHJldHVybjtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0RnNQYXRoID0gZmlsZVBhdGguc2xpY2UoMCwgLTUpOyAvLyBSZW1vdmUgLm1ldGEgc3VmZml4XG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRVcmwgPSAnZGI6Ly8nICsgYXNzZXRGc1BhdGguc3Vic3RyaW5nKHByb2plY3RQYXRoLmxlbmd0aCArIDEpO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgZXhjbHVkZSBkaXJlY3Rvcmllc1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZXhjbCBvZiBleGNsdWRlRGlyZWN0b3JpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0VXJsLnN0YXJ0c1dpdGgoZXhjbCkpIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTa2lwIGlmIGFjdHVhbCBhc3NldCBkb2Vzbid0IGV4aXN0IG9yIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFzc2V0RnNQYXRoKSB8fCBmcy5zdGF0U3luYyhhc3NldEZzUGF0aCkuaXNEaXJlY3RvcnkoKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyByZXR1cm47IH1cblxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0ZjgnKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShhc3NldEZzUGF0aCkudG9Mb3dlckNhc2UoKTtcblxuICAgICAgICAgICAgICAgICAgICBhbGxBc3NldHMucHVzaCh7IHVybDogYXNzZXRVcmwsIGV4dCB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBNYXAgbWFpbiBVVUlEIHRvIGFzc2V0IFVSTFxuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YS51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkVG9Vcmwuc2V0KG1ldGEudXVpZCwgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZCA9IHRoaXMuY29tcHJlc3NVdWlkKG1ldGEudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcHJlc3NlZC5sZW5ndGggPT09IDIyKSBjb21wcmVzc2VkVG9Vcmwuc2V0KGNvbXByZXNzZWQsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcCBzdWItYXNzZXQgVVVJRHMgdG8gcGFyZW50IGFzc2V0IFVSTFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdWJVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RTdWJVdWlkcyhtZXRhLnN1Yk1ldGFzLCBzdWJVdWlkcyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3ViVXVpZCBvZiBzdWJVdWlkcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZFRvVXJsLnNldChzdWJVdWlkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gdGhpcy5jb21wcmVzc1V1aWQoc3ViVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29tcHJlc3NlZC5sZW5ndGggPT09IDIyKSBjb21wcmVzc2VkVG9Vcmwuc2V0KGNvbXByZXNzZWQsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBza2lwIHVucGFyc2VhYmxlIG1ldGEgZmlsZXMgKi8gfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMjogU2NhbiBBTEwgc2VyaWFsaXplZCBmaWxlcyBpbiBlbnRpcmUgYXNzZXRzIGZvbGRlciAobm90IGp1c3QgdGFyZ2V0IGRpcmVjdG9yeSlcbiAgICAgICAgICAgIC8vIGJlY2F1c2Ugc2NlbmVzL3ByZWZhYnMgcmVmZXJlbmNpbmcgdGFyZ2V0IGFzc2V0cyBtYXkgYmUgaW4gb3RoZXIgZm9sZGVyc1xuICAgICAgICAgICAgY29uc3QgYXNzZXRzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycpO1xuICAgICAgICAgICAgY29uc3QgcmVmZXJlbmNlZFVybHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgICAgICAgICAgdGhpcy53YWxrU2VyaWFsaXplZEZpbGVzKGFzc2V0c1BhdGgsIChfZmlsZVBhdGgsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBfX3V1aWRfXyByZWZlcmVuY2VzIChpbWFnZXMsIHByZWZhYnMsIG1hdGVyaWFscywgZXRjLilcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkcyA9IHRoaXMuZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudCk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIHV1aWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVdWlkID0gdXVpZC5zcGxpdCgnQCcpWzBdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSB1dWlkVG9VcmwuZ2V0KGJhc2VVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVybCkgcmVmZXJlbmNlZFVybHMuYWRkKHVybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgX190eXBlX18gcmVmZXJlbmNlcyAoc2NyaXB0IGNvbXBvbmVudHMgdXNlIGNvbXByZXNzZWQgVVVJRHMpXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkcyA9IHRoaXMuZXh0cmFjdFR5cGVJZHNGcm9tQ29udGVudChjb250ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHR5cGVJZCBvZiB0eXBlSWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGNvbXByZXNzZWRUb1VybC5nZXQodHlwZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVybCkgcmVmZXJlbmNlZFVybHMuYWRkKHVybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogRmluZCB1bnVzZWQgYXNzZXRzLCBzZXBhcmF0ZSBzY3JpcHRzIGZyb20gb3RoZXIgYXNzZXRzXG4gICAgICAgICAgICBjb25zdCBzY3JpcHRFeHRzID0gWycudHMnLCAnLmpzJ107XG4gICAgICAgICAgICBjb25zdCBhbGxVbnVzZWRBc3NldHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICBjb25zdCBhbGxVbnVzZWRTY3JpcHRzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFsbEFzc2V0cykge1xuICAgICAgICAgICAgICAgIGlmICghcmVmZXJlbmNlZFVybHMuaGFzKGFzc2V0LnVybCkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNjcmlwdEV4dHMuaW5jbHVkZXMoYXNzZXQuZXh0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWxsVW51c2VkU2NyaXB0cy5wdXNoKGFzc2V0LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxVbnVzZWRBc3NldHMucHVzaChhc3NldC51cmwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB0b3RhbFVudXNlZEFzc2V0cyA9IGFsbFVudXNlZEFzc2V0cy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCB0b3RhbFVudXNlZFNjcmlwdHMgPSBhbGxVbnVzZWRTY3JpcHRzLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IGxpbWl0ID0gTWF0aC5tYXgoMSwgbWF4UmVzdWx0cyk7XG5cbiAgICAgICAgICAgIGlmIChncm91cEJ5Rm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgLy8gR3JvdXAgYnkgcGFyZW50IGZvbGRlciB3aXRoIGNvdW50c1xuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlck1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7IGFzc2V0czogbnVtYmVyOyBzY3JpcHRzOiBudW1iZXI7IHNhbXBsZXM6IHN0cmluZ1tdIH0+KCk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBhbGxVbnVzZWRBc3NldHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdXJsLnN1YnN0cmluZygwLCB1cmwubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gZm9sZGVyTWFwLmdldChmb2xkZXIpIHx8IHsgYXNzZXRzOiAwLCBzY3JpcHRzOiAwLCBzYW1wbGVzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICBlbnRyeS5hc3NldHMrKztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVudHJ5LnNhbXBsZXMubGVuZ3RoIDwgMykgZW50cnkuc2FtcGxlcy5wdXNoKHVybC5zdWJzdHJpbmcodXJsLmxhc3RJbmRleE9mKCcvJykgKyAxKSk7XG4gICAgICAgICAgICAgICAgICAgIGZvbGRlck1hcC5zZXQoZm9sZGVyLCBlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdXJsIG9mIGFsbFVudXNlZFNjcmlwdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyID0gdXJsLnN1YnN0cmluZygwLCB1cmwubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5ID0gZm9sZGVyTWFwLmdldChmb2xkZXIpIHx8IHsgYXNzZXRzOiAwLCBzY3JpcHRzOiAwLCBzYW1wbGVzOiBbXSB9O1xuICAgICAgICAgICAgICAgICAgICBlbnRyeS5zY3JpcHRzKys7XG4gICAgICAgICAgICAgICAgICAgIGZvbGRlck1hcC5zZXQoZm9sZGVyLCBlbnRyeSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU29ydCBieSB0b3RhbCBjb3VudCBkZXNjZW5kaW5nLCBsaW1pdCByZXN1bHRzXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVycyA9IEFycmF5LmZyb20oZm9sZGVyTWFwLmVudHJpZXMoKSlcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgoW2ZvbGRlciwgZGF0YV0pID0+ICh7IGZvbGRlciwgLi4uZGF0YSwgdG90YWw6IGRhdGEuYXNzZXRzICsgZGF0YS5zY3JpcHRzIH0pKVxuICAgICAgICAgICAgICAgICAgICAuc29ydCgoYSwgYikgPT4gYi50b3RhbCAtIGEudG90YWwpXG4gICAgICAgICAgICAgICAgICAgIC5zbGljZSgwLCBsaW1pdCk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogYWxsQXNzZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZmVyZW5jZWRDb3VudDogcmVmZXJlbmNlZFVybHMuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVudXNlZEFzc2V0Q291bnQ6IHRvdGFsVW51c2VkQXNzZXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW51c2VkU2NyaXB0Q291bnQ6IHRvdGFsVW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBmb2xkZXJzU2hvd246IGZvbGRlcnMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxGb2xkZXJzOiBmb2xkZXJNYXAuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke3RvdGFsVW51c2VkQXNzZXRzICsgdG90YWxVbnVzZWRTY3JpcHRzfSB1bnVzZWQgaXRlbXMgYWNyb3NzICR7Zm9sZGVyTWFwLnNpemV9IGZvbGRlcnNgLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm90ZTogJ0Fzc2V0cyBsb2FkZWQgZHluYW1pY2FsbHkgKGUuZy4gcmVzb3VyY2VzLmxvYWQpIG1heSBzdGlsbCBhcHBlYXIgdW51c2VkLiBSZXZpZXcgYmVmb3JlIGRlbGV0aW5nLidcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZsYXQgbGlzdCB3aXRoIG1heFJlc3VsdHMgbGltaXRcbiAgICAgICAgICAgIGNvbnN0IHVudXNlZEFzc2V0cyA9IGFsbFVudXNlZEFzc2V0cy5zb3J0KCkuc2xpY2UoMCwgbGltaXQpO1xuICAgICAgICAgICAgY29uc3QgdW51c2VkU2NyaXB0cyA9IGFsbFVudXNlZFNjcmlwdHMuc29ydCgpLnNsaWNlKDAsIGxpbWl0KTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5LFxuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogYWxsQXNzZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgcmVmZXJlbmNlZENvdW50OiByZWZlcmVuY2VkVXJscy5zaXplLFxuICAgICAgICAgICAgICAgICAgICB1bnVzZWRDb3VudDogdG90YWxVbnVzZWRBc3NldHMgKyB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgIHVudXNlZEFzc2V0cyxcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgc2hvd2luZzogdW51c2VkQXNzZXRzLmxlbmd0aCArIHVudXNlZFNjcmlwdHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVudXNlZEFzc2V0cyxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxVbnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICB0cnVuY2F0ZWQ6IHRvdGFsVW51c2VkQXNzZXRzID4gbGltaXQgfHwgdG90YWxVbnVzZWRTY3JpcHRzID4gbGltaXQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBGb3VuZCAke3RvdGFsVW51c2VkQXNzZXRzfSB1bnVzZWQgYXNzZXRzIGFuZCAke3RvdGFsVW51c2VkU2NyaXB0c30gdW51c2VkIHNjcmlwdHMgKHNob3dpbmcgdXAgdG8gJHtsaW1pdH0gZWFjaClgLFxuICAgICAgICAgICAgICAgICAgICBub3RlOiAnQXNzZXRzIGxvYWRlZCBkeW5hbWljYWxseSAoZS5nLiByZXNvdXJjZXMubG9hZCkgbWF5IHN0aWxsIGFwcGVhciB1bnVzZWQuIFVzZSBncm91cEJ5Rm9sZGVyOnRydWUgZm9yIG92ZXJ2aWV3LiBSZXZpZXcgYmVmb3JlIGRlbGV0aW5nLidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW51c2VkIGFzc2V0IGRldGVjdGlvbiBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gLS0tIEhlbHBlciBtZXRob2RzIGZvciBkZXBlbmRlbmN5IGFuZCB1bnVzZWQgYXNzZXQgYW5hbHlzaXMgLS0tXG5cbiAgICBwcml2YXRlIGV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgdXVpZHM6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGNvbnN0IHBhdHRlcm4gPSAvXCJfX3V1aWRfX1wiXFxzKjpcXHMqXCIoW15cIl0rKVwiL2c7XG4gICAgICAgIGxldCBtYXRjaDtcbiAgICAgICAgd2hpbGUgKChtYXRjaCA9IHBhdHRlcm4uZXhlYyhjb250ZW50KSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHV1aWRzLnB1c2gobWF0Y2hbMV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB1dWlkcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGNvbGxlY3RTdWJVdWlkcyhzdWJNZXRhczogYW55LCB1dWlkczogU2V0PHN0cmluZz4pOiB2b2lkIHtcbiAgICAgICAgaWYgKCFzdWJNZXRhcyB8fCB0eXBlb2Ygc3ViTWV0YXMgIT09ICdvYmplY3QnKSByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHN1Yk1ldGFzKSkge1xuICAgICAgICAgICAgY29uc3Qgc3ViID0gc3ViTWV0YXNba2V5XTtcbiAgICAgICAgICAgIGlmIChzdWI/LnV1aWQpIHV1aWRzLmFkZChzdWIudXVpZCk7XG4gICAgICAgICAgICBpZiAoc3ViPy5zdWJNZXRhcykgdGhpcy5jb2xsZWN0U3ViVXVpZHMoc3ViLnN1Yk1ldGFzLCB1dWlkcyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHdhbGtEaXJlY3RvcnkoZGlyOiBzdHJpbmcsIGNhbGxiYWNrOiAoZmlsZVBhdGg6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkgcmV0dXJuO1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZGlyLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XG4gICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBlbnRyeS5uYW1lKTtcbiAgICAgICAgICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnLicpIHx8IGVudHJ5Lm5hbWUgPT09ICdub2RlX21vZHVsZXMnKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoZnVsbFBhdGgsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZnVsbFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB3YWxrU2VyaWFsaXplZEZpbGVzKGRpcjogc3RyaW5nLCBjYWxsYmFjazogKGZpbGVQYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgICAgICBjb25zdCBleHRlbnNpb25zID0gWycuc2NlbmUnLCAnLnByZWZhYicsICcuYW5pbScsICcubXRsJywgJy5lZmZlY3QnXTtcbiAgICAgICAgdGhpcy53YWxrRGlyZWN0b3J5KGRpciwgKGZpbGVQYXRoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICBpZiAoIWV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0KSkgcmV0dXJuO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZpbGVQYXRoLCBjb250ZW50KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBza2lwIGJpbmFyeSBvciB1bnJlYWRhYmxlIGZpbGVzICovIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBleHRyYWN0VHlwZUlkc0Zyb21Db250ZW50KGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAgICAgY29uc3QgdHlwZUlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IC9cIl9fdHlwZV9fXCJcXHMqOlxccypcIihbXlwiXSspXCIvZztcbiAgICAgICAgbGV0IG1hdGNoO1xuICAgICAgICB3aGlsZSAoKG1hdGNoID0gcGF0dGVybi5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgLy8gU2tpcCBidWlsdC1pbiBDb2NvcyB0eXBlcyAoY2MuTm9kZSwgY2MuU3ByaXRlLCBldGMuKVxuICAgICAgICAgICAgaWYgKCFtYXRjaFsxXS5zdGFydHNXaXRoKCdjYy4nKSkge1xuICAgICAgICAgICAgICAgIHR5cGVJZHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHR5cGVJZHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ29tcHJlc3MgYSBzdGFuZGFyZCBVVUlEIHRvIENvY29zIENyZWF0b3IncyAyMi1jaGFyIGZvcm1hdCB1c2VkIGluIF9fdHlwZV9fLlxuICAgICAqIEZvcm1hdDogZmlyc3QgMiBoZXggY2hhcnMga2VwdCArIDEwIHBhaXJzIG9mIGJhc2U2NCBjaGFycyAoZW5jb2RpbmcgcmVtYWluaW5nIDMwIGhleCBjaGFycykuXG4gICAgICovXG4gICAgcHJpdmF0ZSBjb21wcmVzc1V1aWQodXVpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgQkFTRTY0X0tFWVMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyc7XG4gICAgICAgIGNvbnN0IGhleCA9IHV1aWQucmVwbGFjZSgvLS9nLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgaWYgKGhleC5sZW5ndGggIT09IDMyKSByZXR1cm4gdXVpZDtcblxuICAgICAgICBsZXQgcmVzdWx0ID0gaGV4WzBdICsgaGV4WzFdO1xuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8IDMyOyBpICs9IDMpIHtcbiAgICAgICAgICAgIGNvbnN0IHZhbCA9IChwYXJzZUludChoZXhbaV0sIDE2KSA8PCA4KSB8IChwYXJzZUludChoZXhbaSArIDFdLCAxNikgPDwgNCkgfCBwYXJzZUludChoZXhbaSArIDJdLCAxNik7XG4gICAgICAgICAgICByZXN1bHQgKz0gQkFTRTY0X0tFWVNbdmFsID4+IDZdO1xuICAgICAgICAgICAgcmVzdWx0ICs9IEJBU0U2NF9LRVlTW3ZhbCAmIDB4M0ZdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7IC8vIDIgKyAyMCA9IDIyIGNoYXJzXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRGVjb21wcmVzcyBhIDIyLWNoYXIgQ29jb3MgQ3JlYXRvciBjb21wcmVzc2VkIFVVSUQgYmFjayB0byBzdGFuZGFyZCBVVUlEIGZvcm1hdC5cbiAgICAgKiBSZXR1cm5zIG51bGwgaWYgdGhlIGlucHV0IGlzIG5vdCBhIHZhbGlkIGNvbXByZXNzZWQgVVVJRC5cbiAgICAgKi9cbiAgICBwcml2YXRlIGRlY29tcHJlc3NVdWlkKGNvbXByZXNzZWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBpZiAoY29tcHJlc3NlZC5sZW5ndGggIT09IDIyKSByZXR1cm4gbnVsbDtcblxuICAgICAgICBjb25zdCBCQVNFNjRfS0VZUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbiAgICAgICAgY29uc3QgQkFTRTY0X1ZBTFVFUyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgQkFTRTY0X0tFWVMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIEJBU0U2NF9WQUxVRVMuc2V0KEJBU0U2NF9LRVlTW2ldLCBpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBIRVggPSAnMDEyMzQ1Njc4OWFiY2RlZic7XG5cbiAgICAgICAgbGV0IGhleCA9IGNvbXByZXNzZWRbMF0gKyBjb21wcmVzc2VkWzFdO1xuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8IDIyOyBpICs9IDIpIHtcbiAgICAgICAgICAgIGNvbnN0IGxocyA9IEJBU0U2NF9WQUxVRVMuZ2V0KGNvbXByZXNzZWRbaV0pO1xuICAgICAgICAgICAgY29uc3QgcmhzID0gQkFTRTY0X1ZBTFVFUy5nZXQoY29tcHJlc3NlZFtpICsgMV0pO1xuICAgICAgICAgICAgaWYgKGxocyA9PT0gdW5kZWZpbmVkIHx8IHJocyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIGhleCArPSBIRVhbbGhzID4+IDJdO1xuICAgICAgICAgICAgaGV4ICs9IEhFWFsoKGxocyAmIDMpIDw8IDIpIHwgKHJocyA+PiA0KV07XG4gICAgICAgICAgICBoZXggKz0gSEVYW3JocyAmIDB4Rl07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbnNlcnQgZGFzaGVzOiB4eHh4eHh4eC14eHh4LXh4eHgteHh4eC14eHh4eHh4eHh4eHhcbiAgICAgICAgcmV0dXJuIGhleC5zbGljZSgwLCA4KSArICctJyArIGhleC5zbGljZSg4LCAxMikgKyAnLScgKyBoZXguc2xpY2UoMTIsIDE2KSArICctJyArIGhleC5zbGljZSgxNiwgMjApICsgJy0nICsgaGV4LnNsaWNlKDIwKTtcbiAgICB9XG59XG4iXX0=