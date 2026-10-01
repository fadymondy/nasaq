"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { type ComponentProps, type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Card } from "../card";
import { ProductLogo, ProductMark } from "../product-mark";
import { useAuthLocale } from "./auth-utils";

export interface AuthLayoutProps extends Omit<ComponentProps<"div">, "title"> {
  /** `card`: one centred card on the page. `split`: a brand panel on the inline start, the form on the other side. Default `card`. */
  variant?: "card" | "split";
  /** The mark above the heading. Default: an `AuthEmblem` (the product mark that turns into a lock). Pass `null` to hide it. */
  mark?: ReactNode;
  /** The page heading (an `h1`). */
  title?: ReactNode;
  /** One line under the heading. */
  description?: ReactNode;
  /** Brand or illustration content for the split panel. Hidden below the `lg` breakpoint. */
  panel?: ReactNode;
  /** Your own logo for the default split panel (an `img`, an SVG, a lockup), when you pass no `panel`. Default: the brand's `ProductLogo`. */
  logo?: ReactNode;
  /** One line under the form that points to the other auth page: "Don't have an account? Create one" on sign-in, "Already have an account? Sign in" on sign-up. */
  prompt?: ReactNode;
  /** Legal links, a locale switch or any small print below the form. See `AuthFooter`. */
  footer?: ReactNode;
  /** The quiet scene behind the page: a plain lattice of tiny cubes that light up under the pointer, from the brand's tokens. Default true. */
  backdrop?: boolean;
  /**
   * A line under the card that says whether the connection is secure and names the site people are signing in to,
   * so they can check it before typing a password. Pass your own node, or `false` to hide it. Card variant only.
   */
  origin?: ReactNode | false;
}

/**
 * The decorative scene behind the auth page: a plain lattice of tiny cubes, and the cubes under the pointer light up
 * while it moves. Purely visual: hidden from assistive tech and pointer events. The pointer light is off with reduced
 * motion.
 */
export function AuthBackdrop({ className, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--nq-auth-x", `${event.clientX - rect.left}px`);
        el.style.setProperty("--nq-auth-y", `${event.clientY - rect.top}px`);
        el.setAttribute("data-pointer", "");
      });
    };
    const leave = () => el.removeAttribute("data-pointer");
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={ref} data-slot="auth-backdrop" aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} {...props}>
      <div data-auth-layer="cubes" />
      <div data-auth-layer="pointer" />
    </div>
  );
}

const ORIGIN = {
  en: { secure: "Secure connection to", insecure: "Not a secure connection. Don't enter a password on" },
  ar: { secure: "اتصال آمن بـ", insecure: "الاتصال غير آمن. لا تُدخل كلمة المرور في" },
};

/**
 * Whether the page is served securely, and the host people are signing in to. On a page that is not a secure
 * context (plain http off localhost) it turns into a warning instead of a reassurance. Rendered after mount, so
 * server and client markup match.
 */
export function AuthOrigin({ className, ...props }: ComponentProps<"p">) {
  const t = ORIGIN[useAuthLocale()];
  const [origin, setOrigin] = useState<{ host: string; secure: boolean } | null>(null);
  useEffect(() => setOrigin({ host: window.location.host, secure: window.isSecureContext }), []);
  if (!origin) return null;
  const Icon = origin.secure ? ShieldCheck : ShieldAlert;
  return (
    <p
      data-slot="auth-origin"
      data-secure={origin.secure ? "" : undefined}
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-caption",
        origin.secure ? "text-muted-foreground" : "text-nq-danger-text",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className={cn("size-3.5 shrink-0", origin.secure && "text-nq-success-text")} />
      <span>{origin.secure ? t.secure : t.insecure}</span>
      {/* A real space, so assistive tech reads two words; flex ignores it for layout. */}
      {" "}
      <bdi dir="ltr" className="font-medium text-foreground">
        {origin.host}
      </bdi>
    </p>
  );
}

// Rings of small cubes (the mark's own lattice unit) around the product mark. Inner rings are denser and fuller,
// outer ones thin out, so the mark reads as the centre of a field rather than a badge.
const EMBLEM_RINGS = [
  { r: 31, count: 18, size: 4.2, fade: 1 },
  { r: 39, count: 24, size: 3.6, fade: 0.85 },
  { r: 47, count: 30, size: 3, fade: 0.65 },
  { r: 55, count: 36, size: 2.4, fade: 0.45 },
] as const;
// The sweep of colours around the ring, all from tokens, so every brand theme gets its own emblem.
const EMBLEM_STOPS = ["var(--nq-action)", "var(--nq-brand-l)", "var(--nq-accent)", "var(--nq-brand)", "var(--nq-action)"];

function emblemColour(t: number): string {
  const span = t * (EMBLEM_STOPS.length - 1);
  const i = Math.min(Math.floor(span), EMBLEM_STOPS.length - 2);
  const mix = Math.round((span - i) * 100);
  return `color-mix(in oklab, ${EMBLEM_STOPS[i + 1]} ${mix}%, ${EMBLEM_STOPS[i]})`;
}

const EMBLEM_CELLS = EMBLEM_RINGS.flatMap((ring, ringIndex) =>
  Array.from({ length: ring.count }, (_, i) => {
    const t = (i + (ringIndex % 2 ? 0.5 : 0)) / ring.count;
    const angle = t * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      key: `${ringIndex}-${i}`,
      x: Math.cos(rad) * ring.r,
      y: Math.sin(rad) * ring.r,
      angle,
      size: ring.size,
      fill: emblemColour(t),
      opacity: ring.fade,
      t,
      ring: ringIndex,
    };
  }),
);

export interface AuthEmblemProps extends ComponentProps<"div"> {
  /** Rendered size in px (square). Default 112. */
  size?: number;
  /** What sits in the middle. Default the brand's `ProductMark`. */
  children?: ReactNode;
  /** After the entrance the mark turns into a lock that clicks shut. Default true. */
  lock?: boolean;
  /** Scan the rings, for a pending request outside an `AuthLayout`. Inside one it already scans while any control is `aria-busy`. */
  busy?: boolean;
}

/**
 * The identity emblem at the top of the card: the product mark inside rings of lattice cubes coloured from the
 * brand tokens. It sweeps in once, then the mark turns into a lock that clicks shut and a ripple runs out through the
 * rings; after that the rings only turn, very slowly. While a sign-in request is running (any `aria-busy` control in
 * the layout, or `busy`) it scans, so people can see their sign-in is being checked. It works on its own too, over any
 * surface. Decorative: the name comes from the page heading.
 */
export function AuthEmblem({ size = 112, children, lock = true, busy, className, style, ...props }: AuthEmblemProps) {
  const core = Math.round(size * 0.3);
  return (
    <div
      data-slot="auth-emblem"
      data-busy={busy || undefined}
      aria-hidden
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg viewBox="-60 -60 120 120" width={size} height={size} className="absolute inset-0 overflow-visible">
        {EMBLEM_RINGS.map((_, ring) => (
          <g key={ring} data-emblem-ring={ring}>
            {EMBLEM_CELLS.filter((cell) => cell.ring === ring).map((cell) => (
              <g key={cell.key} transform={`translate(${cell.x.toFixed(2)} ${cell.y.toFixed(2)}) rotate(${(cell.angle + 45).toFixed(1)})`}>
                <rect
                  data-emblem-cell=""
                  x={-cell.size / 2}
                  y={-cell.size / 2}
                  width={cell.size}
                  height={cell.size}
                  rx={cell.size * 0.22}
                  style={{ fill: cell.fill, opacity: cell.opacity, "--nq-emblem-t": cell.t, "--nq-emblem-ring": cell.ring } as CSSProperties}
                />
              </g>
            ))}
          </g>
        ))}
      </svg>
      <span data-emblem-core="" data-lock={lock ? "" : undefined} className="relative grid place-items-center *:col-start-1 *:row-start-1">
        <span data-emblem-mark="" className="grid place-items-center">
          {children ?? <ProductMark size={core} />}
        </span>
        {lock ? (
          <svg data-emblem-lock="" viewBox="0 0 24 24" width={core} height={core} className="overflow-visible">
            <path data-emblem-shackle="" d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="var(--nq-action)" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="4" y="10.5" width="16" height="11.5" rx="3" fill="var(--nq-action)" />
            <path d="M12 14.6v3" stroke="var(--nq-on-action)" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The page frame for sign-in, sign-up and recovery screens. It owns the page structure (`<main>`, the
 * `h1`, the footer) and leaves the form itself to `children`, so every auth form drops into either variant.
 */
export function AuthLayout({ variant = "card", mark, title, description, panel, logo, prompt, footer, backdrop = true, origin, className, children, ...props }: AuthLayoutProps) {
  const centred = variant === "card";
  const defaultMark = <AuthEmblem size={centred ? 112 : 104} />;
  const markNode = mark === undefined ? defaultMark : mark;
  const heading =
    title || description ? (
      <header data-slot="auth-layout-header" className="flex flex-col items-center gap-1.5 text-center">
        {title ? (
          <h1 data-slot="auth-layout-title" className="text-h1 text-foreground">
            {title}
          </h1>
        ) : null}
        {description ? <p className="text-body-sm text-muted-foreground">{description}</p> : null}
      </header>
    ) : null;
  const promptNode = prompt ? (
    <p
      data-slot="auth-layout-prompt"
      className="text-center text-body-sm text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline"
    >
      {prompt}
    </p>
  ) : null;
  const footerNode = footer ? (
    <footer data-slot="auth-layout-footer" className="text-caption text-muted-foreground">
      {footer}
    </footer>
  ) : null;

  if (variant === "split") {
    return (
      <div data-slot="auth-layout" data-variant="split" className={cn("grid min-h-dvh bg-background text-foreground lg:grid-cols-2", className)} {...props}>
        <aside
          data-slot="auth-layout-panel"
          className="relative isolate hidden flex-col justify-between gap-8 overflow-hidden border-e border-border bg-muted p-10 text-foreground lg:flex"
        >
          {backdrop ? <AuthBackdrop /> : null}
          {panel ?? <div className="flex flex-1 items-center justify-center">{markNode ? (logo ?? <ProductLogo size={56} />) : null}</div>}
        </aside>
        <div className="flex min-w-0 flex-col p-6 sm:p-10">
          <main data-slot="auth-layout-main" data-auth-stagger="" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-8">
            {markNode ? (
              <div data-slot="auth-layout-mark" className="flex justify-center">
                {markNode}
              </div>
            ) : null}
            {heading}
            {children}
            {promptNode}
          </main>
          {footerNode ? <div className="mx-auto w-full max-w-sm">{footerNode}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="auth-layout"
      data-variant="card"
      className={cn("relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-background p-4 text-foreground sm:p-6", className)}
      {...props}
    >
      {backdrop ? <AuthBackdrop /> : null}
      <main data-slot="auth-layout-main" className="flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-4 py-8">
        <Card data-auth-card="" data-auth-stagger="" className="gap-6 px-6 py-8 sm:px-10 sm:py-10">
          {markNode ? (
            <div data-slot="auth-layout-mark" className="flex justify-center">
              {markNode}
            </div>
          ) : null}
          {heading}
          {children}
          {promptNode}
        </Card>
        {origin === false ? null : (origin ?? <AuthOrigin />)}
      </main>
      {footerNode ? <div className="w-full max-w-[26rem]">{footerNode}</div> : null}
    </div>
  );
}

export interface AuthFooterLink {
  label: ReactNode;
  href: string;
  /** Open in a new tab (adds `rel="noreferrer"`). */
  external?: boolean;
}

export interface AuthFooterProps extends ComponentProps<"div"> {
  links?: AuthFooterLink[];
  /** Trailing slot at the inline end, usually a `LocaleSwitcher`. */
  end?: ReactNode;
}

/** Small print row for `AuthLayout`'s `footer`: legal links at the inline start, a slot (locale switch) at the end. */
export function AuthFooter({ links, end, className, children, ...props }: AuthFooterProps) {
  return (
    <div data-slot="auth-footer" className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2", className)} {...props}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {links?.map((link) => (
          <a
            key={link.href}
            href={link.href}
            {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          >
            {link.label}
          </a>
        ))}
        {children}
      </div>
      {end ? <div className="flex items-center">{end}</div> : null}
    </div>
  );
}
