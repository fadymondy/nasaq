import type { Meta, StoryObj } from "@storybook/react-vite";
import { IntegrationDemo } from "./_connectors-demo";

const meta = { title: "Components/Integrations/Integration Connector" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Connected, needs sign-in again, disconnected and failed, all in one list. Connect asks for scopes first; disconnect asks to confirm. */
export const Default: Story = { render: () => <IntegrationDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <IntegrationDemo /> };
