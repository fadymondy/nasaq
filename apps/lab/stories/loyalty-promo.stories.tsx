import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoyaltyCardDemo, PointsHistoryDemo, PromoFieldDemo, PromoManagerDemo, VisitHistoryDemo } from "./_v2-demo";

const meta = { title: "Components/CRM/Loyalty and Promo", parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Points, tier progress, points about to expire, a member QR and rewards to redeem. */
export const Default: Story = { render: () => <LoyaltyCardDemo /> };

export const PointsActivity: Story = { render: () => <PointsHistoryDemo /> };

/** WELCOME15 works on a first order, EID50 needs a bigger order, OLD10 has expired. */
export const PromoField: Story = { render: () => <PromoFieldDemo /> };

/** Create, edit, turn off and delete codes. The code TAKEN shows a server error. */
export const PromoManager: Story = { render: () => <PromoManagerDemo /> };

export const Visits: Story = { render: () => <VisitHistoryDemo /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <LoyaltyCardDemo /> };
