/* A blog post: cover, byline, reading progress, sticky table of contents, markdown body with code and callouts, share, related, prev/next, comments slot. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BlogPostDemo } from "./_x5-demo";

const meta = { title: "Pages/Public/Blog Post", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <BlogPostDemo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <BlogPostDemo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <BlogPostDemo /> };
