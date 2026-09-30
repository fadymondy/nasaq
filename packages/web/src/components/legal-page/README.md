---
name: legal-page
title: LegalPage
category: layout
status: beta
summary: A legal document page with a switcher between documents, the updated date, a draft notice, numbered sections with copyable anchors and a section rail.
exports: [LegalPageLabels, LegalSection, LegalDocument, LegalPageProps, LegalPage]
related: [docs-shell, blog-post, markdown, cookie-consent]
story: components-layout-legal-page
base-ui: []
keywords: [legal, terms, privacy, policy, anchors, sections, updated, draft, cookies]
---

# LegalPage

Terms of service, privacy policy, cookie policy: long documents people search for one clause in. The page has a switcher between the documents, the date it was last updated, an optional draft notice, numbered sections whose headings are `#anchors` with a copy-link button, and an "On this page" rail. The text sits in one readable column of about 68 characters.

## When to use

- Public legal pages of a product.
- Any long policy or agreement where clause links get shared.

## When not to use

- Product documentation: use [docs-shell](../docs-shell/README.md).
- A blog article: use [blog-post](../blog-post/README.md).
- The cookie banner: use [cookie-consent](../cookie-consent/README.md).

## Import

```tsx
import { LegalPage } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { LegalPage } from "@fadymondy/nasaq/web";

export function Terms() {
  return (
    <LegalPage
      document={{
        id: "terms",
        title: "Terms of service",
        updated: "2026-09-01",
        sections: [
          { title: "Using the service", body: "You agree to use it lawfully." },
          { title: "Payments", body: "Fees are billed monthly." },
        ],
      }}
    />
  );
}
```

## Anatomy

```
LegalPage             data-slot="legal-page"
├─ switcher           <nav> of documents (two or more)
├─ header             title, summary, updated / effective / version, draft Alert
├─ sections           data-slot="legal-section"  number, h2 with id, copy-link button, Markdown body
├─ footer             your contact details (optional)
└─ rail               TableOfContents (from the lg breakpoint)
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `document` | `LegalDocument` | required | `{ id, title, summary?, updated, effective?, version?, draft?, sections }`. |
| `documents` | `{ id, title }[]` | none | The site's documents. The switcher shows for two or more. |
| `onSelectDocument` | `(id) => void` | none | A document was picked. Navigate, then pass the new `document`. |
| `onCopyLink` | `(url) => void` | none | After a section link was copied. |
| `footer` | `ReactNode` | none | Contact details under the last section. |
| `scrollOffset` | `number` | `96` | Space headings keep from the top when scrolled to. |
| `labels` | `LegalPageLabels` | English or Arabic | String overrides. |

`LegalSection` is `{ id?, title, body }` where `body` is Markdown. Give sections an explicit `id` once a document is published so shared links keep working when titles change. Without one the id is a slug of the title (Arabic letters are kept); repeats get `-2`, `-3`.

### Helpers

`resolveLegalSections`, `legalHashTarget`, `legalSectionUrl`.

## Examples

```tsx
<LegalPage document={terms} documents={[{ id: "terms", title: "Terms" }, { id: "privacy", title: "Privacy" }]} onSelectDocument={goTo} />
```

```tsx
<LegalPage document={{ ...privacy, draft: true, version: "2.0-rc1" }} footer={<a href="mailto:legal@example.com">legal@example.com</a>} />
```

A link such as `/terms#payments` opens scrolled to that section.

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Switcher, copy-link buttons, links in the text, the rail. |
| Enter, Space | Pick a document, copy a section link. |

- Every section is a `section` labelled by its heading. The copy-link button names the section, and the result is announced in a polite status.
- The draft notice is an alert with text and an icon, not colour alone.
- The current document in the switcher has `aria-current="page"`.

## RTL & i18n

- The page mirrors: rail on the end side, numbers before titles on the reading start.
- Titles and text use `dir="auto"`; dates use the locale with Latin digits by default.
- Built-in strings are English and Arabic. Provide the document text in the reader's language.

## Styling & tokens

Uses the typography roles and `--nq-*` border, selected and focus tokens. Target `data-slot="legal-page"` and `legal-section`.

## Do / Don't

- Do show the date the document changed and, when it matters, the date it takes effect.
- Do keep section ids stable.
- Don't put the whole document in one section. Anchors are only useful when sections are small.
- Don't present a draft as final. Set `draft`.

## Related

- [docs-shell](../docs-shell/README.md), [blog-post](../blog-post/README.md), [markdown](../markdown/README.md), [cookie-consent](../cookie-consent/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-layout-legal-page--docs
