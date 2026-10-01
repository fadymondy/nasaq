{{-- Internal: the words and pure helpers of the daily summary, ported from daily-summary.tsx and daily-summary-math.ts.
     Included with @include('nasaq::components.daily-summary._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_ds_words')) {
        /** The summary's words for a locale ($override merged over them). Counts come from nq_ds_count(). */
        function nq_ds_words(string $locale, array $override = []): array
        {
            $en = ['previous' => 'Previous day', 'next' => 'Next day', 'today' => 'Today', 'protocol' => 'Protocol', 'body' => 'Body and activity', 'water' => 'Water', 'waterOfGoal' => 'of your goal', 'meals' => 'Meals', 'caffeine' => 'Caffeine', 'shutdown' => 'Shutdown violations', 'pomodoros' => 'Focus sessions', 'steps' => 'Steps', 'sleep' => 'Sleep', 'activeEnergy' => 'Active energy', 'restingHeartRate' => 'Resting heart rate', 'weight' => 'Weight', 'safe' => 'Safe', 'unsafe' => 'Unsafe', 'unclassified' => 'Not classified', 'clean' => 'Clean', 'sugar' => 'With sugar', 'none' => 'None', 'notSynced' => 'Not synced', 'source' => 'Source', 'sources' => ['ios' => 'iPhone', 'android' => 'Android', 'watch' => 'Apple Watch', 'wearos' => 'Wear OS', 'web' => 'Web'], 'empty' => 'Nothing recorded for this day', 'emptyHint' => 'Log something, or sync a device, and it appears here.', 'loadError' => 'This day could not be loaded.', 'retry' => 'Try again', 'goalLabel' => 'Water against your goal'];
            $ar = ['previous' => 'اليوم السابق', 'next' => 'اليوم التالي', 'today' => 'اليوم', 'protocol' => 'البروتوكول', 'body' => 'الجسم والنشاط', 'water' => 'الماء', 'waterOfGoal' => 'من هدفك', 'meals' => 'الوجبات', 'caffeine' => 'الكافيين', 'shutdown' => 'مخالفات الإغلاق', 'pomodoros' => 'جلسات التركيز', 'steps' => 'الخطوات', 'sleep' => 'النوم', 'activeEnergy' => 'الطاقة النشطة', 'restingHeartRate' => 'نبض الراحة', 'weight' => 'الوزن', 'safe' => 'آمنة', 'unsafe' => 'غير آمنة', 'unclassified' => 'غير مصنّفة', 'clean' => 'بدون سكر', 'sugar' => 'مع سكر', 'none' => 'لا شيء', 'notSynced' => 'لم تتم المزامنة', 'source' => 'المصدر', 'sources' => ['ios' => 'آيفون', 'android' => 'أندرويد', 'watch' => 'ساعة آبل', 'wearos' => 'Wear OS', 'web' => 'الويب'], 'empty' => 'لا شيء مسجّل لهذا اليوم', 'emptyHint' => 'سجّل شيئًا أو زامن جهازًا فيظهر هنا.', 'loadError' => 'تعذّر تحميل هذا اليوم.', 'retry' => 'حاول مرة أخرى', 'goalLabel' => 'الماء مقابل هدفك'];
            $base = str_starts_with($locale, 'ar') ? $ar : $en;
            foreach ($override as $key => $value) {
                $base[$key] = is_array($value) && isset($base[$key]) && is_array($base[$key]) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** "3 meals", "2 violations": the plural forms of mealsN, drinksN, sessionsN and violationsN. */
        function nq_ds_count(string $kind, int $n, string $locale): string
        {
            if (str_starts_with($locale, 'ar')) {
                $forms = [
                    'violations' => ['لا مخالفات', 'مخالفة واحدة', 'مخالفتان', 'مخالفات', 'مخالفة'],
                    'meals' => ['لا وجبات', 'وجبة واحدة', 'وجبتان', 'وجبات', 'وجبة'],
                    'drinks' => ['لا مشروبات', 'مشروب واحد', 'مشروبان', 'مشروبات', 'مشروبًا'],
                    'sessions' => ['لا جلسات', 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'],
                ][$kind];

                return $n === 0 ? $forms[0] : ($n === 1 ? $forms[1] : ($n === 2 ? $forms[2] : ($n <= 10 ? $n.' '.$forms[3] : $n.' '.$forms[4])));
            }
            $one = ['violations' => 'violation', 'meals' => 'meal', 'drinks' => 'drink', 'sessions' => 'session'][$kind];

            return $n === 1 ? '1 '.$one : $n.' '.$one.'s';
        }

        /** Adds whole days to a civil date (YYYY-MM-DD). UTC arithmetic: a daylight-saving change never skips or repeats a day. */
        function nq_ds_add_days(string $date, int $days): string
        {
            return (new \DateTimeImmutable($date.' 00:00:00', new \DateTimeZone('UTC')))->modify(($days >= 0 ? '+' : '').$days.' days')->format('Y-m-d');
        }

        /** Meals or drinks split by kind: the surplus over the parts is "unclassified", never dropped. */
        function nq_ds_unclassified(int $total, int ...$parts): int
        {
            return max(0, $total - array_sum($parts));
        }

        /** A figure with its unit in an LTR isolate, as the React Measure: tabular digits, number and unit keep their order. */
        function nq_ds_measure(float|int $value, string $unit, string $locale, int $maxFraction = 0): string
        {
            $ar = str_starts_with($locale, 'ar');
            $units = ['kcal' => 'kcal', 'bpm' => 'bpm', 'steps' => $ar ? 'خطوة' : 'steps', 'level' => '', 'milliliter' => 'mL', 'kilogram' => $ar ? 'كغ' : 'kg'];
            $figure = nq_health_number($value, $locale, $maxFraction);
            $label = $units[$unit] ?? $unit;

            return '<bdi data-slot="measure" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e($label === '' ? $figure : $figure.' '.$label).'</bdi>';
        }

        function nq_ds_duration(int $seconds, string $locale): string
        {
            return '<bdi data-slot="duration" data-numeric="" dir="ltr" class="tabular-nums [unicode-bidi:isolate]">'.e(nq_health_duration($seconds, $locale)).'</bdi>';
        }

        /** "Tuesday, September 29, 2026" in the locale, for a civil date. */
        function nq_ds_heading(string $date, string $locale): string
        {
            $d = new \DateTimeImmutable($date.' 12:00:00', new \DateTimeZone('UTC'));
            if (! class_exists(\IntlDatePatternGenerator::class)) {
                return $d->format('l, F j, Y');
            }
            $tag = str_replace('_', '-', $locale).'@numbers=latn';
            $pattern = (new \IntlDatePatternGenerator($tag))->getBestPattern('yMMMMEEEEd');

            return (new \IntlDateFormatter($tag, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, 'UTC', null, $pattern))->format($d);
        }
    }
@endphp
