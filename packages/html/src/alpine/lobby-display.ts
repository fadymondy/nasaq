// nqLobbyDisplay: the waiting-room board. <x-nq::lobby-display> renders the cards, the line and the recent calls on the server; this module owns what
// happens when the board is re-rendered with a new call (a Livewire poll, htmx, a refresh): the card flashes for highlightMs, the call is announced in
// the aria-live region and a chime plays when the operator turned sound on. Opening the board is silent: the calls already there are marked seen.
//
//   <div data-slot="lobby-display" x-data="nqLobbyDisplay({ highlightMs: 10000, on: 'Sound on', off: 'Turn sound on' })">
//     <div aria-live="assertive" class="sr-only" x-text="announcement"></div>
//     <button type="button" x-on:click="toggleSound()" x-text="soundLabel"></button>
//     <ul><li data-call="t1:1700000000" data-announce="Ticket A-015, please go to Room 3.">...</li></ul>
//   </div>
//
// Cards carry data-call="id:calledAt" and data-announce="text". The sound toggle fires a bubbling `nq-lobby-sound` { on }. The clock element
// ([data-clock]) ticks every 30 seconds unless the board is frozen.

import type { Magics, Register } from "./types";

export interface LobbyDisplayConfig {
  sound?: boolean;
  highlightMs?: number;
  locale?: string;
  /** Freeze the clock (examples and tests). */
  frozen?: boolean;
  serverNow?: number;
  on?: string;
  off?: string;
}

interface LobbyState extends Magics {
  sound: boolean;
  announcement: string;
  highlightMs: number;
  on: string;
  off: string;
  seen: Set<string>;
  timers: ReturnType<typeof setTimeout>[];
  intervals: ReturnType<typeof setInterval>[];
  readonly soundLabel: string;
  toggleSound(): void;
  scan(first?: boolean): void;
}

const FRESH = ["ring-4", "ring-primary", "motion-safe:animate-pulse"];

/** Two soft notes, high then low. Created on demand and only after the operator turned sound on (browsers block audio before a click). */
export function lobbyChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes: [number, number][] = [
      [880, 0],
      [660, 0.35],
    ];
    for (const [freq, at] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.65);
    }
    setTimeout(() => void ctx.close(), 1500);
  } catch {
    // No audio device or blocked: the visual call still shows.
  }
}

export const lobbyDisplay: Register = (Alpine) => {
  Alpine.data("nqLobbyDisplay", (config: LobbyDisplayConfig = {}) => {
  // Kept outside the reactive data: Alpine would wrap it in a proxy the browser cannot call.
  let observer: MutationObserver | null = null;
  return {
    sound: config.sound ?? false,
    announcement: "",
    highlightMs: config.highlightMs ?? 10000,
    on: config.on ?? "Sound on",
    off: config.off ?? "Turn sound on",
    seen: new Set<string>(),
    timers: [] as ReturnType<typeof setTimeout>[],
    intervals: [] as ReturnType<typeof setInterval>[],
    get soundLabel() {
      return (this as unknown as LobbyState).sound ? (this as unknown as LobbyState).on : (this as unknown as LobbyState).off;
    },
    init(this: LobbyState) {
      this.scan(true);
      observer = new MutationObserver(() => this.scan());
      observer.observe(this.$el, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-call"] });
      if (!config.frozen) {
        const clock = this.$el.querySelector<HTMLElement>("[data-clock]");
        const format = new Intl.DateTimeFormat(config.locale ?? undefined, { hour: "numeric", minute: "2-digit" });
        this.intervals.push(
          setInterval(() => {
            if (clock) clock.textContent = format.format(new Date());
          }, 30000),
        );
      }
    },
    destroy(this: LobbyState) {
      observer?.disconnect();
      this.timers.forEach((t) => clearTimeout(t));
      this.intervals.forEach((t) => clearInterval(t));
    },
    toggleSound(this: LobbyState) {
      this.sound = !this.sound;
      if (this.sound) lobbyChime();
      this.$el.dispatchEvent(new CustomEvent("nq-lobby-sound", { bubbles: true, detail: { on: this.sound } }));
    },
    scan(this: LobbyState, first = false) {
      const cards = Array.from(this.$el.querySelectorAll<HTMLElement>("[data-call]"));
      const added = first ? [] : cards.filter((c) => !this.seen.has(c.dataset.call!));
      for (const c of cards) this.seen.add(c.dataset.call!);
      if (added.length === 0) return;
      // The newest call (highest calledAt) is the one announced aloud.
      const stamp = (c: HTMLElement) => Number(c.dataset.call!.split(":")[1] ?? 0);
      const newest = [...added].sort((a, b) => stamp(b) - stamp(a))[0]!;
      this.announcement = newest.dataset.announce ?? "";
      if (this.sound) lobbyChime();
      for (const c of added) {
        c.setAttribute("data-fresh", "");
        c.classList.add(...FRESH);
      }
      this.timers.push(
        setTimeout(() => {
          for (const c of added) {
            c.removeAttribute("data-fresh");
            c.classList.remove(...FRESH);
          }
        }, this.highlightMs),
      );
    },
  };
  });
};
