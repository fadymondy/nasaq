"use client";

import { Check as CheckIcon, Copy as CopyIcon, Eye, EyeOff, KeyRound, Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
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
import { Badge, type BadgeProps } from "../badge";
import { Button } from "../button";
import { copyText } from "../copy-button";
import { DataTable, type DataTableColumn, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel, Input, Textarea } from "../field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../input-group";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, LoadingState } from "../states";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { daysUntil, type ExpiryState, expiryState, groupSecrets, matchesSecret, VAULT_MASK } from "./vault-format";

export { daysUntil, type ExpiryState, expiryState, groupSecrets, matchesSecret, VAULT_MASK } from "./vault-format";

const STRINGS = {
  en: {
    title: "Vault",
    description: "Secrets stay hidden until someone with access reveals them. Every reveal and copy is logged.",
    secrets: "Secrets",
    accessLog: "Access log",
    add: "Add secret",
    filter: "Filter secrets",
    count: (n: number) => (n === 1 ? "1 secret" : `${n} secrets`),
    ungrouped: "Ungrouped",
    noMatch: "No secrets match your filter.",
    emptyTitle: "The vault is empty",
    emptyBody: "Store API keys, passwords and certificates here instead of in chat or files.",
    loading: "Loading secrets",
    reveal: (name: string) => `Reveal ${name}`,
    hide: (name: string) => `Hide ${name}`,
    copy: (name: string) => `Copy ${name}`,
    copied: "Copied to clipboard",
    copyFailed: "Could not copy",
    edit: (name: string) => `Edit ${name}`,
    remove: (name: string) => `Delete ${name}`,
    hidden: "Value hidden",
    autoHide: (s: number) => `Hides again in ${s} seconds`,
    updated: "Updated",
    lastUsed: "Last used",
    never: "never",
    expires: "Expires",
    expired: "Expired",
    expiresIn: (d: number) => (d === 1 ? "Expires in 1 day" : `Expires in ${d} days`),
    revealFailed: "Could not fetch the value.",
    kind: {
      "api-key": "API key",
      password: "Password",
      token: "Token",
      certificate: "Certificate",
      "ssh-key": "SSH key",
      other: "Secret",
    },
    // dialog
    addTitle: "Add secret",
    editTitle: (name: string) => `Edit ${name}`,
    nameLabel: "Name",
    nameEmpty: "Enter a name.",
    nameDuplicate: "A secret with this name already exists in this group.",
    groupLabel: "Group",
    groupHint: "Secrets with the same group are listed together, like a project or a service.",
    kindLabel: "Type",
    valueLabel: "Value",
    valueKeep: "Leave blank to keep the current value.",
    valueEmpty: "Enter the value.",
    showValue: "Show value",
    noteLabel: "Note (optional)",
    expiryLabel: "Expires on (optional)",
    save: "Save",
    cancel: "Cancel",
    genericError: "Something went wrong. Try again.",
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: "The value is removed from the vault for everyone. Anything still using it will stop working.",
    deleteConfirm: "Delete",
    // log
    logTable: "Access log",
    logSearch: "Search the log",
    logEmpty: "Nothing has been accessed yet",
    time: "When",
    actor: "Who",
    action: "Action",
    secret: "Secret",
    address: "Address",
    actions: {
      reveal: "Revealed",
      copy: "Copied",
      create: "Created",
      update: "Updated",
      delete: "Deleted",
    },
  },
  ar: {
    title: "الخزنة",
    description: "تبقى الأسرار مخفية إلى أن يكشفها من يملك الصلاحية. يُسجَّل كل كشف ونسخ.",
    secrets: "الأسرار",
    accessLog: "سجل الوصول",
    add: "إضافة سر",
    filter: "تصفية الأسرار",
    count: (n: number) => (n === 1 ? "سر واحد" : n === 2 ? "سران" : n >= 3 && n <= 10 ? `${n} أسرار` : `${n} سرًّا`),
    ungrouped: "بلا مجموعة",
    noMatch: "لا توجد أسرار تطابق التصفية.",
    emptyTitle: "الخزنة فارغة",
    emptyBody: "احفظ مفاتيح الواجهات وكلمات المرور والشهادات هنا بدلًا من المحادثات والملفات.",
    loading: "جارٍ تحميل الأسرار",
    reveal: (name: string) => `كشف ${name}`,
    hide: (name: string) => `إخفاء ${name}`,
    copy: (name: string) => `نسخ ${name}`,
    copied: "تم النسخ",
    copyFailed: "تعذر النسخ",
    edit: (name: string) => `تعديل ${name}`,
    remove: (name: string) => `حذف ${name}`,
    hidden: "القيمة مخفية",
    autoHide: (s: number) => `تُخفى مجددًا بعد ${s} ثانية`,
    updated: "آخر تحديث",
    lastUsed: "آخر استخدام",
    never: "أبدًا",
    expires: "ينتهي",
    expired: "منتهي الصلاحية",
    expiresIn: (d: number) => (d === 1 ? "ينتهي خلال يوم" : d === 2 ? "ينتهي خلال يومين" : d >= 3 && d <= 10 ? `ينتهي خلال ${d} أيام` : `ينتهي خلال ${d} يومًا`),
    revealFailed: "تعذر جلب القيمة.",
    kind: {
      "api-key": "مفتاح API",
      password: "كلمة مرور",
      token: "رمز وصول",
      certificate: "شهادة",
      "ssh-key": "مفتاح SSH",
      other: "سر",
    },
    addTitle: "إضافة سر",
    editTitle: (name: string) => `تعديل ${name}`,
    nameLabel: "الاسم",
    nameEmpty: "أدخل اسمًا.",
    nameDuplicate: "يوجد سر بهذا الاسم في المجموعة نفسها.",
    groupLabel: "المجموعة",
    groupHint: "تُعرض الأسرار ذات المجموعة نفسها معًا، مثل مشروع أو خدمة.",
    kindLabel: "النوع",
    valueLabel: "القيمة",
    valueKeep: "اتركها فارغة للإبقاء على القيمة الحالية.",
    valueEmpty: "أدخل القيمة.",
    showValue: "إظهار القيمة",
    noteLabel: "ملاحظة (اختياري)",
    expiryLabel: "تاريخ الانتهاء (اختياري)",
    save: "حفظ",
    cancel: "إلغاء",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBody: "تُزال القيمة من الخزنة للجميع، وسيتوقف أي شيء لا يزال يستخدمها عن العمل.",
    deleteConfirm: "حذف",
    logTable: "سجل الوصول",
    logSearch: "ابحث في السجل",
    logEmpty: "لم يُصل إلى أي سر بعد",
    time: "الوقت",
    actor: "من",
    action: "الإجراء",
    secret: "السر",
    address: "العنوان",
    actions: {
      reveal: "كشف",
      copy: "نسخ",
      create: "إنشاء",
      update: "تحديث",
      delete: "حذف",
    },
  },
};

export type VaultLabels = { [K in keyof typeof STRINGS.en]: (typeof STRINGS.en)[K] };

function useLabels(labels?: Partial<VaultLabels>): { t: VaultLabels; ar: boolean; locale: string } {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...(STRINGS[ar ? "ar" : "en"] as VaultLabels), ...labels }, ar, locale };
}

export type VaultSecretKind = "api-key" | "password" | "token" | "certificate" | "ssh-key" | "other";
export type VaultAccessAction = "reveal" | "copy" | "create" | "update" | "delete";

export interface VaultSecret {
  id: string;
  name: string;
  /** Secrets with the same group are listed together. Blank goes under "Ungrouped". */
  group: string;
  kind?: VaultSecretKind;
  description?: string;
  /** A safe hint such as the last four characters, shown next to the mask. Never the value. */
  hint?: string;
  updatedAt: Date | number | string;
  expiresAt?: Date | number | string;
  lastAccessedAt?: Date | number | string;
}

export interface VaultAccessEvent {
  id: string;
  secretName: string;
  actor: string;
  action: VaultAccessAction;
  at: Date | number | string;
  /** IP address or device, shown as code. */
  address?: string;
}

export interface VaultSecretInput {
  name: string;
  group: string;
  kind: VaultSecretKind;
  /** Empty on edit means "keep the current value". */
  value: string;
  description?: string;
  /** `YYYY-MM-DD`. */
  expiresAt?: string;
}

export type VaultResult = void | { error?: string };
export type VaultRevealResult = { value: string } | { error: string };

export interface VaultProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  secrets: readonly VaultSecret[];
  accessLog?: readonly VaultAccessEvent[];
  /**
   * Fetch one value when someone reveals or copies it, so values are never in the page until then. `purpose` is
   * what to write in the access log. Resolve `{ value }` or `{ error }`.
   */
  onReveal: (id: string, purpose: "reveal" | "copy") => Promise<VaultRevealResult>;
  /** Add (`id` undefined) or edit. Resolve `{ error }` to keep the dialog open with a message. Omit to hide add and edit. */
  onSave?: (input: VaultSecretInput, id?: string) => Promise<VaultResult>;
  /** Omit to hide Delete. */
  onDelete?: (id: string) => Promise<VaultResult>;
  loading?: boolean;
  /** Hide a revealed value again after this many milliseconds. Default 15000. Minimum 1000. */
  revealTimeout?: number;
  /** Override the clock (stories and tests). */
  now?: Date | number | string;
  title?: ReactNode;
  description?: ReactNode;
  labels?: Partial<VaultLabels>;
}

const KINDS: VaultSecretKind[] = ["api-key", "password", "token", "certificate", "ssh-key", "other"];

const EXPIRY_VARIANT: Record<Exclude<ExpiryState, "none" | "ok">, BadgeProps["variant"]> = { soon: "warning", expired: "danger" };
const ACTION_VARIANT: Record<VaultAccessAction, BadgeProps["variant"]> = {
  reveal: "warning",
  copy: "info",
  create: "success",
  update: "neutral",
  delete: "danger",
};

interface Shown {
  value: string;
}

function SecretRow({
  secret,
  shown,
  busy,
  copied,
  now,
  seconds,
  onToggle,
  onCopy,
  onEdit,
  onDelete,
  t,
}: {
  secret: VaultSecret;
  shown: Shown | undefined;
  busy: boolean;
  copied: boolean;
  now: Date | number | string;
  seconds: number;
  onToggle: () => void;
  onCopy: () => void;
  onEdit: (() => void) | undefined;
  onDelete: (() => void) | undefined;
  t: VaultLabels;
}) {
  const kind = secret.kind ?? "other";
  const expiry = expiryState(secret.expiresAt, now);
  return (
    <li data-slot="vault-secret" data-revealed={shown ? "" : undefined} className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1 sm:w-2/5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <bdi dir="ltr" className="truncate font-mono text-code font-medium text-foreground">
            {secret.name}
          </bdi>
          <Badge variant="neutral" className="shrink-0">
            <Lock aria-hidden />
            {t.kind[kind]}
          </Badge>
          {expiry === "soon" || expiry === "expired" ? (
            <Badge variant={EXPIRY_VARIANT[expiry]} className="shrink-0">
              {expiry === "expired" ? t.expired : t.expiresIn(Math.max(1, daysUntil(secret.expiresAt as Date | number | string, now)))}
            </Badge>
          ) : null}
        </div>
        {secret.description ? <span className="truncate text-caption text-muted-foreground">{secret.description}</span> : null}
        <span className="text-caption text-muted-foreground">
          {t.lastUsed}: {secret.lastAccessedAt ? <DateTime value={secret.lastAccessedAt} relative /> : t.never}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {shown ? (
          <div className="flex flex-col gap-0.5">
            <bdi dir="ltr" data-slot="vault-value" className="block break-all font-mono text-code text-foreground">
              {shown.value}
            </bdi>
            <span className="text-caption text-muted-foreground">{t.autoHide(seconds)}</span>
          </div>
        ) : (
          <span data-slot="vault-value" dir="ltr" role="text" aria-label={t.hidden} className="block font-mono text-code text-muted-foreground">
            {VAULT_MASK}
            {secret.hint ? <span className="ms-1">{secret.hint}</span> : null}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          loading={busy}
          aria-label={shown ? t.hide(secret.name) : t.reveal(secret.name)}
          aria-pressed={Boolean(shown)}
          onClick={onToggle}
        >
          {shown ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t.copy(secret.name)} data-copied={copied || undefined} className="data-copied:text-nq-success-text" onClick={onCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        {onEdit ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.edit(secret.name)} onClick={onEdit}>
            <Pencil aria-hidden />
          </Button>
        ) : null}
        {onDelete ? (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t.remove(secret.name)} className="text-nq-danger-text" onClick={onDelete}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}


/**
 * A secrets vault: secrets grouped by project or service with masked values, reveal and copy that fetch the
 * value only when asked (and log it), a value that hides itself again, expiry warnings, add, edit and delete,
 * and an access log table. It has no backend: your callbacks hold the values.
 */
export function Vault({
  secrets,
  accessLog = [],
  onReveal,
  onSave,
  onDelete,
  loading = false,
  revealTimeout = 15_000,
  now,
  title,
  description,
  labels,
  className,
  ...props
}: VaultProps) {
  const { t, locale } = useLabels(labels);
  const [tab, setTab] = useState("secrets");
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState<Record<string, Shown>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [deleting, setDeleting] = useState<VaultSecret | null>(null);
  const [remaining, setRemaining] = useState(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideMs = Math.max(1000, revealTimeout);
  const clock = now ?? Date.now();

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      clearTimeout(copyTimer.current);
    },
    [],
  );

  // A countdown for the "hides again in N seconds" line, shared by all revealed values.
  const revealedCount = Object.keys(shown).length;
  const lastReveal = useRef(0);
  useEffect(() => {
    if (revealedCount === 0) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((lastReveal.current + hideMs - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [revealedCount, hideMs]);

  const hide = (id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setShown((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _gone, ...rest } = prev;
      return rest;
    });
  };

  async function toggle(secret: VaultSecret) {
    if (shown[secret.id]) return hide(secret.id);
    setBusy(secret.id);
    setNotice(null);
    try {
      const result = await onReveal(secret.id, "reveal");
      if ("error" in result) {
        setNotice(result.error || t.revealFailed);
        return;
      }
      lastReveal.current = Date.now();
      setShown((prev) => ({ ...prev, [secret.id]: { value: result.value } }));
      clearTimeout(timers.current.get(secret.id));
      timers.current.set(
        secret.id,
        setTimeout(() => hide(secret.id), hideMs),
      );
    } catch {
      setNotice(t.revealFailed);
    } finally {
      setBusy(null);
    }
  }

  async function copy(secret: VaultSecret) {
    setNotice(null);
    setBusy(secret.id);
    try {
      const known = shown[secret.id]?.value;
      const result = known !== undefined ? { value: known } : await onReveal(secret.id, "copy");
      if ("error" in result) {
        setNotice(result.error || t.revealFailed);
        return;
      }
      const ok = await copyText(result.value);
      clearTimeout(copyTimer.current);
      if (ok) {
        setCopied(secret.id);
        copyTimer.current = setTimeout(() => setCopied(null), 1500);
      } else setNotice(t.copyFailed);
    } catch {
      setNotice(t.revealFailed);
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(() => secrets.filter((s) => matchesSecret(s, filter)), [secrets, filter]);
  const groups = useMemo(() => groupSecrets(visible, locale), [visible, locale]);
  const existingGroups = useMemo(() => [...new Set(secrets.map((s) => s.group.trim()).filter(Boolean))], [secrets]);
  const editingSecret = editing?.id ? secrets.find((s) => s.id === editing.id) : undefined;
  const canEdit = Boolean(onSave);

  const log = useMemo(() => [...accessLog], [accessLog]);
  const logColumns = useMemo<DataTableColumn<VaultAccessEvent>[]>(
    () => [
      {
        id: "at",
        header: t.time,
        label: t.time,
        cell: (e) => <DateTime value={e.at} format={{ dateStyle: "medium", timeStyle: "short" }} />,
        sortValue: (e) => new Date(e.at),
      },
      { id: "actor", header: t.actor, label: t.actor, cell: (e) => e.actor, sortValue: (e) => e.actor, searchValue: (e) => e.actor },
      {
        id: "action",
        header: t.action,
        label: t.action,
        cell: (e) => <Badge variant={ACTION_VARIANT[e.action]}>{t.actions[e.action]}</Badge>,
        filterValue: (e) => e.action,
      },
      {
        id: "secret",
        header: t.secret,
        label: t.secret,
        cell: (e) => (
          <bdi dir="ltr" className="font-mono text-code">
            {e.secretName}
          </bdi>
        ),
        sortValue: (e) => e.secretName,
        searchValue: (e) => e.secretName,
      },
      {
        id: "address",
        header: t.address,
        label: t.address,
        cell: (e) =>
          e.address ? (
            <bdi dir="ltr" className="font-mono text-code text-muted-foreground">
              {e.address}
            </bdi>
          ) : (
            "-"
          ),
        searchValue: (e) => e.address ?? "",
      },
    ],
    [t],
  );
  const logTable = useDataTable({ data: log, columns: logColumns, getRowId: (e) => e.id, pageSize: 10, defaultSort: { id: "at", direction: "desc" } });

  return (
    <section data-slot="vault" aria-label={typeof title === "string" ? title : t.title} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="flex items-center gap-2 text-h3 text-foreground">
            <KeyRound aria-hidden className="size-5 text-muted-foreground" />
            {title ?? t.title}
          </h3>
          <p className="max-w-prose text-body-sm text-muted-foreground">{description ?? t.description}</p>
        </div>
        {canEdit ? (
          <Button type="button" size="sm" variant="primary" onClick={() => setEditing({})}>
            <Plus aria-hidden />
            {t.add}
          </Button>
        ) : null}
      </header>

      {notice ? (
        <Alert tone="danger" role="alert" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline" aria-label={typeof title === "string" ? title : t.title}>
          <TabsTab value="secrets">
            {t.secrets}
            <span className="ms-1.5 text-caption text-muted-foreground tabular-nums">{secrets.length}</span>
          </TabsTab>
          <TabsTab value="log">{t.accessLog}</TabsTab>
          <TabsIndicator />
        </TabsList>

        <TabsPanel value="secrets" className="flex flex-col gap-4">
          {loading ? (
            <LoadingState label={t.loading} rows={4} />
          ) : secrets.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title={t.emptyTitle}
              description={t.emptyBody}
              actions={
                canEdit ? (
                  <Button type="button" variant="primary" onClick={() => setEditing({})}>
                    <Plus aria-hidden />
                    {t.add}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              {secrets.length > 5 ? (
                <InputGroup className="max-w-sm">
                  <InputGroupAddon align="start">
                    <Search aria-hidden className="size-4 text-muted-foreground" />
                  </InputGroupAddon>
                  <InputGroupInput ltr type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.filter} aria-label={t.filter} />
                </InputGroup>
              ) : null}
              {groups.length === 0 ? <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-body-sm text-muted-foreground">{t.noMatch}</p> : null}
              {groups.map((g) => (
                <section key={g.group || "__none"} aria-label={g.group || t.ungrouped} className="flex flex-col gap-2">
                  <h4 className="flex items-baseline gap-2 text-label text-foreground">
                    {g.group ? <bdi dir="auto">{g.group}</bdi> : t.ungrouped}
                    <span className="text-caption font-normal text-muted-foreground">{t.count(g.items.length)}</span>
                  </h4>
                  <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-card p-0">
                    {g.items.map((s) => (
                      <SecretRow
                        key={s.id}
                        secret={s}
                        shown={shown[s.id]}
                        busy={busy === s.id}
                        copied={copied === s.id}
                        now={clock}
                        seconds={remaining}
                        onToggle={() => void toggle(s)}
                        onCopy={() => void copy(s)}
                        onEdit={canEdit ? () => setEditing({ id: s.id }) : undefined}
                        onDelete={onDelete ? () => setDeleting(s) : undefined}
                        t={t}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              <span role="status" aria-live="polite" className="sr-only">
                {copied ? t.copied : ""}
              </span>
            </>
          )}
        </TabsPanel>

        <TabsPanel value="log" className="flex flex-col gap-3">
          <DataTableToolbar>
            <DataTableSearch table={logTable} placeholder={t.logSearch} />
            <DataTableFacetFilter
              table={logTable}
              column="action"
              title={t.action}
              options={(Object.keys(t.actions) as VaultAccessAction[]).map((value) => ({ value, label: t.actions[value] }))}
            />
          </DataTableToolbar>
          <DataTable table={logTable} label={t.logTable} loading={loading} empty={<EmptyState title={t.logEmpty} />} />
        </TabsPanel>
      </Tabs>

      {editing && onSave ? (
        <SecretDialog
          key={editing.id ?? "new"}
          initial={editingSecret}
          groups={existingGroups}
          secrets={secrets}
          onSave={(input) => onSave(input, editing.id)}
          onClose={() => setEditing(null)}
          t={t}
        />
      ) : null}
      {deleting && onDelete ? (
        <DeleteDialog
          secret={deleting}
          onConfirm={async () => {
            const result = await onDelete(deleting.id);
            if (!result?.error) hide(deleting.id);
            return result;
          }}
          onClose={() => setDeleting(null)}
          t={t}
        />
      ) : null}
    </section>
  );
}

function SecretDialog({
  initial,
  groups,
  secrets,
  onSave,
  onClose,
  t,
}: {
  initial: VaultSecret | undefined;
  groups: string[];
  secrets: readonly VaultSecret[];
  onSave: (input: VaultSecretInput) => Promise<VaultResult>;
  onClose: () => void;
  t: VaultLabels;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [kind, setKind] = useState<VaultSecretKind>(initial?.kind ?? "api-key");
  const [value, setValue] = useState("");
  const [note, setNote] = useState(initial?.description ?? "");
  const [expires, setExpires] = useState(initial?.expiresAt ? new Date(initial.expiresAt).toISOString().slice(0, 10) : "");
  const [showValue, setShowValue] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const id = useId();

  const trimmed = name.trim();
  const nameProblem =
    trimmed === ""
      ? t.nameEmpty
      : secrets.some((s) => s.id !== initial?.id && s.name === trimmed && s.group.trim() === group.trim())
        ? t.nameDuplicate
        : null;
  const valueProblem = !initial && value === "" ? t.valueEmpty : null;
  const invalid = nameProblem !== null || valueProblem !== null;
  const kindItems = KINDS.map((k) => ({ value: k, label: t.kind[k] }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (invalid || pending) return;
    setPending(true);
    setError(null);
    try {
      const input: VaultSecretInput = {
        name: trimmed,
        group: group.trim(),
        kind,
        value,
        ...(note.trim() ? { description: note.trim() } : {}),
        ...(expires ? { expiresAt: expires } : {}),
      };
      const result = await onSave(input);
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{initial ? t.editTitle(initial.name) : t.addTitle}</DialogTitle>
            <DialogDescription>{t.groupHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && nameProblem !== null}>
            <FieldLabel>{t.nameLabel}</FieldLabel>
            <Input
              ltr
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              autoComplete="off"
              spellCheck={false}
              placeholder="STRIPE_SECRET_KEY"
              className="font-mono text-code"
              aria-describedby={touched && nameProblem ? `${id}-name` : undefined}
            />
            {touched && nameProblem ? (
              <p id={`${id}-name`} role="alert" className="text-caption text-nq-danger-text">
                {nameProblem}
              </p>
            ) : null}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.groupLabel}</FieldLabel>
              <Input value={group} onChange={(e) => setGroup(e.target.value)} list={`${id}-groups`} autoComplete="off" />
              <datalist id={`${id}-groups`}>
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel>{t.kindLabel}</FieldLabel>
              <Select items={kindItems} value={kind} onValueChange={(v) => v && setKind(v as VaultSecretKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kindItems.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field invalid={touched && valueProblem !== null}>
            <FieldLabel>{t.valueLabel}</FieldLabel>
            <Textarea
              dir="ltr"
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => setTouched(true)}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className={cn("min-h-20 font-mono text-code text-start", !showValue && "[-webkit-text-security:disc]")}
            />
            {initial ? <span className="text-caption text-muted-foreground">{t.valueKeep}</span> : null}
            {touched && valueProblem ? (
              <p role="alert" className="text-caption text-nq-danger-text">
                {valueProblem}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setShowValue((s) => !s)}
              aria-pressed={showValue}
              className="inline-flex w-fit items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              {showValue ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
              {t.showValue}
            </button>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t.noteLabel}</FieldLabel>
              <Input value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel>{t.expiryLabel}</FieldLabel>
              <Input ltr type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </Field>
          </div>
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ secret, onConfirm, onClose, t }: { secret: VaultSecret; onConfirm: () => Promise<VaultResult>; onClose: () => void; t: VaultLabels }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <bdi dir="ltr" className="font-mono">
              {t.deleteTitle(secret.name)}
            </bdi>
          </AlertDialogTitle>
          <AlertDialogDescription>{t.deleteBody}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.cancel}</AlertDialogCancel>
          <Button
            type="button"
            variant="danger"
            loading={pending}
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                const result = await onConfirm();
                if (result?.error) setError(result.error);
                else onClose();
              } catch {
                setError(t.genericError);
              } finally {
                setPending(false);
              }
            }}
          >
            {t.deleteConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
