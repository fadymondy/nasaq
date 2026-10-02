{{-- Internal: helpers of x-nq::error-tracking, ported from error-tracking.tsx and error-tracking-format.ts. Included with @include('nasaq::components.error-tracking._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_et_words')) {
        /** The built-in words by locale, with the host's overrides on top. */
        function nq_et_words(string $locale, array $override = []): array
        {
            $en = [
                'label' => 'Errors', 'search' => 'Search errors…', 'error' => 'Error', 'level' => 'Level', 'status' => 'Status', 'events' => 'Events', 'users' => 'Users',
                'frequency' => 'Frequency', 'lastSeen' => 'Last seen', 'firstSeen' => 'First seen',
                'levels' => ['fatal' => 'Fatal', 'error' => 'Error', 'warning' => 'Warning', 'info' => 'Info'],
                'statuses' => ['unresolved' => 'Unresolved', 'resolved' => 'Resolved', 'ignored' => 'Ignored'],
                'resolve' => 'Resolve', 'ignore' => 'Ignore', 'reopen' => 'Reopen', 'back' => 'All errors', 'open' => 'Open', 'empty' => 'No errors captured',
                'emptyHint' => 'When something breaks in your app it shows up here.', 'trendUp' => 'Rising', 'trendDown' => 'Falling', 'trendFlat' => 'Steady',
                'frequencyLabel' => '{n} events over the period', 'stack' => 'Stack trace', 'breadcrumbs' => 'Breadcrumbs', 'tags' => 'Tags', 'diagnostics' => 'Diagnostics',
                'noStack' => 'No stack trace was captured.', 'noBreadcrumbs' => 'No breadcrumbs were recorded.', 'noTags' => 'No tags.', 'inApp' => 'Your code',
                'library' => 'Library', 'showContext' => 'Show source', 'hideContext' => 'Hide source', 'release' => 'Release', 'environment' => 'Environment',
                'culprit' => 'Where', 'summary' => 'Summary', 'errorFailed' => 'Could not update the error. Try again.', 'screenshot' => 'Screenshot', 'console' => 'Console',
                'network' => 'Network', 'screenshotAlt' => 'What the user saw when the error happened', 'noScreenshot' => 'No screenshot was captured.',
                'noConsole' => 'The console was empty.', 'noNetwork' => 'No requests were captured.', 'method' => 'Method', 'url' => 'URL', 'duration' => 'Time',
                'failedOnly' => 'Failed only', 'allRequests' => 'All requests',
                'crumbTypes' => ['navigation' => 'Navigation', 'http' => 'Request', 'console' => 'Console', 'ui' => 'Click', 'error' => 'Error'],
            ];
            $ar = [
                'label' => 'الأخطاء', 'search' => 'ابحث في الأخطاء…', 'error' => 'الخطأ', 'level' => 'المستوى', 'status' => 'الحالة', 'events' => 'الحوادث', 'users' => 'المستخدمون',
                'frequency' => 'التكرار', 'lastSeen' => 'آخر ظهور', 'firstSeen' => 'أول ظهور',
                'levels' => ['fatal' => 'قاتل', 'error' => 'خطأ', 'warning' => 'تحذير', 'info' => 'معلومة'],
                'statuses' => ['unresolved' => 'غير محلول', 'resolved' => 'تم حله', 'ignored' => 'متجاهَل'],
                'resolve' => 'حلّ', 'ignore' => 'تجاهل', 'reopen' => 'إعادة فتح', 'back' => 'كل الأخطاء', 'open' => 'فتح', 'empty' => 'لا أخطاء مسجّلة',
                'emptyHint' => 'عندما يتعطل شيء في تطبيقك سيظهر هنا.', 'trendUp' => 'في ازدياد', 'trendDown' => 'في تراجع', 'trendFlat' => 'مستقر',
                'frequencyLabel' => '{n} حادثة خلال الفترة', 'stack' => 'مسار الاستدعاء', 'breadcrumbs' => 'خطوات ما قبل الخطأ', 'tags' => 'الوسوم', 'diagnostics' => 'التشخيص',
                'noStack' => 'لم يُلتقط مسار استدعاء.', 'noBreadcrumbs' => 'لم تُسجَّل خطوات.', 'noTags' => 'لا وسوم.', 'inApp' => 'شيفرتك',
                'library' => 'مكتبة', 'showContext' => 'عرض المصدر', 'hideContext' => 'إخفاء المصدر', 'release' => 'الإصدار', 'environment' => 'البيئة',
                'culprit' => 'الموضع', 'summary' => 'الملخص', 'errorFailed' => 'تعذّر تحديث الخطأ. حاول مرة أخرى.', 'screenshot' => 'لقطة الشاشة', 'console' => 'وحدة التحكم',
                'network' => 'الشبكة', 'screenshotAlt' => 'ما رآه المستخدم لحظة وقوع الخطأ', 'noScreenshot' => 'لم تُلتقط لقطة شاشة.',
                'noConsole' => 'كانت وحدة التحكم فارغة.', 'noNetwork' => 'لم تُلتقط طلبات.', 'method' => 'الطريقة', 'url' => 'العنوان', 'duration' => 'المدة',
                'failedOnly' => 'الفاشلة فقط', 'allRequests' => 'كل الطلبات',
                'crumbTypes' => ['navigation' => 'تنقّل', 'http' => 'طلب', 'console' => 'وحدة التحكم', 'ui' => 'نقرة', 'error' => 'خطأ'],
            ];

            return array_replace_recursive(str_starts_with($locale, 'ar') ? $ar : $en, $override);
        }

        function nq_et_num($n, string $locale): string
        {
            return (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL))->format($n);
        }

        function nq_et_total(array $series): int
        {
            return (int) array_sum($series);
        }

        /** Compares the second half of the series with the first: more than 20 % either way is a trend. */
        function nq_et_trend(array $series): string
        {
            $s = array_values($series);
            if (count($s) < 4) {
                return 'flat';
            }
            $mid = intdiv(count($s), 2);
            $before = array_sum(array_slice($s, 0, $mid));
            $after = array_sum(array_slice($s, count($s) - $mid));
            if ($before == 0 && $after == 0) {
                return 'flat';
            }

            return $after > $before * 1.2 ? 'up' : ($after < $before * 0.8 ? 'down' : 'flat');
        }

        function nq_et_http_tone($status): string
        {
            $status = (int) $status;

            return match (true) {
                $status === 0, $status >= 500 => 'danger',
                $status >= 400 => 'warning',
                $status >= 300 => 'info',
                $status >= 200 => 'success',
                default => 'neutral',
            };
        }

        function nq_et_duration($ms): string
        {
            if (! is_numeric($ms) || $ms < 0) {
                return '';
            }

            return $ms < 1000 ? round($ms).' ms' : (round($ms / 100) / 10).' s';
        }

        function nq_et_location(array $frame): string
        {
            $out = $frame['file'];
            if (isset($frame['line'])) {
                $out .= ':'.$frame['line'];
                if (isset($frame['column'])) {
                    $out .= ':'.$frame['column'];
                }
            }

            return $out;
        }

        function nq_et_ago($when, \Carbon\CarbonImmutable $now, bool $ar): string
        {
            return \Carbon\CarbonImmutable::parse($when)->locale($ar ? 'ar' : 'en')->diffForHumans($now, \Carbon\CarbonInterface::DIFF_RELATIVE_TO_NOW);
        }

        /** "08:11:00" in Latin digits, in the date's own zone. */
        function nq_et_clock($when, string $locale): string
        {
            $d = \Carbon\CarbonImmutable::parse($when);
            $tz = $d->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);

            return (new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::NONE, \IntlDateFormatter::MEDIUM, $tz))->format($d->getTimestamp());
        }
    }
@endphp
