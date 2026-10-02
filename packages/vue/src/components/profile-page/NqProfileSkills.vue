<script setup lang="ts">
import { NqSkillsWidget, type Skill } from "../personal-widgets";
import NqProfileSection from "./NqProfileSection.vue";
import { useProfileStrings, type ProfilePageLabels } from "./strings";

const props = defineProps<{ skills: Skill[]; labels?: Partial<ProfilePageLabels> }>();
const { t } = useProfileStrings(() => props.labels);
</script>

<template>
  <NqProfileSection :title="t.skills" :description="t.skillsHint">
    <NqSkillsWidget :skills="props.skills" />
  </NqProfileSection>
</template>
