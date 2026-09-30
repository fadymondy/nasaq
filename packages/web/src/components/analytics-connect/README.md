---
name: analytics-connect
title: AnalyticsConnect
category: analytics
status: beta
summary: The connect-account empty state of an analytics page, built on IntegrationConnector, plus AnalyticsPageFrame, the shared page shell.
exports: [AnalyticsConnect, AnalyticsConnectProps, AnalyticsConnectLabels]
related: [integration-connector, metric-tiles, google-analytics-page, search-console-page]
story: components-analytics-analytics-connect
base-ui: []
keywords: [connect, oauth, empty state, google analytics, search console, youtube, integration]
---

# AnalyticsConnect

An analytics page has nothing to show until an account is linked. `AnalyticsConnect` explains what connecting gives you (a short benefits list), then shows the one `IntegrationConnector` card for the service: a consent dialog listing the requested scopes, an account picker and a reconnect flow when the sign-in expired. `AnalyticsPageFrame` (exported from the same folder) is the shell all five analytics pages use: heading, period controls, refresh, disconnect and the connected line, and it switches to `AnalyticsConnect` when the service is not connected. No brand logo is drawn: the product name is text unless you pass its official logo as `service.icon`.

## When to use

- Before a Google Analytics, Search Console, YouTube or monitoring account is linked.
- When a sign-in has expired (`status: "needs-reauth"`).
- As the shell of a report page via `AnalyticsPageFrame`.

## When not to use

- Managing many integrations at once: use [`IntegrationConnector`](../integration-connector/README.md).
- Sign-in to your own app: use [`LoginForm`](../login-form/README.md).

## Import

```tsx
import { AnalyticsConnect, AnalyticsPageFrame } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { AnalyticsConnect, type IntegrationService } from "@fadymondy/nasaq/web";

const service: IntegrationService = {
  id: "ga",
  name: "Google Analytics",
  scopes: [{ id: "analytics.readonly", label: "See your Google Analytics reports", required: true }],
  status: "disconnected",
};

export function Connect() {
  return (
    <AnalyticsConnect
      service={service}
      benefits={["Users and sessions against the previous period", "Sources and top pages"]}
      onConnect={async () => { /* start OAuth */ }}
      onDisconnect={async () => {}}
    />
  );
}
```

## Anatomy

```
AnalyticsConnect       data-slot="analytics-connect"  data-status="disconnected|needs-reauth|…"
  heading + text
  benefits list
  IntegrationConnector (bare, one service)
AnalyticsPageFrame     data-slot="analytics-page"  data-connected
  header               title, description, actions, Refresh, Disconnect (confirm)
  connected line       status, account, updated time
  children | error | AnalyticsConnect
```

## API

### AnalyticsConnect

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `service` | `IntegrationService` | required | The service, its scopes and its state. |
| `onConnect` | `(id, scopeIds) => Promise` | required | Start OAuth for the ticked scopes. |
| `onDisconnect` | `(id) => Promise` | required | Disconnect. |
| `onSelectAccount` | `(id, accountId) => Promise` | none | Enables the account picker. |
| `benefits` | `readonly string[]` | none | What the page will show. |
| `title / description` | `ReactNode` | none | Replace the default heading and text. |
| `connectorLabels` | `IntegrationConnectorProps["labels"]` | none | Strings of the inner connector. |
| `className` | `string` | none | Extra classes on the root. |
| `labels` | `Partial<AnalyticsConnectLabels>` | none | Replace any built-in English or Arabic string. |

### AnalyticsPageFrame

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `ReactNode` | required | Page heading; the product name as text. |
| `description` | `ReactNode` | none | Subtitle, such as the property. |
| `service` | `IntegrationService` | required | Connected shows `children`; any other status shows `AnalyticsConnect`. |
| `actions` | `ReactNode` | none | Period toggle or other header controls. |
| `error / onRetry` | `ReactNode / () => void` | none | Replace `children` with an error and retry. |
| `onRefresh / refreshing / updatedAt` | `() => Promise / boolean / date` | none | Refresh button, its busy state and the updated time. |
| `benefits, onConnect, onDisconnect, onSelectAccount` | none | none | Forwarded to `AnalyticsConnect`. |
| `children` | `ReactNode` | required | The report. |
| `labels` | `Partial<AnalyticsPageFrameLabels>` | none | Header strings. |

## Examples

Sign-in expired:

```tsx
import { AnalyticsConnect } from "@fadymondy/nasaq/web";

export const Expired = () => (
  <AnalyticsConnect
    service={{ id: "gsc", name: "Search Console", scopes: [{ id: "webmasters.readonly", label: "See your Search Console data", required: true }], status: "needs-reauth", connectedAs: "sara@nasaq.dev" }}
    onConnect={async () => {}}
    onDisconnect={async () => {}}
  />
);
```

As a page shell:

```tsx
import { AnalyticsPageFrame, type IntegrationService } from "@fadymondy/nasaq/web";

export const Page = ({ service }: { service: IntegrationService }) => (
  <AnalyticsPageFrame title="Reports" service={service} onConnect={async () => {}} onDisconnect={async () => {}}>
    <p>The report goes here.</p>
  </AnalyticsPageFrame>
);
```

## Accessibility

The empty state is a labelled section with a heading; the connector's dialog traps focus and lists each scope as a checkbox. Disconnect asks for confirmation in an alert dialog. Localise your `benefits` strings.

## RTL & i18n

- Text and lists align to the inline start; the connect button and dialog mirror.
- The connected account (an email) is isolated left-to-right.
- Logos are never mirrored.

## Styling & tokens

- Colours come from tokens (`--primary`, `--nq-success`, `--nq-warning`, `--nq-danger`, `--nq-tag-*`); never pass raw hex.
- Uses the connector's tokens and a dashed `--border` frame.

## Do / Don't

- Do request only the read scopes the page needs.
- Do show the product name as text unless you have its official logo.
- Don't recolour or redraw a brand logo.

## Related

- [`integration-connector`](../integration-connector/README.md)
- [`metric-tiles`](../metric-tiles/README.md)
- [`google-analytics-page`](../google-analytics-page/README.md)
- [`search-console-page`](../search-console-page/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-analytics-analytics-connect--docs
