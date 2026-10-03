<script setup lang="ts">
import { computed, nextTick, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from "../input-group";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger } from "../select";
import {
  clampMoney,
  convertMinorDecimals,
  currencyDecimals,
  currencySymbol,
  editableMoneyText,
  formatMinor,
  minorToPlain,
  moneyInRange,
  parseMoney,
  sanitizeMoneyText,
  symbolSide,
  type CurrencyDigits,
  type CurrencyOverflow,
} from "./currency-input-logic";

// A money field. The value is an integer in minor units, so nothing rounds twice; the currency sets the decimals;
// digits typed or pasted in any set (1250.5, ١٢٥٠٫٥) give the same amount. The symbol sits where the locale puts
// it. While focused the field shows the plain number, and on blur it groups and pads it ("1,250.50").
interface Props {
  /** The amount in minor units (cents, halalas, fils): 1999 is 19.99 USD. `null` is empty. Use `v-model`. */
  modelValue?: number | null;
  defaultValue?: number | null;
  /** ISO 4217 code. It sets the decimals (JPY 0, USD 2, KWD 3). Default USD, or SAR in Arabic. */
  currency?: string;
  /** Show a currency picker with these codes. Listen to `@currency-change`. The amount keeps its value when decimals differ. */
  currencies?: readonly string[];
  /** Lowest and highest allowed amount, in minor units. Outside them the field is marked invalid. */
  min?: number;
  max?: number;
  /** Pull an out-of-range amount back to `min` or `max` when the field loses focus. Default false. */
  clampOnBlur?: boolean;
  allowNegative?: boolean;
  /** Digit set shown: "latn" (0-9, the Nasaq default) or "arab" (٠-٩). Either set is accepted when typing. */
  numberingSystem?: CurrencyDigits;
  /** Locale for separators and symbol placement. Default the Nasaq locale. */
  locale?: string;
  /** How a pasted amount with too many decimals is handled. Default "round". */
  overflow?: CurrencyOverflow;
  /** The symbol next to the figure: "symbol" ($), "code" (USD) or "none". Default "symbol". */
  symbol?: "symbol" | "code" | "none";
  /** Keep ".00" on whole amounts when the field is not focused. Default true. */
  fixedDecimals?: boolean;
  /** Arrow keys change the amount by this many minor units; Shift multiplies by 10. Default one major unit. */
  step?: number;
  /** Form field name: a hidden input carries the amount in minor units ("1999"), "" when empty. */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  id?: string;
  required?: boolean;
  ariaLabel?: string;
  /** Override the built-in strings. */
  labels?: Partial<{ currency: string; outOfRange: string }>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
  currency: undefined,
  currencies: undefined,
  min: undefined,
  max: undefined,
  clampOnBlur: false,
  allowNegative: false,
  numberingSystem: "latn",
  locale: undefined,
  overflow: "round",
  symbol: "symbol",
  fixedDecimals: true,
  step: undefined,
  name: undefined,
  placeholder: undefined,
  id: undefined,
  ariaLabel: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [minor: number | null];
  /** The picker chose another currency, with the amount converted to its decimals. */
  currencyChange: [currency: string, minor: number | null];
}>();

const STRINGS = {
  en: { currency: "Currency", outOfRange: "Amount out of range" },
  ar: { currency: "العملة", outOfRange: "المبلغ خارج النطاق" },
} as const;

const nasaq = useNasaq();
const currency = useCurrency(() => props.currency);
const locale = computed(() => props.locale ?? nasaq.locale.value ?? "en");
const t = computed(() => ({ ...STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const uid = useId();
const decimals = computed(() => currencyDecimals(currency.value));
const inner = ref<number | null>(props.defaultValue);
const minor = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const text = ref("");
const focused = ref(false);
const group = ref<{ $el: HTMLElement } | null>(null);

const plainOf = (m: number | null) => (m === null ? "" : minorToPlain(m, decimals.value));
const shown = computed(() =>
  focused.value
    ? text.value
    : minor.value === null
      ? ""
      : formatMinor(minor.value, currency.value, locale.value, { digits: props.numberingSystem, fixed: props.fixedDecimals }),
);
const out = computed(() => !moneyInRange(minor.value, props.min, props.max));
const isInvalid = computed(() => props.invalid || out.value);
const side = computed(() => symbolSide(currency.value, locale.value));
const mark = computed(() =>
  props.symbol === "code" ? currency.value.toUpperCase() : props.symbol === "symbol" ? currencySymbol(currency.value, locale.value) : null,
);
const hint = computed(
  () =>
    props.placeholder ??
    formatMinor(0, decimals.value === 0 ? "JPY" : decimals.value === 3 ? "KWD" : "USD", locale.value, { digits: props.numberingSystem }),
);
const picker = computed(() => Boolean(props.currencies && props.currencies.length > 1));

function commit(next: number | null) {
  inner.value = next;
  emit("update:modelValue", next);
}
function inputEl() {
  return group.value?.$el as HTMLInputElement | undefined;
}
/** A refused keystroke leaves `shown` unchanged, so Vue would not touch the DOM; put the old text back. */
function resync() {
  void nextTick(() => {
    const el = inputEl();
    if (el && el.value !== shown.value) el.value = shown.value;
  });
}
function edit(raw: string) {
  const clean = sanitizeMoneyText(raw, decimals.value, { locale: locale.value, allowNegative: props.allowNegative });
  if (clean) {
    text.value = editableMoneyText(clean.plain, locale.value, props.numberingSystem);
    if (clean.minor !== minor.value) commit(clean.minor);
  }
  resync();
}
function setAmount(next: number | null) {
  text.value = next === null ? "" : editableMoneyText(plainOf(next), locale.value, props.numberingSystem);
  commit(next);
}
function onPaste(e: ClipboardEvent) {
  const pasted = e.clipboardData?.getData("text") ?? "";
  const parsed = parseMoney(pasted, { currency: currency.value, locale: locale.value, paste: true, overflow: props.overflow });
  if (parsed === null && !/[0-9٠-٩۰-۹]/.test(pasted)) return;
  e.preventDefault();
  if (parsed !== null) setAmount(!props.allowNegative && parsed < 0 ? -parsed : parsed);
  resync();
}
function onKeydown(e: KeyboardEvent) {
  if ((e.key !== "ArrowUp" && e.key !== "ArrowDown") || props.readOnly) return;
  e.preventDefault();
  const unit = (props.step ?? 10 ** decimals.value) * (e.shiftKey ? 10 : 1);
  const next = (minor.value ?? 0) + (e.key === "ArrowUp" ? unit : -unit);
  if (!Number.isSafeInteger(next) || (!props.allowNegative && next < 0)) return;
  setAmount(props.min !== undefined || props.max !== undefined ? clampMoney(next, props.min, props.max) : next);
}
function onFocus() {
  text.value = minor.value === null ? "" : editableMoneyText(plainOf(minor.value), locale.value, props.numberingSystem);
  focused.value = true;
}
function onBlur() {
  focused.value = false;
  if (props.clampOnBlur && minor.value !== null && !moneyInRange(minor.value, props.min, props.max)) commit(clampMoney(minor.value, props.min, props.max));
}
function onCurrency(next: string | number | null) {
  if (typeof next !== "string" || next === currency.value) return;
  const converted = minor.value === null ? null : convertMinorDecimals(minor.value, currency.value, next);
  inner.value = converted;
  text.value = "";
  emit("currencyChange", next, converted);
}
</script>

<template>
  <div data-slot="currency-input" :data-currency="currency" :class="cn('flex w-full min-w-0 flex-col gap-1', props.class)">
    <NqInputGroup :data-invalid="isInvalid ? '' : undefined" :class="cn(picker && 'pe-0')">
      <NqInputGroupAddon v-if="mark" :align="side" data-slot="currency-symbol">
        <NqInputGroupText>
          <bdi dir="ltr">{{ mark }}</bdi>
        </NqInputGroupText>
      </NqInputGroupAddon>
      <NqInputGroupInput
        :id="props.id"
        ref="group"
        ltr
        :inputmode="decimals > 0 ? 'decimal' : 'numeric'"
        autocomplete="off"
        :spellcheck="false"
        :model-value="shown"
        :placeholder="hint"
        :disabled="props.disabled"
        :readonly="props.readOnly"
        :required="props.required"
        :aria-label="props.ariaLabel"
        :aria-invalid="isInvalid || undefined"
        :aria-describedby="out ? `${uid}-range` : undefined"
        class="tabular-nums"
        @input="edit(($event.target as HTMLInputElement).value)"
        @focus="onFocus"
        @blur="onBlur"
        @paste="onPaste"
        @keydown="onKeydown"
      />
      <NqSelect v-if="picker" :model-value="currency" :disabled="props.disabled || props.readOnly" @update:model-value="onCurrency">
        <NqSelectTrigger
          :aria-label="t.currency"
          class="h-full w-auto min-w-20 rounded-none border-0 border-s bg-nq-surface-soft focus-visible:outline-offset-[-2px]"
        >
          <span data-slot="select-value" class="min-w-0 flex-1 truncate text-start"><bdi dir="ltr">{{ currency }}</bdi></span>
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="c in props.currencies" :key="c" :value="c">
            <bdi dir="ltr">{{ c }}</bdi>
          </NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </NqInputGroup>
    <span v-if="out" :id="`${uid}-range`" class="sr-only">{{ t.outOfRange }}</span>
    <input v-if="props.name" type="hidden" :name="props.name" :value="minor === null ? '' : String(minor)" />
  </div>
</template>
