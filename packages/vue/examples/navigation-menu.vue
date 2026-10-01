<script setup lang="ts">
import {
  NqNavigationMenu,
  NqNavigationMenuContent,
  NqNavigationMenuItem,
  NqNavigationMenuLink,
  NqNavigationMenuLinkItem,
  NqNavigationMenuLinkList,
  NqNavigationMenuList,
  NqNavigationMenuTrigger,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqNavigationMenu aria-label="Main">
    <NqNavigationMenuList>
      <NqNavigationMenuItem>
        <NqNavigationMenuTrigger>Resources</NqNavigationMenuTrigger>
        <NqNavigationMenuContent class="w-72">
          <NqNavigationMenuLinkList>
            <NqNavigationMenuLinkItem href="/docs" title="Documentation" description="Guides and API reference." />
            <NqNavigationMenuLinkItem href="/blog" title="Blog" description="Product news." />
          </NqNavigationMenuLinkList>
        </NqNavigationMenuContent>
      </NqNavigationMenuItem>
      <NqNavigationMenuItem>
        <NqNavigationMenuLink href="/pricing">Pricing</NqNavigationMenuLink>
      </NqNavigationMenuItem>
    </NqNavigationMenuList>
  </NqNavigationMenu>
</template>
