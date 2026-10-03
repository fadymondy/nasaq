{{-- Internal: helpers of x-nq::project-view and its parts, ported from project-logic.ts (status counts, totals, burndown, budget, schedule bars, feed, memory).
     Included with @include('nasaq::components.project-view._logic'); every function is defined once. Dates are civil "Y-m-d" strings. --}}
@include('nasaq::components.project-view._words')
@include('nasaq::components.issue-view._logic')
@php
    if (! function_exists('nq_pv_day')) {
        /** "2026-10-04" for a date, a timestamp (seconds or milliseconds), or an ISO string. */
        function nq_pv_day(mixed $value): string
        {
            if ($value instanceof \DateTimeInterface) {
                return $value->format('Y-m-d');
            }
            if (is_numeric($value)) {
                $n = (float) $value;

                return \Carbon\Carbon::createFromTimestampUTC((int) ($n > 1e11 ? $n / 1000 : $n))->format('Y-m-d');
            }

            return substr((string) \Carbon\Carbon::parse((string) $value)->format('Y-m-d'), 0, 10);
        }

        function nq_pv_utc(string $key): int
        {
            return (int) (new \DateTimeImmutable($key.' 00:00:00', new \DateTimeZone('UTC')))->format('U');
        }

        function nq_pv_add_days(string $key, int $days): string
        {
            return gmdate('Y-m-d', nq_pv_utc($key) + $days * 86400);
        }

        function nq_pv_days_between(string $a, string $b): int
        {
            return (int) round((nq_pv_utc($b) - nq_pv_utc($a)) / 86400);
        }

        function nq_pv_stage(array $statuses, mixed $statusId): ?string
        {
            foreach ($statuses as $s) {
                if ((string) $s['id'] === (string) $statusId) {
                    return $s['stage'] ?? null;
                }
            }

            return null;
        }

        /** [['statusId', 'count']] in the order of $statuses; empty statuses stay, at zero. */
        function nq_pv_status_counts(array $issues, array $statuses): array
        {
            $counts = [];
            foreach ($issues as $i) {
                $counts[(string) $i['statusId']] = ($counts[(string) $i['statusId']] ?? 0) + 1;
            }

            return array_map(fn ($s) => ['statusId' => $s['id'], 'count' => $counts[(string) $s['id']] ?? 0], array_values($statuses));
        }

        /** ['total', 'open', 'done', 'overdue', 'percent']. Canceled issues leave the percentage. */
        function nq_pv_totals(array $issues, array $statuses, string $today): array
        {
            $open = $done = $canceled = $overdue = 0;
            foreach ($issues as $i) {
                $stage = nq_pv_stage($statuses, $i['statusId']);
                if ($stage === 'done') {
                    $done++;
                } elseif ($stage === 'canceled') {
                    $canceled++;
                } else {
                    $open++;
                    if (! empty($i['dueDate']) && $i['dueDate'] < $today) {
                        $overdue++;
                    }
                }
            }
            $counted = count($issues) - $canceled;

            return ['total' => count($issues), 'open' => $open, 'done' => $done, 'overdue' => $overdue, 'percent' => $counted === 0 ? 0 : (int) round($done / $counted * 100)];
        }

        /** Open issues at the end of each day: [['date', 'remaining' (null after today), 'ideal']]. */
        function nq_pv_burndown(array $issues, string $start, string $end, string $today): array
        {
            $span = max(1, nq_pv_days_between($start, $end));
            $made = array_map(fn ($i) => ['from' => nq_pv_day($i['createdAt']), 'to' => ! empty($i['completedAt']) ? nq_pv_day($i['completedAt']) : null], array_values($issues));
            $scope = count(array_filter($made, fn ($m) => $m['from'] <= $start));
            $points = [];
            for ($n = 0; $n <= $span; $n++) {
                $date = nq_pv_add_days($start, $n);
                $remaining = null;
                if ($date <= $today) {
                    $remaining = count(array_filter($made, fn ($m) => $m['from'] <= $date && ($m['to'] === null || $m['to'] > $date)));
                }
                $points[] = ['date' => $date, 'remaining' => $remaining, 'ideal' => max(0, round($scope * (1 - $n / $span) * 10) / 10)];
            }

            return $points;
        }

        /** ['ratio', 'remaining', 'over']. */
        function nq_pv_budget(float|int|null $total, float|int $spent): array
        {
            if (! $total || $total <= 0) {
                return ['ratio' => 0, 'remaining' => 0, 'over' => false];
            }

            return ['ratio' => $spent / $total, 'remaining' => $total - $spent, 'over' => $spent > $total];
        }

        /** The dates an issue occupies, or null without an end. */
        function nq_pv_span(array $issue): ?array
        {
            $start = ! empty($issue['startDate']) ? $issue['startDate'] : nq_pv_day($issue['createdAt']);
            $end = ! empty($issue['dueDate']) ? $issue['dueDate'] : (! empty($issue['completedAt']) ? nq_pv_day($issue['completedAt']) : null);
            if (! $end) {
                return null;
            }

            return $end < $start ? ['start' => $end, 'end' => $start] : ['start' => $start, 'end' => $end];
        }

        function nq_pv_range(array $issues): ?array
        {
            $start = $end = null;
            foreach ($issues as $i) {
                $s = nq_pv_span($i);
                if (! $s) {
                    continue;
                }
                if ($start === null || $s['start'] < $start) {
                    $start = $s['start'];
                }
                if ($end === null || $s['end'] > $end) {
                    $end = $s['end'];
                }
            }
            if ($start === null || $end === null) {
                return null;
            }

            return ['start' => $start, 'end' => nq_pv_days_between($start, $end) < 6 ? nq_pv_add_days($start, 6) : $end];
        }

        /** [id => ['offset', 'width', 'start', 'end', 'done']] for the scheduled issues. */
        function nq_pv_bars(array $issues, array $range, array $statuses): array
        {
            $total = nq_pv_days_between($range['start'], $range['end']) + 1;
            $bars = [];
            foreach ($issues as $i) {
                $s = nq_pv_span($i);
                if (! $s) {
                    continue;
                }
                $from = max(0, nq_pv_days_between($range['start'], $s['start']));
                $to = min($total, nq_pv_days_between($range['start'], $s['end']) + 1);
                if ($to <= 0 || $from >= $total) {
                    continue;
                }
                $bars[(string) $i['id']] = ['start' => $s['start'], 'end' => $s['end'], 'offset' => $from / $total * 100, 'width' => max(1.5, ($to - $from) / $total * 100), 'done' => nq_pv_stage($statuses, $i['statusId']) === 'done'];
            }

            return $bars;
        }

        function nq_pv_ticks(array $range, int $every = 7): array
        {
            $total = nq_pv_days_between($range['start'], $range['end']) + 1;
            $ticks = [];
            for ($n = 0; $n < $total; $n += $every) {
                $ticks[] = ['date' => nq_pv_add_days($range['start'], $n), 'offset' => $n / $total * 100];
            }

            return $ticks;
        }

        /** Issues that are not finished, oldest due date first, then by key. */
        function nq_pv_open_issues(array $issues, array $statuses): array
        {
            $open = array_values(array_filter($issues, fn ($i) => ! in_array(nq_pv_stage($statuses, $i['statusId']), ['done', 'canceled'], true)));
            usort($open, fn ($a, $b) => strcmp($a['dueDate'] ?? '9999', $b['dueDate'] ?? '9999') ?: strcmp($a['key'], $b['key']));

            return $open;
        }

        /** Feed items newest first, grouped by day: [['day', 'items']]. */
        function nq_pv_group_by_day(array $items): array
        {
            $sorted = array_values($items);
            usort($sorted, fn ($a, $b) => strcmp(nq_pv_iso($b['at']), nq_pv_iso($a['at'])));
            $groups = [];
            foreach ($sorted as $item) {
                $day = nq_pv_day($item['at']);
                $last = count($groups) - 1;
                if ($last >= 0 && $groups[$last]['day'] === $day) {
                    $groups[$last]['items'][] = $item;
                } else {
                    $groups[] = ['day' => $day, 'items' => [$item]];
                }
            }

            return $groups;
        }

        /** Every tag in use with its count, most used first: [['tag', 'count']]. */
        function nq_pv_memory_tags(array $items): array
        {
            $map = [];
            foreach ($items as $m) {
                foreach ((array) ($m['tags'] ?? []) as $t) {
                    $map[$t] = ($map[$t] ?? 0) + 1;
                }
            }
            $out = [];
            foreach ($map as $tag => $count) {
                $out[] = ['tag' => (string) $tag, 'count' => $count];
            }
            usort($out, fn ($a, $b) => $b['count'] <=> $a['count'] ?: strcmp($a['tag'], $b['tag']));

            return $out;
        }

        /** Memories newest first. */
        function nq_pv_memory_sorted(array $items): array
        {
            $sorted = array_values($items);
            usort($sorted, fn ($a, $b) => strcmp(nq_pv_iso($b['at']), nq_pv_iso($a['at'])));

            return $sorted;
        }

        /** A sortable ISO instant for a date, a timestamp or a string. */
        function nq_pv_iso(mixed $value): string
        {
            if ($value instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($value)->utc()->format('Y-m-d\TH:i:s');
            }
            if (is_numeric($value)) {
                return \Carbon\Carbon::createFromTimestampUTC((int) ((float) $value > 1e11 ? (float) $value / 1000 : (float) $value))->format('Y-m-d\TH:i:s');
            }

            return \Carbon\Carbon::parse((string) $value)->utc()->format('Y-m-d\TH:i:s');
        }

        /** "api, billing,, API" becomes ['api', 'billing']. */
        function nq_pv_parse_tags(string $text): array
        {
            $seen = [];
            foreach (preg_split('/[,،\n]/u', $text) as $part) {
                $t = mb_strtolower(ltrim(trim($part), '#'));
                if ($t !== '') {
                    $seen[$t] = true;
                }
            }

            return array_keys($seen);
        }

        /** A date in the display style the page uses: "Sep 29, 2026" or "29 Sep". */
        function nq_pv_date(mixed $value, bool $ar, bool $year = true): string
        {
            $c = \Carbon\Carbon::parse(nq_pv_day($value))->locale($ar ? 'ar' : 'en');

            return $c->isoFormat($year ? 'll' : 'D MMM');
        }

        /** An amount in the currency (USD, or SAR in Arabic by default). */
        function nq_pv_money(float|int $amount, ?string $currency, string $locale): string
        {
            return \Nasaq\Nasaq::money($amount, $currency, $locale);
        }

        /** The tone of a project status. */
        function nq_pv_status_tone(string $status): string
        {
            return ['planning' => 'neutral', 'active' => 'info', 'on-hold' => 'warning', 'completed' => 'success', 'archived' => 'neutral'][$status] ?? 'neutral';
        }
    }
@endphp
