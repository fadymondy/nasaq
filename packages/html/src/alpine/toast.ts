// nqToaster: the toast stack. Mount one <x-nq::toast /> near the app root (two stacks show every toast twice).
// The markup and classes are the React Toaster's (Sonner themed from Nasaq tokens); the stack sits at the
// inline end, so it mirrors in RTL.
//
//   <section data-slot="toaster" x-data="nqToaster(4000)" aria-label="Notifications" class="fixed bottom-4 end-4 …">
//     <ol><template x-for="t in toasts" :key="t.id"><li data-slot="toast" :data-type="t.type" role="status" …>…</li></template></ol>
//   </section>
//
// Fire a toast from anywhere (Alpine, Livewire, plain scripts):
//
//   window.nqToast.success("Invoice sent")                       also .error .warning .info .message
//   window.nqToast.error("Could not send", { description: "Retry in a minute", duration: 8000 })
//   $dispatch("nq-toast", { type: "success", title: "Invoice sent" })
//   window.nqToast.dismiss(id)
//
// Toasts leave after `duration` ms (0 keeps it), pause while the pointer is over the stack, and close with Escape
// when focus is inside it.

import type { Magics, Register } from "./types";

export type ToastType = "message" | "success" | "error" | "warning" | "info";

export interface ToastDetail {
  title: string;
  description?: string;
  type?: ToastType;
  /** Milliseconds before it leaves; 0 keeps it until dismissed. Default is the stack's duration. */
  duration?: number;
  id?: string | number;
}

interface ToastItem extends Required<Pick<ToastDetail, "title" | "type">> {
  id: string | number;
  description: string;
  duration: number;
}

interface ToasterState extends Magics {
  toasts: ToastItem[];
  add(detail: ToastDetail): string | number;
  schedule(item: ToastItem): void;
  dismiss(id: string | number): void;
  pause(): void;
  resume(): void;
}

export interface NqToastApi {
  (title: string, options?: Omit<ToastDetail, "title">): void;
  message(title: string, options?: Omit<ToastDetail, "title" | "type">): void;
  success(title: string, options?: Omit<ToastDetail, "title" | "type">): void;
  error(title: string, options?: Omit<ToastDetail, "title" | "type">): void;
  warning(title: string, options?: Omit<ToastDetail, "title" | "type">): void;
  info(title: string, options?: Omit<ToastDetail, "title" | "type">): void;
  dismiss(id?: string | number): void;
}

const EVENT = "nq-toast";
const DISMISS = "nq-toast-dismiss";

function api(): NqToastApi {
  const fire = (title: string, options: object = {}, type: ToastType = "message") =>
    window.dispatchEvent(new CustomEvent<ToastDetail>(EVENT, { detail: { type, ...options, title } }));
  const toast = ((title: string, options?: object) => fire(title, options)) as unknown as NqToastApi;
  for (const type of ["message", "success", "error", "warning", "info"] as const) {
    toast[type] = (title: string, options?: object) => fire(title, options, type);
  }
  toast.dismiss = (id) => window.dispatchEvent(new CustomEvent(DISMISS, { detail: { id } }));
  return toast;
}

export const toast: Register = (Alpine) => {
  Alpine.data("nqToaster", (defaultDuration = 4000) => {
    const timers = new Map<string | number, ReturnType<typeof setTimeout>>();
    let seq = 0;
    let off = () => {};
    return {
      toasts: [] as ToastItem[],
      init(this: ToasterState) {
        const w = window as unknown as { nqToast?: NqToastApi };
        w.nqToast ??= api();
        const onToast = (e: Event) => this.add((e as CustomEvent<ToastDetail>).detail);
        const onDismiss = (e: Event) => {
          const id = (e as CustomEvent<{ id?: string | number }>).detail?.id;
          if (id === undefined) [...this.toasts].forEach((t) => this.dismiss(t.id));
          else this.dismiss(id);
        };
        window.addEventListener(EVENT, onToast);
        window.addEventListener(DISMISS, onDismiss);
        off = () => {
          window.removeEventListener(EVENT, onToast);
          window.removeEventListener(DISMISS, onDismiss);
        };
      },
      destroy() {
        off();
        timers.forEach(clearTimeout);
        timers.clear();
      },
      add(this: ToasterState, detail: ToastDetail) {
        const id = detail.id ?? `nq-toast-${++seq}`;
        const item: ToastItem = {
          id,
          title: detail.title,
          description: detail.description ?? "",
          type: detail.type ?? "message",
          duration: detail.duration ?? defaultDuration,
        };
        const at = this.toasts.findIndex((t) => t.id === id);
        if (at >= 0) this.toasts.splice(at, 1, item);
        else this.toasts.push(item);
        this.schedule(item);
        return id;
      },
      schedule(this: ToasterState, item: ToastItem) {
        clearTimeout(timers.get(item.id));
        if (item.duration > 0) timers.set(item.id, setTimeout(() => this.dismiss(item.id), item.duration));
      },
      dismiss(this: ToasterState, id: string | number) {
        clearTimeout(timers.get(id));
        timers.delete(id);
        const at = this.toasts.findIndex((t) => t.id === id);
        if (at >= 0) this.toasts.splice(at, 1);
      },
      /** While the pointer or focus is on the stack the timers stop. */
      pause() {
        timers.forEach(clearTimeout);
        timers.clear();
      },
      resume(this: ToasterState) {
        for (const item of this.toasts) this.schedule(item);
      },
      /** Bind on the stack: hover pauses, Escape closes the newest toast. */
      region: {
        "x-on:mouseenter"(this: ToasterState) {
          this.pause();
        },
        "x-on:mouseleave"(this: ToasterState) {
          this.resume();
        },
        "x-on:keydown.escape"(this: ToasterState) {
          const last = this.toasts[this.toasts.length - 1];
          if (last) this.dismiss(last.id);
        },
      },
    };
  });
};
