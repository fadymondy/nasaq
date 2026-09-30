"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useOptionalNasaq } from "../../provider/nasaq-provider";

/** Internal: the × button shared by DialogContent and SheetContent. Not part of the public API. */
export const overlayCloseClass =
  "absolute end-3 top-3 inline-flex size-8 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus [&_svg]:size-4";

/** Internal: `closeLabel` falls back to "Close" / "إغلاق" by the Nasaq locale. */
export function OverlayClose({ slot, label }: { slot: string; label?: string }) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return (
    <BaseDialog.Close data-slot={slot} aria-label={label ?? (ar ? "إغلاق" : "Close")} className={overlayCloseClass}>
      <X />
    </BaseDialog.Close>
  );
}
