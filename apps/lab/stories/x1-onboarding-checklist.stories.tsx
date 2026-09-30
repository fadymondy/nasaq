/* The in-app "Get started" card and the empty states people meet on their first run. */
import { Button, EmptyState, OnboardingChecklist, type OnboardingChecklistItem, toast } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FolderPlus, Plug, UserPlus } from "lucide-react";
import { useState } from "react";
import { sleep, useAr } from "./_x1-demo";

const meta = { title: "Pages/Onboarding/Checklist", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

const ALL = ["profile", "workspace", "invite", "connect", "project"];

function useItems(ar: boolean, initial: readonly string[]) {
  const [done, setDone] = useState<string[]>([...initial]);
  const finish = (id: string) => async () => {
    await sleep(600);
    setDone((d) => [...d, id]);
  };
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const items: OnboardingChecklistItem[] = [
    { id: "profile", title: t("Complete your profile", "أكمل ملفك الشخصي"), done: done.includes("profile") },
    { id: "workspace", title: t("Create your workspace", "أنشئ مساحة عملك"), done: done.includes("workspace") },
    { id: "invite", title: t("Invite a teammate", "ادعُ زميلًا"), description: t("Work is better together.", "العمل أجمل مع الفريق."), actionLabel: t("Invite", "ادعُ"), onAction: finish("invite"), done: done.includes("invite") },
    { id: "connect", title: t("Connect GitHub", "اربط GitHub"), description: t("Bring your repositories in.", "أحضر مستودعاتك."), actionLabel: t("Connect", "اربط"), onAction: finish("connect"), done: done.includes("connect") },
    { id: "project", title: t("Create your first project", "أنشئ أول مشروع"), actionLabel: t("New project", "مشروع جديد"), onAction: finish("project"), done: done.includes("project") },
  ];
  return { items, reset: () => setDone([...initial]) };
}

function Page({ initial }: { initial: readonly string[] }) {
  const ar = useAr();
  const { items, reset } = useItems(ar, initial);
  const [hidden, setHidden] = useState(false);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-h2 text-foreground">{ar ? "لوحة التحكم" : "Dashboard"}</h1>
      {hidden ? (
        <Button variant="secondary" className="self-start" onClick={() => setHidden(false)}>
          {ar ? "أظهر قائمة ابدأ" : "Show Get started again"}
        </Button>
      ) : (
        <OnboardingChecklist items={items} onDismiss={() => setHidden(true)} onComplete={() => toast(ar ? "أنجزت كل الخطوات" : "All steps done")} />
      )}
      <Button variant="ghost" size="sm" className="self-start" onClick={reset}>
        {ar ? "أعد الضبط" : "Reset demo"}
      </Button>
    </main>
  );
}

/** Two of five done. Each action resolves after a moment and ticks the item. */
export const Default: Story = { render: () => <Page initial={["profile", "workspace"]} /> };
export const Complete: Story = { render: () => <Page initial={ALL} /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Page initial={["profile", "workspace"]} /> };
export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <Page initial={["profile"]} /> };

function EmptyStates() {
  const ar = useAr();
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-4 p-4 sm:p-8 md:grid-cols-3">
      <EmptyState
        hatch
        icon={FolderPlus}
        title={t("No projects yet", "لا مشاريع بعد")}
        description={t("Projects hold your tasks, files and people. Create the first one.", "المشاريع تضم مهامك وملفاتك وفريقك. أنشئ أولها.")}
        actions={<Button variant="primary">{t("New project", "مشروع جديد")}</Button>}
      />
      <EmptyState
        hatch
        icon={UserPlus}
        title={t("It is just you", "أنت وحدك هنا")}
        description={t("Invite teammates so tasks can be shared and mentioned.", "ادعُ زملاءك لتشاركوا المهام وتذكروا بعضكم.")}
        actions={
          <>
            <Button variant="primary">{t("Invite teammates", "ادعُ زملاءك")}</Button>
            <Button variant="ghost">{t("Later", "لاحقًا")}</Button>
          </>
        }
      />
      <EmptyState
        hatch
        icon={Plug}
        title={t("Nothing connected", "لا شيء مربوط")}
        description={t("Connect a tool and its activity shows up here.", "اربط أداة ويظهر نشاطها هنا.")}
        actions={<Button variant="primary">{t("Connect a tool", "اربط أداة")}</Button>}
      />
    </main>
  );
}

/** First-run empty states: say what goes here, and give the one action that fills it. */
export const FirstRun: Story = { name: "First-run empty states", render: () => <EmptyStates /> };
export const FirstRunArabic: Story = { name: "First-run empty states (Arabic)", globals: { locale: "ar" }, render: () => <EmptyStates /> };
