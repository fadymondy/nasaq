import { defineComponent, type PropType } from "vue";
import type { MarkdownContent } from "./types";

/** Renders a header or cell value: text, a VNode or a list of them. Internal. */
export default defineComponent({
  name: "NqMarkdownContent",
  props: { content: { type: [String, Number, Object, Array] as PropType<MarkdownContent>, default: null } },
  setup: (props) => () => props.content as never,
});
