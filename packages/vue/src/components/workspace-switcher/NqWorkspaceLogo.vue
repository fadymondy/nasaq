<script setup lang="ts">
import type { Component } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";

export interface Workspace {
  id: string;
  name: string;
  /** Plan or role, e.g. "Pro" or "Owner". */
  description?: string;
  /** A component to render as the logo (a ProductMark wrapper, an icon). Defaults to the workspace initials. */
  logo?: Component;
  logoSrc?: string;
}

// The workspace's logo tile, internal to NqWorkspaceSwitcher.
const props = defineProps<{ workspace: Workspace; size: "sm" | "md" }>();
</script>

<template>
  <span
    v-if="props.workspace.logo"
    :class="cn('inline-flex shrink-0 items-center justify-center rounded-control border border-border bg-card', props.size === 'md' ? 'size-8' : 'size-6')"
  >
    <component :is="props.workspace.logo" />
  </span>
  <NqAvatar v-else :name="props.workspace.name" :src="props.workspace.logoSrc" shape="square" :size="props.size" />
</template>
