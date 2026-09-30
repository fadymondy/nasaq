/* A backups page: history with progress, run now, restore with a confirm, and the schedule and retention. Fake server. */
import { Alert, WsStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BackupDemo, useAr, useFakeSocket } from "./_ops-demo";

const meta = { title: "Pages/Admin/Backups", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const socket = useFakeSocket();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2 text-foreground">{ar ? "النسخ الاحتياطي" : "Backups"}</h1>
          <p className="text-body text-muted-foreground">{ar ? "احمِ بيانات المتجر واستعدها عند الحاجة." : "Protect the data of the store and bring it back when needed."}</p>
        </div>
        <WsStatus state={socket.state} latencyMs={socket.latencyMs} retryAt={socket.retryAt} onRetry={socket.connect} />
      </header>
      <Alert tone="warning">{ar ? "الاستعادة تستبدل البيانات الحالية. تؤخذ نسخة أمان تلقائيًا قبلها." : "A restore replaces the current data. A safety backup is taken first."}</Alert>
      <BackupDemo />
    </main>
  );
}

/** Run now, watch the progress, restore an older backup, change the schedule and see what retention would remove. */
export const Default: Story = { render: () => <Page /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
