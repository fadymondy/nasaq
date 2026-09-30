"use client";

import { Save, Undo2 } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { formatNumber } from "../numeric";
import { Toggle, ToggleGroup } from "../toggle-group";
import { changedKeys, effectiveLimit, hasErrors, type LimitErrors, type LimitField, type LimitMode, type LimitRule, type LimitRules, parseNumberInput, ruleOf, validateRules } from "./limits-math";

const STRINGS = {
  en: {
    limits: "Limits",
    mode: "Limit type",
    limit: "Limit",
    unlimited: "Unlimited",
    inherit: "Inherit",
    value: "Limit",
    inheritedValue: (v: string) => `Inherits ${v}`,
    inheritedUnlimited: "Inherits unlimited",
    inheritedNone: "Inherits the default",
    price: "Price",
    overage: "Overage price",
    overageHint: "per extra unit",
    rateLimit: "Rate limit",
    rateHint: "requests per minute",
    spendLimit: "Spend cap",
    spendHint: "per key per month",
    required: "Enter a limit, or choose Unlimited or Inherit.",
    invalid: "Enter zero or a positive number.",
    dirty: (n: string) => (n === "1" ? "1 unsaved change" : `${n} unsaved changes`),
    saved: "Saved",
    save: "Save limits",
    reset: "Discard changes",
    failed: "The limits could not be saved. Try again.",
    fixErrors: "Fix the highlighted fields to save.",
    groupLabel: (name: string) => `${name} limits`,
  },
  ar: {
    limits: "الحدود",
    mode: "نوع الحد",
    limit: "حد",
    unlimited: "غير محدود",
    inherit: "وراثة",
    value: "الحد",
    inheritedValue: (v: string) => `يرث ${v}`,
    inheritedUnlimited: "يرث غير محدود",
    inheritedNone: "يرث القيمة الافتراضية",
    price: "السعر",
    overage: "سعر التجاوز",
    overageHint: "لكل وحدة إضافية",
    rateLimit: "حد المعدل",
    rateHint: "طلب في الدقيقة",
    spendLimit: "سقف الإنفاق",
    spendHint: "لكل مفتاح شهريًا",
    required: "أدخل حدًا، أو اختر غير محدود أو وراثة.",
    invalid: "أدخل صفرًا أو رقمًا موجبًا.",
    dirty: (n: string) => (n === "1" ? "تغيير واحد غير محفوظ" : `${n} تغييرات غير محفوظة`),
    saved: "تم الحفظ",
    save: "حفظ الحدود",
    reset: "تجاهل التغييرات",
    failed: "تعذّر حفظ الحدود. حاول مرة أخرى.",
    fixErrors: "صحّح الحقول المظلّلة لتتمكن من الحفظ.",
    groupLabel: (name: string) => `حدود ${name}`,
  },
};

export type LimitsEditorLabels = Partial<typeof STRINGS.en>;
export type LimitsSaveResult = void | { error?: string };

export interface LimitResource {
  /** Stable key of the resource: "seats", "api_calls". */
  key: string;
  /** Localised name. */
  label: string;
  description?: string;
  /** Noun after the limit: "seats", "GB". Localise it. */
  unit?: string;
}

export interface LimitsEditorProps extends Omit<ComponentProps<"form">, "onSubmit" | "defaultValue" | "children"> {
  resources: readonly LimitResource[];
  /** Controlled rules, keyed by resource key. A missing key means Inherit. */
  value?: LimitRules;
  defaultValue?: LimitRules;
  onValueChange?: (rules: LimitRules) => void;
  /** What Inherit resolves to, per key: a number, or `null` for unlimited. Shown on the row. */
  inherited?: Record<string, number | null>;
  /** Show the price and overage price per resource. */
  showPricing?: boolean;
  /** Show the per-key rate limit and spend cap. */
  showKeyLimits?: boolean;
  /** ISO 4217 code for prices and the spend cap. Default "USD". */
  currency?: string;
  /** Adds the Save and Discard footer. Return `{ error }` to show a failure. */
  onSave?: (rules: LimitRules) => Promise<LimitsSaveResult> | LimitsSaveResult;
  disabled?: boolean;
  labels?: LimitsEditorLabels;
}

const MODES: readonly LimitMode[] = ["limit", "unlimited", "inherit"];

/**
 * A per-resource limits table as a form: each resource is Limit (a number), Unlimited or Inherit, with optional price
 * and overage price, and per-key rate and spend limits. Validates before saving, tracks what changed, and shows what
 * Inherit resolves to. It keeps the rules; your `onSave` persists them.
 */
export function LimitsEditor({
  resources,
  value,
  defaultValue,
  onValueChange,
  inherited,
  showPricing = false,
  showKeyLimits = false,
  currency = "USD",
  onSave,
  disabled = false,
  labels,
  className,
  ...props
}: LimitsEditorProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState<LimitRules>(defaultValue ?? value ?? {});
  const rules = value ?? inner;
  const [baseline, setBaseline] = useState<LimitRules>(rules);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const keys = resources.map((r) => r.key);
  const fields: LimitField[] = ["value", ...(showPricing ? (["price", "overage"] as const) : []), ...(showKeyLimits ? (["rateLimit", "spendLimit"] as const) : [])];
  const errors: LimitErrors = validateRules(rules, keys, fields);
  const dirty = changedKeys(baseline, rules, keys);

  const set = (key: string, patch: Partial<LimitRule>) => {
    const next = { ...rules, [key]: { ...ruleOf(rules, key), ...patch } };
    if (value === undefined) setInner(next);
    onValueChange?.(next);
    setJustSaved(false);
    setFailure(null);
  };
  const replaceAll = (next: LimitRules) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors) || !onSave) return;
    setBusy(true);
    setFailure(null);
    let error: string | undefined;
    try {
      const result = await onSave(rules);
      if (result && typeof result === "object" && result.error) error = result.error;
    } catch (e) {
      error = e instanceof Error && e.message ? e.message : t.failed;
    }
    setBusy(false);
    if (error) {
      setFailure(error);
      return;
    }
    setBaseline(rules);
    setSubmitted(false);
    setJustSaved(true);
  };

  const num = (n: number) => formatNumber(n, locale);
  const errorText = (code?: "required" | "invalid") => (code === "required" ? t.required : code === "invalid" ? t.invalid : undefined);

  const numberField = (key: string, rule: LimitRule, field: LimitField, label: string, hint: ReactNode | undefined, off: boolean) => {
    const err = submitted ? errorText(errors[key]?.[field]) : undefined;
    const v = rule[field];
    return (
      <Field invalid={!!err} disabled={disabled || off} key={field} className="min-w-0">
        <FieldLabel>{label}</FieldLabel>
        <Input
          ltr
          type="number"
          inputMode="decimal"
          min={0}
          step="any"
          value={v === undefined || Number.isNaN(v) ? "" : v}
          placeholder={off ? "—" : undefined}
          onChange={(e) => set(key, { [field]: parseNumberInput(e.currentTarget.value) })}
        />
        {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
        <FieldError match={!!err}>{err}</FieldError>
      </Field>
    );
  };

  return (
    <form data-slot="limits-editor" noValidate onSubmit={submit} className={cn("flex flex-col gap-4", className)} {...props}>
      <ul data-slot="limits-editor-list" aria-label={t.limits} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        {resources.map((res) => {
          const rule = ruleOf(rules, res.key);
          const effective = effectiveLimit(rule, inherited?.[res.key]);
          const changed = dirty.includes(res.key);
          const inheritText =
            rule.mode !== "inherit" ? null : effective === undefined ? t.inheritedNone : effective === null ? t.inheritedUnlimited : t.inheritedValue(res.unit ? `${num(effective)} ${res.unit}` : num(effective));
          return (
            <li key={res.key} data-slot="limits-editor-row" data-key={res.key} data-mode={rule.mode} data-changed={changed || undefined} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 text-label text-foreground">
                    {res.label}
                    {changed ? <span aria-hidden className="size-1.5 rounded-full bg-primary" /> : null}
                  </span>
                  {res.description ? <span className="text-caption text-muted-foreground">{res.description}</span> : null}
                </div>
                <ToggleGroup
                  aria-label={t.groupLabel(res.label)}
                  value={[rule.mode]}
                  disabled={disabled}
                  onValueChange={(v) => {
                    const mode = v[0] as LimitMode | undefined;
                    if (mode && MODES.includes(mode)) set(res.key, { mode });
                  }}
                >
                  {MODES.map((m) => (
                    <Toggle key={m} value={m}>
                      {t[m]}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {rule.mode === "limit" ? (
                  numberField(res.key, rule, "value", res.unit ? `${t.value} (${res.unit})` : t.value, undefined, false)
                ) : (
                  <div data-slot="limits-editor-effective" className="flex min-w-0 flex-col justify-end gap-1 pb-2 text-body-sm text-muted-foreground">
                    {rule.mode === "unlimited" ? <Badge variant="neutral" className="w-fit">{t.unlimited}</Badge> : <bdi>{inheritText}</bdi>}
                  </div>
                )}
                {showPricing ? numberField(res.key, rule, "price", `${t.price} (${currency})`, undefined, false) : null}
                {showPricing ? numberField(res.key, rule, "overage", `${t.overage} (${currency})`, t.overageHint, false) : null}
                {showKeyLimits ? numberField(res.key, rule, "rateLimit", t.rateLimit, t.rateHint, false) : null}
                {showKeyLimits ? numberField(res.key, rule, "spendLimit", `${t.spendLimit} (${currency})`, t.spendHint, false) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {failure ? (
        <Alert tone="danger">{failure || t.failed}</Alert>
      ) : submitted && hasErrors(errors) ? (
        <Alert tone="warning">{t.fixErrors}</Alert>
      ) : null}
      {onSave ? (
        <div data-slot="limits-editor-footer" className="flex flex-wrap items-center justify-end gap-2">
          <span role="status" className="me-auto text-body-sm text-muted-foreground">
            {dirty.length > 0 ? t.dirty(num(dirty.length)) : justSaved ? t.saved : null}
          </span>
          <Button type="button" variant="ghost" disabled={dirty.length === 0 || busy || disabled} onClick={() => { replaceAll(baseline); setSubmitted(false); setFailure(null); }}>
            <Undo2 />
            {t.reset}
          </Button>
          <Button type="submit" variant="primary" loading={busy} disabled={dirty.length === 0 || disabled}>
            <Save />
            {t.save}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
