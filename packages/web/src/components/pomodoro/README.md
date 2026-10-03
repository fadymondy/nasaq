---
name: pomodoro
title: PomodoroCard
category: productivity
status: beta
summary: A pomodoro with focus, short and long breaks. usePomodoro runs the cycle drift-free, PomodoroCard shows the ring, dots and linked task, and BreakLockScreen is the full-screen break.
exports: [PomodoroLabels, UsePomodoroOptions, PomodoroController, usePomodoro, PomodoroTask, PomodoroCardProps, PomodoroCard, BreakSuggestionKind, BreakSuggestion, BreakLockScreenProps, BreakLockScreen]
related: [countdown, focus-status, time-tracker, lock-screen, daily-summary]
story: components-productivity-pomodoro-card
base-ui: [dialog, select, progress]
keywords: [pomodoro, focus, break, timer, cycle, lock screen, stretch, water, task, session]
---

# PomodoroCard

Focus in sessions, rest in between. `usePomodoro` runs the classic cycle (25 minutes of focus, a 5 minute break, and a 15
minute break after every fourth session) and returns one controller. `PomodoroCard` shows it: cycle dots, the timer ring
with the phase inside, start, pause, skip and stop, the task the session is for, and today against a daily goal.
`BreakLockScreen` covers the page during a break with the countdown and a stretch or water suggestion.

## When to use

- A focus timer in a health, wellbeing or productivity product.
- Forcing a real rest: the break screen traps focus so it is hard to click past.

## When not to use

- Tracking billable hours: use [`TimeTracker`](../time-tracker/README.md).
- Locking the app for security: use [`LockScreen`](../lock-screen/README.md) and [`IdleLock`](../idle-lock/README.md).
- A plain countdown: use [`useCountdownTimer`](../countdown/README.md).

## Import

```tsx
import { BreakLockScreen, PomodoroCard, usePomodoro } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { BreakLockScreen, PomodoroCard, usePomodoro } from "@fadymondy/nasaq/web";

export function Focus() {
  const pomodoro = usePomodoro({ onEvent: (event) => api.saveSession(event) });
  return (
    <>
      <PomodoroCard pomodoro={pomodoro} task={{ id: "t1", title: "Write the report" }} />
      <BreakLockScreen
        open={pomodoro.onBreak}
        phase={pomodoro.phase === "longBreak" ? "longBreak" : "shortBreak"}
        seconds={pomodoro.seconds}
        fraction={pomodoro.fraction}
        cycle={pomodoro.cycle}
        cycles={pomodoro.cycles}
        onPostpone={(minutes) => pomodoro.postpone(minutes * 60_000)}
        onSkip={pomodoro.skip}
      />
    </>
  );
}
```

## Anatomy

```
PomodoroCard                    data-slot="pomodoro-card", data-phase, data-status
├─ CycleDots                    sessions in the set
├─ TimerRing + TimerReadout     phase icon, mm:ss and the phase word
├─ Start / Pause, Skip, Stop
├─ task                         data-slot="pomodoro-task" (a picker when `tasks` is given)
└─ today                        data-slot="pomodoro-today", Progress against the daily goal
BreakLockScreen                 data-slot="break-lock-screen", data-phase, data-confirming
├─ title and message
├─ TimerRing + CycleDots
├─ suggestion                   data-slot="break-suggestion"
├─ Postpone, Skip break
└─ confirm                      data-slot="break-lock-confirm"
```

## API

### `usePomodoro(options): PomodoroController`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `config?` | `Partial<PomodoroConfig>` | 25 / 5 / 15 min, 4 sessions | `focusMs`, `shortBreakMs`, `longBreakMs`, `cyclesBeforeLongBreak`, `autoStartBreaks` (default true), `autoStartFocus` (default false). |
| `initialCompleted?` | `number` | `0` | Sessions already finished today. |
| `initialState?` | `PomodoroState` | fresh | Restore a saved state. |
| `speed?` | `number` | `1` | Faster than real time, for demos. Do not persist state made with it. |
| `onEvent?` | `(event: PomodoroEvent) => void` | none | A phase `completed`, `skipped`, `stopped` or `postponed`, with `startedAt`, `endedAt`, `plannedMs`, `spentMs`. Save sessions here. |
| `onStateChange?` | `(state: PomodoroState) => void` | none | Every change. Persist it and pass it back as `initialState` after a reload. |

The controller has `state`, `config`, `phase` (`"focus" \| "shortBreak" \| "longBreak"`), `status`, `cycle`, `cycles`, `completed`,
`remainingMs`, `seconds`, `fraction` (share left, 1 to 0), `onBreak`, and the actions `start()`, `pause()`, `resume()`,
`toggle()`, `skip()`, `stop()`, `postpone(ms)`.

Rules: a focus that ends counts as a session and starts the break at once. Skipping focus goes to a break without counting.
After the last session in a set the break is long, and the set restarts after it. Postponing a break gives extra focus time
that does not count as a new session; the break is owed again afterwards. `stop()` keeps today's count. Phases that start
by themselves begin at the previous phase's end, so a late tick shortens nothing.

### `PomodoroCard`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `pomodoro` | `PomodoroController` | required | From `usePomodoro`. |
| `dailyTarget?` | `number` | `8` | Goal in sessions. `0` hides the day counter. |
| `task?` | `PomodoroTask \| null` | none | `{ id, title, project? }` the session is for. |
| `tasks?` | `readonly PomodoroTask[]` | none | Turns the task line into a picker. |
| `onTaskChange?` | `(task: PomodoroTask \| null) => void` | none | Picker change. |
| `focusMinutesToday?` | `number` | sessions x focus length | Minutes focused today. |
| `title?` | `ReactNode` | "Pomodoro" | Heading. |
| `labels?` | `PomodoroLabels` | built-in en/ar | String overrides. |
| `className?` | `string` | none | Merged onto the card (max width 28rem by default). |

### `BreakLockScreen`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `open` | `boolean` | required | Usually `pomodoro.onBreak`. |
| `phase` | `"shortBreak" \| "longBreak"` | required | Picks the title and colour. |
| `seconds`, `fraction` | `number` | required | Time left and the share left for the ring. |
| `cycle?`, `cycles?`, `completed?` | `number` | `0`, `4`, `cycle` | Dots and the message. |
| `suggestions?` | `readonly BreakSuggestion[]` | stretch, water, eyes, walk | `{ id, kind, title, description? }`. |
| `postponeMinutes?` | `number` | `5` | Minutes a postponement adds. |
| `onPostpone?` | `(minutes: number) => void` | none | Shows the Postpone button. |
| `onSkip` | `() => void` | required | Called after the person confirms. |
| `confirmSkip?` | `boolean` | `true` | Ask before skipping. |
| `nextTask?` | `string` | none | Shown as "Next up". |
| `paused?` | `boolean` | `false` | Dashes the ring. |
| `labels?` | `PomodoroLabels` | built-in | String overrides. |

## Examples

### Persist across reloads

```tsx
const saved = JSON.parse(localStorage.getItem("pomodoro") ?? "null") ?? undefined;
const pomodoro = usePomodoro({ initialState: saved, onStateChange: (s) => localStorage.setItem("pomodoro", JSON.stringify(s)) });
```

### Auto-start everything, four-minute long break

```tsx
usePomodoro({ config: { autoStartFocus: true, longBreakMs: 4 * 60_000 } });
```

### Arabic

```tsx
<NasaqProvider locale="ar">
  <PomodoroCard pomodoro={pomodoro} />
</NasaqProvider>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab / Shift+Tab | Move between the buttons; inside the break screen focus stays trapped. |
| Enter or Space | Press the focused button. |
| Escape | On the break screen: open "Skip this break?". Pressed again, it goes back to resting. It never skips by itself. |

- The break screen is a modal dialog: the page behind is inert, focus is trapped, outside clicks do nothing. Only `onSkip`
  after the confirmation, or your own `open={false}`, removes it.
- The card announces "Focus started" / "Break started" in a polite live region. The readout does not announce every second.
- The ring dashes when paused and each phase has its own icon and word: state is not conveyed by colour alone.
- `prefers-reduced-motion` stops the ring, fade and suggestion pulse.
- Localise `labels` for languages other than English and Arabic.

## RTL & i18n

- English and Arabic copy is built in. The timer is always left-to-right; Play and Skip icons mirror in RTL.
- Numbers use Western digits in both languages.

## Styling & tokens

Tokens only (`bg-primary`, `stroke-nq-success`, `bg-nq-success-soft`, `bg-background`). Target `data-phase` and `data-status` on
the card and `data-phase`, `data-confirming` on the break screen. The screen sits at `z-[100]`.

## Do / Don't

- Do save sessions in `onEvent`, not by watching the controller.
- Do keep the break screen for real breaks; let people postpone and skip with a confirm rather than trapping them.
- Don't use the break screen for security locks; it is not authentication.
- Don't persist state created with `speed` other than 1.

## Related

- [`Countdown`](../countdown/README.md)
- [`FocusStatus`](../focus-status/README.md)
- [`TimeTracker`](../time-tracker/README.md)
- [`LockScreen`](../lock-screen/README.md)

## Lab

`https://docs.nasaqui.com/?path=/docs/components-productivity-pomodoro-card--docs`
