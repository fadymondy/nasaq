<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import NqFirewallPanel from "./NqFirewallPanel.vue";
import NqHttpPanel from "./NqHttpPanel.vue";
import type { FirewallRule, HttpRule } from "./format";
import { useNetworkStrings, type NetworkRulesLabels, type NetworkRulesResult } from "./strings";

// A network rules editor in two tabs: firewall rules (allow or deny, protocol, port, source, ordered, first match
// wins) and HTTP rules (redirects, headers, basic auth, IP allow and block). Every edit is staged locally, marked
// New, Edited or Removed, and only sent when the user presses Apply. Row actions also open on context-click.
const props = withDefaults(
  defineProps<{
    /** The rules currently in force on the server, in order. */
    firewall: readonly FirewallRule[];
    /** HTTP rules in force. Leave out to hide the HTTP tab. */
    http?: readonly HttpRule[];
    loading?: boolean;
    /** Send the whole staged list. The host then passes the new `firewall` back. */
    onApplyFirewall: (rules: FirewallRule[]) => Promise<NetworkRulesResult>;
    onApplyHttp?: (rules: HttpRule[]) => Promise<NetworkRulesResult>;
    /** Which tab opens first. */
    defaultTab?: "firewall" | "http";
    labels?: NetworkRulesLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { http: undefined, loading: false, onApplyHttp: undefined, defaultTab: "firewall", labels: undefined },
);

const t = useNetworkStrings(() => props.labels);
</script>

<template>
  <div data-slot="network-rules" :class="cn('w-full', props.class)">
    <NqTabs :default-value="props.defaultTab">
      <NqTabsList variant="underline" :aria-label="t.firewall">
        <NqTabsTab value="firewall">{{ t.firewall }}</NqTabsTab>
        <NqTabsTab v-if="props.http && props.onApplyHttp" value="http">{{ t.http }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="firewall" class="pt-4">
        <NqFirewallPanel :applied="props.firewall" :on-apply="props.onApplyFirewall" :loading="props.loading" :t="t" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.http && props.onApplyHttp" value="http" class="pt-4">
        <NqHttpPanel :applied="props.http" :on-apply="props.onApplyHttp" :loading="props.loading" :t="t" />
      </NqTabsPanel>
    </NqTabs>
  </div>
</template>
