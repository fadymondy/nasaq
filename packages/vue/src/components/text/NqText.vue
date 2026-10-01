<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { defaultElement, roleClass, type TextRole } from "./variants";

const props = withDefaults(
  defineProps<{
    /** Typography role (docs/ARCHITECTURE.md section 9). Latin/Arabic metrics resolve from the nearest lang. */
    variant?: TextRole;
    /** The element or component to render. Default depends on the variant (h1, p, span, code). */
    as?: string | Component;
    class?: HTMLAttributes["class"];
  }>(),
  { variant: "body" },
);
</script>

<template>
  <component :is="props.as ?? defaultElement[props.variant]" data-slot="text" :class="cn(roleClass[props.variant], props.class)">
    <slot />
  </component>
</template>
