import { AuthBackdrop, AuthEmblem, Button, Card, CardContent } from "@nasaq/web";
import { Fingerprint } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { sleep, useAr } from "./_auth";

const meta = { title: "Components/Auth/Auth Emblem", component: AuthEmblem } satisfies Meta<typeof AuthEmblem>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The mark sweeps in, turns into a lock that clicks shut, and then the rings turn slowly. Reload to replay. */
export const Default: Story = { args: { size: 112 } };

/** `lock={false}` keeps the product mark in the core. */
export const WithoutLock: Story = { args: { size: 112, lock: false } };

/** `busy` scans the rings, for a pending request outside an `AuthLayout`. */
export const Busy: Story = { args: { size: 112, busy: true } };

/** Any size: the core mark is 30% of it. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-8">
      <AuthEmblem size={64} />
      <AuthEmblem size={112} />
      <AuthEmblem size={176} />
    </div>
  ),
};

/** A custom core: any node as children, here for a passkey prompt. */
export const CustomCore: Story = {
  render: () => (
    <AuthEmblem size={112} lock={false}>
      <Fingerprint aria-hidden="true" className="size-8 text-nq-action" />
    </AuthEmblem>
  ),
};

function OverCard() {
  const ar = useAr();
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true);
    await sleep(2000);
    setBusy(false);
  };
  return (
    <div className="relative isolate flex min-h-96 w-full max-w-lg items-center justify-center overflow-hidden rounded-xl border border-border p-8">
      <AuthBackdrop />
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <AuthEmblem size={96} busy={busy} />
          <div className="flex flex-col gap-1">
            <p className="text-h3 text-foreground">{ar ? "تأكيد هويتك" : "Confirm it is you"}</p>
            <p className="text-body-sm text-muted-foreground">{ar ? "نتحقق من جهازك قبل المتابعة." : "We check your device before you continue."}</p>
          </div>
          <Button className="w-full" onClick={verify} disabled={busy} aria-busy={busy}>
            {busy ? (ar ? "جارٍ التحقق…" : "Verifying…") : ar ? "تحقّق" : "Verify"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** The emblem and the backdrop on their own, over a `Card` (not in an `AuthLayout`). The button drives `busy`. */
export const OverAComponent: Story = { name: "Over a component", render: () => <OverCard /> };
