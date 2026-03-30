import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'mcp';

export interface LogEntry {
    time: string;
    level: LogLevel;
    content: string;
}

const MAX_BUFFER_SIZE = 2000;
const TRIM_TO_SIZE = 1500;
const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024; // 2MB

export class Logger {
    private buffer: LogEntry[] = [];
    private logFilePath: string | null = null;

    /**
     * Initialize disk logging. Call after Editor.Project.path is available.
     */
    initDiskLog(projectPath: string): void {
        const settingsDir = path.join(projectPath, 'settings');
        if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
        }
        this.logFilePath = path.join(settingsDir, 'mcp-server.log');
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
