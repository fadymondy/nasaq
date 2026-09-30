"use client";

import { Check, CircleCheck, CircleX, LogOut, Plus } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { DangerZone, SettingsSection } from "../account-settings";
import { Alert } from "../alert";
import { AuthLayout, type AuthLayoutProps } from "../auth-layout";
import { Avatar } from "../avatar";
import { AvatarUpload, type AvatarUploadProps } from "../avatar-upload";
import { Badge } from "../badge";
import { Button } from "../button";
import { ConfirmButton } from "../alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "../input-group";
import { formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Spinner } from "../spinner";
import { deletePhrase, SLUG_MAX, SLUG_MIN, type SlugProblem, slugify, slugProblem } from "./workspace-slug";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    // create
    onboardTitle: "Create your workspace",
    onboardBody: "A workspace is where your team keeps everything. You can invite people next.",
    createTitle: "Create a workspace",
    createBody: "A separate space for a team, a client or a project.",
    name: "Workspace name",
    namePlaceholder: "Sahab Studio",
    nameRequired: "Enter a name for the workspace.",
    slug: "Workspace address",
    slugHelp: "Letters, numbers and dashes. You can change it later.",
    slugChecking: "Checking availability",
    slugAvailable: "This address is available.",
    slugTaken: "That address is taken. Try another one.",
    slugCheckFailed: "Availability could not be checked. It will be verified when you create it.",
    problem: {
      empty: "Enter an address for the workspace.",
      short: `Use at least ${SLUG_MIN} characters.`,
      long: `Use at most ${SLUG_MAX} characters.`,
      format: "Use lowercase letters, numbers and dashes. Start and end with a letter or number.",
    } as Record<SlugProblem, string>,
    create: "Create workspace",
    cancel: "Cancel",
    failed: "That did not work. Try again.",
    // list
    listTitle: "Your workspaces",
    listLabel: "Workspaces",
    open: "Open",
    current: "Current",
    members: (n: string) => (n === "1" ? "1 member" : `${n} members`),
    newWorkspace: "New workspace",
    listEmpty: "You are not in any workspace yet",
    listEmptyHint: "Create one, or ask a teammate to invite you.",
    roleOwner: "Owner",
    // settings
    generalTitle: "General",
    generalBody: "The name and address people see for this workspace.",
    picture: "Workspace picture",
    save: "Save changes",
    saved: "Workspace updated.",
    readOnly: "Only owners and admins can change these settings.",
    leaveTitle: "Leave workspace",
    leaveBody: "You lose access until someone invites you again.",
    leaveButton: "Leave workspace",
    leaveConfirmTitle: (name: string) => `Leave ${name}?`,
    leaveConfirmBody: "You lose access to everything in this workspace. You can rejoin only if someone invites you.",
    leaveBlocked: "You are the only owner. Transfer ownership to another member first.",
    deleteTitle: "Delete workspace",
    deleteHeading: "Delete this workspace",
    deleteBody: "Permanently delete the workspace and everything in it for every member. This cannot be undone.",
    deleteButton: "Delete workspace",
    deleteConfirmTitle: (name: string) => `Delete ${name}?`,
    deleteConfirmBody: "Every member loses access and all of its data is removed for good.",
    deletePrompt: (text: string) => `Type ${text} to confirm`,
    deleteAction: "Delete this workspace",
    deleteFailed: "The workspace could not be deleted. Try again.",
  },
  ar: {
    onboardTitle: "أنشئ مساحة عملك",
    onboardBody: "مساحة العمل هي المكان الذي يحفظ فيه فريقك كل شيء. يمكنك دعوة الآخرين بعدها.",
    createTitle: "إنشاء مساحة عمل",
    createBody: "مساحة منفصلة لفريق أو عميل أو مشروع.",
    name: "اسم مساحة العمل",
    namePlaceholder: "سحاب ستوديو",
    nameRequired: "أدخل اسمًا لمساحة العمل.",
    slug: "عنوان مساحة العمل",
    slugHelp: "أحرف وأرقام وشرطات. يمكنك تغييره لاحقًا.",
    slugChecking: "جارٍ التحقق من التوفر",
    slugAvailable: "هذا العنوان متاح.",
    slugTaken: "هذا العنوان مستخدم. جرّب عنوانًا آخر.",
    slugCheckFailed: "تعذّر التحقق من التوفر. سيُتحقق منه عند الإنشاء.",
    problem: {
      empty: "أدخل عنوانًا لمساحة العمل.",
      short: `استخدم ${SLUG_MIN} أحرف على الأقل.`,
      long: `استخدم ${SLUG_MAX} حرفًا على الأكثر.`,
      format: "استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات. ابدأ وانتهِ بحرف أو رقم.",
    } as Record<SlugProblem, string>,
    create: "إنشاء مساحة العمل",
    cancel: "إلغاء",
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    listTitle: "مساحات عملك",
    listLabel: "مساحات العمل",
    open: "فتح",
    current: "الحالية",
    members: (n: string) => (n === "1" ? "عضو واحد" : `${n} أعضاء`),
    newWorkspace: "مساحة عمل جديدة",
    listEmpty: "لست في أي مساحة عمل بعد",
    listEmptyHint: "أنشئ واحدة، أو اطلب من زميل دعوتك.",
    roleOwner: "المالك",
    generalTitle: "عام",
    generalBody: "الاسم والعنوان اللذان يراهما الناس لمساحة العمل هذه.",
    picture: "صورة مساحة العمل",
    save: "حفظ التغييرات",
    saved: "تم تحديث مساحة العمل.",
    readOnly: "المالكون والمشرفون وحدهم يستطيعون تغيير هذه الإعدادات.",
    leaveTitle: "مغادرة مساحة العمل",
    leaveBody: "تفقد الوصول إلى أن يدعوك أحد مرة أخرى.",
    leaveButton: "مغادرة مساحة العمل",
    leaveConfirmTitle: (name: string) => `مغادرة ${name}؟`,
    leaveConfirmBody: "تفقد الوصول إلى كل شيء في مساحة العمل هذه. لا تستطيع العودة إلا إذا دعاك أحد.",
    leaveBlocked: "أنت المالك الوحيد. انقل الملكية إلى عضو آخر أولًا.",
    deleteTitle: "حذف مساحة العمل",
    deleteHeading: "احذف مساحة العمل هذه",
    deleteBody: "احذف مساحة العمل وكل ما فيها نهائيًا لجميع الأعضاء. لا يمكن التراجع عن ذلك.",
    deleteButton: "حذف مساحة العمل",
    deleteConfirmTitle: (name: string) => `حذف ${name}؟`,
    deleteConfirmBody: "يفقد كل الأعضاء وصولهم وتُحذف كل بياناتها نهائيًا.",
    deletePrompt: (text: string) => `اكتب ${text} للتأكيد`,
    deleteAction: "احذف مساحة العمل هذه",
    deleteFailed: "تعذّر حذف مساحة العمل. حاول مرة أخرى.",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type WorkspaceSettingsLabels = Partial<typeof STRINGS.en>;

/** Resolve nothing on success, or a failure to show. `fieldErrors.slug` marks the address as taken or invalid. */
export type WorkspaceSubmitResult = void | { error?: string; fieldErrors?: Partial<Record<"name" | "slug", string>> };

export interface WorkspaceValues {
  name: string;
  slug: string;
}

/** True or `{ available }` when the address is free. */
export type SlugCheck = boolean | { available: boolean; message?: string };

/* ------------------------------------------------------------------ CreateWorkspaceForm */

export interface CreateWorkspaceFormProps extends Omit<ComponentProps<"form">, "onSubmit" | "children"> {
  onSubmit: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
  /** Is this address free? Called after typing pauses, for a valid address. */
  checkSlug?: (slug: string) => Promise<SlugCheck>;
  /** Shown before the address field, always left-to-right: "nasaq.app/". Hides the address field when omitted and `showSlug` is false. */
  slugPrefix?: string;
  /** Show the address field. Default true. */
  showSlug?: boolean;
  defaultName?: string;
  submitLabel?: string;
  /** Adds a Cancel button. */
  onCancel?: () => void;
  labels?: WorkspaceSettingsLabels;
}

type SlugState = { status: "idle" | "checking" | "available" | "taken" | "error"; message?: string };

/** Name and address of a new workspace. The address follows the name until the person edits it. */
export function CreateWorkspaceForm({ onSubmit, checkSlug, slugPrefix, showSlug = true, defaultName = "", submitLabel, onCancel, labels, className, ...props }: CreateWorkspaceFormProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(slugify(defaultName));
  const [touched, setTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [state, setState] = useState<SlugState>({ status: "idle" });
  const [serverErrors, setServerErrors] = useState<Partial<Record<"name" | "slug", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const checkRef = useRef(checkSlug);
  checkRef.current = checkSlug;
  useEffect(() => {
    if (!checkRef.current || slugProblem(slug)) {
      setState({ status: "idle" });
      return;
    }
    let stale = false;
    setState({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkRef.current?.(slug);
        if (stale || result === undefined) return;
        const free = typeof result === "boolean" ? result : result.available;
        setState({ status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined });
      } catch {
        if (!stale) setState({ status: "error" });
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [slug]);

  const problem = showSlug ? slugProblem(slug) : null;
  const nameError = serverErrors.name ?? (attempted && !name.trim() ? t.nameRequired : undefined);
  const slugError =
    serverErrors.slug ?? (state.status === "taken" ? (state.message ?? t.slugTaken) : problem && (touched || attempted) && (slug || attempted) ? t.problem[problem] : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    setFormError(null);
    if (!name.trim() || problem || state.status === "taken" || state.status === "checking" || busy) return;
    setBusy(true);
    try {
      const result = await onSubmit({ name: name.trim(), slug });
      if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
        setServerErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? null);
      }
    } catch {
      setFormError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form data-slot="create-workspace-form" noValidate onSubmit={submit} className={cn("flex flex-col gap-4", className)} {...props}>
      <Field invalid={!!nameError}>
        <FieldLabel>{t.name}</FieldLabel>
        <Input
          value={name}
          autoComplete="organization"
          placeholder={t.namePlaceholder}
          disabled={busy}
          onChange={(e) => {
            const next = e.currentTarget.value;
            setName(next);
            if (!touched) setSlug(slugify(next));
            setServerErrors((s) => ({ ...s, name: undefined }));
          }}
        />
        <FieldError match={!!nameError}>{nameError}</FieldError>
      </Field>
      {showSlug ? (
        <Field invalid={!!slugError}>
          <FieldLabel>{t.slug}</FieldLabel>
          <InputGroup dir="ltr">
            {slugPrefix ? (
              <InputGroupAddon>
                <InputGroupText>{slugPrefix}</InputGroupText>
              </InputGroupAddon>
            ) : null}
            <InputGroupInput
              value={slug}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy}
              onChange={(e) => {
                setTouched(true);
                setSlug(e.currentTarget.value.toLowerCase());
                setServerErrors((s) => ({ ...s, slug: undefined }));
              }}
            />
            {state.status !== "idle" ? (
              <InputGroupAddon align="end">
                {state.status === "checking" ? <Spinner className="size-4" /> : state.status === "available" ? <CircleCheck aria-hidden className="text-nq-success-text" /> : state.status === "taken" ? <CircleX aria-hidden className="text-nq-danger-text" /> : null}
              </InputGroupAddon>
            ) : null}
          </InputGroup>
          {slugError ? (
            <FieldError match>{slugError}</FieldError>
          ) : (
            <FieldDescription role={state.status === "idle" ? undefined : "status"}>
              {state.status === "checking" ? t.slugChecking : state.status === "available" ? t.slugAvailable : state.status === "error" ? t.slugCheckFailed : t.slugHelp}
            </FieldDescription>
          )}
        </Field>
      ) : null}
      {formError ? (
        <Alert tone="danger" role="alert">
          {formError}
        </Alert>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={busy}>
          {submitLabel ?? t.create}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ WorkspaceOnboarding */

export interface WorkspaceOnboardingProps extends Omit<AuthLayoutProps, "title" | "description" | "children" | "onSubmit">, Pick<CreateWorkspaceFormProps, "onSubmit" | "checkSlug" | "slugPrefix" | "showSlug" | "defaultName"> {
  /** Render only the form, to place it in your own page. */
  bare?: boolean;
  labels?: WorkspaceSettingsLabels;
}

/** First run: a signed-in person with no workspace names one. A page (`AuthLayout`), or `bare` for your own layout. */
export function WorkspaceOnboarding({ onSubmit, checkSlug, slugPrefix, showSlug, defaultName, bare = false, labels, ...layout }: WorkspaceOnboardingProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const form = <CreateWorkspaceForm data-slot="workspace-onboarding" onSubmit={onSubmit} checkSlug={checkSlug} slugPrefix={slugPrefix} showSlug={showSlug} defaultName={defaultName} labels={labels} />;
  if (bare) {
    return (
      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-foreground">{t.onboardTitle}</h1>
          <p className="text-body-sm text-muted-foreground">{t.onboardBody}</p>
        </header>
        {form}
      </section>
    );
  }
  return (
    <AuthLayout {...layout} title={t.onboardTitle} description={t.onboardBody}>
      {form}
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ CreateWorkspaceDialog */

export interface CreateWorkspaceDialogProps extends Pick<CreateWorkspaceFormProps, "checkSlug" | "slugPrefix" | "showSlug"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Create it. The dialog closes when this resolves without an error. */
  onSubmit: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
  labels?: WorkspaceSettingsLabels;
}

/** The create dialog behind the "Add workspace" item of `WorkspaceSwitcher`. */
export function CreateWorkspaceDialog({ open, onOpenChange, onSubmit, checkSlug, slugPrefix, showSlug = false, labels }: CreateWorkspaceDialogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.createTitle}</DialogTitle>
          <DialogDescription>{t.createBody}</DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm
          key={String(open)}
          labels={labels}
          checkSlug={checkSlug}
          slugPrefix={slugPrefix}
          showSlug={showSlug}
          onCancel={() => onOpenChange(false)}
          onSubmit={async (values) => {
            const result = await onSubmit(values);
            if (!(result && typeof result === "object" && (result.error || result.fieldErrors))) onOpenChange(false);
            return result;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ WorkspaceList */

export interface WorkspaceListItem {
  id: string;
  name: string;
  /** The address, shown left-to-right under the name. */
  slug?: string;
  logo?: string;
  /** Your role label in it. */
  role?: string;
  members?: number;
  /** The one you are in now. */
  current?: boolean;
}

export interface WorkspaceListProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  workspaces: readonly WorkspaceListItem[];
  title?: ReactNode;
  onOpen: (workspace: WorkspaceListItem) => void | Promise<void>;
  /** Adds the "New workspace" button. */
  onCreate?: () => void;
  labels?: WorkspaceSettingsLabels;
}

/** Every workspace you belong to, with your role, its size and a button to open it. */
export function WorkspaceList({ workspaces, title, onOpen, onCreate, labels, className, ...props }: WorkspaceListProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [opening, setOpening] = useState<string | null>(null);
  return (
    <section data-slot="workspace-list" aria-label={typeof title === "string" ? title : t.listLabel} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-foreground">{title ?? t.listTitle}</h2>
        {onCreate ? (
          <Button variant="secondary" onClick={onCreate}>
            <Plus />
            {t.newWorkspace}
          </Button>
        ) : null}
      </div>
      {workspaces.length ? (
        <ul aria-label={t.listLabel} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          {workspaces.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <Avatar name={w.name} src={w.logo} shape="square" size="lg" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 truncate text-label text-foreground">
                  {w.name}
                  {w.current ? (
                    <Badge variant="brand">
                      <Check aria-hidden />
                      {t.current}
                    </Badge>
                  ) : null}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                  {w.slug ? <bdi dir="ltr">{w.slug}</bdi> : null}
                  {w.members !== undefined ? <span>{t.members(formatNumber(w.members, locale))}</span> : null}
                </span>
              </div>
              {w.role ? <Badge variant="neutral">{w.role}</Badge> : null}
              <Button
                size="sm"
                variant={w.current ? "ghost" : "secondary"}
                disabled={w.current}
                loading={opening === w.id}
                onClick={async () => {
                  setOpening(w.id);
                  try {
                    await onOpen(w);
                  } finally {
                    setOpening(null);
                  }
                }}
              >
                {t.open}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t.listEmpty}
          description={t.listEmptyHint}
          actions={
            onCreate ? (
              <Button variant="primary" onClick={onCreate}>
                <Plus />
                {t.newWorkspace}
              </Button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ WorkspaceSettings */

export interface WorkspaceSettingsProps extends Omit<ComponentProps<"div">, "children"> {
  workspace: { name: string; slug: string; logo?: string };
  /** Owners and admins can rename and change the picture. Default true. */
  canEdit?: boolean;
  /** Owners can delete. Default true. Without `onDelete` the section is hidden anyway. */
  canDelete?: boolean;
  /** False when you are the only owner: leave is disabled and says why. Default true. */
  canLeave?: boolean;
  slugPrefix?: string;
  /** Is this address free? Only called for a valid address that differs from the saved one. */
  checkSlug?: (slug: string) => Promise<SlugCheck>;
  onRename?: (values: WorkspaceValues) => Promise<WorkspaceSubmitResult> | WorkspaceSubmitResult;
  /** Picture upload. Omit `onChange` to hide the picture. */
  logo?: Pick<AvatarUploadProps, "onChange" | "onRemove" | "accept" | "maxSize" | "outputSize" | "outputType">;
  onLeave?: () => Promise<void>;
  /** Deletes the workspace. Reject to keep the dialog open and show the error. */
  onDelete?: () => Promise<void>;
  labels?: WorkspaceSettingsLabels;
}

/**
 * Manage one workspace: rename it and change its address and picture, leave it, and delete it. Leaving asks
 * first and is blocked for the last owner; deleting needs the workspace name typed, so a stray Enter cannot
 * do it. Sections are `SettingsSection` cards, so it drops into a settings page.
 */
export function WorkspaceSettings({ workspace, canEdit = true, canDelete = true, canLeave = true, slugPrefix, checkSlug, onRename, logo, onLeave, onDelete, labels, className, ...props }: WorkspaceSettingsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<"name" | "slug", string>>>({});
  const [state, setState] = useState<SlugState>({ status: "idle" });

  useEffect(() => {
    setName(workspace.name);
    setSlug(workspace.slug);
  }, [workspace.name, workspace.slug]);

  const checkRef = useRef(checkSlug);
  checkRef.current = checkSlug;
  useEffect(() => {
    if (!checkRef.current || slug === workspace.slug || slugProblem(slug)) {
      setState({ status: "idle" });
      return;
    }
    let stale = false;
    setState({ status: "checking" });
    const timer = setTimeout(async () => {
      try {
        const result = await checkRef.current?.(slug);
        if (stale || result === undefined) return;
        const free = typeof result === "boolean" ? result : result.available;
        setState({ status: free ? "available" : "taken", message: typeof result === "object" ? result.message : undefined });
      } catch {
        if (!stale) setState({ status: "error" });
      }
    }, 400);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [slug, workspace.slug]);

  const dirty = name.trim() !== workspace.name || slug !== workspace.slug;
  const problem = slugProblem(slug);
  const nameError = errors.name ?? (!name.trim() ? t.nameRequired : undefined);
  const slugError = errors.slug ?? (state.status === "taken" ? (state.message ?? t.slugTaken) : problem ? t.problem[problem] : undefined);
  const invalid = !!nameError || !!slugError || state.status === "checking";

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || invalid || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await onRename?.({ name: name.trim(), slug });
      if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
        setErrors(result.fieldErrors ?? {});
        if (result.error) setNotice({ tone: "danger", text: result.error });
      } else {
        setErrors({});
        setNotice({ tone: "success", text: t.saved });
      }
    } catch {
      setNotice({ tone: "danger", text: t.failed });
    } finally {
      setSaving(false);
    }
  };

  const phrase = deletePhrase(workspace.name);
  return (
    <div data-slot="workspace-settings" className={cn("flex flex-col gap-6", className)} {...props}>
      <SettingsSection
        title={t.generalTitle}
        description={t.generalBody}
        footer={canEdit ? undefined : t.readOnly}
        actions={
          canEdit && onRename ? (
            <Button type="submit" form="workspace-general" variant="primary" loading={saving} disabled={!dirty || invalid}>
              {t.save}
            </Button>
          ) : undefined
        }
      >
        <form id="workspace-general" noValidate onSubmit={save} className="flex flex-col gap-5">
          {logo?.onChange ? <AvatarUpload name={workspace.name} src={workspace.logo} shape="square" disabled={!canEdit} {...logo} onChange={logo.onChange} labels={{ upload: t.picture }} /> : null}
          <Field invalid={!!nameError && dirty}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input
              value={name}
              disabled={!canEdit || saving}
              onChange={(e) => {
                setName(e.currentTarget.value);
                setErrors((s) => ({ ...s, name: undefined }));
                setNotice(null);
              }}
            />
            {nameError && dirty ? <FieldError match>{nameError}</FieldError> : null}
          </Field>
          <Field invalid={!!slugError && dirty}>
            <FieldLabel>{t.slug}</FieldLabel>
            <InputGroup dir="ltr">
              {slugPrefix ? (
                <InputGroupAddon>
                  <InputGroupText>{slugPrefix}</InputGroupText>
                </InputGroupAddon>
              ) : null}
              <InputGroupInput
                value={slug}
                autoCapitalize="none"
                spellCheck={false}
                disabled={!canEdit || saving}
                onChange={(e) => {
                  setSlug(e.currentTarget.value.toLowerCase());
                  setErrors((s) => ({ ...s, slug: undefined }));
                  setNotice(null);
                }}
              />
              {state.status !== "idle" ? (
                <InputGroupAddon align="end">
                  {state.status === "checking" ? <Spinner className="size-4" /> : state.status === "available" ? <CircleCheck aria-hidden className="text-nq-success-text" /> : state.status === "taken" ? <CircleX aria-hidden className="text-nq-danger-text" /> : null}
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            {slugError && (dirty || errors.slug) ? (
              <FieldError match>{slugError}</FieldError>
            ) : (
              <FieldDescription>{state.status === "checking" ? t.slugChecking : state.status === "available" ? t.slugAvailable : t.slugHelp}</FieldDescription>
            )}
          </Field>
          {notice ? (
            <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
              {notice.text}
            </Alert>
          ) : null}
        </form>
      </SettingsSection>

      {onLeave ? (
        <SettingsSection title={t.leaveTitle} description={canLeave ? t.leaveBody : t.leaveBlocked}>
          <ConfirmButton
            variant="danger"
            disabled={!canLeave}
            title={t.leaveConfirmTitle(workspace.name)}
            description={t.leaveConfirmBody}
            confirmLabel={t.leaveButton}
            onConfirm={onLeave}
          >
            <LogOut className="rtl:-scale-x-100" />
            {t.leaveButton}
          </ConfirmButton>
        </SettingsSection>
      ) : null}

      {onDelete && canDelete ? (
        <DangerZone
          title={t.deleteTitle}
          heading={t.deleteHeading}
          description={t.deleteBody}
          confirmText={phrase}
          onDelete={onDelete}
          labels={{
            button: t.deleteButton,
            confirmTitle: t.deleteConfirmTitle(workspace.name),
            confirmDescription: t.deleteConfirmBody,
            confirmPrompt: t.deletePrompt,
            confirmAction: t.deleteAction,
            cancel: t.cancel,
            failed: t.deleteFailed,
          }}
        />
      ) : null}
    </div>
  );
}
