"use client";

import { ArrowRight, Pause, Play, RotateCcw, Sparkles, Wrench } from "lucide-react";
import { type CSSProperties, type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { defaultCurrency, useOptionalNasaq } from "../../provider/nasaq-provider";
import { usePrefersReducedMotion } from "../ai-states";
import { Badge } from "../badge";
import { Button } from "../button";
import { Price } from "../price";
import { ScreenshotFrame, type ScreenshotFrameProps } from "../screenshot-frame";
import { Slider } from "../slider";
import { splitText } from "../text-effects/text-effects-model";
import { formatSessionClock, type SessionEvent, type SessionTiming, sessionStateAt, sessionTimeFromRatio, sessionTimeline } from "./session-playback-model";

function useIsArabic() {
  return useOptionalNasaq()?.locale.startsWith("ar") ?? false;
}

/* ───────────────────────────────── Backgrounds ───────────────────────────────── */

export interface AuroraBackgroundProps extends ComponentProps<"div"> {
  /** Colour family of the glow. "brand" uses the product colour; "multi" mixes the tag colours. Default "brand". */
  tone?: "brand" | "multi";
  /** Drift slowly. Default true; always still under reduced motion. */
  animate?: boolean;
  /** Fade the glow out toward the bottom so the next section starts clean. Default true. */
  fade?: boolean;
}

const AURORA_COLORS = {
  brand: ["var(--nq-brand)", "var(--nq-tag-blue, var(--nq-brand))", "var(--nq-tag-violet, var(--nq-brand))"],
  multi: ["var(--nq-tag-violet, var(--nq-brand))", "var(--nq-tag-blue, var(--nq-brand))", "var(--nq-tag-green, var(--nq-brand))"],
} as const;

const AURORA_SPOTS = [
  { top: "-30%", insetInlineStart: "-10%", size: "55%" },
  { top: "-20%", insetInlineEnd: "-8%", size: "50%" },
  { top: "5%", insetInlineStart: "30%", size: "40%" },
];

/**
 * A soft, slowly drifting colour glow for the back of a hero or banner. It is decoration only (hidden from assistive
 * tech, ignores the pointer) and paints behind its children. It holds still when the visitor prefers reduced motion.
 */
export function AuroraBackground({ tone = "brand", animate = true, fade = true, className, children, ...props }: AuroraBackgroundProps) {
  const reduced = usePrefersReducedMotion();
  const blobs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (reduced || !animate) return;
    const animations = blobs.current.flatMap((el, i) => {
      if (!el || typeof el.animate !== "function") return [];
      const dx = (i % 2 === 0 ? 1 : -1) * (6 + i * 2);
      return [
        el.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}%, ${4 + i * 2}%) scale(1.12)` }, { transform: "translate(0,0) scale(1)" }], {
          duration: 14000 + i * 3500,
          iterations: Number.POSITIVE_INFINITY,
          easing: "ease-in-out",
        }),
      ];
    });
    return () => {
      for (const a of animations) a.cancel();
    };
  }, [reduced, animate]);
  const colors = AURORA_COLORS[tone];
  return (
    <div data-slot="aurora-background" className={cn("relative isolate overflow-hidden", className)} {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={fade ? { maskImage: "linear-gradient(to bottom, black 55%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent)" } : undefined}>
        {AURORA_SPOTS.map((spot, i) => (
          <span
            key={i}
            ref={(el) => {
              blobs.current[i] = el;
            }}
            className="absolute aspect-square rounded-full opacity-25 blur-3xl"
            style={{ top: spot.top, insetInlineStart: spot.insetInlineStart, insetInlineEnd: spot.insetInlineEnd, width: spot.size, background: colors[i] }}
          />
        ))}
      </div>
      {children}
    </div>
  );
}

export interface GridBackgroundProps extends ComponentProps<"div"> {
  /** Cell size in pixels. Default 40. */
  cell?: number;
  /** "lines" (default) or "dots". */
  pattern?: "lines" | "dots";
  /** Fade the pattern out toward the edges. Default true. */
  fade?: boolean;
}

/** A quiet line or dot grid behind a section, drawn in the theme's line colour and faded toward the edges. Decoration only. */
export function GridBackground({ cell = 40, pattern = "lines", fade = true, className, children, ...props }: GridBackgroundProps) {
  const image =
    pattern === "dots"
      ? "radial-gradient(circle, var(--nq-line-strong, var(--nq-line)) 1px, transparent 1.5px)"
      : "linear-gradient(to right, var(--nq-line) 1px, transparent 1px), linear-gradient(to bottom, var(--nq-line) 1px, transparent 1px)";
  const mask = "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)";
  return (
    <div data-slot="grid-background" className={cn("relative isolate overflow-hidden", className)} {...props}>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: image, backgroundSize: `${cell}px ${cell}px`, maskImage: fade ? mask : undefined, WebkitMaskImage: fade ? mask : undefined }} />
      {children}
    </div>
  );
}

/* ───────────────────────────────── HowItWorks ───────────────────────────────── */

export interface HowItWorksStep {
  title: ReactNode;
  description?: ReactNode;
  /** Optional icon inside the number badge instead of the number. */
  icon?: ReactNode;
  /** Optional picture under the text. */
  media?: ReactNode;
}

export interface HowItWorksProps extends Omit<ComponentProps<"section">, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  steps: readonly HowItWorksStep[];
  /** "row": steps side by side from 48rem, joined by a line. "column": always a vertical timeline. Default "row". */
  layout?: "row" | "column";
  titleAs?: "h2" | "h3";
}

/**
 * Three or four numbered steps that explain how to get started. Numbers are Latin digits in both languages; the joining
 * line follows the reading direction. Use `FeatureStory` when one feature needs a whole story of its own.
 */
export function HowItWorks({ eyebrow, title, description, steps, layout = "row", titleAs: Title = "h2", className, ...props }: HowItWorksProps) {
  const headingId = useId();
  const row = layout === "row";
  return (
    <section data-slot="how-it-works" aria-labelledby={title ? headingId : undefined} className={cn("@container flex min-w-0 flex-col gap-8", className)} {...props}>
      {title || eyebrow || description ? <SectionIntro eyebrow={eyebrow} title={title} description={description} headingId={headingId} as={Title} /> : null}
      <ol className={cn("grid gap-6", row ? "@3xl:grid-cols-[repeat(var(--steps),minmax(0,1fr))] @3xl:gap-8" : "max-w-2xl")} style={{ "--steps": steps.length } as CSSProperties}>
        {steps.map((step, i) => (
          <li key={i} className={cn("relative flex min-w-0 gap-4", row ? "@3xl:flex-col" : "")}>
            {i < steps.length - 1 ? <span aria-hidden className={cn("absolute bg-border", row ? "start-5 top-11 bottom-[-1.5rem] w-px @3xl:start-12 @3xl:top-5 @3xl:bottom-auto @3xl:h-px @3xl:w-[calc(100%-2rem)]" : "start-5 top-11 bottom-[-1.5rem] w-px")} /> : null}
            <span dir="ltr" className="relative z-1 grid size-10 shrink-0 place-items-center rounded-full border border-border bg-nq-surface font-semibold text-body-sm text-nq-brand tabular-nums [&_svg]:size-4">
              {step.icon ?? i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-2">
              <h3 className="font-semibold text-foreground text-h3">{step.title}</h3>
              {step.description ? <p className="text-body-sm text-nq-fg-body">{step.description}</p> : null}
              {step.media ? <div className="mt-2">{step.media}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function SectionIntro({ eyebrow, title, description, headingId, as: Title, align = "start" }: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; headingId: string; as: "h2" | "h3"; align?: "start" | "center" }) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-2", align === "center" && "mx-auto items-center text-center")}>
      {eyebrow ? <div className="eyebrow text-nq-brand">{eyebrow}</div> : null}
      {title ? (
        <Title id={headingId} className="font-semibold text-foreground text-h2 text-balance">
          {title}
        </Title>
      ) : null}
      {description ? <p className="text-body-sm text-nq-fg-body text-pretty">{description}</p> : null}
    </div>
  );
}

/* ───────────────────────────────── FeatureGrid ───────────────────────────────── */

export interface FeatureGridItem {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Makes the whole tile a link. */
  href?: string;
  /** Wide tile: spans two columns from 48rem. */
  wide?: boolean;
}

export interface FeatureGridProps extends Omit<ComponentProps<"section">, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  features: readonly FeatureGridItem[];
  /** Columns at the widest. Default 3. */
  columns?: 2 | 3 | 4;
  /** "cards": bordered tiles. "plain": no borders, icons only. Default "cards". */
  variant?: "cards" | "plain";
  align?: "start" | "center";
  titleAs?: "h2" | "h3";
}

const GRID_COLS = { 2: "@2xl:grid-cols-2", 3: "@2xl:grid-cols-2 @4xl:grid-cols-3", 4: "@2xl:grid-cols-2 @4xl:grid-cols-4" } as const;

/**
 * A grid of short feature tiles: an icon, a title and one or two lines. It adapts to its container, not the screen, and
 * every tile uses the full width of its cell. For one feature with a picture use `FeatureStory`.
 */
export function FeatureGrid({ eyebrow, title, description, features, columns = 3, variant = "cards", align = "start", titleAs: Title = "h2", className, ...props }: FeatureGridProps) {
  const headingId = useId();
  const ar = useIsArabic();
  return (
    <section data-slot="feature-grid" aria-labelledby={title ? headingId : undefined} className={cn("@container flex min-w-0 flex-col gap-8", className)} {...props}>
      {title || eyebrow || description ? <SectionIntro eyebrow={eyebrow} title={title} description={description} headingId={headingId} as={Title} align={align} /> : null}
      <ul className={cn("grid grid-cols-1 gap-4", GRID_COLS[columns])}>
        {features.map((f, i) => {
          const body = (
            <>
              {f.icon ? <span className="grid size-9 shrink-0 place-items-center rounded-control bg-nq-selected text-nq-brand [&_svg]:size-5">{f.icon}</span> : null}
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-1 font-semibold text-foreground text-label">
                  {f.title}
                  {f.href ? <ArrowRight aria-hidden className={cn("size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5", ar && "-scale-x-100 group-hover:-translate-x-0.5")} /> : null}
                </span>
                {f.description ? <span className="text-body-sm text-nq-fg-body">{f.description}</span> : null}
              </span>
            </>
          );
          const cls = cn("group flex h-full min-w-0 flex-col items-start gap-3 p-4 text-start", variant === "cards" && "rounded-card border border-border bg-card", f.href && "outline-none transition-colors hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus");
          return (
            <li key={i} className={cn("min-w-0", f.wide && "@2xl:col-span-2")}>
              {f.href ? (
                <a href={f.href} className={cls}>
                  {body}
                </a>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────────────────────────── CtaBanner ───────────────────────────────── */

export interface CtaBannerProps extends Omit<ComponentProps<"section">, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /** The main button. */
  action: ReactNode;
  /** A quieter second link or button. */
  secondaryAction?: ReactNode;
  /** A line of reassurance under the buttons: "No card needed". */
  note?: ReactNode;
  /** "brand": brand-tinted panel with an aurora glow. "neutral": quiet surface. Default "brand". */
  tone?: "brand" | "neutral";
  /** "center" (default) stacks and centres; "split" puts the buttons at the inline end from 48rem. */
  layout?: "center" | "split";
  titleAs?: "h2" | "h3";
}

/**
 * The closing call to action of a page: one clear ask, one main button, optionally a quieter second one. Give it a
 * single `action`; two equal buttons make the choice harder, not easier.
 */
export function CtaBanner({ title, description, action, secondaryAction, note, tone = "brand", layout = "center", titleAs: Title = "h2", className, ...props }: CtaBannerProps) {
  const headingId = useId();
  const split = layout === "split";
  const inner = (
    <div className={cn("relative flex min-w-0 flex-col gap-6 p-6 @2xl:p-10", split ? "@2xl:flex-row @2xl:items-center @2xl:justify-between" : "items-center text-center")}>
      <div className={cn("flex min-w-0 max-w-xl flex-col gap-2", !split && "items-center")}>
        <Title id={headingId} className="font-semibold text-foreground text-h2 text-balance">
          {title}
        </Title>
        {description ? <p className="text-body-sm text-nq-fg-body text-pretty">{description}</p> : null}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-2", split ? "@2xl:items-end" : "items-center")}>
        <div className={cn("flex flex-wrap gap-2", !split && "justify-center")}>
          {action}
          {secondaryAction}
        </div>
        {note ? <p className="text-caption text-muted-foreground">{note}</p> : null}
      </div>
    </div>
  );
  return (
    <section data-slot="cta-banner" aria-labelledby={headingId} className={cn("@container w-full overflow-hidden rounded-card border", tone === "brand" ? "border-nq-brand/30 bg-nq-selected" : "border-border bg-nq-surface-soft", className)} {...props}>
      {tone === "brand" ? <AuroraBackground fade={false}>{inner}</AuroraBackground> : inner}
    </section>
  );
}

/* ───────────────────────────────── PricingPacks ───────────────────────────────── */

export interface PricingPack {
  id: string;
  /** "Starter pack". */
  name: ReactNode;
  /** Units the pack gives: 500 credits. */
  credits: number;
  /** Free extra units on top. */
  bonus?: number;
  price: number;
  currency?: string;
  /** The best value pack: brand-tinted, on at most one. */
  highlighted?: boolean;
  /** "Best value". */
  badge?: ReactNode;
  /** One line: "About 50 reports". */
  description?: ReactNode;
}

export interface PricingPacksLabels {
  buy?: string;
  bonus?: string;
  unit?: string;
  perUnit?: string;
}

const PACK_STRINGS = {
  en: { buy: "Buy", bonus: "bonus", unit: "credits", perUnit: "per credit" },
  ar: { buy: "شراء", bonus: "إضافي", unit: "رصيد", perUnit: "للرصيد" },
} as const;

export interface PricingPacksProps extends Omit<ComponentProps<"section">, "title"> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  packs: readonly PricingPack[];
  /** Called when someone picks a pack. It may be async; the button shows loading until it settles. */
  onPurchase?: (pack: PricingPack) => void | Promise<void>;
  /** Show what each unit costs. Default true. */
  showUnitPrice?: boolean;
  labels?: PricingPacksLabels;
  titleAs?: "h2" | "h3";
}

/**
 * One-off bundles of credits, tokens or seats. Not a subscription: there is no period, so no plan comparison. Use
 * `PlanGrid` and `PlanCard` for recurring plans. Amounts use the Nasaq digit set and the pack's currency.
 */
export function PricingPacks({ eyebrow, title, description, packs, onPurchase, showUnitPrice = true, labels, titleAs: Title = "h2", className, ...props }: PricingPacksProps) {
  const ar = useIsArabic();
  const t = { ...PACK_STRINGS[ar ? "ar" : "en"], ...labels };
  const headingId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const nf = useMemo(() => new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en"), [ar]);
  return (
    <section data-slot="pricing-packs" aria-labelledby={title ? headingId : undefined} className={cn("@container flex min-w-0 flex-col gap-8", className)} {...props}>
      {title || eyebrow || description ? <SectionIntro eyebrow={eyebrow} title={title} description={description} headingId={headingId} as={Title} /> : null}
      <ul className="grid grid-cols-1 gap-4 @2xl:grid-cols-[repeat(var(--packs),minmax(0,1fr))]" style={{ "--packs": Math.min(packs.length, 4) } as CSSProperties}>
        {packs.map((pack) => {
          const total = pack.credits + (pack.bonus ?? 0);
          const unit = total > 0 ? pack.price / total : 0;
          return (
            <li key={pack.id} className="min-w-0">
              <article className={cn("flex h-full min-w-0 flex-col gap-4 rounded-card p-5", pack.highlighted ? "border border-nq-brand/40 bg-nq-selected" : "border border-border bg-card")}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground text-h3">{pack.name}</h3>
                  {pack.badge ? <Badge variant="brand">{pack.badge}</Badge> : null}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <bdi className="font-semibold text-display text-foreground tabular-nums">{nf.format(pack.credits)}</bdi>
                    <span className="text-body-sm text-muted-foreground">{t.unit}</span>
                  </div>
                  {pack.bonus ? (
                    <div className="text-caption text-nq-success-text">
                      <bdi>+{nf.format(pack.bonus)}</bdi> {t.bonus}
                    </div>
                  ) : null}
                  {pack.description ? <p className="text-body-sm text-nq-fg-body">{pack.description}</p> : null}
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <div className="flex flex-col gap-0.5">
                    <Price amount={pack.price} currency={pack.currency ?? defaultCurrency(ar ? "ar" : "en")} size="lg" />
                    {showUnitPrice && unit > 0 ? (
                      <span className="text-caption text-muted-foreground">
                        <bdi dir="ltr">{new Intl.NumberFormat(ar ? "ar-u-nu-latn" : "en", { style: "currency", currency: pack.currency ?? defaultCurrency(ar ? "ar" : "en"), maximumFractionDigits: 3 }).format(unit)}</bdi> {t.perUnit}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    variant={pack.highlighted ? "primary" : "secondary"}
                    className="w-full"
                    loading={busy === pack.id}
                    disabled={busy !== null && busy !== pack.id}
                    onClick={async () => {
                      setBusy(pack.id);
                      try {
                        await onPurchase?.(pack);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {t.buy}
                  </Button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────────────────────────────── AppMockupHero ───────────────────────────────── */

export interface AppMockupHeroProps extends Omit<ComponentProps<"section">, "title"> {
  eyebrow?: ReactNode;
  /** The headline. One per page: it renders an h1. */
  title: ReactNode;
  description?: ReactNode;
  /** Buttons under the text. */
  actions?: ReactNode;
  /** A line of proof under the buttons: logos, a rating, "Free for 14 days". */
  proof?: ReactNode;
  /** The product picture, inside a `ScreenshotFrame`: an `<img>` or live markup. */
  mockup: ReactNode;
  /** Frame style. Default "browser". */
  frame?: ScreenshotFrameProps["variant"];
  /** Address or window title in the frame. */
  frameTitle?: ReactNode;
  /** Accessible description of the mockup. */
  mockupLabel?: string;
  /** Backdrop. Default "aurora". */
  background?: "aurora" | "grid" | "none";
}

/**
 * A page opener: headline, buttons and a framed picture of the app, over a soft backdrop. The mockup sits below the text and
 * fades into the page. For a plain headline hero without a mockup use the existing hero components.
 */
export function AppMockupHero({ eyebrow, title, description, actions, proof, mockup, frame = "browser", frameTitle, mockupLabel, background = "aurora", className, ...props }: AppMockupHeroProps) {
  const content = (
    <div className="@container mx-auto flex w-full max-w-5xl min-w-0 flex-col items-center gap-10 px-4 pt-14 pb-0 text-center @2xl:pt-20">
      <div className="flex min-w-0 max-w-2xl flex-col items-center gap-4">
        {eyebrow ? <div className="eyebrow text-nq-brand">{eyebrow}</div> : null}
        <h1 className="font-semibold text-display text-foreground text-balance">{title}</h1>
        {description ? <p className="text-body text-nq-fg-body text-pretty">{description}</p> : null}
        {actions ? <div className="flex flex-wrap justify-center gap-2 pt-2">{actions}</div> : null}
        {proof ? <div className="text-caption text-muted-foreground">{proof}</div> : null}
      </div>
      <div className="w-full min-w-0 max-w-4xl" style={{ maskImage: "linear-gradient(to bottom, black 70%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent)" }}>
        <ScreenshotFrame variant={frame} title={frameTitle} label={mockupLabel} className="shadow-floating">
          {mockup}
        </ScreenshotFrame>
      </div>
    </div>
  );
  return (
    <section data-slot="app-mockup-hero" className={cn("w-full min-w-0", className)} {...props}>
      {background === "aurora" ? <AuroraBackground>{content}</AuroraBackground> : background === "grid" ? <GridBackground>{content}</GridBackground> : content}
    </section>
  );
}

/* ───────────────────────────────── SessionPlayback ───────────────────────────────── */

export interface SessionPlaybackLabels {
  play?: string;
  pause?: string;
  restart?: string;
  position?: string;
  transcript?: string;
}

const SESSION_STRINGS = {
  en: { play: "Play", pause: "Pause", restart: "Replay", position: "Playback position", transcript: "AI session" },
  ar: { play: "تشغيل", pause: "إيقاف مؤقت", restart: "إعادة التشغيل", position: "موضع التشغيل", transcript: "جلسة الذكاء الاصطناعي" },
} as const;

export interface SessionPlaybackProps extends Omit<ComponentProps<"figure">, "title"> {
  /** The scripted conversation. */
  events: readonly SessionEvent[];
  /** Title in the header bar. */
  title?: ReactNode;
  /** Start playing when it scrolls into view. Default true; off under reduced motion, which shows the full session. */
  autoPlay?: boolean;
  /** Start again after a pause when it ends. Default false. */
  loop?: boolean;
  timing?: SessionTiming;
  /** Names shown beside messages. */
  names?: { user?: string; assistant?: string };
  /** Height of the transcript area. Default 22rem. */
  height?: string;
  onEnd?: () => void;
  labels?: SessionPlaybackLabels;
  /** Language of the script text, for word splitting. Default the active locale. */
  lang?: string;
}

/**
 * A scripted AI session that plays back like a recording: messages type out word by word, tool steps appear as they run,
 * and there is a play/pause button and a scrubber. It is a marketing demo, not a live chat (use `Chat` or `CopilotChat` for that).
 * Arabic text reveals whole words, never letters. Under reduced motion the whole session is shown at once.
 */
export function SessionPlayback({ events, title, autoPlay = true, loop = false, timing, names, height = "22rem", onEnd, labels, lang, className, ...props }: SessionPlaybackProps) {
  const ar = useIsArabic();
  const t = { ...SESSION_STRINGS[ar ? "ar" : "en"], ...labels };
  const locale = lang ?? (ar ? "ar" : "en");
  const reduced = usePrefersReducedMotion();
  const timeline = useMemo(() => sessionTimeline(events, locale, timing), [events, locale, timing]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef(0);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const started = useRef(false);

  const seek = (ms: number) => {
    timeRef.current = ms;
    setTime(ms);
  };

  useEffect(() => {
    if (!autoPlay || reduced || started.current) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setPlaying(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true;
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay, reduced]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let holdUntil = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (holdUntil) {
        if (now >= holdUntil) {
          holdUntil = 0;
          seek(0);
        }
      } else {
        const next = Math.min(timeline.total, timeRef.current + dt);
        seek(next);
        if (next >= timeline.total) {
          onEndRef.current?.();
          if (loop) holdUntil = now + 2500;
          else {
            setPlaying(false);
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, timeline.total, loop]);

  const shownTime = reduced ? timeline.total : time;
  const states = sessionStateAt(timeline, shownTime);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shownTime === timeline.total ? -1 : states.filter((s) => s.started).length, states.reduce((n, s) => n + s.visibleWords, 0)]);

  const finished = shownTime >= timeline.total;
  const you = names?.user ?? (ar ? "أنت" : "You");
  const ai = names?.assistant ?? (ar ? "المساعد" : "Assistant");
  return (
    <figure ref={rootRef} data-slot="session-playback" className={cn("flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card", className)} {...props}>
      <figcaption className="flex items-center gap-2 border-border border-b bg-nq-surface-soft px-3 py-2 text-caption text-muted-foreground">
        <Sparkles aria-hidden className="size-3.5 text-nq-brand" />
        <span className="min-w-0 flex-1 truncate">{title ?? t.transcript}</span>
      </figcaption>
      <div ref={scrollRef} role="log" aria-label={t.transcript} className="flex flex-col gap-3 overflow-y-auto p-4" style={{ height }}>
        {events.map((event, i) => {
          const state = states[i];
          if (!state?.started) return null;
          if (event.role === "tool" || event.role === "status") {
            return (
              <div key={i} className={cn("flex min-w-0 items-center gap-2 rounded-control border border-border bg-nq-surface-soft px-2.5 py-1.5 text-caption text-muted-foreground", !state.done && !reduced && "animate-pulse")}>
                <Wrench aria-hidden className="size-3.5 shrink-0" />
                {event.title ? <span className="font-medium text-foreground">{event.title}</span> : null}
                <span dir="auto" className="min-w-0 truncate">
                  {event.text}
                </span>
              </div>
            );
          }
          const tokens = splitText(event.text, "word", locale).tokens;
          let shown = 0;
          const text = tokens
            .filter((token) => {
              if (token.space) return shown > 0 && shown < state.visibleWords;
              if (shown >= state.visibleWords) return false;
              shown += 1;
              return true;
            })
            .map((token) => token.text)
            .join("");
          const mine = event.role === "user";
          return (
            <div key={i} className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
              <span className="text-caption text-muted-foreground">{mine ? you : ai}</span>
              <p dir="auto" className={cn("max-w-[85%] rounded-card px-3 py-2 text-body-sm text-start", mine ? "bg-nq-selected text-foreground" : "bg-secondary text-nq-fg-body")}>
                {text}
                {!state.done && !reduced ? <span aria-hidden className="ms-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground" /> : null}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 border-border border-t px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={finished ? t.restart : playing ? t.pause : t.play}
          onClick={() => {
            if (finished) {
              seek(0);
              setPlaying(true);
            } else setPlaying(!playing);
          }}
        >
          {finished ? <RotateCcw aria-hidden className="rtl:-scale-x-100" /> : playing ? <Pause aria-hidden /> : <Play aria-hidden className="rtl:-scale-x-100" />}
        </Button>
        <Slider
          aria-label={t.position}
          className="min-w-0 flex-1"
          min={0}
          max={100}
          step={1}
          value={timeline.total ? Math.round((shownTime / timeline.total) * 100) : 0}
          showValue={false}
          onValueChange={(v) => {
            const ratio = (Array.isArray(v) ? (v[0] ?? 0) : v) / 100;
            seek(sessionTimeFromRatio(timeline, ratio));
          }}
        />
        <span dir="ltr" className="w-20 shrink-0 text-end text-caption text-muted-foreground tabular-nums">
          {formatSessionClock(shownTime)} / {formatSessionClock(timeline.total)}
        </span>
      </div>
    </figure>
  );
}
