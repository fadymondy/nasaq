export interface DnsRecord {
  id: string;
  /** `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SRV` or `CAA`. */
  type: string;
  /** Relative to the zone (`www`), or `@` for the root. A full name inside the zone is accepted too. */
  name: string;
  content: string;
  /** Seconds, or 1 for Auto. */
  ttl: number;
  /** Only meaningful for A, AAAA and CNAME. */
  proxied?: boolean;
  /** MX and SRV. */
  priority?: number;
  comment?: string;
}

/** What the form hands to `onSave`. `id` is set when editing. */
export interface DnsRecordInput {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string;
}

export type DnsResult = void | { error?: string };
