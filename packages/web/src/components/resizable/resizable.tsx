"use client";

import { useDirection } from "@base-ui/react/direction-provider";
import { GripHorizontal, GripVertical } from "lucide-react";
import { Children, type ComponentProps, createContext, useContext } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Icon } from "../icon";

const STRINGS = {
  en: { resize: "Resize panels" },
  ar: { resize: "تغيير حجم اللوحات" },
};

type Orientation = "horizontal" | "vertical";

interface GroupContextValue {
  orientation: Orientation;
  /** True when a horizontal group is laid out right-to-left. */
  rtl: boolean;
}

const GroupContext = createContext<GroupContextValue>({ orientation: "horizontal", rtl: false });

export interface ResizablePanelGroupProps extends Omit<ComponentProps<typeof Group>, "orientation" | "dir"> {
  /** `horizontal` puts panels side by side; `vertical` stacks them. Default `horizontal`. */
  orientation?: Orientation;
  /** Overrides the direction from the Nasaq provider. Only matters for horizontal groups. */
  dir?: "ltr" | "rtl";
}

/**
 * A group of resizable panels and handles. `react-resizable-panels` measures the pointer and arrow keys in physical
 * coordinates and has no `dir` support, so in a horizontal RTL group Nasaq lays the group out left-to-right with its
 * children in reverse order (the first panel sits on the right) and puts `dir="rtl"` back on every panel.
 */
export function ResizablePanelGroup({ className, orientation = "horizontal", dir, children, ...props }: ResizablePanelGroupProps) {
  const inherited = useDirection();
  const rtl = orientation === "horizontal" && (dir ?? inherited) === "rtl";
  const items = rtl ? Children.toArray(children).reverse() : children;
  return (
    <GroupContext.Provider value={{ orientation, rtl }}>
      <Group
        data-slot="resizable-group"
        orientation={orientation}
        {...(rtl ? { dir: "ltr" as const } : {})}
        className={cn("size-full", className)}
        {...props}
      >
        {items}
      </Group>
    </GroupContext.Provider>
  );
}

export type ResizablePanelProps = ComponentProps<typeof Panel>;

/** One pane. Sizes are numbers (pixels) or strings with a unit (`"30%"`, `"20rem"`). Give every panel an `id` when you persist the layout. */
export function ResizablePanel({ className, ...props }: ResizablePanelProps) {
  const { rtl } = useContext(GroupContext);
  return (
    <Panel
      data-slot="resizable-panel"
      {...(rtl ? { dir: "rtl" as const } : {})}
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

export interface ResizableHandleProps extends ComponentProps<typeof Separator> {
  /** Show a grip on the handle. Default false. */
  withGrip?: boolean;
  /** Accessible name of the handle. Default "Resize panels" / "تغيير حجم اللوحات" by the Nasaq locale. */
  label?: string;
}

/** The draggable divider between two panels. Focusable: arrow keys resize, Home/End go to the limits, Enter collapses. */
export function ResizableHandle({ className, withGrip = false, label, children, ...props }: ResizableHandleProps) {
  const { orientation } = useContext(GroupContext);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const horizontal = orientation === "horizontal";
  return (
    <Separator
      data-slot="resizable-handle"
      aria-label={label ?? t.resize}
      className={cn(
        "relative flex shrink-0 items-center justify-center bg-border outline-none transition-colors duration-150 ease-nq",
        horizontal ? "w-px after:absolute after:inset-y-0 after:-inset-x-1.5" : "h-px after:absolute after:inset-x-0 after:-inset-y-1.5",
        "data-[separator=hover]:bg-nq-focus data-[separator=active]:bg-nq-focus",
        "focus-visible:bg-nq-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus",
        "data-[separator=disabled]:pointer-events-none data-[separator=disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      {withGrip ? (
        <div
          data-slot="resizable-grip"
          className={cn(
            "z-10 flex shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground",
            horizontal ? "h-6 w-3" : "h-3 w-6",
          )}
        >
          <Icon icon={horizontal ? GripVertical : GripHorizontal} className="size-2.5" />
        </div>
      ) : null}
      {children}
    </Separator>
  );
}
