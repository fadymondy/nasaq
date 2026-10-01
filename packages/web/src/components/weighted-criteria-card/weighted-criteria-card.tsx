"use client";

import { Check, Plus, X } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Input } from "../field";
import { Switch } from "../switch";
import { Toggle, ToggleGroup } from "../toggle-group";
import { CRITERION_WEIGHTS, type CriterionWeight, type WeightedCriterion, addCriterion, criteriaShares } from "./weighted-criteria-logic";

export { CRITERION_WEIGHTS, type CriterionWeight, type WeightedCriterion, addCriterion, criteriaShares, cycleWeight } from "./weighted-criteria-logic";

const STRINGS = {
  en: {
    title: "What matters most?",
    low: "Low",
    medium: "Medium",
    high: "High",
    weight: (label: string) => `Weight of ${label}`,
    include: (label: string) => `Include ${label}`,
    remove: (label: string) => `Remove ${label}`,
    addPlaceholder: "Add your own…",
    add: "Add",
    count: (on: number, all: number) => `${on} of ${all} included`,
    accept: "Use these",
    accepted: "Sent",
    failed: "That did not work. Try again.",
  },
  ar: {
    title: "ما الأهم بالنسبة لك؟",
    low: "منخفض",
    medium: "متوسط",
    high: "مرتفع",
    weight: (label: string) => `وزن ${label}`,
    include: (label: string) => `تضمين ${label}`,
    remove: (label: string) => `إزالة ${label}`,
    addPlaceholder: "أضف معيارك…",
    add: "إضافة",
    count: (on: number, all: number) => `${on} من ${all} مضمّنة`,
    accept: "اعتمدها",
    accepted: "تم الإرسال",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
  },
};

export type WeightedCriteriaCardLabels = Partial<(typeof STRINGS)["en"]>;

export interface WeightedCriteriaCardProps extends Omit<ComponentProps<typeof Card>, "children" | "title" | "onChange"> {
  /** The suggested criteria, uncontrolled. */
  defaultCriteria?: readonly WeightedCriterion[];
  /** Controlled list. Pair with `onCriteriaChange`. */
  criteria?: readonly WeightedCriterion[];
  onCriteriaChange?: (criteria: WeightedCriterion[]) => void;
  /** Confirm. Return `{ error }` or reject to show a failure; otherwise the card locks and shows Sent. */
  onAccept?: (criteria: WeightedCriterion[]) => void | { error?: string } | Promise<void | { error?: string }>;
  title?: ReactNode;
  description?: ReactNode;
  /** Let the person add their own criteria. Default true. */
  allowCustom?: boolean;
  /** Show each enabled criterion's share of the decision as a bar. Default true. */
  showShares?: boolean;
  disabled?: boolean;
  labels?: WeightedCriteriaCardLabels;
}

/**
 * A human-in-the-loop step for an assistant: the agent suggests the criteria for a comparison or a decision, the person
 * switches each on or off, sets how much it matters and adds their own, then confirms. Use it inside a chat answer or
 * on its own before a ranking.
 */
export function WeightedCriteriaCard({
  defaultCriteria = [],
  criteria: controlled,
  onCriteriaChange,
  onAccept,
  title,
  description,
  allowCustom = true,
  showShares = true,
  disabled = false,
  labels,
  className,
  ...props
}: WeightedCriteriaCardProps) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const uid = useId();
  const [own, setOwn] = useState<WeightedCriterion[]>(() => [...defaultCriteria]);
  const list = controlled ? [...controlled] : own;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shares = useMemo(() => criteriaShares(list), [list]);
  const locked = disabled || busy || sent;
  const on = list.filter((c) => c.enabled).length;

  const update = (next: WeightedCriterion[]) => {
    if (!controlled) setOwn(next);
    onCriteriaChange?.(next);
  };
  const patch = (id: string, change: Partial<WeightedCriterion>) => update(list.map((c) => (c.id === id ? { ...c, ...change } : c)));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const next = addCriterion(list, draft, `custom-${Date.now().toString(36)}`);
    if (next.length !== list.length) update(next);
    setDraft("");
  };

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await onAccept?.(list);
      if (r && r.error) setError(r.error);
      else setSent(true);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failed);
    }
    setBusy(false);
  };

  return (
    <Card data-slot="weighted-criteria-card" data-sent={sent || undefined} className={cn("min-w-0", className)} {...props}>
      <CardHeader>
        <CardTitle id={`${uid}-title`}>{title ?? t.title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul aria-labelledby={`${uid}-title`} className="flex flex-col divide-y divide-border rounded-control border border-border">
          {list.map((c) => {
            const share = shares.get(c.id) ?? 0;
            return (
              <li key={c.id} data-slot="weighted-criterion" data-enabled={c.enabled || undefined} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={c.enabled}
                    onCheckedChange={(enabled) => patch(c.id, { enabled })}
                    disabled={locked}
                    aria-label={t.include(c.label)}
                  />
                  <span className={cn("flex min-w-0 flex-1 flex-col", !c.enabled && "opacity-60")}>
                    <span dir="auto" className="text-body-sm font-medium text-foreground">
                      {c.label}
                    </span>
                    {c.description ? (
                      <span dir="auto" className="text-caption text-muted-foreground">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                  <ToggleGroup
                    aria-label={t.weight(c.label)}
                    value={[c.weight]}
                    onValueChange={(v) => {
                      const w = v[0] as CriterionWeight | undefined;
                      if (w) patch(c.id, { weight: w });
                    }}
                    disabled={locked || !c.enabled}
                  >
                    {CRITERION_WEIGHTS.map((w) => (
                      <Toggle key={w} value={w} className="h-6 px-2 text-caption">
                        {t[w]}
                      </Toggle>
                    ))}
                  </ToggleGroup>
                  {c.custom ? (
                    <Button variant="ghost" size="icon-sm" aria-label={t.remove(c.label)} disabled={locked} onClick={() => update(list.filter((x) => x.id !== c.id))}>
                      <X aria-hidden />
                    </Button>
                  ) : null}
                </div>
                {showShares && c.enabled ? (
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-secondary">
                    <span className="block h-full rounded-full bg-primary transition-[width] duration-200 ease-nq" style={{ width: `${Math.round(share * 100)}%` }} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        {allowCustom ? (
          <form onSubmit={add} className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              placeholder={t.addPlaceholder}
              aria-label={t.addPlaceholder}
              maxLength={120}
              disabled={locked}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={locked || !draft.trim()}>
              <Plus aria-hidden />
              {t.add}
            </Button>
          </form>
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-3">
        <span aria-live="polite" className="text-caption text-muted-foreground tabular-nums">
          {t.count(on, list.length)}
        </span>
        <Button variant="primary" onClick={() => void accept()} loading={busy} disabled={disabled || sent || on === 0}>
          {sent ? (
            <>
              <Check aria-hidden />
              {t.accepted}
            </>
          ) : (
            t.accept
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
