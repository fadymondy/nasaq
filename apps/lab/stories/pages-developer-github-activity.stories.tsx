/*
 * A repository page: the live connection, a few numbers, and the GitHub activity card with commits, pull
 * requests, workflow runs and deployments. Real components, fake data and async callbacks.
 */
import { Alert, Card, CardContent, Num, WsStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { GithubActivityDemo, samplePulls, sampleRuns, useAr, useFakeSocket } from "./_ops-demo";

const meta = { title: "Components/Developer Tools/Pages/GitHub Activity", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const socket = useFakeSocket();
  const pulls = samplePulls(ar);
  const runs = sampleRuns(ar);
  const stats = [
    { label: ar ? "طلبات دمج مفتوحة" : "Open pull requests", value: pulls.filter((p) => p.state === "open" || p.state === "draft").length },
    { label: ar ? "تشغيلات ناجحة" : "Passing runs", value: runs.filter((r) => r.status === "success").length },
    { label: ar ? "تشغيلات فاشلة" : "Failed runs", value: runs.filter((r) => r.status === "failure").length },
  ];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-foreground">{ar ? "المستودع" : "Repository"}</h1>
          <p className="text-body text-muted-foreground">{ar ? "آخر ما جرى في الشيفرة والبناء والنشر." : "What just happened in code, CI and deploys."}</p>
        </div>
        <WsStatus state={socket.state} latencyMs={socket.latencyMs} retryAt={socket.retryAt} onRetry={socket.connect} />
      </header>
      <section aria-label={ar ? "ملخص" : "Summary"} className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-1 pt-4">
              <span className="text-caption text-muted-foreground">{s.label}</span>
              <span className="text-h2 text-foreground">
                <Num value={s.value} />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
      <Alert tone="warning">{ar ? "فشل آخر تشغيل على الفرع feat/checkout-bundle. راجع التشغيل قبل الدمج." : "The last run on feat/checkout-bundle failed. Check it before merging."}</Alert>
      <GithubActivityDemo />
    </main>
  );
}

/** Refresh, Deploy and Re-run are fake. The connection badge has its own fake socket. */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
