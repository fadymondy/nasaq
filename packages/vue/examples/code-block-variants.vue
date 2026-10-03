<script setup lang="ts">
import { NqCodeBlockAI, NqCodeTabs, NqCommandSnippet, execTabs, packageManagerTabs } from "@fadymondy/nasaq/vue";

const install = packageManagerTabs("@nasaq/web");
const run = execTabs("shadcn@latest add button");
const code = 'export const greet = (name: string) => `Hello, ${name}`;\n';
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqCommandSnippet command="$ npm i @nasaq/web" />
    <NqCodeTabs :tabs="install" sync-key="pm" title="Install" />
    <NqCodeTabs :tabs="run" sync-key="pm" ai-copy />
    <NqCodeBlockAI :code="code" language="ts" filename="greet.ts" />
  </div>
</template>
