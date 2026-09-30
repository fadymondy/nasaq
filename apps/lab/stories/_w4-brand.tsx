/* Brand guidelines demo, shared by the component story and the page story. */
import { BrandGuidelines } from "@nasaq/web";
import { fonts, ogCards, useAr } from "./_w4-demo";

export function Guidelines({ brand = "nasaq" }: { brand?: string }) {
  const ar = useAr();
  return (
    <div className="mx-auto w-full max-w-5xl">
      <BrandGuidelines
        brand={brand}
        title={ar ? "دليل هوية نسق" : "Nasaq brand guidelines"}
        intro={ar ? "كل ما تحتاجه لاستخدام الشعار والألوان بشكل صحيح." : "Everything you need to use the mark and colours correctly."}
        fonts={fonts(ar)}
        ogCards={ogCards(ar)}
      />
    </div>
  );
}
