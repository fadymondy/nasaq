import { InstallButton, type InstallState } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

const meta = { title: "Components/Apps & Platforms/Install Button", component: InstallButton, args: { appName: "Zekra", state: "available" } } satisfies Meta<typeof InstallButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Every state. "Get" replaces "Install" for free apps. */
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <InstallButton appName="Zekra" />
      <InstallButton appName="Seatfor" free />
      <InstallButton appName="Moharrik" state="installing" />
      <InstallButton appName="Mahaam" state="installed" />
      <InstallButton appName="Hosbah" state="update" />
      <InstallButton appName="Mahaam" variant="primary" size="md" />
    </div>
  ),
};

/** The full flow: install, a short wait, then open. */
export const Flow: Story = {
  render: () => {
    const [state, setState] = useState<InstallState>("available");
    return (
      <InstallButton
        appName="Zekra"
        state={state}
        onInstall={() => {
          setState("installing");
          setTimeout(() => setState("installed"), 1200);
        }}
        onOpen={() => setState("available")}
      />
    );
  },
};
