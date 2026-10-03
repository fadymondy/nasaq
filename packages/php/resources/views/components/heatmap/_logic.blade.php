{{-- Internal: helpers of x-nq::heatmap, ported from heatmap.tsx and calendar-math.ts. Included with
     @include('nasaq::components.heatmap._logic'); every function is defined once. --}}
@php
    if (! function_exists('nq_hm_day')) {
        /** The local day of a DateTimeInterface or a "YYYY-MM-DD" string, at midnight. Strings are read as local days, never converted. */
        function nq_hm_day(mixed $value): \DateTimeImmutable
        {
            if ($value instanceof \DateTimeInterface) {
                return new \DateTimeImmutable($value->format('Y-m-d'));
            }
            if (is_string($value) && preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $value, $m)) {
                return new \DateTimeImmutable($m[1].'-'.$m[2].'-'.$m[3]);
            }

            return new \DateTimeImmutable(date('Y-m-d', is_numeric($value) ? (int) $value : strtotime((string) $value)));
        }

        function nq_hm_add(\DateTimeImmutable $d, int $days): \DateTimeImmutable
        {
            return $d->modify(($days >= 0 ? '+' : '').$days.' days');
        }

        /** First day of the week for a locale: 0 is Sunday ... 6 is Saturday. */
        function nq_hm_week_start(string $locale): int
        {
            if (class_exists(\IntlCalendar::class)) {
                $cal = \IntlCalendar::createInstance('UTC', str_replace('_', '-', $locale));
                if ($cal) {
                    return ($cal->getFirstDayOfWeek() - 1) % 7;
                }
            }

            return str_starts_with($locale, 'ar') ? 6 : 0;
        }

        /** Level 0 to 4 for a count: quarters of max, or the smallest counts of levels 1 to 4 (thresholds). */
        function nq_hm_level(int|float $count, int|float $max, ?array $thresholds = null): int
        {
            if (! ($count > 0) || ! ($max > 0)) {
                return 0;
            }
            if ($thresholds) {
                $level = 0;
                foreach (array_values($thresholds) as $i => $t) {
                    if ($count >= $t) {
                        $level = $i + 1;
                    }
                }

                return $level;
            }

            return (int) min(4, max(1, ceil(($count / $max) * 4)));
        }

        /** "5 contributions" or the Arabic plural forms. */
        function nq_hm_count(int|float $count, string $locale): string
        {
            $n = class_exists(\NumberFormatter::class) ? (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL))->format($count) : (string) $count;
            if (str_starts_with($locale, 'ar')) {
                $mod = $count % 100;

                return match (true) {
                    $count == 0 => 'لا مساهمات',
                    $count == 1 => 'مساهمة واحدة',
                    $count == 2 => 'مساهمتان',
                    $mod >= 3 && $mod <= 10 => $n.' مساهمات',
                    default => $n.' مساهمة',
                };
            }

            return $count == 0 ? 'No contributions' : ($count == 1 ? '1 contribution' : $n.' contributions');
        }

        /** A date formatted by the locale with Latin digits: pattern "MMM" (month), "EEE" (weekday) or null for the medium date ("Sep 29, 2026"). */
        function nq_hm_format(\DateTimeImmutable $d, string $locale, ?string $pattern = null): string
        {
            if (class_exists(\IntlDateFormatter::class)) {
                $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', $pattern ? \IntlDateFormatter::NONE : \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, 'UTC', null, $pattern);

                return (string) $f->format(new DateTimeImmutable($d->format('Y-m-d').' 12:00:00', new DateTimeZone('UTC')));
            }

            return $d->format($pattern === 'MMM' ? 'M' : ($pattern === 'EEE' ? 'D' : 'M j, Y'));
        }
    }
@endphp
