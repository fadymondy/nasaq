<script setup lang="ts">
import { NqButton, NqConfirmProvider, useConfirm } from "@fadymondy/nasaq/vue";
import { defineComponent, h } from "vue";

async function deleteProject(_id: string) {}

const DeleteProject = defineComponent({
  props: { id: { type: String, required: true }, name: { type: String, required: true } },
  setup(props) {
    const confirm = useConfirm();
    async function onDelete() {
      if (!(await confirm({ title: `Delete ${props.name}?`, description: "Its tasks and files are deleted too. This can't be undone.", confirmLabel: "Delete" }))) return;
      await deleteProject(props.id);
    }
    return () => h(NqButton, { variant: "danger", onClick: onDelete }, () => "Delete");
  },
});
</script>

<template>
  <NqConfirmProvider>
    <DeleteProject id="p1" name="Billing" />
  </NqConfirmProvider>
</template>
