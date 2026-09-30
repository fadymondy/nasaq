"use client";

import { Bot, Cpu, Globe, Minus, Plus, RefreshCw, Server, UserRound } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import type { DateRange } from "../calendar";
import { DataTable, type DataTableColumn, DataTableFacetFilter, DataTablePagination, DataTableSearch, DataTableToolbar, DataTableViewOptions, useDataTable } from "../data-table";
import { DateRangePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldLabel } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import {
  actorKey,
  AUDIT_CHANNELS,
  type AuditChange,
  type AuditChannel,
  type AuditEntry,
  changeKind,
  expiringCount,
  filterEntries,
  formatChangeValue,
} from "./audit-rules";

export { AUDIT_CHANNELS, changeKind, diffRecords, expiringCount, formatChangeValue, retentionCutoff } from "./audit-rules";
export type { AuditActor, AuditChange, AuditChannel, AuditEntry, AuditFilters } from "./audit-rules";

const STRINGS = {
  en: {
    table: "Audit log",
    search: "Search actor, action or entity",
    actor: "Actor",
    action: "Action",
    entity: "Entity",
    channel: "Channel",
    when: "When",
    system: "System",
    dates: "Dates",
    datePlaceholder: "Any date",
    clearDates: "Clear dates",
    channels: { web: "Web", api: "API", mcp: "MCP" } as Record<AuditChannel, string>,
    empty: "No activity yet",
    emptyHint: "Actions taken in this workspace will appear here.",
    noMatch: "Nothing matches these filters",
    noMatchHint: "Widen the dates or clear a filter.",
    refresh: "Refresh",
    details: "Details",
    detailsFor: (action: string) => `Details of ${action}`,
    at: "Time",
    ip: "IP address",
    changes: "Changes",
    noChanges: "No field changes were recorded for this action.",
    field: "Field",
    before: "Before",
    after: "After",
    added: "Added",
    removed: "Removed",
    changed: "Changed",
    empty_value: "empty",
    fieldCount: (n: string) => (n === "1" ? "1 field" : `${n} fields`),
    // retention
    retention: "Retention",
    retentionHint: "How long entries are kept before they are deleted for good.",
    retentionAria: "Retention period",
    forever: "Keep forever",
    days: (n: string) => `${n} days`,
    year: "1 year",
    years: (n: string) => `${n} years`,
    retentionExpiring: (n: string) => (n === "1" ? "1 entry is older than this and will be deleted." : `${n} entries are older than this and will be deleted.`),
    retentionSaved: "Retention updated.",
    retentionFailed: "Retention could not be changed. Try again.",
  },
  ar: {
    table: "سجل التدقيق",
    search: "ابحث بالمنفّذ أو الإجراء أو الكيان",
    actor: "المنفّذ",
    action: "الإجراء",
    entity: "الكيان",
    channel: "القناة",
    when: "الوقت",
    system: "النظام",
    dates: "التواريخ",
    datePlaceholder: "أي تاريخ",
    clearDates: "مسح التواريخ",
    channels: { web: "الويب", api: "واجهة API", mcp: "MCP" } as Record<AuditChannel, string>,
    empty: "لا يوجد نشاط بعد",
    emptyHint: "ستظهر هنا الإجراءات التي تتم في مساحة العمل هذه.",
    noMatch: "لا شيء يطابق هذه المرشحات",
    noMatchHint: "وسّع التواريخ أو امسح أحد المرشحات.",
    refresh: "تحديث",
    details: "التفاصيل",
    detailsFor: (action: string) => `تفاصيل ${action}`,
    at: "الوقت",
    ip: "عنوان IP",
    changes: "التغييرات",
    noChanges: "لم تُسجَّل تغييرات في الحقول لهذا الإجراء.",
    field: "الحقل",
    before: "قبل",
    after: "بعد",
    added: "أُضيف",
    removed: "أُزيل",
    changed: "تغيّر",
    empty_value: "فارغ",
    fieldCount: (n: string) => (n === "1" ? "حقل واحد" : `${n} حقول`),
    retention: "مدة الاحتفاظ",
    retentionHint: "المدة التي تُحفظ فيها السجلات قبل حذفها نهائيًا.",
    retentionAria: "مدة الاحتفاظ",
    forever: "الاحتفاظ دائمًا",
    days: (n: string) => `${n} يومًا`,
    year: "سنة واحدة",
    years: (n: string) => `${n} سنوات`,
    retentionExpiring: (n: string) => (n === "1" ? "سجل واحد أقدم من ذلك وسيُحذف." : `${n} سجلات أقدم من ذلك وستُحذف.`),
    retentionSaved: "تم تحديث مدة الاحتفاظ.",
    retentionFailed: "تعذّر تغيير مدة الاحتفاظ. حاول مرة أخرى.",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type AuditLogLabels = Partial<typeof STRINGS.en>;

const CHANNEL_ICON = { web: Globe, api: Server, mcp: Bot } as const;

export interface AuditRetention {
  /** Days entries are kept; `null` keeps them forever. */
  days: number | null;
  /** The choices offered. Default `[30, 90, 180, 365, 730, null]`. */
  options?: readonly (number | null)[];
}

export interface AuditLogProps extends Omit<ComponentProps<"div">, "children"> {
  entries: readonly AuditEntry[];
  /** Friendly names for action ids, for example `{ "member.role_changed": "Role changed" }`. Unknown ids show as they are. */
  actionLabels?: Record<string, string>;
  /** Friendly names for entity types. */
  entityLabels?: Record<string, string>;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onRefresh?: () => void | Promise<void>;
  pageSize?: number;
  /** Shows the retention setting. */
  retention?: AuditRetention;
  /** Save a new retention. Reject or resolve `{ error }` to roll it back. Omit to show it read-only. */
  onChangeRetention?: (days: number | null) => Promise<void | { error?: string }>;
  labels?: AuditLogLabels;
}

/**
 * The audit log: who did what, to which entity, from where (web, API or MCP) and when. Filter by actor,
 * action, entity, channel and dates; open a row to see the field-level before and after. A retention control
 * sets how long entries are kept. You send the entries; filtering runs on them in the browser.
 */
export function AuditLog({ entries, actionLabels, entityLabels, loading, error, onRetry, onRefresh, pageSize = 10, retention, onChangeRetention, labels, className, ...props }: AuditLogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const actionName = (id: string) => actionLabels?.[id] ?? id;
  const entityName = (id: string) => entityLabels?.[id] ?? id;

  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [open, setOpen] = useState<AuditEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const dated = useMemo(() => filterEntries(entries, { from: range.from, to: range.to }), [entries, range]);

  const actors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) if (!seen.has(actorKey(e))) seen.set(actorKey(e), e.actor?.name ?? t.system);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [entries, t.system]);
  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort().map((value) => ({ value, label: actionName(value) })), [entries, actionLabels]); // eslint-disable-line react-hooks/exhaustive-deps
  const entities = useMemo(() => [...new Set(entries.map((e) => e.entity.type))].sort().map((value) => ({ value, label: entityName(value) })), [entries, entityLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<DataTableColumn<AuditEntry>[]>(
    () => [
      {
        id: "when",
        header: t.when,
        label: t.when,
        hideable: false,
        sortValue: (e) => new Date(e.at),
        cell: (e) => (
          <span className="whitespace-nowrap text-body-sm text-foreground">
            <DateTime value={e.at} format={{ dateStyle: "medium", timeStyle: "short" }} />
          </span>
        ),
      },
      {
        id: "actor",
        header: t.actor,
        label: t.actor,
        sortValue: (e) => e.actor?.name ?? t.system,
        searchValue: (e) => `${e.actor?.name ?? ""} ${e.actor?.email ?? ""}`,
        filterValue: actorKey,
        cell: (e) =>
          e.actor ? (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={e.actor.name} src={e.actor.avatar} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-label text-foreground">{e.actor.name}</span>
                {e.actor.email ? (
                  <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                    {e.actor.email}
                  </bdi>
                ) : null}
              </div>
            </div>
          ) : (
            <span className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Cpu aria-hidden className="size-4" />
              {t.system}
            </span>
          ),
      },
      {
        id: "action",
        header: t.action,
        label: t.action,
        sortValue: (e) => actionName(e.action),
        searchValue: (e) => `${e.action} ${actionName(e.action)}`,
        filterValue: (e) => e.action,
        cell: (e) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-label text-foreground">{actionName(e.action)}</span>
            {actionLabels?.[e.action] ? (
              <bdi dir="ltr" className="truncate font-mono text-caption text-muted-foreground">
                {e.action}
              </bdi>
            ) : null}
          </div>
        ),
      },
      {
        id: "entity",
        header: t.entity,
        label: t.entity,
        sortValue: (e) => e.entity.label ?? e.entity.type,
        searchValue: (e) => `${e.entity.type} ${entityName(e.entity.type)} ${e.entity.label ?? ""} ${e.entity.id ?? ""}`,
        filterValue: (e) => e.entity.type,
        cell: (e) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm text-foreground">{e.entity.label ?? entityName(e.entity.type)}</span>
            <span className="truncate text-caption text-muted-foreground">{entityName(e.entity.type)}</span>
          </div>
        ),
      },
      {
        id: "channel",
        header: t.channel,
        label: t.channel,
        sortValue: (e) => e.channel,
        filterValue: (e) => e.channel,
        cell: (e) => {
          const Icon = CHANNEL_ICON[e.channel];
          return (
            <Badge variant="outline">
              <Icon aria-hidden />
              {t.channels[e.channel]}
            </Badge>
          );
        },
      },
      {
        id: "ip",
        header: t.ip,
        label: t.ip,
        defaultHidden: true,
        cell: (e) => (e.ip ? <bdi dir="ltr" className="font-mono text-caption">{e.ip}</bdi> : <span className="text-muted-foreground">-</span>),
      },
    ],
    [t, actionLabels, entityLabels], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const table = useDataTable({ data: dated as AuditEntry[], columns, getRowId: (e) => e.id, pageSize, defaultSort: { id: "when", direction: "desc" } });
  const hasFilters = !!(range.from || range.to);
  const nothing = !loading && !error && entries.length === 0;

  return (
    <div data-slot="audit-log" className={cn("flex flex-col gap-4", className)} {...props}>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="actor" title={t.actor} options={actors} />
        <DataTableFacetFilter table={table} column="action" title={t.action} options={actions} />
        <DataTableFacetFilter table={table} column="entity" title={t.entity} options={entities} />
        <DataTableFacetFilter table={table} column="channel" title={t.channel} options={AUDIT_CHANNELS.map((c) => ({ value: c, label: t.channels[c] }))} />
        <DateRangePicker value={range} onValueChange={setRange} placeholder={t.datePlaceholder} aria-label={t.dates} className="w-56" />
        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={() => setRange({ from: null, to: null })}>
            {t.clearDates}
          </Button>
        ) : null}
        <DataTableViewOptions table={table} />
        {onRefresh ? (
          <Button
            variant="secondary"
            size="sm"
            className="ms-auto"
            loading={refreshing}
            onClick={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw />
            {t.refresh}
          </Button>
        ) : null}
      </DataTableToolbar>

      <DataTable
        table={table}
        label={t.table}
        rowLabel={(e) => actionName(e.action)}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={setOpen}
        empty={nothing ? <EmptyState icon={UserRound} title={t.empty} description={t.emptyHint} /> : <EmptyState title={t.noMatch} description={t.noMatchHint} />}
      />
      <DataTablePagination table={table} />

      {retention ? <RetentionSetting retention={retention} entries={entries} onChange={onChangeRetention} labels={t} locale={locale} /> : null}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl" data-slot="audit-log-details">
          {open ? <EntryDetails entry={open} t={t} locale={locale} actionName={actionName} entityName={entityName} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type T = ReturnType<typeof strings>;

function EntryDetails({ entry, t, locale, actionName, entityName }: { entry: AuditEntry; t: T; locale: string; actionName: (id: string) => string; entityName: (id: string) => string }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{actionName(entry.action)}</DialogTitle>
        <DialogDescription>
          {entry.actor?.name ?? t.system} · <DateTime value={entry.at} format={{ dateStyle: "long", timeStyle: "medium" }} />
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-body-sm">
        <dt className="text-muted-foreground">{t.action}</dt>
        <dd>
          <bdi dir="ltr" className="font-mono">
            {entry.action}
          </bdi>
        </dd>
        <dt className="text-muted-foreground">{t.entity}</dt>
        <dd>
          {entry.entity.label ?? entityName(entry.entity.type)}
          <span className="text-muted-foreground"> · {entityName(entry.entity.type)}</span>
        </dd>
        <dt className="text-muted-foreground">{t.channel}</dt>
        <dd>{t.channels[entry.channel]}</dd>
        {entry.ip ? (
          <>
            <dt className="text-muted-foreground">{t.ip}</dt>
            <dd>
              <bdi dir="ltr" className="font-mono">
                {entry.ip}
              </bdi>
            </dd>
          </>
        ) : null}
      </dl>
      <section aria-label={t.changes} className="flex flex-col gap-2">
        <h3 className="text-label text-foreground">
          {t.changes}
          {entry.changes?.length ? <span className="font-normal text-muted-foreground"> · {t.fieldCount(formatNumber(entry.changes.length, locale))}</span> : null}
        </h3>
        {entry.changes?.length ? <ChangeTable changes={entry.changes} t={t} /> : <p className="text-body-sm text-muted-foreground">{t.noChanges}</p>}
      </section>
    </>
  );
}

/** Field-level before and after. Every row says added, removed or changed in words, and the signs mirror colour. */
function ChangeTable({ changes, t }: { changes: readonly AuditChange[]; t: T }) {
  const kindLabel = { added: t.added, removed: t.removed, changed: t.changed };
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full text-body-sm" data-slot="audit-changes">
        <thead className="bg-secondary text-start text-caption text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.field}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.before}
            </th>
            <th scope="col" className="px-3 py-2 text-start font-medium">
              {t.after}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {changes.map((c) => {
            const kind = changeKind(c);
            const before = formatChangeValue(c.before);
            const after = formatChangeValue(c.after);
            return (
              <tr key={c.field} data-kind={kind} className="align-top">
                <th scope="row" className="px-3 py-2 text-start font-normal">
                  <bdi dir="ltr" className="font-mono text-caption text-foreground">
                    {c.field}
                  </bdi>
                  <span className="mt-0.5 block text-caption text-muted-foreground">{kindLabel[kind]}</span>
                </th>
                <td className="px-3 py-2">
                  {kind === "added" ? (
                    <span className="text-muted-foreground">{t.empty_value}</span>
                  ) : (
                    <span className="inline-flex items-start gap-1 rounded-[4px] bg-nq-danger-soft px-1.5 py-0.5 text-nq-danger-text">
                      <Minus aria-hidden className="mt-0.5 size-3 shrink-0" />
                      <bdi dir="auto" className="break-all">
                        {before || t.empty_value}
                      </bdi>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {kind === "removed" ? (
                    <span className="text-muted-foreground">{t.empty_value}</span>
                  ) : (
                    <span className="inline-flex items-start gap-1 rounded-[4px] bg-nq-success-soft px-1.5 py-0.5 text-nq-success-text">
                      <Plus aria-hidden className="mt-0.5 size-3 shrink-0" />
                      <bdi dir="auto" className="break-all">
                        {after || t.empty_value}
                      </bdi>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Optimistic: the select moves at once and goes back if the save fails. */
function RetentionSetting({ retention, entries, onChange, labels: t, locale }: { retention: AuditRetention; entries: readonly AuditEntry[]; onChange?: AuditLogProps["onChangeRetention"]; labels: T; locale: string }) {
  const [days, setDays] = useState<number | null>(retention.days);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  useEffect(() => setDays(retention.days), [retention.days]);

  const options = retention.options ?? [30, 90, 180, 365, 730, null];
  const label = (d: number | null) => (d === null ? t.forever : d === 365 ? t.year : d % 365 === 0 ? t.years(formatNumber(d / 365, locale)) : t.days(formatNumber(d, locale)));
  const expiring = expiringCount(entries, days);
  const key = (d: number | null) => (d === null ? "forever" : String(d));

  const change = async (next: number | null) => {
    const previous = days;
    setDays(next);
    setNotice(null);
    setBusy(true);
    try {
      const result = await onChange?.(next);
      if (result && typeof result === "object" && result.error) throw new Error(result.error);
      setNotice({ tone: "success", text: t.retentionSaved });
    } catch (e) {
      setDays(previous);
      setNotice({ tone: "danger", text: e instanceof Error && e.message ? e.message : t.retentionFailed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-slot="audit-retention" aria-label={t.retention} className="flex flex-col gap-3 rounded-card border border-border p-4">
      <Field>
        <FieldLabel>{t.retention}</FieldLabel>
        <Select
          items={options.map((d) => ({ value: key(d), label: label(d) }))}
          value={key(days)}
          disabled={!onChange || busy}
          onValueChange={(v) => {
            if (v === null) return;
            void change(v === "forever" ? null : Number(v));
          }}
        >
          <SelectTrigger aria-label={t.retentionAria} className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((d) => (
              <SelectItem key={key(d)} value={key(d)}>
                {label(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t.retentionHint}</FieldDescription>
      </Field>
      {expiring > 0 ? (
        <Alert tone="warning">{t.retentionExpiring(formatNumber(expiring, locale))}</Alert>
      ) : null}
      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}
    </section>
  );
}
