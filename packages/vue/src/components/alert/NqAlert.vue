<script setup lang="ts">
import { X } from "lucide-vue-next";
import type { Component, HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { buttonVariants } from "../button";
import { alertIconText, alertToneIcon, alertVariants, type AlertTone } from "./variants";

// A quiet inline notice. The description is the default slot; `warning` and `danger` default to role="alert",
// `info` and `success` to role="status".
interface Props {
  tone?: AlertTone;
  /** Short heading. Omit for a one-line notice (or use the `title` slot). */
  title?: string;
  /** A lucide-vue-next icon that replaces the tone glyph. */
  icon?: Component;
  /** Shows a dismiss button that emits `dismiss`; the host hides the alert. */
  dismissible?: boolean;
  /** Label of the dismiss button. Default "Dismiss" / "تجاهل" by the Nasaq locale. */
  dismissLabel?: string;
  /** Override the live-region role. */
  role?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "info" });
const emit = defineEmits<{ dismiss: [] }>();
const t = useT();
const Glyph = computed(() => props.icon ?? alertToneIcon[props.tone]);
const role = computed(() => props.role ?? (props.tone === "danger" || props.tone === "warning" ? "alert" : "status"));
</script>

<template>
  <div data-slot="alert" :data-tone="props.tone" :role="role" :class="cn(alertVariants({ tone: props.tone }), props.class)">
    <component :is="Glyph" aria-hidden="true" data-slot="alert-icon" :class="cn('mt-0.5 size-4', alertIconText[props.tone])" />
    <div data-slot="alert-body" class="flex min-w-0 flex-col gap-0.5">
      <div v-if="props.title || $slots.title" data-slot="alert-title" class="text-label text-foreground">
        <slot name="title">{{ props.title }}</slot>
      </div>
      <div
        v-if="$slots.default"
        data-slot="alert-description"
        :class="cn('text-body-sm', props.title || $slots.title ? 'text-muted-foreground' : 'text-foreground')"
      >
        <slot />
      </div>
    </div>
    <div v-if="$slots.action || props.dismissible" data-slot="alert-actions" class="ms-3 flex items-center gap-1">
      <slot name="action" />
      <button
        v-if="props.dismissible"
        type="button"
        :aria-label="props.dismissLabel ?? t('Dismiss', 'تجاهل')"
        :class="cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground [&_svg]:size-3.5')"
        @click="emit('dismiss')"
      >
        <X aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
