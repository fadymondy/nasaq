import {
  AppShell,
  CommandPalette,
  CommandProvider,
  type Product,
  ProductSwitcher,
  Sidebar,
  SidebarContent,
  SidebarProducts,
  toast,
} from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useProducts } from "./_demo";

const meta = { title: "Components/Navigation/Product Switcher", component: ProductSwitcher } satisfies Meta<typeof ProductSwitcher>;
export default meta;
type Story = StoryObj<typeof meta>;

const go = (p: Product) => toast(`→ ${p.name}`);

/** The header launcher. Arrow keys move through the grid; the current product carries its own accent. */
export const Default: Story = {
  args: { products: [] },
  render: function Render() {
    const products = useProducts();
    return (
      <CommandProvider>
        <div className="flex h-12 w-[36rem] items-center justify-end gap-1 border-b border-border px-3">
          <ProductSwitcher products={products} current="mahaam" onSelect={go} allHref="#all-apps" />
        </div>
      </CommandProvider>
    );
  },
};

/** Pinned products as a sidebar group; the grid opens from the group action. */
export const InSidebar: Story = {
  args: { products: [] },
  parameters: { layout: "fullscreen", nasaq: { fullBleed: true } },
  render: function Render() {
    const products = useProducts();
    return (
      <AppShell
        sidebar={
          <Sidebar>
            <SidebarContent>
              <SidebarProducts
                products={products}
                current="mahaam"
                onSelect={go}
                action={<ProductSwitcher products={products} current="mahaam" onSelect={go} registerCommands={false} className="size-6" />}
              />
            </SidebarContent>
          </Sidebar>
        }
      >
        <div className="p-6 text-body-sm text-muted-foreground">Content</div>
      </AppShell>
    );
  },
};

/** Products also land in the palette's "Switch product" section. Press ⌘K / Ctrl+K and type a name. */
export const InCommandPalette: Story = {
  args: { products: [] },
  render: function Render() {
    const products = useProducts();
    return (
      <CommandProvider>
        <div className="flex w-72 items-center gap-2 text-body-sm text-muted-foreground">
          <ProductSwitcher products={products} current="mahaam" onSelect={go} />
          <CommandPalette />
          Press ⌘K / Ctrl+K, then type “zekra”.
        </div>
      </CommandProvider>
    );
  },
};
