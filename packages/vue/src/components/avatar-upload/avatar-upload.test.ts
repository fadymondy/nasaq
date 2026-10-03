import { flushPromises, mount } from "@vue/test-utils";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { NqAvatarUpload } from ".";

beforeAll(() => {
  if (!URL.createObjectURL) URL.createObjectURL = () => "blob:test";
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
});

const png = (size = 10) => new File([new Uint8Array(size)], "me.png", { type: "image/png" });

async function drop(w: ReturnType<typeof mount>, file: File) {
  const input = w.find('input[type="file"]');
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
  await flushPromises();
}

describe("NqAvatarUpload", () => {
  it("renders the idle state with upload, hint and no remove without a photo", () => {
    const w = mount(NqAvatarUpload, { props: { name: "Sara Alharbi", onChange: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("avatar-upload");
    expect(w.find("[data-slot=avatar-upload-trigger]").attributes("aria-label")).toBe("Upload photo");
    expect(w.text()).toContain("PNG, JPG, or WebP");
    expect(w.text()).toContain("5 MB");
    expect(w.text()).not.toContain("Remove photo");
  });

  it("offers change and remove for a saved photo and calls onRemove", async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqAvatarUpload, { props: { name: "Sara", src: "https://example.com/a.png", onChange: vi.fn(), onRemove } });
    expect(w.text()).toContain("Change photo");
    const remove = w.findAll("button").find((b) => b.text().includes("Remove photo"))!;
    await remove.trigger("click");
    await flushPromises();
    expect(onRemove).toHaveBeenCalled();
    expect(w.find("[role=status]").text()).toBe("Photo removed.");
  });

  it("rejects a wrong type and an oversized file", async () => {
    const w = mount(NqAvatarUpload, { props: { name: "S", onChange: vi.fn(), maxSize: 100 } });
    await drop(w, new File(["x"], "a.pdf", { type: "application/pdf" }));
    expect(w.find("[role=alert]").text()).toContain("not supported");
    await drop(w, png(500));
    expect(w.find("[role=alert]").text()).toContain("larger than");
  });

  it("opens the crop editor for a valid image and cancels back", async () => {
    const w = mount(NqAvatarUpload, { props: { name: "S", onChange: vi.fn() } });
    await drop(w, png());
    expect(w.attributes("data-editing")).toBeDefined();
    const vp = w.find("[data-slot=avatar-upload-viewport]");
    expect(vp.attributes("dir")).toBe("ltr");
    expect(w.find("[data-slot=avatar-upload-editor]").attributes("aria-label")).toBe("Adjust your photo");
    await w.findAll("button").find((b) => b.text() === "Cancel")!.trigger("click");
    expect(w.find("[data-slot=avatar-upload-editor]").exists()).toBe(false);
  });
});
