---
name: clinic-schedule
title: ClinicSchedule
category: healthcare
status: beta
summary: A doctor's day on a timeline, with each appointment named and coloured by status, a summary by status, an in-visit card, the next patient with lateness and an overlap warning.
exports: [ClinicScheduleLabels, ClinicScheduleProps, ClinicSchedule]
related: [scheduler, booking-pipeline, clinic-queue, current-visit]
story: components-healthcare-clinic-schedule
base-ui: []
keywords: [schedule, day, doctor, appointments, clinic, overlap, late]
---

# ClinicSchedule

Today at a glance for the doctor. It wraps the Scheduler in day view and adds the figures a doctor asks for first. It is read only: selecting an appointment or an empty slot calls back.

## When to use

- The doctor's home screen.
- Finding gaps for a walk-in.

## When not to use

- Calling patients in order: use ClinicQueue.

## Import

```tsx
import { ClinicSchedule } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { ClinicSchedule } from "@fadymondy/nasaq/web";

<ClinicSchedule appointments={appointments} onSelect={(a) => openVisit(a.id)} />
```

## Anatomy

```
ClinicSchedule                data-slot="clinic-schedule"
├─ Scheduler (day)            title includes the status word
└─ side column
   ├─ summary card            counts per status
   ├─ in visit now
   ├─ next up                 with minutes late
   └─ overlap alert
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `appointments` | `ClinicAppointment[]` | `required` | Any days; the schedule shows the chosen one. |
| `date, defaultDate, onDateChange` | `Date` |  | The day shown. |
| `workingHours` | `{ start, end }` | 8 to 18 | Visible hours. |
| `onSelect` | `(appointment) => void` |  | An appointment or an Open button was used. |
| `onSlotSelect` | `(start, end) => void` |  | An empty slot was chosen. |
| `now` | `Date` | the clock | For stories. |
| `labels` | `Partial<ClinicScheduleLabels>` |  | Override any string. |

## Examples

**Pure helpers**

```tsx
import { findOverlaps, nextAppointment, summariseAppointments } from "@fadymondy/nasaq/web";
```

## Accessibility

- Status is in the block title as a word, so colour is never the only cue.
- The scheduler is keyboard reachable.

## RTL & i18n

- The timeline mirrors. Times stay left to right.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="clinic-schedule"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`scheduler`](../scheduler/README.md)
- [`booking-pipeline`](../booking-pipeline/README.md)
- [`clinic-queue`](../clinic-queue/README.md)
- [`current-visit`](../current-visit/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-healthcare-clinic-schedule--docs
