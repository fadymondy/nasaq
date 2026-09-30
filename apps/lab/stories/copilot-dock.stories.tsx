import { CopilotDock } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCopilotProps } from "./_copilot-demo";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/AI/Copilot Dock", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const ar = useAr();
  const props = useCopilotProps(false);
  return (
    <div className="relative h-[40rem] overflow-hidden border border-border bg-muted/40 p-6">
      <p className="max-w-md text-body-sm text-muted-foreground">
        {ar
          ? "اضغط زر المساعد أو ⌘J / Ctrl+J. تبقى الصفحة قابلة للاستخدام بجانب اللوحة، ويغلقها Escape."
          : "Press the assistant button or ⌘J / Ctrl+J. The page stays usable beside the panel; Escape closes it."}
      </p>
      <CopilotDock {...props} placement="absolute" defaultOpen={defaultOpen} />
    </div>
  );
}

/** Closed: the launcher waits at the bottom inline-end corner. */
export const Default: Story = { render: () => <Demo /> };

/** Open: the panel docks to the inline-end edge. */
export const Open: Story = { render: () => <Demo defaultOpen /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo defaultOpen /> };
