<script setup lang="ts">
import { NqKeywordPlanner, type PlannerKeyword } from "@fadymondy/nasaq/vue";

const keywords: PlannerKeyword[] = [
  { id: "k1", keyword: "arabic design system", volume: 2400, difficulty: 38, ownerUrl: "/design-system" },
  { id: "k2", keyword: "rtl react components", volume: 1300, difficulty: 29, rankingUrls: [{ url: "/components", position: 6 }, { url: "/blog/rtl", position: 11 }] },
  { id: "k3", keyword: "buy ui kit", volume: 800, difficulty: 52 },
];

async function assignOwner(_id: string, _url: string) {}
</script>

<template>
  <NqKeywordPlanner :keywords="keywords" :on-assign-owner="assignOwner" />
</template>
