import * as fs from 'fs';
import * as path from 'path';
import { getMcpServerDataDir } from './settings';

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'mcp';

export interface LogEntry {
    time: string;
    level: LogLevel;
    content: string;
}

const MAX_BUFFER_SIZE = 2000;
const TRIM_TO_SIZE = 1500;
const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_LOG_PAYLOAD_CHARS = 12_000;
const MAX_LOG_STRING_CHARS = 1_000;
const MAX_LOG_DEPTH = 5;
const MAX_LOG_ITEMS = 30;
const MAX_LOG_NODES = 500;

const SENSITIVE_KEYS = new Set([
    'authorization', 'proxyauthorization', 'apikey', 'token', 'accesstoken', 'authtoken',
    'bearertoken', 'refreshtoken', 'password', 'passwd', 'secret', 'clientsecret',
    'cookie', 'setcookie', 'privatekey'
]);

function normalizedKey(key: string): string {
    return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function isSensitiveKey(key: string): boolean {
    const normalized = normalizedKey(key);
    return SENSITIVE_KEYS.has(normalized) || [
        'authorization', 'apikey', 'token', 'password', 'secret', 'cookie', 'privatekey'
    ].some(suffix => normalized.endsWith(suffix));
}

function isBinaryKey(key: string): boolean {
    const normalized = normalizedKey(key);
    return normalized === 'base64' || normalized === 'imagecontent';
}

function truncateString(value: string): string {
    if (value.length <= MAX_LOG_STRING_CHARS) return value;
    return `${value.slice(0, MAX_LOG_STRING_CHARS)}...[truncated ${value.length - MAX_LOG_STRING_CHARS} chars]`;
}

function looksLikeBase64(value: string): boolean {
    if (value.length <= 512 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    const characterGroups = [/[a-z]/, /[A-Z]/, /[0-9]/, /[+/]/].filter(pattern => pattern.test(value)).length;
    return characterGroups >= 3;
}

function sanitizeLogValue(
    value: unknown,
    state: { seen: WeakSet<object>; nodes: number },
    key: string = '',
    depth: number = 0
): unknown {
    if (isSensitiveKey(key)) return '[REDACTED]';
    if (isBinaryKey(key)) return `[binary omitted${typeof value === 'string' ? `: ${value.length} chars` : ''}]`;
    if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number') return value;
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'string') {
        if (value.startsWith('data:image/') || looksLikeBase64(value)) return `[base64 omitted: ${value.length} chars]`;
        return truncateString(value);
    }
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (typeof value !== 'object') return String(value);
    if (Buffer.isBuffer(value)) return `[Buffer omitted: ${value.length} bytes]`;
    if (ArrayBuffer.isView(value)) return `[binary omitted: ${value.byteLength} bytes]`;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Error) {
        return {
            name: value.name,
            message: truncateString(value.message),
            stack: value.stack ? truncateString(value.stack) : undefined
        };
    }
    if (state.seen.has(value)) return '[Circular]';
    if (depth >= MAX_LOG_DEPTH) return '[Depth limit]';
    if (++state.nodes > MAX_LOG_NODES) return '[Node limit]';

    state.seen.add(value);
    try {
        if (Array.isArray(value)) {
            const items = value.slice(0, MAX_LOG_ITEMS).map(item => sanitizeLogValue(item, state, '', depth + 1));
            if (value.length > MAX_LOG_ITEMS) items.push(`[${value.length - MAX_LOG_ITEMS} more items]`);
            return items;
        }

        const output: Record<string, unknown> = {};
        const keys = Object.keys(value).slice(0, MAX_LOG_ITEMS);
        for (const childKey of keys) {
            try {
                output[childKey] = sanitizeLogValue((value as Record<string, unknown>)[childKey], state, childKey, depth + 1);
            } catch (error: any) {
                output[childKey] = `[Unreadable: ${error?.message || String(error)}]`;
            }
        }
        const omitted = Object.keys(value).length - keys.length;
        if (omitted > 0) output.__truncatedKeys = omitted;
        return output;
    } finally {
        state.seen.delete(value);
    }
}

/** Serialize untrusted tool payloads without leaking secrets or breaking tool execution. */
export function formatLogPayload(value: unknown): string {
    try {
        const sanitized = sanitizeLogValue(value, { seen: new WeakSet<object>(), nodes: 0 });
        const serialized = JSON.stringify(sanitized) ?? 'null';
        if (serialized.length <= MAX_LOG_PAYLOAD_CHARS) return serialized;
        return JSON.stringify({
            truncated: true,
            originalLength: serialized.length,
            preview: serialized.slice(0, MAX_LOG_PAYLOAD_CHARS)
        });
    } catch (error: any) {
        return JSON.stringify({ serializationError: error?.message || String(error) });
    }
}

export class Logger {
    private buffer: LogEntry[] = [];
    private logFilePath: string | null = null;

    /**
     * Initialize disk logging. Call after Editor.Project.path is available.
     */
    initDiskLog(projectPath: string): void {
        const dir = getMcpServerDataDir(projectPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const nextLog = path.join(dir, 'mcp-server.log');
        const legacyLog = path.join(projectPath, 'settings', 'mcp-server.log');
        try {
            if (!fs.existsSync(nextLog) && fs.existsSync(legacyLog)) {
                fs.renameSync(legacyLog, nextLog);
                const legacyRotated = legacyLog + '.1';
                const nextRotated = nextLog + '.1';
                if (fs.existsSync(legacyRotated) && !fs.existsSync(nextRotated)) {
                    fs.renameSync(legacyRotated, nextRotated);
                }
            }
        } catch {
            // best-effort migration
        }
        this.logFilePath = nextLog;
    }

    info(content: string): void { this.log('info', content); }
    success(content: string): void { this.log('success', content); }
    warn(content: string): void { this.log('warn', content); }
    error(content: string): void { this.log('error', content); }
    mcp(content: string): void { this.log('mcp', content); }

    private log(level: LogLevel, content: string): void {
        const entry: LogEntry = {
            time: new Date().toISOString(),
            level,
            content
        };

        // Circular buffer
        this.buffer.push(entry);
        if (this.buffer.length > MAX_BUFFER_SIZE) {
            this.buffer = this.buffer.slice(-TRIM_TO_SIZE);
        }

        // Editor console — only warn/error to avoid spam
        const tag = `[MCPServer]`;
        switch (level) {
            case 'error':
                console.error(`${tag} ${content}`);
                break;
            case 'warn':
                console.warn(`${tag} ${content}`);
                break;
            default:
                console.log(`${tag} [${level}] ${content}`);
                break;
        }

        // Panel broadcast (best-effort, ignore if Editor not ready)
        try {
            Editor.Message.broadcast('cocos-mcp-server:on-log', entry);
        } catch {
            // Panel may not be open
        }

        // Disk persistence
        this.writeToDisk(entry);
    }

    private writeToDisk(entry: LogEntry): void {
        if (!this.logFilePath) return;
        try {
            // Rotate if file exceeds max size
            if (fs.existsSync(this.logFilePath)) {
                const stat = fs.statSync(this.logFilePath);
                if (stat.size > MAX_LOG_FILE_BYTES) {
                    const rotatedPath = this.logFilePath + '.1';
                    if (fs.existsSync(rotatedPath)) {
                        fs.unlinkSync(rotatedPath);
                    }
                    fs.renameSync(this.logFilePath, rotatedPath);
                }
            }
            const line = `[${entry.time}] [${entry.level.toUpperCase()}] ${entry.content}\n`;
            fs.appendFileSync(this.logFilePath, line);
        } catch {
            // Disk logging is best-effort
        }
    }

    /**
     * Get recent log entries, optionally filtered by level.
     */
    getEntries(limit: number = 100, level?: LogLevel): LogEntry[] {
        const filtered = level ? this.buffer.filter(e => e.level === level) : this.buffer;
        return filtered.slice(-limit);
    }

    /**
     * Get logs as formatted text (for MCP resources).
     */
    getLogContent(limit: number = 200, level?: LogLevel): string {
        return this.getEntries(limit, level)
            .map(e => `[${e.time}] [${e.level.toUpperCase()}] ${e.content}`)
            .join('\n');
    }

    /**
     * Clear the in-memory buffer.
     */
    clear(): void {
        this.buffer = [];
    }
}

/** Shared logger instance */
export const logger = new Logger();
