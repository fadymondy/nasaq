/* Projects overview: table and cards, search, filters, bulk select and export. The whole screen lives in ./_crm-demo.tsx. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProjectsPage } from "./_crm-demo";

const meta = { title: "Pages/App/Projects", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <ProjectsPage /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ProjectsPage /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <ProjectsPage /> };
