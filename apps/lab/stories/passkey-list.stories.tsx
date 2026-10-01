import { PasskeyList, type Passkey } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ArabicScope, useAr, wait } from "./_account-demo";

const meta = { title: "Components/Security/Passkey List" } satisfies Meta;
export default meta;
type Story = StoryObj;

const ago = (days: number) => Date.now() - days * 86_400_000;
const SEED: Passkey[] = [
  { id: "1", name: "MacBook Pro", kind: "device", authenticator: "Touch ID", createdAt: ago(210), lastUsedAt: ago(0.1) },
  { id: "2", name: "iPhone", kind: "synced", authenticator: "iCloud Keychain", createdAt: ago(95), lastUsedAt: ago(6) },
  { id: "3", name: "YubiKey 5C", kind: "security-key", authenticator: "YubiKey 5C NFC", createdAt: ago(12), lastUsedAt: null },
];

function Demo({ initial = SEED, supported }: { initial?: Passkey[]; supported?: boolean }) {
  const ar = useAr();
  const [list, setList] = useState(initial);
  return (
    <PasskeyList
      passkeys={list}
      supported={supported}
      onAdd={async () => {
        await wait(900);
        setList((l) => [...l, { id: String(Date.now()), name: ar ? "مفتاح جديد" : "New passkey", kind: "device", createdAt: Date.now(), lastUsedAt: null }]);
      }}
      onRename={async (id, name) => {
        await wait(400);
        setList((l) => l.map((p) => (p.id === id ? { ...p, name } : p)));
      }}
      onRemove={async (id) => {
        await wait(600);
        setList((l) => l.filter((p) => p.id !== id));
      }}
    />
  );
}

/** Rename in place with the pencil (Enter saves, Escape cancels); remove asks first. Add is your WebAuthn ceremony. */
export const Default: Story = { render: () => <Demo /> };

/** No passkeys yet: an empty state with the add button. */
export const Empty: Story = { render: () => <Demo initial={[]} /> };

/** `window.PublicKeyCredential` is missing: a notice explains and Add is disabled. Pass `supported={false}` to preview it. */
export const Unsupported: Story = { render: () => <Demo supported={false} /> };

/** The ceremony was cancelled: the component shows a message and stays usable. */
export const AddFails: Story = {
  name: "Add fails",
  render: () => (
    <PasskeyList
      passkeys={SEED}
      onAdd={async () => {
        await wait(500);
        throw Object.assign(new Error("cancelled"), { name: "NotAllowedError" });
      }}
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
