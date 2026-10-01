---
name: provider-switcher
title: ProviderSwitcher
category: developer-tools
status: beta
summary: "Lists an app's swappable capabilities (data, queue, cache, storage…) with the backend each runs on, and switches backends at runtime."
exports: [ProviderSwitcher, ProviderSwitcherProps, ProviderCapability, ProviderOption, ProviderSwitcherLabels]
related: [env-list, feature-flags, select, status]
story: components-developer-tools-provider-switcher
base-ui: [select]
keywords: [provider, backend, driver, capability, adapter, switcher, runtime config, database, queue, cache, storage, realtime]
---

# ProviderSwitcher

An operator panel for apps built on swappable capabilities. Each row is one capability (data, queue, cache, storage, realtime…) with the backend it runs on, and a select to switch it. Rows on the app's configured default say **Default**; switched rows say **Overridden**. Rows pinned by config are locked.

## When to use

- In an admin or developer settings page of a framework app whose drivers can change at runtime (the ToGO provider panel).

## When not to use

- Plain environment variables: use [`EnvList`](../env-list/README.md).
- On/off switches for product features: use [`FeatureFlags`](../feature-flags/README.md).

## Import

```tsx
import { ProviderSwitcher } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProviderSwitcher } from "@fadymondy/nasaq/web";

<ProviderSwitcher
  capabilities={[
    { capability: "data", label: "Data", active: "postgres", options: ["postgres", "sqlite"], isDefault: true },
    { capability: "queue", label: "Queue", active: "redis", options: ["redis", "nats", "database"], isDefault: false },
  ]}
  onSelect={(capability, backend) => api.post(`/providers/${capability}`, { backend })}
/>;
```

## Anatomy

```
div [data-slot=provider-switcher]
├─ header row (Capability · Backend), from sm up
└─ ul
   └─ li [data-slot=provider-switcher-row][data-capability][aria-busy]
      ├─ label + Status (Default / Overridden) + description
      └─ Select [data-slot=provider-switcher-select]
```

## API

### `ProviderSwitcher`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `capabilities` | `ProviderCapability[]` | — | Required. One row each. An empty list shows a short message. |
| `onSelect` | `(capability, backend) => void \| Promise<void>` | — | Leave out for a read-only view. A returned promise keeps the row busy until it settles. |
| `labels` | `Partial<ProviderSwitcherLabels>` | — | Override the built-in strings. |

Plus any `<div>` prop.

### `ProviderCapability`

| Field | Type | Notes |
| --- | --- | --- |
| `capability` | `string` | The key sent to `onSelect`: `"data"`, `"queue"`. |
| `label` / `description` | `ReactNode` | Name and one line of what it does. Default name is the key. |
| `active` | `string` | The backend in use. |
| `options` | `(string \| ProviderOption)[]` | Backends to choose from. |
| `isDefault` | `boolean` | `true` shows Default, `false` shows Overridden, unset shows nothing. |
| `locked` | `boolean` | Disables the select (pinned by config). |

### `ProviderOption`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | The backend id. |
| `label` / `description` | `ReactNode` | Menu text. |
| `disabled` | `boolean` | Listed but not selectable. |

## Examples

### Rich options

```tsx
{
  capability: "data",
  active: "postgres",
  options: [
    { id: "postgres", label: "PostgreSQL" },
    { id: "sqlite", label: "SQLite", description: "Local file, for development" },
  ],
}
```

### Read-only overview

```tsx
<ProviderSwitcher capabilities={capabilities} />
```

## Accessibility

- Each select is named "Backend for Data" / "مزوّد البيانات" after its row.
- A row that is applying a change has `aria-busy` and its select is disabled.
- Default and Overridden use `Status`, which pairs a shape with the colour.

## RTL & i18n

Strings ship in English and Arabic. Capability and backend names come from the host; backend ids such as `postgres` stay Latin.

## Styling & tokens

- `rounded-card border-border bg-card` surface with `divide-border` rows; `text-label` names, `text-caption` descriptions.
- Target a row with `[data-slot=provider-switcher-row][data-capability=queue]`.

## Do / Don't

- Do confirm a switch server-side and return the promise, so the row shows the change only once it applied.
- Do lock capabilities that can't change without a restart.
- Don't list backends the app has no driver for.

## Related

`env-list`, `feature-flags`, `select`, `status`.

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-provider-switcher--docs
