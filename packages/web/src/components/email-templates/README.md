---
name: email-templates
title: EmailTemplates
category: editors
status: beta
summary: Email template gallery with rendered thumbnails, an editor (name, category, subject, preview text, rich text body, variables) and a sandboxed live preview at desktop or phone width with test send.
exports: [EmailTemplatesLabels, EmailTemplateCategory, EmailTemplateStatus, EmailTemplateResult, EmailTemplate, blankEmailTemplate, EmailTemplatePreviewProps, EmailTemplatePreview, EmailTemplateGalleryProps, EmailTemplateGallery, EmailTemplateEditorProps, EmailTemplateEditor, EmailTemplatesProps, EmailTemplates, EmailDirection, EmailVariable, escapeHtml, fillVariables, findVariables, renderEmailDocument, unknownVariables]
related: [rich-text-editor, dialog, tabs, copy-button]
story: components-editors-email-templates
keywords: [email, template, newsletter, transactional, preview, variables, merge tags, gallery]
---

# EmailTemplates

Design the messages your app sends. `EmailTemplates` shows a searchable gallery of template cards (each with a
thumbnail of the rendered email); opening one shows the editor with a live preview beside it. The pieces are
exported on their own: `EmailTemplateGallery`, `EmailTemplateEditor` and `EmailTemplatePreview`.

## Bundle cost

The editor uses [`RichTextEditor`](../rich-text-editor/README.md) (Tiptap, roughly 150-200 KB minified). Lazy-load
`EmailTemplateEditor` where it matters. The gallery and preview do not load it.

## When to use

- A settings screen for transactional, marketing and notification emails.
- Showing one template read-only: `EmailTemplatePreview`.

## When not to use

- Sending mail or storing templates: this is presentational. You own the async callbacks.
- Drag-and-drop layout builders: the body is a rich text document, not a block canvas.

## Import

```tsx
import { EmailTemplates, type EmailTemplate, type EmailVariable } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const variables: EmailVariable[] = [{ key: "first_name", label: "First name", sample: "Sara" }];

<EmailTemplates
  templates={templates}
  variables={variables}
  sender={{ name: "The team", email: "hello@example.com" }}
  onSave={async (t) => {
    await api.saveTemplate(t);
  }}
  onSendTest={async (t, email) => api.sendTest(t.id, email)}
/>;
```

## Anatomy

- Gallery: search, category tabs, cards (thumbnail, name, subject, status, category, updated), duplicate and delete (delete asks first).
- Editor: name, category, subject, preview text, body, direction, variable list with copy buttons, unknown-variable warning, Save (enabled when changed), Send test.
- Preview: sender, recipient and subject header, then the email in a sandboxed frame. Desktop and mobile widths.

## API

`EmailTemplate` is `{ id, name, category, status, subject, preheader?, body (HTML), dir?, footer?, updatedAt? }`;
`category` is `"welcome" | "transactional" | "marketing" | "notification"`, `status` is `"draft" | "active"`.

| Prop (`EmailTemplates`) | Type | Description |
| --- | --- | --- |
| `templates` | `EmailTemplate[]` | The list. Controlled: update it after each callback resolves. |
| `variables` | `EmailVariable[]` | `{ key, label, sample }`. `{{key}}` in the subject, preview text, body and footer is replaced with `sample` in previews. |
| `defaultSelectedId` | `string` | Open this template in the editor first. |
| `sender`, `recipient` | | Shown in the preview header; `recipient` is also the default test address. |
| `onSave` | `(t) => Promise<void \| { error? }>` | Also called for a new template (from "New template") with a temporary id. Add it to `templates` when it resolves. |
| `onDuplicate`, `onDelete` | `(t) => Promise<void \| { error? }>` | Buttons appear only when given. |
| `onSendTest` | `(t, email) => Promise<void \| { error? }>` | Shows "Send test". |
| `labels` | `Partial<EmailTemplatesLabels>` | Override any string. |

Pure helpers with no React: `fillVariables`, `findVariables`, `unknownVariables`, `escapeHtml`, `renderEmailDocument`.

## Safety

Previews render in an `<iframe sandbox="">`, so no script from a body can run. Variable values are HTML-escaped
before they are substituted. The body editor only produces Tiptap's own schema (links limited to http, https, mailto, tel).

## Accessibility

Each card is one button named by the template name. Thumbnails are decorative (`aria-hidden`, not focusable). The
preview frame has a title. Delete uses a confirmation dialog. Save, test and error messages appear in an alert.

## RTL & i18n

- English and Arabic strings ship. Each template has its own `dir`, so an Arabic email previews right to left even in an English app.
- Variable keys, sender addresses and the test address are set left-to-right.
- The back arrow mirrors.

## Styling & tokens

- App chrome uses Nasaq tokens. The email document itself is paper-white with fixed `rgb()` colours, because email clients do not follow the app theme.

## Do / Don't

- Do provide sample values for every variable so the preview reads like a real email.
- Don't put secrets in a template; previews and thumbnails render the body in the browser.

## Related

- [`RichTextEditor`](../rich-text-editor/README.md)
- [`CopyButton`](../copy-button/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-editors-email-templates--docs
