import type { TagHue } from "../badge";

export interface KanbanLabel {
  label: string;
  hue?: TagHue;
}

export interface KanbanColumnData {
  /** Unique across columns AND cards. */
  id: string;
  title: string;
}

export interface KanbanCardData {
  /** Unique across cards AND columns. */
  id: string;
  /** The column the card is in. Cards keep the order of the `cards` array within their column. */
  columnId: string;
  title: string;
  labels?: KanbanLabel[];
  assignee?: { name: string; src?: string };
}

export interface KanbanCardRenderState {
  /** True for the copy that follows the pointer. */
  overlay: boolean;
  /** True for the card left in the list while its copy is dragged. */
  dragging: boolean;
}

export type AnnounceFn = (card: string, column: string, position: number, total: number) => string;
