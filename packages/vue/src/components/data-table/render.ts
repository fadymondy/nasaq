import type { FunctionalComponent, VNodeChild } from "vue";

/** Renders a column's `cell`, `header` or `render` result, which may be text or vnodes. Internal to the data table. */
export const NqDtRender: FunctionalComponent<{ content?: unknown }> = (props) => (props.content ?? null) as VNodeChild as never;
NqDtRender.props = ["content"];
