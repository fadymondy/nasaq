import {
  Badge,
  NasaqProvider,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuFeatured,
  NavigationMenuItem,
  NavigationMenuLabel,
  NavigationMenuLayout,
  NavigationMenuLink,
  NavigationMenuLinkItem,
  NavigationMenuLinkList,
  NavigationMenuList,
  NavigationMenuTrigger,
  useNasaq,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart3, BookOpen, LifeBuoy, Newspaper, Rocket, ShieldCheck, Users, Workflow } from "lucide-react";
import type { ReactNode } from "react";

const meta = { title: "Components/Navigation/Navigation Menu", component: NavigationMenu, parameters: { layout: "padded" } } satisfies Meta<typeof NavigationMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

const COPY = {
  en: {
    label: "Main",
    product: "Product",
    resources: "Resources",
    pricing: "Pricing",
    company: "Company",
    features: "Features",
    automation: ["Automation", "Rules that move work along without you."],
    analytics: ["Analytics", "Dashboards for time, cost and delivery."],
    security: ["Security", "Roles, audit log and single sign-on."],
    teams: ["Teams", "Shared boards for every department."],
    docs: ["Documentation", "Guides, API reference and recipes."],
    blog: ["Blog", "Product news and engineering notes."],
    support: ["Support", "Talk to a person, any day of the week."],
    featuredBadge: "New",
    featuredTitle: "Nasaq 2.0 is here",
    featuredText: "A new design system for Arabic-first products.",
    about: "About us",
  },
  ar: {
    label: "الرئيسية",
    product: "المنتج",
    resources: "المصادر",
    pricing: "الأسعار",
    company: "الشركة",
    features: "الميزات",
    automation: ["الأتمتة", "قواعد تُنجز العمل عنك."],
    analytics: ["التحليلات", "لوحات للوقت والتكلفة والتسليم."],
    security: ["الأمان", "الأدوار وسجل التدقيق وتسجيل الدخول الموحد."],
    teams: ["الفرق", "لوحات مشتركة لكل إدارة."],
    docs: ["التوثيق", "أدلة ومرجع الواجهات ووصفات جاهزة."],
    blog: ["المدونة", "أخبار المنتج وملاحظات هندسية."],
    support: ["الدعم", "تحدث مع شخص، كل أيام الأسبوع."],
    featuredBadge: "جديد",
    featuredTitle: "وصل نسق 2.0",
    featuredText: "نظام تصميم جديد للمنتجات العربية أولًا.",
    about: "من نحن",
  },
};

/** A marketing-site header: a mega menu with a link list and a featured card, a plain list, and top-level links. */
function MarketingHeader() {
  const t = COPY[useNasaq().locale.startsWith("ar") ? "ar" : "en"];
  return (
    <NavigationMenu aria-label={t.label}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t.product}</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLayout>
              <div className="flex w-80 flex-col">
                <NavigationMenuLabel>{t.features}</NavigationMenuLabel>
                <NavigationMenuLinkList>
                  <NavigationMenuLinkItem href="#automation" icon={<Workflow />} title={t.automation[0]} description={t.automation[1]} />
                  <NavigationMenuLinkItem href="#analytics" icon={<BarChart3 />} title={t.analytics[0]} description={t.analytics[1]} />
                  <NavigationMenuLinkItem href="#security" icon={<ShieldCheck />} title={t.security[0]} description={t.security[1]} />
                  <NavigationMenuLinkItem href="#teams" icon={<Users />} title={t.teams[0]} description={t.teams[1]} />
                </NavigationMenuLinkList>
              </div>
              <NavigationMenuFeatured href="#release">
                <Rocket aria-hidden="true" className="size-6 text-muted-foreground" />
                <Badge>{t.featuredBadge}</Badge>
                <span className="text-label text-foreground">{t.featuredTitle}</span>
                <span className="text-body-sm text-muted-foreground">{t.featuredText}</span>
              </NavigationMenuFeatured>
            </NavigationMenuLayout>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>{t.resources}</NavigationMenuTrigger>
          <NavigationMenuContent className="w-72">
            <NavigationMenuLinkList>
              <NavigationMenuLinkItem href="#docs" icon={<BookOpen />} title={t.docs[0]} description={t.docs[1]} />
              <NavigationMenuLinkItem href="#blog" icon={<Newspaper />} title={t.blog[0]} description={t.blog[1]} />
              <NavigationMenuLinkItem href="#support" icon={<LifeBuoy />} title={t.support[0]} description={t.support[1]} />
            </NavigationMenuLinkList>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#pricing">{t.pricing}</NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#about">{t.about}</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function ArabicScope({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNasaq();
  return (
    <NasaqProvider target="scope" locale="ar" theme={resolvedTheme} className="contents">
      {children}
    </NasaqProvider>
  );
}

/** Hover or focus a trigger and press Down or Enter. Move between triggers: the panel resizes and slides instead of reopening. Follows the lab locale. */
export const Default: Story = { render: () => <MarketingHeader /> };

/** Arabic and RTL: the bar starts on the right, ArrowLeft moves to the next trigger, the panel aligns to its trigger's inline start. */
export const ArabicRtl: Story = {
  name: "Arabic RTL",
  render: () => (
    <ArabicScope>
      <MarketingHeader />
    </ArabicScope>
  ),
};

export const English: Story = {
  render: () => (
    <NasaqProvider target="scope" locale="en" className="contents">
      <MarketingHeader />
    </NasaqProvider>
  ),
};
