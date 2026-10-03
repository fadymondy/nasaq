{{-- Internal: helpers of x-nq::client-portal, ported from client-portal-logic.ts and the strings of client-portal.tsx. Included once per render. --}}
@php
    if (! function_exists('nq_cp_words')) {
        /** The built-in words by locale, with the host's overrides on top. Sentences keep {n}, {done}, {total}, {used}, {budget} for the caller. */
        function nq_cp_words(string $locale, array $override = []): array
        {
            $en = [
                'tabs' => ['overview' => 'Overview', 'board' => 'Board', 'requests' => 'Requests', 'time' => 'Time', 'invoices' => 'Invoices', 'activity' => 'Activity'],
                'progress' => 'Progress', 'tasksDone' => '{done} of {total} tasks done', 'percentDone' => 'done', 'hoursUsed' => 'Hours used', 'hoursBudget' => 'Budget',
                'hoursLeft' => 'Hours left', 'openIssues' => 'Open issues', 'pendingRequests' => 'Waiting for a reply', 'weekly' => 'Hours per week',
                'weeklyLabel' => 'Hours in the last {n} weeks', 'budgetUsed' => '{used} of {budget} hours used', 'overBudget' => 'Over budget', 'noBudget' => 'No hours budget set',
                'weekOf' => 'Week of', 'hours' => 'Hours', 'boardNote' => 'A read-only view of the board.',
                'columns' => ['todo' => 'To do', 'doing' => 'In progress', 'review' => 'In review', 'done' => 'Done'], 'noCards' => 'Nothing here', 'unassigned' => 'Unassigned',
                'requests' => 'Requests', 'newRequest' => 'Ask for something', 'requestTitle' => 'What do you need?', 'requestDetails' => 'Details', 'requestDetailsOptional' => '(optional)',
                'send' => 'Send request', 'titleRequired' => 'Tell us what you need.', 'sent' => 'Sent. We will reply here.', 'noRequests' => 'No requests yet',
                'noRequestsBody' => 'Ask for a change or a new feature and it shows up here.',
                'requestStatus' => ['pending' => 'Waiting', 'accepted' => 'Accepted', 'declined' => 'Declined', 'done' => 'Done'], 'by' => 'By', 'total' => 'Total hours',
                'weeksTable' => 'Hours by week', 'noTime' => 'No hours logged yet', 'noInvoices' => 'No invoices yet', 'noInvoicesBody' => 'Invoices appear here once they are sent to you.',
                'noActivity' => 'Nothing has happened yet', 'due' => 'Due',
            ];
            $ar = [
                'tabs' => ['overview' => 'نظرة عامة', 'board' => 'اللوحة', 'requests' => 'الطلبات', 'time' => 'الوقت', 'invoices' => 'الفواتير', 'activity' => 'النشاط'],
                'progress' => 'التقدم', 'tasksDone' => 'أُنجزت {done} من {total} مهمة', 'percentDone' => 'مكتمل', 'hoursUsed' => 'الساعات المستخدمة', 'hoursBudget' => 'الميزانية',
                'hoursLeft' => 'الساعات المتبقية', 'openIssues' => 'مشكلات مفتوحة', 'pendingRequests' => 'بانتظار الرد', 'weekly' => 'الساعات في الأسبوع',
                'weeklyLabel' => 'الساعات في آخر {n} أسابيع', 'budgetUsed' => 'استُخدمت {used} من {budget} ساعة', 'overBudget' => 'تجاوزت الميزانية', 'noBudget' => 'لا توجد ميزانية ساعات',
                'weekOf' => 'أسبوع', 'hours' => 'الساعات', 'boardNote' => 'عرض للقراءة فقط للوحة.',
                'columns' => ['todo' => 'للتنفيذ', 'doing' => 'قيد التنفيذ', 'review' => 'قيد المراجعة', 'done' => 'منجز'], 'noCards' => 'لا شيء هنا', 'unassigned' => 'بلا مسؤول',
                'requests' => 'الطلبات', 'newRequest' => 'اطلب شيئًا', 'requestTitle' => 'ماذا تحتاج؟', 'requestDetails' => 'التفاصيل', 'requestDetailsOptional' => '(اختياري)',
                'send' => 'إرسال الطلب', 'titleRequired' => 'أخبرنا بما تحتاجه.', 'sent' => 'أُرسل. سنرد عليك هنا.', 'noRequests' => 'لا طلبات بعد',
                'noRequestsBody' => 'اطلب تعديلًا أو ميزة جديدة وستظهر هنا.',
                'requestStatus' => ['pending' => 'بانتظار الرد', 'accepted' => 'مقبول', 'declined' => 'مرفوض', 'done' => 'منجز'], 'by' => 'بواسطة', 'total' => 'إجمالي الساعات',
                'weeksTable' => 'الساعات حسب الأسبوع', 'noTime' => 'لم تُسجَّل ساعات بعد', 'noInvoices' => 'لا فواتير بعد', 'noInvoicesBody' => 'تظهر الفواتير هنا بعد إرسالها إليك.',
                'noActivity' => 'لم يحدث شيء بعد', 'due' => 'الاستحقاق',
            ];

            return array_replace_recursive(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_cp_fill(string $sentence, array $vars = []): string
        {
            foreach ($vars as $k => $v) {
                $sentence = str_replace('{'.$k.'}', (string) $v, $sentence);
            }

            return $sentence;
        }

        /** A number in the locale with Latin digits. Options: percent (bool), max (max fraction digits). */
        function nq_cp_num(float|int $n, string $locale, array $o = []): string
        {
            if (! class_exists(\NumberFormatter::class)) {
                return ! empty($o['percent']) ? round($n * 100).'%' : (string) round($n, $o['max'] ?? 0);
            }
            $f = new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', ! empty($o['percent']) ? \NumberFormatter::PERCENT : \NumberFormatter::DECIMAL);
            if (isset($o['max'])) {
                $f->setAttribute(\NumberFormatter::MAX_FRACTION_DIGITS, (int) $o['max']);
            }

            return (string) $f->format($n);
        }

        /** An ISO date in the locale. $pattern null = the medium date style; otherwise an ICU pattern such as "MMM d". */
        function nq_cp_date(string $iso, string $locale, ?string $pattern = null): string
        {
            $d = \Carbon\Carbon::parse($iso);
            $tz = $d->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', $pattern ? \IntlDateFormatter::NONE : \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $tz, null, $pattern);

            return (string) $f->format($d->getTimestamp());
        }

        function nq_cp_progress(array $tasks): array
        {
            $by = ['todo' => 0, 'doing' => 0, 'review' => 0, 'done' => 0];
            foreach ($tasks as $t) {
                $by[$t['status']] = ($by[$t['status']] ?? 0) + 1;
            }
            $total = count($tasks);

            return ['total' => $total, 'done' => $by['done'], 'percent' => $total === 0 ? 0 : (int) round($by['done'] / $total * 100), 'byStatus' => $by];
        }

        /** Hours against the budget: warns from 80 percent, danger once over; a zero budget is never over. */
        function nq_cp_budget(float|int $budget, float|int $used): array
        {
            $b = max(0, $budget);
            $u = max(0, $used);
            $ratio = $b == 0 ? 0 : $u / $b;

            return [
                'budget' => $b, 'used' => $u, 'remaining' => max(0, $b - $u), 'percent' => (int) min(100, round($ratio * 100)), 'over' => $b > 0 && $u > $b,
                'tone' => $b > 0 && $u > $b ? 'danger' : ($ratio >= 0.8 ? 'warning' : 'success'),
            ];
        }

        function nq_cp_total_hours(array $weeks): float
        {
            return round(array_sum(array_map(fn ($w) => $w['hours'], $weeks)) * 10) / 10;
        }

        function nq_cp_weeks_newest_first(array $weeks): array
        {
            usort($weeks, fn ($a, $b) => strcmp($b['week'], $a['week']));

            return $weeks;
        }

        function nq_cp_ring(float|int $percent, float|int $radius): array
        {
            $clamped = min(100, max(0, $percent));
            $c = 2 * M_PI * $radius;

            return ['circumference' => $c, 'offset' => $c * (1 - $clamped / 100)];
        }
    }
@endphp
