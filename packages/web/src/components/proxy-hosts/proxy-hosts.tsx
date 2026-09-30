"use client";

import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { DataTable, type DataTableColumn, type DataTableRowAction, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DomainChips } from "../domains-manager";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { isValidUpstream, parseHosts, type ProxyHostError, type TlsMode, tlsModeAllowsWebsockets, validateProxyHost } from "./proxy-format";

export { isValidUpstream, parseHosts, type ProxyHostError, type TlsMode, tlsModeAllowsWebsockets, validateProxyHost } from "./proxy-format";

const STRINGS = {
  en: {
    add: "Add proxy host",
    table: "Proxy hosts",
    search: "Search hosts",
    cols: { hosts: "Domains", upstream: "Forwards to", tls: "TLS", websockets: "WebSockets", status: "Status", enabled: "Enabled" },
    tlsModes: { off: "Off (HTTP only)", auto: "Automatic certificate", custom: "Custom certificate", passthrough: "Passthrough" } satisfies Record<TlsMode, string>,
    tlsShort: { off: "Off", auto: "Auto", custom: "Custom", passthrough: "Passthrough" } satisfies Record<TlsMode, string>,
    tlsHint: {
      off: "Traffic between visitors and the proxy is not encrypted.",
      auto: "A certificate is issued and renewed for you.",
      custom: "You upload the certificate and key on the certificates page.",
      passthrough: "Encrypted traffic goes to the upstream untouched. The upstream must hold the certificate.",
    } satisfies Record<TlsMode, string>,
    on: "On",
    off: "Off",
    states: { online: "Online", offline: "Unreachable", unknown: "Not checked" },
    edit: "Edit",
    remove: "Delete",
    empty: "No proxy hosts yet. Add one to forward a domain to an app.",
    dialogNew: "New proxy host",
    dialogEdit: "Edit proxy host",
    dialogBody: "Requests to these domains are forwarded to the upstream.",
    hosts: "Domain names",
    hostsHint: "One or more, separated by spaces, commas or new lines.",
    upstream: "Upstream address",
    upstreamHint: "Where requests are sent, like http://10.0.0.5:3000.",
    tls: "TLS",
    websockets: "WebSocket support",
    websocketsHint: "Keeps upgraded connections open. Turn on for live apps and chat.",
    enabled: "Enabled",
    errors: { hosts: "Enter valid domain names, like app.example.com.", upstream: "Enter an address like http://10.0.0.5:3000." } satisfies Record<ProxyHostError, string>,
    save: "Save proxy host",
    cancel: "Cancel",
    deleteTitle: (name: string) => `Delete the proxy host for ${name}?`,
    deleteBody: "Requests to these domains stop being forwarded. The app itself is not touched.",
    toggleFor: (name: string) => `Enable ${name}`,
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    add: "إضافة مضيف وكيل",
    table: "مضيفو الوكيل",
    search: "بحث في المضيفين",
    cols: { hosts: "النطاقات", upstream: "يُحوَّل إلى", tls: "TLS", websockets: "WebSockets", status: "الحالة", enabled: "مفعّل" },
    tlsModes: { off: "متوقف (HTTP فقط)", auto: "شهادة تلقائية", custom: "شهادة مخصصة", passthrough: "تمرير مباشر" } satisfies Record<TlsMode, string>,
    tlsShort: { off: "متوقف", auto: "تلقائي", custom: "مخصص", passthrough: "تمرير" } satisfies Record<TlsMode, string>,
    tlsHint: {
      off: "حركة الزوار نحو الوكيل غير مشفرة.",
      auto: "تُصدر الشهادة وتُجدَّد تلقائيًا.",
      custom: "ترفع الشهادة والمفتاح من صفحة الشهادات.",
      passthrough: "تصل الحركة المشفرة إلى الخادم الخلفي كما هي، ويجب أن تكون الشهادة عنده.",
    } satisfies Record<TlsMode, string>,
    on: "مفعّل",
    off: "متوقف",
    states: { online: "متصل", offline: "لا يمكن الوصول", unknown: "لم يُفحص" },
    edit: "تعديل",
    remove: "حذف",
    empty: "لا يوجد مضيفو وكيل بعد. أضف واحدًا لتحويل نطاق إلى تطبيق.",
    dialogNew: "مضيف وكيل جديد",
    dialogEdit: "تعديل مضيف الوكيل",
    dialogBody: "تُحوَّل الطلبات إلى هذه النطاقات نحو الخادم الخلفي.",
    hosts: "أسماء النطاقات",
    hostsHint: "واحد أو أكثر، تفصل بينها مسافات أو فواصل أو أسطر.",
    upstream: "عنوان الخادم الخلفي",
    upstreamHint: "الوجهة التي تُرسل إليها الطلبات مثل http://10.0.0.5:3000.",
    tls: "TLS",
    websockets: "دعم WebSocket",
    websocketsHint: "يُبقي الاتصالات المرقّاة مفتوحة. فعّله للتطبيقات الحية والدردشة.",
    enabled: "مفعّل",
    errors: { hosts: "أدخل أسماء نطاقات صحيحة مثل app.example.com.", upstream: "أدخل عنوانًا مثل http://10.0.0.5:3000." } satisfies Record<ProxyHostError, string>,
    save: "حفظ مضيف الوكيل",
    cancel: "إلغاء",
    deleteTitle: (name: string) => `حذف مضيف الوكيل لـ ${name}؟`,
    deleteBody: "يتوقف تحويل الطلبات إلى هذه النطاقات. لا يتأثر التطبيق نفسه.",
    toggleFor: (name: string) => `تفعيل ${name}`,
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

type T = typeof STRINGS.en;
export type ProxyHostsLabels = Partial<T>;
export type ProxyHostsResult = void | { error?: string };

export interface ProxyHost {
  id: string;
  /** Domain names served. The first is the main one. */
  hosts: string[];
  /** Where requests go, like `http://10.0.0.5:3000`. */
  upstream: string;
  tlsMode: TlsMode;
  websockets: boolean;
  enabled: boolean;
  status?: "online" | "offline" | "unknown";
}

export type ProxyHostInput = Omit<ProxyHost, "id" | "status">;

export interface ProxyHostsProps extends Omit<ComponentProps<"div">, "children" | "onToggle"> {
  hosts: readonly ProxyHost[];
  loading?: boolean;
  /** Create (no `id`) or update a host. Resolve `{ error }` to show it in the dialog. */
  onSave: (input: ProxyHostInput, id?: string) => Promise<ProxyHostsResult>;
  onDelete: (id: string) => Promise<ProxyHostsResult>;
  /** Flip the switch in the table. Shows the Enabled column when set. */
  onToggle?: (id: string, enabled: boolean) => Promise<ProxyHostsResult>;
  labels?: ProxyHostsLabels;
}

const statusTone = { online: "success", offline: "danger", unknown: "neutral" } as const satisfies Record<string, StatusTone>;

function HostDialog({ open, onOpenChange, host, onSave, t }: { open: boolean; onOpenChange: (o: boolean) => void; host: ProxyHost | null; onSave: ProxyHostsProps["onSave"]; t: T }) {
  const [hostsText, setHostsText] = useState("");
  const [upstream, setUpstream] = useState("");
  const [tlsMode, setTlsMode] = useState<TlsMode>("auto");
  const [websockets, setWebsockets] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setHostsText(host ? host.hosts.join("\n") : "");
    setUpstream(host?.upstream ?? "");
    setTlsMode(host?.tlsMode ?? "auto");
    setWebsockets(host?.websockets ?? false);
    setEnabled(host?.enabled ?? true);
    setTried(false);
    setError(null);
  }, [open, host]);
  const hosts = parseHosts(hostsText);
  const errors = validateProxyHost({ hosts, upstream });
  const tlsItems = (Object.keys(t.tlsModes) as TlsMode[]).map((m) => ({ value: m, label: t.tlsModes[m] }));
  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent data-slot="proxy-host-dialog">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setTried(true);
            if (errors.length) return;
            setSaving(true);
            setError(null);
            try {
              const result = await onSave({ hosts, upstream: upstream.trim(), tlsMode, websockets: tlsModeAllowsWebsockets(tlsMode) && websockets, enabled }, host?.id);
              if (result && result.error) setError(result.error);
              else onOpenChange(false);
            } catch {
              setError(t.genericError);
            } finally {
              setSaving(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{host ? t.dialogEdit : t.dialogNew}</DialogTitle>
            <DialogDescription>{t.dialogBody}</DialogDescription>
          </DialogHeader>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field invalid={tried && errors.includes("hosts")}>
            <FieldLabel>{t.hosts}</FieldLabel>
            <Textarea dir="ltr" rows={3} value={hostsText} placeholder="app.example.com" className="min-h-20 w-full rounded-control border border-input bg-card px-3 py-2 font-mono text-body-sm" onChange={(e) => setHostsText(e.target.value)} />
            {tried && errors.includes("hosts") ? <FieldError match>{t.errors.hosts}</FieldError> : <FieldDescription>{t.hostsHint}</FieldDescription>}
          </Field>
          <Field invalid={tried && errors.includes("upstream")}>
            <FieldLabel>{t.upstream}</FieldLabel>
            <Input ltr value={upstream} placeholder="http://10.0.0.5:3000" onChange={(e) => setUpstream(e.target.value)} />
            {tried && errors.includes("upstream") ? <FieldError match>{t.errors.upstream}</FieldError> : <FieldDescription>{t.upstreamHint}</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel>{t.tls}</FieldLabel>
            <Select items={tlsItems} value={tlsMode} onValueChange={(v) => v && setTlsMode(v as TlsMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tlsItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{t.tlsHint[tlsMode]}</FieldDescription>
          </Field>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p id="proxy-ws" className="text-label text-foreground">
                {t.websockets}
              </p>
              <p className="text-body-sm text-muted-foreground">{t.websocketsHint}</p>
            </div>
            <Switch aria-labelledby="proxy-ws" checked={tlsModeAllowsWebsockets(tlsMode) && websockets} disabled={!tlsModeAllowsWebsockets(tlsMode)} onCheckedChange={setWebsockets} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p id="proxy-enabled" className="text-label text-foreground">
              {t.enabled}
            </p>
            <Switch aria-labelledby="proxy-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reverse-proxy hosts: a table of domains and where they forward to, with the TLS mode, WebSocket support and an
 * enable switch, and a dialog editor (domains, upstream, TLS mode, WebSockets). Row actions open on context-click too.
 * Presentational: your callbacks talk to the proxy and you pass the updated `hosts` back.
 */
export function ProxyHosts({ hosts, loading = false, onSave, onDelete, onToggle, labels, className, ...props }: ProxyHostsProps) {
  const ar = (useOptionalNasaq()?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [editing, setEditing] = useState<ProxyHost | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProxyHost | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flipping, setFlipping] = useState<Set<string>>(new Set());

  async function toggle(h: ProxyHost, next: boolean) {
    if (!onToggle) return;
    setNotice(null);
    setFlipping((s) => new Set(s).add(h.id));
    try {
      const result = await onToggle(h.id, next);
      if (result && result.error) setNotice(result.error);
    } catch {
      setNotice(t.genericError);
    } finally {
      setFlipping((s) => {
        const n = new Set(s);
        n.delete(h.id);
        return n;
      });
    }
  }

  const columns = useMemo<DataTableColumn<ProxyHost>[]>(
    () => [
      {
        id: "hosts",
        header: t.cols.hosts,
        label: t.cols.hosts,
        sortValue: (h) => h.hosts[0],
        searchValue: (h) => `${h.hosts.join(" ")} ${h.upstream}`,
        cell: (h) => <DomainChips domains={h.hosts.map((host) => ({ id: host, host, check: "verified" as const }))} max={2} className="[&_[data-slot=badge]]:border-border [&_[data-slot=badge]]:bg-secondary [&_[data-slot=badge]]:text-foreground" />,
      },
      {
        id: "upstream",
        header: t.cols.upstream,
        label: t.cols.upstream,
        sortValue: (h) => h.upstream,
        cell: (h) => (
          <span className="inline-flex items-center gap-1.5">
            <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" />
            <bdi dir="ltr" className="font-mono text-body-sm">
              {h.upstream}
            </bdi>
          </span>
        ),
      },
      { id: "tls", header: t.cols.tls, label: t.cols.tls, sortValue: (h) => h.tlsMode, filterValue: (h) => h.tlsMode, cell: (h) => <Badge variant={h.tlsMode === "off" ? "warning" : "outline"}>{t.tlsShort[h.tlsMode]}</Badge>, className: "max-md:hidden", headerClassName: "max-md:hidden" },
      { id: "ws", header: t.cols.websockets, label: t.cols.websockets, cell: (h) => <span className="text-body-sm text-muted-foreground">{h.websockets ? t.on : t.off}</span>, className: "max-lg:hidden", headerClassName: "max-lg:hidden" },
      { id: "status", header: t.cols.status, label: t.cols.status, sortValue: (h) => h.status ?? "unknown", cell: (h) => <Status tone={statusTone[h.status ?? "unknown"]}>{t.states[h.status ?? "unknown"]}</Status> },
      ...(onToggle
        ? ([
            {
              id: "enabled",
              header: t.cols.enabled,
              label: t.cols.enabled,
              align: "end",
              cell: (h) => <Switch aria-label={t.toggleFor(h.hosts[0] ?? "")} checked={h.enabled} disabled={flipping.has(h.id)} onCheckedChange={(v) => void toggle(h, v)} />,
            },
          ] satisfies DataTableColumn<ProxyHost>[])
        : []),
    ],
    // biome-ignore lint/correctness/useExhaustiveDependencies: toggle closes over stable props
    [t, onToggle, flipping],
  );
  const table = useDataTable({ data: [...hosts], columns, getRowId: (h) => h.id });

  const actions = (h: ProxyHost): DataTableRowAction[] => [
    { id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => (setEditing(h), setOpen(true)) },
    { id: "delete", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => setDeleting(h) },
  ];

  return (
    <div data-slot="proxy-hosts" className={cn("grid w-full gap-3", className)} {...props}>
      <DataTableToolbar className="justify-between">
        <DataTableSearch table={table} placeholder={t.search} />
        <Button type="button" variant="primary" size="sm" onClick={() => (setEditing(null), setOpen(true))}>
          <Plus aria-hidden />
          {t.add}
        </Button>
      </DataTableToolbar>
      {notice ? (
        <Alert tone="danger" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}
      <DataTable table={table} label={t.table} rowLabel={(h) => h.hosts[0] ?? h.id} rowActions={actions} loading={loading} empty={t.empty} />
      <HostDialog open={open} onOpenChange={setOpen} host={editing} onSave={onSave} t={t} />
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          {deleting ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteTitle(deleting.hosts[0] ?? "")}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const id = deleting.id;
                    setDeleting(null);
                    try {
                      const result = await onDelete(id);
                      if (result && result.error) setNotice(result.error);
                    } catch {
                      setNotice(t.genericError);
                    }
                  }}
                >
                  {t.remove}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
