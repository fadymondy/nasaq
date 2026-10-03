<script setup lang="ts">
import { Check, ChevronDown, Copy, ExternalLink, FileText, Sparkles } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { copyText } from "../copy-button";
import { NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuLabel, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "../dropdown-menu";
import { useFlash } from "./flash";
import { type AiTarget, aiLink, buildPrompt, toMarkdown } from "./format";
import { STRINGS, TARGET_NAME, type CodeCopyKind, type CodeVariantLabels } from "./strings";

// A split copy control: the button copies the code at once, the chevron opens a menu with Copy as Markdown,
// prompts for Claude, ChatGPT and Cursor, and links that open the assistant with the prompt filled in.
interface Props {
  /** The code to copy. */
  code: string;
  language?: string;
  filename?: string;
  /** What the assistant should do with the snippet. Default depends on the target. */
  instruction?: string;
  /** Which assistants to offer. `[]` leaves only Copy code and Copy as Markdown. */
  targets?: readonly AiTarget[];
  /** Also offer "Open in ..." links that open the assistant with the prompt filled in. */
  openLinks?: boolean;
  labels?: Partial<CodeVariantLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { language: undefined, filename: undefined, instruction: undefined, targets: () => ["claude", "chatgpt", "cursor"], openLinks: true, labels: undefined });
// `text` is what went to the clipboard, or the prompt that was opened.
const emit = defineEmits<{ copy: [kind: CodeCopyKind, text: string, target?: AiTarget] }>();

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const source = computed(() => props.code.replace(/\n$/, ""));
const { status, done, flash } = useFlash();

async function run(kind: CodeCopyKind, text: string, message: string, target?: AiTarget) {
  const ok = await copyText(text);
  flash(ok ? message : t.value.copyFailed, ok);
  if (ok) emit("copy", kind, text, target);
}
const prompt = (target: AiTarget) => buildPrompt({ code: source.value, language: props.language, filename: props.filename, instruction: props.instruction, target });
async function open(target: AiTarget) {
  const text = prompt(target);
  const link = aiLink(target, text);
  if (!link) return run("prompt", text, t.value.tooLong, target);
  window.open(link, "_blank", "noopener,noreferrer");
  emit("copy", "open", text, target);
}
</script>

<template>
  <span data-slot="code-copy-menu" :class="cn('inline-flex items-center', props.class)">
    <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.copyCode" :data-copied="done ? '' : undefined" class="data-copied:text-nq-success-text" @click="run('code', source, t.copiedCode)">
      <Check v-if="done" aria-hidden="true" />
      <Copy v-else aria-hidden="true" />
    </NqButton>
    <NqDropdownMenu>
      <NqDropdownMenuTrigger as-child>
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.copyMenu" data-slot="code-copy-menu-trigger" class="-ms-1 w-5">
          <ChevronDown aria-hidden="true" class="size-3.5" />
        </NqButton>
      </NqDropdownMenuTrigger>
      <NqDropdownMenuContent align="end" class="min-w-56">
        <NqDropdownMenuItem @select="run('code', source, t.copiedCode)">
          <Copy aria-hidden="true" />
          {{ t.copyCode }}
        </NqDropdownMenuItem>
        <NqDropdownMenuItem @select="run('markdown', toMarkdown(source, props.language, props.filename), t.copiedMarkdown)">
          <FileText aria-hidden="true" />
          {{ t.copyMarkdown }}
        </NqDropdownMenuItem>
        <template v-if="props.targets.length">
          <NqDropdownMenuSeparator />
          <NqDropdownMenuLabel>{{ t.ai }}</NqDropdownMenuLabel>
          <NqDropdownMenuItem v-for="target in props.targets" :key="target" @select="run('prompt', prompt(target), t.copiedPrompt(TARGET_NAME[target]), target)">
            <Sparkles aria-hidden="true" />
            <span>{{ t.promptFor }} <bdi dir="ltr">{{ TARGET_NAME[target] }}</bdi></span>
          </NqDropdownMenuItem>
        </template>
        <template v-if="props.openLinks && props.targets.length">
          <NqDropdownMenuSeparator />
          <NqDropdownMenuItem v-for="target in props.targets" :key="`open-${target}`" @select="open(target)">
            <ExternalLink aria-hidden="true" class="rtl:-scale-x-100" />
            <span>{{ t.openIn }} <bdi dir="ltr">{{ TARGET_NAME[target] }}</bdi></span>
          </NqDropdownMenuItem>
        </template>
      </NqDropdownMenuContent>
    </NqDropdownMenu>
    <span role="status" aria-live="polite" class="sr-only">{{ status }}</span>
  </span>
</template>
