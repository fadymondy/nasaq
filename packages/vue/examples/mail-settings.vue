<script setup lang="ts">
import { NqMailDomains, NqSmtpSettings, type MailDomain } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const smtp = { host: "smtp.example.com", port: 587, encryption: "starttls" as const, username: "mailer", fromName: "Acme", fromAddress: "hello@example.com", passwordSet: true };
const domains = ref<MailDomain[]>([
  {
    id: "d1",
    name: "example.com",
    checkedAt: Date.now() - 3600_000,
    checks: [
      { kind: "spf", status: "pass", name: "example.com", expected: "v=spf1 include:_spf.example.net ~all", found: "v=spf1 include:_spf.example.net ~all" },
      { kind: "dkim", status: "missing", name: "mail._domainkey.example.com", expected: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN" },
      { kind: "dmarc", status: "pass", name: "_dmarc.example.com", expected: "v=DMARC1; p=quarantine", found: "v=DMARC1; p=quarantine" },
    ],
    mailboxes: [
      { id: "m1", local: "info", quotaMb: 2048, usedMb: 512 },
      { id: "m2", local: "support", quotaMb: 2048, usedMb: 1900 },
    ],
    aliases: [{ id: "a1", source: "sales", destination: "team@example.com" }],
  },
]);
const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 400));
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqSmtpSettings
      :value="smtp"
      default-test-to="you@example.com"
      :on-save="wait"
      :on-test="async () => { await wait(); return { ok: true, steps: [{ id: 'connect', ok: true }, { id: 'tls', ok: true }, { id: 'auth', ok: true }, { id: 'send', ok: true }] }; }"
    />
    <NqMailDomains
      :domains="domains"
      :on-recheck="wait"
      :on-add-mailbox="async (id: string, input) => { await wait(); domains[0]!.mailboxes = [...domains[0]!.mailboxes, { id: `m${Date.now()}`, local: input.local, quotaMb: input.quotaMb, usedMb: 0 }]; }"
      :on-remove-mailbox="async (id: string, mid: string) => { await wait(); domains[0]!.mailboxes = domains[0]!.mailboxes.filter((m) => m.id !== mid); }"
      :on-add-alias="async (id: string, input) => { await wait(); domains[0]!.aliases = [...domains[0]!.aliases, { id: `a${Date.now()}`, source: input.source, destination: input.destination }]; }"
      :on-remove-alias="async (id: string, aid: string) => { await wait(); domains[0]!.aliases = domains[0]!.aliases.filter((a) => a.id !== aid); }"
    />
  </div>
</template>
