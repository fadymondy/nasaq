"use client";

import { Ellipsis, KeyRound, Link2, Pencil, Trash2, UserCog } from "lucide-react";
import { type ComponentProps, type FormEvent, useEffect, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Button } from "../button";
import { CopyField } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { PasswordInput } from "../password-input";
import { Spinner } from "../spinner";
import { TagInput } from "../tag-input";

const STRINGS = {
  en: {
    actions: "Actions for {name}",
    edit: "Edit…",
    impersonate: "Impersonate…",
    password: "Password…",
    magicLink: "Send sign-in link",
    delete: "Delete…",
    cancel: "Cancel",
    failed: "That did not work. Try again.",
    editTitle: "Edit {name}",
    editBody: "Changes apply on their next request.",
    email: "Email address",
    emailInvalid: "Enter a valid email address.",
    roles: "Roles",
    permissions: "Permissions",
    tagPlaceholder: "Type and press Enter",
    save: "Save changes",
    impersonateTitle: "Impersonate {name}?",
    impersonateBody: "You will see the app exactly as they do. Everything you do is recorded in the audit log under both names.",
    impersonateConfirm: "Start impersonating",
    passwordTitle: "Password for {name}",
    passwordBody: "Set a new password yourself, or send them a link to choose one.",
    newPassword: "New password",
    passwordShort: "Use at least {min} characters.",
    setPassword: "Set password",
    sendReset: "Send reset link",
    passwordSet: "The password was changed. Tell them through a channel you trust.",
    resetLinkTitle: "Password reset link",
    magicLinkTitle: "Sign-in link",
    working: "Creating the link…",
    emailed: "We emailed the link to {email}.",
    shareOnce: "It works once. Share it only with this person.",
    link: "Link",
    noLink: "The server did not return a link.",
    done: "Done",
    deleteTitle: "Delete {name}?",
    deleteBody: "Their account and access go away at once. This cannot be undone.",
    deleteConfirm: "Delete user",
  },
  ar: {
    actions: "إجراءات {name}",
    edit: "تعديل…",
    impersonate: "انتحال الهوية…",
    password: "كلمة المرور…",
    magicLink: "إرسال رابط تسجيل الدخول",
    delete: "حذف…",
    cancel: "إلغاء",
    failed: "لم ينجح ذلك. حاول مرة أخرى.",
    editTitle: "تعديل {name}",
    editBody: "تسري التغييرات عند طلبه التالي.",
    email: "البريد الإلكتروني",
    emailInvalid: "أدخل بريدًا إلكترونيًا صالحًا.",
    roles: "الأدوار",
    permissions: "الصلاحيات",
    tagPlaceholder: "اكتب واضغط Enter",
    save: "حفظ التغييرات",
    impersonateTitle: "انتحال هوية {name}؟",
    impersonateBody: "سترى التطبيق كما يراه تمامًا. كل ما تفعله يُسجَّل في سجل التدقيق باسمكما معًا.",
    impersonateConfirm: "بدء انتحال الهوية",
    passwordTitle: "كلمة مرور {name}",
    passwordBody: "عيّن كلمة مرور جديدة بنفسك، أو أرسل له رابطًا ليختار واحدة.",
    newPassword: "كلمة المرور الجديدة",
    passwordShort: "استخدم {min} أحرف على الأقل.",
    setPassword: "تعيين كلمة المرور",
    sendReset: "إرسال رابط إعادة التعيين",
    passwordSet: "تم تغيير كلمة المرور. أبلغه بها عبر قناة موثوقة.",
    resetLinkTitle: "رابط إعادة تعيين كلمة المرور",
    magicLinkTitle: "رابط تسجيل الدخول",
    working: "جارٍ إنشاء الرابط…",
    emailed: "أرسلنا الرابط إلى {email}.",
    shareOnce: "يعمل مرة واحدة. شاركه مع هذا الشخص فقط.",
    link: "الرابط",
    noLink: "لم يُرجع الخادم رابطًا.",
    done: "تم",
    deleteTitle: "حذف {name}؟",
    deleteBody: "يُحذف حسابه وصلاحياته فورًا. لا يمكن التراجع عن ذلك.",
    deleteConfirm: "حذف المستخدم",
  },
};

export type UserActionsMenuLabels = typeof STRINGS.en;

/** The person the actions apply to. */
export interface UserActionsTarget {
  /** Shown in titles. Default: the email. */
  name?: string;
  email: string;
  roles?: readonly string[];
  /** Omit to hide the permissions field in the edit dialog. */
  permissions?: readonly string[];
}

export interface UserEditValues {
  email: string;
  roles: string[];
  permissions: string[];
}

/** Nothing on success, or `{ error }` to keep the dialog open and show it. */
export type UserActionResult = void | { error?: string };

/** What a link action resolves to: the link to share, whether it was emailed, or an error. */
export type UserLinkResult = void | { link?: string; emailed?: boolean; error?: string };

export interface UserActionsMenuProps extends Omit<ComponentProps<"div">, "children"> {
  user: UserActionsTarget;
  /** `"menu"`: a "…" button with a menu. `"toolbar"`: a row of buttons. Default `"menu"`. */
  variant?: "menu" | "toolbar";
  onEdit?: (values: UserEditValues) => Promise<UserActionResult> | UserActionResult;
  /** Asks to confirm first, with an audit warning. */
  onImpersonate?: () => Promise<UserActionResult> | UserActionResult;
  /** Set a password directly. Adds the field to the password dialog. */
  onSetPassword?: (password: string) => Promise<UserActionResult> | UserActionResult;
  /** Create a reset link. Return `{ link }` to show it with a copy button, `{ emailed: true }` when it was emailed. */
  onSendResetLink?: () => Promise<UserLinkResult> | UserLinkResult;
  /** Create a one-time sign-in link. Same result as `onSendResetLink`. */
  onSendMagicLink?: () => Promise<UserLinkResult> | UserLinkResult;
  /** Asks to confirm first. */
  onDelete?: () => Promise<UserActionResult> | UserActionResult;
  /** Offered while typing roles in the edit dialog. */
  roleSuggestions?: readonly string[];
  permissionSuggestions?: readonly string[];
  /** Minimum length for `onSetPassword`. Default 8. */
  minPasswordLength?: number;
  labels?: Partial<UserActionsMenuLabels>;
}

type Dialogs = "edit" | "impersonate" | "password" | "delete" | null;
type LinkState = { title: string; pending: boolean; result?: UserLinkResult; error?: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);

async function run<T>(fn: () => Promise<T> | T): Promise<{ value?: T; failed?: true }> {
  try {
    return { value: await fn() };
  } catch {
    return { failed: true };
  }
}

/**
 * The actions an admin takes on one account: edit email, roles and permissions, impersonate, set a password or send
 * a reset link, send a sign-in link, and delete. Each action shows only when you pass its handler. It owns its
 * dialogs: confirmations for impersonate and delete, and a copyable link when the server returns one.
 */
export function UserActionsMenu({
  user,
  variant = "menu",
  onEdit,
  onImpersonate,
  onSetPassword,
  onSendResetLink,
  onSendMagicLink,
  onDelete,
  roleSuggestions,
  permissionSuggestions,
  minPasswordLength = 8,
  labels,
  className,
  ...props
}: UserActionsMenuProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...STRINGS[locale.startsWith("ar") ? "ar" : "en"], ...labels };
  const name = user.name || user.email;
  const [open, setOpen] = useState<Dialogs>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<LinkState>(null);
  const [edit, setEdit] = useState<UserEditValues>({ email: user.email, roles: [...(user.roles ?? [])], permissions: [...(user.permissions ?? [])] });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);

  const show = (dialog: Dialogs) => {
    setError(null);
    if (dialog === "edit") {
      setEdit({ email: user.email, roles: [...(user.roles ?? [])], permissions: [...(user.permissions ?? [])] });
      setEmailError(null);
    }
    if (dialog === "password") {
      setPassword("");
      setPasswordError(null);
      setPasswordDone(false);
    }
    setOpen(dialog);
  };
  const close = () => {
    if (!busy) setOpen(null);
  };
  // Keep the edit form in step when the row's user changes underneath a closed dialog.
  useEffect(() => {
    if (open !== "edit") setEdit({ email: user.email, roles: [...(user.roles ?? [])], permissions: [...(user.permissions ?? [])] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /** Runs an action that resolves to `{ error }`; closes the dialog on success. */
  const act = async (fn: () => Promise<UserActionResult> | UserActionResult, after?: () => void) => {
    setBusy(true);
    setError(null);
    const { value, failed } = await run(fn);
    setBusy(false);
    if (failed || value?.error) {
      setError(value?.error || t.failed);
      return false;
    }
    if (after) after();
    else setOpen(null);
    return true;
  };

  const linkAction = async (title: string, fn: () => Promise<UserLinkResult> | UserLinkResult) => {
    setOpen(null);
    setLink({ title, pending: true });
    const { value, failed } = await run(fn);
    if (failed || value?.error) setLink({ title, pending: false, error: value?.error || t.failed });
    else setLink({ title, pending: false, result: value });
  };

  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(edit.email.trim())) {
      setEmailError(t.emailInvalid);
      return;
    }
    void act(() => onEdit?.({ ...edit, email: edit.email.trim() }));
  };

  const savePassword = (event: FormEvent) => {
    event.preventDefault();
    if (password.length < minPasswordLength) {
      setPasswordError(fill(t.passwordShort, { min: String(minPasswordLength) }));
      return;
    }
    void act(
      () => onSetPassword?.(password),
      () => setPasswordDone(true),
    );
  };

  const withPassword = Boolean(onSetPassword || onSendResetLink);
  const items = [
    onEdit ? { id: "edit", icon: Pencil, label: t.edit, select: () => show("edit") } : null,
    onImpersonate ? { id: "impersonate", icon: UserCog, label: t.impersonate, select: () => show("impersonate") } : null,
    withPassword ? { id: "password", icon: KeyRound, label: t.password, select: () => show("password") } : null,
    onSendMagicLink ? { id: "magic-link", icon: Link2, label: t.magicLink, select: () => void linkAction(t.magicLinkTitle, onSendMagicLink) } : null,
  ].filter((i) => i !== null);
  const errorBox = error ? (
    <Alert tone="danger" role="alert">
      {error}
    </Alert>
  ) : null;

  return (
    <div data-slot="user-actions-menu" data-variant={variant} className={cn(variant === "toolbar" ? "flex flex-wrap items-center gap-2" : "inline-flex", className)} {...props}>
      {variant === "toolbar" ? (
        <>
          {items.map((item) => (
            <Button key={item.id} type="button" variant="secondary" size="sm" onClick={item.select} data-action={item.id}>
              <item.icon aria-hidden />
              {item.label}
            </Button>
          ))}
          {onDelete ? (
            <Button type="button" variant="secondary" size="sm" className="text-nq-danger-text" onClick={() => show("delete")} data-action="delete">
              <Trash2 aria-hidden />
              {t.delete}
            </Button>
          ) : null}
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={fill(t.actions, { name })} />}>
            <Ellipsis aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {items.map((item) => (
              <DropdownMenuItem key={item.id} onClick={item.select} data-action={item.id}>
                <item.icon aria-hidden />
                {item.label}
              </DropdownMenuItem>
            ))}
            {onDelete && items.length ? <DropdownMenuSeparator /> : null}
            {onDelete ? (
              <DropdownMenuItem variant="danger" onClick={() => show("delete")} data-action="delete">
                <Trash2 aria-hidden />
                {t.delete}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={open === "edit"} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent className="max-w-lg">
          <form onSubmit={saveEdit} noValidate className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{fill(t.editTitle, { name })}</DialogTitle>
              <DialogDescription>{t.editBody}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field invalid={!!emailError}>
                <FieldLabel>{t.email}</FieldLabel>
                <Input
                  ltr
                  type="email"
                  autoComplete="off"
                  value={edit.email}
                  onChange={(e) => {
                    setEdit({ ...edit, email: e.currentTarget.value });
                    setEmailError(null);
                  }}
                />
                <FieldError match={!!emailError}>{emailError}</FieldError>
              </Field>
              <Field>
                <FieldLabel>{t.roles}</FieldLabel>
                <TagInput value={edit.roles} onValueChange={(roles) => setEdit({ ...edit, roles })} suggestions={roleSuggestions} placeholder={t.tagPlaceholder} addOnBlur />
              </Field>
              {user.permissions ? (
                <Field>
                  <FieldLabel>{t.permissions}</FieldLabel>
                  <TagInput
                    value={edit.permissions}
                    onValueChange={(permissions) => setEdit({ ...edit, permissions })}
                    suggestions={permissionSuggestions}
                    placeholder="users:read"
                    addOnBlur
                    inputProps={{ dir: "ltr" }}
                  />
                </Field>
              ) : null}
              {errorBox}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close} disabled={busy}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                {t.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "password"} onOpenChange={(next) => (next ? null : close())}>
        <DialogContent className="max-w-md">
          <form onSubmit={savePassword} noValidate className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{fill(t.passwordTitle, { name })}</DialogTitle>
              <DialogDescription>{passwordDone ? null : t.passwordBody}</DialogDescription>
            </DialogHeader>
            {passwordDone ? (
              <Alert tone="success" role="status">
                {t.passwordSet}
              </Alert>
            ) : (
              <div className="flex flex-col gap-4">
                {onSetPassword ? (
                  <Field invalid={!!passwordError}>
                    <FieldLabel>{t.newPassword}</FieldLabel>
                    <PasswordInput
                      name="new-password"
                      autoComplete="new-password"
                      showStrength
                      value={password}
                      aria-invalid={passwordError ? true : undefined}
                      onChange={(e) => {
                        setPassword(e.currentTarget.value);
                        setPasswordError(null);
                      }}
                    />
                    {passwordError ? <FieldError match>{passwordError}</FieldError> : <FieldDescription>{fill(t.passwordShort, { min: String(minPasswordLength) })}</FieldDescription>}
                  </Field>
                ) : null}
                {errorBox}
              </div>
            )}
            <DialogFooter>
              {passwordDone ? (
                <Button type="button" variant="primary" onClick={close}>
                  {t.done}
                </Button>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={close} disabled={busy}>
                    {t.cancel}
                  </Button>
                  {onSendResetLink ? (
                    <Button type="button" variant={onSetPassword ? "secondary" : "primary"} disabled={busy} onClick={() => void linkAction(t.resetLinkTitle, onSendResetLink)}>
                      {t.sendReset}
                    </Button>
                  ) : null}
                  {onSetPassword ? (
                    <Button type="submit" variant="primary" loading={busy}>
                      {t.setPassword}
                    </Button>
                  ) : null}
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!link} onOpenChange={(next) => (next || link?.pending ? null : setLink(null))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{link?.title}</DialogTitle>
            <DialogDescription className="sr-only">{user.email}</DialogDescription>
          </DialogHeader>
          <div role="status" aria-busy={link?.pending || undefined} className="flex flex-col gap-3">
            {link?.pending ? (
              <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Spinner aria-hidden className="size-4" />
                {t.working}
              </p>
            ) : link?.error ? (
              <Alert tone="danger">{link.error}</Alert>
            ) : (
              <>
                {link?.result?.emailed ? (
                  <Alert tone="success">
                    {fill(t.emailed, { email: "⁨" + user.email + "⁩" })}
                  </Alert>
                ) : null}
                {link?.result?.link ? (
                  <>
                    <CopyField value={link.result.link} label={t.link} />
                    <p className="text-caption text-muted-foreground">{t.shareOnce}</p>
                  </>
                ) : !link?.result?.emailed ? (
                  <p className="text-body-sm text-muted-foreground">{t.noLink}</p>
                ) : null}
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="primary" disabled={link?.pending} onClick={() => setLink(null)}>
              {t.done}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={open === "impersonate" || open === "delete"} onOpenChange={(next) => (next ? null : close())}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fill(open === "delete" ? t.deleteTitle : t.impersonateTitle, { name })}</AlertDialogTitle>
            <AlertDialogDescription>{open === "delete" ? t.deleteBody : t.impersonateBody}</AlertDialogDescription>
          </AlertDialogHeader>
          {errorBox}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={close} disabled={busy}>
              {t.cancel}
            </Button>
            <Button variant={open === "delete" ? "danger" : "primary"} loading={busy} onClick={() => void act(() => (open === "delete" ? onDelete?.() : onImpersonate?.()))}>
              {open === "delete" ? t.deleteConfirm : t.impersonateConfirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
