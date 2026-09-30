import { Button, type DesktopPermission, InstallPrompt, type PushDevice, PushOptIn, ToggleGroup, Toggle } from "@nasaq/web";
import type { InstallPlatform } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pushDevices, useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Components/Utilities/Install Prompt" } satisfies Meta;
export default meta;
type Story = StoryObj;

function InstallDemo({ initial = "prompt" }: { initial?: InstallPlatform }) {
  const ar = useAr();
  const [platform, setPlatform] = useState<InstallPlatform>(initial);
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup aria-label="Platform" value={[platform]} onValueChange={(v) => v[0] && setPlatform(v[0] as InstallPlatform)}>
        {(["prompt", "ios", "installed", "unsupported"] as const).map((p) => (
          <Toggle key={p} value={p} dir="ltr">
            {p}
          </Toggle>
        ))}
      </ToggleGroup>
      <div>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {ar ? "افتح نافذة التثبيت" : "Open the install dialog"}
        </Button>
      </div>
      <InstallPrompt
        open={open}
        onOpenChange={setOpen}
        platform={platform}
        appName={ar ? "نسق" : "Nasaq"}
        onInstall={async () => {
          await wait(1200);
          setPlatform("installed");
        }}
      />
    </div>
  );
}

function PushDemo({ start = "default" }: { start?: DesktopPermission }) {
  const ar = useAr();
  const [permission, setPermission] = useState<DesktopPermission>(start);
  const [subscribed, setSubscribed] = useState(start === "granted");
  const [devices, setDevices] = useState<PushDevice[]>(() => pushDevices(ar));
  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup aria-label="Permission" value={[permission]} onValueChange={(v) => v[0] && setPermission(v[0] as DesktopPermission)}>
        {(["default", "granted", "denied", "unsupported"] as const).map((p) => (
          <Toggle key={p} value={p} dir="ltr">
            {p}
          </Toggle>
        ))}
      </ToggleGroup>
      <PushOptIn
        permission={permission}
        onRequestPermission={async () => {
          await wait(1200);
          setPermission("granted");
          setSubscribed(true);
        }}
        subscribed={subscribed}
        onSubscribedChange={async (on) => {
          await wait(500);
          setSubscribed(on);
        }}
        devices={devices.filter((d) => (subscribed ? true : !d.current))}
        onRemoveDevice={async (id) => {
          await wait(500);
          setDevices((l) => l.filter((d) => d.id !== id));
        }}
        onTest={() => {}}
        requiresInstall={false}
        onOpenSettings={() => {}}
      />
    </div>
  );
}

export const InstallDialog: Story = { render: () => <InstallDemo /> };
export const InstallIos: Story = { name: "Install on iPhone", render: () => <InstallDemo initial="ios" /> };
export const PushOptInStory: Story = { name: "Push opt-in", render: () => <PushDemo /> };
export const PushGranted: Story = { render: () => <PushDemo start="granted" /> };
export const Arabic: Story = {
  globals: { locale: "ar" },
  render: () => (
    <div className="flex flex-col gap-8">
      <InstallDemo />
      <PushDemo start="granted" />
    </div>
  ),
};
