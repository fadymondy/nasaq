import type { Meta, StoryObj } from "@storybook/react-vite";
import { JobQueueDemo, PackageUpdatesDemo, ServiceUnitsDemo, SshKeysDemo } from "./_infra-admin-demo";

const meta = { title: "Components/Developer/Server Admin" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Systemd units with state, boot setting and a row menu. Stop, restart and disable ask first; starting certbot fails to show an error. */
export const Services: Story = { render: () => <ServiceUnitsDemo /> };

/** Updates with security first. Select rows and Update selected, or Update all. A kernel or libssl update asks for a restart. */
export const PackageUpdates: Story = { render: () => <PackageUpdatesDemo /> };

/** Keys by server. Tick a box to install or remove a key. Add key rejects a private key. */
export const SshKeys: Story = { render: () => <SshKeysDemo /> };

/** Status counts filter the list. Open a job for its error and payload, then retry or forget. */
export const JobQueue: Story = { render: () => <JobQueueDemo /> };

export const Loading: Story = { render: () => <ServiceUnitsDemo loading /> };

export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-6">
      <ServiceUnitsDemo />
      <SshKeysDemo />
      <JobQueueDemo />
    </div>
  ),
};
