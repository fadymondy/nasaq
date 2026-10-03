<script setup lang="ts">
import { NasaqProvider, NqButton, NqTranslationsProvider, useTranslations } from "@fadymondy/nasaq/vue";
import { defineComponent, h } from "vue";

const messages = {
  en: { nav: { home: "Home" }, inbox_one: "{count} message", inbox_other: "{count} messages" },
  ar: {
    nav: { home: "الرئيسية" },
    inbox_zero: "لا رسائل",
    inbox_one: "رسالة واحدة",
    inbox_two: "رسالتان",
    inbox_few: "{count} رسائل",
    inbox_many: "{count} رسالة",
    inbox_other: "{count} رسالة",
  },
};

// A child reads `t` and `setLocale` from the nearest provider.
const Nav = defineComponent({
  props: { unread: { type: Number, required: true } },
  setup(props) {
    const tr = useTranslations();
    return () =>
      h("div", { class: "flex items-center gap-3" }, [
        h("a", { href: "/" }, tr.value.t("nav.home")),
        h("span", tr.value.t("inbox", { count: props.unread })),
        h(NqButton, { variant: "outline", size: "sm", onClick: () => tr.value.setLocale(tr.value.locale === "ar" ? "en" : "ar") }, () => "العربية / English"),
      ]);
  },
});
</script>

<template>
  <NasaqProvider target="scope">
    <NqTranslationsProvider :messages="messages" :storage-key="null">
      <Nav :unread="3" />
    </NqTranslationsProvider>
  </NasaqProvider>
</template>
