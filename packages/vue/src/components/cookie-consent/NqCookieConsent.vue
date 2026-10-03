<script setup lang="ts">
import { ChevronDown, Cookie } from "lucide-vue-next";
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCollapsible, NqCollapsiblePanel, NqCollapsibleTrigger } from "../collapsible";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqSwitch } from "../switch";
import { acceptAll, consentSource, DEFAULT_CONSENT_CATEGORIES, normalizeConsent, rejectAll, type ConsentCategory, type ConsentSource, type ConsentState } from "./consent-model";
import { cookieConsentStrings, type CookieConsentLabels } from "./strings";

// A consent banner and its preferences dialog. Reject and Accept carry the same weight, categories start off unless
// required, and every choice goes through `onSave`. It holds no tracking code and sets no cookies of its own:
// `consentModeSignals` turns the result into Consent Mode values.
interface Props {
  /** What you ask about. Default: necessary, preferences, analytics, marketing. */
  categories?: ConsentCategory[];
  /** The saved choice. `null` or omitted means the visitor has not decided, so the banner shows. */
  consent?: ConsentState | null;
  /** Called with the full state when the visitor accepts, rejects or saves. Store it and apply it; this component does neither. */
  onSave: (consent: ConsentState, source: ConsentSource) => Promise<void | { error?: string }> | void | { error?: string };
  /** Controlled open state of the preferences dialog (`v-model:preferencesOpen`). Use it to reopen from a "Cookie settings" link. */
  preferencesOpen?: boolean;
  /** Link to your cookie policy. */
  policyHref?: string;
  /** `bottom` spans the width; `start` and `end` are corner cards. Default `bottom`. */
  position?: "bottom" | "start" | "end";
  /** Render in the page flow instead of fixed to the viewport (docs, previews). */
  inline?: boolean;
  labels?: Partial<Omit<CookieConsentLabels, "categories">> & { categories?: CookieConsentLabels["categories"] };
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { categories: () => DEFAULT_CONSENT_CATEGORIES, consent: undefined, preferencesOpen: undefined, policyHref: undefined, position: "bottom", inline: false, labels: undefined });
const emit = defineEmits<{ "update:preferencesOpen": [open: boolean] }>();
defineOptions({ inheritAttrs: false });

const nq = useNasaq();
const t = computed(() => {
  const base = cookieConsentStrings(nq.locale.value);
  return { ...base, ...props.labels, categories: { ...base.categories, ...props.labels?.categories } };
});

const saved = ref<ConsentState | null>(props.consent ?? null);
watch(
  () => props.consent,
  (c) => {
    if (c !== undefined) saved.value = c;
  },
);
const innerOpen = ref(false);
const open = computed(() => props.preferencesOpen ?? innerOpen.value);
function setOpen(next: boolean) {
  innerOpen.value = next;
  emit("update:preferencesOpen", next);
}
const pending = ref<ConsentSource | null>(null);
const error = ref<string | undefined>();
const draft = ref<ConsentState>(normalizeConsent(props.categories, saved.value));
watch(
  [open, () => props.categories, saved],
  () => {
    if (open.value) draft.value = normalizeConsent(props.categories, saved.value);
  },
  { flush: "sync" },
);

async function commit(state: ConsentState, source: ConsentSource) {
  pending.value = source;
  error.value = undefined;
  try {
    const result = await props.onSave(state, source);
    if (result?.error) {
      error.value = result.error;
      return;
    }
    saved.value = state;
    setOpen(false);
  } catch {
    error.value = t.value.failed;
  } finally {
    pending.value = null;
  }
}
const busy = computed(() => pending.value !== null);
const doReject = () => commit(rejectAll(props.categories), "reject-all");
const doAccept = () => commit(acceptAll(props.categories), "accept-all");
const doSave = () => commit(normalizeConsent(props.categories, draft.value), consentSource(props.categories, draft.value));

const uid = useId();
const label = (c: ConsentCategory) => c.label ?? t.value.categories[c.id]?.label ?? c.id;
const description = (c: ConsentCategory) => c.description ?? t.value.categories[c.id]?.description;
</script>

<template>
  <section
    v-if="saved === null"
    data-slot="cookie-consent"
    :data-position="position"
    :aria-label="t.banner"
    v-bind="$attrs"
    :class="
      cn(
        'z-50 flex flex-col gap-4 rounded-floating border border-border bg-popover p-4 text-popover-foreground shadow-floating sm:p-5',
        !inline && 'fixed bottom-4 inset-x-4',
        !inline && position === 'bottom' && 'mx-auto max-w-4xl sm:flex-row sm:items-center',
        !inline && position === 'start' && 'sm:end-auto sm:start-4 sm:max-w-sm',
        !inline && position === 'end' && 'sm:start-auto sm:end-4 sm:max-w-sm',
        inline && 'max-w-4xl',
        props.class,
      )
    "
  >
    <div class="flex min-w-0 flex-1 gap-3">
      <Cookie aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div class="flex min-w-0 flex-col gap-1">
        <h2 class="text-label text-foreground">{{ t.title }}</h2>
        <p class="text-body-sm text-muted-foreground">
          {{ t.description }}
          <template v-if="policyHref">
            {{ " " }}<a :href="policyHref" class="text-foreground underline underline-offset-4">{{ t.policy }}</a>
          </template>
        </p>
        <p v-if="error && !open" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
      </div>
    </div>
    <div data-slot="cookie-consent-actions" class="flex flex-col gap-2 sm:flex-row sm:shrink-0">
      <NqButton variant="ghost" :disabled="busy" @click="setOpen(true)">{{ t.customise }}</NqButton>
      <NqButton variant="secondary" :loading="pending === 'reject-all'" :disabled="busy && pending !== 'reject-all'" @click="doReject">{{ t.rejectAll }}</NqButton>
      <NqButton variant="secondary" :loading="pending === 'accept-all'" :disabled="busy && pending !== 'accept-all'" @click="doAccept">{{ t.acceptAll }}</NqButton>
    </div>
  </section>

  <NqDialog :open="open" @update:open="setOpen">
    <NqDialogContent class="max-w-xl" data-slot="cookie-preferences">
      <NqDialogHeader>
        <NqDialogTitle>{{ t.preferencesTitle }}</NqDialogTitle>
        <NqDialogDescription>{{ t.preferencesDescription }}</NqDialogDescription>
      </NqDialogHeader>
      <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
        <li v-for="(category, i) in categories" :key="category.id" data-slot="cookie-category" :data-category="category.id" class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 flex-col gap-0.5">
              <span :id="`${uid}-${i}-label`" class="text-label text-foreground">{{ label(category) }}</span>
              <span v-if="description(category)" :id="`${uid}-${i}-desc`" class="text-body-sm text-muted-foreground">{{ description(category) }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span v-if="category.required" class="text-caption text-muted-foreground">{{ t.alwaysOn }}</span>
              <NqSwitch
                :model-value="category.required ? true : Boolean(draft[category.id])"
                :disabled="category.required"
                :aria-labelledby="`${uid}-${i}-label`"
                :aria-describedby="description(category) ? `${uid}-${i}-desc` : undefined"
                @update:model-value="(next: boolean) => (draft = { ...draft, [category.id]: next })"
              />
            </div>
          </div>
          <NqCollapsible v-if="category.cookies?.length">
            <NqCollapsibleTrigger class="group inline-flex items-center gap-1 rounded-control text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">
              <ChevronDown aria-hidden="true" class="size-3.5 transition-transform group-data-panel-open:rotate-180" />
              <span class="group-data-panel-open:hidden">{{ t.showCookies.replace("{count}", String(category.cookies.length)) }}</span>
              <span class="hidden group-data-panel-open:inline">{{ t.hideCookies }}</span>
            </NqCollapsibleTrigger>
            <NqCollapsiblePanel>
              <div class="mt-2 overflow-x-auto rounded-control border border-border">
                <table class="w-full text-start text-caption">
                  <thead class="bg-muted text-muted-foreground">
                    <tr>
                      <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ t.colName }}</th>
                      <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ t.colPurpose }}</th>
                      <th scope="col" class="px-2.5 py-1.5 text-start font-medium">{{ t.colDuration }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr v-for="cookie in category.cookies" :key="cookie.name">
                      <td class="px-2.5 py-1.5 align-top"><bdi dir="ltr" class="font-mono text-foreground">{{ cookie.name }}</bdi></td>
                      <td class="px-2.5 py-1.5 align-top text-muted-foreground">{{ cookie.purpose }}</td>
                      <td class="px-2.5 py-1.5 align-top whitespace-nowrap text-muted-foreground">{{ cookie.duration }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </NqCollapsiblePanel>
          </NqCollapsible>
        </li>
      </ul>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <NqDialogFooter>
        <NqButton variant="secondary" :loading="pending === 'reject-all'" :disabled="busy && pending !== 'reject-all'" @click="doReject">{{ t.rejectAll }}</NqButton>
        <NqButton variant="secondary" :loading="pending === 'accept-all'" :disabled="busy && pending !== 'accept-all'" @click="doAccept">{{ t.acceptAll }}</NqButton>
        <NqButton variant="primary" :loading="pending === 'custom'" :disabled="busy && pending !== 'custom'" @click="doSave">{{ t.save }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
