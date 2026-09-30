---
name: profile-card
title: ProfileCard
category: account
status: beta
summary: "A person's account card (avatar, name, role, presence, local time, team, quick actions) that opens from any avatar, name or mention on hover, focus or tap, plus the mention chip and presence dot it is built from."
exports: [ProfileCardLabels, PersonProfile, PresenceDotProps, PresenceDot, PresenceAvatar, ProfileCardProps, ProfileCard, ProfileHoverCardProps, ProfileHoverCard, MentionChipProps, MentionChip, MentionTextProps, MentionText]
related: [hover-card, mention-textarea, avatar, user-menu, members-manager]
story: components-account-profile-card
base-ui: [preview-card]
keywords: [profile card, hover card, account card, mention, presence, local time, avatar, people, user card]
---

# ProfileCard

One card for a person, used everywhere a person shows up. `ProfileCard` is the card itself. `ProfileHoverCard` wraps any
avatar, name or `@mention` so the card opens from it. `MentionChip` and `MentionText` render `@name` in saved text. `UserMenu`
and `MembersManager` reuse the same card, so a person looks the same in the menu, in lists and in comments.

## When to use

- A person's name or avatar appears in a list, comment, activity feed or table and you want a peek without leaving.
- Showing saved text that contains mentions.
- A presence indicator next to an avatar.

## When not to use

- A full profile page: link to it with `onViewProfile`.
- A team or group: `MentionChip` shows them with an icon and no card.

## Import

```tsx
import { MentionChip, MentionText, PresenceAvatar, ProfileCard, ProfileHoverCard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Avatar, ProfileHoverCard, type PersonProfile } from "@fadymondy/nasaq/web";

const sara: PersonProfile = { id: "u1", name: "Sara Nasser", handle: "sara", role: "Design lead", presence: "online", timeZone: "Asia/Riyadh", teams: ["Design"] };

export function Author() {
  return (
    <ProfileHoverCard person={sara} onMessage={(p) => openChat(p.id)} onViewProfile={(p) => go(`/people/${p.id}`)}>
      <a href="/people/u1">Sara Nasser</a>
    </ProfileHoverCard>
  );
}

declare function openChat(id: string): void;
declare function go(path: string): void;
```

## Anatomy

```
ProfileHoverCard                      trigger + card
└─ ProfileCard        data-slot="profile-card"
   ├─ PresenceAvatar  avatar with a PresenceDot
   ├─ name, @handle, role, status text
   ├─ local time and how far apart you are
   ├─ team badges
   └─ Message · Mention · View profile   (only the ones you pass)
MentionChip / MentionText             inline @name
```

## API

**PersonProfile**: `{ id, name, handle?, email?, avatar?, role?, presence?, statusText?, timeZone?, teams?, location? }`.
`presence` is `online`, `away`, `busy` or `offline`.

**ProfileCard**: `div` props plus `person`, `viewerTimeZone` (default the browser's), `now` (freeze the clock), `onMessage`,
`onMention`, `onViewProfile` (each adds its button), `children` (extra content) and `labels`.

**ProfileHoverCard**: everything above plus `children` (the trigger), `delay` (300), `closeDelay` (150), `side`, `align`, `className`.

**PresenceDot / PresenceAvatar**: `presence`, `decorative`, `labels`. An avatar plus a dot, sized with `size`.

**MentionChip**: `name`, `kind` (`person`, `team`, `group`), `person` (opens the card), the action callbacks.

**MentionText**: `text`, `mentions` (from `MentionTextarea`), `resolve(id)` giving `{ person?, kind? }`, the action callbacks.

Pure helpers (`isTimeZone`, `offsetFrom`, `localTimeLabel`, `isNightIn`, `describeOffset`, `presenceRank`) are exported too.

## Examples

**Saved comment with mention chips**

```tsx
import { MentionText, type PersonProfile } from "@fadymondy/nasaq/web";

declare const people: Record<string, PersonProfile>;

export const Comment = () => (
  <MentionText
    text="Thanks @Sara, looping in @Design"
    mentions={[
      { id: "u1", name: "Sara", start: 7, end: 12 },
      { id: "t1", name: "Design", start: 24, end: 31 },
    ]}
    resolve={(id) => (id === "t1" ? { kind: "team" } : { person: people[id] })}
  />
);
```

## Accessibility

- Opens on hover, keyboard focus and tap. Escape closes it. The trigger stays a real link or button.
- Presence is never colour alone: each state has a different shape (offline is a hollow ring) and text for screen readers.
- Local time uses Latin digits so it reads the same in every locale.

## RTL & i18n

- English and Arabic are built in and follow the Nasaq locale; pass `labels` to override.
- The card mirrors with logical spacing. Emails and handles stay left to right inside `<bdi>`.

## Styling & tokens

- Tokens only. Built from `HoverCard`, `Avatar`, `Badge` and `Button`.

## Do / Don't

- Do pass the viewer's time zone when you know it, for an accurate "3 h ahead".
- Do give the trigger a real link when the person has a profile page.
- Don't show a card for a team: use the chip's icon.
- Don't rely on presence colour alone in your own UI.

## Related

- [`hover-card`](../hover-card/README.md)
- [`mention-textarea`](../mention-textarea/README.md)
- [`user-menu`](../user-menu/README.md)
- [`members-manager`](../members-manager/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-account-profile-card--docs
