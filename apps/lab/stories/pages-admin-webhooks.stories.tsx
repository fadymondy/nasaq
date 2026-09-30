/* Webhooks page: endpoints, deliveries and inbound sources. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { WebhooksDemo, useAr } from "./_infra-admin-demo";

const meta = { title: "Pages/Admin/Webhooks", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="sr-only">{ar ? "الويب هوك" : "Webhooks"}</h1>
      <WebhooksDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
