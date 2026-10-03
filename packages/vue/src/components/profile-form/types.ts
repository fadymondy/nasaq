export interface ProfileFormValues {
  name: string;
  username: string;
  email: string;
  /** E.164, for example "+966501234567", or "". */
  phone: string;
  bio: string;
  /** A locale code such as "en" or "ar". */
  locale: string;
  /** An IANA time zone such as "Asia/Riyadh". */
  timezone: string;
  /** Shown on the public profile. Include the key (even as "") to show the field. */
  location?: string;
  /** A full https:// link shown on the public profile. Include the key (even as "") to show the field. */
  website?: string;
}

export type ProfileFormFieldErrors = Partial<Record<keyof ProfileFormValues | "password", string>>;

/** What `onSubmit` and `onChangeEmail` may resolve with to report a failure. Resolve with nothing for success. */
export interface ProfileFormResult {
  error?: string;
  fieldErrors?: ProfileFormFieldErrors;
}

/** `true` when free, or an object to add a message. */
export type ProfileUsernameCheck = boolean | { available: boolean; message?: string };

export interface ProfileFormOption {
  value: string;
  label: string;
}

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";
