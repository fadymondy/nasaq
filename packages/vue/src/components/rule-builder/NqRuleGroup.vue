<script setup lang="ts">
import { Plus, Trash2 } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import type { RuleCtx } from "./context";
import NqRuleCondition from "./NqRuleCondition.vue";
import { addChild, newCondition, newGroup, removeNode, updateNode, type RuleGroup, type RuleJoin } from "./rule-model";

// One group of conditions: match all / any, its conditions, and nested groups (up to maxDepth).
defineOptions({ name: "NqRuleGroup" });
const props = defineProps<{ group: RuleGroup; root: RuleGroup; ctx: RuleCtx; depth: number; removable?: boolean }>();
const emit = defineEmits<{ change: [next: RuleGroup]; remove: [] }>();

const setJoin = (join: RuleJoin) => emit("change", updateNode(props.root, props.group.id, (n) => (n.kind === "group" ? { ...n, join } : n)));
</script>

<template>
  <div
    :data-group="group.id"
    role="group"
    :aria-label="ctx.t.groupLabel(group.join === 'and' ? ctx.t.matchAll : ctx.t.matchAny)"
    :class="cn('flex flex-col gap-3 rounded-control border border-border p-3', depth > 1 && 'bg-nq-surface-soft')"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-label text-muted-foreground">{{ ctx.t.match }}</span>
      <NqToggleGroup :model-value="[group.join]" :aria-label="ctx.t.match" :disabled="ctx.disabled" @update:model-value="(v) => v[0] && setJoin(v[0] as RuleJoin)">
        <NqToggle value="and">{{ ctx.t.matchAll }}</NqToggle>
        <NqToggle value="or">{{ ctx.t.matchAny }}</NqToggle>
      </NqToggleGroup>
      <NqButton v-if="removable" variant="ghost" size="sm" class="ms-auto" :disabled="ctx.disabled" @click="emit('remove')">
        <Trash2 aria-hidden="true" />
        {{ ctx.t.removeGroup }}
      </NqButton>
    </div>
    <p v-if="group.children.length === 0" class="text-body-sm text-muted-foreground">{{ ctx.t.noConditions }}</p>
    <ul class="flex flex-col gap-3">
      <template v-for="c in group.children" :key="c.id">
        <li v-if="c.kind === 'group'">
          <NqRuleGroup :group="c" :root="root" :ctx="ctx" :depth="depth + 1" removable @change="(next) => emit('change', next)" @remove="emit('change', removeNode(root, c.id))" />
        </li>
        <NqRuleCondition v-else :cond="c" :ctx="ctx" @change="(next) => emit('change', updateNode(root, c.id, () => next))" @remove="emit('change', removeNode(root, c.id))" />
      </template>
    </ul>
    <div class="flex flex-wrap gap-2">
      <NqButton variant="secondary" size="sm" :disabled="ctx.disabled" @click="emit('change', addChild(root, group.id, newCondition(ctx.fields[0])))">
        <Plus aria-hidden="true" />
        {{ ctx.t.addCondition }}
      </NqButton>
      <NqButton v-if="depth < ctx.maxDepth" variant="ghost" size="sm" :disabled="ctx.disabled" @click="emit('change', addChild(root, group.id, newGroup(group.join === 'and' ? 'or' : 'and')))">
        <Plus aria-hidden="true" />
        {{ ctx.t.addGroup }}
      </NqButton>
    </div>
  </div>
</template>
