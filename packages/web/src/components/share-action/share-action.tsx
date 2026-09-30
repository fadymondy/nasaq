"use client";

import { Clock, Globe, Lock, Mail, Share2, UserPlus, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Avatar } from "../avatar";
import { Button, type ButtonProps } from "../button";
import { CopyField } from "../copy-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { TagInput } from "../tag-input";
import { expiryToDate, isEmail, mailtoLink, type ShareExpiry, withExpiry } from "./share-helpers";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    share: "Share",
    title: "Share",
    description: "Invite people or send a link.",
    invite: "Invite people",
    invitePlaceholder: "Add email addresses",
    inviteHint: "Press Enter or comma after each address.",
    invalidEmail: (v: string) => `${v} is not a valid email address.`,
    sendInvite: "Send invite",
    inviteSent: (n: string) => `Invitation sent to ${n}.`,
    role: "Role",
    people: "People with access",
    owner: "Owner",
    remove: "Remove access",
    removeFor: (name: string) => `Remove ${name}`,
    roleFor: (name: string) => `Role for ${name}`,
    linkAccess: "Link access",
    restricted: "Restricted",
    restrictedHint: "Only people you invite can open the link.",
    anyone: "Anyone with the link",
    anyoneHint: "Anyone who has the link can open it.",
    linkRole: "Link permission",
    expiry: "Link expires",
    never: "Never",
    "1d": "In 1 day",
    "7d": "In 7 days",
    "30d": "In 30 days",
    link: "Link",
    copyLink: "Copy link",
    copied: "Copied",
    nativeShare: "Share via…",
    email: "Email",
    done: "Done",
    close: "Close",
    failed: "Something went wrong. Try again.",
    expiresOn: "Expires",
  },
  ar: {
    share: "مشاركة",
    title: "مشاركة",
    description: "ادعُ أشخاصًا أو أرسل رابطًا.",
    invite: "دعوة أشخاص",
    invitePlaceholder: "أضف عناوين البريد",
    inviteHint: "اضغط Enter أو الفاصلة بعد كل عنوان.",
    invalidEmail: (v: string) => `${v} ليس بريدًا إلكترونيًا صالحًا.`,
    sendInvite: "إرسال الدعوة",
    inviteSent: (n: string) => `أُرسلت الدعوة إلى ${n}.`,
    role: "الدور",
    people: "أشخاص لديهم صلاحية",
    owner: "المالك",
    remove: "إزالة الصلاحية",
    removeFor: (name: string) => `إزالة ${name}`,
    roleFor: (name: string) => `دور ${name}`,
    linkAccess: "الوصول عبر الرابط",
    restricted: "مقيّد",
    restrictedHint: "يفتح الرابط من دعوتهم فقط.",
    anyone: "أي شخص لديه الرابط",
    anyoneHint: "يستطيع فتحه كل من لديه الرابط.",
    linkRole: "صلاحية الرابط",
    expiry: "ينتهي الرابط",
    never: "أبدًا",
    "1d": "بعد يوم",
    "7d": "بعد 7 أيام",
    "30d": "بعد 30 يومًا",
    link: "الرابط",
    copyLink: "نسخ الرابط",
    copied: "تم النسخ",
    nativeShare: "مشاركة عبر…",
    email: "البريد",
    done: "تم",
    close: "إغلاق",
    failed: "حدث خطأ. حاول مرة أخرى.",
    expiresOn: "ينتهي",
  },
};
export type ShareActionLabels = typeof STRINGS.en;

/* ------------------------------------------------------------------ types */

export type ShareLinkAccess = "restricted" | "anyone";
export type { ShareExpiry };

export interface ShareRole {
  value: string;
  label: string;
}

export interface SharePerson {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  /** A `ShareRole.value`. */
  role: string;
  /** The owner cannot be changed or removed. */
  owner?: boolean;
}

export interface ShareLinkSettings {
  access: ShareLinkAccess;
  /** The role people get through the link. */
  role: string;
  expiry: ShareExpiry;
  /** The computed moment, or null. */
  expiresAt: Date | null;
}

export interface ShareActionProps {
  /** The link to share. */
  url: string;
  /** Title for the Web Share sheet and the email subject. */
  title?: string;
  /** Text for the Web Share sheet and the email body. */
  text?: string;
  /** Roles a person can have. Default viewer, commenter, editor. */
  roles?: ShareRole[];
  /** The role new invitees start with. Default the first role. */
  defaultRole?: string;
  /** Who already has access. */
  people?: SharePerson[];
  /** Send the invitations. Reject to show an error. */
  onInvite?: (emails: string[], role: string) => void | Promise<void>;
  onRoleChange?: (person: SharePerson, role: string) => void | Promise<void>;
  onRemove?: (person: SharePerson) => void | Promise<void>;
  /** Show the link access section. Default true. */
  linkAccess?: boolean;
  access?: ShareLinkAccess;
  defaultAccess?: ShareLinkAccess;
  linkRole?: string;
  defaultLinkRole?: string;
  expiry?: ShareExpiry;
  defaultExpiry?: ShareExpiry;
  /** Called when the access level, link role or expiry changes. */
  onLinkChange?: (settings: ShareLinkSettings) => void;
  /** Called after the link was copied. */
  onCopy?: (url: string) => void;
  /** Called after the Web Share sheet completed. */
  onShared?: () => void;
  /** Also show an "Email" link that opens the mail app. Default true. */
  mailto?: boolean;
  /** The trigger's text. Default "Share". */
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  className?: string;
  labels?: Partial<ShareActionLabels>;
}

const DEFAULT_ROLES: Record<"en" | "ar", ShareRole[]> = {
  en: [
    { value: "viewer", label: "Can view" },
    { value: "commenter", label: "Can comment" },
    { value: "editor", label: "Can edit" },
  ],
  ar: [
    { value: "viewer", label: "يمكنه العرض" },
    { value: "commenter", label: "يمكنه التعليق" },
    { value: "editor", label: "يمكنه التعديل" },
  ],
};
const EXPIRIES: ShareExpiry[] = ["never", "1d", "7d", "30d"];

/* ------------------------------------------------------------------ hooks */

function useControlled<T>(value: T | undefined, initial: T) {
  const [inner, setInner] = useState(initial);
  return [value ?? inner, setInner] as const;
}

/** True once mounted and only when the browser can open a native share sheet. */
function useNativeShare() {
  const [can, setCan] = useState(false);
  useEffect(() => setCan(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);
  return can;
}

function useStrings(labels?: Partial<ShareActionLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const lang = locale.startsWith("ar") ? "ar" : "en";
  return { locale, lang, t: { ...STRINGS[lang], ...labels } } as const;
}

function RoleSelect({ value, onChange, roles, label, disabled, className }: { value: string; onChange: (v: string) => void; roles: ShareRole[]; label: string; disabled?: boolean; className?: string }) {
  return (
    <Select items={roles} value={value} onValueChange={(v) => v && onChange(v as string)} disabled={disabled}>
      <SelectTrigger aria-label={label} className={cn("w-auto min-w-32", className)}>
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
  );
}

/* ------------------------------------------------------------------ dialog */

export interface ShareDialogProps extends Omit<ShareActionProps, "children" | "variant" | "size" | "disabled" | "className"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The share dialog: people with access, an email invite with a role, link access (restricted or anyone with the
 * link) with an expiry, the link to copy, and the native share sheet where the browser has one.
 */
export function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  text,
  roles: rolesProp,
  defaultRole,
  people = [],
  onInvite,
  onRoleChange,
  onRemove,
  linkAccess = true,
  access: accessProp,
  defaultAccess = "restricted",
  linkRole: linkRoleProp,
  defaultLinkRole,
  expiry: expiryProp,
  defaultExpiry = "never",
  onLinkChange,
  onCopy,
  onShared,
  mailto = true,
  labels,
}: ShareDialogProps) {
  const { lang, t } = useStrings(labels);
  const roles = rolesProp ?? DEFAULT_ROLES[lang];
  const firstRole = roles[0]?.value ?? "viewer";
  const id = useId();
  const canShare = useNativeShare();

  const [inviteRole, setInviteRole] = useState(defaultRole ?? firstRole);
  const [emails, setEmails] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [access, setAccess] = useControlled(accessProp, defaultAccess);
  const [linkRole, setLinkRole] = useControlled(linkRoleProp, defaultLinkRole ?? firstRole);
  const [expiry, setExpiry] = useControlled(expiryProp, defaultExpiry);

  useEffect(() => {
    if (!open) {
      setEmails([]);
      setMessage(null);
    }
  }, [open]);

  const emitLink = (next: Partial<Pick<ShareLinkSettings, "access" | "role" | "expiry">>) => {
    const settings = { access, role: linkRole, expiry, ...next };
    if (next.access) setAccess(next.access);
    if (next.role) setLinkRole(next.role);
    if (next.expiry) setExpiry(next.expiry);
    onLinkChange?.({ ...settings, expiresAt: expiryToDate(settings.expiry) });
  };

  const sendInvite = async () => {
    if (!emails.length || !onInvite) return;
    setPending(true);
    setMessage(null);
    try {
      await onInvite(emails, inviteRole);
      setMessage({ tone: "success", text: t.inviteSent(emails.join(", ")) });
      setEmails([]);
    } catch (error) {
      setMessage({ tone: "danger", text: (error as Error)?.message || t.failed });
    } finally {
      setPending(false);
    }
  };

  const shareLink = access === "anyone" ? withExpiry(url, expiry) : url;
  const roleLabel = (value: string) => roles.find((r) => r.value === value)?.label ?? value;

  const nativeShare = async () => {
    try {
      await navigator.share({ url: shareLink, title, text });
      onShared?.();
    } catch {
      /* The user closed the sheet. */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg grid-cols-[minmax(0,1fr)]" data-slot="share-dialog">
        <DialogHeader>
          <DialogTitle>{title ? `${t.title}: ${title}` : t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {onInvite ? (
            <section className="flex flex-col gap-2" aria-labelledby={`${id}-invite`}>
              <h3 id={`${id}-invite`} className="text-label text-foreground">
                {t.invite}
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <TagInput
                  className="min-w-0 flex-1"
                  value={emails}
                  onValueChange={setEmails}
                  placeholder={t.invitePlaceholder}
                  separators={[",", ";", " "]}
                  addOnBlur
                  validate={(v, current) => (isEmail(v) ? !current.includes(v.toLowerCase()) : t.invalidEmail(v))}
                  inputProps={{ type: "email", dir: "ltr", "aria-label": t.invite }}
                />
                <RoleSelect value={inviteRole} onChange={setInviteRole} roles={roles} label={t.role} />
                <Button variant="primary" disabled={!emails.length} loading={pending} onClick={sendInvite}>
                  <UserPlus aria-hidden />
                  {t.sendInvite}
                </Button>
              </div>
              <p className="text-caption text-muted-foreground">{t.inviteHint}</p>
              {message ? (
                <Alert tone={message.tone} role={message.tone === "danger" ? "alert" : "status"}>
                  {message.text}
                </Alert>
              ) : null}
            </section>
          ) : null}

          {people.length ? (
            <section className="flex flex-col gap-2" aria-labelledby={`${id}-people`}>
              <h3 id={`${id}-people`} className="text-label text-foreground">
                {t.people}
              </h3>
              <ul className="flex max-h-48 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
                {people.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={p.name} src={p.avatar} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-sm text-foreground">{p.name}</span>
                      {p.email ? (
                        <bdi dir="ltr" className="truncate text-start text-caption text-muted-foreground">
                          {p.email}
                        </bdi>
                      ) : null}
                    </span>
                    {p.owner ? (
                      <span className="text-body-sm text-muted-foreground">{t.owner}</span>
                    ) : (
                      <>
                        <RoleSelect value={p.role} onChange={(v) => onRoleChange?.(p, v)} roles={roles} label={t.roleFor(p.name)} disabled={!onRoleChange} className="h-8 min-w-28 text-body-sm" />
                        {onRemove ? (
                          <Button variant="ghost" size="icon-sm" aria-label={t.removeFor(p.name)} onClick={() => onRemove(p)}>
                            <X aria-hidden />
                          </Button>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {linkAccess ? (
            <section className="flex flex-col gap-3" aria-labelledby={`${id}-access`}>
              <h3 id={`${id}-access`} className="text-label text-foreground">
                {t.linkAccess}
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-start gap-2.5">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {access === "anyone" ? <Globe aria-hidden className="size-4" /> : <Lock aria-hidden className="size-4" />}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <Select
                      items={[
                        { value: "restricted", label: t.restricted },
                        { value: "anyone", label: t.anyone },
                      ]}
                      value={access}
                      onValueChange={(v) => v && emitLink({ access: v as ShareLinkAccess })}
                    >
                      <SelectTrigger aria-label={t.linkAccess} className="h-8 w-auto border-transparent bg-transparent ps-1 text-label">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restricted">{t.restricted}</SelectItem>
                        <SelectItem value="anyone">{t.anyone}</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="ps-1 text-caption text-muted-foreground">{access === "anyone" ? t.anyoneHint : t.restrictedHint}</span>
                  </span>
                </span>
                {access === "anyone" ? <RoleSelect value={linkRole} onChange={(v) => emitLink({ role: v })} roles={roles} label={t.linkRole} /> : null}
              </div>

              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Clock aria-hidden className="size-4" />
                </span>
                <span className="flex-1 text-body-sm text-foreground">{t.expiry}</span>
                <Select
                  items={EXPIRIES.map((e) => ({ value: e, label: t[e] }))}
                  value={expiry}
                  onValueChange={(v) => v && emitLink({ expiry: v as ShareExpiry })}
                >
                  <SelectTrigger aria-label={t.expiry} className="w-auto min-w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRIES.map((e) => (
                      <SelectItem key={e} value={e}>
                        {t[e]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-2" aria-labelledby={`${id}-link`}>
            <h3 id={`${id}-link`} className="text-label text-foreground">
              {t.link}
            </h3>
            <CopyField value={shareLink} label={t.link} copyLabel={t.copyLink} copiedLabel={t.copied} onCopy={() => onCopy?.(shareLink)} />
            {access === "anyone" && linkRole ? (
              <p className="text-caption text-muted-foreground">
                {t.anyone}: {roleLabel(linkRole)}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {canShare ? (
                <Button variant="secondary" size="sm" onClick={nativeShare}>
                  <Share2 aria-hidden />
                  {t.nativeShare}
                </Button>
              ) : null}
              {mailto ? (
                <Button variant="secondary" size="sm" nativeButton={false} render={<a href={mailtoLink(shareLink, title, text)} />}>
                  <Mail aria-hidden />
                  {t.email}
                </Button>
              ) : null}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            {t.done}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ button */

/** A "Share" button that opens the share dialog. Use `ShareDialog` to open it from your own control. */
export function ShareButton({ children, variant = "secondary", size = "sm", disabled, className, ...props }: ShareActionProps) {
  const { t } = useStrings(props.labels);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} disabled={disabled} className={className} data-slot="share-button" onClick={() => setOpen(true)}>
        <Share2 aria-hidden />
        {children ?? t.share}
      </Button>
      <ShareDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
