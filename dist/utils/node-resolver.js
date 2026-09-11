"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test__ = void 0;
exports.looksLikeUuid = looksLikeUuid;
exports.resolveNodeUuid = resolveNodeUuid;
exports.resolveOptionalNodeUuid = resolveOptionalNodeUuid;
exports.resolveNodeRefFields = resolveNodeRefFields;
const editor_request_1 = require("./editor-request");
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
function looksLikeUuid(ref) {
    const trimmed = ref.trim();
    return UUID_RE.test(trimmed) || COMPRESSED_UUID_RE.test(trimmed);
}
/**
 * Collect every node whose full path or name matches. Paths are built during the
 * walk — the objects returned by query-node-tree have no usable `parent` link, so
 * a path cannot be reconstructed afterwards.
 */
function collectMatches(root, ref, byPath) {
    const matches = [];
    const walk = (node, parentPath) => {
        const path = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (byPath) {
            // Match on a suffix of the path so both "Canvas/Panel/Button" and a
            // fully-qualified path that includes the scene root node resolve.
            if (path === ref || path.endsWith(`/${ref}`)) {
                matches.push({ uuid: node.uuid, path });
            }
        }
        else if (node.name === ref) {
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
async function resolveNodeUuid(ref) {
    if (typeof ref !== 'string' || !ref.trim()) {
        throw new Error('Node reference is required (UUID, path like "Canvas/Panel/Button", or node name)');
    }
    const trimmed = ref.trim();
    if (looksLikeUuid(trimmed)) {
        return trimmed;
    }
    const tree = await (0, editor_request_1.editorRequest)('scene', 'query-node-tree');
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
async function resolveOptionalNodeUuid(ref) {
    if (ref === undefined || ref === null || ref === '') {
        return undefined;
    }
    return resolveNodeUuid(ref);
}
/**
 * Resolve every node-reference field on an arguments object in place, so a tool
 * accepts a path or a name wherever it accepts a UUID.
 *
 * Returns an error response naming the offending field, or null when all fields
 * resolved. Call this once at dispatch rather than per code path — a tool that
 * skips it passes the caller's path straight to the editor, which does not
 * understand paths and typically fails with a bare null.
 */
async function resolveNodeRefFields(args, fields) {
    for (const field of fields) {
        const ref = args === null || args === void 0 ? void 0 : args[field];
        if (ref === undefined || ref === null || ref === '')
            continue;
        try {
            args[field] = await resolveNodeUuid(ref);
        }
        catch (err) {
            return { success: false, error: `${field}: ${err.message}` };
        }
    }
    return null;
}
// Exported for tests — resolving against an in-memory tree needs no editor.
exports.__test__ = { collectMatches };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS91dGlscy9ub2RlLXJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXlCQSxzQ0FHQztBQStDRCwwQ0E2QkM7QUFNRCwwREFLQztBQVdELG9EQVdDO0FBeklELHFEQUFpRDtBQUVqRDs7Ozs7Ozs7OztHQVVHO0FBRUgsb0ZBQW9GO0FBQ3BGLE1BQU0sT0FBTyxHQUFHLCtGQUErRixDQUFDO0FBRWhILDZFQUE2RTtBQUM3RSw4RUFBOEU7QUFDOUUsc0VBQXNFO0FBQ3RFLGlGQUFpRjtBQUNqRixnRkFBZ0Y7QUFDaEYsdUVBQXVFO0FBQ3ZFLE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLENBQUM7QUFFakQsU0FBZ0IsYUFBYSxDQUFDLEdBQVc7SUFDckMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckUsQ0FBQztBQWFEOzs7O0dBSUc7QUFDSCxTQUFTLGNBQWMsQ0FBQyxJQUFjLEVBQUUsR0FBVyxFQUFFLE1BQWU7SUFDaEUsTUFBTSxPQUFPLEdBQVksRUFBRSxDQUFDO0lBRTVCLE1BQU0sSUFBSSxHQUFHLENBQUMsSUFBYyxFQUFFLFVBQWtCLEVBQUUsRUFBRTtRQUNoRCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUVuRSxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1Qsb0VBQW9FO1lBQ3BFLGtFQUFrRTtZQUNsRSxJQUFJLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcs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SSxNQUFNLEVBQUUsQ0FBQztRQUN6QixNQUFNLEdBQUcsR0FBRyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUcsS0FBSyxDQUFDLENBQUM7UUFDMUIsSUFBSSxHQUFHLEtBQUssU0FBUyxJQUFJLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLEVBQUU7WUFBRSxTQUFTO1FBQzlELElBQUksQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QyxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7UUFDakUsQ0FBQztJQUNMLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsNEVBQTRFO0FBQy9ELFFBQUEsUUFBUSxHQUFHLEVBQUUsY0FBYyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi9lZGl0b3ItcmVxdWVzdCc7XG5cbi8qKlxuICogUmVzb2x2ZSBhIG5vZGUgcmVmZXJlbmNlIHRvIGEgVVVJRC5cbiAqXG4gKiBBY2NlcHRzIHRocmVlIGZvcm1zIHNvIGNhbGxlcnMgZG9uJ3QgaGF2ZSB0byBydW4gYSBsb29rdXAgdG9vbCBmaXJzdDpcbiAqICAgLSBhIFVVSUQgICAgICAgICAgICAtPiByZXR1cm5lZCBhcy1pcywgbm8gZWRpdG9yIHJvdW5kLXRyaXBcbiAqICAgLSBhIHBhdGggICAgICAgICAgICAtPiBcIkNhbnZhcy9QYW5lbC9CdXR0b25cIiwgbWF0Y2hlZCBzZWdtZW50IGJ5IHNlZ21lbnQgZnJvbSB0aGUgc2NlbmUgcm9vdFxuICogICAtIGEgYmFyZSBuYW1lICAgICAgIC0+IG1hdGNoZWQgYW55d2hlcmUgaW4gdGhlIHRyZWVcbiAqXG4gKiBBbiBhbWJpZ3VvdXMgbmFtZSBpcyBhbiBlcnJvciBsaXN0aW5nIHRoZSBjYW5kaWRhdGUgcGF0aHMgcmF0aGVyIHRoYW4gYSBndWVzcyxcbiAqIGJlY2F1c2UgcGlja2luZyB0aGUgd3Jvbmcgbm9kZSB3cml0ZXMgdG8gdGhlIHdyb25nIHBsYWNlIHNpbGVudGx5LlxuICovXG5cbi8vIEFzc2V0cyB1c2UgdGhlIGRhc2gtc2VwYXJhdGVkIGZvcm0sIG9wdGlvbmFsbHkgd2l0aCBhbiAnQHh4eHh4JyBzdWItYXNzZXQgc3VmZml4LlxuY29uc3QgVVVJRF9SRSA9IC9eWzAtOWEtZkEtRl17OH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17NH0tWzAtOWEtZkEtRl17MTJ9KEBbMC05YS1mQS1GXSspPyQvO1xuXG4vLyBTY2VuZSBub2RlcyByZXBvcnQgdGhlIGNvbXByZXNzZWQgZm9ybSBpbnN0ZWFkOiAyMiBiYXNlNjQgY2hhcmFjdGVycywgZS5nLlxuLy8gXCJjYitJWkVGb1JMbklyNHFDUHlGK1ZLXCIuIEV2ZXJ5IG5vZGUgVVVJRCBjb21pbmcgYmFjayBmcm9tIHRoZSBlZGl0b3IgbG9va3Ncbi8vIGxpa2UgdGhpcywgc28gaXQgbXVzdCByZXNvbHZlIGFzIGEgVVVJRCBvciBldmVyeSByb3VuZC10cmlwIGJyZWFrcy5cbi8vIHBvbnl0YWlsOiBhIDIyLWNoYXIgYWxwaGFudW1lcmljIG5vZGUgbmFtZSB3b3VsZCBiZSBtaXNyZWFkIGFzIGEgVVVJRCBhbmQgdGhlblxuLy8gZmFpbCB0byByZXNvbHZlLiBWZXJpZnlpbmcgZXhpc3RlbmNlIHdvdWxkIGNvc3QgYSB0cmVlIHdhbGsgb24gZXZlcnkgY2FsbDsgaWZcbi8vIHRoYXQgY29sbGlzaW9uIGV2ZXIgc2hvd3MgdXAsIGZhbGwgdGhyb3VnaCB0byBhIG5hbWUgbG9va3VwIGluc3RlYWQuXG5jb25zdCBDT01QUkVTU0VEX1VVSURfUkUgPSAvXlswLTlhLXpBLVorL117MjJ9JC87XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29rc0xpa2VVdWlkKHJlZjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdHJpbW1lZCA9IHJlZi50cmltKCk7XG4gICAgcmV0dXJuIFVVSURfUkUudGVzdCh0cmltbWVkKSB8fCBDT01QUkVTU0VEX1VVSURfUkUudGVzdCh0cmltbWVkKTtcbn1cblxuaW50ZXJmYWNlIFRyZWVOb2RlIHtcbiAgICB1dWlkOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGNoaWxkcmVuPzogVHJlZU5vZGVbXTtcbn1cblxuaW50ZXJmYWNlIE1hdGNoIHtcbiAgICB1dWlkOiBzdHJpbmc7XG4gICAgcGF0aDogc3RyaW5nO1xufVxuXG4vKipcbiAqIENvbGxlY3QgZXZlcnkgbm9kZSB3aG9zZSBmdWxsIHBhdGggb3IgbmFtZSBtYXRjaGVzLiBQYXRocyBhcmUgYnVpbHQgZHVyaW5nIHRoZVxuICogd2FsayDigJQgdGhlIG9iamVjdHMgcmV0dXJuZWQgYnkgcXVlcnktbm9kZS10cmVlIGhhdmUgbm8gdXNhYmxlIGBwYXJlbnRgIGxpbmssIHNvXG4gKiBhIHBhdGggY2Fubm90IGJlIHJlY29uc3RydWN0ZWQgYWZ0ZXJ3YXJkcy5cbiAqL1xuZnVuY3Rpb24gY29sbGVjdE1hdGNoZXMocm9vdDogVHJlZU5vZGUsIHJlZjogc3RyaW5nLCBieVBhdGg6IGJvb2xlYW4pOiBNYXRjaFtdIHtcbiAgICBjb25zdCBtYXRjaGVzOiBNYXRjaFtdID0gW107XG5cbiAgICBjb25zdCB3YWxrID0gKG5vZGU6IFRyZWVOb2RlLCBwYXJlbnRQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgcGF0aCA9IHBhcmVudFBhdGggPyBgJHtwYXJlbnRQYXRofS8ke25vZGUubmFtZX1gIDogbm9kZS5uYW1lO1xuXG4gICAgICAgIGlmIChieVBhdGgpIHtcbiAgICAgICAgICAgIC8vIE1hdGNoIG9uIGEgc3VmZml4IG9mIHRoZSBwYXRoIHNvIGJvdGggXCJDYW52YXMvUGFuZWwvQnV0dG9uXCIgYW5kIGFcbiAgICAgICAgICAgIC8vIGZ1bGx5LXF1YWxpZmllZCBwYXRoIHRoYXQgaW5jbHVkZXMgdGhlIHNjZW5lIHJvb3Qgbm9kZSByZXNvbHZlLlxuICAgICAgICAgICAgaWYgKHBhdGggPT09IHJlZiB8fCBwYXRoLmVuZHNXaXRoKGAvJHtyZWZ9YCkpIHtcbiAgICAgICAgICAgICAgICBtYXRjaGVzLnB1c2goeyB1dWlkOiBub2RlLnV1aWQsIHBhdGggfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5uYW1lID09PSByZWYpIHtcbiAgICAgICAgICAgIG1hdGNoZXMucHVzaCh7IHV1aWQ6IG5vZGUudXVpZCwgcGF0aCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbiB8fCBbXSkge1xuICAgICAgICAgICAgd2FsayhjaGlsZCwgcGF0aCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgd2Fsayhyb290LCAnJyk7XG4gICAgcmV0dXJuIG1hdGNoZXM7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIG5vZGUgcmVmZXJlbmNlIChVVUlELCBwYXRoLCBvciBuYW1lKSB0byBhIFVVSUQuXG4gKiBUaHJvd3Mgd2l0aCBhbiBhY3Rpb25hYmxlIG1lc3NhZ2Ugd2hlbiB0aGUgcmVmZXJlbmNlIGlzIG1pc3Npbmcgb3IgYW1iaWd1b3VzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU5vZGVVdWlkKHJlZjogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAodHlwZW9mIHJlZiAhPT0gJ3N0cmluZycgfHwgIXJlZi50cmltKCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb2RlIHJlZmVyZW5jZSBpcyByZXF1aXJlZCAoVVVJRCwgcGF0aCBsaWtlIFwiQ2FudmFzL1BhbmVsL0J1dHRvblwiLCBvciBub2RlIG5hbWUpJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJpbW1lZCA9IHJlZi50cmltKCk7XG4gICAgaWYgKGxvb2tzTGlrZVV1aWQodHJpbW1lZCkpIHtcbiAgICAgICAgcmV0dXJuIHRyaW1tZWQ7XG4gICAgfVxuXG4gICAgY29uc3QgdHJlZSA9IGF3YWl0IGVkaXRvclJlcXVlc3Q8VHJlZU5vZGU+KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcbiAgICBpZiAoIXRyZWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgcmVhZCB0aGUgc2NlbmUgbm9kZSB0cmVlLiBJcyBhIHNjZW5lIG9wZW4/Jyk7XG4gICAgfVxuXG4gICAgY29uc3QgYnlQYXRoID0gdHJpbW1lZC5pbmNsdWRlcygnLycpO1xuICAgIGNvbnN0IG1hdGNoZXMgPSBjb2xsZWN0TWF0Y2hlcyh0cmVlLCB0cmltbWVkLCBieVBhdGgpO1xuXG4gICAgaWYgKG1hdGNoZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnN0IGtpbmQgPSBieVBhdGggPyAncGF0aCcgOiAnbmFtZSc7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gbm9kZSBmb3VuZCB3aXRoICR7a2luZH0gJyR7dHJpbW1lZH0nLiBVc2Ugbm9kZV9xdWVyeSB0byBsaXN0IG5vZGVzLmApO1xuICAgIH1cblxuICAgIGlmIChtYXRjaGVzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IG1hdGNoZXMubWFwKG0gPT4gbS5wYXRoKS5qb2luKCcsICcpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFtYmlndW91cyBub2RlIHJlZmVyZW5jZSAnJHt0cmltbWVkfScgbWF0Y2hlcyAke21hdGNoZXMubGVuZ3RofSBub2RlczogJHtjYW5kaWRhdGVzfS4gVXNlIGEgZnVsbCBwYXRoIG9yIFVVSUQuYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoZXNbMF0udXVpZDtcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgcmVmZXJlbmNlIHRoYXQgbWF5IGJlIGFic2VudC4gUmV0dXJucyB1bmRlZmluZWQgZm9yIGVtcHR5IGlucHV0IHNvXG4gKiBvcHRpb25hbCBwYXJhbWV0ZXJzIHN0YXkgb3B0aW9uYWwuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlT3B0aW9uYWxOb2RlVXVpZChyZWY6IHN0cmluZyB8IHVuZGVmaW5lZCB8IG51bGwpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICAgIGlmIChyZWYgPT09IHVuZGVmaW5lZCB8fCByZWYgPT09IG51bGwgfHwgcmVmID09PSAnJykge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gcmVzb2x2ZU5vZGVVdWlkKHJlZik7XG59XG5cbi8qKlxuICogUmVzb2x2ZSBldmVyeSBub2RlLXJlZmVyZW5jZSBmaWVsZCBvbiBhbiBhcmd1bWVudHMgb2JqZWN0IGluIHBsYWNlLCBzbyBhIHRvb2xcbiAqIGFjY2VwdHMgYSBwYXRoIG9yIGEgbmFtZSB3aGVyZXZlciBpdCBhY2NlcHRzIGEgVVVJRC5cbiAqXG4gKiBSZXR1cm5zIGFuIGVycm9yIHJlc3BvbnNlIG5hbWluZyB0aGUgb2ZmZW5kaW5nIGZpZWxkLCBvciBudWxsIHdoZW4gYWxsIGZpZWxkc1xuICogcmVzb2x2ZWQuIENhbGwgdGhpcyBvbmNlIGF0IGRpc3BhdGNoIHJhdGhlciB0aGFuIHBlciBjb2RlIHBhdGgg4oCUIGEgdG9vbCB0aGF0XG4gKiBza2lwcyBpdCBwYXNzZXMgdGhlIGNhbGxlcidzIHBhdGggc3RyYWlnaHQgdG8gdGhlIGVkaXRvciwgd2hpY2ggZG9lcyBub3RcbiAqIHVuZGVyc3RhbmQgcGF0aHMgYW5kIHR5cGljYWxseSBmYWlscyB3aXRoIGEgYmFyZSBudWxsLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZU5vZGVSZWZGaWVsZHMoYXJnczogYW55LCBmaWVsZHM6IHN0cmluZ1tdKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGZhbHNlOyBlcnJvcjogc3RyaW5nIH0gfCBudWxsPiB7XG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgcmVmID0gYXJncz8uW2ZpZWxkXTtcbiAgICAgICAgaWYgKHJlZiA9PT0gdW5kZWZpbmVkIHx8IHJlZiA9PT0gbnVsbCB8fCByZWYgPT09ICcnKSBjb250aW51ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFyZ3NbZmllbGRdID0gYXdhaXQgcmVzb2x2ZU5vZGVVdWlkKHJlZik7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGAke2ZpZWxkfTogJHtlcnIubWVzc2FnZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG59XG5cbi8vIEV4cG9ydGVkIGZvciB0ZXN0cyDigJQgcmVzb2x2aW5nIGFnYWluc3QgYW4gaW4tbWVtb3J5IHRyZWUgbmVlZHMgbm8gZWRpdG9yLlxuZXhwb3J0IGNvbnN0IF9fdGVzdF9fID0geyBjb2xsZWN0TWF0Y2hlcyB9O1xuIl19