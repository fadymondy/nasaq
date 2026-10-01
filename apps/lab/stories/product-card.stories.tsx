import {
  AppGlyph,
  Badge,
  InstallButton,
  Price,
  ProductArtwork,
  ProductCard,
  ProductGrid,
  ProductList,
  ProductListItem,
  Rating,
  useNasaq,
} from "@nasaq/web";
import { frame } from "./_frame";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarCheck, CreditCard, ReceiptText, Users } from "lucide-react";

const meta = {
  title: "Components/Storefront/Product Card",
  component: ProductCard,
  args: {
    artwork: <ProductArtwork brand="zekra" />,
    name: "Zekra",
    category: "AI memory",
    description: "A memory organ for AI agents: what one session learns, the next one already knows.",
    layout: "tile",
  },
  decorators: [frame("w-80")],
} satisfies Meta<typeof ProductCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: { meta: <Rating value={4.9} count={860} />, price: <Price amount={9} period="month" />, action: <InstallButton appName="Zekra" /> },
};

/** Names and taglines from each product's landing. Prices, ratings and install counts are illustrative. */
const APPS = [
  { brand: "mahaam", name: ["Mahaam", "مهام"], en: "Projects, tasks, time and invoices in one place.", ar: "المشاريع والمهام والوقت والفواتير في مكان واحد.", cat: ["Project management", "إدارة المشاريع"], amount: 12, rating: 4.8, count: 2140 },
  { brand: "moharrik", name: ["Moharrik", "محرّك"], en: "Watches what happens around your business, acts on it and talks to your customers.", ar: "يراقب ما يحدث حول أعمالك، ويتصرّف بناءً عليه، ويتحدث إلى عملائك.", cat: ["Automation", "الأتمتة"], amount: 19, rating: 4.7, count: 1380 },
  { brand: "zekra", name: ["Zekra", "ذكرة"], en: "A memory organ for AI agents: what one session learns, the next one already knows.", ar: "عضو ذاكرة لوكلاء الذكاء الاصطناعي: ما تتعلّمه جلسة تعرفه التالية.", cat: ["AI memory", "ذاكرة الذكاء الاصطناعي"], amount: 9, rating: 4.9, count: 860, isNew: true },
  { brand: "seatfor", name: ["SeatFor", "SeatFor"], en: "Your own booking site and admin panel in minutes. Free until you grow.", ar: "موقع حجز خاص بنشاطك ولوحة إدارة خلال دقائق. مجاناً حتى تكبر.", cat: ["Bookings", "الحجوزات"], amount: 0, rating: 4.6, count: 3920 },
] as const;

/**
 * The grid shows tiles from 36rem of its own width and compact rows below it. Resize the canvas (or open
 * the Mobile viewport) to see the switch.
 */
export const Grid: Story = {
  decorators: [frame("w-full max-w-6xl")],
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    return (
      <ProductGrid>
        {APPS.map((a) => (
          <ProductCard
            key={a.brand}
            artwork={<ProductArtwork brand={a.brand} />}
            name={ar ? a.name[1] : a.name[0]}
            category={ar ? a.cat[1] : a.cat[0]}
            badge={"isNew" in a ? <Badge variant="accent">{ar ? "جديد" : "New"}</Badge> : undefined}
            description={ar ? a.ar : a.en}
            meta={<Rating value={a.rating} count={a.count} />}
            price={<Price amount={a.amount} period="month" size="sm" />}
            action={<InstallButton appName={ar ? a.name[1] : a.name[0]} free={a.amount === 0} state={a.brand === "mahaam" ? "installed" : "available"} />}
          />
        ))}
      </ProductGrid>
    );
  },
};

/** Row layout, forced. */
export const Row: Story = { args: { layout: "row", meta: <Rating value={4.9} count={860} />, action: <InstallButton appName="Zekra" /> } };

/** Dense list for modules and add-ons. Line icons stand in for modules that have no mark. */
export const List: Story = {
  decorators: [frame("w-full max-w-4xl")],
  render: () => {
    const ar = useNasaq().locale.startsWith("ar");
    const rows = [
      { icon: Users, name: ar ? "جهات الاتصال" : "Contacts", d: ar ? "العملاء والموردون في دفتر واحد" : "Customers and suppliers in one book", amount: 0, installed: true },
      { icon: ReceiptText, name: ar ? "الفواتير" : "Invoicing", d: ar ? "فواتير ضريبية متوافقة" : "Tax-compliant invoices", amount: 8 },
      { icon: CalendarCheck, name: ar ? "المواعيد" : "Appointments", d: ar ? "حجز عبر الإنترنت مع تذكيرات" : "Online booking with reminders", amount: 6 },
      { icon: CreditCard, name: ar ? "المدفوعات" : "Payments", d: ar ? "بطاقات ومدى وApple Pay" : "Cards, mada and Apple Pay", amount: 0 },
    ];
    return (
      <ProductList>
        {rows.map((r) => (
          <ProductListItem
            key={r.name}
            icon={<AppGlyph icon={r.icon} />}
            name={r.name}
            description={r.d}
            price={<Price amount={r.amount} period="month" size="sm" />}
            action={<InstallButton appName={r.name} free={r.amount === 0} state={r.installed ? "installed" : "available"} />}
          />
        ))}
      </ProductList>
    );
  },
};
