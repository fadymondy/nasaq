/* Shared demo data and wrappers for the public profile and blog stories (Batch X5). Fake people, fake posts. */
import {
  BlogIndex,
  BlogPost,
  type BlogPostData,
  type BlogPostSummary,
  type BlogAuthor,
  ProfilePage,
  type ProfileData,
  useNasaq,
} from "@nasaq/web";

export const useAr5 = () => useNasaq().locale.startsWith("ar");

const NOW = Date.UTC(2026, 8, 30, 9, 0);
const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

export const AUTHOR_EN: BlogAuthor = {
  name: "Layla Haddad",
  role: "Design engineer",
  bio: "Builds design systems and writes about the small decisions that make interfaces feel calm.",
};
export const AUTHOR_AR: BlogAuthor = {
  name: "ليلى حداد",
  role: "مهندسة تصميم",
  bio: "تبني أنظمة التصميم وتكتب عن القرارات الصغيرة التي تجعل الواجهات هادئة.",
};

const BODY_EN = `Good interfaces are mostly made of decisions nobody notices. This post walks through the ones we made for a design system that has to work in English and Arabic from day one.

## Start with the constraints

A design system is a set of promises. Before writing a single component, write down what you promise to every screen that will use it.

> [!NOTE]
> Promises are cheaper to keep when there are few of them. We started with four: logical layout, real focus states, no hard-coded colors, and text that survives translation.

### Logical, not physical

Use \`margin-inline-start\` where you once used \`margin-left\`. The browser flips it for right-to-left languages, so there is nothing to test twice.

\`\`\`css
.card {
  padding-inline: 1rem;
  border-inline-start: 2px solid var(--nq-accent);
}
\`\`\`

## Tokens carry the theme

Colors, radii and spacing live in variables. A component never says a color, it says a role.

\`\`\`tsx
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span data-tone={tone} className="badge">{children}</span>;
}
\`\`\`

> [!TIP]
> When two roles look identical, merge them. Fewer roles mean fewer places for the theme to drift.

### Dark mode for free

If every surface reads from a role, dark mode is a second table of values, not a second stylesheet.

## What we would do differently

We wrote the Arabic strings last, and it showed. Long words wrapped badly and one button clipped.

> [!WARNING]
> Never size a button to its English label. Let it grow, and cap it with a max width instead.

## A short checklist

- Read every screen in a right-to-left browser before you ship.
- Tab through it once with the keyboard.
- Switch the theme and look for anything that does not move.

Ship the boring parts well and people will call the result "polished" without knowing why.`;

const BODY_AR = `الواجهات الجيدة تتكون في معظمها من قرارات لا يلاحظها أحد. يستعرض هذا المقال القرارات التي اتخذناها لنظام تصميم يجب أن يعمل بالعربية والإنجليزية منذ اليوم الأول.

## ابدأ بالقيود

نظام التصميم مجموعة وعود. قبل كتابة أي مكوّن، دوّن ما تعد به كل شاشة ستستخدمه.

> [!NOTE]
> الوعود أرخص في الوفاء بها حين تكون قليلة. بدأنا بأربعة: تخطيط منطقي، حالات تركيز حقيقية، لا ألوان مكتوبة يدويًا، ونص يصمد أمام الترجمة.

### منطقي لا فيزيائي

استخدم \`margin-inline-start\` حيث كنت تستخدم \`margin-left\`. يقلبها المتصفح للغات التي تُكتب من اليمين، فلا شيء يحتاج اختبارًا مرتين.

\`\`\`css
.card {
  padding-inline: 1rem;
  border-inline-start: 2px solid var(--nq-accent);
}
\`\`\`

## الرموز تحمل السمة

الألوان والزوايا والمسافات تعيش في متغيرات. المكوّن لا يقول لونًا، بل يقول دورًا.

\`\`\`tsx
export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span data-tone={tone} className="badge">{children}</span>;
}
\`\`\`

> [!TIP]
> إذا بدا دوران متطابقين فادمجهما. أدوار أقل تعني أماكن أقل تنحرف فيها السمة.

### الوضع الداكن مجانًا

إذا كان كل سطح يقرأ من دور، فالوضع الداكن جدول قيم ثانٍ لا ورقة أنماط ثانية.

## ما الذي سنفعله بشكل مختلف

كتبنا النصوص العربية أخيرًا، وظهر ذلك. التفّت الكلمات الطويلة بشكل سيئ وانقطع أحد الأزرار.

> [!WARNING]
> لا تحدد عرض الزر بحسب نصه الإنجليزي. دعه ينمو وضع له حدًا أقصى بدلًا من ذلك.

## قائمة قصيرة

- اقرأ كل شاشة في متصفح يكتب من اليمين قبل الإطلاق.
- تنقّل فيها مرة بلوحة المفاتيح.
- بدّل السمة وابحث عن أي شيء لم يتغير.

أتقن الأجزاء المملة وسيصف الناس النتيجة بأنها متقنة دون أن يعرفوا السبب.`;

type Seed = { slug: string; en: [string, string]; ar: [string, string]; category: [string, string]; tags: [string[], string[]]; ago: number; min: number; featured?: boolean };

const SEEDS: Seed[] = [
  { slug: "calm-interfaces", en: ["Designing calm interfaces in two languages", "How logical layout, roles and honest focus states keep a system steady in English and Arabic."], ar: ["تصميم واجهات هادئة بلغتين", "كيف يحافظ التخطيط المنطقي والأدوار وحالات التركيز الصادقة على استقرار النظام بالعربية والإنجليزية."], category: ["Design", "تصميم"], tags: [["rtl", "tokens", "a11y"], ["rtl", "رموز", "وصولية"]], ago: 3, min: 7, featured: true },
  { slug: "tokens-not-colors", en: ["Tokens, not colors", "Why a component should name a role and let the theme decide the rest."], ar: ["رموز لا ألوان", "لماذا يجب أن يسمّي المكوّن دورًا ويترك الباقي للسمة."], category: ["Design", "تصميم"], tags: [["tokens", "theming"], ["رموز", "سمات"]], ago: 12, min: 5 },
  { slug: "focus-states", en: ["Focus states people can see", "A short tour of rings, offsets and the cases where the default outline fails."], ar: ["حالات تركيز يراها الناس", "جولة قصيرة في الحلقات والإزاحات والحالات التي يفشل فيها الإطار الافتراضي."], category: ["Accessibility", "الوصولية"], tags: [["a11y", "keyboard"], ["وصولية", "لوحة المفاتيح"]], ago: 21, min: 4 },
  { slug: "rsc-patterns", en: ["Server components without the confusion", "Three patterns that keep the client bundle small and the mental model simple."], ar: ["مكونات الخادم دون التباس", "ثلاثة أنماط تُبقي حزمة العميل صغيرة والنموذج الذهني بسيطًا."], category: ["Engineering", "هندسة"], tags: [["react", "performance"], ["ريأكت", "أداء"]], ago: 34, min: 9 },
  { slug: "forms-that-forgive", en: ["Forms that forgive", "Validation timing, error copy and the small kindnesses that raise completion rates."], ar: ["نماذج تسامح", "توقيت التحقق ونص الأخطاء واللطف الصغير الذي يرفع نسب الإكمال."], category: ["Design", "تصميم"], tags: [["forms", "ux"], ["نماذج", "تجربة"]], ago: 48, min: 6 },
  { slug: "typing-the-design-system", en: ["Typing a design system", "Props that are hard to misuse: unions, defaults and the escape hatches worth keeping."], ar: ["كتابة الأنواع لنظام تصميم", "خصائص يصعب إساءة استخدامها: الاتحادات والقيم الافتراضية ومخارج الطوارئ التي تستحق البقاء."], category: ["Engineering", "هندسة"], tags: [["typescript", "api"], ["تايب سكريبت", "واجهة"]], ago: 60, min: 8 },
  { slug: "motion-with-restraint", en: ["Motion with restraint", "When to animate, how long, and how to honor reduced motion."], ar: ["حركة بضبط", "متى تحرّك وكم المدة وكيف تحترم تقليل الحركة."], category: ["Design", "تصميم"], tags: [["motion", "a11y"], ["حركة", "وصولية"]], ago: 75, min: 5 },
  { slug: "tables-at-scale", en: ["Tables at scale", "Virtual rows, sticky headers and keeping keyboard navigation honest."], ar: ["جداول بحجم كبير", "صفوف افتراضية ورؤوس ثابتة وإبقاء التنقل بلوحة المفاتيح صادقًا."], category: ["Engineering", "هندسة"], tags: [["tables", "performance", "a11y"], ["جداول", "أداء", "وصولية"]], ago: 90, min: 10 },
  { slug: "writing-for-ui", en: ["Writing for interfaces", "Buttons that say what they do, and errors that say what to try next."], ar: ["الكتابة للواجهات", "أزرار تقول ما تفعله، وأخطاء تقول ما يمكن تجربته بعد ذلك."], category: ["Writing", "كتابة"], tags: [["copy", "ux"], ["نص", "تجربة"]], ago: 110, min: 4 },
  { slug: "dark-mode-notes", en: ["Notes on dark mode", "Elevation, contrast and the gray that is never quite right."], ar: ["ملاحظات عن الوضع الداكن", "الارتفاع والتباين والرمادي الذي لا يكون صحيحًا تمامًا."], category: ["Design", "تصميم"], tags: [["theming", "tokens"], ["سمات", "رموز"]], ago: 130, min: 6 },
];

export function demoPosts(ar: boolean): BlogPostSummary[] {
  const author = ar ? AUTHOR_AR : AUTHOR_EN;
  return SEEDS.map((s) => ({
    slug: s.slug,
    title: ar ? s.ar[0] : s.en[0],
    excerpt: ar ? s.ar[1] : s.en[1],
    category: ar ? s.category[1] : s.category[0],
    tags: ar ? s.tags[1] : s.tags[0],
    date: day(s.ago),
    author,
    readingMinutes: s.min,
    featured: s.featured,
  }));
}

export function demoPost(ar: boolean, slug = "calm-interfaces"): BlogPostData {
  const summary = demoPosts(ar).find((p) => p.slug === slug) ?? demoPosts(ar)[0];
  return { ...summary, body: ar ? BODY_AR : BODY_EN, updated: day(1), readingMinutes: undefined };
}

export function BlogIndexDemo({ empty }: { empty?: boolean }) {
  const ar = useAr5();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 @container">
      <BlogIndex
        posts={empty ? [] : demoPosts(ar)}
        title={ar ? "المدونة" : "Blog"}
        description={ar ? "ملاحظات عن التصميم والهندسة وبناء المنتجات." : "Notes on design, engineering and building products."}
        postHref={(p) => `#${p.slug}`}
      />
    </div>
  );
}

export function BlogPostDemo() {
  const ar = useAr5();
  const posts = demoPosts(ar);
  const post = demoPost(ar);
  return (
    <BlogPost
      post={post}
      posts={posts}
      url="https://example.com/blog/calm-interfaces"
      postHref={(p) => `#${p.slug}`}
      tagHref={(t) => `#tag-${t}`}
      backHref="#blog"
      comments={
        <div className="rounded-card border border-dashed border-border p-6 text-center text-body-sm text-muted-foreground">
          {ar ? "منطقة التعليقات: ضع هنا مكوّن التعليقات." : "Comments slot: render your comment thread here."}
        </div>
      }
    />
  );
}

export function profileData(ar: boolean): ProfileData {
  return {
    name: ar ? "ليلى حداد" : "Layla Haddad",
    handle: "@laylah",
    joined: "2023-01-14",
    headline: ar
      ? "مهندسة تصميم أبني أنظمة تصميم ثنائية اللغة ومنتجات ويب سريعة ويسهل الوصول إليها."
      : "Design engineer building bilingual design systems and fast, accessible web products.",
    location: ar ? "الرياض، السعودية" : "Riyadh, Saudi Arabia",
    timeZone: "Asia/Riyadh",
    availability: "open",
    availabilityNote: ar ? "متاحة لمشاريع جديدة من نوفمبر" : "Open to new projects from November",
    email: "hello@example.com",
    cvHref: "#cv",
    about: ar
      ? "أعمل على الحد الفاصل بين التصميم والكود منذ أكثر من عشر سنوات. أحب المكوّنات الصغيرة المتقنة، والنصوص الواضحة، والأنظمة التي تعمل من اليمين إلى اليسار كما تعمل من اليسار إلى اليمين.\n\nأقود حاليًا فريق نظام التصميم في شركة تقنية مالية، وأكتب وأتحدث عن الوصولية والأداء."
      : "I have worked on the line between design and code for more than ten years. I like small, well-made components, clear writing, and systems that work right to left as well as they work left to right.\n\nToday I lead the design-system team at a fintech company, and I write and speak about accessibility and performance.",
    links: [
      { kind: "github", label: "GitHub", href: "https://github.com", handle: "@laylah" },
      { kind: "linkedin", label: "LinkedIn", href: "https://linkedin.com", handle: "in/laylah" },
      { kind: "x", label: "X", href: "https://x.com", handle: "@laylah" },
      { kind: "email", label: ar ? "البريد" : "Email", href: "mailto:hello@example.com" },
      { kind: "website", label: ar ? "الموقع" : "Website", href: "https://example.com" },
    ],
    experience: [
      {
        id: "e1",
        role: ar ? "قائدة نظام التصميم" : "Design system lead",
        company: ar ? "مدفوعات ألف" : "Alif Payments",
        location: ar ? "الرياض" : "Riyadh",
        start: "2023-02-01",
        summary: ar ? "أقود فريقًا من خمسة يبني مكتبة المكوّنات وأدوات التصميم." : "Leading a team of five that builds the component library and design tooling.",
        highlights: ar ? ["خفّضت حجم حزمة الواجهة 38٪", "أطلقت دعم اليمين إلى اليسار في 40 شاشة"] : ["Cut the UI bundle by 38%", "Shipped right-to-left support across 40 screens"],
        skills: ["React", "TypeScript", "Storybook"],
      },
      {
        id: "e2",
        role: ar ? "مهندسة واجهات أولى" : "Senior front-end engineer",
        company: ar ? "متجر نخلة" : "Nakhla Market",
        location: ar ? "جدة" : "Jeddah",
        start: "2019-06-01",
        end: "2023-01-31",
        summary: ar ? "قدت إعادة بناء المتجر وتحسين الأداء." : "Led the storefront rebuild and performance work.",
        skills: ["Next.js", "GraphQL", "Playwright"],
      },
      {
        id: "e3",
        role: ar ? "مصممة واجهات" : "Interface designer",
        company: ar ? "استوديو حبر" : "Hibr Studio",
        start: "2015-09-01",
        end: "2019-05-31",
      },
    ],
    skills: [
      { name: "React", group: ar ? "الواجهات" : "Front end", level: 5 },
      { name: "TypeScript", group: ar ? "الواجهات" : "Front end", level: 5 },
      { name: "CSS", group: ar ? "الواجهات" : "Front end", level: 5 },
      { name: ar ? "الوصولية" : "Accessibility", group: ar ? "الواجهات" : "Front end", level: 4 },
      { name: "Figma", group: ar ? "التصميم" : "Design", level: 4 },
      { name: ar ? "أنظمة التصميم" : "Design systems", group: ar ? "التصميم" : "Design", level: 5 },
      { name: ar ? "الكتابة" : "Writing", group: ar ? "التصميم" : "Design", level: 3 },
      { name: "Node.js", group: ar ? "الخادم" : "Back end", level: 3 },
      { name: "PostgreSQL", group: ar ? "الخادم" : "Back end", level: 3 },
    ],
    projects: [
      {
        slug: "alif-ui",
        title: "Alif UI",
        description: ar ? "مكتبة مكوّنات ثنائية اللغة مع رموز ووثائق حية وأكثر من 80 مكوّنًا." : "A bilingual component library with tokens, live docs and more than 80 components.",
        category: ar ? "منتج" : "Product",
        featured: true,
        href: "https://example.com",
        points: ar ? ["ثنائية الاتجاه من الأساس", "اختبارات وصولية آلية", "سمات بلا أكواد ألوان"] : ["Bidirectional from the ground up", "Automated accessibility tests", "Themes without a single hex code"],
      },
      { slug: "nakhla", title: ar ? "متجر نخلة" : "Nakhla storefront", description: ar ? "إعادة بناء متجر بأداء أسرع بثلاث مرات." : "A storefront rebuild that loads three times faster.", category: ar ? "منتج" : "Product", tags: ["Next.js", "GraphQL"], href: "https://example.com" },
      { slug: "rtl-lint", title: "rtl-lint", description: ar ? "قاعدة فحص تمنع الخصائص الفيزيائية في CSS." : "A lint rule that blocks physical CSS properties.", category: ar ? "مفتوح المصدر" : "Open source", tags: ["Node.js"], repoHref: "https://github.com" },
      { slug: "focus-kit", title: "focus-kit", description: ar ? "حلقات تركيز وإدارة تركيز صغيرة للتطبيقات." : "Small focus rings and focus management for apps.", category: ar ? "مفتوح المصدر" : "Open source", tags: ["TypeScript"], repoHref: "https://github.com" },
    ],
    posts: demoPosts(ar).slice(0, 3),
    testimonials: [
      { quote: ar ? "ليلى تجعل الصعب يبدو بسيطًا. اعتمد فريقنا كله على مكتبتها في أسبوعين." : "Layla makes hard things look simple. Our whole team was on her library within two weeks.", name: ar ? "منى القحطاني" : "Muna Alqahtani", role: ar ? "مديرة المنتج" : "Product director" },
      { quote: ar ? "أدق شخص قابلته في التفاصيل، وأكثرهم لطفًا في المراجعات." : "The most precise person I have met with details, and the kindest in reviews.", name: ar ? "يوسف البدر" : "Yusuf Albadr", role: ar ? "مهندس أول" : "Staff engineer" },
    ],
    stats: [
      { label: ar ? "سنوات الخبرة" : "Years of experience", value: 11, suffix: "+" },
      { label: ar ? "مشاريع" : "Projects shipped", value: 42 },
      { label: ar ? "نجوم على GitHub" : "GitHub stars", value: 12400, compact: true },
    ],
    now: [
      { label: ar ? "أبني" : "Building", text: ar ? "مكوّن جدول بيانات افتراضي" : "A virtualized data table" },
      { label: ar ? "أقرأ" : "Reading", text: ar ? "كتاب «المنتج الجيد» لدييتر رامس" : "Dieter Rams: As Little Design As Possible" },
      { label: ar ? "أتعلم" : "Learning", text: ar ? "العزف على العود" : "The oud" },
    ],
    nowUpdated: day(6),
    weather: { city: ar ? "الرياض" : "Riyadh", temperature: 34, condition: "clear", high: 38, low: 26 },
  };
}

export function ProfilePageDemo() {
  const ar = useAr5();
  return <ProfilePage profile={profileData(ar)} now={NOW} postHref={(p) => `#${p.slug}`} blogHref="#blog" onContact={() => {}} />;
}
