/* The forced-update gate: an unsupported build sees only this screen. Try switching the running build to a supported one. */
import { Button, ForcedUpdateGate, type UpdateStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { latestRelease, useAr, useFakeDownload } from "./_lifecycle-demo";

const meta = { title: "Components/Alerts & Notifications/Pages/Forced Update", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ build = 205 }: { build?: number }) {
  const ar = useAr();
  const release = latestRelease(ar);
  const dl = useFakeDownload(release.size ?? 1, 8);
  const [current, setCurrent] = useState(build);
  const status: UpdateStatus = dl.done ? "ready" : dl.running ? "downloading" : "available";
  return (
    <ForcedUpdateGate
      currentBuild={current}
      minSupportedBuild={220}
      release={release}
      status={status}
      progress={dl.progress}
      speed={dl.speed}
      onDownload={dl.start}
      onRestart={() => {
        dl.reset();
        setCurrent(release.build);
      }}
    >
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-h2">{ar ? "التطبيق يعمل" : "The app is running"}</h1>
        <p className="text-body text-muted-foreground">{ar ? `النسخة ${current} مدعومة.` : `Build ${current} is supported.`}</p>
        <Button variant="secondary" onClick={() => setCurrent(205)}>
          {ar ? "ارجع إلى نسخة قديمة" : "Go back to an old build"}
        </Button>
      </main>
    </ForcedUpdateGate>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
