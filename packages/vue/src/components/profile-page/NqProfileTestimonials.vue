<script setup lang="ts">
import { Quote } from "lucide-vue-next";
import { NqAvatar } from "../avatar";
import { NqCard } from "../card";
import { NqIcon } from "../icon";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileTestimonial } from "./types";

const props = defineProps<{ testimonials: ProfileTestimonial[]; labels?: Partial<ProfilePageLabels> }>();
const { t } = useProfileStrings(() => props.labels);
</script>

<template>
  <NqProfileSection :title="t.testimonials" :description="t.testimonialsHint" :count="props.testimonials.length">
    <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
      <li v-for="q in props.testimonials" :key="q.name" class="flex">
        <NqCard class="w-full gap-3 p-4">
          <NqIcon :icon="Quote" class="size-5 text-nq-accent-text" />
          <blockquote dir="auto" class="text-pretty text-body text-foreground">{{ q.quote }}</blockquote>
          <footer class="mt-auto flex items-center gap-2.5">
            <NqAvatar :name="q.name" :src="q.avatar" />
            <div class="flex flex-col leading-tight">
              <bdi class="text-label text-foreground">{{ q.name }}</bdi>
              <span v-if="q.role" class="text-caption text-muted-foreground">{{ q.role }}</span>
            </div>
          </footer>
        </NqCard>
      </li>
    </ul>
  </NqProfileSection>
</template>
