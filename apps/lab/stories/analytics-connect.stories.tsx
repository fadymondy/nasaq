import { AnalyticsConnect } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type DemoKind, useAr, useDemoConnection } from "./_analytics-demo";

const meta = { title: "Components/Integrations/Analytics Connect", component: AnalyticsConnect, parameters: { layout: "padded" } } satisfies Meta<typeof AnalyticsConnect>;
export default meta;
type Story = StoryObj;

function Demo({ kind = "ga", initial = "disconnected" }: { kind?: DemoKind; initial?: "disconnected" | "needs-reauth" | "connected" }) {
  const ar = useAr();
  const conn = useDemoConnection(kind, initial);
  return (
    <AnalyticsConnect
      service={conn.service}
      benefits={ar ? ["الزيارات والمستخدمون مقارنة بالفترة السابقة", "المصادر وأكثر الصفحات", "الدول والأجهزة"] : ["Traffic and users against the previous period", "Sources and top pages", "Countries and devices"]}
      onConnect={conn.onConnect}
      onDisconnect={conn.onDisconnect}
      onSelectAccount={conn.onSelectAccount}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const SignInExpired: Story = { render: () => <Demo initial="needs-reauth" /> };
export const YouTube: Story = { render: () => <Demo kind="youtube" /> };
