/**
 * Tests for resolveNodeUuid: UUIDs pass through, paths match segment-wise,
 * bare names match anywhere, and an ambiguous name errors with candidates
 * instead of silently picking one.
 *
 * Run after `npm run build`:
 *   node source/test/node-resolver.test.js
 */
const assert = require('assert');
const Module = require('module');

// Stub the editor-request module before loading the resolver: resolving against
// an in-memory tree needs no running editor.
const TREE = {
    uuid: 'scene-root', name: 'Scene', children: [
        {
            uuid: 'canvas-uuid', name: 'Canvas', children: [
                {
                    uuid: 'panel-uuid', name: 'Panel', children: [
                        { uuid: 'button-uuid', name: 'Button', children: [] },
                        { uuid: 'label-uuid', name: 'Label', children: [] }
                    ]
                },
                {
                    uuid: 'footer-uuid', name: 'Footer', children: [
                        { uuid: 'footer-button-uuid', name: 'Button', children: [] }
                    ]
                }
            ]
        }
    ]
};

let treeToReturn = TREE;
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === './editor-request' || request === '../utils/editor-request') {
        return { editorRequest: async () => treeToReturn };
    }
    return originalLoad.apply(this, arguments);
};

const { resolveNodeUuid, resolveOptionalNodeUuid, looksLikeUuid } = require('../../dist/utils/node-resolver');

async function rejects(fn, pattern, msg) {
    try {
        await fn();
    } catch (err) {
        assert.match(err.message, pattern, msg);
        return;
    }
    assert.fail(msg || 'expected a rejection');
}

async function uuidPassesThrough() {
    const uuid = 'a1b2c3d4-e5f6-4789-abcd-0123456789ab';
    assert.strictEqual(looksLikeUuid(uuid), true);
    assert.strictEqual(await resolveNodeUuid(uuid), uuid);
    // Sub-asset form must survive too.
    const sub = `${uuid}@f9941`;
    assert.strictEqual(await resolveNodeUuid(sub), sub);

    // Scene nodes report a compressed 22-char base64 UUID, not the dashed form.
    // Treating one as a node name made every uuid round-trip fail.
    const compressed = 'cb+IZEFoRLnIr4qCPyF+VK';
    assert.strictEqual(looksLikeUuid(compressed), true);
    assert.strictEqual(await resolveNodeUuid(compressed), compressed);
}

async function pathResolves() {
    assert.strictEqual(await resolveNodeUuid('Canvas/Panel/Button'), 'button-uuid');
    // A path that includes the scene root resolves to the same node.
    assert.strictEqual(await resolveNodeUuid('Scene/Canvas/Panel/Button'), 'button-uuid');
    // A deeper path disambiguates a name that appears twice.
    assert.strictEqual(await resolveNodeUuid('Footer/Button'), 'footer-button-uuid');
}

async function uniqueNameResolves() {
    assert.strictEqual(await resolveNodeUuid('Panel'), 'panel-uuid');
    assert.strictEqual(await resolveNodeUuid('Label'), 'label-uuid');
}

async function ambiguousNameErrorsWithCandidates() {
    // "Button" exists under both Panel and Footer.
    await rejects(
        () => resolveNodeUuid('Button'),
        /Ambiguous.*matches 2 nodes.*Canvas\/Panel\/Button.*Canvas\/Footer\/Button/s,
        'ambiguous name must list candidate paths'
    );
}

async function missingNodeErrors() {
    await rejects(() => resolveNodeUuid('Nope'), /No node found with name 'Nope'/);
    await rejects(() => resolveNodeUuid('Canvas/Nope'), /No node found with path/);
}

async function emptyRefErrors() {
    await rejects(() => resolveNodeUuid(''), /Node reference is required/);
    await rejects(() => resolveNodeUuid(null), /Node reference is required/);
}

async function optionalResolverSkipsEmpty() {
    assert.strictEqual(await resolveOptionalNodeUuid(undefined), undefined);
    assert.strictEqual(await resolveOptionalNodeUuid(null), undefined);
    assert.strictEqual(await resolveOptionalNodeUuid(''), undefined);
    assert.strictEqual(await resolveOptionalNodeUuid('Panel'), 'panel-uuid');
}

async function missingTreeErrors() {
    treeToReturn = null;
    await rejects(() => resolveNodeUuid('Panel'), /Is a scene open\?/);
    treeToReturn = TREE;
}

(async () => {
    await uuidPassesThrough();
    await pathResolves();
    await uniqueNameResolves();
    await ambiguousNameErrorsWithCandidates();
    await missingNodeErrors();
    await emptyRefErrors();
    await optionalResolverSkipsEmpty();
    await missingTreeErrors();
    console.log('node-resolver: all checks passed');
})().catch(err => {
    console.error('node-resolver FAILED:', err.message);
    process.exit(1);
});
