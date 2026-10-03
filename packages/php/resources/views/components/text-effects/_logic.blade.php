{{-- Internal: the pure helpers of the text effects, ported from text-effects-model.ts (how a string is cut into animatable pieces) and the token styles of the Alpine runtime
     (html/src/alpine/text-effects-style.ts). Included with @include('nasaq::components.text-effects._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_text_joining')) {
        /** True when the text has a script whose letters join (Arabic and friends), so it must never be cut inside a word. */
        function nq_text_joining(string $text): bool
        {
            return (bool) preg_match('/[\x{0600}-\x{06FF}\x{0700}-\x{077F}\x{07C0}-\x{07FF}\x{0840}-\x{08FF}\x{1800}-\x{18AF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}\x{1E900}-\x{1E95F}\x{10D00}-\x{10D3F}]/u', $text);
        }

        /** Words and the whitespace between them, or graphemes (not for joining scripts). Returns ['mode' => word|grapheme, 'tokens' => [['text', 'space', 'order'], ...]]. */
        function nq_text_split(string $text, string $mode = 'word'): array
        {
            $used = $mode === 'grapheme' && ! nq_text_joining($text) ? 'grapheme' : 'word';
            if ($used === 'grapheme') {
                preg_match_all('/\X/u', $text, $m);
                $pieces = $m[0];
            } else {
                $pieces = preg_split('/(\s+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) ?: [];
            }
            $order = 0;
            $tokens = [];
            foreach ($pieces as $piece) {
                $space = (bool) preg_match('/^\s+$/u', $piece);
                $tokens[] = ['text' => $piece, 'space' => $space, 'order' => $space ? -1 : $order++];
            }

            return ['mode' => $used, 'tokens' => $tokens];
        }

        /** Per-token transition delay in ms, capped so long text never takes more than $max ms. */
        function nq_text_stagger(int $order, int $count, int $step = 40, int $max = 600): int
        {
            if ($count <= 1) {
                return 0;
            }

            return (int) round($order * min($step, $max / ($count - 1)));
        }

        function nq_flip_style(bool $active, int $delay): string
        {
            return implode('; ', [
                'opacity: '.($active ? 1 : 0),
                'transform: '.($active ? 'none' : 'rotateX(-90deg) translateY(0.35em)'),
                'transition-property: transform, opacity',
                'transition-duration: '.($active ? '420ms, 320ms' : '240ms, 240ms'),
                'transition-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1)',
                'transition-delay: '.($active ? 240 + $delay : $delay).'ms',
            ]);
        }

        function nq_reveal_style(bool $shown, int $delay): string
        {
            return implode('; ', [
                'opacity: '.($shown ? 1 : 0),
                'transform: '.($shown ? 'none' : 'translateY(0.4em)'),
                'filter: '.($shown ? 'none' : 'blur(4px)'),
                'transition: opacity 420ms ease-out, transform 420ms ease-out, filter 420ms ease-out',
                'transition-delay: '.$delay.'ms',
            ]);
        }
    }
@endphp
