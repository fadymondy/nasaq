import { PlacementSettings, type PlacementValue, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/Integrations/Placement Settings", component: PlacementSettings, parameters: { layout: "padded" } } satisfies Meta<typeof PlacementSettings>;
export default meta;
type Story = StoryObj;

function Demo({ capability = false, fail = false }: { capability?: boolean; fail?: boolean }) {
  const ar = useAr();
  const [saved, setSaved] = useState<PlacementValue>({ mode: "sidebar", order: 10, defaultPage: false });
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <PlacementSettings
        value={saved}
        allowOverlays={capability}
        allowDefaultPage={capability}
        error={error}
        onSave={(changes) =>
          new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              setAttempts((n) => n + 1);
              if (fail && attempts === 0) {
                setError(ar ? "انتهت مهلة الخادم. حاول مرة أخرى." : "The server timed out. Try again.");
                reject(new Error("timeout"));
                return;
              }
              setError(null);
              setSaved((s) => ({ ...s, ...changes }));
              toast(ar ? "تم الحفظ" : "Saved");
              resolve();
            }, 900);
          })
        }
      />
      <pre data-testid="saved" dir="ltr" className="rounded-card border border-border bg-muted p-3 font-mono text-caption">
        {JSON.stringify(saved)}
      </pre>
    </div>
  );
}

/** A regular plugin: the side panel and floating widget are listed but not available. */
export const Default: Story = { render: () => <Demo /> };
/** A capability plugin: every mode, and "Open on start" (off for modes without a page). */
export const Capability: Story = { render: () => <Demo capability /> };
/** The first save fails with a reason; the next one works. */
export const SavingAndErrors: Story = { render: () => <Demo capability fail /> };
export const Arabic: Story = { ...Capability, globals: { locale: "ar" } };
