<script setup lang="ts">
import { injectCollapsibleRootContext, useId } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";

// Disclosure is one of the three places Nasaq moves (ARCHITECTURE A-7): height + opacity, 200ms.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const root = injectCollapsibleRootContext();
const id = useId(undefined, "nq-collapsible-panel");
(root as { contentId: string }).contentId = id;

const HEIGHT = "--collapsible-panel-height";
const measure = (el: Element) => (el as HTMLElement).style.setProperty(HEIGHT, `${(el as HTMLElement).scrollHeight}px`);
const hooks = {
  ...presence,
  onEnter(el: Element, done: () => void) {
    measure(el);
    presence.onEnter(el, () => {
      (el as HTMLElement).style.setProperty(HEIGHT, "auto");
      done();
    });
  },
  onLeave(el: Element, done: () => void) {
    measure(el);
    void (el as HTMLElement).offsetHeight;
    presence.onLeave(el, done);
  },
};
</script>

<template>
  <Transition v-bind="hooks">
    <div
      v-if="root.open.value"
      :id="id"
      data-slot="collapsible-panel"
      data-open=""
      :data-disabled="root.disabled?.value ? '' : undefined"
      :class="
        cn(
          'h-(--collapsible-panel-height) overflow-hidden transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none',
          'data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <slot />
    </div>
  </Transition>
</template>
