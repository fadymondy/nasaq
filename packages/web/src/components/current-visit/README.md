---
name: current-visit
title: CurrentVisit
category: health
status: beta
summary: The visit in progress - patient card with allergies, earlier visits, a running timer, notes, a prescription list with validation, follow-up choices and a finish that checks the record.
exports: [CurrentVisitLabels, VisitPatient, VisitHistoryItem, VisitResult, CurrentVisitProps, CurrentVisit]
related: [clinic-queue, clinic-schedule, timeline, date-picker]
story: components-health-current-visit
base-ui: [field]
keywords: [visit, consultation, prescription, notes, follow-up, patient, timer]
---

# CurrentVisit

Everything the doctor needs while the patient is in the room. Finishing is blocked until there is a note or a valid prescription. A half-filled medicine is flagged rather than dropped.

## When to use

- The consultation screen.
- Recording notes and a prescription before the next patient.

## When not to use

- A read-only record: use a Timeline of visits.

## Import

```tsx
import { VisitPatient, VisitHistoryItem, VisitResult, CurrentVisit } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { CurrentVisit } from "@fadymondy/nasaq/web";

<CurrentVisit patient={patient} service="Consultation" startedAt={startedAt} history={history} onFinish={(result) => api.finish(result)} />
```

## Anatomy

```
CurrentVisit                  data-slot="current-visit"
├─ patient card               name, age, phone, allergies, conditions
├─ history                    Timeline of earlier visits
└─ visit panel
   ├─ timer
   ├─ notes
   ├─ prescriptions           validated rows
   ├─ follow-up               quick choices and a DatePicker
   └─ Finish visit
```

## API

Every `div` prop is passed through unless noted.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `patient` | `VisitPatient` | `required` | Name, age, gender, phone, allergies, conditions. |
| `service, room` | `string` |  | Shown under the title. |
| `startedAt` | `number` | `required` | Epoch ms the visit began. |
| `history` | `VisitHistoryItem[]` | `[]` | Earlier visits. |
| `defaultNotes, defaultPrescriptions` |  |  | Initial values. |
| `followUpOptions` | `number[]` | [7, 14, 30] | Quick follow-up choices, in days. |
| `workingWeekdays` | `number[]` |  | 0 is Sunday. A follow-up moves to the next working day. |
| `onFinish` | `(result) => Promise<void \| { error? }>` | `required` | Save the visit: notes, prescriptions and the follow-up date. |
| `now, labels` |  |  | For stories; override strings. |

## Examples

**Book the follow-up in the host**

```tsx
onFinish={async ({ followUp }) => {
  if (followUp) await api.book({ start: followUp });
}}
```

## Accessibility

- Prescription errors sit under the field and mark it invalid.
- The timer has role timer and a label; it is not announced every second.

## RTL & i18n

- Doses and phone numbers are left to right; the panel mirrors.
- Strings live in a `STRINGS = { en, ar }` object and any of them can be replaced with `labels`. The locale comes from `NasaqProvider`.

## Styling & tokens

- Colours, radii and type come from `--nq-*` tokens; nothing is a raw colour. Spacing and alignment use logical classes.
- Target `[data-slot="current-visit"]` and the inner `data-slot` parts shown in the anatomy.

## Do / Don't

- Do keep the async callbacks honest: return `{ error }` so the component can show the message.
- Do pass `now` in tests and stories so the output stays the same.
- Don't fetch inside the component: it is presentational and takes data and callbacks.
- Don't rely on colour for state: every state also has a word.

## Related

- [`clinic-queue`](../clinic-queue/README.md)
- [`clinic-schedule`](../clinic-schedule/README.md)
- [`timeline`](../timeline/README.md)
- [`date-picker`](../date-picker/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-health-current-visit--docs
