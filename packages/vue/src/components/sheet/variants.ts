import { cva, type VariantProps } from "class-variance-authority";

/**
 * Side-over panels slide from their edge (ARCHITECTURE A-7, revised 2026-09-29).
 * Sides are logical: "end" is the right edge in LTR and the left edge in RTL.
 */
export const sheetVariants = cva(
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

export type SheetVariants = VariantProps<typeof sheetVariants>;

export const sheetBackdropClass =
  "fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 dark:bg-nq-bg/60";
