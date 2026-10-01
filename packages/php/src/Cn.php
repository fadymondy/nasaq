<?php

namespace Nasaq;

/**
 * A small tailwind-merge for Blade: later classes win over earlier ones in the same group, so
 * <x-nq::button class="h-12 px-8"> replaces the button's own height and padding instead of fighting it.
 *
 * It knows the groups components actually override (sizing, spacing, colour, type, radius, border, layout)
 * and Nasaq's own theme names (text-label, rounded-control, h-control ...). Anything it does not know is kept as is.
 */
class Cn
{
    private const TEXT_SIZES = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
        'display', 'h1', 'h2', 'h3', 'body', 'body-sm', 'label', 'caption', 'eyebrow', 'code'];

    private const DISPLAY = ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'contents', 'hidden', 'table', 'flow-root', 'list-item'];

    private const POSITION = ['static', 'fixed', 'absolute', 'relative', 'sticky'];

    /** Groups a later class in the key group also clears (p-4 clears px-2, size-8 clears h-4). */
    private const CLEARS = [
        'p' => ['px', 'py', 'ps', 'pe', 'pt', 'pb', 'pl', 'pr'], 'px' => ['ps', 'pe', 'pl', 'pr'], 'py' => ['pt', 'pb'],
        'm' => ['mx', 'my', 'ms', 'me', 'mt', 'mb', 'ml', 'mr'], 'mx' => ['ms', 'me', 'ml', 'mr'], 'my' => ['mt', 'mb'],
        'size' => ['w', 'h'], 'inset' => ['inset-x', 'inset-y', 'top', 'bottom', 'start', 'end', 'left', 'right'],
        'gap' => ['gap-x', 'gap-y'], 'rounded' => ['rounded-s', 'rounded-e', 'rounded-t', 'rounded-b', 'rounded-l', 'rounded-r'],
    ];

    public static function merge(string ...$lists): string
    {
        $out = [];
        foreach ($lists as $list) {
            foreach (preg_split('/\s+/', trim($list)) as $class) {
                if ($class === '') {
                    continue;
                }
                [$variants, $group] = self::group($class);
                if ($group !== null) {
                    $clear = array_merge([$group], self::CLEARS[$group] ?? []);
                    foreach ($out as $i => [$v, $g]) {
                        if ($v === $variants && in_array($g, $clear, true)) {
                            unset($out[$i]);
                        }
                    }
                }
                $out[] = [$variants, $group, $class];
            }
        }

        return implode(' ', array_map(fn ($c) => $c[2], $out));
    }

    /** @return array{0: string, 1: ?string} [variant prefix, conflict group] */
    private static function group(string $class): array
    {
        // Split "md:hover:bg-x" at the last ':' outside [...].
        $depth = 0;
        $cut = -1;
        for ($i = 0, $n = strlen($class); $i < $n; $i++) {
            $ch = $class[$i];
            if ($ch === '[' || $ch === '(') {
                $depth++;
            } elseif ($ch === ']' || $ch === ')') {
                $depth--;
            } elseif ($ch === ':' && $depth === 0) {
                $cut = $i;
            }
        }
        $variants = $cut >= 0 ? substr($class, 0, $cut) : '';
        $u = trim($cut >= 0 ? substr($class, $cut + 1) : $class, '!');
        if (str_starts_with($u, '-')) {
            $u = substr($u, 1);
        }

        if (in_array($u, self::DISPLAY, true)) {
            return [$variants, 'display'];
        }
        if (in_array($u, self::POSITION, true)) {
            return [$variants, 'position'];
        }
        if (preg_match('/^text-(left|center|right|start|end|justify)$/', $u)) {
            return [$variants, 'text-align'];
        }
        if (preg_match('/^text-(.+)$/', $u, $m)) {
            $size = in_array(explode('/', $m[1])[0], self::TEXT_SIZES, true) || preg_match('/^\[(\d|length:|calc|var\(--nq-type)/', $m[1]);

            return [$variants, $size ? 'text-size' : 'text-color'];
        }
        if (preg_match('/^border(-[xytblrse])?(-(\d+|\[\d[^\]]*\]))?$/', $u, $m)) {
            return [$variants, 'border-w'.($m[1] ?? '')];
        }
        if (preg_match('/^border-(solid|dashed|dotted|double|hidden|none)$/', $u)) {
            return [$variants, 'border-style'];
        }
        if (preg_match('/^border(-[xytblrse])?-/', $u, $m)) {
            return [$variants, 'border-color'.($m[1] ?? '')];
        }
        if (preg_match('/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[\d+\])$/', $u)) {
            return [$variants, 'font-weight'];
        }
        if (preg_match('/^rounded(-(s|e|t|b|l|r|ss|se|es|ee|tl|tr|bl|br))?(-|$)/', $u, $m)) {
            return [$variants, 'rounded'.(isset($m[2]) && $m[2] !== '' ? '-'.$m[2] : '')];
        }
        // ring-2 (width) and ring-primary/30 (colour) are separate groups, as are ring-offset-2 and ring-offset-background.
        if (preg_match('/^(ring|ring-offset)(-(\d+|\[\d[^\]]*\]|inset))?$/', $u, $m)) {
            return [$variants, $m[1].'-w'];
        }
        if (preg_match('/^(ring-offset|ring)-/', $u, $m)) {
            return [$variants, $m[1].'-color'];
        }
        if (preg_match('/^flex-(row|col|row-reverse|col-reverse)$/', $u)) {
            return [$variants, 'flex-direction'];
        }
        if (preg_match('/^flex-(wrap|nowrap|wrap-reverse)$/', $u)) {
            return [$variants, 'flex-wrap'];
        }
        if (preg_match('/^(size|w|h|min-w|min-h|max-w|max-h|p|px|py|ps|pe|pt|pb|pl|pr|m|mx|my|ms|me|mt|mb|ml|mr|gap-x|gap-y|gap|space-x|space-y|inset-x|inset-y|inset|top|bottom|start|end|left|right|z|opacity|shadow|leading|tracking|items|justify|self|place-items|place-content|content|overflow-x|overflow-y|overflow|bg|fill|stroke|outline-offset|ring-offset|ring|cursor|grid-cols|grid-rows|col-span|row-span|order|basis|grow|shrink|whitespace|truncate|line-clamp|aspect|object|duration|ease|delay|translate-x|translate-y|scale|rotate|underline-offset|decoration)(-|$)/', $u, $m)) {
            return [$variants, $m[1]];
        }

        return [$variants, null];
    }
}
