<script setup lang="ts">
import { NqAgentConfirm, NqAgentSteps, type AgentChange, type AgentStep } from "@fadymondy/nasaq/vue";

const steps: AgentStep[] = [
  { id: "s1", label: "Read the tag list", tool: "tags.list", status: "done", durationMs: 420, args: { limit: 50, token: "tok-123" }, result: '{"count":42}' },
  { id: "s2", label: "Rename 2 tags and delete 1 duplicate", tool: "tags.update", status: "awaiting" },
  { id: "s3", label: "Send the summary email", tool: "mail.send", status: "pending" },
];
const changes: AgentChange[] = [
  { id: "c1", title: "Rename tag", target: "tags/launch", before: "name: launch\ncolor: blue", after: "name: product-launch\ncolor: blue" },
  { id: "c2", title: "Delete duplicate", target: "tags/launch-2", before: "name: launch-2", risk: "high" },
];

const apply = async (_ids: string[]) => {};
const reject = async (_reason?: string) => {};
</script>

<template>
  <NqAgentSteps :steps="steps" :redact-keys="['token', 'password']" :on-retry="(id: string) => id">
    <template #confirm>
      <NqAgentConfirm :changes="changes" summary="I will rename 2 tags and delete 1 duplicate." :on-apply="apply" :on-reject="reject" />
    </template>
  </NqAgentSteps>
</template>
