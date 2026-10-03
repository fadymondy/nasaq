export { default as NqDashboardBoard } from "./NqDashboardBoard.vue";
export type { DashboardBoardLabels } from "./board-strings";
export type { BoardItem, BoardSettingField, BoardSettingValue, DashboardWidgetContext, DashboardWidgetDef } from "./board-types";
export {
  applyPins as dashboardBoardApplyPins,
  BOARD_MAX_COLS,
  BOARD_MAX_ROWS,
  boardColumns,
  moveItem as dashboardBoardMoveItem,
  nextItemId as dashboardBoardNextId,
  normalizeLayout as dashboardBoardNormalize,
  reorderItems as dashboardBoardReorder,
  resizeFromDelta as dashboardBoardResizeFromDelta,
  resizeItem as dashboardBoardResize,
  sameLayout as dashboardBoardSameLayout,
  togglePin as dashboardBoardTogglePin,
} from "./board-math";
