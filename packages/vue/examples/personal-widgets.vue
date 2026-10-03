<script setup lang="ts">
import { NqAvailabilityBadge, NqLocalClock, NqNowWidget, NqSkillsWidget, NqSocialLinks, NqStatsWidget, NqWeatherWidget } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="grid max-w-3xl gap-4 sm:grid-cols-2">
    <NqAvailabilityBadge status="open" note="from November" />
    <NqLocalClock time-zone="Asia/Riyadh" city="Riyadh" :working-hours="{ start: 9, end: 17, days: [0, 1, 2, 3, 4] }" />
    <NqStatsWidget :stats="[{ label: 'Projects', value: 42 }, { label: 'Stars', value: 12400, compact: true }]" />
    <NqWeatherWidget city="Riyadh" :temperature="38" condition="clear" :high="41" :low="27" />
    <NqNowWidget :items="[{ label: 'Building', text: 'A design system' }, { label: 'Reading', text: 'Refactoring UI', href: 'https://example.com' }]" updated="2026-09-20" />
    <NqSkillsWidget :skills="[{ name: 'TypeScript', group: 'Languages', level: 5 }, { name: 'Go', group: 'Languages', level: 3 }, { name: 'Figma', level: 4 }]" />
    <NqSocialLinks :links="[{ kind: 'github', label: 'GitHub', href: 'https://github.com/fadymondy', handle: '@fadymondy' }, { kind: 'email', label: 'Email', href: 'mailto:hi@example.com' }]" />
  </div>
</template>
