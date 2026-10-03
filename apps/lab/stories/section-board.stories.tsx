import { type BoardSection, Button, SectionBoard, Switch } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_auth";

const meta = { title: "Components/AI Agents/Section Board", component: SectionBoard, parameters: { layout: "padded" } } satisfies Meta<typeof SectionBoard>;
export default meta;
type Story = StoryObj;

const MODELS = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "deep", label: "Deep reasoning" },
];

function briefing(ar: boolean): BoardSection[] {
  const L = (en: string, a: string) => (ar ? a : en);
  return [
    {
      id: "summary",
      title: L("Today in brief", "موجز اليوم"),
      badge: L("Daily", "يومي"),
      prompt: L("Summarise the five most important stories for a busy reader in three sentences.", "لخّص أهم خمسة أخبار لقارئ مشغول في ثلاث جمل."),
      model: "balanced",
      settings: { limit: "5", tone: "neutral" },
      content: L(
        "Port operations in Jeddah moved to round-the-clock shifts, the city opened three new bus lanes, and weekend rain is expected along the coast.",
        "انتقلت عمليات ميناء جدة إلى مناوبات على مدار الساعة، وافتتحت المدينة ثلاثة مسارات حافلات جديدة، ويُتوقع هطول أمطار على الساحل في عطلة نهاية الأسبوع.",
      ),
    },
    {
      id: "markets",
      title: L("Markets", "الأسواق"),
      prompt: L("List the biggest market moves since yesterday's close, with one line of context each.", "اذكر أكبر تحركات السوق منذ إغلاق الأمس مع سطر سياق لكل منها."),
      model: "fast",
      content: (
        <ul className="flex list-disc flex-col gap-1 ps-5">
          <li>{L("Index up 0.8% on bank earnings", "المؤشر يرتفع 0.8% بدعم أرباح البنوك")}</li>
          <li>{L("Oil steady near the weekly high", "النفط مستقر قرب أعلى مستوى أسبوعي")}</li>
        </ul>
      ),
    },
    {
      id: "weather",
      title: L("Weather", "الطقس"),
      prompt: L("Three-day forecast for the reader's city.", "توقعات ثلاثة أيام لمدينة القارئ."),
      settings: { city: "Jeddah", units: "metric" },
      content: L("Sunny, 34° today. Showers likely on Saturday.", "مشمس، 34° اليوم. زخات محتملة يوم السبت."),
    },
    { id: "reading", title: L("Worth reading", "يستحق القراءة"), badge: L("New", "جديد") },
  ];
}

function Demo({ columns = 1, startEditing = true }: { columns?: 1 | 2; startEditing?: boolean }) {
  const ar = useAr();
  const [sections, setSections] = useState(() => briefing(ar));
  const [editing, setEditing] = useState(startEditing);
  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 text-foreground">{ar ? "الموجز الصباحي" : "Morning briefing"}</h2>
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Switch checked={editing} onCheckedChange={setEditing} />
          {ar ? "وضع التعديل" : "Edit mode"}
        </label>
      </div>
      <SectionBoard
        sections={sections}
        editing={editing}
        models={MODELS}
        columns={columns}
        onChange={setSections}
        onAdd={() => setSections((s) => [...s, { id: `s${Date.now()}`, title: ar ? "قسم جديد" : "New section" }])}
      />
    </div>
  );
}

/** Edit mode: drag a handle (or focus it and press the arrow keys) to reorder; the gear opens the prompt, model and settings. */
export const Default: Story = { render: () => <Demo /> };
export const TwoColumns: Story = { render: () => <Demo columns={2} /> };
/** What readers see: content only. */
export const ReadOnly: Story = {
  render: function Render() {
    const ar = useAr();
    return <SectionBoard className="max-w-3xl" sections={briefing(ar)} />;
  },
};
export const Empty: Story = {
  render: function Render() {
    const [sections, setSections] = useState<BoardSection[]>([]);
    return (
      <div className="flex max-w-3xl flex-col gap-3">
        <SectionBoard sections={sections} editing onChange={setSections} />
        <Button className="w-fit" onClick={() => setSections([{ id: "first", title: "First section", prompt: "Say hello." }])}>
          Add a section
        </Button>
      </div>
    );
  },
};
export const Arabic: Story = { ...Default, globals: { locale: "ar" } };
