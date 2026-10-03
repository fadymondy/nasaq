"use client";
import { createContext, type ReactNode, use, useCallback, useRef, useState } from "react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../alert-dialog";
import { Button } from "../button";

const STRINGS = {
  en: { confirm: "Confirm", cancel: "Cancel" },
  ar: { confirm: "تأكيد", cancel: "إلغاء" },
};

export interface ConfirmOptions {
  /** The question: "Delete this project?". Name what is affected. */
  title: ReactNode;
  /** What happens and whether it can be undone. */
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Styles the confirm button as destructive. Default true. */
  danger?: boolean;
}

/** Opens the dialog; resolves `true` on confirm, `false` on cancel, Escape or a click outside. */
export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export interface ConfirmProviderProps {
  children: ReactNode;
}

/**
 * Holds one AlertDialog for the whole app, so any handler can `await confirm({...})` before it acts.
 * Mount it once, inside `NasaqProvider`.
 */
export function ConfirmProvider({ children }: ConfirmProviderProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = STRINGS[ar ? "ar" : "en"];
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open cancels the first.
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const variant = options?.danger === false ? "primary" : "danger";

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog open={open} onOpenChange={(next) => !next && settle(false)}>
        <AlertDialogContent data-slot="confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description ? <AlertDialogDescription>{options.description}</AlertDialogDescription> : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelLabel ?? t.cancel}</AlertDialogCancel>
            <Button variant={variant} onClick={() => settle(true)}>
              {options?.confirmLabel ?? t.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext>
  );
}

/**
 * Returns `confirm(options)`, a promise of the answer:
 * `if (!(await confirm({ title: "Delete this file?" }))) return;`
 * Needs a `ConfirmProvider` above it. For a single button use `ConfirmButton` instead.
 */
export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error("useConfirm needs a <ConfirmProvider> above it.");
  return confirm;
}
