<script setup lang="ts">
import {
  NqAchievementCard,
  NqAchievementUnlockToast,
  NqBadgeGrid,
  NqLeaderboard,
  NqRewardCard,
  NqStreakCard,
  NqXpProgress,
  type Achievement,
} from "@fadymondy/nasaq/vue";
import { Rocket, Zap } from "lucide-vue-next";
import { ref } from "vue";

const achievements: Achievement[] = [
  { id: "first", title: "First order", description: "Place your first order.", icon: Rocket, rarity: "common", earnedAt: "2026-09-12", xp: 50 },
  { id: "streak", title: "Seven in a row", description: "Order seven days running.", icon: Zap, rarity: "rare", progress: 4, goal: 7, xp: 200 },
  { id: "vip", title: "Big spender", description: "Spend 1,000 USD.", rarity: "epic", progress: 0, goal: 1000 },
  { id: "hidden", title: "Easter egg", description: "You found it.", rarity: "legendary", secret: true },
];
const entries = [
  { id: "a", name: "Sara Ali", score: 2400, previousRank: 2 },
  { id: "b", name: "Omar Nasser", score: 2250, previousRank: 1 },
  { id: "c", name: "Lina Haddad", score: 1900, previousRank: 3 },
  { id: "d", name: "You Yourself", score: 1200 },
];
const periods = [
  { id: "week", label: "This week" },
  { id: "all", label: "All time" },
];
const today = new Date(2026, 8, 20);
const activeDays = ["2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20", "2026-09-05"];
const open = ref(true);
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqXpProgress :total-xp="260" />
    <NqBadgeGrid :achievements="achievements" />
    <NqAchievementCard :achievement="achievements[1]!" />
    <NqStreakCard :active-days="activeDays" :today="today" class="max-w-sm" />
    <NqLeaderboard :entries="entries" you-id="d" :periods="periods" unit="XP" :limit="3" />
    <NqRewardCard title="Free delivery" description="One order, on us." rarity="rare" :cost="500" :balance="320" :on-claim="async () => {}" class="max-w-xs" />
    <NqAchievementUnlockToast :achievement="achievements[0]!" :open="open" :floating="false" :duration="0" @close="open = false" />
  </div>
</template>
