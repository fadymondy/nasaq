"use client";

import type { LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { LoginForm, type LoginFormProps } from "../login-form";
import { ProductMark } from "../product-mark";

const STRINGS = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", signIn: "Sign in", power: "Power options" },
  ar: { morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء الخير", signIn: "تسجيل الدخول", power: "خيارات الطاقة" },
};

export type DesktopLoginScreenLabels = Partial<(typeof STRINGS)["en"]>;

export interface DesktopPowerAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
}

export interface DesktopLoginScreenProps extends Omit<ComponentProps<"div">, "children" | "title" | "onSubmit"> {
  /** Signs in. Same contract as `LoginForm`: resolve with nothing, or `{ error, fieldErrors }`. Not needed with `children`. */
  onSubmit?: LoginFormProps["onSubmit"];
  /** Any other `LoginForm` prop: passkeys, providers, forgot password, labels. */
  formProps?: Omit<LoginFormProps, "onSubmit">;
  /** Replaces the sign-in form (a register form, an SSO button, a user picker). */
  children?: ReactNode;
  /** A full-bleed backdrop (an image, a gradient). It sits under a readable scrim. */
  wallpaper?: ReactNode;
  /** The mark on the card. Default: the provider brand's `ProductMark`. `null` hides it. */
  mark?: ReactNode;
  /** The product or machine name on the card. */
  title?: ReactNode;
  description?: ReactNode;
  /** Show the clock, the date and a greeting. Default true. */
  showClock?: boolean;
  /** Freeze the clock at this time (docs, tests). Default: now, ticking. */
  now?: Date | number;
  /** Under the form: "No account? Create one", a dev sign-in, a language switch. */
  footer?: ReactNode;
  /** Round buttons at the bottom: sleep, restart, shut down. Omit for none. */
  powerActions?: readonly DesktopPowerAction[];
  labels?: DesktopLoginScreenLabels;
}

function useClock(frozen?: Date | number) {
  const [now, setNow] = useState<number | null>(frozen === undefined ? null : new Date(frozen).getTime());
  useEffect(() => {
    if (frozen !== undefined) {
      setNow(new Date(frozen).getTime());
      return;
    }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [frozen]);
  return now;
}

/**
 * A desktop OS sign-in screen: wallpaper, a big clock with a greeting, and a card with the mark, the name
 * and the Nasaq `LoginForm`. For a signed-in person coming back, use `LockScreen` instead.
 */
export function DesktopLoginScreen({
  onSubmit,
  formProps,
  children,
  wallpaper,
  mark,
  title,
  description,
  showClock = true,
  now: frozenNow,
  footer,
  powerActions,
  labels,
  className,
  ...props
}: DesktopLoginScreenProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const clock = useClock(frozenNow);
  const hour = clock === null ? 12 : new Date(clock).getHours();
  const greeting = hour < 12 ? t.morning : hour < 18 ? t.afternoon : t.evening;
  const time = clock === null ? "" : new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(clock);
  const date = clock === null ? "" : new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(clock);
  const markNode = mark === undefined ? <ProductMark size={40} title="" /> : mark;

  return (
    <div
      data-slot="desktop-login-screen"
      className={cn("relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-muted px-4 text-foreground", className)}
      {...props}
    >
      <div aria-hidden="true" data-slot="desktop-login-screen-wallpaper" className="absolute inset-0 -z-10">
        {wallpaper}
        <div className="absolute inset-0 bg-background/55 backdrop-blur-sm" />
      </div>

      <main className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 py-10">
        {showClock ? (
          <div data-slot="desktop-login-screen-clock" className="flex flex-col items-center gap-1 text-center">
            <p className="text-label tracking-wide text-muted-foreground uppercase">{clock === null ? " " : greeting}</p>
            <time dir="ltr" className="text-[clamp(3rem,10vw,5rem)] leading-none font-light tabular-nums text-foreground">
              {time || " "}
            </time>
            <p className="text-body text-muted-foreground first-letter:uppercase">{date || " "}</p>
          </div>
        ) : null}

        <section
          aria-labelledby="desktop-login-title"
          data-slot="desktop-login-screen-card"
          className="flex w-full flex-col gap-6 rounded-card border border-border bg-card/90 p-6 text-card-foreground backdrop-blur-md"
        >
          <header className="flex flex-col items-center gap-3 text-center">
            {markNode ? <div data-slot="desktop-login-screen-mark">{markNode}</div> : null}
            <div className="flex flex-col gap-0.5">
              <h1 id="desktop-login-title" className="text-h3 text-foreground">
                {title ?? t.signIn}
              </h1>
              {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
            </div>
          </header>
          {children ?? (onSubmit ? <LoginForm onSubmit={onSubmit} {...formProps} /> : null)}
          {footer ? <div className="text-center text-body-sm text-muted-foreground">{footer}</div> : null}
        </section>
      </main>

      {powerActions?.length ? (
        <nav aria-label={t.power} data-slot="desktop-login-screen-power" className="flex items-center gap-4 pb-8">
          {powerActions.map(({ id, label, icon: Icon, onSelect }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              title={label}
              onClick={onSelect}
              className="grid size-10 place-items-center rounded-full border border-border bg-card/70 text-muted-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <Icon aria-hidden className="size-4" />
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
