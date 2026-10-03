---
name: product-reviews
title: ProductReviews
category: store
status: beta
summary: "Customer reviews for a product: rating summary with a histogram that filters, sort and filter chips, photo strip, helpful votes, seller replies, report, and a write-review form. Includes ProductQA for questions and answers."
exports: [ProductReviews, ProductReviewsProps, ProductReviewReportReason]
related: [product-detail, rating, dialog, select, context-menu]
story: components-storefront-product-reviews
base-ui: [radio, radio-group, dialog, select, context-menu]
keywords: [reviews, ratings, histogram, helpful, verified purchase, photos, seller reply, report, questions, answers, q&a, store]
---

# ProductReviews

The reviews block for a product page. It shows the average and a star histogram (each row filters the list), sort and filter chips (photos, verified purchases), a photo strip with a viewer, and the review list with helpful votes, seller replies and a report action. A dialog holds the write-a-review form. `ProductQA` is the questions and answers block. Both live in the `reviews` slot of [`ProductDetail`](../product-detail/README.md) or stand alone.

## When to use

- Reviews and Q&A on a product page.
- The rating summary or the write-review form on their own.

## When not to use

- A single star rating in a card: use [`Rating`](../rating/README.md).
- Testimonials on a marketing page: use the testimonial components.

## Import

```tsx
import { ProductReviews, ProductQA } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ProductReviews } from "@fadymondy/nasaq/web";

export function Reviews({ reviews }: { reviews: ProductReview[] }) {
  return (
    <ProductReviews
      reviews={reviews}
      onSubmitReview={async (review) => api.post(review)}
      onVoteHelpful={async (id, voted) => api.vote(id, voted)}
      onReport={async (id, { reason, note }) => api.report(id, reason, note)}
    />
  );
}
```

## Anatomy

```
ProductReviews                 data-slot="product-reviews"
├─ header + Write a review
├─ ProductReviewSummary        average, Rating, histogram (toggle buttons), fit split
├─ photo strip                 opens a viewer dialog
├─ filter bar                  sort Select, chips, active star pills, clear
├─ review list                 each item is a ContextMenuActions region
│  └─ review                   Rating, verified Badge, body with read more, photos, seller reply, Helpful, Report
├─ show more
├─ write review Dialog         ProductReviewForm
└─ report Dialog
ProductQA                      data-slot="product-qa": ask form, search, sort, questions, answers, answer form
```

## API

### `ProductReviews`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `reviews` | `ProductReview[]` | required | `id, author, rating, body, date` plus `title, verified, photos, helpful, variantLabel, fit, reply`. |
| `summary?` | `ReviewSummary` | computed | Use when only one page is loaded. |
| `pageSize?` | `number` | `5` | "Show more" adds a page. |
| `defaultSort?` | `ReviewSort` | `"helpful"` | `helpful`, `newest`, `oldest`, `highest`, `lowest`. |
| `loading?`, `error?`, `onRetry?` | | | Skeleton, error message with retry. |
| `onSubmitReview?` | `(review) => void \| { error? } \| Promise` | none | Turns on Write a review. `rating, title, body, name, fit?, photos: File[]`. |
| `formProps?` | `{ askFit, askName, defaultName, rules }` | none | |
| `onVoteHelpful?` | `(id, voted) => ...` | none | Optimistic; a failure rolls back. |
| `onReport?` | `(id, { reason, note }) => ...` | none | Turns on Report. |
| `onFiltersChange?` | `(filters) => void` | none | |
| `labels?` | `ProductReviewsLabels` | en or ar | Override any string. |

### `ProductQA`

`questions`, `answersShown?` (2), `pageSize?` (5), `defaultSort?` (`votes`, `newest`, `answered`), `onAsk?`, `onAnswer?`, `onVoteQuestion?`, `onVoteAnswer?`, `loading?`, `error?`, `onRetry?`, `labels?`. Store answers come first, then the most upvoted.

### `ProductReviewSummary` and `ProductReviewForm`

- `ProductReviewSummary`: `summary`, `selectedStars?`, `onToggleStar?`, `fit?`, `labels?`.
- `ProductReviewForm`: `onSubmit`, `askFit?`, `askName?`, `defaultName?`, `rules?`, `onSubmitted?`, `onCancel?`, `labels?`. Validates on submit and after a field is left.

## Examples

### Arabic reviews

Set the provider locale to `ar`. Strings, digits, dates and the layout follow.

### Server-side paging

```tsx
<ProductReviews reviews={page} summary={{ average: 4.6, count: 214, histogram }} onFiltersChange={refetch} />
```

## Accessibility

- Histogram rows are toggle buttons with `aria-pressed` and a full label ("Show only 5-star reviews (12)").
- The result count is a live region. Helpful is a toggle button.
- Each review has a context menu (context-click, long-press, Shift+F10 or the Menu key) with the same actions as its buttons.
- The star input is a radio group; the form moves focus to the first invalid field.

## RTL & i18n

- English and Arabic strings are built in; pass `labels` to override.
- Counted nouns agree with the number: "1 answer", "2 answers" in English and the six Arabic forms (`إجابة واحدة`, `إجابتان`, `3 إجابات`, `11 إجابة`) through `Intl.PluralRules`. The count strings (`basedOn`, `qaCount`, `answers`, `showAnswers`, `upvoteCount`) receive the raw number as a second argument, `(formatted, count?)`; a `labels` override that ignores it still works.
- Numbers use locale digits inside `<bdi>`. Previous and next arrows in the viewer mirror.

## Styling & tokens

- Tokens only: `bg-nq-selected`, `bg-nq-accent` bars, `text-nq-danger-text` errors. Photos have fixed size and a token placeholder on failure.

## Do / Don't

- **Do** return `{ error }` from callbacks so the UI can roll back and say why.
- **Do** show real photo alt text when you have it.
- **Don't** compute the histogram from a single page; pass `summary`.

## Related

- [ProductDetail](../product-detail/README.md) · [Rating](../rating/README.md) · [ContextMenu](../context-menu/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-storefront-product-reviews--docs
