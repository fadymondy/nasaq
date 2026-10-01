/* Discounts: automatic and code, percentage, fixed, buy X get Y and free shipping, with eligibility, schedule and limits, plus a basket simulator. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoreDiscountsPage } from "./_store-admin-demo";

const meta = { title: "Components/Store Admin/Pages/Discounts", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Type AUTUMN10 in the simulator and raise the mug count to see buy 2 get 1 stack with it. */
export const Default: Story = { render: () => <StoreDiscountsPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreDiscountsPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StoreDiscountsPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <StoreDiscountsPage /> };

export const Loading: Story = { render: () => <StoreDiscountsPage mode="loading" /> };

export const Empty: Story = { render: () => <StoreDiscountsPage mode="empty" /> };

export const ErrorState: Story = { render: () => <StoreDiscountsPage mode="error" /> };
