<script setup lang="ts">
import { NqDeckPlayer, NqPresentationEditor, type Deck } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const deck: Deck = { title: "Q3 review", slides: [{ id: "s1", layout: "title", title: "Q3 review", subtitle: "Product team" }] };
const open = ref(false);

async function save(next: Deck) {
  // await api.save(next);
  void next;
}
</script>

<template>
  <NqPresentationEditor :default-value="deck" :on-save="save" />
  <NqDeckPlayer :deck="deck" :open="open" default-show-notes @update:open="(v: boolean) => (open = v)" />
</template>
