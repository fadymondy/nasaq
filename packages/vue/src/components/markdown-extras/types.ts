import type { VNode } from "vue";

/** What a header or cell can hold: text, a VNode or a list of them. */
export type MarkdownContent = string | number | VNode | (string | number | VNode)[] | null | undefined;

export interface MarkdownTableColumn {
  /** The header as rendered. */
  header: MarkdownContent;
  /** The header as text, for the sort button's name and CSV. Default taken from `header`. */
  text?: string;
  align?: "start" | "center" | "end";
}

export interface MarkdownTableRow {
  /** Rendered cells, one per column. */
  cells: MarkdownContent[];
  /** Plain text of each cell. Default taken from `cells`. */
  texts?: string[];
}

/** Plain text of rendered content, for sorting and filtering. */
export function markdownTextOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(markdownTextOf).join("");
  if (typeof node === "object" && "children" in node) return markdownTextOf((node as { children: unknown }).children);
  return "";
}
