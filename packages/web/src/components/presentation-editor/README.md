---
name: presentation-editor
title: Presentation editor
category: editors
status: beta
summary: A slide deck editor with a reorderable thumbnail rail, in place editing on layouts, presenter notes and a full screen deck player with keyboard and swipe navigation.
exports: [PresentationEditor, PresentationEditorProps, DeckPlayer, DeckPlayerProps, SlideView, SlideViewProps]
related: [report-editor, rich-text-editor, dialog, repeater]
story: components-editors-presentation-editor
keywords: [presentation, slides, deck, powerpoint, keynote, editor, player, fullscreen, presenter notes, swipe]
---

# Presentation editor

Build a deck from layouts (title, section, content, two columns, quote, image, blank), edit the text right on the slide,
and play it full screen. The `DeckPlayer` can also be used on its own to show any deck.

## When to use

- Short decks made inside the product: pitches, onboarding, reports for a meeting.

## When not to use

- Free form design with shapes and animation: this is layout based on purpose.
- Documents that scroll: use `ReportEditor`.

## Import

```tsx
import { PresentationEditor, DeckPlayer } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
<PresentationEditor
  defaultValue={{ title: "Q3 review", slides: [{ id: "s1", layout: "title", title: "Q3 review", subtitle: "Product team" }] }}
  onSave={async (deck) => {
    await api.save(deck);
  }}
/>

<DeckPlayer deck={deck} open={open} onOpenChange={setOpen} defaultShowNotes />
```

## API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value`, `defaultValue`, `onValueChange` | `Deck` | empty | Title and slides. Controlled or not. |
| `onSave` | `(deck) => Promise<void \| { error?: string }>` | none | Adds Save and the unsaved state. |
| `onPresent` | `(deck, startIndex) => void` | opens its own player | Take over Present. |
| `readOnly` | `boolean` | `false` | Look and play, change nothing. |
| `labels`, `className` | | | English and Arabic built in. |

`DeckPlayer` props: `deck`, `open`, `onOpenChange`, `index` / `defaultIndex` / `onIndexChange`, `fullscreen` (default true), `defaultShowNotes`, `labels`.
`SlideView` draws one 16:9 slide with container units, so it works as a thumbnail, a canvas or the player stage.

## Behaviour

- Drag thumbnails to reorder, or use Move earlier and Move later. Add slide offers every layout; Duplicate and Delete act on the selected slide.
- Player: Right, Space, Enter and Page Down go next, Left and Page Up go back, Home and End jump, N toggles notes with the next slide and a timer, F toggles full screen, Esc exits. Swipe on touch. Controls fade when idle.
- Image addresses are limited to https, http, site relative paths and data images.

## Accessibility

The rail is a list of buttons naming each slide. The player is a modal dialog with a progress bar (`role="progressbar"`) and a live region announcing "Slide 2 of 8".

## RTL

Arrow keys and swipe direction mirror, so "next" is always the way you read. Slide text uses `dir="auto"`.
