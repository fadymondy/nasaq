<script setup lang="ts">
import { Folder, Home, Inbox, Settings } from "lucide-vue-next";
import {
  NqAppBreadcrumbs,
  NqAppCrumb,
  NqAppHeader,
  NqAppMain,
  NqAppPageHeader,
  NqAppShell,
  NqSidebar,
  NqSidebarBrand,
  NqSidebarContent,
  NqSidebarFooter,
  NqSidebarGroup,
  NqSidebarHeader,
  NqSidebarItem,
  NqSidebarNest,
  NqSidebarStatus,
  NqSidebarSubItem,
  NqSidebarTrigger,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqAppShell class="min-h-96">
    <template #sidebar>
      <NqSidebar>
        <NqSidebarHeader><NqSidebarBrand /></NqSidebarHeader>
        <NqSidebarContent>
          <NqSidebarGroup label="Workspace">
            <NqSidebarItem active href="#"><template #icon><Home /></template>Overview</NqSidebarItem>
            <NqSidebarItem href="#"><template #icon><Inbox /></template>Inbox<template #trailing>3</template></NqSidebarItem>
            <NqSidebarNest label="Projects">
              <template #icon><Folder /></template>
              <NqSidebarSubItem href="#">Website</NqSidebarSubItem>
              <NqSidebarSubItem href="#">Mobile app</NqSidebarSubItem>
            </NqSidebarNest>
          </NqSidebarGroup>
        </NqSidebarContent>
        <NqSidebarFooter>
          <NqSidebarItem href="#"><template #icon><Settings /></template>Settings</NqSidebarItem>
          <NqSidebarStatus href="#">All systems normal</NqSidebarStatus>
        </NqSidebarFooter>
      </NqSidebar>
    </template>
    <NqAppHeader>
      <NqSidebarTrigger />
      <NqAppBreadcrumbs>
        <NqAppCrumb href="#">Acme</NqAppCrumb>
        <NqAppCrumb current>Website</NqAppCrumb>
      </NqAppBreadcrumbs>
    </NqAppHeader>
    <NqAppMain>
      <NqAppPageHeader title="Overview" description="What happened in the last 7 days." />
    </NqAppMain>
  </NqAppShell>
</template>
