<script setup lang="ts">
import { Briefcase } from "lucide-vue-next";
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqIcon } from "../icon";
import { totalExperience, tenureBetween } from "../personal-widgets";
import { NqTimeline, NqTimelineItem } from "../timeline";
import NqProfileSection from "./NqProfileSection.vue";
import { periodLabel, tenureLabel } from "./profile-logic";
import { fill, useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileJob } from "./types";

// Roles on a timeline, newest first: role and company, period and tenure, summary, highlights and skills. The total is counted once where roles overlap.
const props = defineProps<{
  experience: ProfileJob[];
  /** Fixed "today", for stories and tests. */
  now?: Date | number;
  labels?: Partial<ProfilePageLabels>;
}>();
const { t, locale } = useProfileStrings(() => props.labels);
const sorted = computed(() => [...props.experience].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()));
const total = computed(() => totalExperience(props.experience, props.now));
const hint = computed(() => `${t.value.experienceHint} ${fill(t.value.totalExperience, { time: tenureLabel(total.value, t.value, locale.value) })}`);
const tenureOf = (job: ProfileJob) => tenureLabel(tenureBetween(job.start, job.end ?? props.now), t.value, locale.value);
</script>

<template>
  <NqProfileSection :title="t.experience" :description="hint">
    <NqTimeline>
      <NqTimelineItem v-for="job in sorted" :key="job.id">
        <template #icon><NqIcon :icon="Briefcase" /></template>
        <template #title>
          <span dir="auto" class="flex flex-wrap items-center gap-x-2">
            <bdi>{{ job.role }}</bdi>
            <span class="font-normal text-muted-foreground">
              <a v-if="job.companyHref" :href="job.companyHref" target="_blank" rel="noopener noreferrer" class="underline decoration-nq-line-strong underline-offset-4 hover:decoration-current"><bdi>{{ job.company }}</bdi></a>
              <bdi v-else>{{ job.company }}</bdi>
            </span>
            <NqBadge v-if="!job.end" variant="success">{{ t.current }}</NqBadge>
          </span>
        </template>
        <template #description>
          <span class="flex flex-wrap gap-x-2">
            <span>{{ periodLabel(job.start, job.end, props.now, t, locale) }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ tenureOf(job) }}</span>
            <template v-if="job.location">
              <span aria-hidden="true">·</span>
              <bdi>{{ job.location }}</bdi>
            </template>
          </span>
        </template>
        <div v-if="job.summary || job.highlights?.length || job.skills?.length" class="mt-2 flex w-full basis-full flex-col gap-2 pb-6">
          <p v-if="job.summary" dir="auto" class="text-body-sm text-nq-fg-body">{{ job.summary }}</p>
          <ul v-if="job.highlights?.length" dir="auto" class="list-disc space-y-1 ps-5 text-body-sm text-nq-fg-body marker:text-muted-foreground">
            <li v-for="h in job.highlights" :key="h">{{ h }}</li>
          </ul>
          <ul v-if="job.skills?.length" class="flex flex-wrap gap-1.5">
            <li v-for="s in job.skills" :key="s"><NqBadge variant="outline"><bdi>{{ s }}</bdi></NqBadge></li>
          </ul>
        </div>
      </NqTimelineItem>
    </NqTimeline>
  </NqProfileSection>
</template>
