"use client";

import { Bell, Link2, ShieldCheck, TriangleAlert, User, type LucideIcon } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../alert-dialog";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../card";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { Tabs, TabsIndicator, TabsList, TabsTab } from "../tabs";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    title: "Account settings",
    description: "Manage your profile, sign-in security and preferences.",
    nav: "Settings sections",
    profile: "Profile",
    security: "Security",
    connected: "Connected accounts",
    notifications: "Notifications",
    danger: "Danger zone",
    dangerTitle: "Delete account",
    dangerDescription: "Permanently delete your account, your data and your access to every workspace. This cannot be undone.",
    dangerButton: "Delete account",
    confirmTitle: "Delete your account?",
    confirmDescription: "Everything tied to this account is removed for good. There is no way to get it back.",
    confirmPrompt: (text: string) => `Type ${text} to confirm`,
    confirmText: "DELETE",
    confirmAction: "Delete my account",
    cancel: "Cancel",
    deleteFailed: "Your account could not be deleted. Try again.",
  },
  ar: {
    title: "إعدادات الحساب",
    description: "أدر ملفك الشخصي وأمان تسجيل الدخول وتفضيلاتك.",
    nav: "أقسام الإعدادات",
    profile: "الملف الشخصي",
    security: "الأمان",
    connected: "الحسابات المرتبطة",
    notifications: "الإشعارات",
    danger: "منطقة الخطر",
    dangerTitle: "حذف الحساب",
    dangerDescription: "احذف حسابك وبياناتك ووصولك إلى كل مساحات العمل نهائيًا. لا يمكن التراجع عن ذلك.",
    dangerButton: "حذف الحساب",
    confirmTitle: "حذف حسابك؟",
    confirmDescription: "يُحذف كل ما يرتبط بهذا الحساب نهائيًا. ولا توجد طريقة لاستعادته.",
    confirmPrompt: (text: string) => `اكتب ${text} للتأكيد`,
    confirmText: "حذف",
    confirmAction: "احذف حسابي",
    cancel: "إلغاء",
    deleteFailed: "تعذّر حذف حسابك. حاول مرة أخرى.",
  },
};

const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

/* ------------------------------------------------------------------ SettingsSection */

export interface SettingsSectionProps extends Omit<ComponentProps<"div">, "title"> {
  title: ReactNode;
  /** One or two sentences under the title. */
  description?: ReactNode;
  /** The fields or controls. */
  children?: ReactNode;
  /** A control at the inline end of the header, such as a Switch or a small button. */
  action?: ReactNode;
  /** Small text at the inline start of the footer: a hint or the last change. */
  footer?: ReactNode;
  /** Buttons at the inline end of the footer, for example Save. The footer shows only when `footer` or `actions` is set. */
  actions?: ReactNode;
  /** "danger" tints the border for destructive actions. Default "default". */
  tone?: "default" | "danger";
  /** Heading element for the title. Default "h2". */
  headingLevel?: 2 | 3 | 4;
}

/**
 * One block of a settings page: a card with a heading, a description, the content, and an optional
 * footer with a hint and action buttons. The card is a labelled region, so a screen reader can jump to it.
 */
export function SettingsSection({
  title,
  description,
  children,
  action,
  footer,
  actions,
  tone = "default",
  headingLevel = 2,
  className,
  ...props
}: SettingsSectionProps) {
  const titleId = useId();
  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      data-slot="settings-section"
      data-tone={tone}
      className={cn("gap-5", tone === "danger" && "border-nq-danger/40", className)}
      {...props}
    >
      <CardHeader>
        <CardTitle as={`h${headingLevel}`} id={titleId} className={cn("text-h3", tone === "danger" && "text-nq-danger-text")}>
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {footer || actions ? (
        <CardFooter data-slot="settings-section-footer" className="flex-wrap justify-between gap-3 border-t border-border pt-4">
          <div className="min-w-0 text-caption text-muted-foreground">{footer}</div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ DangerZone */

export interface DangerZoneProps extends Omit<ComponentProps<typeof SettingsSection>, "title" | "tone" | "children" | "action" | "actions" | "footer"> {
  /** Heading of the section. Default "Danger zone". */
  title?: ReactNode;
  /** Bold line of the row. Default "Delete account". */
  heading?: ReactNode;
  /** What deleting does and that it cannot be undone. */
  description?: ReactNode;
  /** The phrase to type before deleting: an email, a username, or the default word. Default "DELETE" / "حذف". */
  confirmText?: string;
  /** Deletes the account. Reject to keep the dialog open and show the error message. */
  onDelete: () => Promise<void>;
  /** Override any built-in English or Arabic string. */
  labels?: Partial<{
    button: string;
    confirmTitle: string;
    confirmDescription: string;
    confirmPrompt: (text: string) => string;
    confirmAction: string;
    cancel: string;
    failed: string;
  }>;
}

/**
 * The account-deletion block. The button opens an alert dialog that asks for a typed phrase before the
 * red button enables, so it cannot be done by a stray Enter. `onDelete` is yours: call the API, sign out.
 */
export function DangerZone({ title, heading, description, confirmText, onDelete, labels, ...props }: DangerZoneProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = strings(locale);
  const phrase = confirmText ?? t.confirmText;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === phrase;

  const reset = () => {
    setTyped("");
    setError(null);
  };

  const remove = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete();
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : (labels?.failed ?? t.deleteFailed));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection tone="danger" data-slot="danger-zone" title={title ?? t.danger} {...props}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-label text-foreground">{heading ?? t.dangerTitle}</p>
          <p className="text-body-sm text-muted-foreground">{description ?? t.dangerDescription}</p>
        </div>
        <AlertDialog
          open={open}
          onOpenChange={(next) => {
            if (busy) return;
            setOpen(next);
            if (!next) reset();
          }}
        >
          <AlertDialogTrigger render={<Button variant="danger" className="shrink-0" />}>{labels?.button ?? t.dangerButton}</AlertDialogTrigger>
          <AlertDialogContent>
            <form
              noValidate
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{labels?.confirmTitle ?? t.confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{labels?.confirmDescription ?? t.confirmDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <Field invalid={!!error}>
                <FieldLabel>
                  {(labels?.confirmPrompt ?? t.confirmPrompt)("⁨" + phrase + "⁩")}
                </FieldLabel>
                <Input
                  ltr
                  name="confirm-delete"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={typed}
                  disabled={busy}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setError(null);
                  }}
                />
                {error ? (
                  <FieldDescription role="alert" className="text-nq-danger-text">
                    {error}
                  </FieldDescription>
                ) : null}
              </Field>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>{labels?.cancel ?? t.cancel}</AlertDialogCancel>
                <Button type="submit" variant="danger" loading={busy} disabled={!matches}>
                  {labels?.confirmAction ?? t.confirmAction}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------------ AccountSettings */

export interface AccountSettingsItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Shown to assistive technology and as a tooltip on the desktop nav. */
  description?: string;
  /** "danger" colours the item as destructive. */
  tone?: "default" | "danger";
  /** A count or dot at the inline end of the desktop nav item. */
  badge?: ReactNode;
  /** The content for this item. Or pass `children` to render it yourself. */
  content?: ReactNode;
}

/** The five standard sections in the account settings order, labelled in the active language. */
export function defaultAccountSettingsItems(locale = "en"): AccountSettingsItem[] {
  const t = strings(locale);
  return [
    { id: "profile", label: t.profile, icon: User },
    { id: "security", label: t.security, icon: ShieldCheck },
    { id: "connected", label: t.connected, icon: Link2 },
    { id: "notifications", label: t.notifications, icon: Bell },
    { id: "danger", label: t.danger, icon: TriangleAlert, tone: "danger" },
  ];
}

export interface AccountSettingsProps extends Omit<ComponentProps<"div">, "title" | "children"> {
  /** Page title. Default "Account settings" / "إعدادات الحساب". */
  title?: ReactNode;
  /** Text under the title. Default a one-line summary. Pass `null` to hide. */
  description?: ReactNode | null;
  /** Nav items. Default `defaultAccountSettingsItems(locale)`: Profile, Security, Connected accounts, Notifications, Danger zone. */
  items?: readonly AccountSettingsItem[];
  /** The active item id. Controlled. */
  value?: string;
  /** The item shown first when uncontrolled. Default: the first item. */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  /** The content. A function receives the active item id. Ignored for an item that has its own `content`. */
  children?: ReactNode | ((id: string) => ReactNode);
  /** Accessible name of the section nav. Default "Settings sections" / "أقسام الإعدادات". */
  navLabel?: string;
}

const navItem = [
  "flex h-nav-row w-full min-h-[var(--nq-touch-min,0px)] items-center gap-2.5 rounded-control px-3 text-start text-body-sm text-muted-foreground outline-none",
  "transition-colors duration-150 ease-nq hover:bg-nq-hover hover:text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
  "data-[active=true]:bg-nq-selected data-[active=true]:font-medium data-[active=true]:text-foreground",
  "[&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

/**
 * The settings page layout: a title, a section nav (a vertical list on wide screens, scrolling tabs on
 * narrow ones) and a content area. It only switches which content shows; the sections themselves
 * (`ProfileForm`, security components, `DangerZone`) are yours, wrapped in `SettingsSection`.
 */
export function AccountSettings({
  title,
  description,
  items,
  value,
  defaultValue,
  onValueChange,
  children,
  navLabel,
  className,
  ...props
}: AccountSettingsProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = strings(locale);
  const list = items ?? defaultAccountSettingsItems(locale);
  const [inner, setInner] = useState(defaultValue ?? list[0]?.id ?? "");
  const activeId = value ?? inner;
  const active = list.find((item) => item.id === activeId) ?? list[0];
  const contentId = useId();

  const select = (id: string) => {
    if (value === undefined) setInner(id);
    onValueChange?.(id);
  };

  const body = active?.content ?? (typeof children === "function" ? children(active?.id ?? "") : children);

  return (
    <div data-slot="account-settings" className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6", className)} {...props}>
      <header data-slot="account-settings-header" className="flex flex-col gap-1">
        <h1 className="text-h1 text-foreground">{title ?? t.title}</h1>
        {description === null ? null : <p className="text-body text-muted-foreground">{description ?? t.description}</p>}
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-10">
        <div data-slot="account-settings-nav" className="min-w-0 overflow-x-auto md:overflow-visible">
          <Tabs value={active?.id} onValueChange={(next) => select(String(next))} className="gap-0 md:hidden">
            <TabsList variant="underline" aria-label={navLabel ?? t.nav} className="gap-5">
              {list.map((item) => {
                const Icon = item.icon;
                return (
                  <TabsTab key={item.id} value={item.id} aria-controls={contentId} className={cn(item.tone === "danger" && "text-nq-danger-text data-active:text-nq-danger-text")}>
                    {Icon ? <Icon aria-hidden="true" /> : null}
                    {item.label}
                  </TabsTab>
                );
              })}
              <TabsIndicator />
            </TabsList>
          </Tabs>
          <nav aria-label={navLabel ?? t.nav} className="sticky top-4 hidden md:block">
            <ul className="flex flex-col gap-0.5">
              {list.map((item) => {
                const Icon = item.icon;
                const current = item.id === active?.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-active={current}
                      data-tone={item.tone}
                      aria-current={current ? "page" : undefined}
                      aria-controls={contentId}
                      title={item.description}
                      className={cn(navItem, item.tone === "danger" && "text-nq-danger-text hover:text-nq-danger-text data-[active=true]:text-nq-danger-text")}
                      onClick={() => select(item.id)}
                    >
                      {Icon ? <Icon aria-hidden="true" /> : null}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge ? <span className="shrink-0 text-caption tabular-nums">{item.badge}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div
          id={contentId}
          role="region"
          aria-label={active?.label}
          data-slot="account-settings-content"
          data-section={active?.id}
          className="flex min-w-0 flex-col gap-6"
        >
          {body}
        </div>
      </div>
    </div>
  );
}
