---
name: landing-page-editor
title: LandingPageEditor
category: editors
status: beta
summary: Section-based landing page editor with an outline (add, reorder, hide, duplicate, delete), a live preview at desktop or phone width and forms for hero, features, FAQ, call to action and text sections plus page address, search fields and direction.
exports: [LandingPageEditorLabels, LandingPageResult, LandingPageEditorProps, LandingPageEditor]
related: [rich-text-editor, repeater, tabs, dropdown-menu]
story: components-editors-landing-page-editor
keywords: [landing page, page builder, cms, sections, hero, faq, seo, publish, preview]
---

# LandingPageEditor

Build a page from ready sections and watch it as it will publish. Three panes: the **Sections** outline, the live
**Preview** (desktop or phone width) and the **Edit** inspector, which switches between the selected section and
the **Page** settings. Below `lg` the panes become tabs.

## Bundle cost

Text sections use [`RichTextEditor`](../rich-text-editor/README.md) (Tiptap, roughly 150-200 KB minified). Lazy-load
the editor route if the page is not the main screen.

## When to use

- Marketing, launch or product pages that follow a fixed set of sections.

## When not to use

- Free-form canvas layout: sections are stacked in a column with a fixed design.
- Long articles: use [`RichTextEditor`](../rich-text-editor/README.md).

## Import

```tsx
import { LandingPageEditor, createSection, type LandingPage } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const [page, setPage] = useState<LandingPage>({
  title: "Launch",
  slug: "launch",
  seoTitle: "",
  seoDescription: "",
  dir: "ltr",
  status: "draft",
  sections: [createSection("hero", "en"), createSection("cta", "en")],
});

<LandingPageEditor value={page} onValueChange={setPage} onSave={(p) => api.saveDraft(p)} onPublish={(p) => api.publish(p)} />;
```

## Anatomy

- Outline: each section is a button; its menu moves it up or down, hides or shows it, duplicates and deletes it. "Add section" inserts after the selected one.
- Preview: renders the visible sections with Nasaq tokens and container queries, in the page's own direction. Clicking a section selects it.
- Inspector: fields for the section (features and FAQ items use `Repeater`, so they drag to reorder). The Page tab holds title, address (slug), search title and description with character counts, and direction.
- Header: status badge, unsaved indicator, Save draft, Publish. Publish stays disabled while the page has blockers, which are listed under the header.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `value`, `defaultValue`, `onValueChange` | `LandingPage` | Controlled or uncontrolled. |
| `onSave` | `(page) => Promise<void \| { error? }>` | Save as draft. Shows "Draft saved." when it resolves. |
| `onPublish` | `(page) => Promise<void \| { error? }>` | Receives the page with `status: "published"`. |
| `sectionTypes` | `LandingSectionType[]` | Section types offered by "Add section". Default all. |
| `labels` | `Partial<LandingPageEditorLabels>` | Override any string, including `types` and `blockers`. |

`LandingPage` is `{ title, slug, seoTitle, seoDescription, dir, sections, status }`. A section is
`{ id, type, visible, data }` with `type` one of `hero`, `features`, `faq`, `cta`, `text`. Helpers without React:
`createSection`, `moveSection`, `patchSection`, `duplicateSection`, `slugify`, `isValidSlug`, `isSafeHref`, `publishBlockers`.

## Publish blockers

No title, an invalid slug (lowercase letters, digits, hyphens), no visible section, or a button link that is not
`https://`, `http://`, `mailto:`, `tel:`, `/...` or `#...`.

## Accessibility

The outline is a list of real buttons with `aria-current` on the selected one; every section action is in a menu
with a labelled trigger, so everything the preview click does is reachable by keyboard. Hidden sections show an
icon with a text label. Errors are announced in an alert.

## RTL & i18n

- English and Arabic strings ship, including section names. The preview follows `page.dir`, independent of the app direction.
- Links and slugs are entered left-to-right. Text fields use `dir="auto"`.
- Preview buttons are not links; they never navigate.

## Styling & tokens

- Chrome and preview use Nasaq tokens (`bg-secondary`, `border-border`, `text-foreground`). The preview sizes with container queries (`@lg`), so the phone width really lays out as a phone.

## Do / Don't

- Do render the published page with your own components from the same `LandingPage` JSON.
- Don't publish user HTML from `text` sections without keeping it inside the editor's schema.

## Related

- [`RichTextEditor`](../rich-text-editor/README.md)
- [`Repeater`](../repeater/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-editors-landing-page-editor--docs
