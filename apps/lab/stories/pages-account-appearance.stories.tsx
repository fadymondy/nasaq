/*
 * The Appearance page of account settings: theme gallery, reading comfort with a live sample, wallpaper with dimming,
 * and the time zone the account reads dates in. Choices apply to the page background as you make them.
 */
import { ReadingSettings, ThemeGallery, TimeZoneField, WallpaperPicker, wallpaperCss } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { PageShell } from "./_team-pages";
import { useAr, useThemes, useWallpapers } from "./_w3-demo";

const meta = { title: "Components/Account/Pages/Appearance Settings", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:p-6">
      <h2 className="text-h3 text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Page() {
  const ar = useAr();
  const themes = useThemes();
  const wallpapers = useWallpapers();
  const [theme, setTheme] = useState("paper");
  const [wall, setWall] = useState<string | null>("lagoon");
  const [dim, setDim] = useState(10);
  const [zone, setZone] = useState("Asia/Riyadh");
  const current = wallpapers.find((w) => w.id === wall);
  return (
    <div className="min-h-screen" style={{ background: current ? wallpaperCss(current.background) : undefined }}>
      <PageShell title={ar ? "المظهر" : "Appearance"} description={ar ? "كيف يبدو التطبيق وكيف تقرأ فيه." : "How the app looks and how you read in it."}>
        <Section title={ar ? "المظهر" : "Theme"}>
          <ThemeGallery themes={themes} value={theme} onValueChange={setTheme} label={false} aria-label={ar ? "المظهر" : "Theme"} />
        </Section>
        <Section title={ar ? "القراءة" : "Reading"}>
          <ReadingSettings />
        </Section>
        <Section title={ar ? "الخلفية" : "Wallpaper"}>
          <WallpaperPicker wallpapers={wallpapers} value={wall} onValueChange={setWall} dim={dim} onDimChange={setDim} onUpload={async () => {}} label={false} />
        </Section>
        <Section title={ar ? "المنطقة الزمنية" : "Time zone"}>
          <TimeZoneField value={zone} onValueChange={setZone} />
        </Section>
      </PageShell>
    </div>
  );
}

export const Default: Story = { render: () => <Page /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page /> };
