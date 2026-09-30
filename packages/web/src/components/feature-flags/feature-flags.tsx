"use client";

import { Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DateTime, Num } from "../numeric";
import { Status } from "../status";
import { type RuleField, evaluateConditions } from "../rule-builder";
import { type FeatureFlag, type FlagEnvironmentDef, type FlagState, type RuleMatcher, flagState } from "./flag-model";

/** A matcher for `evaluateFlag` that runs a rule's conditions (built with the rule builder) against the user context. */
export function ruleMatcher(fields: readonly RuleField[]): RuleMatcher {
  return (rule, context) => evaluateConditions(rule.conditions, context, fields);
}

export { bucketFor, clampRollout, evaluateFlag, flagKeyFromName, flagState, hash32, isInRollout, isValidFlagKey, normalizeWeights, pickVariant, ruleVariant } from "./flag-model";
export type { FeatureFlag, FlagEnvState, FlagEnvironmentDef, FlagEvaluation, FlagReason, FlagState, FlagVariant, RuleMatcher } from "./flag-model";

const STRINGS = {
  en: {
    title: "Feature flags",
    description: "Turn features on per environment, roll them out gradually and stop them fast.",
    flag: "Flag",
    rollout: (env: string) => `Rollout in ${env}`,
    updated: "Updated",
    state: "State",
    states: { killed: "Killed", off: "Off", partial: "Rolling out", on: "On" } as Record<FlagState, string>,
    filter: "Filter flags by name or key…",
    empty: "No feature flags yet",
    create: "New flag",
    open: "Open",
    copyKey: "Copy key",
    remove: "Delete",
    toggleLabel: (env: string) => env,
    killed: "Killed",
    failed: "Could not save this. Try again.",
    tableLabel: "Feature flags",
    by: (name: string) => `by ${name}`,
  },
  ar: {
    title: "مفاتيح الميزات",
    description: "شغّل الميزات لكل بيئة، وأطلقها تدريجيًا، وأوقفها بسرعة.",
    flag: "المفتاح",
    rollout: (env: string) => `الإطلاق في ${env}`,
    updated: "آخر تحديث",
    state: "الحالة",
    states: { killed: "موقوف طارئًا", off: "متوقف", partial: "إطلاق تدريجي", on: "يعمل" } as Record<FlagState, string>,
    filter: "تصفية المفاتيح بالاسم أو المفتاح…",
    empty: "لا مفاتيح ميزات بعد",
    create: "مفتاح جديد",
    open: "فتح",
    copyKey: "نسخ المفتاح",
    remove: "حذف",
    toggleLabel: (env: string) => env,
    killed: "موقوف طارئًا",
    failed: "تعذّر الحفظ. حاول مرة أخرى.",
    tableLabel: "مفاتيح الميزات",
    by: (name: string) => `بواسطة ${name}`,
  },
};

export type FeatureFlagsLabels = typeof STRINGS.en;

type Result = void | { error?: string };

const STATE_TONE: Record<FlagState, "danger" | "neutral" | "warning" | "success"> = { killed: "danger", off: "neutral", partial: "warning", on: "success" };

export interface FeatureFlagListProps {
  flags: readonly FeatureFlag[];
  environments: readonly FlagEnvironmentDef[];
  /** Turns a flag on or off in one environment: the switch in the cell. Without it the switches are read only. */
  onToggle?: (key: string, environmentId: string, enabled: boolean) => Promise<Result>;
  onOpen?: (key: string) => void;
  onCreate?: () => void;
  onDelete?: (key: string) => Promise<Result>;
  /** Environment whose rollout % and state columns show. Default: the last one (production). */
  rolloutEnvironment?: string;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<FeatureFlagsLabels>;
}

/**
 * The flag list: name and key, an on/off switch per environment right in the row, the rollout percentage and state in one
 * environment, and when it last changed. Killed flags show as killed whatever their switches say. A row opens the flag.
 */
export function FeatureFlagList({ flags, environments, onToggle, onOpen, onCreate, onDelete, rolloutEnvironment, title, description, pageSize = 8, loading, error, onRetry, className, labels }: FeatureFlagListProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [failed, setFailed] = useState<string | null>(null);
  const rolloutEnv = environments.find((e) => e.id === rolloutEnvironment) ?? environments[environments.length - 1];

  const run = async (fn: () => Promise<Result>) => {
    setFailed(null);
    try {
      const out = await fn();
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.failed);
    }
  };

  const columns = useMemo<DataTableColumn<FeatureFlag>[]>(() => {
    const cols: DataTableColumn<FeatureFlag>[] = [
      {
        id: "flag",
        header: t.flag,
        label: t.flag,
        hideable: false,
        sortValue: (f) => f.name,
        searchValue: (f) => `${f.name} ${f.key} ${(f.tags ?? []).join(" ")}`,
        cell: (f) => (
          <span className="flex min-w-0 flex-col">
            <span dir="auto" className="block max-w-[28ch] truncate text-label text-foreground">
              {f.name}
            </span>
            <bdi dir="ltr" className="block max-w-[28ch] truncate font-mono text-caption text-muted-foreground">
              {f.key}
            </bdi>
          </span>
        ),
      },
      ...environments.map<DataTableColumn<FeatureFlag>>((env) => ({
        id: `env-${env.id}`,
        header: env.label,
        label: env.label,
        align: "center",
        sortValue: (f) => (f.environments[env.id]?.enabled ? 1 : 0),
        edit: onToggle ? { type: "switch", value: (f) => Boolean(f.environments[env.id]?.enabled), label: t.toggleLabel(env.label), disabled: (f) => Boolean(f.killed) } : undefined,
        cell: (f) => <Status tone={f.environments[env.id]?.enabled && !f.killed ? "success" : "neutral"}>{f.environments[env.id]?.enabled ? "On" : "Off"}</Status>,
      })),
    ];
    if (rolloutEnv) {
      cols.push(
        {
          id: "rollout",
          header: t.rollout(rolloutEnv.label),
          label: t.rollout(rolloutEnv.label),
          align: "end",
          sortValue: (f) => f.environments[rolloutEnv.id]?.rollout ?? 0,
          cell: (f) => {
            const pct = f.environments[rolloutEnv.id]?.rollout ?? 0;
            return (
              <span className="flex items-center justify-end gap-2">
                <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ inlineSize: `${pct}%` }} />
                </span>
                <span className="w-10 text-end">
                  <Num value={pct / 100} format={{ style: "percent", maximumFractionDigits: 0 }} />
                </span>
              </span>
            );
          },
        },
        {
          id: "state",
          header: t.state,
          label: t.state,
          sortValue: (f) => flagState(f, rolloutEnv.id),
          filterValue: (f) => flagState(f, rolloutEnv.id),
          cell: (f) => {
            const s = flagState(f, rolloutEnv.id);
            return <Status tone={STATE_TONE[s]}>{t.states[s]}</Status>;
          },
        },
      );
    }
    cols.push({
      id: "updated",
      header: t.updated,
      label: t.updated,
      sortValue: (f) => f.updatedAt,
      cell: (f) => (
        <span className="flex flex-col">
          <DateTime value={f.updatedAt} relative />
          {f.updatedBy ? <span className="text-caption text-muted-foreground">{t.by(f.updatedBy)}</span> : null}
        </span>
      ),
    });
    return cols;
  }, [t, environments, onToggle, rolloutEnv]);

  const table = useDataTable({ data: [...flags], columns, getRowId: (f) => f.key, pageSize, defaultSort: { id: "updated", direction: "desc" } });

  const rowActions = (f: FeatureFlag): DataTableRowAction[] => [
    ...(onOpen ? [{ id: "open", label: t.open, icon: ExternalLink, onSelect: () => onOpen(f.key) }] : []),
    { id: "copy", label: t.copyKey, icon: Copy, onSelect: () => void navigator.clipboard?.writeText(f.key) },
    ...(onDelete ? [{ id: "del", label: t.remove, icon: Trash2, danger: true, group: "z", onSelect: () => void run(() => onDelete(f.key)) }] : []),
  ];

  return (
    <Card data-slot="feature-flag-list" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.title}</CardTitle>
        <CardDescription>{description ?? t.description}</CardDescription>
        {onCreate ? (
          <CardAction>
            <Button size="sm" onClick={onCreate}>
              <Plus aria-hidden />
              {t.create}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.filter} />
          {rolloutEnv ? (
            <DataTableFacetFilter table={table} column="state" title={t.state} options={(["on", "partial", "off", "killed"] as const).map((s) => ({ value: s, label: t.states[s] }))} />
          ) : null}
        </DataTableToolbar>
        {failed ? (
          <Status tone="danger" role="alert">
            {failed}
          </Status>
        ) : null}
        <DataTable
          table={table}
          label={t.tableLabel}
          loading={loading}
          error={error}
          onRetry={onRetry}
          empty={t.empty}
          rowActions={rowActions}
          onRowClick={onOpen ? (f) => onOpen(f.key) : undefined}
          onCellEdit={
            onToggle
              ? async (row, columnId, value) => {
                  setFailed(null);
                  try {
                    const out = await onToggle(row.key, columnId.replace(/^env-/, ""), Boolean(value));
                    return out && out.error ? { error: out.error } : undefined;
                  } catch {
                    return { error: t.failed };
                  }
                }
              : undefined
          }
        />
        {flags.length > pageSize ? <DataTablePagination table={table} /> : null}
      </CardContent>
    </Card>
  );
}
