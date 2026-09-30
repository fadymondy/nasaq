---
name: marketplace
title: Marketplace
category: commerce
status: beta
summary: A store with a featured strip, categories and search, a detail page with install header, tabs, sidebar and permissions, a publish form and a template gallery, built on the catalog store.
exports: [Marketplace, MarketplaceDetail, PublishForm, TemplateGallery, PermissionList, MarketplaceListing, MarketplaceTemplate, MarketplacePermission, MarketplaceRelease, MarketplaceReview, MarketplaceResult, MarketplaceLabels, MarketplaceProps, MarketplaceDetailProps, PublishFormProps, TemplateGalleryProps, PermissionListProps, ScreenshotPlaceholder]
related: [catalog-store, workflow-marketplace, install-button, rating, price]
story: components-commerce-marketplace
base-ui: []
keywords: [marketplace, store, extensions, plugins, detail, install, permissions, publish, submit, templates, gallery, featured]
---

# Marketplace

The full store around [`CatalogStore`](../catalog-store/README.md). Browsing is the catalog (search, category chips, sort, cards) with a featured strip above it. Opening an item shows a page instead of a sheet: install header, Overview / Changelog / Reviews tabs and a side column with details, permissions, links and tags. A Publish button opens a validated submit form, and a Templates view shows a gallery. It holds no data and calls no backend.

## When to use

- A store for extensions, plugins or apps where each item needs a real detail page and a publish flow.

## When not to use

- A simple grid with a side sheet: use [`CatalogStore`](../catalog-store/README.md) alone.
- Selling physical goods with a cart: use the product components.

## Import

```tsx
import { Marketplace } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<Marketplace
  categories={[{ id: "comms", label: "Messaging" }]}
  listings={[{ id: "mail", name: "Send email", summary: "Send a templated email.", category: "comms", featured: true, permissions: [{ id: "mail.send", label: "Send email as you", risk: "high" }] }]}
  onInstall={async (l) => { await api.install(l.id); }}
  onPublish={async (draft) => { await api.submit(draft); }}
/>
```

## Anatomy

```
Marketplace                 data-slot="marketplace"
├─ switcher                 Extensions / Templates, Publish
├─ featured strip           up to three featured listings
├─ CatalogStore             search, chips, sort, cards; onSelect opens the detail
├─ MarketplaceDetail        install header, Tabs, sidebar (details, PermissionList, links, tags)
├─ TemplateGallery          category chips, preview cards, Use template
└─ Dialog > PublishForm     name, summary, category, version, repository, price, tags, permissions
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `listings` | `MarketplaceListing[]` | required | A `CatalogItem` plus `featured?`, `screenshots?`, `permissions?`, `changelog?`, `reviews?`, `links?`, `compatibility?`, `license?`, `size?`. |
| `categories` | `CatalogCategory[]` | required | `{ id, label, icon? }`. |
| `templates?` / `templateCategories?` | `MarketplaceTemplate[]` / `CatalogCategory[]` | none | Adds the Templates view. |
| `permissionOptions?` | `MarketplacePermission[]` | none | What an author can declare in the publish form. |
| `onInstall?` / `onUninstall?` | `(listing) => Promise<void \| { error?: string }>` | none | Return `{ error }` to show why it failed. |
| `onOpen?` | `(listing) => void` | none | The "Open" action once installed. |
| `onPublish?` | `(draft: PublishDraft) => Promise<void \| { error?: string }>` | none | Adds the Publish button. |
| `onUseTemplate?` | `(template) => Promise<void \| { error?: string }>` | none | Adds "Use template". |
| `onSelectedChange?` | `(id \| null) => void` | none | Fired when a detail page opens or closes. |
| `labels?` | `Partial<MarketplaceLabels> & { store?: Partial<CatalogLabels> }` | en/ar | Override strings; `store` goes to the catalog. |

`MarketplaceDetail`, `PublishForm`, `TemplateGallery` and `PermissionList` are exported for use on their own. Permission `risk` is `low`, `medium` or `high`; the list shows the riskiest first.

## Examples

### Detail page on its own

```tsx
<MarketplaceDetail listing={listing} onInstall={install} onBack={() => router.back()} />
```

## Accessibility

- Cards and featured tiles are articles whose title is a button covering the card. Install is a separate control.
- Permission risk is written out (Low, Medium, High) next to an icon. The form marks invalid fields with `aria-invalid` and a message; errors from the server use `role="alert"`.
- The dialog traps focus and closes on Escape.

## RTL & i18n

- English and Arabic built in. Versions, repository URLs, sizes and licences stay left-to-right in `<bdi dir="ltr">`.
- The back arrow and external-link icon mirror.

## Styling & tokens

- `bg-card`, `bg-secondary`, `border-border`, `rounded-card`; hover `--nq-hover`. No raw hex.
- Target `[data-slot=marketplace]`, `[data-slot=marketplace-detail]`, `[data-slot=publish-form]`, `[data-slot=template-gallery]`.

## Do / Don't

- **Do** list every permission an extension needs; the detail page is the user's consent screen.
- **Do** mark at most three listings `featured`.
- **Don't** put secrets in `links` or `screenshots`.

## Related

- [CatalogStore](../catalog-store/README.md) · [WorkflowMarketplace](../workflow-marketplace/README.md) · [InstallButton](../install-button/README.md) · [Rating](../rating/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-marketplace--docs
