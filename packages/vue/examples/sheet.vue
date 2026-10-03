<script setup lang="ts">
import {
  NqButton, NqField, NqFieldLabel, NqInput, NqSheet, NqSheetBody, NqSheetClose, NqSheetContent,
  NqSheetDescription, NqSheetFooter, NqSheetHeader, NqSheetTitle, NqSheetTrigger,
} from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const name = ref("Nasaq");
</script>

<template>
  <NqSheet>
    <NqSheetTrigger as-child><NqButton>Edit project</NqButton></NqSheetTrigger>
    <NqSheetContent side="end">
      <NqSheetHeader>
        <NqSheetTitle>Edit project</NqSheetTitle>
        <NqSheetDescription>Changes save when you press Save.</NqSheetDescription>
      </NqSheetHeader>
      <NqSheetBody class="flex flex-col gap-4 p-4">
        <NqField>
          <NqFieldLabel>Name</NqFieldLabel>
          <NqInput v-model="name" />
        </NqField>
      </NqSheetBody>
      <NqSheetFooter class="justify-end">
        <NqSheetClose as-child><NqButton variant="ghost">Cancel</NqButton></NqSheetClose>
        <NqSheetClose as-child><NqButton variant="primary">Save</NqButton></NqSheetClose>
      </NqSheetFooter>
    </NqSheetContent>
  </NqSheet>
</template>
