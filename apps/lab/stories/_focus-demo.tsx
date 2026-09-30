/*
 * Shared demo data and the full Focus page for the pomodoro stories (batch X8). Nothing here talks to a
 * server. The pomodoro runs `DEMO_SPEED` times faster than real time, so a 25 minute focus takes 25
 * seconds and a whole cycle fits in a short look at the lab.
 */
import {
  BreakLockScreen,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DoNotDisturbToggle,
  FocusAvatar,
  type FocusState,
  FocusStatusChip,
  focusStateOf,
  formatTimer,
  IdleTimePrompt,
  type PomodoroConfig,
  type PomodoroEvent,
  type PomodoroTask,
  PomodoroCard,
  useFormatDate,
  useIdleTime,
  useNasaq,
  usePomodoro,
} from "@nasaq/web";
import { Clock3 } from "lucide-react";
import { useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");

/** One second in the lab is a minute in the timer. */
export const DEMO_SPEED = 60;

/** Two sessions per set instead of four, so a long break shows up quickly. */
export const DEMO_CONFIG: Partial<PomodoroConfig> = { cyclesBeforeLongBreak: 2 };

export const demoTasks = (ar: boolean): PomodoroTask[] => [
  { id: "t1", title: ar ? "مراجعة تصميم الشريط الجانبي" : "Review the sidebar design", project: ar ? "نسق" : "Nasaq" },
  { id: "t2", title: ar ? "كتابة اختبارات المؤقّت" : "Write timer tests", project: ar ? "نسق" : "Nasaq" },
  { id: "t3", title: ar ? "الرد على رسائل العملاء" : "Answer customer messages", project: ar ? "الدعم" : "Support" },
];

export interface DemoPerson {
  id: string;
  name: string;
  role: string;
  state: FocusState;
  /** Seconds left in their focus or break. */
  seconds?: number;
}

export const demoPeople = (ar: boolean): DemoPerson[] => [
  { id: "p1", name: ar ? "ليلى الحربي" : "Layla Harbi", role: ar ? "مصممة منتج" : "Product designer", state: "focus", seconds: 14 * 60 + 20 },
  { id: "p2", name: ar ? "عمر السيد" : "Omar Sayed", role: ar ? "مطوّر واجهات" : "Frontend engineer", state: "break", seconds: 3 * 60 + 5 },
  { id: "p3", name: ar ? "هدى القحطاني" : "Huda Qahtani", role: ar ? "دعم العملاء" : "Customer support", state: "dnd" },
  { id: "p4", name: ar ? "يوسف النمر" : "Yousef Namer", role: ar ? "مدير مشروع" : "Project manager", state: "available" },
];

/** Live state for the pomodoro stories: the controller, the task, the do-not-disturb switch and the session log. */
export function useFocusDemo({ speed = DEMO_SPEED, config = DEMO_CONFIG }: { speed?: number; config?: Partial<PomodoroConfig> } = {}) {
  const ar = useAr();
  const [log, setLog] = useState<PomodoroEvent[]>([]);
  const [dnd, setDnd] = useState(false);
  const tasks = demoTasks(ar);
  const [taskId, setTaskId] = useState<string | null>("t1");
  const pomodoro = usePomodoro({ config, speed, onEvent: (event) => setLog((all) => [event, ...all].slice(0, 12)) });
  const state = focusStateOf(pomodoro, dnd);
  return { ar, pomodoro, log, dnd, setDnd, tasks, task: tasks.find((t) => t.id === taskId) ?? null, setTaskId, state };
}

function SessionLog({ log, ar }: { log: PomodoroEvent[]; ar: boolean }) {
  const format = useFormatDate();
  const kind = {
    completed: ar ? "اكتملت" : "Completed",
    skipped: ar ? "تُخطّيت" : "Skipped",
    stopped: ar ? "أُنهيت" : "Stopped",
    postponed: ar ? "أُجّلت" : "Postponed",
  };
  const phase = { focus: ar ? "تركيز" : "Focus", shortBreak: ar ? "استراحة قصيرة" : "Short break", longBreak: ar ? "استراحة طويلة" : "Long break" };
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2">
          <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
          {ar ? "جلسات اليوم" : "Today's sessions"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {log.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{ar ? "لا جلسات بعد. ابدأ التركيز." : "No sessions yet. Start a focus."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {log.map((event, i) => (
              <li key={`${event.endedAt}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-body-sm">
                <span className="text-foreground">
                  {phase[event.phase]} <span className="text-muted-foreground">· {kind[event.kind]}</span>
                </span>
                <span dir="ltr" className="tabular-nums text-muted-foreground">
                  {formatTimer(Math.round(event.spentMs / 1000))} · {format.date(event.endedAt, { hour: "numeric", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Team({ ar, people }: { ar: boolean; people: DemoPerson[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{ar ? "الفريق الآن" : "Team right now"}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <FocusAvatar name={p.name} state={p.state} size="lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label text-foreground">{p.name}</span>
                <span className="truncate text-caption text-muted-foreground">{p.role}</span>
              </span>
              <FocusStatusChip state={p.state} seconds={p.seconds} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** The whole Focus page: header with the status chip, the pomodoro card, presence, do not disturb and the break screen. */
export function FocusPage({ speed = DEMO_SPEED, config = DEMO_CONFIG }: { speed?: number; config?: Partial<PomodoroConfig> } = {}) {
  const demo = useFocusDemo({ speed, config });
  const { ar, pomodoro, dnd, task } = demo;
  const me = ar ? "فادي المنّاع" : "Fady Mondy";
  const running = pomodoro.status === "running";
  const { idle, dismiss } = useIdleTime({ thresholdMs: 10 * 60_000, disabled: !(running && pomodoro.phase === "focus") });
  const [simulated, setSimulated] = useState<{ idleMs: number; since: number } | null>(null);
  const shownIdle = simulated ?? idle;
  const close = () => {
    setSimulated(null);
    dismiss();
  };
  const people = demoPeople(ar);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-h1 text-foreground">{ar ? "التركيز" : "Focus"}</h1>
          <p className="text-body text-muted-foreground">{ar ? "اعمل في جلسات قصيرة، وارتح بينها." : "Work in short sessions and rest between them."}</p>
        </div>
        <div className="flex items-center gap-3">
          <FocusStatusChip state={demo.state} seconds={demo.state === "focus" || demo.state === "break" ? pomodoro.seconds : undefined} />
          <FocusAvatar name={me} state={demo.state} size="lg" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <PomodoroCard pomodoro={pomodoro} task={demo.task} tasks={demo.tasks} onTaskChange={(next) => demo.setTaskId(next?.id ?? null)} className="max-w-none" />
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <DoNotDisturbToggle checked={dnd} onCheckedChange={demo.setDnd} until={ar ? "٦:٠٠ م" : "6:00 PM"} />
              <Button variant="secondary" size="sm" className="self-start" onClick={() => setSimulated({ idleMs: 12 * 60_000, since: Date.now() - 12 * 60_000 })}>
                {ar ? "محاكاة العودة بعد ١٢ دقيقة" : "Simulate returning after 12 min"}
              </Button>
            </CardContent>
          </Card>
          <Team ar={ar} people={people} />
          <SessionLog log={demo.log} ar={ar} />
        </div>
      </div>

      <BreakLockScreen
        open={pomodoro.onBreak}
        phase={pomodoro.phase === "longBreak" ? "longBreak" : "shortBreak"}
        seconds={pomodoro.seconds}
        fraction={pomodoro.fraction}
        cycle={pomodoro.cycle}
        cycles={pomodoro.cycles}
        completed={pomodoro.completed}
        paused={pomodoro.status === "paused"}
        nextTask={task?.title}
        postponeMinutes={5}
        onPostpone={(minutes) => pomodoro.postpone(minutes * 60_000)}
        onSkip={pomodoro.skip}
      />
      <IdleTimePrompt idle={shownIdle} onKeep={close} onDiscard={close} onDiscardAndStop={() => {
        close();
        pomodoro.stop();
      }} />
    </div>
  );
}
