---
name: store-products-admin
title: Store Products Admin
category: commerce
status: beta
summary: "The merchant side of the catalogue: a product list with bulk edit, a product editor with a generated variant matrix, media manager and search preview, and a collections manager with manual and rule-based collections."
exports: [CollectionsManager, CollectionsManagerProps, MediaManager, MediaManagerProps, ProductEditor, ProductEditorProps, ProductAdminList, ProductAdminListProps, ProductAdminResult, StoreProductsAdminLabels, OptionsEditor, OptionsEditorProps, VariantMatrix, VariantMatrixProps]
related: [store-settings, data-table, rule-builder, seo-preview, currency-input, rich-text-editor]
story: components-commerce-store-products-admin
base-ui: [dialog, select, switch, tabs]
keywords: [products, catalogue, variants, inventory, collections, bulk edit, sku, margin, seo, admin]
---

# Store Products Admin

Everything a merchant needs to manage the catalogue: a product list with search, filters and bulk edit of price, stock and status;
a product editor with pictures, price and margin, inventory, options that build a variant matrix, and a search listing preview;
and a collections manager where a collection is picked by hand or filled by rules with a live match preview.
Money is integer minor units. The components hold no data and call no API: you pass the catalogue and save in `on*` callbacks.

## When to use

- A store back office: products, variants, stock, collections.

## When not to use

- Showing products to shoppers: use `product-card`, `product-detail` and the listing components.
- Stock movements and warehouses: use `stock-ledger`.

## Import

```tsx
import { ProductAdminList, ProductEditor, CollectionsManager, productToDraft } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ProductAdminList
  products={products}
  currency="EGP"
  onOpen={(p) => router.push(`/products/${p.id}`)}
  onCreate={() => router.push("/products/new")}
  onBulkEdit={async (ids, edit) => api.bulkEdit(ids, edit)}
/>

<ProductEditor
  initial={productToDraft(product, { cost: 4000 })}
  currency="EGP"
  siteUrl="https://shop.example"
  onSave={async (draft) => api.saveProduct(draft)}
/>
```

## Anatomy

```
ProductAdminList   [data-slot=product-list]   DataTable + bulk edit dialog + delete confirm
ProductEditor      [data-slot=product-editor]       form of cards, sticky save bar
  MediaManager     [data-slot=media-manager]        sortable picture tiles [data-slot=media-tile]
  OptionsEditor    [data-slot=options-editor]
  VariantMatrix    [data-slot=variant-matrix]
CollectionsManager [data-slot=collections-manager]  cards + editor dialog with RuleBuilder and match preview
```

## API

### ProductAdminList

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `products` | `readonly CommerceProduct[]` | required | The catalogue. |
| `currency` | `string` | required | ISO 4217 code. |
| `onOpen` | `(product) => void` | none | Row click, Enter, or Edit in the row menu. |
| `onCreate` | `() => void` | none | Shows "New product". |
| `onBulkEdit` | `(ids, edit: ProductBulkEdit) => Promise<ProductAdminResult>` | none | Without it the bulk button is hidden. |
| `onStatusChange` | `(product, status) => Promise<ProductAdminResult>` | none | Activate, draft, archive. |
| `onDelete` | `(product) => Promise<ProductAdminResult>` | none | Delete after confirmation. |
| `lowStockAt` | `number` | `5` | Stock at or below is low. |
| `loading`, `error`, `onRetry` | | | States. `error` is `true` or a message. |
| `labels` | `StoreProductsAdminLabels` | en / ar | Override any string. |

### ProductEditor

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `initial` | `ProductDraft` | empty draft | Build with `productToDraft(product, { cost, visibility, seoTitle, seoDescription })`. |
| `currency` | `string` | required | ISO 4217 code. |
| `siteUrl` | `string` | `https://store.example` | Origin for the search preview URL. |
| `onSave` | `(draft) => Promise<ProductAdminResult>` | required | Resolve `{ error }` to keep the edits. |
| `onCancel` | `() => void` | none | Called when Discard is pressed with nothing changed. |
| `suggestions` | `{ brands?, categories?, tags? }` | none | Autocomplete lists. |
| `loading` | `boolean` | `false` | Skeleton. |
| `labels` | `StoreProductsAdminLabels` | en / ar | Strings. |

Changing options regenerates the variants with `generateVariants`: a variant whose option values still exist keeps its price, compare-at, SKU, stock and image. Removed combinations are named in a notice; the matrix is capped at 100.

### MediaManager, OptionsEditor, VariantMatrix

`MediaManager({ images, onImagesChange, maxImages = 12, disabled, labels })`,
`OptionsEditor({ options, onOptionsChange, maxOptions = 3, disabled, labels })`,
`VariantMatrix({ options, variants, onVariantsChange, currency, images, disabled, labels })`. All are controlled.

### CollectionsManager

| Prop | Type | Description |
| --- | --- | --- |
| `collections` | `readonly CollectionDef[]` | `{ id, title, kind: "manual" \| "rules", productIds?, conditions? }`. |
| `products` | `readonly CommerceProduct[]` | For the picker and live preview. |
| `currency` | `string` | Rule prices are typed in major units of it. |
| `onSave` | `(collection) => Promise<ProductAdminResult>` | New collections arrive with a fresh `id`. |
| `onDelete` | `(collection) => Promise<ProductAdminResult>` | Adds Delete. |
| `loading`, `error`, `onRetry`, `labels` | | |

### Logic (pure, also exported)

`generateVariants`, `bulkFillVariants`, `bulkEditProducts`, `bulkPrice`, `marginFromCost`, `priceForMargin`, `stockSummary`, `matchCollection`, `collectionsOfProduct`, `validateProductDraft`, `productToDraft`, `draftToProduct`, `draftChanged`, `emptyProductDraft`, `decimalToMinor`, `optionCombinations`, `variantLabel`, `duplicateSkus`. They use integer maths only.

## Examples

```tsx
// A rule collection: products tagged "summer" under 500
const collection: CollectionDef = {
  id: "c1",
  title: "Summer under 500",
  kind: "rules",
  conditions: { kind: "group", id: "g", join: "and", children: [
    { kind: "condition", id: "a", field: "tag", op: "is", value: "summer" },
    { kind: "condition", id: "b", field: "price", op: "lt", value: "500" },
  ] },
};
matchCollection(products, collection, { minorPerMajor: 100 });
```

## Accessibility

| Key | Action |
| --- | --- |
| Space, arrows, Space | Pick up, move and drop a picture (also the move earlier / later buttons). |
| Enter on a list row | Open the product. |
| Shift+F10, Menu key, context-click | Row actions. |

Moves are announced in a live region. Missing alt text is counted and flagged. Every icon-only button has a label.

## RTL & i18n

English and Arabic built in through `useOptionalNasaq()`. SKUs, prices and numbers stay LTR inside `dir="ltr"` or `<bdi>`. Chevrons flip in RTL.

## Styling & tokens

Uses `--nq-*` tokens only. Target `data-slot` names above; `data-dragging` marks a picture being dragged.

## Do / Don't

- Do pass prices in minor units. Don't pass floats.
- Do give every picture alt text.
- Don't rely on client validation alone: check again on the server.

## Related

- [store-settings](../store-settings/README.md)
- [data-table](../data-table/README.md)
- [rule-builder](../rule-builder/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-commerce-store-products-admin--docs
