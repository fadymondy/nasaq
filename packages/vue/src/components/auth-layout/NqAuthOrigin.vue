<script setup lang="ts">
import { ShieldAlert, ShieldCheck } from "lucide-vue-next";
import { onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "./auth-utils";
import { ORIGIN } from "./strings";

// Whether the page is served securely, and the host people are signing in to. On a page that is not a secure context
// (plain http off localhost) it turns into a warning instead of a reassurance. Rendered after mount, so server and client markup match.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const locale = useAuthLocale();
const origin = ref<{ host: string; secure: boolean } | null>(null);
onMounted(() => (origin.value = { host: window.location.host, secure: window.isSecureContext }));
</script>

<template>
  <p
    v-if="origin"
    data-slot="auth-origin"
    :data-secure="origin.secure ? '' : undefined"
    :class="cn('flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-caption', origin.secure ? 'text-muted-foreground' : 'text-nq-danger-text', props.class)"
  >
    <component :is="origin.secure ? ShieldCheck : ShieldAlert" aria-hidden="true" :class="cn('size-3.5 shrink-0', origin.secure && 'text-nq-success-text')" />
    <span>{{ origin.secure ? ORIGIN[locale].secure : ORIGIN[locale].insecure }}</span>
    {{ " " }}
    <bdi dir="ltr" class="font-medium text-foreground">{{ origin.host }}</bdi>
  </p>
</template>
