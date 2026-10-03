// nqStoreCountdown and nqStoreFlashDeals: the two live parts of the storefront merchandising blocks (the hero, tiles, promo tiles,
// brand strip and product carousel are static markup; the carousel is nqCarousel and the cards are nqStoreCard).
//
//   <span x-data="nqStoreCountdown({ endsAt, now, serverNow, labels })">  readout bound to done, showDays, d, h, m, s, label  </span>
//   <section x-data="nqStoreFlashDeals({ deals: [{ id, endsAt, startsAt }], now, serverNow, labels })" x-show="hasLive">
//     readout (of the soonest live deal) + carousel items carrying data-deal-id
//   </section>
//
// The visitor's clock is the truth (a cached page must not run late); `serverNow` (epoch ms, opt in with server-clock) makes the
// strip follow the server's clock instead. A fixed `now` stops the ticking. Ended deals are removed from the track and
// `nq-expire` fires once when the last one is gone (for the countdown, when it reaches zero).

import { merchActiveDeals, merchCountdownParts, merchFill, merchNextTick, type MerchDeal } from "./store-merch-logic";
import type { Magics, Register } from "./types";

interface Config {
  endsAt?: number;
  deals?: MerchDeal[];
  now?: number | null;
  serverNow?: number | null;
  labels?: { timeLeft?: string; days?: string; hours?: string; minutes?: string };
}

interface MerchState extends Magics {
  endsAt: number;
  deals: MerchDeal[] | null;
  fixed: boolean;
  skew: number;
  tickAt: number;
  box: HTMLElement;
  timer: ReturnType<typeof setTimeout> | undefined;
  expired: boolean;
  removed: string[];
  texts: { timeLeft: string; days: string; hours: string; minutes: string };
  readonly target: number;
  readonly parts: ReturnType<typeof merchCountdownParts>;
  readonly done: boolean;
  readonly hasLive: boolean;
  clock(): number;
  schedule(): void;
  step(): void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function factory(config: Config = {}) {
  return {
    endsAt: config.endsAt ?? 0,
    deals: (config.deals ?? null) as MerchDeal[] | null,
    fixed: typeof config.now === "number",
    skew: 0,
    tickAt: typeof config.now === "number" ? config.now : Date.now(),
    box: null as unknown as HTMLElement,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    expired: false,
    removed: [] as string[],
    texts: { timeLeft: "Time left: {time}", days: "days", hours: "hours", minutes: "minutes", ...config.labels },

    init(this: MerchState) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.box = this.$el;
      if (!this.fixed && typeof config.serverNow === "number") this.skew = config.serverNow - Date.now();
      this.tickAt = this.clock();
      this.step();
    },
    destroy(this: MerchState) {
      clearTimeout(this.timer);
    },

    clock(this: MerchState) {
      return this.fixed ? (config.now as number) : Date.now() + this.skew;
    },
    /** One tick: refresh the clock, drop ended deals, announce the end once, plan the next tick. */
    step(this: MerchState) {
      this.tickAt = this.clock();
      if (this.deals) {
        for (const d of this.deals) {
          if (this.tickAt >= d.endsAt && !this.removed.includes(d.id)) {
            this.removed.push(d.id);
            for (const el of this.box.querySelectorAll("[data-deal-id]")) if (el.getAttribute("data-deal-id") === d.id) el.remove();
          }
        }
      }
      if (this.done && !this.expired) {
        this.expired = true;
        this.$dispatch("nq-expire");
      }
      this.schedule();
    },
    schedule(this: MerchState) {
      clearTimeout(this.timer);
      this.timer = undefined;
      if (this.fixed || this.done) return;
      const wait = this.deals ? 1000 : merchNextTick(this.endsAt, this.tickAt);
      if (wait > 0) this.timer = setTimeout(() => this.step(), wait);
    },

    /** The deadline being shown: the countdown's own, or the soonest live deal's. */
    get target() {
      const self = this as unknown as MerchState;
      return self.deals ? (merchActiveDeals(self.deals, self.tickAt)[0]?.endsAt ?? 0) : self.endsAt;
    },
    get parts() {
      const self = this as unknown as MerchState;
      return merchCountdownParts(self.target, self.tickAt);
    },
    get done() {
      const self = this as unknown as MerchState;
      return self.deals ? !self.hasLive : self.parts.done;
    },
    get hasLive() {
      const self = this as unknown as MerchState;
      return !!self.deals && merchActiveDeals(self.deals, self.tickAt).length > 0;
    },
    get showDays() {
      const self = this as unknown as MerchState;
      return self.parts.days > 0;
    },
    get d() {
      const self = this as unknown as MerchState;
      return String(self.parts.days);
    },
    get h() {
      const self = this as unknown as MerchState;
      return pad(self.parts.hours);
    },
    get m() {
      const self = this as unknown as MerchState;
      return pad(self.parts.minutes);
    },
    get s() {
      const self = this as unknown as MerchState;
      return pad(self.parts.seconds);
    },
    /** Time left to the minute, so assistive tech is not spoken to every second. */
    get label() {
      const self = this as unknown as MerchState;
      const p = self.parts;
      const time = `${p.days > 0 ? `${p.days} ${self.texts.days} ` : ""}${pad(p.hours)} ${self.texts.hours} ${pad(p.minutes)} ${self.texts.minutes}`;
      return merchFill(self.texts.timeLeft, { time });
    },
  };
}

export const storeMerch: Register = (Alpine) => {
  Alpine.data("nqStoreCountdown", (config: Config = {}) => factory(config));
  Alpine.data("nqStoreFlashDeals", (config: Config = {}) => factory(config));
};
