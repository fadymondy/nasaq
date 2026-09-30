import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopilotPage } from "./_copilot-demo";

const meta = { title: "Pages/App/Copilot", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <CopilotPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CopilotPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <CopilotPage /> };
