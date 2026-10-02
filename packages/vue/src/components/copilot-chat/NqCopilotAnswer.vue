<script setup lang="ts">
import { Check, Copy, RefreshCw, Share2, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqArtifactList, type Artifact, type PickerArtifact } from "../artifact-renderer";
import { NqButton } from "../button";
import { NqChatMessage } from "../chat";
import { NqCodeBlockAI, type AiTarget } from "../code-block-variants";
import { NqMarkdown } from "../markdown";
import NqCopilotSources from "./NqCopilotSources.vue";
import NqCopilotSteps from "./NqCopilotSteps.vue";
import { copilotSegments, type CopilotMessage } from "./copilot-format";
import { copilotWriteClipboard, useCopilotFlash } from "./flash";
import { copilotWords, type CopilotChatLabels } from "./labels";

// The assistant side of one turn: tool steps, streamed Markdown, artifacts, sources, actions and follow-ups.
const props = defineProps<{
  message: CopilotMessage;
  last?: boolean;
  onRegenerate?: (id: string) => void;
  onFeedback?: (id: string, value: "up" | "down") => void;
  onFollowUp?: (text: string) => void;
  copyTargets?: readonly AiTarget[];
  onArtifactAction?: (actionId: string, artifact: Artifact) => void | Promise<void | { error?: string }>;
  onArtifactPick?: (values: string[], artifact: PickerArtifact) => void | Promise<void | { error?: string }>;
  allowHtml?: boolean;
  /** Adds a Share button where the Web Share API exists. */
  share?: boolean;
  labels?: Partial<CopilotChatLabels>;
}>();
const nq = useNasaq();
const t = computed(() => copilotWords(nq.locale.value, props.labels));
const { on: copied, flash } = useCopilotFlash();
// navigator only exists in the browser; check after mount so server and client markup match.
const canShare = ref(false);
onMounted(() => {
  canShare.value = !!props.share && typeof navigator !== "undefined" && typeof navigator.share === "function";
});
const busy = computed(() => !!props.message.streaming);
const segments = computed(() => copilotSegments(props.message.text));
const m = computed(() => props.message);

async function copy() {
  if (await copilotWriteClipboard(m.value.text)) flash();
}
function shareIt() {
  navigator.share({ text: m.value.text }).catch(() => {});
}
</script>

<template>
  <NqChatMessage
    side="assistant"
    class="w-full min-w-0 [&>div:last-child]:flex-1 [&_[data-slot=chat-bubble]]:w-full"
    :name="t.assistant"
    :time="m.at"
    :streaming="busy && m.text === '' && !m.steps?.length"
  >
    <template #avatar>
      <span aria-hidden="true" class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles class="size-4" /></span>
    </template>
    <div class="flex min-w-0 flex-col gap-3">
      <NqCopilotSteps v-if="m.steps?.length" :steps="m.steps" :streaming="busy" :labels="props.labels" />
      <template v-if="m.text">
        <template v-for="(s, i) in segments" :key="i">
          <NqCodeBlockAI v-if="s.kind === 'code'" :code="s.code" :language="s.language" :targets="props.copyTargets" />
          <NqMarkdown v-else class="text-body" :source="s.text" />
        </template>
      </template>
      <span v-if="busy && m.text" aria-hidden="true" class="inline-block h-4 w-1.5 rounded-sm bg-nq-accent motion-safe:animate-pulse" />
      <NqArtifactList v-if="m.artifacts?.length" :artifacts="m.artifacts" :on-action="props.onArtifactAction" :on-pick="props.onArtifactPick" :allow-html="props.allowHtml" />
      <div v-if="m.error !== undefined" role="alert" data-slot="copilot-stream-error" class="flex flex-wrap items-center gap-2 rounded-control border border-nq-danger bg-nq-danger-soft px-3 py-2 text-caption text-nq-danger-text">
        <TriangleAlert aria-hidden="true" class="size-3.5 shrink-0" />
        <span class="min-w-0 flex-1">{{ m.error || t.streamError }}</span>
        <NqButton v-if="props.last && props.onRegenerate" variant="secondary" size="sm" @click="props.onRegenerate(m.id)">
          <RefreshCw aria-hidden="true" />
          {{ t.retry }}
        </NqButton>
      </div>
      <NqCopilotSources v-if="!busy && m.sources?.length" :sources="m.sources" :labels="props.labels" />
      <div v-if="!busy && m.text" class="flex items-center gap-0.5 text-muted-foreground" data-slot="copilot-actions">
        <NqButton variant="ghost" size="icon-sm" :aria-label="copied ? t.copied : t.copy" :title="copied ? t.copied : t.copy" @click="copy">
          <Check v-if="copied" aria-hidden="true" class="size-3.5" />
          <Copy v-else aria-hidden="true" class="size-3.5" />
        </NqButton>
        <NqButton v-if="canShare" variant="ghost" size="icon-sm" :aria-label="t.share" :title="t.share" @click="shareIt">
          <Share2 aria-hidden="true" class="size-3.5" />
        </NqButton>
        <template v-if="props.onFeedback">
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.good" :aria-pressed="m.feedback === 'up'" :title="t.good" @click="props.onFeedback(m.id, 'up')">
            <ThumbsUp aria-hidden="true" :class="cn('size-3.5', m.feedback === 'up' && 'text-nq-accent')" />
          </NqButton>
          <NqButton variant="ghost" size="icon-sm" :aria-label="t.bad" :aria-pressed="m.feedback === 'down'" :title="t.bad" @click="props.onFeedback(m.id, 'down')">
            <ThumbsDown aria-hidden="true" :class="cn('size-3.5', m.feedback === 'down' && 'text-nq-danger-text')" />
          </NqButton>
        </template>
        <NqButton v-if="props.last && props.onRegenerate && m.error === undefined" variant="ghost" size="icon-sm" :aria-label="t.regenerate" :title="t.regenerate" @click="props.onRegenerate(m.id)">
          <RefreshCw aria-hidden="true" class="size-3.5" />
        </NqButton>
      </div>
      <div v-if="!busy && props.last && m.followUps?.length && props.onFollowUp" role="group" :aria-label="t.followUps" class="flex flex-wrap gap-2">
        <button
          v-for="f in m.followUps"
          :key="f"
          type="button"
          dir="auto"
          class="rounded-full border border-border bg-card px-3 py-1 text-start text-caption text-foreground outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="props.onFollowUp(f)"
        >
          {{ f }}
        </button>
      </div>
    </div>
  </NqChatMessage>
</template>
