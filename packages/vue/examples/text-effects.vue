<script setup lang="ts">
import { NqHandwrittenMark, NqHandwrittenNote, NqMarquee, NqTextFlip, NqTextReveal, NqTextShimmer } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col items-start gap-6">
    <h2 class="text-h2">Ship <NqTextFlip :phrases="['faster', 'safer', 'together']" /></h2>
    <NqTextShimmer>Thinking it through</NqTextShimmer>
    <NqTextReveal text="Words fade and rise into place as you scroll." immediate />
    <p>Mark <NqHandwrittenMark kind="underline">the important part</NqHandwrittenMark> by hand.</p>
    <NqHandwrittenNote author="Fady">Remember to say thanks.</NqHandwrittenNote>
    <NqMarquee class="w-full"><span class="px-4">Fast</span><span class="px-4">Bilingual</span><span class="px-4">Accessible</span></NqMarquee>
  </div>
</template>
