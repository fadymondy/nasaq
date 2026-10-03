export { default as NqMailDomains } from "./NqMailDomains.vue";
export { default as NqSmtpSettings } from "./NqSmtpSettings.vue";
export { analyzeDmarc, analyzeSpf, defaultSmtpPort, domainHealth, firstFailure, formatMegabytes, isLocalPart, quotaFraction, stepStates, validateAlias, validateMailbox, validateSmtp } from "./mail-format";
export type { DmarcAnalysis, DnsKind, DnsStatus, DomainHealth, SmtpEncryption, SmtpField, SpfAnalysis, StepState, TestOutcome, TestStep, TestStepId } from "./mail-format";
export type { MailSettingsLabels } from "./strings";
export type { AliasInput, DnsCheck, MailAlias, MailboxInput, MailDomain, Mailbox, MailResult, SmtpConfig, SmtpSaveInput, SmtpTestInput } from "./types";
