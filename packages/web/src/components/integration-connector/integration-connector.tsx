"use client";

import { ExternalLink, Link2 } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldLabel } from "../field";
import { DateTime } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";

const STRINGS = {
  en: {
    title: "Connections",
    description: "Connect the services this workspace reads from or posts to.",
    list: "Services",
    connect: "Connect",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    manage: "Change permissions",
    status: { disconnected: "Not connected", connected: "Connected", "needs-reauth": "Needs sign-in again", error: "Connection problem", pending: "Connecting…" },
    connectedAs: "Signed in as",
    account: "Account",
    accountHint: (service: string) => `Which ${service} account or property to use.`,
    lastSync: "Last synced",
    never: "Not synced yet",
    permissions: "Permissions",
    permissionsCount: (n: number) => (n === 1 ? "1 permission" : `${n} permissions`),
    required: "Required",
    dialogTitle: (name: string) => `Connect ${name}`,
    dialogBody: (name: string) => `You will go to ${name} to sign in and approve access. Nasaq never sees your password.`,
    dialogPermissions: "Nasaq will be able to",
    continue: (name: string) => `Continue to ${name}`,
    cancel: "Cancel",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "Nasaq stops reading from this service and deletes the stored access. Data already imported stays. You can connect it again later.",
    disconnectConfirm: "Disconnect",
    noPermissions: "Pick at least one permission.",
    emptyTitle: "No services to connect",
    emptyBody: "Services you can connect will appear here.",
    genericError: "Something went wrong. Try again.",
  },
  ar: {
    title: "الاتصالات",
    description: "اربط الخدمات التي تقرأ منها مساحة العمل هذه أو تنشر إليها.",
    list: "الخدمات",
    connect: "ربط",
    reconnect: "إعادة الربط",
    disconnect: "فك الربط",
    manage: "تغيير الصلاحيات",
    status: { disconnected: "غير مرتبطة", connected: "مرتبطة", "needs-reauth": "تحتاج تسجيل دخول جديد", error: "مشكلة في الاتصال", pending: "جارٍ الربط…" },
    connectedAs: "مسجَّل باسم",
    account: "الحساب",
    accountHint: (service: string) => `أي حساب أو موقع في ${service} سيُستخدم.`,
    lastSync: "آخر مزامنة",
    never: "لم تتم المزامنة بعد",
    permissions: "الصلاحيات",
    permissionsCount: (n: number) => (n === 1 ? "صلاحية واحدة" : `${n} صلاحيات`),
    required: "مطلوبة",
    dialogTitle: (name: string) => `ربط ${name}`,
    dialogBody: (name: string) => `ستنتقل إلى ${name} لتسجيل الدخول والموافقة على الوصول. لا يرى نسق كلمة مرورك أبدًا.`,
    dialogPermissions: "سيتمكن نسق من",
    continue: (name: string) => `المتابعة إلى ${name}`,
    cancel: "إلغاء",
    disconnectTitle: (name: string) => `فك ربط ${name}؟`,
    disconnectBody: "يتوقف نسق عن القراءة من هذه الخدمة ويحذف بيانات الوصول المخزّنة. تبقى البيانات المستوردة سابقًا. يمكنك الربط مجددًا لاحقًا.",
    disconnectConfirm: "فك الربط",
    noPermissions: "اختر صلاحية واحدة على الأقل.",
    emptyTitle: "لا توجد خدمات للربط",
    emptyBody: "ستظهر هنا الخدمات التي يمكنك ربطها.",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type IntegrationConnectorLabels = (typeof STRINGS)["en"];

export type IntegrationStatus = "disconnected" | "connected" | "needs-reauth" | "error" | "pending";

export interface IntegrationScope {
  id: string;
  /** What access this is, in plain words: "Read your Search Console performance data". */
  label: string;
  /** Required scopes are ticked and cannot be turned off. */
  required?: boolean;
}

export interface IntegrationAccount {
  id: string;
  /** "Nasaq blog (nasaq.dev)" */
  name: string;
  /** A second line: the property ID or the email. */
  detail?: string;
}

export interface IntegrationService {
  id: string;
  /** The brand's name. Shown as text; pass `icon` only with the brand's official logo. */
  name: string;
  description?: string;
  /** The service's official logo (never a generic stand-in). Omit to show the name only. */
  icon?: ReactNode;
  /** A heading to group cards under: "Google", "Developer tools". */
  group?: string;
  /** What connecting asks the service for. */
  scopes: readonly IntegrationScope[];
  status: IntegrationStatus;
  /** Scope ids granted, when connected. Default: all of `scopes`. */
  grantedScopes?: readonly string[];
  /** The identity at the service that authorised it, shown left-to-right. */
  connectedAs?: string;
  /** Accounts or properties the user can pick from after connecting (Analytics properties, Slack channels). */
  accounts?: readonly IntegrationAccount[];
  /** The picked account id. */
  accountId?: string;
  lastSyncAt?: number | string | Date | null;
  /** A short reason shown when `status` is "error" or "needs-reauth". */
  message?: string;
  /** Where the service explains its permissions. */
  learnMoreHref?: string;
}

export interface IntegrationConnectorProps extends Omit<ComponentProps<"div">, "children"> {
  services: readonly IntegrationService[];
  /** Start OAuth for the ticked scopes: redirect or open a popup, then resolve. The host passes the updated `services`. Resolve `{ error }` to show it. */
  onConnect: (id: string, scopeIds: string[]) => Promise<void | { error?: string }>;
  onDisconnect: (id: string) => Promise<void | { error?: string }>;
  /** Show an account picker on connected services that have `accounts`. */
  onSelectAccount?: (id: string, accountId: string) => Promise<void | { error?: string }>;
  /** Hide the card title and description when the host has its own page header. */
  bare?: boolean;
  labels?: Partial<IntegrationConnectorLabels>;
}

const tone: Record<IntegrationStatus, StatusTone> = { disconnected: "neutral", connected: "success", "needs-reauth": "warning", error: "danger", pending: "info" };

function ConnectDialog({
  service,
  onClose,
  onConnect,
  t,
}: {
  service: IntegrationService | null;
  onClose: () => void;
  onConnect: IntegrationConnectorProps["onConnect"];
  t: IntegrationConnectorLabels;
}) {
  const id = useId();
  // Keep the service mounted while the dialog animates closed.
  const [held, setHeld] = useState(service);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (!service) return;
    setHeld(service);
    setError(null);
    const granted = service.status === "connected" ? (service.grantedScopes ?? service.scopes.map((s) => s.id)) : null;
    setPicked(service.scopes.filter((s) => s.required || !granted || granted.includes(s.id)).map((s) => s.id));
  }, [service]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!held || pending) return;
    if (picked.length === 0) {
      setError(t.noPermissions);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await onConnect(held.id, picked);
      if (result?.error) setError(result.error);
      else onClose();
    } catch {
      setError(t.genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={service !== null} onOpenChange={(open) => !open && !pending && onClose()} onOpenChangeComplete={(open) => !open && setHeld(null)}>
      <DialogContent data-slot="integration-connect-dialog">
        {held ? (
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{t.dialogTitle(held.name)}</DialogTitle>
              <DialogDescription>{t.dialogBody(held.name)}</DialogDescription>
            </DialogHeader>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <fieldset className="grid gap-2 border-0 p-0">
              <legend className="mb-1 text-label text-foreground">{t.dialogPermissions}</legend>
              <ul className="grid gap-1 rounded-card border border-border p-2">
                {held.scopes.map((s) => (
                  <li key={s.id} className="flex items-start gap-2.5 rounded-control px-2 py-1.5">
                    <Checkbox
                      id={`${id}-${s.id}`}
                      className="mt-0.5"
                      checked={picked.includes(s.id)}
                      disabled={s.required}
                      onCheckedChange={(v) => setPicked((cur) => (v ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
                    />
                    <label htmlFor={`${id}-${s.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-body-sm text-foreground">
                      {s.label}
                      {s.required ? <Badge variant="outline">{t.required}</Badge> : null}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="primary" loading={pending}>
                {t.continue(held.name)}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ServiceCard({
  service,
  t,
  onOpen,
  onDisconnect,
  onSelectAccount,
  onError,
}: {
  service: IntegrationService;
  t: IntegrationConnectorLabels;
  onOpen: (s: IntegrationService) => void;
  onDisconnect: IntegrationConnectorProps["onDisconnect"];
  onSelectAccount: IntegrationConnectorProps["onSelectAccount"];
  onError: (message: string) => void;
}) {
  const connected = service.status === "connected" || service.status === "needs-reauth" || service.status === "error";
  const pending = service.status === "pending";
  const granted = service.grantedScopes ?? service.scopes.map((s) => s.id);
  const items = (service.accounts ?? []).map((a) => ({ value: a.id, label: a.name }));
  return (
    <li
      data-slot="integration-service"
      data-service={service.id}
      data-status={service.status}
      className="flex flex-col gap-3 rounded-card border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {service.icon ? (
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-6" aria-hidden>
              {service.icon}
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col">
            <h3 className="truncate text-label text-foreground" dir="auto">
              {service.name}
            </h3>
            <Status tone={tone[service.status]} className="text-caption">
              {t.status[service.status]}
            </Status>
          </div>
        </div>
      </div>
      {service.description ? <p className="text-body-sm text-muted-foreground">{service.description}</p> : null}
      {service.message && (service.status === "error" || service.status === "needs-reauth") ? (
        <Alert tone={service.status === "error" ? "danger" : "warning"}>{service.message}</Alert>
      ) : null}
      {connected ? (
        <dl className="grid gap-1 text-caption text-muted-foreground">
          {service.connectedAs ? (
            <div className="flex flex-wrap gap-1">
              <dt>{t.connectedAs}</dt>
              <dd dir="ltr" className="text-foreground">
                <bdi>{service.connectedAs}</bdi>
              </dd>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            <dt>{t.lastSync}</dt>
            <dd>{service.lastSyncAt == null ? t.never : <DateTime value={service.lastSyncAt} relative />}</dd>
          </div>
          <div className="flex flex-wrap gap-1">
            <dt>{t.permissions}</dt>
            <dd>{t.permissionsCount(granted.length)}</dd>
          </div>
        </dl>
      ) : null}
      {connected && items.length > 0 && onSelectAccount ? (
        <Field>
          <FieldLabel>{t.account}</FieldLabel>
          <Select
            items={items}
            value={service.accountId ?? null}
            onValueChange={async (v) => {
              if (!v) return;
              try {
                const result = await onSelectAccount(service.id, v);
                if (result?.error) onError(result.error);
              } catch {
                onError(t.genericError);
              }
            }}
          >
            <SelectTrigger aria-label={`${service.name}: ${t.account}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(service.accounts ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate" dir="auto">
                      {a.name}
                    </span>
                    {a.detail ? (
                      <span className="truncate text-caption text-muted-foreground" dir="ltr">
                        {a.detail}
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {!connected ? (
          <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => onOpen(service)}>
            <Link2 aria-hidden />
            {t.connect}
          </Button>
        ) : (
          <>
            {service.status !== "connected" ? (
              <Button type="button" variant="primary" size="sm" onClick={() => onOpen(service)}>
                {t.reconnect}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => onOpen(service)}>
                {t.manage}
              </Button>
            )}
            <ConfirmButton
              size="sm"
              variant="danger"
              title={t.disconnectTitle(service.name)}
              description={t.disconnectBody}
              confirmLabel={t.disconnectConfirm}
              onConfirm={async () => {
                try {
                  const result = await onDisconnect(service.id);
                  if (result?.error) onError(result.error);
                } catch {
                  onError(t.genericError);
                }
              }}
            >
              {t.disconnect}
            </ConfirmButton>
          </>
        )}
        {service.learnMoreHref ? (
          <a
            href={service.learnMoreHref}
            target="_blank"
            rel="noreferrer"
            className="ms-auto inline-flex items-center gap-1 text-caption text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t.permissions}
            <ExternalLink aria-hidden className="size-3" />
          </a>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Cards for the outside services a workspace connects to (Google Analytics, Search Console, YouTube,
 * GitHub, Slack and the like). Each shows its status, who authorised it, when it last synced, an account
 * or property picker, and Connect, Reconnect or Disconnect. Connect first shows exactly which permissions
 * are asked for, with optional ones you can untick, then hands over to your OAuth redirect. Presentational:
 * your callbacks start OAuth and pass the updated `services` back.
 */
export function IntegrationConnector({ services, onConnect, onDisconnect, onSelectAccount, bare = false, labels, className, ...props }: IntegrationConnectorProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [dialog, setDialog] = useState<IntegrationService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const groups = [...new Set(services.map((s) => s.group ?? ""))];

  const body =
    services.length === 0 ? (
      <EmptyState icon={Link2} title={t.emptyTitle} description={t.emptyBody} />
    ) : (
      <div className="flex flex-col gap-5">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {groups.map((group) => (
          <section key={group || "all"} className="flex flex-col gap-3" aria-label={group || t.list}>
            {group ? <h3 className="text-label text-muted-foreground">{group}</h3> : null}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {services
                .filter((s) => (s.group ?? "") === group)
                .map((s) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    t={t}
                    onOpen={setDialog}
                    onDisconnect={onDisconnect}
                    onSelectAccount={onSelectAccount}
                    onError={setError}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>
    );

  return (
    <Card data-slot="integration-connector" className={cn("w-full", className)} {...props}>
      {bare ? null : (
        <CardHeader>
          <CardTitle as="h2">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(bare && "pt-6")}>{body}</CardContent>
      <ConnectDialog service={dialog} onClose={() => setDialog(null)} onConnect={onConnect} t={t} />
    </Card>
  );
}
