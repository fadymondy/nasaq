"use client";

import { Globe, Plus, RefreshCw, Star, Trash2 } from "lucide-react";
import { type ComponentProps, type FormEvent, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DataTable, type DataTableColumn, type DataTableRowAction, useDataTable } from "../data-table";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { CopyButton } from "../copy-button";
import { DateTime } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Status, type StatusTone } from "../status";
import { type DomainCheck, isValidHostname, normalizeHost, splitOverflow, summarizeDomains } from "./domains-format";

export { type DomainCheck, type DomainSummary, isValidHostname, normalizeHost, splitOverflow, summarizeDomains } from "./domains-format";

const STRINGS = {
  en: {
    title: "Custom domains",
    description: "Serve this site from your own domain names.",
    checks: { verified: "Verified", pending: "Waiting for DNS", checking: "Checking", failed: "Check failed" } satisfies Record<DomainCheck, string>,
    summary: (v: number, total: number) => `${v} of ${total} verified`,
    primary: "Primary",
    makePrimary: "Make primary",
    recheck: "Check again",
    remove: "Remove",
    removeTitle: (host: string) => `Remove ${host}?`,
    removeBody: "The site stops answering on this domain. The DNS records at your registrar are not touched.",
    cancel: "Cancel",
    add: "Add domain",
    addLabel: "Domain name",
    addHint: "For example shop.example.com",
    invalid: "Enter a full domain name like shop.example.com.",
    duplicate: "This domain is already added.",
    table: "Custom domains",
    cols: { domain: "Domain", status: "Status", added: "Added" },
    empty: "No custom domains yet. Add one to get started.",
    setup: "Point the domain at us",
    setupBody: "At your DNS provider, add a CNAME record for the domain that points to",
    copyTarget: "Copy the CNAME target",
    actionsFor: (host: string) => `Actions for ${host}`,
    more: (n: number) => `+${n} more`,
    moreLabel: (n: number) => `Show ${n} more domains`,
    genericError: "Something went wrong. Try again.",
    domainsLabel: "Domains",
  },
  ar: {
    title: "النطاقات المخصصة",
    description: "اخدم هذا الموقع من أسماء نطاقاتك الخاصة.",
    checks: { verified: "موثّق", pending: "بانتظار DNS", checking: "قيد الفحص", failed: "فشل الفحص" } satisfies Record<DomainCheck, string>,
    summary: (v: number, total: number) => `${v} من ${total} موثّق`,
    primary: "أساسي",
    makePrimary: "تعيين كأساسي",
    recheck: "فحص مجددًا",
    remove: "إزالة",
    removeTitle: (host: string) => `إزالة ${host}؟`,
    removeBody: "يتوقف الموقع عن الاستجابة على هذا النطاق. لا تتأثر سجلات DNS لدى مسجّل النطاق.",
    cancel: "إلغاء",
    add: "إضافة نطاق",
    addLabel: "اسم النطاق",
    addHint: "مثال: shop.example.com",
    invalid: "أدخل اسم نطاق كاملًا مثل shop.example.com.",
    duplicate: "هذا النطاق مضاف بالفعل.",
    table: "النطاقات المخصصة",
    cols: { domain: "النطاق", status: "الحالة", added: "أضيف" },
    empty: "لا توجد نطاقات مخصصة بعد. أضف نطاقًا للبدء.",
    setup: "وجّه النطاق إلينا",
    setupBody: "لدى مزوّد DNS أضف سجل CNAME للنطاق يشير إلى",
    copyTarget: "نسخ هدف CNAME",
    actionsFor: (host: string) => `إجراءات ${host}`,
    more: (n: number) => `+${n} أخرى`,
    moreLabel: (n: number) => `عرض ${n} نطاقات أخرى`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    domainsLabel: "النطاقات",
  },
};

type T = typeof STRINGS.en;
export type DomainsManagerLabels = Partial<T>;
export type DomainsResult = void | { error?: string };

export interface DomainRecord {
  id: string;
  host: string;
  check: DomainCheck;
  primary?: boolean;
  addedAt?: Date | number | string;
  /** Why the last check failed, shown under the status. */
  error?: string;
}

const checkTone: Record<DomainCheck, StatusTone> = { verified: "success", pending: "warning", checking: "info", failed: "danger" };

export interface DomainChipsProps extends Omit<ComponentProps<"ul">, "children"> {
  domains: readonly Pick<DomainRecord, "id" | "host" | "check" | "primary">[];
  /** How many chips show before the rest fold into a "+N" chip that opens the full list. Default 2. */
  max?: number;
  labels?: DomainsManagerLabels;
}

/** A compact row of domain chips, each with its check state, and a "+N" chip that opens the rest. Good for table cells and cards. */
export function DomainChips({ domains, max = 2, labels, className, ...props }: DomainChipsProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const { shown, hidden } = splitOverflow(domains, max);
  const chip = (d: (typeof domains)[number]) => (
    <li key={d.id} data-slot="domain-chip" data-check={d.check}>
      <Badge variant={d.check === "verified" ? "success" : d.check === "failed" ? "danger" : "warning"} title={t.checks[d.check]} className="h-6 gap-1.5">
        <bdi dir="ltr" className="font-mono">
          {d.host}
        </bdi>
        <span className="sr-only">{t.checks[d.check]}</span>
      </Badge>
    </li>
  );
  return (
    <ul data-slot="domain-chips" aria-label={t.domainsLabel} className={cn("flex flex-wrap items-center gap-1.5", className)} {...props}>
      {shown.map(chip)}
      {hidden.length ? (
        <li data-slot="domain-chips-more">
          <Popover>
            <PopoverTrigger render={<Button type="button" variant="secondary" size="sm" aria-label={t.moreLabel(hidden.length)} className="h-6 rounded-[4px] px-1.5 text-caption" />}>
              <bdi>{t.more(hidden.length)}</bdi>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto min-w-52">
              <ul className="grid gap-1.5">{hidden.map(chip)}</ul>
            </PopoverContent>
          </Popover>
        </li>
      ) : null}
    </ul>
  );
}

export interface DomainsManagerProps extends Omit<ComponentProps<typeof Card>, "children"> {
  domains: readonly DomainRecord[];
  /** The CNAME target people must point their domain at. Shown with a copy button. */
  cnameTarget?: string;
  loading?: boolean;
  /** Add a domain (already normalised). Resolve `{ error }` to show it under the field. */
  onAdd: (host: string) => Promise<DomainsResult>;
  onRemove: (id: string) => Promise<DomainsResult>;
  /** Run the DNS check again. The host then updates `check`. */
  onRecheck: (id: string) => Promise<DomainsResult>;
  /** Shows "Make primary" when set. */
  onMakePrimary?: (id: string) => Promise<DomainsResult>;
  labels?: DomainsManagerLabels;
}

/**
 * Custom domains for a site: add a domain, see whether its DNS check passed, check again, make one primary and
 * remove one (with a confirm). Row actions also open on context-click. Presentational: your callbacks talk to the
 * server and you pass the updated `domains` back.
 */
export function DomainsManager({ domains, cnameTarget, loading = false, onAdd, onRemove, onRecheck, onMakePrimary, labels, className, ...props }: DomainsManagerProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState<DomainRecord | null>(null);
  const summary = summarizeDomains(domains);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const host = normalizeHost(value);
    if (!isValidHostname(host)) return setError(t.invalid);
    if (domains.some((d) => d.host === host)) return setError(t.duplicate);
    setAdding(true);
    setError(null);
    try {
      const result = await onAdd(host);
      if (result && result.error) setError(result.error);
      else setValue("");
    } catch {
      setError(t.genericError);
    } finally {
      setAdding(false);
    }
  }

  async function run(fn: () => Promise<DomainsResult>) {
    setNotice(null);
    try {
      const result = await fn();
      if (result && result.error) setNotice(result.error);
    } catch {
      setNotice(t.genericError);
    }
  }

  const columns = useMemo<DataTableColumn<DomainRecord>[]>(
    () => [
      {
        id: "domain",
        header: t.cols.domain,
        label: t.cols.domain,
        sortValue: (d) => d.host,
        searchValue: (d) => d.host,
        cell: (d) => (
          <span className="flex flex-wrap items-center gap-2">
            <Globe aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <bdi dir="ltr" className="font-mono text-body-sm">
              {d.host}
            </bdi>
            {d.primary ? <Badge variant="brand">{t.primary}</Badge> : null}
          </span>
        ),
      },
      {
        id: "status",
        header: t.cols.status,
        label: t.cols.status,
        sortValue: (d) => d.check,
        cell: (d) => (
          <span className="grid gap-0.5">
            <Status tone={checkTone[d.check]}>{t.checks[d.check]}</Status>
            {d.error && d.check === "failed" ? <span className="text-caption text-nq-danger-text">{d.error}</span> : null}
          </span>
        ),
      },
      { id: "added", header: t.cols.added, label: t.cols.added, sortValue: (d) => (d.addedAt ? new Date(d.addedAt) : null), cell: (d) => (d.addedAt ? <DateTime value={d.addedAt} relative className="text-muted-foreground" /> : null), className: "max-sm:hidden", headerClassName: "max-sm:hidden" },
    ],
    [t],
  );
  const table = useDataTable({ data: [...domains], columns, getRowId: (d) => d.id });

  function actions(d: DomainRecord): DataTableRowAction[] {
    return [
      { id: "recheck", label: t.recheck, icon: RefreshCw, group: "check", disabled: d.check === "checking", onSelect: () => void run(() => onRecheck(d.id)) },
      ...(onMakePrimary && !d.primary ? [{ id: "primary", label: t.makePrimary, icon: Star, group: "check", disabled: d.check !== "verified", onSelect: () => void run(() => onMakePrimary(d.id)) }] : []),
      { id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => setRemoving(d) },
    ];
  }

  return (
    <Card data-slot="domains-manager" className={cn("w-full", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3">{t.title}</CardTitle>
          {summary.total ? <Badge variant={summary.verified === summary.total ? "success" : "warning"}>{t.summary(summary.verified, summary.total)}</Badge> : null}
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={submit} noValidate className="flex flex-wrap items-start gap-2" data-slot="domains-add">
          <Field invalid={Boolean(error)} className="min-w-56 flex-1">
            <FieldLabel className="sr-only">{t.addLabel}</FieldLabel>
            <Input ltr value={value} placeholder="shop.example.com" aria-label={t.addLabel} onChange={(e) => (setValue(e.target.value), setError(null))} />
            {error ? <FieldError match>{error}</FieldError> : <p className="mt-1 text-caption text-muted-foreground">{t.addHint}</p>}
          </Field>
          <Button type="submit" variant="primary" loading={adding}>
            <Plus aria-hidden />
            {t.add}
          </Button>
        </form>
        {cnameTarget ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-border bg-secondary/40 px-3 py-2 text-body-sm" data-slot="domains-setup">
            <span className="min-w-0 flex-1">
              <span className="text-label text-foreground">{t.setup}. </span>
              <span className="text-muted-foreground">{t.setupBody}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <bdi dir="ltr" className="font-mono text-body-sm">
                {cnameTarget}
              </bdi>
              <CopyButton value={cnameTarget} size="icon-sm" variant="ghost" label={t.copyTarget} />
            </span>
          </div>
        ) : null}
        {notice ? (
          <Alert tone="danger" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}
        <DataTable table={table} label={t.table} rowLabel={(d) => d.host} rowActions={actions} loading={loading} empty={t.empty} />
      </CardContent>

      <AlertDialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          {removing ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.removeTitle(removing.host)}</AlertDialogTitle>
                <AlertDialogDescription>{t.removeBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const id = removing.id;
                    setRemoving(null);
                    void run(() => onRemove(id));
                  }}
                >
                  {t.remove}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
