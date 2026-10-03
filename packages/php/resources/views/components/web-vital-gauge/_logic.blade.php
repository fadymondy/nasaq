{{-- Internal: the words and pure helpers of x-nq::web-vital-gauge, ported from web-vital-gauge.tsx and web-vitals-math.ts. Included with
     @include('nasaq::components.web-vital-gauge._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_wv_words')) {
        /** The gauge's own words for a locale, with the host's overrides on top. %s / %1$s are filled with sprintf. */
        function nq_wv_words(string $locale, array $override = []): array
        {
            $en = ['names' => ['LCP' => 'Largest Contentful Paint', 'INP' => 'Interaction to Next Paint', 'CLS' => 'Cumulative Layout Shift', 'FCP' => 'First Contentful Paint', 'TTFB' => 'Time to First Byte'], 'hints' => ['LCP' => 'How fast the main content appears', 'INP' => 'How quickly the page responds to input', 'CLS' => 'How much the layout jumps while loading', 'FCP' => 'How fast anything first appears', 'TTFB' => 'How fast the server starts to answer'], 'rating' => ['good' => 'Good', 'needs-improvement' => 'Needs improvement', 'poor' => 'Poor'], 'p75' => '75th percentile', 'core' => 'Core', 'good' => 'Good', 'needs' => 'Needs improvement', 'poorLabel' => 'Poor', 'distribution' => 'Page loads by rating', 'band' => '%1$s to %2$s', 'atMost' => 'up to %s', 'over' => 'over %s', 'vsPrevious' => 'vs previous period', 'noData' => 'No data', 'gaugeLabel' => '%1$s: %2$s, %3$s'];
            $ar = ['names' => ['LCP' => 'رسم أكبر محتوى', 'INP' => 'التفاعل حتى الرسم التالي', 'CLS' => 'الإزاحة التراكمية للتخطيط', 'FCP' => 'أول رسم للمحتوى', 'TTFB' => 'زمن وصول أول بايت'], 'hints' => ['LCP' => 'سرعة ظهور المحتوى الرئيسي', 'INP' => 'سرعة استجابة الصفحة للإدخال', 'CLS' => 'مقدار قفز التخطيط أثناء التحميل', 'FCP' => 'سرعة ظهور أي محتوى أولًا', 'TTFB' => 'سرعة بدء الخادم في الرد'], 'rating' => ['good' => 'جيد', 'needs-improvement' => 'يحتاج تحسينًا', 'poor' => 'ضعيف'], 'p75' => 'المئين 75', 'core' => 'أساسي', 'good' => 'جيد', 'needs' => 'يحتاج تحسينًا', 'poorLabel' => 'ضعيف', 'distribution' => 'تحميلات الصفحة حسب التقييم', 'band' => 'من %1$s إلى %2$s', 'atMost' => 'حتى %s', 'over' => 'أكثر من %s', 'vsPrevious' => 'مقارنة بالفترة السابقة', 'noData' => 'لا بيانات', 'gaugeLabel' => '%1$s: %2$s، %3$s'];

            return array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        /** Google's thresholds: good is at or below `good`, poor is above `poor`. */
        function nq_wv_thresholds(): array
        {
            return [
                'LCP' => ['good' => 2500, 'poor' => 4000, 'core' => true],
                'INP' => ['good' => 200, 'poor' => 500, 'core' => true],
                'CLS' => ['good' => 0.1, 'poor' => 0.25, 'core' => true],
                'FCP' => ['good' => 1800, 'poor' => 3000, 'core' => false],
                'TTFB' => ['good' => 800, 'poor' => 1800, 'core' => false],
            ];
        }

        /** good | needs-improvement | poor. */
        function nq_wv_rate(string $metric, int|float $value): string
        {
            $t = nq_wv_thresholds()[$metric];

            return $value <= $t['good'] ? 'good' : ($value <= $t['poor'] ? 'needs-improvement' : 'poor');
        }

        /** Position on the gauge as 0 to 1, clamped. The scale is 1.5 times the poor threshold. */
        function nq_wv_fraction(string $metric, int|float $value): float
        {
            $max = nq_wv_thresholds()[$metric]['poor'] * 1.5;

            return ! is_finite($value) || $value <= 0 ? 0.0 : min(1.0, $value / $max);
        }

        /** The gauge bands as fractions of the scale. */
        function nq_wv_bands(string $metric): array
        {
            $t = nq_wv_thresholds()[$metric];
            $max = $t['poor'] * 1.5;

            return ['good' => $t['good'] / $max, 'poor' => $t['poor'] / $max];
        }

        /** How to show a raw value: [value, unit (s | ms | ''), fraction digits]. */
        function nq_wv_display(string $metric, int|float $value): array
        {
            if ($metric === 'CLS') {
                return [$value, '', 2];
            }
            if ($metric === 'LCP' || $metric === 'FCP') {
                return [$value / 1000, 's', 2];
            }

            return [round($value), 'ms', 0];
        }

        /** Counts or fractions to fractions summing to 1. */
        function nq_wv_normalize(array $d): array
        {
            $good = max(0, $d['good'] ?? 0);
            $needs = max(0, $d['needsImprovement'] ?? 0);
            $poor = max(0, $d['poor'] ?? 0);
            $total = $good + $needs + $poor;

            return $total == 0 ? ['good' => 0, 'needsImprovement' => 0, 'poor' => 0] : ['good' => $good / $total, 'needsImprovement' => $needs / $total, 'poor' => $poor / $total];
        }

        /** A figure in the locale with Latin digits. style: decimal | percent. */
        function nq_wv_number(int|float $value, string $locale, string $style = 'decimal', int $min = 0, int $max = 2): string
        {
            if (! class_exists(\NumberFormatter::class)) {
                return (string) round($style === 'percent' ? $value * 100 : $value, $max).($style === 'percent' ? '%' : '');
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', $style === 'percent' ? \NumberFormatter::PERCENT : \NumberFormatter::DECIMAL);
            $f->setAttribute(\NumberFormatter::MIN_FRACTION_DIGITS, $min);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $max);

            return $f->format($value);
        }

        /** The value as text with its unit, in the locale: "2.4 s", "180 ms", "0.08". */
        function nq_wv_format(string $metric, int|float $value, string $locale): string
        {
            [$v, $unit, $digits] = nq_wv_display($metric, $value);
            $n = nq_wv_number($v, $locale, 'decimal', 0, $digits);
            if ($unit === '') {
                return $n;
            }
            $ar = str_starts_with($locale, 'ar');

            return $n.' '.($unit === 's' ? ($ar ? 'ث' : 's') : ($ar ? 'مللي ث' : 'ms'));
        }

        /** Change of $current against $previous as a fraction (0.124 is +12.4%). Null when there is nothing to compare. */
        function nq_wv_change(int|float $current, int|float|null $previous): ?float
        {
            if ($previous === null) {
                return null;
            }
            if ($previous == 0) {
                return $current == 0 ? 0.0 : null;
            }

            return ($current - $previous) / abs($previous);
        }

        /** A point on the gauge arc: 0 is the left end, 1 the right end. */
        function nq_wv_point(float $f, float $r = 80): array
        {
            $angle = M_PI * (1 - $f);

            return [100 + $r * cos($angle), 100 - $r * sin($angle)];
        }

        function nq_wv_arc(float $from, float $to): string
        {
            [$ax, $ay] = nq_wv_point($from);
            [$bx, $by] = nq_wv_point($to);

            return sprintf('M %s %s A 80 80 0 0 1 %s %s', number_format($ax, 2, '.', ''), number_format($ay, 2, '.', ''), number_format($bx, 2, '.', ''), number_format($by, 2, '.', ''));
        }
    }
@endphp
