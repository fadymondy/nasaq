<script setup lang="ts">
import { Languages, RotateCcw } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqSpinner } from "../spinner";
import NqUserText from "./NqUserText.vue";
import { fill, useStrings, type TextUtilitiesLabels } from "./strings";

// A message with a toggle between the original and its translation. The two versions each carry their own `lang` and
// direction, the translation is fetched once and kept, and failures offer a retry.
export type TranslateResult = string | { text?: string; error?: string } | void;

interface Props {
  /** The text as written. */
  original: string;
  /** A translation you already have. Without it, `onTranslate` is called on the first toggle. */
  translation?: string;
  /** BCP 47 code of the original, for `lang` and the "Translated from" note. */
  sourceLang: string;
  /** BCP 47 code of the translation. Default: the Nasaq locale. */
  targetLang?: string;
  /** Fetch a translation. Resolve with the text, or `{ error }` to show the failure with a retry. */
  onTranslate?: (text: string, target: string) => Promise<TranslateResult>;
  /** Start on the translation. Default false. */
  defaultShowTranslation?: boolean;
  /** Clamp both versions to this many lines. */
  lines?: number;
  linkify?: boolean;
  labels?: TextUtilitiesLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  translation: undefined,
  targetLang: undefined,
  onTranslate: undefined,
  defaultShowTranslation: false,
  lines: undefined,
  linkify: false,
  labels: undefined,
});
const { locale, t } = useStrings(() => props.labels);
const target = computed(() => props.targetLang ?? locale.value);
const translated = ref<string | undefined>(props.translation);
const show = ref(props.defaultShowTranslation && props.translation !== undefined);
const pending = ref(false);
const error = ref<string>();
let alive = true;
onBeforeUnmount(() => (alive = false));
watch(
  () => props.translation,
  (v) => (translated.value = v),
);

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames([locale.value], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

async function load() {
  if (!props.onTranslate) return;
  pending.value = true;
  error.value = undefined;
  try {
    const result = await props.onTranslate(props.original, target.value);
    if (!alive) return;
    const text = typeof result === "string" ? result : result?.text;
    const failure = typeof result === "object" && result ? result.error : undefined;
    if (failure || text === undefined) error.value = failure ?? t.value.translateFailed;
    else {
      translated.value = text;
      show.value = true;
    }
  } catch {
    if (alive) error.value = t.value.translateFailed;
  } finally {
    if (alive) pending.value = false;
  }
}

function toggle() {
  if (show.value) {
    show.value = false;
    return;
  }
  if (translated.value !== undefined) {
    show.value = true;
    return;
  }
  void load();
}

const canToggle = computed(() => translated.value !== undefined || Boolean(props.onTranslate));
const showingTranslation = computed(() => show.value && translated.value !== undefined);
</script>

<template>
  <div data-slot="translatable-text" :data-showing="showingTranslation ? 'translation' : 'original'" :class="cn('flex min-w-0 flex-col gap-1.5', props.class)">
    <NqUserText block :lang="showingTranslation ? target : props.sourceLang" :lines="props.lines" :linkify="props.linkify" class="text-body text-foreground">{{
      showingTranslation ? translated : props.original
    }}</NqUserText>
    <div v-if="canToggle" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
      <button
        type="button"
        :disabled="pending"
        :aria-pressed="showingTranslation"
        class="inline-flex items-center gap-1.5 rounded-control text-muted-foreground underline decoration-nq-line underline-offset-4 outline-none hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus disabled:opacity-60"
        @click="toggle"
      >
        <NqSpinner v-if="pending" class="size-3" />
        <Languages v-else aria-hidden="true" class="size-3.5" />
        {{ pending ? t.translating : showingTranslation ? t.showOriginal : t.showTranslation }}
      </button>
      <span>{{ fill(showingTranslation ? t.translatedFrom : t.originalIn, { language: languageName(props.sourceLang) }) }}</span>
    </div>
    <p v-if="error" role="alert" class="flex flex-wrap items-center gap-2 text-caption text-nq-danger-text">
      {{ error }}
      <button type="button" class="inline-flex items-center gap-1 underline underline-offset-4 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click="load">
        <RotateCcw aria-hidden="true" class="size-3" />
        {{ t.retry }}
      </button>
    </p>
  </div>
</template>
