import { Badge, ChatComposer, ChatMessage, ChatThread, TypingIndicator, useNasaq } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useRef, useState } from "react";

const meta = { title: "Components/Chat/Chat", component: ChatThread } satisfies Meta<typeof ChatThread>;
export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();
const ago = (m: number) => now - m * 60_000;

type Msg = { id: number; side: "user" | "assistant"; text: string; status?: "sending" | "sent" | "error"; streaming?: boolean; at: number };

const copy = {
  en: {
    name: "Nasaq Assistant",
    me: "Fady",
    seed: [
      { side: "user", text: "How do I install the design system?" },
      { side: "assistant", text: "Install the package, then wrap your app:\n\n```bash\npnpm add @nasaq/web\n```\n\nSee the **provider** docs for `defaultLocale`." },
    ],
    reply: "Sure. Here is a short answer with a list:\n\n- Wrap the app in `NasaqProvider`\n- Import `@nasaq/web/styles.css`\n- Use the components",
  },
  ar: {
    name: "مساعد نسق",
    me: "فادي",
    seed: [
      { side: "user", text: "كيف أثبّت نظام التصميم؟" },
      { side: "assistant", text: "ثبّت الحزمة ثم لفّ التطبيق:\n\n```bash\npnpm add @nasaq/web\n```\n\nراجع توثيق **المزوّد** لمعرفة `defaultLocale`." },
    ],
    reply: "بالتأكيد. إليك إجابة قصيرة:\n\n- لفّ التطبيق بـ `NasaqProvider`\n- استورد ملف الأنماط\n- استخدم المكوّنات",
  },
} as const;

function Demo() {
  const ar = useNasaq().locale.startsWith("ar");
  const c = copy[ar ? "ar" : "en"];
  const id = useRef(10);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const [messages, setMessages] = useState<Msg[]>(() =>
    c.seed.map((m, i) => ({ id: i, side: m.side, text: m.text, status: m.side === "user" ? ("sent" as const) : undefined, at: ago(5 - i) })),
  );
  const streaming = messages.some((m) => m.streaming);
  useEffect(() => () => for_each(timers.current), []);

  const send = (text: string) => {
    const userId = ++id.current;
    const botId = ++id.current;
    setMessages((m) => [...m, { id: userId, side: "user", text, status: "sending", at: Date.now() }]);
    setTimeout(() => {
      setMessages((m) => [
        ...m.map((x) => (x.id === userId ? { ...x, status: "sent" as const } : x)),
        { id: botId, side: "assistant", text: "", streaming: true, at: Date.now() },
      ]);
      let n = 0;
      const t = setInterval(() => {
        n += 3;
        const done = n >= c.reply.length;
        setMessages((m) => m.map((x) => (x.id === botId ? { ...x, text: c.reply.slice(0, n), streaming: !done } : x)));
        if (done) clearInterval(t);
      }, 60);
      timers.current.push(t);
    }, 600);
  };

  const stop = () => {
    for_each(timers.current);
    setMessages((m) => m.map((x) => ({ ...x, streaming: false })));
  };

  return (
    <div className="flex h-[32rem] max-w-xl flex-col rounded-surface border border-border bg-background">
      <ChatThread className="flex-1">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            side={m.side}
            name={m.side === "user" ? c.me : c.name}
            time={m.at}
            status={m.status}
            streaming={m.streaming}
            format={m.side === "assistant" ? "markdown" : "text"}
          >
            {m.text}
          </ChatMessage>
        ))}
      </ChatThread>
      <div className="p-3 pt-0">
        <ChatComposer onSend={send} onStop={stop} streaming={streaming} />
      </div>
    </div>
  );
}

function for_each(list: ReturnType<typeof setInterval>[]) {
  for (const t of list) clearInterval(t);
  list.length = 0;
}

/** Type and press Enter to send, Shift+Enter for a new line. The assistant streams a reply and the thread follows it. */
export const Playground: Story = { render: () => <Demo /> };

/** Follows the lab locale toolbar; the user side moves to the other edge in RTL. */
export const EnglishAndArabic: Story = { render: () => <Demo /> };

export const Statuses: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const [failed, setFailed] = useState(true);
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <ChatMessage side="user" name={ar ? "فادي" : "Fady"} time={ago(3)} status="sending">
          {ar ? "جارٍ الإرسال" : "Sending now"}
        </ChatMessage>
        <ChatMessage side="user" name={ar ? "فادي" : "Fady"} time={ago(2)} status="sent">
          {ar ? "تم الإرسال" : "Delivered"}
        </ChatMessage>
        {failed ? (
          <ChatMessage side="user" name={ar ? "فادي" : "Fady"} time={ago(1)} status="error" onRetry={() => setFailed(false)}>
            {ar ? "لم تصل هذه الرسالة" : "This one did not go through"}
          </ChatMessage>
        ) : (
          <Badge variant="success">{ar ? "أُعيد الإرسال" : "Retried"}</Badge>
        )}
        <ChatMessage name={ar ? "مساعد نسق" : "Nasaq Assistant"} streaming>
          {ar ? "أفكر في" : "Thinking about"}
        </ChatMessage>
        <ChatMessage name={ar ? "مساعد نسق" : "Nasaq Assistant"} streaming />
      </div>
    );
  },
};

export const Composer: Story = {
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <ChatComposer
          onSend={() => {}}
          attachments={<Badge variant="neutral">{ar ? "تقرير.pdf" : "report.pdf"}</Badge>}
        />
        <ChatComposer disabled defaultValue={ar ? "لا يمكن الكتابة الآن" : "Composer is disabled"} />
        <ChatComposer streaming onStop={() => {}} defaultValue={ar ? "قيد الرد…" : "Replying…"} />
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <TypingIndicator /> {ar ? "مؤشر الكتابة" : "Typing indicator"}
        </div>
      </div>
    );
  },
};
