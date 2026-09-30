/* Shared fixtures for the developer-output stories: logs, deploy runs, terminal output and .env data.
   Everything is fake. The "secrets" are obvious placeholders, never real credentials. */
import { type DeployStep, type EnvVariable, type LogEntry, type LogLevel, type TerminalLine, useNasaq } from "@nasaq/web";
import { useCallback, useEffect, useRef, useState } from "react";

export const useAr = () => useNasaq().locale.startsWith("ar");
export const wait = (ms = 500) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const ESC = String.fromCharCode(27);
export const green = (s: string) => `${ESC}[32m${s}${ESC}[0m`;
export const red = (s: string) => `${ESC}[31m${s}${ESC}[0m`;
export const yellow = (s: string) => `${ESC}[33m${s}${ESC}[0m`;
export const cyan = (s: string) => `${ESC}[36m${s}${ESC}[0m`;
export const dim = (s: string) => `${ESC}[2m${s}${ESC}[0m`;
export const bold = (s: string) => `${ESC}[1m${s}${ESC}[0m`;

// ---------------------------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------------------------

const LOG_TEMPLATES: { level: LogLevel; source: string; en: string; ar: string; fields?: Record<string, unknown> }[] = [
  { level: "info", source: "api", en: "GET /v1/projects 200 in 38ms", ar: "GET /v1/projects 200 خلال 38ms", fields: { status: 200, ms: 38 } },
  { level: "info", source: "api", en: "POST /v1/deployments 201 in 112ms", ar: "POST /v1/deployments 201 خلال 112ms", fields: { status: 201, ms: 112 } },
  { level: "debug", source: "cache", en: "cache miss for key projects:list", ar: "لا توجد نسخة مخزنة للمفتاح projects:list" },
  { level: "debug", source: "worker", en: "picked up job build-4821", ar: "تم استلام المهمة build-4821" },
  { level: "warn", source: "db", en: "slow query took 1.4s: SELECT * FROM deployments", ar: "استعلام بطيء استغرق 1.4 ثانية: SELECT * FROM deployments", fields: { table: "deployments", ms: 1400 } },
  { level: "error", source: "worker", en: "job build-4820 failed: exit code 1", ar: "فشلت المهمة build-4820: رمز الخروج 1", fields: { job: "build-4820", code: 1 } },
  { level: "info", source: "auth", en: "session refreshed for user 42", ar: "تم تجديد الجلسة للمستخدم 42", fields: { user: 42 } },
  { level: "trace", source: "http", en: "keep-alive connection reused", ar: "تمت إعادة استخدام الاتصال" },
  { level: "fatal", source: "db", en: "lost connection to replica db-2, failing over", ar: "انقطع الاتصال بالنسخة db-2، جارٍ التحويل", fields: { replica: "db-2" } },
];

/** `count` entries ending now, one every ~700ms, cycling through a fixed set so the demo is stable. */
export function makeLogs(count: number, ar: boolean, startId = 1, end = Date.now()): LogEntry[] {
  return Array.from({ length: count }, (_, i) => {
    const t = LOG_TEMPLATES[(i * 7 + (i >> 2)) % LOG_TEMPLATES.length] as (typeof LOG_TEMPLATES)[number];
    return {
      id: startId + i,
      time: end - (count - i) * 700,
      level: t.level,
      source: t.source,
      message: ar ? t.ar : t.en,
      ...(t.fields ? { fields: t.fields } : {}),
    };
  });
}

/** A log that grows by one entry every `every` ms while `running`. */
export function useLogStream(ar: boolean, { initial = 60, every = 900, running = true }: { initial?: number; every?: number; running?: boolean } = {}) {
  const [entries, setEntries] = useState<LogEntry[]>(() => makeLogs(initial, ar));
  useEffect(() => {
    setEntries(makeLogs(initial, ar));
  }, [ar, initial]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setEntries((list) => {
        const last = list[list.length - 1];
        const next = makeLogs(1, ar, (last ? Number(last.id) : 0) + 1, Date.now())[0] as LogEntry;
        return [...list.slice(-4000), { ...next, level: LOG_TEMPLATES[Number(next.id) % LOG_TEMPLATES.length]?.level ?? "info" }];
      });
    }, every);
    return () => clearInterval(id);
  }, [ar, every, running]);
  return entries;
}

// ---------------------------------------------------------------------------------------------
// Terminal
// ---------------------------------------------------------------------------------------------

export function buildOutput(ar: boolean): TerminalLine[] {
  return [
    { kind: "command", text: "pnpm install" },
    dim("Lockfile is up to date, resolution step is skipped"),
    `Progress: resolved 412, reused 412, downloaded 0, added 412, done`,
    `${green("+")} react 19.2.0`,
    `${green("+")} tailwindcss 4.1.0`,
    { kind: "command", text: "pnpm build" },
    `${cyan("vite")} v7.0.0 ${ar ? "يبني للإنتاج..." : "building for production..."}`,
    `${green("✓")} 214 modules transformed.`,
    `${yellow("warning")} ${ar ? "حجم الحزمة أكبر من 500 kB" : "chunk is larger than 500 kB after minification"}`,
    "dist/index.html      0.46 kB",
    "dist/assets/app.js 388.20 kB",
    { kind: "success", text: ar ? "اكتمل البناء في 4.2 ثانية" : "built in 4.2s" },
  ];
}

/** A tiny fake shell for the Terminal `onCommand` demo. */
export async function fakeShell(command: string, ar: boolean): Promise<TerminalLine[]> {
  await wait(350);
  const [cmd = "", ...rest] = command.trim().split(/\s+/);
  switch (cmd) {
    case "":
      return [];
    case "help":
      return [ar ? "الأوامر: help, ls, whoami, date, echo" : "commands: help, ls, whoami, date, echo"];
    case "ls":
      return ["package.json  pnpm-lock.yaml  src/  dist/"];
    case "whoami":
      return ["sara"];
    case "date":
      return [new Date().toUTCString()];
    case "echo":
      return [rest.join(" ")];
    default:
      return [{ kind: "error", text: ar ? `${cmd}: الأمر غير موجود` : `${cmd}: command not found` }];
  }
}

/** Streams output line by line while `running`, restarting when `run` changes. */
export function useStreamingOutput(ar: boolean) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const start = useCallback(() => {
    clearInterval(timer.current);
    const all = buildOutput(ar);
    setLines([]);
    setRunning(true);
    let i = 0;
    timer.current = setInterval(() => {
      const line = all[i++];
      if (line === undefined) {
        clearInterval(timer.current);
        setRunning(false);
        return;
      }
      setLines((l) => [...l, line]);
    }, 450);
  }, [ar]);
  useEffect(() => () => clearInterval(timer.current), []);
  return { lines, running, start, clear: () => setLines([]) };
}

// ---------------------------------------------------------------------------------------------
// Deploy run
// ---------------------------------------------------------------------------------------------

interface StepPlan {
  id: string;
  name: { en: string; ar: string };
  command: string;
  ms: number;
  logs: string[];
  /** Fails the first time it runs. */
  flaky?: boolean;
}

const PLAN: StepPlan[] = [
  { id: "checkout", name: { en: "Checkout", ar: "جلب الشيفرة" }, command: "git clone --depth 1 origin main", ms: 1800, logs: ["Cloning into 'app'...", "remote: Enumerating objects: 214, done.", "Receiving objects: 100% (214/214)"] },
  { id: "install", name: { en: "Install dependencies", ar: "تثبيت الاعتمادات" }, command: "pnpm install --frozen-lockfile", ms: 3600, logs: ["Progress: resolved 412", "Progress: downloaded 210", `${green("+")} react 19.2.0`, "Done in 3.4s"] },
  { id: "test", name: { en: "Run tests", ar: "تشغيل الاختبارات" }, command: "pnpm test", ms: 3000, flaky: true, logs: ["node --test", `${green("✔")} parseEnv reads plain values`, `${green("✔")} formatDuration`, `${red("✖")} deploy pipeline retries a step`, "ℹ tests 24  pass 23  fail 1"] },
  { id: "build", name: { en: "Build", ar: "البناء" }, command: "pnpm build", ms: 4200, logs: [`${cyan("vite")} building for production...`, `${green("✓")} 214 modules transformed.`, "dist/assets/app.js 388.20 kB"] },
  { id: "release", name: { en: "Release to production", ar: "النشر إلى الإنتاج" }, command: "wrangler deploy", ms: 2400, logs: ["Uploading 4 files", "Published api (1.2 sec)", `${green("Deployed")} https://api.example.com`] },
];

/** A fake deploy that advances step by step. The test step fails once, so Retry has something to do. */
export function useDeployRun(ar: boolean, { autoStart = true }: { autoStart?: boolean } = {}) {
  const fails = useRef(new Set<string>(PLAN.filter((s) => s.flaky).map((s) => s.id)));
  const [steps, setSteps] = useState<DeployStep[]>(() =>
    PLAN.map((p) => ({ id: p.id, name: p.name[ar ? "ar" : "en"], command: p.command, status: "pending" as const })),
  );
  const alive = useRef(true);
  const runId = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setSteps((list) => list.map((s) => ({ ...s, name: (PLAN.find((p) => p.id === s.id)?.name ?? { en: s.name, ar: s.name })[ar ? "ar" : "en"] })));
  }, [ar]);

  const patch = useCallback((id: string, next: Partial<DeployStep>) => setSteps((l) => l.map((s) => (s.id === id ? { ...s, ...next } : s))), []);

  /** Runs one step. Resolves true when it succeeded. */
  const runStep = useCallback(
    async (plan: StepPlan, mine: number): Promise<boolean> => {
      const startedAt = Date.now();
      setSteps((l) => l.map((s) => { const { error: _gone, ...rest } = s; return s.id === plan.id ? { ...rest, status: "running" as const, startedAt, logs: "" } : s; }));
      const ok = !fails.current.has(plan.id);
      const lines = ok ? plan.logs : plan.logs.slice(0, plan.logs.length);
      const gap = plan.ms / (lines.length + 1);
      let text = "";
      for (const line of lines) {
        await wait(gap);
        if (!alive.current || runId.current !== mine) return false;
        text += `${line}\n`;
        patch(plan.id, { logs: text });
      }
      await wait(gap);
      if (!alive.current || runId.current !== mine) return false;
      const durationMs = Date.now() - startedAt;
      if (!ok) {
        patch(plan.id, { status: "failed", durationMs, error: ar ? "فشل اختبار واحد. راجع السجل أدناه." : "1 test failed. See the log below." });
        return false;
      }
      patch(plan.id, { status: "success", durationMs });
      return true;
    },
    [ar, patch],
  );

  const runFrom = useCallback(
    async (index: number) => {
      const mine = ++runId.current;
      for (let i = index; i < PLAN.length; i++) {
        const ok = await runStep(PLAN[i] as StepPlan, mine);
        if (!ok) return;
      }
    },
    [runStep],
  );

  useEffect(() => {
    if (autoStart) void runFrom(0);
    return () => {
      runId.current++;
    };
  }, [autoStart, runFrom]);

  const retry = useCallback(
    async (id: string) => {
      fails.current.delete(id);
      await runFrom(PLAN.findIndex((p) => p.id === id));
    },
    [runFrom],
  );
  const cancel = useCallback(async () => {
    runId.current++;
    setSteps((l) => l.map((s) => (s.status === "running" ? { ...s, status: "cancelled" as const } : s)));
  }, []);
  const restart = useCallback(() => {
    fails.current = new Set(PLAN.filter((s) => s.flaky).map((s) => s.id));
    setSteps(PLAN.map((p) => ({ id: p.id, name: p.name[ar ? "ar" : "en"], command: p.command, status: "pending" as const })));
    void runFrom(0);
  }, [ar, runFrom]);
  return { steps, retry, cancel, restart };
}

// ---------------------------------------------------------------------------------------------
// .env
// ---------------------------------------------------------------------------------------------

/** Placeholder values that look like config, never like real credentials. */
export const ENVIRONMENTS = [
  { id: "development", label: "Development" },
  { id: "preview", label: "Preview" },
  { id: "production", label: "Production" },
];
export const ENVIRONMENTS_AR = [
  { id: "development", label: "التطوير" },
  { id: "preview", label: "المعاينة" },
  { id: "production", label: "الإنتاج" },
];

export function sampleEnv(env: string): EnvVariable[] {
  const prod = env === "production";
  return [
    { key: "DATABASE_URL", value: `postgres://app:demo-password@db-${env}.internal:5432/app`, description: prod ? "Primary database" : undefined },
    { key: "REDIS_URL", value: `redis://cache-${env}.internal:6379` },
    { key: "SESSION_SECRET", value: `demo-not-a-real-secret-${env}` },
    { key: "STRIPE_SECRET_KEY", value: "sk_demo_not_a_real_key_0000" },
    { key: "NEXT_PUBLIC_API_URL", value: prod ? "https://api.example.com" : `https://api-${env}.example.com`, secret: false },
    { key: "LOG_LEVEL", value: prod ? "warn" : "debug", secret: false },
  ];
}
