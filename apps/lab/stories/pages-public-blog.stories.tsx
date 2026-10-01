/* The blog index: featured post, category and tag filters, search, post cards and pagination. Fake posts. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BlogIndexDemo } from "./_x5-demo";

const meta = { title: "Components/Website/Pages/Blog", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <BlogIndexDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BlogIndexDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <BlogIndexDemo /> };
export const Empty: Story = { render: () => <BlogIndexDemo empty /> };
