"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, NotebookText, X } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../button";
import { Icon } from "../icon";
import { formatNumber } from "../numeric";
import { Tooltip } from "../tooltip";
import { clampIndex, type Deck, formatElapsed, keyAction, progressOf, slideTitle, swipeAction } from "./presentation-math";
import { type PresentationLabels, usePresentationStrings } from "./presentation-strings";
import { SlideView } from "./slide-view";

export interface DeckPlayerProps {
  deck: Deck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Controlled slide index (zero based). */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Ask the browser for full screen when the player opens. Default true. */
  fullscreen?: boolean;
  /** Start with the presenter notes panel open. Default false. */
  defaultShowNotes?: boolean;
  labels?: PresentationLabels;
}

/**
 * Plays a deck full screen. Arrow keys, Space, Page Up and Down, Home and End move between slides (arrows follow
 * the reading direction), swiping works on touch, a progress bar and counter show where you are, `N` opens the
 * presenter notes with the next slide and a timer, `F` toggles full screen and Esc exits.
 */
export function DeckPlayer({ deck, open, onOpenChange, index: indexProp, defaultIndex = 0, onIndexChange, fullscreen = true, defaultShowNotes = false, labels }: DeckPlayerProps) {
  const { locale, isRtl, t } = usePresentationStrings(labels);
  const n = (v: number) => formatNumber(v, locale);
  const count = deck.slides.length;
  const [inner, setInner] = useState(defaultIndex);
  const index = clampIndex(indexProp ?? inner, count);
  const slide = deck.slides[index];
  const upNext = deck.slides[index + 1];

  const [notes, setNotes] = useState(defaultShowNotes);
  const [isFull, setIsFull] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const popup = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const go = (next: number) => {
    const target = clampIndex(next, count);
    if (target === index) return;
    if (indexProp === undefined) setInner(target);
    onIndexChange?.(target);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void popup.current?.requestFullscreen?.().catch(() => undefined);
  };

  // Full screen follows the player: on open, and released on close.
  useEffect(() => {
    if (!open) return;
    setElapsed(0);
    const el = popup.current;
    if (fullscreen && el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    const onChange = () => setIsFull(document.fullscreenElement === popup.current);
    document.addEventListener("fullscreenchange", onChange);
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      clearInterval(clock);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [open, fullscreen]);

  // Controls fade after a moment without pointer movement.
  const wake = () => {
    setChrome(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setChrome(false), 2600);
  };
  useEffect(() => {
    if (!open) return;
    wake();
    return () => clearTimeout(idle.current);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = keyAction(e.key, isRtl);
    if (!action) return;
    // Space and Enter belong to a focused button; the stage and the dialog body use them to advance.
    if ((e.key === " " || e.key === "Enter") && e.target instanceof HTMLElement && e.target.closest("button")) return;
    e.preventDefault();
    wake();
    if (action === "next") go(index + 1);
    else if (action === "prev") go(index - 1);
    else if (action === "first") go(0);
    else if (action === "last") go(count - 1);
    else if (action === "notes") setNotes((v) => !v);
    else if (action === "fullscreen") toggleFullscreen();
  };

  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const action = swipeAction(e.clientX - start.x, e.clientY - start.y, isRtl);
    if (action === "next") go(index + 1);
    else if (action === "prev") go(index - 1);
  };

  const atStart = index === 0;
  const atEnd = index >= count - 1;
  const chromeClass = cn("transition-opacity duration-200 ease-nq", chrome ? "opacity-100" : "opacity-0 focus-within:opacity-100 hover:opacity-100");
  // Space taken by the controls and the notes panel, so the slide keeps 16:9 inside what is left.
  const reserved = notes ? "19rem" : "6rem";

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Popup
          ref={popup}
          initialFocus={stage}
          dir={isRtl ? "rtl" : "ltr"}
          aria-label={deck.title || t.player}
          data-slot="deck-player"
          onKeyDown={onKeyDown}
          onPointerMove={wake}
          className="fixed inset-0 z-[70] flex flex-col bg-nq-fg text-nq-bg outline-none"
        >
          <div
            role="progressbar"
            aria-label={t.progress}
            aria-valuemin={1}
            aria-valuemax={Math.max(1, count)}
            aria-valuenow={count ? index + 1 : 0}
            aria-valuetext={count ? t.slideOf(n(index + 1), n(count)) : t.emptyDeck}
            className="h-1 w-full shrink-0 bg-nq-bg/15"
          >
            <div className="h-full bg-primary transition-[width] duration-200 ease-nq" style={{ width: `${progressOf(index, count) * 100}%` }} />
          </div>

          <div
            ref={stage}
            tabIndex={-1}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipe.current = null)}
            style={{ touchAction: "pan-y" }}
            className="relative flex min-h-0 flex-1 items-center justify-center p-3 outline-none sm:p-6"
          >
            {slide ? (
              <div key={slide.id} className="w-full" style={{ maxWidth: `calc((100dvh - ${reserved}) * 16 / 9)` }}>
                <SlideView slide={slide} className="rounded-card shadow-floating" />
              </div>
            ) : (
              <p className="text-body text-nq-bg/70">{t.emptyDeck}</p>
            )}
          </div>

          <div className="sr-only" role="status" aria-live="polite">
            {slide ? `${t.slideOf(n(index + 1), n(count))}: ${slideTitle(slide, t.untitled)}` : ""}
          </div>

          {notes ? (
            <section aria-label={t.notes} className="grid max-h-[13rem] shrink-0 grid-cols-[minmax(0,1fr)] gap-4 overflow-y-auto border-t border-nq-bg/15 bg-nq-fg p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="min-w-0">
                <p className="mb-1 text-caption font-medium text-nq-bg/60">{t.notes}</p>
                <p dir="auto" className="whitespace-pre-line text-start text-body text-nq-bg">
                  {slide?.notes?.trim() ? slide.notes : <span className="text-nq-bg/50">{t.noNotes}</span>}
                </p>
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="mb-1 text-caption font-medium text-nq-bg/60">{t.upNext}</p>
                {upNext ? (
                  <SlideView slide={upNext} decorative className="rounded-control border border-nq-bg/20" />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-control border border-dashed border-nq-bg/30 text-caption text-nq-bg/60">{t.endOfDeck}</div>
                )}
              </div>
            </section>
          ) : null}

          <div className={cn("flex shrink-0 items-center gap-2 px-3 py-2 sm:px-4", chromeClass)}>
            <Tooltip content={t.close}>
              <Button size="icon-sm" variant="ghost" aria-label={t.close} onClick={() => onOpenChange(false)} className="text-nq-bg hover:bg-nq-bg/10">
                <X aria-hidden />
              </Button>
            </Tooltip>
            <span dir="ltr" className="text-caption text-nq-bg/60 tabular-nums" aria-label={t.elapsed}>
              {formatElapsed(elapsed)}
            </span>
            <div className="mx-auto flex items-center gap-2">
              <Button size="icon-sm" variant="ghost" aria-label={t.previous} disabled={atStart} onClick={() => go(index - 1)} className="text-nq-bg hover:bg-nq-bg/10">
                <Icon icon={ChevronLeft} directional />
              </Button>
              <span className="min-w-16 text-center text-label text-nq-bg tabular-nums" aria-hidden>
                {count ? `${n(index + 1)} / ${n(count)}` : "0"}
              </span>
              <Button size="icon-sm" variant="ghost" aria-label={t.next} disabled={atEnd} onClick={() => go(index + 1)} className="text-nq-bg hover:bg-nq-bg/10">
                <Icon icon={ChevronRight} directional />
              </Button>
            </div>
            <Tooltip content={notes ? t.hideNotes : t.showNotes}>
              <Button size="icon-sm" variant="ghost" aria-label={notes ? t.hideNotes : t.showNotes} aria-pressed={notes} onClick={() => setNotes((v) => !v)} className={cn("text-nq-bg hover:bg-nq-bg/10", notes && "bg-nq-bg/15")}>
                <NotebookText aria-hidden />
              </Button>
            </Tooltip>
            <Tooltip content={isFull ? t.exitFullscreen : t.enterFullscreen}>
              <Button size="icon-sm" variant="ghost" aria-label={isFull ? t.exitFullscreen : t.enterFullscreen} onClick={toggleFullscreen} className="text-nq-bg hover:bg-nq-bg/10">
                {isFull ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
              </Button>
            </Tooltip>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
