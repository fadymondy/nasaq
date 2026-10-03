{{-- Internal: the words and pure helpers shared by the APM panels, ported from apm-panels strings.ts, apm-math.ts and apm-chart-math.ts.
     Included with @include('nasaq::components.apm-panels._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_apm_words')) {
        /** The panels' own words for a locale, with the host's overrides on top. %s / %d are filled with sprintf. */
        function nq_apm_words(string $locale, array $override = []): array
        {
            $en = ['latency' => 'Latency', 'latencyDescription' => 'Response time percentiles', 'p50' => 'p50', 'p95' => 'p95', 'p99' => 'p99', 'median' => 'Median', 'slowest5' => 'Slowest 5%', 'slowest1' => 'Slowest 1%', 'target' => 'Target', 'vsPrevious' => 'vs previous period', 'errorRate' => 'Error rate', 'errorDescription' => 'Failed requests as a share of all requests', 'errors' => 'Errors', 'requests' => 'Requests', 'slo' => 'Error budget', 'withinSlo' => 'Within target', 'overSlo' => 'Over target', 'topErrors' => 'Top errors', 'occurrencesOne' => '1 time', 'occurrences' => '%d times', 'lastSeen' => 'Last seen', 'noErrors' => 'No errors in this period', 'empty' => 'No data for this period', 'loadError' => 'This panel could not be loaded.', 'retry' => 'Try again', 'endpoints' => 'Slowest endpoints', 'endpointsDescription' => 'Sorted by the 95th percentile by default', 'endpoint' => 'Endpoint', 'throughput' => 'Throughput', 'perMinute' => 'req/min', 'filterEndpoints' => 'Filter endpoints…', 'slow' => 'Slow', 'traces' => 'Traces', 'tracesDescription' => 'Recent requests, slowest first', 'trace' => 'Trace', 'duration' => 'Duration', 'status' => 'Status', 'started' => 'Started', 'spansOne' => '1 span', 'spans' => '%d spans', 'services' => 'Service', 'waterfall' => 'Span waterfall', 'waterfallOf' => 'Spans of %s', 'span' => 'Span', 'close' => 'Close', 'noTraces' => 'No traces match', 'failed' => 'Failed', 'chartLatency' => 'Latency percentiles over time', 'chartErrors' => 'Error rate over time', 'selectTrace' => 'Show spans for %s'];
            $ar = ['latency' => 'زمن الاستجابة', 'latencyDescription' => 'نسب زمن الاستجابة المئوية', 'p50' => 'p50', 'p95' => 'p95', 'p99' => 'p99', 'median' => 'الوسيط', 'slowest5' => 'أبطأ 5%', 'slowest1' => 'أبطأ 1%', 'target' => 'الهدف', 'vsPrevious' => 'مقارنة بالفترة السابقة', 'errorRate' => 'معدل الأخطاء', 'errorDescription' => 'الطلبات الفاشلة كنسبة من كل الطلبات', 'errors' => 'الأخطاء', 'requests' => 'الطلبات', 'slo' => 'ميزانية الأخطاء', 'withinSlo' => 'ضمن الهدف', 'overSlo' => 'فوق الهدف', 'topErrors' => 'أكثر الأخطاء', 'occurrencesOne' => 'مرة واحدة', 'occurrences' => '%d مرات', 'lastSeen' => 'آخر ظهور', 'noErrors' => 'لا أخطاء في هذه الفترة', 'empty' => 'لا بيانات لهذه الفترة', 'loadError' => 'تعذّر تحميل هذه اللوحة.', 'retry' => 'حاول مرة أخرى', 'endpoints' => 'أبطأ نقاط النهاية', 'endpointsDescription' => 'مرتبة افتراضيًا حسب المئين 95', 'endpoint' => 'نقطة النهاية', 'throughput' => 'معدل الطلبات', 'perMinute' => 'طلب/دقيقة', 'filterEndpoints' => 'تصفية نقاط النهاية…', 'slow' => 'بطيء', 'traces' => 'التتبعات', 'tracesDescription' => 'أحدث الطلبات، الأبطأ أولًا', 'trace' => 'التتبع', 'duration' => 'المدة', 'status' => 'الحالة', 'started' => 'البدء', 'spansOne' => 'مقطع واحد', 'spans' => '%d مقاطع', 'services' => 'الخدمة', 'waterfall' => 'شلال المقاطع', 'waterfallOf' => 'مقاطع %s', 'span' => 'المقطع', 'close' => 'إغلاق', 'noTraces' => 'لا تتبعات مطابقة', 'failed' => 'فشل', 'chartLatency' => 'نسب زمن الاستجابة عبر الوقت', 'chartErrors' => 'معدل الأخطاء عبر الوقت', 'selectTrace' => 'عرض مقاطع %s'];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** The p-th percentile (0 to 100) of the values, by linear interpolation. Empty input gives 0. */
        function nq_apm_percentile(array $values, int|float $p): float
        {
            if (! $values) {
                return 0.0;
            }
            sort($values);
            $rank = (min(100, max(0, $p)) / 100) * (count($values) - 1);
            $lo = (int) floor($rank);
            $hi = (int) ceil($rank);
            $a = $values[$lo] ?? 0;
            $b = $values[$hi] ?? $a;

            return $a + ($b - $a) * ($rank - $lo);
        }

        /** Errors over requests as a fraction. Zero requests give 0. */
        function nq_apm_error_rate(int|float $errors, int|float $requests): float
        {
            return $requests > 0 ? $errors / $requests : 0.0;
        }

        /** The response class of an HTTP status: 2xx, 3xx, 4xx, 5xx or other. */
        function nq_apm_status_class(int $status): string
        {
            return match (true) {
                $status >= 200 && $status < 300 => '2xx',
                $status >= 300 && $status < 400 => '3xx',
                $status >= 400 && $status < 500 => '4xx',
                $status >= 500 && $status < 600 => '5xx',
                default => 'other',
            };
        }

        /** Nesting depth of each span (root is 0), following parentId. A missing or cyclic parent counts as a root. @return array<string,int> */
        function nq_apm_span_depths(array $spans): array
        {
            $byId = [];
            foreach ($spans as $s) {
                $byId[$s['id']] = $s;
            }
            $depths = [];
            foreach ($spans as $span) {
                $depth = 0;
                $cursor = $span;
                $seen = [];
                while (! empty($cursor['parentId']) && isset($byId[$cursor['parentId']]) && ! isset($seen[$cursor['parentId']])) {
                    $seen[$cursor['parentId']] = true;
                    $cursor = $byId[$cursor['parentId']];
                    $depth++;
                }
                $depths[$span['id']] = $depth;
            }

            return $depths;
        }

        /** The trace's wall-clock length: from the earliest start to the latest end. */
        function nq_apm_trace_extent(array $spans): float
        {
            if (! $spans) {
                return 0.0;
            }

            return max(array_map(fn ($s) => $s['startMs'] + $s['durationMs'], $spans)) - min(array_column($spans, 'startMs'));
        }

        /** A "nice" step for the y axis: the smallest 1, 2, 2.5, 5 or 10 step (times a power of ten) that fits max in $intervals steps. */
        function nq_apm_nice_step(int|float $max, int $intervals = 4): float
        {
            if (! ($max > 0) || ! is_finite($max)) {
                return 1 / $intervals;
            }
            $raw = $max / $intervals;
            $mag = 10 ** floor(log10($raw));
            $norm = $raw / $mag;
            $f = $norm <= 1 ? 1 : ($norm <= 2 ? 2 : ($norm <= 2.5 ? 2.5 : ($norm <= 5 ? 5 : 10)));

            return $f * $mag;
        }

        /** The y ticks from the nice top down to 0 (the order they are drawn down the axis). */
        function nq_apm_ticks(int|float $max, int $intervals = 4): array
        {
            $step = nq_apm_nice_step($max, $intervals);

            return array_map(fn ($i) => ($intervals - $i) * $step, range(0, $intervals));
        }

        /** Indices of the x labels to show: first, middle and last, without repeats. */
        function nq_apm_label_indices(int $count): array
        {
            return match (true) {
                $count <= 0 => [],
                $count === 1 => [0],
                $count === 2 => [0, 1],
                default => [0, intdiv($count - 1, 2), $count - 1],
            };
        }

        /** Change of $current against $previous as a fraction (0.124 is +12.4%). Null when there is nothing to compare. */
        function nq_apm_change(int|float $current, int|float|null $previous): ?float
        {
            if ($previous === null) {
                return null;
            }
            if ($previous == 0) {
                return $current == 0 ? 0.0 : null;
            }

            return ($current - $previous) / abs($previous);
        }

        /** A duration in milliseconds as text: "120 ms", "1.14 s". */
        function nq_apm_millis(int|float $ms, bool $ar = false): string
        {
            [$msUnit, $sUnit] = $ar ? ['مللي ث', 'ث'] : ['ms', 's'];
            if ($ms >= 1000) {
                return number_format($ms / 1000, $ms >= 10000 ? 1 : 2, '.', '').' '.$sUnit;
            }

            return ($ms >= 100 ? round($ms) : round($ms * 10) / 10).' '.$msUnit;
        }

        /** A figure in the locale with Latin digits. style: decimal | percent | compact (1.2K, 48K). */
        function nq_apm_number(int|float $value, string $locale, string $style = 'decimal', int $min = 0, int $max = 0): string
        {
            if ($style === 'compact') {
                $units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
                [$div, $suffix] = [1, ''];
                foreach ($units as $u) {
                    if (abs($value) >= $u[0]) {
                        [$div, $suffix] = $u;
                        break;
                    }
                }
                $n = round($value / $div, abs($value / $div) < 10 ? 1 : 0);

                return rtrim(rtrim(number_format($n, 1, '.', ''), '0'), '.').$suffix;
            }
            if (! class_exists(\NumberFormatter::class)) {
                return (string) round($style === 'percent' ? $value * 100 : $value, $max).($style === 'percent' ? '%' : '');
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', $style === 'percent' ? \NumberFormatter::PERCENT : \NumberFormatter::DECIMAL);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $min);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $max);

            return $f->format($value);
        }

        /** The clock time of an ISO bucket time, as written (no zone shift): "9:00 AM". */
        function nq_apm_time(string $time, string $locale): string
        {
            $date = \Carbon\Carbon::parse($time, 'UTC');
            if (! class_exists(\IntlDateFormatter::class)) {
                return $date->format('H:i');
            }
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::SHORT, 'UTC');

            return (string) $f->format($date->getTimestamp());
        }
    }
@endphp
