<script setup lang="ts">
import { ChevronDown, Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuShortcut, NqDropdownMenuTrigger } from "../dropdown-menu";
import { NqKbd } from "../text";
import { useShortcutApple } from "../keyboard-shortcuts";
import { aiShortcutKeys } from "./shortcut";
import NqAiSparkleButton from "./NqAiSparkleButton.vue";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import type { AiAction } from "./types";

// The main AI action with a menu of alternatives, e.g. "Summarize" plus Translate, Rewrite, Fix grammar.
const props = withDefaults(
  defineProps<{
    /** The main action on the first half (default slot overrides). Default "Ask AI". */
    label?: string;
    /** Runs the main action. */
    onRun?: () => void;
    /** Other actions in the menu on the other half. */
    actions: readonly AiAction[];
    /** Runs a menu action. */
    onAction?: (id: string) => void;
    generating?: boolean;
    disabled?: boolean;
    variant?: "primary" | "secondary" | "ghost" | "danger" | "link" | null;
    labels?: Partial<AiStatesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { variant: "secondary" },
);
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const apple = useShortcutApple();
const keysOf = (shortcut: string) => aiShortcutKeys(shortcut, apple.value);
</script>

<template>
  <div data-slot="ai-split-button" role="group" :class="cn('inline-flex items-stretch', props.class)">
    <NqAiSparkleButton :variant="props.variant" :generating="props.generating" :disabled="props.disabled" :labels="props.labels" class="rounded-e-none border-e-0" @click="props.onRun?.()">
      <template v-if="$slots.default || props.label" #default><slot>{{ props.label }}</slot></template>
    </NqAiSparkleButton>
    <NqDropdownMenu>
      <NqDropdownMenuTrigger as-child>
        <NqButton :variant="props.variant" size="icon" :aria-label="t.moreActions" :disabled="props.disabled || props.generating" class="rounded-s-none">
          <ChevronDown aria-hidden="true" />
        </NqButton>
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent align="end" class="min-w-56">
        <NqDropdownMenuItem v-for="a in props.actions" :key="a.id" :disabled="a.disabled" @select="props.onAction?.(a.id)">
          <component :is="a.icon" v-if="a.icon" aria-hidden="true" />
          <Sparkles v-else aria-hidden="true" />
          {{ a.label }}
          <NqDropdownMenuShortcut v-if="a.shortcut">
            <span dir="ltr" class="inline-flex gap-0.5"><NqKbd v-for="k in keysOf(a.shortcut)" :key="k">{{ k }}</NqKbd></span>
          </NqDropdownMenuShortcut>
        </NqDropdownMenuItem>
      </NqDropdownMenuContent>
    </NqDropdownMenu>
  </div>
</template>
