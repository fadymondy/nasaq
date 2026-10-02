export type CertResult = void | { error?: string };

export interface CertificateRecord {
  id: string;
  host: string;
  issuer?: string;
  validTo?: Date | number | string;
  autoRenew?: boolean;
  /** Set when the last check could not reach or read the certificate. */
  error?: string;
}
