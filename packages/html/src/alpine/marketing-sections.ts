// Marketing sections: the behaviour behind aurora-background (drifting glow), pricing-packs (Buy with a busy state) and
// session-playback (a scripted AI session that replays). how-it-works, feature-grid, cta-banner, app-mockup-hero and
// grid-background are static markup and need no module.
//
//   <div x-data="nqAuroraBackground({ animate: true })"> … <span data-blob></span> … </div>
//   <section x-data="nqPricingPacks({ packs })" x-on:nq-purchase="$event.detail.wait(fetch('/buy/' + $event.detail.pack.id))">
//   <figure x-data="nqSessionPlayback({ events, autoPlay, loop, timing, lang, labels })"> … </figure>
//
// The server renders the whole session, so it reads without JavaScript. The runtime replays it when auto-play is on, and
// leaves it whole (no replay, no autoplay) under prefers-reduced-motion.

import { countTextTokens, revealTextTokens, splitText } from "./text-effects-logic";
import { formatSessionClock, sessionStateAt, sessionTimeFromRatio, sessionTimeline, type SessionEvent, type SessionTiming } from "./marketing-sections-logic";
import type { Register } from "./types";

const prefersReducedMotion = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface AuroraConfig {
  animate?: boolean;
}

export interface PricingPackData {
  id: string;
  name?: string;
  credits?: number;
  bonus?: number;
  price?: number;
  currency?: string;
}

export interface SessionPlaybackConfig {
  events?: SessionEvent[];
  autoPlay?: boolean;
  loop?: boolean;
  timing?: SessionTiming;
  lang?: string;
  labels?: { play?: string; pause?: string; restart?: string };
}

export const marketingSections: Register = (Alpine) => {
  Alpine.data("nqAuroraBackground", (cfg: AuroraConfig = {}) => ({
    animations: [] as Animation[],
    init() {
      if (cfg.animate === false || prefersReducedMotion()) return;
      const blobs = Array.from((this.$el as HTMLElement).querySelectorAll<HTMLElement>("[data-blob]"));
      this.animations = blobs.flatMap((el, i) => {
        if (typeof el.animate !== "function") return [];
        const dx = (i % 2 === 0 ? 1 : -1) * (6 + i * 2);
        return [
          el.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}%, ${4 + i * 2}%) scale(1.12)` }, { transform: "translate(0,0) scale(1)" }], {
            duration: 14000 + i * 3500,
            iterations: Number.POSITIVE_INFINITY,
            easing: "ease-in-out",
          }),
        ];
      });
    },
    destroy() {
      for (const a of this.animations as Animation[]) {
        a.finished?.catch(() => {});
        a.cancel();
      }
      this.animations = [];
    },
  }));

  Alpine.data("nqPricingPacks", (cfg: { packs?: PricingPackData[] } = {}) => ({
    root: null as HTMLElement | null,
    packs: cfg.packs ?? [],
    busy: "" as string,
    init() {
      this.root = this.$el as HTMLElement;
    },
    isBusy(id: string): boolean {
      return this.busy === id;
    },
    /** Every Buy is disabled while one purchase is in flight. */
    blocked(): boolean {
      return this.busy !== "";
    },
    busyAttr(id: string): string | false {
      return this.busy === id ? "true" : false;
    },
    disabledAttr(): string | false {
      return this.busy !== "" ? "" : false;
    },
    buy(id: string) {
      if (this.busy) return;
      const pack = (this.packs as PricingPackData[]).find((p) => p.id === id);
      let pending: Promise<unknown> | null = null;
      (this.root as HTMLElement).dispatchEvent(
        new CustomEvent("nq-purchase", {
          bubbles: true,
          detail: {
            pack,
            wait: (promise: Promise<unknown>) => {
              pending = Promise.resolve(promise);
            },
          },
        }),
      );
      if (!pending) return;
      this.busy = id;
      const done = () => {
        this.busy = "";
      };
      (pending as Promise<unknown>).then(done, done);
    },
  }));

  Alpine.data("nqSessionPlayback", (cfg: SessionPlaybackConfig = {}) => {
    const events = cfg.events ?? [];
    const timeline = sessionTimeline(events, cfg.lang, cfg.timing);
    const tokens = events.map((e) => splitText(e.text, "word", cfg.lang).tokens);
    return {
      root: null as HTMLElement | null,
      time: timeline.total,
      total: timeline.total,
      pct: 100,
      playing: false,
      started: false,
      raf: 0,
      io: null as IntersectionObserver | null,
      init() {
        this.root = this.$el as HTMLElement;
        this.$watch("pct", (v: number) => {
          // The slider moved by hand (our own updates already match). Pause and jump.
          if (Math.abs(Number(v) - this.currentPct()) <= 0.5) return;
          this.stop();
          this.time = sessionTimeFromRatio(timeline, Number(v) / 100);
          this.render();
        });
        if (cfg.autoPlay === false || prefersReducedMotion() || !events.length) return;
        this.time = 0;
        this.pct = 0;
        this.render();
        if (typeof IntersectionObserver === "undefined") {
          this.play();
          return;
        }
        this.io = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting) && !this.started) {
              this.io?.disconnect();
              this.play();
            }
          },
          { threshold: 0.3 },
        );
        this.io.observe(this.root as HTMLElement);
      },
      destroy() {
        this.io?.disconnect();
        cancelAnimationFrame(this.raf);
      },
      currentPct(): number {
        return this.total ? Math.round((this.time / this.total) * 100) : 100;
      },
      mode(): "play" | "pause" | "restart" {
        if (this.playing) return "pause";
        return this.total > 0 && this.time >= this.total ? "restart" : "play";
      },
      playLabel(): string {
        const labels = cfg.labels ?? {};
        const m = this.mode();
        return (m === "pause" ? labels.pause : m === "restart" ? labels.restart : labels.play) ?? "";
      },
      clock(): string {
        return `${formatSessionClock(this.time)} / ${formatSessionClock(this.total)}`;
      },
      toggle() {
        if (this.playing) this.stop();
        else this.play();
      },
      play() {
        if (!events.length) return;
        this.started = true;
        if (this.time >= this.total) {
          this.time = 0;
          this.pct = 0;
        }
        this.playing = true;
        cancelAnimationFrame(this.raf);
        let last = performance.now();
        const step = (now: number) => {
          if (!this.playing) return;
          this.time = Math.min(this.total, this.time + (now - last));
          last = now;
          this.pct = this.currentPct();
          this.render();
          if (this.time >= this.total) {
            this.playing = false;
            this.render();
            (this.root as HTMLElement).dispatchEvent(new CustomEvent("nq-session-end", { bubbles: true }));
            if (cfg.loop) {
              this.time = 0;
              this.pct = 0;
              setTimeout(() => this.play(), 1200);
            }
            return;
          }
          this.raf = requestAnimationFrame(step);
        };
        this.raf = requestAnimationFrame(step);
      },
      stop() {
        this.playing = false;
        cancelAnimationFrame(this.raf);
      },
      /** Show each event as far as `time` has played: whole words, a cursor on the one being typed. */
      render() {
        const states = sessionStateAt(timeline, this.time);
        const root = this.root as HTMLElement;
        const log = root.querySelector<HTMLElement>("[data-log]");
        states.forEach((state, i) => {
          const el = root.querySelector<HTMLElement>(`[data-event="${i}"]`);
          if (!el) return;
          el.hidden = !state.started;
          const text = el.querySelector<HTMLElement>("[data-text]");
          if (text) text.textContent = revealTextTokens(tokens[i] ?? [], state.done ? countTextTokens(tokens[i] ?? []) : state.visibleWords);
          const cursor = el.querySelector<HTMLElement>("[data-cursor]");
          if (cursor) cursor.hidden = !(this.playing && state.started && !state.done);
        });
        if (log && this.playing) log.scrollTop = log.scrollHeight;
      },
    };
  });
};
