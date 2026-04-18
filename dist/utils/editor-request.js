"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDITOR_REQUEST_TIMEOUT_MS = void 0;
exports.toolCall = toolCall;
exports.editorRequest = editorRequest;
exports.withTimeout = withTimeout;
/**
 * Wrap an async operation in a uniform ToolResponse.
 * Catches thrown errors and converts them to `success: false`.
 *
 * Use this instead of `new Promise(async (resolve) => { try { ... } catch { ... } })`
 * — the Promise constructor + async executor pattern silently swallows rejections
 * that happen between awaits.
 */
async function toolCall(fn, onSuccess) {
    var _a;
    try {
        const result = await fn();
        if (onSuccess) {
            return Object.assign({ success: true }, onSuccess(result));
        }
        return { success: true, data: result };
    }
    catch (err) {
        return { success: false, error: (_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err) };
    }
}
/**
 * Default timeout for editor message round-trips. The Cocos editor sometimes
 * stops responding (e.g. while a modal dialog is open). Without a timeout the
 * MCP request hangs forever and the tool queue stalls.
 */
exports.EDITOR_REQUEST_TIMEOUT_MS = 30000;
/**
 * Thin typed wrapper around Editor.Message.request that enforces a timeout.
 *
 * Use this instead of calling Editor.Message.request directly so we have a
 * single chokepoint for tracing, retries, and the timeout above.
 */
async function editorRequest(module, action, ...args) {
    const promise = Editor.Message.request(module, action, ...args);
    return withTimeout(promise, exports.EDITOR_REQUEST_TIMEOUT_MS, `editor.${module}.${action}`);
}
/**
 * Race a promise against a timeout. Rejects if the timeout fires first.
 */
async function withTimeout(promise, ms, label = 'operation') {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    }
    finally {
        if (timer)
            clearTimeout(timer);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdXRpbHMvZWRpdG9yLXJlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBVUEsNEJBYUM7QUFlRCxzQ0FPQztBQUtELGtDQVVDO0FBMUREOzs7Ozs7O0dBT0c7QUFDSSxLQUFLLFVBQVUsUUFBUSxDQUMxQixFQUFvQixFQUNwQixTQUFrRTs7SUFFbEUsSUFBSSxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUMxQixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osdUJBQVMsT0FBTyxFQUFFLElBQUksSUFBSyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUc7UUFDbkQsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztRQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsT0FBTyxtQ0FBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztJQUNsRSxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7O0dBSUc7QUFDVSxRQUFBLHlCQUF5QixHQUFHLEtBQU0sQ0FBQztBQUVoRDs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSxhQUFhLENBQy9CLE1BQWMsRUFDZCxNQUFjLEVBQ2QsR0FBRyxJQUFXO0lBRWQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBYSxFQUFFLE1BQWEsRUFBRSxHQUFHLElBQUksQ0FBZSxDQUFDO0lBQzVGLE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxpQ0FBeUIsRUFBRSxVQUFVLE1BQU0sSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3pGLENBQUM7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxXQUFXLENBQUksT0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBSyxHQUFHLFdBQVc7SUFDckYsSUFBSSxLQUFnRCxDQUFDO0lBQ3JELE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3BELEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDO1FBQ0QsT0FBTyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO1lBQVMsQ0FBQztRQUNQLElBQUksS0FBSztZQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xSZXNwb25zZSB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbi8qKlxyXG4gKiBXcmFwIGFuIGFzeW5jIG9wZXJhdGlvbiBpbiBhIHVuaWZvcm0gVG9vbFJlc3BvbnNlLlxyXG4gKiBDYXRjaGVzIHRocm93biBlcnJvcnMgYW5kIGNvbnZlcnRzIHRoZW0gdG8gYHN1Y2Nlc3M6IGZhbHNlYC5cclxuICpcclxuICogVXNlIHRoaXMgaW5zdGVhZCBvZiBgbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHsgdHJ5IHsgLi4uIH0gY2F0Y2ggeyAuLi4gfSB9KWBcclxuICog4oCUIHRoZSBQcm9taXNlIGNvbnN0cnVjdG9yICsgYXN5bmMgZXhlY3V0b3IgcGF0dGVybiBzaWxlbnRseSBzd2FsbG93cyByZWplY3Rpb25zXHJcbiAqIHRoYXQgaGFwcGVuIGJldHdlZW4gYXdhaXRzLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRvb2xDYWxsPFQgPSBhbnk+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBvblN1Y2Nlc3M/OiAocmVzdWx0OiBUKSA9PiBPbWl0PFRvb2xSZXNwb25zZSwgJ3N1Y2Nlc3MnIHwgJ2Vycm9yJz5cclxuKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcclxuICAgICAgICBpZiAob25TdWNjZXNzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIC4uLm9uU3VjY2VzcyhyZXN1bHQpIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdCB9O1xyXG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xyXG4gICAgfVxyXG59XHJcblxyXG4vKipcclxuICogRGVmYXVsdCB0aW1lb3V0IGZvciBlZGl0b3IgbWVzc2FnZSByb3VuZC10cmlwcy4gVGhlIENvY29zIGVkaXRvciBzb21ldGltZXNcclxuICogc3RvcHMgcmVzcG9uZGluZyAoZS5nLiB3aGlsZSBhIG1vZGFsIGRpYWxvZyBpcyBvcGVuKS4gV2l0aG91dCBhIHRpbWVvdXQgdGhlXHJcbiAqIE1DUCByZXF1ZXN0IGhhbmdzIGZvcmV2ZXIgYW5kIHRoZSB0b29sIHF1ZXVlIHN0YWxscy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBFRElUT1JfUkVRVUVTVF9USU1FT1VUX01TID0gMzBfMDAwO1xyXG5cclxuLyoqXHJcbiAqIFRoaW4gdHlwZWQgd3JhcHBlciBhcm91bmQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCB0aGF0IGVuZm9yY2VzIGEgdGltZW91dC5cclxuICpcclxuICogVXNlIHRoaXMgaW5zdGVhZCBvZiBjYWxsaW5nIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgZGlyZWN0bHkgc28gd2UgaGF2ZSBhXHJcbiAqIHNpbmdsZSBjaG9rZXBvaW50IGZvciB0cmFjaW5nLCByZXRyaWVzLCBhbmQgdGhlIHRpbWVvdXQgYWJvdmUuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZWRpdG9yUmVxdWVzdDxUID0gYW55PihcclxuICAgIG1vZHVsZTogc3RyaW5nLFxyXG4gICAgYWN0aW9uOiBzdHJpbmcsXHJcbiAgICAuLi5hcmdzOiBhbnlbXVxyXG4pOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IHByb21pc2UgPSBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KG1vZHVsZSBhcyBhbnksIGFjdGlvbiBhcyBhbnksIC4uLmFyZ3MpIGFzIFByb21pc2U8VD47XHJcbiAgICByZXR1cm4gd2l0aFRpbWVvdXQocHJvbWlzZSwgRURJVE9SX1JFUVVFU1RfVElNRU9VVF9NUywgYGVkaXRvci4ke21vZHVsZX0uJHthY3Rpb259YCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSYWNlIGEgcHJvbWlzZSBhZ2FpbnN0IGEgdGltZW91dC4gUmVqZWN0cyBpZiB0aGUgdGltZW91dCBmaXJlcyBmaXJzdC5cclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3aXRoVGltZW91dDxUPihwcm9taXNlOiBQcm9taXNlPFQ+LCBtczogbnVtYmVyLCBsYWJlbCA9ICdvcGVyYXRpb24nKTogUHJvbWlzZTxUPiB7XHJcbiAgICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgdW5kZWZpbmVkO1xyXG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZTxuZXZlcj4oKF8sIHJlamVjdCkgPT4ge1xyXG4gICAgICAgIHRpbWVyID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGAke2xhYmVsfSB0aW1lZCBvdXQgYWZ0ZXIgJHttc31tc2ApKSwgbXMpO1xyXG4gICAgfSk7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBhd2FpdCBQcm9taXNlLnJhY2UoW3Byb21pc2UsIHRpbWVvdXRQcm9taXNlXSk7XHJcbiAgICB9IGZpbmFsbHkge1xyXG4gICAgICAgIGlmICh0aW1lcikgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgIH1cclxufVxyXG4iXX0=