// nqConfirmProvider: one app-wide confirm dialog you can await from any handler. The markup is the React
// ConfirmProvider's AlertDialog, the state lives here.
//
//   <div x-data="nqConfirmProvider()" x-id="['nq-confirm']" x-on:nq:confirm.window="ask($event.detail)">…dialog…</div>
//   <button x-on:click="if (await $confirm({ title: 'Delete Billing?', confirmLabel: 'Delete' })) remove()">Delete</button>
//
// `$confirm(options)` resolves true on Confirm and false on Cancel or Escape (there is no outside-press dismissal,
// as with the React AlertDialog). A second request while one is open resolves the first with false.
// Options: title, description, confirmLabel, cancelLabel, danger (default true).

import type { Magics, Register } from "./types";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. Default true. */
  danger?: boolean;
}

interface ConfirmRequest {
  options: ConfirmOptions;
  resolve(value: boolean): void;
}

interface ConfirmState extends Magics {
  open: boolean;
  options: ConfirmOptions;
  resolver: ((value: boolean) => void) | null;
  returnTo: HTMLElement | null;
  ask(request: ConfirmRequest): void;
  settle(value: boolean): void;
}

export const confirmProvider: Register = (Alpine) => {
  // $confirm(options): Promise<boolean>, from any component.
  Alpine.magic("confirm", () => (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => {
      window.dispatchEvent(new CustomEvent("nq:confirm", { detail: { options, resolve } satisfies ConfirmRequest }));
    }),
  );

  Alpine.data("nqConfirmProvider", () => ({
    open: false,
    options: { title: "" } as ConfirmOptions,
    resolver: null as ((value: boolean) => void) | null,
    returnTo: null as HTMLElement | null,
    ask(this: ConfirmState, request: ConfirmRequest) {
      // A second request while one is open cancels the first.
      this.resolver?.(false);
      this.options = request.options;
      this.resolver = request.resolve;
      if (!this.open) this.returnTo = document.activeElement as HTMLElement | null;
      this.open = true;
    },
    settle(this: ConfirmState, value: boolean) {
      this.resolver?.(value);
      this.resolver = null;
      this.open = false;
      const back = this.returnTo;
      this.returnTo = null;
      back?.focus?.();
    },
    /** Bind on the popup: alertdialog role, labelled by the title. Escape cancels. */
    popup: {
      role: "alertdialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-confirm", "title");
      },
      ":aria-describedby"(this: ConfirmState) {
        return this.options.description ? this.$id("nq-confirm", "description") : null;
      },
      "x-on:keydown.escape.prevent.stop"(this: ConfirmState) {
        this.settle(false);
      },
    },
  }));
};
