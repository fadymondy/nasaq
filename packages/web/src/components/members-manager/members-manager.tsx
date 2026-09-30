"use client";

import { Crown, LogOut, Mail, RotateCw, UserMinus, UserPlus, X } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../alert-dialog";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import {
  type DataTableColumn,
  DataTable,
  DataTableFacetFilter,
  DataTablePagination,
  DataTableSearch,
  DataTableToolbar,
  useDataTable,
} from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { type PersonProfile, ProfileHoverCard, type ProfileCardProps } from "../profile-card/profile-card";
import { EmptyState } from "../states";
import { Status } from "../status";
import { TagInput } from "../tag-input";
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Tooltip } from "../tooltip";
import { canLeave, isEmailAddress, isLastOwner, removeBlock, roleChangeBlock, roleChoices } from "./members-rules";

export { canLeave, isLastOwner, ownerCount, removeBlock, roleChangeBlock, roleChoices } from "./members-rules";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    title: "Members",
    members: "Members",
    pending: "Pending invites",
    invite: "Invite people",
    search: "Search name or email…",
    member: "Member",
    role: "Role",
    joined: "Joined",
    lastActive: "Last active",
    never: "Never",
    you: "You",
    owner: "Owner",
    table: "Workspace members",
    empty: "No members yet",
    emptyHint: "Invite the first person to get started.",
    roleFor: (name: string) => `Role of ${name}`,
    // blocked reasons
    blockLastOwner: "A workspace needs an owner. Transfer ownership first.",
    blockOwnerOnly: "Only an owner can change another owner.",
    blockNotGrantable: "You cannot change this role.",
    blockSelf: "Use Leave workspace to remove yourself.",
    // actions
    transfer: "Transfer ownership…",
    remove: "Remove from workspace…",
    resend: "Resend",
    revoke: "Revoke",
    // pending
    invitedBy: (name: string) => `Invited by ${name}`,
    sent: "Sent",
    expiresIn: "Expires",
    expired: "Expired",
    noInvites: "No pending invites",
    noInvitesHint: "People you invite show up here until they accept.",
    inviteList: "Pending invites",
    // dialogs
    inviteTitle: "Invite people",
    inviteBody: "They get an email with a link to join. Invites expire after a while.",
    emails: "Email addresses",
    emailsHint: "Press Enter or comma after each address.",
    emailsPlaceholder: "name@example.com",
    emailsRequired: "Add at least one email address.",
    emailInvalid: (v: string) => `${v} is not a valid email address.`,
    emailDuplicate: (v: string) => `${v} is already added.`,
    roleField: "Role",
    send: "Send invites",
    cancel: "Cancel",
    removeTitle: (name: string) => `Remove ${name}?`,
    removeBody: "They lose access to this workspace at once. Their work stays here.",
    removeConfirm: "Remove member",
    transferTitle: (name: string) => `Make ${name} the owner?`,
    transferBody: "They become the owner and you lose owner rights. Only they can give ownership back.",
    transferConfirm: "Transfer ownership",
    leave: "Leave workspace",
    leaveTitle: "Leave this workspace?",
    leaveBody: "You lose access until someone invites you again.",
    leaveBlocked: "You are the only owner. Transfer ownership to another member before you leave.",
    leaveConfirm: "Leave workspace",
    leaveHint: "You can rejoin only if someone invites you again.",
    // outcomes
    invitedOk: (n: string) => (n === "1" ? "1 invite sent." : `${n} invites sent.`),
    roleOk: (name: string) => `Role updated for ${name}.`,
    removedOk: (name: string) => `${name} was removed.`,
    resentOk: (email: string) => `Invite sent again to ${email}.`,
    revokedOk: (email: string) => `Invite to ${email} was revoked.`,
    transferredOk: (name: string) => `${name} is now the owner.`,
    failed: "That did not work. Try again.",
    dismiss: "Dismiss",
  },
  ar: {
    title: "الأعضاء",
    members: "الأعضاء",
    pending: "الدعوات المعلّقة",
    invite: "دعوة أشخاص",
    search: "ابحث بالاسم أو البريد…",
    member: "العضو",
    role: "الدور",
    joined: "تاريخ الانضمام",
    lastActive: "آخر نشاط",
    never: "أبدًا",
    you: "أنت",
    owner: "المالك",
    table: "أعضاء مساحة العمل",
    empty: "لا يوجد أعضاء بعد",
    emptyHint: "ادعُ أول شخص للبدء.",
    roleFor: (name: string) => `دور ${name}`,
    blockLastOwner: "تحتاج مساحة العمل إلى مالك. انقل الملكية أولًا.",
    blockOwnerOnly: "المالك وحده يستطيع تغيير مالك آخر.",
    blockNotGrantable: "لا يمكنك تغيير هذا الدور.",
    blockSelf: "استخدم «مغادرة مساحة العمل» لإزالة نفسك.",
    transfer: "نقل الملكية…",
    remove: "إزالة من مساحة العمل…",
    resend: "إعادة الإرسال",
    revoke: "إلغاء الدعوة",
    invitedBy: (name: string) => `دعاه ${name}`,
    sent: "أُرسلت",
    expiresIn: "تنتهي",
    expired: "منتهية",
    noInvites: "لا توجد دعوات معلّقة",
    noInvitesHint: "يظهر من تدعوهم هنا إلى أن يقبلوا.",
    inviteList: "الدعوات المعلّقة",
    inviteTitle: "دعوة أشخاص",
    inviteBody: "يصلهم بريد برابط للانضمام. تنتهي الدعوات بعد فترة.",
    emails: "عناوين البريد",
    emailsHint: "اضغط Enter أو الفاصلة بعد كل عنوان.",
    emailsPlaceholder: "name@example.com",
    emailsRequired: "أضف عنوان بريد واحدًا على الأقل.",
    emailInvalid: (v: string) => `${v} ليس بريدًا إلكترونيًا صالحًا.`,
    emailDuplicate: (v: string) => `${v} مضاف بالفعل.`,
    roleField: "الدور",
    send: "إرسال الدعوات",
    cancel: "إلغاء",
    removeTitle: (name: string) => `إزالة ${name}؟`,
    removeBody: "يفقد وصوله إلى مساحة العمل فورًا. يبقى عمله هنا.",
    removeConfirm: "إزالة العضو",
    transferTitle: (name: string) => `جعل ${name} المالك؟`,
    transferBody: "يصبح هو المالك وتفقد أنت صلاحيات المالك. هو وحده يستطيع إعادة الملكية إليك.",
    transferConfirm: "نقل الملكية",
    leave: "مغادرة مساحة العمل",
    leaveTitle: "مغادرة مساحة العمل هذه؟",
    leaveBody: "تفقد الوصول إلى أن يدعوك أحد مرة أخرى.",
    leaveBlocked: "أنت المالك الوحيد. انقل الملكية إلى عضو آخر قبل أن تغادر.",
    leaveConfirm: "مغادرة مساحة العمل",
    leaveHint: "لا تستطيع العودة إلا إذا دعاك أحد مرة أخرى.",
    invitedOk: (n: string) => (n === "1" ? "أُرسلت دعوة واحدة." : `أُرسلت ${n} دعوات.`),
    roleOk: (name: string) => `تم تحديث دور ${name}.`,
    removedOk: (name: string) => `تمت إزالة ${name}.`,
    resentOk: (email: string) => `أُعيد إرسال الدعوة إلى ${email}.`,
    revokedOk: (email: string) => `أُلغيت الدعوة إلى ${email}.`,
    transferredOk: (name: string) => `أصبح ${name} المالك.`,
    failed: "لم تنجح العملية. حاول مرة أخرى.",
    dismiss: "تجاهل",
  },
};
const strings = (locale: string) => STRINGS[locale.startsWith("ar") ? "ar" : "en"];

export type MembersManagerLabels = Partial<typeof STRINGS.en>;

/* ------------------------------------------------------------------ types */

export interface MemberRoleOption {
  id: string;
  label: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  /** A role id. */
  role: string;
  joinedAt: string | number | Date;
  lastActive?: string | number | Date | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  invitedBy?: string;
  sentAt: string | number | Date;
  expiresAt?: string | number | Date | null;
}

export interface InviteValues {
  emails: string[];
  role: string;
}

/** What an async action returns: nothing on success, or an error to show. */
export type MemberActionResult = void | { error?: string };
export type InviteResult = void | { error?: string; emailsError?: string };

async function attempt(fn: () => Promise<MemberActionResult> | MemberActionResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ InviteMembersDialog */

export interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Roles the signed-in person may give. */
  roles: readonly MemberRoleOption[];
  /** Role ticked at first. Default: the last role in the list that is not the owner role, else the first. */
  defaultRole?: string;
  onSubmit: (values: InviteValues) => Promise<InviteResult> | InviteResult;
  labels?: MembersManagerLabels;
}

/** Invite by email: several addresses as chips and one role for all of them. */
export function InviteMembersDialog({ open, onOpenChange, roles, defaultRole, onSubmit, labels }: InviteMembersDialogProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [emails, setEmails] = useState<string[]>([]);
  const [role, setRole] = useState(defaultRole ?? roles[roles.length - 1]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmails([]);
    setRole(defaultRole ?? roles[roles.length - 1]?.id ?? "");
    setError(null);
    setFormError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!emails.length) {
      setError(t.emailsRequired);
      return;
    }
    setError(null);
    setFormError(null);
    setBusy(true);
    try {
      const result = await onSubmit({ emails, role });
      if (result && typeof result === "object" && (result.error || result.emailsError)) {
        setError(result.emailsError ?? null);
        setFormError(result.error ?? null);
      } else onOpenChange(false);
    } catch {
      setFormError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (busy ? null : onOpenChange(next))}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{t.inviteTitle}</DialogTitle>
            <DialogDescription>{t.inviteBody}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field invalid={!!error}>
              <FieldLabel>{t.emails}</FieldLabel>
              <TagInput
                value={emails}
                onValueChange={(next) => {
                  setEmails(next);
                  setError(null);
                }}
                placeholder={t.emailsPlaceholder}
                invalid={!!error}
                validate={(tag, tags) => (!isEmailAddress(tag) ? t.emailInvalid(tag) : tags.some((x) => x.toLowerCase() === tag.toLowerCase()) ? t.emailDuplicate(tag) : true)}
                inputProps={{ dir: "ltr", type: "email", inputMode: "email", "aria-label": t.emails }}
              />
              {error ? <FieldError match>{error}</FieldError> : <FieldDescription>{t.emailsHint}</FieldDescription>}
            </Field>
            <Field>
              <FieldLabel>{t.roleField}</FieldLabel>
              <Select items={roles.map((r) => ({ value: r.id, label: r.label }))} value={role} onValueChange={(v) => v && setRole(String(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roles.find((r) => r.id === role)?.description ? <FieldDescription>{roles.find((r) => r.id === role)?.description}</FieldDescription> : null}
            </Field>
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
            <Button type="submit" variant="primary" loading={busy} disabled={!roles.length}>
              {t.send}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ MembersManager */

type Confirm = { kind: "remove" | "transfer"; member: TeamMember } | { kind: "leave" };

export interface MembersManagerProps {
  members: readonly TeamMember[];
  /** Pending invitations. The "Pending invites" tab shows when this prop is passed. */
  invites?: readonly PendingInvite[];
  /** Every role that exists, in display order. */
  roles: readonly MemberRoleOption[];
  /** The signed-in member's id. Their row is marked and cannot be removed here. */
  currentUserId?: string;
  /** Role ids the signed-in person may assign. Default every role except the owner role. */
  grantableRoles?: readonly string[];
  /** The role id that means owner. Default `owner`. */
  ownerRole?: string;
  /** False for members without the right to manage: hides invite and locks every control. Default true. */
  canManage?: boolean;
  loading?: boolean;
  pageSize?: number;
  onInvite?: (values: InviteValues) => Promise<InviteResult> | InviteResult;
  onChangeRole?: (member: TeamMember, role: string) => Promise<MemberActionResult> | MemberActionResult;
  onRemove?: (member: TeamMember) => Promise<MemberActionResult> | MemberActionResult;
  onResendInvite?: (invite: PendingInvite) => Promise<MemberActionResult> | MemberActionResult;
  onRevokeInvite?: (invite: PendingInvite) => Promise<MemberActionResult> | MemberActionResult;
  /** Make another member the owner. Only shown to owners. */
  onTransferOwnership?: (member: TeamMember) => Promise<MemberActionResult> | MemberActionResult;
  /** The signed-in member leaves. The last owner cannot: the button explains why. */
  onLeave?: () => Promise<MemberActionResult> | MemberActionResult;
  /** Turns a member into the person a profile card shows. With it, the name and avatar of each row open a hover/focus/tap profile card (presence, role, local time, teams). Return null to skip a row. */
  profile?: (member: TeamMember) => PersonProfile | null | undefined;
  /** Quick actions on those cards. Each one adds its button. */
  profileActions?: Pick<ProfileCardProps, "onMessage" | "onMention" | "onViewProfile" | "viewerTimeZone">;
  labels?: MembersManagerLabels;
  className?: string;
}

/**
 * Members and roles of a workspace: a searchable table with an inline role select limited to the roles you
 * can grant, an invite-by-email dialog, pending invites with resend and revoke, transfer of ownership, and
 * leave. The last owner is protected everywhere: they cannot be demoted, removed or leave. Every action is
 * an async callback and you send back the new `members` and `invites`.
 */
export function MembersManager({
  members,
  invites,
  roles,
  currentUserId,
  grantableRoles,
  ownerRole = "owner",
  canManage = true,
  loading,
  pageSize = 8,
  onInvite,
  onChangeRole,
  onRemove,
  onResendInvite,
  onRevokeInvite,
  onTransferOwnership,
  onLeave,
  profile,
  profileActions,
  labels,
  className,
}: MembersManagerProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const t = { ...strings(locale), ...labels };
  const [tab, setTab] = useState("members");
  const [inviting, setInviting] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const roleLabel = useMemo(() => new Map(roles.map((r) => [r.id, r.label])), [roles]);
  const me = members.find((m) => m.id === currentUserId);
  const iAmOwner = me?.role === ownerRole;
  const grantable = useMemo(() => grantableRoles ?? roles.filter((r) => r.id !== ownerRole).map((r) => r.id), [grantableRoles, roles, ownerRole]);
  const inviteRoles = roles.filter((r) => grantable.includes(r.id) && r.id !== ownerRole);
  const reasonText = {
    "self-last-owner": t.blockLastOwner,
    "owner-only": t.blockOwnerOnly,
    "not-grantable": t.blockNotGrantable,
    self: t.blockSelf,
  } as const;

  const report = (failure: string | null, ok: string) => {
    setNotice(failure === null ? { tone: "success", text: ok } : { tone: "danger", text: failure || t.failed });
    return failure === null;
  };
  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyIds((cur) => new Set(cur).add(id));
    try {
      await fn();
    } finally {
      setBusyIds((cur) => {
        const next = new Set(cur);
        next.delete(id);
        return next;
      });
    }
  };

  const columns = useMemo<DataTableColumn<TeamMember>[]>(
    () => [
      {
        id: "member",
        header: t.member,
        label: t.member,
        hideable: false,
        sortValue: (m) => m.name,
        searchValue: (m) => `${m.name} ${m.email}`,
        cell: (m) => {
          const identity = (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={m.name} src={m.avatar} size="sm" />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 truncate text-label text-foreground">
                  {m.name}
                  {m.id === currentUserId ? <Badge variant="outline">{t.you}</Badge> : null}
                </span>
                <bdi dir="ltr" className="truncate text-caption text-muted-foreground">
                  {m.email}
                </bdi>
              </div>
            </div>
          );
          const person = profile?.(m);
          if (!person) return identity;
          return (
            <ProfileHoverCard person={person} {...profileActions}>
              <button type="button" data-slot="member-profile-trigger" className="min-w-0 max-w-full rounded-control text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                {identity}
              </button>
            </ProfileHoverCard>
          );
        },
      },
      {
        id: "role",
        header: t.role,
        label: t.role,
        sortValue: (m) => roles.findIndex((r) => r.id === m.role),
        filterValue: (m) => m.role,
        cell: (m) => {
          const block = !canManage || !onChangeRole ? "not-grantable" : roleChangeBlock(m, members, grantable, ownerRole);
          const choices = roleChoices(m, roles, grantable, ownerRole);
          if (block) {
            const badge = (
              <Badge variant={m.role === ownerRole ? "accent" : "neutral"} tabIndex={0} aria-label={`${t.roleFor(m.name)}: ${roleLabel.get(m.role) ?? m.role}`}>
                {m.role === ownerRole ? <Crown aria-hidden /> : null}
                {roleLabel.get(m.role) ?? m.role}
              </Badge>
            );
            return canManage && onChangeRole && block !== "not-grantable" ? <Tooltip content={reasonText[block]}>{badge}</Tooltip> : badge;
          }
          return (
            <Select
              items={choices.map((r) => ({ value: r.id, label: r.label }))}
              value={m.role}
              disabled={busyIds.has(m.id)}
              onValueChange={(next) => {
                if (!next || next === m.role) return;
                void withBusy(m.id, async () => {
                  report(await attempt(() => onChangeRole?.(m, String(next))), t.roleOk(m.name));
                });
              }}
            >
              <SelectTrigger aria-label={t.roleFor(m.name)} className="h-control-sm w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {choices.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: "lastActive",
        header: t.lastActive,
        label: t.lastActive,
        sortValue: (m) => (m.lastActive ? new Date(m.lastActive) : null),
        cell: (m) => (m.lastActive ? <DateTime value={m.lastActive} relative className="text-body-sm text-muted-foreground" /> : <span className="text-body-sm text-muted-foreground">{t.never}</span>),
      },
      {
        id: "joined",
        header: t.joined,
        label: t.joined,
        align: "end",
        sortValue: (m) => new Date(m.joinedAt),
        cell: (m) => <DateTime value={m.joinedAt} format={{ dateStyle: "medium" }} className="text-body-sm text-muted-foreground" />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, roles, members, grantable, ownerRole, canManage, currentUserId, busyIds, onChangeRole, locale, profile, profileActions],
  );

  const table = useDataTable({ data: members as TeamMember[], columns, getRowId: (m) => m.id, pageSize, defaultSort: { id: "joined", direction: "asc" } });

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError(null);
    const failure = await attempt(() => (confirm.kind === "remove" ? onRemove?.(confirm.member) : confirm.kind === "transfer" ? onTransferOwnership?.(confirm.member) : onLeave?.()));
    setConfirmBusy(false);
    if (failure === null) {
      if (confirm.kind === "remove") setNotice({ tone: "success", text: t.removedOk(confirm.member.name) });
      else if (confirm.kind === "transfer") setNotice({ tone: "success", text: t.transferredOk(confirm.member.name) });
      setConfirm(null);
    } else setConfirmError(failure || t.failed);
  };

  const confirmCopy =
    confirm?.kind === "remove"
      ? { title: t.removeTitle(confirm.member.name), body: t.removeBody, action: t.removeConfirm, danger: true }
      : confirm?.kind === "transfer"
        ? { title: t.transferTitle(confirm.member.name), body: t.transferBody, action: t.transferConfirm, danger: false }
        : { title: t.leaveTitle, body: t.leaveBody, action: t.leaveConfirm, danger: true };

  const showInvites = invites !== undefined;
  const pendingCount = invites?.length ?? 0;
  const now = Date.now();

  const membersPanel = (
    <div className="flex flex-col gap-4">
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="role" title={t.role} options={roles.map((r) => ({ value: r.id, label: r.label }))} />
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.table}
        rowLabel={(m) => m.name}
        loading={loading}
        empty={<EmptyState title={t.empty} description={t.emptyHint} />}
        rowActions={(m) => {
          if (!canManage) return [];
          const removeReason = removeBlock(m, members, currentUserId, ownerRole);
          return [
            ...(onTransferOwnership && iAmOwner && m.role !== ownerRole ? [{ id: "transfer", label: t.transfer, icon: Crown, onSelect: () => setConfirm({ kind: "transfer", member: m }), group: "ownership" }] : []),
            ...(onRemove ? [{ id: "remove", label: removeReason && removeReason !== "self" ? `${t.remove.replace("…", "")} — ${reasonText[removeReason]}` : t.remove, icon: UserMinus, danger: true, disabled: !!removeReason, onSelect: () => setConfirm({ kind: "remove", member: m }), group: "danger" }] : []),
          ];
        }}
      />
      <DataTablePagination table={table} />
    </div>
  );

  const invitesPanel = pendingCount ? (
    <ul aria-label={t.inviteList} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
      {invites?.map((invite) => {
        const expired = invite.expiresAt ? new Date(invite.expiresAt).getTime() < now : false;
        return (
          <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <Mail className="size-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <bdi dir="ltr" className="truncate text-label text-foreground">
                {invite.email}
              </bdi>
              <span className="text-caption text-muted-foreground">
                {invite.invitedBy ? `${t.invitedBy(invite.invitedBy)} · ` : ""}
                {t.sent} <DateTime value={invite.sentAt} relative />
              </span>
            </div>
            <Badge variant="neutral">{roleLabel.get(invite.role) ?? invite.role}</Badge>
            {invite.expiresAt ? (
              <Status tone={expired ? "danger" : "info"} className="text-caption">
                {expired ? t.expired : <>{t.expiresIn} <DateTime value={invite.expiresAt} relative /></>}
              </Status>
            ) : null}
            {canManage ? (
              <div className="flex items-center gap-1">
                {onResendInvite ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyIds.has(invite.id)}
                    onClick={() => void withBusy(invite.id, async () => void report(await attempt(() => onResendInvite(invite)), t.resentOk(invite.email)))}
                  >
                    <RotateCw />
                    {t.resend}
                  </Button>
                ) : null}
                {onRevokeInvite ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyIds.has(invite.id)}
                    onClick={() => void withBusy(invite.id, async () => void report(await attempt(() => onRevokeInvite(invite)), t.revokedOk(invite.email)))}
                  >
                    <X />
                    {t.revoke}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  ) : (
    <EmptyState icon={Mail} title={t.noInvites} description={t.noInvitesHint} />
  );

  return (
    <div data-slot="members-manager" className={cn("flex flex-col gap-5", className)}>
      {notice ? (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)} dismissLabel={t.dismiss}>
          {notice.text}
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showInvites ? (
            <TabsList aria-label={t.title}>
              <TabsTab value="members">
                {t.members} <span className="text-muted-foreground">{formatNumber(members.length, locale)}</span>
              </TabsTab>
              <TabsTab value="pending">
                {t.pending} <span className="text-muted-foreground">{formatNumber(pendingCount, locale)}</span>
              </TabsTab>
              <TabsIndicator />
            </TabsList>
          ) : (
            <h2 className="text-h3 text-foreground">
              {t.members} <span className="text-muted-foreground">{formatNumber(members.length, locale)}</span>
            </h2>
          )}
          {canManage && onInvite ? (
            <Button variant="primary" onClick={() => setInviting(true)} disabled={!inviteRoles.length}>
              <UserPlus />
              {t.invite}
            </Button>
          ) : null}
        </div>
        <TabsPanel value="members" className="mt-4">
          {membersPanel}
        </TabsPanel>
        {showInvites ? (
          <TabsPanel value="pending" className="mt-4">
            {invitesPanel}
          </TabsPanel>
        ) : null}
      </Tabs>

      {onLeave && me ? (
        <div data-slot="members-leave" className="flex flex-col gap-3 rounded-card border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label text-foreground">{t.leave}</span>
            <span className="text-body-sm text-muted-foreground">{canLeave(me, members, ownerRole) ? t.leaveHint : t.leaveBlocked}</span>
          </div>
          <Button variant="danger" className="shrink-0" disabled={!canLeave(me, members, ownerRole)} onClick={() => setConfirm({ kind: "leave" })}>
            <LogOut className="rtl:-scale-x-100" />
            {t.leave}
          </Button>
        </div>
      ) : null}

      {onInvite ? (
        <InviteMembersDialog
          open={inviting}
          onOpenChange={setInviting}
          roles={inviteRoles}
          labels={labels}
          onSubmit={async (values) => {
            const result = await onInvite(values);
            if (!(result && typeof result === "object" && (result.error || result.emailsError))) setNotice({ tone: "success", text: t.invitedOk(formatNumber(values.emails.length, locale)) });
            return result;
          }}
        />
      ) : null}

      <AlertDialog open={!!confirm} onOpenChange={(open) => (!open && !confirmBusy ? (setConfirm(null), setConfirmError(null)) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmError ? (
            <Alert tone="danger" role="alert">
              {confirmError}
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => (setConfirm(null), setConfirmError(null))} disabled={confirmBusy}>
              {t.cancel}
            </Button>
            <Button variant={confirmCopy.danger ? "danger" : "primary"} loading={confirmBusy} onClick={() => void runConfirm()}>
              {confirmCopy.action}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
