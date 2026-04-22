#!/usr/bin/env node
/**
 * Lint every `Editor.Message.request('<ext>', '<msg>', ...)` call in source/
 * against the Cocos message inventory. Fails with exit code 1 if any call
 * targets a message that is not declared in scripts/cocos-messages.json.
 *
 * Regenerate the inventory by running scripts/build-cocos-inventory.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'source');
const INVENTORY = path.join(__dirname, 'cocos-messages.json');

// Extensions that are not Cocos built-ins — allow-list manually
const OWN_EXTENSIONS = new Set(['cocos-mcp-server']);

// Messages known to work but not declared in any extension package.json —
// e.g. Cocos built-in menu protocol. Add with justification.
const ALLOWED_UNDECLARED = new Set([
    'editor/execute-menu'
]);

function loadInventory() {
    if (!fs.existsSync(INVENTORY)) {
        console.error(`Missing ${INVENTORY}. Run: node scripts/build-cocos-inventory.js <cocos-app-path>`);
        process.exit(2);
    }
    return JSON.parse(fs.readFileSync(INVENTORY, 'utf8')).extensions;
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.isFile() && /\.ts$/.test(entry.name)) out.push(full);
    }
    return out;
}

// Match Editor.Message.request('ext', 'msg', ...) — only string literals.
const CALL_RE = /Editor\.Message\.(?:request|send|broadcast)\s*<[^>]*>?\s*\(\s*['"]([a-z][a-z0-9-]*)['"]\s*,\s*['"]([a-z][a-z0-9_:-]*)['"]/g;

function main() {
    const inventory = loadInventory();
    const files = walk(SRC);
    const problems = [];

    for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        // Strip to plain text to dodge `request<T>` generics noise
        let m;
        const re = /Editor\.Message\.(?:request|send|broadcast)[^(]*\(\s*['"]([a-z][a-z0-9-]*)['"]\s*,\s*['"]([a-zA-Z][a-zA-Z0-9:_-]*)['"]/g;
        while ((m = re.exec(text))) {
            const [, ext, msg] = m;
            if (OWN_EXTENSIONS.has(ext)) continue;
            if (ALLOWED_UNDECLARED.has(`${ext}/${msg}`)) continue;
            const rel = path.relative(ROOT, file);
            const line = text.slice(0, m.index).split('\n').length;

            if (!inventory[ext]) {
                problems.push({ kind: 'unknown-ext', ext, msg, file: rel, line });
                continue;
            }
            if (!(msg in inventory[ext])) {
                problems.push({ kind: 'missing-msg', ext, msg, file: rel, line });
            }
        }
    }

    if (!problems.length) {
        console.log('audit-messages: all Editor.Message calls reference declared messages');
        return;
    }

    console.error('audit-messages: problems found:\n');
    for (const p of problems) {
        const label = p.kind === 'unknown-ext' ? 'extension not declared' : 'message not declared';
        console.error(`  ${p.file}:${p.line}  ${p.ext} → ${p.msg}   (${label})`);
    }
    console.error(`\n${problems.length} problem(s). Fix the calls, or add the message to ALLOWED_UNDECLARED in scripts/audit-messages.js if it is a Cocos built-in protocol.`);
    process.exit(1);
}

main();
