"use client";

import { Bot, Plug, Trash2 } from "lucide-react";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { SettingsSection } from "../account-settings";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { ApiKeys, type ApiKeysLabels, type ApiKeysProps } from "../api-keys";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { DateTime, formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Tooltip } from "../tooltip";
import { type AccessLevel, ACCESS_LEVELS, type GrantMatrix, grantCounts, isReadOnlyApp, levelOf, setLevel, summarizeScopes } from "./access-rules";

export { ACCESS_LEVELS, grantCounts, levelOf, setLevel } from "./access-rules";
export type { AccessLevel, GrantMatrix } from "./access-rules";

const STRINGS = {
  en: {
    appsTitle: "Authorized apps and agents",
    appsBody: "Apps and AI agents you have allowed to act on your behalf. Revoking cuts their access at once.",
    appsLabel: "Authorized apps and agents",
    workspace: "Workspace",
    allWorkspaces: "All workspaces",
    agent: "Agent",
    app: "App",
    readOnly: "Read only",
    scopesMore: (n: string) => `+${n} more`,
    noScopes: "No permissions",
    authorized: "Authorized",
    lastUsed: "Last used",
    neverUsed: "Never used",
    revoke: "Revoke",
    revokeTitle: (name: string) => `Revoke ${name}?`,
    revokeBody: "It loses access immediately and must ask you again to get it back. Its agent keys stop working.",
    revokeFailed: "Access could not be revoked. Try again.",
    revoked: (name: string) => `${name} was revoked.`,
    appsEmpty: "No apps or agents yet",
    appsEmptyHint: "When you approve an app or connect an agent, it appears here.",
    // keys
    keysTitle: "Agent keys",
    keysBody: "Keys an agent uses to act for you. Each carries only the scopes you pick.",
    keysCreate: "Create agent key",
    keysEmptyTitle: "No agent keys yet",
    keysEmptyBody: "Create a key to let an agent act on your behalf.",
    keysCreateTitle: "Create an agent key",
    // grants
    grantsTitle: "What agents can reach",
    grantsBody: "Choose, per agent, which resources it can read and which it can change. Write includes read.",
    grantsLabel: "Agent access by resource",
    agentColumn: "Agent",
    levels: { none: "No access", read: "Read", write: "Read and write" } as Record<AccessLevel, string>,
    cell: (agent: string, resource: string) => `${agent}: ${resource}`,
    summary: (r: string, w: string) => `Reads ${r}, writes ${w}`,
    grantsEmpty: "No agents connected",
    grantsEmptyHint: "Connect an agent to control what it can reach.",
    grantFailed: "That change did not save, so it was put back. Try again.",
    dismiss: "Dismiss",
  },
  ar: {
    appsTitle: "التطبيقات والوكلاء المصرّح لهم",
    appsBody: "تطبيقات ووكلاء ذكاء اصطناعي سمحت لهم بالتصرف نيابةً عنك. الإلغاء يقطع وصولهم فورًا.",
    appsLabel: "التطبيقات والوكلاء المصرّح لهم",
    workspace: "مساحة العمل",
    allWorkspaces: "كل مساحات العمل",
    agent: "وكيل",
    app: "تطبيق",
    readOnly: "قراءة فقط",
    scopesMore: (n: string) => `+${n} أخرى`,
    noScopes: "بلا صلاحيات",
    authorized: "تاريخ التصريح",
    lastUsed: "آخر استخدام",
    neverUsed: "لم يُستخدم",
    revoke: "إلغاء الوصول",
    revokeTitle: (name: string) => `إلغاء وصول ${name}؟`,
    revokeBody: "يفقد وصوله فورًا وعليه أن يطلب منك من جديد ليستعيده. وتتوقف مفاتيح الوكيل عن العمل.",
    revokeFailed: "تعذّر إلغاء الوصول. حاول مرة أخرى.",
    revoked: (name: string) => `تم إلغاء وصول ${name}.`,
    appsEmpty: "لا توجد تطبيقات أو وكلاء بعد",
    appsEmptyHint: "عندما توافق على تطبيق أو تربط وكيلًا سيظهر هنا.",
    keysTitle: "مفاتيح الوكلاء",
    keysBody: "مفاتيح يستخدمها الوكيل ليتصرف نيابةً عنك. يحمل كل مفتاح الصلاحيات التي تختارها فقط.",
    keysCreate: "إنشاء مفتاح وكيل",
    keysEmptyTitle: "لا توجد مفاتيح وكلاء بعد",
    keysEmptyBody: "أنشئ مفتاحًا ليتصرف وكيل نيابةً عنك.",
    keysCreateTitle: "إنشاء مفتاح وكيل",
    grantsTitle: "ما يستطيع الوكلاء الوصول إليه",
    grantsBody: "اختر لكل وكيل الموارد التي يقرأها والتي يغيّرها. الكتابة تشمل القراءة.",
    grantsLabel: "وصول الوكلاء حسب المورد",
    agentColumn: "الوكيل",
    levels: { none: "بلا وصول", read: "قراءة", write: "قراءة وكتابة" } as Record<AccessLevel, string>,
    cell: (agent: string, resource: string) => `${agent}: ${resource}`,
    summary: (r: string, w: string) => `يقرأ ${r}، ويكتب ${w}`,
    grantsEmpty: "لا يوجد وكلاء مرتبطون",
    grantsEmptyHint: "اربط وكيلًا لتتحكم فيما يصل إليه.",
    grantFailed: "لم يُحفظ هذا التغيير فأُعيد كما كان. حاول مرة أخرى.",
    dismiss: "إغلاق",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type AccessGrantsLabels = Partial<typeof STRINGS.en>;

export interface ConnectedApp {
  id: string;
  name: string;
  kind: "app" | "agent";
  /** Who makes it, shown under the name. */
  publisher?: string;
  /** Image URL. Without one the initials show. */
  logo?: string;
  /** The workspace it was authorized for. */
  orgId?: string;
  /** Scope ids it holds. */
  scopes: readonly string[];
  authorizedAt: string | number | Date;
  lastUsedAt?: string | number | Date | null;
}

export interface AccessResource {
  id: string;
  label: string;
}

export interface AccessGrantsProps extends Omit<ComponentProps<"div">, "children"> {
  apps: readonly ConnectedApp[];
  /** Friendly names for scope ids. Unknown ids show as they are. */
  scopeLabels?: Record<string, string>;
  /** Workspaces, to filter the list. Shown when there is more than one. */
  organizations?: readonly { id: string; name: string }[];
  /** Cut off an app or agent. Resolve `{ error }` (or throw) to show a failure. */
  onRevoke?: (app: ConnectedApp) => Promise<void | { error?: string }>;
  /** Resources agents can be given access to, as matrix columns. */
  resources?: readonly AccessResource[];
  grants?: GrantMatrix;
  /** Change one cell. The screen updates at once and goes back if this rejects or resolves `{ error }`. */
  onChangeGrant?: (agentId: string, resourceId: string, level: AccessLevel) => Promise<void | { error?: string }>;
  /** Delegated agent keys, rendered with `ApiKeys`. Omit to hide the section. */
  agentKeys?: Pick<ApiKeysProps, "keys" | "scopes" | "onCreate" | "onRotate" | "onRevoke" | "defaultScopes" | "expiryOptions" | "defaultExpiryDays"> & { labels?: Partial<ApiKeysLabels> };
  /** Show only some sections. Default all. */
  sections?: readonly ("apps" | "keys" | "grants")[];
  labels?: AccessGrantsLabels;
}

/**
 * Who and what can act for you. A list of authorized apps and agents per workspace with their scopes and a
 * revoke button, delegated agent keys (built on `ApiKeys`), and a matrix of agents by resource where each cell
 * is no access, read or read and write. Cell changes save at once and roll back on failure.
 */
export function AccessGrants({ apps, scopeLabels, organizations, onRevoke, resources = [], grants = {}, onChangeGrant, agentKeys, sections = ["apps", "keys", "grants"], labels, className, ...props }: AccessGrantsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [org, setOrg] = useState("all");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [draft, setDraft] = useState<GrantMatrix>(grants);
  const [busy, setBusy] = useState<string | null>(null);
  const savedRef = useRef(grants);
  useEffect(() => {
    savedRef.current = grants;
    setDraft(grants);
  }, [grants]);

  const has = (s: (typeof sections)[number]) => sections.includes(s);
  const visible = org === "all" ? apps : apps.filter((a) => a.orgId === org);
  const agents = visible.filter((a) => a.kind === "agent");
  const scopeName = (id: string) => scopeLabels?.[id] ?? id;

  const revoke = async (app: ConnectedApp) => {
    setNotice(null);
    try {
      const r = await onRevoke?.(app);
      if (r && typeof r === "object" && r.error) setNotice({ tone: "danger", text: r.error });
      else setNotice({ tone: "success", text: t.revoked(app.name) });
    } catch {
      setNotice({ tone: "danger", text: t.revokeFailed });
    }
  };

  const change = async (agent: ConnectedApp, resource: AccessResource, level: AccessLevel) => {
    const key = `${agent.id}:${resource.id}`;
    const before = savedRef.current;
    setDraft((d) => setLevel(d, agent.id, resource.id, level));
    setBusy(key);
    setNotice(null);
    try {
      const r = await onChangeGrant?.(agent.id, resource.id, level);
      if (r && typeof r === "object" && r.error) throw new Error(r.error);
      savedRef.current = setLevel(savedRef.current, agent.id, resource.id, level);
    } catch (e) {
      setDraft((d) => setLevel(d, agent.id, resource.id, levelOf(before, agent.id, resource.id)));
      setNotice({ tone: "danger", text: e instanceof Error && e.message ? e.message : t.grantFailed });
    } finally {
      setBusy((b) => (b === key ? null : b));
    }
  };

  return (
    <div data-slot="access-grants" className={cn("flex flex-col gap-6", className)} {...props}>
      {notice ? (
        <Alert tone={notice.tone} role={notice.tone === "danger" ? "alert" : "status"} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}

      {has("apps") ? (
        <SettingsSection
          title={t.appsTitle}
          description={t.appsBody}
          actions={
            organizations && organizations.length > 1 ? (
              <Select
                items={[{ value: "all", label: t.allWorkspaces }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]}
                value={org}
                onValueChange={(v) => v && setOrg(String(v))}
              >
                <SelectTrigger aria-label={t.workspace} className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allWorkspaces}</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : undefined
          }
        >
          {visible.length ? (
            <ul aria-label={t.appsLabel} data-slot="access-apps" className="flex flex-col divide-y divide-border rounded-card border border-border">
              {visible.map((a) => {
                const { shown, more } = summarizeScopes(a.scopes, 3);
                const orgName = organizations?.find((o) => o.id === a.orgId)?.name;
                return (
                  <li key={a.id} className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                    <Avatar name={a.name} src={a.logo} shape="square" size="lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-label text-foreground">{a.name}</span>
                        <Badge variant={a.kind === "agent" ? "accent" : "neutral"}>
                          {a.kind === "agent" ? <Bot aria-hidden /> : <Plug aria-hidden />}
                          {a.kind === "agent" ? t.agent : t.app}
                        </Badge>
                        {isReadOnlyApp(a.scopes) && a.scopes.length ? <Badge variant="info">{t.readOnly}</Badge> : null}
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {[a.publisher, orgName && org === "all" ? orgName : null].filter(Boolean).join(" · ")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {shown.length ? (
                          shown.map((s) => (
                            <Badge key={s} variant="outline">
                              {scopeName(s)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-caption text-muted-foreground">{t.noScopes}</span>
                        )}
                        {more > 0 ? (
                          <Tooltip content={a.scopes.slice(3).map(scopeName).join(", ")}>
                            <Badge variant="outline" tabIndex={0}>
                              {t.scopesMore(formatNumber(more, locale))}
                            </Badge>
                          </Tooltip>
                        ) : null}
                      </div>
                      <p className="text-caption text-muted-foreground">
                        {t.authorized} <DateTime value={a.authorizedAt} format={{ dateStyle: "medium" }} /> · {t.lastUsed}{" "}
                        {a.lastUsedAt ? <DateTime value={a.lastUsedAt} relative /> : t.neverUsed}
                      </p>
                    </div>
                    {onRevoke ? (
                      <ConfirmButton size="sm" variant="secondary" title={t.revokeTitle(a.name)} description={t.revokeBody} confirmLabel={t.revoke} onConfirm={() => revoke(a)}>
                        <Trash2 />
                        {t.revoke}
                      </ConfirmButton>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={t.appsEmpty} description={t.appsEmptyHint} />
          )}
        </SettingsSection>
      ) : null}

      {has("keys") && agentKeys ? (
        <ApiKeys
          {...agentKeys}
          data-slot="access-agent-keys"
          labels={{ title: t.keysTitle, description: t.keysBody, create: t.keysCreate, emptyTitle: t.keysEmptyTitle, emptyBody: t.keysEmptyBody, createTitle: t.keysCreateTitle, ...agentKeys.labels }}
        />
      ) : null}

      {has("grants") && resources.length ? (
        <SettingsSection title={t.grantsTitle} description={t.grantsBody}>
          {agents.length ? (
            <div className="overflow-x-auto">
              <table data-slot="access-matrix" aria-label={t.grantsLabel} className="w-full min-w-[32rem] border-collapse text-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pe-3 text-start text-caption font-medium text-muted-foreground">
                      {t.agentColumn}
                    </th>
                    {resources.map((r) => (
                      <th key={r.id} scope="col" className="px-2 py-2 text-start text-label text-foreground">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => {
                    const counts = grantCounts(
                      draft,
                      a.id,
                      resources.map((r) => r.id),
                    );
                    return (
                      <tr key={a.id} className="border-b border-border last:border-b-0">
                        <th scope="row" className="py-3 pe-3 text-start font-normal">
                          <span className="block text-label text-foreground">{a.name}</span>
                          <span className="block text-caption text-muted-foreground">{t.summary(formatNumber(counts.read, locale), formatNumber(counts.write, locale))}</span>
                        </th>
                        {resources.map((r) => {
                          const level = levelOf(draft, a.id, r.id);
                          return (
                            <td key={r.id} className="px-2 py-3">
                              <Select items={ACCESS_LEVELS.map((l) => ({ value: l, label: t.levels[l] }))} value={level} disabled={!onChangeGrant || busy === `${a.id}:${r.id}`} onValueChange={(v) => v && void change(a, r, v as AccessLevel)}>
                                <SelectTrigger aria-label={t.cell(a.name, r.label)} data-level={level} className={cn("h-control-sm min-w-32", level === "none" && "text-muted-foreground")}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCESS_LEVELS.map((l) => (
                                    <SelectItem key={l} value={l}>
                                      {t.levels[l]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={Bot} title={t.grantsEmpty} description={t.grantsEmptyHint} />
          )}
        </SettingsSection>
      ) : null}
    </div>
  );
}
