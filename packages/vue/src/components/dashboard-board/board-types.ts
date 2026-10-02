import type { VNodeChild } from "vue";
import type { BoardItem, BoardSettingValue } from "./board-math";

export type { BoardItem, BoardSettingValue };

export type BoardSettingField =
  | { key: string; label: string; type: "select"; options: readonly { value: string; label: string }[] }
  | { key: string; label: string; type: "number"; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "text"; placeholder?: string };

export interface DashboardWidgetContext {
  /** The item's id on the board. */
  id: string;
  settings: Record<string, BoardSettingValue>;
  /** Columns and rows the card spans now (columns are capped by what the screen fits). */
  cols: number;
  rows: number;
  /** True while the board is being edited. Widgets are inert then. */
  editing: boolean;
}

export interface DashboardWidgetDef {
  /** Stable key saved in the layout. */
  type: string;
  title: string;
  description?: string;
  /** Size when added from the catalogue. Defaults to the minimum. */
  defaultCols?: number;
  defaultRows?: number;
  minCols?: number;
  maxCols?: number;
  minRows?: number;
  maxRows?: number;
  /** Only one on the board. */
  unique?: boolean;
  /** Settings the user can change. No fields means no Settings action. */
  fields?: readonly BoardSettingField[];
  defaultSettings?: Record<string, BoardSettingValue>;
  /** Renders the widget (a render function result). Without it the board uses the `widget` slot. */
  render?: (ctx: DashboardWidgetContext) => VNodeChild;
}
