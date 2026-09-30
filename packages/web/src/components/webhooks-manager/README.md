---
name: webhooks-manager
title: Webhooks Manager
category: developer
status: beta
summary: Manage outgoing webhooks with endpoints, event selection, a signing secret shown once, a per-endpoint test, a delivery log with replay, inbound sources with a poll interval, and a push endpoint card shown once.
exports: [canReplay, deliveryStats, deliveryStatus, groupEvents, groupState, isSourceStale, isSuccessCode, maskSecret, pollUnit, prettyJson, setEvents, validateEndpoint, validateEndpointUrl, verifySnippet, WebhooksManagerLabels, WebhooksResult, WebhooksSecretResult, WebhookEvent, WebhookEndpoint, EndpointInput, WebhookDelivery, WebhookTestResult, InboundSource, PushEndpoint, WebhooksManagerProps, WebhooksManager]
related: [api-keys, run-history, log-viewer, data-table, code-block, copy-button]
story: components-developer-webhooks-manager
base-ui: [alert-dialog, checkbox, dialog, select, switch, tabs]
keywords: [webhook, endpoint, signing secret, delivery, replay, retry, events, inbound, polling]
---

# Webhooks Manager

One place for webhooks. It has no backend: your callbacks call the API and you pass the updated data back.

- **Endpoints**: name, URL, channel as plain text (no logos), events, enabled, masked secret and last delivery. The row menu (also the context menu) offers Send test, Edit, Rotate secret and Delete. The form checks that the URL is https (plain http only for localhost) and that at least one event is picked; events are grouped with a select-all per group.
- **Signing secret**: returned by `onSaveEndpoint` or `onRotateSecret` as `{ secret }` and shown once in a dialog with a copy field and a snippet that verifies the `X-Signature` header. After the dialog closes the UI keeps only the last four characters.
- **Deliveries**: filter by endpoint and status, open a delivery for its request, response and error, and send a finished one again.
- **Inbound**: sources with an editable poll interval, last status (healthy, failing, late) and Poll now.
- **Push endpoint**: pass `pushEndpoint` and a card shows the URL and token once. `onDismissPush` closes it and you stop passing it.

## When to use

- A developer settings page for outgoing and incoming integrations.

## When not to use

- Full API key management: use `ApiKeys`.

## Import

```tsx
import { WebhooksManager } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WebhooksManager, type WebhookEndpoint, type WebhookEvent } from "@fadymondy/nasaq/web";

declare const events: WebhookEvent[];
declare const endpoints: WebhookEndpoint[];
declare const api: { save(input: unknown): Promise<{ secret?: string }>; remove(id: string): Promise<void> };

export function Webhooks() {
  return <WebhooksManager events={events} endpoints={endpoints} onSaveEndpoint={(input) => api.save(input)} onDeleteEndpoint={(id) => api.remove(id)} />;
}
```

## API

`WebhooksManager` takes the `div` props except `children` and `title`, plus:

| Prop | Type | Description |
| --- | --- | --- |
| `events` | `WebhookEvent[]` | `{ id, label, group? }`. |
| `endpoints` | `WebhookEndpoint[]` | `{ id, name, url, channel?, events, enabled, secretLast4, lastDeliveryAt?, lastDeliveryStatus? }`. |
| `deliveries` | `WebhookDelivery[]` | `{ id, endpointId, event, status, code?, durationMs?, at, attempt, request?, response?, error? }`. Status: `success`, `failed`, `pending`. |
| `sources` | `InboundSource[]` | `{ id, name, target?, intervalSeconds, lastStatus?, lastAt?, lastError? }`. |
| `pushEndpoint`, `onDismissPush` | `{ url, token }`, callback | The push card. |
| `onSaveEndpoint(input)` | callback | Create (no `id`) or update. Returns `void`, `{ error }` or `{ secret }`. |
| `onDeleteEndpoint(id)` | callback | Asked first. |
| `onToggleEndpoint`, `onRotateSecret`, `onTest`, `onReplay`, `onSetInterval`, `onPollNow` | optional callbacks | Each adds its control when passed. `onTest` returns `{ ok, code?, durationMs?, error? }`. |

## Accessibility

Tables are labelled, the enabled switch and the interval select name their endpoint, and destructive actions use an alert dialog.

## RTL and languages

English and Arabic, overridable with `labels`. URLs, event ids, codes and secrets stay left to right.
