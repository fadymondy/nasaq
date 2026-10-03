<script setup lang="ts">
import {
  NqBadge, NqButton, NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle,
} from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqCard class="max-w-sm">
    <NqCardHeader>
      <NqCardTitle>إعدادات المشروع</NqCardTitle>
      <NqCardDescription>الاسم والظهور والمسؤول الافتراضي.</NqCardDescription>
      <NqCardAction>
        <NqBadge variant="success">نشط</NqBadge>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="text-body-sm text-muted-foreground">
      تجمع البطاقة موضوعًا واحدًا. اجعل إجراءً رئيسيًا واحدًا في التذييل.
    </NqCardContent>
    <NqCardFooter class="justify-end gap-2">
      <NqButton variant="ghost">إلغاء</NqButton>
      <NqButton variant="primary">حفظ</NqButton>
    </NqCardFooter>
  </NqCard>
</template>
