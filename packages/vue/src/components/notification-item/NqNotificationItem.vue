<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqAvatar } from "../avatar";

defineOptions({ inheritAttrs: false });

interface Props {
  /** Renders an `<a>` instead of a `<button>` (open in a new tab, real navigation). */
  href?: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
  /** Who acted. Renders an avatar unless the `icon` slot is given. */
  actor?: { name: string; avatar?: string };
  title?: string;
  description?: string;
  /** Pre-formatted relative time ("2m", "منذ ساعة"). */
  time?: string;
  /** Machine-readable value for the `<time>` element (ISO 8601), e.g. "2026-09-29T10:15:00Z". */
  dateTime?: string;
  unread?: boolean;
  /** Screen-reader text for the unread dot. Defaults to "Unread" / "غير مقروء" by locale. */
  unreadLabel?: string;
  class?: HTMLAttributes["class"];
}

// One row of the notifications side-over. Unread = accent dot + stronger title, never colour alone.
const props = withDefaults(defineProps<Props>(), { unread: false });
const t = useT();
const unreadText = computed(() => props.unreadLabel ?? t("Unread", "غير مقروء"));
const isLink = computed(() => props.href !== undefined);
const linkAttrs = computed(() => ({ href: props.href, target: props.target, rel: props.rel ?? (props.target === "_blank" ? "noopener noreferrer" : undefined) }));
</script>

<template>
  <component
    :is="isLink ? 'a' : 'button'"
    :type="isLink ? undefined : 'button'"
    v-bind="{ ...(isLink ? linkAttrs : {}), ...$attrs }"
    data-slot="notification-item"
    :data-unread="props.unread ? '' : undefined"
    :class="
      cn(
        'flex w-full items-start no-underline gap-3 px-4 py-3 text-start outline-none',
        'transition-colors duration-150 ease-nq hover:bg-nq-hover',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        props.class,
      )
    "
  >
    <span class="relative mt-0.5 shrink-0">
      <span v-if="$slots.icon" class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
        <slot name="icon" />
      </span>
      <NqAvatar v-else-if="props.actor" :name="props.actor.name" :src="props.actor.avatar" size="md" />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span :class="cn('text-body-sm', props.unread ? 'font-medium text-foreground' : 'text-muted-foreground')"><slot name="title">{{ props.title }}</slot></span>
      <span v-if="$slots.description || props.description" class="line-clamp-2 text-caption text-muted-foreground"><slot name="description">{{ props.description }}</slot></span>
    </span>
    <span class="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
      <time v-if="$slots.time || props.time" :datetime="props.dateTime" class="text-caption text-muted-foreground tabular-nums"><slot name="time">{{ props.time }}</slot></time>
      <span v-if="props.unread" class="size-2 rounded-full bg-nq-accent"><span class="sr-only">{{ unreadText }}</span></span>
    </span>
  </component>
</template>
