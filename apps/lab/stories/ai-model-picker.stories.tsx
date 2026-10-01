import { AiModelPicker, type AiModelSelection, PersonaPicker } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bot, Code, LineChart } from "lucide-react";
import { useState } from "react";
import { useAr } from "./_profile-demo";
import { pickerAgents, pickerModels } from "./_usage-demo";

const meta = { title: "Components/AI Agents/AI Model Picker", component: AiModelPicker, parameters: { layout: "padded" } } satisfies Meta<typeof AiModelPicker>;
export default meta;
type Story = StoryObj;

function Cards({ required = false }: { required?: boolean }) {
  const ar = useAr();
  const [sel, setSel] = useState<AiModelSelection>({ model: "sonnet-5.5", effort: "medium" });
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <AiModelPicker models={pickerModels} value={sel} onValueChange={setSel} agents={pickerAgents(ar)} agentRequired={required} />
      <pre dir="ltr" className="rounded-md bg-muted p-3 text-caption">{JSON.stringify(sel)}</pre>
    </div>
  );
}

/** Model cards with tier, context and price, the effort the model supports, and an agent. */
export const Default: Story = { render: () => <Cards /> };

/** The agent is required: the field turns invalid once it was opened and left empty. */
export const AgentRequired: Story = { render: () => <Cards required /> };

/** One row for a composer toolbar. */
export const Compact: Story = { render: () => <AiModelPicker variant="compact" models={pickerModels} agents={pickerAgents(false)} /> };

function Personas() {
  const ar = useAr();
  const [last, setLast] = useState<string | null>(null);
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <PersonaPicker
        personas={[
          { id: "assistant", name: ar ? "مساعد عام" : "Assistant", description: ar ? "يجيب عن أي سؤال" : "Answers anything", icon: <Bot />, starters: ar ? ["لخّص أسبوعي", "اكتب رسالة شكر"] : ["Summarise my week", "Draft a thank-you note"] },
          { id: "analyst", name: ar ? "المحلل" : "Analyst", description: ar ? "يقرأ أرقامك" : "Reads your numbers", icon: <LineChart />, starters: ar ? ["ما الذي تغيّر في الإيرادات؟"] : ["What changed in revenue?"] },
          { id: "dev", name: ar ? "المطوّر" : "Developer", description: ar ? "يراجع الشيفرة" : "Reviews code", icon: <Code />, starters: ar ? ["راجع هذا الطلب"] : ["Review this pull request"] },
        ]}
        onStarter={(p) => setLast(p)}
      />
      {last ? <p role="status" className="text-body-sm text-muted-foreground">{last}</p> : null}
    </div>
  );
}
/** Pick who the assistant is, then start from one of its prompts. */
export const PersonaPicker_: Story = { name: "Persona picker", render: () => <Personas /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Cards required /> };
