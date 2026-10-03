{{-- Internal: helpers of x-nq::vuln-report, ported from vuln-report.tsx and vuln-format.ts. Included with
     @include('nasaq::components.vuln-report._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_vr_words')) {
        /** The built-in words by locale (English or Arabic), with the host's overrides on top. A string with :n / :d / :id is a sentence. */
        function nq_vr_words(string $locale, array $override = []): array
        {
            $en = [
                'title' => 'Vulnerability report', 'description' => 'What the last scan found in your packages and images.',
                'severity' => ['critical' => 'Critical', 'high' => 'High', 'medium' => 'Medium', 'low' => 'Low'],
                'total' => 'Total findings', 'clean' => 'No vulnerabilities found', 'cleanBody' => 'The last scan came back clean.',
                'top' => 'Top findings', 'topEmpty' => 'Nothing to fix.', 'noFix' => 'No fix yet', 'cvss' => 'CVSS', 'history' => 'Scan history',
                'historyLabel' => 'Scan on :d: :n findings', 'scannedAt' => 'Last scan', 'scanNow' => 'Scan now', 'scanning' => 'Scanning',
                'better' => ':n fewer than the previous scan', 'worse' => ':n more than the previous scan', 'same' => 'Same as the previous scan',
                'noScan' => 'No scan yet', 'noScanBody' => 'Run a scan to see what needs patching.', 'copyCve' => 'Copy :id',
            ];
            $ar = [
                'title' => 'تقرير الثغرات', 'description' => 'ما وجده آخر فحص في حزمك وصورك.',
                'severity' => ['critical' => 'حرجة', 'high' => 'عالية', 'medium' => 'متوسطة', 'low' => 'منخفضة'],
                'total' => 'إجمالي النتائج', 'clean' => 'لا توجد ثغرات', 'cleanBody' => 'انتهى آخر فحص دون نتائج.',
                'top' => 'أهم النتائج', 'topEmpty' => 'لا شيء يحتاج إصلاحًا.', 'noFix' => 'لا إصلاح بعد', 'cvss' => 'CVSS', 'history' => 'سجل الفحوص',
                'historyLabel' => 'فحص بتاريخ :d: :n نتيجة', 'scannedAt' => 'آخر فحص', 'scanNow' => 'افحص الآن', 'scanning' => 'جارٍ الفحص',
                'better' => 'أقل بـ :n من الفحص السابق', 'worse' => 'أكثر بـ :n من الفحص السابق', 'same' => 'مثل الفحص السابق',
                'noScan' => 'لا فحص بعد', 'noScanBody' => 'شغّل فحصًا لمعرفة ما يحتاج إلى ترقيع.', 'copyCve' => 'نسخ :id',
            ];
            $base = str_starts_with($locale, 'ar') ? $ar : $en;
            if (isset($override['severity'])) {
                $override['severity'] = array_merge($base['severity'], $override['severity']);
            }

            return array_merge($base, $override);
        }

        function nq_vr_fill(string $sentence, array $values): string
        {
            $map = [];
            foreach ($values as $k => $v) {
                $map[':'.$k] = (string) $v;
            }

            return strtr($sentence, $map);
        }

        function nq_vr_severities(): array
        {
            return ['critical', 'high', 'medium', 'low'];
        }

        function nq_vr_count(array $findings): array
        {
            $c = ['critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0];
            foreach ($findings as $f) {
                if (isset($c[$f['severity'] ?? ''])) {
                    $c[$f['severity']]++;
                }
            }

            return $c;
        }

        function nq_vr_total(array $counts): int
        {
            return (int) array_sum(array_map(fn ($s) => $counts[$s] ?? 0, nq_vr_severities()));
        }

        /** Worst present severity decides the tone. Nothing found is success. */
        function nq_vr_tone(array $c): string
        {
            return (($c['critical'] ?? 0) > 0 || ($c['high'] ?? 0) > 0) ? 'danger' : (($c['medium'] ?? 0) > 0 ? 'warning' : (($c['low'] ?? 0) > 0 ? 'neutral' : 'success'));
        }

        /** Most severe first, then higher CVSS, then id. At most $limit. */
        function nq_vr_top(array $findings, int $limit = 5): array
        {
            $rank = array_flip(nq_vr_severities());
            $list = array_values($findings);
            usort($list, fn ($a, $b) => ($rank[$a['severity']] <=> $rank[$b['severity']]) ?: (($b['cvss'] ?? 0) <=> ($a['cvss'] ?? 0)) ?: strcmp($a['id'], $b['id']));

            return array_slice($list, 0, max(0, $limit));
        }

        function nq_vr_is_cve(string $id): bool
        {
            return (bool) preg_match('/^CVE-\d{4}-\d{4,}$/i', trim($id));
        }

        /** Change in total between the last two scans: negative is better. Null with fewer than two scans. */
        function nq_vr_trend(array $history): ?int
        {
            $n = count($history);

            return $n < 2 ? null : nq_vr_total(array_values($history)[$n - 1]['counts'] ?? []) - nq_vr_total(array_values($history)[$n - 2]['counts'] ?? []);
        }

        /** A medium date with Latin digits for the scan history names. */
        function nq_vr_date(mixed $at, string $locale): string
        {
            $d = $at instanceof \DateTimeInterface ? \Carbon\Carbon::instance($at) : (is_numeric($at) ? \Carbon\Carbon::createFromTimestamp((int) $at) : \Carbon\Carbon::parse($at));
            if (class_exists(\IntlDateFormatter::class)) {
                return (string) (new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $d->getTimezone()->getName() === 'Z' ? 'UTC' : $d->getTimezone()->getName()))->format($d);
            }

            return $d->format('n/j/Y');
        }
    }
@endphp
