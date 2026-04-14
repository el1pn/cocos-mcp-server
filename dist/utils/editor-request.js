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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXJlcXVlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdXRpbHMvZWRpdG9yLXJlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBVUEsNEJBYUM7QUFlRCxzQ0FPQztBQUtELGtDQVVDO0FBMUREOzs7Ozs7O0dBT0c7QUFDSSxLQUFLLFVBQVUsUUFBUSxDQUMxQixFQUFvQixFQUNwQixTQUFrRTs7SUFFbEUsSUFBSSxDQUFDO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLEVBQUUsQ0FBQztRQUMxQixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osdUJBQVMsT0FBTyxFQUFFLElBQUksSUFBSyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUc7UUFDbkQsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztRQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsT0FBTyxtQ0FBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztJQUNsRSxDQUFDO0FBQ0wsQ0FBQztBQUVEOzs7O0dBSUc7QUFDVSxRQUFBLHlCQUF5QixHQUFHLEtBQU0sQ0FBQztBQUVoRDs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSxhQUFhLENBQy9CLE1BQWMsRUFDZCxNQUFjLEVBQ2QsR0FBRyxJQUFXO0lBRWQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBYSxFQUFFLE1BQWEsRUFBRSxHQUFHLElBQUksQ0FBZSxDQUFDO0lBQzVGLE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxpQ0FBeUIsRUFBRSxVQUFVLE1BQU0sSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3pGLENBQUM7QUFFRDs7R0FFRztBQUNJLEtBQUssVUFBVSxXQUFXLENBQUksT0FBbUIsRUFBRSxFQUFVLEVBQUUsS0FBSyxHQUFHLFdBQVc7SUFDckYsSUFBSSxLQUFnRCxDQUFDO0lBQ3JELE1BQU0sY0FBYyxHQUFHLElBQUksT0FBTyxDQUFRLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3BELEtBQUssR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsS0FBSyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDO1FBQ0QsT0FBTyxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO1lBQVMsQ0FBQztRQUNQLElBQUksS0FBSztZQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xSZXNwb25zZSB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBXcmFwIGFuIGFzeW5jIG9wZXJhdGlvbiBpbiBhIHVuaWZvcm0gVG9vbFJlc3BvbnNlLlxuICogQ2F0Y2hlcyB0aHJvd24gZXJyb3JzIGFuZCBjb252ZXJ0cyB0aGVtIHRvIGBzdWNjZXNzOiBmYWxzZWAuXG4gKlxuICogVXNlIHRoaXMgaW5zdGVhZCBvZiBgbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHsgdHJ5IHsgLi4uIH0gY2F0Y2ggeyAuLi4gfSB9KWBcbiAqIOKAlCB0aGUgUHJvbWlzZSBjb25zdHJ1Y3RvciArIGFzeW5jIGV4ZWN1dG9yIHBhdHRlcm4gc2lsZW50bHkgc3dhbGxvd3MgcmVqZWN0aW9uc1xuICogdGhhdCBoYXBwZW4gYmV0d2VlbiBhd2FpdHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0b29sQ2FsbDxUID0gYW55PihcbiAgICBmbjogKCkgPT4gUHJvbWlzZTxUPixcbiAgICBvblN1Y2Nlc3M/OiAocmVzdWx0OiBUKSA9PiBPbWl0PFRvb2xSZXNwb25zZSwgJ3N1Y2Nlc3MnIHwgJ2Vycm9yJz5cbik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZm4oKTtcbiAgICAgICAgaWYgKG9uU3VjY2Vzcykge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgLi4ub25TdWNjZXNzKHJlc3VsdCkgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQgfTtcbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycj8ubWVzc2FnZSA/PyBTdHJpbmcoZXJyKSB9O1xuICAgIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHRpbWVvdXQgZm9yIGVkaXRvciBtZXNzYWdlIHJvdW5kLXRyaXBzLiBUaGUgQ29jb3MgZWRpdG9yIHNvbWV0aW1lc1xuICogc3RvcHMgcmVzcG9uZGluZyAoZS5nLiB3aGlsZSBhIG1vZGFsIGRpYWxvZyBpcyBvcGVuKS4gV2l0aG91dCBhIHRpbWVvdXQgdGhlXG4gKiBNQ1AgcmVxdWVzdCBoYW5ncyBmb3JldmVyIGFuZCB0aGUgdG9vbCBxdWV1ZSBzdGFsbHMuXG4gKi9cbmV4cG9ydCBjb25zdCBFRElUT1JfUkVRVUVTVF9USU1FT1VUX01TID0gMzBfMDAwO1xuXG4vKipcbiAqIFRoaW4gdHlwZWQgd3JhcHBlciBhcm91bmQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCB0aGF0IGVuZm9yY2VzIGEgdGltZW91dC5cbiAqXG4gKiBVc2UgdGhpcyBpbnN0ZWFkIG9mIGNhbGxpbmcgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBkaXJlY3RseSBzbyB3ZSBoYXZlIGFcbiAqIHNpbmdsZSBjaG9rZXBvaW50IGZvciB0cmFjaW5nLCByZXRyaWVzLCBhbmQgdGhlIHRpbWVvdXQgYWJvdmUuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlZGl0b3JSZXF1ZXN0PFQgPSBhbnk+KFxuICAgIG1vZHVsZTogc3RyaW5nLFxuICAgIGFjdGlvbjogc3RyaW5nLFxuICAgIC4uLmFyZ3M6IGFueVtdXG4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCBwcm9taXNlID0gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChtb2R1bGUgYXMgYW55LCBhY3Rpb24gYXMgYW55LCAuLi5hcmdzKSBhcyBQcm9taXNlPFQ+O1xuICAgIHJldHVybiB3aXRoVGltZW91dChwcm9taXNlLCBFRElUT1JfUkVRVUVTVF9USU1FT1VUX01TLCBgZWRpdG9yLiR7bW9kdWxlfS4ke2FjdGlvbn1gKTtcbn1cblxuLyoqXG4gKiBSYWNlIGEgcHJvbWlzZSBhZ2FpbnN0IGEgdGltZW91dC4gUmVqZWN0cyBpZiB0aGUgdGltZW91dCBmaXJlcyBmaXJzdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdpdGhUaW1lb3V0PFQ+KHByb21pc2U6IFByb21pc2U8VD4sIG1zOiBudW1iZXIsIGxhYmVsID0gJ29wZXJhdGlvbicpOiBQcm9taXNlPFQ+IHtcbiAgICBsZXQgdGltZXI6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2U8bmV2ZXI+KChfLCByZWplY3QpID0+IHtcbiAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHJlamVjdChuZXcgRXJyb3IoYCR7bGFiZWx9IHRpbWVkIG91dCBhZnRlciAke21zfW1zYCkpLCBtcyk7XG4gICAgfSk7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IFByb21pc2UucmFjZShbcHJvbWlzZSwgdGltZW91dFByb21pc2VdKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAodGltZXIpIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgfVxufVxuIl19