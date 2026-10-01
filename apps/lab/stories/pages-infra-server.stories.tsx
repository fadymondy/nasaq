/* A server page: status and live meters, power controls, snapshots, plus the firewall and HTTP rules of that server. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NetworkDemo, ServerDemo, useAr } from "./_infra-demo";

const meta = { title: "Components/Server Tools/Pages/Server", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "الخوادم" : "Servers"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "تحكم في الخادم ولقطاته وقواعد الشبكة الخاصة به." : "Control the server, its snapshots and its network rules."}</p>
      </header>
      <ServerDemo />
      <NetworkDemo />
    </main>
  );
}

/** Restart the server and watch the status change, take a snapshot, then stage a firewall change and Apply. */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
