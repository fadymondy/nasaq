<script setup lang="ts">
import { injectAccordionItemContext, injectCollapsibleRootContext, useId } from "reka-ui";
import { inject, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { presence } from "../../lib/presence";
import { ACCORDION_PANEL_ID } from "./context";

// Same disclosure motion as NqCollapsiblePanel: height + opacity, 200ms.
interface Props {
  /** Keep the panel in the DOM while closed. */
  keepMounted?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { keepMounted: false });
const item = injectAccordionItemContext();
// An accordion item is a Reka collapsible: its trigger points aria-controls at the id set here.
const root = injectCollapsibleRootContext();
const id = inject(ACCORDION_PANEL_ID, undefined) ?? useId(undefined, "nq-accordion-panel");
(root as { contentId: string }).contentId = id;

const HEIGHT = "--accordion-panel-height";
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
      v-if="props.keepMounted || item.open.value"
      v-show="item.open.value"
      :id="id"
      role="region"
      :aria-labelledby="item.triggerId"
      data-slot="accordion-panel"
      :data-open="item.open.value ? '' : undefined"
      :data-closed="item.open.value ? undefined : ''"
      :data-disabled="item.disabled.value ? '' : undefined"
      :class="
        cn(
          'h-(--accordion-panel-height) overflow-hidden text-body-sm text-muted-foreground transition-[height,opacity] duration-200 ease-nq motion-reduce:transition-none',
          'data-starting-style:h-0 data-starting-style:opacity-0 data-ending-style:h-0 data-ending-style:opacity-0',
          props.class,
        )
      "
    >
      <div class="px-4 pb-4"><slot /></div>
    </div>
  </Transition>
</template>
