import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class AssetAdvancedTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async saveAssetMeta(urlOrUUID: string, content: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'save-asset-meta', urlOrUUID, content).then((result: any) => {
                resolve({
                    success: true,
                    data: {
                        uuid: result?.uuid,
                        url: result?.url,
                        message: 'Asset meta saved successfully'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async generateAvailableUrl(url: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'generate-available-url', url).then((availableUrl: string) => {
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
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async queryAssetDbReady(): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'query-ready').then((ready: boolean) => {
                resolve({
                    success: true,
                    data: {
                        ready: ready,
                        message: ready ? 'Asset database is ready' : 'Asset database is not ready'
                    }
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async openAssetExternal(urlOrUUID: string): Promise<ToolResponse> {
        return new Promise((resolve) => {
            Editor.Message.request('asset-db', 'open-asset', urlOrUUID).then(() => {
                resolve({
                    success: true,
                    message: 'Asset opened with external program'
                });
            }).catch((err: Error) => {
                resolve({ success: false, error: err.message });
            });
        });
    }

    private async batchImportAssets(args: any): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const fs = require('fs');
                const path = require('path');

                if (!fs.existsSync(args.sourceDirectory)) {
                    resolve({ success: false, error: 'Source directory does not exist' });
                    return;
                }

                const files = this.getFilesFromDirectory(
                    args.sourceDirectory,
                    args.fileFilter || [],
                    args.recursive || false
                );

                const importResults: any[] = [];
                let successCount = 0;
                let errorCount = 0;

                for (const filePath of files) {
                    try {
                        const fileName = path.basename(filePath);
                        const targetPath = `${args.targetDirectory}/${fileName}`;

                        const result = await Editor.Message.request('asset-db', 'import-asset',
                            filePath, targetPath, {
                                overwrite: args.overwrite || false,
                                rename: !(args.overwrite || false)
                            });

                        importResults.push({
                            source: filePath,
                            target: targetPath,
                            success: true,
                            uuid: result?.uuid
                        });
                        successCount++;
                    } catch (err: any) {
                        importResults.push({
                            source: filePath,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }

                resolve({
                    success: true,
                    data: {
                        totalFiles: files.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: importResults,
                        message: `Batch import completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private getFilesFromDirectory(dirPath: string, fileFilter: string[], recursive: boolean): string[] {
        const fs = require('fs');
        const path = require('path');
        const files: string[] = [];

        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isFile()) {
                if (fileFilter.length === 0 || fileFilter.some(ext => item.toLowerCase().endsWith(ext.toLowerCase()))) {
                    files.push(fullPath);
                }
            } else if (stat.isDirectory() && recursive) {
                files.push(...this.getFilesFromDirectory(fullPath, fileFilter, recursive));
            }
        }

        return files;
    }

    private async batchDeleteAssets(urls: string[]): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const deleteResults: any[] = [];
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
                    } catch (err: any) {
                        deleteResults.push({
                            url: url,
                            success: false,
                            error: err.message
                        });
                        errorCount++;
                    }
                }

                resolve({
                    success: true,
                    data: {
                        totalAssets: urls.length,
                        successCount: successCount,
                        errorCount: errorCount,
                        results: deleteResults,
                        message: `Batch delete completed: ${successCount} success, ${errorCount} errors`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async validateAssetReferences(directory: string = 'db://assets'): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                // Get all assets in directory
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });

                const brokenReferences: any[] = [];
                const validReferences: any[] = [];

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
                    } catch (err) {
                        brokenReferences.push({
                            url: asset.url,
                            uuid: asset.uuid,
                            name: asset.name,
                            error: (err as Error).message
                        });
                    }
                }

                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        totalAssets: assets.length,
                        validReferences: validReferences.length,
                        brokenReferences: brokenReferences.length,
                        brokenAssets: brokenReferences,
                        message: `Validation completed: ${brokenReferences.length} broken references found`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private async scanSceneMissingRefs(): Promise<ToolResponse> {
        try {
            // Step 1: Walk node tree, collect all node UUIDs
            const nodeTree = await Editor.Message.request('scene', 'query-node-tree');
            if (!nodeTree) return { success: false, error: 'Failed to query scene node tree' };

            const nodeUuids: string[] = [];
            const queue: any[] = [nodeTree];
            while (queue.length > 0) {
                const node = queue.shift();
                if (node?.uuid) nodeUuids.push(node.uuid);
                if (node?.children) queue.push(...node.children);
            }
            const nodeUuidSet = new Set(nodeUuids);

            // Step 2: Query all nodes in parallel batches, collect UUID refs
            const NODE_BATCH = 10;
            const uuidToRefs = new Map<string, { nodeUuid: string; nodeName: string; componentType: string; property: string }[]>();

            for (let i = 0; i < nodeUuids.length; i += NODE_BATCH) {
                const batch = nodeUuids.slice(i, i + NODE_BATCH);
                const results = await Promise.all(
                    batch.map(uuid => Editor.Message.request('scene', 'query-node', uuid).catch(() => null))
                );
                for (let j = 0; j < results.length; j++) {
                    const nodeData = results[j];
                    if (!nodeData?.__comps__) continue;
                    const nodeUuid = batch[j];
                    const nodeName = nodeData.name?.value ?? nodeData.name ?? nodeUuid;
                    for (const comp of nodeData.__comps__ as any[]) {
                        const compType = (comp as any).__type__ || (comp as any).type || 'Unknown';
                        this.collectRefUuids(comp as any, compType, nodeUuid, String(nodeName), uuidToRefs);
                    }
                }
            }

            // Remove node-to-node refs (UUIDs that are scene nodes, not assets)
            for (const uuid of nodeUuidSet) uuidToRefs.delete(uuid);

            // Step 3: Validate unique asset UUIDs against asset-db in parallel batches
            const uniqueUuids = Array.from(uuidToRefs.keys());
            const ASSET_BATCH = 20;
            const missingUuids = new Set<string>();

            for (let i = 0; i < uniqueUuids.length; i += ASSET_BATCH) {
                const batch = uniqueUuids.slice(i, i + ASSET_BATCH);
                const results = await Promise.all(
                    batch.map(uuid =>
                        Editor.Message.request('asset-db', 'query-asset-info', uuid)
                            .then((info: any) => ({ uuid, exists: !!info }))
                            .catch(() => ({ uuid, exists: false }))
                    )
                );
                for (const { uuid, exists } of results) {
                    if (!exists) missingUuids.add(uuid);
                }
            }

            // Step 4: Build report
            const missingRefs = Array.from(missingUuids).map(uuid => ({
                missingUuid: uuid,
                referencedBy: uuidToRefs.get(uuid) ?? []
            }));

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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private collectRefUuids(
        comp: any,
        compType: string,
        nodeUuid: string,
        nodeName: string,
        uuidToRefs: Map<string, { nodeUuid: string; nodeName: string; componentType: string; property: string }[]>
    ): void {
        const skip = new Set(['__type__', 'cid', 'node', 'uuid', '_id', '__scriptAsset', 'enabled', 'type', 'readonly', 'visible', 'editor', 'extends']);

        const extractUuid = (val: any, propName: string) => {
            if (!val || typeof val !== 'object') return;
            // Unwrap descriptor: { value: ..., type: ... }
            if ('value' in val && !('uuid' in val) && !('__uuid__' in val)) {
                extractUuid(val.value, propName);
                return;
            }
            // Direct ref: { uuid: "..." } or { __uuid__: "..." }
            const uuid = val.uuid || val.__uuid__;
            if (uuid && typeof uuid === 'string') {
                if (!uuidToRefs.has(uuid)) uuidToRefs.set(uuid, []);
                uuidToRefs.get(uuid)!.push({ nodeUuid, nodeName, componentType: compType, property: propName });
                return;
            }
            // Array of refs
            if (Array.isArray(val)) {
                for (const item of val) extractUuid(item, propName);
            }
        };

        for (const key of Object.keys(comp)) {
            if (skip.has(key) || key.startsWith('_')) continue;
            extractUuid(comp[key], key);
        }
    }

    private async getAssetDependencies(urlOrUUID: string, direction: string = 'dependencies'): Promise<ToolResponse> {
        try {
            // Resolve asset UUID and URL
            let assetUuid: string;
            let assetUrl: string;

            if (urlOrUUID.startsWith('db://')) {
                assetUrl = urlOrUUID;
                const info = await Editor.Message.request('asset-db', 'query-asset-info', urlOrUUID);
                if (!info?.uuid) return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUuid = info.uuid;
            } else {
                assetUuid = urlOrUUID;
                const url = await Editor.Message.request('asset-db', 'query-url', urlOrUUID);
                if (!url) return { success: false, error: `Asset not found: ${urlOrUUID}` };
                assetUrl = url;
            }

            const projectPath = Editor.Project.path;
            const assetsPath = path.join(projectPath, 'assets');

            // Collect all UUIDs for this asset (main + sub-assets from .meta)
            const allAssetUuids = new Set<string>([assetUuid]);
            try {
                const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
                if (fsPath) {
                    const metaPath = fsPath + '.meta';
                    if (fs.existsSync(metaPath)) {
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                        this.collectSubUuids(meta.subMetas, allAssetUuids);
                    }
                }
            } catch { /* ignore meta read errors */ }

            const dependencies: Array<{ uuid: string; url: string }> = [];
            const dependents: Array<{ url: string }> = [];

            // Find dependencies: assets this file references via __uuid__ and __type__
            if (direction === 'dependencies' || direction === 'both') {
                try {
                    const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
                    if (fsPath && fs.existsSync(fsPath)) {
                        const content = fs.readFileSync(fsPath, 'utf8');
                        const seen = new Set<string>();

                        // Extract __uuid__ references
                        const refUuids = this.extractUuidsFromContent(content);
                        for (const ref of refUuids) {
                            const baseUuid = ref.split('@')[0];
                            if (seen.has(baseUuid) || allAssetUuids.has(baseUuid)) continue;
                            seen.add(baseUuid);

                            try {
                                const refUrl = await Editor.Message.request('asset-db', 'query-url', baseUuid);
                                dependencies.push({ uuid: baseUuid, url: refUrl || 'unresolved' });
                            } catch {
                                dependencies.push({ uuid: baseUuid, url: 'unresolved' });
                            }
                        }

                        // Extract __type__ references (custom script components use compressed UUIDs)
                        const typeIds = this.extractTypeIdsFromContent(content);
                        for (const typeId of typeIds) {
                            const decompressed = this.decompressUuid(typeId);
                            if (!decompressed || seen.has(decompressed)) continue;
                            seen.add(decompressed);
                            try {
                                const refUrl = await Editor.Message.request('asset-db', 'query-url', decompressed);
                                if (refUrl) {
                                    dependencies.push({ uuid: decompressed, url: refUrl });
                                }
                            } catch { /* not a valid script UUID */ }
                        }
                    }
                } catch { /* ignore read errors */ }
            }

            // Find dependents: serialized files that reference this asset's UUIDs
            if (direction === 'dependents' || direction === 'both') {
                // Build search strings: original UUIDs + compressed forms for __type__ matching
                const searchStrings = new Set<string>(allAssetUuids);
                for (const uid of allAssetUuids) {
                    const compressed = this.compressUuid(uid);
                    if (compressed.length === 22) searchStrings.add(compressed);
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
        } catch (err: any) {
            return { success: false, error: `Dependency analysis failed: ${err.message}` };
        }
    }

    private async getUnusedAssets(directory: string = 'db://assets', excludeDirectories: string[] = [], maxResults: number = 50, groupByFolder: boolean = false): Promise<ToolResponse> {
        try {
            const projectPath = Editor.Project.path;
            const basePath = path.join(projectPath, directory.replace('db://', ''));

            if (!fs.existsSync(basePath)) {
                return { success: false, error: `Directory not found: ${directory}` };
            }

            // Step 1: Build UUID -> asset URL map from .meta files
            // Also build compressed UUID map for __type__ matching (script components)
            const uuidToUrl = new Map<string, string>();
            const compressedToUrl = new Map<string, string>();
            const allAssets: Array<{ url: string; ext: string }> = [];

            this.walkDirectory(basePath, (filePath) => {
                if (!filePath.endsWith('.meta')) return;

                const assetFsPath = filePath.slice(0, -5); // Remove .meta suffix
                const assetUrl = 'db://' + assetFsPath.substring(projectPath.length + 1);

                // Check exclude directories
                for (const excl of excludeDirectories) {
                    if (assetUrl.startsWith(excl)) return;
                }

                // Skip if actual asset doesn't exist or is a directory
                try {
                    if (!fs.existsSync(assetFsPath) || fs.statSync(assetFsPath).isDirectory()) return;
                } catch { return; }

                try {
                    const meta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const ext = path.extname(assetFsPath).toLowerCase();

                    allAssets.push({ url: assetUrl, ext });

                    // Map main UUID to asset URL
                    if (meta.uuid) {
                        uuidToUrl.set(meta.uuid, assetUrl);
                        const compressed = this.compressUuid(meta.uuid);
                        if (compressed.length === 22) compressedToUrl.set(compressed, assetUrl);
                    }

                    // Map sub-asset UUIDs to parent asset URL
                    const subUuids = new Set<string>();
                    this.collectSubUuids(meta.subMetas, subUuids);
                    for (const subUuid of subUuids) {
                        uuidToUrl.set(subUuid, assetUrl);
                        const compressed = this.compressUuid(subUuid);
                        if (compressed.length === 22) compressedToUrl.set(compressed, assetUrl);
                    }
                } catch { /* skip unparseable meta files */ }
            });

            // Step 2: Scan ALL serialized files in entire assets folder (not just target directory)
            // because scenes/prefabs referencing target assets may be in other folders
            const assetsPath = path.join(projectPath, 'assets');
            const referencedUrls = new Set<string>();

            this.walkSerializedFiles(assetsPath, (_filePath, content) => {
                // Check __uuid__ references (images, prefabs, materials, etc.)
                const uuids = this.extractUuidsFromContent(content);
                for (const uuid of uuids) {
                    const baseUuid = uuid.split('@')[0];
                    const url = uuidToUrl.get(baseUuid);
                    if (url) referencedUrls.add(url);
                }

                // Check __type__ references (script components use compressed UUIDs)
                const typeIds = this.extractTypeIdsFromContent(content);
                for (const typeId of typeIds) {
                    const url = compressedToUrl.get(typeId);
                    if (url) referencedUrls.add(url);
                }
            });

            // Step 3: Find unused assets, separate scripts from other assets
            const scriptExts = ['.ts', '.js'];
            const allUnusedAssets: string[] = [];
            const allUnusedScripts: string[] = [];

            for (const asset of allAssets) {
                if (!referencedUrls.has(asset.url)) {
                    if (scriptExts.includes(asset.ext)) {
                        allUnusedScripts.push(asset.url);
                    } else {
                        allUnusedAssets.push(asset.url);
                    }
                }
            }

            const totalUnusedAssets = allUnusedAssets.length;
            const totalUnusedScripts = allUnusedScripts.length;
            const limit = Math.max(1, maxResults);

            if (groupByFolder) {
                // Group by parent folder with counts
                const folderMap = new Map<string, { assets: number; scripts: number; samples: string[] }>();

                for (const url of allUnusedAssets) {
                    const folder = url.substring(0, url.lastIndexOf('/'));
                    const entry = folderMap.get(folder) || { assets: 0, scripts: 0, samples: [] };
                    entry.assets++;
                    if (entry.samples.length < 3) entry.samples.push(url.substring(url.lastIndexOf('/') + 1));
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
                    .map(([folder, data]) => ({ folder, ...data, total: data.assets + data.scripts }))
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
        } catch (err: any) {
            return { success: false, error: `Unused asset detection failed: ${err.message}` };
        }
    }

    private async compressTextures(directory: string = 'db://assets', format: string = 'auto', quality: number = 0.8): Promise<ToolResponse> {
        return new Promise((resolve) => {
            // Note: Texture compression would require image processing APIs
            resolve({
                success: false,
                error: 'Texture compression requires image processing capabilities not available in current Cocos Creator MCP implementation. Use the Editor\'s built-in texture compression settings or external tools.'
            });
        });
    }

    private async exportAssetManifest(directory: string = 'db://assets', format: string = 'json', includeMetadata: boolean = true): Promise<ToolResponse> {
        return new Promise(async (resolve) => {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: `${directory}/**/*` });

                const manifest: any[] = [];

                for (const asset of assets) {
                    const manifestEntry: any = {
                        name: asset.name,
                        url: asset.url,
                        uuid: asset.uuid,
                        type: asset.type,
                        size: (asset as any).size || 0,
                        isDirectory: asset.isDirectory || false
                    };

                    if (includeMetadata) {
                        try {
                            const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', asset.url);
                            if (assetInfo && assetInfo.meta) {
                                manifestEntry.meta = assetInfo.meta;
                            }
                        } catch (err) {
                            // Skip metadata if not available
                        }
                    }

                    manifest.push(manifestEntry);
                }

                let exportData: string;
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

                resolve({
                    success: true,
                    data: {
                        directory: directory,
                        format: format,
                        assetCount: manifest.length,
                        includeMetadata: includeMetadata,
                        manifest: exportData,
                        message: `Asset manifest exported with ${manifest.length} assets`
                    }
                });
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    }

    private convertToCSV(data: any[]): string {
        if (data.length === 0) return '';

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

    private convertToXML(data: any[]): string {
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

    private extractUuidsFromContent(content: string): string[] {
        const uuids: string[] = [];
        const pattern = /"__uuid__"\s*:\s*"([^"]+)"/g;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            uuids.push(match[1]);
        }
        return uuids;
    }

    private collectSubUuids(subMetas: any, uuids: Set<string>): void {
        if (!subMetas || typeof subMetas !== 'object') return;
        for (const key of Object.keys(subMetas)) {
            const sub = subMetas[key];
            if (sub?.uuid) uuids.add(sub.uuid);
            if (sub?.subMetas) this.collectSubUuids(sub.subMetas, uuids);
        }
    }

    private walkDirectory(dir: string, callback: (filePath: string) => void): void {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                this.walkDirectory(fullPath, callback);
            } else {
                callback(fullPath);
            }
        }
    }

    private walkSerializedFiles(dir: string, callback: (filePath: string, content: string) => void): void {
        const extensions = ['.scene', '.prefab', '.anim', '.mtl', '.effect'];
        this.walkDirectory(dir, (filePath) => {
            const ext = path.extname(filePath).toLowerCase();
            if (!extensions.includes(ext)) return;
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                callback(filePath, content);
            } catch { /* skip binary or unreadable files */ }
        });
    }

    private extractTypeIdsFromContent(content: string): string[] {
        const typeIds: string[] = [];
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
    private compressUuid(uuid: string): string {
        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const hex = uuid.replace(/-/g, '').toLowerCase();
        if (hex.length !== 32) return uuid;

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
    private decompressUuid(compressed: string): string | null {
        if (compressed.length !== 22) return null;

        const BASE64_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        const BASE64_VALUES = new Map<string, number>();
        for (let i = 0; i < BASE64_KEYS.length; i++) {
            BASE64_VALUES.set(BASE64_KEYS[i], i);
        }
        const HEX = '0123456789abcdef';

        let hex = compressed[0] + compressed[1];
        for (let i = 2; i < 22; i += 2) {
            const lhs = BASE64_VALUES.get(compressed[i]);
            const rhs = BASE64_VALUES.get(compressed[i + 1]);
            if (lhs === undefined || rhs === undefined) return null;
            hex += HEX[lhs >> 2];
            hex += HEX[((lhs & 3) << 2) | (rhs >> 4)];
            hex += HEX[rhs & 0xF];
        }

        // Insert dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
}
