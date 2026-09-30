"use client";

import { Archive, ArrowDownUp, FolderPlus, LayoutGrid, List, Lock, LockOpen, Pin, Plus, Search, X, Download, Pencil, Trash2 } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { ExportDialog } from "../export-action";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { formatRelativeTime, useFormatNumber } from "../numeric";
import { EmptyState, ErrorState, LoadingState } from "../states";
import { Toggle, ToggleGroup } from "../toggle-group";
import { NotebookDialog, type NotebookDialogState, type NoteResult } from "./notes-dialogs";
import { type NoteAction, NoteActionsMenu, NoteContextRegion, type NoteMenuApi, type NoteMenuOptions, useNoteMenu } from "./notes-menu";
import {
  bodyText,
  filterNotes,
  groupNotes,
  type Note,
  type NoteColor,
  type NoteGroupKind,
  notebookPath,
  notebookScope,
  notebookTree,
  type NoteSort,
  type NoteViewMode,
  type NotebookNode,
  scopeCounts,
  snippetOf,
  sortNotes,
  tagCounts,
  tagScope,
} from "./notes-model";
import { type NotesLabels, useNotesLabels } from "./notes-strings";

const SORTS: NoteSort[] = ["updated", "created", "title"];

/** The soft tint and border of a coloured note, from the `--nq-tag-*` tokens. */
export function noteTint(color: NoteColor | null | undefined) {
  return color
    ? { background: `var(--nq-tag-${color}-soft)`, borderColor: `color-mix(in oklab, var(--nq-tag-${color}) 45%, transparent)` }
    : undefined;
}

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (next: T) => void) {
  const [inner, setInner] = useState(defaultValue);
  const set = useCallback(
    (next: T) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  return [value ?? inner, set] as const;
}

export type NoteCreateResult = void | { id?: string; error?: string };

export interface NotesViewProps extends NoteMenuOptions {
  notes: readonly Note[];
  /** The open note, marked in the list. */
  activeId?: string | null;
  onOpen?: (id: string) => void;
  /** "New note". Resolve `{ error }` to report a failure. */
  onCreate?: () => Promise<NoteCreateResult> | void;
  /** The filter: `all`, `pinned`, `sealed`, `archive`, `nb:<id>` or `tag:<tag>`. */
  scope?: string;
  defaultScope?: string;
  onScopeChange?: (scope: string) => void;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  sort?: NoteSort;
  defaultSort?: NoteSort;
  onSortChange?: (sort: NoteSort) => void;
  /** `list` (rows) or `grid` (the coloured board). */
  view?: NoteViewMode;
  defaultView?: NoteViewMode;
  onViewChange?: (view: NoteViewMode) => void;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  /** Show the chips row of notebooks, tags and filters above the list. Default true. */
  showScopeBar?: boolean;
  scopeBarClassName?: string;
  onNotebookCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onNotebookRename?: (id: string, name: string) => Promise<NoteResult>;
  onNotebookDelete?: (id: string) => Promise<NoteResult>;
  /** Share one menu (and its dialogs) with a sibling `NoteEditor`, as `Notes` does. */
  menu?: NoteMenuApi;
  /** Reference time for "Today" and relative dates. Default now. */
  now?: number;
  className?: string;
}

/**
 * The notes list: search, sort, a list or coloured-board view, pinned and date sections, notebook and tag filters
 * and a context menu plus a "⋯" menu on every note. It stores nothing: pass `notes` and update them from the callbacks.
 */
export function NotesView(props: NotesViewProps) {
  const {
    notes,
    notebooks = [],
    unlocked = [],
    activeId,
    onOpen,
    onCreate,
    loading,
    error,
    onRetry,
    showScopeBar = true,
    scopeBarClassName,
    onNotebookCreate,
    onNotebookRename,
    onNotebookDelete,
    menu: menuProp,
    now,
    className,
    labels,
  } = props;
  const { t, locale } = useNotesLabels(labels);
  const fmt = useFormatNumber();
  const [scope, setScope] = useControllable(props.scope, props.defaultScope ?? "all", props.onScopeChange);
  const [query, setQuery] = useControllable(props.query, props.defaultQuery ?? "", props.onQueryChange);
  const [sort, setSort] = useControllable(props.sort, props.defaultSort ?? "updated", props.onSortChange);
  const [view, setView] = useControllable(props.view, props.defaultView ?? "list", props.onViewChange);
  const own = useNoteMenu({ ...props, notes: props.notes });
  const menu = menuProp ?? own;
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notebookDialog, setNotebookDialog] = useState<NotebookDialogState | null>(null);

  const counts = useMemo(() => scopeCounts(notes, notebooks), [notes, notebooks]);
  const shown = useMemo(() => sortNotes(filterNotes(notes, { scope, query, notebooks, unlocked }), sort, { locale, pinnedFirst: scope !== "archive" }), [notes, scope, query, notebooks, unlocked, sort, locale]);
  const groups = useMemo(() => groupNotes(shown, sort, now), [shown, sort, now]);
  const currentNotebook = scope.startsWith("nb:") ? notebooks.find((n) => n.id === scope.slice(3)) : undefined;

  const create = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await onCreate();
      if (result && result.error) setCreateError(result.error);
      else if (result && result.id) onOpen?.(result.id);
    } catch {
      setCreateError(t.failed);
    } finally {
      setCreating(false);
    }
  };

  const listActions: NoteAction[] = [
    ...(onNotebookCreate ? [{ id: "new-notebook", label: t.newNotebook, icon: FolderPlus, onSelect: () => setNotebookDialog({ kind: "create", parentId: currentNotebook?.id ?? null }), group: "notebooks" }] : []),
    ...(currentNotebook && onNotebookRename ? [{ id: "rename-notebook", label: t.renameNotebook, icon: Pencil, onSelect: () => setNotebookDialog({ kind: "rename", notebook: currentNotebook }), group: "notebooks" }] : []),
    ...(currentNotebook && onNotebookDelete ? [{ id: "delete-notebook", label: t.deleteNotebook, icon: Trash2, danger: true, onSelect: () => setNotebookDialog({ kind: "delete", notebook: currentNotebook }), group: "danger" }] : []),
    { id: "export-all", label: t.exportAll, icon: Download, onSelect: () => setExporting(true), group: "export", disabled: !notes.length },
  ];

  const emptyFor = (): { title: string; hint: string; action?: ReactNode } => {
    if (query.trim()) return { title: t.noMatches, hint: t.noMatchesHint, action: <Button variant="secondary" size="sm" onClick={() => setQuery("")}>{t.clearSearch}</Button> };
    if (scope === "archive") return { title: t.emptyArchive, hint: t.emptyArchiveHint };
    if (scope === "sealed") return { title: t.emptySealed, hint: t.emptySealedHint };
    if (scope === "pinned") return { title: t.emptyPinned, hint: t.emptyPinnedHint };
    return { title: t.empty, hint: t.emptyHint, action: onCreate ? <Button variant="primary" size="sm" onClick={create}><Plus aria-hidden />{t.newNote}</Button> : undefined };
  };

  const onRowKey = (event: KeyboardEvent<HTMLElement>, note: Note) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const items = [...(event.currentTarget.closest("ul")?.querySelectorAll<HTMLElement>("[data-slot=note-open]") ?? [])];
      const next = items[items.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)];
      if (next) {
        next.focus();
        event.preventDefault();
      }
    } else if (event.key === "Delete" && !event.shiftKey && menu.actionsFor(note).some((a) => a.id === "delete")) {
      event.preventDefault();
      menu.openDialog("delete", note);
    }
  };

  const renderNote = (note: Note) => {
    const locked = menu.isLocked(note);
    const actions = menu.actionsFor(note, { onOpen });
    const title = note.title.trim() || t.untitled;
    const open = () => onOpen?.(note.id);
    const path = notebookPath(notebooks, note.notebookId);
    const when = formatRelativeTime(note.updatedAt, locale, { now });
    const lead = (
      <>
        {note.sealed ? (locked ? <Lock aria-label={t.sealedNote} className="size-3.5 shrink-0 text-muted-foreground" /> : <LockOpen aria-label={t.unlockedBanner} className="size-3.5 shrink-0 text-muted-foreground" />) : null}
        {note.pinned ? <Pin aria-label={t.pinnedBadge} className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      </>
    );
    const body = locked ? (
      <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
        <Lock aria-hidden className="size-3.5" />
        {t.sealedHint}
      </span>
    ) : null;
    const snippet = body ?? <span className={cn("text-body-sm text-muted-foreground", view === "grid" ? "line-clamp-6" : "line-clamp-2")}>{snippetOf(note, view === "grid" ? 260 : 140)}</span>;
    const meta = (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {path.length ? (
          <Badge variant="outline" className="max-w-full">
            <span className="truncate">{path.join(" / ")}</span>
          </Badge>
        ) : null}
        {(note.tags ?? []).slice(0, 3).map((tag) => (
          <Badge key={tag} variant="neutral" className="max-w-32">
            <span className="truncate">{tag}</span>
          </Badge>
        ))}
      </span>
    );
    const controls = (
      <NoteActionsMenu
        actions={actions}
        label={t.actionsFor(title)}
        className="absolute end-1.5 top-1.5 opacity-0 transition-opacity group-hover/note:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
      />
    );
    if (view === "grid") {
      return (
        <NoteContextRegion
          key={note.id}
          actions={actions}
          focusTarget={(el) => el.querySelector<HTMLElement>("[data-slot=note-open]")}
          render={
            <li
              data-slot="note-card"
              data-active={note.id === activeId ? "" : undefined}
              data-color={note.color ?? undefined}
              style={noteTint(note.color)}
              className="group/note relative flex min-h-32 min-w-0 flex-col rounded-card border border-border bg-card transition-shadow duration-150 ease-nq hover:shadow-sm data-active:outline-2 data-active:outline-nq-focus"
            />
          }
        >
          <button type="button" data-slot="note-open" aria-current={note.id === activeId ? "true" : undefined} onClick={open} onKeyDown={(e) => onRowKey(e, note)} className="flex min-w-0 flex-1 flex-col gap-2 rounded-card p-3 text-start focus-visible:outline-2 focus-visible:outline-nq-focus">
            <span className="flex min-w-0 items-center gap-1.5 pe-8">
              {lead}
              <span dir="auto" className="min-w-0 flex-1 truncate text-label text-foreground">{title}</span>
            </span>
            <span dir="auto">{snippet}</span>
            <span className="mt-auto flex min-w-0 flex-col gap-1.5 pt-1">
              {meta}
              <span className="text-caption text-muted-foreground">{when}</span>
            </span>
          </button>
          {controls}
        </NoteContextRegion>
      );
    }
    return (
      <NoteContextRegion
        key={note.id}
        actions={actions}
        focusTarget={(el) => el.querySelector<HTMLElement>("[data-slot=note-open]")}
        render={
          <li
            data-slot="note-row"
            data-active={note.id === activeId ? "" : undefined}
            data-color={note.color ?? undefined}
            className="group/note relative rounded-control border-s-[3px] border-transparent hover:bg-nq-hover data-active:bg-nq-selected"
            style={note.color ? { borderInlineStartColor: `var(--nq-tag-${note.color})` } : undefined}
          />
        }
      >
        <button type="button" data-slot="note-open" aria-current={note.id === activeId ? "true" : undefined} onClick={open} onKeyDown={(e) => onRowKey(e, note)} className="flex w-full min-w-0 flex-col gap-1 rounded-control px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
          <span className="flex min-w-0 items-center gap-1.5 pe-8">
            {lead}
            <span dir="auto" className="min-w-0 flex-1 truncate text-label text-foreground">{title}</span>
            <span className="shrink-0 text-caption text-muted-foreground">{when}</span>
          </span>
          <span dir="auto">{snippet}</span>
          {path.length || note.tags?.length ? meta : null}
        </button>
        {controls}
      </NoteContextRegion>
    );
  };

  const groupLabel = (kind: NoteGroupKind) => t.groups[kind];
  const emptyState = emptyFor();

  return (
    <section data-slot="notes-view" data-view={view} aria-label={t.notes} className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <InputGroup>
          <InputGroupAddon>
            <Search aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput data-slot="notes-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.search} />
          {query ? (
            <InputGroupAddon align="end">
              <Button variant="ghost" size="icon-sm" aria-label={t.clearSearch} onClick={() => setQuery("")}>
                <X aria-hidden />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        <div className="flex flex-wrap items-center gap-2">
          {onCreate ? (
            <Button variant="primary" size="sm" loading={creating} onClick={create} data-slot="notes-new">
              <Plus aria-hidden />
              {t.newNote}
            </Button>
          ) : null}
          <span className="ms-auto" />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${t.sortBy}: ${t.sort[sort]}`} className="text-muted-foreground" />}>
              <ArrowDownUp aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t.sortBy}</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as NoteSort)}>
                  {SORTS.map((s) => (
                    <DropdownMenuRadioItem key={s} value={s}>
                      {t.sort[s]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0] as NoteViewMode)} aria-label={t.viewMode}>
            <Toggle value="list" aria-label={t.viewList}>
              <List aria-hidden />
            </Toggle>
            <Toggle value="grid" aria-label={t.viewGrid}>
              <LayoutGrid aria-hidden />
            </Toggle>
          </ToggleGroup>
          <NoteActionsMenu actions={listActions} label={t.listActions} />
        </div>
        {createError ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {createError}
          </p>
        ) : null}
      </div>

      {showScopeBar ? <ScopeBar scope={scope} onScope={setScope} notes={notes} notebooks={notebooks} counts={counts} labels={labels} className={scopeBarClassName} /> : null}

      <div data-slot="notes-list" className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <LoadingState label={t.loading} rows={5} />
        ) : error ? (
          <ErrorState title={t.failed} description={error} actions={onRetry ? <Button variant="secondary" size="sm" onClick={onRetry}>{t.retry}</Button> : undefined} />
        ) : !shown.length ? (
          <EmptyState title={emptyState.title} description={emptyState.hint} actions={emptyState.action} />
        ) : (
          groups.map((group) => (
            <div key={group.kind} data-slot="note-group" data-group={group.kind} className="flex flex-col gap-1">
              {group.kind === "all" ? null : (
                <h3 className="flex items-center gap-1.5 px-3 pb-1 pt-3 text-caption font-medium uppercase text-muted-foreground">
                  {group.kind === "pinned" ? <Pin aria-hidden className="size-3" /> : null}
                  {groupLabel(group.kind)}
                  <span className="font-normal">{fmt(group.notes.length)}</span>
                </h3>
              )}
              <ul role="list" aria-label={groupLabel(group.kind)} className={cn(view === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] gap-2.5 px-1" : "flex flex-col gap-0.5")}>
                {group.notes.map(renderNote)}
              </ul>
            </div>
          ))
        )}
      </div>

      {menuProp ? null : own.dialogs}
      {exporting ? (
        <ExportDialog
          open
          onOpenChange={(o) => !o && setExporting(false)}
          filename="notes"
          formats={["csv", "xlsx", "json"]}
          columns={[
            { id: "title", label: t.exportColumns.title },
            { id: "notebook", label: t.exportColumns.notebook, value: (n: Note) => notebookPath(notebooks, n.notebookId).join(" / ") },
            { id: "tags", label: t.exportColumns.tags, value: (n: Note) => (n.tags ?? []).join(", ") },
            { id: "pinned", label: t.exportColumns.pinned, value: (n: Note) => (n.pinned ? "1" : "0") },
            { id: "created", label: t.exportColumns.created, value: (n: Note) => new Date(n.createdAt).toISOString() },
            { id: "updated", label: t.exportColumns.updated, value: (n: Note) => new Date(n.updatedAt).toISOString() },
            { id: "text", label: t.exportColumns.text, value: (n: Note) => (n.sealed && !unlocked.includes(n.id) ? "" : bodyText(n)) },
          ]}
          scopes={{ filtered: shown as Note[], all: notes as Note[] }}
          defaultScope="filtered"
        />
      ) : null}
      {notebookDialog ? (
        <NotebookDialog
          key={`${notebookDialog.kind}-${notebookDialog.notebook?.id ?? ""}`}
          state={notebookDialog}
          onClose={() => setNotebookDialog(null)}
          notebooks={notebooks}
          onCreate={onNotebookCreate}
          onRename={onNotebookRename}
          onDelete={async (id) => {
            const result = await onNotebookDelete?.(id);
            if (!(result && result.error)) {
              setNotebookDialog(null);
              if (scope === notebookScope(id)) setScope("all");
            }
            return result;
          }}
          labels={labels}
        />
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ scope bar */

function flatten(nodes: NotebookNode[]): NotebookNode["notebook"][] {
  return nodes.flatMap((n) => [n.notebook, ...flatten(n.children)]);
}

/** A row of chips: All, Pinned, Sealed, each notebook, each tag and Archive. The sidebar does the same job on wide screens. */
export function ScopeBar({ scope, onScope, notes, notebooks, counts, labels, className }: { scope: string; onScope: (scope: string) => void; notes: readonly Note[]; notebooks: readonly NotebookNode["notebook"][]; counts: Record<string, number>; labels?: Partial<NotesLabels>; className?: string }) {
  const { t } = useNotesLabels(labels);
  const fmt = useFormatNumber();
  const items = [
    { id: "all", label: t.all },
    { id: "pinned", label: t.pinned },
    { id: "sealed", label: t.sealed },
    ...flatten(notebookTree(notebooks)).map((n) => ({ id: notebookScope(n.id), label: n.name })),
    ...tagCounts(notes).map((x) => ({ id: tagScope(x.tag), label: `#${x.tag}` })),
    { id: "archive", label: t.archive },
  ];
  return (
    <div role="group" aria-label={t.scopes} data-slot="notes-scope-bar" className={cn("flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={scope === item.id}
          onClick={() => onScope(item.id)}
          className="inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-control border border-border bg-card px-2.5 text-label text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus aria-pressed:border-primary aria-pressed:bg-nq-selected"
        >
          {item.id === "archive" ? <Archive aria-hidden className="size-3.5" /> : null}
          {item.label}
          <span className="text-caption text-muted-foreground">{fmt(counts[item.id] ?? 0)}</span>
        </button>
      ))}
    </div>
  );
}

