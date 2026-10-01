---
name: focus-status
title: FocusStatusChip
category: productivity
status: beta
summary: Focus presence, a header status chip with the time left, an avatar with an in-focus dot, and a do not disturb switch. focusStateOf derives the state from a pomodoro.
exports: [FocusStatusLabels, FocusStatusChipProps, FocusStatusChip, FocusAvatarProps, FocusAvatar, DoNotDisturbToggleProps, DoNotDisturbToggle]
related: [pomodoro, avatar, status, countdown, badge]
story: components-productivity-focus-status
base-ui: [switch, avatar]
keywords: [focus, presence, status, do not disturb, dnd, avatar, busy, break, chip]
---

# FocusStatusChip

What a person is doing right now, in three small pieces. `FocusStatusChip` is the compact header chip ("In focus 12:34").
`FocusAvatar` is an [`Avatar`](../avatar/README.md) with a presence dot at its inline end. `DoNotDisturbToggle` is the
switch row that silences notifications. `focusStateOf` turns a pomodoro and the do not disturb switch into one of four
states: `available`, `focus`, `break`, `dnd`.

## When to use

- Showing your own status in an app header, and your teammates' on their avatars.
- Pairing with [`usePomodoro`](../pomodoro/README.md) so focusing updates presence by itself.

## When not to use

- A generic state in a table or list: use [`Status`](../status/README.md).
- Online or offline connection state: use [`WsStatus`](../ws-status/README.md).

## Import

```tsx
import { DoNotDisturbToggle, FocusAvatar, FocusStatusChip, focusStateOf } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { FocusAvatar, FocusStatusChip, focusStateOf, usePomodoro } from "@fadymondy/nasaq/web";

export function HeaderStatus({ name }: { name: string }) {
  const pomodoro = usePomodoro();
  const state = focusStateOf(pomodoro);
  return (
    <div className="flex items-center gap-3">
      <FocusStatusChip state={state} seconds={pomodoro.seconds} />
      <FocusAvatar name={name} state={state} />
    </div>
  );
}
```

## Anatomy

```
FocusStatusChip                 data-slot="focus-status", data-state
├─ icon                         a different glyph per state
├─ label                        or `text`
└─ mm:ss                        while focusing or on a break
FocusAvatar                     data-slot="focus-avatar", data-state
├─ Avatar
└─ presence dot                 role="img" with the state as its name
DoNotDisturbToggle              data-slot="do-not-disturb", data-state
├─ label, description, "Until" time
└─ Switch
```

## API

### `FocusStatusChip`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `state` | `"available" \| "focus" \| "break" \| "dnd"` | required | Which presence to show. |
| `seconds?` | `number` | none | Time left. Shown as mm:ss for `focus` and `break` only. |
| `text?` | `string` | state word | Replaces the word, for example a task name. |
| `onClick?` | `() => void` | none | Makes the chip a button. |
| `labels?` | `FocusStatusLabels` | built-in en/ar | String overrides. |

### `FocusAvatar`

Takes every `Avatar` prop (`name`, `src`, `size`, `shape`) plus `state`, `hideAvailable?` (no dot when available) and `labels?`.
Larger sizes show the state icon in the dot; small sizes show a plain dot with the same accessible name.

### `DoNotDisturbToggle`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | `boolean` | required | On or off. |
| `onCheckedChange` | `(checked: boolean) => void` | required | Change handler. |
| `until?` | `string` | none | Text after "Until", shown while on. |
| `disabled?` | `boolean` | `false` | Disable the switch. |
| `labels?` | `FocusStatusLabels` | built-in | String overrides. |

### `focusStateOf(input, dnd?)`

`(input: { phase, status } | null | undefined, dnd = false) => FocusState`. Do not disturb wins. A running or paused focus is
`focus`, a running or paused break is `break`, anything not started is `available`. A `PomodoroController` fits `input`.

## Examples

### Task name in the chip

```tsx
<FocusStatusChip state="focus" seconds={754} text="Design review" onClick={openPomodoro} />
```

### Team list

```tsx
{people.map((p) => (
  <li key={p.id}><FocusAvatar name={p.name} src={p.avatar} state={p.state} /> {p.name}</li>
))}
```

### Do not disturb wins

```tsx
const [dnd, setDnd] = useState(false);
const state = focusStateOf(pomodoro, dnd);
<DoNotDisturbToggle checked={dnd} onCheckedChange={setDnd} until="6:00 PM" />
```

## Accessibility

| Key | Action |
| --- | --- |
| Tab | Focus the chip (when it has `onClick`) or the switch. |
| Enter / Space | Activate the chip; toggle the switch. |

- Each state has its own icon and word, so it is not colour only. The presence dot is `role="img"` with the state as its name.
- The time has an `aria-label` such as "12:34 left".
- Localise `labels` for other languages.

## RTL & i18n

- The dot sits at the inline end of the avatar, so it flips in RTL. The mm:ss stays left-to-right.
- Built-in English and Arabic strings follow the Nasaq locale.

## Styling & tokens

Tokens only (`bg-nq-success`, `bg-primary`, `bg-nq-warning-soft`, `border-background`). Target `data-state` on each part. Pass
`className` for layout.

## Do / Don't

- Do show do not disturb even during focus; it is the stronger signal.
- Don't rely on the dot colour alone in your own layouts; keep the label or `title`.
- Don't use it for connection state.

## Related

- [`Pomodoro`](../pomodoro/README.md)
- [`Avatar`](../avatar/README.md)
- [`Status`](../status/README.md)
- [`Countdown`](../countdown/README.md)

## Lab

`https://nasaq-ui.fadymondy.com/?path=/docs/components-productivity-focus-status--docs`
