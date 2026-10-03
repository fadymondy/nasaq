import { type CopilotAttachment, CopilotChat } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Brain, Globe } from "lucide-react";
import { useState } from "react";
import { CopilotDemo, useCopilotProps } from "./_copilot-demo";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/AI Assistant/Copilot Chat" } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Side panel. Pick a starter or type: tool steps run, the answer streams, then sources and follow-ups appear. */
export const Panel: Story = { render: () => <CopilotDemo /> };

/** Full page column with two-column starters. */
export const Page: Story = { render: () => <CopilotDemo mode="page" height="44rem" /> };

/** A finished answer with folded steps, sources, a copy-for-AI code block and follow-ups. */
export const Answered: Story = { render: () => <CopilotDemo seeded /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <CopilotDemo seeded /> };

function ComposerDemo() {
  const ar = useAr();
  const props = useCopilotProps(false);
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([
    { id: "a1", name: "q3-report.pdf", type: "application/pdf", size: 482_133 },
    { id: "a2", name: "photo.png", type: "image/png", size: 1_204_000, progress: 0.4 },
  ]);
  const [toggles, setToggles] = useState<string[]>(["web"]);
  // A fake upload: each file climbs to 100% in a second.
  const attach = (files: File[]) => {
    const added = files.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, type: f.type, size: f.size, url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined, progress: 0 }));
    setAttachments((prev) => [...prev, ...added]);
    for (const step of [35, 70, 100]) {
      setTimeout(() => setAttachments((prev) => prev.map((a) => (added.some((x) => x.id === a.id) ? { ...a, progress: step === 100 ? undefined : step / 100 } : a))), step * 10);
    }
  };
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-card border border-border" style={{ height: "44rem" }}>
      <CopilotChat
        {...props}
        onSend={(text) => {
          setAttachments([]);
          return props.onSend(text);
        }}
        attachments={attachments}
        onAttach={attach}
        onAttachmentsChange={setAttachments}
        commands={[
          { id: "summarize", label: ar ? "لخّص" : "Summarize", description: ar ? "ملخص قصير" : "A short summary" },
          { id: "translate", label: ar ? "ترجم" : "Translate", description: ar ? "إلى الإنجليزية أو العربية" : "To English or Arabic" },
          { id: "chart", label: ar ? "رسم بياني" : "Chart", description: ar ? "اعرض الأرقام كرسم" : "Show the numbers as a chart" },
        ]}
        toggles={[
          { id: "web", label: ar ? "بحث الويب" : "Web search", icon: <Globe aria-hidden /> },
          { id: "think", label: ar ? "تفكير أعمق" : "Think harder", icon: <Brain aria-hidden /> },
        ]}
        activeToggles={toggles}
        onTogglesChange={setToggles}
        sessions={[
          { id: "s1", title: ar ? "الفواتير المتأخرة" : "Overdue invoices", at: Date.UTC(2026, 8, 29) },
          { id: "s2", title: ar ? "خطة الربع القادم" : "Next quarter plan", at: Date.UTC(2026, 8, 14) },
        ]}
        activeSessionId="s1"
        onSessionSelect={() => {}}
        onSessionDelete={() => {}}
        share
        disclaimer={ar ? "قد يخطئ المساعد. راجع الأرقام المهمة." : "The assistant can make mistakes. Check important numbers."}
      />
    </div>
  );
}

/** Attachments (attach, paste or drop), "/" commands, toggles, History, Share and a disclaimer. */
export const Composer: Story = { render: () => <ComposerDemo /> };

export const ComposerArabic: Story = { globals: { locale: "ar" }, render: () => <ComposerDemo /> };
