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

/** Runs an action: null on success, the error text, or "" when it threw (the caller shows its generic message). */
export async function membersAttempt(fn: () => Promise<MemberActionResult> | MemberActionResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}
