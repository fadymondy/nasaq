<script setup lang="ts">
import { TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import NqArtifactView from "./NqArtifactView.vue";
import { parseArtifact, type Artifact, type ArtifactParse, type PickerArtifact } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// Generative UI: turns an agent's JSON into a card, table, chart, markdown, code block, action row, picker, stat row or (opt in)
// sandboxed HTML. The input is validated, sized down and rendered with Nasaq components, so a bad or hostile payload shows an error
// card and never markup. Button presses and picks come back as callbacks.
const props = withDefaults(
  defineProps<{
    /** Anything an agent produced: an object to validate, or an already parsed result from `parseArtifact`. */
    artifact: unknown;
    /** Render `html` artifacts in a sandboxed frame. Off by default: the HTML is shown as code. */
    allowHtml?: boolean;
    /** A button in a card or action row was pressed. Return `{ error }` or reject to show a failure. */
    onAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
    /** A picker was submitted with the chosen values. */
    onPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
    labels?: Partial<ArtifactRendererLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { allowHtml: false, onAction: undefined, onPick: undefined, labels: undefined },
);
const { t } = useArtifactI18n(() => props.labels);

function isParse(v: unknown): v is ArtifactParse {
  return typeof v === "object" && v !== null && "ok" in v && typeof (v as { ok: unknown }).ok === "boolean" && ((v as { ok: boolean }).ok ? "artifact" in v : "error" in v);
}
const parsed = computed<ArtifactParse>(() => (isParse(props.artifact) ? props.artifact : parseArtifact(props.artifact)));
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="$attrs" data-slot="artifact-renderer" :data-kind="parsed.ok ? parsed.artifact.kind : 'invalid'" :class="cn('min-w-0', props.class)">
    <NqArtifactView v-if="parsed.ok" :artifact="parsed.artifact" :allow-html="props.allowHtml" :on-action="props.onAction" :on-pick="props.onPick" :labels="props.labels" />
    <NqAlert v-else tone="warning" :icon="TriangleAlert" :title="parsed.kind ? t.unsupported : t.invalid">
      <span dir="ltr" class="text-caption">{{ parsed.error }}</span>
    </NqAlert>
  </div>
</template>
