import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { NqCodeBlock, NqInlineCode, highlightCode } from ".";

describe("highlightCode", () => {
  it("colours keywords, strings, comments and calls, and spans multi-line tokens", () => {
    const src = 'const a = "x"; // hi\n/* one\ntwo */ run(1)';
    const lines = highlightCode(src, "ts")!;
    const color = (line: number, text: string) => lines[line]!.find((t) => t.content.includes(text))?.color;
    expect(color(0, "const")).toBe("var(--shiki-token-keyword)");
    expect(color(0, '"x"')).toBe("var(--shiki-token-string)");
    expect(color(0, "// hi")).toBe("var(--shiki-token-comment)");
    expect(color(1, "one")).toBe("var(--shiki-token-comment)");
    expect(color(2, "two")).toBe("var(--shiki-token-comment)");
    expect(color(2, "run")).toBe("var(--shiki-token-function)");
    expect(lines.map((l) => l.map((t) => t.content).join("")).join("\n")).toBe(src);
  });
  it("returns null for text and unknown languages", () => {
    expect(highlightCode("x", "text")).toBeNull();
    expect(highlightCode("x", "cobol")).toBeNull();
  });
  it("round-trips every supported language without losing characters", () => {
    const sample = "a = 'b' # c\n<div class=\"x\">{ \"k\": 1 } SELECT 1 -- z\n$x = [1, 2]; echo \"hi\"\n.a { color: #fff }";
    for (const lang of ["ts", "go", "php", "py", "bash", "sql", "json", "yaml", "css", "html", "md"]) {
      const lines = highlightCode(sample, lang)!;
      expect(lines.map((l) => l.map((t) => t.content).join("")).join("\n")).toBe(sample);
    }
  });
});

describe("NqCodeBlock", () => {
  it("renders lines, the filename header, the gutter and highlighted lines", () => {
    const w = mount(NqCodeBlock, { props: { code: "const a = 1;\nconst b = 2;\n", language: "ts", filename: "a.ts", lineNumbers: true, highlightLines: "2" } });
    expect(w.attributes("data-slot")).toBe("code-block");
    expect(w.attributes("dir")).toBe("ltr");
    expect(w.attributes("data-highlighted")).toBeDefined();
    expect(w.find('[data-slot="code-block-header"]').text()).toContain("a.ts");
    expect(w.findAll("[data-line]")).toHaveLength(2);
    expect(w.find('[data-line="2"]').attributes("data-highlighted")).toBeDefined();
    expect(w.find('[data-line="1"]').attributes("data-highlighted")).toBeUndefined();
    expect(w.find("pre").attributes("aria-label")).toBe("a.ts");
    expect(w.find('[data-slot="copy-button"]').exists()).toBe(true);
  });
  it("plain text has no highlighted state; copyable=false hides the button; a custom highlighter is used", async () => {
    const plain = mount(NqCodeBlock, { props: { code: "hello", copyable: false } });
    expect(plain.attributes("data-highlighted")).toBeUndefined();
    expect(plain.find('[data-slot="copy-button"]').exists()).toBe(false);
    expect(plain.find("pre").attributes("aria-label")).toBe("Code");
    const custom = mount(NqCodeBlock, { props: { code: "x", language: "ts", highlight: async () => [[{ content: "x", color: "red" }]] } });
    await new Promise((r) => setTimeout(r, 0));
    expect(custom.attributes("data-highlighted")).toBeDefined();
    expect(custom.find("[data-line] span span").attributes("style")).toContain("red");
  });
});

describe("NqInlineCode", () => {
  it("is a left-to-right isolate", () => {
    const w = mount(NqInlineCode, { slots: { default: "npm i" } });
    expect(w.element.tagName).toBe("CODE");
    expect(w.attributes("dir")).toBe("ltr");
  });
});
