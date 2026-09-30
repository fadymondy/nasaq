"use client";

import {
  type ComponentProps,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { usePrefersReducedMotion } from "../ai-states";
import {
  countTextTokens,
  marqueeCopies,
  marqueeDuration,
  nextFlipIndex,
  splitText,
  textStaggerDelay,
  type TextSplitMode,
} from "./text-effects-model";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function useLocale(): string {
  return useOptionalNasaq()?.locale ?? "en";
}

/** A hover / focus latch: the effect holds still while a person is pointing at or focused inside it. */
function useHalt() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return {
    halted: hovered || focused,
    handlers: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}

/* ------------------------------------------------------------------ TextFlip */

export interface TextFlipProps extends Omit<ComponentProps<"span">, "children"> {
  /** The phrases to rotate through. Screen readers get all of them as one list. */
  phrases: readonly string[];
  /** Milliseconds each phrase stays. Default 2600. */
  interval?: number;
  /**
   * How each phrase is cut into pieces that flip one after the other. "word" (default) flips word by word; "grapheme"
   * flips character by character but Arabic and other joining scripts always flip word by word, so letters never separate.
   */
  by?: TextSplitMode;
  /** Stop rotating. Rotation also stops while the pointer or focus is on the text, and under reduced motion. */
  paused?: boolean;
  /** Start again from the first phrase after the last. Default true. */
  loop?: boolean;
  /** Called with the index of the phrase that just became visible. */
  onIndexChange?: (index: number) => void;
  /** Language tag for the phrases when it differs from the page ("ar"). */
  lang?: string;
}

const FLIP_OUT_MS = 240;

/**
 * A short phrase that flips to the next one, like a departures board: "Ship faster / calmer / together". All phrases share
 * one grid cell, so the width is the widest phrase and nothing around it jumps. Under `prefers-reduced-motion`
 * it does not rotate at all and shows the first phrase.
 */
export function TextFlip({ phrases, interval = 2600, by = "word", paused = false, loop = true, onIndexChange, lang, className, ...props }: TextFlipProps) {
  const locale = useLocale();
  const reduced = usePrefersReducedMotion();
  const { halted, handlers } = useHalt();
  const [index, setIndex] = useState(0);
  const notify = useRef(onIndexChange);
  notify.current = onIndexChange;
  const list = useMemo(() => phrases.map((phrase) => splitText(phrase, by, lang ?? locale)), [phrases, by, lang, locale]);

  const running = !reduced && !paused && !halted && phrases.length > 1;
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = nextFlipIndex(current, phrases.length, loop);
        if (next !== current) notify.current?.(next);
        return next;
      });
    }, Math.max(800, interval));
    return () => window.clearInterval(id);
  }, [running, interval, phrases.length, loop]);

  const active = Math.min(index, Math.max(0, phrases.length - 1));
  return (
    <span
      data-slot="text-flip"
      data-reduced={reduced || undefined}
      lang={lang}
      className={cn("relative inline-grid align-baseline [perspective:600px]", className)}
      {...handlers}
      {...props}
    >
      <span className="sr-only">{phrases.join(locale.startsWith("ar") ? "، " : ", ")}</span>
      {list.map((phrase, i) => {
        const isActive = i === active;
        const count = countTextTokens(phrase.tokens);
        return (
          <span key={`${i}-${phrases[i]}`} aria-hidden="true" data-active={isActive || undefined} className="col-start-1 row-start-1 whitespace-nowrap [transform-style:preserve-3d]">
            {phrase.tokens.map((token, k) => {
              if (token.space) return token.text;
              const delay = textStaggerDelay(token.order, count, 45, 360);
              const style: CSSProperties = reduced
                ? { opacity: isActive ? 1 : 0 }
                : {
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "none" : "rotateX(-90deg) translateY(0.35em)",
                    transitionProperty: "transform, opacity",
                    transitionDuration: isActive ? "420ms, 320ms" : `${FLIP_OUT_MS}ms, ${FLIP_OUT_MS}ms`,
                    transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
                    transitionDelay: `${isActive ? FLIP_OUT_MS + delay : delay}ms`,
                  };
              return (
                <span key={k} className="inline-block [backface-visibility:hidden]" style={style}>
                  {token.text}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ TextShimmer */

export interface TextShimmerProps extends Omit<ComponentProps<"span">, "children"> {
  children: ReactNode;
  /** Seconds for one sweep. Default 2.4. */
  duration?: number;
  /** Hold the light still. */
  paused?: boolean;
}

/**
 * Text with a band of light that sweeps across it, for "Thinking", "Syncing" or a call to attention. It is one element with
 * one gradient (no per-letter boxes), so Arabic keeps its joins. The sweep follows the reading direction and does not run under
 * reduced motion, where the text is simply shown in the foreground colour. For a block of placeholder lines use `AiShimmer`.
 */
export function TextShimmer({ children, duration = 2.4, paused = false, className, style, ...props }: TextShimmerProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const still = reduced || paused;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || paused || typeof el.animate !== "function") return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const anim = el.animate(
      { backgroundPosition: rtl ? ["0% 0", "100% 0"] : ["100% 0", "0% 0"] },
      { duration: Math.max(0.4, duration) * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" },
    );
    return () => anim.cancel();
  }, [reduced, paused, duration]);
  return (
    <span
      ref={ref}
      data-slot="text-shimmer"
      data-still={still || undefined}
      className={cn(
        "inline-block",
        reduced
          ? "text-foreground"
          : "bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [background-size:250%_100%] [background-image:linear-gradient(100deg,var(--nq-fg-muted)_35%,var(--nq-fg)_50%,var(--nq-fg-muted)_65%)] forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentColor]",
        className,
      )}
      style={style as CSSProperties}
      {...props}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Marquee */

export interface MarqueeProps extends Omit<ComponentProps<"div">, "children"> {
  /** The items that scroll: logos, quotes, tags. They are repeated to fill the width; the repeats are hidden from assistive tech. */
  children: ReactNode;
  /** Pixels per second. Default 48. */
  speed?: number;
  /** Which way the content travels: "start" toward the inline start (left in English, right in Arabic), "end" the other way. Default "start". */
  direction?: "start" | "end";
  /** Hold still while the pointer or focus is on it. Default true. */
  pauseOnHover?: boolean;
  /** Stop scrolling. */
  paused?: boolean;
  /** Space between items in pixels. Default 32. */
  gap?: number;
  /** Fade the two edges. Default true. */
  fade?: boolean;
}

/**
 * A row that scrolls forever, for logos and short quotes. Direction is logical, so a marquee that moves toward the start
 * reads correctly in both English and Arabic. Under `prefers-reduced-motion` nothing moves: the items wrap into a static row.
 */
export function Marquee({ children, speed = 48, direction = "start", pauseOnHover = true, paused = false, gap = 32, fade = true, className, style, ...props }: MarqueeProps) {
  const reduced = usePrefersReducedMotion();
  const { halted, handlers } = useHalt();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<Animation | null>(null);
  const [size, setSize] = useState({ container: 0, copy: 0 });

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const copy = copyRef.current;
    if (!root || !copy || typeof ResizeObserver === "undefined") return;
    const measure = () => setSize({ container: root.clientWidth, copy: copy.getBoundingClientRect().width });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [reduced, gap, children]);

  const copies = reduced ? 1 : marqueeCopies(size.container, size.copy);
  useEffect(() => {
    const track = trackRef.current;
    animRef.current = null;
    if (!track || reduced || typeof track.animate !== "function" || !(size.copy > 0)) return;
    const rtl = getComputedStyle(track).direction === "rtl";
    const leftward = (direction === "start") === !rtl;
    const w = size.copy;
    const from = leftward ? (rtl ? w : 0) : rtl ? 0 : -w;
    const to = leftward ? (rtl ? 0 : -w) : rtl ? w : 0;
    const anim = track.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], {
      duration: marqueeDuration(w, speed) * 1000,
      iterations: Number.POSITIVE_INFINITY,
      easing: "linear",
    });
    animRef.current = anim;
    return () => anim.cancel();
  }, [reduced, size.copy, speed, direction]);

  const stopped = paused || (pauseOnHover && halted);
  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (stopped) anim.pause();
    else anim.play();
  }, [stopped, size.copy, reduced, speed, direction]);

  return (
    <div
      ref={rootRef}
      data-slot="marquee"
      data-static={reduced || undefined}
      data-paused={stopped || undefined}
      className={cn(
        "overflow-hidden",
        fade && !reduced && "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
        className,
      )}
      style={{ ["--marquee-gap" as string]: `${gap}px`, ...style } as CSSProperties}
      {...handlers}
      {...props}
    >
      <div ref={trackRef} className={cn("flex", reduced ? "flex-wrap" : "w-max")}>
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            ref={i === 0 ? copyRef : undefined}
            data-slot="marquee-copy"
            aria-hidden={i === 0 ? undefined : true}
            inert={i === 0 ? undefined : true}
            className={cn("flex items-center gap-(--marquee-gap)", reduced ? "flex-wrap justify-center" : "shrink-0 pe-(--marquee-gap)")}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ TextReveal */

export interface TextRevealProps extends Omit<ComponentProps<"span">, "children"> {
  /** The text to reveal. */
  text: string;
  /** "word" (default) reveals word by word; "grapheme" reveals character by character, except in Arabic and other joining scripts, which stay word by word. */
  by?: TextSplitMode;
  /** Element to render. Default "span". */
  as?: ElementType;
  /** Reveal as soon as it mounts instead of when it scrolls into view. */
  immediate?: boolean;
  /** Milliseconds between pieces. Default 45; the whole reveal is capped at about 900 ms. */
  step?: number;
  lang?: string;
}

/** Text that fades and rises into place piece by piece when it scrolls into view. Under reduced motion it is simply shown. */
export function TextReveal({ text, by = "word", as, immediate = false, step = 45, lang, className, ...props }: TextRevealProps) {
  const Comp = (as ?? "span") as ElementType;
  const locale = useLocale();
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(immediate);
  const { mode, tokens } = useMemo(() => splitText(text, by, lang ?? locale), [text, by, lang, locale]);
  const count = countTextTokens(tokens);

  useEffect(() => {
    if (seen || reduced) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen, reduced]);

  const shown = reduced || seen;
  return (
    <Comp ref={ref} data-slot="text-reveal" data-split={mode} data-shown={shown || undefined} lang={lang} className={className} {...props}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {tokens.map((token, i) => {
          if (token.space) return token.text;
          if (reduced) return token.text;
          return (
            <span
              key={i}
              className="inline-block"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "none" : "translateY(0.4em)",
                filter: shown ? "none" : "blur(4px)",
                transition: "opacity 420ms ease-out, transform 420ms ease-out, filter 420ms ease-out",
                transitionDelay: `${textStaggerDelay(token.order, count, step, 900)}ms`,
              }}
            >
              {token.text}
            </span>
          );
        })}
      </span>
    </Comp>
  );
}

/* ------------------------------------------------------------------ handwritten */

/** Handwriting stack from the system: no font file is bundled. Set `--nq-font-handwriting` to use a font you are licensed to serve. */
const HANDWRITING = 'var(--nq-font-handwriting, "Bradley Hand", "Segoe Print", "Segoe Script", "Comic Sans MS", "Noto Naskh Arabic", cursive)';

export type HandwrittenTone = "note" | "info" | "success" | "brand" | "neutral";

const noteTone: Record<HandwrittenTone, string> = {
  note: "bg-nq-warning-soft border-nq-warning/40",
  info: "bg-nq-info-soft border-nq-info/40",
  success: "bg-nq-success-soft border-nq-success/40",
  brand: "bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface))] border-nq-brand/40",
  neutral: "bg-nq-surface-soft border-nq-line-strong",
};

export interface HandwrittenNoteProps extends ComponentProps<"aside"> {
  /** Colour of the paper. Default "note". */
  tone?: HandwrittenTone;
  /** Tilt in degrees, kept small so text stays readable. Default -2. */
  rotate?: number;
  /** A strip of tape at the top. Default true. */
  tape?: boolean;
  /** Who wrote it, in plain type under the note. */
  author?: ReactNode;
}

/**
 * A margin note that looks written by hand: a slightly tilted paper with a handwriting font, for a tip or a human aside on a
 * marketing page or a document. The font is a system stack (or `--nq-font-handwriting`); the note is plain text for assistive tech.
 */
export function HandwrittenNote({ tone = "note", rotate = -2, tape = true, author, className, style, children, ...props }: HandwrittenNoteProps) {
  return (
    <aside
      data-slot="handwritten-note"
      className={cn("relative inline-block max-w-xs rounded-[3px] border px-4 pb-3 pt-5 text-foreground shadow-floating", noteTone[tone], className)}
      style={{ transform: `rotate(${Math.max(-6, Math.min(6, rotate))}deg)`, ...style }}
      {...props}
    >
      {tape && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -top-2.5 mx-auto h-5 w-16 rotate-2 bg-[color-mix(in_oklab,var(--nq-fg)_14%,transparent)]"
        />
      )}
      <div className="text-h3 leading-snug" style={{ fontFamily: HANDWRITING }}>
        {children}
      </div>
      {author && <div className="mt-2 text-caption text-muted-foreground">{author}</div>}
    </aside>
  );
}

export type HandwrittenMarkKind = "underline" | "circle" | "highlight" | "strike";
export type HandwrittenMarkTone = "brand" | "danger" | "warning" | "success" | "info";

const markTone: Record<HandwrittenMarkTone, string> = {
  brand: "text-nq-brand",
  danger: "text-nq-danger",
  warning: "text-nq-warning",
  success: "text-nq-success",
  info: "text-nq-info",
};

const MARKS: Record<HandwrittenMarkKind, { d: string; viewBox: string; box: string; width: string; opacity?: number }> = {
  underline: { d: "M2 12 C 18 6, 34 16, 52 9 S 84 8, 98 11", viewBox: "0 0 100 20", box: "inset-x-[-2%] -bottom-[0.3em] h-[0.5em]", width: "0.09em" },
  circle: { d: "M50 4 C 82 2, 98 12, 96 22 C 94 34, 60 39, 40 38 C 12 36, 2 27, 5 16 C 9 6, 34 3, 62 4", viewBox: "0 0 100 42", box: "-inset-x-[0.5em] -inset-y-[0.35em]", width: "0.07em" },
  highlight: { d: "M2 20 C 30 17, 60 22, 98 17", viewBox: "0 0 100 40", box: "inset-x-[-3%] inset-y-[0.05em]", width: "0.95em", opacity: 0.28 },
  strike: { d: "M2 22 C 30 16, 60 26, 98 18", viewBox: "0 0 100 40", box: "inset-x-[-2%] inset-y-0", width: "0.08em" },
};

export interface HandwrittenMarkProps extends Omit<ComponentProps<"span">, "children"> {
  /** The words to mark. */
  children: ReactNode;
  /** The hand-drawn stroke: an underline, a loop around, a highlighter swipe or a strike-through. Default "underline". */
  kind?: HandwrittenMarkKind;
  tone?: HandwrittenMarkTone;
  /** Draw the stroke in when it scrolls into view. Off under reduced motion, where it is simply there. Default true. */
  animate?: boolean;
  /** Milliseconds to wait before drawing. */
  delay?: number;
}

/**
 * Marks a few words as if a pen had just done it. The stroke is an SVG path drawn with the reading flow of the page and never
 * touches the text, so it works with Arabic. It draws in once; under `prefers-reduced-motion` it is drawn already.
 */
export function HandwrittenMark({ children, kind = "underline", tone = "brand", animate = true, delay = 0, className, ...props }: HandwrittenMarkProps) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const spec = MARKS[kind];

  useEffect(() => {
    if (seen || reduced || !animate) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setSeen(true);
        observer.disconnect();
      }
    }, { threshold: 0.6 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen, reduced, animate]);

  const drawn = reduced || !animate || seen;
  return (
    <span ref={ref} data-slot="handwritten-mark" data-kind={kind} data-drawn={drawn || undefined} className={cn("relative inline-block", markTone[tone], className)} {...props}>
      <span className="relative z-10 text-foreground">{children}</span>
      <svg aria-hidden="true" focusable="false" viewBox={spec.viewBox} preserveAspectRatio="none" className={cn("pointer-events-none absolute overflow-visible", spec.box, kind === "highlight" ? "z-0" : "z-20")}>
        <path
          d={spec.d}
          pathLength={1}
          fill="none"
          stroke="currentColor"
          strokeOpacity={spec.opacity ?? 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          style={{
            strokeWidth: spec.width,
            strokeDasharray: 1,
            strokeDashoffset: drawn ? 0 : 1,
            transition: reduced || !animate ? "none" : `stroke-dashoffset 650ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
          }}
        />
      </svg>
    </span>
  );
}
