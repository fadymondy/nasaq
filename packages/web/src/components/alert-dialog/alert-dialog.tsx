"use client";

import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { type ComponentProps, type ReactNode, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button, type ButtonProps, buttonVariants } from "../button";

export const AlertDialog = BaseAlertDialog.Root;
export const AlertDialogTrigger = BaseAlertDialog.Trigger;
export const AlertDialogClose = BaseAlertDialog.Close;

/** Opacity-only transitions: the grid moves colour and light, never position. */
const fade = "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0";

export function AlertDialogBackdrop({ className, ...props }: ComponentProps<typeof BaseAlertDialog.Backdrop>) {
  return (
    <BaseAlertDialog.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn("fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60", fade, className as string)}
      {...props}
    />
  );
}

/** Portal + backdrop + popup. No × button and no outside-press dismissal: the user must pick an answer. */
export function AlertDialogContent({ className, children, ...props }: ComponentProps<typeof BaseAlertDialog.Popup>) {
  return (
    <BaseAlertDialog.Portal>
      <AlertDialogBackdrop />
      <BaseAlertDialog.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-md gap-4",
          "rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          fade,
          className as string,
        )}
        {...props}
      >
        {children}
      </BaseAlertDialog.Popup>
    </BaseAlertDialog.Portal>
  );
}

export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn("flex flex-col gap-1.5 text-start", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof BaseAlertDialog.Title>) {
  return (
    <BaseAlertDialog.Title data-slot="alert-dialog-title" className={cn("text-h3 text-foreground", className as string)} {...props} />
  );
}

export function AlertDialogDescription({ className, ...props }: ComponentProps<typeof BaseAlertDialog.Description>) {
  return (
    <BaseAlertDialog.Description
      data-slot="alert-dialog-description"
      className={cn("text-body-sm text-muted-foreground", className as string)}
      {...props}
    />
  );
}

type ActionVariant = "primary" | "danger" | "secondary" | "ghost";

export interface AlertDialogActionProps extends ComponentProps<typeof BaseAlertDialog.Close> {
  /** Button look. Default "danger" for the action, "ghost" for the cancel. */
  variant?: ActionVariant;
}

/** The confirming button. A `Close` that looks like a Button, so pressing it closes the dialog. */
export function AlertDialogAction({ className, variant = "danger", ...props }: AlertDialogActionProps) {
  return (
    <BaseAlertDialog.Close
      data-slot="alert-dialog-action"
      className={cn(buttonVariants({ variant }), className as string)}
      {...props}
    />
  );
}

/** The dismissing button. Put it first in the footer; it takes initial focus so Enter never destroys. */
export function AlertDialogCancel({ className, variant = "ghost", ...props }: AlertDialogActionProps) {
  return (
    <BaseAlertDialog.Close
      data-slot="alert-dialog-cancel"
      className={cn(buttonVariants({ variant }), className as string)}
      {...props}
    />
  );
}

const STRINGS = {
  en: { confirm: "Confirm", cancel: "Cancel" },
  ar: { confirm: "تأكيد", cancel: "إلغاء" },
};

export interface ConfirmButtonProps extends Omit<ButtonProps, "title" | "onClick" | "children"> {
  /** The trigger button's label. */
  children: ReactNode;
  /** The question: "Delete this project?". Name what is affected. */
  title: ReactNode;
  /** What happens and whether it can be undone. */
  description?: ReactNode;
  /** Label of the confirming button. Default: the trigger label when it is a string, else "Confirm" / "تأكيد". */
  confirmLabel?: ReactNode;
  /** Label of the cancel button. Default "Cancel" / "إلغاء" by the Nasaq locale. */
  cancelLabel?: ReactNode;
  /**
   * Runs when the user confirms. Return a promise to keep the dialog open with a loading confirm
   * button until it settles; the dialog closes on resolve and stays open on reject.
   */
  onConfirm: () => void | Promise<unknown>;
}

/**
 * A button that asks before it acts: renders a Button that opens an AlertDialog. The trigger and the
 * confirm button share `variant` (default "danger"). Use the AlertDialog parts for anything custom.
 */
export function ConfirmButton({
  children,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  variant = "danger",
  ...buttonProps
}: ConfirmButtonProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = STRINGS[ar ? "ar" : "en"];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    try {
      const result = onConfirm();
      if (result && typeof (result as Promise<unknown>).then === "function") {
        setPending(true);
        await result;
      }
      setOpen(false);
    } catch {
      // The host reports the failure; the dialog stays open so the user can retry or cancel.
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger render={<Button variant={variant} {...buttonProps} />}>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel ?? t.cancel}</AlertDialogCancel>
          <Button variant={variant} loading={pending} onClick={confirm}>
            {confirmLabel ?? (typeof children === "string" ? children : t.confirm)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
