/*
 * A deployment page: the run with its steps, the live log stream, a terminal for the build output, and the
 * environment variables. Real components, fake async callbacks.
 */
import { Badge, Button, CommandSnippet, DeployView, EnvList, type EnvVariable, LogViewer, Terminal } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ENVIRONMENTS, ENVIRONMENTS_AR, sampleEnv, useAr, useDeployRun, useLogStream, useStreamingOutput, wait } from "./_developer-demo";

const meta = { title: "Components/Server Tools/Pages/Deployment", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const run = useDeployRun(ar);
  const logs = useLogStream(ar, { initial: 80, every: 1100 });
  const term = useStreamingOutput(ar);
  const [env, setEnv] = useState("production");
  const [byEnv, setByEnv] = useState<Record<string, EnvVariable[]>>(() => ({
    development: sampleEnv("development"),
    preview: sampleEnv("preview"),
    production: sampleEnv("production"),
  }));
  const list = byEnv[env] ?? [];
  const set = (next: EnvVariable[]) => setByEnv((all) => ({ ...all, [env]: next }));
  const running = run.steps.some((s) => s.status === "running");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-h2 text-foreground">{ar ? "النشر" : "Deployments"}</h1>
            <Badge variant={running ? "info" : "neutral"}>{ar ? "الإنتاج" : "Production"}</Badge>
          </div>
          <p className="text-body text-muted-foreground">
            {ar ? "تابع تشغيل النشر والسجلات ومتغيرات البيئة في مكان واحد." : "Follow a deploy, its logs and the environment variables in one place."}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={run.restart}>
          {ar ? "نشر جديد" : "New deploy"}
        </Button>
      </header>

      <CommandSnippet command="npx wrangler deploy --env production" className="max-w-xl" />

      <DeployView
        title={ar ? "نشر api إلى الإنتاج" : "Deploy api to production"}
        meta="main · 4f2a91c · sara"
        steps={run.steps}
        onRetry={async (id) => {
          await run.retry(id);
        }}
        onCancel={run.cancel}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <h2 className="text-h4 text-foreground">{ar ? "سجل التطبيق" : "Application logs"}</h2>
          <LogViewer entries={logs} streaming height="22rem" />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-h4 text-foreground">{ar ? "مخرجات البناء" : "Build output"}</h2>
            <Button size="sm" variant="secondary" onClick={term.start} disabled={term.running}>
              {ar ? "تشغيل" : "Run"}
            </Button>
          </div>
          <Terminal title="~/app" lines={term.lines} streaming={term.running} onClear={term.clear} height="22rem" />
        </div>
      </section>

      <EnvList
        title={ar ? "متغيرات البيئة" : "Environment variables"}
        variables={list}
        environments={ar ? ENVIRONMENTS_AR : ENVIRONMENTS}
        environment={env}
        onEnvironmentChange={setEnv}
        onSave={async (variable, previousKey) => {
          await wait(500);
          set(previousKey ? list.map((v) => (v.key === previousKey ? variable : v)) : [...list, variable]);
        }}
        onDelete={async (key) => {
          await wait(400);
          set(list.filter((v) => v.key !== key));
        }}
        onImport={async (incoming, { overwrite }) => {
          await wait(600);
          const have = new Map(list.map((v) => [v.key, v]));
          for (const v of incoming) if (overwrite || !have.has(v.key)) have.set(v.key, v);
          set([...have.values()]);
        }}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
