/* The lab preview already mounts the Toaster. Demo data and page shells for the storefront cart and checkout stories. Products, cart and addresses come from ./_store-demo. */
import {
  type CommerceOrder,
  type LocalPaymentMethod,
  type PaymentPolicy,
  type PromoApplied,
  type PromoLike,
  type StoreCartPromo,
  type StoreCheckoutDraft,
  type StorePlaceOrderResult,
  type StoreShippingZone,
  useOptionalNasaq,
} from "@nasaq/web";
import { type ReactNode, useState } from "react";
import { STORE_CURRENCY, type StoreLocale, storeAddresses, storeCart, storeOrders, storeProducts, storeShippingMethods } from "./_store-demo";

export { STORE_CURRENCY, storeAddresses, storeCart, storeProducts, storeShippingMethods };

export function useLocale(): StoreLocale {
  return useOptionalNasaq()?.locale.startsWith("ar") ? "ar" : "en";
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A storefront frame: a slim header, the page, and the toaster the add-to-cart toast needs. */
export function ShopFrame({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const ar = useLocale() === "ar";
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <span className="text-h3 font-semibold">{ar ? "متجر نسق" : "Nasaq Shop"}</span>
        {header}
      </header>
      {children}
    </div>
  );
}

export function storeZones(locale: StoreLocale): StoreShippingZone[] {
  const methods = storeShippingMethods(locale).filter((m) => m.kind !== "pickup");
  const ar = locale === "ar";
  return [
    { id: "cairo", label: ar ? "القاهرة الكبرى" : "Greater Cairo", cities: ["Cairo", "Giza", "القاهرة", "الجيزة"], methods },
    { id: "delta", label: ar ? "الدلتا والقناة" : "Delta and Canal", cities: ["Alexandria", "Mansoura", "Tanta", "الإسكندرية", "المنصورة", "طنطا"], methods: methods.map((m) => ({ ...m, price: m.price + 2000, ...(m.etaDays ? { etaDays: [m.etaDays[0] + 1, m.etaDays[1] + 2] as [number, number] } : {}) })) },
  ];
}

export const storePromos: PromoLike[] = [
  { code: "WELCOME10", type: "percent", value: 1000, maxDiscount: 30000 },
  { code: "SAVE200", type: "fixed", value: 20000, minSubtotal: 100000 },
];

export function storeLocalMethods(locale: StoreLocale): LocalPaymentMethod[] {
  const ar = locale === "ar";
  return [
    {
      id: "instapay",
      name: "InstaPay",
      kind: "instant-transfer",
      details: [{ label: ar ? "عنوان الدفع" : "Payment address", value: "nasaq-shop@instapay" }],
      steps: ar ? ["افتح تطبيق البنك.", "حوّل المبلغ إلى العنوان أعلاه.", "اكتب رقم العملية هنا."] : ["Open your bank app.", "Send the amount to the address above.", "Enter the transfer reference here."],
    },
    {
      id: "vodafone",
      name: "Vodafone Cash",
      kind: "mobile-wallet",
      details: [{ label: ar ? "رقم المحفظة" : "Wallet number", value: "0100 555 0199" }],
      fee: { percentBps: 100 },
    },
  ];
}

export const storePaymentPolicy: PaymentPolicy = {
  card: true,
  cod: { maxTotal: 500000, countries: ["EG"], fee: 2500 },
  wallet: { balance: 250000 },
  local: [{ id: "instapay" }, { id: "vodafone" }],
};

/** A fake order call. Set `fail` to make the first try fail so the retry path can be seen. */
export function fakePlaceOrder(options: { fail?: boolean; delay?: number } = {}) {
  let tries = 0;
  return async (draft: StoreCheckoutDraft): Promise<StorePlaceOrderResult> => {
    tries += 1;
    await wait(options.delay ?? 1200);
    if (options.fail && tries === 1) return { error: "The payment provider did not answer. You were not charged." };
    return { orderNumber: `#${4200 + draft.attempt}` };
  };
}

export function sampleOrder(locale: StoreLocale): CommerceOrder {
  return storeOrders(locale)[0]!;
}

/** Holds the applied promo, since the cart page is controlled. Pass the result as `promo`. */
export function useDemoPromo(): StoreCartPromo {
  const [applied, setApplied] = useState<PromoApplied | null>(null);
  return { applied, promos: storePromos, today: "2026-09-30", onApplied: setApplied, onRemove: () => setApplied(null) };
}
