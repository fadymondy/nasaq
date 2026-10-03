export { default as NqDomainsManager } from "./NqDomainsManager.vue";
export { default as NqDomainChips } from "./NqDomainChips.vue";
// Helpers are exported under domain-prefixed names so the all-components index cannot clash with other components.
export {
  isValidHostname as isValidDomainHostname,
  normalizeHost as normalizeDomainHost,
  splitOverflow as splitDomainOverflow,
  summarizeDomains,
  type DomainCheck,
  type DomainSummary,
} from "./format";
export type { DomainRecord, DomainsResult } from "./types";
export type { DomainsManagerLabels } from "./strings";
