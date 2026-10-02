// Data shapes of the mail settings, copied from packages/web/src/components/mail-settings/mail-settings.tsx.
import type { DnsKind, DnsStatus, SmtpEncryption } from "./mail-format";

export type MailResult = void | { error?: string };

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  fromName: string;
  fromAddress: string;
  /** Whether a password is already stored. The password itself is never passed to the UI. */
  passwordSet: boolean;
}

/** What Save sends. `password` is set only when the user typed one. */
export interface SmtpSaveInput {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password?: string;
  fromName: string;
  fromAddress: string;
}

export interface SmtpTestInput extends SmtpSaveInput {
  to: string;
}

export interface DnsCheck {
  kind: DnsKind;
  status: DnsStatus;
  /** Record name, for example `example.com` or `mail._domainkey.example.com`. */
  name: string;
  /** The DNS record type: TXT for all three usually. */
  type?: string;
  /** The value the host should publish. */
  expected: string;
  /** What DNS returned now, if anything. */
  found?: string;
}

export interface Mailbox {
  id: string;
  /** The part before the `@`. */
  local: string;
  quotaMb: number;
  usedMb: number;
}

export interface MailAlias {
  id: string;
  /** The part before the `@`, or `*` for a catch-all. */
  source: string;
  /** A full address. */
  destination: string;
}

export interface MailDomain {
  id: string;
  name: string;
  checks: readonly DnsCheck[];
  mailboxes: readonly Mailbox[];
  aliases: readonly MailAlias[];
  checkedAt?: Date | number | string;
}

export interface MailboxInput {
  local: string;
  quotaMb: number;
  password: string;
}

export interface AliasInput {
  source: string;
  destination: string;
}
