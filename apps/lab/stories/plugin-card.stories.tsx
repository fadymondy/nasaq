import { Button, Checkbox, PluginCard, PluginCardGrid, type PluginCardItem, selectionState, SourceBadge, toast, toggleSelected } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Integrations/Plugin Card", component: PluginCard, parameters: { layout: "padded" } } satisfies Meta<typeof PluginCard>;
export default meta;
type Story = StoryObj;

const NOW = Date.now();
const wave = (seed: number, scale = 1) => Array.from({ length: 24 }, (_, i) => Math.round((Math.sin((i + seed) / 3) + 1.4) * 40 * scale + ((i * seed) % 17)));

function plugins(ar: boolean): PluginCardItem[] {
  return [
    {
      id: "pg",
      slug: "postgres-source",
      name: "Postgres",
      version: "2.4.1",
      kind: "source",
      icon: "database",
      hue: "blue",
      enabled: true,
      lastActiveAt: NOW - 4 * 60_000,
      count: 128_430,
      countLabel: ar ? "سجلات" : "records",
      series: wave(1, 2),
      description: ar ? "يزامن الجداول والتغييرات من قاعدة Postgres كل خمس دقائق." : "Syncs tables and changes from a Postgres database every five minutes.",
    },
    {
      id: "claude",
      slug: "anthropic-provider",
      name: "Claude",
      version: "5.5",
      kind: "ai_provider",
      icon: "sparkles",
      hue: "violet",
      enabled: true,
      lastActiveAt: NOW - 3 * 3_600_000,
      count: 4_210_000,
      countLabel: ar ? "رموز" : "tokens",
      series: wave(5, 3),
      description: ar ? "مزود النماذج للمساعد والتلخيص والتصنيف." : "The model provider for the assistant, summaries and tagging.",
    },
    {
      id: "slack",
      slug: "slack-notify",
      name: ar ? "إشعارات Slack" : "Slack notifications",
      version: "1.0.3",
      kind: "capability",
      icon: "message-square",
      hue: "pink",
      enabled: false,
      lastActiveAt: NOW - 9 * 86_400_000,
      count: 312,
      countLabel: ar ? "رسائل" : "messages",
      series: wave(9, 0.3),
      description: ar ? "ترسل التنبيهات والملخصات إلى قنوات Slack." : "Posts alerts and digests to Slack channels.",
    },
    {
      id: "ocr",
      slug: "ocr-enrich",
      name: "OCR",
      kind: "enrichment",
      icon: "scan-text",
      hue: "teal",
      enabled: true,
      lastActiveAt: null,
      count: 0,
      countLabel: ar ? "مهام نشطة" : "active jobs",
      description: ar ? "يستخرج النص من الصور والملفات الممسوحة." : "Pulls text out of images and scanned files.",
    },
    {
      id: "mcp",
      slug: "github-mcp",
      name: "GitHub MCP",
      version: "0.9.0",
      kind: "mcp",
      icon: "github",
      hue: "gray",
      enabled: true,
      lastActiveAt: NOW - 20 * 60_000,
      count: 1_870,
      countLabel: ar ? "استدعاءات" : "invocations",
      series: wave(3),
    },
    {
      id: "geo",
      slug: "geo-fence",
      name: ar ? "السياج الجغرافي" : "Geo-fence",
      version: "3.1.0",
      kind: "watcher",
      icon: "map-pin",
      hue: "amber",
      enabled: true,
      lastActiveAt: NOW - 50 * 60_000,
      count: 56,
      countLabel: ar ? "تنبيهات" : "alerts",
      series: wave(7, 0.6),
      description: ar ? "ينبه عند دخول مركبة أو خروجها من منطقة." : "Alerts when a vehicle enters or leaves an area.",
    },
  ];
}

/** A grid of plugins with Page and Details. */
export const Default: Story = {
  render: function Render() {
    const ar = useAr();
    return (
      <PluginCardGrid>
        {plugins(ar).map((p) => (
          <PluginCard
            key={p.id}
            plugin={p}
            now={NOW}
            onOpen={() => toast(`${p.name}: ${ar ? "التفاصيل" : "details"}`)}
            onOpenPage={p.kind === "source" || p.kind === "capability" ? () => toast(`/${p.slug}`) : undefined}
            badges={p.id === "pg" ? <SourceBadge label="ToGO" /> : undefined}
          />
        ))}
      </PluginCardGrid>
    );
  },
};

/** Checkbox cards with a select-all and a bulk action bar. Click a card, its checkbox, or long-press on touch. */
export const Selectable: Story = {
  render: function Render() {
    const ar = useAr();
    const [list, setList] = useState(() => plugins(ar));
    const [selected, setSelected] = useState<string[]>(["claude"]);
    const ids = useMemo(() => list.map((p) => p.id), [list]);
    const state = selectionState(selected, ids);
    const bulk = (enabled: boolean) => {
      setList((l) => l.map((p) => (selected.includes(p.id) ? { ...p, enabled } : p)));
      toast(ar ? `تم تحديث ${selected.length}` : `Updated ${selected.length}`);
      setSelected([]);
    };
    return (
      <div className="flex flex-col gap-4">
        <div className="flex min-h-control flex-wrap items-center gap-3 rounded-card border border-border bg-card px-3 py-2">
          <label className="flex items-center gap-2 text-label">
            <Checkbox
              checked={state === "all"}
              indeterminate={state === "some"}
              onCheckedChange={(v) => setSelected(v === true ? [...ids] : [])}
            />
            {ar ? "تحديد الكل" : "Select all"}
          </label>
          <span className="text-body-sm text-muted-foreground tabular-nums" data-testid="selected-count">
            {ar ? `${selected.length} محدد` : `${selected.length} selected`}
          </span>
          <div className="ms-auto flex gap-2">
            <Button size="sm" disabled={!selected.length} onClick={() => bulk(true)}>
              {ar ? "تفعيل" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" disabled={!selected.length} onClick={() => bulk(false)}>
              {ar ? "تعطيل" : "Disable"}
            </Button>
          </div>
        </div>
        <PluginCardGrid>
          {list.map((p) => (
            <PluginCard
              key={p.id}
              plugin={p}
              now={NOW}
              selectable
              selected={selected.includes(p.id)}
              onSelectedChange={(next) => setSelected((s) => toggleSelected(s, p.id, next))}
              onOpen={() => toast(p.name)}
            />
          ))}
        </PluginCardGrid>
      </div>
    );
  },
};

/** Live, recent, idle and never-active; disabled; no description, count or sparkline; an unknown kind. */
export const States: Story = {
  render: function Render() {
    const ar = useAr();
    const [pg, claude, slack, ocr] = plugins(ar);
    return (
      <PluginCardGrid>
        <PluginCard plugin={pg!} now={NOW} detailHref="#postgres" pageHref="#postgres-page" />
        <PluginCard plugin={claude!} now={NOW} />
        <PluginCard plugin={slack!} now={NOW} />
        <PluginCard plugin={ocr!} now={NOW} />
        <PluginCard plugin={{ id: "bare", name: ar ? "إضافة بلا بيانات" : "Bare plugin", kind: "custom_hook" }} now={NOW} />
      </PluginCardGrid>
    );
  },
};

export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
export const SelectableArabic: Story = { ...Selectable, globals: { locale: "ar" } };
