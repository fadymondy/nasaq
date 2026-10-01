import { ProviderSwitcher, type ProviderCapability } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { frame } from "./_frame";
import { useAr, wait } from "./_lifecycle-demo";

const meta = {
  title: "Components/Developer Tools/Provider Switcher",
  decorators: [frame("w-full max-w-3xl")],
} satisfies Meta;
export default meta;
type Story = StoryObj;

const seed = (ar: boolean): ProviderCapability[] => [
  {
    capability: "data",
    label: ar ? "البيانات" : "Data",
    description: ar ? "قاعدة البيانات الرئيسية للتطبيق." : "The app's primary database.",
    active: "postgres",
    options: [
      { id: "postgres", label: "PostgreSQL" },
      { id: "sqlite", label: "SQLite", description: ar ? "ملف محلي، للتطوير" : "Local file, for development" },
      { id: "mysql", label: "MySQL" },
    ],
    isDefault: true,
  },
  { capability: "queue", label: ar ? "الطوابير" : "Queue", description: ar ? "المهام في الخلفية." : "Background jobs.", active: "redis", options: ["redis", "nats", "database"], isDefault: false },
  { capability: "cache", label: ar ? "الذاكرة المؤقتة" : "Cache", active: "memory", options: ["memory", "redis"], isDefault: true },
  { capability: "storage", label: ar ? "الملفات" : "Storage", description: ar ? "الرفع والمرفقات." : "Uploads and attachments.", active: "s3", options: ["local", "s3", "r2"], isDefault: true },
  { capability: "realtime", label: ar ? "الوقت الفعلي" : "Realtime", description: ar ? "مثبّت في الإعدادات." : "Pinned in config.", active: "websocket", options: ["websocket", "sse"], locked: true, isDefault: true },
];

function Demo() {
  const ar = useAr();
  const [rows, setRows] = useState(() => seed(ar));
  const defaults = Object.fromEntries(seed(ar).map((r) => [r.capability, r.isDefault ? r.active : null]));
  return (
    <ProviderSwitcher
      capabilities={rows}
      onSelect={async (capability, backend) => {
        await wait(600);
        setRows((all) => all.map((r) => (r.capability === capability ? { ...r, active: backend, isDefault: defaults[capability] === backend } : r)));
      }}
    />
  );
}

/** Switch a backend: the row is busy while the change applies, then shows Default or Overridden. Realtime is pinned. */
export const Default: Story = { render: () => <Demo /> };

/** Read-only: no `onSelect`, so every select is disabled. */
export const ReadOnly: Story = { render: () => <ProviderSwitcher capabilities={seed(false)} /> };

export const Empty: Story = { render: () => <ProviderSwitcher capabilities={[]} /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
