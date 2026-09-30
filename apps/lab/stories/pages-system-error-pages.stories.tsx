/*
 * The error pages: 404, 500, offline, maintenance, no access, unknown workspace and coming soon. Default shows all of
 * them behind a small switcher; each page also has its own story.
 */
import { type ErrorPageKind, ErrorPage, ToggleGroup, Toggle, toast, useOnlineStatus } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_lifecycle-demo";

const meta = { title: "Pages/System/Error Pages", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const KINDS: ErrorPageKind[] = ["not-found", "server-error", "offline", "maintenance", "forbidden", "unknown-workspace", "coming-soon"];

function Page({ kind }: { kind: ErrorPageKind }) {
  const ar = useAr();
  const online = useOnlineStatus();
  const say = (m: string) => () => toast.message(m);
  return (
    <ErrorPage
      kind={kind}
      errorId="req_8f3a2c91e7"
      workspace="acme-studio"
      moduleName={ar ? "التقارير المتقدمة" : "Advanced reports"}
      eta={Date.now() + 45 * 60_000}
      online={kind === "offline" ? online : false}
      onHome={say("home")}
      onBack={say("back")}
      onRetry={async () => {
        await wait(900);
        toast.message("retry");
      }}
      onContactSupport={say("support")}
      onSwitchWorkspace={say("switch workspace")}
      onRequestAccess={async () => {
        await wait(900);
        toast.success(ar ? "أُرسل الطلب" : "Request sent");
      }}
      onNotify={async () => {
        await wait(700);
      }}
    />
  );
}

function Switcher({ initial = "not-found" }: { initial?: ErrorPageKind }) {
  const [kind, setKind] = useState<ErrorPageKind>(initial);
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-2 z-10 flex justify-center px-2">
        <ToggleGroup aria-label="Page" className="max-w-full flex-wrap" value={[kind]} onValueChange={(v) => v[0] && setKind(v[0] as ErrorPageKind)}>
          {KINDS.map((k) => (
            <Toggle key={k} value={k} dir="ltr">
              {k}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <Page key={kind} kind={kind} />
    </div>
  );
}

export const Default: Story = { render: () => <Switcher /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Switcher /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Switcher initial="server-error" /> };

export const NotFound: Story = { render: () => <Page kind="not-found" /> };
export const ServerError: Story = { render: () => <Page kind="server-error" /> };
export const Offline: Story = { render: () => <Page kind="offline" /> };
export const Maintenance: Story = { render: () => <Page kind="maintenance" /> };
export const Forbidden: Story = { render: () => <Page kind="forbidden" /> };
export const UnknownWorkspace: Story = { render: () => <Page kind="unknown-workspace" /> };
export const ComingSoon: Story = { render: () => <Page kind="coming-soon" /> };
export const ForbiddenArabic: Story = { globals: { locale: "ar" }, render: () => <Page kind="forbidden" /> };
