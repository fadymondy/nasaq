<script setup lang="ts">
import { NqPlacementSettings, type PlacementValue } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const saved = ref<PlacementValue>({ mode: "sidebar", order: 3, defaultPage: false });

function save(changes: Partial<PlacementValue>) {
  saved.value = { ...saved.value, ...changes };
}
</script>

<template>
  <NqPlacementSettings :value="saved" allow-overlays allow-default-page :on-save="save" />
</template>
