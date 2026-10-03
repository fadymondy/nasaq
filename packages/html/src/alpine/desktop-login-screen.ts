// nqDesktopLoginScreen: the clock, the greeting and the power buttons of a desktop OS sign-in screen. The markup is the
// React DesktopLoginScreen's (see the Blade desktop-login-screen component); the form inside is the login-form component and
// keeps its own Alpine scope, so its events (nq-login, nq-passkey …) bubble to this root.
//
//   <div data-slot="desktop-login-screen" x-data="nqDesktopLoginScreen({ now: '2026-09-29T09:00:00' })"
//        x-on:nq-login="$event.detail.waitUntil(signIn($event.detail))" x-on:nq-desktop-login-power="power($event.detail.id)">
//
// Events (bubble from the root): nq-desktop-login-power { id } from a power button.
// config: now (freeze the clock at a timestamp or local date-time string; default now, ticking), locale, labels { morning, afternoon, evening }.

import { authLang } from "./login-form-logic";
import type { Magics, Register } from "./types";

const GREETINGS = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" },
  ar: { morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء الخير" },
};

interface Config {
  now?: string | number | null;
  locale?: string;
  labels?: Partial<Record<"morning" | "afternoon" | "evening", string>>;
}

interface ScreenState extends Magics {
  greeting: string;
  time: string;
  date: string;
  root: HTMLElement | undefined;
  tickTimer: ReturnType<typeof setInterval> | undefined;
}

export const desktopLoginScreen: Register = (Alpine) => {
  Alpine.data("nqDesktopLoginScreen", (config: Config = {}) => {
    const t = { ...GREETINGS[authLang()], ...config.labels };
    return {
      greeting: "",
      time: "",
      date: "",
      root: undefined as HTMLElement | undefined,
      tickTimer: undefined as ReturnType<typeof setInterval> | undefined,
      init(this: ScreenState) {
        this.root = this.$el;
        const lang = config.locale || document.documentElement.lang || "en";
        const frozen = config.now === undefined || config.now === null || config.now === "" ? null : new Date(config.now).getTime();
        const paint = (ms: number) => {
          const hour = new Date(ms).getHours();
          this.greeting = hour < 12 ? t.morning : hour < 18 ? t.afternoon : t.evening;
          this.time = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit", hour12: false, numberingSystem: "latn" }).format(ms);
          this.date = new Intl.DateTimeFormat(lang, { weekday: "long", month: "long", day: "numeric", numberingSystem: "latn" }).format(ms);
        };
        if (frozen !== null) paint(frozen);
        else {
          paint(Date.now());
          this.tickTimer = setInterval(() => paint(Date.now()), 1000);
        }
      },
      destroy(this: ScreenState) {
        clearInterval(this.tickTimer);
      },
      /** A power button was pressed: tell the host (sleep, restart, shut down). */
      power(this: ScreenState, id: string) {
        (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq-desktop-login-power", { bubbles: true, detail: { id } }));
      },
    };
  });
};
