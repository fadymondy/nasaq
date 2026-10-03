<script setup lang="ts">
import { NqAiInsightCard, NqAskAiSelection, type AskAiRequest } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const feedback = ref<"up" | "down" | null>(null);
const dismissed = ref(false);

async function onAsk({ prompt, selection }: AskAiRequest) {
  await new Promise((r) => setTimeout(r, 600));
  return `**${prompt}**\n\n"${selection}" means the returns window starts on the day your order is delivered.`;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqAskAiSelection :on-ask="onAsk">
      <article class="max-w-prose text-body">
        <p>Refunds are issued to the original payment method within 5 working days. The returns window starts on the day your order is delivered.</p>
      </article>
    </NqAskAiSelection>
    <NqAiInsightCard
      v-if="!dismissed"
      title="Signups fell 18% on mobile"
      tone="warning"
      :metric="{ label: 'Mobile signups', value: 1240, delta: -0.18 }"
      body="The drop starts on the day the new form shipped. [Details](#)"
      :confidence="0.78"
      :actions="[{ id: 'open', label: 'Open the funnel' }]"
      :feedback="feedback"
      :on-feedback="(v) => (feedback = v)"
      :on-dismiss="() => (dismissed = true)"
      :on-ask="() => undefined"
    />
  </div>
</template>
