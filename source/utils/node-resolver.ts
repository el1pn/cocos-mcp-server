import { editorRequest } from './editor-request';

/**
 * Resolve a node reference to a UUID.
 *
 * Accepts three forms so callers don't have to run a lookup tool first:
 *   - a UUID            -> returned as-is, no editor round-trip
 *   - a path            -> "Canvas/Panel/Button", matched segment by segment from the scene root
 *   - a bare name       -> matched anywhere in the tree
 *
 * An ambiguous name is an error listing the candidate paths rather than a guess,
 * because picking the wrong node writes to the wrong place silently.
 */

// Assets use the dash-separated form, optionally with an '@xxxxx' sub-asset suffix.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(@[0-9a-fA-F]+)?$/;

// Scene nodes report the compressed form instead: 22 base64 characters, e.g.
// "cb+IZEFoRLnIr4qCPyF+VK". Every node UUID coming back from the editor looks
// like this, so it must resolve as a UUID or every round-trip breaks.
// ponytail: a 22-char alphanumeric node name would be misread as a UUID and then
// fail to resolve. Verifying existence would cost a tree walk on every call; if
// that collision ever shows up, fall through to a name lookup instead.
const COMPRESSED_UUID_RE = /^[0-9a-zA-Z+/]{22}$/;

export function looksLikeUuid(ref: string): boolean {
    const trimmed = ref.trim();
    return UUID_RE.test(trimmed) || COMPRESSED_UUID_RE.test(trimmed);
}

interface TreeNode {
    uuid: string;
    name: string;
    children?: TreeNode[];
}

interface Match {
    uuid: string;
    path: string;
}

/**
 * Collect every node whose full path or name matches. Paths are built during the
 * walk — the objects returned by query-node-tree have no usable `parent` link, so
 * a path cannot be reconstructed afterwards.
 */
function collectMatches(root: TreeNode, ref: string, byPath: boolean): Match[] {
    const matches: Match[] = [];

    const walk = (node: TreeNode, parentPath: string) => {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;

        if (byPath) {
            // Match on a suffix of the path so both "Canvas/Panel/Button" and a
            // fully-qualified path that includes the scene root node resolve.
            if (path === ref || path.endsWith(`/${ref}`)) {
                matches.push({ uuid: node.uuid, path });
            }
        } else if (node.name === ref) {
            matches.push({ uuid: node.uuid, path });
        }

        for (const child of node.children || []) {
            walk(child, path);
        }
    };

    walk(root, '');
    return matches;
}

/**
 * Resolve a node reference (UUID, path, or name) to a UUID.
 * Throws with an actionable message when the reference is missing or ambiguous.
 */
export async function resolveNodeUuid(ref: string): Promise<string> {
    if (typeof ref !== 'string' || !ref.trim()) {
        throw new Error('Node reference is required (UUID, path like "Canvas/Panel/Button", or node name)');
    }

    const trimmed = ref.trim();
    if (looksLikeUuid(trimmed)) {
        return trimmed;
    }

    const tree = await editorRequest<TreeNode>('scene', 'query-node-tree');
    if (!tree) {
        throw new Error('Could not read the scene node tree. Is a scene open?');
    }

    const byPath = trimmed.includes('/');
    const matches = collectMatches(tree, trimmed, byPath);

    if (matches.length === 0) {
        const kind = byPath ? 'path' : 'name';
        throw new Error(`No node found with ${kind} '${trimmed}'. Use node_query to list nodes.`);
    }

    if (matches.length > 1) {
        const candidates = matches.map(m => m.path).join(', ');
        throw new Error(`Ambiguous node reference '${trimmed}' matches ${matches.length} nodes: ${candidates}. Use a full path or UUID.`);
    }

    return matches[0].uuid;
}

/**
 * Resolve a reference that may be absent. Returns undefined for empty input so
 * optional parameters stay optional.
 */
export async function resolveOptionalNodeUuid(ref: string | undefined | null): Promise<string | undefined> {
    if (ref === undefined || ref === null || ref === '') {
        return undefined;
    }
    return resolveNodeUuid(ref);
}

// Exported for tests — resolving against an in-memory tree needs no editor.
export const __test__ = { collectMatches };
