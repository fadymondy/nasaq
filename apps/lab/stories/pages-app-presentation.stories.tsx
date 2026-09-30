import type { Meta, StoryObj } from "@storybook/react-vite";
import { PresentationPage } from "./_editors-demo";

const meta = { title: "Pages/App/Presentation Editor", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <PresentationPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <PresentationPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <PresentationPage /> };
