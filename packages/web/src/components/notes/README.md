---
name: notes
title: Notes
category: editors
status: beta
summary: A notes workspace with notebooks and tags, a list and a coloured board, search and sort, pinned and sealed notes, and an editor with a rich or Markdown body, backlinks, properties, word count, an autosave state, a context menu, an actions menu and keyboard shortcuts, driven by callbacks.
exports: [Notes, NotesProps, NotesSidebar, NotesSidebarProps]
related: [rich-text-editor, markdown, context-menu, tree-view, tag-input, color-picker, password-input, share-action, export-action, entity-list]
story: components-editors-notes
base-ui: [menu, dialog, alert-dialog]
keywords: [notes, notebook, editor, markdown, backlinks, wikilink, pinned, sealed, password, autosave, board, context menu]
---

# Notes

A notes app in three parts: a sidebar of notebooks and tags, a list (or a coloured board) of notes, and the editor.
It stores nothing. You pass `notes` and `notebooks`, the component calls your callbacks, you update your state.
Use the parts alone as `NotesView` and `NoteEditor`, or together as `Notes`.

## When to use

- A personal or team notes area with notebooks, tags, pinned notes and a body that can be rich text or Markdown.
- Any screen that needs one note surface with the same actions in the list, the editor and the keyboard.

## When not to use

- A single rich text field in a form: use [`RichTextEditor`](../rich-text-editor/README.md).
- A generic list of records: use [`EntityList`](../entity-list/README.md).

## Import

```tsx
import { Notes, NotesView, NoteEditor, type Note, type Notebook } from "@fadymondy/nasaq/web";
```

## Quick start

```tsx
const [notes, setNotes] = useState<Note[]>(initial);
const patch = (id: string, p: Partial<Note>) => setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...p, updatedAt: Date.now() } : n)));

<Notes
  notes={notes}
  notebooks={notebooks}
  onUpdate={async (id, p) => patch(id, p)}
  onCreate={async () => {
    const id = crypto.randomUUID();
    setNotes((all) => [{ id, title: "", body: "", createdAt: Date.now(), updatedAt: Date.now() }, ...all]);
    return { id };
  }}
  onDelete={async (id) => setNotes((all) => all.filter((n) => n.id !== id))}
  onDuplicate={async (copy) => setNotes((all) => [copy, ...all])}
  shareUrl={(n) => `https://app.example.com/n/${n.id}`}
/>
```

An action whose callback is missing is left out of the menus (no `onDuplicate`, no Duplicate).

## Anatomy

- `NotesSidebar`: All, Pinned, Sealed, Archive, notebooks as a tree, tags. Hidden on narrow containers, where a chip bar does the same job.
- `NotesView`: search, New note, sort, list or board toggle, a "⋯" menu for the list (export, notebooks), then the notes in sections (Pinned, Today, Yesterday, and so on).
- `NoteEditor`: header (save state, pin, share, "⋯"), title, properties (notebook, tags, colour), body, footer (words, reading time, links).
- Dialogs for move, tags, colour, share, export, seal, remove seal and delete, shared by every surface.

## API

`Notes` props: `notes`, `notebooks`, `activeId` / `defaultActiveId` / `onActiveChange`, `onCreate` (return `{ id }` to open it), `onUpdate(id, patch)`, `onDuplicate(copy)`, `onDelete(id)`, `onSeal`, `onRemoveSeal`, `onUnlock`, `onNotebookCreate` / `onNotebookRename` / `onNotebookDelete`, `shareUrl`, `shareProps`, `onExport`, `newId`, `defaultScope`, `defaultSort`, `defaultView`, `loading`, `error`, `onRetry`, `autosaveDelay`, `labels`, `now`.

Callbacks return a promise. Resolve `{ error: "message" }` to show a failure; throwing shows a generic one.

`Note`: `id`, `title`, `body`, `format` (`rich` HTML, or `markdown`), `notebookId`, `tags`, `color`, `pinned`, `archived`, `sealed`, `createdAt`, `updatedAt`.

`NotesView` (also `menu`, `scope`, `query`, `sort`, `view` controlled props, `showScopeBar`) and `NoteEditor` (`note`, `onBack`, `onOpenNote`, `onUnlock`, `menu`) take the same callbacks. Pass one `useNoteMenu()` result as `menu` to share dialogs, as `Notes` does.

Pure helpers: `filterNotes`, `sortNotes`, `groupNotes`, `scopeCounts`, `backlinksOf`, `exportNote`, `duplicateNote`, `applyMarkdownFormat`, `htmlToMarkdown`, `saveReducer`, `matchNoteShortcut`.

## Sealed notes

A sealed note keeps its title and tags visible and hides its body until it is unlocked for the session. `Notes` remembers which ids are open; `onUnlock` checks the password. The component never sees the ciphertext: your server must withhold the body of a sealed note until the password is verified, and search must not index it. Nothing in the browser is a security boundary.

## Context menu

Every note in the list and board, and the editor header and properties, has a context menu (context-click, long-press, Shift+F10 or the Menu key) and a "⋯" button with the same actions: open, pin, colour, tags, move, duplicate, share, export, seal or lock, archive, delete. Inside the note text the browser keeps its own menu so spelling and paste work; use the Format menu and Ctrl+B, Ctrl+I, Ctrl+K in Markdown notes.

## Keyboard

| Keys | Action |
| --- | --- |
| Ctrl+N or Alt+N (Cmd+N on Mac) | New note |
| Mod+Shift+P | Pin or unpin |
| Mod+Shift+A | Archive or restore |
| Mod+Shift+D | Duplicate |
| Mod+Shift+L | Seal, lock or remove the seal |
| Mod+Shift+F | Focus search |
| Alt+M | Open the note actions menu |
| Shift+F10 or Menu | Context menu on the focused note |
| Delete | Delete the focused note (asks first) |
| Up and Down | Move between notes |
| Mod+S | Save now |

Shortcuts match the key position, so they work on an Arabic layout.

## Autosave

Edits are saved after `autosaveDelay` (800 ms) of quiet, on blur, on Mod+S and when the note closes. The header shows Unsaved, Saving, Saved or a failure with a Save now button. A change made during a save saves again.

## Accessibility

- The list is real lists with buttons; the open note has `aria-current`.
- The save state is a polite live region; errors use `role="alert"`.
- Every icon button has a label; the "⋯" buttons name the note.
- Coloured notes never rely on colour alone: pinned and sealed notes show an icon with a label.

## RTL & i18n

English and Arabic strings ship; pass `labels` to override any. Titles and snippets use `dir="auto"`, numbers and dates follow the Nasaq numbering, and the sidebar, back arrow and menus mirror.

## Styling & tokens

Colours are the `--nq-tag-<hue>` and `-soft` tokens. Layout uses container queries, so it adapts to the space it is given, not the window.

## Do / Don't

- Do return the new id from `onCreate` so the note opens.
- Do withhold sealed bodies on the server.
- Don't store the unlock password.
- Don't rely on the seal as encryption in the browser.

## Related

[`RichTextEditor`](../rich-text-editor/README.md), [`Markdown`](../markdown/README.md), [`ContextMenu`](../context-menu/README.md), [`TreeView`](../tree-view/README.md), [`ShareAction`](../share-action/README.md), [`ExportAction`](../export-action/README.md).

## Lab

`Components/Editors/Notes` and `Pages/App/Notes` (Default, Arabic, Mobile).
