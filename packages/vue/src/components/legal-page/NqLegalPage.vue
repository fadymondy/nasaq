<script setup lang="ts">
import { Check, Link2, TriangleAlert } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqTableOfContents, useActiveHeading } from "../blog-post";
import { copyText } from "../copy-button";
import { NqIcon } from "../icon";
import { NqMarkdown } from "../markdown";
import { NqDateTime } from "../numeric";
import { NqText } from "../text";
import { legalFill, useLegalPageStrings, type LegalDocument, type LegalPageLabels } from "./labels";
import { legalHashTarget, legalSectionUrl, resolveLegalSections } from "./legal-model";

// Terms, privacy and similar documents: a switcher between documents, the date it was updated, a draft notice, numbered
// sections with `#anchors` you can copy, and an "On this page" rail. The text is one readable column (about 68 characters).
// A link with a `#section` hash scrolls to its section on load.
const props = withDefaults(
  defineProps<{
    /** The document to show. */
    document: LegalDocument;
    /** The documents of the site (terms, privacy, cookies). With two or more, a switcher is shown. */
    documents?: { id: string; title: string }[];
    /** Pixels headings keep from the top when scrolled to. Default 96. */
    scrollOffset?: number;
    labels?: LegalPageLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { scrollOffset: 96 },
);
const emit = defineEmits<{
  /** A document was picked in the switcher. Navigate, then pass the new `document`. */
  selectDocument: [id: string];
  /** After a section link was copied. The page also announces it. */
  copyLink: [url: string];
}>();

const t = useLegalPageStrings(() => props.labels);
const bodyRef = ref<HTMLElement | null>(null);
const resolved = computed(() => resolveLegalSections(props.document.sections));
const items = computed(() => resolved.value.map((r) => ({ id: r.id, text: r.section.title, level: 2, line: r.number })));
const active = useActiveHeading(() => resolved.value.map((r) => r.id), bodyRef, () => props.scrollOffset);
const copied = ref<string | null>(null);
let timer = 0;

const openHash = () => {
  const target = legalHashTarget(window.location.hash, resolved.value.map((r) => r.id));
  if (target) window.document.getElementById(target)?.scrollIntoView({ block: "start" });
};
onMounted(openHash);
watch(() => props.document.id, () => requestAnimationFrame(openHash), { flush: "post" });
onBeforeUnmount(() => window.clearTimeout(timer));

const copyLink = async (id: string) => {
  const url = legalSectionUrl(window.location.href, id);
  if (await copyText(url)) {
    copied.value = id;
    emit("copyLink", url);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (copied.value = null), 1800);
  }
};
</script>

<template>
  <div data-slot="legal-page" :class="cn('mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12', props.class)">
    <div class="flex min-w-0 flex-1 flex-col gap-8">
      <nav v-if="props.documents && props.documents.length > 1" :aria-label="t.documents" class="flex flex-wrap gap-1 border-b border-border pb-3">
        <button
          v-for="d in props.documents"
          :key="d.id"
          type="button"
          :aria-current="d.id === props.document.id ? 'page' : undefined"
          :class="
            cn(
              'h-control-sm rounded-control px-3 text-body-sm outline-none transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus',
              d.id === props.document.id ? 'bg-nq-selected font-medium text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground',
            )
          "
          @click="d.id !== props.document.id && emit('selectDocument', d.id)"
        >
          {{ d.title }}
        </button>
      </nav>

      <header class="flex max-w-[68ch] flex-col gap-3">
        <NqText as="h1" variant="h1" dir="auto" class="text-start">{{ props.document.title }}</NqText>
        <p v-if="props.document.summary" dir="auto" class="text-body-lg text-muted-foreground">{{ props.document.summary }}</p>
        <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-muted-foreground">
          <span>{{ t.updated }} <NqDateTime :value="props.document.updated" :format="{ dateStyle: 'long' }" /></span>
          <span v-if="props.document.effective">{{ t.effective }} <NqDateTime :value="props.document.effective" :format="{ dateStyle: 'long' }" /></span>
          <bdi v-if="props.document.version">{{ legalFill(t.version, { version: props.document.version }) }}</bdi>
        </p>
        <NqAlert v-if="props.document.draft" tone="warning" :title="t.draftTitle" :icon="TriangleAlert">{{ t.draft }}</NqAlert>
      </header>

      <div ref="bodyRef" class="flex max-w-[68ch] flex-col gap-10">
        <section v-for="r in resolved" :key="r.id" :aria-labelledby="`${r.id}-title`" data-slot="legal-section" class="group/section flex flex-col gap-3">
          <h2 :id="r.id" :style="{ scrollMarginTop: `${props.scrollOffset}px` }" class="flex items-baseline gap-3 text-start">
            <span aria-hidden="true" class="text-h3 font-semibold tabular-nums text-muted-foreground">{{ r.number }}.</span>
            <NqText as="span" variant="h2" dir="auto" :id="`${r.id}-title`" class="min-w-0">{{ r.section.title }}</NqText>
            <button
              type="button"
              :aria-label="legalFill(`${t.copyLink}: {title}`, { title: r.section.title })"
              class="ms-1 inline-flex size-6 shrink-0 items-center justify-center self-center rounded-control text-muted-foreground opacity-0 outline-none transition-opacity duration-150 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-nq-focus group-hover/section:opacity-100 pointer-coarse:opacity-100"
              @click="copyLink(r.id)"
            >
              <NqIcon :icon="copied === r.id ? Check : Link2" class="size-4" />
            </button>
          </h2>
          <NqMarkdown :source="r.section.body" class="gap-4 text-body leading-relaxed" />
        </section>
      </div>

      <div v-if="$slots.footer" class="max-w-[68ch] border-t border-border pt-6 text-body-sm text-muted-foreground"><slot name="footer" /></div>
      <p role="status" class="sr-only">{{ copied ? t.linkCopied : "" }}</p>
    </div>

    <aside class="hidden w-56 shrink-0 lg:block">
      <div class="sticky top-20">
        <NqTableOfContents :items="items" :active-id="active" :title="t.onThisPage" />
      </div>
    </aside>
  </div>
</template>
