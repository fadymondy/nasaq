---
name: vitals
title: Vitals
category: wellness
status: beta
summary: Body readings from a scale or wearable with BMI and its category, plus progress towards the targets the person set.
exports: [Vitals, VitalsProps, VitalsData, VitalsLabels, VitalTargetKey]
related: [daily-summary, health-reports, stat-card, meter]
story: components-wellness-vitals
base-ui: []
keywords: [health, vitals, weight, bmi, body water, visceral fat, muscle, metabolic age, heart rate, targets]
---

# Vitals

Weight, BMI with its category, body water, visceral fat, muscle mass, metabolic age and resting heart rate as tiles,
then a card of progress towards targets. The BMI category is a name with an icon and a tone, and it comes with a note
that BMI is a rough screening figure. A missing reading says "Not measured".

## When to use

- A body composition screen fed by a smart scale or a wearable.

## When not to use

- Daily behaviour counts: use [`DailySummary`](../daily-summary/README.md).

## Import

```tsx
import { Vitals } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Vitals } from "@fadymondy/nasaq/web";

<Vitals
  vitals={{
    weightKg: 84.2,
    heightCm: 178,
    bodyWaterPercent: 54.1,
    visceralFat: 11,
    hasBaseline: true,
    targets: { weight: { current: 84.2, target: 80, percent: 62, onTarget: false } },
  }}
/>;
```

## Anatomy

```
Vitals                        data-slot="vitals"
├─ header                     title, measured date
├─ StatGrid                   one StatCard per reading (weight and heart rate carry a Sparkline)
├─ BMI note
└─ Card "Targets"             one Meter per target, data-slot="vitals-target"
```

## API

| Prop | Type | Notes |
| --- | --- | --- |
| `vitals` | `VitalsData` | Every reading is optional. `bmi` wins over the one computed from weight and height. |
| `loading` | `boolean` | Skeleton. |
| `hideHeading` | `boolean` | For pages with their own heading. |
| `labels` | `Partial<VitalsLabels>` | Override any string. |

Units: kilograms, percent, years through Intl; bpm, kg/m² and the visceral level are labelled from the vocabulary.
The pure helpers `computeBmi`, `bmiCategory`, `bmiTone`, `clampPercent` and `distanceToTarget` are exported too.
