/*
 * YouTube page: the report, the connect screen and the loading and error states. Real component, deterministic
 * demo data, fake async callbacks. No brand logo is drawn: only official assets may be used, so the name is text.
 */
import { YouTubeChannelPage } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { youtubeReport, useAr, useDemoConnection, useDemoReport, wait } from "./_analytics-demo";

const meta = { title: "Pages/Analytics/YouTube", component: YouTubeChannelPage, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof YouTubeChannelPage>;
export default meta;
type Story = StoryObj;

function Demo({ initial = "connected", failing = false }: { initial?: "connected" | "disconnected" | "needs-reauth"; failing?: boolean }) {
  const ar = useAr();
  const conn = useDemoConnection("youtube", initial);
  const [period, setPeriod] = useState(28);
  const [attempt, setAttempt] = useState(0);
  const report = useDemoReport(() => youtubeReport(period, ar), `${period}-${ar}-${attempt}`, conn.connected && !(failing && attempt === 0));
  const broken = failing && attempt === 0;
  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-8">
      <YouTubeChannelPage
        service={conn.service}
        data={report.data}
        period={period}
        onPeriodChange={setPeriod}
        loading={report.loading && !broken}
        error={broken ? (ar ? "انتهت مهلة الطلب. لم نتمكن من الوصول إلى الخدمة." : "The request timed out. We could not reach the service.") : undefined}
        onRetry={() => wait(300).then(() => setAttempt(1))}
        onRefresh={report.onRefresh}
        refreshing={report.refreshing}
        updatedAt={report.updatedAt}
        onConnect={conn.onConnect}
        onDisconnect={conn.onDisconnect}
        onSelectAccount={conn.onSelectAccount}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
export const ConnectAccount: Story = { render: () => <Demo initial="disconnected" /> };
export const ConnectAccountArabic: Story = { globals: { locale: "ar" }, render: () => <Demo initial="disconnected" /> };
export const SignInExpired: Story = { render: () => <Demo initial="needs-reauth" /> };
export const LoadError: Story = { render: () => <Demo failing /> };
