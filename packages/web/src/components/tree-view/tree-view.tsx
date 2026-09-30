"use client";
import { useDirection } from "@base-ui/react/direction-provider";
import { ChevronDown, ChevronRight } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Icon } from "../icon";
import { Spinner } from "../spinner";
import { findTypeahead, flattenTree, getKeyAction, nextSelection, type SelectionMode, type TreeNodeShape } from "./tree-helpers";

export { findTypeahead, flattenTree, getAncestorIds, getKeyAction, isExpandable, nextSelection } from "./tree-helpers";
export type { FlatNode, SelectionMode, TreeKeyAction, TreeNodeShape } from "./tree-helpers";

const STRINGS = {
  en: { loading: "Loading", tree: "Tree" },
  ar: { loading: "جارٍ التحميل", tree: "شجرة" },
} as const;

export interface TreeNode extends TreeNodeShape {
  /** Row content. */
  label: ReactNode;
  /** Icon before the label. Decorative. */
  icon?: ReactNode;
  children?: TreeNode[];
}

export interface TreeViewProps extends Omit<ComponentProps<"div">, "onSelect" | "children" | "defaultValue" | "dir"> {
  /** The tree. Give every node a unique `id`. */
  items: TreeNode[];
  /** Expanded node ids (controlled). */
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** Selected node ids (controlled). */
  selected?: string[];
  defaultSelected?: string[];
  onSelectedChange?: (selected: string[]) => void;
  /** `single` replaces, `multiple` toggles (sets `aria-multiselectable`), `none` makes rows non-selectable. Default `single`. */
  selectionMode?: SelectionMode;
  /**
   * Called when a node that has no loaded `children` is expanded. Return a promise to show a spinner on the row
   * until it settles; add the loaded children to `items` yourself.
   */
  onExpand?: (node: TreeNode) => void | Promise<unknown>;
  /** Text direction for the arrow keys. Defaults to the Nasaq direction. */
  dir?: "ltr" | "rtl";
  /** Indent per level in rem. Default 1.25. */
  indent?: number;
  /** Default "Loading" / "جارٍ التحميل" by the Nasaq locale. */
  loadingLabel?: string;
}

/** Selection and expansion may be controlled or not. */
function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const currentRef = useRef(current);
  currentRef.current = current;
  const set = useCallback(
    (next: T) => {
      currentRef.current = next;
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set, currentRef] as const;
}

/** A tree of nested items with expand and collapse, single or multiple selection, keyboard navigation and lazy children. */
export function TreeView({
  items,
  expanded: expandedProp,
  defaultExpanded,
  onExpandedChange,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  selectionMode = "single",
  onExpand,
  dir: dirProp,
  indent = 1.25,
  loadingLabel,
  className,
  onKeyDown,
  ...props
}: TreeViewProps) {
  const contextDir = useDirection();
  const dir = dirProp ?? (contextDir === "rtl" ? "rtl" : "ltr");
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const [expanded, setExpanded, expandedRef] = useControllable(expandedProp, defaultExpanded ?? [], onExpandedChange);
  const [selected, setSelected, selectedRef] = useControllable(selectedProp, defaultSelected ?? [], onSelectedChange);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<ReadonlySet<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", timer: 0 as number | undefined });

  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const flat = useMemo(() => flattenTree(items, expandedSet), [items, expandedSet]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Roving tabindex: the focused row, else the first selected visible row, else the first enabled row.
  const tabId = useMemo(() => {
    if (focusedId && flat.some((row) => row.id === focusedId && !row.node.disabled)) return focusedId;
    return (flat.find((row) => selectedSet.has(row.id) && !row.node.disabled) ?? flat.find((row) => !row.node.disabled))?.id ?? null;
  }, [flat, focusedId, selectedSet]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const focusRow = useCallback((id: string) => {
    setFocusedId(id);
    rootRef.current?.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(id)}"]`)?.focus();
  }, []);

  const expand = useCallback(
    (id: string) => {
      const row = flat.find((r) => r.id === id);
      if (!row?.expandable || expandedRef.current.includes(id)) return;
      setExpanded([...expandedRef.current, id]);
      if (!row.node.children && onExpand) {
        const result = onExpand(row.node);
        if (result && typeof (result as Promise<unknown>).then === "function") {
          setLoading((prev) => new Set(prev).add(id));
          const done = () =>
            setLoading((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          (result as Promise<unknown>).then(done, done);
        }
      }
    },
    [flat, expandedRef, setExpanded, onExpand],
  );

  const collapse = useCallback(
    (id: string) => {
      if (expandedRef.current.includes(id)) setExpanded(expandedRef.current.filter((e) => e !== id));
    },
    [expandedRef, setExpanded],
  );

  const activate = (id: string) => {
    if (selectionMode === "none") return;
    setSelected(nextSelection(selectedRef.current, id, selectionMode));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-node-id]");
    const id = target?.dataset.nodeId ?? null;
    if (!id || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(id);
      return;
    }
    if (event.key.length === 1 && event.key !== " ") {
      const state = typeahead.current;
      window.clearTimeout(state.timer);
      state.text += event.key;
      state.timer = window.setTimeout(() => {
        state.text = "";
      }, 600);
      const match = findTypeahead(flat, id, state.text);
      if (match) {
        event.preventDefault();
        focusRow(match);
      }
      return;
    }
    const action = getKeyAction(flat, id, event.key, dir);
    if (!action) return;
    event.preventDefault();
    if (action.type === "focus") focusRow(action.id);
    else if (action.type === "expand") expand(action.id);
    else collapse(action.id);
  };

  return (
    <div
      ref={rootRef}
      data-slot="tree-view"
      role="tree"
      aria-multiselectable={selectionMode === "multiple" ? true : undefined}
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : t.tree)}
      onKeyDown={handleKeyDown}
      className={cn("flex flex-col gap-0.5 text-body text-foreground", className)}
      {...props}
    >
      {flat.map((row) => {
        const isSelected = selectedSet.has(row.id);
        const isLoading = loading.has(row.id);
        const disabled = row.node.disabled;
        return (
          <div
            key={row.id}
            data-slot="tree-view-item"
            data-node-id={row.id}
            data-selected={isSelected ? "" : undefined}
            data-expanded={row.expanded ? "" : undefined}
            data-disabled={disabled ? "" : undefined}
            role="treeitem"
            tabIndex={row.id === tabId ? 0 : -1}
            aria-level={row.level}
            aria-setsize={row.setSize}
            aria-posinset={row.posInSet}
            aria-expanded={row.expandable ? row.expanded : undefined}
            aria-selected={selectionMode === "none" ? undefined : isSelected}
            aria-disabled={disabled || undefined}
            aria-busy={isLoading || undefined}
            style={{ paddingInlineStart: `${(row.level - 1) * indent + 0.375}rem` }}
            onFocus={(event) => {
              if (event.target === event.currentTarget) setFocusedId(row.id);
            }}
            onClick={() => {
              if (disabled) return;
              setFocusedId(row.id);
              activate(row.id);
            }}
            className={cn(
              "flex min-h-8 cursor-default items-center gap-1.5 rounded-control pe-2 outline-none hover:bg-nq-hover",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
              "data-[selected]:bg-nq-selected",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            )}
          >
            <span
              data-slot="tree-view-toggle"
              className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
              onClick={(event) => {
                if (!row.expandable || disabled) return;
                event.stopPropagation();
                setFocusedId(row.id);
                if (row.expanded) collapse(row.id);
                else expand(row.id);
              }}
            >
              {isLoading ? (
                <Spinner label={loadingLabel ?? t.loading} className="size-3.5" />
              ) : row.expandable ? (
                row.expanded ? <ChevronDown aria-hidden="true" className="size-4" /> : <Icon icon={ChevronRight} directional aria-hidden="true" className="size-4" />
              ) : null}
            </span>
            {row.node.icon ? (
              <span data-slot="tree-view-icon" aria-hidden="true" className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">
                {row.node.icon}
              </span>
            ) : null}
            <span className="min-w-0 flex-1 truncate">{row.node.label}</span>
          </div>
        );
      })}
    </div>
  );
}
