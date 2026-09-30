"use client";

import { Check, Globe, Hash, NotebookPen, Zap } from "lucide-react";
import { type ComponentProps, type KeyboardEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../dialog";
import { Textarea } from "../field";
import { Icon } from "../icon";
import { Kbd } from "../text";
import {
  buildCapture,
  type CaptureValue,
  canSaveCapture,
  captureShortcutKeys,
  extractCaptureTags,
  isCaptureSaveKey,
  matchesCaptureShortcut,
  parseCaptureShortcut,
} from "./quick-capture-logic";

const STRINGS = {
  en: {
    title: "Quick capture",
    clipTitle: "Save this page",
    description: "Jot it down now, sort it later.",
    clipDescription: "Add a note, then save the page to your inbox.",
    placeholder: "What is on your mind? Use #tags to file it.",
    clipPlaceholder: "Add a note (optional)",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    saved: "Saved to {destination}.",
    savedPlain: "Saved.",
    failed: "Could not save. Your text is still here, try again.",
    empty: "Type something to capture.",
    destination: "Save to",
    tags: "Tags",
    suggested: "Suggested tags",
    page: "Page",
    selection: "Selected text",
    shortcutHint: "Opens from anywhere with",
    saveHint: "to save",
    closeHint: "to close",
    note: "Note",
    link: "Link",
    clip: "Page",
  },
  ar: {
    title: "التقاط سريع",
    clipTitle: "احفظ هذه الصفحة",
    description: "دوّنها الآن ورتّبها لاحقًا.",
    clipDescription: "أضف ملاحظة ثم احفظ الصفحة في صندوقك.",
    placeholder: "ما الذي يدور في ذهنك؟ استخدم #وسوم لتصنيفها.",
    clipPlaceholder: "أضف ملاحظة (اختياري)",
    save: "حفظ",
    saving: "جارٍ الحفظ",
    cancel: "إلغاء",
    saved: "تم الحفظ في {destination}.",
    savedPlain: "تم الحفظ.",
    failed: "تعذر الحفظ. نصك ما زال هنا، حاول مرة أخرى.",
    empty: "اكتب شيئًا لالتقاطه.",
    destination: "الحفظ في",
    tags: "الوسوم",
    suggested: "وسوم مقترحة",
    page: "الصفحة",
    selection: "النص المحدد",
    shortcutHint: "يُفتح من أي مكان بـ",
    saveHint: "للحفظ",
    closeHint: "للإغلاق",
    note: "ملاحظة",
    link: "رابط",
    clip: "صفحة",
  },
};

export type QuickCaptureLabels = Partial<(typeof STRINGS)["en"]>;

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface QuickCaptureDestination {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface QuickCapturePage {
  title?: string;
  url: string;
  /** Text the reader had selected on the page. */
  selection?: string;
}

export interface QuickCaptureProps extends Omit<ComponentProps<"div">, "onChange" | "children" | "title"> {
  /** Controlled open state. Default uncontrolled, starting at `defaultOpen`. Ignored by `presentation="panel"`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Save the capture. Return `{ error }` (or throw) to keep the text and show the message.
   * The dialog closes, or the panel clears, only after it resolves.
   */
  onCapture: (capture: CaptureValue) => void | { error?: string } | undefined | Promise<void | { error?: string } | undefined>;
  /** A dialog over the page, or the bare form for a popup, side panel or extension window. Default `dialog`. */
  presentation?: "dialog" | "panel";
  /**
   * Global shortcut that toggles the dialog, like "Mod+Shift+K" (Mod is Cmd on Apple, Ctrl elsewhere). Needs a
   * modifier. Pass `null` for no shortcut. The listener lives only while this component is mounted.
   */
  shortcut?: string | null;
  /** Turn the shortcut off without unmounting. Default true. */
  shortcutEnabled?: boolean;
  /** The page being clipped (web clipper). Shows its title and link, and the capture becomes a `clip`. */
  page?: QuickCapturePage;
  /** Where captures go. Shows a picker when there is more than one. */
  destinations?: QuickCaptureDestination[];
  defaultDestinationId?: string;
  /** Tags offered as toggles under the text box. */
  suggestedTags?: string[];
  initialText?: string;
  placeholder?: string;
  /** Show the shortcut hints. Default true. */
  showHints?: boolean;
  labels?: QuickCaptureLabels;
}

/**
 * Get a thought or a page into the inbox in a couple of seconds. A global shortcut opens a small dialog with a focused
 * text box; Ctrl/Cmd+Enter saves, Escape closes. With `page` it becomes the web-clipper popup: the page is shown and
 * saved with your note. Use `presentation="panel"` to render only the form (a floating window, extension popup).
 * The shortcut listener exists only while the component is mounted and enabled, so it never leaks.
 */
export function QuickCapture({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onCapture,
  presentation = "dialog",
  shortcut = "Mod+Shift+K",
  shortcutEnabled = true,
  page,
  destinations,
  defaultDestinationId,
  suggestedTags,
  initialText = "",
  placeholder,
  showHints = true,
  labels,
  className,
  ...props
}: QuickCaptureProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setInner(next);
    onOpenChange?.(next);
  };
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;
  const openRef = useRef(open);
  openRef.current = open;

  const spec = useMemo(() => parseCaptureShortcut(shortcut), [shortcut]);
  const dialog = presentation === "dialog";

  useEffect(() => {
    if (!dialog || !spec || !shortcutEnabled) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!matchesCaptureShortcut(spec, event, isApplePlatform())) return;
      event.preventDefault();
      setOpenRef.current(!openRef.current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, spec, shortcutEnabled]);

  const form = (
    <CaptureForm
      t={t}
      ar={ar}
      dialog={dialog}
      onCapture={onCapture}
      onDone={() => setOpen(false)}
      onClose={() => setOpen(false)}
      page={page}
      destinations={destinations}
      defaultDestinationId={defaultDestinationId}
      suggestedTags={suggestedTags}
      initialText={initialText}
      placeholder={placeholder}
      hintKeys={showHints && spec && dialog ? captureShortcutKeys(spec, isApplePlatform()) : []}
      showHints={showHints}
    />
  );

  if (!dialog) {
    return (
      <div data-slot="quick-capture" data-presentation="panel" className={cn("flex min-w-0 flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground", className)} {...props}>
        {form}
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-slot="quick-capture" data-presentation="dialog" className={cn("max-w-xl", className)} showClose {...(props as object)}>
        {form}
      </DialogContent>
    </Dialog>
  );
}

interface CaptureFormProps {
  t: (typeof STRINGS)["en"];
  ar: boolean;
  dialog: boolean;
  onCapture: QuickCaptureProps["onCapture"];
  onDone: () => void;
  onClose: () => void;
  page?: QuickCapturePage;
  destinations?: QuickCaptureDestination[];
  defaultDestinationId?: string;
  suggestedTags?: string[];
  initialText: string;
  placeholder?: string;
  hintKeys: string[];
  showHints: boolean;
}

function CaptureForm({ t, dialog, onCapture, onDone, onClose, page, destinations, defaultDestinationId, suggestedTags, initialText, placeholder, hintKeys, showHints }: CaptureFormProps) {
  const [text, setText] = useState(initialText);
  const [picked, setPicked] = useState<string[]>([]);
  const [destination, setDestination] = useState(defaultDestinationId ?? destinations?.[0]?.id);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const busy = useRef(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const clip = Boolean(page);
  const typedTags = useMemo(() => extractCaptureTags(text), [text]);
  const canSave = canSaveCapture(text, page);
  const destLabel = destinations?.find((d) => d.id === destination)?.label;

  const save = async () => {
    if (busy.current) return;
    if (!canSave) {
      setError(t.empty);
      area.current?.focus();
      return;
    }
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      const outcome = await onCapture(buildCapture({ text, tags: picked, page, destinationId: destination }));
      if (outcome && typeof outcome === "object" && outcome.error) {
        setError(outcome.error);
        return;
      }
      if (dialog) {
        onDone();
      } else {
        setText("");
        setPicked([]);
        setSaved(destLabel ? fill(t.saved, { destination: destLabel }) : t.savedPlain);
        area.current?.focus();
      }
    } catch {
      setError(t.failed);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (isCaptureSaveKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing })) {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape" && !dialog && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onClose();
    }
  };

  
  const Title = dialog ? DialogTitle : "p";
  const Desc = dialog ? DialogDescription : "p";
  const apple = isApplePlatform();
  const modKey = apple ? "⌘" : "Ctrl";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keydown bubbles from the fields to save with Ctrl/Cmd+Enter
    <div className="flex min-w-0 flex-col gap-4" onKeyDown={onKeyDown}>
      <div className="flex flex-col gap-1">
        <Title className="flex items-center gap-2 text-h4 font-semibold">
          <Icon icon={clip ? Globe : Zap} className="size-4 text-muted-foreground" />
          {clip ? t.clipTitle : t.title}
        </Title>
        <Desc className="text-body-sm text-muted-foreground">{clip ? t.clipDescription : t.description}</Desc>
      </div>

      {page ? (
        <div className="flex min-w-0 flex-col gap-1 rounded-card border border-border bg-nq-surface-2 p-3" data-slot="quick-capture-page">
          <span className="eyebrow">{t.page}</span>
          {page.title ? (
            <span dir="auto" className="truncate text-body font-medium">
              {page.title}
            </span>
          ) : null}
          <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
            {page.url}
          </bdi>
          {page.selection ? (
            <blockquote dir="auto" className="mt-1 line-clamp-3 border-s-2 border-border ps-3 text-body-sm text-muted-foreground">
              {page.selection}
            </blockquote>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Textarea
          ref={area}
          autoFocus
          rows={clip ? 3 : 5}
          dir="auto"
          value={text}
          readOnly={pending}
          placeholder={placeholder ?? (clip ? t.clipPlaceholder : t.placeholder)}
          aria-label={clip ? t.clipPlaceholder : t.title}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(undefined);
            if (saved) setSaved(undefined);
          }}
          className="min-h-0 resize-none"
        />
        {error ? (
          <p id={errorId} role="alert" className="text-caption text-nq-danger-text">
            {error}
          </p>
        ) : null}
      </div>

      {typedTags.length || suggestedTags?.length ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.tags}>
          <Icon icon={Hash} className="size-3.5 text-muted-foreground" />
          {typedTags.map((tag) => (
            <Badge key={`typed-${tag}`} variant="tag">
              <bdi>#{tag}</bdi>
            </Badge>
          ))}
          {suggestedTags
            ?.filter((tag) => !typedTags.includes(tag.toLowerCase()))
            .map((tag) => {
              const on = picked.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== tag) : [...p, tag]))}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-caption outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
                    on ? "border-transparent bg-nq-selected text-foreground" : "border-border text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                  )}
                >
                  {on ? <Icon icon={Check} className="size-3" /> : null}
                  <bdi>#{tag}</bdi>
                </button>
              );
            })}
        </div>
      ) : null}

      {destinations && destinations.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t.destination}>
          <span className="text-caption text-muted-foreground">{t.destination}</span>
          {destinations.map((d) => {
            const on = d.id === destination;
            return (
              // biome-ignore lint/a11y/useSemanticElements: a segmented radio, styled as a button
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDestination(d.id)}
                className={cn(
                  "inline-flex h-control-sm items-center gap-1.5 rounded-control border px-2.5 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus",
                  on ? "border-transparent bg-nq-selected text-foreground" : "border-border text-muted-foreground hover:bg-nq-hover hover:text-foreground",
                )}
              >
                {d.icon ?? <Icon icon={NotebookPen} className="size-3.5" />}
                {d.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <p role="status" className={cn("text-caption text-nq-success-text", !saved && "sr-only")}>
        {saved ?? ""}
      </p>

      <div className={cn("flex flex-wrap items-center gap-2", dialog ? "" : "justify-between")}>
        {showHints ? (
          <p className="me-auto flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground" dir="ltr">
            <span className="inline-flex items-center gap-0.5">
              <Kbd>{modKey}</Kbd>
              <Kbd>Enter</Kbd>
            </span>
            <span>{t.saveHint}</span>
            <span aria-hidden>·</span>
            <Kbd>Esc</Kbd>
            <span>{t.closeHint}</span>
            {hintKeys.length ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-0.5" title={t.shortcutHint}>
                  {hintKeys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </>
            ) : null}
          </p>
        ) : null}
        <div className={cn("flex gap-2", dialog ? "" : "ms-auto")}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {t.cancel}
          </Button>
          <Button type="button" variant="primary" loading={pending} disabled={!canSave} onClick={() => void save()}>
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
