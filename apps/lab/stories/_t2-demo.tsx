/*
 * Shared demo data for batch T2: knowledge gaps, semantic search, voice call, agent persona editor and research run.
 * Every string is English and Arabic. Nothing talks to a server and nothing asks for the microphone: the voice level
 * is a simulated signal.
 */
import {
  type AgentPersona,
  AgentPersonaEditor,
  type CopilotSource,
  KnowledgeGaps,
  type KnowledgeGap,
  ResearchRun,
  type ResearchRunData,
  type ResearchStage,
  SemanticSearch,
  type SemanticHit,
  type VoiceCallState,
  type VoiceCaption,
  VoiceCallOverlay,
  Button,
} from "@nasaq/web";
import { Phone } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useAr, wait } from "./_profile-demo";

export { useAr };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

/** A plain page frame for the T2 pages. */
export function T2Page({ title, description, children, narrow }: { title: string; description: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-screen bg-background">
      <main className={`mx-auto flex w-full flex-col gap-6 p-4 sm:p-8 ${narrow ? "max-w-3xl" : "max-w-5xl"}`}>
        <header className="flex flex-col gap-1">
          <h1 className="text-title-lg text-foreground">{title}</h1>
          <p className="text-body text-muted-foreground">{description}</p>
        </header>
        {children}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ knowledge gaps */

export function makeGaps(ar: boolean): KnowledgeGap[] {
  const rows: Omit<KnowledgeGap, "id">[] = ar
    ? [
        { query: "ما سياسة الإجازة الأبوية؟", hits: 14, firstSeen: ago(21 * DAY), lastSeen: ago(3 * HOUR), status: "open" },
        { query: "كيف أطلب ميزانية للتدريب؟", hits: 9, firstSeen: ago(12 * DAY), lastSeen: ago(1 * DAY), status: "open" },
        { query: "من مسؤول الامتثال في فرع الرياض؟", hits: 4, firstSeen: ago(6 * DAY), lastSeen: ago(2 * DAY), status: "open" },
        { query: "أين أجد قالب عقد الموردين؟", hits: 3, firstSeen: ago(5 * DAY), lastSeen: ago(5 * HOUR), status: "open" },
        { query: "ما حدّ المصروفات دون موافقة؟", hits: 11, firstSeen: ago(40 * DAY), lastSeen: ago(9 * DAY), status: "indexed", resolution: "أُضيفت سياسة المصروفات إلى الدليل" },
        { query: "هل نعمل يوم الجمعة؟", hits: 2, firstSeen: ago(30 * DAY), lastSeen: ago(20 * DAY), status: "dismissed", resolution: "سؤال خارج النطاق" },
      ]
    : [
        { query: "What is the parental leave policy?", hits: 14, firstSeen: ago(21 * DAY), lastSeen: ago(3 * HOUR), status: "open" },
        { query: "How do I request a training budget?", hits: 9, firstSeen: ago(12 * DAY), lastSeen: ago(1 * DAY), status: "open" },
        { query: "Who is the compliance officer for the Riyadh branch?", hits: 4, firstSeen: ago(6 * DAY), lastSeen: ago(2 * DAY), status: "open" },
        { query: "Where is the supplier contract template?", hits: 3, firstSeen: ago(5 * DAY), lastSeen: ago(5 * HOUR), status: "open" },
        { query: "What is the expense limit without approval?", hits: 11, firstSeen: ago(40 * DAY), lastSeen: ago(9 * DAY), status: "indexed", resolution: "Added the expenses policy to the handbook" },
        { query: "Do we work on Fridays?", hits: 2, firstSeen: ago(30 * DAY), lastSeen: ago(20 * DAY), status: "dismissed", resolution: "Out of scope" },
      ];
  return rows.map((r, i) => ({ ...r, id: `g${i + 1}` }));
}

export function KnowledgeGapsDemo() {
  const ar = useAr();
  const [gaps, setGaps] = useState<KnowledgeGap[] | null>(null);
  useEffect(() => {
    let live = true;
    setGaps(null);
    void wait(600).then(() => live && setGaps(makeGaps(ar)));
    return () => {
      live = false;
    };
  }, [ar]);
  return (
    <KnowledgeGaps
      gaps={gaps ?? []}
      loading={!gaps}
      onResolve={async (gap, status) => {
        await wait(500);
        // The first gap fails once so the error path can be seen.
        if (gap.id === "g4" && status === "dismissed" && !failedOnce.current) {
          failedOnce.current = true;
          return { error: ar ? "تعذر الوصول إلى الخادم. حاول مرة أخرى." : "The server could not be reached. Try again." };
        }
        setGaps((list) => (list ?? []).map((g) => (g.id === gap.id ? { ...g, status } : g)));
      }}
    />
  );
}
const failedOnce = { current: false };

/* ------------------------------------------------------------------ semantic search */

function makeMemories(ar: boolean): SemanticHit[] {
  const rows: Omit<SemanticHit, "id">[] = ar
    ? [
        { content: "تُمنح الإجازة السنوية 30 يومًا لكل موظف بدوام كامل، ويمكن ترحيل 5 أيام إلى السنة التالية بموافقة المدير.", score: 0.91, group: "سياسات", kind: "وثيقة", source: "notion", sourceRef: "دليل الموارد البشرية", importance: 0.85 },
        { content: "لطلب إجازة، افتح بوابة الموظفين واختر الإجازات ثم اطلب إجازة جديدة. يصل الطلب إلى المدير المباشر.", score: 0.83, group: "سياسات", kind: "خطوات", source: "notion", sourceRef: "بوابة الموظفين", importance: 0.6 },
        { content: "قالت ليلى في قناة الموارد البشرية إن الإجازة المرضية لا تُخصم من الرصيد السنوي أول ثلاثة أيام.", score: 0.62, group: "محادثات", kind: "ملاحظة", source: "slack", sourceRef: "#hr", importance: 0.4, viaEntity: "ليلى حداد" },
        { content: "تجديد عقد الموظفين يتم في يناير من كل عام.", score: 0.36, group: "أحداث", kind: "حقيقة", source: "upload", sourceRef: "contracts-2026.pdf", importance: 0.3 },
      ]
    : [
        { content: "Every full-time employee gets 30 days of annual leave, and up to 5 days can carry over to the next year with manager approval.", score: 0.91, group: "policies", kind: "document", source: "notion", sourceRef: "HR handbook", importance: 0.85 },
        { content: "To request leave, open the employee portal, choose Leave, then New request. The request goes to your direct manager.", score: 0.83, group: "policies", kind: "steps", source: "notion", sourceRef: "Employee portal", importance: 0.6 },
        { content: "Layla said in the HR channel that sick leave does not count against the annual balance for the first three days.", score: 0.62, group: "chats", kind: "note", source: "slack", sourceRef: "#hr", importance: 0.4, viaEntity: "Layla Haddad" },
        { content: "Employee contracts are renewed every January.", score: 0.36, group: "events", kind: "fact", source: "upload", sourceRef: "contracts-2026.pdf", importance: 0.3 },
      ];
  return rows.map((r, i) => ({ ...r, id: `m${i + 1}` }));
}

export function SemanticSearchDemo() {
  const ar = useAr();
  const [results, setResults] = useState<SemanticHit[] | undefined>();
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [opened, setOpened] = useState<SemanticHit | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <SemanticSearch
        defaultQuery={ar ? "الإجازة السنوية" : "annual leave"}
        results={results}
        searching={searching}
        error={error}
        onRetry={() => setError(undefined)}
        onOpen={setOpened}
        onSearch={async (query, { limit }) => {
          setSearching(true);
          setError(undefined);
          await wait(800);
          setSearching(false);
          const q = query.trim().toLowerCase();
          if (q.includes("error") || q.includes("خطأ")) return setError(ar ? "تعذر إجراء البحث." : "The search could not run.");
          if (q.includes("none") || q.includes("لا شيء")) return setResults([]);
          setResults(makeMemories(ar).slice(0, limit));
        }}
      />
      {opened ? (
        <div role="status" className="rounded-card border border-border bg-card p-4 text-body-sm text-foreground">
          <p className="mb-1 text-caption text-muted-foreground">{ar ? "تم فتح الذاكرة" : "Opened memory"}</p>
          <p dir="auto">{opened.content}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ voice call */

const CAPTION_SCRIPT = (ar: boolean): { role: VoiceCaption["role"]; text: string }[] =>
  ar
    ? [
        { role: "user", text: "مرحبًا، أريد معرفة حالة طلبي." },
        { role: "agent", text: "أهلًا بك. يسعدني ذلك، هل يمكنك إعطائي رقم الطلب؟" },
        { role: "user", text: "الرقم هو أربعة آلاف ومئتان وسبعة." },
        { role: "agent", text: "وجدته. طلبك في الطريق وسيصل غدًا قبل الظهر." },
      ]
    : [
        { role: "user", text: "Hi, I would like to check the status of my order." },
        { role: "agent", text: "Of course. Could you give me the order number?" },
        { role: "user", text: "It is four thousand two hundred and seven." },
        { role: "agent", text: "Found it. Your order is on its way and arrives tomorrow before noon." },
      ];

/**
 * A scripted call: connecting, then listening, thinking and speaking in turn, with a simulated voice level. It only makes
 * numbers up (a sum of two sines and some noise). It never opens the microphone.
 */
export function useSimulatedCall(ar: boolean, running: boolean) {
  const [state, setState] = useState<VoiceCallState>("connecting");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [captions, setCaptions] = useState<VoiceCaption[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!running) return;
    setState("connecting");
    setElapsed(0);
    setCaptions([]);
    const script = CAPTION_SCRIPT(ar);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 1400;
    script.forEach((line, i) => {
      const agent = line.role === "agent";
      if (agent) {
        timers.push(setTimeout(() => setState("thinking"), at));
        at += 1500;
      } else {
        timers.push(setTimeout(() => setState("listening"), at));
      }
      timers.push(setTimeout(() => (agent ? setState("speaking") : undefined), at));
      timers.push(setTimeout(() => setCaptions((c) => [...c, { id: `c${i}`, role: line.role, text: line.text }]), at + 900));
      at += agent ? 4200 : 3200;
    });
    timers.push(setTimeout(() => setState("listening"), at));
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [ar, running]);

  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    const id = setInterval(() => {
      const t = (performance.now() - started) / 1000;
      const s = stateRef.current;
      if (s === "listening" || s === "speaking") {
        const wave = 0.5 + 0.5 * Math.sin(t * 5.1) * Math.sin(t * 1.7 + 1);
        setLevel(Math.max(0, Math.min(1, wave * (0.55 + Math.random() * 0.45))));
      } else setLevel(0);
    }, 70);
    return () => clearInterval(id);
  }, [running]);

  return { state, level, elapsed, captions };
}

export function VoiceCallDemo() {
  const ar = useAr();
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const { state, level, elapsed, captions } = useSimulatedCall(ar, inCall);
  const agent = { name: ar ? "سلمى، وكيلة الدعم" : "Salma, support agent", avatar: "🎧", subtitle: ar ? "وكيل صوتي" : "Voice agent" };
  const end = useCallback(async () => {
    await wait(400);
    setInCall(false);
    setMuted(false);
  }, []);
  return (
    <div className="relative min-h-screen bg-background">
      {inCall ? (
        <VoiceCallOverlay contained state={state} level={muted ? 0 : level} agent={agent} muted={muted} onMutedChange={setMuted} onEnd={end} elapsed={elapsed} captions={captions} />
      ) : (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-title-lg text-foreground">{ar ? "الدعم الصوتي" : "Voice support"}</h1>
          <p className="text-body text-muted-foreground">
            {ar ? "تحدّث مع وكيلة الدعم. هذا عرض تجريبي، لا يستخدم الميكروفون فعلًا." : "Talk to the support agent. This is a demo: it does not use your microphone."}
          </p>
          <Button variant="primary" size="lg" onClick={() => setInCall(true)}>
            <Phone aria-hidden />
            {ar ? "ابدأ المكالمة" : "Start the call"}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ agent persona */

export function makePersona(ar: boolean): AgentPersona {
  return ar
    ? {
        name: "سلمى",
        tagline: "تجيب عن أسئلة الطلبات والفواتير",
        color: "--nq-tag-teal",
        icon: "headphones",
        persona: "## الدور\n\nأنتِ سلمى، وكيلة دعم العملاء في متجرنا. تساعدين العملاء في تتبع الطلبات والفواتير.\n\n## النبرة\n\n- ودودة ومختصرة\n- تتحدثين بالعربية الفصحى المبسطة\n\n## القواعد\n\n1. اسألي عن رقم الطلب قبل أي إجراء.\n2. لا تَعِدي بما لا تملكين صلاحيته.\n",
        traits: ["ودودة", "مختصرة", "صبورة"],
        model: "sonnet",
        greeting: "أهلًا بك، أنا سلمى. كيف أساعدك اليوم؟",
      }
    : {
        name: "Salma",
        tagline: "Answers order and billing questions",
        color: "--nq-tag-teal",
        icon: "headphones",
        persona: "## Role\n\nYou are Salma, the customer support agent of our store. You help customers track orders and invoices.\n\n## Tone\n\n- Warm and brief\n- Plain language, no jargon\n\n## Rules\n\n1. Ask for the order number before doing anything.\n2. Never promise what you have no authority over.\n",
        traits: ["warm", "brief", "patient"],
        model: "sonnet",
        greeting: "Hi, I am Salma. How can I help you today?",
      };
}

export const PERSONA_MODELS = [
  { id: "opus", label: "Claude Opus", description: "Most capable" },
  { id: "sonnet", label: "Claude Sonnet", description: "Balanced" },
  { id: "haiku", label: "Claude Haiku", description: "Fastest" },
];

export function AgentPersonaDemo() {
  const ar = useAr();
  const [saved, setSaved] = useState(() => makePersona(ar));
  useEffect(() => setSaved(makePersona(ar)), [ar]);
  return (
    <AgentPersonaEditor
      value={saved}
      models={PERSONA_MODELS}
      traitSuggestions={ar ? ["ودودة", "رسمية", "مرحة", "دقيقة"] : ["friendly", "formal", "playful", "precise"]}
      onSave={async (draft) => {
        await wait(700);
        if (draft.name.toLowerCase().includes("fail")) return { error: ar ? "تعذر الحفظ. حاول مرة أخرى." : "Could not save. Try again." };
        setSaved(draft);
      }}
    />
  );
}

/* ------------------------------------------------------------------ research run */

function researchSources(ar: boolean): CopilotSource[] {
  return ar
    ? [
        { id: "s1", title: "تقرير سوق التجارة الإلكترونية 2026", url: "https://example.com/reports/ecommerce-2026", snippet: "نمو السوق" },
        { id: "s2", title: "مقابلات العملاء، الربع الثالث", snippet: "ملخص داخلي" },
        { id: "s3", title: "دراسة سلوك الشراء عبر الجوال", url: "https://research.example.org/mobile-buying" },
      ]
    : [
        { id: "s1", title: "E-commerce market report 2026", url: "https://example.com/reports/ecommerce-2026", snippet: "Market growth" },
        { id: "s2", title: "Customer interviews, Q3", snippet: "Internal summary" },
        { id: "s3", title: "Mobile buying behaviour study", url: "https://research.example.org/mobile-buying" },
      ];
}

function stageList(ar: boolean, step: number): ResearchStage[] {
  const labels = ar ? ["فهم السؤال", "البحث في المصادر", "قراءة الأدلة", "كتابة الإجابة"] : ["Understand the question", "Search sources", "Read the evidence", "Write the answer"];
  return labels.map((label, i) => ({ id: `st${i}`, label, state: i < step ? "done" : i === step ? "running" : "pending" }));
}

function finishedRun(ar: boolean, question: string): ResearchRunData {
  return {
    id: "r1",
    question,
    status: "done",
    stages: stageList(ar, 4).map((s) => ({ ...s, state: "done" })),
    sources: researchSources(ar),
    sourcesChecked: 18,
    sourcesRead: 6,
    confidence: 0.78,
    model: "Claude Sonnet",
    finishedAt: new Date(),
    answer: ar
      ? [
          { id: "a1", text: "ارتفعت حصة الشراء عبر الجوال إلى نحو ثلثي الطلبات في المنطقة خلال العام الماضي.", cites: ["e1", "e3"] },
          { id: "a2", text: "يذكر العملاء أن سرعة إتمام الدفع أهم من الخصومات عند الشراء من الهاتف.", cites: ["e2"] },
        ]
      : [
          { id: "a1", text: "Mobile now accounts for roughly two thirds of orders in the region, up sharply over the past year.", cites: ["e1", "e3"] },
          { id: "a2", text: "Customers say checkout speed matters more to them than discounts when they buy from a phone.", cites: ["e2"] },
        ],
    evidence: ar
      ? [
          { id: "e1", sourceId: "s1", quote: "بلغت حصة الجوال من إجمالي الطلبات 66% في عام 2026 مقابل 51% قبل عامين.", relevance: 0.93 },
          { id: "e2", sourceId: "s2", quote: "«أترك الطلب إذا احتاج الدفع أكثر من دقيقة»، كما قالت إحدى المشاركات.", relevance: 0.81 },
          { id: "e3", sourceId: "s3", quote: "تتجاوز نسبة إتمام الشراء على الجوال 70% حين يُحفظ عنوان الشحن.", relevance: 0.66 },
          { id: "e4", sourceId: "s1", quote: "تتركز أعلى معدلات النمو في المدن الثانوية.", relevance: 0.4 },
        ]
      : [
          { id: "e1", sourceId: "s1", quote: "Mobile made up 66% of all orders in 2026, against 51% two years earlier.", relevance: 0.93 },
          { id: "e2", sourceId: "s2", quote: "“I drop the order if payment takes more than a minute,” said one participant.", relevance: 0.81 },
          { id: "e3", sourceId: "s3", quote: "Mobile checkout completion tops 70% when the shipping address is saved.", relevance: 0.66 },
          { id: "e4", sourceId: "s1", quote: "The highest growth rates are concentrated in secondary cities.", relevance: 0.4 },
        ],
  };
}

export function ResearchRunDemo({ startWith }: { startWith?: "done" }) {
  const ar = useAr();
  const question = ar ? "كيف يتغير سلوك الشراء عبر الجوال؟" : "How is mobile buying behaviour changing?";
  const [run, setRun] = useState<ResearchRunData | null>(() => (startWith === "done" ? finishedRun(ar, question) : null));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const begin = (q: string) => {
    clear();
    const base: ResearchRunData = { id: "r1", question: q, status: "queued" };
    setRun(base);
    const fail = q.toLowerCase().includes("fail") || q.includes("فشل");
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(900, () => setRun({ ...base, status: "running", stages: stageList(ar, 0), sourcesChecked: 0, sourcesRead: 0 }));
    at(2200, () => setRun({ ...base, status: "running", stages: stageList(ar, 1), sourcesChecked: 9, sourcesRead: 0 }));
    at(3800, () => setRun({ ...base, status: "running", stages: stageList(ar, 2), sourcesChecked: 18, sourcesRead: 3 }));
    if (fail) {
      at(5000, () =>
        setRun({
          ...base,
          status: "failed",
          stages: stageList(ar, 2).map((s, i) => (i === 2 ? { ...s, state: "failed" } : s)),
          error: ar ? "انتهت مهلة قراءة أحد المصادر." : "A source timed out while it was being read.",
        }),
      );
    } else {
      at(5200, () => setRun({ ...base, status: "running", stages: stageList(ar, 3), sourcesChecked: 18, sourcesRead: 6 }));
      at(6800, () => setRun(finishedRun(ar, q)));
    }
  };

  return (
    <ResearchRun
      run={run}
      defaultQuestion={question}
      suggestions={ar ? ["ما أكبر مخاطر التوسع في السوق؟", "من منافسونا الرئيسيون؟"] : ["What are the biggest risks of expanding?", "Who are our main competitors?"]}
      onAsk={async (q) => {
        await wait(300);
        begin(q);
      }}
      onCancel={() => {
        clear();
        setRun((r) => (r ? { ...r, status: "cancelled" } : r));
      }}
      onRetry={(r) => begin(r.question)}
    />
  );
}
