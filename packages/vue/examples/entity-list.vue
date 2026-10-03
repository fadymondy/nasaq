<script setup lang="ts">
import { NqCardMeta, NqEntityIdentity, NqEntityList, NqTagList, type DataTableColumn, type EntityFacet } from "@fadymondy/nasaq/vue";
import { ExternalLink, Trash2 } from "lucide-vue-next";
import { ref } from "vue";

interface Contact {
  id: string;
  name: string;
  company: string;
  plan: string;
  tags: string[];
}
const contacts = ref<Contact[]>([
  { id: "a", name: "Mona Ali", company: "Acme", plan: "Pro", tags: ["vip"] },
  { id: "b", name: "Omar Hassan", company: "Globex", plan: "Team", tags: ["new", "vip"] },
  { id: "c", name: "Layla Samir", company: "Initech", plan: "Free", tags: ["new"] },
]);
const columns: DataTableColumn<Contact>[] = [
  { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
  { id: "company", header: "Company", cell: (r) => r.company, sortValue: (r) => r.company, searchValue: (r) => r.company },
  { id: "plan", header: "Plan", cell: (r) => r.plan, sortValue: (r) => r.plan },
];
const facets: EntityFacet<Contact>[] = [
  {
    id: "tags",
    title: "Tags",
    options: [
      { value: "vip", label: "VIP" },
      { value: "new", label: "New" },
    ],
    getValues: (r) => r.tags,
  },
];
const rowActions = (r: Contact) => [
  { id: "open", label: "Open", icon: ExternalLink, onSelect: () => console.log("open", r.id) },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    danger: true,
    group: "danger",
    onSelect: () => (contacts.value = contacts.value.filter((c) => c.id !== r.id)),
  },
];
</script>

<template>
  <NqEntityList :data="contacts" :columns="columns" :facets="facets" :get-row-id="(r: Contact) => r.id" label="Contacts" default-view="cards" :row-actions="rowActions">
    <template #card="{ row }">
      <div class="flex flex-col gap-3">
        <NqEntityIdentity :avatar-name="row.name" class="pe-(--entity-card-controls)">
          {{ row.name }}
          <template #subtitle>{{ row.company }}</template>
        </NqEntityIdentity>
        <NqTagList :tags="row.tags.map((t: string) => ({ label: t }))" />
        <NqCardMeta label="Plan">{{ row.plan }}</NqCardMeta>
      </div>
    </template>
  </NqEntityList>
</template>
