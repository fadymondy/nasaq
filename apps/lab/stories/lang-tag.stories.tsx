import { LangTag } from "@nasaq/web";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useAr } from "./_auth";

const meta = { title: "Components/Data Display/Lang Tag", component: LangTag } satisfies Meta<typeof LangTag>;
export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <LangTag lang="ar" /> };

/** Each language keeps one colour; unknown languages are gray. The spoken name comes from `Intl.DisplayNames`. */
export const Languages: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {["ar", "en", "fr", "es", "de", "tr", "ur", "fa", "ja", "sw"].map((l) => (
        <LangTag key={l} lang={l} />
      ))}
    </div>
  ),
};

/** `region` shows the full code; `hue` overrides the colour. */
export const RegionAndHue: Story = {
  name: "Region and hue",
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <LangTag lang="en-GB" region />
      <LangTag lang="pt_BR" region />
      <LangTag lang="ar-EG" region hue="teal" />
    </div>
  ),
};

function Posts() {
  const ar = useAr();
  const posts = [
    { lang: "ar", title: "إطلاق نسق ١٫٠" },
    { lang: "en", title: "Shipping Nasaq 1.0" },
    { lang: "fr", title: "Lancement de Nasaq 1.0" },
  ];
  return (
    <ul className="flex w-96 flex-col divide-y divide-border rounded-card border border-border">
      {posts.map((p) => (
        <li key={p.lang} className="flex items-center gap-3 px-3 py-2.5">
          <LangTag lang={p.lang} />
          <span lang={p.lang} dir={p.lang === "ar" ? "rtl" : "ltr"} className="text-body-sm text-foreground">
            {p.title}
          </span>
        </li>
      ))}
      <li className="px-3 py-2 text-caption text-muted-foreground">{ar ? "٣ ترجمات" : "3 translations"}</li>
    </ul>
  );
}

/** Beside mixed-language content. Each title also sets its own `lang` and `dir`. */
export const InAList: Story = { name: "In a list", render: () => <Posts /> };

export const Arabic: Story = { globals: { locale: "ar" }, render: () => <Posts /> };
