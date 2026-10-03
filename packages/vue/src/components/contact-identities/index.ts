export { default as NqContactIdentities } from "./NqContactIdentities.vue";
export { default as NqContactConsentStatusText } from "./NqContactConsentStatusText.vue";
export {
  CONTACT_CHANNELS,
  CONTACT_CONSENT_CHANNELS,
  contactIdentityKey,
  mergeContactConsent,
  normalizeContactIdentity,
  sortContactIdentities,
  validateContactIdentity,
  type ContactChannel,
  type ContactConsentStatus,
  type ContactIdentityIssue,
} from "./contact-identities-logic";
export { useContactIdentitiesLabels, type ContactIdentitiesLabelOverrides, type ContactIdentitiesLabels } from "./strings";
export type { ContactConsent, ContactIdentity, ContactIdentityResult } from "./types";
