"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { DataTable, type DataTableColumn, type DataTableRowAction, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import {
  diffRules,
  type FirewallAction,
  type FirewallError,
  type FirewallProtocol,
  type FirewallRule,
  formatProtocolPort,
  type HttpError,
  type HttpRule,
  type HttpRuleType,
  lockoutRisk,
  type RuleState,
  rulesToApply,
  validateFirewallRule,
  validateHttpRule,
} from "./network-format";

export {
  diffRules,
  type FirewallAction,
  type FirewallError,
  type FirewallProtocol,
  type FirewallRule,
  formatProtocolPort,
  type HttpError,
  type HttpRule,
  type HttpRuleType,
  isValidCidr,
  isValidPort,
  lockoutRisk,
  type RuleDiff,
  type RuleState,
  rulesToApply,
  validateFirewallRule,
  validateHttpRule,
} from "./network-format";

const STRINGS = {
  en: {
    firewall: "Firewall",
    http: "HTTP rules",
    firewallBody: "Rules run from the top and the first match wins. Changes stay staged until you apply them.",
    httpBody: "Redirects, headers, passwords and IP limits for web requests. Changes stay staged until you apply them.",
    addRule: "Add rule",
    tableFirewall: "Firewall rules",
    tableHttp: "HTTP rules",
    emptyFirewall: "No firewall rules. All traffic follows the default policy.",
    emptyHttp: "No HTTP rules yet.",
    cols: { order: "#", action: "Action", protocol: "Protocol and port", source: "Source", note: "Note", type: "Type", path: "Path", detail: "Detail", state: "State" },
    allow: "Allow",
    deny: "Deny",
    anySource: "Any",
    protocols: { tcp: "TCP", udp: "UDP", icmp: "ICMP", any: "Any" } satisfies Record<FirewallProtocol, string>,
    httpTypes: { redirect: "Redirect", header: "Set header", "basic-auth": "Password", "ip-allow": "Allow IPs", "ip-deny": "Block IPs" } satisfies Record<HttpRuleType, string>,
    states: { unchanged: "", added: "New", changed: "Edited", removed: "Removed" } satisfies Record<RuleState, string>,
    edit: "Edit",
    moveUp: "Move up",
    moveDown: "Move down",
    remove: "Remove",
    restore: "Undo remove",
    rowActionsFor: (name: string) => `Actions for ${name}`,
    staged: (n: number) => (n === 1 ? "1 change staged" : `${n} changes staged`),
    stagedHint: "Nothing has changed on the server yet.",
    upToDate: "Everything is applied.",
    apply: "Apply changes",
    discard: "Discard",
    applied: "Changes applied.",
    lockout: "A deny rule for SSH (port 22) from any address comes before every allow rule. Applying it can lock you out.",
    ruleTitleNew: "New rule",
    ruleTitleEdit: "Edit rule",
    ruleBody: "Saved to the staged list. It only takes effect when you apply.",
    fields: {
      action: "Action",
      protocol: "Protocol",
      port: "Port",
      portHint: "A port like 443, or a range like 8000-8100.",
      source: "Source",
      sourceHint: "An IP address, a block like 10.0.0.0/24, or any.",
      note: "Note",
      type: "Rule type",
      path: "Path",
      pathHint: "Starts with a slash. Use / for the whole site.",
      target: "Redirect to",
      status: "Status code",
      name: "Header name",
      value: "Header value",
      username: "Username",
      password: "Password",
      passwordHint: "At least 8 characters. Never shown again.",
      passwordKeep: "Leave empty to keep the current password.",
      cidr: "IP address or block",
    },
    statusLabels: { 301: "301 Moved permanently", 302: "302 Found", 307: "307 Temporary redirect", 308: "308 Permanent redirect" },
    fwErrors: { port: "Enter a port from 1 to 65535, or a range.", portForProtocol: "This protocol has no port. Leave it empty.", source: "Enter an IP address, a block like 10.0.0.0/24, or any." } satisfies Record<FirewallError, string>,
    httpErrors: {
      path: "Start with a slash and use no spaces.",
      target: "Enter a full URL or a path.",
      name: "Use letters, digits and dashes.",
      value: "Enter a value.",
      username: "Enter a username.",
      password: "Use at least 8 characters.",
      cidr: "Enter an IP address or a block like 10.0.0.0/24.",
    } satisfies Record<HttpError, string>,
    save: "Save to staged",
    cancel: "Cancel",
    passwordSet: "Password set",
    genericError: "Something went wrong. Try again.",
    loading: "Loading rules",
  },
  ar: {
    firewall: "جدار الحماية",
    http: "قواعد HTTP",
    firewallBody: "تُنفَّذ القواعد من الأعلى وتنطبق أول قاعدة مطابقة. تبقى التغييرات مرحلية حتى تطبّقها.",
    httpBody: "إعادة توجيه ورؤوس وكلمات مرور وقيود عناوين لطلبات الويب. تبقى التغييرات مرحلية حتى تطبّقها.",
    addRule: "إضافة قاعدة",
    tableFirewall: "قواعد جدار الحماية",
    tableHttp: "قواعد HTTP",
    emptyFirewall: "لا توجد قواعد. تتبع كل الحركة السياسة الافتراضية.",
    emptyHttp: "لا توجد قواعد HTTP بعد.",
    cols: { order: "#", action: "الإجراء", protocol: "البروتوكول والمنفذ", source: "المصدر", note: "ملاحظة", type: "النوع", path: "المسار", detail: "التفاصيل", state: "الحالة" },
    allow: "سماح",
    deny: "رفض",
    anySource: "أي مصدر",
    protocols: { tcp: "TCP", udp: "UDP", icmp: "ICMP", any: "الكل" } satisfies Record<FirewallProtocol, string>,
    httpTypes: { redirect: "إعادة توجيه", header: "ضبط رأس", "basic-auth": "كلمة مرور", "ip-allow": "السماح لعناوين", "ip-deny": "حظر عناوين" } satisfies Record<HttpRuleType, string>,
    states: { unchanged: "", added: "جديدة", changed: "معدّلة", removed: "محذوفة" } satisfies Record<RuleState, string>,
    edit: "تعديل",
    moveUp: "نقل لأعلى",
    moveDown: "نقل لأسفل",
    remove: "إزالة",
    restore: "تراجع عن الإزالة",
    rowActionsFor: (name: string) => `إجراءات ${name}`,
    staged: (n: number) => (n === 1 ? "تغيير واحد مرحلي" : n === 2 ? "تغييران مرحليان" : n <= 10 ? `${n} تغييرات مرحلية` : `${n} تغييرًا مرحليًا`),
    stagedHint: "لم يتغير شيء على الخادم بعد.",
    upToDate: "كل شيء مطبَّق.",
    apply: "تطبيق التغييرات",
    discard: "تجاهل",
    applied: "تم تطبيق التغييرات.",
    lockout: "توجد قاعدة رفض لـ SSH (المنفذ 22) من أي عنوان قبل كل قواعد السماح. قد يؤدي تطبيقها إلى إغلاق الوصول عليك.",
    ruleTitleNew: "قاعدة جديدة",
    ruleTitleEdit: "تعديل القاعدة",
    ruleBody: "تُحفظ في القائمة المرحلية ولا تسري إلا عند التطبيق.",
    fields: {
      action: "الإجراء",
      protocol: "البروتوكول",
      port: "المنفذ",
      portHint: "منفذ مثل 443 أو نطاق مثل 8000-8100.",
      source: "المصدر",
      sourceHint: "عنوان IP أو نطاق مثل 10.0.0.0/24 أو any.",
      note: "ملاحظة",
      type: "نوع القاعدة",
      path: "المسار",
      pathHint: "يبدأ بشرطة مائلة. استخدم / للموقع كله.",
      target: "إعادة التوجيه إلى",
      status: "رمز الحالة",
      name: "اسم الرأس",
      value: "قيمة الرأس",
      username: "اسم المستخدم",
      password: "كلمة المرور",
      passwordHint: "8 أحرف على الأقل. لا تُعرض مرة أخرى.",
      passwordKeep: "اتركها فارغة للإبقاء على الحالية.",
      cidr: "عنوان IP أو نطاق",
    },
    statusLabels: { 301: "301 نقل دائم", 302: "302 موجود", 307: "307 إعادة مؤقتة", 308: "308 إعادة دائمة" },
    fwErrors: { port: "أدخل منفذًا من 1 إلى 65535 أو نطاقًا.", portForProtocol: "هذا البروتوكول بلا منفذ. اترك الحقل فارغًا.", source: "أدخل عنوان IP أو نطاقًا مثل 10.0.0.0/24 أو any." } satisfies Record<FirewallError, string>,
    httpErrors: {
      path: "ابدأ بشرطة مائلة ولا تستخدم مسافات.",
      target: "أدخل رابطًا كاملًا أو مسارًا.",
      name: "استخدم أحرفًا وأرقامًا وشرطات.",
      value: "أدخل قيمة.",
      username: "أدخل اسم مستخدم.",
      password: "استخدم 8 أحرف على الأقل.",
      cidr: "أدخل عنوان IP أو نطاقًا مثل 10.0.0.0/24.",
    } satisfies Record<HttpError, string>,
    save: "حفظ في المرحلي",
    cancel: "إلغاء",
    passwordSet: "كلمة المرور محددة",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    loading: "جارٍ تحميل القواعد",
  },
};

type T = typeof STRINGS.en;
export type NetworkRulesLabels = Partial<T>;
export type NetworkRulesResult = void | { error?: string };

export interface NetworkRulesProps extends Omit<ComponentProps<"div">, "children"> {
  /** The rules currently in force on the server, in order. */
  firewall: readonly FirewallRule[];
  /** HTTP rules in force. Leave out to hide the HTTP tab. */
  http?: readonly HttpRule[];
  loading?: boolean;
  /** Send the whole staged list. The host then passes the new `firewall` back. */
  onApplyFirewall: (rules: FirewallRule[]) => Promise<NetworkRulesResult>;
  onApplyHttp?: (rules: HttpRule[]) => Promise<NetworkRulesResult>;
  /** Which tab opens first. */
  defaultTab?: "firewall" | "http";
  labels?: NetworkRulesLabels;
}

const newId = () => `new-${Math.random().toString(36).slice(2, 9)}`;

/** Staged copy of a rule list: edits, additions, removals and reordering stay local until applied. */
function useStagedRules<R extends { id: string }>(applied: readonly R[]) {
  const [staged, setStaged] = useState<R[]>([...applied]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  useEffect(() => {
    setStaged([...applied]);
    setRemoved(new Set());
  }, [applied]);
  const diff = useMemo(() => diffRules(applied, staged, removed), [applied, staged, removed]);
  return {
    staged,
    removed,
    diff,
    upsert: (rule: R) => setStaged((s) => (s.some((r) => r.id === rule.id) ? s.map((r) => (r.id === rule.id ? rule : r)) : [...s, rule])),
    remove: (id: string) => {
      if (applied.some((r) => r.id === id)) setRemoved((s) => new Set(s).add(id));
      else setStaged((s) => s.filter((r) => r.id !== id));
    },
    restore: (id: string) =>
      setRemoved((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      }),
    move: (id: string, by: -1 | 1) =>
      setStaged((s) => {
        const i = s.findIndex((r) => r.id === id);
        const j = i + by;
        if (i < 0 || j < 0 || j >= s.length) return s;
        const n = [...s];
        [n[i], n[j]] = [n[j] as R, n[i] as R];
        return n;
      }),
    discard: () => {
      setStaged([...applied]);
      setRemoved(new Set());
    },
  };
}

type Row<R> = { id: string; rule: R; state: RuleState; index: number };

function StateBadge({ state, t }: { state: RuleState; t: T }) {
  if (state === "unchanged") return null;
  return <Badge variant={state === "removed" ? "danger" : state === "added" ? "success" : "info"}>{t.states[state]}</Badge>;
}

function ApplyBar({ count, applying, onApply, onDiscard, t, warning }: { count: number; applying: boolean; onApply: () => void; onDiscard: () => void; t: T; warning?: string | null }) {
  return (
    <div data-slot="network-rules-apply" data-dirty={count > 0 || undefined} className={cn("flex flex-wrap items-center gap-3 rounded-control border px-3 py-2", count > 0 ? "border-nq-warning/40 bg-nq-warning-soft" : "border-border bg-card")}>
      <div className="min-w-0 flex-1">
        <p className="text-label text-foreground" role="status">
          {count > 0 ? t.staged(count) : t.upToDate}
        </p>
        {count > 0 ? <p className="text-body-sm text-muted-foreground">{warning ?? t.stagedHint}</p> : null}
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={count === 0 || applying} onClick={onDiscard}>
        {t.discard}
      </Button>
      <Button type="button" variant="primary" size="sm" disabled={count === 0} loading={applying} onClick={onApply}>
        {t.apply}
      </Button>
    </div>
  );
}

function SelectField<V extends string>({ label, value, onChange, items, disabled }: { label: string; value: V; onChange: (v: V) => void; items: { value: V; label: string }[]; disabled?: boolean }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select items={items} value={value} disabled={disabled} onValueChange={(v) => v && onChange(v as V)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function FirewallDialog({ open, onOpenChange, rule, onSave, t }: { open: boolean; onOpenChange: (o: boolean) => void; rule: FirewallRule | null; onSave: (r: FirewallRule) => void; t: T }) {
  const blank: FirewallRule = { id: "", action: "allow", protocol: "tcp", port: "", source: "any" };
  const [draft, setDraft] = useState<FirewallRule>(rule ?? blank);
  const [tried, setTried] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the dialog opens
  useEffect(() => {
    if (open) {
      setDraft(rule ?? blank);
      setTried(false);
    }
  }, [open, rule]);
  const errors = validateFirewallRule(draft);
  const hasPort = draft.protocol === "tcp" || draft.protocol === "udp";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="network-rule-dialog">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (errors.length) return;
            onSave({ ...draft, id: rule?.id ?? newId(), port: hasPort ? draft.port.trim() : "", source: draft.source.trim().toLowerCase() === "any" ? "any" : draft.source.trim() });
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>{rule ? t.ruleTitleEdit : t.ruleTitleNew}</DialogTitle>
            <DialogDescription>{t.ruleBody}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t.fields.action} value={draft.action} onChange={(v) => setDraft((d) => ({ ...d, action: v }))} items={[{ value: "allow", label: t.allow }, { value: "deny", label: t.deny }]} />
            <SelectField
              label={t.fields.protocol}
              value={draft.protocol}
              onChange={(v) => setDraft((d) => ({ ...d, protocol: v, port: v === "tcp" || v === "udp" ? d.port : "" }))}
              items={(["tcp", "udp", "icmp", "any"] as const).map((p) => ({ value: p, label: t.protocols[p] }))}
            />
          </div>
          <Field invalid={tried && errors.some((e) => e === "port" || e === "portForProtocol")}>
            <FieldLabel>{t.fields.port}</FieldLabel>
            <Input ltr value={draft.port} disabled={!hasPort} placeholder={hasPort ? "443" : ""} onChange={(e) => setDraft((d) => ({ ...d, port: e.target.value }))} />
            {tried && errors.includes("port") ? <FieldError match>{t.fwErrors.port}</FieldError> : <FieldDescription>{t.fields.portHint}</FieldDescription>}
          </Field>
          <Field invalid={tried && errors.includes("source")}>
            <FieldLabel>{t.fields.source}</FieldLabel>
            <Input ltr value={draft.source} placeholder="any" onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))} />
            {tried && errors.includes("source") ? <FieldError match>{t.fwErrors.source}</FieldError> : <FieldDescription>{t.fields.sourceHint}</FieldDescription>}
          </Field>
          <Field>
            <FieldLabel>{t.fields.note}</FieldLabel>
            <Input dir="auto" value={draft.note ?? ""} maxLength={80} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HttpDialog({ open, onOpenChange, rule, onSave, t }: { open: boolean; onOpenChange: (o: boolean) => void; rule: HttpRule | null; onSave: (r: HttpRule) => void; t: T }) {
  const blank: HttpRule = { id: "", type: "redirect", path: "/", status: 301 };
  const [draft, setDraft] = useState<HttpRule>(rule ?? blank);
  const [tried, setTried] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the dialog opens
  useEffect(() => {
    if (open) {
      setDraft(rule ?? blank);
      setTried(false);
    }
  }, [open, rule]);
  const errors = validateHttpRule(draft, { requirePassword: draft.type === "basic-auth" && !rule });
  const bad = (k: HttpError) => tried && errors.includes(k);
  const set = (patch: Partial<HttpRule>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="network-rule-dialog">
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (errors.length) return;
            onSave({ ...draft, id: rule?.id ?? newId() });
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>{rule ? t.ruleTitleEdit : t.ruleTitleNew}</DialogTitle>
            <DialogDescription>{t.ruleBody}</DialogDescription>
          </DialogHeader>
          <SelectField label={t.fields.type} value={draft.type} onChange={(v) => setDraft({ id: draft.id, type: v, path: draft.path, status: v === "redirect" ? 301 : undefined })} items={(Object.keys(t.httpTypes) as HttpRuleType[]).map((k) => ({ value: k, label: t.httpTypes[k] }))} />
          <Field invalid={bad("path")}>
            <FieldLabel>{t.fields.path}</FieldLabel>
            <Input ltr value={draft.path} onChange={(e) => set({ path: e.target.value })} />
            {bad("path") ? <FieldError match>{t.httpErrors.path}</FieldError> : <FieldDescription>{t.fields.pathHint}</FieldDescription>}
          </Field>
          {draft.type === "redirect" ? (
            <>
              <Field invalid={bad("target")}>
                <FieldLabel>{t.fields.target}</FieldLabel>
                <Input ltr value={draft.target ?? ""} placeholder="https://example.com/new" onChange={(e) => set({ target: e.target.value })} />
                {bad("target") ? <FieldError match>{t.httpErrors.target}</FieldError> : null}
              </Field>
              <SelectField label={t.fields.status} value={String(draft.status ?? 301) as "301"} onChange={(v) => set({ status: Number(v) as 301 })} items={([301, 302, 307, 308] as const).map((c) => ({ value: String(c) as "301", label: t.statusLabels[c] }))} />
            </>
          ) : null}
          {draft.type === "header" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field invalid={bad("name")}>
                <FieldLabel>{t.fields.name}</FieldLabel>
                <Input ltr value={draft.name ?? ""} placeholder="X-Frame-Options" onChange={(e) => set({ name: e.target.value })} />
                {bad("name") ? <FieldError match>{t.httpErrors.name}</FieldError> : null}
              </Field>
              <Field invalid={bad("value")}>
                <FieldLabel>{t.fields.value}</FieldLabel>
                <Input ltr value={draft.value ?? ""} placeholder="DENY" onChange={(e) => set({ value: e.target.value })} />
                {bad("value") ? <FieldError match>{t.httpErrors.value}</FieldError> : null}
              </Field>
            </div>
          ) : null}
          {draft.type === "basic-auth" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field invalid={bad("username")}>
                <FieldLabel>{t.fields.username}</FieldLabel>
                <Input ltr autoComplete="off" value={draft.username ?? ""} onChange={(e) => set({ username: e.target.value })} />
                {bad("username") ? <FieldError match>{t.httpErrors.username}</FieldError> : null}
              </Field>
              <Field invalid={bad("password")}>
                <FieldLabel>{t.fields.password}</FieldLabel>
                <Input ltr type="password" autoComplete="new-password" value={draft.password ?? ""} onChange={(e) => set({ password: e.target.value })} />
                {bad("password") ? <FieldError match>{t.httpErrors.password}</FieldError> : <FieldDescription>{rule ? t.fields.passwordKeep : t.fields.passwordHint}</FieldDescription>}
              </Field>
            </div>
          ) : null}
          {draft.type === "ip-allow" || draft.type === "ip-deny" ? (
            <Field invalid={bad("cidr")}>
              <FieldLabel>{t.fields.cidr}</FieldLabel>
              <Input ltr value={draft.cidr ?? ""} placeholder="203.0.113.0/24" onChange={(e) => set({ cidr: e.target.value })} />
              {bad("cidr") ? <FieldError match>{t.httpErrors.cidr}</FieldError> : null}
            </Field>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary">
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const strike = (state: RuleState) => (state === "removed" ? "line-through opacity-60" : undefined);

function httpDetail(r: HttpRule, t: T): string {
  switch (r.type) {
    case "redirect":
      return `${r.status ?? 301} → ${r.target ?? ""}`;
    case "header":
      return `${r.name ?? ""}: ${r.value ?? ""}`;
    case "basic-auth":
      return r.username ?? "";
    default:
      return r.cidr ?? t.anySource;
  }
}

function FirewallPanel({ applied, onApply, loading, t }: { applied: readonly FirewallRule[]; onApply: NetworkRulesProps["onApplyFirewall"]; loading: boolean; t: T }) {
  const s = useStagedRules(applied);
  const [editing, setEditing] = useState<FirewallRule | null>(null);
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const rows: Row<FirewallRule>[] = s.staged.map((rule, index) => ({ id: rule.id, rule, index, state: s.diff.states.get(rule.id) ?? "added" }));
  const risk = lockoutRisk(rulesToApply(s.staged, s.removed));

  const columns: DataTableColumn<Row<FirewallRule>>[] = [
    { id: "order", header: t.cols.order, cell: (r) => <bdi className={cn("tabular-nums text-muted-foreground", strike(r.state))}>{r.index + 1}</bdi>, className: "w-10" },
    {
      id: "action",
      header: t.cols.action,
      label: t.cols.action,
      cell: (r) => (
        <Badge variant={r.rule.action === "allow" ? "success" : "danger"} className={strike(r.state)}>
          {r.rule.action === "allow" ? t.allow : t.deny}
        </Badge>
      ),
    },
    { id: "protocol", header: t.cols.protocol, label: t.cols.protocol, cell: (r) => <bdi dir="ltr" className={cn("font-mono text-body-sm", strike(r.state))}>{formatProtocolPort(r.rule)}</bdi>, searchValue: (r) => formatProtocolPort(r.rule) },
    { id: "source", header: t.cols.source, label: t.cols.source, cell: (r) => <bdi dir="ltr" className={cn("font-mono text-body-sm", strike(r.state))}>{r.rule.source === "any" ? t.anySource : r.rule.source}</bdi>, searchValue: (r) => r.rule.source },
    { id: "note", header: t.cols.note, label: t.cols.note, cell: (r) => <span dir="auto" className={cn("text-muted-foreground", strike(r.state))}>{r.rule.note}</span>, searchValue: (r) => r.rule.note ?? "", className: "max-sm:hidden", headerClassName: "max-sm:hidden" },
    { id: "state", header: t.cols.state, label: t.cols.state, cell: (r) => <StateBadge state={r.state} t={t} /> },
  ];
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id });
  const nameOf = (r: Row<FirewallRule>) => `${r.rule.action === "allow" ? t.allow : t.deny} ${formatProtocolPort(r.rule)} ${r.rule.source}`;

  function actions(r: Row<FirewallRule>): DataTableRowAction[] {
    if (r.state === "removed") return [{ id: "restore", label: t.restore, icon: RotateCcw, onSelect: () => s.restore(r.id) }];
    return [
      { id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => (setEditing(r.rule), setOpen(true)) },
      { id: "up", label: t.moveUp, icon: ArrowUp, group: "order", disabled: r.index === 0, onSelect: () => s.move(r.id, -1) },
      { id: "down", label: t.moveDown, icon: ArrowDown, group: "order", disabled: r.index === rows.length - 1, onSelect: () => s.move(r.id, 1) },
      { id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => s.remove(r.id) },
    ];
  }

  async function apply() {
    setApplying(true);
    setMessage(null);
    try {
      const result = await onApply(rulesToApply(s.staged, s.removed));
      setMessage(result && result.error ? { tone: "danger", text: result.error } : { tone: "success", text: t.applied });
    } catch {
      setMessage({ tone: "danger", text: t.genericError });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">{t.firewallBody}</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => (setEditing(null), setOpen(true))}>
          <Plus aria-hidden />
          {t.addRule}
        </Button>
      </div>
      {risk ? <Alert tone="warning">{t.lockout}</Alert> : null}
      {message ? (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}
      <DataTable table={table} label={t.tableFirewall} rowLabel={nameOf} rowActions={actions} loading={loading} empty={t.emptyFirewall} />
      <ApplyBar count={s.diff.count} applying={applying} onApply={apply} onDiscard={s.discard} t={t} warning={risk ? t.lockout : null} />
      <FirewallDialog open={open} onOpenChange={setOpen} rule={editing} onSave={s.upsert} t={t} />
    </div>
  );
}

function HttpPanel({ applied, onApply, loading, t }: { applied: readonly HttpRule[]; onApply: NonNullable<NetworkRulesProps["onApplyHttp"]>; loading: boolean; t: T }) {
  const s = useStagedRules(applied);
  const [editing, setEditing] = useState<HttpRule | null>(null);
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const rows: Row<HttpRule>[] = s.staged.map((rule, index) => ({ id: rule.id, rule, index, state: s.diff.states.get(rule.id) ?? "added" }));

  const columns: DataTableColumn<Row<HttpRule>>[] = [
    { id: "type", header: t.cols.type, label: t.cols.type, cell: (r) => <Badge variant={r.rule.type === "ip-deny" ? "danger" : r.rule.type === "ip-allow" ? "success" : "neutral"} className={strike(r.state)}>{t.httpTypes[r.rule.type]}</Badge>, sortValue: (r) => r.rule.type, filterValue: (r) => r.rule.type },
    { id: "path", header: t.cols.path, label: t.cols.path, cell: (r) => <bdi dir="ltr" className={cn("font-mono text-body-sm", strike(r.state))}>{r.rule.path}</bdi>, searchValue: (r) => r.rule.path },
    { id: "detail", header: t.cols.detail, label: t.cols.detail, cell: (r) => <bdi dir="ltr" className={cn("break-all font-mono text-body-sm text-muted-foreground", strike(r.state))}>{httpDetail(r.rule, t)}</bdi>, searchValue: (r) => httpDetail(r.rule, t) },
    { id: "state", header: t.cols.state, label: t.cols.state, cell: (r) => <StateBadge state={r.state} t={t} /> },
  ];
  const table = useDataTable({ data: rows, columns, getRowId: (r) => r.id });

  function actions(r: Row<HttpRule>): DataTableRowAction[] {
    if (r.state === "removed") return [{ id: "restore", label: t.restore, icon: RotateCcw, onSelect: () => s.restore(r.id) }];
    return [
      { id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => (setEditing(r.rule), setOpen(true)) },
      { id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => s.remove(r.id) },
    ];
  }

  async function apply() {
    setApplying(true);
    setMessage(null);
    try {
      // The password is write-only: send it only when it was typed in this session.
      const result = await onApply(rulesToApply(s.staged, s.removed));
      setMessage(result && result.error ? { tone: "danger", text: result.error } : { tone: "success", text: t.applied });
    } catch {
      setMessage({ tone: "danger", text: t.genericError });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 flex-1 text-body-sm text-muted-foreground">{t.httpBody}</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => (setEditing(null), setOpen(true))}>
          <Plus aria-hidden />
          {t.addRule}
        </Button>
      </div>
      {message ? (
        <Alert tone={message.tone} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}
      <DataTable table={table} label={t.tableHttp} rowLabel={(r) => `${t.httpTypes[r.rule.type]} ${r.rule.path}`} rowActions={actions} loading={loading} empty={t.emptyHttp} />
      <ApplyBar count={s.diff.count} applying={applying} onApply={apply} onDiscard={s.discard} t={t} />
      <HttpDialog open={open} onOpenChange={setOpen} rule={editing} onSave={s.upsert} t={t} />
    </div>
  );
}

/**
 * A network rules editor in two tabs: firewall rules (allow or deny, protocol, port, source, ordered, first match
 * wins) and HTTP rules (redirects, headers, basic auth, IP allow and block). Every edit is staged locally, marked
 * New, Edited or Removed, and only sent when the user presses Apply. Row actions also open on context-click.
 */
export function NetworkRules({ firewall, http, loading = false, onApplyFirewall, onApplyHttp, defaultTab = "firewall", labels, className, ...props }: NetworkRulesProps) {
  const nasaq = useOptionalNasaq();
  const ar = (nasaq?.locale ?? "en").startsWith("ar");
  const t: T = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  return (
    <div data-slot="network-rules" className={cn("w-full", className)} {...props}>
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="underline" aria-label={t.firewall}>
          <TabsTab value="firewall">{t.firewall}</TabsTab>
          {http && onApplyHttp ? <TabsTab value="http">{t.http}</TabsTab> : null}
        </TabsList>
        <TabsPanel value="firewall" className="pt-4">
          <FirewallPanel applied={firewall} onApply={onApplyFirewall} loading={loading} t={t} />
        </TabsPanel>
        {http && onApplyHttp ? (
          <TabsPanel value="http" className="pt-4">
            <HttpPanel applied={http} onApply={onApplyHttp} loading={loading} t={t} />
          </TabsPanel>
        ) : null}
      </Tabs>
    </div>
  );
}
