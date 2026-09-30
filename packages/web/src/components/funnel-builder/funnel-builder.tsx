"use client";

import { ArrowDown, ArrowUp, FileText, MousePointerClick, Plus, X } from "lucide-react";
import { type FormEvent, type ReactNode, useId, useMemo, useState } from "react";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { type FunnelWindow, type WindowUnit, insertStep, moveStep, removeStep, windowKey } from "../funnel-chart/funnel-math";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Toggle, ToggleGroup } from "../toggle-group";

const STRINGS = {
  en: {
    title: "Funnel builder",
    description: "Pick the steps people take, in order, and how long they have to finish them.",
    nameLabel: "Funnel name",
    namePlaceholder: "Signup to first order",
    nameRequired: "Give the funnel a name.",
    stepsTitle: "Steps",
    noSteps: "No steps yet. Add the first event or page below.",
    addTitle: "Add a step",
    kindEvent: "Event",
    kindPage: "Page view",
    pick: "Choose…",
    add: "Add step",
    moveUp: (label: string) => `Move ${label} up`,
    moveDown: (label: string) => `Move ${label} down`,
    remove: (label: string) => `Remove ${label}`,
    stepNumber: (n: number) => `Step ${n}`,
    windowLabel: "Conversion window",
    windowHint: "People must finish all steps within this time of the first one.",
    hours: "hours",
    days: "days",
    weeks: "weeks",
    needTwo: "A funnel needs at least two steps.",
    save: "Save funnel",
    reset: "Reset",
    saved: "Funnel saved.",
    failed: "Could not save the funnel. Try again.",
    noSources: "Nothing of this kind to add.",
    unit: "Unit",
  },
  ar: {
    title: "منشئ القمع",
    description: "اختر الخطوات التي يمرّ بها الناس بالترتيب، والمدة المتاحة لإتمامها.",
    nameLabel: "اسم القمع",
    namePlaceholder: "من التسجيل إلى أول طلب",
    nameRequired: "أعطِ القمع اسمًا.",
    stepsTitle: "الخطوات",
    noSteps: "لا خطوات بعد. أضف أول حدث أو صفحة أدناه.",
    addTitle: "إضافة خطوة",
    kindEvent: "حدث",
    kindPage: "زيارة صفحة",
    pick: "اختر…",
    add: "إضافة الخطوة",
    moveUp: (label: string) => `نقل ${label} للأعلى`,
    moveDown: (label: string) => `نقل ${label} للأسفل`,
    remove: (label: string) => `إزالة ${label}`,
    stepNumber: (n: number) => `الخطوة ${n}`,
    windowLabel: "نافذة التحويل",
    windowHint: "يجب أن يُتمّ الناس كل الخطوات خلال هذه المدة من الخطوة الأولى.",
    hours: "ساعات",
    days: "أيام",
    weeks: "أسابيع",
    needTwo: "يحتاج القمع إلى خطوتين على الأقل.",
    save: "حفظ القمع",
    reset: "إعادة التعيين",
    saved: "تم حفظ القمع.",
    failed: "تعذّر حفظ القمع. حاول مرة أخرى.",
    noSources: "لا شيء من هذا النوع للإضافة.",
    unit: "الوحدة",
  },
};

export type FunnelBuilderLabels = typeof STRINGS.en;

export type FunnelSourceKind = "event" | "page";

/** An event or a page the funnel can use as a step. */
export interface FunnelSource {
  id: string;
  kind: FunnelSourceKind;
  label: string;
  /** The event name or page path. Kept left-to-right. */
  detail?: string;
}

export interface FunnelBuilderStep {
  /** Unique within the funnel, so the same event can appear twice. */
  id: string;
  sourceId: string;
  kind: FunnelSourceKind;
  label: string;
  detail?: string;
}

export interface FunnelDefinition {
  name: string;
  steps: FunnelBuilderStep[];
  window: FunnelWindow;
}

export const EMPTY_FUNNEL: FunnelDefinition = { name: "", steps: [], window: { amount: 7, unit: "day" } };

type Result = void | { error?: string };

export interface FunnelBuilderProps {
  /** Events and pages the funnel can be made of. */
  sources: readonly FunnelSource[];
  defaultValue?: FunnelDefinition;
  onChange?: (value: FunnelDefinition) => void;
  /** Saves the funnel. Return `{ error }` to keep the form open with a message. */
  onSave: (value: FunnelDefinition) => Promise<Result>;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
  labels?: Partial<FunnelBuilderLabels>;
}

/**
 * Builds a funnel: a name, an ordered list of steps taken from events or page views (reorder with the up and down
 * buttons, remove with the cross) and the time window to finish in. Save stays honest: a funnel needs a name and two steps.
 */
export function FunnelBuilder({ sources, defaultValue = EMPTY_FUNNEL, onChange, onSave, title, description, className, labels }: FunnelBuilderProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const uid = useId();
  const [value, setValue] = useState<FunnelDefinition>(defaultValue);
  const [kind, setKind] = useState<FunnelSourceKind>("event");
  const [pick, setPick] = useState<string>("");
  const [counter, setCounter] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const commit = (next: FunnelDefinition) => {
    setValue(next);
    setMessage(null);
    onChange?.(next);
  };

  const options = useMemo(() => sources.filter((s) => s.kind === kind), [sources, kind]);
  const nameInvalid = submitted && value.name.trim() === "";
  const stepsInvalid = submitted && value.steps.length < 2;

  const addStep = () => {
    const src = sources.find((s) => s.id === pick);
    if (!src) return;
    const n = counter + 1;
    setCounter(n);
    commit({ ...value, steps: insertStep(value.steps, { id: `${src.id}#${n}`, sourceId: src.id, kind: src.kind, label: src.label, detail: src.detail }) });
    setPick("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (value.name.trim() === "" || value.steps.length < 2) return;
    setPending(true);
    setMessage(null);
    try {
      const out = await onSave({ ...value, name: value.name.trim() });
      setMessage(out && out.error ? { tone: "danger", text: out.error } : { tone: "success", text: t.saved });
    } catch {
      setMessage({ tone: "danger", text: t.failed });
    } finally {
      setPending(false);
    }
  };

  const unitItems: { value: WindowUnit; label: string }[] = [
    { value: "hour", label: t.hours },
    { value: "day", label: t.days },
    { value: "week", label: t.weeks },
  ];

  return (
    <Card data-slot="funnel-builder" className={className}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <CardHeader>
          <CardTitle as="h3">{title ?? t.title}</CardTitle>
          <CardDescription>{description ?? t.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
          <Field invalid={nameInvalid}>
            <FieldLabel>{t.nameLabel}</FieldLabel>
            <Input dir="auto" value={value.name} onChange={(e) => commit({ ...value, name: e.target.value })} placeholder={t.namePlaceholder} />
            {nameInvalid ? <FieldError match>{t.nameRequired}</FieldError> : null}
          </Field>

          <section aria-labelledby={`${uid}-steps`} className="flex flex-col gap-2">
            <h4 id={`${uid}-steps`} className="text-label text-foreground">
              {t.stepsTitle}
            </h4>
            {value.steps.length === 0 ? (
              <p className="rounded-card border border-dashed border-border p-4 text-body-sm text-muted-foreground">{t.noSteps}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {value.steps.map((s, i) => (
                  <li key={s.id} data-slot="funnel-builder-step" className="flex items-center gap-3 rounded-card border border-border p-2 ps-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-caption text-muted-foreground">
                      <bdi>{i + 1}</bdi>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span dir="auto" className="truncate text-label text-foreground">
                        {s.label}
                      </span>
                      <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                        <Badge variant="outline">
                          {s.kind === "event" ? <MousePointerClick aria-hidden /> : <FileText aria-hidden />}
                          {s.kind === "event" ? t.kindEvent : t.kindPage}
                        </Badge>
                        {s.detail ? (
                          <bdi dir="ltr" className="truncate">
                            {s.detail}
                          </bdi>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center">
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveUp(s.label)} disabled={i === 0} onClick={() => commit({ ...value, steps: moveStep(value.steps, i, i - 1) })}>
                        <ArrowUp aria-hidden />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t.moveDown(s.label)} disabled={i === value.steps.length - 1} onClick={() => commit({ ...value, steps: moveStep(value.steps, i, i + 1) })}>
                        <ArrowDown aria-hidden />
                      </Button>
                      <Button type="button" size="icon-sm" variant="ghost" aria-label={t.remove(s.label)} onClick={() => commit({ ...value, steps: removeStep(value.steps, i) })}>
                        <X aria-hidden />
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {stepsInvalid ? (
              <p role="alert" className="text-body-sm text-danger">
                {t.needTwo}
              </p>
            ) : null}
          </section>

          <section aria-label={t.addTitle} className="flex flex-col gap-2 rounded-card bg-muted/40 p-3">
            <span className="text-label text-foreground">{t.addTitle}</span>
            <div className="flex flex-wrap items-end gap-2">
              <ToggleGroup
                value={[kind]}
                onValueChange={(v) => {
                  if (v[0]) {
                    setKind(v[0] as FunnelSourceKind);
                    setPick("");
                  }
                }}
                aria-label={t.addTitle}
              >
                <Toggle value="event">{t.kindEvent}</Toggle>
                <Toggle value="page">{t.kindPage}</Toggle>
              </ToggleGroup>
              <div className="min-w-48 flex-1">
                <Select items={options.map((o) => ({ value: o.id, label: o.label }))} value={pick || null} onValueChange={(v) => setPick(v ? String(v) : "")}>
                  <SelectTrigger aria-label={t.addTitle}>
                    <SelectValue placeholder={options.length === 0 ? t.noSources : t.pick} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="secondary" disabled={!pick} onClick={addStep}>
                <Plus aria-hidden />
                {t.add}
              </Button>
            </div>
          </section>

          <div className="flex flex-col gap-1.5">
            <span id={`${uid}-window`} className="text-label text-foreground">
              {t.windowLabel}
            </span>
            <div className="flex items-center gap-2" role="group" aria-labelledby={`${uid}-window`}>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                ltr
                className="w-24"
                aria-label={t.windowLabel}
                value={value.window.amount}
                onChange={(e) => commit({ ...value, window: { ...value.window, amount: Math.max(1, Math.floor(Number(e.target.value)) || 1) } })}
              />
              <Select items={unitItems} value={value.window.unit} onValueChange={(v) => v && commit({ ...value, window: { ...value.window, unit: v as WindowUnit } })}>
                <SelectTrigger className="w-32" aria-label={t.unit}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitItems.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <bdi dir="ltr" className="text-caption text-muted-foreground">
                {windowKey(value.window)}
              </bdi>
            </div>
            <span className="text-caption text-muted-foreground">{t.windowHint}</span>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setSubmitted(false);
              commit(defaultValue);
            }}
          >
            {t.reset}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {t.save}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
