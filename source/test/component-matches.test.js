/**
 * componentMatches must accept the class name, the cid, or the class-name suffix
 * of the instance name: set_component_property resolves by cid while its
 * verification re-reads via componentMatches, so a mismatch reports changeVerified=false.
 *
 * Run after `npm run build`:
 *   node source/test/component-matches.test.js
 */
const assert = require('assert');
const { ComponentTools } = require('../../dist/tools/component-tools.js');

const match = ComponentTools.componentMatches;
// query-node dump shape: type is the class name, cid the compressed uuid.
const comp = { type: 'Chess.I18n.Label', cid: '1f131qqx3JFOJgXGw2Bo2q0', value: { name: { value: 'Label<Chess.I18n.Label>' } } };

assert.ok(match(comp, 'Chess.I18n.Label'), 'class name');
assert.ok(match(comp, '1f131qqx3JFOJgXGw2Bo2q0'), 'cid');
assert.ok(match({ value: { name: { value: 'Label<Chess.I18n.Label>' } } }, 'Chess.I18n.Label'), 'instance-name suffix');
assert.ok(!match(comp, 'cc.Label'), 'different type');
assert.ok(!match(comp, undefined), 'missing type');

console.log('component-matches: ok');
