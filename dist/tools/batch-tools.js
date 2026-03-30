"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchTools = void 0;
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
                        }
                    },
                    required: ['operations']
                }
            }
        ];
    }
    async execute(_toolName, args) {
        var _a;
        const operations = args.operations;
        const stopOnError = (_a = args.stopOnError) !== null && _a !== void 0 ? _a : false;
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
        for (let i = 0; i < operations.length; i++) {
            const op = operations[i];
            try {
                const result = await this.executorFn(op.tool, op.args);
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
exports.BatchTools = BatchTools;
BatchTools.MAX_OPERATIONS = 20;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYmF0Y2gtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxVQUFVO0lBS25CLFlBQVksVUFBeUQ7UUFDakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDakMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFDUCxrRUFBa0U7b0JBQ2xFLHNHQUFzRztvQkFDdEcsc0dBQXNHO2dCQUMxRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsT0FBTzs0QkFDYixXQUFXLEVBQUUsNkNBQTZDOzRCQUMxRCxLQUFLLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsVUFBVSxFQUFFO29DQUNSLElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUsK0RBQStEO3FDQUMvRTtvQ0FDRCxJQUFJLEVBQUU7d0NBQ0YsSUFBSSxFQUFFLFFBQVE7d0NBQ2QsV0FBVyxFQUFFLDhEQUE4RDtxQ0FDOUU7aUNBQ0o7Z0NBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzs2QkFDN0I7eUJBQ0o7d0JBQ0QsV0FBVyxFQUFFOzRCQUNULElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSw4RUFBOEU7NEJBQzNGLE9BQU8sRUFBRSxLQUFLO3lCQUNqQjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQzNCO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIsRUFBRSxJQUFTOztRQUN0QyxNQUFNLFVBQVUsR0FBdUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2RSxNQUFNLFdBQVcsR0FBWSxNQUFBLElBQUksQ0FBQyxXQUFXLG1DQUFJLEtBQUssQ0FBQztRQUV2RCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxzQ0FBc0MsRUFBRSxDQUFDO1FBQzdFLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLHdCQUF3QixVQUFVLENBQUMsTUFBTSxpQkFBaUIsVUFBVSxDQUFDLGNBQWMsR0FBRzthQUNoRyxDQUFDO1FBQ04sQ0FBQztRQUVELE1BQU0sT0FBTyxHQUEwRCxFQUFFLENBQUM7UUFDMUUsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBRXJCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksQ0FBQztnQkFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLENBQUM7WUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO2dCQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDZCxNQUFNO2dCQUNWLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU87WUFDSCxPQUFPLEVBQUUsQ0FBQyxRQUFRO1lBQ2xCLElBQUksRUFBRTtnQkFDRixPQUFPO2dCQUNQLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDekIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUN4QixZQUFZLEVBQUUsV0FBVyxJQUFJLFFBQVE7YUFDeEM7WUFDRCxPQUFPLEVBQUUsUUFBUTtnQkFDYixDQUFDLENBQUMsZ0NBQWdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLFNBQVM7Z0JBQ2hHLENBQUMsQ0FBQyxpQ0FBaUMsT0FBTyxDQUFDLE1BQU0sYUFBYTtTQUNyRSxDQUFDO0lBQ04sQ0FBQzs7QUE5RkwsZ0NBK0ZDO0FBOUYyQix5QkFBYyxHQUFHLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIEJhdGNoVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1BWF9PUEVSQVRJT05TID0gMjA7XG5cbiAgICBwcml2YXRlIGV4ZWN1dG9yRm46ICh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpID0+IFByb21pc2U8YW55PjtcblxuICAgIGNvbnN0cnVjdG9yKGV4ZWN1dG9yRm46ICh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpID0+IFByb21pc2U8YW55Pikge1xuICAgICAgICB0aGlzLmV4ZWN1dG9yRm4gPSBleGVjdXRvckZuO1xuICAgIH1cblxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdiYXRjaF9leGVjdXRlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0V4ZWN1dGUgbXVsdGlwbGUgdG9vbCBvcGVyYXRpb25zIHNlcXVlbnRpYWxseSBpbiBhIHNpbmdsZSBjYWxsLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1JlZHVjZXMgcm91bmQtdHJpcHMgYmV0d2VlbiBBSSBhbmQgc2VydmVyLiBFYWNoIG9wZXJhdGlvbiBzcGVjaWZpZXMgYSB0b29sIG5hbWUgYW5kIGl0cyBwYXJhbWV0ZXJzLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ09wZXJhdGlvbnMgcnVuIGluIG9yZGVyOyB1c2Ugc3RvcE9uRXJyb3IgdG8gYWJvcnQgb24gZmlyc3QgZmFpbHVyZS4gTWF4aW11bSAyMCBvcGVyYXRpb25zIHBlciBiYXRjaC4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIG9wZXJhdGlvbnMgdG8gZXhlY3V0ZSBzZXF1ZW50aWFsbHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUb29sIG5hbWUgdG8gY2FsbCAoZS5nLiBcIm5vZGVfbGlmZWN5Y2xlXCIsIFwic2NlbmVfbWFuYWdlbWVudFwiKSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgdG9vbCAoaW5jbHVkaW5nIFwiYWN0aW9uXCIgcGFyYW1ldGVyKSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndG9vbCcsICdhcmdzJ11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcE9uRXJyb3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCBzdG9wIGV4ZWN1dGluZyByZW1haW5pbmcgb3BlcmF0aW9ucyBvbiBmaXJzdCBlcnJvciAoZGVmYXVsdDogZmFsc2UpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydvcGVyYXRpb25zJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZShfdG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3Qgb3BlcmF0aW9uczogQXJyYXk8eyB0b29sOiBzdHJpbmc7IGFyZ3M6IGFueSB9PiA9IGFyZ3Mub3BlcmF0aW9ucztcbiAgICAgICAgY29uc3Qgc3RvcE9uRXJyb3I6IGJvb2xlYW4gPSBhcmdzLnN0b3BPbkVycm9yID8/IGZhbHNlO1xuXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvcGVyYXRpb25zKSB8fCBvcGVyYXRpb25zLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnb3BlcmF0aW9ucyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wZXJhdGlvbnMubGVuZ3RoID4gQmF0Y2hUb29scy5NQVhfT1BFUkFUSU9OUykge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogYFRvbyBtYW55IG9wZXJhdGlvbnMgKCR7b3BlcmF0aW9ucy5sZW5ndGh9KS4gTWF4aW11bSBpcyAke0JhdGNoVG9vbHMuTUFYX09QRVJBVElPTlN9LmBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCByZXN1bHRzOiBBcnJheTx7IHRvb2w6IHN0cmluZzsgcmVzdWx0PzogYW55OyBlcnJvcj86IHN0cmluZyB9PiA9IFtdO1xuICAgICAgICBsZXQgaGFzRXJyb3IgPSBmYWxzZTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9wZXJhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG9wID0gb3BlcmF0aW9uc1tpXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRvckZuKG9wLnRvb2wsIG9wLmFyZ3MpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHRvb2w6IG9wLnRvb2wsIHJlc3VsdCB9KTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgaGFzRXJyb3IgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHRvb2w6IG9wLnRvb2wsIGVycm9yOiBlcnIubWVzc2FnZSB8fCBTdHJpbmcoZXJyKSB9KTtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcE9uRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6ICFoYXNFcnJvcixcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLFxuICAgICAgICAgICAgICAgIGNvbXBsZXRlZDogcmVzdWx0cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgdG90YWw6IG9wZXJhdGlvbnMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIHN0b3BwZWRFYXJseTogc3RvcE9uRXJyb3IgJiYgaGFzRXJyb3JcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtZXNzYWdlOiBoYXNFcnJvclxuICAgICAgICAgICAgICAgID8gYEJhdGNoIGNvbXBsZXRlZCB3aXRoIGVycm9yczogJHtyZXN1bHRzLmZpbHRlcihyID0+IHIuZXJyb3IpLmxlbmd0aH0vJHtyZXN1bHRzLmxlbmd0aH0gZmFpbGVkYFxuICAgICAgICAgICAgICAgIDogYEJhdGNoIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHk6ICR7cmVzdWx0cy5sZW5ndGh9IG9wZXJhdGlvbnNgXG4gICAgICAgIH07XG4gICAgfVxufVxuIl19