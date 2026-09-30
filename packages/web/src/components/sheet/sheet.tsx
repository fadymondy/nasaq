"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { OverlayClose } from "../dialog/close-button";

export const Sheet = BaseDialog.Root;
export const SheetTrigger = BaseDialog.Trigger;
export const SheetClose = BaseDialog.Close;

/**
 * Side-over panels slide from their edge (ARCHITECTURE A-7, revised 2026-09-29).
 * Sides are logical: "end" is the right edge in LTR and the left edge in RTL.
 */
const sheetVariants = cva(
  [
    "fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none shadow-floating",
    "transition-[translate,opacity] duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
  ],
  {
    variants: {
      side: {
        end: [
          "inset-y-0 end-0 h-dvh w-[min(24rem,100vw)] border-s border-border",
          "data-starting-style:translate-x-8 data-ending-style:translate-x-8",
          "rtl:data-starting-style:-translate-x-8 rtl:data-ending-style:-translate-x-8",
        ],
        start: [
          "inset-y-0 start-0 h-dvh w-[min(24rem,100vw)] border-e border-border",
          "data-starting-style:-translate-x-8 data-ending-style:-translate-x-8",
          "rtl:data-starting-style:translate-x-8 rtl:data-ending-style:translate-x-8",
        ],
        bottom: [
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-floating border-t border-border",
          "data-starting-style:translate-y-8 data-ending-style:translate-y-8",
        ],
      },
    },
    defaultVariants: { side: "end" },
  },
);

export function SheetBackdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60",
        className as string,
      )}
      {...props}
    />
  );
}

export interface SheetContentProps extends ComponentProps<typeof BaseDialog.Popup>, VariantProps<typeof sheetVariants> {
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
}

export function SheetContent({ side, className, children, showClose = true, closeLabel, ...props }: SheetContentProps) {
  return (
    <BaseDialog.Portal>
      <SheetBackdrop />
      <BaseDialog.Popup data-slot="sheet-content" data-side={side ?? "end"} className={cn(sheetVariants({ side }), className as string)} {...props}>
        {children}
        {showClose ? <OverlayClose slot="sheet-close" label={closeLabel} /> : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1 border-b border-border px-4 py-3.5 pe-12", className)} {...props} />;
}

export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-body" className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("flex items-center gap-2 border-t border-border px-4 py-3", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title data-slot="sheet-title" className={cn("text-label text-foreground", className as string)} {...props} />;
}

export function SheetDescription({ className, ...props }: ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description data-slot="sheet-description" className={cn("text-caption text-muted-foreground", className as string)} {...props} />;
}
