<script setup lang="ts">
import { CircleCheck, CircleX, ExternalLink, Globe, MapPin, TriangleAlert } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatar } from "../avatar";
import { NqAvatarUpload } from "../avatar-upload";
import { NqButton } from "../button";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList } from "../combobox";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput, NqInputGroupText } from "../input-group";
import { formatNumber } from "../numeric";
import { NqPhoneInput } from "../phone-input";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSeparator } from "../separator";
import { NqSpinner } from "../spinner";
import NqProfileEmailField from "./NqProfileEmailField.vue";
import { buildTimezones, PROFILE_DIRTY_KEYS, USERNAME_PATTERN, WEBSITE_PATTERN } from "./profile-logic";
import { profileStrings, type ProfileFormLabels } from "./strings";
import type { ProfileFormFieldErrors, ProfileFormOption, ProfileFormResult, ProfileFormValues, ProfileUsernameCheck, UsernameStatus } from "./types";

// The "Profile" settings form, laid out like the public profile page: an identity column with the photo and a live
// preview, beside grouped fields (Public profile, Account, Preferences). A sticky Save / Discard bar shows only while
// something differs from the saved values. Nothing is sent by the component: every action is an async callback.
const props = withDefaults(
  defineProps<{
    /** The saved values. A new object with different content resets the form to it. */
    values: ProfileFormValues;
    /** Save. Resolve with nothing on success, or `{ error, fieldErrors }` to show a failure. Throwing shows a generic error. */
    onSubmit: (values: ProfileFormValues) => Promise<void | ProfileFormResult>;
    /** Photo upload. Omit `onChange` to hide the photo section. */
    avatar?: {
      src?: string;
      onChange?: (file: File, controls: { onProgress?: (percent: number) => void }) => Promise<void>;
      onRemove?: () => Promise<void>;
      accept?: string;
      maxSize?: number;
      outputSize?: number;
      outputType?: "image/webp" | "image/png" | "image/jpeg";
    };
    /** Is this username free? Called after typing pauses, only for a valid username that differs from the saved one. */
    checkUsername?: (username: string) => Promise<ProfileUsernameCheck>;
    /** Milliseconds of quiet before `checkUsername` runs. Default 400. */
    usernameDebounce?: number;
    /** Shows a Verified or Not verified badge next to the email. Omit to hide the badge. */
    emailVerified?: boolean;
    onResendVerification?: () => Promise<void>;
    /** Shows the "Change email" button and dialog. Called with the new email and the current password. */
    onChangeEmail?: (input: { email: string; password: string }) => Promise<void | ProfileFormResult>;
    /** Language choices. Default: English and Arabic. */
    languages?: readonly ProfileFormOption[];
    /** Time zone choices. Default: every IANA zone the browser knows, with its UTC offset. */
    timezones?: readonly ProfileFormOption[];
    bioMaxLength?: number;
    /** Country preselected in the phone field when there is no number. Default "SA". */
    defaultCountry?: string;
    disabled?: boolean;
    /** Link to the public profile, shown under the preview as "View public profile". */
    profileHref?: string;
    labels?: ProfileFormLabels;
    class?: HTMLAttributes["class"];
  }>(),
  {
    avatar: undefined,
    checkUsername: undefined,
    usernameDebounce: 400,
    emailVerified: undefined,
    onResendVerification: undefined,
    onChangeEmail: undefined,
    languages: undefined,
    timezones: undefined,
    bioMaxLength: 160,
    defaultCountry: undefined,
    disabled: undefined,
    profileHref: undefined,
    labels: undefined,
    class: undefined,
  },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...profileStrings(locale.value), ...props.labels }));

const baseline = ref<ProfileFormValues>({ ...props.values });
const draft = ref<ProfileFormValues>({ ...props.values });
const serverErrors = ref<ProfileFormFieldErrors>({});
const formError = ref<string | null>(null);
const saving = ref(false);
const attempted = ref(false);
const notice = ref<string | null>(null);
const username = ref<{ status: UsernameStatus; message?: string }>({ status: "idle" });
const pendingEmail = ref<string | null>(null);

// A host that reloads the saved values (a different object with different content) resets the form.
watch(
  () => JSON.stringify(props.values),
  () => {
    baseline.value = { ...props.values };
    draft.value = { ...props.values };
    serverErrors.value = {};
    formError.value = null;
  },
);

const dirty = computed(() => PROFILE_DIRTY_KEYS.some((key) => draft.value[key] !== baseline.value[key]));

function set<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
  draft.value = { ...draft.value, [key]: value };
  if (serverErrors.value[key]) serverErrors.value = { ...serverErrors.value, [key]: undefined };
  notice.value = null;
}

/* username availability: debounced, and stale answers are dropped */
let usernameTimer: ReturnType<typeof setTimeout> | undefined;
let usernameRun = 0;
watch(
  () => [draft.value.username, baseline.value.username, props.usernameDebounce, props.checkUsername] as const,
  ([value, saved]) => {
    clearTimeout(usernameTimer);
    const run = ++usernameRun;
    if (!props.checkUsername || value === saved || !USERNAME_PATTERN.test(value)) {
      username.value = { status: "idle" };
      return;
    }
    username.value = { status: "checking" };
    usernameTimer = setTimeout(async () => {
      try {
        const result = await props.checkUsername?.(value);
        if (run !== usernameRun || result === undefined) return;
        const free = typeof result === "boolean" ? result : result.available;
        username.value = { status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined };
      } catch {
        if (run === usernameRun) username.value = { status: "error" };
      }
    }, props.usernameDebounce);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  clearTimeout(usernameTimer);
  usernameRun++;
});

/* validation: username format shows while typing, the rest after the first save attempt */
const localErrors = computed(() => {
  const d = draft.value;
  const e: ProfileFormFieldErrors = {};
  if (attempted.value && !d.name.trim()) e.name = t.value.nameRequired;
  if (d.username && d.username !== baseline.value.username && !USERNAME_PATTERN.test(d.username)) e.username = t.value.usernameFormat;
  if (attempted.value && !d.username) e.username = t.value.usernameFormat;
  if (username.value.status === "taken") e.username = username.value.message ?? t.value.usernameTaken;
  if (attempted.value && d.website && !WEBSITE_PATTERN.test(d.website.trim())) e.website = t.value.websiteInvalid;
  return e;
});
const errors = computed<ProfileFormFieldErrors>(() => ({ ...serverErrors.value, ...localErrors.value }));
const blocked = computed(() => username.value.status === "checking" || username.value.status === "taken" || !!localErrors.value.username);

function discard() {
  draft.value = { ...baseline.value };
  serverErrors.value = {};
  formError.value = null;
  attempted.value = false;
}

async function submit() {
  if (!dirty.value || saving.value) return;
  attempted.value = true;
  const d = draft.value;
  if (blocked.value || !d.name.trim() || !d.username || (d.website && !WEBSITE_PATTERN.test(d.website.trim()))) return;
  saving.value = true;
  formError.value = null;
  notice.value = null;
  try {
    const result = await props.onSubmit({ ...d, name: d.name.trim() });
    if (result && (result.error || result.fieldErrors)) {
      serverErrors.value = result.fieldErrors ?? {};
      formError.value = result.error ?? null;
    } else {
      baseline.value = { ...draft.value, name: draft.value.name.trim() };
      draft.value = { ...draft.value, name: draft.value.name.trim() };
      serverErrors.value = {};
      attempted.value = false;
      notice.value = t.value.saved;
    }
  } catch {
    formError.value = t.value.saveFailed;
  } finally {
    saving.value = false;
  }
}

const languageOptions = computed<readonly ProfileFormOption[]>(
  () =>
    props.languages ?? [
      { value: "en", label: "English" },
      { value: "ar", label: "العربية" },
    ],
);
const zoneOptions = computed<readonly ProfileFormOption[]>(() => {
  const list = props.timezones ?? buildTimezones(locale.value);
  if (draft.value.timezone && !list.some((z) => z.value === draft.value.timezone)) return [{ value: draft.value.timezone, label: draft.value.timezone }, ...list];
  return list;
});
const zone = computed(() => zoneOptions.value.find((z) => z.value === draft.value.timezone) ?? null);

const bioLength = computed(() => Array.from(draft.value.bio).length);
const shownName = computed(() => draft.value.name.trim() || baseline.value.name);
const site = computed(() => draft.value.website?.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""));
const usernameHint = computed(() => {
  const s = username.value;
  return s.status === "checking" ? t.value.usernameChecking : s.status === "available" ? (s.message ?? t.value.usernameAvailable(`@${draft.value.username}`)) : s.status === "error" ? t.value.usernameCheckFailed : t.value.usernameHelp;
});

const ids = { public: useId(), account: useId(), prefs: useId() };
const groupClass = "flex flex-col gap-5 rounded-card border border-border bg-card p-4 @xl:p-6";
const gridClass = "grid grid-cols-1 gap-x-4 gap-y-5 @xl:grid-cols-2";
</script>

<template>
  <form data-slot="profile-form" novalidate :aria-busy="saving || undefined" :class="cn('@container flex flex-col gap-6', props.class)" @submit.prevent="submit">
    <NqAlert v-if="formError" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="formError = null">{{ formError }}</NqAlert>
    <NqAlert v-if="notice && !dirty" tone="success" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice }}</NqAlert>

    <div class="grid grid-cols-1 gap-8 @3xl:grid-cols-[16rem_minmax(0,1fr)] @3xl:gap-10">
      <!-- The identity column: the photo and a live preview of what the public profile shows. -->
      <aside :aria-label="t.preview" data-slot="profile-form-preview" class="flex min-w-0 flex-col gap-4 @3xl:sticky @3xl:top-6 @3xl:self-start">
        <NqAvatarUpload
          v-if="avatar?.onChange"
          layout="stacked"
          :name="shownName"
          :src="avatar.src"
          :disabled="disabled || saving"
          :on-change="avatar.onChange as never"
          :on-remove="avatar.onRemove"
          :accept="avatar.accept"
          :max-size="avatar.maxSize"
          :output-size="avatar.outputSize"
          :output-type="avatar.outputType"
        />
        <NqAvatar v-else :name="shownName" :src="avatar?.src" class="size-32 text-h1 ring-1 ring-border @3xl:size-56 @3xl:text-display" />
        <div class="flex min-w-0 flex-col gap-1">
          <p dir="auto" class="truncate text-h2 text-foreground">{{ shownName }}</p>
          <p v-if="draft.username" dir="ltr" class="truncate text-start font-mono text-body-sm text-muted-foreground">@{{ draft.username }}</p>
        </div>
        <ul v-if="draft.location?.trim() || site" class="flex list-none flex-col gap-2 p-0 text-body-sm text-foreground">
          <li v-if="draft.location?.trim()" class="flex min-w-0 items-center gap-2">
            <MapPin aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <bdi class="truncate">{{ draft.location.trim() }}</bdi>
          </li>
          <li v-if="site" class="flex min-w-0 items-center gap-2">
            <Globe aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <span dir="ltr" class="truncate">{{ site }}</span>
          </li>
        </ul>
        <NqButton v-if="profileHref" as="a" variant="secondary" class="w-full" :href="profileHref">{{ t.viewProfile }}<ExternalLink /></NqButton>
        <template v-if="draft.bio.trim()">
          <NqSeparator />
          <p dir="auto" class="whitespace-pre-line text-pretty text-body-sm text-nq-fg-body">{{ draft.bio.trim() }}</p>
        </template>
      </aside>

      <div class="flex min-w-0 flex-col gap-6">
        <section :aria-labelledby="ids.public" data-slot="profile-form-group" :class="groupClass">
          <div class="flex flex-col gap-1">
            <h3 :id="ids.public" class="text-h3 text-foreground">{{ t.publicProfile }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.publicProfileHint }}</p>
          </div>
          <div :class="gridClass">
            <NqField :invalid="!!errors.name">
              <NqFieldLabel>{{ t.name }}</NqFieldLabel>
              <NqInput name="name" autocomplete="name" required :disabled="disabled" :model-value="draft.name" @update:model-value="(v) => set('name', String(v ?? ''))" />
              <NqFieldError v-if="errors.name" match>{{ errors.name }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.nameHelp }}</NqFieldDescription>
            </NqField>

            <NqField :invalid="!!errors.username">
              <NqFieldLabel>{{ t.username }}</NqFieldLabel>
              <NqInputGroup dir="ltr">
                <NqInputGroupAddon><NqInputGroupText>@</NqInputGroupText></NqInputGroupAddon>
                <NqInputGroupInput
                  ltr
                  name="username"
                  autocomplete="username"
                  autocapitalize="none"
                  autocorrect="off"
                  :spellcheck="false"
                  :maxlength="30"
                  :disabled="disabled"
                  :aria-invalid="errors.username ? true : undefined"
                  :model-value="draft.username"
                  @update:model-value="(v) => set('username', String(v ?? '').toLowerCase().replace(/[^a-z0-9._-]/g, ''))"
                />
                <NqInputGroupAddon v-if="username.status !== 'idle' && username.status !== 'error'" align="end">
                  <NqSpinner v-if="username.status === 'checking'" />
                  <CircleCheck v-else-if="username.status === 'available'" aria-hidden="true" class="text-nq-success-text" />
                  <CircleX v-else aria-hidden="true" class="text-nq-danger-text" />
                </NqInputGroupAddon>
              </NqInputGroup>
              <NqFieldError v-if="errors.username" match>{{ errors.username }}</NqFieldError>
              <NqFieldDescription aria-live="polite" :class="cn(username.status === 'available' && 'text-nq-success-text')">{{ errors.username ? null : usernameHint }}</NqFieldDescription>
            </NqField>
          </div>

          <NqField :invalid="!!errors.bio">
            <NqFieldLabel>{{ t.bio }}</NqFieldLabel>
            <NqTextarea name="bio" autocomplete="off" :rows="3" :disabled="disabled" :maxlength="bioMaxLength" :model-value="draft.bio" @update:model-value="(v) => set('bio', String(v ?? ''))" />
            <div class="flex items-start justify-between gap-3">
              <NqFieldError v-if="errors.bio" match>{{ errors.bio }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.bioHelp }}</NqFieldDescription>
              <span data-slot="profile-form-counter" dir="ltr" class="shrink-0 text-caption text-muted-foreground tabular-nums">{{ formatNumber(bioLength, locale) }}/{{ formatNumber(bioMaxLength, locale) }}</span>
            </div>
          </NqField>

          <div v-if="draft.location !== undefined || draft.website !== undefined" :class="gridClass">
            <NqField v-if="draft.location !== undefined" :invalid="!!errors.location">
              <NqFieldLabel>{{ t.location }}</NqFieldLabel>
              <NqInput name="location" autocomplete="address-level2" :disabled="disabled" :model-value="draft.location ?? ''" @update:model-value="(v) => set('location', String(v ?? ''))" />
              <NqFieldError v-if="errors.location" match>{{ errors.location }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.locationHelp }}</NqFieldDescription>
            </NqField>
            <NqField v-if="draft.website !== undefined" :invalid="!!errors.website">
              <NqFieldLabel>{{ t.website }}</NqFieldLabel>
              <NqInput ltr type="url" name="website" autocomplete="url" inputmode="url" :spellcheck="false" placeholder="https://" :disabled="disabled" :model-value="draft.website ?? ''" @update:model-value="(v) => set('website', String(v ?? ''))" />
              <NqFieldError v-if="errors.website" match>{{ errors.website }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.websiteHelp }}</NqFieldDescription>
            </NqField>
          </div>
        </section>

        <section :aria-labelledby="ids.account" data-slot="profile-form-group" :class="groupClass">
          <div class="flex flex-col gap-1">
            <h3 :id="ids.account" class="text-h3 text-foreground">{{ t.account }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.accountHint }}</p>
          </div>
          <NqProfileEmailField :email="baseline.email" :verified="emailVerified" :pending="pendingEmail" :disabled="disabled" :t="t" :on-resend="onResendVerification" :on-change="onChangeEmail" @changed="(e) => (pendingEmail = e)" />
          <div :class="gridClass">
            <NqField :invalid="!!errors.phone">
              <NqFieldLabel>{{ t.phone }}</NqFieldLabel>
              <NqPhoneInput name="phone" :disabled="disabled" :invalid="!!errors.phone" :default-country="defaultCountry" :model-value="draft.phone" @update:model-value="(v: string) => set('phone', v)" />
              <NqFieldError v-if="errors.phone" match>{{ errors.phone }}</NqFieldError>
              <NqFieldDescription v-else>{{ t.phoneHelp }}</NqFieldDescription>
            </NqField>
          </div>
        </section>

        <section :aria-labelledby="ids.prefs" data-slot="profile-form-group" :class="groupClass">
          <div class="flex flex-col gap-1">
            <h3 :id="ids.prefs" class="text-h3 text-foreground">{{ t.preferences }}</h3>
            <p class="text-body-sm text-muted-foreground">{{ t.preferencesHint }}</p>
          </div>
          <div :class="gridClass">
            <NqField>
              <NqFieldLabel>{{ t.language }}</NqFieldLabel>
              <NqSelect name="locale" :model-value="draft.locale" :disabled="disabled" @update:model-value="(v) => v && set('locale', String(v))">
                <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
                <NqSelectContent>
                  <NqSelectItem v-for="option in languageOptions" :key="option.value" :value="option.value">{{ option.label }}</NqSelectItem>
                </NqSelectContent>
              </NqSelect>
            </NqField>
            <NqField>
              <NqFieldLabel>{{ t.timezone }}</NqFieldLabel>
              <NqCombobox :items="(zoneOptions as ProfileFormOption[])" :model-value="zone" :disabled="disabled" @update:model-value="(next) => next && set('timezone', (next as ProfileFormOption).value)">
                <NqComboboxInput :clearable="false" :placeholder="t.timezoneSearch" :trigger-label="t.open" :clear-label="t.clear" />
                <NqComboboxContent>
                  <NqComboboxEmpty>{{ t.timezoneEmpty }}</NqComboboxEmpty>
                  <NqComboboxList v-slot="{ items }">
                    <NqComboboxItem v-for="item in (items as ProfileFormOption[])" :key="item.value" :value="item"><bdi>{{ item.label }}</bdi></NqComboboxItem>
                  </NqComboboxList>
                </NqComboboxContent>
              </NqCombobox>
              <input type="hidden" name="timezone" :value="draft.timezone" />
            </NqField>
          </div>
        </section>
      </div>
    </div>

    <span role="status" class="sr-only">{{ dirty ? t.unsaved : (notice ?? "") }}</span>
    <div v-if="dirty" role="region" :aria-label="t.unsaved" data-slot="profile-form-savebar" class="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-floating border border-border bg-popover p-3 text-popover-foreground shadow-floating">
      <p class="flex items-center gap-2 text-body-sm"><TriangleAlert aria-hidden="true" class="size-4 text-nq-warning-text" />{{ t.unsaved }}</p>
      <div class="flex gap-2">
        <NqButton type="button" variant="ghost" :disabled="saving" @click="discard">{{ t.discard }}</NqButton>
        <NqButton type="submit" variant="primary" :loading="saving" :disabled="disabled || blocked">{{ t.save }}</NqButton>
      </div>
    </div>
  </form>
</template>
