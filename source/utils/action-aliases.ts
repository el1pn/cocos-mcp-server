/**
 * Action alias map to handle common LLM mismatches.
 * Key: tool name, Value: map of alias -> canonical action.
 */
const ACTION_ALIASES: Record<string, Record<string, string>> = {
    component_manage: {
        delete: 'remove',
    },
    reference_image_manage: {
        delete: 'remove',
    },
    manage_animation: {
        start: 'play',
    },
    component_query: {
        list: 'get_all',
    },
    node_query: {
        list: 'get_all',
    },
    scene_management: {
        list: 'get_list',
    },
    node_lifecycle: {
        remove: 'delete',
    },
    asset_crud: {
        remove: 'delete',
    },
    debug_console: {
        run: 'execute_script',
        eval: 'execute_script',
    },
};

/**
 * Normalize an action name for a given tool, resolving known aliases.
 * Returns the canonical action if an alias is found, otherwise returns the original.
 */
export function normalizeAction(toolName: string, action: string): string {
    return ACTION_ALIASES[toolName]?.[action] ?? action;
}
