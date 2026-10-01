<script setup lang="ts">
import { Check, Eye, EyeOff, Minus } from "lucide-vue-next";
import { computed, ref, useAttrs, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { useFieldControl } from "../field";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqMeter, type ProgressTone } from "../progress";
import { computePasswordRules, estimatePasswordStrength, type PasswordPolicy, type PasswordRule, type PasswordScore } from "./strength";

// A password field with a show/hide toggle and an optional strength meter. It is an input group, so it lines up with
// every other field. Set `autocomplete` to `new-password` when creating a password and `current-password` when signing in.
// Native input attributes (name, placeholder, autocomplete, id, required …) fall through to the <input>.
defineOptions({ inheritAttrs: false });

interface Props {
  /** Initial visibility when `v-model:visible` is not used. Default false. */
  defaultVisible?: boolean;
  /** Accessible name of the toggle. Default "Show password" / "إظهار كلمة المرور". It stays constant; `aria-pressed` carries the state. */
  toggleLabel?: string;
  /** Show the strength meter under the input. Default false. */
  showStrength?: boolean;
  /** Strength from 0 to 4. Omit to use the built-in estimator (`estimatePasswordStrength`). */
  score?: number;
  /** Name of the meter. Default "Password strength" / "قوة كلمة المرور". */
  strengthLabel?: string;
  /** Five words for scores 0 to 4. Default English or Arabic by the Nasaq locale. */
  strengthLevels?: readonly [string, string, string, string, string];
  /**
   * Show a checklist of requirements under the input. `true` uses the default policy (12 characters, upper, lower,
   * digit, symbol); pass a `PasswordPolicy` to change it, or your own `PasswordRule[]` with `ruleLabels`.
   */
  rules?: boolean | PasswordPolicy | readonly PasswordRule[];
  /** Text for each rule id. Overrides the built-in English and Arabic words; add one for every custom rule. */
  ruleLabels?: Record<string, string>;
  disabled?: boolean;
  /** Class for the outer wrapper. */
  class?: HTMLAttributes["class"];
  /** Class for the `<input>`. */
  inputClass?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultVisible: false,
  toggleLabel: undefined,
  showStrength: false,
  score: undefined,
  strengthLabel: undefined,
  strengthLevels: undefined,
  rules: undefined,
  ruleLabels: undefined,
  disabled: undefined,
});
const model = defineModel<string>({ default: "" });
const visible = defineModel<boolean | undefined>("visible", { default: undefined });
const t = useT();
const attrs = useAttrs();
// Label, description, error and invalid wire up when it sits in a NqField.
const field = useFieldControl(() => (attrs.id as string | undefined));
const isDisabled = computed(() => props.disabled ?? (field.disabled.value || undefined));

const TONES: ProgressTone[] = ["danger", "danger", "warning", "info", "success"];
const levelWords = computed(
  () => props.strengthLevels ?? [t("Very weak", "ضعيفة جدًا"), t("Weak", "ضعيفة"), t("Fair", "مقبولة"), t("Good", "جيدة"), t("Strong", "قوية")],
);

// `visible` is controlled when the parent passes it, else the component keeps its own state.
const own = ref(props.defaultVisible);
const shownText = computed(() => visible.value ?? own.value);
const toggle = () => {
  const next = !shownText.value;
  own.value = next;
  visible.value = next;
};

const shown = computed(() => Math.min(4, Math.max(0, Math.round(props.score ?? estimatePasswordStrength(model.value)))) as PasswordScore);
const hasValue = computed(() => model.value.length > 0);
const checklist = computed<readonly PasswordRule[] | null>(() => {
  const r = props.rules;
  if (!r) return null;
  if (Array.isArray(r)) return r as readonly PasswordRule[];
  return computePasswordRules(model.value, r === true ? {} : (r as PasswordPolicy));
});
const ruleText = (r: PasswordRule) => {
  const custom = props.ruleLabels?.[r.id];
  if (custom) return custom;
  const min = r.min ?? 12;
  switch (r.id) {
    case "length":
      return t(`At least ${min} characters`, `${min} حرفًا على الأقل`);
    case "upper":
      return t("An uppercase letter", "حرف كبير");
    case "lower":
      return t("A lowercase letter", "حرف صغير");
    case "digit":
      return t("A number", "رقم");
    case "symbol":
      return t("A symbol", "رمز");
    default:
      return r.id;
  }
};
</script>

<template>
  <div data-slot="password-input" :class="cn('flex w-full flex-col gap-2', props.class)">
    <NqInputGroup>
      <NqInputGroupInput
        v-bind="$attrs"
        v-model="model"
        :type="shownText ? 'text' : 'password'"
        :id="field.id.value"
        :name="(attrs.name as string | undefined) ?? field.name.value"
        :disabled="isDisabled"
        :aria-describedby="field.describedBy.value"
        :aria-invalid="field.invalid.value || undefined"
        :data-invalid="field.invalid.value ? '' : undefined"
        autocapitalize="none"
        autocorrect="off"
        :spellcheck="false"
        :class="props.inputClass"
      />
      <NqInputGroupAddon align="end" class="pe-1.5">
        <NqButton
          type="button"
          variant="ghost"
          size="icon-sm"
          data-slot="password-input-toggle"
          :aria-label="props.toggleLabel ?? t('Show password', 'إظهار كلمة المرور')"
          :aria-pressed="shownText"
          :disabled="isDisabled"
          @click="toggle"
        >
          <EyeOff v-if="shownText" aria-hidden="true" />
          <Eye v-else aria-hidden="true" />
        </NqButton>
      </NqInputGroupAddon>
    </NqInputGroup>
    <div v-if="props.showStrength" data-slot="password-input-strength" :data-score="shown" :class="cn('flex flex-col gap-1', !hasValue && props.score === undefined && 'opacity-60')">
      <NqMeter
        :value="hasValue || props.score !== undefined ? shown : 0"
        :min="0"
        :max="4"
        size="sm"
        :tone="TONES[shown]"
        :aria-label="props.strengthLabel ?? t('Password strength', 'قوة كلمة المرور')"
        :format="{ style: 'decimal' }"
      />
      <div class="flex items-baseline justify-between gap-3 text-caption text-muted-foreground">
        <span>{{ props.strengthLabel ?? t("Password strength", "قوة كلمة المرور") }}</span>
        <span aria-live="polite" class="text-foreground">{{ hasValue || props.score !== undefined ? levelWords[shown] : "" }}</span>
      </div>
    </div>
    <ul v-if="checklist" data-slot="password-input-rules" :aria-label="t('Password requirements', 'متطلبات كلمة المرور')" class="grid gap-1 sm:grid-cols-2">
      <li
        v-for="r in checklist"
        :key="r.id"
        :data-met="r.met || undefined"
        :class="cn('flex items-center gap-1.5 text-caption transition-colors duration-150 ease-nq', r.met ? 'text-nq-success-text' : 'text-muted-foreground')"
      >
        <Check v-if="r.met" aria-hidden="true" class="size-3.5 shrink-0" />
        <Minus v-else aria-hidden="true" class="size-3.5 shrink-0" />
        <span>{{ ruleText(r) }}</span>
        <span class="sr-only">, {{ r.met ? t("met", "مستوفى") : t("not met", "غير مستوفى") }}</span>
      </li>
    </ul>
  </div>
</template>
