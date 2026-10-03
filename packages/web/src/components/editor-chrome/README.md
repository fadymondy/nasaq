---
name: editor-chrome
title: EditorTabs
category: editors
status: beta
summary: The frame around a document editor with a tab strip of open documents, a status bar for words, cursor and save state, and a backlinks and related panel.
exports: [EditorChromeLabels, EditorTabsProps, EditorTabs, EditorStatusBarProps, EditorStatusBar, EditorLink, EditorBacklinksProps, EditorBacklinks]
related: [notes, rich-text-editor, context-menu, tabs]
story: components-editors-editor-chrome
base-ui: []
keywords: [editor, tabs, status bar, word count, cursor, autosave, backlinks, related, notes]
---

# EditorTabs

Three presentational pieces that turn a bare text area into a document editor: `EditorTabs` (the open documents, like a code editor's tab strip), `EditorStatusBar` (word and character counts, line and column, and whether the text is saved) and `EditorBacklinks` (documents that link here, and related ones). You own the text and the state; the chrome shows it and reports what the person did.

## When to use

- A notes or writing app where several documents can be open at once.
- Any editor that autosaves and needs a calm, always visible save state.
- Knowledge tools that link documents to each other.

## When not to use

- Page-level navigation: use [tabs](../tabs/README.md) (Base UI tabs, panels included). `EditorTabs` has no panels; the editor is yours.
- Editing the rich text itself: use [rich-text-editor](../rich-text-editor/README.md).
- A list of every note: use [notes](../notes/README.md) or `EntityList`.

## Import

```tsx
import { EditorTabs, EditorStatusBar, EditorBacklinks } from "@fadymondy/nasaq/web";
// inside this monorepo: "@nasaq/web"
```

## Quick start

```tsx
import { useState } from "react";
import { EditorBacklinks, EditorStatusBar, EditorTabs, closeEditorTab, editorCursorAt, editorTextStats } from "@fadymondy/nasaq/web";

export function Editor() {
  const [tabs, setTabs] = useState([
    { id: "a", title: "Trip plan", dirty: true },
    { id: "b", title: "Ideas" },
  ]);
  const [active, setActive] = useState<string | null>("a");
  const [text, setText] = useState("Book the flights");
  const [caret, setCaret] = useState(0);
  const stats = editorTextStats(text);
  const { line, column } = editorCursorAt(text, caret);

  return (
    <div className="flex flex-col">
      <EditorTabs
        tabs={tabs}
        activeId={active}
        onSelect={setActive}
        onClose={(id) => {
          const next = closeEditorTab(tabs, active, id);
          setTabs(next.tabs);
          setActive(next.activeId);
        }}
      />
      <textarea value={text} onChange={(e) => setText(e.target.value)} onSelect={(e) => setCaret(e.currentTarget.selectionStart)} />
      <EditorStatusBar words={stats.words} characters={stats.characters} line={line} column={column} saveState="saved" />
    </div>
  );
}
```

## Anatomy

```
EditorTabs         data-slot="editor-tabs"        (inner element has role="tablist")
├─ tab             role="tab", dirty dot, close button
│   (wrapped in ContextMenuActions: close, close others, close all, pin, your tabActions)
└─ new button      (the + button)

EditorStatusBar    data-slot="editor-status-bar"  role="group"
├─ items · words · characters · line/column · selection
└─ save state      data-slot="editor-save-state"  role="status" (role="alert" for error)

EditorBacklinks    data-slot="editor-backlinks"   <aside>
├─ Backlinks list  
└─ Related list
```

## API

### EditorTabs

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `tabs` | `EditorTab[]` | required | `{ id, title, dirty?, pinned?, path? }`. Pinned tabs sort first. |
| `activeId` | `string \| null` | required | The tab whose document is showing. |
| `onSelect` | `(id) => void` | required | A tab was picked. |
| `onClose` | `(id) => void` | none | The tab's close button, middle-click, or Delete on the focused tab. Omit to make tabs permanent. |
| `onNew` | `() => void` | none | Adds the "+" button. |
| `onCloseOthers` / `onCloseAll` / `onPin` | callbacks | none | Add those items to the context menu. |
| `tabActions` | `(tab) => ContextMenuAction[]` | none | Extra context menu items after the built-in ones. |
| `labels` | `EditorChromeLabels` | English or Arabic | Overrides for every string. |

### EditorStatusBar

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `words`, `characters` | `number` | none | Counts, formatted for the locale. Hidden when omitted. |
| `line`, `column` | `number` | none | 1-based caret position. |
| `selection` | `number` | none | Selected characters, shown only above zero. |
| `saveState` | `"saved" \| "saving" \| "dirty" \| "error" \| "offline"` | none | The save state. `error` and `offline` need attention. |
| `onRetry` | `() => void` | none | Shows a Retry button in the error state. |
| `items`, `trailing` | `ReactNode` | none | Extra items at the start and before the save state. |
| `labels` | `EditorChromeLabels` | | String overrides. |

### EditorBacklinks

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `backlinks` | `EditorLink[]` | required | `{ id, title, snippet?, path?, href? }`: documents that link here. |
| `related` | `EditorLink[]` | none | Related documents. |
| `onOpen` | `(link) => void` | none | A link was chosen. |
| `highlight` | `string` | none | Word to mark inside snippets. |
| `labels` | `EditorChromeLabels` | | String overrides. |

### Helpers

Pure functions, also exported: `closeEditorTab(tabs, activeId, id)`, `closeOtherEditorTabs(tabs, activeId, id)`, `orderEditorTabs(tabs)`, `editorTabKeyTarget(ids, currentId, key, dir)`, `editorCursorAt(text, offset)`, `editorTextStats(text)`, `editorSaveNeedsAttention(state)`.

## Examples

```tsx
<EditorTabs tabs={tabs} activeId={active} onSelect={setActive} onClose={close} onNew={createDoc} onPin={pin} onCloseOthers={closeOthers} onCloseAll={closeAll} />
```

```tsx
<EditorStatusBar saveState="error" onRetry={retrySave} words={120} characters={640} line={4} column={12} />
```

```tsx
<EditorBacklinks
  backlinks={[{ id: "1", title: "Weekly review", snippet: "…see [[Trip plan]] for dates…", path: "Journal" }]}
  related={[{ id: "2", title: "Packing list" }]}
  highlight="Trip plan"
  onOpen={(link) => open(link.id)}
/>
```

## Accessibility

| Key | Action |
| --- | --- |
| Arrow keys | Move between tabs (Left and Right swap in RTL). |
| Home, End | First and last tab. |
| Enter, Space | Select the focused tab. |
| Delete | Close the focused tab (when `onClose` is set). |
| Shift+F10, Menu key | Open the tab's context menu. |

- The strip is a `tablist` with a roving tab stop. A dirty tab has visually hidden text "Unsaved changes", not only a dot.
- The save state is a `role="status"` live region; the error state is `role="alert"`. Every state has an icon and text, never colour alone.
- Localise `labels` when the app has its own wording.

## RTL & i18n

- The strip, arrows and counts follow the Nasaq direction. Left and Right arrows swap in RTL.
- Counts use the locale's formatting with Latin digits by default. Document titles use `dir="auto"`.
- Line and column labels are localised ("Ln 4" and "سطر 4").

## Styling & tokens

Uses `--nq-*` surface, border, selected and focus tokens. Target `data-slot`, and `data-active` and `data-dirty` on tabs. Extend with `className`.

## Do / Don't

- Do keep the save state visible. Autosave without feedback makes people press Ctrl+S anyway.
- Do close a tab and move to its neighbour (`closeEditorTab` does this).
- Don't use the tab strip for navigation between app sections.
- Don't hide a failed save behind a toast. The status bar keeps it in view.

## Related

- [notes](../notes/README.md), [rich-text-editor](../rich-text-editor/README.md), [context-menu](../context-menu/README.md), [tabs](../tabs/README.md)

## Lab

https://docs.nasaqui.com/?path=/docs/components-editors-editor-chrome--docs
