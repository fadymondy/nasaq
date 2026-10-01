"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { Children, type ComponentProps, isValidElement, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type SelectItemEntry = { value: unknown; label: ReactNode };

/** Reads `<SelectItem value>` elements out of an element tree: through groups and content, not through components. */
function collectItems(node: ReactNode, out: SelectItemEntry[] = []): SelectItemEntry[] {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: unknown; children?: ReactNode };
    if (child.type === SelectItem) {
      if (props.value !== undefined) out.push({ value: props.value, label: props.children });
    } else if (props.children) collectItems(props.children, out);
  });
  return out;
}

/**
 * Root. The trigger shows the selected item's label, not its raw value, even before the list has opened: pass `items`
 * (`{ value, label }[]` or a value→label record), or leave it out and the labels are read from the `SelectItem`s
 * written inline in the children (not from items inside your own sub-components: pass `items` for those).
 */
export function Select<Value, Multiple extends boolean | undefined = false>(props: BaseSelect.Root.Props<Value, Multiple>) {
  const { items, children } = props;
  const derived = items === undefined ? collectItems(children as ReactNode) : [];
  const rootProps = items === undefined && derived.length > 0 ? { ...props, items: derived as unknown as BaseSelect.Root.Props<Value, Multiple>["items"] } : props;
  return <BaseSelect.Root {...rootProps} />;
}
export const SelectGroup = BaseSelect.Group;

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof BaseSelect.Trigger>) {
  return (
    <BaseSelect.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-control w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-card px-3 text-body text-foreground",
        "min-h-[var(--nq-touch-min,0px)] cursor-default select-none outline-none transition-colors duration-150 ease-nq",
        "focus-visible:border-nq-focus focus-visible:outline-1 focus-visible:outline-nq-focus data-popup-open:border-nq-focus",
        "data-invalid:border-nq-danger data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "pointer-coarse:text-[16px]",
        className as string,
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
        <ChevronsUpDown />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  );
}

export function SelectValue({ className, ...props }: ComponentProps<typeof BaseSelect.Value>) {
  return (
    <BaseSelect.Value
      data-slot="select-value"
      className={cn("min-w-0 flex-1 truncate text-start data-placeholder:text-muted-foreground", className as string)}
      {...props}
    />
  );
}

export interface SelectContentProps extends ComponentProps<typeof BaseSelect.Popup> {
  side?: ComponentProps<typeof BaseSelect.Positioner>["side"];
  align?: ComponentProps<typeof BaseSelect.Positioner>["align"];
  sideOffset?: number;
  /** Overlay the selected item on the trigger (the native select feel). Default false: the list opens below. */
  alignItemWithTrigger?: boolean;
}

export function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignItemWithTrigger = false,
  ...props
}: SelectContentProps) {
  return (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50 outline-none"
      >
        <BaseSelect.Popup
          data-slot="select-content"
          className={cn(
            "min-w-[var(--anchor-width)] max-h-[var(--available-height)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        >
          <BaseSelect.List>{children}</BaseSelect.List>
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof BaseSelect.Item>) {
  return (
    <BaseSelect.Item
      data-slot="select-item"
      className={cn(
        "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none",
        "data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
        className as string,
      )}
      {...props}
    >
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <BaseSelect.ItemIndicator>
          <Check className="size-4" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText className="min-w-0 flex-1 truncate">{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  );
}

/** Put it inside a SelectGroup, which names the group for assistive tech. */
export function SelectLabel({ className, ...props }: ComponentProps<typeof BaseSelect.GroupLabel>) {
  return (
    <BaseSelect.GroupLabel
      data-slot="select-label"
      className={cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string)}
      {...props}
    />
  );
}

export function SelectSeparator({ className, ...props }: ComponentProps<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator data-slot="select-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />;
}
