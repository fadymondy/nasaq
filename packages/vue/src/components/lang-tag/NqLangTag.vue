<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge, type TagHue } from "../badge";
import { LANG_HUES, languageName } from "./lang-tag";

// The language of a piece of content (not of the interface): a small code tag beside a title, a message or a document.
// The code is a Latin token and stays left to right; its accessible name is the language's full name.
interface Props {
  /** A language code (`ar`, `en`, `en-GB`). Nothing renders when it is empty. */
  lang?: string | null;
  /** Override the hue from the built-in table. */
  hue?: TagHue;
  /** Show the full region code (`en-GB`) instead of the two-letter base. Default `false`. */
  region?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { lang: undefined, hue: undefined, region: false });
const nq = useNasaq();
const base = computed(() => (props.lang ? props.lang.split(/[-_]/)[0]!.toLowerCase() : ""));
const code = computed(() => (props.region ? (props.lang ?? "").replace("_", "-") : base.value));
const name = computed(() => languageName(props.region ? code.value : base.value, nq.locale.value));
const sr = computed(() => (nq.locale.value.startsWith("ar") ? `لغة المحتوى: ${name.value}` : `Content language: ${name.value}`));
</script>

<template>
  <NqBadge
    v-if="props.lang"
    data-slot="lang-tag"
    :data-lang="base"
    variant="tag"
    :hue="props.hue ?? LANG_HUES[base] ?? 'gray'"
    dir="ltr"
    :title="name"
    :class="cn('font-mono uppercase tracking-wide', props.class)"
  >
    <span aria-hidden="true">{{ code }}</span>
    <span class="sr-only">{{ sr }}</span>
  </NqBadge>
</template>
