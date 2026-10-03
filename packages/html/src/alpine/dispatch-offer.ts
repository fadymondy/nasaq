// nqDispatchOffer: the courier's job offer with a countdown ring. The markup is the React DispatchOffer's (see the Blade
// component); the countdown and the buttons live here.
//
//   <section data-slot="dispatch-offer" x-data="nqDispatchOffer({ expiresIn: 30, windowSeconds: 30, mode: 'courier', locale: 'en', labels: {…} })">
//     <svg><circle data-slot="timer-ring-arc" x-bind:stroke-dashoffset="dashoffset" x-bind:class="{ 'stroke-primary': ringTone === 'primary', … }"/></svg>
//     <bdi x-text="left"></bdi> <h2 x-text="title"></h2> <span role="status" x-text="announce"></span>
//     <button x-on:click="decline()">Decline</button> <button x-bind:disabled="expired ? '' : null" x-on:click="accept()">Accept</button>
//   </section>
//
// The offer lapses at `expiresAt` (ms since epoch) or `expiresIn` seconds after the component starts (use expiresIn in
// markup that is rendered ahead of time). No expiry, or mode "dispatcher", means no countdown. State: left (whole seconds),
// expired, fraction (0 to 1 of the window), tone (primary | warning | danger | neutral), ringTone (danger drawn as warning),
// announce (spoken only at the start and in the last ten seconds), title. Events (bubbling, from the root):
// nq-dispatch-offer-accept, nq-dispatch-offer-decline, nq-dispatch-offer-offer (dispatcher mode), nq-dispatch-offer-expire (once).

import type { Magics, Register } from "./types";

interface Options {
  expiresAt?: number;
  expiresIn?: number;
  windowSeconds?: number;
  mode?: "courier" | "dispatcher";
  locale?: string;
  labels?: { title?: string; dispatcherTitle?: string; expired?: string };
}

type Tone = "primary" | "warning" | "danger" | "neutral";

interface OfferState extends Magics {
  expiresAt: number | null;
  windowSeconds: number;
  mode: "courier" | "dispatcher";
  locale: string;
  labels: Record<string, string>;
  tick: number;
  radius: number;
  circumference: number;
  timed: boolean;
  left: number;
  expired: boolean;
  fraction: number;
  tone: Tone;
  ringTone: "primary" | "warning" | "neutral";
  announce: string;
  title: string;
  dashoffset: number;
  root: HTMLElement | null;
  timer: ReturnType<typeof setInterval> | undefined;
  fired: boolean;
  send(event: string): void;
}

const secondsLeft = (n: number, ar: boolean): string =>
  ar
    ? n === 1
      ? "بقيت ثانية واحدة للرد"
      : n === 2
        ? "بقيت ثانيتان للرد"
        : n <= 10
          ? `بقيت ${n} ثوانٍ للرد`
          : `بقيت ${n} ثانية للرد`
    : n === 1
      ? "1 second left to answer"
      : `${n} seconds left to answer`;

export const dispatchOffer: Register = (Alpine) => {
  Alpine.data("nqDispatchOffer", (options: Options = {}) => {
    const windowSeconds = options.windowSeconds ?? 30;
    const mode = options.mode ?? "courier";
    const expiresAt = mode === "courier" ? (options.expiresAt ?? (options.expiresIn !== undefined ? Date.now() + options.expiresIn * 1000 : null)) : null;
    const size = 64;
    const thickness = 6;
    const radius = (size - thickness) / 2;
    return {
      expiresAt,
      windowSeconds,
      mode,
      locale: options.locale ?? "en",
      labels: { title: "New delivery offer", dispatcherTitle: "Offer to a driver", expired: "Offer expired", ...options.labels },
      tick: Date.now(),
      radius,
      circumference: 2 * Math.PI * radius,
      root: null as HTMLElement | null,
      timer: undefined as ReturnType<typeof setInterval> | undefined,
      fired: false,
      init(this: OfferState) {
        this.root = this.$el;
        if (!this.timed) return;
        this.tick = Date.now();
        this.timer = setInterval(() => {
          this.tick = Date.now();
          if (this.expiresAt !== null && this.tick >= this.expiresAt) {
            clearInterval(this.timer);
            this.timer = undefined;
            if (!this.fired) {
              this.fired = true;
              this.send("expire");
            }
          }
        }, 250);
      },
      destroy(this: OfferState) {
        clearInterval(this.timer);
      },
      get timed(): boolean {
        return (this as unknown as OfferState).expiresAt !== null;
      },
      get left(): number {
        const s = this as unknown as OfferState;
        return s.timed ? Math.max(0, Math.ceil((s.expiresAt! - s.tick) / 1000)) : s.windowSeconds;
      },
      get expired(): boolean {
        const s = this as unknown as OfferState;
        return s.timed && s.left === 0;
      },
      get fraction(): number {
        const s = this as unknown as OfferState;
        if (!s.timed) return 1;
        return s.windowSeconds <= 0 ? 0 : Math.min(1, Math.max(0, (s.expiresAt! - s.tick) / (s.windowSeconds * 1000)));
      },
      get tone(): Tone {
        const s = this as unknown as OfferState;
        if (s.expired) return "neutral";
        if (s.left <= 5) return "danger";
        return s.left <= s.windowSeconds / 4 ? "warning" : "primary";
      },
      get ringTone(): "primary" | "warning" | "neutral" {
        const tone = (this as unknown as OfferState).tone;
        return tone === "danger" ? "warning" : tone;
      },
      get announce(): string {
        const s = this as unknown as OfferState;
        return s.timed && !s.expired && (s.left <= 10 || s.left >= s.windowSeconds - 1) ? secondsLeft(s.left, s.locale.startsWith("ar")) : "";
      },
      get title(): string {
        const s = this as unknown as OfferState;
        return s.expired ? (s.labels.expired as string) : s.mode === "dispatcher" ? (s.labels.dispatcherTitle as string) : (s.labels.title as string);
      },
      get dashoffset(): number {
        const s = this as unknown as OfferState;
        return s.circumference * (1 - s.fraction);
      },
      send(this: OfferState, event: string) {
        this.root?.dispatchEvent(new CustomEvent(`nq-dispatch-offer-${event}`, { bubbles: true }));
      },
      accept(this: OfferState) {
        if (!this.expired) this.send("accept");
      },
      decline(this: OfferState) {
        this.send("decline");
      },
      offer(this: OfferState) {
        this.send("offer");
      },
    };
  });
};
