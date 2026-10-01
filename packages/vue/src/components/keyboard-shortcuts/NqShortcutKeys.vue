<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqKbd } from "../text";
import { hotkeyCaps, hotkeyParse } from "./hotkey-logic";
import { SPOKEN, STRINGS, useShortcutApple, type ShortcutPlatform } from "./keyboard-shortcuts";

// A shortcut as key caps, drawn for the platform: ⌘ ⇧ K on a Mac, Ctrl Shift K elsewhere. Always left to right.
// One role="img" with a spoken name ("Command Shift K"), not a run of separate caps.
interface Props {
  /** "Mod+Shift+K" or "G I". */
  shortcut: string;
  platform?: ShortcutPlatform;
  /** Word between the steps of a sequence. Default "then". */
  thenLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { platform: "auto", thenLabel: undefined });
const nq = useNasaq();
const t = computed(() => STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"]);
const apple = useShortcutApple(() => props.platform);
const then = computed(() => props.thenLabel ?? t.value.then);
const steps = computed(() => hotkeyParse(props.shortcut));
const capsBySteps = computed(() => (steps.value ?? []).map((s) => hotkeyCaps(s, apple.value)));
const spoken = computed(() => capsBySteps.value.map((caps) => caps.map((c) => SPOKEN[c] ?? c).join(" ")).join(` ${then.value} `));
</script>

<template>
  <span v-if="!steps" dir="ltr">{{ props.shortcut }}</span>
  <span v-else data-slot="shortcut-keys" dir="ltr" role="img" :aria-label="spoken" :class="cn('inline-flex flex-wrap items-center gap-x-1.5 gap-y-1', props.class)">
    <template v-for="(caps, i) in capsBySteps" :key="i">
      <span v-if="i > 0" aria-hidden="true" class="text-caption text-muted-foreground">{{ then }}</span>
      <span aria-hidden="true" class="inline-flex items-center gap-0.5">
        <NqKbd v-for="(cap, j) in caps" :key="j">{{ cap }}</NqKbd>
      </span>
    </template>
  </span>
</template>
