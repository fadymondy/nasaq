<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { groupTools } from "./format";
import { STRINGS, type ApiReferenceLabels } from "./strings";
import { accessVariant, type ApiTool } from "./types";

// Every tool as a card, grouped by category: name, summary, scope and minimum role at a glance.
interface Props {
  tools: ApiTool[];
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<ApiReferenceLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const emit = defineEmits<{ select: [tool: ApiTool] }>();
const nasaq = useNasaq();
const t = computed<ApiReferenceLabels>(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const groups = computed(() => groupTools(props.tools));
</script>

<template>
  <div data-slot="api-tool-catalog" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <section v-for="g in groups" :key="g.category" class="flex flex-col gap-2">
      <h3 v-if="g.category" class="eyebrow">{{ g.category }}</h3>
      <ul class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
        <li v-for="tool in g.tools" :key="tool.id" class="min-w-0">
          <article
            :data-tool="tool.id"
            class="relative flex h-full flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-xs transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-nq-focus hover:bg-nq-hover"
          >
            <div class="flex items-start justify-between gap-2">
              <h4 class="min-w-0 break-all font-mono text-label text-foreground">
                <button type="button" class="text-start outline-none after:absolute after:inset-0 after:content-['']" @click="emit('select', tool)">
                  <bdi dir="ltr">{{ tool.name }}</bdi>
                </button>
              </h4>
              <NqBadge v-if="tool.deprecated" variant="warning">{{ t.deprecated }}</NqBadge>
            </div>
            <p dir="auto" class="line-clamp-2 text-body-sm text-muted-foreground">{{ tool.summary }}</p>
            <div class="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
              <NqBadge variant="outline">
                <bdi dir="ltr" class="font-mono">{{ tool.scope }}</bdi>
              </NqBadge>
              <NqBadge variant="info">{{ tool.minRole }}</NqBadge>
              <NqBadge v-if="(tool.access ?? 'read') !== 'read'" :variant="accessVariant[tool.access ?? 'read']">{{ t.accessLevels[tool.access ?? "read"] }}</NqBadge>
            </div>
          </article>
        </li>
      </ul>
    </section>
  </div>
</template>
