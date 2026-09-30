import { EditorTabs } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EditorChromeDemo } from "./_u-demo";

const meta = { title: "Components/Editors/Editor Chrome", component: EditorTabs, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof EditorTabs>;
export default meta;
type Story = StoryObj<typeof meta>;

const args = { tabs: [], activeId: null, onSelect: () => {}, onClose: () => {} };

export const Default: Story = { args, render: () => <EditorChromeDemo /> };
export const Arabic: Story = { args, globals: { locale: "ar" }, render: () => <EditorChromeDemo /> };
