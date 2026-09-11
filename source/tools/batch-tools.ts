import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { editorRequest } from '../utils/editor-request';
import { resolveNodeUuid } from '../utils/node-resolver';

export class BatchTools implements ToolExecutor {
    private static readonly MAX_OPERATIONS = 20;

    private executorFn: (toolName: string, args: any) => Promise<any>;

    constructor(executorFn: (toolName: string, args: any) => Promise<any>) {
        this.executorFn = executorFn;
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'batch_execute',
                description:
                    'Execute multiple tool operations sequentially in a single call. ' +
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

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        const operations: Array<{ tool: string; args: any }> = args.operations;
        const rollbackOnError: boolean = args.rollbackOnError ?? false;
        // Rolling back only makes sense if execution stops at the failure — continuing
        // past it would keep mutating nodes the snapshot no longer describes.
        const stopOnError: boolean = (args.stopOnError ?? false) || rollbackOnError;

        if (!Array.isArray(operations) || operations.length === 0) {
            return { success: false, error: 'operations must be a non-empty array' };
        }

        if (operations.length > BatchTools.MAX_OPERATIONS) {
            return {
                success: false,
                error: `Too many operations (${operations.length}). Maximum is ${BatchTools.MAX_OPERATIONS}.`
            };
        }

        const results: Array<{ tool: string; result?: any; error?: string }> = [];
        let hasError = false;

        let snapshot: any = null;
        let snapshotError: string | undefined;
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
            } catch (err: any) {
                hasError = true;
                results.push({ tool: op.tool, error: err.message || String(err) });
                if (stopOnError) {
                    break;
                }
            }
        }

        let rollback: any;
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
    private async takeSnapshot(operations: Array<{ tool: string; args: any }>): Promise<{ snapshot?: any; error?: string }> {
        const NODE_FIELDS = ['uuid', 'nodeUuid', 'parentUuid', 'newParentUuid'];
        const refs = new Set<string>();
        // A snapshot restores the state of nodes that already exist. It cannot undo
        // a node being created or deleted, nor any asset write. Record which
        // operations fall outside it so the rollback result says so instead of
        // reporting a clean "succeeded" over changes that are still there.
        const unprotected: string[] = [];

        for (const op of operations) {
            const action = op.args?.action;
            if (op.tool === 'node_lifecycle' && (action === 'create' || action === 'delete' || action === 'duplicate')) {
                unprotected.push(`${op.tool}.${action}`);
            } else if (op.tool.startsWith('asset_') || op.tool === 'prefab_lifecycle') {
                unprotected.push(`${op.tool}.${action}`);
            }
            for (const field of NODE_FIELDS) {
                const value = op.args?.[field];
                if (typeof value === 'string' && value) refs.add(value);
            }
        }

        if (refs.size === 0) {
            return { snapshot: { nodes: [], unprotected } };
        }

        const uuids: string[] = [];
        for (const ref of refs) {
            try {
                uuids.push(await resolveNodeUuid(ref));
            } catch {
                // A reference that doesn't resolve yet (e.g. a node this batch will
                // create) simply has no prior state to restore.
            }
        }

        try {
            const result: any = await editorRequest('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'snapshotNodes',
                args: [uuids]
            });
            if (!result?.success) {
                return { error: result?.error || 'snapshotNodes failed' };
            }
            return { snapshot: { ...result.data, unprotected } };
        } catch (err: any) {
            return { error: err?.message || String(err) };
        }
    }

    private async restoreSnapshot(snapshot: any): Promise<any> {
        try {
            const result: any = await editorRequest('scene', 'execute-scene-script', {
                name: 'cocos-mcp-server',
                method: 'restoreNodes',
                args: [snapshot]
            });
            const unprotected: string[] = snapshot?.unprotected ?? [];
            return {
                attempted: true,
                succeeded: !!result?.success,
                restored: result?.data?.restored?.length ?? 0,
                missing: result?.data?.missing ?? [],
                error: result?.error,
                // Naming them beats a silent partial rollback: the caller has to
                // undo these by hand, and "succeeded: true" alone reads as done.
                ...(unprotected.length ? {
                    unprotected,
                    warning: `Rollback restored node state only. These operations are outside a snapshot and were NOT undone: ${unprotected.join(', ')}. Undo them manually.`
                } : {})
            };
        } catch (err: any) {
            return { attempted: true, succeeded: false, restored: 0, error: err?.message || String(err) };
        }
    }
}
