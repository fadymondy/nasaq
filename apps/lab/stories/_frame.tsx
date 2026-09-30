import type { Decorator } from "@storybook/react-vite";

/** Wraps a story in a sized box (and optionally a product's brand scope). Typed, so `meta` stays portable. */
export function frame(className: string, brand?: string): Decorator {
  return (Story) => (
    <div data-brand={brand} className={className}>
      <Story />
    </div>
  );
}
