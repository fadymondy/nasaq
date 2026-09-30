import { SourcesCatalogue, type TrendAction, TrendsFeed, type TrendSource, type TrendTopic } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { t, useAr, wait } from "./_s-demo";
import { trendSources, trendTopics } from "./_s-demo-reports";

const meta = { title: "Pages/Analytics/Trends", component: TrendsFeed, parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta<typeof TrendsFeed>;
export default meta;
type Story = StoryObj;

const NEXT = { save: "saved", review: "reviewed", dismiss: "dismissed", restore: "new" } as const;
const NOW = new Date("2026-09-30T09:30:00Z");

function Page({ tier1Down = false, failSave = false }: { tier1Down?: boolean; failSave?: boolean }) {
  const ar = useAr();
  const [topics, setTopics] = useState<TrendTopic[]>(() => trendTopics(ar));
  const [sources, setSources] = useState<TrendSource[]>(() => trendSources(ar, tier1Down));

  const onAction = async (topic: TrendTopic, action: TrendAction) => {
    await wait(350);
    if (failSave && action === "save") throw new Error("nope");
    setTopics((list) => list.map((x) => (x.id === topic.id ? { ...x, state: NEXT[action] } : x)));
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-8">
      <header>
        <h1 className="text-h2 font-semibold">{t(ar, "Trends", "الاتجاهات")}</h1>
        <p className="text-body text-muted-foreground">{t(ar, "What the news is talking about right now", "ما تتحدث عنه الأخبار الآن")}</p>
      </header>
      <TrendsFeed topics={topics} onAction={onAction} timeZone="Asia/Riyadh" now={NOW} />
      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">{t(ar, "Sources", "المصادر")}</h2>
        <SourcesCatalogue
          sources={sources}
          now={NOW}
          onEnabledChange={async (s, enabled) => {
            await wait(300);
            setSources((list) => list.map((x) => (x.id === s.id ? { ...x, enabled } : x)));
          }}
          onRetry={async (s) => {
            await wait(500);
            setSources((list) => list.map((x) => (x.id === s.id ? { ...x, health: "ok", lastFetchedAt: NOW } : x)));
          }}
        />
      </section>
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
export const TierFallback: Story = { render: () => <Page tier1Down /> };
export const SaveFails: Story = { render: () => <Page failSave /> };
