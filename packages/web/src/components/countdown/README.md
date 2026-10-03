---
name: countdown
title: Countdown
category: utilities
status: beta
summary: A drift-free countdown hook, a timer ring with phase colours, the mm:ss readout, cycle dots, and an idle-time prompt for time that passed while you were away.
exports: [CountdownLabels, UseCountdownTimerOptions, CountdownTimer, useCountdownTimer, TimerRingTone, timerToneText, TimerRingProps, TimerRing, TimerReadoutProps, TimerReadout, CycleDotsProps, CycleDots, UseIdleTimeOptions, IdleTime, useIdleTime, IdleTimePromptProps, IdleTimePrompt]
related: [pomodoro, focus-status, time-tracker, idle-lock, progress]
story: components-utilities-countdown
base-ui: [alert-dialog]
keywords: [countdown, timer, ring, pomodoro, cycle, dots, idle, drift, clock, phase]
---

# Countdown

The reusable parts under a pomodoro or any timed phase. `useCountdownTimer` counts down without drift: it stores the
moment the countdown ends and works out the time left from the clock, so a throttled background tab or a sleeping laptop
is still right when it wakes. `TimerRing` draws the ring, `TimerReadout` the mm:ss figure, `CycleDots` the sessions in a
set. `useIdleTime` and `IdleTimePrompt` ask what to do with time that passed while the person was away.

## When to use

- A visible countdown: a focus session, a break, a code that expires, a warm-up.
- A ring or dots around any phase-based progress.
- Tracking work time where you want to ask about idle time on return.

## When not to use

- A whole pomodoro cycle (focus, break, long break): use [`usePomodoro`](../pomodoro/README.md), built on these parts.
- A running stopwatch that counts up: see [`TimeTracker`](../time-tracker/README.md).
- Locking the app after inactivity: use [`IdleLock`](../idle-lock/README.md).
- A straight bar: use [`Progress`](../progress/README.md).

## Import

```tsx
import { CycleDots, IdleTimePrompt, TimerReadout, TimerRing, useCountdownTimer, useIdleTime } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { Button, TimerReadout, TimerRing, useCountdownTimer } from "@fadymondy/nasaq/web";

export function Warmup() {
  const timer = useCountdownTimer({ durationMs: 90_000, onComplete: () => console.log("go") });
  return (
    <div className="flex flex-col items-center gap-3">
      <TimerRing fraction={1 - timer.elapsed} paused={timer.status === "paused"}>
        <TimerReadout seconds={timer.seconds} label="Warm-up" />
      </TimerRing>
      <Button onClick={() => (timer.status === "running" ? timer.pause() : timer.status === "paused" ? timer.resume() : timer.start())}>
        {timer.status === "running" ? "Pause" : "Start"}
      </Button>
    </div>
  );
}
```

## Anatomy

```
TimerRing                       data-slot="timer-ring", data-tone, data-paused
├─ svg track and arc            data-slot="timer-ring-arc"
└─ children                     TimerReadout, a phase icon and word
TimerReadout                    data-slot="timer-readout", role="timer"
CycleDots                       data-slot="cycle-dots", role="img"
IdleTimePrompt                  data-slot="idle-time-prompt" (an AlertDialog)
```

## API

### `useCountdownTimer(options): CountdownTimer`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `durationMs` | `number` | required | Length in milliseconds. |
| `autoStart?` | `boolean` | `false` | Start when it mounts. |
| `speed?` | `number` | `1` | Runs this many times faster than real time. For demos and tests only. |
| `onComplete?` | `() => void` | none | Called once when the time reaches zero. |

Returns `status` (`"idle" \| "running" \| "paused" \| "done"`), `remainingMs`, `seconds` (whole seconds, rounded up, so
`0` means finished), `elapsed` (0 to 1), `durationMs`, `start(durationMs?)`, `pause()`, `resume()` and `reset(durationMs?)`.

### `TimerRing`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `fraction` | `number` | required | How much of the ring is filled, 0 to 1. Pass `1 - elapsed` to make it drain. |
| `tone?` | `"primary" \| "success" \| "info" \| "warning" \| "neutral"` | `"primary"` | Phase colour. Also give the phase a word or icon. |
| `size?` | `number` | `224` | Diameter in pixels. |
| `thickness?` | `number` | `12` | Stroke width in pixels. |
| `paused?` | `boolean` | `false` | Dashes the arc so the paused state does not rely on colour. |
| `children?` | `ReactNode` | none | Centre content. |

`timerToneText` maps each tone to a matching text colour class for the word inside the ring.

### `TimerReadout`

`seconds` (required), `label?` (accessible name, default "Timer"), `size?` (`"md"` or `"lg"`). It is always `dir="ltr"` with
tabular digits, formats `mm:ss` or `h:mm:ss`, and has `role="timer"` with `aria-live="off"`.

### `CycleDots`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `total` | `number` | required | Sessions in a set. |
| `done` | `number` | required | Finished sessions. |
| `active?` | `boolean` | `false` | Rings the next dot while a session runs. |
| `labels?` | `CountdownLabels` | built-in | String overrides. |

### `useIdleTime(options)` and `IdleTimePrompt`

`useIdleTime({ thresholdMs = 300000, disabled })` returns `{ idle, dismiss }`. `idle` is `{ idleMs, since }` once the person
gives any input after `thresholdMs` without one, otherwise `null`. It compares wall-clock time, so a sleeping machine is caught.

| `IdleTimePrompt` prop | Type | Default | Description |
| --- | --- | --- | --- |
| `idle` | `IdleTime \| null` | required | Open while not null. |
| `onKeep` | `() => void` | required | Keep the idle time. |
| `onDiscard` | `(idle: IdleTime) => void` | required | Remove it and keep the timer running. |
| `onDiscardAndStop?` | `(idle: IdleTime) => void` | none | Remove it and stop. Omit to hide the button. |
| `labels?` | `CountdownLabels` | built-in | String overrides. |

Pure helpers for your own logic and tests are exported too: `startCountdown`, `idleCountdown`, `pauseCountdown`,
`resumeCountdown`, `tickCountdown`, `remainingAt`, `displaySeconds`, `elapsedFraction`, `nextTickDelay`, `formatTimer`,
`scaledClock`, `idleMinutes`. Each takes `now` as an argument.

## Examples

### A ten minute demo in ten seconds

```tsx
const timer = useCountdownTimer({ durationMs: 10 * 60_000, speed: 60, autoStart: true });
```

### Ask about idle time while a timer runs

```tsx
const { idle, dismiss } = useIdleTime({ thresholdMs: 10 * 60_000, disabled: !running });
<IdleTimePrompt
  idle={idle}
  onKeep={dismiss}
  onDiscard={(i) => { trimTimer(i.idleMs); dismiss(); }}
  onDiscardAndStop={(i) => { trimTimer(i.idleMs); stopTimer(); dismiss(); }}
/>
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Move between the prompt buttons. |
| Enter or Space | Choose an answer. |

- The readout is a `<time role="timer">` with a name and no live announcements, so it does not chatter every second.
  Announce phase changes yourself (`PomodoroCard` does).
- The ring is decorative (`aria-hidden`). A paused ring is dashed and dots differ by fill, so state is not colour only.
- `IdleTimePrompt` is an AlertDialog: focus is trapped and only its buttons close it. Localise the labels for other languages.
- `prefers-reduced-motion` removes the ring and dot transitions.

## RTL & i18n

- The ring is a circle that runs clockwise from the top in both directions; the readout stays left-to-right.
- Built-in English and Arabic strings follow the Nasaq locale. Numbers use Western digits.
- The time in the idle message is isolated left-to-right inside Arabic text.

## Styling & tokens

Tokens only: `stroke-primary`, `stroke-nq-success`, `stroke-nq-info`, `stroke-nq-warning`, `stroke-nq-line`, `bg-primary`,
`border-nq-line-strong`. Target `data-tone`, `data-paused` on the ring and `data-state` (`done`, `current`, `todo`) on dots.
Pass `className` for layout.

## Do / Don't

- Do compute time from a stored end, as the hook does. Do not decrement a counter in an interval.
- Do give every ring phase a word or icon.
- Do not use `speed` in production, and do not persist state made with it.

## Related

- [`Pomodoro`](../pomodoro/README.md)
- [`FocusStatus`](../focus-status/README.md)
- [`TimeTracker`](../time-tracker/README.md)
- [`IdleLock`](../idle-lock/README.md)

## Lab

`https://docs.nasaqui.com/?path=/docs/components-utilities-countdown--docs`
