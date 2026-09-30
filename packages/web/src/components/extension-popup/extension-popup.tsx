"use client";

import { AlertCircle, ExternalLink, Link2, Pause, Play, Settings } from "lucide-react";
import { type ComponentProps, type ElementType, type FormEvent, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldLabel, Input } from "../field";
import { Switch } from "../switch";

const STRINGS = {
  en: {
    connected: "Connected",
    disconnected: "Not connected",
    paused: "Paused",
    error: "Problem",
    pause: "Pause",
    pauseHint: "Stops the extension on every site until you turn it back on.",
    options: "Options",
    connectTitle: "Connect to your workspace",
    connectHint: "Enter your server address, then sign in. The extension never asks for a password itself.",
    serverLabel: "Server address",
    serverPlaceholder: "https://app.example.com",
    connect: "Connect",
    pairTitle: "Pair with your account",
    pairHint: "Open Settings, Extensions in the app and type the pairing code it shows.",
    codeLabel: "Pairing code",
    pair: "Pair",
    invalidServer: "Enter a full address, starting with https://",
    invalidCode: "The code has 6 characters",
    quickActions: "Quick actions",
    save: "Save changes",
    saved: "Saved",
    unsaved: "Unsaved changes",
    version: "Version {version}",
  },
  ar: {
    connected: "متصل",
    disconnected: "غير متصل",
    paused: "متوقف مؤقتًا",
    error: "مشكلة",
    pause: "إيقاف مؤقت",
    pauseHint: "يوقف الإضافة على كل المواقع حتى تعيد تشغيلها.",
    options: "الخيارات",
    connectTitle: "الاتصال بمساحة عملك",
    connectHint: "أدخل عنوان الخادم ثم سجّل الدخول. الإضافة لا تطلب كلمة المرور بنفسها.",
    serverLabel: "عنوان الخادم",
    serverPlaceholder: "https://app.example.com",
    connect: "اتصال",
    pairTitle: "الاقتران بحسابك",
    pairHint: "افتح الإعدادات ثم الإضافات في التطبيق واكتب رمز الاقتران الظاهر.",
    codeLabel: "رمز الاقتران",
    pair: "اقتران",
    invalidServer: "أدخل عنوانًا كاملًا يبدأ بـ https://",
    invalidCode: "الرمز من 6 خانات",
    quickActions: "إجراءات سريعة",
    save: "حفظ التغييرات",
    saved: "تم الحفظ",
    unsaved: "تغييرات غير محفوظة",
    version: "الإصدار {version}",
  },
};

export type ExtensionPopupLabels = Partial<(typeof STRINGS)["en"]>;

function useExtensionStrings(labels?: ExtensionPopupLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

export type ExtensionStatus = "connected" | "disconnected" | "error";

/** Whether a string is an http(s) URL with a host: what the connect form accepts. */
export function isServerAddress(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ popup frame */

export interface ExtensionPopupProps extends Omit<ComponentProps<"div">, "title"> {
  /** The product mark and name. Keep the Latin name `dir="ltr"` so it does not reorder in Arabic. */
  brand: ReactNode;
  status?: ExtensionStatus;
  /** Shows the pause switch when `onPausedChange` is given. */
  paused?: boolean;
  onPausedChange?: (paused: boolean) => void;
  onOpenOptions?: () => void;
  /** Version text or any footer content, at the inline end of the footer. */
  footer?: ReactNode;
  children: ReactNode;
  labels?: ExtensionPopupLabels;
}

/**
 * The frame of a browser extension popup: 22rem wide, a header with the brand, a status badge and a pause switch,
 * a scrolling body and a footer with the options link. Put an `ExtensionConnect` in it while signed out and mini
 * cards and quick actions once connected.
 */
export function ExtensionPopup({ brand, status = "connected", paused, onPausedChange, onOpenOptions, footer, children, labels, className, ...props }: ExtensionPopupProps) {
  const { t } = useExtensionStrings(labels);
  const state = paused ? "paused" : status;
  const tone = { connected: "success", disconnected: "neutral", error: "danger", paused: "warning" } as const;
  const id = useId();
  return (
    <div
      data-slot="extension-popup"
      data-state={state}
      className={cn("flex max-h-[37.5rem] w-[22rem] max-w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-lg", className)}
      {...props}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-label font-semibold">{brand}</span>
        <Badge variant={tone[state]}>{t[state]}</Badge>
        {onPausedChange ? (
          <span className="flex items-center gap-1.5">
            <label htmlFor={id} className="sr-only">
              {t.pause}
            </label>
            {paused ? <Pause aria-hidden className="size-3.5 text-nq-warning-text" /> : <Play aria-hidden className="size-3.5 text-muted-foreground" />}
            <Switch id={id} checked={!!paused} onCheckedChange={onPausedChange} aria-label={t.pause} title={t.pauseHint} />
          </span>
        ) : null}
      </header>
      <div data-slot="extension-popup-body" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {children}
      </div>
      {onOpenOptions || footer ? (
        <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-caption text-muted-foreground">
          {onOpenOptions ? (
            <Button variant="ghost" size="sm" onClick={onOpenOptions}>
              <Settings aria-hidden />
              {t.options}
            </Button>
          ) : (
            <span />
          )}
          <span>{footer}</span>
        </footer>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ connect / pair */

export interface ExtensionConnectValues {
  server: string;
  code: string;
}

export interface ExtensionConnectProps extends Omit<ComponentProps<"form">, "onSubmit"> {
  /** `server`: type the server address then sign in. `pair`: type the short code the app shows. */
  mode?: "server" | "pair";
  defaultServer?: string;
  /** Resolve with `{ error }` to show a message under the form. */
  onConnect: (values: ExtensionConnectValues) => Promise<void | { error?: string }>;
  labels?: ExtensionPopupLabels;
}

/** The first-run form. The address (or code) is left-to-right in Arabic. A failure announces itself as an alert. */
export function ExtensionConnect({ mode = "server", defaultServer = "", onConnect, labels, className, ...props }: ExtensionConnectProps) {
  const { t } = useExtensionStrings(labels);
  const [server, setServer] = useState(defaultServer);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pair = mode === "pair";
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pair ? code.trim().length !== 6 : !isServerAddress(server)) {
      setError(pair ? t.invalidCode : t.invalidServer);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const result = await onConnect({ server: server.trim(), code: code.trim() });
      if (result?.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form data-slot="extension-connect" className={cn("flex flex-col gap-3", className)} onSubmit={submit} noValidate {...props}>
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-h3 text-foreground">
          <Link2 aria-hidden className="size-4 text-muted-foreground" />
          {pair ? t.pairTitle : t.connectTitle}
        </h2>
        <p className="text-caption text-muted-foreground">{pair ? t.pairHint : t.connectHint}</p>
      </div>
      {pair ? (
        <Field>
          <FieldLabel>{t.codeLabel}</FieldLabel>
          <Input ltr value={code} maxLength={6} autoComplete="one-time-code" inputMode="text" className="font-mono tracking-[0.3em] uppercase" onChange={(event) => setCode(event.target.value.toUpperCase())} />
        </Field>
      ) : (
        <Field>
          <FieldLabel>{t.serverLabel}</FieldLabel>
          <Input ltr type="url" value={server} placeholder={t.serverPlaceholder} onChange={(event) => setServer(event.target.value)} />
        </Field>
      )}
      <Button type="submit" variant="primary" loading={busy}>
        {pair ? t.pair : t.connect}
      </Button>
      {error ? (
        <p role="alert" className="flex items-start gap-1.5 text-caption text-nq-danger-text">
          <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------------ mini card + quick actions */

export interface ExtensionMiniCardProps extends Omit<ComponentProps<"section">, "title"> {
  title: string;
  /** A lucide icon component. */
  icon?: ElementType;
  /** A status pill at the inline end of the header. */
  status?: { label: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" };
  /** The big number or phrase. Numbers keep their own direction. */
  value?: ReactNode;
  hint?: ReactNode;
  /** Buttons, a progress bar, a row of pins. */
  children?: ReactNode;
}

/** One small card inside the popup: a title with a status pill, one figure, a hint and a row of controls. */
export function ExtensionMiniCard({ title, icon: Glyph, status, value, hint, children, className, ...props }: ExtensionMiniCardProps) {
  return (
    <section data-slot="extension-mini-card" className={cn("flex flex-col gap-2 rounded-lg border border-border bg-card p-3", className)} {...props}>
      <div className="flex items-center gap-2">
        {Glyph ? <Glyph aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : null}
        <h3 className="min-w-0 flex-1 truncate text-label font-medium text-foreground">{title}</h3>
        {status ? <Badge variant={status.tone ?? "neutral"}>{status.label}</Badge> : null}
      </div>
      {value !== undefined ? <p className="text-h2 tabular-nums text-foreground">{value}</p> : null}
      {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      {children}
    </section>
  );
}

export interface ExtensionQuickAction {
  id: string;
  label: string;
  icon: ElementType;
  onSelect: () => void;
  disabled?: boolean;
  /** Shows an external-link mark: the action opens a tab. */
  external?: boolean;
}

export interface ExtensionQuickActionsProps extends ComponentProps<"div"> {
  actions: readonly ExtensionQuickAction[];
  columns?: 2 | 3;
  labels?: ExtensionPopupLabels;
}

/** A grid of icon-over-label shortcuts (open the app, capture this page, copy a link). */
export function ExtensionQuickActions({ actions, columns = 2, labels, className, ...props }: ExtensionQuickActionsProps) {
  const { t } = useExtensionStrings(labels);
  return (
    <div data-slot="extension-quick-actions" role="group" aria-label={t.quickActions} className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2", className)} {...props}>
      {actions.map((action) => {
        const Glyph = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            disabled={action.disabled}
            onClick={action.onSelect}
            className="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card px-2 py-2 text-label text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus disabled:pointer-events-none disabled:opacity-50"
          >
            <Glyph aria-hidden className="size-5 text-primary" />
            <span className="max-w-full truncate">{action.label}</span>
            {action.external ? <ExternalLink aria-hidden className="absolute top-1.5 end-1.5 size-3 text-muted-foreground rtl:-scale-x-100" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ options page */

export interface ExtensionOptionsSection {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
}

export interface ExtensionOptionsPageProps extends Omit<ComponentProps<"div">, "title"> {
  title: string;
  description?: string;
  /** The mark and name above the title. */
  brand?: ReactNode;
  sections: readonly ExtensionOptionsSection[];
  /** Shows a sticky save bar. `dirty` says whether there is anything to save. */
  onSave?: () => Promise<void | { error?: string }>;
  dirty?: boolean;
  labels?: ExtensionPopupLabels;
}

/** The extension's options page: a centred column of titled sections and a save bar that says what state it is in. */
export function ExtensionOptionsPage({ title, description, brand, sections, onSave, dirty, labels, className, ...props }: ExtensionOptionsPageProps) {
  const { t } = useExtensionStrings(labels);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await onSave?.();
      if (result?.error) setError(result.error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div data-slot="extension-options" className={cn("mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 text-foreground sm:p-6", className)} {...props}>
      <header className="flex flex-col gap-1">
        {brand ? <div className="mb-2 flex items-center gap-2 text-label font-semibold">{brand}</div> : null}
        <h1 className="text-h1">{title}</h1>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </header>
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-title`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-0.5">
            <h2 id={`${section.id}-title`} className="text-h3">
              {section.title}
            </h2>
            {section.description ? <p className="text-caption text-muted-foreground">{section.description}</p> : null}
          </div>
          {section.content}
        </section>
      ))}
      {onSave ? (
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-background/90 py-3 backdrop-blur">
          <Button variant="primary" onClick={save} loading={saving} disabled={!dirty}>
            {t.save}
          </Button>
          <span role="status" className={cn("text-caption", error ? "text-nq-danger-text" : "text-muted-foreground")}>
            {error ?? (dirty ? t.unsaved : t.saved)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export interface ExtensionOptionRowProps extends Omit<ComponentProps<"div">, "children"> {
  label: string;
  description?: string;
  /** The control at the inline end: a Switch, a Select, a button. Give it its own accessible name. */
  control: ReactNode;
}

/** A label and hint at the inline start, a control at the end. */
export function ExtensionOptionRow({ label, description, control, className, ...props }: ExtensionOptionRowProps) {
  return (
    <div data-slot="extension-option-row" className={cn("flex items-center justify-between gap-4 py-1", className)} {...props}>
      <div className="min-w-0">
        <p className="text-label text-foreground">{label}</p>
        {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
