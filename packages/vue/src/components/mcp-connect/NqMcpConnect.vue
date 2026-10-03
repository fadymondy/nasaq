<script setup lang="ts">
import { Eye, EyeOff, Plug } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqCopyButton, NqCopyField } from "../copy-button";
import { NqField, NqFieldLabel } from "../field";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqMcpConnectSnippet from "./NqMcpConnectSnippet.vue";
import { MCP_CLIENTS, type McpClientId, type McpServerInfo, maskToken } from "./snippets";
import { STRINGS, type McpConnectLabels } from "./strings";
import type { McpTestResult } from "./types";

// Connect an MCP server to the AI clients people use. It shows the server URL and token, then one tab per client
// (Claude Code, Claude Desktop, Cursor, VS Code, or plain JSON) with the exact snippet to copy, the steps around it,
// and a one-click install link for Cursor and VS Code. A test button checks the server answers. The snippets are
// pure text, so nothing here needs a backend except `onTest`.
interface Props {
  /** The Streamable HTTP endpoint of the server. */
  serverUrl: string;
  /** The key the server gets in each client's config. Default "nasaq". */
  serverName?: string;
  /** A bearer token to put in the snippets. Omit to show a YOUR_TOKEN placeholder. */
  token?: string;
  /** Header that carries the token. Default `Authorization` (sent as `Bearer <token>`). */
  tokenHeader?: string;
  /** Which clients get a tab, in order. Default all five. */
  clients?: readonly McpClientId[];
  /** The tab open first. Default: the first client. */
  defaultClient?: McpClientId;
  /** Check the server answers. Resolve with the outcome; a rejection shows a generic failure. Omit to hide the test. */
  onTest?: () => Promise<McpTestResult>;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<McpConnectLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  serverName: "nasaq",
  token: undefined,
  tokenHeader: undefined,
  clients: () => MCP_CLIENTS,
  defaultClient: undefined,
  onTest: undefined,
  labels: undefined,
});

type TestState = { status: "idle" } | { status: "testing" } | { status: "done"; result: McpTestResult } | { status: "error" };

const nasaq = useNasaq();
const t = computed<McpConnectLabels>(() => ({ ...STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const reveal = ref(false);
const test = ref<TestState>({ status: "idle" });
const server = computed<McpServerInfo>(() => ({ name: props.serverName, url: props.serverUrl, token: props.token, header: props.tokenHeader }));
const first = computed(() => (props.defaultClient && props.clients.includes(props.defaultClient) ? props.defaultClient : props.clients[0]));

async function run() {
  if (!props.onTest || test.value.status === "testing") return;
  test.value = { status: "testing" };
  try {
    test.value = { status: "done", result: await props.onTest() };
  } catch {
    test.value = { status: "error" };
  }
}
</script>

<template>
  <NqCard data-slot="mcp-connect" :class="cn('w-full max-w-3xl', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-5">
      <div class="grid gap-4 sm:grid-cols-2">
        <NqField>
          <NqFieldLabel>{{ t.serverUrl }}</NqFieldLabel>
          <NqCopyField :value="props.serverUrl" :label="t.serverUrl" :copy-label="t.copy" />
        </NqField>
        <NqField v-if="props.token">
          <NqFieldLabel>{{ t.token }}</NqFieldLabel>
          <NqInputGroup data-slot="mcp-token">
            <NqInputGroupInput readonly ltr :aria-label="t.token" :model-value="reveal ? props.token : maskToken(props.token)" @focus="(e: FocusEvent) => (e.currentTarget as HTMLInputElement).select()" />
            <NqInputGroupAddon align="end">
              <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="reveal ? t.hideToken : t.showToken" :aria-pressed="reveal" @click="reveal = !reveal">
                <EyeOff v-if="reveal" aria-hidden="true" />
                <Eye v-else aria-hidden="true" />
              </NqButton>
              <NqCopyButton :value="props.token" :label="t.copyToken" />
            </NqInputGroupAddon>
          </NqInputGroup>
        </NqField>
      </div>
      <p v-if="props.token" class="text-caption text-muted-foreground">{{ t.tokenNote }}</p>
      <NqAlert v-else tone="info">{{ t.noToken }}</NqAlert>

      <NqTabs :default-value="first" class="gap-4">
        <NqTabsList :aria-label="t.clients">
          <NqTabsTab v-for="c in props.clients" :key="c" :value="c">{{ t.clientNames[c] }}</NqTabsTab>
          <NqTabsIndicator />
        </NqTabsList>
        <NqTabsPanel v-for="c in props.clients" :key="c" :value="c" class="flex flex-col gap-4">
          <ol class="flex flex-col gap-1.5 text-body-sm text-foreground">
            <li v-for="(s, i) in t.steps[c]" :key="s" class="flex gap-2.5">
              <span aria-hidden="true" class="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">{{ i + 1 }}</span>
              <span class="sr-only">{{ t.step(i + 1) }}: </span>
              <span class="min-w-0">{{ s }}</span>
            </li>
          </ol>
          <NqMcpConnectSnippet :client="c" :server="server" :reveal="reveal" :t="t" />
        </NqTabsPanel>
      </NqTabs>

      <div v-if="props.onTest" class="flex flex-col gap-3 border-t border-border pt-4" data-slot="mcp-test" :data-state="test.status">
        <div>
          <NqButton type="button" :loading="test.status === 'testing'" @click="run">
            <Plug aria-hidden="true" />
            {{ test.status === "testing" ? t.testing : t.test }}
          </NqButton>
        </div>
        <div role="status" aria-live="polite">
          <NqAlert v-if="test.status === 'done' && test.result.ok" tone="success" :title="t.testOk">{{ t.testOkDetail(test.result.latencyMs, test.result.tools) }}</NqAlert>
          <NqAlert v-if="test.status === 'done' && !test.result.ok" tone="danger" :title="t.testFailed">{{ test.result.error ?? t.testFailedFallback }}</NqAlert>
          <NqAlert v-if="test.status === 'error'" tone="danger">{{ t.unexpected }}</NqAlert>
        </div>
      </div>
    </NqCardContent>
  </NqCard>
</template>
