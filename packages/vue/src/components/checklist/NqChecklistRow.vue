<script setup lang="ts">
import { ChevronDown, Paperclip, Plus, Trash2, X } from "lucide-vue-next";
import { computed, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqContextMenu, NqContextMenuContent, NqContextMenuItem, NqContextMenuTrigger } from "../context-menu";
import { NqNum } from "../numeric";
import { attachmentSize, isItemDone, subtaskState, type ChecklistItem } from "./checklist-logic";
import type { Strings } from "./checklist-strings";
import NqChecklistAddRow from "./NqChecklistAddRow.vue";

type Result = void | { error?: string };

// One item or subtask. It renders its own subtasks by calling itself with `child`.
export interface RowContext {
  t: Strings;
  readOnly: boolean;
  run: (fn: () => Promise<Result> | undefined) => Promise<boolean>;
  onToggle: (id: string, done: boolean) => Promise<Result>;
  onAdd?: (text: string, parentId?: string) => Promise<Result>;
  onRemove?: (id: string) => Promise<Result>;
  onAttach?: (id: string, files: File[]) => Promise<Result>;
  onRemoveAttachment?: (itemId: string, attachmentId: string) => Promise<Result>;
}
const props = defineProps<{ item: ChecklistItem; ctx: RowContext; child?: boolean }>();

const open = ref(true);
const adding = ref(false);
const fileRef = ref<HTMLInputElement | null>(null);
const subs = computed(() => props.item.subtasks ?? []);
const state = computed(() => subtaskState(props.item));
const done = computed(() => isItemDone(props.item));
const doneSubs = computed(() => subs.value.filter((s) => s.done).length);
const c = computed(() => props.ctx);
const menuEnabled = computed(() => !c.value.readOnly && Boolean((!props.child && c.value.onAdd) || c.value.onAttach || c.value.onRemove));

const remove = () => void c.value.run(() => c.value.onRemove?.(props.item.id));
function files(e: Event) {
  const input = e.currentTarget as HTMLInputElement;
  const list = Array.from(input.files ?? []);
  input.value = "";
  if (list.length) void c.value.run(() => c.value.onAttach?.(props.item.id, list));
}
</script>

<template>
  <li data-slot="checklist-item" :data-done="done || undefined" class="flex flex-col gap-1.5">
    <component :is="menuEnabled ? NqContextMenu : 'div'" :class="menuEnabled ? undefined : 'contents'">
      <component :is="menuEnabled ? NqContextMenuTrigger : 'div'" :class="menuEnabled ? undefined : 'contents'">
        <div class="group flex items-start gap-2.5 rounded-control px-1 py-1 hover:bg-nq-hover">
          <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
            <NqCheckbox
              class="mt-0.5"
              :model-value="done"
              :indeterminate="state === 'some'"
              :disabled="c.readOnly"
              :aria-label="props.item.text"
              @update:model-value="(v: boolean) => c.run(() => c.onToggle(props.item.id, v))"
            />
            <span class="flex min-w-0 flex-col">
              <span :class="cn('text-body-sm text-foreground', done && 'text-muted-foreground line-through')">{{ props.item.text }}</span>
              <span v-if="props.item.meta" class="text-caption text-muted-foreground">{{ props.item.meta }}</span>
            </span>
          </label>
          <span v-if="subs.length > 0" dir="ltr" class="mt-0.5 shrink-0 text-caption text-muted-foreground">
            <NqNum :value="doneSubs" />/<NqNum :value="subs.length" />
          </span>
          <div class="flex shrink-0 items-center">
            <NqButton v-if="!props.child && !c.readOnly && c.onAdd" variant="ghost" size="icon-sm" :aria-label="c.t.addSubtaskFor(props.item.text)" @click="adding = !adding">
              <Plus aria-hidden="true" />
            </NqButton>
            <template v-if="!c.readOnly && c.onAttach">
              <NqButton variant="ghost" size="icon-sm" :aria-label="c.t.attachFor(props.item.text)" @click="fileRef?.click()">
                <Paperclip aria-hidden="true" />
              </NqButton>
              <input ref="fileRef" type="file" multiple class="sr-only" tabindex="-1" @change="files" />
            </template>
            <NqButton v-if="!c.readOnly && c.onRemove" variant="ghost" size="icon-sm" :aria-label="c.t.removeFor(props.item.text)" @click="remove">
              <Trash2 aria-hidden="true" />
            </NqButton>
            <NqButton
              v-if="subs.length > 0"
              variant="ghost"
              size="icon-sm"
              :aria-expanded="open"
              :aria-label="(open ? c.t.collapse : c.t.expand)(props.item.text)"
              @click="open = !open"
            >
              <ChevronDown aria-hidden="true" :class="cn('transition-transform duration-150', !open && '-rotate-90 rtl:rotate-90')" />
            </NqButton>
          </div>
        </div>
      </component>
      <NqContextMenuContent v-if="menuEnabled">
        <NqContextMenuItem v-if="!props.child && c.onAdd" @select="adding = true">
          <Plus aria-hidden="true" />
          {{ c.t.addSubtask }}
        </NqContextMenuItem>
        <NqContextMenuItem v-if="c.onAttach" @select="fileRef?.click()">
          <Paperclip aria-hidden="true" />
          {{ c.t.attach }}
        </NqContextMenuItem>
        <NqContextMenuItem v-if="c.onRemove" variant="danger" @select="remove">
          <Trash2 aria-hidden="true" />
          {{ c.t.remove }}
        </NqContextMenuItem>
      </NqContextMenuContent>
    </component>

    <ul v-if="props.item.attachments && props.item.attachments.length > 0" class="flex flex-wrap gap-1.5 ps-8" :aria-label="c.t.attach">
      <li v-for="a in props.item.attachments" :key="a.id" class="inline-flex max-w-full items-center gap-1 rounded-control border border-border bg-secondary px-2 py-0.5 text-caption text-foreground">
        <Paperclip aria-hidden="true" class="size-3 shrink-0 text-muted-foreground" />
        <a v-if="a.url" :href="a.url" dir="auto" class="truncate underline-offset-2 hover:underline">{{ a.name }}</a>
        <span v-else dir="auto" class="truncate">{{ a.name }}</span>
        <bdi v-if="a.size !== undefined" class="text-muted-foreground">{{ attachmentSize(a.size) }}</bdi>
        <button
          v-if="!c.readOnly && c.onRemoveAttachment"
          type="button"
          :aria-label="c.t.removeAttachment(a.name)"
          class="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="c.run(() => c.onRemoveAttachment?.(props.item.id, a.id))"
        >
          <X aria-hidden="true" class="size-3" />
        </button>
      </li>
    </ul>

    <ul v-if="subs.length > 0 && open" class="ms-3 flex flex-col gap-1 border-s border-border ps-4">
      <NqChecklistRow v-for="s in subs" :key="s.id" :item="s" :ctx="c" child />
    </ul>

    <div v-if="adding && c.onAdd" class="ms-3 ps-4">
      <NqChecklistAddRow
        autofocus
        :label="c.t.addSubtask"
        :placeholder="c.t.subtaskPlaceholder"
        :t="c.t"
        :on-submit="(text: string) => c.run(() => c.onAdd?.(text, props.item.id))"
        @cancel="adding = false"
      />
    </div>
  </li>
</template>
