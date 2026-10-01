/* The owner's public profile: hero, about, experience, skills, projects, writing, testimonials, contact, with personal widgets. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProfilePageDemo } from "./_x5-demo";

const meta = { title: "Components/Website/Pages/Profile", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ProfilePageDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProfilePageDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProfilePageDemo /> };
