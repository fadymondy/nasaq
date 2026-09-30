import { BRAND_KEYS } from "@nasaq/brands";
import { Badge, Button, CodeBlock, ProductMark, Text } from "@nasaq/web";
import { storyHref } from "./nav";

/** The top of the Introduction: what it is in one glance, a copyable first command and an Arabic sample. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="mb-10 flex flex-col gap-6 border-b border-border pb-10">
      <div className="flex items-center gap-4">
        <ProductMark size={56} title="Nasaq" />
        <div>
          <Text as="p" variant="display" id="hero-title" className="text-start">
            Nasaq
          </Text>
          <Text as="p" variant="body" className="text-muted-foreground">
            One product language for every surface.
          </Text>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">React 19</Badge>
        <Badge variant="outline">Base UI</Badge>
        <Badge variant="outline">Tailwind v4</Badge>
        <Badge variant="outline">shadcn registry</Badge>
        <Badge variant="outline">Arabic and RTL</Badge>
        <Badge variant="outline">{BRAND_KEYS.length} brands</Badge>
        <Badge variant="outline">MIT</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Text as="span" variant="eyebrow">
            Start in a minute
          </Text>
          <CodeBlock language="bash" code={"npx shadcn@latest add https://nasaq-ui.fadymondy.com/r/nasaq.json\nnpx shadcn@latest add https://nasaq-ui.fadymondy.com/r/button.json"} />
          <Text as="p" variant="caption" className="text-muted-foreground">
            Add the preset once, then any component by name. The <code>@nasaq</code> namespace shortens this to <code>@nasaq/button</code>.
          </Text>
        </div>
        {/* An explicit Arabic sample: always right-to-left, whatever the toolbar says. */}
        <div dir="rtl" lang="ar" className="flex flex-col gap-2 rounded-[var(--nq-radius-card)] border border-border bg-card p-4">
          <Text as="span" variant="eyebrow">
            بالعربية
          </Text>
          <Text as="p" variant="body">
            نسق نظام تصميم لواجهات المنتجات: مكوّنات، ورموز تصميم، وعشر هويّات، وقوالب صفحات كاملة. الاتجاه من اليمين إلى اليسار جزء أصيل منه، لا إضافة لاحقة.
          </Text>
          <div className="flex gap-2">
            <Button size="sm">ابدأ الآن</Button>
            <Button size="sm" variant="secondary">
              الوثائق
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <a
          href={storyHref("docs-installation-shadcn-cli--page")}
          target="_top"
          className="inline-flex h-10 items-center rounded-[var(--nq-radius-control)] bg-primary px-4 text-label text-primary-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >
          Install with the shadcn CLI
        </a>
        <a
          href={storyHref("pages-store-journey--default")}
          target="_top"
          className="inline-flex h-10 items-center rounded-[var(--nq-radius-control)] border border-border px-4 text-label outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
        >
          See a full storefront
        </a>
      </div>
    </section>
  );
}
