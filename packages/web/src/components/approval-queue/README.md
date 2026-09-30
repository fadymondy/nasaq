---
name: approval-queue
title: ApprovalQueue
category: workflow
status: beta
summary: A review queue of things waiting for a person to approve, reject with a reason, or convert to a task. It handles expiry, review criteria and redacted arguments.
exports: [ApprovalQueue, ApprovalQueueProps, ApprovalQueueLabels, ApprovalItem, ApprovalKind, ApprovalStatus, ApprovalCriterion, ApprovalArgValue, ApprovalDate, approvalStatus, isExpired, unmetCriteria, canApprove, canDecide, sortQueue, redactArgs, pendingCount, REDACTED_MASK]
related: [kill-switch, checklist, alert-dialog, context-menu]
story: components-workflow-approval-queue
base-ui: [tabs, dialog, alert-dialog, context-menu]
keywords: [approval, review, queue, moderation, request, reject, approve, expiry, human in the loop]
---

# ApprovalQueue

The inbox for decisions. An automation asks before it acts, a reviewer checks a page against criteria, a
moderator reads a comment, a customer files a request. Each item is one card with the decision buttons on it.

## When to use

- An automation or agent needs a human yes before a risky action.
- Content or requests wait for review.

## When not to use

- A plain task list: use `Checklist` or a board.
- Confirming your own action: use `AlertDialog`.

## Import

```tsx
import { ApprovalQueue } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<ApprovalQueue
  items={items}
  onApprove={async (id) => api.approve(id)}
  onReject={async (id, reason) => api.reject(id, reason)}
  onConvert={async (id) => api.toTask(id)}
/>
```

## Anatomy

```
ApprovalQueue        data-slot="approval-queue"
├─ header            title + pending count
├─ Tabs              Pending / Decided / All
└─ item cards        kind badge, title, requester, expiry, status
   ├─ args grid      key and value, redacted keys masked
   ├─ criteria       pass / fail list of a review
   ├─ quote          moderated content
   └─ actions        Approve, Reject (reason dialog), Convert; also a context menu
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `ApprovalItem[]` | required | The queue. A pending item past `expiresAt` reads as expired and is locked. |
| `onApprove` | `(id) => Promise<void \| { error? }>` | required | Approve. An `error` shows inline on the card. |
| `onReject` | `(id, reason) => Promise<...>` | required | Reject. The reason is required. |
| `onConvert` | `(id) => Promise<...>` | none | Turn the item into a task. Omit to hide it. |
| `convertLabel` | `string` | "Convert" | Label of the convert action. |
| `defaultFilter` | `"pending" \| "decided" \| "all"` | `"pending"` | First tab. |
| `now` | `number` | `Date.now()` | Clock override for stories and tests. |
| `title` | `ReactNode` | by locale | Heading. |
| `labels` | `ApprovalQueueLabels` | en / ar | Every string. |

## Examples

- **Redaction**: `redact: ["smtp_password"]` on an item masks that value; the real value never reaches the DOM.
- **Review**: `criteria` with an unmet entry disables Approve, and Reject stays available.

## Accessibility

Tabs follow the tabs pattern. The reject dialog traps focus and requires a reason before it enables its
button. Status is a text badge, not colour alone. Right-click, Shift+F10 or the Menu key opens the same actions
as the buttons.

## RTL & i18n

English and Arabic built in. Keys, ids and emails inside args stay left-to-right. Times use `DateTime`.

## Styling & tokens

Cards use `Card` and `Badge`; tones come from `--nq-*` status tokens. Cards fill their grid cell.

## Do / Don't

- Do show what the action will do (args) before asking for approval.
- Do not put secrets in args without listing them in `redact`.

## Related

- [KillSwitch](../kill-switch/README.md)
- [Checklist](../checklist/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-workflow-approval-queue--docs
