/* Shared demo data and page frames for the builder stories: brains list, email templates, landing page editor. Every string is English and Arabic. Nothing talks to a server. */
import { Badge, BrainList, type BrainSummary, Button, createSection, type EmailTemplate, EmailTemplates, type EmailVariable, type LandingPage, LandingPageEditor } from "@nasaq/web";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAr, wait } from "./_profile-demo";
import { FlowPage } from "./_workflow-demo";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);

/* ------------------------------------------------------------------ brains */

export function makeBrains(lang: "en" | "ar"): BrainSummary[] {
  const en = lang === "en";
  const people = en ? ["Layla Haddad", "Omar Nasser", "Nora Al-Saud", "Yusuf Karim", "Sara Ali"] : ["ليلى حداد", "عمر ناصر", "نورة السعود", "يوسف كريم", "سارة علي"];
  const rows: Omit<BrainSummary, "id" | "members">[] = [
    { name: en ? "Company handbook" : "دليل الشركة", description: en ? "Policies, onboarding guides and how we work." : "السياسات وأدلة الانضمام وطريقة عملنا.", avatar: "📘", status: "ready", visibility: "team", memories: 1842, sources: 6, chats: 412, model: "claude-sonnet", tags: [{ label: en ? "HR" : "الموارد البشرية", hue: "blue" }], lastActive: ago(2 * HOUR) },
    { name: en ? "Customer support" : "دعم العملاء", description: en ? "Resolved tickets, macros and product FAQs." : "التذاكر المحلولة والردود الجاهزة وأسئلة المنتج.", avatar: "🎧", status: "indexing", visibility: "team", memories: 9310, sources: 4, chats: 2204, model: "claude-haiku", tags: [{ label: en ? "Support" : "الدعم", hue: "green" }], lastActive: ago(25 * 60_000) },
    { name: en ? "Sales playbook" : "دليل المبيعات", description: en ? "Pitches, objection handling and pricing rules." : "العروض والرد على الاعتراضات وقواعد التسعير.", avatar: "💼", status: "ready", visibility: "private", memories: 604, sources: 3, chats: 97, model: "claude-sonnet", tags: [{ label: en ? "Sales" : "المبيعات", hue: "amber" }], lastActive: ago(1 * DAY) },
    { name: en ? "Engineering wiki" : "ويكي الهندسة", description: en ? "Architecture notes, runbooks and postmortems." : "ملاحظات البنية وأدلة التشغيل وتقارير ما بعد الحوادث.", avatar: "🛠️", status: "ready", visibility: "team", memories: 5120, sources: 11, chats: 860, model: "claude-opus", tags: [{ label: en ? "Engineering" : "الهندسة", hue: "violet" }], lastActive: ago(5 * HOUR) },
    { name: en ? "Public docs assistant" : "مساعد الوثائق العامة", description: en ? "Answers visitors from the public documentation." : "يجيب الزوار من الوثائق العامة.", avatar: "🌐", status: "ready", visibility: "public", memories: 2270, sources: 2, chats: 15340, model: "claude-haiku", tags: [{ label: en ? "Docs" : "الوثائق", hue: "teal" }], lastActive: ago(9 * 60_000) },
    { name: en ? "Legal archive" : "الأرشيف القانوني", description: en ? "Contracts and compliance notes. Read-only." : "العقود وملاحظات الامتثال. للقراءة فقط.", avatar: "⚖️", status: "paused", visibility: "private", memories: 388, sources: 1, chats: 22, model: "claude-sonnet", tags: [{ label: en ? "Legal" : "قانوني", hue: "gray" }], lastActive: ago(12 * DAY) },
    { name: en ? "Finance reports" : "التقارير المالية", description: en ? "Monthly close, budgets and forecasts." : "الإقفال الشهري والميزانيات والتوقعات.", avatar: "📊", status: "error", visibility: "private", memories: 730, sources: 5, chats: 64, model: "claude-sonnet", tags: [{ label: en ? "Finance" : "المالية", hue: "orange" }], lastActive: ago(3 * DAY) },
    { name: en ? "Research notes" : "ملاحظات البحث", description: en ? "Interviews, surveys and market research." : "المقابلات والاستبيانات وأبحاث السوق.", avatar: "🔬", status: "ready", visibility: "team", memories: 1290, sources: 8, chats: 143, model: "claude-opus", tags: [{ label: en ? "Product" : "المنتج", hue: "pink" }], lastActive: ago(2 * DAY + 3 * HOUR) },
  ];
  return rows.map((r, i) => ({ ...r, id: `b${i + 1}`, members: Array.from({ length: 1 + (i % 4) }, (_, k) => ({ name: people[(i + k) % people.length]! })) }));
}

export function BrainsPage() {
  const ar = useAr();
  const [brains, setBrains] = useState<BrainSummary[] | null>(null);
  useEffect(() => {
    let live = true;
    void wait(700).then(() => live && setBrains(makeBrains(ar ? "ar" : "en")));
    return () => {
      live = false;
    };
  }, [ar]);
  return (
    <FlowPage
      title={ar ? "العقول" : "Brains"}
      description={ar ? "كل عقل ذاكرة مشتركة يتعلّم منها فريقك ويسألها." : "Each brain is a shared memory your team teaches and asks."}
      actions={
        <Button variant="primary">
          <Plus aria-hidden />
          {ar ? "عقل جديد" : "New brain"}
        </Button>
      }
    >
      <BrainList brains={brains ?? []} loading={!brains} defaultView="cards" onRowClick={() => undefined} />
    </FlowPage>
  );
}

/* ------------------------------------------------------------------ email templates */

export function emailVariables(lang: "en" | "ar"): EmailVariable[] {
  return lang === "ar"
    ? [
        { key: "first_name", label: "الاسم الأول", sample: "سارة" },
        { key: "workspace", label: "مساحة العمل", sample: "نسق" },
        { key: "action_url", label: "رابط الإجراء", sample: "https://app.example.com/verify?token=demo" },
        { key: "invoice_total", label: "إجمالي الفاتورة", sample: "1,250.00 ر.س" },
      ]
    : [
        { key: "first_name", label: "First name", sample: "Sara" },
        { key: "workspace", label: "Workspace", sample: "Nasaq" },
        { key: "action_url", label: "Action link", sample: "https://app.example.com/verify?token=demo" },
        { key: "invoice_total", label: "Invoice total", sample: "$1,250.00" },
      ];
}

export function makeEmailTemplates(lang: "en" | "ar"): EmailTemplate[] {
  if (lang === "ar") {
    return [
      { id: "t1", name: "رسالة الترحيب", category: "welcome", status: "active", subject: "مرحبًا {{first_name}} في {{workspace}}", preheader: "ابدأ في ثلاث خطوات.", dir: "rtl", updatedAt: ago(2 * DAY), footer: "وصلتك هذه الرسالة لأنك أنشأت حسابًا في {{workspace}}.", body: "<h2>أهلًا {{first_name}}،</h2><p>يسعدنا انضمامك إلى <strong>{{workspace}}</strong>. أكمل إعداد حسابك في دقائق.</p><ol><li>أضف فريقك</li><li>اربط مصادر بياناتك</li><li>ابدأ أول محادثة</li></ol><p><a href=\"{{action_url}}\">فعّل حسابك</a></p>" },
      { id: "t2", name: "تأكيد البريد", category: "transactional", status: "active", subject: "أكّد بريدك الإلكتروني", preheader: "ينتهي الرابط خلال ٢٤ ساعة.", dir: "rtl", updatedAt: ago(9 * DAY), body: "<h2>أكّد بريدك يا {{first_name}}</h2><p>اضغط على الرابط التالي لتأكيد عنوان بريدك.</p><p><a href=\"{{action_url}}\">تأكيد البريد الإلكتروني</a></p><p>إن لم تطلب ذلك فتجاهل الرسالة.</p>" },
      { id: "t3", name: "إيصال الدفع", category: "transactional", status: "active", subject: "إيصال دفعتك: {{invoice_total}}", preheader: "شكرًا لك.", dir: "rtl", updatedAt: ago(4 * DAY), body: "<h2>شكرًا {{first_name}}</h2><p>استلمنا دفعتك بقيمة <strong>{{invoice_total}}</strong>.</p><blockquote>يمكنك تنزيل الفاتورة من صفحة الفوترة.</blockquote>" },
      { id: "t4", name: "نشرة المنتج", category: "marketing", status: "draft", subject: "جديدنا هذا الشهر", preheader: "ثلاث ميزات تستحق التجربة.", dir: "rtl", updatedAt: ago(1 * DAY), body: "<h2>جديد {{workspace}}</h2><ul><li>بحث أسرع في العقول</li><li>قوالب بريد جاهزة</li><li>محرر صفحات الهبوط</li></ul><p><a href=\"{{action_url}}\">جرّبها الآن</a></p>" },
      { id: "t5", name: "تنبيه أمني", category: "notification", status: "active", subject: "تسجيل دخول جديد إلى حسابك", preheader: "هل كان هذا أنت؟", dir: "rtl", updatedAt: ago(20 * DAY), body: "<h3>تسجيل دخول جديد</h3><p>لاحظنا تسجيل دخول جديد يا {{first_name}}. إن لم تكن أنت فغيّر كلمة المرور فورًا.</p>" },
    ];
  }
  return [
    { id: "t1", name: "Welcome", category: "welcome", status: "active", subject: "Welcome to {{workspace}}, {{first_name}}", preheader: "Get going in three steps.", dir: "ltr", updatedAt: ago(2 * DAY), footer: "You received this because you created an account on {{workspace}}.", body: "<h2>Hi {{first_name}},</h2><p>We are glad you joined <strong>{{workspace}}</strong>. Finish setting up in a few minutes.</p><ol><li>Add your team</li><li>Connect your data sources</li><li>Start your first chat</li></ol><p><a href=\"{{action_url}}\">Activate your account</a></p>" },
    { id: "t2", name: "Verify email", category: "transactional", status: "active", subject: "Confirm your email address", preheader: "The link expires in 24 hours.", dir: "ltr", updatedAt: ago(9 * DAY), body: "<h2>Confirm your email, {{first_name}}</h2><p>Select the link below to confirm your address.</p><p><a href=\"{{action_url}}\">Confirm email address</a></p><p>If you did not ask for this, ignore this message.</p>" },
    { id: "t3", name: "Payment receipt", category: "transactional", status: "active", subject: "Your receipt for {{invoice_total}}", preheader: "Thank you.", dir: "ltr", updatedAt: ago(4 * DAY), body: "<h2>Thank you, {{first_name}}</h2><p>We received your payment of <strong>{{invoice_total}}</strong>.</p><blockquote>Download the invoice from your billing page.</blockquote>" },
    { id: "t4", name: "Product newsletter", category: "marketing", status: "draft", subject: "What is new this month", preheader: "Three features worth a look.", dir: "ltr", updatedAt: ago(1 * DAY), body: "<h2>New in {{workspace}}</h2><ul><li>Faster search across brains</li><li>Ready-made email templates</li><li>A landing page editor</li></ul><p><a href=\"{{action_url}}\">Try them now</a></p>" },
    { id: "t5", name: "Security alert", category: "notification", status: "active", subject: "New sign-in to your account", preheader: "Was this you?", dir: "ltr", updatedAt: ago(20 * DAY), body: "<h3>New sign-in</h3><p>We noticed a new sign-in, {{first_name}}. If this was not you, change your password now.</p>" },
  ];
}

export function EmailTemplatesPage({ defaultSelectedId }: { defaultSelectedId?: string } = {}) {
  const ar = useAr();
  const lang = ar ? "ar" : "en";
  const [templates, setTemplates] = useState(() => makeEmailTemplates(lang));
  return (
    <FlowPage
      title={ar ? "قوالب البريد" : "Email templates"}
      description={ar ? "صمّم الرسائل التي يرسلها تطبيقك مرة واحدة وأعد استخدامها." : "Design the messages your app sends once and reuse them everywhere."}
      actions={<Badge variant="neutral">{ar ? "٥ قوالب" : "5 templates"}</Badge>}
    >
      <EmailTemplates
        templates={templates}
        variables={emailVariables(lang)}
        defaultSelectedId={defaultSelectedId}
        sender={{ name: ar ? "فريق نسق" : "The Nasaq team", email: "hello@nasaq.example" }}
        recipient="sara@example.com"
        onSave={async (tpl) => {
          await wait(600);
          setTemplates((all) => (all.some((x) => x.id === tpl.id) ? all.map((x) => (x.id === tpl.id ? { ...tpl, updatedAt: new Date() } : x)) : [{ ...tpl, updatedAt: new Date() }, ...all]));
        }}
        onDuplicate={async (tpl) => {
          await wait(400);
          setTemplates((all) => [{ ...tpl, id: `copy-${Date.now()}`, name: `${tpl.name} (${ar ? "نسخة" : "copy"})`, status: "draft", updatedAt: new Date() }, ...all]);
        }}
        onDelete={async (tpl) => {
          await wait(400);
          setTemplates((all) => all.filter((x) => x.id !== tpl.id));
        }}
        onSendTest={async (_tpl, email) => {
          await wait(800);
          if (email.startsWith("fail")) return { error: ar ? "تعذّر إرسال البريد التجريبي." : "Could not send the test email." };
        }}
      />
    </FlowPage>
  );
}

/* ------------------------------------------------------------------ landing page */

export function makeLandingPage(lang: "en" | "ar"): LandingPage {
  const en = lang === "en";
  const hero = createSection("hero", lang);
  hero.data = {
    eyebrow: en ? "New: shared team memory" : "جديد: ذاكرة مشتركة للفريق",
    headline: en ? "Give your team a brain that remembers" : "امنح فريقك عقلًا لا ينسى",
    subheadline: en ? "Connect your docs, chats and tickets. Ask anything and get an answer with its source." : "اربط وثائقك ومحادثاتك وتذاكرك. اسأل عن أي شيء وستصلك إجابة مع مصدرها.",
    primaryLabel: en ? "Start free" : "ابدأ مجانًا",
    primaryHref: "/signup",
    secondaryLabel: en ? "Book a demo" : "احجز عرضًا",
    secondaryHref: "/demo",
    align: "center",
  };
  const features = createSection("features", lang);
  features.data = {
    title: en ? "Built for how teams really work" : "مصمم لطريقة عمل الفرق الفعلية",
    subtitle: en ? "" : "",
    items: [
      { id: "f1", title: en ? "Answers with sources" : "إجابات مع مصادرها", description: en ? "Every answer links back to the note or document it came from." : "كل إجابة ترتبط بالملاحظة أو الوثيقة التي جاءت منها." },
      { id: "f2", title: en ? "Connects to your tools" : "يرتبط بأدواتك", description: en ? "Sync drives, wikis and help desks without copy and paste." : "زامن المستودعات والويكي ومراكز الدعم دون نسخ ولصق." },
      { id: "f3", title: en ? "Private by default" : "خاص افتراضيًا", description: en ? "Choose who can read, teach and ask for each brain." : "حدّد من يقرأ ومن يعلّم ومن يسأل في كل عقل." },
    ],
  };
  const faq = createSection("faq", lang);
  faq.data = {
    title: en ? "Questions, answered" : "أسئلتكم وإجاباتها",
    items: [
      { id: "q1", question: en ? "Can I try it for free?" : "هل يمكنني التجربة مجانًا؟", answer: en ? "Yes. The free plan includes one brain and 500 memories." : "نعم. الخطة المجانية تشمل عقلًا واحدًا و٥٠٠ ذكرى." },
      { id: "q2", question: en ? "Where is my data stored?" : "أين تُخزَّن بياناتي؟", answer: en ? "In your chosen region, encrypted at rest." : "في المنطقة التي تختارها، ومشفّرة أثناء التخزين." },
    ],
  };
  const cta = createSection("cta", lang);
  return {
    title: en ? "Zekra launch page" : "صفحة إطلاق زكرى",
    slug: en ? "zekra-launch" : "zekra-launch",
    seoTitle: en ? "Zekra: a shared memory for your team" : "زكرى: ذاكرة مشتركة لفريقك",
    seoDescription: en ? "Connect your docs and chats and ask your team's brain anything." : "اربط وثائقك ومحادثاتك واسأل عقل فريقك عن أي شيء.",
    dir: en ? "ltr" : "rtl",
    status: "draft",
    sections: [hero, features, faq, cta],
  };
}

export function LandingEditorPage() {
  const ar = useAr();
  const [page, setPage] = useState(() => makeLandingPage(ar ? "ar" : "en"));
  return (
    <FlowPage
      title={ar ? "صفحات الهبوط" : "Landing pages"}
      description={ar ? "ابنِ الصفحة من أقسام جاهزة وشاهدها مباشرة قبل النشر." : "Build the page from ready sections and watch it live before you publish."}
    >
      <LandingPageEditor
        value={page}
        onValueChange={setPage}
        onSave={async () => wait(600)}
        onPublish={async () => wait(900)}
      />
    </FlowPage>
  );
}
