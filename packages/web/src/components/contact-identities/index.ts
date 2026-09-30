export * from "./contact-identities";
export {
  CONTACT_CHANNELS,
  CONTACT_CONSENT_CHANNELS,
  contactIdentityKey,
  mergeContactConsent,
  normalizeContactIdentity,
  sortContactIdentities,
  validateContactIdentity,
} from "./contact-identities-logic";
export type { ContactChannel, ContactConsentStatus, ContactIdentityIssue } from "./contact-identities-logic";
