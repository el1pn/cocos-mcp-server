"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetSafety = void 0;
const logger_1 = require("../logger");
/**
 * Atomic asset creation pipeline for Cocos Creator 3.8+.
 *
 * Steps:
 * 1. Ensure parent directory chain exists
 * 2. Create asset via asset-db (handles watcher internally in 3.8+)
 * 3. Optionally modify meta after creation
 * 4. Refresh asset to sync editor state
 */
class AssetSafety {
    /**
     * Safely create an asset, ensuring parent directories exist first.
     */
    static async safeCreateAsset(assetUrl, content, options) {
        var _a;
        const overwrite = (_a = options === null || options === void 0 ? void 0 : options.overwrite) !== null && _a !== void 0 ? _a : false;
        try {
            // Step 1: Ensure parent directory chain
            await AssetSafety.ensureParentDirs(assetUrl);
            // Step 2: Create the asset
            const createOptions = { overwrite, rename: !overwrite };
            const contentStr = content instanceof Buffer ? content.toString('utf8') : content;
            logger_1.logger.info(`Creating asset: ${assetUrl} (overwrite=${overwrite})`);
            const result = await Editor.Message.request('asset-db', 'create-asset', assetUrl, contentStr, createOptions);
            if (!result || !result.uuid) {
                return {
                    success: false,
                    error: `Asset creation returned no UUID for ${assetUrl}`
                };
            }
            // Step 3: Optionally modify meta
            if (options === null || options === void 0 ? void 0 : options.metaModifier) {
                try {
                    const metaStr = await Editor.Message.request('asset-db', 'query-asset-meta', result.uuid);
                    if (metaStr) {
                        const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
                        const modifiedMeta = options.metaModifier(meta);
                        await Editor.Message.request('asset-db', 'save-asset-meta', result.uuid, JSON.stringify(modifiedMeta, null, 2));
                        logger_1.logger.info(`Meta modified for ${assetUrl}`);
                    }
                }
                catch (metaErr) {
                    logger_1.logger.warn(`Meta modification failed for ${assetUrl}: ${metaErr.message}`);
                    // Non-fatal — asset was still created
                }
            }
            // Step 4: Refresh to sync editor
            try {
                await Editor.Message.request('asset-db', 'refresh-asset', assetUrl);
            }
            catch (_b) {
                // Best effort refresh
            }
            logger_1.logger.success(`Asset created: ${assetUrl} (uuid: ${result.uuid})`);
            return {
                success: true,
                uuid: result.uuid,
                url: result.url || assetUrl,
                message: content === null ? 'Folder created successfully' : 'Asset created successfully'
            };
        }
        catch (err) {
            logger_1.logger.error(`Failed to create asset ${assetUrl}: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
    /**
     * Ensure all parent directories in the asset URL chain exist.
     * e.g., for "db://assets/sprites/ui/icon.png", ensures
     * "db://assets/sprites/" and "db://assets/sprites/ui/" exist.
     */
    static async ensureParentDirs(assetUrl) {
        // Split path: db://assets/a/b/c.ext → ["db://assets", "a", "b"]
        const parts = assetUrl.replace('db://assets/', '').split('/');
        parts.pop(); // Remove filename
        if (parts.length === 0)
            return;
        let currentPath = 'db://assets';
        for (const part of parts) {
            currentPath += `/${part}`;
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', currentPath);
                if (info)
                    continue; // Directory exists
            }
            catch (_a) {
                // Doesn't exist, need to create
            }
            try {
                await Editor.Message.request('asset-db', 'create-asset', currentPath + '/', null);
                logger_1.logger.info(`Created parent directory: ${currentPath}`);
            }
            catch (err) {
                // Might already exist due to race condition — check again
                try {
                    const info = await Editor.Message.request('asset-db', 'query-asset-info', currentPath);
                    if (info)
                        continue;
                }
                catch (_b) {
                    // Genuinely failed
                }
                throw new Error(`Failed to create parent directory ${currentPath}: ${err.message}`);
            }
        }
    }
    /**
     * Safely overwrite an existing asset's content.
     */
    static async safeSaveAsset(assetUrl, content) {
        try {
            await Editor.Message.request('asset-db', 'save-asset', assetUrl, content);
            try {
                await Editor.Message.request('asset-db', 'refresh-asset', assetUrl);
            }
            catch (_a) {
                // Best effort
            }
            return { success: true, url: assetUrl, message: 'Asset saved successfully' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.AssetSafety = AssetSafety;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtc2FmZXR5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3V0aWxzL2Fzc2V0LXNhZmV0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzQ0FBbUM7QUFVbkM7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLFdBQVc7SUFDcEI7O09BRUc7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FDeEIsUUFBZ0IsRUFDaEIsT0FBK0IsRUFDL0IsT0FBb0U7O1FBRXBFLE1BQU0sU0FBUyxHQUFHLE1BQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFNBQVMsbUNBQUksS0FBSyxDQUFDO1FBRTlDLElBQUksQ0FBQztZQUNELHdDQUF3QztZQUN4QyxNQUFNLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUU3QywyQkFBMkI7WUFDM0IsTUFBTSxhQUFhLEdBQUcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDeEQsTUFBTSxVQUFVLEdBQUcsT0FBTyxZQUFZLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBRWxGLGVBQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLFFBQVEsZUFBZSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBRXBFLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQ3ZDLFVBQVUsRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQ2xFLENBQUM7WUFFRixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUMxQixPQUFPO29CQUNILE9BQU8sRUFBRSxLQUFLO29CQUNkLEtBQUssRUFBRSx1Q0FBdUMsUUFBUSxFQUFFO2lCQUMzRCxDQUFD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QUM7WUFBQyxXQUFNLENBQUM7Z0JBQ0wsY0FBYztZQUNsQixDQUFDO1lBQ0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQztRQUNqRixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE3SEQsa0NBNkhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi4vbG9nZ2VyJztcblxuZXhwb3J0IGludGVyZmFjZSBTYWZlQ3JlYXRlUmVzdWx0IHtcbiAgICBzdWNjZXNzOiBib29sZWFuO1xuICAgIHV1aWQ/OiBzdHJpbmc7XG4gICAgdXJsPzogc3RyaW5nO1xuICAgIG1lc3NhZ2U/OiBzdHJpbmc7XG4gICAgZXJyb3I/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQXRvbWljIGFzc2V0IGNyZWF0aW9uIHBpcGVsaW5lIGZvciBDb2NvcyBDcmVhdG9yIDMuOCsuXG4gKlxuICogU3RlcHM6XG4gKiAxLiBFbnN1cmUgcGFyZW50IGRpcmVjdG9yeSBjaGFpbiBleGlzdHNcbiAqIDIuIENyZWF0ZSBhc3NldCB2aWEgYXNzZXQtZGIgKGhhbmRsZXMgd2F0Y2hlciBpbnRlcm5hbGx5IGluIDMuOCspXG4gKiAzLiBPcHRpb25hbGx5IG1vZGlmeSBtZXRhIGFmdGVyIGNyZWF0aW9uXG4gKiA0LiBSZWZyZXNoIGFzc2V0IHRvIHN5bmMgZWRpdG9yIHN0YXRlXG4gKi9cbmV4cG9ydCBjbGFzcyBBc3NldFNhZmV0eSB7XG4gICAgLyoqXG4gICAgICogU2FmZWx5IGNyZWF0ZSBhbiBhc3NldCwgZW5zdXJpbmcgcGFyZW50IGRpcmVjdG9yaWVzIGV4aXN0IGZpcnN0LlxuICAgICAqL1xuICAgIHN0YXRpYyBhc3luYyBzYWZlQ3JlYXRlQXNzZXQoXG4gICAgICAgIGFzc2V0VXJsOiBzdHJpbmcsXG4gICAgICAgIGNvbnRlbnQ6IHN0cmluZyB8IEJ1ZmZlciB8IG51bGwsXG4gICAgICAgIG9wdGlvbnM/OiB7IG92ZXJ3cml0ZT86IGJvb2xlYW47IG1ldGFNb2RpZmllcj86IChtZXRhOiBhbnkpID0+IGFueSB9XG4gICAgKTogUHJvbWlzZTxTYWZlQ3JlYXRlUmVzdWx0PiB7XG4gICAgICAgIGNvbnN0IG92ZXJ3cml0ZSA9IG9wdGlvbnM/Lm92ZXJ3cml0ZSA/PyBmYWxzZTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gU3RlcCAxOiBFbnN1cmUgcGFyZW50IGRpcmVjdG9yeSBjaGFpblxuICAgICAgICAgICAgYXdhaXQgQXNzZXRTYWZldHkuZW5zdXJlUGFyZW50RGlycyhhc3NldFVybCk7XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMjogQ3JlYXRlIHRoZSBhc3NldFxuICAgICAgICAgICAgY29uc3QgY3JlYXRlT3B0aW9ucyA9IHsgb3ZlcndyaXRlLCByZW5hbWU6ICFvdmVyd3JpdGUgfTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnRTdHIgPSBjb250ZW50IGluc3RhbmNlb2YgQnVmZmVyID8gY29udGVudC50b1N0cmluZygndXRmOCcpIDogY29udGVudDtcblxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oYENyZWF0aW5nIGFzc2V0OiAke2Fzc2V0VXJsfSAob3ZlcndyaXRlPSR7b3ZlcndyaXRlfSlgKTtcblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcbiAgICAgICAgICAgICAgICAnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgYXNzZXRVcmwsIGNvbnRlbnRTdHIsIGNyZWF0ZU9wdGlvbnNcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQudXVpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEFzc2V0IGNyZWF0aW9uIHJldHVybmVkIG5vIFVVSUQgZm9yICR7YXNzZXRVcmx9YFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFN0ZXAgMzogT3B0aW9uYWxseSBtb2RpZnkgbWV0YVxuICAgICAgICAgICAgaWYgKG9wdGlvbnM/Lm1ldGFNb2RpZmllcikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFTdHIgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgcmVzdWx0LnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobWV0YVN0cikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YSA9IHR5cGVvZiBtZXRhU3RyID09PSAnc3RyaW5nJyA/IEpTT04ucGFyc2UobWV0YVN0cikgOiBtZXRhU3RyO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kaWZpZWRNZXRhID0gb3B0aW9ucy5tZXRhTW9kaWZpZXIobWV0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCByZXN1bHQudXVpZCwgSlNPTi5zdHJpbmdpZnkobW9kaWZpZWRNZXRhLCBudWxsLCAyKVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvZ2dlci5pbmZvKGBNZXRhIG1vZGlmaWVkIGZvciAke2Fzc2V0VXJsfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAobWV0YUVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ2dlci53YXJuKGBNZXRhIG1vZGlmaWNhdGlvbiBmYWlsZWQgZm9yICR7YXNzZXRVcmx9OiAke21ldGFFcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gTm9uLWZhdGFsIOKAlCBhc3NldCB3YXMgc3RpbGwgY3JlYXRlZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU3RlcCA0OiBSZWZyZXNoIHRvIHN5bmMgZWRpdG9yXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlZnJlc2gtYXNzZXQnLCBhc3NldFVybCk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBCZXN0IGVmZm9ydCByZWZyZXNoXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGxvZ2dlci5zdWNjZXNzKGBBc3NldCBjcmVhdGVkOiAke2Fzc2V0VXJsfSAodXVpZDogJHtyZXN1bHQudXVpZH0pYCk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB1dWlkOiByZXN1bHQudXVpZCxcbiAgICAgICAgICAgICAgICB1cmw6IHJlc3VsdC51cmwgfHwgYXNzZXRVcmwsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogY29udGVudCA9PT0gbnVsbCA/ICdGb2xkZXIgY3JlYXRlZCBzdWNjZXNzZnVsbHknIDogJ0Fzc2V0IGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIGxvZ2dlci5lcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBhc3NldCAke2Fzc2V0VXJsfTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVuc3VyZSBhbGwgcGFyZW50IGRpcmVjdG9yaWVzIGluIHRoZSBhc3NldCBVUkwgY2hhaW4gZXhpc3QuXG4gICAgICogZS5nLiwgZm9yIFwiZGI6Ly9hc3NldHMvc3ByaXRlcy91aS9pY29uLnBuZ1wiLCBlbnN1cmVzXG4gICAgICogXCJkYjovL2Fzc2V0cy9zcHJpdGVzL1wiIGFuZCBcImRiOi8vYXNzZXRzL3Nwcml0ZXMvdWkvXCIgZXhpc3QuXG4gICAgICovXG4gICAgc3RhdGljIGFzeW5jIGVuc3VyZVBhcmVudERpcnMoYXNzZXRVcmw6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyBTcGxpdCBwYXRoOiBkYjovL2Fzc2V0cy9hL2IvYy5leHQg4oaSIFtcImRiOi8vYXNzZXRzXCIsIFwiYVwiLCBcImJcIl1cbiAgICAgICAgY29uc3QgcGFydHMgPSBhc3NldFVybC5yZXBsYWNlKCdkYjovL2Fzc2V0cy8nLCAnJykuc3BsaXQoJy8nKTtcbiAgICAgICAgcGFydHMucG9wKCk7IC8vIFJlbW92ZSBmaWxlbmFtZVxuXG4gICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDApIHJldHVybjtcblxuICAgICAgICBsZXQgY3VycmVudFBhdGggPSAnZGI6Ly9hc3NldHMnO1xuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcbiAgICAgICAgICAgIGN1cnJlbnRQYXRoICs9IGAvJHtwYXJ0fWA7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgY3VycmVudFBhdGgpO1xuICAgICAgICAgICAgICAgIGlmIChpbmZvKSBjb250aW51ZTsgLy8gRGlyZWN0b3J5IGV4aXN0c1xuICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgLy8gRG9lc24ndCBleGlzdCwgbmVlZCB0byBjcmVhdGVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBjdXJyZW50UGF0aCArICcvJywgbnVsbCk7XG4gICAgICAgICAgICAgICAgbG9nZ2VyLmluZm8oYENyZWF0ZWQgcGFyZW50IGRpcmVjdG9yeTogJHtjdXJyZW50UGF0aH1gKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgLy8gTWlnaHQgYWxyZWFkeSBleGlzdCBkdWUgdG8gcmFjZSBjb25kaXRpb24g4oCUIGNoZWNrIGFnYWluXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBjdXJyZW50UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmZvKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2VudWluZWx5IGZhaWxlZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgcGFyZW50IGRpcmVjdG9yeSAke2N1cnJlbnRQYXRofTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFNhZmVseSBvdmVyd3JpdGUgYW4gZXhpc3RpbmcgYXNzZXQncyBjb250ZW50LlxuICAgICAqL1xuICAgIHN0YXRpYyBhc3luYyBzYWZlU2F2ZUFzc2V0KGFzc2V0VXJsOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8U2FmZUNyZWF0ZVJlc3VsdD4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldCcsIGFzc2V0VXJsLCBjb250ZW50KTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGFzc2V0VXJsKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIEJlc3QgZWZmb3J0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCB1cmw6IGFzc2V0VXJsLCBtZXNzYWdlOiAnQXNzZXQgc2F2ZWQgc3VjY2Vzc2Z1bGx5JyB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxufVxuIl19