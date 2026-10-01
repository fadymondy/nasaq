import type { ContactChannel, ContactConsentStatus } from "./contact-identities-logic";

export interface ContactIdentity {
  id: string;
  channel: ContactChannel;
  /** The address, number or handle. Shown left to right. */
  value: string;
  label?: string;
  /** The account used first on its channel. */
  primary?: boolean;
  verified?: boolean;
}

export interface ContactConsent {
  status: ContactConsentStatus;
  at?: Date | string | number;
  /** Where it was given: "Signup form", "WhatsApp opt-in". */
  source?: string;
}

export type ContactIdentityResult = void | { error?: string };
