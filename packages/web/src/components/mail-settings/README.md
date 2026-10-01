---
name: mail-settings
title: Mail Settings
category: server-tools
status: beta
summary: SMTP settings with a write-only password and a test send that reports each step, plus mail domains with an SPF, DKIM and DMARC checklist, mailboxes with quota and aliases.
exports: [analyzeDmarc, analyzeSpf, defaultSmtpPort, domainHealth, firstFailure, formatMegabytes, isLocalPart, quotaFraction, stepStates, validateAlias, validateMailbox, validateSmtp, MailSettingsLabels, MailResult, SmtpConfig, SmtpSaveInput, SmtpTestInput, SmtpSettingsProps, SmtpSettings, DnsCheck, Mailbox, MailAlias, MailDomain, MailboxInput, AliasInput, MailDomainsProps, MailDomains]
related: [settings-sections, copy-button, data-table, dns-management, alerts, vault]
story: components-server-tools-mail-settings
base-ui: [alert-dialog, dialog, field, meter, select]
keywords: [smtp, mail, email, spf, dkim, dmarc, mailbox, alias, dns, deliverability]
---

# Mail Settings

Two panels for outgoing and hosted mail. There is no backend: the host sends, checks DNS and stores data.

- `SmtpSettings`: host, port, encryption, username, password, From name and address. The password is write-only: pass `passwordSet`, and leave the field empty to keep it. Changing the encryption moves the port to the usual one unless you typed a custom port. The test card sends with the current form values and shows four steps (connect, secure, sign in, send) as passed, failed or skipped, with the server reply for a failure.
- `MailDomains`: pick a domain, then read its SPF, DKIM and DMARC checklist with the expected record in a copy field and what DNS returned. Warnings appear for an open SPF (`+all`), more than 10 lookups and a DMARC policy of `none`. Below that are mailboxes with quota meters and aliases; removals ask first.

## When to use

- The mail section of an admin or hosting console.

## When not to use

- Composing or reading mail, or campaign sending.

## Import

```tsx
import { SmtpSettings, MailDomains } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { SmtpSettings } from "@fadymondy/nasaq/web";

declare const api: { save(input: unknown): Promise<void>; test(input: unknown): Promise<{ ok: boolean; steps: { id: "connect" | "tls" | "auth" | "send"; ok: boolean; message?: string }[] }> };

export function Smtp() {
  return (
    <SmtpSettings
      value={{ host: "smtp.example.com", port: 587, encryption: "starttls", username: "mailer", fromName: "Nasaq", fromAddress: "no-reply@example.com", passwordSet: true }}
      onSave={(input) => api.save(input)}
      onTest={(input) => api.test(input)}
    />
  );
}
```

## API

**SmtpSettings**: `div` props plus `value: SmtpConfig`, `onSave(input)`, `onTest(input)` returning `{ ok, steps: [{ id, ok, message? }] }`, `defaultTestTo?`, `loading?`, `labels?`. Steps after the first failing one show as skipped.

**MailDomains**: `div` props plus:

| Prop | Type | Description |
| --- | --- | --- |
| `domains` | `MailDomain[]` | `{ id, name, checks, mailboxes, aliases, checkedAt? }`. A check is `{ kind: "spf" \| "dkim" \| "dmarc", status: "pass" \| "fail" \| "missing" \| "pending", name, type?, expected, found? }`. |
| `defaultDomainId` | `string` | Domain shown first. |
| `onRecheck(domainId)` | callback | Runs the DNS check again. |
| `onAddMailbox(domainId, { local, quotaMb, password })`, `onRemoveMailbox(domainId, id)` | callbacks | Mailboxes. |
| `onAddAlias(domainId, { source, destination })`, `onRemoveAlias(domainId, id)` | callbacks | Aliases. Source `*` is a catch-all. |

Callbacks return `Promise<void | { error?: string }>`.

## Accessibility

Each DNS row is a labelled section with a text status. Meters are named per mailbox. Removals use an alert dialog.

## RTL and languages

English and Arabic, overridable with `labels`. Hosts, addresses, ports and DNS records stay left to right.
