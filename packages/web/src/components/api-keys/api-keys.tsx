"use client";

import { KeyRound, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { CopyField } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { type ApiKeyStatus, type DateLike, daysLeft, keyStatus, maskKey, toggleScope } from "./format";

export { type ApiKeyStatus, type DateLike, daysLeft, EXPIRING_DAYS, expiryFromDays, keyStatus, maskKey, toggleScope } from "./format";

const STRINGS = {
  en: {
    title: "API keys",
    description: "Keys let your own code call the API. Give each key only the access it needs.",
    create: "Create key",
    list: "API keys",
    emptyTitle: "No API keys yet",
    emptyBody: "Create a key to call the API from a script or a server.",
    createTitle: "Create an API key",
    createBody: "Name it after where it will be used. You will see the key once.",
    name: "Name",
    namePlaceholder: "Production server",
    nameRequired: "Give the key a name.",
    scopes: "Scopes",
    scopesHint: "The key can do only what these allow.",
    scopesRequired: "Pick at least one scope.",
    expiry: "Expires",
    expiryLabel: (days: number | null) => (days == null ? "Never" : days === 1 ? "In 1 day" : days === 365 ? "In 1 year" : `In ${days} days`),
    cancel: "Cancel",
    submit: "Create key",
    revealTitle: "Copy your new key now",
    revealRotated: (name: string) => `New key for ${name}`,
    revealBody: "This is the only time the full key is shown. Store it in a secret manager. If you lose it, rotate the key.",
    revealAlert: "You will not see this key again.",
    secretLabel: "Secret key",
    done: "Done",
    createdAt: "Created",
    lastUsed: "Last used",
    neverUsed: "Never used",
    expires: "Expires",
    neverExpires: "Never expires",
    expiredOn: "Expired",
    status: { active: "Active", expiring: "Expiring soon", expired: "Expired", revoked: "Revoked" } satisfies Record<ApiKeyStatus, string>,
    expiresIn: (n: number) => (n === 1 ? "in 1 day" : `in ${n} days`),
    rotate: "Rotate",
    rotateTitle: (name: string) => `Rotate ${name}?`,
    rotateBody: "A new secret replaces the old one, and the old one stops working at once. Update the places that use it.",
    rotateConfirm: "Rotate key",
    revoke: "Revoke",
    revokeTitle: (name: string) => `Revoke ${name}?`,
    revokeBody: "Anything using this key loses access immediately. This cannot be undone.",
    revokeConfirm: "Revoke key",
    genericError: "Something went wrong. Try again.",
    actionsFor: (name: string) => `Actions for ${name}`,
  },
  ar: {
    title: "مفاتيح API",
    description: "تتيح المفاتيح لشيفرتك استدعاء الـ API. امنح كل مفتاح الصلاحيات التي يحتاجها فقط.",
    create: "إنشاء مفتاح",
    list: "مفاتيح API",
    emptyTitle: "لا توجد مفاتيح بعد",
    emptyBody: "أنشئ مفتاحًا لاستدعاء الـ API من سكربت أو خادم.",
    createTitle: "إنشاء مفتاح API",
    createBody: "سمِّه باسم المكان الذي سيُستخدم فيه. ستراه مرة واحدة فقط.",
    name: "الاسم",
    namePlaceholder: "خادم الإنتاج",
    nameRequired: "أعطِ المفتاح اسمًا.",
    scopes: "الصلاحيات",
    scopesHint: "لا يستطيع المفتاح فعل أكثر مما تسمح به هذه الصلاحيات.",
    scopesRequired: "اختر صلاحية واحدة على الأقل.",
    expiry: "الانتهاء",
    expiryLabel: (days: number | null) => (days == null ? "بلا انتهاء" : days === 1 ? "بعد يوم" : days === 365 ? "بعد سنة" : `بعد ${days} يومًا`),
    cancel: "إلغاء",
    submit: "إنشاء المفتاح",
    revealTitle: "انسخ مفتاحك الجديد الآن",
    revealRotated: (name: string) => `مفتاح جديد لـ ${name}`,
    revealBody: "هذه هي المرة الوحيدة التي يظهر فيها المفتاح كاملًا. احفظه في مدير أسرار. إذا فقدته فبدّل المفتاح.",
    revealAlert: "لن تتمكن من رؤية هذا المفتاح مرة أخرى.",
    secretLabel: "المفتاح السري",
    done: "تم",
    createdAt: "أُنشئ",
    lastUsed: "آخر استخدام",
    neverUsed: "لم يُستخدم بعد",
    expires: "ينتهي",
    neverExpires: "لا ينتهي",
    expiredOn: "انتهى",
    status: { active: "نشط", expiring: "ينتهي قريبًا", expired: "منتهي", revoked: "ملغى" } satisfies Record<ApiKeyStatus, string>,
    expiresIn: (n: number) => (n === 1 ? "بعد يوم" : `بعد ${n} أيام`),
    rotate: "تبديل",
    rotateTitle: (name: string) => `تبديل ${name}؟`,
    rotateBody: "يحل سر جديد محل القديم، ويتوقف القديم عن العمل فورًا. حدّث الأماكن التي تستخدمه.",
    rotateConfirm: "تبديل المفتاح",
    revoke: "إلغاء",
    revokeTitle: (name: string) => `إلغاء ${name}؟`,
    revokeBody: "أي شيء يستخدم هذا المفتاح يفقد الوصول فورًا. لا يمكن التراجع.",
    revokeConfirm: "إلغاء المفتاح",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    actionsFor: (name: string) => `إجراءات ${name}`,
  },
};

export type ApiKeysLabels = (typeof STRINGS)["en"];

export interface ApiKeyScope {
  id: string;
  label: string;
  description?: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  /** The public, non-secret start of the key, such as `nsq_live_a1b2`. */
  prefix: string;
  /** The last four characters of the secret. */
  last4?: string;
  /** Scope ids. */
  scopes: readonly string[];
  createdAt: DateLike;
  expiresAt?: DateLike | null;
  lastUsedAt?: DateLike | null;
  revokedAt?: DateLike | null;
}

export interface ApiKeyCreateInput {
  name: string;
  scopes: string[];
  /** Days until expiry, or null for never. */
  expiresInDays: number | null;
}

/** What `onCreate` and `onRotate` return: the full secret (shown once) or an error message. */
export type ApiKeySecretResult = { secret: string; error?: undefined } | { error: string; secret?: undefined };

export interface ApiKeysProps extends Omit<ComponentProps<"div">, "children"> {
  keys: readonly ApiKeyRecord[];
  /** Every scope a key can be given. */
  scopes: readonly ApiKeyScope[];
  /** Scopes ticked when the create form opens. Default: none. */
  defaultScopes?: readonly string[];
  /** Expiry choices in days; `null` is "never". Default 7, 30, 90, 365 days and never. */
  expiryOptions?: readonly (number | null)[];
  /** The expiry preselected in the form. Default 90. */
  defaultExpiryDays?: number | null;
  /** Make the key. Resolve `{ secret }` (shown once) or `{ error }`. The host then passes the updated `keys`. */
  onCreate: (input: ApiKeyCreateInput) => Promise<ApiKeySecretResult>;
  /** Replace the secret of a key. Resolve `{ secret }` or `{ error }`. */
  onRotate?: (id: string) => Promise<ApiKeySecretResult>;
  /** Revoke a key. Resolve, or resolve `{ error }` to show it. */
  onRevoke?: (id: string) => Promise<void | { error?: string }>;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ApiKeysLabels>;
}

const statusTone: Record<ApiKeyStatus, StatusTone> = { active: "success", expiring: "warning", expired: "danger", revoked: "neutral" };

interface Reveal {
  title: string;
  secret: string;
}

/** The one place the full secret appears. It lives in state only while the dialog is open. */
function RevealDialog({ reveal, onClose, t }: { reveal: Reveal | null; onClose: () => void; t: ApiKeysLabels }) {
  // Keep the last secret mounted while the dialog animates closed, then drop it.
  const [held, setHeld] = useState<Reveal | null>(reveal);
  useEffect(() => {
    if (reveal) setHeld(reveal);
  }, [reveal]);
  return (
    <Dialog
      open={reveal !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) setHeld(null);
      }}
    >
      <DialogContent showClose={false} data-slot="api-key-reveal">
        <DialogHeader>
          <DialogTitle>{held?.title}</DialogTitle>
          <DialogDescription>{t.revealBody}</DialogDescription>
        </DialogHeader>
        <Alert tone="warning">{t.revealAlert}</Alert>
        <CopyField value={held?.secret ?? ""} label={t.secretLabel} />
        <DialogFooter>
          <Button type="button" variant="primary" onClick={onClose}>
            {t.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FormErrors {
  name?: string;
  scopes?: string;
  form?: string;
}

function CreateDialog({
  open,
  onOpenChange,
  scopes,
  defaultScopes,
  expiryOptions,
  defaultExpiryDays,
  onCreate,
  onCreated,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scopes: readonly ApiKeyScope[];
  defaultScopes: readonly string[];
  expiryOptions: readonly (number | null)[];
  defaultExpiryDays: number | null;
  onCreate: ApiKeysProps["onCreate"];
  onCreated: (secret: string) => void;
  t: ApiKeysLabels;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([...defaultScopes]);
  const [expiry, setExpiry] = useState<string>(String(defaultExpiryDays ?? "never"));
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const all = scopes.map((s) => s.id);
  const items = expiryOptions.map((d) => ({ value: String(d ?? "never"), label: t.expiryLabel(d) }));

  useEffect(() => {
    if (open) {
      setName("");
      setPicked([...defaultScopes]);
      setExpiry(String(defaultExpiryDays ?? "never"));
      setErrors({});
    }
  }, [open, defaultScopes, defaultExpiryDays]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const next: FormErrors = {};
    if (!name.trim()) next.name = t.nameRequired;
    if (picked.length === 0) next.scopes = t.scopesRequired;
    setErrors(next);
    if (next.name || next.scopes) return;
    setPending(true);
    try {
      const result = await onCreate({ name: name.trim(), scopes: picked, expiresInDays: expiry === "never" ? null : Number(expiry) });
      if (result.error !== undefined) setErrors({ form: result.error });
      else {
        onOpenChange(false);
        onCreated(result.secret);
      }
    } catch {
      setErrors({ form: t.genericError });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent data-slot="api-key-create">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t.createTitle}</DialogTitle>
            <DialogDescription>{t.createBody}</DialogDescription>
          </DialogHeader>
          {errors.form ? <Alert tone="danger">{errors.form}</Alert> : null}
          <Field invalid={Boolean(errors.name)}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} autoComplete="off" maxLength={60} />
            {errors.name ? <FieldError match>{errors.name}</FieldError> : null}
          </Field>
          <fieldset className="grid gap-2 border-0 p-0" aria-describedby={`${id}-scopes`}>
            <legend className="mb-1 text-label text-foreground">{t.scopes}</legend>
            <p id={`${id}-scopes`} className="text-caption text-muted-foreground">
              {t.scopesHint}
            </p>
            <ul className="grid gap-1 rounded-card border border-border p-2">
              {scopes.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-nq-hover">
                  <Checkbox
                    id={`${id}-${s.id}`}
                    className="mt-0.5"
                    checked={picked.includes(s.id)}
                    onCheckedChange={() => setPicked((cur) => toggleScope(cur, s.id, all))}
                  />
                  <label htmlFor={`${id}-${s.id}`} className="grid min-w-0 flex-1 cursor-pointer gap-0.5">
                    <span className="text-body-sm text-foreground">{s.label}</span>
                    {s.description ? <span className="text-caption text-muted-foreground">{s.description}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
            {errors.scopes ? (
              <p role="alert" className="text-caption text-nq-danger-text">
                {errors.scopes}
              </p>
            ) : null}
          </fieldset>
          <Field>
            <FieldLabel>{t.expiry}</FieldLabel>
            <Select items={items} value={expiry} onValueChange={(v) => v && setExpiry(v)}>
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
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create, list, rotate and revoke API keys. Creating asks for a name, scopes and an expiry, then shows the
 * secret once in a dialog with a copy button. After that the list only ever shows the masked key (prefix
 * and last four characters), the scopes, when it was last used, and when it expires. Revoke and rotate
 * ask first. It is presentational: your callbacks talk to the server and return the secret.
 */
export function ApiKeys({
  keys,
  scopes,
  defaultScopes = [],
  expiryOptions = [7, 30, 90, 365, null],
  defaultExpiryDays = 90,
  onCreate,
  onRotate,
  onRevoke,
  labels,
  className,
  ...props
}: ApiKeysProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [creating, setCreating] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scopeLabel = (id: string) => scopes.find((s) => s.id === id)?.label ?? id;

  async function rotate(key: ApiKeyRecord) {
    setError(null);
    try {
      const result = await onRotate?.(key.id);
      if (!result) return;
      if (result.error !== undefined) setError(result.error);
      else setReveal({ title: t.revealRotated(key.name), secret: result.secret });
    } catch {
      setError(t.genericError);
    }
  }

  async function revoke(key: ApiKeyRecord) {
    setError(null);
    try {
      const result = await onRevoke?.(key.id);
      if (result?.error) setError(result.error);
    } catch {
      setError(t.genericError);
    }
  }

  return (
    <Card data-slot="api-keys" className={cn("w-full max-w-4xl", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <Button type="button" variant="primary" className="mt-3 sm:mt-0" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          {t.create}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {keys.length === 0 ? (
          <EmptyState icon={KeyRound} title={t.emptyTitle} description={t.emptyBody} />
        ) : (
          <ul aria-label={t.list} className="overflow-hidden rounded-card border border-border">
            {keys.map((key) => {
              const status = keyStatus(key);
              const dead = status === "revoked" || status === "expired";
              const left = daysLeft(key.expiresAt);
              return (
                <li
                  key={key.id}
                  data-slot="api-key"
                  data-status={status}
                  className="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={cn("text-label text-foreground", dead && "text-muted-foreground line-through decoration-1")} dir="auto">
                        {key.name}
                      </span>
                      <Status tone={statusTone[status]}>{t.status[status]}</Status>
                    </div>
                    <code dir="ltr" data-slot="api-key-masked" className="w-fit max-w-full truncate text-start font-mono text-code text-muted-foreground">
                      {maskKey(key.prefix, key.last4)}
                    </code>
                    <ul aria-label={t.scopes} className="flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <li key={s}>
                          <Badge variant="outline">{scopeLabel(s)}</Badge>
                        </li>
                      ))}
                    </ul>
                    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
                      <div className="flex gap-1">
                        <dt>{t.createdAt}</dt>
                        <dd>
                          <DateTime value={key.createdAt} format={{ dateStyle: "medium" }} />
                        </dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>{t.lastUsed}</dt>
                        <dd>{key.lastUsedAt == null ? t.neverUsed : <DateTime value={key.lastUsedAt} relative />}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt>{status === "expired" ? t.expiredOn : t.expires}</dt>
                        <dd>
                          {key.expiresAt == null ? (
                            t.neverExpires
                          ) : status === "expiring" && left != null ? (
                            t.expiresIn(left)
                          ) : (
                            <DateTime value={key.expiresAt} format={{ dateStyle: "medium" }} />
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {status !== "revoked" ? (
                    <div role="group" aria-label={t.actionsFor(key.name)} className="flex shrink-0 flex-wrap gap-2">
                      {onRotate ? (
                        <ConfirmButton
                          size="sm"
                          variant="secondary"
                          title={t.rotateTitle(key.name)}
                          description={t.rotateBody}
                          confirmLabel={t.rotateConfirm}
                          onConfirm={() => rotate(key)}
                        >
                          <RefreshCw aria-hidden />
                          {t.rotate}
                        </ConfirmButton>
                      ) : null}
                      {onRevoke ? (
                        <ConfirmButton
                          size="sm"
                          variant="danger"
                          title={t.revokeTitle(key.name)}
                          description={t.revokeBody}
                          confirmLabel={t.revokeConfirm}
                          onConfirm={() => revoke(key)}
                        >
                          <Trash2 aria-hidden />
                          {t.revoke}
                        </ConfirmButton>
                      ) : null}
                    </div>
                  ) : (
                    <ShieldAlert aria-hidden className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        scopes={scopes}
        defaultScopes={defaultScopes}
        expiryOptions={expiryOptions}
        defaultExpiryDays={defaultExpiryDays}
        onCreate={onCreate}
        onCreated={(secret) => setReveal({ title: t.revealTitle, secret })}
        t={t}
      />
      <RevealDialog reveal={reveal} onClose={() => setReveal(null)} t={t} />
    </Card>
  );
}
