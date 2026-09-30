/* The product editor: pictures, price and margin, inventory, options with a generated variant matrix, search listing preview, status and visibility. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { StoreProductEditorPage } from "./_store-admin-demo";

const meta = { title: "Pages/Store Admin/Product", parameters: { layout: "fullscreen", nasaq: { fullBleed: true } } } satisfies Meta;
export default meta;
type Story = StoryObj;

/** Add or remove an option value: variants that still exist keep their price, SKU and stock. */
export const Default: Story = { render: () => <StoreProductEditorPage /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <StoreProductEditorPage /> };

export const Mobile: Story = { globals: { viewport: { value: "mobile" } }, render: () => <StoreProductEditorPage /> };

export const MobileArabic: Story = { globals: { locale: "ar", viewport: { value: "mobile" } }, render: () => <StoreProductEditorPage /> };

export const NewProduct: Story = { render: () => <StoreProductEditorPage mode="new" /> };

export const Loading: Story = { render: () => <StoreProductEditorPage mode="loading" /> };

/** The first save fails and keeps your edits; the second works. */
export const SaveError: Story = { render: () => <StoreProductEditorPage mode="error" /> };
