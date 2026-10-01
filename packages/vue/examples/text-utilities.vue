<script setup lang="ts">
import { NqBookmarkButton, NqLinkify, NqProgressiveList, NqScrollFade, NqTranslatableText, NqUserText } from "@fadymondy/nasaq/vue";

const translate = () => new Promise<string>((resolve) => setTimeout(() => resolve("Hello, and welcome to the team."), 500));
const save = () => new Promise<void>((resolve) => setTimeout(resolve, 300));
</script>

<template>
  <div class="flex max-w-md flex-col gap-4">
    <NqLinkify text="Docs at https://nasaq-ui.fadymondy.com or write to hello@example.com." />
    <NqUserText block :lines="2" linkify>مرحبا Sara, see www.example.com for the details of the plan we discussed on Sunday.</NqUserText>
    <NqTranslatableText original="مرحبًا بك في الفريق" source-lang="ar" :on-translate="translate" />
    <NqScrollFade>
      <span v-for="n in 12" :key="n" class="shrink-0 rounded-control border px-3 py-1">Chip {{ n }}</span>
    </NqScrollFade>
    <NqBookmarkButton show-label :on-saved-change="save" />
    <NqProgressiveList :items="['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven']" />
  </div>
</template>
