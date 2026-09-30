"use client";

import { CalendarDays, LayoutGrid, List, type LucideIcon, SquareKanban, Table2 } from "lucide-react";
import { type ComponentProps, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Toggle, ToggleGroup } from "../toggle-group";
import { Tooltip } from "../tooltip";

export type ViewMode = "table" | "grid" | "board" | "list" | "calendar";

const STRINGS = {
  en: { label: "View", table: "Table", grid: "Grid", board: "Board", list: "List", calendar: "Calendar" },
  ar: { label: "طريقة العرض", table: "جدول", grid: "شبكة", board: "لوحة", list: "قائمة", calendar: "تقويم" },
};

export type ViewToggleLabels = (typeof STRINGS)["en"];

const ICONS: Record<ViewMode, LucideIcon> = {
  table: Table2,
  grid: LayoutGrid,
  board: SquareKanban,
  list: List,
  calendar: CalendarDays,
};

export interface ViewToggleProps extends Omit<ComponentProps<"div">, "defaultValue" | "onChange"> {
  /** The views this page offers, in order. Default table and grid. */
  views?: readonly ViewMode[];
  /** Controlled view. */
  value?: ViewMode;
  /** First view when uncontrolled. Default the first of `views`. */
  defaultValue?: ViewMode;
  onValueChange?: (view: ViewMode) => void;
  /** Remembers the choice in `localStorage` under this key, so the page opens in the view the visitor left it in. */
  storageKey?: string;
  /** Show the text next to each icon. Default false: icon-only with a tooltip. */
  showLabels?: boolean;
  labels?: Partial<ViewToggleLabels>;
}

function readStored(key: string | undefined, views: readonly ViewMode[]): ViewMode | undefined {
  if (!key || typeof window === "undefined") return undefined;
  try {
    const stored = window.localStorage.getItem(key) as ViewMode | null;
    return stored && views.includes(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Switches how a collection is shown: table, grid of cards, board, list or calendar. One view is always
 * pressed. With `storageKey` the choice survives reloads.
 */
export function ViewToggle({
  views = ["table", "grid"],
  value,
  defaultValue,
  onValueChange,
  storageKey,
  showLabels = false,
  labels,
  className,
  ...props
}: ViewToggleProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [inner, setInner] = useState<ViewMode>(defaultValue ?? views[0] ?? "table");
  const current = value ?? inner;

  // Read the stored view after mount, so server and client render the same first frame.
  useEffect(() => {
    const stored = readStored(storageKey, views);
    if (stored && stored !== current) {
      setInner(stored);
      onValueChange?.(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const select = (next: ViewMode) => {
    setInner(next);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        /* storage full or blocked: the choice still applies for this visit */
      }
    }
    onValueChange?.(next);
  };

  return (
    <div data-slot="view-toggle" className={cn("inline-flex", className)} {...props}>
      <ToggleGroup
        aria-label={t.label}
        value={[current]}
        onValueChange={(next: unknown[]) => {
          const picked = next[0] as ViewMode | undefined;
          if (picked && picked !== current) select(picked);
        }}
      >
        {views.map((view) => {
          const Glyph = ICONS[view];
          const item = (
            <Toggle key={view} value={view} aria-label={showLabels ? undefined : t[view]} data-view={view}>
              <Glyph aria-hidden />
              {showLabels && <span>{t[view]}</span>}
            </Toggle>
          );
          return showLabels ? (
            item
          ) : (
            <Tooltip key={view} content={t[view]}>
              {item}
            </Tooltip>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
