import type { Meta, StoryObj } from "@storybook/react-vite";
import { LobbyPage } from "./_seatfor-pages";

const meta = { title: "Components/Bookings/Pages/Lobby Display", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LobbyPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LobbyPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <LobbyPage /> };

/** The board as a 1920 by 1080 television shows it. Scroll to see all of it, or zoom out. */
export const LargeScreen: Story = {
  globals: { viewport: { value: "desktop" } },
  render: () => (
    <div className="overflow-auto">
      <LobbyPage large />
    </div>
  ),
};
