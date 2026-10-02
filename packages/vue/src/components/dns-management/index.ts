export { default as NqDnsManagement } from "./NqDnsManagement.vue";
// Helpers are exported under dns-prefixed names so the all-components index cannot clash with other components.
export {
  DEFAULT_TTLS,
  DNS_TYPES,
  fqdn as dnsFqdn,
  formatTtl as formatDnsTtl,
  isHostname as isDnsHostname,
  isIPv4 as isDnsIPv4,
  isIPv6 as isDnsIPv6,
  isProxiable as isDnsProxiable,
  needsPriority as dnsNeedsPriority,
  relativeName as dnsRelativeName,
  TTL_AUTO as DNS_TTL_AUTO,
  validateRecord as validateDnsRecord,
  type DnsDraft,
  type DnsErrorCode,
  type DnsErrors,
  type DnsType,
  type TtlUnits as DnsTtlUnits,
} from "./format";
export type { DnsRecord, DnsRecordInput } from "./types";
export type { DnsManagementLabels } from "./strings";
