import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { KanbanSquare, ReceiptText, Timer } from "lucide-react";

const meta = { title: "Components/Navigation/Tabs", component: Tabs, args: { defaultValue: "board" } } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

function Example({ variant }: { variant: "segmented" | "underline" }) {
  const ar = useNasaq().locale.startsWith("ar");
  const tabs = [
    { value: "board", icon: <KanbanSquare />, label: ar ? "اللوحة" : "Board", body: ar ? "لوحات وقوائم لكل مشروع." : "Boards and lists per project." },
    { value: "timer", icon: <Timer />, label: ar ? "المؤقّت" : "Timer", body: ar ? "مؤقّت واحد لكل شخص، متزامن في كل مكان." : "One running timer per person, synced everywhere." },
    { value: "invoices", icon: <ReceiptText />, label: ar ? "الفواتير" : "Invoices", body: ar ? "فوترة الوقت غير المفوتر." : "Invoice unbilled time." },
  ];
  return (
    <Tabs defaultValue="board" className="w-full max-w-lg">
      <TabsList variant={variant} aria-label={ar ? "لقطات الشاشة" : "Screenshots"}>
        {tabs.map((t) => (
          <TabsTab key={t.value} value={t.value}>
            {t.icon}
            {t.label}
          </TabsTab>
        ))}
        <TabsIndicator />
      </TabsList>
      {tabs.map((t) => (
        <TabsPanel key={t.value} value={t.value} className="text-body-sm text-muted-foreground">
          {t.body}
        </TabsPanel>
      ))}
    </Tabs>
  );
}

/** Segmented: a few short options in a track. Arrow keys follow the reading direction. */
export const Playground: Story = { render: () => <Example variant="segmented" /> };

/** Underline: page sections. */
export const Underline: Story = { render: () => <Example variant="underline" /> };
