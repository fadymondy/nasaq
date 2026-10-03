import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { NasaqProvider } from "../../provider";
import { NqMailDomains, NqSmtpSettings, analyzeSpf, domainHealth, formatMegabytes, type MailDomain } from ".";

const smtp = { host: "smtp.example.com", port: 587, encryption: "starttls" as const, username: "mailer", fromName: "Acme", fromAddress: "hello@example.com", passwordSet: true };
const domains: MailDomain[] = [
  {
    id: "d1",
    name: "example.com",
    checks: [
      { kind: "spf", status: "pass", name: "example.com", expected: "v=spf1 include:_spf.example.net ~all", found: "v=spf1 include:_spf.example.net ~all" },
      { kind: "dkim", status: "missing", name: "mail._domainkey.example.com", expected: "v=DKIM1; k=rsa; p=ABC" },
      { kind: "dmarc", status: "fail", name: "_dmarc.example.com", expected: "v=DMARC1; p=quarantine", found: "v=DMARC1; p=none" },
    ],
    mailboxes: [{ id: "m1", local: "info", quotaMb: 2048, usedMb: 512 }],
    aliases: [{ id: "a1", source: "sales", destination: "team@example.com" }],
  },
];
const domainProps = () => ({
  domains,
  onRecheck: vi.fn().mockResolvedValue(undefined),
  onAddMailbox: vi.fn().mockResolvedValue(undefined),
  onRemoveMailbox: vi.fn().mockResolvedValue(undefined),
  onAddAlias: vi.fn().mockResolvedValue(undefined),
  onRemoveAlias: vi.fn().mockResolvedValue(undefined),
});

describe("NqSmtpSettings", () => {
  it("renders the form and the test card", () => {
    const w = mount(NqSmtpSettings, { props: { value: smtp, onSave: vi.fn(), onTest: vi.fn() } });
    expect(w.attributes("data-slot")).toBe("smtp-settings");
    expect(w.find('[data-slot="smtp-test"]').exists()).toBe(true);
    expect((w.find("input").element as HTMLInputElement).value).toBe("smtp.example.com");
  });

  it("rejects an invalid host without saving", async () => {
    const onSave = vi.fn();
    const w = mount(NqSmtpSettings, { props: { value: { ...smtp, host: "" }, onSave, onTest: vi.fn() } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves the draft without a password when none was typed", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const w = mount(NqSmtpSettings, { props: { value: smtp, onSave, onTest: vi.fn() } });
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0]![0]).toEqual({ host: "smtp.example.com", port: 587, encryption: "starttls", username: "mailer", fromName: "Acme", fromAddress: "hello@example.com" });
  });

  it("shows each test step", async () => {
    const onTest = vi.fn().mockResolvedValue({ ok: false, steps: [{ id: "connect", ok: true }, { id: "tls", ok: false, message: "handshake failed" }] });
    const w = mount(NqSmtpSettings, { props: { value: smtp, onSave: vi.fn(), onTest, defaultTestTo: "me@example.com" } });
    await w.findAll("button").find((b) => b.text() === "Send test")!.trigger("click");
    await flushPromises();
    expect(onTest).toHaveBeenCalledTimes(1);
    expect(w.find('[data-slot="smtp-test-result"]').exists()).toBe(true);
    expect(w.findAll('[data-slot="smtp-test-result"] li')).toHaveLength(4);
  });
});

describe("NqMailDomains", () => {
  it("renders one row per record with its kind and status", () => {
    const w = mount(NqMailDomains, { props: domainProps() });
    expect(w.attributes("data-slot")).toBe("mail-domains");
    const rows = w.findAll('[data-slot="mail-dns-row"]');
    expect(rows.map((r) => r.attributes("data-kind"))).toEqual(["spf", "dkim", "dmarc"]);
    expect(rows.map((r) => r.attributes("data-status"))).toEqual(["pass", "missing", "fail"]);
    expect(w.find('[data-health]').attributes("data-health")).toBe("critical");
  });

  it("lists the mailbox and the alias", () => {
    const w = mount(NqMailDomains, { props: domainProps() });
    expect(w.find('[data-slot="mail-mailboxes"]').text()).toContain("info@example.com");
    expect(w.find('[data-slot="mail-aliases"]').text()).toContain("sales@example.com");
  });

  it("rechecks the domain", async () => {
    const props = domainProps();
    const w = mount(NqMailDomains, { props });
    await w.findAll("button").find((b) => b.text().includes("Check again"))!.trigger("click");
    await flushPromises();
    expect(props.onRecheck).toHaveBeenCalledWith("d1");
  });

  it("shows the empty state when there are no domains", () => {
    const w = mount(NqMailDomains, { props: { ...domainProps(), domains: [] } });
    expect(w.attributes("data-slot")).toBe("mail-domains");
    expect(w.find('[data-slot="empty-state"]').exists()).toBe(true);
  });

  it("is Arabic inside an Arabic provider", () => {
    const w = mount({
      components: { NasaqProvider, NqMailDomains },
      setup: () => ({ p: domainProps() }),
      template: '<NasaqProvider locale="ar"><NqMailDomains v-bind="p" /></NasaqProvider>',
    });
    expect(/[؀-ۿ]/.test(w.text())).toBe(true);
  });
});

describe("helpers", () => {
  it("analyses SPF and rolls health up", () => {
    expect(analyzeSpf("v=spf1 +all").policy).toBe("open");
    expect(domainHealth(domains[0]!.checks)).toBe("critical");
    expect(formatMegabytes(512)).toBeTruthy();
  });
});
