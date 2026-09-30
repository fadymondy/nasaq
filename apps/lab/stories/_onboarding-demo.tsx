/* Fake data and small demo screens shared by the batch-O stories: brand loaders, cookie consent, lock screen, setup wizard, device pairing. Nothing here talks to a server. */
import {
  AgentEnrollWait,
  type AgentEnrollStatus,
  type AuthSubmitResult,
  type ConsentCategory,
  DeviceApproval,
  DeviceCodeDisplay,
  DeviceCodeEntry,
  type DeviceCodeStatus,
  DeviceHandoff,
  type DeviceRequest,
  Field,
  FieldLabel,
  Input,
  type LockUser,
  ProductLogo,
  ProductMark,
  SetupWizard,
  type SetupStep,
  useNasaq,
} from "@nasaq/web";
import { type ReactNode, useEffect, useState } from "react";

export { ArabicScope } from "./_profile-demo";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useAr = () => useNasaq().locale.startsWith("ar");

/** A fixed moment so the lock-screen clock reads the same in every screenshot. */
export const DEMO_NOW = new Date(2026, 8, 30, 9, 41);

export const demoUser = (ar: boolean): LockUser => (ar ? { name: "نور عادل", email: "nour@example.com" } : { name: "Nour Adel", email: "nour@example.com" });

/** A wallpaper made only from tokens. A real app passes its own image. */
export function Wallpaper() {
  return (
    <div className="size-full bg-[radial-gradient(60rem_40rem_at_20%_10%,color-mix(in_oklab,var(--nq-action)_35%,transparent),transparent),radial-gradient(50rem_40rem_at_90%_90%,color-mix(in_oklab,var(--nq-info-solid,var(--nq-action))_30%,transparent),transparent)]" />
  );
}

/* ------------------------------------------------------------- cookie consent */

export const consentCategories = (ar: boolean): ConsentCategory[] => [
  {
    id: "necessary",
    required: true,
    consentMode: ["security_storage"],
    cookies: [
      { name: "nq_session", purpose: ar ? "يُبقيك مسجّل الدخول" : "Keeps you signed in", duration: ar ? "جلسة" : "Session", provider: "nasaq.app" },
      { name: "nq_consent", purpose: ar ? "يتذكّر اختيارك هنا" : "Remembers your choice here", duration: ar ? "سنة واحدة" : "1 year", provider: "nasaq.app" },
    ],
  },
  { id: "preferences", consentMode: ["functionality_storage", "personalization_storage"], cookies: [{ name: "nq_theme", purpose: ar ? "السمة واللغة" : "Theme and language", duration: ar ? "سنة واحدة" : "1 year" }] },
  {
    id: "analytics",
    consentMode: ["analytics_storage"],
    cookies: [
      { name: "_ga", purpose: ar ? "يميّز الزائر ليقيس الاستخدام" : "Tells visitors apart to measure use", duration: ar ? "سنتان" : "2 years", provider: "google.com" },
      { name: "_ga_ABC123", purpose: ar ? "يحفظ حالة الجلسة" : "Keeps session state", duration: ar ? "سنتان" : "2 years", provider: "google.com" },
    ],
  },
  { id: "marketing", consentMode: ["ad_storage", "ad_user_data", "ad_personalization"] },
];

/* ------------------------------------------------------------ setup wizard */

const WIZARD_COPY = {
  en: {
    title: "Set up Nasaq",
    description: "A few steps to get your workspace ready.",
    workspace: "Workspace",
    workspaceDesc: "Name your workspace.",
    name: "Workspace name",
    namePlaceholder: "Acme Studio",
    nameRequired: "Enter a name for your workspace.",
    team: "Invite your team",
    teamDesc: "Add teammates by email. You can skip this and do it later.",
    emails: "Emails, separated by commas",
    agent: "Connect an agent",
    agentDesc: "Install the agent on the machine that runs your work.",
    review: "Review",
    reviewDesc: "Everything is in place.",
    reviewBody: "Your workspace is named {name}. The agent is connected and reports every few seconds.",
    gate: "Setup cannot finish yet",
    doneTitle: "Your workspace is ready",
    doneDescription: "Invite more people or open the dashboard any time.",
    open: "Open the dashboard",
    hint: "Works on macOS, Linux and Windows (WSL).",
  },
  ar: {
    title: "إعداد نسق",
    description: "خطوات قليلة لتجهيز مساحة عملك.",
    workspace: "مساحة العمل",
    workspaceDesc: "سمِّ مساحة عملك.",
    name: "اسم مساحة العمل",
    namePlaceholder: "استوديو الأفق",
    nameRequired: "أدخل اسمًا لمساحة العمل.",
    team: "ادعُ فريقك",
    teamDesc: "أضف زملاءك بالبريد الإلكتروني. يمكنك التخطي والقيام بذلك لاحقًا.",
    emails: "البريد الإلكتروني، مفصولًا بفواصل",
    agent: "ربط وكيل",
    agentDesc: "ثبّت الوكيل على الجهاز الذي يشغّل أعمالك.",
    review: "المراجعة",
    reviewDesc: "كل شيء في مكانه.",
    reviewBody: "اسم مساحة عملك {name}. الوكيل متصل ويرسل تقاريره كل بضع ثوانٍ.",
    gate: "لا يمكن إنهاء الإعداد بعد",
    doneTitle: "مساحة عملك جاهزة",
    doneDescription: "ادعُ المزيد من الأشخاص أو افتح لوحة التحكم في أي وقت.",
    open: "افتح لوحة التحكم",
    hint: "يعمل على macOS وLinux وWindows (WSL).",
  },
};

/** Watches a fake agent: waits, then "connects" after `delay` ms. `null` delay never connects (timeout demo). */
export function useFakeEnroll(delay: number | null, active: boolean) {
  const [status, setStatus] = useState<AgentEnrollStatus>("waiting");
  const [elapsed, setElapsed] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!active) return;
    setStatus("waiting");
    setElapsed(0);
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    const connect = delay === null ? undefined : setTimeout(() => setStatus("connected"), delay);
    const giveUp = delay === null ? setTimeout(() => setStatus("timeout"), 6000) : undefined;
    return () => {
      clearInterval(tick);
      clearTimeout(connect);
      clearTimeout(giveUp);
    };
  }, [delay, active, round]);
  useEffect(() => {
    if (status !== "waiting") return;
  }, [status]);
  return { status, elapsed: status === "waiting" ? elapsed : undefined, retry: () => setRound((n) => n + 1) };
}

export function WizardDemo({ agentDelay = 4000, gated = false }: { agentDelay?: number | null; gated?: boolean }) {
  const ar = useAr();
  const t = WIZARD_COPY[ar ? "ar" : "en"];
  const [current, setCurrent] = useState(0);
  const [name, setName] = useState("");
  const [emails, setEmails] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const enroll = useFakeEnroll(agentDelay, current === 2);
  const done = (id: string) => setCompleted((c) => (c.includes(id) ? c : [...c, id]));

  const steps: SetupStep[] = [
    {
      id: "workspace",
      title: t.workspace,
      description: t.workspaceDesc,
      content: (
        <Field name="workspace">
          <FieldLabel>{t.name}</FieldLabel>
          <Input value={name} placeholder={t.namePlaceholder} onChange={(e) => setName(e.target.value)} />
        </Field>
      ),
    },
    {
      id: "team",
      title: t.team,
      description: t.teamDesc,
      optional: true,
      content: (
        <Field name="emails">
          <FieldLabel>{t.emails}</FieldLabel>
          <Input ltr placeholder="sara@example.com, omar@example.com" value={emails} onChange={(e) => setEmails(e.target.value)} />
        </Field>
      ),
    },
    {
      id: "agent",
      title: t.agent,
      description: t.agentDesc,
      ready: enroll.status === "connected",
      content: <AgentEnrollWait command="curl -fsSL https://get.nasaq.app/agent | sh -s -- --token nq_live_3f9a1c" status={enroll.status} elapsed={enroll.elapsed} onRetry={enroll.retry} hint={t.hint} agent={{ name: "atlas-build-01", host: "atlas-build-01.internal", system: "Ubuntu 24.04 · x64", version: "1.8.2" }} />,
    },
    { id: "review", title: t.review, description: t.reviewDesc, content: <p className="text-body text-foreground">{t.reviewBody.replace("{name}", name || "Acme Studio")}</p> },
  ];

  return (
    <SetupWizard
      steps={steps}
      current={current}
      onCurrentChange={setCurrent}
      completed={completed}
      title={t.title}
      description={t.description}
      canFinish={!gated}
      gateMessage={gated ? t.gate : undefined}
      doneTitle={t.doneTitle}
      doneDescription={t.doneDescription}
      doneAction={<a href="#dashboard" className="text-body-sm text-foreground underline underline-offset-4">{t.open}</a>}
      onStepComplete={async (id): Promise<AuthSubmitResult> => {
        await sleep(500);
        if (id === "workspace" && !name.trim()) return { error: t.nameRequired };
        done(id);
      }}
      onFinish={async () => {
        await sleep(800);
      }}
    />
  );
}

/** Centres a card on a tinted page with the brand mark above it. */
export function CenteredPage({ children, mark = true }: { children: ReactNode; mark?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center gap-6 bg-muted p-4 py-10 sm:p-8">
      {mark ? <ProductLogo size={26} /> : null}
      <div className="flex w-full flex-1 items-start justify-center sm:items-center">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------- device pairing */

export const deviceRequest = (ar: boolean): DeviceRequest => ({
  code: "WDJB-MJHT",
  client: ar ? "سطح مكتب مهام" : "Mahaam Desktop",
  deviceName: ar ? "ماك بوك برو فادي" : "Fady's MacBook Pro",
  platform: "macOS 15.2",
  browser: "Chrome 141",
  ip: "94.129.42.17",
  location: ar ? "الرياض، السعودية" : "Riyadh, Saudi Arabia",
  requestedAt: new Date(Date.now() - 90_000),
  scopes: ar ? ["قراءة مشاريعك ومهامك", "تسجيل الوقت باسمك", "لا يمكنه إدارة الفوترة أو الأعضاء"] : ["Read your projects and tasks", "Log time on your behalf", "It cannot manage billing or members"],
});

export const useExpiry = (seconds: number) => {
  const [at] = useState(() => Date.now() + seconds * 1000);
  return at;
};

export function ApprovalDemo({ initial = "pending", seconds = 540 }: { initial?: DeviceCodeStatus; seconds?: number }) {
  const ar = useAr();
  const [status, setStatus] = useState<DeviceCodeStatus>(initial);
  const expiresAt = useExpiry(seconds);
  return (
    <CenteredPage>
      <DeviceApproval
        request={deviceRequest(ar)}
        status={status}
        expiresAt={expiresAt}
        account={{ name: demoUser(ar).name, email: "nour@example.com" }}
        onApprove={async () => {
          await sleep(900);
          setStatus("approved");
        }}
        onDeny={async () => {
          await sleep(500);
          setStatus("denied");
        }}
        onEnterAnother={() => setStatus("pending")}
      />
    </CenteredPage>
  );
}

/** Code `WDJB-MJHT` finds the request; anything else is "not found". */
export function EntryFlowDemo() {
  const ar = useAr();
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<DeviceCodeStatus>("pending");
  const expiresAt = useExpiry(540);
  if (code) {
    return (
      <CenteredPage>
        <DeviceApproval
          request={{ ...deviceRequest(ar), code }}
          status={status}
          expiresAt={expiresAt}
          onApprove={async () => {
            await sleep(800);
            setStatus("approved");
          }}
          onDeny={async () => {
            await sleep(500);
            setStatus("denied");
          }}
          onEnterAnother={() => {
            setCode(null);
            setStatus("pending");
          }}
        />
      </CenteredPage>
    );
  }
  return (
    <CenteredPage>
      <div className="flex w-full max-w-md flex-col gap-5 rounded-card border border-border bg-card p-6 sm:p-8">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-h2 text-foreground">{ar ? "ربط جهاز" : "Connect a device"}</h1>
          <p className="text-body-sm text-muted-foreground">{ar ? "أدخل الرمز الظاهر على الجهاز. جرّب WDJBMJHT." : "Enter the code shown on the device. Try WDJBMJHT."}</p>
        </header>
        <DeviceCodeEntry
          onSubmit={async (value) => {
            await sleep(700);
            if (value !== "WDJBMJHT") return { error: ar ? "لم نجد هذا الرمز، أو انتهت صلاحيته." : "We could not find that code, or it expired." };
            setCode(value);
          }}
        />
      </div>
    </CenteredPage>
  );
}

/** The device's view: waits, then flips to approved when `approveAfter` ms pass. `null` keeps it waiting. */
export function DisplayDemo({ initial = "pending", approveAfter = 7000, seconds = 600 }: { initial?: DeviceCodeStatus; approveAfter?: number | null; seconds?: number }) {
  const [status, setStatus] = useState<DeviceCodeStatus>(initial);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + seconds * 1000);
  useEffect(() => {
    if (status !== "pending" || approveAfter === null) return;
    const id = setTimeout(() => setStatus("approved"), approveAfter);
    return () => clearTimeout(id);
  }, [status, approveAfter]);
  return (
    <CenteredPage mark={false}>
      <DeviceCodeDisplay
        mark={<ProductMark size={40} />}
        code="WDJBMJHT"
        verificationUri="https://nasaq.app/device"
        verificationUriComplete="https://nasaq.app/device?user_code=WDJB-MJHT"
        status={status}
        expiresAt={expiresAt}
        onRefresh={() => {
          setStatus("pending");
          setExpiresAt(Date.now() + seconds * 1000);
        }}
      />
    </CenteredPage>
  );
}

export function HandoffDemo({ initial = "opening" }: { initial?: "opening" | "opened" | "failed" }) {
  const ar = useAr();
  const [state, setState] = useState(initial);
  useEffect(() => {
    if (initial !== "opening") return;
    const id = setTimeout(() => setState("opened"), 2500);
    return () => clearTimeout(id);
  }, [initial]);
  return (
    <CenteredPage mark={false}>
      <DeviceHandoff
        appName={ar ? "سطح مكتب مهام" : "Mahaam Desktop"}
        href="#mahaam://auth/callback"
        state={state}
        browserHref="#web"
        fallbackCode="KQTZ7BXR"
        onOpen={() => setState("opening")}
        onCancel={() => setState("failed")}
      />
    </CenteredPage>
  );
}
