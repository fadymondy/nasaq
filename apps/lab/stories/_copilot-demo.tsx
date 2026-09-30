/* Fake streaming assistant for the CopilotChat stories. Nothing here talks to a server. */
import { CopilotChat, type CopilotContextItem, type CopilotMessage, type CopilotStep } from "@nasaq/web";
import { useEffect, useRef, useState } from "react";
import { useAr } from "./_profile-demo";

let counter = 0;
const uid = (p: string) => `${p}${++counter}`;
const FENCE = "```";

function scriptedAnswer(ar: boolean, q: string) {
  const steps: CopilotStep[] = [
    { id: "s1", label: ar ? "بحثت في الفواتير" : "Searched invoices", tool: "invoices.search", status: "running", detail: "status=overdue" },
    { id: "s2", label: ar ? "حسبت الإجمالي" : "Summed the totals", tool: "math.sum", status: "running", detail: "3 rows" },
  ];
  const code = `${FENCE}ts\nconst overdue = await api.invoices.list({ status: "overdue" });\n${FENCE}`;
  const text = ar
    ? `لديك **ثلاث فواتير** متأخرة، بإجمالي ٤٬٢٠٠ ر.س. أقدمها من عميل \`Acme\` منذ ١٢ يوماً.\n\nيمكنك جلبها من الواجهة هكذا:\n\n${code}\n\nهل أرسل تذكيراً للعملاء؟`
    : `You have **three overdue invoices** totalling $1,120. The oldest is from \`Acme\`, 12 days late.\n\nYou can fetch them from the API like this:\n\n${code}\n\nWant me to send reminders?${q ? "" : ""}`;
  const sources = [
    { id: "a", title: ar ? "دليل الفواتير" : "Invoices guide", url: "https://docs.example.com/invoices" },
    { id: "b", title: ar ? "سياسة التذكير" : "Reminder policy", url: "https://www.example.com/policy/reminders" },
    { id: "c", title: ar ? "ملاحظة داخلية" : "Internal note", snippet: ar ? "لا رابط لهذا المصدر" : "No link for this source" },
  ];
  const followUps = ar ? ["أرسل التذكيرات", "اعرض أقدم فاتورة"] : ["Send the reminders", "Show the oldest invoice"];
  return { steps, text, sources, followUps };
}

function useCopilotState(ar: boolean, seed?: CopilotMessage[]) {
  const [messages, setMessages] = useState<CopilotMessage[]>(seed ?? []);
  const stopRef = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const run = (q: string, withUser: boolean) => {
    const id = uid("ai");
    const a = scriptedAnswer(ar, q);
    const first = a.steps[0] as CopilotStep;
    const second = a.steps[1] as CopilotStep;
    stopRef.current = false;
    const userMsg: CopilotMessage[] = withUser ? [{ id: uid("u"), role: "user", text: q, at: Date.now() }] : [];
    setMessages((m) => [...m, ...userMsg, { id, role: "assistant", text: "", streaming: true, at: Date.now(), steps: [first] }]);
    const patch = (p: Partial<CopilotMessage>) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));
    after(900, () => patch({ steps: [{ ...first, status: "done" }, second] }));
    after(1600, () => patch({ steps: a.steps.map((s) => ({ ...s, status: "done" as const })) }));
    const words = a.text.split(/(\s+)/);
    let i = 0;
    const tick = () => {
      if (stopRef.current) return;
      i += 2;
      const done = i >= words.length;
      patch({ text: words.slice(0, i).join(""), ...(done ? { streaming: false, sources: a.sources, followUps: a.followUps } : {}) });
      if (!done) after(45, tick);
    };
    after(1800, tick);
  };

  return {
    messages,
    send: (q: string) => run(q, true),
    stop: () => {
      stopRef.current = true;
      setMessages((m) => m.map((x) => (x.streaming ? { ...x, streaming: false } : x)));
    },
    regenerate: (id: string) => {
      const idx = messages.findIndex((x) => x.id === id);
      const q = messages[idx - 1]?.text ?? "";
      setMessages((m) => m.filter((x) => x.id !== id));
      run(q, false);
    },
    feedback: (id: string, v: "up" | "down") => setMessages((m) => m.map((x) => (x.id === id ? { ...x, feedback: x.feedback === v ? null : v } : x))),
    reset: () => {
      stopRef.current = true;
      setMessages([]);
    },
  };
}

/** Scripted CopilotChat props: streaming answers, context chips, models and mentions. */
export function useCopilotProps(seeded: boolean) {
  const ar = useAr();
  const seed: CopilotMessage[] | undefined = seeded
    ? (() => {
        const a = scriptedAnswer(ar, "");
        return [
          { id: "u0", role: "user", text: ar ? "ما الفواتير المتأخرة؟" : "Which invoices are overdue?", at: Date.now() - 60000 },
          { id: "a0", role: "assistant", text: a.text, at: Date.now() - 50000, steps: a.steps.map((s) => ({ ...s, status: "done" as const })), sources: a.sources, followUps: a.followUps },
        ];
      })()
    : undefined;
  const st = useCopilotState(ar, seed);
  const options: CopilotContextItem[] = ar
    ? [{ id: "f1", kind: "ملف", label: "invoices.csv" }, { id: "f2", kind: "صفحة", label: "لوحة المبيعات" }, { id: "f3", kind: "تحديد", label: "٣ صفوف" }]
    : [{ id: "f1", kind: "File", label: "invoices.csv" }, { id: "f2", kind: "Page", label: "Sales dashboard" }, { id: "f3", kind: "Selection", label: "3 rows" }];
  const [context, setContext] = useState<CopilotContextItem[]>(options.slice(0, 1));
  const [model, setModel] = useState("fast");
  return {
    messages: st.messages,
    onSend: st.send,
    onStop: st.stop,
    onRegenerate: st.regenerate,
    onFeedback: st.feedback,
    onNewChat: st.reset,
    starters: ar
      ? ["ما الفواتير المتأخرة؟", "لخّص أسبوعي", "اكتب رسالة تذكير", "ما أكبر عميل؟"]
      : ["Which invoices are overdue?", "Summarise my week", "Draft a reminder email", "Who is my biggest client?"],
    context,
    onContextChange: setContext,
    contextOptions: options,
    models: [
      { id: "fast", label: ar ? "سريع" : "Fast" },
      { id: "smart", label: ar ? "أذكى" : "Smarter" },
    ],
    model,
    onModelChange: setModel,
    mentions: ar ? [{ id: "1", name: "سارة" }, { id: "2", name: "خالد" }] : [{ id: "1", name: "Sara" }, { id: "2", name: "Khaled" }],
  };
}

export function CopilotDemo({ mode = "panel", seeded = false, height = "40rem" }: { mode?: "panel" | "page"; seeded?: boolean; height?: string }) {
  const props = useCopilotProps(seeded);
  return (
    <div className={mode === "panel" ? "mx-auto w-full max-w-md overflow-hidden rounded-card border border-border" : "overflow-hidden rounded-card border border-border"} style={{ height }}>
      <CopilotChat mode={mode} onClose={() => {}} {...props} />
    </div>
  );
}

/** Full page: a history rail and a centred conversation. */
export function CopilotPage() {
  const ar = useAr();
  const props = useCopilotProps(false);
  const chats = ar ? ["الفواتير المتأخرة", "خطة الربع القادم", "رسالة للعميل", "تقرير الوقت"] : ["Overdue invoices", "Next quarter plan", "Client email draft", "Time report"];
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside aria-label={ar ? "المحادثات السابقة" : "Chat history"} className="hidden w-64 shrink-0 flex-col gap-1 border-e border-border bg-secondary p-3 md:flex">
        <span className="px-2 pb-2 text-label">{ar ? "المحادثات" : "Chats"}</span>
        {chats.map((c, i) => (
          <button key={c} type="button" aria-current={i === 0 ? "true" : undefined} className="rounded-control px-2 py-1.5 text-start text-body-sm hover:bg-nq-hover aria-[current]:bg-card">
            {c}
          </button>
        ))}
      </aside>
      <div className="min-w-0 flex-1">
        <CopilotChat mode="page" title={ar ? "المساعد" : "Copilot"} {...props} />
      </div>
    </div>
  );
}
