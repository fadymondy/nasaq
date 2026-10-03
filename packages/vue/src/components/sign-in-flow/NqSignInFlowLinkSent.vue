<script setup lang="ts">
import { MailCheck } from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import { NqAlert } from "../alert";
import { useCooldown, type AuthSubmitResult } from "../auth-layout";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import type { SignInFlowLabels } from "./strings";

// "Check your email" with a resend on a cooldown. Internal to SignInFlow.
const props = defineProps<{ t: SignInFlowLabels; email: string; seconds: number; onResend?: () => Promise<AuthSubmitResult> | AuthSubmitResult }>();
const cooldown = useCooldown(props.seconds);
const state = reactive<{ pending: boolean; error?: string; done?: boolean }>({ pending: false });
const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus());
const parts = computed(() => {
  const [before = "", after = ""] = props.t.linkSentBody.split("{email}");
  return { before, after };
});
async function resend() {
  if (!props.onResend || cooldown.remaining.value > 0 || state.pending) return;
  state.pending = true;
  state.error = undefined;
  try {
    const result = await props.onResend();
    if (result?.error) state.error = result.error;
    else {
      state.done = true;
      cooldown.start(props.seconds);
    }
  } catch {
    state.error = props.t.failed;
  } finally {
    state.pending = false;
  }
}
</script>

<template>
  <div data-slot="sign-in-flow-link-sent" class="flex flex-col gap-4">
    <div role="status" class="flex gap-3 rounded-card border border-border bg-muted/50 p-4">
      <span class="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text [&_svg]:size-4">
        <MailCheck aria-hidden="true" />
      </span>
      <div class="flex min-w-0 flex-col gap-0.5">
        <p ref="heading" tabindex="-1" class="text-label text-foreground outline-none">{{ t.linkSentTitle }}</p>
        <p class="text-body-sm text-muted-foreground">
          {{ parts.before }}<bdi dir="ltr" class="font-medium text-foreground">{{ email }}</bdi>{{ parts.after }}
        </p>
      </div>
    </div>
    <NqAlert v-if="state.error" tone="danger">{{ state.error }}</NqAlert>
    <span role="status" class="sr-only">{{ state.done && cooldown.remaining.value > 0 ? t.resent : "" }}</span>
    <NqButton
      v-if="onResend"
      type="button"
      variant="secondary"
      size="lg"
      :loading="state.pending"
      :disabled="cooldown.remaining.value > 0"
      data-slot="sign-in-flow-resend"
      @click="resend"
    >
      {{ cooldown.remaining.value > 0 ? t.resendIn.replace("{time}", formatCountdown(cooldown.remaining.value)) : t.resend }}
    </NqButton>
  </div>
</template>
