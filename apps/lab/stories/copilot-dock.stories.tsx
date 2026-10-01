import { CopilotDock, type CopilotDockSide } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCopilotProps } from "./_copilot-demo";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/AI Assistant/Copilot Dock", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

function Demo({ defaultOpen = false, side, bar = false, expanded = false }: { defaultOpen?: boolean; side?: CopilotDockSide; bar?: boolean; expanded?: boolean }) {
  const ar = useAr();
  const props = useCopilotProps(false);
  return (
    <div className="relative h-[40rem] overflow-hidden border border-border bg-muted/40 p-6">
      <p className="max-w-md text-body-sm text-muted-foreground">
        {ar
          ? "اضغط زر المساعد أو ⌘J / Ctrl+J. تبقى الصفحة قابلة للاستخدام بجانب اللوحة، ويغلقها Escape."
          : "Press the assistant button or ⌘J / Ctrl+J. The page stays usable beside the panel; Escape closes it."}
      </p>
      <CopilotDock {...props} placement="absolute" defaultOpen={defaultOpen} defaultSide={side} collapsedBar={bar} defaultExpanded={expanded} persistKey="nasaq-lab-copilot-side" />
    </div>
  );
}

/** Closed: the launcher waits at the bottom inline-end corner. */
export const Default: Story = { render: () => <Demo /> };

/** Open: the panel docks to the inline-end edge. */
export const Open: Story = { render: () => <Demo defaultOpen /> };

/** The position menu in the header moves the panel; `persistKey` remembers the choice. */
export const DockedStart: Story = { render: () => <Demo defaultOpen side="start" /> };

export const DockedBottom: Story = { render: () => <Demo defaultOpen side="bottom" /> };

/** A floating window in the corner. */
export const Floating: Story = { render: () => <Demo defaultOpen side="float" /> };

/** Expanded over the whole page. Escape or the button goes back to the panel. */
export const Expanded: Story = { render: () => <Demo defaultOpen expanded /> };

/** While closed, a slim bar at the bottom: type and press Enter to ask and open. */
export const CollapsedBar: Story = { render: () => <Demo bar /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo defaultOpen /> };
