---
name: hr-attendance
title: HR Attendance and Leave
category: work
status: beta
summary: An attendance marker with breaks, leave balances and requests that check overlap and balance, and payroll runs in whole minor units.
exports: [HrAttendanceLabels, AttendancePunchKind, AttendancePunch, AttendanceMarkerProps, AttendanceMarker, LeaveType, LeaveBalancesProps, LeaveBalances, LeaveRequestInput, LeaveRequestDialogProps, LeaveRequestDialog, LeaveRequestRow, LeaveRequestListProps, LeaveRequestList, PayrollRunStatus, PayrollLine, PayrollRun, PayrollRunsProps, PayrollRuns]
related: [calendar, time-tracker, data-table, approval-queue, price]
story: components-projects-work-hr-attendance
base-ui: [dialog, progress, switch]
keywords: [hr, attendance, clock in, leave, vacation, payroll, shift, timesheet]
---

# HR Attendance and Leave

The employee and manager sides of time off and pay: a clock-in marker with breaks and a late flag, balances per leave type,
a request dialog that refuses overlapping or over-balance requests, a request list a manager can approve or reject, and payroll
runs with per-line detail. Nothing is stored here: your async callbacks do the work and the components show busy and error states.

## When to use

- Staff self-service for attendance and leave, and the manager's approval list.
- A monthly payroll review that moves from draft to approved to paid.

## When not to use

- A general approval flow for anything else: use `ApprovalQueue`.
- Tracking time against projects: use `TimeTracker`.

## Import

```tsx
import { AttendanceMarker, LeaveBalances, LeaveRequestList, PayrollRuns } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<AttendanceMarker punches={punches} onPunch={async (kind) => api.punch(kind)} />
<LeaveBalances types={types} requests={mine} />
<PayrollRuns runs={runs} currency="EGP" onApprove={async (run) => api.approve(run.id)} />
```

## Anatomy

```
AttendanceMarker      data-slot="attendance-marker"   state, worked time, Clock in / Break / Clock out, the day's punches
LeaveBalances         data-slot="leave-balances"      one card per type: entitled, used, pending, available, Progress
LeaveRequestDialog    dates, half days, type, reason, live day count and problems
LeaveRequestList      data-slot="leave-request-list"  DataTable with Approve / Reject or Withdraw
PayrollRuns           data-slot="payroll-runs"        DataTable of runs, detail dialog with lines and totals
```

## API

Read the exported prop types in `hr-attendance.tsx` for the exact fields. In short:

- `AttendanceMarker`: `punches`, `onPunch(kind)`, optional `shift`, `breaks`, `now`, `loading`, `labels`.
- `LeaveBalances`: `types`, `requests`, optional `year`, `calendar` (weekend and holidays), `onRequest`, `loading`, `labels`.
- `LeaveRequestDialog`: `open`, `onOpenChange`, `types`, `requests`, `onSubmit(input)`, optional `calendar`, `labels`. It blocks a wrong date order, no working days, an overlap, or more days than are available.
- `LeaveRequestList`: `requests`, `types`, optional `mode` (`"manager"` or `"self"`), `onDecide`, `onWithdraw`, `onNew`, `loading`, `labels`. Row actions also open on context-click.
- `PayrollRuns`: `runs`, `currency`, optional `onApprove`, `onMarkPaid`, `loading`, `labels`. Lines are in integer minor units.

Async callbacks return `Promise<void | { error?: string }>`. Resolve `{ error }` or reject to show the message.

Pure helpers, all tested: `leaveDays`, `leaveBalance`, `checkLeaveRequest`, `findLeaveOverlap`, `attendanceMinutes`, `attendanceState`,
`attendanceLateMinutes`, `prorateSalary`, `unpaidLeaveDeduction`, `payrollGross`, `payrollNet`, `payrollTotals`.
Dates are `"YYYY-MM-DD"` keys, money is integer minor units, and division rounds half up.

## Examples

### Failing punch

```tsx
<AttendanceMarker punches={[]} onPunch={async () => ({ error: "Outside the office network." })} />
```

### Arabic

```tsx
<NasaqProvider locale="ar"><LeaveBalances types={types} requests={mine} /></NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move through punch buttons, rows and dialog fields. |
| Enter | Submit the open dialog. |
| Escape | Close the dialog (not while busy). |
| Shift+F10 or Menu | Open a row's actions. |

- Balances use a labelled `Progress`; status is text and an icon, not colour alone.
- Problems in the request dialog are announced with `role="alert"`.

## RTL & i18n

Built-in English and Arabic, and a `labels` prop to override. Numbers and dates go through `Intl`, isolated left to right. Chevrons flip.

## Styling & tokens

Card, border, muted and status tokens only. Target the `data-slot` values above and extend with `className`. No raw hex.

## Do / Don't

- Do check overlap and balance again on your server.
- Do pass `weekend` and `holidays` that match the country.
- Don't compute payroll in floats: keep minor units.

## Related

- `calendar`, `time-tracker`, `data-table`

## Lab

Storybook: Components / Workflow / HR Attendance.
