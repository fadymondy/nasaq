<script setup lang="ts">
import { NqAdminArea, NqAdminPage } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="h-[32rem] w-full overflow-hidden rounded-floating border border-border">
    <NqAdminArea active-item="users" :user="{ name: 'Sara Alharbi', email: 'sara@example.com' }" environment="Production">
      <NqAdminPage title="Users" :breadcrumbs="[{ label: 'People' }, { label: 'Users' }]">
        <p class="text-body-sm text-muted-foreground">Your screen goes here.</p>
      </NqAdminPage>
    </NqAdminArea>
  </div>
</template>
