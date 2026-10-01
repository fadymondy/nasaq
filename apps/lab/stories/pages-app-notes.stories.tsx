/* The notes screen: notebooks, list or board, editor, context menus and shortcuts. The whole screen lives in ./_zekra-notes-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesPage } from "./_zekra-notes-demo";

const meta = { title: "Components/Editors/Pages/Notes", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <NotesPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <NotesPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <NotesPage /> };
