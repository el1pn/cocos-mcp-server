const assert = require('assert');
const { formatLogPayload, logger } = require('../../dist/logger');
const { MCPServer } = require('../../dist/mcp-server');

function makeServer(enableDebugLog, handler) {
    const server = new MCPServer({
        port: 3000,
        autoStart: false,
        enableDebugLog,
        allowedOrigins: ['*'],
        maxConnections: 10
    });
    server.toolExecutors.set('test_tool', handler);
    return server;
}

function toolEvents() {
    return logger.getEntries(100, 'mcp')
        .filter(entry => entry.content.startsWith('tool_call '))
        .map(entry => JSON.parse(entry.content.slice('tool_call '.length)));
}

async function debugOffDoesNotTrace() {
    logger.clear();
    const server = makeServer(false, async () => ({ success: true }));
    await server.executeToolCall('test_tool', { value: 1 });
    assert.deepStrictEqual(toolEvents(), []);
}

async function returnedFailureIsTraced() {
    logger.clear();
    const server = makeServer(true, async () => ({ success: false, error: 'boom' }));
    const result = await server.executeToolCall('test_tool', { value: 1 }, { requestId: 42 });
    const events = toolEvents();

    assert.strictEqual(result.success, false);
    assert.deepStrictEqual(events.map(event => event.event), ['start', 'end']);
    assert.strictEqual(events[0].callId, events[1].callId);
    assert.strictEqual(events[0].requestId, 42);
    assert.strictEqual(events[1].success, false);
    assert.strictEqual(typeof events[1].durationMs, 'number');
}

async function thrownErrorIsTracedAndRethrown() {
    logger.clear();
    const server = makeServer(true, async () => { throw new Error('exploded'); });

    await assert.rejects(() => server.executeToolCall('test_tool', {}), /exploded/);
    const events = toolEvents();
    assert.deepStrictEqual(events.map(event => event.event), ['start', 'error']);
    assert.strictEqual(events[1].success, false);
    assert.strictEqual(events[1].error.message, 'exploded');
}

function payloadsAreSafe() {
    const circular = { password: 'hidden', token: 'hidden-too' };
    circular.self = circular;
    const text = formatLogPayload({
        authorization: 'Bearer hidden',
        api_key: 'hidden-three',
        githubToken: 'hidden-four',
        circular,
        base64: 'A'.repeat(2048),
        imageContent: [{ base64: 'B'.repeat(2048) }],
        long: 'x'.repeat(2000)
    });

    assert.doesNotMatch(text, /hidden/);
    assert.doesNotMatch(text, /AAAAAA|BBBBBB/);
    assert.match(text, /REDACTED/);
    assert.match(text, /Circular/);
    assert.match(text, /binary omitted/);
    assert.match(text, /truncated/);
}

async function timeoutIsTraced() {
    logger.clear();
    const originalTimeout = MCPServer.TOOL_EXECUTION_TIMEOUT_MS;
    MCPServer.TOOL_EXECUTION_TIMEOUT_MS = 5;
    const server = makeServer(true, () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 30)));

    try {
        await assert.rejects(() => server.enqueueToolExecution('test_tool', {}, 'request-1'), /timeout/);
        await new Promise(resolve => setTimeout(resolve, 40));
        const events = toolEvents();
        const timeout = events.find(event => event.event === 'timeout');
        const lateEnd = events.find(event => event.event === 'end');
        assert.strictEqual(timeout.requestId, 'request-1');
        assert.strictEqual(lateEnd.callId, timeout.callId, 'a late completion must retain the timed-out call ID');
    } finally {
        MCPServer.TOOL_EXECUTION_TIMEOUT_MS = originalTimeout;
    }
}

(async () => {
    await debugOffDoesNotTrace();
    await returnedFailureIsTraced();
    await thrownErrorIsTracedAndRethrown();
    payloadsAreSafe();
    await timeoutIsTraced();
    console.log('tool-call-logging: all checks passed');
})().catch(error => {
    console.error('tool-call-logging FAILED:', error.stack || error.message);
    process.exit(1);
});
