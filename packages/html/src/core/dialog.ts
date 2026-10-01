// Dialog and sheet on the native <dialog> element: focus trap, Escape and top-layer stacking come free.
//
//   <button class="nq-button" data-nq-open="invite">Invite</button>
//   <dialog id="invite" class="nq-dialog" data-nq="dialog"> … <button data-nq-close>Cancel</button></dialog>

import { on, type Cleanup } from "./dom";

export function openDialog(target: string | HTMLDialogElement | null): void {
  const el = typeof target === "string" ? document.getElementById(target) : target;
  if (el instanceof HTMLDialogElement && !el.open) el.showModal();
}

export function closeDialog(target: string | HTMLDialogElement | null, value?: string): void {
  const el = typeof target === "string" ? document.getElementById(target) : target;
  if (el instanceof HTMLDialogElement && el.open) el.close(value);
}

/** Binds one <dialog>: a click on the backdrop closes it, unless it has data-dismissible="false". */
export function dialog(el: HTMLDialogElement): Cleanup {
  return on(el, "click", (event) => {
    if (event.target !== el || el.dataset.dismissible === "false") return;
    const r = el.getBoundingClientRect();
    const e = event as MouseEvent;
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) el.close();
  });
}

/** Delegated triggers for the whole document: [data-nq-open="id"] and [data-nq-close] (inside a dialog). */
export function dialogTriggers(root: Document | HTMLElement = document): Cleanup {
  return on(root, "click", (event) => {
    const target = event.target as Element | null;
    const opener = target?.closest<HTMLElement>("[data-nq-open]");
    if (opener) {
      event.preventDefault();
      openDialog(opener.dataset.nqOpen ?? null);
      return;
    }
    const closer = target?.closest<HTMLElement>("[data-nq-close]");
    if (closer) {
      const host = closer.closest("dialog");
      if (host) closeDialog(host, closer.dataset.nqClose || undefined);
    }
  });
}
