"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { OverlayClose } from "./close-button";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogClose = BaseDialog.Close;

/** Opacity-only transitions: the grid moves colour and light, never position. */
const fade = "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0";

export function DialogBackdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-backdrop"
      className={cn("fixed inset-0 z-50 bg-nq-fg/15 dark:bg-nq-bg/60", fade, className as string)}
      {...props}
    />
  );
}

export interface DialogContentProps extends ComponentProps<typeof BaseDialog.Popup> {
  /** Render the close (×) button in the header corner. */
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
}

export function DialogContent({ className, children, showClose = true, closeLabel, ...props }: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <DialogBackdrop />
      <BaseDialog.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-0 z-50 m-auto grid h-fit w-[calc(100%-2rem)] max-w-lg gap-4",
          "rounded-floating border border-border bg-popover p-6 text-popover-foreground outline-none",
          "max-h-[calc(100dvh-2rem)] overflow-y-auto",
          fade,
          className as string,
        )}
        {...props}
      >
        {children}
        {showClose ? <OverlayClose slot="dialog-close" label={closeLabel} /> : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 pe-8 text-start", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title data-slot="dialog-title" className={cn("text-h3 text-foreground", className as string)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn("text-body-sm text-muted-foreground", className as string)}
      {...props}
    />
  );
}
