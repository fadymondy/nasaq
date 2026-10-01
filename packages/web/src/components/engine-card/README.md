---
name: engine-card
title: Engine Card
category: wellness
status: beta
summary: One Health Debug protocol engine's live state as a card, with a state badge, the engine's readout and its log action. Seven engines, one component.
exports: [EngineCard, EngineCardGrid, EngineCardProps, EngineCardLabels, ENGINE_ICONS]
related: [engine-details, daily-summary, meter, status, stat-card]
story: components-wellness-engine-card
base-ui: []
keywords: [health, protocol, engine, hydration, caffeine, gerd, medication, triggers, cycle, contraceptive, state, countdown]
---

# Engine Card

A card that shows what one protocol engine says right now. The server decides the state; the card draws it and
never re-derives a rule. It covers seven engines through one discriminated `EngineSnapshot`: hydration, caffeine
block, GERD window, medication grace, trigger families, cycle and contraceptive.

Two opinions are built in. A state always shows an icon and words next to its colour. An engine that has not
enough data says so and shows nothing, instead of guessing.

## When to use

- A dashboard of the protocol engines, one card each.
- Anywhere a single engine's state, countdown and log action belong together.

## When not to use

- A per-day summary of what was logged: use [`DailySummary`](../daily-summary/README.md).
- An engine's history and record: use [`EngineDetails`](../engine-details/README.md).
- A number that is not a protocol engine: use [`StatCard`](../stat-card/README.md).

## Import

```tsx
import { EngineCard, EngineCardGrid } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { EngineCard, EngineCardGrid, type EngineSnapshot } from "@fadymondy/nasaq/web";

const hydration: EngineSnapshot = {
  engine: "hydration",
  state: "idle",
  totalMl: 1500,
  dailyCapMl: 5000,
  unitMl: 250,
  unitsLogged: 6,
  unitsTotal: 20,
};

export function Today() {
  return (
    <EngineCardGrid>
      <EngineCard
        snapshot={hydration}
        detailHref="/health/hydration"
        onAction={async (action) => {
          const res = await fetch("/api/engines/log", { method: "POST", body: JSON.stringify(action) });
          if (!res.ok) return { error: (await res.json()).message };
        }}
      />
    </EngineCardGrid>
  );
}
```

## Anatomy

```
EngineCard                    data-slot="engine-card"   data-engine, data-state
├─ header                     icon, title (h3), subtitle, state Badge (tone icon + words)
├─ body                       per engine: Meter, countdown, window, doses, counts, prediction, schedule
├─ error                      role="alert", the server's message as it is
└─ footer                     the log action and the details link
```

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `snapshot` | `EngineSnapshot` | Required. Discriminated by `engine`. |
| `now` | `Date \| string \| number` | Fixed clock for countdowns. Omit to follow the clock. |
| `live` | `boolean` | Tick every second. Default `true`. |
| `onAction` | `(action: EngineAction) => Promise<void \| { error?: string }>` | Log unit, log wake, log dose, record dose. The error is shown as is. |
| `detailHref` | `string` | Link to the engine's page. |
| `headingAs` | `"h2" \| "h3" \| "h4"` | Default `"h3"`. |
| `loading` | `boolean` | Skeleton. |
| `hideTitle` | `boolean` | For pages that already name the engine. |
| `labels` | `Partial<EngineCardLabels>` | Override any string. |

Units come from `Measure` (millilitres, minutes, hours, days) in an LTR isolate, so they keep their order in Arabic.
The pure helpers (`summariseDays`, `bucketDays`, `engineTone`, `summariseMedication`, `splitDuration`) are exported too.

## Examples

### Caffeine while blocked

```tsx
<EngineCard snapshot={{ engine: "caffeine", state: "blocked", blockMinutes: 90, wakeAt: "2026-09-29T07:00:00Z", blockEndsAt: "2026-09-29T08:30:00Z", violationsToday: 0, cupsToday: 0 }} />
```

Check the exact snapshot shapes in `health-engines.ts`.
