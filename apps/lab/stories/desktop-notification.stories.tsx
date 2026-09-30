import { Button, DesktopNotification, type DesktopNotificationEntry, DesktopNotificationStack, type DesktopPermission, type DesktopPlatform, NotificationPermissionPrompt } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr, wait } from "./_profile-demo";

const meta = { title: "Components/Feedback/Desktop Notification" } satisfies Meta;
export default meta;
type Story = StoryObj;

const SAMPLES = (ar: boolean) => [
  { title: ar ? "سارة أرسلت لك ملفاً" : "Sara sent you a file", body: ar ? "ميزانية-الربع-الثالث.pdf" : "Q3-budget.pdf", appName: ar ? "نسق" : "Nasaq" },
  { title: ar ? "اكتمل النشر" : "Deploy finished", body: ar ? "الإنتاج محدّث إلى الإصدار ١٫٤٫٢ بلا أخطاء." : "Production is on v1.4.2 with no errors.", appName: ar ? "نسق" : "Nasaq" },
  { title: ar ? "اجتماع بعد ١٠ دقائق" : "Meeting in 10 minutes", body: ar ? "مراجعة التصميم الأسبوعية" : "Weekly design review", appName: ar ? "التقويم" : "Calendar" },
];

function Desktop({ platform, children, height = "28rem" }: { platform: DesktopPlatform; children: React.ReactNode; height?: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-card border border-border"
      style={{ height, background: platform === "macos" ? "linear-gradient(135deg, hsl(215 45% 40%), hsl(280 35% 45%))" : "linear-gradient(135deg, hsl(205 70% 35%), hsl(220 60% 20%))" }}
    >
      {children}
    </div>
  );
}

function StackDemo({ platform }: { platform: DesktopPlatform }) {
  const ar = useAr();
  const [items, setItems] = useState<DesktopNotificationEntry[]>([]);
  const [n, setN] = useState(0);
  const [last, setLast] = useState("");
  const add = () => {
    const s = SAMPLES(ar)[n % 3]!;
    setItems((all) => [...all, { id: `n${n}`, ...s, time: Date.now(), dismissAfter: 8000, actions: n % 3 === 0 ? [{ id: "open", label: ar ? "فتح" : "Open" }, { id: "save", label: ar ? "حفظ" : "Save" }] : undefined }]);
    setN(n + 1);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={add}>
          {ar ? "أرسل إشعاراً" : "Send a notification"}
        </Button>
        <span className="text-body-sm text-muted-foreground" aria-live="polite">
          {last}
        </span>
      </div>
      <Desktop platform={platform}>
        <DesktopNotificationStack
          platform={platform}
          items={items}
          onClose={(id) => setItems((all) => all.filter((i) => i.id !== id))}
          onAction={(id, a) => {
            setLast(`${id}: ${a}`);
            setItems((all) => all.filter((i) => i.id !== id));
          }}
          onActivate={(id) => setLast(`${id}: activate`)}
        />
      </Desktop>
    </div>
  );
}

/** macOS style: top corner, frosted card, close button on hover, newest on top. Cards close after 8 seconds unless hovered. */
export const MacOS: Story = { render: () => <StackDemo platform="macos" /> };

/** Windows style: bottom corner, solid card, always visible close, full width action buttons. */
export const Windows: Story = { render: () => <StackDemo platform="windows" /> };

/** A single card for each system, static. */
export const Single: Story = {
  render: () => {
    const ar = useAr();
    const s = SAMPLES(ar)[0]!;
    return (
      <div className="flex flex-wrap gap-6">
        <Desktop platform="macos" height="12rem"><div className="p-3"><DesktopNotification platform="macos" {...s} time={Date.now()} actions={[{ id: "a", label: ar ? "فتح" : "Open" }]} /></div></Desktop>
        <Desktop platform="windows" height="12rem"><div className="p-3"><DesktopNotification platform="windows" {...s} time={Date.now()} actions={[{ id: "a", label: ar ? "فتح" : "Open" }, { id: "b", label: ar ? "لاحقاً" : "Later" }]} /></div></Desktop>
      </div>
    );
  },
};

function PermissionDemo() {
  const ar = useAr();
  const [permission, setPermission] = useState<DesktopPermission>("default");
  const [allow, setAllow] = useState(true);
  const [items, setItems] = useState<DesktopNotificationEntry[]>([]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-body-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allow} onChange={(e) => setAllow(e.target.checked)} />
          {ar ? "سيسمح المستخدم في نافذة النظام" : "The user will Allow in the system dialog"}
        </label>
        <Button size="sm" onClick={() => setPermission("default")}>
          {ar ? "إعادة" : "Reset"}
        </Button>
      </div>
      <Desktop platform="macos" height="24rem">
        <div className="grid h-full place-items-center p-4">
          <NotificationPermissionPrompt
            permission={permission}
            onRequest={async () => {
              await wait(1400);
              setPermission(allow ? "granted" : "denied");
            }}
            onDismiss={() => {}}
            onTest={() => setItems((all) => [...all, { id: `t${all.length}`, ...SAMPLES(ar)[1]!, dismissAfter: 6000 }])}
            onOpenSettings={() => {}}
          />
        </div>
        <DesktopNotificationStack items={items} onClose={(id) => setItems((all) => all.filter((i) => i.id !== id))} />
      </Desktop>
    </div>
  );
}

/** The soft ask, the wait for the system dialog, then granted (with a test button) or blocked (how to unblock). */
export const PermissionFlow: Story = { render: () => <PermissionDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StackDemo platform="macos" /> };
export const ArabicWindows: Story = { globals: { locale: "ar" }, render: () => <StackDemo platform="windows" /> };
