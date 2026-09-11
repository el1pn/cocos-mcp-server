/**
 * Regression test: batch_execute must treat a returned { success: false } as a
 * failure, not just a thrown error. Tools signal failure by returning rather
 * than throwing (that maps to MCP `isError`), so a returned failure that went
 * uncounted made stopOnError a no-op and reported the whole batch as successful.
 *
 * Run after `npm run build`:
 *   node source/test/batch-failure.test.js
 */
const assert = require('assert');
const { BatchTools } = require('../../dist/tools/batch-tools');

function makeBatch(handlers) {
    const calls = [];
    const batch = new BatchTools(async (tool, args) => {
        calls.push(tool);
        const handler = handlers[tool];
        if (!handler) throw new Error(`unexpected tool ${tool}`);
        return handler(args);
    });
    return { batch, calls };
}

const op = tool => ({ tool, args: { action: 'noop' } });

async function returnedFailureIsAnError() {
    const { batch } = makeBatch({
        ok: async () => ({ success: true, data: 1 }),
        bad: async () => ({ success: false, error: 'boom' })
    });

    const res = await batch.execute('batch_execute', { operations: [op('ok'), op('bad')] });

    assert.strictEqual(res.success, false, 'batch must fail when an operation returns success:false');
    assert.strictEqual(res.data.results[1].error, 'boom', 'the tool error must be surfaced');
    assert.match(res.message, /1\/2 failed/);
}

async function stopOnErrorHaltsOnReturnedFailure() {
    const { batch, calls } = makeBatch({
        bad: async () => ({ success: false, error: 'boom' }),
        never: async () => ({ success: true })
    });

    const res = await batch.execute('batch_execute', {
        operations: [op('bad'), op('never')],
        stopOnError: true
    });

    assert.deepStrictEqual(calls, ['bad'], 'execution must stop before the second operation');
    assert.strictEqual(res.data.stoppedEarly, true);
    assert.strictEqual(res.data.completed, 1);
}

async function thrownErrorStillCounts() {
    const { batch } = makeBatch({
        throws: async () => { throw new Error('exploded'); }
    });

    const res = await batch.execute('batch_execute', { operations: [op('throws')] });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.data.results[0].error, 'exploded');
}

async function allSuccessStaysSuccessful() {
    const { batch } = makeBatch({ ok: async () => ({ success: true, data: 'fine' }) });

    const res = await batch.execute('batch_execute', { operations: [op('ok'), op('ok')] });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.results.every(r => !r.error), true);
}

/**
 * A snapshot restores node state; it cannot un-create a node or un-write an
 * asset. Reporting a bare "succeeded" over those leaves the caller believing
 * the scene was returned to its prior state, so they must be named.
 */
async function rollbackNamesWhatItCouldNotUndo() {
    // Stand in for the editor: the snapshot/restore round-trip goes through
    // execute-scene-script, which only exists inside a running editor.
    global.Editor = {
        Message: {
            request: async (_module, _action, payload) => {
                if (payload?.method === 'snapshotNodes') {
                    return { success: true, data: { nodes: [] } };
                }
                return { success: true, data: { restored: [], missing: [] } };
            }
        }
    };

    try {
        const { batch } = makeBatch({
            node_lifecycle: async () => ({ success: true }),
            bad: async () => ({ success: false, error: 'boom' })
        });

        const res = await batch.execute('batch_execute', {
            operations: [
                { tool: 'node_lifecycle', args: { action: 'create', name: 'X' } },
                op('bad')
            ],
            rollbackOnError: true
        });

        assert.strictEqual(res.success, false);
        assert.deepStrictEqual(res.data.rollback.unprotected, ['node_lifecycle.create']);
        assert.match(res.data.rollback.warning, /NOT undone/);
        assert.match(res.message, /could not be undone/);
    } finally {
        delete global.Editor;
    }
}

(async () => {
    await returnedFailureIsAnError();
    await stopOnErrorHaltsOnReturnedFailure();
    await thrownErrorStillCounts();
    await allSuccessStaysSuccessful();
    await rollbackNamesWhatItCouldNotUndo();
    console.log('batch-failure: all checks passed');
})().catch(err => {
    console.error('batch-failure FAILED:', err.message);
    process.exit(1);
});
