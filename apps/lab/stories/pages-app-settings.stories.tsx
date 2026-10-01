import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsDemo } from "./_admin-demo";

const meta = { title: "Components/Account/Pages/Settings", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SettingsDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SettingsDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <SettingsDemo /> };
