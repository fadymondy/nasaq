import type { Meta, StoryObj } from "@storybook/react-vite";
import { EditorChromeDemo } from "./_u-demo";

const meta = { title: "Components/Editors/Pages/Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <EditorChromeDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <EditorChromeDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <EditorChromeDemo /> };
