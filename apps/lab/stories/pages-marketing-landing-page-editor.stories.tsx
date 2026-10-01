/* Landing page editor: sections outline, live preview and inspector. Demo data lives in ./_builders-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { LandingEditorPage } from "./_builders-demo";

const meta = { title: "Components/Editors/Pages/Landing Page Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LandingEditorPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LandingEditorPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <LandingEditorPage /> };
