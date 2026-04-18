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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYmF0Y2gtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxVQUFVO0lBS25CLFlBQVksVUFBeUQ7UUFDakUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDakMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFdBQVcsRUFDUCxrRUFBa0U7b0JBQ2xFLHNHQUFzRztvQkFDdEcsc0dBQXNHO2dCQUMxRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFVBQVUsRUFBRTs0QkFDUixJQUFJLEVBQUUsT0FBTzs0QkFDYixXQUFXLEVBQUUsNkNBQTZDOzRCQUMxRCxLQUFLLEVBQUU7Z0NBQ0gsSUFBSSxFQUFFLFFBQVE7Z0NBQ2QsVUFBVSxFQUFFO29DQUNSLElBQUksRUFBRTt3Q0FDRixJQUFJLEVBQUUsUUFBUTt3Q0FDZCxXQUFXLEVBQUUsK0RBQStEO3FDQUMvRTtvQ0FDRCxJQUFJLEVBQUU7d0NBQ0YsSUFBSSxFQUFFLFFBQVE7d0NBQ2QsV0FBVyxFQUFFLDhEQUE4RDtxQ0FDOUU7aUNBQ0o7Z0NBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQzs2QkFDN0I7eUJBQ0o7d0JBQ0QsV0FBVyxFQUFFOzRCQUNULElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSw4RUFBOEU7NEJBQzNGLE9BQU8sRUFBRSxLQUFLO3lCQUNqQjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQzNCO2FBQ0o7U0FDSixDQUFDO0lBQ04sQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBaUIsRUFBRSxJQUFTOztRQUN0QyxNQUFNLFVBQVUsR0FBdUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2RSxNQUFNLFdBQVcsR0FBWSxNQUFBLElBQUksQ0FBQyxXQUFXLG1DQUFJLEtBQUssQ0FBQztRQUV2RCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxzQ0FBc0MsRUFBRSxDQUFDO1FBQzdFLENBQUM7UUFFRCxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLHdCQUF3QixVQUFVLENBQUMsTUFBTSxpQkFBaUIsVUFBVSxDQUFDLGNBQWMsR0FBRzthQUNoRyxDQUFDO1FBQ04sQ0FBQztRQUVELE1BQU0sT0FBTyxHQUEwRCxFQUFFLENBQUM7UUFDMUUsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBRXJCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLElBQUksQ0FBQztnQkFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLENBQUM7WUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO2dCQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO2dCQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDZCxNQUFNO2dCQUNWLENBQUM7WUFDTCxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU87WUFDSCxPQUFPLEVBQUUsQ0FBQyxRQUFRO1lBQ2xCLElBQUksRUFBRTtnQkFDRixPQUFPO2dCQUNQLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDekIsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNO2dCQUN4QixZQUFZLEVBQUUsV0FBVyxJQUFJLFFBQVE7YUFDeEM7WUFDRCxPQUFPLEVBQUUsUUFBUTtnQkFDYixDQUFDLENBQUMsZ0NBQWdDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLFNBQVM7Z0JBQ2hHLENBQUMsQ0FBQyxpQ0FBaUMsT0FBTyxDQUFDLE1BQU0sYUFBYTtTQUNyRSxDQUFDO0lBQ04sQ0FBQzs7QUE5RkwsZ0NBK0ZDO0FBOUYyQix5QkFBYyxHQUFHLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBCYXRjaFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IE1BWF9PUEVSQVRJT05TID0gMjA7XHJcblxyXG4gICAgcHJpdmF0ZSBleGVjdXRvckZuOiAodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KSA9PiBQcm9taXNlPGFueT47XHJcblxyXG4gICAgY29uc3RydWN0b3IoZXhlY3V0b3JGbjogKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSkgPT4gUHJvbWlzZTxhbnk+KSB7XHJcbiAgICAgICAgdGhpcy5leGVjdXRvckZuID0gZXhlY3V0b3JGbjtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfZXhlY3V0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgICAgICAgICAgICAgICAnRXhlY3V0ZSBtdWx0aXBsZSB0b29sIG9wZXJhdGlvbnMgc2VxdWVudGlhbGx5IGluIGEgc2luZ2xlIGNhbGwuICcgK1xyXG4gICAgICAgICAgICAgICAgICAgICdSZWR1Y2VzIHJvdW5kLXRyaXBzIGJldHdlZW4gQUkgYW5kIHNlcnZlci4gRWFjaCBvcGVyYXRpb24gc3BlY2lmaWVzIGEgdG9vbCBuYW1lIGFuZCBpdHMgcGFyYW1ldGVycy4gJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ09wZXJhdGlvbnMgcnVuIGluIG9yZGVyOyB1c2Ugc3RvcE9uRXJyb3IgdG8gYWJvcnQgb24gZmlyc3QgZmFpbHVyZS4gTWF4aW11bSAyMCBvcGVyYXRpb25zIHBlciBiYXRjaC4nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIG9wZXJhdGlvbnMgdG8gZXhlY3V0ZSBzZXF1ZW50aWFsbHknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvb2w6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUb29sIG5hbWUgdG8gY2FsbCAoZS5nLiBcIm5vZGVfbGlmZWN5Y2xlXCIsIFwic2NlbmVfbWFuYWdlbWVudFwiKSdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FyZ3VtZW50cyB0byBwYXNzIHRvIHRoZSB0b29sIChpbmNsdWRpbmcgXCJhY3Rpb25cIiBwYXJhbWV0ZXIpJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd0b29sJywgJ2FyZ3MnXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9wT25FcnJvcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJZiB0cnVlLCBzdG9wIGV4ZWN1dGluZyByZW1haW5pbmcgb3BlcmF0aW9ucyBvbiBmaXJzdCBlcnJvciAoZGVmYXVsdDogZmFsc2UpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ29wZXJhdGlvbnMnXVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKF90b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IG9wZXJhdGlvbnM6IEFycmF5PHsgdG9vbDogc3RyaW5nOyBhcmdzOiBhbnkgfT4gPSBhcmdzLm9wZXJhdGlvbnM7XHJcbiAgICAgICAgY29uc3Qgc3RvcE9uRXJyb3I6IGJvb2xlYW4gPSBhcmdzLnN0b3BPbkVycm9yID8/IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob3BlcmF0aW9ucykgfHwgb3BlcmF0aW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnb3BlcmF0aW9ucyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbnMubGVuZ3RoID4gQmF0Y2hUb29scy5NQVhfT1BFUkFUSU9OUykge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBlcnJvcjogYFRvbyBtYW55IG9wZXJhdGlvbnMgKCR7b3BlcmF0aW9ucy5sZW5ndGh9KS4gTWF4aW11bSBpcyAke0JhdGNoVG9vbHMuTUFYX09QRVJBVElPTlN9LmBcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IEFycmF5PHsgdG9vbDogc3RyaW5nOyByZXN1bHQ/OiBhbnk7IGVycm9yPzogc3RyaW5nIH0+ID0gW107XHJcbiAgICAgICAgbGV0IGhhc0Vycm9yID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb3BlcmF0aW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjb25zdCBvcCA9IG9wZXJhdGlvbnNbaV07XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dG9yRm4ob3AudG9vbCwgb3AuYXJncyk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB0b29sOiBvcC50b29sLCByZXN1bHQgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICBoYXNFcnJvciA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB0b29sOiBvcC50b29sLCBlcnJvcjogZXJyLm1lc3NhZ2UgfHwgU3RyaW5nKGVycikgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RvcE9uRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogIWhhc0Vycm9yLFxyXG4gICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGVkOiByZXN1bHRzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHRvdGFsOiBvcGVyYXRpb25zLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHN0b3BwZWRFYXJseTogc3RvcE9uRXJyb3IgJiYgaGFzRXJyb3JcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbWVzc2FnZTogaGFzRXJyb3JcclxuICAgICAgICAgICAgICAgID8gYEJhdGNoIGNvbXBsZXRlZCB3aXRoIGVycm9yczogJHtyZXN1bHRzLmZpbHRlcihyID0+IHIuZXJyb3IpLmxlbmd0aH0vJHtyZXN1bHRzLmxlbmd0aH0gZmFpbGVkYFxyXG4gICAgICAgICAgICAgICAgOiBgQmF0Y2ggY29tcGxldGVkIHN1Y2Nlc3NmdWxseTogJHtyZXN1bHRzLmxlbmd0aH0gb3BlcmF0aW9uc2BcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59XHJcbiJdfQ==