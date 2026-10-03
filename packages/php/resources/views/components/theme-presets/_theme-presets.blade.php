{{-- Internal: helpers shared by the theme-presets parts (port of web/src/components/theme-presets/theme-presets-logic.ts).
     Included with @include('nasaq::components.theme-presets._theme-presets'); every function is defined once. --}}
@php
    if (! function_exists('nq_theme_presets')) {
        /** Eight presets: every family in dark (`purple`) and light (`purple-light`). */
        function nq_theme_presets(): array
        {
            $gold = '#C9A227';
            $families = [
                ['id' => 'nasaq', 'label' => 'Nasaq', 'labelAr' => 'نسق'],
                ['id' => 'purple', 'label' => 'Purple', 'labelAr' => 'بنفسجي', 'brand' => '#7C3AED', 'brandDark' => '#9B6DF5', 'accent' => $gold],
                ['id' => 'rose', 'label' => 'Rose', 'labelAr' => 'وردي', 'brand' => '#E11D48', 'brandDark' => '#F5427B', 'accent' => '#1F8A99'],
                ['id' => 'emerald', 'label' => 'Emerald', 'labelAr' => 'زمردي', 'brand' => '#059669', 'brandDark' => '#10B981', 'accent' => $gold],
            ];
            $out = [];
            foreach ($families as $f) {
                $colors = array_diff_key($f, array_flip(['id', 'label', 'labelAr']));
                $out[] = ['id' => $f['id'], 'label' => $f['label'], 'labelAr' => $f['labelAr'], 'mode' => 'dark'] + $colors;
                $out[] = ['id' => $f['id'].'-light', 'label' => $f['label'].' light', 'labelAr' => $f['labelAr'].' فاتح', 'mode' => 'light'] + $colors;
            }

            return $out;
        }

        /** A 3- or 6-digit hex colour, with or without `#`, as uppercase `#RRGGBB`; null for anything else. */
        function nq_theme_hex(mixed $value): ?string
        {
            $v = is_string($value) ? ltrim(trim($value), '#') : '';
            if (! preg_match('/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i', $v)) {
                return null;
            }
            $v = strtoupper($v);

            return '#'.(strlen($v) === 3 ? $v[0].$v[0].$v[1].$v[1].$v[2].$v[2] : $v);
        }

        /** Ink or ivory, whichever reads better on `$bg` (WCAG contrast). */
        function nq_theme_on(string $bg): string
        {
            $lum = function (string $hex): float {
                $ch = function (int $i) use ($hex): float {
                    $c = hexdec(substr($hex, $i, 2)) / 255;

                    return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
                };

                return 0.2126 * $ch(1) + 0.7152 * $ch(3) + 0.0722 * $ch(5);
            };
            $contrast = fn (string $a, string $b): float => (max($lum($a), $lum($b)) + 0.05) / (min($lum($a), $lum($b)) + 0.05);

            return $contrast($bg, '#0E1A3C') >= $contrast($bg, '#F0EBE1') ? '#0E1A3C' : '#F0EBE1';
        }

        /** The brand variables a preset (plus overrides) sets; invalid colours are dropped. */
        function nq_theme_vars(array $preset, array $overrides = []): array
        {
            $brand = nq_theme_hex($overrides['brand'] ?? null) ?? nq_theme_hex($preset['brand'] ?? null);
            $brandDark = nq_theme_hex($overrides['brandDark'] ?? null) ?? (! empty($overrides['brand']) ? $brand : null) ?? nq_theme_hex($preset['brandDark'] ?? null) ?? $brand;
            $accent = nq_theme_hex($overrides['accent'] ?? null) ?? nq_theme_hex($preset['accent'] ?? null);
            $vars = [];
            if ($brand) {
                $vars += ['--nq-brand-l' => $brand, '--nq-action-l' => $brand, '--nq-on-action-l' => nq_theme_on($brand)];
            }
            if ($brandDark) {
                $vars += ['--nq-brand-d' => $brandDark, '--nq-action-d' => $brandDark, '--nq-on-action-d' => nq_theme_on($brandDark)];
            }
            if ($accent) {
                $vars['--nq-accent-brand'] = $accent;
            }

            return $vars;
        }

        /** Page, surface, text and accent colours for the preset's gallery preview. */
        function nq_theme_swatches(array $preset, array $overrides = []): array
        {
            $vars = nq_theme_vars($preset, $overrides);
            $dark = ($preset['mode'] ?? 'light') === 'dark';
            $brand = ($dark ? ($vars['--nq-brand-d'] ?? null) : ($vars['--nq-brand-l'] ?? null)) ?? ($dark ? 'var(--nq-brand-d)' : 'var(--nq-brand-l)');

            return $dark ? ['#0B1429', '#0E1A3C', '#F0EBE1', $brand] : ['#F0EBE1', '#F7F4EC', '#0E1A3C', $brand];
        }
    }
@endphp
