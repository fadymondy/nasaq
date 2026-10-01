---
name: campaign-composer
title: CampaignComposer
category: marketing
status: beta
summary: Compose an email or WhatsApp broadcast with a live audience count, a rich or plain editor, a preview, a test send, pre-send checks, a confirmation and a send progress bar.
exports: [CampaignComposerLabels, CampaignAudience, CampaignDraft, CampaignResult, CampaignSendProgress, CampaignComposerProps, CampaignComposer]
related: [email-templates, rich-text-editor, subscription-landing, contact-list]
story: components-marketing-campaign-composer
keywords: [campaign, broadcast, newsletter, email, whatsapp, audience, composer, send, preview, test send]
---

# CampaignComposer

One screen to send a message to many people. Choose the channel and the audience, watch how many people it will
reach, write the message, see it as the reader will, send yourself a test, fix what the checks list, confirm, and
follow the send.

## When to use

- Newsletters and one-off broadcasts by email or WhatsApp.

## When not to use

- Automated sequences: use a rule builder.
- Reusable email layouts: use [`EmailTemplates`](../email-templates/README.md).

## Import

```tsx
import { CampaignComposer } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<CampaignComposer
  audiences={[{ id: "all", label: "Everyone", counts: { email: 1240, whatsapp: 610 } }]}
  variables={[{ key: "name", label: "Name", sample: "Sara" }]}
  onSendTest={async (draft, to) => sendTest(draft, to)}
  onSend={async (draft) => startSend(draft)}
  progress={progress}
/>
```

## Anatomy

- Left: channel toggle, audience select, live count, subject (email), editor, variable chips.
- Right: preview (email frame at desktop or phone width, or a WhatsApp bubble), the checks list, send progress, "Send a test" and "Send campaign".
- Dialogs: test send, and an alert dialog "Send to N people?".

Every email preview and WhatsApp bubble carries the unsubscribe footer, so the reader can always opt out.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `audiences` | `CampaignAudience[]` | `{ id, label, description?, counts? }`. |
| `variables` | `EmailVariable[]` | `{ key, label, sample }`, filled per person. |
| `defaultValue` / `onChange` | `Partial<CampaignDraft>` / `(draft) => void` | `{ channel, audienceId, subject, body }`. |
| `onCountAudience` | `(audienceId, channel) => Promise<number>` | Live count, else `audience.counts`. |
| `onSendTest` | `(draft, to) => Promise<...>` | WhatsApp tests go to the workspace number only. |
| `onSend` | `(draft) => Promise<...>` | After confirmation. |
| `progress` | `{ sent, failed, total }` or `null` | Controlled. While set, the form locks. |
| `onStopSending` | `() => void` | Shows a stop button while sending. |
| `sender`, `testRecipient` | | Shown in the email preview and test dialog. |
| `labels` | `Partial<CampaignComposerLabels>` | Override any string. |

Pure helpers: `validateCampaign`, `campaignProgress`, `campaignPlainText`, `campaignUnknownVariables`.

## Examples

Drive `progress` from your queue: `{ sent: 480, failed: 3, total: 1240 }`.

## Accessibility

The count is a live status. Checks are a list with text. Progress is a named progressbar. The confirm step is an alert dialog.

## RTL & i18n

English and Arabic ship. The email body direction follows the locale, addresses and numbers stay left-to-right.

## Styling & tokens

Semantic tokens only. Channels are text, no brand mark is drawn.

## Do / Don't

- Do send a test first.
- Don't send WhatsApp broadcasts to people who have not agreed to WhatsApp.

## Related

- [`EmailTemplates`](../email-templates/README.md)
- [`SubscriptionLanding`](../subscription-landing/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-marketing-campaign-composer--docs
