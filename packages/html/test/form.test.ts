// The Blade form example under real Alpine: server errors land on fields, clear on edit, and the pending state.
import Alpine from "alpinejs";
import { describe, expect, it } from "vitest";
import { mount, setup, tick } from "./_float-setup";

setup();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = (el: Element) => (Alpine as any).$data(el);

async function setupForm() {
  const host = await mount("form");
  const form = host.querySelector<HTMLFormElement>('[data-slot="form"]')!;
  const field = form.querySelector<HTMLElement>('[data-slot="field"]')!;
  const input = field.querySelector<HTMLInputElement>('[data-slot="input"]')!;
  const error = field.querySelector<HTMLElement>('[data-slot="field-error"]')!;
  const alert = form.querySelector<HTMLElement>('[data-slot="alert"]')!;
  return { form, field, input, error, alert };
}

describe("form (Blade example)", () => {
  it("renders a novalidate form with a hidden alert and a valid field", async () => {
    const { form, field, input, error, alert } = await setupForm();
    expect(form.hasAttribute("novalidate")).toBe(true);
    expect(form.className).toContain("flex-col");
    expect(alert.style.display).toBe("none");
    expect(alert.getAttribute("data-tone")).toBe("danger");
    expect(field.hasAttribute("data-valid")).toBe(true);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(error.style.display).toBe("none");
    expect(input.getAttribute("name")).toBe("email");
  });

  it("shows a server error on its field and a form error in the alert", async () => {
    const { form, field, input, error, alert } = await setupForm();
    data(form).setErrors({ email: "This email already has an account.", other: "" }, "Sign-up failed.");
    await tick();
    expect(field.hasAttribute("data-invalid")).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(error.style.display).not.toBe("none");
    expect(error.textContent!.trim()).toBe("This email already has an account.");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    expect(alert.style.display).not.toBe("none");
    expect(alert.textContent!.trim()).toContain("Sign-up failed.");
    expect(data(form).errors).toEqual({ email: "This email already has an account." });
  });

  it("clears the field's error when the user edits it and fires clear-errors", async () => {
    const { form, field, input, error } = await setupForm();
    data(form).setErrors({ email: "Taken.", name: "Required." });
    await tick();
    let detail: unknown;
    form.addEventListener("clear-errors", (e) => (detail = (e as CustomEvent).detail));
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(field.hasAttribute("data-invalid")).toBe(false);
    expect(input.hasAttribute("aria-invalid")).toBe(false);
    expect(error.style.display).toBe("none");
    expect(detail).toEqual({ errors: { name: "Required." } });
  });

  it("marks the form pending on submit, blocks a second submit and ends on done()", async () => {
    const { form } = await setupForm();
    const button = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    form.addEventListener("submit", (e) => e.preventDefault());
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    await tick();
    expect(data(form).submitting).toBe(true);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    const second = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(true);
    data(form).done();
    await tick();
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute("aria-busy")).toBe(false);
  });
});
