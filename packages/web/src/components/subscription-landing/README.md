---
name: subscription-landing
title: SubscriptionLanding
category: crm
status: beta
summary: The three public pages of an email list, subscribe with explicit consent, confirm for double opt-in, and unsubscribe with an optional reason and a way back.
exports: [SubscriptionLandingLabels, SubscriptionLandingMode, SubscriptionResult, SubscriptionLandingProps, SubscriptionLanding]
related: [campaign-composer, contact-identities, auth-card]
story: components-crm-subscription-landing
keywords: [subscribe, unsubscribe, confirm, double opt in, newsletter, landing, consent, gdpr]
---

# SubscriptionLanding

The pages a recipient lands on from a signup form or from an email link. One component, three modes.

## When to use

- The public subscribe, confirm and unsubscribe addresses of a newsletter or broadcast list.

## When not to use

- Account sign in: use an auth card.
- Managing consent inside the app: use [`ContactIdentities`](../contact-identities/README.md).

## Import

```tsx
import { SubscriptionLanding } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<SubscriptionLanding mode="subscribe" brand="Nasaq" onSubscribe={async ({ email }) => subscribe(email)} />
<SubscriptionLanding mode="confirm" email="sara@example.com" onConfirm={confirm} />
<SubscriptionLanding mode="unsubscribe" email="sara@example.com" onUnsubscribe={unsubscribe} onResubscribe={resubscribe} />
```

## Anatomy

- Subscribe: optional name, email, an unticked consent box, then "Check your inbox".
- Confirm: a button (never automatic, so mail scanners do not subscribe anyone), then "You are subscribed".
- Unsubscribe: an optional reason, then "You are unsubscribed" with an undo.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `mode` | `"subscribe"`, `"confirm"` or `"unsubscribe"` | Which page. |
| `brand` | `ReactNode` | The sender's name as text. |
| `email` | `string` | For confirm and unsubscribe. Shown masked. |
| `onSubscribe` | `({ email, name? }) => Promise<...>` | |
| `onConfirm` | `() => Promise<...>` | |
| `onUnsubscribe` | `({ reason?, note? }) => Promise<...>` | |
| `onResubscribe` | `() => Promise<...>` | Shows the undo. |
| `reasons` | `string[]` | Reason keys. |
| `askName` | `boolean` | Adds a name field. |
| `labels` | `Partial<SubscriptionLandingLabels>` | Override any string. |

Pure helpers: `isSubscriberEmail`, `maskSubscriberEmail`, `validateSubscription`.

## Examples

Pass your own `reasons` and matching `labels.reasons` to change the survey.

## Accessibility

Errors are announced. Outcomes are `role="status"`. The consent box has a real label.

## RTL & i18n

English and Arabic ship. The email field is left-to-right.

## Styling & tokens

Semantic tokens only.

## Do / Don't

- Do require an unticked consent box.
- Don't confirm or unsubscribe on page load.

## Related

- [`CampaignComposer`](../campaign-composer/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-subscription-landing--docs
