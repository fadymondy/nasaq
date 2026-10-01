<script setup lang="ts">
import { NqBreadcrumb, NqBreadcrumbItem, NqBreadcrumbLink, NqBreadcrumbList, NqBreadcrumbPage, NqBreadcrumbSeparator } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqBreadcrumb>
    <NqBreadcrumbList>
      <NqBreadcrumbItem>
        <NqBreadcrumbLink href="/">3x1</NqBreadcrumbLink>
      </NqBreadcrumbItem>
      <NqBreadcrumbSeparator />
      <NqBreadcrumbItem>
        <NqBreadcrumbLink href="/projects">Projects</NqBreadcrumbLink>
      </NqBreadcrumbItem>
      <NqBreadcrumbSeparator />
      <NqBreadcrumbItem>
        <NqBreadcrumbPage>Nasaq</NqBreadcrumbPage>
      </NqBreadcrumbItem>
    </NqBreadcrumbList>
  </NqBreadcrumb>
</template>
