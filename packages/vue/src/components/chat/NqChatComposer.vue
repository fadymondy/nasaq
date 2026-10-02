<script setup lang="ts">
import { Send, Square } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { NqTextarea } from "../field";

// The message box. Enter sends, Shift+Enter adds a new line, and the field grows with its text. Enter is ignored while an input
// method (IME) composition is open, so Arabic and CJK candidates can be confirmed without sending.
const props = withDefaults(
  defineProps<{
    /** The text. Use `v-model`. Omit to let the composer own it. */
    modelValue?: string;
    defaultValue?: string;
    /** While `streaming`, the send button becomes a stop button that calls this. */
    onStop?: () => void;
    /** A reply is being produced. Sending is blocked; the stop button shows when `onStop` is set. */
    streaming?: boolean;
    disabled?: boolean;
    placeholder?: string;
    /** Accessible name of the text field. Default "Message" / "الرسالة". */
    label?: string;
    sendLabel?: string;
    stopLabel?: string;
    /** The field grows to this many lines, then scrolls. Default 8. */
    maxRows?: number;
    class?: HTMLAttributes["class"];
  }>(),
  { modelValue: undefined, defaultValue: "", streaming: false, disabled: false, maxRows: 8 },
);
const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** The trimmed text, on Enter or the send button. The composer clears itself afterwards when uncontrolled. */
  send: [text: string];
}>();
defineSlots<{
  /** Above the field: attachment chips or previews. */
  attachments?: () => unknown;
  /** Before the send button: an attach button or other tools. */
  actions?: () => unknown;
}>();

const t = useT();
const inner = ref(props.defaultValue);
const text = computed(() => props.modelValue ?? inner.value);
const field = ref<{ $el: HTMLTextAreaElement } | null>(null);

function set(next: string | undefined) {
  const value = next ?? "";
  if (props.modelValue === undefined) inner.value = value;
  emit("update:modelValue", value);
}

// Autosize: reset, then grow to the content, capped at maxRows lines.
function autosize() {
  const el = field.value?.$el;
  if (!el) return;
  el.style.height = "auto";
  const style = getComputedStyle(el);
  const line = Number.parseFloat(style.lineHeight) || 20;
  const chrome = el.offsetHeight - el.clientHeight;
  const max = line * props.maxRows + (Number.parseFloat(style.paddingBlock || "0") || 0) * 2;
  el.style.height = `${Math.min(el.scrollHeight + chrome, max)}px`;
  el.style.overflowY = el.scrollHeight + chrome > max ? "auto" : "hidden";
}
onMounted(autosize);
watch([text, () => props.maxRows], () => nextTick(autosize));

const trimmed = computed(() => text.value.trim());
const canSend = computed(() => !props.disabled && !props.streaming && trimmed.value.length > 0);

function send() {
  if (!canSend.value) return;
  emit("send", trimmed.value);
  set("");
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== "Enter" || e.shiftKey || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  send();
}

const stopping = computed(() => props.streaming && !!props.onStop);
</script>

<template>
  <div
    data-slot="chat-composer"
    :data-disabled="props.disabled ? '' : undefined"
    :class="
      cn(
        'flex flex-col gap-2 rounded-card border border-input bg-card p-2 transition-colors duration-150 ease-nq',
        'focus-within:border-nq-focus data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <div v-if="$slots.attachments" data-slot="chat-attachments" class="flex flex-wrap gap-2">
      <slot name="attachments" />
    </div>
    <div class="flex items-end gap-2">
      <NqTextarea
        ref="field"
        rows="1"
        dir="auto"
        :model-value="text"
        :disabled="props.disabled"
        :placeholder="props.placeholder ?? t('Write a message…', 'اكتب رسالة…')"
        :aria-label="props.label ?? t('Message', 'الرسالة')"
        class="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 focus-visible:outline-0"
        @update:model-value="set"
        @keydown="onKeydown"
      />
      <slot name="actions" />
      <NqButton v-if="stopping" type="button" variant="secondary" size="icon" :aria-label="props.stopLabel ?? t('Stop', 'إيقاف')" @click="props.onStop?.()">
        <Square aria-hidden="true" class="fill-current" />
      </NqButton>
      <NqButton v-else type="button" variant="primary" size="icon" :aria-label="props.sendLabel ?? t('Send', 'إرسال')" :disabled="!canSend" @click="send">
        <Send aria-hidden="true" class="rtl:-scale-x-100" />
      </NqButton>
    </div>
  </div>
</template>
