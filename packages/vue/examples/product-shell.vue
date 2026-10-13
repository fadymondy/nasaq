<script setup lang="ts">
// The product standard with the Vue parts: Dashboard → product groups → Reports → Integrations (AI & MCP first) → Settings.
import { BarChart3, CreditCard, LayoutDashboard, Plug, Settings, ShoppingBag, Users } from "lucide-vue-next";
import { NqAppHeader, NqAppMain, NqAppPageHeader, NqAppShell, NqSidebar, NqSidebarBrand, NqSidebarContent, NqSidebarGroup, NqSidebarHeader, NqSidebarItem, NqSidebarTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAppShell variant="inset" class="min-h-96">
    <template #sidebar>
      <NqSidebar aria-label="Main menu">
        <NqSidebarHeader><NqSidebarBrand label="Matjar" href="/admin" /></NqSidebarHeader>
        <NqSidebarContent>
          <NqSidebarGroup>
            <NqSidebarItem active href="/admin"><template #icon><LayoutDashboard /></template>Dashboard</NqSidebarItem>
          </NqSidebarGroup>
          <NqSidebarGroup label="Sales">
            <NqSidebarItem href="/admin/orders"><template #icon><ShoppingBag /></template>Orders</NqSidebarItem>
            <NqSidebarItem href="/admin/customers"><template #icon><Users /></template>Customers</NqSidebarItem>
          </NqSidebarGroup>
          <NqSidebarGroup label="Reports">
            <NqSidebarItem href="/admin/reports"><template #icon><BarChart3 /></template>Reports</NqSidebarItem>
          </NqSidebarGroup>
          <NqSidebarGroup label="Integrations">
            <NqSidebarItem href="/admin/mcp"><template #icon><Plug /></template>AI &amp; MCP</NqSidebarItem>
          </NqSidebarGroup>
          <NqSidebarGroup label="Settings">
            <NqSidebarItem href="/admin/settings"><template #icon><Settings /></template>Settings</NqSidebarItem>
            <NqSidebarItem href="/admin/team"><template #icon><Users /></template>Team</NqSidebarItem>
            <NqSidebarItem href="/admin/plan"><template #icon><CreditCard /></template>Billing</NqSidebarItem>
          </NqSidebarGroup>
        </NqSidebarContent>
      </NqSidebar>
    </template>
    <NqAppHeader><NqSidebarTrigger /></NqAppHeader>
    <NqAppMain><NqAppPageHeader title="Dashboard" /></NqAppMain>
  </NqAppShell>
</template>
