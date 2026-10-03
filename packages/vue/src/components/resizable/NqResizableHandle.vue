<script setup lang="ts">
import { GripHorizontal, GripVertical } from "lucide-vue-next";
import { SplitterResizeHandle } from "reka-ui";
import { computed, inject, onBeforeUnmount, onMounted, ref, type ComponentPublicInstance, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqIcon } from "../icon";
import { RESIZABLE_ORIENTATION } from "./context";

/** The draggable divider between two panels. Focusable: arrow keys resize, Home/End go to the limits, Enter collapses. */
interface Props {
  /** Show a grip on the handle. Default false. */
  withGrip?: boolean;
  /** Accessible name of the handle. Default "Resize panels" / "تغيير حجم اللوحات" by the Nasaq locale. */
  label?: string;
  disabled?: boolean;
  id?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { withGrip: false });
const emits = defineEmits<{ dragging: [value: boolean] }>();
const t = useT();
const horizontal = inject(RESIZABLE_ORIENTATION, "horizontal") === "horizontal";

// The React classes style data-separator (inactive | hover | active | disabled); Reka exposes data-state, so mirror it.
const handle = ref<ComponentPublicInstance | null>(null);
const state = ref("inactive");
let observer: MutationObserver | undefined;
onMounted(() => {
  const el = handle.value?.$el as HTMLElement | undefined;
  if (!el) return;
  const read = () => (state.value = el.getAttribute("data-state") ?? "inactive");
  read();
  observer = new MutationObserver(read);
  observer.observe(el, { attributes: true, attributeFilter: ["data-state"] });
});
onBeforeUnmount(() => observer?.disconnect());
const separator = computed(() => (props.disabled ? "disabled" : state.value === "drag" ? "active" : state.value));
</script>

<template>
  <SplitterResizeHandle
    ref="handle"
    data-slot="resizable-handle"
    :id="props.id"
    :disabled="props.disabled"
    :data-separator="separator"
    :aria-orientation="horizontal ? 'vertical' : 'horizontal'"
    :aria-label="props.label ?? t('Resize panels', 'تغيير حجم اللوحات')"
    :class="
      cn(
        'relative flex shrink-0 items-center justify-center bg-border outline-none transition-colors duration-150 ease-nq',
        horizontal ? 'w-px after:absolute after:inset-y-0 after:-inset-x-1.5' : 'h-px after:absolute after:inset-x-0 after:-inset-y-1.5',
        'data-[separator=hover]:bg-nq-focus data-[separator=active]:bg-nq-focus',
        'focus-visible:bg-nq-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus',
        'data-[separator=disabled]:pointer-events-none data-[separator=disabled]:opacity-50',
        props.class,
      )
    "
    @dragging="emits('dragging', $event)"
  >
    <div
      v-if="props.withGrip"
      data-slot="resizable-grip"
      :class="
        cn(
          'z-10 flex shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground',
          horizontal ? 'h-6 w-3' : 'h-3 w-6',
        )
      "
    >
      <NqIcon :icon="horizontal ? GripVertical : GripHorizontal" class="size-2.5" />
    </div>
    <slot />
  </SplitterResizeHandle>
</template>
