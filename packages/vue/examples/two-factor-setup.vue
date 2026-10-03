<script setup lang="ts">
import { NqTwoFactorSetup } from "@fadymondy/nasaq/vue";

const otpauthUri = "otpauth://totp/Nasaq:fady@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Nasaq";

const api = {
  async verifyTotp(code: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return code === "123456"
      ? { ok: true, recoveryCodes: ["a1b2-c3d4", "e5f6-a7b8", "c9d0-e1f2", "a3b4-c5d6", "e7f8-a9b0", "c1d2-e3f4"] }
      : { ok: false, recoveryCodes: [] as string[] };
  },
};
</script>

<template>
  <NqTwoFactorSetup
    :otpauth-uri="otpauthUri"
    :on-verify="
      async (code: string) => {
        const res = await api.verifyTotp(code);
        return res.ok ? { recoveryCodes: res.recoveryCodes } : { error: 'That code did not match. Try 123456.' };
      }
    "
  />
</template>
