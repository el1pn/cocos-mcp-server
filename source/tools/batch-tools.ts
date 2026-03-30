import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

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
                        }
                    },
                    required: ['operations']
                }
            }
        ];
    }

    async execute(_toolName: string, args: any): Promise<ToolResponse> {
        const operations: Array<{ tool: string; args: any }> = args.operations;
        const stopOnError: boolean = args.stopOnError ?? false;

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

        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            try {
                const result = await this.executorFn(op.tool, op.args);
                results.push({ tool: op.tool, result });
            } catch (err: any) {
                hasError = true;
                results.push({ tool: op.tool, error: err.message || String(err) });
                if (stopOnError) {
                    break;
                }
            }
        }

        return {
            success: !hasError,
            data: {
                results,
                completed: results.length,
                total: operations.length,
                stoppedEarly: stopOnError && hasError
            },
            message: hasError
                ? `Batch completed with errors: ${results.filter(r => r.error).length}/${results.length} failed`
                : `Batch completed successfully: ${results.length} operations`
        };
    }
}
