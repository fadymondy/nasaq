<script setup lang="ts">
import { Download } from "lucide-vue-next";
import { ref, useId } from "vue";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqCopyButton } from "../copy-button";
import { recoveryCodesText } from "./format";
import type { TwoFactorLabels } from "./labels";

// Codes in a two-column grid, always left-to-right, with copy, download and a confirmation. Internal to NqTwoFactorSetup.
interface Props {
  codes: readonly string[];
  t: TwoFactorLabels;
  filename: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{ confirm: [] }>();

const saved = ref(false);
const id = `nq-2fa-saved-${useId()}`;

function download() {
  const blob = new Blob([recoveryCodesText(props.codes, props.t.fileHeader)], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = props.filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}
</script>

<template>
  <div class="flex flex-col gap-4" data-slot="two-factor-recovery">
    <ul
      dir="ltr"
      :aria-label="props.t.recoveryList"
      class="grid grid-cols-2 gap-x-6 gap-y-2 rounded-card border border-border bg-secondary p-4 font-mono text-body tabular-nums text-foreground"
    >
      <li v-for="code in props.codes" :key="code" data-slot="two-factor-recovery-code" class="select-all">{{ code }}</li>
    </ul>
    <div class="flex flex-wrap gap-2">
      <NqCopyButton :value="props.codes.join('\n')" variant="secondary" :label="props.t.copyAll">{{ props.t.copyAll }}</NqCopyButton>
      <NqButton type="button" size="sm" @click="download">
        <Download aria-hidden="true" />
        {{ props.t.download }}
      </NqButton>
    </div>
    <div class="flex items-center gap-2">
      <NqCheckbox :id="id" v-model="saved" />
      <label :for="id" class="text-body-sm text-foreground">{{ props.t.saved }}</label>
    </div>
    <div>
      <NqButton type="button" variant="primary" :disabled="!saved" @click="emit('confirm')">{{ props.t.finish }}</NqButton>
    </div>
  </div>
</template>
