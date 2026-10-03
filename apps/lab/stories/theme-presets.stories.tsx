import { Badge, Button, THEME_PRESETS, ThemePresetPicker, ThemePresetScope } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Brand/Theme Presets", component: ThemePresetPicker, parameters: { layout: "padded" } } satisfies Meta<typeof ThemePresetPicker>;
export default meta;
type Story = StoryObj;

function Preview({ ar }: { ar: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="text-label text-foreground">{ar ? "لوحة التحكم" : "Dashboard"}</span>
        <Badge variant="brand">{ar ? "جديد" : "New"}</Badge>
        <Badge variant="accent">{ar ? "مميز" : "Featured"}</Badge>
      </div>
      <p className="text-body-sm text-muted-foreground">{ar ? "معاينة حية للسمة المختارة." : "A live preview of the chosen theme."}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="primary">{ar ? "حفظ" : "Save"}</Button>
        <Button size="sm" variant="secondary">
          {ar ? "إلغاء" : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Pick a preset; the region below renders in it through `ThemePresetScope`, so the rest of the lab is untouched.
 * In an app, `useThemePreset()` applies the choice to the whole page and remembers it.
 */
function Demo({ tenant }: { tenant?: string }) {
  const ar = useAr();
  const [value, setValue] = useState("purple");
  const preset = THEME_PRESETS.find((p) => p.id === value)!;
  const overrides = tenant ? { brand: tenant } : undefined;
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <ThemePresetPicker value={value} onValueChange={setValue} overrides={overrides} />
      <ThemePresetScope preset={preset} overrides={overrides} className="rounded-card border border-border">
        <Preview ar={ar} />
      </ThemePresetScope>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };

/** `overrides={{ brand }}`: a tenant colour over every preset, keeping each preset's mode and accent. */
// nasaq-lint-ignore-next-line
export const WithOverrides: Story = { name: "With overrides", render: () => <Demo tenant="#1F6FEB" /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
