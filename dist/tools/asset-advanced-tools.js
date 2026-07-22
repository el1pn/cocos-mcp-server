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
const editor_request_1 = require("../utils/editor-request");
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
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'generate-available-url', url), (availableUrl) => ({
            data: {
                originalUrl: url,
                availableUrl: availableUrl,
                message: availableUrl === url ?
                    'URL is available' :
                    'Generated new available URL'
            }
        }));
    }
    async queryAssetDbReady() {
        return (0, editor_request_1.toolCall)(() => (0, editor_request_1.editorRequest)('asset-db', 'query-ready'), (ready) => ({
            data: {
                ready: ready,
                message: ready ? 'Asset database is ready' : 'Asset database is not ready'
            }
        }));
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
                    const result = await (0, editor_request_1.editorRequest)('asset-db', 'import-asset', filePath, targetPath, {
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
                    await (0, editor_request_1.editorRequest)('asset-db', 'delete-asset', url);
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
            const assets = await (0, editor_request_1.editorRequest)('asset-db', 'query-assets', { pattern: `${directory}/**/*` });
            const brokenReferences = [];
            const validReferences = [];
            for (const asset of assets) {
                try {
                    const assetInfo = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', asset.url);
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
            const nodeTree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
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
                const results = await Promise.all(batch.map(uuid => (0, editor_request_1.editorRequest)('scene', 'query-node', uuid).catch(() => null)));
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
                const results = await Promise.all(batch.map(uuid => (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', uuid)
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
                const info = await (0, editor_request_1.editorRequest)('asset-db', 'query-asset-info', urlOrUUID);
                if (!(info === null || info === void 0 ? void 0 : info.uuid))
                    return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUuid = info.uuid;
            }
            else {
                assetUuid = urlOrUUID;
                const url = await (0, editor_request_1.editorRequest)('asset-db', 'query-url', urlOrUUID);
                if (!url)
                    return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUrl = url;
            }
            const projectPath = Editor.Project.path;
            const assetsPath = path.join(projectPath, 'assets');
            // Collect all UUIDs for this asset (main + sub-assets from .meta)
            const allAssetUuids = new Set([assetUuid]);
            try {
                const fsPath = await (0, editor_request_1.editorRequest)('asset-db', 'query-path', assetUrl);
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
                    const fsPath = await (0, editor_request_1.editorRequest)('asset-db', 'query-path', assetUrl);
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
                                const refUrl = await (0, editor_request_1.editorRequest)('asset-db', 'query-url', baseUuid);
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
                                const refUrl = await (0, editor_request_1.editorRequest)('asset-db', 'query-url', decompressed);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtYWR2YW5jZWQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtYWR2YW5jZWQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3Qiw0REFBa0U7QUFFbEUsTUFBYSxrQkFBa0I7SUFDM0IsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixXQUFXLEVBQUUsd0dBQXdHO2dCQUNySCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsdUJBQXVCOzRCQUNwQyxJQUFJLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxDQUFDO3lCQUM3RTt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHNDQUFzQzt5QkFDdEQ7d0JBQ0QsR0FBRyxFQUFFOzRCQUNELElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx3REFBd0Q7eUJBQ3hFO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUseUNBQXlDOzRCQUN0RCxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQzs0QkFDNUMsT0FBTyxFQUFFLGNBQWM7eUJBQzFCO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsZ0NBQWdDOzRCQUM3QyxPQUFPLEVBQUUsYUFBYTt5QkFDekI7d0JBQ0Qsa0JBQWtCLEVBQUU7NEJBQ2hCLElBQUksRUFBRSxPQUFPOzRC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LENBQUMsQ0FBQztJQUM5SCxDQUFDO0NBQ0o7QUExMkJELGdEQTAyQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZWRpdG9yUmVxdWVzdCwgdG9vbENhbGwgfSBmcm9tICcuLi91dGlscy9lZGl0b3ItcmVxdWVzdCc7XG5cbmV4cG9ydCBjbGFzcyBBc3NldEFkdmFuY2VkVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdhc3NldF9hZHZhbmNlZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZHZhbmNlZCBhc3NldCBvcHM6IGdlbmVyYXRlIGF2YWlsYWJsZSBVUkxzLCBjaGVjayBEQiByZWFkaW5lc3MsIGdldCBkZXBlbmRlbmNpZXMsIGZpbmQgdW51c2VkIGFzc2V0cy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmF0ZV91cmwnLCAncXVlcnlfZGJfcmVhZHknLCAnZ2V0X2RlcGVuZGVuY2llcycsICdnZXRfdW51c2VkJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxPclVVSUQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCBvciBVVUlEIChnZXRfZGVwZW5kZW5jaWVzKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVSTCB0byBnZW5lcmF0ZSBhdmFpbGFibGUgVVJMIGZvciAoZ2VuZXJhdGVfdXJsKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlcGVuZGVuY3kgZGlyZWN0aW9uIChnZXRfZGVwZW5kZW5jaWVzKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydkZXBlbmRlbnRzJywgJ2RlcGVuZGVuY2llcycsICdib3RoJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RlcGVuZGVuY2llcydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yeSB0byBzY2FuIChnZXRfdW51c2VkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2RiOi8vYXNzZXRzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2x1ZGVEaXJlY3Rvcmllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RpcmVjdG9yaWVzIHRvIGV4Y2x1ZGUgZnJvbSBzY2FuIChnZXRfdW51c2VkKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhSZXN1bHRzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNYXhpbXVtIG51bWJlciBvZiB1bnVzZWQgYXNzZXRzIHRvIHJldHVybiAoZ2V0X3VudXNlZCkuIERlZmF1bHQ6IDUwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyb3VwQnlGb2xkZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHcm91cCByZXN1bHRzIGJ5IGZvbGRlciB3aXRoIGNvdW50cyBpbnN0ZWFkIG9mIGxpc3RpbmcgZXZlcnkgZmlsZSAoZ2V0X3VudXNlZCkuIERlZmF1bHQ6IGZhbHNlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Fzc2V0X2JhdGNoJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0JhdGNoIGFzc2V0IG9wczogaW1wb3J0LCBkZWxldGUsIHZhbGlkYXRlIHJlZmVyZW5jZXMsIHNjYW4gc2NlbmUgZm9yIG1pc3NpbmcgcmVmcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydpbXBvcnQnLCAnZGVsZXRlJywgJ3ZhbGlkYXRlX3JlZmVyZW5jZXMnLCAnc2Nhbl9zY2VuZV9yZWZzJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2VEaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvdXJjZSBkaXJlY3RvcnkgcGF0aCAoaW1wb3J0KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXREaXJlY3Rvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBkaXJlY3RvcnkgVVJMIChpbXBvcnQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVGaWx0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaWxlIGV4dGVuc2lvbnMgdG8gaW5jbHVkZSwgZS5nLiBbXCIucG5nXCIsIFwiLmpwZ1wiXSAoaW1wb3J0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIHN1YmRpcmVjdG9yaWVzIChpbXBvcnQpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ092ZXJ3cml0ZSBleGlzdGluZyBmaWxlcyAoaW1wb3J0KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmxzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXJyYXkgb2YgYXNzZXQgVVJMcyB0byBkZWxldGUgKGRlbGV0ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlyZWN0b3J5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEaXJlY3RvcnkgdG8gb3BlcmF0ZSBvbiAodmFsaWRhdGVfcmVmZXJlbmNlcyknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6ICdkYjovL2Fzc2V0cydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdhc3NldF9hZHZhbmNlZCc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dlbmVyYXRlX3VybCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZW5lcmF0ZUF2YWlsYWJsZVVybChhcmdzLnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RiX3JlYWR5JzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5QXNzZXREYlJlYWR5KCk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2dldF9kZXBlbmRlbmNpZXMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QXNzZXREZXBlbmRlbmNpZXMoYXJncy51cmxPclVVSUQsIGFyZ3MuZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZ2V0X3VudXNlZCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRVbnVzZWRBc3NldHMoYXJncy5kaXJlY3RvcnksIGFyZ3MuZXhjbHVkZURpcmVjdG9yaWVzLCBhcmdzLm1heFJlc3VsdHMsIGFyZ3MuZ3JvdXBCeUZvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIGZvciBhc3NldF9hZHZhbmNlZDogJHthcmdzLmFjdGlvbn1gKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdhc3NldF9iYXRjaCc6IHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5iYXRjaEltcG9ydEFzc2V0cyhhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJhdGNoRGVsZXRlQXNzZXRzKGFyZ3MudXJscyk7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ3ZhbGlkYXRlX3JlZmVyZW5jZXMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVBc3NldFJlZmVyZW5jZXMoYXJncy5kaXJlY3RvcnkpO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdzY2FuX3NjZW5lX3JlZnMnOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2NhblNjZW5lTWlzc2luZ1JlZnMoKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBhY3Rpb24gZm9yIGFzc2V0X2JhdGNoOiAke2FyZ3MuYWN0aW9ufWApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlQXZhaWxhYmxlVXJsKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIHRvb2xDYWxsKFxuICAgICAgICAgICAgKCkgPT4gZWRpdG9yUmVxdWVzdDxzdHJpbmc+KCdhc3NldC1kYicsICdnZW5lcmF0ZS1hdmFpbGFibGUtdXJsJywgdXJsKSxcbiAgICAgICAgICAgIChhdmFpbGFibGVVcmwpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbFVybDogdXJsLFxuICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVVcmw6IGF2YWlsYWJsZVVybCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYXZhaWxhYmxlVXJsID09PSB1cmwgP1xuICAgICAgICAgICAgICAgICAgICAgICAgJ1VSTCBpcyBhdmFpbGFibGUnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICdHZW5lcmF0ZWQgbmV3IGF2YWlsYWJsZSBVUkwnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5QXNzZXREYlJlYWR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiB0b29sQ2FsbChcbiAgICAgICAgICAgICgpID0+IGVkaXRvclJlcXVlc3Q8Ym9vbGVhbj4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXJlYWR5JyksXG4gICAgICAgICAgICAocmVhZHkpID0+ICh7XG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICByZWFkeTogcmVhZHksXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IHJlYWR5ID8gJ0Fzc2V0IGRhdGFiYXNlIGlzIHJlYWR5JyA6ICdBc3NldCBkYXRhYmFzZSBpcyBub3QgcmVhZHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoSW1wb3J0QXNzZXRzKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG4gICAgICAgICAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXJncy5zb3VyY2VEaXJlY3RvcnkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnU291cmNlIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdCcgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSB0aGlzLmdldEZpbGVzRnJvbURpcmVjdG9yeShcbiAgICAgICAgICAgICAgICBhcmdzLnNvdXJjZURpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICBhcmdzLmZpbGVGaWx0ZXIgfHwgW10sXG4gICAgICAgICAgICAgICAgYXJncy5yZWN1cnNpdmUgfHwgZmFsc2VcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGNvbnN0IGltcG9ydFJlc3VsdHM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiBmaWxlcykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBgJHthcmdzLnRhcmdldERpcmVjdG9yeX0vJHtmaWxlTmFtZX1gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCwgdGFyZ2V0UGF0aCwge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG92ZXJ3cml0ZTogYXJncy5vdmVyd3JpdGUgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVuYW1lOiAhKGFyZ3Mub3ZlcndyaXRlIHx8IGZhbHNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0UmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldFBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogcmVzdWx0Py51dWlkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ291bnQrKztcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnRSZXN1bHRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbEZpbGVzOiBmaWxlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudDogc3VjY2Vzc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiBlcnJvckNvdW50LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBpbXBvcnRSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQmF0Y2ggaW1wb3J0IGNvbXBsZXRlZDogJHtzdWNjZXNzQ291bnR9IHN1Y2Nlc3MsICR7ZXJyb3JDb3VudH0gZXJyb3JzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGdldEZpbGVzRnJvbURpcmVjdG9yeShkaXJQYXRoOiBzdHJpbmcsIGZpbGVGaWx0ZXI6IHN0cmluZ1tdLCByZWN1cnNpdmU6IGJvb2xlYW4pOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICAgICAgY29uc3QgcGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbiAgICAgICAgY29uc3QgZmlsZXM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhkaXJQYXRoKTtcblxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIGl0ZW0pO1xuICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcblxuICAgICAgICAgICAgaWYgKHN0YXQuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUZpbHRlci5sZW5ndGggPT09IDAgfHwgZmlsZUZpbHRlci5zb21lKGV4dCA9PiBpdGVtLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoZXh0LnRvTG93ZXJDYXNlKCkpKSkge1xuICAgICAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKGZ1bGxQYXRoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSAmJiByZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKC4uLnRoaXMuZ2V0RmlsZXNGcm9tRGlyZWN0b3J5KGZ1bGxQYXRoLCBmaWxlRmlsdGVyLCByZWN1cnNpdmUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBmaWxlcztcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoRGVsZXRlQXNzZXRzKHVybHM6IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVJlc3VsdHM6IGFueVtdID0gW107XG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcblxuICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgdXJscykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGVkaXRvclJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHVybCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudCsrO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVyci5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogdXJscy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NDb3VudDogc3VjY2Vzc0NvdW50LFxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiBlcnJvckNvdW50LFxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBkZWxldGVSZXN1bHRzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQmF0Y2ggZGVsZXRlIGNvbXBsZXRlZDogJHtzdWNjZXNzQ291bnR9IHN1Y2Nlc3MsICR7ZXJyb3JDb3VudH0gZXJyb3JzYFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlQXNzZXRSZWZlcmVuY2VzKGRpcmVjdG9yeTogc3RyaW5nID0gJ2RiOi8vYXNzZXRzJyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBHZXQgYWxsIGFzc2V0cyBpbiBkaXJlY3RvcnlcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0cyA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8YW55W10+KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IGAke2RpcmVjdG9yeX0vKiovKmAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGJyb2tlblJlZmVyZW5jZXM6IGFueVtdID0gW107XG4gICAgICAgICAgICBjb25zdCB2YWxpZFJlZmVyZW5jZXM6IGFueVtdID0gW107XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRJbmZvID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFzc2V0LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhc3NldEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkUmVmZXJlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGFzc2V0Lm5hbWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGFzc2V0LnVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnIgYXMgRXJyb3IpLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBkaXJlY3Rvcnk6IGRpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxBc3NldHM6IGFzc2V0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkUmVmZXJlbmNlczogdmFsaWRSZWZlcmVuY2VzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgYnJva2VuUmVmZXJlbmNlczogYnJva2VuUmVmZXJlbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlbkFzc2V0czogYnJva2VuUmVmZXJlbmNlcyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFZhbGlkYXRpb24gY29tcGxldGVkOiAke2Jyb2tlblJlZmVyZW5jZXMubGVuZ3RofSBicm9rZW4gcmVmZXJlbmNlcyBmb3VuZGBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzY2FuU2NlbmVNaXNzaW5nUmVmcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU3RlcCAxOiBXYWxrIG5vZGUgdHJlZSwgY29sbGVjdCBhbGwgbm9kZSBVVUlEc1xuICAgICAgICAgICAgY29uc3Qgbm9kZVRyZWUgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICAgICAgICAgIGlmICghbm9kZVRyZWUpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBxdWVyeSBzY2VuZSBub2RlIHRyZWUnIH07XG5cbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IHF1ZXVlOiBhbnlbXSA9IFtub2RlVHJlZV07XG4gICAgICAgICAgICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlPy51dWlkKSBub2RlVXVpZHMucHVzaChub2RlLnV1aWQpO1xuICAgICAgICAgICAgICAgIGlmIChub2RlPy5jaGlsZHJlbikgcXVldWUucHVzaCguLi5ub2RlLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkU2V0ID0gbmV3IFNldChub2RlVXVpZHMpO1xuXG4gICAgICAgICAgICAvLyBTdGVwIDI6IFF1ZXJ5IGFsbCBub2RlcyBpbiBwYXJhbGxlbCBiYXRjaGVzLCBjb2xsZWN0IFVVSUQgcmVmc1xuICAgICAgICAgICAgY29uc3QgTk9ERV9CQVRDSCA9IDEwO1xuICAgICAgICAgICAgY29uc3QgdXVpZFRvUmVmcyA9IG5ldyBNYXA8c3RyaW5nLCB7IG5vZGVVdWlkOiBzdHJpbmc7IG5vZGVOYW1lOiBzdHJpbmc7IGNvbXBvbmVudFR5cGU6IHN0cmluZzsgcHJvcGVydHk6IHN0cmluZyB9W10+KCk7XG5cbiAgICAgICAgICAgIC8vIFRyYWNrIGNvbXBvbmVudC1pbnN0YW5jZSB1dWlkcyBzbyB3ZSBjYW4gZXhjbHVkZSB0aGVtIGZyb20gXCJhc3NldFwiIGNhbmRpZGF0ZXMgYmVsb3cuXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRVdWlkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZVV1aWRzLmxlbmd0aDsgaSArPSBOT0RFX0JBVENIKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmF0Y2ggPSBub2RlVXVpZHMuc2xpY2UoaSwgaSArIE5PREVfQkFUQ0gpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICAgICAgYmF0Y2gubWFwKHV1aWQgPT4gZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHV1aWQpLmNhdGNoKCgpID0+IG51bGwpKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCByZXN1bHRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhID0gcmVzdWx0c1tqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFub2RlRGF0YT8uX19jb21wc19fKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZVV1aWQgPSBiYXRjaFtqXTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZU5hbWUgPSBub2RlRGF0YS5uYW1lPy52YWx1ZSA/PyBub2RlRGF0YS5uYW1lID8/IG5vZGVVdWlkO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2Ygbm9kZURhdGEuX19jb21wc19fIGFzIGFueVtdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wVHlwZSA9IChjb21wIGFzIGFueSkuX190eXBlX18gfHwgKGNvbXAgYXMgYW55KS5jaWQgfHwgKGNvbXAgYXMgYW55KS50eXBlIHx8ICdVbmtub3duJztcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbXBvbmVudCBpbnN0YW5jZSB1dWlkIGxpdmVzIGF0IGNvbXAudmFsdWUudXVpZC52YWx1ZSAocmF3IHF1ZXJ5LW5vZGUgc2hhcGUpIG9yIGNvbXAudXVpZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBJbnN0YW5jZVV1aWQgPSAoY29tcCBhcyBhbnkpLnZhbHVlPy51dWlkPy52YWx1ZSB8fCAoY29tcCBhcyBhbnkpLnV1aWQ/LnZhbHVlIHx8IChjb21wIGFzIGFueSkudXVpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcEluc3RhbmNlVXVpZCA9PT0gJ3N0cmluZycgJiYgY29tcEluc3RhbmNlVXVpZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VXVpZFNldC5hZGQoY29tcEluc3RhbmNlVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxlY3RSZWZVdWlkcyhjb21wIGFzIGFueSwgY29tcFR5cGUsIG5vZGVVdWlkLCBTdHJpbmcobm9kZU5hbWUpLCB1dWlkVG9SZWZzKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVtb3ZlIG5vbi1hc3NldCB1dWlkczogc2NlbmUgbm9kZSB1dWlkcyBhbmQgY29tcG9uZW50LWluc3RhbmNlIHV1aWRzIGJvdGggc3VyZmFjZSBhcyBge3V1aWR9YFxuICAgICAgICAgICAgLy8gcmVmcyBidXQgYXJlIG5vdCBhc3NldHMgaW4gdGhlIGFzc2V0LWRiLlxuICAgICAgICAgICAgZm9yIChjb25zdCB1dWlkIG9mIG5vZGVVdWlkU2V0KSB1dWlkVG9SZWZzLmRlbGV0ZSh1dWlkKTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdXVpZCBvZiBjb21wb25lbnRVdWlkU2V0KSB1dWlkVG9SZWZzLmRlbGV0ZSh1dWlkKTtcblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBWYWxpZGF0ZSB1bmlxdWUgYXNzZXQgVVVJRHMgYWdhaW5zdCBhc3NldC1kYiBpbiBwYXJhbGxlbCBiYXRjaGVzXG4gICAgICAgICAgICBjb25zdCB1bmlxdWVVdWlkcyA9IEFycmF5LmZyb20odXVpZFRvUmVmcy5rZXlzKCkpO1xuICAgICAgICAgICAgY29uc3QgQVNTRVRfQkFUQ0ggPSAyMDtcbiAgICAgICAgICAgIGNvbnN0IG1pc3NpbmdVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVuaXF1ZVV1aWRzLmxlbmd0aDsgaSArPSBBU1NFVF9CQVRDSCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoID0gdW5pcXVlVXVpZHMuc2xpY2UoaSwgaSArIEFTU0VUX0JBVENIKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgICAgICAgICAgIGJhdGNoLm1hcCh1dWlkID0+XG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3JSZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbigoaW5mbzogYW55KSA9PiAoeyB1dWlkLCBleGlzdHM6ICEhaW5mbyB9KSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKCkgPT4gKHsgdXVpZCwgZXhpc3RzOiBmYWxzZSB9KSlcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB7IHV1aWQsIGV4aXN0cyB9IG9mIHJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleGlzdHMpIG1pc3NpbmdVdWlkcy5hZGQodXVpZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTdGVwIDQ6IEJ1aWxkIHJlcG9ydFxuICAgICAgICAgICAgY29uc3QgbWlzc2luZ1JlZnMgPSBBcnJheS5mcm9tKG1pc3NpbmdVdWlkcykubWFwKHV1aWQgPT4gKHtcbiAgICAgICAgICAgICAgICBtaXNzaW5nVXVpZDogdXVpZCxcbiAgICAgICAgICAgICAgICByZWZlcmVuY2VkQnk6IHV1aWRUb1JlZnMuZ2V0KHV1aWQpID8/IFtdXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHRvdGFsTm9kZXM6IG5vZGVVdWlkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW5pcXVlQXNzZXRSZWZzOiB1bmlxdWVVdWlkcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmdDb3VudDogbWlzc2luZ1V1aWRzLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIG1pc3NpbmdSZWZzLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtaXNzaW5nVXVpZHMuc2l6ZSA9PT0gMFxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnTm8gbWlzc2luZyBhc3NldCByZWZlcmVuY2VzIGZvdW5kIGluIHNjZW5lJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiBgRm91bmQgJHttaXNzaW5nVXVpZHMuc2l6ZX0gbWlzc2luZyBhc3NldCByZWZlcmVuY2UocykgYWNyb3NzICR7bWlzc2luZ1JlZnMucmVkdWNlKChuLCByKSA9PiBuICsgci5yZWZlcmVuY2VkQnkubGVuZ3RoLCAwKX0gY29tcG9uZW50IHByb3BlcnRpZXNgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgY29sbGVjdFJlZlV1aWRzKFxuICAgICAgICBjb21wOiBhbnksXG4gICAgICAgIGNvbXBUeXBlOiBzdHJpbmcsXG4gICAgICAgIG5vZGVVdWlkOiBzdHJpbmcsXG4gICAgICAgIG5vZGVOYW1lOiBzdHJpbmcsXG4gICAgICAgIHV1aWRUb1JlZnM6IE1hcDxzdHJpbmcsIHsgbm9kZVV1aWQ6IHN0cmluZzsgbm9kZU5hbWU6IHN0cmluZzsgY29tcG9uZW50VHlwZTogc3RyaW5nOyBwcm9wZXJ0eTogc3RyaW5nIH1bXT5cbiAgICApOiB2b2lkIHtcbiAgICAgICAgLy8gV2FsayB0aGUgQ29jb3MgcXVlcnktbm9kZSBjb21wb25lbnQgc2hhcGUuIEVkaXRhYmxlIGZpZWxkcyBsaXZlIHVuZGVyIGVpdGhlciBgY29tcC52YWx1ZWBcbiAgICAgICAgLy8gKHJhdyBzY2VuZSBwYXlsb2FkKSBvciBkaXJlY3RseSBvbiBgY29tcGAgKHNvbWUgYnVpbGRzKS4gRWFjaCBmaWVsZCBpcyBhIGRlc2NyaXB0b3Igb2YgdGhlXG4gICAgICAgIC8vIGZvcm0gYHsgbmFtZSwgdmFsdWUsIHR5cGUsIC4uLiB9YCB3aGVyZSBgdmFsdWVgIGhvbGRzIHRoZSBhY3R1YWwgZGF0YS5cbiAgICAgICAgLy8gV2UgYXR0cmlidXRlIHJlZnMgdG8gdGhlIE9VVEVSIGtleSAoZS5nLiBgY2FtZXJhQ29tcG9uZW50YCksIG5vdCB0aGUgZGVzY3JpcHRvcidzIGxpdGVyYWwgYHZhbHVlYC5cbiAgICAgICAgY29uc3QgaXNEZXNjcmlwdG9yID0gKHY6IGFueSk6IGJvb2xlYW4gPT5cbiAgICAgICAgICAgIHYgJiYgdHlwZW9mIHYgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHYpICYmICd2YWx1ZScgaW4gdiAmJiAoJ3R5cGUnIGluIHYgfHwgJ25hbWUnIGluIHYpO1xuXG4gICAgICAgIGNvbnN0IHNlZW4gPSBuZXcgV2Vha1NldDxvYmplY3Q+KCk7XG4gICAgICAgIGNvbnN0IHJlY29yZFJlZiA9ICh1dWlkOiBzdHJpbmcsIHByb3BOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgIGlmICghdXVpZFRvUmVmcy5oYXModXVpZCkpIHV1aWRUb1JlZnMuc2V0KHV1aWQsIFtdKTtcbiAgICAgICAgICAgIHV1aWRUb1JlZnMuZ2V0KHV1aWQpIS5wdXNoKHsgbm9kZVV1aWQsIG5vZGVOYW1lLCBjb21wb25lbnRUeXBlOiBjb21wVHlwZSwgcHJvcGVydHk6IHByb3BOYW1lIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHdhbGtWYWx1ZSA9ICh2YWw6IGFueSwgcHJvcE5hbWU6IHN0cmluZywgZGVwdGg6IG51bWJlcikgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB2YWwgPT09IHVuZGVmaW5lZCB8fCBkZXB0aCA+IDEyKSByZXR1cm47XG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChzZWVuLmhhcyh2YWwpKSByZXR1cm47XG4gICAgICAgICAgICBzZWVuLmFkZCh2YWwpO1xuXG4gICAgICAgICAgICAvLyBBcnJheTogcmVjdXJzZSBlYWNoIGl0ZW0sIGtlZXAgcHJvcE5hbWVcbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgdmFsKSB3YWxrVmFsdWUoaXRlbSwgcHJvcE5hbWUsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEaXJlY3QgcmVmIHNoYXBlIGB7IHV1aWQgfWAgb3IgYHsgX191dWlkX18gfWAuIEZpbHRlciBlbXB0eSBzdHJpbmdzICh1bnNldCBzbG90cykuXG4gICAgICAgICAgICBjb25zdCB1dWlkID0gKHZhbCBhcyBhbnkpLnV1aWQgPz8gKHZhbCBhcyBhbnkpLl9fdXVpZF9fO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB1dWlkID09PSAnc3RyaW5nJyAmJiB1dWlkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZWNvcmRSZWYodXVpZCwgcHJvcE5hbWUpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVzY3JpcHRvciB3cmFwcGVyIGB7IG5hbWUsIHZhbHVlLCB0eXBlLCAuLi4gfWAg4oCUIHJlY3Vyc2UgaW50byBgdmFsdWVgIG9ubHksIGtlZXAgcHJvcE5hbWUuXG4gICAgICAgICAgICBpZiAoaXNEZXNjcmlwdG9yKHZhbCkpIHtcbiAgICAgICAgICAgICAgICB3YWxrVmFsdWUoKHZhbCBhcyBhbnkpLnZhbHVlLCBwcm9wTmFtZSwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFBsYWluIG9iamVjdDogZWFjaCBvd24ga2V5IGJlY29tZXMgdGhlIG5ldyBwcm9wTmFtZSBmb3IgaXRzIHN1YnRyZWUuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh2YWwpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlOyAvLyBza2lwIHByaXZhdGUgbWlycm9ycyBsaWtlIGBfY29sb3JgXG4gICAgICAgICAgICAgICAgd2Fsa1ZhbHVlKCh2YWwgYXMgYW55KVtrZXldLCBrZXksIGRlcHRoICsgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVG9wLWxldmVsOiBoYW5kbGUgYm90aCBzaGFwZXMgKGBjb21wLnZhbHVlYCB3cmFwcGVyIGFuZCBkaXJlY3QpLlxuICAgICAgICBjb25zdCByb290ID0gY29tcCAmJiB0eXBlb2YgY29tcCA9PT0gJ29iamVjdCcgJiYgY29tcC52YWx1ZSAmJiB0eXBlb2YgY29tcC52YWx1ZSA9PT0gJ29iamVjdCcgPyBjb21wLnZhbHVlIDogY29tcDtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocm9vdCkpIHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIFNraXAgd3JhcHBlciBtZXRhZGF0YSBrZXlzIGF0IHRoZSBjb21wb25lbnQgcm9vdC5cbiAgICAgICAgICAgIGlmIChbJ19fdHlwZV9fJywgJ2NpZCcsICdlbmFibGVkJywgJ3R5cGUnLCAnbmFtZScsICd1dWlkJ10uaW5jbHVkZXMoa2V5KSkgY29udGludWU7XG4gICAgICAgICAgICAvLyBgbm9kZWAgaXMgdGhlIGJhY2stcG9pbnRlciB0byB0aGUgb3duaW5nIG5vZGUg4oCUIG5ldmVyIGFuIGFzc2V0LlxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ25vZGUnKSBjb250aW51ZTtcbiAgICAgICAgICAgIHdhbGtWYWx1ZSgocm9vdCBhcyBhbnkpW2tleV0sIGtleSwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldEFzc2V0RGVwZW5kZW5jaWVzKHVybE9yVVVJRDogc3RyaW5nLCBkaXJlY3Rpb246IHN0cmluZyA9ICdkZXBlbmRlbmNpZXMnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYXNzZXQgVVVJRCBhbmQgVVJMXG4gICAgICAgICAgICBsZXQgYXNzZXRVdWlkOiBzdHJpbmc7XG4gICAgICAgICAgICBsZXQgYXNzZXRVcmw6IHN0cmluZztcblxuICAgICAgICAgICAgaWYgKHVybE9yVVVJRC5zdGFydHNXaXRoKCdkYjovLycpKSB7XG4gICAgICAgICAgICAgICAgYXNzZXRVcmwgPSB1cmxPclVVSUQ7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8YW55PignYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHVybE9yVVVJRCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpbmZvPy51dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7dXJsT3JVVUlEfWAgfTtcbiAgICAgICAgICAgICAgICBhc3NldFV1aWQgPSBpbmZvLnV1aWQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2V0VXVpZCA9IHVybE9yVVVJRDtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PHN0cmluZz4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHVybE9yVVVJRCk7XG4gICAgICAgICAgICAgICAgaWYgKCF1cmwpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHt1cmxPclVVSUR9YCB9O1xuICAgICAgICAgICAgICAgIGFzc2V0VXJsID0gdXJsO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgICAgICBjb25zdCBhc3NldHNQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XG5cbiAgICAgICAgICAgIC8vIENvbGxlY3QgYWxsIFVVSURzIGZvciB0aGlzIGFzc2V0IChtYWluICsgc3ViLWFzc2V0cyBmcm9tIC5tZXRhKVxuICAgICAgICAgICAgY29uc3QgYWxsQXNzZXRVdWlkcyA9IG5ldyBTZXQ8c3RyaW5nPihbYXNzZXRVdWlkXSk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZzUGF0aCA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8c3RyaW5nPignYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICBpZiAoZnNQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFQYXRoID0gZnNQYXRoICsgJy5tZXRhJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobWV0YVBhdGgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobWV0YVBhdGgsICd1dGY4JykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0U3ViVXVpZHMobWV0YS5zdWJNZXRhcywgYWxsQXNzZXRVdWlkcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlIG1ldGEgcmVhZCBlcnJvcnMgKi8gfVxuXG4gICAgICAgICAgICBjb25zdCBkZXBlbmRlbmNpZXM6IEFycmF5PHsgdXVpZDogc3RyaW5nOyB1cmw6IHN0cmluZyB9PiA9IFtdO1xuICAgICAgICAgICAgY29uc3QgZGVwZW5kZW50czogQXJyYXk8eyB1cmw6IHN0cmluZyB9PiA9IFtdO1xuXG4gICAgICAgICAgICAvLyBGaW5kIGRlcGVuZGVuY2llczogYXNzZXRzIHRoaXMgZmlsZSByZWZlcmVuY2VzIHZpYSBfX3V1aWRfXyBhbmQgX190eXBlX19cbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdkZXBlbmRlbmNpZXMnIHx8IGRpcmVjdGlvbiA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnNQYXRoID0gYXdhaXQgZWRpdG9yUmVxdWVzdDxzdHJpbmc+KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnNQYXRoICYmIGZzLmV4aXN0c1N5bmMoZnNQYXRoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmc1BhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX191dWlkX18gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmVXVpZHMgPSB0aGlzLmV4dHJhY3RVdWlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCByZWYgb2YgcmVmVXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXVpZCA9IHJlZi5zcGxpdCgnQCcpWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWVuLmhhcyhiYXNlVXVpZCkgfHwgYWxsQXNzZXRVdWlkcy5oYXMoYmFzZVV1aWQpKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWVuLmFkZChiYXNlVXVpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PHN0cmluZz4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIGJhc2VVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLnB1c2goeyB1dWlkOiBiYXNlVXVpZCwgdXJsOiByZWZVcmwgfHwgJ3VucmVzb2x2ZWQnIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXMucHVzaCh7IHV1aWQ6IGJhc2VVdWlkLCB1cmw6ICd1bnJlc29sdmVkJyB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgX190eXBlX18gcmVmZXJlbmNlcyAoY3VzdG9tIHNjcmlwdCBjb21wb25lbnRzIHVzZSBjb21wcmVzc2VkIFVVSURzKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZUlkcyA9IHRoaXMuZXh0cmFjdFR5cGVJZHNGcm9tQ29udGVudChjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZUlkIG9mIHR5cGVJZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvbXByZXNzZWQgPSB0aGlzLmRlY29tcHJlc3NVdWlkKHR5cGVJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFkZWNvbXByZXNzZWQgfHwgc2Vlbi5oYXMoZGVjb21wcmVzc2VkKSkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vlbi5hZGQoZGVjb21wcmVzc2VkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZWZVcmwgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0PHN0cmluZz4oJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIGRlY29tcHJlc3NlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZWZVcmwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKHsgdXVpZDogZGVjb21wcmVzc2VkLCB1cmw6IHJlZlVybCB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggeyAvKiBub3QgYSB2YWxpZCBzY3JpcHQgVVVJRCAqLyB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIHsgLyogaWdub3JlIHJlYWQgZXJyb3JzICovIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmluZCBkZXBlbmRlbnRzOiBzZXJpYWxpemVkIGZpbGVzIHRoYXQgcmVmZXJlbmNlIHRoaXMgYXNzZXQncyBVVUlEc1xuICAgICAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gJ2RlcGVuZGVudHMnIHx8IGRpcmVjdGlvbiA9PT0gJ2JvdGgnKSB7XG4gICAgICAgICAgICAgICAgLy8gQnVpbGQgc2VhcmNoIHN0cmluZ3M6IG9yaWdpbmFsIFVVSURzICsgY29tcHJlc3NlZCBmb3JtcyBmb3IgX190eXBlX18gbWF0Y2hpbmdcbiAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hTdHJpbmdzID0gbmV3IFNldDxzdHJpbmc+KGFsbEFzc2V0VXVpZHMpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdWlkIG9mIGFsbEFzc2V0VXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcHJlc3NlZCA9IHRoaXMuY29tcHJlc3NVdWlkKHVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCA9PT0gMjIpIHNlYXJjaFN0cmluZ3MuYWRkKGNvbXByZXNzZWQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMud2Fsa1NlcmlhbGl6ZWRGaWxlcyhhc3NldHNQYXRoLCAoZmlsZVBhdGgsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzdHIgb2Ygc2VhcmNoU3RyaW5ncykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQuaW5jbHVkZXMoc3RyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVVcmwgPSAnZGI6Ly8nICsgZmlsZVBhdGguc3Vic3RyaW5nKHByb2plY3RQYXRoLmxlbmd0aCArIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlVXJsICE9PSBhc3NldFVybCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbnRzLnB1c2goeyB1cmw6IGZpbGVVcmwgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0OiB7IHV1aWQ6IGFzc2V0VXVpZCwgdXJsOiBhc3NldFVybCwgYWxsVXVpZHM6IEFycmF5LmZyb20oYWxsQXNzZXRVdWlkcykgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW5jaWVzLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbnRzLFxuICAgICAgICAgICAgICAgICAgICBkZXBlbmRlbmNpZXNDb3VudDogZGVwZW5kZW5jaWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgZGVwZW5kZW50c0NvdW50OiBkZXBlbmRlbnRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7ZGVwZW5kZW5jaWVzLmxlbmd0aH0gZGVwZW5kZW5jaWVzIGFuZCAke2RlcGVuZGVudHMubGVuZ3RofSBkZXBlbmRlbnRzIGZvciAke2Fzc2V0VXJsfWBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRGVwZW5kZW5jeSBhbmFseXNpcyBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRVbnVzZWRBc3NldHMoZGlyZWN0b3J5OiBzdHJpbmcgPSAnZGI6Ly9hc3NldHMnLCBleGNsdWRlRGlyZWN0b3JpZXM6IHN0cmluZ1tdID0gW10sIG1heFJlc3VsdHM6IG51bWJlciA9IDUwLCBncm91cEJ5Rm9sZGVyOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xuICAgICAgICAgICAgY29uc3QgYmFzZVBhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIGRpcmVjdG9yeS5yZXBsYWNlKCdkYjovLycsICcnKSk7XG5cbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhiYXNlUGF0aCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBEaXJlY3Rvcnkgbm90IGZvdW5kOiAke2RpcmVjdG9yeX1gIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMTogQnVpbGQgVVVJRCAtPiBhc3NldCBVUkwgbWFwIGZyb20gLm1ldGEgZmlsZXNcbiAgICAgICAgICAgIC8vIEFsc28gYnVpbGQgY29tcHJlc3NlZCBVVUlEIG1hcCBmb3IgX190eXBlX18gbWF0Y2hpbmcgKHNjcmlwdCBjb21wb25lbnRzKVxuICAgICAgICAgICAgY29uc3QgdXVpZFRvVXJsID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWRUb1VybCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gICAgICAgICAgICBjb25zdCBhbGxBc3NldHM6IEFycmF5PHsgdXJsOiBzdHJpbmc7IGV4dDogc3RyaW5nIH0+ID0gW107XG5cbiAgICAgICAgICAgIHRoaXMud2Fsa0RpcmVjdG9yeShiYXNlUGF0aCwgKGZpbGVQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFmaWxlUGF0aC5lbmRzV2l0aCgnLm1ldGEnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgYXNzZXRGc1BhdGggPSBmaWxlUGF0aC5zbGljZSgwLCAtNSk7IC8vIFJlbW92ZSAubWV0YSBzdWZmaXhcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldFVybCA9ICdkYjovLycgKyBhc3NldEZzUGF0aC5zdWJzdHJpbmcocHJvamVjdFBhdGgubGVuZ3RoICsgMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBleGNsdWRlIGRpcmVjdG9yaWVzXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBleGNsIG9mIGV4Y2x1ZGVEaXJlY3Rvcmllcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXNzZXRVcmwuc3RhcnRzV2l0aChleGNsKSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNraXAgaWYgYWN0dWFsIGFzc2V0IGRvZXNuJ3QgZXhpc3Qgb3IgaXMgYSBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYXNzZXRGc1BhdGgpIHx8IGZzLnN0YXRTeW5jKGFzc2V0RnNQYXRoKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IHJldHVybjsgfVxuXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXh0ID0gcGF0aC5leHRuYW1lKGFzc2V0RnNQYXRoKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbEFzc2V0cy5wdXNoKHsgdXJsOiBhc3NldFVybCwgZXh0IH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcCBtYWluIFVVSUQgdG8gYXNzZXQgVVJMXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXRhLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRUb1VybC5zZXQobWV0YS51dWlkLCBhc3NldFVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wcmVzc2VkID0gdGhpcy5jb21wcmVzc1V1aWQobWV0YS51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCA9PT0gMjIpIGNvbXByZXNzZWRUb1VybC5zZXQoY29tcHJlc3NlZCwgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFwIHN1Yi1hc3NldCBVVUlEcyB0byBwYXJlbnQgYXNzZXQgVVJMXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YlV1aWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdFN1YlV1aWRzKG1ldGEuc3ViTWV0YXMsIHN1YlV1aWRzKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzdWJVdWlkIG9mIHN1YlV1aWRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkVG9Vcmwuc2V0KHN1YlV1aWQsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXByZXNzZWQgPSB0aGlzLmNvbXByZXNzVXVpZChzdWJVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCA9PT0gMjIpIGNvbXByZXNzZWRUb1VybC5zZXQoY29tcHJlc3NlZCwgYXNzZXRVcmwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNraXAgdW5wYXJzZWFibGUgbWV0YSBmaWxlcyAqLyB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU3RlcCAyOiBTY2FuIEFMTCBzZXJpYWxpemVkIGZpbGVzIGluIGVudGlyZSBhc3NldHMgZm9sZGVyIChub3QganVzdCB0YXJnZXQgZGlyZWN0b3J5KVxuICAgICAgICAgICAgLy8gYmVjYXVzZSBzY2VuZXMvcHJlZmFicyByZWZlcmVuY2luZyB0YXJnZXQgYXNzZXRzIG1heSBiZSBpbiBvdGhlciBmb2xkZXJzXG4gICAgICAgICAgICBjb25zdCBhc3NldHNQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCAnYXNzZXRzJyk7XG4gICAgICAgICAgICBjb25zdCByZWZlcmVuY2VkVXJscyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgICAgICAgICB0aGlzLndhbGtTZXJpYWxpemVkRmlsZXMoYXNzZXRzUGF0aCwgKF9maWxlUGF0aCwgY29udGVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIF9fdXVpZF9fIHJlZmVyZW5jZXMgKGltYWdlcywgcHJlZmFicywgbWF0ZXJpYWxzLCBldGMuKVxuICAgICAgICAgICAgICAgIGNvbnN0IHV1aWRzID0gdGhpcy5leHRyYWN0VXVpZHNGcm9tQ29udGVudChjb250ZW50KTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHV1aWQgb2YgdXVpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVV1aWQgPSB1dWlkLnNwbGl0KCdAJylbMF07XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHV1aWRUb1VybC5nZXQoYmFzZVV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXJsKSByZWZlcmVuY2VkVXJscy5hZGQodXJsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBfX3R5cGVfXyByZWZlcmVuY2VzIChzY3JpcHQgY29tcG9uZW50cyB1c2UgY29tcHJlc3NlZCBVVUlEcylcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlSWRzID0gdGhpcy5leHRyYWN0VHlwZUlkc0Zyb21Db250ZW50KGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdHlwZUlkIG9mIHR5cGVJZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gY29tcHJlc3NlZFRvVXJsLmdldCh0eXBlSWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodXJsKSByZWZlcmVuY2VkVXJscy5hZGQodXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU3RlcCAzOiBGaW5kIHVudXNlZCBhc3NldHMsIHNlcGFyYXRlIHNjcmlwdHMgZnJvbSBvdGhlciBhc3NldHNcbiAgICAgICAgICAgIGNvbnN0IHNjcmlwdEV4dHMgPSBbJy50cycsICcuanMnXTtcbiAgICAgICAgICAgIGNvbnN0IGFsbFVudXNlZEFzc2V0czogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgIGNvbnN0IGFsbFVudXNlZFNjcmlwdHM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYWxsQXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFyZWZlcmVuY2VkVXJscy5oYXMoYXNzZXQudXJsKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc2NyaXB0RXh0cy5pbmNsdWRlcyhhc3NldC5leHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGxVbnVzZWRTY3JpcHRzLnB1c2goYXNzZXQudXJsKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsbFVudXNlZEFzc2V0cy5wdXNoKGFzc2V0LnVybCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHRvdGFsVW51c2VkQXNzZXRzID0gYWxsVW51c2VkQXNzZXRzLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHRvdGFsVW51c2VkU2NyaXB0cyA9IGFsbFVudXNlZFNjcmlwdHMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3QgbGltaXQgPSBNYXRoLm1heCgxLCBtYXhSZXN1bHRzKTtcblxuICAgICAgICAgICAgaWYgKGdyb3VwQnlGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICAvLyBHcm91cCBieSBwYXJlbnQgZm9sZGVyIHdpdGggY291bnRzXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyTWFwID0gbmV3IE1hcDxzdHJpbmcsIHsgYXNzZXRzOiBudW1iZXI7IHNjcmlwdHM6IG51bWJlcjsgc2FtcGxlczogc3RyaW5nW10gfT4oKTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdXJsIG9mIGFsbFVudXNlZEFzc2V0cykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB1cmwuc3Vic3RyaW5nKDAsIHVybC5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBmb2xkZXJNYXAuZ2V0KGZvbGRlcikgfHwgeyBhc3NldHM6IDAsIHNjcmlwdHM6IDAsIHNhbXBsZXM6IFtdIH07XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LmFzc2V0cysrO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW50cnkuc2FtcGxlcy5sZW5ndGggPCAzKSBlbnRyeS5zYW1wbGVzLnB1c2godXJsLnN1YnN0cmluZyh1cmwubGFzdEluZGV4T2YoJy8nKSArIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyTWFwLnNldChmb2xkZXIsIGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB1cmwgb2YgYWxsVW51c2VkU2NyaXB0cykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXIgPSB1cmwuc3Vic3RyaW5nKDAsIHVybC5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50cnkgPSBmb2xkZXJNYXAuZ2V0KGZvbGRlcikgfHwgeyBhc3NldHM6IDAsIHNjcmlwdHM6IDAsIHNhbXBsZXM6IFtdIH07XG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LnNjcmlwdHMrKztcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyTWFwLnNldChmb2xkZXIsIGVudHJ5KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTb3J0IGJ5IHRvdGFsIGNvdW50IGRlc2NlbmRpbmcsIGxpbWl0IHJlc3VsdHNcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJzID0gQXJyYXkuZnJvbShmb2xkZXJNYXAuZW50cmllcygpKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChbZm9sZGVyLCBkYXRhXSkgPT4gKHsgZm9sZGVyLCAuLi5kYXRhLCB0b3RhbDogZGF0YS5hc3NldHMgKyBkYXRhLnNjcmlwdHMgfSkpXG4gICAgICAgICAgICAgICAgICAgIC5zb3J0KChhLCBiKSA9PiBiLnRvdGFsIC0gYS50b3RhbClcbiAgICAgICAgICAgICAgICAgICAgLnNsaWNlKDAsIGxpbWl0KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpcmVjdG9yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiBhbGxBc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVmZXJlbmNlZENvdW50OiByZWZlcmVuY2VkVXJscy5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW51c2VkQ291bnQ6IHRvdGFsVW51c2VkQXNzZXRzICsgdG90YWxVbnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW51c2VkQXNzZXRDb3VudDogdG90YWxVbnVzZWRBc3NldHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB1bnVzZWRTY3JpcHRDb3VudDogdG90YWxVbnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZm9sZGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvbGRlcnNTaG93bjogZm9sZGVycy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbEZvbGRlcnM6IGZvbGRlck1hcC5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7dG90YWxVbnVzZWRBc3NldHMgKyB0b3RhbFVudXNlZFNjcmlwdHN9IHVudXNlZCBpdGVtcyBhY3Jvc3MgJHtmb2xkZXJNYXAuc2l6ZX0gZm9sZGVyc2AsXG4gICAgICAgICAgICAgICAgICAgICAgICBub3RlOiAnQXNzZXRzIGxvYWRlZCBkeW5hbWljYWxseSAoZS5nLiByZXNvdXJjZXMubG9hZCkgbWF5IHN0aWxsIGFwcGVhciB1bnVzZWQuIFJldmlldyBiZWZvcmUgZGVsZXRpbmcuJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmxhdCBsaXN0IHdpdGggbWF4UmVzdWx0cyBsaW1pdFxuICAgICAgICAgICAgY29uc3QgdW51c2VkQXNzZXRzID0gYWxsVW51c2VkQXNzZXRzLnNvcnQoKS5zbGljZSgwLCBsaW1pdCk7XG4gICAgICAgICAgICBjb25zdCB1bnVzZWRTY3JpcHRzID0gYWxsVW51c2VkU2NyaXB0cy5zb3J0KCkuc2xpY2UoMCwgbGltaXQpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBkaXJlY3RvcnksXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQXNzZXRzOiBhbGxBc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICByZWZlcmVuY2VkQ291bnQ6IHJlZmVyZW5jZWRVcmxzLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIHVudXNlZENvdW50OiB0b3RhbFVudXNlZEFzc2V0cyArIHRvdGFsVW51c2VkU2NyaXB0cyxcbiAgICAgICAgICAgICAgICAgICAgdW51c2VkQXNzZXRzLFxuICAgICAgICAgICAgICAgICAgICB1bnVzZWRTY3JpcHRzLFxuICAgICAgICAgICAgICAgICAgICBzaG93aW5nOiB1bnVzZWRBc3NldHMubGVuZ3RoICsgdW51c2VkU2NyaXB0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsVW51c2VkQXNzZXRzLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbFVudXNlZFNjcmlwdHMsXG4gICAgICAgICAgICAgICAgICAgIHRydW5jYXRlZDogdG90YWxVbnVzZWRBc3NldHMgPiBsaW1pdCB8fCB0b3RhbFVudXNlZFNjcmlwdHMgPiBsaW1pdCxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEZvdW5kICR7dG90YWxVbnVzZWRBc3NldHN9IHVudXNlZCBhc3NldHMgYW5kICR7dG90YWxVbnVzZWRTY3JpcHRzfSB1bnVzZWQgc2NyaXB0cyAoc2hvd2luZyB1cCB0byAke2xpbWl0fSBlYWNoKWAsXG4gICAgICAgICAgICAgICAgICAgIG5vdGU6ICdBc3NldHMgbG9hZGVkIGR5bmFtaWNhbGx5IChlLmcuIHJlc291cmNlcy5sb2FkKSBtYXkgc3RpbGwgYXBwZWFyIHVudXNlZC4gVXNlIGdyb3VwQnlGb2xkZXI6dHJ1ZSBmb3Igb3ZlcnZpZXcuIFJldmlldyBiZWZvcmUgZGVsZXRpbmcuJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbnVzZWQgYXNzZXQgZGV0ZWN0aW9uIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyAtLS0gSGVscGVyIG1ldGhvZHMgZm9yIGRlcGVuZGVuY3kgYW5kIHVudXNlZCBhc3NldCBhbmFseXNpcyAtLS1cblxuICAgIHByaXZhdGUgZXh0cmFjdFV1aWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCB1dWlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IC9cIl9fdXVpZF9fXCJcXHMqOlxccypcIihbXlwiXSspXCIvZztcbiAgICAgICAgbGV0IG1hdGNoO1xuICAgICAgICB3aGlsZSAoKG1hdGNoID0gcGF0dGVybi5leGVjKGNvbnRlbnQpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgdXVpZHMucHVzaChtYXRjaFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV1aWRzO1xuICAgIH1cblxuICAgIHByaXZhdGUgY29sbGVjdFN1YlV1aWRzKHN1Yk1ldGFzOiBhbnksIHV1aWRzOiBTZXQ8c3RyaW5nPik6IHZvaWQge1xuICAgICAgICBpZiAoIXN1Yk1ldGFzIHx8IHR5cGVvZiBzdWJNZXRhcyAhPT0gJ29iamVjdCcpIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3ViTWV0YXMpKSB7XG4gICAgICAgICAgICBjb25zdCBzdWIgPSBzdWJNZXRhc1trZXldO1xuICAgICAgICAgICAgaWYgKHN1Yj8udXVpZCkgdXVpZHMuYWRkKHN1Yi51dWlkKTtcbiAgICAgICAgICAgIGlmIChzdWI/LnN1Yk1ldGFzKSB0aGlzLmNvbGxlY3RTdWJVdWlkcyhzdWIuc3ViTWV0YXMsIHV1aWRzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgd2Fsa0RpcmVjdG9yeShkaXI6IHN0cmluZywgY2FsbGJhY2s6IChmaWxlUGF0aDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSByZXR1cm47XG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcbiAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihkaXIsIGVudHJ5Lm5hbWUpO1xuICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ25vZGVfbW9kdWxlcycpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIHRoaXMud2Fsa0RpcmVjdG9yeShmdWxsUGF0aCwgY2FsbGJhY2spO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmdWxsUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHdhbGtTZXJpYWxpemVkRmlsZXMoZGlyOiBzdHJpbmcsIGNhbGxiYWNrOiAoZmlsZVBhdGg6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGV4dGVuc2lvbnMgPSBbJy5zY2VuZScsICcucHJlZmFiJywgJy5hbmltJywgJy5tdGwnLCAnLmVmZmVjdCddO1xuICAgICAgICB0aGlzLndhbGtEaXJlY3RvcnkoZGlyLCAoZmlsZVBhdGgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV4dCA9IHBhdGguZXh0bmFtZShmaWxlUGF0aCkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGlmICghZXh0ZW5zaW9ucy5pbmNsdWRlcyhleHQpKSByZXR1cm47XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmlsZVBhdGgsIGNvbnRlbnQpO1xuICAgICAgICAgICAgfSBjYXRjaCB7IC8qIHNraXAgYmluYXJ5IG9yIHVucmVhZGFibGUgZmlsZXMgKi8gfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGV4dHJhY3RUeXBlSWRzRnJvbUNvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCB0eXBlSWRzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBwYXR0ZXJuID0gL1wiX190eXBlX19cIlxccyo6XFxzKlwiKFteXCJdKylcIi9nO1xuICAgICAgICBsZXQgbWF0Y2g7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBwYXR0ZXJuLmV4ZWMoY29udGVudCkpICE9PSBudWxsKSB7XG4gICAgICAgICAgICAvLyBTa2lwIGJ1aWx0LWluIENvY29zIHR5cGVzIChjYy5Ob2RlLCBjYy5TcHJpdGUsIGV0Yy4pXG4gICAgICAgICAgICBpZiAoIW1hdGNoWzFdLnN0YXJ0c1dpdGgoJ2NjLicpKSB7XG4gICAgICAgICAgICAgICAgdHlwZUlkcy5wdXNoKG1hdGNoWzFdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHlwZUlkcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDb21wcmVzcyBhIHN0YW5kYXJkIFVVSUQgdG8gQ29jb3MgQ3JlYXRvcidzIDIyLWNoYXIgZm9ybWF0IHVzZWQgaW4gX190eXBlX18uXG4gICAgICogRm9ybWF0OiBmaXJzdCAyIGhleCBjaGFycyBrZXB0ICsgMTAgcGFpcnMgb2YgYmFzZTY0IGNoYXJzIChlbmNvZGluZyByZW1haW5pbmcgMzAgaGV4IGNoYXJzKS5cbiAgICAgKi9cbiAgICBwcml2YXRlIGNvbXByZXNzVXVpZCh1dWlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBCQVNFNjRfS0VZUyA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcbiAgICAgICAgY29uc3QgaGV4ID0gdXVpZC5yZXBsYWNlKC8tL2csICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBpZiAoaGV4Lmxlbmd0aCAhPT0gMzIpIHJldHVybiB1dWlkO1xuXG4gICAgICAgIGxldCByZXN1bHQgPSBoZXhbMF0gKyBoZXhbMV07XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDwgMzI7IGkgKz0gMykge1xuICAgICAgICAgICAgY29uc3QgdmFsID0gKHBhcnNlSW50KGhleFtpXSwgMTYpIDw8IDgpIHwgKHBhcnNlSW50KGhleFtpICsgMV0sIDE2KSA8PCA0KSB8IHBhcnNlSW50KGhleFtpICsgMl0sIDE2KTtcbiAgICAgICAgICAgIHJlc3VsdCArPSBCQVNFNjRfS0VZU1t2YWwgPj4gNl07XG4gICAgICAgICAgICByZXN1bHQgKz0gQkFTRTY0X0tFWVNbdmFsICYgMHgzRl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDsgLy8gMiArIDIwID0gMjIgY2hhcnNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBEZWNvbXByZXNzIGEgMjItY2hhciBDb2NvcyBDcmVhdG9yIGNvbXByZXNzZWQgVVVJRCBiYWNrIHRvIHN0YW5kYXJkIFVVSUQgZm9ybWF0LlxuICAgICAqIFJldHVybnMgbnVsbCBpZiB0aGUgaW5wdXQgaXMgbm90IGEgdmFsaWQgY29tcHJlc3NlZCBVVUlELlxuICAgICAqL1xuICAgIHByaXZhdGUgZGVjb21wcmVzc1V1aWQoY29tcHJlc3NlZDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgICAgIGlmIChjb21wcmVzc2VkLmxlbmd0aCAhPT0gMjIpIHJldHVybiBudWxsO1xuXG4gICAgICAgIGNvbnN0IEJBU0U2NF9LRVlTID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuICAgICAgICBjb25zdCBCQVNFNjRfVkFMVUVTID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBCQVNFNjRfS0VZUy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgQkFTRTY0X1ZBTFVFUy5zZXQoQkFTRTY0X0tFWVNbaV0sIGkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IEhFWCA9ICcwMTIzNDU2Nzg5YWJjZGVmJztcblxuICAgICAgICBsZXQgaGV4ID0gY29tcHJlc3NlZFswXSArIGNvbXByZXNzZWRbMV07XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDwgMjI7IGkgKz0gMikge1xuICAgICAgICAgICAgY29uc3QgbGhzID0gQkFTRTY0X1ZBTFVFUy5nZXQoY29tcHJlc3NlZFtpXSk7XG4gICAgICAgICAgICBjb25zdCByaHMgPSBCQVNFNjRfVkFMVUVTLmdldChjb21wcmVzc2VkW2kgKyAxXSk7XG4gICAgICAgICAgICBpZiAobGhzID09PSB1bmRlZmluZWQgfHwgcmhzID09PSB1bmRlZmluZWQpIHJldHVybiBudWxsO1xuICAgICAgICAgICAgaGV4ICs9IEhFWFtsaHMgPj4gMl07XG4gICAgICAgICAgICBoZXggKz0gSEVYWygobGhzICYgMykgPDwgMikgfCAocmhzID4+IDQpXTtcbiAgICAgICAgICAgIGhleCArPSBIRVhbcmhzICYgMHhGXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluc2VydCBkYXNoZXM6IHh4eHh4eHh4LXh4eHgteHh4eC14eHh4LXh4eHh4eHh4eHh4eFxuICAgICAgICByZXR1cm4gaGV4LnNsaWNlKDAsIDgpICsgJy0nICsgaGV4LnNsaWNlKDgsIDEyKSArICctJyArIGhleC5zbGljZSgxMiwgMTYpICsgJy0nICsgaGV4LnNsaWNlKDE2LCAyMCkgKyAnLScgKyBoZXguc2xpY2UoMjApO1xuICAgIH1cbn1cbiJdfQ==