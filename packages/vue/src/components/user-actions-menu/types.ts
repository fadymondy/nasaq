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
