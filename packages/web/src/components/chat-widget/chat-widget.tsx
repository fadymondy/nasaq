"use client";

import { CheckCircle2, MessageCircle, Paperclip, X } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Button } from "../button";
import { ChatComposer, ChatMessage, ChatThread, TypingIndicator } from "../chat";
import { Field, FieldLabel, Input, Textarea } from "../field";

const STRINGS = {
  en: {
    title: "Chat with us",
    launcher: "Open chat",
    close: "Close chat",
    online: "Online",
    offline: "Offline",
    subtitleOnline: "We usually reply in a few minutes",
    subtitleOffline: "We are away, leave a message",
    greeting: "Hi! How can we help you today?",
    offlineGreeting: "We are not around right now. Leave your details and we will write back by email.",
    placeholder: "Write a message",
    attach: "Attach a file",
    removeFile: (name: string) => `Remove ${name}`,
    fileTooBig: (name: string, mb: string) => `${name} is larger than ${mb} MB`,
    sendFailed: "Could not send. Try again.",
    unread: (n: string) => `${n} unread`,
    startersLabel: "Quick questions",
    you: "You",
    typing: "The team is typing",
    formName: "Your name",
    formEmail: "Email",
    formMessage: "How can we help?",
    formSend: "Send message",
    formSent: "Thanks, we got it",
    formSentHint: "We will reply to your email as soon as we are back.",
    formAgain: "Send another",
    formInvalidEmail: "Enter a valid email address",
    formRequired: "Required",
  },
  ar: {
    title: "تحدث معنا",
    launcher: "فتح المحادثة",
    close: "إغلاق المحادثة",
    online: "متصل",
    offline: "غير متصل",
    subtitleOnline: "نرد عادةً خلال دقائق",
    subtitleOffline: "نحن بعيدون الآن، اترك رسالة",
    greeting: "مرحباً! كيف يمكننا مساعدتك اليوم؟",
    offlineGreeting: "لسنا متاحين الآن. اترك بياناتك وسنرد عليك عبر البريد الإلكتروني.",
    placeholder: "اكتب رسالة",
    attach: "إرفاق ملف",
    removeFile: (name: string) => `إزالة ${name}`,
    fileTooBig: (name: string, mb: string) => `حجم ${name} أكبر من ${mb} ميغابايت`,
    sendFailed: "تعذر الإرسال. حاول مرة أخرى.",
    unread: (n: string) => `${n} غير مقروءة`,
    startersLabel: "أسئلة سريعة",
    you: "أنت",
    typing: "الفريق يكتب",
    formName: "اسمك",
    formEmail: "البريد الإلكتروني",
    formMessage: "كيف نساعدك؟",
    formSend: "إرسال الرسالة",
    formSent: "شكراً، وصلتنا رسالتك",
    formSentHint: "سنرد على بريدك الإلكتروني فور عودتنا.",
    formAgain: "إرسال رسالة أخرى",
    formInvalidEmail: "أدخل بريداً إلكترونياً صحيحاً",
    formRequired: "مطلوب",
  },
};

export type ChatWidgetLabels = { [K in keyof (typeof STRINGS)["en"]]: (typeof STRINGS)["en"][K] };

export interface WidgetMessage {
  id: string;
  /** `visitor` is the person using the site; `agent` a teammate; `bot` an automatic reply. */
  from: "visitor" | "agent" | "bot";
  text: string;
  at: Date | number | string;
  name?: string;
  avatar?: string;
  status?: "sending" | "sent" | "error";
  attachments?: { id: string; name: string; url?: string; kind: "image" | "file" }[];
}

export interface WidgetOfflineForm {
  name: string;
  email: string;
  message: string;
}

export interface ChatWidgetProps extends Omit<ComponentProps<"div">, "children" | "title"> {
  messages: readonly WidgetMessage[];
  /** Sends the visitor's text and files. Resolve with `{ error }` to keep the text and show the message. */
  onSend: (text: string, files: File[]) => Promise<void | { error?: string }>;
  onRetry?: (id: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Header title. Default "Chat with us". */
  title?: string;
  /** Line under the title. Defaults to the reply-time text for the current state. */
  subtitle?: string;
  agent?: { name: string; avatar?: string };
  /** First bubble from the team. */
  greeting?: string;
  /** Quick questions shown until the visitor writes. */
  starters?: readonly string[];
  /** Inside business hours. When `false` the offline form replaces the composer. Default true. */
  online?: boolean;
  /** Called with the offline form. Resolve with `{ error }` to keep the form. */
  onOfflineSubmit?: (form: WidgetOfflineForm) => Promise<void | { error?: string }>;
  /** Unread messages from the team, shown on the launcher while closed. */
  unread?: number;
  /** The team is typing. */
  typing?: boolean;
  /** Which bottom corner. Default "end" (the right in English, the left in Arabic). */
  position?: "end" | "start";
  /** `fixed` pins it to the viewport, `absolute` to a relative parent. Default "fixed". */
  placement?: "fixed" | "absolute" | "static";
  /** Largest file in MB. Default 5. */
  maxFileMb?: number;
  labels?: Partial<ChatWidgetLabels>;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function OfflineForm({ t, onSubmit }: { t: ChatWidgetLabels; onSubmit: NonNullable<ChatWidgetProps["onOfflineSubmit"]> }) {
  const [form, setForm] = useState<WidgetOfflineForm>({ name: "", email: "", message: "" });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const errors = {
    name: form.name.trim() ? "" : t.formRequired,
    email: !form.email.trim() ? t.formRequired : EMAIL.test(form.email.trim()) ? "" : t.formInvalidEmail,
    message: form.message.trim() ? "" : t.formRequired,
  };
  const invalid = Object.values(errors).some(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await onSubmit({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() });
      if (r && "error" in r && r.error) setError(r.error);
      else setSent(true);
    } catch {
      setError(t.sendFailed);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div data-slot="chat-widget-sent" role="status" className="flex flex-col items-center gap-2 border-t border-border p-6 text-center">
        <CheckCircle2 aria-hidden className="size-8 text-nq-success-text" />
        <p className="text-label text-foreground">{t.formSent}</p>
        <p className="text-body-sm text-muted-foreground">{t.formSentHint}</p>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={() => {
            setForm({ name: "", email: "", message: "" });
            setTouched(false);
            setSent(false);
          }}
        >
          {t.formAgain}
        </Button>
      </div>
    );
  }

  const shown = (k: keyof typeof errors) => (touched ? errors[k] : "");
  return (
    <form data-slot="chat-widget-offline" noValidate onSubmit={submit} className="flex flex-col gap-3 border-t border-border p-4">
      <Field invalid={!!shown("name")}>
        <FieldLabel>{t.formName}</FieldLabel>
        <Input dir="auto" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!shown("name") || undefined} />
        {shown("name") ? <p className="text-caption text-nq-danger-text">{shown("name")}</p> : null}
      </Field>
      <Field invalid={!!shown("email")}>
        <FieldLabel>{t.formEmail}</FieldLabel>
        <Input ltr type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!shown("email") || undefined} />
        {shown("email") ? <p className="text-caption text-nq-danger-text">{shown("email")}</p> : null}
      </Field>
      <Field invalid={!!shown("message")}>
        <FieldLabel>{t.formMessage}</FieldLabel>
        <Textarea dir="auto" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} aria-invalid={!!shown("message") || undefined} />
        {shown("message") ? <p className="text-caption text-nq-danger-text">{shown("message")}</p> : null}
      </Field>
      {error ? (
        <p role="alert" className="text-caption text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="primary" loading={busy}>
        {t.formSend}
      </Button>
    </form>
  );
}

/**
 * The floating chat box for a customer site: a round launcher (with an unread badge) that opens a panel with a greeting,
 * the conversation, quick questions, file attachments and, outside business hours, a leave-a-message form.
 */
export function ChatWidget({
  messages,
  onSend,
  onRetry,
  open,
  defaultOpen = false,
  onOpenChange,
  title,
  subtitle,
  agent,
  greeting,
  starters = [],
  online = true,
  onOfflineSubmit,
  unread = 0,
  typing = false,
  position = "end",
  placement = "fixed",
  maxFileMb = 5,
  labels,
  className,
  onKeyDown,
  ...props
}: ChatWidgetProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as ChatWidgetLabels;
  const id = useId();
  const [inner, setInner] = useState(defaultOpen);
  const isOpen = open ?? inner;
  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
  };
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(isOpen);

  // Give focus back to the launcher after closing.
  useEffect(() => {
    if (wasOpen.current && !isOpen) launcher.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  const send = async (body: string) => {
    const attached = files;
    setError("");
    setFiles([]);
    try {
      const r = await onSend(body, attached);
      if (r && "error" in r && r.error) {
        setError(r.error);
        setText(body);
        setFiles(attached);
      }
    } catch {
      setError(t.sendFailed);
      setText(body);
      setFiles(attached);
    }
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      if (f.size > maxFileMb * 1024 * 1024) setError(t.fileTooBig(f.name, String(maxFileMb)));
      else ok.push(f);
    }
    if (ok.length) setFiles((all) => [...all, ...ok]);
  };

  const hasVisitorMessage = messages.some((m) => m.from === "visitor");
  const intro = online ? (greeting ?? t.greeting) : t.offlineGreeting;
  const sub = subtitle ?? (online ? t.subtitleOnline : t.subtitleOffline);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Escape closes the open panel
    <div
      data-slot="chat-widget"
      data-open={isOpen || undefined}
      data-online={online || undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === "Escape" && isOpen && !e.defaultPrevented) setOpen(false);
      }}
      className={cn(
        "z-50 flex flex-col items-end gap-3",
        position === "start" && "items-start",
        placement === "fixed" && "fixed bottom-4",
        placement === "absolute" && "absolute bottom-4",
        placement !== "static" && (position === "end" ? "end-4" : "start-4"),
        className,
      )}
      {...props}
    >
      {isOpen ? (
        <section
          role="dialog"
          aria-labelledby={`${id}-title`}
          className="flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-floating border border-border bg-card shadow-floating"
        >
          <header className="flex items-center gap-3 bg-primary px-4 py-3 text-primary-foreground">
            {agent ? <Avatar name={agent.name} src={agent.avatar as string} size="md" /> : null}
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 id={`${id}-title`} dir="auto" className="truncate text-label">
                {title ?? t.title}
              </h2>
              <p className="flex items-center gap-1.5 truncate text-caption opacity-90">
                <span aria-hidden className={cn("size-2 shrink-0 rounded-full", online ? "bg-nq-success" : "bg-nq-line-strong")} />
                <span className="sr-only">{online ? t.online : t.offline}. </span>
                <span dir="auto" className="truncate">
                  {sub}
                </span>
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={t.close} onClick={() => setOpen(false)} className="text-primary-foreground hover:bg-primary-foreground/15">
              <X aria-hidden />
            </Button>
          </header>
          <ChatThread label={title ?? t.title} className="flex-1" contentClassName="gap-3 p-4">
            <ChatMessage name={agent?.name} avatarSrc={agent?.avatar}>
              {intro}
            </ChatMessage>
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                side={m.from === "visitor" ? "user" : "assistant"}
                name={m.from === "visitor" ? undefined : (m.name ?? agent?.name)}
                avatarSrc={m.avatar ?? (m.from === "visitor" ? undefined : agent?.avatar)}
                time={m.at}
                status={m.from === "visitor" ? m.status : undefined}
                onRetry={onRetry ? () => onRetry(m.id) : undefined}
              >
                <>
                  {m.text ? (
                    <p dir="auto" className="whitespace-pre-wrap text-start [overflow-wrap:anywhere]">
                      {m.text}
                    </p>
                  ) : null}
                  {m.attachments?.length ? (
                    <ul className={cn("flex flex-col gap-1.5", m.text && "mt-2")}>
                      {m.attachments.map((a) => (
                        <li key={a.id}>
                          {a.kind === "image" && a.url ? (
                            // biome-ignore lint/a11y/useAltText: alt is the file name
                            <img src={a.url} alt={a.name} className="max-h-40 rounded-control" />
                          ) : (
                            <span dir="auto" className="inline-flex items-center gap-1 text-body-sm">
                              <Paperclip aria-hidden className="size-3.5" />
                              {a.name}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              </ChatMessage>
            ))}
            {online && !hasVisitorMessage && starters.length ? (
              <div role="group" aria-label={t.startersLabel} className="flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    dir="auto"
                    onClick={() => void send(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-body-sm text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            {typing ? <TypingIndicator label={t.typing} /> : null}
          </ChatThread>
          {error ? (
            <p role="alert" className="px-4 pb-2 text-caption text-nq-danger-text">
              {error}
            </p>
          ) : null}
          {online ? (
            <div className="border-t border-border p-3">
              <input ref={fileInput} type="file" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
              <ChatComposer
                value={text}
                onValueChange={setText}
                onSend={(body) => void send(body)}
                placeholder={t.placeholder}
                maxRows={4}
                attachments={files.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="inline-flex h-7 max-w-48 items-center gap-1 rounded-full border border-border bg-secondary ps-2.5 pe-1 text-caption text-foreground">
                    <span dir="auto" className="truncate">
                      {f.name}
                    </span>
                    <button
                      type="button"
                      aria-label={t.removeFile(f.name)}
                      onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                      className="grid size-5 place-items-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                    >
                      <X aria-hidden className="size-3" />
                    </button>
                  </span>
                ))}
                actions={
                  <Button type="button" variant="ghost" size="icon" aria-label={t.attach} onClick={() => fileInput.current?.click()}>
                    <Paperclip aria-hidden />
                  </Button>
                }
              />
            </div>
          ) : onOfflineSubmit ? (
            <OfflineForm t={t} onSubmit={onOfflineSubmit} />
          ) : null}
        </section>
      ) : null}
      <Button
        ref={launcher}
        type="button"
        variant="primary"
        size="icon"
        aria-label={isOpen ? t.close : t.launcher}
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        className="relative size-14 rounded-full shadow-floating"
      >
        {isOpen ? <X aria-hidden className="size-6" /> : <MessageCircle aria-hidden className="size-6 rtl:-scale-x-100" />}
        {!isOpen && unread > 0 ? (
          <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-nq-danger px-1 text-caption tabular-nums text-primary-foreground">
            <span aria-hidden>{unread}</span>
            <span className="sr-only">{t.unread(String(unread))}</span>
          </span>
        ) : null}
      </Button>
    </div>
  );
}
