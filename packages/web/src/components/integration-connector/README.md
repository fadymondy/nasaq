---
name: integration-connector
title: IntegrationConnector
category: account
status: beta
summary: Connections page for OAuth services such as Google Analytics, Search Console, YouTube, GitHub and Slack, with cards, a scope consent dialog, account or property picker, status, reconnect and confirmed disconnect.
exports: [IntegrationConnector, IntegrationConnectorProps, IntegrationConnectorLabels, IntegrationService, IntegrationScope, IntegrationAccount, IntegrationStatus]
related: [connected-accounts, oauth-buttons, status, alert-dialog, select]
story: components-account-integration-connector
base-ui: [alert-dialog, checkbox, dialog, select]
keywords: [integration, oauth, connect, scopes, google analytics, search console, youtube, github, slack, connections]
---

# IntegrationConnector

Cards for the services an account can connect: what each one gives access to, who authorised it, which
property or channel it uses, and its health. Connecting first shows the scopes to consent to; disconnecting
asks to confirm. It has no backend: your callbacks start the OAuth flow.

## When to use

- A Connections or Integrations page for data and tool services.

## When not to use

- Sign-in providers (Google, GitHub as a way to log in): use [`ConnectedAccounts`](../connected-accounts/README.md).
- A single "Continue with" button: [`OAuthButtons`](../oauth-buttons/README.md).

## Import

```tsx
import { IntegrationConnector } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { IntegrationConnector, type IntegrationService } from "@fadymondy/nasaq/web";

declare const services: IntegrationService[];
declare const api: { connect(id: string, scopes: string[]): Promise<void>; disconnect(id: string): Promise<void> };

export function Connections() {
  return <IntegrationConnector services={services} onConnect={(id, scopes) => api.connect(id, scopes)} onDisconnect={(id) => api.disconnect(id)} />;
}
```

## Anatomy

```
IntegrationConnector            data-slot="integration-connector" (Card, or bare)
├─ group heading                "Google", "Developer tools"
└─ service card                 data-slot="integration-card" (data-status)
   ├─ logo or name, description, Status
   ├─ connected as, last sync, granted scopes
   ├─ account Select            when connected and `accounts` is given
   ├─ message                   for "error" and "needs-reauth"
   └─ Connect / Reconnect / Disconnect (ConfirmButton)
Consent Dialog                  scope checkboxes (required ones locked), Continue
```

## API

**IntegrationConnector**: every `div` prop except `children`, plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `services` | `readonly IntegrationService[]` | required | See below. |
| `onConnect` | `(id, scopeIds) => Promise<void \| { error? }>` | required | Start OAuth for the ticked scopes. |
| `onDisconnect` | `(id) => Promise<void \| { error? }>` | required | Revoke the link. |
| `onSelectAccount` | `(id, accountId) => Promise<void \| { error? }>` | | Shows the picker. |
| `bare` | `boolean` | `false` | Drop the card header when the page has its own. |
| `labels` | `Partial<IntegrationConnectorLabels>` | | Override any string. |

**IntegrationService**: `id`, `name`, `description?`, `icon?`, `group?`, `scopes`, `status`
(`disconnected | connected | needs-reauth | error | pending`), `grantedScopes?`, `connectedAs?`, `accounts?`, `accountId?`,
`lastSyncAt?`, `message?`, `learnMoreHref?`.

## Examples

**A property picker**

```tsx
import { IntegrationConnector } from "@fadymondy/nasaq/web";

export const Picker = () => (
  <IntegrationConnector
    services={[
      {
        id: "ga",
        name: "Google Analytics",
        status: "connected",
        scopes: [{ id: "read", label: "Read reports", required: true }],
        accounts: [{ id: "1", name: "Blog", detail: "GA4 412000111" }],
        accountId: "1",
      },
    ]}
    onConnect={async () => undefined}
    onDisconnect={async () => undefined}
    onSelectAccount={async () => undefined}
  />
);
```

## Accessibility

- Cards are labelled sections; status is text as well as colour. Dialogs trap focus and return it.
- Required scopes are checked and disabled with a visible reason. Errors are `role="alert"`.

## RTL & i18n

- English and Arabic strings follow the Nasaq locale. Emails, usernames and property IDs are `dir="ltr"`.

## Styling & tokens

- Built on `Card`, `Status`, `Dialog`, `AlertDialog`, `Select` and `--nq-*` tokens.
- Target `[data-slot="integration-card"][data-status="needs-reauth"]`.

## Do / Don't

- Do ask only for the scopes you use and explain each in plain words.
- Do show a logo only when it is the brand's official one. Without it the name is shown as text.
- Don't invent or redraw a brand mark.

## Related

- [`ConnectedAccounts`](../connected-accounts/README.md)
- [`OAuthButtons`](../oauth-buttons/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-integration-connector--docs
