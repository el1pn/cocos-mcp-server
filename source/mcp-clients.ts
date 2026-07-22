import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logger } from './logger';

export interface McpClientTarget {
    name: string;
    configPath: string;
    entryKey: string;
    /** Returns the mcpServers object to mutate, or null if this client hasn't
     *  seen this project yet — signals "skip, don't create anything new". */
    resolveMcpServers(data: any, projectPath: string): Record<string, any> | null;
    buildEntry(port: number): unknown;
}

export const CLAUDE_CODE_TARGET: McpClientTarget = {
    name: 'claude-code',
    configPath: path.join(os.homedir(), '.claude.json'),
    entryKey: 'cocos-creator-3x',
    resolveMcpServers(data, projectPath) {
        const project = data.projects?.[projectPath];
        if (!project) return null;
        project.mcpServers ??= {};
        return project.mcpServers;
    },
    buildEntry(port) {
        return { type: 'http', url: `http://127.0.0.1:${port}/mcp` };
    },
};

/** All clients to self-register with. Add a client by adding an entry here. */
export const MCP_CLIENT_TARGETS: McpClientTarget[] = [CLAUDE_CODE_TARGET];

export type RegisterStatus = 'registered' | 'config-missing' | 'project-unknown' | 'error';

/** Best-effort: never throws, only logs. This is a convenience side-effect, not the source of truth. */
export function registerMcpEntry(
    target: McpClientTarget,
    projectPath: string,
    port: number,
    opts: { verbose?: boolean } = {}
): RegisterStatus {
    const verbose = opts.verbose ?? true;
    try {
        if (!fs.existsSync(target.configPath)) {
            if (verbose) logger.info(`[${target.name}] config not found at ${target.configPath}, skipping MCP auto-register`);
            return 'config-missing';
        }

        const raw = fs.readFileSync(target.configPath, 'utf8');
        const data = JSON.parse(raw);

        const servers = target.resolveMcpServers(data, projectPath);
        if (!servers) {
            if (verbose) logger.info(`[${target.name}] project not known to this client yet, skipping MCP auto-register`);
            return 'project-unknown';
        }

        servers[target.entryKey] = target.buildEntry(port);

        const mode = fs.statSync(target.configPath).mode;
        const tmpPath = `${target.configPath}.tmp-${process.pid}`;
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { mode });
        fs.renameSync(tmpPath, target.configPath);

        logger.info(`[${target.name}] registered MCP entry '${target.entryKey}' -> port ${port}`);
        return 'registered';
    } catch (e) {
        if (verbose) logger.warn(`[${target.name}] failed to auto-register MCP entry: ${e}`);
        return 'error';
    }
}

export interface RetryHandle {
    cancel(): void;
}

const RETRY_POLL_INTERVAL_MS = 5_000;
const RETRY_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Registers with every client immediately, then keeps polling in the background for any
 * target whose project wasn't known yet (e.g. editor started before the first `claude`
 * session in this project) until it appears in the client's config or the timeout elapses.
 */
export function registerAllMcpClients(
    projectPath: string,
    port: number,
    targets: McpClientTarget[] = MCP_CLIENT_TARGETS,
    pollIntervalMs = RETRY_POLL_INTERVAL_MS,
    timeoutMs = RETRY_TIMEOUT_MS
): RetryHandle {
    let pending = targets.filter(
        target => registerMcpEntry(target, projectPath, port) === 'project-unknown'
    );

    if (pending.length === 0) {
        return { cancel() {} };
    }

    const deadline = Date.now() + timeoutMs;
    const timer = setInterval(() => {
        pending = pending.filter(
            target => registerMcpEntry(target, projectPath, port, { verbose: false }) === 'project-unknown'
        );
        if (pending.length === 0) {
            clearInterval(timer);
        } else if (Date.now() >= deadline) {
            clearInterval(timer);
            logger.info(
                `Gave up auto-registering MCP entry after ${timeoutMs / 1000}s for: ${pending.map(t => t.name).join(', ')}`
            );
        }
    }, pollIntervalMs);

    return { cancel: () => clearInterval(timer) };
}
