<script setup lang="ts">
import { ArrowRight, ExternalLink } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqBadge } from "../badge";
import { hueFor, NqPostCover } from "../blog-index";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqFeatureStory } from "../feature-story";
import { NqIcon } from "../icon";
import { distinct } from "../personal-widgets";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";
import type { ProfileProject } from "./types";

// The featured project as a feature story, then a grid of the rest filtered by category tabs.
const props = defineProps<{ projects: ProfileProject[]; labels?: Partial<ProfilePageLabels> }>();
const { t } = useProfileStrings(() => props.labels);
const ALL = "__all";
const featured = computed(() => props.projects.find((p) => p.featured));
const rest = computed(() => props.projects.filter((p) => p !== featured.value));
const categories = computed(() => distinct(rest.value, (p) => p.category));
const category = ref(ALL);
const shown = (c: string) => (c === ALL ? rest.value : rest.value.filter((p) => p.category === c));
</script>

<template>
  <NqProfileSection :title="t.projects" :description="t.projectsHint" :count="props.projects.length">
    <NqFeatureStory
      v-if="featured"
      title-as="h3"
      :eyebrow="t.featuredProject"
      :title="featured.title"
      :description="featured.description"
      :points="featured.points"
      class="rounded-card border border-border bg-card p-4 @3xl:p-6"
    >
      <template #media><NqPostCover :post="{ ...featured }" ratio="aspect-[4/3]" /></template>
      <template v-if="featured.href" #action>
        <NqButton as="a" :href="featured.href" target="_blank" rel="noopener noreferrer" variant="secondary">{{ t.viewProject }}<NqIcon :icon="ArrowRight" /></NqButton>
      </template>
    </NqFeatureStory>
    <NqTabs v-model="category">
      <NqTabsList v-if="categories.length > 1" variant="underline" :aria-label="t.projectsNav">
        <NqTabsTab :value="ALL">{{ t.allProjects }}</NqTabsTab>
        <NqTabsTab v-for="c in categories" :key="c" :value="c">{{ c }}</NqTabsTab>
        <NqTabsIndicator />
      </NqTabsList>
      <NqTabsPanel v-for="c in [ALL, ...categories]" :key="c" :value="c">
        <ul class="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
          <li v-for="p in c === category ? shown(c) : []" :key="p.slug" class="flex">
            <div class="min-w-0 flex-1">
              <NqCard data-slot="project-card" class="group/project relative h-full gap-0 overflow-hidden py-0 transition-colors duration-150 ease-nq hover:bg-nq-hover">
                <NqPostCover :post="p" class="rounded-none border-0 border-b border-border" ratio="aspect-[16/10]" />
                <div class="flex flex-1 flex-col items-start gap-2 p-4">
                  <NqBadge v-if="p.category" variant="tag" :hue="hueFor(p.category)">{{ p.category }}</NqBadge>
                  <h3 dir="auto" class="text-h3 text-foreground">
                    <a v-if="p.href" :href="p.href" target="_blank" rel="noopener noreferrer" class="rounded-[2px] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-nq-focus">{{ p.title }}</a>
                    <template v-else>{{ p.title }}</template>
                  </h3>
                  <p dir="auto" class="line-clamp-3 text-body-sm text-muted-foreground">{{ p.description }}</p>
                  <ul v-if="p.tags?.length" class="flex flex-wrap gap-1.5">
                    <li v-for="tag in p.tags" :key="tag"><NqBadge variant="outline"><bdi>{{ tag }}</bdi></NqBadge></li>
                  </ul>
                  <a v-if="p.repoHref" :href="p.repoHref" target="_blank" rel="noopener noreferrer" class="relative z-10 mt-auto inline-flex items-center gap-1 pt-1 text-body-sm text-muted-foreground underline decoration-nq-line-strong underline-offset-4 hover:text-foreground">
                    {{ t.viewCode }}
                    <NqIcon :icon="ExternalLink" class="size-3.5" />
                  </a>
                </div>
              </NqCard>
            </div>
          </li>
        </ul>
      </NqTabsPanel>
    </NqTabs>
  </NqProfileSection>
</template>
