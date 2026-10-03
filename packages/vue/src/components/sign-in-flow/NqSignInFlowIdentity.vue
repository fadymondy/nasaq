<script setup lang="ts">
import { ArrowLeft, Mail } from "lucide-vue-next";
import { NqButton } from "../button";

// The address being signed in, with a way back. Internal to SignInFlow.
defineProps<{ email: string; change: string }>();
const emit = defineEmits<{ change: [] }>();
</script>

<template>
  <div data-slot="sign-in-flow-identity" class="flex items-center gap-2 rounded-control border border-border bg-muted/60 py-1 ps-3 pe-1">
    <Mail aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
    <bdi dir="ltr" class="min-w-0 flex-1 truncate text-start text-body-sm text-foreground">{{ email }}</bdi>
    <NqButton type="button" variant="ghost" size="sm" @click="emit('change')">
      <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
      {{ change }}
    </NqButton>
  </div>
</template>
