/*
 * Page-sized demos shared by the component stories and the page stories of the team, audit, access and
 * privacy batch. Real components, fake async callbacks.
 */
import { AccessGrants, AuditLog, CancelDeletionPage, type CancelDeletionState, DataPrivacy, InviteAccept, type InviteState } from "@nasaq/web";
import { type ReactNode, useState } from "react";
import {
  accessOrgs,
  accessResources,
  auditActionLabels,
  auditEntries,
  auditEntityLabels,
  scopeLabels,
  useAccessDemo,
  useAr,
  useExportDemo,
  wait,
} from "./_team-demo";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000);

export function InviteDemo({ state, signedIn = true }: { state: InviteState; signedIn?: boolean }) {
  const ar = useAr();
  return (
    <InviteAccept
      state={state}
      workspace={{ name: ar ? "استوديو سحاب" : "Sahab Studio", meta: ar ? "١٤ عضواً" : "14 members" }}
      invitedBy={{ name: ar ? "عمر خليل" : "Omar Khalil", email: "omar@example.com" }}
      role={ar ? "عضو" : "Member"}
      inviteEmail="layla@example.com"
      expiresAt={new Date(Date.now() + 5 * 86_400_000)}
      account={signedIn ? { name: ar ? "ليلى المطيري" : "Layla Almutairi", email: state === "wrong-account" ? "other@example.com" : "layla@example.com" } : null}
      onAccept={async () => {
        await wait(900);
      }}
      onDecline={async () => {
        await wait(600);
      }}
      onRequestNew={async () => {
        await wait(700);
      }}
      onSignIn={() => undefined}
      onSignUp={() => undefined}
      onSwitchAccount={() => undefined}
      onOpenWorkspace={() => undefined}
      onGoHome={() => undefined}
    />
  );
}

export function AuditDemo({ loading, error, empty }: { loading?: boolean; error?: string; empty?: boolean }) {
  const ar = useAr();
  const [days, setDays] = useState<number | null>(90);
  return (
    <AuditLog
      entries={empty ? [] : auditEntries(ar)}
      actionLabels={auditActionLabels(ar)}
      entityLabels={auditEntityLabels(ar)}
      loading={loading}
      error={error}
      onRetry={() => undefined}
      onRefresh={() => wait(700)}
      retention={{ days }}
      onChangeRetention={async (next) => {
        await wait(700);
        if (next === null) return { error: ar ? "الاحتفاظ غير المحدود غير متاح في باقتك." : "Unlimited retention is not on your plan." };
        setDays(next);
      }}
    />
  );
}

export function AccessDemo({ empty }: { empty?: boolean }) {
  const ar = useAr();
  const d = useAccessDemo(ar);
  return (
    <AccessGrants
      apps={empty ? [] : d.apps}
      scopeLabels={scopeLabels(ar)}
      organizations={accessOrgs(ar)}
      onRevoke={d.onRevoke}
      resources={accessResources(ar)}
      grants={d.grants}
      onChangeGrant={d.onChangeGrant}
      agentKeys={d.agentKeys}
    />
  );
}

export function PrivacyDemo({ scheduled = false, ready = false }: { scheduled?: boolean; ready?: boolean }) {
  const ar = useAr();
  const ex = useExportDemo(ready ? "ready" : "none");
  return (
    <DataPrivacy
      dataExport={{ ...ex, includes: ar ? ["الملف الشخصي", "النشاط", "الملفات"] : ["Profile", "Activity", "Files"] }}
      deletion={{
        scheduledFor: scheduled ? inDays(22) : null,
        graceDays: 30,
        confirmText: "sara@example.com",
        onSchedule: async () => {
          await wait(900);
          return { scheduledFor: inDays(30) };
        },
        onCancel: async () => {
          await wait(700);
        },
      }}
    />
  );
}

export function CancelDemo({ state }: { state: CancelDeletionState }) {
  const ar = useAr();
  return (
    <CancelDeletionPage
      state={state}
      account={{ name: ar ? "سارة الحربي" : "Sara Alharbi", email: "sara@example.com" }}
      scheduledFor={inDays(8)}
      onCancelDeletion={async () => {
        await wait(900);
      }}
      onSignIn={() => undefined}
      onSignUp={() => undefined}
      onGoHome={() => undefined}
    />
  );
}

/** The frame of an account page: a title, a line of help and the content. */
export function PageShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{title}</h1>
        {description ? <p className="text-body text-muted-foreground">{description}</p> : null}
      </header>
      {children}
    </main>
  );
}
