---
name: voice-call-overlay
title: VoiceCallOverlay
category: ai
status: beta
summary: Full-screen voice call with an AI agent showing who, how long, a level-driven visualiser, the listening, thinking or speaking state, live captions and mute, captions and hang-up controls.
exports: [VoiceCallLabels, VoiceVisualizerProps, VoiceVisualizer, VoiceCaption, VoiceAgent, VoiceCallOverlayProps, VoiceCallOverlay, voiceLevelFromSamples, formatVoiceCallTime, VoiceCallState]
related: [ai-states, copilot-chat, focus-status]
story: components-ai-assistant-voice-call-overlay
keywords: [voice, call, agent, audio, visualizer, level, listening, speaking, captions]
---

# VoiceCallOverlay

The UI of a voice call with an agent. It holds no audio: you connect the call and feed it `state` and `level`, and act on `onEnd` and `onMutedChange`. It never requests the microphone.

## When to use

- A voice agent call screen.
- `VoiceVisualizer` alone as an audio level meter.

## When not to use

- Text chat: use [`CopilotChat`](../copilot-chat/README.md).
- Recording or playing audio files: use a media player.

## Import

```tsx
import { VoiceCallOverlay, voiceLevelFromSamples } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<VoiceCallOverlay
  state={state}
  level={level}
  agent={{ name: "Salma", avatar: "🎧" }}
  muted={muted}
  onMutedChange={setMuted}
  elapsed={seconds}
  captions={captions}
  onEnd={hangUp}
/>
```

## Anatomy

A `role="dialog"` surface: header (agent mark, name, subtitle, timer), the visualiser and a state word, the last caption lines, and a control bar (mute, captions, end call). The visualiser is a `role="meter"` of bars driven by a short history of `level`.

## API

| Prop | Type | Description |
| --- | --- | --- |
| `state` | `"connecting" \| "listening" \| "thinking" \| "speaking" \| "error"` | Required. |
| `agent` | `{ name, avatar?, subtitle? }` | Required. |
| `level` | `number` | Loudness 0 to 1 of the current speaker. |
| `muted`, `onMutedChange` | | Microphone mute (controlled). |
| `onEnd` | `() => void \| Promise` | Hang up. Required. |
| `elapsed` | `number` | Seconds since answer. |
| `captions`, `captionLines`, `showCaptions`, `defaultShowCaptions`, `onShowCaptionsChange` | | Live captions. |
| `onInterrupt` | `() => void` | Adds a Cut in button while speaking. |
| `error`, `onRetry` | | Shown in the error state. |
| `contained` | `boolean` | Fill the nearest positioned parent instead of the window. |
| `extraControls`, `labels` | | Extra buttons; string overrides. |

Helpers `voiceLevelFromSamples(samples)` (float or byte audio samples to a 0 to 1 level) and `formatVoiceCallTime(seconds)` are re-exported from the component.

## Examples

**Feeding the level from an analyser**

```tsx
const level = voiceLevelFromSamples(samples);
```

## Accessibility

The state is spoken text, not only motion. Mute and captions are toggle buttons with `aria-pressed`. The visualiser exposes the level as a meter. With reduced motion the level is quantised and the pulse and transitions are off.

## RTL & i18n

- English and Arabic strings ship and follow the Nasaq locale. Pass `labels` to override any string.
- Layout uses logical properties, so it mirrors in right-to-left. The timer stays left-to-right.

## Styling & tokens

- Uses `bg-background`, the accent token for the speaking bars and the danger token for the end button. Fixed to the window unless `contained`.

## Do / Don't

- Do ask for microphone permission in your own code, not here.
- Don't pass raw sample arrays as `level`; convert them first.

## Related

- [`AiStates`](../ai-states/README.md)
- [`CopilotChat`](../copilot-chat/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-ai-assistant-voice-call-overlay--docs
