/* Shared demo data and stateful wrappers for the CRM R1 stories: contact merge and identities, score explainer, leads inbox, canned replies, campaign composer and the subscription pages. Fake data, fake waits. */
import {
  type CampaignAudience,
  CampaignComposer,
  type CampaignSendProgress,
  CannedRepliesManager,
  type CannedReply,
  type CannedSnippet,
  ContactIdentities,
  type ContactIdentity,
  type ContactChannel,
  type ContactConsent,
  ContactMerge,
  type ContactMergeOutcome,
  type ContactMergeRecord,
  type Lead,
  LeadsInbox,
  type ScoreDimension,
  SubscriptionLanding,
  type SubscriptionLandingMode,
} from "@nasaq/web";
import { useEffect, useRef, useState } from "react";
import { CrmPage } from "./_crm-demo";
import { useAr, wait } from "./_profile-demo";

const DAY = 86_400_000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3_600_000);

/* ------------------------------------------------------------------ score */

export function makeScoreDimensions(ar: boolean): ScoreDimension[] {
  return ar
    ? [
        { id: "role", label: "ملاءمة الدور", points: 28, maxPoints: 35, reason: "كلمات مفتاحية في المسمى: مدير عمليات.", matched: ["مدير", "عمليات"], sources: [{ label: "نموذج التواصل" }] },
        { id: "size", label: "حجم الشركة", points: 18, maxPoints: 25, reason: "من 51 إلى 200 موظف، حسب صفحة الشركة.", sources: [{ label: "لينكدإن", url: "https://example.com/company" }], confidence: 0.85 },
        { id: "intent", label: "نية الشراء", points: 14, maxPoints: 25, reason: "زار صفحة الأسعار مرتين هذا الأسبوع.", inferred: true, confidence: 0.6, sources: [{ label: "تحليلات الموقع", inferred: true }] },
        { id: "budget", label: "الميزانية", points: 4, maxPoints: 15, reason: "ذكر ميزانية أقل من الحد المعتاد.", matched: ["5,000"] },
      ]
    : [
        { id: "role", label: "Role fit", points: 28, maxPoints: 35, reason: "Profile keywords found: operations (in title).", matched: ["Head", "Operations"], sources: [{ label: "Contact form" }] },
        { id: "size", label: "Company size", points: 18, maxPoints: 25, reason: "51 to 200 employees, per the company page.", sources: [{ label: "LinkedIn", url: "https://example.com/company" }], confidence: 0.85 },
        { id: "intent", label: "Buying intent", points: 14, maxPoints: 25, reason: "Visited the pricing page twice this week.", inferred: true, confidence: 0.6, sources: [{ label: "Site analytics", inferred: true }] },
        { id: "budget", label: "Budget", points: 4, maxPoints: 15, reason: "Mentioned a budget below the usual range.", matched: ["5,000"] },
      ];
}

/* ------------------------------------------------------------------ merge + identities */

export function makeMergeRecords(ar: boolean): ContactMergeRecord[] {
  return ar
    ? [
        {
          id: "a",
          name: "سارة العلي",
          createdAt: ago(420),
          values: { name: "سارة العلي", email: "sara.ali@nasaq.dev", phone: "+966 50 123 4567", company: "نسق", jobTitle: "مديرة عمليات", owner: "عمر ناصر", tags: ["عميل", "مهم"] },
          stats: [{ label: "صفقات", value: 3 }, { label: "ملاحظات", value: 11 }, { label: "محادثات", value: 6 }],
          identities: [{ id: "a1", channel: "email", value: "sara.ali@nasaq.dev", primary: true }, { id: "a2", channel: "phone", value: "+966 50 123 4567", primary: true }],
          consent: { email: "granted", whatsapp: "unknown", phone: "granted" },
        },
        {
          id: "b",
          name: "سارة علي",
          createdAt: ago(35),
          values: { name: "سارة علي", email: "sara@gmail.com", phone: "+966 50 123 4567", company: "شركة نسق", jobTitle: "", owner: "ليلى حسن", tags: ["نشرة", "مهم"] },
          stats: [{ label: "صفقات", value: 0 }, { label: "ملاحظات", value: 2 }, { label: "محادثات", value: 4 }],
          identities: [{ id: "b1", channel: "email", value: "sara@gmail.com", primary: true }, { id: "b2", channel: "whatsapp", value: "+966 50 123 4567", primary: true }],
          consent: { email: "denied", whatsapp: "granted", phone: "unknown" },
        },
        {
          id: "c",
          name: "س. العلي",
          createdAt: ago(9),
          values: { name: "س. العلي", email: "sara.ali@nasaq.dev", phone: "", company: "نسق", jobTitle: "مديرة العمليات", owner: "", tags: ["فعالية"] },
          stats: [{ label: "صفقات", value: 0 }, { label: "ملاحظات", value: 0 }, { label: "محادثات", value: 1 }],
          consent: { email: "granted" },
        },
      ]
    : [
        {
          id: "a",
          name: "Sara Ali",
          createdAt: ago(420),
          values: { name: "Sara Ali", email: "sara.ali@nasaq.dev", phone: "+966 50 123 4567", company: "Nasaq", jobTitle: "Head of Operations", owner: "Omar Nasser", tags: ["Customer", "VIP"] },
          stats: [{ label: "Deals", value: 3 }, { label: "Notes", value: 11 }, { label: "Conversations", value: 6 }],
          identities: [{ id: "a1", channel: "email", value: "sara.ali@nasaq.dev", primary: true }, { id: "a2", channel: "phone", value: "+966 50 123 4567", primary: true }],
          consent: { email: "granted", whatsapp: "unknown", phone: "granted" },
        },
        {
          id: "b",
          name: "Sara A.",
          createdAt: ago(35),
          values: { name: "Sara A.", email: "sara@gmail.com", phone: "+966 50 123 4567", company: "Nasaq Inc.", jobTitle: "", owner: "Layla Hassan", tags: ["Newsletter", "VIP"] },
          stats: [{ label: "Deals", value: 0 }, { label: "Notes", value: 2 }, { label: "Conversations", value: 4 }],
          identities: [{ id: "b1", channel: "email", value: "sara@gmail.com", primary: true }, { id: "b2", channel: "whatsapp", value: "+966 50 123 4567", primary: true }],
          consent: { email: "denied", whatsapp: "granted", phone: "unknown" },
        },
        {
          id: "c",
          name: "S. Ali",
          createdAt: ago(9),
          values: { name: "S. Ali", email: "sara.ali@nasaq.dev", phone: "", company: "Nasaq", jobTitle: "Operations Head", owner: "", tags: ["Event"] },
          stats: [{ label: "Deals", value: 0 }, { label: "Notes", value: 0 }, { label: "Conversations", value: 1 }],
          consent: { email: "granted" },
        },
      ];
}

/** Merge page: pick, resolve, confirm. Shows what came out when it is done. */
export function ContactMergeDemo() {
  const ar = useAr();
  const [outcome, setOutcome] = useState<ContactMergeOutcome | null>(null);
  const [key, setKey] = useState(0);
  return (
    <CrmPage title={ar ? "دمج جهات الاتصال" : "Merge contacts"} description={ar ? "ثلاث سجلات لنفس الشخص. اختر الناجي ثم حسم كل حقل يختلف." : "Three records for the same person. Pick the survivor, then settle each field that differs."}>
      {outcome ? (
        <div role="status" className="flex flex-col gap-3 rounded-card border border-nq-success/40 bg-nq-success-soft p-4">
          <p className="text-label text-nq-success-text">{ar ? `تم الدمج في السجل ${outcome.survivorId}` : `Merged into record ${outcome.survivorId}`}</p>
          <pre dir="ltr" className="overflow-auto text-caption">{JSON.stringify(outcome.values, null, 2)}</pre>
          <button type="button" className="w-fit text-body-sm underline" onClick={() => { setOutcome(null); setKey((k) => k + 1); }}>
            {ar ? "ابدأ من جديد" : "Start over"}
          </button>
        </div>
      ) : (
        <ContactMerge
          key={`${key}-${ar}`}
          records={makeMergeRecords(ar)}
          onMerge={async (o) => {
            await wait(900);
            setOutcome(o);
          }}
        />
      )}
    </CrmPage>
  );
}

export function useIdentitiesState(ar: boolean) {
  const [identities, setIdentities] = useState<ContactIdentity[]>([
    { id: "1", channel: "email", value: "sara.ali@nasaq.dev", primary: true, verified: true },
    { id: "2", channel: "email", value: "sara@gmail.com" },
    { id: "3", channel: "phone", value: "+966 50 123 4567", primary: true },
    { id: "4", channel: "whatsapp", value: "+966 50 123 4567", primary: true, verified: true },
    { id: "5", channel: "linkedin", value: "linkedin.com/in/sara-ali", label: ar ? "الحساب المهني" : "Work profile" },
  ]);
  const [consent, setConsent] = useState<Partial<Record<ContactChannel, ContactConsent>>>({
    email: { status: "granted", at: ago(120), source: ar ? "نموذج الاشتراك" : "Signup form" },
    whatsapp: { status: "denied", at: ago(6), source: ar ? "رد STOP" : "Replied STOP" },
  });
  return { identities, setIdentities, consent, setConsent };
}

export function ContactIdentitiesDemo({ readOnly }: { readOnly?: boolean }) {
  const ar = useAr();
  const { identities, setIdentities, consent, setConsent } = useIdentitiesState(ar);
  return (
    <ContactIdentities
      readOnly={readOnly}
      identities={identities}
      consent={consent}
      onAdd={async ({ channel, value, label }) => {
        await wait(600);
        if (value.toLowerCase().includes("taken")) return { error: ar ? "هذا الحساب مرتبط بجهة اتصال أخرى." : "This account is already linked to another contact." };
        setIdentities((l) => [...l, { id: `n${Date.now()}`, channel, value, label }]);
      }}
      onRemove={async (i) => {
        await wait(400);
        setIdentities((l) => l.filter((x) => x.id !== i.id));
      }}
      onSetPrimary={async (i) => {
        await wait(300);
        setIdentities((l) => l.map((x) => (x.channel === i.channel ? { ...x, primary: x.id === i.id } : x)));
      }}
      onConsentChange={async (channel, status) => {
        await wait(400);
        setConsent((c) => ({ ...c, [channel]: { status, at: new Date(), source: ar ? "من الملف" : "From the profile" } }));
      }}
    />
  );
}

/* ------------------------------------------------------------------ canned replies */

export function makeCannedReplies(ar: boolean): CannedReply[] {
  return ar
    ? [
        { id: "1", shortcut: "شكرا", title: "شكر على التواصل", body: "أهلًا {{name}}، شكرًا لتواصلك مع {{company}}. سنرد عليك خلال يوم عمل.", uses: 42, updatedAt: ago(2) },
        { id: "2", shortcut: "اسعار", title: "قائمة الأسعار", body: "أهلًا {{name}}، هذه باقاتنا وأسعارها. أخبرني بحجم فريقك وأقترح الأنسب.", uses: 27, updatedAt: ago(9) },
        { id: "3", shortcut: "موعد", title: "حجز مكالمة", body: "يسعدني أن نتحدث يا {{name}}. أي يوم يناسبك هذا الأسبوع؟ — {{agent}}", uses: 13, updatedAt: ago(20) },
        { id: "4", shortcut: "متابعة", title: "متابعة بعد عرض", body: "أهلًا {{name}}، أتابع معك بخصوص العرض الذي أرسلناه. هل من أسئلة؟", uses: 8, updatedAt: ago(30) },
      ]
    : [
        { id: "1", shortcut: "thanks", title: "Thanks for reaching out", body: "Hi {{name}}, thanks for contacting {{company}}. We will reply within one working day.", uses: 42, updatedAt: ago(2) },
        { id: "2", shortcut: "pricing", title: "Pricing overview", body: "Hi {{name}}, here are our plans and prices. Tell me your team size and I will suggest the right one.", uses: 27, updatedAt: ago(9) },
        { id: "3", shortcut: "call", title: "Book a call", body: "Happy to talk, {{name}}. Which day works for you this week? — {{agent}}", uses: 13, updatedAt: ago(20) },
        { id: "4", shortcut: "followup", title: "Follow up after a quote", body: "Hi {{name}}, following up on the quote we sent. Any questions I can answer?", uses: 8, updatedAt: ago(30) },
      ];
}

export function CannedRepliesDemo() {
  const ar = useAr();
  const [replies, setReplies] = useState<CannedReply[]>(() => makeCannedReplies(ar));
  return (
    <CannedRepliesManager
      replies={replies}
      onSave={async (r) => {
        await wait(500);
        setReplies((list) => (list.some((x) => x.id === r.id) ? list.map((x) => (x.id === r.id ? r : x)) : [...list, r]));
      }}
      onDelete={async (r) => {
        await wait(400);
        setReplies((list) => list.filter((x) => x.id !== r.id));
      }}
    />
  );
}

/* ------------------------------------------------------------------ leads */

export function makeLeads(ar: boolean): Lead[] {
  const score = (n: number) => ({ score: n, confidence: 0.75, aiGenerated: true, dimensions: makeScoreDimensions(ar).map((d) => ({ ...d })) });
  return ar
    ? [
        { id: "l1", name: "ريم الحربي", email: "reem@almaha.sa", phone: "+966 55 010 2030", company: "شركة المها", message: "نحتاج نظام لإدارة العملاء لفريق من 40 موظفًا. هل يمكن ترتيب عرض هذا الأسبوع؟", budget: "٥٠ ألف ريال", status: "new", receivedAt: ago(0, 2), form: "طلب عرض", attribution: { gclid: "Cj0KCQjwx-Demo-AbCdEf", utmSource: "google", utmMedium: "cpc", utmCampaign: "crm-brand-ar", utmTerm: "نظام إدارة العملاء", landingPage: "/ar/crm" }, score: score(78) },
        { id: "l2", name: "فيصل الدوسري", email: "faisal@example.com", message: "أرغب بمعرفة الأسعار.", status: "contacted", receivedAt: ago(1), form: "اتصل بنا", attribution: { utmSource: "newsletter", utmMedium: "email", utmCampaign: "أغسطس", landingPage: "/ar/pricing" }, score: score(52) },
        { id: "l3", name: "هند القحطاني", email: "hind@studio.sa", company: "استوديو هند", message: "رأيت مقالكم عن الفوترة. هل تدعمون الفاتورة الإلكترونية؟", status: "qualified", receivedAt: ago(2), form: "اتصل بنا", attribution: { referrer: "https://www.google.com/", landingPage: "/ar/blog/e-invoicing" }, score: score(66) },
        { id: "l4", name: "ماجد السبيعي", email: "majed@corp.sa", company: "مجموعة السبيعي", message: "طلب تجربة للفريق المالي.", status: "converted", receivedAt: ago(6), form: "طلب عرض", attribution: { utmSource: "linkedin", utmMedium: "paid-social", utmCampaign: "finance-q3" }, contact: { id: "c1", name: "ماجد السبيعي" }, companyRef: { id: "co1", name: "مجموعة السبيعي" }, deal: { id: "d1", name: "تجربة الفريق المالي" }, score: score(84) },
        { id: "l5", name: "seo-boost", email: "buy@spam.biz", message: "Cheap backlinks!!! visit now", status: "spam", receivedAt: ago(3), form: "اتصل بنا", attribution: { referrer: "https://spam.biz/" } },
        { id: "l6", name: "نورة العتيبي", email: "noura@example.com", phone: "+966 50 777 8899", message: "هل لديكم تطبيق جوال؟", status: "new", receivedAt: ago(0, 9), form: "اتصل بنا", attribution: { utmSource: "instagram", utmMedium: "social", landingPage: "/ar" } },
      ]
    : [
        { id: "l1", name: "Reem Alharbi", email: "reem@almaha.sa", phone: "+966 55 010 2030", company: "Almaha Co.", message: "We need a CRM for a team of 40. Can we set up a demo this week?", budget: "SAR 50k", status: "new", receivedAt: ago(0, 2), form: "Request a demo", attribution: { gclid: "Cj0KCQjwx-Demo-AbCdEf", utmSource: "google", utmMedium: "cpc", utmCampaign: "crm-brand-en", utmTerm: "crm software", landingPage: "/crm" }, score: score(78) },
        { id: "l2", name: "Faisal Aldosari", email: "faisal@example.com", message: "I would like to know your pricing.", status: "contacted", receivedAt: ago(1), form: "Contact us", attribution: { utmSource: "newsletter", utmMedium: "email", utmCampaign: "august", landingPage: "/pricing" }, score: score(52) },
        { id: "l3", name: "Hind Alqahtani", email: "hind@studio.sa", company: "Hind Studio", message: "I read your article about invoicing. Do you support e-invoicing?", status: "qualified", receivedAt: ago(2), form: "Contact us", attribution: { referrer: "https://www.google.com/", landingPage: "/blog/e-invoicing" }, score: score(66) },
        { id: "l4", name: "Majed Alsubaie", email: "majed@corp.sa", company: "Alsubaie Group", message: "Trial for the finance team, please.", status: "converted", receivedAt: ago(6), form: "Request a demo", attribution: { utmSource: "linkedin", utmMedium: "paid-social", utmCampaign: "finance-q3" }, contact: { id: "c1", name: "Majed Alsubaie" }, companyRef: { id: "co1", name: "Alsubaie Group" }, deal: { id: "d1", name: "Finance team trial" }, score: score(84) },
        { id: "l5", name: "seo-boost", email: "buy@spam.biz", message: "Cheap backlinks!!! visit now", status: "spam", receivedAt: ago(3), form: "Contact us", attribution: { referrer: "https://spam.biz/" } },
        { id: "l6", name: "Noura Alotaibi", email: "noura@example.com", phone: "+966 50 777 8899", message: "Do you have a mobile app?", status: "new", receivedAt: ago(0, 9), form: "Contact us", attribution: { utmSource: "instagram", utmMedium: "social", landingPage: "/" } },
      ];
}

export function makeCannedSnippets(ar: boolean): CannedSnippet[] {
  return makeCannedReplies(ar).map(({ id, shortcut, title, body }) => ({ id, shortcut, title, body }));
}

export function LeadsInboxDemo({ defaultOpenId, loading }: { defaultOpenId?: string; loading?: boolean }) {
  const ar = useAr();
  const [leads, setLeads] = useState<Lead[]>(() => makeLeads(ar));
  return (
    <LeadsInbox
      leads={leads}
      loading={loading}
      defaultOpenId={defaultOpenId}
      canned={makeCannedSnippets(ar)}
      onStatusChange={async (lead, status) => {
        await wait(450);
        setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, status } : x)));
      }}
      onConvert={async (lead, c) => {
        await wait(900);
        setLeads((l) =>
          l.map((x) =>
            x.id === lead.id
              ? { ...x, status: "converted", contact: { id: `c-${x.id}`, name: c.contactName }, companyRef: c.company ? { id: `co-${x.id}`, name: c.company } : undefined, deal: c.deal ? { id: `d-${x.id}`, name: c.deal } : undefined }
              : x,
          ),
        );
      }}
      onReply={async () => {
        await wait(700);
      }}
    />
  );
}

/* ------------------------------------------------------------------ campaign */

export function makeAudiences(ar: boolean): CampaignAudience[] {
  return ar
    ? [
        { id: "all", label: "كل المشتركين", description: "كل من وافق على استلام الرسائل.", counts: { email: 1240, whatsapp: 610 } },
        { id: "customers", label: "العملاء", counts: { email: 312, whatsapp: 280 } },
        { id: "leads", label: "عملاء محتملون هذا الشهر", counts: { email: 88, whatsapp: 0 } },
      ]
    : [
        { id: "all", label: "All subscribers", description: "Everyone who agreed to get messages.", counts: { email: 1240, whatsapp: 610 } },
        { id: "customers", label: "Customers", counts: { email: 312, whatsapp: 280 } },
        { id: "leads", label: "Leads this month", counts: { email: 88, whatsapp: 0 } },
      ];
}

export function CampaignComposerDemo({ fake = true }: { fake?: boolean }) {
  const ar = useAr();
  const audiences = makeAudiences(ar);
  const [progress, setProgress] = useState<CampaignSendProgress | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);
  return (
    <CampaignComposer
      audiences={audiences}
      variables={[
        { key: "name", label: ar ? "الاسم" : "Name", sample: ar ? "سارة" : "Sara" },
        { key: "company", label: ar ? "الشركة" : "Company", sample: ar ? "نسق" : "Nasaq" },
        { key: "email", label: ar ? "البريد" : "Email", sample: "sara@example.com" },
      ]}
      sender={{ name: ar ? "فريق نسق" : "Team Nasaq", email: "hello@nasaq.dev" }}
      testRecipient="me@nasaq.dev"
      defaultValue={{
        channel: "email",
        audienceId: "all",
        subject: ar ? "جديد في نسق هذا الشهر" : "What is new at Nasaq this month",
        body: ar ? "<p>أهلًا {{name}}،</p><p>أضفنا هذا الشهر مركزًا جديدًا للعملاء المحتملين مع تتبع المصدر.</p>" : "<p>Hi {{name}},</p><p>This month we added a leads inbox that tracks where each inquiry came from.</p>",
      }}
      onCountAudience={
        fake
          ? async (id, channel) => {
              await wait(700);
              return audiences.find((a) => a.id === id)?.counts?.[channel] ?? 0;
            }
          : undefined
      }
      onSendTest={async (_draft, to) => {
        await wait(800);
        if (to.includes("bad")) return { error: ar ? "رفض الخادم هذا العنوان." : "The server rejected this address." };
      }}
      progress={progress}
      onStopSending={() => {
        if (timer.current) clearInterval(timer.current);
        setProgress(null);
      }}
      onSend={async () => {
        await wait(500);
        const total = 1240;
        setProgress({ sent: 0, failed: 0, total });
        timer.current = setInterval(() => {
          setProgress((p) => {
            if (!p) return p;
            const step = 90;
            const next = Math.min(p.total, p.sent + p.failed + step);
            const failed = next >= p.total ? 4 : Math.floor(next / 400);
            if (next >= p.total && timer.current) clearInterval(timer.current);
            return { ...p, sent: next - failed, failed };
          });
        }, 350);
      }}
    />
  );
}

export function SubscriptionDemo({ mode }: { mode: SubscriptionLandingMode }) {
  const ar = useAr();
  return (
    <div className="min-h-screen bg-background">
      <SubscriptionLanding
        key={`${mode}-${ar}`}
        mode={mode}
        brand={ar ? "نسق" : "Nasaq"}
        email="sara.ali@nasaq.dev"
        askName
        onSubscribe={async ({ email }) => {
          await wait(800);
          if (email.startsWith("fail")) return { error: ar ? "تعذّر الاشتراك الآن." : "We could not subscribe you right now." };
        }}
        onConfirm={async () => {
          await wait(700);
        }}
        onUnsubscribe={async () => {
          await wait(700);
        }}
        onResubscribe={async () => {
          await wait(600);
        }}
      />
    </div>
  );
}
