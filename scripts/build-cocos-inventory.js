#!/usr/bin/env node
/**
 * Extract the Editor.Message contract from a Cocos Creator installation and
 * write it to scripts/cocos-messages.json for audit-messages.js to consume.
 *
 * Usage:
 *   node scripts/build-cocos-inventory.js <path-to-CocosCreator.app>
 *   # or set COCOS_APP env var
 *
 * Requires an extracted app.asar (uses @electron/asar via npx if needed).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

function findCocosApp() {
    const arg = process.argv[2];
    if (arg) return arg;
    if (process.env.COCOS_APP) return process.env.COCOS_APP;
    // macOS default guess
    const guesses = [
        '/Applications/Cocos/Creator/3.8.8/CocosCreator.app',
        '/Applications/CocosCreator.app'
    ];
    for (const g of guesses) if (fs.existsSync(g)) return g;
    throw new Error('Pass Cocos app path as arg or set COCOS_APP env var');
}

function unpackAsar(appPath) {
    const asar = path.join(appPath, 'Contents/Resources/app.asar');
    if (!fs.existsSync(asar)) throw new Error(`asar not found: ${asar}`);
    const tmp = path.join(os.tmpdir(), `cocos-asar-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    console.log(`Extracting asar to ${tmp} ...`);
    execFileSync('npx', ['@electron/asar', 'extract', asar, tmp], { stdio: 'inherit' });
    return tmp;
}

function collectInventory(extractedRoot) {
    const inventory = {};
    const searchDirs = [
        path.join(extractedRoot, 'builtin'),
        path.join(extractedRoot, 'modules/editor-extensions/extensions'),
        path.join(extractedRoot, 'extension'),
        path.join(extractedRoot, 'builtin/utils/modules')
    ];
    for (const base of searchDirs) {
        if (!fs.existsSync(base)) continue;
        for (const entry of fs.readdirSync(base)) {
            const pkgPath = path.join(base, entry, 'package.json');
            if (!fs.existsSync(pkgPath)) continue;
            let pkg;
            try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch { continue; }
            const msgs = pkg.contributions && pkg.contributions.messages;
            if (!msgs || !Object.keys(msgs).length) continue;
            const name = pkg.name || entry;
            inventory[name] = {};
            for (const [k, v] of Object.entries(msgs)) {
                inventory[name][k] = !!(v && v.public);
            }
        }
    }
    return inventory;
}

function main() {
    const appPath = findCocosApp();
    const root = unpackAsar(appPath);
    const inventory = collectInventory(root);
    const extCount = Object.keys(inventory).length;
    const msgCount = Object.values(inventory).reduce((n, m) => n + Object.keys(m).length, 0);

    const outPath = path.join(__dirname, 'cocos-messages.json');
    const payload = {
        cocosAppPath: appPath,
        generatedAt: new Date().toISOString(),
        extensions: inventory
    };
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n');
    console.log(`Wrote ${outPath}: ${extCount} extensions, ${msgCount} messages`);
}

main();
