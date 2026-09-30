---
name: clinic-dashboard
title: ClinicDashboard
category: health
status: beta
summary: Front-desk overview with waiting count and longest wait, doctors on duty, room use, a card per room and a row per doctor, each state shown with an icon and a word.
exports: [ClinicDashboardLabels, ClinicDashboardProps, ClinicDashboard]
related: [clinic-queue, lobby-display, stat-card]
story: components-health-clinic-dashboard
base-ui: []
keywords: [dashboard, rooms, doctors on duty, waiting, front desk, occupancy]
---

# ClinicDashboard

The figures reception needs: how many are waiting and for how long, which doctors are on duty, and which rooms are free. It is read only; selecting a room or doctor calls back. The pure helpers (doctorsOnDuty, roomCounts, roomOccupancy, waitingFigures) are exported.

## When to use

- The reception or clinic manager screen.

## When not to use

- Detailed analytics over time: use charts.

## Import

```tsx
import { ClinicDashboard } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ClinicDashboard } from "@fadymondy/nasaq/web";

<ClinicDashboard rooms={rooms} doctors={doctors} queuedAt={waitingSince} />
```

## Anatomy

```
ClinicDashboard               data-slot="clinic-dashboard"
├─ StatGrid                   waiting, longest wait, on duty, occupancy
├─ rooms                      one card per room, with Progress for use
└─ doctors card               on-duty doctors
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `rooms` | `ClinicRoom[]` | `required` | free, busy, cleaning or closed. |
| `doctors` | `ClinicDoctor[]` | `required` | With status, shift and waiting count. |
| `queuedAt` | `number[]` | `required` | When each waiting patient joined (epoch ms). |
| `connection, updatedAt` |  | `"live"` | Live indicator. |
| `onRoomSelect, onDoctorSelect` | `callbacks` |  | Make room cards and doctor rows clickable. |
| `now, labels` |  |  | For stories; override strings. |

## Examples

**Extra content**

```tsx
<ClinicDashboard rooms={rooms} doctors={doctors} queuedAt={queuedAt}>
  <MyChart />
</ClinicDashboard>
```

## Accessibility

- Room and doctor states use an icon and a word.
- Room cards are buttons only when onRoomSelect is set.

## RTL & i18n

- Cards and rows mirror. Tickets and shift times stay left to right.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="clinic-dashboard"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`clinic-queue`](../clinic-queue/README.md)
- [`lobby-display`](../lobby-display/README.md)
- [`stat-card`](../stat-card/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-clinic-dashboard--docs
