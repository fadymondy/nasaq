<script setup lang="ts">
import { BookMarked, Gavel, Lightbulb, Pencil, Plus, Search, Trash2, X } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent } from "../card";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqDateTime, NqNum } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { filterMemories, memoryTags, parseTags } from "./project-logic";
import type { ProjectViewStrings } from "./strings";
import type { MemoryKind, ProjectMemoryItem, ProjectMemoryProps } from "./types";

// Remembered facts and decisions for one project: search, tag and kind filters, add, edit and forget with confirm.
const props = defineProps<ProjectMemoryProps & { t: ProjectViewStrings }>();

const uid = useId();
const query = ref("");
const tags = ref<string[]>([]);
const kind = ref<"all" | MemoryKind>("all");
const editing = ref<ProjectMemoryItem | "new" | null>(null);
const forgetting = ref<ProjectMemoryItem | null>(null);
const busy = ref(false);
const error = ref<string | null>(null);

// The add / edit form.
const text = ref("");
const formKind = ref<MemoryKind>("fact");
const formTags = ref("");
const source = ref("");
const formBusy = ref(false);
const formError = ref<string | null>(null);

const allTags = computed(() => memoryTags(props.items));
const shown = computed(() => filterMemories(props.items, { query: query.value, tags: tags.value, kind: kind.value }));
const filtered = computed(() => query.value.trim() !== "" || tags.value.length > 0 || kind.value !== "all");
const toggleTag = (tag: string) => {
  tags.value = tags.value.includes(tag) ? tags.value.filter((x) => x !== tag) : [...tags.value, tag];
};
const clear = () => {
  query.value = "";
  tags.value = [];
  kind.value = "all";
};

function openEditor(item: ProjectMemoryItem | "new") {
  const existing = item === "new" ? null : item;
  text.value = existing?.text ?? "";
  formKind.value = existing?.kind ?? "fact";
  formTags.value = (existing?.tags ?? []).join(", ");
  source.value = existing?.source ?? "";
  formError.value = null;
  editing.value = item;
}
async function submit() {
  if (!props.onSave) return;
  if (!text.value.trim()) {
    formError.value = props.t.memoryText;
    return;
  }
  formBusy.value = true;
  const existing = editing.value === "new" ? null : editing.value;
  const result = await props.onSave({ kind: formKind.value, text: text.value.trim(), tags: parseTags(formTags.value), source: source.value.trim() || undefined }, existing?.id);
  formBusy.value = false;
  if (result && "error" in result && result.error) {
    formError.value = result.error;
    return;
  }
  editing.value = null;
}
async function forget() {
  if (!forgetting.value || !props.onForget) return;
  busy.value = true;
  const result = await props.onForget(forgetting.value.id);
  busy.value = false;
  if (result && "error" in result && result.error) {
    error.value = result.error;
    return;
  }
  error.value = null;
  forgetting.value = null;
}
</script>

<template>
  <div data-slot="project-memory" class="flex min-w-0 flex-col gap-4">
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-0.5">
        <h2 class="m-0 text-h3">{{ props.t.memoryTitle }}</h2>
        <p class="m-0 text-body-sm text-muted-foreground">{{ props.t.memoryHint }} <span>{{ props.t.memoryCount(String(props.items.length)) }}</span></p>
      </div>
      <NqButton v-if="props.onSave" @click="openEditor('new')"><Plus aria-hidden="true" />{{ props.t.memoryAdd }}</NqButton>
    </div>

    <div class="flex min-w-0 flex-col gap-3">
      <div class="relative">
        <Search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <NqInput v-model="query" type="search" :aria-label="props.t.memorySearch" :placeholder="props.t.memorySearch" class="ps-9" />
      </div>
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <div role="group" :aria-label="props.t.memoryKindFilter" class="flex flex-wrap gap-1.5">
          <NqButton v-for="k in (['all', 'fact', 'decision'] as const)" :key="k" size="sm" :variant="kind === k ? 'primary' : 'secondary'" :aria-pressed="kind === k" @click="kind = k">
            {{ k === "all" ? props.t.memoryAllKinds : props.t.memoryKindsPlural[k] }}
          </NqButton>
        </div>
        <div v-if="allTags.length" role="group" :aria-label="props.t.memoryTagFilter" class="flex flex-wrap gap-1.5">
          <NqButton v-for="x in allTags" :key="x.tag" size="sm" :variant="tags.includes(x.tag) ? 'primary' : 'secondary'" :aria-pressed="tags.includes(x.tag)" @click="toggleTag(x.tag)">
            <bdi>#{{ x.tag }}</bdi>
            <span class="opacity-70"><NqNum :value="x.count" /></span>
          </NqButton>
        </div>
        <NqButton v-if="filtered" size="sm" variant="ghost" @click="clear"><X aria-hidden="true" />{{ props.t.memoryClear }}</NqButton>
      </div>
    </div>

    <NqEmptyState v-if="shown.length === 0" :icon="BookMarked" :title="filtered ? props.t.memoryNoMatch : props.t.memoryEmpty" :description="filtered ? props.t.memoryNoMatchHint : props.t.memoryEmptyHint" />
    <ul v-else class="m-0 flex list-none flex-col gap-3 p-0" :aria-label="props.t.memoryTitle">
      <li v-for="m in shown" :key="m.id">
        <NqCard>
          <NqCardContent class="flex min-w-0 flex-col gap-2 pt-4">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
                  <Gavel v-if="(m.kind ?? 'fact') === 'decision'" />
                  <Lightbulb v-else />
                </span>
                <p dir="auto" class="m-0 min-w-0 whitespace-pre-wrap break-words text-body">{{ m.text }}</p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <NqButton v-if="props.onSave" size="icon-sm" variant="ghost" :aria-label="`${props.t.memoryEdit}: ${m.text.slice(0, 40)}`" @click="openEditor(m)"><Pencil aria-hidden="true" /></NqButton>
                <NqButton v-if="props.onForget" size="icon-sm" variant="ghost" :aria-label="`${props.t.memoryForget}: ${m.text.slice(0, 40)}`" @click="forgetting = m"><Trash2 aria-hidden="true" /></NqButton>
              </div>
            </div>
            <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 ps-11 text-caption text-muted-foreground">
              <NqBadge :variant="(m.kind ?? 'fact') === 'decision' ? 'info' : 'outline'">{{ props.t.memoryKinds[m.kind ?? "fact"] }}</NqBadge>
              <button v-for="tag in m.tags ?? []" :key="tag" type="button" class="cursor-pointer rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" @click="toggleTag(tag)"><bdi>#{{ tag }}</bdi></button>
              <span v-if="m.source">{{ props.t.memoryFrom }} <span class="text-foreground">{{ m.source }}</span></span>
              <NqDateTime :value="m.at" :format="{ day: 'numeric', month: 'short', year: 'numeric' }" />
            </div>
          </NqCardContent>
        </NqCard>
      </li>
    </ul>

    <NqDialog :open="editing !== null && !!props.onSave" @update:open="(o: boolean) => !o && (editing = null)">
      <NqDialogContent>
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <NqDialogHeader>
            <NqDialogTitle>{{ editing && editing !== "new" ? props.t.memoryEditTitle : props.t.memoryAddTitle }}</NqDialogTitle>
          </NqDialogHeader>
          <NqField :invalid="formError === props.t.memoryText">
            <NqFieldLabel>{{ props.t.memoryText }}</NqFieldLabel>
            <NqTextarea v-model="text" :rows="4" dir="auto" autofocus />
          </NqField>
          <div class="flex flex-col gap-1.5">
            <span :id="`${uid}-kind`" class="text-label">{{ props.t.memoryKind }}</span>
            <NqSelect v-model="formKind">
              <NqSelectTrigger :aria-labelledby="`${uid}-kind`"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="k in (['fact', 'decision'] as const)" :key="k" :value="k">{{ props.t.memoryKinds[k] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
          <NqField>
            <NqFieldLabel>{{ props.t.memoryTags }}</NqFieldLabel>
            <NqInput v-model="formTags" />
            <NqFieldDescription>{{ props.t.memoryTagsHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.memorySource }}</NqFieldLabel>
            <NqInput v-model="source" />
            <NqFieldDescription>{{ props.t.memorySourceHint }}</NqFieldDescription>
          </NqField>
          <p v-if="formError && formError !== props.t.memoryText" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ formError }}</p>
          <NqDialogFooter>
            <NqButton type="button" variant="ghost" :disabled="formBusy" @click="editing = null">{{ props.t.cancel }}</NqButton>
            <NqButton type="submit" :loading="formBusy">{{ props.t.save }}</NqButton>
          </NqDialogFooter>
        </form>
      </NqDialogContent>
    </NqDialog>

    <NqDialog :open="forgetting !== null" @update:open="(o: boolean) => !o && (forgetting = null)">
      <NqDialogContent>
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.memoryForgetTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.memoryForgetBody }}</NqDialogDescription>
        </NqDialogHeader>
        <p v-if="forgetting" dir="auto" class="m-0 rounded-md border border-border bg-secondary px-3 py-2 text-body-sm">{{ forgetting.text }}</p>
        <p v-if="error" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="forgetting = null">{{ props.t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="forget">{{ props.t.memoryForget }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
