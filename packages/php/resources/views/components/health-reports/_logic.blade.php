{{-- Internal: the words and pure helpers of the health report, ported from health-reports.tsx and report-math.ts. Included with
     @include('nasaq::components.health-reports._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_hr_words')) {
        /** The report's own words for a locale, laid over the shared health words. %d / %s are filled with sprintf. */
        function nq_hr_words(string $locale, array $override = []): array
        {
            $en = ['title' => 'Reports', 'lede' => 'Your recent days, in counts and averages. Days with no reading are left out, never counted as zero.', 'period' => 'Period', 'periodOption' => '%d days', 'export' => 'Export CSV', 'exporting' => 'Exporting', 'averages' => 'Averages', 'averagesDescription' => 'Across the %d days that reported each figure.', 'avgWater' => 'Average water', 'avgSteps' => 'Average steps', 'avgSleep' => 'Average sleep', 'avgHeartRate' => 'Average resting heart rate', 'weightChange' => 'Weight change', 'notEnough' => 'Not enough readings', 'trend' => 'Trend', 'metrics' => ['waterMl' => 'Water', 'steps' => 'Steps', 'sleepMinutes' => 'Sleep', 'weightKg' => 'Weight', 'restingHeartRate' => 'Resting heart rate', 'activeEnergyKcal' => 'Active energy'], 'metricPicker' => 'Figure to chart', 'trendSummary' => '%1$s over the last %2$d days', 'noReadings' => 'No readings in this period for this figure.', 'meals' => 'Meals', 'mealsDescription' => 'Meals per day by safety.', 'caffeine' => 'Caffeine', 'caffeineDescription' => 'Caffeine drinks per day, counted.', 'safe' => 'Safe', 'unsafe' => 'Unsafe', 'clean' => 'Clean', 'sugar' => 'With sugar', 'adherence' => 'Protocol days', 'adherenceDescription' => 'For each engine that judges days: days on protocol, off it, and days it declined to judge.', 'engine' => 'Engine', 'onProtocol' => 'On protocol', 'offProtocol' => 'Off protocol', 'notJudged' => 'Not judged', 'currentStreak' => 'Current streak', 'bestStreak' => 'Best streak', 'loadError' => 'The report could not be loaded.', 'retry' => 'Try again', 'empty' => 'No days in this period', 'emptyHint' => 'Log something or sync a device to build a report.', 'shutdownDays' => 'Days with shutdown violations', 'tableCaption' => 'Protocol days per engine'];
            $ar = ['title' => 'التقارير', 'lede' => 'أيامك الأخيرة بالأعداد والمتوسطات. الأيام بلا قراءة تُستبعد ولا تُحسب صفرًا.', 'period' => 'الفترة', 'periodOption' => '%d يومًا', 'export' => 'تصدير CSV', 'exporting' => 'جارٍ التصدير', 'averages' => 'المتوسطات', 'averagesDescription' => 'على مدى %d يومًا أبلغ كل رقم فيها.', 'avgWater' => 'متوسط الماء', 'avgSteps' => 'متوسط الخطوات', 'avgSleep' => 'متوسط النوم', 'avgHeartRate' => 'متوسط نبض الراحة', 'weightChange' => 'تغيّر الوزن', 'notEnough' => 'قراءات غير كافية', 'trend' => 'الاتجاه', 'metrics' => ['waterMl' => 'الماء', 'steps' => 'الخطوات', 'sleepMinutes' => 'النوم', 'weightKg' => 'الوزن', 'restingHeartRate' => 'نبض الراحة', 'activeEnergyKcal' => 'الطاقة النشطة'], 'metricPicker' => 'الرقم المعروض', 'trendSummary' => '%1$s خلال آخر %2$d يومًا', 'noReadings' => 'لا قراءات في هذه الفترة لهذا الرقم.', 'meals' => 'الوجبات', 'mealsDescription' => 'الوجبات في اليوم حسب الأمان.', 'caffeine' => 'الكافيين', 'caffeineDescription' => 'مشروبات الكافيين في اليوم، معدودة.', 'safe' => 'آمنة', 'unsafe' => 'غير آمنة', 'clean' => 'بدون سكر', 'sugar' => 'مع سكر', 'adherence' => 'أيام البروتوكول', 'adherenceDescription' => 'لكل محرّك يحكم على الأيام: أيام ضمن البروتوكول وخارجه وأيام امتنع عن تقييمها.', 'engine' => 'المحرّك', 'onProtocol' => 'ضمن البروتوكول', 'offProtocol' => 'خارج البروتوكول', 'notJudged' => 'لم تُقيَّم', 'currentStreak' => 'السلسلة الحالية', 'bestStreak' => 'أفضل سلسلة', 'loadError' => 'تعذّر تحميل التقرير.', 'retry' => 'حاول مرة أخرى', 'empty' => 'لا أيام في هذه الفترة', 'emptyHint' => 'سجّل شيئًا أو زامن جهازًا لبناء تقرير.', 'shutdownDays' => 'أيام فيها مخالفات إغلاق', 'tableCaption' => 'أيام البروتوكول لكل محرّك'];
            $base = nq_health_words($locale);
            foreach (array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override) as $key => $value) {
                $base[$key] = is_array($value) && isset($base[$key]) && is_array($base[$key]) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** Mean of the defined numeric values, or null when there are none. */
        function nq_hr_average(array $values): ?float
        {
            $present = array_values(array_filter($values, fn ($v) => is_int($v) || is_float($v)));

            return $present === [] ? null : array_sum($present) / count($present);
        }

        /** Averages that skip missing days, the weight change and the shutdown-violation day count (summariseReport). */
        function nq_hr_summarise(array $days): array
        {
            $col = fn (string $key) => array_map(fn ($d) => $d[$key] ?? null, $days);
            $weights = array_values(array_filter($days, fn ($d) => isset($d['weightKg'])));
            $fields = ['waterMl', 'meals', 'caffeine', 'pomodorosCompleted', 'shutdownViolations', 'steps', 'sleepMinutes', 'activeEnergyKcal', 'restingHeartRate', 'weightKg'];
            $weight = null;
            if (count($weights) > 1) {
                $first = $weights[0]['weightKg'];
                $last = $weights[count($weights) - 1]['weightKg'];
                $weight = ['first' => $first, 'last' => $last, 'change' => round($last - $first, 1)];
            }

            return [
                'days' => count($days),
                'daysWithData' => count(array_filter($days, function ($d) use ($fields) {
                    foreach ($fields as $f) {
                        if (isset($d[$f])) {
                            return true;
                        }
                    }

                    return false;
                })),
                'averages' => ['waterMl' => nq_hr_average($col('waterMl')), 'steps' => nq_hr_average($col('steps')), 'sleepMinutes' => nq_hr_average($col('sleepMinutes')), 'restingHeartRate' => nq_hr_average($col('restingHeartRate'))],
                'weight' => $weight,
                'daysWithShutdownViolations' => count(array_filter($days, fn ($d) => ($d['shutdownViolations'] ?? 0) > 0)),
            ];
        }

        /** One point per day for a chart; a day without the reading is null so a line breaks instead of dropping to zero. */
        function nq_hr_series(array $days, string $metric): array
        {
            return array_map(fn ($d) => ['date' => $d['date'], 'value' => $d[$metric] ?? null], $days);
        }

        /** The report as CSV with English column names and empty cells for missing figures (reportToCsv). */
        function nq_hr_csv(array $days): string
        {
            $columns = ['date' => fn ($d) => $d['date'], 'water_ml' => fn ($d) => $d['waterMl'] ?? '', 'meals_total' => fn ($d) => $d['meals']['total'] ?? '', 'meals_safe' => fn ($d) => $d['meals']['safe'] ?? '', 'meals_unsafe' => fn ($d) => $d['meals']['unsafe'] ?? '', 'caffeine_total' => fn ($d) => $d['caffeine']['total'] ?? '', 'caffeine_sugar' => fn ($d) => $d['caffeine']['sugar'] ?? '', 'caffeine_clean' => fn ($d) => $d['caffeine']['clean'] ?? '', 'pomodoros_completed' => fn ($d) => $d['pomodorosCompleted'] ?? '', 'shutdown_violations' => fn ($d) => $d['shutdownViolations'] ?? '', 'steps' => fn ($d) => $d['steps'] ?? '', 'sleep_minutes' => fn ($d) => $d['sleepMinutes'] ?? '', 'active_energy_kcal' => fn ($d) => $d['activeEnergyKcal'] ?? '', 'resting_heart_rate' => fn ($d) => $d['restingHeartRate'] ?? '', 'weight_kg' => fn ($d) => $d['weightKg'] ?? ''];
            $rows = array_map(fn ($d) => implode(',', array_map(fn ($get) => $get($d), $columns)), $days);

            return implode("\n", [implode(',', array_keys($columns)), ...$rows]);
        }
    }
@endphp
