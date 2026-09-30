"use client";

import { Check, FolderOpen, Notebook as NotebookIcon } from "lucide-react";
import { type FormEvent, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Button } from "../button";
import { ColorPicker, tagSwatches } from "../color-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { saveExportBlob } from "../export-action";
import { Input } from "../field";
import { PasswordInput } from "../password-input";
import { ShareDialog, type ShareDialogProps } from "../share-action";
import { TagInput } from "../tag-input";
import { exportNote, type Note, type NoteColor, noteExportFormats, type NoteExportFormat, type NoteFile, type NotePatch, type Notebook, notebookTree, type NotebookNode, tagCounts } from "./notes-model";
import { type NotesLabels, useNotesLabels } from "./notes-strings";

export type NoteResult = void | { error?: string };

export type NoteDialogKind = "move" | "tags" | "color" | "share" | "export" | "seal" | "unseal" | "delete";
export interface NoteDialogState {
  kind: NoteDialogKind;
  note: Note;
}

export interface NoteDialogsProps {
  state: NoteDialogState | null;
  onClose: () => void;
  labels?: Partial<NotesLabels>;
  notebooks: readonly Notebook[];
  notes: readonly Note[];
  onUpdate?: (id: string, patch: NotePatch) => Promise<NoteResult>;
  onDelete?: (id: string) => Promise<NoteResult>;
  onSeal?: (id: string, password: string) => Promise<NoteResult>;
  onRemoveSeal?: (id: string, password: string) => Promise<NoteResult>;
  shareUrl?: (note: Note) => string;
  shareProps?: Omit<ShareDialogProps, "open" | "onOpenChange" | "url" | "title">;
  onExport?: (note: Note, format: NoteExportFormat, file: NoteFile) => void | Promise<void>;
}

/** Runs a callback that may resolve to `{ error }`, tracking the busy state and the message. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<NoteResult> | NoteResult | void, failed: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result && typeof result === "object" && result.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch {
      setError(failed);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

function flattenNotebooks(nodes: NotebookNode[], depth = 0): { notebook: Notebook; depth: number }[] {
  return nodes.flatMap((n) => [{ notebook: n.notebook, depth }, ...flattenNotebooks(n.children, depth + 1)]);
}

const ErrorLine = ({ id, children }: { id?: string; children?: string | null }) =>
  children ? (
    <p id={id} role="alert" className="text-body-sm text-nq-danger-text">
      {children}
    </p>
  ) : null;

/** The dialogs behind the note actions: move, tags, colour, share, export, seal, remove seal and delete. One at a time. */
export function NoteDialogs(props: NoteDialogsProps) {
  const { state } = props;
  if (!state) return null;
  const common = { ...props, note: state.note };
  switch (state.kind) {
    case "move":
      return <MoveDialog {...common} />;
    case "tags":
      return <TagsDialog {...common} />;
    case "color":
      return <ColorDialog {...common} />;
    case "share":
      return <NoteShareDialog {...common} />;
    case "export":
      return <NoteExportDialog {...common} />;
    case "seal":
    case "unseal":
      return <SealDialog {...common} mode={state.kind} />;
    case "delete":
      return <DeleteDialog {...common} />;
  }
}

type DialogProps = NoteDialogsProps & { note: Note };

function MoveDialog({ note, notebooks, onUpdate, onClose, labels }: DialogProps) {
  const { t } = useNotesLabels(labels);
  const { busy, error, run } = useAction();
  const options = useMemo(() => flattenNotebooks(notebookTree(notebooks)), [notebooks]);
  const current = note.notebookId ?? null;
  const pick = async (id: string | null) => {
    if (id === current) return onClose();
    if (await run(() => onUpdate?.(note.id, { notebookId: id }), t.failed)) onClose();
  };
  const rows: { id: string | null; label: string; depth: number }[] = [{ id: null, label: t.moveNone, depth: 0 }, ...options.map((o) => ({ id: o.notebook.id, label: o.notebook.name, depth: o.depth }))];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-slot="note-move-dialog">
        <DialogHeader>
          <DialogTitle>{t.moveTitle}</DialogTitle>
          <DialogDescription>{note.title || t.untitled}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t.moveTitle} className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          {rows.map((row) => (
            <button
              key={row.id ?? "none"}
              type="button"
              role="radio"
              aria-checked={row.id === current}
              disabled={busy}
              onClick={() => pick(row.id)}
              style={{ paddingInlineStart: `${0.5 + row.depth * 1.25}rem` }}
              className="flex h-nav-row items-center gap-2 rounded-control pe-2 text-start text-body-sm text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-ring aria-checked:bg-nq-selected [&_svg]:size-4 [&_svg]:text-muted-foreground"
            >
              {row.id === null ? <FolderOpen aria-hidden /> : <NotebookIcon aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {row.id === current ? <Check aria-hidden className="text-foreground" /> : null}
            </button>
          ))}
        </div>
        <ErrorLine>{error}</ErrorLine>
      </DialogContent>
    </Dialog>
  );
}

function TagsDialog({ note, notes, onUpdate, onClose, labels }: DialogProps) {
  const { t } = useNotesLabels(labels);
  const { busy, error, run } = useAction();
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const suggestions = useMemo(() => tagCounts(notes).map((x) => x.tag), [notes]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => onUpdate?.(note.id, { tags }), t.failed)) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-slot="note-tags-dialog">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.tagsTitle}</DialogTitle>
            <DialogDescription>{note.title || t.untitled}</DialogDescription>
          </DialogHeader>
          <TagInput value={tags} onValueChange={setTags} suggestions={suggestions} placeholder={t.tagsPlaceholder} inputProps={{ "aria-label": t.tagsTitle }} />
          <ErrorLine>{error}</ErrorLine>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ColorDialog({ note, onUpdate, onClose, labels }: DialogProps) {
  const { t, locale } = useNotesLabels(labels);
  const { busy, error, run } = useAction();
  const set = async (color: NoteColor | null) => {
    if (await run(() => onUpdate?.(note.id, { color }), t.failed)) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-slot="note-color-dialog">
        <DialogHeader>
          <DialogTitle>{t.colorTitle}</DialogTitle>
          <DialogDescription>{note.title || t.untitled}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <ColorPicker
            value={note.color ? `--nq-tag-${note.color}` : null}
            onValueChange={(v) => set(v.replace("--nq-tag-", "") as NoteColor)}
            swatches={tagSwatches(locale)}
            allowHex={false}
            allowNative={false}
            disabled={busy}
            locale={locale}
            aria-label={t.colorTitle}
          />
          <Button type="button" variant="ghost" size="sm" disabled={busy || !note.color} onClick={() => set(null)}>
            {t.noColor}
          </Button>
        </div>
        <ErrorLine>{error}</ErrorLine>
      </DialogContent>
    </Dialog>
  );
}

function NoteShareDialog({ note, shareUrl, shareProps, onClose, labels }: DialogProps) {
  const { t } = useNotesLabels(labels);
  if (!shareUrl) return null;
  return <ShareDialog {...shareProps} open onOpenChange={(open) => !open && onClose()} url={shareUrl(note)} title={note.title || t.untitled} />;
}

function NoteExportDialog({ note, onExport, onClose, labels }: DialogProps) {
  const { t } = useNotesLabels(labels);
  const { busy, error, run } = useAction();
  const formats = noteExportFormats(note);
  const [format, setFormat] = useState<NoteExportFormat>(formats[0] ?? "text");
  const download = async () => {
    const file = exportNote(note, format);
    const ok = await run(async () => {
      if (onExport) await onExport(note, format, file);
      else saveExportBlob(new Blob([file.content], { type: file.mime }), file.filename);
    }, t.failed);
    if (ok) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-slot="note-export-dialog">
        <DialogHeader>
          <DialogTitle>{t.exportTitle}</DialogTitle>
          <DialogDescription>{t.exportHint}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t.exportTitle} className="flex flex-col gap-1">
          {formats.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={f === format}
              onClick={() => setFormat(f)}
              className="flex h-nav-row items-center gap-2 rounded-control px-2 text-start text-body-sm text-foreground hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-ring aria-checked:bg-nq-selected"
            >
              <span className="flex-1">{t.exportFormats[f]}</span>
              {f === format ? <Check aria-hidden className="size-4" /> : null}
            </button>
          ))}
        </div>
        <ErrorLine>{error}</ErrorLine>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button type="button" variant="primary" loading={busy} onClick={download}>
            {t.exportDownload}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SealDialog({ note, mode, onSeal, onRemoveSeal, onClose, labels }: DialogProps & { mode: "seal" | "unseal" }) {
  const { t } = useNotesLabels(labels);
  const { busy, error, run, setError } = useAction();
  const id = useId();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const sealing = mode === "seal";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sealing) {
      if (password.length < 4) return setError(t.passwordShort);
      if (password !== repeat) return setError(t.passwordMismatch);
    } else if (!password) return;
    if (await run(() => (sealing ? onSeal?.(note.id, password) : onRemoveSeal?.(note.id, password)), t.failed)) onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-slot="note-seal-dialog">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{sealing ? t.sealTitle : t.unsealTitle}</DialogTitle>
            <DialogDescription>{sealing ? t.sealBody : t.unsealBody}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-pw`} className="text-label text-foreground">
              {t.password}
            </label>
            <PasswordInput id={`${id}-pw`} autoFocus autoComplete={sealing ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} showStrength={sealing} dir="ltr" />
          </div>
          {sealing ? (
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-pw2`} className="text-label text-foreground">
                {t.passwordConfirm}
              </label>
              <PasswordInput id={`${id}-pw2`} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} dir="ltr" />
            </div>
          ) : null}
          <ErrorLine>{error}</ErrorLine>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {sealing ? t.sealAction : t.unsealAction}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ note, onDelete, onClose, labels }: DialogProps) {
  const { t } = useNotesLabels(labels);
  const { error, run } = useAction();
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent data-slot="note-delete-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.deleteBody}
            <span className={cn("mt-1 block font-medium text-foreground")}>{note.title || t.untitled}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorLine>{error}</ErrorLine>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void run(() => onDelete?.(note.id), t.failed);
            }}
          >
            {t.deleteConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Notebook dialogs: create, rename (one Input) and delete. */
export interface NotebookDialogState {
  kind: "create" | "rename" | "delete";
  notebook?: Notebook;
  parentId?: string | null;
}

export function NotebookDialog({
  state,
  onClose,
  notebooks,
  onCreate,
  onRename,
  onDelete,
  labels,
}: {
  state: NotebookDialogState | null;
  onClose: () => void;
  notebooks: readonly Notebook[];
  onCreate?: (name: string, parentId: string | null) => Promise<NoteResult>;
  onRename?: (id: string, name: string) => Promise<NoteResult>;
  onDelete?: (id: string) => Promise<NoteResult>;
  labels?: Partial<NotesLabels>;
}) {
  const { t } = useNotesLabels(labels);
  const { busy, error, run } = useAction();
  const id = useId();
  const [name, setName] = useState(state?.notebook?.name ?? "");
  const [parentId, setParentId] = useState<string | null>(state?.parentId ?? null);
  if (!state) return null;
  if (state.kind === "delete" && state.notebook) {
    const notebook = state.notebook;
    return (
      <AlertDialog open onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent data-slot="notebook-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.notebookDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.notebookDeleteBody}
              <span className="mt-1 block font-medium text-foreground">{notebook.name}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ErrorLine>{error}</ErrorLine>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void run(() => onDelete?.(notebook.id), t.failed);
              }}
            >
              {t.deleteNotebook}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  const creating = state.kind === "create";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    const ok = await run(() => (creating ? onCreate?.(value, parentId) : onRename?.(state.notebook!.id, value)), t.failed);
    if (ok) onClose();
  };
  const parents = flattenNotebooks(notebookTree(notebooks));
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm" data-slot="notebook-dialog">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{creating ? t.newNotebook : t.renameNotebook}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-name`} className="text-label text-foreground">
              {t.notebookName}
            </label>
            <Input id={`${id}-name`} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.notebookNamePlaceholder} />
          </div>
          {creating && parents.length ? (
            <div className="grid gap-1.5">
              <label htmlFor={`${id}-parent`} className="text-label text-foreground">
                {t.notebookParent}
              </label>
              <select
                id={`${id}-parent`}
                value={parentId ?? ""}
                onChange={(e) => setParentId(e.target.value || null)}
                className="h-control rounded-control border border-border bg-card px-2 text-body-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <option value="">{t.notebookRoot}</option>
                {parents.map((p) => (
                  <option key={p.notebook.id} value={p.notebook.id}>
                    {`${"— ".repeat(p.depth)}${p.notebook.name}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <ErrorLine>{error}</ErrorLine>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!name.trim()}>
              {creating ? t.create : t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
