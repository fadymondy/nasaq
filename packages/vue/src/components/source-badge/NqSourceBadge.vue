<script setup lang="ts">
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Where a record came from: a plugin, an integration or a feed, as an icon and a name. Use it on rows,
// search results and imported items. For statuses use NqBadge or NqStatus.
interface Props {
  /** The source's name, already localised: "GitHub", "Google Drive", "RSS". */
  label: string;
  /** A lucide icon component. For a brand mark `<svg>` or `<img>` use the `icon` slot. */
  icon?: Component;
  /** Brand colour for the icon only; the label stays in text colour. */
  color?: string;
  /** Icon only. The label becomes the accessible name and the tooltip. */
  compact?: boolean;
  size?: "sm" | "md";
  /** Makes the badge an external link. */
  href?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { compact: false, size: "sm" });
const classes = computed(() =>
  cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-control border border-border bg-secondary text-foreground",
    props.size === "sm" ? "h-6 px-2 text-caption [&_svg]:size-3.5" : "h-7 px-2.5 text-label [&_svg]:size-4",
    props.compact && (props.size === "sm" ? "w-6 justify-center px-0" : "w-7 justify-center px-0"),
    props.href && "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
    props.class,
  ),
);
</script>

<template>
  <component
    :is="props.href ? 'a' : 'span'"
    data-slot="source-badge"
    :href="props.href"
    :target="props.href ? '_blank' : undefined"
    :rel="props.href ? 'noopener noreferrer' : undefined"
    :role="!props.href && props.compact ? 'img' : undefined"
    :aria-label="props.compact ? props.label : undefined"
    :title="props.compact ? props.label : undefined"
    :class="classes"
  >
    <span v-if="props.icon || $slots.icon" data-slot="source-badge-icon" class="inline-flex items-center [&_img]:size-3.5" :style="props.color ? { color: props.color } : undefined">
      <slot name="icon"><component :is="props.icon" aria-hidden="true" /></slot>
    </span>
    <span v-if="!props.compact" class="truncate">{{ props.label }}</span>
  </component>
</template>
