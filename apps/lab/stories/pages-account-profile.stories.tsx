/*
 * Account settings, opened on the Profile section. The whole screen lives in ./_settings-page.tsx,
 * shared with the other Pages/Account story, so every section shows its real components.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsPage } from "./_settings-page";

const meta = { title: "Components/Account/Pages/Profile", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SettingsPage section="profile" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <SettingsPage section="profile" /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <SettingsPage section="profile" /> };
