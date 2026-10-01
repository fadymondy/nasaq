import { AccountDeletion, DataExport, DataPrivacy } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArabicScope, useExportDemo, wait } from "./_team-demo";
import { CancelDemo, PrivacyDemo } from "./_team-pages";

const meta = { title: "Components/Security/Data Privacy", component: DataPrivacy, parameters: { layout: "padded" } } satisfies Meta<typeof DataPrivacy>;
export default meta;
type Story = StoryObj;

function StandaloneDemo() {
  const ex = useExportDemo();
  return (
    <div className="flex flex-col gap-6">
      <DataExport {...ex} />
      <AccountDeletion confirmText="sara@example.com" onSchedule={async () => wait(600)} onCancel={async () => wait(600)} />
    </div>
  );
}

/** Request an export: it queues, processes and becomes ready. Deleting needs sara@example.com typed. */
export const Default: Story = { render: () => <PrivacyDemo /> };
export const ExportReady: Story = { render: () => <PrivacyDemo ready /> };
export const DeletionScheduled: Story = { render: () => <PrivacyDemo scheduled /> };
export const Standalone: Story = { render: () => <StandaloneDemo /> };
export const CancelPage: Story = { parameters: { layout: "fullscreen", nasaq: { fullBleed: true } }, render: () => <CancelDemo state="ready" /> };
export const CancelExpired: Story = { parameters: { layout: "fullscreen", nasaq: { fullBleed: true } }, render: () => <CancelDemo state="expired" /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <ArabicScope>
      <PrivacyDemo scheduled />
    </ArabicScope>
  ),
};
