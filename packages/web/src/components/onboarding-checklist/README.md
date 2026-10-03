---
name: onboarding-checklist
title: OnboardingChecklist
category: onboarding
status: beta
summary: "The in-app Get started card: x of y done with a progress bar, the next step highlighted, one action per open item and a dismiss."
exports: [OnboardingChecklistLabels, OnboardingChecklistItem, OnboardingChecklistProps, OnboardingChecklist]
related: [onboarding-flow, checklist, progress, states]
story: components-onboarding-pages-checklist
base-ui: []
keywords: [get started, onboarding checklist, setup progress, first run, getting started card, empty state]
---

# OnboardingChecklist

A card that lives in the app after the flow and shows what is left: "2 of 5 done". The first open item is highlighted as
the next thing, each open item has one action, and finishing everything turns the card into a small celebration you can dismiss.
It only reports clicks: you own which items are done. For a task list people edit, use `Checklist`.

## When to use

- A dashboard card that nudges the last setup steps.
- Steps skipped in the onboarding flow.

## When not to use

- Editable to-do lists: [`checklist`](../checklist/README.md).

## Import

```tsx
import { OnboardingChecklist } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { OnboardingChecklist } from "@fadymondy/nasaq/web";

export function GetStarted() {
  return (
    <OnboardingChecklist
      items={[
        { id: "profile", title: "Complete your profile", done: true },
        { id: "invite", title: "Invite a teammate", description: "Work is better together.", actionLabel: "Invite", onAction: () => openInvite() },
        { id: "connect", title: "Connect GitHub", actionLabel: "Connect", onAction: () => connect() },
      ]}
      onDismiss={() => hideCard()}
    />
  );
}

declare function openInvite(): void;
declare function connect(): void;
declare function hideCard(): void;
```

## Anatomy

```
OnboardingChecklist            data-slot="onboarding-checklist"
├─ header: title, "x of y done", dismiss
├─ Progress
└─ items: state mark, title, description, action   (data-next on the first open one)
```

## API

`div` props (except `title`) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `OnboardingChecklistItem[]` | required | `{ id, title, description?, done?, actionLabel?, onAction?, icon? }`. |
| `title` | `ReactNode` | "Get started" | |
| `onDismiss` | `() => void` | | Shows the close button. |
| `onComplete` | `() => void` | | Called once when the last item is done. |
| `labels` | | | |

## Examples

**First-run empty state**

Pair the card with `EmptyState` on pages that have no data yet, and put the same action in both.

```tsx
import { Button, EmptyState } from "@fadymondy/nasaq/web";

export const Empty = () => <EmptyState title="No projects yet" description="Create your first project to see it here." actions={<Button variant="primary">New project</Button>} />;
```

## Accessibility

- It is a labelled region. Progress is a real progress bar with the "x of y" text as its name.
- Done and next are also stated to screen readers, not only by colour or icon.

## RTL & i18n

- English and Arabic built in; the action arrow mirrors.

## Styling & tokens

- Tokens only. Uses `Card`, `Progress` and `Button`.

## Do / Don't

- Do keep it to five items or fewer.
- Do give every open item an action.
- Don't show it forever: offer `onDismiss`.

## Related

- [`onboarding-flow`](../onboarding-flow/README.md)
- [`progress`](../progress/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-onboarding-pages-checklist--docs
