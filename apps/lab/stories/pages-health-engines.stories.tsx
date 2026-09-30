import type { Meta, StoryObj } from "@storybook/react-vite";
import { EnginesPage } from "./_health-pages";

const meta = { title: "Pages/Health/Engines", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <EnginesPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <EnginesPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <EnginesPage /> };
