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
        // Find the first SpriteFrame sub-asset
        for (const key of Object.keys(subMetas)) {
            const sub = subMetas[key];
            if (sub && sub.uuid && (sub.importer === 'sprite-frame' || key === '6c48a')) {
                return { uuid: sub.uuid, converted: true };
            }
        }
        return { uuid, converted: false };
    }
    catch (_a) {
        return { uuid, converted: false };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdXRpbHMvYXNzZXQtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNQSx3REFnREM7QUF0REQsdUNBQXlCO0FBRXpCOzs7R0FHRztBQUNJLEtBQUssVUFBVSxzQkFBc0IsQ0FBQyxJQUFZO0lBQ3JELElBQUksQ0FBQztRQUNELGlDQUFpQztRQUNqQyxNQUFNLFNBQVMsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNyRixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsK0RBQStEO1FBQy9ELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDO1FBQzFDLElBQUksUUFBUSxLQUFLLE9BQU8sSUFBSSxRQUFRLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDakQsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUVELHlDQUF5QztRQUN6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ1osT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7UUFDdEMsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDVixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUN0QyxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxHQUFHLE9BQU8sQ0FBQztRQUNsQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3RDLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbEUsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztRQUN0QyxJQUFJLENBQUMsUUFBUSxJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzVDLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO1FBQ3RDLENBQUM7UUFFRCx1Q0FBdUM7UUFDdkMsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLGNBQWMsSUFBSSxHQUFHLEtBQUssT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDMUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUMvQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3RDLENBQUM7SUFBQyxXQUFNLENBQUM7UUFDTCxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuXHJcbi8qKlxyXG4gKiBSZXNvbHZlIGEgVVVJRCB0aGF0IG1pZ2h0IGJlIGEgVGV4dHVyZTJEIHRvIGl0cyBTcHJpdGVGcmFtZSBzdWItYXNzZXQgVVVJRC5cclxuICogSWYgdGhlIFVVSUQgaXMgYWxyZWFkeSBhIFNwcml0ZUZyYW1lIG9yIHJlc29sdXRpb24gZmFpbHMsIHJldHVybnMgdGhlIG9yaWdpbmFsIFVVSUQuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNwcml0ZUZyYW1lVXVpZCh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPHsgdXVpZDogc3RyaW5nOyBjb252ZXJ0ZWQ6IGJvb2xlYW4gfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICAvLyBRdWVyeSBhc3NldCBpbmZvIHRvIGNoZWNrIHR5cGVcclxuICAgICAgICBjb25zdCBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCk7XHJcbiAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdXVpZCwgY29udmVydGVkOiBmYWxzZSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gSWYgaXQncyBhbHJlYWR5IGEgU3ByaXRlRnJhbWUgb3Igbm90IGEgdGV4dHVyZSwgcmV0dXJuIGFzLWlzXHJcbiAgICAgICAgY29uc3QgaW1wb3J0ZXIgPSBhc3NldEluZm8uaW1wb3J0ZXIgfHwgJyc7XHJcbiAgICAgICAgaWYgKGltcG9ydGVyICE9PSAnaW1hZ2UnICYmIGltcG9ydGVyICE9PSAndGV4dHVyZScpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdXVpZCwgY29udmVydGVkOiBmYWxzZSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2V0IGZpbGVzeXN0ZW0gcGF0aCB0byByZWFkIC5tZXRhIGZpbGVcclxuICAgICAgICBjb25zdCBhc3NldFVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHV1aWQpO1xyXG4gICAgICAgIGlmICghYXNzZXRVcmwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgdXVpZCwgY29udmVydGVkOiBmYWxzZSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgZnNQYXRoID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIGFzc2V0VXJsKTtcclxuICAgICAgICBpZiAoIWZzUGF0aCkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtZXRhUGF0aCA9IGZzUGF0aCArICcubWV0YSc7XHJcbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKG1ldGFQYXRoKSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBtZXRhQ29udGVudCA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKG1ldGFQYXRoLCAndXRmOCcpKTtcclxuICAgICAgICBjb25zdCBzdWJNZXRhcyA9IG1ldGFDb250ZW50LnN1Yk1ldGFzO1xyXG4gICAgICAgIGlmICghc3ViTWV0YXMgfHwgdHlwZW9mIHN1Yk1ldGFzICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb252ZXJ0ZWQ6IGZhbHNlIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBGaW5kIHRoZSBmaXJzdCBTcHJpdGVGcmFtZSBzdWItYXNzZXRcclxuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzdWJNZXRhcykpIHtcclxuICAgICAgICAgICAgY29uc3Qgc3ViID0gc3ViTWV0YXNba2V5XTtcclxuICAgICAgICAgICAgaWYgKHN1YiAmJiBzdWIudXVpZCAmJiAoc3ViLmltcG9ydGVyID09PSAnc3ByaXRlLWZyYW1lJyB8fCBrZXkgPT09ICc2YzQ4YScpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkOiBzdWIudXVpZCwgY29udmVydGVkOiB0cnVlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHV1aWQsIGNvbnZlcnRlZDogZmFsc2UgfTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIHJldHVybiB7IHV1aWQsIGNvbnZlcnRlZDogZmFsc2UgfTtcclxuICAgIH1cclxufVxyXG4iXX0=