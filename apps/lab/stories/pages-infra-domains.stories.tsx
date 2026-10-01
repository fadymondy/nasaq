/* Domains and proxy hosts on one page: custom domains with their DNS check, and the reverse-proxy hosts behind them. Fake data. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DomainsDemo, ProxyDemo, useAr } from "./_infra-demo";

const meta = { title: "Components/Server Tools/Pages/Domains and Proxy", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "النطاقات والوكيل" : "Domains and proxy"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "اربط نطاقاتك ووجّه الطلبات إلى تطبيقاتك." : "Connect your domains and route requests to your apps."}</p>
      </header>
      <DomainsDemo />
      <ProxyDemo />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
