import type { ManagedRelease } from "@nasaq/web";
import { Button, ReleaseManager, type UpdateStatus, UpdatePill, UpdateSheet } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { buildUsage, latestRelease, managedReleases, useAr, useFakeDownload, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Alerts & Notifications/App Update" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** The pill in a fake title bar. Pressing it opens the sheet, and the download runs on a timer. */
function FlowDemo() {
  const ar = useAr();
  const release = latestRelease(ar);
  const dl = useFakeDownload(release.size ?? 1, 10);
  const [open, setOpen] = useState(false);
  const [restarted, setRestarted] = useState(false);
  const status: UpdateStatus = dl.done ? "ready" : dl.running ? "downloading" : "available";
  useEffect(() => {
    if (restarted) {
      const id = setTimeout(() => {
        setRestarted(false);
        dl.reset();
      }, 2000);
      return () => clearTimeout(id);
    }
  }, [restarted, dl]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-12 items-center justify-between rounded-card border border-border bg-card px-4">
        <span className="text-label">{ar ? "نسق" : "Nasaq"}</span>
        {restarted ? (
          <span role="status" className="text-body-sm text-nq-success-text">
            {ar ? "أُعيد التشغيل على الإصدار 2.4.0" : "Restarted on 2.4.0"}
          </span>
        ) : (
          <UpdatePill status={status} progress={dl.progress} version={release.version} onClick={() => setOpen(true)} />
        )}
      </div>
      <p className="text-body-sm text-muted-foreground">{ar ? "اضغط الكبسولة، ثم نزّل التحديث." : "Press the pill, then download the update."}</p>
      <UpdateSheet
        open={open}
        onOpenChange={setOpen}
        release={release}
        status={status}
        progress={dl.progress}
        speed={dl.speed}
        onDownload={dl.start}
        onRestart={() => {
          setOpen(false);
          setRestarted(true);
        }}
      />
    </div>
  );
}

function PillStates() {
  const ar = useAr();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <UpdatePill status="available" version="2.4.0" />
      <UpdatePill status="downloading" progress={42} />
      <UpdatePill status="ready" />
      <UpdatePill status="error" />
      <span className="text-caption text-muted-foreground">{ar ? "الحالات الأربع" : "The four states"}</span>
    </div>
  );
}

function SheetStates() {
  const ar = useAr();
  const release = latestRelease(ar);
  const [state, setState] = useState<UpdateStatus | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {(["available", "downloading", "ready", "error"] as const).map((s) => (
        <Button key={s} variant="secondary" onClick={() => setState(s)}>
          {s}
        </Button>
      ))}
      <UpdateSheet
        open={state !== null}
        onOpenChange={(o) => !o && setState(null)}
        release={release}
        status={state ?? "available"}
        progress={58}
        speed={3.4 * 1024 * 1024}
        side="bottom"
      />
    </div>
  );
}

function ManagerDemo() {
  const ar = useAr();
  const [releases, setReleases] = useState<ManagedRelease[]>(() => managedReleases(ar));
  const [min, setMin] = useState(220);
  return (
    <ReleaseManager
      releases={releases}
      minSupportedBuild={min}
      usage={buildUsage}
      onSetMinSupportedBuild={async (b) => {
        await wait(600);
        setMin(b);
      }}
      onPublish={async (id) => {
        await wait(600);
        setReleases((l) => l.map((r) => (r.id === id ? { ...r, status: "live", rollout: 10 } : r)));
      }}
      onRollback={async (id) => {
        await wait(600);
        setReleases((l) => l.map((r) => (r.id === id ? { ...r, status: "rolled-back", rollout: 0 } : r)));
      }}
    />
  );
}

export const UpdateFlow: Story = { render: () => <FlowDemo /> };
export const PillStatesStory: Story = { name: "Pill states", render: () => <PillStates /> };
export const SheetStatesStory: Story = { name: "Sheet states", render: () => <SheetStates /> };
export const Releases: Story = { render: () => <ManagerDemo /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-6">
      <PillStates />
      <FlowDemo />
      <ManagerDemo />
    </div>
  ),
};
