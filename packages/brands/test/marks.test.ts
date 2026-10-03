import { describe, expect, it } from "vitest";
import { BRANDS, isValidMark, MARKS, markSvg, resolveBrand } from "../src";

describe("marks", () => {
  for (const [key, mark] of Object.entries(MARKS)) {
    it(`${key} obeys the lattice rule`, () => expect(isValidMark(mark)).toBe(true));
  }

  it("markSvg renders one rect per cube and never uses filters or transforms", () => {
    const svg = markSvg(MARKS.nasaq, { scheme: "dark" });
    expect(svg.match(/<rect /g)).toHaveLength(MARKS.nasaq.cells.length);
    expect(svg).not.toMatch(/filter|transform/);
    expect(svg).toContain(MARKS.nasaq.bodyOnDark);
  });

  it("legacy aliases resolve", () => {
    expect(resolveBrand("managy")?.key).toBe("mahaam");
    expect(resolveBrand("cloudy")?.key).toBe("hosbah");
    expect(BRANDS.zekra.aliases).toContain("cabrain");
  });

  it("the CircleXO business apps are registered with their site, Arabic name and dark body", () => {
    for (const key of ["matjar", "sanduq", "mizan", "qaima", "makhzan", "mawared"] as const) {
      expect(BRANDS[key].links?.site).toBe(`https://${key}.circlexo.com`);
      expect(BRANDS[key].mark.bodyOnDark).toBeTruthy();
      expect(BRANDS[key].name.ar).toBeTruthy();
    }
  });
});
