import "@nasaq/electron/chrome.css";
import {
  type ChromeInfo,
  type ChromeKind,
  controlsSide,
  type DesktopPlatform,
  describeChrome,
  useChromeInfo,
  WindowControls,
  WindowTitleBar,
} from "@nasaq/electron";
import { Button, Input } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PanelLeft, Search } from "lucide-react";

// Electron renderer chrome with simulated platforms. The OS draws the real caption buttons; the grey
// stand-ins here only show where they land, so you can check the reserved inset on each edge and in RTL.
const meta = {
  title: "Components/Apps & Platforms/Patterns/Desktop (Electron) Window Chrome",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function FakeOsControls({ info, dir }: { info: ChromeInfo; dir: "ltr" | "rtl" }) {
  if (info.chrome === "native" || info.chrome === "custom") return null;
  const side = controlsSide(info.platform, dir);
  const box = { position: "absolute", top: 0, [side]: 0, width: info.inset, height: info.titlebar, display: "flex", alignItems: "center", pointerEvents: "none" } as const;
  if (info.platform === "darwin")
    return (
      <div dir="ltr" style={{ ...box, gap: 8, paddingInline: 20, flexDirection: side === "right" ? "row-reverse" : "row" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />
        ))}
      </div>
    );
  return (
    <div dir="ltr" style={{ ...box, justifyContent: "flex-end" }}>
      {["—", "☐", "✕"].map((g) => (
        <span key={g} style={{ width: 46, textAlign: "center", fontSize: 11, color: "var(--nq-fg-muted)" }}>
          {g}
        </span>
      ))}
    </div>
  );
}

function Toolbar() {
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Sidebar">
        <PanelLeft />
      </Button>
      <div className="relative w-56">
        <Search className="pointer-events-none absolute start-2 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <Input className="h-7 ps-8" placeholder="Search" />
      </div>
    </>
  );
}

function Window({ info, dir, title = "Nasaq" }: { info: ChromeInfo | null; dir: "ltr" | "rtl"; title?: string }) {
  return (
    <div dir={dir} className="relative overflow-hidden rounded-lg border border-border bg-bg">
      <WindowTitleBar
        chrome={info}
        title={title}
        controls={<WindowControls onMinimize={() => {}} onMaximize={() => {}} onClose={() => {}} />}
      >
        <Toolbar />
      </WindowTitleBar>
      {info && <FakeOsControls info={info} dir={dir} />}
      <div className="h-40 p-4 text-sm text-fg-muted">
        {info ? `${info.platform} · ${info.chrome} · titlebar ${info.titlebar}px · inset ${info.inset}px` : "web: no desktop chrome"}
      </div>
    </div>
  );
}

/** Follows the toolbar's Platform and Direction. Pick macOS, Windows or Linux. */
export const Overview: Story = {
  render: function Render(_, { globals }) {
    const info = useChromeInfo();
    return <Window info={info} dir={globals.direction === "rtl" || globals.locale === "ar" ? "rtl" : "ltr"} />;
  },
};

const MATRIX: [DesktopPlatform, ChromeKind][] = [
  ["darwin", "inset"],
  ["win32", "overlay"],
  ["linux", "native"],
  ["linux", "custom"],
];

/** Every platform, LTR and RTL side by side. */
export const Platforms: Story = {
  render: () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {MATRIX.flatMap(([platform, chrome]) =>
        (["ltr", "rtl"] as const).map((dir) => (
          <Window key={`${platform}-${chrome}-${dir}`} info={describeChrome(platform, chrome)} dir={dir} title={dir === "rtl" ? "نسق" : "Nasaq"} />
        )),
      )}
    </div>
  ),
};
