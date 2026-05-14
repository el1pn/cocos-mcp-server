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
exports.resolveSpriteFrameUuid = resolveSpriteFrameUuid;
const fs = __importStar(require("fs"));
/**
 * Resolve a UUID that might be a Texture2D to its SpriteFrame sub-asset UUID.
 * If the UUID is already a SpriteFrame or resolution fails, returns the original UUID.
 */
async function resolveSpriteFrameUuid(uuid) {
    try {
        // Query asset info to check type
        const assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
        if (!assetInfo) {
            return { uuid, converted: false };
        }
        // If it's already a SpriteFrame or not a texture, return as-is
        const importer = assetInfo.importer || '';
        if (importer !== 'image' && importer !== 'texture') {
            return { uuid, converted: false };
        }
        // Get filesystem path to read .meta file
        const assetUrl = await Editor.Message.request('asset-db', 'query-url', uuid);
        if (!assetUrl) {
            return { uuid, converted: false };
        }
        const fsPath = await Editor.Message.request('asset-db', 'query-path', assetUrl);
        if (!fsPath) {
            return { uuid, converted: false };
        }
        const metaPath = fsPath + '.meta';
        if (!fs.existsSync(metaPath)) {
            return { uuid, converted: false };
        }
        const metaContent = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const subMetas = metaContent.subMetas;
        if (!subMetas || typeof subMetas !== 'object') {
            return { uuid, converted: false };
        }
        // Find the SpriteFrame sub-asset (not the base Texture2D sub-asset)
        for (const key of Object.keys(subMetas)) {
            const sub = subMetas[key];
            if (sub && sub.uuid && sub.importer === 'sprite-frame') {
                return { uuid: sub.uuid, converted: true };
            }
        }
        return { uuid, converted: false };
    }
    catch (_a) {
        return { uuid, converted: false };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdXRpbHMvYXNzZXQtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNQSx3REFnREM7QUF0REQsdUNBQXlCO0FBRXpCOzs7R0FHRztBQUNJLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxJQUFZO0lBQ3JELElBQUksQ0FBQztRQUNELGlDQUFpQztRQUNqQyxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsK0RBQStEO1FBQy9ELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakQsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ1osT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUNsQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3RDLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztRQUN0QyxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3RDLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLFFBQVEsS0FBSyxjQUFjLEVBQUUsQ0FBQztnQkFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMvQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFBQyxXQUFNLENBQUM7UUFDTCxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuLyoqXG4gKiBSZXNvbHZlIGEgVVVJRCB0aGF0IG1pZ2h0IGJlIGEgVGV4dHVyZTJEIHRvIGl0cyBTcHJpdGVGcmFtZSBzdWItYXNzZXQgVVVJRC5cbiAqIElmIHRoZSBVVUlEIGlzIGFscmVhZHkgYSBTcHJpdGVGcmFtZSBvciByZXNvbHV0aW9uIGZhaWxzLCByZXR1cm5zIHRoZSBvcmlnaW5hbCBVVUlELlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNwcml0ZUZyYW1lVXVpZCh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPHsgdXVpZDogc3RyaW5nOyBjb252ZXJ0ZWQ6IGJvb2xlYW4gfT4ge1xuICAgIHRyeSB7XG4gICAgICAgIC8vIFF1ZXJ5IGFzc2V0IGluZm8gdG8gY2hlY2sgdHlwZVxuICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCk7XG4gICAgICAgIGlmICghYXNzZXRJbmZvKSB7XG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBTcHJpdGVGcmFtZSBvciBub3QgYSB0ZXh0dXJlLCByZXR1cm4gYXMtaXNcbiAgICAgICAgY29uc3QgaW1wb3J0ZXIgPSBhc3NldEluZm8uaW1wb3J0ZXIgfHwgJyc7XG4gICAgICAgIGlmIChpbXBvcnRlciAhPT0gJ2ltYWdlJyAmJiBpbXBvcnRlciAhPT0gJ3RleHR1cmUnKSB7XG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZmlsZXN5c3RlbSBwYXRoIHRvIHJlYWQgLm1ldGEgZmlsZVxuICAgICAgICBjb25zdCBhc3NldFVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHV1aWQpO1xuICAgICAgICBpZiAoIWFzc2V0VXJsKSB7XG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmc1BhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgYXNzZXRVcmwpO1xuICAgICAgICBpZiAoIWZzUGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgdXVpZCwgY29udmVydGVkOiBmYWxzZSB9O1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbWV0YVBhdGggPSBmc1BhdGggKyAnLm1ldGEnO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobWV0YVBhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBtZXRhQ29udGVudCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1ldGFQYXRoLCAndXRmOCcpKTtcbiAgICAgICAgY29uc3Qgc3ViTWV0YXMgPSBtZXRhQ29udGVudC5zdWJNZXRhcztcbiAgICAgICAgaWYgKCFzdWJNZXRhcyB8fCB0eXBlb2Ygc3ViTWV0YXMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIHRoZSBTcHJpdGVGcmFtZSBzdWItYXNzZXQgKG5vdCB0aGUgYmFzZSBUZXh0dXJlMkQgc3ViLWFzc2V0KVxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzdWJNZXRhcykpIHtcbiAgICAgICAgICAgIGNvbnN0IHN1YiA9IHN1Yk1ldGFzW2tleV07XG4gICAgICAgICAgICBpZiAoc3ViICYmIHN1Yi51dWlkICYmIHN1Yi5pbXBvcnRlciA9PT0gJ3Nwcml0ZS1mcmFtZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBzdWIudXVpZCwgY29udmVydGVkOiB0cnVlIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XG4gICAgfSBjYXRjaCB7XG4gICAgICAgIHJldHVybiB7IHV1aWQsIGNvbnZlcnRlZDogZmFsc2UgfTtcbiAgICB9XG59XG4iXX0=