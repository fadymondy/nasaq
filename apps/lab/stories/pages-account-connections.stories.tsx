/*
 * The Connections page of an account: sign-in providers, service integrations (OAuth with scopes and an
 * account picker), the browser extension and WhatsApp. Real components, fake async callbacks.
 */
import { ChromeExtensionInstall, ConnectedAccounts, type ConnectedProvider, WhatsappQrConnect, type WhatsappConnectStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fakeSecret, IntegrationDemo, useAr, wait } from "./_connectors-demo";

const meta = { title: "Pages/Account/Connections", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Page() {
  const ar = useAr();
  const [accounts, setAccounts] = useState<ConnectedProvider[]>([
    { id: "google", connected: true, account: "sara@example.com" },
    { id: "github", connected: true, account: "sara-dev" },
  ]);
  const [installed, setInstalled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [wa, setWa] = useState<WhatsappConnectStatus>("disconnected");
  const [qr, setQr] = useState<string>();
  const [expiresAt, setExpiresAt] = useState<number>();
  const issue = () => {
    setQr(`2@${fakeSecret("")}`);
    setExpiresAt(Date.now() + 20_000);
    setWa("qr");
  };
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 sm:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-foreground">{ar ? "الاتصالات" : "Connections"}</h1>
        <p className="text-body text-muted-foreground">{ar ? "الخدمات والحسابات والأدوات المرتبطة بحسابك." : "The services, accounts and tools linked to your account."}</p>
      </header>
      <ConnectedAccounts
        className="max-w-none"
        providers={accounts}
        onConnect={async (id) => {
          await wait();
          setAccounts((l) => l.map((p) => (p.id === id ? { ...p, connected: true, account: `${id}-user@example.com` } : p)));
        }}
        onDisconnect={async (id) => {
          await wait();
          setAccounts((l) => l.map((p) => (p.id === id ? { ...p, connected: false, account: undefined } : p)));
        }}
      />
      <IntegrationDemo />
      <ChromeExtensionInstall
        className="max-w-none"
        storeUrl="https://chromewebstore.google.com/"
        installed={installed}
        version="1.4.2"
        signedIn={signedIn}
        onCheck={async () => {
          await wait(600);
          setInstalled(true);
        }}
        onSignIn={async () => {
          await wait(700);
          setSignedIn(true);
        }}
      />
      <WhatsappQrConnect
        className="max-w-none"
        status={wa}
        qr={qr}
        expiresAt={expiresAt}
        account="+966 50 123 4567"
        connectedSince={ar ? "١٢ مارس ٢٠٢٦" : "12 Mar 2026"}
        onStart={async () => {
          await wait(600);
          issue();
        }}
        onRefresh={async () => {
          await wait(400);
          issue();
        }}
        onDisconnect={async () => {
          await wait(500);
          setWa("disconnected");
        }}
      />
    </main>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
