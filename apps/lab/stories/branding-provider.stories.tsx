import { Badge, BrandingProvider, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ProductLogo, Switch, useBranding } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { useAr } from "./_lifecycle-demo";

const meta = { title: "Components/Brand/Branding Provider", component: BrandingProvider, parameters: { layout: "padded" } } satisfies Meta<typeof BrandingProvider>;
export default meta;
type Story = StoryObj<typeof meta>;

const TENANTS = [
  { name: "Nile Clinics", brand: "#0F766E" },
  { name: "Saffron Foods", brand: "#B45309" },
  { name: "Orbit Labs", brand: "#4338CA" },
  { name: "Rose Studio", brand: "#BE185D" },
];

function Preview() {
  const ar = useAr();
  const branding = useBranding();
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle as="h2">{branding?.name ?? "Nasaq"}</CardTitle>
        <CardDescription>{ar ? "الأزرار والشارات والتركيز تتبع لون المستأجر." : "Buttons, badges and focus follow the tenant colour."}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button variant="primary">{ar ? "إنشاء مشروع" : "Create project"}</Button>
        <Button>{ar ? "إلغاء" : "Cancel"}</Button>
        <Badge variant="brand">Pro</Badge>
        <Switch defaultChecked aria-label={ar ? "تفعيل" : "Enabled"} />
      </CardContent>
    </Card>
  );
}

/** Pick a tenant: the brand variables are written on the story root at runtime, over the manifest. */
export const Playground: Story = {
  args: { children: null },
  render: () => {
    const [tenant, setTenant] = useState(TENANTS[0]!);
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    return (
      <div ref={setEl} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {TENANTS.map((t) => (
            <Button key={t.name} size="sm" variant={t.name === tenant.name ? "secondary" : "ghost"} onClick={() => setTenant(t)}>
              <span aria-hidden className="size-3 rounded-full" style={{ background: t.brand }} />
              {t.name}
            </Button>
          ))}
        </div>
        {el ? (
          <BrandingProvider brand={tenant.brand} name={tenant.name} target={() => el}>
            <Preview />
          </BrandingProvider>
        ) : null}
        <ProductLogo size={20} />
      </div>
    );
  },
};

export const Arabic: Story = { ...Playground, globals: { locale: "ar" } };
