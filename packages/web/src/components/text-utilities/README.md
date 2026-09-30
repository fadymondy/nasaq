---
name: text-utilities
title: Linkify
category: utilities
status: beta
summary: Small text helpers for user content. Linkify safe links, bidi-isolated UserText, a translation toggle, scroll fades, an optimistic save button and progressive reveal.
exports: [Linkify, UserText, TranslatableText, ScrollFade, BookmarkButton, ProgressiveReveal, ProgressiveList, LinkifyProps, UserTextProps, TranslatableTextProps, ScrollFadeProps, BookmarkButtonProps, ProgressiveRevealProps, ProgressiveListProps, TextUtilitiesLabels, TranslateResult]
related: [bidi-text, copy-button, empty-state]
story: components-utilities-text-utilities
base-ui: []
keywords: [linkify, url, bidi, user text, translate, scroll, fade, bookmark, save, show more, reveal]
---

# Text utilities

Seven small parts for text people wrote. `Linkify` turns http, https, www and email addresses into links. `UserText`
isolates a name or message so its direction never scrambles the sentence around it. `TranslatableText` toggles between
the original and a translation. `ScrollFade` fades the edge of a sideways-scrolling row. `BookmarkButton` saves
optimistically. `ProgressiveReveal` and `ProgressiveList` show more on demand.

## When to use

- Chat messages, comments, notes and titles that may contain links and either script: `UserText` with `linkify`.
- A toggle for machine translation: `TranslatableText`.
- A chip row or tab row wider than its container: `ScrollFade`.

## When not to use

- Rich text or Markdown: render it with a sanitising renderer. `Linkify` only scans plain strings and never parses HTML.

## Import

```tsx
import { Linkify, UserText, TranslatableText, ScrollFade, BookmarkButton, ProgressiveReveal, ProgressiveList } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
import { UserText, BookmarkButton } from "@fadymondy/nasaq/web";

export function Example({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2">
      <UserText block lines={3} linkify>{message}</UserText>
      <BookmarkButton onSavedChange={async (saved) => { await save(saved); }} />
    </div>
  );
}
```

## API

| Component | Prop | Description |
| --- | --- | --- |
| `Linkify` | `children: string`, `emails` (true), `linkClassName`, `renderLink` | Only safe schemes. Trailing punctuation is left out of the link. Arabic punctuation ends a URL. Bare domains are not linked. |
| `UserText` | `block`, `lines`, `linkify`, `as` | `dir="auto"`, isolated, aligned to the start edge. `lines` clamps and puts the full text in `title`. |
| `TranslatableText` | `original`, `translation`, `sourceLang`, `targetLang`, `onTranslate`, `defaultShowTranslation`, `lines`, `linkify` | `onTranslate` runs once, the result is kept. Resolve `{ error }` to show a retry. |
| `ScrollFade` | `fadeSize` (32), `label`, `contentClassName` | Fades only the edge with more content. Direction follows the layout. |
| `BookmarkButton` | `saved` / `defaultSaved`, `onSavedChange`, `showLabel` | Flips at once, reverts if the promise rejects or resolves `{ error }`. |
| `ProgressiveReveal` | `collapsedHeight` (96), `expanded` / `defaultExpanded`, `onExpandedChange` | The button appears only when the content is taller than the limit. |
| `ProgressiveList` | `items`, `initial` (3), `step` (3), `onReveal` | Shows the count left. |

All take `labels` (`TextUtilitiesLabels`) to override the en and ar strings. Pure helpers with no React are also
exported: `linkifyText`, `linkifyTrim`, `scrollFadeState`, `scrollFadeMask`, `progressiveNextCount`, `progressiveRemaining`.

## Accessibility

- Links are real anchors with `rel="noopener noreferrer"`.
- `ScrollFade` is a labelled, focusable region while it scrolls, so it can be moved with the arrow keys.
- `BookmarkButton` uses `aria-pressed` and a polite live region for saved, removed and failed.
- `ProgressiveReveal` drives `aria-expanded` on a real button.

## RTL & i18n

URLs and emails are left to right inside Arabic text. `ScrollFade` reads the computed direction and uses the absolute
scroll offset, so the start fade sits on the right in Arabic. Strings are en and ar.

## Styling & tokens

Semantic tokens only. Extend with `className`, `linkClassName` and `contentClassName`.

## Do / Don't

- Do pass plain strings to `Linkify` and `UserText`.
- Do not use `dangerouslySetInnerHTML` to add links.
- Do not link bare domains: people write "file.txt" and "e.g".

## Related

- [BidiText](../bidi-text/README.md)
- [CopyButton](../copy-button/README.md)

## Lab

https://nasaq-ui.fadymondy.com/?path=/docs/components-utilities-text-utilities--docs
