<script setup lang="ts">
import { NqAuthFooter, NqAuthLayout } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAuthLayout title="Sign in" description="Use your work email to continue.">
    <p class="text-center text-body-sm text-muted-foreground">The sign-in form goes here.</p>
    <template #prompt>Don't have an account? <a href="/sign-up">Create one</a></template>
    <template #footer><NqAuthFooter :links="[{ label: 'Terms', href: '/terms' }, { label: 'Privacy', href: '/privacy' }]" /></template>
  </NqAuthLayout>
</template>
