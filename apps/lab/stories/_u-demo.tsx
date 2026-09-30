/* Shared demo data for batch U: editor chrome, inline edit, markdown extras, quick capture, docs shell, legal page. */
import {
  Button,
  type CaptureValue,
  ContextMenuActions,
  type ContextMenuAction,
  DocsShell,
  type DocsNavNode,
  type DocsPageData,
  EditorBacklinks,
  type EditorLink,
  type EditorSaveState,
  EditorStatusBar,
  type EditorTab,
  EditorTabs,
  InlineEdit,
  type LegalDocument,
  LegalPage,
  QuickCapture,
  closeEditorTab,
  closeOtherEditorTabs,
  editorCursorAt,
  editorTextStats,
  orderEditorTabs,
  useNasaq,
} from "@nasaq/web";
import { Copy, Inbox, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export const useArU = () => useNasaq().locale.startsWith("ar");
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const pick = <T,>(ar: boolean, en: T, arValue: T): T => (ar ? arValue : en);

/* ------------------------------------------------------------------ editor chrome */

const docsEn: Record<string, { title: string; text: string }> = {
  trip: { title: "Trip plan", text: "Trip plan\n\nBook the flights by Friday.\nPack light, and remember the adapter.\n\n- Hotel near the old town\n- Train pass for three days\n" },
  ideas: { title: "Ideas", text: "Ideas\n\nA calmer inbox. Capture first, sort later.\nWrite the docs while the feature is fresh.\n" },
  review: { title: "Weekly review", text: "Weekly review\n\nShipped the tab strip. Next: backlinks and the Trip plan notes.\n" },
};
const docsAr: Record<string, { title: string; text: string }> = {
  trip: { title: "خطة الرحلة", text: "خطة الرحلة\n\nاحجز الرحلات قبل يوم الجمعة.\nخفف الأمتعة ولا تنس المحوّل.\n\n- فندق قرب البلدة القديمة\n- تذكرة قطار لثلاثة أيام\n" },
  ideas: { title: "أفكار", text: "أفكار\n\nصندوق وارد أكثر هدوءًا. التقط أولًا ورتّب لاحقًا.\nاكتب التوثيق والميزة ما زالت طازجة.\n" },
  review: { title: "المراجعة الأسبوعية", text: "المراجعة الأسبوعية\n\nأنجزنا شريط التبويبات. التالي الروابط الواردة وملاحظات خطة الرحلة.\n" },
};

function editorLinks(ar: boolean): { backlinks: EditorLink[]; related: EditorLink[] } {
  return ar
    ? {
        backlinks: [
          { id: "review", title: "المراجعة الأسبوعية", path: "يوميات", snippet: "…التالي الروابط الواردة وملاحظات خطة الرحلة." },
          { id: "ideas", title: "أفكار", path: "مسودات", snippet: "…اكتب التوثيق والميزة ما زالت طازجة." },
        ],
        related: [
          { id: "packing", title: "قائمة الأمتعة", path: "سفر" },
          { id: "budget", title: "ميزانية الرحلة", path: "مالية" },
        ],
      }
    : {
        backlinks: [
          { id: "review", title: "Weekly review", path: "Journal", snippet: "…Next: backlinks and the Trip plan notes." },
          { id: "ideas", title: "Ideas", path: "Drafts", snippet: "…Write the docs while the feature is fresh." },
        ],
        related: [
          { id: "packing", title: "Packing list", path: "Travel" },
          { id: "budget", title: "Trip budget", path: "Money" },
        ],
      };
}

/** A working editor page: tabs you can close and pin, a textarea whose cursor feeds the status bar, autosave that can fail, and backlinks. */
export function EditorChromeDemo() {
  const ar = useArU();
  const docs = ar ? docsAr : docsEn;
  const [tabs, setTabs] = useState<EditorTab[]>([{ id: "trip", title: docs.trip?.title ?? "" }, { id: "ideas", title: docs.ideas?.title ?? "" }, { id: "review", title: docs.review?.title ?? "" }]);
  const [active, setActive] = useState<string | null>("trip");
  const [texts, setTexts] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.text])));
  const [caret, setCaret] = useState({ start: 0, end: 0 });
  const [save, setSave] = useState<EditorSaveState>("saved");
  const [failNext, setFailNext] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const failRef = useRef(failNext);
  failRef.current = failNext;

  const text = active ? (texts[active] ?? "") : "";
  const stats = editorTextStats(text);
  const { line, column } = editorCursorAt(text, caret.start);
  const links = editorLinks(ar);

  const runSave = () => {
    setSave("saving");
    window.setTimeout(() => setSave(failRef.current ? "error" : "saved"), 700);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const edit = (value: string) => {
    if (!active) return;
    setTexts((t) => ({ ...t, [active]: value }));
    setTabs((ts) => ts.map((t) => (t.id === active ? { ...t, dirty: true } : t)));
    setSave("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setTabs((ts) => ts.map((t) => (t.id === active ? { ...t, dirty: false } : t)));
      runSave();
    }, 900);
  };

  const close = (id: string) => {
    const next = closeEditorTab(tabs, active, id);
    setTabs(next.tabs);
    setActive(next.activeId);
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <EditorTabs
        tabs={orderEditorTabs(tabs)}
        activeId={active}
        onSelect={setActive}
        onClose={close}
        onNew={() => {
          const id = `note-${tabs.length + 1}-${Date.now() % 1000}`;
          setTabs((t) => [...t, { id, title: pick(ar, "Untitled", "بلا عنوان") }]);
          setTexts((t) => ({ ...t, [id]: "" }));
          setActive(id);
        }}
        onPin={(id, pinned) => setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, pinned } : t)))}
        onCloseOthers={(id) => {
          const next = closeOtherEditorTabs(tabs, active, id);
          setTabs(next.tabs);
          setActive(next.activeId);
        }}
        onCloseAll={() => {
          setTabs([]);
          setActive(null);
        }}
      />
      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          {active ? (
            <textarea
              key={active}
              aria-label={pick(ar, "Document text", "نص المستند")}
              dir="auto"
              value={text}
              onChange={(e) => edit(e.target.value)}
              onSelect={(e) => setCaret({ start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd })}
              className="min-h-0 flex-1 resize-none bg-transparent p-6 text-body-lg leading-relaxed outline-none"
            />
          ) : (
            <p className="m-auto text-muted-foreground">{pick(ar, "No document open. Use + to start one.", "لا مستند مفتوح. استخدم + للبدء.")}</p>
          )}
        </main>
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-s border-border p-4 md:block">
          <EditorBacklinks backlinks={links.backlinks} related={links.related} highlight={docs.trip?.title} onOpen={(l) => tabs.some((t) => t.id === l.id) && setActive(l.id)} />
        </aside>
      </div>
      <EditorStatusBar
        words={stats.words}
        characters={stats.characters}
        line={line}
        column={column}
        selection={Math.abs(caret.end - caret.start)}
        saveState={save}
        onRetry={() => {
          setFailNext(false);
          failRef.current = false;
          runSave();
        }}
        items={
          <Button variant="ghost" size="sm" aria-pressed={failNext} onClick={() => setFailNext((v) => !v)}>
            {failNext ? pick(ar, "Next save fails: on", "فشل الحفظ التالي: مفعّل") : pick(ar, "Simulate a failed save", "محاكاة فشل الحفظ")}
          </Button>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ inline edit */

export function InlineEditDemo() {
  const ar = useArU();
  const [title, setTitle] = useState(pick(ar, "Website redesign", "إعادة تصميم الموقع"));
  const [site, setSite] = useState("https://nasaq.dev");
  const [seats, setSeats] = useState("12");
  const [about, setAbout] = useState(pick(ar, "A calm redesign of the marketing site.\nLaunch planned for October.", "إعادة تصميم هادئة للموقع التسويقي.\nالإطلاق مخطط في أكتوبر."));
  const [handle, setHandle] = useState("nasaq_team");
  return (
    <div className="flex max-w-xl flex-col gap-5 p-6">
      <InlineEdit label={pick(ar, "title", "العنوان")} value={title} required maxLength={60} displayClassName="text-h2 font-semibold" onSave={async (v) => { await sleep(500); setTitle(v); }} />
      <InlineEdit label={pick(ar, "website", "الموقع")} type="url" value={site} onSave={async (v) => { await sleep(400); setSite(v); }} />
      <InlineEdit label={pick(ar, "seats", "المقاعد")} type="number" value={seats} onSave={async (v) => { await sleep(300); setSeats(v); }} />
      <InlineEdit label={pick(ar, "description", "الوصف")} multiline rows={3} value={about} onBlurAction="none" onSave={async (v) => { await sleep(500); setAbout(v); }} />
      <InlineEdit
        label={pick(ar, "handle", "المعرّف")}
        value={handle}
        validate={(v) => (/^[a-z0-9_]+$/.test(v) ? undefined : pick(ar, "Use lowercase letters, digits and underscores.", "استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطة سفلية."))}
        onSave={async (v) => {
          await sleep(500);
          if (v === "admin") return { error: pick(ar, "That handle is taken.", "هذا المعرّف مستخدم.") };
          setHandle(v);
        }}
      />
      <p className="text-caption text-muted-foreground">{pick(ar, 'Try "admin" as the handle to see a server error.', 'جرّب "admin" كمعرّف لترى خطأ من الخادم.')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ markdown extras */

export function markdownExtrasSource(ar: boolean): string {
  if (ar)
    return `---
العنوان: تقرير الربع الثالث
tags: [مالية, تقرير]
published: 2026-09-01
draft: false
source: https://nasaq.dev/reports/q3
---

## الإيرادات حسب المدينة

| المدينة | الإيراد | النمو | الحالة |
| --- | ---: | ---: | --- |
| الرياض | 12,400 | 14% | ممتاز |
| القاهرة | 8,900 | 9% | جيد |
| دبي | 15,250 | 21% | ممتاز |
| عمّان | 3,100 | 2% | بحاجة لمتابعة |
| جدة | 9,780 | 11% | جيد |
| الدوحة | 6,540 | 7% | جيد |
| الكويت | 4,020 | -3% | بحاجة لمتابعة |
| المنامة | 2,880 | 5% | جيد |

## مثال برمجي

\`\`\`ts title="sum.ts" showLineNumbers {2}
const cities = [12400, 8900, 15250];
const total = cities.reduce((a, b) => a + b, 0);
console.log(total);
\`\`\`
`;
  return `---
title: Q3 numbers
tags: [finance, report]
published: 2026-09-01
draft: false
source: https://nasaq.dev/reports/q3
---

## Revenue by city

| City | Revenue | Growth | Status |
| --- | ---: | ---: | --- |
| Riyadh | $12,400 | 14% | Strong |
| Cairo | $8,900 | 9% | Good |
| Dubai | $15,250 | 21% | Strong |
| Amman | $3,100 | 2% | Needs attention |
| Jeddah | $9,780 | 11% | Good |
| Doha | $6,540 | 7% | Good |
| Kuwait City | $4,020 | -3% | Needs attention |
| Manama | $2,880 | 5% | Good |

## Example

\`\`\`ts title="sum.ts" showLineNumbers {2}
const cities = [12400, 8900, 15250];
const total = cities.reduce((a, b) => a + b, 0);
console.log(total);
\`\`\`
`;
}

/* ------------------------------------------------------------------ quick capture */

interface InboxItem extends CaptureValue {
  id: string;
}

/** An inbox that fills as you capture: press the shortcut, or use the button. Items have a context menu (Copy, Delete). */
export function QuickCaptureDemo({ shortcut = "Mod+Shift+K" }: { shortcut?: string | null }) {
  const ar = useArU();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [open, setOpen] = useState(false);
  const actions = (item: InboxItem): ContextMenuAction[] => [
    { id: "copy", label: pick(ar, "Copy text", "نسخ النص"), icon: <Copy />, onSelect: () => void navigator.clipboard?.writeText(item.text) },
    { id: "delete", label: pick(ar, "Delete", "حذف"), icon: <Trash2 />, danger: true, onSelect: () => setItems((l) => l.filter((x) => x.id !== item.id)) },
  ];
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3 font-semibold">{pick(ar, "Inbox", "صندوق الوارد")}</h2>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {pick(ar, "Quick capture", "التقاط سريع")}
        </Button>
      </div>
      <p className="text-body-sm text-muted-foreground">{pick(ar, "Press Ctrl+Shift+K (Cmd+Shift+K on a Mac) anywhere on this page.", "اضغط Ctrl+Shift+K (أو Cmd+Shift+K على ماك) في أي مكان بالصفحة.")}</p>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border p-8 text-muted-foreground">
          <Inbox className="size-6" />
          <span>{pick(ar, "Nothing captured yet.", "لم يُلتقط شيء بعد.")}</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <ContextMenuActions key={item.id} actions={actions(item)} render={<li tabIndex={0} className="rounded-card border border-border p-3 outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" />}>
              <p dir="auto" className="font-medium">
                {item.title}
              </p>
              <p className="mt-1 flex flex-wrap gap-2 text-caption text-muted-foreground">
                <span>{item.kind}</span>
                {item.tags.map((tag) => (
                  <bdi key={tag}>#{tag}</bdi>
                ))}
                {item.url ? (
                  <bdi dir="ltr" className="truncate">
                    {item.url}
                  </bdi>
                ) : null}
              </p>
            </ContextMenuActions>
          ))}
        </ul>
      )}
      <QuickCapture
        open={open}
        onOpenChange={setOpen}
        shortcut={shortcut}
        suggestedTags={ar ? ["فكرة", "مهمة", "قراءة"] : ["idea", "todo", "reading"]}
        destinations={[
          { id: "inbox", label: pick(ar, "Inbox", "الوارد") },
          { id: "later", label: pick(ar, "Read later", "لاحقًا") },
        ]}
        onCapture={async (capture) => {
          await sleep(500);
          if (capture.text.includes("fail")) return { error: pick(ar, "The server said no. Try again.", "رفض الخادم الطلب. حاول مرة أخرى.") };
          setItems((l) => [{ ...capture, id: `${capture.capturedAt}-${l.length}` }, ...l]);
        }}
      />
    </div>
  );
}

export function WebClipperDemo() {
  const ar = useArU();
  const [saved, setSaved] = useState<CaptureValue | null>(null);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <QuickCapture
        presentation="panel"
        page={{
          title: pick(ar, "How calm interfaces are built", "كيف تُبنى الواجهات الهادئة"),
          url: "https://example.com/blog/calm-interfaces?utm_source=feed",
          selection: pick(ar, "Every extra control competes for attention. Remove until it hurts.", "كل عنصر تحكم إضافي ينافس على الانتباه. احذف حتى يصبح الأمر مؤلمًا."),
        }}
        destinations={[
          { id: "inbox", label: pick(ar, "Inbox", "الوارد") },
          { id: "read", label: pick(ar, "Read later", "لاحقًا") },
        ]}
        suggestedTags={ar ? ["تصميم", "قراءة"] : ["design", "reading"]}
        onCapture={async (c) => {
          await sleep(500);
          setSaved(c);
        }}
      />
      {saved ? (
        <pre dir="ltr" className="overflow-auto rounded-card bg-nq-surface-2 p-3 text-caption">
          {JSON.stringify(saved, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ docs shell */

export function docsNav(ar: boolean): DocsNavNode[] {
  return [
    { id: "intro", title: pick(ar, "Introduction", "مقدمة") },
    {
      id: "start",
      title: pick(ar, "Getting started", "البدء"),
      children: [
        { id: "install", title: pick(ar, "Installation", "التثبيت") },
        { id: "theming", title: pick(ar, "Theming", "التخصيص"), children: [{ id: "tokens", title: pick(ar, "Design tokens", "رموز التصميم") }] },
        { id: "rtl", title: pick(ar, "Right-to-left", "من اليمين لليسار"), badge: pick(ar, "New", "جديد") },
      ],
    },
    {
      id: "components",
      title: pick(ar, "Components", "المكوّنات"),
      children: [
        { id: "button", title: pick(ar, "Button", "الزر") },
        { id: "inline-edit", title: pick(ar, "Inline edit", "التحرير المضمّن") },
        { id: "data-table", title: pick(ar, "Data table", "جدول البيانات") },
      ],
    },
  ];
}

const bodyEn = (title: string) => `## Overview

${title} is part of the Nasaq design system. This page explains what it is for and how to use it in a real product.

> [!NOTE]
> Every example works as pasted. Copy the page to hand it to an AI assistant.

## Usage

Import it from the package and pass the data. Keep the props small and let the defaults do the work.

\`\`\`tsx
import { Button } from "@nasaq/web";

export const Save = () => <Button>Save</Button>;
\`\`\`

### Variants

Use one primary action per view. Secondary actions stay quiet.

> [!WARNING]
> Do not recolour components with raw hex values. Use the tokens.

### Sizes

Small for dense tables, medium for forms, large for marketing pages.

## Accessibility

Every control has a visible focus ring and a name for assistive tech.

> [!TIP]
> Test with the keyboard first. If you can reach it and use it with Tab and Enter, most of the work is done.

## Next steps

Read the neighbouring pages, then try the lab.
`;

const bodyAr = (title: string) => `## نظرة عامة

${title} جزء من نظام تصميم نسق. تشرح هذه الصفحة الغرض منه وكيفية استخدامه في منتج حقيقي.

> [!NOTE]
> كل مثال يعمل كما هو. انسخ الصفحة لتسلّمها لمساعد ذكي.

## الاستخدام

استورده من الحزمة ومرّر البيانات. أبقِ الخصائص قليلة ودع القيم الافتراضية تعمل.

\`\`\`tsx
import { Button } from "@nasaq/web";

export const Save = () => <Button>حفظ</Button>;
\`\`\`

### الأنواع

استخدم إجراءً رئيسيًا واحدًا في كل عرض. الإجراءات الثانوية تبقى هادئة.

> [!WARNING]
> لا تلوّن المكوّنات بقيم سداسية مباشرة. استخدم الرموز.

### الأحجام

صغير للجداول الكثيفة، ومتوسط للنماذج، وكبير للصفحات التسويقية.

## إمكانية الوصول

لكل عنصر تحكم إطار تركيز ظاهر واسم للتقنيات المساعدة.

> [!TIP]
> جرّب بلوحة المفاتيح أولًا. إن استطعت الوصول إليه واستخدامه بـ Tab وEnter فقد أنجزت معظم العمل.

## الخطوات التالية

اقرأ الصفحات المجاورة ثم جرّب المختبر.
`;

export function docsPage(ar: boolean, id: string): DocsPageData {
  const all = docsNav(ar);
  const find = (nodes: DocsNavNode[]): DocsNavNode | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const c = n.children ? find(n.children) : undefined;
      if (c) return c;
    }
  };
  const node = find(all);
  const title = node?.title ?? id;
  return {
    id,
    title,
    description: pick(ar, "What it is, when to use it and how it behaves.", "ما هو ومتى تستخدمه وكيف يتصرف."),
    markdown: ar ? bodyAr(title) : bodyEn(title),
    updated: "2026-09-12",
    editHref: `https://github.com/fadymondy/nasaq/edit/main/docs/${id}.md`,
  };
}

export function DocsDemo() {
  const ar = useArU();
  const [id, setId] = useState("install");
  return <DocsShell nav={docsNav(ar)} page={docsPage(ar, id)} onNavigate={setId} brand={<span>{pick(ar, "Nasaq Docs", "توثيق نسق")}</span>} />;
}

/* ------------------------------------------------------------------ legal */

export function legalDocs(ar: boolean): LegalDocument[] {
  if (ar)
    return [
      {
        id: "terms",
        title: "شروط الخدمة",
        summary: "الاتفاق بينك وبين نسق عند استخدام الخدمة.",
        updated: "2026-09-01",
        effective: "2026-10-01",
        version: "3.1",
        sections: [
          { id: "acceptance", title: "قبول الشروط", body: "باستخدامك للخدمة فأنت توافق على هذه الشروط. إن لم توافق فلا تستخدم الخدمة.\n\nقد نحدّث الشروط، وسنخطرك بالتغييرات الجوهرية قبل **30 يومًا**." },
          { id: "accounts", title: "الحسابات", body: "أنت مسؤول عن أمان حسابك وعن كل نشاط يتم من خلاله.\n\n- استخدم كلمة مرور قوية\n- فعّل التحقق بخطوتين\n- أبلغنا فورًا عن أي دخول غير مصرح به" },
          { id: "payments", title: "المدفوعات", body: "تُحتسب الرسوم شهريًا أو سنويًا حسب خطتك. يمكنك الإلغاء في أي وقت ويسري الإلغاء في نهاية الفترة المدفوعة." },
          { id: "content", title: "المحتوى", body: "تحتفظ بملكية محتواك. تمنحنا ترخيصًا محدودًا لاستضافته وعرضه لك ولمن تشاركه معهم فقط." },
          { id: "termination", title: "الإنهاء", body: "يمكنك إغلاق حسابك في أي وقت. قد نعلّق الحسابات التي تخالف هذه الشروط، وسنخبرك بالسبب متى أمكن." },
          { id: "contact", title: "التواصل", body: "للاستفسار عن هذه الشروط راسلنا على `legal@nasaq.dev`." },
        ],
      },
      {
        id: "privacy",
        title: "سياسة الخصوصية",
        summary: "ما نجمعه، ولماذا، وكيف تتحكم فيه.",
        updated: "2026-08-15",
        draft: true,
        sections: [
          { id: "collect", title: "البيانات التي نجمعها", body: "نجمع ما تقدمه لنا (الاسم والبريد) وما ينتج عن الاستخدام (السجلات والإعدادات)." },
          { id: "use", title: "كيف نستخدمها", body: "نستخدمها لتشغيل الخدمة وتحسينها وحمايتها. لا نبيع بياناتك." },
          { id: "rights", title: "حقوقك", body: "يمكنك طلب نسخة من بياناتك أو تصحيحها أو حذفها في أي وقت من الإعدادات." },
        ],
      },
      {
        id: "cookies",
        title: "سياسة ملفات الارتباط",
        updated: "2026-07-02",
        sections: [{ id: "what", title: "ما هي ملفات الارتباط", body: "ملفات صغيرة تحفظ تفضيلاتك وتبقيك مسجلًا للدخول." }],
      },
    ];
  return [
    {
      id: "terms",
      title: "Terms of service",
      summary: "The agreement between you and Nasaq when you use the service.",
      updated: "2026-09-01",
      effective: "2026-10-01",
      version: "3.1",
      sections: [
        { id: "acceptance", title: "Accepting these terms", body: "By using the service you agree to these terms. If you do not agree, do not use the service.\n\nWe may update the terms and will tell you about material changes **30 days** ahead." },
        { id: "accounts", title: "Accounts", body: "You are responsible for the security of your account and for everything done through it.\n\n- Use a strong password\n- Turn on two-step verification\n- Tell us at once about any unauthorised access" },
        { id: "payments", title: "Payments", body: "Fees are charged monthly or yearly, depending on your plan. You can cancel at any time and the cancellation takes effect at the end of the paid period." },
        { id: "content", title: "Your content", body: "You keep ownership of your content. You give us a limited licence to host it and show it to you and the people you share it with." },
        { id: "termination", title: "Ending the agreement", body: "You can close your account at any time. We may suspend accounts that break these terms, and will tell you why when we can." },
        { id: "contact", title: "Contact", body: "Questions about these terms: write to `legal@nasaq.dev`." },
      ],
    },
    {
      id: "privacy",
      title: "Privacy policy",
      summary: "What we collect, why, and how you control it.",
      updated: "2026-08-15",
      draft: true,
      sections: [
        { id: "collect", title: "Data we collect", body: "What you give us (name, email) and what use produces (logs, settings)." },
        { id: "use", title: "How we use it", body: "To run, improve and protect the service. We do not sell your data." },
        { id: "rights", title: "Your rights", body: "You can ask for a copy of your data, correct it or delete it at any time from settings." },
      ],
    },
    {
      id: "cookies",
      title: "Cookie policy",
      updated: "2026-07-02",
      sections: [{ id: "what", title: "What cookies are", body: "Small files that remember your preferences and keep you signed in." }],
    },
  ];
}

export function LegalDemo(): ReactNode {
  const ar = useArU();
  const docs = legalDocs(ar);
  const [id, setId] = useState("terms");
  const doc = docs.find((d) => d.id === id) ?? (docs[0] as LegalDocument);
  return (
    <LegalPage
      document={doc}
      documents={docs.map((d) => ({ id: d.id, title: d.title }))}
      onSelectDocument={setId}
      footer={pick(ar, "Questions? Write to legal@nasaq.dev.", "أسئلة؟ راسلنا على legal@nasaq.dev.")}
    />
  );
}
