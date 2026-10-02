// Inline styles of the animated text pieces. The Blade parts render the same strings in PHP (text-effects/_logic.blade.php), so the first paint matches.

const FLIP_OUT_MS = 240;

/** The inline style of one flipping token. */
export function flipTokenStyle(active: boolean, delay: number, reduced = false): string {
  if (reduced) return `opacity: ${active ? 1 : 0}`;
  return [
    `opacity: ${active ? 1 : 0}`,
    `transform: ${active ? "none" : "rotateX(-90deg) translateY(0.35em)"}`,
    "transition-property: transform, opacity",
    `transition-duration: ${active ? "420ms, 320ms" : `${FLIP_OUT_MS}ms, ${FLIP_OUT_MS}ms`}`,
    "transition-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1)",
    `transition-delay: ${active ? FLIP_OUT_MS + delay : delay}ms`,
  ].join("; ");
}

/** The inline style of one revealed token. */
export function revealTokenStyle(shown: boolean, delay: number): string {
  return [
    `opacity: ${shown ? 1 : 0}`,
    `transform: ${shown ? "none" : "translateY(0.4em)"}`,
    `filter: ${shown ? "none" : "blur(4px)"}`,
    "transition: opacity 420ms ease-out, transform 420ms ease-out, filter 420ms ease-out",
    `transition-delay: ${delay}ms`,
  ].join("; ");
}
