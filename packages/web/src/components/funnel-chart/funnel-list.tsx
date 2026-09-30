"use client";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type DataTableColumn, type DataTableRowAction, DataTable, DataTablePagination, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DateTime, Num } from "../numeric";
import { Status } from "../status";

const STRINGS = {
  en: {
    title: "Funnels",
    description: "Saved funnels and how each one converts right now.",
    name: "Funnel",
    steps: "Steps",
    entered: "Entered",
    conversion: "Conversion",
    window: "Window",
    updated: "Updated",
    filter: "Filter funnels…",
    empty: "No funnels yet",
    create: "New funnel",
    open: "Open",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    stepsCount: (n: number) => (n === 1 ? "1 step" : `${n} steps`),
    failed: "Could not do that. Try again.",
    tableLabel: "Funnels",
  },
  ar: {
    title: "أقماع التحويل",
    description: "الأقماع المحفوظة وكم يحوّل كل منها الآن.",
    name: "القمع",
    steps: "الخطوات",
    entered: "دخلوا",
    conversion: "التحويل",
    window: "النافذة",
    updated: "آخر تحديث",
    filter: "تصفية الأقماع…",
    empty: "لا أقماع بعد",
    create: "قمع جديد",
    open: "فتح",
    edit: "تعديل",
    duplicate: "نسخ",
    remove: "حذف",
    stepsCount: (n: number) => (n === 1 ? "خطوة واحدة" : `${n} خطوات`),
    failed: "تعذّر تنفيذ ذلك. حاول مرة أخرى.",
    tableLabel: "أقماع التحويل",
  },
};

export type FunnelListLabels = typeof STRINGS.en;

export interface FunnelSummary {
  id: string;
  name: string;
  /** Number of steps. */
  steps: number;
  /** People that entered the first step in the last run. */
  entered: number;
  /** Last step over first step, 0 to 1. */
  conversion: number;
  /** Already formatted, for example "7 days". */
  window: string;
  /** ISO date. */
  updatedAt: string;
  /** Conversion in the previous run, 0 to 1. Colours the trend. */
  previousConversion?: number;
}

type Result = void | { error?: string };

export interface FunnelListProps {
  funnels: readonly FunnelSummary[];
  onOpen?: (id: string) => void;
  onCreate?: () => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => Promise<Result>;
  onDelete?: (id: string) => Promise<Result>;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<FunnelListLabels>;
}

/** The saved funnels as a table: steps, entrants, conversion with its trend, window and last update. A row opens the funnel. */
export function FunnelList({ funnels, onOpen, onCreate, onEdit, onDuplicate, onDelete, title, description, pageSize = 8, loading, error, onRetry, className, labels }: FunnelListProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const [failed, setFailed] = useState<string | null>(null);

  const run = async (fn: () => Promise<Result>) => {
    setFailed(null);
    try {
      const out = await fn();
      if (out && out.error) setFailed(out.error);
    } catch {
      setFailed(t.failed);
    }
  };

  const columns = useMemo<DataTableColumn<FunnelSummary>[]>(
    () => [
      {
        id: "name",
        header: t.name,
        label: t.name,
        hideable: false,
        sortValue: (f) => f.name,
        searchValue: (f) => f.name,
        cell: (f) => (
          <span dir="auto" className="block max-w-[28ch] truncate text-label text-foreground">
            {f.name}
          </span>
        ),
      },
      { id: "steps", header: t.steps, label: t.steps, align: "end", sortValue: (f) => f.steps, cell: (f) => t.stepsCount(f.steps) },
      { id: "entered", header: t.entered, label: t.entered, align: "end", sortValue: (f) => f.entered, cell: (f) => <Num value={f.entered} /> },
      {
        id: "conversion",
        header: t.conversion,
        label: t.conversion,
        align: "end",
        sortValue: (f) => f.conversion,
        cell: (f) => {
          const up = f.previousConversion !== undefined ? f.conversion - f.previousConversion : 0;
          return (
            <span className="flex items-center justify-end gap-2">
              <Num value={f.conversion} format={{ style: "percent", maximumFractionDigits: 1 }} />
              {up !== 0 ? <Status tone={up > 0 ? "success" : "danger"}>{`${up > 0 ? "+" : "-"}${Math.abs(up * 100).toFixed(1)}`}</Status> : null}
            </span>
          );
        },
      },
      { id: "window", header: t.window, label: t.window, sortValue: (f) => f.window, cell: (f) => <span className="text-body-sm text-muted-foreground">{f.window}</span> },
      { id: "updated", header: t.updated, label: t.updated, sortValue: (f) => f.updatedAt, cell: (f) => <DateTime value={f.updatedAt} format={{ month: "short", day: "numeric", year: "numeric" }} /> },
    ],
    [t],
  );

  const table = useDataTable({ data: [...funnels], columns, getRowId: (f) => f.id, pageSize, defaultSort: { id: "updated", direction: "desc" } });

  const rowActions = (f: FunnelSummary): DataTableRowAction[] => [
    ...(onEdit ? [{ id: "edit", label: t.edit, icon: Pencil, onSelect: () => onEdit(f.id) }] : []),
    ...(onDuplicate ? [{ id: "dup", label: t.duplicate, icon: Copy, onSelect: () => void run(() => onDuplicate(f.id)) }] : []),
    ...(onDelete ? [{ id: "del", label: t.remove, icon: Trash2, danger: true, group: "z", onSelect: () => void run(() => onDelete(f.id)) }] : []),
  ];

  return (
    <Card data-slot="funnel-list" className={className}>
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
        </DataTableToolbar>
        {failed ? (
          <Status tone="danger" role="alert">
            {failed}
          </Status>
        ) : null}
        <DataTable table={table} label={t.tableLabel} loading={loading} error={error} onRetry={onRetry} empty={t.empty} rowActions={rowActions} onRowClick={onOpen ? (f) => onOpen(f.id) : undefined} />
        {funnels.length > pageSize ? <DataTablePagination table={table} /> : null}
      </CardContent>
    </Card>
  );
}
