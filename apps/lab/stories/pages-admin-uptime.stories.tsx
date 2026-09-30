/* Admin uptime page: monitors with period switch and incidents, and the status page manager under it. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusManagerDemo, UptimeDemo, useAr } from "./_infra-demo";

const meta = { title: "Pages/Admin/Uptime and Status Page", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "وقت التشغيل" : "Uptime"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "راقب خدماتك وانشر حالتها لعملائك." : "Watch your services and publish their status to customers."}</p>
      </header>
      <UptimeDemo />
      <StatusManagerDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
