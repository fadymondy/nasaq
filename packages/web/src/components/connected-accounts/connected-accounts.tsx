"use client";

import { Link2, Link2Off } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { AppleLogo, GitHubLogo, GoogleLogo, MicrosoftLogo } from "../oauth-buttons/oauth-logos";
import { Status } from "../status";
import { Tooltip } from "../tooltip";

const STRINGS = {
  en: {
    title: "Connected accounts",
    description: "Sign in with these accounts instead of a password.",
    list: "Sign-in providers",
    connect: "Connect",
    disconnect: "Disconnect",
    connected: "Connected",
    notConnected: "Not connected",
    lastMethod: "This is your only way to sign in. Add a password, a passkey or another account first.",
    disconnectTitle: (name: string) => `Disconnect ${name}?`,
    disconnectBody: "You will no longer be able to sign in with this account. You can connect it again later.",
    disconnectConfirm: "Disconnect",
    connectFailed: "Could not connect the account. Try again.",
    disconnectFailed: "Could not disconnect the account. Try again.",
  },
  ar: {
    title: "الحسابات المرتبطة",
    description: "سجّل الدخول بهذه الحسابات بدلًا من كلمة المرور.",
    list: "مزوّدو تسجيل الدخول",
    connect: "ربط",
    disconnect: "فك الارتباط",
    connected: "مرتبط",
    notConnected: "غير مرتبط",
    lastMethod: "هذه هي طريقتك الوحيدة لتسجيل الدخول. أضف كلمة مرور أو مفتاح مرور أو حسابًا آخر أولًا.",
    disconnectTitle: (name: string) => `فك ارتباط ${name}؟`,
    disconnectBody: "لن تتمكن بعد ذلك من تسجيل الدخول بهذا الحساب. يمكنك ربطه مرة أخرى لاحقًا.",
    disconnectConfirm: "فك الارتباط",
    connectFailed: "تعذر ربط الحساب. حاول مرة أخرى.",
    disconnectFailed: "تعذر فك ارتباط الحساب. حاول مرة أخرى.",
  },
};

export type ConnectedAccountsLabels = (typeof STRINGS)["en"];

const NAMES = { google: "Google", github: "GitHub", apple: "Apple", microsoft: "Microsoft" } as const;

export type ConnectedProviderId = keyof typeof NAMES;

export interface ConnectedProvider {
  /** "google", "github", "apple" or "microsoft" use the official logo and name. Any other id is a custom provider: pass `name` and `icon`. */
  id: ConnectedProviderId | (string & {});
  /** Display name for a custom provider. */
  name?: string;
  /** The provider's official logo for a custom provider. Never a generic substitute. */
  icon?: ReactNode;
  /** The email or username at the provider. Shown left-to-right when connected. */
  account?: string;
  connected: boolean;
}

export interface ConnectedAccountsProps extends Omit<ComponentProps<"div">, "children"> {
  providers: readonly ConnectedProvider[];
  /** Start the OAuth redirect or popup. Resolve when done; the host then passes the updated `providers`. */
  onConnect: (id: string) => Promise<void>;
  /** Remove the link. Resolve, or resolve `{ error }` to show it. */
  onDisconnect: (id: string) => Promise<void | { error?: string }>;
  /** Sign-in methods outside this list that still work: a password counts 1, each passkey 1. Default 0. The last method cannot be disconnected. */
  otherSignInMethods?: number;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ConnectedAccountsLabels>;
}

function Logo({ provider, dark }: { provider: ConnectedProvider; dark: boolean }) {
  switch (provider.id) {
    case "google":
      return <GoogleLogo />;
    case "github":
      return <GitHubLogo onDark={dark} />;
    case "apple":
      return <AppleLogo onDark={dark} />;
    case "microsoft":
      return <MicrosoftLogo />;
    default:
      return <>{provider.icon}</>;
  }
}

/**
 * The OAuth accounts linked to a sign-in: each provider with the connected email or username and a
 * Connect or Disconnect button. The last remaining sign-in method cannot be disconnected: the button is
 * disabled and a tooltip and a visible line say why. Logos are the providers' official marks.
 */
export function ConnectedAccounts({
  providers,
  onConnect,
  onDisconnect,
  otherSignInMethods = 0,
  labels,
  className,
  ...props
}: ConnectedAccountsProps) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  const dark = nasaq?.resolvedTheme === "dark";
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const hintId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = providers.filter((p) => p.connected).length + otherSignInMethods;

  async function connect(id: string) {
    if (busy) return;
    setBusy(id);
    setError(null);
    try {
      await onConnect(id);
    } catch {
      setError(t.connectFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card data-slot="connected-accounts" className={cn("w-full max-w-2xl", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <ul aria-label={t.list} className="overflow-hidden rounded-card border border-border">
          {providers.map((p) => {
            const name = p.name ?? NAMES[p.id as ConnectedProviderId] ?? p.id;
            const last = p.connected && total <= 1;
            return (
              <li
                key={p.id}
                data-slot="connected-account"
                data-provider={p.id}
                data-connected={p.connected || undefined}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3 first:border-t-0"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5">
                  <Logo provider={p} dark={dark} />
                </span>
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                  <p className="text-label text-foreground">
                    <bdi>{name}</bdi>
                  </p>
                  {p.connected && p.account ? (
                    <p className="truncate text-caption text-muted-foreground">
                      <bdi dir="ltr">{p.account}</bdi>
                    </p>
                  ) : (
                    <Status tone={p.connected ? "success" : "neutral"} className="text-caption text-muted-foreground">
                      {p.connected ? t.connected : t.notConnected}
                    </Status>
                  )}
                  {last ? (
                    <p id={`${hintId}-${p.id}`} className="text-caption text-muted-foreground">
                      {t.lastMethod}
                    </p>
                  ) : null}
                </div>
                {p.connected ? (
                  last ? (
                    <Tooltip content={t.lastMethod} side="top">
                      <Button type="button" size="sm" disabled focusableWhenDisabled aria-describedby={`${hintId}-${p.id}`} onClick={(e) => e.preventDefault()}>
                        <Link2Off aria-hidden />
                        {t.disconnect}
                        <span className="sr-only">
                          {" "}
                          <bdi>{name}</bdi>
                        </span>
                      </Button>
                    </Tooltip>
                  ) : (
                    <ConfirmButton
                      size="sm"
                      variant="secondary"
                      title={t.disconnectTitle(name)}
                      description={t.disconnectBody}
                      confirmLabel={t.disconnectConfirm}
                      onConfirm={async () => {
                        setError(null);
                        try {
                          const result = await onDisconnect(p.id);
                          if (result && result.error) setError(result.error);
                        } catch {
                          setError(t.disconnectFailed);
                        }
                      }}
                    >
                      <Link2Off aria-hidden />
                      {t.disconnect}
                      <span className="sr-only">
                        {" "}
                        <bdi>{name}</bdi>
                      </span>
                    </ConfirmButton>
                  )
                ) : (
                  <Button type="button" size="sm" variant="secondary" loading={busy === p.id} disabled={busy !== null && busy !== p.id} onClick={() => connect(p.id)}>
                    <Link2 aria-hidden />
                    {t.connect}
                    <span className="sr-only">
                      {" "}
                      <bdi>{name}</bdi>
                    </span>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
