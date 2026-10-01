import { Button, DeployView, type DeployStep } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr, useDeployRun, wait } from "./_developer-demo";

const meta = { title: "Components/Server Tools/Deploy View", component: DeployView, parameters: { layout: "padded" } } satisfies Meta<typeof DeployView>;
export default meta;
type Story = StoryObj;

/** A live run: steps advance, durations count up, logs follow the output. The test step fails once; press Retry. */
export const LiveRun: Story = {
  render: () => {
    const ar = useAr();
    const { steps, retry, cancel, restart } = useDeployRun(ar);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <DeployView
          title={ar ? "نشر api إلى الإنتاج" : "Deploy api to production"}
          meta="main · 4f2a91c · sara"
          steps={steps}
          onRetry={async (id) => {
            await retry(id);
          }}
          onCancel={cancel}
        />
        <div>
          <Button size="sm" variant="secondary" onClick={restart}>
            {ar ? "إعادة التشغيل" : "Restart demo"}
          </Button>
        </div>
      </div>
    );
  },
};

const FINISHED: DeployStep[] = [
  { id: "1", name: "Checkout", command: "git clone --depth 1", status: "success", durationMs: 1800, logs: "Cloning into 'app'...\nDone." },
  { id: "2", name: "Install dependencies", command: "pnpm install", status: "success", durationMs: 8400, logs: "Progress: resolved 412\nDone in 8.2s" },
  { id: "3", name: "Build", command: "pnpm build", status: "skipped" },
  { id: "4", name: "Release", command: "wrangler deploy", status: "success", durationMs: 64_000, logs: "Published api\nDeployed https://api.example.com" },
];

/** A finished run. */
export const Succeeded: Story = { render: () => <DeployView className="max-w-3xl" title="Deploy api to staging" meta="release/2.4 · 91b3c02" steps={FINISHED} /> };

/** A failed step shows its error and Retry. Returning `{ error }` from `onRetry` keeps it failed with a message. */
export const Failed: Story = {
  render: () => (
    <DeployView
      className="max-w-3xl"
      title="Deploy api to production"
      steps={[
        { ...(FINISHED[0] as DeployStep) },
        { id: "2", name: "Run tests", command: "pnpm test", status: "failed", durationMs: 12_500, error: "1 test failed.", logs: "\u001b[32m✔\u001b[0m parseEnv\n\u001b[31m✖\u001b[0m deploy retries a step\nℹ tests 24 pass 23 fail 1" },
        { id: "3", name: "Build", command: "pnpm build", status: "pending" },
      ]}
      onRetry={async () => {
        await wait(700);
        return { error: "The runner is busy. Try again in a minute." };
      }}
    />
  ),
};

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => {
    const ar = useAr();
    const { steps, retry, cancel } = useDeployRun(ar);
    return (
      <DeployView
        className="max-w-3xl"
        title={ar ? "نشر api إلى الإنتاج" : "Deploy api to production"}
        meta="main · 4f2a91c"
        steps={steps}
        onRetry={async (id) => {
          await retry(id);
        }}
        onCancel={cancel}
      />
    );
  },
};
