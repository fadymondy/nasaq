<script setup lang="ts">
import { ref } from "vue";
import { NqDoNotDisturbToggle, NqFocusAvatar, NqFocusStatusChip, focusStateOf } from "@fadymondy/nasaq/vue";

const name = "Fady Mondy";
const dnd = ref(true);
// In an app this is the pomodoro controller; any { phase, status } works.
const state = focusStateOf({ phase: "focus", status: "running" });
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <NqFocusStatusChip :state="state" :seconds="754" />
      <NqFocusAvatar :name="name" :state="state" />
    </div>
    <NqDoNotDisturbToggle v-model="dnd" until="6:00 PM" class="max-w-md" />
  </div>
</template>
