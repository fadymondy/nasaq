{{-- Internal: helpers of x-nq::time-series-panel, ported from time-series-panel/geometry.ts and the chart's monotone path.
     Included with @include('nasaq::components.time-series-panel._logic'); every function is defined once. --}}
@include('nasaq::components.metric-tiles._logic')
@php
    if (! function_exists('nq_ts_f')) {
        /** A plain number for an SVG path: at most two decimals, no trailing zeros. */
        function nq_ts_f(float $v): string
        {
            return rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');
        }

        function nq_ts_nice_step(float $raw): float
        {
            if (! ($raw > 0)) {
                return 1.0;
            }
            $p = 10 ** floor(log10($raw));
            $f = $raw / $p;

            return ($f <= 1 ? 1 : ($f <= 2 ? 2 : ($f <= 5 ? 5 : 10))) * $p;
        }

        /** Y domain and tick values: 0 to a nice maximum for counts, "min - 1" to "max + 1" for lower-is-better metrics. */
        function nq_ts_domain(array $values, bool $lowerIsBetter): array
        {
            $fin = array_values(array_filter($values, fn ($v) => is_finite($v)));
            $r = fn (float $v) => round($v, 9);
            if ($lowerIsBetter) {
                $lo = min($fin) - 1;
                $hi = max($fin) + 1;
                $step = nq_ts_nice_step(($hi - $lo) / 4);
                $ticks = [];
                for ($k = (int) ceil($lo / $step); $k * $step <= $hi; $k++) {
                    $ticks[] = $r($k * $step);
                }

                return ['lo' => $lo, 'hi' => $hi, 'ticks' => $ticks];
            }
            $max = max(0, ...($fin ?: [0]));
            $step = nq_ts_nice_step(($max ?: 1) / 4);
            $hi = ceil($r($max / $step)) * $step ?: $step;
            $ticks = [];
            for ($k = 0; $k * $step <= $hi + $step / 1e6; $k++) {
                $ticks[] = $r($k * $step);
            }

            return ['lo' => 0, 'hi' => $r($hi), 'ticks' => $ticks];
        }

        /** Vertical position of a value in percent from the top. A reversed axis puts the lowest value on top. */
        function nq_ts_y(int|float $value, array $d, bool $reversed): float
        {
            $frac = $d['hi'] == $d['lo'] ? 0.5 : ($value - $d['lo']) / ($d['hi'] - $d['lo']);

            return round(($reversed ? $frac : 1 - $frac) * 100, 2);
        }

        /** Horizontal position of point $i of $n in percent. */
        function nq_ts_x(int $i, int $n): float
        {
            return $n <= 1 ? 50.0 : round(($i / ($n - 1)) * 100, 2);
        }

        /** Monotone cubic (Fritsch-Carlson) path, the same curve Recharts draws for type="monotone". */
        function nq_ts_monotone(array $pts): string
        {
            $n = count($pts);
            if ($n === 0) {
                return '';
            }
            if ($n === 1) {
                return 'M'.nq_ts_f($pts[0][0]).','.nq_ts_f($pts[0][1]);
            }
            $dx = [];
            $slope = [];
            for ($i = 0; $i < $n - 1; $i++) {
                $dx[$i] = $pts[$i + 1][0] - $pts[$i][0];
                $slope[$i] = $dx[$i] == 0 ? 0 : ($pts[$i + 1][1] - $pts[$i][1]) / $dx[$i];
            }
            $m = [$slope[0]];
            for ($i = 1; $i < $n - 1; $i++) {
                $m[$i] = $slope[$i - 1] * $slope[$i] <= 0 ? 0 : ($slope[$i - 1] + $slope[$i]) / 2;
            }
            $m[$n - 1] = $slope[$n - 2];
            for ($i = 0; $i < $n - 1; $i++) {
                if ($slope[$i] == 0) {
                    $m[$i] = 0;
                    $m[$i + 1] = 0;

                    continue;
                }
                $a = $m[$i] / $slope[$i];
                $b = $m[$i + 1] / $slope[$i];
                $s = $a * $a + $b * $b;
                if ($s > 9) {
                    $t = 3 / sqrt($s);
                    $m[$i] = $t * $a * $slope[$i];
                    $m[$i + 1] = $t * $b * $slope[$i];
                }
            }
            $d = 'M'.nq_ts_f($pts[0][0]).','.nq_ts_f($pts[0][1]);
            for ($i = 0; $i < $n - 1; $i++) {
                [$x0, $y0] = $pts[$i];
                [$x1, $y1] = $pts[$i + 1];
                $h = $dx[$i] / 3;
                $d .= 'C'.nq_ts_f($x0 + $h).','.nq_ts_f($y0 + $m[$i] * $h).','.nq_ts_f($x1 - $h).','.nq_ts_f($y1 - $m[$i + 1] * $h).','.nq_ts_f($x1).','.nq_ts_f($y1);
            }

            return $d;
        }

        /** The smooth line through the defined values and the closed area under it. */
        function nq_ts_paths(array $values, array $d, bool $reversed): array
        {
            $pts = [];
            $n = count($values);
            foreach (array_values($values) as $i => $v) {
                if ($v !== null) {
                    $pts[] = [nq_ts_x($i, $n), nq_ts_y($v, $d, $reversed)];
                }
            }
            if (! $pts) {
                return ['line' => '', 'area' => ''];
            }
            $line = nq_ts_monotone($pts);
            $last = $pts[count($pts) - 1];

            return ['line' => $line, 'area' => $line.'L'.nq_ts_f($last[0]).',100L'.nq_ts_f($pts[0][0]).',100Z'];
        }

        /** Indices of the X labels to print: up to $max, evenly spread, always the first and the last. */
        function nq_ts_label_indices(int $n, int $max = 6): array
        {
            if ($n <= 0) {
                return [];
            }
            if ($n <= $max) {
                return range(0, $n - 1);
            }

            return array_map(fn ($k) => (int) round(($k * ($n - 1)) / ($max - 1)), range(0, $max - 1));
        }

        /** An ICU skeleton from Intl-style date options (month, day, hour, year, weekday). */
        function nq_ts_skeleton(array $o): string
        {
            $s = '';
            if (isset($o['weekday'])) {
                $s .= ['long' => 'EEEE', 'short' => 'EEE', 'narrow' => 'EEEEE'][$o['weekday']] ?? 'EEE';
            }
            if (isset($o['year'])) {
                $s .= $o['year'] === '2-digit' ? 'yy' : 'y';
            }
            if (isset($o['month'])) {
                $s .= ['long' => 'MMMM', 'short' => 'MMM', 'narrow' => 'MMMMM', 'numeric' => 'M', '2-digit' => 'MM'][$o['month']] ?? 'MMM';
            }
            if (isset($o['day'])) {
                $s .= $o['day'] === '2-digit' ? 'dd' : 'd';
            }
            if (isset($o['hour'])) {
                $s .= 'j';
            }
            if (isset($o['minute'])) {
                $s .= 'mm';
            }

            return $s;
        }

        /** "Sep 29" (plus the hour when the date has a time) in the locale with Latin digits. $options replaces the default. */
        function nq_ts_date(string $date, string $locale, ?array $options = null, ?bool $withTime = null): string
        {
            $withTime ??= str_contains($date, 'T');
            $dateOnly = (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $date);
            $c = $dateOnly ? \Carbon\Carbon::parse($date, 'UTC') : \Carbon\Carbon::parse($date);
            $tz = $c->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);
            $skeleton = nq_ts_skeleton($options ?? ($withTime ? ['month' => 'short', 'day' => 'numeric', 'hour' => 'numeric'] : ['month' => 'short', 'day' => 'numeric']));
            $tag = str_replace('_', '-', $locale).'@numbers=latn';
            if (! class_exists(\IntlDateFormatter::class) || ! class_exists(\IntlDatePatternGenerator::class)) {
                return $c->format($withTime ? 'M j, H:i' : 'M j');
            }
            $pattern = (new \IntlDatePatternGenerator($tag))->getBestPattern($skeleton);

            return (new \IntlDateFormatter($tag, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, $tz, null, $pattern))->format($c);
        }
    }
@endphp
