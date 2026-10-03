{{-- Internal: the words and pure helpers shared by the chart-extras parts, ported from chart-extras strings.ts and chart-extras-math.ts.
     Included with @include('nasaq::components.chart-extras._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_cx_words')) {
        /** The chart-extras words for a locale, with the host's overrides on top. %s / %d are filled with sprintf. */
        function nq_cx_words(string $locale, array $override = []): array
        {
            $en = ['segments' => 'Breakdown: %s', 'ring' => '%s complete', 'funnel' => 'Funnel steps', 'overall' => 'Overall conversion', 'continued' => '%s continued', 'left' => '%s left', 'biggest' => 'Biggest drop', 'stepOf' => 'Step %d of %d', 'up' => 'up', 'down' => 'down', 'flat' => 'no change'];
            $ar = ['segments' => 'التوزيع: %s', 'ring' => 'اكتمل %s', 'funnel' => 'خطوات القمع', 'overall' => 'التحويل الإجمالي', 'continued' => 'تابع %s', 'left' => 'غادر %s', 'biggest' => 'أكبر تسرّب', 'stepOf' => 'الخطوة %d من %d', 'up' => 'ارتفاع', 'down' => 'انخفاض', 'flat' => 'بلا تغيّر'];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** A plain number as text, Latin digits. $style: decimal | percent. $sign adds + for positive values. */
        function nq_cx_number(int|float $value, string $locale, string $style = 'decimal', int $max = 0, bool $sign = false): string
        {
            if (class_exists(\NumberFormatter::class)) {
                $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', $style === 'percent' ? \NumberFormatter::PERCENT : \NumberFormatter::DECIMAL);
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $max);
                $text = $f->format($value);
                if ($text !== false) {
                    return ($sign && $value > 0 ? '+' : '').$text;
                }
            }

            return ($sign && $value > 0 ? '+' : '').number_format($style === 'percent' ? $value * 100 : $value, $max).($style === 'percent' ? '%' : '');
        }

        /** Shares of a whole. The whole is the sum of positive values, or $total when bigger. Returns shares (id, value, share), whole, rest. */
        function nq_cx_segment_shares(array $segments, int|float|null $total = null): array
        {
            $clean = array_map(fn ($s) => ['id' => $s['id'], 'value' => is_finite((float) $s['value']) && $s['value'] > 0 ? $s['value'] : 0], array_values($segments));
            $sum = array_sum(array_column($clean, 'value'));
            $whole = $total !== null ? max($total, $sum) : $sum;

            return [
                'shares' => array_map(fn ($s) => $s + ['share' => $whole > 0 ? $s['value'] / $whole : 0], $clean),
                'whole' => $whole,
                'rest' => max(0, $whole - $sum),
            ];
        }

        /** Fraction of a ring that is filled, clamped to 0 to 1. */
        function nq_cx_ring_fraction(int|float $value, int|float $max = 100, int|float $min = 0): float
        {
            if ($max <= $min) {
                return 0.0;
            }

            return (float) min(1, max(0, ($value - $min) / ($max - $min)));
        }

        /** Circle geometry inside a 100 by 100 box: radius, circumference, dash, gap. */
        function nq_cx_ring_geometry(float $fraction, int|float $stroke = 8): array
        {
            $radius = 50 - $stroke / 2;
            $c = 2 * M_PI * $radius;
            $f = min(1, max(0, $fraction));

            return ['radius' => $radius, 'circumference' => $c, 'dash' => $c * $f, 'gap' => $c - $c * $f];
        }

        /** A tone from a fraction: default, warning from $warnAt, danger from $dangerAt. */
        function nq_cx_ring_tone(float $fraction, float $warnAt = 0.8, float $dangerAt = 0.95): string
        {
            return $fraction >= $dangerAt ? 'danger' : ($fraction >= $warnAt ? 'warning' : 'default');
        }

        /** A funnel bar width, 0 to 1, of the first step; never thinner than $min. */
        function nq_cx_funnel_bar_share(int|float $count, int|float $first, float $min = 0.06): float
        {
            if ($first <= 0 || $count <= 0) {
                return 0.0;
            }

            return (float) min(1, max($min, $count / $first));
        }

        /** Two-decimal-safe CSS number. */
        function nq_cx_css(int|float $v): string
        {
            return rtrim(rtrim(number_format($v, 3, '.', ''), '0'), '.') ?: '0';
        }

        /** Per-step conversion and drop-off (funnel-math funnelRows): step, fromPrevious, fromFirst, dropped, dropRate. */
        function nq_cx_funnel_rows(array $steps): array
        {
            $steps = array_values($steps);
            $first = $steps[0]['count'] ?? 0;
            $share = fn ($part, $whole) => $whole > 0 ? min(1, max(0, $part / $whole)) : 0;
            $rows = [];
            foreach ($steps as $i => $step) {
                $prev = $i === 0 ? $step['count'] : $steps[$i - 1]['count'];
                $fromPrevious = $i === 0 ? ($first > 0 ? 1 : 0) : $share($step['count'], $prev);
                $rows[] = [
                    'step' => $step,
                    'fromPrevious' => $fromPrevious,
                    'fromFirst' => $i === 0 ? $fromPrevious : $share($step['count'], $first),
                    'dropped' => $i === 0 ? 0 : max(0, $prev - $step['count']),
                    'dropRate' => $i === 0 ? 0 : ($first > 0 && $prev > 0 ? 1 - $fromPrevious : 0),
                ];
            }

            return $rows;
        }

        /** Index of the step with the biggest share lost, or -1. */
        function nq_cx_biggest_drop(array $rows): int
        {
            $best = -1;
            $rate = 0;
            foreach ($rows as $i => $r) {
                if ($i > 0 && $r['dropRate'] > $rate) {
                    $best = $i;
                    $rate = $r['dropRate'];
                }
            }

            return $best;
        }
    }
@endphp
