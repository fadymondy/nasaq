import { type WeightedCriterion, WeightedCriteriaCard } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/AI Assistant/Weighted Criteria Card", component: WeightedCriteriaCard } satisfies Meta<typeof WeightedCriteriaCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const en: WeightedCriterion[] = [
  { id: "price", label: "Price", description: "Total cost for the first year", weight: "high", enabled: true },
  { id: "support", label: "Support", description: "Arabic support and response time", weight: "medium", enabled: true },
  { id: "speed", label: "Delivery speed", weight: "low", enabled: true },
  { id: "rating", label: "Customer rating", weight: "medium", enabled: false },
];
const ar: WeightedCriterion[] = [
  { id: "price", label: "السعر", description: "التكلفة الكاملة للسنة الأولى", weight: "high", enabled: true },
  { id: "support", label: "الدعم", description: "الدعم بالعربية وسرعة الرد", weight: "medium", enabled: true },
  { id: "speed", label: "سرعة التوصيل", weight: "low", enabled: true },
  { id: "rating", label: "تقييم العملاء", weight: "medium", enabled: false },
];

function Demo({ fail = false }: { fail?: boolean }) {
  const isAr = useAr();
  return (
    <div className="max-w-xl">
      <WeightedCriteriaCard
        key={isAr ? "ar" : "en"}
        description={isAr ? "سأرتّب الموردين الثلاثة بناءً على هذه المعايير." : "I will rank the three vendors with these."}
        defaultCriteria={isAr ? ar : en}
        onAccept={async () => {
          await new Promise((r) => setTimeout(r, 600));
          if (fail) return { error: isAr ? "تعذّر الإرسال." : "Could not send." };
        }}
      />
    </div>
  );
}

/** Switch criteria on and off, set weights, add your own and confirm. */
export const Default: Story = { args: { defaultCriteria: [] }, render: () => <Demo /> };

/** Accept returns an error: the card stays editable and shows an alert. */
export const AcceptError: Story = { args: { defaultCriteria: [] }, render: () => <Demo fail /> };

/** Fixed list: no add form and no share bars. */
export const Fixed: Story = { args: { defaultCriteria: en, allowCustom: false, showShares: false } };

export const Arabic: Story = { args: { defaultCriteria: [] }, globals: { locale: "ar" }, render: () => <Demo /> };
