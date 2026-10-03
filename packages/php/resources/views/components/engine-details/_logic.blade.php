{{-- Internal: the words and pure helpers of the engine details page, ported from engine-details.tsx, history-strip.tsx and the history
     part of health-engines.ts. Included with @include('nasaq::components.engine-details._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_ed_words')) {
        /** The page's own words for a locale, laid over the shared health words. %d / %s are filled with sprintf. */
        function nq_ed_words(string $locale, array $override = []): array
        {
            $en = ['back' => 'Back to today', 'lede' => 'What this engine says right now, and what it has recorded.', 'history' => 'History', 'historyDescription' => 'Days on protocol, off it, and days the engine declined to judge. Counts, never a rate.', 'window' => 'Window', 'windowOption' => '%d days', 'windowLabel' => 'History window', 'onProtocol' => 'Days on protocol', 'offProtocol' => 'Days off protocol', 'unevaluated' => 'Days not judged', 'currentStreak' => 'Current streak', 'bestStreak' => 'Best streak', 'entriesChart' => 'Entries per day', 'weeklyChart' => 'Days per week', 'entries' => 'Entries', 'chartSummary' => 'Protocol history for the last %d days', 'strip' => 'Every day', 'record' => 'Record', 'recordDescription' => 'What this engine has written down, newest first.', 'noRecord' => 'Nothing recorded yet.', 'noHistory' => 'No history yet', 'noHistoryHint' => 'History appears after the first day of tracking.', 'noLedger' => 'This engine keeps a ledger, not a day verdict.', 'noLedgerHint' => 'It never marks a day on or off protocol, because it makes no such judgement.', 'protocol' => 'The protocol', 'protocolDescription' => 'The fixed rules this engine follows. They live in the engine, not in this screen.', 'unit' => 'Loggable unit', 'dailyCap' => 'Daily cap', 'cooldown' => 'Cooldown between entries', 'blockAfterWake' => 'No caffeine after waking', 'windowBeforeSleep' => 'Window before sleep', 'allowedInside' => 'Allowed inside the window', 'graceWindow' => 'On-time window for a dose', 'familiesLabel' => 'Trigger families', 'minCycles' => 'Cycles needed for a prediction', 'irregularSpread' => 'Spread that withdraws a prediction', 'ovulationBefore' => 'Ovulation estimated before next start', 'fertileWindow' => 'Fertile window around ovulation', 'fertileWindowValue' => '%1$s before, %2$s after', 'methodsLabel' => 'Methods tracked', 'ownPlan' => 'Every interval comes from your own plan. The engine has no default.', 'loadError' => 'The history could not be loaded.', 'retry' => 'Try again', 'disclaimer' => 'Every line on this page is about the protocol and what was logged. None of it is a claim about your body.', 'dayLabel' => '%1$s: %2$s, %3$s', 'stripLabel' => 'Day by day, oldest first', 'legend' => 'Legend'];
            $ar = ['back' => 'العودة إلى اليوم', 'lede' => 'ما يقوله هذا المحرّك الآن، وما سجّله.', 'history' => 'السجل', 'historyDescription' => 'أيام ضمن البروتوكول وخارجه، وأيام امتنع المحرّك عن تقييمها. أعداد، وليست نسبًا.', 'window' => 'النطاق', 'windowOption' => '%d يومًا', 'windowLabel' => 'نطاق السجل', 'onProtocol' => 'أيام ضمن البروتوكول', 'offProtocol' => 'أيام خارج البروتوكول', 'unevaluated' => 'أيام لم تُقيَّم', 'currentStreak' => 'السلسلة الحالية', 'bestStreak' => 'أفضل سلسلة', 'entriesChart' => 'الإدخالات في اليوم', 'weeklyChart' => 'الأيام في الأسبوع', 'entries' => 'الإدخالات', 'chartSummary' => 'سجل البروتوكول لآخر %d يومًا', 'strip' => 'كل الأيام', 'record' => 'التسجيلات', 'recordDescription' => 'ما دوّنه هذا المحرّك، من الأحدث.', 'noRecord' => 'لا شيء مسجّل بعد.', 'noHistory' => 'لا سجل بعد', 'noHistoryHint' => 'يظهر السجل بعد أول يوم من التتبّع.', 'noLedger' => 'يحتفظ هذا المحرّك بدفتر تسجيلات، لا بحكم يومي.', 'noLedgerHint' => 'لا يصف أي يوم بأنه ضمن البروتوكول أو خارجه، لأنه لا يصدر هذا الحكم.', 'protocol' => 'البروتوكول', 'protocolDescription' => 'القواعد الثابتة التي يتبعها هذا المحرّك. مكانها المحرّك نفسه لا هذه الشاشة.', 'unit' => 'الوحدة القابلة للتسجيل', 'dailyCap' => 'السقف اليومي', 'cooldown' => 'الفاصل بين الإدخالات', 'blockAfterWake' => 'لا كافيين بعد الاستيقاظ', 'windowBeforeSleep' => 'النافذة قبل النوم', 'allowedInside' => 'المسموح داخل النافذة', 'graceWindow' => 'نافذة الجرعة في وقتها', 'familiesLabel' => 'عائلات المحفّزات', 'minCycles' => 'الدورات اللازمة للتوقع', 'irregularSpread' => 'التفاوت الذي يسحب التوقع', 'ovulationBefore' => 'الإباضة المقدّرة قبل البداية التالية', 'fertileWindow' => 'فترة الخصوبة حول الإباضة', 'fertileWindowValue' => '%1$s قبلها، و%2$s بعدها', 'methodsLabel' => 'الوسائل المتتبَّعة', 'ownPlan' => 'كل فاصل يأتي من خطتك أنت. لا قيمة افتراضية لدى المحرّك.', 'loadError' => 'تعذّر تحميل السجل.', 'retry' => 'حاول مرة أخرى', 'disclaimer' => 'كل سطر في هذه الصفحة عن البروتوكول وما سُجّل. ليس فيه أي ادعاء عن جسدك.', 'dayLabel' => '%1$s: %2$s، %3$s', 'stripLabel' => 'يومًا بيوم، من الأقدم', 'legend' => 'دليل الرموز'];
            $base = nq_health_words($locale);
            foreach (array_merge(str_starts_with($locale, 'ar') ? $ar : $en, $override) as $key => $value) {
                $base[$key] = is_array($value) && isset($base[$key]) && is_array($base[$key]) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** "1 entry", "6 entries": the strip's count of entries on a day. */
        function nq_ed_entries(int $n, string $locale): string
        {
            if (str_starts_with($locale, 'ar')) {
                return $n === 0 ? 'لا إدخالات' : ($n === 1 ? 'إدخال واحد' : ($n === 2 ? 'إدخالان' : ($n <= 10 ? $n.' إدخالات' : $n.' إدخالًا')));
            }

            return $n === 1 ? '1 entry' : $n.' entries';
        }

        /** The protocol constants each engine owns (ENGINE_PROTOCOL). */
        function nq_ed_protocol(): array
        {
            return [
                'hydration' => ['unitMl' => 250, 'dailyCapMl' => 5000, 'cooldownSeconds' => 30],
                'caffeine' => ['blockMinutes' => 90],
                'gerd' => ['windowHours' => 4, 'whitelist' => ['water', 'chamomile', 'anise']],
                'medication' => ['graceMinutes' => 60],
                'triggers' => ['families' => ['gout', 'ibs_gerd', 'fatty_liver']],
                'cycle' => ['minCycles' => 3, 'irregularSpreadDays' => 9, 'ovulationBeforeNextStartDays' => 14, 'fertileOpensBeforeOvulationDays' => 5, 'fertileClosesAfterOvulationDays' => 1],
                'contraceptive' => ['methods' => ['daily_pill', 'monthly_injection', 'implant']],
            ];
        }

        /** A long-form time unit with its count: "30 seconds", "1 day", "ثلاثة أيام" as the locale writes it. */
        function nq_ed_long(int|float $n, string $unit, string $locale): string
        {
            $figure = nq_health_number($n, $locale, 0);
            if (str_starts_with($locale, 'ar')) {
                $forms = ['second' => ['ثانية واحدة', 'ثانيتان', 'ثوانٍ', 'ثانية'], 'minute' => ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'], 'hour' => ['ساعة واحدة', 'ساعتان', 'ساعات', 'ساعة'], 'day' => ['يوم واحد', 'يومان', 'أيام', 'يومًا']][$unit];

                return $n == 1 ? $forms[0] : ($n == 2 ? $forms[1] : ($n >= 3 && $n <= 10 ? $figure.' '.$forms[2] : $figure.' '.$forms[3]));
            }

            return $figure.' '.$unit.($n == 1 ? '' : 's');
        }

        /** Counts and two streaks over an OLDEST-FIRST window of day verdicts. An unevaluated day ends a streak without counting as a failure. */
        function nq_ed_summarise(array $days): array
        {
            $t = ['daysTracked' => count($days), 'daysOnProtocol' => 0, 'daysOffProtocol' => 0, 'daysUnevaluated' => 0, 'currentStreak' => 0, 'bestStreak' => 0];
            $run = 0;
            foreach ($days as $day) {
                if ($day['verdict'] === 'on_protocol') {
                    $t['daysOnProtocol']++;
                    $run++;
                    $t['bestStreak'] = max($t['bestStreak'], $run);
                } else {
                    $run = 0;
                    $day['verdict'] === 'off_protocol' ? $t['daysOffProtocol']++ : $t['daysUnevaluated']++;
                }
            }
            for ($i = count($days) - 1; $i >= 0 && $days[$i]['verdict'] === 'on_protocol'; $i--) {
                $t['currentStreak']++;
            }

            return $t;
        }

        /** Groups a window into YYYY-MM months for the day strip, keeping order. */
        function nq_ed_group_months(array $days): array
        {
            $groups = [];
            foreach ($days as $day) {
                $month = substr($day['date'], 0, 7);
                if ($groups && end($groups)['month'] === $month) {
                    $groups[array_key_last($groups)]['days'][] = $day;
                } else {
                    $groups[] = ['month' => $month, 'days' => [$day]];
                }
            }

            return $groups;
        }

        /** Buckets an oldest-first window into runs of $size days for a stacked chart. The last bucket may be short. */
        function nq_ed_bucket(array $days, int $size = 7): array
        {
            $out = [];
            foreach (array_chunk($days, $size) as $slice) {
                $out[] = [
                    'start' => $slice[0]['date'],
                    'onProtocol' => count(array_filter($slice, fn ($d) => $d['verdict'] === 'on_protocol')),
                    'offProtocol' => count(array_filter($slice, fn ($d) => $d['verdict'] === 'off_protocol')),
                    'unevaluated' => count(array_filter($slice, fn ($d) => $d['verdict'] === 'unevaluated')),
                ];
            }

            return $out;
        }

        /** A civil date (YYYY-MM-DD) in the locale: kind 'short' = "29 Sep", 'month' = "September 2026", 'medium' = "Sep 29, 2026". */
        function nq_ed_civil(string $date, string $locale, string $kind): string
        {
            $d = new \DateTimeImmutable($date.' 12:00:00', new \DateTimeZone('UTC'));
            if (! class_exists(\IntlDateFormatter::class)) {
                return $d->format(['short' => 'M j', 'month' => 'F Y', 'medium' => 'M j, Y'][$kind]);
            }
            $tag = str_replace('_', '-', $locale).'@numbers=latn';
            $f = $kind === 'medium'
                ? new \IntlDateFormatter($tag, \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, 'UTC')
                : new \IntlDateFormatter($tag, \IntlDateFormatter::NONE, \IntlDateFormatter::NONE, 'UTC', null, $kind === 'short' ? 'd MMM' : 'LLLL y');

            return $f->format($d);
        }
    }
@endphp
