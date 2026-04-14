import { ToolResponse } from '../types';

/**
 * Wrap an async operation in a uniform ToolResponse.
 * Catches thrown errors and converts them to `success: false`.
 *
 * Use this instead of `new Promise(async (resolve) => { try { ... } catch { ... } })`
 * — the Promise constructor + async executor pattern silently swallows rejections
 * that happen between awaits.
 */
export async function toolCall<T = any>(
    fn: () => Promise<T>,
    onSuccess?: (result: T) => Omit<ToolResponse, 'success' | 'error'>
): Promise<ToolResponse> {
    try {
        const result = await fn();
        if (onSuccess) {
            return { success: true, ...onSuccess(result) };
        }
        return { success: true, data: result };
    } catch (err: any) {
        return { success: false, error: err?.message ?? String(err) };
    }
}

/**
 * Default timeout for editor message round-trips. The Cocos editor sometimes
 * stops responding (e.g. while a modal dialog is open). Without a timeout the
 * MCP request hangs forever and the tool queue stalls.
 */
export const EDITOR_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Thin typed wrapper around Editor.Message.request that enforces a timeout.
 *
 * Use this instead of calling Editor.Message.request directly so we have a
 * single chokepoint for tracing, retries, and the timeout above.
 */
export async function editorRequest<T = any>(
    module: string,
    action: string,
    ...args: any[]
): Promise<T> {
    const promise = Editor.Message.request(module as any, action as any, ...args) as Promise<T>;
    return withTimeout(promise, EDITOR_REQUEST_TIMEOUT_MS, `editor.${module}.${action}`);
}

/**
 * Race a promise against a timeout. Rejects if the timeout fires first.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}
