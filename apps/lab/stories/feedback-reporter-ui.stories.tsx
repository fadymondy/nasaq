/*
 * The interface around the feedback dialog. The dialog itself (screenshot, element picker, console log) is
 * @nasaq/feedback's ReportDialog; these stories wire the design-system pieces to it with a mock submitter.
 */
import { type FeedbackSubmission, ReportDialog } from "@nasaq/feedback";
import {
  Button,
  FeedbackFloatingLauncher,
  countByStatus,
  FeedbackHub,
  type FeedbackHubFilter,
  type FeedbackHubIssue,
  type FeedbackLauncherSpot,
  filterHubIssues,
  FeedbackLauncherConfigurator,
  type FeedbackLauncherConfig,
  ShakeReportSheet,
  toast,
  useShakeToReport,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";
import { pageIssues, useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Feedback SDK/Feedback Reporter" } satisfies Meta;
export default meta;
type Story = StoryObj;

const mockSubmit = async (payload: FeedbackSubmission) => {
  await wait(600);
  toast.success(`Sent: ${payload.title}`);
};

function Frame({ children, className = "h-80" }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative overflow-hidden rounded-card border border-dashed border-border bg-background hatch ${className}`}>{children}</div>;
}

function LaunchersDemo() {
  const ar = useAr();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">{ar ? "الأشكال الثلاثة وأماكنها. اضغط أي زر لفتح نافذة الإبلاغ." : "The three shapes and where they sit. Press any button to open the report dialog."}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Frame>
          <FeedbackFloatingLauncher placement="absolute" shape="pill" position="bottom-end" onClick={() => setOpen(true)} />
          <FeedbackFloatingLauncher placement="absolute" shape="circle" position="top-start" count={3} onClick={() => setOpen(true)} />
        </Frame>
        <Frame>
          <FeedbackFloatingLauncher placement="absolute" shape="tab" position="edge-end" onClick={() => setOpen(true)} />
          <FeedbackFloatingLauncher placement="absolute" shape="tab" position="edge-start" label={ar ? "مساعدة" : "Help"} onClick={() => setOpen(true)} />
        </Frame>
      </div>
      <ReportDialog open={open} onOpenChange={setOpen} onSubmit={mockSubmit} priorities={["low", "medium", "high", "urgent"]} />
    </div>
  );
}

function HubDemo() {
  const ar = useAr();
  const [issues, setIssues] = useState<FeedbackHubIssue[]>(() => pageIssues(ar));
  const [open, setOpen] = useState(false);
  return (
    <>
      <FeedbackHub
        page="/projects/nasaq/board"
        issues={issues}
        onReportNew={() => setOpen(true)}
        onVote={async (id) => {
          await wait(500);
          setIssues((l) => l.map((i) => (i.id === id ? { ...i, voted: true, votes: (i.votes ?? 0) + 1 } : i)));
        }}
      />
      <ReportDialog open={open} onOpenChange={setOpen} onSubmit={mockSubmit} />
    </>
  );
}

function MovableDemo() {
  const ar = useAr();
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<FeedbackLauncherSpot | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "اسحب الزر إلى أي مكان؛ يلتصق بأقرب جانب ويبقى هناك بعد إعادة التحميل. Alt مع الأسهم يحركه من لوحة المفاتيح."
          : "Drag the button anywhere; it snaps to the nearer side and stays there after a reload. Alt + arrow keys move it from the keyboard."}
      </p>
      <Frame className="h-96">
        <FeedbackFloatingLauncher
          placement="absolute"
          shape="pill"
          movable
          storageKey="nasaq-lab-feedback-launcher"
          onSpotChange={setSpot}
          onClick={() => setOpen(true)}
        />
      </Frame>
      <p className="text-caption text-muted-foreground tabular-nums" data-testid="spot">
        {spot ? `${spot.side} · ${Math.round(spot.y * 100)}%` : ar ? "لم يتحرك بعد" : "Not moved yet"}
      </p>
      <ReportDialog open={open} onOpenChange={setOpen} onSubmit={mockSubmit} />
    </div>
  );
}

const PAGE = 5;

function PagedHubDemo() {
  const ar = useAr();
  const all = useMemo(() => {
    const seed = pageIssues(ar);
    return Array.from({ length: 17 }, (_, n): FeedbackHubIssue => {
      const base = seed[n % seed.length]!;
      return { ...base, id: `r${n}`, title: n < seed.length ? base.title : `${base.title} (${n + 1})`, mine: n % 4 === 1 };
    });
  }, [ar]);
  const [filter, setFilter] = useState<FeedbackHubFilter>("all");
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const matching = filterHubIssues(all, filter);
  const counts = { ...countByStatus(all), mine: all.filter((i) => i.mine).length };
  return (
    <FeedbackHub
      page="/projects/nasaq/board"
      issues={matching.slice(0, pages * PAGE)}
      counts={counts}
      mineTab
      onFilterChange={(f) => {
        setFilter(f);
        setPages(1);
      }}
      hasMore={matching.length > pages * PAGE}
      loadingMore={loading}
      onLoadMore={async () => {
        setLoading(true);
        await wait(500);
        setPages((p) => p + 1);
        setLoading(false);
      }}
      onReportNew={() => toast(ar ? "الإبلاغ عن مشكلة" : "Report a problem")}
    />
  );
}

function ConfiguratorDemo() {
  const ar = useAr();
  const [config, setConfig] = useState<FeedbackLauncherConfig>({ shape: "pill", position: "bottom-end", label: ar ? "ملاحظات" : "Feedback" });
  return <FeedbackLauncherConfigurator value={config} onChange={setConfig} />;
}

function ShakeDemo() {
  const ar = useAr();
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const shake = useShakeToReport({ enabled, onShake: () => setSheet(true) });
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <p className="text-body-sm text-muted-foreground">
        {ar
          ? "على الهاتف: هز الجهاز. على الحاسوب لا يوجد مستشعر، فاستخدم الزر لمحاكاة الهز."
          : "On a phone, shake the device. A computer has no motion sensor, so use the button to simulate a shake."}
      </p>
      <p className="text-caption text-muted-foreground" aria-live="polite">
        {shake.supported ? (ar ? "المستشعر متاح" : "Motion sensor available") : ar ? "لا يوجد مستشعر حركة" : "No motion sensor here"}
      </p>
      <div className="flex flex-wrap gap-2">
        {shake.permission === "unknown" ? (
          <Button variant="secondary" onClick={() => void shake.requestPermission()}>
            {ar ? "السماح بالحركة" : "Allow motion"}
          </Button>
        ) : null}
        <Button variant="primary" onClick={() => setSheet(true)}>
          {ar ? "محاكاة الهز" : "Simulate a shake"}
        </Button>
      </div>
      <ShakeReportSheet open={sheet} onOpenChange={setSheet} onReport={() => setDialog(true)} enabled={enabled} onEnabledChange={setEnabled} />
      <ReportDialog open={dialog} onOpenChange={setDialog} onSubmit={mockSubmit} />
    </div>
  );
}

export const Launchers: Story = { render: () => <LaunchersDemo /> };
export const Hub: Story = { render: () => <HubDemo /> };
export const EmptyHub: Story = { render: () => <FeedbackHub page="/settings/billing" issues={[]} onReportNew={() => {}} /> };
export const Configurator: Story = { render: () => <ConfiguratorDemo /> };
/** A launcher the visitor can drag out of the way; it remembers where it was left. */
export const Movable: Story = { render: () => <MovableDemo /> };
/** "My reports" and a server-paged list: counts come from the server, **Load more** fetches the next page. */
export const MyReportsPaged: Story = { render: () => <PagedHubDemo /> };
export const ShakeToReport: Story = { render: () => <ShakeDemo /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-6">
      <LaunchersDemo />
      <HubDemo />
      <ConfiguratorDemo />
    </div>
  ),
};
export const MovableArabic: Story = { globals: { locale: "ar" }, render: () => <MovableDemo /> };
export const MyReportsPagedArabic: Story = { globals: { locale: "ar" }, render: () => <PagedHubDemo /> };
export const ArabicShake: Story = { globals: { locale: "ar" }, render: () => <ShakeDemo /> };
