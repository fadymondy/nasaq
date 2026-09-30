---
name: gamification
title: Gamification
category: data-display
status: beta
summary: A kit for progress and rewards. Leaderboard with period tabs, podium, movement arrows and your rank pinned, a badge grid with earned, in-progress and locked states and rarity, achievement card, XP and level progress, streak counter with calendar, reward cards and an unlock toast that respects reduced motion.
exports: [GamificationLabels, RarityBadge, Achievement, AchievementMedal, BadgeGrid, AchievementCard, XpProgress, StreakCounter, StreakCalendar, StreakCard, LeaderboardEntry, LeaderboardPeriod, Leaderboard, RewardStatus, RewardCard, AchievementUnlockToast, achievementStatus, achievementPercent, filterAchievements, achievementCounts, rankEntries, movement, splitPodium, pinnedEntry, xpForLevel, levelProgress, streakStats, monthGrid, RARITIES, rarityRank, RarityBadgeProps, AchievementMedalProps, BadgeGridProps, AchievementCardProps, XpProgressProps, StreakCounterProps, StreakCalendarProps, StreakCardProps, LeaderboardProps, RewardCardProps, AchievementUnlockToastProps, dayKey, toDayKey, AchievementFilter, AchievementLike, AchievementStatus, CalendarCell, LeaderboardEntryLike, LevelCurve, LevelProgress, MovementDirection, Ranked, Rarity, StreakStats]
related: [progress, badge, card, tabs, avatar, toast]
story: components-data-display-gamification
base-ui: [tabs, progress]
keywords: [gamification, leaderboard, badges, achievements, xp, level, streak, rewards, collectibles, podium, rarity]
---

# Gamification

Generic parts for showing progress and rewards. Nothing product specific is baked in: you provide the achievements,
scores and days, and the kit lays them out, ranks them and works out levels and streaks.

## When to use

- Achievements, levels, streaks, rankings and rewards in a learning, fitness, community or team app.

## When not to use

- Plain numeric progress: use [`Progress`](../progress/README.md).
- Tables of ranked data with sorting and filters: use [`DataTable`](../data-table/README.md).

## Import

```tsx
import { Leaderboard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BadgeGrid, Leaderboard, XpProgress } from "@fadymondy/nasaq/web";

export const Page = () => (
  <>
    <XpProgress totalXp={1380} />
    <BadgeGrid achievements={[{ id: "a", title: "First step", rarity: "common", earnedAt: "2026-09-01" }]} />
    <Leaderboard entries={[{ id: "u1", name: "Layla", score: 4820, previousRank: 2 }]} youId="u1" unit="XP" />
  </>
);
```

## Anatomy

```
Leaderboard                data-slot="leaderboard": header with period Tabs, podium (2, 1, 3), ranked list, pinned "you" row
BadgeGrid                  filter Tabs (All, Earned, In progress, Locked) and a grid of AchievementMedal
AchievementCard            medal, rarity, XP, description, progress or earned date
XpProgress                 level number, XP in level, bar, XP to the next level
StreakCounter              flame, days in a row, longest, at-risk note
StreakCalendar / StreakCard month grid with active days; card combines both
RewardCard                 art, rarity, cost, Claim with progress and error states
AchievementUnlockToast     status region with a medal pop and burst
```

## API

| Component | Main props |
| --- | --- |
| `Leaderboard` | `entries` (`{ id, name, score, previousRank?, avatar?, subtitle? }`), `youId`, `periods`, `period`, `onPeriodChange`, `unit`, `limit` (10), `podium` (true), `loading`, `title`. |
| `BadgeGrid` | `achievements`, `filters` (true), `filter`, `onFilterChange`, `onSelect(id)`, `selectedId`. |
| `AchievementCard` | `achievement`, `actions`. |
| `Achievement` | `{ id, title, description?, icon?, rarity?, progress?, goal?, earnedAt?, xp?, secret? }`. |
| `XpProgress` | `totalXp`, `curve` (`{ base, growth }`). |
| `StreakCounter` | `current`, `longest`, `atRisk`. |
| `StreakCalendar` / `StreakCard` | `activeDays`, `month`, `onMonthChange`, `today`, `weekStart`. |
| `RewardCard` | `title`, `description`, `art`, `rarity`, `cost`, `costUnit`, `balance`, `status`, `lockedReason`, `onClaim` (async, may resolve `{ error }`). |
| `AchievementUnlockToast` | `achievement`, `open`, `onClose`, `onView`, `duration` (6000), `floating`. |

Rarity is `common`, `uncommon`, `rare`, `epic` or `legendary`. Tied scores share a rank (1, 2, 2, 4).
Pure helpers, tested: `rankEntries`, `movement`, `levelProgress`, `streakStats`, `monthGrid`, `achievementStatus`.

## Examples

**Async claim with an error**

```tsx
import { RewardCard } from "@fadymondy/nasaq/web";

export const Reward = () => (
  <RewardCard title="Golden frame" cost={800} balance={1200} rarity="rare" onClaim={async () => ({ error: "Out of stock." })} />
);
```

## Accessibility

- Rarity, status and movement are always words as well as colour or icon (screen reader text on arrows).
- Your row is marked `aria-current`. The pinned row is a labelled list.
- The unlock toast is a polite `role="status"` that stays mounted, pauses its timer on hover and focus, and can be dismissed.
- Under `prefers-reduced-motion` the toast is a still card: no pop and no burst.

## RTL & i18n

English and Arabic follow the Nasaq locale, override with `labels`. Numbers use `Num`, the calendar starts on
Saturday in Arabic, the ring fill mirrors.

## Styling & tokens

Tokens only. Epic uses the violet tag hue and legendary the accent. No custom CSS: the burst uses the Web Animations API.

## Do / Don't

- Do let people see how to earn a locked badge.
- Don't make rank the only way to feel progress: show personal progress too.
- Don't use the celebration for routine events.

## Related

[`Progress`](../progress/README.md), [`Badge`](../badge/README.md), [`Tabs`](../tabs/README.md), [`Toast`](../toast/README.md).
