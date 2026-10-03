{{-- Internal: helpers of x-nq::backlink-monitor, ported from backlink-math.ts. Included with
     @include('nasaq::components.backlink-monitor._logic'); every function is defined once. Times are Unix milliseconds. --}}
@php
    if (! function_exists('nq_bl_ms')) {
        /** An ISO date or time as Unix milliseconds (a date alone is UTC midnight, as in JavaScript). */
        function nq_bl_ms(mixed $v): int
        {
            if ($v instanceof \DateTimeInterface) {
                return $v->getTimestamp() * 1000;
            }
            if (is_numeric($v)) {
                return $v > 1e11 ? (int) $v : (int) $v * 1000;
            }

            return \Carbon\Carbon::parse((string) $v, 'UTC')->getTimestamp() * 1000;
        }

        /** The host of a link source, lowercased and without "www.". Falls back to the input when it is not a URL. */
        function nq_bl_domain(string $url): string
        {
            $host = parse_url(preg_match('~^[a-z]+://~i', $url) ? $url : 'https://'.$url, PHP_URL_HOST);

            return $host ? strtolower(preg_replace('~^www\.~i', '', $host)) : strtolower($url);
        }

        /** Lost beats new: a link found gone is lost even if it appeared this week. */
        function nq_bl_status(array $l, int $now, int $newDays = 7): string
        {
            if (! empty($l['lostAt'])) {
                return 'lost';
            }

            return $now - nq_bl_ms($l['firstSeen']) <= $newDays * 86_400_000 ? 'new' : 'active';
        }

        /** A spam score at or above the threshold; a link already disavowed is not toxic any more. */
        function nq_bl_toxic(array $l, int $threshold = 60): bool
        {
            return empty($l['disavowed']) && ($l['spamScore'] ?? 0) >= $threshold;
        }

        /** Counts per status: total, active, new, lost, toxic and referring domains. */
        function nq_bl_summary(array $links, int $now): array
        {
            $out = ['total' => count($links), 'active' => 0, 'new' => 0, 'lost' => 0, 'toxic' => 0, 'domains' => 0];
            $domains = [];
            foreach ($links as $l) {
                $s = nq_bl_status($l, $now);
                if ($s === 'lost') {
                    $out['lost']++;
                } else {
                    $out['active']++;
                    if ($s === 'new') {
                        $out['new']++;
                    }
                    $domains[nq_bl_domain($l['sourceUrl'])] = true;
                }
                if (empty($l['lostAt']) && nq_bl_toxic($l)) {
                    $out['toxic']++;
                }
            }
            $out['domains'] = count($domains);

            return $out;
        }

        /** One row per day for the last $days days, oldest first: how many links were gained and lost that day. */
        function nq_bl_series(array $links, int $days, int $now): array
        {
            $rows = [];
            for ($i = $days - 1; $i >= 0; $i--) {
                $date = gmdate('Y-m-d', intdiv($now - $i * 86_400_000, 1000));
                $rows[$date] = ['date' => $date, 'gained' => 0, 'lost' => 0];
            }
            foreach ($links as $l) {
                $g = substr((string) $l['firstSeen'], 0, 10);
                if (isset($rows[$g])) {
                    $rows[$g]['gained']++;
                }
                $x = substr((string) ($l['lostAt'] ?? ''), 0, 10);
                if ($x !== '' && isset($rows[$x])) {
                    $rows[$x]['lost']++;
                }
            }

            return array_values($rows);
        }
    }
@endphp
