{{-- Internal: the app-strings translator (port of web/src/components/translations/translations-logic.ts).
     Included with @include('nasaq::components.translations._translations'); every function is defined once. --}}
@php
    if (! function_exists('nq_tr_lookup')) {
        /** Looks a key up in one dictionary: `a.b.c`, or `ns:a.b`. Flat keys win. */
        function nq_tr_lookup(?array $messages, string $key): ?string
        {
            if (! $messages) {
                return null;
            }
            if (isset($messages[$key]) && is_string($messages[$key])) {
                return $messages[$key];
            }
            $node = $messages;
            foreach (explode('.', preg_replace('/:/', '.', $key, 1)) as $part) {
                if (! is_array($node) || ! array_key_exists($part, $node)) {
                    return null;
                }
                $node = $node[$part];
            }

            return is_string($node) ? $node : null;
        }

        /** `ar-EG` gives `ar-EG`, `ar`, then the fallback and its base. */
        function nq_tr_chain(string $locale, string $fallback = 'en'): array
        {
            $chain = [$locale, preg_split('/[-_]/', $locale)[0], $fallback, preg_split('/[-_]/', $fallback)[0]];

            return array_values(array_unique(array_filter($chain)));
        }

        /** The CLDR plural category (zero, one, two, few, many, other) for the rules the library ships. */
        function nq_tr_plural(string $locale, int|float $n): string
        {
            $lang = strtolower(preg_split('/[-_]/', $locale)[0]);
            $i = (int) floor(abs($n));
            $whole = floor(abs($n)) == abs($n);
            switch ($lang) {
                case 'ar':
                    if (! $whole) {
                        return 'other';
                    }
                    $m = $i % 100;
                    if ($i === 0) {
                        return 'zero';
                    }
                    if ($i === 1) {
                        return 'one';
                    }
                    if ($i === 2) {
                        return 'two';
                    }
                    if ($m >= 3 && $m <= 10) {
                        return 'few';
                    }
                    if ($m >= 11) {
                        return 'many';
                    }

                    return 'other';
                case 'ja': case 'zh': case 'ko': case 'vi': case 'th': case 'id': case 'ms':
                    return 'other';
                case 'fr': case 'pt':
                    return $i === 0 || $i === 1 ? 'one' : 'other';
                case 'ru': case 'uk':
                    if (! $whole) {
                        return 'other';
                    }
                    if ($i % 10 === 1 && $i % 100 !== 11) {
                        return 'one';
                    }
                    if ($i % 10 >= 2 && $i % 10 <= 4 && ! ($i % 100 >= 12 && $i % 100 <= 14)) {
                        return 'few';
                    }

                    return 'many';
                default:
                    return $whole && $i === 1 ? 'one' : 'other';
            }
        }

        /** Replaces `{name}` and `{{name}}` with the value; numbers are formatted for the locale; unknown names stay. */
        function nq_tr_interpolate(string $text, array $vars, string $locale = 'en'): string
        {
            return preg_replace_callback('/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/', function ($m) use ($vars, $locale) {
                $name = ($m[2] ?? '') !== '' ? $m[2] : $m[1];
                if (! array_key_exists($name, $vars) || $vars[$name] === null) {
                    return $m[0];
                }
                $v = $vars[$name];
                if (is_int($v) || is_float($v)) {
                    return class_exists(\NumberFormatter::class) ? (new \NumberFormatter($locale, \NumberFormatter::DECIMAL))->format($v) : number_format($v);
                }

                return (string) $v;
            }, $text);
        }

        /**
         * Translates `$key` over `$bundle` (locale => messages). Missing keys fall back along the locale chain, then to
         * `defaultValue`, then to the key. With a numeric `count`, `key_zero` (for 0), the plural form and `key_other` are tried first.
         */
        function nq_translate(array $bundle, string $locale, string $key, array $vars = [], string $fallback = 'en'): string
        {
            $default = $vars['defaultValue'] ?? null;
            unset($vars['defaultValue']);
            $count = isset($vars['count']) && (is_int($vars['count']) || is_float($vars['count'])) ? $vars['count'] : null;
            foreach (nq_tr_chain($locale, $fallback) as $l) {
                if (! isset($bundle[$l])) {
                    continue;
                }
                $keys = $count === null ? [$key] : array_merge($count == 0 ? [$key.'_zero'] : [], [$key.'_'.nq_tr_plural($l, $count), $key.'_other', $key]);
                foreach ($keys as $k) {
                    $hit = nq_tr_lookup($bundle[$l], $k);
                    if ($hit !== null) {
                        return nq_tr_interpolate($hit, $vars, $l);
                    }
                }
            }

            return nq_tr_interpolate($default ?? $key, $vars, $locale);
        }
    }
@endphp
