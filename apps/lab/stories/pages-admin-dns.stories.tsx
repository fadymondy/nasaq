/* A domain settings page: the zone DNS records with add, edit, proxy and delete. Fake provider. */
import { Alert, Badge } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DNS_ZONE, DnsDemo, useAr } from "./_ops-demo";

const meta = { title: "Components/Server Tools/Pages/DNS", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h2 text-foreground">{ar ? "إعدادات النطاق" : "Domain settings"}</h1>
          <Badge variant="success">{ar ? "نشط" : "Active"}</Badge>
        </div>
        <p className="text-body text-muted-foreground">
          {ar ? "سجلات DNS للنطاق " : "DNS records for "}
          <bdi dir="ltr" className="text-foreground">
            {DNS_ZONE}
          </bdi>
        </p>
      </header>
      <Alert tone="info">{ar ? "قد يستغرق انتشار التغييرات حتى ساعة بحسب قيمة TTL." : "Changes can take up to an hour to spread, depending on the TTL."}</Alert>
      <DnsDemo />
    </main>
  );
}

/** Add a record (try an invalid IP), flip a proxy, delete with the confirm. */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
