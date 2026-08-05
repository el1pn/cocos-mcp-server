// Self-check for MCP protocol-compliance fixes (ping / isError / capabilities).
// No test framework: run with `node source/test/protocol-compliance.check.js` after `npm run build`.
// Verifies the compiled handler contains the spec-required branches.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '../../dist/mcp-server.js');
const src = fs.readFileSync(dist, 'utf8');

const checks = [
    ['ping returns empty result', /case ['"]ping['"]:/],
    // tsc lowers `?.` to a `void 0` ternary; match the stable parts only.
    ['isError set from tool success', /isError:.*toolResultText.*success.*===\s*false/s],
    ['tools capability declares listChanged', /tools:\s*\{\s*listChanged:\s*false\s*\}/],
    ['resources capability declares subscribe/listChanged', /resources:\s*\{\s*subscribe:\s*false,\s*listChanged:\s*false\s*\}/],
];

let failed = 0;
for (const [name, re] of checks) {
    const pass = re.test(src);
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
    if (!pass) failed++;
}

if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
}
console.log('\nAll protocol-compliance checks passed');
