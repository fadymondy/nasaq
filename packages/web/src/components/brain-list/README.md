---
name: brain-list
title: BrainList
category: ai-agents
status: beta
summary: Zekra-style list of AI brains as a table or cards with status, access, memory and source counts, members, tags and last activity, plus search, filters, bulk select and loading and empty states.
exports: [BrainListLabels, BrainStatus, BrainVisibility, BrainSummary, BrainCardProps, BrainCard, BrainListProps, BrainList]
related: [entity-list, project-list, copilot-chat, status]
story: components-ai-agents-brain-list
keywords: [brain, zekra, memory, knowledge base, ai, agents, list, cards, sources]
---

# BrainList

A shared-memory workspace list. Each brain shows its mark, name and description, whether it is ready, indexing,
paused or in error, who can reach it (private, team, public), how many memories, sources and chats it holds, its
members and when it was last used. It is `EntityList` with the columns, cards and filters set up, plus a
standalone `BrainCard`.

## When to use

- A page that lists the brains (knowledge bases, agents) of a workspace.
- `BrainCard` alone in a dashboard, a picker or a search result.

## When not to use

- Chatting with a brain: use [`CopilotChat`](../copilot-chat/README.md).
- Other records: build on [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { BrainCard, BrainList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { BrainList, type BrainSummary } from "@fadymondy/nasaq/web";

const brains: BrainSummary[] = [
  { id: "1", name: "Company handbook", description: "Policies and guides.", avatar: "📘", status: "ready", visibility: "team", memories: 1842, sources: 6, chats: 412 },
];

export function Brains() {
  return <BrainList brains={brains} onRowClick={(b) => open(b.id)} />;
}
```

## Anatomy

`BrainList` renders `EntityList`. Columns: name (mark, name, description), status, access, memories, sources, chats
(hidden by default), members, model (hidden by default), tags (hidden by default), last active. Facets: status,
access, tag. The card view renders `BrainCard`.

## API

`BrainListProps` extends the `EntityList` props (`view`, `defaultView`, `pageSize`, `selectable`, `toolbar`,
`bulkActions`, `rowActions`, `onRowClick`, `loading`, `error`, `onRetry`, `empty`, `defaultSort`, `className`).

| Prop | Type | Description |
| --- | --- | --- |
| `brains` | `BrainSummary[]` | `{ id, name, description?, avatar?, color?, status, visibility, memories, sources, chats?, model?, members?, tags?, lastActive? }`. |
| `label` | `string` | Accessible name. Default "Brains" / "العقول". |
| `labels` | `Partial<BrainListLabels>` | Override any string, including `statuses` and `visibilities`. |

`BrainCard` takes `brain`, `footer` (extra content such as buttons), `labels` and `className`.

`avatar` is an emoji or an image URL (`https://`, `/` or `data:`); without one a brain icon is shown. `color` (any CSS colour) tints the mark tile and its border.

## Examples

**Cards only, with an Open button**

```tsx
<BrainList brains={brains} defaultView="cards" views={["cards"]} />
```

**A card in a dashboard**

```tsx
<BrainCard brain={brain} footer={<Button size="sm">Open</Button>} />
```

## Accessibility

Inherited from `EntityList`. Status and access are text plus an icon, never colour alone. The brain mark is
decorative; the name is the accessible label of the row and the card.

## RTL & i18n

- English and Arabic strings ship, including status and access names. Counts and dates follow the locale.
- The model name is set left-to-right. Card counts and members flow from the inline start.

## Styling & tokens

- Status tones come from `Status`; the access chip is an outline `Badge`. Surfaces use `bg-secondary` and `border-border`.

## Do / Don't

- Do keep `memories` and `sources` as plain counts; the component formats them (compact on cards).
- Don't rely on `avatar` for meaning; the name always carries it.

## Related

- [`EntityList`](../entity-list/README.md)
- [`ProjectList`](../project-list/README.md)
- [`CopilotChat`](../copilot-chat/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-ai-agents-brain-list--docs
