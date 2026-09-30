"use client";

import { Archive, ArchiveRestore, Copy, Ellipsis, FileText, FolderInput, Lock, LockOpen, Palette, Pin, PinOff, Share2, Tag, Trash2, Download } from "lucide-react";
import { type ReactElement, type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useModKeyLabel } from "../../lib/hotkey";
import { Button, type ButtonProps } from "../button";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { groupActions } from "../context-menu";
import { NoteDialogs, type NoteDialogKind, type NoteDialogState, type NoteResult, type NoteDialogsProps } from "./notes-dialogs";
import { duplicateNote, type Note, type NoteExportFormat, type NoteFile, type NotePatch, type Notebook } from "./notes-model";
import { type NotesLabels, useNotesLabels } from "./notes-strings";

/** An action in the note menus. The context menu ignores `shortcut`; the actions menu shows it. */
export interface NoteAction extends ContextMenuAction {
  shortcut?: string;
}

/**
 * The callbacks and data every note menu needs. They are shared by `NotesView`, `NoteEditor` and `Notes`, so the row
 * menu, the editor menu and the shortcuts all run the same actions. An action whose callback is missing is left out.
 */
export interface NoteMenuOptions {
  notebooks?: readonly Notebook[];
  /** All notes: the tag suggestions and the backlinks read from it. */
  notes?: readonly Note[];
  /** Ids of sealed notes that are open right now. */
  unlocked?: readonly string[];
  /** Pin, archive, colour, tags, move, title and body all go through this, with only the changed fields. */
  onUpdate?: (id: string, patch: NotePatch) => Promise<NoteResult>;
  /** Called with the copy (a new id is made by `newId`). Insert it and return. */
  onDuplicate?: (copy: Note) => Promise<NoteResult>;
  /** Makes the id of a duplicate. Default: `crypto.randomUUID()`. */
  newId?: () => string;
  onDelete?: (id: string) => Promise<NoteResult>;
  /** Seal a note with a password. Never send the password anywhere but your own server. */
  onSeal?: (id: string, password: string) => Promise<NoteResult>;
  /** Remove the seal. Return `{ error }` for a wrong password. */
  onRemoveSeal?: (id: string, password: string) => Promise<NoteResult>;
  /** Lock an open sealed note again (the view forgets the password). */
  onLock?: (id: string) => void;
  /** The link the Share dialog offers for a note. Without it there is no Share action. */
  shareUrl?: (note: Note) => string;
  /** More Share dialog props: people, roles, `onInvite`, link access. */
  shareProps?: NoteDialogsProps["shareProps"];
  /** Replaces the browser download of an exported note. */
  onExport?: (note: Note, format: NoteExportFormat, file: NoteFile) => void | Promise<void>;
  labels?: Partial<NotesLabels>;
}

export interface NoteMenuApi {
  /** The actions for one note. `inEditor` leaves out "Open". */
  actionsFor: (note: Note, options?: { inEditor?: boolean; onOpen?: (id: string) => void }) => NoteAction[];
  /** Runs a shortcut for a note (pin, archive, duplicate, seal). Returns false when it does not apply. */
  runShortcut: (note: Note, shortcut: "pin" | "archive" | "duplicate" | "seal") => boolean;
  openDialog: (kind: NoteDialogKind, note: Note) => void;
  /** Render once, next to the surfaces that use the menu. */
  dialogs: ReactNode;
  isLocked: (note: Note) => boolean;
}

export function useNoteMenu(options: NoteMenuOptions): NoteMenuApi {
  const { notebooks = [], notes = [], unlocked = [], onUpdate, onDuplicate, newId, onDelete, onSeal, onRemoveSeal, onLock, shareUrl, shareProps, onExport, labels } = options;
  const { t } = useNotesLabels(labels);
  const mod = useModKeyLabel();
  const [state, setState] = useState<NoteDialogState | null>(null);
  const isLocked = useCallback((note: Note) => !!note.sealed && !unlocked.includes(note.id), [unlocked]);
  const openDialog = useCallback((kind: NoteDialogKind, note: Note) => setState({ kind, note }), []);

  const duplicate = useCallback(
    (note: Note) => {
      const id = newId ? newId() : typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n-${Date.now()}`;
      return onDuplicate?.(duplicateNote(note, { id, suffix: t.copySuffix }));
    },
    [newId, onDuplicate, t.copySuffix],
  );

  const actionsFor = useCallback<NoteMenuApi["actionsFor"]>(
    (note, { inEditor = false, onOpen } = {}) => {
      const locked = isLocked(note);
      const list: NoteAction[] = [];
      const add = (a: NoteAction | false | undefined | null) => a && list.push(a);
      add(!inEditor && !!onOpen && { id: "open", label: t.open, icon: FileText, onSelect: () => onOpen(note.id), group: "open" });
      add(!!onUpdate && { id: "pin", label: note.pinned ? t.unpin : t.pin, icon: note.pinned ? PinOff : Pin, onSelect: () => void onUpdate(note.id, { pinned: !note.pinned }), group: "organise", shortcut: `${mod}+Shift+P` });
      add(!!onUpdate && { id: "color", label: t.color, icon: Palette, onSelect: () => openDialog("color", note), group: "organise" });
      add(!!onUpdate && { id: "tags", label: t.editTags, icon: Tag, onSelect: () => openDialog("tags", note), group: "organise" });
      add(!!onUpdate && { id: "move", label: t.move, icon: FolderInput, onSelect: () => openDialog("move", note), group: "organise" });
      add(!!onDuplicate && { id: "duplicate", label: t.duplicate, icon: Copy, onSelect: () => void duplicate(note), group: "share", disabled: locked || !!note.sealed, shortcut: `${mod}+Shift+D` });
      add(!!shareUrl && { id: "share", label: t.share, icon: Share2, onSelect: () => openDialog("share", note), group: "share", disabled: locked });
      add({ id: "export", label: t.export, icon: Download, onSelect: () => openDialog("export", note), group: "share", disabled: locked });
      if (note.sealed) {
        add(!locked && !!onLock && { id: "lock", label: t.lockNow, icon: Lock, onSelect: () => onLock?.(note.id), group: "protect", shortcut: `${mod}+Shift+L` });
        add(!!onRemoveSeal && { id: "unseal", label: t.removeSeal, icon: LockOpen, onSelect: () => openDialog("unseal", note), group: "protect" });
      } else add(!!onSeal && { id: "seal", label: t.seal, icon: Lock, onSelect: () => openDialog("seal", note), group: "protect", shortcut: `${mod}+Shift+L` });
      add(!!onUpdate && { id: "archive", label: note.archived ? t.restore : t.archiveNote, icon: note.archived ? ArchiveRestore : Archive, onSelect: () => void onUpdate(note.id, { archived: !note.archived }), group: "protect", shortcut: `${mod}+Shift+A` });
      add(!!onDelete && { id: "delete", label: t.deleteNote, icon: Trash2, onSelect: () => openDialog("delete", note), danger: true, group: "danger" });
      return list;
    },
    [isLocked, t, onUpdate, onDuplicate, onDelete, onSeal, onRemoveSeal, onLock, shareUrl, mod, openDialog, duplicate],
  );

  const runShortcut = useCallback<NoteMenuApi["runShortcut"]>(
    (note, shortcut) => {
      const id = shortcut === "seal" ? (note.sealed ? (isLocked(note) ? "unseal" : "lock") : "seal") : shortcut;
      const action = actionsFor(note, { inEditor: true }).find((a) => a.id === id);
      if (!action || action.disabled) return false;
      action.onSelect();
      return true;
    },
    [actionsFor, isLocked],
  );

  const dialogs = useMemo(
    () => (
      <NoteDialogs
        state={state}
        onClose={() => setState(null)}
        labels={labels}
        notebooks={notebooks}
        notes={notes}
        onUpdate={onUpdate}
        onDelete={async (id) => {
          const result = await onDelete?.(id);
          if (!(result && result.error)) setState(null);
          return result;
        }}
        onSeal={onSeal}
        onRemoveSeal={onRemoveSeal}
        shareUrl={shareUrl}
        shareProps={shareProps}
        onExport={onExport}
      />
    ),
    [state, labels, notebooks, notes, onUpdate, onDelete, onSeal, onRemoveSeal, shareUrl, shareProps, onExport],
  );

  return { actionsFor, runShortcut, openDialog, dialogs, isLocked };
}

/** A "⋯" button that opens a note's actions as a dropdown. The same list backs the context menu. */
export function NoteActionsMenu({
  actions,
  label,
  variant = "ghost",
  size = "icon-sm",
  className,
  icon,
  open,
  onOpenChange,
  align = "end",
  ...rest
}: {
  actions: readonly NoteAction[];
  label: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  icon?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "end";
} & { tabIndex?: number; "data-slot"?: string }) {
  if (!actions.length) return null;
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={<Button variant={variant} size={size} aria-label={label} className={cn("text-muted-foreground", className)} data-slot="note-actions-trigger" {...rest} />}>
        {icon ?? <Ellipsis aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-52">
        {groupActions(actions).map((items, i) => (
          <DropdownMenuGroup key={i}>
            {i > 0 ? <DropdownMenuSeparator /> : null}
            {items.map((a) => {
              const Glyph = a.icon as React.ElementType | undefined;
              return (
                <DropdownMenuItem key={a.id} variant={a.danger ? "danger" : "default"} disabled={a.disabled} onClick={a.onSelect} shortcut={a.shortcut}>
                  {Glyph ? <Glyph aria-hidden /> : null}
                  {a.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Makes an element the context-menu region of a note (context-click, long-press, Shift+F10, Menu key). */
export function NoteContextRegion({ actions, render, children, focusTarget, className }: { actions: readonly NoteAction[]; render: ReactElement; children?: ReactNode; focusTarget?: (trigger: HTMLElement) => HTMLElement | null | undefined; className?: string }) {
  return (
    <ContextMenuActions actions={actions} render={render} focusTarget={focusTarget} className={className}>
      {children}
    </ContextMenuActions>
  );
}
