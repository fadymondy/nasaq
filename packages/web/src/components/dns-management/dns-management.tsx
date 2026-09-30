"use client";

import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import {
  DataTable,
  type DataTableColumn,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { EmptyState } from "../states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Switch } from "../switch";
import {
  DEFAULT_TTLS,
  DNS_TYPES,
  type DnsErrorCode,
  type DnsErrors,
  fqdn,
  formatTtl,
  isProxiable,
  needsPriority,
  relativeName,
  TTL_AUTO,
  type TtlUnits,
  validateRecord,
} from "./dns-format";

export {
  DEFAULT_TTLS,
  DNS_TYPES,
  type DnsDraft,
  type DnsErrorCode,
  type DnsErrors,
  type DnsType,
  fqdn,
  formatTtl,
  isHostname,
  isIPv4,
  isIPv6,
  isProxiable,
  needsPriority,
  relativeName,
  TTL_AUTO,
  type TtlUnits,
  validateRecord,
} from "./dns-format";

const STRINGS = {
  en: {
    title: "DNS records",
    description: (zone: string) => `Records for ${zone}. Changes can take a few minutes to reach everyone.`,
    add: "Add record",
    search: "Search records",
    typeFilter: "Type",
    table: "DNS records",
    type: "Type",
    name: "Name",
    content: "Content",
    ttl: "TTL",
    proxy: "Proxy",
    actions: "Actions",
    proxied: "Proxied",
    dnsOnly: "DNS only",
    proxyFor: (name: string) => `Proxy for ${name}`,
    edit: "Edit",
    remove: "Delete",
    emptyTitle: "No DNS records yet",
    emptyBody: "Add an A or CNAME record to point your domain at a server.",
    addTitle: "Add a DNS record",
    editTitle: "Edit DNS record",
    formBody: "Names are relative to the zone. Use @ for the root.",
    nameLabel: "Name",
    namePlaceholder: "@ or www",
    nameHint: (full: string) => `Full name: ${full}`,
    contentLabel: "Content",
    contentPlaceholder: { A: "203.0.113.10", AAAA: "2001:db8::1", CNAME: "target.example.com", MX: "mail.example.com", TXT: "v=spf1 include:_spf.example.com ~all", NS: "ns1.example.com", SRV: "target.example.com", CAA: '0 issue "letsencrypt.org"' } as Record<string, string>,
    priority: "Priority",
    ttlLabel: "TTL",
    proxyLabel: "Proxy through the network",
    proxyHint: "Hides the origin address and adds caching and protection. Only for A, AAAA and CNAME.",
    commentLabel: "Comment",
    commentPlaceholder: "What this record is for",
    cancel: "Cancel",
    save: "Save record",
    saveAdd: "Add record",
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: "Anything that relies on this record stops resolving once the change spreads. This cannot be undone.",
    deleteConfirm: "Delete record",
    genericError: "Something went wrong. Try again.",
    errors: {
      name: "Use letters, digits, hyphens and dots, or @ for the root.",
      content: "Enter the record content.",
      ipv4: "Enter a valid IPv4 address, like 203.0.113.10.",
      ipv6: "Enter a valid IPv6 address, like 2001:db8::1.",
      hostname: "Enter a valid host name, like target.example.com.",
      priority: "Priority is a whole number from 0 to 65535.",
      ttl: "TTL is Auto or between 30 seconds and 1 day.",
      cnameApex: "A CNAME cannot sit at the root of the zone.",
      conflict: "A CNAME cannot share a name with another record.",
      duplicate: "An identical record already exists.",
    } satisfies Record<DnsErrorCode, string>,
    ttlUnits: {
      auto: "Auto",
      seconds: (n: number) => `${n} sec`,
      minutes: (n: number) => `${n} min`,
      hours: (n: number) => (n === 1 ? "1 hour" : `${n} hours`),
      days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    } satisfies TtlUnits,
  },
  ar: {
    title: "سجلات DNS",
    description: (zone: string) => `سجلات ${zone}. قد يستغرق وصول التغييرات إلى الجميع بضع دقائق.`,
    add: "إضافة سجل",
    search: "ابحث في السجلات",
    typeFilter: "النوع",
    table: "سجلات DNS",
    type: "النوع",
    name: "الاسم",
    content: "المحتوى",
    ttl: "TTL",
    proxy: "الوكيل",
    actions: "إجراءات",
    proxied: "عبر الوكيل",
    dnsOnly: "DNS فقط",
    proxyFor: (name: string) => `الوكيل لـ ${name}`,
    edit: "تعديل",
    remove: "حذف",
    emptyTitle: "لا توجد سجلات DNS بعد",
    emptyBody: "أضف سجل A أو CNAME لتوجيه نطاقك إلى خادم.",
    addTitle: "إضافة سجل DNS",
    editTitle: "تعديل سجل DNS",
    formBody: "الأسماء نسبية إلى النطاق. استخدم @ للجذر.",
    nameLabel: "الاسم",
    namePlaceholder: "@ أو www",
    nameHint: (full: string) => `الاسم الكامل: ${full}`,
    contentLabel: "المحتوى",
    contentPlaceholder: { A: "203.0.113.10", AAAA: "2001:db8::1", CNAME: "target.example.com", MX: "mail.example.com", TXT: "v=spf1 include:_spf.example.com ~all", NS: "ns1.example.com", SRV: "target.example.com", CAA: '0 issue "letsencrypt.org"' } as Record<string, string>,
    priority: "الأولوية",
    ttlLabel: "TTL",
    proxyLabel: "المرور عبر الشبكة",
    proxyHint: "يخفي عنوان الخادم الأصلي ويضيف التخزين المؤقت والحماية. لسجلات A وAAAA وCNAME فقط.",
    commentLabel: "تعليق",
    commentPlaceholder: "الغرض من هذا السجل",
    cancel: "إلغاء",
    save: "حفظ السجل",
    saveAdd: "إضافة السجل",
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBody: "أي شيء يعتمد على هذا السجل يتوقف عن العمل بعد انتشار التغيير. لا يمكن التراجع.",
    deleteConfirm: "حذف السجل",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    errors: {
      name: "استخدم أحرفًا وأرقامًا وشرطات ونقاطًا، أو @ للجذر.",
      content: "أدخل محتوى السجل.",
      ipv4: "أدخل عنوان IPv4 صالحًا مثل 203.0.113.10.",
      ipv6: "أدخل عنوان IPv6 صالحًا مثل 2001:db8::1.",
      hostname: "أدخل اسم مضيف صالحًا مثل target.example.com.",
      priority: "الأولوية عدد صحيح من 0 إلى 65535.",
      ttl: "TTL تلقائي أو بين 30 ثانية ويوم واحد.",
      cnameApex: "لا يمكن وضع CNAME في جذر النطاق.",
      conflict: "لا يمكن أن يشترك CNAME في الاسم مع سجل آخر.",
      duplicate: "يوجد سجل مطابق بالفعل.",
    } satisfies Record<DnsErrorCode, string>,
    ttlUnits: {
      auto: "تلقائي",
      seconds: (n: number) => `${n} ثانية`,
      minutes: (n: number) => `${n} دقيقة`,
      hours: (n: number) => (n === 1 ? "ساعة" : n === 2 ? "ساعتان" : `${n} ساعات`),
      days: (n: number) => (n === 1 ? "يوم" : n === 2 ? "يومان" : `${n} أيام`),
    } satisfies TtlUnits,
  },
};

export type DnsManagementLabels = (typeof STRINGS)["en"];

export interface DnsRecord {
  id: string;
  /** `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SRV` or `CAA`. */
  type: string;
  /** Relative to the zone (`www`), or `@` for the root. A full name inside the zone is accepted too. */
  name: string;
  content: string;
  /** Seconds, or 1 for Auto. */
  ttl: number;
  /** Only meaningful for A, AAAA and CNAME. */
  proxied?: boolean;
  /** MX and SRV. */
  priority?: number;
  comment?: string;
}

/** What the form hands to `onSave`. `id` is set when editing. */
export interface DnsRecordInput {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string;
}

export interface DnsManagementProps extends Omit<ComponentProps<"div">, "children"> {
  /** The domain these records belong to, such as `example.com`. */
  zone: string;
  records: readonly DnsRecord[];
  /** Record types offered in the form. Default: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA. */
  types?: readonly string[];
  /** TTL choices in seconds; 1 is Auto. Default: Auto, 1 min, 5 min, 15 min, 1 h, 4 h, 1 day. */
  ttlOptions?: readonly number[];
  /** Hide the proxy column and switch, for zones without a proxy. */
  proxy?: boolean;
  loading?: boolean;
  /** Add or edit a record. Resolve, or resolve `{ error }` to show it in the form. The host then passes the updated `records`. */
  onSave: (input: DnsRecordInput) => Promise<void | { error?: string }>;
  /** Delete a record. Shows Delete in the row menu. */
  onDelete?: (id: string) => Promise<void | { error?: string }>;
  /** Flip the proxy of a record right from the table. */
  onToggleProxy?: (id: string, proxied: boolean) => Promise<void | { error?: string }>;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<DnsManagementLabels>;
}

const typeTone: Record<string, "info" | "success" | "warning" | "neutral"> = { A: "info", AAAA: "info", CNAME: "success", MX: "warning" };

function RecordDialog({
  open,
  onOpenChange,
  editing,
  zone,
  records,
  types,
  ttlOptions,
  proxy,
  onSave,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DnsRecord | null;
  zone: string;
  records: readonly DnsRecord[];
  types: readonly string[];
  ttlOptions: readonly number[];
  proxy: boolean;
  onSave: DnsManagementProps["onSave"];
  t: DnsManagementLabels;
}) {
  const [type, setType] = useState("A");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState(String(TTL_AUTO));
  const [priority, setPriority] = useState("10");
  const [proxied, setProxied] = useState(false);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<DnsErrors & { form?: string }>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? types[0] ?? "A");
    setName(editing?.name ?? "");
    setContent(editing?.content ?? "");
    setTtl(String(editing?.ttl ?? TTL_AUTO));
    setPriority(String(editing?.priority ?? 10));
    setProxied(editing?.proxied ?? false);
    setComment(editing?.comment ?? "");
    setErrors({});
  }, [open, editing, types]);

  const ttlItems = ttlOptions.map((v) => ({ value: String(v), label: formatTtl(v, t.ttlUnits) }));
  if (!ttlItems.some((i) => i.value === ttl)) ttlItems.push({ value: ttl, label: formatTtl(Number(ttl), t.ttlUnits) });
  const typeItems = types.map((v) => ({ value: v, label: v }));
  const canProxy = proxy && isProxiable(type);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const draft = {
      type,
      name,
      content,
      ttl: Number(ttl),
      priority: needsPriority(type) ? Number(priority) : undefined,
      proxied: canProxy ? proxied : false,
    };
    const found = validateRecord(draft, zone, records, editing?.id);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    try {
      const result = await onSave({
        ...(editing ? { id: editing.id } : {}),
        type,
        name: relativeName(name, zone),
        content: content.trim(),
        ttl: draft.ttl,
        proxied: draft.proxied,
        ...(draft.priority !== undefined ? { priority: draft.priority } : {}),
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      if (result?.error) setErrors({ form: result.error });
      else onOpenChange(false);
    } catch {
      setErrors({ form: t.genericError });
    } finally {
      setPending(false);
    }
  }

  const err = (code?: DnsErrorCode) => (code ? t.errors[code] : undefined);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="dns-record-form">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{editing ? t.editTitle : t.addTitle}</DialogTitle>
            <DialogDescription>{t.formBody}</DialogDescription>
          </DialogHeader>
          {errors.form ? <Alert tone="danger">{errors.form}</Alert> : null}
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field>
              <FieldLabel>{t.type}</FieldLabel>
              <Select
                items={typeItems}
                value={type}
                onValueChange={(v) => {
                  if (!v) return;
                  setType(v);
                  if (!isProxiable(v)) setProxied(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field invalid={Boolean(errors.name)}>
              <FieldLabel>{t.nameLabel}</FieldLabel>
              <Input ltr value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="off" spellCheck={false} />
              {errors.name ? <FieldError match>{err(errors.name)}</FieldError> : <FieldDescription>{t.nameHint(fqdn(name, zone))}</FieldDescription>}
            </Field>
          </div>
          <Field invalid={Boolean(errors.content)}>
            <FieldLabel>{t.contentLabel}</FieldLabel>
            <Input
              ltr
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t.contentPlaceholder[type] ?? ""}
              autoComplete="off"
              spellCheck={false}
            />
            {errors.content ? <FieldError match>{err(errors.content)}</FieldError> : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {needsPriority(type) ? (
              <Field invalid={Boolean(errors.priority)}>
                <FieldLabel>{t.priority}</FieldLabel>
                <Input ltr inputMode="numeric" value={priority} onChange={(e) => setPriority(e.target.value)} />
                {errors.priority ? <FieldError match>{err(errors.priority)}</FieldError> : null}
              </Field>
            ) : null}
            <Field invalid={Boolean(errors.ttl)}>
              <FieldLabel>{t.ttlLabel}</FieldLabel>
              <Select items={ttlItems} value={ttl} onValueChange={(v) => v && setTtl(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ttlItems.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ttl ? <FieldError match>{err(errors.ttl)}</FieldError> : null}
            </Field>
          </div>
          {proxy ? (
            <div className="flex items-start justify-between gap-4 rounded-card border border-border p-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span id="dns-proxy-label" className="text-label text-foreground">
                  {t.proxyLabel}
                </span>
                <span className="text-caption text-muted-foreground">{t.proxyHint}</span>
              </div>
              <Switch aria-labelledby="dns-proxy-label" checked={canProxy && proxied} disabled={!isProxiable(type)} onCheckedChange={setProxied} />
            </div>
          ) : null}
          <Field>
            <FieldLabel>{t.commentLabel}</FieldLabel>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.commentPlaceholder} maxLength={100} autoComplete="off" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {editing ? t.save : t.saveAdd}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A zone's DNS records in a searchable, sortable table (A, AAAA, CNAME, MX, TXT and more) with an add and
 * edit form, TTL choices, a proxy switch per record and a confirmed delete. The form checks the value
 * against the type (IPv4, IPv6, host name, priority) and against the zone (a CNAME cannot share a name,
 * no duplicates). It is presentational: your callbacks talk to the DNS provider and you pass `records` back.
 */
export function DnsManagement({
  zone,
  records,
  types = DNS_TYPES,
  ttlOptions = DEFAULT_TTLS,
  proxy = true,
  loading = false,
  onSave,
  onDelete,
  onToggleProxy,
  labels,
  className,
  ...props
}: DnsManagementProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DnsRecord | null>(null);
  const [deleting, setDeleting] = useState<DnsRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flipping, setFlipping] = useState<Record<string, boolean>>({});

  async function toggle(record: DnsRecord, next: boolean) {
    if (!onToggleProxy) return;
    setError(null);
    setFlipping((f) => ({ ...f, [record.id]: next }));
    try {
      const result = await onToggleProxy(record.id, next);
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    } finally {
      setFlipping((f) => {
        const { [record.id]: _gone, ...rest } = f;
        return rest;
      });
    }
  }

  async function confirmDelete() {
    if (!deleting || !onDelete) return;
    setDeletePending(true);
    try {
      const result = await onDelete(deleting.id);
      if (result?.error) setError(result.error);
      setDeleting(null);
    } catch {
      setError(t.genericError);
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  const columns = useMemo<DataTableColumn<DnsRecord>[]>(
    () => [
      {
        id: "type",
        header: t.type,
        label: t.type,
        cell: (r) => (
          <Badge variant={typeTone[r.type] ?? "neutral"}>
            <bdi dir="ltr">{r.type}</bdi>
          </Badge>
        ),
        sortValue: (r) => r.type,
        filterValue: (r) => r.type,
        searchValue: (r) => r.type,
      },
      {
        id: "name",
        header: t.name,
        label: t.name,
        cell: (r) => (
          <span dir="ltr" className="block max-w-56 truncate text-start font-mono text-code text-foreground" title={fqdn(r.name, zone)}>
            {relativeName(r.name, zone)}
          </span>
        ),
        sortValue: (r) => relativeName(r.name, zone),
        searchValue: (r) => `${r.name} ${fqdn(r.name, zone)} ${r.comment ?? ""}`,
      },
      {
        id: "content",
        header: t.content,
        label: t.content,
        cell: (r) => (
          <span dir="ltr" className="flex max-w-80 min-w-0 items-center gap-2 text-start font-mono text-code text-muted-foreground">
            {r.priority != null ? <Badge variant="outline">{r.priority}</Badge> : null}
            <span className="truncate" title={r.content}>
              {r.content}
            </span>
          </span>
        ),
        sortValue: (r) => r.content,
        searchValue: (r) => r.content,
      },
      {
        id: "ttl",
        header: t.ttl,
        label: t.ttl,
        cell: (r) => <span className="whitespace-nowrap tabular-nums">{formatTtl(r.ttl, t.ttlUnits)}</span>,
        sortValue: (r) => r.ttl,
      },
      ...(proxy
        ? ([
            {
              id: "proxy",
              header: t.proxy,
              label: t.proxy,
              cell: (r) => {
                if (!isProxiable(r.type)) return <span className="text-muted-foreground">-</span>;
                const on = flipping[r.id] ?? Boolean(r.proxied);
                return (
                  <span className="inline-flex items-center gap-2">
                    <Switch
                      aria-label={t.proxyFor(relativeName(r.name, zone))}
                      checked={on}
                      disabled={!onToggleProxy || r.id in flipping}
                      onCheckedChange={(next) => toggle(r, next)}
                    />
                    <span className="text-caption text-muted-foreground">{on ? t.proxied : t.dnsOnly}</span>
                  </span>
                );
              },
              sortValue: (r) => (isProxiable(r.type) ? Number(Boolean(r.proxied)) : -1),
            },
          ] satisfies DataTableColumn<DnsRecord>[])
        : []),
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: toggle only closes over stable callbacks and state setters
    [t, zone, proxy, flipping, onToggleProxy],
  );

  const table = useDataTable({ data: [...records], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "type", direction: "asc" } });
  const usedTypes = [...new Set(records.map((r) => r.type))];

  return (
    <Card data-slot="dns-management" className={cn("w-full max-w-5xl", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.title}</CardTitle>
          <CardDescription>{t.description(zone)}</CardDescription>
          <span dir="ltr" className="inline-flex w-fit items-center gap-1.5 font-mono text-code text-foreground">
            <Globe aria-hidden className="size-3.5 text-muted-foreground" />
            {zone}
          </span>
        </div>
        <Button
          type="button"
          variant="primary"
          className="mt-3 sm:mt-0"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden />
          {t.add}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.search} />
          <DataTableFacetFilter table={table} column="type" title={t.typeFilter} options={usedTypes.map((v) => ({ value: v, label: v }))} />
        </DataTableToolbar>
        <DataTable
          table={table}
          label={t.table}
          rowLabel={(r) => `${r.type} ${relativeName(r.name, zone)}`}
          loading={loading}
          empty={<EmptyState icon={Globe} title={t.emptyTitle} description={t.emptyBody} />}
          rowActions={(r) => [
            {
              id: "edit",
              label: t.edit,
              icon: Pencil,
              onSelect: () => {
                setEditing(r);
                setFormOpen(true);
              },
            },
            ...(onDelete ? [{ id: "delete", label: t.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => setDeleting(r) }] : []),
          ]}
        />
        <DataTablePagination table={table} />
      </CardContent>
      <RecordDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} zone={zone} records={records} types={types} ttlOptions={ttlOptions} proxy={proxy} onSave={onSave} t={t} />
      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && !deletePending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleting ? t.deleteTitle(`${deleting.type} ${relativeName(deleting.name, zone)}`) : ""}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>{t.cancel}</AlertDialogCancel>
            <Button variant="danger" loading={deletePending} onClick={confirmDelete}>
              {t.deleteConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
