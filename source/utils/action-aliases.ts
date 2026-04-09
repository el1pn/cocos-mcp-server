/**
 * Strict mode: no action aliases.
 * Callers must send schema-valid action names.
 */
export function normalizeAction(_toolName: string, action: string): string {
    return action;
}
