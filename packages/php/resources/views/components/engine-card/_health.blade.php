{{-- Internal: the engine-card vocabulary and the pure helpers ported from health-engines.ts and health-format.tsx.
     Included with @include('nasaq::components.engine-card._health'); every function is defined once. --}}
@php
    if (! function_exists('nq_health_words')) {
        /** The shared vocabulary plus the card's own words for a locale ($override merged one level deep). Placeholders are sprintf %1$s / %2$s. */
        function nq_health_words(string $locale, array $override = []): array
        {
            $en = ['engines' => ['hydration' => ['title' => 'Hydration', 'subtitle' => 'One fixed unit at a time, up to a daily cap.'], 'caffeine' => ['title' => 'Caffeine Block', 'subtitle' => 'No caffeine for a set time after waking.'], 'gerd' => ['title' => 'GERD Window', 'subtitle' => 'Only water, chamomile or anise before sleep.'], 'medication' => ['title' => 'Medication Grace', 'subtitle' => 'Was each scheduled dose logged, and on time?'], 'triggers' => ['title' => 'Trigger Families', 'subtitle' => 'What was logged, by trigger family.'], 'cycle' => ['title' => 'Cycle', 'subtitle' => 'Predictions only when the history supports them.'], 'contraceptive' => ['title' => 'Contraceptive Schedule', 'subtitle' => 'What has been recorded against your own plan.']], 'states' => ['hydration.idle' => 'Ready to log', 'hydration.cooldown' => 'Cooling down', 'hydration.capped' => 'Daily cap reached', 'caffeine.awaiting_wake' => 'Waiting for wake time', 'caffeine.blocked' => 'Blocked', 'caffeine.clear' => 'Clear', 'gerd.unanchored' => 'No sleep time set', 'gerd.open' => 'Window closed', 'gerd.window_active' => 'Window active', 'gerd.sleeping' => 'Sleeping', 'medication.none' => 'No doses today', 'medication.grace_open' => 'Dose window open', 'medication.missed' => 'Dose not logged', 'medication.scheduled' => 'Scheduled', 'medication.late_logged' => 'Logged late', 'medication.logged' => 'All logged', 'triggers.none' => 'Nothing logged', 'triggers.unjudged' => 'Not judged', 'triggers.clear' => 'No trigger logged', 'triggers.exposed' => 'Trigger logged', 'cycle.insufficient' => 'Building history', 'cycle.calibrated' => 'Prediction offered', 'cycle.suspended' => 'Prediction withdrawn', 'contraceptive.unconfigured' => 'Not set up', 'contraceptive.on_schedule' => 'On schedule', 'contraceptive.due' => 'Due', 'contraceptive.overdue' => 'Overdue', 'contraceptive.expiring' => 'Expiring soon', 'contraceptive.expired' => 'Expired'], 'doseStatus' => ['scheduled' => 'Scheduled', 'grace_open' => 'Window open', 'logged' => 'Logged', 'late_logged' => 'Logged late', 'missed' => 'Not logged'], 'verdicts' => ['on_protocol' => 'On protocol', 'off_protocol' => 'Off protocol', 'unevaluated' => 'Not judged'], 'families' => ['gout' => 'Gout', 'ibs_gerd' => 'IBS and reflux', 'fatty_liver' => 'Fatty liver'], 'whitelist' => ['water' => 'Water', 'chamomile' => 'Chamomile', 'anise' => 'Anise'], 'methods' => ['daily_pill' => 'Daily pill', 'monthly_injection' => 'Monthly injection', 'implant' => 'Implant'], 'units' => ['kcal' => 'kcal', 'bpm' => 'bpm', 'steps' => 'steps', 'bmi' => 'kg/m²', 'level' => '', 'cups' => 'cups', 'cycles' => 'cycles'], 'consult' => 'Consult your doctor.', 'unavailable' => 'Unavailable', 'daysUnit' => 'days', 'details' => 'Details', 'logUnit' => 'Log one unit', 'logWake' => 'I woke up', 'logDose' => 'Log dose', 'recordDose' => 'Record a dose', 'wait' => 'Wait %1$s', 'working' => 'Working…', 'unitsToday' => 'Units today', 'ofCap' => 'of', 'blockProgress' => 'Block', 'blockLeft' => '%1$s left', 'blockOver' => 'The block has ended.', 'blockWaiting' => 'Log when you woke up to start the block.', 'cupsToday' => 'Caffeine drinks today', 'cupsOf' => '%1$s of %2$s', 'violations' => 'Logged inside the block', 'windowLabel' => 'Window', 'windowRange' => '%1$s to %2$s', 'windowLeft' => '%1$s left in the window', 'windowNone' => 'Set your bedtime to open a window.', 'allowedInside' => 'Allowed inside the window', 'gerdViolations' => 'Outside the list, today', 'needsReview' => 'Needs review', 'nextDose' => 'Next dose', 'noDoses' => 'No doses are scheduled today.', 'logged' => 'Logged', 'triggerBearing' => 'Trigger-bearing', 'safe' => 'Judged safe', 'unclassified' => 'Not judged', 'unclassifiedNote' => 'An item nobody has classified is not judged. It is never shown as safe.', 'byFamily' => 'By family', 'calibration' => 'Cycles counted', 'calibrationValue' => '%1$s of %2$s', 'average' => 'Average cycle', 'nextStart' => 'Next expected start', 'ovulation' => 'Estimated ovulation', 'fertile' => 'Fertile window', 'fertileRange' => '%1$s to %2$s', 'reasons' => ['insufficient_cycles' => 'Not enough cycles are recorded yet.', 'irregular' => 'Recent cycles vary too much for a prediction.', 'recalibrating' => 'Building up history again after a suspension.'], 'predictionNote' => 'A prediction is not a guarantee.', 'method' => 'Method', 'nextDue' => 'Next due', 'lastRecorded' => 'Last recorded', 'daysOverdue' => 'Past the plan', 'unconfiguredNote' => 'Add your schedule to start tracking.', 'graceNote' => 'Each dose can be logged on time for %1$s after its scheduled time.', 'noSnapshot' => 'Something went wrong. Try again.', 'stateLabel' => 'State'];
            $ar = ['engines' => ['hydration' => ['title' => 'شرب الماء', 'subtitle' => 'وحدة ثابتة واحدة في كل مرة، حتى سقف يومي.'], 'caffeine' => ['title' => 'حظر الكافيين', 'subtitle' => 'لا كافيين لفترة محددة بعد الاستيقاظ.'], 'gerd' => ['title' => 'نافذة الارتجاع', 'subtitle' => 'الماء أو البابونج أو اليانسون فقط قبل النوم.'], 'medication' => ['title' => 'مهلة الدواء', 'subtitle' => 'هل سُجّلت كل جرعة مجدولة، وفي وقتها؟'], 'triggers' => ['title' => 'عائلات المحفّزات', 'subtitle' => 'ما سُجّل، بحسب عائلة المحفّز.'], 'cycle' => ['title' => 'الدورة الشهرية', 'subtitle' => 'لا توقعات إلا حين يدعمها السجل.'], 'contraceptive' => ['title' => 'جدول وسائل منع الحمل', 'subtitle' => 'ما سُجّل مقابل خطتك أنت.']], 'states' => ['hydration.idle' => 'جاهز للتسجيل', 'hydration.cooldown' => 'فترة انتظار', 'hydration.capped' => 'بلغت السقف اليومي', 'caffeine.awaiting_wake' => 'بانتظار وقت الاستيقاظ', 'caffeine.blocked' => 'محظور', 'caffeine.clear' => 'مسموح', 'gerd.unanchored' => 'لم يُحدَّد وقت النوم', 'gerd.open' => 'النافذة مغلقة', 'gerd.window_active' => 'النافذة نشطة', 'gerd.sleeping' => 'نائم', 'medication.none' => 'لا جرعات اليوم', 'medication.grace_open' => 'نافذة الجرعة مفتوحة', 'medication.missed' => 'جرعة غير مسجّلة', 'medication.scheduled' => 'مجدولة', 'medication.late_logged' => 'سُجّلت متأخرة', 'medication.logged' => 'سُجّلت كلها', 'triggers.none' => 'لا شيء مسجّل', 'triggers.unjudged' => 'لم يُقيَّم', 'triggers.clear' => 'لا محفّز مسجّل', 'triggers.exposed' => 'سُجّل محفّز', 'cycle.insufficient' => 'بناء السجل', 'cycle.calibrated' => 'التوقع متاح', 'cycle.suspended' => 'سُحب التوقع', 'contraceptive.unconfigured' => 'لم يُعدّ بعد', 'contraceptive.on_schedule' => 'في الموعد', 'contraceptive.due' => 'مستحقة', 'contraceptive.overdue' => 'متأخرة', 'contraceptive.expiring' => 'تنتهي قريبًا', 'contraceptive.expired' => 'منتهية'], 'doseStatus' => ['scheduled' => 'مجدولة', 'grace_open' => 'النافذة مفتوحة', 'logged' => 'مسجّلة', 'late_logged' => 'سُجّلت متأخرة', 'missed' => 'غير مسجّلة'], 'verdicts' => ['on_protocol' => 'ضمن البروتوكول', 'off_protocol' => 'خارج البروتوكول', 'unevaluated' => 'لم يُقيَّم'], 'families' => ['gout' => 'النقرس', 'ibs_gerd' => 'القولون والارتجاع', 'fatty_liver' => 'الكبد الدهني'], 'whitelist' => ['water' => 'الماء', 'chamomile' => 'البابونج', 'anise' => 'اليانسون'], 'methods' => ['daily_pill' => 'حبوب يومية', 'monthly_injection' => 'حقنة شهرية', 'implant' => 'غرسة'], 'units' => ['kcal' => 'kcal', 'bpm' => 'bpm', 'steps' => 'خطوة', 'bmi' => 'kg/m²', 'level' => '', 'cups' => 'أكواب', 'cycles' => 'دورات'], 'consult' => 'استشر طبيبك.', 'unavailable' => 'غير متاح', 'daysUnit' => 'أيام', 'details' => 'التفاصيل', 'logUnit' => 'سجّل وحدة', 'logWake' => 'استيقظت', 'logDose' => 'سجّل الجرعة', 'recordDose' => 'سجّل جرعة', 'wait' => 'انتظر %1$s', 'working' => 'جارٍ التنفيذ…', 'unitsToday' => 'وحدات اليوم', 'ofCap' => 'من', 'blockProgress' => 'الحظر', 'blockLeft' => 'متبقٍّ %1$s', 'blockOver' => 'انتهى الحظر.', 'blockWaiting' => 'سجّل وقت استيقاظك لبدء الحظر.', 'cupsToday' => 'مشروبات الكافيين اليوم', 'cupsOf' => '%1$s من %2$s', 'violations' => 'سُجّل داخل الحظر', 'windowLabel' => 'النافذة', 'windowRange' => 'من %1$s إلى %2$s', 'windowLeft' => 'متبقٍّ %1$s من النافذة', 'windowNone' => 'حدّد موعد نومك لفتح نافذة.', 'allowedInside' => 'المسموح داخل النافذة', 'gerdViolations' => 'خارج القائمة اليوم', 'needsReview' => 'بحاجة إلى مراجعة', 'nextDose' => 'الجرعة التالية', 'noDoses' => 'لا توجد جرعات مجدولة اليوم.', 'logged' => 'سُجّلت', 'triggerBearing' => 'يحمل محفّزًا', 'safe' => 'مُقيَّم آمنًا', 'unclassified' => 'لم يُقيَّم', 'unclassifiedNote' => 'ما لم يصنّفه أحد يبقى غير مُقيَّم، ولا يُعرض أبدًا على أنه آمن.', 'byFamily' => 'بحسب العائلة', 'calibration' => 'الدورات المحسوبة', 'calibrationValue' => '%1$s من %2$s', 'average' => 'متوسط الدورة', 'nextStart' => 'البداية المتوقعة التالية', 'ovulation' => 'الإباضة المقدّرة', 'fertile' => 'فترة الخصوبة', 'fertileRange' => 'من %1$s إلى %2$s', 'reasons' => ['insufficient_cycles' => 'لم تُسجَّل دورات كافية بعد.', 'irregular' => 'الدورات الأخيرة متفاوتة جدًا لإعطاء توقع.', 'recalibrating' => 'يُعاد بناء السجل بعد تعليق التوقع.'], 'predictionNote' => 'التوقع ليس ضمانًا.', 'method' => 'الوسيلة', 'nextDue' => 'الموعد التالي', 'lastRecorded' => 'آخر تسجيل', 'daysOverdue' => 'بعد الخطة', 'unconfiguredNote' => 'أضف جدولك لبدء التتبّع.', 'graceNote' => 'يمكن تسجيل كل جرعة في وقتها خلال %1$s من موعدها.', 'noSnapshot' => 'حدث خطأ ما. حاول مرة أخرى.', 'stateLabel' => 'الحالة'];
            $base = str_starts_with($locale, 'ar') ? $ar : $en;
            foreach ($override as $key => $value) {
                $base[$key] = is_array($value) && isset($base[$key]) && is_array($base[$key]) ? array_merge($base[$key], $value) : $value;
            }

            return $base;
        }

        /** Medication roll-up: counts and the most pressing state across today's doses. */
        function nq_health_summarise_medication(array $doses): array
        {
            $count = fn (string $s) => count(array_filter($doses, fn ($d) => $d['status'] === $s));
            $sum = ['total' => count($doses), 'logged' => $count('logged'), 'lateLogged' => $count('late_logged'), 'missed' => $count('missed'), 'graceOpen' => $count('grace_open'), 'scheduled' => $count('scheduled')];
            $sum['state'] = $sum['total'] === 0 ? 'none' : ($sum['graceOpen'] > 0 ? 'grace_open' : ($sum['missed'] > 0 ? 'missed' : ($sum['scheduled'] > 0 ? 'scheduled' : ($sum['lateLogged'] > 0 ? 'late_logged' : 'logged'))));

            return $sum;
        }

        /** The state name shown on the badge and used to look up its label. */
        function nq_health_state_key(array $s): string
        {
            return match ($s['engine']) {
                'medication' => nq_health_summarise_medication($s['doses'] ?? [])['state'],
                'triggers' => ($s['triggerBearing'] ?? 0) > 0 ? 'exposed' : ((($s['safe'] ?? 0) + ($s['unclassified'] ?? 0)) === 0 ? 'none' : ((($s['unclassified'] ?? 0) > 0 && ($s['safe'] ?? 0) === 0) ? 'unjudged' : 'clear')),
                default => $s['state'],
            };
        }

        /** The semantic tone of an engine's state. It always travels with a label and an icon. */
        function nq_health_tone(array $s): string
        {
            $tones = [
                'hydration.idle' => 'neutral', 'hydration.cooldown' => 'info', 'hydration.capped' => 'success',
                'caffeine.awaiting_wake' => 'neutral', 'caffeine.blocked' => 'warning', 'caffeine.clear' => 'success',
                'gerd.unanchored' => 'neutral', 'gerd.open' => 'success', 'gerd.window_active' => 'warning', 'gerd.sleeping' => 'info',
                'medication.none' => 'neutral', 'medication.grace_open' => 'info', 'medication.missed' => 'warning', 'medication.scheduled' => 'neutral', 'medication.late_logged' => 'warning', 'medication.logged' => 'success',
                'triggers.none' => 'neutral', 'triggers.unjudged' => 'neutral', 'triggers.clear' => 'success', 'triggers.exposed' => 'warning',
                'cycle.insufficient' => 'neutral', 'cycle.calibrated' => 'success', 'cycle.suspended' => 'warning',
                'contraceptive.unconfigured' => 'neutral', 'contraceptive.on_schedule' => 'success', 'contraceptive.due' => 'info', 'contraceptive.overdue' => 'danger', 'contraceptive.expiring' => 'warning', 'contraceptive.expired' => 'danger',
            ];

            return $tones[$s['engine'].'.'.nq_health_state_key($s)] ?? 'neutral';
        }

        function nq_health_dose_tone(string $status): string
        {
            return $status === 'logged' ? 'success' : ($status === 'grace_open' ? 'info' : ($status === 'scheduled' ? 'neutral' : 'warning'));
        }

        /** A date-like value as Carbon. Carbon names the zone of "...Z" strings "Z", which IntlDateFormatter rejects, so it becomes UTC. */
        function nq_health_date($value): \Carbon\Carbon
        {
            $d = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));

            return $d->getTimezone()->getName() === 'Z' ? $d->setTimezone('UTC') : $d;
        }

        /** Whole seconds until a deadline, floored at zero. $now is a Carbon, a timestamp or null (the clock). */
        function nq_health_seconds_until($deadline, $now = null): int
        {
            if (! $deadline) {
                return 0;
            }
            $at = nq_health_date($deadline)->getTimestamp();
            $from = $now ? nq_health_date($now)->getTimestamp() : time();

            return max(0, (int) ceil($at - $from));
        }

        /** Splits seconds into at most two units: 1 h 12 min, 4 min 30 s, 25 s. */
        function nq_health_split_duration(int $total): array
        {
            $s = max(0, $total);
            $h = intdiv($s, 3600);
            $m = intdiv($s % 3600, 60);
            $sec = $s % 60;
            if ($h) {
                return $m ? [['hour', $h], ['minute', $m]] : [['hour', $h]];
            }
            if ($m) {
                return $sec ? [['minute', $m], ['second', $sec]] : [['minute', $m]];
            }

            return [['second', $sec]];
        }

        /** A number in the locale with Latin digits. */
        function nq_health_number(float|int $value, string $locale, int $maxFraction = 0): string
        {
            if (! class_exists(\NumberFormatter::class)) {
                return (string) round($value, $maxFraction);
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL);
            $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, $maxFraction);

            return $f->format($value);
        }

        /** "1 h 12 min" in the locale. */
        function nq_health_duration(int $seconds, string $locale): string
        {
            $ar = str_starts_with($locale, 'ar');
            $unit = $ar ? ['hour' => 'س', 'minute' => 'د', 'second' => 'ث'] : ['hour' => 'hr', 'minute' => 'min', 'second' => 'sec'];

            return implode(' ', array_map(fn ($p) => nq_health_number($p[1], $locale).' '.$unit[$p[0]], nq_health_split_duration($seconds)));
        }

        /** A figure with its unit. Custom units (cups, level, kcal ...) take their label from the vocabulary; level is a bare count. */
        function nq_health_measure_text(float|int $value, string $unit, string $locale, array $words, int $maxFraction = 0, bool $long = false): string
        {
            $figure = nq_health_number($value, $locale, $maxFraction);
            $ar = str_starts_with($locale, 'ar');
            if (array_key_exists($unit, $words['units'])) {
                return $words['units'][$unit] === '' ? $figure : $figure.' '.$words['units'][$unit];
            }
            $label = match ($unit) {
                'milliliter' => 'mL',
                'day' => $ar ? ($value >= 3 && $value <= 10 ? 'أيام' : 'يوم') : ($value == 1 ? 'day' : 'days'),
                default => $unit,
            };

            return $figure.' '.$label;
        }
    }
@endphp
