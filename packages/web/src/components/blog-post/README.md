---
name: blog-post
title: Blog post
category: layout
status: beta
summary: "A post page: cover, byline, reading progress bar, sticky table of contents with scroll-spy, rich Markdown body with callouts and code, share, tags, author, previous and next, related posts and a comments slot."
exports: [BlogPostLabels, ReadingProgressProps, ReadingProgress, useActiveHeading, TableOfContentsProps, TableOfContents, CalloutProps, Callout, PostBodyProps, PostBody, BlogPostData, BlogPostProps, BlogPost]
related: [blog-index, markdown, code-block, share-action, timeline]
story: components-layout-blog-post
base-ui: []
keywords: [blog, post, article, toc, reading-progress, callout, markdown]
---

# Blog post

A full article page. It reads a `BlogPostData` (a summary plus a Markdown `body`) and renders the header with byline and share buttons, the cover, a reading progress bar, a sticky table of contents that follows the reader, the body, tags, the author card, previous and next links, related posts and a slot for comments.

## When to use

- The detail page of a blog or news article written in Markdown.

## When not to use

- Documentation with a sidebar tree: use the docs shell.
- A lone Markdown block: use [`Markdown`](../markdown/README.md) or `PostBody`.

## Import

```tsx
import { BlogPost } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<BlogPost
  post={{ ...summary, body: markdown }}
  posts={allPosts}
  url="https://example.com/blog/calm-interfaces"
  postHref={(p) => `/blog/${p.slug}`}
  comments={<CommentThread />}
/>
```

`posts` is used to derive related, previous and next posts.

## Anatomy

```
BlogPost                     data-slot="blog-post"
├─ ReadingProgress           sticky role="progressbar", fills from the inline start
├─ header                    back link, category, title, byline, date, reading time, share
├─ PostCover
├─ TableOfContents           sticky aside on wide containers, a Collapsible above the body on narrow ones
├─ PostBody                  Markdown with heading ids, code blocks and Callouts
├─ tags, author card
├─ previous / next
├─ related PostCards
└─ comments slot
```

## API

### `BlogPost`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `post` | `BlogPostData` | required | Summary fields plus `body` and optional `updated`. |
| `posts?` | `BlogPostSummary[]` | none | Used to derive related, previous and next. |
| `related?` / `previous?` / `next?` | posts | derived | Explicit overrides. |
| `url?` | `string` | none | Canonical URL for sharing. |
| `postHref?` / `tagHref?` / `backHref?` | functions / string | none | Links. |
| `toc?` | `boolean` | `true` | Show the table of contents. |
| `progress?` | `boolean` | `true` | Show the reading progress bar. |
| `scrollOffset?` | `number` | `96` | Pixels reserved for a sticky header when spying and jumping. |
| `comments?` / `actions?` | `ReactNode` | none | Slots. |
| `labels?` / `shareLabels?` / `indexLabels?` | partial labels | locale | Override strings. |

### Parts

- `ReadingProgress` (`target` ref, `label`), `useActiveHeading(ids, rootRef, offset)`, `TableOfContents` (`items`, `activeId`, `title`), `Callout` (`kind`, `title`), `PostBody` (`markdown`).
- Callouts are written as `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` and so on, on the first line of a blockquote.
- TOC ids are made from the heading text by `slugifyHeading` (Arabic-safe, unique). `PostBody` and `extractToc` agree by line number, so links never point at the wrong heading.

## Accessibility

- The progress bar is `role="progressbar"` with `aria-valuenow`, named "Reading progress".
- The table of contents is a `nav` with a label; the heading in view has `aria-current="location"`.
- Callouts are `<aside>` with a visible title, so the type is never told by color alone.
- Code blocks are focusable when they scroll.

## RTL & i18n

Progress fills from the inline start, the TOC sits at the inline end, arrows mirror, code stays left to right. Dates and numbers use Latin digits.

## Styling

Body width is capped near 70 characters. Callout colors are tokens.

## Do / Don't

- Do put `##` and `###` headings in the body: they build the TOC.
- Don't put headings in code fences expecting a TOC entry; fences are skipped.
- Don't use `#` inside the body; the page title is the only h1.

## Related

[`BlogIndex`](../blog-index/README.md), [`Markdown`](../markdown/README.md), [`CodeBlock`](../code-block/README.md), [`ShareAction`](../share-action/README.md).

## Lab

Story `Components/Layout/Blog Post` and page story `Pages/Public/Blog Post`.
