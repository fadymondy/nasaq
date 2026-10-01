"use client";

import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { badgeVariants } from "../badge";
import { Button } from "../button";
import { AppleLogo, GitHubLogo, GoogleLogo, MicrosoftLogo } from "./oauth-logos";

export type OAuthProviderId = "google" | "github" | "apple" | "microsoft";

/** Your own provider. `label` is the complete button text ("Continue with Okta"); `icon` is rendered as is. */
export interface OAuthCustomProvider {
  id: string;
  label: string;
  icon: ReactNode;
}

export type OAuthProvider = OAuthProviderId | OAuthCustomProvider;
export type OAuthIntent = "signin" | "signup" | "continue";

export interface OAuthButtonsLabels {
  /** Use `{provider}` where the provider name goes. Default "Sign in with {provider}". */
  signin: string;
  signup: string;
  continue: string;
  /** Accessible name of the group. Default "Sign in with a provider". */
  group: string;
  divider: string;
  /** Badge on the provider passed as `lastUsed`. Default "Last used". */
  lastUsed: string;
}

const STRINGS: Record<"en" | "ar", OAuthButtonsLabels> = {
  en: {
    signin: "Sign in with {provider}",
    signup: "Sign up with {provider}",
    continue: "Continue with {provider}",
    group: "Sign in with a provider",
    divider: "or",
    lastUsed: "Last used",
  },
  ar: {
    signin: "تسجيل الدخول باستخدام {provider}",
    signup: "إنشاء حساب باستخدام {provider}",
    continue: "المتابعة باستخدام {provider}",
    group: "تسجيل الدخول عبر مزوّد",
    divider: "أو",
    lastUsed: "آخر استخدام",
  },
};

/** Provider names are brand names: they are never translated. */
const NAMES: Record<OAuthProviderId, string> = { google: "Google", github: "GitHub", apple: "Apple", microsoft: "Microsoft" };

export interface OAuthButtonsProps extends Omit<ComponentProps<"div">, "onSelect"> {
  /** Providers in display order. Default `["google", "github"]`. */
  providers?: OAuthProvider[];
  /** Called with the provider id. Return a promise to show that provider's loading state until it settles. */
  onSelect: (id: string) => void | Promise<unknown>;
  /** `stack`: full-width rows. `grid`: two columns. `icon-only`: a row of square buttons. Default `stack`. */
  layout?: "stack" | "grid" | "icon-only";
  /** Which approved verb the buttons use. Default `continue`. */
  intent?: OAuthIntent;
  /** Keep this provider in the loading state from outside, for redirect flows. */
  pendingProvider?: string | null;
  disabled?: boolean;
  /**
   * The provider this person signed in with last time. It gets a "Last used" badge, which stops people creating a
   * second account with another provider. Read it from your own cookie or session; the component stores nothing.
   */
  lastUsed?: string | null;
  labels?: Partial<OAuthButtonsLabels>;
}

function useOAuthLabels(labels?: Partial<OAuthButtonsLabels>): OAuthButtonsLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar");
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

/**
 * Sign-in buttons for Google, GitHub, Apple and Microsoft using each provider's official logo, plus your own
 * providers. One provider loads at a time and the rest are disabled while it does. Logos are never
 * recoloured or mirrored, in Arabic too.
 */
export function OAuthButtons({
  providers = ["google", "github"],
  onSelect,
  layout = "stack",
  intent = "continue",
  pendingProvider,
  disabled,
  lastUsed,
  labels: labelsProp,
  className,
  ...props
}: OAuthButtonsProps) {
  const nasaq = useOptionalNasaq();
  const dark = nasaq?.resolvedTheme === "dark";
  const labels = useOAuthLabels(labelsProp);
  const [own, setOwn] = useState<string | null>(null);
  const active = pendingProvider ?? own;

  const select = async (id: string) => {
    if (active) return;
    try {
      const result = onSelect(id);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setOwn(id);
        await result;
      }
    } finally {
      setOwn(null);
    }
  };

  return (
    <div
      role="group"
      aria-label={labels.group}
      data-slot="oauth-buttons"
      data-layout={layout}
      className={cn(
        layout === "stack" && "flex w-full flex-col gap-2",
        layout === "grid" && "grid w-full grid-cols-2 gap-2",
        layout === "icon-only" && "flex w-full flex-wrap items-center gap-2",
        className,
      )}
      {...props}
    >
      {providers.map((provider) => {
        const custom = typeof provider === "object";
        const id = custom ? provider.id : provider;
        const name = custom ? provider.label : NAMES[provider];
        const template = labels[intent];
        const [before = "", after = ""] = template.split("{provider}");
        const text = custom ? provider.label : template.replace("{provider}", name);
        const loading = active === id;
        const iconOnly = layout === "icon-only";
        const apple = !custom && provider === "apple";
        // Apple: black button with the white logo on light pages, white with the black logo on dark pages.
        const icon = custom ? (
          provider.icon
        ) : provider === "google" ? (
          <GoogleLogo />
        ) : provider === "github" ? (
          <GitHubLogo onDark={dark} />
        ) : provider === "apple" ? (
          <AppleLogo onDark={!dark} />
        ) : (
          <MicrosoftLogo />
        );
        return (
          <Button
            key={id}
            type="button"
            variant="secondary"
            size={iconOnly ? "icon" : "md"}
            data-slot="oauth-button"
            data-provider={id}
            aria-label={iconOnly ? text : undefined}
            title={iconOnly ? text : undefined}
            loading={loading}
            disabled={disabled || (active !== null && !loading)}
            onClick={() => select(id)}
            className={cn(
              !iconOnly && "relative w-full min-w-0 justify-center gap-3",
              apple && (dark ? "border-white bg-white text-black hover:bg-white/90" : "border-black bg-black text-white hover:bg-black/90"),
              !custom && !loading && "[&_svg]:size-auto",
            )}
          >
            {loading ? null : icon}
            {iconOnly ? null : custom ? (
              <span className="truncate">{text}</span>
            ) : (
              <span className="truncate">
                {before}
                <bdi>{name}</bdi>
                {after}
              </span>
            )}
            {lastUsed === id && !iconOnly ? <LastUsed>{labels.lastUsed}</LastUsed> : null}
          </Button>
        );
      })}
    </div>
  );
}

/** A neutral badge at the inline end of the sign-in method used last time. The parent needs `relative`. */
export function LastUsed({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="last-used"
      className={cn(
        badgeVariants({ variant: "neutral" }),
        "pointer-events-none absolute end-2 top-1/2 -translate-y-1/2",
        className,
      )}
      {...props}
    />
  );
}

export interface OAuthDividerProps extends ComponentProps<"div"> {
  /** Default "or" / "أو". */
  children?: ReactNode;
}

/** A rule with a word in the middle ("or", "or continue with email") between the OAuth buttons and a form. */
export function OAuthDivider({ children, className, ...props }: OAuthDividerProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar");
  return (
    <div data-slot="oauth-divider" role="separator" className={cn("flex items-center gap-3 text-caption text-muted-foreground", className)} {...props}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span>{children ?? STRINGS[ar ? "ar" : "en"].divider}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}
