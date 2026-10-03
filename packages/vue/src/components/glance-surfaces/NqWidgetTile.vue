<script setup lang="ts">
import { computed, getCurrentInstance, useSlots, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { SIZE_CLASS, toneFill, toneStroke, toneText, type GlanceTone, type WidgetSize } from "./strings";

defineOptions({ inheritAttrs: false });

interface Props {
  size?: WidgetSize;
  /** `home` is opaque; `lock` is translucent so a wallpaper shows through. */
  surface?: "home" | "lock";
  title: string;
  /** A lucide icon component. */
  icon?: Component;
  /** The main figure. Or use the `value` slot. */
  value?: string | number;
  caption?: string;
  /** 0 to 100. Draws a ring around the value in `circular`, and a bar in the other sizes. */
  progress?: number;
  tone?: GlanceTone;
  /** Makes the tile a button that opens the app. Also on when an `@open` listener is set. */
  openable?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { size: "small", surface: "home", tone: "neutral", openable: false, value: undefined, progress: undefined });
const emit = defineEmits<{ open: [] }>();
const slots = useSlots();
const instance = getCurrentInstance();
const isButton = computed(() => props.openable || typeof instance?.vnode.props?.onOpen !== "undefined");

const surfaceClass = computed(() => (props.surface === "lock" ? "border border-border/40 bg-card/55 backdrop-blur-md" : "border border-border bg-card shadow-sm"));
const label = computed(() => [props.title, typeof props.value === "string" || typeof props.value === "number" ? String(props.value) : "", props.caption].filter(Boolean).join(", "));
const pct = computed(() => Math.max(0, Math.min(100, props.progress ?? 0)));
const R = 26;
const C = 2 * Math.PI * R;
const classes = computed(() =>
  cn(
    "relative flex shrink-0 overflow-hidden text-foreground",
    props.size === "circular" ? "items-center justify-center" : props.size === "inline" ? "items-center" : "flex-col",
    surfaceClass.value,
    SIZE_CLASS[props.size],
    props.class,
  ),
);
const buttonClasses = computed(() => cn(classes.value, "text-start outline-none transition-transform duration-150 ease-nq active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"));
const hasValue = computed(() => props.value !== undefined || !!slots.value);
</script>

<template>
  <div v-if="isButton" data-slot="widget-tile" :data-size="props.size" :data-surface="props.surface" class="contents">
    <button type="button" :aria-label="label" :class="buttonClasses" v-bind="$attrs" @click="emit('open')">
      <template v-if="props.size === 'circular'">
        <svg v-if="props.progress !== undefined" aria-hidden="true" viewBox="0 0 64 64" class="absolute inset-0 size-full -rotate-90 rtl:scale-y-[-1]">
          <circle cx="32" cy="32" :r="R" fill="none" stroke-width="5" class="stroke-nq-line-strong/60" />
          <circle cx="32" cy="32" :r="R" fill="none" stroke-width="5" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - pct / 100)" :class="toneStroke[props.tone]" />
        </svg>
        <span class="relative flex flex-col items-center leading-none">
          <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="mb-0.5 size-3.5 text-muted-foreground" />
          <span :class="cn('text-label font-semibold tabular-nums', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
        </span>
      </template>
      <span v-else-if="props.size === 'inline'" class="flex w-full items-center gap-2 text-label">
        <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
        <span class="min-w-0 flex-1 truncate">{{ props.title }}</span>
        <span :class="cn('shrink-0 font-medium tabular-nums', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
      </span>
      <template v-else>
        <div class="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
          <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="size-4 shrink-0" />
          <span class="truncate">{{ props.title }}</span>
        </div>
        <div :class="cn('mt-auto', props.size === 'large' && 'mt-3')">
          <p v-if="hasValue" :class="cn('tabular-nums leading-none font-semibold', props.size === 'small' ? 'text-h1' : 'text-display', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></p>
          <p v-if="props.caption" class="mt-1 truncate text-caption text-muted-foreground">{{ props.caption }}</p>
          <div v-if="props.progress !== undefined" role="presentation" class="mt-2 h-1.5 overflow-hidden rounded-full bg-nq-line-strong/50">
            <div :class="cn('h-full rounded-full', toneFill[props.tone])" :style="{ width: `${pct}%` }" />
          </div>
        </div>
        <div v-if="props.size !== 'small' && $slots.default" class="mt-3 min-h-0 flex-1 overflow-hidden"><slot /></div>
      </template>
    </button>
  </div>
  <div v-else data-slot="widget-tile" :data-size="props.size" :data-surface="props.surface" role="group" :aria-label="label" :class="classes" v-bind="$attrs">
    <template v-if="props.size === 'circular'">
      <svg v-if="props.progress !== undefined" aria-hidden="true" viewBox="0 0 64 64" class="absolute inset-0 size-full -rotate-90 rtl:scale-y-[-1]">
        <circle cx="32" cy="32" :r="R" fill="none" stroke-width="5" class="stroke-nq-line-strong/60" />
        <circle cx="32" cy="32" :r="R" fill="none" stroke-width="5" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - pct / 100)" :class="toneStroke[props.tone]" />
      </svg>
      <span class="relative flex flex-col items-center leading-none">
        <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="mb-0.5 size-3.5 text-muted-foreground" />
        <span :class="cn('text-label font-semibold tabular-nums', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
      </span>
    </template>
    <span v-else-if="props.size === 'inline'" class="flex w-full items-center gap-2 text-label">
      <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate">{{ props.title }}</span>
      <span :class="cn('shrink-0 font-medium tabular-nums', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></span>
    </span>
    <template v-else>
      <div class="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
        <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="size-4 shrink-0" />
        <span class="truncate">{{ props.title }}</span>
      </div>
      <div :class="cn('mt-auto', props.size === 'large' && 'mt-3')">
        <p v-if="hasValue" :class="cn('tabular-nums leading-none font-semibold', props.size === 'small' ? 'text-h1' : 'text-display', toneText[props.tone])"><slot name="value">{{ props.value }}</slot></p>
        <p v-if="props.caption" class="mt-1 truncate text-caption text-muted-foreground">{{ props.caption }}</p>
        <div v-if="props.progress !== undefined" role="presentation" class="mt-2 h-1.5 overflow-hidden rounded-full bg-nq-line-strong/50">
          <div :class="cn('h-full rounded-full', toneFill[props.tone])" :style="{ width: `${pct}%` }" />
        </div>
      </div>
      <div v-if="props.size !== 'small' && $slots.default" class="mt-3 min-h-0 flex-1 overflow-hidden"><slot /></div>
    </template>
  </div>
</template>
