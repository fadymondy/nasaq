import { WhatsappQrConnect, type WhatsappConnectStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fakeSecret, wait } from "./_connectors-demo";

const meta = { title: "Components/Developer/WhatsApp QR Connect" } satisfies Meta;
export default meta;
type Story = StoryObj;

const TTL = 20_000;

/** Start pairing, watch the countdown, and a fresh code appears when it runs out. The link under the card is demo only: it stands in for the phone finishing the scan. */
function Flow({ start = "disconnected" }: { start?: WhatsappConnectStatus }) {
  const [status, setStatus] = useState<WhatsappConnectStatus>(start);
  const [qr, setQr] = useState<string | undefined>(start === "qr" ? `2@${fakeSecret("")}` : undefined);
  const [expiresAt, setExpiresAt] = useState<number | undefined>(start === "qr" ? Date.now() + TTL : undefined);
  const issue = () => {
    setQr(`2@${fakeSecret("")},${fakeSecret("")}`);
    setExpiresAt(Date.now() + TTL);
    setStatus("qr");
  };
  return (
    <div className="flex flex-col gap-3">
      <WhatsappQrConnect
        status={status}
        qr={qr}
        expiresAt={expiresAt}
        account="+966 50 123 4567"
        connectedSince="12 Mar 2026"
        onStart={async () => {
          await wait(700);
          issue();
        }}
        onRefresh={async () => {
          await wait(500);
          issue();
        }}
        onDisconnect={async () => {
          await wait(600);
          setStatus("disconnected");
          setQr(undefined);
        }}
      />
      {status === "qr" ? (
        <button type="button" className="self-start text-caption text-muted-foreground underline" onClick={() => setStatus("connected")}>
          Demo only: pretend the phone scanned it
        </button>
      ) : null}
    </div>
  );
}

export const Default: Story = { render: () => <Flow /> };
export const ShowingCode: Story = { name: "Showing code", render: () => <Flow start="qr" /> };
export const Connected: Story = { render: () => <Flow start="connected" /> };
export const Failed: Story = { render: () => <WhatsappQrConnect status="disconnected" error onStart={async () => undefined} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Flow start="qr" /> };
