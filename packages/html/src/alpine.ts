// @fadymondy/nasaq/alpine: Nasaq for Alpine.js (and so for Livewire, FilamentPHP, TomatoPHP).
//
//   import Alpine from "alpinejs";
//   import nasaq from "@fadymondy/nasaq/alpine";
//   import "@fadymondy/nasaq/html.css";
//   Alpine.plugin(nasaq);
//   Alpine.start();
//
// In Livewire/Filament, Alpine is already running: register on alpine:init instead (see docs/frameworks/filament.md),
// or load the CDN build (nasaq-alpine.global.js), which does that for you.
//
// What it adds:
//   x-nq:tabs | x-nq:menu | x-nq:dialog | x-nq:tooltip | x-nq:accordion   bind the vanilla behaviour, cleaned up with the element
//   x-nq-money="amount"                     reactive price text (data-currency optional; USD, or SAR in Arabic)
//   x-data="nqDialog"   { open, show(), close(), toggle() }   on or around a <dialog class="nq-dialog">
//   x-data="nqTabs('overview')"  { active, select(v), tab(v), panel(v) }   x-bind objects for tabs
//   x-data="nqMenu"     { open, toggle(), close(), trigger, menu, item }   x-bind objects for a dropdown
//   $store.nq           { locale, dir, theme, currency, setLocale(l), setTheme(t), toggleTheme(), money(n, c?), toast(o), openDialog(id), closeDialog(id) }
//   $nq                 the same store: $nq.toast({ title }), $nq.money(12), $nq.openDialog('invite')
//   window event "nq-toast" (Livewire: $this->dispatch('nq-toast', title: 'Saved', tone: 'success'))

import { dialog as bindDialog } from "./core/dialog";
import { closeDialog, openDialog } from "./core/dialog";
import { isRtlAt, place } from "./core/dom";
import { currentLocale, currentTheme, dirOf, setLocale, setTheme, toggleTheme, type Theme } from "./core/locale";
import { menu as bindMenu } from "./core/menu";
import { defaultCurrency, formatMoney } from "./core/money";
import { tabs as bindTabs } from "./core/tabs";
import { toast, type ToastOptions } from "./core/toast";
import { tooltip as bindTooltip } from "./core/tooltip";

/** The slice of the Alpine API the plugin uses; declared here so the published types need no @types/alpinejs. */
export interface AlpineLike {
  store(name: string, value?: unknown): unknown;
  magic(name: string, callback: (el: Element) => unknown): void;
  directive(
    name: string,
    callback: (
      el: Element,
      directive: { value: string; expression: string; modifiers: string[] },
      utilities: {
        cleanup(fn: () => void): void;
        effect(fn: () => void): unknown;
        evaluateLater<T>(expression: string): (callback: (value: T) => void) => void;
      },
    ) => void,
  ): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(name: string, callback: (...args: any[]) => Record<string, any>): void;
}

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
  toast(options: ToastOptions | string): () => void;
  openDialog(id: string): void;
  closeDialog(id: string): void;
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
    toast: (o) => toast(o),
    openDialog: (id) => openDialog(id),
    closeDialog: (id) => closeDialog(id),
  };
}

let tabsSeq = 0;

export default function nasaq(Alpine: AlpineLike): void {
  Alpine.store("nq", store());
  const nq = () => Alpine.store("nq") as NasaqStore;

  Alpine.magic("nq", () => nq());

  // x-nq:<kind>
  Alpine.directive("nq", (el, { value }, { cleanup }) => {
    const node = el as unknown as HTMLElement;
    let stop: (() => void) | undefined;
    if (value === "tabs") stop = bindTabs(node).destroy;
    else if (value === "menu") stop = bindMenu(node).destroy;
    else if (value === "dialog" && node instanceof HTMLDialogElement) stop = bindDialog(node);
    else if (value === "tooltip") stop = bindTooltip(node);
    else if (value === "accordion") {
      const handler = (event: Event) => {
        const opened = event.target as HTMLDetailsElement;
        if (!opened.open || node.dataset.type === "multiple") return;
        for (const d of node.querySelectorAll<HTMLDetailsElement>(":scope > details[open]")) if (d !== opened) d.open = false;
      };
      node.addEventListener("toggle", handler, true);
      stop = () => node.removeEventListener("toggle", handler, true);
    }
    if (stop) cleanup(stop);
  });

  // x-nq-money="expression"
  Alpine.directive("nq-money", (el, { expression }, { evaluateLater, effect }) => {
    const read = evaluateLater<number>(expression);
    const node = el as unknown as HTMLElement;
    node.classList.add("nq-num");
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

  Alpine.data("nqDialog", (initial = false) => ({
    open: Boolean(initial),
    init(this: { $el: HTMLElement; $watch: (k: string, fn: (v: boolean) => void) => void; open: boolean }) {
      const d = this.$el instanceof HTMLDialogElement ? this.$el : this.$el.querySelector("dialog");
      if (!d) return;
      const sync = (v: boolean) => (v ? !d.open && d.showModal() : d.open && d.close());
      d.addEventListener("close", () => (this.open = false));
      bindDialog(d);
      this.$watch("open", sync);
      if (this.open) queueMicrotask(() => sync(true));
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
  }));

  Alpine.data("nqTabs", (initial?: string) => ({
    active: initial ?? "",
    // Per-instance id prefix: two tab sets with the same keys on one page (common in Filament) must not collide.
    uid: `nq-tabs-${++tabsSeq}`,
    init(this: { $el: HTMLElement; active: string }) {
      if (!this.active) this.active = this.$el.querySelector<HTMLElement>("[data-value]")?.dataset.value ?? "";
    },
    select(v: string) {
      this.active = v;
    },
    tab(v: string) {
      const self = this;
      return {
        role: "tab",
        type: "button",
        "data-value": v,
        class: "nq-tabs-trigger",
        id: `${self.uid}-tab-${v}`,
        "aria-controls": `${self.uid}-panel-${v}`,
        ":aria-selected"() {
          return String(self.active === v);
        },
        ":tabindex"() {
          return self.active === v ? 0 : -1;
        },
        "@click"() {
          self.active = v;
        },
        "@keydown"(e: KeyboardEvent) {
          const t = e.currentTarget as HTMLElement;
          const list = Array.from(t.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)') ?? []);
          const i = list.indexOf(t);
          const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
          let to: HTMLElement | undefined;
          if (step) to = list[(i + (isRtlAt(t) ? -step : step) + list.length) % list.length];
          else if (e.key === "Home") to = list[0];
          else if (e.key === "End") to = list[list.length - 1];
          if (!to) return;
          e.preventDefault();
          self.active = to.dataset.value ?? self.active;
          to.focus();
        },
      };
    },
    panel(v: string) {
      const self = this;
      return {
        role: "tabpanel",
        class: "nq-tabs-panel",
        id: `${self.uid}-panel-${v}`,
        "aria-labelledby": `${self.uid}-tab-${v}`,
        tabindex: 0,
        "x-show"() {
          return self.active === v;
        },
      };
    },
  }));

  Alpine.data("nqMenu", () => ({
    open: false,
    toggle() {
      this.open = !this.open;
    },
    close() {
      this.open = false;
    },
    trigger: {
      "aria-haspopup": "menu",
      ":aria-expanded"(this: { open: boolean }) {
        return String(this.open);
      },
      "@click"(this: { open: boolean }) {
        this.open = !this.open;
      },
      "@keydown.down.prevent"(this: { open: boolean }) {
        this.open = true;
      },
    },
    menu: {
      role: "menu",
      class: "nq-menu",
      "x-show"(this: { open: boolean }) {
        return this.open;
      },
      "x-effect"(this: { open: boolean; $el: HTMLElement; $nextTick: (fn: () => void) => void }) {
        if (!this.open) return;
        const el = this.$el;
        this.$nextTick(() => {
          const anchor = el.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
          if (anchor) place(el, anchor);
          el.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
        });
      },
      "@click.outside"(this: { open: boolean }) {
        this.open = false;
      },
      "@keydown.escape.prevent"(this: { open: boolean; $el: HTMLElement }) {
        this.open = false;
        this.$el.parentElement?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
      },
      "@keydown"(e: KeyboardEvent) {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        const menuEl = e.currentTarget as HTMLElement;
        const list = Array.from(menuEl.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
        const i = list.indexOf(document.activeElement as HTMLElement);
        list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
      },
    },
    item: {
      role: "menuitem",
      class: "nq-menu-item",
      "@click"(this: { open: boolean }) {
        this.open = false;
      },
    },
  }));

  window.addEventListener("nq-toast", (event) => {
    const detail = (event as CustomEvent).detail;
    // Livewire 3 sends named params as the detail object; Livewire 2 wraps them in an array.
    toast(Array.isArray(detail) ? detail[0] : detail);
  });
}

export { nasaq };
