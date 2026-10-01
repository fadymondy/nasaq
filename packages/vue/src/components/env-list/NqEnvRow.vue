<script setup lang="ts">
import { Eye, EyeOff, Lock, Pencil, Trash2 } from "lucide-vue-next";
import { computed } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCopyButton } from "../copy-button";
import { MASK, type EnvVariable } from "./env-list-format";
import type { EnvListStrings } from "./strings";

// One variable: key and note, the masked or revealed value, and reveal / copy / edit / delete.
interface Props {
  variable: EnvVariable;
  revealed: boolean;
  t: EnvListStrings;
  canEdit: boolean;
  canDelete: boolean;
}
const props = defineProps<Props>();
const emit = defineEmits<{ toggle: []; edit: []; delete: [] }>();

const secret = computed(() => props.variable.secret !== false);
const visible = computed(() => !secret.value || props.revealed);
</script>

<template>
  <li
    data-slot="env-row"
    :data-secret="secret ? '' : undefined"
    :data-revealed="props.revealed ? '' : undefined"
    class="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
  >
    <div class="flex min-w-0 flex-col gap-0.5 sm:w-2/5">
      <div class="flex min-w-0 items-center gap-2">
        <bdi dir="ltr" class="truncate font-mono text-code font-medium text-foreground">{{ props.variable.key }}</bdi>
        <NqBadge v-if="secret" variant="neutral" class="shrink-0"><Lock aria-hidden="true" />{{ props.t.secret }}</NqBadge>
      </div>
      <span v-if="props.variable.description" class="truncate text-caption text-muted-foreground">{{ props.variable.description }}</span>
    </div>
    <div class="min-w-0 flex-1">
      <bdi v-if="visible" dir="ltr" data-slot="env-value" class="block truncate font-mono text-code text-foreground" :title="props.variable.value">
        <span v-if="props.variable.value === ''" class="text-muted-foreground">{{ props.t.emptyValue }}</span>
        <template v-else>{{ props.variable.value }}</template>
      </bdi>
      <span v-else data-slot="env-value" dir="ltr" role="text" :aria-label="props.t.hidden" class="block font-mono text-code text-muted-foreground">{{ MASK }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <NqButton
        v-if="secret"
        type="button"
        variant="ghost"
        size="icon-sm"
        :aria-label="props.revealed ? props.t.hide(props.variable.key) : props.t.reveal(props.variable.key)"
        :aria-pressed="props.revealed"
        @click="emit('toggle')"
      >
        <EyeOff v-if="props.revealed" aria-hidden="true" />
        <Eye v-else aria-hidden="true" />
      </NqButton>
      <NqCopyButton :value="() => props.variable.value" :label="props.t.copyValue(props.variable.key)" :copied-label="props.t.copied" />
      <NqButton v-if="props.canEdit" type="button" variant="ghost" size="icon-sm" :aria-label="props.t.edit(props.variable.key)" @click="emit('edit')">
        <Pencil aria-hidden="true" />
      </NqButton>
      <NqButton v-if="props.canDelete" type="button" variant="ghost" size="icon-sm" :aria-label="props.t.remove(props.variable.key)" class="text-nq-danger-text" @click="emit('delete')">
        <Trash2 aria-hidden="true" />
      </NqButton>
    </div>
  </li>
</template>
