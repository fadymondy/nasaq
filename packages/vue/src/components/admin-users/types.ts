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
  /** Set only when the dialog has `password` on and the admin typed one. */
  password?: string;
}

/** What an async action returns: nothing on success, or an error to show. */
export type AdminActionResult = void | { error?: string };
export type AddUserResult = void | { error?: string; fieldErrors?: Partial<Record<"name" | "email", string>> };

/** Runs an action; returns null on success, the error text ("" for a generic failure) otherwise. */
export async function adminUsersAttempt(fn: () => Promise<AdminActionResult> | AdminActionResult): Promise<string | null> {
  try {
    const result = await fn();
    return result && typeof result === "object" && result.error ? result.error : null;
  } catch {
    return "";
  }
}

/** Is this a plausible email address. */
export const adminUsersEmailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
