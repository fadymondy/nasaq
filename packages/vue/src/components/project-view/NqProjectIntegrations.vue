<script setup lang="ts">
import { ref } from "vue";
import { NqCard, NqCardContent } from "../card";
import { NqStatus } from "../status";
import { NqSwitch } from "../switch";
import type { ProjectViewStrings } from "./strings";
import type { ProjectIntegration, ProjectResult } from "./types";

// The settings page of connected tools, one switch each.
const props = defineProps<{
  integrations: readonly ProjectIntegration[];
  /** Connect or disconnect. Return `{ error }` to keep the switch where it was. */
  onToggle?: (id: string, connected: boolean) => Promise<ProjectResult>;
  t: ProjectViewStrings;
}>();

const busy = ref<string | null>(null);
const error = ref<string | null>(null);
async function toggle(item: ProjectIntegration, next: boolean) {
  if (!props.onToggle) return;
  busy.value = item.id;
  const result = await props.onToggle(item.id, next);
  busy.value = null;
  error.value = result && "error" in result && result.error ? result.error : null;
}
</script>

<template>
  <div data-slot="project-integrations" class="flex min-w-0 flex-col gap-3">
    <p v-if="error" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ error }}</p>
    <ul class="m-0 flex list-none flex-col gap-2 p-0">
      <li v-for="i in props.integrations" :key="i.id">
        <NqCard>
          <NqCardContent class="flex min-w-0 items-center justify-between gap-3 pt-4">
            <div class="flex min-w-0 items-center gap-3">
              <span v-if="i.icon" aria-hidden="true" class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground [&_svg]:size-5"><component :is="i.icon" /></span>
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="flex flex-wrap items-center gap-2 text-label">
                  {{ i.name }}
                  <NqStatus :tone="i.connected ? 'success' : 'neutral'">{{ i.connected ? props.t.connected : props.t.notConnected }}</NqStatus>
                </span>
                <span v-if="i.description" class="text-body-sm text-muted-foreground">{{ i.description }}</span>
              </div>
            </div>
            <NqSwitch :aria-label="`${i.connected ? props.t.disconnect : props.t.connect}: ${i.name}`" :model-value="i.connected" :disabled="!props.onToggle || busy === i.id" @update:model-value="(v: boolean) => toggle(i, Boolean(v))" />
          </NqCardContent>
        </NqCard>
      </li>
    </ul>
  </div>
</template>
