<script setup lang="ts">
import { CreditCard, UserRound } from "lucide-vue-next";
import { NqDropdownMenuItem, NqSidebar, NqSidebarFooter, NqUserMenu } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqSidebar>
    <NqSidebarFooter>
      <NqUserMenu :user="{ name: 'Fady Mondy', email: 'hello@example.com' }" @sign-out="() => console.log('sign out')">
        <NqDropdownMenuItem>
          <UserRound />
          Account
        </NqDropdownMenuItem>
        <NqDropdownMenuItem>
          <CreditCard />
          Billing
        </NqDropdownMenuItem>
      </NqUserMenu>
    </NqSidebarFooter>
  </NqSidebar>
</template>
