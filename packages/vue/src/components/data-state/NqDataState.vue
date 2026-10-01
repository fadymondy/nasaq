<script setup lang="ts">
import { LogIn } from "lucide-vue-next";
import { computed, type Component, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqEmptyState, NqErrorState, NqLoadingState } from "../states";
import NqServiceUnavailable from "./NqServiceUnavailable.vue";
import { dataStateStrings, errorText, type DataStateLabels } from "./data-state-logic";

// Renders exactly one state of a data view, in a fixed order: loading, unauthorized (401), unavailable (503),
// error, empty, then the content (default slot). A page never shows a raw error string or a blank area.
// Slots: `default` (the content), `empty-action` (usually a "Create" button), `loading` (replaces the skeleton).
interface Props {
  loading?: boolean;
  /** 401: the session ended. Wins over every state but loading. */
  unauthorized?: boolean;
  /** 503: the service is down. */
  unavailable?: boolean;
  /** An error detail (an Error or a message). Shown under the error title, never as a raw page. */
  error?: unknown;
  /** The request worked and returned nothing. */
  empty?: boolean;
  /** Where "Sign in" goes in the 401 card. Ignored when `onSignIn` is set. */
  signInHref?: string;
  onSignIn?: () => void;
  /** Retry button on the 503 and error cards. */
  onRetry?: () => void;
  /** Icon of the empty card (a lucide-vue-next component). */
  emptyIcon?: Component;
  /** Skeleton rows while loading. Default 3. */
  loadingRows?: number;
  labels?: Partial<DataStateLabels>;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const nasaq = useNasaq();
const t = computed<DataStateLabels>(() => ({ ...dataStateStrings[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const detail = computed(() => errorText(props.error));
</script>

<template>
  <template v-if="props.loading">
    <slot name="loading"><NqLoadingState :rows="props.loadingRows" :class="props.class" /></slot>
  </template>
  <NqEmptyState
    v-else-if="props.unauthorized"
    data-slot="data-state"
    data-state="unauthorized"
    :icon="LogIn"
    :title="t.unauthorizedTitle"
    :description="t.unauthorizedBody"
    :class="props.class"
  >
    <template v-if="props.onSignIn || props.signInHref" #actions>
      <NqButton v-if="props.onSignIn" size="sm" variant="primary" @click="props.onSignIn()"><LogIn aria-hidden="true" /> {{ t.signIn }}</NqButton>
      <NqButton v-else as="a" size="sm" variant="primary" :href="props.signInHref"><LogIn aria-hidden="true" /> {{ t.signIn }}</NqButton>
    </template>
  </NqEmptyState>
  <NqServiceUnavailable v-else-if="props.unavailable" data-state="unavailable" :on-retry="props.onRetry" :labels="props.labels" :class="props.class" />
  <NqErrorState v-else-if="detail !== undefined" data-state="error" :title="t.errorTitle" :description="detail" :class="props.class">
    <template v-if="props.onRetry" #actions><NqButton size="sm" @click="props.onRetry()">{{ t.retry }}</NqButton></template>
  </NqErrorState>
  <NqEmptyState
    v-else-if="props.empty"
    data-state="empty"
    :icon="props.emptyIcon"
    :title="t.emptyTitle"
    :description="t.emptyBody || undefined"
    :class="props.class"
  >
    <template v-if="$slots['empty-action']" #actions><slot name="empty-action" /></template>
  </NqEmptyState>
  <slot v-else />
</template>
