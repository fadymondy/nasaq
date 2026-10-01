import type { Meta, StoryObj } from "@storybook/react-vite";
import { EngineDetailsPage } from "./_health-pages";

const meta = { title: "Components/Wellness/Pages/Engine Details", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <EngineDetailsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <EngineDetailsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <EngineDetailsPage /> };
