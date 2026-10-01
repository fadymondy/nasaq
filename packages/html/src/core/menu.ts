// Dropdown menu: the WAI-ARIA menu button pattern.
//
//   <button class="nq-button" data-nq="menu" aria-controls="row-actions">Actions</button>
//   <div class="nq-menu" id="row-actions" role="menu" hidden>
//     <button class="nq-menu-item" role="menuitem">Edit</button>
//     <div class="nq-menu-separator" role="separator"></div>
//     <button class="nq-menu-item" role="menuitem" data-variant="danger">Delete</button>
//   </div>

import { all, on, place, type Cleanup } from "./dom";

export interface MenuHandle {
  open(): void;
  close(focusTrigger?: boolean): void;
  readonly isOpen: boolean;
  destroy: Cleanup;
}

export function menu(trigger: HTMLElement): MenuHandle {
  const id = trigger.getAttribute("aria-controls");
  const panel = id ? document.getElementById(id) : null;
  if (!panel) return { open() {}, close() {}, isOpen: false, destroy() {} };
  const menuEl = panel;

  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  menuEl.hidden = true;
  let outside: Cleanup | null = null;

  const items = () =>
    Array.from(menuEl.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter((i) => !i.matches(":disabled, [aria-disabled='true']"));

  function open(focus: "first" | "last" = "first") {
    if (!menuEl.hidden) return;
    menuEl.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    place(menuEl, trigger);
    const list = items();
    (focus === "first" ? list[0] : list[list.length - 1])?.focus();
    const away = (event: Event) => {
      const t = event.target as Node;
      if (!menuEl.contains(t) && !trigger.contains(t)) close(false);
    };
    const reposition = () => place(menuEl, trigger);
    outside = all([
      on(document, "pointerdown", away, { capture: true }),
      on(window, "resize", reposition),
      on(window, "scroll", reposition, { capture: true, passive: true }),
    ]);
  }

  function close(focusTrigger = true) {
    if (menuEl.hidden) return;
    menuEl.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    outside?.();
    outside = null;
    if (focusTrigger) trigger.focus();
  }

  const cleanups = [
    on(trigger, "click", () => (menuEl.hidden ? open() : close())),
    on(trigger, "keydown", (event) => {
      const e = event as KeyboardEvent;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open(e.key === "ArrowDown" ? "first" : "last");
      }
    }),
    on(menuEl, "keydown", (event) => {
      const e = event as KeyboardEvent;
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      let to: HTMLElement | undefined;
      if (e.key === "ArrowDown") to = list[(i + 1) % list.length];
      else if (e.key === "ArrowUp") to = list[(i - 1 + list.length) % list.length];
      else if (e.key === "Home") to = list[0];
      else if (e.key === "End") to = list[list.length - 1];
      else if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      } else if (e.key === "Tab") close(false);
      else if (e.key.length === 1 && /\S/.test(e.key)) {
        to = list.slice(i + 1).concat(list.slice(0, i + 1)).find((it) => it.textContent?.trim().toLowerCase().startsWith(e.key.toLowerCase()));
      }
      if (to) {
        e.preventDefault();
        to.focus();
      }
    }),
    on(menuEl, "click", (event) => {
      const item = (event.target as Element).closest('[role="menuitem"]');
      if (item && menuEl.contains(item)) close();
    }),
  ];

  return {
    open: () => open(),
    close,
    get isOpen() {
      return !menuEl.hidden;
    },
    destroy: all([...cleanups, () => outside?.()]),
  };
}
