<script setup lang="ts">
import { Share2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import type { ShareExpiry } from "./share-helpers";
import { strings, type Labels } from "./share-strings";
import type { ShareLinkAccess, ShareLinkSettings, SharePerson, ShareRole } from "./share-types";
import NqShareDialog from "./NqShareDialog.vue";

// A "Share" button that opens the share dialog. Use NqShareDialog to open it from your own control.
interface Props {
  url: string;
  title?: string;
  text?: string;
  roles?: ShareRole[];
  defaultRole?: string;
  people?: SharePerson[];
  onInvite?: (emails: string[], role: string) => void | Promise<void>;
  onRoleChange?: (person: SharePerson, role: string) => void | Promise<void>;
  onRemove?: (person: SharePerson) => void | Promise<void>;
  linkAccess?: boolean;
  access?: ShareLinkAccess;
  defaultAccess?: ShareLinkAccess;
  linkRole?: string;
  defaultLinkRole?: string;
  expiry?: ShareExpiry;
  defaultExpiry?: ShareExpiry;
  onLinkChange?: (settings: ShareLinkSettings) => void;
  onCopy?: (url: string) => void;
  onShared?: () => void;
  mailto?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  class?: HTMLAttributes["class"];
  labels?: Labels;
}
const props = withDefaults(defineProps<Props>(), {
  variant: "secondary",
  size: "sm",
  disabled: false,
  title: undefined,
  text: undefined,
  roles: undefined,
  defaultRole: undefined,
  people: () => [],
  onInvite: undefined,
  onRoleChange: undefined,
  onRemove: undefined,
  linkAccess: true,
  access: undefined,
  defaultAccess: "restricted",
  linkRole: undefined,
  defaultLinkRole: undefined,
  expiry: undefined,
  defaultExpiry: "never",
  onLinkChange: undefined,
  onCopy: undefined,
  onShared: undefined,
  mailto: true,
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => ({ ...strings(nq.locale.value ?? "en"), ...props.labels }));
const open = ref(false);
</script>

<template>
  <NqButton :variant="props.variant" :size="props.size" :disabled="props.disabled" :class="props.class" data-slot="share-button" @click="open = true">
    <Share2 aria-hidden="true" />
    <slot>{{ t.share }}</slot>
  </NqButton>
  <NqShareDialog
    v-model:open="open"
    :url="props.url"
    :title="props.title"
    :text="props.text"
    :roles="props.roles"
    :default-role="props.defaultRole"
    :people="props.people"
    :on-invite="props.onInvite"
    :on-role-change="props.onRoleChange"
    :on-remove="props.onRemove"
    :link-access="props.linkAccess"
    :access="props.access"
    :default-access="props.defaultAccess"
    :link-role="props.linkRole"
    :default-link-role="props.defaultLinkRole"
    :expiry="props.expiry"
    :default-expiry="props.defaultExpiry"
    :on-link-change="props.onLinkChange"
    :on-copy="props.onCopy"
    :on-shared="props.onShared"
    :mailto="props.mailto"
    :labels="props.labels"
  />
</template>
