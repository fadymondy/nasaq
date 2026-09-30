/*
 * The interface around the feedback dialog. The dialog itself (screenshot, element picker, console log) is
 * @nasaq/feedback's ReportDialog; these stories wire the design-system pieces to it with a mock submitter.
 */
import { type FeedbackSubmission, ReportDialog } from "@nasaq/feedback";
import {
  Button,
  FeedbackFloatingLauncher,
  FeedbackHub,
  type FeedbackHubIssue,
  FeedbackLauncherConfigurator,
  type FeedbackLauncherConfig,
  ShakeReportSheet,
  toast,
  useShakeToReport,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pageIssues, useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Feedback/Feedback Reporter" } satisfies Meta;
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
export const ArabicShake: Story = { globals: { locale: "ar" }, render: () => <ShakeDemo /> };
