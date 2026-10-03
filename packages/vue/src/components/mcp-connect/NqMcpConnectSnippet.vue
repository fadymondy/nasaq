<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { computed } from "vue";
import { buttonVariants } from "../button";
import { NqCodeBlock } from "../code-block";
import { NqCopyButton } from "../copy-button";
import type { McpConnectLabels } from "./strings";
import { type McpClientId, type McpServerInfo, maskToken, mcpSnippet } from "./snippets";

// One client's snippet: the file name and copy button on top, the code below (token masked until revealed), the install link.
const props = defineProps<{ client: McpClientId; server: McpServerInfo; reveal: boolean; t: McpConnectLabels }>();
const real = computed(() => mcpSnippet(props.client, props.server));
const shown = computed(() => (props.server.token && !props.reveal ? mcpSnippet(props.client, props.server, maskToken(props.server.token)) : real.value));
const deepLabel = computed(() => props.t.deepLink[props.client]);
</script>

<template>
  <div class="flex flex-col gap-3">
    <div data-slot="mcp-snippet" class="overflow-hidden rounded-surface border border-border" dir="ltr">
      <div class="flex h-row items-center justify-between gap-2 border-b border-border bg-nq-surface-soft ps-3 pe-1.5 font-mono text-caption text-muted-foreground">
        <span class="truncate">{{ real.target }}</span>
        <NqCopyButton :value="real.code" :label="props.t.copySnippet(real.target)" />
      </div>
      <NqCodeBlock :code="shown.code" :language="real.language" :copyable="false" :label="real.target" class="rounded-none border-0" />
    </div>
    <div v-if="real.deepLink && deepLabel">
      <a :href="real.deepLink" data-slot="mcp-deep-link" :class="buttonVariants({ variant: 'secondary', size: 'sm' })">
        <ExternalLink aria-hidden="true" />
        {{ deepLabel }}
      </a>
    </div>
  </div>
</template>
