import {
  AchievementCard,
  type Achievement,
  AchievementUnlockToast,
  AiActionMenu,
  type AiAction,
  AiConfidenceMeter,
  AiGeneratedLabel,
  AiShimmer,
  AiSparkleButton,
  AiSplitButton,
  AiStreamControls,
  AiStreamingText,
  type AiStreamState,
  AiSuggestionChips,
  AiSummary,
  AiThinking,
  BadgeGrid,
  Button,
  type CopilotSource,
  Kbd,
  Leaderboard,
  type LeaderboardEntry,
  RewardCard,
  StreakCard,
  useNasaq,
  XpProgress,
} from "@nasaq/web";
import { Bug, Compass, Flame, Languages, Medal, Pencil, Rocket, ScrollText, Sparkles, Star, Trophy, Wand2, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");

/* ------------------------------------------------------------------ AI */

const ANSWER_EN = `Here is a short plan for the launch:

1. **Freeze the scope** by Tuesday and list what is left as "later".
2. Run the checklist below against a staging copy.
3. Announce in two steps: internal first, then public.

\`\`\`bash
pnpm build && pnpm test
\`\`\`

Everything above depends on the *review* finishing first, so book it today.`;

const ANSWER_AR = `هذه خطة قصيرة للإطلاق:

1. **جمّد النطاق** بحلول الثلاثاء وضع ما تبقى تحت "لاحقًا".
2. شغّل قائمة التحقق أدناه على نسخة تجريبية.
3. أعلن على مرحلتين: داخليًا أولًا ثم للعموم.

\`\`\`bash
pnpm build && pnpm test
\`\`\`

كل ما سبق يعتمد على انتهاء *المراجعة* أولًا، فاحجزها اليوم.`;

export function useAnswer() {
  return useAr() ? ANSWER_AR : ANSWER_EN;
}

/** Feeds `full` into state a few characters at a time on a timer, like tokens arriving from a model. */
export function useFakeStream(full: string, { auto = false, chunk = 6, every = 45 }: { auto?: boolean; chunk?: number; every?: number } = {}) {
  const [text, setText] = useState("");
  const [state, setState] = useState<AiStreamState>("idle");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const clear = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  const start = useCallback(() => {
    clear();
    setText("");
    setState("streaming");
    let i = 0;
    timer.current = setInterval(() => {
      i += chunk;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clear();
        setState("done");
      }
    }, every);
  }, [full, chunk, every]);
  const stop = useCallback(() => {
    clear();
    setState("stopped");
  }, []);
  useEffect(() => {
    if (auto) start();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);
  return { text, state, start, stop };
}

export function useActions(): AiAction[] {
  const ar = useAr();
  return [
    { id: "summarize", label: ar ? "لخّص" : "Summarize", icon: ScrollText, recommended: true, shortcut: "Mod Shift S", keywords: ["tldr", "short"] },
    { id: "improve", label: ar ? "حسّن الصياغة" : "Improve writing", icon: Wand2, recommended: true, keywords: ["rewrite", "polish"] },
    { id: "translate", label: ar ? "ترجم" : "Translate", icon: Languages },
    { id: "fix", label: ar ? "أصلح الأخطاء" : "Fix mistakes", icon: Bug, keywords: ["grammar", "spelling"] },
    { id: "expand", label: ar ? "وسّع الفكرة" : "Expand", icon: Pencil },
    { id: "explain", label: ar ? "اشرح" : "Explain", icon: Compass, disabled: false },
  ];
}

export function SmartActionsDemo() {
  const ar = useAr();
  const actions = useActions();
  const [last, setLast] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [chips, setChips] = useState(actions.slice(0, 3));
  const run = (id: string) => {
    setLast(id);
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1600);
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <AiSparkleButton generating={generating} showShortcut onClick={() => run("ask")} />
        <AiSplitButton onRun={() => run("ask")} actions={actions} onAction={run} generating={generating} />
        <AiActionMenu actions={actions} onAction={run} />
      </div>
      <p className="text-body-sm text-muted-foreground">
        {ar ? "اضغط" : "Press"} <Kbd>Ctrl J</Kbd> / <Kbd>⌘ J</Kbd> {ar ? "لفتح قائمة الإجراءات." : "for the action menu."}
      </p>
      <AiSuggestionChips
        suggestions={chips}
        onPick={run}
        onDismiss={(id) => setChips((c) => c.filter((x) => x.id !== id))}
      />
      <p role="status" className="min-h-6 text-body-sm text-foreground">
        {last ? (ar ? `آخر إجراء: ${last}` : `Last action: ${last}`) : ""}
      </p>
    </div>
  );
}

export function LoadingDemo() {
  const ar = useAr();
  const steps = ar ? ["أقرأ المستند", "أبحث في المصادر", "أكتب الملخص"] : ["Reading the document", "Searching sources", "Writing the summary"];
  return (
    <div className="flex flex-col gap-6">
      <AiThinking />
      <AiThinking steps={steps} />
      <AiThinking compact />
      <AiShimmer lines={4} />
    </div>
  );
}

export function StreamDemo({ auto = false }: { auto?: boolean }) {
  const ar = useAr();
  const answer = useAnswer();
  const { text, state, start, stop } = useFakeStream(answer, { auto });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <AiGeneratedLabel />
        <AiStreamControls state={state} onStop={stop} onRegenerate={start} />
      </div>
      {state === "idle" ? (
        <Button onClick={start} variant="primary">
          <Sparkles aria-hidden /> {ar ? "ابدأ التوليد" : "Generate"}
        </Button>
      ) : (
        <AiStreamingText text={text} streaming={state === "streaming"} />
      )}
    </div>
  );
}

export function useSources(): CopilotSource[] {
  const ar = useAr();
  return [
    { id: "1", title: ar ? "دليل الإطلاق" : "Launch handbook", url: "https://example.com/handbook", snippet: ar ? "خطوات ما قبل الإطلاق." : "Pre-launch steps." },
    { id: "2", title: ar ? "ملاحظات الاجتماع" : "Meeting notes", snippet: ar ? "قرارات الأسبوع الماضي." : "Decisions from last week." },
    { id: "3", title: ar ? "قائمة التحقق" : "Release checklist", url: "https://example.com/checklist" },
  ];
}

export function SummaryDemo({ autoStream = false }: { autoStream?: boolean }) {
  const ar = useAr();
  const sources = useSources();
  const full = useAnswer();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const regen = () => {
    setLoading(true);
    setNonce((n) => n + 1);
    setTimeout(() => setLoading(false), 1400);
  };
  const tldr = ar
    ? "الإطلاق جاهز تقريبًا: يلزم تجميد النطاق وإتمام المراجعة قبل الإعلان."
    : "The launch is nearly ready: scope must freeze and the review must finish before the announcement.";
  const stream = useFakeStream(tldr, { auto: autoStream, chunk: 3, every: 40 });
  return (
    <AiSummary
      key={nonce}
      tldr={autoStream ? stream.text : tldr}
      streaming={autoStream && stream.state === "streaming"}
      loading={loading}
      points={
        ar
          ? ["جمّد النطاق يوم الثلاثاء", "شغّل قائمة التحقق على نسخة تجريبية", "أعلن داخليًا ثم للعموم"]
          : ["Freeze the scope on Tuesday", "Run the checklist on a staging copy", "Announce internally, then publicly"]
      }
      full={full}
      sources={sources}
      confidence={0.82}
      model="Nasaq-1"
      feedback={feedback}
      onFeedback={setFeedback}
      onRegenerate={regen}
    />
  );
}

export function ConfidenceDemo() {
  return (
    <div className="flex flex-col gap-3">
      <AiConfidenceMeter value={0.92} />
      <AiConfidenceMeter value={0.64} />
      <AiConfidenceMeter value={0.28} />
    </div>
  );
}

/* ------------------------------------------------------------------ gamification */

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

export function useAchievements(): Achievement[] {
  const ar = useAr();
  return [
    { id: "first", title: ar ? "الخطوة الأولى" : "First step", description: ar ? "أكمل مهمتك الأولى." : "Complete your first task.", icon: Rocket, rarity: "common", earnedAt: day(-20), xp: 50 },
    { id: "streak7", title: ar ? "أسبوع متواصل" : "Week warrior", description: ar ? "حافظ على سلسلة سبعة أيام." : "Keep a seven day streak.", icon: Flame, rarity: "uncommon", earnedAt: day(-3), xp: 120 },
    { id: "tasks50", title: ar ? "منجز" : "Finisher", description: ar ? "أكمل 50 مهمة." : "Complete 50 tasks.", icon: Medal, rarity: "rare", progress: 34, goal: 50, xp: 300 },
    { id: "helper", title: ar ? "يد العون" : "Helping hand", description: ar ? "ساعد خمسة زملاء." : "Help five teammates.", icon: Star, rarity: "rare", progress: 2, goal: 5, xp: 200 },
    { id: "speed", title: ar ? "سريع البرق" : "Lightning", description: ar ? "أنجز مهمة خلال دقيقة." : "Finish a task within a minute.", icon: Zap, rarity: "epic", progress: 0, goal: 1, xp: 500 },
    { id: "legend", title: ar ? "أسطورة" : "Legend", description: ar ? "اجمع كل الإنجازات النادرة." : "Collect every rare achievement.", icon: Trophy, rarity: "legendary", progress: 0, goal: 10, xp: 1000 },
    { id: "secret", title: ar ? "مفاجأة" : "Surprise", description: ar ? "اكتشف الميزة المخفية." : "Find the hidden feature.", rarity: "epic", secret: true },
    { id: "night", title: ar ? "بومة الليل" : "Night owl", description: ar ? "اعمل بعد منتصف الليل." : "Work after midnight.", rarity: "common", progress: 1, goal: 3, xp: 40 },
  ];
}


export function AchievementsDemo() {
  const ar = useAr();
  const items = useAchievements();
  const [selected, setSelected] = useState("tasks50");
  const [toast, setToast] = useState<Achievement | null>(null);
  const [open, setOpen] = useState(false);
  const current = items.find((a) => a.id === selected) ?? items[0]!;
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="flex flex-col gap-6">
      <XpProgress totalXp={1380} />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <BadgeGrid achievements={items} selectedId={selected} onSelect={setSelected} />
        <div className="flex flex-col gap-4">
          <AchievementCard achievement={current} />
          <Button
            variant="secondary"
            onClick={() => {
              setToast({ ...items[2]!, progress: 50, earnedAt: new Date() });
              setOpen(true);
            }}
          >
            {ar ? "جرّب إشعار الفتح" : "Preview unlock toast"}
          </Button>
        </div>
      </div>
      <AchievementUnlockToast achievement={toast} open={open} onClose={close} onView={(id) => { setSelected(id); close(); }} />
    </div>
  );
}

export function useLeaderboardData(): { entries: LeaderboardEntry[]; periods: { id: string; label: string }[] } {
  const ar = useAr();
  const names = ar
    ? ["ليلى حداد", "عمر يوسف", "سارة الخطيب", "كريم منصور", "هالة نصر", "يوسف بدر", "دينا فؤاد", "طارق سالم", "نور الهدى", "مازن رضا", "أنت"]
    : ["Layla Haddad", "Omar Yousef", "Sara Khatib", "Karim Mansour", "Hala Nasr", "Yusuf Badr", "Dina Fouad", "Tarek Salem", "Nour Huda", "Mazen Reda", "Jordan Lee"];
  const scores = [4820, 4310, 4310, 3900, 3520, 3110, 2870, 2440, 2100, 1760, 980];
  const prev = [2, 1, 4, 3, 5, 8, undefined, 7, 9, 10, 12];
  const entries = names.map((name, i) => ({ id: `u${i}`, name, score: scores[i]!, previousRank: prev[i], subtitle: i % 3 === 0 ? (ar ? "فريق التصميم" : "Design team") : undefined }));
  return {
    entries,
    periods: [
      { id: "week", label: ar ? "هذا الأسبوع" : "This week" },
      { id: "month", label: ar ? "هذا الشهر" : "This month" },
      { id: "all", label: ar ? "كل الأوقات" : "All time" },
    ],
  };
}

export function LeaderboardDemo() {
  const { entries, periods } = useLeaderboardData();
  const [period, setPeriod] = useState("week");
  // Each period reshuffles the scores a little so switching tabs visibly changes the board.
  const factor = period === "week" ? 1 : period === "month" ? 3.2 : 12.5;
  const shown = entries.map((e, i) => ({ ...e, score: Math.round(e.score * factor * (1 + ((i * 7) % 5) / 40)) }));
  return <Leaderboard entries={shown} youId="u10" periods={periods} period={period} onPeriodChange={setPeriod} unit="XP" limit={8} />;
}

export function StreakDemo() {
  const days: Date[] = [];
  for (let i = 0; i < 6; i += 1) days.push(day(-i - 1));
  days.push(day(-12), day(-13), day(-15), day(-16), day(-17), day(-18));
  return <StreakCard activeDays={days} />;
}

export function RewardsDemo() {
  const ar = useAr();
  const [balance, setBalance] = useState(1200);
  const [owned, setOwned] = useState<string[]>([]);
  const claim = (id: string, cost: number, fail = false) => async () => {
    await new Promise((r) => setTimeout(r, 900));
    if (fail) return { error: ar ? "نفدت الكمية." : "Out of stock." };
    setBalance((b) => b - cost);
    setOwned((o) => [...o, id]);
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RewardCard
        title={ar ? "إطار ذهبي" : "Golden frame"}
        description={ar ? "إطار لصورتك الشخصية." : "A frame for your avatar."}
        rarity="rare"
        cost={800}
        balance={balance}
        status={owned.includes("a") ? "owned" : "available"}
        onClaim={claim("a", 800)}
      />
      <RewardCard
        title={ar ? "لقب المحترف" : "Pro title"}
        description={ar ? "لقب يظهر بجوار اسمك." : "A title shown next to your name."}
        rarity="epic"
        cost={2500}
        balance={balance}
        onClaim={claim("b", 2500)}
      />
      <RewardCard
        title={ar ? "حزمة نادرة" : "Rare bundle"}
        description={ar ? "نفدت دائمًا لتجربة الخطأ." : "Always fails, to show the error state."}
        rarity="uncommon"
        cost={100}
        balance={balance}
        onClaim={claim("c", 100, true)}
      />
      <RewardCard
        title={ar ? "شارة أسطورية" : "Legendary crest"}
        rarity="legendary"
        status="locked"
        lockedReason={ar ? "بلوغ المستوى 10" : "Reach level 10"}
      />
    </div>
  );
}
