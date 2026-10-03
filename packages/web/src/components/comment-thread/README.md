---
name: comment-thread
title: Comment Thread
category: collaboration
status: beta
summary: Threaded comments with one reply level, mention chips, badges for agents and clients, a review badge for pending comments and a sign-in prompt.
exports: [CommentThread, CommentThreadLabels, CommentInput, CommentBody, CommentComposerProps, CommentComposer, CommentThreadProps, buildThread, CommentAuthor, CommentAuthorKind, CommentMention, countComments, linkMentions, mentionIdFromHref, ThreadComment, ThreadNode]
related: [mention-textarea, issue-view, markdown, avatar]
story: components-collaboration-comment-thread
base-ui: [dropdown-menu, context-menu]
keywords: [comments, thread, replies, mentions, discussion, moderation]
---

# Comment Thread

A discussion under an issue, a document or a ticket. Every action awaits your callback, so a failed post keeps the text and shows the error.

## When to use

- Discussion on one record, with replies and @mentions.
- Comments from people, agents, clients and bots in one list.

## When not to use

- A live chat: use a chat component.
- A flat activity feed: use `Timeline`.

## Import

```tsx
import { CommentThread } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<CommentThread
  comments={comments}
  currentUser={me}
  suggestions={people}
  onSubmit={async ({ body, mentions, parentId }) => save(body, mentions, parentId)}
  onEdit={async (id, body) => edit(id, body)}
  onDelete={async (id) => remove(id)}
/>
```

## Anatomy

```
CommentThread          data-slot="comment-thread"
├─ header              title and count
├─ thread              a root comment and its replies (one level)
│  ├─ author, badge    agent, client or bot, and "Awaiting review"
│  ├─ body             Markdown, mention chips
│  └─ actions          Reply, Edit, Delete, Approve (button menu and context menu)
└─ composer            MentionTextarea, or a sign-in prompt
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `comments` | `ThreadComment[]` | required | Flat list in any order. `parentId` makes a reply. |
| `currentUser` | `CommentAuthor` | none | Their comments can be edited and deleted. |
| `signedIn` | `boolean` | `true` | False shows a sign-in prompt instead of the composer. |
| `suggestions` | `MentionOption[]` | `[]` | People offered by @. |
| `onSubmit` | `({ body, mentions, parentId? }) => Promise<...>` | none | Post or reply. Omit for a read-only thread. |
| `onEdit` / `onDelete` / `onApprove` | `(id, ...) => Promise<...>` | none | Omit to hide the action. |
| `canModerate` | `boolean` | `false` | Approve pending comments and edit or delete any comment. |
| `onSignIn` | `() => void` | none | The sign-in button. |
| `renderMention` | `(mention, chip) => ReactNode` | none | Wrap a chip, for example in a hover card. |
| `hideHeader` | `boolean` | `false` | Hide the title and count. |
| `labels` | `CommentThreadLabels` | en / ar | Every string. |

## Examples

- **Signed out**: `signedIn={false}` with `onSignIn`.
- **Moderation**: a comment with `pending: true` shows a badge; a moderator gets Approve.

## Accessibility

Each thread is a list; the composer is labelled; errors use `role="alert"`. Row actions open from a button menu or from a context-click, Shift+F10 or the Menu key.

## RTL & i18n

English and Arabic built in, `labels` overrides every string. Mixed-direction bodies use `dir="auto"`; times use the locale.

## Styling & tokens

Semantic tokens only. Reply indent uses logical padding.

## Do / Don't

- Do return `{ error }` from a callback instead of throwing.
- Do not nest replies deeper: a reply to a reply joins the same thread.

## Related

- [MentionTextarea](../mention-textarea/README.md)
- [IssueView](../issue-view/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-collaboration-comment-thread--docs
