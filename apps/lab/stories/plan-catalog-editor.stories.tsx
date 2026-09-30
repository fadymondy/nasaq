import type { Meta, StoryObj } from "@storybook/react-vite";
import { CatalogDemo } from "./_usage-demo";

const meta = { title: "Components/Commerce/Plan Catalog Editor", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Edit any tab, then Review and apply: the dry run lists what will be added, updated and removed. */
export const Default: Story = { render: () => <CatalogDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CatalogDemo /> };
