<script setup lang="ts">
import { Check, CircleAlert, Search, X } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { normalizeForSearch } from "../commands";
import { NqInput } from "../field";
import { formatNumber } from "../numeric";
import { NqSelect, NqSelectContent, NqSelectGroup, NqSelectItem, NqSelectLabel, NqSelectTrigger, NqSelectValue } from "../select";
import { navItem, searchSettings, strings, type SettingsGroup, type SettingsSaveResult, type SettingsSectionsLabels } from "./strings";

// A settings page with grouped sections. A nav on the side (a select on narrow screens), a search that finds
// individual settings across every page, and a save bar that sticks to the bottom while anything is unsaved.
// It does not own your values: track them yourself, pass `dirty`, and handle `onSave` and `onDiscard`.
// Page content goes in one named slot per page, named by the page id: <template #notifications>…</template>.
interface Props {
  /** `{ id, label, pages }`; a page is `{ id, label, description?, icon?, keywords?, entries?, tone? }`. */
  groups: readonly SettingsGroup[];
  /** The active page id: `v-model`. */
  modelValue?: string;
  defaultValue?: string;
  /** Replaces the localised title. */
  title?: string;
  /** Pass `null` to hide. */
  description?: string | null;
  /** How many changes are unsaved: a number, or `true` when you do not count. 0 or false hides the save bar. */
  dirty?: number | boolean;
  /** Save everything. Return `{ error }` or throw to keep the bar open with the message. */
  onSave?: () => Promise<void | SettingsSaveResult> | void | SettingsSaveResult;
  /** Discard every unsaved change. */
  onDiscard?: () => void | Promise<void>;
  /** Hide the search box with `false`. */
  searchable?: boolean;
  labels?: SettingsSectionsLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  title: undefined,
  description: undefined,
  dirty: 0,
  onSave: undefined,
  onDiscard: undefined,
  searchable: true,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [id: string] }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...strings(locale.value), ...props.labels }));
const pages = computed(() => props.groups.flatMap((g) => g.pages.map((p) => ({ ...p, group: g }))));
const inner = ref(props.defaultValue ?? pages.value[0]?.id ?? "");
const activeId = computed(() => props.modelValue ?? inner.value);
const active = computed(() => pages.value.find((p) => p.id === activeId.value) ?? pages.value[0]);
const visited = ref<Set<string>>(new Set());
watch(
  active,
  (a) => {
    if (a) visited.value = new Set(visited.value).add(a.id);
  },
  { immediate: true },
);
const contentId = useId();
const query = ref("");
let frame = 0;
let flash: ReturnType<typeof setTimeout> | undefined;
let savedTimer: ReturnType<typeof setTimeout> | undefined;

const content = ref<HTMLElement>();
function select(id: string, entryId?: string) {
  if (props.modelValue === undefined) inner.value = id;
  emit("update:modelValue", id);
  if (!entryId) return;
  // After a search hit, scroll to the setting and flash it.
  nextTick(() => {
    frame = requestAnimationFrame(() => {
      const el = content.value?.querySelector<HTMLElement>(`[data-setting-id="${CSS.escape(entryId)}"]`);
      if (!el) return;
      el.scrollIntoView?.({ block: "center", behavior: "smooth" });
      el.setAttribute("data-highlight", "true");
      el.querySelector<HTMLElement>("input,button,select,textarea,[role=switch],[role=combobox]")?.focus({ preventScroll: true });
      flash = setTimeout(() => el.removeAttribute("data-highlight"), 2200);
    });
  });
}
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  clearTimeout(flash);
  clearTimeout(savedTimer);
});

const q = computed(() => normalizeForSearch(query.value));
const hits = computed(() => searchSettings(props.groups, q.value));
function pick(pageId: string, entryId?: string) {
  select(pageId, entryId);
  query.value = "";
}
function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && query.value) {
    e.stopPropagation();
    query.value = "";
  }
}

/* ---- save bar */
const count = computed(() => (typeof props.dirty === "number" ? props.dirty : props.dirty ? 1 : 0));
const status = ref<"idle" | "saving" | "saved" | "error">("idle");
const error = ref<string | undefined>();
watch(status, (s) => {
  clearTimeout(savedTimer);
  if (s === "saved") savedTimer = setTimeout(() => (status.value = "idle"), 2500);
});
watch(count, (c) => {
  if (c > 0 && status.value === "saved") status.value = "idle";
});

async function save() {
  status.value = "saving";
  error.value = undefined;
  try {
    const result = await props.onSave?.();
    if (result && typeof result === "object" && result.error) {
      error.value = result.error;
      status.value = "error";
    } else status.value = "saved";
  } catch {
    error.value = undefined;
    status.value = "error";
  }
}
async function discard() {
  await props.onDiscard?.();
  status.value = "idle";
  error.value = undefined;
}
const barVisible = computed(() => count.value > 0 || status.value === "saved" || status.value === "saving");
const dirtyText = computed(() => (typeof props.dirty === "number" ? t.value.unsaved(formatNumber(props.dirty, locale.value)) : t.value.unsavedSome));
</script>

<template>
  <div data-slot="settings-sections" :class="cn('mx-auto flex w-full max-w-6xl flex-col gap-6', props.class)">
    <header class="flex flex-col gap-1">
      <h1 class="text-h1 text-foreground"><slot name="title">{{ props.title ?? t.title }}</slot></h1>
      <p v-if="props.description !== null" class="text-body text-muted-foreground"><slot name="description">{{ props.description ?? t.description }}</slot></p>
    </header>
    <div class="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-10">
      <div data-slot="settings-sections-nav" class="flex min-w-0 flex-col gap-3 md:sticky md:top-4">
        <div v-if="props.searchable" class="relative">
          <Search aria-hidden="true" class="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <NqInput
            v-model="query"
            type="search"
            :aria-label="t.searchLabel"
            :placeholder="t.search"
            autocomplete="off"
            class="ps-8 pe-8 text-body-sm [&::-webkit-search-cancel-button]:hidden"
            @keydown="onSearchKeydown"
          />
          <button
            v-if="query"
            type="button"
            :aria-label="t.clear"
            class="absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
            @click="query = ''"
          >
            <X aria-hidden="true" class="size-3.5" />
          </button>
        </div>

        <div v-if="q" data-slot="settings-sections-results" class="flex flex-col gap-1">
          <p role="status" class="px-1 text-caption text-muted-foreground">
            {{ hits.length ? t.results(formatNumber(hits.length, locale)) : t.noResults }}
          </p>
          <ul class="flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto">
            <li v-for="hit in hits" :key="hit.key">
              <button
                type="button"
                class="flex w-full flex-col items-start gap-0.5 rounded-control px-3 py-2 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
                @click="pick(hit.pageId, hit.entryId)"
              >
                <span class="text-body-sm font-medium text-foreground">{{ hit.title }}</span>
                <span class="text-caption text-muted-foreground">{{ hit.path }}</span>
              </button>
            </li>
          </ul>
        </div>
        <template v-else>
          <div class="md:hidden">
            <NqSelect :model-value="active?.id" @update:model-value="(next) => next && select(String(next))">
              <NqSelectTrigger :aria-label="t.section"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectGroup v-for="group in props.groups" :key="group.id">
                  <NqSelectLabel>{{ group.label }}</NqSelectLabel>
                  <NqSelectItem v-for="page in group.pages" :key="page.id" :value="page.id">{{ page.label }}</NqSelectItem>
                </NqSelectGroup>
              </NqSelectContent>
            </NqSelect>
          </div>
          <nav :aria-label="t.nav" class="hidden flex-col gap-4 md:flex">
            <div v-for="group in props.groups" :key="group.id" role="group" :aria-labelledby="`${contentId}-${group.id}`" class="flex flex-col gap-0.5">
              <div :id="`${contentId}-${group.id}`" class="px-3 pb-1 text-caption font-medium text-muted-foreground">{{ group.label }}</div>
              <button
                v-for="page in group.pages"
                :key="page.id"
                type="button"
                :data-active="page.id === active?.id"
                :aria-current="page.id === active?.id ? 'page' : undefined"
                :aria-controls="`${contentId}-${page.id}`"
                :title="page.description"
                :class="cn(navItem, page.tone === 'danger' && 'text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text')"
                @click="select(page.id)"
              >
                <component :is="page.icon" v-if="page.icon" aria-hidden="true" />
                <span class="min-w-0 flex-1 truncate">{{ page.label }}</span>
              </button>
            </div>
          </nav>
        </template>
      </div>

      <div :id="contentId" ref="content" data-slot="settings-sections-content" class="flex min-w-0 flex-col gap-6">
        <template v-for="page in pages" :key="page.id">
          <div
            v-if="visited.has(page.id)"
            v-show="page.id === active?.id"
            :id="`${contentId}-${page.id}`"
            role="region"
            :aria-label="page.label"
            :data-section="page.id"
            class="flex min-w-0 flex-col gap-6"
          >
            <slot :name="page.id" />
          </div>
        </template>

        <div
          v-show="barVisible || status === 'error'"
          data-slot="settings-save-bar"
          :data-state="status"
          :class="
            cn(
              'sticky bottom-4 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-floating border bg-card px-4 py-3 shadow-floating',
              status === 'error' ? 'border-nq-danger/50' : 'border-border',
            )
          "
        >
          <div role="status" aria-live="polite" class="flex min-w-0 flex-1 items-center gap-2 text-body-sm">
            <template v-if="status === 'saved'">
              <Check aria-hidden="true" class="size-4 shrink-0 text-nq-success-text" />
              <span class="text-foreground">{{ t.saved }}</span>
            </template>
            <template v-else-if="status === 'error'">
              <CircleAlert aria-hidden="true" class="size-4 shrink-0 text-nq-danger-text" />
              <span class="text-nq-danger-text">{{ error ?? t.failed }}</span>
            </template>
            <span v-else-if="status === 'saving'" class="text-muted-foreground">{{ t.saving }}</span>
            <template v-else>
              <span aria-hidden="true" class="size-2 shrink-0 rounded-full bg-nq-accent" />
              <span class="text-foreground">{{ dirtyText }}</span>
            </template>
          </div>
          <div v-if="status !== 'saved'" class="flex items-center gap-2">
            <NqButton variant="ghost" :disabled="status === 'saving'" @click="discard">{{ t.discard }}</NqButton>
            <NqButton variant="primary" :loading="status === 'saving'" @click="save">{{ t.save }}</NqButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
