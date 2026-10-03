// @fadymondy/nasaq/alpine: Nasaq for Alpine.js, and so for plain HTML, Blade, Livewire, Filament and TomatoPHP.
// The markup and Tailwind classes are the React components'; this runtime supplies the state and the
// Base UI data attributes (data-open, data-active, data-starting-style …) those classes style.
//
//   import Alpine from "alpinejs";
//   import nasaq from "@fadymondy/nasaq/alpine";
//   Alpine.plugin(nasaq);
//   Alpine.start();
//
// With Livewire or Filament Alpine is already running: load nasaq-alpine.js (the CDN build, or
// @nasaqScripts from fadymondy/nasaq-php), which registers on alpine:init.
//
// What it adds:
//   x-data="nqDialog()" | "nqTabs('board')" | …   one Alpine.data per component (see src/alpine/<name>.ts)
//   x-nq-presence="open"     show/hide with data-starting-style / data-ending-style transitions
//   x-nq-money="amount"      reactive price text (data-currency optional; USD, or SAR in Arabic)
//   $store.nq / $nq          { locale, dir, theme, currency, setLocale(l), setTheme(t), toggleTheme(), money(n, c?), t(en, ar) }
//   @alpinejs/focus, anchor and collapse, registered once (x-trap, x-anchor, x-collapse)

import anchor from "@alpinejs/anchor";
import collapse from "@alpinejs/collapse";
import focus from "@alpinejs/focus";
import { components } from "./alpine/index";
import { presence } from "./alpine/presence";
import type { AlpineLike } from "./alpine/types";
import { currentLocale, currentTheme, dirOf, setLocale, setTheme, toggleTheme, type Theme } from "./core/locale";
import { defaultCurrency, formatMoney } from "./core/money";

export type { AlpineLike, Magics, Register } from "./alpine/types";
export { components } from "./alpine/index";
export { setPresence, afterTransition } from "./alpine/presence";

export interface NasaqStore {
  locale: string;
  dir: "ltr" | "rtl";
  theme: "light" | "dark";
  /** Store-wide currency; null means USD, or SAR in Arabic. */
  currency: string | null;
  setLocale(locale: string): void;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
  money(amount: number, currency?: string): string;
  /** Picks the English or Arabic string by the current locale. */
  t(en: string, ar: string): string;
}

function store(): NasaqStore {
  const locale = currentLocale();
  return {
    locale,
    dir: dirOf(locale),
    theme: currentTheme(),
    currency: null,
    setLocale(l) {
      setLocale(l);
      this.locale = l;
      this.dir = dirOf(l);
    },
    setTheme(t) {
      setTheme(t);
      this.theme = currentTheme();
    },
    toggleTheme() {
      toggleTheme();
      this.theme = currentTheme();
    },
    money(amount, currency) {
      return formatMoney(amount, { locale: this.locale, currency: currency ?? this.currency ?? defaultCurrency(this.locale) });
    },
    t(en, ar) {
      return this.locale.startsWith("ar") ? ar : en;
    },
  };
}

const registered = new WeakSet<object>();

export default function nasaq(Alpine: AlpineLike): void {
  if (registered.has(Alpine)) return;
  registered.add(Alpine);

  // Livewire and Filament already ship focus/collapse/anchor; registering them twice is harmless in Alpine
  // (directives are keyed by name), so the runtime always brings what its components use.
  Alpine.plugin(focus);
  Alpine.plugin(anchor);
  Alpine.plugin(collapse);

  Alpine.store("nq", store());
  const nq = () => Alpine.store("nq") as NasaqStore;
  Alpine.magic("nq", () => nq());

  presence(Alpine);

  // x-nq-money="expression"
  Alpine.directive("nq-money", (el, { expression }, { evaluateLater, effect }) => {
    const read = evaluateLater<number>(expression);
    const node = el as HTMLElement;
    effect(() => {
      const s = nq();
      read((amount) => {
        const locale = node.dataset.locale ?? s.locale;
        node.textContent = formatMoney(Number(amount), {
          locale,
          currency: node.dataset.currency ?? s.currency ?? defaultCurrency(locale),
          compact: node.hasAttribute("data-compact"),
        });
      });
    });
  });

  for (const register of Object.values(components)) register(Alpine);
}
