import { Button, TypingTerminal, type TypingTerminalStep } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRight } from "lucide-react";
import { useAr } from "./_lifecycle-demo";

const meta = {
  title: "Components/Website/Typing Terminal",
  component: TypingTerminal,
  parameters: { layout: "padded" },
  args: { steps: [] },
} satisfies Meta<typeof TypingTerminal>;
export default meta;
type Story = StoryObj<typeof meta>;

const steps: TypingTerminalStep[] = [
  { cmd: "npx create-togo-app my-shop", out: ["\u001b[32m✓\u001b[0m Template: storefront", "\u001b[32m✓\u001b[0m Installed 214 packages in 6.2s"] },
  { cmd: "cd my-shop && togo dev", out: ["\u001b[36mapi\u001b[0m  listening on :8080", "\u001b[36mweb\u001b[0m  ready on http://localhost:5173"] },
];

function EndSlot() {
  const ar = useAr();
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-body-sm text-foreground">{ar ? "متجرك يعمل محليًا." : "Your shop is running locally."}</p>
      <Button size="sm" variant="primary">
        {ar ? "افتح المتجر" : "Open the shop"}
        <ArrowRight aria-hidden className="rtl:rotate-180" />
      </Button>
    </div>
  );
}

/** Types each command, prints its output, then offers Replay. */
export const Playground: Story = { args: { steps, title: "~/my-shop" } };

/** `endSlot` appears when the playback ends: a screenshot of the result, or a call to action. */
export const WithEndSlot: Story = { args: { steps, title: "~/my-shop", endSlot: <EndSlot /> } };

/** Starts again after a pause, for a hero that stays on screen. */
export const Loop: Story = { args: { steps, loop: true, typeMs: 20, height: 220 } };

/** `play={false}`: the finished transcript, as servers, crawlers and reduced motion get it. */
export const Static: Story = { args: { steps, play: false, height: 220 } };

export const Arabic: Story = { globals: { locale: "ar" }, args: { steps, endSlot: <EndSlot /> } };
