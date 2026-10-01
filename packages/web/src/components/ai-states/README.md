---
name: ai-states
title: AI States
category: ai
status: beta
summary: The states of an AI feature. Smart actions (sparkle button, split button, suggestion chips, Cmd or Ctrl J menu), loading (thinking indicator, shimmer, step labels), generating (streaming text with a caret, stop and regenerate, safe partial Markdown) and summarized (TL;DR card with key points, sources, confidence, feedback).
exports: [AiStatesLabels, AiAction, AiSparkleButton, AiSplitButton, AiSuggestionChips, AiActionMenu, AiThinking, AiShimmer, AiStreamingText, AiStreamState, AiStreamControls, AiGeneratedLabel, AiConfidenceMeter, AiFeedback, AiSummary, usePrefersReducedMotion, confidenceLevel, confidencePercent, stepState, cycleIndex, nextRevealLength, safePartialMarkdown, scoreAction, groupAiActions, summaryToText, AiSparkleButtonProps, AiSplitButtonProps, AiSuggestionChipsProps, AiActionMenuProps, AiThinkingProps, AiShimmerProps, AiStreamingTextProps, AiStreamControlsProps, AiGeneratedLabelProps, AiConfidenceMeterProps, AiFeedbackProps, AiSummaryProps, AiActionGroups, AiActionLike, AiConfidence, AiStepState]
related: [copilot-chat, markdown, spinner, states, chat, command-palette]
story: components-ai-assistant-ai-states
base-ui: [autocomplete, dialog, menu, collapsible]
keywords: [ai, sparkle, streaming, typing, caret, thinking, shimmer, summary, tldr, citations, confidence, regenerate, action menu]
---

# AI States

Small pieces for every state an AI feature goes through: offering an action, waiting, streaming an answer and
showing a finished summary. They hold no model logic. You call the model, and feed the text and the state in.

## When to use

- A button, menu or chip row that starts an AI action inside your product.
- Any wait or stream that comes from a model.
- A summary of a document, thread or page.

## When not to use

- A full assistant conversation: use [`CopilotChat`](../copilot-chat/README.md).
- A plain busy state with no AI: use [`Spinner`](../spinner/README.md) or `Skeleton`.

## Import

```tsx
import { AiSummary } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { AiActionMenu, AiStreamControls, AiStreamingText, type AiStreamState } from "@fadymondy/nasaq/web";

export function Answer({ text, state, stop, retry }: { text: string; state: AiStreamState; stop: () => void; retry: () => void }) {
  return (
    <>
      <AiStreamControls state={state} onStop={stop} onRegenerate={retry} />
      <AiStreamingText text={text} streaming={state === "streaming"} />
      <AiActionMenu actions={[{ id: "summarize", label: "Summarize", recommended: true }]} onAction={(id) => console.log(id)} />
    </>
  );
}
```

## Anatomy

```
AiSparkleButton / AiSplitButton      Button with the sparkle, split button with a menu of other actions
AiSuggestionChips                    row of inline chips, optional dismiss
AiActionMenu                         Dialog with a search box and Recommended and All actions (Mod J)
AiThinking / AiShimmer               status text with dots and step labels, shimmer skeleton lines
AiStreamingText                      Markdown that stays valid while half written, caret, progressive reveal
AiStreamControls                     Stop while streaming, Regenerate after
AiSummary                            Card: label, TL;DR, key points, expand, sources, confidence, actions
├─ AiGeneratedLabel                  "AI generated" with the model name
├─ AiConfidenceMeter                 High, medium or low with the percent
└─ AiFeedback                        thumbs up and down
```

## API

| Component | Main props |
| --- | --- |
| `AiSparkleButton` | Button props plus `generating`, `showShortcut`, `labels`. |
| `AiSplitButton` | `label`, `onRun`, `actions`, `onAction(id)`, `generating`, `disabled`, `variant`. |
| `AiSuggestionChips` | `suggestions`, `onPick(id)`, `onDismiss(id)`, `label`. |
| `AiActionMenu` | `actions`, `onAction(id)`, `open`, `onOpenChange`, `hotkey` (default true), `placeholder`. |
| `AiThinking` | `label`, `steps`, `current` (else cycles every `interval` ms), `compact`. |
| `AiShimmer` | `lines`, `label`. |
| `AiStreamingText` | `text`, `streaming`, `reveal`, `cps` (default 90), `markdown`, `caret`, `onRevealed`. |
| `AiStreamControls` | `state` (`idle`, `streaming`, `stopped`, `done`, `error`), `onStop`, `onRegenerate`. |
| `AiSummary` | `tldr`, `points`, `full`, `sources`, `confidence` (0 to 1), `model`, `title`, `loading`, `streaming`, `defaultExpanded`, `feedback`, `onFeedback`, `onCopy(text)`, `onRegenerate`. |

`AiAction` is `{ id, label, icon?, description?, keywords?, recommended?, shortcut?, disabled? }`. Every component takes a
`labels` override. Sources are `CopilotSource` (`{ id, title, url?, snippet? }`). Pure helpers, tested:
`safePartialMarkdown`, `nextRevealLength`, `groupAiActions`, `confidenceLevel`, `summaryToText`.

## Examples

**Summary with sources and feedback**

```tsx
import { AiSummary } from "@fadymondy/nasaq/web";

export const Card = () => (
  <AiSummary
    tldr="Scope must freeze before the review."
    points={["Freeze Tuesday", "Run the checklist"]}
    full="Longer **Markdown** text."
    sources={[{ id: "1", title: "Handbook", url: "https://example.com" }]}
    confidence={0.82}
    onFeedback={(v) => console.log(v)}
  />
);
```

## Accessibility

- The reveal is announced once when the answer is ready, not on every token. Streaming sets `aria-busy`.
- Thinking is a `role="status"` line with text. Confidence is text and a bar, never colour alone.
- Cmd or Ctrl J opens a real dialog with a listbox. Arrow keys move, Enter runs, Escape closes and focus returns.
- Icon buttons have names. Thumbs are toggle buttons with `aria-pressed`.
- With `prefers-reduced-motion` the shimmer stops, the dots and caret do not pulse, and the text appears at once.

## RTL & i18n

English and Arabic follow the Nasaq locale; override with `labels`. Streamed text uses `dir="auto"`, the shimmer sweep
reverses, and directional icons flip. Shortcuts and code stay left to right.

## Styling & tokens

Tokens only (`bg-nq-accent`, `border-border`, `text-muted-foreground`). No custom CSS: motion uses Tailwind
`motion-safe:` classes and the Web Animations API, so the component installs from the registry as is.

## Do / Don't

- Do label AI output as AI generated and offer stop and regenerate.
- Do show sources when the answer cites them.
- Don't hide the Stop button while streaming.
- Don't present a low confidence result as fact.

## Related

[`CopilotChat`](../copilot-chat/README.md), [`Markdown`](../markdown/README.md), [`Spinner`](../spinner/README.md), [`States`](../states/README.md).
