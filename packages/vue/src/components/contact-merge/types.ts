import type { ContactChannel, ContactConsentStatus, ContactIdentity } from "../contact-identities";
import type { ContactMergeValue } from "./contact-merge-logic";

/** One of the duplicate records. `values` is keyed by field id. */
export interface ContactMergeRecord {
  id: string;
  name: string;
  avatar?: string;
  values: Record<string, ContactMergeValue>;
  createdAt?: Date | string | number;
  /** Counts that move to the survivor: deals, notes, conversations. */
  stats?: { label: string; value: number }[];
  identities?: ContactIdentity[];
  /** Consent per channel. The merged contact keeps the safest answer. */
  consent?: Partial<Record<ContactChannel, ContactConsentStatus>>;
}

export type ContactMergeResult = void | { error?: string };
