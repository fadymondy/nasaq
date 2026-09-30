"use client";

import { FileText, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import type { DataTableColumn, DataTableRowAction } from "../data-table";
import { EntityList } from "../entity-list";
import { DateTime } from "../numeric";
import { EmptyState } from "../states";
import { type TrashDateInput, type TrashRetention, type TrashUrgency, trashRetention } from "./trash-math";

const STRINGS = {
  en: {
    title: "Trash",
    listLabel: "Deleted items",
    notice: (days: number) => `Items are deleted for good ${days} days after you delete them.`,
    noticeKept: "Items stay here until you empty the trash.",
    name: "Name",
    type: "Type",
    deleted: "Deleted",
    deletedBy: "Deleted by",
    timeLeft: "Time left",
    types: "Type",
    restore: "Restore",
    restoreSelected: "Restore selected",
    delete: "Delete forever",
    deleteSelected: "Delete selected forever",
    empty: "Empty trash",
    search: "Search deleted items",
    daysLeft: (n: number) => (n === 1 ? "1 day left" : `${n} days left`),
    hoursLeft: (n: number) => (n === 1 ? "1 hour left" : `${n} hours left`),
    due: "Due for deletion",
    kept: "Kept",
    purgeOn: (date: string) => `Deleted for good on ${date}`,
    emptyTitle: "The trash is empty",
    emptyBody: "Things you delete show up here, and you can bring them back until they expire.",
    deleteTitle: (name: string) => `Delete “${name}” forever?`,
    deleteTitleMany: (n: number) => `Delete ${n} items forever?`,
    deleteBody: "This cannot be undone. The item and everything inside it is gone for good.",
    emptyDialogTitle: "Empty the trash?",
    emptyDialogBody: (n: number) => `${n === 1 ? "1 item" : `${n} items`} will be deleted for good. This cannot be undone.`,
    cancel: "Cancel",
    confirmDelete: "Delete forever",
    confirmEmpty: "Empty trash",
    error: "Something went wrong. Nothing was changed.",
    restored: (n: number) => (n === 1 ? "1 item restored" : `${n} items restored`),
    deletedDone: (n: number) => (n === 1 ? "1 item deleted" : `${n} items deleted`),
    trashEmptied: "Trash emptied",
    unknownType: "Item",
  },
  ar: {
    title: "سلة المحذوفات",
    listLabel: "العناصر المحذوفة",
    notice: (days: number) => `تُحذف العناصر نهائيًا بعد ${days} يومًا من حذفها.`,
    noticeKept: "تبقى العناصر هنا حتى تفرّغ السلة.",
    name: "الاسم",
    type: "النوع",
    deleted: "تاريخ الحذف",
    deletedBy: "حذفه",
    timeLeft: "الوقت المتبقي",
    types: "النوع",
    restore: "استعادة",
    restoreSelected: "استعادة المحدد",
    delete: "حذف نهائي",
    deleteSelected: "حذف المحدد نهائيًا",
    empty: "إفراغ السلة",
    search: "ابحث في المحذوفات",
    daysLeft: (n: number) => (n === 1 ? "متبقٍ يوم واحد" : n === 2 ? "متبقٍ يومان" : n <= 10 ? `متبقٍ ${n} أيام` : `متبقٍ ${n} يومًا`),
    hoursLeft: (n: number) => (n === 1 ? "متبقية ساعة" : n === 2 ? "متبقٍ ساعتان" : n <= 10 ? `متبقٍ ${n} ساعات` : `متبقٍ ${n} ساعة`),
    due: "جاهز للحذف",
    kept: "محفوظ",
    purgeOn: (date: string) => `يُحذف نهائيًا في ${date}`,
    emptyTitle: "السلة فارغة",
    emptyBody: "ما تحذفه يظهر هنا، ويمكنك استعادته قبل أن تنتهي مهلته.",
    deleteTitle: (name: string) => `حذف «${name}» نهائيًا؟`,
    deleteTitleMany: (n: number) => `حذف ${n} عنصرًا نهائيًا؟`,
    deleteBody: "لا يمكن التراجع عن هذا. يُحذف العنصر وكل ما بداخله نهائيًا.",
    emptyDialogTitle: "إفراغ السلة؟",
    emptyDialogBody: (n: number) => `سيُحذف ${n === 1 ? "عنصر واحد" : `${n} عنصرًا`} نهائيًا. لا يمكن التراجع عن هذا.`,
    cancel: "إلغاء",
    confirmDelete: "حذف نهائي",
    confirmEmpty: "إفراغ السلة",
    error: "حدث خطأ ما. لم يتغير شيء.",
    restored: (n: number) => (n === 1 ? "تمت استعادة عنصر واحد" : `تمت استعادة ${n} عنصرًا`),
    deletedDone: (n: number) => (n === 1 ? "تم حذف عنصر واحد" : `تم حذف ${n} عنصرًا`),
    trashEmptied: "تم إفراغ السلة",
    unknownType: "عنصر",
  },
};

export type TrashBinLabels = Partial<(typeof STRINGS)["en"]>;

/** What a callback resolves with: nothing on success, or a message to show. */
export type TrashResult = void | { error?: string };

export interface TrashType {
  id: string;
  label: string;
  labelAr?: string;
  icon?: LucideIcon;
}

export interface TrashItem {
  id: string;
  /** What the item was called. Shown as written, in its own direction. */
  name: string;
  /** A `TrashType` id. */
  type?: string;
  /** Second line under the name: the folder it lived in, an amount, a count. */
  detail?: string;
  deletedAt: TrashDateInput;
  deletedBy?: string;
  /** Overrides the bin's retention for this one item. */
  purgeAt?: TrashDateInput | null;
}

export interface TrashBinProps {
  items: readonly TrashItem[];
  /** Kinds of item. Adds an icon, a label and a filter. */
  types?: readonly TrashType[];
  /** Days an item stays before it is deleted for good. `0` or `null` keeps items until the trash is emptied. Default 30. */
  retentionDays?: number | null;
  /** Restore these items. The list is yours: remove them from `items` when it resolves. */
  onRestore?: (ids: string[]) => Promise<TrashResult> | TrashResult;
  /** Delete these items for good, after the user confirms. */
  onDelete?: (ids: string[]) => Promise<TrashResult> | TrashResult;
  /** Delete everything, after the user confirms. Hides the button when omitted. */
  onEmpty?: () => Promise<TrashResult> | TrashResult;
  /** Called with a short message after a successful action, for a toast. */
  onNotify?: (message: string) => void;
  /** The clock, for a stable story or test. Default: the current time. */
  now?: TrashDateInput;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  /** Heading above the list. Pass `null` to hide it. */
  title?: ReactNode | null;
  locale?: string;
  labels?: TrashBinLabels;
  className?: string;
}

type Confirm = { kind: "delete"; ids: string[] } | { kind: "empty" };

const URGENCY_VARIANT: Record<TrashUrgency, "neutral" | "warning" | "danger" | "outline"> = {
  safe: "neutral",
  soon: "warning",
  urgent: "danger",
  expired: "danger",
  kept: "outline",
};

/**
 * The trash of an app: what was deleted, who deleted it, how long it stays, and buttons to restore it or delete it for
 * good. Built on EntityList, so it has search, a type filter, table and card views, selection with bulk actions and a
 * context menu on every row. Deleting for good always asks first. Presentational: you keep the items.
 */
export function TrashBin({
  items,
  types,
  retentionDays = 30,
  onRestore,
  onDelete,
  onEmpty,
  onNotify,
  now,
  loading,
  error,
  onRetry,
  title,
  locale: localeProp,
  labels,
  className,
}: TrashBinProps) {
  const ambient = useOptionalNasaq()?.locale ?? "en";
  const locale = localeProp ?? ambient;
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const clock = now ?? Date.now();
  const retentionOf = useCallback((item: TrashItem): TrashRetention => trashRetention(item.deletedAt, { retentionDays, purgeAt: item.purgeAt, now: clock }), [retentionDays, clock]);
  const typeOf = useCallback((item: TrashItem) => types?.find((x) => x.id === item.type), [types]);
  const typeLabel = useCallback((type: TrashType | undefined) => (type ? (ar ? type.labelAr || type.label : type.label) : t.unknownType), [ar, t.unknownType]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const run = async (action: (() => Promise<TrashResult> | TrashResult) | undefined, done: string, sink: (message: string | null) => void): Promise<boolean> => {
    if (!action) return false;
    setBusy(true);
    sink(null);
    try {
      const result = await action();
      if (result && typeof result === "object" && result.error) {
        sink(result.error);
        return false;
      }
      onNotify?.(done);
      return true;
    } catch {
      sink(t.error);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const restore = (ids: string[]) => run(() => onRestore?.(ids), t.restored(ids.length), setFailure);

  const confirmed = async () => {
    if (!confirm) return;
    const ok =
      confirm.kind === "empty"
        ? await run(onEmpty, t.trashEmptied, setDialogError)
        : await run(() => onDelete?.(confirm.ids), t.deletedDone(confirm.ids.length), setDialogError);
    if (ok) setConfirm(null);
  };

  const timeLeftText = (r: TrashRetention) => {
    if (r.urgency === "kept") return t.kept;
    if (r.expired) return t.due;
    if (r.daysLeft === 1 && r.hoursLeft !== null && r.hoursLeft < 24) return t.hoursLeft(r.hoursLeft);
    return t.daysLeft(r.daysLeft ?? 0);
  };

  const columns: DataTableColumn<TrashItem>[] = [
    {
      id: "name",
      header: t.name,
      label: t.name,
      sortValue: (row) => row.name,
      searchValue: (row) => `${row.name} ${row.detail ?? ""} ${row.deletedBy ?? ""}`,
      cell: (row) => {
        const Icon = typeOf(row)?.icon ?? FileText;
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-col">
              <bdi dir="auto" className="truncate text-body text-foreground">
                {row.name}
              </bdi>
              {row.detail ? (
                <bdi dir="auto" className="truncate text-caption text-muted-foreground">
                  {row.detail}
                </bdi>
              ) : null}
            </span>
          </span>
        );
      },
    },
    {
      id: "type",
      header: t.type,
      label: t.type,
      sortValue: (row) => typeLabel(typeOf(row)),
      filterValue: (row) => row.type ?? "",
      cell: (row) => <Badge variant="outline">{typeLabel(typeOf(row))}</Badge>,
    },
    {
      id: "deleted",
      header: t.deleted,
      label: t.deleted,
      sortValue: (row) => new Date(row.deletedAt),
      cell: (row) => <DateTime value={row.deletedAt} relative className="text-body-sm text-muted-foreground" />,
    },
    {
      id: "deletedBy",
      header: t.deletedBy,
      label: t.deletedBy,
      sortValue: (row) => row.deletedBy ?? "",
      defaultHidden: false,
      cell: (row) => (row.deletedBy ? <bdi dir="auto" className="text-body-sm text-muted-foreground">{row.deletedBy}</bdi> : <span className="text-muted-foreground">-</span>),
    },
    {
      id: "timeLeft",
      header: t.timeLeft,
      label: t.timeLeft,
      sortValue: (row) => retentionOf(row).purgeAt?.getTime() ?? Number.POSITIVE_INFINITY,
      cell: (row) => {
        const r = retentionOf(row);
        return (
          <Badge variant={URGENCY_VARIANT[r.urgency]} title={r.purgeAt ? t.purgeOn(r.purgeAt.toLocaleDateString(ar ? "ar-u-nu-latn" : "en")) : undefined} data-urgency={r.urgency}>
            {timeLeftText(r)}
          </Badge>
        );
      },
    },
  ];

  const rowActions = (row: TrashItem): DataTableRowAction[] => [
    { id: "restore", label: t.restore, icon: RotateCcw, disabled: busy || !onRestore, onSelect: () => void restore([row.id]) },
    { id: "delete", label: t.delete, icon: Trash2, danger: true, group: "danger", disabled: busy || !onDelete, onSelect: () => (setDialogError(null), setConfirm({ kind: "delete", ids: [row.id] })) },
  ];

  const facets = types?.length
    ? [
        {
          id: "type",
          title: t.types,
          options: types.map((type) => ({ value: type.id, label: ar ? type.labelAr || type.label : type.label })),
          getValues: (row: TrashItem) => (row.type ? [row.type] : []),
        },
      ]
    : undefined;

  const confirmName = confirm?.kind === "delete" && confirm.ids.length === 1 ? byId.get(confirm.ids[0] as string)?.name : undefined;
  const heading = title === undefined ? t.title : title;

  return (
    <div data-slot="trash-bin" className={cn("flex min-w-0 flex-col gap-4", className)}>
      {heading ? <h2 className="text-title text-foreground">{heading}</h2> : null}
      <Alert tone="info" icon={Trash2}>
        {retentionDays && retentionDays > 0 ? t.notice(retentionDays) : t.noticeKept}
      </Alert>
      {failure ? (
        <Alert tone="danger" onDismiss={() => setFailure(null)}>
          {failure}
        </Alert>
      ) : null}
      <EntityList<TrashItem>
        data={[...items]}
        columns={columns}
        getRowId={(row) => row.id}
        label={t.listLabel}
        searchPlaceholder={t.search}
        facets={facets}
        defaultSort={{ id: "timeLeft", direction: "asc" }}
        pageSize={20}
        loading={loading}
        error={error}
        onRetry={onRetry}
        rowLabel={(row) => row.name}
        rowActions={rowActions}
        actions={
          onEmpty && items.length > 0
            ? [{ id: "empty", label: t.empty, icon: Trash2, danger: true, disabled: busy, onSelect: () => (setDialogError(null), setConfirm({ kind: "empty" })) }]
            : undefined
        }
        bulkActions={({ selectedRows, clearSelection }) => (
          <>
            {onRestore ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (await restore(selectedRows.map((row) => row.id))) clearSelection();
                }}
              >
                <RotateCcw aria-hidden />
                {t.restoreSelected}
              </Button>
            ) : null}
            {onDelete ? (
              <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => (setDialogError(null), setConfirm({ kind: "delete", ids: selectedRows.map((row) => row.id) }))}>
                <Trash2 aria-hidden />
                {t.deleteSelected}
              </Button>
            ) : null}
          </>
        )}
        renderCard={(row) => {
          const type = typeOf(row);
          const Icon = type?.icon ?? FileText;
          const r = retentionOf(row);
          return (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 items-start gap-2.5 pe-(--entity-card-controls)">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-col">
                  <bdi dir="auto" className="truncate text-label text-foreground">
                    {row.name}
                  </bdi>
                  {row.detail ? (
                    <bdi dir="auto" className="truncate text-caption text-muted-foreground">
                      {row.detail}
                    </bdi>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{typeLabel(type)}</Badge>
                <Badge variant={URGENCY_VARIANT[r.urgency]} data-urgency={r.urgency}>
                  {timeLeftText(r)}
                </Badge>
              </div>
              <p className="text-caption text-muted-foreground">
                <DateTime value={row.deletedAt} relative />
                {row.deletedBy ? (
                  <>
                    {" · "}
                    <bdi dir="auto">{row.deletedBy}</bdi>
                  </>
                ) : null}
              </p>
            </div>
          );
        }}
        empty={<EmptyState icon={Trash2} title={t.emptyTitle} description={t.emptyBody} />}
      />
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && !busy && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "empty" ? t.emptyDialogTitle : confirm?.ids.length === 1 && confirmName ? t.deleteTitle(confirmName) : t.deleteTitleMany(confirm?.kind === "delete" ? confirm.ids.length : 0)}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirm?.kind === "empty" ? t.emptyDialogBody(items.length) : t.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {dialogError ? (
            <Alert tone="danger" role="alert">
              {dialogError}
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t.cancel}</AlertDialogCancel>
            <Button type="button" variant="danger" loading={busy} onClick={() => void confirmed()}>
              {confirm?.kind === "empty" ? t.confirmEmpty : t.confirmDelete}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
