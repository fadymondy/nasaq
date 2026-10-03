<script setup lang="ts">
import { NqButton, NqCycleDots, NqTimerReadout, NqTimerRing, useCountdownTimer } from "@fadymondy/nasaq/vue";

const timer = useCountdownTimer({ durationMs: 25 * 60_000 });
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <NqTimerRing :fraction="1 - timer.elapsed.value" :paused="timer.status.value === 'paused'">
      <NqTimerReadout :seconds="timer.seconds.value" label="Focus" />
    </NqTimerRing>
    <NqCycleDots :total="4" :done="1" :active="timer.status.value === 'running'" />
    <div class="flex gap-2">
      <NqButton v-if="timer.status.value === 'idle' || timer.status.value === 'done'" @click="timer.start()">Start</NqButton>
      <NqButton v-else-if="timer.status.value === 'running'" variant="secondary" @click="timer.pause()">Pause</NqButton>
      <NqButton v-else @click="timer.resume()">Resume</NqButton>
      <NqButton variant="ghost" @click="timer.reset()">Reset</NqButton>
    </div>
  </div>
</template>
