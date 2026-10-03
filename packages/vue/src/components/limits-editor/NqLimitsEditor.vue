<script setup lang="ts">
import { Save, Undo2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { formatNumber } from "../numeric";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { changedKeys, effectiveLimit, hasErrors, parseNumberInput, ruleOf, validateRules, type LimitErrors, type LimitField, type LimitMode, type LimitRule, type LimitRules } from "./limits-math";

// A per-resource limits table as a form: each resource is Limit (a number), Unlimited or Inherit, with optional price
// and overage price, and per-key rate and spend limits. Validates before saving, tracks what changed, and shows what
// Inherit resolves to. It keeps the rules; your `onSave` persists them.
const STRINGS = {
  en: {
    limits: "Limits",
    mode: "Limit type",
    limit: "Limit",
    unlimited: "Unlimited",
    inherit: "Inherit",
    value: "Limit",
    inheritedValue: (v: string) => `Inherits ${v}`,
    inheritedUnlimited: "Inherits unlimited",
    inheritedNone: "Inherits the default",
    price: "Price",
    overage: "Overage price",
    overageHint: "per extra unit",
    rateLimit: "Rate limit",
    rateHint: "requests per minute",
    spendLimit: "Spend cap",
    spendHint: "per key per month",
    required: "Enter a limit, or choose Unlimited or Inherit.",
    invalid: "Enter zero or a positive number.",
    dirty: (n: string) => (n === "1" ? "1 unsaved change" : `${n} unsaved changes`),
    saved: "Saved",
    save: "Save limits",
    reset: "Discard changes",
    failed: "The limits could not be saved. Try again.",
    fixErrors: "Fix the highlighted fields to save.",
    groupLabel: (name: string) => `${name} limits`,
  },
  ar: {
    limits: "الحدود",
    mode: "نوع الحد",
    limit: "حد",
    unlimited: "غير محدود",
    inherit: "وراثة",
    value: "الحد",
    inheritedValue: (v: string) => `يرث ${v}`,
    inheritedUnlimited: "يرث غير محدود",
    inheritedNone: "يرث القيمة الافتراضية",
    price: "السعر",
    overage: "سعر التجاوز",
    overageHint: "لكل وحدة إضافية",
    rateLimit: "حد المعدل",
    rateHint: "طلب في الدقيقة",
    spendLimit: "سقف الإنفاق",
    spendHint: "لكل مفتاح شهريًا",
    required: "أدخل حدًا، أو اختر غير محدود أو وراثة.",
    invalid: "أدخل صفرًا أو رقمًا موجبًا.",
    dirty: (n: string) => (n === "1" ? "تغيير واحد غير محفوظ" : `${n} تغييرات غير محفوظة`),
    saved: "تم الحفظ",
    save: "حفظ الحدود",
    reset: "تجاهل التغييرات",
    failed: "تعذّر حفظ الحدود. حاول مرة أخرى.",
    fixErrors: "صحّح الحقول المظلّلة لتتمكن من الحفظ.",
    groupLabel: (name: string) => `حدود ${name}`,
  },
};
type Strings = typeof STRINGS.en;

interface LimitResource {
  /** Stable key of the resource: "seats", "api_calls". */
  key: string;
  /** Localised name. */
  label: string;
  description?: string;
  /** Noun after the limit: "seats", "GB". Localise it. */
  unit?: string;
}

interface Props {
  resources: readonly LimitResource[];
  /** Controlled rules, keyed by resource key. A missing key means Inherit. Use `v-model`. */
  modelValue?: LimitRules;
  defaultValue?: LimitRules;
  /** What Inherit resolves to, per key: a number, or `null` for unlimited. Shown on the row. */
  inherited?: Record<string, number | null>;
  /** Show the price and overage price per resource. */
  showPricing?: boolean;
  /** Show the per-key rate limit and spend cap. */
  showKeyLimits?: boolean;
  /** ISO 4217 code for prices and the spend cap. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Adds the Save and Discard footer. Return `{ error }` to show a failure. */
  onSave?: (rules: LimitRules) => Promise<void | { error?: string }> | void | { error?: string };
  disabled?: boolean;
  labels?: Partial<Strings>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  inherited: undefined,
  showPricing: false,
  showKeyLimits: false,
  currency: undefined,
  onSave: undefined,
  disabled: false,
  labels: undefined,
});
const emit = defineEmits<{ "update:modelValue": [rules: LimitRules] }>();

const MODES: readonly LimitMode[] = ["limit", "unlimited", "inherit"];
const nasaq = useNasaq();
const currency = useCurrency(() => props.currency);
const locale = computed(() => nasaq.locale.value ?? "en");
const t = computed<Strings>(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const inner = ref<LimitRules>(props.defaultValue ?? props.modelValue ?? {});
const rules = computed(() => props.modelValue ?? inner.value);
const baseline = ref<LimitRules>(rules.value);
const submitted = ref(false);
const busy = ref(false);
const failure = ref<string | null>(null);
const justSaved = ref(false);

const keys = computed(() => props.resources.map((r) => r.key));
const fields = computed<LimitField[]>(() => ["value", ...(props.showPricing ? (["price", "overage"] as const) : []), ...(props.showKeyLimits ? (["rateLimit", "spendLimit"] as const) : [])]);
const errors = computed<LimitErrors>(() => validateRules(rules.value, keys.value, fields.value));
const dirty = computed(() => changedKeys(baseline.value, rules.value, keys.value));

function set(key: string, patch: Partial<LimitRule>) {
  const next = { ...rules.value, [key]: { ...ruleOf(rules.value, key), ...patch } };
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
  justSaved.value = false;
  failure.value = null;
}
function replaceAll(next: LimitRules) {
  if (props.modelValue === undefined) inner.value = next;
  emit("update:modelValue", next);
}

async function submit() {
  submitted.value = true;
  if (hasErrors(errors.value) || !props.onSave) return;
  busy.value = true;
  failure.value = null;
  let error: string | undefined;
  try {
    const result = await props.onSave(rules.value);
    if (result && typeof result === "object" && result.error) error = result.error;
  } catch (e) {
    error = e instanceof Error && e.message ? e.message : t.value.failed;
  }
  busy.value = false;
  if (error) {
    failure.value = error;
    return;
  }
  baseline.value = rules.value;
  submitted.value = false;
  justSaved.value = true;
}
function discard() {
  replaceAll(baseline.value);
  submitted.value = false;
  failure.value = null;
}

const num = (n: number) => formatNumber(n, locale.value);
const errorText = (code?: "required" | "invalid") => (code === "required" ? t.value.required : code === "invalid" ? t.value.invalid : undefined);
const errorOf = (key: string, field: LimitField) => (submitted.value ? errorText(errors.value[key]?.[field]) : undefined);
const shownValue = (rule: LimitRule, field: LimitField) => {
  const v = rule[field];
  return v === undefined || Number.isNaN(v) ? "" : v;
};
const inheritText = (res: LimitResource, rule: LimitRule) => {
  if (rule.mode !== "inherit") return null;
  const effective = effectiveLimit(rule, props.inherited?.[res.key]);
  if (effective === undefined) return t.value.inheritedNone;
  if (effective === null) return t.value.inheritedUnlimited;
  return t.value.inheritedValue(res.unit ? `${num(effective)} ${res.unit}` : num(effective));
};

interface NumberField {
  field: LimitField;
  label: string;
  hint?: string;
}
const extraFields = (res: LimitResource): NumberField[] => {
  const out: NumberField[] = [];
  if (props.showPricing) {
    out.push({ field: "price", label: `${t.value.price} (${currency.value})` });
    out.push({ field: "overage", label: `${t.value.overage} (${currency.value})`, hint: t.value.overageHint });
  }
  if (props.showKeyLimits) {
    out.push({ field: "rateLimit", label: t.value.rateLimit, hint: t.value.rateHint });
    out.push({ field: "spendLimit", label: `${t.value.spendLimit} (${currency.value})`, hint: t.value.spendHint });
  }
  void res;
  return out;
};
function onMode(key: string, v: string[]) {
  const mode = v[0] as LimitMode | undefined;
  if (mode && MODES.includes(mode)) set(key, { mode });
}
</script>

<template>
  <form data-slot="limits-editor" novalidate :class="cn('flex flex-col gap-4', props.class)" @submit.prevent="submit">
    <ul data-slot="limits-editor-list" :aria-label="t.limits" class="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
      <li
        v-for="res in props.resources"
        :key="res.key"
        data-slot="limits-editor-row"
        :data-key="res.key"
        :data-mode="ruleOf(rules, res.key).mode"
        :data-changed="dirty.includes(res.key) ? '' : undefined"
        class="flex flex-col gap-3 p-4"
      >
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div class="flex min-w-0 flex-col">
            <span class="flex items-center gap-2 text-label text-foreground">
              {{ res.label }}
              <span v-if="dirty.includes(res.key)" aria-hidden="true" class="size-1.5 rounded-full bg-primary" />
            </span>
            <span v-if="res.description" class="text-caption text-muted-foreground">{{ res.description }}</span>
          </div>
          <NqToggleGroup :aria-label="t.groupLabel(res.label)" :model-value="[ruleOf(rules, res.key).mode]" :disabled="props.disabled" @update:model-value="onMode(res.key, $event)">
            <NqToggle v-for="m in MODES" :key="m" :value="m">{{ t[m] }}</NqToggle>
          </NqToggleGroup>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NqField v-if="ruleOf(rules, res.key).mode === 'limit'" :invalid="!!errorOf(res.key, 'value')" :disabled="props.disabled" class="min-w-0">
            <NqFieldLabel>{{ res.unit ? `${t.value} (${res.unit})` : t.value }}</NqFieldLabel>
            <NqInput
              ltr
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              :model-value="shownValue(ruleOf(rules, res.key), 'value')"
              @input="set(res.key, { value: parseNumberInput(($event.target as HTMLInputElement).value) })"
            />
            <NqFieldError :match="!!errorOf(res.key, 'value')">{{ errorOf(res.key, "value") }}</NqFieldError>
          </NqField>
          <div v-else data-slot="limits-editor-effective" class="flex min-w-0 flex-col justify-end gap-1 pb-2 text-body-sm text-muted-foreground">
            <NqBadge v-if="ruleOf(rules, res.key).mode === 'unlimited'" variant="neutral" class="w-fit">{{ t.unlimited }}</NqBadge>
            <bdi v-else>{{ inheritText(res, ruleOf(rules, res.key)) }}</bdi>
          </div>
          <NqField v-for="f in extraFields(res)" :key="f.field" :invalid="!!errorOf(res.key, f.field)" :disabled="props.disabled" class="min-w-0">
            <NqFieldLabel>{{ f.label }}</NqFieldLabel>
            <NqInput
              ltr
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              :model-value="shownValue(ruleOf(rules, res.key), f.field)"
              @input="set(res.key, { [f.field]: parseNumberInput(($event.target as HTMLInputElement).value) })"
            />
            <span v-if="f.hint" class="text-caption text-muted-foreground">{{ f.hint }}</span>
            <NqFieldError :match="!!errorOf(res.key, f.field)">{{ errorOf(res.key, f.field) }}</NqFieldError>
          </NqField>
        </div>
      </li>
    </ul>
    <NqAlert v-if="failure" tone="danger">{{ failure || t.failed }}</NqAlert>
    <NqAlert v-else-if="submitted && hasErrors(errors)" tone="warning">{{ t.fixErrors }}</NqAlert>
    <div v-if="props.onSave" data-slot="limits-editor-footer" class="flex flex-wrap items-center justify-end gap-2">
      <span role="status" class="me-auto text-body-sm text-muted-foreground">{{ dirty.length > 0 ? t.dirty(num(dirty.length)) : justSaved ? t.saved : "" }}</span>
      <NqButton type="button" variant="ghost" :disabled="dirty.length === 0 || busy || props.disabled" @click="discard">
        <Undo2 />
        {{ t.reset }}
      </NqButton>
      <NqButton type="submit" variant="primary" :loading="busy" :disabled="dirty.length === 0 || props.disabled">
        <Save />
        {{ t.save }}
      </NqButton>
    </div>
  </form>
</template>
