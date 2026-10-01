/*
 * The flow after sign-up. Try: leave the name empty and Continue (error), name the workspace "taken" (server error),
 * skip the optional steps, switch language or theme on Preferences (it applies live), then reload mid-way to resume.
 */
import { Button, OnboardingFlow } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fakeSave, sleep, useAr } from "./_x1-demo";

const meta = { title: "Components/Onboarding/Pages/Flow", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page({ storageKey }: { storageKey?: string }) {
  const ar = useAr();
  const [key, setKey] = useState(0);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-4 p-4 sm:p-8">
      <OnboardingFlow
        key={key}
        userName={ar ? "نور" : "Nour"}
        storageKey={storageKey}
        onSaveProfile={() => fakeSave(ar)}
        onUploadAvatar={async (_file, c) => {
          for (const p of [20, 55, 90, 100]) {
            await sleep(200);
            c.onProgress(p);
          }
        }}
        onWorkspace={(w) => fakeSave(ar, w.name)}
        onInvite={() => fakeSave(ar)}
        onPreferences={() => fakeSave(ar)}
        onConnect={async (id) => {
          await sleep(900);
          if (id === "microsoft") return { error: ar ? "رفض Microsoft الاتصال. حاول مرة أخرى." : "Microsoft refused the connection. Try again." };
        }}
        onFinish={async () => {
          await sleep(900);
        }}
        doneAction={
          <Button variant="primary" onClick={() => setKey((k) => k + 1)}>
            {ar ? "افتح لوحة التحكم" : "Open the dashboard"}
          </Button>
        }
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
/** Progress is kept in `localStorage`: move ahead a few steps, reload the story, and it resumes. */
export const Resumes: Story = { name: "Saves and resumes", render: () => <Page storageKey="nasaq-lab-onboarding" /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
