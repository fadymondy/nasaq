import type { Meta, StoryObj } from "@storybook/react-vite";
import { NoteEditorDemo, NotesPage, NotesViewDemo } from "./_zekra-notes-demo";

const meta = { title: "Components/Editors/Notes", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

const full = { layout: "fullscreen", nasaq: { fullBleed: true } };

/** The full workspace: notebooks, list, editor. Context-click a note, press Shift+F10, or Alt+N for a new one. */
export const Default: Story = { parameters: full, render: () => <NotesPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, parameters: full, render: () => <NotesPage /> };
export const Board: Story = { render: () => <NotesViewDemo defaultView="grid" /> };
export const List: Story = { render: () => <NotesViewDemo /> };
export const Editor: Story = { render: () => <NoteEditorDemo /> };
export const MarkdownEditor: Story = { render: () => <NoteEditorDemo markdown /> };
export const SealedNote: Story = { render: () => <NoteEditorDemo noteId="n4" /> };
export const EditorArabic: Story = { globals: { locale: "ar" }, render: () => <NoteEditorDemo /> };
