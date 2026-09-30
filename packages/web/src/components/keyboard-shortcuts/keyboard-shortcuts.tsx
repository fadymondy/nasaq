"use client";

import { Keyboard, Search } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform, useModKeyLabel } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { EmptyState } from "../states";
import { Kbd } from "../text";
import { Toggle, ToggleGroup } from "../toggle-group";
import { hotkeyCaps, hotkeyMatches, hotkeyParse, hotkeyTextMatches } from "../hotkey-recorder/hotkey-logic";

const STRINGS = {
  en: {
    title: "Keyboard shortcuts",
    description: "Press these keys anywhere in the app.",
    search: "Search shortcuts",
    empty: "No shortcut matches",
    emptyHint: "Try another word, or clear the search.",
    platform: "Show keys for",
    auto: "This device",
    mac: "Mac",
    windows: "Windows",
    then: "then",
    or: "or",
    close: "Close",
    results: (n: string) => `${n} shortcuts`,
    resultsOne: "1 shortcut",
  },
  ar: {
    title: "اختصارات لوحة المفاتيح",
    description: "اضغط هذه المفاتيح من أي مكان في التطبيق.",
    search: "ابحث في الاختصارات",
    empty: "لا يوجد اختصار مطابق",
    emptyHint: "جرّب كلمة أخرى أو امسح البحث.",
    platform: "عرض المفاتيح لـ",
    auto: "هذا الجهاز",
    mac: "ماك",
    windows: "ويندوز",
    then: "ثم",
    or: "أو",
    close: "إغلاق",
    results: (n: string) => `${n} اختصارًا`,
    resultsOne: "اختصار واحد",
  },
};
export type KeyboardShortcutsLabels = Partial<Omit<(typeof STRINGS)["en"], "results" | "resultsOne">> & {
  results?: (count: string) => string;
  resultsOne?: string;
};

/** Which keyboard to draw: the device's own, or a Mac or Windows one. */
export type ShortcutPlatform = "auto" | "mac" | "windows";

export interface ShortcutItem {
  id: string;
  label: string;
  labelAr?: string;
  description?: string;
  descriptionAr?: string;
  /** "Mod+K", "G I". Several strings are alternatives ("Mod+K" or "/"). `Mod` is Cmd on a Mac and Ctrl elsewhere. */
  keys: string | readonly string[];
  /** Different keys on a Mac, when they are not just Cmd for Ctrl. */
  apple?: string | readonly string[];
}

export interface ShortcutGroup {
  id: string;
  title: string;
  titleAr?: string;
  items: readonly ShortcutItem[];
}

const SPOKEN: Record<string, string> = {
  "⌘": "Command",
  "⌃": "Control",
  "⌥": "Option",
  "⇧": "Shift",
  "↑": "Up arrow",
  "↓": "Down arrow",
  "←": "Left arrow",
  "→": "Right arrow",
  "↵": "Return",
  "⌫": "Delete",
  "⌦": "Forward delete",
  "⇥": "Tab",
  "/": "slash",
  "?": "question mark",
  ",": "comma",
  ".": "period",
  "+": "plus",
  "-": "minus",
  "=": "equals",
  "\\": "backslash",
  "[": "left bracket",
  "]": "right bracket",
};

/** True on a Mac, iPhone or iPad, or when `<html data-platform>` says so. Re-renders when the platform changes. */
export function useShortcutApple(platform: ShortcutPlatform = "auto"): boolean {
  const auto = useModKeyLabel() === "⌘";
  return platform === "mac" ? true : platform === "windows" ? false : auto;
}

const asList = (keys: string | readonly string[] | undefined): readonly string[] => (keys === undefined ? [] : typeof keys === "string" ? [keys] : keys);

/** The shortcuts of an item on this platform. */
export function shortcutItemKeys(item: Pick<ShortcutItem, "keys" | "apple">, apple: boolean): readonly string[] {
  return apple && item.apple !== undefined ? asList(item.apple) : asList(item.keys);
}

export interface ShortcutKeysProps {
  /** "Mod+Shift+K" or "G I". */
  shortcut: string;
  platform?: ShortcutPlatform;
  /** Word between the steps of a sequence. Default "then". */
  thenLabel?: string;
  className?: string;
}

/** A shortcut as key caps, drawn for the platform: ⌘ ⇧ K on a Mac, Ctrl Shift K elsewhere. Always left to right. */
export function ShortcutKeys({ shortcut, platform = "auto", thenLabel, className }: ShortcutKeysProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const apple = useShortcutApple(platform);
  const steps = hotkeyParse(shortcut);
  if (!steps) return <span dir="ltr">{shortcut}</span>;
  const capsBySteps = steps.map((s) => hotkeyCaps(s, apple));
  const spoken = capsBySteps.map((caps) => caps.map((c) => SPOKEN[c] ?? c).join(" ")).join(` ${thenLabel ?? t.then} `);
  return (
    <span data-slot="shortcut-keys" dir="ltr" role="img" aria-label={spoken} className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-1", className)}>
      {capsBySteps.map((caps, i) => (
        <Fragment key={i}>
          {i > 0 ? (
            <span aria-hidden className="text-caption text-muted-foreground">
              {thenLabel ?? t.then}
            </span>
          ) : null}
          <span aria-hidden className="inline-flex items-center gap-0.5">
            {caps.map((cap, j) => (
              <Kbd key={j}>{cap}</Kbd>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

const pick = (en: string | undefined, ar: string | undefined, ambient: string) => (ambient.startsWith("ar") ? ar || en : en || ar) ?? "";

export interface ShortcutsReferenceProps {
  groups: readonly ShortcutGroup[];
  /** Which keyboard to draw. Default "auto": this device. */
  platform?: ShortcutPlatform;
  onPlatformChange?: (platform: ShortcutPlatform) => void;
  /** Let people switch between Mac and Windows keys. Default true. */
  showPlatformSwitch?: boolean;
  /** Search box. Default true. */
  searchable?: boolean;
  /** Heading above the list. Pass `null` to hide it. */
  title?: ReactNode | null;
  description?: ReactNode;
  locale?: string;
  labels?: KeyboardShortcutsLabels;
  className?: string;
}

/**
 * A reference of the keyboard shortcuts of an app: grouped, searchable in Arabic and English, drawn for the reader's
 * keyboard (⌘ on a Mac, Ctrl elsewhere) with a switch to see the other one. Presentational: pass the groups.
 */
export function ShortcutsReference({
  groups,
  platform: platformProp,
  onPlatformChange,
  showPlatformSwitch = true,
  searchable = true,
  title,
  description,
  locale: localeProp,
  labels,
  className,
}: ShortcutsReferenceProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const uid = useId();
  const [ownPlatform, setOwnPlatform] = useState<ShortcutPlatform>("auto");
  const platform = platformProp ?? ownPlatform;
  const apple = useShortcutApple(platform);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return groups
      .map((g) => {
        const groupTitle = pick(g.title, g.titleAr, locale);
        const groupHit = query !== "" && hotkeyTextMatches(groupTitle, query);
        const items = g.items.filter(
          (item) =>
            groupHit ||
            hotkeyTextMatches(`${pick(item.label, item.labelAr, locale)} ${pick(item.description, item.descriptionAr, locale)} ${shortcutItemKeys(item, apple).join(" ")}`, query),
        );
        return { group: g, title: groupTitle, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query, locale, apple]);
  const total = visible.reduce((sum, g) => sum + g.items.length, 0);
  const count = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(total);
  const heading = title === undefined ? t.title : title;

  return (
    <section data-slot="shortcuts-reference" aria-labelledby={heading ? `${uid}-title` : undefined} className={cn("flex min-w-0 flex-col gap-4", className)}>
      {heading || description ? (
        <header className="flex flex-col gap-1">
          {heading ? (
            <h2 id={`${uid}-title`} className="text-title text-foreground">
              {heading}
            </h2>
          ) : null}
          {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
        </header>
      ) : null}

      {searchable || showPlatformSwitch ? (
        <div className="flex flex-wrap items-center gap-3">
          {searchable ? (
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-9" />
            </div>
          ) : null}
          {showPlatformSwitch ? (
            <ToggleGroup
              aria-label={t.platform}
              value={[platform]}
              onValueChange={(v) => {
                const next = v[0] as ShortcutPlatform | undefined;
                if (!next) return;
                if (platformProp === undefined) setOwnPlatform(next);
                onPlatformChange?.(next);
              }}
            >
              <Toggle value="auto">{t.auto}</Toggle>
              <Toggle value="mac">{t.mac}</Toggle>
              <Toggle value="windows">{t.windows}</Toggle>
            </ToggleGroup>
          ) : null}
        </div>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {total === 1 ? t.resultsOne : t.results(count)}
      </span>

      {visible.length === 0 ? (
        <EmptyState icon={Keyboard} title={t.empty} description={t.emptyHint} />
      ) : (
        <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
          {visible.map(({ group, title: groupTitle, items }) => (
            <div key={group.id} data-group={group.id} role="group" aria-labelledby={`${uid}-${group.id}`} className="flex min-w-0 flex-col">
              <h3 id={`${uid}-${group.id}`} className="pb-2 text-label text-foreground">
                {groupTitle}
              </h3>
              <ul role="list" className="flex flex-col divide-y divide-border border-y border-border">
                {items.map((item) => {
                  const shortcuts = shortcutItemKeys(item, apple);
                  const description = pick(item.description, item.descriptionAr, locale);
                  return (
                    <li key={item.id} data-item={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
                      <div className="flex min-w-0 flex-1 basis-40 flex-col">
                        <span className="text-body text-foreground">{pick(item.label, item.labelAr, locale)}</span>
                        {description ? <span className="text-caption text-muted-foreground">{description}</span> : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
                        {shortcuts.map((s, i) => (
                          <Fragment key={s}>
                            {i > 0 ? <span className="text-caption text-muted-foreground">{t.or}</span> : null}
                            <ShortcutKeys shortcut={s} platform={platform} thenLabel={t.then} />
                          </Fragment>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export interface ShortcutsDialogProps extends Omit<ShortcutsReferenceProps, "title" | "className"> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Key that opens the dialog from anywhere outside a text field. Default "?". `null` turns it off. */
  hotkey?: string | null;
}

/** The reference in a dialog, opened with "?" from anywhere (outside text fields). */
export function ShortcutsDialog({ open: openProp, defaultOpen = false, onOpenChange, hotkey = "?", locale: localeProp, labels, ...reference }: ShortcutsDialogProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const [own, setOwn] = useState(defaultOpen);
  const open = openProp ?? own;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOwn(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    const step = hotkey ? hotkeyParse(hotkey)?.[0] : undefined;
    if (!step) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.defaultPrevented || event.isComposing || !hotkeyMatches(step, event, isApplePlatform())) return;
      event.preventDefault();
      if (openProp === undefined) setOwn((v) => !v);
      onOpenChange?.(!open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hotkey, open, openProp, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-slot="shortcuts-dialog" closeLabel={t.close} className="max-h-[85dvh] w-[min(56rem,calc(100vw-2rem))] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-title">{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>
        <ShortcutsReference {...reference} title={null} locale={locale} labels={labels} />
      </DialogContent>
    </Dialog>
  );
}
