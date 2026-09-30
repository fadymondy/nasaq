/*
 * Idle auto-lock. The timeout here is 12 seconds with a 6 second warning so you can watch it: stop touching the page.
 * The lock screen unlocks with PIN or password `123456`.
 */
import { Button, Card, IdleLock, LockScreen } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DEMO_NOW, Wallpaper, demoUser } from "./_onboarding-demo";
import { sleep, useAr } from "./_x1-demo";

const meta = { title: "Pages/Auth/Idle Lock", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ timeoutSeconds = 12, warningSeconds = 6 }: { timeoutSeconds?: number; warningSeconds?: number }) {
  const ar = useAr();
  const [locked, setLocked] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  return (
    <IdleLock
      timeoutSeconds={timeoutSeconds}
      warningSeconds={warningSeconds}
      locked={locked}
      onLockedChange={(next, reason) => {
        setLocked(next);
        setLog((l) => [`${next ? "locked" : "unlocked"} (${reason})`, ...l].slice(0, 4));
      }}
      lockScreen={({ unlock }) => (
        <LockScreen
          className="min-h-dvh"
          user={demoUser(ar)}
          methods={["passkey", "pin", "password"]}
          reason="idle"
          wallpaper={<Wallpaper />}
          now={DEMO_NOW}
          onSignOut={() => {}}
          onUnlock={async (a) => {
            await sleep(500);
            if (a.method !== "passkey" && a.secret !== "123456") return { error: ar ? "غير صحيح. حاول مرة أخرى." : "That is not right. Try again." };
            unlock();
          }}
        />
      )}
    >
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 p-6">
        <h1 className="text-h2 text-foreground">{ar ? "لوحة العمل" : "Workspace"}</h1>
        <p className="text-body text-muted-foreground">
          {ar ? `توقف عن اللمس ${timeoutSeconds - warningSeconds} ثوانٍ لترى التحذير، ثم يُقفل التطبيق.` : `Stop touching the page for ${timeoutSeconds - warningSeconds} seconds to see the warning, then the app locks.`}
        </p>
        <Card className="gap-2 p-4">
          <Button variant="secondary" className="self-start" onClick={() => setLocked(true)}>
            {ar ? "اقفل الآن" : "Lock now"}
          </Button>
          <ul dir="ltr" className="text-caption text-muted-foreground">
            {log.map((entry, i) => (
              <li key={`${entry}-${i}`}>{entry}</li>
            ))}
          </ul>
        </Card>
      </main>
    </IdleLock>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
