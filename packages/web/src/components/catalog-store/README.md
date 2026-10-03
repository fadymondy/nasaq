---
name: catalog-store
title: Catalog store
category: store
status: beta
summary: A store for installable things with search, category chips, sort, a card grid and a detail sheet with install and uninstall, reusable for workflow steps, plugins and apps.
exports: [CatalogStore, CatalogCard, CatalogIcon, CatalogItem, CatalogCategory, CatalogResult, CatalogLabels, CatalogStoreProps]
related: [install-button, rating, price, sheet, chip-group, workflow-marketplace]
story: components-storefront-catalog-store
base-ui: []
keywords: [store, marketplace, catalog, plugins, apps, install, search, categories, detail, cards]
---

# Catalog store

One layout for anything people browse and install: a search box, category chips with counts, a sort switch, a grid of cards and a detail sheet with the install action. It holds no data and calls no backend; you pass items and async callbacks. [`WorkflowMarketplace`](../workflow-marketplace/README.md) is built on it, and a plugin or app marketplace can be too.

## When to use

- Browsing a catalogue where each item can be installed, added or enabled.
- Any store that needs the same card and detail shape across several kinds of item.

## When not to use

- Buying with a cart: use the commerce components ([`ProductCard`](../product-card/README.md)).
- A plain list of records: use [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { CatalogStore } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CatalogStore } from "@fadymondy/nasaq/web";
import { Mail } from "lucide-react";

<CatalogStore
  categories={[{ id: "comms", label: "Messaging" }]}
  items={[{ id: "mail", name: "Send email", summary: "Send a templated email.", category: "comms", icon: Mail, installs: 1200, rating: 4.6, ratingCount: 88 }]}
  onInstall={async (item) => { await api.install(item.id); }}
/>;
```

## Anatomy

```
CatalogStore                data-slot="catalog-store"
├─ toolbar                  search, toolbarStart slot, sort ToggleGroup
├─ ChipGroup                All, categories (with counts), Installed
├─ grid                     CatalogCard data-slot="catalog-card" [data-state]
└─ Sheet                    icon, name, publisher, rating, About, renderDetail, Details, Tags, InstallButton
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `CatalogItem[]` | required | `{ id, name, summary, category, description?, icon?, publisher?, version?, badge?, installs?, rating?, ratingCount?, price?, tags?, installed?, updatedAt?, details? }`. |
| `categories` | `CatalogCategory[]` | required | `{ id, label, icon? }`. |
| `onInstall?` | `(item) => Promise<void \| { error?: string }>` | none | Resolve to finish. Return `{ error }` to show why it failed; the item stays not installed. |
| `onUninstall?` | `(item) => Promise<void \| { error?: string }>` | none | Adds an Uninstall button to the sheet of installed items. |
| `onOpen?` | `(item) => void` | none | The "Open" action once installed. |
| `onSelect?` | `(item) => void` | none | When set, opening a card calls this instead of the sheet, so you can show your own detail page ([`Marketplace`](../marketplace/README.md)). |
| `renderDetail?` | `(item) => ReactNode` | none | Extra content in the sheet after the description. |
| `toolbarStart?` | `ReactNode` | none | Controls after the search box, such as a kind switch. |
| `defaultSort?` | `"popular" \| "newest" \| "name"` | `"popular"` | |
| `labels?` | `Partial<CatalogLabels>` | en/ar | Override any string. |

`CatalogCard` and `CatalogIcon` are exported for custom grids.

## Examples

### Failing install

```tsx
<CatalogStore items={items} categories={cats} onInstall={async () => ({ error: "Your plan does not include this." })} />
```

## Accessibility

- Each card is an `article` whose title is a button that opens the detail; the whole card is clickable through it. The install button is a separate control above it.
- The category chips and sort switch are named groups; a hidden live line announces the result count.
- The sheet traps focus and closes on Escape. An install error is announced with `role="alert"`.

## RTL & i18n

- English and Arabic built in. Search folds Arabic hamza, taa marbuta, alef maqsura and diacritics.
- Counts, versions and prices stay in Latin digits inside `<bdi>`.

## Styling & tokens

- Cards use `bg-card`, `border-border`, `rounded-card`; hover uses `--nq-hover`. No raw hex.
- Target `[data-slot=catalog-store]`, `[data-slot=catalog-card]`.

## Do / Don't

- **Do** keep `summary` to one line; it clamps at two.
- **Do** return `{ error }` instead of throwing.
- **Don't** put more than ten categories; use search.

## Related

- [InstallButton](../install-button/README.md) · [Rating](../rating/README.md) · [Price](../price/README.md) · [WorkflowMarketplace](../workflow-marketplace/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-storefront-catalog-store--docs
