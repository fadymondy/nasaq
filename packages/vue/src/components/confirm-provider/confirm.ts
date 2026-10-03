import { inject, type InjectionKey } from "vue";

export interface ConfirmOptions {
  /** The question: "Delete this project?". Name what is affected. */
  title: string;
  /** What happens and whether it can be undone. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. Default true. */
  danger?: boolean;
}

/** Opens the dialog; resolves `true` on confirm, `false` on cancel, Escape or a click outside. */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const CONFIRM_KEY: InjectionKey<ConfirmFn> = Symbol("nq-confirm");

/**
 * Returns `confirm(options)`, a promise of the answer:
 * `if (!(await confirm({ title: "Delete this file?" }))) return;`
 * Needs a `NqConfirmProvider` above it.
 */
export function useConfirm(): ConfirmFn {
  const confirm = inject(CONFIRM_KEY, null);
  if (!confirm) throw new Error("useConfirm needs a <NqConfirmProvider> above it.");
  return confirm;
}
