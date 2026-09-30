"use client";

import { ArrowDown, ArrowUp, OctagonX, Plus, RotateCcw, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { type FeatureFlag, type FlagEnvironmentDef, type FlagVariant, clampRollout, flagState, isValidFlagKey, normalizeWeights } from "../feature-flags/flag-model";
import { Field, FieldLabel, Input } from "../field";
import { Num } from "../numeric";
import { type RuleActionType, type RuleDefinition, type RuleEvent, type RuleField, RuleBuilder, emptyRule, validateRule } from "../rule-builder";
import { Slider } from "../slider";
import { Status } from "../status";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type FlagAuditEntry, FlagAuditHistory } from "./flag-audit";

export { FlagAuditHistory } from "./flag-audit";
export type { FlagAuditAction, FlagAuditEntry, FlagAuditHistoryProps, FlagAuditLabels } from "./flag-audit";

const STRINGS = {
  en: {
    tabEnvironments: "Environments",
    tabTargeting: "Targeting",
    tabVariants: "Variants",
    tabHistory: "History",
    stateKilled: "Killed",
    stateOn: "On",
    statePartial: "Rolling out",
    stateOff: "Off",
    kill: "Kill switch",
    killTitle: "Kill this flag everywhere?",
    killBody: "It turns off in every environment at once, whatever the switches and rules say. Turn it back on with Restore.",
    reasonLabel: "Reason (kept in the history)",
    reasonPlaceholder: "Errors after the last deploy",
    killConfirm: "Kill flag",
    cancel: "Cancel",
    killedTitle: "This flag is killed",
    killedBody: "It is off for everyone in every environment.",
    restore: "Restore",
    envTitle: "Environments",
    envDescription: "Switch the flag per environment and choose how many users get it.",
    enabled: "Enabled",
    rollout: "Rollout",
    rolloutOf: (env: string) => `Rollout in ${env}`,
    rolloutHint: "Users are picked by a stable hash of their id, so raising the percentage keeps the ones who already have it.",
    targetingTitle: "Targeting rules",
    targetingDescription: "Serve a variant to specific users. The first rule that matches wins and skips the rollout.",
    noRules: "No targeting rules. Everyone follows the rollout.",
    rule: (n: number) => `Rule ${n}`,
    addRule: "Add rule",
    removeRule: (n: number) => `Remove rule ${n}`,
    moveRuleUp: (n: number) => `Move rule ${n} up`,
    moveRuleDown: (n: number) => `Move rule ${n} down`,
    saveRules: "Save targeting",
    fixRules: "Finish or remove the rules that are incomplete.",
    evaluated: "the flag is evaluated",
    serve: "Serve variant",
    serveOn: "Serve the flag",
    variantField: "Variant",
    variantsTitle: "Variants",
    variantsDescription: "Split the users who get the flag between values. Only the ratio of the weights matters.",
    noVariants: "No variants: the flag is a plain on/off.",
    variantKey: "Key",
    variantWeight: "Weight",
    variantShare: "Share",
    addVariant: "Add variant",
    removeVariant: (k: string) => `Remove variant ${k}`,
    saveVariants: "Save variants",
    keyInvalid: "Keys are lowercase letters, digits, dots, dashes and underscores.",
    keyDuplicate: "Each key can be used once.",
    saved: "Saved.",
    failed: "Could not save this. Try again.",
    historyTitle: "Audit history",
    updated: "Updated",
  },
  ar: {
    tabEnvironments: "البيئات",
    tabTargeting: "الاستهداف",
    tabVariants: "المتغيّرات",
    tabHistory: "السجل",
    stateKilled: "موقوف طارئًا",
    stateOn: "يعمل",
    statePartial: "إطلاق تدريجي",
    stateOff: "متوقف",
    kill: "الإيقاف الطارئ",
    killTitle: "إيقاف هذا المفتاح في كل مكان؟",
    killBody: "سيتوقف في كل البيئات دفعة واحدة مهما كانت المفاتيح والقواعد. أعده بزر الاستعادة.",
    reasonLabel: "السبب (يُحفظ في السجل)",
    reasonPlaceholder: "أخطاء بعد آخر نشر",
    killConfirm: "إيقاف المفتاح",
    cancel: "إلغاء",
    killedTitle: "هذا المفتاح موقوف طارئًا",
    killedBody: "هو متوقف للجميع في كل البيئات.",
    restore: "استعادة",
    envTitle: "البيئات",
    envDescription: "شغّل المفتاح لكل بيئة واختر نسبة المستخدمين الذين يحصلون عليه.",
    enabled: "مفعّل",
    rollout: "الإطلاق",
    rolloutOf: (env: string) => `الإطلاق في ${env}`,
    rolloutHint: "يُختار المستخدمون بتجزئة ثابتة لمعرّفهم، فرفع النسبة يُبقي من حصلوا عليه سابقًا.",
    targetingTitle: "قواعد الاستهداف",
    targetingDescription: "قدّم متغيّرًا لمستخدمين محددين. أول قاعدة تنطبق تفوز وتتجاوز الإطلاق.",
    noRules: "لا قواعد استهداف. الجميع يتبع الإطلاق.",
    rule: (n: number) => `القاعدة ${n}`,
    addRule: "إضافة قاعدة",
    removeRule: (n: number) => `حذف القاعدة ${n}`,
    moveRuleUp: (n: number) => `نقل القاعدة ${n} للأعلى`,
    moveRuleDown: (n: number) => `نقل القاعدة ${n} للأسفل`,
    saveRules: "حفظ الاستهداف",
    fixRules: "أكمل القواعد الناقصة أو احذفها.",
    evaluated: "يُقيَّم المفتاح",
    serve: "تقديم متغيّر",
    serveOn: "تقديم المفتاح",
    variantField: "المتغيّر",
    variantsTitle: "المتغيّرات",
    variantsDescription: "وزّع المستخدمين الذين يحصلون على المفتاح بين قيم. المهم هو نسبة الأوزان فقط.",
    noVariants: "لا متغيّرات: المفتاح تشغيل وإيقاف فقط.",
    variantKey: "المفتاح",
    variantWeight: "الوزن",
    variantShare: "الحصة",
    addVariant: "إضافة متغيّر",
    removeVariant: (k: string) => `حذف المتغيّر ${k}`,
    saveVariants: "حفظ المتغيّرات",
    keyInvalid: "المفاتيح حروف صغيرة وأرقام ونقاط وشرطات.",
    keyDuplicate: "يُستخدم كل مفتاح مرة واحدة.",
    saved: "تم الحفظ.",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    historyTitle: "سجل التدقيق",
    updated: "آخر تحديث",
  },
};

export type FeatureFlagDetailLabels = typeof STRINGS.en;

type Result = void | { error?: string };

export interface FeatureFlagDetailProps {
  flag: FeatureFlag;
  environments: readonly FlagEnvironmentDef[];
  /** What targeting rules can test: the user's plan, country, email domain and so on. */
  fields: readonly RuleField[];
  audit?: readonly FlagAuditEntry[];
  /** Turns the flag on or off in one environment. Without it the switches are read only. */
  onToggle?: (environmentId: string, enabled: boolean) => Promise<Result>;
  /** Saves a rollout percentage (0 to 100) once the slider is released. */
  onRolloutChange?: (environmentId: string, percent: number) => Promise<Result>;
  onRulesChange?: (rules: RuleDefinition[]) => Promise<Result>;
  onVariantsChange?: (variants: FlagVariant[]) => Promise<Result>;
  /** Kills the flag everywhere. Without it the kill switch is hidden. */
  onKill?: (reason: string) => Promise<Result>;
  onRestore?: () => Promise<Result>;
  className?: string;
  labels?: Partial<FeatureFlagDetailLabels>;
}

const EVENT_ID = "evaluate";

function stateTone(s: ReturnType<typeof flagState>): "danger" | "success" | "warning" | "neutral" {
  return s === "killed" ? "danger" : s === "on" ? "success" : s === "partial" ? "warning" : "neutral";
}

/**
 * One flag in full: the kill switch, an on/off switch and rollout slider per environment, targeting rules built with the
 * rule builder (each serves a variant, first match wins), the variants and their weights, and the audit history.
 */
export function FeatureFlagDetail({ flag, environments, fields, audit, onToggle, onRolloutChange, onRulesChange, onVariantsChange, onKill, onRestore, className, labels }: FeatureFlagDetailProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [tab, setTab] = useState("environments");
  const [note, setNote] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [killing, setKilling] = useState(false);
  const [reason, setReason] = useState("");
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [rules, setRules] = useState<RuleDefinition[]>(flag.rules);
  const [variants, setVariants] = useState<FlagVariant[]>(flag.variants);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setRules(flag.rules), [flag.rules]);
  useEffect(() => setVariants(flag.variants), [flag.variants]);
  useEffect(() => setDrafts({}), [flag.environments]);

  const state = flagState(flag, environments[environments.length - 1]?.id ?? "");
  const stateLabel = { killed: t.stateKilled, on: t.stateOn, partial: t.statePartial, off: t.stateOff }[state];

  const run = async (id: string, fn: () => Promise<Result>, success = false) => {
    setBusy(id);
    setNote(null);
    try {
      const out = await fn();
      if (out && out.error) setNote({ tone: "danger", text: out.error });
      else if (success) setNote({ tone: "success", text: t.saved });
    } catch {
      setNote({ tone: "danger", text: t.failed });
    } finally {
      setBusy(null);
    }
  };

  // Targeting rules: one event, one action that serves a variant.
  const events = useMemo<RuleEvent[]>(() => [{ id: EVENT_ID, label: t.evaluated }], [t]);
  const actionTypes = useMemo<RuleActionType[]>(
    () => [
      variants.length > 0
        ? { id: "serve", label: t.serve, fields: [{ name: "variant", label: t.variantField, kind: "select", required: true, options: variants.map((v) => ({ value: v.key, label: v.label ?? v.key })) }], defaults: { variant: variants[0]!.key } }
        : { id: "serve", label: t.serveOn },
    ],
    [t, variants],
  );
  const rulesValid = rules.every((r) => validateRule(r, fields, actionTypes).length === 0);
  const rulesDirty = JSON.stringify(rules) !== JSON.stringify(flag.rules);

  const newRule = (): RuleDefinition => {
    const base = emptyRule();
    return { ...base, event: EVENT_ID, actions: [{ id: `a-${Date.now().toString(36)}`, type: "serve", config: variants[0] ? { variant: variants[0].key } : {} }] };
  };
  const moveRule = (i: number, to: number) => {
    if (to < 0 || to >= rules.length) return;
    const next = [...rules];
    const [r] = next.splice(i, 1);
    next.splice(to, 0, r!);
    setRules(next);
  };

  // Variants
  const shares = normalizeWeights(variants.map((v) => v.weight));
  const keys = variants.map((v) => v.key);
  const keyError = (v: FlagVariant, i: number): string | null => (!isValidFlagKey(v.key) ? t.keyInvalid : keys.indexOf(v.key) !== i ? t.keyDuplicate : null);
  const variantsValid = variants.every((v, i) => keyError(v, i) === null);
  const variantsDirty = JSON.stringify(variants) !== JSON.stringify(flag.variants);

  return (
    <div data-slot="feature-flag-detail" className={cn("flex w-full flex-col gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 dir="auto" className="text-heading-sm text-foreground">
              {flag.name}
            </h2>
            <Status tone={stateTone(state)}>{stateLabel}</Status>
          </div>
          <bdi dir="ltr" className="font-mono text-caption text-muted-foreground">
            {flag.key}
          </bdi>
          {flag.description ? (
            <p dir="auto" className="max-w-prose text-body-sm text-muted-foreground">
              {flag.description}
            </p>
          ) : null}
        </div>
        {onKill && !flag.killed ? (
          <Button variant="danger" onClick={() => setKilling(true)}>
            <OctagonX aria-hidden />
            {t.kill}
          </Button>
        ) : null}
      </div>

      {flag.killed ? (
        <Alert
          tone="danger"
          title={t.killedTitle}
          action={
            onRestore ? (
              <Button size="sm" variant="secondary" loading={busy === "restore"} onClick={() => void run("restore", onRestore)}>
                <RotateCcw aria-hidden />
                {t.restore}
              </Button>
            ) : undefined
          }
        >
          {t.killedBody}
        </Alert>
      ) : null}
      {note ? (
        <Alert tone={note.tone} onDismiss={() => setNote(null)}>
          {note.text}
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="environments">{t.tabEnvironments}</TabsTab>
          <TabsTab value="targeting">{t.tabTargeting}</TabsTab>
          <TabsTab value="variants">{t.tabVariants}</TabsTab>
          <TabsTab value="history">{t.tabHistory}</TabsTab>
        </TabsList>

        <TabsPanel value="environments" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">{t.envTitle}</CardTitle>
              <CardDescription>{t.envDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border">
              {environments.map((env) => {
                const st = flag.environments[env.id] ?? { enabled: false, rollout: 0 };
                const draft = drafts[env.id] ?? st.rollout;
                return (
                  <div key={env.id} data-slot="flag-environment" className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-label text-foreground">{env.label}</span>
                      <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
                        {t.enabled}
                        <Switch
                          checked={st.enabled}
                          disabled={!onToggle || flag.killed || busy === `toggle-${env.id}`}
                          aria-label={`${env.label}: ${t.enabled}`}
                          onCheckedChange={(on) => onToggle && void run(`toggle-${env.id}`, () => onToggle(env.id, on))}
                        />
                      </label>
                    </div>
                    <Slider
                      label={t.rolloutOf(env.label)}
                      min={0}
                      max={100}
                      step={1}
                      value={draft}
                      disabled={!onRolloutChange || flag.killed || !st.enabled}
                      format={{ style: "unit", unit: "percent" }}
                      onValueChange={(v) => setDrafts((d) => ({ ...d, [env.id]: clampRollout(Array.isArray(v) ? (v[0] ?? 0) : v) }))}
                      onValueCommitted={(v) => {
                        const pct = clampRollout(Array.isArray(v) ? (v[0] ?? 0) : v);
                        if (onRolloutChange && pct !== st.rollout) void run(`rollout-${env.id}`, () => onRolloutChange(env.id, pct));
                      }}
                    />
                  </div>
                );
              })}
              <p className="pt-4 text-caption text-muted-foreground">{t.rolloutHint}</p>
            </CardContent>
          </Card>
        </TabsPanel>

        <TabsPanel value="targeting" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">{t.targetingTitle}</CardTitle>
              <CardDescription>{t.targetingDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {rules.length === 0 ? <p className="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{t.noRules}</p> : null}
              {rules.map((rule, i) => (
                <section key={i} aria-label={t.rule(i + 1)} data-slot="flag-rule" className="flex flex-col gap-3 rounded-card border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label text-foreground">{t.rule(i + 1)}</span>
                    {onRulesChange ? (
                      <span className="flex items-center">
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveRuleUp(i + 1)} disabled={i === 0} onClick={() => moveRule(i, i - 1)}>
                          <ArrowUp aria-hidden />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveRuleDown(i + 1)} disabled={i === rules.length - 1} onClick={() => moveRule(i, i + 1)}>
                          <ArrowDown aria-hidden />
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" aria-label={t.removeRule(i + 1)} onClick={() => setRules(rules.filter((_, j) => j !== i))}>
                          <Trash2 aria-hidden />
                        </Button>
                      </span>
                    ) : null}
                  </div>
                  <RuleBuilder events={events} fields={[...fields]} actionTypes={actionTypes} value={rule} disabled={!onRulesChange} onValueChange={(next) => setRules(rules.map((r, j) => (j === i ? next : r)))} />
                </section>
              ))}
              {!rulesValid ? (
                <p role="alert" className="text-body-sm text-danger">
                  {t.fixRules}
                </p>
              ) : null}
            </CardContent>
            {onRulesChange ? (
              <CardFooter className="justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setRules([...rules, newRule()])}>
                  <Plus aria-hidden />
                  {t.addRule}
                </Button>
                <Button type="button" variant="primary" disabled={!rulesDirty || !rulesValid} loading={busy === "rules"} onClick={() => void run("rules", () => onRulesChange(rules), true)}>
                  {t.saveRules}
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </TabsPanel>

        <TabsPanel value="variants" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">{t.variantsTitle}</CardTitle>
              <CardDescription>{t.variantsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {variants.length === 0 ? <p className="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{t.noVariants}</p> : null}
              {variants.map((v, i) => {
                const err = keyError(v, i);
                return (
                  <div key={i} data-slot="flag-variant" className="flex flex-wrap items-start gap-3">
                    <Field invalid={err !== null} className="min-w-40 flex-1">
                      <FieldLabel>{t.variantKey}</FieldLabel>
                      <Input ltr value={v.key} disabled={!onVariantsChange} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                      {err ? (
                        <span role="alert" className="text-caption text-danger">
                          {err}
                        </span>
                      ) : null}
                    </Field>
                    <Field className="w-28">
                      <FieldLabel>{t.variantWeight}</FieldLabel>
                      <Input
                        ltr
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={v.weight}
                        disabled={!onVariantsChange}
                        onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, weight: Math.max(0, Number(e.target.value) || 0) } : x)))}
                      />
                    </Field>
                    <div className="flex w-20 flex-col gap-1.5">
                      <span className="text-label text-foreground">{t.variantShare}</span>
                      <span className="flex h-9 items-center text-body-sm text-muted-foreground">
                        <Num value={(shares[i] ?? 0) / 100} format={{ style: "percent", maximumFractionDigits: 0 }} />
                      </span>
                    </div>
                    {onVariantsChange ? (
                      <Button type="button" size="icon-sm" variant="ghost" className="mt-6" aria-label={t.removeVariant(v.key)} onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                        <Trash2 aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
            {onVariantsChange ? (
              <CardFooter className="justify-between gap-2">
                <Button type="button" variant="secondary" onClick={() => setVariants([...variants, { key: `variant-${variants.length + 1}`, weight: 1 }])}>
                  <Plus aria-hidden />
                  {t.addVariant}
                </Button>
                <Button type="button" variant="primary" disabled={!variantsDirty || !variantsValid} loading={busy === "variants"} onClick={() => void run("variants", () => onVariantsChange(variants), true)}>
                  {t.saveVariants}
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </TabsPanel>

        <TabsPanel value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle as="h3">{t.historyTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <FlagAuditHistory entries={audit ?? []} />
            </CardContent>
          </Card>
        </TabsPanel>
      </Tabs>

      <AlertDialog open={killing} onOpenChange={(o) => !o && setKilling(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.killTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.killBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel>{t.reasonLabel}</FieldLabel>
            <Input dir="auto" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPlaceholder} />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const r = reason.trim();
                setKilling(false);
                setReason("");
                if (onKill) void run("kill", () => onKill(r));
              }}
            >
              {t.killConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
