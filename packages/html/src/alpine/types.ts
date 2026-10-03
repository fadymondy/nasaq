// The slice of the Alpine API the runtime uses; declared here so the published types need no @types/alpinejs.

export interface DirectiveUtilities {
  cleanup(fn: () => void): void;
  effect(fn: () => void): unknown;
  evaluateLater<T>(expression: string): (callback: (value: T) => void) => void;
}

export interface AlpineLike {
  store(name: string, value?: unknown): unknown;
  magic(name: string, callback: (el: Element) => unknown): void;
  directive(
    name: string,
    callback: (el: Element, directive: { value: string; expression: string; modifiers: string[] }, utilities: DirectiveUtilities) => void,
  ): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(name: string, callback: (...args: any[]) => Record<string, any>): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugin(plugin: (alpine: any) => void): void;
}

/** What `this` holds inside an Alpine.data component: its own state plus Alpine's magics. */
export interface Magics {
  $el: HTMLElement;
  $root: HTMLElement;
  $refs: Record<string, HTMLElement>;
  $id(name: string, key?: string | number): string;
  $watch<T>(key: string, fn: (value: T, oldValue: T) => void): void;
  $nextTick(fn?: () => void): Promise<void>;
  $dispatch(event: string, detail?: unknown): void;
}

/** One per-component module: `register(Alpine)` adds its Alpine.data (and any directives). */
export type Register = (Alpine: AlpineLike) => void;
