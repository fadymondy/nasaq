<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqCodeBlock } from "../code-block";
import NqCodeCopyMenu from "./NqCodeCopyMenu.vue";
import type { AiTarget } from "./format";
import type { CodeCopyKind, CodeVariantLabels } from "./strings";

// A code block whose copy button is the copy menu: Copy code, Copy as Markdown, prompts for AI assistants.
interface Props {
  code: string;
  language?: string;
  filename?: string;
  lineNumbers?: boolean;
  highlightLines?: number[] | string;
  label?: string;
  preClassName?: string;
  class?: HTMLAttributes["class"];
  instruction?: string;
  targets?: readonly AiTarget[];
  openLinks?: boolean;
  /** Labels for the copy menu. */
  menuLabels?: Partial<CodeVariantLabels>;
}
const props = withDefaults(defineProps<Props>(), {
  language: "text",
  filename: undefined,
  lineNumbers: false,
  highlightLines: undefined,
  label: undefined,
  preClassName: undefined,
  instruction: undefined,
  targets: undefined,
  openLinks: undefined,
  menuLabels: undefined,
});
const emit = defineEmits<{ copy: [kind: CodeCopyKind, text: string, target?: AiTarget] }>();
</script>

<template>
  <NqCodeBlock
    :code="props.code"
    :language="props.language"
    :filename="props.filename"
    :line-numbers="props.lineNumbers"
    :highlight-lines="props.highlightLines"
    :label="props.label"
    :pre-class-name="props.preClassName"
    :class="props.class"
  >
    <template #copy-action>
      <NqCodeCopyMenu
        :code="props.code"
        :language="props.language"
        :filename="props.filename"
        :instruction="props.instruction"
        v-bind="{ ...(props.targets ? { targets: props.targets } : {}), ...(props.openLinks === undefined ? {} : { openLinks: props.openLinks }) }"
        :labels="props.menuLabels"
        @copy="(kind, text, target) => emit('copy', kind, text, target)"
      />
    </template>
  </NqCodeBlock>
</template>
