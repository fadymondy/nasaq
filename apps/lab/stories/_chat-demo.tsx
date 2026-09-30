/* Fake data (English and Arabic) and the demos of the chat surfaces: Inbox, chat widget, copilot chat, desktop notification. Nothing here talks to a server. */
import { Button, ChatWidget, type CannedSnippet, type WidgetMessage, type ConversationPatch, type InboxAgent, type InboxConversation, type InboxDraft, type InboxMessage, Inbox, InboxDock } from "@nasaq/web";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAr, wait } from "./_profile-demo";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const ago = (ms: number) => Date.now() - ms;

/** A flat SVG picture as a data URI, so stories need no network. */
export function svgImage(label: string, from: string, to: string, w = 640, h = 420) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.12}" fill="white" fill-opacity="0.35"/><path d="M0 ${h} L${w * 0.35} ${h * 0.55} L${w * 0.6} ${h * 0.8} L${w * 0.8} ${h * 0.6} L${w} ${h * 0.85} V${h} Z" fill="black" fill-opacity="0.18"/><text x="24" y="${h - 24}" font-family="sans-serif" font-size="28" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AGENTS_EN: InboxAgent[] = [
  { id: "a1", name: "Layla Haddad", email: "layla@nasaq.example" },
  { id: "a2", name: "Omar Nasser", email: "omar@nasaq.example" },
  { id: "a3", name: "Nora Al-Saud", email: "nora@nasaq.example" },
];
export const AGENTS_AR: InboxAgent[] = [
  { id: "a1", name: "ليلى حداد", email: "layla@nasaq.example" },
  { id: "a2", name: "عمر ناصر", email: "omar@nasaq.example" },
  { id: "a3", name: "نورة السعود", email: "nora@nasaq.example" },
];

export const SNIPPETS_EN: CannedSnippet[] = [
  { id: "s1", shortcut: "hello", title: "Greeting", body: "Hi {{name}}, thanks for reaching out. This is {{agent}}. How can I help?" },
  { id: "s2", shortcut: "refund", title: "Refund policy", body: "Hi {{name}}, refunds are issued to the original payment method within 5 business days." },
  { id: "s3", shortcut: "bye", title: "Closing", body: "Glad I could help, {{name}}. Reach out any time." },
];
export const SNIPPETS_AR: CannedSnippet[] = [
  { id: "s1", shortcut: "hello", title: "ترحيب", body: "أهلاً {{name}}، شكراً لتواصلك. معك {{agent}}. كيف أساعدك؟" },
  { id: "s2", shortcut: "refund", title: "سياسة الاسترداد", body: "أهلاً {{name}}، يُعاد المبلغ إلى وسيلة الدفع الأصلية خلال 5 أيام عمل." },
  { id: "s3", shortcut: "bye", title: "ختام", body: "سعدت بمساعدتك يا {{name}}. نحن دائماً هنا." },
];

export function buildConversations(ar: boolean): InboxConversation[] {
  const t = <T,>(en: T, a: T) => (ar ? a : en);
  const photo = svgImage(t("Shop front", "واجهة المتجر"), "hsl(174 80% 26%)", "hsl(224 64% 33%)");
  const receipt = svgImage(t("Receipt", "الإيصال"), "hsl(32 90% 38%)", "hsl(15 80% 28%)", 480, 640);
  return [
    {
      id: "c1",
      channel: "chat",
      contact: {
        id: "u1",
        name: t("Sara Ali", "سارة علي"),
        email: "sara.ali@example.com",
        phone: "+966 55 010 2030",
        company: t("Bluebird Logistics", "بلوبيرد للخدمات اللوجستية"),
        location: t("Riyadh, Saudi Arabia", "الرياض، السعودية"),
        timezone: "Asia/Riyadh",
        tags: [t("VIP", "مميز"), t("Annual plan", "خطة سنوية")],
        firstSeen: ago(90 * DAY),
        notes: t("Prefers evening replies.", "تفضل الرد مساءً."),
      },
      messages: [
        { id: "m1", direction: "in", body: t("Hi, my invoice shows the wrong company name.", "مرحباً، اسم الشركة في الفاتورة غير صحيح."), at: ago(3 * HOUR) },
        { id: "m2", direction: "out", author: { id: "a1", name: t("Layla Haddad", "ليلى حداد") }, body: t("Hi Sara! Could you send a photo of the invoice?", "أهلاً سارة! هل ترسلين صورة للفاتورة؟"), at: ago(3 * HOUR - 4 * MIN), status: "sent" },
        { id: "m3", direction: "in", body: t("Sure, here it is.", "بالتأكيد، تفضلي."), at: ago(2 * HOUR), attachments: [{ id: "f1", name: "invoice.png", kind: "image", url: receipt, size: 240_000 }] },
        { id: "m4", direction: "in", body: t("Also please check https://nasaq.example/billing for the plan details", "وأيضاً راجع https://nasaq.example/billing لتفاصيل الخطة"), at: ago(HOUR + 30 * MIN), linkPreview: { url: "https://nasaq.example/billing", title: t("Billing and plans", "الفواتير والخطط"), description: t("Compare plans and manage invoices.", "قارن الخطط وأدر فواتيرك."), siteName: "nasaq.example" } },
        { id: "m5", direction: "out", kind: "note", author: { id: "a2", name: t("Omar Nasser", "عمر ناصر") }, body: t("Finance confirmed the legal name changed in March.", "أكدت المالية أن الاسم القانوني تغير في مارس."), at: ago(HOUR) },
        { id: "m6", direction: "in", body: t("Any update? I need it for tomorrow.", "هل من جديد؟ أحتاجها غداً."), at: ago(12 * MIN), reactions: [{ emoji: "🙏", by: ["u1"] }] },
      ],
      status: "open",
      assigneeId: "a1",
      unread: 2,
      pinned: true,
      color: "teal",
    },
    {
      id: "c2",
      channel: "email",
      subject: t("Partnership proposal for Q4", "عرض شراكة للربع الرابع"),
      contact: { id: "u2", name: t("Khalid Mansour", "خالد منصور"), email: "khalid@falconfoods.example", company: t("Falcon Foods", "فالكون للأغذية"), tags: [t("Lead", "عميل محتمل")], firstSeen: ago(12 * DAY) },
      messages: [
        {
          id: "e1",
          direction: "in",
          subject: t("Partnership proposal for Q4", "عرض شراكة للربع الرابع"),
          html: true,
          body: t(
            "<p>Hello team,</p><p>We would like to explore a <strong>co-marketing partnership</strong> in Q4:</p><ul><li>Joint webinar in October</li><li>Shared case study</li></ul><p>Could we schedule a call this week?</p><p>Best,<br/>Khalid</p>",
            "<p>مرحباً فريق نسق،</p><p>نود بحث <strong>شراكة تسويقية</strong> في الربع الرابع:</p><ul><li>ندوة مشتركة في أكتوبر</li><li>دراسة حالة مشتركة</li></ul><p>هل يمكن تحديد مكالمة هذا الأسبوع؟</p><p>مع التحية،<br/>خالد</p>",
          ),
          to: ["support@nasaq.example"],
          at: ago(DAY + 2 * HOUR),
        },
      ],
      status: "open",
      assigneeId: null,
      unread: 1,
    },
    {
      id: "c3",
      channel: "whatsapp",
      contact: { id: "u3", name: t("Mona Farouk", "منى فاروق"), phone: "+20 100 555 0199", location: t("Cairo, Egypt", "القاهرة، مصر") },
      messages: [
        { id: "w1", direction: "in", body: t("Where is my order?", "أين طلبي؟"), at: ago(5 * HOUR) },
        { id: "w2", direction: "out", author: { id: "a2", name: t("Omar Nasser", "عمر ناصر") }, body: t("On its way. Here is the driver location.", "في الطريق. هذا موقع السائق."), at: ago(4 * HOUR), status: "sent" },
        { id: "w3", direction: "out", kind: "location", author: { id: "a2", name: t("Omar Nasser", "عمر ناصر") }, body: "", location: { lat: 30.0444, lng: 31.2357, label: t("Driver, Downtown Cairo", "السائق، وسط القاهرة") }, at: ago(4 * HOUR - MIN), status: "sent" },
        { id: "w4", direction: "in", kind: "voice", body: "", voice: { duration: 14 }, at: ago(3 * HOUR + 10 * MIN) },
        { id: "w5", direction: "in", body: t("Thank you!", "شكراً لك!"), at: ago(3 * HOUR) },
      ],
      status: "open",
      assigneeId: "a2",
      typing: true,
      color: "violet",
    },
    {
      id: "c4",
      channel: "chat",
      contact: { id: "u4", name: t("Tariq Aziz", "طارق عزيز"), email: "tariq@example.com", tags: [t("Trial", "تجربة")] },
      messages: [
        { id: "x1", direction: "in", body: t("Do you support single sign-on?", "هل تدعمون تسجيل الدخول الموحد؟"), at: ago(2 * DAY) },
        { id: "x2", direction: "out", author: { id: "a3", name: t("Nora Al-Saud", "نورة السعود") }, body: t("Yes, SAML and OIDC on the Business plan.", "نعم، SAML وOIDC في خطة الأعمال."), at: ago(2 * DAY - 10 * MIN), status: "sent", reactions: [{ emoji: "👍", by: ["u4"] }] },
      ],
      status: "snoozed",
      snoozedUntil: Date.now() + 20 * HOUR,
      assigneeId: "a3",
    },
    {
      id: "c5",
      channel: "chat",
      contact: { id: "u5", name: t("Huda Saleh", "هدى صالح"), email: "huda@example.com", avatar: undefined },
      messages: [
        { id: "y1", direction: "in", body: t("Your shop photo attached", "صورة المتجر مرفقة"), at: ago(4 * DAY), attachments: [{ id: "f9", name: "shop.png", kind: "image", url: photo, size: 512_000 }] },
        { id: "y2", direction: "out", author: { id: "a1", name: t("Layla Haddad", "ليلى حداد") }, body: t("Thanks, all set on our side.", "شكراً، كل شيء جاهز من جهتنا."), at: ago(4 * DAY - HOUR), status: "sent" },
      ],
      status: "closed",
      assigneeId: "a1",
    },
    {
      id: "c6",
      channel: "email",
      subject: t("Invoice 2041 question", "استفسار عن الفاتورة 2041"),
      contact: { id: "u6", name: t("Ziad Rahman", "زياد رحمن"), email: "ziad@harborstudio.example", company: t("Harbor Studio", "هاربر ستوديو") },
      messages: [{ id: "z1", direction: "in", subject: t("Invoice 2041 question", "استفسار عن الفاتورة 2041"), body: t("Why was I charged twice this month?", "لماذا تم خصم المبلغ مرتين هذا الشهر؟"), at: ago(6 * HOUR) }],
      status: "open",
      assigneeId: "a1",
      muted: true,
      unread: 1,
    },
  ];
}

const seq = { n: 0 };
const uid = (p: string) => `${p}${Date.now().toString(36)}${seq.n++}`;

export type InboxDemoProps = { agentsOnly?: boolean; live?: boolean; empty?: boolean; loading?: boolean; className?: string; defaultSelectedId?: string | null };

/** State of the demo inbox: applies sends, patches and reactions, and can fake a new message arriving. */
export function useInboxState(live = false, seed?: InboxConversation[]) {
  const ar = useAr();
  const [conversations, setConversations] = useState<InboxConversation[]>(() => seed ?? buildConversations(ar));
  const first = useRef(true);
  useEffect(() => {
    // Rebuild in the other language when the toolbar switches locale.
    if (first.current) {
      first.current = false;
      return;
    }
    setConversations(seed ?? buildConversations(ar));
  }, [ar, seed]);

  const me = "a1";
  const send = useCallback(
    async (d: InboxDraft) => {
      await wait(350);
      const isVoice = !!d.voice;
      const message: InboxMessage = {
        id: uid("m"),
        direction: "out",
        kind: d.mode === "note" ? "note" : isVoice ? "voice" : d.location ? "location" : "text",
        author: { id: me, name: ar ? AGENTS_AR[0].name : AGENTS_EN[0].name },
        body: d.body,
        html: d.format === "html" || undefined,
        subject: d.subject,
        cc: d.cc,
        at: Date.now(),
        status: "sent",
        voice: d.voice ? { duration: d.voice.duration, waveform: d.voice.waveform, src: d.voice.blob ? URL.createObjectURL(d.voice.blob) : undefined } : undefined,
        location: d.location,
        attachments: d.attachments?.map((f) => ({ id: uid("f"), name: f.name, size: f.size, kind: f.type.startsWith("image/") ? "image" : "file", url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined })),
        replyTo: undefined,
      };
      setConversations((all) => all.map((c) => (c.id === d.conversationId ? { ...c, messages: [...c.messages, message], status: c.status === "closed" ? "open" : c.status } : c)));
    },
    [ar],
  );

  const update = useCallback(async (id: string, p: ConversationPatch) => {
    const { unread, ...rest } = p;
    setConversations((all) => all.map((c) => (c.id === id ? { ...c, ...rest, ...(unread === undefined ? {} : { unread: unread ? 1 : 0 }) } : c)));
  }, []);

  const react = useCallback(async (id: string, messageId: string, emoji: string) => {
    setConversations((all) =>
      all.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== messageId) return m;
                const list = m.reactions ?? [];
                const has = list.find((r) => r.emoji === emoji);
                const next = has
                  ? has.by.includes(me)
                    ? list.map((r) => (r.emoji === emoji ? { ...r, by: r.by.filter((x) => x !== me) } : r)).filter((r) => r.by.length)
                    : list.map((r) => (r.emoji === emoji ? { ...r, by: [...r.by, me] } : r))
                  : [...list, { emoji, by: [me] }];
                return { ...m, reactions: next };
              }),
            }
      ),
    );
  }, []);

  useEffect(() => {
    if (!live) return;
    const timer = setTimeout(() => {
      setConversations((all) =>
        all.map((c) =>
          c.id === "c4"
            ? { ...c, status: "open", snoozedUntil: null, unread: (c.unread ?? 0) + 1, messages: [...c.messages, { id: uid("in"), direction: "in", body: ar ? "هل يمكنكم إرسال عرض سعر لـ 40 مقعداً؟" : "Can you send a quote for 40 seats?", at: Date.now() }] }
            : c,
        ),
      );
    }, 5000);
    return () => clearTimeout(timer);
  }, [live, ar]);

  return { conversations, setConversations, send, update, react, me, agents: ar ? AGENTS_AR : AGENTS_EN, snippets: ar ? SNIPPETS_AR : SNIPPETS_EN };
}

export function InboxDemo({ live, empty, loading, className, defaultSelectedId = "c1" }: InboxDemoProps) {
  const s = useInboxState(live, empty ? [] : undefined);
  const [dock, setDock] = useState<string[]>([]);
  return (
    <div className="relative">
      <Inbox
        className={className}
        conversations={s.conversations}
        agents={s.agents}
        currentAgentId={s.me}
        defaultSelectedId={defaultSelectedId}
        onSend={s.send}
        onUpdate={s.update}
        onReact={s.react}
        onPopOut={(id) => setDock((d) => (d.includes(id) ? d : [...d, id].slice(-2)))}
        snippets={s.snippets}
        loading={loading}
        simulateVoice
      />
      <InboxDock position="absolute" className="bottom-28" conversations={s.conversations} me={s.me} openIds={dock} onOpenIdsChange={setDock} onSend={s.send} />
    </div>
  );
}

/** The whole page: a header strip and the inbox filling the viewport. */
export function InboxPage() {
  const ar = useAr();
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h3 text-foreground">{ar ? "صندوق الوارد" : "Inbox"}</h1>
        <p className="text-body-sm text-muted-foreground">{ar ? "المحادثة والبريد وواتساب في مكان واحد." : "Chat, email and WhatsApp in one place."}</p>
      </header>
      <InboxDemo live className="h-[calc(100vh-8rem)] min-h-[32rem]" />
    </div>
  );
}

/* ------------------------------------------------------------------ chat widget */

export function ChatWidgetDemo({ online = true, defaultOpen = true, placement = "absolute" as "absolute" | "fixed" | "static" }: { online?: boolean; defaultOpen?: boolean; placement?: "absolute" | "fixed" | "static" }) {
  const ar = useAr();
  const agent = { name: ar ? "ليلى حداد" : "Layla Haddad" };
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [open, setOpen] = useState(defaultOpen);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(open);
  openRef.current = open;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = async (text: string, files: File[]) => {
    const id = uid("v");
    setMessages((m) => [...m, { id, from: "visitor", text, at: Date.now(), status: "sending", attachments: files.map((f) => ({ id: uid("f"), name: f.name, kind: "file" as const })) }]);
    await wait(500);
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: "sent" } : x)));
    setTyping(true);
    timers.current.push(
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { id: uid("a"), from: "agent", name: agent.name, at: Date.now(), text: ar ? "شكراً لرسالتك! سأراجع الأمر وأعود إليك خلال دقيقة." : "Thanks for your message! Let me check and get right back to you." }]);
        if (!openRef.current) setUnread((n) => n + 1);
      }, 1800),
    );
  };

  return (
    <div className="relative h-[42rem] overflow-hidden rounded-card border border-border bg-secondary">
      <ChatWidget
        placement={placement}
        messages={messages}
        agent={agent}
        online={online}
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setUnread(0);
        }}
        unread={unread}
        typing={typing}
        title={ar ? "دعم نسق" : "Nasaq support"}
        starters={ar ? ["ما هي الأسعار؟", "أريد التحدث مع المبيعات", "كيف أبدأ؟"] : ["What are the prices?", "Talk to sales", "How do I get started?"]}
        onSend={send}
        onOfflineSubmit={async () => {
          await wait(700);
        }}
      />
    </div>
  );
}

/** A marketing page for a made-up product with the floating widget in the corner. */
export function MarketingChatPage() {
  const ar = useAr();
  const t = <T,>(en: T, a: T) => (ar ? a : en);
  const features = [
    [t("Plan work", "خطط عملك"), t("Boards, lists and timelines that stay in sync.", "لوحات وقوائم وجداول زمنية متزامنة دائماً.")],
    [t("Track time", "تتبع الوقت"), t("One click timers and honest reports.", "مؤقتات بنقرة واحدة وتقارير صادقة.")],
    [t("Bill clients", "فوتر عملاءك"), t("Turn tracked hours into invoices.", "حوّل الساعات المسجلة إلى فواتير.")],
  ];
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-h3">{t("Harbor", "هاربر")}</span>
        <nav aria-label={t("Main", "الرئيسية")} className="hidden gap-6 text-body-sm text-muted-foreground sm:flex">
          <span>{t("Product", "المنتج")}</span>
          <span>{t("Pricing", "الأسعار")}</span>
          <span>{t("Customers", "العملاء")}</span>
        </nav>
        <Button variant="primary" size="sm">{t("Start free", "ابدأ مجاناً")}</Button>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-12 px-6 py-16">
        <section className="flex flex-col gap-4 text-center">
          <h1 className="text-h1">{t("Run your studio without the busywork", "أدر استوديوك بلا أعمال روتينية")}</h1>
          <p className="mx-auto max-w-xl text-body text-muted-foreground">{t("Projects, time and invoices in one calm place. Questions? Chat with us in the corner.", "المشاريع والوقت والفواتير في مكان هادئ واحد. لديك سؤال؟ تحدث معنا من الزاوية.")}</p>
        </section>
        <section className="grid gap-4 sm:grid-cols-3">
          {features.map(([title, body]) => (
            <div key={title} className="flex flex-col gap-1 rounded-card border border-border bg-card p-5">
              <h2 className="text-label">{title}</h2>
              <p className="text-body-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>
      <ChatWidgetLive />
    </div>
  );
}

function ChatWidgetLive() {
  const ar = useAr();
  const agent = { name: ar ? "ليلى حداد" : "Layla Haddad" };
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [open, setOpen] = useState(true);
  return (
    <ChatWidget
      messages={messages}
      agent={agent}
      open={open}
      onOpenChange={setOpen}
      unread={0}
      title={ar ? "تحدث مع هاربر" : "Chat with Harbor"}
      starters={ar ? ["ما هي الأسعار؟", "هل توجد تجربة مجانية؟"] : ["What are the prices?", "Is there a free trial?"]}
      onSend={async (text) => {
        setMessages((m) => [...m, { id: uid("v"), from: "visitor", text, at: Date.now(), status: "sent" }]);
        await wait(300);
      }}
    />
  );
}
