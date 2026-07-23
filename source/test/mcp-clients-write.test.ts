/// <reference types="node" />
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerMcpEntry, McpClientTarget } from '../mcp-clients';

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

function withTempConfig(content: unknown, mode: number, fn: (configPath: string) => void): void {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-clients-test-'));
    const configPath = path.join(dir, 'claude.json');
    fs.writeFileSync(configPath, JSON.stringify(content, null, 2), { mode });
    try {
        fn(configPath);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

// 1. project exists, no mcpServers yet -> creates entry
withTempConfig({ projects: { '/proj/a': {} } }, 0o600, (configPath) => {
    registerMcpEntry(makeTarget(configPath), '/proj/a', 3000);
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos-creator-3x'], {
        type: 'http',
        url: 'http://127.0.0.1:3000/mcp',
    });
});

// 2. project has another server already -> untouched, only our key added
withTempConfig(
    { projects: { '/proj/a': { mcpServers: { 'cocos3-rag-mcp': { type: 'stdio', command: 'foo' } } } } },
    0o600,
    (configPath) => {
        registerMcpEntry(makeTarget(configPath), '/proj/a', 3001);
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos3-rag-mcp'], { type: 'stdio', command: 'foo' });
        assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos-creator-3x'], {
            type: 'http',
            url: 'http://127.0.0.1:3001/mcp',
        });
    }
);

// 3. project not known to client -> file untouched, no throw
withTempConfig({ projects: { '/proj/a': {} } }, 0o600, (configPath) => {
    const before = fs.readFileSync(configPath, 'utf8');
    registerMcpEntry(makeTarget(configPath), '/proj/unknown', 3000);
    const after = fs.readFileSync(configPath, 'utf8');
    assert.strictEqual(before, after);
});

// 4. original file mode is preserved after write
withTempConfig({ projects: { '/proj/a': {} } }, 0o600, (configPath) => {
    registerMcpEntry(makeTarget(configPath), '/proj/a', 3000);
    const mode = fs.statSync(configPath).mode & 0o777;
    assert.strictEqual(mode, 0o600);
});

// 5. transient rename lock -> retries and registers
withTempConfig({ projects: { '/proj/a': {} } }, 0o600, (configPath) => {
    const originalRenameSync = fs.renameSync;
    let calls = 0;
    (fs as any).renameSync = (source: string, destination: string) => {
        calls++;
        if (calls < 3) {
            const error = new Error('file is locked') as NodeJS.ErrnoException;
            error.code = 'EPERM';
            throw error;
        }
        originalRenameSync(source, destination);
    };

    try {
        assert.strictEqual(registerMcpEntry(makeTarget(configPath), '/proj/a', 3000), 'registered');
        assert.strictEqual(calls, 3);
        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        assert.deepStrictEqual(data.projects['/proj/a'].mcpServers['cocos-creator-3x'], {
            type: 'http',
            url: 'http://127.0.0.1:3000/mcp',
        });
    } finally {
        (fs as any).renameSync = originalRenameSync;
    }
});

// 6. missing / invalid JSON file -> no throw, file not created
{
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-clients-test-'));
    const missingPath = path.join(dir, 'does-not-exist.json');
    assert.doesNotThrow(() => registerMcpEntry(makeTarget(missingPath), '/proj/a', 3000));
    assert.strictEqual(fs.existsSync(missingPath), false);
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log('mcp-clients-write.test.ts: all checks passed');
