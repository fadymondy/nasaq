<script setup lang="ts">
import {
  NqCollectionsManager,
  NqProductAdminList,
  NqProductEditor,
  NqTabs,
  NqTabsList,
  NqTabsPanel,
  NqTabsTab,
  bulkEditProducts,
  productToDraft,
  type CollectionDef,
  type ProductAdminProduct,
  type ProductBulkEdit,
} from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const colour = { id: "colour", name: "Colour", values: [{ id: "red", label: "Red" }, { id: "blue", label: "Blue" }] };
const products = ref<ProductAdminProduct[]>([
  {
    id: "p1",
    name: "Linen shirt",
    brand: "Nile Basics",
    category: "Clothing",
    tags: ["summer", "new"],
    status: "active",
    images: [{ src: "/shirt.jpg", alt: "Linen shirt" }],
    options: [colour],
    variants: [
      { id: "v1", options: { colour: "red" }, price: 4900, stock: 12, sku: "SHIRT-RED" },
      { id: "v2", options: { colour: "blue" }, price: 4900, compareAt: 6900, stock: 2, sku: "SHIRT-BLUE" },
    ],
  },
  { id: "p2", name: "Canvas tote", brand: "Souk Goods", category: "Home", status: "draft", images: [], options: [], variants: [{ id: "v3", options: {}, price: 1900, stock: 0 }] },
]);
const collections = ref<CollectionDef[]>([
  { id: "c1", title: "Summer", kind: "manual", productIds: ["p1"] },
  { id: "c2", title: "Drafts", kind: "rules", conditions: { kind: "group", id: "g", join: "and", children: [{ kind: "condition", id: "r1", field: "status", op: "eq", value: "draft" }] } },
]);
const note = ref("");

async function onBulkEdit(ids: string[], edit: ProductBulkEdit) {
  products.value = bulkEditProducts(products.value, ids, edit);
}
async function onDelete(p: ProductAdminProduct) {
  products.value = products.value.filter((x) => x.id !== p.id);
}
async function onSaveCollection(c: CollectionDef) {
  collections.value = collections.value.some((x) => x.id === c.id) ? collections.value.map((x) => (x.id === c.id ? c : x)) : [...collections.value, c];
}
async function onSaveProduct() {
  note.value = "Saved.";
}
</script>

<template>
  <NqTabs default-value="products">
    <NqTabsList>
      <NqTabsTab value="products">Products</NqTabsTab>
      <NqTabsTab value="editor">Editor</NqTabsTab>
      <NqTabsTab value="collections">Collections</NqTabsTab>
    </NqTabsList>
    <NqTabsPanel value="products" class="pt-4">
      <NqProductAdminList :products="products" currency="USD" :on-open="(p) => (note = `Open ${p.name}`)" :on-create="() => (note = 'New product')" :on-bulk-edit="onBulkEdit" :on-delete="onDelete" />
    </NqTabsPanel>
    <NqTabsPanel value="editor" class="pt-4">
      <NqProductEditor :initial="productToDraft(products[0]!, { cost: 1500 })" currency="USD" site-url="https://shop.example" :suggestions="{ brands: ['Nile Basics'], categories: ['Clothing', 'Home'], tags: ['summer'] }" :on-save="onSaveProduct" />
      <p v-if="note" role="status">{{ note }}</p>
    </NqTabsPanel>
    <NqTabsPanel value="collections" class="pt-4">
      <NqCollectionsManager :collections="collections" :products="products" currency="USD" :on-save="onSaveCollection" />
    </NqTabsPanel>
  </NqTabs>
</template>
