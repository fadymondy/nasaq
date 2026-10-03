// nqTreeView: a tree of nested items with expand and collapse, single or multiple selection, roving-tabindex
// keyboard navigation with typeahead, and lazy children. The markup is the React TreeView one, the state lives here.
//
//   <div role="tree" aria-label="Files" x-data="nqTreeView({ nodes: [...], expanded: ['docs'], selected: [], mode: 'single' })"
//        x-modelable="selected" x-on:keydown="onKeydown($event)" class="flex flex-col gap-0.5 …">
//     <div role="treeitem" data-node-id="docs" aria-level="1" aria-setsize="2" aria-posinset="1" x-bind="item('docs')" class="…">
//       <span data-slot="tree-view-toggle" x-on:click.stop="toggle('docs')">…</span> Documents
//     </div>
//   </div>
//
// Every node is in the markup (a flat list with aria-level, like React); the runtime shows a row only when all its
// ancestors are expanded. `nodes` lists every node in document order: { id, parent, expandable, lazy, disabled, text }.
// Arrow keys: Up/Down move, Right expands or enters, Left collapses or goes to the parent (swapped in RTL), Home/End,
// Enter or Space select, typing jumps to the next label starting with those letters.
// Lazy nodes (lazy: true) dispatch `nq-tree-expand` ({ id, loading(promise) }) when first expanded; pass the promise
// to `loading` to show the spinner until it settles. Re-render the tree with the loaded children yourself.
// `selected` is x-modelable (x-model="$wire.picked"): an array of ids.

import type { Magics, Register } from "./types";

export interface TreeNodeInfo {
  id: string;
  parent: string | null;
  expandable: boolean;
  /** Expandable but its children are not loaded yet. */
  lazy?: boolean;
  disabled?: boolean;
  /** Text used for typeahead. Falls back to id. */
  text?: string;
}

export type SelectionMode = "single" | "multiple" | "none";

export interface FlatRow {
  id: string;
  parentId: string | null;
  disabled: boolean;
  text: string;
  expandable: boolean;
  expanded: boolean;
}

export type TreeKeyAction = { type: "focus"; id: string } | { type: "expand"; id: string } | { type: "collapse"; id: string };

/** The rows a user can see, in order: a node shows only when every ancestor is expanded. */
export function visibleRows(nodes: readonly TreeNodeInfo[], expanded: ReadonlySet<string>): FlatRow[] {
  const shown = new Set<string>();
  const out: FlatRow[] = [];
  for (const node of nodes) {
    if (node.parent !== null && !(shown.has(node.parent) && expanded.has(node.parent))) continue;
    shown.add(node.id);
    out.push({
      id: node.id,
      parentId: node.parent,
      disabled: Boolean(node.disabled),
      text: (node.text ?? node.id).toLocaleLowerCase(),
      expandable: node.expandable,
      expanded: node.expandable && expanded.has(node.id),
    });
  }
  return out;
}

/** What a navigation key does; the same rules as the React getKeyAction. */
export function getKeyAction(flat: readonly FlatRow[], focusedId: string | null, key: string, dir: "ltr" | "rtl" = "ltr"): TreeKeyAction | null {
  const enabled = flat.filter((row) => !row.disabled);
  if (enabled.length === 0) return null;
  const current = flat.find((row) => row.id === focusedId);
  const first = enabled[0] as FlatRow;
  const last = enabled[enabled.length - 1] as FlatRow;
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
    return child && child.parentId === current.id && !child.disabled ? { type: "focus", id: child.id } : null;
  }
  if (key === collapseKey) {
    if (current.expandable && current.expanded) return { type: "collapse", id: current.id };
    const parent = flat.find((row) => row.id === current.parentId);
    return parent && !parent.disabled ? { type: "focus", id: parent.id } : null;
  }
  return null;
}

/** Typeahead: the next enabled row whose text starts with `query`, wrapping; a repeated letter cycles. */
export function findTypeahead(flat: readonly FlatRow[], focusedId: string | null, query: string): string | null {
  const q = query.toLocaleLowerCase();
  if (!q) return null;
  const enabled = flat.filter((row) => !row.disabled);
  if (enabled.length === 0) return null;
  const at = enabled.findIndex((row) => row.id === focusedId);
  const repeated = q.length > 1 && [...q].every((ch) => ch === q[0]);
  const needle = repeated ? (q[0] as string) : q;
  const start = at === -1 ? 0 : repeated || q.length === 1 ? at + 1 : at;
  for (let i = 0; i < enabled.length; i++) {
    const row = enabled[(start + i) % enabled.length] as FlatRow;
    if (row.text.startsWith(needle)) return row.id;
  }
  return null;
}

/** The selection after activating `id`. Single replaces, multiple toggles, none leaves it unchanged. */
export function nextSelection(selected: readonly string[], id: string, mode: SelectionMode): string[] {
  if (mode === "none") return [...selected];
  if (mode === "single") return [id];
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}

interface TreeState extends Magics {
  nodes: TreeNodeInfo[];
  expanded: string[];
  selected: string[];
  mode: SelectionMode;
  dirOption: "ltr" | "rtl" | null;
  focusedId: string | null;
  loading: string[];
  query: string;
  queryTimer: ReturnType<typeof setTimeout> | undefined;
  flat(): FlatRow[];
  isVisible(id: string): boolean;
  tabId(): string | null;
  dir(): "ltr" | "rtl";
  focusRow(id: string): void;
  expand(id: string): void;
  collapse(id: string): void;
  toggle(id: string): void;
  activate(id: string): void;
}

interface Config {
  nodes: TreeNodeInfo[];
  expanded?: string[];
  selected?: string[];
  mode?: SelectionMode;
  dir?: "ltr" | "rtl" | null;
}

function rowEl(root: Element, id: string): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>("[data-node-id]")].find((el) => el.dataset.nodeId === id);
}

export const treeView: Register = (Alpine) => {
  Alpine.data("nqTreeView", (config: Config) => ({
    nodes: config.nodes ?? [],
    expanded: [...(config.expanded ?? [])],
    selected: [...(config.selected ?? [])],
    mode: config.mode ?? "single",
    dirOption: config.dir ?? null,
    focusedId: null as string | null,
    loading: [] as string[],
    query: "",
    queryTimer: undefined as ReturnType<typeof setTimeout> | undefined,

    flat(this: TreeState) {
      return visibleRows(this.nodes, new Set(this.expanded));
    },
    isVisible(this: TreeState, id: string) {
      return this.flat().some((row) => row.id === id);
    },
    /** Roving tabindex: the focused row, else the first selected visible row, else the first enabled row. */
    tabId(this: TreeState) {
      const flat = this.flat();
      if (this.focusedId && flat.some((r) => r.id === this.focusedId && !r.disabled)) return this.focusedId;
      return (flat.find((r) => this.selected.includes(r.id) && !r.disabled) ?? flat.find((r) => !r.disabled))?.id ?? null;
    },
    dir(this: TreeState): "ltr" | "rtl" {
      return this.dirOption ?? (getComputedStyle(this.$el).direction === "rtl" ? "rtl" : "ltr");
    },
    focusRow(this: TreeState, id: string) {
      this.focusedId = id;
      this.$nextTick(() => rowEl(this.$el, id)?.focus());
    },
    expand(this: TreeState, id: string) {
      const node = this.nodes.find((n) => n.id === id);
      if (!node?.expandable || this.expanded.includes(id)) return;
      this.expanded = [...this.expanded, id];
      if (node.lazy) {
        this.$dispatch("nq-tree-expand", {
          id,
          loading: (promise: Promise<unknown>) => {
            this.loading = [...this.loading, id];
            const done = () => (this.loading = this.loading.filter((l) => l !== id));
            promise.then(done, done);
          },
        });
      }
    },
    collapse(this: TreeState, id: string) {
      if (this.expanded.includes(id)) this.expanded = this.expanded.filter((e) => e !== id);
    },
    toggle(this: TreeState, id: string) {
      this.focusedId = id;
      if (this.expanded.includes(id)) this.collapse(id);
      else this.expand(id);
    },
    activate(this: TreeState, id: string) {
      if (this.mode === "none") return;
      this.selected = nextSelection(this.selected, id, this.mode);
    },
    onKeydown(this: TreeState, event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
      const id = target?.dataset.nodeId ?? null;
      if (!id || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this.activate(id);
        return;
      }
      if (event.key.length === 1) {
        clearTimeout(this.queryTimer);
        this.query += event.key;
        this.queryTimer = setTimeout(() => (this.query = ""), 600);
        const match = findTypeahead(this.flat(), id, this.query);
        if (match) {
          event.preventDefault();
          this.focusRow(match);
        }
        return;
      }
      const action = getKeyAction(this.flat(), id, event.key, this.dir());
      if (!action) return;
      event.preventDefault();
      if (action.type === "focus") this.focusRow(action.id);
      else if (action.type === "expand") this.expand(action.id);
      else this.collapse(action.id);
    },
    /** Bind on one row (role="treeitem") that has data-node-id. */
    item(this: TreeState, id: string) {
      return {
        role: "treeitem",
        "x-show"(this: TreeState) {
          return this.isVisible(id);
        },
        ":tabindex"(this: TreeState) {
          return this.tabId() === id ? 0 : -1;
        },
        ":aria-expanded"(this: TreeState) {
          const node = this.nodes.find((n) => n.id === id);
          return node?.expandable ? String(this.expanded.includes(id)) : undefined;
        },
        ":aria-selected"(this: TreeState) {
          return this.mode === "none" ? undefined : String(this.selected.includes(id));
        },
        ":aria-busy"(this: TreeState) {
          return this.loading.includes(id) ? "true" : undefined;
        },
        ":data-selected"(this: TreeState) {
          return this.selected.includes(id) ? "" : undefined;
        },
        ":data-expanded"(this: TreeState) {
          const node = this.nodes.find((n) => n.id === id);
          return node?.expandable && this.expanded.includes(id) ? "" : undefined;
        },
        "x-on:focus"(this: TreeState, event: FocusEvent) {
          if (event.target === event.currentTarget) this.focusedId = id;
        },
        "x-on:click"(this: TreeState) {
          const node = this.nodes.find((n) => n.id === id);
          if (node?.disabled) return;
          this.focusedId = id;
          this.activate(id);
        },
      };
    },
  }));
};
