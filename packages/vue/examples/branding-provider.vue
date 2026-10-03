<script setup lang="ts">
import { defineComponent, h } from "vue";
import { NqBrandingProvider, NqButton, useBranding } from "@fadymondy/nasaq/vue";

const org = { name: "Acme Clinic", brandColor: "#0A7C66" as string | null, logoUrl: null as string | null };

// Reads the nearest provider: the tenant logo, or its name when it has none.
const OrgLogo = defineComponent({
  setup() {
    const b = useBranding();
    return () => (b?.value.logoUrl ? h("img", { src: b.value.logoUrl, alt: b.value.name ?? "", class: "h-6" }) : h("span", b?.value.name));
  },
});
// Scope the colours to this block so a preview does not recolour the whole page.
const scope = () => document.getElementById("branding-demo");
</script>

<template>
  <NqBrandingProvider :brand="org.brandColor ?? undefined" :logo-url="org.logoUrl" :name="org.name" :target="scope">
    <div id="branding-demo" class="flex items-center gap-4">
      <OrgLogo />
      <NqButton variant="primary">Book a visit</NqButton>
    </div>
  </NqBrandingProvider>
</template>
