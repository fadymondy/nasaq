<script setup lang="ts">
import { computed, nextTick, provide, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { formatDate, formatNumber } from "../numeric";
import type { FormRule } from "../public-form/form-model";
import { SCHEMA_FORM, type SchemaFormContext, type SchemaFormLabels, type SchemaFormRelationSource, type SchemaFormSubmitResult, schemaFormDateOf } from "./context";
import NqSchemaNodes from "./NqSchemaNodes.vue";
import type { SchemaFormJson } from "./schema-fields";
import { schemaPathInside, schemaPathSet } from "./schema-path";
import { SCHEMA_FORM_STRINGS, type SchemaFormStrings } from "./schema-strings";
import { SCHEMA_FORM_MESSAGES, schemaFormMapErrors, schemaFormPathLabel, schemaFormTree, schemaFormTreeInitial, schemaFormTreeOutput, schemaFormTreeStates, schemaFormTreeValidate } from "./schema-tree";

/**
 * A form generated from a JSON Schema: text, numbers, enums, booleans, dates, foreign keys, objects nested to any depth,
 * lists of plain values (tags, repeated inputs, checkbox groups) and lists of objects (collapsible, reorderable groups).
 * Rules from NqRuleBuilder show, hide or require fields, by path. It validates on the client with functions you can run on
 * the server, and puts the server's field errors on the right nested field.
 */
interface Props {
  /** A JSON Schema of type object. See the README for the supported subset and the `x-` extensions. */
  schema: SchemaFormJson;
  /** Controlled values in the shape of the schema (v-model). */
  modelValue?: Record<string, unknown>;
  defaultValue?: Record<string, unknown>;
  /** Called with valid output. Resolve with `{ error, fieldErrors }` to show server errors. */
  onSubmit?: (value: Record<string, unknown>) => Promise<void | SchemaFormSubmitResult> | void;
  /** Show, hide and require rules, from NqRuleBuilder. Fields are addressed by path. */
  rules?: readonly FormRule[];
  /** Where each `x-relation` resource is searched, by resource name. */
  relations?: Record<string, SchemaFormRelationSource>;
  submitLabel?: string;
  /** Hides the Save and Reset buttons, for a form submitted from outside. */
  hideActions?: boolean;
  disabled?: boolean;
  /** Accessible name. */
  label?: string;
  locale?: string;
  labels?: SchemaFormLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, onSubmit: undefined, rules: undefined, relations: undefined, submitLabel: undefined, label: undefined, locale: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: Record<string, unknown>] }>();

type Values = Record<string, unknown>;
const FOCUSABLE = ':is(input, textarea, button, [role="combobox"], [role="switch"], [role="checkbox"]):not([disabled])';

const nasaq = useNasaq();
const locale = computed(() => props.locale ?? nasaq.locale.value);
const lang = computed<"en" | "ar">(() => (locale.value.startsWith("ar") ? "ar" : "en"));
const t = computed<SchemaFormStrings>(() => ({ ...SCHEMA_FORM_STRINGS[lang.value], ...props.labels }));
const messages = computed(() => SCHEMA_FORM_MESSAGES[lang.value]);
const uid = useId();
const formEl = ref<HTMLFormElement | null>(null);
const n = (v: number) => formatNumber(v, lang.value);

const root = computed(() => schemaFormTree(props.schema, { locale: lang.value }).root);
const inner = ref<unknown>(schemaFormTreeInitial(root.value, props.modelValue ?? props.defaultValue));
const values = computed(() => (props.modelValue ? schemaFormTreeInitial(root.value, props.modelValue) : inner.value));

const touched = ref<ReadonlySet<string>>(new Set());
const showAll = ref(false);
const status = ref<"idle" | "saving" | "saved" | "failed">("idle");
const formError = ref<string | null>(null);
const serverErrors = ref<Record<string, string>>({});
const reveal = ref<{ token: number; paths: readonly string[] } | null>(null);

const states = computed(() => schemaFormTreeStates(root.value, values.value, props.rules));
const issues = computed(() => schemaFormTreeValidate(root.value, values.value, { messages: messages.value, states: states.value, formatDate: (iso) => formatDate(schemaFormDateOf(iso) ?? iso, lang.value, { dateStyle: "medium" }), formatIndex: n }));
const mapped = computed(() => schemaFormMapErrors(root.value, values.value, serverErrors.value));

/** What is on screen: server errors win, client errors show once edited or after a failed submit. */
const shown = computed(() => {
  const out: Record<string, string> = {};
  for (const [path, message] of Object.entries(issues.value)) if (showAll.value || touched.value.has(path)) out[path] = message;
  for (const [path, message] of Object.entries(mapped.value.fields)) out[path] = message;
  return out;
});
const shownPaths = computed(() => Object.keys(shown.value));
const issueCount = computed(() => Object.keys(issues.value).length);
const summary = computed(() => (showAll.value ? shownPaths.value.filter((p) => shown.value[p]) : []));
const busy = computed(() => status.value === "saving");

const output = (next: unknown) => schemaFormTreeOutput(root.value, next, { visible: (p) => states.value[p]?.visible !== false }) as Values;

function commit(path: string, next: unknown, structural: boolean) {
  const merged = schemaPathSet(values.value, path, next);
  if (!props.modelValue) inner.value = merged;
  touched.value = new Set(touched.value).add(path);
  const keys = Object.keys(serverErrors.value).filter((k) => (structural ? schemaPathInside(k, path) : k === path));
  if (keys.length) {
    const copy = { ...serverErrors.value };
    for (const k of keys) delete copy[k];
    serverErrors.value = copy;
  }
  if (status.value !== "saving") status.value = "idle";
  emit("update:modelValue", output(merged));
}

/** Opens the groups that hold a path, then puts focus on its field. */
function focusPath(path: string) {
  reveal.value = { token: (reveal.value?.token ?? 0) + 1, paths: [path] };
  let tries = 0;
  const attempt = () => {
    const scope = formEl.value;
    if (!scope) return;
    const holder = [...scope.querySelectorAll<HTMLElement>("[data-schema-path]")].find((el) => el.dataset.schemaPath === path);
    const target = holder ? (holder.matches(FOCUSABLE) ? holder : holder.querySelector<HTMLElement>(FOCUSABLE)) : null;
    if (target && target.closest("[hidden]") === null) {
      target.focus();
      target.scrollIntoView?.({ block: "center", behavior: "smooth" });
      return;
    }
    tries += 1;
    if (tries < 6) requestAnimationFrame(attempt);
  };
  void nextTick(() => requestAnimationFrame(() => requestAnimationFrame(attempt)));
}

async function submit(event: Event) {
  event.preventDefault();
  if (props.disabled || status.value === "saving") return;
  showAll.value = true;
  if (issueCount.value > 0) {
    status.value = "idle";
    focusPath(Object.keys(issues.value)[0] as string);
    return;
  }
  status.value = "saving";
  formError.value = null;
  try {
    // Hidden fields are not part of what is submitted.
    const result = await props.onSubmit?.(output(values.value));
    if (result && (result.error || result.fieldErrors)) {
      const errors = result.fieldErrors ?? {};
      serverErrors.value = errors;
      formError.value = result.error ?? null;
      status.value = "failed";
      const first = Object.keys(schemaFormMapErrors(root.value, values.value, errors).fields)[0];
      if (first) focusPath(first);
    } else {
      status.value = "saved";
    }
  } catch {
    formError.value = t.value.failed;
    status.value = "failed";
  }
}

function reset(event?: Event) {
  event?.preventDefault();
  const fresh = schemaFormTreeInitial(root.value, props.defaultValue);
  if (!props.modelValue) inner.value = fresh;
  emit("update:modelValue", schemaFormTreeOutput(root.value, fresh, {}) as Values);
  touched.value = new Set();
  showAll.value = false;
  serverErrors.value = {};
  formError.value = null;
  status.value = "idle";
}

const ctx: SchemaFormContext = {
  uid,
  get t() {
    return t.value;
  },
  get locale() {
    return lang.value;
  },
  get messages() {
    return messages.value;
  },
  get states() {
    return states.value;
  },
  messageFor: (path) => shown.value[path] || undefined,
  issueCount: (path) => shownPaths.value.filter((p) => schemaPathInside(p, path)).length,
  get disabled() {
    return !!props.disabled;
  },
  get relations() {
    return props.relations;
  },
  get showErrors() {
    return showAll.value;
  },
  onChange: (path, next) => commit(path, next, false),
  onStructure: (path, next) => commit(path, next, true),
  get reveal() {
    return reveal.value;
  },
};
provide(SCHEMA_FORM, ctx);
</script>

<template>
  <form ref="formEl" data-slot="schema-form" :aria-label="props.label" novalidate :class="cn('flex min-w-0 flex-col gap-6', props.class)" @submit="submit" @reset="reset">
    <NqSchemaNodes :node="root" :value="values" path="" :depth="0" />
    <NqAlert v-if="formError" tone="danger">{{ formError }}</NqAlert>
    <NqAlert v-if="mapped.unmatched.length" tone="danger" data-slot="schema-form-unmatched">
      <p>{{ t.unmatched }}</p>
      <ul class="mt-1 list-disc ps-5">
        <li v-for="u in mapped.unmatched" :key="u.path">{{ u.path }}: {{ u.message }}</li>
      </ul>
    </NqAlert>
    <NqAlert v-if="status === 'saved'" tone="success">{{ t.saved }}</NqAlert>
    <NqAlert v-if="showAll && issueCount > 0" tone="warning" data-slot="schema-form-summary">
      <p>{{ t.fix(issueCount) }}</p>
      <ul v-if="issueCount > 1 || summary.length" :aria-label="t.goTo" class="mt-1 flex flex-col items-start gap-0.5">
        <li v-for="p in summary.slice(0, 8)" :key="p">
          <button type="button" :data-path="p" class="rounded-control text-start underline underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click="focusPath(p)">
            {{ schemaFormPathLabel(root, p, n) || p }}: {{ shown[p] }}
          </button>
        </li>
      </ul>
    </NqAlert>
    <div v-if="!props.hideActions" class="flex flex-wrap items-center gap-2">
      <NqButton type="submit" variant="primary" :loading="busy" :disabled="props.disabled">{{ busy ? t.saving : (props.submitLabel ?? t.submit) }}</NqButton>
      <NqButton type="reset" variant="ghost" :disabled="props.disabled || busy">{{ t.reset }}</NqButton>
    </div>
  </form>
</template>
