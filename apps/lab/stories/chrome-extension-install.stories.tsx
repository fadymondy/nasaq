import { ChromeExtensionInstall } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { wait } from "./_connectors-demo";

const meta = { title: "Components/Apps & Platforms/Chrome Extension Install" } satisfies Meta;
export default meta;
type Story = StoryObj;

const STORE = "https://chromewebstore.google.com/";

/** The demo finds the extension on the second Check again, then pin and sign in complete the steps. */
function Flow({ start = "missing" }: { start?: "missing" | "installed" | "ready" }) {
  const [installed, setInstalled] = useState(start !== "missing");
  const [signedIn, setSignedIn] = useState(start === "ready");
  const [tries, setTries] = useState(0);
  return (
    <ChromeExtensionInstall
      storeUrl={STORE}
      installed={installed}
      version={installed ? "1.4.2" : undefined}
      signedIn={signedIn}
      defaultPinned={start === "ready"}
      onCheck={async () => {
        await wait(600);
        setTries((n) => n + 1);
        if (tries >= 1) setInstalled(true);
      }}
      onSignIn={async () => {
        await wait(800);
        setSignedIn(true);
      }}
    />
  );
}

export const Default: Story = { render: () => <Flow /> };
export const Installed: Story = { render: () => <Flow start="installed" /> };
export const AllDone: Story = { name: "All done", render: () => <Flow start="ready" /> };
export const Unsupported: Story = { render: () => <ChromeExtensionInstall storeUrl={STORE} installed={false} supported={false} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Flow /> };
