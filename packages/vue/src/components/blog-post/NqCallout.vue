<script setup lang="ts">
import { Info, Lightbulb, OctagonAlert, Star, TriangleAlert } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { CalloutKind } from "../blog-index/blog-model";
import { NqIcon } from "../icon";
import { useBlogPostStrings } from "./labels";

// A highlighted aside inside an article. In Markdown write `> [!WARNING]` on the first line of a blockquote.
interface Props {
  kind?: CalloutKind;
  /** Heading of the callout. Default the kind's name ("Warning" / "تنبيه"). */
  title?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { kind: "note" });
const { t } = useBlogPostStrings();

const STYLE: Record<CalloutKind, { icon: Component; box: string; icon_: string }> = {
  note: { icon: Info, box: "border-nq-info/40 bg-nq-info-soft", icon_: "text-nq-info-text" },
  tip: { icon: Lightbulb, box: "border-nq-success/40 bg-nq-success-soft", icon_: "text-nq-success-text" },
  important: { icon: Star, box: "border-nq-accent/40 bg-nq-accent/10", icon_: "text-nq-accent-text" },
  warning: { icon: TriangleAlert, box: "border-nq-warning/40 bg-nq-warning-soft", icon_: "text-nq-warning-text" },
  caution: { icon: OctagonAlert, box: "border-nq-danger/40 bg-nq-danger-soft", icon_: "text-nq-danger-text" },
};
const style = computed(() => STYLE[props.kind]);
</script>

<template>
  <aside data-slot="callout" :data-kind="props.kind" :class="cn('flex gap-3 rounded-card border p-4 text-start', style.box, props.class)">
    <NqIcon :icon="style.icon" :class="cn('mt-0.5 size-4 shrink-0', style.icon_)" />
    <div class="flex min-w-0 flex-col gap-1">
      <p class="text-label text-foreground">{{ props.title ?? t.callout[props.kind] }}</p>
      <div dir="auto" class="flex flex-col gap-2 text-body-sm text-nq-fg-body [&_p]:m-0">
        <slot />
      </div>
    </div>
  </aside>
</template>
