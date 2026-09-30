"use client";

import { ArrowLeft, Bold, CircleAlert, Code, Heading2, Italic, Link2, ListChecks, LoaderCircle, Lock, Palette, Pin, PinOff, Share2, Tag, FolderInput, Check } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../badge";
import { Button } from "../button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../dropdown-menu";
import { Markdown } from "../markdown";
import { formatNumber, formatRelativeTime } from "../numeric";
import { PasswordInput } from "../password-input";
import { RichTextEditor } from "../rich-text-editor";
import { ToggleGroup, Toggle } from "../toggle-group";
import type { NoteResult } from "./notes-dialogs";
import { type NoteAction, NoteActionsMenu, NoteContextRegion, type NoteMenuApi, type NoteMenuOptions, useNoteMenu } from "./notes-menu";
import {
  applyMarkdownFormat,
  backlinksOf,
  bodyText,
  INITIAL_SAVE,
  linksFrom,
  type MarkdownFormat,
  type Note,
  notebookPath,
  readingMinutes,
  saveReducer,
  wordCount,
} from "./notes-model";
import { useNotesLabels } from "./notes-strings";
import { noteTint } from "./notes-view";

const FORMAT_KEYS: MarkdownFormat[] = ["bold", "italic", "strike", "code", "link", "wikilink", "h1", "h2", "h3", "quote", "bullet", "ordered", "task"];

export interface NoteEditorProps extends NoteMenuOptions {
  /** The note to edit. Switching `note.id` resets the editor; other changes (pin, colour, tags) update in place. */
  note: Note | null | undefined;
  /** Milliseconds of quiet before a change is saved. Default 800. */
  autosaveDelay?: number;
  /** Shows a back button (the list on narrow screens). */
  onBack?: () => void;
  /** Extra classes for the back button, for example `@2xl:hidden` to show it only when the list is hidden. */
  backClassName?: string;
  /** A wikilink or a backlink was chosen. */
  onOpenNote?: (id: string) => void;
  /** Check the password of a sealed note. Resolve `{ error }` for a wrong one. */
  onUnlock?: (id: string, password: string) => Promise<NoteResult>;
  /** Share one menu (and its dialogs) with a sibling `NotesView`, as `Notes` does. */
  menu?: NoteMenuApi;
  /** Reference time for relative dates. */
  now?: number;
  className?: string;
}

/**
 * The note editor: title, a rich or Markdown body, properties, backlinks, word count and an autosave state. It has a
 * context menu (on everything but the text, which keeps the browser menu) and a "⋯" menu with the same actions. Changes
 * go to `onUpdate(id, { title, body })` after `autosaveDelay`, on blur, on Mod+S and when the note closes.
 */
export function NoteEditor(props: NoteEditorProps) {
  const own = useNoteMenu(props);
  const menu = props.menu ?? own;
  const { t } = useNotesLabels(props.labels);
  return (
    <div data-slot="note-editor" className={cn("flex min-h-0 min-w-0 flex-1 flex-col", props.className)}>
      {props.note ? <EditorBody key={props.note.id} {...props} note={props.note} menu={menu} /> : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 p-8 text-center">
          <p className="text-h3 text-foreground">{t.pickOne}</p>
          <p className="text-body-sm text-muted-foreground">{t.pickOneHint}</p>
        </div>
      )}
      {props.menu ? null : own.dialogs}
    </div>
  );
}

function EditorBody({ note, menu, notes = [], notebooks = [], unlocked = [], onUpdate, autosaveDelay = 800, onBack, backClassName, onOpenNote, onUnlock, onLock, labels, now }: NoteEditorProps & { note: Note; menu: NoteMenuApi }) {
  const { t, locale } = useNotesLabels(labels);
  const locked = menu.isLocked(note);
  const format = note.format ?? "rich";
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [save, dispatch] = useReducer(saveReducer, INITIAL_SAVE);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const latest = useRef({ title, body, save, onUpdate });
  latest.current = { title, body, save, onUpdate };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<{ start: number; end: number } | null>(null);
  // The rich editor re-serialises the HTML when it mounts; that is not an edit, so wait for real input.
  const touched = useRef(false);
  const [failed, setFailed] = useState<string | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const cur = latest.current;
    if (!cur.onUpdate || inflight.current) return;
    if (cur.save.status !== "dirty" && cur.save.status !== "error") return;
    inflight.current = true;
    dispatch({ type: "start" });
    try {
      const result = await cur.onUpdate(note.id, { title: cur.title, body: cur.body });
      if (result && result.error) {
        setFailed(result.error);
        dispatch({ type: "fail" });
      } else {
        setFailed(null);
        setSavedAt(Date.now());
        dispatch({ type: "done" });
      }
    } catch {
      dispatch({ type: "fail" });
    } finally {
      inflight.current = false;
    }
  }, [note.id]);

  const schedule = useCallback(() => {
    dispatch({ type: "edit" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), autosaveDelay);
  }, [autosaveDelay, flush]);

  // A save that finishes after a newer edit leaves the note dirty: save again.
  useEffect(() => {
    if (save.status === "dirty" && !timer.current && !inflight.current) timer.current = setTimeout(() => void flush(), autosaveDelay);
  }, [save.status, save.rev, autosaveDelay, flush]);

  // Save what is left when the note closes.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      const cur = latest.current;
      if ((cur.save.status === "dirty" || cur.save.status === "error") && cur.onUpdate) void cur.onUpdate(note.id, { title: cur.title, body: cur.body });
    },
    [note.id],
  );

  useEffect(() => {
    if (caret.current && area.current) {
      area.current.focus();
      area.current.setSelectionRange(caret.current.start, caret.current.end);
      caret.current = null;
    }
  }, [body]);

  const applyFormat = (fmt: MarkdownFormat) => {
    const el = area.current;
    if (!el) return;
    const edit = applyMarkdownFormat(body, el.selectionStart, el.selectionEnd, fmt);
    caret.current = { start: edit.start, end: edit.end };
    setBody(edit.value);
    schedule();
  };

  const onAreaKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const map: Record<string, MarkdownFormat> = { KeyB: "bold", KeyI: "italic", KeyK: "link" };
    const fmt = map[e.code];
    if (fmt) {
      e.preventDefault();
      applyFormat(fmt);
    }
  };

  const onRootKey = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.code === "KeyS") {
      e.preventDefault();
      void flush();
    }
  };

  const actions: NoteAction[] = menu.actionsFor(note, { inEditor: true });
  const words = wordCount(`${title} ${locked ? "" : bodyText({ ...note, body })}`);
  const path = notebookPath(notebooks, note.notebookId);
  const backlinks = locked ? [] : backlinksOf(note, notes, unlocked);
  const links = locked ? [] : linksFrom({ ...note, body }, notes);
  const pin = actions.find((a) => a.id === "pin");
  const share = actions.find((a) => a.id === "share");

  const status = (() => {
    switch (save.status) {
      case "saving":
        return { icon: <LoaderCircle aria-hidden className="size-3.5 animate-spin" />, text: t.saving, tone: "text-muted-foreground" };
      case "dirty":
        return { icon: <span aria-hidden className="size-1.5 rounded-full bg-[var(--nq-tag-amber)]" />, text: t.unsaved, tone: "text-muted-foreground" };
      case "error":
        return { icon: <CircleAlert aria-hidden className="size-3.5" />, text: failed ?? t.saveFailed, tone: "text-nq-danger-text" };
      default:
        return { icon: <Check aria-hidden className="size-3.5" />, text: savedAt ? t.savedAt(formatRelativeTime(savedAt, locale, { now: now ?? Date.now() })) : t.saved, tone: "text-muted-foreground" };
    }
  })();

  const previewSource = body.replace(/\[\[([^\]\n]+)\]\]/g, (m, name: string) => {
    const hit = notes.find((n) => n.id !== note.id && n.title.trim().toLowerCase() === name.trim().toLowerCase());
    return hit ? `[${name.trim()}](#note-${hit.id})` : name.trim();
  });

  const chip = (icon: ReactNode, label: string, dialog: "move" | "tags" | "color", content?: ReactNode) => (
    <Button variant="ghost" size="sm" className="max-w-full gap-1.5 text-muted-foreground" onClick={() => menu.openDialog(dialog, note)} aria-label={label} disabled={!actions.some((a) => a.id === (dialog === "tags" ? "tags" : dialog))}>
      {icon}
      {content}
    </Button>
  );

  return (
    <NoteContextRegion
      actions={actions}
      render={<article data-slot="note-editor-body" data-color={note.color ?? undefined} aria-label={title.trim() || t.untitled} onKeyDown={onRootKey} className="flex min-h-0 flex-1 flex-col" />}
    >
      <header className="flex items-center gap-1.5 border-b border-border px-3 py-2" style={note.color ? { borderBottomColor: noteTint(note.color)?.borderColor } : undefined}>
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} data-slot="note-back" className={cn("gap-1.5", backClassName)}>
            <ArrowLeft aria-hidden className="rtl:rotate-180" />
            {t.back}
          </Button>
        ) : null}
        <span role="status" aria-live="polite" data-slot="note-save-status" data-status={save.status} className={cn("flex min-w-0 items-center gap-1.5 text-caption", status.tone)}>
          {status.icon}
          <span className="truncate">{status.text}</span>
          {save.status === "error" ? (
            <Button variant="link" size="sm" onClick={() => void flush()}>
              {t.saveNow}
            </Button>
          ) : null}
        </span>
        <span className="ms-auto" />
        {pin ? (
          <Button variant="ghost" size="icon-sm" aria-label={pin.label} aria-pressed={!!note.pinned} onClick={pin.onSelect} className={note.pinned ? "text-foreground" : "text-muted-foreground"}>
            {note.pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
          </Button>
        ) : null}
        {share ? (
          <Button variant="ghost" size="icon-sm" aria-label={share.label} disabled={share.disabled} onClick={share.onSelect} className="text-muted-foreground">
            <Share2 aria-hidden />
          </Button>
        ) : null}
        <NoteActionsMenu actions={actions} label={t.noteActions} />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto" style={note.color ? { background: `color-mix(in oklab, var(--nq-tag-${note.color}-soft) 40%, transparent)` } : undefined}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-4 @2xl:px-8">
          <input
            dir="auto"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              schedule();
            }}
            onBlur={() => void flush()}
            placeholder={t.titlePlaceholder}
            aria-label={t.titleLabel}
            disabled={!onUpdate}
            data-slot="note-title"
            className="w-full bg-transparent text-h1 text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          />
          <div role="group" aria-label={t.properties} data-slot="note-properties" className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-caption text-muted-foreground">
            {chip(<FolderInput aria-hidden />, t.move, "move", <span className="truncate">{path.length ? path.join(" / ") : t.moveNone}</span>)}
            {chip(
              <Tag aria-hidden />,
              t.editTags,
              "tags",
              note.tags?.length ? (
                <span className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="neutral">
                      {tag}
                    </Badge>
                  ))}
                </span>
              ) : (
                <span>{t.tags}</span>
              ),
            )}
            {chip(
              <Palette aria-hidden />,
              t.color,
              "color",
              note.color ? <span aria-hidden className="size-3 rounded-full border border-border" style={{ background: `var(--nq-tag-${note.color})` }} /> : null,
            )}
            <span className="px-2">{t.updated(formatRelativeTime(note.updatedAt, locale, { now: now ?? Date.now() }))}</span>
          </div>

          {locked ? (
            <Unlock note={note} onUnlock={onUnlock} labels={labels} />
          ) : (
            <>
              {note.sealed ? (
                <div className="flex items-center gap-2 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-muted-foreground" data-slot="note-unlocked">
                  <Lock aria-hidden className="size-3.5" />
                  <span className="flex-1">{t.unlockedBanner}</span>
                  {onLock ? (
                    <Button variant="secondary" size="sm" onClick={() => onLock(note.id)}>
                      {t.lockNow}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {format === "markdown" ? (
                <div className="flex min-w-0 flex-col gap-2" data-slot="note-markdown">
                  <div className="flex items-center gap-2">
                    <ToggleGroup value={[mode]} onValueChange={(v) => v[0] && setMode(v[0] as "write" | "preview")} aria-label={t.formatMarkdown}>
                      <Toggle value="write">{t.write}</Toggle>
                      <Toggle value="preview">{t.preview}</Toggle>
                    </ToggleGroup>
                    <span className="ms-auto" />
                    {mode === "write" ? (
                      <>
                        <Button variant="ghost" size="icon-sm" aria-label={t.formats.bold} onClick={() => applyFormat("bold")}>
                          <Bold aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t.formats.italic} onClick={() => applyFormat("italic")}>
                          <Italic aria-hidden />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={t.formats.link} onClick={() => applyFormat("link")}>
                          <Link2 aria-hidden />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label={t.formatTitle} />}>
                            <Heading2 aria-hidden />
                            {t.format}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-48">
                            {FORMAT_KEYS.map((key) => (
                              <DropdownMenuItem key={key} onClick={() => applyFormat(key)}>
                                {key === "code" ? <Code aria-hidden /> : key === "task" ? <ListChecks aria-hidden /> : null}
                                {t.formats[key]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : null}
                  </div>
                  {mode === "write" ? (
                    <textarea
                      ref={area}
                      dir="auto"
                      value={body}
                      onChange={(e) => {
                        setBody(e.target.value);
                        schedule();
                      }}
                      onBlur={() => void flush()}
                      onKeyDown={onAreaKey}
                      placeholder={t.bodyPlaceholder}
                      aria-label={t.bodyLabel}
                      disabled={!onUpdate}
                      data-slot="note-body"
                      className="min-h-64 w-full resize-y rounded-control border border-border bg-transparent p-3 font-mono text-code text-foreground outline-none placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
                    />
                  ) : body.trim() ? (
                    <Markdown
                      components={{
                        a: ({ href, children }: { href?: string; children?: ReactNode }) =>
                          href?.startsWith("#note-") ? (
                            <a href={href} onClick={(e) => { e.preventDefault(); onOpenNote?.(href.slice(6)); }} className="text-foreground underline decoration-nq-line-strong underline-offset-4">
                              {children}
                            </a>
                          ) : (
                            <a href={href} target="_blank" rel="noreferrer noopener" className="text-foreground underline decoration-nq-line-strong underline-offset-4">
                              {children}
                            </a>
                          ),
                      }}
                    >
                      {previewSource}
                    </Markdown>
                  ) : (
                    <p className="text-body-sm text-muted-foreground">{t.nothingToPreview}</p>
                  )}
                </div>
              ) : (
                <div className="contents" onKeyDownCapture={() => (touched.current = true)} onPointerDownCapture={() => (touched.current = true)} onPasteCapture={() => (touched.current = true)}>
                <RichTextEditor
                  data-slot="note-body"
                  defaultValue={note.body}
                  onValueChange={(v) => {
                    if (!touched.current || v === latest.current.body) return;
                    setBody(v);
                    schedule();
                  }}
                  onBlur={() => void flush()}
                  readOnly={!onUpdate}
                  placeholder={t.bodyPlaceholder}
                  aria-label={t.bodyLabel}
                  minHeight="16rem"
                />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!locked ? (
        <footer data-slot="note-footer" className="flex flex-col gap-1 border-t border-border px-4 py-2 text-caption text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-3">
            <span>{t.words(formatNumber(words, locale))}</span>
            <span>{t.readMinutes(formatNumber(readingMinutes(words), locale))}</span>
            <span>{t.created(formatRelativeTime(note.createdAt, locale, { now: now ?? Date.now() }))}</span>
          </div>
          <NoteLinks title={t.backlinks} empty={t.noBacklinks} notes={backlinks} onOpen={onOpenNote} openLabel={t.openNote} />
          {links.length ? <NoteLinks title={t.linksTo} empty={t.noLinks} notes={links} onOpen={onOpenNote} openLabel={t.openNote} /> : null}
        </footer>
      ) : null}
    </NoteContextRegion>
  );
}

function NoteLinks({ title, empty, notes, onOpen, openLabel }: { title: string; empty: string; notes: Note[]; onOpen?: (id: string) => void; openLabel: (title: string) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-slot="note-links">
      <span className="font-medium">{title}</span>
      {notes.length ? (
        notes.map((n) => (
          <Button key={n.id} variant="secondary" size="sm" onClick={() => onOpen?.(n.id)} aria-label={openLabel(n.title)} className="max-w-48">
            <span dir="auto" className="truncate">{n.title || "…"}</span>
          </Button>
        ))
      ) : (
        <span>{empty}</span>
      )}
    </div>
  );
}

function Unlock({ note, onUnlock, labels }: { note: Note; onUnlock?: (id: string, password: string) => Promise<NoteResult>; labels?: NoteEditorProps["labels"] }) {
  const { t } = useNotesLabels(labels);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (!onUnlock || !password) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onUnlock(note.id, password);
      if (result && result.error) setError(result.error);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      data-slot="note-unlock"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 rounded-card border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 text-h3 text-foreground">
        <Lock aria-hidden className="size-4" />
        {t.locked}
      </div>
      <p className="text-body-sm text-muted-foreground">{t.lockedHint}</p>
      <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" aria-label={t.password} placeholder={t.password} aria-invalid={!!error} aria-describedby={error ? "note-unlock-error" : undefined} />
      {error ? (
        <p id="note-unlock-error" role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={busy} disabled={!password}>
        {t.unlock}
      </Button>
    </form>
  );
}
