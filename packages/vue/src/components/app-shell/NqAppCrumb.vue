<script setup lang="ts">
import { ChevronsUpDown } from "lucide-vue-next";
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqBadge } from "../badge";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuTrigger } from "../dropdown-menu";
import { slotText } from "./vnodes";

/**
 * One step of the path: an optional mark (`icon` slot), the name, a tag (`tag` slot) and a switcher (`menu` slot,
 * the menu items for the up-down button beside the name: other organisations, projects, branches...).
 */
interface Props {
  tagVariant?: "neutral" | "outline" | "brand" | "accent" | "success" | "warning" | "danger" | "info";
  /** Links the name. The current step is not a link. */
  href?: string;
  current?: boolean;
  /** Accessible name of the switcher button. Default "Switch {name}". */
  menuLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tagVariant: "outline" });
const slots = useSlots();
const t = useT();
const name = () => slotText(slots.default?.()) ?? "";
const labelClass = cn(
  "flex h-8 min-w-0 items-center gap-2 rounded-control px-1.5 text-label text-foreground outline-none",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
);
</script>

<template>
  <span data-slot="app-crumb" :class="cn('flex min-w-0 items-center gap-1', props.class)">
    <a v-if="props.href && !props.current" :href="props.href" :class="cn(labelClass, 'transition-colors duration-150 ease-nq hover:bg-nq-hover')">
      <span v-if="slots.icon" class="inline-flex shrink-0 [&_svg]:size-4"><slot name="icon" /></span>
      <span class="truncate"><slot /></span>
    </a>
    <span v-else :aria-current="props.current ? 'page' : undefined" :class="labelClass">
      <span v-if="slots.icon" class="inline-flex shrink-0 [&_svg]:size-4"><slot name="icon" /></span>
      <span class="truncate"><slot /></span>
    </span>
    <NqBadge v-if="slots.tag" :variant="props.tagVariant" class="shrink-0 uppercase"><slot name="tag" /></NqBadge>
    <NqDropdownMenu v-if="slots.menu">
      <NqDropdownMenuTrigger
        as="button"
        :aria-label="props.menuLabel ?? t(`Switch ${name()}`.trim(), `تبديل ${name()}`)"
        :class="
          cn(
            'inline-flex size-6 shrink-0 items-center justify-center rounded-control text-muted-foreground outline-none',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground data-popup-open:bg-nq-selected',
            'focus-visible:outline-2 focus-visible:outline-nq-focus',
          )
        "
      >
        <ChevronsUpDown aria-hidden="true" class="size-3.5" />
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent align="start" class="w-64"><slot name="menu" /></NqDropdownMenuContent>
    </NqDropdownMenu>
  </span>
</template>
