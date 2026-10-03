// nqUpgradePrompt: the upgrade popup. The markup is the React UpgradeDialog's, the state lives here.
//
//   <div x-data="nqUpgradePrompt({ open: false, planId: 'team', period: 'year', names: { team: 'Team' }, upgradeTo: 'Upgrade to :name', upgradeNow: 'Upgrade now' })" x-modelable="open">
//     <button x-on:click="show()">Upgrade</button>
//     <template x-teleport="body">…<button x-on:click="upgrade()" x-text="ctaLabel"></button></template>
//   </div>
//
// The button dispatches the bubbling `nq-upgrade` ({ planId, period, wait(promise) }) from the root: call detail.wait(promise)
// to keep it busy until it settles. `nq-period-change` fires when the period changes.
// nqOfferClock is the offer countdown, nqUpgradeBanner the dismissible banner.

import type { Register } from "./types";

interface PromptOptions {
  open?: boolean;
  planId?: string | null;
  period?: "month" | "year";
  names?: Record<string, string>;
  upgradeTo?: string;
  upgradeNow?: string;
}

interface PromptState {
  open: boolean;
  planId: string | null;
  period: string;
  sel: string[];
  pending: boolean;
  root: HTMLElement | null;
  names: Record<string, string>;
  upgradeTo: string;
  upgradeNow: string;
  ctaLabel: string;
  $el: HTMLElement;
  $watch<T>(key: string, cb: (value: T) => void): void;
  close(): void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export const upgradePrompt: Register = (Alpine) => {
  Alpine.data("nqUpgradePrompt", (options: PromptOptions = {}) => ({
    open: Boolean(options.open),
    planId: options.planId ?? null,
    period: options.period ?? "year",
    sel: [options.period ?? "year"] as string[],
    pending: false,
    root: null as HTMLElement | null,
    names: options.names ?? {},
    upgradeTo: options.upgradeTo ?? "Upgrade to :name",
    upgradeNow: options.upgradeNow ?? "Upgrade now",
    init(this: PromptState) {
      this.root = this.$el;
      // The period switch's toggle group holds an array; pressing the pressed item clears it, so keep the current period then.
      this.$watch<string[]>("sel", (value) => {
        const next = value[0];
        if (next === "month" || next === "year") {
          if (next !== this.period) this.period = next;
        } else {
          this.sel = [this.period];
        }
      });
      this.$watch<string>("period", (value) => {
        this.root?.dispatchEvent(new CustomEvent("nq-period-change", { detail: { period: value }, bubbles: true }));
      });
    },
    get ctaLabel(): string {
      const name = this.planId ? this.names[this.planId] : undefined;
      return name ? this.upgradeTo.replace(":name", name) : this.upgradeNow;
    },
    show() {
      this.open = true;
    },
    close() {
      this.open = false;
    },
    toggle() {
      this.open = !this.open;
    },
    upgrade(this: PromptState) {
      const waits: Promise<unknown>[] = [];
      const detail = {
        planId: this.planId,
        period: this.period,
        wait: (promise: Promise<unknown>) => {
          waits.push(promise);
        },
      };
      this.root?.dispatchEvent(new CustomEvent("nq-upgrade", { detail, bubbles: true }));
      if (waits.length === 0) return;
      this.pending = true;
      Promise.allSettled(waits).then(() => {
        this.pending = false;
      });
    },
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: { $id(a: string, b: string): string }) {
        return this.$id("nq-dialog", "title");
      },
      ":aria-describedby"(this: { $id(a: string, b: string): string }) {
        return this.$id("nq-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: PromptState) {
        this.close();
      },
    },
  }));

  Alpine.data("nqOfferClock", (options: { endsAt: string; days?: string } = { endsAt: "" }) => ({
    text: "--:--:--",
    timer: 0 as number,
    init(this: { text: string; timer: number; tick(): void }) {
      this.tick();
      this.timer = window.setInterval(() => this.tick(), 1000);
    },
    tick(this: { text: string }) {
      const end = Date.parse(options.endsAt);
      if (Number.isNaN(end)) return;
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const d = Math.floor(left / 86400);
      const h = Math.floor((left % 86400) / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = left % 60;
      const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
      this.text = d > 0 ? `${d}${options.days ?? "d"} ${clock}` : clock;
    },
    destroy(this: { timer: number }) {
      window.clearInterval(this.timer);
    },
  }));

  Alpine.data("nqUpgradeBanner", (initial = true) => ({
    open: Boolean(initial),
    dismiss(this: { open: boolean; $el: HTMLElement }) {
      this.open = false;
      this.$el.dispatchEvent(new CustomEvent("nq:dismiss", { bubbles: true }));
    },
  }));
};
