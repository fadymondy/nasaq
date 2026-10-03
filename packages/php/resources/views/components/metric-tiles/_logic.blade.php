{{-- Internal: helpers of x-nq::metric-tiles, ported from metric-tiles.tsx and analytics-math.ts. Included with
     @include('nasaq::components.metric-tiles._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_mt_change_ratio')) {
        /** Change of $current against $previous as a fraction (0.124 is +12.4%). Null when there is nothing to compare. */
        function nq_mt_change_ratio(int|float $current, int|float|null $previous): ?float
        {
            if ($previous === null) {
                return null;
            }
            if ($previous == 0) {
                return $current == 0 ? 0.0 : null;
            }

            return ($current - $previous) / abs($previous);
        }

        /** A figure in the locale with Latin digits, as the tile's format array describes it (style, currency, compact, minFraction, maxFraction). */
        function nq_mt_number(int|float $value, array $format, string $locale): string
        {
            $style = $format['style'] ?? 'decimal';
            if (! class_exists(\NumberFormatter::class)) {
                return (string) round($value, (int) ($format['maxFraction'] ?? 0));
            }
            $type = ['percent' => \NumberFormatter::PERCENT, 'currency' => \NumberFormatter::CURRENCY][$style] ?? \NumberFormatter::DECIMAL;
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', $type);
            if (isset($format['minFraction'])) {
                $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, (int) $format['minFraction']);
            }
            if (isset($format['maxFraction'])) {
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $format['maxFraction']);
            }
            if ($style === 'currency') {
                return $f->formatCurrency($value, strtoupper($format['currency'] ?? \Nasaq\Nasaq::currency($locale)));
            }

            return $f->format($value);
        }
    }
@endphp
