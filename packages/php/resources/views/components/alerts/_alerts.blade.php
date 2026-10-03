{{-- Internal: the words and helpers shared by the alert list and security alerts (port of web/src/components/alerts/alerts.tsx and alerts-format.ts).
     Included with @include('nasaq::components.alerts._alerts'); every function is defined once.
     Strings with a value in them use {n} / {total} placeholders. --}}
@php
    if (! function_exists('nq_alerts_strings')) {
        /** The built-in words for a locale, with `$labels` laid over them. */
        function nq_alerts_strings(string $locale, array $labels = []): array
        {
            $ar = str_starts_with($locale, 'ar');

            return array_replace_recursive($ar ? [
                'title' => 'التنبيهات', 'securityTitle' => 'تنبيهات الأمان', 'search' => 'بحث في التنبيهات', 'searchPlaceholder' => 'ابحث بالعنوان أو المصدر أو المعرّف',
                'status' => ['all' => 'الكل', 'open' => 'مفتوح', 'acknowledged' => 'تم الاطلاع', 'resolved' => 'تم الحل'],
                'severity' => ['critical' => 'حرج', 'high' => 'مرتفع', 'medium' => 'متوسط', 'low' => 'منخفض', 'info' => 'معلومة'],
                'allSeverities' => 'كل المستويات', 'allSources' => 'كل المصادر', 'severityFilter' => 'الخطورة', 'sourceFilter' => 'المصدر', 'sortLabel' => 'الترتيب',
                'sort' => ['newest' => 'الأحدث أولًا', 'severity' => 'الأشد خطورة أولًا'],
                'acknowledge' => 'تأكيد الاطلاع', 'resolve' => 'تم الحل', 'reopen' => 'إعادة الفتح', 'details' => 'عرض التفاصيل', 'hideDetails' => 'إخفاء التفاصيل',
                'timeline' => 'الخط الزمني', 'noTimeline' => 'لا يوجد نشاط بعد.',
                'events' => ['created' => 'تم إطلاق التنبيه', 'notified' => 'تم إخطار الفريق', 'acknowledged' => 'تم الاطلاع', 'resolved' => 'تم الحل', 'reopened' => 'أُعيد فتحه', 'escalated' => 'تم التصعيد', 'comment' => 'تعليق'],
                'firedTimes' => 'تكرر {n} مرات', 'source' => 'المصدر', 'emptyTitle' => 'لا توجد تنبيهات', 'emptyBody' => 'لا شيء يطابق هذه المرشحات.',
                'emptyAll' => 'كل شيء هادئ. ستظهر التنبيهات الجديدة هنا.', 'clear' => 'مسح المرشحات', 'shown' => 'عرض {n} من {total}',
                'failed' => 'لم تنجح العملية. حاول مرة أخرى.', 'category' => 'الفئة',
                'categories' => ['auth' => 'تسجيل الدخول', 'network' => 'الشبكة', 'malware' => 'برمجيات خبيثة', 'data' => 'البيانات', 'policy' => 'السياسات', 'other' => 'أخرى'],
                'ip' => 'عنوان IP', 'location' => 'الموقع', 'account' => 'الحساب', 'recommendation' => 'الإجراء المقترح', 'label' => 'التنبيهات', 'loading' => 'جارٍ تحميل التنبيهات',
                'blockIp' => 'حظر عنوان IP', 'falsePositive' => 'تحديد كإنذار كاذب',
            ] : [
                'title' => 'Alerts', 'securityTitle' => 'Security alerts', 'search' => 'Search alerts', 'searchPlaceholder' => 'Search by title, source or ID',
                'status' => ['all' => 'All', 'open' => 'Open', 'acknowledged' => 'Acknowledged', 'resolved' => 'Resolved'],
                'severity' => ['critical' => 'Critical', 'high' => 'High', 'medium' => 'Medium', 'low' => 'Low', 'info' => 'Info'],
                'allSeverities' => 'All severities', 'allSources' => 'All sources', 'severityFilter' => 'Severity', 'sourceFilter' => 'Source', 'sortLabel' => 'Sort',
                'sort' => ['newest' => 'Newest first', 'severity' => 'Most severe first'],
                'acknowledge' => 'Acknowledge', 'resolve' => 'Resolve', 'reopen' => 'Reopen', 'details' => 'Show details', 'hideDetails' => 'Hide details',
                'timeline' => 'Timeline', 'noTimeline' => 'No activity yet.',
                'events' => ['created' => 'Alert raised', 'notified' => 'Team notified', 'acknowledged' => 'Acknowledged', 'resolved' => 'Resolved', 'reopened' => 'Reopened', 'escalated' => 'Escalated', 'comment' => 'Comment'],
                'firedTimes' => 'Fired {n} times', 'source' => 'Source', 'emptyTitle' => 'No alerts', 'emptyBody' => 'Nothing matches these filters.',
                'emptyAll' => 'All quiet. New alerts will appear here.', 'clear' => 'Clear filters', 'shown' => 'Showing {n} of {total}',
                'failed' => 'That did not work. Try again.', 'category' => 'Category',
                'categories' => ['auth' => 'Sign-in', 'network' => 'Network', 'malware' => 'Malware', 'data' => 'Data', 'policy' => 'Policy', 'other' => 'Other'],
                'ip' => 'IP address', 'location' => 'Location', 'account' => 'Account', 'recommendation' => 'Recommended action', 'label' => 'Alerts', 'loading' => 'Loading alerts',
                'blockIp' => 'Block IP', 'falsePositive' => 'Mark as false positive',
            ], $labels);
        }
    }

    if (! function_exists('nq_alerts_date')) {
        /** A date as Carbon in UTC when it came with a "Z". Numbers above 1e11 are milliseconds, smaller ones seconds. */
        function nq_alerts_date(mixed $value): \Carbon\Carbon
        {
            if ($value instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($value);
            }
            if (is_numeric($value)) {
                return $value > 1e11 ? \Carbon\Carbon::createFromTimestampMs((int) $value, 'UTC') : \Carbon\Carbon::createFromTimestamp((int) $value, 'UTC');
            }
            $date = \Carbon\Carbon::parse((string) $value);

            return $date->getTimezone()->getName() === 'Z' ? $date->setTimezone('UTC') : $date;
        }
    }

    if (! function_exists('nq_alerts_ms')) {
        function nq_alerts_ms(mixed $value): int
        {
            return nq_alerts_date($value)->getTimestamp() * 1000;
        }
    }

    if (! function_exists('nq_alerts_sort')) {
        /** Newest first, or most severe first with open before acknowledged before resolved and newest first inside a group. */
        function nq_alerts_sort(array $alerts, string $sort): array
        {
            $severities = ['critical', 'high', 'medium', 'low', 'info'];
            $statuses = ['open', 'acknowledged', 'resolved'];
            $rank = fn ($list, $v) => ($i = array_search($v, $list, true)) === false ? count($list) : $i;
            $newest = fn ($a, $b) => nq_alerts_ms($b['createdAt']) <=> nq_alerts_ms($a['createdAt']);
            usort($alerts, function ($a, $b) use ($sort, $rank, $statuses, $severities, $newest) {
                if ($sort === 'newest') {
                    return $newest($a, $b);
                }

                return ($rank($statuses, $a['status']) <=> $rank($statuses, $b['status']))
                    ?: ($rank($severities, $a['severity']) <=> $rank($severities, $b['severity']))
                    ?: $newest($a, $b);
            });

            return $alerts;
        }
    }
@endphp
