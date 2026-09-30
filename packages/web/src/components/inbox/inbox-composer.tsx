"use client";

import { MapPin, Mic, Paperclip, Send, X } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../dialog";
import { EmojiPicker } from "../emoji-picker";
import { Input } from "../field";
import { type Mention, MentionTextarea } from "../mention-textarea";
import { RichTextEditor } from "../rich-text-editor";
import { Tabs, TabsList, TabsTab } from "../tabs";
import {
  type CannedSnippet,
  type GeoPoint,
  htmlToText,
  type InboxAgent,
  type InboxConversation,
  type InboxDraft,
  type InboxMessage,
  type InboxResult,
  messageText,
  previewOf,
} from "./inbox-format";
import { LocationPicker, VoiceRecorder, type VoiceRecording } from "./inbox-media";
import { CannedPicker } from "./inbox-menus";
import { ReplyQuote } from "./inbox-message";
import { type InboxLabels, useInboxLabels } from "./inbox-strings";

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const toHtml = (text: string) =>
  text
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

export interface InboxComposerProps extends Omit<ComponentProps<"div">, "children" | "onSubmit"> {
  conversation: Pick<InboxConversation, "id" | "channel" | "subject" | "contact">;
  /** The current agent (used for `{{agent}}` in snippets). */
  me: InboxAgent;
  /** Teammates offered when mentioning with @ in a note. */
  agents?: readonly InboxAgent[];
  snippets?: readonly CannedSnippet[];
  /** The message being answered: shows a quote above the field. */
  replyTo?: InboxMessage | null;
  onCancelReply?: () => void;
  /** Resolve with `{ error }` to keep the draft and show the message. */
  onSend: (draft: InboxDraft) => Promise<InboxResult>;
  disabled?: boolean;
  /** Voice recorder never touches the microphone (demos and tests). */
  simulateVoice?: boolean;
  /** Where the location pad starts, and places offered as buttons. */
  locationCenter?: { lat: number; lng: number };
  locationSuggestions?: GeoPoint[];
  /** Initial mode. Default "reply". */
  defaultMode?: "reply" | "note";
  labels?: Partial<InboxLabels>;
}

/**
 * The reply box of a conversation. Chat and WhatsApp get a text field with attachments, emoji, saved replies (type `/`),
 * voice notes and location; email gets subject, Cc and a rich text editor. Switch to "Internal note" to write for the team
 * only (with @mentions).
 */
export function InboxComposer({
  conversation: c,
  me,
  agents = [],
  snippets = [],
  replyTo,
  onCancelReply,
  onSend,
  disabled = false,
  simulateVoice,
  locationCenter,
  locationSuggestions,
  defaultMode = "reply",
  labels,
  className,
  ...props
}: InboxComposerProps) {
  const t = useInboxLabels(labels);
  const email = c.channel === "email";
  const [mode, setMode] = useState<"reply" | "note">(defaultMode);
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [subject, setSubject] = useState(c.subject ? `${/^re:/i.test(c.subject) ? "" : "Re: "}${c.subject}` : "");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [recording, setRecording] = useState(false);
  const [locating, setLocating] = useState(false);
  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [editorKey, setEditorKey] = useState(0);

  const note = mode === "note";
  const richMode = email && !note;
  const empty = richMode ? htmlToText(html) === "" : text.trim() === "";
  const canSend = !disabled && !busy && (!empty || files.length > 0);
  const mentionOptions = useMemo(() => agents.map((a) => ({ id: a.id, name: a.name, description: a.email, avatar: a.avatar })), [agents]);
  const vars = { name: c.contact.name.split(/\s+/)[0], fullName: c.contact.name, agent: me.name.split(/\s+/)[0] };
  const words = { voice: t.voiceMessage, location: t.locationMessage, attachment: t.attachmentMessage };

  const submit = async (extra?: Pick<InboxDraft, "voice" | "location">) => {
    if (busy || disabled) return;
    if (!extra && !canSend) return;
    setBusy(true);
    setError("");
    try {
      const result = await onSend({
        conversationId: c.id,
        channel: c.channel,
        mode,
        body: richMode ? html : text.trim(),
        format: richMode ? "html" : "text",
        subject: richMode ? subject : undefined,
        cc: richMode && cc.trim() ? cc.split(/[,;\s]+/).filter(Boolean) : undefined,
        replyToId: replyTo?.id,
        attachments: files.length ? files : undefined,
        mentions: note ? mentions.map((m) => m.id) : undefined,
        ...extra,
      });
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      setText("");
      setHtml("");
      setMentions([]);
      setFiles([]);
      setEditorKey((k) => k + 1);
      onCancelReply?.();
    } catch {
      setError(t.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  const insert = (snippet: string) => {
    if (richMode) {
      setHtml((h) => h + toHtml(snippet));
      setEditorKey((k) => k + 1);
    } else setText((v) => (v ? `${v}${v.endsWith("\n") ? "" : "\n"}${snippet}` : snippet));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
    // The mention list uses Enter to pick a person.
    if (e.currentTarget.getAttribute("aria-expanded") === "true") return;
    e.preventDefault();
    void submit();
  };

  const onChangeText = (next: string, m: Mention[]) => {
    if (next === "/" && snippets.length > 0 && !note) {
      setSnippetsOpen(true);
      setText("");
      return;
    }
    setText(next);
    setMentions(m);
  };

  const placeholder = note ? t.notePlaceholder : email ? t.emailPlaceholder : t.messagePlaceholder;
  const label = note ? t.note : t.message;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Ctrl/Cmd+Enter sends from the rich editor
    <div
      data-slot="inbox-composer"
      data-mode={mode}
      onKeyDown={(e) => richMode && e.key === "Enter" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), void submit())}
      className={cn("flex flex-col gap-2 border-t border-border bg-card p-3", className)}
      {...props}
    >
      <Tabs value={mode} onValueChange={(v) => setMode(v as "reply" | "note")} className="gap-0">
        <TabsList aria-label={t.reply}>
          <TabsTab value="reply">{t.reply}</TabsTab>
          <TabsTab value="note">{t.note}</TabsTab>
        </TabsList>
      </Tabs>
      {note ? <p className="text-caption text-muted-foreground">{t.noteHint}</p> : null}
      {replyTo ? (
        <div className="flex items-start gap-2">
          <ReplyQuote className="mb-0 flex-1" author={`${t.replyTo} ${replyTo.author?.name ?? (replyTo.direction === "in" ? c.contact.name : t.you)}`} excerpt={previewOf(replyTo, words) || messageText(replyTo)} labels={labels} />
          {onCancelReply ? (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.cancelReply} onClick={onCancelReply}>
              <X aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}

      {recording ? (
        <VoiceRecorder
          simulate={simulateVoice}
          labels={labels}
          onCancel={() => setRecording(false)}
          onSend={async (r: VoiceRecording) => {
            setRecording(false);
            await submit({ voice: r });
          }}
        />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-card border border-input p-2 transition-colors duration-150 ease-nq focus-within:border-nq-focus",
            note ? "border-dashed bg-nq-warning-soft" : "bg-background",
          )}
        >
          {richMode ? (
            <>
              <div className="flex items-center gap-2 text-caption text-muted-foreground">
                <span className="w-12 shrink-0">{t.to}</span>
                <bdi dir="ltr" className="min-w-0 flex-1 truncate text-foreground">
                  {c.contact.email}
                </bdi>
                {!showCc ? (
                  <Button type="button" variant="link" size="sm" onClick={() => setShowCc(true)}>
                    {t.addCc}
                  </Button>
                ) : null}
              </div>
              {showCc ? (
                <label className="flex items-center gap-2 text-caption text-muted-foreground">
                  <span className="w-12 shrink-0">{t.cc}</span>
                  <Input ltr value={cc} placeholder={t.ccPlaceholder} onChange={(e) => setCc(e.target.value)} className="h-8" />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-caption text-muted-foreground">
                <span className="w-12 shrink-0">{t.subject}</span>
                <Input dir="auto" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-8" />
              </label>
              <RichTextEditor
                key={editorKey}
                aria-label={t.message}
                placeholder={placeholder}
                defaultValue={html}
                onValueChange={setHtml}
                toolbar={["bold", "italic", "underline", "bulletList", "orderedList", "link"]}
                minHeight="6rem"
              />
            </>
          ) : (
            <MentionTextarea
              rows={2}
              dir="auto"
              value={text}
              defaultMentions={mentions}
              suggestions={note ? mentionOptions : []}
              placeholder={placeholder}
              aria-label={label}
              disabled={disabled}
              onKeyDown={onKeyDown}
              onValueChange={onChangeText}
              className="min-h-14 resize-none border-0 bg-transparent px-1 py-1 focus-visible:outline-0"
            />
          )}
          {files.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
                  <span dir="auto" className="truncate">
                    {f.name}
                  </span>
                  <button
                    type="button"
                    aria-label={t.removeAttachment(f.name)}
                    onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                    className="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center gap-0.5">
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                setFiles((all) => [...all, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.attach} disabled={disabled} onClick={() => fileInput.current?.click()}>
              <Paperclip aria-hidden />
            </Button>
            {!richMode ? (
              <EmojiPicker
                side="top"
                trigger={
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t.emoji} disabled={disabled}>
                    <span aria-hidden className="text-base leading-none">
                      🙂
                    </span>
                  </Button>
                }
                onEmojiSelect={(emoji) => setText((v) => v + emoji.emoji)}
              />
            ) : null}
            {snippets.length && !note ? (
              <CannedPicker snippets={snippets} variables={vars} open={snippetsOpen} onOpenChange={setSnippetsOpen} onPick={insert} labels={labels} />
            ) : null}
            {!email && !note ? (
              <>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.voice} disabled={disabled} onClick={() => setRecording(true)}>
                  <Mic aria-hidden />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.location} disabled={disabled} onClick={() => setLocating(true)}>
                  <MapPin aria-hidden />
                </Button>
              </>
            ) : null}
            <span className="flex-1" />
            {c.channel === "whatsapp" && !note ? <span className="me-2 hidden text-caption text-muted-foreground sm:inline">{t.channelHintWhatsapp}</span> : null}
            <Button type="button" variant="primary" size={note || richMode ? "md" : "icon"} loading={busy} disabled={!canSend} aria-label={note ? t.sendNote : t.send} onClick={() => void submit()}>
              {note || richMode ? (
                <>
                  <Send aria-hidden className="rtl:-scale-x-100" />
                  {note ? t.sendNote : t.send}
                </>
              ) : (
                <Send aria-hidden className="rtl:-scale-x-100" />
              )}
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <Dialog open={locating} onOpenChange={setLocating}>
        <DialogContent className="w-fit max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>{t.pickLocation}</DialogTitle>
          </DialogHeader>
          <LocationPicker
            center={locationCenter}
            suggestions={locationSuggestions}
            labels={labels}
            onCancel={() => setLocating(false)}
            onSend={async (point) => {
              setLocating(false);
              await submit({ location: point });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
