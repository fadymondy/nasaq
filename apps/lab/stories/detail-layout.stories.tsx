import { Button, DetailLayout, type DetailTab, Switch, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Layout/Detail Layout", component: DetailLayout, parameters: { layout: "fullscreen" } } satisfies Meta<typeof DetailLayout>;
export default meta;
type Story = StoryObj;

const NOW = Date.now();
const series = Array.from({ length: 24 }, (_, i) => Math.round((Math.sin(i / 3) + 1.5) * 40 + ((i * 7) % 13)));

function tabs(ar: boolean): DetailTab[] {
  const general = ar ? "عام" : "General";
  const settings = ar ? "الإعدادات" : "Settings";
  return [
    { key: "overview", label: ar ? "نظرة عامة" : "Overview", icon: "layout-dashboard", section: general },
    { key: "activity", label: ar ? "النشاط" : "Activity", icon: "activity", section: general },
    { key: "logs", label: ar ? "السجلات" : "Logs", icon: "scroll-text", section: general, badge: 12 },
    { key: "config", label: ar ? "الإعداد" : "Configuration", icon: "settings", section: settings },
    { key: "appearance", label: ar ? "المظهر" : "Appearance", icon: "palette", section: settings },
    { key: "secrets", label: ar ? "الأسرار" : "Secrets", icon: "key-round", section: settings, disabled: true },
  ];
}

function Page({ loading = false, error = false }: { loading?: boolean; error?: boolean }) {
  const ar = useAr();
  const [tab, setTab] = useState("overview");
  const [enabled, setEnabled] = useState(true);
  const list = tabs(ar);
  const current = list.find((t) => t.key === tab);
  return (
    <div className="h-dvh border-border">
      <DetailLayout
        className="h-full"
        tabs={list}
        activeTab={tab}
        onTabChange={setTab}
        loading={loading}
        error={error}
        onRetry={() => toast(ar ? "إعادة المحاولة" : "Retrying")}
        identity={{
          name: "Postgres",
          version: "2.4.1",
          kind: ar ? "مصدر" : "Source",
          status: enabled ? { label: ar ? "مفعّلة" : "Enabled", tone: "success" } : { label: ar ? "معطّلة" : "Disabled", tone: "neutral" },
          icon: "database",
          hue: "blue",
          slug: "postgres-source",
          description: ar ? "يزامن الجداول والتغييرات من قاعدة Postgres كل خمس دقائق." : "Syncs tables and changes from a Postgres database every five minutes.",
        }}
        activity={{ count: 128_430, countLabel: ar ? "سجلات" : "records", series, lastActiveAt: NOW - 4 * 60_000 }}
        actions={
          <Button variant={enabled ? "secondary" : "primary"} onClick={() => setEnabled((v) => !v)}>
            {enabled ? (ar ? "تعطيل" : "Disable") : ar ? "تفعيل" : "Enable"}
          </Button>
        }
      >
        <section className="flex max-w-2xl flex-col gap-4">
          <h2 className="text-h3">{current?.label}</h2>
          <p className="text-body-sm text-muted-foreground">
            {ar ? "محتوى هذا القسم. استخدم الأسهم للتنقل بين الأقسام." : "This section's content. Use the arrow keys to move between sections."}
          </p>
          {tab === "config" ? (
            <label className="flex items-center justify-between gap-4 rounded-card border border-border bg-card p-4 text-label">
              {ar ? "مزامنة تلقائية" : "Automatic sync"}
              <Switch defaultChecked />
            </label>
          ) : null}
        </section>
      </DetailLayout>
    </div>
  );
}

/** Sections in a sub-sidebar (a tab bar on small screens), the identity header with activity, and an action. */
export const Default: Story = { render: () => <Page /> };
/** Header skeleton and a loading state; the tabs stay usable. */
export const Loading: Story = { render: () => <Page loading /> };
/** The page failed to load: an error with Try again. */
export const LoadError: Story = { render: () => <Page error /> };
export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
export const LoadingArabic: Story = { ...Loading, globals: { locale: "ar" } };
