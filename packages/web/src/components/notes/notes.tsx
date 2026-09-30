"use client";

import { Archive, BookOpen, FolderPlus, Lock, Pencil, Pin, StickyNote, Tag, Trash2 } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform } from "../../lib/hotkey";
import { ContextMenuActions } from "../context-menu";
import { useFormatNumber } from "../numeric";
import { TreeView, type TreeNode } from "../tree-view";
import { NoteEditor } from "./note-editor";
import { NotebookDialog, type NotebookDialogState, type NoteResult } from "./notes-dialogs";
import type { NoteAction, NoteMenuOptions } from "./notes-menu";
import { useNoteMenu } from "./notes-menu";
import { matchNoteShortcut, type Note, type NoteSort, type NoteViewMode, notebookScope, notebookTree, type NotebookNode, scopeCounts, tagCounts, tagScope } from "./notes-model";
import { useNotesLabels } from "./notes-strings";
import { type NoteCreateResult, NotesView } from "./notes-view";

export interface NotesProps extends Omit<NoteMenuOptions, "unlocked" | "onLock"> {
  notes: readonly Note[];
  /** The open note (controlled). */
  activeId?: string | null;
  defaultActiveId?: string | null;
  onActiveChange?: (id: string | null) => void;
  /** Make a note and return its id, so it opens. Resolve `{ error }` to report a failure. */
  onCreate?: () => Promise<NoteCreateResult>;
  /** Check a sealed note's password. Resolve `{ error }` for a wrong one; on success the note opens for this session. */
  onUnlock?: (id: string, password: string) => Promise<NoteResult>;
  onNotebookCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onNotebookRename?: (id: string, name: string) => Promise<NoteResult>;
  onNotebookDelete?: (id: string) => Promise<NoteResult>;
  defaultScope?: string;
  defaultSort?: NoteSort;
  defaultView?: NoteViewMode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  autosaveDelay?: number;
  now?: number;
  className?: string;
}

/**
 * The notes workspace: notebooks and filters, the list or board, and the editor, with the keyboard shortcuts
 * (Ctrl+N or Alt+N new, Mod+Shift+P pin, A archive, D duplicate, L seal, F search, Alt+M actions). Wide: three
 * columns. Medium: list and editor. Narrow: the list and the editor swap. In board view the editor replaces the board.
 * It keeps which sealed notes are open for the session and nothing else: the notes live in your state or server.
 */
export function Notes(props: NotesProps) {
  const { notes, notebooks = [], onDelete, onSeal, onRemoveSeal, onCreate, onUnlock, labels, autosaveDelay, className } = props;
  const [activeState, setActiveState] = useState<string | null>(props.defaultActiveId ?? null);
  const activeRaw = props.activeId !== undefined ? props.activeId : activeState;
  const setActive = useCallback(
    (id: string | null) => {
      if (props.activeId === undefined) setActiveState(id);
      props.onActiveChange?.(id);
    },
    [props.activeId, props.onActiveChange], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const active = useMemo(() => notes.find((n) => n.id === activeRaw) ?? null, [notes, activeRaw]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [scope, setScope] = useState(props.defaultScope ?? "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<NoteSort>(props.defaultSort ?? "updated");
  const [view, setView] = useState<NoteViewMode>(props.defaultView ?? "list");
  const [notebookDialog, setNotebookDialog] = useState<NotebookDialogState | null>(null);
  const root = useRef<HTMLDivElement>(null);

  const menu = useNoteMenu({
    ...props,
    unlocked,
    onLock: (id) => setUnlocked((u) => u.filter((x) => x !== id)),
    onDelete: onDelete
      ? async (id) => {
          const result = await onDelete(id);
          if (!(result && result.error) && id === active?.id) setActive(null);
          return result;
        }
      : undefined,
    onSeal: onSeal
      ? async (id, password) => {
          const result = await onSeal(id, password);
          if (!(result && result.error)) setUnlocked((u) => (u.includes(id) ? u : [...u, id]));
          return result;
        }
      : undefined,
    onRemoveSeal: onRemoveSeal
      ? async (id, password) => {
          const result = await onRemoveSeal(id, password);
          if (!(result && result.error)) setUnlocked((u) => u.filter((x) => x !== id));
          return result;
        }
      : undefined,
  });

  const create = async () => {
    const result = await onCreate?.();
    if (result && result.id) {
      setActive(result.id);
      setScope((s) => (s === "archive" || s === "sealed" ? "all" : s));
    }
    return result;
  };

  const unlock = async (id: string, password: string) => {
    const result = await onUnlock?.(id, password);
    if (!(result && result.error)) setUnlocked((u) => (u.includes(id) ? u : [...u, id]));
    return result;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const shortcut = matchNoteShortcut(event.nativeEvent, isApplePlatform());
    if (!shortcut) return;
    if (shortcut === "new") {
      if (!onCreate) return;
      event.preventDefault();
      void create();
    } else if (shortcut === "search") {
      event.preventDefault();
      const el = root.current?.querySelector<HTMLElement>("[data-slot=notes-search]");
      (el instanceof HTMLInputElement ? el : el?.querySelector("input"))?.focus();
    } else if (shortcut === "actions") {
      const trigger = root.current?.querySelector<HTMLElement>("[data-slot=note-editor-body] [data-slot=note-actions-trigger]");
      if (trigger) {
        event.preventDefault();
        trigger.click();
      }
    } else if (active) {
      const done = menu.runShortcut(active, shortcut === "seal" ? "seal" : shortcut);
      if (done) event.preventDefault();
    }
  };

  const showEditor = active !== null;
  const boardMode = view === "grid";
  const list = boardMode ? (showEditor ? "hidden" : "flex flex-1") : showEditor ? "hidden @2xl:flex @2xl:w-80 @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border" : "flex flex-1 @2xl:w-80 @2xl:flex-none @4xl:w-96 @2xl:shrink-0 @2xl:border-e @2xl:border-border";
  const editor = boardMode ? (showEditor ? "flex" : "hidden") : showEditor ? "flex" : "hidden @2xl:flex";

  return (
    <div ref={root} onKeyDown={onKeyDown} data-slot="notes" data-view={view} className={cn("@container flex h-full min-h-0 w-full min-w-0 bg-background", className)}>
      <NotesSidebar
        className="hidden @4xl:flex"
        notes={notes}
        notebooks={notebooks}
        scope={scope}
        onScope={setScope}
        labels={labels}
        onNotebookCreate={props.onNotebookCreate ? (parentId) => setNotebookDialog({ kind: "create", parentId }) : undefined}
        onNotebookRename={props.onNotebookRename ? (notebook) => setNotebookDialog({ kind: "rename", notebook }) : undefined}
        onNotebookDelete={props.onNotebookDelete ? (notebook) => setNotebookDialog({ kind: "delete", notebook }) : undefined}
      />
      <NotesView
        {...props}
        unlocked={unlocked}
        menu={menu}
        activeId={active?.id ?? null}
        onOpen={setActive}
        onCreate={onCreate ? create : undefined}
        scope={scope}
        onScopeChange={setScope}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        scopeBarClassName="@4xl:hidden"
        className={list}
      />
      <NoteEditor
        {...props}
        unlocked={unlocked}
        menu={menu}
        note={active}
        autosaveDelay={autosaveDelay}
        onBack={() => setActive(null)}
        backClassName={boardMode ? undefined : "@2xl:hidden"}
        onOpenNote={setActive}
        onUnlock={onUnlock ? unlock : undefined}
        onLock={(id) => setUnlocked((u) => u.filter((x) => x !== id))}
        className={editor}
      />
      {menu.dialogs}
      {notebookDialog ? (
        <NotebookDialog
          key={`${notebookDialog.kind}-${notebookDialog.notebook?.id ?? ""}`}
          state={notebookDialog}
          onClose={() => setNotebookDialog(null)}
          notebooks={notebooks}
          onCreate={async (name, parentId) => {
            const result = await props.onNotebookCreate?.(name, parentId);
            if (!(result && result.error)) setNotebookDialog(null);
            return result;
          }}
          onRename={async (id, name) => {
            const result = await props.onNotebookRename?.(id, name);
            if (!(result && result.error)) setNotebookDialog(null);
            return result;
          }}
          onDelete={async (id) => {
            const result = await props.onNotebookDelete?.(id);
            if (!(result && result.error)) {
              setNotebookDialog(null);
              if (scope === notebookScope(id)) setScope("all");
            }
            return result;
          }}
          labels={labels}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ sidebar */

export interface NotesSidebarProps {
  notes: readonly Note[];
  notebooks: readonly { id: string; name: string; parentId?: string | null }[];
  scope: string;
  onScope: (scope: string) => void;
  onNotebookCreate?: (parentId: string | null) => void;
  onNotebookRename?: (notebook: { id: string; name: string; parentId?: string | null }) => void;
  onNotebookDelete?: (notebook: { id: string; name: string; parentId?: string | null }) => void;
  labels?: NoteMenuOptions["labels"];
  className?: string;
}

/** Filters, notebooks (a tree) and tags. Each notebook has a context menu to rename or delete it. */
export function NotesSidebar({ notes, notebooks, scope, onScope, onNotebookCreate, onNotebookRename, onNotebookDelete, labels, className }: NotesSidebarProps) {
  const { t } = useNotesLabels(labels);
  const fmt = useFormatNumber();
  const counts = useMemo(() => scopeCounts(notes, notebooks), [notes, notebooks]);
  const tags = useMemo(() => tagCounts(notes), [notes]);
  const count = (key: string) => <span className="ms-auto text-caption text-muted-foreground">{fmt(counts[key] ?? 0)}</span>;

  const toNode = (node: NotebookNode): TreeNode => {
    const nb = node.notebook;
    const actions: NoteAction[] = [
      ...(onNotebookCreate ? [{ id: "sub", label: t.newNotebook, icon: FolderPlus, onSelect: () => onNotebookCreate(nb.id), group: "a" }] : []),
      ...(onNotebookRename ? [{ id: "rename", label: t.renameNotebook, icon: Pencil, onSelect: () => onNotebookRename(nb), group: "a" }] : []),
      ...(onNotebookDelete ? [{ id: "delete", label: t.deleteNotebook, icon: Trash2, danger: true, onSelect: () => onNotebookDelete(nb), group: "b" }] : []),
    ];
    return {
      id: notebookScope(nb.id),
      textValue: nb.name,
      icon: <BookOpen aria-hidden className="size-4" />,
      label: (
        <ContextMenuActions actions={actions} keyboard={false} render={<span className="flex min-w-0 flex-1 items-center gap-2" />}>
          <span dir="auto" className="min-w-0 flex-1 truncate">{nb.name}</span>
          {count(notebookScope(nb.id))}
        </ContextMenuActions>
      ),
      children: node.children.length ? node.children.map(toNode) : undefined,
    };
  };
  const items = useMemo(() => notebookTree(notebooks).map(toNode), [notebooks, counts]); // eslint-disable-line react-hooks/exhaustive-deps

  const filter = (key: string, label: string, icon: ReactNode) => (
    <button
      key={key}
      type="button"
      aria-pressed={scope === key}
      onClick={() => onScope(key)}
      className="flex h-control-sm items-center gap-2 rounded-control px-2.5 text-start text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:bg-nq-selected"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count(key)}
    </button>
  );

  return (
    <nav aria-label={t.scopes} data-slot="notes-sidebar" className={cn("min-h-0 w-56 shrink-0 flex-col gap-4 overflow-y-auto border-e border-border p-3", className)}>
      <div className="flex flex-col gap-0.5">
        {filter("all", t.all, <StickyNote aria-hidden className="size-4" />)}
        {filter("pinned", t.pinned, <Pin aria-hidden className="size-4" />)}
        {filter("sealed", t.sealed, <Lock aria-hidden className="size-4" />)}
        {filter("archive", t.archive, <Archive aria-hidden className="size-4" />)}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center px-2.5">
          <h3 className="flex-1 text-caption font-medium uppercase text-muted-foreground">{t.notebooks}</h3>
          {onNotebookCreate ? (
            <button type="button" aria-label={t.newNotebook} onClick={() => onNotebookCreate(null)} className="grid size-6 place-items-center rounded-control text-muted-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
              <FolderPlus aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>
        {items.length ? (
          <TreeView
            aria-label={t.notebooks}
            items={items}
            defaultExpanded={items.map((i) => i.id)}
            selected={scope.startsWith("nb:") ? [scope] : []}
            onSelectedChange={(ids) => ids[0] && onScope(ids[0])}
          />
        ) : (
          <p className="px-2.5 text-body-sm text-muted-foreground">{t.noNotebooks}</p>
        )}
      </div>
      {tags.length ? (
        <div className="flex flex-col gap-0.5">
          <h3 className="px-2.5 pb-1 text-caption font-medium uppercase text-muted-foreground">{t.tags}</h3>
          {tags.map((x) => filter(tagScope(x.tag), x.tag, <Tag aria-hidden className="size-4" />))}
        </div>
      ) : null}
    </nav>
  );
}
