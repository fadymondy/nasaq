"use client";

import { BadgeCheck, Eye, KeyRound, Plus, ShieldCheck, UserCheck, UserRoundX, UserX } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import {
  DataTable,
  DataTableBulkActions,
  DataTableFacetFilter,
  type DataTableColumn,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  DataTableViewOptions,
  useDataTable,
} from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { EmptyState } from "../states";
import { Status } from "../status";
import { StatCard, StatGrid } from "../stat-card";
import { Switch } from "../switch";

const STRINGS = {
  en: {
    table: "Users",
    search: "Search name or email…",
    addUser: "Add user",
    total: "Total users",
    active: "Active",
    unverified: "Unverified",
    disabled: "Disabled",
    user: "User",
    roles: "Roles",
    status: "Status",
    email: "Email",
    workspace: "Workspace",
    lastActive: "Last active",
    joined: "Joined",
    never: "Never",
    verified: "Verified",
    notVerified: "Unverified",
    statusActive: "Active",
    statusDisabled: "Disabled",
    statusInvited: "Invited",
    noRoles: "No roles",
    you: "You",
    verify: "Verify email",
    editRoles: "Edit roles…",
    resetPassword: "Reset password…",
    impersonate: "Impersonate…",
    disable: "Disable account…",
    enable: "Enable account",
    selectedVerify: "Verify",
    selectedDisable: "Disable",
    empty: "No users yet",
    emptyHint: "Add the first user to get started.",
    // outcomes
    verifiedOk: (name: string) => `${name} was verified.`,
    enabledOk: (name: string) => `${name} was enabled.`,
    disabledOk: (name: string) => `${name} was disabled.`,
    resetOk: (name: string) => `A reset link was sent to ${name}.`,
    impersonateOk: (name: string) => `You are now signed in as ${name}.`,
    rolesOk: (name: string) => `Roles updated for ${name}.`,
    addedOk: (name: string) => `${name} was added.`,
    bulkOk: (n: string) => `${n} users updated.`,
    failed: "That did not work. Try again.",
    dismiss: "Dismiss",
    // confirm dialogs
    cancel: "Cancel",
    disableTitle: (name: string) => `Disable ${name}?`,
    disableBody: "They are signed out at once and cannot sign in until you enable the account again. Their data is kept.",
    disableConfirm: "Disable account",
    resetTitle: (name: string) => `Reset password for ${name}?`,
    resetBody: "We email them a link to choose a new password. Their current password stops working once they use it.",
    resetConfirm: "Send reset link",
    impersonateTitle: (name: string) => `Impersonate ${name}?`,
    impersonateBody: "You will see the app exactly as they do. Everything you do is recorded in the audit log under both names.",
    impersonateConfirm: "Start impersonating",
    // add dialog
    addTitle: "Add a user",
    addBody: "They get an email to set a password, unless you mark the address as verified and skip the invite.",
    name: "Full name",
    emailField: "Email address",
    rolesField: "Roles",
    sendInvite: "Send an invitation email",
    sendInviteHint: "They set their own password.",
    markVerified: "Mark the email as verified",
    markVerifiedHint: "Skips the confirmation step.",
    create: "Add user",
    nameRequired: "Enter a name.",
    emailRequired: "Enter an email address.",
    emailInvalid: "Enter a valid email address.",
    rolesRequired: "Choose at least one role.",
    // roles dialog
    rolesTitle: (name: string) => `Roles for ${name}`,
    rolesBody: "Choose what this person can do. Changes apply on their next request.",
    saveRoles: "Save roles",
  },
  ar: {
    table: "المستخدمون",
    search: "ابحث بالاسم أو البريد…",
    addUser: "إضافة مستخدم",
    total: "إجمالي المستخدمين",
    active: "نشط",
    unverified: "غير موثّق",
    disabled: "معطّل",
    user: "المستخدم",
    roles: "الأدوار",
    status: "الحالة",
    email: "البريد",
    workspace: "مساحة العمل",
    lastActive: "آخر نشاط",
    joined: "تاريخ الانضمام",
    never: "أبدًا",
    verified: "موثّق",
    notVerified: "غير موثّق",
    statusActive: "نشط",
    statusDisabled: "معطّل",
    statusInvited: "مدعو",
    noRoles: "بلا أدوار",
    you: "أنت",
    verify: "توثيق البريد",
    editRoles: "تعديل الأدوار…",
    resetPassword: "إعادة تعيين كلمة المرور…",
    impersonate: "انتحال الصفة…",
    disable: "تعطيل الحساب…",
    enable: "تفعيل الحساب",
    selectedVerify: "توثيق",
    selectedDisable: "تعطيل",
    empty: "لا يوجد مستخدمون بعد",
    emptyHint: "أضف أول مستخدم للبدء.",
    verifiedOk: (name: string) => `تم توثيق ${name}.`,
    enabledOk: (name: string) => `تم تفعيل ${name}.`,
    disabledOk: (name: string) => `تم تعطيل ${name}.`,
    resetOk: (name: string) => `أُرسل رابط إعادة التعيين إلى ${name}.`,
    impersonateOk: (name: string) => `سجّلت الدخول الآن بصفة ${name}.`,
    rolesOk: (name: string) => `تم تحديث أدوار ${name}.`,
    addedOk: (name: string) => `تمت إضافة ${name}.`,
    bulkOk: (n: string) => `تم تحديث ${n} مستخدمين.`,
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    dismiss: "تجاهل",
    cancel: "إلغاء",
    disableTitle: (name: string) => `تعطيل ${name}؟`,
    disableBody: "سيُسجَّل خروجه فورًا ولن يستطيع الدخول حتى تعيد تفعيل الحساب. تبقى بياناته محفوظة.",
    disableConfirm: "تعطيل الحساب",
    resetTitle: (name: string) => `إعادة تعيين كلمة مرور ${name}؟`,
    resetBody: "نرسل له رابطًا لاختيار كلمة مرور جديدة. تتوقف كلمة المرور الحالية عن العمل بمجرد استخدامه للرابط.",
    resetConfirm: "إرسال رابط إعادة التعيين",
    impersonateTitle: (name: string) => `انتحال صفة ${name}؟`,
    impersonateBody: "سترى التطبيق كما يراه تمامًا. كل ما تفعله يُسجَّل في سجل التدقيق باسمكما معًا.",
    impersonateConfirm: "بدء انتحال الصفة",
    addTitle: "إضافة مستخدم",
    addBody: "يصله بريد لتعيين كلمة المرور، إلا إذا وثّقت العنوان وتخطيت الدعوة.",
    name: "الاسم الكامل",
    emailField: "البريد الإلكتروني",
    rolesField: "الأدوار",
    sendInvite: "إرسال بريد دعوة",
    sendInviteHint: "يعيّن كلمة مروره بنفسه.",
    markVerified: "اعتبار البريد موثّقًا",
    markVerifiedHint: "يتخطى خطوة التأكيد.",
    create: "إضافة المستخدم",
    nameRequired: "أدخل الاسم.",
    emailRequired: "أدخل البريد الإلكتروني.",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    rolesRequired: "اختر دورًا واحدًا على الأقل.",
    rolesTitle: (name: string) => `أدوار ${name}`,
    rolesBody: "اختر ما يستطيع هذا الشخص فعله. تسري التغييرات عند طلبه التالي.",
    saveRoles: "حفظ الأدوار",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type AdminUsersLabels = Partial<typeof STRINGS.en>;

/* ------------------------------------------------------------------ types */

export type ManagedUserStatus = "active" | "disabled" | "invited";

export interface ManagedRole {
  id: string;
  label: string;
  description?: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  /** Role ids. */
  roles: readonly string[];
  status: ManagedUserStatus;
  /** Has confirmed the email address. */
  verified: boolean;
  workspace?: string;
  lastActive?: string | Date | null;
  createdAt: string | Date;
}

export interface NewUserValues {
  name: string;
  email: string;
  roles: string[];
  sendInvite: boolean;
  verified: boolean;
}

/** What an async action returns: nothing on success, or an error to show. */
export type AdminActionResult = void | { error?: string };
export type AddUserResult = void | { error?: string; fieldErrors?: Partial<Record<"name" | "email", string>> };

/* ------------------------------------------------------------------ helpers */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function attempt(fn: () => Promise<AdminActionResult> | AdminActionResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ AddUserDialog */

export interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: readonly ManagedRole[];
  /** Create the user. Return `{ error }` or `{ fieldErrors }` to keep the dialog open. */
  onSubmit: (values: NewUserValues) => Promise<AddUserResult> | AddUserResult;
  /** Roles ticked at first. Default: the first role. */
  defaultRoles?: readonly string[];
  labels?: AdminUsersLabels;
}

/** A dialog that collects the details of a new user: name, email, roles, and how they are told. */
export function AddUserDialog({ open, onOpenChange, roles, onSubmit, defaultRoles, labels }: AddUserDialogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const initial = (): NewUserValues => ({ name: "", email: "", roles: [...(defaultRoles ?? roles.slice(0, 1).map((r) => r.id))], sendInvite: true, verified: false });
  const [values, setValues] = useState<NewUserValues>(initial);
  const [errors, setErrors] = useState<Partial<Record<"name" | "email" | "roles", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial());
      setErrors({});
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = t.nameRequired;
    if (!values.email.trim()) next.email = t.emailRequired;
    else if (!EMAIL.test(values.email.trim())) next.email = t.emailInvalid;
    if (!values.roles.length) next.roles = t.rolesRequired;
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const result = await onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() });
      if (result && typeof result === "object" && (result.error || result.fieldErrors)) {
        setErrors({ ...result.fieldErrors });
        setFormError(result.error ?? null);
      } else onOpenChange(false);
    } catch {
      setFormError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string, on: boolean) => setValues((v) => ({ ...v, roles: on ? [...v.roles, id] : v.roles.filter((r) => r !== id) }));

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t.addTitle}</DialogTitle>
            <DialogDescription>{t.addBody}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field invalid={!!errors.name}>
              <FieldLabel>{t.name}</FieldLabel>
              <Input value={values.name} autoComplete="off" onChange={(e) => setValues({ ...values, name: e.currentTarget.value })} />
              <FieldError match={!!errors.name}>{errors.name}</FieldError>
            </Field>
            <Field invalid={!!errors.email}>
              <FieldLabel>{t.emailField}</FieldLabel>
              <Input ltr type="email" value={values.email} autoComplete="off" onChange={(e) => setValues({ ...values, email: e.currentTarget.value })} />
              <FieldError match={!!errors.email}>{errors.email}</FieldError>
            </Field>
            <fieldset className="flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-1 text-label text-foreground">{t.rolesField}</legend>
              {roles.map((role) => (
                <label key={role.id} className="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
                  <Checkbox className="mt-0.5" checked={values.roles.includes(role.id)} onCheckedChange={(on) => toggle(role.id, on)} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-label text-foreground">{role.label}</span>
                    {role.description ? <span className="text-caption text-muted-foreground">{role.description}</span> : null}
                  </span>
                </label>
              ))}
              {errors.roles ? (
                <p role="alert" className="text-caption text-nq-danger-text">
                  {errors.roles}
                </p>
              ) : null}
            </fieldset>
            <div className="flex flex-col divide-y divide-border rounded-control border border-border">
              <Field className="flex-row items-center justify-between gap-4 px-3 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <FieldLabel>{t.sendInvite}</FieldLabel>
                  <FieldDescription>{t.sendInviteHint}</FieldDescription>
                </div>
                <Switch checked={values.sendInvite} onCheckedChange={(on) => setValues({ ...values, sendInvite: on })} aria-label={t.sendInvite} />
              </Field>
              <Field className="flex-row items-center justify-between gap-4 px-3 py-2.5">
                <div className="flex min-w-0 flex-col">
                  <FieldLabel>{t.markVerified}</FieldLabel>
                  <FieldDescription>{t.markVerifiedHint}</FieldDescription>
                </div>
                <Switch checked={values.verified} onCheckedChange={(on) => setValues({ ...values, verified: on })} aria-label={t.markVerified} />
              </Field>
            </div>
            {formError ? (
              <Alert tone="danger" role="alert">
                {formError}
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ UserRolesDialog */

export interface UserRolesDialogProps {
  user: ManagedUser | null;
  roles: readonly ManagedRole[];
  onOpenChange: (open: boolean) => void;
  /** Save the new role ids. Return `{ error }` to keep the dialog open. */
  onSave: (user: ManagedUser, roles: string[]) => Promise<AdminActionResult> | AdminActionResult;
  labels?: AdminUsersLabels;
}

/** Edit the roles of one user. Open while `user` is set. At least one role must stay ticked. */
export function UserRolesDialog({ user, roles, onOpenChange, onSave, labels }: UserRolesDialogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [chosen, setChosen] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setChosen([...(user?.roles ?? [])]);
    setError(null);
  }, [user]);
  const changed = user ? chosen.length !== user.roles.length || chosen.some((r) => !user.roles.includes(r)) : false;

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const failure = await attempt(() => onSave(user, chosen));
    setBusy(false);
    if (failure === null) onOpenChange(false);
    else setError(failure || t.failed);
  };

  return (
    <Dialog open={!!user} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? t.rolesTitle(user.name) : ""}</DialogTitle>
          <DialogDescription>{t.rolesBody}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {roles.map((role) => (
            <label key={role.id} className="flex cursor-pointer items-start gap-2.5 rounded-control border border-border p-2.5 has-[[data-checked]]:border-primary has-[[data-checked]]:bg-nq-selected">
              <Checkbox
                className="mt-0.5"
                checked={chosen.includes(role.id)}
                onCheckedChange={(on) => setChosen((cur) => (on ? [...cur, role.id] : cur.filter((r) => r !== role.id)))}
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-label text-foreground">{role.label}</span>
                {role.description ? <span className="text-caption text-muted-foreground">{role.description}</span> : null}
              </span>
            </label>
          ))}
          {error ? (
            <Alert tone="danger" role="alert">
              {error}
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            {t.cancel}
          </Button>
          <Button variant="primary" onClick={save} loading={busy} disabled={!changed || chosen.length === 0}>
            {t.saveRoles}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ AdminUsers */

type Confirm = { kind: "disable" | "reset" | "impersonate"; user: ManagedUser };

export interface AdminUsersProps {
  users: readonly ManagedUser[];
  /** The roles that can be given. */
  roles: readonly ManagedRole[];
  /** The signed-in admin. Their own row cannot be disabled or impersonated. */
  currentUserId?: string;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  pageSize?: number;
  onAddUser?: (values: NewUserValues) => Promise<AddUserResult> | AddUserResult;
  onVerify?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
  onSetDisabled?: (user: ManagedUser, disabled: boolean) => Promise<AdminActionResult> | AdminActionResult;
  onResetPassword?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
  onImpersonate?: (user: ManagedUser) => Promise<AdminActionResult> | AdminActionResult;
  onUpdateRoles?: (user: ManagedUser, roles: string[]) => Promise<AdminActionResult> | AdminActionResult;
  /** Called when a row is clicked. */
  onOpenUser?: (user: ManagedUser) => void;
  /** Hide the four summary tiles above the table. */
  hideStats?: boolean;
  labels?: AdminUsersLabels;
  className?: string;
}

/**
 * The user management suite for an admin area: summary tiles, a searchable, filterable table, an add-user
 * dialog, and per-row actions (verify email, edit roles, reset password, impersonate, disable or enable).
 * Risky actions ask first. You own the data: every action is an async callback, and you send back new `users`.
 */
export function AdminUsers({
  users,
  roles,
  currentUserId,
  loading,
  error,
  onRetry,
  pageSize = 10,
  onAddUser,
  onVerify,
  onSetDisabled,
  onResetPassword,
  onImpersonate,
  onUpdateRoles,
  onOpenUser,
  hideStats = false,
  labels,
  className,
}: AdminUsersProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const roleLabel = useMemo(() => new Map(roles.map((r) => [r.id, r.label])), [roles]);
  const statusLabel: Record<ManagedUserStatus, string> = { active: t.statusActive, disabled: t.statusDisabled, invited: t.statusInvited };

  const columns = useMemo<DataTableColumn<ManagedUser>[]>(
    () => [
      {
        id: "user",
        header: t.user,
        label: t.user,
        hideable: false,
        sortValue: (u) => u.name,
        searchValue: (u) => `${u.name} ${u.email}`,
        cell: (u) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={u.name} src={u.avatar} size="sm" />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 truncate text-label text-foreground">
                {u.name}
                {u.id === currentUserId ? <Badge variant="outline">{t.you}</Badge> : null}
              </span>
              <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                {u.email}
              </bdi>
            </div>
          </div>
        ),
      },
      {
        id: "roles",
        header: t.roles,
        label: t.roles,
        filterValue: (u) => u.roles[0] ?? "",
        cell: (u) =>
          u.roles.length ? (
            <div className="flex flex-wrap gap-1">
              {u.roles.slice(0, 2).map((r) => (
                <Badge key={r} variant="neutral">
                  {roleLabel.get(r) ?? r}
                </Badge>
              ))}
              {u.roles.length > 2 ? <Badge variant="outline">+{formatNumber(u.roles.length - 2, locale)}</Badge> : null}
            </div>
          ) : (
            <span className="text-body-sm text-muted-foreground">{t.noRoles}</span>
          ),
      },
      {
        id: "status",
        header: t.status,
        label: t.status,
        sortValue: (u) => u.status,
        filterValue: (u) => u.status,
        cell: (u) => (
          <Status tone={u.status === "active" ? "success" : u.status === "disabled" ? "danger" : "info"}>{statusLabel[u.status]}</Status>
        ),
      },
      {
        id: "verified",
        header: t.email,
        label: t.email,
        filterValue: (u) => (u.verified ? "verified" : "unverified"),
        sortValue: (u) => (u.verified ? 1 : 0),
        cell: (u) => (u.verified ? <Status tone="success" icon={BadgeCheck}>{t.verified}</Status> : <Status tone="warning">{t.notVerified}</Status>),
      },
      { id: "workspace", header: t.workspace, label: t.workspace, sortValue: (u) => u.workspace, searchValue: (u) => u.workspace ?? "", defaultHidden: true, cell: (u) => u.workspace ?? "" },
      {
        id: "lastActive",
        header: t.lastActive,
        label: t.lastActive,
        sortValue: (u) => (u.lastActive ? new Date(u.lastActive) : null),
        cell: (u) => (u.lastActive ? <DateTime value={u.lastActive} relative className="text-body-sm text-muted-foreground" /> : <span className="text-body-sm text-muted-foreground">{t.never}</span>),
      },
      {
        id: "created",
        header: t.joined,
        label: t.joined,
        align: "end",
        sortValue: (u) => new Date(u.createdAt),
        cell: (u) => <DateTime value={u.createdAt} format={{ dateStyle: "medium" }} className="text-body-sm text-muted-foreground" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t.user, t.roles, t.status, t.email, t.workspace, t.lastActive, t.joined, t.you, t.never, t.verified, t.notVerified, t.noRoles, roleLabel, currentUserId, locale],
  );

  const table = useDataTable({ data: users as ManagedUser[], columns, getRowId: (u) => u.id, pageSize, selectable: true, defaultSort: { id: "created", direction: "desc" } });

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      unverified: users.filter((u) => !u.verified).length,
      disabled: users.filter((u) => u.status === "disabled").length,
    }),
    [users],
  );

  const report = (failure: string | null, ok: string) => {
    setNotice(failure === null ? { tone: "success", text: ok } : { tone: "danger", text: failure || t.failed });
    return failure === null;
  };

  const verify = async (u: ManagedUser) => report(await attempt(() => onVerify?.(u)), t.verifiedOk(u.name));
  const setDisabled = async (u: ManagedUser, disabled: boolean) =>
    report(await attempt(() => onSetDisabled?.(u, disabled)), disabled ? t.disabledOk(u.name) : t.enabledOk(u.name));

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    setConfirmBusy(true);
    setConfirmError(null);
    const failure = await attempt(() =>
      kind === "disable" ? onSetDisabled?.(user, true) : kind === "reset" ? onResetPassword?.(user) : onImpersonate?.(user),
    );
    setConfirmBusy(false);
    if (failure === null) {
      setConfirm(null);
      setNotice({ tone: "success", text: kind === "disable" ? t.disabledOk(user.name) : kind === "reset" ? t.resetOk(user.name) : t.impersonateOk(user.name) });
    } else setConfirmError(failure || t.failed);
  };

  const bulk = async (kind: "verify" | "disable") => {
    const targets = table.selectedRows.filter((u) => (kind === "verify" ? !u.verified : u.status !== "disabled" && u.id !== currentUserId));
    const results = await Promise.all(targets.map((u) => attempt(() => (kind === "verify" ? onVerify?.(u) : onSetDisabled?.(u, true)))));
    const failed = results.filter((r) => r !== null).length;
    report(failed ? t.failed : null, t.bulkOk(formatNumber(targets.length, locale)));
    table.setSelection(new Set());
  };

  const confirmCopy = confirm && {
    title: confirm.kind === "disable" ? t.disableTitle(confirm.user.name) : confirm.kind === "reset" ? t.resetTitle(confirm.user.name) : t.impersonateTitle(confirm.user.name),
    body: confirm.kind === "disable" ? t.disableBody : confirm.kind === "reset" ? t.resetBody : t.impersonateBody,
    action: confirm.kind === "disable" ? t.disableConfirm : confirm.kind === "reset" ? t.resetConfirm : t.impersonateConfirm,
  };

  return (
    <div data-slot="admin-users" className={cn("flex flex-col gap-5", className)}>
      {hideStats ? null : (
        <StatGrid>
          <StatCard label={t.total} value={stats.total} icon={<ShieldCheck />} loading={loading} />
          <StatCard label={t.active} value={stats.active} icon={<UserCheck />} loading={loading} />
          <StatCard label={t.unverified} value={stats.unverified} icon={<BadgeCheck />} loading={loading} />
          <StatCard label={t.disabled} value={stats.disabled} icon={<UserX />} loading={loading} />
        </StatGrid>
      )}

      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice.text}
        </Alert>
      ) : null}

      {table.selection.size > 0 ? (
        <DataTableBulkActions table={table}>
          <Button size="sm" variant="secondary" onClick={() => void bulk("verify")}>
            <BadgeCheck />
            {t.selectedVerify}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void bulk("disable")}>
            <UserRoundX />
            {t.selectedDisable}
          </Button>
        </DataTableBulkActions>
      ) : (
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.search} />
          <DataTableFacetFilter
            table={table}
            column="status"
            title={t.status}
            options={[
              { value: "active", label: t.statusActive },
              { value: "invited", label: t.statusInvited },
              { value: "disabled", label: t.statusDisabled },
            ]}
          />
          <DataTableFacetFilter table={table} column="roles" title={t.roles} options={roles.map((r) => ({ value: r.id, label: r.label }))} />
          <DataTableFacetFilter
            table={table}
            column="verified"
            title={t.email}
            options={[
              { value: "verified", label: t.verified },
              { value: "unverified", label: t.notVerified },
            ]}
          />
          <DataTableViewOptions table={table} />
          {onAddUser ? (
            <Button variant="primary" size="sm" className="ms-auto" onClick={() => setAdding(true)}>
              <Plus />
              {t.addUser}
            </Button>
          ) : null}
        </DataTableToolbar>
      )}

      <DataTable
        table={table}
        label={t.table}
        rowLabel={(u) => u.name}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onRowClick={onOpenUser}
        empty={
          <EmptyState
            title={t.empty}
            description={t.emptyHint}
            actions={
              onAddUser ? (
                <Button variant="primary" onClick={() => setAdding(true)}>
                  <Plus />
                  {t.addUser}
                </Button>
              ) : undefined
            }
          />
        }
        rowActions={(u) => {
          const self = u.id === currentUserId;
          return [
            ...(onVerify ? [{ id: "verify", label: t.verify, icon: BadgeCheck, disabled: u.verified, onSelect: () => void verify(u), group: "manage" }] : []),
            ...(onUpdateRoles ? [{ id: "roles", label: t.editRoles, icon: ShieldCheck, onSelect: () => setEditing(u), group: "manage" }] : []),
            ...(onResetPassword ? [{ id: "reset", label: t.resetPassword, icon: KeyRound, onSelect: () => setConfirm({ kind: "reset", user: u }), group: "access" }] : []),
            ...(onImpersonate ? [{ id: "impersonate", label: t.impersonate, icon: Eye, disabled: self || u.status !== "active", onSelect: () => setConfirm({ kind: "impersonate", user: u }), group: "access" }] : []),
            ...(onSetDisabled
              ? [
                  u.status === "disabled"
                    ? { id: "enable", label: t.enable, icon: UserCheck, onSelect: () => void setDisabled(u, false), group: "danger" }
                    : { id: "disable", label: t.disable, icon: UserX, danger: true, disabled: self, onSelect: () => setConfirm({ kind: "disable", user: u }), group: "danger" },
                ]
              : []),
          ];
        }}
      />
      <DataTablePagination table={table} />

      {onAddUser ? <AddUserDialog open={adding} onOpenChange={setAdding} roles={roles} labels={labels} onSubmit={async (values) => {
        const result = await onAddUser(values);
        if (!(result && typeof result === "object" && (result.error || result.fieldErrors))) setNotice({ tone: "success", text: t.addedOk(values.name) });
        return result;
      }} /> : null}
      {onUpdateRoles ? (
        <UserRolesDialog
          user={editing}
          roles={roles}
          labels={labels}
          onOpenChange={(open) => !open && setEditing(null)}
          onSave={async (user, next) => {
            const result = await onUpdateRoles(user, next);
            if (!(result && typeof result === "object" && result.error)) setNotice({ tone: "success", text: t.rolesOk(user.name) });
            return result;
          }}
        />
      ) : null}

      <AlertDialog open={!!confirm} onOpenChange={(open) => (!open && !confirmBusy ? setConfirm(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmError ? (
            <Alert tone="danger" role="alert">
              {confirmError}
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)} disabled={confirmBusy}>
              {t.cancel}
            </Button>
            <Button variant={confirm?.kind === "disable" ? "danger" : "primary"} loading={confirmBusy} onClick={() => void runConfirm()}>
              {confirmCopy?.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
