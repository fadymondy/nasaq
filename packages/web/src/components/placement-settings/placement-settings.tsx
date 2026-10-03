"use client";

import { Save, Undo2 } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Input } from "../field";
import { RadioCard, RadioGroup } from "../radio-group";
import { Switch } from "../switch";
import {
  canBeDefaultPage,
  isModeAvailable,
  PLACEMENT_MODES,
  type PlacementMode,
  type PlacementValue,
  parseOrder,
  placementChanges,
  withMode,
} from "./placement-settings-logic";

export * from "./placement-settings-logic";

const STRINGS = {
  en: {
    title: "Appearance & placement",
    description: "Choose where this shows up in the app and in what order.",
    placement: "Placement",
    modes: {
      sidebar: "Sidebar",
      header: "Header",
      sideover: "Side panel",
      fixed: "Floating widget",
      hidden: "Hidden",
    } as Record<PlacementMode, string>,
    modeHints: {
      sidebar: "A link in the main sidebar.",
      header: "A button in the top bar, next to notifications.",
      sideover: "Slides in from the edge, opened from a button in the top bar.",
      fixed: "Floats on every page, like an assistant.",
      hidden: "Not shown anywhere in the app.",
    } as Record<PlacementMode, string>,
    overlayOnly: "Only for capability plugins.",
    order: "Order",
    orderHint: "Lower numbers come first.",
    orderInvalid: "Enter a whole number, 0 or more.",
    defaultPage: "Open on start",
    defaultPageHint: "People land on this page when they open the app.",
    defaultPageBlocked: "Only items in the sidebar or header can be the start page.",
    unsaved: "Unsaved changes",
    saved: "All changes saved",
    save: "Save changes",
    reset: "Discard",
    saveFailed: "Could not save",
  },
  ar: {
    title: "المظهر والموضع",
    description: "اختر مكان ظهوره في التطبيق وترتيبه.",
    placement: "الموضع",
    modes: {
      sidebar: "الشريط الجانبي",
      header: "الشريط العلوي",
      sideover: "لوحة جانبية",
      fixed: "أداة عائمة",
      hidden: "مخفي",
    } as Record<PlacementMode, string>,
    modeHints: {
      sidebar: "رابط في الشريط الجانبي الرئيسي.",
      header: "زر في الشريط العلوي بجانب الإشعارات.",
      sideover: "تنزلق من الحافة، وتُفتح من زر في الشريط العلوي.",
      fixed: "تطفو فوق كل الصفحات، مثل المساعد.",
      hidden: "لا يظهر في أي مكان من التطبيق.",
    } as Record<PlacementMode, string>,
    overlayOnly: "لإضافات القدرات فقط.",
    order: "الترتيب",
    orderHint: "الأرقام الأصغر تظهر أولًا.",
    orderInvalid: "أدخل عددًا صحيحًا، صفرًا أو أكثر.",
    defaultPage: "الفتح عند البدء",
    defaultPageHint: "تظهر هذه الصفحة أولًا عند فتح التطبيق.",
    defaultPageBlocked: "صفحة البدء تكون فقط لعنصر في الشريط الجانبي أو العلوي.",
    unsaved: "تغييرات غير محفوظة",
    saved: "كل التغييرات محفوظة",
    save: "حفظ التغييرات",
    reset: "تجاهل",
    saveFailed: "تعذر الحفظ",
  },
};

export type PlacementSettingsLabels = (typeof STRINGS)["en"];

export interface PlacementSettingsProps extends Omit<ComponentProps<"section">, "onSubmit" | "title"> {
  /** The saved placement. The form starts from it and starts over whenever it changes (after a save). */
  value: PlacementValue;
  /** Called with only the fields that changed. Return a promise to show saving until it settles. */
  onSave: (changes: Partial<PlacementValue>) => void | Promise<unknown>;
  /** Saving from outside, e.g. a mutation's pending state. */
  saving?: boolean;
  /** `true` or a message: the last save failed. */
  error?: boolean | ReactNode;
  /** Allow the side panel and floating widget modes. Default `false`. */
  allowOverlays?: boolean;
  /** Show the "Open on start" switch. Default `false`. */
  allowDefaultPage?: boolean;
  /** Which modes to offer, in order. Default all five. */
  modes?: readonly PlacementMode[];
  /** Replaces the heading; `null` for none (e.g. inside a `DetailLayout` tab that already has one). */
  title?: ReactNode;
  description?: ReactNode;
  headingAs?: ElementType;
  labels?: Partial<PlacementSettingsLabels>;
}

/** A small picture of the app shell, with where this item would sit filled in. */
function ShellDiagram({ mode }: { mode: PlacementMode }) {
  const on = "bg-primary";
  return (
    <span
      aria-hidden
      data-slot="placement-diagram"
      className={cn(
        "relative block h-11 w-16 shrink-0 overflow-hidden rounded-control border bg-background",
        mode === "hidden" ? "border-dashed border-nq-line-strong opacity-60" : "border-border",
      )}
    >
      <span className="absolute inset-y-0 start-0 w-3.5 border-e border-border bg-muted" />
      <span className="absolute inset-x-0 top-0 h-2.5 border-b border-border bg-muted" />
      <span className="absolute start-1 top-4 h-0.5 w-1.5 rounded-full bg-nq-line-strong" />
      <span className="absolute start-1 top-6 h-0.5 w-1.5 rounded-full bg-nq-line-strong" />
      {mode === "sidebar" ? <span className={cn("absolute start-0.5 top-[1.875rem] h-1 w-2.5 rounded-full", on)} /> : null}
      {mode === "header" ? <span className={cn("absolute end-1 top-0.5 h-1.5 w-3 rounded-full", on)} /> : null}
      {mode === "sideover" ? (
        <span className="absolute inset-y-0 end-0 w-5 border-s-2 border-primary bg-nq-selected" />
      ) : null}
      {mode === "fixed" ? <span className={cn("absolute bottom-1 end-1 size-2.5 rounded-full", on)} /> : null}
    </span>
  );
}

/**
 * Where a plugin or module appears in the app shell: sidebar, header, a side panel, a floating widget or nowhere,
 * its order, and whether the app opens on it. Holds a draft, shows what is unsaved, and saves only what changed.
 */
export function PlacementSettings({
  value,
  onSave,
  saving: savingProp = false,
  error,
  allowOverlays = false,
  allowDefaultPage = false,
  modes = PLACEMENT_MODES,
  title,
  description,
  headingAs: Heading = "h2",
  labels,
  className,
  ...props
}: PlacementSettingsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = { ...base, ...labels, modes: { ...base.modes, ...labels?.modes }, modeHints: { ...base.modeHints, ...labels?.modeHints } };
  const id = useId();

  const [draft, setDraft] = useState<PlacementValue>(value);
  const [orderText, setOrderText] = useState(String(value.order));
  const [pending, setPending] = useState(false);
  // Start over from the saved value whenever it changes.
  const key = `${value.mode}|${value.order}|${Boolean(value.defaultPage)}`;
  useEffect(() => {
    setDraft(value);
    setOrderText(String(value.order));
  }, [key]);

  const orderValid = parseOrder(orderText) !== null;
  const changes = placementChanges(value, draft, allowDefaultPage);
  const dirty = Object.keys(changes).length > 0 || !orderValid;
  const saving = savingProp || pending;
  const startAllowed = canBeDefaultPage(draft.mode);

  const save = () => {
    if (!orderValid || !Object.keys(changes).length) return;
    const result = onSave(changes);
    if (result && typeof (result as Promise<unknown>).finally === "function") {
      setPending(true);
      (result as Promise<unknown>).catch(() => {}).finally(() => setPending(false));
    }
  };

  const reset = () => {
    setDraft(value);
    setOrderText(String(value.order));
  };

  const heading = title === undefined ? t.title : title;
  const sub = description === undefined ? t.description : description;

  return (
    <section
      data-slot="placement-settings"
      data-dirty={dirty || undefined}
      aria-labelledby={heading ? `${id}-title` : undefined}
      className={cn("flex flex-col rounded-card border border-border bg-card", className)}
      {...props}
    >
      {heading || sub ? (
        <header className="flex flex-col gap-1 border-b border-border px-5 py-4">
          {heading ? (
            <Heading id={`${id}-title`} className="text-h4 text-foreground">
              {heading}
            </Heading>
          ) : null}
          {sub ? <p className="text-body-sm text-muted-foreground">{sub}</p> : null}
        </header>
      ) : null}

      <div className="flex flex-col gap-6 px-5 py-5">
        <fieldset className="flex flex-col gap-2">
          <legend id={`${id}-placement`} className="pb-2 text-label text-foreground">
            {t.placement}
          </legend>
          <RadioGroup
            aria-labelledby={`${id}-placement`}
            value={draft.mode}
            onValueChange={(next) => setDraft((d) => withMode(d, next as PlacementMode))}
            disabled={saving}
            className="grid gap-2 sm:grid-cols-2"
          >
            {modes.map((mode) => {
              const available = isModeAvailable(mode, allowOverlays);
              return (
                <RadioCard
                  key={mode}
                  value={mode}
                  data-mode={mode}
                  disabled={!available}
                  title={t.modes[mode]}
                  description={available ? t.modeHints[mode] : `${t.modeHints[mode]} ${t.overlayOnly}`}
                  meta={<ShellDiagram mode={mode} />}
                  className="p-3"
                />
              );
            })}
          </RadioGroup>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-order`} className="text-label text-foreground">
              {t.order}
            </label>
            <Input
              id={`${id}-order`}
              ltr
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={orderText}
              disabled={saving}
              aria-invalid={!orderValid || undefined}
              aria-describedby={`${id}-order-hint`}
              onChange={(e) => {
                const text = e.currentTarget.value;
                setOrderText(text);
                const n = parseOrder(text);
                if (n !== null) setDraft((d) => ({ ...d, order: n }));
              }}
              className="w-32"
            />
            <p id={`${id}-order-hint`} className={cn("text-caption", orderValid ? "text-muted-foreground" : "text-nq-danger-text")}>
              {orderValid ? t.orderHint : t.orderInvalid}
            </p>
          </div>

          {allowDefaultPage ? (
            <div data-slot="placement-default-page" className="flex items-start gap-3">
              <Switch
                id={`${id}-start`}
                checked={Boolean(draft.defaultPage) && startAllowed}
                disabled={!startAllowed || saving}
                onCheckedChange={(checked) => setDraft((d) => ({ ...d, defaultPage: checked }))}
                aria-describedby={`${id}-start-hint`}
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <label htmlFor={`${id}-start`} className={cn("text-label text-foreground", !startAllowed && "opacity-50")}>
                  {t.defaultPage}
                </label>
                <p id={`${id}-start-hint`} className="text-caption text-muted-foreground">
                  {startAllowed ? t.defaultPageHint : t.defaultPageBlocked}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <Alert tone="danger" title={t.saveFailed}>
            {error === true ? null : error}
          </Alert>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
        <span role="status" data-slot="placement-state" className="text-caption text-muted-foreground">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--nq-tag-amber)]" />
              {t.unsaved}
            </span>
          ) : (
            t.saved
          )}
        </span>
        <div className="ms-auto flex gap-2">
          <Button size="sm" variant="ghost" onClick={reset} disabled={!dirty || saving}>
            <Undo2 aria-hidden />
            {t.reset}
          </Button>
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty || !orderValid}>
            <Save aria-hidden />
            {t.save}
          </Button>
        </div>
      </footer>
    </section>
  );
}
