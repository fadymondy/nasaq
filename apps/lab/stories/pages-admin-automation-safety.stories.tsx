import type { Meta, StoryObj } from "@storybook/react-vite";
import { KillSwitch, PausedBanner } from "@nasaq/web";
import { useAr, useKillSwitchState } from "./_workflow-p2-demo";

const meta = { title: "Components/Workflow/Pages/Automation Safety", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const s = useKillSwitchState();
  return (
    <div className="flex min-h-svh flex-col">
      {s.paused ? <PausedBanner paused={s.paused} onResume={s.resume} /> : null}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-h2 text-foreground">{ar ? "أمان الأتمتة" : "Automation safety"}</h1>
          <p className="text-body text-muted-foreground">{ar ? "أوقف كل شيء فورًا عند حدوث خطأ." : "Stop everything at once when something goes wrong."}</p>
        </header>
        <KillSwitch paused={s.paused} activeCount={14} onStopAll={s.pause} onResume={s.resume} browsers={s.browsers} onUnpairBrowser={s.unpair} />
      </main>
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
