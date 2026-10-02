<script setup lang="ts">
import { Star } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import type { Testimonial } from "./testimonials-logic";

// One testimonial: stars, quote, person. Internal to NqTestimonialWall.
interface Props {
  item: Testimonial;
  ratedOutOf: (n: number) => string;
  actions?: readonly ContextMenuAction[];
  spotlight?: boolean;
}
const props = withDefaults(defineProps<Props>(), { actions: undefined, spotlight: false });
const sub = () => [props.item.role, props.item.company].filter(Boolean).join(", ");
</script>

<template>
  <NqContextMenuActions
    as="figure"
    :actions="props.actions ?? []"
    data-slot="testimonial"
    :data-id="props.item.id"
    :tabindex="props.actions?.length ? 0 : undefined"
    :class="
      cn(
        'flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
        props.spotlight ? 'p-6 sm:p-10' : 'p-5',
      )
    "
  >
    <span v-if="props.item.rating" role="img" :aria-label="props.ratedOutOf(props.item.rating)" class="inline-flex gap-0.5">
      <Star v-for="n in 5" :key="n" aria-hidden="true" :class="cn('size-4', n <= (props.item.rating ?? 0) ? 'fill-nq-accent text-nq-accent' : 'text-nq-line-strong')" />
    </span>
    <blockquote :class="cn('text-pretty', props.spotlight ? 'text-heading-3 leading-relaxed' : 'text-body')">{{ props.item.quote }}</blockquote>
    <figcaption class="flex min-w-0 items-center gap-3">
      <NqAvatar :name="props.item.name" :src="props.item.avatarUrl" />
      <span class="flex min-w-0 flex-col">
        <span :class="cn('truncate font-medium', props.spotlight ? 'text-body' : 'text-body-sm')">{{ props.item.name }}</span>
        <span v-if="sub()" class="truncate text-caption text-muted-foreground">{{ sub() }}</span>
      </span>
    </figcaption>
  </NqContextMenuActions>
</template>
