"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAction = normalizeAction;
/**
 * Action alias map to handle common LLM mismatches.
 * Key: tool name, Value: map of alias -> canonical action.
 */
const ACTION_ALIASES = {
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
function normalizeAction(toolName, action) {
    var _a, _b;
    return (_b = (_a = ACTION_ALIASES[toolName]) === null || _a === void 0 ? void 0 : _a[action]) !== null && _b !== void 0 ? _b : action;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uLWFsaWFzZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdXRpbHMvYWN0aW9uLWFsaWFzZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUF1Q0EsMENBRUM7QUF6Q0Q7OztHQUdHO0FBQ0gsTUFBTSxjQUFjLEdBQTJDO0lBQzNELGdCQUFnQixFQUFFO1FBQ2QsTUFBTSxFQUFFLFFBQVE7S0FDbkI7SUFDRCxzQkFBc0IsRUFBRTtRQUNwQixNQUFNLEVBQUUsUUFBUTtLQUNuQjtJQUNELGdCQUFnQixFQUFFO1FBQ2QsS0FBSyxFQUFFLE1BQU07S0FDaEI7SUFDRCxlQUFlLEVBQUU7UUFDYixJQUFJLEVBQUUsU0FBUztLQUNsQjtJQUNELFVBQVUsRUFBRTtRQUNSLElBQUksRUFBRSxTQUFTO0tBQ2xCO0lBQ0QsZ0JBQWdCLEVBQUU7UUFDZCxJQUFJLEVBQUUsVUFBVTtLQUNuQjtJQUNELGNBQWMsRUFBRTtRQUNaLE1BQU0sRUFBRSxRQUFRO0tBQ25CO0lBQ0QsVUFBVSxFQUFFO1FBQ1IsTUFBTSxFQUFFLFFBQVE7S0FDbkI7SUFDRCxhQUFhLEVBQUU7UUFDWCxHQUFHLEVBQUUsZ0JBQWdCO1FBQ3JCLElBQUksRUFBRSxnQkFBZ0I7S0FDekI7Q0FDSixDQUFDO0FBRUY7OztHQUdHO0FBQ0gsU0FBZ0IsZUFBZSxDQUFDLFFBQWdCLEVBQUUsTUFBYzs7SUFDNUQsT0FBTyxNQUFBLE1BQUEsY0FBYyxDQUFDLFFBQVEsQ0FBQywwQ0FBRyxNQUFNLENBQUMsbUNBQUksTUFBTSxDQUFDO0FBQ3hELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFjdGlvbiBhbGlhcyBtYXAgdG8gaGFuZGxlIGNvbW1vbiBMTE0gbWlzbWF0Y2hlcy5cbiAqIEtleTogdG9vbCBuYW1lLCBWYWx1ZTogbWFwIG9mIGFsaWFzIC0+IGNhbm9uaWNhbCBhY3Rpb24uXG4gKi9cbmNvbnN0IEFDVElPTl9BTElBU0VTOiBSZWNvcmQ8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiA9IHtcbiAgICBjb21wb25lbnRfbWFuYWdlOiB7XG4gICAgICAgIGRlbGV0ZTogJ3JlbW92ZScsXG4gICAgfSxcbiAgICByZWZlcmVuY2VfaW1hZ2VfbWFuYWdlOiB7XG4gICAgICAgIGRlbGV0ZTogJ3JlbW92ZScsXG4gICAgfSxcbiAgICBtYW5hZ2VfYW5pbWF0aW9uOiB7XG4gICAgICAgIHN0YXJ0OiAncGxheScsXG4gICAgfSxcbiAgICBjb21wb25lbnRfcXVlcnk6IHtcbiAgICAgICAgbGlzdDogJ2dldF9hbGwnLFxuICAgIH0sXG4gICAgbm9kZV9xdWVyeToge1xuICAgICAgICBsaXN0OiAnZ2V0X2FsbCcsXG4gICAgfSxcbiAgICBzY2VuZV9tYW5hZ2VtZW50OiB7XG4gICAgICAgIGxpc3Q6ICdnZXRfbGlzdCcsXG4gICAgfSxcbiAgICBub2RlX2xpZmVjeWNsZToge1xuICAgICAgICByZW1vdmU6ICdkZWxldGUnLFxuICAgIH0sXG4gICAgYXNzZXRfY3J1ZDoge1xuICAgICAgICByZW1vdmU6ICdkZWxldGUnLFxuICAgIH0sXG4gICAgZGVidWdfY29uc29sZToge1xuICAgICAgICBydW46ICdleGVjdXRlX3NjcmlwdCcsXG4gICAgICAgIGV2YWw6ICdleGVjdXRlX3NjcmlwdCcsXG4gICAgfSxcbn07XG5cbi8qKlxuICogTm9ybWFsaXplIGFuIGFjdGlvbiBuYW1lIGZvciBhIGdpdmVuIHRvb2wsIHJlc29sdmluZyBrbm93biBhbGlhc2VzLlxuICogUmV0dXJucyB0aGUgY2Fub25pY2FsIGFjdGlvbiBpZiBhbiBhbGlhcyBpcyBmb3VuZCwgb3RoZXJ3aXNlIHJldHVybnMgdGhlIG9yaWdpbmFsLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQWN0aW9uKHRvb2xOYW1lOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gQUNUSU9OX0FMSUFTRVNbdG9vbE5hbWVdPy5bYWN0aW9uXSA/PyBhY3Rpb247XG59XG4iXX0=