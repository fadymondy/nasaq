/*
 * The customer's portal as a page: their project at a glance, the board, requests, hours, invoices and activity.
 * Real components, fake async callbacks. Ask for something on the Requests tab; drafts never show in Invoices.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalDemo } from "./_r2-portal";

const meta = { title: "Pages/CRM/Client portal", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <PortalDemo />
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
