"use client";

import { Bell, CircleCheck, CircleDashed, Mail, MinusCircle, Moon, Palette, PartyPopper, Plug, Sparkles, Sun, SunMoon, UserRound, Users } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { type AuthSubmitResult, useAuthLocale } from "../auth-layout/auth-utils";
import { AvatarUpload, type AvatarUploadControls } from "../avatar-upload";
import { Badge } from "../badge";
import { Button } from "../button";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { GitHubLogo, GoogleLogo, MicrosoftLogo } from "../oauth-buttons/oauth-logos";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { SetupWizard, type SetupStep } from "../setup-wizard";
import { Switch } from "../switch";
import { TagInput } from "../tag-input";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type OnboardingProgress,
  initialProgress,
  markCompleted,
  markSkipped,
  moveTo,
  parseInviteEmails,
  parseProgress,
  resumeIndex,
  serializeProgress,
} from "./onboarding-model";

const STRINGS = {
  en: {
    title: "Set up your account",
    description: "A few quick steps and you are ready. You can skip the optional ones and finish them later.",
    welcome: "Welcome",
    welcomeDescription: "Here is what we will do together.",
    welcomeHeading: "Welcome, {name}",
    welcomeHeadingAnon: "Welcome aboard",
    welcomeLead: "Setting up takes about three minutes. Your progress is saved, so you can leave and come back.",
    welcomeProfile: "Tell us who you are",
    welcomeWorkspace: "Create or join a workspace",
    welcomeInvite: "Bring your team",
    welcomePrefs: "Choose how it looks and feels",
    welcomeConnect: "Connect your first tool",
    resumed: "Welcome back. We saved your place.",
    startOver: "Start over",
    profile: "Your profile",
    profileDescription: "This is how teammates see you.",
    photo: "Profile photo",
    fullName: "Full name",
    nameRequired: "Enter your name.",
    role: "Your role",
    rolePlaceholder: "Choose a role",
    workspace: "Your workspace",
    workspaceDescription: "Create a new one or join your team's.",
    create: "Create a workspace",
    join: "Join with a code",
    workspaceName: "Workspace name",
    workspaceNameHint: "Your company or team. You can rename it later.",
    workspaceNameRequired: "Enter a workspace name.",
    inviteCode: "Invite code",
    inviteCodeHint: "Ask a workspace admin. It looks like ABCD-1234.",
    inviteCodeRequired: "Enter the invite code.",
    invite: "Invite teammates",
    inviteDescription: "They get an email with a link to join.",
    emails: "Email addresses",
    emailsHint: "Press Enter or comma after each one. Pasting a list works too.",
    emailsPlaceholder: "name@company.com",
    inviteRole: "Invite them as",
    invalidEmail: "{email} is not an email address.",
    duplicateEmail: "{email} is already added.",
    invitesCount: "{count} to invite",
    preferences: "Preferences",
    preferencesDescription: "Change these any time in settings.",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    notifications: "Notifications",
    notifyEmail: "Email me about activity",
    notifyPush: "Push notifications on this device",
    notifyDigest: "Send a weekly summary",
    integration: "Connect a tool",
    integrationDescription: "Pick the first place your work comes from.",
    connect: "Connect",
    connected: "Connected",
    connectFailed: "Could not connect. Try again.",
    finish: "All set",
    finishDescription: "Review what you did.",
    review: "Your setup",
    stepDone: "Done",
    stepSkipped: "Skipped",
    stepOpen: "Not done",
    later: "You can finish skipped steps from the Get started checklist.",
    doneTitle: "You are ready",
    doneDescription: "Your workspace is set up. Head in and look around.",
    optional: "Optional",
    errorTitle: "Fix these to continue",
    failed: "Something went wrong. Try again.",
    roles: { design: "Design", engineering: "Engineering", product: "Product", marketing: "Marketing", operations: "Operations", other: "Other" },
    inviteRoles: { member: "Member", admin: "Admin", viewer: "Viewer" },
    googleDesc: "Calendar and contacts",
    githubDesc: "Repositories and pull requests",
    microsoftDesc: "Outlook and Teams",
  },
  ar: {
    title: "أعدّ حسابك",
    description: "بضع خطوات سريعة وتصبح جاهزًا. يمكنك تخطي الاختيارية وإكمالها لاحقًا.",
    welcome: "أهلًا بك",
    welcomeDescription: "هذا ما سنفعله معًا.",
    welcomeHeading: "أهلًا بك يا {name}",
    welcomeHeadingAnon: "أهلًا بك معنا",
    welcomeLead: "يستغرق الإعداد نحو ثلاث دقائق. تقدّمك محفوظ، فيمكنك المغادرة والعودة.",
    welcomeProfile: "عرّفنا بنفسك",
    welcomeWorkspace: "أنشئ مساحة عمل أو انضم إلى واحدة",
    welcomeInvite: "ادعُ فريقك",
    welcomePrefs: "اختر شكل التطبيق وسلوكه",
    welcomeConnect: "اربط أول أداة",
    resumed: "أهلًا بعودتك. حفظنا مكانك.",
    startOver: "ابدأ من جديد",
    profile: "ملفك الشخصي",
    profileDescription: "هكذا يراك زملاؤك.",
    photo: "الصورة الشخصية",
    fullName: "الاسم الكامل",
    nameRequired: "أدخل اسمك.",
    role: "دورك",
    rolePlaceholder: "اختر دورًا",
    workspace: "مساحة عملك",
    workspaceDescription: "أنشئ مساحة جديدة أو انضم إلى مساحة فريقك.",
    create: "أنشئ مساحة عمل",
    join: "انضم برمز",
    workspaceName: "اسم مساحة العمل",
    workspaceNameHint: "شركتك أو فريقك. يمكنك تغييره لاحقًا.",
    workspaceNameRequired: "أدخل اسم مساحة العمل.",
    inviteCode: "رمز الدعوة",
    inviteCodeHint: "اطلبه من مسؤول مساحة العمل. يبدو هكذا ABCD-1234.",
    inviteCodeRequired: "أدخل رمز الدعوة.",
    invite: "ادعُ زملاءك",
    inviteDescription: "يصلهم بريد فيه رابط الانضمام.",
    emails: "عناوين البريد",
    emailsHint: "اضغط Enter أو الفاصلة بعد كل عنوان. ولصق قائمة يعمل أيضًا.",
    emailsPlaceholder: "name@company.com",
    inviteRole: "ادعُهم بصفة",
    invalidEmail: "{email} ليس عنوان بريد صالحًا.",
    duplicateEmail: "{email} مضاف بالفعل.",
    invitesCount: "{count} دعوة",
    preferences: "التفضيلات",
    preferencesDescription: "غيّرها في أي وقت من الإعدادات.",
    language: "اللغة",
    theme: "المظهر",
    themeLight: "فاتح",
    themeDark: "داكن",
    themeSystem: "النظام",
    notifications: "الإشعارات",
    notifyEmail: "راسلني عن النشاط",
    notifyPush: "إشعارات فورية على هذا الجهاز",
    notifyDigest: "أرسل ملخصًا أسبوعيًا",
    integration: "اربط أداة",
    integrationDescription: "اختر أول مكان يأتي منه عملك.",
    connect: "اربط",
    connected: "مربوط",
    connectFailed: "تعذّر الربط. حاول مرة أخرى.",
    finish: "كل شيء جاهز",
    finishDescription: "راجع ما أنجزته.",
    review: "إعدادك",
    stepDone: "تم",
    stepSkipped: "تم تخطيها",
    stepOpen: "لم تتم",
    later: "يمكنك إكمال الخطوات المتخطاة من قائمة ابدأ.",
    doneTitle: "أنت جاهز",
    doneDescription: "تم إعداد مساحة عملك. ادخل وتجوّل.",
    optional: "اختياري",
    errorTitle: "أصلح هذه الحقول للمتابعة",
    failed: "حدث خطأ ما. حاول مرة أخرى.",
    roles: { design: "التصميم", engineering: "الهندسة", product: "المنتج", marketing: "التسويق", operations: "العمليات", other: "أخرى" },
    inviteRoles: { member: "عضو", admin: "مسؤول", viewer: "مشاهد" },
    googleDesc: "التقويم وجهات الاتصال",
    githubDesc: "المستودعات وطلبات الدمج",
    microsoftDesc: "Outlook وTeams",
  },
};

export type OnboardingFlowLabels = (typeof STRINGS)["en"];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface OnboardingProfileValues {
  name: string;
  role: string;
  /** Hosted URL of the photo, once uploaded. */
  avatar?: string;
}

export interface OnboardingWorkspaceValues {
  mode: "create" | "join";
  name: string;
  code: string;
}

export interface OnboardingInviteValues {
  emails: string[];
  role: string;
}

export interface OnboardingPreferenceValues {
  locale: string;
  theme: "light" | "dark" | "system";
  notifications: { email: boolean; push: boolean; digest: boolean };
}

export interface OnboardingValues {
  profile: OnboardingProfileValues;
  workspace: OnboardingWorkspaceValues;
  invite: OnboardingInviteValues;
  preferences: OnboardingPreferenceValues;
  /** Ids of the integrations already connected. */
  connected: string[];
}

export type OnboardingProgressState = OnboardingProgress<OnboardingValues>;

export interface OnboardingIntegration {
  id: string;
  name: string;
  description?: string;
  /** Your provider mark, rendered as is. Use the brand's own logo. */
  icon?: ReactNode;
}

export interface OnboardingOption {
  value: string;
  label: string;
}

type StepResult = AuthSubmitResult | Promise<AuthSubmitResult> | void | Promise<void>;

export interface OnboardingFlowProps extends Omit<ComponentProps<"div">, "children" | "title" | "defaultValue"> {
  /** The person's name if you know it (from sign-up). It greets them and pre-fills the profile. */
  userName?: string;
  /** Start values for any section. */
  defaultValues?: Partial<OnboardingValues>;
  /** Controlled progress. Pair with `onProgressChange` to save it on your server. */
  progress?: OnboardingProgressState;
  onProgressChange?: (progress: OnboardingProgressState) => void;
  /** Keeps progress in `localStorage` under this key and resumes from it. Ignored when `progress` is controlled. */
  storageKey?: string;
  /** Saves are called when the person continues past a step. Resolve `{ error }` to stay and show why. */
  onSaveProfile?: (profile: OnboardingProfileValues) => StepResult;
  /** Uploads the cropped photo and returns its hosted URL. Without it the photo stays local. */
  onUploadAvatar?: (file: File, controls: AvatarUploadControls) => Promise<string | void>;
  onWorkspace?: (workspace: OnboardingWorkspaceValues) => StepResult;
  onInvite?: (invite: OnboardingInviteValues) => StepResult;
  onPreferences?: (preferences: OnboardingPreferenceValues) => StepResult;
  /** Starts connecting one integration. Resolve `{ error }` if it failed. */
  onConnect?: (integrationId: string) => StepResult;
  /** Called on the last step. Resolve `{ error }` if the server refuses. */
  onFinish: (values: OnboardingValues) => Promise<AuthSubmitResult> | AuthSubmitResult;
  roles?: readonly OnboardingOption[];
  inviteRoles?: readonly OnboardingOption[];
  integrations?: readonly OnboardingIntegration[];
  /** Button or link on the completion screen. */
  doneAction?: ReactNode;
  /** Steps to leave out, by id: `invite`, `integration`, `preferences`. */
  hideSteps?: readonly ("invite" | "preferences" | "integration")[];
  labels?: Partial<OnboardingFlowLabels>;
}

const blankValues = (userName?: string): OnboardingValues => ({
  profile: { name: userName ?? "", role: "" },
  workspace: { mode: "create", name: "", code: "" },
  invite: { emails: [], role: "member" },
  preferences: { locale: "en", theme: "system", notifications: { email: true, push: false, digest: true } },
  connected: [],
});

const mergeValues = (base: OnboardingValues, over?: Partial<OnboardingValues>): OnboardingValues => ({ ...base, ...over, profile: { ...base.profile, ...over?.profile }, workspace: { ...base.workspace, ...over?.workspace }, invite: { ...base.invite, ...over?.invite }, preferences: { ...base.preferences, ...over?.preferences, notifications: { ...base.preferences.notifications, ...over?.preferences?.notifications } } });

/**
 * The flow after sign-up: welcome, profile, workspace, invites, preferences, a first integration and a review.
 * It is built on `SetupWizard` (Back, Continue, Skip on optional steps) and keeps progress so a refresh resumes
 * where the person left off. It saves nothing itself: each step calls your async callback when they continue.
 */
export function OnboardingFlow({
  userName,
  defaultValues,
  progress: progressProp,
  onProgressChange,
  storageKey,
  onSaveProfile,
  onUploadAvatar,
  onWorkspace,
  onInvite,
  onPreferences,
  onConnect,
  onFinish,
  roles: rolesProp,
  inviteRoles: inviteRolesProp,
  integrations: integrationsProp,
  doneAction,
  hideSteps = [],
  labels: labelsProp,
  ...props
}: OnboardingFlowProps) {
  const t = { ...STRINGS[useAuthLocale()], ...labelsProp };
  const roles = rolesProp ?? Object.entries(t.roles).map(([value, label]) => ({ value, label }));
  const inviteRoles = inviteRolesProp ?? Object.entries(t.inviteRoles).map(([value, label]) => ({ value, label }));
  const integrations: readonly OnboardingIntegration[] = integrationsProp ?? [
    { id: "github", name: "GitHub", description: t.githubDesc, icon: <GitHubLogo className="size-5" /> },
    { id: "google", name: "Google", description: t.googleDesc, icon: <GoogleLogo className="size-5" /> },
    { id: "microsoft", name: "Microsoft", description: t.microsoftDesc, icon: <MicrosoftLogo className="size-5" /> },
  ];
  const nasaq = useOptionalNasaq();

  const stepIds = useMemo(() => ["welcome", "profile", "workspace", "invite", "preferences", "integration", "finish"].filter((id) => !(hideSteps as readonly string[]).includes(id)), [hideSteps]);
  const base = useMemo(() => mergeValues(blankValues(userName), defaultValues), [userName, defaultValues]);
  const [inner, setInner] = useState<OnboardingProgressState>(() => {
    const start = initialProgress<OnboardingValues>("welcome", base);
    return { ...start, values: { ...start.values, preferences: { ...start.values.preferences, locale: nasaq?.locale ?? start.values.preferences.locale, theme: nasaq?.theme ?? start.values.preferences.theme } } };
  });
  const progress = progressProp ?? inner;
  const latest = useRef(progress);
  latest.current = progress;
  const [resumed, setResumed] = useState(false);
  const loaded = useRef(false);

  const commit = (next: OnboardingProgressState) => {
    latest.current = next;
    if (progressProp === undefined) setInner(next);
    onProgressChange?.(next);
  };
  const change = (fn: (p: OnboardingProgressState) => OnboardingProgressState) => commit(fn(latest.current));
  const setValues = (patch: Partial<OnboardingValues>) => change((p) => ({ ...p, values: { ...p.values, ...patch }, updatedAt: Date.now() }));

  // Resume after a reload. Read after mount so server and client markup agree.
  useEffect(() => {
    if (!storageKey || progressProp !== undefined) {
      loaded.current = true;
      return;
    }
    try {
      const saved = parseProgress<OnboardingValues>(window.localStorage.getItem(storageKey), stepIds);
      if (saved) {
        const merged = { ...saved, values: mergeValues(base, saved.values) };
        latest.current = merged;
        setInner(merged);
        onProgressChange?.(merged);
        setResumed(saved.current !== "welcome" || saved.completed.length > 0);
      }
    } catch {
      /* storage blocked: progress just lives in memory */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !loaded.current || progressProp !== undefined) return;
    try {
      window.localStorage.setItem(storageKey, serializeProgress(progress));
    } catch {
      /* ignore */
    }
  }, [storageKey, progress, progressProp]);

  const v = progress.values;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (id: string): Record<string, string> => {
    const e: Record<string, string> = {};
    if (id === "profile" && !v.profile.name.trim()) e.name = t.nameRequired;
    if (id === "workspace") {
      if (v.workspace.mode === "create" && !v.workspace.name.trim()) e.workspaceName = t.workspaceNameRequired;
      if (v.workspace.mode === "join" && !v.workspace.code.trim()) e.code = t.inviteCodeRequired;
    }
    return e;
  };

  const complete = async (id: string): Promise<AuthSubmitResult> => {
    const found = validate(id);
    setErrors(found);
    if (Object.keys(found).length > 0) return { error: Object.values(found).join(" ") };
    let result: AuthSubmitResult = undefined;
    if (id === "profile") result = (await onSaveProfile?.(v.profile)) as AuthSubmitResult;
    else if (id === "workspace") result = (await onWorkspace?.(v.workspace)) as AuthSubmitResult;
    else if (id === "invite") result = (await onInvite?.(v.invite)) as AuthSubmitResult;
    else if (id === "preferences") result = (await onPreferences?.(v.preferences)) as AuthSubmitResult;
    if (result?.error) return result;
    change((p) => markCompleted(p, id));
    return undefined;
  };

  const steps: SetupStep[] = stepIds.map((id): SetupStep => {
    switch (id) {
      case "welcome":
        return { id, title: t.welcome, description: t.welcomeDescription, content: <WelcomeStep t={t} name={v.profile.name || userName} hidden={hideSteps} resumed={resumed} onStartOver={() => { commit(initialProgress<OnboardingValues>("welcome", base)); setResumed(false); if (storageKey) try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ } }} /> };
      case "profile":
        return { id, title: t.profile, description: t.profileDescription, content: <ProfileStep t={t} value={v.profile} roles={roles} errors={errors} onUpload={onUploadAvatar} onChange={(profile) => setValues({ profile })} /> };
      case "workspace":
        return { id, title: t.workspace, description: t.workspaceDescription, content: <WorkspaceStep t={t} value={v.workspace} errors={errors} onChange={(workspace) => setValues({ workspace })} /> };
      case "invite":
        return { id, title: t.invite, description: t.inviteDescription, optional: true, content: <InviteStep t={t} value={v.invite} roles={inviteRoles} onChange={(invite) => setValues({ invite })} /> };
      case "preferences":
        return {
          id,
          title: t.preferences,
          description: t.preferencesDescription,
          optional: true,
          content: <PreferencesStep t={t} value={v.preferences} onChange={(preferences) => setValues({ preferences })} />,
        };
      case "integration":
        return { id, title: t.integration, description: t.integrationDescription, optional: true, content: <IntegrationStep t={t} integrations={integrations} connected={v.connected} onConnect={onConnect} onConnected={(cid) => setValues({ connected: [...new Set([...latest.current.values.connected, cid])] })} /> };
      default:
        return { id, title: t.finish, description: t.finishDescription, content: <FinishStep t={t} ids={stepIds.filter((s) => s !== "welcome" && s !== "finish")} titles={{ profile: t.profile, workspace: t.workspace, invite: t.invite, preferences: t.preferences, integration: t.integration }} progress={progress} /> };
    }
  });

  const currentIndex = resumeIndex(progress, stepIds);
  const onCurrentChange = (index: number, id: string) => {
    const from = stepIds[resumeIndex(latest.current, stepIds)];
    const forward = index > stepIds.indexOf(from ?? "");
    setErrors({});
    change((p) => {
      let next = p;
      // Forward past an optional step that was not saved is a skip.
      if (forward && from && steps.find((s) => s.id === from)?.optional) next = markSkipped(next, from);
      return moveTo(next, id);
    });
  };

  return (
    <div data-slot="onboarding-flow" {...props}>
      <SetupWizard
        steps={steps}
        current={currentIndex}
        onCurrentChange={onCurrentChange}
        completed={progress.completed}
        onStepComplete={complete}
        onFinish={async () => {
          const result = await onFinish(v);
          if (!result?.error && storageKey) {
            try {
              window.localStorage.removeItem(storageKey);
            } catch {
              /* ignore */
            }
          }
          return result;
        }}
        title={t.title}
        description={t.description}
        doneTitle={t.doneTitle}
        doneDescription={t.doneDescription}
        doneAction={doneAction}
      />
    </div>
  );
}

type T = OnboardingFlowLabels;

function WelcomeStep({ t, name, hidden, resumed, onStartOver }: { t: T; name?: string; hidden: readonly string[]; resumed: boolean; onStartOver: () => void }) {
  const items: [string, ReactNode, string][] = [
    ["profile", <UserRound key="p" />, t.welcomeProfile],
    ["workspace", <Users key="w" />, t.welcomeWorkspace],
    ["invite", <Mail key="i" />, t.welcomeInvite],
    ["preferences", <Palette key="pr" />, t.welcomePrefs],
    ["integration", <Plug key="c" />, t.welcomeConnect],
  ];
  return (
    <div data-slot="onboarding-welcome" className="flex flex-col gap-4">
      {resumed ? (
        <Alert tone="info">
          {t.resumed}{" "}
          <Button variant="link" size="sm" onClick={onStartOver}>
            {t.startOver}
          </Button>
        </Alert>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-nq-selected text-primary">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-h3 text-foreground">{name ? fill(t.welcomeHeading, { name }) : t.welcomeHeadingAnon}</p>
          <p className="text-body text-muted-foreground">{t.welcomeLead}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {items
          .filter(([id]) => !hidden.includes(id))
          .map(([id, icon, label]) => (
            <li key={id} className="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground">
              {icon}
              {label}
            </li>
          ))}
      </ul>
    </div>
  );
}

function ProfileStep({ t, value, roles, errors, onUpload, onChange }: { t: T; value: OnboardingProfileValues; roles: readonly OnboardingOption[]; errors: Record<string, string>; onUpload?: OnboardingFlowProps["onUploadAvatar"]; onChange: (v: OnboardingProfileValues) => void }) {
  return (
    <div data-slot="onboarding-profile" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-label text-foreground">{t.photo}</span>
        <AvatarUpload
          name={value.name || "?"}
          src={value.avatar}
          onChange={async (file, controls) => {
            const hosted = onUpload ? await onUpload(file, controls) : undefined;
            onChange({ ...value, avatar: hosted || URL.createObjectURL(file) });
          }}
          onRemove={value.avatar ? async () => onChange({ ...value, avatar: undefined }) : undefined}
        />
      </div>
      <Field name="name" invalid={Boolean(errors.name)}>
        <FieldLabel>{t.fullName}</FieldLabel>
        <Input autoComplete="name" value={value.name} aria-invalid={errors.name ? true : undefined} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        {errors.name ? <FieldError match>{errors.name}</FieldError> : null}
      </Field>
      <Field>
        <FieldLabel>{t.role}</FieldLabel>
        <Select items={roles.map((r) => ({ value: r.value, label: r.label }))} value={value.role || null} onValueChange={(next) => onChange({ ...value, role: String(next ?? "") })}>
          <SelectTrigger>
            <SelectValue placeholder={t.rolePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function WorkspaceStep({ t, value, errors, onChange }: { t: T; value: OnboardingWorkspaceValues; errors: Record<string, string>; onChange: (v: OnboardingWorkspaceValues) => void }) {
  return (
    <Tabs value={value.mode} onValueChange={(mode) => onChange({ ...value, mode: mode === "join" ? "join" : "create" })} data-slot="onboarding-workspace">
      <TabsList>
        <TabsTab value="create">{t.create}</TabsTab>
        <TabsTab value="join">{t.join}</TabsTab>
      </TabsList>
      <TabsPanel value="create" className="pt-4">
        <Field name="workspaceName" invalid={Boolean(errors.workspaceName)}>
          <FieldLabel>{t.workspaceName}</FieldLabel>
          <Input autoComplete="organization" value={value.name} aria-invalid={errors.workspaceName ? true : undefined} onChange={(e) => onChange({ ...value, name: e.target.value })} />
          <FieldDescription>{t.workspaceNameHint}</FieldDescription>
          {errors.workspaceName ? <FieldError match>{errors.workspaceName}</FieldError> : null}
        </Field>
      </TabsPanel>
      <TabsPanel value="join" className="pt-4">
        <Field name="code" invalid={Boolean(errors.code)}>
          <FieldLabel>{t.inviteCode}</FieldLabel>
          <Input ltr autoCapitalize="characters" autoComplete="off" value={value.code} aria-invalid={errors.code ? true : undefined} onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })} />
          <FieldDescription>{t.inviteCodeHint}</FieldDescription>
          {errors.code ? <FieldError match>{errors.code}</FieldError> : null}
        </Field>
      </TabsPanel>
    </Tabs>
  );
}

function InviteStep({ t, value, roles, onChange }: { t: T; value: OnboardingInviteValues; roles: readonly OnboardingOption[]; onChange: (v: OnboardingInviteValues) => void }) {
  return (
    <div data-slot="onboarding-invite" className="flex flex-col gap-4">
      <Field>
        <FieldLabel>{t.emails}</FieldLabel>
        <TagInput
          value={value.emails}
          onValueChange={(emails) => {
            // A paste can carry several addresses in one tag: split them and drop the invalid ones.
            const parsed = parseInviteEmails(emails.join(","));
            onChange({ ...value, emails: parsed.valid });
          }}
          validate={(tag, tags) => {
            const p = parseInviteEmails(tag, tags);
            if (p.invalid.length > 0) return fill(t.invalidEmail, { email: p.invalid[0] ?? tag });
            if (p.duplicates.length > 0) return fill(t.duplicateEmail, { email: p.duplicates[0] ?? tag });
            return true;
          }}
          placeholder={t.emailsPlaceholder}
          inputProps={{ type: "email", dir: "ltr", "aria-label": t.emails }}
        />
        <FieldDescription>{t.emailsHint}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel>{t.inviteRole}</FieldLabel>
        <Select items={roles.map((r) => ({ value: r.value, label: r.label }))} value={value.role} onValueChange={(role) => role && onChange({ ...value, role: String(role) })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {value.emails.length > 0 ? <p className="text-caption text-muted-foreground">{fill(t.invitesCount, { count: value.emails.length })}</p> : null}
    </div>
  );
}

function PreferencesStep({ t, value, onChange }: { t: T; value: OnboardingPreferenceValues; onChange: (v: OnboardingPreferenceValues) => void }) {
  const nasaq = useOptionalNasaq();
  const locales = nasaq?.locales ?? [
    { value: "en", label: "English" },
    { value: "ar", label: "العربية" },
  ];
  const notes: [keyof OnboardingPreferenceValues["notifications"], string][] = [
    ["email", t.notifyEmail],
    ["push", t.notifyPush],
    ["digest", t.notifyDigest],
  ];
  return (
    <div data-slot="onboarding-preferences" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span id="onb-lang" className="text-label text-foreground">
          {t.language}
        </span>
        <ToggleGroup
          aria-labelledby="onb-lang"
          value={[value.locale]}
          onValueChange={(next) => {
            const locale = next[0];
            if (!locale) return;
            onChange({ ...value, locale });
            nasaq?.setLocale(locale);
          }}
        >
          {locales.map((l) => (
            <Toggle key={l.value} value={l.value}>
              {l.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-1.5">
        <span id="onb-theme" className="text-label text-foreground">
          {t.theme}
        </span>
        <ToggleGroup
          aria-labelledby="onb-theme"
          value={[value.theme]}
          onValueChange={(next) => {
            const theme = next[0] as OnboardingPreferenceValues["theme"] | undefined;
            if (!theme) return;
            onChange({ ...value, theme });
            nasaq?.setTheme(theme);
          }}
        >
          <Toggle value="light">
            <Sun aria-hidden="true" />
            {t.themeLight}
          </Toggle>
          <Toggle value="dark">
            <Moon aria-hidden="true" />
            {t.themeDark}
          </Toggle>
          <Toggle value="system">
            <SunMoon aria-hidden="true" />
            {t.themeSystem}
          </Toggle>
        </ToggleGroup>
      </div>
      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 text-label text-foreground">
          <Bell aria-hidden="true" className="size-4 text-muted-foreground" />
          {t.notifications}
        </span>
        {notes.map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2 text-body text-foreground">
            {label}
            <Switch checked={value.notifications[key]} onCheckedChange={(checked) => onChange({ ...value, notifications: { ...value.notifications, [key]: checked } })} />
          </label>
        ))}
      </div>
    </div>
  );
}

function IntegrationStep({ t, integrations, connected, onConnect, onConnected }: { t: T; integrations: readonly OnboardingIntegration[]; connected: readonly string[]; onConnect?: OnboardingFlowProps["onConnect"]; onConnected: (id: string) => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const connect = async (id: string) => {
    setPending(id);
    setFailed(null);
    try {
      const result = (await onConnect?.(id)) as AuthSubmitResult;
      if (result?.error) setFailed(result.error);
      else onConnected(id);
    } catch {
      setFailed(t.connectFailed);
    } finally {
      setPending(null);
    }
  };
  return (
    <div data-slot="onboarding-integration" className="flex flex-col gap-2">
      {failed ? <Alert tone="danger">{failed}</Alert> : null}
      <ul className="flex flex-col gap-2">
        {integrations.map((i) => {
          const isOn = connected.includes(i.id);
          return (
            <li key={i.id} className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
              <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-border bg-background">
                {i.icon ?? <Plug className="size-4" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-start">
                <span className="truncate text-label text-foreground">{i.name}</span>
                {i.description ? <span className="truncate text-caption text-muted-foreground">{i.description}</span> : null}
              </span>
              {isOn ? (
                <Badge variant="success">
                  <CircleCheck aria-hidden="true" />
                  {t.connected}
                </Badge>
              ) : (
                <Button variant="secondary" size="sm" loading={pending === i.id} disabled={pending !== null} onClick={() => void connect(i.id)} aria-label={`${t.connect} ${i.name}`}>
                  {t.connect}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FinishStep({ t, ids, titles, progress }: { t: T; ids: string[]; titles: Record<string, string>; progress: OnboardingProgressState }) {
  const skippedAny = ids.some((id) => !progress.completed.includes(id));
  return (
    <div data-slot="onboarding-finish" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-label text-foreground">
        <PartyPopper aria-hidden="true" className="size-4 text-primary" />
        {t.review}
      </div>
      <ul className="flex flex-col gap-2">
        {ids.map((id) => {
          const done = progress.completed.includes(id);
          const skipped = progress.skipped.includes(id);
          const Icon = done ? CircleCheck : skipped ? MinusCircle : CircleDashed;
          return (
            <li key={id} className="flex items-center gap-3 rounded-control border border-border bg-card px-3 py-2">
              <Icon aria-hidden="true" className={cn("size-4 shrink-0", done ? "text-nq-success-text" : "text-muted-foreground")} />
              <span className="flex-1 text-body text-foreground">{titles[id] ?? id}</span>
              <span className="text-caption text-muted-foreground">{done ? t.stepDone : skipped ? t.stepSkipped : t.stepOpen}</span>
            </li>
          );
        })}
      </ul>
      {skippedAny ? <p className="text-caption text-muted-foreground">{t.later}</p> : null}
    </div>
  );
}
