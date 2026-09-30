/** The shape the helpers need from a node. `TreeNode` in tree-view.tsx extends it with a label and icon. */
export interface TreeNodeShape {
  id: string;
  /** Text used for typeahead. Falls back to `id`. */
  textValue?: string;
  disabled?: boolean;
  /** Loaded children. `undefined` means not loaded (or a leaf). */
  children?: readonly TreeNodeShape[];
  /** True for a node whose children are loaded on demand. Ignored once `children` is set. */
  hasChildren?: boolean;
}

export interface FlatNode<T extends TreeNodeShape = TreeNodeShape> {
  node: T;
  id: string;
  /** 1-based depth. Roots are level 1. */
  level: number;
  parentId: string | null;
  /** 1-based position among its siblings (`aria-posinset`). */
  posInSet: number;
  /** Number of siblings (`aria-setsize`). */
  setSize: number;
  expandable: boolean;
  expanded: boolean;
}

/** A node shows a chevron when it has loaded children, or is marked `hasChildren` and none are loaded yet. */
export function isExpandable(node: TreeNodeShape): boolean {
  return node.children ? node.children.length > 0 : Boolean(node.hasChildren);
}

/** The visible rows in order: a node's children appear only when it and every ancestor are expanded. */
export function flattenTree<T extends TreeNodeShape>(items: readonly T[], expanded: ReadonlySet<string>): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];
  const walk = (nodes: readonly T[], level: number, parentId: string | null) => {
    nodes.forEach((node, index) => {
      const expandable = isExpandable(node);
      const open = expandable && expanded.has(node.id);
      out.push({ node, id: node.id, level, parentId, posInSet: index + 1, setSize: nodes.length, expandable, expanded: open });
      if (open && node.children) walk(node.children as readonly T[], level + 1, node.id);
    });
  };
  walk(items, 1, null);
  return out;
}

export type TreeKeyAction =
  | { type: "focus"; id: string }
  | { type: "expand"; id: string }
  | { type: "collapse"; id: string };

/**
 * What a navigation key does. `dir` decides which arrow expands: in RTL, ArrowLeft expands or enters and
 * ArrowRight collapses or goes to the parent. Returns `null` for keys that are not navigation.
 * Disabled rows are skipped by focus moves.
 */
export function getKeyAction(flat: readonly FlatNode[], focusedId: string | null, key: string, dir: "ltr" | "rtl" = "ltr"): TreeKeyAction | null {
  const enabled = flat.filter((row) => !row.node.disabled);
  if (enabled.length === 0) return null;
  const current = flat.find((row) => row.id === focusedId);
  const first = enabled[0] as FlatNode;
  const last = enabled[enabled.length - 1] as FlatNode;
  if (key === "Home") return { type: "focus", id: first.id };
  if (key === "End") return { type: "focus", id: last.id };
  if (!current) return key === "ArrowDown" || key === "ArrowUp" || key === "ArrowLeft" || key === "ArrowRight" ? { type: "focus", id: first.id } : null;

  const at = enabled.findIndex((row) => row.id === current.id);
  if (key === "ArrowDown") {
    const next = at === -1 ? enabled.find((row) => flat.indexOf(row) > flat.indexOf(current)) : enabled[at + 1];
    return next ? { type: "focus", id: next.id } : null;
  }
  if (key === "ArrowUp") {
    const prev = at === -1 ? [...enabled].reverse().find((row) => flat.indexOf(row) < flat.indexOf(current)) : enabled[at - 1];
    return prev ? { type: "focus", id: prev.id } : null;
  }

  const expandKey = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const collapseKey = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  if (key === expandKey) {
    if (!current.expandable) return null;
    if (!current.expanded) return { type: "expand", id: current.id };
    const child = flat[flat.indexOf(current) + 1];
    return child && child.parentId === current.id && !child.node.disabled ? { type: "focus", id: child.id } : null;
  }
  if (key === collapseKey) {
    if (current.expandable && current.expanded) return { type: "collapse", id: current.id };
    const parent = flat.find((row) => row.id === current.parentId);
    return parent && !parent.node.disabled ? { type: "focus", id: parent.id } : null;
  }
  return null;
}

const textOf = (row: FlatNode) => (row.node.textValue ?? row.id).toLocaleLowerCase();

/**
 * Typeahead. Finds the next enabled row whose text starts with `query`, searching after the focused row and
 * wrapping. Typing the same letter repeatedly cycles through the rows that start with it.
 */
export function findTypeahead(flat: readonly FlatNode[], focusedId: string | null, query: string): string | null {
  const q = query.toLocaleLowerCase();
  if (!q) return null;
  const enabled = flat.filter((row) => !row.node.disabled);
  if (enabled.length === 0) return null;
  const at = enabled.findIndex((row) => row.id === focusedId);
  const repeated = q.length > 1 && [...q].every((ch) => ch === q[0]);
  const needle = repeated ? (q[0] as string) : q;
  // A repeated letter moves on from the current row; a longer prefix may keep the current row.
  const start = at === -1 ? 0 : repeated || q.length === 1 ? at + 1 : at;
  for (let i = 0; i < enabled.length; i++) {
    const row = enabled[(start + i) % enabled.length] as FlatNode;
    if (textOf(row).startsWith(needle)) return row.id;
  }
  return null;
}

export type SelectionMode = "single" | "multiple" | "none";

/** The selection after activating `id`. Single replaces, multiple toggles, none leaves it unchanged. */
export function nextSelection(selected: readonly string[], id: string, mode: SelectionMode): string[] {
  if (mode === "none") return [...selected];
  if (mode === "single") return [id];
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

/** The ids on the path from a root down to (not including) `id`, so a selected node can be revealed. */
export function getAncestorIds(items: readonly TreeNodeShape[], id: string): string[] {
  const path: string[] = [];
  const find = (nodes: readonly TreeNodeShape[]): boolean => {
    for (const node of nodes) {
      if (node.id === id) return true;
      if (node.children) {
        path.push(node.id);
        if (find(node.children)) return true;
        path.pop();
      }
    }
    return false;
  };
  return find(items) ? path : [];
}
