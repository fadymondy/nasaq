"use client";

import { Check, ShieldAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { type AuthSubmitResult, useAuthLocale } from "../auth-layout/auth-utils";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";

export interface ConsentApp {
  name: string;
  /** An image URL, or your own node. Without one, the app's initial is shown. */
  logo?: string | ReactNode;
  /** Who runs the app, shown under its name. */
  publisher?: string;
}

export interface ConsentScope {
  id: string;
  /** Short permission name: "Read your profile". */
  label: string;
  /** One line on what it lets the app do. */
  description?: string;
  /** Marks a broad permission with a "Sensitive" badge. */
  sensitive?: boolean;
}

export interface ConsentAccount {
  name: string;
  email: string;
  avatar?: string;
}

export interface OAuthConsentLabels {
  /** Use `{app}` and `{product}`. */
  title: string;
  signedInAs: string;
  switchAccount: string;
  /** Use `{app}`. */
  scopesIntro: string;
  sensitive: string;
  allow: string;
  deny: string;
  /** Use `{host}`. */
  redirect: string;
  revoke: string;
  failed: string;
}

const STRINGS: Record<"en" | "ar", OAuthConsentLabels> = {
  en: {
    title: "{app} wants to access your {product} account",
    signedInAs: "Signed in as",
    switchAccount: "Switch account",
    scopesIntro: "This will let {app}:",
    sensitive: "Sensitive",
    allow: "Allow",
    deny: "Deny",
    redirect: "You will be sent to {host}.",
    revoke: "You can remove this access at any time in your account settings.",
    failed: "Something went wrong. Try again.",
  },
  ar: {
    title: "يريد {app} الوصول إلى حسابك في {product}",
    signedInAs: "مسجّل الدخول باسم",
    switchAccount: "تبديل الحساب",
    scopesIntro: "سيسمح هذا لتطبيق {app} بما يلي:",
    sensitive: "حساس",
    allow: "السماح",
    deny: "رفض",
    redirect: "ستتم إعادة توجيهك إلى {host}.",
    revoke: "يمكنك إزالة هذا الوصول في أي وقت من إعدادات حسابك.",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
  },
};

export interface OAuthConsentProps extends Omit<ComponentProps<"section">, "children"> {
  app: ConsentApp;
  scopes: ConsentScope[];
  /** The signed-in account the app will act for. */
  account: ConsentAccount;
  /** Called by "Allow". Resolve with `{ error }` to show a failure. */
  onAllow: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Called by "Deny". */
  onDeny: () => Promise<AuthSubmitResult> | AuthSubmitResult;
  /** Shows a "Switch account" button beside the signed-in account. */
  onSwitchAccount?: () => void;
  /** The host people are sent back to, e.g. "app.example.com". */
  redirectHost?: string;
  /** What the account belongs to. Default: the provider brand's name. */
  productName?: string;
  /** Level of the heading. Default 2; use 1 when this is the page's main heading. */
  headingLevel?: 1 | 2 | 3;
  labels?: Partial<OAuthConsentLabels>;
}

/**
 * The "App X wants to access your account" screen: who is asking, what they can do, which account it
 * applies to, and Allow / Deny. Deny is as easy to reach as Allow and both wait on your callbacks.
 */
export function OAuthConsent({
  app,
  scopes,
  account,
  onAllow,
  onDeny,
  onSwitchAccount,
  redirectHost,
  productName,
  headingLevel = 2,
  labels: labelsProp,
  className,
  ...props
}: OAuthConsentProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar");
  const product = productName ?? (ar ? (nasaq?.brand.name.ar ?? nasaq?.brand.name.en) : nasaq?.brand.name.en) ?? "Nasaq";
  const [pending, setPending] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const titleId = useId();
  const Heading = `h${headingLevel}` as const;

  const run = async (kind: "allow" | "deny", action: OAuthConsentProps["onAllow"]) => {
    if (pending) return;
    setPending(kind);
    setError(undefined);
    try {
      const result = await action();
      if (result?.error) setError(result.error);
    } catch {
      setError(t.failed);
    } finally {
      setPending(null);
    }
  };

  const [titleBefore = "", titleRest = ""] = t.title.split("{app}");
  const [titleMid = "", titleAfter = ""] = titleRest.split("{product}");
  const [introBefore = "", introAfter = ""] = t.scopesIntro.split("{app}");

  return (
    <section data-slot="oauth-consent" aria-labelledby={titleId} aria-busy={pending ? true : undefined} className={cn("flex w-full flex-col gap-5", className)} {...props}>
      <div className="flex flex-col items-start gap-3">
        <div data-slot="oauth-consent-app" className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-secondary text-label text-secondary-foreground">
            {typeof app.logo === "string" ? <img src={app.logo} alt="" className="size-full object-cover" /> : (app.logo ?? <span aria-hidden="true">{app.name.slice(0, 1).toUpperCase()}</span>)}
          </span>
          {app.publisher ? <span className="text-caption text-muted-foreground">{app.publisher}</span> : null}
        </div>
        <Heading id={titleId} className="text-h3 text-foreground">
          {titleBefore}
          <bdi>{app.name}</bdi>
          {titleMid}
          {t.title.includes("{product}") ? <bdi>{product}</bdi> : null}
          {titleAfter}
        </Heading>
      </div>

      <div data-slot="oauth-consent-account" className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
        <Avatar name={account.name} src={account.avatar} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-caption text-muted-foreground">{t.signedInAs}</span>
          <span className="truncate text-label text-foreground">{account.name}</span>
          <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
            {account.email}
          </bdi>
        </div>
        {onSwitchAccount ? (
          <Button type="button" variant="link" size="sm" disabled={pending !== null} onClick={onSwitchAccount}>
            {t.switchAccount}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-foreground">
          {introBefore}
          <bdi className="font-medium">{app.name}</bdi>
          {introAfter}
        </p>
        <ul data-slot="oauth-consent-scopes" className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          {scopes.map((scope) => (
            <li key={scope.id} data-scope={scope.id} className="flex items-start gap-3 p-3">
              {scope.sensitive ? (
                <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-nq-warning-text" />
              ) : (
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-nq-success-text" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 text-label text-foreground">
                  {scope.label}
                  {scope.sensitive ? <Badge variant="warning">{t.sensitive}</Badge> : null}
                </span>
                {scope.description ? <span className="text-body-sm text-muted-foreground">{scope.description}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" size="lg" loading={pending === "deny"} disabled={pending === "allow"} onClick={() => run("deny", onDeny)} data-slot="oauth-consent-deny">
          {t.deny}
        </Button>
        <Button type="button" variant="primary" size="lg" loading={pending === "allow"} disabled={pending === "deny"} onClick={() => run("allow", onAllow)} data-slot="oauth-consent-allow">
          {t.allow}
        </Button>
      </div>

      <p className="text-caption text-muted-foreground">
        {redirectHost ? (
          <>
            {t.redirect.split("{host}")[0]}
            <bdi dir="ltr" className="font-medium text-foreground">
              {redirectHost}
            </bdi>
            {t.redirect.split("{host}")[1]}{" "}
          </>
        ) : null}
        {t.revoke}
      </p>
    </section>
  );
}
