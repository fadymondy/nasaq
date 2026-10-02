import { Archive, ArchiveRestore, Copy, Download, FileText, FolderInput, Lock, LockOpen, Palette, Pin, PinOff, Share2, Tag, Trash2 } from "lucide-vue-next";
import { ref, type Ref } from "vue";
import { isApplePlatform } from "../commands";
import type { ContextMenuAction } from "../context-menu";
import { duplicateNote, type Note, type NoteExportFormat, type NoteFile, type NotePatch, type Notebook } from "./notes-model";
import { useNotesLabels, type NotesLabels } from "./strings";

export type NoteResult = void | { error?: string };
export type NoteCreateResult = void | { id?: string; error?: string };
export const resultError = (r: unknown): string | null => (r && typeof r === "object" && "error" in r && (r as { error?: string }).error ? (r as { error: string }).error : null);

/** An action in the note menus. The context menu ignores `shortcut`; the actions menu shows it. */
export interface NoteAction extends ContextMenuAction {
  shortcut?: string;
}

export type NoteDialogKind = "move" | "tags" | "color" | "share" | "export" | "seal" | "unseal" | "delete";
export interface NoteDialogState {
  kind: NoteDialogKind;
  note: Note;
}

/**
 * The callbacks and data every note menu needs. They are shared by NqNotesView, NqNoteEditor and NqNotes, so the row menu,
 * the editor menu and the shortcuts all run the same actions. An action whose callback is missing is left out.
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
  shareProps?: Record<string, unknown>;
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
  closeDialog: () => void;
  /** The open dialog. NqNoteDialogs draws it; render it once, next to the surfaces that use the menu. */
  state: Ref<NoteDialogState | null>;
  /** The live options (the dialogs read their callbacks from here). */
  options: () => NoteMenuOptions;
  isLocked: (note: Note) => boolean;
}

/** The note actions, the shortcuts and the open dialog. `options` is read on every use, so pass `() => props`. */
export function useNoteMenu(options: () => NoteMenuOptions): NoteMenuApi {
  const state = ref<NoteDialogState | null>(null);
  const { t } = useNotesLabels(() => options().labels);
  const isLocked = (note: Note) => !!note.sealed && !(options().unlocked ?? []).includes(note.id);
  const openDialog = (kind: NoteDialogKind, note: Note) => {
    state.value = { kind, note };
  };
  const closeDialog = () => {
    state.value = null;
  };

  function duplicate(note: Note) {
    const o = options();
    const id = o.newId ? o.newId() : typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `n-${Date.now()}`;
    return o.onDuplicate?.(duplicateNote(note, { id, suffix: t.value.copySuffix }));
  }

  function actionsFor(note: Note, { inEditor = false, onOpen }: { inEditor?: boolean; onOpen?: (id: string) => void } = {}): NoteAction[] {
    const o = options();
    const s = t.value;
    const mod = isApplePlatform() ? "⌘" : "Ctrl";
    const locked = isLocked(note);
    const list: NoteAction[] = [];
    const add = (a: NoteAction | false | undefined | null) => a && list.push(a);
    const update = o.onUpdate;
    add(!inEditor && !!onOpen && { id: "open", label: s.open, icon: FileText, onSelect: () => onOpen(note.id), group: "open" });
    add(!!update && { id: "pin", label: note.pinned ? s.unpin : s.pin, icon: note.pinned ? PinOff : Pin, onSelect: () => void update(note.id, { pinned: !note.pinned }), group: "organise", shortcut: `${mod}+Shift+P` });
    add(!!update && { id: "color", label: s.color, icon: Palette, onSelect: () => openDialog("color", note), group: "organise" });
    add(!!update && { id: "tags", label: s.editTags, icon: Tag, onSelect: () => openDialog("tags", note), group: "organise" });
    add(!!update && { id: "move", label: s.move, icon: FolderInput, onSelect: () => openDialog("move", note), group: "organise" });
    add(!!o.onDuplicate && { id: "duplicate", label: s.duplicate, icon: Copy, onSelect: () => void duplicate(note), group: "share", disabled: locked || !!note.sealed, shortcut: `${mod}+Shift+D` });
    add(!!o.shareUrl && { id: "share", label: s.share, icon: Share2, onSelect: () => openDialog("share", note), group: "share", disabled: locked });
    add({ id: "export", label: s.export, icon: Download, onSelect: () => openDialog("export", note), group: "share", disabled: locked });
    if (note.sealed) {
      add(!locked && !!o.onLock && { id: "lock", label: s.lockNow, icon: Lock, onSelect: () => o.onLock?.(note.id), group: "protect", shortcut: `${mod}+Shift+L` });
      add(!!o.onRemoveSeal && { id: "unseal", label: s.removeSeal, icon: LockOpen, onSelect: () => openDialog("unseal", note), group: "protect" });
    } else add(!!o.onSeal && { id: "seal", label: s.seal, icon: Lock, onSelect: () => openDialog("seal", note), group: "protect", shortcut: `${mod}+Shift+L` });
    add(!!update && { id: "archive", label: note.archived ? s.restore : s.archiveNote, icon: note.archived ? ArchiveRestore : Archive, onSelect: () => void update(note.id, { archived: !note.archived }), group: "protect", shortcut: `${mod}+Shift+A` });
    add(!!o.onDelete && { id: "delete", label: s.deleteNote, icon: Trash2, onSelect: () => openDialog("delete", note), danger: true, group: "danger" });
    return list;
  }

  function runShortcut(note: Note, shortcut: "pin" | "archive" | "duplicate" | "seal"): boolean {
    const id = shortcut === "seal" ? (note.sealed ? (isLocked(note) ? "unseal" : "lock") : "seal") : shortcut;
    const action = actionsFor(note, { inEditor: true }).find((a) => a.id === id);
    if (!action || action.disabled) return false;
    action.onSelect();
    return true;
  }

  return { actionsFor, runShortcut, openDialog, closeDialog, state, options, isLocked };
}
