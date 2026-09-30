"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  type ComponentProps,
  createContext,
  type PointerEvent,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/cn";
import { OverlayClose } from "../dialog/close-button";

export const DrawerTrigger = BaseDialog.Trigger;
export const DrawerClose = BaseDialog.Close;

/** Fraction of the height of the drawer that must be dragged before releasing closes it. */
const CLOSE_RATIO = 0.3;
/** A quick flick closes regardless of distance (px per ms). */
const CLOSE_VELOCITY = 0.6;
const SLIDE_OUT_MS = 200;

interface DrawerContextValue {
  /** Distance the popup is dragged down, in px. */
  offset: number;
  dragging: boolean;
  setOffset: (px: number) => void;
  setDragging: (dragging: boolean) => void;
  close: () => void;
}
const DrawerContext = createContext<DrawerContextValue | null>(null);

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * A bottom drawer for touch screens: a Base UI Dialog that slides up, has a drag handle and closes when
 * you swipe it down. Use `Sheet` for side panels and desktop-first surfaces.
 */
export function Drawer({ open, defaultOpen, onOpenChange, children }: DrawerProps) {
  const [inner, setInner] = useState(defaultOpen ?? false);
  const isOpen = open ?? inner;
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  const value = useMemo<DrawerContextValue>(
    () => ({ offset, dragging, setOffset, setDragging, close: () => setOpen(false) }),
    [offset, dragging, setOpen],
  );

  return (
    <DrawerContext value={value}>
      <BaseDialog.Root
        open={isOpen}
        onOpenChange={(next) => setOpen(next)}
        // After the exit animation the popup is unmounted: forget the drag so the next open starts in place.
        onOpenChangeComplete={(next) => {
          if (!next) setOffset(0);
        }}
      >
        {children}
      </BaseDialog.Root>
    </DrawerContext>
  );
}

export function DrawerBackdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-nq-fg/10 transition-opacity duration-200 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none dark:bg-nq-bg/60",
        className as string,
      )}
      {...props}
    />
  );
}

export interface DrawerContentProps extends ComponentProps<typeof BaseDialog.Popup> {
  /** Show the drag handle (and enable swipe-down-to-close). Default true. */
  showHandle?: boolean;
  showClose?: boolean;
  /** Label for the close button. Defaults to "Close" / "إغلاق" by the Nasaq locale. */
  closeLabel?: string;
}

export function DrawerContent({ className, children, style, showHandle = true, showClose = true, closeLabel, ...props }: DrawerContentProps) {
  const ctx = use(DrawerContext);
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!ctx || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, velocity: 0 };
    ctx.setDragging(true);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!ctx || !d) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    // Only downwards: dragging up past the resting position does nothing.
    ctx.setOffset(Math.max(0, e.clientY - d.startY));
  }
  function finish(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const d = drag.current;
    if (!ctx || !d) return;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    ctx.setDragging(false);
    const height = popupRef.current?.offsetHeight ?? 0;
    const shouldClose = !cancelled && (ctx.offset > height * CLOSE_RATIO || d.velocity > CLOSE_VELOCITY);
    if (!shouldClose) {
      ctx.setOffset(0); // snap back
      return;
    }
    if (reducedMotion()) {
      ctx.close();
      return;
    }
    ctx.setOffset(height); // slide the rest of the way out, then close
    window.setTimeout(ctx.close, SLIDE_OUT_MS);
  }

  const moved = ctx ? ctx.offset > 0 || ctx.dragging : false;

  return (
    <BaseDialog.Portal>
      <DrawerBackdrop />
      <BaseDialog.Popup
        ref={popupRef}
        data-slot="drawer-content"
        data-dragging={ctx?.dragging || undefined}
        style={{
          ...(typeof style === "object" ? style : undefined),
          ...(moved ? { translate: `0 ${ctx?.offset ?? 0}px` } : undefined),
        }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] w-full max-w-xl flex-col rounded-t-floating border border-b-0 border-border bg-popover text-popover-foreground shadow-floating outline-none",
          "transition-[translate,opacity] duration-200 ease-nq data-starting-style:translate-y-8 data-starting-style:opacity-0 data-ending-style:translate-y-8 data-ending-style:opacity-0",
          "data-dragging:transition-none motion-reduce:transition-none",
          className as string,
        )}
        {...props}
      >
        {showHandle ? (
          <div
            data-slot="drawer-handle"
            aria-hidden="true"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => finish(e, false)}
            onPointerCancel={(e) => finish(e, true)}
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          >
            <span className="h-1 w-10 rounded-full bg-nq-line-strong" />
          </div>
        ) : null}
        {children}
        {showClose ? <OverlayClose slot="drawer-close" label={closeLabel} /> : null}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-header" className={cn("flex flex-col gap-1 border-b border-border px-4 pb-3.5 pe-12", className)} {...props} />;
}

export function DrawerBody({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-body" className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn("flex items-center gap-2 border-t border-border px-4 py-3", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title data-slot="drawer-title" className={cn("text-label text-foreground", className as string)} {...props} />;
}

export function DrawerDescription({ className, ...props }: ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description data-slot="drawer-description" className={cn("text-caption text-muted-foreground", className as string)} {...props} />;
}
