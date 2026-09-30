import { Button, WsStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useFakeSocket } from "./_ops-demo";

const meta = { title: "Components/Feedback/WS Status" } satisfies Meta;
export default meta;
type Story = StoryObj;

function Live() {
  const s = useFakeSocket();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={s.drop}>
          Drop the connection
        </Button>
        <Button size="sm" variant="secondary" onClick={s.goOffline}>
          Go offline
        </Button>
        <Button size="sm" variant="secondary" onClick={s.connect}>
          Connect
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground">Badge</p>
        <WsStatus state={s.state} latencyMs={s.latencyMs} retryAt={s.retryAt} onRetry={s.connect} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground">Inline</p>
        <WsStatus variant="inline" state={s.state} latencyMs={s.latencyMs} retryAt={s.retryAt} onRetry={s.connect} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground">Banner</p>
        <WsStatus variant="banner" state={s.state} latencyMs={s.latencyMs} retryAt={s.retryAt} attempt={s.attempt} lastConnectedAt={s.lastConnectedAt} onRetry={s.connect} />
      </div>
    </div>
  );
}

/** A fake socket: use the buttons to drop it, watch the countdown, retry now. Latency wobbles while connected. */
export const Default: Story = { render: () => <Live /> };

/** Every state and variant side by side, static. */
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {(["connected", "connecting", "reconnecting", "offline"] as const).map((state) => (
        <div key={state} className="flex flex-wrap items-center gap-4">
          <WsStatus state={state} latencyMs={state === "connected" ? 42 : undefined} retryAt={Date.now() + 15_000} onRetry={() => {}} />
          <WsStatus variant="inline" state={state} latencyMs={state === "connected" ? 240 : undefined} retryAt={Date.now() + 15_000} />
          <WsStatus state={state} latencyMs={state === "connected" ? 620 : undefined} />
        </div>
      ))}
      <WsStatus variant="banner" state="reconnecting" attempt={3} retryAt={Date.now() + 12_000} lastConnectedAt={Date.now() - 90_000} onRetry={() => {}} />
      <WsStatus variant="banner" state="offline" lastConnectedAt={Date.now() - 300_000} onRetry={() => {}} />
    </div>
  ),
};

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Live /> };
