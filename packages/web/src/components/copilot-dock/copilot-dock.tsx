"use client";

import { Sparkles } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { isApplePlatform, useModHotkey } from "../../lib/hotkey";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { CopilotChat, type CopilotChatProps } from "../copilot-chat";

const STRINGS = {
  en: { open: "Open assistant", close: "Close assistant", panel: "Assistant" },
  ar: { open: "افتح المساعد", close: "أغلق المساعد", panel: "المساعد" },
};

export type CopilotDockLabels = (typeof STRINGS)["en"];

export interface CopilotDockProps extends Omit<CopilotChatProps, "mode" | "onClose"> {
  /** Controlled open state. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Letter bound to ⌘ / Ctrl to toggle the dock. Default "j". `false` turns the shortcut off. */
  hotkey?: string | false;
  /** Show the floating launcher button while the dock is closed. Default true. */
  launcher?: boolean;
  /** Replaces the launcher icon. */
  launcherIcon?: ReactNode;
  /** `fixed` docks to the viewport, `absolute` to a `relative` parent (previews). Default `fixed`. */
  placement?: "fixed" | "absolute";
  /** Panel width. Default 26rem, never wider than the screen. */
  width?: string;
  dockLabels?: Partial<CopilotDockLabels>;
}

/**
 * The app-wide assistant: a floating launcher at the bottom inline-end corner that opens `CopilotChat`
 * in a panel docked to the inline-end edge. The panel is non-modal, so the page stays usable beside it.
 * ⌘J / Ctrl+J toggles it from anywhere; Escape inside the panel closes it and returns focus to the launcher.
 */
export function CopilotDock({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = "j",
  launcher = true,
  launcherIcon,
  placement = "fixed",
  width = "26rem",
  dockLabels,
  className,
  style,
  ...chat
}: CopilotDockProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...dockLabels };
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [shortcut, setShortcut] = useState<string | null>(null);

  const setOpen = (next: boolean) => {
    setInner(next);
    onOpenChange?.(next);
  };

  useModHotkey(hotkey || "j", () => setOpen(!open), hotkey !== false);

  // The modifier depends on the platform, which is only known in the browser.
  useEffect(() => {
    if (hotkey) setShortcut(`${isApplePlatform() ? "⌘" : "Ctrl+"}${hotkey.toUpperCase()}`);
  }, [hotkey]);

  // Move focus into the panel on open, so keyboard users land in the conversation.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      const field = panelRef.current?.querySelector<HTMLElement>("textarea, [contenteditable='true']");
      (field ?? panelRef.current)?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  return (
    <>
      {launcher && !open && (
        <button
          ref={launcherRef}
          type="button"
          data-slot="copilot-dock-launcher"
          aria-expanded={false}
          aria-controls={panelId}
          aria-keyshortcuts={hotkey ? `${isApplePlatform() ? "Meta" : "Control"}+${hotkey.toUpperCase()}` : undefined}
          title={shortcut ? `${t.open} (${shortcut})` : t.open}
          aria-label={t.open}
          onClick={() => setOpen(true)}
          className={cn(
            placement,
            "bottom-4 end-4 z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating",
            "transition-colors duration-150 ease-nq hover:bg-primary/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&_svg]:size-5",
          )}
        >
          {launcherIcon ?? <Sparkles aria-hidden />}
        </button>
      )}
      <div
        ref={panelRef}
        id={panelId}
        role="complementary"
        aria-label={t.panel}
        tabIndex={-1}
        hidden={!open}
        data-slot="copilot-dock"
        data-open={open || undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.stopPropagation();
            close();
          }
        }}
        style={{ width: `min(100%, ${width})`, ...style }}
        className={cn(placement, "inset-y-0 end-0 z-40 flex flex-col border-s border-border bg-background shadow-floating outline-none", className)}
      >
        {open && <CopilotChat {...chat} mode="panel" onClose={close} className="min-h-0 flex-1" />}
      </div>
    </>
  );
}
