import { DesktopAppIcon, type DesktopIconItem, DesktopIconGrid, type DesktopIconPosition, DesktopShell, ProductLogo } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Folder, Image, Music, Settings, Terminal } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";
import { Wallpaper } from "./_onboarding-demo";
import { desktopApps } from "./_w1-demo";

const meta = { title: "Components/Apps & Platforms/Desktop Icons", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const tx = (ar: boolean, en: string, arText: string) => (ar ? arText : en);

const items = (ar: boolean): DesktopIconItem[] => [
  { id: "notes", title: tx(ar, "Notes", "الملاحظات"), icon: <DesktopAppIcon><FileText aria-hidden /></DesktopAppIcon> },
  { id: "files", title: tx(ar, "Files", "الملفات"), icon: <DesktopAppIcon><Folder aria-hidden /></DesktopAppIcon> },
  { id: "terminal", title: tx(ar, "Terminal", "الطرفية"), icon: <DesktopAppIcon><Terminal aria-hidden /></DesktopAppIcon> },
  { id: "photos", title: tx(ar, "Holiday photos 2026", "صور العطلة 2026"), icon: <DesktopAppIcon><Image aria-hidden /></DesktopAppIcon> },
  { id: "music", title: tx(ar, "Music", "الموسيقى"), icon: <DesktopAppIcon><Music aria-hidden /></DesktopAppIcon> },
  { id: "settings", title: tx(ar, "Settings", "الإعدادات"), icon: <DesktopAppIcon><Settings aria-hidden /></DesktopAppIcon> },
];

function Log({ text }: { text: string }) {
  return <p className="absolute bottom-3 start-3 rounded-sm bg-card px-2 py-1 text-caption text-muted-foreground">{text}</p>;
}

function GridDemo() {
  const ar = useAr();
  const [hidden, setHidden] = useState<string[]>([]);
  const [last, setLast] = useState("");
  return (
    <div className="relative isolate h-dvh">
      <div className="absolute inset-0 -z-10">
        <Wallpaper />
      </div>
      <DesktopIconGrid
        items={items(ar)}
        hiddenIds={hidden}
        onOpen={(item) => setLast(tx(ar, `Opened ${item.title}`, `فُتح ${item.title}`))}
        onRemove={(item) => setHidden((h) => [...h, item.id])}
      />
      {last ? <Log text={last} /> : null}
    </div>
  );
}

/** An auto grid. Double-click (a tap on touch screens, or Enter) opens; arrow keys move; context-click for Open and Remove. */
export const Grid: Story = { render: () => <GridDemo /> };

function FreeDemo() {
  const ar = useAr();
  const [positions, setPositions] = useState<Record<string, DesktopIconPosition>>({ settings: { x: 392, y: 224 } });
  return (
    <div className="relative isolate h-dvh">
      <div className="absolute inset-0 -z-10">
        <Wallpaper />
      </div>
      <DesktopIconGrid items={items(ar)} positions={positions} onMove={(item, p) => setPositions((all) => ({ ...all, [item.id]: p }))} onOpen={() => {}} />
      <Log text={tx(ar, "Drag the icons. Positions are kept in state.", "اسحب الأيقونات. تُحفظ المواضع في الحالة.")} />
    </div>
  );
}

/** With `onMove`, icons drag anywhere and snap to cells. Save the positions you get back. */
export const FreePlacement: Story = { render: () => <FreeDemo /> };

function ShellDemo() {
  const ar = useAr();
  const apps = desktopApps(ar);
  return (
    <div className="h-dvh w-full">
      <DesktopShell apps={apps} menuBarStart={<ProductLogo size={16} className="px-1" />}>
        {({ open }) => <DesktopIconGrid items={apps.map(({ id, title, icon }) => ({ id, title, icon }))} onOpen={(item) => open(item.id)} />}
      </DesktopShell>
    </div>
  );
}

/** Inside a `DesktopShell`: the children function gets `open`, so an icon opens its app window. */
export const InDesktopShell: Story = { render: () => <ShellDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <ShellDemo /> };
