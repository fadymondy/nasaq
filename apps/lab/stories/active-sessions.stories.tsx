import { ActiveSessions, type ActiveSession } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Security/Active Sessions", component: ActiveSessions, parameters: { layout: "padded" } } satisfies Meta<typeof ActiveSessions>;
export default meta;
type Story = StoryObj<typeof meta>;

const MIN = 60_000;
const sample = (ar: boolean): ActiveSession[] => [
  { id: "s2", device: "Safari on iPhone", kind: "mobile", ip: "41.233.12.8", location: ar ? "الإسكندرية، مصر" : "Alexandria, Egypt", lastActiveAt: Date.now() - 42 * MIN },
  { id: "s1", device: "Chrome on macOS", kind: "desktop", ip: "197.45.10.21", location: ar ? "القاهرة، مصر" : "Cairo, Egypt", lastActiveAt: Date.now() - MIN, current: true },
  { id: "s3", device: "Firefox on Windows", kind: "desktop", ip: "102.40.7.190", location: ar ? "الرياض، السعودية" : "Riyadh, Saudi Arabia", lastActiveAt: Date.now() - 3 * 24 * 60 * MIN },
  { id: "s4", device: "Chrome on Android tablet", kind: "tablet", lastActiveAt: Date.now() - 9 * 24 * 60 * MIN },
];

function Demo() {
  const ar = useAr();
  const [sessions, setSessions] = useState(() => sample(ar));
  return (
    <ActiveSessions
      sessions={sessions}
      onRevoke={async (id) => {
        await wait();
        setSessions((s) => s.filter((x) => x.id !== id));
      }}
      onRevokeOthers={async () => {
        await wait();
        setSessions((s) => s.filter((x) => x.current));
      }}
    />
  );
}

/** The current device first and marked; sign out one device or every other one. */
export const Playground: Story = { args: { sessions: [] }, render: () => <Demo /> };

/** Only this device: nothing to sign out, so no buttons. */
export const OnlyThisDevice: Story = {
  args: { sessions: [{ id: "s1", device: "Chrome on macOS", kind: "desktop", lastActiveAt: Date.now(), current: true }], onRevoke: async () => undefined },
};

/** A failed sign out keeps the row and shows the error. */
export const RevokeFails: Story = {
  args: { sessions: [] },
  render: () => {
    const ar = useAr();
    return <ActiveSessions sessions={sample(ar)} onRevoke={async () => ({ error: ar ? "تعذّر إنهاء الجلسة. حاول مرة أخرى." : "Could not end the session. Try again." })} />;
  },
};

export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
