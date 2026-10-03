<script setup lang="ts">
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCodeBlock } from "../code-block";
import { NqMarkdown } from "../markdown";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import NqArtifactActions from "./NqArtifactActions.vue";
import NqArtifactCell from "./NqArtifactCell.vue";
import NqArtifactChart from "./NqArtifactChart.vue";
import NqArtifactFrame from "./NqArtifactFrame.vue";
import NqArtifactPicker from "./NqArtifactPicker.vue";
import NqArtifactToneDot from "./NqArtifactToneDot.vue";
import { frameDocument, frameHeight, type Artifact, type ArtifactTone, type PickerArtifact } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// Renders one already-validated artifact. Use `NqArtifactRenderer` when the data comes from an agent.
const props = withDefaults(
  defineProps<{
    artifact: Artifact;
    /** Render `html` artifacts in a sandboxed frame. Off by default: the HTML is shown as code. */
    allowHtml?: boolean;
    /** A button in a card or action row was pressed. Return `{ error }` or reject to show a failure. */
    onAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
    /** A picker was submitted with the chosen values. */
    onPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
    labels?: Partial<ArtifactRendererLabels>;
  }>(),
  { allowHtml: false, onAction: undefined, onPick: undefined, labels: undefined },
);
const { t, tx } = useArtifactI18n(() => props.labels);
const TONE_BADGE: Record<ArtifactTone, "neutral" | "success" | "warning" | "danger" | "info"> = { neutral: "neutral", success: "success", warning: "warning", danger: "danger", info: "info" };
</script>

<template>
  <template v-if="props.artifact.kind === 'card'">
    <NqArtifactFrame :artifact="props.artifact" :note="tx(props.artifact.footer) || undefined" :has-footer="!!props.artifact.actions?.length">
      <div v-if="props.artifact.badges?.length" class="flex flex-wrap gap-1.5">
        <NqBadge v-for="(b, i) in props.artifact.badges" :key="i" :variant="TONE_BADGE[b.tone ?? 'neutral']">{{ tx(b.label) }}</NqBadge>
      </div>
      <dl v-if="props.artifact.fields?.length" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body-sm">
        <div v-for="(f, i) in props.artifact.fields" :key="i" class="contents">
          <dt dir="auto" class="text-muted-foreground">{{ tx(f.label) }}</dt>
          <dd dir="auto" class="min-w-0 break-words text-foreground"><NqArtifactCell :value="f.value" :labels="props.labels" /></dd>
        </div>
      </dl>
      <ul v-if="props.artifact.items?.length" data-slot="artifact-items" class="flex flex-col divide-y divide-border rounded-control border border-border">
        <li v-for="(it, i) in props.artifact.items" :key="i" class="flex items-start gap-3 px-3 py-2">
          <span class="flex min-w-0 flex-1 flex-col">
            <span dir="auto" class="flex items-center gap-2 text-body-sm text-foreground">
              <NqArtifactToneDot v-if="it.tone" :tone="it.tone" :labels="props.labels" />
              {{ tx(it.label) }}
            </span>
            <span v-if="it.description" dir="auto" class="text-caption text-muted-foreground">{{ tx(it.description) }}</span>
          </span>
          <span v-if="it.value !== undefined" dir="auto" class="shrink-0 text-body-sm text-foreground tabular-nums"><NqArtifactCell :value="it.value" :labels="props.labels" /></span>
        </li>
      </ul>
      <NqMarkdown v-if="props.artifact.body" :source="tx(props.artifact.body)" />
      <template v-if="props.artifact.actions?.length" #footer>
        <NqArtifactActions :actions="props.artifact.actions" :artifact="props.artifact" :on-action="props.onAction" :labels="props.labels" />
      </template>
    </NqArtifactFrame>
  </template>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'table'" :artifact="props.artifact">
    <NqTable :label="tx(props.artifact.title) || undefined">
      <NqTableHeader>
        <NqTableRow>
          <NqTableHead v-for="c in props.artifact.columns" :key="c.key" dir="auto" :class="cn('text-start', c.align === 'end' && 'text-end')">{{ tx(c.label) }}</NqTableHead>
        </NqTableRow>
      </NqTableHeader>
      <NqTableBody>
        <NqTableRow v-for="(r, i) in props.artifact.rows" :key="i">
          <NqTableCell v-for="c in props.artifact.columns" :key="c.key" dir="auto" :class="cn('text-start', (c.align === 'end' || typeof r[c.key] === 'number') && 'text-end tabular-nums')">
            <NqArtifactCell :value="r[c.key] ?? null" :labels="props.labels" />
          </NqTableCell>
        </NqTableRow>
      </NqTableBody>
    </NqTable>
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'chart'" :artifact="props.artifact">
    <NqArtifactChart :artifact="props.artifact" :labels="props.labels" />
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'markdown'" :artifact="props.artifact">
    <NqMarkdown :source="props.artifact.text" />
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'code'" :artifact="props.artifact">
    <NqCodeBlock :code="props.artifact.code" :language="props.artifact.language ?? 'text'" :filename="props.artifact.filename" :label="tx(props.artifact.title) || t.source" pre-class-name="max-h-80" />
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'actions'" :artifact="props.artifact">
    <NqArtifactActions :actions="props.artifact.actions" :artifact="props.artifact" :on-action="props.onAction" :labels="props.labels" />
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'picker'" :artifact="props.artifact">
    <NqArtifactPicker :artifact="props.artifact" :on-pick="props.onPick" :labels="props.labels" />
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'stats'" :artifact="props.artifact">
    <NqStatGrid>
      <NqStatCard
        v-for="(s, i) in props.artifact.items"
        :key="i"
        :data-tone="s.tone"
        :value="typeof s.value === 'number' ? s.value : undefined"
        :delta="s.delta"
        :invert="s.invert"
        :sparkline="s.sparkline"
      >
        <template #label>
          <span v-if="s.tone" class="inline-flex items-center gap-1.5"><NqArtifactToneDot :tone="s.tone" :labels="props.labels" />{{ tx(s.label) }}</span>
          <template v-else>{{ tx(s.label) }}</template>
        </template>
        <template v-if="typeof s.value !== 'number'" #value>{{ s.value }}</template>
      </NqStatCard>
    </NqStatGrid>
  </NqArtifactFrame>

  <NqArtifactFrame v-else-if="props.artifact.kind === 'html'" :artifact="props.artifact">
    <!-- Empty sandbox: no scripts, no same-origin, no forms, no top navigation, no popups. The document also carries a CSP. -->
    <iframe
      v-if="props.allowHtml"
      :title="tx(props.artifact.title) || t.htmlFrame"
      sandbox=""
      referrerpolicy="no-referrer"
      loading="lazy"
      :srcdoc="frameDocument(props.artifact.html)"
      :style="{ height: `${frameHeight(props.artifact.height)}px` }"
      class="w-full rounded-control border border-border bg-background"
    />
    <template v-else>
      <p class="text-caption text-muted-foreground">{{ t.htmlAsCode }}</p>
      <NqCodeBlock :code="props.artifact.html" language="html" :label="t.source" pre-class-name="max-h-60" />
    </template>
  </NqArtifactFrame>
</template>
