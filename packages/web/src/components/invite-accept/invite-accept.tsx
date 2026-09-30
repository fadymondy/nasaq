"use client";

import { Ban, CircleCheck, TimerOff, UserRoundX, type LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { Alert } from "../alert";
import { AuthLayout, type AuthLayoutProps } from "../auth-layout";
import { type AuthSubmitResult, useAuthLocale } from "../auth-layout/auth-utils";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { DateTime } from "../numeric";

const STRINGS = {
  en: {
    validTitle: (workspace: string) => `Join ${workspace}`,
    validBody: (who: string) => `${who} invited you to collaborate.`,
    validBodyAnon: "You have been invited to collaborate.",
    invitedAs: "You will join as",
    invitedEmail: "Invitation for",
    expiresOn: "Expires",
    signedInAs: "Signed in as",
    accept: "Accept invitation",
    decline: "Decline",
    signInToAccept: "Sign in to accept",
    createAccount: "Create an account",
    signInHint: (email: string) => `Use ${email} so this invitation matches your account.`,
    expiredTitle: "This invitation has expired",
    expiredBody: (who: string) => `Invitations only work for a limited time. Ask ${who} to send you a new one.`,
    expiredBodyAnon: "Invitations only work for a limited time. Ask the person who invited you to send a new one.",
    requestNew: "Ask for a new invitation",
    requested: "We told them you asked for a new invitation.",
    wrongTitle: "This invitation is for another account",
    wrongBody: (invited: string, current: string) => `It was sent to ${invited}, but you are signed in as ${current}.`,
    switchAccount: "Sign in with another account",
    acceptedTitle: "You have already joined",
    acceptedBody: (workspace: string) => `This invitation was used and you are a member of ${workspace}.`,
    open: (workspace: string) => `Open ${workspace}`,
    revokedTitle: "This invitation was cancelled",
    revokedBody: (who: string) => `${who} cancelled it. Ask them if you still need access.`,
    revokedBodyAnon: "The person who invited you cancelled it. Ask them if you still need access.",
    goHome: "Go to your account",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    validTitle: (workspace: string) => `الانضمام إلى ${workspace}`,
    validBody: (who: string) => `دعاك ${who} للتعاون معه.`,
    validBodyAnon: "تمت دعوتك للتعاون.",
    invitedAs: "ستنضم بصفة",
    invitedEmail: "الدعوة موجهة إلى",
    expiresOn: "تنتهي",
    signedInAs: "مسجّل الدخول باسم",
    accept: "قبول الدعوة",
    decline: "رفض",
    signInToAccept: "سجّل الدخول للقبول",
    createAccount: "إنشاء حساب",
    signInHint: (email: string) => `استخدم ${email} ليطابق حسابك هذه الدعوة.`,
    expiredTitle: "انتهت صلاحية هذه الدعوة",
    expiredBody: (who: string) => `تعمل الدعوات لفترة محدودة. اطلب من ${who} إرسال دعوة جديدة.`,
    expiredBodyAnon: "تعمل الدعوات لفترة محدودة. اطلب ممن دعاك إرسال دعوة جديدة.",
    requestNew: "اطلب دعوة جديدة",
    requested: "أبلغناهم بأنك طلبت دعوة جديدة.",
    wrongTitle: "هذه الدعوة لحساب آخر",
    wrongBody: (invited: string, current: string) => `أُرسلت إلى ${invited}، لكنك مسجّل الدخول باسم ${current}.`,
    switchAccount: "سجّل الدخول بحساب آخر",
    acceptedTitle: "لقد انضممت بالفعل",
    acceptedBody: (workspace: string) => `استُخدمت هذه الدعوة وأنت عضو في ${workspace}.`,
    open: (workspace: string) => `فتح ${workspace}`,
    revokedTitle: "أُلغيت هذه الدعوة",
    revokedBody: (who: string) => `ألغاها ${who}. اسأله إن كنت لا تزال بحاجة إلى الوصول.`,
    revokedBodyAnon: "ألغاها من دعاك. اسأله إن كنت لا تزال بحاجة إلى الوصول.",
    goHome: "الانتقال إلى حسابك",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export type InviteAcceptLabels = Partial<typeof STRINGS.en>;

/** Keeps an email address in its own direction inside a sentence of the other one. */
const isolate = (value: string) => `⁨${value}⁩`;

export type InviteState = "valid" | "expired" | "wrong-account" | "already-accepted" | "revoked";

export interface InviteWorkspace {
  name: string;
  /** An image URL for the workspace logo. Without one, its initials show. */
  logo?: string;
  /** A short line under the name: "12 members". */
  meta?: string;
}

export interface InviteAcceptProps extends Omit<AuthLayoutProps, "title" | "description" | "children" | "labels"> {
  /** What the link resolves to. */
  state: InviteState;
  workspace: InviteWorkspace;
  /** Who sent it. */
  invitedBy?: { name: string; email?: string };
  /** The role label the person gets. */
  role?: string;
  /** The address the invitation was sent to. */
  inviteEmail?: string;
  expiresAt?: string | number | Date;
  /** The signed-in account, or nothing when signed out. */
  account?: { name: string; email: string; avatar?: string } | null;
  /** Join. Resolve with `{ error }` to show a failure. */
  onAccept: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  onDecline?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Signed out: go to sign in, then come back to this link. */
  onSignIn?: () => void;
  /** Signed out: go to sign up with the invited email prefilled. */
  onSignUp?: () => void;
  /** Wrong account: sign out and sign in with the right one. */
  onSwitchAccount?: () => void | Promise<void>;
  /** Expired: tell the inviter. Resolve with `{ error }` to show a failure. */
  onRequestNew?: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Already accepted: open the workspace. */
  onOpenWorkspace?: () => void;
  /** Revoked and expired: leave the page. */
  onGoHome?: () => void;
  /** Render only the content, without the page frame, to place it in your own layout. */
  bare?: boolean;
  labels?: InviteAcceptLabels;
}

const STATE_ICON: Record<Exclude<InviteState, "valid">, { icon: LucideIcon; tone: string }> = {
  expired: { icon: TimerOff, tone: "text-nq-warning-text bg-nq-warning-soft" },
  "wrong-account": { icon: UserRoundX, tone: "text-nq-warning-text bg-nq-warning-soft" },
  "already-accepted": { icon: CircleCheck, tone: "text-nq-success-text bg-nq-success-soft" },
  revoked: { icon: Ban, tone: "text-nq-danger-text bg-nq-danger-soft" },
};

function WorkspaceRow({ workspace, children }: { workspace: InviteWorkspace; children?: ReactNode }) {
  return (
    <div data-slot="invite-workspace" className="flex items-center gap-3 rounded-card border border-border bg-background/60 p-3">
      <Avatar name={workspace.name} src={workspace.logo} shape="square" size="lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label text-foreground">{workspace.name}</span>
        {workspace.meta ? <span className="truncate text-caption text-muted-foreground">{workspace.meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * The public page behind an invitation link. It handles the five things a link can turn out to be: a valid
 * invitation (accept or decline, or sign in first), an expired one, one sent to another account than the one
 * signed in, one already used, and one that was cancelled. It does no fetching: you resolve the link and pass
 * `state`.
 */
export function InviteAccept({
  state,
  workspace,
  invitedBy,
  role,
  inviteEmail,
  expiresAt,
  account,
  onAccept,
  onDecline,
  onSignIn,
  onSignUp,
  onSwitchAccount,
  onRequestNew,
  onOpenWorkspace,
  onGoHome,
  bare = false,
  labels,
  ...layout
}: InviteAcceptProps) {
  const locale = useAuthLocale();
  const t = { ...STRINGS[locale], ...labels };
  const [busy, setBusy] = useState<"accept" | "decline" | "request" | "switch" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);
  const who = invitedBy?.name;

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<AuthSubmitResult | void> | AuthSubmitResult | void, onOk?: () => void) => {
    setBusy(kind);
    setError(null);
    try {
      const result = await fn();
      if (result && typeof result === "object" && result.error) setError(result.error);
      else onOk?.();
    } catch {
      setError(t.failed);
    } finally {
      setBusy(null);
    }
  };

  let title: string;
  let description: string;
  let body: ReactNode;
  if (state === "valid") {
    title = t.validTitle(workspace.name);
    description = who ? t.validBody(who) : t.validBodyAnon;
    body = (
      <>
        <WorkspaceRow workspace={workspace}>{role ? <Badge variant="neutral">{role}</Badge> : null}</WorkspaceRow>
        <dl className="flex flex-col gap-1.5 text-body-sm">
          {role ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.invitedAs}</dt>
              <dd className="text-foreground">{role}</dd>
            </div>
          ) : null}
          {inviteEmail ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.invitedEmail}</dt>
              <dd className="text-foreground">
                <bdi dir="ltr">{inviteEmail}</bdi>
              </dd>
            </div>
          ) : null}
          {expiresAt ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.expiresOn}</dt>
              <dd className="text-foreground">
                <DateTime value={expiresAt} format={{ dateStyle: "medium" }} />
              </dd>
            </div>
          ) : null}
        </dl>
        {account ? (
          <>
            <div className="flex items-center gap-2.5 text-body-sm text-muted-foreground">
              <Avatar name={account.name} src={account.avatar} size="sm" />
              <span className="min-w-0">
                {t.signedInAs} <bdi dir="ltr" className="text-foreground">{account.email}</bdi>
              </span>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {onDecline ? (
                <Button variant="ghost" disabled={busy !== null} loading={busy === "decline"} onClick={() => void run("decline", onDecline)}>
                  {t.decline}
                </Button>
              ) : null}
              <Button variant="primary" disabled={busy !== null && busy !== "accept"} loading={busy === "accept"} onClick={() => void run("accept", onAccept)}>
                {t.accept}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {inviteEmail ? <p className="text-caption text-muted-foreground">{t.signInHint(isolate(inviteEmail))}</p> : null}
            <Button variant="primary" onClick={onSignIn}>
              {t.signInToAccept}
            </Button>
            {onSignUp ? (
              <Button variant="secondary" onClick={onSignUp}>
                {t.createAccount}
              </Button>
            ) : null}
          </div>
        )}
      </>
    );
  } else {
    const { icon: Icon, tone } = STATE_ICON[state];
    const glyph = (
      <span aria-hidden className={cn("mx-auto flex size-12 items-center justify-center rounded-full [&_svg]:size-6", tone)}>
        <Icon />
      </span>
    );
    if (state === "expired") {
      title = t.expiredTitle;
      description = who ? t.expiredBody(who) : t.expiredBodyAnon;
      body = (
        <>
          {glyph}
          <WorkspaceRow workspace={workspace} />
          {requested ? <Alert tone="success">{t.requested}</Alert> : null}
          {onRequestNew && !requested ? (
            <Button variant="primary" loading={busy === "request"} onClick={() => void run("request", onRequestNew, () => setRequested(true))}>
              {t.requestNew}
            </Button>
          ) : null}
        </>
      );
    } else if (state === "wrong-account") {
      title = t.wrongTitle;
      description = t.wrongBody(isolate(inviteEmail ?? ""), isolate(account?.email ?? ""));
      body = (
        <>
          {glyph}
          <WorkspaceRow workspace={workspace} />
          <Button variant="primary" loading={busy === "switch"} onClick={() => void run("switch", async () => void (await onSwitchAccount?.()))}>
            {t.switchAccount}
          </Button>
        </>
      );
    } else if (state === "already-accepted") {
      title = t.acceptedTitle;
      description = t.acceptedBody(workspace.name);
      body = (
        <>
          {glyph}
          <WorkspaceRow workspace={workspace} />
          {onOpenWorkspace ? (
            <Button variant="primary" onClick={onOpenWorkspace}>
              {t.open(workspace.name)}
            </Button>
          ) : null}
        </>
      );
    } else {
      title = t.revokedTitle;
      description = who ? t.revokedBody(who) : t.revokedBodyAnon;
      body = (
        <>
          {glyph}
          <WorkspaceRow workspace={workspace} />
          {onGoHome ? (
            <Button variant="secondary" onClick={onGoHome}>
              {t.goHome}
            </Button>
          ) : null}
        </>
      );
    }
  }

  const content = (
    <div data-slot="invite-accept" data-state={state} className="flex flex-col gap-4">
      {body}
      {error ? (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      ) : null}
    </div>
  );

  if (bare) {
    return (
      <section aria-labelledby="invite-accept-title" className={cn("flex flex-col gap-4", (layout as ComponentProps<"div">).className)}>
        <header className="flex flex-col gap-1.5">
          <h1 id="invite-accept-title" className="text-h2 text-foreground">
            {title}
          </h1>
          <p className="text-body-sm text-muted-foreground">{description}</p>
        </header>
        {content}
      </section>
    );
  }
  return (
    <AuthLayout {...layout} title={title} description={description}>
      {content}
    </AuthLayout>
  );
}
