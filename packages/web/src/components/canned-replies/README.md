---
name: canned-replies
title: CannedRepliesManager
category: crm
status: beta
summary: The library behind a reply composer's slash menu, with search, add, edit, duplicate and delete, variable buttons, a live preview and validation of duplicate shortcuts.
exports: [CannedRepliesLabels, CannedRepliesLabelOverrides, CannedReply, CannedReplyVariable, CannedReplyResult, CannedRepliesManagerProps, CannedRepliesManager]
related: [inbox, leads-inbox, email-templates, entity-list]
story: components-crm-canned-replies
keywords: [canned replies, snippets, saved replies, shortcuts, templates, macros, inbox]
---

# CannedRepliesManager

Saved answers people type again and again. Each has a shortcut typed after a slash in any composer, a title and a
body with `{{variables}}`. A `CannedReply` is structurally an Inbox `CannedSnippet`, so the same list feeds
`CannedPicker`.

## When to use

- Settings screen for a team's reply library.

## When not to use

- Email layouts: use [`EmailTemplates`](../email-templates/README.md).

## Import

```tsx
import { CannedRepliesManager } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<CannedRepliesManager
  replies={replies}
  onSave={async (reply) => save(reply)}
  onDelete={async (reply) => remove(reply.id)}
/>
```

## Anatomy

`EntityList` with shortcut, title, reply, uses and updated columns. A "New reply" button, row actions in a context
menu (edit, duplicate, delete), an editor dialog with variable buttons and preview, and a delete confirmation.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `replies` | `CannedReply[]` | `{ id, shortcut, title, body, uses?, updatedAt? }`. |
| `variables` | `CannedReplyVariable[]` | `{ key, label, sample }`. Default name, agent, company. |
| `onSave` | `(reply) => Promise<void or { error? }>` | Create or update. New replies have an id starting with `new-`. Omit for read only. |
| `onDelete` | `(reply) => Promise<...>` | Omit to hide delete. |
| `labels` | `CannedRepliesLabelOverrides` | Override any string. |

It also accepts the `EntityList` props that make sense (`loading`, `error`, `empty`, `view`, and so on).
Pure helpers: `normalizeCannedShortcut`, `validateCannedReply`, `cannedReplyVariables`, `nextFreeCannedShortcut`.

## Examples

Feed the same array to `CannedPicker` in a composer: `<CannedPicker snippets={replies} onPick={insert} />`.

## Accessibility

Fields have visible labels, errors use `role="alert"`, the preview is a live region, rows open actions from a context-click or the row menu.

## RTL & i18n

English and Arabic ship. Shortcuts are left-to-right, reply text uses `dir="auto"`.

## Styling & tokens

Semantic tokens only.

## Do / Don't

- Do keep shortcuts short and unique.
- Don't put private data in a reply everyone can insert.

## Related

- [`Inbox`](../inbox/README.md)
- [`LeadsInbox`](../leads-inbox/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-crm-canned-replies--docs
