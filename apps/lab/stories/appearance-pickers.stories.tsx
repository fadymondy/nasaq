import { ReadingSettings, ThemeGallery, WallpaperPicker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, useThemes, useWallpapers } from "./_w3-demo";

const meta = { title: "Components/Pickers/Appearance Pickers", component: ThemeGallery, parameters: { layout: "padded" } } satisfies Meta<typeof ThemeGallery>;
export default meta;
type Story = StoryObj;

function Demo() {
  const ar = useAr();
  const themes = useThemes();
  const wallpapers = useWallpapers();
  const [theme, setTheme] = useState("paper");
  const [wall, setWall] = useState<string | null>("lagoon");
  const [dim, setDim] = useState(20);
  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <ThemeGallery themes={themes} value={theme} onValueChange={setTheme} />
      <div className="flex flex-col gap-3">
        <div className="text-label text-foreground">{ar ? "القراءة" : "Reading"}</div>
        <ReadingSettings />
      </div>
      <WallpaperPicker wallpapers={wallpapers} value={wall} onValueChange={setWall} dim={dim} onDimChange={setDim} onUpload={async () => {}} />
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
