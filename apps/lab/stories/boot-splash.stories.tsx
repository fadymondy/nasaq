import { BootSplash } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { useAr } from "./_onboarding-demo";

const meta = { title: "Pages/System/Boot Splash", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ failed = false, slow = false }: { failed?: boolean; slow?: boolean }) {
  const ar = useAr();
  const [p, setP] = useState(8);
  useEffect(() => {
    if (failed) return;
    const id = setInterval(() => setP((n) => (n >= 92 ? 92 : n + 6)), 500);
    return () => clearInterval(id);
  }, [failed]);
  return (
    <BootSplash
      className="min-h-dvh"
      name="Nasaq"
      state={failed ? "failed" : "loading"}
      stage={p < 40 ? (ar ? "تحميل الإعدادات" : "Loading settings") : ar ? "تجهيز مساحة العمل" : "Preparing your workspace"}
      progress={p}
      slowAfterMs={slow ? 1500 : 12000}
      error={failed ? { message: ar ? "تعذّر الاتصال بالخادم." : "We could not reach the server.", detail: "ERR_NETWORK · api.nasaq.app" } : undefined}
      onRetry={() => {}}
    />
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Slow: Story = { render: () => <Demo slow /> };
export const Failed: Story = { render: () => <Demo failed /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Demo /> };
