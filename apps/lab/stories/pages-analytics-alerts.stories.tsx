/* An alerts page: monitoring and security alerts in tabs, with a live connection banner that reacts to a drop. */
import { Tabs, TabsList, TabsPanel, TabsTab, WsStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertsDemo, SecurityAlertsDemo, useAr, useFakeSocket } from "./_ops-demo";

const meta = { title: "Components/Alerts & Notifications/Pages/Alerts", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ drop = false }: { drop?: boolean }) {
  const ar = useAr();
  const socket = useFakeSocket({ autoDrop: drop });
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "التنبيهات" : "Alerts"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "ما يحتاج انتباهك الآن، من المراقبة والأمان." : "What needs your attention now, from monitoring and security."}</p>
      </header>
      {socket.state === "connected" || socket.state === "connecting" ? (
        <div>
          <WsStatus state={socket.state} latencyMs={socket.latencyMs} onRetry={socket.connect} />
        </div>
      ) : (
        <WsStatus variant="banner" state={socket.state} retryAt={socket.retryAt} attempt={socket.attempt} lastConnectedAt={socket.lastConnectedAt} onRetry={socket.connect} />
      )}
      <Tabs defaultValue="monitoring">
        <TabsList>
          <TabsTab value="monitoring">{ar ? "المراقبة" : "Monitoring"}</TabsTab>
          <TabsTab value="security">{ar ? "الأمان" : "Security"}</TabsTab>
        </TabsList>
        <TabsPanel value="monitoring">
          <AlertsDemo />
        </TabsPanel>
        <TabsPanel value="security">
          <SecurityAlertsDemo />
        </TabsPanel>
      </Tabs>
    </main>
  );
}

/** Two tabs: monitoring and security. Acknowledge, resolve, reopen, Block IP. The connection drops by itself after 20 seconds. */
export const Default: Story = { render: () => <Page drop /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page drop /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
