<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { NqVoiceCallOverlay, type VoiceCallState, type VoiceCaption } from "@fadymondy/nasaq/vue";

// A demo call: the level is driven by a timer. In your app it comes from an AnalyserNode and your voice backend.
const state = ref<VoiceCallState>("listening");
const muted = ref(false);
const level = ref(0.3);
const elapsed = ref(0);
const captions: VoiceCaption[] = [
  { id: "1", role: "user", text: "Where is my order?" },
  { id: "2", role: "agent", text: "It is out for delivery and should reach you in about ten minutes." },
];
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  timer = setInterval(() => {
    elapsed.value += 1;
    level.value = 0.2 + Math.abs(Math.sin(elapsed.value / 2)) * 0.6;
  }, 1000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="relative h-[32rem] w-full overflow-hidden rounded-lg border">
    <NqVoiceCallOverlay
      contained
      :state="state"
      :agent="{ name: 'Nasaq assistant', subtitle: 'Support', avatar: '🤖' }"
      :level="level"
      :elapsed="elapsed"
      :captions="captions"
      v-model:muted="muted"
      :on-end="() => (state = 'connecting')"
      :on-interrupt="() => (state = 'listening')"
    />
  </div>
</template>
