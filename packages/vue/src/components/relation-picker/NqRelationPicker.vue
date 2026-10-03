<script setup lang="ts">
import { LoaderCircle, Plus, TriangleAlert } from "lucide-vue-next";
import { computed, reactive, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { comboboxFilter, NqCombobox, NqComboboxChips, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList } from "../combobox";
import { optionText, STRINGS, type RelationPickerLabels } from "./strings";
import type { RelationOption } from "./types";

// A field that points at another record (a customer, a project, an assignee) and finds it by searching. Results come
// from your `search` function, so the list can be millions of rows long. It stores ids, shows names, can create a
// record from what was typed, and works on one record or many. Filtering is Arabic-aware.
interface Props {
  /** Chips: `v-model` is then a `string[]`. */
  multiple?: boolean;
  /** The stored id (`string | null`), or the ids with `multiple`. */
  modelValue?: string | null | readonly string[];
  defaultValue?: string | null | readonly string[];
  /** Finds records for what was typed. Called with an empty query to fill the list on open. Aborted when the query changes. */
  search?: (query: string, signal: AbortSignal) => Promise<readonly RelationOption[]>;
  /** Fixed records. Shown before anything is typed, and searched on the client when `search` is omitted. */
  options?: readonly RelationOption[];
  /** Turns stored ids into records, so a saved value shows its name and not its id. Called once for ids it has not seen. */
  resolve?: (ids: readonly string[]) => Promise<readonly RelationOption[]>;
  /** Adds a "Create ..." row for the typed text. Resolve with the new record to select it, or `{ error }`. */
  onCreate?: (query: string) => Promise<RelationOption | { error: string }>;
  /** Milliseconds to wait after typing before searching. Default 250. */
  debounce?: number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  /** Writes hidden inputs (one per id) for a native form. */
  name?: string;
  /** Accessible name when no label points at the field. */
  ariaLabel?: string;
  locale?: string;
  labels?: RelationPickerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  modelValue: undefined,
  defaultValue: undefined,
  search: undefined,
  options: undefined,
  resolve: undefined,
  onCreate: undefined,
  debounce: 250,
  placeholder: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
  locale: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string | null | string[]];
  /** Like update:modelValue, with the record (or records with `multiple`) as well. */
  change: [value: string | null | string[], option: RelationOption | null | RelationOption[]];
}>();
defineSlots<{
  /** A custom row: defaults to the label and its description. */
  option?: (props: { option: RelationOption }) => unknown;
}>();

const CREATE = "\u0000create";
const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const ar = computed(() => locale.value.startsWith("ar"));
const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...props.labels }));

const inner = ref<string | null | readonly string[]>(props.defaultValue ?? (props.multiple ? [] : null));
const raw = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue));
const ids = computed<string[]>(() => (props.multiple ? [...((raw.value as readonly string[] | null) ?? [])] : raw.value ? [raw.value as string] : []));

// Every record seen so far, so a selected id keeps its name when the results change.
const known = reactive<Record<string, RelationOption>>({});
function remember(list: readonly RelationOption[]) {
  for (const o of list) {
    const before = known[o.value];
    if (!before || before.label !== o.label || before.labelAr !== o.labelAr) known[o.value] = o;
  }
}
watch(() => props.options, (list) => remember(list ?? []), { immediate: true });
watch(
  [ids, () => props.resolve],
  ([list, resolve], _old, onCleanup) => {
    const missing = list.filter((x) => !known[x]);
    if (!missing.length || !resolve) return;
    let cancelled = false;
    onCleanup(() => (cancelled = true));
    resolve(missing).then(
      (found) => !cancelled && remember(found),
      () => undefined,
    );
  },
  { immediate: true },
);

const optionOf = (value: string): RelationOption => known[value] ?? { value, label: value };
const selected = computed(() => ids.value.map(optionOf));

const query = ref("");
const results = ref<readonly RelationOption[]>(props.options ?? []);
const status = ref<"idle" | "loading" | "error">("idle");
const open = ref(false);
const retry = ref(0);
const createState = ref<"idle" | "busy" | "failed">("idle");

watch(
  [open, query, () => props.search, () => props.options, () => props.debounce, ar, retry],
  (_new, _old, onCleanup) => {
    if (!open.value) return;
    const search = props.search;
    if (!search) {
      results.value = (props.options ?? []).filter((o) => comboboxFilter(o, query.value, (x) => `${optionText(x, ar.value)} ${x.description ?? ""}`));
      status.value = "idle";
      return;
    }
    const controller = new AbortController();
    status.value = "loading";
    const timer = setTimeout(
      () => {
        search(query.value, controller.signal).then(
          (list) => {
            if (controller.signal.aborted) return;
            remember(list);
            results.value = list;
            status.value = "idle";
          },
          () => {
            if (!controller.signal.aborted) status.value = "error";
          },
        );
      },
      query.value ? props.debounce : 0,
    );
    onCleanup(() => {
      clearTimeout(timer);
      controller.abort();
    });
  },
  { immediate: true },
);

function commit(values: string[]) {
  if (props.modelValue === undefined) inner.value = props.multiple ? values : (values[0] ?? null);
  if (props.multiple) {
    emit("update:modelValue", values);
    emit("change", values, values.map(optionOf));
  } else {
    emit("update:modelValue", values[0] ?? null);
    emit("change", values[0] ?? null, values[0] ? optionOf(values[0]) : null);
  }
}

// The list closes (and clears the query) as the Create row is picked, so the typed text is kept here.
let typed = "";
async function create() {
  const make = props.onCreate;
  const text = (query.value || typed).trim();
  if (!make || !text) return;
  createState.value = "busy";
  try {
    const made = await make(text);
    if ("error" in made) {
      createState.value = "failed";
      return;
    }
    known[made.value] = made;
    commit(props.multiple ? [...ids.value.filter((x) => x !== made.value), made.value] : [made.value]);
    createState.value = "idle";
    query.value = "";
    open.value = false;
  } catch {
    createState.value = "failed";
  }
}

// Selected records always stay in the list, so the box can show them.
const items = computed<RelationOption[]>(() => {
  const shown = new Map<string, RelationOption>();
  for (const o of selected.value) shown.set(o.value, o);
  for (const o of results.value) shown.set(o.value, o);
  const list = [...shown.values()];
  const q = query.value.trim();
  const canCreate = props.onCreate && q && !list.some((o) => optionText(o, ar.value).trim().toLowerCase() === q.toLowerCase());
  return canCreate ? [...list, { value: CREATE, label: t.value.create(q) }] : list;
});

const emptyText = computed(() =>
  status.value === "loading" ? t.value.searching : status.value === "error" ? t.value.error : query.value || props.options?.length || props.search === undefined ? t.value.empty : t.value.hint,
);

function onOpen(next: boolean) {
  open.value = next;
  if (!next) query.value = "";
}
function onSearch(text: string) {
  query.value = text;
  if (text) typed = text;
}
function onPick(next: unknown) {
  if (Array.isArray(next)) {
    const all = next as RelationOption[];
    if (all.some((o) => o.value === CREATE)) return void create();
    remember(all);
    commit(all.map((o) => o.value));
    return;
  }
  const one = (next ?? null) as RelationOption | null;
  if (one?.value === CREATE) return void create();
  if (one) remember([one]);
  commit(one ? [one.value] : []);
}
const text = (o: unknown) => optionText(o as RelationOption, ar.value);
</script>

<template>
  <div data-slot="relation-picker" :data-busy="status === 'loading' || createState === 'busy' ? '' : undefined" :class="cn('min-w-0', props.class)">
    <NqCombobox
      :items="items"
      :filter="null"
      :open="open"
      :disabled="props.disabled"
      :multiple="props.multiple"
      :model-value="props.multiple ? selected : (selected[0] ?? null)"
      :item-to-string="text"
      @update:open="onOpen"
      @update:model-value="onPick"
      @search="onSearch"
    >
      <NqComboboxChips
        v-if="props.multiple"
        :placeholder="props.placeholder ?? t.placeholder"
        :remove-label="t.remove"
        :invalid="props.invalid"
        :input-props="{ id: props.id, 'aria-label': props.ariaLabel }"
      >
        <template #chip="{ item }"><bdi dir="auto">{{ text(item) }}</bdi></template>
      </NqComboboxChips>
      <NqComboboxInput
        v-else
        :id="props.id"
        :placeholder="props.placeholder ?? t.placeholder"
        :aria-label="props.ariaLabel"
        :invalid="props.invalid"
        :clear-label="t.clear"
        :trigger-label="t.open"
      />
      <NqComboboxContent>
        <NqComboboxEmpty>
          <span class="flex items-center justify-center gap-2" role="status">
            <LoaderCircle v-if="status === 'loading'" aria-hidden="true" class="size-4 animate-spin" />
            <TriangleAlert v-else-if="status === 'error'" aria-hidden="true" class="size-4 text-nq-danger-text" />
            {{ emptyText }}
            <button v-if="status === 'error'" type="button" class="text-foreground underline underline-offset-2" @click="retry++">{{ t.retry }}</button>
          </span>
        </NqComboboxEmpty>
        <NqComboboxList v-slot="{ items: rows }">
          <NqComboboxItem v-for="o in (rows as RelationOption[])" :key="o.value" :value="o" :disabled="o.disabled">
            <span v-if="o.value === CREATE" class="flex items-center gap-2 text-foreground">
              <Plus aria-hidden="true" class="size-4 shrink-0" />
              <bdi dir="auto" class="truncate">{{ o.label }}</bdi>
            </span>
            <slot v-else name="option" :option="o">
              <span class="flex min-w-0 flex-col leading-tight">
                <bdi dir="auto" class="truncate">{{ text(o) }}</bdi>
                <bdi v-if="o.description" dir="auto" class="truncate text-caption text-muted-foreground">{{ o.description }}</bdi>
              </span>
            </slot>
          </NqComboboxItem>
        </NqComboboxList>
      </NqComboboxContent>
    </NqCombobox>
    <p v-if="createState === 'failed'" role="alert" class="mt-1.5 text-caption text-nq-danger-text">{{ t.createFailed }}</p>
    <template v-if="props.name">
      <input v-for="x in ids" :key="x" type="hidden" :name="props.name" :value="x" />
    </template>
  </div>
</template>
