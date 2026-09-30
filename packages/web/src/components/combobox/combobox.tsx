"use client";

import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { type ComponentProps, createContext, type ReactNode, useContext, useState } from "react";
import { cn } from "../../lib/cn";
import { normalizeForSearch } from "../commands";

/** Arabic-aware match: folds case, diacritics, tatweel and alef/yeh/teh-marbuta variants (see `normalizeForSearch`). */
export function comboboxFilter<Item>(item: Item, query: string, itemToString?: (item: Item) => string) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const text = itemToString ? itemToString(item) : String((item as { label?: unknown } | null)?.label ?? item);
  return normalizeForSearch(text).includes(q);
}

/** In multi mode the chips box is the popup's anchor, so the list matches the control's width. */
const AnchorContext = createContext<{ anchor: HTMLDivElement | null; setAnchor: (el: HTMLDivElement | null) => void } | null>(
  null,
);

/**
 * Root. Pass `items` (`{ value, label }[]`) and `multiple` for chips. Filtering is Arabic-aware by default;
 * pass `filter` to replace it (`null` disables filtering, for async search).
 */
export function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: BaseCombobox.Root.Props<Value, Multiple>,
) {
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  return (
    <AnchorContext.Provider value={{ anchor, setAnchor }}>
      <BaseCombobox.Root filter={comboboxFilter} {...props} />
    </AnchorContext.Provider>
  );
}

export const ComboboxValue = BaseCombobox.Value;
export const ComboboxGroup = BaseCombobox.Group;
export const ComboboxCollection = BaseCombobox.Collection;

const boxClass = [
  "flex min-h-control min-w-0 w-full items-center gap-1 rounded-control border border-input bg-card text-body text-foreground",
  "transition-colors duration-150 ease-nq",
  "focus-within:border-nq-focus focus-within:outline-1 focus-within:outline-nq-focus",
  "has-[[data-invalid]]:border-nq-danger has-[[aria-invalid=true]]:border-nq-danger",
  "has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-50",
];

const inputClass =
  "h-full min-w-0 flex-1 border-0 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]";

const iconButtonClass =
  "flex size-6 shrink-0 cursor-default items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-1 focus-visible:outline-nq-focus [&_svg]:size-4";

export interface ComboboxInputProps extends ComponentProps<typeof BaseCombobox.Input> {
  /** Show a clear button while there is a selection. Default true. */
  clearable?: boolean;
  /** Accessible label of the clear button. Localise it. */
  clearLabel?: string;
  /** Accessible label of the chevron button. Localise it. */
  triggerLabel?: string;
}

/** Single-select control: a Select-looking box with a typeahead input, clear button and chevron. */
export function ComboboxInput({
  className,
  clearable = true,
  clearLabel = "Clear",
  triggerLabel = "Open",
  ...props
}: ComboboxInputProps) {
  return (
    <BaseCombobox.InputGroup data-slot="combobox-input-group" className={cn(boxClass, "h-control ps-3 pe-1.5")}>
      <BaseCombobox.Input data-slot="combobox-input" className={cn(inputClass, className as string)} {...props} />
      {clearable ? (
        <BaseCombobox.Clear data-slot="combobox-clear" aria-label={clearLabel} className={cn(iconButtonClass, "data-[hidden]:hidden")}>
          <X />
        </BaseCombobox.Clear>
      ) : null}
      <BaseCombobox.Trigger data-slot="combobox-trigger" aria-label={triggerLabel} className={iconButtonClass}>
        <ChevronsUpDown />
      </BaseCombobox.Trigger>
    </BaseCombobox.InputGroup>
  );
}

export interface ComboboxChipsProps extends Omit<ComponentProps<typeof BaseCombobox.Chips>, "children"> {
  placeholder?: string;
  /** Text for a chip. Default: the item's `label`, else `String(item)`. */
  itemToLabel?: (item: unknown) => ReactNode;
  /** Accessible label of each chip's remove button. Localise it. */
  removeLabel?: string;
  /** Props for the inline input (id, aria-label, name...). */
  inputProps?: ComponentProps<typeof BaseCombobox.Input>;
}

/** Multi-select control: selected items as chips followed by the typeahead input. Use inside `<Combobox multiple>`. */
export function ComboboxChips({
  className,
  placeholder,
  itemToLabel = (item) => (item as { label?: ReactNode } | null)?.label ?? String(item),
  removeLabel = "Remove",
  inputProps,
  ...props
}: ComboboxChipsProps) {
  const ctx = useContext(AnchorContext);
  return (
    <BaseCombobox.Chips
      data-slot="combobox-chips"
      ref={ctx?.setAnchor}
      className={cn(boxClass, "flex-wrap px-1.5 py-1", className as string)}
      {...props}
    >
      <BaseCombobox.Value>
        {(selected: unknown[]) => (
          <>
            {selected.map((item, i) => (
              <BaseCombobox.Chip
                key={i}
                data-slot="combobox-chip"
                className="inline-flex h-6 max-w-full items-center gap-1 rounded-[4px] border border-border bg-secondary ps-2 pe-0.5 text-body-sm text-foreground outline-none data-highlighted:border-nq-focus"
              >
                <span className="min-w-0 truncate">{itemToLabel(item)}</span>
                <BaseCombobox.ChipRemove
                  data-slot="combobox-chip-remove"
                  aria-label={removeLabel}
                  className="flex size-5 shrink-0 cursor-default items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground [&_svg]:size-3"
                >
                  <X />
                </BaseCombobox.ChipRemove>
              </BaseCombobox.Chip>
            ))}
            <BaseCombobox.Input
              data-slot="combobox-input"
              placeholder={selected.length ? undefined : placeholder}
              {...inputProps}
              className={cn(inputClass, "h-6 min-w-16 ps-1.5", inputProps?.className as string)}
            />
          </>
        )}
      </BaseCombobox.Value>
    </BaseCombobox.Chips>
  );
}

export interface ComboboxContentProps extends ComponentProps<typeof BaseCombobox.Popup> {
  side?: ComponentProps<typeof BaseCombobox.Positioner>["side"];
  align?: ComponentProps<typeof BaseCombobox.Positioner>["align"];
  sideOffset?: number;
}

export function ComboboxContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  ...props
}: ComboboxContentProps) {
  const ctx = useContext(AnchorContext);
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        anchor={ctx?.anchor ?? undefined}
        className="z-50 outline-none"
      >
        <BaseCombobox.Popup
          data-slot="combobox-content"
          className={cn(
            "w-[var(--anchor-width)] max-h-[min(var(--available-height),20rem)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating outline-none",
            "transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0",
            className as string,
          )}
          {...props}
        >
          {children}
        </BaseCombobox.Popup>
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

/** The list. Pass a render function to map over the filtered items: `{(item) => <ComboboxItem ... />}`. */
export function ComboboxList({ className, ...props }: ComponentProps<typeof BaseCombobox.List>) {
  return <BaseCombobox.List data-slot="combobox-list" className={cn("outline-none", className as string)} {...props} />;
}

export function ComboboxItem({ className, children, ...props }: ComponentProps<typeof BaseCombobox.Item>) {
  return (
    <BaseCombobox.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex h-nav-row min-h-[var(--nq-touch-min,0px)] cursor-default select-none items-center gap-2.5 rounded-control ps-8 pe-2.5 text-body-sm text-foreground outline-none",
        "data-highlighted:bg-nq-selected data-disabled:pointer-events-none data-disabled:opacity-50",
        className as string,
      )}
      {...props}
    >
      <span aria-hidden="true" className="absolute start-2.5 inline-flex size-4 items-center justify-center">
        <BaseCombobox.ItemIndicator>
          <Check className="size-4" />
        </BaseCombobox.ItemIndicator>
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </BaseCombobox.Item>
  );
}

/** Shown only when the filter leaves no items. Requires `items` on the root. Localise the copy. */
export function ComboboxEmpty({ className, ...props }: ComponentProps<typeof BaseCombobox.Empty>) {
  return (
    <BaseCombobox.Empty
      data-slot="combobox-empty"
      className={cn("px-2.5 py-2 text-body-sm text-muted-foreground empty:hidden", className as string)}
      {...props}
    />
  );
}

/** Must be inside a ComboboxGroup. */
export function ComboboxLabel({ className, ...props }: ComponentProps<typeof BaseCombobox.GroupLabel>) {
  return (
    <BaseCombobox.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2.5 pt-1.5 pb-1 text-caption font-medium text-muted-foreground", className as string)}
      {...props}
    />
  );
}

export function ComboboxSeparator({ className, ...props }: ComponentProps<typeof BaseCombobox.Separator>) {
  return (
    <BaseCombobox.Separator data-slot="combobox-separator" className={cn("-mx-1.5 my-1.5 h-px bg-border", className as string)} {...props} />
  );
}
