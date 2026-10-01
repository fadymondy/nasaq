import { DispatchOffer } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo, useState } from "react";

const meta = { title: "Components/Delivery/Dispatch Offer", component: DispatchOffer, parameters: { layout: "padded" } } satisfies Meta<typeof DispatchOffer>;
export default meta;
type Story = StoryObj;

function Demo({ seconds = 30, multi = false, cash = true }: { seconds?: number; multi?: boolean; cash?: boolean }) {
  const expiresAt = useMemo(() => Date.now() + seconds * 1000, [seconds]);
  const [answer, setAnswer] = useState("");
  return (
    <div className="flex max-w-md flex-col gap-3">
      <DispatchOffer
        pickup={{ name: "Al-Quds Bakery", nameAr: "مخبز القدس", address: "Al-Masyoun, Ramallah", addressAr: "المصيون، رام الله" }}
        dropoff={{ name: "Sara Odeh", nameAr: "سارة عودة", address: "Al-Tireh, Building 14", addressAr: "الطيرة، عمارة 14" }}
        feeMinor={1500}
        cashToCollectMinor={cash ? 8500 : undefined}
        distanceMeters={3400}
        etaSeconds={420}
        orderCount={multi ? 3 : 1}
        expiresAt={expiresAt}
        windowSeconds={30}
        onAccept={() => setAnswer("accepted")}
        onDecline={() => setAnswer("declined")}
        onExpire={() => setAnswer("expired")}
      />
      {answer ? <p className="text-body-sm text-muted-foreground">Result: {answer}</p> : null}
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Demo /> };
export const MultiOrder: Story = { render: () => <Demo multi /> };
export const NoCash: Story = { render: () => <Demo cash={false} /> };
export const NearlyExpired: Story = { render: () => <Demo seconds={8} /> };
export const Expired: Story = { render: () => <Demo seconds={0} /> };
