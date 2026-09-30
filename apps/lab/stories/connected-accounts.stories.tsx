import { ConnectedAccounts, type ConnectedProvider } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, wait } from "./_account-demo";

const meta = { title: "Components/Account/Connected Accounts" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SEED: ConnectedProvider[] = [
  { id: "google", connected: true, account: "fady@example.com" },
  { id: "github", connected: true, account: "fadymondy" },
  { id: "apple", connected: false },
  { id: "microsoft", connected: false },
];

function Demo({ initial = SEED, others = 1 }: { initial?: ConnectedProvider[]; others?: number }) {
  const [list, setList] = useState(initial);
  const set = (id: string, connected: boolean) =>
    setList((l) => l.map((p) => (p.id === id ? { ...p, connected, account: connected ? `${id}-user@example.com` : undefined } : p)));
  return (
    <ConnectedAccounts
      providers={list}
      otherSignInMethods={others}
      onConnect={async (id) => {
        await wait(800);
        set(id, true);
      }}
      onDisconnect={async (id) => {
        await wait(600);
        set(id, false);
      }}
    />
  );
}

/** One password (`otherSignInMethods={1}`) plus two accounts. Connect and disconnect all work. */
export const Default: Story = { render: () => <Demo /> };

/** The only sign-in method cannot be disconnected: the button is disabled, and a tooltip and a line under the name say why. */
export const LastMethod: Story = {
  name: "Last sign-in method",
  render: () => (
    <Demo
      initial={[
        { id: "google", connected: true, account: "fady@example.com" },
        { id: "github", connected: false },
      ]}
      others={0}
    />
  ),
};

export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <Demo />
    </ArabicScope>
  ),
};
