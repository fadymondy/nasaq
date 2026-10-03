<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import type { LandingPage } from "./landing-page";
import type { LandingPageEditorLabels } from "./strings";

// The live preview of a page at desktop or phone width. Clicking a section selects it. Internal to the landing page editor.
interface Props {
  page: LandingPage;
  selectedId: string | null;
  device: "desktop" | "mobile";
  t: LandingPageEditorLabels;
}
const props = defineProps<Props>();
const emit = defineEmits<{ select: [id: string] }>();
const visible = computed(() => props.page.sections.filter((s) => s.visible));
const textClass =
  "border-t border-border px-6 py-8 text-start text-body text-nq-fg-body [&_a]:underline [&_h2]:text-h2 [&_h3]:text-h3 [&_h2]:text-foreground [&_h3]:text-foreground [&_p]:mb-3 [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:ps-6 [&_ul]:ps-6";
</script>

<template>
  <div class="flex justify-center rounded-card border border-border bg-secondary p-3">
    <div role="region" :aria-label="t.previewLabel" :dir="page.dir" :class="cn('@container w-full overflow-hidden rounded-card border border-border bg-background', props.device === 'mobile' ? 'max-w-[390px]' : 'max-w-[960px]')">
      <p v-if="visible.length === 0" class="p-10 text-center text-body-sm text-muted-foreground">{{ t.noSectionsHint }}</p>
      <!-- The preview is a pointer shortcut; the Sections list is the keyboard route to every section. -->
      <div
        v-for="s in visible"
        v-else
        :key="s.id"
        :data-selected="s.id === props.selectedId || undefined"
        :title="t.previewSelect(t.types[s.type])"
        class="relative cursor-pointer outline-offset-[-2px] hover:outline hover:outline-1 hover:outline-nq-line-strong data-selected:outline data-selected:outline-2 data-selected:outline-nq-focus"
        @click="emit('select', s.id)"
      >
        <div v-if="s.type === 'hero'" :class="cn('flex flex-col gap-4 px-6 py-12 @lg:py-16', s.data.align === 'center' ? 'items-center text-center' : 'items-start text-start')">
          <span v-if="s.data.eyebrow" class="text-caption uppercase tracking-wide text-muted-foreground">{{ s.data.eyebrow }}</span>
          <h2 class="max-w-2xl text-h1 text-foreground @lg:text-display">{{ s.data.headline }}</h2>
          <p class="max-w-xl text-body text-muted-foreground">{{ s.data.subheadline }}</p>
          <div :class="cn('flex flex-wrap gap-2 pt-2', s.data.align === 'center' && 'justify-center')">
            <NqButton v-if="s.data.primaryLabel" as="span" variant="primary" size="lg" tabindex="-1">{{ s.data.primaryLabel }}</NqButton>
            <NqButton v-if="s.data.secondaryLabel" as="span" size="lg" tabindex="-1">{{ s.data.secondaryLabel }}</NqButton>
          </div>
        </div>

        <div v-else-if="s.type === 'features'" class="flex flex-col gap-6 border-t border-border px-6 py-10">
          <div class="flex flex-col gap-1 text-start">
            <h3 class="text-h2 text-foreground">{{ s.data.title }}</h3>
            <p v-if="s.data.subtitle" class="text-body text-muted-foreground">{{ s.data.subtitle }}</p>
          </div>
          <ul class="grid gap-4 @lg:grid-cols-3">
            <li v-for="item in s.data.items" :key="item.id" class="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-start">
              <span class="flex size-8 items-center justify-center rounded-control bg-secondary"><Sparkles aria-hidden="true" class="size-4 text-muted-foreground" /></span>
              <span class="pt-1 text-label text-foreground">{{ item.title }}</span>
              <span class="text-body-sm text-muted-foreground">{{ item.description }}</span>
            </li>
          </ul>
        </div>

        <div v-else-if="s.type === 'faq'" class="flex flex-col gap-4 border-t border-border px-6 py-10 text-start">
          <h3 class="text-h2 text-foreground">{{ s.data.title }}</h3>
          <dl class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            <div v-for="item in s.data.items" :key="item.id" class="flex flex-col gap-1 p-4">
              <dt class="text-label text-foreground">{{ item.question }}</dt>
              <dd class="text-body-sm text-muted-foreground">{{ item.answer }}</dd>
            </div>
          </dl>
        </div>

        <div v-else-if="s.type === 'cta'" class="px-6 py-10">
          <div class="flex flex-col items-center gap-3 rounded-card border border-border bg-secondary px-6 py-10 text-center">
            <h3 class="text-h2 text-foreground">{{ s.data.title }}</h3>
            <p class="max-w-md text-body text-muted-foreground">{{ s.data.body }}</p>
            <NqButton v-if="s.data.buttonLabel" as="span" variant="primary" size="lg" tabindex="-1">{{ s.data.buttonLabel }}</NqButton>
          </div>
        </div>

        <!-- Authored in the rich text editor, which only produces its own schema (no scripts, safe links). -->
        <div v-else-if="s.type === 'text'" :class="textClass" v-html="s.data.html" />
      </div>
    </div>
  </div>
</template>
