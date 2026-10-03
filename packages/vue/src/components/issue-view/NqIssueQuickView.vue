<script setup lang="ts">
import { ExternalLink } from "lucide-vue-next";
import { useAttrs } from "vue";
import { NqButton } from "../button";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetHeader, NqSheetTitle } from "../sheet";
import type { Issue } from "./issue-logic";
import NqIssueView from "./NqIssueView.vue";
import { useIssueStrings } from "./strings";

// The issue in a side drawer, for boards and lists: the same content as NqIssueView, stacked for a narrow panel.
// Every other NqIssueView prop (statuses, labels, people, projects, onUpdate, thread...) passes straight through.
type ViewProps = InstanceType<typeof NqIssueView>["$props"];
interface Props extends /* @vue-ignore */ Omit<ViewProps, "variant" | "onBack"> {
  open: boolean;
  /** Opens the full page for the issue. Shows an "Open" button in the header. */
  onOpenFull?: (issue: Issue) => void;
  issue: Issue;
}
const props = defineProps<Props>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
const emit = defineEmits<{ "update:open": [open: boolean] }>();
const { t } = useIssueStrings(() => attrs.labelsText as ViewProps["labelsText"]);
</script>

<template>
  <NqSheet :open="props.open" @update:open="(v) => emit('update:open', v)">
    <NqSheetContent side="end" class="w-[min(46rem,100vw)]">
      <NqSheetHeader>
        <NqSheetTitle class="flex items-center gap-2">
          <bdi dir="ltr" class="font-mono text-body">{{ props.issue.key }}</bdi>
        </NqSheetTitle>
        <NqSheetDescription class="sr-only">{{ props.issue.title }}</NqSheetDescription>
        <NqButton v-if="props.onOpenFull" variant="ghost" size="sm" class="self-start" @click="props.onOpenFull(props.issue)">
          <ExternalLink aria-hidden="true" />
          {{ t.open }}
        </NqButton>
      </NqSheetHeader>
      <NqSheetBody>
        <NqIssueView v-bind="(attrs as unknown as ViewProps)" :issue="props.issue" variant="drawer" />
      </NqSheetBody>
    </NqSheetContent>
  </NqSheet>
</template>
