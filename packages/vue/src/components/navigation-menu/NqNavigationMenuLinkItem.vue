<script setup lang="ts">
import { NavigationMenuLink } from "reka-ui";
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// One entry of a link list: an optional icon, a title and a description, as a single link. Renders its own `li`.
interface Props {
  /** Link title. */
  title?: string;
  /** One line under the title. */
  description?: string;
  /** An icon at the inline start (a lucide component), or use the `icon` slot. */
  icon?: Component;
  href?: string;
  active?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <li data-slot="navigation-menu-link-item" class="m-0 list-none">
    <NavigationMenuLink
      :href="props.href"
      :active="props.active"
      :class="
        cn(
          'flex items-start gap-3 rounded-control p-2.5 text-start no-underline outline-none transition-colors duration-150 ease-nq',
          'hover:bg-nq-hover focus-visible:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-active:bg-nq-selected',
          props.class,
        )
      "
    >
      <span v-if="props.icon || $slots.icon" aria-hidden="true" class="mt-0.5 inline-flex shrink-0 text-muted-foreground [&_svg]:size-5">
        <slot name="icon"><component :is="props.icon" /></slot>
      </span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="text-label text-foreground"><slot name="title">{{ props.title }}</slot></span>
        <span v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></span>
      </span>
    </NavigationMenuLink>
  </li>
</template>
