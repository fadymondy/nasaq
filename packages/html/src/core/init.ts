// Auto-init: binds every [data-nq] element under a root, once. Safe to call again after the DOM changes
// (HTMX swaps, Livewire morphs, Turbo visits); observe() does that for you.

import { dialog, dialogTriggers } from "./dialog";
import { all, on, type Cleanup } from "./dom";
import { setTheme, toggleTheme, type Theme } from "./locale";
import { menu } from "./menu";
import { formatMoney } from "./money";
import { tabs } from "./tabs";
import { tooltip } from "./tooltip";

const bound = new WeakMap<Element, Cleanup>();

/** Formats [data-nq-money="12.5"] (optional data-currency, data-locale) into its text content. */
export function money(el: HTMLElement): void {
  const amount = Number(el.dataset.nqMoney);
  if (!Number.isFinite(amount)) return;
  const locale = el.dataset.locale ?? el.closest("[lang]")?.getAttribute("lang") ?? "en";
  el.textContent = formatMoney(amount, { currency: el.dataset.currency, locale, compact: el.hasAttribute("data-compact") });
  el.classList.add("nq-num");
}

/** Exclusive accordion: opening one <details> closes its siblings (same as the native `name` attribute). */
function accordion(root: HTMLElement): Cleanup {
  return on(
    root,
    "toggle",
    (event) => {
      const opened = event.target as HTMLDetailsElement;
      if (!opened.open || root.dataset.type === "multiple") return;
      for (const d of root.querySelectorAll<HTMLDetailsElement>(":scope > details[open]")) if (d !== opened) d.open = false;
    },
    { capture: true },
  );
}

function bindOne(el: HTMLElement): Cleanup | undefined {
  switch (el.dataset.nq) {
    case "dialog":
      return el instanceof HTMLDialogElement ? dialog(el) : undefined;
    case "tabs":
      return tabs(el).destroy;
    case "menu":
      return menu(el).destroy;
    case "accordion":
      return accordion(el);
    default:
      return undefined;
  }
}

/** Binds every Nasaq behaviour under root. Returns a cleanup that unbinds what this call bound. */
export function init(root: ParentNode = document): Cleanup {
  const cleanups: Cleanup[] = [];
  const track = (el: Element, c: Cleanup | undefined) => {
    if (!c) return;
    bound.set(el, c);
    cleanups.push(() => {
      c();
      bound.delete(el);
    });
  };
  const scope = (selector: string) => {
    const list = Array.from(root.querySelectorAll<HTMLElement>(selector));
    if (root instanceof HTMLElement && root.matches(selector)) list.unshift(root);
    return list.filter((el) => !bound.has(el));
  };
  for (const el of scope("[data-nq]")) track(el, bindOne(el));
  for (const el of scope("[data-nq-tooltip]")) track(el, tooltip(el));
  for (const el of root.querySelectorAll<HTMLElement>("[data-nq-money]")) money(el);
  return all(cleanups);
}

let globalBound = false;

/** Document-level delegated handlers: dialog open/close triggers and theme buttons. Bound once. */
export function delegate(): Cleanup {
  if (globalBound) return () => {};
  globalBound = true;
  return all([
    dialogTriggers(document),
    on(document, "click", (event) => {
      const btn = (event.target as Element | null)?.closest<HTMLElement>("[data-nq-theme]");
      if (!btn) return;
      const v = btn.dataset.nqTheme;
      if (v === "toggle") toggleTheme();
      else if (v === "light" || v === "dark" || v === "system") setTheme(v as Theme);
    }),
    () => {
      globalBound = false;
    },
  ]);
}

/** Re-runs init for nodes added later (Livewire, HTMX, Turbo). */
export function observe(root: HTMLElement = document.body): Cleanup {
  const mo = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLElement) init(n);
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}

/** One call for a plain page: delegated triggers, bind what is there, watch for more. */
export function start(): Cleanup {
  const run = () => all([delegate(), init(document), observe(document.body)]);
  if (document.readyState === "loading") {
    let stop: Cleanup = () => {};
    const ready = () => {
      stop = run();
    };
    document.addEventListener("DOMContentLoaded", ready, { once: true });
    return () => {
      document.removeEventListener("DOMContentLoaded", ready);
      stop();
    };
  }
  return run();
}
