---
name: workflow-marketplace
title: Workflow marketplace
category: workflow
status: beta
summary: A store of workflow steps and ready-made presets with search, categories, a kind switch, a detail sheet and install, built on the shared catalog store.
exports: [WorkflowMarketplace, WorkflowListing, WorkflowListingKind, WorkflowMarketplaceLabels, WorkflowMarketplaceProps]
related: [catalog-store, workflow-canvas, workflow-network, install-button]
story: components-workflow-workflow-marketplace
base-ui: [toggle-group]
keywords: [workflow, marketplace, steps, nodes, presets, templates, catalogue, install, store]
---

# Workflow marketplace

Browse and install the building blocks of automations. A listing is either a single **step** (a trigger or action you can add to any workflow) or a **preset** (a ready-made workflow of several steps). Steps show what they take, give and ask for; presets show the diagram they install. It is a thin layer over [`CatalogStore`](../catalog-store/README.md), so the card and detail layout matches any other Nasaq store.

## When to use

- Letting people add steps to the palette of [`WorkflowCanvas`](../workflow-canvas/README.md) or start from a template.

## When not to use

- Selling apps or plugins: use [`CatalogStore`](../catalog-store/README.md) directly.

## Import

```tsx
import { WorkflowMarketplace } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { WorkflowMarketplace } from "@fadymondy/nasaq/web";
import { Mail } from "lucide-react";

<WorkflowMarketplace
  categories={[{ id: "comms", label: "Messaging" }]}
  listings={[
    {
      id: "send-email", kind: "step", name: "Send email", summary: "Send a templated email.", category: "comms", icon: Mail,
      step: { inputs: ["Contact"], outputs: ["Message id"], fields: [{ name: "to", label: "To", kind: "text", required: true }] },
    },
  ]}
  onInstall={async (l) => { await api.install(l.id); }}
/>;
```

## Anatomy

```
WorkflowMarketplace      (a CatalogStore)
├─ toolbar               search, kind ToggleGroup (All, Steps, Presets), sort
├─ categories            chips with counts, Installed
├─ cards                 badge: Preset, Trigger or Action
└─ detail sheet          step: takes, gives, settings; preset: the WorkflowNetwork diagram
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `listings` | `WorkflowListing[]` | required | `CatalogItem` fields plus `kind: "step" \| "preset"`, `step?: { role?, fields?, inputs?, outputs? }`, `preset?: { steps, links? }`. |
| `categories` | `CatalogCategory[]` | required | `{ id, label, icon? }`. |
| `onInstall?` | `(listing) => Promise<void \| { error?: string }>` | none | Return `{ error }` to show why it failed. |
| `onUninstall?` | `(listing) => Promise<...>` | none | Adds Uninstall to installed items. |
| `onOpen?` | `(listing) => void` | none | "Open" once installed. |
| `labels?` | `Partial<WorkflowMarketplaceLabels> & { store?: Partial<CatalogLabels> }` | en/ar | Override strings. |

## Accessibility

Inherits the catalog store's: named chip and toggle groups, a live result count, a focus-trapped sheet, `role="alert"` install errors. The preset diagram is real text in cards.

## RTL & i18n

English and Arabic built in for the marketplace and the store. Field kinds and other code stay left-to-right; the preset diagram follows the reading direction.

## Styling & tokens

Same tokens as the catalog store and workflow network. No raw hex.

## Do / Don't

- **Do** give presets a short `steps` list (under ten) so the sheet diagram stays readable.
- **Don't** put secrets in `step.fields`; it lists names and kinds only.

## Related

- [CatalogStore](../catalog-store/README.md) · [WorkflowCanvas](../workflow-canvas/README.md) · [WorkflowNetwork](../workflow-network/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-workflow-workflow-marketplace--docs
