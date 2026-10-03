import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqField, NqFieldLabel } from "../field";
import { type Mention, NqMentionTextarea, rankOptions, splitMentions } from ".";

afterEach(() => {
  document.body.innerHTML = "";
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
});

const people = [
  { id: "u1", name: "Sara Ali", description: "Design lead", handle: "sara" },
  { id: "u2", name: "Omar Nasser", description: "Engineer" },
  { id: "t1", name: "Design", kind: "team" as const, keywords: ["sara"] },
];

const area = (w: ReturnType<typeof mount>) => w.find<HTMLTextAreaElement>("textarea");

async function type(w: ReturnType<typeof mount>, text: string) {
  const el = area(w).element;
  el.value = text;
  el.setSelectionRange(text.length, text.length);
  await area(w).trigger("input");
  await area(w).trigger("keyup");
}

function setup(props: Record<string, unknown> = {}) {
  return mount(NqMentionTextarea, { props: { suggestions: people, ...props }, attachTo: document.body });
}

describe("pure model", () => {
  it("ranks by kind then match quality and splits text", () => {
    expect(rankOptions(people, "sa", (s) => s.toLowerCase()).map((o) => o.id)).toEqual(["u1", "t1"]);
    expect(splitMentions("hi @Sara!", [{ id: "u1", name: "Sara", start: 3, end: 8 }]).map((s) => s.type)).toEqual(["text", "mention", "text"]);
  });
});

describe("NqMentionTextarea", () => {
  it("renders a wrapper and a combobox textarea, closed", () => {
    const w = setup({ class: "text-sm", wrapperClass: "max-w-md" });
    expect(w.attributes("data-slot")).toBe("mention-textarea");
    expect(w.classes()).toEqual(expect.arrayContaining(["relative", "w-full", "max-w-md"]));
    expect(area(w).attributes("role")).toBe("combobox");
    expect(area(w).attributes("aria-autocomplete")).toBe("list");
    expect(area(w).attributes("aria-expanded")).toBe("false");
    expect(area(w).attributes("data-slot")).toBe("textarea");
    expect(area(w).classes()).toContain("text-sm");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
  });

  it("opens on the trigger, wires the combobox and groups by kind", async () => {
    const w = setup();
    await area(w).trigger("focus");
    await type(w, "hi @");
    const list = w.find('[role="listbox"]');
    expect(list.exists()).toBe(true);
    expect(list.attributes("aria-label")).toBe("Mentions");
    expect(list.attributes("data-slot")).toBe("mention-list");
    expect(area(w).attributes("aria-expanded")).toBe("true");
    expect(area(w).attributes("aria-controls")).toBe(list.attributes("id"));
    const options = w.findAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[0]!.text()).toContain("Sara Ali");
    expect(options[2]!.text()).toContain("Design");
    expect(area(w).attributes("aria-activedescendant")).toBe(options[0]!.attributes("id"));
    expect(options[0]!.attributes("data-active")).toBeDefined();
    expect(options[0]!.attributes("aria-selected")).toBe("true");
    expect(w.findAll('[data-slot="mention-heading"]').map((x) => x.text())).toEqual(["People", "Teams"]);
    expect(options[2]!.attributes("data-kind")).toBe("team");
    expect(w.find('[role="status"]').text()).toBe("3 suggestions");
  });

  it("filters while typing and shows an empty state", async () => {
    const w = setup();
    await area(w).trigger("focus");
    await type(w, "@omar");
    expect(w.findAll('[role="option"]')).toHaveLength(1);
    await type(w, "@zzz");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    expect(w.find('[data-slot="mention-empty"]').text()).toBe("No matches");
  });

  it("arrows move, Enter inserts the name and reports the mention", async () => {
    const w = setup();
    await area(w).trigger("focus");
    await type(w, "hi @");
    await area(w).trigger("keydown", { key: "ArrowDown" });
    expect(w.findAll('[role="option"]')[1]!.attributes("data-active")).toBeDefined();
    await area(w).trigger("keydown", { key: "ArrowUp" });
    await area(w).trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(area(w).element.value).toBe("hi @Sara Ali ");
    expect(w.emitted("update:modelValue")!.at(-1)).toEqual(["hi @Sara Ali "]);
    expect(w.emitted("update:mentions")!.at(-1)).toEqual([[{ id: "u1", name: "Sara Ali", start: 3, end: 12 }]]);
    expect(w.find('[role="listbox"]').exists()).toBe(false);
  });

  it("a click on an option inserts it; Escape only silences the current mention", async () => {
    const w = setup();
    await area(w).trigger("focus");
    await type(w, "@");
    await area(w).trigger("keydown", { key: "Escape" });
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    await type(w, "@o");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
    await type(w, "@o x");
    await type(w, "@o x @");
    expect(w.find('[role="listbox"]').exists()).toBe(true);
    await w.findAll('[role="option"]')[1]!.trigger("click");
    await flushPromises();
    expect((w.emitted("update:mentions")!.at(-1)![0] as Mention[])[0]).toMatchObject({ id: "u2", name: "Omar Nasser" });
  });

  it("only opens at the start of a word", async () => {
    const w = setup();
    await area(w).trigger("focus");
    await type(w, "me@");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
  });

  it("closes on blur and honours a custom trigger", async () => {
    const w = setup({ trigger: "#" });
    await area(w).trigger("focus");
    await type(w, "#");
    expect(w.find('[role="listbox"]').exists()).toBe(true);
    await area(w).trigger("blur");
    expect(w.find('[role="listbox"]').exists()).toBe(false);
  });

  it("drops a mention when its text is edited and shifts the ones after it", async () => {
    const w = setup({
      defaultValue: "@Sara Ali and @Omar Nasser",
      defaultMentions: [
        { id: "u1", name: "Sara Ali", start: 0, end: 9 },
        { id: "u2", name: "Omar Nasser", start: 14, end: 26 },
      ],
    });
    await type(w, "Hey @Sara Ali and @Omar Nasser");
    expect((w.emitted("update:mentions")!.at(-1)![0] as Mention[]).map((m) => [m.id, m.start])).toEqual([
      ["u1", 4],
      ["u2", 18],
    ]);
    await type(w, "Hey @Sar Ali and @Omar Nasser");
    expect((w.emitted("update:mentions")!.at(-1)![0] as Mention[]).map((m) => m.id)).toEqual(["u2"]);
  });

  it("supports v-model and calls a user keydown handler first", async () => {
    let seen = 0;
    const w = mount(NqMentionTextarea, {
      props: {
        suggestions: people,
        modelValue: "",
        onKeydown: (e: KeyboardEvent) => {
          seen++;
          if (e.key === "Enter") e.preventDefault();
        },
        "onUpdate:modelValue": (v: string) => w.setProps({ modelValue: v }),
      },
      attachTo: document.body,
    });
    await area(w).trigger("focus");
    await type(w, "@");
    await area(w).trigger("keydown", { key: "Enter" });
    expect(seen).toBe(1);
    expect(w.find('[role="listbox"]').exists()).toBe(true);
    expect(area(w).element.value).toBe("@");
  });

  it("works inside a Field and labels the textarea", async () => {
    const w = mount(
      { render: () => h(NqField, null, () => [h(NqFieldLabel, null, () => "Comment"), h(NqMentionTextarea, { suggestions: people })]) },
      { attachTo: document.body },
    );
    await flushPromises();
    const id = w.find("textarea").attributes("id");
    expect(id).toBeTruthy();
    expect(w.find("label").attributes("for")).toBe(id);
  });

  it("speaks Arabic", async () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar" }, () => h(NqMentionTextarea, { suggestions: people })) }, { attachTo: document.body });
    const el = w.find<HTMLTextAreaElement>("textarea");
    await el.trigger("focus");
    el.element.value = "@";
    el.element.setSelectionRange(1, 1);
    await el.trigger("input");
    await el.trigger("keyup");
    expect(w.find('[role="listbox"]').attributes("aria-label")).toBe("الإشارات");
    expect(w.findAll('[data-slot="mention-heading"]').map((x) => x.text())).toEqual(["الأشخاص", "الفرق"]);
    expect(w.find('[role="status"]').text()).toBe("3 اقتراحات");
  });
});
