<script setup lang="ts">
import { Link2 } from "lucide-vue-next";
import { getCurrentInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { formatNumber } from "../numeric";
import { useChromeStrings, type EditorChromeLabels, type EditorLink } from "./strings";

// A side panel listing the documents that link here, with the mentioning line highlighted, and related documents below.
interface Props {
  /** Documents that link to this one. */
  backlinks: EditorLink[];
  /** Documents that are related by topic or tags. */
  related?: EditorLink[];
  /** Word in a snippet to emphasise, usually the current title. */
  highlight?: string;
  labels?: EditorChromeLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { related: () => [], highlight: undefined, labels: undefined });
const emit = defineEmits<{ open: [link: EditorLink] }>();
const canOpen = typeof (getCurrentInstance()?.vnode.props ?? {}).onOpen !== "undefined";
const { t, locale } = useChromeStrings(() => props.labels);

function parts(text: string, term?: string) {
  if (!term) return { before: text, mark: "", after: "" };
  const i = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (i < 0) return { before: text, mark: "", after: "" };
  return { before: text.slice(0, i), mark: text.slice(i, i + term.length), after: text.slice(i + term.length) };
}
function onClick(event: MouseEvent, link: EditorLink) {
  if (!canOpen) return;
  event.preventDefault();
  emit("open", link);
}
const sections = () => [
  { key: "backlinks", heading: t.value.backlinks, links: props.backlinks, empty: t.value.noBacklinks, term: props.highlight },
  { key: "related", heading: t.value.related, links: props.related, empty: t.value.noRelated, term: undefined as string | undefined },
];
</script>

<template>
  <aside data-slot="editor-backlinks" :aria-label="t.panel" :class="cn('flex flex-col gap-5', props.class)">
    <section v-for="s in sections()" :key="s.key" :aria-labelledby="`nq-eb-${s.key}`" class="flex flex-col gap-2">
      <h3 :id="`nq-eb-${s.key}`" class="eyebrow flex items-center justify-between">
        {{ s.heading }}
        <span class="tabular-nums">{{ formatNumber(s.links.length, locale) }}</span>
      </h3>
      <p v-if="s.links.length === 0" class="text-body-sm text-muted-foreground">{{ s.empty }}</p>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="link in s.links" :key="link.id">
          <a
            :href="link.href ?? `#${link.id}`"
            class="flex flex-col gap-0.5 rounded-control p-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="onClick($event, link)"
          >
            <span dir="auto" class="flex items-center gap-1.5 text-label text-foreground">
              <NqIcon :icon="Link2" class="size-3.5 shrink-0 text-muted-foreground" />
              <span class="truncate">{{ link.title }}</span>
            </span>
            <span v-if="link.snippet" dir="auto" class="line-clamp-2 text-caption text-muted-foreground">
              {{ parts(link.snippet, s.term).before }}<mark v-if="parts(link.snippet, s.term).mark" class="rounded-[2px] bg-nq-selected px-0.5 text-foreground">{{ parts(link.snippet, s.term).mark }}</mark>{{ parts(link.snippet, s.term).after }}
            </span>
            <span v-if="link.path" dir="auto" class="truncate text-caption text-muted-foreground/80">{{ link.path }}</span>
          </a>
        </li>
      </ul>
    </section>
  </aside>
</template>
