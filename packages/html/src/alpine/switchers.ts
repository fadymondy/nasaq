// nqThemePref and nqLocalePref: the state behind the theme switcher, theme toggle and locale switcher.
//
//   <div x-data="nqThemePref()" role="group" x-on:keydown="onKey($event)">
//     <button x-on:click="set('light')" x-bind:data-pressed="pref === 'light' ? '' : undefined">…</button>
//   </div>
//
// nqThemePref: pref is "light" | "dark" | "system" (read from localStorage "nq-theme", else "system"); dark is the resolved
// theme; set(pref) applies it through $store.nq and keeps the saved preference in step (including "system").
// toggle() flips light and dark. onKey moves focus between the buttons in reading order (flipped in RTL).
// A menu can bind its radio group with x-model="pref" / x-model="locale": a change there is applied too.
// nqLocalePref(names): names maps locale to its endonym; name is the current one. locale follows <html lang>; set(locale) calls $store.nq.setLocale. Both follow the nq:theme / nq:locale events.

import type { Register } from "./types";

type Pref = "light" | "dark" | "system";

interface ThemeState {
  pref: Pref;
  dark: boolean;
  $store: { nq: { theme: "light" | "dark"; locale: string; setTheme(t: Pref): void; setLocale(l: string): void } };
  $el: HTMLElement;
  set(value: Pref): void;
}

function readPref(): Pref {
  try {
    const saved = localStorage.getItem("nq-theme");
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // storage blocked: fall back to the page's own theme
  }
  const set = document.documentElement.getAttribute("data-theme");
  return set === "light" || set === "dark" ? set : "system";
}

export const switchers: Register = (Alpine) => {
  Alpine.data("nqThemePref", () => ({
    pref: "system" as Pref,
    dark: false,
    init(this: ThemeState & { $watch(key: string, cb: (v: never) => void): void }) {
      const sync = () => {
        this.pref = readPref();
        this.dark = this.$store.nq.theme === "dark";
      };
      sync();
      // a theme menu binds x-model="pref"; applying here keeps the page in step
      this.$watch("pref", (value: Pref) => {
        if (value !== readPref()) {
          this.$store.nq.setTheme(value);
          this.dark = this.$store.nq.theme === "dark";
        }
      });
      const onTheme = () => queueMicrotask(sync);
      document.documentElement.addEventListener("nq:theme", onTheme);
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff = () => document.documentElement.removeEventListener("nq:theme", onTheme);
    },
    destroy(this: ThemeState) {
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff?.();
    },
    set(this: ThemeState, value: Pref) {
      this.$store.nq.setTheme(value);
      this.pref = value;
      this.dark = this.$store.nq.theme === "dark";
    },
    toggle(this: ThemeState) {
      this.set(this.dark ? "light" : "dark");
    },
    onKey(this: ThemeState, event: KeyboardEvent) {
      const rtl = document.documentElement.dir === "rtl";
      const forward = rtl ? "ArrowLeft" : "ArrowRight";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      if (event.key !== forward && event.key !== back && event.key !== "Home" && event.key !== "End") return;
      const buttons = [...this.$el.querySelectorAll<HTMLElement>("button")];
      const at = buttons.indexOf(document.activeElement as HTMLElement);
      if (at < 0) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (at + (event.key === forward ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]!.focus();
    },
  }));

  Alpine.data("nqLocalePref", (names: Record<string, string> = {}) => ({
    locale: "en",
    names,
    get name(): string {
      return (this as unknown as { names: Record<string, string>; locale: string }).names[(this as unknown as { locale: string }).locale] ?? (this as unknown as { locale: string }).locale;
    },
    init(this: ThemeState & { locale: string; $watch(key: string, cb: (v: string) => void): void }) {
      this.locale = this.$store.nq.locale;
      this.$watch("locale", (value: string) => {
        if (value !== this.$store.nq.locale) this.$store.nq.setLocale(value);
      });
      const sync = () => queueMicrotask(() => (this.locale = this.$store.nq.locale));
      document.documentElement.addEventListener("nq:locale", sync);
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff = () => document.documentElement.removeEventListener("nq:locale", sync);
    },
    destroy(this: ThemeState) {
      (this.$el as HTMLElement & { _nqOff?: () => void })._nqOff?.();
    },
    set(this: ThemeState & { locale: string }, value: string) {
      this.$store.nq.setLocale(value);
      this.locale = value;
    },
  }));
};
