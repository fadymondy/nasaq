---
name: api-reference
title: API reference
category: developer-tools
status: beta
summary: A reference page for API endpoints or MCP tools with scope, minimum role, an arguments table, an example call and result, and a card catalog of all tools.
exports: [ApiReference, ApiToolDetail, ApiToolCatalog, ApiTool, ApiArg, ApiExample, ApiReferenceLabels, ApiReferenceProps, ApiToolDetailProps, ApiToolCatalogProps]
related: [code-block, table, badge, chip-group]
story: components-developer-tools-api-reference
base-ui: []
keywords: [api, mcp, tool, reference, docs, scope, role, arguments, example, catalog, endpoint]
---

# API reference

A docs page for the things a caller can invoke. A searchable list sits beside the selected tool: its name, scope, minimum role, access level, an arguments table and an example call with its result. A second view shows every tool as a card, grouped by category. It renders the data you pass; generate it from your schema.

## When to use

- Documenting an MCP server's tools or a REST API inside your product.

## When not to use

- Long prose docs: use a docs layout with markdown.
- Trying calls live: this page only shows examples.

## Import

```tsx
import { ApiReference } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
<ApiReference
  tools={[
    {
      id: "create_issue",
      name: "create_issue",
      summary: "Create an issue in a project.",
      category: "Issues",
      scope: "issues:write",
      minRole: "Member",
      access: "write",
      args: [{ name: "title", type: "string", required: true, description: "Short title." }],
      examples: [{ call: '{ "title": "Fix login" }', result: '{ "id": "MH-1" }' }],
    },
  ]}
/>
```

## Anatomy

```
ApiReference                data-slot="api-reference"
├─ toolbar                  search, category chips, access filter, Reference/Catalog switch
├─ list                     tools grouped by category
└─ ApiToolDetail            name, badges, scope, min role, args Table, examples in CodeBlock
ApiToolCatalog              card grid of tools
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tools` | `ApiTool[]` | required | `{ id, name, summary, description?, category?, scope, minRole, access?, args?, returns?, examples?, deprecated?, since? }`. |
| `selectedId?` / `onSelectedChange?` | `string` / `(id) => void` | first tool | Controlled selection. |
| `view?` / `defaultView?` / `onViewChange?` | `"reference" \| "catalog"` | `"reference"` | Which view shows. |
| `labels?` | `Partial<ApiReferenceLabels>` | en/ar | Override any string. |

`ApiToolDetail` takes `tool`; `ApiToolCatalog` takes `tools` and `onSelect?`. `ApiArg` is `{ name, type, required?, description?, default?, values? }`; `ApiExample` is `{ title?, call, result, callLanguage?, resultLanguage? }`.

## Examples

### Catalog first

```tsx
<ApiReference tools={tools} defaultView="catalog" />
```

## Accessibility

- The list is a labelled navigation of buttons with `aria-current` on the open tool. The switch and filters are named groups.
- Access level is written out (Read, Write, Destructive), not colour alone. Required arguments say "required".
- On small screens the list and detail swap with a Back button; focus moves to the heading.

## RTL & i18n

- English and Arabic built in. Tool names, scopes, types, defaults and code stay left-to-right in `<bdi dir="ltr">`; the code blocks are always left-to-right.
- Search folds Arabic letter variants. Localise `category` and `minRole` in your data.

## Styling & tokens

- `bg-card`, `border-border`, `rounded-card`; code uses the `CodeBlock` tokens. No raw hex.
- Target `[data-slot=api-reference]`.

## Do / Don't

- **Do** give every example both a call and a result.
- **Do** mark destructive tools so the badge warns before use.
- **Don't** put secrets in examples.

## Related

- [CodeBlock](../code-block/README.md) · [Table](../table/README.md) · [Badge](../badge/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-developer-tools-api-reference--docs
