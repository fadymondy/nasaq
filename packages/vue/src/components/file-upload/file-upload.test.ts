import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { NasaqProvider } from "../../provider";
import { NqFileUpload, NqImageUpload, NqUploadList, formatFileSize, matchesAccept, type UploadFile } from ".";

afterEach(() => {
  document.body.innerHTML = "";
});

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

async function pick(w: ReturnType<typeof mount>, files: File[]) {
  const input = w.find<HTMLInputElement>('input[type="file"]');
  Object.defineProperty(input.element, "files", { value: files, configurable: true });
  await input.trigger("change");
  await flushPromises();
}

describe("helpers", () => {
  it("matchesAccept and formatFileSize", () => {
    expect(matchesAccept({ name: "a.PDF", type: "" }, "image/*,.pdf")).toBe(true);
    expect(matchesAccept({ name: "a.png", type: "image/png" }, "image/*")).toBe(true);
    expect(matchesAccept({ name: "a.zip", type: "application/zip" }, "image/*")).toBe(false);
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1536, "ar")).toBe("1.5 ك.ب");
  });
});

describe("NqFileUpload", () => {
  it("renders the dropzone with the limits hint", () => {
    const w = mount(NqFileUpload, { props: { accept: "image/*", maxSize: 1024 * 1024 } });
    expect(w.attributes("data-slot")).toBe("file-upload");
    const zone = w.find('[data-slot="dropzone"]');
    expect(zone.attributes("role")).toBe("button");
    expect(zone.classes()).toContain("border-dashed");
    expect(zone.text()).toContain("Drag files here or click to browse");
    expect(zone.text()).toContain("Accepted: image/*");
    expect(zone.text()).toContain("Up to 1 MB each");
  });

  it("adds valid files as pending, emits them with controls and updates progress", async () => {
    let seen: UploadFile[] = [];
    let ctl: { update: (id: string, p: object) => void } | undefined;
    const w = mount(NqFileUpload, {
      props: {
        onFiles: (added: UploadFile[], controls: typeof ctl) => {
          seen = added;
          ctl = controls;
        },
      },
    });
    await pick(w, [file("a.png", "image/png")]);
    expect(seen).toHaveLength(1);
    const row = w.find('[data-slot="file-list-item"]');
    expect(row.attributes("data-status")).toBe("pending");
    expect(row.find('[data-slot="progress"]').exists()).toBe(true);
    ctl!.update(seen[0]!.id, { status: "uploading", progress: 40 });
    await flushPromises();
    expect(w.find('[data-slot="file-list-item"]').attributes("data-status")).toBe("uploading");
    expect(w.find('[role="progressbar"]').attributes("aria-valuenow")).toBe("40");
    ctl!.update(seen[0]!.id, { status: "done", progress: 100 });
    await flushPromises();
    expect(w.find('[role="progressbar"]').exists()).toBe(false);
  });

  it("rejects wrong types, marks the zone invalid and lists the reason", async () => {
    const w = mount(NqFileUpload, { props: { accept: "image/*" } });
    await pick(w, [file("a.zip", "application/zip")]);
    expect(w.find('[data-slot="dropzone"]').attributes("data-invalid")).toBe("true");
    expect(w.find('[data-slot="file-upload-errors"]').text()).toContain("a.zip is not an accepted file type.");
    expect(w.find('[data-slot="file-list"]').exists()).toBe(false);
  });

  it("enforces maxFiles and removes a file", async () => {
    const w = mount(NqFileUpload, { props: { maxFiles: 1 } });
    await pick(w, [file("a.txt", "text/plain"), file("b.txt", "text/plain")]);
    expect(w.findAll('[data-slot="file-list-item"]')).toHaveLength(1);
    expect(w.find('[data-slot="file-upload-errors"]').text()).toContain("limit is 1 file");
    await w.find('button[aria-label="Remove a.txt"]').trigger("click");
    expect(w.find('[data-slot="file-list"]').exists()).toBe(false);
  });

  it("shows retry on errors and emits retry", async () => {
    const items: UploadFile[] = [{ id: "1", file: file("a.txt", "text/plain"), status: "error", progress: null, error: "Network error" }];
    const retried: string[] = [];
    const w = mount(NqUploadList, { props: { items, onRetry: (i: UploadFile) => retried.push(i.id) } });
    expect(w.text()).toContain("Network error");
    await w.find('button[aria-label="Retry a.txt"]').trigger("click");
    expect(retried).toEqual(["1"]);
  });

  it("is Arabic inside a provider", () => {
    const w = mount({ render: () => h(NasaqProvider, { locale: "ar", target: "scope" }, () => h(NqFileUpload)) });
    expect(w.text()).toContain("اسحب الملفات إلى هنا أو انقر للاستعراض");
  });

  it("disabled zone is not focusable", () => {
    const w = mount(NqFileUpload, { props: { disabled: true } });
    const zone = w.find('[data-slot="dropzone"]');
    expect(zone.attributes("tabindex")).toBe("-1");
    expect(zone.attributes("data-disabled")).toBe("true");
  });
});

describe("NqImageUpload", () => {
  it("shows the saved image and removes it", async () => {
    const w = mount(NqImageUpload, { props: { src: "/a.png", alt: "Avatar" } });
    expect(w.find("img").attributes("src")).toBe("/a.png");
    expect(w.find('[data-slot="dropzone"]').text()).toContain("Replace image");
    await w.find('button[aria-label="Remove image"]').trigger("click");
    expect(w.find("img").exists()).toBe(false);
    expect(w.emitted("remove")).toHaveLength(1);
  });

  it("emits the picked file", async () => {
    const w = mount(NqImageUpload);
    expect(w.find('[data-slot="dropzone"]').text()).toContain("Add an image");
    await pick(w, [file("a.png", "image/png")]);
    expect((w.emitted("update:modelValue")![0] as File[])[0]!.name).toBe("a.png");
  });
});
