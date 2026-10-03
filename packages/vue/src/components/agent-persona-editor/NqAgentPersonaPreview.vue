<script setup lang="ts">
import { Bot } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { colorToCss } from "../color-picker";
import { NqIconByName } from "../icon-picker";
import { usePersonaStrings, type AgentPersona, type AgentPersonaEditorLabels } from "./strings";

// The agent as its users will meet it: a coloured icon tile, name, tagline, traits and the greeting.
interface Props {
  persona: Pick<AgentPersona, "name" | "tagline" | "color" | "icon" | "traits" | "greeting">;
  labels?: Partial<AgentPersonaEditorLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = usePersonaStrings(() => props.labels);
const css = computed(() => colorToCss(props.persona.color || "--nq-tag-gray"));
</script>

<template>
  <div data-slot="agent-persona-preview" :class="cn('flex flex-col gap-3 rounded-card border border-border bg-card p-4', props.class)">
    <div class="flex items-center gap-3">
      <span
        aria-hidden="true"
        class="inline-flex size-11 shrink-0 items-center justify-center rounded-control [&_svg]:size-5"
        :style="{ backgroundColor: `color-mix(in oklab, ${css} 16%, transparent)`, color: css }"
      >
        <NqIconByName v-if="props.persona.icon" :name="props.persona.icon" />
        <Bot v-else />
      </span>
      <div class="min-w-0">
        <p dir="auto" class="truncate text-label text-foreground">{{ props.persona.name.trim() || t.unnamed }}</p>
        <p v-if="props.persona.tagline" dir="auto" class="truncate text-caption text-muted-foreground">{{ props.persona.tagline }}</p>
      </div>
    </div>
    <ul v-if="props.persona.traits.length > 0" class="flex flex-wrap gap-1.5" :aria-label="t.traits">
      <li v-for="trait in props.persona.traits" :key="trait">
        <NqBadge variant="outline" dir="auto">{{ trait }}</NqBadge>
      </li>
    </ul>
    <p v-if="props.persona.greeting" dir="auto" class="rounded-card rounded-ss-none bg-secondary px-3 py-2 text-body-sm text-foreground">{{ props.persona.greeting }}</p>
  </div>
</template>
