/// <reference types="node" />
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerAllMcpClients, McpClientTarget } from '../mcp-clients';

function makeTarget(configPath: string): McpClientTarget {
    return {
        name: 'test-client',
        configPath,
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
}

function withTempConfig(content: unknown, fn: (configPath: string) => Promise<void>): Promise<void> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-clients-retry-test-'));
    const configPath = path.join(dir, 'claude.json');
    fs.writeFileSync(configPath, JSON.stringify(content, null, 2));
    return fn(configPath).finally(() => fs.rmSync(dir, { recursive: true, force: true }));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // 1. project unknown at start, appears later -> retry picks it up
    await withTempConfig({ projects: {} }, async (configPath) => {
        const target = makeTarget(configPath);
        const handle = registerAllMcpClients('/proj/a', 3000, [target], 20, 1000);

        let data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.strictEqual(data.projects['/proj/a'], undefined);

        fs.writeFileSync(configPath, JSON.stringify({ projects: { '/proj/a': {} } }, null, 2));
        await sleep(60);

        data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos-creator-3x'], {
            type: 'http',
            url: 'http://127.0.0.1:3000/mcp',
        });
        handle.cancel();
    });

    // 2. project known from the start -> registers synchronously, no pending retry needed
    await withTempConfig({ projects: { '/proj/a': {} } }, async (configPath) => {
        const target = makeTarget(configPath);
        const handle = registerAllMcpClients('/proj/a', 3000, [target], 20, 1000);
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos-creator-3x'], {
            type: 'http',
            url: 'http://127.0.0.1:3000/mcp',
        });
        handle.cancel();
    });

    // 3. cancel() stops polling — file never gets the entry even after project appears
    await withTempConfig({ projects: {} }, async (configPath) => {
        const target = makeTarget(configPath);
        const handle = registerAllMcpClients('/proj/a', 3000, [target], 20, 1000);
        handle.cancel();

        fs.writeFileSync(configPath, JSON.stringify({ projects: { '/proj/a': {} } }, null, 2));
        await sleep(80);

        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.strictEqual(data.projects['/proj/a'].mcpServers, undefined);
    });

    // 4. timeout elapses before project appears -> polling stops on its own, no throw
    await withTempConfig({ projects: {} }, async (configPath) => {
        const target = makeTarget(configPath);
        registerAllMcpClients('/proj/a', 3000, [target], 20, 50);
        await sleep(150);
        // no assertion needed beyond "didn't throw" — timer should be cleared by now
    });

    console.log('mcp-clients-retry.test.ts: all checks passed');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
