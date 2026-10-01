import type { Meta, StoryObj } from "@storybook/react-vite";
import { DatabaseDemo } from "./_explorer-demo";

const meta = { title: "Components/Server Tools/Database Explorer" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Pick a table to load its rows and structure, or edit the SQL and press Ctrl+Enter. Try an UPDATE to see the write confirm. */
export const Default: Story = { render: () => <DatabaseDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <DatabaseDemo ar /> };
