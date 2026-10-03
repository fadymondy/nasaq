---
name: docs-shell
title: DocsShell
category: layout
status: beta
summary: The documentation layout with a tree sidebar, breadcrumb, copy page, callouts, an on this page rail that follows the reader and previous and next links.
exports: [DocsShellLabels, DocsPageData, DocsShellProps, DocsShell]
related: [blog-post, tree-view, markdown, legal-page]
story: components-layout-docs-shell
base-ui: [dialog]
keywords: [docs, documentation, sidebar, table of contents, toc, copy page, callout, prev next, breadcrumb]
---

# DocsShell

The frame of a documentation site. A top bar, a tree of pages on the side (a drawer on phones) with a filter, and the page itself: breadcrumb, title, a "Copy page" button that puts the page on the clipboard as Markdown, the body with callouts, an "On this page" rail that highlights the heading you are reading, and previous and next links. It shows the page you pass and calls `onNavigate`; routing is yours.

The body is rendered by the blog's `PostBody`, and the rail is the blog's `TableOfContents` with `useActiveHeading`.

## When to use

- Product documentation, guides and API references written in Markdown.
- Any multi-page reading experience with a tree of pages.

## When not to use

- A single article: use [blog-post](../blog-post/README.md).
- App navigation: use `SidebarLayout` or `AppShell`.
- Terms and privacy pages: use [legal-page](../legal-page/README.md).

## Import

```tsx
import { DocsShell } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { useState } from "react";
import { DocsShell } from "@fadymondy/nasaq/web";

const nav = [
  { id: "intro", title: "Introduction" },
  { id: "guides", title: "Guides", children: [{ id: "install", title: "Installation" }] },
];
const pages = {
  intro: { id: "intro", title: "Introduction", markdown: "## Why\n\nText.\n\n> [!TIP]\n> Start small." },
  install: { id: "install", title: "Installation", markdown: "## Install\n\nRun `pnpm add`." },
};

export function Docs() {
  const [id, setId] = useState<keyof typeof pages>("intro");
  return <DocsShell nav={nav} page={pages[id]} onNavigate={(next) => setId(next as keyof typeof pages)} brand="Nasaq Docs" />;
}
```

## Anatomy

```
DocsShell             data-slot="docs-shell"
├─ top bar            brand, menu button (phones), actions
├─ sidebar            data-slot="docs-sidebar"  filter + TreeView (Sheet on phones)
├─ article
│   ├─ Breadcrumb
│   ├─ title + CopyButton
│   ├─ "On this page" (collapsed, below the xl breakpoint)
│   ├─ body           data-slot="docs-body"  PostBody
│   ├─ updated date and edit link
│   └─ previous / next
└─ rail               data-slot="docs-toc"  TableOfContents
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `nav` | `DocsNavNode[]` | required | `{ id, title, children?, badge? }`. Nodes with children are sections, leaves are pages. |
| `page` | `DocsPageData` | required | `{ id, title, description?, markdown, updated?, editHref? }`. Its `id` is the active item. |
| `onNavigate` | `(id) => void` | required | A page was picked in the sidebar or the pager. |
| `brand`, `actions` | `ReactNode` | none | Start and end of the top bar. |
| `searchable` | `boolean` | `true` | The filter box above the tree. |
| `copyPage` | `boolean` | `true` | The "Copy page" button. |
| `renderBody` | `(page) => ReactNode` | `PostBody` | Replace the body, for example with `RichMarkdown`. |
| `sidebarHeader` | `ReactNode` | none | Above the filter, such as a version picker. |
| `scrollOffset` | `number` | `96` | Space headings keep from the top when scrolled to. |
| `labels` | `DocsShellLabels` | English or Arabic | String overrides. |

### Helpers

Pure and exported: `docsPages`, `docsTrail`, `docsAncestorIds`, `docsPrevNext`, `filterDocsTree`, `docsSectionIds`, `docsPageMarkdown`.

## Examples

```tsx
<DocsShell nav={nav} page={page} onNavigate={go} renderBody={(p) => <RichMarkdown>{p.markdown}</RichMarkdown>} />
```

```tsx
<DocsShell nav={nav} page={{ ...page, updated: "2026-09-12", editHref: "https://github.com/acme/docs/edit/main/x.md" }} onNavigate={go} actions={<ThemeSwitch />} />
```

Callouts are written in the Markdown as `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` or `> [!CAUTION]`.

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Move in the tree. Left and Right expand and collapse (swapped in RTL). |
| Enter, Space | Open the page or toggle a section. |
| Type a letter | Jump to the next page starting with it. |
| Tab | Sidebar, page content, rail. |

- The sidebar is a `nav` with a `tree`; the current page is selected. The rail marks the current heading with `aria-current="location"`.
- The drawer on phones is a modal with a title, and closes after a page is chosen.
- Filtering shows a message when nothing matches.

## RTL & i18n

- The sidebar sits on the reading start side and the rail on the end side; arrows and the tree keys follow the direction.
- Titles and headings use `dir="auto"`. Code blocks stay left-to-right.
- Previous and next chevrons mirror.

## Styling & tokens

Uses the surface, border, selected and focus tokens. Target `data-slot` of the parts. The sidebar shows from the `lg` breakpoint and the rail from `xl`.

## Do / Don't

- Do give every page a stable `id` and keep the tree shallow (two or three levels).
- Do write `##` and `###` headings so the rail has something to show.
- Don't nest the shell inside another sticky header. It manages its own.

## Related

- [blog-post](../blog-post/README.md), [tree-view](../tree-view/README.md), [markdown](../markdown/README.md), [legal-page](../legal-page/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-layout-docs-shell--docs
