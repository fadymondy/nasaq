<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqDialog, NqDialogContent, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { groupEvents, groupState, setEvents, validateEndpoint, validateEndpointUrl, type EndpointField } from "./format";
import type { EndpointInput, WebhookEndpoint, WebhookEvent, WebhooksManagerStrings } from "./strings";

// The add / edit form of an endpoint, in a dialog. Internal.
const props = defineProps<{
  target: WebhookEndpoint | "new" | null;
  events: readonly WebhookEvent[];
  t: WebhooksManagerStrings;
  onSave: (input: EndpointInput) => Promise<{ error?: string } | undefined>;
}>();
const emit = defineEmits<{ close: [] }>();

const name = ref("");
const url = ref("");
const channel = ref("");
const selected = ref<string[]>([]);
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);

const editingEndpoint = computed(() => (props.target && props.target !== "new" ? props.target : null));

watch(
  () => props.target,
  (target) => {
    if (!target) return;
    name.value = target === "new" ? "" : target.name;
    url.value = target === "new" ? "" : target.url;
    channel.value = target === "new" ? "" : (target.channel ?? "");
    selected.value = target === "new" ? [] : [...target.events];
    touched.value = false;
    error.value = null;
  },
  { immediate: true },
);

const problems = computed<EndpointField[]>(() => validateEndpoint({ name: name.value, url: url.value, events: selected.value }));
const urlCheck = computed(() => validateEndpointUrl(url.value));
const groups = computed(() => groupEvents(props.events));

async function submit() {
  touched.value = true;
  if (problems.value.length) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onSave({ ...(editingEndpoint.value ? { id: editingEndpoint.value.id } : {}), name: name.value.trim(), url: url.value.trim(), channel: channel.value.trim(), events: selected.value });
    if (result && result.error) error.value = result.error;
    else emit("close");
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}

const toggle = (ids: string[], on: boolean | "indeterminate") => (selected.value = setEvents(selected.value, ids, on === true));
</script>

<template>
  <NqDialog :open="props.target !== null" @update:open="(o: boolean) => !o && !pending && emit('close')">
    <NqDialogContent data-slot="webhooks-endpoint-form" class="max-w-xl">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ editingEndpoint ? props.t.editTitle : props.t.createTitle }}</NqDialogTitle>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && problems.includes('name')">
            <NqFieldLabel>{{ props.t.nameLabel }}</NqFieldLabel>
            <NqInput v-model="name" :placeholder="props.t.namePlaceholder" autocomplete="off" />
            <NqFieldError v-if="touched && problems.includes('name')" :match="true">{{ props.t.nameRequired }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.channelLabel }}</NqFieldLabel>
            <NqInput v-model="channel" :placeholder="props.t.channelPlaceholder" autocomplete="off" />
            <NqFieldDescription>{{ props.t.channelHint }}</NqFieldDescription>
          </NqField>
        </div>
        <NqField :invalid="touched && problems.includes('url')">
          <NqFieldLabel>{{ props.t.urlLabel }}</NqFieldLabel>
          <NqInput v-model="url" ltr type="url" :placeholder="props.t.urlPlaceholder" autocomplete="off" :spellcheck="false" />
          <NqFieldError v-if="touched && !urlCheck.ok" :match="true">{{ props.t.urlProblems[urlCheck.problem] }}</NqFieldError>
        </NqField>
        <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend class="mb-1 text-label text-foreground">{{ props.t.eventsLabel }}</legend>
          <div class="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-control border border-border p-3">
            <div v-for="g in groups" :key="g.group || '_'" class="flex flex-col gap-1.5">
              <label class="flex items-center gap-2 text-label text-foreground">
                <NqCheckbox
                  :model-value="groupState(selected, g.events.map((e) => e.id)) === 'all'"
                  :indeterminate="groupState(selected, g.events.map((e) => e.id)) === 'some'"
                  :aria-label="`${props.t.selectAll}: ${g.group || props.t.eventsLabel}`"
                  @update:model-value="(v: boolean | 'indeterminate') => toggle(g.events.map((e) => e.id), v)"
                />
                {{ g.group || props.t.selectAll }}
              </label>
              <div class="grid gap-1.5 ps-6 sm:grid-cols-2">
                <label v-for="e in g.events" :key="e.id" class="flex items-center gap-2 text-body-sm text-foreground">
                  <NqCheckbox :model-value="selected.includes(e.id)" @update:model-value="(v: boolean | 'indeterminate') => toggle([e.id], v)" />
                  <span class="min-w-0">
                    <span dir="auto">{{ e.label }}</span>
                    <bdi dir="ltr" class="block truncate font-mono text-caption text-muted-foreground">{{ e.id }}</bdi>
                  </span>
                </label>
              </div>
            </div>
          </div>
          <p v-if="touched && problems.includes('events')" class="text-caption text-danger">{{ props.t.eventsRequired }}</p>
        </fieldset>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ editingEndpoint ? props.t.save : props.t.create }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
