<script setup lang="ts">
import { CircleCheck, Star } from "lucide-vue-next";
import { nextTick, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { formatNumber } from "../numeric";
import { FORM_HONEYPOT } from "../public-form";
import { useTestimonialStrings, type TestimonialLabels } from "./labels";
import { TESTIMONIAL_QUOTE_MAX, validateTestimonial, type TestimonialSubmission } from "./testimonials-logic";

// A public form for people to leave a testimonial: name, words, star rating, consent, a honeypot and a thank-you.
// `onSubmit` gets the checked, trimmed submission; throw to keep the form. Bots (honeypot) never reach it.
interface Props {
  onSubmit?: (submission: TestimonialSubmission) => void | Promise<void>;
  /** Ask for the rating. Default true. */
  askRating?: boolean;
  /** Make the rating mandatory. Default false. */
  requireRating?: boolean;
  /** Ask for an email. Default false. */
  askEmail?: boolean;
  /** Ask for role and company. Default true. */
  askRole?: boolean;
  /** Ask for permission to show the words publicly. Default true, and required. */
  requireConsent?: boolean;
  /** Thank-you text after sending. */
  thanks?: string;
  locale?: string;
  labels?: TestimonialLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onSubmit: undefined, askRating: true, requireRating: false, askEmail: false, askRole: true, requireConsent: true, thanks: undefined, locale: undefined, labels: undefined });
defineOptions({ inheritAttrs: false });

const { locale, t } = useTestimonialStrings(
  () => props.locale,
  () => props.labels,
);
const blank = (): TestimonialSubmission => ({ name: "", role: "", company: "", email: "", quote: "", rating: null, consent: false });
const formEl = ref<HTMLFormElement | null>(null);
const v = ref<TestimonialSubmission>(blank());
const trap = ref("");
const errors = ref<ReturnType<typeof validateTestimonial>>({});
const busy = ref(false);
const done = ref(false);

function set<K extends keyof TestimonialSubmission>(key: K, value: TestimonialSubmission[K]) {
  v.value = { ...v.value, [key]: value };
  if (key in errors.value) errors.value = Object.fromEntries(Object.entries(errors.value).filter(([k]) => k !== key));
}
const str = (x: string | number | undefined) => String(x ?? "");

async function submit() {
  const found = validateTestimonial(v.value, { requireConsent: props.requireConsent, requireRating: props.requireRating });
  errors.value = found;
  const first = (["name", "quote", "email", "rating", "consent"] as const).find((k) => found[k]);
  if (first) {
    await nextTick();
    formEl.value?.querySelector<HTMLElement>(`[data-field="${first}"] :is(input, textarea, button):not([type=hidden])`)?.focus();
    return;
  }
  if (trap.value.trim() !== "") {
    done.value = true;
    return;
  }
  busy.value = true;
  try {
    const s = v.value;
    await props.onSubmit?.({ ...s, name: s.name.trim(), role: s.role.trim(), company: s.company.trim(), email: s.email.trim(), quote: s.quote.trim() });
    done.value = true;
  } finally {
    busy.value = false;
  }
}
function again() {
  v.value = blank();
  done.value = false;
}
</script>

<template>
  <div v-if="done" data-slot="testimonial-form" data-state="done" role="status" :class="cn('flex flex-col items-start gap-3 rounded-card border border-border bg-card p-5', props.class)">
    <CircleCheck aria-hidden="true" class="size-6 text-nq-success" />
    <p class="text-body">{{ props.thanks ?? t.thanks }}</p>
    <NqButton type="button" variant="link" class="px-0" @click="again">{{ t.another }}</NqButton>
  </div>
  <form v-else ref="formEl" data-slot="testimonial-form" novalidate :class="cn('relative flex w-full flex-col gap-4', props.class)" v-bind="$attrs" @submit.prevent="submit">
    <NqField :invalid="Boolean(errors.name)" data-field="name">
      <NqFieldLabel>{{ t.name }}</NqFieldLabel>
      <NqInput :model-value="v.name" autocomplete="name" @update:model-value="(x) => set('name', str(x))" />
      <NqFieldError v-if="errors.name" match>{{ t.errors[errors.name] }}</NqFieldError>
    </NqField>
    <div v-if="props.askRole" class="grid gap-4 sm:grid-cols-2">
      <NqField>
        <NqFieldLabel>{{ t.role }}</NqFieldLabel>
        <NqInput :model-value="v.role" @update:model-value="(x) => set('role', str(x))" />
      </NqField>
      <NqField>
        <NqFieldLabel>{{ t.company }}</NqFieldLabel>
        <NqInput :model-value="v.company" autocomplete="organization" @update:model-value="(x) => set('company', str(x))" />
      </NqField>
    </div>
    <NqField v-if="props.askEmail" :invalid="Boolean(errors.email)" data-field="email">
      <NqFieldLabel>{{ t.email }}</NqFieldLabel>
      <NqInput ltr inputmode="email" autocomplete="email" :model-value="v.email" @update:model-value="(x) => set('email', str(x))" />
      <NqFieldDescription>{{ t.emailHint }}</NqFieldDescription>
      <NqFieldError v-if="errors.email" match>{{ t.errors[errors.email] }}</NqFieldError>
    </NqField>
    <NqField v-if="props.askRating" :invalid="Boolean(errors.rating)" data-field="rating">
      <NqFieldLabel>{{ t.rating }}</NqFieldLabel>
      <div role="group" :aria-label="t.rating" class="flex gap-1">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          :aria-label="t.stars(n)"
          :aria-pressed="v.rating === n"
          class="rounded-control p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
          @click="set('rating', v.rating === n ? null : n)"
        >
          <Star aria-hidden="true" :class="cn('size-6 transition-colors', v.rating !== null && n <= v.rating ? 'fill-nq-accent text-nq-accent' : 'text-nq-line-strong')" />
        </button>
      </div>
      <NqFieldError v-if="errors.rating" match>{{ t.errors[errors.rating] }}</NqFieldError>
    </NqField>
    <NqField :invalid="Boolean(errors.quote)" data-field="quote">
      <NqFieldLabel>{{ t.quote }}</NqFieldLabel>
      <NqTextarea :rows="5" :model-value="v.quote" @update:model-value="(x) => set('quote', str(x))" />
      <NqFieldDescription>
        <span class="tabular-nums">{{ formatNumber(Array.from(v.quote).length, locale) }}</span> / {{ t.quoteHint(formatNumber(TESTIMONIAL_QUOTE_MAX, locale)) }}
      </NqFieldDescription>
      <NqFieldError v-if="errors.quote" match>{{ t.errors[errors.quote] }}</NqFieldError>
    </NqField>
    <NqField v-if="props.requireConsent" :invalid="Boolean(errors.consent)" data-field="consent">
      <label class="flex items-start gap-2 text-body">
        <NqCheckbox :model-value="v.consent" class="mt-1" @update:model-value="(c: boolean) => set('consent', c === true)" />
        <span>{{ t.consent }}</span>
      </label>
      <NqFieldError v-if="errors.consent" match>{{ t.errors.consent }}</NqFieldError>
    </NqField>
    <div aria-hidden="true" class="pointer-events-none absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
      <label>
        {{ t.honeypot }}
        <input v-model="trap" type="text" :name="FORM_HONEYPOT" tabindex="-1" autocomplete="off" />
      </label>
    </div>
    <div>
      <NqButton type="submit" :loading="busy">{{ t.submit }}</NqButton>
    </div>
  </form>
</template>
