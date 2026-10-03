/* CopilotProvider with a fake transport. Nothing here talks to a server. */
import { Button, CopilotLauncher, type CopilotEvent, CopilotProvider, type CopilotSessionStore, type CopilotTransport, useCopilot } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/AI Assistant/Copilot Provider", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj;

const FENCE = "```";
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

function fakeTransport(ar: boolean, failFirst = false): CopilotTransport {
  let calls = 0;
  return async function* (request, { signal }): AsyncGenerator<CopilotEvent> {
    calls++;
    yield { type: "session", id: "s-new", title: request.message.text.slice(0, 40) };
    yield { type: "step", step: { id: "1", label: ar ? "بحثت في الطلبات" : "Searched orders", tool: "orders.search", status: "running" } };
    await wait(500, signal);
    yield { type: "step", step: { id: "1", label: ar ? "بحثت في الطلبات" : "Searched orders", tool: "orders.search", status: "done" } };
    if (failFirst && calls === 1) {
      yield { type: "error", message: ar ? "انقطع الاتصال بالخادم." : "The connection to the server dropped." };
      return;
    }
    if (request.data) {
      yield { type: "delta", text: ar ? "تم. سجّلت اختيارك." : "Done. I noted your choice." };
      yield { type: "done" };
      return;
    }
    const words = (ar ? "لديك ثلاثة طلبات متأخرة هذا الأسبوع. إليك الملخص:" : "You have three late orders this week. Here is the summary:").split(" ");
    for (const w of words) {
      if (signal.aborted) return;
      yield { type: "delta", text: `${w} ` };
      await wait(60, signal);
    }
    const stats = {
      kind: "stats",
      items: [
        { label: ar ? "متأخرة" : "Late", value: "3" },
        { label: ar ? "في الطريق" : "On the way", value: "18" },
        { label: ar ? "سُلّمت" : "Delivered", value: "124" },
      ],
    };
    yield { type: "delta", text: `\n\n${FENCE}artifact\n${JSON.stringify(stats)}\n${FENCE}\n` };
    yield {
      type: "artifact",
      artifact: {
        kind: "actions",
        title: ar ? "ماذا أفعل؟" : "What next?",
        actions: [
          { id: "notify", label: ar ? "أبلغ العملاء" : "Notify customers" },
          { id: "ignore", label: ar ? "تجاهل" : "Ignore", variant: "secondary" },
        ],
      },
    };
    yield { type: "followUps", followUps: ar ? ["أي طلب أقدم؟"] : ["Which order is the oldest?"] };
    yield { type: "done" };
  };
}

const store: CopilotSessionStore = {
  list: async () => [
    { id: "s1", title: "Late orders last week", at: Date.UTC(2026, 8, 28) },
    { id: "s2", title: "Refund policy", at: Date.UTC(2026, 8, 20) },
  ],
  load: async (id) => [
    { id: `${id}-u`, role: "user", text: id === "s1" ? "Which orders were late last week?" : "What is the refund policy?" },
    { id: `${id}-a`, role: "assistant", text: id === "s1" ? "Two orders were late, both from the north depot." : "Refunds are allowed within 14 days." },
  ],
  remove: async () => {},
};

function Page() {
  const ar = useAr();
  const copilot = useCopilot();
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-body-sm font-medium">{ar ? "الطلبات" : "Orders"}</span>
        <CopilotLauncher />
      </header>
      <div className="flex flex-col items-start gap-3 p-6">
        <p className="max-w-md text-body-sm text-muted-foreground">
          {ar
            ? "يفتح أي جزء من الصفحة المساعد عبر useCopilot()، مع نص جاهز أو بإرساله مباشرة."
            : "Any part of the page opens the assistant through useCopilot(), with text ready in the box or sent right away."}
        </p>
        <Button size="sm" onClick={() => copilot.open({ message: ar ? "لخّص الطلبات المتأخرة" : "Summarise the late orders", autoSend: true })}>
          {ar ? "اسأل عن الطلبات المتأخرة" : "Ask about late orders"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => copilot.open({ message: ar ? "اكتب رداً لـ " : "Draft a reply to ", context: [{ id: "o-1042", label: ar ? "طلب ١٠٤٢" : "Order 1042" }] })}
        >
          {ar ? "اسأل عن هذا الطلب" : "Ask about this order"}
        </Button>
      </div>
    </div>
  );
}

function Demo({ failFirst = false }: { failFirst?: boolean }) {
  const ar = useAr();
  return (
    <div className="relative h-[40rem] overflow-hidden border border-border bg-background">
      <CopilotProvider
        key={ar ? "ar" : "en"}
        transport={fakeTransport(ar, failFirst)}
        sessions={store}
        greeting={ar ? "أهلاً! اسألني عن طلباتك." : "Hi! Ask me about your orders."}
        dock={{ placement: "absolute", launcher: false, hotkey: false }}
      >
        <Page />
      </CopilotProvider>
    </div>
  );
}

/** A header launcher, page buttons that open the assistant, streaming with steps and artifacts, Stop, and History. */
export const Default: Story = { render: () => <Demo /> };

/** The first answer fails mid-way; Retry sends the question again. */
export const StreamError: Story = { render: () => <Demo failFirst /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
