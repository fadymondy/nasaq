<script setup lang="ts">
import { Key, Link2, Table2 } from "lucide-vue-next";
import { NqBadge } from "../badge";
import { NqEmptyState } from "../states";
import type { DatabaseExplorerLabels } from "./strings";
import type { DatabaseTable } from "./types";

// The Structure tab: one row per column with type, nullability, key and reference. Internal to NqDatabaseExplorer.
const props = defineProps<{ table: DatabaseTable | undefined; t: DatabaseExplorerLabels }>();
</script>

<template>
  <NqEmptyState v-if="!props.table" :icon="Table2" :title="props.t.pickTable" />
  <div v-else class="overflow-x-auto rounded-card border border-border bg-card">
    <table :aria-label="props.table.name" class="w-full min-w-md border-collapse text-body-sm">
      <thead>
        <tr class="border-b border-border text-start text-caption text-muted-foreground">
          <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.column }}</th>
          <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.type }}</th>
          <th scope="col" class="px-3 py-2 text-start font-medium">{{ props.t.nullable }}</th>
          <th scope="col" class="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in props.table.columns" :key="c.name" class="border-b border-border last:border-b-0">
          <th scope="row" class="px-3 py-2 text-start font-normal">
            <bdi dir="ltr" class="font-mono text-code text-foreground">{{ c.name }}</bdi>
          </th>
          <td class="px-3 py-2">
            <bdi dir="ltr" class="font-mono text-code text-muted-foreground">{{ c.type }}</bdi>
          </td>
          <td class="px-3 py-2 text-muted-foreground">{{ c.nullable ? props.t.yes : props.t.no }}</td>
          <td class="px-3 py-2">
            <span class="flex flex-wrap items-center justify-end gap-1.5">
              <NqBadge v-if="c.primaryKey" variant="accent">
                <Key aria-hidden="true" />
                {{ props.t.primaryKey }}
              </NqBadge>
              <NqBadge v-if="c.references" variant="info" :title="props.t.references(c.references)">
                <Link2 aria-hidden="true" />
                <bdi dir="ltr" class="font-mono">{{ c.references }}</bdi>
              </NqBadge>
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
