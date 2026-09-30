"use client";

import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "../icon";

/** Root. One panel open at a time by default; pass `multiple` to let several stay open. */
export function Accordion({ className, ...props }: ComponentProps<typeof BaseAccordion.Root>) {
  return (
    <BaseAccordion.Root
      data-slot="accordion"
      className={cn("flex w-full flex-col rounded-card border border-border bg-card", className as string)}
      {...props}
    />
  );
}

export function AccordionItem({ className, ...props }: ComponentProps<typeof BaseAccordion.Item>) {
  return (
    <BaseAccordion.Item
      data-slot="accordion-item"
      className={cn("border-b border-border first:rounded-t-card last:rounded-b-card last:border-b-0", className as string)}
      {...props}
    />
  );
}

/** Header + trigger in one: a full-width button with the title at the inline start and a chevron that turns when open. */
export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof BaseAccordion.Trigger>) {
  return (
    <BaseAccordion.Header data-slot="accordion-header" className="m-0 flex">
      <BaseAccordion.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-label text-foreground outline-none",
          "transition-colors duration-150 ease-nq hover:bg-nq-hover",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
          "data-disabled:pointer-events-none data-disabled:opacity-50",
          className as string,
        )}
        {...props}
      >
        {children}
        <Icon
          icon={ChevronDown}
          className="text-muted-foreground transition-transform duration-200 ease-nq motion-reduce:transition-none group-data-panel-open:rotate-180"
        />
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

/** Same disclosure motion as `CollapsiblePanel`: height + opacity, 200ms. */
export function AccordionPanel({ className, children, ...props }: ComponentProps<typeof BaseAccordion.Panel>) {
  return (
    <BaseAccordion.Panel
      data-slot="accordion-panel"
      className={cn(
        "h-(--accordion-panel-height) overflow-hidden text-body-sm text-muted-foreground transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none",
        "data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0",
        className as string,
      )}
      {...props}
    >
      <div className="px-4 pb-4">{children}</div>
    </BaseAccordion.Panel>
  );
}
