{{-- Internal: the gamification words (en / ar) and the pure helpers behind the kit, ported from gamification-logic.ts.
     Included with @include('nasaq::components.gamification._logic'); every function is defined once.
     An achievement is an array: id, title, description, icon (a lucide name), rarity, progress, goal, earnedAt, xp, secret. --}}
@php
    if (! function_exists('nq_gm_words')) {
        /** The words for a locale, with $override laid over them. Values are strings, or closures where a number sits in the sentence. */
        function nq_gm_words(string $locale, array $override = []): array
        {
            $en = [
                'rarity' => ['common' => 'Common', 'uncommon' => 'Uncommon', 'rare' => 'Rare', 'epic' => 'Epic', 'legendary' => 'Legendary'],
                'earned' => 'Earned', 'inProgress' => 'In progress', 'locked' => 'Locked', 'all' => 'All',
                'secret' => 'Secret achievement', 'secretHint' => 'Keep going to discover it.',
                'earnedOn' => fn ($d) => "Earned $d", 'progressOf' => fn ($a, $b) => "$a of $b", 'xpReward' => fn ($n) => "+$n XP",
                'badgesFilter' => 'Filter achievements', 'noMatches' => 'Nothing here yet', 'noMatchesHint' => 'Achievements that match this filter show up here.',
                'level' => fn ($n) => "Level $n", 'xpOf' => fn ($a, $b) => "$a / $b XP", 'xpToNext' => fn ($n, $l) => "$n XP to level $l",
                'period' => 'Period', 'you' => 'You', 'rank' => 'Rank', 'yourRank' => 'Your rank',
                'movedUp' => fn ($n) => "Up $n", 'movedDown' => fn ($n) => "Down $n", 'same' => 'No change', 'isNew' => 'New',
                'emptyBoard' => 'No one on the board yet', 'emptyBoardHint' => 'Scores show up here once people start earning them.', 'leaderboard' => 'Leaderboard',
                'streak' => 'Day streak', 'longest' => fn ($n) => "Longest $n", 'atRisk' => 'Do something today to keep it going',
                'prevMonth' => 'Previous month', 'nextMonth' => 'Next month', 'activeDay' => 'Active', 'today' => 'Today',
                'claim' => 'Claim', 'claiming' => 'Claiming', 'claimed' => 'Owned', 'needMore' => fn ($n) => "$n more needed",
                'cost' => fn ($n, $unit) => "$n $unit", 'points' => 'points',
                'unlocked' => 'Achievement unlocked', 'dismiss' => 'Dismiss', 'view' => 'View', 'failed' => 'Could not claim. Try again.',
            ];
            $ar = [
                'rarity' => ['common' => 'شائع', 'uncommon' => 'غير شائع', 'rare' => 'نادر', 'epic' => 'ملحمي', 'legendary' => 'أسطوري'],
                'earned' => 'مُكتسب', 'inProgress' => 'قيد التقدّم', 'locked' => 'مقفل', 'all' => 'الكل',
                'secret' => 'إنجاز سري', 'secretHint' => 'واصل التقدّم لتكتشفه.',
                'earnedOn' => fn ($d) => "اكتُسب $d", 'progressOf' => fn ($a, $b) => "$a من $b", 'xpReward' => fn ($n) => "+$n نقطة خبرة",
                'badgesFilter' => 'تصفية الإنجازات', 'noMatches' => 'لا شيء هنا بعد', 'noMatchesHint' => 'تظهر هنا الإنجازات المطابقة لهذه التصفية.',
                'level' => fn ($n) => "المستوى $n", 'xpOf' => fn ($a, $b) => "$a / $b نقطة خبرة", 'xpToNext' => fn ($n, $l) => "$n نقطة خبرة للمستوى $l",
                'period' => 'الفترة', 'you' => 'أنت', 'rank' => 'الترتيب', 'yourRank' => 'ترتيبك',
                'movedUp' => fn ($n) => "صعود $n", 'movedDown' => fn ($n) => "هبوط $n", 'same' => 'بلا تغيير', 'isNew' => 'جديد',
                'emptyBoard' => 'لا أحد في القائمة بعد', 'emptyBoardHint' => 'تظهر النقاط هنا عندما يبدأ الناس بكسبها.', 'leaderboard' => 'لوحة المتصدّرين',
                'streak' => 'أيام متتالية', 'longest' => fn ($n) => "الأطول $n", 'atRisk' => 'أنجز شيئًا اليوم لتحافظ على السلسلة',
                'prevMonth' => 'الشهر السابق', 'nextMonth' => 'الشهر التالي', 'activeDay' => 'نشِط', 'today' => 'اليوم',
                'claim' => 'استلام', 'claiming' => 'جارٍ الاستلام', 'claimed' => 'مملوكة', 'needMore' => fn ($n) => "يلزم $n إضافية",
                'cost' => fn ($n, $unit) => "$n $unit", 'points' => 'نقطة',
                'unlocked' => 'تم فتح إنجاز', 'dismiss' => 'إغلاق', 'view' => 'عرض', 'failed' => 'تعذّر الاستلام. حاول مرة أخرى.',
            ];
            $base = str_starts_with($locale, 'ar') ? $ar : $en;

            return array_merge($base, $override, ['rarity' => array_merge($base['rarity'], $override['rarity'] ?? [])]);
        }

        /** A word, or a sentence with the numbers filled in. */
        function nq_gm_say(array $t, string $key, ...$args): string
        {
            $v = $t[$key];

            return is_callable($v) ? (string) $v(...$args) : (string) $v;
        }

        /** A number in the locale with Latin digits. */
        function nq_gm_num(float|int $n, string $locale): string
        {
            if (class_exists(\NumberFormatter::class)) {
                return (new \NumberFormatter(str_replace('_', '-', $locale).'@numbers=latn', \NumberFormatter::DECIMAL))->format($n);
            }

            return number_format($n, floor($n) == $n ? 0 : 2);
        }

        /** A date in the locale, medium style, Latin digits. $pattern (an ICU pattern, e.g. 'LLLL yyyy') replaces the style. */
        function nq_gm_date(mixed $value, string $locale, ?string $pattern = null): string
        {
            $date = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));
            if (! class_exists(\IntlDateFormatter::class)) {
                return $date->format($pattern ? 'F Y' : 'M j, Y');
            }
            $tz = $date->getTimezone()->getName();
            $tz = $tz === 'Z' ? 'UTC' : (preg_match('/^[+-]\d/', $tz) ? 'GMT'.$tz : $tz);
            $f = new \IntlDateFormatter(str_replace('_', '-', $locale).'@numbers=latn', \IntlDateFormatter::MEDIUM, \IntlDateFormatter::NONE, $tz);
            if ($pattern) {
                $f->setPattern($pattern);
            }

            return $f->format($date);
        }

        /** Token classes per rarity: a ring (border), a soft fill and the text colour. */
        function nq_gm_rarity_style(?string $rarity): array
        {
            return [
                'common' => ['ring' => 'border-nq-line-strong', 'soft' => 'bg-secondary', 'text' => 'text-muted-foreground'],
                'uncommon' => ['ring' => 'border-nq-success', 'soft' => 'bg-nq-success-soft', 'text' => 'text-nq-success-text'],
                'rare' => ['ring' => 'border-nq-info', 'soft' => 'bg-nq-info-soft', 'text' => 'text-nq-info-text'],
                'epic' => ['ring' => 'border-[var(--nq-tag-violet)]', 'soft' => 'bg-[var(--nq-tag-violet-soft)]', 'text' => 'text-[var(--nq-tag-violet)]'],
                'legendary' => ['ring' => 'border-nq-accent', 'soft' => 'bg-nq-accent/15', 'text' => 'text-nq-accent-text'],
            ][$rarity ?? 'common'] ?? ['ring' => 'border-nq-line-strong', 'soft' => 'bg-secondary', 'text' => 'text-muted-foreground'];
        }

        /** earned | in-progress | locked */
        function nq_gm_status(array $a): string
        {
            $goal = ($a['goal'] ?? 0) > 0 ? $a['goal'] : 1;
            if (! empty($a['earnedAt']) || ($a['progress'] ?? 0) >= $goal) {
                return 'earned';
            }

            return ($a['progress'] ?? 0) > 0 ? 'in-progress' : 'locked';
        }

        /** Whole percent of the goal reached, 0 to 100. Earned is always 100. */
        function nq_gm_percent(array $a): int
        {
            if (nq_gm_status($a) === 'earned') {
                return 100;
            }
            $goal = ($a['goal'] ?? 0) > 0 ? $a['goal'] : 1;

            return (int) min(100, max(0, floor((($a['progress'] ?? 0) / $goal) * 100)));
        }

        function nq_gm_counts(array $list): array
        {
            $c = ['all' => count($list), 'earned' => 0, 'in-progress' => 0, 'locked' => 0];
            foreach ($list as $a) {
                $c[nq_gm_status($a)]++;
            }

            return $c;
        }

        /** Sorts by score, highest first, and numbers the entries. Equal scores share a rank and the next rank skips (1, 2, 2, 4). */
        function nq_gm_rank(array $entries): array
        {
            $indexed = [];
            foreach (array_values($entries) as $i => $e) {
                $indexed[] = [$e, $i];
            }
            usort($indexed, fn ($a, $b) => ($b[0]['score'] <=> $a[0]['score']) ?: ($a[1] <=> $b[1]));
            $out = [];
            $rank = 0;
            foreach ($indexed as $index => [$e]) {
                if ($index === 0 || $e['score'] !== $indexed[$index - 1][0]['score']) {
                    $rank = $index + 1;
                }
                $out[] = $e + ['rank' => $rank];
            }

            return $out;
        }

        /** [direction, by]: up | down | same | new, and the places moved. */
        function nq_gm_movement(int $rank, ?int $previous): array
        {
            if ($previous === null) {
                return ['new', 0];
            }
            $diff = $previous - $rank;

            return $diff > 0 ? ['up', $diff] : ($diff < 0 ? ['down', -$diff] : ['same', 0]);
        }

        /** Total XP at which a level starts. Level 1 starts at 0. */
        function nq_gm_xp_for_level(int $level, array $curve = []): int
        {
            if ($level <= 1) {
                return 0;
            }

            return (int) round(($curve['base'] ?? 100) * (($level - 1) ** ($curve['growth'] ?? 1.5)));
        }

        /** [level, xp, span, remaining, percent] from a lifetime XP total. */
        function nq_gm_level(float|int $totalXp, array $curve = []): array
        {
            $total = max(0, (int) floor($totalXp));
            $level = 1;
            while (nq_gm_xp_for_level($level + 1, $curve) <= $total && $level < 1000) {
                $level++;
            }
            $start = nq_gm_xp_for_level($level, $curve);
            $next = nq_gm_xp_for_level($level + 1, $curve);
            $span = max(1, $next - $start);
            $xp = $total - $start;

            return ['level' => $level, 'xp' => $xp, 'span' => $span, 'remaining' => $next - $total, 'percent' => (int) min(100, floor(($xp / $span) * 100))];
        }

        /** YYYY-MM-DD of a date-like value, or null when it is not one. */
        function nq_gm_day_key(mixed $value): ?string
        {
            if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                return $value;
            }
            try {
                $date = $value instanceof \DateTimeInterface ? \Carbon\Carbon::instance($value) : (is_numeric($value) ? \Carbon\Carbon::createFromTimestamp($value) : \Carbon\Carbon::parse($value));
            } catch (\Throwable) {
                return null;
            }

            return $date->format('Y-m-d');
        }

        function nq_gm_day_keys(array $days): array
        {
            return array_values(array_unique(array_filter(array_map('nq_gm_day_key', $days))));
        }

        function nq_gm_add_days(string $key, int $n): string
        {
            return \Carbon\Carbon::createFromFormat('!Y-m-d', $key)->addDays($n)->format('Y-m-d');
        }

        /** [current, longest, atRisk]. A streak that ended yesterday still counts, so it is not lost before today is over. */
        function nq_gm_streak(array $activeDays, mixed $today = null): array
        {
            $set = array_flip(nq_gm_day_keys($activeDays));
            $todayKey = nq_gm_day_key($today ?? now());
            $cursor = isset($set[$todayKey]) ? $todayKey : nq_gm_add_days($todayKey, -1);
            $current = 0;
            while (isset($set[$cursor])) {
                $current++;
                $cursor = nq_gm_add_days($cursor, -1);
            }
            $sorted = array_keys($set);
            sort($sorted);
            $longest = 0;
            $run = 0;
            $prev = null;
            foreach ($sorted as $k) {
                $run = $prev !== null && nq_gm_add_days($prev, 1) === $k ? $run + 1 : 1;
                $longest = max($longest, $run);
                $prev = $k;
            }

            return ['current' => $current, 'longest' => $longest, 'atRisk' => $current > 0 && ! isset($set[$todayKey])];
        }

        /** The weeks of a month, each 7 long, with null before the 1st and after the last day. $month is 1 to 12. weekStart: 0 Sunday, 1 Monday, 6 Saturday. */
        function nq_gm_month_grid(int $year, int $month, array $activeDays, mixed $today = null, int $weekStart = 0): array
        {
            $active = array_flip(nq_gm_day_keys($activeDays));
            $todayKey = nq_gm_day_key($today ?? now());
            $first = \Carbon\Carbon::create($year, $month, 1);
            $lead = ($first->dayOfWeek - $weekStart + 7) % 7;
            $cells = array_fill(0, $lead, null);
            for ($day = 1; $day <= $first->daysInMonth; $day++) {
                $key = sprintf('%04d-%02d-%02d', $year, $month, $day);
                $cells[] = ['key' => $key, 'day' => $day, 'active' => isset($active[$key]), 'today' => $key === $todayKey, 'future' => $key > $todayKey];
            }
            while (count($cells) % 7 !== 0) {
                $cells[] = null;
            }

            return array_chunk($cells, 7);
        }
    }
@endphp
