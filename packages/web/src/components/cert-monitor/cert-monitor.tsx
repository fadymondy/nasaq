"use client";

import { Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Field, FieldError, Input } from "../field";
import { DateTime } from "../numeric";
import {
  byExpiry,
  type CertStatus,
  type CertThresholds,
  type CertTone,
  certStatus,
  certTone,
  DEFAULT_THRESHOLDS,
  certDaysLeft,
  isValidCertHost,
  summarizeCerts,
} from "./cert-format";

export { byExpiry, type CertStatus, type CertThresholds, type CertTone, certStatus, certTone, DEFAULT_THRESHOLDS, certDaysLeft, isValidCertHost, summarizeCerts } from "./cert-format";

const STRINGS = {
  en: {
    title: "TLS certificates",
    description: "When each certificate expires, so none lapses unnoticed.",
    table: "Certificates",
    search: "Search hosts",
    host: "Host",
    issuer: "Issuer",
    expires: "Expires",
    left: "Days left",
    status: { valid: "Valid", expiring: "Expiring soon", critical: "Expires very soon", expired: "Expired", error: "Check failed" } satisfies Record<CertStatus, string>,
    leftLabel: (d: number | null) => (d === null ? "Unknown" : d < 0 ? `Expired ${-d} d ago` : d === 0 ? "Today" : `${d} d`),
    leftAria: (host: string, d: number | null) => (d === null ? `${host}: could not be checked` : d < 0 ? `${host}: expired ${-d} days ago` : `${host}: ${d} days left`),
    autoRenew: "Auto renew",
    manual: "Manual",
    recheck: "Check again",
    renew: "Renew now",
    remove: "Stop monitoring",
    removeTitle: (h: string) => `Stop monitoring ${h}?`,
    removeBody: "The certificate itself is not touched. You just stop getting alerts about it.",
    cancel: "Cancel",
    add: "Add host",
    addLabel: "Host to monitor",
    invalid: "Enter a hostname like app.example.com.",
    empty: "No certificates monitored yet. Add a host to check its TLS certificate.",
    summary: (n: number, e: number) => `${n} monitored, ${e} need attention`,
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    title: "شهادات TLS",
    description: "موعد انتهاء كل شهادة، حتى لا تنتهي دون أن يلاحظ أحد.",
    table: "الشهادات",
    search: "بحث في المضيفين",
    host: "المضيف",
    issuer: "الجهة المصدرة",
    expires: "تنتهي",
    left: "الأيام المتبقية",
    status: { valid: "صالحة", expiring: "تنتهي قريبًا", critical: "تنتهي خلال أيام", expired: "منتهية", error: "فشل الفحص" } satisfies Record<CertStatus, string>,
    leftLabel: (d: number | null) => (d === null ? "غير معروف" : d < 0 ? `منتهية منذ ${-d} ي` : d === 0 ? "اليوم" : `${d} ي`),
    leftAria: (host: string, d: number | null) => (d === null ? `${host}: تعذّر الفحص` : d < 0 ? `${host}: منتهية منذ ${-d} يومًا` : `${host}: متبقٍ ${d} يومًا`),
    autoRenew: "تجديد تلقائي",
    manual: "يدوي",
    recheck: "افحص مجددًا",
    renew: "جدّد الآن",
    remove: "إيقاف المراقبة",
    removeTitle: (h: string) => `إيقاف مراقبة ${h}؟`,
    removeBody: "لا تتأثر الشهادة نفسها. فقط تتوقف التنبيهات الخاصة بها.",
    cancel: "إلغاء",
    add: "إضافة مضيف",
    addLabel: "المضيف المراد مراقبته",
    invalid: "أدخل اسم مضيف مثل app.example.com.",
    empty: "لا توجد شهادات مراقبة بعد. أضف مضيفًا لفحص شهادة TLS الخاصة به.",
    summary: (n: number, e: number) => `${n} مراقبة، ${e} تحتاج انتباهًا`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};
type T = typeof STRINGS.en;
export type CertMonitorLabels = Partial<T>;
export type CertResult = void | { error?: string };

export interface CertificateRecord {
  id: string;
  host: string;
  issuer?: string;
  validTo?: Date | number | string;
  autoRenew?: boolean;
  /** Set when the last check could not reach or read the certificate. */
  error?: string;
}

const toneVariant: Record<CertTone, "success" | "warning" | "danger" | "neutral"> = { success: "success", warning: "warning", danger: "danger", neutral: "neutral" };

export interface DaysLeftBadgeProps extends Omit<ComponentProps<typeof Badge>, "children"> {
  days: number | null;
  host?: string;
  thresholds?: CertThresholds;
  labels?: CertMonitorLabels;
}

/** The days-left figure as a badge: green above 30 days, amber at 30 or fewer, red at 7 or fewer or expired. Colour is backed by the text. */
export function DaysLeftBadge({ days, host = "", thresholds, labels, ...props }: DaysLeftBadgeProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const status = certStatus(days, thresholds);
  return (
    <Badge data-slot="days-left-badge" data-status={status} variant={toneVariant[certTone(status)]} aria-label={t.leftAria(host, days)} {...props}>
      {t.leftLabel(days)}
    </Badge>
  );
}

export interface CertificateMonitorProps extends Omit<ComponentProps<typeof Card>, "children"> {
  certificates: readonly CertificateRecord[];
  loading?: boolean;
  thresholds?: CertThresholds;
  /** Override the clock, for tests and stories. */
  now?: Date | number;
  onAdd?: (host: string) => Promise<CertResult>;
  onRecheck?: (id: string) => Promise<CertResult>;
  /** Shows Renew now for certificates that are not auto-renewing. */
  onRenew?: (id: string) => Promise<CertResult>;
  onRemove?: (id: string) => Promise<CertResult>;
  labels?: CertMonitorLabels;
}

/** Table of monitored TLS certificates with issuer, expiry date and a days-left badge, soonest first by default. Row actions: check again, renew, stop monitoring. */
export function CertificateMonitor({ certificates, loading = false, thresholds = DEFAULT_THRESHOLDS, now, onAdd, onRecheck, onRenew, onRemove, labels, className, ...props }: CertificateMonitorProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [host, setHost] = useState("");
  const [tried, setTried] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [removing, setRemoving] = useState<CertificateRecord | null>(null);

  const clock = now ?? Date.now();
  const rows = useMemo(
    () => certificates.map((c) => ({ ...c, days: c.error || !c.validTo ? null : certDaysLeft(c.validTo, clock) })).sort((a, b) => byExpiry(a.days, b.days)),
    [certificates, clock],
  );
  type Row = (typeof rows)[number];
  const summary = summarizeCerts(rows.map((r) => r.days), thresholds);

  async function run(fn: () => Promise<CertResult>) {
    setNotice(null);
    try {
      const r = await fn();
      if (r && r.error) setNotice(r.error);
    } catch {
      setNotice(t.genericError);
    }
  }

  const columns = useMemo<DataTableColumn<Row>[]>(
    () => [
      { id: "host", header: t.host, label: t.host, sortValue: (r) => r.host, searchValue: (r) => `${r.host} ${r.issuer ?? ""}`, cell: (r) => <bdi dir="ltr" className="font-mono text-body-sm text-foreground">{r.host}</bdi> },
      { id: "issuer", header: t.issuer, label: t.issuer, sortValue: (r) => r.issuer, cell: (r) => <span className="text-body-sm text-muted-foreground">{r.issuer ?? "–"}</span>, className: "max-md:hidden", headerClassName: "max-md:hidden" },
      { id: "expires", header: t.expires, label: t.expires, sortValue: (r) => (r.validTo ? new Date(r.validTo) : null), cell: (r) => (r.validTo && !r.error ? <DateTime value={r.validTo} className="text-body-sm text-muted-foreground" /> : <span className="text-body-sm text-nq-danger">{r.error ?? "–"}</span>), className: "max-lg:hidden", headerClassName: "max-lg:hidden" },
      { id: "renew", header: t.autoRenew, label: t.autoRenew, cell: (r) => <Badge variant="outline">{r.autoRenew ? t.autoRenew : t.manual}</Badge>, className: "max-lg:hidden", headerClassName: "max-lg:hidden" },
      { id: "days", header: t.left, label: t.left, sortValue: (r) => r.days ?? Infinity, filterValue: (r) => certStatus(r.days, thresholds), cell: (r) => <DaysLeftBadge days={r.days} host={r.host} thresholds={thresholds} labels={labels} />, align: "end" },
    ],
    [t, thresholds, labels],
  );
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id });

  function actions(r: Row): DataTableRowAction[] {
    return [
      ...(onRecheck ? [{ id: "recheck", label: t.recheck, icon: RefreshCw, group: "run", onSelect: () => void run(() => onRecheck(r.id)) }] : []),
      ...(onRenew && !r.autoRenew ? [{ id: "renew", label: t.renew, icon: ShieldCheck, group: "run", onSelect: () => void run(() => onRenew(r.id)) }] : []),
      ...(onRemove ? [{ id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => setRemoving(r) }] : []),
    ];
  }

  const hostBad = tried && !isValidCertHost(host);
  const attention = summary.expiring + summary.critical + summary.expired + summary.error;

  return (
    <Card data-slot="certificate-monitor" className={cn("w-full", className)} {...props}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle as="h3" className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4 text-muted-foreground" />
            {t.title}
          </CardTitle>
          <Badge variant={attention ? "warning" : "success"}>
            {t.summary(summary.total, attention)}
          </Badge>
        </div>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <DataTableToolbar className="justify-between">
          <DataTableSearch table={table} placeholder={t.search} />
          {onAdd ? (
            <form
              className="flex items-start gap-2"
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                setTried(true);
                if (!isValidCertHost(host)) return;
                setAdding(true);
                await run(() => onAdd(host.trim().toLowerCase()));
                setAdding(false);
                setHost("");
                setTried(false);
              }}
            >
              <Field invalid={hostBad}>
                <Input ltr aria-label={t.addLabel} placeholder="app.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
                {hostBad ? <FieldError match>{t.invalid}</FieldError> : null}
              </Field>
              <Button type="submit" variant="primary" loading={adding}>
                <Plus aria-hidden />
                {t.add}
              </Button>
            </form>
          ) : null}
        </DataTableToolbar>
        {notice ? (
          <Alert tone="danger" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}
        <DataTable table={table} label={t.table} rowLabel={(r) => r.host} rowActions={actions} loading={loading} empty={t.empty} />
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
                    if (onRemove) void run(() => onRemove(id));
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
