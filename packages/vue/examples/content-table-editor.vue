<script setup lang="ts">
import { NqContentTableEditor, type ContentTableValue } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const value = ref<ContentTableValue>({
  columns: [
    { id: "name", label: "Name", type: "text", required: true },
    { id: "price", label: "Price", type: "number" },
    { id: "status", label: "Status", type: "select", options: [{ value: "live", label: "Live", hue: "green" }, { value: "draft", label: "Draft", hue: "amber" }] },
    { id: "active", label: "Active", type: "checkbox", width: 120 },
  ],
  rows: [
    { id: "r1", cells: { name: "Coffee", price: 12, status: "live", active: true } },
    { id: "r2", cells: { name: "Tea", price: 8, status: "draft", active: false } },
  ],
});
async function save(next: ContentTableValue) {
  await new Promise((done) => setTimeout(done, 400));
  console.log("saved", next.rows.length);
}
</script>

<template>
  <NqContentTableEditor v-model="value" :on-save="save" class="w-[44rem]" />
</template>
