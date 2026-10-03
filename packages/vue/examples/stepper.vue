<script setup lang="ts">
import { NqStepper, NqStepperItem } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqStepper :current="1" aria-label="Setup steps">
    <NqStepperItem title="Account" description="Name and email" />
    <NqStepperItem title="Workspace" description="Pick a plan" />
    <NqStepperItem title="Invite" description="Add your team" />
  </NqStepper>
</template>
