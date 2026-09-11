"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchTools = void 0;
const editor_request_1 = require("../utils/editor-request");
const node_resolver_1 = require("../utils/node-resolver");
class BatchTools {
    constructor(executorFn) {
        this.executorFn = executorFn;
    }
    getTools() {
        return [
            {
                name: 'batch_execute',
                description: 'Execute multiple tool operations sequentially in a single call. ' +
                    'Reduces round-trips between AI and server. Each operation specifies a tool name and its parameters. ' +
                    'Operations run in order; use stopOnError to abort on first failure. Maximum 20 operations per batch.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        operations: {
                            type: 'array',
                            description: 'Array of operations to execute sequentially',
                            items: {
                                type: 'object',
                                properties: {
                                    tool: {
                                        type: 'string',
                                        description: 'Tool name to call (e.g. "node_lifecycle", "scene_management")'
                                    },
                                    args: {
                                        type: 'object',
                                        description: 'Arguments to pass to the tool (including "action" parameter)'
                                    }
                                },
                                required: ['tool', 'args']
                            }
                        },
                        stopOnError: {
                            type: 'boolean',
                            description: 'If true, stop executing remaining operations on first error (default: false)',
                            default: false
                        },
                        rollbackOnError: {
                            type: 'boolean',
                            description: 'If true, restore the transform/active state of affected nodes when an operation fails. Implies stopOnError. Cannot undo node creation/deletion, component changes, or asset writes (default: false)',
                            default: false
                        }
                    },
                    required: ['operations']
                }
            }
        ];
    }
    async execute(_toolName, args) {
        var _a, _b;
        const operations = args.operations;
        const rollbackOnError = (_a = args.rollbackOnError) !== null && _a !== void 0 ? _a : false;
        // Rolling back only makes sense if execution stops at the failure — continuing
        // past it would keep mutating nodes the snapshot no longer describes.
        const stopOnError = ((_b = args.stopOnError) !== null && _b !== void 0 ? _b : false) || rollbackOnError;
        if (!Array.isArray(operations) || operations.length === 0) {
            return { success: false, error: 'operations must be a non-empty array' };
        }
        if (operations.length > BatchTools.MAX_OPERATIONS) {
            return {
                success: false,
                error: `Too many operations (${operations.length}). Maximum is ${BatchTools.MAX_OPERATIONS}.`
            };
        }
        const results = [];
        let hasError = false;
        let snapshot = null;
        let snapshotError;
        if (rollbackOnError) {
            const taken = await this.takeSnapshot(operations);
            snapshot = taken.snapshot;
            snapshotError = taken.error;
            if (snapshotError) {
                return {
                    success: false,
                    error: `Could not snapshot nodes for rollback: ${snapshotError}`,
                    instruction: 'Retry without rollbackOnError to run the batch unprotected.'
                };
            }
        }
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            try {
                const result = await this.executorFn(op.tool, op.args);
                // Tools signal failure by returning { success: false } rather than throwing
                // (that maps to MCP `isError`), so a returned failure must count as an error
                // here too — otherwise stopOnError never fires and the batch reports success.
                if (result && result.success === false) {
                    hasError = true;
                    results.push({ tool: op.tool, result, error: result.error || 'Tool reported failure' });
                    if (stopOnError) {
                        break;
                    }
                    continue;
                }
                results.push({ tool: op.tool, result });
            }
            catch (err) {
                hasError = true;
                results.push({ tool: op.tool, error: err.message || String(err) });
                if (stopOnError) {
                    break;
                }
            }
        }
        let rollback;
        if (hasError && rollbackOnError && snapshot) {
            rollback = await this.restoreSnapshot(snapshot);
        }
        return {
            success: !hasError,
            data: {
                results,
                completed: results.length,
                total: operations.length,
                stoppedEarly: stopOnError && hasError,
                rollback
            },
            message: hasError
                ? `Batch completed with errors: ${results.filter(r => r.error).length}/${results.length} failed${rollback ? `; rollback restored ${rollback.restored} node(s)${rollback.unprotected ? `, but ${rollback.unprotected.length} operation(s) could not be undone` : ''}` : ''}`
                : `Batch completed successfully: ${results.length} operations`
        };
    }
    /**
     * Collect node references from the operations' args and snapshot their state.
     * Only node-addressing fields are considered; a batch that touches no node
     * snapshots nothing and rollback becomes a no-op.
     */
    async takeSnapshot(operations) {
        var _a, _b;
        const NODE_FIELDS = ['uuid', 'nodeUuid', 'parentUuid', 'newParentUuid'];
        const refs = new Set();
        // A snapshot restores the state of nodes that already exist. It cannot undo
        // a node being created or deleted, nor any asset write. Record which
        // operations fall outside it so the rollback result says so instead of
        // reporting a clean "succeeded" over changes that are still there.
        const unprotected = [];
        for (const op of operations) {
            const action = (_a = op.args) === null || _a === void 0 ? void 0 : _a.action;
            if (op.tool === 'node_lifecycle' && (action === 'create' || action === 'delete' || action === 'duplicate')) {
                unprotected.push(`${op.tool}.${action}`);
            }
            else if (op.tool.startsWith('asset_') || op.tool === 'prefab_lifecycle') {
                unprotected.push(`${op.tool}.${action}`);
            }
            for (const field of NODE_FIELDS) {
                const value = (_b = op.args) === null || _b === void 0 ? void 0 : _b[field];
                if (typeof value === 'string' && value)
                    refs.add(value);
            }
        }
        if (refs.size === 0) {
            return { snapshot: { nodes: [], unprotected } };
        }
        const uuids = [];
        for (const ref of refs) {
            try {
                uuids.push(await (0, node_resolver_1.resolveNodeUuid)(ref));
            }
            catch (_c) {
                // A reference that doesn't resolve yet (e.g. a node this batch will
                // create) simply has no prior state to restore.
            }
        }
        try {
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'snapshotNodes',
                args: [uuids]
            });
            if (!(result === null || result === void 0 ? void 0 : result.success)) {
                return { error: (result === null || result === void 0 ? void 0 : result.error) || 'snapshotNodes failed' };
            }
            return { snapshot: Object.assign(Object.assign({}, result.data), { unprotected }) };
        }
        catch (err) {
            return { error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
    async restoreSnapshot(snapshot) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const result = await (0, editor_request_1.editorRequest)('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'restoreNodes',
                args: [snapshot]
            });
            const unprotected = (_a = snapshot === null || snapshot === void 0 ? void 0 : snapshot.unprotected) !== null && _a !== void 0 ? _a : [];
            return Object.assign({ attempted: true, succeeded: !!(result === null || result === void 0 ? void 0 : result.success), restored: (_d = (_c = (_b = result === null || result === void 0 ? void 0 : result.data) === null || _b === void 0 ? void 0 : _b.restored) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0, missing: (_f = (_e = result === null || result === void 0 ? void 0 : result.data) === null || _e === void 0 ? void 0 : _e.missing) !== null && _f !== void 0 ? _f : [], error: result === null || result === void 0 ? void 0 : result.error }, (unprotected.length ? {
                unprotected,
                warning: `Rollback restored node state only. These operations are outside a snapshot and were NOT undone: ${unprotected.join(', ')}. Undo them manually.`
            } : {}));
        }
        catch (err) {
            return { attempted: true, succeeded: false, restored: 0, error: (err === null || err === void 0 ? void 0 : err.message) || String(err) };
        }
    }
}
exports.BatchTools = BatchTools;
BatchTools.MAX_OPERATIONS = 20;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYmF0Y2gtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsNERBQXdEO0FBQ3hELDBEQUF5RDtBQUV6RCxNQUFhLFVBQVU7SUFLbkIsWUFBWSxVQUF5RDtRQUNqRSxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsZUFBZTtnQkFDckIsV0FBVyxFQUNQLGtFQUFrRTtvQkFDbEUsc0dBQXNHO29CQUN0RyxzR0FBc0c7Z0JBQzFHLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxPQUFPOzRCQUNiLFdBQVcsRUFBRSw2Q0FBNkM7NEJBQzFELEtBQUssRUFBRTtnQ0FDSCxJQUFJLEVBQUUsUUFBUTtnQ0FDZCxVQUFVLEVBQUU7b0NBQ1IsSUFBSSxFQUFFO3dDQUNGLElBQUksRUFBRSxRQUFRO3dDQUNkLFdBQVcsRUFBRSwrREFBK0Q7cUNBQy9FO29DQUNELElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUsOERBQThEO3FDQUM5RTtpQ0FDSjtnQ0FDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDOzZCQUM3Qjt5QkFDSjt3QkFDRCxXQUFXLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFNBQVM7NEJBQ2YsV0FBVyxFQUFFLDhFQUE4RTs0QkFDM0YsT0FBTyxFQUFFLEtBQUs7eUJBQ2pCO3dCQUNELGVBQWUsRUFBRTs0QkFDYixJQUFJLEVBQUUsU0FBUzs0QkFDZixXQUFXLEVBQUUscU1BQXFNOzRCQUNsTixPQUFPLEVBQUUsS0FBSzt5QkFDakI7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsWUFB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QUcsQ0FBQyxFQUFFLENBQUM7UUFDbEcsQ0FBQztJQUNMLENBQUM7O0FBeE5MLGdDQXlOQztBQXhOMkIseUJBQWMsR0FBRyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBlZGl0b3JSZXF1ZXN0IH0gZnJvbSAnLi4vdXRpbHMvZWRpdG9yLXJlcXVlc3QnO1xuaW1wb3J0IHsgcmVzb2x2ZU5vZGVVdWlkIH0gZnJvbSAnLi4vdXRpbHMvbm9kZS1yZXNvbHZlcic7XG5cbmV4cG9ydCBjbGFzcyBCYXRjaFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSBNQVhfT1BFUkFUSU9OUyA9IDIwO1xuXG4gICAgcHJpdmF0ZSBleGVjdXRvckZuOiAodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KSA9PiBQcm9taXNlPGFueT47XG5cbiAgICBjb25zdHJ1Y3RvcihleGVjdXRvckZuOiAodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KSA9PiBQcm9taXNlPGFueT4pIHtcbiAgICAgICAgdGhpcy5leGVjdXRvckZuID0gZXhlY3V0b3JGbjtcbiAgICB9XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfZXhlY3V0ZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdFeGVjdXRlIG11bHRpcGxlIHRvb2wgb3BlcmF0aW9ucyBzZXF1ZW50aWFsbHkgaW4gYSBzaW5nbGUgY2FsbC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdSZWR1Y2VzIHJvdW5kLXRyaXBzIGJldHdlZW4gQUkgYW5kIHNlcnZlci4gRWFjaCBvcGVyYXRpb24gc3BlY2lmaWVzIGEgdG9vbCBuYW1lIGFuZCBpdHMgcGFyYW1ldGVycy4gJyArXG4gICAgICAgICAgICAgICAgICAgICdPcGVyYXRpb25zIHJ1biBpbiBvcmRlcjsgdXNlIHN0b3BPbkVycm9yIHRvIGFib3J0IG9uIGZpcnN0IGZhaWx1cmUuIE1heGltdW0gMjAgb3BlcmF0aW9ucyBwZXIgYmF0Y2guJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcnJheSBvZiBvcGVyYXRpb25zIHRvIGV4ZWN1dGUgc2VxdWVudGlhbGx5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVG9vbCBuYW1lIHRvIGNhbGwgKGUuZy4gXCJub2RlX2xpZmVjeWNsZVwiLCBcInNjZW5lX21hbmFnZW1lbnRcIiknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIHRvb2wgKGluY2x1ZGluZyBcImFjdGlvblwiIHBhcmFtZXRlciknXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Rvb2wnLCAnYXJncyddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BPbkVycm9yOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSWYgdHJ1ZSwgc3RvcCBleGVjdXRpbmcgcmVtYWluaW5nIG9wZXJhdGlvbnMgb24gZmlyc3QgZXJyb3IgKGRlZmF1bHQ6IGZhbHNlKScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICByb2xsYmFja09uRXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCByZXN0b3JlIHRoZSB0cmFuc2Zvcm0vYWN0aXZlIHN0YXRlIG9mIGFmZmVjdGVkIG5vZGVzIHdoZW4gYW4gb3BlcmF0aW9uIGZhaWxzLiBJbXBsaWVzIHN0b3BPbkVycm9yLiBDYW5ub3QgdW5kbyBub2RlIGNyZWF0aW9uL2RlbGV0aW9uLCBjb21wb25lbnQgY2hhbmdlcywgb3IgYXNzZXQgd3JpdGVzIChkZWZhdWx0OiBmYWxzZSknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ29wZXJhdGlvbnMnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBvcGVyYXRpb25zOiBBcnJheTx7IHRvb2w6IHN0cmluZzsgYXJnczogYW55IH0+ID0gYXJncy5vcGVyYXRpb25zO1xuICAgICAgICBjb25zdCByb2xsYmFja09uRXJyb3I6IGJvb2xlYW4gPSBhcmdzLnJvbGxiYWNrT25FcnJvciA/PyBmYWxzZTtcbiAgICAgICAgLy8gUm9sbGluZyBiYWNrIG9ubHkgbWFrZXMgc2Vuc2UgaWYgZXhlY3V0aW9uIHN0b3BzIGF0IHRoZSBmYWlsdXJlIOKAlCBjb250aW51aW5nXG4gICAgICAgIC8vIHBhc3QgaXQgd291bGQga2VlcCBtdXRhdGluZyBub2RlcyB0aGUgc25hcHNob3Qgbm8gbG9uZ2VyIGRlc2NyaWJlcy5cbiAgICAgICAgY29uc3Qgc3RvcE9uRXJyb3I6IGJvb2xlYW4gPSAoYXJncy5zdG9wT25FcnJvciA/PyBmYWxzZSkgfHwgcm9sbGJhY2tPbkVycm9yO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvcGVyYXRpb25zKSB8fCBvcGVyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnb3BlcmF0aW9ucyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbnMubGVuZ3RoID4gQmF0Y2hUb29scy5NQVhfT1BFUkFUSU9OUykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYFRvbyBtYW55IG9wZXJhdGlvbnMgKCR7b3BlcmF0aW9ucy5sZW5ndGh9KS4gTWF4aW11bSBpcyAke0JhdGNoVG9vbHMuTUFYX09QRVJBVElPTlN9LmBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHRzOiBBcnJheTx7IHRvb2w6IHN0cmluZzsgcmVzdWx0PzogYW55OyBlcnJvcj86IHN0cmluZyB9PiA9IFtdO1xuICAgICAgICBsZXQgaGFzRXJyb3IgPSBmYWxzZTtcblxuICAgICAgICBsZXQgc25hcHNob3Q6IGFueSA9IG51bGw7XG4gICAgICAgIGxldCBzbmFwc2hvdEVycm9yOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChyb2xsYmFja09uRXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnN0IHRha2VuID0gYXdhaXQgdGhpcy50YWtlU25hcHNob3Qob3BlcmF0aW9ucyk7XG4gICAgICAgICAgICBzbmFwc2hvdCA9IHRha2VuLnNuYXBzaG90O1xuICAgICAgICAgICAgc25hcHNob3RFcnJvciA9IHRha2VuLmVycm9yO1xuICAgICAgICAgICAgaWYgKHNuYXBzaG90RXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBDb3VsZCBub3Qgc25hcHNob3Qgbm9kZXMgZm9yIHJvbGxiYWNrOiAke3NuYXBzaG90RXJyb3J9YCxcbiAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246ICdSZXRyeSB3aXRob3V0IHJvbGxiYWNrT25FcnJvciB0byBydW4gdGhlIGJhdGNoIHVucHJvdGVjdGVkLidcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcGVyYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBvcCA9IG9wZXJhdGlvbnNbaV07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0b3JGbihvcC50b29sLCBvcC5hcmdzKTtcbiAgICAgICAgICAgICAgICAvLyBUb29scyBzaWduYWwgZmFpbHVyZSBieSByZXR1cm5pbmcgeyBzdWNjZXNzOiBmYWxzZSB9IHJhdGhlciB0aGFuIHRocm93aW5nXG4gICAgICAgICAgICAgICAgLy8gKHRoYXQgbWFwcyB0byBNQ1AgYGlzRXJyb3JgKSwgc28gYSByZXR1cm5lZCBmYWlsdXJlIG11c3QgY291bnQgYXMgYW4gZXJyb3JcbiAgICAgICAgICAgICAgICAvLyBoZXJlIHRvbyDigJQgb3RoZXJ3aXNlIHN0b3BPbkVycm9yIG5ldmVyIGZpcmVzIGFuZCB0aGUgYmF0Y2ggcmVwb3J0cyBzdWNjZXNzLlxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGhhc0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgdG9vbDogb3AudG9vbCwgcmVzdWx0LCBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICdUb29sIHJlcG9ydGVkIGZhaWx1cmUnIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcE9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB0b29sOiBvcC50b29sLCByZXN1bHQgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIGhhc0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB0b29sOiBvcC50b29sLCBlcnJvcjogZXJyLm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0b3BPbkVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGxldCByb2xsYmFjazogYW55O1xuICAgICAgICBpZiAoaGFzRXJyb3IgJiYgcm9sbGJhY2tPbkVycm9yICYmIHNuYXBzaG90KSB7XG4gICAgICAgICAgICByb2xsYmFjayA9IGF3YWl0IHRoaXMucmVzdG9yZVNuYXBzaG90KHNuYXBzaG90KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiAhaGFzRXJyb3IsXG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyxcbiAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHJlc3VsdHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHRvdGFsOiBvcGVyYXRpb25zLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBzdG9wcGVkRWFybHk6IHN0b3BPbkVycm9yICYmIGhhc0Vycm9yLFxuICAgICAgICAgICAgICAgIHJvbGxiYWNrXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWVzc2FnZTogaGFzRXJyb3JcbiAgICAgICAgICAgICAgICA/IGBCYXRjaCBjb21wbGV0ZWQgd2l0aCBlcnJvcnM6ICR7cmVzdWx0cy5maWx0ZXIociA9PiByLmVycm9yKS5sZW5ndGh9LyR7cmVzdWx0cy5sZW5ndGh9IGZhaWxlZCR7cm9sbGJhY2sgPyBgOyByb2xsYmFjayByZXN0b3JlZCAke3JvbGxiYWNrLnJlc3RvcmVkfSBub2RlKHMpJHtyb2xsYmFjay51bnByb3RlY3RlZCA/IGAsIGJ1dCAke3JvbGxiYWNrLnVucHJvdGVjdGVkLmxlbmd0aH0gb3BlcmF0aW9uKHMpIGNvdWxkIG5vdCBiZSB1bmRvbmVgIDogJyd9YCA6ICcnfWBcbiAgICAgICAgICAgICAgICA6IGBCYXRjaCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5OiAke3Jlc3VsdHMubGVuZ3RofSBvcGVyYXRpb25zYFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENvbGxlY3Qgbm9kZSByZWZlcmVuY2VzIGZyb20gdGhlIG9wZXJhdGlvbnMnIGFyZ3MgYW5kIHNuYXBzaG90IHRoZWlyIHN0YXRlLlxuICAgICAqIE9ubHkgbm9kZS1hZGRyZXNzaW5nIGZpZWxkcyBhcmUgY29uc2lkZXJlZDsgYSBiYXRjaCB0aGF0IHRvdWNoZXMgbm8gbm9kZVxuICAgICAqIHNuYXBzaG90cyBub3RoaW5nIGFuZCByb2xsYmFjayBiZWNvbWVzIGEgbm8tb3AuXG4gICAgICovXG4gICAgcHJpdmF0ZSBhc3luYyB0YWtlU25hcHNob3Qob3BlcmF0aW9uczogQXJyYXk8eyB0b29sOiBzdHJpbmc7IGFyZ3M6IGFueSB9Pik6IFByb21pc2U8eyBzbmFwc2hvdD86IGFueTsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgICAgICBjb25zdCBOT0RFX0ZJRUxEUyA9IFsndXVpZCcsICdub2RlVXVpZCcsICdwYXJlbnRVdWlkJywgJ25ld1BhcmVudFV1aWQnXTtcbiAgICAgICAgY29uc3QgcmVmcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgICAvLyBBIHNuYXBzaG90IHJlc3RvcmVzIHRoZSBzdGF0ZSBvZiBub2RlcyB0aGF0IGFscmVhZHkgZXhpc3QuIEl0IGNhbm5vdCB1bmRvXG4gICAgICAgIC8vIGEgbm9kZSBiZWluZyBjcmVhdGVkIG9yIGRlbGV0ZWQsIG5vciBhbnkgYXNzZXQgd3JpdGUuIFJlY29yZCB3aGljaFxuICAgICAgICAvLyBvcGVyYXRpb25zIGZhbGwgb3V0c2lkZSBpdCBzbyB0aGUgcm9sbGJhY2sgcmVzdWx0IHNheXMgc28gaW5zdGVhZCBvZlxuICAgICAgICAvLyByZXBvcnRpbmcgYSBjbGVhbiBcInN1Y2NlZWRlZFwiIG92ZXIgY2hhbmdlcyB0aGF0IGFyZSBzdGlsbCB0aGVyZS5cbiAgICAgICAgY29uc3QgdW5wcm90ZWN0ZWQ6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgZm9yIChjb25zdCBvcCBvZiBvcGVyYXRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBhY3Rpb24gPSBvcC5hcmdzPy5hY3Rpb247XG4gICAgICAgICAgICBpZiAob3AudG9vbCA9PT0gJ25vZGVfbGlmZWN5Y2xlJyAmJiAoYWN0aW9uID09PSAnY3JlYXRlJyB8fCBhY3Rpb24gPT09ICdkZWxldGUnIHx8IGFjdGlvbiA9PT0gJ2R1cGxpY2F0ZScpKSB7XG4gICAgICAgICAgICAgICAgdW5wcm90ZWN0ZWQucHVzaChgJHtvcC50b29sfS4ke2FjdGlvbn1gKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAob3AudG9vbC5zdGFydHNXaXRoKCdhc3NldF8nKSB8fCBvcC50b29sID09PSAncHJlZmFiX2xpZmVjeWNsZScpIHtcbiAgICAgICAgICAgICAgICB1bnByb3RlY3RlZC5wdXNoKGAke29wLnRvb2x9LiR7YWN0aW9ufWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBmaWVsZCBvZiBOT0RFX0ZJRUxEUykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3AuYXJncz8uW2ZpZWxkXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZSkgcmVmcy5hZGQodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlZnMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc25hcHNob3Q6IHsgbm9kZXM6IFtdLCB1bnByb3RlY3RlZCB9IH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1dWlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCByZWYgb2YgcmVmcykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB1dWlkcy5wdXNoKGF3YWl0IHJlc29sdmVOb2RlVXVpZChyZWYpKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIEEgcmVmZXJlbmNlIHRoYXQgZG9lc24ndCByZXNvbHZlIHlldCAoZS5nLiBhIG5vZGUgdGhpcyBiYXRjaCB3aWxsXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlKSBzaW1wbHkgaGFzIG5vIHByaW9yIHN0YXRlIHRvIHJlc3RvcmUuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBlZGl0b3JSZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29jb3MtbWNwLXNlcnZlcicsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnc25hcHNob3ROb2RlcycsXG4gICAgICAgICAgICAgICAgYXJnczogW3V1aWRzXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXJlc3VsdD8uc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IGVycm9yOiByZXN1bHQ/LmVycm9yIHx8ICdzbmFwc2hvdE5vZGVzIGZhaWxlZCcgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7IHNuYXBzaG90OiB7IC4uLnJlc3VsdC5kYXRhLCB1bnByb3RlY3RlZCB9IH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmVTbmFwc2hvdChzbmFwc2hvdDogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgZWRpdG9yUmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Jlc3RvcmVOb2RlcycsXG4gICAgICAgICAgICAgICAgYXJnczogW3NuYXBzaG90XVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBjb25zdCB1bnByb3RlY3RlZDogc3RyaW5nW10gPSBzbmFwc2hvdD8udW5wcm90ZWN0ZWQgPz8gW107XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGF0dGVtcHRlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzdWNjZWVkZWQ6ICEhcmVzdWx0Py5zdWNjZXNzLFxuICAgICAgICAgICAgICAgIHJlc3RvcmVkOiByZXN1bHQ/LmRhdGE/LnJlc3RvcmVkPy5sZW5ndGggPz8gMCxcbiAgICAgICAgICAgICAgICBtaXNzaW5nOiByZXN1bHQ/LmRhdGE/Lm1pc3NpbmcgPz8gW10sXG4gICAgICAgICAgICAgICAgZXJyb3I6IHJlc3VsdD8uZXJyb3IsXG4gICAgICAgICAgICAgICAgLy8gTmFtaW5nIHRoZW0gYmVhdHMgYSBzaWxlbnQgcGFydGlhbCByb2xsYmFjazogdGhlIGNhbGxlciBoYXMgdG9cbiAgICAgICAgICAgICAgICAvLyB1bmRvIHRoZXNlIGJ5IGhhbmQsIGFuZCBcInN1Y2NlZWRlZDogdHJ1ZVwiIGFsb25lIHJlYWRzIGFzIGRvbmUuXG4gICAgICAgICAgICAgICAgLi4uKHVucHJvdGVjdGVkLmxlbmd0aCA/IHtcbiAgICAgICAgICAgICAgICAgICAgdW5wcm90ZWN0ZWQsXG4gICAgICAgICAgICAgICAgICAgIHdhcm5pbmc6IGBSb2xsYmFjayByZXN0b3JlZCBub2RlIHN0YXRlIG9ubHkuIFRoZXNlIG9wZXJhdGlvbnMgYXJlIG91dHNpZGUgYSBzbmFwc2hvdCBhbmQgd2VyZSBOT1QgdW5kb25lOiAke3VucHJvdGVjdGVkLmpvaW4oJywgJyl9LiBVbmRvIHRoZW0gbWFudWFsbHkuYFxuICAgICAgICAgICAgICAgIH0gOiB7fSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBhdHRlbXB0ZWQ6IHRydWUsIHN1Y2NlZWRlZDogZmFsc2UsIHJlc3RvcmVkOiAwLCBlcnJvcjogZXJyPy5tZXNzYWdlIHx8IFN0cmluZyhlcnIpIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=