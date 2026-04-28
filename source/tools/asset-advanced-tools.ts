import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class AssetAdvancedTools implements ToolExecutor {
    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async batchImportAssets(args: any): Promise<ToolResponse> {
        try {
            const fs = require('fs');
            const path = require('path');

            if (!fs.existsSync(args.sourceDirectory)) {
                return { success: false, error: 'Source directory does not exist' };
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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async validateAssetReferences(directory: string = 'db://assets'): Promise<ToolResponse> {
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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
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

            // Track component-instance uuids so we can exclude them from "asset" candidates below.
            const componentUuidSet = new Set<string>();

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
                        const compType = (comp as any).__type__ || (comp as any).cid || (comp as any).type || 'Unknown';
                        // Component instance uuid lives at comp.value.uuid.value (raw query-node shape) or comp.uuid.
                        const compInstanceUuid = (comp as any).value?.uuid?.value || (comp as any).uuid?.value || (comp as any).uuid;
                        if (typeof compInstanceUuid === 'string' && compInstanceUuid.length > 0) {
                            componentUuidSet.add(compInstanceUuid);
                        }
                        this.collectRefUuids(comp as any, compType, nodeUuid, String(nodeName), uuidToRefs);
                    }
                }
            }

            // Remove non-asset uuids: scene node uuids and component-instance uuids both surface as `{uuid}`
            // refs but are not assets in the asset-db.
            for (const uuid of nodeUuidSet) uuidToRefs.delete(uuid);
            for (const uuid of componentUuidSet) uuidToRefs.delete(uuid);

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
        // Walk the Cocos query-node component shape. Editable fields live under either `comp.value`
        // (raw scene payload) or directly on `comp` (some builds). Each field is a descriptor of the
        // form `{ name, value, type, ... }` where `value` holds the actual data.
        // We attribute refs to the OUTER key (e.g. `cameraComponent`), not the descriptor's literal `value`.
        const isDescriptor = (v: any): boolean =>
            v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && ('type' in v || 'name' in v);

        const seen = new WeakSet<object>();
        const recordRef = (uuid: string, propName: string) => {
            if (!uuidToRefs.has(uuid)) uuidToRefs.set(uuid, []);
            uuidToRefs.get(uuid)!.push({ nodeUuid, nodeName, componentType: compType, property: propName });
        };

        const walkValue = (val: any, propName: string, depth: number) => {
            if (val === null || val === undefined || depth > 12) return;
            if (typeof val !== 'object') return;
            if (seen.has(val)) return;
            seen.add(val);

            // Array: recurse each item, keep propName
            if (Array.isArray(val)) {
                for (const item of val) walkValue(item, propName, depth + 1);
                return;
            }

            // Direct ref shape `{ uuid }` or `{ __uuid__ }`. Filter empty strings (unset slots).
            const uuid = (val as any).uuid ?? (val as any).__uuid__;
            if (typeof uuid === 'string' && uuid.length > 0) {
                recordRef(uuid, propName);
                return;
            }

            // Descriptor wrapper `{ name, value, type, ... }` — recurse into `value` only, keep propName.
            if (isDescriptor(val)) {
                walkValue((val as any).value, propName, depth + 1);
                return;
            }

            // Plain object: each own key becomes the new propName for its subtree.
            for (const key of Object.keys(val)) {
                if (key.startsWith('_')) continue; // skip private mirrors like `_color`
                walkValue((val as any)[key], key, depth + 1);
            }
        };

        // Top-level: handle both shapes (`comp.value` wrapper and direct).
        const root = comp && typeof comp === 'object' && comp.value && typeof comp.value === 'object' ? comp.value : comp;
        for (const key of Object.keys(root)) {
            if (key.startsWith('_')) continue;
            // Skip wrapper metadata keys at the component root.
            if (['__type__', 'cid', 'enabled', 'type', 'name', 'uuid'].includes(key)) continue;
            // `node` is the back-pointer to the owning node — never an asset.
            if (key === 'node') continue;
            walkValue((root as any)[key], key, 0);
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
