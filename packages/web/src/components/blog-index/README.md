---
name: blog-index
title: Blog index
category: website
status: beta
summary: "A blog landing page: featured post, search, category and tag filters, post cards with cover, date and reading time, and pagination."
exports: [BlogIndexLabels, useBlogStrings, hueFor, PostCoverProps, PostCover, PostCardProps, PostMeta, PostCard, BlogIndexProps, BlogIndex]
related: [blog-post, profile-page, pagination, section-header, chip]
story: components-website-blog-index
base-ui: []
keywords: [blog, posts, articles, index, filter, search, pagination, cards]
---

# Blog index

The landing page of a blog. A featured post on top, a search box, category and tag chips, a grid of post cards (cover, category, title, excerpt, date and reading time) and pagination. It is controlled or uncontrolled for both filters and the page, so you can keep them in the URL.

## When to use

- The list page of a blog, a changelog of articles or a news section.
- A "latest writing" row: use `PostCard` on its own, or `ProfileWriting`.

## When not to use

- A table of records with sortable columns: use [`Table`](../table/README.md).
- One article: use [`BlogPost`](../blog-post/README.md).

## Import

```tsx
import { BlogIndex, PostCard } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<BlogIndex
  title="Blog"
  description="Notes on design and engineering."
  posts={posts}
  postHref={(p) => `/blog/${p.slug}`}
/>
```

## Anatomy

```
BlogIndex                 data-slot="blog-index"
├─ SectionHeader          title, description, actions
├─ featured PostCard      variant="featured" (newest post marked featured, else newest)
├─ toolbar                search InputGroup with clear button, category ChipGroup, tag ChipGroup
├─ post grid              PostCard x pageSize, container-query columns
├─ EmptyState             when nothing matches
└─ Pagination
```

## API

### `BlogIndex`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `posts` | `BlogPostSummary[]` | required | All posts. Filtering and paging are done here. |
| `title?` / `description?` / `actions?` | `ReactNode` | none | Header content. |
| `pageSize?` | `number` | `6` | Cards per page. |
| `showFeatured?` | `boolean` | `true` | Show the featured post above the grid. |
| `postHref?` | `(post) => string` | `#slug` | Link of each card. |
| `onOpenPost?` | `(post) => void` | none | Called when a card is opened. |
| `filters?` / `defaultFilters?` / `onFiltersChange?` | `BlogFilters` | empty | `{ query, category, tag }`. |
| `page?` / `defaultPage?` / `onPageChange?` | `number` | `1` | Current page, 1-based. |
| `maxTags?` | `number` | `8` | Tag chips shown, most used first. |
| `labels?` | `Partial<BlogIndexLabels>` | locale | Override any string. |

### `PostCard` and `PostCover`

`PostCard` takes `post`, `href`, `onOpen`, `variant` (`default`, `featured`, `compact`) and `labels`. The title is a stretched link, so the whole card is one target with one tab stop. `PostCover` shows `post.cover` or, without one, art generated from the slug using the `--nq-tag-*` tokens.

### Model helpers

Pure functions, importable in Node: `filterPosts`, `sortByDate`, `paginate`, `pickFeatured`, `postCategoryCounts`, `tagCounts`, `relatedPosts`, `adjacentPosts`, `readingTime`, `extractToc`, `slugifyHeading`, `activeHeadingId`, `readingProgress`, `remarkCallouts`.

## Accessibility

- The search is a labelled field; the result count is announced in a polite live region.
- Filter chips are toggle buttons with `aria-pressed`.
- Each card is an `<article>` with one link; the cover is decorative.
- Pagination is a `nav` with `aria-current="page"`.

## RTL & i18n

Strings come from the provider locale (English, Arabic) and can be overridden with `labels`. Dates and numbers use Latin digits. Layout uses logical classes only.

## Styling

Container queries choose the columns (1, 2 or 3), so the block adapts to its parent and not the window. Covers use tokens, no hex.

## Do / Don't

- Do give every post a `readingMinutes`, or compute it from the body with `readingTime`.
- Do keep `filters` in the URL for shareable views.
- Don't pass a partial list and expect server paging: `BlogIndex` pages what it is given.

## Related

[`BlogPost`](../blog-post/README.md), [`Pagination`](../pagination/README.md), [`SectionHeader`](../section-header/README.md).

## Lab

Story `Components/Layout/Blog Index` and page story `Pages/Public/Blog`.
