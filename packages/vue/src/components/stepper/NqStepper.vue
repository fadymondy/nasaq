<script lang="ts">
import { Comment, defineComponent, Fragment, h, provide, type PropType, type VNode } from "vue";
import { cn } from "../../lib/cn";
import { STEPPER_KEY, StepperItemScope, type StepperOrientation } from "./context";

function flatten(nodes: VNode[] | undefined): VNode[] {
  const out: VNode[] = [];
  for (const node of nodes ?? []) {
    if (node.type === Fragment) out.push(...flatten(node.children as VNode[]));
    else if (node.type !== Comment) out.push(node);
  }
  return out;
}

// A row (or column) of steps with connectors. State is derived from `current`; an item can add `error`.
export default defineComponent({
  name: "NqStepper",
  inheritAttrs: false,
  props: {
    /** Zero-based index of the current step. Earlier steps are complete, later ones upcoming. */
    current: { type: Number, required: true },
    /** "horizontal" (default) runs along the inline axis, so it reads right to left in RTL. "vertical" stacks the steps. */
    orientation: { type: String as PropType<StepperOrientation>, default: "horizontal" },
    class: { type: null as unknown as PropType<unknown>, default: undefined },
  },
  setup(props, { slots, attrs }) {
    provide(STEPPER_KEY, () => ({ current: props.current, orientation: props.orientation }));
    return () => {
      const items = flatten(slots.default?.());
      return h(
        "ol",
        {
          "data-slot": "stepper",
          "data-orientation": props.orientation,
          class: cn("m-0 flex list-none p-0", props.orientation === "horizontal" ? "flex-row items-start" : "flex-col", props.class as never),
          ...attrs,
        },
        items.map((child, index) => h(StepperItemScope, { key: child.key ?? index, index, last: index === items.length - 1 }, () => child)),
      );
    };
  },
});
</script>
