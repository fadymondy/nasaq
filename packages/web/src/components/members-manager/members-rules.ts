/** Pure rules for a team's members and roles. No React, so they can be tested and reused on a server. */

export interface RuleMember {
  id: string;
  role: string;
}

export interface RuleRole {
  id: string;
}

export type BlockReason = "self-last-owner" | "not-grantable" | "owner-only" | "self";

/** How many members hold the owner role. */
export const ownerCount = (members: readonly RuleMember[], ownerRole = "owner") => members.filter((m) => m.role === ownerRole).length;

/** The last owner cannot be demoted, removed or leave: hand over ownership first. */
export function isLastOwner(member: RuleMember, members: readonly RuleMember[], ownerRole = "owner") {
  return member.role === ownerRole && ownerCount(members, ownerRole) <= 1;
}

/**
 * The roles you may pick for a member: the roles you can grant, plus the member's current role (so the
 * select can show it). `grantable` undefined means every role. The owner role is only grantable through
 * ownership transfer, so it is left out unless it is the current role.
 */
export function roleChoices<R extends RuleRole>(member: RuleMember, roles: readonly R[], grantable: readonly string[] | undefined, ownerRole = "owner"): R[] {
  return roles.filter((r) => r.id === member.role || (r.id !== ownerRole && (!grantable || grantable.includes(r.id))));
}

/** Why the role of this member cannot be changed by the signed-in person, or null when it can. */
export function roleChangeBlock(member: RuleMember, members: readonly RuleMember[], grantable: readonly string[] | undefined, ownerRole = "owner"): BlockReason | null {
  if (isLastOwner(member, members, ownerRole)) return "self-last-owner";
  if (member.role === ownerRole) return "owner-only";
  if (grantable && !grantable.includes(member.role)) return "not-grantable";
  return null;
}

/** Why this member cannot be removed, or null. Nobody removes the last owner; you cannot remove yourself here (use leave). */
export function removeBlock(member: RuleMember, members: readonly RuleMember[], currentUserId: string | undefined, ownerRole = "owner"): BlockReason | null {
  if (member.id === currentUserId) return "self";
  if (isLastOwner(member, members, ownerRole)) return "self-last-owner";
  return null;
}

/** Whether the signed-in member may leave. The last owner must transfer ownership first. */
export const canLeave = (me: RuleMember | undefined, members: readonly RuleMember[], ownerRole = "owner") => !!me && !isLastOwner(me, members, ownerRole);

/** Split typed text into email addresses (comma, semicolon, space, newline or the Arabic comma), keeping order and dropping repeats. */
export function parseEmails(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of text.split(/[\s,;،]+/)) {
    const email = part.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push(email);
  }
  return out;
}

export const isEmailAddress = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
