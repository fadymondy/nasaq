<script setup lang="ts">
import { Clock, Globe, Lock, Mail, Share2, UserPlus, X } from "lucide-vue-next";
import { computed, onMounted, ref, useId, watch } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatar } from "../avatar";
import { NqButton } from "../button";
import { NqCopyField } from "../copy-button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqTagInput } from "../tag-input";
import { expiryToDate, isEmail, mailtoLink, withExpiry, type ShareExpiry } from "./share-helpers";
import { defaultRoles, EXPIRIES, strings, type Labels } from "./share-strings";
import type { ShareLinkAccess, SharePerson, ShareRole, ShareLinkSettings } from "./share-types";

// The share dialog: people with access, an email invite with a role, link access (restricted or anyone with the
// link) with an expiry, the link to copy, and the native share sheet where the browser has one.
interface Props {
  /** `v-model:open`. */
  open: boolean;
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
  labels?: Labels;
}
const props = withDefaults(defineProps<Props>(), {
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
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value ?? "en");
const t = computed(() => ({ ...strings(locale.value), ...props.labels }));
const roles = computed(() => props.roles ?? defaultRoles(locale.value));
const firstRole = computed(() => roles.value[0]?.value ?? "viewer");
const id = useId();

const inviteRole = ref(props.defaultRole ?? firstRole.value);
const emails = ref<string[]>([]);
const pending = ref(false);
const message = ref<{ tone: "success" | "danger"; text: string } | null>(null);
const innerAccess = ref<ShareLinkAccess>(props.defaultAccess);
const innerLinkRole = ref(props.defaultLinkRole ?? firstRole.value);
const innerExpiry = ref<ShareExpiry>(props.defaultExpiry);
const access = computed(() => props.access ?? innerAccess.value);
const linkRole = computed(() => props.linkRole ?? innerLinkRole.value);
const expiry = computed(() => props.expiry ?? innerExpiry.value);

const canShare = ref(false);
onMounted(() => (canShare.value = typeof navigator !== "undefined" && typeof navigator.share === "function"));

watch(
  () => props.open,
  (open) => {
    if (!open) {
      emails.value = [];
      message.value = null;
    }
  },
);

function emitLink(next: Partial<Pick<ShareLinkSettings, "access" | "role" | "expiry">>) {
  const settings = { access: access.value, role: linkRole.value, expiry: expiry.value, ...next };
  if (next.access) innerAccess.value = next.access;
  if (next.role) innerLinkRole.value = next.role;
  if (next.expiry) innerExpiry.value = next.expiry;
  props.onLinkChange?.({ ...settings, expiresAt: expiryToDate(settings.expiry) });
}

async function sendInvite() {
  if (!emails.value.length || !props.onInvite) return;
  pending.value = true;
  message.value = null;
  try {
    await props.onInvite(emails.value, inviteRole.value);
    message.value = { tone: "success", text: t.value.inviteSent(emails.value.join(", ")) };
    emails.value = [];
  } catch (error) {
    message.value = { tone: "danger", text: (error as Error)?.message || t.value.failed };
  } finally {
    pending.value = false;
  }
}

const shareLink = computed(() => (access.value === "anyone" ? withExpiry(props.url, expiry.value) : props.url));
const roleLabel = (value: string) => roles.value.find((r) => r.value === value)?.label ?? value;
const accessItems = computed(() => [
  { value: "restricted", label: t.value.restricted },
  { value: "anyone", label: t.value.anyone },
]);

async function nativeShare() {
  try {
    await navigator.share({ url: shareLink.value, title: props.title, text: props.text });
    props.onShared?.();
  } catch {
    /* The user closed the sheet. */
  }
}
const validate = (v: string, current: readonly string[]) => (isEmail(v) ? !current.includes(v.toLowerCase()) : t.value.invalidEmail(v));
</script>

<template>
  <NqDialog :open="props.open" @update:open="(v: boolean) => emit('update:open', v)">
    <NqDialogContent class="max-w-lg grid-cols-[minmax(0,1fr)]" data-slot="share-dialog">
      <NqDialogHeader>
        <NqDialogTitle>{{ props.title ? `${t.title}: ${props.title}` : t.title }}</NqDialogTitle>
        <NqDialogDescription>{{ t.description }}</NqDialogDescription>
      </NqDialogHeader>

      <div class="flex flex-col gap-5">
        <section v-if="props.onInvite" class="flex flex-col gap-2" :aria-labelledby="`${id}-invite`">
          <h3 :id="`${id}-invite`" class="text-label text-foreground">{{ t.invite }}</h3>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start">
            <NqTagInput
              v-model="emails"
              class="min-w-0 flex-1"
              :placeholder="t.invitePlaceholder"
              :separators="[',', ';', ' ']"
              add-on-blur
              :validate="validate"
              :input-props="{ type: 'email', dir: 'ltr', 'aria-label': t.invite }"
            />
            <NqSelect v-model="inviteRole">
              <NqSelectTrigger :aria-label="t.role" class="w-auto min-w-32"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
            <NqButton variant="primary" :disabled="!emails.length" :loading="pending" @click="sendInvite">
              <UserPlus aria-hidden="true" />
              {{ t.sendInvite }}
            </NqButton>
          </div>
          <p class="text-caption text-muted-foreground">{{ t.inviteHint }}</p>
          <NqAlert v-if="message" :tone="message.tone" :role="message.tone === 'danger' ? 'alert' : 'status'">{{ message.text }}</NqAlert>
        </section>

        <section v-if="props.people.length" class="flex flex-col gap-2" :aria-labelledby="`${id}-people`">
          <h3 :id="`${id}-people`" class="text-label text-foreground">{{ t.people }}</h3>
          <ul class="flex max-h-48 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
            <li v-for="p in props.people" :key="p.id" class="flex items-center gap-3 px-3 py-2">
              <NqAvatar :name="p.name" :src="p.avatar" size="sm" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-body-sm text-foreground">{{ p.name }}</span>
                <bdi v-if="p.email" dir="ltr" class="truncate text-start text-caption text-muted-foreground">{{ p.email }}</bdi>
              </span>
              <span v-if="p.owner" class="text-body-sm text-muted-foreground">{{ t.owner }}</span>
              <template v-else>
                <NqSelect :model-value="p.role" :disabled="!props.onRoleChange" @update:model-value="(v) => v && props.onRoleChange?.(p, String(v))">
                  <NqSelectTrigger :aria-label="t.roleFor(p.name)" :class="cn('w-auto min-w-32', 'h-8 min-w-28 text-body-sm')"><NqSelectValue /></NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
                <NqButton v-if="props.onRemove" variant="ghost" size="icon-sm" :aria-label="t.removeFor(p.name)" @click="props.onRemove?.(p)">
                  <X aria-hidden="true" />
                </NqButton>
              </template>
            </li>
          </ul>
        </section>

        <section v-if="props.linkAccess" class="flex flex-col gap-3" :aria-labelledby="`${id}-access`">
          <h3 :id="`${id}-access`" class="text-label text-foreground">{{ t.linkAccess }}</h3>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span class="flex min-w-0 flex-1 items-start gap-2.5">
              <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Globe v-if="access === 'anyone'" aria-hidden="true" class="size-4" />
                <Lock v-else aria-hidden="true" class="size-4" />
              </span>
              <span class="flex min-w-0 flex-col">
                <NqSelect :model-value="access" @update:model-value="(v) => v && emitLink({ access: String(v) as ShareLinkAccess })">
                  <NqSelectTrigger :aria-label="t.linkAccess" class="h-8 w-auto border-transparent bg-transparent ps-1 text-label"><NqSelectValue /></NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="a in accessItems" :key="a.value" :value="a.value">{{ a.label }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
                <span class="ps-1 text-caption text-muted-foreground">{{ access === "anyone" ? t.anyoneHint : t.restrictedHint }}</span>
              </span>
            </span>
            <NqSelect v-if="access === 'anyone'" :model-value="linkRole" @update:model-value="(v) => v && emitLink({ role: String(v) })">
              <NqSelectTrigger :aria-label="t.linkRole" class="w-auto min-w-32"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>

          <div class="flex items-center gap-2.5">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Clock aria-hidden="true" class="size-4" />
            </span>
            <span class="flex-1 text-body-sm text-foreground">{{ t.expiry }}</span>
            <NqSelect :model-value="expiry" @update:model-value="(v) => v && emitLink({ expiry: String(v) as ShareExpiry })">
              <NqSelectTrigger :aria-label="t.expiry" class="w-auto min-w-32"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="e in EXPIRIES" :key="e" :value="e">{{ t[e] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </div>
        </section>

        <section class="flex flex-col gap-2" :aria-labelledby="`${id}-link`">
          <h3 :id="`${id}-link`" class="text-label text-foreground">{{ t.link }}</h3>
          <NqCopyField :value="shareLink" :label="t.link" :copy-label="t.copyLink" :copied-label="t.copied" @copy="props.onCopy?.(shareLink)" />
          <p v-if="access === 'anyone' && linkRole" class="text-caption text-muted-foreground">{{ t.anyone }}: {{ roleLabel(linkRole) }}</p>
          <div class="flex flex-wrap gap-2">
            <NqButton v-if="canShare" variant="secondary" size="sm" @click="nativeShare">
              <Share2 aria-hidden="true" />
              {{ t.nativeShare }}
            </NqButton>
            <NqButton v-if="props.mailto" variant="secondary" size="sm" as="a" :href="mailtoLink(shareLink, props.title, props.text)">
              <Mail aria-hidden="true" />
              {{ t.email }}
            </NqButton>
          </div>
        </section>
      </div>

      <NqDialogFooter>
        <NqButton variant="primary" @click="emit('update:open', false)">{{ t.done }}</NqButton>
      </NqDialogFooter>
    </NqDialogContent>
  </NqDialog>
</template>
