<script setup lang="ts">
import { Bell, CircleCheck, CircleDashed, CircleMinus, Mail, Moon, Palette, PartyPopper, Plug, Sparkles, Sun, SunMoon, UserRound, Users } from "lucide-vue-next";
import { computed, onMounted, ref, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAvatarUpload, type AvatarUploadControls } from "../avatar-upload";
import { useAuthLocale, type AuthSubmitResult } from "../auth-layout/auth-utils";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqGitHubLogo, NqGoogleLogo, NqMicrosoftLogo } from "../oauth-buttons";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSetupWizard } from "../setup-wizard";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTagInput } from "../tag-input";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { initialProgress, markCompleted, markSkipped, moveTo, parseInviteEmails, parseProgress, resumeIndex, serializeProgress } from "./onboarding-model";
import { fill, STRINGS, type OnboardingFlowLabels } from "./strings";
import type {
  OnboardingIntegration,
  OnboardingInviteValues,
  OnboardingOption,
  OnboardingPreferenceValues,
  OnboardingProfileValues,
  OnboardingProgressState,
  OnboardingStepResult,
  OnboardingValues,
  OnboardingWorkspaceValues,
} from "./types";

// The flow after sign-up: welcome, profile, workspace, invites, preferences, a first integration and a review.
// It is built on NqSetupWizard (Back, Continue, Skip on optional steps) and keeps progress so a refresh resumes where the person
// left off. It saves nothing itself: each step calls your async callback when they continue. Slot: `done-action` on the completion screen.
interface Props {
  /** The person's name if you know it (from sign-up). It greets them and pre-fills the profile. */
  userName?: string;
  /** Start values for any section. */
  defaultValues?: Partial<OnboardingValues>;
  /** Controlled progress. Pair with `v-model:progress` (or `@update:progress`) to save it on your server. */
  progress?: OnboardingProgressState;
  /** Keeps progress in `localStorage` under this key and resumes from it. Ignored when `progress` is controlled. */
  storageKey?: string;
  /** Saves are called when the person continues past a step. Resolve `{ error }` to stay and show why. */
  onSaveProfile?: (profile: OnboardingProfileValues) => OnboardingStepResult;
  /** Uploads the cropped photo and returns its hosted URL. Without it the photo stays local. */
  onUploadAvatar?: (file: File, controls: AvatarUploadControls) => Promise<string | void>;
  onWorkspace?: (workspace: OnboardingWorkspaceValues) => OnboardingStepResult;
  onInvite?: (invite: OnboardingInviteValues) => OnboardingStepResult;
  onPreferences?: (preferences: OnboardingPreferenceValues) => OnboardingStepResult;
  /** Starts connecting one integration. Resolve `{ error }` if it failed. */
  onConnect?: (integrationId: string) => OnboardingStepResult;
  /** Called on the last step. Resolve `{ error }` if the server refuses. */
  onFinish: (values: OnboardingValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  roles?: readonly OnboardingOption[];
  inviteRoles?: readonly OnboardingOption[];
  integrations?: readonly OnboardingIntegration[];
  /** Steps to leave out, by id: `invite`, `integration`, `preferences`. */
  hideSteps?: readonly ("invite" | "preferences" | "integration")[];
  labels?: Partial<OnboardingFlowLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  userName: undefined,
  defaultValues: undefined,
  progress: undefined,
  storageKey: undefined,
  onSaveProfile: undefined,
  onUploadAvatar: undefined,
  onWorkspace: undefined,
  onInvite: undefined,
  onPreferences: undefined,
  onConnect: undefined,
  roles: undefined,
  inviteRoles: undefined,
  integrations: undefined,
  hideSteps: () => [],
  labels: undefined,
});
const emit = defineEmits<{ "update:progress": [progress: OnboardingProgressState] }>();

const locale = useAuthLocale();
const nasaq = useNasaq();
const t = computed<OnboardingFlowLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const roleOptions = computed(() => props.roles ?? Object.entries(t.value.roles).map(([value, label]) => ({ value, label })));
const inviteRoleOptions = computed(() => props.inviteRoles ?? Object.entries(t.value.inviteRoles).map(([value, label]) => ({ value, label })));
const integrationList = computed<readonly OnboardingIntegration[]>(
  () =>
    props.integrations ?? [
      { id: "github", name: "GitHub", description: t.value.githubDesc, icon: NqGitHubLogo },
      { id: "google", name: "Google", description: t.value.googleDesc, icon: NqGoogleLogo },
      { id: "microsoft", name: "Microsoft", description: t.value.microsoftDesc, icon: NqMicrosoftLogo },
    ],
);
const locales = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

const blankValues = (userName?: string): OnboardingValues => ({
  profile: { name: userName ?? "", role: "" },
  workspace: { mode: "create", name: "", code: "" },
  invite: { emails: [], role: "member" },
  preferences: { locale: "en", theme: "system", notifications: { email: true, push: false, digest: true } },
  connected: [],
});
const mergeValues = (base: OnboardingValues, over?: Partial<OnboardingValues>): OnboardingValues => ({
  ...base,
  ...over,
  profile: { ...base.profile, ...over?.profile },
  workspace: { ...base.workspace, ...over?.workspace },
  invite: { ...base.invite, ...over?.invite },
  preferences: { ...base.preferences, ...over?.preferences, notifications: { ...base.preferences.notifications, ...over?.preferences?.notifications } },
});

const stepIds = computed(() => ["welcome", "profile", "workspace", "invite", "preferences", "integration", "finish"].filter((id) => !(props.hideSteps as readonly string[]).includes(id)));
const base = computed(() => mergeValues(blankValues(props.userName), props.defaultValues));

const start = initialProgress<OnboardingValues>("welcome", base.value);
const inner = ref<OnboardingProgressState>({
  ...start,
  values: { ...start.values, preferences: { ...start.values.preferences, locale: nasaq.locale.value.split("-")[0] ?? start.values.preferences.locale, theme: nasaq.theme.value } },
});
const current = computed(() => props.progress ?? inner.value);
let latest = current.value;
watch(current, (p) => (latest = p), { flush: "sync" });
const resumed = ref(false);
let loaded = false;

const commit = (next: OnboardingProgressState) => {
  latest = next;
  if (props.progress === undefined) inner.value = next;
  emit("update:progress", next);
};
const change = (fn: (p: OnboardingProgressState) => OnboardingProgressState) => commit(fn(latest));
const setValues = (patch: Partial<OnboardingValues>) => change((p) => ({ ...p, values: { ...p.values, ...patch }, updatedAt: Date.now() }));

// Resume after a reload. Read after mount so server and client markup agree.
onMounted(() => {
  if (!props.storageKey || props.progress !== undefined) {
    loaded = true;
    return;
  }
  try {
    const saved = parseProgress<OnboardingValues>(window.localStorage.getItem(props.storageKey), stepIds.value);
    if (saved) {
      const merged = { ...saved, values: mergeValues(base.value, saved.values) };
      latest = merged;
      inner.value = merged;
      emit("update:progress", merged);
      resumed.value = saved.current !== "welcome" || saved.completed.length > 0;
    }
  } catch {
    /* storage blocked: progress just lives in memory */
  }
  loaded = true;
});
watch(
  current,
  (p) => {
    if (!props.storageKey || !loaded || props.progress !== undefined) return;
    try {
      window.localStorage.setItem(props.storageKey, serializeProgress(p));
    } catch {
      /* ignore */
    }
  },
  { deep: true },
);

const v = computed(() => current.value.values);
const errors = ref<Record<string, string>>({});

const validate = (id: string): Record<string, string> => {
  const e: Record<string, string> = {};
  if (id === "profile" && !v.value.profile.name.trim()) e.name = t.value.nameRequired;
  if (id === "workspace") {
    if (v.value.workspace.mode === "create" && !v.value.workspace.name.trim()) e.workspaceName = t.value.workspaceNameRequired;
    if (v.value.workspace.mode === "join" && !v.value.workspace.code.trim()) e.code = t.value.inviteCodeRequired;
  }
  return e;
};

const complete = async (id: string): Promise<AuthSubmitResult> => {
  const found = validate(id);
  errors.value = found;
  if (Object.keys(found).length > 0) return { error: Object.values(found).join(" ") };
  let result: AuthSubmitResult = undefined;
  if (id === "profile") result = (await props.onSaveProfile?.(v.value.profile)) as AuthSubmitResult;
  else if (id === "workspace") result = (await props.onWorkspace?.(v.value.workspace)) as AuthSubmitResult;
  else if (id === "invite") result = (await props.onInvite?.(v.value.invite)) as AuthSubmitResult;
  else if (id === "preferences") result = (await props.onPreferences?.(v.value.preferences)) as AuthSubmitResult;
  if (result?.error) return result;
  change((p) => markCompleted(p, id));
  return undefined;
};

const OPTIONAL = new Set(["invite", "preferences", "integration"]);
const steps = computed(() =>
  stepIds.value.map((id) => {
    const tt = t.value;
    const meta: Record<string, [string, string]> = {
      welcome: [tt.welcome, tt.welcomeDescription],
      profile: [tt.profile, tt.profileDescription],
      workspace: [tt.workspace, tt.workspaceDescription],
      invite: [tt.invite, tt.inviteDescription],
      preferences: [tt.preferences, tt.preferencesDescription],
      integration: [tt.integration, tt.integrationDescription],
      finish: [tt.finish, tt.finishDescription],
    };
    const [title, description] = meta[id]!;
    return { id, title, description, optional: OPTIONAL.has(id) || undefined };
  }),
);

const currentIndex = computed(() => resumeIndex(current.value, stepIds.value));
const onCurrentChange = (index: number, id: string) => {
  const from = stepIds.value[resumeIndex(latest, stepIds.value)];
  const forward = index > stepIds.value.indexOf(from ?? "");
  errors.value = {};
  change((p) => {
    let next = p;
    // Forward past an optional step that was not saved is a skip.
    if (forward && from && steps.value.find((s) => s.id === from)?.optional) next = markSkipped(next, from);
    return moveTo(next, id);
  });
};

const onFinish = async () => {
  const result = await props.onFinish(v.value);
  if (!result?.error && props.storageKey) {
    try {
      window.localStorage.removeItem(props.storageKey);
    } catch {
      /* ignore */
    }
  }
  return result;
};

const startOver = () => {
  commit(initialProgress<OnboardingValues>("welcome", base.value));
  resumed.value = false;
  if (props.storageKey) {
    try {
      window.localStorage.removeItem(props.storageKey);
    } catch {
      /* ignore */
    }
  }
};

// Welcome
const welcomeItems: [string, Component, "welcomeProfile" | "welcomeWorkspace" | "welcomeInvite" | "welcomePrefs" | "welcomeConnect"][] = [
  ["profile", UserRound, "welcomeProfile"],
  ["workspace", Users, "welcomeWorkspace"],
  ["invite", Mail, "welcomeInvite"],
  ["preferences", Palette, "welcomePrefs"],
  ["integration", Plug, "welcomeConnect"],
];
const welcomeName = computed(() => v.value.profile.name || props.userName);

// Profile
const setProfile = (patch: Partial<OnboardingProfileValues>) => setValues({ profile: { ...v.value.profile, ...patch } });
const uploadAvatar = async (file: File, controls: AvatarUploadControls) => {
  const hosted = props.onUploadAvatar ? await props.onUploadAvatar(file, controls) : undefined;
  setProfile({ avatar: hosted || URL.createObjectURL(file) });
};
const removeAvatar = async () => setProfile({ avatar: undefined });

// Workspace
const setWorkspace = (patch: Partial<OnboardingWorkspaceValues>) => setValues({ workspace: { ...v.value.workspace, ...patch } });

// Invite
const setInvite = (patch: Partial<OnboardingInviteValues>) => setValues({ invite: { ...v.value.invite, ...patch } });
const onEmails = (emails: string[]) => {
  // A paste can carry several addresses in one tag: split them and drop the invalid ones.
  setInvite({ emails: parseInviteEmails(emails.join(",")).valid });
};
const validateEmail = (tag: string, tags: readonly string[]) => {
  const p = parseInviteEmails(tag, tags);
  if (p.invalid.length > 0) return fill(t.value.invalidEmail, { email: p.invalid[0] ?? tag });
  if (p.duplicates.length > 0) return fill(t.value.duplicateEmail, { email: p.duplicates[0] ?? tag });
  return true;
};

// Preferences
const setPrefs = (patch: Partial<OnboardingPreferenceValues>) => setValues({ preferences: { ...v.value.preferences, ...patch } });
const notes = computed<[keyof OnboardingPreferenceValues["notifications"], string][]>(() => [
  ["email", t.value.notifyEmail],
  ["push", t.value.notifyPush],
  ["digest", t.value.notifyDigest],
]);
const pickLocale = (next: string[]) => {
  const loc = next[0];
  if (!loc) return;
  setPrefs({ locale: loc });
  nasaq.setLocale(loc);
};
const pickTheme = (next: string[]) => {
  const theme = next[0] as OnboardingPreferenceValues["theme"] | undefined;
  if (!theme) return;
  setPrefs({ theme });
  nasaq.setTheme(theme);
};

// Integration
const pending = ref<string | null>(null);
const failed = ref<string | null>(null);
const connect = async (id: string) => {
  pending.value = id;
  failed.value = null;
  try {
    const result = (await props.onConnect?.(id)) as AuthSubmitResult;
    if (result?.error) failed.value = result.error;
    else setValues({ connected: [...new Set([...latest.values.connected, id])] });
  } catch {
    failed.value = t.value.connectFailed;
  } finally {
    pending.value = null;
  }
};

// Finish
const reviewIds = computed(() => stepIds.value.filter((s) => s !== "welcome" && s !== "finish"));
const reviewTitles = computed<Record<string, string>>(() => ({ profile: t.value.profile, workspace: t.value.workspace, invite: t.value.invite, preferences: t.value.preferences, integration: t.value.integration }));
const skippedAny = computed(() => reviewIds.value.some((id) => !current.value.completed.includes(id)));
const reviewIcon = (id: string) => (current.value.completed.includes(id) ? CircleCheck : current.value.skipped.includes(id) ? CircleMinus : CircleDashed);
const reviewLabel = (id: string) => (current.value.completed.includes(id) ? t.value.stepDone : current.value.skipped.includes(id) ? t.value.stepSkipped : t.value.stepOpen);
</script>

<template>
  <div data-slot="onboarding-flow" :class="props.class">
    <NqSetupWizard
      :steps="steps"
      :current="currentIndex"
      :on-current-change="onCurrentChange"
      :completed="current.completed"
      :on-step-complete="complete"
      :on-finish="onFinish"
      :title="t.title"
      :description="t.description"
      :done-title="t.doneTitle"
      :done-description="t.doneDescription"
    >
      <template #step-welcome>
        <div data-slot="onboarding-welcome" class="flex flex-col gap-4">
          <NqAlert v-if="resumed" tone="info">
            {{ t.resumed }}
            <NqButton variant="link" size="sm" @click="startOver">{{ t.startOver }}</NqButton>
          </NqAlert>
          <div class="flex items-start gap-3">
            <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-nq-selected text-primary">
              <Sparkles aria-hidden="true" class="size-5" />
            </span>
            <div class="flex flex-col gap-1">
              <p class="text-h3 text-foreground">{{ welcomeName ? fill(t.welcomeHeading, { name: welcomeName }) : t.welcomeHeadingAnon }}</p>
              <p class="text-body text-muted-foreground">{{ t.welcomeLead }}</p>
            </div>
          </div>
          <ul class="flex flex-col gap-2">
            <template v-for="[id, icon, label] in welcomeItems" :key="id">
              <li v-if="!(props.hideSteps as readonly string[]).includes(id)" class="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground">
                <component :is="icon" />
                {{ t[label] }}
              </li>
            </template>
          </ul>
        </div>
      </template>

      <template #step-profile>
        <div data-slot="onboarding-profile" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <span class="text-label text-foreground">{{ t.photo }}</span>
            <NqAvatarUpload :name="v.profile.name || '?'" :src="v.profile.avatar" :on-change="uploadAvatar" :on-remove="v.profile.avatar ? removeAvatar : undefined" />
          </div>
          <NqField name="name" :invalid="Boolean(errors.name)">
            <NqFieldLabel>{{ t.fullName }}</NqFieldLabel>
            <NqInput autocomplete="name" :model-value="v.profile.name" :aria-invalid="errors.name ? true : undefined" @update:model-value="setProfile({ name: String($event ?? '') })" />
            <NqFieldError v-if="errors.name" match>{{ errors.name }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.role }}</NqFieldLabel>
            <NqSelect :model-value="v.profile.role || null" @update:model-value="setProfile({ role: String($event ?? '') })">
              <NqSelectTrigger>
                <NqSelectValue :placeholder="t.rolePlaceholder" />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
      </template>

      <template #step-workspace>
        <NqTabs :model-value="v.workspace.mode" data-slot="onboarding-workspace" @update:model-value="setWorkspace({ mode: $event === 'join' ? 'join' : 'create' })">
          <NqTabsList>
            <NqTabsTab value="create">{{ t.create }}</NqTabsTab>
            <NqTabsTab value="join">{{ t.join }}</NqTabsTab>
          </NqTabsList>
          <NqTabsPanel value="create" class="pt-4">
            <NqField name="workspaceName" :invalid="Boolean(errors.workspaceName)">
              <NqFieldLabel>{{ t.workspaceName }}</NqFieldLabel>
              <NqInput autocomplete="organization" :model-value="v.workspace.name" :aria-invalid="errors.workspaceName ? true : undefined" @update:model-value="setWorkspace({ name: String($event ?? '') })" />
              <NqFieldDescription>{{ t.workspaceNameHint }}</NqFieldDescription>
              <NqFieldError v-if="errors.workspaceName" match>{{ errors.workspaceName }}</NqFieldError>
            </NqField>
          </NqTabsPanel>
          <NqTabsPanel value="join" class="pt-4">
            <NqField name="code" :invalid="Boolean(errors.code)">
              <NqFieldLabel>{{ t.inviteCode }}</NqFieldLabel>
              <NqInput ltr autocapitalize="characters" autocomplete="off" :model-value="v.workspace.code" :aria-invalid="errors.code ? true : undefined" @update:model-value="setWorkspace({ code: String($event ?? '').toUpperCase() })" />
              <NqFieldDescription>{{ t.inviteCodeHint }}</NqFieldDescription>
              <NqFieldError v-if="errors.code" match>{{ errors.code }}</NqFieldError>
            </NqField>
          </NqTabsPanel>
        </NqTabs>
      </template>

      <template #step-invite>
        <div data-slot="onboarding-invite" class="flex flex-col gap-4">
          <NqField>
            <NqFieldLabel>{{ t.emails }}</NqFieldLabel>
            <NqTagInput :model-value="v.invite.emails" :validate="validateEmail" :placeholder="t.emailsPlaceholder" :input-props="{ type: 'email', dir: 'ltr', 'aria-label': t.emails }" @update:model-value="onEmails" />
            <NqFieldDescription>{{ t.emailsHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.inviteRole }}</NqFieldLabel>
            <NqSelect :model-value="v.invite.role" @update:model-value="$event && setInvite({ role: String($event) })">
              <NqSelectTrigger>
                <NqSelectValue />
              </NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="r in inviteRoleOptions" :key="r.value" :value="r.value">{{ r.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <p v-if="v.invite.emails.length > 0" class="text-caption text-muted-foreground">{{ fill(t.invitesCount, { count: v.invite.emails.length }) }}</p>
        </div>
      </template>

      <template #step-preferences>
        <div data-slot="onboarding-preferences" class="flex flex-col gap-5">
          <div class="flex flex-col gap-1.5">
            <span id="onb-lang" class="text-label text-foreground">{{ t.language }}</span>
            <NqToggleGroup aria-labelledby="onb-lang" :model-value="[v.preferences.locale]" @update:model-value="pickLocale">
              <NqToggle v-for="l in locales" :key="l.value" :value="l.value">{{ l.label }}</NqToggle>
            </NqToggleGroup>
          </div>
          <div class="flex flex-col gap-1.5">
            <span id="onb-theme" class="text-label text-foreground">{{ t.theme }}</span>
            <NqToggleGroup aria-labelledby="onb-theme" :model-value="[v.preferences.theme]" @update:model-value="pickTheme">
              <NqToggle value="light">
                <Sun aria-hidden="true" />
                {{ t.themeLight }}
              </NqToggle>
              <NqToggle value="dark">
                <Moon aria-hidden="true" />
                {{ t.themeDark }}
              </NqToggle>
              <NqToggle value="system">
                <SunMoon aria-hidden="true" />
                {{ t.themeSystem }}
              </NqToggle>
            </NqToggleGroup>
          </div>
          <div class="flex flex-col gap-2">
            <span class="flex items-center gap-1.5 text-label text-foreground">
              <Bell aria-hidden="true" class="size-4 text-muted-foreground" />
              {{ t.notifications }}
            </span>
            <label v-for="[key, label] in notes" :key="key" class="flex items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground">
              {{ label }}
              <NqSwitch :model-value="v.preferences.notifications[key]" @update:model-value="setPrefs({ notifications: { ...v.preferences.notifications, [key]: $event } })" />
            </label>
          </div>
        </div>
      </template>

      <template #step-integration>
        <div data-slot="onboarding-integration" class="flex flex-col gap-2">
          <NqAlert v-if="failed" tone="danger">{{ failed }}</NqAlert>
          <ul class="flex flex-col gap-2">
            <li v-for="i in integrationList" :key="i.id" class="flex items-center gap-3 rounded-card border border-border bg-card p-3">
              <span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-background">
                <component :is="i.icon" v-if="i.icon" />
                <Plug v-else class="size-4" />
              </span>
              <span class="flex min-w-0 flex-1 flex-col text-start">
                <span class="truncate text-label text-foreground">{{ i.name }}</span>
                <span v-if="i.description" class="truncate text-caption text-muted-foreground">{{ i.description }}</span>
              </span>
              <NqBadge v-if="v.connected.includes(i.id)" variant="success">
                <CircleCheck aria-hidden="true" />
                {{ t.connected }}
              </NqBadge>
              <NqButton v-else variant="secondary" size="sm" :loading="pending === i.id" :disabled="pending !== null" :aria-label="`${t.connect} ${i.name}`" @click="connect(i.id)">{{ t.connect }}</NqButton>
            </li>
          </ul>
        </div>
      </template>

      <template #step-finish>
        <div data-slot="onboarding-finish" class="flex flex-col gap-3">
          <div class="flex items-center gap-2 text-label text-foreground">
            <PartyPopper aria-hidden="true" class="size-4 text-primary" />
            {{ t.review }}
          </div>
          <ul class="flex flex-col gap-2">
            <li v-for="id in reviewIds" :key="id" class="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2">
              <component :is="reviewIcon(id)" aria-hidden="true" :class="cn('size-4 shrink-0', current.completed.includes(id) ? 'text-nq-success-text' : 'text-muted-foreground')" />
              <span class="flex-1 text-body text-foreground">{{ reviewTitles[id] ?? id }}</span>
              <span class="text-caption text-muted-foreground">{{ reviewLabel(id) }}</span>
            </li>
          </ul>
          <p v-if="skippedAny" class="text-caption text-muted-foreground">{{ t.later }}</p>
        </div>
      </template>

      <template #done-action><slot name="done-action" /></template>
    </NqSetupWizard>
  </div>
</template>
