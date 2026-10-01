---
name: personal-widgets
title: Personal widgets
category: website
status: beta
summary: "Small widgets for a personal site: availability badge, local clock with working-hours state, social links, now list, stats, skills and weather."
exports: [PersonalWidgetLabels, usePersonalStrings, AvailabilityBadgeProps, AvailabilityBadge, LocalClockProps, LocalClock, SocialLink, SocialLinksProps, SocialLinks, NowItem, NowWidgetProps, NowWidget, ProfileStat, StatsWidgetProps, StatsWidget, Skill, SkillsWidgetProps, SkillsWidget, WeatherCondition, WeatherWidgetProps, WeatherWidget]
related: [profile-page, badge, card]
story: components-website-personal-widgets
base-ui: []
keywords: [availability, clock, socials, skills, stats, weather, now, widgets]
---

# Personal widgets

Small, self-contained blocks for a personal site or profile. They are presentational: none of them fetches anything. Pass the data you have.

| Widget | What it shows |
| --- | --- |
| `AvailabilityBadge` | "Available for work" with a status dot. `open`, `limited`, `closed`. |
| `LocalClock` | The owner's local time, the difference from the visitor's zone, and whether it is working hours there. |
| `SocialLinks` | Links as chips or a list. GitHub shows its official mark; other brands are text. |
| `NowWidget` | What I am doing now: building, reading, learning. |
| `StatsWidget` | A few numbers (years, projects, stars), compact notation optional. |
| `SkillsWidget` | Skills grouped by area with a five-dot level, also in text. |
| `WeatherWidget` | Temperature, condition, high and low, in Celsius or Fahrenheit. |

## When to use

- The side column of a profile, a footer, a link-in-bio page.

## When not to use

- Live weather or analytics: fetch elsewhere and pass values in.

## Import

```tsx
import { LocalClock, SocialLinks, StatsWidget } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<LocalClock timeZone="Asia/Riyadh" city="Riyadh" />
<StatsWidget stats={[{ label: "Projects", value: 42 }, { label: "Stars", value: 12400, compact: true }]} />
```

## Anatomy

Each widget is a `Card` (or a list, for `SocialLinks` and `SkillsWidget`) with a `data-slot` named after it.

## API

- `AvailabilityBadge`: `status`, `note?`, `labels?`.
- `LocalClock`: `timeZone`, `city?`, `viewerTimeZone?`, `workingHours?` (default Sunday to Thursday, 9 to 17), `now?`, `labels?`. Updates every 15 seconds.
- `SocialLinks`: `links` (`{ kind, label, href, handle? }`), `layout?` (`chips` or `list`).
- `NowWidget`: `items` (`{ label, text, href? }`), `updated?`, `title?`.
- `StatsWidget`: `stats` (`{ label, value, suffix?, compact? }`), `title?`.
- `SkillsWidget`: `skills` (`{ name, group?, level? }`), `levels?`.
- `WeatherWidget`: `city`, `temperature` (Celsius), `condition`, `high?`, `low?`, `unit?`.
- All take `labels?: Partial<PersonalWidgetLabels>`.

## Accessibility

- The clock is a `<time>` with a text description of the working state.
- Skill level is spoken as text, not only dots.
- Weather condition is text; the icon is hidden from assistive tech.

## RTL & i18n

English and Arabic strings. Times, temperatures and numbers use Latin digits. Handles are always left to right.

## Styling

Tokens only; status colors come from the badge variants.

## Do / Don't

- Do pass a real IANA zone.
- Don't add brand icons for networks other than GitHub; the official-marks rule applies.

## Related

[`ProfilePage`](../profile-page/README.md), [`Badge`](../badge/README.md), [`Card`](../card/README.md).

## Lab

Story `Components/Brand/Personal Widgets`.
