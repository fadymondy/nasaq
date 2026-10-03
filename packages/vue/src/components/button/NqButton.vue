<script setup lang="ts">
import { Primitive } from "reka-ui";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSpinner } from "../spinner";
import { buttonVariants } from "./variants";

interface Props {
  /** The element or component to render. Default "button". */
  as?: string | Component;
  /** Render the single child instead (an Inertia Link, a router-link) with the button classes. */
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
  size?: "sm" | "md" | "lg" | "icon" | "icon-sm" | null;
  /** `pill` is fully rounded (icon sizes become circles). Default `default`: the system's control radius. */
  shape?: "default" | "pill" | null;
  /** Shows a spinner, sets aria-busy and blocks interaction while keeping focus. */
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { as: "button", type: "button" });
const iconOnly = computed(() => props.size === "icon" || props.size === "icon-sm");
const isButton = computed(() => props.as === "button" && !props.asChild);
</script>

<template>
  <Primitive
    data-slot="button"
    :as="props.as"
    :as-child="props.asChild"
    :type="isButton ? props.type : undefined"
    :data-shape="props.shape === 'pill' ? 'pill' : undefined"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size, shape: props.shape }), props.class)"
    :aria-busy="props.loading || undefined"
    :disabled="isButton ? props.disabled && !props.loading : undefined"
    :aria-disabled="props.loading || (!isButton && props.disabled) || undefined"
    :data-disabled="props.disabled || props.loading ? '' : undefined"
    @click.capture="(e: MouseEvent) => (props.loading || props.disabled) && (e.preventDefault(), e.stopImmediatePropagation())"
  >
    <slot v-if="props.asChild" />
    <template v-else>
      <NqSpinner v-if="props.loading" />
      <slot v-if="!(props.loading && iconOnly)" />
    </template>
  </Primitive>
</template>
