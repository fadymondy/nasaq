<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { TocItem } from "../blog-index/blog-model";
import { prefersReducedMotion, useBlogPostStrings } from "./labels";

// "On this page": a rail of heading links, the current one highlighted. Level-3 headings are indented. Clicking scrolls smoothly
// (not with reduced motion) and updates the URL hash.
interface Props {
  items: TocItem[];
  /** The heading in view. Highlighted with aria-current="location". */
  activeId?: string | null;
  /** Heading above the list. Default "On this page". */
  title?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
/** Fired after the page scrolled to a heading. */
const emit = defineEmits<{ select: [id: string] }>();
const { t } = useBlogPostStrings();

const go = (id: string, e: MouseEvent) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  try {
    history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  } catch {
    /* Sandboxed frames may forbid it. */
  }
  emit("select", id);
};
</script>

<template>
  <nav v-if="props.items.length" data-slot="table-of-contents" :aria-label="props.title ?? t.onThisPage" :class="cn('flex flex-col gap-2', props.class)">
    <p class="eyebrow">{{ props.title ?? t.onThisPage }}</p>
    <ol class="flex flex-col border-s border-border">
      <li v-for="item in props.items" :key="item.id">
        <a
          :href="`#${item.id}`"
          :aria-current="item.id === props.activeId ? 'location' : undefined"
          dir="auto"
          :class="
            cn(
              '-ms-px block border-s-2 py-1 text-body-sm outline-none transition-colors duration-150 ease-nq',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-nq-focus',
              item.level >= 3 ? 'ps-6' : 'ps-3',
              item.id === props.activeId ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          "
          @click="go(item.id, $event)"
        >
          {{ item.text }}
        </a>
      </li>
    </ol>
  </nav>
</template>
