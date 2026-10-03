<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { schemaFormChild, schemaFormIsRecord, useSchemaForm } from "./context";
import NqSchemaLeaf from "./NqSchemaLeaf.vue";
import NqSchemaList from "./NqSchemaList.vue";
import { schemaFormOrdered, type SchemaTreeList, type SchemaTreeNode, type SchemaTreeObject, type SchemaTreeState } from "./schema-tree";

// The children of an object: fields and lists in a grid, then nested objects as fieldsets (this component again).
interface Props {
  node: SchemaTreeObject;
  value: unknown;
  path: string;
  depth: number;
}
const props = defineProps<Props>();
const ctx = useSchemaForm();
const source = computed(() => (schemaFormIsRecord(props.value) ? props.value : {}));
const ordered = computed(() => schemaFormOrdered(props.node.children));
const visibleLoose = computed(() => ordered.value.loose.filter((c) => ctx.states[schemaFormChild(props.path, c.key)]?.visible !== false));

function objectHidden(node: SchemaTreeObject, path: string, value: unknown, states: Record<string, SchemaTreeState>): boolean {
  if (states[path]?.visible === false) return true;
  if (node.children.length === 0) return false;
  const src = schemaFormIsRecord(value) ? value : {};
  return node.children.every((c) => {
    const p = schemaFormChild(path, c.key);
    return c.kind === "object" ? objectHidden(c, p, src[c.key], states) : states[p]?.visible === false;
  });
}
const objects = computed(() => ordered.value.objects.filter((o) => !objectHidden(o, schemaFormChild(props.path, o.key), source.value[o.key], ctx.states)));
const listOf = (n: SchemaTreeNode): SchemaTreeList => n as SchemaTreeList;
const arrayOf = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
</script>

<template>
  <div v-if="visibleLoose.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <template v-for="c in visibleLoose" :key="c.key">
      <NqSchemaLeaf v-if="c.kind === 'field'" :node="c" :value="source[c.key]" :path="schemaFormChild(props.path, c.key)" />
      <NqSchemaList v-else :node="listOf(c)" :value="arrayOf(source[c.key])" :path="schemaFormChild(props.path, c.key)" />
    </template>
  </div>
  <fieldset
    v-for="o in objects"
    :key="o.key"
    data-slot="schema-form-section"
    :data-schema-path="schemaFormChild(props.path, o.key)"
    :disabled="ctx.disabled"
    :class="cn('flex min-w-0 flex-col gap-4 border-0 p-0', props.depth > 0 && 'border-s border-border ps-4')"
  >
    <legend :class="cn('mb-3 w-full pb-2 font-semibold text-foreground', props.depth === 0 ? 'border-b border-border text-h4' : 'text-label')">{{ o.label }}</legend>
    <p v-if="o.description" class="-mt-2 text-caption text-muted-foreground">{{ o.description }}</p>
    <NqSchemaNodes :node="o" :value="source[o.key]" :path="schemaFormChild(props.path, o.key)" :depth="props.depth + 1" />
    <p v-if="ctx.messageFor(schemaFormChild(props.path, o.key))" role="alert" class="text-caption text-nq-danger-text">{{ ctx.messageFor(schemaFormChild(props.path, o.key)) }}</p>
  </fieldset>
</template>
