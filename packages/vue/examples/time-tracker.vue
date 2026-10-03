<script setup lang="ts">
import { NqTimeEntryList, NqTimesheet, NqTimeTracker, type TimeEntry, type TimeProject } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const projects: TimeProject[] = [
  { id: "web", name: "Website", tasks: [{ id: "ui", name: "UI polish" }, { id: "seo", name: "SEO fixes" }] },
  { id: "app", name: "Mobile app", tasks: [{ id: "auth", name: "Sign-in flow" }] },
];
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const entries = ref<TimeEntry[]>([
  { id: "1", date: day(0), seconds: 5400, projectId: "web", taskId: "ui", note: "Header spacing" },
  { id: "2", date: day(0), seconds: 2700, projectId: "app", taskId: "auth" },
  { id: "3", date: day(-1), seconds: 10800, projectId: "web", taskId: "seo", note: "Sitemap and meta" },
]);
let next = 10;
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqTimeTracker
      :projects="projects"
      :on-stop="async (s) => void entries.unshift({ id: String(next++), date: day(0), seconds: Math.max(60, s.seconds), projectId: s.projectId, taskId: s.taskId, note: s.note })"
    />
    <NqTimeEntryList
      :entries="entries"
      :projects="projects"
      :on-add="async (input) => void entries.unshift({ id: String(next++), ...input })"
      :on-edit="async (entry, input) => void (entries = entries.map((e) => (e.id === entry.id ? { ...e, ...input } : e)))"
      :on-delete="async (entry) => void (entries = entries.filter((e) => e.id !== entry.id))"
    />
    <NqTimesheet :entries="entries" :projects="projects" />
  </div>
</template>
